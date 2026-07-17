# DSAR — Version Reconciliation (§40)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_VERSION_RECONCILIATION`
reconciliation_id · program · **comparison_axis · provider_value · internal_value · difference · detected_at · reconciliation_status · resolution · manual_review_required** · evidence

## 비교 축 (12)
Provider Program Version ↔ Internal Version · Provider Effective Date ↔ Internal Effective Date · Provider Status ↔ Internal Lifecycle · Contract Amendment ↔ Program Version · Scope Version ↔ Applied Scope · Funding Agreement Version ↔ Applied Funding · Currency Version ↔ Applied Currency · Source of Truth Version ↔ Warehouse Copy · **Scheduled Activation ↔ Actual Activation** · Program Termination ↔ Provider Termination · **Migration Source Count ↔ Target Count** · Historical Binding ↔ Current Mapping

## 현행 정본
`AutoCampaign` kill-switch — **Internal 과 Provider 발산 금지**(push 실패 시 DB 상태 미변경·502 · AutoCampaign.php:602-609). **불일치 시 외부(Provider) 우선 원칙**은 BillingMethod "우리 DB 가 아니라 매입사 원장이 진실"(:549) 정합.

## 규칙
**Provider·Internal Version Drift = Critical Gap** · 정기 Reconciliation Job · 차이의 **조용한 보정(UPDATE) 금지**(승인된 Correction Version 으로만 해소).
