# GeniegoROI Enterprise Engineering Handbook

## EPIC 06-A-03-02-03-04 — Part 3-5

# Dynamic Role Governance (ABAC + Rule Engine + Context-Aware RBAC)

Version 1.0

> **영속 메모**: 사용자 제공 스펙 원문(verbatim)을 289차 후속 회차에 그대로 저장. 설계 거버넌스 파이프라인 ⓐ 단계 산출물. **코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**. 실 엔진 구현은 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실구현 후 별도 승인세션(RP-002). 내용 임의 수정 금지.

---

# 0. 작업 목적

이 단계에서는 기존의 **정적(Role Assignment 기반) RBAC**를 확장하여 **Dynamic Role Governance**를 구축한다. 핵심 목표:

> **"사용자에게 항상 동일한 Role을 부여하는 것이 아니라, 현재의 상황(Context)에 따라 Role이 자동 생성·활성·비활성되도록 한다."**

구현: Context-Aware RBAC · ABAC · Rule Engine 기반 Dynamic Role · Runtime Role Evaluation · Session Role · Conditional Role · Policy Decision · Policy Enforcement Foundation · Dynamic Permission Projection · Runtime Scope Projection.

---

# 1. 구현 범위

1. Dynamic Role Registry 2. Dynamic Role Definition 3. Dynamic Role Version 4. Runtime Role 5. Session Role 6. Context Role 7. Conditional Role 8. Attribute-based Role 9. Rule-based Role 10. Dynamic Permission Projection 11. Runtime Scope Projection 12. Runtime Constraint Projection 13. Dynamic Role Evaluation 14. Dynamic Role Activation 15. Dynamic Role Expiration 16. Dynamic Role Cache 17. Dynamic Role Snapshot 18. Dynamic Role Evidence 19. Dynamic Role Digest 20. Rule Engine 21. Rule Expression 22. Rule Version 23. Rule Context 24. Rule Evaluation Result 25. Runtime Policy 26. Policy Decision 27. Policy Enforcement Foundation 28. Runtime Risk Evaluation 29. Dynamic Role Drift 30. Dynamic Role Simulation 31. Dynamic Role Revalidation 32. Dynamic Role Reconciliation 33. Runtime Guard 34. Static Lint 35. APIs 36. Completion Gate

---

# 2. Canonical Entity

`APPROVAL_DYNAMIC_ROLE_REGISTRY` · `APPROVAL_DYNAMIC_ROLE` · `APPROVAL_DYNAMIC_ROLE_VERSION` · `APPROVAL_DYNAMIC_ROLE_RULE` · `APPROVAL_DYNAMIC_ROLE_ATTRIBUTE` · `APPROVAL_DYNAMIC_ROLE_CONTEXT` · `APPROVAL_DYNAMIC_ROLE_SESSION` · `APPROVAL_DYNAMIC_ROLE_RUNTIME` · `APPROVAL_DYNAMIC_ROLE_POLICY` · `APPROVAL_DYNAMIC_ROLE_EVALUATION` · `APPROVAL_DYNAMIC_ROLE_PROJECTION` · `APPROVAL_DYNAMIC_ROLE_CACHE` · `APPROVAL_DYNAMIC_ROLE_SNAPSHOT` · `APPROVAL_DYNAMIC_ROLE_EVIDENCE` · `APPROVAL_DYNAMIC_ROLE_DIGEST` · `APPROVAL_DYNAMIC_ROLE_DRIFT` · `APPROVAL_DYNAMIC_ROLE_SIMULATION` · `APPROVAL_DYNAMIC_ROLE_REVALIDATION` · `APPROVAL_DYNAMIC_ROLE_RECONCILIATION`

---

# 3. Dynamic Role 유형

Runtime Role · Session Role · Conditional Role · Attribute Role · Rule Role · Calculated Role · Context Role · Emergency Context Role · Read-only Context Role · Temporary Context Role.

# 4. Attribute Source

User Attribute · Organization Attribute · Position · Department · Employment Status · Tenant · Region · Country · Language · Device · Network · Authentication Level · MFA 여부 · Session Age · Login Time · Risk Score · Client Type · Environment · Business Calendar · Project · Cost Center.

# 5. Runtime Context

Current User · Current Session · Current Device · Current Network · Current IP · Current Region · Current Organization · Current Project · Current Environment · Current Time · Authentication Context.

# 6. Rule Engine

Boolean Expression · DSL Rule · JSON Rule · Policy Reference · Rule Composition · Nested Rule · Rule Group · Rule Priority.

# 7. Rule Expression

예시: IF Department=Finance AND MFA=TRUE AND BusinessHours=TRUE THEN Activate Finance Approver Role.

# 8. Rule Version

Immutable Version: Initial · Update · Security Patch · Optimization · Migration.

# 9. Rule Evaluation

출력: TRUE · FALSE · UNKNOWN · ERROR. ★UNKNOWN은 Permit하지 않는다.

# 10. Dynamic Role Activation

Trigger: Login · MFA Success · Session Created · Organization Changed · Context Changed · Project Changed · Risk Changed · Manual Refresh.

# 11. Dynamic Role Expiration

Session End · Timeout · Business Hours 종료 · Risk 상승 · Context 변경 · Project 종료.

# 12. Session Role

Session에만 존재. 세션 종료 시 자동 삭제.

# 13. Conditional Role

조건: Time · Device · Project · Region · Client · Network · Risk · Authentication.

# 14. Runtime Permission Projection

Static Permission · Dynamic Permission · Runtime Constraint · Runtime Scope.

# 15. Runtime Scope Projection

Tenant · Organization · Project · Dataset · API.

# 16. Runtime Constraint

Read Only · Amount · Time · Device · Network · Session.

# 17. Runtime Policy

Allow · Deny · Require MFA · Require Approval · Require Re-authentication.

# 18. Policy Decision

Permit · Deny · Challenge · Escalate · Manual Review.

# 19. Policy Enforcement Foundation

후속 PEP/PDP 구현을 위한 Foundation 제공.

# 20. Runtime Risk

Session Risk · Device Risk · Network Risk · Geo Risk · Authentication Risk · User Risk.

# 21. Dynamic Projection

Effective Role · Effective Permission · Effective Scope · Effective Constraint.

# 22. Cache

Context Cache · Rule Cache · Projection Cache · Evaluation Cache. Version 기반.

# 23. Cache Invalidation

Rule 변경 · Context 변경 · Session 종료 · Risk 변경 · Policy 변경.

# 24. Drift

Rule Drift · Context Drift · Projection Drift · Policy Drift.

# 25. Revalidation

Rule Update · User Attribute 변경 · Organization 변경 · Session 변경 · Policy 변경.

# 26. Reconciliation

Rule · Runtime · Snapshot · Projection 비교.

# 27. Simulation

Rule/Attribute/Context/Policy 변경. 영향 분석: Activated Roles · Removed Roles · Permission 변화 · Scope 변화.

# 28. Runtime Guard

차단: Invalid Rule · Unknown Decision · Invalid Context · Missing Attribute · Missing Version · Invalid Projection.

# 29. Static Lint

Hardcoded Rule · Java if(Role) · SQL Role Injection · Missing Version · Missing Snapshot · Permit on Unknown.

# 30. Error Contract

RULE_NOT_FOUND · RULE_VERSION_INVALID · ATTRIBUTE_NOT_FOUND · CONTEXT_INVALID · RUNTIME_ROLE_INVALID · POLICY_BLOCKED · EVALUATION_FAILED.

# 31. Warning Contract

Rule Deprecated · Rule Drift · Context Drift · Runtime Review Required.

# 32. API

Dynamic Role 조회 · Rule 조회 · Rule Simulation · Runtime Projection 조회 · Effective Dynamic Role 조회.

# 33. Database Constraint

Immutable Version · Rule Version Binding · Tenant Isolation · Digest Validation.

# 34. Index

Rule · Context · Projection · Runtime · Version.

# 35. 테스트

Unit(Rule/Context/Projection/Runtime) · Integration(Assignment/Scope/Permission) · Security(Rule Injection/Context Injection/Unknown Permit/Policy Bypass) · Regression(Approval/Workflow/Assignment).

# 36. Completion Gate

Dynamic Registry · Rule Engine · Runtime Projection · Context Projection · Session Role · Conditional Role · Cache · Drift · Revalidation · Runtime Guard · Static Lint · Snapshot · Evidence 구축 · Regression 완료.

# 37. 다음 추천 구현 순서

1. **Part 3-6 Service/System Role Governance** 2. Part 3-7 Effective Role Resolution Engine 3. Part 3-8 Role Certification & Access Review 4. Part 3-9 JIT Access 5. Part 3-10 Runtime SoD Enforcement 6. Part 3-11 Enterprise RBAC Analytics 7. Part 3-12 PDP & PEP Governance.

---

## 설계 거버넌스 판정 (이번 회차)

**설계 명세(코드 0)**. §36 완료조건을 Canonical Interface·확장 포인트·Gap·선행 전제·Adapter Requirement 설계 명세로 충족. ★Dynamic Role/Rule Engine/Runtime Role Evaluation/Session Role/PDP·PEP은 대부분 순신규(ABSENT) 예상·근접 substrate(data_scope=ABAC 데이터필터·MFA/session/risk 속성 필드·envLabel 환경·Part 3-2/3-3 Conditional Component Rule Reference·마케팅 도메인 Alerting/AutoCampaign rule은 KEEP_SEPARATE)는 PARTIAL/근접으로 정직 판정. 실 엔진=선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core 실구현 후 RP-002. NOT_CERTIFIED · BLOCKED_PREREQUISITE.
