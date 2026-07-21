# MEA Part 047 — Enterprise Identity, Access Management (IAM) & Zero Trust Architecture · INDEX

> **거버넌스 상태**: 설계 문서 세트 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★EPIC 06-A(289차) 판정 승계·재감사 금지·과대주장 금지.

## 문서 세트 (7)
| # | 문서 | 경로 | 역할 |
|---|---|---|---|
| 1 | SPEC v1.0 | `docs/spec/MEA_PART047_IAM_ZERO_TRUST_ARCHITECTURE_SPEC.md` | 원문 명세 §1~§19 |
| 2 | ADR | `docs/architecture/ADR_MEA_IAM_ZERO_TRUST_ARCHITECTURE.md` | 결정 D-1~D-5 |
| 3 | GT① EXISTING | `docs/data/MEA_PART047_EXISTING_IMPLEMENTATION.md` | 전수조사 근거지 |
| 4 | GT② DUPLICATE | `docs/data/MEA_PART047_DUPLICATE_AUDIT.md` | 중복 경계 |
| 5 | CANONICAL | `docs/data/MEA_PART047_CANONICAL_ENTITIES.md` | 15 엔티티 §5~§18 |
| 6 | GOVERNANCE | `docs/data/MEA_PART047_GOVERNANCE_MECHANISMS.md` | §7~§19 메커니즘 |
| 7 | INDEX | `docs/data/MEA_PART047_INDEX.md` | 본 문서 |

## 한 줄 판정
**PARTIAL-strong / ABSENT-formal(Zero Trust Policy Engine·PAM Vault/JIT·Device Trust·Biometric).** ★인증·MFA·SSO·RBAC·ABAC·세션·admin·delegation은 **강하게 실재**: `UserAuth`(login/MFA OTP·289차 fail-closed·273차 SMS OTP·brute-force 스로틀)·`OAuth`/`EnterpriseAuth`(OAuth2/OIDC/JWT/SAML/SSO)·`index.php`(RBAC roles viewer<connector<analyst<admin·scopes+289차 전역 writeGuard PEP)·`TeamPermissions`(231차 ABAC·acl_permission 메뉴×8동작·data_scope 9차원·delegation 서버 강제)·admin SSOT(289차·resolveAdminByToken·hash-only)·api_key(SHA-256)·Credential 암호화(AES-256-GCM·평문 저장 금지)·EPIC 06-A(289차 Permission Governance 설계)이나, **형식 Zero Trust Policy Engine(Continuous Verification/Trust Score/Conditional Access/Device Trust)·PAM(Vault/JIT/Session Recording)·Adaptive/Risk-Based·Biometric Auth·Device Identity는 미완**(부재증명 완료·EPIC 06-A 289차 판정 정합). ★★핵심=**인증·권한·RBAC·ABAC·세션·admin은 강하게 실재(289차 다수 하드닝)이나 형식 Zero Trust Policy Engine·PAM Vault·Device Trust는 부재.** ★중복 인증/권한/RBAC/ABAC/세션/admin 절대 금지(정본 재구현 금지·EPIC 06-A 재감사 금지)·Trust First(데이터)≠Zero Trust identity(오흡수 금지)·평문 저장 금지·마케팅 AI KEEP_SEPARATE·★AI 사용자 계정 자동 삭제/접근 권한 자동 변경 불가(V3+V5). 코드 변경 0.

## 상속·다음
- 상속: API Management(Part 042)+Data Platform(010~012 Security)+EPIC 06-A(RBAC/ABAC/Permission Governance·289차)+자격증명 규범+헌법 V3/V4/V5.
- 다음: **MEA Part 048 — Enterprise Security Operations Center (SOC), SIEM & SOAR Architecture**(본 IAM 상속·★SecurityAudit/AnomalyDetection seed 실재·SIEM/SOAR 부재).

## ★Developer Platform 진행 (Part 041~047)
Part 041 Foundation · 042 API Management(★강) · 043 DevSecOps(★강) · 044 Container/K8s(부재) · 045 Service Mesh(부재) · 046 Observability(PARTIAL) · **047 IAM & Zero Trust(★PARTIAL-strong·인증/권한/RBAC/ABAC 강함·Zero Trust Policy Engine/PAM Vault 부재)** → 다음 048 SOC/SIEM/SOAR.
