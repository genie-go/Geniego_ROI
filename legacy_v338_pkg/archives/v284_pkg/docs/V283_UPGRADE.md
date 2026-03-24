# GENIE_ROI V283 Upgrade (ROI + Policy Enforcement + Incrementality)

## What changed vs V282
### 1) Policy is **enforced** (not just stored)
- Channel enable/disable
- CRM max bulk updates
- Email consent required (GRANTED) and daily frequency cap
- ADS budget delta guardrail + derived approval gate for >10% changes

### 2) Approvals workflow is functional
- Actions can enter `AWAITING_APPROVAL`
- Approver can `APPROVED/REJECTED`
- Approved executions are enqueued after decision

### 3) ROI measurement pipeline (minimal but production-safe)
- Daily channel spend metrics ingestion
- Conversion (revenue) events ingestion
- Summary API returns spend/revenue/ROI by channel & provider

### 4) Incrementality experiments (holdout)
- Deterministic allocation: `treatment` vs `holdout`
- Outcome ingestion
- Report API computes revenue/conversion lift by scaling holdout to treatment size

## New DB migration
- `db/migrations/0002_v283_roi.sql`

## New/updated APIs
### Approvals
- `GET  /v1/approvals/pending`
- `POST /v1/approvals/:id/decide`  (body: status, approved_by, reason, execution_id)

### ROI
- `POST /v1/roi/metrics/ads`  (day + rows)
- `POST /v1/roi/conversions`  (events[])
- `GET  /v1/roi/summary?from=YYYY-MM-DD&to=YYYY-MM-DD`

### Experiments
- `POST /v1/roi/experiments`
- `POST /v1/roi/experiments/:id/allocate`
- `POST /v1/roi/experiments/:id/outcome`
- `GET  /v1/roi/experiments/:id/report`

## Notes
- Email is irreversible; frequency cap increments are applied at request time for deterministic guardrails.
- For strict enterprise governance, add: multi-step approvals, RBAC, policy version pinning per execution, and immutable audit exports.
