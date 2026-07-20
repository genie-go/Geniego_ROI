# DSAR — APPROVAL_EFFECTIVE_RISK (EPIC 06-A-03-02-03-04 Part 3-7 · per-entity · SPEC §12)

- **상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · BLOCKED_PREREQUISITE · 289차 후속 (2026-07-20)
- **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §12
- **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
- **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
- **판정**: **ABSENT** — role 입력 위험등급 계산기 grep 0(Ground-Truth ② #7). `Risk.php`는 churn ML(KEEP_SEPARATE)
- **불변**: 반날조(모든 `file:line`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만) · **KEEP_SEPARATE 오흡수 절대금지(가짜녹색 회피)**

---

## 1. 목적

SPEC §12 Effective Risk Calculator가 산출하는 **결과 엔티티** APPROVAL_EFFECTIVE_RISK를 정의한다. 평가 요소(SPEC §12 원문): **Identity Risk · Session Risk · Device Risk · Network Risk · Behavior Risk · Role Criticality · Permission Criticality · Scope Criticality**. 출력: **LOW · MEDIUM · HIGH · CRITICAL**.

이 엔티티는 Resolution Pipeline(SPEC §4) 10단계 "Risk Projection" 산출물이며, Effective Deny(별편)의 Risk Deny 입력과 런타임 projection(SPEC §27 "Effective Risk Level")의 근거가 된다.

**Ground-Truth 요지**(② #7·§4): **role을 입력으로 LOW/MED/HIGH/CRIT 위험등급을 산출하는 계산기는 grep 0으로 ABSENT다.** 이름이 유사한 `Risk.php`는 **churn(이탈) ML 예측**으로 role 입력이 아니며 KEEP_SEPARATE 대상이다. 본 엔티티는 순신규 그린필드다.

## 2. Ground-Truth 현황

### 2.1 실존 substrate — 없음 (ABSENT)

| SPEC §12 평가 요소 | substrate | 판정 |
|---|---|---|
| Identity / Session / Device / Network / Behavior Risk | 없음 — 인증 주체 risk-score 계산 grep 0 | **ABSENT** |
| Role / Permission / Scope Criticality | 없음 — role→criticality 매핑 grep 0 | **ABSENT** |
| LOW/MED/HIGH/CRIT 출력 등급 | 없음 — role 입력 위험등급 계산기 0 | **ABSENT** |

**MFA 정적 게이트는 risk 아님**(Ground-Truth ② #8·§4): `UserAuth.php:941`~`:972`(`mfa_policy` off/admin/all)는 정적 게이트로 **risk-score가 없다**. 이를 Effective Risk substrate로 오판 금지 — 정적 인증수준 constraint(별편 EFFECTIVE_CONSTRAINT 소관)이지 위험등급 산출이 아니다.

### 2.2 KEEP_SEPARATE (오흡수 절대금지 · 가짜녹색 회피)

Ground-Truth ② §4·ADR D-5 명시 — 이름만 유사하고 **role 위험등급 산출이 아닌** 근접물:

| 근접물 | file:line | 실체 | 오흡수 금지 사유 |
|---|---|---|---|
| `Risk.php` | `:12` · `:81` · `:91` | churn/policy **ML 예측**(probability·drivers) | **role 입력 아님** — 고객 이탈 예측 ML |
| `ModelMonitor` | — | model drift 감시 | ML 모니터링, role risk 아님 |
| `AnomalyDetection.php` | — | 이상탐지(마케팅/커머스) | 권한 risk 아님 |
| `Decisioning.php` · `Alerting.php`(`:665`) | — | 마케팅 의사결정·알림 | 권한 risk 아님 |

★ADR D-5 핵심: `Risk.php`(churn ML)를 Effective Risk Calculator로 개명·통합·흡수하면 **가짜녹색**이다. ERRE Risk는 role/permission/scope criticality + identity/session/device/network/behavior risk를 입력으로 하는 **완전 순신규 계층**이며, churn ML과 무관하다.

## 3. Canonical 설계

APPROVAL_EFFECTIVE_RISK 엔티티 canonical 필드(SPEC §12):

| # | 필드 | 의미 |
|---|---|---|
| 1 | effective_risk_id | 산출 결과 식별자 |
| 2 | subject_ref | 대상 주체 |
| 3 | risk_factors{} | 8요소(Identity..Scope Criticality) × 점수 |
| 4 | risk_level | LOW / MEDIUM / HIGH / CRITICAL |
| 5 | contributing[] | 등급 결정 기여 요소 근거(Explainable) |
| 6 | resolution_version | 불변 버전 바인딩 |

**Risk 산출 알고리즘**(SPEC §12): 8평가 요소를 가중 결합해 4단계 등급 출력. Role/Permission/Scope Criticality는 Effective Role/Permission/Scope(별편) 산출 결과를 입력으로, Identity/Session/Device/Network/Behavior Risk는 Resolution Context(SPEC §6)를 입력으로 삼는다. 전부 순신규 설계 — 재사용 substrate 없음.

## 4. Resolution Kernel 매핑

| SPEC §4 Pipeline 단계 | 본 엔티티 기여 | substrate |
|---|---|---|
| **10. Risk Projection** | **risk_level 산출** | ABSENT (순신규) |
| 9. Explicit Deny Projection | Risk Deny 입력 제공 | 별편 EFFECTIVE_DENY(Risk Deny도 ABSENT) |
| 12. Policy Evaluation | risk 기반 정책 판정 | ABSENT |

Runtime Guard(SPEC §28)는 CRITICAL risk 시 차단 참조. Resolution Context(SPEC §6)의 Authentication Level·Device·IP·Geo가 입력.

## 5. 무후퇴 · Extend

- **순신규(Extend 대상 없음)**: substrate가 전무하므로 승격할 기존 코드 없음. 완전 그린필드 신설.
- **KEEP_SEPARATE 절대 보존**(ADR D-5): `Risk.php` churn ML·`ModelMonitor`·`AnomalyDetection`을 ERRE Risk로 흡수·개명 금지. 이들은 별도 마케팅/ML 도메인으로 무후퇴 유지.
- **부재 과장 회피 반대 방향**(ADR D-7): risk 계산기 grep 0은 "숨겨진 구현"이 아닌 실측 부재. MFA 정적 게이트를 risk로 부풀리지 않음.
- **무후퇴**: 기존 MFA 정적 게이트(`UserAuth.php:941`)는 constraint 계층으로 유지 — risk 도입 후에도 병행.

## 6. 완료게이트 기여

SPEC §37 중 기여 항목:
- Effective Risk Calculator는 SPEC §37 Completion Gate 개별 항목에 명시되지 않으나 "Resolution Engine 구축"의 Risk Projection 단계(SPEC §4 10단계)를 완성한다.
- Explain Engine(SPEC §17 "어떤 Rule 때문인가")의 risk 근거 입력.
- 실 구현은 선행 foundation 인증 후 별도 승인 세션(RP-track). 본 편 코드 0·NOT_CERTIFIED.

## 7. 반날조 인용 출처

- ABSENT 판정 근거: Ground-Truth ② #7(role 입력 위험등급 계산기 grep 0)·§4
- MFA 정적 게이트(risk 아님): `UserAuth.php:941`~`:972`(Ground-Truth ② #8·§4)
- KEEP_SEPARATE: `Risk.php:12` · `:81` · `:91` · `ModelMonitor` · `AnomalyDetection.php` · `Decisioning.php` · `Alerting.php:665`(Ground-Truth ② §4·ADR D-5)

실코드 파일 미열람 — 정본 4문서가 유일 근거. NOT_CERTIFIED · 코드 변경 0.
