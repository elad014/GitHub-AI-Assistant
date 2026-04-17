from datetime import datetime

from pydantic import BaseModel, HttpUrl


# ── Query (legacy) ────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    repo_url: HttpUrl
    question: str


class QueryResponse(BaseModel):
    answer: str
    repo_url: str
    question: str
    timestamp: datetime


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    repo_url: HttpUrl
    message: str
    history: list[ChatMessage] = []
    user_name: str = ""


class ChatResponse(BaseModel):
    message: str
    timestamp: datetime


# ── Repo analysis ─────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    repo_url: HttpUrl


class AnalyzeResponse(BaseModel):
    repo_url: str
    name: str
    description: str | None
    language: str | None
    stars: int
    file_count: int
    key_files: list[str]
    summary: str
    timestamp: datetime


# ── Security scan ─────────────────────────────────────────────────────────────

class SecurityScanRequest(BaseModel):
    repo_url: HttpUrl


class SecurityFinding(BaseModel):
    severity: str
    title: str
    description: str
    recommendation: str


class SecurityScanResponse(BaseModel):
    repo_url: str
    name: str
    findings_raw: str
    finding_count: int
    has_high_severity: bool
    timestamp: datetime


# ── Code explanation ──────────────────────────────────────────────────────────

class AnalyzeCodeRequest(BaseModel):
    repo_url: HttpUrl
    file_path: str


class AnalyzeCodeResponse(BaseModel):
    repo_url: str
    file_path: str
    explanation: str
    timestamp: datetime


# ── Analytics ─────────────────────────────────────────────────────────────────

class EventCount(BaseModel):
    event_type: str
    count: int


class TopRepo(BaseModel):
    repo_url: str
    count: int


class AnalyticsResponse(BaseModel):
    total_events: int
    events_by_type: list[EventCount]
    top_repos: list[TopRepo]
    security_scans: int
    high_severity_findings: int
    period_days: int


# ── Health ────────────────────────────────────────────────────────────────────

class ServiceStatus(BaseModel):
    status: str
    detail: str | None = None


class HealthResponse(BaseModel):
    status: str
    services: dict[str, ServiceStatus]




# PR created for audit trail
