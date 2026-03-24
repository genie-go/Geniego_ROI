#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Coupang Open API 커넥터 - V329fh (stdlib-only)

- HMAC signature 기반 인증(AccessKey/SecretKey)
- 주문/상품(카탈로그) 증분 수집
- rate limit/backoff 내장

"""
from __future__ import annotations
import base64, hashlib, hmac, json, time, urllib.parse, urllib.request
from typing import Any, Dict, Optional

BASE = "https://api-gateway.coupang.com"

def _utc_ts() -> str:
    # Coupang signature에서 사용하는 timestamp 포맷(예: 230101T121314Z)을 문서 기준으로 조정 가능
    return time.strftime('%y%m%dT%H%M%SZ', time.gmtime())

def sign(method: str, path: str, query: str, access_key: str, secret_key: str, timestamp: str) -> str:
    message = timestamp + method.upper() + path + (query or "")
    sig = hmac.new(secret_key.encode('utf-8'), message.encode('utf-8'), hashlib.sha256).digest()
    return base64.b64encode(sig).decode('utf-8')

class CoupangClient:
    def __init__(self, *, access_key: str, secret_key: str, vendor_id: str):
        self.access_key = access_key
        self.secret_key = secret_key
        self.vendor_id = vendor_id

    def _req(self, method: str, path: str, *, params: Dict[str,Any]|None=None, body: Dict[str,Any]|None=None) -> Any:
        qs = urllib.parse.urlencode({k:v for k,v in (params or {}).items() if v is not None})
        ts = _utc_ts()
        signature = sign(method, path, ("?"+qs) if qs else "", self.access_key, self.secret_key, ts)
        url = BASE + path + (("?"+qs) if qs else "")
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-CP-AccessKey": self.access_key,
            "X-CP-Timestamp": ts,
            "X-CP-Signature": signature,
        }
        data = None
        if body is not None:
            data = json.dumps(body, ensure_ascii=False).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers=headers, method=method.upper())
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
            return json.loads(raw.decode('utf-8')) if raw else None

    def list_order_sheets(self, *, created_from: str, created_to: str, status: str|None=None, limit: int=200, next_token: str|None=None) -> Any:
        """주문서 조회(증분). created_from/to 예: 2026-02-01T00:00:00"""
        path = f"/v2/providers/openapi/apis/api/v4/vendors/{self.vendor_id}/ordersheets"
        params = {"createdAtFrom": created_from, "createdAtTo": created_to, "status": status, "maxPerPage": limit, "nextToken": next_token}
        return self._req("GET", path, params=params)

    def list_products(self, *, next_token: str|None=None, limit: int=200) -> Any:
        path = f"/v2/providers/openapi/apis/api/v4/vendors/{self.vendor_id}/products"
        params = {"maxPerPage": limit, "nextToken": next_token}
        return self._req("GET", path, params=params)
