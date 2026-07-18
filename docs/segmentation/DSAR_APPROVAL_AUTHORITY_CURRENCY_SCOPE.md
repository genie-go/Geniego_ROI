# DSAR — Approval Authority Currency Scope (§26 필수필드)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §26(1356-1374) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §4 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **★분모 분할(§26 측정기 정합)**: §26 은 두 목록으로 구성 — **지원 정책 9([문서1 `DSAR_APPROVAL_AUTHORITY_CURRENCY_POLICY.md`](DSAR_APPROVAL_AUTHORITY_CURRENCY_POLICY.md)) + 필수필드 17(본 문서2) = 26**. `measure_spec_denominator.mjs --sec=26` 실측 **26**(불릿 26·번호 0)과 정합. 본 문서는 **필수필드 17**만 전사한다.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_CURRENCY_SCOPE` 엔티티 | 🔴 `currency_scope`·`allowed_currency` grep **0** — 통화 스코프 개념 부재(ⓑ §4:54) | `NOT_APPLICABLE`(부재→신설) |
| authority_matrix_entry_id FK 대상 | Matrix Entry 엔티티 부재(§13)로 FK 앵커 없음 | `NOT_APPLICABLE` |
| 환율 저장계층 | 🔴 `app_setting` KV **단일행 덮어쓰기**(`Connectors.php:1790`,`:1804-1805`)·`rate_date`/`business_day` 컬럼 0(ⓑ §4:55) → fx rate date·as-of policy 구현 불가 | `ABSENT` |
| 통화 변환 인접 | `fxToKrw`(`Connectors.php:1749`)·`krwToCurrency`(`:1763`) = 변환 전용(evidence·base currency 접점만) | `LEGACY_ADAPTER` |

★**Currency Scope 엔티티가 통째로 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **§26 필수필드 17**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_authority_currency_scope_id | 엔티티 부재 → PK 없음(ⓑ §4:54) | `NOT_APPLICABLE` |
| 2 | authority_matrix_entry_id | Matrix Entry(§13) 부재 → FK 앵커 없음 | `NOT_APPLICABLE` |
| 3 | currency_policy | 별문서 전사([문서1 `..._CURRENCY_POLICY.md`](DSAR_APPROVAL_AUTHORITY_CURRENCY_POLICY.md)) — 9종 전량 미시드(BASE_CURRENCY_CONVERSION만 `fxToKrw` 인접) | `LEGACY_ADAPTER` |
| 4 | allowed currencies | 🔴 `allowed_currency` grep 0 — 허용통화 화이트리스트 축 부재(ⓑ §4:54) | `ABSENT` |
| 5 | prohibited currencies | 🔴 금지통화 블랙리스트 축 0(스코프 개념 부재) | `ABSENT` |
| 6 | base currency | 인접 = **KRW 고정**(`fxToKrw`가 전 통화→KRW 변환·`Connectors.php:1749`) — 기준통화는 사실상 KRW이나 설정가능 필드 아님 | `LEGACY_ADAPTER` |
| 7 | functional currency source | 🔴 Legal Entity 기능통화 개념 0(`biz_no`/`corp_reg` grep 0·ⓑ §4:53) | `ABSENT` |
| 8 | fx rate type reference | 🔴 rate type(spot/forward/contract) 축 0 — 단일 환율값만 저장(ⓑ §4:55) | `ABSENT` |
| 9 | fx rate date policy | 🔴 `rate_date`/`business_day` 컬럼 0 → rate date·as-of policy **구현 불가**(저장계층 부재·`Connectors.php:1790`·ⓑ §4:55) | `ABSENT` |
| 10 | missing rate policy | 별문서 전사([문서4 `..._FX_MISSING_RATE_POLICY.md`](DSAR_APPROVAL_AUTHORITY_FX_MISSING_RATE_POLICY.md)) — 환율 이력 부재로 USE_PREVIOUS_BUSINESS_DAY 등 구현 불가 | `ABSENT` |
| 11 | rounding policy | 🔴 통화별 반올림 규칙 축 0 — 변환은 PHP 기본 부동소수(`fxToKrw:1749`) | `ABSENT` |
| 12 | conversion precision | 🔴 변환 정밀도(소수 자릿수) 정책 0(ⓑ §4:54) | `ABSENT` |
| 13 | triangulation allowed 여부 | 🔴 삼각환산(A→KRW→B) 허용 플래그 0 — 크로스레이트 정책 부재 | `ABSENT` |
| 14 | valid_from | 인접 = `kr_fee_rule.effective_from`(open-interval·수수료 도메인·ⓑ §5:72 FLIP) — Currency Scope 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 15 | valid_to | 🔴 `valid_to`/`effective_to` grep 0(오탐 `Onsite.php:396` invalid_token 제외·ⓑ §5:72) → 폐구간 신규 | `ABSENT` |
| 16 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인·ⓑ §5) | `LEGACY_ADAPTER` |
| 17 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts 저장·검증기·ⓑ §5:70) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 17 / 17 전사** (§26 필수필드). 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 5 · `ABSENT` 12.

> 🔴 **커버 0.** Currency Scope 엔티티 부재로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `ABSENT` 12건은 **저장계층부터 신설**해야 하는 축(rate date·allowed/prohibited·precision 등)이고, `LEGACY_ADAPTER` 5건(currency_policy·base currency·valid_from·status·evidence)은 **확장 대상 인접 자산**이지 커버가 아니다.

## 2. 규칙

- 🔴 **fx rate date policy 를 "있음"으로 표기 금지** — `rate_date`/`business_day` 저장계층이 부재(`Connectors.php:1790`·ⓑ §4:55)다. as-of 환율 조회 자체가 원천 불가이므로 Scope 필드가 능력을 초과 선언하면 §65 "Stale FX Rate로 고액 승인" gap 을 구조적으로 유발한다.
- 🔴 **base currency 를 설정가능 필드로 위장하지 마라** — 현행은 KRW 하드 변환(`fxToKrw:1749`)이며 통화 선택축이 아니다. 인접 유틸을 필드 인스턴스로 흡수 금지.
- 🔴 **evidence 를 `menu_audit_log.hash_chain` 로 채우지 마라** — verify() 0·preimage ts 소실로 검증 불가능한 장식이다([[reference_menu_audit_log_not_tamper_evident]]). 정본은 `SecurityAudit::verify()` 확장(ⓑ §5:70).
- 🔴 **valid_from/valid_to 를 `kr_fee_rule.effective_from` 로 균질화 금지** — 수수료는 저장계층 존재·질의계층만 부재이나 환율/통화 스코프는 저장계층부터 부재(ⓑ §4:56-62). 부재 깊이가 다르다.
