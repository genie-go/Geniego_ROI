# V301 Upgrade Notes (Commerce Hub)

## What changed

### 1) Commerce Hub is now asynchronous (job queue + worker)

The `/v1/commerce/*` endpoints now **enqueue** a job and return `{run_id, job_id, status:"queued"}`.

A new service `commerce_worker`:

- polls `commerce_jobs` (FOR UPDATE SKIP LOCKED)
- calls the Connectors service (`POST /v1/execute`)
- writes normalized results to local tables (`commerce_products`, `commerce_inventory`, `commerce_orders`)
- updates `commerce_sync_runs` with `queued → running → success/failed`
- retries with exponential backoff

### 2) Channel credentials (per tenant)

Admin users can store channel credentials:

`POST /v1/commerce/channel/credentials`

Payload example (Shopify):

```json
{
  "channel": "shopify",
  "creds": {
    "shop": "YOUR_SHOP.myshopify.com",
    "access_token": "shpat_...",
    "api_version": "2024-10"
  }
}
```

### 3) Shopify connector now performs real calls (when creds exist)

The Shopify provider implements:

- `upsert_products` (create/update products)
- `update_prices` (update variants by `variant_id`)
- `fetch_orders` (recent orders)
- `sync_inventory` (set inventory levels)

If credentials are missing, the call returns an error.

## Running locally

```bash
cp .env.example .env
docker compose up --build
```

New service:

- `commerce_worker` (runs automatically via docker compose)
