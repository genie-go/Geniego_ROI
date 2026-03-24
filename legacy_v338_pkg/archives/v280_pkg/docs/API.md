# API (Gateway) — minimal reference

Base URL: `http://localhost:8080`

## Health
GET `/healthz`

## Admin
POST `/v1/admin/policies`  (set new policy version)
GET  `/v1/admin/policies/latest`
POST `/v1/admin/presets/apply`  (apply preset JSON: policy + defaults)

## Controlled Actions
POST `/v1/actions`  (generic execution)
- body includes: channel, action_type, idempotency_key, payload

## Approvals
GET `/v1/approvals/:id`
POST `/v1/approvals/:id/decide`  (APPROVE/REJECT)

## Marketing Automation
POST `/v1/ma/contacts/upsert`
POST `/v1/ma/consent`
POST `/v1/ma/templates/upsert`
POST `/v1/ma/journeys/upsert`
POST `/v1/ma/journeys/:id/enroll`

## Observability
GET `/v1/audit/executions/:id`
GET `/v1/audit/executions/:id/events`
