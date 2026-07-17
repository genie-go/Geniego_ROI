# DSAR — Activation (§19·8 Type)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_ACTIVATION`
activation_id · rebate_program_id · version_id · **activation_type · requested_at · scheduled_at · activated_at · validation_result · approval_reference · feature_flag · rollout_percentage · tenant_scope · environment · pre_activation_snapshot · post_activation_validation · rollback_window** · status · evidence

## Activation Type (8)
IMMEDIATE · **SCHEDULED** · PHASED · TENANT_BY_TENANT · REGION_BY_REGION · PROVIDER_SYNCED · MANUAL · EMERGENCY

## 현행 인접 (실측)
- **SCHEDULED 실행은 REAL**: EmailMarketing scheduled_at + status draft + **예약 큐 + attempts 재시도**(EmailMarketing.php:57/83/101-103) · KakaoChannel 예약 · **예약 드레인 워커 cron**(286차 무음유실 종결) → **재사용**.
- **environment**: GENIE_ENV / IS_DEMO · **Db::envLabel() 사용**(278차 트랩 — Db::env() 는 데모에서도 production 반환).
- **pre_activation_snapshot**: menu_defaults baseline 캡처 패턴(AdminMenu.php:294-308) 재사용.
- **feature_flag**: **Registry 실측 부재(grep 0) → Reference 필드만 · 허구 배선 금지**(287차 죽은 스켈레톤 교훈).

## 규칙
**Approval 없는 Activation 금지** · **Rollback 지점(pre_activation_snapshot) 없는 Activation 금지** · Gate 전량 통과 필수(ACTIVATION_GATE).
