# ADR — MEA Part 047 Enterprise Identity, Access Management (IAM) & Zero Trust Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part047 EXISTING/DUPLICATE) 등장 file:line만(반날조). ★과대주장 금지·부재증명 완료·EPIC 06-A 재감사 금지.

## 맥락
MEA Part 047은 IAM & Zero Trust. ★**신원/인증/MFA/SSO/RBAC/ABAC/세션/admin은 강하게 실재**: `UserAuth`(login/MFA OTP·289차 fail-closed·273차 SMS OTP·GT①)·`OAuth`/`EnterpriseAuth`(OAuth2/OIDC/JWT/SAML/SSO·GT①)·`TeamPermissions`(231차 RBAC/ABAC·acl_permission·data_scope 9차원·delegation 서버 강제·GT①)·`index.php`(RBAC roles/scopes·289차 전역 writeGuard·admin resolveAdminByToken hash-only·GT①)·api_key(SHA-256)·EPIC 06-A(289차 이 세션 Permission Governance 설계). 부재=형식 Zero Trust Policy Engine/PAM Vault/Device Trust. 본 Part는 API(Part 042)/Data(010~012)/EPIC 06-A 상속(재정의 금지).

## 결정
- **D-1 (Part 042/010~012/EPIC 06-A 재정의 금지·재감사 금지):** API Gateway(Part 042·`index.php`)·Security(Part 010~012)·EPIC 06-A(RBAC/ABAC/Permission Governance·289차 판정)를 준수·인용. ★EPIC 06-A 289차 판정 승계(Approval/Decision Authority 부재·data_scope 4/9 실강제·재감사 금지). 중복 정의 금지.
- **D-2 (Authentication = UserAuth/OAuth 승격·★중복 인증 절대 금지):** Authentication = `UserAuth`(password/MFA OTP·genOtp6·289차 fail-closed/90s throttle·273차 SMS OTP·brute-force 스로틀)·Federated=`OAuth`/`EnterpriseAuth`(OAuth2/OIDC/JWT/SAML/SSO). ★MFA 정본(289차 OTP mt_rand 폴백 fail-closed·재구현 금지)·외부 벤더 JWT 오흡수 회피(289차 Part3-6). ★중복 인증 신설 절대 금지(값 분산=회귀). 형식 Authentication Platform=`UserAuth`/`OAuth` 승격.
- **D-3 (Authorization = index.php/TeamPermissions 승격·★중복 RBAC/ABAC 절대 금지):** RBAC=`index.php`(roles viewer<connector<analyst<admin·scopes)·ABAC=`TeamPermissions`(acl_permission 메뉴×8동작·data_scope 9차원)·PEP=`index.php`(writeGuard 289차 전역·직접 API 우회 차단)·Delegation=`TeamPermissions`(assignable 교집합 403). ★289차 다수 하드닝(writeGuard 서버 전역·featurePlan fail-secure·admin_roles 폐기·admin SSOT)=정본·재구현 금지. 형식 PDP/PBAC·EPIC 06-A Permission Engine=순신설(설계 승계·중복 RBAC 금지).
- **D-4 (Zero Trust/PAM = 부재·순신설):** ★형식 Zero Trust Policy Engine(Continuous Verification/Trust Score/Conditional Access/Device Trust/User Risk)·PAM(Vault/JIT/Session Recording/Emergency Access)·Adaptive/Risk-Based Auth·Biometric·Device Identity=**부재·순신설**(부재증명 완료). Continuous Verification seed=매 요청 tenant 재해석([[reference_platform_growth_actas_tenant_hijack]])·Privileged 분리=admin SSOT(289차·PAM Vault 아님)·Trust First(데이터·V3·Zero Trust identity score 아님·오흡수 금지).
- **D-5 (Security/AI = 헌법·평문 금지):** Credential=api_key(SHA-256)/`ChannelCreds`(AES-256-GCM)/세션 토큰 hash-only(289차·★평문 저장 금지)·Tenant=`Db.php`·Audit=`SecurityAudit`. AI(이상 로그인/인증 실패)=`AnomalyDetection`/login_attempt 스로틀·Explainability=헌법 V4·★AI 사용자 계정 자동 삭제/접근 권한 자동 변경 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. API/Data Platform/EPIC 06-A/헌법 상속·재정의 금지·재감사 금지·Authentication(`UserAuth`/`OAuth`)·Authorization(`index.php` RBAC+`TeamPermissions` ABAC+writeGuard)·Session(hash-only)·Privileged(admin SSOT)·api_key(SHA-256)·Credential 암호화(`ChannelCreds`)·`SecurityAudit` 재사용(★중복 인증/권한/RBAC/ABAC/세션/admin 절대 금지·정본 재구현 금지·평문 저장 금지)·형식 Zero Trust Policy Engine/PAM Vault/Device Trust/Adaptive Auth/Identity Governance Manager만 신설(부재·EPIC 06-A 설계 승계·과대주장 금지). 실행은 Zero Trust/PAM 도입 결정 종속.
