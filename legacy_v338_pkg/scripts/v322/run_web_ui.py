#!/usr/bin/env python3
"""
GENIE_ROI V322 Web UI (멀티 프로젝트/고객사 분리)

핵심
- URL prefix 기반 프로젝트 분리: /p/<project_id>/ui/ , /p/<project_id>/dashboard/ , /p/<project_id>/api/*
- 프로젝트별 DB/OUT/TEMPLATES 분리 (DB/폴더/URL 파라미터 기반)
- 프로젝트 목록/생성 API 제공: /api/projects
- (선택) Basic Auth 지원: GENIE_ROI_BASIC_AUTH="user:pass"

워크스페이스 구조(기본):
  <workspace>/
    data/projects.json
    projects/<project_id>/
      data/genie_roi.db
      out/dashboard_ads_kpi.json
      templates/v322/custom_mappers.json
"""
import argparse, base64, csv, io, os, pathlib, sqlite3, sys, urllib.parse, json, re, shutil
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
import cgi
import subprocess

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

class ProjectManager:
    def __init__(self, workspace: pathlib.Path):
        self.workspace = workspace
        self.data_dir = self.workspace / "data"
        self.projects_dir = self.workspace / "projects"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.projects_dir.mkdir(parents=True, exist_ok=True)
        self.projects_file = self.data_dir / "projects.json"
        if not self.projects_file.exists():
            self.projects_file.write_text(json.dumps({"version":1,"default":"demo","projects":{}}, ensure_ascii=False, indent=2), encoding="utf-8")
        self._load()

        # ensure default project exists
        default_id = self.meta.get("default") or "demo"
        if default_id not in self.projects:
            self.create_project(default_id, "Demo Project")

    def _load(self):
        try:
            self.meta = json.loads(self.projects_file.read_text(encoding="utf-8"))
        except Exception:
            self.meta = {"version":1,"default":"demo","projects":{}}
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
        (root/"templates"/"v322").mkdir(parents=True, exist_ok=True)

        # init db using v322 init script (import-safe)
        init_py = (self.workspace/"scripts"/"v322"/"init_db.py").as_posix()
        code, out = run([sys.executable, init_py, "--db", (root/"data"/"genie_roi.db").as_posix()])
        if code != 0:
            raise RuntimeError(out)

        # seed template files
        base_templates = self.workspace / "templates" / "v322"
        if base_templates.exists():
            for f in base_templates.glob("*.json"):
                shutil_copy(f, root/"templates"/"v322"/f.name)

        self.projects[pid] = {"name": name or pid, "created_at": datetime.utcnow().isoformat()+"Z"}
        self._save()
        return pid

def shutil_copy(src: pathlib.Path, dst: pathlib.Path):
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(src.read_bytes())

class App:
    def __init__(self, pm: ProjectManager, workspace: pathlib.Path):
        self.pm = pm
        self.workspace = workspace
        self.basic_auth = os.environ.get("GENIE_ROI_BASIC_AUTH",""").strip()

    def require_auth(self, handler: BaseHTTPRequestHandler) -> bool:
        if not self.basic_auth:
            return False
        exp_user, exp_pass = self.basic_auth.split(":", 1) if ":" in self.basic_auth else (self.basic_auth, "")
        got_user, got_pass = parse_basic_auth(handler.headers.get("Authorization","""))
        ok = (got_user == exp_user) and (got_pass == exp_pass)
        if not ok:
            handler.send_response(401)
            handler.send_header("WWW-Authenticate", 'Basic realm="GENIE_ROI V322"')
            handler.send_header("Content-Type","text/plain; charset=utf-8")
            handler.end_headers()
            handler.wfile.write("Authentication required\n".encode("utf-8"))
        return ok

def json_to_csv_bytes(rows):
    if not rows:
        return b"""
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
    (project_root/"templates"/"v322").mkdir(parents=True, exist_ok=True)
    (project_root/"templates"/"v322"/"custom_mappers.json").write_text(
        json.dumps({"version":1,"channels":channels}, ensure_ascii=False, indent=2), encoding="utf-8"
    )

class Handler(BaseHTTPRequestHandler):
    def _auth(self):
        if self.server.app.basic_auth:
            return self.server.app.require_auth(self)
        return True

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
                rest_path = "/" + "/".join(parts[3:])  # may be "/"
                if rest_path == "//": rest_path = "/"
        if not pid:
            pid = (qs.get("project", [None])[0]) or None

        pid, pname, proot, db_path = self.server.pm.get(pid)
        return pid, pname, proot, db_path, parsed, rest_path, qs

    def _send_json(self, obj, code=200):
        self.send_response(code)
        self.send_header("Content-Type","application/json; charset=utf-8")
        self.send_header("Cache-Control","no-store")
        self.end_headers()
        self.wfile.write(json.dumps(obj, ensure_ascii=False).encode("utf-8"))

    def _send_text(self, txt, code=200):
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

    def do_GET(self):
        if not self._auth():
            return

        pid, pname, proot, db_path, parsed, rest_path, qs = self._resolve_project()

        # global project home
        if rest_path in ("/", ""):
            projects, default_id = self.server.pm.list_projects()
            html = (self.server.workspace/"dashboard"/"projects_v322.html").read_text(encoding="utf-8")
            html = html.replace("{{PROJECTS_JSON}}", json.dumps({"projects":projects,"default":default_id}, ensure_ascii=False))
            self.send_response(200)
            self.send_header("Content-Type","text/html; charset=utf-8")
            self.send_header("Cache-Control","no-store")
            self.end_headers()
            self.wfile.write(html.encode("utf-8"))
            return

        # serve UI & dashboard (workspace shared)
        if rest_path in ("/ui", "/ui/"):
            self.serve_file_abs(self.server.workspace/"dashboard"/"ui_v322.html", "text/html; charset=utf-8"); return
        if rest_path.startswith("/dashboard/"):
            rel = rest_path[len("/dashboard/"):] or "index_v322.html"
            self.serve_file_abs(self.server.workspace/"dashboard"/rel, self.guess_type(rel)); return

        # project static
        if rest_path.startswith("/out/"):
            rel = rest_path[len("/out/"):]
            self.serve_file_abs(proot/"out"/rel, self.guess_type(rel)); return
        if rest_path.startswith("/templates/"):
            rel = rest_path[len("/templates/"):]
            self.serve_file_abs(proot/"templates"/rel, self.guess_type(rel)); return

        # API: projects (global)
        if rest_path.startswith("/api/projects"):
            if rest_path == "/api/projects" or rest_path == "/api/projects/":
                projects, default_id = self.server.pm.list_projects()
                self._send_json({"version":"V322","default":default_id,"projects":projects}); return

        if rest_path.startswith("/api/version"):
            self._send_json({"version":"V322","project":pid,"project_name":pname,"now":datetime.utcnow().isoformat()+"Z"}); return

        if rest_path.startswith("/api/status"):
            try:
                db = sqlite3.connect(db_path.as_posix())
                cur = db.cursor()
                cfg = cur.execute("SELECT config_json, updated_at FROM attribution_config WHERE id=1").fetchone()
                ads_cnt = cur.execute("SELECT COUNT(*) FROM ads_daily").fetchone()[0]
                conv_cnt = cur.execute("SELECT COUNT(*) FROM conversions_daily").fetchone()[0]
                mcnt = cur.execute("SELECT COUNT(*) FROM custom_mappers").fetchone()[0]
                db.close()
                chain = json.loads(cfg[0]).get("chain",[]) if cfg and cfg[0] else []
                json_mtime = (proot/"out"/"dashboard_ads_kpi.json").exists()
                mtime = datetime.fromtimestamp((proot/"out"/"dashboard_ads_kpi.json").stat().st_mtime).isoformat(timespec="seconds") if json_mtime else "-"
                self._send_json({
                    "version":"V322",
                    "project":pid,
                    "project_name":pname,
                    "attribution_chain":chain,
                    "attribution_updated_at": (cfg[1] if cfg else "-"),
                    "ads_rows":ads_cnt,
                    "conversion_rows":conv_cnt,
                    "custom_mappers":mcnt,
                    "last_json":mtime
                }); 
                return
            except Exception as e:
                self._send_json({"error":str(e)}, code=500); return

        if rest_path.startswith("/api/export_csv"):
            # /api/export_csv?name=campaigns|ad_groups|ads|unattributed_cost_top|top_any|daily
            name = (qs.get("name", [""])[0] or "").strip()
            p = proot/"out"/"dashboard_ads_kpi.json"
            if not p.exists():
                self._send_text("dashboard json not found\n", 404); return
            data = json.loads(p.read_text(encoding="utf-8"))
            dd = data.get("drilldown", {}) or {}
            diag = data.get("diagnostics", {}) or {}
            if name == "campaigns": rows = dd.get("campaigns", [])
            elif name in ("ad_groups","adgroups"): rows = dd.get("ad_groups", [])
            elif name == "ads": rows = dd.get("ads", [])
            elif name == "unattributed_cost_top": rows = diag.get("unattributed_cost_top", [])
            elif name == "top_any": rows = diag.get("top_any", [])
            elif name == "daily": rows = (data.get("trends", {}) or {}).get("daily", [])
            else:
                self._send_text("unknown name\n", 400); return
            b = json_to_csv_bytes(rows)
            self.send_response(200)
            self.send_header("Content-Type","text/csv; charset=utf-8")
            self.send_header("Content-Disposition", f'attachment; filename="{pid}_{name}.csv"')
            self.send_header("Cache-Control","no-store")
            self.end_headers()
            self.wfile.write(b)
            return

        # fallback 404
        self.send_response(404); self.end_headers()

    def do_POST(self):
        if not self._auth():
            return
        pid, pname, proot, db_path, parsed, rest_path, qs = self._resolve_project()

        # global project create
        if rest_path.startswith("/api/projects/create"):
            ctype = self.headers.get('content-type','')
            length = int(self.headers.get('content-length', 0) or 0)
            body = self.rfile.read(length) if length else b"{}"
            try:
                payload = json.loads(body.decode("utf-8"))
            except Exception:
                payload = {}
            project_id = (payload.get("id") or "").strip()
            name = (payload.get("name") or project_id).strip()
            try:
                new_id = self.server.pm.create_project(project_id, name)
                self._send_json({"ok":True,"id":new_id})
            except Exception as e:
                self._send_json({"ok":False,"error":str(e)}, code=400)
            return

        # uploads & config are project-scoped (reuse v321 behavior)
        if rest_path.startswith("/api/upload_ads") or rest_path.startswith("/api/upload_conversions") or rest_path.startswith("/api/upload_fx") or rest_path.startswith("/api/upload_attribution") or rest_path.startswith("/api/save_mapper") or rest_path.startswith("/api/export_mappers") or rest_path.startswith("/api/import_mappers"):
            self._handle_project_post(pid, pname, proot, db_path, rest_path)
            return

        self.send_response(404); self.end_headers()

    def _handle_project_post(self, pid, pname, proot, db_path: pathlib.Path, rest_path: str):
        # parse multipart
        form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ={'REQUEST_METHOD':'POST'})
        def field_value(name, default=""):
            f = form.getfirst(name)
            return f if f is not None else default

        try:
            if rest_path.startswith("/api/save_mapper"):
                channel = field_value("channel")
                mapping_json = field_value("mapping_json")
                db = sqlite3.connect(db_path.as_posix())
                cur = db.cursor()
                cur.execute("INSERT INTO custom_mappers(channel,mapping_json,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(channel) DO UPDATE SET mapping_json=excluded.mapping_json, updated_at=CURRENT_TIMESTAMP", (channel, mapping_json))
                db.commit(); db.close()
                sync_custom_mappers_file(db_path.as_posix(), proot)
                self._send_json({"ok":True})
                return

            if rest_path.startswith("/api/export_mappers"):
                sync_custom_mappers_file(db_path.as_posix(), proot)
                p = proot/"templates"/"v322"/"custom_mappers.json"
                self.send_response(200)
                self.send_header("Content-Type","application/json; charset=utf-8")
                self.send_header("Content-Disposition", f'attachment; filename="{pid}_custom_mappers.json"')
                self.send_header("Cache-Control","no-store")
                self.end_headers()
                self.wfile.write(p.read_bytes())
                return

            if rest_path.startswith("/api/import_mappers"):
                fileitem = form["file"] if "file" in form else None
                if not fileitem or not getattr(fileitem, "file", None):
                    self._send_json({"ok":False,"error":"file is required"}, code=400); return
                raw = fileitem.file.read().decode("utf-8", errors="ignore")
                obj = json.loads(raw)
                channels = (obj.get("channels") or {})
                db = sqlite3.connect(db_path.as_posix())
                cur = db.cursor()
                for ch, mj in channels.items():
                    cur.execute("INSERT INTO custom_mappers(channel,mapping_json,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(channel) DO UPDATE SET mapping_json=excluded.mapping_json, updated_at=CURRENT_TIMESTAMP", (ch, json.dumps(mj, ensure_ascii=False)))
                db.commit(); db.close()
                sync_custom_mappers_file(db_path.as_posix(), proot)
                self._send_json({"ok":True, "channels":len(channels)})
                return

            if rest_path.startswith("/api/upload_fx"):
                fileitem = form["file"] if "file" in form else None
                if not fileitem or not getattr(fileitem, "file", None):
                    self._send_json({"ok":False,"error":"file is required"}, code=400); return
                raw = fileitem.file.read().decode("utf-8", errors="ignore")
                (proot/"templates"/"v322").mkdir(parents=True, exist_ok=True)
                (proot/"templates"/"v322"/"fx_rates.json").write_text(raw, encoding="utf-8")
                self._send_json({"ok":True})
                return

            if rest_path.startswith("/api/upload_attribution"):
                fileitem = form["file"] if "file" in form else None
                if not fileitem or not getattr(fileitem, "file", None):
                    self._send_json({"ok":False,"error":"file is required"}, code=400); return
                raw = fileitem.file.read().decode("utf-8", errors="ignore")
                obj = json.loads(raw)
                db = sqlite3.connect(db_path.as_posix())
                cur = db.cursor()
                cur.execute("INSERT INTO attribution_config(id,config_json,updated_at) VALUES(1,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET config_json=excluded.config_json, updated_at=CURRENT_TIMESTAMP", (json.dumps(obj, ensure_ascii=False),))
                db.commit(); db.close()
                self._send_json({"ok":True})
                return

            if rest_path.startswith("/api/upload_ads"):
                channel = field_value("channel")
                fileitem = form["file"] if "file" in form else None
                if not fileitem or not getattr(fileitem, "file", None):
                    self._send_json({"ok":False,"error":"file is required"}, code=400); return
                tmp = proot/"data"/f"_upload_ads_{pid}.csv"
                tmp.write_bytes(fileitem.file.read())
                ingest_py = (self.server.workspace/"scripts"/"v322"/"ingest_ads.py").as_posix()
                code, out = run([sys.executable, ingest_py, "--db", db_path.as_posix(), "--csv", tmp.as_posix(), "--channel", channel, "--templates", (proot/"templates"/"v322").as_posix()])
                if code != 0:
                    self._send_json({"ok":False,"error":out}, code=500); return
                # regenerate dashboard json
                gen_py = (self.server.workspace/"scripts"/"v322"/"generate_dashboard_json.py").as_posix()
                fx_path = proot/"templates"/"v322"/"fx_rates.json"
                default_fx = self.server.workspace/"templates"/"v322"/"fx_rates.json"
                fx = fx_path if fx_path.exists() else default_fx
                code2, out2 = run([sys.executable, gen_py, "--db", db_path.as_posix(), "--out", (proot/"out").as_posix(), "--fx", fx.as_posix(), "--default-attribution", (proot/"templates"/"v322"/"default_attribution.json").as_posix()])
                if code2 != 0:
                    self._send_json({"ok":False,"error":out2}, code=500); return
                self._send_json({"ok":True, "log":out+"\n"+out2})
                return

            if rest_path.startswith("/api/upload_conversions"):
                fileitem = form["file"] if "file" in form else None
                if not fileitem or not getattr(fileitem, "file", None):
                    self._send_json({"ok":False,"error":"file is required"}, code=400); return
                tmp = proot/"data"/f"_upload_conv_{pid}.csv"
                tmp.write_bytes(fileitem.file.read())
                ingest_py = (self.server.workspace/"scripts"/"v322"/"ingest_conversions.py").as_posix()
                code, out = run([sys.executable, ingest_py, "--db", db_path.as_posix(), "--csv", tmp.as_posix(), "--templates", (proot/"templates"/"v322").as_posix()])
                if code != 0:
                    self._send_json({"ok":False,"error":out}, code=500); return
                gen_py = (self.server.workspace/"scripts"/"v322"/"generate_dashboard_json.py").as_posix()
                fx_path = proot/"templates"/"v322"/"fx_rates.json"
                default_fx = self.server.workspace/"templates"/"v322"/"fx_rates.json"
                fx = fx_path if fx_path.exists() else default_fx
                code2, out2 = run([sys.executable, gen_py, "--db", db_path.as_posix(), "--out", (proot/"out").as_posix(), "--fx", fx.as_posix(), "--default-attribution", (proot/"templates"/"v322"/"default_attribution.json").as_posix()])
                if code2 != 0:
                    self._send_json({"ok":False,"error":out2}, code=500); return
                self._send_json({"ok":True, "log":out+"\n"+out2})
                return

        except Exception as e:
            self._send_json({"ok":False,"error":str(e)}, code=500)
            return

class Server(HTTPServer):
    def __init__(self, addr, handler, app: App, pm: ProjectManager, workspace: pathlib.Path):
        super().__init__(addr, handler)
        self.app = app
        self.pm = pm
        self.workspace = workspace

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workspace", default=str(pathlib.Path(__file__).resolve().parents[2]), help="package root path")
    ap.add_argument("--port", type=int, default=8787)
    args = ap.parse_args()

    workspace = pathlib.Path(args.workspace).resolve()
    pm = ProjectManager(workspace)
    app = App(pm, workspace)
    srv = Server(("0.0.0.0", args.port), Handler, app, pm, workspace)
    print(f"GENIE_ROI V322 running: http://localhost:{args.port}/  (projects home)")
    print(f"Example: http://localhost:{args.port}/p/{pm.meta.get('default','demo')}/ui/")
    srv.serve_forever()

if __name__ == "__main__":
    main()
