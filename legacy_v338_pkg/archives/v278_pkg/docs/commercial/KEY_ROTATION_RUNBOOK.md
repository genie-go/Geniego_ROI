# Key Rotation Runbook (ALERT → ENFORCE)

## Definitions
- rotate_days: number of days until rotation is required (default 90)
- grace_days: additional days before ENFORCE revocation (default 7)
- modes:
  - ALERT: generate incidents and notifications; do not block
  - ENFORCE: revoke keys past rotate_days + grace_days; block requests

## Recommended rollout
1) Start ALERT for 1–2 full cycles
2) Train owners on replacement process
3) Turn on ENFORCE during a low-risk window
4) Monitor incidents daily during first week

## Operational procedure (Replacement)
1. Identify due key in Admin UI: /v270/admin (or /v272/admin if routed)
2. Generate replacement credential in the upstream provider (customer-owned)
3. Update secret store / environment
4. Validate health check
5. Revoke old key (optional early revoke)

## Failure handling
- If ENFORCE revokes a key unexpectedly:
  - Immediately rotate to a known-good key
  - Verify connector health
  - Create a P1 incident record + postmortem

## Evidence requirements
- Keep: due list snapshot + incident record + approval record for rotation (if required)
