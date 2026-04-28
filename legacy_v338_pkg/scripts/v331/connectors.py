#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""GENIE_ROI V328 Data Connectors (production-parity skeleton)

V328 connector goals
- Offline/stdlib-only connector framework that is "production-ready in shape":
  - per-connector state: watermark(cursor), token(expiry/refresh), perms snapshot, ratelimit counters
  - channel-specific incremental collection modes (date_cursor / id_cursor / pagination)
  - clear extension points to plug real API calls (Google/Meta/Kakao/Naver/Coupang/Shopify/etc.)

Where to configure
- projects/<project_id>/templates/v328/connectors.json  (project-level)
- templates/v328/connectors.json can be used as a starter template

Important
- This package does NOT ship private SDKs. It provides:
  - OAuth refresh flow scaffolding
  - request signing utilities (where applicable)
  - a consistent output contract for downstream ingestion
"""
from __future__ import annotations
import json, pathlib, time, urllib.request, urllib.parse, hmac, hashlib, base64
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Tuple, List

from scripts.v329fh.ops_store import OpsStore

# ---------------- config helpers ----------------
def load_connectors_config(project_root: pathlib.Path) -> Dict[str,Any]:
    p = project_root/"templates"/"v328"/"connectors.json"
    if not p.exists():
        return {"version":328,"connectors":{}}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {"version":328,"connectors":{}}

def save_connectors_config(project_root: pathlib.Path, cfg: Dict[str,Any]):
    p = project_root/"templates"/"v328"
    p.mkdir(parents=True, exist_ok=True)
    (p/"connectors.json").write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")

# ---------------- http helpers ----------------
def http_get(url: str, headers: Dict[str,str]|None=None, timeout: int=30) -> bytes:
    req = urllib.request.Request(url, headers=headers or {}, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def http_post_form(url: str, data: Dict[str,str], headers: Dict[str,str]|None=None, timeout: int=30) -> bytes:
    body = urllib.parse.urlencode(data).encode("utf-8")
    h = {"Content-Type":"application/x-www-form-urlencoded; charset=utf-8"}
    if headers: h.update(headers)
    req = urllib.request.Request(url, data=body, headers=h, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def http_post_json(url: str, data: Dict[str,Any], headers: Dict[str,str]|None=None, timeout: int=30) -> bytes:
    body = json.dumps(data).encode("utf-8")
    h = {"Content-Type":"application/json; charset=utf-8"}
    if headers: h.update(headers)
    req = urllib.request.Request(url, data=body, headers=h, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

# ---------------- rate limit (simple) ----------------
def ratelimit_allow(state: Dict[str,Any], key: str, per_sec: float=5.0) -> bool:
    """
    Very simple leaky-bucket: allow if now - last >= 1/per_sec.
    Store in state['ratelimit'][key]['last_ts'].
    """
    rl = state.get("ratelimit") or {}
    k = rl.get(key) or {}
    now=time.time()
    last=float(k.get("last_ts",0.0))
    if now-last < (1.0/max(per_sec,0.001)):
        return False
    k["last_ts"]=now
    rl[key]=k
    state["ratelimit"]=rl
    return True

# ---------------- token management ----------------
def token_expired(token: Dict[str,Any], skew_sec: int=60) -> bool:
    exp = token.get("expires_at")
    if not exp: return True
    try:
        return time.time() >= float(exp) - skew_sec
    except Exception:
        return True

def ensure_token(cfg_connector: Dict[str,Any], state: Dict[str,Any]) -> Dict[str,Any]:
    """
    Refresh token when expired. Works for OAuth2 refresh_token pattern.
    Connector config example:
      auth: {type:"oauth2", token_url:"...", client_id:"...", client_secret:"...", refresh_token:"..."}
    """
    auth = cfg_connector.get("auth") or {}
    if auth.get("type") != "oauth2":
        return state.get("token") or {}
    token = state.get("token") or {}
    if token and not token_expired(token):
        return token
    # refresh
    token_url = auth.get("token_url")
    refresh_token = token.get("refresh_token") or auth.get("refresh_token")
    if not token_url or not refresh_token:
        # missing config; keep as-is
        return token
    data={
        "grant_type":"refresh_token",
        "refresh_token": refresh_token,
        "client_id": str(auth.get("client_id","")),
        "client_secret": str(auth.get("client_secret","")),
    }
    try:
        raw=http_post_form(token_url, data)
        obj=json.loads(raw.decode("utf-8"))
        access=obj.get("access_token")
        expires_in=float(obj.get("expires_in",3600))
        token={
            "access_token": access,
            "refresh_token": obj.get("refresh_token") or refresh_token,
            "token_type": obj.get("token_type","Bearer"),
            "expires_at": time.time() + expires_in,
            "scope": obj.get("scope") or auth.get("scope")
        }
        return token
    except Exception:
        # if refresh fails, return previous token (so caller can fail gracefully)
        return token

# ---------------- incremental watermark helpers ----------------
def wm_get(state: Dict[str,Any], key: str, default=None):
    return (state.get("watermark") or {}).get(key, default)

def wm_set(state: Dict[str,Any], key: str, value: Any):
    wm = state.get("watermark") or {}
    wm[key]=value
    state["watermark"]=wm

# ---------------- connector skeletons ----------------
def run_connector(project_root: pathlib.Path, project_id: str, connector_name: str, ops: OpsStore) -> Dict[str,Any]:
    """
    Entry point used by scheduler or UI job queue.
    Returns summary dict for audit/log.
    """
    cfg_all = load_connectors_config(project_root)
    cfg = (cfg_all.get("connectors") or {}).get(connector_name)
    if not cfg:
        return {"ok": False, "error": f"connector_not_configured:{connector_name}"}

    state = ops.get_connector_state(project_id, connector_name)

    # 1) token refresh (production parity)
    token = ensure_token(cfg, state)
    state["token"]=token

    # 2) permissions snapshot (what scope/roles did we get)
    state["perms"]= {"scope": token.get("scope"), "captured_at": datetime.utcnow().isoformat()+"Z"}

    # 3) rate limit guard (example)
    if not ratelimit_allow(state, "default", per_sec=float(cfg.get("ratelimit_per_sec", 3.0))):
        ops.upsert_connector_state(project_id, connector_name, ratelimit=state["ratelimit"], token=state["token"], perms=state["perms"])
        return {"ok": False, "error": "rate_limited_local_guard"}

    # 4) incremental watermark based on mode
    mode = (cfg.get("incremental") or {}).get("mode","date_cursor")
    if mode=="date_cursor":
        since = wm_get(state,"since") or (datetime.utcnow()-timedelta(days=7)).strftime("%Y-%m-%d")
        until = datetime.utcnow().strftime("%Y-%m-%d")
        # TODO: perform real API pull here (channel-specific)
        # For demo: write a placeholder file
        out = _write_placeholder(project_root, connector_name, since, until)
        wm_set(state,"since", until)  # advance watermark
        summary={"ok":True,"mode":mode,"since":since,"until":until,"rows":out["rows"],"out":out["path"]}
    elif mode=="id_cursor":
        last_id = wm_get(state,"last_id") or "0"
        out = _write_placeholder(project_root, connector_name, last_id, None)
        wm_set(state,"last_id", out.get("next_id","0"))
        summary={"ok":True,"mode":mode,"last_id":last_id,"next_id":out.get("next_id"),"rows":out["rows"],"out":out["path"]}
    else:
        summary={"ok":False,"error":f"unknown_incremental_mode:{mode}"}

    ops.upsert_connector_state(
        project_id, connector_name,
        last_run_at=datetime.utcnow().isoformat()+"Z",
        watermark=state.get("watermark",{}),
        token=state.get("token",{}),
        perms=state.get("perms",{}),
        ratelimit=state.get("ratelimit",{})
    )
    return summary

def _write_placeholder(project_root: pathlib.Path, connector_name: str, a: str, b: Optional[str]) -> Dict[str,Any]:
    inbox = project_root/"inbox"/connector_name
    inbox.mkdir(parents=True, exist_ok=True)
    ts=datetime.utcnow().strftime("%Y-%m-%d")
    p=inbox/f"{ts}.csv"
    header="date,channel,campaign,spend,clicks,impressions,conversions,revenue\n"
    # placeholder one row
    row=f"{ts},{connector_name},DEMO,0,0,0,0,0\n"
    p.write_text(header+row, encoding="utf-8")
    return {"path": p.as_posix(), "rows": 1, "next_id":"1"}

# ---------------- channel-specific utilities (examples) ----------------
def naver_signature(ts_ms: str, method: str, uri: str, secret: str) -> str:
    msg = f"{ts_ms}.{method}.{uri}"
    sig = hmac.new(secret.encode("utf-8"), msg.encode("utf-8"), hashlib.sha256).digest()
    return base64.b64encode(sig).decode("utf-8")


# --- V329fh: KR channels (SmartStore / Coupang / KakaoMoment) ---
from scripts.v329fh.connectors_coupang import CoupangClient
from scripts.v329fh.connectors_smartstore import SmartStoreClient
from scripts.v329fh.connectors_kakao_moment import KakaoMomentClient

def sync_coupang_orders(ops, project_id: str, creds: dict, *, created_from: str, created_to: str) -> dict:
    """Pull Coupang ordersheets incrementally and return summary.
    creds: {access_key, secret_key, vendor_id}
    """
    c = CoupangClient(access_key=creds['access_key'], secret_key=creds['secret_key'], vendor_id=creds['vendor_id'])
    next_token = None
    total = 0
    pages = 0
    while True:
        data = c.list_order_sheets(created_from=created_from, created_to=created_to, limit=200, next_token=next_token)
        pages += 1
        items = (data or {}).get('data') or (data or {}).get('orderSheets') or []
        total += len(items)
        next_token = (data or {}).get('nextToken') or (data or {}).get('data',{}).get('nextToken')
        if not next_token or pages >= 50:
            break
        time.sleep(0.2)
    # watermark update is done by caller (created_to)
    return {'ok': True, 'pages': pages, 'items': total}

def sync_smartstore_orders(ops, project_id: str, creds: dict, *, from_dt: str, to_dt: str) -> dict:
    """Pull SmartStore orders incrementally (shape-ready).
    creds: {client_id, client_secret, access_token(optional), refresh_token(optional)}
    """
    c = SmartStoreClient(client_id=creds['client_id'], client_secret=creds['client_secret'],
                        access_token=creds.get('access_token'), refresh_token=creds.get('refresh_token'))
    # In real use, you should call c.refresh_access_token() when token expired.
    last_id = None
    total = 0
    pages = 0
    while True:
        data = c.list_orders(from_dt=from_dt, to_dt=to_dt, last_id=last_id, limit=200)
        pages += 1
        items = (data or {}).get('orders') or (data or {}).get('data') or []
        total += len(items)
        last_id = (data or {}).get('lastId') or (data or {}).get('nextLastId')
        if not last_id or pages >= 50:
            break
        time.sleep(0.2)
    return {'ok': True, 'pages': pages, 'items': total}

def connector_catalog_v329fh() -> dict:
    """Connectors exposed as 'complete' reference implementations."""
    return {
        'coupang': {'kind':'marketplace', 'auth':'hmac', 'sync':'ordersheets/products', 'status':'ready'},
        'smartstore': {'kind':'marketplace', 'auth':'oauth2', 'sync':'orders/products', 'status':'ready'},
        'kakao_moment': {'kind':'ads', 'auth':'oauth2', 'sync':'reports', 'status':'reference'},
    }
