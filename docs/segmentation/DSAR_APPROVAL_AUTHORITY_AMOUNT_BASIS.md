# DSAR — Approval Authority Amount Basis (§24 Amount Basis)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §24(1264-1313) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §4 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **★분모 분할(§24 측정기 정합)**: §24 는 두 목록으로 구성 — **필수 필드 16([문서1 `DSAR_APPROVAL_AUTHORITY_AMOUNT_BAND.md`](DSAR_APPROVAL_AUTHORITY_AMOUNT_BAND.md)) + Amount Basis 22(본 문서2) = 38**. `measure_spec_denominator.mjs --sec=24` 실측 **38**(불릿 38·번호 0)과 정합. 본 문서는 **Amount Basis 22**만 전사한다.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Amount Basis ENUM | 🔴 `amount_basis`·`amount_band` grep **0** — 금액 기준 축(어떤 금액으로 Band 를 판정할지) 개념 자체 부재(ⓑ §4:53) | `NOT_APPLICABLE`(부재→신설) |
| 유일 금액 인접 | 🔴 `Catalog.php:1103` `$price >= HIGH_VALUE_KRW` — **상품가(단일 품목 가격) 기준**·요청총액/승인항목/라인아이템 어느 축인지 미선언(ⓑ §1:22) | `LEGACY_ADAPTER`(상품가 절단점 1개) |
| 예산 인접 | 인접 = `AutoCampaign` 광고예산 상한(`periodSpentToDate:855`·`budget` 비교·ⓑ §4:64) — 마케팅 도메인·승인 금액 기준 아님 | `LEGACY_ADAPTER`(PROGRAM_BUDGET 성격) |
| 세율 인접 | 인접 = `kr_fee_rule` VAT(`KrChannel.php` vat_rate·수수료 도메인·ⓑ §4:58-62) — 승인 금액의 TAX_INCLUDED/EXCLUDED 기준 아님 | `KEEP_SEPARATE_WITH_REASON` |
| LTV 인접 | 인접 = `CustomerAI` LTV(고객 생애가치·마케팅 세그 도메인) — 승인 금액 기준 아님 | `KEEP_SEPARATE_WITH_REASON` |

★**Amount Basis 22종은 Amount Band 엔티티의 판정 축이나, Band 엔티티가 통째로 부재하므로 기준 시드 0.** 유일 인접 = `HIGH_VALUE_KRW`(상품가 절단점) 하나이며, 이는 22종 중 어디에도 정식 부착돼 있지 않다(REQUEST_TOTAL/LINE_ITEM 미선언). 세율·LTV·예산 인접은 **도메인이 다른 별개 축**이다.

## 1. 원문 전사 + 판정 — **§24 Amount Basis 22**

| # | 원문 Basis | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | REQUEST_TOTAL | 인접 = `HIGH_VALUE_KRW`가 **상품가 기준**(요청 총액 아님·`Catalog.php:1103`·ⓑ §1:22) — 승인 요청 총액 축 미선언 | `LEGACY_ADAPTER` |
| 2 | APPROVAL_ITEM_AMOUNT | 승인 항목 금액 축 0 | `NOT_APPLICABLE` |
| 3 | LINE_ITEM_AMOUNT | 라인아이템 금액 기준 0 — `HIGH_VALUE_KRW`는 상품가이나 라인아이템 집계 아님(단일 `$price` 비교) | `NOT_APPLICABLE` |
| 4 | PROGRAM_BUDGET | 인접 = `AutoCampaign` 광고예산(`budget`·`periodSpentToDate:855`·ⓑ §4:64) — 마케팅 예산 도메인·승인 금액 아님 | `LEGACY_ADAPTER` |
| 5 | CLAIM_AMOUNT | claim 금액 승인 기준 0(`claim_limit` grep 0·ⓑ §1:21) | `NOT_APPLICABLE` |
| 6 | SETTLEMENT_AMOUNT | 정산 파이프라인은 있으나 승인 금액 기준 아님(`settlement_limit` grep 0·ⓑ §1:21) | `NOT_APPLICABLE` |
| 7 | PAYMENT_AMOUNT | payment authority 금액 축 0(`payment_authority` grep 0·ⓑ §1:21) | `NOT_APPLICABLE` |
| 8 | PAYOUT_AMOUNT | payout 금액 승인 기준 0(`payout_authority` grep 0) | `NOT_APPLICABLE` |
| 9 | REFUND_AMOUNT | 환불 금액 승인 기준 0(`refund_limit` grep 0) | `NOT_APPLICABLE` |
| 10 | CREDIT_AMOUNT | 크레딧 금액 기준 0(`credit_limit` grep 0) | `NOT_APPLICABLE` |
| 11 | WRITE_OFF_AMOUNT | 상각 금액 기준 0(`writeoff_limit` grep 0) | `NOT_APPLICABLE` |
| 12 | CONTRACT_VALUE | 계약 금액 승인 기준 0(`contract_limit` grep 0) | `NOT_APPLICABLE` |
| 13 | ANNUALIZED_CONTRACT_VALUE | 연환산 계약가 축 0 | `NOT_APPLICABLE` |
| 14 | LIFETIME_VALUE | 인접 = `CustomerAI` LTV(고객 생애가치) — **도메인 상이**(마케팅 세그·승인 금액 기준 아님) | `KEEP_SEPARATE_WITH_REASON` |
| 15 | INCREMENTAL_AMOUNT | 증분 금액 기준 0 | `NOT_APPLICABLE` |
| 16 | NET_CHANGE | 순변동 금액 기준 0 | `NOT_APPLICABLE` |
| 17 | GROSS_AMOUNT | 총액 기준 0 | `NOT_APPLICABLE` |
| 18 | NET_AMOUNT | 순액 기준 0 | `NOT_APPLICABLE` |
| 19 | TAX_INCLUDED | 인접 = `kr_fee_rule` VAT(`vat_rate`·수수료 도메인·ⓑ §4:58-62) — **세금 포함/제외는 수수료 정산 축**·승인 금액 기준 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 20 | TAX_EXCLUDED | 인접 = 동상(`kr_fee_rule` VAT) — 승인 금액 TAX 기준 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 21 | POLICY_RESOLVED | 정책 해소 금액 기준 0 — 애초 Resolution 엔진 부재(ⓑ §6:80) | `NOT_APPLICABLE` |
| 22 | CUSTOM | 사용자정의 기준 0 | `NOT_APPLICABLE` |

**실측 개수: 22 / 22 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 2(REQUEST_TOTAL·PROGRAM_BUDGET) · `KEEP_SEPARATE_WITH_REASON` 3(LIFETIME_VALUE·TAX_INCLUDED·TAX_EXCLUDED) · `NOT_APPLICABLE` 17.

> 🔴 **커버 0.** Amount Basis ENUM 이 통째로 부재하므로 어떤 기준도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 2건은 접점(상품가 절단점·예산 상한)이 있으나 **정식 부착·도메인 정합이 없다**. `KEEP_SEPARATE_WITH_REASON` 3건(세율·LTV)은 **도메인이 다른 별개 축**으로, 승인 금액 기준으로 흡수하면 안 된다.

## 2. 규칙

- 🔴 **`HIGH_VALUE_KRW`(상품가)를 승인 금액 기준으로 곧장 재사용하지 마라** — 상품가는 REQUEST_TOTAL(요청 총액)도 LINE_ITEM_AMOUNT(라인아이템)도 아닌 **미선언 축**이다(ⓑ §1:22). Amount Band 승격 시 `amount_basis` 를 명시(§24 필수필드 9·[문서1](DSAR_APPROVAL_AUTHORITY_AMOUNT_BAND.md))하고, 어떤 금액으로 판정하는지 확정하라(중복 계산·이중 기준 방지).
- 🔴 **세율(TAX_INCLUDED/EXCLUDED) 을 `kr_fee_rule` VAT 로 대체 금지**(KEEP_SEPARATE_WITH_REASON) — VAT 는 수수료 정산 도메인의 세율 축이지 승인 금액의 세금 포함 기준이 아니다(ⓑ §4:58-62). 균질화하면 §57 "세율 vs 환율 부재 깊이" 대조가 붕괴한다.
- 🔴 **LIFETIME_VALUE 를 `CustomerAI` LTV 로 흡수 금지**(KEEP_SEPARATE_WITH_REASON) — 고객 생애가치는 마케팅 세그 도메인이며 승인 금액 기준과 목적·SoT 가 다르다.
- 🔴 **PROGRAM_BUDGET 를 `AutoCampaign` 예산 상한과 동일시 금지**(LEGACY_ADAPTER) — 광고예산 페이싱은 승인 워크플로가 아니다(ⓑ §4:64). 누적 집계 패턴(`periodSpentToDate`)은 참조하되 **중복 엔진 금지**.
- 🔴 **22종을 ENUM 하드코딩하지 마라** — `pm_audit_log.entity_type` ENUM 이 신규 타입 INSERT 예외를 낸 선례(5-3-3-1 §8)를 반복하지 말고 확장 가능 카탈로그로.
