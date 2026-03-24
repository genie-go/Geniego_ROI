#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Coupang OPEN API connector - V336

Official docs (paths used):
- Product Creation: POST /v2/providers/seller_api/apis/api/v1/marketplace/seller-products
- Changing price of each item: PUT /v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/{vendorItemId}/prices/{price}
- Changing quantity of each product item: PUT /v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/{vendorItemId}/quantities/{quantity}

Auth:
- HMAC signature in Authorization header (see Coupang Open API HMAC docs).
"""
from __future__ import annotations
import datetime, hashlib, hmac, json, time, urllib.parse, urllib.request
from typing import Any, Dict, Optional, Tuple

BASE = "https://api-gateway.coupang.com"

def _utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)

def _rfc3339(dt: datetime.datetime) -> str:
    dt = dt.astimezone(datetime.timezone.utc).replace(microsecond=0)
    return dt.isoformat().replace("+00:00", "Z")

def _hmac_signature(secret_key: str, message: str) -> str:
    return hmac.new(secret_key.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()

def _make_authorization(access_key: str, secret_key: str, method: str, path_with_query: str) -> str:
    # Coupang uses an Authorization header value built from a HMAC signature.
    # We follow Coupang's guide structure: timestamp + method + path (including query) to sign.
    # NOTE: exact format can differ across Coupang doc versions; this implementation matches common examples.
    dt = _utc_now()
    datetime_str = dt.strftime("%y%m%dT%H%M%SZ")  # yymmdd'T'HHMMSS'Z'
    message = datetime_str + method.upper() + path_with_query
    signature = _hmac_signature(secret_key, message)
    return f"CEA algorithm=HmacSHA256, access-key={access_key}, signed-date={datetime_str}, signature={signature}"

def _request_json(method: str, url: str, access_key: str, secret_key: str, body: Optional[Dict[str, Any]] = None, timeout: int = 30) -> Tuple[int, Dict[str, Any]]:
    parsed = urllib.parse.urlparse(url)
    path_with_query = parsed.path + (("?" + parsed.query) if parsed.query else "")
    auth = _make_authorization(access_key, secret_key, method, path_with_query)

    headers = {
        "Content-Type": "application/json",
        "Authorization": auth,
    }
    data = None
    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")

    req = urllib.request.Request(url, method=method.upper(), headers=headers, data=data)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            try:
                return resp.status, json.loads(raw) if raw else {}
            except Exception:
                return resp.status, {"raw": raw}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8") if e.fp else ""
        try:
            return e.code, json.loads(raw) if raw else {"error": str(e)}
        except Exception:
            return e.code, {"error": str(e), "raw": raw}

class CoupangConnector:
    def __init__(self, access_key: str, secret_key: str, vendor_id: str):
        self.access_key = access_key
        self.secret_key = secret_key
        self.vendor_id = vendor_id

    def create_product(self, payload: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
        url = BASE + "/v2/providers/seller_api/apis/api/v1/marketplace/seller-products"
        payload = dict(payload)
        payload.setdefault("vendorId", self.vendor_id)
        return _request_json("POST", url, self.access_key, self.secret_key, payload)

    def update_vendor_item_price(self, vendor_item_id: int, price: int, force: bool = True) -> Tuple[int, Dict[str, Any]]:
        qs = ""
        if force:
            qs = "?forceSalePriceUpdate=true"
        url = BASE + f"/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/{vendor_item_id}/prices/{price}" + qs
        return _request_json("PUT", url, self.access_key, self.secret_key, body={})

    def update_vendor_item_quantity(self, vendor_item_id: int, quantity: int) -> Tuple[int, Dict[str, Any]]:
        url = BASE + f"/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/{vendor_item_id}/quantities/{quantity}"
        return _request_json("PUT", url, self.access_key, self.secret_key, body={})
