# DSAR — Program Expiration (§24)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_EXPIRATION`
expiration_id · rebate_program_id · **active_version · scheduled_expiration_at · actual_expiration_at · transaction_cutoff · claim_grace_period · pending_claim_policy · pending_accrual_policy · settlement_completion_policy · payout_completion_policy · liability_close_policy · customer_notification_reference · successor_program** · status · evidence

## 현행 인접
free_coupons `valid_until` 만료 검증(CouponRedeem.php:67-68 · **NULL=무기한** 규약) → **재사용**.

## 규칙
- **Expiration 은 의사결정 없는 자연 만료**(Termination 과 구별 · §4.7).
- **§4.7 Program 종료가 모든 업무 종료는 아니다** — 만료 후에도 Pending Claim/Validation/Accrual/Settlement/Payout/Dispute/Recovery/Audit 계속 가능 → **claim_grace_period + 각 policy 명시 필수**.
- **만료를 이유로 기존 승인된 권리·회계 기록 임의 삭제 금지**.
- 만료 전 **customer_notification** 필수(무통지 만료 금지).
