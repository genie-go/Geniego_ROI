# DSAR — PQC Manager (Part 3-23 §5)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
PQC Manager는 Post-Quantum Cryptography 프리미티브(ML-KEM·ML-DSA·SLH-DSA)의 **도입 수명주기를 관장**하는 거버넌스 컴포넌트다. 책무: (a) **PQC Profile** — 승인된 알고리즘·파라미터셋(보안수준) 정의, (b) **Capability Discovery** — 런타임 라이브러리/플랫폼이 지원하는 PQC 알고리즘 탐지, (c) **Compatibility** — 상대(peer)·저장 산출물과의 상호운용 가능성 판별, (d) **Rollout** — 단계적 활성화(canary→확대), (e) **Rollback** — 결함/상호운용 실패 시 classical 회귀, (f) **Validation** — KAT(Known-Answer-Test)·자체시험 통과 게이트.

## 2. Substrate 매핑 표
| SPEC 계약 요소 | 현행 substrate | 상태 |
|---|---|---|
| PQC Profile 정의 | (없음) | ABSENT |
| Capability Discovery | (없음) | ABSENT |
| Compatibility 판별 | (없음) | ABSENT |
| Rollout/Rollback 스테이징 | 버전 태깅 proto `Crypto.php:84-88`(KEK 한정, PQC 무관) | 미적용 |
| Validation 게이트 | (없음) | ABSENT |
| PQC 라이브러리 | 부재 `composer.json:5-13` | ABSENT |

## 3. 설계 계약
- **PQC Profile Registry**: 승인 알고리즘(ML-KEM-768/1024·ML-DSA-65/87·SLH-DSA)·파라미터셋을 선언적 프로파일로 관리. §4 Algorithm Agility의 CryptoSuite 식별자와 1:1 매핑되도록 계약.
- **Discovery→Validation→Rollout 파이프라인**: 기동 시 라이브러리 capability 탐지 → KAT 검증 통과분만 profile ACTIVE 승격 → canary 테넌트 우선 활성 → 확대. 실패 시 자동 Rollback(classical 유지).
- **BLOCKED_PREREQUISITE(강)**: PQC 라이브러리 부재(`composer.json:5-13`)로 **어떤 코드도 착수 불가**. 도입 순서 = (1) 라이브러리 채택 ADR·의존성 추가 → (2) PQC Manager → (3) Hybrid Crypto(§6). 본 DSAR는 프로파일·수명주기 계약만 확정.
- **감사**: profile 상태 전이(ACTIVE/DEPRECATED/ROLLBACK)는 append-only 감사(`SecurityAudit.php:27`) 대상(설계 계약).

## 4. KEEP_SEPARATE
- 본 컴포넌트는 **순신설 그린필드**로, 편입 대상 기존 엔진이 없다. 마케팅/벤더 도메인의 "algorithm" 문자열은 §4에서 명시적 분리됨 — PQC Manager로의 혼입 금지.

## 5. 판정
**ABSENT.** PQC grep 0 — ML-KEM/Kyber/Dilithium/SPHINCS 심볼 전무, 라이브러리 부재(`composer.json:5-13`). PQC Manager는 라이브러리 도입 선행 후 **순신설**. 현행 envelope 버전 proto(`Crypto.php:84-88`)는 KEK 한정으로 PQC 수명주기와 무관. BLOCKED_PREREQUISITE · NOT_CERTIFIED.
