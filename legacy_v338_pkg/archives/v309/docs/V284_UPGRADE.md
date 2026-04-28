# GENIE_ROI V284 Upgrade Notes

V284 focuses on "enterprise-grade ROI platform readiness" by closing the loop:
**Policy/Approvals → Execution → Measurement (ROI) → Experiments (Incrementality) → Daily Ops UI**

## What's new vs V283

1) **RBAC + API Keys**
- X-Tenant-ID + X-API-Key authentication for all `/v1/*`
- Roles: `admin`, `marketer`, `approver`, `analyst`
- Admin endpoint to mint API keys (shown once)

2) **Multi-step approvals**
- Policy can require approvals for specific action types
- Approval requires `required_steps` decisions (e.g., 2-person rule)

3) **Policy pinning**
- Each execution stores `policy_version` and `policy_hash` at creation time.
- Auditability: reproduce the exact guardrails used for a historical action.

4) **UI Dashboard (Vite + React scaffold)**
- Executions, Approvals, ROI Summary, Experiments report pages.

5) **Collectors service scaffold**
- Periodically ingests channel metrics into `/v1/roi/metrics/*`.

6) **Journey executor scaffold**
- Converts `journeys + journey_steps + enrollments` into scheduled jobs and executes due steps through the standard Actions API.

See `quickstart/` for demos.

