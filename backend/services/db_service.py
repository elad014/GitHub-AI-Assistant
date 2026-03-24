import logging

import asyncpg

from config import settings

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None

_MIGRATIONS = [
    # Primary interaction log
    """
    CREATE TABLE IF NOT EXISTS chat_logs (
        id           SERIAL PRIMARY KEY,
        event_type   TEXT        NOT NULL,
        repo_url     TEXT        NOT NULL,
        user_name    TEXT,
        user_message TEXT,
        ai_response  TEXT        NOT NULL,
        model_name   TEXT        NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    # Add user_name to existing chat_logs (no-op if column exists)
    """
    DO $$ BEGIN
        ALTER TABLE chat_logs ADD COLUMN user_name TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
    """,
    # Security findings
    """
    CREATE TABLE IF NOT EXISTS security_findings (
        id              SERIAL PRIMARY KEY,
        repo_url        TEXT        NOT NULL,
        findings_raw    TEXT        NOT NULL,
        finding_count   INT         NOT NULL DEFAULT 0,
        has_high        BOOLEAN     NOT NULL DEFAULT FALSE,
        model_name      TEXT        NOT NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    # Indexes
    """
    CREATE INDEX IF NOT EXISTS idx_chat_logs_event_type ON chat_logs (event_type);
    CREATE INDEX IF NOT EXISTS idx_chat_logs_repo_url   ON chat_logs (repo_url);
    CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_logs_user_repo  ON chat_logs (user_name, repo_url);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_security_repo_url   ON security_findings (repo_url);
    CREATE INDEX IF NOT EXISTS idx_security_created_at ON security_findings (created_at DESC);
    """,
    # Legacy table
    """
    CREATE TABLE IF NOT EXISTS interactions (
        id          SERIAL PRIMARY KEY,
        repo_url    TEXT        NOT NULL,
        question    TEXT        NOT NULL,
        answer      TEXT        NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
]


async def init_db() -> None:
    global _pool
    if not settings.database_url:
        logger.warning("DATABASE_URL not set — database disabled")
        return
    try:
        _pool = await asyncpg.create_pool(settings.database_url)
        async with _pool.acquire() as conn:
            for migration in _MIGRATIONS:
                await conn.execute(migration)
        logger.info("Database connected and schema ready")
    except Exception as exc:
        logger.warning("Database connection failed: %s — database disabled", exc)
        _pool = None


async def close_db() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def get_user_chat_history(
    user_name: str,
    repo_url: str,
    limit: int,
) -> list[dict[str, str]]:
    """Return last `limit` Q&A pairs for this user+repo, chronological (oldest first)."""
    if _pool is None or not user_name:
        return []
    async with _pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT user_message, ai_response
            FROM chat_logs
            WHERE event_type = 'chat' AND user_name = $1 AND repo_url = $2
              AND user_message IS NOT NULL
            ORDER BY created_at DESC
            LIMIT $3
            """,
            user_name.strip(),
            repo_url,
            limit,
        )
    # Reverse so oldest first for model context
    out: list[dict[str, str]] = []
    for r in reversed(rows):
        if r["user_message"]:
            out.append({"role": "user", "content": r["user_message"]})
        out.append({"role": "assistant", "content": r["ai_response"]})
    return out


async def log_event(
    event_type: str,
    repo_url: str,
    ai_response: str,
    model_name: str,
    user_message: str | None = None,
    user_name: str | None = None,
) -> None:
    if _pool is None:
        logger.warning("Chat not recorded: database not connected (set DATABASE_URL)")
        return
    async with _pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO chat_logs (event_type, repo_url, user_name, user_message, ai_response, model_name)
            VALUES ($1, $2, $3, $4, $5, $6)
            """,
            event_type,
            repo_url,
            user_name or None,
            user_message,
            ai_response,
            model_name,
        )


async def log_security_scan(
    repo_url: str,
    findings_raw: str,
    finding_count: int,
    has_high: bool,
    model_name: str,
) -> None:
    if _pool is None:
        return
    async with _pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO security_findings (repo_url, findings_raw, finding_count, has_high, model_name)
            VALUES ($1, $2, $3, $4, $5)
            """,
            repo_url,
            findings_raw,
            finding_count,
            has_high,
            model_name,
        )


async def get_analytics(period_days: int = 30) -> dict:
    if _pool is None:
        return {
            "total_events": 0,
            "events_by_type": [],
            "top_repos": [],
            "security_scans": 0,
            "high_severity_findings": 0,
        }
    async with _pool.acquire() as conn:
        total: int = await conn.fetchval(
            "SELECT COUNT(*) FROM chat_logs WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL",
            str(period_days),
        )

        by_type = await conn.fetch(
            """
            SELECT event_type, COUNT(*) AS count
            FROM chat_logs
            WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
            GROUP BY event_type
            ORDER BY count DESC
            """,
            str(period_days),
        )

        top_repos = await conn.fetch(
            """
            SELECT repo_url, COUNT(*) AS count
            FROM chat_logs
            WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
            GROUP BY repo_url
            ORDER BY count DESC
            LIMIT 10
            """,
            str(period_days),
        )

        security_scans: int = await conn.fetchval(
            "SELECT COUNT(*) FROM security_findings WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL",
            str(period_days),
        )

        high_findings: int = await conn.fetchval(
            "SELECT COUNT(*) FROM security_findings WHERE has_high = TRUE AND created_at >= NOW() - ($1 || ' days')::INTERVAL",
            str(period_days),
        )

    return {
        "total_events": total,
        "events_by_type": [{"event_type": r["event_type"], "count": r["count"]} for r in by_type],
        "top_repos": [{"repo_url": r["repo_url"], "count": r["count"]} for r in top_repos],
        "security_scans": security_scans,
        "high_severity_findings": high_findings,
    }


async def save_interaction(repo_url: str, question: str, answer: str) -> None:
    if _pool is None:
        return
    async with _pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO interactions (repo_url, question, answer) VALUES ($1, $2, $3)",
            repo_url,
            question,
            answer,
        )


async def check_connection() -> bool:
    if _pool is None:
        return False
    try:
        async with _pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return True
    except Exception:
        return False
