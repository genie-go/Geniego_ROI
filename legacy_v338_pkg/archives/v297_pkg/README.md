## GENIE_ROI V288

V288 adds LIVE collector checkpoints/backoff, TikTok ads connector scaffold, influencer-product-channel intelligence (recommendations + performance validation), and enterprise-grade reporting loop.

# GENIE_ROI V288 — Closed-Loop ROI Platform (Governance + Measurement + Experiments + Journeys + UI)

Generated: 2026-02-25T09:25:42.128737Z

V285 builds on V284 and **closes the loop**: Governance (Policy/RBAC/Approvals) + Execution + ROI Measurement + Incrementality Experiments + Segments/Events + Journey Execution + UI.


Implemented providers (code included):
- **Email**: Amazon SES (AWS SDK v3), SendGrid (@sendgrid/mail)
- **CRM**: HubSpot (@hubspot/api-client) — supports snapshot + rollback best-effort
- **Ads**: Google Ads (google-ads-api) — supports snapshot + rollback best-effort (skeleton + core calls)

Other providers remain adapter skeletons:
- Meta / Naver / Amazon Ads
- Salesforce (skeleton)

> IMPORTANT: This repo is a scaffold. You must supply credentials and verify compliance (consent/opt-out, local regulations)
> before sending any marketing messages or running automation in production.

## Quickstart (Docker)
```bash
cp .env.example .env
docker compose up -d --build
./quickstart/retail_preset.sh
```

Health:
- Gateway: http://localhost:8080/healthz
- AI Engine: http://localhost:9000/healthz
- Connectors: http://localhost:9100/healthz

## Safety Defaults
- `DRY_RUN=true` by default: no external API calls
- `ENFORCE_POLICIES=true` by default: blocks policy violations

## Provider Routing
`POST /v1/actions` with:
```json
{
  "idempotency_key": "k1",
  "channel": "email",
  "action_type": "EMAIL_SEND",
  "payload": {
    "provider": "ses",
    "from": "no-reply@example.com",
    "to": ["user@example.com"],
    "subject": "Hello",
    "html": "<b>Hi</b>"
  }
}
```

## Rollback Notes
- Ads/CRM: best-effort rollback using stored snapshots
- Email: non-reversible. We store evidence (message id) and recommend kill-switch patterns.


## V284 Quickstart (RBAC + UI + ROI loop)

1) Start stack

```bash
cp .env.example .env
# set BOOTSTRAP_TOKEN in .env (e.g., dev-bootstrap)
docker compose up --build
```

2) Bootstrap first admin API key (one-time)

```bash
export BOOTSTRAP_TOKEN=dev-bootstrap
./quickstart/bootstrap.sh
# copy/paste exports printed by the script
```

3) Apply demo preset policy

```bash
./quickstart/retail_preset.sh
```

4) Run ROI + experiments demos

```bash
./quickstart/roi_demo.sh
./quickstart/experiments_demo.sh
```

5) Open dashboard

- http://localhost:3000

Set `UI_API_KEY` in `.env` (or export `VITE_API_KEY`) so the UI can call the API.



## Version
This package is at **V293**.
