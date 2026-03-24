# V365 Marketplace Official API Plug‑in Guide (Shopee / Qoo10 / Rakuten)

This repository ships a **spec‑driven** collector for Shopee/Qoo10/Rakuten so you can **plug in** official API
documentation, scopes and rate limits later without changing code.

## What is already implemented

- **Real HTTP calls** via `request_json()` with retry/backoff on **429 / 5xx** (honors `Retry-After`).
- **Cursor-based incremental sync** with per-endpoint cursor stored in `sync_states.cursor`.
- **Pagination guardrails** (`max_pages`, `limit_default`).
- **Auth strategies** (extendable):
  - `bearer_token` (uses datasource.config.access_token)
  - `api_key_header` (uses datasource.config.api_key + profile.auth.header_name)

## Where to put the official specs

### 1) Channel API profile (per tenant)

Use API:

- `GET /config/channels/api-profiles`
- `PUT /config/channels/api-profiles`

Default template is at:

- `backend/resources/templates/v365/channel_api_profiles.json`

You should set (per channel):

- `base_url`
- `auth.type` (and header_name if needed)
- `endpoints.*.path/method`
- `endpoints.*.pagination.{cursor_param,cursor_path,items_path,limit_param}`
- `rate_limit.*` (optional tuning)

### 2) DataSource config

Create a datasource with platform `shopee` / `qoo10` / `rakuten`.

Example datasource.config (bearer token):

```json
{
  "access_token": "<token>",
  "api_profile": { "base_url": "https://...", "auth": {"type":"bearer_token"}, "endpoints": { ... } }
}
```

If you prefer **not** to embed the full profile in each datasource, keep it in the tenant config
`/config/channels/api-profiles` and in your app layer resolve the correct channel profile into
`datasource.config.api_profile` when constructing the datasource.

## Cursor storage

The collector uses these cursor keys:

- `shopee:products`, `shopee:orders`, `shopee:inventory`, `shopee:reviews`
- `qoo10:products`, ...
- `rakuten:products`, ...

They are automatically persisted in the `sync_states` table.

## Extending auth (when docs arrive)

If a channel requires signature/HMAC parameters, extend:

- `backend/app/ingestion/collectors/marketplace_official.py::_auth_headers()`

or add an additional method for query signing.
