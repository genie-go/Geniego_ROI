# DSAR — EAGDTEF Canonical Entities Design & Judgment (Part 3-45 §2~§21)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★EnterpriseAuth/Agency/Partner 재사용·DID/Sovereign 미래.

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_GLOBAL_TRUST | 부재 | — | ABSENT-formal |
| 2 | APPROVAL_TRUST_DOMAIN | 부재 | — | ABSENT |
| 3 | APPROVAL_TRUST_PARTNER | 대행사/파트너 | `AgencyPortal.php`·`PartnerPortal.php` | PARTIAL-strong |
| 4 | APPROVAL_TRUST_FEDERATION | SSO/SAML/OIDC/SCIM | `EnterpriseAuth.php` | PARTIAL-strong |
| 5 | APPROVAL_TRUST_POLICY | agency_client_link 스코프·acl | `AgencyPortal.php`·`TeamPermissions.php` | PARTIAL |
| 6 | APPROVAL_TRUST_SCORE | DataTrust(데이터) | `DataPlatform.php` | PARTIAL(KEEP_SEPARATE) |
| 7 | APPROVAL_TRUST_EVIDENCE | append-only 정본 | `SecurityAudit.php` | PARTIAL(체인 재사용) |
| 8 | APPROVAL_TRUST_VERIFICATION | ★매 요청 approved 재검증 fail-closed | `index.php`·`AgencyPortal.php` | PARTIAL(Zero Trust) |
| 9 | APPROVAL_TRUST_ANALYTICS | 부재 | — | ABSENT |
| 10 | APPROVAL_TRUST_BASELINE | env/config·git | `Db.php`·git | PARTIAL |
| 11 | APPROVAL_TRUST_VERSION | git·API 버전 | git | PARTIAL |
| 12 | APPROVAL_TRUST_SNAPSHOT | 부재 | — | ABSENT |
| 13 | APPROVAL_TRUST_DIGEST | 부재 | — | ABSENT |
| 14 | APPROVAL_TRUST_STATUS | NOT_CERTIFIED 라벨 | `DSAR_APPROVAL_*` | PARTIAL-informal |
| 15 | APPROVAL_TRUST_CERTIFICATION | Part 3-36 참조 | (설계) | 상위 Part 참조 |
| 16 | APPROVAL_SOVEREIGN_IDENTITY | 부재(DID/Wallet 없음·Part 3-41) | — | ABSENT-aspirational |
| 17 | APPROVAL_CROSS_CLOUD_TRUST | 부재(단일 호스트) | — | ABSENT-aspirational |
| 18 | APPROVAL_CROSS_BORDER_POLICY | 부재(데이터 주권 미형식·GdprConsent seed) | `GdprConsent.php` | ABSENT-formal |
| 19 | APPROVAL_PARTNER_LIFECYCLE | 대행사 승인/철회(부분 생애주기) | `AgencyPortal.php` | PARTIAL |
| 20 | APPROVAL_TRUST_EXCEPTION | 부재 | — | ABSENT |

## 도메인 설계 계약(§3~§21 요지)
- **§6 Global Identity Federation**: ★`EnterpriseAuth` SSO/SAML/OIDC/SCIM 실재(서명검증·XSW 방지·289차 group→role 배선). 재사용(중복 SSO 신설 절대 금지). DID/Verifiable Credentials=Part 3-41(미래).
- **§7 Cross-Organization Authorization**: ★`AgencyPortal`(대행사→클라이언트 위임·approved 재검증·읽기전용/쓰기 스코프·write 미허용 시 변경차단)·`PartnerPortal`(partner_session) 실 배선. External RBAC/ABAC·Federated Decision 신설.
- **§10 Continuous Verification**: ★매 요청 agency_client_link `approved` 재검증 fail-closed(`index.php`)=Zero Trust 패턴 실재. 형식 Continuous Verification Engine 승격.
- **§11 Privacy·§12 Sovereign**: Privacy=GdprConsent/Dsar/No-PII 실재. Sovereign Identity(DID)=미래.
- **§13 Cross-Cloud**: 단일 호스트라 미존재(Part 3-41 미래).

## 판정
**PARTIAL-strong(§3~5·§7~8·§19=EnterpriseAuth/Agency/Partner/fail-closed 재검증·실 연합/크로스조직) / PARTIAL(§6·§10·§18=DataTrust/GdprConsent) / ABSENT-aspirational(§16~17 DID/Cross-Cloud).** 코드 0. BLOCKED_PREREQUISITE. 실행 시 EnterpriseAuth/Agency/Partner 승격(중복 연합 신설 금지·위임 tenant 고착 방지).
