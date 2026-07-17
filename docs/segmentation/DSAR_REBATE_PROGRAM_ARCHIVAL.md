# DSAR — Program Archival (§27)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_ARCHIVAL`
archival_id · rebate_program_id · **final_version · archived_at · archived_by · reason · retention_policy · retrieval_support · reporting_support · claim_lookup_support · settlement_lookup_support · audit_lookup_support · restore_support** · status · evidence

## 규칙
- **Archive 는 삭제가 아니다** — Archived Program 의 **과거 거래 · Claim · Settlement · Payout · Audit 조회를 보장**하라.
- **Archive 후 Historical Lookup 불가 = Critical Gap**.
- Archived Program 변경(Mutation) 차단(Runtime Guard).
- retention_policy = 법정 보존기간 반영(금전/세무 원장은 DSAR 삭제 요청에도 보존 · PII 만 익명화 · 헌법 No-PII 정합).
