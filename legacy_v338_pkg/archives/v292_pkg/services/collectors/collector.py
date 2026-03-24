import os, time, json, datetime, random, hashlib
import requests
from typing import Any, Dict, Optional, Tuple, List

API_BASE = os.getenv("API_BASE", "http://gateway:8080")
TENANT_ID = os.getenv("TENANT_ID", "demo-tenant")
API_KEY = os.getenv("API_KEY", "")
INTERVAL_SECONDS = int(os.getenv("COLLECT_INTERVAL_SECONDS", "300"))
DRY_RUN = os.getenv("DRY_RUN", "true").lower() in ("1","true","yes","y")
BACKFILL_DAYS = int(os.getenv("BACKFILL_DAYS", "3"))

# Provider priority (Global + KR)
PROVIDER_PRIORITY = ["google_ads", "meta_ads", "tiktok_ads", "amazon_ads", "naver_sa", "kakao_moment"]

DEFAULT_RATE_LIMITS = {
    "google_ads": {"rps": 8, "burst": 16, "max_retries": 7},
    "meta_ads": {"rps": 10, "burst": 20, "max_retries": 7},
    "tiktok_ads": {"rps": 8, "burst": 16, "max_retries": 7},
    "amazon_ads": {"rps": 6, "burst": 12, "max_retries": 7},
    "naver_sa": {"rps": 5, "burst": 10, "max_retries": 7},
    "kakao_moment": {"rps": 6, "burst": 12, "max_retries": 7},
}



# --- V291: Standardized rate-limit parsing across providers -----------------

class RateLimitStandard:
    def __init__(self, remaining: Optional[float]=None, reset_epoch: Optional[float]=None, retry_after: Optional[float]=None):
        self.remaining = remaining
        self.reset_epoch = reset_epoch
        self.retry_after = retry_after

def _to_float(x: Any) -> Optional[float]:
    try:
        if x is None: return None
        return float(x)
    except Exception:
        return None

def parse_rate_limit_standard(resp: requests.Response) -> RateLimitStandard:
    """
    Normalize provider-specific headers into a standard form.
    Supports:
      - Retry-After (seconds)
      - X-RateLimit-Remaining / X-RateLimit-Reset
      - x-amzn-RateLimit-* (Amazon Ads)
      - Meta Graph: X-App-Usage / X-Ad-Account-Usage JSON
      - TikTok: x-tt-ratelimit-remaining, x-tt-ratelimit-reset (varies)
    """
    h = {k.lower(): v for k,v in resp.headers.items()}
    st = RateLimitStandard()

    # Explicit retry-after first
    if "retry-after" in h:
        st.retry_after = _to_float(h.get("retry-after"))

    # Generic remaining/reset
    for rem_key in ("x-ratelimit-remaining", "x-rate-limit-remaining", "ratelimit-remaining"):
        if rem_key in h:
            st.remaining = _to_float(h.get(rem_key))
            break
    for reset_key in ("x-ratelimit-reset", "x-rate-limit-reset", "ratelimit-reset"):
        if reset_key in h:
            st.reset_epoch = _to_float(h.get(reset_key))
            break

    # Amazon Ads often uses x-amzn-RateLimit-*; keep retry_after if present.
    for amzn_key in ("x-amzn-ratelimit-remaining", "x-amzn-ratelimit-remaining-second"):
        if amzn_key in h and st.remaining is None:
            st.remaining = _to_float(h.get(amzn_key))
            break

    # Meta usage headers are JSON: {"call_count":...,"total_cputime":...,"total_time":...}
    # Heuristic: if utilization is high, pause.
    for meta_key in ("x-app-usage", "x-ad-account-usage", "x-business-use-case-usage"):
        if meta_key in h and st.retry_after is None:
            try:
                usage = json.loads(h.get(meta_key))
                cc = usage.get("call_count") or usage.get("acc_id_util_pct") or 0
                cc = float(cc)
                if cc >= 95:
                    st.retry_after = 2.5
                elif cc >= 85:
                    st.retry_after = 1.0
            except Exception:
                pass

    # TikTok (varies) - common keys
    if st.remaining is None:
        for k in ("x-tt-ratelimit-remaining", "x-tt-rate-limit-remaining", "x-rate-limit-remaining"):
            if k in h:
                st.remaining = _to_float(h.get(k))
                break
    if st.reset_epoch is None:
        for k in ("x-tt-ratelimit-reset", "x-tt-rate-limit-reset"):
            if k in h:
                st.reset_epoch = _to_float(h.get(k))
                break

    return st

def compute_throttle_sleep(st: RateLimitStandard) -> Optional[float]:
    if st.retry_after is not None and st.retry_after > 0:
        return min(60.0, st.retry_after)
    if st.remaining is not None and st.reset_epoch is not None:
        if st.remaining <= 1:
            now = time.time()
            wait = max(0.5, st.reset_epoch - now)
            return min(30.0, wait)
    if st.remaining is not None and st.remaining <= 2:
        return 0.8
    return None
def api(method: str, path: str, payload: Optional[dict]=None) -> Any:
    headers = {
        "Content-Type": "application/json",
        "X-Tenant-ID": TENANT_ID,
        "X-API-Key": API_KEY,
    }
    url = API_BASE + path
    r = requests.request(method, url, headers=headers, data=json.dumps(payload) if payload is not None else None, timeout=30)
    if r.status_code >= 400:
        raise RuntimeError(f"gateway {method} {path} failed: {r.status_code} {r.text}")
    return r.json() if r.text else {}

class TokenBucket:
    def __init__(self, rps: float, burst: int):
        self.rps = float(rps)
        self.capacity = float(max(1, burst))
        self.tokens = self.capacity
        self.last = time.time()

    def acquire(self):
        now = time.time()
        elapsed = now - self.last
        self.last = now
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rps)
        if self.tokens < 1.0:
            need = 1.0 - self.tokens
            time.sleep(need / self.rps)
            self.tokens = 0.0
        else:
            self.tokens -= 1.0

def jitter_sleep(base: float, cap: float):
    t = min(cap, base) * (0.75 + random.random()*0.5)
    time.sleep(t)

def parse_retry_after(resp: requests.Response) -> Optional[float]:
    ra = resp.headers.get("Retry-After")
    if not ra: return None
    try:
        return float(ra)
    except:
        return None

def parse_rate_limit_hint(resp: requests.Response) -> Optional[float]:
    """
    Best-effort dynamic throttling: if remaining is low or reset is near, sleep a bit.
    Works across providers with different header conventions.
    """
    # Common patterns
    remaining = resp.headers.get("X-RateLimit-Remaining") or resp.headers.get("x-ratelimit-remaining")
    reset = resp.headers.get("X-RateLimit-Reset") or resp.headers.get("x-ratelimit-reset")
    if remaining is None or reset is None:
        return None
    try:
        rem = float(remaining)
        rst = float(reset)
        if rem <= 1:
            now = time.time()
            # reset could be epoch seconds or delta seconds; handle both
            sleep_s = (rst - now) if rst > now + 5 else rst
            return max(0.5, min(30.0, sleep_s))
    except:
        return None
    return None

class ProviderClient:
    provider: str
    def __init__(self, account: dict, rl_cfg: dict):
        self.account = account
        self.provider = account["provider"]
        self.account_id = account["account_id"]
        self.config = account.get("config_json", {}) or {}
        self.auth = account.get("auth_json", {}) or {}
        self.token = account.get("token_json", {}) or {}
        self.expires_at = account.get("token_expires_at")
        self.bucket = TokenBucket(rl_cfg.get("rps", 5), rl_cfg.get("burst", 10))
        self.max_retries = int(rl_cfg.get("max_retries", 6))

    def refresh_token_if_needed(self):
        # Template: provider-specific; implement in subclasses where OAuth applies.
        return

    def request(self, method: str, url: str, headers: dict, payload: Optional[dict]=None, params: Optional[dict]=None) -> requests.Response:
        base = 1.0
        cap = 60.0
        for attempt in range(self.max_retries):
            self.bucket.acquire()
            try:
                r = requests.request(method, url, headers=headers, json=payload, params=params, timeout=40)
            except requests.RequestException:
                jitter_sleep(base * (2 ** attempt), cap)
                continue

            # dynamic throttling hints (standardized)
            st = parse_rate_limit_standard(r)
            sleep_s = compute_throttle_sleep(st)
            if sleep_s is not None:
                time.sleep(sleep_s)

            if r.status_code in (429, 500, 502, 503, 504):
                jitter_sleep(base * (2 ** attempt), cap)
                continue
            return r
        raise RuntimeError(f"{self.provider} request failed after retries: {method} {url}")

    def fetch_daily_metrics(self, start_date: datetime.date, end_date: datetime.date) -> List[dict]:
        """
        Return list of rows: {date, spend, impressions, clicks, conversions, revenue(optional), campaign_id(optional)}
        """
        raise NotImplementedError

class GoogleAdsClient(ProviderClient):
    # Google Ads API: https://developers.google.com/google-ads/api/docs/start
    def refresh_token_if_needed(self):
        # OAuth2 refresh template
        if not self.auth.get("client_id") or not self.token.get("refresh_token"):
            return
        # If expires_at exists and is > now+60, skip
        try:
            if self.expires_at:
                exp = datetime.datetime.fromisoformat(self.expires_at.replace("Z","+00:00"))
                if exp > datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=60):
                    return
        except:
            pass
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "client_id": self.auth.get("client_id"),
            "client_secret": self.auth.get("client_secret"),
            "refresh_token": self.token.get("refresh_token"),
            "grant_type": "refresh_token",
        }
        r = requests.post(token_url, data=data, timeout=30)
        if r.status_code >= 300:
            raise RuntimeError(f"google token refresh failed: {r.status_code} {r.text}")
        tj = r.json()
        self.token["access_token"] = tj.get("access_token")
        expires_in = int(tj.get("expires_in", 3500))
        exp = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=expires_in)
        self.expires_at = exp.isoformat().replace("+00:00","Z")
        api("POST", "/v1/connectors/accounts/token", {
            "provider": self.provider,
            "account_id": self.account_id,
            "token_json": self.token,
            "token_expires_at": self.expires_at,
        })

    def fetch_daily_metrics(self, start_date, end_date):
        self.refresh_token_if_needed()
        customer_id = self.config.get("customer_id") or self.account_id
        dev_token = self.auth.get("developer_token")
        login_cid = self.auth.get("login_customer_id")
        if not self.token.get("access_token") or not dev_token:
            raise RuntimeError("google_ads missing access_token or developer_token")
        url = f"https://googleads.googleapis.com/v16/customers/{customer_id}/googleAds:searchStream"
        headers = {
            "Authorization": f"Bearer {self.token.get('access_token')}",
            "developer-token": dev_token,
            "Content-Type": "application/json",
        }
        if login_cid:
            headers["login-customer-id"] = str(login_cid)
        # GAQL query (fields are stable-ish but versioned)
        gaql = f"""
          SELECT
            segments.date,
            metrics.impressions,
            metrics.clicks,
            metrics.conversions,
            metrics.cost_micros,
            campaign.id
          FROM campaign
          WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
        """
        payload = {"query": gaql}
        r = self.request("POST", url, headers=headers, payload=payload)
        if r.status_code >= 300:
            raise RuntimeError(f"google_ads report failed: {r.status_code} {r.text}")
        # searchStream returns JSON lines in some clients; in practice, google returns array of results per chunk
        rows = []
        try:
            data = r.json()
            chunks = data if isinstance(data, list) else [data]
            for ch in chunks:
                for res in ch.get("results", []):
                    m = res.get("metrics", {})
                    s = res.get("segments", {})
                    c = res.get("campaign", {})
                    cost = float(m.get("costMicros", 0)) / 1_000_000.0
                    rows.append({
                        "date": s.get("date"),
                        "impressions": int(m.get("impressions", 0)),
                        "clicks": int(m.get("clicks", 0)),
                        "conversions": float(m.get("conversions", 0)),
                        "spend": cost,
                        "campaign_id": str(c.get("id","")),
                    })
        except Exception:
            # fallback: no parse
            pass
        return rows

class MetaAdsClient(ProviderClient):
    def refresh_token_if_needed(self):
        # Meta long-lived tokens are usually managed differently; template keeps as-is.
        return

    def fetch_daily_metrics(self, start_date, end_date):
        access_token = self.token.get("access_token") or self.auth.get("access_token")
        act_id = self.config.get("ad_account_id") or self.account_id
        if not access_token:
            raise RuntimeError("meta_ads missing access token")
        url = f"https://graph.facebook.com/v19.0/act_{act_id}/insights"
        params = {
            "access_token": access_token,
            "time_increment": 1,
            "time_range": json.dumps({"since": str(start_date), "until": str(end_date)}),
            "level": "campaign",
            "fields": ",".join([
                "date_start","impressions","clicks","spend","actions","action_values","campaign_id"
            ]),
        }
        r = self.request("GET", url, headers={}, params=params)
        if r.status_code >= 300:
            raise RuntimeError(f"meta insights failed: {r.status_code} {r.text}")
        data = r.json()
        out=[]
        for it in data.get("data", []):
            conv = 0.0
            for a in it.get("actions", []) or []:
                if a.get("action_type") in ("purchase","offsite_conversion.purchase","omni_purchase"):
                    try: conv += float(a.get("value", 0))
                    except: pass
            out.append({
                "date": it.get("date_start"),
                "impressions": int(it.get("impressions",0)),
                "clicks": int(it.get("clicks",0)),
                "conversions": conv,
                "spend": float(it.get("spend",0.0)),
                "campaign_id": it.get("campaign_id",""),
            })
        return out

class TikTokAdsClient(ProviderClient):
    def refresh_token_if_needed(self):
        # TikTok OAuth template (refresh token endpoint differs by region/app)
        return

    def fetch_daily_metrics(self, start_date, end_date):
        token = self.token.get("access_token") or self.auth.get("access_token")
        advertiser_id = self.config.get("advertiser_id") or self.account_id
        if not token:
            raise RuntimeError("tiktok_ads missing access token")
        url = "https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/"
        headers = {"Access-Token": token, "Content-Type":"application/json"}
        payload = {
            "advertiser_id": str(advertiser_id),
            "service_type": "AUCTION",
            "report_type": "BASIC",
            "data_level": "AUCTION_CAMPAIGN",
            "dimensions": ["stat_time_day","campaign_id"],
            "metrics": ["spend","impressions","clicks","conversion"],
            "start_date": str(start_date),
            "end_date": str(end_date),
            "page": 1,
            "page_size": 1000,
        }
        r = self.request("POST", url, headers=headers, payload=payload)
        if r.status_code >= 300:
            raise RuntimeError(f"tiktok report failed: {r.status_code} {r.text}")
        j=r.json()
        out=[]
        for it in (j.get("data",{}) or {}).get("list", []) or []:
            out.append({
                "date": it.get("stat_time_day"),
                "impressions": int(it.get("impressions",0)),
                "clicks": int(it.get("clicks",0)),
                "conversions": float(it.get("conversion",0)),
                "spend": float(it.get("spend",0)),
                "campaign_id": it.get("campaign_id",""),
            })
        return out


class AmazonAdsClient(ProviderClient):
    """
    Amazon Ads Reporting (async).
    Implements the v3 reporting flow:
      1) Create report
      2) Poll until COMPLETED
      3) Download (GZIP JSON)
      4) Parse into daily rows
    Docs: Amazon Ads Reporting v3 (create report + get status + download location).
    """
    BASE = "https://advertising-api.amazon.com"

    def refresh_token_if_needed(self):
        # Amazon uses OAuth2. Many setups share Login with Amazon (LWA) token exchange.
        # auth_json should contain: client_id, client_secret, refresh_token, token_url (optional), scope (optional)
        # token_json contains: access_token
        if not self.auth.get("client_id") or not self.auth.get("client_secret") or not self.auth.get("refresh_token"):
            return
        token_url = self.auth.get("token_url") or "https://api.amazon.com/auth/o2/token"
        now = time.time()
        # best-effort expiry check; if no expires_at, refresh proactively every 50m
        expires_at = self.token.get("expires_at_epoch")
        if expires_at and now < float(expires_at) - 120:
            return

        payload = {
            "grant_type": "refresh_token",
            "refresh_token": self.auth.get("refresh_token"),
            "client_id": self.auth.get("client_id"),
            "client_secret": self.auth.get("client_secret"),
        }
        # LWA expects form encoding
        r = requests.post(token_url, data=payload, timeout=40)
        if r.status_code >= 300:
            raise RuntimeError(f"amazon_ads refresh failed: {r.status_code} {r.text[:200]}")
        tok = r.json()
        access = tok.get("access_token")
        exp = tok.get("expires_in", 3600)
        if access:
            self.token["access_token"] = access
            self.token["expires_at_epoch"] = now + float(exp)
            # persist token back to gateway
            persist_token(self.provider, self.account_id, self.token)

    def _headers(self) -> dict:
        self.refresh_token_if_needed()
        access = self.token.get("access_token") or self.auth.get("access_token")
        if not access:
            raise RuntimeError("amazon_ads missing access_token (token_json/auth_json)")
        profile = self.config.get("profile_id") or self.auth.get("profile_id")
        if not profile:
            raise RuntimeError("amazon_ads missing profile_id in config/auth")
        headers = {
            "Authorization": f"Bearer {access}",
            "Amazon-Advertising-API-ClientId": self.auth.get("client_id",""),
            "Amazon-Advertising-API-Scope": str(profile),
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        return headers

    def _create_report(self, start_date: datetime.date, end_date: datetime.date) -> str:
        """
        Use reporting v3. reportTypeId values depend on ad product.
        Default template: Sponsored Products campaign report (spCampaigns).
        """
        url = self.BASE + "/reporting/reports"
        body = {
            "name": f"genie_roi_sp_campaigns_{start_date}_{end_date}",
            "startDate": str(start_date),
            "endDate": str(end_date),
            "configuration": {
                "adProduct": self.config.get("ad_product","SPONSORED_PRODUCTS"),
                "groupBy": self.config.get("group_by", ["campaign"]),
                "columns": self.config.get("columns", [
                    "date","campaignId","campaignName",
                    "impressions","clicks","cost",
                    "purchases14d","sales14d"
                ]),
                "reportTypeId": self.config.get("report_type_id","spCampaigns"),
                "timeUnit": "DAILY",
                "format": "GZIP_JSON",
            }
        }
        r = self.request("POST", url, headers=self._headers(), payload=body)
        if r.status_code >= 300:
            raise RuntimeError(f"amazon_ads create report failed: {r.status_code} {r.text[:200]}")
        data = r.json()
        report_id = data.get("reportId") or data.get("reportId".lower())
        if not report_id:
            raise RuntimeError(f"amazon_ads create report: missing reportId: {data}")
        return str(report_id)

    def _get_report_status(self, report_id: str) -> dict:
        url = self.BASE + f"/reporting/reports/{report_id}"
        r = self.request("GET", url, headers=self._headers(), params=None)
        if r.status_code >= 300:
            raise RuntimeError(f"amazon_ads status failed: {r.status_code} {r.text[:200]}")
        return r.json()

    def _download_report(self, url: str) -> bytes:
        # Download is often a pre-signed URL (no auth header required)
        r = requests.get(url, timeout=60)
        if r.status_code >= 300:
            raise RuntimeError(f"amazon_ads download failed: {r.status_code} {r.text[:200]}")
        return r.content

    def _parse_gzip_json(self, blob: bytes) -> List[dict]:
        import gzip, io
        raw = gzip.GzipFile(fileobj=io.BytesIO(blob)).read()
        try:
            payload = json.loads(raw)
        except Exception:
            # Some responses are newline-delimited json objects.
            lines = raw.decode("utf-8").splitlines()
            payload = [json.loads(ln) for ln in lines if ln.strip()]
        rows = payload if isinstance(payload, list) else payload.get("rows") or payload.get("report") or []
        out: List[dict] = []
        for it in rows:
            d = it.get("date") or it.get("day") or it.get("startDate")
            if not d:
                continue
            cost = it.get("cost")
            # some report variants use cost in micros; keep as float currency if possible
            spend = float(cost) if cost is not None else float(it.get("spend", 0) or 0)
            impressions = int(it.get("impressions", 0) or 0)
            clicks = int(it.get("clicks", 0) or 0)
            conv = int(it.get("purchases14d", it.get("conversions", 0) or 0) or 0)
            sales = float(it.get("sales14d", it.get("revenue", 0) or 0) or 0)
            out.append({
                "date": str(d),
                "spend": spend,
                "impressions": impressions,
                "clicks": clicks,
                "conversions": conv,
                "revenue": sales,
                "provider": "amazon_ads",
            })
        return out

    def fetch_daily_metrics(self, start_date, end_date):
        if DRY_RUN:
            return []

        report_id = self._create_report(start_date, end_date)
        # Poll with progressive backoff, respecting rate limits
        deadline = time.time() + 8*60
        sleep_s = 2.0
        status = {}
        while time.time() < deadline:
            status = self._get_report_status(report_id)
            st = (status.get("status") or status.get("state") or "").upper()
            if st in ("COMPLETED", "SUCCESS"):
                break
            if st in ("FAILED", "CANCELLED"):
                raise RuntimeError(f"amazon_ads report failed: {status}")
            time.sleep(min(20.0, sleep_s))
            sleep_s = min(20.0, sleep_s * 1.5)

        location = status.get("url") or status.get("location") or status.get("downloadUrl")
        if not location:
            # Some variants return "url" within "download"
            dl = status.get("download") or {}
            location = dl.get("url") or dl.get("location")
        if not location:
            raise RuntimeError(f"amazon_ads report completed but no download url: {status}")

        blob = self._download_report(location)
        return self._parse_gzip_json(blob)

class NaverSAClient(ProviderClient):
    def refresh_token_if_needed(self):
        return

    def sign(self, timestamp_ms: str, method: str, uri: str) -> str:
        # HMAC signature template
        import hmac, base64, hashlib as _hash
        secret = self.auth.get("secret_key","")
        if not secret: return ""
        message = f"{timestamp_ms}.{method}.{uri}"
        digest = hmac.new(secret.encode("utf-8"), message.encode("utf-8"), _hash.sha256).digest()
        return base64.b64encode(digest).decode("utf-8")

    def fetch_daily_metrics(self, start_date, end_date):
        # Template for Naver SearchAd stats
        token = self.token.get("access_token") or self.auth.get("access_token")
        api_key = self.auth.get("api_key")
        customer_id = self.config.get("customer_id") or self.account_id
        if not token or not api_key:
            raise RuntimeError("naver_sa missing access token/api_key")
        uri = f"/stats"
        url = "https://api.searchad.naver.com" + uri
        ts = str(int(time.time()*1000))
        sig = self.sign(ts, "GET", uri)
        headers = {
            "X-Timestamp": ts,
            "X-API-KEY": api_key,
            "X-Customer": str(customer_id),
            "X-Signature": sig,
            "Authorization": f"Bearer {token}",
        }
        params = {"timeRange": f"{start_date}~{end_date}", "timeUnit":"DAY"}
        r = self.request("GET", url, headers=headers, params=params)
        if r.status_code >= 300:
            raise RuntimeError(f"naver stats failed: {r.status_code} {r.text}")
        # parsing depends on report type; template only
        return []

class KakaoMomentClient(ProviderClient):
    def refresh_token_if_needed(self):
        return

    def fetch_daily_metrics(self, start_date, end_date):
        token = self.token.get("access_token") or self.auth.get("access_token")
        if not token:
            raise RuntimeError("kakao_moment missing access token")
        # Template endpoint
        url = "https://apis.moment.kakao.com/openapi/v4/reports/campaigns"
        headers = {"Authorization": f"Bearer {token}"}
        params = {"startDate": str(start_date), "endDate": str(end_date), "timeUnit":"DAY"}
        r = self.request("GET", url, headers=headers, params=params)
        if r.status_code >= 300:
            raise RuntimeError(f"kakao report failed: {r.status_code} {r.text}")
        return []

CLIENTS = {
    "google_ads": GoogleAdsClient,
    "meta_ads": MetaAdsClient,
    "tiktok_ads": TikTokAdsClient,
    "amazon_ads": AmazonAdsClient,
    "naver_sa": NaverSAClient,
    "kakao_moment": KakaoMomentClient,
}

def choose_client(account: dict, rate_cfg: dict) -> ProviderClient:
    cls = CLIENTS.get(account["provider"])
    if not cls:
        raise RuntimeError(f"unsupported provider: {account['provider']}")
    return cls(account, rate_cfg)

def ingest_rows(provider: str, rows: List[dict]):
    # Aggregate to daily rows for channel_metrics
    payload_rows=[]
    for r in rows:
        payload_rows.append({
            "date": r.get("date"),
            "spend": float(r.get("spend",0)),
            "impressions": int(r.get("impressions",0)),
            "clicks": int(r.get("clicks",0)),
            "conversions": float(r.get("conversions",0)),
            "provider": provider,
        })
    if payload_rows:
        api("POST", "/v1/roi/metrics/ads", {"rows": payload_rows})

def dry_run_rows(start_date: datetime.date, end_date: datetime.date, provider: str) -> List[dict]:
    days=(end_date-start_date).days+1
    out=[]
    for i in range(days):
        d=start_date + datetime.timedelta(days=i)
        out.append({
            "date": str(d),
            "spend": round(random.random()*200,2),
            "impressions": int(random.random()*50000),
            "clicks": int(random.random()*2500),
            "conversions": round(random.random()*80,2),
        })
    return out

def main():
    while True:
        try:
            # get rate-limit overrides (optional)
            rl_overrides = {}
            try:
                resp = api("GET", "/v1/providers/rate_limits", None)
                items = resp.get("items", []) if isinstance(resp, dict) else (resp if isinstance(resp, list) else [])
                for it in items:
                    rl_overrides[it["provider"]] = it.get("config_json", {})
            except Exception:
                pass

            acc_resp = api("GET", "/v1/connectors/accounts", None)
            accounts = acc_resp.get("items", []) if isinstance(acc_resp, dict) else (acc_resp if isinstance(acc_resp, list) else [])
            # process in priority order
            accounts.sort(key=lambda a: PROVIDER_PRIORITY.index(a["provider"]) if a["provider"] in PROVIDER_PRIORITY else 999)
            today = datetime.date.today()
            # watermark strategy: always backfill N days to avoid missed late-attributed conversions; rely on dedupe server-side
            start_date = today - datetime.timedelta(days=BACKFILL_DAYS)
            end_date = today - datetime.timedelta(days=1)

            for acc in accounts:
                prov = acc["provider"]
                cfg = DEFAULT_RATE_LIMITS.get(prov, {"rps":5,"burst":10,"max_retries":6})
                cfg.update(rl_overrides.get(prov, {}))
                if DRY_RUN:
                    rows = dry_run_rows(start_date, end_date, prov)
                else:
                    client = choose_client(acc, cfg)
                    rows = client.fetch_daily_metrics(start_date, end_date)
                ingest_rows(prov, rows)
                # update last sync
                api("POST", "/v1/connectors/accounts/sync_mark", {"provider": prov, "account_id": acc["account_id"]})
        except Exception as e:
            print("collector loop error:", e, flush=True)
        time.sleep(INTERVAL_SECONDS)

if __name__ == "__main__":
    main()
