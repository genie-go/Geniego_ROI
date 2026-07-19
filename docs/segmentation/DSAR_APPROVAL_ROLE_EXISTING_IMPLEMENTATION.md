# DSAR — Role Registry 기존 구현 전수조사 (EPIC 06-A-03-02-03-04 Part 3-1 · ⓑ GROUND_TRUTH)

- **상태**: 전수조사 정본 (코드 변경 0) · 289차 후속 (2026-07-19)
- **방법**: 능력 기반 전수조사 — grep/read 코드 정독 · 2스레드(타깃 grep + Explore 서브에이전트 26 tool-use). 모든 발견 `파일:라인`. **반날조: 부재를 결함으로, 있는 것을 없다고 하지 않음.**
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)

---

## 1. 실존 Role Substrate (확장 대상)

### 1.1 team_role (owner/manager/member) — 가장 Role Registry 근접
- 컬럼 `app_user.team_role`(`UserAuth.php:188` ALTER·도출 `:316` parent_user_id?member:owner). `TeamPermissions::roleOf`(`:120-131` fail-closed·미해결→member)·`isAdmin`(`:132` plan=='admin')·`isOwnerAdmin`(`:134`)·`isManagerAdmin`(`:136`).
- 쓰기가드 `TEAM_OWNER_ONLY`(`UserAuth.php:1117`)·`teamCanWrite`(`:1125`)·`requireTeamWrite`(`:1134`). Role→Permission 변환=acl_permission(menu×8action `:39,152-159`)+data_scope(9dims 행필터 `:41,218-322`). 서버/FE 미러(`teamRolePolicy.js`).

### 1.2 api_key role (viewer/connector/analyst/admin)
- `api_key.role`(`Keys.php:63,119`·validRoles `:95`)·roleRank(`index.php:573`)·defaultScopes(`Keys.php:189-194` admin→read/write/admin:keys). team_role과 무관한 프로그래매틱 축.

### 1.3 admin_level (master/sub)
- `app_user.admin_level`(`UserAuth.php:191`)+`admin_menus`(JSON). `UserAdmin::isMaster`(`:43-46` !='sub'→master·NULL 하위호환)·`requireMasterAdmin`(`:50`). plan=admin 계정 내부 세분(`UserAuth.php:1022` plan=admin일 때만 부여). 권한상승차단(신규 admin=sub 강제 `:298-301,436-438`).

### 1.4 AdminMenu ROLE_ENUM (admin/super_admin/moderator)
- `AdminMenu.php:247`·required_role 검증(`:401`)뿐. rank map(`:74` viewer~admin=ROLE_ENUM과 다른 축!)·`isSuper`(`:148-151` role=='admin'+admin:menu_super scope). ★ROLE_ENUM(3값)과 실 게이트 rank(api_key 4값) 불일치=반쯤 死.

### 1.5 SSO group→role
- `sso_group_role_map`(`EnterpriseAuth.php:70-72`)·`roleForGroups`(`:78-88` IdP 그룹→manager/member·manager 우선)·`default_role`(`:50`). team_role 어휘로 매핑(새 체계 아님).

### 1.6 plan 'admin' god flag (이중사용)
- Subscription plan이나 god flag 이중사용: `TeamPermissions.php:132`(team 권한 우회)·FE `AuthContext.jsx:720`·`AdminMenu.php:57`. §6.5 위반 지점.

### 1.7 team 테이블 / FE
- `team`(`TeamPermissions.php:145-151`). team_member 테이블 부재(=`app_user.team_id`·`:562`). FE `teamRolePolicy.js`(SSOT·`normalizeTeamRole` fail-open→owner)·`AuthContext.jsx:707-761`·`useTeamRole.js:11-22`·`planMenuPolicy.js`(plan축·직교).

## 2. §5.2 기존 구현 분류

| 구현 | 분류 태그 | 근거 |
|---|---|---|
| team_role+TeamPermissions | CANONICAL_ROLE_REGISTRY_CANDIDATE(정형화) | `UserAuth.php:188`·`TeamPermissions.php:120-322` |
| api_key role | CANONICAL(별개 actor·API_CLIENT) | `Keys.php:95`·`index.php:573` |
| admin_level | SUB_ROLE_CANDIDATE(확장) | `UserAdmin.php:43-46` |
| AdminMenu ROLE_ENUM | CONSOLIDATION_REQUIRED(반쯤 死) | `AdminMenu.php:247`·rank 불일치 |
| SSO group→role | VALIDATED_IAM(Adapter) | `EnterpriseAuth.php:70-88` |
| plan 'admin' god flag | ANTI_PATTERN(§6.5 위반·후속 정합) | `TeamPermissions.php:132`·`AuthContext.jsx:720` |
| admin_roles/user_roles | **DEPRECATED(289차 폐기·재부활 금지)** | `routes.php:1670`·`UserAdmin.php:596-599`·고아 테이블 |
| team_role/admin_level 문자열 상수 비교(BE/FE) | 정책 소비지 미러(중복 아님·정형화) | `TeamPermissions.php:123`·`AuthContext.jsx:707` |
| Job Title/Position | **부재(정직)** | job_title/jobTitle 0건·position=비-HR |
| isManager/isApprover 하드코딩 | **부재(정직)** | grep 0건 |

## 3. Canonical Role Registry 성숙도

| 능력 | 상태 | 근거 |
|---|---|---|
| Registry(단일 정본) | ABSENT | 5 어휘 산재·폐기 admin_roles가 유일 근접 |
| Definition | PARTIAL | 문자열 const(`TeamPermissions.php:123`·`AdminMenu.php:247`·`Keys.php:95`) |
| Version | ABSENT | 버전 컬럼/개념 없음 |
| Namespace | ABSENT | flat 문자열·값충돌('admin' 3체계) |
| Permission-Mapping | PARTIAL(3분산) | acl_permission·roleRank→scope·admin_menus |
| Scope-Requirement | PARTIAL | api_key scopes_json·admin:menu_super |
| Owner | ABSENT | 역할 소유/승인 개념 없음 |
| Lifecycle | ABSENT | 하드코딩 enum·런타임 CRUD 불가(폐기 admin_roles만 시도했었음) |
| Snapshot | ABSENT | 역할 스냅샷/이력 없음 |
| Evidence | PARTIAL | auth_audit_log=변경 로그만 |

## 4. 정직한 부재 (오탐 예방)
Job Title/Position/isManager/isApprover 하드코딩 authz **전무**. admin_roles/user_roles=289차 폐기(재부활·재플래그 금지). 가장 근접 substrate=team_role+TeamPermissions(3값 위계·fail-closed·ACL 매핑·감사)이나 version/namespace/lifecycle/snapshot 부재로 정식 Registry 아님. Part1~2 및 289차 P1~P4 수정분 재플래그 금지.
