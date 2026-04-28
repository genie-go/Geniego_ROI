# V363 Marketplace Official API Scope Design (Shopee / Qoo10 / Rakuten)

This document defines **what V363 expects** from each marketplace official integration:
- auth method
- required scopes/permissions
- rate-limit strategy
- data entities and minimum fields
- incremental sync cursor strategy

> V363 intentionally separates **API contract (scope + schema)** from the collector code so that
> enterprise customers can lock down credentials and audit changes.

## Common entities
V363 normalizes all marketplaces into these entities:
- Product (sku, title, price, currency, category, images, attributes)
- Inventory (sku, on_hand, reserved, available)
- Order (order_id, items, qty, price, status, buyer_region, created_at)
- Review (product_id/sku, rating, body, created_at, locale)

## Rate limiting strategy
- Token-bucket per tenant + per channel
- Backoff + jitter on 429/5xx
- Idempotent page cursors

## Shopee (official)
Auth: OAuth2 (merchant app) or partner key flow depending on region.
Minimum scopes:
- product.read
- order.read
- inventory.read
- review.read
Rate limit:
- configurable in `channel_api_profiles.json` (default 30 rpm)
Cursor:
- orders: updated_since timestamp + page cursor
- reviews: created_since timestamp

## Qoo10 (official)
Auth: API key + secret (where supported) / partner auth.
Minimum scopes:
- item.read
- order.read
- stock.read
- review.read
Rate limit:
- configurable (default 20 rpm)
Cursor:
- order last_updated + pagination

## Rakuten (official)
Auth: OAuth2 or application key per API product (RMS etc).
Minimum scopes:
- item.read
- order.read
- inventory.read
- review.read
Rate limit:
- configurable (default 15 rpm)
Cursor:
- updated_since timestamp
