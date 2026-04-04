"""
Webhook delivery API routes.
Per .claude/rules/python.md: Pydantic v2 models for all request/response.
Per CLAUDE.md: API versioned at /v1/ prefix.
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException, Request
from python_ulid import ULID

from notification_service.models.webhook import (
    DeliveryListResponse,
    DeliveryStatus,
    ScheduleDeliveryRequest,
    ScheduleDeliveryResponse,
    WebhookDelivery,
)
from notification_service.repositories.delivery_repository import InMemoryDeliveryRepository
from notification_service.services.delivery_service import DeliveryService

logger = structlog.get_logger()
router = APIRouter()

# In production: inject via dependency injection
_repository = InMemoryDeliveryRepository()
_service = DeliveryService(_repository)


@router.post("/deliveries", response_model=ScheduleDeliveryResponse, status_code=202)
async def schedule_delivery(
    request_body: ScheduleDeliveryRequest,
    http_request: Request,
) -> ScheduleDeliveryResponse:
    """Schedule a new webhook delivery."""
    delivery = await _service.schedule_delivery(request_body)

    logger.info(
        "api.webhook.delivery.scheduled",
        delivery_id=delivery.id,
        request_id=http_request.headers.get("x-request-id", str(ULID())),
    )

    return ScheduleDeliveryResponse(
        delivery_id=delivery.id,
        status=delivery.status,
        endpoint_url=delivery.endpoint_url,
        scheduled_at=delivery.created_at,
        max_retries=delivery.max_retries,
    )


@router.get("/deliveries/{delivery_id}", response_model=WebhookDelivery)
async def get_delivery(delivery_id: str) -> WebhookDelivery:
    """Get status of a specific webhook delivery."""
    delivery = await _repository.find_by_id(delivery_id)
    if not delivery:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": f"Delivery {delivery_id} not found"})
    return delivery


@router.post("/deliveries/{delivery_id}/retry", response_model=WebhookDelivery)
async def retry_delivery(delivery_id: str) -> WebhookDelivery:
    """Manually trigger a retry for a failed delivery."""
    delivery = await _repository.find_by_id(delivery_id)
    if not delivery:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Delivery not found"})

    if delivery.status == DeliveryStatus.DELIVERED:
        raise HTTPException(status_code=422, detail={"code": "ALREADY_DELIVERED", "message": "Cannot retry a delivered webhook"})

    return await _service.attempt_delivery(delivery_id)
