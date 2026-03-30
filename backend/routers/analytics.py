from fastapi import APIRouter, Query

from models.schemas import AnalyticsResponse
from services.db_service import get_analytics

router = APIRouter()


@router.get("/analytics", response_model=AnalyticsResponse)
async def analytics(period_days: int = Query(default=30, ge=1, le=365)) -> AnalyticsResponse:
    data = await get_analytics(period_days)
    return AnalyticsResponse(
        total_events=data["total_events"],
        events_by_type=data["events_by_type"],
        top_repos=data["top_repos"],
        security_scans=data["security_scans"],
        high_severity_findings=data["high_severity_findings"],
        period_days=period_days,
    )
