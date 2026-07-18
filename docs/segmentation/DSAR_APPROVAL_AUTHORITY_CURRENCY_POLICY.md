# DSAR — Approval Authority Currency Policy (§26 지원 정책)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §26(1340-1374) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §4 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **★분모 분할(§26 측정기 정합)**: §26 은 두 목록으로 구성 — **지원 정책 9(본 문서1) + 필수필드 17([문서2 `DSAR_APPROVAL_AUTHORITY_CURRENCY_SCOPE.md`](DSAR_APPROVAL_AUTHORITY_CURRENCY_SCOPE.md)) = 26**. `measure_spec_denominator.mjs --sec=26` 실측 **26**(불릿 26·번호 0)과 정합. 본 문서는 **지원 정책 9**만 전사한다.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Currency Policy ENUM | 🔴 `currency_policy`·`currency_scope`·`allowed_currency` grep **0** — 통화 스코프 개념 자체 부재(ⓑ §4:54) | `NOT_APPLICABLE`(부재→신설) |
| 유일 통화 자산 | 통화는 **변환 전용** — `fxToKrw`(`Connectors.php:1749`)·`krwToCurrency`(`:1763`)(ⓑ §4:54) | `LEGACY_ADAPTER`(BASE_CURRENCY_CONVERSION 한정) |
| 환율 저장계층 | 🔴 `app_setting` KV **단일행 덮어쓰기**(`Connectors.php:1790`,`:1804-1805`)·`rate_date`/`business_day` 컬럼 0 → 정책별 as-of 통화 결정 원천 불가(ⓑ §4:55) | `ABSENT` |
| Legal Entity / Program / Settlement 축 | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §4:53) · program/settlement authority 통화 축 0 | `NOT_APPLICABLE` |

★**통화 정책은 Currency Scope 엔티티의 축이나, 스코프 엔티티가 통째로 부재하므로 정책 시드 0.** 유일한 인접 = KRW 기준 변환 유틸(`fxToKrw`)이며 이는 **BASE_CURRENCY_CONVERSION 하나에만 접한다.** 나머지 8종은 접점 없음.

## 1. 원문 전사 + 판정 — **§26 지원 정책 9**

| # | 원문 정책 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | SINGLE_CURRENCY | 사실상 운영통화 KRW이나 **정책 선언 엔티티 0** — 스코프 축 부재로 "단일통화 정책"으로 명시 불가(ⓑ §4:54) | `NOT_APPLICABLE` |
| 2 | MULTI_CURRENCY_FIXED_LIMIT | 🔴 다통화 한도축 0 · 통화별 상한 저장 0(§28 amount_threshold 자체 0·ⓑ §4:53) | `NOT_APPLICABLE` |
| 3 | BASE_CURRENCY_CONVERSION | 인접 = `fxToKrw`(`Connectors.php:1749`)·`krwToCurrency`(`:1763`) — **KRW 기준 변환은 실재하나 변환 전용·이력無**(rate_date 컬럼 0·`:1790`·ⓑ §4:55) | `LEGACY_ADAPTER` |
| 4 | LEGAL_ENTITY_FUNCTIONAL_CURRENCY | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §4:53) → 법인 기능통화 개념 부재 | `NOT_APPLICABLE` |
| 5 | PROGRAM_CURRENCY | 프로그램(리베이트/클레임 등) 통화 축 0 — 해당 도메인 authority 자체 부재(ⓑ §4:64) | `NOT_APPLICABLE` |
| 6 | TRANSACTION_CURRENCY | 거래 원통화 보존 스코프 0 — 통화는 KRW 변환값만 저장(ⓑ §4:54) | `NOT_APPLICABLE` |
| 7 | SETTLEMENT_CURRENCY | 정산 통화 승인축 0(정산 파이프라인은 있으나 승인권한/통화정책 아님·ⓑ §4) | `NOT_APPLICABLE` |
| 8 | POLICY_RESOLVED | 통화 결정 우선순위 엔진 0 — 정책 해석기 부재(ⓑ §4) | `NOT_APPLICABLE` |
| 9 | CUSTOM | 부재 | `NOT_APPLICABLE` |

**실측 개수: 9 / 9 전사** (§26 지원 정책). 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 1 · `NOT_APPLICABLE` 8.

> 🔴 **커버 0.** Currency Scope 엔티티 부재로 정책 시드 0. `LEGACY_ADAPTER` 1건(BASE_CURRENCY_CONVERSION=`fxToKrw`)은 **변환 유틸**이지 통화 정책 인스턴스가 아니다 — 과거환율 조회·rate date 이력이 저장계층부터 없어(`:1790`) 정책 능력을 충족하지 못한다.

## 2. 규칙

- 🔴 **9종을 ENUM 하드코딩하지 마라** — `pm_audit_log.entity_type` ENUM 이 신규 타입 INSERT 예외를 낸 선례(5-3-3-1 §8)를 반복하지 말고 **확장 가능 카탈로그**로.
- 🔴 **BASE_CURRENCY_CONVERSION 을 `fxToKrw` 로 1:1 등치하지 마라** — `fxToKrw`는 **현재 환율 KRW 변환 유틸**이지 통화 정책이 아니다. rate_date/business_day 저장계층이 부재(ⓑ §4:55)하므로 as-of 통화 결정 능력이 없다. 인접 유틸을 정책 인스턴스로 흡수하면 능력 초과 선언(§65 gap 유발).
- 🔴 **세율(`kr_fee_rule.effective_from`)과 균질화 금지** — 세율은 저장계층(`effective_from` 컬럼·데이터) 존재·질의계층만 부재이나, 환율은 **저장계층부터 부재**(ⓑ §4:56-62). 부재 깊이가 다르므로 동일 확장 전략으로 묶지 마라 — 환율은 스키마 신설이 선행이다.
- 🔴 **`NOT_APPLICABLE` 8종을 "미래 시드"로 미리 채우지 마라** — Legal Entity·Program·Settlement 등 도메인 엔티티가 선행 부재(ⓑ §4)이므로 통화 정책만 만들면 참조 무결성 없는 고아 태그가 된다.
