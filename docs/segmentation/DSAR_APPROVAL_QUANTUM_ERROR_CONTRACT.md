# DSAR — Authorization Quantum-Ready Error Contract (Part 3-23 §26)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

Error Contract(§26)는 Runtime Guard(§24)·Static Lint(§25)·API(§28)가 **차단(deny)** 결정을 내릴 때 반환하는 정규 오류 코드 7종을 정의한다. 오류는 하드-실패(fail-closed) 신호이며 호출자는 연산을 중단해야 한다: `PQC_PROFILE_INVALID`(PQC 프로필 무효), `CRYPTO_POLICY_VIOLATION`(암호 정책 위반), `WEAK_ALGORITHM_DETECTED`(취약 알고리즘 탐지), `CERTIFICATE_CHAIN_INVALID`(인증서 체인 무효), `KEY_ROTATION_FAILED`(키 회전 실패), `MIGRATION_PLAN_INVALID`(마이그레이션 계획 무효), `QUANTUM_RISK_CRITICAL`(양자위험 임계). 각 코드는 stable 식별자·HTTP 매핑·감사 사유로 사용되며 tenant scope로 격리된다.

## 2. Substrate 매핑

| 오류 코드 | 발생원(설계상) | 근접 substrate | 인용 | 판정 |
|---|---|---|---|---|
| `WEAK_ALGORITHM_DETECTED` | §24 가드 / §25 린트 | 약한해시 산재 | `CRM.php:589` | 발생원 부재 |
| `CERTIFICATE_CHAIN_INVALID` | §24 가드 / §28 validate | SAML 서명검증 | `EnterpriseAuth.php:600` | 근접·PQC미인지 |
| `CRYPTO_POLICY_VIOLATION` | §24 가드 | 산재 crypto | `Crypto.php:108-126` | 발생원 부재 |
| `KEY_ROTATION_FAILED` | §28 rotate | KEK 파생 | `Crypto.php:133-148` | 발생원 부재 |
| `PQC_PROFILE_INVALID`·`MIGRATION_PLAN_INVALID`·`QUANTUM_RISK_CRITICAL` | §28 API | (없음) | — | ABSENT-greenfield |

7종 오류 코드·발생원·throw 지점 모두 grep 0 — 코드 전무.

## 3. 설계 계약

- **정규화**: 7종은 단일 enum으로 선언. ad-hoc 문자열 오류 금지 — 모든 crypto deny는 이 목록으로 환원.
- **HTTP 매핑**: 정책 위반군(`PQC_PROFILE_INVALID`·`CRYPTO_POLICY_VIOLATION`·`WEAK_ALGORITHM_DETECTED`)=403, 검증 실패군(`CERTIFICATE_CHAIN_INVALID`)=422, 운영 실패군(`KEY_ROTATION_FAILED`·`MIGRATION_PLAN_INVALID`)=409, 위험 임계(`QUANTUM_RISK_CRITICAL`)=423(잠금).
- **근접 재사용**: `CERTIFICATE_CHAIN_INVALID`는 기존 SAML assertion 검증(`EnterpriseAuth.php:600`) 실패 경로에 매핑 가능 — 그 실패를 PQC 인지 오류로 승격(비파괴).
- **fail-closed 일관성**: 오류 반환 시 부분 성공 없음. 연산 롤백·audit 기록 후 종료.
- **감사**: 오류 발생을 `SecurityAudit.php:27` append(`:56-68` verify)로 사유 코드와 함께 기록.
- **격리**: 오류 payload에 tenant 경계 넘는 crypto 세부 노출 금지(자격증명 평문노출 회피 준수).

## 4. KEEP_SEPARATE

해당 없음.

## 5. 판정

**ABSENT(7종 신규 에러코드·발생원 부재)** — `CERTIFICATE_CHAIN_INVALID`만 SAML verify(`EnterpriseAuth.php:600`) 실패 경로가 근접 매핑 후보로 실재하고, 나머지 6종은 발생원 substrate조차 없다. 순신설. BLOCKED_PREREQUISITE(가드/린트/API 미구현·PQC 라이브러리 부재 `composer.json:5-13`). 코드 변경 0.
