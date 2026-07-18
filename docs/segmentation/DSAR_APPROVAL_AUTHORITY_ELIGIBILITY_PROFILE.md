# DSAR — Authority Eligibility Profile (§45)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §45(1880-1911) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §3·§5·§7 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)

## 0. 현행 실측 (file:line)

★**§45 는 "이 행위자가 승인 자격이 있는가"를 판독할 프로파일이다. 그 판독의 정본 축 자체가 레포에 없다**(ⓑ §3 결론). 현행 4승인경로의 "승인자"는 전부 **진입 게이트 통과자**(analyst+ / requirePro / requirePlan('admin'))이지 자격자 후보가 아니다.

| 축 | 현행 실측 | 판정 |
|---|---|---|
| 승인 "자격" 판독 정본 축 | 🔴 **부재** — `roleRank`(`index.php:554` 쓰기게이트·판정축이 HTTP 메서드 `:568`) · `requirePro`(플랜) · `acl_permission.approve`(장식 — approve 비트로 승인 가부 판정하는 핸들러 **0**·ⓑ §3) | `BLOCKED_PREREQUISITE` |
| Manager Resolver | 🔴 **ABSENT** — 상급자(사람)를 반환하는 함수 0·다홉 사람계층 walk 0(ⓑ §3 · `parent_user_id` 25개소 전량 owner/tenant상속/team_role 파생) | `ABSENT` |
| owner relationship | `parent_user_id IS NULL` owner 판별(ⓑ §3) — 소유자 개념은 실재하나 authority 적격 판정 아님 | `LEGACY_ADAPTER` |
| self approval | `Mapping.php:268` 자기승인 차단 — **유일 방어**(나머지 3경로 catalog/action_request/admin_growth 미방어·ⓑ §2·§8) | `LEGACY_ADAPTER`(부분) |
| required tenant | `index.php:600` 무조건 `X-Tenant-Id` 덮어쓰기 REAL · 🔴 strict fail-closed 기본 OFF(`:585` 옵트인·ⓑ §7) | `LEGACY_ADAPTER` |
| evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·`hash_equals`+prev 교차·ⓑ §5) · 🔴 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |
| HR/직급/고용 엔티티 | 🔴 `employment_state`·`position_state`·`job_level`·`executive_level` grep **0**(ⓑ §3 · 5-3-3-2 Manager Eligibility Profile 실증) · `admin_level`≠job level·`grade` 45+건 무관 | `ABSENT` |

★**Eligibility Profile 엔티티가 통째로 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **원문 26종**(§45 필수 필드 26 · 측정기 `--sec=45` = 26)

| # | 원문 항목명 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | authority_eligibility_profile_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | allowed subject types | 🔴 authority subject-type 분류 부재 · 인접 = `api_key`(기계신원 API등급 `index.php:554`) vs `app_user`(세션·미들웨어 미경유) 양축 완전 직교(ⓑ §3) — 적격 subject 분류 아님 | `ABSENT` |
| 3 | required identity state | 인접 = `is_active TINYINT DEFAULT 1`(`Db.php:1106`) 계정 상태 · 🔴 **계정 상태이지 authority 적격 판독에 소비 안 됨**(5-3-3-2 §36 실증) | `LEGACY_ADAPTER` |
| 4 | required employment state | 🔴 `employment_state`/`employment_status` grep **0** — 고용 상태 축 전역 0(ⓑ §3) | `ABSENT` |
| 5 | required position state | 🔴 `position_state` grep **0** — Position 축 전역 0(ⓑ §3) | `ABSENT` |
| 6 | required role state | 🔴 정본 자격 판독 축 부재 — `roleRank`(기계 API등급·HTTP 메서드 판정 `index.php:554`,`:568`)와 `team_role`(owner>manager>member) **양방향 매핑 0**·완전 직교(ⓑ §3) | `BLOCKED_PREREQUISITE` |
| 7 | required tenant | `index.php:600` `X-Tenant-Id` 강제 덮어쓰기 REAL · 🔴 strict fail-closed 기본 OFF(`:585` `GENIE_STRICT_AUTH==='1'` 옵트인·ⓑ §7) | `LEGACY_ADAPTER` |
| 8 | legal entity policy | 🔴 Legal Entity 엔티티 0 — `biz_no`/`corp_reg`/`tax_id` grep 0(ⓑ Registry §12) | `ABSENT` |
| 9 | organization policy | 🔴 조직(Organization) 엔티티 실코드 0 — 스코프 단위는 tenant뿐(DSAR Organization Hierarchy 문서군은 신설 명세) | `ABSENT` |
| 10 | geographic policy | 지리 축 = `Geo`(IP→ISO→언어)·TikTok country_code 차원 — **Authority 지리 스코프 아님**(ⓑ Registry §13) | `KEEP_SEPARATE_WITH_REASON` |
| 11 | minimum job level | 🔴 `job_level` grep **0** · `admin_level`(master\|sub `UserAuth.php:171`)≠Job Level = 콘솔 특권(5-3-3-2 §36) | `ABSENT` |
| 12 | minimum executive level | 🔴 `executive_level` grep **0** · `grade` 45+건 전량 무관(고객등급·리드등급·모델품질·5-3-3-2 §36) | `ABSENT` |
| 13 | manager relationship requirement | 🔴 **Manager Resolver ABSENT** — 상급자(사람) 반환 함수 0·다홉 walk 0(ⓑ §3) | `ABSENT` |
| 14 | owner relationship requirement | 인접 = `parent_user_id IS NULL` owner 판별(ⓑ §3) — 소유자 개념 실재·authority 적격 판독 아님 | `LEGACY_ADAPTER` |
| 15 | required certifications reference | 🔴 certification/자격증 참조 축 grep 0 — 개념 전역 부재 | `ABSENT` |
| 16 | security suspension policy | 인접 = `login_attempt.locked_until`(브루트포스 로그인 스로틀 잠금·`UserAuth.php:3335`,`:3370`) — 🔴 **접속 스로틀 잠금이지 authority security-suspension 상태 아님**(5-3-3-2 §36 "Suspension 개념 전역 0"과 정합) | `LEGACY_ADAPTER` |
| 17 | leave policy | 🔴 `leave_state`/`on_leave`/`out_of_office` grep **0**(5-3-3-2 §36) | `ABSENT` |
| 18 | termination policy | 🔴 `termination_policy`/`terminated` grep **0** — 종료 사유·시각·이력 컬럼 0(5-3-3-2 §36) | `ABSENT` |
| 19 | self approval policy | `Mapping.php:268` 자기승인 차단 — 🔴 **유일 방어**(catalog/action_request/admin_growth 3경로 미방어·ⓑ §2·§8) | `LEGACY_ADAPTER` |
| 20 | conflict of interest hook | 🔴 `conflict_of_interest` grep **0**(60+ "conflict" 히트는 전부 SQL `ON CONFLICT`/ad_schedule precedence·ⓑ §6) — Hook 개념 부재 | `ABSENT` |
| 21 | SoD hook | 🔴 Segregation-of-Duties 축 grep 0 — 이해충돌·직무분리 Hook 개념 부재(ⓑ §6) | `ABSENT` |
| 22 | delegation eligibility reference | 인접 = `acl_permission` 위임 상한 자기정합(`TeamPermissions.php:645` `DELEGATION_EXCEEDED`·데이터 접근범위 delegation `:16`) — 🔴 authority delegation eligibility 아님(권한 비트 상속 상한) | `LEGACY_ADAPTER` |
| 23 | valid_from | 인접 = `kr_fee_rule.effective_from`(open-interval·수수료/VAT 도메인·`Db.php:898`·ⓑ §5) — 승인/권한 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 24 | valid_to | 🔴 `valid_to`/`effective_to` grep **0**(오탐 `Onsite.php:396` invalid_token 제외·ⓑ §5) → 폐구간 신규 | `ABSENT` |
| 25 | status | 인접 = 상태전이 다수이나 🔴 **합법 전이집합 선언 0**(전 도메인·ⓑ Registry §21) | `LEGACY_ADAPTER` |
| 26 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·`hash_equals`+prev 교차·ⓑ §5) · 🔴 `menu_audit_log.hash_chain` 인용 금지 | `LEGACY_ADAPTER` |

**실측 개수: 26 / 26 전사** (측정기 `--sec=45` = 26).
커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 9 · `BLOCKED_PREREQUISITE` 1 · `KEEP_SEPARATE_WITH_REASON` 1 · `ABSENT` 12 · `NOT_APPLICABLE` 1.

> 🔴 **커버 0.** Eligibility Profile 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 9건은 **확장 대상 인접 자산**(tenant=`index.php:600` 강제·evidence=`SecurityAudit::verify()`·valid_from=`kr_fee_rule.effective_from`·self approval=`Mapping:268`·owner=`parent_user_id` 등)이지 커버가 아니다. `required role state` 는 상위 자격축(§6) 부재로 `BLOCKED_PREREQUISITE`.

## 2. 규칙

- 🔴 **Eligibility Profile 은 신설이나, 하위 필드의 인접 선례를 재구현하지 마라** — evidence=`SecurityAudit::verify()` 확장 · self approval=`Mapping.php:268` 방어를 **3경로로 승격**(신규 차단기 난립 금지) · tenant=`index.php:600` 강제 참조 · valid_from=`kr_fee_rule.effective_from` 질의계층 확장. **중복 엔진 금지.**
- 🔴 **`required role state` 를 "roleRank 있음"으로 표기 금지**(`BLOCKED_PREREQUISITE`) — `roleRank`(기계 api_key API등급)와 `team_role`(사람 조직역할)이 완전 직교하고 세션토큰 경로는 `auth_role` 미설정이다(ⓑ §3). 자격 판독 정본 축을 선결하지 않으면 §46 기본 자격이 성립하지 않는다.
- 🔴 **`employment/position/job_level/executive_level/leave/termination/certification/SoD/conflict of interest` 를 "있음"으로 표기 금지**(전부 `ABSENT`) — HR·직급·고용상태 엔티티가 저장계층부터 0이다(5-3-3-2 §36 실증). `admin_level`·`grade`·`is_active` 를 이 축으로 오용하면 §65 "Manager 자동 Authority"·"Role 이름 문자열 판정" gap 을 구조적으로 유발한다.
- 🔴 **`security suspension policy` 를 `login_attempt.locked_until` 로 충족했다고 오표기 금지** — 그것은 접속 스로틀 잠금이지 authority 정지 상태가 아니다(`LEGACY_ADAPTER` 인접일 뿐). Suspension/Termination 은 별도 상태축으로 신설.
- 🔴 **`valid_to` 를 신규(`ABSENT`)로 두되 폐구간 dating 을 새 상수/컬럼으로 임의 추가하지 마라** — `effective_from` open-interval 선례(수수료/VAT)의 질의계층을 확장해 폐구간을 표현하라(ⓑ §5·균질화 금지: 환율은 저장계층부터 부재, 세율은 질의계층만 부재 — 깊이 상이).
