# V304 Upgrade Notes (from V303)

## Goals
- Keep all V303 features intact.
- Harden Korea commerce connectors (Coupang / Cafe24 / Naver SmartStore) toward production realities:
  - Real auth specs
  - Pagination (where applicable)
  - Partial shipment / returns / exchanges / reason codes surfaced as order events
  - Rate-limit policy: distributed throttling

## What changed
### Connectors
- Coupang provider rewritten for OpenAPI HMAC auth and real endpoints:
  - Ordersheets list (v5)
  - Return/Cancellation request list (v4)
  - Exchange request list (v4)
- Cafe24 provider updated:
  - Base URL: https://{mall_id}.cafe24api.com
  - Offset pagination helper
  - Claims endpoints probed (mall/version dependent)
- Naver SmartStore provider:
  - Production-ready shell (OAuth refresh + robust HTTP fetch), requires tenant-specific endpoint config.

### Commerce worker
- Throttling upgraded to DB-backed token bucket using:
  - commerce_rate_limits
  - commerce_rate_limit_state

### DB
- New migration: 0020_v304_korea_prod_hardening.sql
  - Adds claim metadata columns to commerce_order_events
  - Seeds default rate limits for the 3 KR channels (overridable)

## Known gaps (intentional)
- "Write" APIs for marketplace channels (listing, price, inventory, shipment/waybill) remain scaffolded.
  This is to avoid breaking changes because each seller's policies, category mappings, and approvals differ.

## How to run
Same as V303. Apply migrations then restart services.
