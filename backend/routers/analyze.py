from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from config import settings
from models.schemas import AnalyzeRequest, AnalyzeResponse
from services.db_service import log_event
from services.github_service import build_context, fetch_repo_info
from services.kafka_service import emit_repo_analysis
from services.ollama_service import summarize_repo

router = APIRouter()


async def _run_analysis(request: AnalyzeRequest) -> AnalyzeResponse:
    try:
        info = await fetch_repo_info(request.repo_url)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch repository: {exc}")

    context = build_context(info)

    try:
        summary = await summarize_repo(context)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI model error: {exc}")

    timestamp = datetime.now(timezone.utc)
    repo_url_str = str(request.repo_url)

    await emit_repo_analysis(repo_url_str, summary, settings.anthropic_model)
    await log_event(
        event_type="analyze",
        repo_url=repo_url_str,
        ai_response=summary,
        model_name=settings.anthropic_model,
    )

    return AnalyzeResponse(
        repo_url=repo_url_str,
        name=f"{info.owner}/{info.repo}",
        description=info.description,
        language=info.language,
        stars=info.stars,
        file_count=len(info.file_paths),
        key_files=info.key_files,
        summary=summary,
        timestamp=timestamp,
    )


@router.post("/analyze-repo", response_model=AnalyzeResponse)
async def analyze_repo(request: AnalyzeRequest) -> AnalyzeResponse:
    return await _run_analysis(request)


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_repo_legacy(request: AnalyzeRequest) -> AnalyzeResponse:
    return await _run_analysis(request)
