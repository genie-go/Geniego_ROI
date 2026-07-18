# DSAR — Credit Authority (§42)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §42(1816-1834) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · 포맷 정본: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `Credit Authority` 승인권한 엔티티 | `credit_limit`·`credit_authority` grep **0**(ⓑ §1) — 크레딧 발행 **승인권한** 부재 | `NOT_APPLICABLE`(부재→신설) |
| 인접 "credit" 선례 | 쿠폰/적립(`CouponRedeem::redeem` `routes.php:1365` · 쿠폰 `valid_until` `Db.php:345`) — **판촉 크레딧·회계 크레딧 승인권한 아님**(도메인 상이) | `KEEP_SEPARATE_WITH_REASON` |
| account / accounting treatment | 🔴 회계 계정원장·회계처리 엔티티 grep **0** | `ABSENT` |
| legal entity | 🔴 `biz_no`/`corp_reg`/`tax_id` grep **0** | `ABSENT` |

★**Credit Authority 승인권한 엔티티가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **원문 12종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | credit type | 인접 = 쿠폰/적립(`CouponRedeem` `routes.php:1365`) — 판촉 크레딧 유형·**회계 크레딧 승인권한 유형 아님**(도메인 상이) | `KEEP_SEPARATE_WITH_REASON` |
| 2 | customer | 인접 = CRM(`CustomerAI`·crm) 고객 엔티티(도메인 상이) | `KEEP_SEPARATE_WITH_REASON` |
| 3 | account | 🔴 회계 계정(원장) 엔티티 부재 | `ABSENT` |
| 4 | legal entity | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0) | `ABSENT` |
| 5 | credit amount | 금액 처리 = `fxToKrw` 변환계층만(`Connectors.php:1749`) · Credit Authority 금액 저장·이력 부재 | `LEGACY_ADAPTER` |
| 6 | currency | 인접 = `fxToKrw`/`krwToCurrency`(`Connectors.php:1749`,`:1763`) 변환 전용 · 통화 스코프·과거환율 이력 부재(ⓑ §4) | `LEGACY_ADAPTER` |
| 7 | expiration | 인접 = 쿠폰 `valid_until`(`Db.php:345` · `CouponRedeem` 이 `now > valid_until` 거부) — 판촉 만료이나 도메인 상이·승인권한 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 8 | utilization restriction | 🔴 크레딧 **사용 제약**(대상/한도/조건) 엔티티 부재 — 쿠폰 사용조건과 별개 관심사 | `ABSENT` |
| 9 | accounting treatment | 🔴 회계처리(수익/부채 인식) 엔티티 부재 | `ABSENT` |
| 10 | amount band | 인접 = `HIGH_VALUE_KRW` 상수(`Catalog.php:1016`) — 필요여부 boolean만(밴드 아님·ⓑ §4) → §24 Amount Band 로 승격 대상 | `LEGACY_ADAPTER` |
| 11 | status | 상태 전이 다수이나 **합법 전이집합 선언 0**(전 도메인·ⓑ §5) — Credit Authority 상태머신 부재 | `LEGACY_ADAPTER` |
| 12 | evidence | 정본 = `SecurityAudit::verify()`(`SecurityAudit.php:56`·tenant 해시·prev_hash·검증기) · 🔴 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 12 / 12 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 4 · `KEEP_SEPARATE_WITH_REASON` 3 · `ABSENT` 4 · `NOT_APPLICABLE` 1.

> 🔴 **커버 0.** Credit **승인권한** 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `KEEP_SEPARATE` 3건(쿠폰/적립·CRM·쿠폰 만료)은 **판촉 도메인**이지 회계 크레딧 승인권한이 아니다. `account`/`accounting treatment` 부재는 회계 원장 자체가 없다는 뜻이며 신설 선행 대상이다.

## 2. 규칙

- 🔴 **쿠폰/적립(`CouponRedeem`)을 Credit Authority 로 통합하지 마라** — 판촉 크레딧은 마케팅 도메인이고 §42 Credit Authority 는 **회계 크레딧 발행 승인권한**(account·accounting treatment 축)이다. 명명이 겹쳐도 도메인이 다르다(중복 인텔리전스 금지).
- 🔴 **account / accounting treatment 를 "있음"으로 표기 금지** — 회계 계정원장·수익/부채 인식 계층이 저장부터 부재하다. Credit Authority 신설 시 회계 연동을 선결하고, 없는 상태에서 "발행 완료"를 표기하면 §65 gap(권한 없는데 승인 성공)을 재현한다.
- 🔴 **expiration 을 쿠폰 `valid_until` 에 재사용 금지** — 쿠폰 만료(`Db.php:345`)는 판촉 유효기간이고 크레딧 만료는 회계 유효기간이다. 질의 패턴만 참조하고 스키마는 분리.
- 🔴 **amount band / currency 는 §24·§26 로 승격** — `HIGH_VALUE_KRW` boolean 상수와 `fxToKrw` 변환계층은 능력을 초과 선언하지 않도록 그대로 인접 자산으로만 표기.
- 🔴 **실 결함은 별도 승인세션** — 본 문서는 비파괴 전사 명세이며 코드 변경 0.
