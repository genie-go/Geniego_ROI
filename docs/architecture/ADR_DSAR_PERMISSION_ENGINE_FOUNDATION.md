# ADR — Permission Engine Foundation Governance (EPIC 06-A-03-02-03-04 Part 2)

- **상태**: Accepted (설계 정본 · 코드 변경 0 · NOT_CERTIFIED · 실 엔진은 선행 Decision Core 신설 + 후속 enforcement Part 후 별도 승인세션 RP-002)
- **차수**: 289차 후속 회차 (2026-07-19)
- **스펙**: EPIC 06-A-03-02-03-04 Part 2 — Permission Engine Foundation Governance (사용자 제공 verbatim)
- **선행 블록(Part 1)**: [`ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION`](ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION.md) — Canonical Authorization Registry/Policy/Definition/Decision/Snapshot/Evidence 확장포인트·Canonical Interface(코드 0)
- **선행 블록**: [`ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING`](ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING.md)(03-03) · [`ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION`](ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION.md)(03-02)
- **관련 메모리**: [[project_n289_post_writeguard_server_enforcement]] · [[project_n231_team_permission_rbac]] · [[project_n183_phase3_team_rbac]]

---

## 1. 맥락 (Context)

EPIC 06-A-03-02-03-04의 **Part 2 — Permission Engine Foundation**. Part 1(Authorization Registry Foundation) 위에서, 플랫폼 전체의 Permission을 **단순 문자열·역할명·Boolean·버튼 표시 여부가 아닌 Canonical·Versioned·Scoped·Composable·Auditable Permission Model**로 정형화한다. 이후 P3 RBAC·P4 ABAC·P5 Approval Authority·P6 SoD·P8 Dual-Control이 재사용할 Permission Contract를 세운다. 이번 Part는 **확장 포인트·Canonical Interface·설계 명세만**(코드 0).

★**이 블록도 실 permission substrate가 실재**한다. 능력 기반 전수조사(ⓑ·GROUND_TRUTH·코드 정독·grep 검증):

- **★가장 Permission Model에 근접 = `TeamPermissions.php`** — `team`·`acl_permission`(subject_type[team/user]×`menu_key`×`actions`[8동작 view/create/update/delete/approve/export/…]·UNIQUE `uq_acl`·`:152-171,206-216,325-336`)·`data_scope`(scope_type[own/…]×scope_values 행필터·`:160-171,218-322`·DENY_SCOPE `:234`). ★단 Permission 식별자가 **`menu_key`(UI 메뉴 지향)** 이지 `{DOMAIN}:{RESOURCE}:{ACTION}` Canonical Code가 아님. 위임상한 fail-closed(`:615-647`).
- **★중앙 RBAC 게이트(PEP) = `index.php:553-603`** — roleRank(viewer<connector<analyst<admin)·scope(`write:*`/`write:ingest`/`admin:keys`) write 게이트·tenant 강제주입(Cross-tenant 격리 정본). api_key 프로그래매틱 Permission.
- **★api_key scopes = `Keys.php:191,204`·`UserAuth.php:4307`** — `read:*`·`write:*`·`write:ingest`·`write:attribution`·`write:mta`·`admin:keys`. Wildcard 실재하나 **api_key(analyst/admin) 프로그래매틱 접근에 한정**(일반 사용자 UI 부여 아님 → §6.8 "제한된 범위 wildcard"에 부합).
- **★plan/feature 게이트 = `PlanPolicy.php`(FEATURE_MIN_PLAN·RANK)·`UserAuth::requireFeaturePlan/requirePlan`·FE `planMenuPolicy.js`** — 요금제 기반 기능 접근(Permission이 아니라 상용 게이트·직교 축).
- **★team_role 게이트 = `UserAuth`(requireTeamWrite/guardTeamWrite/teamCanWrite·owner/manager/member·TEAM_OWNER_ONLY)** — 이번 289차 세션에 서버 전역 배선 완료(§3 참조).
- **★admin 판정 SSOT = `UserAuth::resolveAdminByToken`** — 이번 세션에 4개소 위임 통합(§3).
- **★진짜 부재(순신규)** — Permission Registry·Definition·Definition Version·Namespace·Canonical Code(`{DOMAIN}:{RESOURCE}:{ACTION}`)·Permission Version화·Grant/Grant Version·Explicit Deny Entity·Precedence/Combining Strategy·Effective Permission Set/Deny Set(계산은 `effectiveForUser`로 존재하나 **미영속·미캐시**)·Scope Intersection/Expansion Guard·Hierarchy/Graph/Group/Bundle·Permission Snapshot/Evidence/Digest·Permission Binding(Decision 결합)·Drift/Revalidation/Reconciliation/Simulation/Migration Foundation. Field/API-OperationID/Amount·Currency/Time Scope 정형모델도 부재.
- **★actions 8종(`view/create/update/delete/approve/export/execute/manage`·manage=superset)·MENU_CATALOG 26메뉴 서버 SSOT(`TeamPermissions.php:39,55-82`)** — Permission vocabulary의 최근접이나 team-menu 도메인 한정.
- **★ABAC data_scope는 실제 enforce되나 ~57핸들러 중 4곳만 소비**(Catalog/OrderHub/Wms/AdPerformance·`scopeSql/effectiveScope :236-322`) → 나머지 mutating 표면은 row-scope 미적용(넓은 미필터 ABAC 표면 = enforcement gap).
- **★3개 분리 rank/vocab 체계 공존·통합 resolver 부재**: plan `PlanPolicy::RANK`(`:19`, 상용 게이트) · api_key `roleRank`(`index.php:573`, 프로그래매틱) · team_role owner/manager/member(위임). 서로 무관한 3 스케일 → Permission Resolution 단일화 대상(§93).
- **★Evidence PARTIAL**: `auth_audit_log`(SSOT)는 permission **변경**(team_permissions_set 등)만 기록 · **per-request authz 결정/거부(deny at gate)는 미감사**. `team_member` 테이블 부재(membership=`app_user.team_id` 컬럼). Deny도 PARTIAL(first-class deny row 부재·`1=0` 센티넬+grant 부재로 표현).

## 2. 결정 (Decision)

### D-1. Canonical Permission Contract를 **신설**하되 실존 primitive를 확장(Golden Rule) — "발명이 아니라 조립". 중복 Permission Registry/Resolver/Group/Bundle/Effective-Set 신설 금지.

| 실존 | §92 분류 태그 | 확장 결정 |
|---|---|---|
| **`TeamPermissions` acl_permission(menu×action)** | **CANONICAL_PERMISSION_SCOPE_CANDIDATE(확장·정형화)** | Permission Scope/Action의 최근접 substrate. 단 `menu_key`→Canonical `{DOMAIN}:{RESOURCE}:{ACTION}` Code로 정규화 매핑 필요(Legacy Permission Mapping). Registry/Definition/Version 상위 신설. |
| **`TeamPermissions` data_scope(행필터)** | **ROW/DATA_SCOPE_CANDIDATE(확장)** | Row Permission Scope substrate. Raw scope_values→Canonical Filter AST 정형화(§23). |
| **`index.php` 중앙 RBAC + api_key scopes** | **CANONICAL(확장·PEP)** | roleRank/scope/write/tenant 강제=Runtime Guard(PEP) 정본. Wildcard(`write:*`)=제한범위(api_key)로 §6.8 부합·일반부여 금지 유지. |
| **`PlanPolicy`/requireFeaturePlan** | **KEEP_SEPARATE_WITH_REASON** | plan은 Permission이 아님(상용 게이트·직교). §6.2 원칙대로 Permission과 혼용 금지·연결 Contract만. |
| **`resolveAdminByToken`(admin SSOT)** | **CANONICAL(확장)** | admin 판정 단일화(이번 세션 P4). Permission Resolution의 admin bypass 정본. |
| SSO group→role(`EnterpriseAuth`) | **VALIDATED_IAM** | 외부 IdP 롤→Permission 매핑 확장점(Part 3 연계). |

### D-2. **Part 1 D-2 위험 4건 = 이번 289차 세션에 해소됨 (재플래그 금지)**

Part 1 ADR §D-2가 후속 enforcement Part 대상으로 등재한 4건은 본 289차 후속 세션(P1~P4)에 **실제 수정·운영/데모 배포·라이브 검증·커밋(c1646bc/0f6ba6d)** 되었다. Part 2에서 결함으로 재플래그하지 않는다:

1. **FE `writeGuard.js` UI-only** → **해소**: `UserAuth::guardTeamWrite` + `index.php` 중앙 미들웨어로 서버 전역 배선(member 읽기전용 mutating 직접 API 우회 봉인). Part 1이 "Part 9 enforcement"로 예고한 것을 조기 실현.
2. **`requireFeaturePlan` 3중 fail-open** → **해소**: 미해석 plan을 최저등급('free') 간주 fail-secure 전환(수익누수 봉인). 가드 크래시 catch만 가용성 위해 fail-open 유지(구매고객 보호).
3. **`admin_roles`/`user_roles` DORMANT** → **해소(폐기)**: 어떤 인가 게이트서도 미소비되는 죽은 RBAC → BE 6라우트+6메서드+FE 역할탭 제거. 실 RBAC=TeamPermissions.
4. **중복 유틸 SSOT 부재(isAdmin 4·requireAdmin 3)** → **해소**: `resolveAdminByToken` Canonical SSOT 신설·4개소 위임. SystemMetrics 드리프트(plans/is_active 누락) 정정.

★부수로 P5(세션 토큰 at-rest 해시·dual-read→hash-only·운영/데모 마이그레이션·replay 차단 라이브검증)까지 완료 — Actor Identity(03-03)의 세션 자격 저장 강화.

### D-3. **중대 긍정 = 정직한 "부재"** (오탐 방지)

§87/§88 "Hardcoded Permission String·Email/User-ID Permission·`isAdmin` 전권 우회"는 **해당 없음** — admin 판정 전부 DB plan/plans/admin_level 기반, 소스 리터럴 authz 부재(레포 전무·재확인). `FULL_ACCESS`/`MANAGE_ALL` 문자열 부재. `SUPER_ADMIN`은 `AdminMenu` role enum(`admin`/`super_admin`/`moderator`)일 뿐 일반 사용자 wildcard grant 아님. Wildcard `write:*`/`read:*`는 api_key 프로그래매틱 RBAC 한정(§6.8 부합). 부재/기수정을 결함으로 날조하지 않는다.

### D-4. **구현 판정 = 대부분 ABSENT/PARTIAL-substrate/BLOCKED_PREREQUISITE**

- Permission 선언체(Registry/Definition/Version/Namespace/Canonical Code)·Grant 버전화·Explicit Deny Entity·Resolution Pipeline+Precedence+Combining·Effective Allow/Deny Set·Scope Intersection/Expansion Guard·Hierarchy/Group/Bundle·Snapshot/Evidence/Digest·Decision Binding·Cache(version-aware)·Drift/Revalidation/Simulation/Migration = **순신규**.
- 선행 Part 1의 Authorization Decision/Snapshot/Evidence/Ledger 실 저장체 + §3.2 Decision Core가 아직 설계(코드 0)라, Permission Binding·Commit-time Revalidation의 상위 결합은 일부 공회전(BLOCKED_PREREQUISITE).
- ★단 실 substrate(TeamPermissions acl/data_scope·index.php RBAC·api_key scopes·admin SSOT) 실재로, 실 엔진은 "흩어진 menu_key×action·data_scope·role/scope 규칙을 Canonical Permission Registry/Definition/Scope/Grant로 데이터화 + Part1 Decision 결합" **조립**. 이번 차수=설계 명세(코드 0).

### D-5. Permission ≠ Role ≠ Authority · UI ≠ Server Enforcement · Default Deny (§6.1·6.2·6.9·구현 시 강제)

- Permission Definition과 Role Definition을 동일 Entity로 만들지 않음(Part 3 RBAC가 Permission을 묶어 Subject에 부여·Adapter Contract만 제공).
- `APPROVE_PAYMENT` Permission ≠ 금액 승인 권한(Part 5 Approval Authority가 금액/통화/법인/조직 한도 검증·연결 Contract만).
- UI Permission(writeGuard/menu 가시성/planMenuPolicy)=`UI_HINT_ONLY`·Server-side 재검증 필수(§6.9·이번 세션 writeGuard 서버배선으로 실증).
- Default Deny·Explicit Deny 우선·Scope Intersection(권한 확장 금지)·Wildcard 제한.

### D-6. Mandatory Control 고객설정 비활성 불가(§6.16)

Tenant Isolation·Default Deny·Explicit Deny·Canonical Code·Permission Version·Scope Validation·Grant Evidence·Revocation/Expiration Enforcement·Server-side Enforcement·Permission Snapshot·Audit·Cache Invalidation·Wildcard Restriction.

## 3. Canonical Interface / 확장 포인트 (코드 0 · Part 3+ 재사용)

- **Permission Registry/Definition/Version**: `acl_permission.menu_key`+`actions`를 Definition의 (resource,action) substrate로 흡수하되 Canonical Code `{DOMAIN}:{RESOURCE}:{ACTION}`로 정규화(Legacy Mapping·confidence 기록). Definition Version은 In-place Update 금지.
- **Permission Scope**: `data_scope`(row)·tenant_id(모든 grant 귀속)·team subject → Tenant/LegalEntity/Org/Resource/Field/Row/Data/API/UI/Client/Amount/Currency/Time Scope 정형모델. Scope 결합=Intersection(Expansion Guard).
- **Grant/Deny**: acl_permission row=Grant substrate(Direct/Group). Grant Version화·Source Chain·Explicit Deny Entity(Allow보다 우선)·Temporary/Emergency Expiration 신설.
- **Resolution/Effective Set**: index.php RBAC(PEP) + TeamPermissions.can()→Effective Allow/Deny Set·Precedence(Deny overrides·MostSpecific)·Combining Strategy(versioned).
- **Binding/Snapshot/Evidence**: Part 1 Authorization Decision/Snapshot/Evidence/Digest에 Permission Resolution Result 결합(Decision Core 신설 후).
- **Adapter Contract(Part 3 RBAC)**: Role→Permission 참조 Adapter만 제공(Role Registry 상세는 Part 3).

## 4. 대안 (Considered)

- **A. 지금 Permission Engine(146 Entity/테이블·Resolver·Cache) 구현** — 기각. 결합할 불변 Decision Record·Canonical Action/Resource Version Registry 부재·RP-002 위반·중복 엔진 리스크.
- **B. TeamPermissions acl_permission을 그대로 Permission Registry로 승격** — 부분 채택(확장 substrate·D-1). 단 menu_key≠Canonical Code·Version/Deny-Entity/Combining/Snapshot 미달로 직접 승격 금지·정형화 필요.
- **C. 설계 명세만(코드 0)+실존 substrate 조립계획+Gap 등재+선행 전제 명문화** — **채택**. 06-A 계열 일관·Part 1 동형.

## 5. 귀결 (Consequences)

- (+) TeamPermissions acl_permission(menu×action)+data_scope(row)·index.php RBAC(PEP)·api_key scopes·admin SSOT·plan 게이트의 확장 substrate 지위·Canonical 정규화 경로 확정("발명 아닌 조립").
- (+) Part 1 D-2 위험 4건 **실제 해소**(이번 세션 P1~P4 배포) 문서화 — enforcement가 설계에 앞서 실현된 드문 사례.
- (+) 정직 판정(하드코딩 permission/email authz 부재·FULL_ACCESS/MANAGE_ALL 부재·wildcard는 api_key 한정) — 오탐/날조 방지.
- (+) Permission ≠ Role ≠ Authority 3분리 원칙·Default/Explicit Deny·Scope Intersection·UI-hint-only·Grant Evidence·Snapshot 불변·Cross-tenant 격리 설계 정본 확보.
- (+) Part 3 RBAC가 재사용할 Permission Contract/Adapter 준비.
- (−) 이번 차수 런타임 기능 증가 0(설계).
- (→) 다음: **Part 3 RBAC Governance**. 실 Permission Engine=선행 Decision Core 신설 + Canonical Action/Resource Registry + 별도 승인세션(RP-002).

## 6. 규율 준수

Golden Rule(Extend not Replace·중복 Permission Registry/Resolver/Group/Bundle/Effective-Set 금지) · 무후퇴 · "결론의 근거도 재실증"(TeamPermissions acl/data_scope·index.php RBAC·api_key scopes·admin SSOT·wildcard 범위·부재 전부 grep/코드 정독으로 확정) · Permission≠Role≠Authority · Mandatory Control 무력화 금지 · 코드 변경 0(설계) · NOT_CERTIFIED · BLOCKED_PREREQUISITE · RP-002 · DORMANT 오계상 금지 · 기수정(P1~P4) 재플래그 금지 · GROUND_TRUTH 외 인용 금지.
