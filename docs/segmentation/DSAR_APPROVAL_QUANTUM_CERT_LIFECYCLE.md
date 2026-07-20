# DSAR — Certificate Lifecycle Manager (Part 3-23 §8)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

Certificate Lifecycle Manager는 X.509 인증서 및 서명 키의 생애 — Issuance → Renewal → Rotation → Revocation → Trust Chain Validation → Expiration Monitoring — 을 관장한다. PQC 전환에서 인증서는 서명 알고리즘(classical RSA/ECDSA ↔ PQC/hybrid) 교체의 최전선이므로, 관리평면은 (issuer, subject, notBefore/notAfter, sig_alg, trust_anchor) 인벤토리와 만료 사전경보를 필수로 갖는다. 본 Part는 **인증서를 발급·갱신·회전·폐기하고 신뢰사슬을 검증하며 만료를 감시하는 관리평면**을 정의한다.

## 2. Substrate 매핑

| 생애단계 | 현행 substrate | 인용 | 판정 |
|---|---|---|---|
| Issuance | (부재 — 자체 발급 없음) | — | ABSENT |
| Renewal | (부재) | — | ABSENT |
| Rotation | (부재) | — | ABSENT |
| Revocation | (부재 — CRL/OCSP 없음) | — | ABSENT |
| Trust Chain Validation | SAML IdP cert 소비 | `EnterpriseAuth.php:597` | PARTIAL(소비만) |
| 서명검증 substrate | SAML 서명검증 진입 | `EnterpriseAuth.php:49`·`:268` | PARTIAL |
| 신뢰재료 소비 | IdP cert/지문 확인 | `EnterpriseAuth.php:598` | PARTIAL |
| JWKS 소비 | JWKS 키 fetch/검증 | `EnterpriseAuth.php:545-568` | PARTIAL(소비만) |
| Expiration Monitoring | (부재 — 만료 사전경보 없음) | — | ABSENT |

## 3. 설계 계약(신설 대상)

- **Certificate Inventory**: 소비 중인 IdP cert(`:597`·`:598`)·JWKS(`:545-568`)를 만료일·sig_alg 포함 인벤토리로 등재. 현행은 검증 시점에만 소비하고 저장/추적 없음 → 인벤토리 신설.
- **Expiration Monitoring**: notAfter 임박 시 사전경보. 완전 부재이므로 신설(만료 인증서 소비로 인한 무음 인증실패 방지).
- **Issuance/Renewal/Rotation**: 내부 서명 인증서에 대한 발급·갱신·회전 파이프라인. 전면 신설.
- **Revocation + Trust Chain**: 소비 검증(`:49`·`:268`)을 확장해 CRL/OCSP·anchor 신뢰정책을 관리평면으로 승격. 검증로직 재구현 금지 — 기존 소비경로에 신뢰정책·폐기확인 계층만 부가.

## 4. KEEP_SEPARATE

- SAML 서명검증 진입(`EnterpriseAuth.php:49`·`:268`)은 **인증 처리(consume)** 로직이며 인증서 관리평면(manage)이 아니다. Cert Lifecycle Manager는 이를 신뢰재료 소스로 참조할 뿐, 검증로직을 흡수·이설하지 않는다.

## 5. 판정

**ABSENT**. 인증서 관리(발급·갱신·회전·폐기·만료감시) grep 0. 현행은 SAML cert/JWKS를 검증 시점에 **소비만**(`EnterpriseAuth.php:49`·`:268`·`:597`·`:598`·`:545-568`)하며 인벤토리·만료 사전경보·발급/회전이 없다. PQC 서명 알고리즘 전환의 관리평면 전면 순신설. 코드 변경 0 · BLOCKED_PREREQUISITE.
