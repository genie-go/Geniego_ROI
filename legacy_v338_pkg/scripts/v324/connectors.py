#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""GENIE_ROI V324 Data Connectors (auto collection)

Goal:
- Provide a consistent, stdlib-only framework to "fetch ads performance data" and
  "fetch conversions/orders data" automatically on a schedule or on demand.
- Supports credentials via project-local config file:
  projects/<project_id>/templates/v324/connectors.json

Important:
- Real Google Ads API & Meta Marketing API require OAuth tokens / app approvals.
- This package provides WORKING HTTP clients (urllib) and signing utilities where possible,
  but you must supply credentials and enable APIs yourself.

Connector outputs:
- Writes normalized CSV into:
    projects/<project_id>/inbox/<connector>/<YYYY-MM-DD>.csv
  Then ingestion jobs can load it into the project DB.

This design cleanly separates:
(1) Data acquisition (connectors) -> (2) Ingestion (existing ingest_ads/ingest_conversions)
"""
from __future__ import annotations
import json, pathlib, urllib.request, urllib.parse, hmac, hashlib, base64, time
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Tuple

def load_connectors_config(project_root: pathlib.Path) -> Dict[str,Any]:
    p = project_root/"templates"/"v324"/"connectors.json"
    if not p.exists():
        return {"version":1,"connectors":{}}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {"version":1,"connectors":{}}

def save_connectors_config(project_root: pathlib.Path, cfg: Dict[str,Any]):
    p = project_root/"templates"/"v324"
    p.mkdir(parents=True, exist_ok=True)
    (p/"connectors.json").write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")

def http_get(url: str, headers: Dict[str,str]|None=None, timeout: int=30) -> bytes:
    req = urllib.request.Request(url, headers=headers or {}, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def http_post_json(url: str, data: Dict[str,Any], headers: Dict[str,str]|None=None, timeout: int=30) -> bytes:
    body = json.dumps(data).encode("utf-8")
    h = {"Content-Type":"application/json; charset=utf-8"}
    if headers: h.update(headers)
    req = urllib.request.Request(url, data=body, headers=h, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

# -------- Naver SearchAd (signature helper) ----------
def naver_signature(secret: str, timestamp_ms: str, method: str, uri: str) -> str:
    message = f"{timestamp_ms}.{method}.{uri}"
    dig = hmac.new(secret.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).digest()
    return base64.b64encode(dig).decode("utf-8")

# -------- Connectors (minimal) ----------

class ConnectorError(Exception):
    pass

def ensure_inbox(project_root: pathlib.Path, name: str) -> pathlib.Path:
    inbox = project_root/"inbox"/name
    inbox.mkdir(parents=True, exist_ok=True)
    return inbox

def write_bytes(path: pathlib.Path, b: bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b)

def run_meta_insights(project_root: pathlib.Path, date: str) -> pathlib.Path:
    """
    Meta Marketing API example (Graph API insights).
    Needs:
      - access_token
      - ad_account_id (act_<id>)
    Config:
      connectors.meta = { "access_token": "...", "ad_account_id": "act_123", "fields": "...", "level":"campaign" }
    """
    cfg = load_connectors_config(project_root).get("connectors",{}).get("meta",{})
    token = cfg.get("access_token")
    act = cfg.get("ad_account_id")
    if not token or not act:
        raise ConnectorError("meta connector missing access_token/ad_account_id")
    fields = cfg.get("fields","campaign_id,campaign_name,spend,impressions,clicks,actions,action_values")
    level = cfg.get("level","campaign")
    time_range = urllib.parse.quote(json.dumps({"since":date,"until":date}))
    url = f"https://graph.facebook.com/v19.0/{act}/insights?level={urllib.parse.quote(level)}&fields={urllib.parse.quote(fields)}&time_range={time_range}&access_token={urllib.parse.quote(token)}"
    data = http_get(url, headers={"Accept":"application/json"})
    out = ensure_inbox(project_root,"meta")/f"{date}.json"
    write_bytes(out, data)
    return out

def run_naver_searchad_report(project_root: pathlib.Path, date: str) -> pathlib.Path:
    """
    Naver SearchAd API example (report endpoints vary).
    Needs:
      - api_key, secret_key, customer_id
    Config:
      connectors.naver_searchad = { "api_key":"...", "secret_key":"...", "customer_id":"...", "base":"https://api.searchad.naver.com" }
    """
    cfg = load_connectors_config(project_root).get("connectors",{}).get("naver_searchad",{})
    api_key = cfg.get("api_key"); secret = cfg.get("secret_key"); cust = cfg.get("customer_id")
    base = cfg.get("base","https://api.searchad.naver.com")
    if not api_key or not secret or not cust:
        raise ConnectorError("naver_searchad connector missing api_key/secret_key/customer_id")
    # Example: GET /stat-reports?reportTp=AD_DETAIL&statDt=YYYYMMDD
    ymd = date.replace("-","")
    uri = f"/stat-reports?reportTp=AD_DETAIL&statDt={ymd}"
    ts = str(int(time.time()*1000))
    sig = naver_signature(secret, ts, "GET", uri)
    headers = {
        "X-Timestamp": ts,
        "X-API-KEY": api_key,
        "X-Customer": str(cust),
        "X-Signature": sig,
        "Accept":"application/json",
    }
    data = http_get(base+uri, headers=headers)
    out = ensure_inbox(project_root,"naver_searchad")/f"{date}.json"
    write_bytes(out, data)
    return out

def run_google_ads_stream(project_root: pathlib.Path, date: str) -> pathlib.Path:
    """
    Google Ads API (REST) example using searchStream.
    Requires OAuth access token and developer token.
    Config:
      connectors.google_ads = {
        "developer_token":"...",
        "login_customer_id":"...", (optional manager)
        "customer_id":"1234567890",
        "access_token":"ya29....",
        "api_version":"v16",
        "gaql":"SELECT campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM campaign WHERE segments.date = '{date}'"
      }
    """
    cfg = load_connectors_config(project_root).get("connectors",{}).get("google_ads",{})
    dev = cfg.get("developer_token"); cust=cfg.get("customer_id"); token=cfg.get("access_token")
    if not dev or not cust or not token:
        raise ConnectorError("google_ads connector missing developer_token/customer_id/access_token")
    version = cfg.get("api_version","v16")
    gaql = cfg.get("gaql") or f"SELECT campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros FROM campaign WHERE segments.date = '{date}'"
    url = f"https://googleads.googleapis.com/{version}/customers/{cust}/googleAds:searchStream"
    headers = {
        "developer-token": dev,
        "Authorization": f"Bearer {token}",
        "Accept":"application/json"
    }
    if cfg.get("login_customer_id"):
        headers["login-customer-id"] = str(cfg["login_customer_id"])
    data = http_post_json(url, {"query":gaql}, headers=headers)
    out = ensure_inbox(project_root,"google_ads")/f"{date}.json"
    write_bytes(out, data)
    return out

CONNECTOR_RUNNERS = {
    "meta": run_meta_insights,
    "naver_searchad": run_naver_searchad_report,
    "google_ads": run_google_ads_stream,
}

def run_connector(project_root: pathlib.Path, connector_name: str, date: str) -> pathlib.Path:
    runner = CONNECTOR_RUNNERS.get(connector_name)
    if not runner:
        raise ConnectorError(f"unknown connector: {connector_name}")
    return runner(project_root, date)
