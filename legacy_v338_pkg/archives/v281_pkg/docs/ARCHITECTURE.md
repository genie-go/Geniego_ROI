# V281 Architecture

## Services
- Gateway (Go): public API, policy enforcement, approvals, outbox worker, audit evidence, rollback orchestration
- AI Engine (Python/FastAPI): risk scoring + simulation
- Connectors (Node/TS): provider adapters and routing

## Execution (Auditable & Reversible)
1) Request → Gateway validates and evaluates policy
2) Optional AI scoring → audit recorded
3) If approval required → approval created and returned (PENDING)
4) Else → execution created, outbox enqueued
5) Worker → calls connectors runtime
6) Result + evidence stored; snapshot stored if rollback supported
7) On failure or manual rollback request → rollback orchestration (best-effort)

## Rollback semantics
- Ads & CRM: reversible via snapshots (best-effort)
- Email: non-reversible; evidence-only + kill-switch/pause

## Provider routing
Execution payload includes `provider`:
- email: ses | sendgrid
- crm: hubspot | salesforce
- ads: google_ads | meta | naver | amazon_ads
