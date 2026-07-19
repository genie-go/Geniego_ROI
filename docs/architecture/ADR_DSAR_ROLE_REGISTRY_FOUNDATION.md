# ADR — Role Registry Foundation Governance (EPIC 06-A-03-02-03-04 Part 3-1)

- **상태**: Accepted (설계 정본 · 코드 변경 0 · NOT_CERTIFIED · 실 엔진은 선행 Decision Core + Permission Engine 실 구현 후 별도 승인세션 RP-002)
- **차수**: 289차 후속 회차 (2026-07-19)
- **스펙**: EPIC 06-A-03-02-03-04 Part 3-1 — Role Registry Foundation Governance (사용자 제공 verbatim)
- **선행 블록**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)(Part 2) · [`ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION`](ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION.md)(Part 1)
- **전수조사(ⓑ)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](../segmentation/DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_DUPLICATE_AUDIT`](../segmentation/DSAR_APPROVAL_ROLE_DUPLICATE_AUDIT.md)
- **관련 메모리**: [[project_n289_post_writeguard_server_enforcement]] · [[project_n231_team_permission_rbac]] · [[project_n183_phase3_team_rbac]]

---

## 1. 맥락 (Context)

EPIC 06-A-03-02-03-04의 **Part 3-1 — Role Registry Foundation**. Part 2(Permission Engine) 위에서, 플랫폼 전체의 Role을 **문자열·사용자유형·직급명·관리자 Boolean·Permission 묶음이 아닌 Canonical·Versioned·Tenant-isolated·Permission-linked·Owned·Lifecycle-controlled Role 모델**로 정형화한다. 이후 Part 3-2 Hierarchy/Composite · 3-3 Assignment · 3-4 Scoped · 3-5 Dynamic · 3-6 Service/System · 3-7 Effective Role Resolution이 재사용할 Role Registry Contract를 세운다. 이번 Part는 **확장 포인트·Canonical Interface·설계 명세만**(코드 0). Role Hierarchy/Assignment/Scoped/Dynamic/Resolution 실구현은 후속.

★**이 블록도 실 role substrate가 실재**한다. 능력 기반 전수조사(ⓑ·GROUND_TRUTH·코드 정독·2스레드):

- **★가장 Role Registry에 근접 = `team_role`(owner/manager/member) + `TeamPermissions`**: `app_user.team_role` 컬럼(`UserAuth.php:188`·도출 `:316`)·`roleOf` fail-closed 정규화(`TeamPermissions.php:120-131`)·acl_permission(menu×action)+data_scope(행필터)로 Role→Permission 변환·서버/FE 미러(`teamRolePolicy.js`)·감사(auth_audit_log). ★단 **버전/namespace/lifecycle/snapshot 부재·값 하드코딩**이라 정식 Registry 아님.
- **★5개 무관 역할 vocabulary 공존(통합 namespace 부재·값충돌)**:
  | 체계 | 값 | 저장소 | 축 |
  |---|---|---|---|
  | team_role | owner/manager/member | `app_user.team_role` | 테넌트 내 쓰기 위계 |
  | api_key role | viewer/connector/analyst/admin | `api_key.role`(`Keys.php:95`·roleRank `index.php:573`) | 프로그래매틱 API rank |
  | admin_level | master/sub | `app_user.admin_level`(`UserAdmin.php:43-46`) | plan=admin 내부 세분 |
  | AdminMenu ROLE_ENUM | admin/super_admin/moderator | `menu_tree.required_role`(`AdminMenu.php:247`·게이트 rank와 불일치=반쯤 死) | 메뉴 required_role |
  | **plan 'admin'** | god flag | `app_user.plan/plans` | 전역 우회(`TeamPermissions.php:132`·FE `AuthContext.jsx:720`) |
  → 값 `admin`이 3체계에 중복·서로 다른 값공간/정규화/저장소. 통합 Role Namespace 없음.
- **★SSO group→role 실재**: `sso_group_role_map`(`EnterpriseAuth.php:70-72`)·`roleForGroups`(`:78-88`)=IdP 그룹→team_role(manager/member) 매핑(새 어휘 아님).
- **★admin_roles/user_roles = 유일한 진짜 Role Registry 시도였으나 289차 폐기**: CRUD/assignRole/revokeRole(role-mgmt)를 시도했으나 어떤 인가 게이트서도 미소비되는 DORMANT(장식)로 판정→P3 제거(`routes.php:1670`·`UserAdmin.php:596-599`). **테이블은 파괴적 DROP 대신 고아 유지**.
- **★진짜 부재(순신규)** — Role Registry(단일 정본)·Role Definition 구조체·Role Version화·Role Namespace(`{DOMAIN}:{FUNCTION}:{ROLE}`)·Role Permission Mapping(버전결합)·Role Scope Requirement·Role Owner(Business/Technical/Security)·Role Lifecycle(Draft~Archived)·Role Risk/Criticality·Assignment Policy·Review/Certification·Snapshot/Evidence/Digest·Drift/Revalidation/Reconciliation/Simulation/Migration·Alias/Localization/Replacement.

## 2. 결정 (Decision)

### D-1. Canonical Role Contract를 **신설**하되 실존 primitive를 확장(Golden Rule) — "발명이 아니라 조립". 중복 Role Registry/Definition/Resolver 신설 금지.

| 실존 | §5.2 분류 태그 | 확장 결정 |
|---|---|---|
| **`team_role`(owner/manager/member)+TeamPermissions** | **CANONICAL_ROLE_REGISTRY_CANDIDATE(확장·정형화)** | Role Definition의 최근접 substrate. Registry/Version/Namespace/Lifecycle/Owner 상위 신설·acl_permission=Role Permission Mapping substrate. |
| **api_key role(viewer~admin)** | **CANONICAL(확장·별개 actor)** | 프로그래매틱 API_CLIENT Role 축. Canonical Role로 정규화하되 actor eligibility=API_CLIENT. |
| **admin_level(master/sub)** | **SUB_ROLE_CANDIDATE(확장)** | plan=admin 내부 세분=ADMINISTRATIVE Role 위계 substrate. |
| **AdminMenu ROLE_ENUM** | **CONSOLIDATION_REQUIRED(반쯤 死)** | required_role(3값)이 실 게이트 rank(api_key 4값)와 불일치 → 통합·정합 필요. |
| **SSO group→role** | **VALIDATED_IAM(Adapter)** | 외부 IdP 그룹→Canonical Role 매핑 Adapter(Part 3-6/외부). |
| **admin_roles/user_roles** | **DEPRECATED(289차 폐기·재신설 금지)** | 유일한 role-mgmt 시도였으나 DORMANT 제거. Canonical Role Registry는 이를 **재부활이 아니라** team_role/TeamPermissions 위에 신설. |

### D-2. **plan 'admin' god flag 누출 = §6.5 위반(Role≠Subscription Plan)·후속 정합 대상**

`plan/plans='admin'`이 Subscription Plan이면서 **모든 team 권한을 우회하는 god flag로 이중사용**(`TeamPermissions.php:132`·`AuthContext.jsx:720`·`AdminMenu.php:57`). Role≠Feature Flag/Subscription Plan 원칙(§6.5) 위반. Canonical Role 도입 시 admin 판정을 plan에서 분리(Role/admin_level 기반)해야 하나, 이는 광범위 실코드 영향이라 **후속 enforcement Part**(설계 등재·자립 quick-fix 아님). ★단 admin 판정 SSOT(`resolveAdminByToken`·이번 세션 P4)가 이미 (plan|plans='admin')+is_active+admin_level 폴백으로 단일화됨 → 정합 기반 확보.

### D-3. **중대 긍정 = 정직한 "부재"** (오탐 방지)

§58 "Hardcoded Role String `role=="ADMIN"`·`isManager`·`isApprover`·Job Title/Position을 Role로 사용"은 **대부분 해당 없음** — `isManager`/`isApprover`/`job_title`/`jobTitle`/HR position 개념 레포 전무(정직 부재). 단 team_role/admin_level 문자열 상수 비교는 BE/FE에 산재(`TeamPermissions.php:123`·`AuthContext.jsx:707`)하나 이는 중앙 정책의 소비지 미러(중복 Registry 아님·정형화 대상). admin_roles/user_roles=289차 폐기(재플래그 금지). 부재/기수정을 결함으로 날조하지 않는다.

### D-4. **구현 판정 = 대부분 ABSENT/PARTIAL-substrate/BLOCKED_PREREQUISITE**

- Role Registry/Definition/Version/Namespace·Owner·Lifecycle·Snapshot/Evidence/Digest·Assignment Policy·Review/Certification·Drift/Revalidation/Simulation/Migration = **순신규**.
- Role Permission Mapping은 3축 분산(acl_permission·roleRank→scope·admin_menus) → 단일 매핑 함수 부재.
- 선행 Part 2 Permission Engine이 아직 설계(코드 0)라 Role Permission Mapping의 Permission Version 결합은 BLOCKED_PREREQUISITE.
- ★단 실 substrate(team_role/TeamPermissions/api_key role/admin_level/SSO map) 실재로, 실 엔진은 "5개 흩어진 role 어휘를 Canonical Role Registry/Definition/Namespace/Version으로 데이터화 + Permission Mapping 결합" 조립. 이번 차수=설계 명세(코드 0).

### D-5. Role ≠ Permission ≠ Authority ≠ Job Title ≠ Plan (§6.1~6.5·구현 시 강제)

Role Definition과 Permission/Role Assignment 분리(Assignment는 Part 3-3)·Role≠직책/Position·Role≠Approval Authority(Part 5)·Role≠Feature Flag/Subscription Plan(plan god flag 분리)·Canonical Code(`{DOMAIN}:{FUNCTION}:{ROLE}`)·Least Privilege·모호 단독 Role(ADMIN/ALL_ACCESS) 자동활성 금지.

### D-6. Mandatory Control 고객설정 비활성 불가(§6.17)

Tenant Isolation·Role Versioning·Role Ownership·Lifecycle Enforcement·Deprecated Assignment Block·Retired Runtime Block·Permission Version Binding·Machine Actor Eligibility·Snapshot·Evidence·Audit·Duplicate Code Protection·Cache Invalidation·Historical Immutability.

## 3. Canonical Interface / 확장 포인트 (코드 0 · Part 3-2+ 재사용)

- **Role Registry/Definition/Version**: team_role 3값+api_key role+admin_level+AdminMenu enum을 Definition의 substrate로 흡수, Canonical Code `{DOMAIN}:{FUNCTION}:{ROLE}`(예 `APPROVAL:DECISION:APPROVER`)로 정규화(Legacy Alias·confidence). In-place Update 금지.
- **Role Permission Mapping**: 3분산 축(acl_permission/roleRank→scope/admin_menus)을 Role→Permission Version Mapping으로 통합. Part 2 Permission Definition Version 결합.
- **Role Scope Requirement**: tenant_id·data_scope·team → Assignment 시 필요 Scope 구조(실값 아님·Part 3-4).
- **Role Owner/Lifecycle**: Business/Technical/Security Owner 필수·Draft~Archived 전이. 순신규.
- **Adapter(Part 3-2 Hierarchy·3-3 Assignment·3-6 Service/System)**: Hierarchy Readiness/Assignment Policy/Actor Eligibility Contract만 제공.

## 4. 대안 (Considered)

- **A. 지금 Role Registry(30+ Entity·Resolver·Assignment) 구현** — 기각. 결합할 Permission Engine 실 구현·불변 Decision Record 부재·RP-002 위반·중복 엔진 리스크.
- **B. 폐기된 admin_roles/user_roles를 Role Registry로 재부활** — 기각. DORMANT로 판정·제거된 장식 계층. 재부활은 289차 판정 역행. Canonical Role은 team_role/TeamPermissions 위에 신설.
- **C. 설계 명세만(코드 0)+실존 substrate 조립계획+Gap 등재+선행 전제 명문화** — **채택**. 06-A 계열 일관·Part 1/2 동형.

## 5. 귀결 (Consequences)

- (+) team_role/TeamPermissions(최근접)·api_key role·admin_level·AdminMenu enum·SSO map의 확장 substrate 지위·Canonical 정규화 경로 확정("발명 아닌 조립").
- (+) 5개 무관 role 어휘·값충돌('admin' 3중복)·plan god flag 누출(§6.5) 문서화·후속 정합 등재.
- (+) 정직 판정(isManager/isApprover/Job Title/Position 부재·admin_roles 폐기 재플래그 금지) — 오탐/날조 방지.
- (+) Role≠Permission≠Authority≠JobTitle≠Plan 5분리·Canonical Code·Owner 필수·Lifecycle·Snapshot 불변·Cross-tenant 격리 설계 정본 확보.
- (+) Part 3-2 Hierarchy/Composite가 재사용할 Role Registry Contract 준비.
- (−) 이번 차수 런타임 기능 증가 0(설계).
- (→) 다음: **Part 3-2 Role Hierarchy & Composite Role Governance**. 실 Role Engine=선행 Permission Engine 실구현 + 별도 승인세션(RP-002).

## 6. 규율 준수

Golden Rule(Extend not Replace·중복 Role Registry/Definition/Resolver 금지·폐기 admin_roles 재부활 금지) · 무후퇴 · "결론의 근거도 재실증"(5 role 어휘·team_role/TeamPermissions·SSO map·plan god flag·부재 전부 grep/코드 정독으로 확정) · Role≠Permission≠Authority≠JobTitle≠Plan · Mandatory Control 무력화 금지 · 코드 변경 0(설계) · NOT_CERTIFIED · BLOCKED_PREREQUISITE · RP-002 · DORMANT 오계상 금지 · 기수정(P1~P4) 재플래그 금지 · GROUND_TRUTH 외 인용 금지.
