# GENIE_ROI AdOps OS — V254 (Polyglot: Go + Python + Node)

V254 goal: **production-grade** AdOps execution platform with:
- **Connector framework** (Node.js) with capability matrix, idempotency hooks
- **AI service** (Python/FastAPI) for forecast + anomaly + optimization + confidence scoring
- **Governance/Execution gateway** (Go) with policy/guardrails, audit, outbox execution, rollback on failure

> Safety: default `DRY_RUN=true`. Without real API keys, **no publisher budget changes will be executed**.

## Quick start
```bash
cp .env.example .env
docker compose up --build
```

## Endpoints
- Gateway: http://localhost:8080  (health, workflows, executions)
- AI: http://localhost:8001
- Connectors: http://localhost:3001

See `docs/DEMO.md`.
