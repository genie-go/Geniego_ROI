# DSAR — Authorization Crypto Baseline (Part 3-23 §2·§23)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC) — Approval Crypto Baseline

**APPROVAL_CRYPTO_BASELINE**은 인가 도메인의 현행 암호 구성을 **불변 스냅샷(baseline)으로 고정·버전 관리**하여, 이후 양자 마이그레이션의 before/after 비교 기준과 회귀 탐지의 기준선을 제공하는 계약이다. Registry·Risk·Score의 공통 참조 원점(reference origin)이다.

Baseline 구성(개념 계약):
- **Algorithm Inventory** — 인가가 실사용하는 알고리즘·모드·키 길이의 확정 목록.
- **Envelope Format** — 봉투 버전·구조 스냅샷(향후 dual-read 호환 판단 기준).
- **Signature/Certificate** — 서명 알고리즘·검증 경로 스냅샷.
- **Baseline Version** — 스냅샷 식별·비교 앵커. 변경 시 신규 버전(불변).
- **Drift Detection** — baseline 대비 현행 구성 이탈 탐지(무단 알고리즘 변경 경보).

## 2. 실존 substrate 매핑

| 계약 요소 | 상태 | 근거(허용목록) |
|---|---|---|
| Algorithm — AES-256-GCM 봉투암호 | PRESENT(SOURCE·baseline 대상) | `backend/src/Crypto.php:108-126`·`:121` |
| Envelope Format — 봉투 버전 필드 | PRESENT(SOURCE·baseline 앵커) | `backend/src/Crypto.php:84-88` |
| Key Derivation — 봉투 KDF | PRESENT(SOURCE) | `backend/src/Crypto.php:133-148` |
| Signature — RSA 서명 검증 | PRESENT(SOURCE·baseline 대상) | `backend/src/Handlers/EnterpriseAuth.php:600` |
| 무결성 스냅샷 기준 — SHA-256 감사 | PRESENT(SOURCE) | `backend/src/SecurityAudit.php:27` |
| 의존성 baseline — composer | PRESENT(SOURCE) | `backend/composer.json:5-13` |
| **Baseline 스냅샷/버전/Drift 관리 계층** | **ABSENT** | grep 0 — 순신설(greenfield) |

현행 고전 crypto 구성은 실재하나, **이를 불변 baseline으로 스냅샷·버전화·drift 탐지하는 관리 계층은 전무**하다.

## 3. 설계 계약(규칙)

1. **불변 스냅샷**: Baseline은 한 번 확정되면 수정 불가 — 변경은 신규 버전 발행.
2. **단일 원점**: Registry/Risk/Score는 Baseline을 공통 참조 — 각자 crypto 원본 재조사 금지(무중복).
3. **재사용**: Envelope Format 앵커는 봉투 버전 필드(`Crypto.php:84-88`)를 확장 — 신규 포맷 관리 난립 금지.
4. **Drift Fail-secure**: baseline 이탈(무단 알고리즘 변경) 탐지 시 경보·감사 기록(`SecurityAudit.php:27`).
5. **NOT_CERTIFIED 게이트**: Baseline은 스냅샷·비교만 — 알고리즘 변경 집행 권한 없음(별도 승인세션).

## 4. KEEP_SEPARATE

- **ML drift 탐지**(`backend/src/ModelMonitor.php:42-43`)는 모델 성능 baseline이지 crypto baseline이 아니다 — 본 계약과 명명 충돌 회피·대상 제외.
- 마케팅 알고리즘·PgSettlement 정산 구성은 crypto baseline과 무관 — 제외.

## 5. 판정

**NOT_CERTIFIED · ABSENT(순신설)**. baseline 스냅샷 대상인 현행 고전 crypto(AES `Crypto.php:121`·RSA `EnterpriseAuth.php:600`·봉투 버전 `Crypto.php:84-88`)는 SOURCE로 실재하나, Crypto Baseline 관리 계층은 grep 0(greenfield)·baseline 관리 없음. PQC 의존성 부재(`composer.json:5-13`)로 **BLOCKED_PREREQUISITE**. 본 DSAR은 설계 계약만 규정하며 코드 변경 0.
