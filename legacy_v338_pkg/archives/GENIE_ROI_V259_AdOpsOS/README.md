
# GENIE_ROI AdOps OS — V259 (Ops + Governance + Lightweight Admin UI)

Generated: 2026-02-25

## What’s new in V259
- 🔐 Basic RBAC (X-Role header: admin | operator | viewer)
- 📊 Built-in lightweight Admin Dashboard (served at /v259/admin)
- 📈 Prometheus-style /v259/metrics endpoint
- AI service bumped to 259.0 (same safe scaffold, clearer meta)
- All previous safety defaults retained (DRY_RUN=true, AUTO_EXECUTE=false)

This is still a **safe-by-default execution-grade scaffold**.

## Quickstart
cp .env.example .env
docker compose up --build

Then open:
http://localhost:8080/v259/admin
