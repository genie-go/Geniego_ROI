# GENIE_ROI AdOps OS - V254 (Polyglot: Go + Python + Node)

**Goal**: Execution-grade AdOps OS with safety-first automation (DRY_RUN by default).
This repo ships a runnable reference implementation with:
- **Gateway (Go)**: approval + policy + execution state machine + outbox-style dispatch
- **AI Service (Python/FastAPI)**: forecast/anomaly/optimize -> {recommendations, confidence, explain, risks}
- **Connectors (Node/Express)**: channel capability matrix + execute/rollback endpoints (safe stub)
- **Postgres**: executions/audit/outbox storage

> ⚠️ Safety: Default is `DRY_RUN=true` so no external ad spend changes are performed.
> To integrate real APIs (Meta/Google/TikTok/Naver/Kakao), implement the connector adapters in `services/connectors/src/adapters/`.

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

Gateway: http://localhost:8080  
AI: http://localhost:8000  
Connectors: http://localhost:3000

## Demo
```bash
curl -s -X POST http://localhost:8080/v254/workflows/run \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id":"demo",
    "user_id":"alice",
    "objective":"maximize_roas",
    "budget_delta_limit_pct":20,
    "channels":["meta","google","naver"]
  }' | jq
```

Check execution:
```bash
curl -s http://localhost:8080/v254/executions/<execution_id> | jq
```

## Key design
- Capability matrix per channel
- Idempotent execution IDs
- Confidence gating (auto-exec only above threshold) + approval requirement
- Snapshot + rollback path on failure
- Audit log + outbox rows

See: `docs/ARCHITECTURE.md`
