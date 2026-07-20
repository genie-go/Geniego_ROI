# DSAR — Authorization Twin Drift Detection (Part 3-22 §22)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC)

APPROVAL_TWIN_DRIFT는 **인가 디지털 트윈(Authorization Digital Twin)**이 표상하는 정책·역할·런타임 결정 상태와, 실제 프로덕션 인가 substrate 사이의 **의미적 괴리(divergence)**를 탐지·측정·분류하는 계약이다. 트윈은 프로덕션 인가 결정의 그림자 복제본이며, Drift는 그 복제본이 원본과 어긋나기 시작한 순간을 정량화한다.

계약이 규정하는 Drift 5종:
- **Twin Drift** — 트윈 모델 자체가 프로덕션 정책 그래프와 구조적으로 어긋남.
- **Runtime Drift** — 동일 principal·resource·context 입력에 대해 트윈 예측 결정과 프로덕션 실결정(allow/deny)이 불일치.
- **Prediction Drift** — 예측 governance 신뢰구간이 관측 실측 분포에서 이탈.
- **Model Drift** — 트윈을 구동하는 규칙/특징 집합이 최신 정책 버전을 반영하지 못함.
- **Synchronization Drift** — 트윈 갱신 지연(lag)으로 인한 시점 불일치.

각 Drift는 (drift_type, magnitude, first_observed, evidence_ref, severity)로 기록되어야 하며, 임계 초과 시 §23 Revalidation을 트리거하고 §24 Reconciliation의 입력이 된다.

## 2. Substrate 매핑

| SPEC 계약 요소 | 현행 substrate | 상태 |
|---|---|---|
| 인가 결정 이벤트 원천(트윈이 관측할 원본 스트림) | `SecurityAudit.php:27` append-only 이벤트 기록 | 존재(원천만) |
| Drift 판정을 봉인할 무결성 기반 | `SecurityAudit.php:56-67` 해시체인 | 존재(봉인 substrate) |
| Twin 상태 모델(shadow replica) | — | **ABSENT (grep 0)** |
| Runtime/Prediction/Model/Sync drift 측정기 | — | **ABSENT (grep 0)** |
| drift_type·magnitude 스키마·저장 | — | **ABSENT (grep 0)** |

## 3. 설계 계약

- **관측(Observe)**: 트윈은 `SecurityAudit.php:27`이 남기는 인가 이벤트를 유일 원천으로 삼아 프로덕션 결정 스트림을 재구성한다. 별도 결정 로그를 신설하지 않는다(중복 인텔리전스 금지).
- **비교(Compare)**: 재구성된 프로덕션 결정 벡터와 트윈 예측 벡터를 principal×resource×context 축에서 대조, 불일치율을 Runtime Drift magnitude로 산출.
- **분류(Classify)**: 괴리를 5종 Drift로 라우팅. 구조 괴리→Twin, 결정 괴리→Runtime, 신뢰구간 이탈→Prediction, 규칙 노후→Model, 시점 지연→Synchronization.
- **봉인(Seal)**: 확정된 Drift 레코드는 `SecurityAudit.php:56-67` 해시체인에 append하여 tamper-evident. Drift 판정 자체가 감사 대상.
- **연쇄(Chain)**: 임계 초과 Drift는 §24 Reconciliation을 기반 절차로 호출(본 §22는 탐지, §24는 정합 복구).

## 4. KEEP_SEPARATE

- **ML 모델 드리프트**(`ModelMonitor.php:18-19`·`:42-43`·`:201-337`) — 예측 모델 성능/특징 분포 감시. authz twin의 **정책 결정 괴리**와 도메인이 다르다. 재사용·통합 금지.
- **통계적 공정관리(SPC)**(`AnomalyDetection.php:3`) — 시계열 이상치 탐지. 인가 결정 정합이 아닌 신호 이상 탐지. authz twin drift 아님.
- 위 두 엔진은 알고리즘적으로 유사해 보이나 관측 대상(모델 정확도·신호 분포 vs. 인가 결정 정합)이 상이하여 흡수하면 의미 오염. 별개 유지.

## 5. 판정

**ABSENT (twin drift grep 0)** · BLOCKED_PREREQUISITE. Twin 상태 모델·Drift 측정기·drift 스키마 전부 부재. 원천(`SecurityAudit.php:27`)과 봉인(`SecurityAudit.php:56-67`)만 존재하며 이는 트윈이 아니다. 순신설이 요구되며, §23 Revalidation·§24 Reconciliation 선행 부재로 실구현 착수 불가. 코드 변경 0 · NOT_CERTIFIED.
