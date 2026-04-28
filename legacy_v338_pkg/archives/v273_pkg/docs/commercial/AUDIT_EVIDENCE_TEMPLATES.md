# Audit Evidence Templates

These templates are designed so auditors can confirm **who approved what**, **what executed**, **what changed**, and **what evidence exists**.

## A) Monthly Evidence Pack (Checklist)
- [ ] Tenant list + RBAC roles snapshot
- [ ] Policy snapshot (JSON) + policy hash
- [ ] Policy change log (diff) for the month
- [ ] Execution summary: totals, failures, retries, DLQ
- [ ] Incident timeline: severity, resolution, MTTR
- [ ] Key rotation compliance report (due/overdue/revoked)

## B) Policy Change Ticket (Template)
- Change ID:
- Requested by:
- Approved by:
- Risk rating:
- Before/After policy diff:
- Rollback plan:
- Execution window:
- Evidence links (audit log filter query):

## C) Incident Postmortem (Template)
- Incident ID:
- Start/End:
- Impact:
- Root cause:
- Detection:
- Mitigation:
- Preventive controls:
- Evidence (logs/queries/snapshots):
