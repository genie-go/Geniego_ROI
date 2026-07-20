# GeniegoROI Enterprise Engineering Handbook

## EPIC 06-A-03-02-03-04 — Part 3-4

# Scoped Role Governance

Version 1.0

> **영속 메모**: 사용자 제공 스펙 원문(verbatim)을 289차 후속 회차에 그대로 저장. 설계 거버넌스 파이프라인 ⓐ 단계 산출물. **코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**. 실 엔진 구현은 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Role Assignment(Part 3-3)·Decision Core 실구현 후 별도 승인세션(RP-002). 내용 임의 수정 금지.

---

# 0. 작업 목적

이번 단계에서는 **Role Assignment** 위에 Enterprise급 **Scoped Role Governance**를 구축한다. Role만 가지고 접근을 결정하지 않는다. 반드시 다음 요소를 함께 계산한다.

Who(주체) · What(Role) · Where(Scope) · Which Resource · Which Organization · Which Legal Entity · Which Project · Which Business Unit · Which Region · Which Data · Which Environment · Which Time · Which Device · Which Client · Which Network · Which Session.

이번 Part의 목표는 **"같은 Role이라도 Scope가 다르면 서로 다른 권한"** 이라는 Enterprise 모델을 완성하는 것이다.

---

# 1. 구현 목표

Scoped RBAC Foundation 구축. 지원 Scope: Tenant · Legal Entity · Organization · Business Unit · Position · Department · Team · Project · Cost Center · Warehouse · Plant · Branch · Country · Region · City · Resource Type · Resource Instance · Asset · Application · Module · Screen · API · Dataset · Document · Folder · Field · Currency · Amount · Time · Shift · Device · Client · Network · Session · Environment.

---

# 2. Canonical Entity

`APPROVAL_SCOPE_REGISTRY` · `APPROVAL_SCOPE_DEFINITION` · `APPROVAL_SCOPE_VERSION` · `APPROVAL_SCOPE_TYPE` · `APPROVAL_SCOPE_POLICY` · `APPROVAL_SCOPE_VALUE` · `APPROVAL_SCOPE_MAPPING` · `APPROVAL_SCOPE_ASSIGNMENT` · `APPROVAL_SCOPE_CONSTRAINT` · `APPROVAL_SCOPE_CONTEXT` · `APPROVAL_SCOPE_PROJECTION` · `APPROVAL_SCOPE_RESOLUTION` · `APPROVAL_SCOPE_SNAPSHOT` · `APPROVAL_SCOPE_EVIDENCE` · `APPROVAL_SCOPE_DIGEST` · `APPROVAL_SCOPE_DRIFT` · `APPROVAL_SCOPE_SIMULATION` · `APPROVAL_SCOPE_CACHE` · `APPROVAL_SCOPE_REVALIDATION` · `APPROVAL_SCOPE_RECONCILIATION`

---

# 3. Scope Type

TENANT · LEGAL_ENTITY · ORGANIZATION · BUSINESS_UNIT · COST_CENTER · POSITION · PROJECT · RESOURCE_TYPE · RESOURCE_INSTANCE · DATASET · DOCUMENT · FOLDER · FIELD · APPLICATION · MODULE · API · SCREEN · REGION · COUNTRY · CITY · WAREHOUSE · PLANT · BRANCH · CURRENCY · AMOUNT · TIME · SHIFT · DEVICE · CLIENT · NETWORK · SESSION · ENVIRONMENT

# 4. Scope Registry

Registry ID · Tenant · Registry Type · Version · Policy · Owner · Evidence · Digest.

# 5. Scope Definition

Scope ID · Scope Code · Scope Name · Scope Type · Parent Scope · Scope Path · Active Version · Owner · Status.

# 6. Scope Version

Initial · Update · Merge · Split · Rename · Deprecation · Migration. Immutable.

# 7. Scope Assignment

Role Assignment와 연결. 저장: Assignment · Scope · Version · Priority · Effective Time · Expiration.

# 8. Scope Context

User · Session · Device · Network · Location · Organization · Project · Application.

# 9. Scope Policy

Intersection · Union · Most Restrictive · Explicit Mapping · Dynamic Rule. 기본 Intersection.

# 10. Scope Resolution

계산: Role Scope · Assignment Scope · Permission Scope · Session Scope · Runtime Scope. 최종 Effective Scope.

# 11. Scope Projection

Effective Tenant · Effective Organization · Effective Project · Effective Resource · Effective Dataset · Effective API.

# 12. Scope Constraint

Read Only · Time Window · Amount Limit · Country Restriction · Region Restriction · Device Restriction · Client Restriction · API Restriction.

# 13. Scope Hierarchy

Parent Scope · Child Scope · Ancestor · Descendant. 조직 계층과 분리 관리.

# 14. Organization Scope

Company · HQ · Branch · Department · Team. 자동 확장 금지.

# 15. Project Scope

Project · Program · Portfolio.

# 16. Resource Scope

Resource Type · Resource ID · Resource Pattern. Wildcard는 정책으로 제한.

# 17. Dataset Scope

Dataset · Schema · Table · Column · Row.

# 18. Document Scope

Folder · Document · Category.

# 19. API Scope

API · Endpoint · Method.

# 20. Environment Scope

DEV · QA · STAGING · PROD. 기본 PROD 분리.

# 21. Time Scope

Date · Time · Weekday · Shift · Holiday.

# 22. Device Scope

Managed Device · BYOD · Kiosk · Mobile · Desktop.

# 23. Network Scope

Office · VPN · Public · Internal.

# 24. Client Scope

Browser · Mobile · API Client · Service Client.

# 25. Amount Scope

Currency · Maximum · Minimum. Approval에서 중요.

# 26. Dynamic Scope

Reference만 제공. 후속 Dynamic Governance에서 구현.

# 27. Effective Scope Engine

계산: Assignment · Permission · Runtime · Session · Context. 출력 Effective Scope.

# 28. Scope Conflict

Overlap · Expansion · Invalid Mapping · Invalid Parent · Invalid Version.

# 29. Scope Expansion Guard

차단: Tenant · Organization · Resource · Dataset · Time · Device · Environment Expansion.

# 30. Scope Reduction

Narrow Scope · Restricted Scope · Child Scope.

# 31. Scope Simulation

Add Scope · Remove Scope · Merge Scope · Split Scope. 영향 분석 제공.

# 32. Scope Drift

Organization · Project · Dataset · Resource · Policy Drift.

# 33. Scope Revalidation

Trigger: Organization/Project/Policy/Role/Assignment 변경.

# 34. Scope Reconciliation

비교: Snapshot · Runtime · Assignment · Policy.

# 35. Scope Snapshot

Effective Scope · Assignment · Version · Projection.

# 36. Scope Evidence

Resolution · Policy · Mapping · Snapshot.

# 37. Scope Digest

Scope · Assignment · Version · Policy · Projection.

# 38. Cache

Scope Projection · Effective Scope · Runtime Scope. Version 기반.

# 39. Cache Invalidation

Scope · Organization · Project · Assignment · Policy 변경.

# 40. Runtime Guard

차단: Invalid Scope · Expanded Scope · Expired Scope · Invalid Version · Invalid Context.

# 41. Static Lint

Hardcoded Scope · Organization Auto Expansion · Wildcard Scope · Missing Version · Missing Snapshot · Missing Policy.

# 42. Error Contract

SCOPE_NOT_FOUND · INVALID_SCOPE · SCOPE_EXPANDED · SCOPE_VERSION_INVALID · SCOPE_CONTEXT_INVALID · SCOPE_POLICY_BLOCKED.

# 43. Warning Contract

Scope Expanded · Scope Deprecated · Scope Review Required · Scope Drift.

# 44. API

Scope 생성 · 수정 · 조회 · Simulation · Effective Scope 조회 · Scope Drift 조회.

# 45. Database Constraint

Unique Scope Code · Immutable Version · Parent Validation · Scope Path Validation · Tenant Isolation · Version Binding.

# 46. Index

Scope Code · Scope Type · Parent · Version · Assignment · Projection.

# 47. 테스트

Unit(Scope/Resolution/Projection/Policy) · Integration(Assignment/Permission/Organization) · Security(Scope Escalation/Wildcard Abuse/Tenant Bypass) · Regression(Approval/Assignment/RBAC/Workflow).

# 48. Completion Gate

Scope Registry · Version · Assignment · Resolution · Projection · Simulation · Drift · Revalidation · Runtime Guard · Static Lint · Snapshot · Evidence · Cache 구축 · Regression 완료.

# 49. 다음 추천 구현 순서

1. **Part 3-5 Dynamic Role Governance** 2. Part 3-6 Service/System Role 3. Part 3-7 Effective Role Resolution Engine 4. Part 3-8 Role Certification & Access Review 5. Part 3-9 JIT Access 6. Part 3-10 Runtime SoD Enforcement 7. Part 3-11 Enterprise RBAC Analytics & Governance.

---

## 설계 거버넌스 판정 (이번 회차)

**설계 명세(코드 0)**. §48 완료조건을 실 엔진이 아니라 Canonical Interface·확장 포인트·Gap·선행 전제·Adapter Requirement 설계 명세로 충족. ★실 scope substrate 상당 실재 예상(`data_scope` 9차원·`effectiveScope` fail-closed·tenant 격리·api_key scopes·amount high_value ₩5M 승인게이트·environment envLabel) → PARTIAL/PRESENT, 거버넌스 계층(Registry/Version/Projection 영속/Drift/Simulation/Snapshot/Effective Scope Engine)은 순신규. 실 엔진=선행 Permission Engine·Role Registry/Hierarchy/Assignment·Decision Core 실구현 후 RP-002. NOT_CERTIFIED · BLOCKED_PREREQUISITE.
