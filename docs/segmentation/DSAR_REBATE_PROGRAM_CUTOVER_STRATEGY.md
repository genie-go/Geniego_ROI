# DSAR — Cutover Strategy (§31·13종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Cutover Strategy (13)
BIG_BANG · PHASED · TENANT_BY_TENANT · REGION_BY_REGION · PROGRAM_BY_PROGRAM · CONTRACT_BY_CONTRACT · PRODUCT_BY_PRODUCT · CLAIM_COHORT · TRANSACTION_DATE · **DUAL_RUN** · **SHADOW** · READ_ONLY_LEGACY · MANUAL

## 실측
**Dual Run / Shadow 프레임워크 부재(grep 0)** — 현행에 배치 이중 실행·그림자 검증 인프라 없음 → **NOT_APPLICABLE(신설)**.

## 규칙
- **대규모·고위험 Migration 은 기본적으로 Dual Run 또는 Phased 를 우선 검토**.
- **Rollback 불가 상태에서 고위험 Cutover = Critical Gap**.
- rollback_window 경과 시 Runtime Guard 차단(ROLLBACK_WINDOW_EXPIRED).
- freeze_window 중 신규 거래 정책 명시.
