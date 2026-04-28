# GENIE_ROI V291 Upgrade

## What changed from V290

### 1) Amazon Ads async reporting (v3) - fully implemented
Collectors now include a concrete Amazon Ads reporting flow:
- Create report (POST `/reporting/reports`)
- Poll status (GET `/reporting/reports/{reportId}`)
- Download GZIP JSON from the returned location URL
- Parse daily rows (`date, spend, impressions, clicks, conversions, revenue`)

> Configure via `connector_accounts.config_json`:
- `report_type_id` (default `spCampaigns`)
- `ad_product` (default `SPONSORED_PRODUCTS`)
- `columns` (default includes `date,campaignId,campaignName,impressions,clicks,cost,purchases14d,sales14d`)
- `group_by` (default `["campaign"]`)
- `profile_id` (required)

### 2) Standardized dynamic throttling
Collectors normalize provider headers into:
- `retry_after`
- `remaining`
- `reset_epoch`

and apply consistent throttling + backoff.

### 3) Lift-aware influencer deal estimation
`POST /v1/influencers/deals/estimate` accepts:
- `experiment_id` (optional)
- `use_incremental` (optional)

If provided, the handler pulls Lift (incrementality) from experiments and can base fee recommendations on incremental profit instead of total profit.

Migration: `0010_v291_amazon_async_and_lift.sql`
