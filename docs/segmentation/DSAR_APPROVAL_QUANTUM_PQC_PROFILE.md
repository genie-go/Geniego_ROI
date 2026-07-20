# DSAR — Authorization PQC Profile & Capability Discovery (Part 3-23 §2·§5)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §2·§5)
인가 계층이 사용하는 암호 primitive의 **PQC Profile**(post-quantum 알고리즘 집합·파라미터·모드)과 **Capability Discovery**(피어/자재별 지원 알고리즘 협상)·**Compatibility**(classical↔PQC 하이브리드 호환) 계약을 정의한다. 목표는 "crypto-agility": envelope 버전 협상으로 알고리즘을 교체 가능하게 만드는 것.

## 2. Substrate 매핑
| SPEC 요소 | 현행 substrate | 상태 |
|---|---|---|
| 암호 envelope 버전 필드 | `Crypto.php:84-88` (버전 태그된 암호문 봉투) | PARTIAL(classical 단일 버전 = agility proto) |
| 대칭 암호 primitive | `Crypto.php:121` (AES-256-GCM) · `:108-126` | 고정 classical |
| 서명/HMAC 검증 | `Crypto.php:133-148`·`:177` | 고정 classical |
| PQC 알고리즘(Kyber/Dilithium/ML-KEM/ML-DSA 등) | (grep 0) | **ABSENT** |
| PQC 라이브러리 의존성 | `composer.json:5-13` (openssl/hash 내장만) | **부재** |
| Capability Discovery / 알고리즘 협상 | (grep 0) | **ABSENT** |

## 3. 설계 계약 (신설 대상)
- **PQC Profile 레지스트리**: {algo_family, security_level(NIST L1/L3/L5), mode, hybrid_pair} 정의. 현행 grep 0 → 순신설.
- **Envelope 버전 확장**: 현행 버전 태그 봉투(`Crypto.php:84-88`)를 agility 앵커로 재사용. PQC 버전을 신규 태그로 추가하되 기존 classical 복호 경로(`Crypto.php:108-126`·`:121`) **무회귀 유지**(dual-read).
- **Capability Discovery**: 피어/자재별 지원 profile 협상 → 최고 공통 알고리즘 선택. hybrid(classical+PQC) fallback 계약.
- **Migration Gate**: PQC 라이브러리(`composer.json:5-13`에 부재) 도입이 선행조건 → 라이브러리 확정 전까지 BLOCKED.

## 4. KEEP_SEPARATE
- **벤더 서명 algorithm 문자열** — `Connectors.php:1290`·`ChannelSync.php:643`. 외부 커넥터 요청 서명 규격(벤더 지정)이며 우리 인가 계층의 agility 엔진이 아니다. PQC Profile에 편입 금지.
- **마케팅 추천 algorithm** — `AutoRecommend.php:22`·`ModelMonitor.php:18-19`. "algorithm" 동음이의(ML 모델)이며 암호 primitive 아님.
- **제품안전/디지털셸프 규격 문자열** — `DigitalShelf.php:249` 등 벤더 계약 필드.

## 5. 판정
PQC Profile/Capability Discovery/Compatibility **ABSENT-greenfield**. PQC 알고리즘·라이브러리 grep 0, `composer.json:5-13`에 PQC 의존성 부재. 현행은 버전 태그된 classical envelope(`Crypto.php:84-88`)와 고정 AES-256-GCM(`:121`)뿐 — 이 envelope 버전 체계만이 유일한 **agility 원형(proto)**이며 이를 앵커로 PQC 버전을 상위호환 추가한다. Discovery/hybrid/Profile은 순신설이나 **PQC 라이브러리 도입 선행 필요**로 BLOCKED_PREREQUISITE. classical 복호 경로 무회귀. **코드 변경 0 · NOT_CERTIFIED.**
