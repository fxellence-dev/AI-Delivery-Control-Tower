from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    version: str


@router.get("/health/live", response_model=HealthResponse)
async def liveness() -> HealthResponse:
    return HealthResponse(status="ok", version="2.0.8")


@router.get("/health/ready", response_model=HealthResponse)
async def readiness() -> HealthResponse:
    # In production: check DB connection, SQS reachability
    return HealthResponse(status="ok", version="2.0.8")
