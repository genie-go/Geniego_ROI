# GENIE_ROI V281 — Full Production Scaffold (Integrated)

Generated: 2026-02-25T09:15:53.492983Z

V281 integrates the V280 production scaffold and extends it with **provider-ready connector interfaces**
and **rollback/snapshot contracts** for:

- Ads: Google Ads, Meta, Naver SearchAd, Amazon Ads (stubs + adapter skeletons)
- Email: Amazon SES, SendGrid (stubs + adapter skeletons)
- CRM: HubSpot, Salesforce (stubs + adapter skeletons)
- Shared: audit evidence, outbox execution, policy guardrails, approvals, frequency caps

> This is still a scaffold: real provider API calls are deliberately stubbed.
> The adapter skeletons show how to wire credentials, request/response mapping, snapshots, and rollbacks.

## Quickstart (Docker)
```bash
cp .env.example .env
docker compose up -d --build
# apply a preset (choose one)
./quickstart/retail_preset.sh
```

Health endpoints:
- Gateway: http://localhost:8080/healthz
- AI Engine: http://localhost:9000/healthz
- Connectors: http://localhost:9100/healthz

## Key Safety Defaults
- `DRY_RUN=true` by default (no external calls)
- `ENFORCE_POLICIES=true` by default (hard-block policy violations)
- Bulk operations require approvals (configurable by policy)

## What’s New vs V280
- Provider adapter skeletons + unified `ProviderResponse` contract
- Snapshot + rollback contracts for Ads & CRM actions
- Email actions are **evidence-only** (non-reversible), with kill-switch patterns
- Connector routing based on `provider` in payload: e.g. `provider: "ses"|"sendgrid"|"hubspot"|"salesforce"|"google_ads"|"meta"|"naver"|"amazon_ads"`

## Repo Layout
- `services/gateway` (Go): policy, approval, outbox, audit, rollback orchestration
- `services/ai_engine` (Python/FastAPI): risk scoring + simulation
- `services/connectors` (Node/TS): provider adapters + routing
- `db/migrations`: schema
- `docs`: architecture, API, providers
- `quickstart`: presets + scripts
