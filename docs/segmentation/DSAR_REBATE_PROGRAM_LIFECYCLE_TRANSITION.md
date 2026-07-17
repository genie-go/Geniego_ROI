# DSAR — Lifecycle Transition (§8·24 Type)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본(개요·실측 요약): [`CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md`](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [`CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md`](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [`../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md`](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_LIFECYCLE_TRANSITION`
transition_id · rebate_program_id · **from_state · to_state · transition_type · requested_by · approved_by · executed_by · requested_at · approved_at · executed_at · effective_at · reason · preconditions · validation_result · rollback_transition · idempotency_key** · status · evidence

## Transition Type (24)
CREATE · REGISTER · SUBMIT_FOR_VALIDATION · VALIDATE · SUBMIT_FOR_REVIEW · APPROVE · REJECT · SCHEDULE · ACTIVATE · PAUSE · RESUME · SUSPEND · EMERGENCY_DISABLE · EXPIRE · TERMINATE · SUPERSEDE · MIGRATE · ARCHIVE · DELETE · RESTORE · ROLLBACK · CORRECT · BLOCK · UNBLOCK

## ★현행 정본 재사용 — Transition Enforcement
`AutoCampaign` kill-switch: **플랫폼 push 실패 시 DB 상태를 바꾸지 않고 502**("'paused' 표기인데 플랫폼은 계속 집행=광고비 누수" 방지·233차 P1·AutoCampaign.php:473/602-609) → **Rebate 전이 계약으로 승격**.

## 규칙
Idempotency Key 강제(중복 전이 금지) · Evidence 없는 전이 금지 · requested/approved/executed/effective **시각 분리**(§4.5) · rollback_transition 기록 · Demo/Sandbox→Production 전이 금지.
