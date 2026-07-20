# GeniegoROI Enterprise Engineering Handbook

## EPIC 06-A-03-02-03-04 — Part 3-12

# Enterprise Policy Decision Point (PDP) & Policy Enforcement Point (PEP) Governance

Version 1.0

> **거버넌스 상태**: 설계 명세(Design Specification) — **코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**.
> **원문 출처**: 본 SPEC 본문(§0~§35)은 **사용자 제공 canonical handbook 원문 verbatim**이다(2026-07-20 제공).
> 상위 ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth(반날조 인용 근거): `docs/segmentation/DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①) · `docs/segmentation/DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②).
> **규율**: 본 명세는 계약(Contract) 확정용이며 실 엔진 구현은 선행 Decision Core(Part 1~3-11 인증) 완료 후 별도 RP-track 승인세션에서 수행한다. 모든 하위 DSAR의 file:line 인용은 위 Ground-Truth 2문서에만 근거한다(허용목록 밖 인용 0). ★"policy" 동음이의(마케팅 Catalog evaluatePolicy·RuleEngine·Decisioning·action_request policy)와 **인가 정책(authz policy) 엄격 분리(KEEP_SEPARATE)**.

---

# 0. 작업 목적

이번 단계에서는 지금까지 구축한 **RBAC**, **ABAC**, **Scoped Authorization**, **Dynamic Role**, **JIT**, **SoD**, **Effective Role Resolution Engine**을 하나의 **Enterprise Authorization Decision Fabric**으로 통합한다.

모든 접근 요청은 반드시 다음 흐름을 거쳐야 한다.

```
Access Request
      │
      ▼
Policy Information Point (PIP)
      │
      ▼
Policy Decision Point (PDP)
      │
      ▼
Decision Cache
      │
      ▼
Policy Enforcement Point (PEP)
      │
      ▼
Target Resource
```

본 모듈은 XACML, NIST SP 800-162(ABAC), Zero Trust Architecture, Enterprise IAM Architecture를 참고하여 구현하며, **GeniegoROI Authorization Kernel**의 중앙 정책 집행 계층을 완성한다.

---

# 1. 구현 목표

다음을 구축한다.

1. Policy Registry
2. Policy Repository
3. Policy Version
4. Policy Package
5. Policy Bundle
6. Policy Decision Point (PDP)
7. Policy Enforcement Point (PEP)
8. Policy Information Point (PIP)
9. Policy Administration Point (PAP)
10. Decision Pipeline
11. Decision Planner
12. Decision Optimizer
13. Decision Cache
14. Decision Snapshot
15. Decision Evidence
16. Decision Digest
17. Decision Analytics
18. Decision Drift
19. Decision Simulation
20. Decision Revalidation
21. Decision Reconciliation
22. Runtime Guard
23. Static Lint
24. APIs
25. Completion Gate

---

# 2. Canonical Entity

구축

* APPROVAL_POLICY_REGISTRY
* APPROVAL_POLICY
* APPROVAL_POLICY_VERSION
* APPROVAL_POLICY_PACKAGE
* APPROVAL_POLICY_BUNDLE
* APPROVAL_PDP
* APPROVAL_PEP
* APPROVAL_PIP
* APPROVAL_PAP
* APPROVAL_POLICY_DECISION
* APPROVAL_POLICY_CONTEXT
* APPROVAL_POLICY_REQUEST
* APPROVAL_POLICY_RESPONSE
* APPROVAL_POLICY_CACHE
* APPROVAL_POLICY_SNAPSHOT
* APPROVAL_POLICY_EVIDENCE
* APPROVAL_POLICY_DIGEST
* APPROVAL_POLICY_ANALYTICS
* APPROVAL_POLICY_DRIFT
* APPROVAL_POLICY_SIMULATION
* APPROVAL_POLICY_REVALIDATION
* APPROVAL_POLICY_RECONCILIATION

---

# 3. Policy Request Model

Request는 최소 다음 요소를 포함한다.

### Subject

* User
* Service
* Machine Identity
* API Client
* Session
* Device

### Resource

* Application
* Module
* Screen
* API
* Dataset
* Database
* Table
* Document
* File

### Action

* Read
* Create
* Update
* Delete
* Approve
* Execute
* Export
* Import
* Configure

### Environment

* Time
* Region
* Device
* Network
* Risk
* Authentication
* Business Calendar

---

# 4. PDP (Policy Decision Point)

PDP는 다음 정보를 모두 평가한다.

* Effective Role
* Effective Permission
* Scope
* Constraint
* Explicit Deny
* Dynamic Rule
* Runtime Context
* Risk
* Policy
* SoD
* JIT
* Compliance

출력은 Deterministic 해야 한다.

---

# 5. PEP (Policy Enforcement Point)

PEP는 다음 위치에 존재할 수 있다.

* API Gateway
* Backend Service
* Microservice
* Workflow Engine
* Scheduler
* Batch Engine
* GraphQL
* REST API
* gRPC
* Message Queue
* UI Layer

PEP는 PDP를 우회할 수 없다.

---

# 6. PIP (Policy Information Point)

정보 공급

* User Attribute
* Organization
* Role
* Assignment
* Session
* Device
* Risk
* Scope
* Runtime Context
* Threat Intelligence

---

# 7. PAP (Policy Administration Point)

관리

* Policy 생성
* Policy 수정
* Policy 폐기
* Version 관리
* Approval
* Publishing

---

# 8. Decision Pipeline

Pipeline

1. Request Validation
2. Context Collection
3. Attribute Resolution
4. Effective Role Resolution
5. Scope Resolution
6. Policy Evaluation
7. SoD Evaluation
8. Risk Evaluation
9. Compliance Evaluation
10. Decision Generation
11. Audit
12. Cache Update

Pipeline 순서는 고정한다.

---

# 9. Decision Types

지원

* Permit
* Deny
* Challenge
* Escalate
* Require Approval
* Require MFA
* Require Re-authentication
* Read Only
* Time Limited Permit

---

# 10. Decision Combining Algorithm

지원

* Deny Overrides
* Permit Overrides
* First Applicable
* Ordered
* Highest Priority
* Most Restrictive

기본

Deny Overrides

---

# 11. Policy Package

지원

* Finance Package
* HR Package
* ERP Package
* SCM Package
* CRM Package
* Security Package

---

# 12. Policy Bundle

Bundle

* RBAC Policy
* ABAC Policy
* SoD Policy
* JIT Policy
* Risk Policy
* Compliance Policy

---

# 13. Runtime Context

포함

* Device
* Browser
* Client
* MFA
* Geo
* VPN
* Risk
* Session
* Environment

---

# 14. Runtime Decision Cache

Cache

* Subject
* Resource
* Action
* Context Hash
* Decision
* TTL
* Version

---

# 15. Cache Invalidation

Trigger

* Policy 변경
* Assignment 변경
* Session 종료
* Context 변경
* Risk 변경

---

# 16. Decision Explain

사용자는 확인 가능해야 한다.

* Why Permit?
* Why Deny?
* Which Policy?
* Which Rule?
* Which Scope?
* Which Assignment?
* Which Deny?
* Which Risk?

---

# 17. Decision Analytics

지표

* Permit
* Deny
* Challenge
* Average Latency
* Cache Hit
* Policy Coverage
* Policy Execution Count

---

# 18. Drift Detection

탐지

* Policy Drift
* Decision Drift
* Runtime Drift
* Scope Drift

---

# 19. Revalidation

Trigger

* Policy 변경
* Runtime 변경
* Assignment 변경
* Context 변경

---

# 20. Reconciliation

비교

* Runtime Decision
* Snapshot
* Cached Decision

---

# 21. Simulation

Simulation

* New Policy
* New Rule
* New Context
* New Scope

영향 분석

* Permit 변화
* Deny 변화
* Latency
* Cache

---

# 22. Snapshot

저장

* Request
* Decision
* Context
* Policy Version
* Timestamp

---

# 23. Evidence

저장

* Evaluation Chain
* Rule Trace
* Scope Trace
* Assignment Trace
* Risk Trace

---

# 24. Digest

입력

* Request
* Decision
* Snapshot
* Evidence

---

# 25. Runtime Guard

차단

* PDP Bypass
* PEP Disable
* Invalid Context
* Invalid Policy
* Cache Poisoning
* Unauthorized Decision

---

# 26. Static Lint

탐지

* Direct Permission Check
* Hardcoded Authorization
* Missing PDP
* Missing PEP
* Missing Audit
* Missing Snapshot

---

# 27. Error Contract

구현

* PDP_TIMEOUT
* PEP_FAILURE
* POLICY_NOT_FOUND
* POLICY_EVALUATION_FAILED
* CONTEXT_NOT_AVAILABLE
* DECISION_CACHE_CORRUPTED
* DECISION_GENERATION_FAILED

---

# 28. Warning Contract

구현

* Policy Deprecated
* Decision Latency High
* Cache Miss Spike
* Runtime Drift
* Missing Context Attribute

---

# 29. API

최소

* Evaluate Policy
* Explain Decision
* Publish Policy
* Simulate Policy
* Query Decision
* Query Analytics

---

# 30. Database Constraint

적용

* Immutable Policy Version
* Immutable Decision Snapshot
* Bundle Integrity
* Package Integrity
* Tenant Isolation

---

# 31. Index

구축

* Policy
* Version
* Subject
* Resource
* Action
* Decision
* Snapshot

---

# 32. 성능 요구사항

* P95 Decision ≤ 15ms
* P99 Decision ≤ 40ms
* Cache Hit ≥ 98%
* Explain Generation ≤ 100ms
* 500K Decisions/sec 지원
* Horizontal Scale 지원

---

# 33. 테스트

Unit

* PDP
* PEP
* PIP
* PAP
* Decision Engine

Integration

* Effective Role Resolution
* JIT
* SoD
* Dynamic Role
* Runtime Authorization

Performance

* 500K Decisions/sec
* 100M Cache Entries
* 5M Concurrent Sessions

Security

* PDP Bypass
* PEP Disable
* Cache Poisoning
* Context Manipulation
* Policy Injection

Compliance

* NIST SP 800-162
* Zero Trust
* XACML
* ISO 27001
* SOC 2

Regression

* RBAC
* Workflow
* Approval
* Audit

---

# 34. Completion Gate

완료 조건

* PDP 구축
* PEP 구축
* PIP 구축
* PAP 구축
* Decision Pipeline 구축
* Decision Cache 구축
* Explain Engine 구축
* Snapshot 구축
* Evidence 구축
* Digest 구축
* Analytics 구축
* Drift 구축
* Revalidation 구축
* Simulation 구축
* Runtime Guard 구축
* Static Lint 구축
* Performance Benchmark 통과
* Zero Trust Decision Validation 통과
* Regression Test 100% 통과

---

# 35. 다음 추천 구현 순서

1. **Part 3-13 — Zero Trust Identity & Continuous Authorization Governance**
2. Part 3-14 — Enterprise Authorization Observability & Forensics Governance
3. Part 3-15 — Enterprise Authorization AI Governance & Autonomous Optimization
4. Part 3-16 — Unified Enterprise Authorization Fabric
5. Part 3-17 — Enterprise Authorization Compliance & Regulatory Governance
6. Part 3-18 — Global Authorization Federation & Cross-Domain Governance
7. Part 3-19 — Enterprise Autonomous Authorization Control Plane
