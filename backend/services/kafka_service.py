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


async def _retry_loop() -> None:
    delay = 5
    while True:
        await asyncio.sleep(delay)
        if _producer is not None:
            return
        logger.info("Retrying Kafka connection...")
        if await _connect():
            return
        delay = min(delay * 2, 60)


async def init_kafka() -> None:
    global _retry_task
    if not settings.kafka_bootstrap_servers:
        logger.info("KAFKA_BOOTSTRAP_SERVERS not configured — Kafka disabled")
        return
    connected = await _connect()
    if not connected:
        logger.warning("Kafka not available at startup — will retry in background")
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
