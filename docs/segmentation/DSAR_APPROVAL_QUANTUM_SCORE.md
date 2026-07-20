# DSAR — Authorization Quantum Readiness Score (Part 3-23 §13)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC) — Approval Quantum Readiness Score

**APPROVAL_QUANTUM_SCORE**는 인가 도메인의 양자 내성 성숙도를 **0–100 단일 지표로 집계**하는 계약이다. Registry(§1)·Risk(§9)·Migration(§10)의 입력을 가중합하여 조직이 Q-day 대비 어디에 있는지를 한 눈에 보고한다.

점수 구성(개념 계약·각 0–100 부분점수의 가중 집계):
- **Algorithm Readiness** — 사용 알고리즘 중 양자 안전(또는 hybrid) 비중.
- **Key Readiness** — 키 길이·수명·회전 정책의 양자 대비 적정성.
- **Certificate Readiness** — 서명 체인·인증서의 PQC 대응 여부.
- **Dependency Readiness** — 라이브러리/의존성의 crypto agility·PQC 지원.
- **Migration Readiness** — 전환 계획 진척도(§10)와 dual-read 준비.

## 2. 실존 substrate 매핑

| 계약 요소 | 상태 | 근거(허용목록) |
|---|---|---|
| Algorithm 채점 대상 — AES 봉투 | PRESENT(SOURCE) | `backend/src/Crypto.php:121`·`:133-148` |
| Certificate/Signature 채점 대상 — RSA 서명 | PRESENT(SOURCE) | `backend/src/Handlers/EnterpriseAuth.php:536`·`:600` |
| 무결성 기준선 — SHA-256 감사 체인 | PRESENT(SOURCE) | `backend/src/SecurityAudit.php:27`·`:56-68` |
| Dependency 채점 대상 — composer 의존성 | PRESENT(SOURCE) | `backend/composer.json:5-13` (PQC 없음) |
| **Quantum Readiness Score 산출 엔진** | **ABSENT** | grep 0 — 순신설(greenfield) |
| Algorithm/Key/Certificate/Dependency/Migration 부분점수 | ABSENT | 채점 로직·스키마 부재 |

채점 대상인 고전 crypto 자산·의존성은 실재하나, **이를 0–100으로 집계·보고하는 Score 계층은 전무**하다.

## 3. 설계 계약(규칙)

1. **자동산출**: 총점은 부분점수 가중합으로만 파생 — 임의 점수·목표치 하드코딩 금지.
2. **무중복**: 부분점수 입력은 Registry/Risk/Migration DSAR을 참조 — 원본 재정의 금지.
3. **Fail-secure 채점**: 미분류·`UNKNOWN` 자산은 최저 점수로 보수 반영(관대 채점 금지).
4. **약한 해시 감점**: SHA-1·MD5 사용은 Algorithm Readiness 강제 감점(양자 이전에도 취약).
5. **NOT_CERTIFIED 게이트**: Score는 보고 지표만 — 점수 기반 자동 차단/집행 없음(별도 승인세션).
6. **결정론**: 동일 입력→동일 점수(재현 가능). 감사 체인(`SecurityAudit.php:56-68`)에 스냅샷 기록.

## 4. KEEP_SEPARATE

- ML 모델 성능 점수·drift 지표(`backend/src/ModelMonitor.php:42-43`)는 통계 지표이지 quantum readiness가 아니다 — 제외.
- 마케팅 추천 신뢰도·PgSettlement 정산 점수는 crypto 성숙도와 무관 — 제외.

## 5. 판정

**NOT_CERTIFIED · ABSENT(순신설)**. 채점 대상 고전 crypto(AES `Crypto.php:121`·RSA `EnterpriseAuth.php:536`·감사 SHA-256 `SecurityAudit.php:27`)와 의존성(`composer.json:5-13`)은 SOURCE로 실재하나, Quantum Readiness Score 엔진은 grep 0(greenfield). PQC 지원 의존성 부재로 **BLOCKED_PREREQUISITE**. 본 DSAR은 설계 계약만 규정하며 코드 변경 0.
