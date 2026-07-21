# MEA Part 017 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 017 SPEC/ADR.

## 전수조사 방법
forecast/predict/drift/mape/rmse/retrain/time-series/holt/seasonal/BG-NBD/churn 키워드로 `backend/src` 전수 grep + 판독.

## 실존 substrate (★예측·모델 모니터링 실 강함)
| MEA 개념 | 실존 substrate | 인용 | 성격·판정 |
|---|---|---|---|
| 수요/재고 예측 | ★Holt-Winters/Holt/이동평균 자동선택 | `DemandForecast.php`(:12~13·forecast:101) | PARTIAL-strong |
| 예측 정확도 | ★sMAPE·"날조 금지" | `DemandForecast.php`(:13·accuracy:99) | PARTIAL-strong |
| 계절성 | 요일 계절 지수 | `DemandForecast.php`(seasonality:19) | PARTIAL-strong |
| Model Registry seed | ml_models 테이블 | `ModelMonitor.php`(:37~45·accuracy·drift_score·auto_retrain·retrain_threshold) | PARTIAL-strong |
| Drift/Accuracy 모니터 | drift-report/drift-check | `ModelMonitor.php`(:18~19·ml_model_metrics·:53~58) | PARTIAL-strong |
| Retraining | 수동/자동 재학습 로그 | `ModelMonitor.php`(:17·ml_retrain_log:62·retrain_threshold=0.15) | PARTIAL-strong |
| 고객 예측 | churn/purchase_prob/predicted_revenue | `CustomerAI.php`(:68~85) | PARTIAL-strong |
| 이익/ROI 예측 | 이익 효율 프론티어 | `Mmm.php`(frontier·PROFIT(T)·T*) | PARTIAL-strong |
| 이상 예측 | 이상 탐지 | `AnomalyDetection.php` | PARTIAL |
| Data Freshness | lineage | `DataPlatform.php` | PARTIAL |
| Audit/Integrity | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |

## 부재(ABSENT-formal) — 형식 통합 Forecast/Registry (grep 0 또는 산재)
형식 통합 Enterprise Forecast Engine(도메인별 산재: Demand/Mmm/CustomerAI)·형식 완전 Prediction Model Registry(ml_models=seed이나 Version/Owner/Effective Date 미완)·Scenario Prediction Engine(Best/Worst/What-if/Monte Carlo)·Forecast Scheduler·Confidence Evaluation Engine(형식)·형식 MAE/RMSE/Precision/Recall·Forecast Bias/Stability·Event 표준(ForecastStarted 등).

## 판정
**PARTIAL-strong / ABSENT-formal.** ★예측은 **실 강함**: `DemandForecast`(Holt-Winters/Holt/MA 자동선택·sMAPE·"날조 금지"·계절)·`ModelMonitor`(ml_models/ml_model_metrics/ml_retrain_log·drift_score·auto_retrain·retrain_threshold=0.15·drift-report/check API)·`CustomerAI`(churn/purchase_prob·Klaviyo 수준)·`Mmm`(이익/ROI frontier)·`AnomalyDetection`(이상). 단 **형식 통합 Enterprise Forecast Engine·완전 Prediction Model Registry·Scenario Engine(Monte Carlo)은 도메인별 산재/미완**(Part 013~016 동일 판정). 실행은 선행 Part 001~016 + 형식 통합 Forecast Engine/Registry 신설(예측 재구현 없이) 종속.
