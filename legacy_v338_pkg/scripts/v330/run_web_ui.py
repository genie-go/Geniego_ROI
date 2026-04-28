#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GENIE_ROI V330 Web UI (SaaS-feeling + Compliance + Monitoring)

Focus upgrades:
- Server-enforced RBAC (UI hiding + API locking)
- Monitoring panel: errors/delays/missing signals (event_log + connector_state)
- Compliance endpoints: consent log / retention / deletion requests (DSR)
- Pixel v330 + ID graph evidence/conflict-aware stitching
- SmartStore OAuth2 Client Credentials + signature token issuance

Run:
  python scripts/v330/run_web_ui.py --workspace ./workspace --host 0.0.0.0 --port 8080
"""
from __future__ import annotations
import argparse, json, os, pathlib, re, sys, urllib.parse, time, io, csv, zipfile
from http.server import BaseHTTPRequestHandler, HTTPServer

_ROOT = pathlib.Path(__file__).resolve().parents[2]
if _ROOT.as_posix() not in sys.path:
    sys.path.insert(0, _ROOT.as_posix())

from scripts.v330.security import (
    hash_password, verify_password,
    sign_session, verify_session, Session
)
from scripts.v330.ops_store import OpsStore
from scripts.v330.pixel import make_pixel_js
from scripts.v330.connectors_smartstore import SmartStoreOAuth

ROLE_ORDER = {"viewer":0,"analyst":1,"manager":2,"admin":3}

def _json_bytes(obj) -> bytes:
    return json.dumps(obj, ensure_ascii=False, indent=2).encode("utf-8")

def _now_iso() -> str:
    import datetime
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat()+"Z"

def ensure_default_users(workspace: pathlib.Path) -> pathlib.Path:
    p = workspace/"data"/"users.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    if not p.exists():
        # default admin/admin for intranet PoC
        users = {
            "admin": {"role":"admin", "pw_hash": hash_password("admin")},
            "analyst": {"role":"analyst", "pw_hash": hash_password("analyst")},
            "viewer": {"role":"viewer", "pw_hash": hash_password("viewer")},
        }
        p.write_text(json.dumps(users, ensure_ascii=False, indent=2), encoding="utf-8")
    return p

def load_users(workspace: pathlib.Path) -> dict:
    p = ensure_default_users(workspace)
    return json.loads(p.read_text(encoding="utf-8"))

def save_users(workspace: pathlib.Path, users: dict) -> None:
    p = ensure_default_users(workspace)
    p.write_text(json.dumps(users, ensure_ascii=False, indent=2), encoding="utf-8")

def parse_cookies(header: str|None) -> dict:
    out={}
    if not header:
        return out
    parts = header.split(";")
    for part in parts:
        if "=" in part:
            k,v = part.strip().split("=",1)
            out[k]=v
    return out

def require_role(session: Session|None, min_role: str) -> bool:
    if not session:
        return False
    return ROLE_ORDER.get(session.role, -1) >= ROLE_ORDER[min_role]

class Handler(BaseHTTPRequestHandler):
    server_version = "GENIE_ROI_V330"
    workspace: pathlib.Path
    store: OpsStore
    session_secret: str

    def _send(self, status: int, body: bytes, content_type: str="application/json; charset=utf-8", extra_headers: dict|None=None):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        if extra_headers:
            for k,v in extra_headers.items():
                self.send_header(k,v)
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length","0") or "0")
        raw = self.rfile.read(length) if length>0 else b"{}"
        try:
            return json.loads(raw.decode("utf-8") or "{}")
        except Exception:
            return {}

    def _session(self) -> Session|None:
        cookies = parse_cookies(self.headers.get("Cookie"))
        tok = cookies.get("genie_session")
        if not tok:
            return None
        try:
            return verify_session(tok, self.session_secret)
        except Exception:
            return None

    def _project_from_path(self) -> str|None:
        m = re.match(r"^/p/([^/]+)(/.*)?$", self.path)
        return m.group(1) if m else None

    def do_GET(self):
        try:
            self._do_GET()
        except Exception as e:
            self.server.store.log("ERROR","ui","HTTP.GET", str(e), {"path": self.path})
            self._send(500, _json_bytes({"error": str(e)}))

    def _do_GET(self):
        path = urllib.parse.urlparse(self.path).path

        # root -> login
        if path == "/":
            self._send(302, b"", "text/plain", {"Location": "/dashboard/login_v330.html"})
            return

        # static dashboard files
        if path.startswith("/dashboard/"):
            f = (self.workspace.parent/"dashboard"/path.split("/dashboard/",1)[1]).resolve()
            if not f.exists() or not f.is_file():
                self._send(404, b"not found", "text/plain; charset=utf-8")
                return
            ctype = "text/html; charset=utf-8"
            if f.suffix == ".js":
                ctype = "application/javascript; charset=utf-8"
            if f.suffix == ".css":
                ctype = "text/css; charset=utf-8"
            self._send(200, f.read_bytes(), ctype)
            return

        # /api/me
        if path == "/api/me":
            s = self._session()
            if not s:
                self._send(401, _json_bytes({"ok":False}))
                return
            self._send(200, _json_bytes({"ok":True,"user":s.username,"role":s.role}))
            return

        # project endpoints
        m = re.match(r"^/p/([^/]+)(/.*)$", path)
        if not m:
            self._send(404, _json_bytes({"error":"unknown route"}))
            return
        project_id, sub = m.group(1), m.group(2)

        # pixel js (public)
        if sub == "/pixel/p.js":
            js = make_pixel_js(project_id, f"/p/{project_id}", banner=True).encode("utf-8")
            self._send(200, js, "application/javascript; charset=utf-8")
            return

        # dashboard json (viewer+)
        if sub == "/api/dashboard":
            s = self._session()
            if not require_role(s, "viewer"):
                self._send(401, _json_bytes({"error":"login required"}))
                return
            outp = self.workspace/"projects"/project_id/"out"/"dashboard_ads_kpi.json"
            if not outp.exists():
                self._send(200, _json_bytes({"rows":[],"meta":{"missing":True}}))
                return
            self._send(200, outp.read_bytes(), "application/json; charset=utf-8")
            return

        # id graph summary (analyst+)
        if sub == "/api/id_graph/summary":
            s = self._session()
            if not require_role(s, "analyst"):
                self._send(403, _json_bytes({"error":"forbidden"}))
                return
            self._send(200, _json_bytes(self.store.id_graph_summary(project_id)))
            return

        # connectors status (manager+)
        if sub == "/api/connectors":
            s = self._session()
            if not require_role(s, "manager"):
                self._send(403, _json_bytes({"error":"forbidden"}))
                return
            self._send(200, _json_bytes({"connectors": self.store.list_connectors(project_id)}))
            return

        # monitoring overview (manager+)
        if sub == "/api/monitor/overview":
            s = self._session()
            if not require_role(s, "manager"):
                self._send(403, _json_bytes({"error":"forbidden"}))
                return
            # compute missing signals
            connectors = self.store.list_connectors(project_id)
            recent_errors = self.store.list_recent_events(component=None, limit=200)
            now = time.time()

            def age_sec(iso: str|None) -> int|None:
                if not iso: return None
                try:
                    import datetime
                    dt = datetime.datetime.fromisoformat(iso.replace("Z","+00:00"))
                    return int(now - dt.timestamp())
                except Exception:
                    return None

            conn_health=[]
            for c in connectors:
                ok_age = age_sec(c.get("last_ok_ts"))
                err_age = age_sec(c.get("last_err_ts"))
                conn_health.append({
                    "connector": c["connector"],
                    "last_ok_age_s": ok_age,
                    "last_err_age_s": err_age,
                    "last_err_code": c.get("last_err_code"),
                    "last_err_msg": c.get("last_err_msg"),
                })

            self._send(200, _json_bytes({
                "project_id": project_id,
                "connectors": conn_health,
                "recent_events": recent_errors[:80],
            }))
            return

        # export (role enforced)
        if sub == "/api/export":
            s = self._session()
            if not require_role(s, "analyst"):
                self._send(403, _json_bytes({"error":"forbidden"}))
                return
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            scope = (q.get("scope") or ["dashboard_rows"])[0]
            fmt = (q.get("format") or ["csv"])[0]
            if scope == "pixel_events":
                # dump latest events
                rows = _dump_table(self.store.db_path, "pixel_events_v330", project_id, limit=5000)
                return _send_export(self, rows, fmt, f"{project_id}_pixel_events.{fmt}")
            if scope == "event_log":
                rows = self.store.list_recent_events(limit=2000)
                return _send_export(self, rows, fmt, f"{project_id}_event_log.{fmt}")
            if scope == "id_graph":
                data = self.store.id_graph_summary(project_id)
                return _send_export(self, [data], "json", f"{project_id}_id_graph.json")
            # default: dashboard rows
            outp = self.workspace/"projects"/project_id/"out"/"dashboard_ads_kpi.json"
            if not outp.exists():
                return self._send(200, _json_bytes({"rows":[]}))
            data = json.loads(outp.read_text(encoding="utf-8"))
            rows = data.get("rows") or []
            return _send_export(self, rows, fmt, f"{project_id}_dashboard_rows.{fmt}")

        self._send(404, _json_bytes({"error":"unknown route"}))

    def do_POST(self):
        try:
            self._do_POST()
        except Exception as e:
            self.server.store.log("ERROR","ui","HTTP.POST", str(e), {"path": self.path})
            self._send(500, _json_bytes({"error": str(e)}))

    def _do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # login/logout
        if path == "/api/login":
            body = self._read_json()
            username = (body.get("username") or "").strip()
            password = body.get("password") or ""
            users = load_users(self.workspace)
            u = users.get(username)
            if not u or not verify_password(password, u.get("pw_hash","")):
                self._send(403, _json_bytes({"ok":False,"error":"invalid credentials"}))
                return
            sess = Session(username=username, role=u.get("role","viewer"), issued_ts=int(time.time()))
            tok = sign_session(sess, self.session_secret)
            self._send(200, _json_bytes({"ok":True,"role":sess.role}),
                       extra_headers={"Set-Cookie": f"genie_session={tok}; Path=/; HttpOnly; SameSite=Lax"})
            return

        if path == "/api/logout":
            self._send(200, _json_bytes({"ok":True}),
                       extra_headers={"Set-Cookie": "genie_session=; Path=/; Max-Age=0"})
            return

        # project endpoints
        m = re.match(r"^/p/([^/]+)(/.*)$", path)
        if not m:
            self._send(404, _json_bytes({"error":"unknown route"}))
            return
        project_id, sub = m.group(1), m.group(2)

        # public compliance consent log
        if sub == "/api/compliance/consent":
            b = self._read_json()
            consent = bool(b.get("consent"))
            anon = b.get("anonymous_id")
            self.store.record_consent(project_id, anonymous_id=anon, consent=consent,
                                      ip=self.client_address[0] if self.client_address else None,
                                      user_agent=self.headers.get("User-Agent"))
            self._send(200, _json_bytes({"ok":True}))
            return

        # pixel ingest (public)
        if sub == "/pixel/e":
            ev = self._read_json()
            ev["consent"] = bool(ev.get("consent", True))
            self.store.ingest_pixel_event(project_id, ev, source="browser",
                                          ip=self.client_address[0] if self.client_address else None,
                                          user_agent=self.headers.get("User-Agent"))
            # identity stitching
            if ev.get("name") == "identify":
                props = ev.get("props") or {}
                anon = ev.get("anonymous_id")
                # prefer explicit user_id
                user_id = ev.get("user_id") or props.get("user_id") or props.get("customer_id") or props.get("email_hash")
                if anon and user_id:
                    # treat user_id type if looks like email hash
                    dst_type = "customer_id"
                    if isinstance(user_id, str) and re.fullmatch(r"[a-fA-F0-9]{64}", user_id):
                        dst_type = "email_hash"
                    self.store.add_identity_evidence(project_id, "anonymous_id", str(anon), dst_type, str(user_id),
                                                     evidence_type="login", ts=ev.get("ts"))
                    # rebuild lightly (debounce by time in future; here immediate for PoC)
                    self.store.rebuild_groups(project_id)
            self._send(200, _json_bytes({"ok":True}))
            return

        # s2s ingest (api key)
        if sub == "/pixel/s2s":
            # server key per project stored in config
            s2s_key = self.store.get_config(f"s2s_key:{project_id}", "")
            got = self.headers.get("X-API-Key") or ""
            if not s2s_key or got != s2s_key:
                self._send(403, _json_bytes({"error":"invalid api key"}))
                return
            payload = self._read_json()
            events = payload.get("events") if isinstance(payload, dict) else None
            if not isinstance(events, list):
                events = [payload]
            for ev in events:
                if not isinstance(ev, dict): 
                    continue
                ev["consent"] = bool(ev.get("consent", True))
                self.store.ingest_pixel_event(project_id, ev, source="s2s",
                                              ip=self.client_address[0] if self.client_address else None,
                                              user_agent=self.headers.get("User-Agent"))
            self._send(200, _json_bytes({"ok":True, "count": len(events)}))
            return

        # retention get/set (viewer get, admin set)
        if sub == "/api/compliance/retention":
            s = self._session()
            if self.command == "POST":
                if not require_role(s, "admin"):
                    self._send(403, _json_bytes({"error":"forbidden"}))
                    return
                b = self._read_json()
                days = int(b.get("pixel_retention_days") or 180)
                days = max(7, min(days, 3650))
                self.store.set_config("pixel_retention_days", str(days))
                self._send(200, _json_bytes({"ok":True,"pixel_retention_days":days}))
                return
            else:
                if not require_role(s, "viewer"):
                    self._send(401, _json_bytes({"error":"login required"}))
                    return
                self._send(200, _json_bytes({"pixel_retention_days": int(self.store.get_config("pixel_retention_days","180") or "180")}))
                return

        # purge old events (admin)
        if sub == "/api/compliance/purge":
            s = self._session()
            if not require_role(s, "admin"):
                self._send(403, _json_bytes({"error":"forbidden"}))
                return
            deleted = self.store.purge_old_pixel_events(project_id)
            self._send(200, _json_bytes({"ok":True,"deleted":deleted}))
            return

        # deletion request create (manager+)
        if sub == "/api/compliance/delete_request":
            s = self._session()
            if not require_role(s, "manager"):
                self._send(403, _json_bytes({"error":"forbidden"}))
                return
            b = self._read_json()
            it = b.get("identifier_type") or "email_hash"
            iv = (b.get("identifier_value") or "").strip()
            if not iv:
                self._send(400, _json_bytes({"error":"missing identifier_value"}))
                return
            rid = self.store.create_deletion_request(project_id, it, iv)
            self.store.log("INFO","pixel","DSR.CREATED","deletion request created", {"id": rid, "type": it})
            self._send(200, _json_bytes({"ok":True,"request_id":rid}))
            return

        # process deletions (admin)
        if sub == "/api/compliance/process_deletions":
            s = self._session()
            if not require_role(s, "admin"):
                self._send(403, _json_bytes({"error":"forbidden"}))
                return
            b = self._read_json()
            limit = int(b.get("limit") or 50)
            res = self.store.process_deletions(project_id, limit=limit)
            self._send(200, _json_bytes({"ok":True, **res}))
            return

        # id graph rebuild (analyst+)
        if sub == "/api/id_graph/rebuild":
            s = self._session()
            if not require_role(s, "analyst"):
                self._send(403, _json_bytes({"error":"forbidden"}))
                return
            res = self.store.rebuild_groups(project_id)
            self._send(200, _json_bytes({"ok":True, **res}))
            return

        # smartstore token test + store state (admin)
        if sub == "/api/connectors/smartstore/token_test":
            s = self._session()
            if not require_role(s, "admin"):
                self._send(403, _json_bytes({"error":"forbidden"}))
                return
            b = self._read_json()
            cid = b.get("client_id") or os.environ.get("SMARTSTORE_CLIENT_ID","")
            csec = b.get("client_secret") or os.environ.get("SMARTSTORE_CLIENT_SECRET","")
            acc = b.get("account_id") or os.environ.get("SMARTSTORE_ACCOUNT_ID","")
            if not (cid and csec and acc):
                self._send(400, _json_bytes({"error":"missing client_id/client_secret/account_id"}))
                return
            try:
                oauth = SmartStoreOAuth(client_id=cid, client_secret=csec, account_id=acc)
                tok = oauth.issue_token(force=True)
                self.store.upsert_connector_state(project_id, "smartstore",
                                                 token={"access_token": tok["access_token"], "expires_at": tok.get("expires_at")},
                                                 perms={"scopes":"N/A"},
                                                 ratelimit={"note":"server-side enforcement TBD"},
                                                 watermark={"date_cursor": _now_iso(), "last_id": None},
                                                 ok=True)
                self._send(200, _json_bytes({"ok":True,"token_excerpt": tok["access_token"][:12]+"...", "expires_at": tok.get("expires_at")}))
            except Exception as e:
                self.store.upsert_connector_state(project_id, "smartstore",
                                                 token={}, perms={}, ratelimit={}, watermark={},
                                                 ok=False, err_code="SMARTSTORE.TOKEN", err_msg=str(e))
                self._send(500, _json_bytes({"ok":False,"error":str(e)}))
            return

        self._send(404, _json_bytes({"error":"unknown route"}))

def _dump_table(db_path: pathlib.Path, table: str, project_id: str, limit: int=5000):
    import sqlite3
    conn = sqlite3.connect(db_path.as_posix())
    conn.row_factory = sqlite3.Row
    rows = conn.execute(f"SELECT * FROM {table} WHERE project_id=? ORDER BY ts DESC LIMIT ?", (project_id, limit)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def _send_export(handler: Handler, rows, fmt: str, filename: str):
    fmt = (fmt or "csv").lower()
    if fmt == "json":
        handler._send(200, _json_bytes(rows), "application/json; charset=utf-8",
                      {"Content-Disposition": f'attachment; filename="{filename}"'})
        return
    # csv
    out = io.StringIO()
    if not rows:
        out.write("")
    else:
        # flatten dict keys
        keys=set()
        for r in rows:
            if isinstance(r, dict):
                keys |= set(r.keys())
        keys = list(sorted(keys))
        w = csv.DictWriter(out, fieldnames=keys)
        w.writeheader()
        for r in rows:
            if not isinstance(r, dict):
                w.writerow({"value": json.dumps(r, ensure_ascii=False)})
            else:
                w.writerow({k: (json.dumps(r[k], ensure_ascii=False) if isinstance(r.get(k), (dict,list)) else r.get(k)) for k in keys})
    handler._send(200, out.getvalue().encode("utf-8"), "text/csv; charset=utf-8",
                  {"Content-Disposition": f'attachment; filename="{filename}"'})

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workspace", default=str((_ROOT/"workspace").resolve()))
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8080)
    ap.add_argument("--session-secret", default=os.environ.get("GENIE_SESSION_SECRET",""))
    args = ap.parse_args()

    workspace = pathlib.Path(args.workspace).resolve()
    workspace.mkdir(parents=True, exist_ok=True)

    secret = args.session_secret or "dev_secret_change_me"
    store = OpsStore(workspace)

    # attach to server
    httpd = HTTPServer((args.host, args.port), Handler)
    httpd.workspace = workspace
    httpd.store = store
    httpd.session_secret = secret

    print(f"[V330] workspace={workspace}  http://{args.host}:{args.port}/dashboard/login_v330.html")
    print("[V330] default users (if first run): admin/admin , analyst/analyst , viewer/viewer")
    httpd.serve_forever()

if __name__ == "__main__":
    main()
