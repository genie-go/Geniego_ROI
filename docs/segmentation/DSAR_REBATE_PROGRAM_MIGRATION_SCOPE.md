# DSAR — Migration Scope (§32·26 Entity)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_MIGRATION_SCOPE`
migration_scope_id · migration_plan · **entity_type · inclusion_criteria · exclusion_criteria · date_range · tenant_scope · legal_entity_scope · status_scope · expected_record_count · expected_amount_reference · currency · migration_order · dependency** · evidence

## 대상 Entity (26)
Program Master · Program Version · Scope · Classification · Sponsor · Funding · Contract · Participant · Beneficiary · Claimant · Rule Reference · Eligibility Reference · Claim · Accrual · Liability · Budget · Commitment · Reservation · Settlement · Credit Memo · Debit Memo · Payout · Recovery · Dispute · Audit · Reporting History

## 규칙
- **inclusion 과 exclusion 을 모두 명시**(대상/제외 결정 근거 필수).
- **expected_record_count 와 expected_amount 를 사전 산출**(사후 Validation 의 기준) — **임의 숫자 금지·산출 불가 시 UNKNOWN + manual review**.
- migration_order / dependency 로 참조 무결성 순서 보장(현행 참조: Dsar 자식→부모 삭제 순서 Dsar.php:617-634).
- **tenant_scope / legal_entity_scope 미검증 = Critical**(Cross-Tenant · Wrong Legal Entity Migration 차단).
