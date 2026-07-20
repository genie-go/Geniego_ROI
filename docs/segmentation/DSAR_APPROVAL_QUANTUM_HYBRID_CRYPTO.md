# DSAR — Hybrid Cryptography Engine (Part 3-23 §6)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Hybrid Cryptography Engine은 양자 전환기(migration window) 동안 **classical + PQC를 동시 결합**하여, 둘 중 하나가 깨져도 보안이 유지되는 방어적 이중화를 제공한다. 대상: (a) **Hybrid Key Exchange** — classical KEM + ML-KEM 공유비밀 결합(KDF), (b) **Hybrid Signature** — classical 서명 + ML-DSA/SLH-DSA 병행 서명, (c) **Dual Certificate** — classical·PQC 인증서 이중 체인, (d) **Hybrid TLS**, (e) **Hybrid JWT Signing** — 토큰에 이중 서명 부착. SPEC 계약의 핵심 불변식: hybrid 산출물의 **검증은 두 알고리즘 모두 통과해야 유효**, 무중단 전환(classical-only→hybrid→PQC-only)은 §4 suite 태깅으로 단계 표현.

## 2. Substrate 매핑 표
| SPEC 계약 요소 | 현행 substrate (classical only) | 상태 |
|---|---|---|
| 대칭 AEAD | AES-256-GCM `Crypto.php:108-126` | classical 단독 |
| RSA 키/서명 | `EnterpriseAuth.php:536`·`:600` | classical 단독 |
| JWT 서명 알고리즘 | RS256 `Connectors.php:3799` | classical 단독 |
| Hybrid Key Exchange | (없음) | ABSENT |
| Hybrid/Dual Signature·Cert | (없음) | ABSENT |
| Hybrid TLS/JWT | (없음) | ABSENT |

## 3. 설계 계약
- **Composite 산출물 포맷**: hybrid 암호문/서명은 classical·PQC 두 성분을 결합한 composite 구조로, §4 CryptoSuite 식별자(`Crypto.php:125` 접두 확장)에 `hybrid` suite로 태깅. 검증은 AND 결합(둘 다 유효).
- **AEAD 결합**: 현행 AES-256-GCM(`Crypto.php:108-126`)은 데이터 암호화 계층으로 유지하되, 키 캡슐화를 classical KEM + ML-KEM hybrid로 상향(설계 계약).
- **서명 이중화**: RSA/RS256(`EnterpriseAuth.php:536`·`:600`·`Connectors.php:3799`)에 PQC 서명을 병행 부착하여 Hybrid JWT Signing 실현. 검증 경로는 suite 태그로 hybrid/classical 분기(dual-read, 무회귀).
- **BLOCKED_PREREQUISITE(강)**: PQC 라이브러리(`composer.json:5-13` 부재)·PQC Manager(§5) 선행. 착수 순서 = 라이브러리 → §5 → §6. 본 DSAR는 composite 포맷·검증 불변식만 확정.
- **감사**: hybrid 전환 단계 전이는 append-only 감사(`SecurityAudit.php:27`) 대상(설계 계약).

## 4. KEEP_SEPARATE
- 벤더 커넥터 서명 규약(`Connectors.php:1290`)·채널 서명 문자열(`ChannelSync.php:643`)은 외부 상호운용 규약으로, 내부 Hybrid Engine이 강제 이중서명하지 않는다 — **분리 유지**.
- 순신설 컴포넌트로 편입 대상 내부 hybrid 엔진 없음(hybrid grep 0).

## 5. 판정
**ABSENT.** hybrid grep 0 — 현행은 classical 단독(AES `Crypto.php:108-126`·RSA `EnterpriseAuth.php:536`·`:600`·RS256 `Connectors.php:3799`). Hybrid Key Exchange/Signature/Dual Cert/Hybrid TLS/JWT는 **순신설**, PQC 라이브러리·§5 PQC Manager 선행. BLOCKED_PREREQUISITE · NOT_CERTIFIED.
