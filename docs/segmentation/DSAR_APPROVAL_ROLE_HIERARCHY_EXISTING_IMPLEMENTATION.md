# DSAR — Role Hierarchy / Composite / Graph 기존 구현 전수조사 (EPIC 06-A-03-02-03-04 Part 3-2 · ⓑ GROUND_TRUTH)

- **상태**: 전수조사 정본 (코드 변경 0) · 289차 후속 (2026-07-19)
- **방법**: 능력 기반 전수조사 — grep/read 코드 정독(백엔드 PHP 전역 + 프론트엔드 + 설정/마이그레이션) · 2 Explore 스레드 병행. 모든 발견 `파일:라인`. **반날조: 없는 것을 있다고, 있는 것을 없다고 하지 않음. 부재는 grep 0건으로 실증.**
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **선행 전수조사(Part 3-1 GROUND_TRUTH·재사용)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_DUPLICATE_AUDIT.md)

---

## 0. 총평 (한 줄)

**Part 3-2 도메인 전체(Role Hierarchy · Composite Role · Role Graph · Inheritance · Cycle Detection · Transitive Closure · Diamond)는 저장소에 실재하지 않는다(순신규).** 유사해 보이는 것은 셋뿐이며 전부 **Role↔Role 그래프가 아니다**: ① api_key `roleRank` **선형 전순서**(그래프 아님), ② `parent_user_id` **계정(팀원) 위계**(Role 상속 아님), ③ `menu_tree.parent_id` **메뉴 트리**(Role 아님). 이 셋은 §6.1(Role Hierarchy ≠ Organization Hierarchy) 위반을 유발할 수 있는 substrate이자 오용 방지 대상이다.

---

## 1. 실존하는 "위계 유사" substrate (3종 · 전부 Role Graph 아님)

### 1.1 api_key `roleRank` — 유일한 Role 순서(선형 전순서 · Edge/Version 없음)
- `$roleRank = ['viewer'=>0,'connector'=>1,'analyst'=>2,'admin'=>3]`(`backend/public/index.php:573`)·현재 role rank 산출(`:576`)·쓰기 게이트(`:592-595` write:ingest→connector+ · 쓰기→analyst+). **하드코딩 선형 rank map**이며 role→role edge·전이·다중상속·version이 **전무**. 위계라기보다 "정렬된 4단계"다.
- 이는 Part 3-1 §1.2에서 확인된 api_key role 어휘(`Keys.php:95` validRoles)와 동일 축(프로그래매틱 API_CLIENT rank).

### 1.2 `parent_user_id` — 계정/팀원 위계 (Role 상속 아님 · §6.1 오용 대상)
- ALTER 신설(`UserAuth.php:187`)·정의 주석 "**하위(팀원) 계정의 상위 owner id. owner=NULL**"(`:176`). **team_role를 파생**: `team_role = parent_user_id ? 'member' : 'owner'`(`:316`·`:1019`·`:1139`). 하위계정은 상위 owner의 tenant_id 상속(`:217`·`:227`·`:423-426` 교차테넌트 불가).
- admin_level=sub 계정도 `parent_user_id`로 master에 연결(`:1548`·`:1614`·`:1672` 소유권 검증). manager 대행 시 parent 판정(`:1291-1292`).
- ★**이것은 사람(계정) 간 owner→member 관계이지 Role→Role 상속 edge가 아니다.** 조직 위계를 Role 상속으로 오변환하지 말라는 §6.1의 실제 위험 지점.

### 1.3 `menu_tree.parent_id` — 메뉴 트리 인접리스트 (Role Graph 아님 · §6.1 오용 대상)
- adjacency list `parent_id` 컬럼(`AdminMenu.php:108` MySQL · `:134` SQLite)+closure 인덱스 `KEY idx_menu_tree_parent (parent_id)`(`:117`)·트리 조회(`:268`). **저장소에서 유일하게 진짜 parent-child 인접리스트/트리 구조**이나 대상이 **메뉴**지 Role이 아니다.
- `menu_tree.required_role`(AdminMenu ROLE_ENUM admin/super_admin/moderator·Part 3-1 §1.4 `AdminMenu.php:247`)로 메뉴에 role을 붙이지만, 이는 메뉴 노드의 접근 요구지 role 간 상속 edge가 아니다.

## 2. Role → Permission 변환 (묶음이나 Composite Role 아님 · Part 3-1 재사용)

- team_role→acl_permission(menu×action)(`TeamPermissions.php:152`)·`roleOf` fail-closed(`:120-131`)·`isAdmin` plan god flag(`:132`). api_key role→scope(`index.php:573-595`). admin_level→admin_menus(JSON). SSO group→team_role(`EnterpriseAuth.php:70-88`).
- ★**이 매핑들은 "Role→Permission 묶음"이지 "여러 Role Definition을 조합한 Composite Role"이 아니다**(§6.3 구분). Permission Group/Bundle 자체도 정형 실체로는 부재(Part 2 Permission Engine 설계 단계·코드 0).

## 3. §5.2 기존 구현 분류

| 구현 | §5.2 분류 태그 | 근거 (file:line) |
|---|---|---|
| api_key `roleRank` 선형 rank | **Hardcoded Parent-child(순서)·Unversioned Hierarchy** | `index.php:573,592-595` |
| `parent_user_id` 계정 위계 | **Organization Hierarchy Candidate(오용 위험)·Role Hierarchy 아님** | `UserAuth.php:176,316,423-426` |
| `menu_tree.parent_id` 메뉴 트리 | **Organization Hierarchy Candidate·Hardcoded Parent-child(메뉴)** | `AdminMenu.php:108,117,268` |
| team_role→acl_permission | Role Inclusion 아님·Permission Group Candidate(묶음) | `TeamPermissions.php:152` |
| SSO group→role | IAM Group Nesting Candidate(Adapter·평면 매핑) | `EnterpriseAuth.php:70-88` |
| plan 'admin' god flag | Anti-pattern(§6.5·전역 우회) | `TeamPermissions.php:132`·`AuthContext.jsx:720` |
| Composite Role / Role Graph / Cycle / Closure / Diamond / Ancestor / Descendant / Nested Role / Role Resolver-Flattening | **ABSENT(순신규)** | 백엔드 PHP grep 0건(composite\|hierarchy\|circular\|Tarjan\|transitive\|closure\|ancestor\|descendant\|role_graph\|role_bundle\|role_set\|role_group\|effective_role\|flatten_role\|resolve_role\|nested_role) |

## 4. 정직한 부재 (오탐/날조 예방 · grep 0건 실증)

- **Role Graph / Role Hierarchy Registry / Definition / Version / Node / Edge = 전무.** parent_id·roleRank는 role↔role 그래프가 아님.
- **Composite Role / Component / Nested Composite = 전무.** role 조합 개념 없음.
- **Cycle Detection(Direct/Indirect) / Tarjan SCC / DFS Color / Transitive Closure / Ancestor·Descendant Resolution = 전무.** 그래프 알고리즘 부재(role 대상).
- **Diamond Inheritance / Ambiguity / Multiple Inheritance / Role Path / Path Evidence = 전무.**
- **Role Conflict / Exclusion / Dependency / Compatibility(SoD 방향) = 전무.** (Part 3-1 §4에서 isManager/isApprover/Job Title 부재 확인과 동일 계열.)
- **Role Graph Snapshot / Evidence / Digest / Drift / Revalidation / Reconciliation / Simulation / Migration = 전무.**
- **IAM/Keycloak/LDAP/AD nested group·ERP/Workflow role hierarchy adapter = 전무**(SSO group→role 평면 매핑만 실재·`EnterpriseAuth.php:70-88`).
- **프론트엔드 role composite/hierarchy/graph = 전무**(FE의 hierarchy/composite grep 매치는 전부 무관 — 메뉴/차트/PM간트/공급망/i18n 문자열).

★따라서 실 엔진은 "부분 미비 보완"이 아니라 **Canonical Versioned Role Graph를 제로에서 신설 + 3종 유사 substrate(roleRank/parent_user_id/menu_tree)의 오용 차단**이다. Part 3-1 판정(5 role 어휘 산재·통합 Namespace 부재)과 정합. 실 구현=선행 Permission Engine·Decision Core 실구현 후 별도 승인세션(RP-002). 이번 차수 코드 0.

## 5. 근접 알고리즘/구조 패턴 (Role 아닌 도메인 · 실 엔진 참조 substrate)

Role Graph는 부재하나, **동형 알고리즘/구조가 비-Role 도메인에 실재**한다. 실 엔진 구현 시 "발명이 아니라 조립"의 참조 패턴이자, Role Graph로 **오흡수 금지** 경계다. (per-entity DSAR는 이 목록만 근접 substrate로 인용 가능.)

| 능력 | 실재 위치(비-Role 도메인) | file:line | Role 엔진 참조/경계 |
|---|---|---|---|
| **Cycle Detection(조상체인 walk+self-ref+depth guard)** | menu_tree `wouldCycle`(id===newParent 즉시차단·depth<100) | `AdminMenu.php:540-555` | §44 Circular Detection 참조 패턴(단 메뉴 대상·role 아님) |
| **Cycle Detection(DFS 도달가능성)** | PM 태스크 의존성 | `PM/Dependencies.php:10`(cycle 검출 주석) | §44 참조(태스크 그래프·role 아님) |
| **Effective 계산(resolver/flatten 동형)** | `effectiveForUser`(owner/admin→full·manager→team acl·member→team cap 클램프) | `TeamPermissions.php:366-394` | §34 Effective Inherited Set·§36 Permission Merge 참조(role→permission 묶음이지 role 상속 아님) |
| **Effective Scope(fail-closed)** | `effectiveScope`(owner=null·상속·실패 DENY_SCOPE) | `TeamPermissions.php:236-265` | §39 Scope Propagation 참조 |
| **Role 묶음 프리셋(role bundle 최근접·단 team template)** | `ORG_PRESET`(15 팀유형별 기본 권한셋) | `TeamPermissions.php:706-722` | §21 Composite Role과 혼동 금지(§6.3·팀 템플릿이지 role 조합 아님) |
| **선형 rank 3종(미통합·상호 비변환)** | api_key role(4단 정수) / team_role(3단 enum·정수 rank 없음) / plan(6단 `PlanPolicy::RANK` 'admin'=5) | `index.php:573`·`AdminMenu.php:74,338`(중복) / `TeamPermissions.php:120-131` / `PlanPolicy.php:19-22` | §6.2 "선형 rank≠상속" 오변환 금지·별도 Registry(Actor/Category 축) |
| **Silo mini-RBAC(별도 축·미통합)** | `wms_permissions`(role text·admin=전창고 우회) | `Wms.php:114,567-575` | 중복 RBAC(Consolidation 후보·Role Graph 밖) |
| **Snapshot/baseline(role 아님)** | `menu_defaults`(snapshot_data·version·reset 롤백지점) | `AdminMenu.php:119-122,295-311,583-589` | §50 Graph Snapshot 참조(메뉴 대상) |
| **감사 해시체인 — ★tamper-evident 아님** | `menu_audit_log` hash_chain(append만·`appendAudit`/`lastHash`) | `AdminMenu.php:123-131,169-219` | §52 Evidence 참조하되 **정본 append-only 해시체인=`SecurityAudit::verify`뿐**([[reference_menu_audit_log_not_tamper_evident]]·chain write만·verify 0·장식). menu hash_chain을 tamper-evident로 인용 금지 |
| **admin 판정 SSOT(부분화·드리프트 자인)** | `resolveAdminByToken`(plan/plans='admin'+is_active+세션) | `UserAuth.php:2998-3024`·드리프트 주석 `:2988-2991` | admin=최상위 role로 오모델 금지(§6.5·plan≠Role·289차 P4) |

★위 패턴들은 전부 **Role↔Role 그래프가 아니다**. Role Graph 실 엔진은 이들을 알고리즘 참조로만 재사용하고, 대상(메뉴/태스크/계정/plan/WMS)을 Role Node/Edge로 흡수하지 않는다.
