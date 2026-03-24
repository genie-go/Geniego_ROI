# V388 Merge Report

Base: V387
Added:
- Standard unified ingestion schema (Meta/TikTok campaign/adset/creative + demographic; Shopify product-level)
- API: /v388/ingest/unified, /v388/schema/examples
- Shopify: order ingestion now includes line_items and product-level revenue/units metrics
- Meta: supports level=ad and breakdowns; stores campaign/adset/creative identifiers
- TikTok: supports campaign/adgroup/ad dimensions and normalizes to campaign/adset/creative identifiers
- Legacy packages integrated: V172~V176, V178~V185 (original preserved under backend/app/legacy_versions)

Version updated: V388
Generated: 2026-03-01T05:08:37.977599Z
