# Python Rules — Nexus Platform (notification-service)

> **[CAPABILITY: MEMORY — .claude/rules/]**
> Python-specific conventions for the notification-service.
> These override and extend the global rules in CLAUDE.md.

## Version and Tooling

- Python 3.12+ only.
- Use `uv` for package management (not pip, not poetry).
- Run `ruff check --fix` before every commit.
- Run `mypy --strict` — all type errors must be resolved.

## FastAPI Patterns

```python
# ✅ CORRECT — Use Pydantic v2 models for all request/response
from pydantic import BaseModel, field_validator
from typing import Annotated
from fastapi import FastAPI, Depends

class WebhookDeliveryRequest(BaseModel):
    endpoint_url: str
    payload: dict
    max_retries: int = 5

    @field_validator('endpoint_url')
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith('https://'):
            raise ValueError('endpoint_url must use HTTPS')
        return v

# ✅ Response models always defined — never return raw dicts
class WebhookDeliveryResponse(BaseModel):
    delivery_id: str  # ULID
    status: str
    scheduled_at: datetime
```

## Structured Logging

**Never use `print()` or standard `logging` in production code. Always use `structlog`.**

```python
# ✅ CORRECT
import structlog
logger = structlog.get_logger()

logger.info("webhook.delivery.started", delivery_id=delivery_id, endpoint=endpoint_url)
logger.error("webhook.delivery.failed", delivery_id=delivery_id, attempt=attempt, error=str(e))

# ❌ WRONG
print(f"Starting delivery {delivery_id}")
import logging; logging.info("...")
```

## Error Handling

Use custom exception hierarchy — never raise bare `Exception`:

```python
class NexusError(Exception):
    """Base error for all Nexus exceptions."""

class WebhookDeliveryError(NexusError):
    def __init__(self, delivery_id: str, reason: str) -> None:
        self.delivery_id = delivery_id
        self.reason = reason
        super().__init__(f"Delivery {delivery_id} failed: {reason}")
```

## ID Generation

Use `python-ulid` package — mirrors the TypeScript convention:

```python
from python_ulid import ULID

delivery_id = str(ULID())
```

## Testing

- Use `pytest` with `pytest-asyncio` for async tests.
- Fixtures in `conftest.py`.
- Use `httpx.AsyncClient` for FastAPI integration tests.
- Never mock the database in integration tests — use `testcontainers` for Postgres.

```python
# ✅ Integration test with real DB
@pytest.fixture
async def db_client(postgres_container):
    async with AsyncSession(create_engine(postgres_container.get_connection_url())) as session:
        yield session
```

## Module Structure

```
notification_service/
  api/
    webhooks.py         # FastAPI router
    health.py
  services/
    delivery_service.py
    retry_service.py
  repositories/
    delivery_repository.py
  models/
    webhook.py          # Pydantic models
    db.py               # SQLAlchemy models
  tests/
    test_delivery_service.py
    test_webhooks.py
    conftest.py
  main.py
```
