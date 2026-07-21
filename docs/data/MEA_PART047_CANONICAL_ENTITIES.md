# MEA Part 047 — Canonical Entities Design & Judgment (§5~§18)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★UserAuth/OAuth/index.php/TeamPermissions/api_key 재사용·Zero Trust Policy Engine/PAM Vault/Device Trust 순신설·Part 042/EPIC 06-A 상속·과대주장 금지·재감사 금지.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | USER | app_user | `UserAuth.php` | PARTIAL-strong |
| 2 | IDENTITY | 사용자/고객/API/admin | `UserAuth`/`CRM`/api_key/admin | PARTIAL-strong |
| 3 | ROLE | roles/team_role | `index.php`·`TeamPermissions`(owner>manager>member) | PARTIAL-strong |
| 4 | PERMISSION | scopes/acl_permission | `index.php`(scopes)·`TeamPermissions`(acl_permission) | PARTIAL-strong |
| 5 | POLICY | writeGuard/data_scope | `index.php`·`TeamPermissions`(data_scope 9) | PARTIAL-strong |
| 6 | SESSION | hash-only·idle | `UserAuth`(idle)·289차 hash-only | PARTIAL-strong |
| 7 | TOKEN | api_key SHA-256/JWT | api_key·`OAuth` | PARTIAL-strong |
| 8 | DEVICE | 부재(Device Identity) | — | ABSENT |
| 9 | APPLICATION | api_key 소비자 | api_key | PARTIAL |
| 10 | GROUP | team/SSO group | `TeamPermissions`(team)·`EnterpriseAuth`(SSO group) | PARTIAL |
| 11 | ACCESS_REQUEST | 접근 요청(EPIC 06-A) | EPIC 06-A(289차) | PARTIAL(설계) |
| 12 | ACCESS_LOG | 접근 로그 | `index.php`·`SecurityAudit` | PARTIAL |
| 13 | MFA_METHOD | OTP/SMS | `UserAuth`(OTP·289차·273차 SMS) | PARTIAL-strong |
| 14 | IDENTITY_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| 15 | TRUST_LEVEL | Trust First(데이터·V3)·형식 Trust Score 부재 | 헌법 V3 | ABSENT-formal(오흡수 금지) |

## §6~§18 표준 판정
- **§6 Domain(10)**: Workforce=UserAuth·Customer=CRM/GdprConsent·API=api_key·Federated=OAuth/EnterpriseAuth·Privileged=admin(289차). ★Device Identity/형식 Registry=부분.
- **§7 Lifecycle(10)**: Registration/Verification=UserAuth(SMS OTP 273차)·Session=UserAuth(hash-only 289차)·Privilege=TeamPermissions. ★Access Review(형식)=부분.
- **§8 Authentication(8)**: Password/MFA OTP=UserAuth(289차 fail-closed)·OAuth2/OIDC=OAuth·brute-force 스로틀. ★Biometric/Adaptive/Risk-Based=ABSENT.
- **§9 Authorization(8)**: RBAC=index.php·ABAC=TeamPermissions(acl_permission/data_scope 9)·PEP=writeGuard(289차)·Fine-Grained=delegation 서버 강제. ★PDP/PBAC·EPIC 06-A Engine=부분(설계).
- **§10 Zero Trust(8)**: Continuous Verification seed=매 요청 tenant 재해석·Federation=OAuth. ★Device Trust/Trust Score/Conditional Access/User Risk Engine=ABSENT(Trust First≠Zero Trust identity·오흡수 금지).
- **§11 PAM(8)**: Privileged 분리=admin SSOT(289차)·Credential 폐기=api_key(/v421/keys). ★PAM Vault/JIT/Session Recording=ABSENT.
- **§12 Governance(8)**: Auth Policy=index.php/UserAuth·MFA Policy=UserAuth·Authorization=TeamPermissions·Audit=SecurityAudit. ★Access Review/Governance Manager=부분(EPIC 06-A).
- **§13 Security**: ★Credential=api_key(SHA-256)/ChannelCreds(AES-256-GCM)/세션 hash-only(289차·평문 금지)/Audit.
- **§18 AI**: 이상 로그인=AnomalyDetection·인증 실패=login_attempt 스로틀·Explainability=헌법 V4·계정 자동 삭제/권한 자동 변경 불가=헌법 V3+V5+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§1~7·§13·§14=user/identity/role/permission/policy/session/token/security/audit·§13 MFA) / PARTIAL(§9~12·§15) / ABSENT(§8 DEVICE·§15 TRUST_LEVEL 형식·Zero Trust Policy Engine/PAM Vault/Device Trust).** 코드 0. ★인증(`UserAuth`/`OAuth`)·RBAC(`index.php`)·ABAC(`TeamPermissions`)·세션(hash-only)·admin(SSOT) 재사용(★중복 인증/권한/RBAC/ABAC/세션/admin 절대 금지·정본 재구현 금지·EPIC 06-A 재감사 금지·평문 금지)·Zero Trust Policy Engine/PAM Vault/Device Trust 순신설(부재·과대주장 금지·Trust First≠Zero Trust identity 오흡수 금지)·Part 042/EPIC 06-A 상속·★AI 사용자 계정 자동 삭제/접근 권한 자동 변경 불가(V3+V5+CHANGE_GATE).
