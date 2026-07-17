# DSAR — Migration Rollback (§37)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_MIGRATION_ROLLBACK`
rollback_id · migration_plan · migration_execution · **rollback_reason · rollback_scope · requested_by · approved_by · started_at · completed_at · source_restore_checkpoint · target_reversal_checkpoint · records_reverted · financial_entries_reversed · feature_flag_result · source_of_truth_restored · integrity_result** · status · evidence

## 현행 정본 재사용
migrate.php **`-- @rollback` 블록 SQL 적용 + schema_migrations record 제거**(:15) · **`[검토] @rollback 블록 SQL 사전 확인`**(:112) · menu_defaults **baseline = 복원 지점**(AdminMenu.php:294-308).

## 규칙
- **★Rollback 은 단순 Target 삭제가 아니다** — 필요 시 **Reversal · Correction · Restoration Event 생성**(Append-only) + **Source of Truth 복구**.
- **금융 Entry 는 삭제가 아니라 역분개**(financial_entries_reversed · 원본 보존).
- **Rollback 계획/복원 지점 없는 Migration 실행 금지**(282차 "스냅샷 없어 reset 404" 교훈).
- integrity_result 검증 없이 ROLLED_BACK 표기 금지.
