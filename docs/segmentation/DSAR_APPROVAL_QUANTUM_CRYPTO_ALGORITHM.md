# DSAR — Authorization Crypto Algorithm Governance (Part 3-23 §2·§4)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC) — Approval Crypto Algorithm

**APPROVAL_CRYPTO_ALGORITHM**은 인가 신뢰근이 사용하는 **알고리즘 자체**를 분류·거버넌스하는 계약이다. 분류 축:
- **고전(classical)**: RSA · ECDSA · Ed25519 · AES · SHA-2 · SHA-3.
- **PQC(post-quantum)**: ML-KEM(Kyber) · ML-DSA(Dilithium) · SLH-DSA(SPHINCS+).

각 알고리즘은 `family` · `security_bits` · `quantum_status`(safe/vulnerable) · `nist_status` · `pluggability`(교체 용이성)로 기술된다.

## 2. 실존 substrate 매핑

| 알고리즘(계약) | 상태 | 근거(허용목록) |
|---|---|---|
| AES-256-GCM(대칭·at-rest) | PRESENT(classical) | `backend/src/Crypto.php:121`(cipher 지정)·`:108-126` |
| RSA-SHA256(서명·SSO) | PRESENT(classical) | `backend/src/Handlers/EnterpriseAuth.php:536`·`:600` |
| SHA-256(무결성 해시) | PRESENT(classical) | `backend/src/SecurityAudit.php:27`·`:56-68` |
| bcrypt(패스워드 KDF) | PRESENT(classical) | `backend/src/Handlers/UserAuth.php:498` |
| HMAC(커넥터 서명) | PRESENT(classical) | `backend/src/Handlers/Connectors.php:132` |
| ML-KEM / ML-DSA / SLH-DSA(PQC) | **ABSENT** | `backend/composer.json:5-13` — PQC 라이브러리 의존성 전무 |
| 알고리즘 **레지스트리/분류 거버넌스 엔진** | ABSENT | grep 0 — 알고리즘이 호출부에 하드코딩·중앙 분류 계층 부재 |
| Crypto agility(알고리즘 pluggable 교체) | ABSENT | cipher가 호출부에 직접 지정(`Crypto.php:121`)·추상 교체 계층 없음 |

**요지**: 인가 알고리즘은 전부 **고전(classical)이며 실재**한다(AES-256-GCM·RSA-SHA256·SHA-256). 양자 위협 하에서 RSA/ECDSA는 Shor 알고리즘에 취약, AES/SHA-2는 Grover로 유효 강도 절반화. **PQC 알고리즘은 라이브러리 수준에서부터 부재**(`composer.json:5-13`)하고, 알고리즘을 분류·교체하는 거버넌스 계층도 없다.

## 3. 설계 계약(규칙)

1. **분류-first**: 실 사용 알고리즘을 `quantum_status`로 라벨(RSA/ECDSA=vulnerable, AES-256/SHA-256=degraded-but-usable). 임의 등급 금지 — NIST 기준 파생.
2. **Hybrid 우선**: PQC 도입 시 classical과의 **hybrid(고전+PQC 병행 서명/KEM)**를 기본 — 단독 PQC 전환은 성숙도 게이트 통과 후.
3. **Agility 계약**: 신규 알고리즘은 pluggable 인터페이스 뒤에 위치 — 호출부 하드코딩 지양(현행 `Crypto.php:121` 패턴은 마이그레이션 대상으로 기록).
4. **PREREQUISITE**: PQC 알고리즘 편입은 `composer.json` 의존성 추가가 선행(현재 부재 → BLOCKED).
5. **NOT_CERTIFIED**: 본 계약은 분류·거버넌스 규칙만 — 실제 알고리즘 교체는 코드 변경으로 별도 승인세션.

## 4. KEEP_SEPARATE

- **마케팅 "algorithm"**(추천/최적화 bandit): `backend/src/Handlers/AutoRecommend.php:22`·`:668` · `backend/src/Handlers/PriceOpt.php:63`·`:345` · `backend/src/Handlers/ModelMonitor.php:18-19` · `backend/src/Handlers/AdminGrowth.php:21` — 이들은 **의사결정/통계 알고리즘**이지 암호 알고리즘이 아니다. 명명 충돌일 뿐 본 계약 대상에서 완전 분리.

## 5. 판정

**NOT_CERTIFIED · PRESENT-classical + PQC ABSENT(순신설)**. 인가 알고리즘은 고전군으로 실재(`Crypto.php:121`·`EnterpriseAuth.php:536`·`:600`·`SecurityAudit.php:27`)하나 전부 quantum-vulnerable/degraded. PQC는 라이브러리(`composer.json:5-13`)부터 grep 0 → **BLOCKED_PREREQUISITE**. 본 DSAR 코드 변경 0.
