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
