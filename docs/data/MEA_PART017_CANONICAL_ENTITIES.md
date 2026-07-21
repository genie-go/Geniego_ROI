# MEA Part 017 — Canonical Entities Design & Judgment (§5~§16)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★DemandForecast/ModelMonitor/CustomerAI/Mmm 재사용·형식 통합 Forecast Engine greenfield·Part 013~016 상속.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | FORECAST_MODEL | Holt-Winters/Holt/MA | `DemandForecast.php`(:12·forecast:101) | PARTIAL-strong |
| 2 | PREDICTION_MODEL | ml_models·churn/CLV | `ModelMonitor.php`(:37)·`CustomerAI.php` | PARTIAL-strong |
| 3 | FORECAST_JOB | 예측 실행(동기) | `DemandForecast.php`·`ModelMonitor.php` | PARTIAL(형식 Job 아님) |
| 4 | FORECAST_RESULT | 예측 배열·정확도 | `DemandForecast.php`(:99) | PARTIAL-strong |
| 5 | FORECAST_PERIOD | horizon/days | `DemandForecast.php`(:18) | PARTIAL |
| 6 | FORECAST_BASELINE | 부재(형식 Baseline) | — | ABSENT-formal |
| 7 | FORECAST_SCENARIO | 계절/추세·PROFIT(T) | `DemandForecast`·`Mmm`(frontier) | PARTIAL(Monte Carlo ABSENT) |
| 8 | FORECAST_CONFIDENCE | sMAPE·sigma | `DemandForecast.php`(:99) | PARTIAL-strong |
| 9 | PREDICTION_VARIABLE | Feature(series) | `DemandForecast.php`(loadSeries:36) | PARTIAL |
| 10 | FORECAST_ALERT | drift/threshold 알림 | `ModelMonitor`·`Alerting` | PARTIAL |
| 11 | MODEL_VERSION | ml_models(version 부분) | `ModelMonitor.php`(:37) | PARTIAL |
| 12 | MODEL_ACCURACY | accuracy·drift_score | `ModelMonitor.php`(:37·:42) | PARTIAL-strong |
| 13 | FORECAST_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| 14 | PREDICTION_EVENT | drift-check/retrain(동기) | `ModelMonitor.php`(:18~19) | PARTIAL(event-driven ABSENT) |
| 15 | FORECAST_STATUS | drift_status | `ModelMonitor.php`(:43) | PARTIAL |

## §6~§16 표준 판정
- **§6 Domain(12)**: Demand/Inventory=DemandForecast·Revenue/Cost/Profit/ROI=Mmm/Pnl·Customer=CustomerAI·Marketing=Mmm/AttributionMetrics. Capacity(형식)=부분.
- **§7 모델 관리(10)**: ml_models(accuracy/drift/auto_retrain/retrain_threshold) 실재·형식 Version/Owner/Effective Date=부분.
- **§8 Workflow(10)**: loadSeries→forecast→sMAPE→(ModelMonitor)drift-check→retrain 실재·Feature/Event/Audit 단계(형식)=부분.
- **§9 Scenario(8)**: seasonality/trend/PROFIT(T) 실재·Best/Worst/What-if/Monte Carlo(형식)=ABSENT.
- **§10 Accuracy(8)**: sMAPE·drift_score·retrain_threshold 실재·MAE/RMSE/Precision/Recall(형식)=부분.
- **§11 Monitoring(8)**: drift-report/drift_status/ml_retrain_log 실재·Bias/Stability(형식)=부분.
- **§12 Security**: Tenant/RBAC/Encryption/Audit/Integrity(Part 001~016 상속).
- **§16 AI**: Drift=ModelMonitor·이상=AnomalyDetection·재학습 권고=auto_retrain·Explainability=헌법 V4·자동 배포/승인 불가=헌법 V3+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§1·§2·§4·§8·§12·§13=예측/정확도/모델 정확도/감사) / PARTIAL(§3·§5·§7·§9~11·§14·§15) / ABSENT-formal(§6 FORECAST_BASELINE·§9 Monte Carlo·§14 event-driven·형식 통합 Forecast Engine/완전 Model Registry/Scenario Engine).** 코드 0. ★예측(`DemandForecast`/`Mmm`/`CustomerAI`)·모델 모니터(`ModelMonitor`) 재사용(★중복 예측/모델 모니터 절대 금지)·형식 통합 Forecast Engine 신설(예측 재구현 없이)·Part 013~016 상속·AI 모델 자동 배포/승인 불가(V3+CHANGE_GATE).
