# DSAR — Migration Mapping (§33·9 Type)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_MIGRATION_MAPPING`
mapping_id · migration_plan · **source_entity_type · source_entity_id · source_version · target_entity_type · target_entity_id · target_version · mapping_type · transformation_rule · default_value_policy · unmapped_value_policy · identity_mapping · currency_mapping · funding_mapping · status_mapping · historical_binding_policy · confidence · review_requirement** · status · evidence

## Mapping Type (9)
ONE_TO_ONE · ONE_TO_MANY · MANY_TO_ONE · MANY_TO_MANY · SPLIT · CONSOLIDATE · REFERENCE_ONLY · **NO_MIGRATION** · MANUAL

## 규칙
- **Mapping 누락 시 Migration 실행 금지**(Critical Gap · Runtime Guard `MIGRATION_MAPPING_MISSING`).
- **이름만으로 EXACT 매핑 금지**(4-5-3-1-2 Provider Mapping 계승) · confidence 다요소 · 저신뢰는 review_requirement.
- **미검증 매핑으로 Claim/Accrual 생성 금지**.
- unmapped_value_policy 필수(묵시적 기본값 주입 금지).
- **identity_mapping 은 금전 귀속 주체** → 자동 병합 금지(승인 + 되돌리기 · 현행 정본 CRM 확률 아이덴티티 read-only 후보→승인 병합·282차).
