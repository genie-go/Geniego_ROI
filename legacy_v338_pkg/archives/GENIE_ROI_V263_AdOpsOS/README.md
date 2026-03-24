# GENIE_ROI AdOps OS — V163 (Turning weaknesses into strengths: Ops/Governance/Integration-ready)

Generated: 2026-02-25

V163 is a **safe-by-default, ops-grade** reference implementation for an "Execution-Grade AdOps OS":
- Go **Gateway**: policy engine + approval workflow + state machine + outbox worker + RBAC + admin UI + metrics
- Python **AI**: recommendation contract (confidence/explain/risks/actions) + stricter validation
- Node **Connectors**: capability matrix + execute/rollback + **integration templates** (Meta/Naver) + contract checks
- Postgres: executions/audit_log/outbox/shadow_events/**connector_snapshots**
- Redis: idempotency locks + queue + DLQ

> Defaults: `DRY_RUN=true`, `AUTO_EXECUTE=false`  
> V163 is safe: no real ad-platform changes unless you implement adapters and set DRY_RUN=false.

---

## What's new in V163

**Enterprise-control axis 강화 (internal control / audit / change mgmt / incident response):**
- **Naver SearchAd 실연동(캠페인 일예산 dailyBudget 변경)**: GET snapshot → PUT update(필드 지정) → snapshot 기반 rollback
- **Compensating rollback**: 멀티채널 실행 중 실패 시, 이미 적용된 채널까지 **역순 롤백**(best-effort) + 롤백 실패 알림(webhook)
- **Evidence capture**: 각 채널 execute/rollback 결과(스냅샷 포함)를 `connector_snapshots` 테이블에 저장해 **감사/증빙** 강화
- **Secret rotation friendly**: Meta/Naver 키를 `*_FILE`로도 주입 가능(컨테이너 재배포 없이 키 회전/교체 용이)
- **Shadow uplift 강화**: `control_value/treatment_value`가 있는 이벤트는 uplift% 계산 + (옵션) z-score 기반 유의성 힌트
- **V163 API 호환 경로**: 외부 API는 `/v262/*`로 접근 가능(내부는 `/v163` 핸들러로 라우팅)

**AdOps 자동화 OS 포지셔닝 포인트:**
- 자동화 자체보다 **승인(Approval) → 실행(Outbox) → 감사(Audit) → 복구(Rollback)**를 제품의 중심 플로우로 둠
- 엔터프라이즈 채택 요건(내부통제/감사/변경관리/장애대응)을 “기능”이 아니라 “기본 동작”으로 설계


## Quickstart
```bash
cp .env.example .env
docker compose up --build
```

Open Admin UI:
- http://localhost:8080/v163/admin?token=change-me

> For production, do **NOT** pass tokens via query parameters.
> This is only to allow a browser-only demo.

---

## Key APIs
- POST `/v163/workflows/run` (idempotent with `Idempotency-Key`)
- POST `/v163/executions/approve`
- GET  `/v163/executions/:id`
- GET  `/v163/audit/:id`
- POST `/v163/shadow/events` (record shadow outcomes)
- GET  `/v163/reports/lift/:id` (placeholder lift view based on shadow_events)

Ops (token protected via `X-Ops-Token` header or `?token=` for demo):
- GET  `/v163/ops/outbox`
- GET  `/v163/ops/dlq`
- GET  `/v163/ops/metrics` (JSON)
- GET  `/v163/metrics` (Prometheus text)
- POST `/v163/ops/policy/reload`

RBAC (simple):
- Use header `X-Role: admin|operator|viewer`
- `workflows/run` requires operator+ ; ops endpoints require admin+

---

## What V163 does to turn V259 weaknesses into strengths
### A) "No UI" → ✅ Built-in Admin UI
- A minimal dashboard for outbox/DLQ/metrics with links + quick actions.

### B) "No monitoring" → ✅ Metrics endpoints
- `/v163/metrics` (Prometheus) + `/v163/ops/metrics` (JSON snapshot)

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
curl -s -X POST http://localhost:8080/v163/workflows/run \
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
curl -s -X POST http://localhost:8080/v163/executions/approve \
  -H "Content-Type: application/json" \
  -H "X-Role: operator" \
  -d '{"execution_id":"<EXEC_ID>","approver_id":"manager1"}' | jq
```

See ops:
```bash
curl -s http://localhost:8080/v163/ops/metrics -H "X-Ops-Token: change-me" -H "X-Role: admin" | jq
```

---

## Where to implement real channel integrations
- `services/connectors/src/adapters/meta/` (template)
- `services/connectors/src/adapters/naver/` (template)
