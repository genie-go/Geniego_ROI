# MEA Part 047 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 047 SPEC/ADR. ★부재증명 완료·과대주장 금지·EPIC 06-A 재감사 금지.

## 전수조사 방법
auth/oauth/permission/team/admin/mfa/otp/session·zero-trust/trust-score/device/jit/vault 전수 grep + 판독. ★Zero Trust(trust-score/device-trust/jit/vault) 부재증명.

## 실존 substrate (★인증·MFA·SSO·RBAC·ABAC·세션·admin 강하게 실재)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| Authentication | login/password/MFA | `UserAuth.php`(login:750·forgotPassword:2542·MFA OTP·289차 fail-closed) | PARTIAL-strong |
| SMS OTP | 전화 인증 | `UserAuth.php`(phoneVerifyCode:2809·273차) | PARTIAL-strong |
| Federated/SSO | OAuth2/OIDC/SAML | `OAuth.php`·`EnterpriseAuth.php` | PARTIAL-strong |
| RBAC | roles/scopes | `index.php`(viewer<connector<analyst<admin·write:*/admin:keys) | PARTIAL-strong |
| ABAC | acl_permission·data_scope | `TeamPermissions.php`(231차·acl_permission·DATA_SCOPES 9:41·delegation:25) | PARTIAL-strong |
| PEP(전역) | writeGuard | `index.php`(289차 전역 writeGuard) | PARTIAL-strong |
| Session | hash-only·idle | `UserAuth`(idle:207)·세션 토큰 hash-only(289차) | PARTIAL-strong |
| Privileged(admin) | admin SSOT | admin(289차 resolveAdminByToken·requireAdmin) | PARTIAL-strong |
| API Key | SHA-256 | api_key/`Keys.php` | PARTIAL-strong |
| Credential 암호화 | AES-256-GCM·평문 금지 | `ChannelCreds`·세션 hash-only(289차) | PARTIAL-strong |
| Permission Governance | 설계(EPIC 06-A) | EPIC 06-A(289차·재감사 금지) | PARTIAL(설계) |
| Audit | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |

## 부재(ABSENT-formal — 부재증명 완료)
★**Zero Trust Policy Engine**(Continuous Verification/Trust Score/Conditional Access/Device Trust/User Risk Assessment/Session Risk)·**PAM**(Privileged Vault/Just-In-Time Access/Session Recording/Credential Rotation 자동/Emergency Access)·**Adaptive·Risk-Based Authentication**·**Biometric·Certificate Authentication**·**Device Identity**·형식 **Access Review/Identity Governance Manager**·Event 표준(IdentityRegistered 등).

## 판정
**PARTIAL-strong / ABSENT-formal(Zero Trust Policy Engine·PAM Vault·Device Trust).** ★인증·MFA·SSO·RBAC·ABAC·세션·admin·delegation은 **강하게 실재**: `UserAuth`(login/MFA OTP 289차 fail-closed/273차 SMS)·`OAuth`/`EnterpriseAuth`(OAuth2/OIDC/JWT/SAML/SSO)·`index.php`(RBAC roles/scopes+289차 전역 writeGuard)·`TeamPermissions`(231차 ABAC·acl_permission·data_scope 9차원·delegation 서버 강제)·admin SSOT(289차)·api_key(SHA-256)·Credential 암호화(AES-256-GCM·평문 금지)·EPIC 06-A(289차 Permission Governance 설계)이나, **형식 Zero Trust Policy Engine·PAM Vault/JIT·Device Trust·Adaptive/Biometric Auth는 부재**(부재증명 완료). ★★핵심=**인증·권한·RBAC·ABAC·세션·admin은 강하게 실재(289차 다수 하드닝·EPIC 06-A 설계)이나 형식 Zero Trust Policy Engine·PAM Vault·Device Trust는 부재**(EPIC 06-A 289차 판정 정합·재감사 금지·과대주장 금지). 실행은 Zero Trust/PAM 도입 후 신설 종속.
