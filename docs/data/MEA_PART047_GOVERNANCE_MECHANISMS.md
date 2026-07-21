# MEA Part 047 — Governance Mechanisms (§7~§19 통합)

> **거버넌스 상태**: 거버넌스 메커니즘 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★인증(`UserAuth`/`OAuth`)·RBAC(`index.php`)·ABAC(`TeamPermissions`)·세션(hash-only)·admin(SSOT)·SecurityAudit 재사용(★중복 인증/권한/RBAC/ABAC/세션/admin 절대 금지·정본 재구현 금지·EPIC 06-A 재감사 금지·평문 금지)·Zero Trust Policy Engine/PAM Vault/Device Trust 순신설·과대주장 금지·Part 042/EPIC 06-A 상속.

## §7 Lifecycle 거버넌스
Registration→Verification→Credential Provisioning→Authentication→Authorization→Session Management→Access Review→Privilege Update→Deactivation→Archive·추적. 현행=Registration/Verification=`UserAuth`(SMS OTP 273차)·Credential=api_key/password·Session=`UserAuth`(hash-only 289차)·Privilege Update=`TeamPermissions`. ★Access Review(형식)=순신설.

## §8 Authentication 거버넌스
Password/Passwordless/MFA/Biometric/Certificate/OAuth2/OIDC/Adaptive·위험 기반. 현행=Password=`UserAuth`(login/forgotPassword)·MFA=`UserAuth`(OTP·genOtp6·289차 fail-closed·90s throttle)·SMS OTP=`UserAuth`(273차)·OAuth2/OIDC=`OAuth`/`EnterpriseAuth`·brute-force 스로틀(login_attempt 8/15min). ★Biometric/Certificate/Adaptive·Risk-Based=순신설.

## §9 Authorization 거버넌스
RBAC/ABAC/PBAC/PDP/PEP/Dynamic/Context-Aware/Fine-Grained·최소 권한. 현행=RBAC=`index.php`(roles viewer<connector<analyst<admin·scopes)+`TeamPermissions`(team_role)·ABAC=`TeamPermissions`(acl_permission 메뉴×8동작·data_scope 9차원)·PEP=`index.php`(writeGuard 289차 전역)·Fine-Grained=`TeamPermissions`(delegation 서버 강제·assignable 교집합 403). ★형식 PDP/PBAC·EPIC 06-A Permission Engine(설계)=순신설(중복 RBAC 금지).

## §10 Zero Trust 거버넌스
Continuous Verification/Device Trust/User Risk/Conditional Access/Session Risk/Federation/Secure Remote/Trust Score·지속 신뢰 평가. 현행=Continuous Verification seed=매 요청 tenant 재해석([[reference_platform_growth_actas_tenant_hijack]])·Federation=`OAuth`/`EnterpriseAuth`·Trust First(데이터·V3·★Zero Trust identity Trust Score 아님·오흡수 금지). ★형식 Device Trust/User Risk/Conditional Access/Trust Score Engine=순신설.

## §11 PAM 거버넌스
Privileged Vault/JIT/Session Recording/Credential Rotation/Emergency Access/Approval/Monitoring/Revocation·특권 분리. 현행=Privileged 분리=admin(289차 SSOT·resolveAdminByToken·hash-only·★PAM Vault 아님)·Credential 폐기=api_key(/v421/keys)·Approval=배포 승인/EPIC 06-A. ★형식 PAM Vault/JIT/Session Recording/Emergency Access=순신설.

## §12 Governance 거버넌스
Identity/Authentication/Authorization/Password/MFA/Access Review Policy/Compliance/Audit. 현행=Auth Policy=`index.php`/`UserAuth`·MFA Policy=`UserAuth`(289차)·Authorization=`TeamPermissions`·Compliance=`Compliance`·Audit=`SecurityAudit`. ★Access Review/Identity Governance Manager=순신설(EPIC 06-A 설계).

## §13 Security 거버넌스 (★평문 저장 금지)
Tenant=`Db.php`([[reference_platform_growth_actas_tenant_hijack]])·RBAC=`index.php`·★Identity Encryption/Token Protection=api_key(SHA-256)/`ChannelCreds`(AES-256-GCM)/세션 토큰 hash-only(289차·★평문 저장 금지)·Secure Credential Storage=평문노출 회피([[feedback_credentials_handling]])·Audit=`SecurityAudit::verify`(★유일 tamper-evident·[[reference_menu_audit_log_not_tamper_evident]]).

## §14 Runtime 거버넌스
Identity Validation·Authentication·Authorization·Policy Evaluation·Session·Access Logging·Audit. ★`index.php`(Identity api_key/Bearer→Authentication→Authorization RBAC→Policy writeGuard→Session→Access Log)·`UserAuth`(login/MFA)·`TeamPermissions`(ABAC)·Audit=`SecurityAudit`.

## §15 API 거버넌스 (8)
Register Identity/Authenticate/Authorize/Validate Token/Revoke Session/Query Access Policy/Identity Status/Query Audit. 현행=Authenticate=`UserAuth`(/auth/*·public bypass)·api_key 관리=`Keys`(/v421/keys)·Authorize=`TeamPermissions`·Token=`index.php`. Part 001 API 표준([[reference_api_prefix_routing]]) 상속.

## §16 Event 거버넌스 (8)
IdentityRegistered/UserAuthenticated/AccessGranted/AccessDenied/SessionCreated/SessionRevoked/PolicyUpdated/IdentityAudited. 현행=UserAuthenticated=`UserAuth`(login)·AccessDenied=`index.php`(403 RBAC/writeGuard)·PolicyUpdated=`TeamPermissions` seed(동기·event-driven 부재). Data Platform §15 정합.

## §17 AI 거버넌스
계정 탈취/이상 로그인/권한 과다 부여/접근 패턴/내부자 위협/인증 실패 원인/Zero Trust 위험도/Explainable. 현행=이상 로그인=`AnomalyDetection`·인증 실패=login_attempt 스로틀·Explainability=헌법 V4. ★AI는 사용자 계정 자동 삭제/접근 권한 자동 변경 불가=헌법 V3+V5(안전 자동화)+`CHANGE_GATE`. 권한 과다/내부자 위협/Trust Score AI=순신설. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## §18~§19 성능·완료
성능=`index.php`/`UserAuth` seed(벤치 대상 미존재). 완료=형식 Zero Trust Policy Engine/PAM Vault/Device Trust/Adaptive Auth 구현 시(인증/MFA/SSO/RBAC/ABAC/세션/admin 실재·코드 0). ★단 인증·권한·RBAC·ABAC·세션·admin은 강함.

## 판정
전 메커니즘 **설계-only·코드 0·NOT_CERTIFIED.** ★인증(`UserAuth`/`OAuth`)·RBAC(`index.php`)·ABAC(`TeamPermissions`)·PEP(writeGuard 289차)·세션(hash-only)·admin(SSOT)·api_key(SHA-256)·Credential 암호화(`ChannelCreds`)·Audit(`SecurityAudit`) 재사용·승격(★중복 인증/권한/RBAC/ABAC/세션/admin 절대 금지=값 분산=회귀·정본 재구현 금지·EPIC 06-A 재감사 금지·평문 저장 금지)·형식 Zero Trust Policy Engine/PAM Vault/JIT/Device Trust/Adaptive·Biometric Auth/Identity Governance Manager만 신설(부재·EPIC 06-A 설계 승계·과대주장 금지·Trust First≠Zero Trust identity 오흡수 금지). API/Data Platform/EPIC 06-A/헌법 상속·재정의 금지·★AI 사용자 계정 자동 삭제/접근 권한 자동 변경 불가(V3+V5+CHANGE_GATE).
