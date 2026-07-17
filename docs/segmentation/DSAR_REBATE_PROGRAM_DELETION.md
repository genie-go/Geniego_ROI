# DSAR — Program Deletion Governance (§28·6 Type)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_DELETION`
deletion_id · rebate_program_id · **deletion_type · requested_by · approved_by · requested_at · approved_at · deleted_at · reason · retention_requirement · legal_hold · active_dependency_count · pending_claim_count · pending_settlement_count · rollback_support · restoration_deadline** · status · evidence

## Deletion Type (6)
**SOFT_DELETE(기본)** · PROVIDER_DELETED · DUPLICATE_DEPRECATION · TEST_DATA_DELETE · LEGAL_ERASURE_REFERENCE · **HARD_DELETE_EXCEPTION**

## 규칙
- **기본은 Soft Delete** · **Hard Delete 는 명시적 법적·보안 정책과 승인 없이는 금지**(Lint "Hard Delete 기본 사용" 차단).
- **Hard Delete 로 Audit History 손실 = Critical Gap**.
- active_dependency_count / pending_claim_count / pending_settlement_count 가 0 이 아니면 **삭제 차단**.
- legal_hold 활성 시 삭제 금지.
- **DSAR 삭제 요청도 금전/세무 원장은 법정 보존기간 내 삭제 금지** → **PII 만 익명화 · pseudonymous reference 유지**(헌법 No-PII 정합 · 현행 참조 Dsar 자식→부모 삭제 순서 Dsar.php:617-634).
