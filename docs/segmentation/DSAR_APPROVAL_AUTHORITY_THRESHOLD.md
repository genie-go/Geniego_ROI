# DSAR — Approval Authority Threshold (§28 · 필수 필드)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §28(1411-1460) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §4·§5 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **분모 분할**: §28 측정기 합계 = **38**(필수 필드 19 + Threshold Type 11 + Comparison Operator 8). 본 문서는 **분할 1/2 = 필수 필드 19**를 다룬다. Threshold Type/Comparison Operator 19종은 [DSAR_APPROVAL_AUTHORITY_THRESHOLD_TYPE.md](DSAR_APPROVAL_AUTHORITY_THRESHOLD_TYPE.md)(분할 2/2), Threshold Action 9종은 [DSAR_APPROVAL_AUTHORITY_THRESHOLD_ACTION.md](DSAR_APPROVAL_AUTHORITY_THRESHOLD_ACTION.md)(§29).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_THRESHOLD` 엔티티 | `amount_threshold`·`approval_threshold` grep **0**(backend/src) — 임계 저장 엔티티 부재(ⓑ §4) | `NOT_APPLICABLE`(부재→신설) |
| 유일 금액조건 | `Catalog.php:1016` `HIGH_VALUE_KRW=5000000.0`(PHP 상수) · `:1103-1105` `$price>=HIGH_VALUE_KRW`→`$requiresApproval=true`(**boolean 만 켠다**) | `LEGACY_ADAPTER`(임계 유형·한도값 아님) |
| 한도 라우팅 | 🔴 `approval_type='high_value'`는 JSON 응답으로만 반환(`:1125`) · 저장·필터 미반영 → **한도 미집행**(ⓑ §4) · 상위 레벨 요구 없음 | `BLOCKED_FINANCIAL_CONTROL_RISK` |
| comparison operator 인접 | `RuleEngine.php:433-440` `compare($a,$op,$b)` — `lt/lte/gt/gte/eq`(float 비교·`eq`는 1e-9 epsilon) · **마케팅 세그 DSL 도메인** | `LEGACY_ADAPTER`(도메인 상이) |
| next authority / chain level | 🔴 **승인 체인 레벨 자체 부재** — 5-3-3-3 Approval Chain 커버 **0** · 참조할 상위 Authority Level 없음 | `BLOCKED_PREREQUISITE` |
| `valid_to` | `valid_to`/`effective_to` grep **0**(오탐 invalid_token 제외·ⓑ §5) — 폐구간 부재 | `ABSENT` |

★**엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **필수 필드 19**(§28 분할 1/2 · 측정기 38 중 19)

| # | 원문 항목명 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | approval_authority_threshold_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | authority_matrix_entry_id | 🔴 부모 Matrix Entry 엔티티 부재 — 참조 대상 없음(5-3-3-3 계약뿐·커버 0) | `BLOCKED_PREREQUISITE` |
| 3 | threshold_type | 임계 유형 개념 부재 — Type 11종 전사는 [분할 2/2](DSAR_APPROVAL_AUTHORITY_THRESHOLD_TYPE.md) | `NOT_APPLICABLE` |
| 4 | amount_band_id | 🔴 Amount Band 참조 엔티티 부재(`amount_band` grep 0·ⓑ §4) | `ABSENT` |
| 5 | lower_limit | 🔴 임계 저장 **0** — 유일 금액값 = `HIGH_VALUE_KRW` 상수(하한·상한 개념 없음·`Catalog.php:1016`) | `ABSENT` |
| 6 | upper_limit | 🔴 동일 — 상한값 저장계층 부재(테넌트 설정·버전·effective dating 원천 불가·ⓑ §4) | `ABSENT` |
| 7 | currency_scope_id | 🔴 Currency Scope 참조 엔티티 부재(`currency_scope`/`allowed_currency` grep 0) · 통화는 변환 전용(`Connectors.php:1749`·ⓑ §4) | `ABSENT` |
| 8 | aggregation_basis | 인접 = `AutoCampaign.php:843-889` `periodSpentToDate`(기간 내 누적 지출 집계)·마케팅 예산 도메인·승인 아님(ⓑ §4 FLIP) | `LEGACY_ADAPTER` |
| 9 | limit_period_id | 🔴 Limit Period 참조 엔티티 부재(§30 대상) — AutoCampaign period(`:847`)는 마케팅 로컬 문자열·권위 엔티티 아님 | `ABSENT` |
| 10 | comparison_operator | 인접 = `RuleEngine.php:433-440` `compare` `lt/lte/gt/gte/eq`(마케팅 세그 규칙 DSL·`eq`=1e-9 epsilon·도메인 상이·재구현 금지) | `LEGACY_ADAPTER` |
| 11 | tolerance | 🔴 허용오차 저장·개념 부재 — `compare` 의 `1e-9`(`:438`)는 float 동등성 epsilon일 뿐 업무 tolerance 아님 | `ABSENT` |
| 12 | threshold action | 🔴 "한도 초과 시 상위 Authority Level 요구" 액션 = 승인 체인 레벨 부재로 표현 불가(§29 전사=[Action 문서](DSAR_APPROVAL_AUTHORITY_THRESHOLD_ACTION.md)) | `BLOCKED_PREREQUISITE` |
| 13 | next authority reference | 🔴 다음 Authority 참조 = Authority 엔티티 자체 부재(ⓑ §1·§3 결론) | `BLOCKED_PREREQUISITE` |
| 14 | next chain level reference | 🔴 다음 Chain Level 참조 = 승인 체인 레벨 부재(5-3-3-3 커버 0) | `BLOCKED_PREREQUISITE` |
| 15 | manual review policy | 인접 = `Mapping::approve:238-294` maker-checker 정족수 실집행(`required_approvals` 리터럴 2·`:209`) — 단 임계값 연동 아님·부분(ⓑ §2) | `LEGACY_ADAPTER` |
| 16 | valid_from | 인접 = `kr_fee_rule.effective_from`(open-interval valid-from·`Db.php:898`·수수료/VAT 도메인·ⓑ §4·§5) — 승인/임계 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 17 | valid_to | 🔴 `valid_to`/`effective_to` grep **0**(오탐 `Onsite.php:396` invalid_token 제외·ⓑ §5) → 폐구간 신규 | `ABSENT` |
| 18 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인·ⓑ §5) — Threshold 상태 개념 없음 | `LEGACY_ADAPTER` |
| 19 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·검증기·ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 19 / 19 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 6(#8·10·15·16·18·19) · `BLOCKED_PREREQUISITE` 4(#2·12·13·14) · `ABSENT` 7(#4·5·6·7·9·11·17) · `NOT_APPLICABLE` 2(#1·3).

> 🔴 **커버 0.** Threshold 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 6건은 **확장 대상 인접 자산**(aggregation=AutoCampaign 누적·comparison=RuleEngine compare·valid_from=kr_fee_rule·evidence=SecurityAudit)이지 커버가 아니다.
> 🔴 **금융통제 위험 실재(BLOCKED_FINANCIAL_CONTROL_RISK)**: 유일 금액조건 `HIGH_VALUE_KRW`(₩5M)는 `lower_limit`/`upper_limit`/`comparison_operator`/`threshold action` 어느 것도 없이 **승인 필요여부 boolean 만** 켜며, 그 결과조차 저장·필터에 미반영되어 **한도 초과가 미집행**된다(ⓑ §4·§8 "Amount가 Limit 초과인데 승인 성공"). Threshold 신설은 이 갭의 구조적 정정 선행이다.

## 2. 규칙

- 🔴 **Threshold 는 신설이나, 하위 필드의 인접 선례를 재구현하지 마라** — comparison=`RuleEngine::compare` 확장(마케팅 DSL과 승인 도메인 분리 유지) · aggregation=`AutoCampaign` 누적 페이싱 패턴 참조 · valid_from=`kr_fee_rule.effective_from` 질의계층 확장 · evidence=`SecurityAudit::verify()` 확장. **중복 엔진 금지.**
- 🔴 **`HIGH_VALUE_KRW` 상수를 Threshold 로 오인 표기 금지** — 상수는 boolean 게이트일 뿐 `lower_limit`/`upper_limit`/`comparison_operator` 를 갖지 않는다. Threshold 신설 시 상수를 §24 Amount Band + 본 Threshold 로 승격하고 **신규 임계상수 추가 금지**(ⓑ §4).
- 🔴 **`next authority reference`/`next chain level reference` 를 "있음"으로 표기 금지** — 승인 체인 레벨(5-3-3-3)이 선행 부재이므로 `BLOCKED_PREREQUISITE` 다. 5-3-3-3 Approval Chain 정의 없이 Threshold Action 의 "상위 레벨 요구"는 참조 대상이 없다.
- 🔴 **`comparison_operator` ENUM 을 RuleEngine 코드값(`lt/lte/gt/gte/eq`)으로 하드코딩하지 마라** — 원문 8종(LT·LTE·EQ·GTE·GT·BETWEEN_INCLUSIVE·BETWEEN_EXCLUSIVE·CUSTOM)은 `BETWEEN_*`(범위·lower/upper 동시)를 포함하며 RuleEngine 은 단항 이분비교뿐이다(도메인 상이·[분할 2/2](DSAR_APPROVAL_AUTHORITY_THRESHOLD_TYPE.md) 참조).
