import os, json, time, datetime, hashlib
import requests
import psycopg2
import psycopg2.extras

"""
V292 Journey Executor
- Always-on event trigger processing with per-journey cursor (safe incremental consumption)
- Enrollment dedup via uq_enrollments_reentry (existing) + stable reentry keys
- Step execution dedup via journey_idempotency_keys (new in V292 migration)
- Concurrency-safe processing using SELECT ... FOR UPDATE SKIP LOCKED
"""

API_BASE = os.getenv("API_BASE", "http://gateway:8080")
TENANT_ID = os.getenv("TENANT_ID", "demo-tenant")
API_KEY = os.getenv("API_KEY", "")
POLL_SECONDS = int(os.getenv("JOURNEY_POLL_SECONDS", "5"))

# Safety overlap when reading from cursor (seconds). Keeps behavior correct under clock skew/late writes.
CURSOR_OVERLAP_SECONDS = int(os.getenv("JOURNEY_CURSOR_OVERLAP_SECONDS", "30"))

# Hard cap for each loop
MAX_EVENTS_PER_LOOP = int(os.getenv("JOURNEY_MAX_EVENTS_PER_LOOP", "5000"))
MAX_ENROLLMENTS_PER_LOOP = int(os.getenv("JOURNEY_MAX_ENROLLMENTS_PER_LOOP", "200"))

PGHOST = os.getenv("PGHOST", "postgres")
PGPORT = int(os.getenv("PGPORT", "5432"))
PGDATABASE = os.getenv("POSTGRES_DB", "genie")
PGUSER = os.getenv("POSTGRES_USER", "genie")
PGPASSWORD = os.getenv("POSTGRES_PASSWORD", "genie")


def api_post(path, payload):
    headers = {"Content-Type": "application/json", "X-Tenant-ID": TENANT_ID, "X-API-Key": API_KEY}
    r = requests.post(f"{API_BASE}{path}", headers=headers, data=json.dumps(payload), timeout=30)
    if r.status_code >= 300:
        raise RuntimeError(f"{path} {r.status_code} {r.text}")
    return r.json() if r.text else None


def connect():
    return psycopg2.connect(host=PGHOST, port=PGPORT, dbname=PGDATABASE, user=PGUSER, password=PGPASSWORD)


def stable_hash(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def get_or_init_cursor(cur, journey_id: str):
    cur.execute("""
      INSERT INTO journey_event_cursors (tenant_id, journey_id)
      VALUES (%s,%s)
      ON CONFLICT (tenant_id, journey_id) DO NOTHING
    """, (TENANT_ID, journey_id))
    cur.execute("""
      SELECT last_occurred_at, last_event_id
      FROM journey_event_cursors
      WHERE tenant_id=%s AND journey_id=%s
    """, (TENANT_ID, journey_id))
    row = cur.fetchone()
    if not row:
        return datetime.datetime(1970, 1, 1, tzinfo=datetime.timezone.utc), ""
    return row["last_occurred_at"], (row["last_event_id"] or "")


def advance_cursor(cur, journey_id: str, last_occurred_at, last_event_id: str):
    cur.execute("""
      UPDATE journey_event_cursors
      SET last_occurred_at=%s, last_event_id=%s, updated_at=now()
      WHERE tenant_id=%s AND journey_id=%s
    """, (last_occurred_at, last_event_id or "", TENANT_ID, journey_id))


def fetch_active_journeys(cur):
    cur.execute("""
      SELECT journey_id, definition_json
      FROM journeys
      WHERE tenant_id=%s AND status='ACTIVE'
    """, (TENANT_ID,))
    return cur.fetchall()


def fetch_events_for_trigger(cur, event_type: str, since_ts):
    # Deterministic ordering: occurred_at then event_id
    cur.execute("""
      SELECT event_id, contact_id, event_type, properties, occurred_at
      FROM events
      WHERE tenant_id=%s
        AND event_type=%s
        AND occurred_at >= %s
      ORDER BY occurred_at ASC, event_id ASC
      LIMIT %s
    """, (TENANT_ID, event_type, since_ts, MAX_EVENTS_PER_LOOP))
    return cur.fetchall()


def create_enrollment(cur, journey_id, contact_id, reentry_key, last_event_at=None):
    # enrollment_id is unique; reentry_key is unique per (tenant,journey) via partial unique index.
    eid = stable_hash(f"{TENANT_ID}|{journey_id}|{contact_id}|{reentry_key}|{time.time()}")[:24]
    cur.execute("""
      INSERT INTO enrollments (tenant_id, enrollment_id, journey_id, contact_id, step_index, next_run_at, status, reentry_key, state_json, last_event_at)
      VALUES (%s,%s,%s,%s,0,now(),'ACTIVE',%s,'{}'::jsonb,%s)
      ON CONFLICT DO NOTHING
    """, (TENANT_ID, eid, journey_id, contact_id, reentry_key, last_event_at))
    return eid


def fetch_due_enrollments_locked(cur):
    # Concurrency-safe: lock rows so multiple workers won't execute the same enrollment.
    cur.execute("""
      SELECT enrollment_id, journey_id, contact_id, step_index, next_run_at, COALESCE(state_json,'{}'::jsonb) AS state_json
      FROM enrollments
      WHERE tenant_id=%s AND status='ACTIVE' AND next_run_at <= now()
      ORDER BY next_run_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT %s
    """, (TENANT_ID, MAX_ENROLLMENTS_PER_LOOP))
    return cur.fetchall()


def fetch_step(cur, journey_id, step_order):
    cur.execute("""
      SELECT id, step_type, provider, template_id, delay_minutes, payload_json,
             next_step_order, branch_json, idempotency_key_template
      FROM journey_steps
      WHERE tenant_id=%s AND journey_id=%s AND step_order=%s
    """, (TENANT_ID, journey_id, step_order))
    return cur.fetchone()


def fetch_contact(cur, contact_id):
    cur.execute("""
      SELECT contact_id, email, phone, attrs
      FROM contacts
      WHERE tenant_id=%s AND contact_id=%s
    """, (TENANT_ID, contact_id))
    return cur.fetchone()


def mark_enrollment(cur, enrollment_id, step_index, next_run_at, state_json):
    cur.execute("""
      UPDATE enrollments
      SET step_index=%s, next_run_at=%s, updated_at=now(), state_json=%s
      WHERE tenant_id=%s AND enrollment_id=%s
    """, (step_index, next_run_at, json.dumps(state_json), TENANT_ID, enrollment_id))


def complete_enrollment(cur, enrollment_id, state_json):
    cur.execute("""
      UPDATE enrollments
      SET status='COMPLETED', updated_at=now(), state_json=%s
      WHERE tenant_id=%s AND enrollment_id=%s
    """, (json.dumps(state_json), TENANT_ID, enrollment_id))


def fail_enrollment(cur, enrollment_id, state_json, err_msg):
    state_json = dict(state_json or {})
    state_json["last_error"] = str(err_msg)[:500]
    cur.execute("""
      UPDATE enrollments
      SET status='FAILED', updated_at=now(), state_json=%s
      WHERE tenant_id=%s AND enrollment_id=%s
    """, (json.dumps(state_json), TENANT_ID, enrollment_id))


def eval_rule(contact_row, rule):
    # rule: {"field":"attrs.plan"|"email", "op":"eq"|"contains", "value": "..."}
    contact_attrs = (contact_row or {}).get("attrs") or {}
    field = (rule.get("field") or "").strip()
    op = (rule.get("op") or "eq").strip().lower()
    value = rule.get("value")
    if field.startswith("attrs."):
        key = field.split(".", 1)[1]
        actual = (contact_attrs or {}).get(key)
    elif field == "email":
        actual = (contact_row or {}).get("email")
    elif field == "phone":
        actual = (contact_row or {}).get("phone")
    else:
        actual = None

    if op == "contains":
        return (actual is not None) and (str(value) in str(actual))
    return str(actual) == str(value)


def choose_next_step(contact_row, step_row):
    # Branching: step_row["branch_json"] = [{"if":[rules...], "then": step_order}, ...]
    try:
        branches = step_row["branch_json"] or []
        if isinstance(branches, str):
            branches = json.loads(branches)
    except Exception:
        branches = []
    for b in branches or []:
        rules = b.get("if") or []
        if all(eval_rule(contact_row, r) for r in rules):
            return b.get("then")
    # explicit next_step_order can override default +1
    if step_row.get("next_step_order") is not None:
        return step_row.get("next_step_order")
    return None


def render_template(s: str, ctx: dict) -> str:
    # minimal templating: {{var}}
    out = s or ""
    for k, v in ctx.items():
        out = out.replace("{{" + k + "}}", str(v))
    return out


def claim_idempotency(cur, journey_id: str, enrollment_id: str, step_id: str, key_plain: str) -> bool:
    key_hash = stable_hash(key_plain)
    cur.execute("""
      INSERT INTO journey_idempotency_keys (tenant_id, key_hash, journey_id, enrollment_id, step_id)
      VALUES (%s,%s,%s,%s,%s)
      ON CONFLICT DO NOTHING
    """, (TENANT_ID, key_hash, journey_id, enrollment_id, step_id))
    # rowcount==1 means we claimed it (first execution); 0 means duplicate
    return cur.rowcount == 1



# V293: Controlled retries for step execution (instead of immediate enrollment failure)
def get_step_failure(cur, enrollment_id: str, step_order: int):
    cur.execute("""SELECT * FROM journey_step_failures
                    WHERE tenant_id=%s AND enrollment_id=%s AND step_order=%s""", (TENANT_ID, enrollment_id, step_order))
    return cur.fetchone()

def schedule_step_retry(cur, enrollment_id: str, journey_id: str, step_order: int, err: Exception,
                        max_attempts: int = 5, base_seconds: int = 30, max_seconds: int = 3600):
    # exponential backoff with cap
    row = get_step_failure(cur, enrollment_id, step_order)
    attempts = int((row or {}).get("attempts") or 0) + 1
    delay = min(max_seconds, base_seconds * (2 ** (attempts - 1)))
    next_retry = datetime.datetime.utcnow().replace(tzinfo=datetime.timezone.utc) + datetime.timedelta(seconds=delay)
    status = "PENDING" if attempts < max_attempts else "GAVE_UP"
    cur.execute("""
      INSERT INTO journey_step_failures (tenant_id, enrollment_id, journey_id, step_order, attempts, next_retry_at, last_error, status, updated_at)
      VALUES (%s,%s,%s,%s,%s,%s,%s,%s, now())
      ON CONFLICT (tenant_id, enrollment_id, step_order)
      DO UPDATE SET attempts=EXCLUDED.attempts,
                    next_retry_at=EXCLUDED.next_retry_at,
                    last_error=EXCLUDED.last_error,
                    status=EXCLUDED.status,
                    updated_at=now()
    """, (TENANT_ID, enrollment_id, journey_id, step_order, attempts, next_retry, str(err)[:2000], status))
    return attempts, status, next_retry

def resolve_step_failure(cur, enrollment_id: str, step_order: int):
    cur.execute("""UPDATE journey_step_failures
                    SET status='RESOLVED', updated_at=now()
                    WHERE tenant_id=%s AND enrollment_id=%s AND step_order=%s""",
                (TENANT_ID, enrollment_id, step_order))

def emit_action(step_row, contact_row, enrollment_id: str):
    step_type = step_row["step_type"]
    provider = step_row["provider"] or "generic"
    template_id = step_row["template_id"]
    payload = step_row["payload_json"] or {}
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except Exception:
            payload = {}

    channel = "email" if step_type == "EMAIL_SEND" else "ads"

    # naive mapping - extend in real product
    req = {
        "channel": channel,
        "action_type": step_type,
        "payload": {
            "contact_id": (contact_row or {}).get("contact_id"),
            "email": (contact_row or {}).get("email"),
            "phone": (contact_row or {}).get("phone"),
            "provider": provider,
            "template_id": template_id,
            "payload": payload,
        }
    }
    return api_post("/v1/actions", req)


def run_once():
    conn = connect()
    conn.autocommit = False
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:

            # 1) Trigger processing with cursor (per journey)
            journeys = fetch_active_journeys(cur)
            for j in journeys:
                journey_id = j["journey_id"]
                def_json = j["definition_json"]
                try:
                    d = def_json if isinstance(def_json, dict) else json.loads(def_json)
                except Exception:
                    d = {}
                trig = d.get("trigger") or {}
                event_type = trig.get("event_type")
                if not event_type:
                    continue

                reentry = trig.get("reentry", "event")  # event|daily|journey
                last_ts, last_eid = get_or_init_cursor(cur, journey_id)
                since = last_ts - datetime.timedelta(seconds=CURSOR_OVERLAP_SECONDS)
                events = fetch_events_for_trigger(cur, event_type, since)

                max_ts = last_ts
                max_eid = last_eid
                for ev in events:
                    # Cursor tie-breaker (occurred_at, event_id)
                    if ev["occurred_at"] < last_ts:
                        pass
                    elif ev["occurred_at"] == last_ts and last_eid and ev["event_id"] <= last_eid:
                        continue

                    contact_id = ev["contact_id"]
                    if not contact_id:
                        continue

                    if reentry == "daily":
                        key = f"{contact_id}:{ev['occurred_at'].date().isoformat()}"
                    elif reentry == "journey":
                        key = f"{contact_id}:once"
                    else:
                        key = f"{contact_id}:{ev['event_id']}"
                    reentry_key = stable_hash(key)[:32]
                    create_enrollment(cur, journey_id, contact_id, reentry_key, last_event_at=ev["occurred_at"])

                    # advance local max
                    if ev["occurred_at"] > max_ts or (ev["occurred_at"] == max_ts and ev["event_id"] > max_eid):
                        max_ts = ev["occurred_at"]
                        max_eid = ev["event_id"]

                # persist cursor even if no new enrollments (for forward progress)
                if max_ts != last_ts or max_eid != last_eid:
                    advance_cursor(cur, journey_id, max_ts, max_eid)

            # 2) Execute due enrollments (locked)
            due = fetch_due_enrollments_locked(cur)
            for row in due:
                enrollment_id = row["enrollment_id"]
                journey_id = row["journey_id"]
                contact_id = row["contact_id"]
                step_index = int(row["step_index"])
                state_json = row["state_json"] or {}

                step = fetch_step(cur, journey_id, step_index)
                if not step:
                    complete_enrollment(cur, enrollment_id, state_json)
                    continue

                contact = fetch_contact(cur, contact_id)

                # V293: If this step has a pending retry window, skip until due
                fail_row = get_step_failure(cur, enrollment_id, step_index)
                if fail_row and (fail_row.get("status") == "PENDING"):
                    due = fail_row.get("next_retry_at")
                    if due and isinstance(due, datetime.datetime):
                        due_dt = due
                    else:
                        due_dt = None
                    if due_dt and due_dt > datetime.datetime.utcnow().replace(tzinfo=datetime.timezone.utc):
                        # not yet due; keep schedule
                        continue

                # Idempotency
                template = step.get("idempotency_key_template") or "{{journey_id}}|{{enrollment_id}}|{{step_id}}"
                ctx = {
                    "tenant_id": TENANT_ID,
                    "journey_id": journey_id,
                    "enrollment_id": enrollment_id,
                    "step_id": step["id"],
                    "step_order": step_index,
                    "contact_id": contact_id,
                }
                key_plain = render_template(template, ctx)
                if not claim_idempotency(cur, journey_id, enrollment_id, step["id"], key_plain):
                    # Duplicate execution attempt: fast-forward to next step without emitting action
                    state_json.setdefault("dedup_skips", [])
                    state_json["dedup_skips"].append({"step_order": step_index, "at": datetime.datetime.utcnow().isoformat() + "Z"})
                else:
                    try:
                        resp = emit_action(step, contact, enrollment_id)
                        state_json.setdefault("executed_steps", [])
                        state_json["executed_steps"].append({"step_order": step_index, "at": datetime.datetime.utcnow().isoformat() + "Z", "resp": resp})
                        resolve_step_failure(cur, enrollment_id, step_index)
                    except Exception as e:
                        attempts, status, next_retry = schedule_step_retry(cur, enrollment_id, journey_id, step_index, e)
                        state_json.setdefault("step_failures", [])
                        state_json["step_failures"].append({"step_order": step_index, "attempts": attempts, "status": status, "next_retry_at": next_retry.isoformat()})
                        if status == "GAVE_UP":
                            fail_enrollment(cur, enrollment_id, state_json, e)
                        else:
                            # keep current step; retry later
                            mark_enrollment(cur, enrollment_id, step_index, next_retry, state_json)
                        continue

                next_step_order = choose_next_step(contact, step)
                if next_step_order is None:
                    next_step_order = step_index + 1

                delay = int(step["delay_minutes"] or 0)
                next_run = datetime.datetime.utcnow().replace(tzinfo=datetime.timezone.utc) + datetime.timedelta(minutes=delay)

                if not fetch_step(cur, journey_id, next_step_order):
                    complete_enrollment(cur, enrollment_id, state_json)
                else:
                    mark_enrollment(cur, enrollment_id, next_step_order, next_run, state_json)

            conn.commit()
    finally:
        conn.close()


def main():
    print(f"[journey_executor] tenant={TENANT_ID} poll={POLL_SECONDS}s")
    while True:
        try:
            run_once()
        except Exception as e:
            print("[journey_executor] error:", e)
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
