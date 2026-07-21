# MEA Part 047 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = IAM 신설이 기존 인증(`UserAuth`)·권한(`index.php`/`TeamPermissions`)·admin·api_key와 중복 재정의하지 않도록 경계 확정. ★인증/권한 강하게 실재로 중복 위험 최상. ★EPIC 06-A 재감사 금지.

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| Authentication/api_key | ★MEA Part 042/001·`UserAuth`/api_key | ★재정의 금지·재사용 |
| OAuth2/OIDC/JWT/SAML | ★MEA Part 042·`OAuth`/`EnterpriseAuth` | ★재정의 금지·재사용 |
| RBAC/ABAC/Permission | ★EPIC 06-A(289차)·`index.php`/`TeamPermissions` | ★재정의 금지·재사용·재감사 금지 |
| admin/Privileged | ★admin SSOT(289차)·resolveAdminByToken | ★재정의 금지·재사용 |
| Credential/Secret | ★자격증명 규범·`ChannelCreds`/api_key | ★재정의 금지·재사용 |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★중복 인증/권한/RBAC/ABAC/세션/admin 절대 금지)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| Authentication/MFA | login/OTP | `UserAuth.php`(289차 fail-closed) | ★재사용(★중복 인증 신설 절대 금지) |
| SSO/Federated | OAuth2/OIDC/SAML | `OAuth`/`EnterpriseAuth` | ★재사용(중복 SSO 금지) |
| RBAC | roles/scopes | `index.php` | ★재사용(★중복 RBAC 절대 금지) |
| ABAC | acl_permission/data_scope | `TeamPermissions.php` | ★재사용(★중복 ABAC 절대 금지·231차) |
| admin/Privileged | admin SSOT | admin(289차) | ★재사용(중복 admin 금지) |
| Trust First(데이터) | V3 신뢰검증 | 헌법 V3 | ★오흡수 금지(데이터 Trust≠Zero Trust identity Trust Score) |
| AI | 마케팅 AI | `ClaudeAI` | KEEP_SEPARATE |

## ★교훈 반영
- [[feedback_no_regression_value_unification]]: 인증/권한/RBAC/ABAC/세션/admin 단일 정의·무후퇴=★중복 절대 금지(값 분산=회귀).
- ★★EPIC 06-A(289차 이 세션) 판정 승계·재감사 금지: writeGuard 서버 전역·featurePlan fail-secure·admin_roles 폐기·admin SSOT·data_scope 4/9 실강제·Approval/Decision Authority 부재.
- ★`UserAuth` MFA(289차 OTP mt_rand 폴백 fail-closed·90s throttle)·`TeamPermissions`(231차 RBAC/ABAC·delegation 서버 강제)·admin SSOT(289차)=정본·재구현 금지.
- ★[[feedback_pre_modification_gate]]: 핸들러 미배선≠실백엔드·재구현 금지·확장 우선.
- ★[[feedback_competitive_gap_verify]]: Zero Trust Policy Engine/PAM Vault/Device Trust 부재=부재증명(과대주장 금지).
- ★역방향 오흡수 금지: Trust First(데이터 신뢰검증·V3)≠Zero Trust identity Trust Score·admin SSOT≠PAM Vault·매 요청 tenant 재해석≠Continuous Verification Engine.
- ★평문 저장 금지·세션 토큰 hash-only(289차)·api_key SHA-256·[[feedback_credentials_handling]].
- [[reference_menu_audit_log_not_tamper_evident]]: Identity Audit 정본 = `SecurityAudit::verify`만.

## 확장 대상(중복 신설 금지·기존 승격 / 순신설)
- 인증=`UserAuth`/`OAuth` 승격(중복 금지). RBAC=`index.php`. ABAC=`TeamPermissions`. admin=admin SSOT. Credential=api_key/`ChannelCreds`. ★Zero Trust Policy Engine/PAM Vault/JIT/Device Trust/Adaptive Auth=순신설(부재).

## 판정
**중복 위험 최상(인증/권한/RBAC/ABAC/세션/admin 강하게 실재).** ★핵심=`UserAuth`(인증/MFA)·`OAuth`/`EnterpriseAuth`(SSO)·`index.php`(RBAC)·`TeamPermissions`(ABAC)·admin SSOT·api_key(SHA-256)·`ChannelCreds`(Credential)·`SecurityAudit`는 **재사용/승격**(★중복 인증/권한/RBAC/ABAC/세션/admin 신설 절대 금지=값 분산=무후퇴 위반·정본 재구현 금지). Part 042 API·Part 010~012 Security·EPIC 06-A(289차·재감사 금지)·자격증명 규범·헌법 **재정의 금지**. 본 Part 고유 순신설=★Zero Trust Policy Engine(Continuous Verification/Trust Score/Conditional Access/Device Trust)·PAM(Vault/JIT/Session Recording)·Adaptive/Risk-Based Auth·Biometric·Device Identity(부재·부재증명 완료)뿐. ★Trust First(데이터)≠Zero Trust identity(오흡수 금지)·admin SSOT≠PAM Vault·평문 저장 금지·과대주장 금지·마케팅 AI KEEP_SEPARATE·★AI 사용자 계정 자동 삭제/접근 권한 자동 변경 불가(V3+V5+CHANGE_GATE).
