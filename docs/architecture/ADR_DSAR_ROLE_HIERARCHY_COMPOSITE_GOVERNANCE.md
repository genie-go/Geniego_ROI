# ADR — Role Hierarchy & Composite Role Governance (EPIC 06-A-03-02-03-04 Part 3-2)

- **상태**: Accepted (설계 정본 · 코드 변경 0 · NOT_CERTIFIED · 실 엔진은 선행 Permission Engine + Decision Core 실 구현 후 별도 승인세션 RP-002)
- **차수**: 289차 후속 회차 (2026-07-19)
- **스펙**: EPIC 06-A-03-02-03-04 Part 3-2 — Role Hierarchy & Composite Role Governance (사용자 제공 verbatim · [`docs/spec/EPIC_06A_PART3_2_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_2_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE_SPEC.md))
- **선행 블록**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)(Part 3-1) · [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)(Part 2) · [`ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION`](ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION.md)(Part 1)
- **전수조사(ⓑ)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](../segmentation/DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](../segmentation/DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **관련 메모리**: [[project_n289_post_writeguard_server_enforcement]] · [[project_n231_team_permission_rbac]] · [[project_n183_phase3_team_rbac]]

---

## 1. 맥락 (Context)

EPIC 06-A-03-02-03-04의 **Part 3-2 — Role Hierarchy & Composite Role Governance**. Part 3-1(Role Registry) 위에서, 플랫폼의 Role 간 상속·포함·조합·특수화·제한 관계를 **`parent_id`·문자열 배열·프레임워크 Composite 기능이 아닌 Canonical·Versioned·Tenant-isolated·Directed·Acyclic·Scope/Permission/Risk/Actor/Conflict-aware·Evidence-backed·Simulation-ready·Runtime-enforceable한 Role Graph**로 정형화한다. 이후 Part 3-3 Assignment·3-4 Scoped·3-5 Dynamic·3-6 Service/System·3-7 Effective Role Resolution이 재사용할 Hierarchy Resolution Contract를 세운다. 이번 Part는 **확장 포인트·Canonical Interface·설계 명세만**(코드 0). 실제 Subject Role Assignment는 Part 3-3.

★**능력 기반 전수조사(ⓑ·GROUND_TRUTH·코드 정독·백엔드 PHP 전역+FE+설정)** 핵심 결론:

- **★Part 3-2 도메인 전체가 순신규(ABSENT)** — Role Hierarchy/Composite/Graph/Inheritance/Cycle Detection/Transitive Closure/Diamond/Ancestor/Descendant/Role Resolver-Flattening이 저장소에 **실재하지 않는다**(백엔드 PHP grep 0건: composite·hierarchy·circular·Tarjan·transitive·closure·ancestor·descendant·role_graph·role_bundle·role_set·role_group·effective_role·flatten_role·resolve_role·nested_role).
- **★위계 유사 substrate 3종은 전부 Role↔Role 그래프가 아니다**:
  | substrate | 실제 대상 | 근거 | Role Graph 여부 |
  |---|---|---|---|
  | api_key `roleRank` 선형 rank(viewer<connector<analyst<admin) | 프로그래매틱 API rank | `index.php:573,592-595` | ✗ 선형 전순서·edge/version 없음 |
  | `parent_user_id` 계정 위계(owner→member) | 사람(계정) | `UserAuth.php:176,316,423-426` | ✗ Subject 관계(§6.1 오용 대상) |
  | `menu_tree.parent_id` 메뉴 트리(인접리스트+closure idx) | 메뉴 노드 | `AdminMenu.php:108,117,268` | ✗ 메뉴 도메인(§6.1 오용 대상) |
- **★Role→Permission 묶음(team_role→acl_permission `TeamPermissions.php:152`)은 Composite Role이 아니다**(§6.3) — 여러 Role Definition 조합이 아니라 Role→Permission 매핑. SSO group→role(`EnterpriseAuth.php:78-88`)은 평면 1-hop 매핑(nested group 아님).
- **★정직한 부재**(오탐/날조 예방): Role Conflict/Exclusion/Dependency/Compatibility(SoD 방향)·Diamond·Ambiguity·Path·Snapshot/Evidence/Digest/Drift·Simulation·IAM/Keycloak/LDAP/AD/ERP/Workflow nested hierarchy adapter = **전무**. FE의 hierarchy/composite grep 매치는 전부 무관(메뉴/차트/PM간트/공급망/i18n).

## 2. 결정 (Decision)

### D-1. Canonical Versioned Role Graph를 **제로에서 신설**하되 실존 primitive와의 경계를 명확히(Golden Rule·"발명이 아니라 조립+분리")

| 실존 | §5.2 분류 태그 | 결정 |
|---|---|---|
| **api_key `roleRank` 선형 rank** | Hardcoded Parent-child(순서)·Unversioned | Role Category/Actor 축으로 정규화하되 "선형 rank=상속"으로 오변환 금지(§6.2). 별도 Hierarchy Registry(API_CLIENT). |
| **`parent_user_id` 계정 위계** | Organization Hierarchy Candidate(오용 위험) | **Role Graph 밖 유지** — Part 3-3 Subject Assignment 관계. Role Hierarchy로 흡수 금지(§6.1·§67 Critical Gap). |
| **`menu_tree.parent_id` 메뉴 트리** | Organization Hierarchy Candidate | **Role Graph 밖 유지** — 메뉴 도메인. §66 "Organization Hierarchy를 Role Hierarchy로 중복" 방지. |
| **team_role→acl_permission 묶음** | Permission Group Candidate(묶음) | Composite Role(Role 조합)과 분리(§6.3). Composite component=Role Definition으로 신설. |
| **SSO group→role 평면 매핑** | IAM Group Nesting Candidate(Adapter) | Cross-registry IAM Adapter로 유지(§48). Role Graph 내부 edge로 흡수 금지. |
| **Composite/Graph/Cycle/Closure/Diamond/Nested** | **ABSENT(순신규)** | Canonical Role Graph를 제로 신설. 중복될 대상 없음. |

### D-2. Role Hierarchy ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group (§6.1~6.3·구현 시 강제)

조직 상하(직급·계정 owner→member·메뉴 트리)를 Role 상속으로 자동 변환 금지(§6.1). Role 간 상속과 Permission Implication 분리·Role Graph가 Permission Graph 복제 금지(§6.2). Composite Role(여러 Role Definition 조합) ≠ Permission Group(Permission 묶음)(§6.3). ★현행 `parent_user_id`/`menu_tree`/`roleRank`가 정확히 이 오용의 실제 위험 지점(전수조사 §1).

### D-3. Edge 의미론을 명시 (§6.4·§12~§16)

`parent_id`만 저장 금지. Edge Type(INCLUDES/INHERITS/SPECIALIZES/RESTRICTS/DEPENDS_ON/EXCLUDES/IMPLIES/COMPOSES)+Inheritance Direction(기본값 `EXPLICIT_EDGE_DIRECTION_ONLY`)+Permission/Deny/Scope/Constraint/Actor/Validity Propagation Policy를 명시. INCLUDES/INHERITS를 단순 Permission Union으로 구현 금지. SPECIALIZES=Scope 축소 기본, RESTRICTS·Explicit Deny가 Allow보다 우선.

### D-4. Safety-first Aggregation & Guard (§6.6~6.16·Mandatory Control)

Versioned Graph(In-place Update 금지·§6.5)·Circular Reference 금지(Direct+Indirect·Tarjan SCC/DFS·§6.6)·Scope Intersection 기본(자동 확대 금지·§6.7)·Explicit Deny 보존(§6.8)·Actor Eligibility 교집합(Human-only↔Machine-only Composite 금지·§6.9)·Risk 최대값/상향(Composite Risk 하향 금지·§6.10)·Deprecated 신규 Edge 금지(§6.11)·Retired Active 제거(§6.12)·Diamond 명시 처리(§6.13)·Cross-Tenant Edge 차단(§6.14)·Historical 불변(§6.15). §6.16 Mandatory Control(Cycle Detection·Tenant Isolation·Version Binding·Deny Propagation·Scope Guard·Actor Validation·Risk Escalation·Retired Blocking·Snapshot·Evidence·Cache Invalidation·Historical Immutability)은 고객 설정으로 비활성화 불가.

### D-5. 구현 판정 = 대부분 ABSENT/순신규/BLOCKED_PREREQUISITE

- Role Hierarchy Registry/Definition/Version/Node/Edge·Composite Role/Version/Component/Nested·Role Graph/Version/Node/Edge/Path/Closure·Effective Inherited/Composite Set·Permission/Deny/Scope Aggregation·Cycle/Diamond/Ambiguity Detection·Conflict/Exclusion/Dependency/Compatibility·Snapshot/Evidence/Digest·Cache·Drift/Revalidation/Reconciliation·Simulation/Impact·Migration/Adapter = **전부 순신규**.
- 선행 Part 2 Permission Engine·Part 3-1 Role Definition Version이 아직 설계(코드 0)라 Permission Version Binding·Role Version Binding은 **BLOCKED_PREREQUISITE**.
- ★단 위계 유사 substrate 3종(roleRank/parent_user_id/menu_tree)이 실재하므로 실 엔진은 "그것들의 오용 차단 + Canonical Role Graph 제로 신설"의 조립. 이번 차수=설계 명세(코드 0).

### D-6. 폐기·재플래그 금지 규율

admin_roles/user_roles=289차 P3 폐기(재부활 금지). 289차 P1~P4(writeGuard·featurePlan·admin폐기·resolveAdminByToken) 재플래그 금지. `parent_user_id`/`menu_tree`/`roleRank`의 **부재(Role Graph 아님)를 결함으로 날조 금지** — 이들은 정당한 별개 도메인이며 오용 경계만 설정.

## 3. Canonical Interface / 확장 포인트 (코드 0 · Part 3-3+ 재사용)

- **Role Hierarchy Registry/Definition/Version/Node/Edge**: Part 3-1 Role Definition을 Node substrate로, roleRank/admin_level/team_role 암묵 순서를 Category/Actor 축 별도 Registry로 정규화. Edge=명시 Type+Direction+Propagation Policy. In-place Update 금지·Version 순신규.
- **Composite Role/Component/Nested**: Mandatory/Optional/Excluded/Conditional Component(=Role Definition). Deduplicated Restricted Union+Deny Always Propagate+Excluded Remove. Nested=Versioned Flattening Projection(무제한 재귀 금지).
- **Role Graph/Path/Closure/Effective Set**: Ancestor/Descendant/Transitive Closure·Effective Inherited Role Set·Effective Composite Role Set·Path Evidence. Canonical Sorting Digest(저장 순서 무관 동일 Digest).
- **Adapter(Part 3-3 Assignment·3-4 Scoped·3-5 Dynamic·3-6 Service/System)**: Hierarchy Resolution Contract·Affected Subject/Assignment Reference·Conditional Component Rule Reference·Actor Eligibility/Composite Mixing Guard만 제공(실 Assignment/Rule/Runtime은 후속).
- **경계 보존**: parent_user_id(Subject 관계)·menu_tree(메뉴)·SSO map(IAM Adapter)은 Role Graph 밖.

## 4. 대안 (Considered)

- **A. 지금 Role Graph(30+ Entity·Resolver·Cycle Algorithm·Composite Aggregation) 구현** — 기각. 결합할 Permission Engine 실 구현·Role Definition Version 부재·RP-002 위반·중복 엔진 리스크.
- **B. `parent_user_id`/`menu_tree`를 Role Hierarchy로 재사용** — 기각. §6.1(Organization Hierarchy ≠ Role Hierarchy) 정면 위반·계정/메뉴 도메인 오염. 오용 경계가 정답.
- **C. api_key roleRank 선형 rank를 상속 그래프로 승격** — 기각. 선형 rank≠상속(§6.2)·edge 의미 없음. Category/Actor 축 정규화만.
- **D. 설계 명세만(코드 0)+실존 substrate 경계 결정+Gap 등재+선행 전제 명문화** — **채택**. 06-A 계열 일관·Part 1/2/3-1 동형.

## 5. 귀결 (Consequences)

- (+) 위계 유사 substrate 3종(roleRank/parent_user_id/menu_tree)의 정체(Role Graph 아님)·오용 경계·Role Graph 밖 유지 결정 확정("발명 아닌 조립+분리").
- (+) Part 3-2 도메인 전체가 순신규임을 grep 0건으로 실증 → "부분 미비 보완"이 아니라 "Canonical Role Graph 제로 신설"임을 명문화(투기성 스키마 방지).
- (+) Role≠Organization≠Permission Hierarchy≠Permission Group 4분리·Edge 명시 의미론·Safety-first Aggregation/Guard·Mandatory Control 설계 정본.
- (+) 정직 판정(Composite/Graph/Cycle/Diamond/Conflict/Adapter 부재·parent_user_id/menu_tree 오용 아님) — 오탐/날조 방지.
- (+) Part 3-3 Assignment가 재사용할 Hierarchy Resolution Contract·Affected Assignment Reference 준비.
- (−) 이번 차수 런타임 기능 증가 0(설계).
- (→) 다음: **Part 3-3 Role Assignment Governance**. 실 Role Graph 엔진=선행 Permission Engine 실구현 + 별도 승인세션(RP-002).
- (★부수) 설계 전수조사 중 2 스레드 교차확인한 **실 결함 2건**(설계 코드 0·수정 아님·후속 fix 세션 후보): ① AdminMenu `required_role` 쓰기 ROLE_ENUM↔읽기 rank 데드락(`AdminMenu.php:247,338,343-346`·super_admin/moderator 저장 시 메뉴 영구 비노출) ② SSO group→role 부분 배선(OIDC/SAML 로그인은 groups 미전달·SCIM만 실효·`EnterpriseAuth.php:240,294,374-375`). 상세=[`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](../segmentation/DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md) §D-8.

## 6. 규율 준수

Golden Rule(Extend not Replace·중복 Hierarchy/Composite/Graph/Resolver 신설 금지·폐기 admin_roles 재부활 금지·parent_user_id/menu_tree Role Graph 오흡수 금지) · 무후퇴 · "결론의 근거도 재실증"(roleRank/parent_user_id/menu_tree/team_role→acl/SSO map/Composite·Graph·Cycle 부재 전부 grep/코드 정독으로 확정) · Role≠Organization≠Permission Hierarchy≠Permission Group · Mandatory Control 무력화 금지 · 코드 변경 0(설계) · NOT_CERTIFIED · BLOCKED_PREREQUISITE · RP-002 · 부재 날조 금지 · 289차 P1~P4 재플래그 금지 · GROUND_TRUTH 외 인용 금지.
