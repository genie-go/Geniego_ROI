# DSAR — Change Impact Assessment (§16·24 Domain)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_CHANGE_IMPACT`
impact_assessment_id · change_set_id · **impact_domain · affected_record_count · financial_amount_reference · affected_currency · severity · automatic_migration_allowed · manual_review_required · backfill_required · rollback_complexity · risk_summary · mitigation · assessed_by · assessed_at** · evidence

## Impact Domain (24)
New Transaction · Historical Transaction · Pending Eligibility · Pending Claim · Approved Claim · Pending Accrual · Approved Accrual · Liability · Budget · Commitment · Reservation · Settlement · Credit Memo · Debit Memo · Payout · Recovery · Dispute · Reporting · Accounting · Customer Portal · Provider Connector · ERP Integration · Data Warehouse · API Consumer

## 규칙
- **Breaking Change 에 Impact Assessment 없이 진행 금지**(Lint 차단).
- 영향 **건수와 금액을 함께** 평가(금액은 Reference · 원문 금지).
- **임의 숫자 금지** — 추정 불가 시 UNKNOWN + manual_review_required(헌법 "임의 숫자 금지·실제값 자동산출" 정합).
- 위험 등급은 CHANGE_RISK_LEVEL 참조.
