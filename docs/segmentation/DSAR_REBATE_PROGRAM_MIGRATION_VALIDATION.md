# DSAR — Migration Validation (§36·25 항목)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_MIGRATION_VALIDATION`
validation_id · migration_plan · migration_batch · **validation_type · source_result · target_result · difference · tolerance · severity · passed · validated_at · validator · resolution** · evidence

## 검증 항목 (25)
Record Count · **Financial Amount** · Currency · Program Binding · Version Binding · **Tenant** · **Legal Entity** · Contract · Funding Allocation · Participant · Beneficiary · Claimant · Claim Status · Accrual Status · Liability · Settlement · Payout · Historical Timestamp · Audit Lineage · Duplicate · **Missing Mapping** · Orphan Record · Provider Result · Customer Portal Result · Reporting Result

## 규칙
- **Critical Validation 실패 시 Cutover 완료 금지 → Rollback 또는 Manual Review 전환**.
- **Migration 금액 불일치 = Critical Gap**(`REBATE_PROGRAM_MIGRATION_FINANCIAL_MISMATCH`).
- tolerance 는 **명시적으로 선언**(암묵적 허용오차 금지) · 통화별 minor unit 정합.
- **passed=true 를 실 검증 없이 표기 금지**(287/288차 가짜녹색 클래스 정합).
