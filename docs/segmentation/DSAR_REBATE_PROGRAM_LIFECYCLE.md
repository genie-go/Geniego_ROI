# DSAR — Rebate Program Lifecycle (§6)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본(개요·실측 요약): [`CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md`](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [`CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md`](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [`../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md`](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## 실측
**Rebate Lifecycle 엔진 부재(NOT_APPLICABLE·`rebate` grep 0)**. 실 인접=auto_campaign 상태전이(kill-switch 정직성·AutoCampaign.php:602-609)·menu_defaults 스냅샷(AdminMenu.php:119)·kr_fee_rule effective_from(KrChannel.php:151).

## Entity `REBATE_PROGRAM_LIFECYCLE`
rebate_program_lifecycle_id · rebate_program_id · **current_state · previous_state · current_version_id · active_version_id · scheduled_version_id · effective_from · effective_to · last_transition_at · last_transition_by · transition_reason · approval_reference · feature_flag_reference · kill_switch_reference** · status · evidence

## 규칙
- **§4.1 State≠Version**(상태 전이가 Version을 만들지 않고 역도 성립).
- **§4.3 Internal State≠Provider Actual State** — Provider 반영 실패 시 내부 State 전이 금지(auto_campaign 정본).
- `feature_flag_reference`·`kill_switch_reference`= **Registry 실측 부재(grep 0) → Reference 필드만·허구 배선 금지**.
- Active Program에 Active Version 없음 = Critical Gap.
