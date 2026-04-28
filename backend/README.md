# GENIE ROI PHP Backend (v377~v418)

This project is a PHP (Slim 4) port of the original FastAPI backend.

## Quick start (dev)

```bash
cd backend_php
composer install
php -S 0.0.0.0:8000 -t public
```

- DB: SQLite file stored at `data/genie.sqlite` by default (override with `GENIE_DB_PATH` env var)
- CORS: enabled for `*` in dev.

## Notes

- All versioned routes `/v377` ~ `/v418` are registered.
- Many endpoints in the original repo are already stub/demo endpoints; those remain stubbed but keep the same endpoint paths and response shapes.
- Core UI flows are implemented with SQLite persistence:
  - v378~v380 AI risk predictor + admin tables
  - v382 connectors / writeback / settlements / audit / approvals
  - v410 & v418 alert policies / alerts / action requests / audit logs
  - v418 mapping registry + 2-person approval proposals + validation rules
  - v418 rollups/events: simplified aggregation + persistence


## v418.1 (Aggregated Decisioning)

New endpoints (aggregate-only; no PII):

- POST /v4181/ingest/ad-insights
- POST /v4181/ingest/influencer-insights
- POST /v4181/ingest/commerce-agg
- GET  /v4181/decisioning/segments?metric=roas&since=YYYY-MM-DD&until=YYYY-MM-DD
- GET  /v4181/decisioning/recommendations?since=YYYY-MM-DD&until=YYYY-MM-DD
- GET  /v4181/decisioning/segment/{gender}/{age}/{region}/affinity

Headers:
- X-Tenant-Id: optional (defaults to demo)

The decisioning layer combines:
(1) ad platform segment aggregates, (2) influencer audience aggregates, and (3) commerce SKU/day aggregates,
without collecting buyer-level demographics.
