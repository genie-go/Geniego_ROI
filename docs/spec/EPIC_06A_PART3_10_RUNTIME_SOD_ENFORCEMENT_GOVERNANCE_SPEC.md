# GeniegoROI Enterprise Engineering Handbook

## EPIC 06-A-03-02-03-04 — Part 3-10

# Enterprise Runtime Segregation of Duties (SoD) Enforcement Governance

Version 1.0

> **거버넌스 상태**: 설계 명세(Design Specification) — **코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**.
> **원문 출처**: 본 SPEC 본문(§0~§41)은 **사용자 제공 canonical handbook 원문 verbatim**이다(2026-07-20 제공).
> 상위 ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth(반날조 인용 근거): `docs/segmentation/DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①) · `docs/segmentation/DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②).
> **규율**: 본 명세는 계약(Contract) 확정용이며 실 엔진 구현은 선행 Decision Core(Part 1~3-9 인증) 완료 후 별도 RP-track 승인세션에서 수행한다. 모든 하위 DSAR의 file:line 인용은 위 Ground-Truth 2문서에만 근거한다(허용목록 밖 인용 0).

---

# 0. 작업 목적

이번 단계에서는 Enterprise Authorization의 핵심 통제인 **Segregation of Duties(SoD, 직무분리)** 를 **설계 시점이 아니라 Runtime까지 강제(Enforcement)** 하는 Governance를 구축한다.

본 모듈은 단순히 "충돌하는 Role을 정의"하는 수준이 아니라,

* Assignment 시점
* Approval 시점
* Session 생성 시점
* Permission 계산 시점
* Workflow 실행 시점
* API 호출 시점
* Transaction 승인 시점
* Runtime 실행 중

모든 단계에서 SoD를 지속적으로 평가하고 차단해야 한다.

본 모듈은 다음을 만족해야 한다.

* Static SoD
* Dynamic SoD
* Runtime SoD
* Temporal SoD
* Context-aware SoD
* Cross-System SoD
* Cross-Tenant Isolation
* Risk-aware SoD
* Explainable Conflict Resolution
* Immutable Audit
* Compliance-ready

---

# 1. 구현 목표

다음을 구축한다.

1. SoD Registry
2. Conflict Rule Registry
3. Conflict Matrix
4. Role Conflict Engine
5. Permission Conflict Engine
6. Scope Conflict Engine
7. Context Conflict Engine
8. Transaction Conflict Engine
9. Workflow Conflict Engine
10. Session Conflict Engine
11. Runtime Conflict Evaluator
12. Conflict Risk Engine
13. Conflict Exception Management
14. Temporary Exception
15. Emergency Override
16. Compensating Control
17. Conflict Evidence
18. Conflict Snapshot
19. Conflict Digest
20. Conflict Analytics
21. Conflict Drift
22. Conflict Simulation
23. Conflict Revalidation
24. Conflict Reconciliation
25. Runtime Guard
26. Static Lint
27. APIs
28. Completion Gate

---

# 2. Canonical Entity

구축

* APPROVAL_SOD_REGISTRY
* APPROVAL_SOD_RULE
* APPROVAL_SOD_MATRIX
* APPROVAL_SOD_ROLE_CONFLICT
* APPROVAL_SOD_PERMISSION_CONFLICT
* APPROVAL_SOD_SCOPE_CONFLICT
* APPROVAL_SOD_CONTEXT_CONFLICT
* APPROVAL_SOD_TRANSACTION_CONFLICT
* APPROVAL_SOD_SESSION
* APPROVAL_SOD_RUNTIME
* APPROVAL_SOD_EXCEPTION
* APPROVAL_SOD_OVERRIDE
* APPROVAL_SOD_COMPENSATING_CONTROL
* APPROVAL_SOD_SNAPSHOT
* APPROVAL_SOD_EVIDENCE
* APPROVAL_SOD_DIGEST
* APPROVAL_SOD_ANALYTICS
* APPROVAL_SOD_DRIFT
* APPROVAL_SOD_SIMULATION
* APPROVAL_SOD_REVALIDATION
* APPROVAL_SOD_RECONCILIATION

---

# 3. Conflict Rule

지원

* Role vs Role
* Permission vs Permission
* Scope vs Scope
* Transaction vs Transaction
* Workflow Step vs Workflow Step
* Organization vs Organization
* Dataset vs Dataset
* Environment vs Environment

---

# 4. Static SoD

평가 시점

* Assignment 생성
* Assignment 수정
* Role 생성
* Permission 생성

---

# 5. Dynamic SoD

평가

* Session
* Runtime Role
* Dynamic Role
* Temporary Role
* JIT Access

---

# 6. Runtime SoD

평가

* API 호출
* 승인 요청
* 결재 처리
* 데이터 조회
* 데이터 수정
* Export
* Delete

---

# 7. Temporal SoD

평가

* 동일 일자
* 동일 Session
* 동일 Transaction
* 동일 Approval Cycle
* 지정 기간

예)

생성과 승인 행위를 같은 사용자가 일정 기간 내 수행 불가.

---

# 8. Context-aware SoD

Context

* Device
* Region
* Project
* Environment
* Business Calendar
* Risk Level

---

# 9. Session Conflict

탐지

* 동시에 활성화된 Role
* Runtime Dynamic Role
* Temporary Assignment
* Emergency Role

---

# 10. Transaction Conflict

예시

* Invoice 생성 ↔ Invoice 승인
* Vendor 등록 ↔ Vendor 승인
* User 생성 ↔ User 활성화
* Payment 생성 ↔ Payment 승인

---

# 11. Workflow Conflict

검사

* 동일 Workflow
* 동일 Instance
* 동일 Approval Chain
* 동일 Document

---

# 12. Scope Conflict

탐지

* 동일 Dataset
* 동일 Organization
* 동일 Tenant
* 동일 Project
* 동일 Resource

---

# 13. Permission Conflict

탐지

* Read ↔ Audit Approval
* Create ↔ Approve
* Register ↔ Close
* Issue ↔ Revoke
* Configure ↔ Certify

---

# 14. Conflict Matrix

Matrix 저장

* Left Entity
* Right Entity
* Conflict Type
* Severity
* Resolution Strategy

---

# 15. Severity

등급

* Low
* Medium
* High
* Critical
* Regulatory

---

# 16. Resolution Strategy

지원

* Block
* Challenge
* Approval Required
* Escalation
* Temporary Override
* Break Glass

---

# 17. Risk Engine

평가

* Critical Permission
* Financial Impact
* Compliance Impact
* Data Classification
* Environment
* Runtime Behavior

---

# 18. Exception Management

지원

* Business Exception
* Regulatory Exception
* Temporary Exception
* Executive Exception

---

# 19. Temporary Exception

필수

* Duration
* Reason
* Approval
* Evidence

자동 종료.

---

# 20. Emergency Override

조건

* Incident
* Disaster
* Production Failure

사후 감사 필수.

---

# 21. Compensating Control

지원

* Additional Approval
* Enhanced Logging
* Mandatory MFA
* Continuous Monitoring
* Manual Audit

---

# 22. Runtime Conflict Evaluation

실행 시점

* Every Request
* Every Approval
* Every Sensitive Action
* Every Privileged Operation

---

# 23. Conflict Snapshot

저장

* Active Roles
* Active Permissions
* Active Scope
* Session
* Runtime Context
* Conflict State

---

# 24. Evidence

저장

* Conflict Rule
* Runtime Evaluation
* Policy Decision
* Exception
* Approval
* Audit

---

# 25. Digest

입력

* Subject
* Runtime
* Conflict
* Resolution
* Snapshot

---

# 26. Analytics

지표

* Total Conflicts
* Blocked Requests
* Exception Usage
* Override Usage
* High Risk Conflicts
* Top Violated Rules
* Average Resolution Time

---

# 27. Drift Detection

탐지

* Rule Drift
* Matrix Drift
* Runtime Drift
* Scope Drift
* Assignment Drift

---

# 28. Revalidation

Trigger

* Role 변경
* Permission 변경
* Policy 변경
* Runtime 변경
* Organization 변경

---

# 29. Reconciliation

비교

* Runtime
* Snapshot
* Assignment
* Previous Evaluation

---

# 30. Simulation

Simulation

* New Conflict Rule
* New Role
* Permission 변경
* Workflow 변경

영향 분석

* Blocked Operations
* Approval 증가
* Runtime Latency
* Risk 감소

---

# 31. Runtime Guard

차단

* SoD Conflict
* Critical Conflict
* Invalid Exception
* Expired Exception
* Scope Escalation
* Override Abuse

---

# 32. Static Lint

탐지

* Missing SoD Rule
* Hardcoded Exception
* Direct Permission Bypass
* Missing Evidence
* Missing Snapshot
* Disabled Runtime Check

---

# 33. Error Contract

구현

* SOD_CONFLICT_DETECTED
* SOD_RULE_NOT_FOUND
* SOD_RUNTIME_BLOCKED
* SOD_EXCEPTION_EXPIRED
* SOD_OVERRIDE_DENIED
* SOD_COMPENSATING_CONTROL_REQUIRED
* SOD_POLICY_VIOLATION

---

# 34. Warning Contract

구현

* Frequent Conflict
* Temporary Exception Expiring
* Override Usage Increased
* Runtime Risk Elevated
* Missing Review

---

# 35. API

최소

* Conflict Rule 생성
* Conflict Matrix 조회
* Runtime Evaluation
* Conflict Simulation
* Exception 등록
* Override 요청
* Analytics 조회
* Explain Conflict

---

# 36. Database Constraint

적용

* Immutable Conflict Rule
* Matrix Integrity
* Snapshot Integrity
* Tenant Isolation
* Digest Validation

---

# 37. Index

구축

* Conflict Rule
* Role
* Permission
* Scope
* Transaction
* Workflow
* Severity
* Status

---

# 38. 성능 요구사항

* Runtime Conflict Evaluation ≤ 10ms
* Conflict Lookup ≤ 5ms
* Explain Generation ≤ 100ms
* Simulation ≤ 3초
* Cache Hit ≥ 97%
* False Positive ≤ 0.5%

---

# 39. 테스트

Unit

* Rule
* Matrix
* Runtime Evaluation
* Exception
* Override

Integration

* RBAC
* JIT
* Effective Resolution Engine
* Workflow
* Approval

Performance

* 200K Runtime Evaluations/sec
* 10M Conflict Checks/day
* 1M Concurrent Sessions

Security

* SoD Bypass
* Exception Abuse
* Override Abuse
* Runtime Injection
* Matrix Manipulation

Compliance

* SOX
* ISO 27001
* SOC 2
* PCI DSS
* NIST
* COBIT

Regression

* Authorization
* Assignment
* Policy
* Audit
* Compliance

---

# 40. Completion Gate

완료 조건

* SoD Registry 구축
* Conflict Matrix 구축
* Runtime Evaluation 구축
* Transaction SoD 구축
* Workflow SoD 구축
* Session SoD 구축
* Exception Management 구축
* Emergency Override 구축
* Compensating Control 구축
* Analytics 구축
* Snapshot 구축
* Evidence 구축
* Digest 구축
* Drift 구축
* Revalidation 구축
* Simulation 구축
* Runtime Guard 구축
* Static Lint 구축
* Performance Benchmark 통과
* Compliance Validation 통과
* Runtime Enforcement Validation 통과
* Regression Test 100% 통과

---

# 41. 다음 추천 구현 순서

1. **Part 3-11 — Enterprise RBAC Analytics & Governance Dashboard**
2. Part 3-12 — Policy Decision Point (PDP) & Policy Enforcement Point (PEP) Governance
3. Part 3-13 — Zero Trust Identity & Continuous Authorization Governance
4. Part 3-14 — Enterprise Authorization Observability & Forensics Governance
5. Part 3-15 — Enterprise Authorization AI Governance & Autonomous Optimization
6. Part 3-16 — Unified Enterprise Authorization Fabric
7. Part 3-17 — Enterprise Authorization Compliance & Regulatory Governance
