"""
Webhook delivery service — business logic.

This is the PRIMARY TARGET for Demo 1.
The 'add webhook retry with exponential backoff' feature will be implemented here.

Current state: deliveries are attempted once, no retry logic (intentionally incomplete).
Demo 1 will have agents add:
  - Exponential backoff retry logic
  - Dead-letter queue (nexus-dlq) after max retries
  - Structured logging for each attempt
  - SQS integration for async processing

Per .claude/rules/python.md:
  - structlog for logging
  - python-ulid for IDs
  - Pydantic v2 models
  - Type hints on all functions
"""

from __future__ import annotations

import asyncio
import math
from datetime import datetime, timedelta
from typing import TYPE_CHECKING

import httpx
import structlog
from python_ulid import ULID

from notification_service.models.webhook import (
    DeliveryStatus,
    ScheduleDeliveryRequest,
    WebhookDelivery,
)

if TYPE_CHECKING:
    from notification_service.repositories.delivery_repository import DeliveryRepository

logger = structlog.get_logger()


class DeliveryService:
    def __init__(self, repository: DeliveryRepository) -> None:
        self.repository = repository

    async def schedule_delivery(
        self, request: ScheduleDeliveryRequest
    ) -> WebhookDelivery:
        """Schedule a new webhook delivery."""
        delivery_id = str(ULID())  # ULID, per CLAUDE.md convention
        now = datetime.utcnow()

        delivery = WebhookDelivery(
            id=delivery_id,
            endpoint_url=request.endpoint_url,
            payload=request.payload,
            status=DeliveryStatus.PENDING,
            attempts=0,
            max_retries=request.max_retries,
            created_at=now,
            updated_at=now,
        )

        saved = await self.repository.create(delivery)

        logger.info(
            "webhook.delivery.scheduled",
            delivery_id=delivery_id,
            endpoint_url=request.endpoint_url,
            max_retries=request.max_retries,
        )

        return saved

    async def attempt_delivery(self, delivery_id: str) -> WebhookDelivery:
        """
        Attempt to deliver a webhook.

        TODO (Demo 1): Add exponential backoff retry logic here.
        TODO (Demo 1): Move to DLQ after max_retries exceeded.
        TODO (Demo 1): Publish webhook.delivered or webhook.delivery.failed event to SQS.

        Current behavior: single attempt, no retry.
        """
        delivery = await self.repository.find_by_id(delivery_id)
        if not delivery:
            raise ValueError(f"Delivery not found: {delivery_id}")

        delivery.attempts += 1
        delivery.last_attempt_at = datetime.utcnow()
        delivery.status = DeliveryStatus.IN_PROGRESS

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    delivery.endpoint_url,
                    json=delivery.payload,
                    headers={"Content-Type": "application/json", "X-Delivery-ID": delivery_id},
                )

                if response.status_code < 300:
                    delivery.status = DeliveryStatus.DELIVERED
                    delivery.delivered_at = datetime.utcnow()
                    logger.info(
                        "webhook.delivery.succeeded",
                        delivery_id=delivery_id,
                        attempt=delivery.attempts,
                        status_code=response.status_code,
                    )
                else:
                    # TODO (Demo 1): Schedule retry with exponential backoff
                    delivery.status = DeliveryStatus.FAILED
                    delivery.error_message = f"HTTP {response.status_code}"
                    logger.warning(
                        "webhook.delivery.failed",
                        delivery_id=delivery_id,
                        attempt=delivery.attempts,
                        status_code=response.status_code,
                    )

        except (httpx.TimeoutException, httpx.ConnectError) as e:
            # TODO (Demo 1): Schedule retry with exponential backoff
            delivery.status = DeliveryStatus.FAILED
            delivery.error_message = str(e)
            logger.warning(
                "webhook.delivery.error",
                delivery_id=delivery_id,
                attempt=delivery.attempts,
                error=str(e),
            )

        delivery.updated_at = datetime.utcnow()
        return await self.repository.update(delivery)

    @staticmethod
    def calculate_backoff(attempt: int, base_delay_seconds: float = 1.0) -> float:
        """
        Calculate exponential backoff delay with jitter.
        Per CLAUDE.md known quirk: max 5 retries for notification service.

        Formula: base_delay * 2^attempt + random_jitter
        Demo 1 will wire this into attempt_delivery().
        """
        import random
        delay = base_delay_seconds * (2 ** attempt)
        jitter = random.uniform(0, delay * 0.1)  # 10% jitter
        return min(delay + jitter, 300.0)  # Cap at 5 minutes
