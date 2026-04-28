# GENIE_ROI V385 Merge Report

## Base
- Base runtime: V384 (kept as-is)
- Added legacy sources: V199~V220 imported under `backend/app/legacy_versions/`

## Upgrades in V385
### 1) Cross-channel analytics foundation
- Added `AnalyticsMetric` table + Alembic migration `0004_v385_analytics_metric.py`
- Added ingestion endpoint: `POST /v385/ingest/metrics`
  - Stores **aggregated** metrics only (no PII)

### 2) Recommendation engine upgrades
- `GET /v385/recommendations/traffic-cost` : traffic/cost/ROAS rules
- `GET /v385/recommendations/budget-allocation` : portfolio-style budget shift suggestions (capped)

### 3) Connector framework (ready-to-fill)
- Added YAML-driven REST connector + provider skeletons:
  - Shopify Admin API, Meta Marketing API, TikTok Ads API (REST skeleton)
  - Amazon SP-API skeleton (requires LWA + AWS SigV4 signing)
- Connector specs copied/added under `backend/app/connector_specs/`:
  - coupang, naver, qoo10, rakuten (from legacy)
  - amazon_spapi, shopify_admin, meta_marketing, tiktok_ads (new placeholder specs)

## Notes
- External channel credentials are not embedded. Providers are designed to integrate with a secret manager.
- Amazon SP-API signing is intentionally not implemented in this build (safety + credentials required).