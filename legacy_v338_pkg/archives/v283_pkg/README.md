# GENIE_ROI V283 — Full Production Scaffold (Integrated + Provider Implementations)

Generated: 2026-02-25T09:25:42.128737Z

V282 builds on V281 and **adds real provider implementation code paths** (still safe by default via `DRY_RUN=true`):

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
