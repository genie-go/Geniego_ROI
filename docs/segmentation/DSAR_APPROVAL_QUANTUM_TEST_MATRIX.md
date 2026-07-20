# DSAR — Authorization Quantum-Ready Test Matrix (Part 3-23 §32)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Part 3-23 §32는 Quantum-Ready 권한 아키텍처의 **테스트 매트릭스** 6계층을 규정한다:
(a) **Unit** — Inventory·PQC Algorithm·Key Lifecycle·Cert Lifecycle·Quantum Risk.
(b) **Integration** — Fabric·Federation·Zero Trust·Compliance·Digital Twin·Observability.
(c) **Performance** — 10M Assets·5M Certs·50M Keys·1B Validation.
(d) **Security** — Weak Algorithm Injection·Key Theft·Certificate Forgery·PQC Downgrade·Cross-Tenant Secret.
(e) **Compliance** — NIST PQC·FIPS 140-3·ISO27001·ISO19790·PCI DSS.
(f) **Regression** — 무후퇴 회귀.

## 2. Substrate 매핑
| §32 계층 | 현행 substrate / 라이브 표적 | 근거(file:line) | 상태 |
|---|---|---|---|
| Unit(전 항목) | 관리엔진 부재 | (allowlist 외·기술 서술) | 미구현 |
| Security: Weak Algorithm Injection | 약한 해시 라이브 표적 | `CRM.php:589`·`OrderHub.php:992` | 표적 식별됨 |
| Security: Certificate Forgery | SAML 서명 verify 라이브 표적 | `EnterpriseAuth.php:600` | 표적 식별됨 |
| Security: Cross-Tenant Secret | api_key tenant 격리 재사용 | `Db.php:945` | 부분 기판 |
| Security: Key Theft | KEK 복호 경로 | `Crypto.php:133-148` | 부분 기판 |
| Performance(10M/5M/50M/1B) | 측정 대상 부재 | (기술 서술) | 미구현 |

## 3. 설계 계약
- **Weak Algorithm Injection** 테스트는 약한 해시 사용부(`CRM.php:589`·`OrderHub.php:992`)를 회귀 표적으로 고정 — PQC/강한 알고리즘 대체 후에도 약한 계열 재유입 차단을 검증.
- **Certificate Forgery** 테스트는 SAML 서명 검증(`EnterpriseAuth.php:600`)을 위조 방어 라이브 표적으로 고정 — 서명 우회·체인 위조 거부를 검증.
- **Cross-Tenant Secret** 테스트는 api_key tenant 격리(`Db.php:945`)를 기판으로 교차 테넌트 비밀 조회 차단을 검증(§29 Tenant Isolation 정합).
- Unit/Integration/Performance 전 계층은 §29~§31 관리엔진 부재로 현재 실행 불가 — **RP-track 조건**. Compliance(NIST PQC/FIPS 140-3 등)는 PQC 라이브러리 도입(`composer.json:5-13` 부재) 후 평가 가능.

## 4. 판정
**미구현**. 관리엔진 부재로 Unit/Integration/Performance 전 계층 실행 불가. Security 계층은 라이브 표적 식별됨(Weak Algorithm=`CRM.php:589`·`OrderHub.php:992`·Certificate Forgery=`EnterpriseAuth.php:600`·Cross-Tenant=`Db.php:945` 재사용). §29~§31 선행 후 실행 가능한 **RP-track 조건**. 코드 변경 0 · NOT_CERTIFIED.
