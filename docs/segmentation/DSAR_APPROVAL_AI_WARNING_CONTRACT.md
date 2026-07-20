# DSAR — Authorization AI Governance: AI Warning Contract (Part 3-15 §31)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §31은 차단이 아닌 **비차단 경고(warning)** 5종을 규정한다. 품질 저하 신호를 surfacing하되 authz는 계속 동작(fail-open 경고).

| 경고 | 신호 원천 | 매핑 |
|---|---|---|
| Model Drift Increasing | drift_score 상승 | AI Drift §26·Analytics §25 |
| Feature Drift Detected | Feature 분포 이동 | AI Drift §26(Feature Drift) |
| Recommendation Quality Declining | Acceptance/Accuracy 하락 | AI Analytics §25 |
| Dataset Aging | 학습 데이터셋 노후 | Continuous Learning §21(Retraining) |
| Human Override Rate High | 사람 재정의율 상승 | AI Analytics §25(Human Override Rate) |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 경고 | 판정 | 근거(파일:라인) |
|---|---|---|
| Model Drift Increasing 재활용 substrate | **PARTIAL(마케팅·authz 미배선)** | `ModelMonitor.php:244-291` driftCheck·`:161-218` retrain(drift_score/drift_status/retrain_threshold/auto_retrain 상태머신) — GT① §C·마케팅 대상 |
| Feature Drift Detected substrate | **PARTIAL(패턴)** | `ModelMonitor.php:221-241` drift report·`:142-158` modelMetrics — GT① §C·authz feature 미존재 |
| Recommendation Quality Declining | **ABSENT** | authz 추천 자체 부재 → acceptance/accuracy 지표 없음(GT② §2 AI Analytics ABSENT) |
| Dataset Aging | **ABSENT** | authz 학습 데이터셋·retrain 파이프라인 부재(GT② §2 Continuous Learning ABSENT) |
| Human Override Rate High substrate | **PARTIAL(baseline)** | human 결정 기록 substrate(`AccessReview.php:177-242`·`:225` SecurityAudit)는 있으나 override rate 집계 없음 — GT① §B |

★ModelMonitor 드리프트 상태머신(`:30-291`)은 도메인중립이나 seed·소비 마케팅(`:293-313`). 정직 폴백(`:183-194`·`:255-266`) 패턴 참고.

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

- **W-1 비차단**: 경고는 authz 집행을 막지 않음(Error §30과 구분). 대시보드/Digest(§24)·Analytics(§25)로 surfacing.
- **W-2 Drift 임계**: Model/Feature Drift는 ModelMonitor drift_score 상태머신(`ModelMonitor.php:244-291`)을 authz 모델/feature로 **재배선**해 임계 초과 시 경고(ADR D-1).
- **W-3 정직 폴백**: 미연결 모델은 mt_rand 날조 금지·queue만(`ModelMonitor.php:183-194` 패턴). 데이터 부족 시 경고를 조작된 수치로 대체 금지.
- **W-4 Quality/Override 지표**: Recommendation Quality·Human Override Rate는 AI Analytics(§25) 신규 지표(Acceptance/Accuracy/Override Rate) 집계 후 임계 경고.
- **W-5 Dataset Aging**: Continuous Learning(§21 Retraining) 파이프라인의 데이터 신선도 임계 경고 → Retrain 트리거.
- **W-6 승격**: 경고가 임계 지속 시 Error(§30 AI_MODEL_DEPRECATED 등)로 승격 가능.

## 4. KEEP_SEPARATE (마케팅 AI 흡수금지)

- `ModelMonitor.php:293-313` seedDemoModels(이탈예측/구매전환/상품추천/LTV/광고ROAS)은 마케팅 모델 — authz Warning 대상 아님(GT② §B-5·ADR D-7).
- `AnomalyDetection.php:1-45`(광고 SPC μ±kσ)·`Decisioning.php:12-477`의 품질/드리프트 신호는 마케팅 — authz Warning Contract로 흡수 금지.
- `AutoRecommend.php:35-920`의 self-learning prior(`:185`) 품질 하락은 광고 도메인.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**AI Warning Contract = ABSENT / PARTIAL(substrate·authz 미배선).** 재활용(재배선): ModelMonitor 드리프트 상태머신(`ModelMonitor.php:244-291`·`:161-218`)·정직 폴백(`:183-194`)을 authz Drift 경고로. Quality/Override/Dataset Aging은 AI Analytics(§25)·Continuous Learning(§21) 신설 후 유효 → 선행의존. ★마케팅 seed·AnomalyDetection 흡수 금지. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
