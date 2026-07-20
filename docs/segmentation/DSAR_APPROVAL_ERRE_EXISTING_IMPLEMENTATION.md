# DSAR — Effective Role Resolution Engine (ERRE): 실존 구현 substrate 전수조사 (Ground-Truth ①)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED.
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md`.
> 상위 ADR: `docs/architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md`.
> 본 문서는 EPIC 06-A-03-02-03-04 Part 3-7(ERRE) 설계의 반날조(anti-fabrication) 인용 **정본 허용목록**이다. 하위 per-entity DSAR은 본 문서 + Ground-Truth ② + ADR에 등장하는 `파일:라인`만 인용할 수 있다.

---

## 0. 조사 범위·방법

- 대상: `backend/src/` (Handlers·PlanPolicy) + `backend/public/index.php`. 읽기 전용·코드 무변경.
- 중복 미러 디렉토리(`_be_*/`, `clean_src/`)는 스코프 외 배제.
- 모든 라인 번호는 실측(Explore 스레드 A·24 tool-use).

## 1. 핵심 판정 요약

**ERRE는 green-field(대부분 순신규)이나, effective 계산의 실존 substrate 1종이 중추로 존재하는 PARTIAL 형태다.**

- **중추 substrate**: `TeamPermissions::effectiveForUser`(팀 RBAC/ABAC 라이브 재계산) — effective role/permission/scope를 request-time에 산출하는 유일한 통합 generator(단, **팀 도메인 한정**).
- **통합 PDP 부재**: plan rank·api_key roleRank·team_role 세 rank 체계가 **직교(orthogonal) 병렬**로 산재 — 이를 하나의 canonical decision으로 통합하는 Policy Decision Point는 실존하지 않음.
- **거버넌스 계층 전무**: Pipeline/Graph/Snapshot/Digest/Cache/Drift/Revalidation/Reconciliation/Simulation/Explain은 Ground-Truth ②에서 판정(대부분 ABSENT).

## 2. 실존 substrate 카탈로그

### A. `TeamPermissions.php` — 팀 RBAC/ABAC (effective kernel 중추, 라이브 재계산)

| 파일:라인 | 설명 | resolution kernel 매핑 | 상태 |
|---|---|---|---|
| `backend/src/Handlers/TeamPermissions.php:39` | `ACTIONS` 8동작 상수(view..manage), manage=슈퍼셋 | Permission Projection (vocabulary) | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:41` | `DATA_SCOPES` 9차원 상수(company..own) | Scope Projection (vocabulary) | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:120` | `roleOf()` — team_role 정규화. fail-closed: `parent_user_id` 키존재+빈값→owner, 키부재→member 강등 | Subject Resolution | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:132` | `isAdmin()` — plan/plans==='admin' god flag | Subject Resolution | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:134` | `isOwnerAdmin()` — admin OR roleOf==owner | Subject Resolution | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:136` | `isManagerAdmin()` — admin OR role∈{owner,manager} | Subject Resolution | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:182` | `normActions()` — 입력→ACTIONS 부분집합 정렬, 비어있지 않으면 view 자동포함(canonical ordering + dedupe) | Permission Projection / dedupe·ordering | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:194` | `actionsCover()` — manage 슈퍼셋 판정 | Permission Projection | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:202` | `subjectPerms()` — acl_permission 행 조회 → menu_key⇒actions[] 맵(DB 읽기·request-time) | Assignment Collection | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:215` | `subjectScope()` — data_scope 행 조회 → {scope_type, values[]} | Assignment Collection (scope) | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:234` | `DENY_SCOPE` 센티넬 `__deny__` — 명시적 거부 | Deny Projection | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:236` | `effectiveScope()` — 요청자 실효 데이터범위 라이브 산출. owner/admin→null(무제한), 비-owner 실패→DENY_SCOPE(fail-closed), user 우선→team 상속 | Scope/Deny/Effective Generation | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:272` | `scopeValuesFor()` — 특정 차원 허용값. `__deny__`→[], 타차원→null | Scope Projection | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:286` | `scopeSql()` — 차원값→SQL IN절, deny→`AND 1=0` | Scope Projection (enforcement) | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:299` | `scopeSqlNamed()` — named-param 변형 | Scope Projection | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:315` | `scopeChannelProduct()` — channel/product/brand 다차원 동시강제 | Scope Projection | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:325` | `replacePerms()` — acl_permission 전체교체 DELETE→INSERT | Assignment 영속화 | PRESENT (persist) |
| `backend/src/Handlers/TeamPermissions.php:337` | `replaceScope()` — data_scope DELETE→INSERT 영속 | Scope 영속화 | PRESENT (persist) |
| `backend/src/Handlers/TeamPermissions.php:356` | `scopeWithinCap()` — manager scope 위임상한 검증(동일 scope_type+values 부분집합만, 교차차원·무제한·전사=fail-closed) | Conflict Detection / Scope cap | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:381` | `assignableMap()` — 위임 상한: owner/admin→null, manager→팀권한맵, member→[] | Assignment Collection (cap) | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:393` | **`effectiveForUser()`** — 핵심 effective 산출. owner/admin→full, manager→팀권한, member→명시권한을 팀상한과 교집합 clamp + scope 상속(member→team→own) | **Effective Generation (kernel 중추)** | PRESENT (live recompute) |
| `backend/src/Handlers/TeamPermissions.php:423` | `clampActions()` — want∩cap 교집합(cap manage면 전체 허용) | Conflict Detection / intersection | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:641` | `putMemberPermissions()` — manager 위임 시 assignable 초과 검증(→403 `DELEGATION_EXCEEDED`) + clamp + scopeWithinCap | Conflict Detection / Assignment write | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:694` | `effectivePermissions()` GET `/auth/team/effective-permissions` — effectiveForUser 라이브 반환 | Effective Generation (진입점, 팀 한정) | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:809` | `reclampTeamMembers()` — 팀권한 축소 시 멤버 권한 재클램프(영속 재계산) | Conflict Detection / re-projection | PRESENT (persist) |

### B. `backend/public/index.php` — api_key RBAC 미들웨어 (라이브, api_key 차원)

| 파일:라인 | 설명 | kernel 매핑 | 상태 |
|---|---|---|---|
| `backend/public/index.php:573` | `$roleRank = ['viewer'=>0,'connector'=>1,'analyst'=>2,'admin'=>3]` | Subject Resolution (rank) | PRESENT |
| `backend/public/index.php:575` | role/rank/scopes_json 로드 | Assignment Collection | PRESENT |
| `backend/public/index.php:583` | `/v421/keys` → admin:keys scope OR rank≥3 아니면 403 | Permission Projection | PRESENT |
| `backend/public/index.php:587` | write 메서드: write:* 없으면 → ingest는 write:ingest OR rank≥1, 그외 rank≥2 아니면 403 | Permission Projection | PRESENT |
| `backend/public/index.php:604` | `GENIE_STRICT_AUTH=1` + 무-tenant → 403(모호성 시 deny 우선, 기본 OFF) | Deny Projection (opt-in) | PARTIAL |
| `backend/public/index.php:608` | `auth_key`/`auth_role`/`auth_tenant` 주입 + X-Tenant-Id 강제덮어쓰기(위조차단) | Effective context 주입 | PRESENT |
| `backend/public/index.php:82` | 전역 `guardTeamWrite()` 호출 — mutating 요청 라우팅 전 member 쓰기 차단, `/auth/*` 예외 | Deny Projection (team_role) | PRESENT |
| `backend/public/index.php:99` | agency `agt_` 토큰 → auth_tenant 서버바인딩 + auth_role 주입 | Subject Resolution (별도 차원) | PRESENT |
| `backend/public/index.php:423` | api_key(AI경로)·세션 토큰 → auth_tenant/auth_role(viewer) fallback 주입 | Effective context 주입 | PRESENT |

### C. `UserAuth.php` — plan 게이트 + team_role 쓰기 게이트

| 파일:라인 | 설명 | kernel 매핑 | 상태 |
|---|---|---|---|
| `backend/src/Handlers/UserAuth.php:49` | `resolveTenantPlan()` — 테넌트 owner 유효 plan 도출(만료 다운그레이드, fail-open null) | Subject Resolution (plan) | PRESENT |
| `backend/src/Handlers/UserAuth.php:77` | `requireFeaturePlan()` — PlanPolicy 위임, 미해석 plan→'free' fail-secure, admin/demo 우회 | Permission Projection (plan gate) | PRESENT |
| `backend/src/Handlers/UserAuth.php:119` | `resolveActivePlan()` — 구독만료→free 자동 다운그레이드(DB 영속) | Subject Resolution (plan lifecycle) | PRESENT |
| `backend/src/Handlers/UserAuth.php:249` | `userByToken()` — 세션→app_user, plan=`CASE admin ELSE COALESCE(plans,plan,demo)`, team_role 기본값(:316 `parent_user_id?member:owner`), 유휴 자동로그아웃 | Subject Resolution (통합 user row) | PRESENT |
| `backend/src/Handlers/UserAuth.php:364` | `requirePlan()` — **PlanPolicy::RANK 단일소스**로 userRank<minRank→403 | Permission Projection (plan rank) | PRESENT |
| `backend/src/Handlers/UserAuth.php:409` | `authedTenant()` — 인증 user 격리 tenant, admin `X-Act-As-Tenant:platform_growth` 임퍼소네이트 제한 허용, 하위계정 상속 | Scope/Subject Resolution (tenant) | PRESENT |
| `backend/src/Handlers/UserAuth.php:1117` | `TEAM_OWNER_ONLY` 상수(billing/api_keys/security_policy 등 7종) | Permission Projection (owner-only) | PRESENT |
| `backend/src/Handlers/UserAuth.php:1119` | `normTeamRole()` — 정규화, 미지정→owner(fail-open, roleOf와 반대) | Subject Resolution | PRESENT |
| `backend/src/Handlers/UserAuth.php:1125` | `teamCanWrite()` — member=false, manager=action∉TEAM_OWNER_ONLY, owner=true | Permission Projection | PRESENT |
| `backend/src/Handlers/UserAuth.php:1134` | `requireTeamWrite()` — 세션검증+team_role 쓰기게이트, admin 우회 | Deny/Permission Projection | PRESENT |
| `backend/src/Handlers/UserAuth.php:1167` | `guardTeamWrite()` — 전역 미들웨어용, member 쓰기만 403, 그외 fail-open, demo 전면우회 | Deny Projection | PRESENT |
| `backend/src/Handlers/UserAuth.php:1204` | `requireTenantSecurityWrite()` — plan 게이트와 직교하는 owner 게이트 | Permission Projection (직교) | PRESENT |
| `backend/src/Handlers/UserAuth.php:2998` | `resolveAdminByToken()` — plan/plans='admin' 세션→admin row | Subject Resolution (admin SSOT) | PRESENT |

*break-glass: 명시적 명명 함수 부재. `parent_user_id`가 `userByToken:316`·`roleOf:120`·`normTeamRole` 위계 판정 substrate.*

### D. `PlanPolicy.php` — plan rank SSOT

| 파일:라인 | 설명 | kernel 매핑 | 상태 |
|---|---|---|---|
| `backend/src/PlanPolicy.php:19` | `RANK` — free/demo=0<starter=1<growth=2<pro=3<enterprise=4<admin=5(god flag) | Subject Resolution (plan rank SSOT) | PRESENT |
| `backend/src/PlanPolicy.php:27` | `FEATURE_MIN_PLAN` — 기능키→최소플랜 게이트 맵 | Permission Projection | PRESENT |
| `backend/src/PlanPolicy.php:41` | `rank()` — 미정의→0 | Subject Resolution | PRESENT |
| `backend/src/PlanPolicy.php:47` | `minPlanFor()` — 미정의 기능 fail-secure 'pro' | Permission Projection | PRESENT |
| `backend/src/PlanPolicy.php:53` | `allows()` — rank(plan)>=rank(minPlan) | Effective Generation (plan 차원 단독) | PRESENT |

### E. `Keys.php` — api_key role/scopes 저장·검증

| 파일:라인 | 설명 | kernel 매핑 | 상태 |
|---|---|---|---|
| `backend/src/Handlers/Keys.php:88` | role 화이트리스트 검증(validRoles) | Assignment write | PRESENT |
| `backend/src/Handlers/Keys.php:99` | 클라 scopes를 `allowedScopesForRole` 상한과 교차검증, 초과→422(권한상승 차단) + `array_unique` dedupe(:102) | Conflict Detection / dedupe | PRESENT |
| `backend/src/Handlers/Keys.php:189` | `defaultScopes()` — role별 기본 scope | Permission Projection | PRESENT |
| `backend/src/Handlers/Keys.php:201` | `allowedScopesForRole()` — role별 scope 상한 | Conflict Detection (cap) | PRESENT |

### F. `AdminMenu.php` — 메뉴 가시성 effective

| 파일:라인 | 설명 | kernel 매핑 | 상태 |
|---|---|---|---|
| `backend/src/Handlers/AdminMenu.php:38` | `gate()` — admin=plan게이트+owner=is_super(:54), viewer경로=auth_role rank(:74) 이중 vocabulary | Subject Resolution + Permission Projection | PRESENT |
| `backend/src/Handlers/AdminMenu.php:323` | `getTree()` — required_role rank + is_admin_only + super_admin/moderator 특례 필터(effective 메뉴 트리) | Effective Generation (메뉴 한정) | PRESENT |

## 3. 결합/우선순위/deny/ordering 로직 실측

- **explicit deny > allow**: **PARTIAL**. 통합 "deny beats allow" 규칙 부재. 도메인별 fail-closed 센티넬로 국소 구현 — `DENY_SCOPE='__deny__'`(`TeamPermissions.php:234`)→`scopeValuesFor:272` `[]`→`scopeSql:286` `AND 1=0`(scope 차원). member 쓰기 전역 deny=`guardTeamWrite`(`UserAuth.php:1167`)+`index.php:82`. **행 단위 negative-ACL(explicit deny 레코드) 테이블·로직 부재** — acl_permission은 allow-only grant 모델.
- **scope 교집합·narrow>wide**: **PRESENT**. `clampActions()`(`TeamPermissions.php:423`)=want∩cap. `scopeWithinCap()`(:356)=요청 scope ⊆ manager scope. member→팀상한 clamp(`effectiveForUser:393`·`putMemberPermissions:641`·`reclampTeamMembers:809`). narrow(member)<wide(team)<widest(owner) 위계.
- **canonical ordering**: **PARTIAL**. `normActions()`(`TeamPermissions.php:182`)가 ACTIONS 정의순 재정렬(결정적·view 선두). cross-차원(plan/role/scope) 간 canonical evaluation ordering 부재.
- **dedupe**: **PRESENT**. `normActions`의 `$set[$a]=true` 해시(:182), `Keys.php:99` `array_unique`. 전역 dedupe 유틸 부재.
- **combine/merge 함수**: 명시적 명명 함수 **부재**. 결합은 `effectiveForUser`(:393) 내부 인라인(role분기+clamp+scope상속). `$result + ['role'=>...]`(`effectivePermissions:694`)가 유일한 merge 유사.

## 4. 3-rank 통합 resolver 판정 — 통합 PDP 부재(ABSENT)

세 rank 체계가 서로 다른 파일·차원·타이밍에 산재:

1. **plan rank** — `PlanPolicy::RANK`(0~5), `UserAuth::requirePlan`(:364)·`requireFeaturePlan`(:77). 구독 등급 게이트.
2. **api_key roleRank** — `index.php:573`(0~3) + `AdminMenu.php:74` **중복 정의**(단일소스 아님). scope 병행.
3. **team_role** — owner/manager/member. `TeamPermissions`·`UserAuth`에 산재.

**통합 부재 근거**:
- 세 차원을 한 함수 인자로 받아 단일 effective decision을 반환하는 resolver 없음.
- 세 게이트는 직교 병렬 layering: 미들웨어(api_key role)→guardTeamWrite(team_role)→핸들러 requirePlan(plan)+effectiveScope(team_role scope)가 각기 독립 통과. `requireTenantSecurityWrite`(`UserAuth.php:1204`)가 "plan 게이트와 직교" 명시 — 의도적 layering.
- `effectiveForUser`(`TeamPermissions.php:393`)가 가장 근접이나 team_role+isAdmin만 결합·plan rank/api_key roleRank/scopes 미고려 = **부분 PDP(팀 한정)**.
- api_key 경로와 세션(team_role) 경로는 상호배타적 — 한 요청에서 세 rank 동시해석 안 됨.

**결론**: request-time 라이브 재계산은 차원별 존재하나 이를 통합하는 canonical PDP·effective-role kernel은 실존하지 않음. ERRE 통합 계층은 green-field.

## 5. 반날조 인용 허용목록 (basename, dedupe)

하위 per-entity DSAR은 아래 파일의 `파일:라인`만 인용 가능(+ Ground-Truth ② · ADR 등장분):

- `backend/src/Handlers/TeamPermissions.php` — effective kernel 중추(833줄)
- `backend/src/Handlers/UserAuth.php` — plan/team_role 게이트
- `backend/src/PlanPolicy.php` — plan rank SSOT
- `backend/src/Handlers/Keys.php` — api_key role/scopes
- `backend/src/Handlers/AdminMenu.php` — 메뉴 가시성 effective
- `backend/public/index.php` — api_key RBAC 미들웨어 + guardTeamWrite 전역
- `backend/src/Handlers/EnterpriseAuth.php` — SCIM/SSO team_role 프로비저닝(resolution 아님·참고)

### KEEP_SEPARATE (권한 resolution 아님 · 오흡수 금지 · 가짜녹색 회피)
- `backend/src/Handlers/RuleEngine.php` — 마케팅 automation(channel_roas/sku_stock·캠페인 자동제어). **권한 아님.**
- `backend/src/Handlers/PM/Dependencies.php` — PM 태스크 의존성 DFS cycle 검출. authorization 무관 그래프. **권한 아님.**
- Decisioning/AutoRecommend/AnomalyDetection/Alerting/PolicyTreeEditor 등 마케팅/커머스 — 권한 substrate 아님.

---
**요약**: effective 계산 실존 substrate는 `TeamPermissions::effectiveForUser`(팀 RBAC/ABAC live) 1개가 중추. plan(PlanPolicy::RANK)·api_key(index.php roleRank)·team_role 3 rank는 통합되지 않고 직교 병렬 산재. explicit-deny는 scope 차원 fail-closed 센티넬(`__deny__`)+member 쓰기 전역차단으로 부분 존재하나 negative-ACL 레코드 모델 부재. **통합 PDP·Pipeline·Graph·Snapshot·Digest·Cache·Drift·Simulation·Explain은 Ground-Truth ②에서 판정.**
