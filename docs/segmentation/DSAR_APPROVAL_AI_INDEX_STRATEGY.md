# DSAR — Authorization AI Governance: 인덱스 전략 (Part 3-15 §34)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §34는 authz AI 거버넌스 조회 성능을 위해 6개 인덱스 축을 요구한다.

| 인덱스 | SPEC 근거 | 조회 대상 |
|---|---|---|
| Model | §34 · §2 | 모델·버전 조회(is_deployed·model_version) |
| Feature | §34 · §4 | Feature Store 10종 피처 조회 |
| Recommendation | §34 · §5~9 | Policy/Role/Permission/Scope/Assignment 추천 |
| Prediction | §34 · §12~14 | Risk/Threat/Compliance 예측 |
| Confidence | §34 · §18 | Confidence Score 0~100·등급 필터 |
| Snapshot | §34 · §22 | Model/Feature Version·Timestamp 스냅샷 |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 인덱스 축 | 판정 | 근거(파일:라인) |
|---|---|---|
| Model | **PARTIAL(패턴)** | 배포모델 조회 is_deployed=1 `Risk.php:81`·`:118`·model_version 스탬핑 `Risk.php:149-152`·`:175`·`Db.php:463` — **마케팅 fraud** 도메인·authz model 전용 인덱스 ABSENT |
| Feature | **ABSENT** | authz feature store/feature view 전무. `DataPlatform.php:231-346`은 데이터 카탈로그(ML feature store 아님·소비=마케팅) GT② §2 |
| Recommendation | **ABSENT** | authz AI 추천 저장·인덱스 전무. proto=`AccessReview.php:87-122`(결정론적·저장 인덱스 아님) |
| Prediction | **PARTIAL(패턴)** | risk_prediction 스탬핑 `Risk.php:91`·`Db.php:463` — 마케팅 fraud. authz risk/threat/compliance 예측 저장 ABSENT |
| Confidence | **ABSENT** | authz 추천 confidence 저장·인덱스 전무(GT② §2 XAI/Confidence ABSENT) |
| Snapshot | **PARTIAL(근접)** | SecurityAudit 시계열 기록 `AccessReview.php:225`·drift report `ModelMonitor.php:244-291`(마케팅). authz snapshot 전용 인덱스 ABSENT |

## 3. 설계 계약 (항목·기준 — SPEC 근거)

- **Model 인덱스**: `(tenant, model_name, model_version, is_deployed)` — `Risk.php:81`·`:118` 배포모델 조회 패턴을 authz 모델로 재배선. 불변 model store(§33) 기반.
- **Feature 인덱스**: Feature Store(§4 Identity/Role/Permission/Resource/Session/Device/Risk/Context/Behavioral/Temporal 10종) 조회축. `DataPlatform.php:23-70` quality 게이트 참고(소비 authz 재배선).
- **Recommendation 인덱스**: `(tenant, target_type, status, confidence)` — Policy/Role/Permission/Scope/Assignment 추천(§5~9)·acceptance rate(§25) 집계.
- **Prediction 인덱스**: `(tenant, forecast_type, horizon, model_version)` — Risk/Threat/Compliance(§12~14)·prediction latency(§25) 조회.
- **Confidence 인덱스**: Confidence Score 0~100 범위·Human Review Required 등급(§18) 필터·Human Approval Gateway(§19) 라우팅.
- **Snapshot 인덱스**: `(tenant, model_version, feature_version, timestamp)` — Snapshot(§22)·Evidence(§23) 링크·drift(§26) 시계열.

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE**: `Risk.php:81`·`:91`·`:149-152`·`:175`·`Db.php:463` 인덱스 패턴은 **마케팅 공급망 fraud**(GT② §4 B-3). `ModelMonitor.php:244-291` drift 인덱스=마케팅 모델. 인덱스 **설계 패턴만** 참조·마케팅 인덱스 재사용/개명 금지.
- **선행의존**: §33 DB Constraint(불변 model/dataset store) 신설이 선행. Part 1~3-14 인증 후 실 구현.

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

**NOT_CERTIFIED · 코드 변경 0.** authz AI Model/Feature/Recommendation/Prediction/Confidence/Snapshot 전용 인덱스 = **ABSENT**(GT②). 유일 근접은 마케팅 fraud 레지스트리 조회 패턴(`Risk.php:81-175`·`Db.php:463`)·drift(`ModelMonitor.php:244-291`)이며 authz 데이터로 **재배선(패턴 참조)** 대상일 뿐 흡수 금지. 6축 인덱스 실 구축·성능 검증(§35 정합)은 RP-track 실구현 세션 조건이며 §33 불변 store 신설·Part 1~3-14 인증에 선행 의존한다.
