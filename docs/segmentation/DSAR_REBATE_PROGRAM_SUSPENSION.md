# DSAR — Program Suspension (§22·13 Reason)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_SUSPENSION`
suspension_id · rebate_program_id · version_id · **suspension_reason · severity · triggering_incident · suspended_at · suspended_by · scope · new_transaction_block · claim_block · accrual_block · settlement_block · payout_block · investigation_owner · review_at · release_conditions · released_at** · status · evidence

## Suspension Reason (13)
FRAUD_RISK · SECURITY_INCIDENT · COMPLIANCE_RISK · FINANCIAL_RISK · **DOUBLE_FUNDING**(4-5-3-1-3 §4.10) · **WRONG_LEGAL_ENTITY** · CURRENCY_ERROR · PROVIDER_DRIFT · DATA_CORRUPTION · CONTRACT_DISPUTE · ACCOUNTING_ERROR · REGULATORY_RESTRICTION · OTHER

## 규칙
- **§4.8 Suspension 은 위험·규정·오류로 인한 강제 중단**(Pause=계획 중지 · Emergency Disable=즉시 차단).
- `triggering_incident` = **Incident Registry 실측 부재(grep 0) → Reference 필드만 · 허구 배선 금지**.
- 차단 범위(new_transaction / claim / accrual / settlement / payout)를 **각각 독립 설정**.
- **release_conditions 없는 Suspension 금지**(무기한 방치 방지) · review_at 필수.
