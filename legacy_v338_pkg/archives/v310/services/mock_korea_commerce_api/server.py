import json
import os
import time
import base64
import hmac
import hashlib
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

PORT = int(os.getenv("PORT", "9300"))

# In-memory demo state
STATE = {
  "naver_tokens": {},   # refresh_token -> (access_token, exp)
  "cafe24_tokens": {},  # refresh_token -> (access_token, exp)
  "orders": {
    "coupang": [],
    "naver_smartstore": [],
    "cafe24": [],
  },
  "inventory": {},  # sku -> qty
}

def now():
  return int(time.time())

def jresp(handler, code, obj):
  data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
  handler.send_response(code)
  handler.send_header("Content-Type","application/json; charset=utf-8")
  handler.send_header("Content-Length", str(len(data)))
  handler.end_headers()
  handler.wfile.write(data)

def read_json(handler):
  n = int(handler.headers.get("Content-Length","0") or "0")
  if n<=0: return {}
  raw = handler.rfile.read(n)
  try: return json.loads(raw.decode("utf-8"))
  except: return {}

class Handler(BaseHTTPRequestHandler):
  def do_GET(self):
    p = urlparse(self.path)
    if p.path == "/health":
      return jresp(self, 200, {"ok": True})
    # Orders fetch mock
    if p.path.startswith("/api/") and p.path.endswith("/orders"):
      provider = p.path.split("/")[2]
      return jresp(self, 200, {"orders": STATE["orders"].get(provider, [])})
    if p.path.startswith("/api/") and p.path.endswith("/inventory"):
      return jresp(self, 200, {"inventory": [{"sku": k, "qty": v} for k,v in STATE["inventory"].items()]})
    return jresp(self, 404, {"error":"not found"})

  def do_POST(self):
    p = urlparse(self.path)
    body = read_json(self)

    # OAuth token refresh mocks
    if p.path == "/oauth/naver/token":
      rt = body.get("refresh_token") or "rt-demo"
      at = "naver-at-" + str(now())
      exp = now() + 3600
      STATE["naver_tokens"][rt] = (at, exp)
      return jresp(self, 200, {"access_token": at, "expires_in": 3600, "token_type":"bearer", "refresh_token": rt})

    if p.path == "/oauth/cafe24/token":
      rt = body.get("refresh_token") or "rt-demo"
      at = "cafe24-at-" + str(now())
      exp = now() + 3600
      STATE["cafe24_tokens"][rt] = (at, exp)
      return jresp(self, 200, {"access_token": at, "expires_in": 3600, "token_type":"bearer", "refresh_token": rt})

    # Product upsert mock
    if p.path.startswith("/api/") and p.path.endswith("/products"):
      provider = p.path.split("/")[2]
      prods = body.get("products") or []
      # initialize inventory for skus
      for pr in prods:
        sku = pr.get("sku") or pr.get("id") or "sku-unknown"
        if sku not in STATE["inventory"]:
          STATE["inventory"][sku] = int(pr.get("qty") or 10)
      return jresp(self, 200, {"ok": True, "provider": provider, "applied": {"products": prods}})

    # Inventory sync mock
    if p.path.startswith("/api/") and p.path.endswith("/inventory"):
      inv = body.get("inventory") or []
      for row in inv:
        sku = row.get("sku")
        if sku:
          STATE["inventory"][sku] = int(row.get("qty") or 0)
      return jresp(self, 200, {"ok": True, "applied": {"inventory": inv}})

    # Order events mock (create/cancel/return)
    if p.path.startswith("/api/") and p.path.endswith("/order_events"):
      provider = p.path.split("/")[2]
      evs = body.get("events") or []
      # flatten into orders feed for convenience
      for e in evs:
        STATE["orders"].setdefault(provider, []).append(e)
      return jresp(self, 200, {"ok": True, "applied": {"events": evs}})

    return jresp(self, 404, {"error":"not found"})

  def log_message(self, fmt, *args):
    # quieter
    return

if __name__ == "__main__":
  srv = HTTPServer(("0.0.0.0", PORT), Handler)
  print(f"mock_korea_commerce_api listening on {PORT}")
  srv.serve_forever()
