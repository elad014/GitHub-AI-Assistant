from fastapi import APIRouter

from config import settings
from models.schemas import HealthResponse, ServiceStatus
from services.db_service import check_connection as db_check
from services.ollama_service import check_connection as ollama_check

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    ollama_ok = await ollama_check()
    db_ok = await db_check()

    services: dict[str, ServiceStatus] = {
        settings.anthropic_model: ServiceStatus(status="ok" if ollama_ok else "error"),
        "database": ServiceStatus(status="ok" if db_ok else "error"),
    }

    overall = "ok" if all(s.status == "ok" for s in services.values()) else "degraded"

    return HealthResponse(status=overall, services=services)
