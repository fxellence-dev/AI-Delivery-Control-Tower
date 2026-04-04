"""
Delivery repository — data access layer.
Per CLAUDE.md: no direct DB access from API handlers — always through repository.
In integration tests: use real Postgres (testcontainers), never mock this.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from notification_service.models.webhook import WebhookDelivery


class DeliveryRepository(ABC):
    @abstractmethod
    async def find_by_id(self, delivery_id: str) -> WebhookDelivery | None: ...

    @abstractmethod
    async def create(self, delivery: WebhookDelivery) -> WebhookDelivery: ...

    @abstractmethod
    async def update(self, delivery: WebhookDelivery) -> WebhookDelivery: ...

    @abstractmethod
    async def list_pending(self, limit: int = 100) -> list[WebhookDelivery]: ...


class InMemoryDeliveryRepository(DeliveryRepository):
    """In-memory implementation for demo — replace with async Postgres in production."""

    def __init__(self) -> None:
        self._store: dict[str, WebhookDelivery] = {}

    async def find_by_id(self, delivery_id: str) -> WebhookDelivery | None:
        return self._store.get(delivery_id)

    async def create(self, delivery: WebhookDelivery) -> WebhookDelivery:
        self._store[delivery.id] = delivery
        return delivery

    async def update(self, delivery: WebhookDelivery) -> WebhookDelivery:
        if delivery.id not in self._store:
            raise ValueError(f"Delivery not found: {delivery.id}")
        self._store[delivery.id] = delivery
        return delivery

    async def list_pending(self, limit: int = 100) -> list[WebhookDelivery]:
        from notification_service.models.webhook import DeliveryStatus
        return [d for d in self._store.values() if d.status == DeliveryStatus.PENDING][:limit]
