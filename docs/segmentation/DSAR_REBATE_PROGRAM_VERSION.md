# DSAR — Program Version (§10)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## 실측
**Rebate Program Version 부재(NOT_APPLICABLE·grep 0)**. 실 인접=**menu_defaults `version VARCHAR(32)` + `snapshot_data JSON`**(AdminMenu.php:119-120)·kr_fee_rule `effective_from`(KrChannel.php:151).

## Entity `REBATE_PROGRAM_VERSION`
rebate_program_version_id · rebate_program_id · **version_number · semantic_version · previous_version_id · supersedes_version_id · rollback_of_version_id · correction_of_version_id · version_type · version_status · change_set_id · amendment_id · effective_from · effective_to · created_at · recorded_at · approved_at · scheduled_at · activated_at · retired_at · created_by · approved_by · immutable_payload_hash · source_of_truth_reference** · evidence

## 규칙
- **§4.4 Program Version 은 Rule Version 과 다르다** — Program Version=전체 운영 구조·Rule Version=계산/자격/한도 → 각 거래에 **둘 다** 기록(HISTORICAL_BINDING).
- **§4.3 과거 Version 덮어쓰기 금지** → New / Correction / Amendment / Superseding / Rollback Version 중 하나로만.
- **Approved Version = Immutable**(`immutable_payload_hash` 필수·없으면 Lint 차단).
- UNIQUE(rebate_program_id, version_number).
