# GENIE_ROI V258 — Product Description (customer-facing)

## What this product is
GENIE_ROI is an **AdOps Operating System** that helps teams run paid media with:
- **Unified decisioning** (common KPI / common workflow across channels)
- **Controlled automation** (recommend → approve → execute with guardrails)
- **Operational governance** (audit logs, policies, retry & incident visibility)
- **Continuous learning loop** (shadow-mode measurement scaffolding)

## What customers get
1) **Cross-channel visibility**
- A single execution record connects "why we changed budgets" → "what we changed" → "what happened".

2) **Recommendation + confidence**
- Each recommendation includes:
  - confidence score
  - explanation bullets
  - risks
  - action plan (bounded by policy)

3) **Approval & compliance-ready execution**
- Automation is not "wild-west":
  - human approval by default
  - policy-as-code guardrails
  - immutable audit trail

4) **Execution reliability**
- Outbox + retries + backoff + DLQ reduce the risk of partial failures.
- Failures remain observable and recoverable.

5) **Experiment-friendly (Shadow mode)**
- Shadow outcomes can be recorded (table + endpoint), enabling uplift measurement over time.

## What it is NOT (by default)
- It does NOT ship with live external ad API credentials or real integrations enabled.
- It is a safe scaffold: you implement channel adapters in a controlled way.

## Ideal customers
- In-house growth teams with multiple channels & frequent budget changes
- Agencies managing multi-tenant operations with approvals and audit needs
- Enterprises that require governance and repeatability for automation
