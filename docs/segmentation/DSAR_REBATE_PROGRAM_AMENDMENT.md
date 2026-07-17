# DSAR — Amendment (§15·15 Type)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_AMENDMENT`
amendment_id · rebate_program_id · **source_contract_amendment_reference · affected_version · amendment_type · amendment_reason · effective_from · effective_to · affected_scope · affected_funding · affected_responsibility · affected_inflight_items · approval_reference · migration_requirement · rollback_reference** · status · evidence

## Amendment Type (15)
EXTEND_PERIOD · SHORTEN_PERIOD · ADD_SCOPE · REMOVE_SCOPE · CHANGE_SPONSOR · CHANGE_FUNDING · CHANGE_CURRENCY · CHANGE_COUNTRY · CHANGE_CONTRACT · CHANGE_SETTLEMENT · CHANGE_PAYOUT · CHANGE_ACCOUNTING · CORRECTION · EMERGENCY · OTHER

## 규칙
- **Amendment 는 장래효**(새 Version + 새 Effective Period · 과거 거래 불변). Correction(과거 오류 수정)과 혼동 금지.
- source_contract_amendment_reference 는 **Authorized Reference 만 · 계약 원문 복제 금지**(4-5-3-1-3 §9 계승).
- **affected_inflight_items 필수** — INFLIGHT_POLICY 연결(없으면 Lint 차단).
- SHORTEN_PERIOD / REMOVE_SCOPE / CHANGE_FUNDING 은 **참여자 불리 가능 → 통지 + Grandfathering 검토**.
