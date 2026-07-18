# DSAR — Approval Authority Matrix Entry (§14)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §14(930-962) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **★분모(§14 측정기 정합)**: `measure_spec_denominator.mjs --sec=14` 실측 **27**(불릿 27·번호 0)과 정합. 본 문서는 §14 필수필드 **27**을 전사한다. (§12 = 필수필드 20 + MATRIX_TYPE 15 = 35 는 문서1·2 참조.)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_MATRIX_ENTRY` 엔티티 | 🔴 Matrix(§12)·Version(§13) 부재 → Entry(격자 셀=권한 규칙 행) 부재 · `authority_matrix` grep 0(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| effect(ALLOW/DENY) | 🔴 explicit deny 표현 없음 — `acl_permission`=allow-only(ⓑ §3·§6) · explicit-deny>allow(§4.9) 구조 없음 | `ABSENT` |
| specificity/priority | 🔴 특이성 해소(§52)·우선순위 부재 · "conflict" 히트는 SQL `ON CONFLICT`/`RuleEngine:250` ad_schedule precedence(무관·ⓑ §6) | `ABSENT` |
| binding reference 6종 | 🔴 subject/role/position/organization/legal entity/action binding 축 0(ⓑ §3) | `ABSENT` |
| amount band | 유일 금액조건 = `Catalog.php:1016 HIGH_VALUE_KRW=5000000.0` PHP 상수(`:1103-1105` boolean 만·ⓑ §4) | `LEGACY_ADAPTER` |
| eligibility profile | 🔴 §45/§46 Eligibility·§47~§54 Resolution = `BLOCKED_PREREQUISITE`(자격자 판독 정본 축 부재·ⓑ §3) | `BLOCKED_PREREQUISITE` |

★**Entry 엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **§14 필수필드 27**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_authority_matrix_entry_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | approval_authority_matrix_version_id | Version(§13) 부재 → FK 참조 대상 없음 | `NOT_APPLICABLE` |
| 3 | authority_definition_id | Authority Definition(§5) 엔티티 부재(ⓑ §0·§72 전량 신설) | `NOT_APPLICABLE` |
| 4 | authority_version_id | Authority Version 엔티티 부재 | `NOT_APPLICABLE` |
| 5 | entry_code | 부재 | `NOT_APPLICABLE` |
| 6 | effect | 🔴 explicit ALLOW/DENY effect 표현 없음 — `acl_permission`=allow-only(ⓑ §3·§6) · explicit-deny>allow(§4.9) 구조 없음 | `ABSENT` |
| 7 | priority | 🔴 규칙 우선순위(§35/§52) 부재 · `RuleEngine:250` precedence 는 ad_schedule 도메인(무관·ⓑ §6) | `ABSENT` |
| 8 | specificity | 🔴 특이성 해소(§52) 0 · §4.8 임의 최대한도 선택 금지는 복수 Authority 부재로 무발동(ⓑ §6) | `ABSENT` |
| 9 | subject binding reference | 🔴 subject binding 축 0(ⓑ §3) | `ABSENT` |
| 10 | role binding reference | 🔴 role binding 축 0 · `roleRank`(기계 신원 API 등급)↔`team_role` 매핑 0·직교(ⓑ §4.2) | `ABSENT` |
| 11 | position binding reference | 🔴 position 엔티티·binding 0(ⓑ §1·§3) | `ABSENT` |
| 12 | organization binding reference | 🔴 조직 마스터·binding 0 · `parent_user_id`=tenant 상속용(ⓑ §3) | `ABSENT` |
| 13 | legal entity binding reference | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §4) | `ABSENT` |
| 14 | geographic binding reference | 지리 축 = `Geo`(IP→ISO→언어)·TikTok country_code 차원 — **Authority 지리 스코프 아님**(ⓑ Registry §13) | `KEEP_SEPARATE_WITH_REASON` |
| 15 | resource binding reference | 인접 = `acl_permission` scopeSql 데이터-행 필터(`TeamPermissions.php:286`) — Authority 리소스 스코프 아님(ⓑ §3) | `LEGACY_ADAPTER` |
| 16 | action binding reference | 🔴 Authority Action 축 부재 — 승인 판정축이 HTTP 메서드(`index.php:568`)이지 도메인 Action 아님(ⓑ §4.2) | `ABSENT` |
| 17 | amount band reference | 유일 = `Catalog.php:1016 HIGH_VALUE_KRW=5000000.0` PHP 상수(`:1103-1105` boolean 만·테넌트설정/버전/effective 원천 불가·ⓑ §4) | `LEGACY_ADAPTER` |
| 18 | currency scope reference | 🔴 `currency_scope`/`allowed_currency` grep 0 · 통화는 변환 전용(`fxToKrw:1749`·ⓑ §4 §26) | `ABSENT` |
| 19 | limit period reference | 인접 = `AutoCampaign:843-889`(기간 예산 상한·`periodSpentToDate:855`→`pause:864`·ⓑ §4 §30/§31) — 마케팅 도메인·승인 아님 | `LEGACY_ADAPTER` |
| 20 | eligibility profile reference | 🔴 §45/§46 Eligibility·§47~§54 Resolution = 자격자 판독 정본 축 부재 · 승인 4경로 "승인자"=진입 게이트 통과자(ⓑ §3) | `BLOCKED_PREREQUISITE` |
| 21 | condition reference | 인접 = `RuleEngine`(마케팅 세그 DSL·`:24`·`:250` ad_schedule) — 승인 조건 아님·도메인 상이(ⓑ §6) | `KEEP_SEPARATE_WITH_REASON` |
| 22 | source | 🔴 소스 우선순위(§48)·provenance 부재(ⓑ §6) | `ABSENT` |
| 23 | source record id | 🔴 외부 소스 레코드 참조 축 0(ⓑ §6) | `ABSENT` |
| 24 | valid_from | 인접 = `kr_fee_rule.effective_from`(open-interval·수수료/VAT 도메인·`Db.php:898`·ⓑ §5) — 승인/권한 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 25 | valid_to | 🔴 `valid_to`/`effective_to` grep 0(오탐 `Onsite.php:396` 제외·ⓑ §5) → 폐구간 신규 | `ABSENT` |
| 26 | status | 인접 = 상태전이 다수이나 합법 전이집합 선언 0(ⓑ §2) | `LEGACY_ADAPTER` |
| 27 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts 저장·검증기·ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 27 / 27 전사** (§14 필수필드). 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 6 · `KEEP_SEPARATE_WITH_REASON` 2 · `BLOCKED_PREREQUISITE` 1 · `ABSENT` 13 · `NOT_APPLICABLE` 5.

> 🔴 **커버 0.** Entry 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 6건(resource=acl_permission scopeSql·amount band=HIGH_VALUE_KRW·limit period=AutoCampaign·valid_from=kr_fee_rule·status·evidence=SecurityAudit)은 **확장 대상 인접 자산**이지 커버가 아니다. `effect`·binding 6종은 상위 축(DENY 표현·binding)이 구조적으로 부재하여 `ABSENT`.

## 2. 규칙

- 🔴 **`effect` 를 allow-only 로 두지 마라**(§4.9 explicit-deny>allow) — `acl_permission` allow-only 선례(ⓑ §6)를 상속하면 §65 "Explicit Deny 우선 위반" gap 을 구조적으로 유발한다. DENY 표현을 1급 시민으로.
- 🔴 **`amount band reference` 를 HIGH_VALUE_KRW 상수로 재구현하지 마라** — high_value 는 필요여부 boolean 만 켜고 저장·라우팅되지 않아 unregister 와 동일 경로/권한으로 결재된다(ⓑ §4 갭 CONFIRM). §24 Amount Band 로 승격·신규 임계상수 추가 금지.
- 🔴 **`eligibility profile reference` 를 진입 게이트 통과자로 등치하지 마라**(`BLOCKED_PREREQUISITE`) — §45/§46 자격자 판독 정본 축이 선행 부재(ⓑ §3). "이 행위자가 이 단계를 승인할 권한이 있는가" 축을 먼저 세우지 않으면 §65 "Actor에게 Authority 없는데 승인 성공"을 재현한다.
- 🔴 **`condition reference` 를 `RuleEngine` 마케팅 DSL 로 흡수하지 마라**(`KEEP_SEPARATE_WITH_REASON`) — 세그먼트 조건 DSL 과 승인 조건은 도메인이 상이(ⓑ §6). 중복 엔진 금지이되 재사용도 금지 — 별도 조건 축.
- 🔴 **`priority`/`specificity` 를 스텁으로 두지 마라** — §52 특이성·§53/§54 충돌 해소 엔진이 부재(ⓑ §6)한 상태에서 정렬 컬럼만 만들면 §65 Threshold Gap/Overlap 을 조용히 통과시킨다.
