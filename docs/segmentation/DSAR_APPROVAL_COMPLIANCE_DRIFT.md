# DSAR — Approval Compliance Drift (Part 3-17 §23)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §23)

APPROVAL_COMPLIANCE_DRIFT은 두 시점의 스냅샷을 비교(Reconciliation §26)하여 **컴플라이언스 자세의 이탈**을 탐지한다. Drift 차원은 5종이다.

- **Regulatory Drift**: 적용 규제 요구의 변경으로 인한 준수 격차.
- **Policy Drift**: 정책 버전 변경 대비 실제 적용 이탈.
- **Control Drift**: 통제 구현 상태의 후퇴(구현→부분/미구현).
- **Evidence Drift**: 증거 완결도의 저하(수집→누락/만료).
- **Compliance Score Drift**: 위 차원이 합성된 점수의 하락 폭.

Drift는 방향(개선/후퇴)·크기·차원별 원인을 제시하며, 후퇴 이탈은 경보 대상이다. Drift는 **비교 기반 판정 계층**으로 스냅샷을 변형하지 않는다.

## 2. Substrate 매핑

| SPEC 차원 | 현행 substrate | file:line | 상태 |
|---|---|---|---|
| 비교 baseline(스냅샷) | 시점 봉인 레코드 | — | ABSENT(§19 선행) |
| Score 비교 원천 | flat readiness 필드 | `Compliance.php:115-120` | PARTIAL(단건·비교 없음) |
| 이탈 이벤트 원천 | audit 이벤트 통합 | `Compliance.php:143-190` | PARTIAL |
| Regulatory/Policy/Control/Evidence Drift | compliance drift 탐지 | — | **ABSENT** |
| 무결 비교(봉인 대조) | 해시체인 | `SecurityAudit.php:14-68` | 확장(무결성 대조) |

compliance drift 의미의 grep 결과 0 — 두 시점 자세를 대조해 이탈을 판정하는 계층이 부재하다. 현행은 flat readiness 단건(`Compliance.php:115-120`)만 있어 "시점 간 비교" 자체가 불가능하다.

## 3. 설계 계약

1. **비교 입력**: Drift는 §19 Snapshot 두 시점(baseline·current)을 Reconciliation(§26) 규칙으로 대조한다. 스냅샷 무결성은 `SecurityAudit.php:14-68` 체인 검증으로 보증한 뒤에만 비교한다.
2. **5차원 산출**: Regulatory·Policy·Control·Evidence·Compliance Score Drift를 각각 방향·크기로 산출한다. Score Drift는 §22 Analytics 지표를 재사용한다(재산출 금지).
3. **후퇴 경보**: 후퇴 방향 이탈은 audit 이벤트(`Compliance.php:143-190`)로 기록하고 상위 거버넌스에 경보한다.
4. **무변형**: baseline·current 스냅샷은 읽기 전용.

## 4. KEEP_SEPARATE

- ★`ModelMonitor.php`(ML 모델 drift)는 compliance drift가 아니다 — 모델 성능/데이터 분포 이탈 전용.
- ★`AnomalyDetection.php:2-6`(SPC·통계 이상탐지)도 compliance drift가 아니다 — 통계적 이상치 탐지이지 규제·통제 자세 이탈 판정이 아니다.
- 두 엔진에 compliance drift를 병합 금지 — 의미론이 다르며 오귀속을 유발한다.

## 5. 판정

**ABSENT** — compliance drift(규제·정책·통제·증거·점수 이탈 탐지) 부재(grep 0). §19 Snapshot 두 시점을 Reconciliation(§26)으로 비교하는 **순신설** 판정 계층이며 Score Drift는 §22 재사용. KEEP_SEPARATE: `ModelMonitor.php`(ML drift)·`AnomalyDetection.php:2-6`(SPC). NOT_CERTIFIED · BLOCKED_PREREQUISITE(§19·§22 선행).
