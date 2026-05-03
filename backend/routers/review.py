import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from config import settings
from models.schemas import CodeReviewRequest, CodeReviewResponse, ReviewFinding
from services.db_service import log_event
from services.github_service import build_context, fetch_repo_info
from services.ai_service import review_technical_structured, scan_security_structured

router = APIRouter()


def _normalise_findings(raw: list[dict]) -> list[ReviewFinding]:
    findings: list[ReviewFinding] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        item["severity"] = str(item.get("severity", "LOW")).upper()
        try:
            findings.append(ReviewFinding(**item))
        except Exception:
            pass
    return findings


@router.post("/review/security", response_model=CodeReviewResponse)
async def review_security(request: CodeReviewRequest) -> CodeReviewResponse:
    try:
        info = await fetch_repo_info(request.repo_url)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch repository: {exc}")

    context = build_context(info)

    try:
        raw = await scan_security_structured(context, request.focus)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI model error: {exc}")

    findings = _normalise_findings(raw)
    has_high = any(f.severity == "HIGH" for f in findings)

    await log_event(
        event_type="review_security",
        repo_url=str(request.repo_url),
        ai_response=json.dumps(raw),
        model_name=settings.anthropic_model,
    )

    return CodeReviewResponse(
        repo_url=str(request.repo_url),
        name=f"{info.owner}/{info.repo}",
        review_type="security",
        findings=findings,
        finding_count=len(findings),
        has_high_severity=has_high,
        timestamp=datetime.now(timezone.utc),
    )


@router.post("/review/technical", response_model=CodeReviewResponse)
async def review_technical(request: CodeReviewRequest) -> CodeReviewResponse:
    try:
        info = await fetch_repo_info(request.repo_url)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch repository: {exc}")

    context = build_context(info)

    try:
        raw = await review_technical_structured(context, request.focus)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI model error: {exc}")

    findings = _normalise_findings(raw)
    has_high = any(f.severity == "HIGH" for f in findings)

    await log_event(
        event_type="review_technical",
        repo_url=str(request.repo_url),
        ai_response=json.dumps(raw),
        model_name=settings.anthropic_model,
    )

    return CodeReviewResponse(
        repo_url=str(request.repo_url),
        name=f"{info.owner}/{info.repo}",
        review_type="technical",
        findings=findings,
        finding_count=len(findings),
        has_high_severity=has_high,
        timestamp=datetime.now(timezone.utc),
    )
