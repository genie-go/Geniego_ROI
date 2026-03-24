# GENIE_ROI V387 Merge & Upgrade Report

## Included Baseline
- V386 (which already contains V384 + V385 features)
- Integrated legacy packages V186~V198 under `backend/app/legacy_versions/v186~v198` (preserved as-is)

## Key Upgrades in V387
### 1) Recommendation Engine Upgrade Path
- **Rule-based** recommendations (provider-level + demographic highlights)
- **Goal-based** recommendations (ROAS / optional CPA targets; group_by provider/campaign/adset/creative/product/country/demographic)
- **Incrementality-style** recommendations using a **marginal ROAS proxy**:
  - (revenue_t - revenue_prev) / (spend_t - spend_prev) over rolling windows
  - includes diminishing-return flags and budget shift suggestions

### 2) API Endpoints (FastAPI)
- `/v387/recommendations/rule`
- `/v387/recommendations/goal`
- `/v387/recommendations/incrementality`

### 3) Data Requirements (analytics_metric)
All recommendations operate on aggregated (non-PII) metrics stored in `analytics_metric`:
- metric_type: `spend`, `impressions`, `clicks`, `conversions`, `revenue`
- provider: `meta`, `tiktok`, `amazon_ads`, `shopify` (shopify used mainly for revenue/orders aggregation)
- optional dimensions JSON:
  - `country`, `gender`, `age_range`
  - `campaign_id`, `adset_id`, `creative_id`, `product_id` (if you ingest at those levels)

## Notes
- Incrementality output is a **proxy**; for true causal lift, add holdout tests (geo/segment), consistent attribution windows, and experiment governance.