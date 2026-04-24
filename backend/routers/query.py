from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from models.schemas import QueryRequest, QueryResponse
from services.db_service import save_interaction
from services.github_service import build_general_context, fetch_repo_overview, fetch_single_file
from services.ollama_service import agentic_chat

router = APIRouter()


@router.post("/query", response_model=QueryResponse)
async def query_repo(request: QueryRequest) -> QueryResponse:
    try:
        info = await fetch_repo_overview(request.repo_url)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch repository: {exc}")

    general_context = build_general_context(info)

    async def _fetch_file(path: str) -> str:
        return await fetch_single_file(info.owner, info.repo, path)

    try:
        answer = await agentic_chat(general_context, request.question, [], _fetch_file)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI model error: {exc}")

    timestamp = datetime.now(timezone.utc)
    repo_url_str = str(request.repo_url)

    await save_interaction(repo_url_str, request.question, answer)

    return QueryResponse(
        answer=answer,
        repo_url=repo_url_str,
        question=request.question,
        timestamp=timestamp,
    )
