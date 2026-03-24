# Gateway API (V281)

Base: http://localhost:8080

## Health
GET /healthz

## Admin
POST /v1/admin/presets/apply
GET  /v1/admin/policies/latest

## Controlled Actions
POST /v1/actions
Body:
{
  "idempotency_key": "abc",
  "channel": "ads|email|crm|journey",
  "action_type": "ADS_BUDGET_UPDATE|EMAIL_SEND|CRM_BULK_UPDATE|...",
  "payload": {...},
  "requested_by": "user@company",
  "reason": "why"
}

**Provider selection** is inside payload:
payload.provider = "google_ads|meta|naver|amazon_ads|ses|sendgrid|hubspot|salesforce"

## Approvals
POST /v1/approvals/:id/decide

## Marketing Automation
POST /v1/ma/contacts/upsert
POST /v1/ma/consent
POST /v1/ma/templates/upsert
POST /v1/ma/journeys/upsert
POST /v1/ma/journeys/:id/enroll

## Audit
GET /v1/audit/executions/:id
GET /v1/audit/executions/:id/events
