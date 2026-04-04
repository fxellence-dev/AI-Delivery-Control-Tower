"""
Webhook domain models — Pydantic v2.
Per .claude/rules/python.md: use Pydantic v2 for all request/response models.
Per .claude/rules/python.md: use python-ulid for IDs (mirrors TS ULID convention).
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, field_validator


class DeliveryStatus(StrEnum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DELIVERED = "delivered"
    FAILED = "failed"
    DLQ = "dlq"  # Moved to dead-letter queue after max retries


class ScheduleDeliveryRequest(BaseModel):
    """Request to schedule a webhook delivery."""

    endpoint_url: str
    payload: dict[str, Any]
    max_retries: int = 5
    headers: dict[str, str] | None = None

    @field_validator("endpoint_url")
    @classmethod
    def validate_https(cls, v: str) -> str:
        if not v.startswith("https://"):
            raise ValueError("endpoint_url must use HTTPS for security")
        return v

    @field_validator("max_retries")
    @classmethod
    def validate_retries(cls, v: int) -> int:
        # Per CLAUDE.md known quirk: max 5 retries for notification service
        if v > 5:
            raise ValueError("max_retries cannot exceed 5 (CLAUDE.md constraint)")
        return v


class ScheduleDeliveryResponse(BaseModel):
    """Response after scheduling a webhook delivery."""

    delivery_id: str  # ULID
    status: DeliveryStatus
    endpoint_url: str
    scheduled_at: datetime
    max_retries: int


class WebhookDelivery(BaseModel):
    """Full delivery record."""

    id: str  # ULID
    endpoint_url: str
    payload: dict[str, Any]
    status: DeliveryStatus
    attempts: int
    max_retries: int
    last_attempt_at: datetime | None = None
    next_retry_at: datetime | None = None
    delivered_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    error_message: str | None = None


class DeliveryListResponse(BaseModel):
    """Paginated list of deliveries."""

    data: list[WebhookDelivery]
    meta: dict[str, Any]
