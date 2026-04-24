import asyncio
import json
import logging
from datetime import datetime, timezone

from aiokafka import AIOKafkaProducer

from config import settings

logger = logging.getLogger(__name__)

_producer: AIOKafkaProducer | None = None
_retry_task: asyncio.Task | None = None


async def _connect() -> bool:
    global _producer
    try:
        producer = AIOKafkaProducer(
            bootstrap_servers=settings.kafka_bootstrap_servers,
            request_timeout_ms=5000,
        )
        await asyncio.wait_for(producer.start(), timeout=10.0)
        _producer = producer
        logger.info("Kafka producer connected to %s", settings.kafka_bootstrap_servers)
        return True
    except Exception as exc:
        logger.warning("Kafka connection attempt failed: %s", exc)
        _producer = None
        return False


_MAX_RETRIES = 5


async def _retry_loop() -> None:
    delay = 5
    for attempt in range(1, _MAX_RETRIES + 1):
        await asyncio.sleep(delay)
        if _producer is not None:
            return
        logger.info("Retrying Kafka connection (attempt %d/%d)...", attempt, _MAX_RETRIES)
        if await _connect():
            return
        delay = min(delay * 2, 60)
    logger.warning(
        "Kafka unreachable after %d attempts — event streaming disabled. "
        "To enable Kafka set KAFKA_BOOTSTRAP_SERVERS to an external broker "
        "(e.g. Upstash, Confluent Cloud), or leave it empty to disable Kafka.",
        _MAX_RETRIES,
    )


def _is_local_hostname(bootstrap_servers: str) -> bool:
    """Return True when every host in the bootstrap list is a bare Docker-compose
    service name (no dots) that will never resolve outside of a Docker network."""
    for server in bootstrap_servers.split(","):
        host = server.strip().split(":")[0]
        if "." in host or host in ("localhost", "127.0.0.1", "::1"):
            return False
    return True


async def init_kafka() -> None:
    global _retry_task
    if not settings.kafka_bootstrap_servers:
        logger.info("KAFKA_BOOTSTRAP_SERVERS not set — Kafka disabled")
        return
    if _is_local_hostname(settings.kafka_bootstrap_servers):
        logger.warning(
            "KAFKA_BOOTSTRAP_SERVERS=%r looks like a Docker-internal hostname. "
            "Kafka is disabled in this environment. "
            "Set KAFKA_BOOTSTRAP_SERVERS to an external broker (e.g. Upstash, Confluent Cloud) "
            "or leave it empty to silence this warning.",
            settings.kafka_bootstrap_servers,
        )
        return
    connected = await _connect()
    if not connected:
        logger.warning(
            "Kafka not available at startup (bootstrap: %s) — will retry %d times in background",
            settings.kafka_bootstrap_servers,
            _MAX_RETRIES,
        )
        _retry_task = asyncio.create_task(_retry_loop())


async def close_kafka() -> None:
    global _producer, _retry_task
    if _retry_task is not None and not _retry_task.done():
        _retry_task.cancel()
        _retry_task = None
    if _producer is not None:
        await _producer.stop()
        _producer = None


async def publish_interaction(record: dict) -> None:
    if _producer is None:
        return
    payload = json.dumps(record, default=str).encode("utf-8")
    await _producer.send_and_wait(settings.kafka_topic, payload)


def is_connected() -> bool:
    return _producer is not None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def emit_chat_request(repo_url: str, message: str, model: str) -> None:
    await publish_interaction({
        "event_type": "chat_request",
        "repo_url": repo_url,
        "user_message": message,
        "model": model,
        "timestamp": _now(),
    })


async def emit_chat_response(repo_url: str, message: str, reply: str, model: str) -> None:
    await publish_interaction({
        "event_type": "chat_response",
        "repo_url": repo_url,
        "user_message": message,
        "ai_response": reply,
        "model": model,
        "timestamp": _now(),
    })


async def emit_repo_analysis(repo_url: str, summary: str, model: str) -> None:
    await publish_interaction({
        "event_type": "repo_analysis",
        "repo_url": repo_url,
        "ai_response": summary,
        "model": model,
        "timestamp": _now(),
    })


async def emit_security_scan(repo_url: str, finding_count: int, has_high: bool, model: str) -> None:
    await publish_interaction({
        "event_type": "security_scan",
        "repo_url": repo_url,
        "finding_count": finding_count,
        "has_high_severity": has_high,
        "model": model,
        "timestamp": _now(),
    })
