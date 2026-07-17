# DSAR — Change Set (§14·21 Type)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_CHANGE_SET`
change_set_id · rebate_program_id · **base_version_id · target_version_id · change_type · changed_components · previous_values_reference · new_values_reference · breaking_change · customer_impact · financial_impact · accounting_impact · migration_required · backfill_required · rollback_required · requested_by · requested_at** · status · evidence

## Change Type (21)
METADATA · CLASSIFICATION · SCOPE · PARTICIPANT · BENEFICIARY · CLAIMANT · SPONSOR · FUNDING · CONTRACT · COUNTRY · CURRENCY · ENVIRONMENT · RESPONSIBILITY · EFFECTIVE_PERIOD · SOURCE_OF_TRUTH · PARENT_CHILD · SETTLEMENT · PAYOUT · ACCOUNTING · EMERGENCY · COMPOSITE

## §4.2 Version 없는 운영 변경 금지
다음은 **반드시 새 Version 또는 명시적 Change Set 생성**: Program Type · Scope · Sponsor · Funding Party · Funding Allocation · Contract · Country · Currency · Participant · Beneficiary · Claimant · Settlement Method · Payout Responsibility · Liability Owner · Accounting Responsibility · Effective Period.

## 규칙
- **현재 Program Record 직접 수정으로 과거 상태 덮어쓰기 금지**(§4.3).
- previous / new values = **Reference**(민감 원문·Credential·PII 저장 금지).
- breaking_change=true 이면 CHANGE_IMPACT 필수(없으면 Lint 차단).
