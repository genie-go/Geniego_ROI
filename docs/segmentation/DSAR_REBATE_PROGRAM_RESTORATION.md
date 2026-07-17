# DSAR — Program Restoration (§29·6 Type)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_RESTORATION`
restoration_id · rebate_program_id · **source_archival · source_deletion · restoration_type · target_state · target_version · requested_by · approved_by · restored_at · data_integrity_result · provider_restore_result · dependent_mapping_result · feature_flag_result** · status · evidence

## Restoration Type (6)
METADATA_RESTORE · FULL_RESTORE · READ_ONLY_RESTORE · HISTORICAL_LOOKUP_RESTORE · PROVIDER_SYNC_RESTORE · EMERGENCY_RESTORE

## 현행 정본 재사용
menu_defaults **최신 스냅샷 복원**(AdminMenu.php:584 · `SELECT snapshot_data, version ... ORDER BY created_at DESC LIMIT 1`) + **복원 audit 에 snapshot_version 기록**(:625/641) · **baseline 캡처가 없으면 복원 불가**(282차 reset 404 근본원인).

## 규칙
**복원에도 승인 필수** · data_integrity_result / provider_restore_result 검증 없이 RESTORED 표기 금지(**가짜 복원 금지** · 287/288차 클래스) · restoration_deadline 경과 후 복원 불가 정책 명시.
