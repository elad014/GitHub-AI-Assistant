import asyncio
import logging
from dataclasses import dataclass, field

import httpx

from config import settings

logger = logging.getLogger(__name__)

_READABLE_EXTENSIONS = (
    ".py", ".js", ".ts", ".jsx", ".tsx",
    ".java", ".go", ".rb", ".rs", ".cpp", ".c", ".h",
    ".md", ".txt", ".yaml", ".yml", ".json", ".toml", ".ino",
)
_KEY_FILE_NAMES = (
    "readme.md", "readme.rst", "readme.txt",
    "package.json", "requirements.txt", "pyproject.toml",
    "dockerfile", "docker-compose.yml", "makefile",
    "main.py", "app.py", "index.js", "index.ts",
)
_MAX_FILES = 60
_MAX_FILES_TO_FETCH = 10
_MAX_CHARS_PER_FILE = 10000
_MAX_CHARS_PRIORITY = 6000


@dataclass
class RepoInfo:
    owner: str
    repo: str
    description: str | None
    language: str | None
    stars: int
    all_paths: list[str]
    file_paths: list[str]
    key_files: list[str]
    readme: str
    owner_avatar_url: str | None = None
    opengraph_image_url: str | None = None
    file_contents: dict[str, str] = field(default_factory=dict)


def _build_headers() -> dict[str, str]:
    headers: dict[str, str] = {"Accept": "application/vnd.github+json"}
    if settings.github_token:
        headers["Authorization"] = f"Bearer {settings.github_token}"
    return headers


async def _fetch_readme(owner: str, repo: str, headers: dict[str, str]) -> str:
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}/readme",
                headers={**headers, "Accept": "application/vnd.github.raw+json"},
            )
            if resp.status_code == 200:
                return resp.text[:3000]
        except Exception:
            pass
    return ""


async def _fetch_file_content(
    client: httpx.AsyncClient,
    owner: str,
    repo: str,
    path: str,
    headers: dict[str, str],
    max_chars: int = _MAX_CHARS_PER_FILE,
) -> str:
    try:
        resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/contents/{path}",
            headers={**headers, "Accept": "application/vnd.github.raw+json"},
            timeout=15.0,
        )
        if resp.status_code == 200 and resp.text:
            return resp.text[:max_chars]
    except Exception:
        pass
    return ""


def _extract_file_hints(message: str, all_paths: list[str]) -> list[str]:
    """Return paths from all_paths whose filename appears in the message."""
    msg_lower = message.lower()
    hints: list[str] = []
    for path in all_paths:
        filename = path.split("/")[-1].lower()
        if filename and (filename in msg_lower or path.lower() in msg_lower):
            hints.append(path)
    return hints


async def fetch_repo_info(repo_url: str) -> RepoInfo:
    parts = str(repo_url).rstrip("/").split("/")
    owner, repo = parts[-2], parts[-1]
    headers = _build_headers()

    async with httpx.AsyncClient(timeout=30.0) as client:
        meta_resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers=headers,
        )
        meta_resp.raise_for_status()
        meta: dict = meta_resp.json()

        tree_resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1",
            headers=headers,
        )
        tree_resp.raise_for_status()
        tree: dict = tree_resp.json()

    all_paths: list[str] = [
        item["path"]
        for item in tree.get("tree", [])
        if item["type"] == "blob"
    ]

    file_paths: list[str] = [
        p for p in all_paths
        if p.endswith(_READABLE_EXTENSIONS)
    ][:_MAX_FILES]

    key_files: list[str] = [
        p for p in all_paths
        if p.split("/")[-1].lower() in _KEY_FILE_NAMES
    ]

    logger.debug(
        "[GitHub] repo=%s/%s | total blobs=%d | readable files=%d | key files=%s",
        owner, repo, len(all_paths), len(file_paths), key_files,
    )

    readme = await _fetch_readme(owner, repo, headers)
    logger.debug("[GitHub] README fetched: %d chars", len(readme))

    paths_to_fetch: list[str] = list(
        dict.fromkeys(key_files + [p for p in file_paths if p not in key_files])
    )[:_MAX_FILES_TO_FETCH]

    logger.debug("[GitHub] Files selected to fetch (%d): %s", len(paths_to_fetch), paths_to_fetch)

    file_contents: dict[str, str] = {}
    async with httpx.AsyncClient(timeout=20.0) as client:
        raw = await asyncio.gather(
            *[_fetch_file_content(client, owner, repo, path, headers) for path in paths_to_fetch],
            return_exceptions=True,
        )
        for path, content in zip(paths_to_fetch, raw):
            if isinstance(content, str) and content:
                file_contents[path] = content
                logger.debug("[GitHub] Fetched '%s': %d chars", path, len(content))
            else:
                logger.debug("[GitHub] Skipped/failed '%s': result=%r", path, content)

    return RepoInfo(
        owner=owner,
        repo=repo,
        description=meta.get("description"),
        language=meta.get("language"),
        stars=meta.get("stargazers_count", 0),
        owner_avatar_url=(meta.get("owner") or {}).get("avatar_url"),
        opengraph_image_url=f"https://opengraph.githubassets.com/1/{owner}/{repo}",
        all_paths=all_paths,
        file_paths=file_paths,
        key_files=key_files,
        readme=readme,
        file_contents=file_contents,
    )


def build_context(info: RepoInfo) -> str:
    lines: list[str] = [
        f"Repository: {info.owner}/{info.repo}",
        f"Description: {info.description or 'N/A'}",
        f"Primary language: {info.language or 'N/A'}",
        f"Stars: {info.stars}",
        "",
    ]
    for path, content in info.file_contents.items():
        lines.append(f"--- File: {path} ---")
        lines.append(content)
        lines.append("")
    if info.readme and not any("readme" in p.lower() for p in info.file_contents):
        lines += ["--- README ---", info.readme]
    return "\n".join(lines)


async def fetch_repo_overview(repo_url: str) -> RepoInfo:
    """Fetch repo metadata, file tree, and README only — no file content pre-loading."""
    parts = str(repo_url).rstrip("/").split("/")
    owner, repo = parts[-2], parts[-1]
    headers = _build_headers()

    async with httpx.AsyncClient(timeout=30.0) as client:
        meta_resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers=headers,
        )
        meta_resp.raise_for_status()
        meta: dict = meta_resp.json()

        tree_resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1",
            headers=headers,
        )
        tree_resp.raise_for_status()
        tree: dict = tree_resp.json()

    all_paths: list[str] = [
        item["path"]
        for item in tree.get("tree", [])
        if item["type"] == "blob"
    ]
    file_paths: list[str] = [
        p for p in all_paths if p.endswith(_READABLE_EXTENSIONS)
    ][:_MAX_FILES]
    key_files: list[str] = [
        p for p in all_paths if p.split("/")[-1].lower() in _KEY_FILE_NAMES
    ]

    logger.debug(
        "[GitHub] overview repo=%s/%s | blobs=%d | readable=%d | key=%s",
        owner, repo, len(all_paths), len(file_paths), key_files,
    )

    readme = await _fetch_readme(owner, repo, headers)
    logger.debug("[GitHub] README fetched: %d chars", len(readme))

    return RepoInfo(
        owner=owner,
        repo=repo,
        description=meta.get("description"),
        language=meta.get("language"),
        stars=meta.get("stargazers_count", 0),
        owner_avatar_url=(meta.get("owner") or {}).get("avatar_url"),
        opengraph_image_url=f"https://opengraph.githubassets.com/1/{owner}/{repo}",
        all_paths=all_paths,
        file_paths=file_paths,
        key_files=key_files,
        readme=readme,
    )


def build_general_context(info: RepoInfo) -> str:
    """Lightweight context: metadata + README + file listing (no file contents)."""
    lines: list[str] = [
        f"Repository: {info.owner}/{info.repo}",
        f"Description: {info.description or 'N/A'}",
        f"Primary language: {info.language or 'N/A'}",
        f"Stars: {info.stars}",
        "",
    ]
    if info.readme:
        lines += ["--- README ---", info.readme[:3000], ""]
    lines.append(f"--- File tree ({len(info.file_paths)} readable files) ---")
    lines.extend(info.file_paths)
    return "\n".join(lines)


async def fetch_single_file(owner: str, repo: str, path: str) -> str:
    """Fetch the content of a single file from GitHub."""
    headers = _build_headers()
    async with httpx.AsyncClient(timeout=20.0) as client:
        content = await _fetch_file_content(client, owner, repo, path, headers)
    logger.debug("[GitHub] fetch_single_file '%s': %d chars", path, len(content))
    return content


async def fetch_repo_context(repo_url: str, message: str = "") -> str:
    logger.debug("[GitHub] fetch_repo_context called | repo_url=%s | message=%r", repo_url, message)
    info = await fetch_repo_info(repo_url)

    if message:
        hints = _extract_file_hints(message, info.all_paths)
        logger.debug("[GitHub] Hint files resolved from message: %s", hints)
        if hints:
            headers = _build_headers()
            async with httpx.AsyncClient(timeout=20.0) as client:
                for path in hints:
                    content = await _fetch_file_content(
                        client, info.owner, info.repo, path, headers,
                        max_chars=_MAX_CHARS_PRIORITY,
                    )
                    if content:
                        info.file_contents[path] = content
                        logger.debug("[GitHub] Hint file '%s' added: %d chars", path, len(content))

    context = build_context(info)
    logger.debug(
        "[GitHub] Final context built | files_in_context=%d | total_chars=%d\n%s\n%s",
        len(info.file_contents),
        len(context),
        "=" * 60,
        context[:2000],
    )
    return context
