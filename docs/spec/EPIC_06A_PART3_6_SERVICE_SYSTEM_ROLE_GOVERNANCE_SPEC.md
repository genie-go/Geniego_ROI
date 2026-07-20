# GeniegoROI Enterprise Engineering Handbook

## EPIC 06-A-03-02-03-04 — Part 3-6

# Service / System Role Governance

Version 1.0

> **영속 메모**: 사용자 제공 스펙 원문(verbatim)을 289차 후속 회차에 그대로 저장. 설계 거버넌스 파이프라인 ⓐ 단계 산출물. **코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**. 실 엔진 구현은 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실구현 후 별도 승인세션(RP-002). 내용 임의 수정 금지.

---

# 0. 작업 목적

이번 단계에서는 **사람(Human User)** 중심 RBAC를 확장하여 **비인간 주체(Non-Human Identity)** 를 위한 Enterprise급 **Service / System Role Governance**를 구축한다.

다음 주체도 사람과 동일한 수준의 보안 통제를 받아야 한다: Service Account · System Account · Machine Identity · API Client · Integration User · Background Worker · Scheduler · Batch Process · Event Consumer · Event Publisher · Message Queue Consumer · Message Queue Producer · ETL Process · AI Agent · Automation Bot · Robot Account · CI/CD Pipeline · GitHub Action · Kubernetes Service Account · Container Runtime · Serverless Function.

목표: **"서비스 계정도 사람보다 더 엄격하게 관리한다."**

---

# 1. 구현 목표

1. Service Identity Registry 2. System Identity Registry 3. Machine Identity Registry 4. API Client Identity 5. Integration Identity 6. Robot Identity 7. AI Agent Identity 8. Service Role 9. System Role 10. Machine Role 11. Runtime Identity 12. Identity Credential Governance 13. Secret Rotation 14. Certificate Governance 15. OAuth Client Governance 16. JWT Client Governance 17. Service Assignment 18. Runtime Scope 19. Runtime Policy 20. Runtime Trust Level 21. Runtime Authentication Level 22. Runtime Authorization 23. Effective Service Permission 24. Service Snapshot 25. Service Evidence 26. Service Digest 27. Drift 28. Simulation 29. Revalidation 30. Reconciliation 31. Runtime Guard 32. Static Lint 33. APIs 34. Completion Gate

---

# 2. Canonical Entity

`APPROVAL_SERVICE_IDENTITY` · `APPROVAL_SYSTEM_IDENTITY` · `APPROVAL_MACHINE_IDENTITY` · `APPROVAL_API_CLIENT` · `APPROVAL_INTEGRATION_IDENTITY` · `APPROVAL_AI_AGENT` · `APPROVAL_SERVICE_ROLE` · `APPROVAL_SERVICE_ROLE_ASSIGNMENT` · `APPROVAL_RUNTIME_SERVICE_CONTEXT` · `APPROVAL_SERVICE_PERMISSION` · `APPROVAL_SERVICE_SCOPE` · `APPROVAL_SERVICE_POLICY` · `APPROVAL_SERVICE_TRUST` · `APPROVAL_SERVICE_AUTHENTICATION` · `APPROVAL_SERVICE_CREDENTIAL` · `APPROVAL_SERVICE_SECRET` · `APPROVAL_SERVICE_CERTIFICATE` · `APPROVAL_SERVICE_SNAPSHOT` · `APPROVAL_SERVICE_EVIDENCE` · `APPROVAL_SERVICE_DIGEST` · `APPROVAL_SERVICE_DRIFT` · `APPROVAL_SERVICE_SIMULATION` · `APPROVAL_SERVICE_REVALIDATION` · `APPROVAL_SERVICE_RECONCILIATION`

---

# 3. Identity Type

Service Account · API Client · Integration User · Batch User · Scheduler · Worker · Queue Consumer · Queue Producer · ETL · AI Agent · Bot · Kubernetes SA · Serverless Function · Pipeline Identity.

# 4. Credential Type

Password · Secret · API Key · OAuth Client Secret · JWT Key · Private Key · Public Key · Certificate · mTLS · Hardware Key · Vault Reference.

# 5. Authentication

OAuth2 Client · JWT Client · mTLS · API Key · Certificate · Vault Authentication · Service Mesh Identity.

# 6. Trust Level

Unknown · Low · Medium · High · Critical.

# 7. Service Role

API Role · Integration Role · Scheduler Role · Worker Role · AI Role · ETL Role · Batch Role · Kubernetes Role.

# 8. Service Assignment

Direct · Dynamic · Runtime · Temporary · Emergency.

# 9. Runtime Context

Environment · Namespace · Cluster · Node · Container · Pod · Pipeline · Application.

# 10. Runtime Scope

Namespace · Cluster · Service · Queue · Topic · Bucket · Database · Schema · Table · API.

# 11. Runtime Policy

Allow · Deny · ReadOnly · Require mTLS · Require Certificate · Require Vault · Require Rotation.

# 12. Secret Governance

Secret Rotation · Expiration · Version · Revocation · Audit.

# 13. Certificate Governance

Expiration · Renewal · Rotation · Revocation · Trust Chain.

# 14. OAuth Governance

Client ID · Secret · Scope · Audience · Expiration · Rotation.

# 15. JWT Governance

Issuer · Audience · Subject · Signature · Key Rotation · Expiration.

# 16. Service Permission Projection

Static Permission · Runtime Permission · Dynamic Permission · Service Scope.

# 17. Effective Service Permission

Permission · Scope · Constraint · Runtime Policy.

# 18. Runtime Trust

요소: Credential · Authentication · Device · Environment · Network · Certificate · Rotation Status.

# 19. Runtime Authentication

Valid · Expired · Revoked · Unknown.

# 20. AI Agent Governance

AI Agent Identity · Agent Role · Agent Scope · Agent Session · Agent Permission · Agent Runtime Audit.

# 21. Integration Governance

ERP · CRM · Payment · Settlement · Logistics · External API.

# 22. Runtime Authorization

Role · Scope · Runtime · Policy.

# 23. Snapshot

Runtime Identity · Permission · Scope · Credential Version.

# 24. Evidence

Authentication · Certificate · Secret · Runtime · Audit.

# 25. Digest

입력: Identity · Role · Scope · Runtime · Credential.

# 26. Drift

Secret Drift · Certificate Drift · Role Drift · Scope Drift · Runtime Drift.

# 27. Revalidation

Trigger: Secret Rotation · Certificate Renewal · Runtime 변경 · Role 변경.

# 28. Reconciliation

Runtime · Snapshot · Assignment · Credential 비교.

# 29. Simulation

Secret Rotation · Certificate 교체 · Role 변경 · Runtime 변경.

# 30. Runtime Guard

차단: Expired Secret · Expired Certificate · Unknown Identity · Revoked Client · Invalid Runtime · Invalid Role.

# 31. Static Lint

Hardcoded Secret · Hardcoded API Key · Static Credential · Missing Rotation · Missing Audit.

# 32. Error Contract

SERVICE_NOT_FOUND · SECRET_EXPIRED · CERTIFICATE_INVALID · CLIENT_REVOKED · TRUST_FAILED · SERVICE_RUNTIME_BLOCKED.

# 33. Warning Contract

Secret Rotation Due · Certificate Expiring · Trust Reduced · Runtime Drift.

# 34. API

Service 조회 · Runtime 조회 · Secret Rotation · Certificate 조회 · Effective Permission 조회.

# 35. Database Constraint

Unique Identity · Immutable Version · Secret Version · Certificate Version.

# 36. Index

Identity · Runtime · Secret · Certificate · Role.

# 37. 테스트

Unit(Service/Runtime/Secret/Certificate) · Integration(OAuth/JWT/Vault/Kubernetes) · Security(Secret Leak/API Key Abuse/Certificate Abuse/Runtime Injection) · Regression(Assignment/Dynamic Role/Workflow).

# 38. Completion Gate

Service Registry · Machine Registry · Runtime Governance · Secret Governance · Certificate Governance · Effective Permission · Snapshot · Evidence · Cache · Runtime Guard 구축 · Regression 완료.

# 39. 다음 추천 구현 순서

1. **Part 3-7 Effective Role Resolution Engine** 2. Part 3-8 Role Certification & Access Review 3. Part 3-9 JIT Access 4. Part 3-10 Runtime SoD Enforcement 5. Part 3-11 Enterprise RBAC Analytics 6. Part 3-12 PDP & PEP Governance 7. Part 3-13 Zero Trust Identity & Continuous Authorization.

---

## 설계 거버넌스 판정 (이번 회차)

**설계 명세(코드 0)**. §38 완료조건을 Canonical Interface·확장 포인트·Gap·선행 전제·Adapter Requirement 설계 명세로 충족. ★실 비인간 identity substrate 상당 실재 예상(api_key=API Client identity+role+scope+expires_at+rotate·ChannelCreds 자격증명·Google 서비스계정 JWT·SAML cert·Crypto AES-256-GCM·세션토큰 해시·webhook 토큰) → PARTIAL/PRESENT, 거버넌스 계층(Service Identity Registry·Runtime Trust Level·Certificate Governance·Secret Rotation Policy·Machine Role·Runtime Authorization·Snapshot/Drift/Simulation)은 순신규. 실 엔진=선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic·Decision Core 실구현 후 RP-002. NOT_CERTIFIED · BLOCKED_PREREQUISITE.
