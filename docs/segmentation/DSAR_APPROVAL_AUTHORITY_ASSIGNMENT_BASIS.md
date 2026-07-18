# DSAR — Approval Authority Assignment Basis (§9 · Assignment Basis 13)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0 · 문서만**
> ★분할 분모: **28(Definition 필수필드) + 6(Effect) + 13(Assignment Basis) = 47 = §9 측정기 정합**
>   (`node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=9` → **불릿 47**). 본 문서는 그 중 **Assignment Basis 13**을 전사한다. Definition 28 = [DSAR_APPROVAL_AUTHORITY_DEFINITION.md](DSAR_APPROVAL_AUTHORITY_DEFINITION.md) · Effect 6 = [DSAR_APPROVAL_AUTHORITY_EFFECT.md](DSAR_APPROVAL_AUTHORITY_EFFECT.md).
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §9(744-758) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §3 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| "이 행위자가 이 단계를 승인할 자격이 있는가" 판정 정본 축 | 🔴 **레포에 없음**(ⓑ §3 결론) — 4경로 "승인자"는 전부 **진입 게이트 통과자**(analyst+ / requirePro / requirePlan('admin'))이지 자격자 후보 아님 | `ABSENT` |
| Manager Resolver | 🔴 `parent_user_id` 판독 25개소 전량 owner/tenant/team_role 파생 — **상급자(사람) 반환 함수 0 · 다홉 계층 walk 0**(ⓑ §3) | `ABSENT` |
| 권한 축 분열 | `$roleRank`(기계 api_key 등급·`index.php:554`) ↔ `team_role`(owner>manager>member) **양방향 매핑 0 · 완전 직교**(ⓑ §4.2) | `LEGACY_ADAPTER`(매핑 0) |
| owner 판별 | `parent_user_id IS NULL` owner 판별 **실재**(ⓑ §3) | `LEGACY_ADAPTER` |

★**자격 판정 축이 부재하므로 13종 assignment basis 전량 신설.** 아래는 원문 전사이며 현행 대조는 "인접 판독기/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **Assignment Basis 13**

| # | 원문 Assignment Basis | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | SUBJECT | 개별 주체(사람)에게 직접 Authority 부여하는 경로 부재 · `Mapping:268` 자기승인차단은 grant 아님 · `acl_permission`은 role/org 단위(주체 직접 아님) | `NOT_APPLICABLE` |
| 2 | ROLE | 인접 = 권한 축 2벌 — `$roleRank`(HTTP 메서드 판정·기계 api_key 등급·`index.php:554,:568`)·`team_role`(owner>manager>member) — **양방향 매핑 0·직교**(ⓑ §4.2) | `LEGACY_ADAPTER` |
| 3 | POSITION | 🔴 직급(position) 엔티티 0 — 조직 직위 개념 부재 | `ABSENT` |
| 4 | ORGANIZATION | 조직 기반 Authority 부여 부재 · `seedOrg`(`TeamPermissions.php:708-717`)는 role 시드이지 조직 스코프 승인 아님(ⓑ §3) | `NOT_APPLICABLE` |
| 5 | LEGAL_ENTITY_ROLE | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0) → 법인 역할 부여 불가(Registry 필드 12) | `ABSENT` |
| 6 | MANAGER_RELATIONSHIP | 🔴 **Manager Resolver ABSENT** — `parent_user_id` 25개소 전량 owner/tenant 상속/team_role 파생·**상급자 반환 0·다홉 walk 0**(ⓑ §3) · write 시 parent=최상위 owner 하드고정(`createTeamMember:1226`·`provisionUser:502`·`createSubAdmin:1549`) | `ABSENT` |
| 7 | JOB_LEVEL | 🔴 직급 레벨 엔티티 0(ⓑ §3) | `ABSENT` |
| 8 | EXECUTIVE_LEVEL | 🔴 임원 레벨 엔티티 0(ⓑ §3) | `ABSENT` |
| 9 | FUNCTIONAL_ROLE | 기능 역할(직무) 엔티티 부재 — `team_role`은 계정 위계이지 직무 아님 | `NOT_APPLICABLE` |
| 10 | OWNER_RELATIONSHIP | 인접 실재 = `parent_user_id IS NULL` owner 판별(ⓑ §3) — 소유관계 기반 자격 판독 **유일 실재 축**(단 승인 워크플로에 미배선) | `LEGACY_ADAPTER` |
| 11 | POLICY_RESOLVED | 인접 = `RuleEngine`(마케팅 세그 DSL·`RuleEngine.php:24`·`:250` ad_schedule precedence) — **승인 정책엔진 아님·도메인 상이**(Registry 필드 35) | `KEEP_SEPARATE_WITH_REASON` |
| 12 | HYBRID | 부재 — 복합 basis 결합 규칙 0(선행 basis 부재로 결합 대상 없음) | `NOT_APPLICABLE` |
| 13 | CUSTOM | 부재 | `NOT_APPLICABLE` |

**실측 개수: 13 / 13 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 2(2·10) · `KEEP_SEPARATE_WITH_REASON` 1(11) · `ABSENT` 5(3·5·6·7·8) · `NOT_APPLICABLE` 5(1·4·9·12·13).

> 🔴 **커버 0.** 자격 판정 축이 통째로 부재하므로 `VALIDATED_LEGACY` 0. ROLE·OWNER_RELATIONSHIP 의 `LEGACY_ADAPTER` 는 **직교한 2벌 권한 등급 / owner 판별** 인접일 뿐 assignment basis 커버가 아니다. MANAGER_RELATIONSHIP·POSITION·JOB_LEVEL·EXECUTIVE_LEVEL·LEGAL_ENTITY_ROLE 5종은 전부 인적 계층·직급·법인 엔티티 부재로 `ABSENT`.

## 2. 규칙

- 🔴 **`parent_user_id` 를 Manager Resolver 로 재해석 금지** — 25개소가 owner 판별·1홉 tenant 상속·team_role 파생에 의존하며, 의미를 "상급자 사람 계층"으로 바꾸면 tenant 해석이 전역 붕괴한다(ⓑ §3). MANAGER_RELATIONSHIP basis 는 **별도 reporting-line 엔티티 신설**로 도입하라(재사용 금지). ADR = [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md).
- 🔴 **ROLE basis 를 `$roleRank` 로 채우지 마라** — `$roleRank`는 판정축이 HTTP 메서드인 **기계 신원(api_key) API 등급**이고 `team_role`과 매핑이 0이다(ⓑ §4.2). 세션토큰(app_user) 경로는 api_key 미들웨어를 미경유해 `auth_role` 자체가 미설정이다. ROLE assignment 는 두 축의 **권위 매핑 선결** 없이 도입 불가.
- 🔴 **OWNER_RELATIONSHIP 만 실재라고 커버로 격상 금지** — owner 판별은 실재하나 **승인 워크플로에 배선돼 있지 않다**(승인자 = 진입 게이트 통과자). basis=OWNER_RELATIONSHIP 은 판별기를 참조하되 승인 자격 판정으로 신규 배선하라.
- 🔴 **POLICY_RESOLVED 를 `RuleEngine` 로 통합 금지**(§73 중복 방지의 역) — `RuleEngine`은 마케팅 세그 DSL 로 승인 도메인과 상이하다. 승인 정책 해석은 별도 PDP 로 두되, DSL 파서 패턴은 참조 가능(재구현 아닌 확장).
