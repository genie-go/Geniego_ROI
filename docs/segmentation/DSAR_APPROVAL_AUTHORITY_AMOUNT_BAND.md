# DSAR — Approval Authority Amount Band (§24 필수필드)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §24(1264-1313) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §4 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **★분모 분할(§24 측정기 정합)**: §24 는 두 목록으로 구성 — **필수 필드 16(본 문서1) + Amount Basis 22([문서2 `DSAR_APPROVAL_AUTHORITY_AMOUNT_BASIS.md`](DSAR_APPROVAL_AUTHORITY_AMOUNT_BASIS.md)) = 38**. `measure_spec_denominator.mjs --sec=24` 실측 **38**(불릿 38·번호 0)과 정합. 본 문서는 **필수 필드 16**만 전사한다. 경계 규칙(§25)은 [문서3 `DSAR_APPROVAL_AUTHORITY_AMOUNT_BOUNDARY_POLICY.md`](DSAR_APPROVAL_AUTHORITY_AMOUNT_BOUNDARY_POLICY.md).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_AMOUNT_BAND` 엔티티 | 🔴 `amount_band`·`amount_threshold`·`approval_threshold` grep **0** — Amount Band(금액 구간) 개념 자체 부재(ⓑ §4:53) | `NOT_APPLICABLE`(부재→신설) |
| 유일 금액 조건 | 🔴 `Catalog.php:1016` `HIGH_VALUE_KRW=5000000.0`(**PHP 상수**) · `:1103-1105` `$price >= HIGH_VALUE_KRW` → `requires_approval=true`(승인 필요 여부 **boolean 만**·ⓑ §1:22·§4:53) | `LEGACY_ADAPTER`(상수 → Band 승격 대상) |
| 한도 집행 여부 | 🔴 **한도 미집행** — `approval_type='high_value'`는 `evaluatePolicy` 계산 후 **JSON 응답으로만 반환**(`:1125`·`:2252`)·`logJob:1197` INSERT·`jobs()` SELECT 어디에도 미저장 · `approveQueue:2350-2357`이 approval_type 무시 → ₩5M+와 unregister 동일 경로·동일 권한 결재(ⓑ §4:53) | `BLOCKED_FINANCIAL_CONTROL_RISK`(§65 "Amount가 Limit 초과인데 승인 성공") |
| 통화 스코프 | 🔴 `currency_scope`·`allowed_currency` grep **0** · 통화는 변환 전용(`fxToKrw:1749`·ⓑ §4:54) → Monetary Band 에 부착할 통화 축 부재 | `ABSENT` |
| 환율 저장계층 | 🔴 `app_setting` KV 단일행 덮어쓰기(`Connectors.php:1790`,`:1804-1805`)·`rate_date` 컬럼 0(ⓑ §4:55) → as-of 금액 결정 불가 | `ABSENT` |

★**Amount Band 엔티티가 통째로 부재하므로 필드 단위 커버는 원천 불가.** 유일 인접 = `HIGH_VALUE_KRW` 단일 상수이며 이는 **금액 Band 가 아니라 boolean 스위치**다. 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **§24 필수 필드 16**

| # | 원문 필드명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_authority_amount_band_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | band_code | 부재 — Band 개념 없음 → 코드 체계 0 | `NOT_APPLICABLE` |
| 3 | band_name | 부재 | `NOT_APPLICABLE` |
| 4 | lower_bound | 🔴 Band 하한 없음 — `HIGH_VALUE_KRW` 는 단일 절단점(구간 아님) | `ABSENT` |
| 5 | lower_bound_inclusive | 🔴 경계 inclusive 표현 부재(§25 Inclusive Boundary 충돌 원천) · `>=` 인라인 비교 1개소뿐(`Catalog.php:1103`) | `ABSENT` |
| 6 | upper_bound | 🔴 Band 상한 없음 — 무한대 상단(₩5M 이상 전부 단일 취급) | `ABSENT` |
| 7 | upper_bound_inclusive | 🔴 상한 inclusive/exclusive 개념 부재 | `ABSENT` |
| 8 | base_currency | 🔴 통화 스코프 0 · Monetary Band 에 부착할 통화 축 부재(ⓑ §4:54) — `HIGH_VALUE_KRW` 는 KRW 하드코딩 상수명일 뿐 통화 참조 아님 | `ABSENT` |
| 9 | amount_basis | 별문서 → [문서2 `DSAR_APPROVAL_AUTHORITY_AMOUNT_BASIS.md`](DSAR_APPROVAL_AUTHORITY_AMOUNT_BASIS.md) · 유일 인접 = `HIGH_VALUE_KRW`가 **상품가 기준**(REQUEST_TOTAL 아님·도메인 상이) | `LEGACY_ADAPTER` |
| 10 | aggregation_basis | 인접 실재 = `AutoCampaign` 예산 누적차감(`periodSpentToDate:855`·기간 내 합산·ⓑ §4:64) — 단 마케팅 예산 도메인·승인 금액 집계 아님 | `LEGACY_ADAPTER` |
| 11 | rounding_policy | 🔴 금액 반올림 정책 저장계층 부재 · Band 부재로 라운딩 대상 없음 | `ABSENT` |
| 12 | precision | 🔴 소수 정밀도 선언 0(§25 Decimal Precision 불일치 차단 원천) · `HIGH_VALUE_KRW`=float 리터럴 | `ABSENT` |
| 13 | zero_amount_policy | 🔴 0원 처리 정책 부재(§25 Zero Amount 명시 원천) | `ABSENT` |
| 14 | negative_amount_policy | 🔴 음수/환불·크레딧 부호 정책 부재(§25 Negative Adjustment 원천) | `ABSENT` |
| 15 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인·ⓑ §5:71) — Band status 아님 | `LEGACY_ADAPTER` |
| 16 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·prev_hash 교차·검증기·ⓑ §5:70) · 🔴 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 16 / 16 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 3 · `ABSENT` 9 · `LEGACY_ADAPTER` 4 · `BLOCKED_FINANCIAL_CONTROL_RISK` 1(§0 실측·라우팅 갭).

> 🔴 **커버 0.** Amount Band 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 4건(amount_basis·aggregation_basis·status·evidence)은 **확장 대상 인접 자산**(evidence=SecurityAudit·aggregation=AutoCampaign 페이싱)이지 커버가 아니다. `ABSENT` 9건은 Band 경계·통화·정밀도·정책 축이 **저장계층부터 부재**임을 뜻한다.

## 2. 규칙

- 🔴 **`HIGH_VALUE_KRW` 상수를 §24 Amount Band 로 승격하라** — 현행 `Catalog.php:1016` PHP 상수는 (a)테넌트별 설정 불가 (b)버전/effective dating 원천 불가 (c)단일 절단점(구간·상하한 없음) (d)`requires_approval` boolean 만 켜고 **한도 미집행**(ⓑ §4:53). Amount Band 엔티티(lower/upper_bound + inclusive + base_currency + amount_basis)로 이관하고 **상수는 은퇴**하라. 🔴 **신규 임계 상수 추가 금지** — 또 다른 하드코딩 절단점을 심으면 §65 Threshold Gap 이 재발한다.
- 🔴 **`monetary`/`multi-currency` 능력을 "있음"으로 표기 금지** — 금액 Band·통화 스코프·환율 이력이 저장계층부터 부재(ⓑ §4:54-55). base_currency 없는 Monetary Band 는 §25 "Currency 없는 Monetary Band 차단" 위반이다.
- 🔴 **`HIGH_VALUE_KRW` 라우팅 갭을 상속하지 마라**(BLOCKED_FINANCIAL_CONTROL_RISK) — high_value 판정이 JSON 응답으로만 흐르고 저장·라우팅되지 않아 ₩5M+ 와 unregister 가 동일 권한(`requirePro`)으로 결재된다(ⓑ §4:53). Amount Band 승격 시 판정 결과를 **큐 필터/권한 라우팅에 실집행**하라(별도 승인세션).
- 🔴 **경계 규칙(lower/upper_bound·inclusive·precision·zero/negative policy)은 [문서3 §25 경계 정책](DSAR_APPROVAL_AUTHORITY_AMOUNT_BOUNDARY_POLICY.md)에서 강제** — Band 필드만 신설하고 경계 탐지기를 빠뜨리면 중첩/Gap/Inclusive 충돌이 무방비다.
- 🔴 **evidence 를 `SecurityAudit::verify()` 로 확장**(재구현 금지) · `menu_audit_log.hash_chain`(verify() 0·preimage ts 소실) **인용 금지**.
