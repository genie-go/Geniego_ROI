import json
from typing import Dict, Any, Optional
from kafka import KafkaConsumer, TopicPartition
from sqlalchemy.orm import Session
from .config import settings
from .kafka_pub import publish
from .models import DlqOffset

def _get_offset(db: Session, tenant_id: str, partition: int) -> DlqOffset:
    row = db.query(DlqOffset).filter(DlqOffset.tenant_id==tenant_id, DlqOffset.partition==partition).first()
    if row is None:
        row = DlqOffset(tenant_id=tenant_id, partition=partition, last_offset=0)
        db.add(row); db.commit()
    return row

def requeue_from_dlq(
    db: Session,
    tenant_id: str,
    limit: int = 50,
    dry_run: bool = True,
    kind: Optional[str] = None,
    error_contains: Optional[str] = None,
    idempotency_prefix: Optional[str] = None,
) -> Dict[str, Any]:
    consumer = KafkaConsumer(
        settings.kafka_dlq_topic,
        bootstrap_servers=settings.kafka_bootstrap,
        enable_auto_commit=False,
        auto_offset_reset="earliest",
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        key_deserializer=lambda k: (k.decode("utf-8") if k else ""),
    )

    parts = consumer.partitions_for_topic(settings.kafka_dlq_topic) or {0}
    tps = [TopicPartition(settings.kafka_dlq_topic, p) for p in sorted(parts)]
    consumer.assign(tps)

    offsets = {tp.partition: _get_offset(db, tenant_id, tp.partition).last_offset for tp in tps}
    for tp in tps:
        consumer.seek(tp, int(offsets[tp.partition]))

    moved_total = 0
    moved_by_partition = {tp.partition: 0 for tp in tps}
    last_seen = dict(offsets)
    samples = []

    def _match(v: dict) -> bool:
        if v.get("tenant_id") != tenant_id:
            return False
        if kind and (v.get("kind") or "") != kind:
            return False
        if idempotency_prefix and not (v.get("idempotency_key") or "").startswith(idempotency_prefix):
            return False
        if error_contains and error_contains not in (v.get("error") or ""):
            return False
        return True

    for msg in consumer:
        val = msg.value
        part = msg.partition
        last_seen[part] = msg.offset + 1
        if not _match(val):
            continue

        k = val.get("kind","unknown")
        idem = val.get("idempotency_key") or msg.key or f"dlq:{part}:{msg.offset}"
        payload = val.get("payload", {})
        if not dry_run:
            publish(settings.kafka_topic, k, tenant_id, idem, payload)

        moved_total += 1
        moved_by_partition[part] += 1
        if len(samples) < 5:
            samples.append({"partition": part, "offset": msg.offset, "kind": k, "idempotency_key": idem, "error": (val.get("error") or "")[:200]})
        if moved_total >= limit:
            break

    for part, off in last_seen.items():
        row = _get_offset(db, tenant_id, int(part))
        row.last_offset = int(off)
        db.add(row)
    db.commit()
    consumer.close()
    return {"moved": moved_total, "dry_run": dry_run, "filters": {"kind": kind, "error_contains": error_contains, "idempotency_prefix": idempotency_prefix},
            "moved_by_partition": moved_by_partition, "new_offsets": last_seen, "samples": samples}
