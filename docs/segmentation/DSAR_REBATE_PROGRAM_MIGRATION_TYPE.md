# DSAR — Migration Type (§30b·15종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Migration Type (15)
VERSION_UPGRADE · PROGRAM_REPLACEMENT · PROGRAM_CONSOLIDATION · PROGRAM_SPLIT · PROVIDER_MIGRATION · **TENANT_MIGRATION** · WORKSPACE_MIGRATION · **LEGAL_ENTITY_MIGRATION** · CONTRACT_MIGRATION · FUNDING_MIGRATION · CURRENCY_MIGRATION · REGION_MIGRATION · LEGACY_MIGRATION · DATA_MODEL_MIGRATION · EMERGENCY_MIGRATION

## 실측
**전부 부재(grep 0)** — `contract_migration` / `provider_migration` / `rule_migration` / `claim_migration` / `accrual_migration` / `settlement_migration` / `historical_mapping` 전무. 실 Migration 은 **스키마 마이그레이션(migrate.php)** 뿐.

## 규칙
**TENANT_MIGRATION / LEGAL_ENTITY_MIGRATION 은 기본 CRITICAL 위험**(Cross-Tenant · Wrong Legal Entity Migration = Critical Gap · Runtime Guard 차단). CURRENCY_MIGRATION 은 FX Stage / rate version 정합 필수(4-5-3-1-3).
