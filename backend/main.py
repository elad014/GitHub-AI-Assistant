import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from routers import analyze, analytics, chat, compare, health, overview, query, review, security
from services.db_service import close_db, init_db


class SPAStaticFiles(StaticFiles):
    """Serves the built React app and falls back to index.html for unknown
    paths so client-side routes (e.g. /chat, /analyze) work on hard-refresh
    and direct navigation. API 404s are still surfaced as JSON."""

    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code != 404 or path.startswith("api/"):
                raise
            return await super().get_response("index.html", scope)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logging.getLogger("services.github_service").setLevel(logging.DEBUG)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="GitHub AI Assistant",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router,     prefix="/api")
app.include_router(chat.router,       prefix="/api")
app.include_router(analyze.router,    prefix="/api")
app.include_router(security.router,   prefix="/api")
app.include_router(analytics.router,  prefix="/api")
app.include_router(query.router,      prefix="/api")
app.include_router(overview.router,   prefix="/api")
app.include_router(review.router,     prefix="/api")
app.include_router(compare.router,    prefix="/api")

_frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if _frontend_dist.is_dir():
    app.mount("/", SPAStaticFiles(directory=str(_frontend_dist), html=True), name="static")
