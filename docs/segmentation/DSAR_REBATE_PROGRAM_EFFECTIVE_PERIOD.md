# DSAR — Effective Period (§12)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_EFFECTIVE_PERIOD`
effective_period_id · rebate_program_id · rebate_program_version_id · **timezone · start_at · end_at · inclusive_start · inclusive_end · transaction_cutoff_at · claim_submission_cutoff_at · accrual_cutoff_at · settlement_cutoff_at · payout_cutoff_at · grace_period · late_processing_policy** · status · evidence

## §4.5 Effective Time 과 Recorded Time 분리
created_at · recorded_at · approved_at · scheduled_at · effective_from · effective_to · activated_at · paused_at · terminated_at · archived_at — **전부 분리**(혼용=Lint 차단).

## as-of 조회 계약
시점 t 의 유효 Version = `effective_from <= t AND (effective_to IS NULL OR t < effective_to)`. **NULL end = 무기한**(현행 규약: free_coupons `valid_until` NULL=무기한·CouponRedeem.php:67-68).

## 현행 인접·관찰
kr_fee_rule `effective_from`(KrChannel.php:102/128/151) = 실 effective-dating.
**[관찰·미확정] KrChannel.php:459** 가 거래일과 무관하게 `ORDER BY effective_from DESC, id DESC LIMIT 1` 로 최신 요율을 취해 **과거 정산라인을 현재 요율로 재검증**(:462/471) — `effective_from` 존재에도 **as-of 조회 아님**. 정본 원칙(§4.4·§4.6)의 실 사례로 **근거 기록만**. 요율 이력 1건 테넌트는 무증상·실 영향/의도는 라이브 확인 필요(FP 레지스트리: PM 코드 재증명 전 P0 단정 금지). **본 세션 비파괴·미수정** → EXISTING_IMPLEMENTATION 에서 `MIGRATION_REQUIRED` 분류.

## 규칙
**§4.6 미래 Version 조기 적용 금지** · timezone 명시(현행 DEFAULT_TZ 'Asia/Seoul'·RuleEngine.php:35 정합) · 종료일 < 시작일 차단.
