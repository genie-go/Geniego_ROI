# DSAR — Program Pause (§21·7 Type)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_PAUSE`
pause_id · rebate_program_id · version_id · **pause_type · reason · requested_by · approved_by · paused_at · expected_resume_at · new_transaction_policy · pending_claim_policy · pending_accrual_policy · settlement_policy · payout_policy · resumed_at** · status · evidence

## Pause Type (7)
PLANNED · OPERATIONAL · BUDGET · PROVIDER_MAINTENANCE · CONTRACT_REVIEW · DATA_QUALITY · MANUAL

## 현행 인접
auto_campaign `status: active|paused`(AutoCampaign.php:490/504) · **kill-switch 정직성**(플랫폼 push 실패 시 DB 상태 미변경·502 · :602-609) → **Pause 전이도 Provider 반영 실패 시 내부 상태 변경 금지**.

## 규칙
**§4.8 Pause 는 Suspension 및 Emergency Disable 과 다르다** — Pause=계획/운영상 일시 중지(가역·복귀 전제). **중단 중 Pending Claim/Accrual/Settlement/Payout 처리 정책을 각각 명시**(미지정 시 fail-closed). Resume 시 중단기간 소급 여부는 **명시 정책만**(자동 소급 금지).
