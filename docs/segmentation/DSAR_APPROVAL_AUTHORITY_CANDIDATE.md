# DSAR — Approval Authority Candidate (§47)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §47(1941-1982) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §6 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_CANDIDATE` 엔티티 | `candidate`·`authority_candidate` grep **0** — **후보 도출(Candidate) 파이프라인 전무**(ⓑ §6) | `ABSENT`(엔티티 통째 부재) |
| "이 건을 승인할 자격자 집합" 계산 | 🔴 **코드 0** — 승인 4경로는 **진입게이트 통과자를 그대로 승인**(후보 도출·소스 우선순위·제외사유 계산 없음·ⓑ §3 결론) | `ABSENT` |
| 인접 subject/role 축 | `app_user`(owner=`parent_user_id IS NULL`·ⓑ §3) · `roleRank`(`index.php:554` viewer<connector<analyst<admin) · `team_role`(owner>manager>member) — **양축 직교·매핑 0**(ⓑ §3) | `LEGACY_ADAPTER`(인접·Authority 자격축 아님) |
| Resolution/Matrix 선결 | `chain_resolution`·`authority_matrix`·`matrix_entry` grep **0** — Resolution(§50/§51)·Matrix(§72) 선행 엔티티 부재(ⓑ §1·§6) | `BLOCKED_PREREQUISITE` |

★**후보 엔티티가 통째로 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **원문 36종**(§47 필수 필드 · 측정기 `--sec=47`=36)

| # | 원문 항목명 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | approval_authority_candidate_id | 후보 엔티티 통째 부재 → PK 없음(ⓑ §6) | `NOT_APPLICABLE` |
| 2 | approval_request_id | Approval Request canonical 엔티티 부재(ⓑ §0) · 인접 `mapping_change_request`는 스키마 상이·FK 아님(ⓑ §2) | `NOT_APPLICABLE` |
| 3 | approval_case_id | Approval Case 엔티티 부재 | `NOT_APPLICABLE` |
| 4 | approval_item_id | Approval Item 엔티티 부재 | `NOT_APPLICABLE` |
| 5 | approval_requirement_id | Requirement=요건모델 아님 · `required_approvals` 유일 생산자=`Mapping.php:209-210` 리터럴 `2`+`Db.php:634` `DEFAULT 2`(ⓑ §1) → Requirement 엔티티 없음 | `NOT_APPLICABLE` |
| 6 | chain_resolution_level_id | Resolution(§50/§51) `BLOCKED_PREREQUISITE`(ⓑ §3 결론 · 자격자 판독 정본축 부재) | `BLOCKED_PREREQUISITE` |
| 7 | subject_id | 인접 = `app_user`(owner=`parent_user_id IS NULL`·ⓑ §3) — 사람 신원은 있으나 승인 자격 subject 아님 | `LEGACY_ADAPTER` |
| 8 | role_id | 인접 = `roleRank`(`index.php:554`·기계신원 API등급)·`team_role`(양축 직교·매핑0·ⓑ §3) | `LEGACY_ADAPTER` |
| 9 | position_id | 🔴 직급/Position 엔티티 0 · 다홉 사람계층 walk 0(ⓑ §3) | `ABSENT` |
| 10 | organization_id | 🔴 Organization 엔티티 부재 — tenant는 느슨한 `VARCHAR(100)`(FK0·`Db.php:944`)·조직 계층 아님(ⓑ §7) | `ABSENT` |
| 11 | legal_entity_id | 🔴 Legal Entity 0(`biz_no`/`corp_reg`/`tax_id` grep 0·§6 registry §0.12) | `ABSENT` |
| 12 | authority_definition_id | Authority Definition 엔티티 부재 — DOA/Authority Matrix 0(ⓑ §1) → 선결 | `BLOCKED_PREREQUISITE` |
| 13 | authority_version_id | 🔴 불변 prev-링크 버전체인 선례 0(version 6컬럼 전부 하드코딩 태그·ⓑ §5) · Authority Definition 선결 | `BLOCKED_PREREQUISITE` |
| 14 | authority_matrix_id | DOA/Authority Matrix Table 0(ⓑ §1) → 선결 | `BLOCKED_PREREQUISITE` |
| 15 | authority_matrix_version_id | Matrix+버전체인 선결(ⓑ §1·§5) | `BLOCKED_PREREQUISITE` |
| 16 | matrix_entry_id | Matrix Entry 선결 | `BLOCKED_PREREQUISITE` |
| 17 | authority_type | Authority Type(§7) 자체 없음(§6 registry §0.8) | `ABSENT` |
| 18 | authority_domain | Authority Domain(§8) 자체 없음(§6 registry §0.7) | `ABSENT` |
| 19 | action | 승인 대상 action 축 부재 — HTTP 메서드 `roleRank`(`index.php:568`)는 승인 action 아님(ⓑ §3) | `ABSENT` |
| 20 | resource | 인접 = `acl_permission` scopeSql 데이터-행 필터(`TeamPermissions.php:286`) — Authority 리소스 스코프 아님(장식) | `LEGACY_ADAPTER` |
| 21 | original amount | 🔴 금액축 부재 — 유일 금액조건=`HIGH_VALUE_KRW`(`Catalog.php:1016`) boolean 만(ⓑ §4) | `ABSENT` |
| 22 | original currency | 🔴 통화 스코프 0 · 통화는 변환 전용(`fxToKrw:1749`·ⓑ §4) | `ABSENT` |
| 23 | converted amount | 변환 primitive `fxToKrw:1749` 실재하나 **후보/as-of 컨텍스트 부재 · 과거환율 조회 불가**(ⓑ §4·§5) | `ABSENT` |
| 24 | comparison currency | 기준통화 KRW 암묵(`krwToCurrency:1763`) · comparison currency 필드 개념 0 | `ABSENT` |
| 25 | amount band | `amount_band`·`amount_threshold` grep 0(ⓑ §4) | `ABSENT` |
| 26 | limit period | 인접 = `AutoCampaign.php:855` `periodSpentToDate`(기간 내 누적·마케팅 도메인·승인 아님·ⓑ §4 FLIP) | `LEGACY_ADAPTER` |
| 27 | utilization reference | 인접 = `AutoCampaign.php:843-889` 예산 누적차감(`:856` budget 비교·`:864` pause·마케팅 도메인·ⓑ §4) | `LEGACY_ADAPTER` |
| 28 | remaining authority | 잔여권한 계산 0 — 한도 저장계층 부재(ⓑ §4) | `ABSENT` |
| 29 | scope match | 스코프 매칭=Eligibility(§45/§46) `BLOCKED_PREREQUISITE`(ⓑ §3) · 인접 acl scopeSql은 데이터-행 필터(Authority 스코프 아님) | `BLOCKED_PREREQUISITE` |
| 30 | eligibility result | Eligibility Engine `BLOCKED_PREREQUISITE` — "이 행위자가 이 단계를 승인할 권한 있는가" 정본축 부재(ⓑ §3 결론) | `BLOCKED_PREREQUISITE` |
| 31 | exclusion reasons | Exclusion(§49) 도출 0(ⓑ §6) · 별도 명세 [DSAR_APPROVAL_AUTHORITY_CANDIDATE_EXCLUSION_REASON.md](DSAR_APPROVAL_AUTHORITY_CANDIDATE_EXCLUSION_REASON.md) | `ABSENT` |
| 32 | conflict state | Conflict 탐지/해소(§53/§54) 0 — "conflict" 히트는 전부 SQL `ON CONFLICT`(무관·ⓑ §6) | `ABSENT` |
| 33 | priority | Source Priority(§48) 로직 부재 · 별도 명세 [DSAR_APPROVAL_AUTHORITY_CANDIDATE_PRIORITY.md](DSAR_APPROVAL_AUTHORITY_CANDIDATE_PRIORITY.md) | `ABSENT` |
| 34 | proposed 여부 | 🔴 후보 제안 플래그 — **후보 파이프라인 전무**(핵심 §6)로 제안/미제안 구분 원천 불가 | `NOT_APPLICABLE` |
| 35 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인·§6 registry §0.21) | `LEGACY_ADAPTER` |
| 36 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·prev 교차·ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 36 / 36 전사**(측정기 `--sec=47`=36 · 원문 1941-1982). 커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 6 · `ABSENT` 15 · `LEGACY_ADAPTER` 7 · `BLOCKED_PREREQUISITE` 8 · `KEEP_SEPARATE_WITH_REASON` 0.

> 🔴 **커버 0.00%.** Candidate 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 7건(subject/role=app_user·roleRank · resource/scope=acl_permission · limit·utilization=AutoCampaign · evidence=SecurityAudit · status)은 **확장 대상 인접 자산**이지 커버가 아니다.

## 2. 규칙

- 🔴 **후보 파이프라인은 신설이나, 인접 선례를 재구현하지 마라** — subject=`app_user`/`parent_user_id` 판독 확장(재사용 금지: 의미 변경 시 tenant 해석 전역 붕괴·ⓑ §3) · utilization=`AutoCampaign` 페이싱 패턴 참조 · evidence=`SecurityAudit::verify()` 확장. **중복 엔진 금지.**
- 🔴 **`subject_id`/`role_id` 를 `app_user`/`roleRank` 로 직접 채우지 마라** — `roleRank`(기계신원 API등급)와 `team_role`(사람 조직역할)은 **완전 직교**(ⓑ §3)이며 세션토큰 경로는 `auth_role` 미설정. Candidate 자격축은 두 축의 어느 쪽도 아닌 **Authority 판독축 신설**을 선결한다.
- 🔴 **`chain_resolution_level_id`·`authority_matrix_*` 는 `BLOCKED_PREREQUISITE`** — Resolution(§50/§51)·Matrix(§72)·Authority Definition/Version 엔티티가 선행 신설되어야 후보가 이들을 참조할 수 있다. 후보를 먼저 세우고 matrix를 `NULL`/상수로 채우면 §65 "Amount가 Limit 초과인데 승인 성공" gap 을 구조적으로 재현한다.
- 🔴 **`original amount`/`converted amount` 를 "있음"으로 표기 금지** — 금액축·통화 이력이 저장계층부터 부재(ⓑ §4)이고 과거환율 조회가 불가(24h TTL 라이브 가드뿐·ⓑ §5)하다. 후보 필드가 실제 능력을 초과 선언하면 안 된다.
- 🔴 **코드 변경 0 유지** — 후보 도출 파이프라인 신설·high_value 상수→Amount Band 승격은 **별도 승인세션**(Golden+verify+배포승인).
