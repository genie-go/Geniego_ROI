# Architecture (V280)

## Services
- Gateway (Go): API + policy + approval + outbox worker + audit + rollback orchestration
- AI Engine (Python/FastAPI): risk scoring + simulation
- Connectors (Node/TypeScript): provider adapters for ads/email/crm

## Execution Lifecycle
1) Client requests action (e.g. budget update, email send, journey enroll)
2) Gateway:
   - Validates schema
   - Evaluates policy (hard block)
   - Computes risk via AI Engine (optional) and records recommendation
   - If action requires approval: creates approval and returns PENDING
   - Else: creates execution + outbox message
3) Worker consumes outbox:
   - Sends to Connectors
   - Stores result + evidence
   - If failure and rollback supported: triggers compensating action

## Rollback
- Ads/CRM: best-effort rollback using stored snapshots
- Email: not reversible; evidence-only + automatic pause/kill-switch

## Safety Modes
- DRY_RUN=true: execute full pipeline but do not call external providers
- ENFORCE_POLICIES=true: violations are blocked (recommended)
