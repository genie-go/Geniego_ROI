# DSAR — Migration Plan (§30)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_MIGRATION_PLAN`
migration_plan_id · **source_program · source_version · target_program · target_version · migration_type · migration_reason · migration_scope · cutover_strategy · freeze_window · start_at · target_cutover_at · rollback_window · source_of_truth_switch · provider_coordination · data_backfill_requirement · dual_run_requirement · shadow_validation_requirement · approval_reference · owner** · status · evidence

## §4.9 Migration 은 데이터 복사가 아니다
반드시 포함: **Source · Target · Mapping · Eligibility · Exclusion · Validation · Cutover · Rollback · Reconciliation · Evidence**.

## 현행 정본 재사용 (Migration Framework)
`schema_migrations` 원장(**기적용 skip** · migrate.php:48) · **`-- @rollback` 블록 + record 제거**(:15) · **`--dry-run`**(:13 "적용 예정 식별만·DB 변경 없음") · `[검토] @rollback 블록 SQL 사전 확인`(:112). **★중복 Migration 프레임워크 신설 금지 — migrate.php 재사용**.

## 규칙
**dry-run 결과 없이 실행 금지** · **Rollback 계획/복원 지점 없는 Migration 금지** · 고위험은 Dual Run / Phased 우선 검토 · approval_reference 필수.
