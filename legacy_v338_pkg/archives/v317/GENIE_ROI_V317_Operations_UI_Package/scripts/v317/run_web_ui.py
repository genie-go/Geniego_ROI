#!/usr/bin/env python3
import argparse, io, os, pathlib, sqlite3, sys, urllib.parse, json
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
import cgi
import subprocess

def run(cmd):
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    out, _ = p.communicate()
    return p.returncode, out

class App:
    def __init__(self, db_path: str, root: pathlib.Path):
        self.db_path = db_path
        self.root = root

    def status_text(self):
        try:
            db = sqlite3.connect(self.db_path)
            cur = db.cursor()
            rule = cur.execute("SELECT rule, updated_at FROM attribution_config WHERE id=1").fetchone()
            ads_cnt = cur.execute("SELECT COUNT(*) FROM ads_daily").fetchone()[0]
            conv_cnt = cur.execute("SELECT COUNT(*) FROM conversions_daily").fetchone()[0]
            db.close()
            return f"attribution_rule={rule[0]} (updated_at={rule[1]})\nads_rows={ads_cnt}\nconversion_rows={conv_cnt}\nlast_json={self.last_json_mtime()}\n"
        except Exception as e:
            return f"status error: {e}\n"

    def last_json_mtime(self):
        p = self.root / "out" / "dashboard_ads_kpi.json"
        if not p.exists():
            return "-"
        ts = datetime.fromtimestamp(p.stat().st_mtime).isoformat(timespec="seconds")
        return ts

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in ("/", "/ui", "/ui/"):
            self.serve_file("dashboard/ui.html", "text/html; charset=utf-8")
            return
        if self.path.startswith("/dashboard/"):
            rel = self.path[len("/dashboard/"):] or "index.html"
            self.serve_file("dashboard/" + rel, self.guess_type(rel))
            return
        if self.path.startswith("/out/"):
            rel = self.path[len("/"):]  # out/...
            self.serve_file(rel, self.guess_type(rel))
            return
        if self.path.startswith("/templates/"):
            rel = self.path[len("/"):]
            self.serve_file(rel, self.guess_type(rel))
            return
        if self.path.startswith("/api/status"):
            txt = self.server.app.status_text()
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(txt.encode("utf-8"))
            return
        self.send_error(404, "Not Found")

    def do_POST(self):
        if self.path == "/api/set_attribution":
            length = int(self.headers.get("Content-Length","0"))
            body = self.rfile.read(length).decode("utf-8", errors="ignore")
            data = urllib.parse.parse_qs(body)
            rule = (data.get("rule", ["campaign_id"])[0] or "campaign_id").strip()

            code, out = run([sys.executable, "scripts/v317/set_attribution.py", "--db", self.server.app.db_path, "--rule", rule])
            self._redirect_with_message(out, ok=(code==0))
            return

        if self.path in ("/api/upload_ads", "/api/upload_conversions"):
            ctype, pdict = cgi.parse_header(self.headers.get('content-type'))
            if ctype != 'multipart/form-data':
                self.send_error(400, "Expected multipart/form-data")
                return
            form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ={'REQUEST_METHOD':'POST'})
            file_item = form['file'] if 'file' in form else None
            if not file_item or not getattr(file_item, "file", None):
                self.send_error(400, "file is required")
                return

            uploads_dir = self.server.app.root / "uploads"
            uploads_dir.mkdir(parents=True, exist_ok=True)

            fn = pathlib.Path(file_item.filename or "upload.csv").name
            dst = uploads_dir / f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{fn}"
            with open(dst, "wb") as f:
                f.write(file_item.file.read())

            if self.path == "/api/upload_ads":
                channel = (form.getfirst("channel") or "google_ads").strip()
                cmd = [sys.executable, "scripts/v317/ingest_ads.py", "--db", self.server.app.db_path, "--csv", dst.as_posix(), "--channel", channel]
            else:
                cmd = [sys.executable, "scripts/v317/ingest_conversions.py", "--db", self.server.app.db_path, "--csv", dst.as_posix()]

            code, out = run(cmd)

            # Auto-generate JSON if ingest succeeded
            if code == 0:
                code2, out2 = run([sys.executable, "scripts/v317/generate_dashboard_json.py", "--db", self.server.app.db_path, "--out", "out"])
                out = out + "\n" + out2
                code = code2

            self._redirect_with_message(out, ok=(code==0))
            return

        if self.path == "/api/generate_json":
            code, out = run([sys.executable, "scripts/v317/generate_dashboard_json.py", "--db", self.server.app.db_path, "--out", "out"])
            self._redirect_with_message(out, ok=(code==0))
            return

        self.send_error(404, "Not Found")

    def _redirect_with_message(self, msg: str, ok: bool):
        # Store last message for status
        self.server.last_message = msg.strip()
        self.send_response(303)
        self.send_header("Location", "/ui/")
        self.end_headers()

    def serve_file(self, rel_path: str, ctype: str):
        p = self.server.app.root / rel_path
        if not p.exists() or not p.is_file():
            self.send_error(404, "Not Found")
            return
        data = p.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def guess_type(self, rel: str) -> str:
        rel = rel.lower()
        if rel.endswith(".html"): return "text/html; charset=utf-8"
        if rel.endswith(".json"): return "application/json; charset=utf-8"
        if rel.endswith(".css"): return "text/css; charset=utf-8"
        if rel.endswith(".js"): return "application/javascript; charset=utf-8"
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
    httpd.last_message = ""

    print("[OK] V317 Web UI running")
    print(f"  UI: http://localhost:{args.port}/ui/")
    print(f"  Dashboard: http://localhost:{args.port}/dashboard/")
    httpd.serve_forever()

if __name__ == "__main__":
    main()
