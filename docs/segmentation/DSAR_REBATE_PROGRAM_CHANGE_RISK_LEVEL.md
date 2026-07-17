# DSAR — 변경 위험 등급 (§17)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## 등급 (7)
NONE · LOW · MEDIUM · HIGH · CRITICAL · BLOCKED · UNKNOWN

## 기본 High / Critical 후보 (14)
Tenant 변경 · **Legal Entity 변경** · **Funding Party 변경** · Currency 변경 · Accounting Owner 변경 · Beneficiary Type 변경 · Claimant Authorization 변경 · **Retrospective 적용** · **Historical Transaction 재귀속** · Settlement Method 변경 · Payout Responsibility 변경 · Provider Account 변경 · **Production Environment 변경** · Migration 대상 대량 변경

## 규칙
**UNKNOWN 은 BLOCKED 취급(fail-closed)** — 위험 미평가 상태로 Production Activation 금지. CRITICAL / BLOCKED 는 CRITICAL_GAP_POLICY 에 따라 Access Review 차단.
