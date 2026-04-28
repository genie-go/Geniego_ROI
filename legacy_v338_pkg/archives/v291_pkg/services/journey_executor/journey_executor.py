import os, json, time, datetime, hashlib
import requests
import psycopg2
import psycopg2.extras

API_BASE = os.getenv("API_BASE", "http://gateway:8080")
TENANT_ID = os.getenv("TENANT_ID", "demo-tenant")
API_KEY = os.getenv("API_KEY", "")
POLL_SECONDS = int(os.getenv("JOURNEY_POLL_SECONDS", "10"))
EVENT_LOOKBACK_SECONDS = int(os.getenv("JOURNEY_EVENT_LOOKBACK_SECONDS", "120"))

PGHOST = os.getenv("PGHOST", "postgres")
PGPORT = int(os.getenv("PGPORT", "5432"))
PGDATABASE = os.getenv("POSTGRES_DB", "genie")
PGUSER = os.getenv("POSTGRES_USER", "genie")
PGPASSWORD = os.getenv("POSTGRES_PASSWORD", "genie")

def api_post(path, payload):
    headers = {"Content-Type":"application/json", "X-Tenant-ID": TENANT_ID, "X-API-Key": API_KEY}
    r = requests.post(f"{API_BASE}{path}", headers=headers, data=json.dumps(payload), timeout=20)
    if r.status_code >= 300:
        raise RuntimeError(f"{path} {r.status_code} {r.text}")
    return r.json() if r.text else None

def connect():
    return psycopg2.connect(host=PGHOST, port=PGPORT, dbname=PGDATABASE, user=PGUSER, password=PGPASSWORD)

def stable_hash(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def fetch_active_journeys(cur):
    cur.execute("""
      SELECT journey_id, definition_json
      FROM journeys
      WHERE tenant_id=%s AND status='ACTIVE'
    """, (TENANT_ID,))
    return cur.fetchall()

def fetch_recent_events(cur, since_ts):
    cur.execute("""
      SELECT event_id, contact_id, event_type, properties, occurred_at
      FROM events
      WHERE tenant_id=%s AND occurred_at >= %s
      ORDER BY occurred_at ASC
      LIMIT 2000
    """, (TENANT_ID, since_ts))
    return cur.fetchall()

def enrollment_exists(cur, journey_id, reentry_key):
    cur.execute("""
      SELECT 1 FROM enrollments
      WHERE tenant_id=%s AND journey_id=%s AND reentry_key=%s
      LIMIT 1
    """, (TENANT_ID, journey_id, reentry_key))
    return cur.fetchone() is not None

def create_enrollment(cur, journey_id, contact_id, reentry_key):
    eid = stable_hash(f"{TENANT_ID}|{journey_id}|{contact_id}|{reentry_key}|{time.time()}")[:24]
    cur.execute("""
      INSERT INTO enrollments (tenant_id, enrollment_id, journey_id, contact_id, step_index, next_run_at, status, reentry_key, state_json)
      VALUES (%s,%s,%s,%s,0,now(),'ACTIVE',%s,'{}'::jsonb)
      ON CONFLICT DO NOTHING
    """, (TENANT_ID, eid, journey_id, contact_id, reentry_key))
    return eid

def fetch_due_enrollments(cur):
    cur.execute("""
      SELECT enrollment_id, journey_id, contact_id, step_index, next_run_at, COALESCE(state_json,'{}'::jsonb) AS state_json
      FROM enrollments
      WHERE tenant_id=%s AND status='ACTIVE' AND next_run_at <= now()
      ORDER BY next_run_at ASC
      LIMIT 100
    """, (TENANT_ID,))
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

def eval_rule(contact_attrs, rule):
    # rule: {"field":"attrs.plan"|"email", "op":"eq"|"contains", "value": "..."}
    field = (rule.get("field") or "").strip()
    op = (rule.get("op") or "eq").strip().lower()
    value = rule.get("value")
    if field.startswith("attrs."):
        key = field.split(".",1)[1]
        actual = (contact_attrs or {}).get(key)
    elif field == "email":
        actual = contact_attrs.get("email") if isinstance(contact_attrs, dict) else None
    else:
        actual = None

    if op == "eq":
        return str(actual) == str(value)
    if op == "contains":
        return (str(value) in str(actual)) if actual is not None else False
    return False

def choose_next_step(contact, step_row):
    # step_row includes next_step_order and branch_json (list of {if:[rules], then:int})
    next_step = step_row[6]
    branch_json = step_row[7] or []
    try:
        branches = branch_json if isinstance(branch_json, list) else json.loads(branch_json)
    except Exception:
        branches = []
    attrs = (contact[3] or {}) if contact else {}
    # enrich attrs for rules
    enriched = dict(attrs)
    if contact:
        enriched["email"] = contact[1]
    for b in branches:
        rules = b.get("if") or []
        ok = True
        for r in rules:
            if not eval_rule(enriched, r):
                ok = False
                break
        if ok and b.get("then") is not None:
            return int(b.get("then"))
    return next_step

def format_idempotency(tpl, enrollment_id, contact_id, step_id):
    if not tpl:
        return f"journey:{enrollment_id}:{step_id}"
    return tpl.replace("{enrollment_id}", enrollment_id).replace("{contact_id}", contact_id).replace("{step_id}", step_id)

def emit_action(step, contact, enrollment_id):
    step_id, step_type, provider, template_id, delay_minutes, payload_json, *_ = step
    payload = payload_json or {}
    # attach minimal contact context for templating downstream (connectors may use it)
    payload = dict(payload)
    payload.setdefault("contact_id", contact[0] if contact else None)
    payload.setdefault("email", contact[1] if contact else None)
    idem_tpl = step[8]
    idem = format_idempotency(idem_tpl, enrollment_id, contact[0] if contact else "", step_id)

    req = {
        "channel": "email" if step_type.startswith("EMAIL") else ("crm" if step_type.startswith("CRM") else "ads"),
        "action_type": step_type,
        "provider": provider,
        "payload": payload,
        "idempotency_key": idem,
        "meta": {"journey_step_id": step_id, "journey_enrollment_id": enrollment_id, "template_id": template_id},
    }
    return api_post("/v1/actions", req)

def run_once():
    conn = connect()
    conn.autocommit = False
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # 1) Auto-enroll based on recent events (journey definition triggers)
            since = datetime.datetime.utcnow() - datetime.timedelta(seconds=EVENT_LOOKBACK_SECONDS)
            events = fetch_recent_events(cur, since)
            journeys = fetch_active_journeys(cur)
            for j in journeys:
                journey_id, def_json = j["journey_id"], j["definition_json"]
                try:
                    d = def_json if isinstance(def_json, dict) else json.loads(def_json)
                except Exception:
                    d = {}
                trig = d.get("trigger") or {}
                event_type = trig.get("event_type")
                if not event_type:
                    continue
                reentry = trig.get("reentry", "event")  # event|daily|journey
                for ev in events:
                    if ev["event_type"] != event_type:
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
                    if enrollment_exists(cur, journey_id, reentry_key):
                        continue
                    create_enrollment(cur, journey_id, contact_id, reentry_key)

            # 2) Execute due steps
            due = fetch_due_enrollments(cur)
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

                try:
                    resp = emit_action(step, contact, enrollment_id)
                    state_json.setdefault("executed_steps", [])
                    state_json["executed_steps"].append({"step_order": step_index, "at": datetime.datetime.utcnow().isoformat() + "Z", "resp": resp})
                except Exception as e:
                    fail_enrollment(cur, enrollment_id, state_json, e)
                    continue

                # Decide next step
                next_step_order = choose_next_step(contact, step)
                if next_step_order is None:
                    next_step_order = step_index + 1

                delay = int(step[4] or 0)
                next_run = datetime.datetime.utcnow() + datetime.timedelta(minutes=delay)

                # If next step doesn't exist, complete
                if not fetch_step(cur, journey_id, next_step_order):
                    complete_enrollment(cur, enrollment_id, state_json)
                else:
                    mark_enrollment(cur, enrollment_id, next_step_order, next_run, state_json)

            conn.commit()
    finally:
        conn.close()

def main():
    print("[journey_executor] started", flush=True)
    while True:
        try:
            run_once()
        except Exception as e:
            print("[journey_executor] error", e, flush=True)
        time.sleep(POLL_SECONDS)

if __name__ == "__main__":
    main()
