# DSAR — Permission Engine 기존 구현 전수조사 (EPIC 06-A-03-02-03-04 Part 2 · ⓑ GROUND_TRUTH)

- **상태**: 전수조사 정본 (코드 변경 0) · 289차 후속 (2026-07-19)
- **방법**: 능력 기반 전수조사 — grep/read 코드 정독 · 2 스레드(타깃 grep + Explore 서브에이전트 33 tool-use). 모든 발견 `파일:라인` 근거. **반날조: 부재를 결함으로, 있는 것을 없다고 하지 않음.**
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)

---

## 1. 실존 Permission Substrate (확장 대상)

### 1.1 TeamPermissions.php — 실 RBAC/ABAC 엔진 (가장 Permission Model 근접)
- **acl_permission**(테이블 `:152-159` MySQL / `:169-170` SQLite): `tenant_id, subject_type(user/team/member), subject_id, menu_key, actions(CSV), updated_at`. UNIQUE `uq_acl(:170)`. **8 actions**(`ACTIONS :39`: view/create/update/delete/approve/export/execute/manage · manage=superset · view 자동포함 `:182-192`). **MENU_CATALOG 26메뉴 서버 SSOT** `:55-82`.
- **data_scope**(테이블 `:160-166`/`:171-172`): `subject_type, subject_id, scope_type, scope_values(JSON)`. **9 scope dims** `DATA_SCOPES :41`. **실제 enforce**: `effectiveScope :236-265`·`scopeValuesFor :272-280`·`scopeSql :286-293`·`scopeSqlNamed :299-307`·`scopeChannelProduct :315-322`. fail-closed `DENY_SCOPE :234`·`1=0` 센티넬 `:290,303`. **소비 핸들러=Catalog/OrderHub/Wms/AdPerformance 4곳(grep 확인)** → ~57핸들러 중 4곳만(넓은 미필터 표면).
- **role hierarchy**: `app_user.team_role`(owner>manager>member) 재사용 — `roleOf :120-131`(fail-closed)·`isAdmin :132`(plan|plans=='admin')·`isOwnerAdmin :134`·`isManagerAdmin :136`.
- **위임상한(Maker-Checker 인접)**: `assignableMap :354-360`·`putMemberPermissions :628-647`(403 `DELEGATION_EXCEEDED`)·`clampActions :396-402`·`reclampTeamMembers :779-800`. ★진짜 2-eyes 승인 워크플로 부재("approve"=action grant일 뿐).
- **team**(테이블 `:145-151`). ★**team_member 테이블 부재** — membership=`app_user.team_id` 컬럼(`:175`). Audit→`auth_audit_log`(UserAuth::logAudit).

### 1.2 index.php 중앙 RBAC (PEP)
- `roleRank(viewer:0/connector:1/analyst:2/admin:3)` `:573-576` · scopes `api_key.scopes_json :577` · `/v421/keys`=admin:keys∨rank≥3 `:583-586` · write=`write:*`∨`/ingest`(write:ingest∨rank≥1)∨rank≥2 `:590-596` · tenant 강제주입 `:619` · AI-gate 별칭 미러 `:430-437`.

### 1.3 team_role 게이트 (UserAuth) — 289차 서버 전역 배선 완료
- `TEAM_OWNER_ONLY :1117` · `normTeamRole :1119`(unknown→owner) · `teamCanWrite :1125` · `requireTeamWrite :1134`(admin bypass) · **`guardTeamWrite :1167`(전역 미들웨어 미러·fail-open·명시 member만 차단·demo bypass)** · `index.php:82`가 mutating 비-/auth 전역 호출→403 `TEAM_READ_ONLY`.

### 1.4 plan/feature 게이트 (상용·직교 축)
- `PlanPolicy.php`: RANK `:19`·FEATURE_MIN_PLAN `:27`·minPlanFor `:47`(undefined→pro fail-secure)·allows `:53`. `UserAuth::requireFeaturePlan :77`(미해석 plan→free fail-secure·crash catch fail-open)·requirePro/requirePlan. 사용 광범위(require*Plan/Pro 467회/57파일). FE `planMenuPolicy.js`(UI 권고·서버 미러).

### 1.5 admin 판정 SSOT — 289차 통합
- **`UserAuth::resolveAdminByToken :2998`** 정본((plan|plans='admin')+is_active+미만료+admin_level 폴백). UserAdmin/SystemMetrics/DbAdmin/EventPopup::requireAdmin 위임. requireAdminUser(리치)·TeamPermissions::isAdmin(배열술어)=의도적 별개.

### 1.6 api_key scopes / SSO / connector
- scopes `read:*·write:*·write:ingest·write:attribution·write:mta·admin:keys`(Keys.php:191,204·UserAuth:4307·Db.php:1004,1012 demo seed). SSO `EnterpriseAuth`=SAML email/SCIM 프로비저닝(JWT-claim authz 아님). `connector_token.scopes`=아웃바운드 광고플랫폼 OAuth(내부 authz 아님).

## 2. §92 기존 구현 분류

| 구현 | 분류 태그 | 근거 |
|---|---|---|
| acl_permission(menu×action) | CANONICAL_PERMISSION_SCOPE_CANDIDATE(정형화) | `:152-171`·menu_key→Canonical Code 매핑 필요 |
| data_scope(행필터) | ROW/DATA_SCOPE_CANDIDATE(확장) | `:160-322`·scope_values→Canonical Filter AST |
| index.php RBAC+api_key scopes | CANONICAL(PEP·확장) | `:553-619` |
| resolveAdminByToken | CANONICAL(admin bypass 정본) | `:2998` |
| PlanPolicy/requireFeaturePlan | KEEP_SEPARATE_WITH_REASON | plan≠Permission(직교) |
| SSO group→role | VALIDATED_IAM | EnterpriseAuth |
| admin_roles/user_roles | **DEPRECATED(289차 P3 폐기)** | 미소비 죽은 RBAC·6라우트+6메서드+FE탭 제거·테이블 고아유지 |
| writeGuard.js/teamRolePolicy.js/planMenuPolicy.js | UI_HINT_ONLY(서버 미러됨) | FE·index.php:82 서버강제 |
| MenuVisibilityContext | UI_HINT_ONLY(cosmetic) | 가시성≠접근통제 |
| 하드코딩 email/user-id authz | **부재(정직)** | 전무·전부 DB plan/plans/admin_level |
| FULL_ACCESS/MANAGE_ALL/SUPER_ADMIN | **부재** | 백엔드 grep 공집합(super_admin=AdminMenu role enum) |

## 3. Canonical Primitive Present/Absent

| Primitive | 상태 | 근거 |
|---|---|---|
| Registry | PARTIAL | MENU_CATALOG/ACTIONS/DATA_SCOPES(`:39-82`)·team-menu 한정 |
| Definition | PARTIAL | acl/data_scope schema·feature keys·ad-hoc scope JSON |
| Version | ABSENT | permission-schema 버전화 없음 |
| Scope(row) | EXISTS | data_scope+scopeSql(4핸들러 소비) |
| Grant | EXISTS | acl_permission INSERT(replacePerms `:325`) |
| Deny(explicit) | PARTIAL | 1=0 센티넬·first-class deny row 부재 |
| Resolver | EXISTS | effectiveForUser `:366`·effectiveScope `:236` |
| Effective-Set | EXISTS(계산·미영속) | effectiveForUser 온디맨드 |
| Snapshot | ABSENT | permission 시점 스냅샷/이력 테이블 없음 |
| Evidence | PARTIAL | auth_audit_log=변경만·per-request 결정/거부 미감사 |

## 4. 정직한 부재 (오탐 예방)
하드코딩 user-id/email authz·`isAdmin` 전권 우회·FULL_ACCESS/MANAGE_ALL 백도어 = **전무**. wildcard(write:*/read:*)=api_key 프로그래매틱 한정(§6.8 부합). admin_roles/user_roles=289차 폐기(재플래그 금지). Part 1 D-2 위험 4건=289차 P1~P4 해소(재플래그 금지).
