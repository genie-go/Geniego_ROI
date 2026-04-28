#!/usr/bin/env python3
"""GENIE_ROI V328 Web UI (운영형)

V327 주요 추가
- 사용자/권한(대행사 직원별 접근제어): 로그인 + RBAC (viewer/analyst/manager/admin)
- 프로젝트별 API Key: 헤더 X-API-Key 로 API 접근 (키별 role 부여)
- 스케줄링(매일 자동 갱신): 지정 시각에 모든 프로젝트 대시보드 JSON 재생성
- 매칭 후보 TopN/스코어 상세 설명 리포트: dashboard_ads_kpi.json -> diagnostics.match_explanations

- OIDC JWT 검증 내장: Authorization: Bearer <JWT> (JWKS 캐시)
- 커넥터 실패 자동 재큐잉: attempts/max_attempts + backoff
- MMM/증분 리프트 계산 모듈: 간단 OLS + 홀드아웃 리프트(추정)
- Slack/Teams 실시간 알림: Webhook (잡/승인/배포/리포트 이벤트)
- 대시보드 UI 리액트화: React SPA(기본 CDN) + JSON API

기존(V322) 유지
- 멀티 프로젝트/고객사 분리: /p/<project_id>/...
- 프로젝트별 DB/OUT/TEMPLATES 분리
- CSV 업로드, 매핑/룰/환율 템플릿 관리
- CSV Export API
- (옵션) Basic Auth 도 유지 (사내망 보호용)

주의: 이 패키지는 "로컬/사내" 운영을 가정한 경량 서버(http.server) 기반입니다.
"""
import argparse, base64, csv, io, os, pathlib, sqlite3, sys, urllib.parse, json, re, shutil, threading, time, secrets, subprocess, zipfile
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, HTTPServer
import cgi

# import-safe
_ROOT = pathlib.Path(__file__).resolve().parents[2]
if _ROOT.as_posix() not in sys.path:
    sys.path.insert(0, _ROOT.as_posix())

from scripts.v329fh.security import (
    hash_password, verify_password, get_secret_key, new_session_token, session_user,
    role_at_least, mask_api_key, hash_api_key,
)

from scripts.v329fh.permissions import has_perm
from scripts.v329fh.ops_store import OpsStore
from scripts.v329fh.org import OrgStore
from scripts.v329fh.central_templates import CentralTemplates
from scripts.v329fh.reports import deliver_report
from scripts.v329fh import connectors as connectors

ROLE_RANK = {'viewer':0,'analyst':1,'manager':2,'admin':3}

def _role_max(a: str, b: str) -> str:
    return a if ROLE_RANK.get(a,0) >= ROLE_RANK.get(b,0) else b


from scripts.v329fh import connectors as connectors
from scripts.v329fh import marketplace as marketplace

PROJECT_ID_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_-]{1,50}$")

def run(cmd):
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    out, _ = p.communicate()
    return p.returncode, out

def parse_basic_auth(header_value: str):
    if not header_value or not header_value.lower().startswith("basic "):
        return None, None
    try:
        b64 = header_value.split(" ", 1)[1].strip()
        raw = base64.b64decode(b64).decode("utf-8", errors="ignore")
        if ":" not in raw:
            return raw, ""
        u, p = raw.split(":", 1)
        return u, p
    except Exception:
        return None, None

class UserManager:
    def __init__(self, workspace: pathlib.Path):
        self.workspace = workspace
        self.ops = ops
        self.org = OrgStore(workspace)
        self.central = CentralTemplates(workspace)
        self.approval_required = os.environ.get('GENIE_ROI_APPROVAL_REQUIRED','1') not in ('0','false','False')
        self.sso_enabled = os.environ.get('GENIE_ROI_SSO_ENABLED','0') in ('1','true','True')
        self.sso_header = os.environ.get('GENIE_ROI_SSO_HEADER','X-Auth-User')

        self.data_dir = workspace / "data"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.users_file = self.data_dir / "users.json"
        if not self.users_file.exists():
            # default admin/admin (반드시 변경 권장)
            users = {
                "version": 1,
                "users": {
                    "admin": {
                        "password_hash": hash_password("admin"),
                        "global_role": "admin",
                        "projects": {},
                        "created_at": datetime.utcnow().isoformat()+"Z",
                    }
                }
            }
            self.users_file.write_text(json.dumps(users, ensure_ascii=False, indent=2), encoding="utf-8")
        self._load()

    def _load(self):
        try:
            self.meta = json.loads(self.users_file.read_text(encoding="utf-8"))
        except Exception:
            self.meta = {"version": 1, "users": {}}
        self.users = self.meta.get("users") or {}

    def _save(self):
        self.meta["users"] = self.users
        self.users_file.write_text(json.dumps(self.meta, ensure_ascii=False, indent=2), encoding="utf-8")

    def authenticate(self, username: str, password: str) -> bool:
        self._load()
        u = (username or "").strip()
        rec = self.users.get(u)
        if not rec:
            return False
        return verify_password(password or "", rec.get("password_hash", ""))

    def get_user(self, username: str):
        self._load()
        return self.users.get(username)

    def list_users(self):
        self._load()
        out=[]
        for u, rec in sorted(self.users.items()):
            out.append({
                "username": u,
                "global_role": rec.get("global_role","viewer"),
                "projects": rec.get("projects",{}),
                "created_at": rec.get("created_at")
            })
        return out

    def set_password(self, username: str, new_password: str):
        self._load()
        if username not in self.users:
            raise ValueError("user not found")
        self.users[username]["password_hash"] = hash_password(new_password)
        self.users[username]["updated_at"] = datetime.utcnow().isoformat()+"Z"
        self._save()

    def upsert_user(self, username: str, password: str, global_role: str = "viewer", projects: dict | None = None):
        self._load()
        u = (username or "").strip()
        if not u or not re.match(r"^[a-zA-Z0-9][a-zA-Z0-9_.-]{1,60}$", u):
            raise ValueError("invalid username")
        rec = self.users.get(u) or {}
        if password:
            rec["password_hash"] = hash_password(password)
        rec["global_role"] = global_role or rec.get("global_role") or "viewer"
        rec["projects"] = projects if projects is not None else rec.get("projects", {})
        if "created_at" not in rec:
            rec["created_at"] = datetime.utcnow().isoformat()+"Z"
        rec["updated_at"] = datetime.utcnow().isoformat()+"Z"
        self.users[u] = rec
        self._save()

    def delete_user(self, username: str):
        self._load()
        if username in self.users:
            del self.users[username]
            self._save()

    
    def _load_users(self) -> dict:
        try:
            return json.loads(self.users_file.read_text(encoding="utf-8"))
        except Exception:
            return {"version": 1, "users": {}}

    def _save_users(self, data: dict) -> None:
        self.users_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    def _user_exists(self, username: str) -> bool:
        data = self._load_users()
        return username in (data.get("users") or {})

    def _provision_user(self, username: str, *, source: str="oidc") -> None:
        """
        Auto-provision SSO/OIDC users as viewer by default.
        Admins can later elevate role or assign teams in Org UI.
        """
        data = self._load_users()
        users = data.setdefault("users", {})
        if username in users:
            return
        users[username] = {
            "role": "viewer",
            "password_hash": "",  # SSO/OIDC
            "created_at": datetime.utcnow().isoformat() + "Z",
            "source": source,
        }
        self._save_users(data)
        try:
            self.ops.audit(username, None, "user.provision", "users", {"source": source})
        except Exception:
            pass

    def role_for_project(self, username: str, project_id: str) -> str:
        rec = self.get_user(username) or {}
        gr = rec.get("global_role", "viewer")
        if gr == "admin":
            return "admin"
        pr = (rec.get("projects") or {}).get(project_id)
        return pr or gr or "viewer"

class ProjectManager:
    def __init__(self, workspace: pathlib.Path):
        self.workspace = workspace

        self.data_dir = self.workspace / "data"
        self.projects_dir = self.workspace / "projects"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.projects_dir.mkdir(parents=True, exist_ok=True)
        self.projects_file = self.data_dir / "projects.json"
        if not self.projects_file.exists():
            self.projects_file.write_text(json.dumps({"version":2,"default":"demo","projects":{}}, ensure_ascii=False, indent=2), encoding="utf-8")
        self._load()

        # ensure default exists
        default_id = self.meta.get("default") or "demo"
        if default_id not in self.projects:
            self.create_project(default_id, "Demo Project")

    def _load(self):
        try:
            self.meta = json.loads(self.projects_file.read_text(encoding="utf-8"))
        except Exception:
            self.meta = {"version":2,"default":"demo","projects":{}}
        self.projects = self.meta.get("projects") or {}

    def _save(self):
        self.meta["projects"] = self.projects
        self.projects_file.write_text(json.dumps(self.meta, ensure_ascii=False, indent=2), encoding="utf-8")

    def list_projects(self):
        self._load()
        out=[]
        for pid, p in sorted(self.projects.items(), key=lambda x: x[0]):
            out.append({"id":pid, "name":p.get("name",pid)})
        return out, (self.meta.get("default") or "demo")

    def get(self, project_id: str):
        self._load()
        pid = project_id or (self.meta.get("default") or "demo")
        if pid not in self.projects:
            pid = (self.meta.get("default") or "demo")
        p = self.projects.get(pid) or {}
        root = self.projects_dir / pid
        db_path = root / "data" / "genie_roi.db"
        return pid, p.get("name", pid), root, db_path


    def project_root(self, project_id: str) -> pathlib.Path:
        """Return project root path and ensure v325 templates exist."""
        pid = (project_id or (self.meta.get("default") or "demo")).strip()
        root = self.projects_dir / pid
        # migrate templates folder if needed
        tdir = root/"templates"/"v325"
        if not tdir.exists():
            tdir.mkdir(parents=True, exist_ok=True)
            base_templates = self.workspace/"templates"/"v325"
            if base_templates.exists():
                for f in base_templates.glob("*.json"):
                    shutil_copy(f, tdir/f.name)
        return root

    def create_project(self, project_id: str, name: str):
        self._load()
        pid = (project_id or "").strip()
        if not PROJECT_ID_RE.match(pid):
            raise ValueError("project_id must match ^[a-zA-Z0-9][a-zA-Z0-9_-]{1,50}$")
        if pid in self.projects:
            raise ValueError("project_id already exists")
        root = self.projects_dir / pid
        (root/"data").mkdir(parents=True, exist_ok=True)
        (root/"out").mkdir(parents=True, exist_ok=True)
        (root/"templates"/"v325").mkdir(parents=True, exist_ok=True)

        init_py = (self.workspace/"scripts"/"v325"/"init_db.py").as_posix()
        code, out = run([sys.executable, init_py, "--db", (root/"data"/"genie_roi.db").as_posix()])
        if code != 0:
            raise RuntimeError(out)

        # seed templates
        base_templates = self.workspace / "templates" / "v325"
        if base_templates.exists():
            for f in base_templates.glob("*.json"):
                shutil_copy(f, root/"templates"/"v325"/f.name)

        # seed api keys file
        (root/"data").mkdir(parents=True, exist_ok=True)
        (root/"data"/"api_keys.json").write_text(json.dumps({"version":1,"keys":[]}, ensure_ascii=False, indent=2), encoding="utf-8")

        self.projects[pid] = {"name": name or pid, "created_at": datetime.utcnow().isoformat()+"Z"}
        self._save()
        return pid

def shutil_copy(src: pathlib.Path, dst: pathlib.Path):
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(src.read_bytes())

def json_to_csv_bytes(rows):
    if not rows:
        return b""
    cols=set()
    for r in rows:
        cols.update(r.keys())
    cols=list(cols); cols.sort()
    buf=io.StringIO()
    w=csv.DictWriter(buf, fieldnames=cols, extrasaction="ignore")
    w.writeheader()
    for r in rows:
        w.writerow(r)
    return buf.getvalue().encode("utf-8")

def sync_custom_mappers_file(db_path: str, project_root: pathlib.Path):
    db = sqlite3.connect(db_path)
    cur = db.cursor()
    cur.execute("SELECT channel, mapping_json FROM custom_mappers")
    channels = {}
    for ch, mj in cur.fetchall():
        try: channels[ch] = json.loads(mj)
        except Exception: pass
    db.close()
    (project_root/"templates"/"v325").mkdir(parents=True, exist_ok=True)
    (project_root/"templates"/"v325"/"custom_mappers.json").write_text(
        json.dumps({"version":1,"channels":channels}, ensure_ascii=False, indent=2), encoding="utf-8"
    )

class Scheduler:
    def __init__(self, server):
        self.server = server
        self.stop_event = threading.Event()
        self.thread = None

    def start(self):
        enabled = os.environ.get("GENIE_ROI_SCHEDULER_ENABLED", "1").strip() != "0"
        if not enabled:
            return
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()

    def _next_run_ts(self):
        # local time (server TZ)
        t = os.environ.get("GENIE_ROI_SCHEDULE_TIME", "03:00").strip()
        try:
            hh, mm = t.split(":", 1)
            hh = int(hh); mm = int(mm)
        except Exception:
            hh, mm = 3, 0
        now = datetime.now()
        target = now.replace(hour=hh, minute=mm, second=0, microsecond=0)
        if target <= now:
            target = target + timedelta(days=1)
        return target

    def _run_loop(self):
        while not self.stop_event.is_set():
            target = self._next_run_ts()
            while not self.stop_event.is_set() and datetime.now() < target:
                time.sleep(1.0)
            if self.stop_event.is_set():
                break
            try:
                self.server.app.refresh_all_projects(reason=f"scheduled@{target.isoformat(timespec='minutes')}")
            except Exception:
                pass

    def stop(self):
        self.stop_event.set()

class App:
    def __init__(self, pm: ProjectManager, um: UserManager, workspace: pathlib.Path, ops: OpsStore):
        self.pm = pm
        self.um = um
        self.workspace = workspace
        self.ops = ops
        self.org = OrgStore(workspace)
        self.central = CentralTemplates(workspace)
        self.approval_required = os.environ.get('GENIE_ROI_APPROVAL_REQUIRED','1') not in ('0','false','False')
        self.sso_enabled = os.environ.get('GENIE_ROI_SSO_ENABLED','0') in ('1','true','True')
        self.sso_header = os.environ.get('GENIE_ROI_SSO_HEADER','X-Auth-User')


        self.basic_auth = os.environ.get("GENIE_ROI_BASIC_AUTH","").strip()
        self.cookie_name = "genie_roi_session"
        self.session_ttl_seconds = int(os.environ.get("GENIE_ROI_SESSION_TTL", "43200"))  # 12h
        self.secret = get_secret_key((workspace/"data"/"secret.key").as_posix())

    # ---- Auth / RBAC ----
    def require_basic_auth(self, handler: BaseHTTPRequestHandler) -> bool:
        if not self.basic_auth:
            return True
        exp_user, exp_pass = self.basic_auth.split(":", 1) if ":" in self.basic_auth else (self.basic_auth, "")
        got_user, got_pass = parse_basic_auth(handler.headers.get("Authorization",""))
        ok = (got_user == exp_user) and (got_pass == exp_pass)
        if not ok:
            handler.send_response(401)
            handler.send_header("WWW-Authenticate", 'Basic realm="GENIE_ROI V325"')
            handler.send_header("Content-Type","text/plain; charset=utf-8")
            handler.end_headers()
            handler.wfile.write("Authentication required\n".encode("utf-8"))
        return ok

    def get_cookie(self, handler: BaseHTTPRequestHandler, name: str) -> str | None:
        c = handler.headers.get('Cookie','')
        if not c:
            return None
        parts = [p.strip() for p in c.split(';')]
        for p in parts:
            if '=' in p:
                k,v = p.split('=',1)
                if k.strip() == name:
                    return v.strip()
        return None

    def current_user(self, handler: BaseHTTPRequestHandler):
        # 1) OIDC Bearer token (if enabled)
        try:
            from oidc import load_config, JWKSCache, verify_jwt, extract_username
            cfg = load_config()
            if cfg.enabled and cfg.jwks_url:
                authz = handler.headers.get("Authorization","")
                if authz.lower().startswith("bearer "):
                    token = authz.split(" ",1)[1].strip()
                    cache = getattr(self, "_jwks_cache", None)
                    if cache is None or cache.url != cfg.jwks_url:
                        cache = JWKSCache(cfg.jwks_url, cfg.ttl_seconds)
                        self._jwks_cache = cache
                    claims = verify_jwt(token, cfg, cache)
                    username = extract_username(claims, cfg.claim)
                    # auto-provision if missing
                    if not self._user_exists(username):
                        self._provision_user(username, source="oidc")
                    return username
        except Exception:
            pass

        # 2) SSO header (behind reverse proxy)
        if self.sso_enabled:
            u = handler.headers.get(self.sso_header, "").strip()
            if u:
                if not self._user_exists(u):
                    self._provision_user(u, source="sso")
                return u

        # 3) Session cookie
        token = self.get_cookie(handler, self.cookie_name) or ""
        su = session_user(token, self.secret)
        if not su:
            return None
        username, payload = su
        return username

    def set_session(self, handler: BaseHTTPRequestHandler, username: str):
        tok = new_session_token(username, ttl_seconds=self.session_ttl_seconds, secret=self.secret)
        handler.send_header("Set-Cookie", f"{self.cookie_name}={tok}; Path=/; HttpOnly; SameSite=Lax")

    def clear_session(self, handler: BaseHTTPRequestHandler):
        handler.send_header("Set-Cookie", f"{self.cookie_name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax")

    def require_login(self, handler: BaseHTTPRequestHandler) -> str | None:
        # SSO header mode (OIDC/SAML via reverse proxy): trust header containing user id
        if self.sso_enabled:
            sso_user = handler.headers.get(self.sso_header) or handler.headers.get('Remote-User')
            if sso_user:
                sso_user = sso_user.strip()
                if not self.um.get_user(sso_user):
                    self.um.upsert_user(sso_user, password='', global_role='viewer', projects={})
                    self.ops.audit('sso:auto_provision', username=sso_user, project_id=None, resource='user', detail={})
                self.set_session(handler, sso_user)
                return sso_user
        u = self.current_user(handler)
        if u:
            return u
        # redirect to login
        handler.send_response(302)
        handler.send_header('Location', '/login')
        handler.end_headers()
        return None

    def role_for(self, username: str, project_id: str) -> str:
        direct = self.um.role_for_project(username, project_id)
        inherited = self.org.effective_role_for_user(username, project_id)
        if inherited:
            return _role_max(direct, inherited)
        return direct

    def require_role(self, handler: BaseHTTPRequestHandler, username: str, project_id: str, required: str) -> bool:
        role = self.role_for(username, project_id)
        if role_at_least(role, required):
            return True
        handler.send_response(403)
        handler.send_header("Content-Type","application/json; charset=utf-8")
        handler.end_headers()
        handler.wfile.write(json.dumps({"error":"forbidden","required":required,"role":role}, ensure_ascii=False).encode('utf-8'))
        return False

    def require_perm(self, handler: BaseHTTPRequestHandler, username: str, project_id: str, perm: str) -> bool:
        role = self.role_for(username, project_id)
        team_perms = self.org.effective_perms_for_user(username, project_id)
        if has_perm(role, perm) or (perm in team_perms):
            return True
        handler.send_response(403)
        handler.send_header('Content-Type','application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'error':'forbidden','permission':perm,'role':role}, ensure_ascii=False).encode('utf-8'))
        return False

    # ---- API keys ----
    def _api_keys_path(self, project_root: pathlib.Path) -> pathlib.Path:
        return project_root/"data"/"api_keys.json"

    def load_api_keys(self, project_root: pathlib.Path):
        p = self._api_keys_path(project_root)
        if not p.exists():
            return {"version":1,"keys":[]}
        try:
            return json.loads(p.read_text(encoding='utf-8'))
        except Exception:
            return {"version":1,"keys":[]}

    def save_api_keys(self, project_root: pathlib.Path, meta: dict):
        p = self._api_keys_path(project_root)
        p.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')

    def api_key_role(self, project_root: pathlib.Path, api_key: str) -> str | None:
        if not api_key:
            return None
        meta = self.load_api_keys(project_root)
        h = hash_api_key(api_key)
        for rec in meta.get('keys', []):
            if rec.get('hash') == h and rec.get('revoked_at') is None:
                return rec.get('role','viewer')
        return None

    def create_api_key(self, project_root: pathlib.Path, label: str, role: str, created_by: str):
        meta = self.load_api_keys(project_root)
        raw = "gk_" + secrets.token_urlsafe(32)
        rec = {
            "label": (label or "API key"),
            "role": role or "viewer",
            "hash": hash_api_key(raw),
            "created_by": created_by,
            "created_at": datetime.utcnow().isoformat()+"Z",
            "revoked_at": None,
        }
        meta.setdefault('keys', []).append(rec)
        self.save_api_keys(project_root, meta)
        return raw

    def revoke_api_key(self, project_root: pathlib.Path, key_hash: str, revoked_by: str):
        meta = self.load_api_keys(project_root)
        changed=False
        for rec in meta.get('keys', []):
            if rec.get('hash') == key_hash and rec.get('revoked_at') is None:
                rec['revoked_at'] = datetime.utcnow().isoformat()+"Z"
                rec['revoked_by'] = revoked_by
                changed=True
        if changed:
            self.save_api_keys(project_root, meta)
        return changed

    # ---- Refresh (scheduler/manual) ----
    def refresh_project(self, project_id: str, reason: str = "manual"):
        pid, pname, proot, db_path = self.pm.get(project_id)
        gen_py = (self.workspace/"scripts"/"v325"/"generate_dashboard_json.py").as_posix()
        # project-local template defaults
        fx = (proot/"templates"/"v325"/"fx_rates.json").as_posix()
        da = (proot/"templates"/"v325"/"default_attribution.json").as_posix()
        code, out = run([sys.executable, gen_py, "--db", db_path.as_posix(), "--out", (proot/"out").as_posix(), "--fx", fx, "--default-attribution", da])
        return code, out, {"project": pid, "name": pname, "reason": reason}

    def refresh_all_projects(self, reason: str = "scheduled"):
        projects, _ = self.pm.list_projects()
        results=[]
        for p in projects:
            try:
                code, out, meta = self.refresh_project(p['id'], reason=reason)
                results.append({"project":p['id'],"code":code,"ok":code==0,"log":out[-2000:],"reason":reason})
            except Exception as e:
                results.append({"project":p['id'],"code":1,"ok":False,"log":str(e),"reason":reason})
        return results

class Handler(BaseHTTPRequestHandler):
    def _send_json(self, obj, code=200, headers: dict | None = None):
        self.send_response(code)
        self.send_header("Content-Type","application/json; charset=utf-8")
        self.send_header("Cache-Control","no-store")
        if headers:
            for k,v in headers.items():
                self.send_header(k,v)
        self.end_headers()
        self.wfile.write(json.dumps(obj, ensure_ascii=False).encode("utf-8"))

    def _send_html(self, html: str, code=200, headers: dict | None = None):
        self.send_response(code)
        self.send_header("Content-Type","text/html; charset=utf-8")
        self.send_header("Cache-Control","no-store")
        if headers:
            for k,v in headers.items():
                self.send_header(k,v)
        self.end_headers()
        self.wfile.write(html.encode('utf-8'))

    def _send_text(self, txt: str, code=200):
        self.send_response(code)
        self.send_header("Content-Type","text/plain; charset=utf-8")
        self.send_header("Cache-Control","no-store")
        self.end_headers()
        self.wfile.write(txt.encode("utf-8"))

    def guess_type(self, p):
        p=p.lower()
        if p.endswith(".html"): return "text/html; charset=utf-8"
        if p.endswith(".css"): return "text/css; charset=utf-8"
        if p.endswith(".js"): return "application/javascript; charset=utf-8"
        if p.endswith(".json"): return "application/json; charset=utf-8"
        if p.endswith(".png"): return "image/png"
        if p.endswith(".svg"): return "image/svg+xml"
        return "application/octet-stream"

    def serve_file_abs(self, abs_path: pathlib.Path, content_type: str):
        if not abs_path.exists() or not abs_path.is_file():
            self.send_response(404); self.end_headers(); return
        data = abs_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control","no-store")
        self.end_headers()
        self.wfile.write(data)

    def _resolve_project(self):
        # 1) prefix /p/<pid>/...
        path = self.path
        parsed = urllib.parse.urlparse(path)
        pure_path = parsed.path
        qs = urllib.parse.parse_qs(parsed.query or "")
        pid = None
        rest_path = pure_path

        if pure_path.startswith("/p/"):
            parts = pure_path.split("/")
            if len(parts) >= 3:
                pid = parts[2] or None
                rest_path = "/" + "/".join(parts[3:])
                if rest_path == "//": rest_path = "/"
        if not pid:
            pid = (qs.get("project", [None])[0]) or None

        pid, pname, proot, db_path = self.server.pm.get(pid)
        return pid, pname, proot, db_path, parsed, rest_path, qs

    def _api_auth_context(self, project_root: pathlib.Path, project_id: str):
        # returns (kind, principal, role) or (None,...)
        # 1) user session
        u = self.server.app.current_user(self)
        if u:
            return ("user", u, self.server.app.role_for(u, project_id))
        # 2) API key
        api_key = self.headers.get("X-API-Key", "").strip()
        r = self.server.app.api_key_role(project_root, api_key)
        if r:
            return ("api_key", mask_api_key(api_key), r)
        return (None, None, None)

    def do_GET(self):
        if not self.server.app.require_basic_auth(self):
            return

        pid, pname, proot, db_path, parsed, rest_path, qs = self._resolve_project()

        # --- pixel ingest ---
        if rest_path in ("/pixel/e", "/pixel/e/"):
            length = int(self.headers.get('Content-Length','0') or '0')
            raw = self.rfile.read(length) if length>0 else b"{}"
            try:
                payload = json.loads(raw.decode('utf-8'))
            except Exception:
                self._send_json({"ok": False, "error": "bad_json"}, status=400)
                return
            # project_id can come from payload, but enforce pid when available
            proj = pid or payload.get('project_id')
            if not proj:
                self._send_json({"ok": False, "error": "missing_project"}, status=400)
                return
            # first-party cookie
            def _set_cookie(name, value, max_age):
                self.send_header('Set-Cookie', f"{name}={urllib.parse.quote(value)}; Path=/; Max-Age={int(max_age)}; SameSite=Lax")
            anon = pixel_mod.get_or_set_anonymous_id(dict(self.headers), _set_cookie, cookie_name="_genie_fp")
            ename = payload.get('event_name') or 'event'
            ops = self.server.app.ops
            schema_version = int(payload.get('schema_version') or 1)
            event_id = str(payload.get('event_id') or secrets.token_hex(16))
            source = str(payload.get('source') or 'browser')
            event_ts = None
            try:
                if isinstance(payload.get('event_ts_ms'), (int,float)):
                    event_ts = datetime.utcfromtimestamp(float(payload['event_ts_ms'])/1000.0).replace(microsecond=0).isoformat()+'Z'
            except Exception:
                event_ts = None
            ops = self.server.app.ops
            _inserted = ops.add_pixel_event(
                project_id=proj, source=source, schema_version=schema_version, event_id=event_id,
                event_name=str(ename), event=payload, anonymous_id=anon, user_id=None,
                event_ts=event_ts, dedupe_key=str(payload.get('dedupe_key') or '')
            )
            if ename == 'identify':
                ids = pixel_mod.normalize_identity_payload(payload.get('props') or {})
                for k,v in ids.items():
                    ops.add_id_edge(project_id=proj, src_type='anon', src_value=anon, dst_type=k, dst_value=str(v), confidence=(0.95 if k=='email_hash' else 0.9 if k=='customer_id' else 0.8 if k=='phone_hash' else 0.6), evidence='identify')
            self._send_json({"ok": True})
            return

        if rest_path in ("/pixel/s2s", "/pixel/s2s/"):
            # Requires API Key auth like other APIs
            if not pid:
                self._send_json({"ok": False, "error": "missing_project"}, status=400)
                return
            ctx = self._api_auth_context(proot, pid)
            if not ctx.get('ok'):
                self._send_json(ctx, status=401)
                return
            length = int(self.headers.get('Content-Length','0') or '0')
            raw = self.rfile.read(length) if length>0 else b"{}"
            try:
                payload = json.loads(raw.decode('utf-8'))
            except Exception:
                self._send_json({"ok": False, "error": "bad_json"}, status=400)
                return
            anon = payload.get('anonymous_id')
            ename = payload.get('event_name') or 'server_event'
            self.server.app.ops.add_pixel_event(project_id=pid, anonymous_id=anon, event_name=str(ename), event=payload)
            self._send_json({"ok": True})
            return

        # --- first-party pixel ---
        if rest_path in ("/pixel/p.js", "/pixel/p.js/"):
            if not pid:
                self._send_json({"ok": False, "error": "missing_project"}, status=400)
                return
            js = pixel_mod.make_pixel_js(project_id=pid, endpoint="/pixel/e", cookie_name="_genie_fp")
            self.send_response(200)
            self.send_header("Content-Type", "application/javascript; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(js.encode("utf-8"))
            return


        # --- auth pages ---
        if rest_path in ("/login", "/login/"):
            html = (self.server.workspace/"dashboard"/"login_v328.html").read_text(encoding='utf-8')
            self._send_html(html.replace("{{NOW}}", datetime.utcnow().isoformat()+"Z"))
            return

        if rest_path in ("/logout", "/logout/"):
            self.send_response(302)
            self.server.app.clear_session(self)
            self.send_header('Location','/login')
            self.end_headers()
            return

        # --- project home requires login ---
        if rest_path in ("/", ""):
            u = self.server.app.require_login(self)
            if not u: return
            projects, default_id = self.server.pm.list_projects()
            html = (self.server.workspace/"dashboard"/"projects_v328.html").read_text(encoding='utf-8')
            payload = {"projects":projects,"default":default_id, "user":u}
            self._send_html(html.replace("{{PROJECTS_JSON}}", json.dumps(payload, ensure_ascii=False)))
            return

        # --- UI & dashboard ---
        if rest_path in ("/ui", "/ui/"):
            u = self.server.app.require_login(self)
            if not u: return
            # viewer+ can access UI (upload form hidden by JS if role low)
            self.serve_file_abs(self.server.workspace/"dashboard"/"ui_v328.html", "text/html; charset=utf-8")
            return

        if rest_path.startswith("/dashboard/"):
            # allow viewer via session OR API key(role>=viewer)
            kind, principal, role = self._api_auth_context(proot, pid)
            if not role:
                u = self.server.app.require_login(self)
                if not u: return
                role = self.server.app.role_for(u, pid)
            if not role_at_least(role, "viewer"):
                self._send_json({"error":"forbidden"}, 403); return
            rel = rest_path[len("/dashboard/"):] or "index_v328.html"
            self.serve_file_abs(self.server.workspace/"dashboard"/rel, self.guess_type(rel)); return

        # project static (out/templates)
        if rest_path.startswith("/out/"):
            kind, principal, role = self._api_auth_context(proot, pid)
            if not role:
                u = self.server.app.require_login(self)
                if not u: return
                role = self.server.app.role_for(u, pid)
            if not role_at_least(role, "viewer"):
                self._send_json({"error":"forbidden"}, 403); return
            rel = rest_path[len("/out/"):]
            self.serve_file_abs(proot/"out"/rel, self.guess_type(rel)); return

        if rest_path.startswith("/templates/"):
            u = self.server.app.require_login(self)
            if not u: return
            if not self.server.app.require_perm(self, u, pid, 'data:upload'):
                return
            rel = rest_path[len("/templates/"):]
            self.serve_file_abs(proot/"templates"/rel, self.guess_type(rel)); return

        # --- API ---
        if rest_path.startswith("/api/version"):
            kind, principal, role = self._api_auth_context(proot, pid)
            if not role:
                u = self.server.app.require_login(self)
                if not u: return
                role = self.server.app.role_for(u, pid)
            self._send_json({"version":"V329fh","project":pid,"project_name":pname,"principal":principal,"role":role,"now":datetime.utcnow().isoformat()+"Z"}); return

        
        if rest_path.startswith("/api/mmm"):
            # analyst+ recommended (viewer can view)
            kind, principal, role = self._api_auth_context(proot, pid)
            if not role:
                u = self.server.app.require_login(self)
                if not u: return
                role = self.server.app.role_for(u, pid)
            # allow viewer, but keep minimal
            out_path = (proot/"out"/"dashboard_ads_kpi.json")
            if not out_path.exists():
                self._send_json({"ok": False, "error":"dashboard not generated"}); return
            data = json.loads(out_path.read_text(encoding="utf-8"))
            days = int(qs.get("days",[30])[0]) if qs else 30
            daily = (data.get("daily") or [])[-days:]
            # Build rows: channel spend, and revenue (attributed+unattributed if available)
            spend_rows=[]
            revenue=[]
            for r in daily:
                spend_rows.append(r.get("spend_by_channel", {}) or {})
                revenue.append(float(r.get("revenue_total") or r.get("revenue") or 0.0))
            try:
                from mmm import ols
                coefs = ols(spend_rows, revenue, add_intercept=True)
                self._send_json({"ok": True, "days": days, "coefficients": coefs})
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)})
            return

        if rest_path.startswith("/api/projects"):
            u = self.server.app.require_login(self)
            if not u: return
            # viewer+ list, admin can create via POST
            projects, default_id = self.server.pm.list_projects()
            self._send_json({"version":"V329fh","default":default_id,"projects":projects,"user":u}); return

        if rest_path.startswith("/api/status"):
            kind, principal, role = self._api_auth_context(proot, pid)
            if not role:
                u = self.server.app.require_login(self)
                if not u: return
                role = self.server.app.role_for(u, pid)
            if not role_at_least(role, "viewer"):
                self._send_json({"error":"forbidden"}, 403); return

            try:
                db = sqlite3.connect(db_path.as_posix())
                cur = db.cursor()
                cfg = cur.execute("SELECT config_json, updated_at FROM attribution_config WHERE id=1").fetchone()
                ads_cnt = cur.execute("SELECT COUNT(*) FROM ads_daily").fetchone()[0]
                conv_cnt = cur.execute("SELECT COUNT(*) FROM conversions_daily").fetchone()[0]
                mcnt = cur.execute("SELECT COUNT(*) FROM custom_mappers").fetchone()[0]
                db.close()
                chain = json.loads(cfg[0]).get("chain",[]) if cfg and cfg[0] else []
                json_path = proot/"out"/"dashboard_ads_kpi.json"
                mtime = datetime.fromtimestamp(json_path.stat().st_mtime).isoformat(timespec="seconds") if json_path.exists() else "-"
                self._send_json({
                    "version":"V329fh","project":pid,"project_name":pname,
                    "counts":{"ads_daily":ads_cnt,"conversions_daily":conv_cnt,"custom_mappers":mcnt},
                    "chain":chain,"dashboard_json_mtime":mtime,"principal":principal,"role":role
                }); return
            except Exception as e:
                self._send_json({"error":str(e)}, 500);
        if rest_path.startswith("/api/id_graph/summary"):
            kind, principal, role = self._api_auth_context(proot, pid)
            if not role:
                u = self.server.app.require_login(self)
                if not u: return
                role = self.server.app.role_for(u, pid)
            if not role_at_least(role, "viewer"):
                self._send_json({"error":"forbidden"}, 403); return
            summary = self.server.app.ops.get_id_graph_summary(pid, limit_groups=50, limit_identities=20)
            self._send_json({"ok": True, **summary}); return

        if rest_path.startswith("/api/export"):
            kind, principal, role = self._api_auth_context(proot, pid)
            if not role:
                u = self.server.app.require_login(self)
                if not u: return
                role = self.server.app.role_for(u, pid)
            if not role_at_least(role, "analyst"):
                self._send_json({"error":"forbidden"}, 403); return
            fmt = (qs.get("format", ["json"])[0] or "json").lower()
            scope = (qs.get("scope", ["dashboard_rows"])[0] or "dashboard_rows").lower()

            if scope == "dashboard_rows":
                json_path = proot/"out"/"dashboard_ads_kpi.json"
                if not json_path.exists():
                    self._send_json({"error":"dashboard json not found"}, 404); return
                data = json.loads(json_path.read_text(encoding='utf-8'))
                rows = data.get("rows") or []
            elif scope == "pixel_events":
                # export recent pixel events
                with self.server.app.ops._conn() as con:
                    rows = [
                        {"received_ts":r[0],"source":r[1],"schema_version":r[2],"event_id":r[3],
                         "anonymous_id":r[4],"user_id":r[5],"event_name":r[6],"event_ts":r[7],"event_json":json.loads(r[8])}
                        for r in con.execute(
                            "SELECT received_ts,source,schema_version,event_id,anonymous_id,user_id,event_name,event_ts,event_json "
                            "FROM pixel_events_v329fh WHERE project_id=? ORDER BY received_ts DESC LIMIT 5000",
                            (pid,)
                        ).fetchall()
                    ]
            elif scope == "id_graph_nodes":
                with self.server.app.ops._conn() as con:
                    rows = [
                        {"id_type":r[0],"id_value":r[1],"first_seen":r[2],"last_seen":r[3],"best_confidence":r[4],"group_id":r[5]}
                        for r in con.execute(
                            "SELECT id_type,id_value,first_seen_ts,last_seen_ts,best_confidence,group_id "
                            "FROM id_graph_nodes_v329fh WHERE project_id=? ORDER BY best_confidence DESC, last_seen_ts DESC LIMIT 20000",
                            (pid,)
                        ).fetchall()
                    ]
            else:
                self._send_json({"error":"unknown scope"}, 400); return

            if fmt == "json":
                body = json.dumps({"project_id":pid,"scope":scope,"rows":rows}, ensure_ascii=False).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type","application/json; charset=utf-8")
                self.send_header("Content-Disposition", f'attachment; filename="{pid}_{scope}.json"')
                self.send_header("Cache-Control","no-store")
                self.end_headers()
                self.wfile.write(body); return
            elif fmt == "csv":
                body = json_to_csv_bytes(rows)
                self.send_response(200)
                self.send_header("Content-Type","text/csv; charset=utf-8")
                self.send_header("Content-Disposition", f'attachment; filename="{pid}_{scope}.csv"')
                self.send_header("Cache-Control","no-store")
                self.end_headers()
                self.wfile.write(body); return
            else:
                self._send_json({"error":"unknown format"}, 400); return

        if rest_path.startswith("/api/report_bundle"):
            kind, principal, role = self._api_auth_context(proot, pid)
            if not role:
                u = self.server.app.require_login(self)
                if not u: return
                role = self.server.app.role_for(u, pid)
                principal = u.get("username")
            if not role_at_least(role, "analyst"):
                self._send_json({"error":"forbidden"}, 403); return

            # Build a lightweight bundle: dashboard json + id graph summary + generated md report
            json_path = proot/"out"/"dashboard_ads_kpi.json"
            dashboard = json.loads(json_path.read_text(encoding='utf-8')) if json_path.exists() else {}
            idsum = self.server.app.ops.get_id_graph_summary(pid, limit_groups=80, limit_identities=30)

            md = []
            md.append(f"# GENIE_ROI V329fh Report Bundle\n")
            md.append(f"- project_id: **{pid}**\n- generated_at: {datetime.utcnow().isoformat(timespec='seconds')}Z\n- requested_by: {principal}\n")
            md.append("## KPI 요약\n")
            try:
                spend = sum(float(r.get('spend') or 0) for r in (dashboard.get('rows') or []))
                rev = sum(float(r.get('revenue') or 0) for r in (dashboard.get('rows') or []))
                roas = (rev/spend) if spend>0 else None
                md.append(f"- spend: {spend:,.0f}\n- revenue(attrib): {rev:,.0f}\n- ROAS: {(roas if roas is not None else 'NA')}\n")
            except Exception:
                pass
            md.append("\n## 포함 파일\n- dashboard_ads_kpi.json\n- id_graph_summary.json\n- report.md\n")

            buf = io.BytesIO()
            with zipfile.ZipFile(buf, 'w', compression=zipfile.ZIP_DEFLATED) as z:
                z.writestr("report.md", "\n".join(md))
                z.writestr("dashboard_ads_kpi.json", json.dumps(dashboard, ensure_ascii=False, indent=2))
                z.writestr("id_graph_summary.json", json.dumps(idsum, ensure_ascii=False, indent=2))
            body = buf.getvalue()
            self.send_response(200)
            self.send_header("Content-Type","application/zip")
            self.send_header("Content-Disposition", f'attachment; filename="{pid}_report_bundle_v329fh.zip"')
            self.send_header("Cache-Control","no-store")
            self.end_headers()
            self.wfile.write(body); return


        if rest_path.startswith("/api/export_csv"):
            kind, principal, role = self._api_auth_context(proot, pid)
            if not role:
                u = self.server.app.require_login(self)
                if not u: return
                role = self.server.app.role_for(u, pid)
            if not role_at_least(role, "analyst"):
                self._send_json({"error":"forbidden"}, 403); return
            name = (qs.get("name", ["campaigns"])[0] or "campaigns").strip()
            json_path = proot/"out"/"dashboard_ads_kpi.json"
            if not json_path.exists():
                self._send_json({"error":"dashboard json not found"}, 404); return
            data = json.loads(json_path.read_text(encoding='utf-8'))
            rows=[]
            if name in ("campaigns","ad_groups","ads"):
                rows = (data.get("drilldown") or {}).get(name, [])
            elif name == "unattributed_cost_top":
                rows = ((data.get("diagnostics") or {}).get("unattributed_cost_top") or [])
            elif name == "match_explanations":
                rows = ((data.get("diagnostics") or {}).get("match_explanations") or [])
            else:
                self._send_json({"error":"unknown export name"}, 400); return

            body = json_to_csv_bytes(rows)
            self.send_response(200)
            self.send_header("Content-Type","text/csv; charset=utf-8")
            self.send_header("Content-Disposition", f'attachment; filename="{pid}_{name}.csv"')
            self.send_header("Cache-Control","no-store")
            self.end_headers()
            self.wfile.write(body)
            return

        if rest_path.startswith("/api/report/send"):
            kind, principal, role = self._api_auth_context(proot, pid)
            if not role:
                u = self.server.app.require_login(self)
                if not u: return
                role = self.server.app.role_for(u, pid)
                principal = u
            if not role_at_least(role, "analyst"):
                self._send_json({"error":"forbidden"}, 403); return
            res = deliver_report(proot, project_id=pid)
            self.server.ops.audit("report:deliver", username=principal, project_id=pid, resource="reports", detail={"result":res})
            try:
                self.server.ops._conn().execute("INSERT INTO report_deliveries(ts,project_id,requested_by,result_json) VALUES (?,?,?,?)",
                                                (datetime.utcnow().isoformat()+"Z", pid, principal, json.dumps(res)))
                self.server.ops._conn().commit()
            except Exception:
                pass
            self._send_json({"ok":True,"result":res})
            return

        if rest_path.startswith("/api/refresh"):
            kind, principal, role = self._api_auth_context(proot, pid)
            if not role:
                u = self.server.app.require_login(self)
                if not u: return
                role = self.server.app.role_for(u, pid)
                principal = u
            if not role_at_least(role, "analyst"):
                self._send_json({"error":"forbidden"}, 403); return
            code, out, meta = self.server.app.refresh_project(pid, reason=f"manual_by:{principal}")
            self._send_json({"ok":code==0,"code":code,"log":out,"meta":meta})
            return

        # --- V325 Org (teams/groups) admin ---
        if rest_path.startswith("/api/admin/org"):
            u = self.server.app.require_login(self)
            if not u: return
            if self.server.app.um.get_user(u).get("global_role") != "admin":
                self._send_json({"error":"forbidden"},403); return
            if rest_path == "/api/admin/org":
                self._send_json({"teams": self.server.app.org.list_teams()})
                return
            # subpaths handled in POST for mutations
        # --- V325 Central Templates admin ---
        if rest_path.startswith("/api/admin/central_templates"):
            u = self.server.app.require_login(self)
            if not u: return
            if self.server.app.um.get_user(u).get("global_role") != "admin":
                self._send_json({"error":"forbidden"},403); return
            if rest_path in ("/api/admin/central_templates", "/api/admin/central_templates/list"):
                self._send_json({"templates": self.server.app.central.list_templates()})
                return
        if rest_path.startswith("/api/admin/users"):
            u = self.server.app.require_login(self)
            if not u: return
            if not role_at_least(self.server.app.um.role_for_project(u, pid), "admin") and (self.server.app.um.get_user(u) or {}).get('global_role') != 'admin':
                self._send_json({"error":"forbidden"}, 403); return
            self._send_json({"users": self.server.app.um.list_users()})
            return

        if rest_path.startswith("/api/admin/api_keys"):
            u = self.server.app.require_login(self)
            if not u: return
            if not self.server.app.require_perm(self, u, pid, 'data:upload'):
                return
            meta = self.server.app.load_api_keys(proot)
            # mask hashes only; never return raw key
            safe=[]
            for rec in meta.get('keys', []):
                safe.append({k:v for k,v in rec.items() if k!='hash'} | {"hash": rec.get('hash')})
            self._send_json({"project":pid,"keys":safe})
            return

        self._send_json({"error":"not found","path":rest_path}, 404)

    def do_POST(self):
        if not self.server.app.require_basic_auth(self):
            return

        pid, pname, proot, db_path, parsed, rest_path, qs = self._resolve_project()

        # --- pixel ingest ---
        if rest_path in ("/pixel/e", "/pixel/e/"):
            length = int(self.headers.get('Content-Length','0') or '0')
            raw = self.rfile.read(length) if length>0 else b"{}"
            try:
                payload = json.loads(raw.decode('utf-8'))
            except Exception:
                self._send_json({"ok": False, "error": "bad_json"}, status=400)
                return
            # project_id can come from payload, but enforce pid when available
            proj = pid or payload.get('project_id')
            if not proj:
                self._send_json({"ok": False, "error": "missing_project"}, status=400)
                return
            # first-party cookie
            def _set_cookie(name, value, max_age):
                self.send_header('Set-Cookie', f"{name}={urllib.parse.quote(value)}; Path=/; Max-Age={int(max_age)}; SameSite=Lax")
            anon = pixel_mod.get_or_set_anonymous_id(dict(self.headers), _set_cookie, cookie_name="_genie_fp")
            ename = payload.get('event_name') or 'event'
            ops = self.server.app.ops
            schema_version = int(payload.get('schema_version') or 1)
            event_id = str(payload.get('event_id') or secrets.token_hex(16))
            source = str(payload.get('source') or 'browser')
            event_ts = None
            try:
                if isinstance(payload.get('event_ts_ms'), (int,float)):
                    event_ts = datetime.utcfromtimestamp(float(payload['event_ts_ms'])/1000.0).replace(microsecond=0).isoformat()+'Z'
            except Exception:
                event_ts = None
            ops = self.server.app.ops
            _inserted = ops.add_pixel_event(
                project_id=proj, source=source, schema_version=schema_version, event_id=event_id,
                event_name=str(ename), event=payload, anonymous_id=anon, user_id=None,
                event_ts=event_ts, dedupe_key=str(payload.get('dedupe_key') or '')
            )
            if ename == 'identify':
                ids = pixel_mod.normalize_identity_payload(payload.get('props') or {})
                for k,v in ids.items():
                    ops.add_id_edge(project_id=proj, src_type='anon', src_value=anon, dst_type=k, dst_value=str(v), confidence=(0.95 if k=='email_hash' else 0.9 if k=='customer_id' else 0.8 if k=='phone_hash' else 0.6), evidence='identify')
            self._send_json({"ok": True})
            return

        if rest_path in ("/pixel/s2s", "/pixel/s2s/"):
            # Requires API Key auth like other APIs
            if not pid:
                self._send_json({"ok": False, "error": "missing_project"}, status=400)
                return
            ctx = self._api_auth_context(proot, pid)
            if not ctx.get('ok'):
                self._send_json(ctx, status=401)
                return
            length = int(self.headers.get('Content-Length','0') or '0')
            raw = self.rfile.read(length) if length>0 else b"{}"
            try:
                payload = json.loads(raw.decode('utf-8'))
            except Exception:
                self._send_json({"ok": False, "error": "bad_json"}, status=400)
                return
            anon = payload.get('anonymous_id')
            ename = payload.get('event_name') or 'server_event'
            self.server.app.ops.add_pixel_event(project_id=pid, anonymous_id=anon, event_name=str(ename), event=payload)
            self._send_json({"ok": True})
            return

        # --- first-party pixel ---
        if rest_path in ("/pixel/p.js", "/pixel/p.js/"):
            if not pid:
                self._send_json({"ok": False, "error": "missing_project"}, status=400)
                return
            js = pixel_mod.make_pixel_js(project_id=pid, endpoint="/pixel/e", cookie_name="_genie_fp")
            self.send_response(200)
            self.send_header("Content-Type", "application/javascript; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(js.encode("utf-8"))
            return


        # login submit
        if rest_path.startswith("/api/login"):
            length = int(self.headers.get('Content-Length','0') or '0')
            body = self.rfile.read(length).decode('utf-8', errors='ignore')
            form = urllib.parse.parse_qs(body)
            username = (form.get('username',[''])[0] or '').strip()
            password = (form.get('password',[''])[0] or '').strip()
            if self.server.app.um.authenticate(username, password):
                self.send_response(302)
                self.server.app.set_session(self, username)
                self.send_header('Location','/')
                self.end_headers()
            else:
                self.send_response(302)
                self.send_header('Location','/login?err=1')
                self.end_headers()
            return

        # create project (admin)
        if rest_path.startswith("/api/projects/create"):
            u = self.server.app.require_login(self)
            if not u: return
            # global admin only
            if (self.server.app.um.get_user(u) or {}).get('global_role') != 'admin':
                self._send_json({"error":"forbidden"}, 403); return
            length = int(self.headers.get('Content-Length','0') or '0')
            body = self.rfile.read(length).decode('utf-8', errors='ignore')
            form = urllib.parse.parse_qs(body)
            project_id = (form.get('project_id',[''])[0] or '').strip()
            name = (form.get('name',[''])[0] or '').strip()
            try:
                pid2 = self.server.pm.create_project(project_id, name or project_id)
                self._send_json({"ok":True,"project":pid2})
            except Exception as e:
                self._send_json({"ok":False,"error":str(e)}, 400)
            return

        # admin: upsert user
        # --- V325 Org mutations ---
        if rest_path.startswith("/api/admin/org/"):
            u = self.server.app.require_login(self)
            if not u: return
            if self.server.app.um.get_user(u).get("global_role") != "admin":
                self._send_json({"error":"forbidden"},403); return
            body = self._read_json()
            if rest_path == "/api/admin/org/upsert_team":
                try:
                    self.server.app.org.upsert_team(body.get("team_id"), body.get("name"), body.get("parent","root"))
                    self.server.ops.audit("org:upsert_team", username=u, project_id=None, resource=body.get("team_id"), detail=body)
                    self._send_json({"ok":True})
                except Exception as e:
                    self._send_json({"ok":False,"error":str(e)},400)
                return
            if rest_path == "/api/admin/org/set_membership":
                try:
                    self.server.app.org.set_membership(body.get("username"), body.get("teams") or [])
                    self.server.ops.audit("org:set_membership", username=u, project_id=None, resource=body.get("username"), detail=body)
                    self._send_json({"ok":True})
                except Exception as e:
                    self._send_json({"ok":False,"error":str(e)},400)
                return
            if rest_path == "/api/admin/org/set_team_project_role":
                try:
                    self.server.app.org.set_team_project_role(body.get("team_id"), body.get("project_id"), body.get("role","viewer"))
                    self.server.ops.audit("org:set_team_project_role", username=u, project_id=body.get("project_id"), resource=body.get("team_id"), detail=body)
                    self._send_json({"ok":True})
                except Exception as e:
                    self._send_json({"ok":False,"error":str(e)},400)
                return

        # --- V325 Central Templates actions ---
        if rest_path.startswith("/api/admin/central_templates/"):
            u = self.server.app.require_login(self)
            if not u: return
            if self.server.app.um.get_user(u).get("global_role") != "admin":
                self._send_json({"error":"forbidden"},403); return
            body = self._read_json()
            if rest_path == "/api/admin/central_templates/create_version":
                try:
                    res = self.server.app.central.create_version(body.get("name"), body.get("payload") or {}, set_active=bool(body.get("set_active", False)))
                    self.server.ops.audit("central_templates:create_version", username=u, project_id=None, resource=body.get("name"), detail=res)
                    self._send_json({"ok":True, "result":res})
                except Exception as e:
                    self._send_json({"ok":False,"error":str(e)},400)
                return
            if rest_path == "/api/admin/central_templates/set_active":
                try:
                    self.server.app.central.set_active(body.get("name"), body.get("version"))
                    self.server.ops.audit("central_templates:set_active", username=u, project_id=None, resource=body.get("name"), detail=body)
                    self._send_json({"ok":True})
                except Exception as e:
                    self._send_json({"ok":False,"error":str(e)},400)
                return
            if rest_path == "/api/admin/central_templates/deploy":
                # Require approval before deploy (V327 operational)
                target = (body.get("target") or "ALL").strip()
                payload = {"target": target}
                if self.server.app.approval_required:
                    aid = self.server.ops.create_approval(project_id=None, requested_by=u, action="central_template_deploy", payload=payload)
                    self.server.ops.audit("central_templates:deploy_requested", username=u, project_id=None, resource=target, detail={"approval_id": aid})
                    try:
                        from notifier import notify
                        notify("approval_requested", title="Central template deploy requested", text=f"target={target}", extra={"approval_id": aid})
                    except Exception:
                        pass
                    self._send_json({"ok": True, "approval_required": True, "approval_id": aid}); return
                # If approvals disabled, deploy immediately
                results = {}
                bundle = self.server.app.central.export_active_bundle()
                if target.upper() == "ALL":
                    plist,_ = self.server.app.pm.list_projects()
                    for p in plist:
                        pid2 = p["id"]
                        proot2 = self.server.app.pm.project_root(pid2)
                        deployed = self.server.app.central.deploy_to_project(proot2, overwrite=True)
                        results[pid2] = deployed
                else:
                    proot2 = self.server.app.pm.project_root(target)
                    deployed = self.server.app.central.deploy_to_project(proot2, overwrite=True)
                    results[target] = deployed
                self.server.ops.audit("central_templates:deploy", username=u, project_id=None, resource=target, detail={"results": results})
                self._send_json({"ok": True, "approval_required": False, "results": results}); return


        # project manager: API key create/revoke
        if rest_path.startswith("/api/admin/api_keys/create"):
            u = self.server.app.require_login(self)
            if not u: return
            if not self.server.app.require_perm(self, u, pid, 'data:upload'):
                return
            length = int(self.headers.get('Content-Length','0') or '0')
            body = self.rfile.read(length).decode('utf-8', errors='ignore')
            form = urllib.parse.parse_qs(body)
            label = (form.get('label',[''])[0] or '').strip()
            role = (form.get('role',['viewer'])[0] or 'viewer').strip()
            raw = self.server.app.create_api_key(proot, label, role, created_by=u)
            self._send_json({"ok":True,"api_key": raw})
            return

        if rest_path.startswith("/api/admin/api_keys/revoke"):
            u = self.server.app.require_login(self)
            if not u: return
            if not self.server.app.require_perm(self, u, pid, 'data:upload'):
                return
            length = int(self.headers.get('Content-Length','0') or '0')
            body = self.rfile.read(length).decode('utf-8', errors='ignore')
            form = urllib.parse.parse_qs(body)
            key_hash = (form.get('hash',[''])[0] or '').strip()
            ok = self.server.app.revoke_api_key(proot, key_hash, revoked_by=u)
            self._send_json({"ok":ok})
            return

        # --- Existing upload/config endpoints (manager required) ---
        u = self.server.app.require_login(self)
        if not u: return
        if not self.server.app.require_perm(self, u, pid, 'data:upload'):
            return

        # approval review
        if rest_path.startswith('/api/approve'):
            if not self.server.app.require_perm(self, u, pid, 'approve:action'):
                return
            length = int(self.headers.get('Content-Length','0') or '0')
            body = self.rfile.read(length).decode('utf-8', errors='ignore')
            form = urllib.parse.parse_qs(body)
            aid = int((form.get('id',['0'])[0]) or '0')
            decision = (form.get('decision',['approve'])[0] or 'approve')
            note = (form.get('note',[''])[0] or '')
            ok = self.server.ops.review_approval(aid, reviewer=u, approve=(decision=='approve'), note=note)
            appr = self.server.ops.get_approval(aid)
            if ok and appr and appr['status']=='approved':
                action = appr['action']
                payload = appr['payload']
                if action == 'upload_ads':
                    self.server.ops.enqueue_job(pid, 'ingest_ads', payload)
                elif action == 'upload_conversions':
                    self.server.ops.enqueue_job(pid, 'ingest_conversions', payload)
                elif action == 'refresh_dashboard':
                    self.server.ops.enqueue_job(pid, 'refresh_dashboard', payload)
                elif action == 'connector_run':
                    self.server.ops.enqueue_job(pid, 'connector_run', payload)
                elif action == 'central_template_deploy':
                    self.server.ops.enqueue_job('central', 'central_template_deploy', payload)
                elif action == 'marketplace_export_feed':
                    self.server.ops.enqueue_job(pid, 'marketplace_export_feed', payload)
            self.server.ops.audit('approval:review', username=u, project_id=pid, resource=str(aid), detail={'ok':ok,'decision':decision})
            self._send_json({'ok':ok,'approval':appr})
            return

        # connectors save
        if rest_path.startswith('/api/connectors/save'):
            if not self.server.app.require_perm(self, u, pid, 'connector:manage'):
                return
            length = int(self.headers.get('Content-Length','0') or '0')
            body = self.rfile.read(length).decode('utf-8', errors='ignore')
            form = urllib.parse.parse_qs(body)
            cfg_json = (form.get('config_json',['{}'])[0] or '{}')
            try:
                cfg = json.loads(cfg_json)
            except Exception:
                self._send_json({'ok':False,'error':'invalid json'}, 400); return
            v327_connectors.save_connectors_config(proot, cfg)
            self.server.ops.audit('connector:save_config', username=u, project_id=pid, resource='connectors.json', detail={})
            self._send_json({'ok':True})
            return

        if rest_path.startswith('/api/connectors/run'):
            if not self.server.app.require_perm(self, u, pid, 'connector:run'):
                return
            length = int(self.headers.get('Content-Length','0') or '0')
            body = self.rfile.read(length).decode('utf-8', errors='ignore')
            form = urllib.parse.parse_qs(body)
            name = (form.get('connector',[''])[0] or '').strip()
            date = (form.get('date',[datetime.utcnow().date().isoformat()])[0] or datetime.utcnow().date().isoformat())
            payload = {'connector':name,'date':date,'requested_by':u}
            if self.server.app.approval_required and not self.server.app.require_perm(self, u, pid, 'approve:action'):
                aid = self.server.ops.create_approval(pid, requested_by=u, action='connector_run', payload=payload)
                self.server.ops.audit('approval:request', username=u, project_id=pid, resource='connector_run', detail={'id':aid,'connector':name,'date':date})
                self._send_json({'ok':True,'approval_required':True,'approval_id':aid})
                return
            jid = self.server.ops.enqueue_job(pid, 'connector_run', payload)
            self.server.ops.audit('connector:enqueue', username=u, project_id=pid, resource=name, detail={'job_id':jid,'date':date})
            self._send_json({'ok':True,'job_id':jid})
            return

        # marketplace
        if rest_path.startswith('/api/products/upsert'):
            if not self.server.app.require_perm(self, u, pid, 'marketplace:manage'):
                return
            length = int(self.headers.get('Content-Length','0') or '0')
            body = self.rfile.read(length).decode('utf-8', errors='ignore')
            form = urllib.parse.parse_qs(body)
            product_json = (form.get('product_json',['{}'])[0] or '{}')
            try:
                prod = json.loads(product_json)
            except Exception:
                self._send_json({'ok':False,'error':'invalid json'}, 400); return
            v325_marketplace.upsert_product(proot, prod)
            self.server.ops.audit('product:upsert', username=u, project_id=pid, resource=prod.get('sku'), detail={})
            self._send_json({'ok':True})
            return

        if rest_path.startswith('/api/marketplace/export_feed'):
            if not self.server.app.require_perm(self, u, pid, 'marketplace:publish_request'):
                return
            length = int(self.headers.get('Content-Length','0') or '0')
            body = self.rfile.read(length).decode('utf-8', errors='ignore')
            form = urllib.parse.parse_qs(body)
            channel = (form.get('channel',[''])[0] or '').strip()
            payload = {'channel':channel,'date':datetime.utcnow().date().isoformat(),'requested_by':u}
            if self.server.app.approval_required and not self.server.app.require_perm(self, u, pid, 'approve:action'):
                aid = self.server.ops.create_approval(pid, requested_by=u, action='marketplace_export_feed', payload=payload)
                self.server.ops.audit('approval:request', username=u, project_id=pid, resource='marketplace_export_feed', detail={'id':aid,'channel':channel})
                self._send_json({'ok':True,'approval_required':True,'approval_id':aid})
                return
            jid = self.server.ops.enqueue_job(pid, 'marketplace_export_feed', payload)
            self._send_json({'ok':True,'job_id':jid})
            return

        # multipart forms
        ctype, pdict = cgi.parse_header(self.headers.get('content-type',''))
        if ctype == 'multipart/form-data':
            form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ={'REQUEST_METHOD':'POST'})
        else:
            length = int(self.headers.get('Content-Length','0') or '0')
            body = self.rfile.read(length).decode('utf-8', errors='ignore')
            form = urllib.parse.parse_qs(body)

        def _get_field(name, default=""):
            try:
                if isinstance(form, cgi.FieldStorage):
                    if name in form:
                        return form.getfirst(name) or default
                    return default
                return (form.get(name,[default])[0] or default)
            except Exception:
                return default

        # upload ads
        if rest_path.startswith("/api/upload_ads"):
            fileitem = form['file'] if isinstance(form, cgi.FieldStorage) and 'file' in form else None
            channel = _get_field('channel','generic').strip() or 'generic'
            if not fileitem or not getattr(fileitem, 'file', None):
                self._send_json({"ok":False,"error":"file required"}, 400); return
            raw = fileitem.file.read().decode('utf-8', errors='ignore')
            tmp = proot/"data"/f"_upload_ads_{int(time.time())}.csv"
            tmp.write_text(raw, encoding='utf-8')
            pending = proot/'data'/'pending'
            pending.mkdir(parents=True, exist_ok=True)
            pend = pending/f"upload_ads_1772162406.csv"
            shutil.copyfile(tmp.as_posix(), pend.as_posix())
            payload = {'csv': pend.as_posix(), 'channel': channel, 'requested_by': u}
            if self.server.app.approval_required and not self.server.app.require_perm(self, u, pid, 'approve:action'):
                aid = self.server.ops.create_approval(pid, requested_by=u, action='upload_ads', payload=payload)
                self.server.ops.audit('approval:request', username=u, project_id=pid, resource='upload_ads', detail={'id':aid})
                tmp.unlink(missing_ok=True)
                self._send_json({'ok':True,'approval_required':True,'approval_id':aid})
                return
            jid = self.server.ops.enqueue_job(pid, 'ingest_ads', payload)
            self.server.ops.audit('upload_ads:enqueue', username=u, project_id=pid, resource='upload_ads', detail={'job_id':jid})
            tmp.unlink(missing_ok=True)
            self._send_json({'ok':True,'queued':True,'job_id':jid})
            return
            ingest_py = (self.server.workspace/"scripts"/"v325"/"ingest_ads.py").as_posix()
            cm = (proot/"templates"/"v325"/"custom_mappers.json").as_posix()
            fx = (proot/"templates"/"v325"/"fx_rates.json").as_posix()
            code, out = run([sys.executable, ingest_py, "--db", db_path.as_posix(), "--csv", tmp.as_posix(), "--channel", channel, "--custom-mappers", cm, "--fx", fx])
            tmp.unlink(missing_ok=True)
            sync_custom_mappers_file(db_path.as_posix(), proot)
            self._send_json({"ok":code==0,"code":code,"log":out})
            return

        if rest_path.startswith("/api/upload_conversions"):
            fileitem = form['file'] if isinstance(form, cgi.FieldStorage) and 'file' in form else None
            if not fileitem or not getattr(fileitem, 'file', None):
                self._send_json({"ok":False,"error":"file required"}, 400); return
            raw = fileitem.file.read().decode('utf-8', errors='ignore')
            tmp = proot/"data"/f"_upload_conv_{int(time.time())}.csv"
            tmp.write_text(raw, encoding='utf-8')
            pending = proot/'data'/'pending'
            pending.mkdir(parents=True, exist_ok=True)
            pend = pending/f"upload_conversions_1772162406.csv"
            shutil.copyfile(tmp.as_posix(), pend.as_posix())
            payload = {'csv': pend.as_posix(), 'requested_by': u}
            if self.server.app.approval_required and not self.server.app.require_perm(self, u, pid, 'approve:action'):
                aid = self.server.ops.create_approval(pid, requested_by=u, action='upload_conversions', payload=payload)
                self.server.ops.audit('approval:request', username=u, project_id=pid, resource='upload_conversions', detail={'id':aid})
                tmp.unlink(missing_ok=True)
                self._send_json({'ok':True,'approval_required':True,'approval_id':aid})
                return
            jid = self.server.ops.enqueue_job(pid, 'ingest_conversions', payload)
            self.server.ops.audit('upload_conversions:enqueue', username=u, project_id=pid, resource='upload_conversions', detail={'job_id':jid})
            tmp.unlink(missing_ok=True)
            self._send_json({'ok':True,'queued':True,'job_id':jid})
            return
            ingest_py = (self.server.workspace/"scripts"/"v325"/"ingest_conversions.py").as_posix()
            code, out = run([sys.executable, ingest_py, "--db", db_path.as_posix(), "--csv", tmp.as_posix()])
            tmp.unlink(missing_ok=True)
            self._send_json({"ok":code==0,"code":code,"log":out})
            return

        if rest_path.startswith("/api/save_attribution"):
            if not self.server.app.require_perm(self, u, pid, 'template:edit'):
                return
            cfg = _get_field('config_json','{}')
            try:
                json.loads(cfg)
            except Exception as e:
                self._send_json({"ok":False,"error":"invalid json"}, 400); return
            db = sqlite3.connect(db_path.as_posix())
            cur = db.cursor()
            cur.execute("UPDATE attribution_config SET config_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=1", (cfg,))
            db.commit(); db.close()
            self.server.ops.audit('template:save_attribution', username=u, project_id=pid, resource='attribution_config', detail={})
            self._send_json({"ok":True})
            return

        if rest_path.startswith("/api/upload_fx"):
            fileitem = form['file'] if isinstance(form, cgi.FieldStorage) and 'file' in form else None
            if not fileitem or not getattr(fileitem, 'file', None):
                self._send_json({"ok":False,"error":"file required"}, 400); return
            raw = fileitem.file.read().decode('utf-8', errors='ignore')
            # validate json
            try:
                json.loads(raw)
            except Exception:
                self._send_json({"ok":False,"error":"invalid json"}, 400); return
            p = proot/"templates"/"v325"/"fx_rates.json"
            p.write_text(raw, encoding='utf-8')
            self._send_json({"ok":True})
            return

        self._send_json({"error":"not found","path":rest_path}, 404)


class Worker(threading.Thread):
    """Single worker processing queued jobs (V325)."""
    daemon = True
    def __init__(self, server):
        super().__init__()
        self.server = server
        self.stop_flag = False

    def run(self):
        while not self.stop_flag:
            job = self.server.ops.fetch_next_job()
            if not job:
                time.sleep(1.0)
                continue
            jid = job["id"]
            pid = job["project_id"]
            jtype = job["job_type"]
            payload = job["payload"] or {}
            ok = True
            err = ""
            try:
                if jtype == "refresh_dashboard":
                    self.server.app.refresh_project(pid, reason=payload.get("reason","queue"))
                elif jtype == "ingest_ads":
                    proot = self.server.app.pm.project_root(pid)
                    db_path = self.server.app.pm.project_db_path(pid)
                    csv_path = payload["csv"]
                    channel = payload.get("channel","generic")
                    ingest_py = (self.server.workspace/"scripts"/"v325"/"ingest_ads.py").as_posix()
                    cm = (proot/"templates"/"v325"/"custom_mappers.json").as_posix()
                    fx = (proot/"templates"/"v325"/"fx_rates.json").as_posix()
                    code, out = run([sys.executable, ingest_py, "--db", db_path.as_posix(), "--csv", csv_path, "--channel", channel, "--custom-mappers", cm, "--fx", fx])
                    if code != 0:
                        raise RuntimeError(out)
                    sync_custom_mappers_file(db_path.as_posix(), proot)
                elif jtype == "ingest_conversions":
                    db_path = self.server.app.pm.project_db_path(pid)
                    csv_path = payload["csv"]
                    ingest_py = (self.server.workspace/"scripts"/"v325"/"ingest_conversions.py").as_posix()
                    code, out = run([sys.executable, ingest_py, "--db", db_path.as_posix(), "--csv", csv_path])
                    if code != 0:
                        raise RuntimeError(out)
                elif jtype == "connector_run":
                    proot = self.server.app.pm.project_root(pid)
                    name = payload["connector"]
                    date = payload["date"]
                    out_path = v327_connectors.run_connector(proot, name, date).as_posix()
                    self.server.ops.audit("connector:run", username=payload.get("requested_by"), project_id=pid, resource=name, detail={"date":date,"out":out_path})
                
                elif jtype == "central_template_deploy":
                    # payload: {target: ALL|project_id}
                    target = (payload.get("target") or "ALL").strip()
                    results = {}
                    if target.upper() == "ALL":
                        plist,_ = self.server.app.pm.list_projects()
                        for p in plist:
                            pid2 = p["id"]
                            proot2 = self.server.app.pm.project_root(pid2)
                            deployed = self.server.app.central.deploy_to_project(proot2, overwrite=True)
                            results[pid2] = deployed
                    else:
                        proot2 = self.server.app.pm.project_root(target)
                        deployed = self.server.app.central.deploy_to_project(proot2, overwrite=True)
                        results[target] = deployed
                    try:
                        from notifier import notify
                        notify("central_template_deployed", title="Central template deployed", text=f"target={target}", extra={"results": list(results.keys())})
                    except Exception:
                        pass

                elif jtype == "marketplace_export_feed":
                    proot = self.server.app.pm.project_root(pid)
                    channel = payload["channel"]
                    out_path = v325_marketplace.export_feed_csv(proot, channel, payload.get("date"))
                    self.server.ops.audit("marketplace:export_feed", username=payload.get("requested_by"), project_id=pid, resource=channel, detail={"out":out_path.as_posix()})
                else:
                    raise RuntimeError(f"unknown job_type: {jtype}")
            except Exception as e:
                ok = False
                err = str(e)
            # Auto requeue on failure (operational)
            if not ok:
                try:
                    attempts = int(job.get("attempts",0)) + 1
                    max_attempts = int(job.get("max_attempts",5))
                    if attempts < max_attempts:
                        # exponential backoff in seconds: 30, 60, 120, 240...
                        backoff = 30 * (2 ** max(0, attempts-1))
                        self.server.ops.requeue_job(jid, attempts=attempts, backoff_seconds=backoff, error=err)
                        try:
                            from notifier import notify
                            notify("job_requeued", project_id=pid, title=f"{jtype} requeued", text=f"attempt {attempts}/{max_attempts}: {err}")
                        except Exception:
                            pass
                        continue
                except Exception:
                    pass
            self.server.ops.finish_job(jid, ok=ok, error=err)



class Server(HTTPServer):
    def __init__(self, addr, handler_cls, pm, um, workspace):
        super().__init__(addr, handler_cls)
        self.pm = pm
        self.um = um
        self.workspace = workspace
        self.ops = OpsStore(workspace)
        self.app = App(pm, um, workspace, self.ops)
        self.scheduler = Scheduler(self)
        self.scheduler.start()
        self.worker = Worker(self)
        self.worker.start()
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--workspace', default=str(_ROOT))
    ap.add_argument('--port', type=int, default=int(os.environ.get('PORT','8787')))
    args = ap.parse_args()

    workspace = pathlib.Path(args.workspace).resolve()
    pm = ProjectManager(workspace)
    um = UserManager(workspace)

    # seed dashboard html templates (v323)
    (workspace/"dashboard").mkdir(exist_ok=True)
    # if v323 templates not present, copy from packaged dashboard folder
    # (files already included in package)

    httpd = Server(('', args.port), Handler, pm, um, workspace)
    print(f"[GENIE_ROI V325] http://localhost:{args.port}/  (login: admin / admin)")
    print("- Projects: / (after login)")
    print("- Project UI: /p/<project_id>/ui/")
    print("- Dashboard: /p/<project_id>/dashboard/")
    print("- Scheduler: GENIE_ROI_SCHEDULE_TIME=03:00 (local) / disable: GENIE_ROI_SCHEDULER_ENABLED=0")
    httpd.serve_forever()

if __name__ == '__main__':
    main()