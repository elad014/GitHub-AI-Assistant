import re
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from config import settings
from models.schemas import AnalyzeCodeRequest, AnalyzeCodeResponse, SecurityScanRequest, SecurityScanResponse
from services.db_service import log_event, log_security_scan
from services.github_service import build_context, fetch_repo_info
from services.ai_service import explain_code, scan_security

router = APIRouter()

_HIGH_PATTERN = re.compile(r"\[SEVERITY:\s*HIGH\]", re.IGNORECASE)
_FINDING_PATTERN = re.compile(r"\[SEVERITY:", re.IGNORECASE)


@router.post("/security-scan", response_model=SecurityScanResponse)
async def security_scan(request: SecurityScanRequest) -> SecurityScanResponse:
    try:
        info = await fetch_repo_info(request.repo_url)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch repository: {exc}")

    context = build_context(info)

    try:
        findings_raw = await scan_security(context)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI model error: {exc}")

    finding_count = len(_FINDING_PATTERN.findall(findings_raw))
    has_high = bool(_HIGH_PATTERN.search(findings_raw))
    timestamp = datetime.now(timezone.utc)
    repo_url_str = str(request.repo_url)

    await log_security_scan(
        repo_url=repo_url_str,
        findings_raw=findings_raw,
        finding_count=finding_count,
        has_high=has_high,
        model_name=settings.anthropic_model,
    )

    return SecurityScanResponse(
        repo_url=repo_url_str,
        name=f"{info.owner}/{info.repo}",
        findings_raw=findings_raw,
        finding_count=finding_count,
        has_high_severity=has_high,
        timestamp=timestamp,
    )


@router.post("/analyze-code", response_model=AnalyzeCodeResponse)
async def analyze_code(request: AnalyzeCodeRequest) -> AnalyzeCodeResponse:
    try:
        info = await fetch_repo_info(request.repo_url)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch repository: {exc}")

    context = build_context(info)

    try:
        explanation = await explain_code(context, request.file_path)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI model error: {exc}")

    timestamp = datetime.now(timezone.utc)
    repo_url_str = str(request.repo_url)

    await log_event(
        event_type="code_explain",
        repo_url=repo_url_str,
        ai_response=explanation,
        model_name=settings.anthropic_model,
        user_message=request.file_path,
    )

    return AnalyzeCodeResponse(
        repo_url=repo_url_str,
        file_path=request.file_path,
        explanation=explanation,
        timestamp=timestamp,
    )
