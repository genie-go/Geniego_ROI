# LIVE Collectors (V290)

This repo provides production-grade **templates** for real API calls and reliability patterns.
You must supply app credentials and tokens per provider.

## Providers
- Google Ads API (GAQL reporting)
- Meta Marketing API (Insights)
- TikTok Business API (Reporting)
- Amazon Ads API (Reports)
- Naver SearchAd (Stats) – HMAC signature template
- Kakao Moment (Reports) – auth token template

## Reliability patterns
- OAuth refresh: refresh access token before expiry; persist back to `connector_accounts.token_json`.
- Dynamic throttling: read headers like `Retry-After`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
- Backoff with jitter on 429/5xx.
- Watermark reprocessing: keep a `watermark` json; on failures, backfill last N days, dedupe by (date, campaign_id).

## Security
Store secrets in `connector_accounts.auth_json` (encrypted at rest in real deployment).
