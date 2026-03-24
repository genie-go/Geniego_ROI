# V245 Execution Guide (Multi-channel)

## Key change in V245
- Approvals create Outbox events (`outbox_events` table)
- Worker consumes Kafka topic `genie.outbox` and executes channel mutations
- All executions are protected by:
  - `AUTO_EXECUTE=true` to allow any execution
  - `DRY_RUN=false` to mutate external platforms (real changes)
  - `AUTH_MODE=real` for real integrations

## End-to-end flow
1) Create approval (also writes OutboxEvent):
   POST /v244/approvals
2) Publish outbox events to Kafka:
   POST /v245/outbox/publish
3) Worker consumes and executes:
   services/worker container

## Payload contract for UPDATE_DAILY_BUDGET
{
  "channel": "google|meta|tiktok|naver|kakao",
  "account_id": "internal or channel account id",
  "campaign_id": "id",
  "customer_id": "google customer id (optional if env provides)",
  "new_budget": 60000,
  "target_level": "campaign|adset",   // meta recommended to set adset for most accounts
  "object_id": "meta object id",      // meta: adset id or campaign id
}

## Channel notes (Reality check)
- Meta: budget is often AdSet-level. Use target_level=adset and object_id=<adset_id>.
- TikTok: budget units vary by account/currency; validate with the platform docs.
- Naver: requires signed requests; endpoint paths may differ by product. Use as template.
- Kakao: API availability depends on account enablement; use as template.

## Safety recommendations
- Run in DRY_RUN for 1-2 weeks in production (“shadow mode”)
- Require human approval for any budget change
- Set max change % guardrails (see earlier versions) and per-tenant policy
