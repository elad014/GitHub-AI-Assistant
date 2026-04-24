import logging
import time
import uuid
from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from trace_context import request_id_var

logger = logging.getLogger(__name__)


class TracingMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        request_id = str(uuid.uuid4())[:8]
        token = request_id_var.set(request_id)

        client_ip = request.client.host if request.client else "unknown"
        start = time.monotonic()

        logger.info(
            "--> %s %s  client=%s",
            request.method,
            request.url.path,
            client_ip,
        )

        try:
            from services.db_service import write_trace
            await write_trace(
                direction="client->server",
                operation=f"{request.method} {request.url.path}",
                metadata={"client_ip": client_ip},
            )
        except Exception:
            pass

        response = await call_next(request)

        elapsed_ms = int((time.monotonic() - start) * 1000)
        logger.info(
            "<-- %d  elapsed=%dms",
            response.status_code,
            elapsed_ms,
        )

        try:
            from services.db_service import write_trace
            await write_trace(
                direction="server->client",
                operation=f"{request.method} {request.url.path}",
                status_code=response.status_code,
                elapsed_ms=elapsed_ms,
            )
        except Exception:
            pass

        response.headers["X-Request-ID"] = request_id
        request_id_var.reset(token)
        return response
