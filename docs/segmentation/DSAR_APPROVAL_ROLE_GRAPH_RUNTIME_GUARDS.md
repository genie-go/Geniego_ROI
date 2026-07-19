# DSAR — Role Graph Runtime Guards (EPIC 06-A-03-02-03-04 Part 3-2 · Role Hierarchy & Composite Role Governance)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2) + Role Registry Version Binding(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · 무후퇴 · 성능 이유로 Cycle Detection/Deny/Tenant Isolation/Scope Guard/Version Binding 제거 금지 · 반날조(file:line은 상위 ADR·전수조사 2문서만 인용·없으면 ABSENT) · 폐기 admin_roles 재부활 금지 · 289차 P1~P4 재플래그 금지

---

## 1. 목적

§69(최소 Runtime Guard)의 **Role Graph 해석·Composite 조립·Assignment 결합 런타임 시점 강제 가드 29종** 목록을 정의한다. static lint(저장 시점)와 달리 본 가드는 실제 Role 해석(resolve)·Effective Set 계산·Edge Traversal 순간에 판정한다. ★전수조사 결론상 **Role Hierarchy/Composite/Graph 도메인 전체가 순신규(grep 0건)**이므로, 이 저장소에 "Role Graph 전용 런타임 가드"는 **존재하지 않는다**. 최근접 참조는 위계 유사 substrate 3종(roleRank·parent_user_id·menu_tree)의 기존 가드와, Role이 아닌 도메인(메뉴·PM 태스크)의 동형 알고리즘 패턴뿐이며, 이들은 §5.2상 대부분 ABSENT 또는 PARTIAL·근접참조로만 인용한다.

## 2. Canonical 필드

Runtime Guard 레코드가 갖춰야 할 필드(전부 순신규 · 코드 0):

- **Guard Code** — §70 Error Contract 코드와 1:1 대응(예: `_HIERARCHY_CIRCULAR_REFERENCE` 위반 시 `APPROVAL_ROLE_HIERARCHY_CIRCULAR_REFERENCE`)
- **Guard Category** — `REGISTRY_VERSION` / `GRAPH_STRUCTURE`(Cycle·Depth·Diamond) / `COMPOSITE_INTEGRITY` / `PERMISSION_DENY_SCOPE` / `ACTOR_ELIGIBILITY` / `DEPENDENCY_EXCLUSION` / `LIFECYCLE`(Retired/Deprecated) / `TENANT_REGISTRY_ISOLATION` / `EVIDENCE_INTEGRITY`(Snapshot·Digest·Path Evidence·Drift·Cache·Tamper) / `RUNTIME_SECURITY`(Bypass)
- **Trigger Condition** — 판정 조건(§69 원문 문구)
- **Enforcement Point** — `RESOLVE_TIME`(해석 시) / `WRITE_TIME`(Edge·Component 등록) / `ASSIGNMENT_TIME`(Part 3-3 결합) / `CACHE_READ_TIME`
- **Blocking Scope** — `HARD_BLOCK`(요청 거부) / `EXCLUDE_FROM_RESULT`(Effective Set에서 제외) — 고객 설정으로 완화 불가(ADR D-4 §6.16 Mandatory Control)
- **Related Error Code** — §70(본 배치 파일 2) 참조
- **Evidence Reference** — Path Evidence·Graph Snapshot·Digest 참조(전부 ABSENT)

## 3. 열거형 / 타입

### 3.1 §69 Runtime Guard 29항 + 판정

| # | §69 런타임 가드 | 현행 최근접 (substrate file:line) | 판정 |
|---|---|---|---|
| 1 | Hierarchy Registry/Definition Missing → 차단 | Registry/Definition 전무 | ABSENT |
| 2 | Active Hierarchy Version Missing → 차단 | Version 개념 전무 | ABSENT |
| 3 | Composite Role/Version Missing → 차단 | team_role→acl_permission 묶음(`TeamPermissions.php:152`)은 Role→Permission 매핑이지 Composite Role 아님(§6.3) | ABSENT |
| 4 | Role Node/Version Missing → 차단 | Node substrate=Part 3-1 Role Definition(그 자체가 설계 단계·코드 0) | BLOCKED_PREREQUISITE(Part 3-1) |
| 5 | Role Inactive/Suspended/Retired → 차단 | Role Lifecycle 상태 컬럼 전무 | ABSENT |
| 6 | Permission Version Missing → 차단 | Permission Version 결합 부재(Part 2 미구현) | BLOCKED_PREREQUISITE(Part 2) |
| 7 | Tenant Mismatch → 차단 | tenant 격리 실재 — `parent_user_id` 하위계정 tenant_id 상속·교차테넌트 불가(`UserAuth.php:423-426`) — 이나 Role Graph 전용 tenant 대조는 부재 | PARTIAL |
| 8 | Cross-Tenant Edge → 차단 | Role↔Role Edge 자체 부재(신설 대상·ADR D-4 §6.14) | ABSENT |
| 9 | Cross-Registry Edge Unapproved → 차단 | SSO group→role 평면 매핑(`EnterpriseAuth.php:78-88`)이 Cross-registry Adapter로 실재하나 승인 개념 없는 1-hop 매핑일 뿐 Edge 승인 게이트 아님 | PARTIAL |
| 10 | Circular Hierarchy/Composite → 차단 | Role 대상 Cycle Detection 전무. 비-Role 도메인 근접: menu_tree `wouldCycle`(조상체인 walk+self-ref 즉시차단·depth<100·`AdminMenu.php:540-555`) | ABSENT(근접패턴만) |
| 11 | Maximum Depth Exceeded → 차단 | 상동(menu `wouldCycle` depth<100 가드가 근접 참조·Role 전용 Depth Guard 전무) | ABSENT(근접패턴만) |
| 12 | Duplicate Component Ambiguity → 차단 | Composite Component 개념 전무(대상 없음) | ABSENT |
| 13 | Diamond Inheritance Conflict → 차단 | 전무 | ABSENT |
| 14 | Permission Conflict → 차단 | Permission Version 결합 부재 | BLOCKED_PREREQUISITE(Part 2) |
| 15 | Explicit Deny Conflict → 차단 | team_role→acl_permission 매핑은 Allow형(`TeamPermissions.php:152`)이며 Deny 전파 개념 전무 | ABSENT |
| 16 | Scope Expansion → 차단 | `effectiveScope`(owner=null·상속·실패시 `DENY_SCOPE` fail-closed·`TeamPermissions.php:236-265`)가 근접 패턴이나 Role Graph Scope Aggregation 전용 Expansion Guard 아님 | PARTIAL |
| 17 | Actor Eligibility Conflict → 차단 | api_key role(API_CLIENT축)·team_role(HUMAN축) 분리는 실재하나(Part 3-1 재확인) Composite eligibility 교집합 강제 개념 전무 | ABSENT |
| 18 | Human·Machine Role Conflict → 차단 | 상동 | ABSENT |
| 19 | Missing Dependency → 차단 | Role Dependency 개념 전무 | ABSENT |
| 20 | Excluded Role Included → 차단 | Exclusion 개념 전무 | ABSENT |
| 21 | Deprecated Role New Inclusion → 차단 | Deprecated Lifecycle 전무 | ABSENT |
| 22 | Graph Version Mismatch → 차단 | Graph Version 전무 | ABSENT |
| 23 | Graph Digest Mismatch → 차단 | Digest 전무 | ABSENT |
| 24 | Path Evidence Missing → 차단 | Path Evidence 전무 | ABSENT |
| 25 | Graph Snapshot Missing → 차단 | Role Graph Snapshot 전무. 비-Role 근접: `menu_defaults`(snapshot_data·version·reset 롤백지점·`AdminMenu.php:119-122,295-311,583-589`) | ABSENT(근접패턴만) |
| 26 | Graph Drift → 차단 | Drift/Revalidation/Reconciliation 개념 전무 | ABSENT |
| 27 | Cache Integrity Failure → 차단 | Graph Cache·Version 결합 캐시 무결성 전무 | ABSENT |
| 28 | Runtime Bypass Attempt → 차단 | ★반대 실례 실재 — `isAdmin` plan god flag가 전역 우회(`TeamPermissions.php:132`) → 차단이 아닌 우회 사례 | ANTI_PATTERN(§6.5) |
| 29 | Tamper Detected → 차단 | Role Graph Version/Snapshot tamper 탐지 전무. 근접(비-Role): `menu_audit_log` hash_chain(append만·`AdminMenu.php:123-131,169-219`)은 **tamper-evident가 아님**([[reference_menu_audit_log_not_tamper_evident]]) — Role Graph tamper 가드는 이를 tamper-evident로 오인용 금지 | ABSENT(근접패턴만) |

**전사 29항**: `ABSENT` 22 · `PARTIAL` 3(#7·9·16) · `BLOCKED_PREREQUISITE` 3(#4·6·14) · `ANTI_PATTERN` 1(#28).

## 4. 실 substrate 매핑 (§5.2)

| Canonical 가드축 | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| api_key roleRank RBAC 미들웨어 | **CANONICAL(별개 actor·API_CLIENT·Role Graph 밖)** | `index.php:573,592-595` |
| parent_user_id tenant 상속 | **Organization Hierarchy Candidate(Role Graph 밖·§6.1)** | `UserAuth.php:176,316,423-426` |
| menu_tree cycle guard(`wouldCycle`) | **근접 알고리즘 패턴(메뉴 도메인·Role Graph 아님)** | `AdminMenu.php:540-555` |
| menu_defaults snapshot | **근접 알고리즘 패턴(메뉴 도메인)** | `AdminMenu.php:119-122,295-311,583-589` |
| menu_audit_log hash_chain | **비-tamper-evident 근접(장식·정본 아님)** | `AdminMenu.php:123-131,169-219` |
| team_role→acl_permission (묶음) | **Permission Group Candidate(Composite 아님·§6.3)** | `TeamPermissions.php:152` |
| effectiveScope fail-closed | **근접 알고리즘 패턴(Scope Propagation 참조)** | `TeamPermissions.php:236-265` |
| plan god flag 전역 우회 | **ANTI_PATTERN(§6.5·Runtime Bypass 실례)** | `TeamPermissions.php:132` |
| SSO group→role 평면 매핑 | **IAM Group Nesting Candidate(Adapter·Cross-registry)** | `EnterpriseAuth.php:78-88` |
| Role Graph/Composite/Cycle/Diamond/Snapshot/Digest/Cache/Tamper 전용 가드 | **ABSENT → 신설** | 없음(grep 0건) |

## 5. 설계 원칙

1. **Registry/Graph 부재 상태에서는 "차단"이 아니라 "가드 대상 부재"** — 29항 중 22항은 대응할 Role Graph substrate 자체가 없어 판정할 대상이 없다(§5.2 순신규). 실 가드는 Canonical Role Graph 데이터층 신설이 선행.
2. **근접 알고리즘 패턴은 참조이지 재사용 대상이 아니다** — `wouldCycle`(#10·11)·`menu_defaults`(#25)·`menu_audit_log`(#29)는 메뉴 도메인 구조이며, Role Graph 가드가 이들을 직접 재사용하면 §6.1(Organization/메뉴 Hierarchy를 Role Hierarchy로 오흡수) 위반.
3. **plan god flag(#28)는 후속 정합 대상** — §6.5 위반이나 광범위 영향으로 본 차수 등재만(수정 아님).
4. **Cross-Tenant Edge(#8) 가드는 신규 Edge 개념과 동시 신설** — 기존 tenant 격리(#7 PARTIAL)는 계정/데이터 스코프 축이지 Role Graph Edge 전용 격리가 아니므로 별도 강제 필요.
5. **성능 이유로 완화 금지(ADR D-4 §6.16)** — Cycle Detection·Explicit Deny·Tenant Isolation·Scope Guard·Version Binding은 고객 설정으로도 비활성화 불가(Mandatory Control).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE**: #4(Role Node/Version — Part 3-1 이후) · #6·#14(Permission Version — Part 2 이후).
- **PARTIAL(최근접 존재·Role Graph 전용 아님)**: #7(Tenant)·#9(Cross-Registry)·#16(Scope Expansion).
- **ANTI_PATTERN(§6.5)**: #28(plan god flag 전역 우회) — 후속 정합 대상(본 차수 수정 아님).
- **ABSENT(순신규, 근접 패턴 참조만 가능)**: 나머지 22항.
- **판정**: NOT_CERTIFIED · 실 가드 = Canonical Role Graph 신설 + Part 2/3-1 실구현 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_ROLE_HIERARCHY_ERROR_WARNING_CONTRACT]] · [[DSAR_APPROVAL_ROLE_HIERARCHY_API_CONTRACT]] · [[DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE]]
