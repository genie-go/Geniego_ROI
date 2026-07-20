# DSAR — Authorization Quantum-Ready Runtime Guard (Part 3-23 §24)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

Runtime Guard(§24)는 인가 경로에서 실행되는 모든 암호 연산을 **요청 시점(inline)** 에 검사하여 양자내성(PQC) 정책 위반을 차단하는 fail-closed 게이트다. 대상 위반 6종: Deprecated Algorithm(폐기 알고리즘 사용), Weak Key Length(키 길이 미달), Expired Certificate(만료 인증서), Unauthorized Key Export(비인가 키 반출), Invalid Trust Chain(신뢰체인 무효), PQC Policy Bypass(정책 우회). 게이트는 위반 탐지 시 연산을 거부하고 `SecurityAudit`로 결정을 append-only 기록하며, 통과 시에만 하류 crypto 연산으로 진행한다. 정책은 tenant scope로 격리되며 Unknown=차단(fail-closed).

## 2. Substrate 매핑

| 가드 대상 위반 | 실재 substrate(baseline) | 인용 | 판정 |
|---|---|---|---|
| Deprecated Algorithm | 약한 해시 산재(SHA-1 고객식별) | `CRM.php:589` | 탐지대상·가드부재 |
| Deprecated Algorithm | 약한 해시 산재(MD5 주문지문) | `OrderHub.php:992` | 탐지대상·가드부재 |
| Invalid Trust Chain | SAML assertion 서명검증 | `EnterpriseAuth.php:597` | 근접·PQC미인지 |
| Unauthorized Key Export | envelope 암호화(KEK 봉투) | `Crypto.php:108-126` | baseline·가드부재 |
| Weak Key Length / Expired Cert / PQC Bypass | (해당 substrate 없음) | — | ABSENT-greenfield |

Runtime Guard 자체(inline crypto 정책 검사, PQC profile 강제)는 grep 0 — 코드 전무.

## 3. 설계 계약

- **진입점**: 인가 경로의 crypto 연산 직전 단일 훅. 기존 산재 crypto(`Crypto.php:108-126`)를 대체하지 않고 그 앞단에 정책 판정을 삽입(비파괴 확장).
- **판정 순서**: (1) 알고리즘 식별 → Deprecated 목록 대조 (2) 키 길이/파라미터 검증 (3) 인증서 만료·Trust Chain(`EnterpriseAuth.php:597` 검증 재사용) (4) Key Export 권한(envelope `Crypto.php:108-126` 참조) (5) PQC profile 준수. 하나라도 실패=거부.
- **fail-closed**: 정책 미해석·데이터 부족·tenant 미상 = 차단. Unknown≠허용.
- **감사**: 모든 거부/통과 결정을 `SecurityAudit.php:27` append 계약으로 기록(`:56-68` verify 체인). 장식적 hash_chain 재사용 금지 — 정본 verify만.
- **격리**: 정책·결정 tenant scope. 교차 테넌트 crypto 정책 참조 금지.

## 4. KEEP_SEPARATE

해당 없음(마케팅 `AutoRecommend.php:22` 등 무관 도메인은 흡수 대상 아님).

## 5. 판정

**ABSENT(crypto 런타임 가드 전무)** — 순신설. Deprecated Algorithm 탐지 대상만 실재(SHA-1 `CRM.php:589`·MD5 `OrderHub.php:992`)하고, Trust Chain은 SAML verify(`EnterpriseAuth.php:597`)·Key Export는 envelope(`Crypto.php:108-126`)가 baseline substrate로 존재하나 **PQC 인지·정책 강제·inline 가드는 어디에도 없다**. BLOCKED_PREREQUISITE(PQC 라이브러리 부재 `composer.json:5-13`). 코드 변경 0.
