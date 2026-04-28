import json
import os
import time
import random
from datetime import datetime, timedelta

import psycopg2
import psycopg2.extras
import requests


PGHOST = os.getenv("PGHOST", "postgres")
PGPORT = int(os.getenv("PGPORT", "5432"))
PGDATABASE = os.getenv("POSTGRES_DB", "genie")
PGUSER = os.getenv("POSTGRES_USER", "genie")
PGPASSWORD = os.getenv("POSTGRES_PASSWORD", "genie")

CONNECTORS_URL = os.getenv("CONNECTORS_URL", "http://connectors:9100")

POLL_MS = int(os.getenv("COMMERCE_POLL_MS", "800"))


def dbconn():
    return psycopg2.connect(
        host=PGHOST,
        port=PGPORT,
        dbname=PGDATABASE,
        user=PGUSER,
        password=PGPASSWORD,
    )


def backoff_seconds(attempt: int) -> int:
    # exponential backoff with jitter, capped
    base = min(60, 2 ** min(attempt, 8))
    return int(base + random.random() * 2)


def provider_action(kind: str) -> str:
    return {
        "products": "upsert_products",
        "prices": "update_prices",
        "orders": "fetch_orders",
        "inventory": "sync_inventory",
    }.get(kind, "noop")


def get_channel_creds(cur, tenant: str, channel: str):
    cur.execute(
        "SELECT creds_json FROM commerce_channel_credentials WHERE tenant_id=%s AND channel=%s",
        (tenant, channel),
    )
    row = cur.fetchone()
    if not row:
        return {}
    try:
        return json.loads(row[0])
    except Exception:
        return {}


def upsert_products(cur, tenant: str, products):
    for p in products or []:
        sku = (p.get("sku") or "").strip()
        if not sku:
            continue
        title = p.get("title") or ""
        desc = p.get("description") or ""
        price = float(p.get("price") or 0.0)
        currency = p.get("currency") or "USD"
        cur.execute(
            """
            INSERT INTO commerce_products(tenant_id, sku, title, description, price, currency, updated_at)
            VALUES(%s,%s,%s,%s,%s,%s,now())
            ON CONFLICT (tenant_id, sku) DO UPDATE
              SET title=EXCLUDED.title,
                  description=EXCLUDED.description,
                  price=EXCLUDED.price,
                  currency=EXCLUDED.currency,
                  updated_at=now()
            """,
            (tenant, sku, title, desc, price, currency),
        )


def upsert_inventory(cur, tenant: str, inv):
    for it in inv or []:
        sku = (it.get("sku") or "").strip()
        if not sku:
            continue
        on_hand = int(it.get("on_hand") or 0)
        reserved = int(it.get("reserved") or 0)
        cur.execute(
            """
            INSERT INTO commerce_inventory(tenant_id, sku, on_hand, reserved, updated_at)
            VALUES(%s,%s,%s,%s,now())
            ON CONFLICT (tenant_id, sku) DO UPDATE
              SET on_hand=EXCLUDED.on_hand,
                  reserved=EXCLUDED.reserved,
                  updated_at=now()
            """,
            (tenant, sku, on_hand, reserved),
        )


def upsert_orders(cur, tenant: str, channel: str, orders):
    for o in orders or []:
        order_id = (o.get("order_id") or "").strip()
        if not order_id:
            continue
        ordered_at = o.get("ordered_at")
        buyer_id = o.get("buyer_id")
        total_amount = float(o.get("total_amount") or 0.0)
        currency = o.get("currency") or "USD"
        raw_json = json.dumps(o, ensure_ascii=False)
        cur.execute(
            """
            INSERT INTO commerce_orders(tenant_id, channel, order_id, ordered_at, buyer_id, total_amount, currency, raw_json)
            VALUES(%s,%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (tenant_id, channel, order_id) DO UPDATE
              SET raw_json=EXCLUDED.raw_json,
                  total_amount=EXCLUDED.total_amount,
                  currency=EXCLUDED.currency
            """,
            (tenant, channel, order_id, ordered_at, buyer_id, total_amount, currency, raw_json),
        )


def set_sync_status(cur, tenant: str, run_id: str, status: str, msg: str = ""):
    cur.execute(
        """
        UPDATE commerce_sync_runs
          SET status=%s,
              finished_at=CASE WHEN %s IN ('success','failed') THEN now() ELSE finished_at END,
              message=CASE WHEN %s<>'' THEN %s ELSE message END
        WHERE tenant_id=%s AND run_id=%s
        """,
        (status, status, msg, msg, tenant, run_id),
    )


def run():
    print("[commerce_worker] starting")
    conn = dbconn()
    conn.autocommit = False
    http = requests.Session()

    while True:
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT tenant_id, job_id, channel, kind, payload_json, attempt, max_attempts
                    FROM commerce_jobs
                    WHERE status='pending' AND next_run_at <= now()
                    ORDER BY created_at ASC
                    FOR UPDATE SKIP LOCKED
                    LIMIT 1
                    """
                )
                job = cur.fetchone()
                if not job:
                    conn.commit()
                    time.sleep(POLL_MS / 1000.0)
                    continue

                tenant = job["tenant_id"]
                job_id = job["job_id"]
                channel = job["channel"].lower()
                kind = job["kind"].lower()
                attempt = int(job["attempt"])
                max_attempts = int(job["max_attempts"])
                payload = {}
                try:
                    payload = json.loads(job["payload_json"])
                except Exception:
                    payload = {}

                # mark running
                cur.execute(
                    "UPDATE commerce_jobs SET status='running', started_at=now(), attempt=attempt+1 WHERE tenant_id=%s AND job_id=%s",
                    (tenant, job_id),
                )

                run_id = payload.get("run_id")
                if run_id:
                    set_sync_status(cur, tenant, run_id, "running", "")

                creds = get_channel_creds(cur, tenant, channel)
                action = provider_action(kind)
                req_body = {
                    "provider": channel,
                    "action": action,
                    "payload": {
                        "creds": creds,
                        "kind": kind,
                        "data": payload,
                    },
                }

                ok = False
                message = ""
                data_out = None
                try:
                    resp = http.post(f"{CONNECTORS_URL}/v1/execute", json=req_body, timeout=20)
                    out = resp.json() if resp.content else {}
                    ok = bool(out.get("ok")) and resp.status_code < 400
                    message = out.get("message") or ""
                    data_out = out.get("data")
                except Exception as e:
                    ok = False
                    message = str(e)

                if ok:
                    # Apply local DB updates based on kind
                    if kind == "products":
                        # Local upsert from submitted payload (source of truth)
                        upsert_products(cur, tenant, payload.get("products"))
                    elif kind == "inventory":
                        upsert_inventory(cur, tenant, payload.get("inventory"))
                    elif kind == "orders":
                        upsert_orders(cur, tenant, channel, data_out or [])

                    cur.execute(
                        "UPDATE commerce_jobs SET status='success', finished_at=now(), last_error=NULL WHERE tenant_id=%s AND job_id=%s",
                        (tenant, job_id),
                    )
                    if run_id:
                        set_sync_status(cur, tenant, run_id, "success", message or "ok")
                    conn.commit()
                else:
                    next_attempt = attempt + 1
                    if next_attempt >= max_attempts:
                        cur.execute(
                            "UPDATE commerce_jobs SET status='failed', finished_at=now(), last_error=%s WHERE tenant_id=%s AND job_id=%s",
                            (message[:800], tenant, job_id),
                        )
                        if run_id:
                            set_sync_status(cur, tenant, run_id, "failed", message[:800])
                        conn.commit()
                    else:
                        delay = backoff_seconds(next_attempt)
                        cur.execute(
                            "UPDATE commerce_jobs SET status='pending', next_run_at=now()+(%s||' seconds')::interval, last_error=%s WHERE tenant_id=%s AND job_id=%s",
                            (delay, message[:800], tenant, job_id),
                        )
                        if run_id:
                            set_sync_status(cur, tenant, run_id, "queued", f"retry in {delay}s")
                        conn.commit()

        except Exception as e:
            try:
                conn.rollback()
            except Exception:
                pass
            print(f"[commerce_worker] error: {e}")
            time.sleep(1.0)


if __name__ == "__main__":
    run()
