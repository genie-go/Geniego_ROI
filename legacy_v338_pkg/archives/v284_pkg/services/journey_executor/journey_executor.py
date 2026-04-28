import os, json, time, datetime
import requests
import psycopg2
import psycopg2.extras

API_BASE = os.getenv("API_BASE", "http://gateway:8080")
TENANT_ID = os.getenv("TENANT_ID", "demo-tenant")
API_KEY = os.getenv("API_KEY", "")
POLL_SECONDS = int(os.getenv("JOURNEY_POLL_SECONDS", "10"))

PGHOST = os.getenv("PGHOST", "postgres")
PGPORT = int(os.getenv("PGPORT", "5432"))
PGDATABASE = os.getenv("POSTGRES_DB", "genie")
PGUSER = os.getenv("POSTGRES_USER", "genie")
PGPASSWORD = os.getenv("POSTGRES_PASSWORD", "genie")

def api_post(path, payload):
    headers = {"Content-Type":"application/json", "X-Tenant-ID": TENANT_ID, "X-API-Key": API_KEY}
    r = requests.post(f"{API_BASE}{path}", headers=headers, data=json.dumps(payload), timeout=15)
    if r.status_code >= 300:
        raise RuntimeError(f"{path} {r.status_code} {r.text}")
    return r.json() if r.text else None

def connect():
    return psycopg2.connect(
        host=PGHOST, port=PGPORT, dbname=PGDATABASE, user=PGUSER, password=PGPASSWORD
    )

def fetch_due_enrollments(cur):
    cur.execute("""
      SELECT enrollment_id, journey_id, contact_id, step_index, next_run_at
      FROM enrollments
      WHERE tenant_id=%s AND status='ACTIVE' AND next_run_at <= now()
      ORDER BY next_run_at ASC
      LIMIT 50
    """, (TENANT_ID,))
    return cur.fetchall()

def fetch_step(cur, journey_id, step_order):
    cur.execute("""
      SELECT id, step_type, provider, template_id, delay_minutes, payload_json
      FROM journey_steps
      WHERE tenant_id=%s AND journey_id=%s AND step_order=%s
    """, (TENANT_ID, journey_id, step_order))
    return cur.fetchone()

def fetch_contact(cur, contact_id):
    cur.execute("""
      SELECT contact_id, email, attributes_json
      FROM contacts
      WHERE tenant_id=%s AND contact_id=%s
    """, (TENANT_ID, contact_id))
    return cur.fetchone()

def mark_enrollment(cur, enrollment_id, step_index, next_run_at):
    cur.execute("""
      UPDATE enrollments
      SET step_index=%s, next_run_at=%s, updated_at=now()
      WHERE tenant_id=%s AND enrollment_id=%s
    """, (step_index, next_run_at, TENANT_ID, enrollment_id))

def complete_enrollment(cur, enrollment_id):
    cur.execute("""
      UPDATE enrollments SET status='COMPLETED', updated_at=now()
      WHERE tenant_id=%s AND enrollment_id=%s
    """, (TENANT_ID, enrollment_id))

def main():
    if not API_KEY:
        print("journey_executor: API_KEY missing. Set API_KEY env var to a minted key with marketer/admin role.")
    print("[journey_executor] starting")
    while True:
        try:
            with connect() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    due = fetch_due_enrollments(cur)
                    if not due:
                        time.sleep(POLL_SECONDS)
                        continue

                    for e in due:
                        next_step_order = int(e["step_index"]) + 1
                        step = fetch_step(cur, e["journey_id"], next_step_order)
                        if not step:
                            complete_enrollment(cur, e["enrollment_id"])
                            continue

                        contact = fetch_contact(cur, e["contact_id"])
                        payload = step["payload_json"] or {}
                        # Convenience: if EMAIL_SEND and template expects email
                        if contact and "email" in contact:
                            payload = dict(payload)
                            payload.setdefault("to", contact["email"])
                            payload.setdefault("contact_id", e["contact_id"])

                        action_req = {
                            "idempotency_key": f"journey:{e['enrollment_id']}:{step['id']}",
                            "channel": step["step_type"].split('_')[0].lower(),  # crude mapping
                            "action_type": step["step_type"],
                            "payload": payload,
                            "requested_by": "journey_executor",
                            "reason": f"journey {e['journey_id']} step {next_step_order}"
                        }
                        try:
                            api_post("/v1/actions", action_req)
                            delay = int(step["delay_minutes"] or 0)
                            next_run = datetime.datetime.utcnow() + datetime.timedelta(minutes=delay)
                            mark_enrollment(cur, e["enrollment_id"], next_step_order, next_run)
                        except Exception as ex:
                            # Backoff: retry in 5 minutes
                            next_run = datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
                            mark_enrollment(cur, e["enrollment_id"], int(e["step_index"]), next_run)
                            print(f"[journey_executor] execute error: {ex}")

                conn.commit()
        except Exception as e:
            print(f"[journey_executor] db loop error: {e}")

        time.sleep(1)

if __name__ == "__main__":
    main()
