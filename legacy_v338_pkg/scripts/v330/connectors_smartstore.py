#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Naver SmartStore(네이버 커머스API/스마트스토어) 커넥터 - V330

V330 목표: "완전 실운영 레벨" 토큰 발급/갱신 마감
- 네이버 커머스API는 OAuth2 Client Credentials Grant 사용
- 토큰 발급 시 client_secret 자체를 보내지 않고 signature(client_secret_sign)를 보냄
- Token URL: https://api.commerce.naver.com/external/v1/oauth2/token  citeturn1view1
- grant_type=client_credentials, type=SELF 권장(판매자 앱) citeturn1view1turn0search3
- API 호출 시 Authorization: Bearer {token} citeturn1view1

주의:
- 커머스API는 "scopes 스펙을 제공하지 않습니다" (Scopes N/A) citeturn1view1
- account_id(판매자/계정 식별) 값은 고객사/앱 설정에서 확인하여 입력해야 합니다.
"""
from __future__ import annotations
import base64, json, time, urllib.parse, urllib.request
from typing import Any, Dict, Optional, Tuple
import bcrypt

BASE = "https://api.commerce.naver.com"
TOKEN_URL = "https://api.commerce.naver.com/external/v1/oauth2/token"

def _ts_ms() -> int:
    return int(time.time() * 1000)

def generate_signature(client_id: str, client_secret: str, timestamp_ms: int) -> str:
    """
    Signature: bcrypt hash of "{client_id}_{timestamp}" with salt=client_secret, then base64 encode. citeturn1view1
    """
    password = f"{client_id}_{timestamp_ms}".encode("utf-8")
    hashed = bcrypt.hashpw(password, client_secret.encode("utf-8"))
    return base64.b64encode(hashed).decode("utf-8")

class SmartStoreOAuth:
    def __init__(self, *, client_id: str, client_secret: str, account_id: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.account_id = account_id
        self.access_token: Optional[str] = None
        self.expires_at: Optional[float] = None

    def issue_token(self, *, force: bool=False) -> Dict[str,Any]:
        """
        Issues (or renews) token. Token validity is 3 hours; if remaining >= 30m server may return existing token. citeturn1view0
        """
        now = time.time()
        if (not force) and self.access_token and self.expires_at and (self.expires_at - now) > 600:
            return {"access_token": self.access_token, "expires_at": self.expires_at}

        ts = _ts_ms()
        sign = generate_signature(self.client_id, self.client_secret, ts)

        # Form/query params (x-www-form-urlencoded) is required. citeturn0search3
        params = {
            "client_id": self.client_id,
            "timestamp": str(ts),
            "client_secret_sign": sign,
            "grant_type": "client_credentials",
            "type": "SELF",
            "account_id": self.account_id,
        }
        data = urllib.parse.urlencode(params).encode("utf-8")
        req = urllib.request.Request(TOKEN_URL, data=data, method="POST")
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
        j = json.loads(body)

        # Response shape varies; try common keys
        token = j.get("access_token") or j.get("accessToken") or j.get("token")
        expires_in = int(j.get("expires_in") or j.get("expiresIn") or 10800)
        if not token:
            raise RuntimeError(f"SmartStore token response missing access_token: {j}")

        self.access_token = token
        self.expires_at = time.time() + max(60, expires_in - 30)
        return {"access_token": token, "expires_at": self.expires_at, "raw": j}

def _request(method: str, url: str, *, token: str, params: Dict[str,Any]|None=None, body: Dict[str,Any]|None=None) -> Any:
    if params:
        url = url + ("?" + urllib.parse.urlencode({k:v for k,v in params.items() if v is not None}))
    data = None
    headers = {"Authorization": f"Bearer {token}"}
    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method)
    for k,v in headers.items():
        req.add_header(k,v)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8") or "{}")

class SmartStoreClient:
    """
    Minimal practical endpoints for "상품/주문" 증분 수집.
    NOTE: actual endpoint paths can differ by API version; keep these as project-specific constants.
    """
    def __init__(self, oauth: SmartStoreOAuth):
        self.oauth = oauth

    def _token(self) -> str:
        return self.oauth.issue_token()["access_token"]

    # ---- Example placeholders (project may adjust path) ----
    def list_orders(self, *, from_dt: str, to_dt: str, last_id: str|None=None, limit: int=200) -> Any:
        token = self._token()
        url = BASE + "/external/v1/pay-order/seller/orders"  # placeholder
        params = {"from": from_dt, "to": to_dt, "lastId": last_id, "limit": limit}
        return _request("GET", url, token=token, params=params)

    def list_products(self, *, last_id: str|None=None, limit: int=200) -> Any:
        token = self._token()
        url = BASE + "/external/v1/products"  # placeholder
        params = {"lastId": last_id, "limit": limit}
        return _request("GET", url, token=token, params=params)
