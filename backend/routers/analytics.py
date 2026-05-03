from fastapi import APIRouter, Query

from models.schemas import (
    AnalyticsResponse,
    KnownRepo,
    KnownReposResponse,
    RepoHistoryEntry,
    RepoHistoryResponse,
)
from services.db_service import get_analytics, get_known_repos, get_repo_history

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


@router.get("/known-repos", response_model=KnownReposResponse)
async def known_repos(limit: int = Query(default=50, ge=1, le=200)) -> KnownReposResponse:
    rows = await get_known_repos(limit)
    return KnownReposResponse(
        repos=[KnownRepo(**r) for r in rows]
    )


@router.get("/repo-history", response_model=RepoHistoryResponse)
async def repo_history(
    repo_url: str = Query(..., description="Full GitHub repo URL"),
    limit: int = Query(default=100, ge=1, le=500),
) -> RepoHistoryResponse:
    rows = await get_repo_history(repo_url, limit)
    return RepoHistoryResponse(
        repo_url=repo_url,
        entries=[RepoHistoryEntry(**r) for r in rows],
        total=len(rows),
    )
