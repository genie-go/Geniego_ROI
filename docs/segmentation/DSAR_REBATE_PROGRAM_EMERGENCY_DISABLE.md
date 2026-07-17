# DSAR — Emergency Disable (§23)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_EMERGENCY_DISABLE`
emergency_disable_id · rebate_program_id · **affected_version · trigger · severity · disabled_scope · disabled_at · disabled_by · approval_after_action_required · new_transaction_block · claim_block · accrual_block · settlement_block · payout_block · provider_disable_result · feature_flag_result · recovery_plan · review_deadline · restored_at** · status · evidence

## 현행 인접 (Kill Switch)
**Registry 는 부재**. 실 패턴만 존재 — `AutoCampaign` kill-switch 정직성(AutoCampaign.php:473/602-609): **플랫폼 push 실패 시 DB 상태를 바꾸지 않고 502**("paused 표기인데 플랫폼은 계속 집행=광고비 누수" 방지·233차 P1).

## 규칙
- **긴급 차단은 신속 실행하되 사후 승인 · review_deadline · Audit 강제**(approval_after_action_required).
- **차단 범위(신규거래/Claim/Accrual/Settlement/Payout)를 각각 독립 설정**.
- **provider_disable_result 실 결과 기록 필수** — Provider disable 실패 시 내부만 "차단됨" 표기 금지(§4.3 발산 금지 · 287/288차 가짜집행·가짜녹색 클래스 정합).
- **Emergency Disable 중 Accrual/Payout 지속 = Critical Gap**.
