# Policy DSL Catalog (Templates)

> DSL is stored as policy JSON and can be edited via Admin UI without code changes.

## 1) Google Ads — Budget Guardrail
- allow: campaign.update_budget, campaign.pause
- deny: account.delete, billing.change
- constraints:
  - budget_delta_pct_max: 15
  - daily_budget_cap: 50000

## 2) Amazon Ads — Bid/Budget Guardrail
- allow: campaign.update_budget, bid.update
- deny: account.transfer, profile.delete
- constraints:
  - bid_change_pct_max: 10
  - budget_delta_pct_max: 10

## 3) Cross-channel Spend Cap
- constraints:
  - global_daily_spend_cap: 120000
  - channel_mix_ratio_max:
      google_ads: 0.7
      amazon_ads: 0.6

## 4) Anomaly Kill-switch
- constraints:
  - anomaly_threshold_sigma: 3
- action:
  - auto_pause_campaigns_on_anomaly: true

## 5) High-risk actions require approval
- approvals:
  - required_for:
      - campaign.pause
      - campaign.enable
      - keyword.remove
