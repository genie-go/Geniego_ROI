# Implementation Playbook (Enterprise)

## Phase 0 — Pre-flight (Week 0)
- Identify scope: accounts, regions, channels, spend, peak periods
- Define RACI: Approvers, Operators, Security Owners, Auditors
- Decide key policy mode: start ALERT → move to ENFORCE after 1–2 cycles

## Phase 1 — PoC (Weeks 1–2)
- Onboard 1 tenant + 1 connector
- Enable approval workflow for 2–3 high-risk actions
- Validate audit export against internal requirements

Exit criteria:
- Successful execution runs
- Audit log coverage verified
- Incident workflow validated

## Phase 2 — Rollout (Weeks 3–6)
- Onboard all tenants
- Deploy baseline policy DSL templates
- Start key rotation ALERT
- Train operators & approvers

Exit criteria:
- Policy change process is used (not bypassed)
- >80% of actions go via outbox workflow

## Phase 3 — Governance Embed (Weeks 7–12)
- Turn on ENFORCE (with grace period)
- Enable SoD: 2-person policy change approvals
- Schedule recurring evidence packs (monthly/quarterly)
- Conduct controls review with security/audit

Exit criteria:
- ENFORCE running without incidents > 1 cycle
- Evidence pack accepted by audit/security
