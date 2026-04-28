from __future__ import annotations
import json, os
from confluent_kafka import Producer
from app.core.config import settings

def _producer() -> Producer:
    return Producer({"bootstrap.servers": settings.kafka_bootstrap})

def publish(topic: str, payload: dict) -> None:
    p = _producer()
    p.produce(topic, json.dumps(payload).encode("utf-8"))
    p.flush(10)
