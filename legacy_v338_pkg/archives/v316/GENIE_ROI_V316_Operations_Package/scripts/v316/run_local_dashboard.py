#!/usr/bin/env python3
import argparse, http.server, socketserver, pathlib, os

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--port", type=int, default=8787)
    args = p.parse_args()

    root = pathlib.Path(".").resolve()
    os.chdir(root.as_posix())

    with socketserver.TCPServer(("", args.port), Handler) as httpd:
        print("[OK] Local dashboard server running")
        print(f"     http://localhost:{args.port}/dashboard/")
        httpd.serve_forever()

if __name__ == "__main__":
    main()
