# V389 Merge & Upgrade Report

## Baseline
- Started from GENIE_ROI **V388**.

## What’s new in V389

### 1) Operational standard schema (ads + commerce attribution)
- Added **non-PII attribution dimensions** to the allowed schema:
  - `utm_source, utm_medium, utm_campaign, utm_content, utm_term`
  - `discount_code, landing_path`
- Exposed schema/conventions endpoint:
  - `GET /v389/schema/standard`

### 2) Shopify orders → attributed product revenue ingestion
- New endpoint:
  - `POST /v389/ingest/shopify/orders`
- Transforms Shopify Orders JSON into unified, aggregated rows and writes to `analytics_metric` via the existing normalized ingestion pipeline.
- Deterministic product id rule:
  1) variant_id → `shopify:variant:<id>`
  2) product_id → `shopify:product:<id>`
  3) sku → `sku:<sku>`
  4) title → `title:<normalized>`

### 3) Ops guide (checklist)
- Added: `docs/V389_OPERATIONS_GUIDE_CHECKLIST.md`
  - Meta/TikTok breakdown strategy and stability guidance
  - Shopify ↔ ads matching methods (UTM / discount code / landing path / product mapping)

## Compatibility
- V389 **keeps all V388 APIs and functionality**.
- V389 adds new APIs under `/v389/*`.
