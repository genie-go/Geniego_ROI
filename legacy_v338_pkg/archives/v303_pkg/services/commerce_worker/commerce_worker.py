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

LAST_CALL_TS = {}  # (tenant,channel)->epoch seconds


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

def throttle(cur, tenant: str, channel: str, scope: str = "default"):
    """Best-effort RPS throttling (single-process) using DB-configured limits.
    For real production, implement distributed token bucket (e.g., redis) or DB state table.
    """
    cur.execute("SELECT rps, burst FROM commerce_rate_limits WHERE tenant_id=%s AND channel=%s AND scope=%s", (tenant, channel, scope))
    row = cur.fetchone()
    rps = int(row[0]) if row else 2
    min_interval = 1.0 / max(1, rps)
    key = (tenant, channel, scope)
    last = LAST_CALL_TS.get(key, 0.0)
    nowt = time.time()
    wait = (last + min_interval) - nowt
    if wait > 0:
        time.sleep(min(1.0, wait))
    LAST_CALL_TS[key] = time.time()

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

def upsert_channel_tokens(cur, tenant_id: str, channel: str, tokens: dict):
    if not tokens:
        return
    cur.execute(
        """INSERT INTO commerce_channel_tokens(tenant_id, channel, access_token, refresh_token, expires_at, token_json, updated_at)
           VALUES (%s,%s,%s,%s,%s,%s, now())
           ON CONFLICT (tenant_id, channel) DO UPDATE SET
             access_token=EXCLUDED.access_token,
             refresh_token=COALESCE(EXCLUDED.refresh_token, commerce_channel_tokens.refresh_token),
             expires_at=EXCLUDED.expires_at,
             token_json=EXCLUDED.token_json,
             updated_at=now()
        """,
        (
            tenant_id,
            channel,
            tokens.get("access_token"),
            tokens.get("refresh_token"),
            tokens.get("token_expires_at"),
            json.dumps(tokens, ensure_ascii=False)[:4000],
        ),
    )

def record_order_events_and_apply_reservations(cur, tenant_id: str, channel: str, events: list):
    """Record events; apply simplistic reservation logic:
    - created: reserve qty (decrement available in commerce_inventory)
    - cancelled/returned: release reservation (increment available)
    """
    for ev in events or []:
        et = ev.get("event_type") or "created"
        occ = ev.get("occurred_at") or datetime.now(timezone.utc).isoformat()
        order = ev.get("order") or {}
        oid = order.get("order_id") or order.get("orderId") or order.get("id")
        if not oid:
            continue
        event_id = f"{tenant_id}:{channel}:{oid}:{et}:{occ}"
        cur.execute(
            """INSERT INTO commerce_order_events(event_id, tenant_id, channel, order_id, event_type, occurred_at, payload_json)
                 VALUES (%s,%s,%s,%s,%s,%s,%s)
                 ON CONFLICT (event_id) DO NOTHING""",
            (event_id, tenant_id, channel, oid, et, occ, json.dumps(ev, ensure_ascii=False)[:4000]),
        )
        items = order.get("items") or []
        # items expected: [{sku, qty}]
        if et == "created":
            for it in items:
                sku = it.get("sku") or it.get("sellerSku") or it.get("itemId")
                qty = int(it.get("qty") or it.get("quantity") or 0)
                if not sku or qty <= 0:
                    continue
                rid = f"{tenant_id}:{channel}:{oid}:{sku}"
                cur.execute(
                    """INSERT INTO commerce_inventory_reservations(reservation_id, tenant_id, channel, order_id, sku, qty, status)
                         VALUES (%s,%s,%s,%s,%s,%s,'reserved')
                         ON CONFLICT (reservation_id) DO NOTHING""",
                    (rid, tenant_id, channel, oid, sku, qty),
                )
                # decrement available qty in inventory table (best-effort)
                cur.execute(
                    """UPDATE commerce_inventory
                         SET qty = GREATEST(0, qty - %s), updated_at=now()
                         WHERE tenant_id=%s AND sku=%s""",
                    (qty, tenant_id, sku),
                )
        elif et in ("cancelled","returned"):
            for it in items:
                sku = it.get("sku") or it.get("sellerSku") or it.get("itemId")
                qty = int(it.get("qty") or it.get("quantity") or 0)
                if not sku or qty <= 0:
                    continue
                rid = f"{tenant_id}:{channel}:{oid}:{sku}"
                cur.execute(
                    """UPDATE commerce_inventory_reservations
                         SET status='released', updated_at=now()
                         WHERE reservation_id=%s AND status='reserved'""",
                    (rid,),
                )
                cur.execute(
                    """UPDATE commerce_inventory
                         SET qty = qty + %s, updated_at=now()
                         WHERE tenant_id=%s AND sku=%s""",
                    (qty, tenant_id, sku),
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
                        throttle(cur, tenant, channel)
                        resp = http.post("%s/v1/execute" % CONNECTORS_URL, json=req_body, timeout=40)
                        out = resp.json() if resp.content else {}
                        ok = bool(out.get("ok")) and resp.status_code < 400
                        err_msg = (out.get("error") or out.get("warning") or "")
                    except Exception as e:
                        ok = False
                        err_msg = str(e)

                    
if ok:
                        applied = out.get("applied") or {}
                        # persist refreshed tokens if provided by provider
                        if isinstance(applied.get("tokens"), dict):
                            upsert_channel_tokens(cur, tenant, channel, applied.get("tokens") or {})

                        if kind == "products":
                            prods = applied.get("products")
                            if prods is None:
                                prods = payload.get("products") or []
                            if isinstance(prods, dict): prods = [prods]
                            upsert_products(cur, tenant, prods)
                        elif kind == "inventory":
                            inv = applied.get("inventory")
                            if inv is None:
                                inv = payload.get("inventory") or []
                            if isinstance(inv, dict): inv = [inv]
                            upsert_inventory(cur, tenant, inv)
                        elif kind == "orders":
                            orders = applied.get("orders") or []
                            upsert_orders(cur, tenant, channel, orders)
                            # Optional order event stream for reservation/adjust flows
                            events = applied.get("order_events") or []
                            if isinstance(events, dict): events = [events]
                            if events:
                                record_order_events_and_apply_reservations(cur, tenant, channel, events)

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
