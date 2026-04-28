# V303 Upgrade — Korea Commerce “Real-Run” Completion (Coupang / Naver SmartStore / Cafe24)

This release focuses on **end-to-end, testable** commerce operations for the top 3 Korea channels:
- **Coupang**
- **Naver SmartStore**
- **Cafe24**

> Important note:
> This repository is a **reference implementation** intended to be testable out of the box.
> It ships with a **mock commerce API** (`mock_korea_commerce_api`) that emulates:
> - OAuth token refresh (Naver/Cafe24)
> - Product upsert
> - Inventory sync
> - Order event feed (created/cancelled/returned)
>
> To connect to production APIs, set `base_url` to the real endpoint and fill the auth/signature specifics.

## What’s new

### 1) Realistic auth flows (incl. refresh)
- Naver SmartStore: OAuth refresh flow, token persistence (`commerce_channel_tokens`)
- Cafe24: OAuth refresh flow, token persistence (`commerce_channel_tokens`)
- Coupang: HMAC signature headers (simplified demo contract)

### 2) Field mapping + normalized schema
Connectors return normalized objects:
- products: `{sku,title,price,currency,images,options,shipping,raw}`
- orders: `{order_id,status,ordered_at,buyer_id,total_amount,currency,items,raw}`
- inventory: `{sku,qty,raw}`

### 3) Orders + cancel/return + inventory reservation/adjust
Connectors may return `applied.order_events`:
- `created` -> reserve inventory
- `cancelled/returned` -> release reservation, re-add inventory

Tables:
- `commerce_order_events`
- `commerce_inventory_reservations`

### 4) “Testable integrated scenario” (Docker)
A mock service is included:
- `mock_korea_commerce_api` (port 9300)

## Quick start (local)

```bash
cp .env.example .env
docker compose up --build
```

Health checks:
- Gateway: http://localhost:8080
- UI: http://localhost:3000
- Mock: http://localhost:9300/health

## End-to-end test scenario

1) Store credentials for each channel (base_url -> mock)

Example (Naver SmartStore):
```bash
curl -X POST http://localhost:8080/v1/commerce/channel/credentials \
  -H "X-Tenant-Id: demo-tenant" -H "X-Api-Key: dev" \
  -H "Content-Type: application/json" \
  -d '{
    "channel":"naver_smartstore",
    "creds":{
      "client_id":"demo",
      "client_secret":"demo",
      "refresh_token":"rt-demo",
      "token_expires_at":"2000-01-01T00:00:00Z",
      "base_url":"http://mock_korea_commerce_api:9300"
    }
  }'
```

2) Push mock order events (created/cancelled/returned) into mock server

```bash
curl -X POST http://localhost:9300/api/naver_smartstore/order_events \
  -H "Content-Type: application/json" \
  -d '{
    "events":[
      {"event_type":"created","occurred_at":"2026-02-26T00:00:00Z","order":{"order_id":"O-1","status":"paid","items":[{"sku":"SKU-1","qty":2}]}},
      {"event_type":"cancelled","occurred_at":"2026-02-26T01:00:00Z","order":{"order_id":"O-1","status":"cancelled","items":[{"sku":"SKU-1","qty":2}]}}
    ]
  }'
```

3) Enqueue order sync

```bash
curl -X POST http://localhost:8080/v1/commerce/orders/sync \
  -H "X-Tenant-Id: demo-tenant" -H "X-Api-Key: dev" \
  -H "Content-Type: application/json" \
  -d '{"channel":"naver_smartstore"}'
```

4) Check job status

```bash
curl http://localhost:8080/v1/commerce/jobs/<job_id> \
  -H "X-Tenant-Id: demo-tenant" -H "X-Api-Key: dev"
```

## Production hardening checklist
- Replace mock token endpoints with real OAuth token endpoints.
- Implement Coupang signature exactly per spec.
- Implement pagination, partial shipment, returns reasons, and exchange flows per channel.
- Consider distributed rate-limiting (Redis) for multi-worker fleets.
