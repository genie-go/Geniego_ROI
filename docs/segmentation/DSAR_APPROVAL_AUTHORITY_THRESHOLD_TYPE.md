# DSAR — Approval Authority Threshold Type & Comparison Operator (§28 · 열거)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §28(1437-1460) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §2·§4 · 필수 필드: [DSAR_APPROVAL_AUTHORITY_THRESHOLD.md](DSAR_APPROVAL_AUTHORITY_THRESHOLD.md)
>
> **분모 분할**: §28 측정기 합계 = **38**(필수 필드 19 + Threshold Type 11 + Comparison Operator 8). 본 문서는 **분할 2/2 = Threshold Type 11 + Comparison Operator 8 = 19**를 다룬다. 필수 필드 19는 [DSAR_APPROVAL_AUTHORITY_THRESHOLD.md](DSAR_APPROVAL_AUTHORITY_THRESHOLD.md)(분할 1/2).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Threshold Type 개념 | `amount_threshold`·`approval_threshold` grep **0** — 임계 **유형** 분류 자체 부재(ⓑ §4) | `NOT_APPLICABLE` |
| 유일 누적 로직 | `AutoCampaign.php:843-889` `periodSpentToDate`→`budget` 비교→상한 도달 시 `AdAdapters::pause`+`optimization_log action='budget_cap_pause'` = 실 기간+누적차감(ⓑ §4 FLIP·§31) · **마케팅 예산 도메인·승인 아님** | `LEGACY_ADAPTER`(CUMULATIVE 인접) |
| Comparison Operator 인접 | `RuleEngine.php:433-440` `compare($a,$op,$b)` switch — `lt/lte/gt/gte/eq`(마케팅 세그 규칙 DSL·`eq`=`abs($a-$b)<1e-9`·default→false) | `LEGACY_ADAPTER`(도메인 상이) |
| 범위 연산자 | 🔴 `BETWEEN_*` 부재 — `compare` 는 단항 이분비교뿐(lower/upper 동시 인자 없음) | `NOT_APPLICABLE` |

★임계 유형/연산자 열거는 **원문 신설 카탈로그**다. 인접 자산은 마케팅 DSL(도메인 상이)뿐이며 승인/금액 Authority 도메인 매핑은 부재다.

## 1. 원문 전사 + 판정

### 1-1. Threshold Type (11)

| # | 원문 Type | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | MINIMUM | 최소 임계 유형 개념 부재(임계 저장 0·ⓑ §4) | `NOT_APPLICABLE` |
| 2 | MAXIMUM | 상한 임계 유형 부재 — `HIGH_VALUE_KRW`(`Catalog.php:1016`)는 boolean 게이트일 뿐 상한 유형 아님·미집행 | `NOT_APPLICABLE` |
| 3 | BAND | 밴드(하한~상한) 유형 부재 — `amount_band` grep 0 | `NOT_APPLICABLE` |
| 4 | EXACT | 정확일치 임계 유형 부재 | `NOT_APPLICABLE` |
| 5 | CUMULATIVE | 인접 = `AutoCampaign.php:843-889` 기간 내 누적 지출 차감·상한집행(ⓑ §4 FLIP·§31) — 마케팅 예산 도메인·승인 워크플로 아님·재구현 금지 | `LEGACY_ADAPTER` |
| 6 | INCREMENTAL | 증분 임계 유형 부재 | `NOT_APPLICABLE` |
| 7 | NET_CHANGE | 순변동 임계 유형 부재 | `NOT_APPLICABLE` |
| 8 | PERCENTAGE | 비율 임계 유형 부재 | `NOT_APPLICABLE` |
| 9 | QUANTITY | 수량 임계 유형 부재 | `NOT_APPLICABLE` |
| 10 | COUNT | 건수 임계 유형 부재(`required_approvals` 리터럴 2는 정족수·임계 아님·ⓑ §1) | `NOT_APPLICABLE` |
| 11 | CUSTOM | 사용자 정의 임계 유형 부재 | `NOT_APPLICABLE` |

### 1-2. Comparison Operator (8)

| # | 원문 Operator | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 12 | LT | 인접 = `RuleEngine.php:436` `compare` `case 'lt'`(마케팅 세그 DSL·도메인 상이·재구현 금지) | `LEGACY_ADAPTER` |
| 13 | LTE | 인접 = `RuleEngine.php:436` `case 'lte'` | `LEGACY_ADAPTER` |
| 14 | EQ | 인접 = `RuleEngine.php:438` `case 'eq'`(`abs($a-$b)<1e-9` float epsilon) | `LEGACY_ADAPTER` |
| 15 | GTE | 인접 = `RuleEngine.php:437` `case 'gte'` | `LEGACY_ADAPTER` |
| 16 | GT | 인접 = `RuleEngine.php:437` `case 'gt'` | `LEGACY_ADAPTER` |
| 17 | BETWEEN_INCLUSIVE | 🔴 범위(폐구간) 연산자 부재 — `compare` 는 단항 이분비교뿐·lower/upper 동시 인자 없음 | `NOT_APPLICABLE` |
| 18 | BETWEEN_EXCLUSIVE | 🔴 범위(개구간) 연산자 부재(동일) | `NOT_APPLICABLE` |
| 19 | CUSTOM | 사용자 정의 연산자 부재(`compare` default→false·ⓑ §RuleEngine) | `NOT_APPLICABLE` |

**실측 개수: 19 / 19 전사**(Threshold Type 11 + Comparison Operator 8). 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 6(#5 CUMULATIVE + #12~16 LT/LTE/EQ/GTE/GT) · `NOT_APPLICABLE` 13(#1~4·6~11 + #17·18·19).

> 🔴 **커버 0.** 임계 유형·연산자 열거 어느 것도 승인/금액 Authority 도메인에 실재하지 않는다. `LEGACY_ADAPTER` 6건은 **마케팅 도메인 인접 자산**(CUMULATIVE=AutoCampaign 예산 페이싱 · LT/LTE/EQ/GTE/GT=RuleEngine 세그 DSL)이며 도메인이 상이하다 — 커버가 아니다.
> 🔴 **RuleEngine 5연산자 ≠ 원문 8연산자**: 원문은 `BETWEEN_INCLUSIVE`/`BETWEEN_EXCLUSIVE`(범위·lower/upper 동시)를 요구하나 RuleEngine 은 단항 이분비교(`lt/lte/gt/gte/eq`)뿐이다. 밴드 임계(§28 BAND·lower_limit/upper_limit)를 지원하려면 범위 연산자 신설이 선행이다.

## 2. 규칙

- 🔴 **Threshold Type/Comparison Operator ENUM 을 RuleEngine 코드값으로 하드코딩하지 마라** — RuleEngine 은 5연산자·마케팅 DSL 도메인이며 원문 8연산자(범위 2종 포함)와 유형 11종을 커버하지 못한다. `pm_audit_log.entity_type` ENUM 이 신규 타입 INSERT 예외를 낸 선례(5-3-3-1 §8)를 반복하지 말고 **확장 가능 카탈로그로**.
- 🔴 **`CUMULATIVE` 를 AutoCampaign 예산 로직 재구현으로 채우지 마라** — `AutoCampaign.php:843-889` 은 마케팅 예산 페이싱(승인 워크플로 아님)이다. 누적 임계 집계 축(aggregation_basis·[필수 필드 문서](DSAR_APPROVAL_AUTHORITY_THRESHOLD.md) #8)은 그 누적 패턴을 **참조**하되 승인 도메인으로 분리하라. **중복 엔진 금지.**
- 🔴 **`BETWEEN_*` 없이 BAND 유형을 구현하지 마라** — 범위 연산자 부재 상태에서 밴드 임계(lower~upper)는 표현 불가다. 범위 연산자 신설이 §28 `amount_band_id`·`lower_limit`·`upper_limit` 집행의 선행 조건이다.
