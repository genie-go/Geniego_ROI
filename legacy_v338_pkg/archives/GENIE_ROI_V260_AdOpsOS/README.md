# GENIE_ROI AdOps OS — V260 (Turning weaknesses into strengths: Ops/Governance/Integration-ready)

Generated: 2026-02-25

V260 is a **safe-by-default, ops-grade** reference implementation for an "Execution-Grade AdOps OS":
- Go **Gateway**: policy engine + approval workflow + state machine + outbox worker + RBAC + admin UI + metrics
- Python **AI**: recommendation contract (confidence/explain/risks/actions) + stricter validation
- Node **Connectors**: capability matrix + execute/rollback + **integration templates** (Meta/Naver) + contract checks
- Postgres: executions/audit_log/outbox/shadow_events/**connector_snapshots**
- Redis: idempotency locks + queue + DLQ

> Defaults: `DRY_RUN=true`, `AUTO_EXECUTE=false`  
> V260 is safe: no real ad-platform changes unless you implement adapters and set DRY_RUN=false.

---

## Quickstart
```bash
cp .env.example .env
docker compose up --build
```

Open Admin UI:
- http://localhost:8080/v260/admin?token=change-me

> For production, do **NOT** pass tokens via query parameters.
> This is only to allow a browser-only demo.

---

## Key APIs
- POST `/v260/workflows/run` (idempotent with `Idempotency-Key`)
- POST `/v260/executions/approve`
- GET  `/v260/executions/:id`
- GET  `/v260/audit/:id`
- POST `/v260/shadow/events` (record shadow outcomes)
- GET  `/v260/reports/lift/:id` (placeholder lift view based on shadow_events)

Ops (token protected via `X-Ops-Token` header or `?token=` for demo):
- GET  `/v260/ops/outbox`
- GET  `/v260/ops/dlq`
- GET  `/v260/ops/metrics` (JSON)
- GET  `/v260/metrics` (Prometheus text)
- POST `/v260/ops/policy/reload`

RBAC (simple):
- Use header `X-Role: admin|operator|viewer`
- `workflows/run` requires operator+ ; ops endpoints require admin+

---

## What V260 does to turn V259 weaknesses into strengths
### A) "No UI" → ✅ Built-in Admin UI
- A minimal dashboard for outbox/DLQ/metrics with links + quick actions.

### B) "No monitoring" → ✅ Metrics endpoints
- `/v260/metrics` (Prometheus) + `/v260/ops/metrics` (JSON snapshot)

### C) "No governance" → ✅ RBAC + policy-as-code + audit
- Operator vs Admin separation
- Hot policy reload with token protection
- Immutable audit trail endpoints

### D) "No real integration" → ✅ Integration-ready templates + snapshot table
- Connector adapter templates for Meta/Naver with:
  - idempotency strategy
  - snapshot-before-change
  - rollback hooks
  - quota/backoff guidance
- `connector_snapshots` table to persist before/after state.

### E) "AI not trustworthy" → ✅ Contract enforcement + shadow measurement loop
- AI response contract validation at gateway
- Shadow events capture and lift-report placeholder for future real uplift evaluation

---

## Run demo
```bash
curl -s -X POST http://localhost:8080/v260/workflows/run \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-123" \
  -H "X-Role: operator" \
  -d '{
    "tenant_id":"demo",
    "user_id":"alice",
    "objective":"maximize_roas",
    "budget_delta_limit_pct":20,
    "channels":["meta","google","naver"],
    "shadow_mode": true
  }' | jq
```

Approve:
```bash
curl -s -X POST http://localhost:8080/v260/executions/approve \
  -H "Content-Type: application/json" \
  -H "X-Role: operator" \
  -d '{"execution_id":"<EXEC_ID>","approver_id":"manager1"}' | jq
```

See ops:
```bash
curl -s http://localhost:8080/v260/ops/metrics -H "X-Ops-Token: change-me" -H "X-Role: admin" | jq
```

---

## Where to implement real channel integrations
- `services/connectors/src/adapters/meta/` (template)
- `services/connectors/src/adapters/naver/` (template)
