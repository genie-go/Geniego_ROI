#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Coupang OPEN API connector - V337

Adds:
- retry/backoff + simple rate limiting via net_v337
- approval/status inquiry + vendorItemId extraction (mapping loop support)

Docs (representative):
- Product Creation
- Changing price/quantity by vendorItemId
- Product inquiry endpoints vary by resource; this connector supports a minimal GET for seller-products.

NOTE:
- Some fields are only available after Coupang approval/workflow; V337 handles this by polling and
  storing partial mappings when possible.
"""
from __future__ import annotations
import datetime, hashlib, hmac, json, urllib.parse
from typing import Any, Dict, Optional, Tuple, List

from .net_v337 import request_json, RateLimiter

BASE = "https://api-gateway.coupang.com"

def _utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)

def _hmac_signature(secret_key: str, message: str) -> str:
    return hmac.new(secret_key.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()

def _make_authorization(access_key: str, secret_key: str, method: str, path_with_query: str) -> str:
    # Common Coupang HMAC format: yymmddTHHMMSSZ + METHOD + path?query
    dt = _utc_now()
    datetime_str = dt.strftime("%y%m%dT%H%M%SZ")
    message = datetime_str + method.upper() + path_with_query
    signature = _hmac_signature(secret_key, message)
    return f"CEA algorithm=HmacSHA256, access-key={access_key}, signed-date={datetime_str}, signature={signature}"

class CoupangConnector:
    def __init__(self, access_key: str, secret_key: str, vendor_id: str, *, rate_per_sec: float = 4.0, burst: int = 8):
        self.access_key = access_key
        self.secret_key = secret_key
        self.vendor_id = vendor_id
        self._rl = RateLimiter()
        self._bucket = self._rl.bucket("coupang", rate_per_sec, burst)

    def _headers(self, method: str, url: str) -> Dict[str,str]:
        parsed = urllib.parse.urlparse(url)
        path_with_query = parsed.path + (("?" + parsed.query) if parsed.query else "")
        auth = _make_authorization(self.access_key, self.secret_key, method, path_with_query)
        return {"Content-Type": "application/json", "Authorization": auth}

    def create_product(self, payload: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
        url = BASE + "/v2/providers/seller_api/apis/api/v1/marketplace/seller-products"
        payload = dict(payload)
        payload.setdefault("vendorId", self.vendor_id)
        st, obj, _ = request_json("POST", url, headers=self._headers("POST", url), body_obj=payload, rate_bucket=self._bucket)
        return st, obj

    def update_vendor_item_price(self, vendor_item_id: int, price: int, force: bool = True) -> Tuple[int, Dict[str, Any]]:
        qs = "?forceSalePriceUpdate=true" if force else ""
        url = BASE + f"/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/{vendor_item_id}/prices/{price}" + qs
        st, obj, _ = request_json("PUT", url, headers=self._headers("PUT", url), body_obj={}, rate_bucket=self._bucket)
        return st, obj

    def update_vendor_item_quantity(self, vendor_item_id: int, quantity: int) -> Tuple[int, Dict[str, Any]]:
        url = BASE + f"/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/{vendor_item_id}/quantities/{quantity}"
        st, obj, _ = request_json("PUT", url, headers=self._headers("PUT", url), body_obj={}, rate_bucket=self._bucket)
        return st, obj

    # --- V337: inquiry / approval polling ---

    def get_seller_product(self, seller_product_id: str) -> Tuple[int, Dict[str, Any]]:
        """
        Minimal product inquiry. Coupang has multiple inquiry endpoints; the most common one is:
          GET .../seller-products/{sellerProductId}
        If your account uses a different path, set COUPANG_SELLER_PRODUCT_GET_PATH env in sync script.
        """
        url = BASE + f"/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/{seller_product_id}"
        st, obj, _ = request_json("GET", url, headers=self._headers("GET", url), rate_bucket=self._bucket)
        return st, obj

    @staticmethod
    def extract_vendor_item_ids(product_obj: Dict[str,Any]) -> List[str]:
        ids: List[str] = []
        # common shapes include: items -> vendorItemId, or productItems -> vendorItemId
        for k in ("items","productItems","vendorItems","vendorItemList"):
            v = product_obj.get(k)
            if isinstance(v, list):
                for it in v:
                    if isinstance(it, dict):
                        vid = it.get("vendorItemId") or it.get("vendor_item_id") or it.get("vendorItemID")
                        if vid is not None:
                            ids.append(str(vid))
        # sometimes nested under "data"
        data = product_obj.get("data")
        if isinstance(data, dict):
            ids += CoupangConnector.extract_vendor_item_ids(data)
        # de-dup
        out=[]
        seen=set()
        for x in ids:
            if x and x not in seen:
                seen.add(x); out.append(x)
        return out

    @staticmethod
    def extract_status(product_obj: Dict[str,Any]) -> str:
        # approximate: statusName/status/approvalStatus etc
        for k in ("statusName","status","approvalStatus","state"):
            v = product_obj.get(k)
            if isinstance(v, str) and v.strip():
                return v.strip()
        data = product_obj.get("data")
        if isinstance(data, dict):
            return CoupangConnector.extract_status(data)
        return ""
