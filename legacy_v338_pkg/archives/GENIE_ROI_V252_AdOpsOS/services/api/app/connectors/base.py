from __future__ import annotations
from dataclasses import dataclass
from typing import Protocol, List, Optional, Dict, Any

@dataclass
class ExternalCampaign:
    external_id: str
    name: str
    status: str = "ENABLED"  # ENABLED/PAUSED/REMOVED
    daily_budget: float = 0.0
    spend_7d: float = 0.0
    revenue_7d: float = 0.0

class AdsConnector(Protocol):
    provider: str  # e.g. "google", "meta"

    async def list_campaigns(self, tenant_id: str, auth: Dict[str, Any], *, account_id: Optional[str]=None) -> List[ExternalCampaign]:
        ...

    async def update_campaign_budget(self, tenant_id: str, auth: Dict[str, Any], external_id: str, new_daily_budget: float) -> Dict[str, Any]:
        ...

    async def pause_campaign(self, tenant_id: str, auth: Dict[str, Any], external_id: str) -> Dict[str, Any]:
        ...
