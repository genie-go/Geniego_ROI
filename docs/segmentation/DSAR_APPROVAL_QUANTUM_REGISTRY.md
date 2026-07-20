# DSAR — Authorization Quantum Readiness Registry (Part 3-23 §1·§2)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC) — Approval Quantum Readiness Registry

**APPROVAL_QUANTUM_REGISTRY**는 인가(Authorization) 도메인이 의존하는 모든 암호 자산의 **양자 내성(quantum readiness) 상태를 단일 소스로 집계·추적**하는 중앙 레지스트리다. 목적은 "Harvest-Now-Decrypt-Later(HNDL)" 위협 하에서 인가 신뢰근(root-of-trust)의 노출 표면을 정량화하고, PQC 마이그레이션 우선순위를 산출하는 것이다.

레지스트리 엔트리(개념 계약):
- `asset_ref` — 카탈로그된 Crypto Asset(§CRYPTO_ASSET) 참조.
- `algorithm_ref` — 사용 알고리즘(§CRYPTO_ALGORITHM) 참조.
- `key_ref` — 관리 Key(§CRYPTO_KEY) 참조.
- `readiness` — `QUANTUM_SAFE` / `QUANTUM_VULNERABLE` / `HYBRID` / `UNKNOWN`.
- `hndl_exposure` — 장기 기밀성 요구(년) × 현재 알고리즘 취약도.
- `migration_priority` — Criticality × Exposure로 파생(임의값 금지·자동산출).
- `agility_state` — 알고리즘 교체 가능성(pluggable/hardcoded).

## 2. 실존 substrate 매핑

| 계약 요소 | 상태 | 근거(허용목록) |
|---|---|---|
| 인가가 의존하는 고전 crypto 자산 자체 | PRESENT(SOURCE) | AES-256-GCM `backend/src/Crypto.php:108-126` · RSA 서명 `backend/src/Handlers/EnterpriseAuth.php:536`·`:600` · SHA-256 `backend/src/SecurityAudit.php:27` · api_key `backend/src/Handlers/Keys.php:40` |
| 중앙 Readiness Registry(집계 테이블/엔진) | **ABSENT** | grep 0 — 순신설(greenfield) |
| readiness/hndl_exposure/migration_priority 필드 | ABSENT | 스키마·산출 로직 부재 |
| agility_state(알고리즘 pluggability 추적) | ABSENT | crypto agility 계층 부재 |
| PQC 라이브러리(레지스트리가 참조할 quantum-safe 후보) | ABSENT | `backend/composer.json:5-13` PQC 의존성 없음 |

고전 crypto 자산은 실재·풍부하나(인가는 `backend/public/index.php:430`·`:506` 및 `backend/src/routes.php:931` 경로에서 이들 신뢰근에 의존), **양자 내성 상태를 알고·추적·우선순위화하는 레지스트리 계층은 전무**하다.

## 3. 설계 계약(규칙)

1. **단일 SSOT**: Readiness는 자산별 1행. Asset/Algorithm/Key 레지스트리(§2~§4·§7)를 참조만 하고 crypto 원본을 재정의하지 않는다(무중복).
2. **자동산출**: `migration_priority`·`hndl_exposure`는 Criticality/Expiration에서 파생 — 하드코딩 순위 금지.
3. **Fail-secure 기본값**: 미분류 자산 `readiness=UNKNOWN`은 `QUANTUM_VULNERABLE`로 보수 처리(HNDL 가정).
4. **무후퇴**: 고전 자산 카탈로그 값 변경 시 Readiness 파생값 실시간 재동기화.
5. **NOT_CERTIFIED 게이트**: 레지스트리는 상태 보고만 — 알고리즘 교체·집행 권한 없음(집행은 별도 승인세션).

## 4. KEEP_SEPARATE

- api_key **RBAC/역할 판정 로직**(`backend/src/Handlers/Keys.php:88-96`·`:99-113`)은 인가 정책이지 crypto-asset readiness가 아니다 — 레지스트리 대상 제외.
- 비즈니스 key(app_setting/channel_credential 식별자)는 §CRYPTO_KEY의 KEEP_SEPARATE와 동일하게 제외.

## 5. 판정

**NOT_CERTIFIED · ABSENT(순신설)**. 인가 의존 crypto 자산은 SOURCE로 실재하나 Quantum Readiness Registry는 grep 0(greenfield). PQC 후보 라이브러리 부재(`backend/composer.json:5-13`)로 **BLOCKED_PREREQUISITE**. 본 DSAR은 설계 계약만 규정하며 코드 변경 0.
