from fastapi import APIRouter, HTTPException

from models.schemas import RepoOverviewRequest, RepoOverviewResponse
from services.github_service import fetch_repo_overview

router = APIRouter()


@router.post("/repo-overview", response_model=RepoOverviewResponse)
async def repo_overview(request: RepoOverviewRequest) -> RepoOverviewResponse:
    try:
        info = await fetch_repo_overview(request.repo_url)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch repository: {exc}")

    return RepoOverviewResponse(
        repo_url=str(request.repo_url),
        name=f"{info.owner}/{info.repo}",
        description=info.description,
        language=info.language,
        stars=info.stars,
        owner_avatar_url=info.owner_avatar_url,
        opengraph_image_url=info.opengraph_image_url,
        file_count=len(info.file_paths),
        key_files=info.key_files,
        paths=info.all_paths,
        readme_excerpt=info.readme[:500] if info.readme else None,
    )
