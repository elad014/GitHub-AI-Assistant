import json
from collections.abc import AsyncGenerator
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from config import settings
from models.schemas import ChatRequest, ChatResponse
from services.db_service import get_user_chat_history, log_event
from services.github_service import build_general_context, fetch_repo_overview, fetch_single_file
from services.kafka_service import emit_chat_request, emit_chat_response
from services.ollama_service import agentic_chat, stream_agentic_chat

router = APIRouter()


async def _resolve_history(request: ChatRequest, repo_url_str: str) -> list[dict]:
    """Return last 10 Q&A pairs: from DB if user_name given, else from request payload."""
    if request.user_name and request.user_name.strip():
        try:
            return await get_user_chat_history(
                request.user_name.strip(),
                repo_url_str,
                settings.chat_history_size,
            )
        except Exception:
            return []
    return [msg.model_dump() for msg in request.history]


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    repo_url_str = str(request.repo_url)

    await emit_chat_request(repo_url_str, request.message, settings.ollama_model)

    try:
        info = await fetch_repo_overview(request.repo_url)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch repository: {exc}")

    general_context = build_general_context(info)
    history = await _resolve_history(request, repo_url_str)

    async def _fetch_file(path: str) -> str:
        return await fetch_single_file(info.owner, info.repo, path)

    try:
        reply = await agentic_chat(general_context, request.message, history, _fetch_file)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI model error: {exc}")

    timestamp = datetime.now(timezone.utc)

    await log_event(
        event_type="chat",
        repo_url=repo_url_str,
        ai_response=reply,
        model_name=settings.ollama_model,
        user_message=request.message,
        user_name=request.user_name or None,
    )
    await emit_chat_response(repo_url_str, request.message, reply, settings.ollama_model)

    return ChatResponse(message=reply, timestamp=timestamp)


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest) -> StreamingResponse:
    repo_url_str = str(request.repo_url)

    await emit_chat_request(repo_url_str, request.message, settings.ollama_model)

    try:
        info = await fetch_repo_overview(request.repo_url)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch repository: {exc}")

    general_context = build_general_context(info)
    history = await _resolve_history(request, repo_url_str)

    async def _fetch_file(path: str) -> str:
        return await fetch_single_file(info.owner, info.repo, path)

    collected: list[str] = []

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            async for event in stream_agentic_chat(
                general_context, request.message, history, _fetch_file
            ):
                if "status" in event:
                    yield f"data: {json.dumps({'status': event['status']})}\n\n"
                else:
                    token: str = event.get("token", "")
                    collected.append(token)
                    yield f"data: {json.dumps({'token': token})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
            return

        full_reply = "".join(collected)
        try:
            await log_event(
                event_type="chat",
                repo_url=repo_url_str,
                ai_response=full_reply,
                model_name=settings.ollama_model,
                user_message=request.message,
                user_name=request.user_name or None,
            )
            await emit_chat_response(repo_url_str, request.message, full_reply, settings.ollama_model)
        except Exception:
            pass

        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
