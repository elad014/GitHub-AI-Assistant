import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from models.schemas import (
    CompareReposRequest,
    CompareReposResponse,
    CompareSection,
    RepoMetaSummary,
)
from services.github_service import build_general_context, fetch_repo_overview
from services.ai_service import compare_repos_llm

router = APIRouter()


@router.post("/compare-repos", response_model=CompareReposResponse)
async def compare_repos(request: CompareReposRequest) -> CompareReposResponse:
    try:
        info_a, info_b = await asyncio.gather(
            fetch_repo_overview(request.repo_a_url),
            fetch_repo_overview(request.repo_b_url),
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch repository: {exc}")

    context_a = build_general_context(info_a)
    context_b = build_general_context(info_b)

    try:
        result = await compare_repos_llm(
            context_a=context_a,
            context_b=context_b,
            name_a=f"{info_a.owner}/{info_a.repo}",
            name_b=f"{info_b.owner}/{info_b.repo}",
            goals=request.comparison_goals,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI model error: {exc}")

    sections = [
        CompareSection(**s)
        for s in result.get("sections", [])
        if isinstance(s, dict) and "title" in s and "content" in s
    ]

    return CompareReposResponse(
        repo_a=RepoMetaSummary(
            name=f"{info_a.owner}/{info_a.repo}",
            description=info_a.description,
            language=info_a.language,
            stars=info_a.stars,
        ),
        repo_b=RepoMetaSummary(
            name=f"{info_b.owner}/{info_b.repo}",
            description=info_b.description,
            language=info_b.language,
            stars=info_b.stars,
        ),
        verdict=result.get("verdict", "Comparison unavailable."),
        sections=sections,
        timestamp=datetime.now(timezone.utc),
    )
