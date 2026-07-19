# GeniegoROI Enterprise Engineering Handbook

## EPIC 06-A-03-02-03-04 — Part 3-2

# Role Hierarchy & Composite Role Governance

Version 1.0

> **영속 메모**: 본 문서는 사용자 제공 스펙 원문(verbatim)을 289차 후속 회차에 그대로 저장한 것이다. 설계 거버넌스 파이프라인(ⓐ스펙 선영속 → ⓑ 전수조사 ground-truth 2편 → ⓒ ADR → ⓓ per-entity DSAR wave)의 ⓐ 단계 산출물. **코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**. 실 엔진 구현은 선행 Permission Engine/Decision Core 실구현 후 별도 승인세션(RP-002). 내용 임의 수정 금지.

---

# 0. 작업 목적

앞 단계에서 구축한 다음 기반 위에 Enterprise급 **Role Hierarchy & Composite Role Governance**를 구축하라.

* Actor Identity Assurance & Authentication Binding Governance
* Authorization Registry Foundation Governance
* Permission Engine Foundation Governance
* Role Registry Foundation Governance
* Canonical Subject
* Effective Actor
* Actor Type
* Tenant Membership
* Legal Entity Membership
* Organization Membership
* Authorization Registry
* Authorization Policy
* Authorization Context
* Authorization Decision
* Permission Registry
* Permission Definition
* Permission Definition Version
* Permission Group
* Permission Bundle
* Permission Grant
* Permission Deny
* Effective Permission Set
* Permission Graph
* Permission Snapshot
* Permission Evidence
* Role Registry
* Role Namespace
* Role Definition
* Role Definition Version
* Role Type
* Role Category
* Role Domain
* Role Actor Eligibility
* Role Risk Classification
* Role Criticality
* Role Lifecycle
* Role Permission Mapping
* Role Permission Group Mapping
* Role Permission Bundle Mapping
* Role Scope Requirement
* Role Assignment Policy Foundation
* Role Ownership
* Role Review Policy
* Role Certification Foundation
* Role Snapshot
* Role Evidence
* Role Digest
* Role Drift Foundation

이번 Part는 RBAC Governance의 두 번째 핵심 단계다.

이번 단계의 핵심 목적은 GeniegoROI 플랫폼의 Role 간 상속, 포함, 조합, 특수화 및 제한 관계를 단순한 Parent ID, 문자열 배열 또는 Framework Composite Role 기능으로 처리하지 않고 다음 특성을 갖는 Canonical Enterprise Role Graph로 구축하는 것이다.

* Canonical
* Versioned
* Tenant-isolated
* Directed
* Acyclic by default
* Scope-aware
* Permission-aware
* Risk-aware
* Actor-eligibility-aware
* Conflict-aware
* Dependency-aware
* Explicit-deny-aware
* Auditable
* Evidence-backed
* Immutable-snapshot-based
* Simulation-ready
* Migration-ready
* Runtime-enforceable

이번 단계에서는 다음 질문에 일관되고 재현 가능하게 답할 수 있어야 한다.

* 어떤 Role이 어떤 Role을 포함하는가
* Parent Role과 Child Role의 의미는 무엇인가
* Parent가 Child의 Permission을 상속하는가
* Child가 Parent의 Permission을 상속하는가
* Hierarchy Direction은 무엇인가
* Role 간 관계가 포함인지 특수화인지 제한인지
* Composite Role은 어떤 구성 Role을 포함하는가
* 구성 Role의 어떤 Version이 Composite Role에 결합되는가
* Role Hierarchy의 Active Version은 무엇인가
* Hierarchy 변경이 기존 Effective Role과 Permission을 확대하는가
* Role 상속으로 Scope가 확대되는가
* 상위 Role의 Broad Scope가 하위 Role의 Narrow Scope를 덮어쓰는가
* Explicit Deny가 Role 상속 중에도 유지되는가
* Excluded Permission이 Composite Role에서 다시 유입되는가
* Role Conflict가 Composite Role 구성 시 탐지되는가
* Human Role과 Machine Role이 하나의 Composite Role에 혼합되는가
* Approval Role과 Requester Role이 독성 조합으로 결합되는가
* Temporary 또는 Emergency Role이 일반 Composite Role에 포함되는가
* Deprecated 또는 Retired Role이 Active Hierarchy에 포함되는가
* Circular Hierarchy가 존재하는가
* Indirect Cycle이 존재하는가
* 동일 Role이 여러 경로로 중복 상속되는가
* 여러 상속 경로에서 서로 다른 Scope나 Constraint가 적용되는가
* Diamond Inheritance가 권한 중복이나 확대를 일으키는가
* Composite Role 안에서 Permission Allow와 Deny가 충돌하는가
* Hierarchy Edge가 어느 Tenant와 Registry에 속하는가
* Cross-Tenant Role 상속이 존재하는가
* Role Graph Digest가 현재 Graph와 일치하는가
* 과거 Hierarchy Snapshot이 현재 Graph 변경으로 재해석되는가
* Effective Inherited Role Set을 어떻게 계산하는가
* Effective Composite Permission Set을 어떻게 계산하는가
* Role Hierarchy Cache는 어떤 Version에 결합되는가
* Hierarchy 변경 시 어떤 Subject와 Assignment가 영향을 받는가
* Legacy IAM Composite Role을 Canonical Role Graph로 어떻게 이전하는가
* 후속 Role Assignment Governance가 Hierarchy Resolution을 안전하게 재사용할 수 있는가

이번 Part에서는 실제 Subject Role Assignment 전체를 구현하지 않는다.

이번 Part에서는 Role Definition 간 관계, Hierarchy, Composite Role, Graph, 상속, 충돌, Scope 전파, Effective Inherited Role Resolution 및 Runtime Guard를 구축한다.

실제 특정 Subject에게 Role을 부여하고 해제하는 기능은 Part 3-3에서 구현한다.

---

# 1. 이번 Part의 구현 범위

다음을 구현하라.

1. Role Hierarchy Registry
2. Role Hierarchy Definition
3. Role Hierarchy Version
4. Role Hierarchy Type
5. Role Hierarchy Direction
6. Role Hierarchy Policy
7. Role Hierarchy Root
8. Role Hierarchy Node
9. Role Hierarchy Edge
10. Parent Role
11. Child Role
12. Ancestor Role
13. Descendant Role
14. Sibling Role
15. Role Inclusion
16. Role Inheritance
17. Role Specialization
18. Role Restriction
19. Role Exclusion
20. Role Dependency
21. Role Implication
22. Role Conflict
23. Role Mutual Exclusion
24. Role Compatibility
25. Role Composition Policy
26. Composite Role
27. Composite Role Version
28. Composite Role Component
29. Mandatory Component Role
30. Optional Component Role
31. Excluded Component Role
32. Conditional Component Role Reference
33. Nested Composite Role
34. Composite Role Maximum Depth
35. Composite Role Actor Eligibility
36. Composite Role Scope Requirement
37. Composite Role Permission Aggregation
38. Composite Role Permission Deny Aggregation
39. Composite Role Risk Aggregation
40. Composite Role Criticality Aggregation
41. Composite Role Ownership
42. Composite Role Lifecycle
43. Composite Role Snapshot
44. Composite Role Evidence
45. Role Graph
46. Role Graph Version
47. Role Graph Node
48. Role Graph Edge
49. Role Graph Projection
50. Role Graph Digest
51. Role Graph Snapshot
52. Role Path
53. Role Path Resolution
54. Shortest Role Path
55. All Role Paths
56. Role Path Evidence
57. Direct Inheritance
58. Transitive Inheritance
59. Inheritance Depth
60. Inheritance Distance
61. Inheritance Source Chain
62. Effective Inherited Role Set
63. Effective Composite Role Set
64. Effective Role Graph Result
65. Effective Role Permission Projection
66. Effective Role Deny Projection
67. Role Permission Merge
68. Role Permission Deduplication
69. Role Permission Precedence
70. Role Scope Propagation
71. Role Scope Intersection
72. Role Scope Reduction
73. Role Scope Expansion Guard
74. Role Constraint Propagation
75. Role Actor Eligibility Intersection
76. Role Validity Intersection
77. Role Risk Escalation
78. Role Criticality Escalation
79. Role Conflict Detection
80. Role Conflict Resolution Policy
81. Role Ambiguity Detection
82. Role Diamond Inheritance Detection
83. Duplicate Inheritance Detection
84. Circular Hierarchy Detection
85. Circular Composite Detection
86. Self-reference Detection
87. Cross-Tenant Edge Detection
88. Cross-Registry Edge Governance
89. Deprecated Role Edge Detection
90. Retired Role Edge Blocking
91. Suspended Role Edge Enforcement
92. Missing Role Version Detection
93. Missing Permission Version Detection
94. Hierarchy Version Binding
95. Composite Version Binding
96. Role Graph Cache
97. Hierarchy Cache
98. Composite Role Cache
99. Role Graph Cache Key
100. Role Graph Cache Invalidation
101. Role Hierarchy Drift
102. Composite Role Drift
103. Role Graph Drift
104. Role Hierarchy Revalidation
105. Composite Role Revalidation
106. Role Graph Reconciliation
107. Role Hierarchy Simulation
108. Composite Role Simulation
109. Role Graph Impact Analysis
110. Affected Subject Reference Foundation
111. Affected Assignment Reference Foundation
112. Role Hierarchy Migration
113. Legacy Composite Role Migration
114. IAM Role Hierarchy Adapter
115. ERP Role Hierarchy Adapter
116. Workflow Role Hierarchy Adapter
117. Existing Hierarchy Discovery
118. Duplicate Hierarchy Audit
119. Duplicate Composite Role Audit
120. Existing Graph Consolidation
121. Role Hierarchy Static Lint
122. Composite Role Static Lint
123. Role Graph Runtime Guard
124. Error Contract
125. Warning Contract
126. API Contract
127. Database Constraint
128. Index Strategy
129. Performance Strategy
130. Unit Test
131. Property Test
132. Integration Test
133. Security Test
134. Concurrency Test
135. Migration Test
136. Regression Test
137. Documentation
138. ADR
139. PM Change History
140. Repeat Problem History
141. Agent Execution History
142. Completion Gate

---

# 2. 이번 Part에서 상세 구현하지 않을 것

## Part 3-3 — Role Assignment Governance

후속 단계에서 상세 구현한다.

* Subject Role Assignment
* Role Assignment Version
* Direct Assignment
* Group Assignment
* Temporary Assignment
* Emergency Assignment
* Assignment Approval
* Assignment Revocation
* Assignment Suspension
* Assignment Expiration
* Assignment Snapshot
* Assignment Evidence

이번 Part에서는 Hierarchy 또는 Composite Role을 특정 Subject Assignment에 적용할 수 있는 Resolution Contract와 Affected Assignment Reference만 제공하라.

## Part 3-4 — Scoped Role Governance

후속 단계에서 상세 구현한다.

* Assignment-specific Tenant Scope
* Legal Entity Scope
* Organization Scope
* Resource Scope
* Project Scope
* Region Scope
* Amount Scope
* Time Scope
* Environment Scope

이번 Part에서는 Role Definition의 Scope Requirement와 Edge Scope Propagation Policy를 사용한다.

## Part 3-5 — Dynamic Role Governance

후속 단계에서 상세 구현한다.

* Attribute-based Role
* Rule-based Role
* Conditional Role
* Session Role
* Runtime Role

이번 Part에서는 Conditional Component Role의 Rule Reference Interface만 구축하라.

## Part 3-6 — Service/System Role Governance

후속 단계에서 상세 구현한다.

* Service Account Role Assignment
* System Actor Role Assignment
* API Client Role Assignment
* Machine Identity Runtime Policy

이번 Part에서는 Actor Eligibility와 Composite Mixing Guard만 구현하라.

## Part 3-7 — Effective Role Resolution Engine

후속 단계에서 Subject Assignment, Dynamic Role, Scoped Role 및 Runtime Context를 통합한다.

이번 Part에서는 Role Definition Graph 자체의 Effective Inheritance Resolution을 완성하라.

---

# 3. 실행 역할

너는 다음 역할을 동시에 수행한다.

* Enterprise RBAC Hierarchy Architect
* Canonical Role Graph 책임자
* Role Hierarchy Registry 책임자
* Role Hierarchy Versioning 책임자
* Composite Role 책임자
* Role Inheritance 책임자
* Role Graph Algorithm 책임자
* Permission Aggregation 책임자
* Explicit Deny Propagation 책임자
* Scope Propagation 책임자
* Scope Expansion Protection 책임자
* Role Conflict Detection 책임자
* Circular Reference Protection 책임자
* Actor Eligibility 책임자
* Role Risk Aggregation 책임자
* Role Graph Snapshot 책임자
* Role Graph Evidence 책임자
* Role Graph Digest 책임자
* Hierarchy Cache 책임자
* Role Graph Drift 책임자
* Legacy Composite Migration 책임자
* IAM·ERP·Workflow Adapter 책임자
* Static Analysis 책임자
* Runtime Enforcement 책임자
* Regression Protection 책임자
* ADR·PM·Agent History 책임자

---

# 4. 선행조건 검증

작업 시작 전에 다음 기반을 확인하라.

## 4.1 Role Registry Foundation

* Role Registry
* Role Namespace
* Role Definition
* Role Definition Version
* Role Type
* Role Category
* Role Domain
* Role Actor Eligibility
* Role Risk
* Role Criticality
* Role Lifecycle
* Role Permission Mapping
* Role Permission Group Mapping
* Role Permission Bundle Mapping
* Role Scope Requirement
* Role Assignment Policy
* Role Owner
* Role Review Policy
* Role Certification Policy
* Role Snapshot
* Role Evidence
* Role Digest
* Role Drift Foundation

## 4.2 Permission Foundation

* Permission Registry
* Permission Definition
* Permission Version
* Permission Scope
* Permission Constraint
* Permission Dependency
* Permission Conflict
* Permission Exclusion
* Permission Implication
* Permission Group
* Permission Bundle
* Permission Graph
* Explicit Deny
* Effective Permission Set
* Effective Deny Set
* Permission Snapshot
* Permission Evidence
* Permission Digest

## 4.3 Identity Foundation

* Canonical Subject
* Actor Type
* Human Actor
* Service Account
* System Actor
* API Client
* Tenant Membership
* Legal Entity Membership
* Organization Membership

## 4.4 Organization Foundation

* Tenant
* Legal Entity
* Organization
* Organization Hierarchy
* Organization Hierarchy Version
* Business Unit
* Project
* Region Reference

## 4.5 Integrity Foundation

* Canonical Serialization
* Immutable Snapshot
* Digest Envelope
* Audit Ledger
* Evidence Store
* Tamper Detection

누락된 선행조건이 있으면 중복 Entity를 생성하지 말고 Gap과 Adapter Requirement를 기록하라.

---

# 5. 기존 Role Hierarchy 및 Composite 구현 전수 조사

Repository, Database, Backend, Frontend, Mobile, IAM, ERP, Workflow Engine, API Gateway, Admin Console, Batch 및 Configuration을 전수 조사하라.

다음 키워드를 검색하라.

Role Hierarchy · Role Tree · Role Graph · Parent Role · Child Role · Ancestor Role · Descendant Role · Nested Role · Composite Role · Composite Roles · Role Composition · Role Include · Role Includes · Included Role · Inherited Role · Role Inheritance · Role Extends · Role Parent · Role Child · Role Group · Role Bundle · Role Set · Role Profile · Role Template · Master Role · Base Role · Derived Role · Specialized Role · Restricted Role · Read-only Role · Admin Composite · Manager Composite · Approver Composite · Realm Role · Client Role · Keycloak Composite · IAM Composite · LDAP Nested Group · AD Nested Group · Security Group Nesting · ERP Composite Role · ERP Derived Role · Workflow Role Group · Workflow Role Inheritance · Parent Permission · Child Permission · Effective Role · Effective Roles · Resolve Roles · Flatten Roles · Expand Roles · Traverse Roles · Role DFS · Role BFS · Transitive Role · Role Closure · Role Path · Role Edge · Role Node · Circular Role · Cyclic Role · Diamond Inheritance · Multiple Inheritance · Role Conflict · Role Exclusion · Role Dependency · Role Compatibility · Role Constraint · Role Scope Inheritance · Role Permission Merge · Role Deny · Role Precedence · Role Priority · Role Level · Role Rank · Role Weight · Role Depth · Role Hierarchy Version · Composite Version · Graph Version · Role Graph Cache · Role Tree Cache · Role Resolver · Role Flattening · Role Snapshot · Role Graph Snapshot · Role Audit · Role Migration · Legacy Composite Role · Git History · Incident · Security Finding · Audit Finding · Repeat Problem

## 5.1 조사 대상

Database Table · Parent ID Column · Closure Table · Adjacency List · Materialized Path · Nested Set · Graph Database · ORM Relation · Enum · JSON Configuration · YAML Configuration · IAM Realm · Keycloak Role Mapping · LDAP Group · Active Directory Group · ERP Composite Role · Workflow Group · API Claim · JWT Claim · OAuth Role · Frontend Role Array · Mobile Role Array · Middleware · Role Resolver · Permission Resolver · Cache · Migration Script · Seed Data · Test Fixture · Documentation

## 5.2 기존 구현 분류

각 구현을 다음으로 분류하라.

Canonical Hierarchy Candidate · Canonical Composite Candidate · Canonical Role Graph Candidate · Role Inclusion Candidate · Role Specialization Candidate · Role Restriction Candidate · Role Dependency Candidate · Role Conflict Candidate · Permission Group Candidate · Permission Bundle Candidate · Organization Hierarchy Candidate · IAM Group Nesting Candidate · Legacy Composite Role · Framework-specific Composite · Hardcoded Parent-child · JSON Role Hierarchy · Unversioned Hierarchy · Cross-Tenant Hierarchy Risk · Circular Hierarchy Risk · Duplicate Hierarchy · Duplicate Composite Role · Ambiguous Inheritance · Scope Expansion Risk · Explicit Deny Loss Risk · Machine·Human Role Mixing Risk · Deprecated Role Edge · Retired Role Edge · Migration Required · Consolidation Required · Keep Separate with Reason · Test-only · Unknown

---

# 6. 핵심 원칙

## 6.1 Role Hierarchy는 Organization Hierarchy가 아니다

조직의 상하 관계를 Role 상속 관계로 자동 변환하지 마라. 상위 직급이 하위 직급의 모든 시스템 Permission을 자동 상속하지 않도록 하라.

## 6.2 Role Hierarchy는 Permission Hierarchy가 아니다

Role 간 상속과 Permission 간 Implication을 분리하라. Role Graph가 Permission Graph를 복제하지 않도록 하라.

## 6.3 Composite Role은 Permission Group이 아니다

Permission Group은 Permission 묶음이고 Composite Role은 여러 Role Definition을 조합한 Role이다.

## 6.4 Parent와 Child의 의미를 명시한다

`parent_id`만 저장하지 말고 Edge Type과 Inheritance Direction을 명확히 저장하라.

## 6.5 Versioned Graph를 사용한다

Hierarchy Edge를 In-place Update하지 마라. Graph 변경 시 새 Hierarchy Version 또는 Composite Role Version을 생성하라.

## 6.6 Circular Reference를 금지한다

Direct Cycle뿐 아니라 Indirect Cycle도 차단하라.

## 6.7 Default는 Scope Intersection이다

Role 상속으로 Scope가 자동 확대되지 않게 하라.

## 6.8 Explicit Deny를 보존한다

Child 또는 Component Role의 Explicit Deny가 Composite 과정에서 사라지지 않게 하라.

## 6.9 Actor Eligibility는 교집합을 기본으로 한다

Human-only Role과 Machine-only Role을 하나의 Composite Role로 조합하지 마라.

## 6.10 Risk는 최대값 또는 상향 계산한다

Composite Role Risk가 구성 Role보다 낮아지지 않도록 하라.

## 6.11 Deprecated Role을 신규 Graph에 추가하지 않는다

기존 Edge 유지 여부는 Migration Policy에 따르되 신규 Edge는 차단하라.

## 6.12 Retired Role을 Active Graph에서 제거한다

Retired Role을 포함하는 Active Composite Role은 활성화하지 마라.

## 6.13 Diamond Inheritance를 명시적으로 처리한다

중복 경로를 Deduplicate하되 서로 다른 Scope, Deny 또는 Constraint가 있으면 Ambiguity로 처리하라.

## 6.14 Cross-Tenant Edge를 차단한다

Platform Registry의 명시적 Cross-registry Policy가 없는 한 다른 Tenant Role을 연결하지 마라.

## 6.15 Historical Graph를 불변 보존한다

현재 Hierarchy로 과거 Authorization 또는 Assignment를 재해석하지 마라.

## 6.16 고객 설정으로 필수 Control을 제거하지 못하게 한다

다음은 비활성화할 수 없다.

Cycle Detection · Tenant Isolation · Role Version Binding · Permission Version Binding · Explicit Deny Propagation · Scope Expansion Guard · Actor Eligibility Validation · Risk Escalation · Retired Role Blocking · Graph Snapshot · Graph Evidence · Cache Invalidation · Historical Immutability

---

# 7. Canonical Entity

기존 동등 Entity가 없을 경우 최소 다음을 구축하라.

* `APPROVAL_ROLE_HIERARCHY_REGISTRY`
* `APPROVAL_ROLE_HIERARCHY`
* `APPROVAL_ROLE_HIERARCHY_VERSION`
* `APPROVAL_ROLE_HIERARCHY_NODE`
* `APPROVAL_ROLE_HIERARCHY_EDGE`
* `APPROVAL_ROLE_DEPENDENCY`
* `APPROVAL_ROLE_CONFLICT`
* `APPROVAL_ROLE_EXCLUSION`
* `APPROVAL_ROLE_COMPATIBILITY`
* `APPROVAL_COMPOSITE_ROLE`
* `APPROVAL_COMPOSITE_ROLE_VERSION`
* `APPROVAL_COMPOSITE_ROLE_COMPONENT`
* `APPROVAL_ROLE_GRAPH`
* `APPROVAL_ROLE_GRAPH_VERSION`
* `APPROVAL_ROLE_GRAPH_NODE`
* `APPROVAL_ROLE_GRAPH_EDGE`
* `APPROVAL_ROLE_PATH`
* `APPROVAL_EFFECTIVE_INHERITED_ROLE_SET`
* `APPROVAL_EFFECTIVE_COMPOSITE_ROLE_SET`
* `APPROVAL_ROLE_GRAPH_RESOLUTION_RESULT`
* `APPROVAL_ROLE_GRAPH_SNAPSHOT`
* `APPROVAL_COMPOSITE_ROLE_SNAPSHOT`
* `APPROVAL_ROLE_PATH_EVIDENCE`
* `APPROVAL_ROLE_GRAPH_EVIDENCE`
* `APPROVAL_ROLE_HIERARCHY_DRIFT`
* `APPROVAL_COMPOSITE_ROLE_DRIFT`
* `APPROVAL_ROLE_GRAPH_RECONCILIATION`
* `APPROVAL_ROLE_HIERARCHY_SIMULATION`
* `APPROVAL_ROLE_HIERARCHY_MIGRATION`
* `APPROVAL_ROLE_GRAPH_AUDIT_EVENT`

# 8. Role Hierarchy Registry

`APPROVAL_ROLE_HIERARCHY_REGISTRY`

필수 필드: hierarchy registry id · tenant id · registry code · registry name · registry type · description · supported hierarchy types · supported edge types · multiple inheritance allowed · composite role allowed · nested composite allowed · maximum depth · cross-registry edge allowed · cross-tenant edge allowed · scope propagation default · permission aggregation default · deny propagation required · conflict validation required · actor eligibility validation required · risk escalation required · graph snapshot required · evidence required · audit required · business owner id · technical owner id · security owner id · active version · valid from · valid to · status · immutable digest · evidence

Registry Type: PLATFORM · TENANT · APPROVAL · FINANCIAL · PAYMENT · SETTLEMENT · CONTRACT · SECURITY · COMPLIANCE · DATA · ADMINISTRATION · INTEGRATION · CUSTOM

# 9. Role Hierarchy Definition

`APPROVAL_ROLE_HIERARCHY`

필수 필드: role hierarchy id · hierarchy registry id · tenant id · hierarchy code · hierarchy name · description · hierarchy type · inheritance direction · root role required · multiple roots allowed · multiple inheritance allowed · maximum depth · default edge type · default scope propagation · default permission aggregation · default conflict resolution · default actor eligibility policy · current version id · owner · valid from · valid to · status · immutable digest · evidence

Hierarchy Type: FUNCTIONAL · BUSINESS · APPROVAL · ADMINISTRATIVE · SECURITY · DATA_ACCESS · SERVICE · SYSTEM · API_CLIENT · CUSTOM

Inheritance Direction: PARENT_INHERITS_CHILD · CHILD_INHERITS_PARENT · EXPLICIT_EDGE_DIRECTION_ONLY (기본값=EXPLICIT_EDGE_DIRECTION_ONLY)

# 10. Role Hierarchy Version

`APPROVAL_ROLE_HIERARCHY_VERSION`

필수 필드: hierarchy version id · role hierarchy id · version number · previous version id · version type · root node snapshot · node snapshot · edge snapshot · maximum depth · multiple inheritance policy · scope propagation policy · permission aggregation policy · deny propagation policy · conflict policy · actor eligibility policy · change summary · affected role count · affected assignment reference count · risk impact · scope expansion detected · manual review required · effective from · effective to · created by · reviewed by · approved by · activated at · superseded at · status · immutable digest · evidence

Version Type: INITIAL · NODE_ADD · NODE_REMOVE · EDGE_ADD · EDGE_REMOVE · EDGE_CHANGE · ROOT_CHANGE · DIRECTION_CHANGE · DEPTH_CHANGE · SCOPE_POLICY_CHANGE · PERMISSION_POLICY_CHANGE · DENY_POLICY_CHANGE · CONFLICT_POLICY_CHANGE · ACTOR_POLICY_CHANGE · SECURITY_HARDENING · CORRECTION · MIGRATION · DEPRECATION

# 11. Role Hierarchy Node

`APPROVAL_ROLE_HIERARCHY_NODE`

필수 필드: node id · hierarchy version id · role definition id · role version id · node type · root 여부 · leaf 여부 · abstract 여부 · assignable 여부 · composite 여부 · depth · path key · sequence · valid from · valid to · status · immutable digest · evidence

Node Type: ROOT · INTERMEDIATE · LEAF · ABSTRACT · COMPOSITE · SPECIALIZED · RESTRICTED · CUSTOM. Abstract Node는 직접 Assignment 대상이 되지 않도록 준비하라.

# 12. Role Hierarchy Edge

`APPROVAL_ROLE_HIERARCHY_EDGE`

필수 필드: edge id · hierarchy version id · source node id · target node id · source role version id · target role version id · edge type · inheritance direction · permission propagation policy · deny propagation policy · scope propagation policy · constraint propagation policy · actor eligibility policy · validity propagation policy · transitive 여부 · priority · maximum propagation depth · conflict policy reference · condition reference optional · valid from · valid to · status · immutable digest · evidence

Edge Type: INCLUDES · INHERITS · SPECIALIZES · RESTRICTS · DEPENDS_ON · EXCLUDES · IMPLIES · COMPOSES · CUSTOM

# 13. Role Inclusion

`INCLUDES` Edge는 Source Role이 Target Role의 기능을 포함함을 의미한다. 반드시 명시: 어느 방향으로 Permission이 전파되는가 · Scope가 어떻게 결합되는가 · Deny가 어떻게 전파되는가 · Actor Eligibility가 어떻게 결합되는가 · Validity가 어떻게 결합되는가 · Risk가 어떻게 상향되는가. `INCLUDES`를 단순히 모든 Permission Union으로 구현하지 마라.

# 14. Role Inheritance

Inheritance 지원: Direct · Transitive · Single · Multiple · Scoped · Restricted · Conditional Inheritance Reference · Version-bound. 필수 원칙: Permission Version Binding · Role Version Binding · Tenant 일치 · Lifecycle 유효 · Actor Eligibility 일치 · Scope Expansion 금지 · Explicit Deny 유지 · Conflict 탐지 · Path Evidence 생성.

# 15. Role Specialization

`SPECIALIZES` Edge는 Child/Target Role이 Base Role 기능을 유지하면서 더 제한적/구체적 Scope·Constraint·Permission을 갖는 경우 사용. 예: Payment Approver → Korea Payment Approver → Seoul Organization Payment Approver → High-value Payment Approver Reference. Specialization은 Scope 축소 기본, 자동 확대 금지.

# 16. Role Restriction

`RESTRICTS` Edge는 Source/Target Role의 Permission/Scope를 제한. 지원: Permission Exclusion · Explicit Deny 추가 · Resource Type/Instance 제한 · Organization/Legal Entity 제한 · Field/Data Category 제한 · Channel/Client 제한 · Time 제한 · Actor Type 제한. Restriction이 Allow보다 우선.

# 17. Role Dependency

`APPROVAL_ROLE_DEPENDENCY` — 예: APPROVER requires VIEWER · EXPORTER requires REPORT_VIEWER · CONFIGURATOR requires MODULE_VIEWER.

필수 필드: dependency id · source role definition id · source role version id · required role definition id · required role version id · dependency type · transitive 여부 · scope compatibility required · actor compatibility required · version compatibility required · failure behavior · priority · valid from · valid to · status · immutable digest · evidence

Dependency Type: REQUIRED · RECOMMENDED · CONDITIONAL_REFERENCE · PRECONDITION · CUSTOM. Missing Required Dependency는 Composite 활성화/Effective Resolution 차단.

# 18. Role Conflict

`APPROVAL_ROLE_CONFLICT`

필수 필드: conflict id · role A definition id · role A version id · role B definition id · role B version id · conflict type · severity · same tenant only · same scope only · cross scope behavior · actor type behavior · composition blocked · runtime blocked · SoD rule reference optional · resolution policy reference · valid from · valid to · status · immutable digest · evidence

Conflict Type: MUTUALLY_EXCLUSIVE · TOXIC_COMBINATION_REFERENCE · REQUESTER_APPROVER_CONFLICT · CREATOR_APPROVER_CONFLICT · OPERATOR_AUDITOR_CONFLICT · ADMIN_AUDITOR_CONFLICT · HUMAN_MACHINE_CONFLICT · PERMISSION_CONFLICT · EXPLICIT_DENY_CONFLICT · SCOPE_CONFLICT · ACTOR_ELIGIBILITY_CONFLICT · LIFECYCLE_CONFLICT · CUSTOM. 전체 SoD Governance는 후속 Part, Critical Conflict는 이번 Part에서 Composite 활성화·Runtime Resolution 차단.

# 19. Role Exclusion

`APPROVAL_ROLE_EXCLUSION` — 예: READ_ONLY excludes EDITOR · SUPPORT excludes APPROVER · SERVICE_EXECUTOR excludes MANUAL_OVERRIDE · AUDITOR excludes TRANSACTION_CREATOR.

필수 필드: exclusion id · source role version id · excluded role version id · exclusion direction · scope behavior · permission behavior · actor behavior · severity · runtime enforcement · status · evidence. Exclusion은 Inclusion·Implication보다 우선.

# 20. Role Compatibility

`APPROVAL_ROLE_COMPATIBILITY`

Compatibility Dimension: TENANT · REGISTRY · DOMAIN · ACTOR_TYPE · ROLE_TYPE · PERMISSION · SCOPE_REQUIREMENT · RISK · CRITICALITY · LIFECYCLE · VALIDITY · ASSIGNMENT_POLICY · DELEGATION_POLICY · IMPERSONATION_POLICY · CUSTOM

Result: COMPATIBLE · COMPATIBLE_WITH_RESTRICTIONS · INCOMPATIBLE · MANUAL_REVIEW_REQUIRED · UNKNOWN. Unknown을 자동 Compatible로 처리 금지.

# 21. Composite Role

`APPROVAL_COMPOSITE_ROLE`

필수 필드: composite role id · tenant id · registry id · role definition id · composite code · composite name · description · composition type · mandatory component count · optional component supported · excluded component supported · nested composite allowed · maximum nesting depth · actor eligibility policy · scope aggregation policy · permission aggregation policy · deny aggregation policy · risk aggregation policy · conflict policy · assignment allowed · current version id · business owner id · technical owner id · security owner id · valid from · valid to · status · immutable digest · evidence

Composition Type: FUNCTIONAL · BUSINESS_PROCESS · APPROVAL · ADMINISTRATIVE · SECURITY · DATA_ACCESS · SERVICE · SYSTEM · API_CLIENT · MIGRATION · CUSTOM

# 22. Composite Role Version

`APPROVAL_COMPOSITE_ROLE_VERSION`

필수 필드: composite version id · composite role id · version number · previous version id · component snapshot · mandatory component snapshot · optional component snapshot · excluded component snapshot · actor eligibility snapshot · scope policy snapshot · permission aggregation snapshot · deny aggregation snapshot · risk aggregation snapshot · conflict result snapshot · dependency result snapshot · effective permission digest · effective deny digest · effective scope digest · risk result · criticality result · change summary · scope expansion detected · permission expansion detected · manual review required · effective from · effective to · created by · reviewed by · approved by · activated at · superseded at · status · immutable digest · evidence

# 23. Composite Role Component

`APPROVAL_COMPOSITE_ROLE_COMPONENT`

필수 필드: component id · composite version id · component role definition id · component role version id · component type · required 여부 · sequence · priority · permission propagation policy · deny propagation policy · scope propagation policy · constraint propagation policy · actor eligibility policy · validity propagation policy · condition reference optional · valid from · valid to · status · immutable digest · evidence

Component Type: MANDATORY · OPTIONAL · EXCLUDED · CONDITIONAL_REFERENCE · BASE · SPECIALIZATION · RESTRICTION · CUSTOM

# 24. Nested Composite Role

Nested Composite 지원하되 강제: Maximum Nesting Depth · Circular Reference Detection · Duplicate Component Detection · Version Binding · Tenant Isolation · Actor Eligibility Compatibility · Scope Intersection · Explicit Deny Propagation · Conflict Detection · Risk Escalation · Cache Invalidation · Graph Digest 갱신. Runtime마다 무제한 재귀 금지, Versioned Flattening Projection 제공.

# 25. Composite Role Permission Aggregation

Strategy: DENY_OVERRIDES_UNION · RESTRICTED_UNION · INTERSECTION · MANDATORY_COMPONENT_UNION · EXPLICIT_POLICY · CUSTOM. 기본 권장: Allow=Deduplicated Restricted Union · Explicit Deny=Always Propagate · Excluded=Remove from Effective Allow · Conflicting=Deny/Manual Review · Critical=Explicit Inclusion Required · UI Hint=Server Permission과 분리. 단순 Union 금지.

# 26. Composite Role Scope Aggregation

Strategy: INTERSECTION · MOST_RESTRICTIVE · COMPONENT_SPECIFIC · EXPLICIT_MAPPING · CUSTOM (기본=INTERSECTION/MOST_RESTRICTIVE). Scope Union 필요 시 Scope Expansion Simulation·승인 Hook 요구.

# 27. Composite Role Actor Eligibility

규칙: Human-only+Human-only 허용 가능 · Machine-only+Machine-only 동일 Actor Type일 때 허용 · Human-only+Machine-only 기본 차단 · Service Account+System Actor 기본 차단 · API Client+Human Role 기본 차단 · Employee-only+External User Allowed → 더 제한적 Eligibility · Authentication Assurance → 최대 요구 수준 · Tenant Membership → 모두 충족 · Legal Entity → 교집합/명시적 매핑 · Organization → 교집합/Assignment Scope 검증.

# 28. Composite Role Risk Aggregation

고려: 구성 Role 최대 Risk · Critical/Administrative/Approval/User Administration/Sensitive Data/Export/Override Permission 포함 여부 · Scope Breadth · Actor Type · Temporary/Emergency Assignment 허용 · Conflict 존재 · Explicit Deny 제거 시도. Composite Risk가 구성 Role 최대 Risk보다 낮아지지 않게 하라.

# 29. Role Graph

`APPROVAL_ROLE_GRAPH`

필수 필드: role graph id · tenant id · hierarchy registry id · graph code · graph name · graph type · root count · node count · edge count · maximum depth · cycle free 여부 · multiple inheritance 여부 · active version id · graph digest · valid from · valid to · status · evidence

Graph Type: HIERARCHY · COMPOSITE · COMBINED · MIGRATION · SIMULATION · CUSTOM

# 30. Role Graph Version

`APPROVAL_ROLE_GRAPH_VERSION`

필수 필드: graph version id · role graph id · version number · previous version id · node snapshot · edge snapshot · closure snapshot reference · path snapshot reference · root snapshot · leaf snapshot · cycle detection result · ambiguity result · conflict result · scope expansion result · permission expansion result · affected role count · affected assignment reference count · effective from · effective to · created by · approved by · status · immutable digest · evidence

# 31. Role Graph Node

Node Type: ROLE · COMPOSITE_ROLE · ABSTRACT_ROLE · RESTRICTED_ROLE · SPECIALIZED_ROLE · EXTERNAL_ROLE_REFERENCE · CUSTOM

필수 필드: graph node id · graph version id · node type · role definition id · role version id · composite role version id optional · external source reference optional · tenant id · actor type · risk · criticality · lifecycle status · assignable · depth · immutable digest · evidence

# 32. Role Graph Edge

Edge Type: INCLUDES · INHERITS · SPECIALIZES · RESTRICTS · DEPENDS_ON · EXCLUDES · CONFLICTS_WITH · COMPOSES · SUPERSEDES · ALIAS_REFERENCE · CUSTOM

필수 필드: graph edge id · graph version id · source node id · target node id · edge type · direction · transitive · priority · propagation policy · scope policy · deny policy · actor policy · validity policy · immutable digest · evidence

# 33. Role Path

`APPROVAL_ROLE_PATH`

필수 필드: role path id · graph version id · source node id · target node id · path length · node sequence · edge sequence · path type · effective permission digest · effective deny digest · effective scope digest · actor eligibility digest · risk result · ambiguity detected · conflict detected · valid from · valid to · immutable digest · evidence

Path Type: DIRECT · TRANSITIVE · SHORTEST · ALL_PATHS_REFERENCE · CONFLICT_PATH · EXCLUSION_PATH · CUSTOM

# 34. Effective Inherited Role Set

`APPROVAL_EFFECTIVE_INHERITED_ROLE_SET`

필수 필드: effective inherited set id · tenant id · source role definition id · source role version id · hierarchy version id · direct inherited roles · transitive inherited roles · excluded roles · conflicting roles · dependency roles · source paths · maximum depth reached · actor eligibility result · effective scope requirements · effective validity · effective risk · effective criticality · effective permission projection id · effective deny projection id · set digest · resolved at · valid until · status · evidence

# 35. Effective Composite Role Set

`APPROVAL_EFFECTIVE_COMPOSITE_ROLE_SET`

필수 필드: effective composite set id · tenant id · composite role id · composite role version id · mandatory components · optional components included · excluded components · nested components · component paths · effective permission set · effective deny set · effective scope requirements · effective actor eligibility · effective validity · risk result · criticality result · conflict result · dependency result · effective digest · resolved at · valid until · status · evidence

# 36. Role Permission Merge

순서: 1 Direct Role Permission Mapping 조회 · 2 Permission Group Flattening · 3 Permission Bundle Flattening · 4 Inherited Role Permission · 5 Composite Component Permission · 6 Permission Version 검증 · 7 Permission Lifecycle 검증 · 8 Permission Effect 분리 · 9 Explicit Deny 수집 · 10 Excluded Permission 제거 · 11 Duplicate Deduplication · 12 Scope Intersection · 13 Constraint Intersection · 14 Actor Eligibility 검증 · 15 Conflict 탐지 · 16 Dependency 검증 · 17 Risk 계산 · 18 Effective Permission Digest · 19 Effective Deny Digest · 20 Evidence 생성.

# 37. Permission Deduplication

동일 Permission이 여러 경로로 유입 시 보존: 모든 Source Role · 모든 Role Path · Permission Version · Scope · Constraint · Effect · Priority · Validity · Deny Source. 단순 중복 제거로 Source Chain 소실 금지. 동일 Permission Version·동일 Scope·Constraint만 하나의 Effective Entry로 합칠 수 있다.

# 38. Role Permission Precedence

기본 우선순위: 1 Platform Security Explicit Deny · 2 Tenant Security Explicit Deny · 3 Role Restriction Deny · 4 Composite Excluded Permission · 5 Component Explicit Deny · 6 Inherited Explicit Deny · 7 Role Exclusion · 8 More Specific Scoped Allow · 9 Direct Role Permission · 10 Mandatory Component Permission · 11 Optional Component Permission · 12 Inherited Role Permission · 13 UI Hint · 14 Default Deny. Versioned Policy로 관리.

# 39. Role Scope Propagation

Edge별 Policy: NO_PROPAGATION · INTERSECTION · CHILD_RESTRICTS_PARENT · PARENT_RESTRICTS_CHILD · MOST_SPECIFIC · EXPLICIT_MAPPING · CUSTOM (기본=INTERSECTION). 상위 Broad Scope가 하위 Narrow Scope를 덮어쓰지 않게.

# 40. Role Constraint Propagation

원칙: Required Constraint 유지 · 더 강한 Authentication Assurance · 더 짧은 Validity · 더 낮은 Amount Limit · 더 좁은 Organization/Resource Scope · Deny Constraint 우선 · 상충 Constraint는 Manual Review/Deny · Null Constraint를 무제한으로 해석하지 않음.

# 41. Role Validity Intersection

교집합: Hierarchy Version Validity · Source/Target Role Version Validity · Composite Version Validity · Permission Version Validity · Component Validity · Edge Validity. 가장 빠른 만료를 Effective Valid Until로 사용.

# 42. Role Scope Expansion Guard

탐지: Tenant Scope 추가 · Cross-Tenant Edge · Legal Entity/Organization 추가 · Organization Subtree 확대 · Resource Type 추가 · Resource/Field 제한 제거 · Data Category/Channel 추가 · Client 제한 제거 · Amount 완화 · Time 제한 제거 · Validity 연장 · Wildcard 허용 · Restriction Edge 제거 · Explicit Deny 제거 · Excluded Component 제거 · Broad Parent Role 추가 · Composite Optional Component 자동 포함. High/Critical Expansion은 활성화 차단·승인·Simulation 요구.

# 43. Permission Expansion Guard

탐지: 새 Permission 유입 · Critical/Administrative/Approval/Export/Sensitive Data/User Administration/Override Permission 유입 · Explicit Deny 제거 · Permission Exclusion/Constraint 제거 · Optional Component 기본 활성화 · Transitive Edge 추가 · Maximum Depth 증가 · Multiple Inheritance 허용.

# 44. Circular Hierarchy Detection

탐지: Direct Self-reference · A→B→A · A→B→C→A · Composite A includes Composite A · Composite A includes B & B includes A · Hierarchy Edge↔Composite Edge Cross Cycle · Dependency Cycle · Exclusion Cycle Reference · Supersession Cycle · Alias Cycle · External Mapping Cycle. Tarjan SCC/DFS Color 등 검증된 Algorithm. Cycle 탐지 시 Version 활성화 차단.

# 45. Diamond Inheritance Detection

예: A includes B · A includes C · B includes D · C includes D. 검증: D Permission 중복 · 서로 다른 D Version/Scope Propagation/Constraint/Deny/Validity/Actor Eligibility/Priority. 완전 동일 시 Deduplicate 가능, 차이 시 Ambiguity/Conflict.

# 46. Role Ambiguity Detection

탐지: 동일 Role Code 여러 Active Version · 동일 Hierarchy 여러 Active Version · 동일 Composite 여러 Active Version · 동일 Source·Target 상충 Edge · 동일 Priority 상충 Edge · Multiple Path with Different Scope/Permission Version/Deny/Actor Eligibility · Optional Component Inclusion 기준 없음 · Conditional Component Rule Missing · Cross-registry Role Mapping 다중 후보 · Legacy Role Mapping 다중 후보. Ambiguity를 자동 Permit 금지.

# 47. Cross-Tenant Edge Governance

원칙: 다른 Tenant Role 간 Edge 금지 · Platform↔Tenant Role 연결은 명시적 Platform Policy 필요 · Shared Service Role은 Tenant Overlay Model · Cache Key에 Source/Target Tenant 포함 · Cross-Tenant Graph는 별도 Registry · Historical Evidence에 양쪽 Tenant Context · 고객 설정 임의 허용 금지.

# 48. Cross-Registry Edge Governance

요구: Source/Target Registry · Adapter Contract · Semantic Compatibility · Permission Namespace Compatibility · Actor Eligibility Compatibility · Scope Mapping · Risk Review · Owner Approval · Version Binding · Evidence · Audit. 암묵적 Cross-registry 상속 금지.

# 49. Deprecated·Suspended·Retired Role 처리

Deprecated: 신규 Hierarchy Edge/Composite Component 추가 금지 · 기존 Graph Migration 대상 표시 · Replacement 안내. Suspended: Effective Role Graph 즉시 제외 · Cache 무효화 · 기존 Composite 재검증 · Runtime Resolution 차단. Retired: Active Graph Node/Composite Component 사용 금지 · Historical Snapshot만 유지 · Replacement/Migration 필수.

# 50. Role Graph Snapshot

`APPROVAL_ROLE_GRAPH_SNAPSHOT` — 필수 필드: snapshot id · tenant id · graph id · graph version id · hierarchy version ids · composite version ids · node snapshots · edge snapshots · path summary · root roles · leaf roles · effective inherited sets · effective composite sets · permission projection digest · deny projection digest · scope projection digest · actor eligibility digest · conflict result · ambiguity result · cycle result · captured at · immutable digest · status · evidence

# 51. Composite Role Snapshot

`APPROVAL_COMPOSITE_ROLE_SNAPSHOT` — 필수 필드: snapshot id · composite role id · composite version id · component role versions · nested composite versions · mandatory components · optional components · excluded components · effective permission set · effective deny set · effective scope requirements · effective actor eligibility · effective validity · risk · criticality · conflict result · dependency result · captured at · immutable digest · evidence

# 52. Role Graph Evidence

`APPROVAL_ROLE_GRAPH_EVIDENCE` — 필수 필드: evidence id · tenant id · graph version id · hierarchy version references · composite version references · role version references · edge snapshots · path snapshots · permission snapshots · deny snapshots · scope propagation result · actor eligibility result · dependency result · conflict result · ambiguity result · circular reference result · scope expansion result · permission expansion result · graph digest · captured at · immutable digest · status

# 53. Role Path Evidence

각 Effective Inheritance 결과에 저장: Source Role · Target Role · Intermediate Roles · Edge Sequence · Role Versions · Hierarchy Version · Composite Versions · Permission Sources · Deny Sources · Scope Transformations · Constraint Transformations · Actor Eligibility Transformations · Validity Transformations · Risk Escalation · Conflict Decisions · Final Result · Digest.

# 54. Role Graph Digest

Digest Input: tenant id · graph id · graph version · hierarchy versions · composite versions · sorted node identifiers · role version identifiers · sorted edge identifiers · edge types · propagation policies · scope policies · deny policies · actor policies · validity policies · conflict policies · root roles · maximum depth · closure digest · path digest · lifecycle status. Node·Edge 순서가 비결정적이어도 Canonical Sorting 적용.

# 55. Role Graph Cache

Cache 종류: Active Hierarchy Cache · Active Composite Cache · Role Ancestor Cache · Role Descendant Cache · Role Path Cache · Role Transitive Closure Cache · Effective Inherited Role Cache · Effective Composite Role Cache · Effective Permission Projection Cache · Effective Deny Projection Cache · Compatibility Cache · Conflict Cache · Simulation Cache.

# 56. Role Graph Cache Key

최소 포함: tenant id · hierarchy registry id · role hierarchy id · hierarchy version id · graph id · graph version id · source role definition id · source role version id · target role definition id optional · target role version id optional · composite role id optional · composite version id optional · role status digest · permission mapping digest · permission group digest · permission bundle digest · scope requirement digest · actor eligibility digest · conflict policy version · propagation policy version · graph digest · context digest optional.

# 57. Cache Invalidation

즉시 Trigger: Role Version Activated · Role Suspended/Deprecated/Retired · Hierarchy Version Activated · Hierarchy Edge/Node Changed · Composite Version Activated · Composite Component Changed · Permission Version/Group Version/Bundle Version Changed · Permission Deny Changed · Scope Requirement Changed · Actor Eligibility Changed · Role Conflict/Exclusion/Dependency Changed · Propagation Policy Changed · Organization Hierarchy Changed Reference · Tamper Detected · Kill Switch Activated.

# 58. Role Hierarchy Drift

`APPROVAL_ROLE_HIERARCHY_DRIFT`

Drift Type: HIERARCHY_VERSION_DRIFT · NODE_VERSION_DRIFT · EDGE_VERSION_DRIFT · ROLE_STATUS_DRIFT · ROLE_VERSION_DRIFT · PERMISSION_VERSION_DRIFT · PERMISSION_GROUP_DRIFT · PERMISSION_BUNDLE_DRIFT · DENY_DRIFT · SCOPE_POLICY_DRIFT · ACTOR_POLICY_DRIFT · CONFLICT_POLICY_DRIFT · DEPENDENCY_DRIFT · EXCLUSION_DRIFT · VALIDITY_DRIFT · GRAPH_DIGEST_DRIFT · CUSTOM

필수 필드: drift id · hierarchy id · hierarchy version id · source resolution reference · drift type · previous digest · current digest · affected role count · affected assignment reference count · severity · runtime blocked · revalidation required · detected at · resolved at · status · evidence

# 59. Composite Role Drift

Drift Type: COMPOSITE_VERSION_DRIFT · COMPONENT_VERSION_DRIFT · COMPONENT_STATUS_DRIFT · NESTED_COMPOSITE_DRIFT · PERMISSION_AGGREGATION_DRIFT · DENY_AGGREGATION_DRIFT · SCOPE_AGGREGATION_DRIFT · ACTOR_ELIGIBILITY_DRIFT · RISK_DRIFT · CONFLICT_DRIFT · DEPENDENCY_DRIFT · VALIDITY_DRIFT · DIGEST_DRIFT · CUSTOM

# 60. Role Graph Revalidation

Trigger: Role Version Changed · Role Suspended/Retired · Permission Version Changed/Retired · Hierarchy/Composite Version Changed · Component Changed · Conflict/Dependency/Exclusion Metadata Changed · Scope Requirement/Actor Eligibility Changed · Organization Hierarchy Version Changed · Manual Request · Incident · Tamper Detection · Kill Switch. Revalidation은 기존 Result 수정 금지, 새 Result 생성.

# 61. Role Graph Reconciliation

비교: Hierarchy Registry↔Definition · Definition↔Active Version · Version↔Nodes · Version↔Edges · Node Role Version↔Active Role Version · Edge Tenant↔Node Tenant · Composite Role↔Active Composite Version · Composite Version↔Components · Component Role↔Role Registry · Component Role Version↔Active Version · Role Permission Projection↔Permission Registry · Explicit Deny Projection↔Permission Deny · Scope Propagation↔Scope Requirement · Actor Eligibility Result↔Role Eligibility · Conflict Result↔Conflict Metadata · Dependency Result↔Dependency Metadata · Graph Closure↔Current Edge Set · Graph Digest↔Stored Digest · IAM Composite↔Canonical Composite · ERP Hierarchy↔Canonical Hierarchy · Workflow Hierarchy↔Canonical Hierarchy · Snapshot↔Current Version Reference · Existing Assignment Reference↔Retired Role · Legacy Composite↔Canonical Composite.

# 62. Role Hierarchy Simulation

Simulation Type: ADD_NODE · REMOVE_NODE · ADD_EDGE · REMOVE_EDGE · CHANGE_EDGE_TYPE · CHANGE_DIRECTION · CHANGE_PROPAGATION_POLICY · ADD_PARENT · REMOVE_PARENT · ADD_CHILD · REMOVE_CHILD · ADD_COMPONENT · REMOVE_COMPONENT · CHANGE_COMPONENT_VERSION · ADD_NESTED_COMPOSITE · CHANGE_SCOPE_POLICY · CHANGE_DENY_POLICY · CHANGE_ACTOR_POLICY · CHANGE_CONFLICT_POLICY · INCREASE_MAXIMUM_DEPTH · ENABLE_MULTIPLE_INHERITANCE · CUSTOM

Output: Current Graph · Simulated Graph · Added/Removed Roles · Added/Removed Permissions · Added/Removed Denies · Scope Expansion/Reduction · Actor Eligibility Change · New/Resolved Conflicts · Cycle Detection · Diamond Inheritance Detection · Risk Increase · Criticality Change · Affected Roles · Affected Assignment References · Cache Invalidation Estimate · Manual Review Requirement · Activation Recommendation. Simulation은 실제 Graph/Role Version/Assignment/Cache 변경 금지.

# 63. Role Graph Impact Analysis

계산: Directly Affected Roles · Transitively Affected Roles · Affected Composite Roles · Affected Permission Projections · Affected Deny Projections · Affected Scope Requirements · Affected Actor Eligibility · Affected Existing Assignment References · Affected Sessions Reference · Affected Authorization Cache Reference · Risk Increase · Permission Expansion · Scope Expansion · Compliance Impact · SoD Impact Reference · Migration Requirement · Rollback Feasibility.

# 64. Existing Hierarchy Migration

`APPROVAL_ROLE_HIERARCHY_MIGRATION`

Legacy Source Type: DATABASE_PARENT_ROLE · IAM_COMPOSITE_ROLE · KEYCLOAK_COMPOSITE · LDAP_NESTED_GROUP · AD_NESTED_GROUP · ERP_ROLE_HIERARCHY · WORKFLOW_ROLE_GROUP · JSON_ROLE_TREE · CONFIG_ROLE_INHERITANCE · HARDCODED_ROLE_INCLUDE · USER_TYPE_HIERARCHY · JOB_GRADE_HIERARCHY · ORGANIZATION_HIERARCHY_MISUSE · CUSTOM · UNKNOWN

필수 필드: migration id · source system · source type · source hierarchy code · source parent role · source child role · source direction · source permissions · source scope behavior · source deny behavior · source actor behavior · target hierarchy id · target hierarchy version id · target edge type · target source role version · target role version · semantic equivalence · direction equivalence · permission equivalence · scope equivalence · actor equivalence · conflict result · cycle risk · expansion risk · mapping confidence · automatic migration allowed · manual review required · status · immutable digest · evidence

# 65. Legacy Composite Migration 원칙

Legacy Composite 자동 활성화 금지. 검증: Component Role 존재 · Component Role Version · Permission Equivalence · Explicit Deny Preservation · Scope Equivalence · Actor Eligibility · Human·Machine Mixing · Conflict · Dependency · Cycle · Risk · Criticality · Validity · Owner · Lifecycle · Assignment Impact.

# 66. Duplicate Hierarchy Audit

탐지: 동일 Role 간 여러 Hierarchy · 동일 Source·Target Edge 중복 · 방향만 반대인 중복 Edge · Includes와 Inherits 의미 중복 · Hierarchy와 Composite 중복 표현 · Permission Group을 Role Hierarchy로 중복 · Organization Hierarchy를 Role Hierarchy로 중복 · IAM/ERP/Workflow와 Platform의 동일 Hierarchy · Version 없는 Legacy Hierarchy · 동일 Component Set Composite · 순서만 다른 동일 Composite · Alias만 다른 동일 Composite · Permission/Scope/Risk-equivalent Composite. 각 중복에 기록: Duplicate Type · Semantic/Graph/Component/Permission/Scope Similarity · Assignment Impact · Consolidation Candidate · Migration Risk · Recommended Canonical Graph · Keep Separate Reason.

# 67. Critical Gap 후보

High/Critical: Role Hierarchy Version 없음 · Composite Role Version 없음 · Parent ID만 있고 Edge 의미 없음 · Circular Role Hierarchy · Circular Composite · Cross-Tenant Role Edge · Retired Role Active Graph 포함 · Suspended Role Runtime 상속 · Deprecated Role 신규 Component · Permission Version 미고정 · Explicit Deny 상속 중 소실 · Scope Union 자동 확대 · Human·Machine Role 혼합 · Approval·Requester 독성 조합 · Composite Risk 하향 · Diamond Ambiguity · Multiple Path Scope/Deny 불일치 · Graph Snapshot 없음 · Path Evidence 없음 · Graph Digest 없음 · Cache Key에 Graph Version 없음 · Hierarchy 변경 후 Cache 미무효화 · Legacy IAM Composite 자동 허용 · Organization Hierarchy를 Role Hierarchy로 사용 · 고객 설정으로 Cycle Guard 제거 · Runtime Error 후 Allow · Graph Tamper 미탐지.

# 68. 최소 Static Lint

탐지·차단: Hardcoded Parent/Child Role · `parentRoleId`만 있고 Edge Type 없음 · Unversioned Hierarchy/Composite · Role Self-reference · Direct/Indirect Cycle · Cross-Tenant Edge · Retired/Suspended Role Edge · Deprecated Role 신규 Edge · Missing Role/Permission Version · Permission Union without Deny · Scope Union without Guard · Human·Machine Role Mixing · Composite Risk Downgrade · Diamond Inheritance Ignored · Duplicate Component/Edge · Optional Component Auto-enabled · Conditional Component without Rule · Mutable Graph Snapshot · Graph Cache without Version · Role Graph Bypass Feature Flag · Organization Parent를 Role Parent로 재사용 · Alias 기반 Graph Edge · Error 후 Inheritance Allow · Recursive Resolver Depth Limit 없음.

# 69. 최소 Runtime Guard

차단: Hierarchy Registry/Definition Missing · Active Hierarchy Version Missing · Composite Role/Version Missing · Role Node/Version Missing · Role Inactive/Suspended/Retired · Permission Version Missing · Tenant Mismatch · Cross-Tenant Edge · Cross-Registry Edge Unapproved · Circular Hierarchy/Composite · Maximum Depth Exceeded · Duplicate Component Ambiguity · Diamond Inheritance Conflict · Permission Conflict · Explicit Deny Conflict · Scope Expansion · Actor Eligibility Conflict · Human·Machine Role Conflict · Missing Dependency · Excluded Role Included · Deprecated Role New Inclusion · Graph Version Mismatch · Graph Digest Mismatch · Path Evidence Missing · Graph Snapshot Missing · Graph Drift · Cache Integrity Failure · Runtime Bypass Attempt · Tamper Detected.

# 70. Error Contract

APPROVAL_ROLE_HIERARCHY_REGISTRY_NOT_FOUND · _HIERARCHY_NOT_FOUND · _HIERARCHY_VERSION_NOT_FOUND · _HIERARCHY_VERSION_INACTIVE · _HIERARCHY_VERSION_MISMATCH · _HIERARCHY_NODE_NOT_FOUND · _HIERARCHY_EDGE_NOT_FOUND · _HIERARCHY_DIRECTION_INVALID · _HIERARCHY_CIRCULAR_REFERENCE · _HIERARCHY_MAX_DEPTH_EXCEEDED · _HIERARCHY_CROSS_TENANT_BLOCKED · _HIERARCHY_CROSS_REGISTRY_BLOCKED · _HIERARCHY_ROLE_VERSION_MISSING · _HIERARCHY_ROLE_INACTIVE · _HIERARCHY_ROLE_SUSPENDED · _HIERARCHY_ROLE_RETIRED · _HIERARCHY_PERMISSION_VERSION_MISSING · APPROVAL_ROLE_COMPOSITE_NOT_FOUND · _COMPOSITE_VERSION_NOT_FOUND · _COMPOSITE_COMPONENT_NOT_FOUND · _COMPOSITE_CIRCULAR_REFERENCE · _COMPOSITE_DUPLICATE_COMPONENT · _COMPOSITE_ACTOR_INCOMPATIBLE · _COMPOSITE_PERMISSION_CONFLICT · _COMPOSITE_EXPLICIT_DENY_CONFLICT · _COMPOSITE_SCOPE_EXPANSION_BLOCKED · _COMPOSITE_RISK_INVALID · APPROVAL_ROLE_DEPENDENCY_MISSING · _EXCLUSION_TRIGGERED · _CONFLICT_DETECTED · _DIAMOND_INHERITANCE_CONFLICT · APPROVAL_ROLE_GRAPH_AMBIGUOUS · _GRAPH_VERSION_MISMATCH · _GRAPH_DIGEST_MISMATCH · _GRAPH_SNAPSHOT_MISSING · APPROVAL_ROLE_PATH_EVIDENCE_MISSING · APPROVAL_ROLE_GRAPH_DRIFT_DETECTED · _GRAPH_CACHE_INVALID · _GRAPH_RUNTIME_BLOCKED · _GRAPH_TAMPER_DETECTED

# 71. Warning Contract

APPROVAL_ROLE_HIERARCHY_DEPRECATION_WARNING · _HIERARCHY_VERSION_WARNING · _COMPOSITE_VERSION_WARNING · _COMPONENT_DEPRECATION_WARNING · _COMPONENT_SUSPENSION_WARNING · _SCOPE_EXPANSION_WARNING · _PERMISSION_EXPANSION_WARNING · _DIAMOND_INHERITANCE_WARNING · _MULTIPLE_INHERITANCE_WARNING · _ACTOR_COMPATIBILITY_WARNING · _RISK_ESCALATION_WARNING · _CONFLICT_WARNING · _DEPENDENCY_WARNING · _MIGRATION_WARNING · _DRIFT_WARNING · _RECONCILIATION_WARNING · APPROVAL_ROLE_MANUAL_REVIEW_REQUIRED

# 72. API Contract

72.1 Hierarchy Registry API · 72.2 Role Hierarchy API(목록/상세/Active Version/History/Root/Parent/Child/Ancestor/Descendant/Sibling/Direct Edge/Transitive Edge/Role Path/Maximum Depth) · 72.3 Composite Role API(목록/상세/Active Version/History/Mandatory·Optional·Excluded Component/Nested/Effective Component Set/Compatibility 검증/Permission·Deny·Scope Projection/Risk) · 72.4 Role Graph API(Graph/Active Version/Node/Edge/Path/Closure/Effective Inherited Set/Effective Composite Set/Snapshot/Evidence/Digest 검증) · 72.5 Validation API(Circular/Maximum Depth/Cross-Tenant/Compatibility/Actor Eligibility/Permission Conflict/Explicit Deny/Dependency/Exclusion/Scope Expansion/Permission Expansion/Diamond/Ambiguity) · 72.6 Simulation·Migration API. 모든 Write API: Authentication · Authorization · Expected Version · Idempotency · Correlation ID · Causation ID · Approval Reference · Security Review Reference · Simulation Result Reference · Audit · Evidence · Rate Limit · Server-side Enforcement. Historical Version/Snapshot/Evidence/Audit/Path Evidence 수정 API 금지.

# 73. Database 제약조건

Hierarchy Code+Registry+Tenant Unique · Hierarchy Version Number+Hierarchy Unique · Composite Code+Registry+Tenant Unique · Composite Version Number+Composite Unique · Graph Version Number+Graph Unique · Source Node≠Target Node · Component Role≠Composite Role · Cross-Tenant FK 차단 · Active Version Overlap 방지 · Valid From<Valid To · Maximum Depth>0 · Duplicate Edge/Component 방지 · Retired Role Active Edge/Component 방지 · Missing Role/Permission Version 방지 · Immutable Version/Snapshot/Evidence/Audit Update 방지 · Cycle Activation 방지 · Invalid Lifecycle Transition 방지 · Logical Deletion Policy. Cycle은 DB Constraint만으로 불충분 → Transactional Domain Validation·Activation Gate 병행.

# 74. Index Strategy

Hierarchy Registry Tenant+Code · Hierarchy Tenant+Code · Hierarchy Active Version · Hierarchy Version Hierarchy+Number · Hierarchy Node Version+Role · Hierarchy Edge Version+Source · Version+Target · Source+Target+Type · Composite Tenant+Code · Composite Active Version · Composite Version Composite+Number · Composite Component Version+Role · Component Role+Status · Graph Tenant+Code · Graph Active Version · Graph Version Graph+Number · Graph Node Version+Role · Graph Edge Version+Source · Version+Target · Role Path Version+Source+Target · Effective Inherited Set Source Role · Effective Composite Set Composite Version · Conflict Role A+Role B · Dependency Source+Required · Exclusion Source+Excluded · Drift Hierarchy+Type · Migration Source System+Source Hierarchy · Audit Event Type+Occurred At.

# 75. Performance 원칙

Adjacency List+Closure Projection · Precomputed Transitive Closure · Versioned Materialized Path · Ancestor/Descendant Projection · Composite Flattening Projection · Effective Permission/Deny Projection · Role Path Cache · Cycle Detection at Write Time · Maximum Depth Guard · Incremental Graph Rebuild · Event-driven Cache Invalidation · Batch Impact Analysis · Bulk Ancestor/Descendant Lookup · Bulk Composite Resolution · Tenant-partitioned Graph · Immutable Version Cache · Graph Digest Fast Verification · Conflict/Compatibility Precomputation · Permission/Scope Similarity Projection. 성능 이유로 Cycle Detection·Explicit Deny·Tenant Isolation·Scope Guard·Version Binding 제거 금지.

# 76. 테스트 범위

76.1 Unit Test · 76.2 Property Test(동일 Canonical Graph=동일 Digest · Tenant 변경 시 동일 Cache Key 금지 · Cycle Graph 활성화 불가 · Self-reference 불가 · Retired Role Active Edge/Component 불가 · Explicit Deny 상속 후 유지 · Scope Intersection 결과 ≤ 입력 Scope · Composite Risk ≥ 구성 Role 최대 Risk · Human-only+Machine-only Composite 금지 · Graph Version 변경 시 과거 Snapshot 불변 · 동일 Permission·Version·Scope만 Deduplicate · Multiple Path 다른 Deny=Ambiguity/Conflict · Maximum Depth 초과 불가 · Cross-Tenant Edge 불가 · Immutable Version/Snapshot/Evidence · Default Deny 유지) · 76.3 Integration Test · 76.4 Security Test · 76.5 Concurrency Test · 76.6 Migration Test · 76.7 Regression Test.

# 77. 구현 순서

Step 1 Existing Hierarchy Inventory · Step 2 Canonical Edge Semantics 확정 · Step 3 Hierarchy Registry · Step 4 Hierarchy Definition·Version · Step 5 Cycle·Depth Guard · Step 6 Role Dependency·Conflict·Exclusion · Step 7 Composite Role · Step 8 Permission·Deny Aggregation · Step 9 Scope·Constraint·Eligibility Propagation · Step 10 Effective Inherited Role Set · Step 11 Effective Composite Role Set · Step 12 Role Graph·Closure·Path · Step 13 Diamond·Ambiguity Guard · Step 14 Snapshot·Evidence·Digest · Step 15 Cache·Invalidation · Step 16 Drift·Revalidation · Step 17 Simulation·Impact Analysis · Step 18 Reconciliation·Migration · Step 19 Static Lint·Runtime Guard · Step 20 Test·Regression · Step 21 Documentation·ADR·History.

# 78. 생성 또는 갱신할 문서

`DSAR_APPROVAL_ROLE_HIERARCHY_REGISTRY` · `_ROLE_HIERARCHY` · `_ROLE_HIERARCHY_VERSION` · `_ROLE_HIERARCHY_NODE` · `_ROLE_HIERARCHY_EDGE` · `_ROLE_HIERARCHY_DIRECTION` · `_ROLE_INCLUSION` · `_ROLE_INHERITANCE` · `_ROLE_SPECIALIZATION` · `_ROLE_RESTRICTION` · `_ROLE_DEPENDENCY` · `_ROLE_CONFLICT` · `_ROLE_EXCLUSION` · `_ROLE_COMPATIBILITY` · `_COMPOSITE_ROLE` · `_COMPOSITE_ROLE_VERSION` · `_COMPOSITE_ROLE_COMPONENT` · `_NESTED_COMPOSITE_ROLE` · `_COMPOSITE_PERMISSION_AGGREGATION` · `_COMPOSITE_DENY_AGGREGATION` · `_COMPOSITE_SCOPE_AGGREGATION` · `_COMPOSITE_ACTOR_ELIGIBILITY` · `_COMPOSITE_RISK_AGGREGATION` · `_ROLE_GRAPH` · `_ROLE_GRAPH_VERSION` · `_ROLE_GRAPH_NODE` · `_ROLE_GRAPH_EDGE` · `_ROLE_PATH` · `_EFFECTIVE_INHERITED_ROLE_SET` · `_EFFECTIVE_COMPOSITE_ROLE_SET` · `_ROLE_PERMISSION_MERGE` · `_ROLE_PERMISSION_PRECEDENCE` · `_ROLE_SCOPE_PROPAGATION` · `_ROLE_SCOPE_EXPANSION_GUARD` · `_ROLE_PERMISSION_EXPANSION_GUARD` · `_ROLE_CIRCULAR_REFERENCE_DETECTION` · `_ROLE_DIAMOND_INHERITANCE` · `_ROLE_AMBIGUITY_DETECTION` · `_ROLE_GRAPH_SNAPSHOT` · `_COMPOSITE_ROLE_SNAPSHOT` · `_ROLE_GRAPH_EVIDENCE` · `_ROLE_PATH_EVIDENCE` · `_ROLE_GRAPH_DIGEST` · `_ROLE_GRAPH_CACHE` · `_ROLE_GRAPH_CACHE_INVALIDATION` · `_ROLE_HIERARCHY_DRIFT` · `_COMPOSITE_ROLE_DRIFT` · `_ROLE_GRAPH_REVALIDATION` · `_ROLE_GRAPH_RECONCILIATION` · `_ROLE_HIERARCHY_SIMULATION` · `_ROLE_GRAPH_IMPACT_ANALYSIS` · `_ROLE_HIERARCHY_MIGRATION` · `_LEGACY_COMPOSITE_ROLE_MIGRATION` · `_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION` · `_ROLE_HIERARCHY_DUPLICATE_AUDIT` · `_ROLE_HIERARCHY_CRITICAL_GAP_POLICY` · `_ROLE_HIERARCHY_STATIC_LINT` · `_ROLE_GRAPH_RUNTIME_GUARDS` · `_ROLE_HIERARCHY_ERROR_WARNING_CONTRACT` · `_ROLE_HIERARCHY_API_CONTRACT` · `_ROLE_HIERARCHY_INDEX_PERFORMANCE` · `_ROLE_HIERARCHY_TEST_STRATEGY` · `_ROLE_HIERARCHY_FUNCTION_REGRESSION_GATE` · `docs/architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md` · `docs/pm/PM_CHANGE_HISTORY.md` · `docs/pm/REPEAT_PROBLEM_HISTORY.md` · `docs/pm/AGENT_EXECUTION_HISTORY.md`. 기존 동일 목적 문서가 있으면 중복 생성하지 말고 통합.

# 79. 관리 Matrix

Role Hierarchy Matrix(Hierarchy·Version·Source Role·Edge Type·Target Role·Direction·Scope Policy·Status) · Composite Role Matrix(Composite·Version·Component·Component Type·Permission Policy·Scope Policy·Risk·Status) · Role Conflict Matrix(Role A·Role B·Conflict Type·Scope·Severity·Composition Blocked·Runtime Blocked·Status) · Role Path Matrix(Source·Target·Path Length·Role Versions·Effective Scope·Deny Count·Conflict·Status) · Role Graph Migration Matrix(Source System·Legacy Hierarchy·Canonical Graph·Direction Equivalence·Scope Difference·Cycle Risk·Confidence·Status).

# 80. 검증 게이트

§80 원문의 78개 검증 항목(Registry/Definition/Version 구축 · Parent·Child·Edge Type·Direction 명시 · Role↔Organization/Permission Hierarchy 분리 · Composite↔Permission Group 분리 · Node/Edge Role Version 결합 · Direct/Transitive/Multiple Inheritance · Specialization Scope 축소 · Restriction 우선 · Dependency/Conflict/Exclusion · Composite·Component·Nested·Depth · Circular/Cross-model/Cross-Tenant/Cross-Registry · Deprecated/Retired/Suspended Guard · Permission Version 고정 · Explicit Deny 유지 · Deduplication Source Chain · Scope Intersection/Expansion Guard · Permission Expansion Guard · Actor Eligibility 교집합 · Human·Machine 혼합 차단 · Risk/Criticality 하향 금지 · Diamond/Ambiguity 탐지 · Effective Inherited/Composite Set · Graph/Version/Path/Closure · Snapshot/Evidence/Digest · Cache Version·Tenant-aware·무효화 · Drift/Revalidation/Reconciliation · Simulation 불변 · Impact Analysis · Legacy 자동 활성화 금지 · Duplicate Audit · Static Lint · Runtime Guard · 회귀 없음 · ADR·PM·History 갱신 · Part 3-3 Contract 준비) 전부.

# 81. 완료 보고 형식

§81 원문의 99개 항목 순서로 보고(Hierarchy Registry 수 ~ Part 3-3 준비 상태).

# 82. 완료 조건

§82 원문의 90개 완료 조건 전부.

# 83. 최종 실행 명령

검증된 Role Registry Foundation Governance 위에 Part 3-2 Role Hierarchy & Composite Role Governance를 구축. Repository/DB/Backend/Frontend/Mobile/IAM/ERP/Workflow/API Gateway/Admin Console/Batch/Configuration 전수조사. 동일 목적 구현이 있으면 중복 Hierarchy/Composite/Graph/Resolver 신설 금지, Canonical Versioned Role Graph·Adapter로 통합. Role↔Organization Hierarchy 분리. Role↔Permission Hierarchy 분리. Composite↔Permission Group 분리. Parent/Child를 단순 Parent ID 아닌 Edge Type·Direction·Propagation Policy로 명시. Inheritance Direction 기본값=EXPLICIT_EDGE_DIRECTION_ONLY. Node/Edge를 Role Definition Version에 결합. Includes/Inherits를 단순 Permission Union으로 처리 금지. Specialization=Scope 축소·Constraint 강화 기본. Restriction·Explicit Deny가 Allow보다 우선. Missing Required Dependency는 활성화·Runtime Resolution 차단. Requester↔Approver/Creator↔Approver/Operator↔Auditor/Admin↔Auditor/Human↔Machine Critical Conflict 탐지. Optional Component 조건 없이 자동 활성화 금지. Conditional Component Rule 없으면 활성화 금지. Nested Composite에 Depth/Version/Tenant/Cycle/Conflict/Cache 적용. Allow=Deduplicated Restricted Union·Explicit Deny 항상 전파·Excluded 제거·Critical 명시 Inclusion. 동일 Permission·Version·Scope·Constraint만 Deduplicate. Scope Aggregation=Intersection/Most Restrictive 기본. Actor Eligibility=교집합. Human-only↔Machine-only 혼합 금지. Composite Risk/Criticality 하향 금지. Graph/Version/Node/Edge/Path/Closure 구축. Effective Inherited/Composite Role Set 생성. Precedence Versioned Policy. Circular Reference(Direct/Indirect/Composite/Cross-model/Dependency/Supersession/Alias) 탐지·Tarjan SCC/DFS Color·Version 활성화 차단. Maximum Depth·Recursive Depth Limit. Diamond Inheritance 차이 시 Ambiguity/Conflict. Cross-Tenant Edge 차단. Deprecated 신규 Edge/Component 금지·Suspended Runtime 즉시 제외·Retired Active 사용 금지. Scope/Permission Expansion Guard·High/Critical 차단. Snapshot/Evidence/Digest 불변. Canonical Sorting Digest. Cache·Key·즉시 무효화. Drift/Revalidation(새 Result)/Reconciliation. Simulation·Impact Analysis(불변). Legacy Migration 자동 활성화 금지·Mapping Confidence·Manual Review. Duplicate Audit. Static Lint·Runtime Guard. 기존 Approval 전 기능 Regression. 분산 IAM/ERP/Workflow/Nested Group/JSON Tree/Hardcoded Include를 Canonical Versioned Role Graph로 통합. ADR·PM·Repeat·Agent History 기록. Part 3-3 Role Assignment Governance가 사용할 안정적 Foundation 완성.

---

## 완료 조건(§82) 요약 — 설계 거버넌스 판정

이번 회차는 **설계 명세(코드 0)**로서 §82의 각 항목을 "실 엔진 구현"이 아니라 "Canonical Interface·확장 포인트·Gap·선행 전제·Adapter Requirement 설계 명세"로 충족한다. 실 엔진(테이블/코드/테스트) 구현은 선행 Permission Engine·Decision Core 실구현 완료 후 별도 승인세션(RP-002)에서 수행한다. NOT_CERTIFIED · BLOCKED_PREREQUISITE.
