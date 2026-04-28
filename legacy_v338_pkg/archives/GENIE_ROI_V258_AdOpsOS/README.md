# GENIE_ROI AdOps OS — V258 (Polyglot, ops-grade scaffold)

Generated: 2026-02-25

V258 is a **safe-by-default** runnable reference platform for "Execution-Grade AdOps":
- **Go Gateway**: policy engine + approval + state machine + outbox + worker + ops endpoints
- **Python AI**: recommendations with confidence/explain/risks/actions (contract-enforced)
- **Node Connectors**: capability matrix + execute/rollback (stubs by default; adapter templates provided)
- **Postgres**: executions / audit_log / outbox / shadow_events
- **Redis**: queue + idempotency locks + DLQ

## Safety defaults
- `DRY_RUN=true`
- `AUTO_EXECUTE=false`
- Connectors **do not call external ad APIs** by default.
- Worker has retry/backoff + DLQ + ops visibility.

## Quickstart
```bash
cp .env.example .env
docker compose up --build
```

## Quick demo
### Run workflow
```bash
curl -s -X POST http://localhost:8080/v258/workflows/run \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-123" \
  -d '{
    "tenant_id":"demo",
    "user_id":"alice",
    "objective":"maximize_roas",
    "budget_delta_limit_pct":20,
    "channels":["meta","google","naver"],
    "shadow_mode": true
  }' | jq
```

### Approve
```bash
curl -s -X POST http://localhost:8080/v258/executions/approve \
  -H "Content-Type: application/json" \
  -d '{"execution_id":"<EXEC_ID>","approver_id":"manager1"}' | jq
```

### Status / Audit / Lift report
```bash
curl -s http://localhost:8080/v258/executions/<EXEC_ID> | jq
curl -s http://localhost:8080/v258/audit/<EXEC_ID> | jq
curl -s http://localhost:8080/v258/reports/lift/<EXEC_ID> | jq
```

## Ops endpoints (token protected; set OPS_TOKEN)
- `POST /v258/ops/policy/reload`
- `GET  /v258/ops/outbox`
- `GET  /v258/ops/dlq`
- `GET  /v258/ops/metrics` (simple JSON metrics snapshot)

## What V258 adds vs V257
- `shadow_events` table + endpoint to **record shadow outcomes** (placeholder but structured)
- A lightweight **metrics snapshot** endpoint in gateway
- Connector adapter templates (`adapters/_template/*`) to accelerate real integrations safely
- Slightly tighter contract validation + clearer docs (`docs/PRODUCT.md`)

See `docs/` for product description and architecture.
