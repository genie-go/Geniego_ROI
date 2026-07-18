# DSAR — Approval Authority Amount Band 경계 규칙 (§25)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §25(1314-1339) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §4·§8 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **★분모(§25 측정기 정합)**: §25 는 **강제 항목 10 + 예 4 = 14**. `measure_spec_denominator.mjs --sec=25` 실측 **14**(불릿 14·번호 0)과 정합. 금액 Band 필드/기준은 [문서1 §24 필수필드](DSAR_APPROVAL_AUTHORITY_AMOUNT_BAND.md)·[문서2 §24 Amount Basis](DSAR_APPROVAL_AUTHORITY_AMOUNT_BASIS.md).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Amount Band 경계 개념 | 🔴 `amount_band`·`lower_bound`·`upper_bound`·`amount_threshold` grep **0** — 금액 구간(Band)·경계(Boundary) 개념 자체 부재(ⓑ §4:53) | `ABSENT`(부재→신설) |
| 유일 절단점 | 🔴 `Catalog.php:1103` `$price >= HIGH_VALUE_KRW`(단일 `>=` 인라인) — 상하한·inclusive·gap/overlap 검증 **전무**(ⓑ §1:22) | `LEGACY_ADAPTER`(절단점 1개·경계 아님) |
| 경계 충돌/Gap 검증기 | 🔴 중첩·Gap·Inclusive 충돌·Lower>Upper·Currency 없는 Band·Precision 불일치 탐지 로직 **0**(band 개념 부재로 원천 불가) | `BLOCKED_THRESHOLD_CONFLICT`(§65 Threshold Gap/Overlap gap 원천) |
| Zero/Negative/부호 정책 | 🔴 0원·음수·환불/크레딧 부호 정책 저장·집행 0(ⓑ §4:53) | `ABSENT` |

★**§25 는 §24 Amount Band 를 전제로 한 경계 무결성 규칙이나, Band 엔티티가 통째로 부재하므로 강제할 대상이 0이다.** 강제 항목 10종 전부 **ABSENT**(탐지기 부재)이며, 이 부재가 §65 "Threshold Gap/Overlap" 결함의 구조적 원천이다 → 시스템 판정 = **`BLOCKED_THRESHOLD_CONFLICT`**. 예 4종은 원문 예시(강제 아님)이며 시드 0이다.

## 1. 원문 전사 + 판정 — **§25 강제 항목 10 + 예 4 = 14**

### 강제 항목 (10)

| # | 원문 강제 항목 | 현행 대조(측정기 실측) | 판정 |
|---|---|---|---|
| 1 | 중첩 Band 탐지 | 🔴 Band 복수 정의 자체가 없어 중첩 탐지 로직 0 — `HIGH_VALUE_KRW` 단일 절단점만 존재 → §65 "Threshold Overlap" 무방비 | `ABSENT` |
| 2 | Band Gap 탐지 | 🔴 인접 Band 사이 빈 구간(어느 Level 도 미적용) 탐지 0 → §65 "Threshold Gap"(경계에서 두 Level 모두 미적용) 무방비 | `ABSENT` |
| 3 | Inclusive Boundary 충돌 탐지 | 🔴 `lower_bound_inclusive`/`upper_bound_inclusive` 표현 부재(문서1 §24 #5·#7) → 경계값이 두 Band 동시 소속(두 Level 동시 적용) 무방비 | `ABSENT` |
| 4 | Lower Bound > Upper Bound 차단 | 🔴 상하한 컬럼 부재로 역전 검증 원천 불가 | `ABSENT` |
| 5 | Currency 없는 Monetary Band 차단 | 🔴 `base_currency` 축 0(문서1 §24 #8·통화 스코프 부재·ⓑ §4:54) → 통화 미지정 금액 Band 차단 불가 | `ABSENT` |
| 6 | Decimal Precision 불일치 차단 | 🔴 `precision` 선언 부재(문서1 §24 #12) · `HIGH_VALUE_KRW`=float 리터럴 → 정밀도 정합 검증 0 | `ABSENT` |
| 7 | Infinity Band 명시 | 🔴 무한 상단(₩5M 이상 전부 단일 취급) 이 **암묵적**이며 명시된 Infinity Band 선언 0 | `ABSENT` |
| 8 | Zero Amount 처리 명시 | 🔴 0원 처리 정책 부재(문서1 §24 #13) | `ABSENT` |
| 9 | Negative Adjustment 처리 명시 | 🔴 음수 조정 처리 정책 부재(문서1 §24 #14) | `ABSENT` |
| 10 | Refund·Credit 부호 정책 명시 | 🔴 환불·크레딧 부호 정책 0 — 인접 REFUND/CREDIT 금액 기준도 부재(문서2 §24 #9·#10) | `ABSENT` |

### 예 (4) — 원문 예시(강제 아님·시드 0)

| # | 원문 예시 Band | 현행 대조 | 판정 |
|---|---|---|---|
| 11 | 0 이상 10,000 미만 | Band 시드 0 — 예시 구간 미정의 | `NOT_APPLICABLE` |
| 12 | 10,000 이상 50,000 미만 | Band 시드 0 | `NOT_APPLICABLE` |
| 13 | 50,000 이상 100,000 이하 | Band 시드 0 | `NOT_APPLICABLE` |
| 14 | 100,000 초과 | Band 시드 0 | `NOT_APPLICABLE` |

**실측 개수: 14 / 14 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 10(강제 탐지기) · `NOT_APPLICABLE` 4(예시) · 시스템 판정 `BLOCKED_THRESHOLD_CONFLICT`(§0·강제 10종 부재의 집합적 귀결).

> 🔴 **커버 0.** 강제 항목 10종 전부 탐지기가 부재하고, 이 부재는 §65 "Threshold Gap/Overlap" 결함의 **구조적 원천**이다(gap 이 아니라 미구현). Band 개념이 없으므로 경계 충돌을 "판정하는 것조차 없다" → `BLOCKED_THRESHOLD_CONFLICT`. 유일 인접(`HIGH_VALUE_KRW` 단일 절단점)은 경계가 아니라 boolean 스위치다.

## 2. 규칙

- 🔴 **원문 강제: "Threshold 경계에서 두 Level 이 동시에 또는 모두 미적용되지 않게 하라"**(SPEC §25:1336) — 이를 만족하려면 Band 신설 시 (a)중첩 탐지 (b)Gap 탐지 (c)Inclusive 경계 충돌 탐지를 **동시에** 강제해야 한다. 셋 중 하나라도 빠지면 경계값이 두 Band 동시 소속(중복 적용)이거나 어느 Band 에도 미소속(미적용)이 된다.
- 🔴 **`HIGH_VALUE_KRW` 를 다구간 Band 로 승격할 때 경계 탐지기를 함께 신설하라**(문서1 §2 규칙과 연동) — 절단점을 여러 개로 늘리면서 탐지기를 빠뜨리면 §65 Threshold Gap 이 **오히려 악화**된다(현재는 절단점 1개라 gap 이 없다).
- 🔴 **Currency 없는 Monetary Band 차단·Decimal Precision 불일치 차단을 저장계층 제약으로**(장식 아님) — `base_currency`·`precision` 을 Band 필수 컬럼으로 두고 NOT NULL + 검증기로 강제하라. 통화·정밀도 미지정 Band 는 INSERT 거부.
- 🔴 **Infinity Band 는 암묵이 아니라 명시** — 최상단 구간(예: 100,000 초과)을 명시적 무한 상단 플래그로 선언하라. 암묵적 무한대는 상한 검증을 우회시킨다.
- 🔴 **Refund·Credit 부호 정책을 문서2 REFUND_AMOUNT/CREDIT_AMOUNT 기준과 정합** — 부호 정책 없이 환불/크레딧을 Band 에 태우면 음수 금액이 하위 Band 로 오분류된다(Negative Adjustment 무방비).
- 🔴 **경계 무결성 실집행은 별도 승인세션** — 본 문서는 비파괴 설계 명세(코드 변경 0)다. Band·탐지기 신설은 Golden Rule(Extend)·verify·배포승인 세션에서.
