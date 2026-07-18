# DSAR — Contract Authority (§44)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §44(1854-1879) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · 포맷 정본: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `Contract Authority` 승인권한 엔티티 | `contract_limit`·`contract_authority` grep **0**(ⓑ §1) — 계약 체결 **승인권한**·계약 엔티티 부재 | `ABSENT`(부재→신설) |
| contracting legal entity | 🔴 `biz_no`/`corp_reg`/`tax_id` grep **0** — 계약 당사자 법인 엔티티 부재 | `ABSENT` |
| lifetime value | 인접 = `CustomerAI` LTV 예측(`CustomerAI.php:14`·`total_ltv` `:81-82`) — 고객 생애가치 예측·계약 LTV 아님(도메인 상이) | `KEEP_SEPARATE_WITH_REASON` |
| region / country | 인접 = `Geo`(IP→ISO→언어 로케일)·country_code 차원 — 로케일 축·계약 준거 관할 아님 | `KEEP_SEPARATE_WITH_REASON` |
| signature requirement | 🔴 `signature_requirement`/`signature_authority` grep **0** | `ABSENT` |

★**Contract Authority 승인권한 엔티티와 계약(Contract) 도메인이 통째로 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **원문 17종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | contract type | 🔴 계약(Contract) 엔티티 자체 부재 → 유형 열거 원천 불가 | `ABSENT` |
| 2 | contracting legal entity | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0) | `ABSENT` |
| 3 | counterparty | 🔴 거래 상대방(counterparty) 엔티티 부재 | `ABSENT` |
| 4 | total contract value | 🔴 계약 총액 저장 엔티티 부재(금액 처리는 `fxToKrw` 변환계층뿐·`Connectors.php:1749`) | `ABSENT` |
| 5 | annualized value | 🔴 연환산 계약가치 엔티티 부재 | `ABSENT` |
| 6 | lifetime value | 인접 = `CustomerAI` LTV(`CustomerAI.php:14`·`total_ltv` `:81-82`) — 고객 생애가치 예측이며 계약 LTV 아님(도메인 상이) | `KEEP_SEPARATE_WITH_REASON` |
| 7 | automatic renewal | 🔴 계약 자동갱신 필드 부재 · Paddle 구독갱신은 외부 PSP 위임(`Paddle.php` 웹훅·계약 승인권한 아님) | `ABSENT` |
| 8 | cancellation liability | 🔴 해지 위약(cancellation liability) 엔티티 부재 | `ABSENT` |
| 9 | governing law | 🔴 준거법(governing law) 필드 grep 0 | `ABSENT` |
| 10 | region | 인접 = `Geo` 지리 차원(IP→ISO 로케일) — 로케일 축이며 계약 관할 region 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 11 | country | 인접 = `Geo`/country_code 차원 — 로케일 축이며 계약 관할 country 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 12 | currency | 인접 = `fxToKrw`/`krwToCurrency`(`Connectors.php:1749`,`:1763`) 변환 전용 · 통화 스코프·과거환율 이력 부재(ⓑ §4) | `LEGACY_ADAPTER` |
| 13 | signature requirement | 🔴 `signature_requirement`/`signature_authority` grep **0** — 서명 요건 엔티티 부재 | `ABSENT` |
| 14 | legal review requirement | 🔴 법무 검토 요건 엔티티 부재 | `ABSENT` |
| 15 | amount band | 인접 = `HIGH_VALUE_KRW` 상수(`Catalog.php:1016`) — 필요여부 boolean만(밴드 아님·ⓑ §4) → §24 Amount Band 로 승격 대상 | `LEGACY_ADAPTER` |
| 16 | status | 상태 전이 다수이나 **합법 전이집합 선언 0**(전 도메인·ⓑ §5) — Contract Authority 상태머신 부재 | `LEGACY_ADAPTER` |
| 17 | evidence | 정본 = `SecurityAudit::verify()`(`SecurityAudit.php:56`·tenant 해시·prev_hash·검증기) · 🔴 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 17 / 17 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 4 · `KEEP_SEPARATE_WITH_REASON` 3 · `ABSENT` 10.

> 🔴 **커버 0.** Contract 는 **계약 도메인 자체가 전무**(계약·당사자·법인·서명·준거법 엔티티 0)하여 10개 필드가 `ABSENT` 다. `KEEP_SEPARATE` 3건(CustomerAI LTV·Geo region/country)은 이름만 겹치는 **다른 도메인**이며 계약 승인권한 축이 아니다. `LEGACY_ADAPTER` 4건은 전 도메인 공통 인접 자산이다.

## 2. 규칙

- 🔴 **§44 원문 지시 — Contract Authority ≠ Rebate Budget Authority 구분**(원문 1876행: "Contract Authority와 Rebate Budget Authority를 구분하라"). 계약 체결 승인권한(총액·연환산·해지위약·서명·준거법)은 리베이트 예산 승인권한(§36/§39 Budget Authority)과 **별개 엔티티**다. 명명·금액축이 겹쳐도 통합하지 마라(중복 인텔리전스 금지).
- 🔴 **CustomerAI LTV 를 계약 lifetime value 로 오인하지 마라** — `CustomerAI.php:81` `total_ltv` 는 고객 구매패턴 예측이고 계약 LTV 는 계약 잔여기간 가치다. 도메인 분리 유지.
- 🔴 **`Geo` region/country 를 계약 관할(governing law/region/country)로 재사용 금지** — Geo(IP→ISO 로케일)는 UI 현지화 축이고 계약 관할은 법적 준거다. 로케일 신호로 준거법을 추정하면 §65 gap(잘못된 관할 승인)을 유발한다.
- 🔴 **signature requirement / legal review requirement 를 "있음"으로 표기 금지** — 서명·법무검토 요건 엔티티가 grep 0 이다. 계약 승인권한 신설 시 서명·법무검토 게이트를 선결하고, 없는 상태에서 "체결 완료"를 표기하지 마라.
- 🔴 **실 결함은 별도 승인세션** — 본 문서는 비파괴 전사 명세이며 코드 변경 0.
