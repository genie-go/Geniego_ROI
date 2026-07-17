# DSAR — Program Supersession (§26·10 Type)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_SUPERSESSION`
supersession_id · **predecessor_program · predecessor_version · successor_program · successor_version · supersession_type · effective_at · scope_mapping · participant_mapping · funding_mapping · contract_mapping · pending_item_policy · historical_binding_policy · migration_plan · rollback_reference** · status · evidence

## Supersession Type (10)
FULL_REPLACEMENT · PARTIAL_REPLACEMENT · REGIONAL_REPLACEMENT · PRODUCT_REPLACEMENT · CONTRACT_REPLACEMENT · PROVIDER_REPLACEMENT · CONSOLIDATION · SPLIT · CORRECTION · OTHER

## 현행 정본 재사용
catalog_writeback_job `status='superseded'`(Catalog.php:1188) · **superseded 는 결과 판정에서 제외**(:1871-1873 — "superseded 결과를 읽으면 해결된 오류가 계속 표시된다") · **미처리 잡 물리 삭제 금지 회귀 교훈**(:1187).

## 규칙
**구 Program/Version 물리 삭제 금지 — 상태 마감 + 판정 제외**. **§4.10 historical_binding_policy 필수**(과거 거래를 successor 로 자동 재귀속 금지). pending_item_policy 필수(INFLIGHT_POLICY 연결).
