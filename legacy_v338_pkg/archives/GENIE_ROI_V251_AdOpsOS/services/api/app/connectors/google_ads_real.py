from __future__ import annotations

from dataclasses import asdict
from typing import List, Optional, Dict, Any

from .base import ExternalCampaign

class GoogleAdsRealClientError(RuntimeError):
    pass

def _require(d: Dict[str, Any], key: str) -> str:
    v = d.get(key)
    if not v:
        raise GoogleAdsRealClientError(f"Missing required auth field: {key}")
    return str(v)

def list_campaigns_via_google_ads_sdk(auth: Dict[str, Any], *, account_id: Optional[str]=None) -> List[ExternalCampaign]:
    """Real Google Ads campaign fetch via official google-ads SDK (if installed).

    Expected auth fields:
      - developer_token
      - client_id
      - client_secret
      - refresh_token
      - customer_id  (Google Ads customer ID, digits only, e.g. 1234567890)
      - login_customer_id (optional, manager account)
    Optional:
      - page_size (default 1000)

    Notes:
      - This code path requires the `google-ads` Python package at runtime.
      - Network access + valid credentials are needed when you run the system.
    """
    try:
        from google.ads.googleads.client import GoogleAdsClient
    except Exception as e:  # pragma: no cover
        raise GoogleAdsRealClientError(
            "google-ads SDK is not installed. Install it in services/api/requirements.txt (google-ads)."
        ) from e

    developer_token = _require(auth, "developer_token")
    client_id = _require(auth, "client_id")
    client_secret = _require(auth, "client_secret")
    refresh_token = _require(auth, "refresh_token")
    customer_id = _require(auth, "customer_id")
    login_customer_id = auth.get("login_customer_id")
    page_size = int(auth.get("page_size") or 1000)

    config = {
        "developer_token": developer_token,
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "use_proto_plus": True,
    }
    if login_customer_id:
        config["login_customer_id"] = str(login_customer_id)

    client = GoogleAdsClient.load_from_dict(config)
    ga_service = client.get_service("GoogleAdsService")

    # Basic campaign list query
    query = """
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign.bidding_strategy_type
        FROM campaign
        ORDER BY campaign.id
    """

    campaigns: List[ExternalCampaign] = []
    stream = ga_service.search_stream(customer_id=str(customer_id), query=query)
    for batch in stream:
        for row in batch.results:
            c = row.campaign
            status = str(c.status).upper()
            active = status in ("ENABLED",)
            campaigns.append(
                ExternalCampaign(
                    external_id=str(c.id),
                    name=str(c.name),
                    status=status,
                    active=active,
                    meta={
                        "channel_type": str(c.advertising_channel_type),
                        "bidding": str(c.bidding_strategy_type),
                    },
                )
            )
            if len(campaigns) >= page_size:
                return campaigns
    return campaigns
