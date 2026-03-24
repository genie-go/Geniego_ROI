from __future__ import annotations
import os
from typing import List, Dict, Any
from .base import Campaign
from app.core.config import settings

try:
    from google.ads.googleads.client import GoogleAdsClient
except Exception:  # pragma: no cover
    GoogleAdsClient = None  # type: ignore

class GoogleAdsConnector:
    channel = "google"

    def __init__(self):
        self.mode = settings.auth_mode
        self.customer_id = os.getenv("GOOGLE_ADS_CUSTOMER_ID","").replace("-","")
        self._client = None
        if self.mode == "real":
            if GoogleAdsClient is None:
                raise RuntimeError("google-ads SDK not installed")
            cfg = {
                "developer_token": os.getenv("GOOGLE_ADS_DEVELOPER_TOKEN",""),
                "client_id": os.getenv("GOOGLE_ADS_CLIENT_ID",""),
                "client_secret": os.getenv("GOOGLE_ADS_CLIENT_SECRET",""),
                "refresh_token": os.getenv("GOOGLE_ADS_REFRESH_TOKEN",""),
                "use_proto_plus": True,
            }
            login = os.getenv("GOOGLE_ADS_LOGIN_CUSTOMER_ID","").strip()
            if login:
                cfg["login_customer_id"] = login.replace("-","")
            self._client = GoogleAdsClient.load_from_dict(cfg)

    def list_campaigns(self, account_id: str) -> List[Campaign]:
        if self.mode != "real" or self._client is None:
            return [
                Campaign(channel="google", account_id=account_id, campaign_id="111", name="Stub Campaign A", status="ENABLED", daily_budget=50000),
                Campaign(channel="google", account_id=account_id, campaign_id="222", name="Stub Campaign B", status="PAUSED", daily_budget=30000),
            ]
        ga = self._client.get_service("GoogleAdsService")
        q = """
        SELECT campaign.id, campaign.name, campaign.status, campaign_budget.amount_micros
        FROM campaign
        WHERE campaign.status != 'REMOVED'
        LIMIT 50
        """
        res = ga.search(customer_id=self.customer_id, query=q)
        out: List[Campaign] = []
        for row in res:
            out.append(Campaign(
                channel="google",
                account_id=account_id,
                campaign_id=str(row.campaign.id),
                name=row.campaign.name,
                status=str(row.campaign.status),
                daily_budget=float(row.campaign_budget.amount_micros)/1_000_000.0 if row.campaign_budget.amount_micros else None,
            ))
        return out

    def update_daily_budget(self, account_id: str, campaign_id: str, new_daily_budget: float) -> Dict[str, Any]:
        # Delegate to legacy executor if present
        from services.google_budget_executor import GoogleBudgetExecutor, BudgetUpdateRequest
        ex = GoogleBudgetExecutor(client=self._client)
        ok, msg, meta = ex.update_campaign_budget(BudgetUpdateRequest(
            customer_id=self.customer_id,
            campaign_id=campaign_id,
            new_daily_budget=new_daily_budget,
        ))
        return {"ok": ok, "message": msg, "meta": meta}
