import json
import logging
import re
from collections.abc import AsyncGenerator, Awaitable, Callable

import anthropic

from config import settings

logger = logging.getLogger(__name__)

_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

# ── Prompt templates ────────────────────────────────────────────────────────

_QUERY_TEMPLATE = """\
You are a code assistant. Answer the developer's question using ONLY the repository context below. Do not use external knowledge or invent information not present in the context. If the context does not contain enough information to answer, say so.

--- Repository Context ---
{context}
--- End Context ---

Question: {question}

Answer:"""

_CHAT_TEMPLATE = """\
You are a code assistant helping a developer understand a GitHub repository. Use ONLY the information from the Repository Context below. Do not use external knowledge or invent details not in the context. If the answer is not in the context, say so.

--- Repository Context ---
{context}
--- End Context ---

{history}User: {message}
Assistant:"""

_ANALYZE_TEMPLATE = """\
You are a code assistant. Analyze this GitHub repository using ONLY the context below. Base your summary strictly on the provided context; do not add external knowledge.

--- Repository Context ---
{context}
--- End Context ---

Provide a concise analysis covering:
1. What this project does (2-3 sentences)
2. Main technologies and frameworks used
3. Key architectural patterns or structure
4. How a developer would get started

Be brief and practical."""

_SECURITY_TEMPLATE = """\
You are a security-focused code reviewer. Analyze the repository for security issues using ONLY the context below. Base findings only on code and patterns present in the context.

--- Repository Context ---
{context}
--- End Context ---

Identify and list:
1. Potential security vulnerabilities (e.g. hardcoded secrets, SQL injection risks, insecure dependencies, exposed endpoints)
2. Security best-practice violations
3. Data exposure or privacy risks
4. Recommended fixes for each finding

Format each finding as:
[SEVERITY: HIGH|MEDIUM|LOW] <Issue title>
Description: <brief explanation>
Recommendation: <what to do>

If no issues are found, say "No significant security issues detected."
Be specific and practical."""

_EXPLAIN_TEMPLATE = """\
You are a code assistant. Explain the following code using ONLY the Repository Context below. Do not infer or add information that is not in the context.

--- Repository Context ---
{context}
--- End Context ---

File/Code to explain: {file_path}

Provide:
1. What this file/code does (purpose and responsibility)
2. Key functions, classes, or logic explained simply
3. How it fits into the larger project
4. Any important patterns or gotchas a developer should know

Be clear and approachable."""

_AGENTIC_TEMPLATE = """\
You are a code assistant helping a developer understand a GitHub repository.
You have access to one tool:
  FETCH_FILE(path) — retrieves the content of a specific file from the repository

When you need a file to answer the question, respond with EXACTLY this (nothing else):
  FETCH_FILE(relative/path/to/file)

Rules:
- Use FETCH_FILE only when the file content is required to answer.
- You may call FETCH_FILE at most {max_calls} time(s).
- When you have enough information, provide your complete answer directly.
- Do NOT include FETCH_FILE in your final answer.
- Base your answer only on what is provided below and any files you fetch.

--- Repository Overview ---
{general_context}
--- End Overview ---

{history}User: {message}
Assistant:"""


# ── Helpers ──────────────────────────────────────────────────────────────────

def _format_history(history: list[dict]) -> str:
    if not history:
        return ""
    lines: list[str] = []
    for msg in history[-10:]:
        role = "User" if msg["role"] == "user" else "Assistant"
        lines.append(f"{role}: {msg['content']}")
    return "Previous conversation:\n" + "\n".join(lines) + "\n\n"


# ── Internal generators ──────────────────────────────────────────────────────

async def _generate(prompt: str, num_ctx: int = 4096) -> str:
    message = await _client.messages.create(
        model=settings.anthropic_model,
        max_tokens=num_ctx,
        messages=[{"role": "user", "content": prompt}],
    )
    return next((b.text for b in message.content if b.type == "text"), "No response received from model.")


async def _stream_generate(prompt: str, num_ctx: int = 4096) -> AsyncGenerator[str, None]:
    async with _client.messages.stream(
        model=settings.anthropic_model,
        max_tokens=num_ctx,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        async for text in stream.text_stream:
            yield text


# ── Public API ────────────────────────────────────────────────────────────────

async def summarize_repo(context: str) -> str:
    return await _generate(_ANALYZE_TEMPLATE.format(context=context))


async def scan_security(context: str) -> str:
    return await _generate(_SECURITY_TEMPLATE.format(context=context))


async def explain_code(context: str, file_path: str) -> str:
    return await _generate(_EXPLAIN_TEMPLATE.format(context=context, file_path=file_path))


async def agentic_chat(
    general_context: str,
    message: str,
    history: list[dict],
    fetch_file_fn: Callable[[str], Awaitable[str]],
    max_tool_calls: int = 3,
) -> str:
    """
    Agentic Q&A loop:
    1. Send general repo overview + history + question to the LLM.
    2. If the LLM responds with FETCH_FILE(path), fetch that file and re-prompt.
    3. Repeat up to max_tool_calls times, then return the final answer.
    """
    base_prompt = _AGENTIC_TEMPLATE.format(
        max_calls=max_tool_calls,
        general_context=general_context,
        history=_format_history(history),
        message=message,
    )

    accumulated = ""

    for call_idx in range(max_tool_calls):
        response = await _generate(base_prompt + accumulated, num_ctx=8192)
        logger.debug("[Agent] Round %d response: %r", call_idx + 1, response[:300])

        match = re.match(r"^\s*FETCH_FILE\(([^)]+)\)\s*$", response, re.IGNORECASE)
        if not match:
            return response

        path = match.group(1).strip()
        logger.debug("[Agent] Tool call %d: FETCH_FILE(%s)", call_idx + 1, path)
        content = await fetch_file_fn(path)
        accumulated += (
            f" FETCH_FILE({path})\n"
            f"[File: {path}]\n"
            f"{content or '(file not found or empty)'}\n"
            f"[End File]\n\n"
        )

    logger.debug("[Agent] Exhausted tool calls, generating final answer")
    return await _generate(base_prompt + accumulated, num_ctx=8192)


async def stream_agentic_chat(
    general_context: str,
    message: str,
    history: list[dict],
    fetch_file_fn: Callable[[str], Awaitable[str]],
    max_tool_calls: int = 3,
) -> AsyncGenerator[dict, None]:
    """
    Streaming version of the agentic loop.
    Yields dicts:  {"token": str}  for answer tokens
                   {"status": str} for tool-use progress updates
    Tool-use rounds run non-streaming so the full response can be inspected;
    the final answer is streamed token by token.
    """
    base_prompt = _AGENTIC_TEMPLATE.format(
        max_calls=max_tool_calls,
        general_context=general_context,
        history=_format_history(history),
        message=message,
    )

    accumulated = ""

    for call_idx in range(max_tool_calls):
        response = await _generate(base_prompt + accumulated, num_ctx=8192)
        logger.debug("[Agent] Stream round %d: %r", call_idx + 1, response[:300])

        match = re.match(r"^\s*FETCH_FILE\(([^)]+)\)\s*$", response, re.IGNORECASE)
        if not match:
            yield {"token": response}
            return

        path = match.group(1).strip()
        logger.debug("[Agent] Stream tool call %d: FETCH_FILE(%s)", call_idx + 1, path)
        yield {"status": f"Fetching file: {path}"}
        content = await fetch_file_fn(path)
        accumulated += (
            f" FETCH_FILE({path})\n"
            f"[File: {path}]\n"
            f"{content or '(file not found or empty)'}\n"
            f"[End File]\n\n"
        )

    logger.debug("[Agent] Streaming final answer after tool calls")
    async for token in _stream_generate(base_prompt + accumulated, num_ctx=8192):
        yield {"token": token}


_STRUCTURED_SECURITY_TEMPLATE = """\
You are a security-focused code reviewer. Analyze the repository for security vulnerabilities \
using ONLY the context below.

--- Repository Context ---
{context}
--- End Context ---

{focus_section}
Return findings as a JSON array. Each element must have exactly these fields:
  "severity": "HIGH", "MEDIUM", or "LOW"
  "file_path": the relevant file path string, or null
  "title": short issue title (10 words or fewer)
  "description": clear explanation of the issue
  "recommendation": concrete fix

Return ONLY valid JSON — no markdown, no prose, no code fences:
[
  {{"severity": "HIGH", "file_path": "path/to/file.py", "title": "...", "description": "...", "recommendation": "..."}}
]

If no issues are found, return: []"""

_STRUCTURED_TECHNICAL_TEMPLATE = """\
You are a senior software engineer performing a technical code review. Find bugs, logic errors, \
and code quality issues using ONLY the context below.

--- Repository Context ---
{context}
--- End Context ---

{focus_section}
Return findings as a JSON array. Each element must have exactly these fields:
  "severity": "HIGH" (crash or data-loss bug), "MEDIUM" (logic error or bad practice), or "LOW" (minor issue)
  "file_path": the relevant file path string, or null
  "title": short issue title (10 words or fewer)
  "description": clear explanation of the issue
  "recommendation": concrete fix

Return ONLY valid JSON — no markdown, no prose, no code fences:
[
  {{"severity": "MEDIUM", "file_path": "path/to/file.py", "title": "...", "description": "...", "recommendation": "..."}}
]

If no issues are found, return: []"""

_COMPARE_TEMPLATE = """\
You are a senior software architect assessing whether two repositories are a good technical fit.

--- Repository A: {name_a} ---
{context_a}
--- End Repository A ---

--- Repository B: {name_b} ---
{context_b}
--- End Repository B ---

{goals_section}
Return a JSON object with exactly these fields:
  "verdict": one clear sentence on overall fit between the two projects
  "sections": array of objects, each with "title" (string) and "content" (string), covering:
    1. Language & Stack Compatibility
    2. Architecture Fit
    3. Dependency & Integration Risk
    4. Maturity & Activity
    5. Recommendation

Return ONLY valid JSON — no markdown, no prose, no code fences:
{{"verdict": "...", "sections": [{{"title": "...", "content": "..."}}]}}"""


# ── JSON extraction helper ────────────────────────────────────────────────────

def _extract_json(text: str):
    """Extract the first JSON array or object from an LLM response."""
    stripped = text.strip()
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        pass
    # Strip markdown code fences
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", stripped)
    if fence:
        try:
            return json.loads(fence.group(1))
        except json.JSONDecodeError:
            pass
    # Try extracting first JSON array or object
    for pattern in (r"(\[[\s\S]*\])", r"(\{[\s\S]*\})"):
        m = re.search(pattern, stripped)
        if m:
            try:
                return json.loads(m.group(1))
            except json.JSONDecodeError:
                pass
    return None


# ── Public API — structured review + compare ─────────────────────────────────

async def scan_security_structured(context: str, focus: str = "") -> list[dict]:
    focus_section = f"Focus area: {focus}\n" if focus else ""
    raw = await _generate(
        _STRUCTURED_SECURITY_TEMPLATE.format(context=context, focus_section=focus_section),
        num_ctx=4096,
    )
    result = _extract_json(raw)
    if isinstance(result, list):
        return result
    logger.warning("[Ollama] security_structured: could not parse JSON, raw=%r", raw[:300])
    return []


async def review_technical_structured(context: str, focus: str = "") -> list[dict]:
    focus_section = f"Focus area: {focus}\n" if focus else ""
    raw = await _generate(
        _STRUCTURED_TECHNICAL_TEMPLATE.format(context=context, focus_section=focus_section),
        num_ctx=4096,
    )
    result = _extract_json(raw)
    if isinstance(result, list):
        return result
    logger.warning("[Ollama] technical_structured: could not parse JSON, raw=%r", raw[:300])
    return []


async def compare_repos_llm(
    context_a: str,
    context_b: str,
    name_a: str,
    name_b: str,
    goals: str = "",
) -> dict:
    goals_section = f"Comparison goals: {goals}\n" if goals else ""
    raw = await _generate(
        _COMPARE_TEMPLATE.format(
            context_a=context_a,
            context_b=context_b,
            name_a=name_a,
            name_b=name_b,
            goals_section=goals_section,
        ),
        num_ctx=8192,
    )
    result = _extract_json(raw)
    if isinstance(result, dict) and "verdict" in result:
        return result
    logger.warning("[Ollama] compare_repos: could not parse JSON, raw=%r", raw[:300])
    return {"verdict": raw[:500], "sections": []}


async def check_connection() -> bool:
    try:
        await _client.messages.create(
            model=settings.anthropic_model,
            max_tokens=10,
            messages=[{"role": "user", "content": "hi"}],
        )
        return True
    except Exception:
        return False
