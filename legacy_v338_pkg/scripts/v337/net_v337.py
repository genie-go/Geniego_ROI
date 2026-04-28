#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V337 network utilities:
- Rate limiting (token bucket per key)
- Retries with exponential backoff + jitter
- Error classification for failure reports
"""
from __future__ import annotations
import json, random, time, urllib.request, urllib.error
from typing import Any, Dict, Optional, Tuple

class TokenBucket:
    def __init__(self, rate_per_sec: float, burst: int):
        self.rate = max(0.01, float(rate_per_sec))
        self.capacity = max(1, int(burst))
        self.tokens = float(self.capacity)
        self.last = time.time()

    def take(self, n: float = 1.0) -> None:
        while True:
            now = time.time()
            elapsed = max(0.0, now - self.last)
            self.last = now
            self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
            if self.tokens >= n:
                self.tokens -= n
                return
            need = (n - self.tokens) / self.rate
            time.sleep(min(1.0, max(0.01, need)))

class RateLimiter:
    def __init__(self):
        self._buckets: Dict[str, TokenBucket] = {}

    def bucket(self, key: str, rate_per_sec: float, burst: int) -> TokenBucket:
        b = self._buckets.get(key)
        if b is None:
            b = TokenBucket(rate_per_sec, burst)
            self._buckets[key] = b
        return b

def classify_failure(http_status: int, body_text: str = "") -> str:
    s = int(http_status or 0)
    if s in (401,403):
        return "AUTH"
    if s == 429:
        return "RATE_LIMIT"
    if 400 <= s < 500:
        # approval pending often shows up as 409/422 depending on API
        if s in (409, 412, 422):
            return "VALIDATION"
        return "VALIDATION"
    if 500 <= s < 600:
        return "SERVER"
    if s == 0:
        return "NETWORK"
    return "UNKNOWN"

def request_json(
    method: str,
    url: str,
    *,
    headers: Optional[Dict[str,str]] = None,
    body_obj: Optional[Dict[str,Any]] = None,
    timeout: int = 30,
    retries: int = 6,
    backoff_base: float = 0.6,
    backoff_cap: float = 20.0,
    rate_bucket: Optional[TokenBucket] = None
) -> Tuple[int, Dict[str,Any], str]:
    """
    Returns (status, json_obj, raw_text)
    """
    if rate_bucket is not None:
        rate_bucket.take(1.0)

    data = None
    if body_obj is not None:
        data = json.dumps(body_obj, ensure_ascii=False).encode("utf-8")

    last_raw = ""
    last_status = 0
    for attempt in range(retries+1):
        req = urllib.request.Request(url, method=method.upper(), headers=headers or {}, data=data)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode("utf-8")
                last_raw = raw
                last_status = resp.status
                try:
                    return resp.status, (json.loads(raw) if raw else {}), raw
                except Exception:
                    return resp.status, {"raw": raw}, raw
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8") if getattr(e, "fp", None) else ""
            last_raw = raw
            last_status = int(getattr(e, "code", 0) or 0)

            # retry policy
            if last_status in (429, 500, 502, 503, 504):
                if attempt < retries:
                    sleep = min(backoff_cap, backoff_base * (2 ** attempt))
                    sleep = sleep * (0.8 + 0.4 * random.random())
                    time.sleep(sleep)
                    continue
            # no retry
            try:
                return last_status, (json.loads(raw) if raw else {"error": str(e)}), raw
            except Exception:
                return last_status, {"error": str(e), "raw": raw}, raw
        except Exception as e:
            last_raw = str(e)
            last_status = 0
            if attempt < retries:
                sleep = min(backoff_cap, backoff_base * (2 ** attempt))
                sleep = sleep * (0.8 + 0.4 * random.random())
                time.sleep(sleep)
                continue
            return 0, {"error": str(e)}, last_raw

    return last_status, {"raw": last_raw}, last_raw
