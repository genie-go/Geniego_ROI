# GENIE_ROI AdOps OS — V256 (Polyglot Reference Implementation)

Generated: 2026-02-25

This is a **safe-by-default** reference implementation of an "Execution-Grade AdOps OS":
- Go **Gateway** (policy + approval + state machine + outbox)
- Python **AI Service** (forecast/anomaly/optimize + confidence + explain + risks)
- Node **Connectors** (capability matrix + execute/rollback)
- Postgres (executions, audit_log, outbox)
- Redis (outbox queue + rate limiting + idempotency locks)
- OpenTelemetry (optional) + structured JSON logs

> **Safety defaults**
- `DRY_RUN=true` (no real budget changes)
- `AUTO_EXECUTE=false` (requires approval)
- Connectors ship with **stubs** to prevent accidental external actions.
  You can implement real channel APIs under `services/connectors/src/adapters/*`.

## Quickstart
```bash
cp .env.example .env
docker compose up --build
```

## Try it
1) Run a workflow (creates an execution record and an AI recommendation)
```bash
curl -s -X POST http://localhost:8080/v256/workflows/run \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id":"demo",
    "user_id":"alice",
    "objective":"maximize_roas",
    "budget_delta_limit_pct":20,
    "channels":["meta","google","naver"],
    "shadow_mode": true
  }' | jq
```

2) Approve (only if confidence >= threshold and policy allows)
```bash
curl -s -X POST http://localhost:8080/v256/executions/approve \
  -H "Content-Type: application/json" \
  -d '{"execution_id":"<ID_FROM_STEP1>","approver_id":"manager1"}' | jq
```

3) Get status
```bash
curl -s http://localhost:8080/v256/executions/<ID_FROM_STEP1> | jq
```

## Services
- Gateway: http://localhost:8080
- AI: http://localhost:8000
- Connectors: http://localhost:3000
- Postgres: localhost:5432
- Redis: localhost:6379

## Key V256 improvements vs V254
- Outbox uses Redis queue + retry/backoff + dead-letter
- Explicit **Idempotency-Key** support and locking
- Policy engine with **policy-as-code** (YAML) + guardrails
- Shadow-mode experiment logging + lift placeholder report
- Better health checks, structured logs, and basic rate limiting

See `docs/` for architecture and API examples.
