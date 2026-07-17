# DSAR — Migration Execution (§35)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_MIGRATION_EXECUTION`
execution_id · migration_plan · migration_batch · **execution_attempt · source_checkpoint · target_checkpoint · started_at · completed_at · records_read · records_transformed · records_written · records_skipped · records_failed · financial_total_before · financial_total_after · currency · idempotency_key · execution_hash** · status · evidence

## 현행 정본 재사용 (멱등)
- `schema_migrations` 원장 — **기적용 파일 skip**(migrate.php:48 "Skipped: N (이미 schema_migrations 에 기록됨)") = **멱등 실행 원장**.
- self-healing `ensureTables` / `CREATE TABLE IF NOT EXISTS` **73 핸들러** = **재실행 안전 패턴**.
- **`--dry-run`**(migrate.php:13 "적용 예정 식별만, DB 변경 없음") — **dry-run 결과 없이 실행 금지**.

## 규칙
- **Migration 재실행으로 중복 Claim / Accrual / Liability / Settlement / Payout 생성 금지** — Idempotency Key 강제(Lint `MIGRATION_IDEMPOTENCY` 누락 차단).
- **원장에 기록되지 않은 실행 금지**(schema_migrations 패턴 계승).
- checkpoint 기록으로 중단·재개 지원 · financial_total_before/after 를 **반드시 함께** 기록(금액 검증 기준).
