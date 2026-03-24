"""V242 - Google Ads budget execution (real mode)

This module applies approved budget updates to Google Ads campaign budgets.
It is designed to be called from worker execution flow.

Safety:
- AUTO_EXECUTE must be true
- DRY_RUN must be false to mutate
- Guardrails in config/risk_thresholds.yaml must pass
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Dict, Any, Tuple
import os

try:
    from google.ads.googleads.client import GoogleAdsClient
    from google.ads.googleads.errors import GoogleAdsException
except Exception:  # pragma: no cover
    GoogleAdsClient = None  # type: ignore
    GoogleAdsException = Exception  # type: ignore


@dataclass
class BudgetUpdateRequest:
    customer_id: str
    campaign_id: str
    new_daily_budget: float  # in account currency units
    currency_code: Optional[str] = None


class GoogleBudgetExecutor:
    def __init__(self, client: Optional["GoogleAdsClient"] = None):
        self.client = client or self._build_client_from_env()

    def _build_client_from_env(self) -> "GoogleAdsClient":
        if GoogleAdsClient is None:
            raise RuntimeError("google-ads SDK not installed. Install requirements.txt and retry.")

        # Use env-based configuration so this works for ZIP distribution & containers.
        # Note: For production, prefer Vault and token rotation.
        config: Dict[str, Any] = {
            "developer_token": os.getenv("GOOGLE_ADS_DEVELOPER_TOKEN", ""),
            "client_id": os.getenv("GOOGLE_ADS_CLIENT_ID", ""),
            "client_secret": os.getenv("GOOGLE_ADS_CLIENT_SECRET", ""),
            "refresh_token": os.getenv("GOOGLE_ADS_REFRESH_TOKEN", ""),
            "use_proto_plus": True,
        }
        login_cid = os.getenv("GOOGLE_ADS_LOGIN_CUSTOMER_ID", "").strip()
        if login_cid:
            config["login_customer_id"] = login_cid.replace("-", "")

        return GoogleAdsClient.load_from_dict(config)

    @staticmethod
    def _to_micros(amount: float) -> int:
        # 1 unit currency == 1,000,000 micros
        return int(round(amount * 1_000_000))

    def update_campaign_budget(self, req: BudgetUpdateRequest) -> Tuple[bool, str, Dict[str, Any]]:
        """Update a campaign's budget amount via CampaignBudgetService.
        Returns (ok, message, meta)
        """
        assert self.client is not None

        ga_service = self.client.get_service("GoogleAdsService")

        query = f"""
            SELECT
              campaign.id,
              campaign.name,
              campaign.campaign_budget,
              campaign_budget.id,
              campaign_budget.resource_name,
              campaign_budget.amount_micros
            FROM campaign
            WHERE campaign.id = {req.campaign_id}
            LIMIT 1
        """

        try:
            stream = ga_service.search(customer_id=req.customer_id, query=query)
            row = next(iter(stream), None)
            if row is None:
                return False, "Campaign not found", {"campaign_id": req.campaign_id}

            budget_resource = row.campaign_budget.resource_name
            current_micros = int(row.campaign_budget.amount_micros)
            new_micros = self._to_micros(req.new_daily_budget)

            # Build operation
            budget_service = self.client.get_service("CampaignBudgetService")
            op = self.client.get_type("CampaignBudgetOperation")
            op.update.resource_name = budget_resource
            op.update.amount_micros = new_micros
            self.client.copy_from(op.update_mask, self.client.get_type("FieldMask"),)
            # The above copy_from is intentionally minimal; we set update_mask with helper below if available.
            # Safer: use protobuf field mask helper if present.
            try:
                from google.protobuf.field_mask_pb2 import FieldMask
                op.update_mask.CopyFrom(FieldMask(paths=["amount_micros"]))
            except Exception:
                pass

            res = budget_service.mutate_campaign_budgets(customer_id=req.customer_id, operations=[op])
            return True, "Budget updated", {
                "campaign_id": req.campaign_id,
                "budget_resource": budget_resource,
                "current_amount_micros": current_micros,
                "new_amount_micros": new_micros,
                "result": str(res),
            }
        except GoogleAdsException as ex:  # type: ignore
            return False, f"GoogleAdsException: {ex}", {"customer_id": req.customer_id, "campaign_id": req.campaign_id}
        except StopIteration:
            return False, "Campaign not found", {"campaign_id": req.campaign_id}
        except Exception as ex:
            return False, f"Unexpected error: {ex}", {"customer_id": req.customer_id, "campaign_id": req.campaign_id}
