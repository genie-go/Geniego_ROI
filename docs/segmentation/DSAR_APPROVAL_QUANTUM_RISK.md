# DSAR — Authorization Quantum Risk Assessment (Part 3-23 §9)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC) — Approval Quantum Risk Assessment

**APPROVAL_QUANTUM_RISK**는 인가(Authorization) 도메인이 의존하는 암호 자산이 양자 컴퓨팅 위협(Shor/Grover) 아래에서 노출되는 위험을 **정량 평가·등급화**하는 계약이다. 인가 신뢰근(서명·봉투암호·토큰·해시)이 "지금 수집되어 훗날 복호"되는 Harvest-Now-Decrypt-Later(HNDL) 시나리오에서 얼마나 취약한지를 산출한다.

평가 차원(개념 계약):
- **Harvest-Now-Decrypt-Later Exposure** — 장기 기밀성 요구(년) × 현재 알고리즘 취약도. RSA/AES로 보호되는 인가 자산이 채집 시 후일 복호 가능성.
- **Weak Algorithm Exposure** — SHA-1/MD5 등 이미 고전적으로도 약한 알고리즘의 위조/충돌 위험(Grover가 이를 가속).
- **Legacy Dependency** — 교체 불가능하게 하드코딩된 알고리즘 의존.
- **Long-Term Confidentiality** — 자산별 기밀 유지 기간과 양자 도래 시점(Q-day) 교차.
- **Migration Readiness** — 위험 완화까지의 거리(crypto agility 부재 시 최대).

## 2. 실존 substrate 매핑

| 계약 요소 | 상태 | 근거(허용목록) |
|---|---|---|
| HNDL 평가 대상 — 고전 RSA 서명 | PRESENT(SOURCE) | `backend/src/Handlers/EnterpriseAuth.php:536` |
| HNDL 평가 대상 — 고전 AES 봉투암호 | PRESENT(SOURCE) | `backend/src/Crypto.php:108-126` |
| Weak Algorithm — SHA-1 사용 | PRESENT(SOURCE) | `backend/src/Handlers/CRM.php:589` · TOTP `backend/src/Handlers/UserAuth.php:3571` |
| Weak Algorithm — MD5 사용 | PRESENT(SOURCE) | `backend/src/Handlers/OrderHub.php:992` · `backend/src/Handlers/Connectors.php:2399` · `backend/src/Handlers/AdAdapters.php:1561` · CRAM-MD5 `backend/src/Handlers/SmtpClient.php:174` |
| **Quantum Risk Assessment 엔진/등급화** | **ABSENT** | grep 0 — 순신설(greenfield) |
| HNDL/Weak/Legacy/Confidentiality/Readiness 점수 산출 | ABSENT | 위험 평가 로직·스키마 부재 |
| PQC 완화 후보(위험 대비 목표) | ABSENT | `backend/composer.json:5-13` PQC 의존성 없음 |

인가가 의존하는 고전·약한 알고리즘 자산은 실재하나, **그 자산을 양자 위협 관점에서 평가·등급화하는 계층은 전무**하다.

## 3. 설계 계약(규칙)

1. **자동산출**: Exposure/Readiness 점수는 자산 Criticality × 기밀 기간 × 알고리즘 취약도에서 파생 — 임의 등급 하드코딩 금지.
2. **Fail-secure 기본값**: 미분류·`UNKNOWN` 자산은 최고 위험(HNDL 가정)으로 보수 처리.
3. **무중복**: 자산·알고리즘 원본은 Registry(§1·§2)를 참조만 — 위험 평가는 원본을 재정의하지 않는다.
4. **약한 해시 별도 등급**: SHA-1(`CRM.php:589`)·MD5(`OrderHub.php:992`)는 양자 이전에도 이미 취약 → 즉시 위험(Q-day 무관) 별도 표기.
5. **NOT_CERTIFIED 게이트**: 위험 평가는 보고만 — 알고리즘 교체·차단 집행 권한 없음(별도 승인세션).

## 4. KEEP_SEPARATE

- ML drift/모델 성능 평가(`backend/src/ModelMonitor.php:18-19`)는 통계적 drift이지 암호 위험이 아니다 — 본 계약 대상 제외.
- 마케팅 알고리즘·PgSettlement 정산 로직은 crypto risk와 무관 — 제외.

## 5. 판정

**NOT_CERTIFIED · ABSENT(순신설)**. 평가 대상인 고전 RSA(`EnterpriseAuth.php:536`)·약한 해시(SHA-1 `CRM.php:589`·MD5 `OrderHub.php:992`)는 SOURCE로 실재하나, Quantum Risk Assessment 계층은 grep 0(greenfield). PQC 완화 후보 부재(`composer.json:5-13`)로 **BLOCKED_PREREQUISITE**. 본 DSAR은 설계 계약만 규정하며 코드 변경 0.
