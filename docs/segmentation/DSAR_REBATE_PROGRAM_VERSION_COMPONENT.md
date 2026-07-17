# DSAR — Version Component (§11·23종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_VERSION_COMPONENT`
component_id · version_id · **component_type · component_reference · component_version · component_hash · inherited · overridden · effective_from · effective_to** · evidence

## Component Type (23)
Program Master · Classification · Program Scope · Participant Scope · Beneficiary Scope · Claimant Scope · Sponsor · Funding Agreement · Funding Model · Funding Allocation · Economic Responsibility · Contract Reference · Country · Currency · Environment · Source of Truth · Parent-Child Relationship · Successor-Predecessor Relationship · Operational Configuration · Feature Flag(**Registry 실측 부재→신설**) · Rule Set Reference · Notification Policy Reference · Migration Policy Reference

## 현행 정본 재사용
`menu_defaults`(**snapshot_data JSON + version + created_at**·AdminMenu.php:119-120) = Snapshot 구조 · **baseline 1회 캡처 = 롤백 지점**(:294-308 · 282차 "스냅샷 없어 reset 404" = **스냅샷 없으면 롤백 불가**).

## 규칙
- **§4.11 Snapshot 불변**(발행 후 수정 금지·재캡처=새 Snapshot).
- **계약 원문 복제 금지** — `component_reference` + `component_hash` 만(Authorized Reference·4-5-3-1-3 §9 계승).
- inherited / overridden 명시(**부모 Scope 무조건 복사 금지**·4-5-3-1-1 §10 계승).
