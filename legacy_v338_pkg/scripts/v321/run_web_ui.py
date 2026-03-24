#!/usr/bin/env python3
"""
GENIE_ROI V321 Web UI

V321 개선점
- templates/v321 경로 기본 사용
- /api/export_csv: drilldown/diagnostics 테이블 CSV 다운로드
- 선택적 Basic Auth 지원 (환경변수 GENIE_ROI_BASIC_AUTH="user:pass")
"""
import argparse, base64, csv, io, os, pathlib, sqlite3, sys, urllib.parse, json
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
import cgi
import subprocess

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

class App:
    def __init__(self, db_path: str, root: pathlib.Path):
        self.db_path = db_path
        self.root = root
        self.basic_auth = os.environ.get("GENIE_ROI_BASIC_AUTH","").strip()

    def require_auth(self, handler: BaseHTTPRequestHandler) -> bool:
        if not self.basic_auth:
            return False
        exp_user, exp_pass = self.basic_auth.split(":", 1) if ":" in self.basic_auth else (self.basic_auth, "")
        got_user, got_pass = parse_basic_auth(handler.headers.get("Authorization",""))
        ok = (got_user == exp_user) and (got_pass == exp_pass)
        if not ok:
            handler.send_response(401)
            handler.send_header("WWW-Authenticate", 'Basic realm="GENIE_ROI V321"')
            handler.send_header("Content-Type","text/plain; charset=utf-8")
            handler.end_headers()
            handler.wfile.write("Authentication required\n".encode("utf-8"))
        return ok

    def status_text(self):
        try:
            db = sqlite3.connect(self.db_path)
            cur = db.cursor()
            cfg = cur.execute("SELECT config_json, updated_at FROM attribution_config WHERE id=1").fetchone()
            ads_cnt = cur.execute("SELECT COUNT(*) FROM ads_daily").fetchone()[0]
            conv_cnt = cur.execute("SELECT COUNT(*) FROM conversions_daily").fetchone()[0]
            mcnt = cur.execute("SELECT COUNT(*) FROM custom_mappers").fetchone()[0]
            db.close()
            chain = json.loads(cfg[0]).get("chain",[]) if cfg and cfg[0] else []
            return f"version=V321\nattribution_chain={chain} (updated_at={cfg[1] if cfg else '-'})\nads_rows={ads_cnt}\nconversion_rows={conv_cnt}\ncustom_mappers={mcnt}\nlast_json={self.last_json_mtime()}\n"
        except Exception as e:
            return f"status error: {e}\n"

    def last_json_mtime(self):
        p = self.root / "out" / "dashboard_ads_kpi.json"
        if not p.exists(): return "-"
        return datetime.fromtimestamp(p.stat().st_mtime).isoformat(timespec="seconds")

def sync_custom_mappers_file(db_path: str, root: pathlib.Path):
    db = sqlite3.connect(db_path)
    cur = db.cursor()
    cur.execute("SELECT channel, mapping_json FROM custom_mappers")
    channels = {}
    for ch, mj in cur.fetchall():
        try: channels[ch] = json.loads(mj)
        except Exception: pass
    db.close()
    (root/"templates"/"v321").mkdir(parents=True, exist_ok=True)
    (root/"templates"/"v321"/"custom_mappers.json").write_text(
        json.dumps({"version":1,"channels":channels}, ensure_ascii=False, indent=2), encoding="utf-8"
    )

def json_to_csv_bytes(rows):
    if not rows:
        return b""
    # stable columns
    cols=set()
    for r in rows:
        cols.update(r.keys())
    cols = list(cols)
    cols.sort()
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=cols, extrasaction="ignore")
    w.writeheader()
    for r in rows:
        w.writerow(r)
    return buf.getvalue().encode("utf-8")

class Handler(BaseHTTPRequestHandler):
    def _auth(self):
        if self.server.app.basic_auth:
            return self.server.app.require_auth(self)
        return True

    def do_GET(self):
        if not self._auth():
            return

        if self.path in ("/", "/ui", "/ui/"):
            self.serve_file("dashboard/ui_v321.html", "text/html; charset=utf-8"); return
        if self.path.startswith("/dashboard/"):
            rel = self.path[len("/dashboard/"):] or "index_v321.html"
            self.serve_file("dashboard/" + rel, self.guess_type(rel)); return
        if self.path.startswith("/out/"):
            rel = self.path[len("/"):]
            self.serve_file(rel, self.guess_type(rel)); return
        if self.path.startswith("/templates/"):
            rel = self.path[len("/"):]
            self.serve_file(rel, self.guess_type(rel)); return

        if self.path.startswith("/api/version"):
            self.send_response(200)
            self.send_header("Content-Type","application/json; charset=utf-8")
            self.send_header("Cache-Control","no-store")
            self.end_headers()
            self.wfile.write(json.dumps({"version":"V321","now":datetime.utcnow().isoformat()+"Z"}, ensure_ascii=False).encode("utf-8"))
            return

        if self.path.startswith("/api/status"):
            txt = self.server.app.status_text()
            self.send_response(200)
            self.send_header("Content-Type","text/plain; charset=utf-8")
            self.send_header("Cache-Control","no-store")
            self.end_headers()
            self.wfile.write(txt.encode("utf-8")); return

        if self.path.startswith("/api/get_mapper"):
            q = urllib.parse.urlparse(self.path).query
            qs = urllib.parse.parse_qs(q)
            channel = (qs.get("channel",[""])[0] or "").strip()
            db = sqlite3.connect(self.server.app.db_path)
            cur = db.cursor()
            cur.execute("SELECT mapping_json FROM custom_mappers WHERE channel=?", (channel,))
            row = cur.fetchone()
            db.close()
            mapping = json.loads(row[0]) if row else {}
            self.send_response(200)
            self.send_header("Content-Type","application/json; charset=utf-8")
            self.send_header("Cache-Control","no-store")
            self.end_headers()
            self.wfile.write(json.dumps(mapping, ensure_ascii=False).encode("utf-8")); return

        if self.path.startswith("/api/export_mappers"):
            db = sqlite3.connect(self.server.app.db_path)
            cur = db.cursor()
            cur.execute("SELECT channel, mapping_json FROM custom_mappers")
            channels = {}
            for ch, mj in cur.fetchall():
                try: channels[ch] = json.loads(mj)
                except Exception: pass
            db.close()
            payload = {"version":1,"exported_at":datetime.utcnow().isoformat()+"Z","channels":channels}
            self.send_response(200)
            self.send_header("Content-Type","application/json; charset=utf-8")
            self.send_header("Cache-Control","no-store")
            self.end_headers()
            self.wfile.write(json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")); return

        if self.path.startswith("/api/export_csv"):
            # /api/export_csv?name=campaigns|ad_groups|ads|unattributed_cost_top|top_any|daily
            q = urllib.parse.urlparse(self.path).query
            qs = urllib.parse.parse_qs(q)
            name = (qs.get("name",[""])[0] or "").strip()
            p = self.server.app.root/"out"/"dashboard_ads_kpi.json"
            if not p.exists():
                self.send_error(404, "dashboard_ads_kpi.json not found"); return
            data = json.loads(p.read_text(encoding="utf-8"))
            rows = []
            if name in ("campaigns","ad_groups","ads"):
                rows = (data.get("drilldown") or {}).get(name) or []
            elif name == "unattributed_cost_top":
                rows = (data.get("diagnostics") or {}).get("unattributed_cost_top") or []
            elif name == "top_any":
                rows = (data.get("tables") or {}).get("top_any") or []
            elif name == "daily":
                rows = (data.get("trends") or {}).get("daily") or []
            else:
                self.send_error(400, "Invalid name"); return

            csv_bytes = json_to_csv_bytes(rows)
            self.send_response(200)
            self.send_header("Content-Type","text/csv; charset=utf-8")
            self.send_header("Content-Disposition", f'attachment; filename="{name}.csv"')
            self.send_header("Cache-Control","no-store")
            self.end_headers()
            self.wfile.write(csv_bytes)
            return

        self.send_error(404, "Not Found")

    def do_POST(self):
        if not self._auth():
            return

        if self.path == "/api/save_mapper":
            length = int(self.headers.get("Content-Length","0"))
            raw = self.rfile.read(length).decode("utf-8", errors="ignore")
            try:
                payload = json.loads(raw)
                channel = (payload.get("channel") or "").strip()
                mapping = payload.get("mapping") or {}
                mapping = {str(k): str(v) for k,v in mapping.items() if v}
            except Exception:
                self.send_error(400, "Invalid JSON"); return

            db = sqlite3.connect(self.server.app.db_path)
            cur = db.cursor()
            cur.execute(
                "INSERT INTO custom_mappers(channel, mapping_json, updated_at) VALUES(?,?,?) "
                "ON CONFLICT(channel) DO UPDATE SET mapping_json=excluded.mapping_json, updated_at=excluded.updated_at",
                (channel, json.dumps(mapping, ensure_ascii=False), datetime.utcnow().isoformat()+"Z")
            )
            db.commit(); db.close()
            sync_custom_mappers_file(self.server.app.db_path, self.server.app.root)
            self.send_response(200)
            self.send_header("Content-Type","text/plain; charset=utf-8")
            self.send_header("Cache-Control","no-store")
            self.end_headers()
            self.wfile.write("OK (매핑 저장됨)".encode("utf-8"))
            return

        if self.path == "/api/import_mappers":
            ctype, _ = cgi.parse_header(self.headers.get('content-type'))
            if ctype != 'multipart/form-data':
                self.send_error(400, "Expected multipart/form-data"); return
            form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ={'REQUEST_METHOD':'POST'})
            file_item = form['file'] if 'file' in form else None
            if not file_item or not getattr(file_item, "file", None):
                self.send_error(400, "file is required"); return
            data = file_item.file.read()
            try:
                obj = json.loads(data.decode("utf-8"))
                channels = obj.get("channels") or {}
                if not isinstance(channels, dict):
                    raise ValueError("channels must be dict")
            except Exception as e:
                self.send_error(400, f"Invalid template json: {e}"); return

            db = sqlite3.connect(self.server.app.db_path)
            cur = db.cursor()
            up = 0
            for ch, mp in channels.items():
                if not isinstance(mp, dict):
                    continue
                mp2 = {str(k): str(v) for k,v in mp.items() if v}
                cur.execute(
                    "INSERT INTO custom_mappers(channel, mapping_json, updated_at) VALUES(?,?,?) "
                    "ON CONFLICT(channel) DO UPDATE SET mapping_json=excluded.mapping_json, updated_at=excluded.updated_at",
                    (str(ch), json.dumps(mp2, ensure_ascii=False), datetime.utcnow().isoformat()+"Z")
                )
                up += 1
            db.commit(); db.close()
            sync_custom_mappers_file(self.server.app.db_path, self.server.app.root)
            self.send_response(200)
            self.send_header("Content-Type","text/plain; charset=utf-8")
            self.send_header("Cache-Control","no-store")
            self.end_headers()
            self.wfile.write(f"OK (가져오기 완료: {up}개 채널)".encode("utf-8"))
            return

        if self.path in ("/api/upload_fx", "/api/upload_attribution"):
            ctype, _ = cgi.parse_header(self.headers.get('content-type'))
            if ctype != 'multipart/form-data':
                self.send_error(400, "Expected multipart/form-data"); return
            form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ={'REQUEST_METHOD':'POST'})
            file_item = form['file'] if 'file' in form else None
            if not file_item or not getattr(file_item, "file", None):
                self.send_error(400, "file is required"); return
            data = file_item.file.read()
            try:
                obj = json.loads(data.decode("utf-8"))
            except Exception as e:
                self.send_error(400, f"Invalid json: {e}"); return

            if self.path == "/api/upload_fx":
                if "rates_to_base" not in obj:
                    self.send_error(400, "fx json must include rates_to_base"); return
                dst = self.server.app.root / "templates" / "v321" / "fx_rates.json"
                dst.write_bytes(data)
            else:
                if "chain" not in obj:
                    self.send_error(400, "attribution json must include chain"); return
                dst = self.server.app.root / "templates" / "v321" / "default_attribution.json"
                dst.write_bytes(data)
                db = sqlite3.connect(self.server.app.db_path)
                cur = db.cursor()
                cur.execute("UPDATE attribution_config SET config_json=?, updated_at=? WHERE id=1",
                            (json.dumps(obj, ensure_ascii=False), datetime.utcnow().isoformat()+"Z"))
                db.commit(); db.close()
            self._redirect("/ui/"); return

        if self.path in ("/api/upload_ads", "/api/upload_conversions"):
            ctype, _ = cgi.parse_header(self.headers.get('content-type'))
            if ctype != 'multipart/form-data':
                self.send_error(400, "Expected multipart/form-data"); return
            form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ={'REQUEST_METHOD':'POST'})
            file_item = form['file'] if 'file' in form else None
            if not file_item or not getattr(file_item, "file", None):
                self.send_error(400, "file is required"); return

            uploads_dir = self.server.app.root / "uploads"
            uploads_dir.mkdir(parents=True, exist_ok=True)
            fn = pathlib.Path(file_item.filename or "upload.csv").name
            dst = uploads_dir / f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{fn}"
            with open(dst, "wb") as f:
                f.write(file_item.file.read())

            if self.path == "/api/upload_ads":
                channel = (form.getfirst("channel") or "google_ads").strip()
                cmd = [sys.executable, "scripts/v321/ingest_ads.py", "--db", self.server.app.db_path, "--csv", dst.as_posix(), "--channel", channel]
            else:
                cmd = [sys.executable, "scripts/v321/ingest_conversions.py", "--db", self.server.app.db_path, "--csv", dst.as_posix()]

            code, out = run(cmd)
            if code == 0:
                code2, out2 = run([sys.executable, "scripts/v321/generate_dashboard_json.py", "--db", self.server.app.db_path, "--out", "out"])
                out = out + "\n" + out2

            self.send_response(200)
            self.send_header("Content-Type","text/plain; charset=utf-8")
            self.send_header("Cache-Control","no-store")
            self.end_headers()
            self.wfile.write(out.encode("utf-8"))
            return

        self.send_error(404, "Not Found")

    def _redirect(self, where: str):
        self.send_response(303)
        self.send_header("Location", where)
        self.end_headers()

    def serve_file(self, rel_path: str, ctype: str):
        p = self.server.app.root / rel_path
        if not p.exists() or not p.is_file():
            self.send_error(404, "Not Found"); return
        data = p.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control","no-store")
        self.end_headers()
        self.wfile.write(data)

    def guess_type(self, rel: str) -> str:
        rel = rel.lower()
        if rel.endswith(".html"): return "text/html; charset=utf-8"
        if rel.endswith(".json"): return "application/json; charset=utf-8"
        if rel.endswith(".css"): return "text/css; charset=utf-8"
        if rel.endswith(".js"): return "application/javascript; charset=utf-8"
        if rel.endswith(".csv"): return "text/csv; charset=utf-8"
        return "application/octet-stream"

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--port", type=int, default=8787)
    args = p.parse_args()

    root = pathlib.Path(".").resolve()
    os.chdir(root.as_posix())

    httpd = HTTPServer(("", args.port), Handler)
    httpd.app = App(args.db, root)

    print("[OK] V321 Web UI running")
    print(f"  UI: http://localhost:{args.port}/ui/")
    print(f"  Dashboard: http://localhost:{args.port}/dashboard/")
    if httpd.app.basic_auth:
        print("  Auth: enabled (GENIE_ROI_BASIC_AUTH)")
    httpd.serve_forever()

if __name__ == "__main__":
    main()
