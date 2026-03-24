from __future__ import annotations
from typing import List, Optional, Dict, Any
from .base import ExternalCampaign

class NaverConnector:
    provider = "naver"

    async def list_campaigns(self, tenant_id: str, auth: Dict[str, Any], *, account_id: Optional[str]=None) -> List[ExternalCampaign]:
        """List campaigns for the given provider.

        NOTE:
        - This V239 package ships with *safe stubs* that can run without real Ads credentials.
        - To connect to the real API, implement this method using the provider's official SDK/API
          and store credentials via Vault (recommended) or encrypted SecretRef.

        Expected auth fields (example):
        - google: access_token, developer_token, customer_id
        - meta: access_token, ad_account_id
        """
        seed = auth.get("mock_campaigns") or []
        return [ExternalCampaign(**c) for c in seed]

    async def update_campaign_budget(self, tenant_id: str, auth: Dict[str, Any], external_id: str, new_daily_budget: float) -> Dict[str, Any]:
        return {"ok": True, "provider": self.provider, "external_id": external_id, "new_daily_budget": new_daily_budget, "mode": "stub"}

    async def pause_campaign(self, tenant_id: str, auth: Dict[str, Any], external_id: str) -> Dict[str, Any]:
        return {"ok": True, "provider": self.provider, "external_id": external_id, "status": "PAUSED", "mode": "stub"}
