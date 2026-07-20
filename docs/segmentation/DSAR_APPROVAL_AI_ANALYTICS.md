# DSAR — Authorization AI Governance: AI 애널리틱스 (APPROVAL_AI_ANALYTICS)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AI_ANALYTICS`(SPEC §25)는 authz AI 거버넌스의 **품질·건전성 지표 집계**로 다음 7지표를 산출한다.

| 지표 | SPEC 근거 | 의미 |
|---|---|---|
| Recommendation Acceptance Rate | §25 | 추천 수용 비율 |
| Recommendation Accuracy | §25·§35(≥95%) | 추천 정확도 |
| Model Drift | §25·§26(Drift Detection) | 모델 드리프트 |
| False Positive / False Negative | §25 | 오탐/미탐 |
| Prediction Latency | §25·§35(Risk≤300ms) | 예측 지연 |
| Human Override Rate | §25·§31(High 경고) | 인간 재정의 비율 |

목적: Recommendation Quality Declining·Model Drift Increasing·Human Override Rate High(§31 Warning Contract) 조기 경보 및 Continuous Learning(§21) 재학습 트리거.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Analytics 지표 | 판정 | 근거(파일:라인) |
|---|---|---|
| authz 전용 AI Analytics | **ABSENT** | GT② §2 "AI Snapshot/Evidence/Digest/Analytics/Drift/Simulation(authz) = ABSENT / PARTIAL". Acceptance/Accuracy/FP/FN/Override(authz) 산출 전무 |
| Model Drift 상태머신(도메인중립·마케팅 소비) | **PARTIAL(패턴)** | `backend/src/Handlers/ModelMonitor.php:244-291`(drift report·driftCheck·drift_score/drift_status)·`:221-241`·`:161-218`(retrain·retrain_threshold/auto_retrain) |
| 모델 metrics 집계(마케팅) | **PARTIAL(패턴)** | `backend/src/Handlers/ModelMonitor.php:142-158`(modelMetrics·ml_model_metrics) |
| 정직 폴백(미연결시 날조 금지) | **PARTIAL(패턴)** | `backend/src/Handlers/ModelMonitor.php:183-194`·`:255-266`(mt_rand 날조 금지·queue만) |
| Human Override Rate substrate(maker-checker·미집계) | **PARTIAL** | `backend/src/Handlers/AccessReview.php:177-242`(justification 필수 결정)·`backend/src/Handlers/Mapping.php:268-271`·`backend/src/Handlers/Alerting.php:642-650`(quorum) — override **비율 집계 없음** |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **지표**: Acceptance Rate + Accuracy(≥95%·§35) + Model Drift + FP + FN + Prediction Latency + Human Override Rate(§25).
- **Drift 재배선**: ModelMonitor 드리프트/재학습 상태머신(`ModelMonitor.php:244-291`·`:161-218`)을 **authz 데이터(acl_permission/auth_audit_log/access_review_item)로 재배선**해 authz Model Drift·Recommendation Drift(§26)를 산출(ADR §D-1). 도메인 컬럼 없는 상태머신만 재활용.
- **Override Rate 배선**: maker-checker 결정(`AccessReview.php:177-242`·`Mapping.php:268-271`·`Alerting.php:642-650`)을 AI 추천 승인 게이트에 배선(ADR §D-3)한 뒤 그 승인/거부 로그에서 Human Override Rate를 **신규 집계**. 현행은 비율 집계 substrate 부재.
- **정직 폴백**: 미연결 시 mt_rand 날조 금지(`ModelMonitor.php:183-194`·`:255-266` 패턴 준수). 테넌트 격리(§33) 절대·Digest(§24) 입력.

## 4. KEEP_SEPARATE (마케팅 AI analytics/drift 흡수금지)

- ★`ModelMonitor.php:244-291`·`:161-218`·`:142-158`의 drift/retrain/metrics는 **마케팅 모델**(이탈/전환/추천/LTV/ROAS·seed `ModelMonitor.php:293-313`) 대상이다(GT② §B-5). 상태머신 **패턴만** authz로 재배선하고 마케팅 drift/metrics 값을 authz Analytics로 **흡수 금지**.
- `AnomalyDetection.php:1-45`(광고 SPC μ±kσ)·`Risk.php:12-214`(공급망 fraud)의 이상탐지/예측 지표는 마케팅·커머스이지 authz Analytics가 아니다(GT② §B-3). Model Drift/FP/FN으로 흡수 금지.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**APPROVAL_AI_ANALYTICS = ABSENT-greenfield(authz Acceptance/Accuracy/FP/FN/Prediction Latency/Human Override Rate 산출 순신규).** 재활용(흡수 아님·재배선): ModelMonitor 드리프트/재학습·metrics 상태머신(`:244-291`·`:161-218`·`:142-158`)·정직 폴백(`:183-194`·`:255-266`)을 authz 데이터로 재배선해 Model Drift(§26) 산출(ADR §D-1)·maker-checker(`AccessReview.php:177-242`·`Mapping.php:268-271`·`Alerting.php:642-650`)를 AI 게이트에 배선 후 Human Override Rate 신규 집계(ADR §D-3). Acceptance/Accuracy/FP/FN은 순신규(Recommendation 엔진·라벨 필요). 마케팅 drift/metrics/이상탐지 KEEP_SEPARATE. 선행: Part 1~3-14 인증·Recommendation/Prediction 엔진·Human Approval Gateway 배선 후 실 구현(BLOCKED_PREREQUISITE).
