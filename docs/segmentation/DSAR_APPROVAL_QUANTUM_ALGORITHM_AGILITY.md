# DSAR — Algorithm Agility Engine (Part 3-23 §4)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Algorithm Agility Engine은 인가·암호 substrate가 의존하는 **암호 프리미티브를 식별자로 추상화**하여, 서비스 중단 없이 알고리즘을 교체·이중지원·폐기(deprecate)할 수 있게 하는 무중단 pluggable 계층이다. 대상 프리미티브 집합: 대칭 AEAD(AES-256-GCM), 서명(RSA/RS256·ECDSA·Ed25519), 해시(SHA-2·SHA-3), 그리고 **PQC(ML-KEM·ML-DSA·SLH-DSA)** 로의 확장. SPEC 계약은 (a) 모든 암호 산출물에 알고리즘 식별자를 명시적으로 태깅하고, (b) 복호/검증 경로가 태그를 읽어 알고리즘을 선택(dual-read)하며, (c) 쓰기 경로는 정책상 활성 알고리즘 1종으로 수렴하고, (d) 알고리즘 폐기는 read-only grace window를 거쳐 완료되는 것이다.

## 2. Substrate 매핑 표
| SPEC 계약 요소 | 현행 substrate (proto) | 상태 |
|---|---|---|
| 산출물 버전/식별자 태깅 | envelope 버전 태깅 `Crypto.php:84-88` · 접두 `enc:vN:` `Crypto.php:125` | PARTIAL — **KEK 버전만** 태깅 |
| 버전→키 해석(dual-read) | `Crypto.php:35-43` keyForVersion | PARTIAL — 버전별 키 선택 존재 |
| 활성 알고리즘 고정 | AES-256-GCM 고정 `Crypto.php:121` | 알고리즘 pluggable **부재** |
| 알고리즘 폐기/grace | (없음) | ABSENT |
| PQC 프리미티브 등록 | (없음·라이브러리 부재 `composer.json:5-13`) | ABSENT |

## 3. 설계 계약
- **CryptoSuite 식별자**: 현행 `enc:vN:` 접두(`Crypto.php:125`)를 알고리즘까지 포함하는 suite 식별자(예: `enc:vN:<alg>:`)로 상위호환 확장. 기존 태그는 default suite(AES-256-GCM)로 해석하여 **무회귀 dual-read** 보장(`Crypto.php:84-88`).
- **Registry-driven 선택**: keyForVersion(`Crypto.php:35-43`)이 버전→KEK만 해석하는 현행을 suite→(algorithm, key) 해석으로 일반화. 쓰기는 정책상 활성 suite 1종으로 수렴, 읽기는 태그 우선.
- **BLOCKED_PREREQUISITE**: PQC suite 등록은 라이브러리 도입(§5 PQC Manager) 선행. 라이브러리 부재(`composer.json:5-13`) 하에서 코드 착수 금지 — 본 DSAR는 설계 계약만 확정.
- **감사 연동**: suite 전환(활성화/폐기) 이벤트는 append-only 감사(`SecurityAudit.php:27`)로 기록(설계 계약, 미배선).

## 4. KEEP_SEPARATE
- 마케팅 밴딧/추천 "algorithm"(`AutoRecommend.php:22`·`:668`)은 통계 최적화 알고리즘 문자열 — 암호 프리미티브 agility와 **무관, 흡수 금지**.
- 벤더 서명 "algorithm" 문자열(`Connectors.php:1290`)은 외부 커넥터 요청 서명 규약 — 내부 CryptoSuite Registry로 편입 금지.

## 5. 판정
**PARTIAL-proto.** envelope 버전 태깅(`Crypto.php:84-88`)·keyForVersion(`Crypto.php:35-43`)·`enc:vN:` 접두(`Crypto.php:125`)가 **KEK 버전 agility proto**를 이룬다. 그러나 알고리즘 자체는 AES-256-GCM 고정(`Crypto.php:121`)으로 pluggable 무중단 교체 계층은 **순신설**. PQC suite는 §5 선행 후 등록. NOT_CERTIFIED.
