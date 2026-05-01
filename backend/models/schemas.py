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


# ── Repo history ─────────────────────────────────────────────────────────────

class RepoHistoryEntry(BaseModel):
    id: int
    event_type: str
    user_name: str | None
    user_message: str | None
    ai_response: str
    model_name: str
    created_at: datetime


class RepoHistoryResponse(BaseModel):
    repo_url: str
    entries: list[RepoHistoryEntry]
    total: int


class KnownRepo(BaseModel):
    repo_url: str
    event_count: int
    last_activity: datetime


class KnownReposResponse(BaseModel):
    repos: list[KnownRepo]


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


# ── Repo overview ────────────────────────────────────────────────────────────

class RepoOverviewRequest(BaseModel):
    repo_url: HttpUrl


class RepoOverviewResponse(BaseModel):
    repo_url: str
    name: str
    description: str | None
    language: str | None
    stars: int
    owner_avatar_url: str | None = None
    opengraph_image_url: str | None = None
    file_count: int
    key_files: list[str]
    paths: list[str]
    readme_excerpt: str | None


# ── Code review (security + technical) ───────────────────────────────────────

class ReviewFinding(BaseModel):
    severity: str
    file_path: str | None = None
    title: str
    description: str
    recommendation: str
    line_start: int | None = None
    line_end: int | None = None

    model_config = {"extra": "ignore"}


class CodeReviewRequest(BaseModel):
    repo_url: HttpUrl
    focus: str = ""


class CodeReviewResponse(BaseModel):
    repo_url: str
    name: str
    review_type: str
    findings: list[ReviewFinding]
    finding_count: int
    has_high_severity: bool
    timestamp: datetime


# ── Repo comparison ───────────────────────────────────────────────────────────

class CompareSection(BaseModel):
    title: str
    content: str


class RepoMetaSummary(BaseModel):
    name: str
    description: str | None
    language: str | None
    stars: int


class CompareReposRequest(BaseModel):
    repo_a_url: HttpUrl
    repo_b_url: HttpUrl
    comparison_goals: str = ""


class CompareReposResponse(BaseModel):
    repo_a: RepoMetaSummary
    repo_b: RepoMetaSummary
    verdict: str
    sections: list[CompareSection]
    timestamp: datetime


# ── Health ────────────────────────────────────────────────────────────────────

class ServiceStatus(BaseModel):
    status: str
    detail: str | None = None


class HealthResponse(BaseModel):
    status: str
    services: dict[str, ServiceStatus]
