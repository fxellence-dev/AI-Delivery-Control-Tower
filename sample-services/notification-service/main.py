"""
notification-service — Nexus Platform

Entry point for the webhook delivery service.
Target for Demo 1 (webhook retry feature) in ADCT reference project.

Key patterns demonstrated (per .claude/rules/python.md):
- structlog for structured logging (never print/logging)
- Pydantic v2 for all models
- python-ulid for IDs
- FastAPI with proper response models
"""

import structlog
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from notification_service.api.webhooks import router as webhooks_router
from notification_service.api.health import router as health_router

# Configure structlog — must be done before any logging calls
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer() if __name__ == "__main__" else structlog.processors.JSONRenderer(),
    ],
)

logger = structlog.get_logger()

app = FastAPI(
    title="notification-service",
    version="2.0.8",
    description="Nexus Platform webhook delivery service",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(webhooks_router, prefix="/v1/webhooks")


@app.on_event("startup")
async def startup() -> None:
    logger.info("notification_service.started", version="2.0.8")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=3003, reload=True)
