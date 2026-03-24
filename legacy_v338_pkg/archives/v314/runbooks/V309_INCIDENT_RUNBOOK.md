
# V309 Incident Runbook (Template)

## SEV Levels
- SEV0: platform down / data loss risk
- SEV1: major workflow broken (commerce sync / ads control)
- SEV2: degraded performance, partial outages
- SEV3: minor bugs

## First 15 minutes checklist
1) Confirm blast radius (tenants/providers)
2) Check dashboards: API error rate, queue depth, DB health, provider 429/5xx
3) Mitigate: pause non-critical jobs, enable DRY_RUN for risky actions
4) Communicate: status page + internal channel

## Common Playbooks
- Provider rate-limit storm: reduce concurrency, increase backoff, enforce token bucket
- Token refresh failures: rotate secrets, re-auth required, disable writes
- Inventory inconsistency: freeze writes, replay events, reconcile reservations
