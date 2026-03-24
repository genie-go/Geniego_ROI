import json
from kafka import KafkaProducer
from .config import settings

_prod = None
def producer():
    global _prod
    if _prod is None:
        _prod = KafkaProducer(
            bootstrap_servers=settings.kafka_bootstrap,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
            key_serializer=lambda k: (k or "").encode("utf-8"),
            acks="all",
        )
    return _prod

def publish(topic: str, kind: str, tenant_id: str, idempotency_key: str, payload: dict):
    msg = {"kind": kind, "tenant_id": tenant_id, "idempotency_key": idempotency_key, "payload": payload}
    producer().send(topic, key=idempotency_key, value=msg)
    producer().flush(timeout=10)
    return True
