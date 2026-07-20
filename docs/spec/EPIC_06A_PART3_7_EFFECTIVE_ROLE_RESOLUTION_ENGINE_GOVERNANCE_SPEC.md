# GeniegoROI Enterprise Engineering Handbook

## EPIC 06-A-03-02-03-04 — Part 3-7

# Enterprise Effective Role Resolution Engine Governance

Version 1.0

> **거버넌스 상태**: 설계 명세(Design Specification) — 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
> 본 문서는 사용자 제공 SPEC 원문의 정본 영속본이다. 실 엔진 구현은 선행 foundation(Part 1~3-6) 인증 후 별도 승인 세션(RP-track)에서 진행한다.
> 상위 ADR: `docs/architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md`.

---

# 0. 작업 목적

이번 단계에서는 RBAC, Hierarchy, Composite Role, Dynamic Role, Scoped Role, Service Role, Temporary Role, Delegated Role, Emergency Role 등을 하나의 **Enterprise Effective Role Resolution Engine(ERRE)** 으로 통합한다.

이 엔진은 GeniegoROI Authorization의 최종 권한 계산(Core Authorization Kernel)이며, 모든 접근 제어는 반드시 본 엔진을 통과해야 한다.

본 엔진은 다음을 만족해야 한다.

* Single Source of Truth
* Deterministic Resolution
* Immutable Resolution Snapshot
* Version-aware
* Scope-aware
* Context-aware
* Time-aware
* Risk-aware
* Policy-aware
* Multi-tenant
* High Availability
* Horizontal Scalability
* Cache Consistency
* Explainable Authorization
* Audit Traceability

---

# 1. 구현 목표

다음을 구축한다.

1. Effective Role Resolution Engine Registry
2. Resolution Pipeline
3. Resolution Context
4. Resolution Session
5. Resolution Graph
6. Resolution Planner
7. Resolution Optimizer
8. Resolution Executor
9. Effective Role Calculator
10. Effective Permission Calculator
11. Effective Scope Calculator
12. Effective Constraint Calculator
13. Effective Deny Calculator
14. Effective Risk Calculator
15. Resolution Evidence Engine
16. Resolution Snapshot Engine
17. Resolution Digest Engine
18. Resolution Cache Engine
19. Resolution Drift Engine
20. Resolution Revalidation Engine
21. Resolution Reconciliation Engine
22. Resolution Simulation Engine
23. Resolution Explain Engine
24. Runtime Authorization Projection
25. Runtime Enforcement Contract
26. Runtime Guard
27. Static Lint
28. APIs
29. Completion Gate

---

# 2. Canonical Entity

구축

* APPROVAL_EFFECTIVE_ROLE_ENGINE
* APPROVAL_ROLE_RESOLUTION_PIPELINE
* APPROVAL_ROLE_RESOLUTION_CONTEXT
* APPROVAL_ROLE_RESOLUTION_SESSION
* APPROVAL_ROLE_RESOLUTION_GRAPH
* APPROVAL_EFFECTIVE_ROLE
* APPROVAL_EFFECTIVE_PERMISSION
* APPROVAL_EFFECTIVE_SCOPE
* APPROVAL_EFFECTIVE_CONSTRAINT
* APPROVAL_EFFECTIVE_DENY
* APPROVAL_EFFECTIVE_RISK
* APPROVAL_ROLE_RESOLUTION_EVIDENCE
* APPROVAL_ROLE_RESOLUTION_SNAPSHOT
* APPROVAL_ROLE_RESOLUTION_DIGEST
* APPROVAL_ROLE_RESOLUTION_CACHE
* APPROVAL_ROLE_RESOLUTION_DRIFT
* APPROVAL_ROLE_RESOLUTION_REVALIDATION
* APPROVAL_ROLE_RESOLUTION_RECONCILIATION
* APPROVAL_ROLE_RESOLUTION_SIMULATION
* APPROVAL_ROLE_RESOLUTION_EXPLAIN

---

# 3. Resolution Input Source

입력 데이터

* Direct Assignment
* Group Assignment
* Organization Assignment
* Composite Role
* Hierarchical Role
* Dynamic Role
* Session Role
* Conditional Role
* Service Role
* Machine Role
* Temporary Role
* Emergency Role
* Delegated Role
* Break Glass Role
* Scoped Role
* Permission Policy
* Explicit Deny
* Runtime Policy
* Environment
* Context
* Time Window
* Risk Score

---

# 4. Resolution Pipeline

Pipeline

1. Subject Resolution
2. Identity Validation
3. Assignment Collection
4. Hierarchy Expansion
5. Composite Expansion
6. Dynamic Evaluation
7. Scope Projection
8. Constraint Projection
9. Explicit Deny Projection
10. Risk Projection
11. Permission Projection
12. Policy Evaluation
13. Conflict Detection
14. Effective Role Generation
15. Effective Permission Generation
16. Snapshot Generation
17. Cache Generation
18. Audit Logging

Pipeline 순서는 변경 불가.

---

# 5. Resolution Graph

구성

* Subject Node
* Assignment Node
* Role Node
* Hierarchy Node
* Composite Node
* Permission Node
* Scope Node
* Constraint Node
* Deny Node
* Policy Node
* Risk Node

Graph는 DAG(Directed Acyclic Graph)를 유지해야 하며 순환 구조를 허용하지 않는다.

---

# 6. Resolution Context

Context 요소

* Tenant
* Organization
* Department
* Project
* Session
* Device
* Authentication Level
* Environment
* Business Calendar
* Client
* IP Address
* Geo Location
* Time Zone

---

# 7. Effective Role Calculator

계산 대상

* Assigned Roles
* Expanded Roles
* Composite Roles
* Dynamic Roles
* Temporary Roles
* Emergency Roles
* Delegated Roles
* Service Roles

최종 결과는 중복 제거 후 Canonical Ordering 적용.

---

# 8. Effective Permission Calculator

계산 대상

* Direct Permission
* Inherited Permission
* Composite Permission
* Dynamic Permission
* Runtime Permission
* Service Permission

Permission Merge Rule

* Explicit Deny > Allow
* Narrow Scope > Wide Scope
* Runtime Constraint > Static Constraint

---

# 9. Effective Scope Calculator

계산

* Assignment Scope
* Role Scope
* Permission Scope
* Runtime Scope
* Context Scope

Intersection 기본 적용.

---

# 10. Effective Constraint Calculator

Constraint

* Time
* Device
* Region
* Network
* Session
* Amount
* API
* Dataset
* Document
* Approval Requirement

---

# 11. Effective Deny Calculator

지원

* Explicit Deny
* Runtime Deny
* Risk Deny
* Policy Deny
* Environment Deny

Explicit Deny는 어떤 Allow보다 우선한다.

---

# 12. Effective Risk Calculator

평가 요소

* Identity Risk
* Session Risk
* Device Risk
* Network Risk
* Behavior Risk
* Role Criticality
* Permission Criticality
* Scope Criticality

출력

* LOW
* MEDIUM
* HIGH
* CRITICAL

---

# 13. Policy Evaluation

정책 적용

* RBAC Policy
* ABAC Policy
* Scope Policy
* Runtime Policy
* Emergency Policy
* Break Glass Policy
* Organization Policy

---

# 14. Conflict Detection

탐지

* SoD Conflict
* Role Conflict
* Permission Conflict
* Scope Conflict
* Policy Conflict
* Version Conflict
* Assignment Conflict
* Dynamic Rule Conflict

---

# 15. Resolution Optimizer

최적화

* Duplicate Removal
* Permission Merge
* Scope Compression
* Graph Optimization
* Cache Reuse
* Incremental Evaluation

---

# 16. Resolution Executor

Executor는

* Thread Safe
* Stateless
* Deterministic

특성을 가져야 한다.

---

# 17. Explain Engine

사용자는 다음을 확인할 수 있어야 한다.

* 왜 이 Role이 활성화되었는가
* 어떤 Assignment 때문인가
* 어떤 Rule 때문인가
* 어떤 Scope 때문인가
* 어떤 Policy 때문인가
* 어떤 Deny 때문인가

Explain 결과는 사람이 이해할 수 있는 형태와 JSON 형태를 모두 제공한다.

---

# 18. Snapshot Engine

Snapshot 저장

* Effective Roles
* Effective Permissions
* Effective Scopes
* Constraints
* Deny
* Risk
* Resolution Version

---

# 19. Evidence Engine

Evidence 저장

* Rule Evaluation
* Policy Decision
* Assignment Chain
* Hierarchy Chain
* Scope Resolution
* Risk Evaluation

---

# 20. Digest Engine

Digest 입력

* Subject
* Role Set
* Permission Set
* Scope Set
* Policy Version
* Runtime Context
* Snapshot Version

---

# 21. Cache Engine

Cache

* Effective Role Cache
* Effective Permission Cache
* Scope Cache
* Constraint Cache
* Policy Cache

Version 기반.

---

# 22. Cache Invalidation

Trigger

* Assignment 변경
* Role 변경
* Permission 변경
* Policy 변경
* Scope 변경
* Dynamic Rule 변경
* Runtime Context 변경

---

# 23. Drift Detection

탐지

* Effective Role Drift
* Effective Permission Drift
* Scope Drift
* Runtime Drift
* Policy Drift

---

# 24. Revalidation

Trigger

* Policy Update
* Role Update
* Assignment Update
* Organization Update
* Runtime Update

---

# 25. Reconciliation

비교

* Runtime Result
* Snapshot
* Cached Result
* Previous Result

---

# 26. Simulation

Simulation

* Add Role
* Remove Role
* Add Scope
* Remove Scope
* Policy Change
* Runtime Change

영향 분석

* Permission Diff
* Scope Diff
* Risk Diff
* Conflict Diff

---

# 27. Runtime Authorization Projection

출력

* Effective Role Set
* Effective Permission Set
* Effective Scope Set
* Effective Constraint Set
* Effective Deny Set
* Effective Risk Level

---

# 28. Runtime Guard

차단

* Invalid Graph
* Cyclic Dependency
* Missing Snapshot
* Missing Version
* Invalid Policy
* Unknown Runtime Context
* Permission Escalation
* Scope Escalation

---

# 29. Static Lint

탐지

* Direct Permission Lookup
* Hardcoded Authorization
* Bypass Resolution Engine
* Missing Explain
* Missing Snapshot
* Missing Audit
* Runtime Override
* Cache Poisoning Risk

---

# 30. Error Contract

구현

* ROLE_RESOLUTION_FAILED
* INVALID_RESOLUTION_GRAPH
* EFFECTIVE_ROLE_NOT_FOUND
* EFFECTIVE_PERMISSION_NOT_FOUND
* POLICY_EVALUATION_FAILED
* RESOLUTION_TIMEOUT
* INVALID_RUNTIME_CONTEXT
* CACHE_CORRUPTED

---

# 31. Warning Contract

구현

* Resolution Drift
* Policy Updated
* Scope Narrowed
* Cache Rebuild Required
* Runtime Context Changed

---

# 32. API

최소

* Resolve Effective Roles
* Resolve Effective Permissions
* Resolve Effective Scope
* Resolve Constraints
* Explain Authorization
* Run Simulation
* Compare Snapshots
* Validate Resolution

---

# 33. Database Constraint

적용

* Immutable Resolution Version
* Snapshot Integrity
* Digest Validation
* Graph Integrity
* Tenant Isolation
* Version Binding

---

# 34. Index

구축

* Subject
* Assignment
* Role
* Permission
* Scope
* Runtime
* Snapshot
* Version

---

# 35. 성능 요구사항

* P95 Resolution Time ≤ 20ms
* P99 Resolution Time ≤ 50ms
* Cache Hit ≥ 95%
* Deterministic Result 100%
* Horizontal Scale 지원
* Lock-Free Read Path 지원
* Incremental Recalculation 지원

---

# 36. 테스트

Unit

* Graph
* Pipeline
* Calculator
* Optimizer
* Explain

Integration

* Assignment
* Scope
* Dynamic Role
* Service Role
* Policy Engine

Performance

* 100K Concurrent Resolution
* 1M Effective Permission Projection
* Incremental Cache Refresh

Security

* Authorization Bypass
* Cache Poisoning
* Graph Manipulation
* Permission Escalation
* Scope Escalation

Regression

* RBAC
* ABAC
* Workflow
* Approval
* Audit

---

# 37. Completion Gate

완료 조건

* Resolution Engine 구축
* Resolution Graph 구축
* Effective Role Calculator 구축
* Effective Permission Calculator 구축
* Effective Scope Calculator 구축
* Constraint Calculator 구축
* Deny Calculator 구축
* Explain Engine 구축
* Snapshot 구축
* Evidence 구축
* Digest 구축
* Cache 구축
* Drift 구축
* Revalidation 구축
* Simulation 구축
* Runtime Guard 구축
* Static Lint 구축
* Performance Benchmark 통과
* Regression Test 100% 통과

---

# 38. 다음 추천 구현 순서

1. **Part 3-8 — Role Certification & Access Review Governance**
2. Part 3-9 — Just-In-Time (JIT) Access Governance
3. Part 3-10 — Runtime Segregation of Duties (SoD) Enforcement
4. Part 3-11 — Enterprise RBAC Analytics & Governance Dashboard
5. Part 3-12 — Policy Decision Point (PDP) & Policy Enforcement Point (PEP) Governance
6. Part 3-13 — Zero Trust Identity & Continuous Authorization Governance
7. Part 3-14 — Enterprise Authorization Observability & Forensics Governance
