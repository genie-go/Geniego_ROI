# GENIE_ROI AdOps OS — V257 (Polyglot, safer + more operable)

Generated: 2026-02-25

V257 is a **safe-by-default** runnable scaffold:
- Go Gateway (policy engine + approval + state machine + outbox + worker)
- Python AI (recommendation with confidence/explain/risks/actions)
- Node Connectors (capability matrix + execute/rollback stubs)
- Postgres (executions/audit/outbox)
- Redis (queue + idempotency locks + dead-letter queue)

## Safety defaults
- `DRY_RUN=true` (no real spend changes)
- `AUTO_EXECUTE=false` (requires approval)
- Connectors ship as **stubs** (no external ad APIs called)
- Worker has retry/backoff + DLQ

## Quickstart
```bash
cp .env.example .env
docker compose up --build
```

## API quick demo
### 1) Run workflow (idempotent)
```bash
curl -s -X POST http://localhost:8080/v257/workflows/run \
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

### 2) Approve
```bash
curl -s -X POST http://localhost:8080/v257/executions/approve \
  -H "Content-Type: application/json" \
  -d '{"execution_id":"<EXEC_ID>","approver_id":"manager1"}' | jq
```

### 3) Status / Audit / Shadow lift report
```bash
curl -s http://localhost:8080/v257/executions/<EXEC_ID> | jq
curl -s http://localhost:8080/v257/audit/<EXEC_ID> | jq
curl -s http://localhost:8080/v257/reports/lift/<EXEC_ID> | jq
```

## V257 improvements vs V256
- Outbox: **attempts persisted**, exponential backoff, **dead-letter** after max retries
- DLQ visibility: `/v257/ops/dlq` and `/v257/ops/outbox`
- Policy-as-code + **hot reload endpoint** (safe token)
- Connector contract validation (basic schema checks)
- Audit query endpoint + shadow lift report placeholder
- Better readiness checks + structured JSON logs

See `docs/` for architecture and contracts.
