# DSAR — Approval Compliance Analytics (Part 3-17 §22)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §22)

APPROVAL_COMPLIANCE_ANALYTICS는 시점 스냅샷들을 시계열·집계로 환원해 **컴플라이언스 운영 지표**를 산출한다. 지표는 6종이다.

- **Score Trend**: Compliance Score의 시계열 추이.
- **Open·Closed Findings**: 미해결/해결된 지적 건수와 비율.
- **Control Coverage**: 전체 통제 대비 구현·검증된 통제 비율.
- **Evidence Completeness**: 요구 증거 대비 수집 완결도.
- **Audit Readiness**: 감사 대응 준비도(위 지표의 합성 판정).
- **Mean Remediation Time**: 지적 발생→해소까지 평균 소요.

Analytics는 스냅샷(§19)·이벤트(audit)를 입력으로 하는 **집계 전용 계층**이며, Digest(§21)·Drift(§23)에 지표를 공급한다.

## 2. Substrate 매핑

| SPEC 지표 | 현행 substrate | file:line | 상태 |
|---|---|---|---|
| Score(단건 원천) | flat readiness 필드 | `Compliance.php:115-120` | PARTIAL(단건·시계열 아님) |
| 자세 산출 | readiness 산출 | `Compliance.php:53-130` | PARTIAL |
| Findings/Evidence 원천 | audit 이벤트 통합 | `Compliance.php:143-190` | PARTIAL(집계 없음) |
| Score Trend/Coverage/… 집계 | compliance 지표 집계 | — | **ABSENT** |
| Mean Remediation Time | remediation 시계열 | — | **ABSENT** |

현행 `Compliance.php:115-120`은 요청 시점의 flat readiness 단건만 반환한다. Score Trend·Coverage·Completeness·Remediation Time 등 시계열/집계 지표는 grep 0 — compliance 지표 집계 계층이 부재하다.

## 3. 설계 계약

1. **입력**: Analytics는 §19 Snapshot 시계열과 audit 이벤트(`Compliance.php:143-190`)를 **읽기 전용**으로 집계한다. 단건 Score는 `Compliance.php:115-120`을 원천으로 재사용한다(재구현 금지).
2. **6지표 산출**: Score Trend·Open/Closed·Control Coverage·Evidence Completeness·Audit Readiness·Mean Remediation Time을 계산한다. 모든 지표는 스냅샷 baseline에 대해 결정적(deterministic)이어야 한다.
3. **SSOT 공급**: 산출 지표는 Digest(§21)·Drift(§23)가 재사용하며 각 소비자가 재산출하지 않는다.
4. **무변형**: 입력 스냅샷·이벤트는 수정하지 않는다.

## 4. KEEP_SEPARATE

- ★`AttributionEngine.php`(마케팅 귀속/성과 분석)와 완전 분리 — compliance analytics는 통제·증거·지적 집계 전용이며 마케팅 지표 엔진에 병합 금지.
- `ModelMonitor.php`(ML 성능)·`AnomalyDetection.php:4-6`(통계 이상탐지)는 compliance 지표가 아니다.

## 5. 판정

**ABSENT** — compliance 지표 집계(Score Trend·Coverage·Completeness·Readiness·Remediation Time) 부재. 현행은 flat readiness 단건(`Compliance.php:115-120`)만 존재. §19 스냅샷 시계열을 입력으로 하는 **순신설** 집계 계층. KEEP_SEPARATE: `AttributionEngine.php`. NOT_CERTIFIED · BLOCKED_PREREQUISITE(§19 선행).
