# DSAR — Authority Resolution Result (§51 · 지원결과 14 + 필수필드 15 = 29)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0 · 문서만**
> **분할 분모: 지원결과 14 + 필수필드 15 = 29 = §51 측정기 정합**
>   (`node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=51` → **불릿 29**).
> ⚠️ **PM 지시서의 "14+14=28" 은 필수필드 과소계수(1건)였다.** 원문 §51 필수필드는 **15**개이며, 지시서 목록이 `next chain level`(원문 2137행, `next action`↔`status` 사이)을 누락했다. 측정기(§51=29)를 정본으로 삼아 **15개 전량 전사**한다 — 이는 측정기가 존재하는 이유(수기 "목록 끝/중간 항목 누락" 편향 차단)의 재현이다.
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §51(2102-2139) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §6 · Resolution: [DSAR_APPROVAL_AUTHORITY_RESOLUTION.md](DSAR_APPROVAL_AUTHORITY_RESOLUTION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_RESOLUTION_RESULT` 엔티티 | `resolution_result`·`authority_result` grep **0** — Resolution 이 없으므로 그 결과 엔티티도 부재(ⓑ §6) | `NOT_APPLICABLE`(부재→신설) |
| result 분류 축 | 승인 4경로는 `status`→`approved`/`queued` **단방향 전이(ALLOW 방향)** 만 실현 · 14종 result 로 분류 저장하는 축 없음(ⓑ §2) | `LEGACY_ADAPTER`(ALLOW) |
| matched **deny** rules | 🔴 `acl_permission` **allow-only** — deny 비트/행 표현 자체가 없음(ⓑ §6) | `ABSENT` |
| specificity result | Specificity 해소 로직 부재(§52·[DSAR_APPROVAL_AUTHORITY_SPECIFICITY_POLICY.md](DSAR_APPROVAL_AUTHORITY_SPECIFICITY_POLICY.md)·ⓑ §6) | `ABSENT` |
| utilization result | 인접 = `AutoCampaign.php:855` `periodSpentToDate` 누적(마케팅·승인 아님·ⓑ §4 FLIP) | `LEGACY_ADAPTER` |
| evidence | 정본 = `SecurityAudit::verify():56-68`(ⓑ §5) 🔴 `menu_audit_log.hash_chain` 인용 금지 | `LEGACY_ADAPTER` |

★**Result 엔티티가 부재하므로 필드/enum 단위 커버는 원천 불가.** 아래는 원문 전사이며 현행 대조는 "인접 실현/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **지원결과 14**

| # | 원문 결과 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | AUTHORIZED | 인접 = 4경로 `approved` 단방향 전이(`Mapping::approve:238-294`·`Catalog::approveQueue:2350-2357`·`Alerting::decideAction:593`·`AdminGrowth::approvalDecide:1330`) — effect 명명 없이 ALLOW 만 실현(ⓑ §2) | `LEGACY_ADAPTER` |
| 2 | AUTHORIZED_WITH_ADDITIONAL_APPROVAL | 인접 = `required_approvals=2` 리터럴 정족수(`Mapping.php:209-210`) — 금액/건종류 무관 고정 상수(ⓑ §1 §2) | `LEGACY_ADAPTER` |
| 3 | AUTHORIZED_WITH_WARNING | warning 산출 축 부재 | `ABSENT` |
| 4 | LIMIT_EXCEEDED | 🔴 금액 한도 미집행 — high_value 는 필요여부만 켜고 한도 비교 없음(§65 "Amount가 Limit 초과인데 승인 성공" 실재·ⓑ §4 §8) | `ABSENT` |
| 5 | PERIOD_LIMIT_EXCEEDED | 인접 = `AutoCampaign:843-889` 예산 기간 상한 도달 시 pause(`:864`·`budget_cap_pause` `:878`) — 마케팅 도메인·승인 워크플로 아님(ⓑ §4 FLIP) | `LEGACY_ADAPTER` |
| 6 | DENIED | 🔴 DENY 표현 자체 없음 — `acl_permission` allow-only(ⓑ §6) | `ABSENT` |
| 7 | INELIGIBLE | Eligibility(§45/§46) 정본축 부재 — 승인자는 진입 게이트 통과자일 뿐 자격자 후보 아님(ⓑ §3) | `BLOCKED_PREREQUISITE` |
| 8 | NO_AUTHORITY_FOUND | 후보 도출(§47)·소스 우선순위(§48) 부재 → "없음" 판정 자체가 없음(ⓑ §6) | `ABSENT` |
| 9 | CONFLICT | Conflict 탐지/해소(§53/§54) 부재 — "conflict" 히트는 SQL ON CONFLICT/ad_schedule precedence(ⓑ §6) | `ABSENT` |
| 10 | NEXT_LEVEL_REQUIRED | Chain level 부재(5-3-3-3 ABSENT) → 다음 레벨 개념 없음 | `NOT_APPLICABLE` |
| 11 | MANUAL_REVIEW_REQUIRED | high_value collapse — approval_type 무시·unregister와 동일경로(`Catalog.php:2350-2357`·ⓑ §4) → 구별되는 manual-review 산출 없음 | `NOT_APPLICABLE` |
| 12 | FX_UNAVAILABLE | 환율 이력 부재이나 24h TTL 만료 시 라이브 재조회(`Connectors:1794-1796`·ⓑ §4 FLIP) → 과거환율 "unavailable" 판정 축 없음(현재환율은 항상 재조회) | `ABSENT` |
| 13 | BLOCKED | BLOCKED 결과 산출 축 부재 | `ABSENT` |
| 14 | CUSTOM | 부재 | `NOT_APPLICABLE` |

## 2. 원문 전사 + 판정 — **필수필드 15** (지시서 "14"는 `next chain level` 누락 → 측정기 15 정본)

| # | 원문 항목명 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 15 | authority_resolution_result_id | Result 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 16 | authority_resolution_id | Resolution 엔티티 부재([DSAR_APPROVAL_AUTHORITY_RESOLUTION.md](DSAR_APPROVAL_AUTHORITY_RESOLUTION.md)) → FK 없음 | `NOT_APPLICABLE` |
| 17 | result | result 분류 축 부재(위 14종·ⓑ §2) — 상태전이 ALLOW 방향만 | `ABSENT` |
| 18 | reason codes | 사유코드 부재 — §49 제외사유(CONFLICT_OF_INTEREST 등)·§65 gap 코드 저장 없음(ⓑ §6) | `ABSENT` |
| 19 | matched allow rules | 인접 = `acl_permission`(allow-only·`TeamPermissions.php:39`) 이나 소비처가 scopeSql 데이터-행 필터뿐 — Authority rule 매칭 아님(장식·ⓑ §3 §6) | `LEGACY_ADAPTER` |
| 20 | matched deny rules | 🔴 deny 표현 자체 없음(`acl_permission` allow-only·ⓑ §6) → 매칭할 deny rule 부재 | `ABSENT` |
| 21 | winning rule | 특이성(§52)·우선순위(§4.9) 해소 부재 → winner 선정 로직 0(ⓑ §6) | `ABSENT` |
| 22 | specificity result | Specificity 부재(§52·binding 개념0·ⓑ §6) | `ABSENT` |
| 23 | priority result | explicit-deny>allow 우선순위 없음(`acl_permission` allow-only·ⓑ §6) | `ABSENT` |
| 24 | threshold result | Threshold 부재(`amount_threshold`·`approval_threshold` grep0·ⓑ §4) | `ABSENT` |
| 25 | utilization result | 인접 = `AutoCampaign:855-856` periodSpentToDate→budget 비교(마케팅·승인 아님·ⓑ §4 FLIP) | `LEGACY_ADAPTER` |
| 26 | next action | 다음 액션 라우팅 부재 — 4경로는 단일 approved 종결(ⓑ §2) | `ABSENT` |
| 27 | next chain level | Chain level 부재(5-3-3-3 ABSENT) → 다음 체인 레벨 개념 없음 ★(지시서 누락 항목) | `NOT_APPLICABLE` |
| 28 | status | 인접 = 상태전이 다수이나 합법 전이집합 선언 0(전 도메인·ⓑ §5) | `LEGACY_ADAPTER` |
| 29 | evidence | 정본 = `SecurityAudit::verify():56-68`(ⓑ §5) 🔴 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 29 / 29 전사** (지원결과 14 + 필수필드 15). 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 7(1·2·5·19·25·28·29) · `BLOCKED_PREREQUISITE` 1(7) · `ABSENT` 15 · `NOT_APPLICABLE` 6(10·11·14·15·16·27).

> 🔴 **커버 0.** Result 엔티티가 통째로 부재하므로 어떤 항목도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 7건은 인접 실현(AUTHORIZED=상태전이·utilization=AutoCampaign·evidence=SecurityAudit·status=미선언 전이)일 뿐 커버가 아니다.

## 3. 규칙

- 🔴 **`matched deny rules`/`priority result` 를 "있음"으로 표기 금지** — deny 표현이 저장계층부터 부재(`acl_permission` allow-only·ⓑ §6)이므로 매칭·우선순위 판정이 원천 불가다. Result 스키마는 DENY effect(§9·[DSAR_APPROVAL_AUTHORITY_EFFECT.md](DSAR_APPROVAL_AUTHORITY_EFFECT.md)) 신설을 선결해야 §4.9 "explicit-deny>allow" 를 표현한다.
- 🔴 **`utilization result` 를 승인 authority 로 착각 금지** — `AutoCampaign` 예산 누적차감은 마케팅 도메인 실 로직이나 승인 워크플로가 아니다(ⓑ §4 FLIP). Result 의 utilization 은 그 페이싱 패턴을 참조하되(재구현 금지) 승인 한도/기간 축에 바인딩하라.
- 🔴 **`next chain level` 을 계수에서 누락하지 마라** — 지시서 "14"는 측정기 15와 1건 불일치였다. per-entity 전사는 **측정기(§51=29)를 정본**으로 하고 수기 목록을 불신하라(측정기 존재 이유).
- 🔴 **`evidence` 를 `menu_audit_log.hash_chain` 으로 채우지 마라** — 정본은 `SecurityAudit::verify()`(preimage ts 저장·검증기)이며 menu_audit_log 는 preimage ts 소실로 검증 불가능한 장식이다([[reference_menu_audit_log_not_tamper_evident]]).
