# DSAR — Approval Authority Binding Type (§15 · Binding Type 15)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0 · 문서만**
> ★분할 분모: **Binding Type 15 + 필수필드 13 = 28 = §15 측정기 정합**
>   (`node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=15` → **불릿 28**). 본 문서는 그 중 **Binding Type 15**를 전사한다. 필수필드 13 = [DSAR_APPROVAL_AUTHORITY_BINDING.md](DSAR_APPROVAL_AUTHORITY_BINDING.md).
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §15(966-1005) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §3·§4 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Authority Binding 개념(Domain·Action·Scope 에서 승인권한을 주체/역할/조직에 묶는 결속) | 🔴 **레포에 통째로 없음**(ⓑ §0 결론) — `authority_binding`·`approval_authority_binding` grep **0** · 승인은 미들웨어 진입 게이트 + 상태전이로만 이뤄짐 | `ABSENT`(엔티티 전체 부재) |
| binding 축으로 재사용 가능한 인적 계층 | 🔴 **Manager Resolver ABSENT** — `parent_user_id` 25개소 전량 owner 판별/1홉 tenant 상속/team_role 파생 · **상급자(사람) 반환 함수 0 · 다홉 walk 0**(ⓑ §3) | `ABSENT` |
| 유일 실재 결속 판독기 | `parent_user_id IS NULL OR team_role='owner'` owner 판별(`AdAdapters.php:45`·ⓑ §3) — 소유관계 판독은 실재하나 승인 결속에 미배선 | `LEGACY_ADAPTER` |

★**Authority Binding 엔티티가 통째로 부재하므로 Binding Type 열거도 전부 미시드다.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 판독기/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **Binding Type 15**

| # | 원문 Binding Type | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | SUBJECT | 개별 주체(사람)에게 직접 Authority 를 결속하는 경로 부재 · `acl_permission`은 role/org 단위(주체 직접 결속 아님·ⓑ §3) — 상세는 §16 [SUBJECT_BINDING](DSAR_APPROVAL_AUTHORITY_SUBJECT_BINDING.md) | `NOT_APPLICABLE` |
| 2 | ROLE | 인접 = 권한 축 2벌 — `$roleRank`(HTTP 메서드 판정·기계 api_key 등급·`index.php:554,:568`)·`team_role`(owner>manager>member) — **양방향 매핑 0·완전 직교**(ⓑ §4.2). 결속 대상 role 축은 있으나 승인권한 결속 아님 | `LEGACY_ADAPTER` |
| 3 | POSITION | 🔴 직급(position) 엔티티 0 — 조직 직위 개념 부재(ⓑ §3) | `ABSENT` |
| 4 | ORGANIZATION | 조직 단위 Authority 결속 부재 · `seedOrg`(`TeamPermissions.php:708-717`)는 role 시드이지 조직 스코프 승인 결속 아님(ⓑ §3) | `NOT_APPLICABLE` |
| 5 | LEGAL_ENTITY | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §4) — 법인 결속 대상 부재 | `NOT_APPLICABLE` |
| 6 | GEOGRAPHY | 지리 축 = `Geo`(IP→ISO→언어)·TikTok country_code 차원 — **Authority 지리 결속 아님·도메인 상이**(Registry §5 필드 13과 동일) | `NOT_APPLICABLE` |
| 7 | RESOURCE | 인접 = `acl_permission` scopeSql 데이터-행 필터(`TeamPermissions.php:286`) — 데이터 필터이지 Authority 리소스 결속 아님(장식·ⓑ §4.2) | `NOT_APPLICABLE` |
| 8 | ACTION | 인접 = `acl_permission` ACTIONS(`approve` 포함·`:39`) 그러나 **`approve` 비트를 읽어 승인 가부를 판정하는 핸들러 0**(ⓑ §4.2) — 행위 결속 아님 | `NOT_APPLICABLE` |
| 9 | JOB_LEVEL | 🔴 직급 레벨(job level) 엔티티 0(ⓑ §3) | `ABSENT` |
| 10 | EXECUTIVE_LEVEL | 🔴 임원 레벨(executive) 엔티티 0(ⓑ §3) | `ABSENT` |
| 11 | MANAGER_TYPE | 🔴 **Manager Resolver ABSENT** — 상급자(사람) 반환 함수 0·다홉 사람계층 walk 0·`parent_user_id` write 시 최상위 owner 하드고정(`createTeamMember:1226`·`provisionUser:502`·`createSubAdmin:1549`·ⓑ §3) | `ABSENT` |
| 12 | OWNER_TYPE | 인접 실재 = `parent_user_id IS NULL OR team_role='owner'` owner 판별(`AdAdapters.php:45`·ⓑ §3) — 소유자 유형 판독 **유일 실재 결속 축**(단 승인 워크플로 미배선) | `LEGACY_ADAPTER` |
| 13 | FUNCTIONAL_DOMAIN | 기능 도메인(직무 영역) 결속 부재 — `team_role`은 계정 위계이지 직무 도메인 아님(ⓑ §4.2) | `NOT_APPLICABLE` |
| 14 | HYBRID | 부재 — 복합 결속 결합 규칙 0(선행 결속 축 부재로 결합 대상 없음) | `NOT_APPLICABLE` |
| 15 | CUSTOM | 부재 | `NOT_APPLICABLE` |

**실측 개수: 15 / 15 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 2(2·12) · `KEEP_SEPARATE_WITH_REASON` 0 · `BLOCKED_CROSS_TENANT` 0 · `ABSENT` 4(3·9·10·11) · `NOT_APPLICABLE` 9(1·4·5·6·7·8·13·14·15).

> 🔴 **커버 0.** Authority Binding 엔티티가 통째로 부재하므로 어떤 Binding Type 도 `VALIDATED_LEGACY` 가 아니다. ROLE·OWNER_TYPE 의 `LEGACY_ADAPTER` 는 **직교한 2벌 권한 등급 / owner 판별** 인접일 뿐 결속 커버가 아니다. POSITION·JOB_LEVEL·EXECUTIVE_LEVEL·MANAGER_TYPE 4종은 인적 계층·직급 엔티티 부재로 `ABSENT`(🔴 storage 부재). 나머지 9종은 결속 대상 축 자체가 승인 도메인과 상이하거나 부재해 `NOT_APPLICABLE`.

## 2. 규칙

- 🔴 **`parent_user_id` 를 MANAGER_TYPE 결속 축으로 재해석 금지** — 25개소가 owner 판별·1홉 tenant 상속·team_role 파생에 의존하며, 의미를 "상급자 사람 계층"으로 바꾸면 tenant 해석이 전역 붕괴한다(ⓑ §3). MANAGER_TYPE 은 **별도 reporting-line 엔티티 신설**로 도입하라(재사용 금지). ADR = [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md).
- 🔴 **ROLE 결속을 `$roleRank` 로 채우지 마라** — `$roleRank`는 판정축이 HTTP 메서드인 **기계 신원(api_key) API 등급**이고 `team_role`과 매핑이 0이다(ⓑ §4.2). 세션토큰(app_user) 경로는 api_key 미들웨어를 미경유해 `auth_role` 자체가 미설정이다. ROLE 결속은 두 축의 **권위 매핑 선결** 없이 도입 불가.
- 🔴 **OWNER_TYPE 만 실재라고 커버로 격상 금지** — owner 판별은 실재하나 **승인 워크플로에 배선돼 있지 않다**(승인자 = 진입 게이트 통과자). OWNER_TYPE 은 판별기를 참조하되 승인권한 결속으로 신규 배선하라(재구현 아닌 확장).
- 🔴 **Binding Type 15종을 ENUM 하드코딩하지 마라** — `pm_audit_log.entity_type` ENUM 이 신규 타입 INSERT 예외를 낸 선례(5-3-3-1 §8)를 반복하지 말고 확장 가능 카탈로그로. POSITION/JOB_LEVEL/EXECUTIVE_LEVEL 은 직급 엔티티 신설이 선행 조건이므로, 엔티티 없이 결속 타입만 열거하면 `binding_type='POSITION'`이 참조 무결성 없는 죽은 값이 된다.
