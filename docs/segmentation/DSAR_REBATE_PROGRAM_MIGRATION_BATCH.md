# DSAR — Migration Batch (§34·12 Status)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_MIGRATION_BATCH`
migration_batch_id · migration_plan · **batch_sequence · entity_type · tenant · legal_entity · date_range · expected_count · actual_count · expected_amount · actual_amount · currency · started_at · completed_at · error_count · warning_count · retry_count** · status · evidence

## Batch Status (12)
PLANNED · READY · RUNNING · **PARTIALLY_COMPLETED** · COMPLETED · VALIDATION_PENDING · VALIDATED · FAILED · RETRYING · ROLLBACK_PENDING · ROLLED_BACK · BLOCKED

## 실측
**부재(grep 0)** — `migration_batch` / `batch_sequence` 전무 → **NOT_APPLICABLE(신설)**.

## 규칙
- **batch 를 뭉뚱그려 성공/실패로 표기 금지 — 건별 상태 기록**(288차 가짜녹색 클래스 정합 · PARTIALLY_COMPLETED 상태 필수).
- expected 와 actual 을 **건수·금액 모두** 기록(불일치 = MIGRATION_VALIDATION 대상).
- retry 시 **동일 Idempotency Key 유지**(중복 금융 Entry 금지).
