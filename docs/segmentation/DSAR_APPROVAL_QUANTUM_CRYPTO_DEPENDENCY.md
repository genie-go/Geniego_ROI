# DSAR — Authorization Crypto Dependency Analyzer (Part 3-23 §11)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §11)
**Crypto Dependency Analyzer**를 정의한다: 인가 계층이 의존하는 암호 자산의 전체 그래프 — Library Dependency, Protocol Dependency, Certificate Dependency, Key Dependency, Service Dependency — 를 인벤토리화하여 "양자 취약 primitive가 어디에 얼마나 박혀 있는가"를 산출한다. PQC 마이그레이션(§5)의 영향분석 입력.

## 2. Substrate 매핑
| SPEC 의존 유형 | 현행 substrate | 상태 |
|---|---|---|
| Library Dependency | `composer.json:5-13` (openssl/hash 내장 확장, PQC 부재) | 인벤토리 없음 |
| Key Dependency | `Crypto.php:121` (AES-256-GCM 대칭키) · `:108-126`·`:177` | 산재·미추적 |
| Protocol Dependency (SAML/OIDC 서명) | `EnterpriseAuth.php:20-22`·`:596`·`:600` | 소비만 |
| Certificate Dependency | `EnterpriseAuth.php:597`·`:598` (IdP cert) | §2로 연동 |
| Service Dependency (JWKS 소비자) | `EnterpriseAuth.php:545-568` | 정적 |
| 의존 그래프 산출/취약도 스코어 | (grep 0) | **ABSENT** |

## 3. 설계 계약 (신설 대상)
- **Dependency Inventory**: {asset_type(library/protocol/cert/key/service), primitive, quantum_vulnerable(bool), location_ref}. 현행 analyzer grep 0 → 순신설. 초기 시드는 §2 Substrate 매핑 표를 기계화.
- **Vulnerability Grading**: RSA/ECC 계열 = quantum-vulnerable, AES-256(`Crypto.php:121`)·SHA-2(`:133-148`) = grover-저항(키 길이 충분) 분류. 등급 근거는 §5 PQC Profile·§14 Policy와 정합.
- **Blast-Radius**: primitive 교체 시 영향 받는 봉투 버전(`Crypto.php:84-88`)·프로토콜 경로 역추적.
- **Library Gate**: `composer.json:5-13`에 PQC 라이브러리 부재 → analyzer가 "PQC 미도입" 상태를 명시적 리포트. 라이브러리 도입 선행.

## 4. KEEP_SEPARATE
- **벤더 프로토콜/서명 의존** — `Connectors.php:3790`·`:3799`·`:1290`·`ChannelSync.php:643`. 외부 채널 API 호출 서명은 벤더가 규격을 강제하며 우리가 교체할 수 없는 외부 의존 → analyzer는 "외부 강제(non-agile)"로 별도 분류하되 우리 마이그레이션 대상 집합에서 제외.
- **마케팅/모델 algorithm 의존** — `AutoRecommend.php:22`·`ModelMonitor.php:18-19`. 암호 의존 아님.
- **제품안전 인증 의존** — `PriceOpt.php:63`. 컴플라이언스 데이터.

## 5. 판정
Crypto Dependency Analyzer **ABSENT-greenfield**. 의존 그래프·취약도 산출 grep 0, PQC 라이브러리 `composer.json:5-13` 부재. 현행 암호 의존은 내장 openssl/hash + AES-256-GCM(`Crypto.php:121`) + SAML/OIDC 서명 소비(`EnterpriseAuth.php:597`·`:598`·`:545-568`)로 산재하나 인벤토리·등급·blast-radius 계층이 전무. Inventory/Grading/Blast-Radius는 순신설이며 벤더 강제 서명 의존은 non-agile 격리, 마케팅 algorithm·kc_cert_no는 KEEP_SEPARATE. PQC 라이브러리 도입 선행으로 BLOCKED_PREREQUISITE. **코드 변경 0 · NOT_CERTIFIED.**
