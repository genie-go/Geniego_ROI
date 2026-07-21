# MEA Part 047 — Enterprise Identity, Access Management (IAM) & Zero Trust Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **API Management(Part 042)+Data Platform(010~012 Security)+EPIC 06-A(RBAC/ABAC/Permission Governance·289차)**를 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). ★**신원/인증/MFA/SSO/RBAC/ABAC/세션/admin은 강하게 실재**(GT①·`UserAuth`·`OAuth`/`EnterpriseAuth`·`TeamPermissions`·`index.php`·api_key)·본 Part는 형식 Zero Trust Policy Engine/PAM(vault·JIT)/Device Trust 계층만 추가(인증/권한 재구현 없이). ★EPIC 06-A(289차) 판정 승계(재감사 금지). file:line 인용은 GT①②/ADR 등장분만(반날조). ★과대주장 금지.

## §1 작업 목적
전 사용자/시스템/앱/API/서비스/장치/AI Agent의 신원/인증/권한/접근제어/Zero Trust 표준화. Security Platform 핵심 기반·API/Developer/K8s/Service Mesh/Data/Commerce/Logistics/AI Platform 연계 Enterprise IAM Framework.

## §2 구현 범위
Identity Management · Authentication · Authorization · SSO · MFA · Zero Trust · PAM · Identity Governance · Access Audit · AI Identity Intelligence.

## §3 구현 목표 (10)
Enterprise Identity Provider · Authentication Platform · Authorization Engine · SSO Platform · PAM Platform · Identity Governance Service · IAM Dashboard · Identity Audit Service · Zero Trust Policy Engine · AI Identity Advisor.

## §4 아키텍처 원칙 (10)
Identity First · Zero Trust by Default · Least Privilege · Never Trust Always Verify · Policy Driven · Event Driven · Metadata Driven · AI Assisted · Enterprise Standard · Audit by Default.

## §5 Canonical Entity (15)
USER · IDENTITY · ROLE · PERMISSION · POLICY · SESSION · TOKEN · DEVICE · APPLICATION · GROUP · ACCESS_REQUEST · ACCESS_LOG · MFA_METHOD · IDENTITY_AUDIT · TRUST_LEVEL. → 상세 = `MEA_PART047_CANONICAL_ENTITIES.md`.

## §6 IAM Domain (10)
Workforce/Customer/Partner/Machine/API/Device/Federated/Privileged Identity/Identity Governance/Enterprise IAM. Enterprise Identity Registry 기준. → ★현행=Workforce=`UserAuth`(app_user·team_role)·Customer=`CRM`/`GdprConsent`·Partner=`PartnerPortal`·API=api_key·Federated=`OAuth`/`EnterpriseAuth`(SSO/SAML)·Privileged=admin(289차 SSOT). ★Device Identity/형식 Identity Registry=부재/부분.

## §7 Identity Lifecycle (10)
Registration→Verification→Credential Provisioning→Authentication→Authorization→Session Management→Access Review→Privilege Update→Deactivation→Archive. 추적. → ★현행=Registration/Verification=`UserAuth`(SMS OTP 273차)·Credential=api_key/password·Session=`UserAuth`(idle·hash-only 289차)·Privilege Update=`TeamPermissions`. ★Access Review(형식)=부분.

## §8 Authentication Management (8)
Password/Passwordless/MFA/Biometric/Certificate/OAuth2/OIDC/Adaptive Authentication. 위험 기반. → ★★현행=Password=`UserAuth`(login·forgotPassword)·MFA=`UserAuth`(OTP·genOtp6·289차 fail-closed·90s throttle)·SMS OTP=`UserAuth`(phoneVerifyCode 273차)·OAuth2/OIDC=`OAuth`/`EnterpriseAuth`·brute-force 스로틀(login_attempt 8/15min). ★Biometric/Certificate/Adaptive·Risk-Based Auth=부재.

## §9 Authorization Management (8)
RBAC/ABAC/PBAC/Policy Decision Point/Policy Enforcement Point/Dynamic Authorization/Context-Aware/Fine-Grained. 최소 권한. → ★★현행=RBAC=`index.php`(roles viewer<connector<analyst<admin·scopes write:*/admin:keys)+`TeamPermissions`(team_role owner>manager>member)·ABAC=`TeamPermissions`(acl_permission 메뉴×8동작·data_scope 9차원·GT①)·PEP=`index.php`(writeGuard 289차 전역)·Fine-Grained=`TeamPermissions`(delegation 서버 강제·assignable 교집합 403). ★형식 PDP/PBAC/EPIC 06-A Permission Engine(설계·289차)=부분.

## §10 Zero Trust Security (8)
Continuous Verification/Device Trust/User Risk Assessment/Conditional Access/Session Risk/Identity Federation/Secure Remote Access/Trust Score. 지속 신뢰 평가. → ★현행=Continuous Verification seed=매 요청 tenant 재해석([[reference_platform_growth_actas_tenant_hijack]])·Identity Federation=`OAuth`/`EnterpriseAuth`·Trust First(데이터·V3). ★형식 Device Trust/User Risk/Conditional Access/Session Risk/Trust Score Engine=부재(Zero Trust Policy Engine 순신설).

## §11 Privileged Access Management (8)
Privileged Vault/Just-In-Time Access/Session Recording/Credential Rotation/Emergency Access/Approval Workflow/Privileged Monitoring/Revocation. 특권 분리. → ★현행=Privileged 분리=admin(289차 SSOT·resolveAdminByToken·requireAdmin·hash-only 세션)·Credential=api_key(폐기 /v421/keys)·Approval=배포 승인/EPIC 06-A. ★형식 PAM Vault/JIT/Session Recording/Emergency Access=부재.

## §12 Identity Governance (8)
Identity/Authentication/Authorization/Password/MFA/Access Review Policy/Compliance/Audit. → ★현행=Auth Policy=`index.php`/`UserAuth`·MFA Policy=`UserAuth`(289차)·Authorization=`TeamPermissions`·Compliance=`Compliance`·Audit=`SecurityAudit`. ★형식 Access Review/Identity Governance Manager=부분(EPIC 06-A 설계).

## §13 Data Security
Tenant Isolation · RBAC · Identity Encryption · Token Protection · Secure Credential Storage · Audit. 인증 정보 암호화·평문 저장 금지. → ★현행=Tenant=`Db.php`·RBAC=`index.php`·★Credential=api_key(SHA-256)/`ChannelCreds`(AES-256-GCM)/세션 토큰 hash-only(289차·평문 저장 금지)·Audit=`SecurityAudit`·평문노출 회피([[feedback_credentials_handling]]).

## §14 Runtime 규칙
Identity Validation · Authentication · Authorization · Policy Evaluation · Session 생성 · Access Logging · Audit. → ★★현행=`index.php`(Identity=api_key/Bearer→Authentication→Authorization RBAC→Policy writeGuard→Session→Access Log)·`UserAuth`(login/MFA)·`TeamPermissions`(ABAC)·Audit=`SecurityAudit`.

## §15 API 표준 (8)
Register Identity/Authenticate User/Authorize Access/Validate Token/Revoke Session/Query Access Policy/Identity Status/Query Audit. → ★현행=Authenticate=`UserAuth`(/auth/*)·api_key 관리=`Keys`(/v421/keys)·Authorize=`TeamPermissions`(권한 매트릭스)·Token 검증=`index.php`. Part 001 API 표준(`/auth/*` public bypass) 상속.

## §16 Event 표준 (8)
IdentityRegistered/UserAuthenticated/AccessGranted/AccessDenied/SessionCreated/SessionRevoked/PolicyUpdated/IdentityAudited. → ★현행=UserAuthenticated=`UserAuth`(login)·AccessDenied=`index.php`(403 RBAC/writeGuard)·PolicyUpdated=`TeamPermissions` seed(동기·event-driven 부재). Data Platform §15 정합.

## §17 AI Integration
계정 탈취 위험 · 이상 로그인 탐지 · 권한 과다 부여 · 접근 패턴 · 내부자 위협 · 인증 실패 원인 · Zero Trust 위험도 · Explainable Identity. **AI는 사용자 계정 자동 삭제/접근 권한 자동 변경 불가.** → ★현행=이상 로그인=`AnomalyDetection`·인증 실패=login_attempt 스로틀·Explainability=헌법 V4·계정 자동 삭제/권한 자동 변경 불가=헌법 V3+V5+`CHANGE_GATE`. ★권한 과다 부여/내부자 위협/Trust Score AI=순신설. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §18 성능 요구사항
인증 ≤300ms · 권한 검증 ≤100ms · Token 검증 ≤50ms · Session ≤200ms · Dashboard ≤2초 · Availability ≥99.99%. (현행 `index.php`/`UserAuth` seed.)

## §19 Completion Criteria
Enterprise Identity Provider·Authentication·Authorization Engine·Zero Trust Engine·PAM·Identity Governance·Security·Runtime·API/Event·AI 구현. → **부분 충족·강함**(인증/MFA/SSO/RBAC/ABAC/세션/admin 실재·형식 Zero Trust Policy Engine/PAM vault/Device Trust=미완). 코드 0.

## 판정
**PARTIAL-strong / ABSENT-formal(Zero Trust Policy Engine·PAM Vault/JIT·Device Trust·Biometric).** ★실재 강함=Authentication(`UserAuth`·password/MFA OTP·genOtp6·289차 fail-closed·90s throttle·273차 SMS OTP·brute-force 스로틀)·Federated/SSO(`OAuth`/`EnterpriseAuth`·OAuth2/OIDC/JWT/SAML)·Authorization(`index.php` RBAC roles/scopes+`TeamPermissions` ABAC acl_permission/data_scope 9차원+writeGuard 289차 전역 PEP)·Session(hash-only 289차·idle)·Privileged(admin SSOT·resolveAdminByToken 289차)·api_key(SHA-256)·Credential 암호화(`ChannelCreds` AES-256-GCM·평문 저장 금지)·Audit(`SecurityAudit`)·Delegation 서버 강제(`TeamPermissions`·assignable 교집합 403)·EPIC 06-A(289차 Permission Governance 설계). ★**부재(부재증명 완료)=형식 Zero Trust Policy Engine(Continuous Verification/Trust Score/Conditional Access/Device Trust/User Risk)·PAM(Vault/JIT/Session Recording/Emergency Access)·Adaptive·Risk-Based Auth·Biometric·Certificate Auth·Device Identity·형식 Access Review/Identity Governance Manager.** ★핵심=**인증·MFA·SSO·RBAC·ABAC·세션·admin·delegation은 강하게 실재(index.php/UserAuth/TeamPermissions/OAuth·289차 다수 하드닝·EPIC 06-A 설계)이나 형식 Zero Trust Policy Engine·PAM Vault·Device Trust는 부재**(EPIC 06-A 289차 판정 정합·과대주장 금지·[[feedback_competitive_gap_verify]]). API/Data Platform/EPIC 06-A 상속(재정의 금지·EPIC 06-A 재감사 금지)·★중복 인증/권한/RBAC/ABAC/세션/admin 절대 금지(`UserAuth`/`index.php`/`TeamPermissions`/api_key 정본 재구현 금지·핸들러 미배선≠실백엔드)·평문 저장 금지·마케팅 AI KEEP_SEPARATE·★AI 사용자 계정 자동 삭제/접근 권한 자동 변경 불가(V3+V5). 코드 변경 0.

## 다음
MEA Part 048 — Enterprise Security Operations Center (SOC), SIEM & SOAR Architecture(본 IAM 상속·★SecurityAudit/AnomalyDetection seed 실재·SIEM/SOAR 부재).
