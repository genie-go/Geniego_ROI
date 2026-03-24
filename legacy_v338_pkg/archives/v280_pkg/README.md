# GENIE_ROI V280 — Full Production Scaffold (Enterprise Controlled Growth OS)

Generated: 2026-02-25T09:06:29.826973Z

This scaffold is a **production-oriented reference architecture** for a platform that provides:

- **Controlled Ad Automation SaaS** (budget/bid/campaign changes with guardrails)
- **Controlled Marketing Automation SaaS** (email/journey/CRM actions with consent + frequency caps)
- **AI Risk SaaS** (pre-execution simulation, spend shock, revenue downside risk, churn risk)
- **Auditable & Reversible Automation** (approval → execution outbox → evidence/audit → rollback)

> Note: This repository is a scaffold (starter) — connectors are implemented as safe stubs and must be wired to real providers
> (Google/Meta/Naver/Amazon Ads, SES/SendGrid, HubSpot/Salesforce, etc.) before use in production.

## Quickstart (Docker)
1. Copy env:
   ```bash
   cp .env.example .env
   ```
2. Start services:
   ```bash
   docker compose up -d --build
   ```
3. Check health:
   - Gateway: http://localhost:8080/healthz
   - AI Engine: http://localhost:9000/healthz
   - Connectors: http://localhost:9100/healthz

## Core Concepts
- **Policy Engine**: runtime enforcement (hard block) for actions
- **Approval Workflow**: risky actions require review
- **Execution Outbox**: reliable, idempotent execution
- **Audit Evidence**: immutable event log + request/response snapshots
- **Rollback**: compensating actions for supported connectors (ads + CRM). Email is not reversible; it is evidence-only.

## Presets
- `quickstart/presets/retail.json`
- `quickstart/presets/agency.json`
- `quickstart/presets/global_brand.json`

Apply:
```bash
curl -X POST http://localhost:8080/v1/admin/presets/apply -H "Content-Type: application/json" -d @quickstart/presets/retail.json
```

## Repo Layout
- `services/gateway` (Go): API, policy+approval, outbox worker, audit, rollback orchestration
- `services/ai_engine` (Python/FastAPI): risk scoring + simulation endpoints
- `services/connectors` (Node/TS): connector runtime for ads/email/crm actions
- `deploy/docker-compose.yml`: local dev stack
- `db/migrations`: SQL migrations
- `docs`: architecture & API docs

## License
Internal / Proprietary scaffold (replace with your preferred license).
