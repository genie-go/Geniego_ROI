# DSAR — Certificate Manager (Federation) (Part 3-18 §12)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_FEDERATION_CERTIFICATE
Certificate Manager는 cross-domain federation 신뢰 앵커의 인증서 수명주기를 관리하는 거버넌스 계약이다. 대상:
- **Root Certificate** — federation 신뢰 루트(CA) 앵커.
- **Intermediate Certificate** — 발급 위임 체인.
- **Client Certificate** — mTLS 상호인증용 도메인/서비스 identity 증명.
- **Rotation / Revocation / Expiration** — 회전 스케줄, CRL/OCSP 폐기, 만료 감시.

## 2. Substrate 매핑 (현행 코드 실측)
| SPEC 요구 | 현행 substrate | file:line | 상태 |
|---|---|---|---|
| IdP 인증서 소비 | SAML IdP cert(PEM) 서명검증 소비 | `EnterpriseAuth.php:596-623` · `:597-598` | 소비 전용 |
| 서명키 공개 | OIDC JWKS RSA 공개키 | `EnterpriseAuth.php:546` | 소비/노출 |
| Root/Intermediate CA | 없음 | — | **ABSENT** |
| Client cert / mTLS | 없음 | — | **ABSENT** |
| CA / keystore / CRL·OCSP | 없음 | — | **ABSENT** |
| Rotation/Revocation/Expiration 엔진 | 없음(cert 발급 주체 부재) | — | **ABSENT** |

현행은 **IdP가 발급한 SAML 인증서 PEM을 서명검증 목적으로 소비**(`EnterpriseAuth.php:596-623`)하고, OIDC 검증에 원격 **JWKS RSA 공개키**(`:546`)를 사용할 뿐이다. GeniegoROI는 인증서 **발급자(CA)** 가 아니다.

## 3. 설계 계약 (신설 시)
- **CertificateAuthority substrate 순신설**: Root/Intermediate 계층, 발급·서명, keystore(HSM/KMS 백업은 §13 Key Manager에 위임).
- **mTLS Client Certificate 발급/검증**: cross-domain 서비스 identity 상호인증. 현행 SAML/OIDC inbound 소비 경로(`EnterpriseAuth.php:596-623`)와 **병렬 신뢰스택 금지** — 검증 진입점을 단일화하고 CA는 발급측만 추가.
- **Lifecycle governance**: Rotation(스케줄+무중단 dual-trust), Revocation(CRL/OCSP), Expiration(사전 경보) — 발급 이벤트는 감사 append-only 체인(`SecurityAudit.php:14-67`)에 기록.
- 인증서 개인키 at-rest 보호는 §13 Key Manager(Crypto AES-256-GCM+KEK)에 종속.

## 4. KEEP_SEPARATE
- **connector_token**(`Connectors.php:133-181`) — 외부 커넥터 자격, cert 체계 아님.
- **SMS HMAC**(`NaverSms.php:94` · `:119`) — 발송 서명, PKI 무관.
- **cloud export creds**(`DataExport.php:131-156`) — 내보내기 자격, federation cert 아님.
- 위 3종은 Certificate Manager로 흡수 금지.

## 5. 판정
**ABSENT (PKI 부재)**. 현행은 IdP SAML cert PEM 소비(`EnterpriseAuth.php:597-598` · `:596-623`)와 JWKS RSA(`:546`)만 존재하며 CA·mTLS·client cert 발급·CRL/OCSP·keystore는 **전부 순신설** 대상. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(§13 Key Manager 및 CA substrate 선행).
