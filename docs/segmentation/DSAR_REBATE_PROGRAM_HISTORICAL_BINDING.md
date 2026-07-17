# DSAR — Historical Binding (§38)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_HISTORICAL_BINDING`
각 거래·업무에 **당시 값을 고정**: rebate_program_id · **rebate_program_version_id** · **rule_version_reference** · classification_version · funding_agreement_version · funding_allocation_version · contract_version · participant_identity_version · beneficiary_identity_version · claimant_authorization_version · currency_policy_version · source_of_truth_version · **effective_at · recorded_at** · evidence

## §4.10 핵심 규칙
- **Historical Transaction 을 현재 Program 으로 자동 재귀속 금지**.
- 기존 거래는 **당시 적용된 Program · Version · Rule · Funding Agreement 를 유지**.
- **현재 Version 으로 과거 Binding 덮어쓰기 / 재계산 금지**(Lint + Runtime Guard 양면).
- **Historical Binding 없는 Transaction = Lint 차단**(`REBATE_PROGRAM_HISTORICAL_BINDING_MISSING`).

## 실 사례 (관찰·미확정)
**KrChannel.php:459** 가 정산라인 거래일과 무관하게 `ORDER BY effective_from DESC, id DESC LIMIT 1` 로 **최신 kr_fee_rule 1건**을 취해 `$expectedFee = $gross * $feeRate`(:462/471)로 **과거 정산라인을 현재 요율로 재검증** — `effective_from` 이 있음에도 **as-of 조회가 아니다**. 본 원칙의 실 사례로 **근거 기록만**(요율 이력 1건 테넌트 무증상 · 실 영향/의도는 라이브 확인 필요 · FP 레지스트리: PM 코드 재증명 전 P0 단정 금지). **본 세션 비파괴 · 미수정** → EXISTING_IMPLEMENTATION 에서 `MIGRATION_REQUIRED` 분류.
