# DSAR — Activation Gate (§20·23종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Gate (23) — 활성화 전 필수 검증
Program Master Valid · Program Type Valid · Tenant/Workspace Bound · Environment Valid · Scope Valid · Participant/Beneficiary/Claimant Defined · Sponsor Defined · Funding Model Valid · Funding Allocation Valid · **Shared Funding Total Valid**(4-5-3-1-3 §14) · Contract Valid · Currency Supported · Country Supported · Settlement Responsibility Defined · Payout Responsibility Defined · Liability Owner Defined · Accounting Responsibility Defined · Source of Truth Resolved · **Approval Completed** · No Critical Reconciliation Gap · No Active Duplicate Ambiguity · Feature Flag Ready · **Rollback Plan Ready** · Audit Ready

## 규칙
- **하나라도 Critical Failure 이면 Activation 차단(fail-closed)** — REBATE_PROGRAM_ACTIVATION_BLOCKED.
- **Rollback Plan Ready 의 실 근거**: menu_defaults **baseline 1회 캡처**(AdminMenu.php:294-308) — 282차 "reset 항상 404" 근본원인이 **스냅샷 부재로 롤백 불가**였다.
- **Feature Flag Ready** 는 **Registry 부재(grep 0)** 상태 → 도입 전까지 NOT_APPLICABLE 로 정직 표기(**있다고 가정한 통과 금지**).
