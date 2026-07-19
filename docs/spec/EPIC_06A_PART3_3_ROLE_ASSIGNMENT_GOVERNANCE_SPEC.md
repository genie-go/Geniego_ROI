# GeniegoROI Enterprise Engineering Handbook

## EPIC 06-A-03-02-03-04 — Part 3-3

# Role Assignment Governance

Version 1.0

> **영속 메모**: 사용자 제공 스펙 원문(verbatim)을 289차 후속 회차에 그대로 저장. 설계 거버넌스 파이프라인 ⓐ 단계 산출물. **코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**. 실 엔진 구현은 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Decision Core 실구현 후 별도 승인세션(RP-002). 내용 임의 수정 금지.

---

# 0. 작업 목적

앞 단계에서 구축한 다음 Foundation 위에 Enterprise급 **Role Assignment Governance**를 구축하라.

이번 단계의 핵심은 **Role Definition**과 **Role Hierarchy**를 실제 **Subject(사용자·서비스·시스템)** 에 안전하게 할당하는 것이다.

Role Assignment는 단순한 `user_role` 테이블이나 `user.roles[]` 배열 수준으로 구현하지 않는다.

이번 단계에서는 다음 특성을 갖는 Canonical Assignment Engine을 구축한다.

Canonical · Immutable · Versioned · Assignment Lifecycle 기반 · Approval 기반 · Policy 기반 · Scope-aware · Time-aware · Risk-aware · Evidence-backed · Snapshot-based · Simulation-ready · Revalidation-ready · Audit-ready · SoD-ready · Delegation-ready · Emergency-ready · Multi-tenant

---

# 1. 이번 Part에서 구현할 핵심 범위

1. Assignment Registry 2. Assignment Definition 3. Assignment Version 4. Assignment Lifecycle 5. Assignment Status 6. Direct Assignment 7. Group Assignment 8. Organization Assignment 9. Position Assignment 10. Job Assignment 11. Dynamic Assignment Reference 12. Temporary Assignment 13. Scheduled Assignment 14. Emergency Assignment 15. Break Glass Assignment 16. Conditional Assignment 17. Assignment Scope 18. Assignment Context 19. Assignment Validity 20. Assignment Approval 21. Assignment Reviewer 22. Assignment Owner 23. Assignment Request 24. Assignment Request Version 25. Assignment Snapshot 26. Assignment Evidence 27. Assignment Digest 28. Assignment Policy 29. Assignment Conflict Detection 30. Assignment Eligibility Validation 31. Assignment Risk Assessment 32. Assignment Expiration 33. Assignment Renewal 34. Assignment Revocation 35. Assignment Suspension 36. Assignment Restoration 37. Assignment Simulation 38. Effective Assignment Resolution 39. Effective Role Assignment Set 40. Effective Permission Assignment Projection 41. Assignment Drift 42. Assignment Revalidation 43. Assignment Reconciliation 44. Assignment Cache 45. Assignment Runtime Guard 46. Assignment Static Lint 47. Assignment APIs 48. Assignment Migration 49. Assignment Audit 50. Completion Gate

---

# 2. Canonical Entity

`APPROVAL_ROLE_ASSIGNMENT_REGISTRY` · `APPROVAL_ROLE_ASSIGNMENT` · `APPROVAL_ROLE_ASSIGNMENT_VERSION` · `APPROVAL_ROLE_ASSIGNMENT_SCOPE` · `APPROVAL_ROLE_ASSIGNMENT_CONTEXT` · `APPROVAL_ROLE_ASSIGNMENT_POLICY` · `APPROVAL_ROLE_ASSIGNMENT_REQUEST` · `APPROVAL_ROLE_ASSIGNMENT_APPROVAL` · `APPROVAL_ROLE_ASSIGNMENT_SNAPSHOT` · `APPROVAL_ROLE_ASSIGNMENT_EVIDENCE` · `APPROVAL_EFFECTIVE_ROLE_ASSIGNMENT` · `APPROVAL_EFFECTIVE_PERMISSION_ASSIGNMENT` · `APPROVAL_ROLE_ASSIGNMENT_DRIFT` · `APPROVAL_ROLE_ASSIGNMENT_REVALIDATION` · `APPROVAL_ROLE_ASSIGNMENT_SIMULATION` · `APPROVAL_ROLE_ASSIGNMENT_RECONCILIATION` · `APPROVAL_ROLE_ASSIGNMENT_CACHE` · `APPROVAL_ROLE_ASSIGNMENT_AUDIT`

---

# 3. Assignment 대상

Assignment 가능한 Subject: Human User · Employee · External User · Partner User · Vendor User · Service Account · API Client · Machine Identity · System Actor · Robot Account.

지원 Assignment 유형: Direct · Indirect · Group · Organization · Position · Job · Dynamic Assignment Reference · Delegated · Temporary · Emergency · Scheduled.

---

# 4. Assignment Registry

Registry ID · Tenant · Registry Type · Assignment Policy · Approval Policy · Renewal Policy · Expiration Policy · Risk Policy · Review Policy · Evidence Policy · Snapshot Policy · Cache Policy · Audit Policy.

---

# 5. Assignment Definition

필수 필드: Assignment ID · Assignment Code · Subject ID · Subject Type · Role Definition ID · Role Version · Assignment Type · Assignment Source · Assignment Owner · Assignment Status · Assignment Lifecycle · Assignment Scope · Effective From · Effective To · Created By · Approved By · Snapshot ID · Digest · Evidence.

---

# 6. Assignment Version

모든 Assignment 변경은 Version을 생성. Version Type: Initial · Renewal · Scope Change · Role Version Change · Expiration Change · Approval Change · Restoration · Suspension · Revocation · Migration · Correction. 과거 Version 수정 금지.

---

# 7. Assignment Lifecycle

Requested · Draft · Pending Review · Pending Approval · Approved · Scheduled · Active · Suspended · Expired · Revoked · Replaced · Archived.

---

# 8. Assignment Scope

Tenant · Legal Entity · Organization · Business Unit · Department · Project · Resource Type · Resource Instance · Region · Country · Currency · Amount · Time · Channel · Client · Device · Environment. Intersection 기본 적용.

---

# 9. Assignment Approval

Auto Approval · Single Approval · Dual Approval · Multi-stage Approval · Emergency Approval · Risk-based Approval · Manual Approval. Approval Reference를 Assignment Version에 고정.

---

# 10. Assignment Request

Request ID · Requester · Requested Role · Requested Scope · Requested Duration · Business Reason · Risk Score · Reviewer · Approver · Decision · Evidence.

---

# 11. Temporary Assignment

Temporary Role · Temporary Scope · Temporary Permission Projection · Expiration · Automatic Removal · Renewal · Reminder. 만료 시 자동 제거.

---

# 12. Emergency Assignment

Incident Reference · Break Glass Reason · Approver · Maximum Duration · Auto Expiration · Mandatory Audit · Mandatory Review · Mandatory Evidence.

---

# 13. Break Glass

Critical Incident · Security Incident · Disaster Recovery · Financial Emergency 에서만 허용. 반드시 Audit · Snapshot · Evidence · Notification · Expiration 수행.

---

# 14. Delegated Assignment

Delegator · Delegate · Delegation Window · Maximum Scope · Maximum Duration · Delegation Evidence. Delegated Assignment는 원 Assignment보다 넓은 Scope를 가질 수 없다.

---

# 15. Effective Assignment Resolution

계산: Direct · Group · Organization · Position · Delegated · Temporary · Emergency · Dynamic Assignment Reference. 모든 결과는 Version 기준.

---

# 16. Effective Role Assignment Set

저장: Subject · Active Roles · Inherited Roles · Composite Roles · Temporary Roles · Emergency Roles · Delegated Roles · Suspended Roles · Expired Roles.

---

# 17. Effective Permission Assignment

Direct Permission · Composite Permission · Inherited Permission · Explicit Deny · Scope Projection · Constraint Projection · Risk Projection.

---

# 18. Assignment Conflict

Duplicate Assignment · Conflicting Assignment · SoD Conflict · Actor Conflict · Scope Conflict · Expired Assignment · Revoked Assignment · Multiple Active Assignment · Version Conflict.

---

# 19. Assignment Eligibility

Actor Type · Tenant · Organization · Position · Employment Status · Authentication Assurance · Required Membership · Required Certification.

---

# 20. Assignment Risk

Role Risk · Scope · Permission · Critical Permission · Temporary 여부 · Emergency 여부 · Delegation 여부 · Actor Type.

---

# 21. Assignment Expiration

Fixed Date · Relative Duration · Scheduled Expiration · Immediate Expiration. 만료 시 Assignment 종료 · Cache 제거 · Effective Permission 재계산.

---

# 22. Assignment Renewal

Manual · Auto · Approval Required · Review Required. Renewal도 Version 생성.

---

# 23. Assignment Revocation

Immediate · Scheduled · Emergency · Incident Based. Revocation 후 Effective Permission 제거 · Audit 생성.

---

# 24. Assignment Suspension

Temporary · Manual · Policy · Incident.

---

# 25. Assignment Restoration

Restore 시 Version 생성 · Approval 확인 · Snapshot 생성.

---

# 26. Assignment Snapshot

Subject · Role · Scope · Permission Projection · Deny Projection · Assignment Version · Digest.

---

# 27. Assignment Evidence

Approval · Review · Business Reason · Incident · Snapshot · Audit.

---

# 28. Assignment Digest

Subject · Role Version · Scope · Permission Projection · Approval · Validity · Snapshot.

---

# 29. Assignment Drift

Role Version Drift · Scope Drift · Permission Drift · Policy Drift · Approval Drift · Organization Drift · Membership Drift.

---

# 30. Assignment Revalidation

Trigger: Role 변경 · Permission 변경 · Organization 변경 · Membership 변경 · Policy 변경 · Incident · Audit Finding.

---

# 31. Assignment Reconciliation

비교: Current Assignment · Effective Assignment · Snapshot · Audit · Digest.

---

# 32. Assignment Simulation

Add Role · Remove Role · Change Scope · Change Duration · Change Approval · Expiration. 결과: Permission 영향 · Scope 영향 · SoD 영향 · Risk 영향.

---

# 33. Assignment Cache

Effective Assignment · Effective Permission · Effective Scope · Effective Role. Version 기반.

---

# 34. Cache Invalidation

Assignment 생성 · Assignment 변경 · Assignment 종료 · Role 변경 · Permission 변경 · Organization 변경 · Membership 변경.

---

# 35. Runtime Guard

차단: Expired · Suspended · Revoked Assignment · Invalid Scope · Invalid Role Version · Invalid Subject · SoD Conflict · Risk Policy 위반.

---

# 36. Static Lint

탐지: Hardcoded Assignment · User.roles[] · Direct SQL Role Injection · Missing Approval · Missing Snapshot · Missing Version · Missing Evidence.

---

# 37. Error Contract

ASSIGNMENT_NOT_FOUND · ASSIGNMENT_EXPIRED · ASSIGNMENT_REVOKED · ASSIGNMENT_SUSPENDED · ASSIGNMENT_SCOPE_INVALID · ASSIGNMENT_APPROVAL_REQUIRED · ASSIGNMENT_CONFLICT · ASSIGNMENT_VERSION_INVALID · ASSIGNMENT_POLICY_BLOCKED · ASSIGNMENT_RUNTIME_BLOCKED.

---

# 38. Warning Contract

Assignment Expiring · Renewal Required · Scope Expanded · Role Updated · Policy Updated · Review Required.

---

# 39. API

Assignment 생성 · 수정 · 종료 · 조회 · Effective Assignment 조회 · Effective Permission 조회 · Assignment Simulation · Assignment Revalidation · Assignment Audit 조회.

---

# 40. 테스트

Unit: Assignment · Scope · Approval · Renewal · Revocation · Suspension · Restoration · Drift · Cache. Security: Unauthorized Assignment · Scope Escalation · Emergency Abuse · Break Glass Abuse · Direct SQL Injection · Version Downgrade. Regression: 기존 Approval · 기존 Permission · 기존 RBAC · 기존 Workflow.

---

# 41. Completion Gate

Assignment Registry · Version · Lifecycle · Direct/Group/Temporary/Emergency/Break Glass/Delegated Assignment · Effective Assignment · Effective Permission · Drift · Revalidation · Simulation · Runtime Guard · Static Lint · Snapshot · Evidence · Digest · Cache · Audit 구축 · Regression 통과.

---

# 42. 다음 구현 순서 (추천)

1. **Part 3-4 — Scoped Role Governance** 2. Part 3-5 Dynamic Role 3. Part 3-6 Service/System Role 4. Part 3-7 Effective Role Resolution Engine 5. Part 3-8 Role Certification & Access Review 6. Part 3-9 JIT Access 7. Part 3-10 SoD Runtime Enforcement 8. Part 3-11 Enterprise RBAC Analytics & Governance Dashboard.

---

## 설계 거버넌스 판정 (이번 회차)

**설계 명세(코드 0)**. §41 완료조건 각 항목을 실 엔진 구현이 아니라 Canonical Interface·확장 포인트·Gap·선행 전제·Adapter Requirement 설계 명세로 충족. ★Part 3-2(전건 순신규)와 달리 **실 assignment substrate 상당 실재 예상**(app_user.team_role 직접할당·SSO/SCIM provisionUser·api_key.role·wms_permissions·pm_task_assignees·sub-admin 발급) → 실재는 PARTIAL/PRESENT, 거버넌스 계층(Registry/Version/Approval/Lifecycle/Snapshot/Drift/Effective Resolution)은 순신규로 정직 판정. 실 엔진 구현=선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 별도 승인세션(RP-002). NOT_CERTIFIED · BLOCKED_PREREQUISITE.
