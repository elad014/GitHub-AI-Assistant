from fastapi import APIRouter, HTTPException

from models.schemas import RepoOverviewRequest, RepoOverviewResponse
from services.github_service import fetch_repo_overview

router = APIRouter()

# Full README payloads are heavy; keep excerpt bounded but avoid mid-word cuts from a tiny slice.
_README_EXCERPT_MAX = 8000


def _readme_excerpt(readme: str) -> str:
    if len(readme) <= _README_EXCERPT_MAX:
        return readme
    chunk = readme[:_README_EXCERPT_MAX]
    for sep in ("\n\n", "\n", " "):
        cut = chunk.rfind(sep)
        if cut > int(_README_EXCERPT_MAX * 0.55):
            return readme[:cut].rstrip()
    return chunk.rstrip()


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
        readme_excerpt=_readme_excerpt(info.readme) if info.readme else None,
    )
