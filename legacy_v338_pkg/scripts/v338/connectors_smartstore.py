#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Naver SmartStore / Commerce API connector - V334

Auth (official):
- OAuth2 Client Credentials + signature, token endpoint:
  https://api.commerce.naver.com/external/v1/oauth2/token
- grant_type=client_credentials, type=SELF (seller app)
- scopes: N/A (Commerce API does not provide scopes spec)

Core endpoints used in V334:
- Orders (conditional product orders): GET /v1/pay-order/seller/product-orders
- Products search (simple list): POST /v1/products/search
- Product detail: GET /v2/products/channel-products/{channelProductNo}

All endpoints are called under:
  https://api.commerce.naver.com/external{PATH}
"""
from __future__ import annotations
import base64, json, time, urllib.parse, urllib.request, datetime
from typing import Any, Dict, Optional, Tuple, List
from .net_v337 import request_json, RateLimiter
import bcrypt

BASE = "https://api.commerce.naver.com"
TOKEN_URL = BASE + "/external/v1/oauth2/token"

def _ts_ms() -> int:
    return int(time.time() * 1000)

def iso_utc(dt: datetime.datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    dt = dt.astimezone(datetime.timezone.utc).replace(microsecond=0)
    return dt.isoformat().replace("+00:00","Z")

def parse_any_dt(v: Any) -> Optional[datetime.datetime]:
    if not v:
        return None
    if isinstance(v, datetime.datetime):
        return v
    s = str(v).strip()
    try:
        if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
            return datetime.datetime.fromisoformat(s).replace(tzinfo=datetime.timezone.utc)
    except Exception:
        pass
    try:
        # ISO 8601
        return datetime.datetime.fromisoformat(s.replace("Z","+00:00")).astimezone(datetime.timezone.utc)
    except Exception:
        return None

import re

def generate_signature(client_id: str, client_secret: str, timestamp_ms: int) -> str:
    """
    Signature: bcrypt hash of "{client_id}_{timestamp}" with salt=client_secret, then base64 encode.
    """
    password = f"{client_id}_{timestamp_ms}".encode("utf-8")
    hashed = bcrypt.hashpw(password, client_secret.encode("utf-8"))
    return base64.b64encode(hashed).decode("utf-8")

def _http(method: str, url: str, *, headers: Dict[str,str]|None=None, body: bytes|None=None, timeout: int=20) -> Tuple[int, bytes]:
    req = urllib.request.Request(url, data=body, method=method)
    for k,v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return int(getattr(e, "code", 500)), e.read() or b""
    except Exception as e:
        raise

class SmartStoreOAuth:
    def __init__(self, *, client_id: str, client_secret: str, account_id: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.account_id = account_id

    def issue_token(self, *, force: bool=False) -> Dict[str,Any]:
        """
        Issues token (Client Credentials).
        We cache in OpsStore connector_state; this class just calls the endpoint.
        """
        ts = _ts_ms()
        sign = generate_signature(self.client_id, self.client_secret, ts)
        form = {
            "client_id": self.client_id,
            "timestamp": str(ts),
            "client_secret_sign": sign,
            "grant_type": "client_credentials",
            "type": "SELF",
        }
        data = urllib.parse.urlencode(form).encode("utf-8")
        st, raw = _http("POST", TOKEN_URL,
                        headers={"Content-Type":"application/x-www-form-urlencoded"},
                        body=data)
        if st != 200:
            raise RuntimeError(f"token issue failed status={st} body={raw[:300]!r}")
        return json.loads(raw.decode("utf-8"))

class SmartStoreClient:
    def __init__(self, *, client_id: str, client_secret: str, account_id: str, store, project_id: str):
        self.oauth = SmartStoreOAuth(client_id=client_id, client_secret=client_secret, account_id=account_id)
        self.account_id = account_id
        self.store = store
        self.project_id = project_id

    def _get_access_token(self) -> str:
        st = self.store.get_connector_state(self.project_id, "smartstore") or {}
        tok = (st.get("token_json") or {})
        access = tok.get("access_token")
        exp = tok.get("expires_at")
        now = time.time()
        if access and exp and (float(exp) - now) > 120:
            return access
        # issue a new token and store
        t = self.oauth.issue_token(force=True)
        expires_in = int(t.get("expires_in", 3*3600))
        t["expires_at"] = now + expires_in
        self.store.upsert_connector_state(self.project_id, "smartstore",
                                         token=t,
                                         perms=(st.get("perms_json") or {"account_id": self.account_id}),
                                         ratelimit=(st.get("ratelimit_json") or {}),
                                         watermark=(st.get("watermark_json") or {}),
                                         ok=True, err_code="", err_msg="")
        return t.get("access_token")

    def _auth_headers(self) -> Dict[str,str]:
        return {"Authorization": f"Bearer {self._get_access_token()}", "Content-Type":"application/json"}

    # -------- Orders --------
    def fetch_orders_conditional(self, dt_from: datetime.datetime, dt_to: datetime.datetime, *, range_type: str="LAST_CHANGED_DATETIME") -> List[Dict[str,Any]]:
        """
        GET /v1/pay-order/seller/product-orders with from/to (<=24h recommended).
        """
        qs = urllib.parse.urlencode({
            "from": iso_utc(dt_from),
            "to": iso_utc(dt_to),
            "rangeType": range_type,
        })
        url = BASE + "/external/v1/pay-order/seller/product-orders?" + qs
        st, raw = _http("GET", url, headers=self._auth_headers(), body=None)
        if st != 200:
            raise RuntimeError(f"orders fetch failed status={st} body={raw[:300]!r}")
        obj = json.loads(raw.decode("utf-8"))
        # shape: { "data": { "contents": [...] } } in many responses
        data = obj.get("data") or obj
        contents = (data.get("contents") if isinstance(data, dict) else None) or data.get("items") or data.get("productOrders") or []
        return contents if isinstance(contents, list) else []

    # -------- Products --------
    def search_products_page(self, *, page: int=1, size: int=100) -> Tuple[List[Dict[str,Any]], bool]:
        """
        POST /v1/products/search - returns a lightweight list. For detailed info, call v2 product detail as needed.
        """
        body = {
            "page": page,
            "size": size,
        }
        url = BASE + "/external/v1/products/search"
        st, raw = _http("POST", url, headers=self._auth_headers(), body=json.dumps(body).encode("utf-8"))
        if st != 200:
            raise RuntimeError(f"products search failed status={st} body={raw[:300]!r}")
        obj = json.loads(raw.decode("utf-8"))
        data = obj.get("data") or obj
        items = data.get("contents") or data.get("items") or data.get("products") or []
        pagination = data.get("pagination") or {}
        has_next = False
        try:
            total_pages = int(pagination.get("totalPages") or pagination.get("total_pages") or 0)
            has_next = (page < total_pages) if total_pages else (len(items) == size)
        except Exception:
            has_next = (len(items) == size)
        return (items if isinstance(items, list) else []), bool(has_next)

    def get_channel_product_detail(self, channel_product_no: int) -> Dict[str,Any]:
        url = BASE + f"/external/v2/products/channel-products/{channel_product_no}"
        st, raw = _http("GET", url, headers=self._auth_headers(), body=None)
        if st != 200:
            raise RuntimeError(f"product detail failed status={st} body={raw[:300]!r}")
        return json.loads(raw.decode("utf-8"))

# -------------------------
# V336: Product upload / sync
# -------------------------
def _http_json(method: str, url: str, headers: Dict[str, str], body: Optional[Dict[str, Any]] = None, timeout: int = 30,
              *, rate_bucket=None) -> Tuple[int, Dict[str, Any], str]:
    """
    V337: request with retry/backoff. Returns (status, obj, raw_text).
    """
    headers = dict(headers or {})
    headers.setdefault("Content-Type", "application/json")
    st, obj, raw = request_json(method, url, headers=headers, body_obj=body, timeout=timeout, rate_bucket=rate_bucket)
    return st, obj, raw

def create_product_v2(access_token: str, product_payload: Dict[str, Any], *, rate_bucket=None) -> Tuple[int, Dict[str, Any], str]:
    """Create product via Commerce API (v2): POST /v2/products"""
    url = BASE + "/external/v2/products"
    headers = {"Authorization": f"Bearer {access_token}"}
    return _http_json("POST", url, headers=headers, body=product_payload, rate_bucket=rate_bucket)

def update_option_stock(access_token: str, origin_product_no: int, option_items: List[Dict[str, Any]], *, rate_bucket=None) -> Tuple[int, Dict[str, Any], str]:
    """Update option stock/price/salePrice: PUT /v1/products/origin-products/{originProductNo}/option-stock

    option_items: list of objects per API spec (optionNo, stockQuantity, price, salePrice etc.)
    """
    url = BASE + f"/external/v1/products/origin-products/{origin_product_no}/option-stock"
    headers = {"Authorization": f"Bearer {access_token}"}
    body = {"optionStocks": option_items}
    return _http_json("PUT", url, headers=headers, body=body, rate_bucket=rate_bucket)


# -------------------------
# V337: Option mapping refresh
# -------------------------
def get_origin_product_detail(access_token: str, origin_product_no: int, *, rate_bucket=None) -> Tuple[int, Dict[str, Any], str]:
    """
    Try to fetch origin-product detail for option mapping.
    We attempt the v2 origin-products endpoint first, then fallback to v1 if needed.
    """
    headers = {"Authorization": f"Bearer {access_token}"}
    # v2 (preferred)
    url1 = BASE + f"/external/v2/products/origin-products/{origin_product_no}"
    st, obj, raw = _http_json("GET", url1, headers=headers, body=None, rate_bucket=rate_bucket)
    if st == 200:
        return st, obj, raw
    # fallback v1
    url2 = BASE + f"/external/v1/products/origin-products/{origin_product_no}"
    st2, obj2, raw2 = _http_json("GET", url2, headers=headers, body=None, rate_bucket=rate_bucket)
    return st2, obj2, raw2

def extract_option_map(origin_detail: Dict[str,Any]) -> List[Dict[str,str]]:
    """
    Returns a list of {optionNo, optionKey} where optionKey is a stable key built from option name/value.
    Handles a few common shapes found in SmartStore responses.
    """
    out=[]
    def norm(s: str) -> str:
        return " ".join(str(s or "").strip().split()).lower()

    # response might wrap in data
    data = origin_detail.get("data") if isinstance(origin_detail, dict) else None
    src = data if isinstance(data, dict) else origin_detail

    # candidate lists
    candidates = []
    for k in ("product","originProduct","originProductInfo"):
        v = src.get(k) if isinstance(src, dict) else None
        if isinstance(v, dict):
            src = v
            break

    for k in ("optionInfo","optionInfos","options","optionItems","optionList"):
        v = src.get(k) if isinstance(src, dict) else None
        if isinstance(v, list):
            candidates = v
            break
        if isinstance(v, dict):
            # sometimes {"optionDetails":[...]}
            for kk in ("optionDetails","items","contents"):
                vv = v.get(kk)
                if isinstance(vv, list):
                    candidates = vv
                    break
    for it in candidates or []:
        if not isinstance(it, dict):
            continue
        option_no = it.get("optionNo") or it.get("option_no") or it.get("id")
        # build key: optionName:optionValue or combination
        name = it.get("optionName") or it.get("name") or ""
        value = it.get("optionValue") or it.get("value") or ""
        # some responses store attributes
        attrs = it.get("optionAttributes") or it.get("attributes")
        if isinstance(attrs, list) and attrs:
            parts=[]
            for a in attrs:
                if isinstance(a, dict):
                    parts.append(f"{norm(a.get('name'))}={norm(a.get('value'))}")
            if parts:
                key = "|".join(parts)
            else:
                key = f"{norm(name)}={norm(value)}"
        else:
            key = f"{norm(name)}={norm(value)}"
        if option_no is not None:
            out.append({"optionNo": str(option_no), "optionKey": key})
    return out
