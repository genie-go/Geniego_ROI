from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, Any, List, Protocol

@dataclass
class Campaign:
    channel: str
    account_id: str
    campaign_id: str
    name: str
    status: str
    daily_budget: float | None = None
    extra: Dict[str, Any] | None = None

class Connector(Protocol):
    channel: str
    def list_campaigns(self, account_id: str) -> List[Campaign]: ...
    def update_daily_budget(self, account_id: str, campaign_id: str, new_daily_budget: float) -> Dict[str, Any]: ...
