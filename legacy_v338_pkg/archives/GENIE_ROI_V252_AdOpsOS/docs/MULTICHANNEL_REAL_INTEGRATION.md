# V244 Multi-channel Real Integration Blueprint

## What is "완전 실연동" in practice?
For each channel, we must support:
1) Auth (OAuth / tokens / signing)
2) Campaign listing + status sync
3) Budget mutation (or closest equivalent) with safety controls
4) Rate-limit handling + retries
5) Audit log for every mutation
6) Per-tenant credential storage (Vault / KMS)

### Channel caveats
- **Meta**: Budgets often at **AdSet** level. Campaign budget only when CBO is used.
- **TikTok**: budget operations are available, but policy differs by objective/type.
- **Naver SearchAd**: signed requests are required.
- **Kakao Moment**: API access policies vary; implementation needs account verification.

## Implementation notes
Connectors in `services/backend/app/connectors/` include:
- Real-mode templates for Google/Meta/TikTok
- Blueprint stubs for Naver/Kakao with required signing notes

## Production checklist
- Vault secret engine per tenant (rotating access tokens)
- Idempotency keys for every mutate call
- Outbox->Kafka exactly-once-ish semantics (at least once + idempotent execution)
