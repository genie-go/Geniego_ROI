import json
from kafka import KafkaConsumer
from sqlalchemy.exc import IntegrityError
from .config import settings
from .db import engine, SessionLocal, Base
from .models import JobQueue
from .celery_app import celery_app
from .kafka_pub import publish_dlq

Base.metadata.create_all(bind=engine)

def enqueue(db, tenant_id: str, idem: str, kind: str, payload: dict):
    job = JobQueue(tenant_id=tenant_id, idempotency_key=idem, kind=kind, payload_json=json.dumps(payload), status="QUEUED")
    db.add(job)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return {"enqueued": False, "reason": "duplicate"}
    celery_app.send_task("tasks.execute_event", args=[tenant_id, idem])
    return {"enqueued": True, "job_id": job.id}

def main():
    consumer = KafkaConsumer(
        settings.kafka_topic,
        bootstrap_servers=settings.kafka_bootstrap,
        group_id=settings.kafka_group,
        enable_auto_commit=True,
        auto_offset_reset="earliest",
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        key_deserializer=lambda k: (k.decode("utf-8") if k else ""),
    )
    print("Kafka consumer started:", settings.kafka_topic, "DLQ:", settings.kafka_dlq_topic)
    for msg in consumer:
        val = msg.value
        tenant_id = val.get("tenant_id") or "unknown"
        kind = val.get("kind") or "unknown"
        idem = val.get("idempotency_key") or msg.key or f"kafka:{msg.topic}:{msg.partition}:{msg.offset}"
        payload = val.get("payload", {})
        try:
            with SessionLocal() as db:
                res = enqueue(db, tenant_id, idem, kind, payload)
            print("Consumed:", kind, idem, res)
        except Exception as e:
            publish_dlq(kind, tenant_id, idem, payload, str(e)[:1000])
            print("DLQ published:", kind, idem, str(e)[:200])

if __name__ == "__main__":
    main()
