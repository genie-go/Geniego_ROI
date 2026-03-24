# GENIE_ROI V385 Merge Report (V383 + V221~V236)

## What was requested
- Keep all V383 features intact.
- If V221~V236 features are not in V383, merge them into the next version.
- If duplicated, keep the most advanced implementation.
- Strengthen weak areas: channel coverage, ad/social/market data ingestion, and ROI/traffic-cost recommendation capability.

## What was done in this build
### 1) Source preservation (traceability)
All legacy source trees from V221~V236 were copied **as-is** for reference:
- `backend/app/legacy_versions/v221` ... `v236`

This guarantees no functional asset is lost and allows safe cherry-picking.

### 2) V385 feature uplift: Ads budget workflow (from V221 lineage)
Implemented a modernized budget workflow compatible with the V383 codebase:
- DB migration: `backend/alembic/versions/0003_v384_budget_workflow.py`
- ORM models added to `backend/app/models.py`:
  - `AdsMapping`
  - `BudgetChangeRequest`
- New API router: `backend/app/api/v384.py` providing:
  - `GET /v384/ads/mappings`
  - `POST /v384/ads/mappings`
  - `POST /v384/budget/plan`
  - `POST /v384/budget/requests`
  - `POST /v384/budget/requests/{id}/approve`
  - `POST /v384/budget/requests/{id}/execute`

> NOTE: Execution is implemented as a **safe simulation** (updates internal budgets) in this open-source build.
> When official provider APIs are implemented, replace the simulation block with real API calls + idempotency + retries.

### 3) V385 feature uplift: Cross-channel traffic & cost recommendations
Added a beginner-friendly recommendation endpoint:
- `GET /v384/recommendations/traffic-cost`
- Delivered as **rules-based** payload with explicit "data needed" fields.
- Designed to be upgraded to real optimization once ingestion is connected.

### 4) Compatibility updates
- `backend/app/main.py` updated to:
  - include the V385 router
  - set version to `384.0.0`
- `VERSION` set to `V385`

## What is NOT fully implemented yet (intentional)
- Direct ingestion from Amazon Ads / Meta / TikTok / Instagram / marketplaces is not hard-coded in this build.
- The codebase exposes the *platform plumbing* (schemas, workflow, endpoints, governance hooks).
- Provider-specific API connectors should be implemented under a dedicated adapters layer (recommended).

## Quickstart
1. `docker-compose up` (same as V383)
2. Run migrations:
   - `cd backend && alembic upgrade head`
3. Use the new endpoints under `/v384/*`
