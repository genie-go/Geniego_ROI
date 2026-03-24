import json
import os
import time
import random
from datetime import datetime, timedelta, timezone

import psycopg2
import requests

PGHOST = os.getenv("PGHOST", "postgres")
PGPORT = int(os.getenv("PGPORT", "5432"))
PGDATABASE = os.getenv("POSTGRES_DB", "genie")
PGUSER = os.getenv("POSTGRES_USER", "genie")
PGPASSWORD = os.getenv("POSTGRES_PASSWORD", "genie")

CONNECTORS_URL = os.getenv("CONNECTORS_URL", "http://connectors:9100")
POLL_MS = int(os.getenv("COMMERCE_POLL_MS", "700"))
MAX_ATTEMPTS = int(os.getenv("COMMERCE_MAX_ATTEMPTS", "5"))

def dbconn():
    return psycopg2.connect(host=PGHOST, port=PGPORT, dbname=PGDATABASE, user=PGUSER, password=PGPASSWORD)

def utcnow():
    return datetime.now(timezone.utc)

def backoff_seconds(attempt: int) -> int:
    base = min(60, 2 ** min(attempt, 8))
    return int(base + random.random() * 2)

def get_channel_creds(cur, tenant: str, channel: str):
    cur.execute("SELECT creds_json FROM commerce_channel_credentials WHERE tenant_id=%s AND channel=%s", (tenant, channel))
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
            (tenant, sku, p.get("title") or "", p.get("description") or "", float(p.get("price") or 0.0), p.get("currency") or "USD"),
        )

def upsert_inventory(cur, tenant: str, inv):
    for it in inv or []:
        sku = (it.get("sku") or "").strip()
        if not sku:
            continue
        cur.execute(
            """
            INSERT INTO commerce_inventory(tenant_id, sku, on_hand, reserved, updated_at)
            VALUES(%s,%s,%s,%s,now())
            ON CONFLICT (tenant_id, sku) DO UPDATE
              SET on_hand=EXCLUDED.on_hand,
                  reserved=EXCLUDED.reserved,
                  updated_at=now()
            """,
            (tenant, sku, int(it.get("on_hand") or 0), int(it.get("reserved") or 0)),
        )

def upsert_orders(cur, tenant: str, channel: str, orders):
    for o in orders or []:
        order_id = (o.get("order_id") or "").strip()
        if not order_id:
            continue
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
            (tenant, channel, order_id, o.get("ordered_at"), o.get("buyer_id"), float(o.get("total_amount") or 0.0), o.get("currency") or "USD", raw_json),
        )

def update_job_status(cur, job_id: str):
    cur.execute("SELECT COUNT(*), SUM(CASE WHEN status='success' THEN 1 ELSE 0 END), SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) FROM commerce_job_items WHERE job_id=%s", (job_id,))
    total, succ, fail = cur.fetchone()
    succ = succ or 0
    fail = fail or 0
    cur.execute("SELECT COUNT(*) FROM commerce_job_items WHERE job_id=%s AND status IN ('queued','running')", (job_id,))
    pending = cur.fetchone()[0]
    if total == 0:
        return
    if pending > 0:
        cur.execute("UPDATE commerce_jobs SET status='running', started_at=COALESCE(started_at, now()) WHERE job_id=%s AND status='queued'", (job_id,))
        return
    status = "success" if fail == 0 else ("failed" if succ == 0 else "partial")
    cur.execute("UPDATE commerce_jobs SET status=%s, finished_at=now(), message=%s WHERE job_id=%s",
                (status, "items=%d success=%d failed=%d" % (total, succ, fail), job_id))

def acquire_next_item(cur):
    cur.execute(
        """
        WITH picked AS (
          SELECT i.item_id
          FROM commerce_job_items i
          JOIN commerce_jobs j ON j.job_id=i.job_id
          WHERE i.status IN ('queued','failed')
            AND i.next_run_at <= now()
            AND j.status IN ('queued','running')
          ORDER BY i.next_run_at ASC, i.seq ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        UPDATE commerce_job_items
          SET status='running', updated_at=now()
        WHERE item_id IN (SELECT item_id FROM picked)
        RETURNING item_id, job_id, payload_json, attempt;
        """
    )
    return cur.fetchone()

def main():
    http = requests.Session()
    while True:
        time.sleep(POLL_MS / 1000.0)
        try:
            with dbconn() as conn:
                conn.autocommit = False
                with conn.cursor() as cur:
                    row = acquire_next_item(cur)
                    if not row:
                        conn.commit()
                        continue
                    item_id, job_id, payload_json, attempt = row
                    cur.execute("SELECT tenant_id, channel, kind FROM commerce_jobs WHERE job_id=%s FOR UPDATE", (job_id,))
                    j = cur.fetchone()
                    if not j:
                        conn.commit()
                        continue
                    tenant, channel, kind = j

                    try:
                        payload = json.loads(payload_json or "{}")
                    except Exception:
                        payload = {}

                    creds = get_channel_creds(cur, tenant, channel)

                    action = {"products":"upsert_products","prices":"update_prices","orders":"fetch_orders","inventory":"sync_inventory"}.get(kind, "noop")
                    req_body = {
                        "execution_id": "commerce:%s:%s" % (job_id, item_id),
                        "tenant_id": tenant,
                        "channel": "commerce",
                        "provider": channel,
                        "action_type": action,
                        "payload": {"creds": creds, "kind": kind, "data": payload},
                    }

                    ok = False
                    out = {}
                    err_msg = ""
                    try:
                        resp = http.post("%s/v1/execute" % CONNECTORS_URL, json=req_body, timeout=40)
                        out = resp.json() if resp.content else {}
                        ok = bool(out.get("ok")) and resp.status_code < 400
                        err_msg = (out.get("error") or out.get("warning") or "")
                    except Exception as e:
                        ok = False
                        err_msg = str(e)

                    if ok:
                        applied = out.get("applied") or {}
                        if kind == "products":
                            prods = payload.get("products") or []
                            if isinstance(prods, dict): prods = [prods]
                            upsert_products(cur, tenant, prods)
                        elif kind == "inventory":
                            inv = payload.get("inventory") or []
                            if isinstance(inv, dict): inv = [inv]
                            upsert_inventory(cur, tenant, inv)
                        elif kind == "orders":
                            orders = applied.get("orders") or []
                            upsert_orders(cur, tenant, channel, orders)

                        cur.execute(
                            "UPDATE commerce_job_items SET status='success', last_error='', last_response_json=%s, updated_at=now() WHERE item_id=%s",
                            (json.dumps(out, ensure_ascii=False)[:4000], item_id),
                        )
                    else:
                        attempt = int(attempt or 0) + 1
                        if attempt >= MAX_ATTEMPTS:
                            cur.execute(
                                "UPDATE commerce_job_items SET status='failed', attempt=%s, last_error=%s, last_response_json=%s, updated_at=now() WHERE item_id=%s",
                                (attempt, err_msg[:1200], json.dumps(out, ensure_ascii=False)[:4000], item_id),
                            )
                        else:
                            nxt = utcnow() + timedelta(seconds=backoff_seconds(attempt))
                            cur.execute(
                                "UPDATE commerce_job_items SET status='failed', attempt=%s, next_run_at=%s, last_error=%s, last_response_json=%s, updated_at=now() WHERE item_id=%s",
                                (attempt, nxt, err_msg[:1200], json.dumps(out, ensure_ascii=False)[:4000], item_id),
                            )

                    update_job_status(cur, job_id)
                    conn.commit()
        except Exception:
            continue

if __name__ == "__main__":
    main()
