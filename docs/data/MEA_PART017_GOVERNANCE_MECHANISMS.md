# MEA Part 017 — Governance Mechanisms (§7~§18 통합)

> **거버넌스 상태**: 거버넌스 메커니즘 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★예측(`DemandForecast`/`Mmm`/`CustomerAI`)·모델 모니터(`ModelMonitor`)·이상(`AnomalyDetection`)·SecurityAudit 재사용(★중복 예측/모델 모니터 절대 금지)·형식 통합 Forecast Engine 신설(예측 재구현 없이).

## §7 모델 관리 거버넌스
Model ID/Name/Type/Version/Training Dataset/Accuracy/Confidence/Owner/Status/Effective Date. 현행=`ModelMonitor`(ml_models: accuracy·drift_score·drift_status·auto_retrain·retrain_threshold=0.15). ★이전 버전 보존=git+형식 Version Manager 순신설. 운영 MySQL 3테이블 ensureTables 자가치유(281차 스키마 무음실패 준수).

## §8 Workflow 거버넌스
수집→정제→Feature→모델 선택→예측→Confidence→검증→Audit→Event→Dashboard. 현행=`DemandForecast`(loadSeries→자동 모델선택→sMAPE)·`ModelMonitor`(drift-check→retrain). ★데이터 품질=Trust First(Part 006/015·수집≠사용). Feature/Event 단계(형식)=순신설.

## §9 Scenario 거버넌스
Best/Expected/Worst/What-if/Sensitivity/Monte Carlo/Seasonal/Trend. 현행=`DemandForecast`(seasonality/trend)·`Mmm`(PROFIT(T)/T*). ★Scenario별 독립 저장·형식 Best/Worst/Monte Carlo=순신설(중복 계절/추세 계산 금지·기존 파생).

## §10 Accuracy 거버넌스
MAE/MAPE/RMSE/Precision/Recall/Confidence/Drift/Retraining Threshold. 현행=`DemandForecast`(sMAPE·★"날조 금지"·in-sample 실측)·`ModelMonitor`(accuracy·drift_score·retrain_threshold). ★정확도 저하→재학습 권고(auto_retrain). MAE/RMSE(형식)=순신설.

## §11 Monitoring 거버넌스
Accuracy/Drift/Bias/Execution Time/Failed/Freshness/Retraining/Stability. 현행=`ModelMonitor`(drift-report·drift_status·ml_retrain_log)·Freshness=`DataPlatform`(lineage). Bias/Stability(형식)=순신설.

## §12 Security 거버넌스
Tenant=`Db.php`([[reference_platform_growth_actas_tenant_hijack]])·RBAC=`index.php`(viewer<connector<analyst<admin+writeGuard)·Training Data Encryption=`Crypto`(AES-256-GCM)·Model Protection=git+`CHANGE_GATE`·Audit/Prediction Integrity=`SecurityAudit::verify`(★유일 tamper-evident·[[reference_menu_audit_log_not_tamper_evident]]).

## §13 Runtime 거버넌스
데이터 품질 검증·Feature 생성·모델 버전 검증·예측·Confidence·Audit. 품질=Trust First·예측=`DemandForecast`/`Mmm`·Confidence=sMAPE·버전=`ModelMonitor` seed·Audit=`SecurityAudit`.

## §14 API 거버넌스 (8)
Execute Forecast/Query Result/Register·Validate Model/Compare Scenario/Query Accuracy/Trigger Retraining/Dashboard. 현행=`DemandForecast`(/api/demand/forecast·/seasonality)·`ModelMonitor`(/api/models/{id}/retrain·/drift-report·/drift-check) 실재·Compare Scenario=ABSENT. Part 001 API 표준(`/api` 접두·[[reference_api_prefix_routing]]) 상속.

## §15 Event 거버넌스 (8)
ForecastStarted/Completed/PredictionGenerated/ModelRegistered/Updated/ModelDriftDetected/RetrainingTriggered/ForecastAudited. 현행=`ModelMonitor` drift-check=ModelDriftDetected·retrain=RetrainingTriggered seed(동기 호출·event-driven 부재). Data Platform §15 정합.

## §16 AI 거버넌스
최적 모델 추천/Feature 중요도/Drift=`ModelMonitor`·이상 예측=`AnomalyDetection`·재학습 권고=auto_retrain·Explainability=헌법 V4·Scenario 자동생성=순신설. ★AI는 예측 모델 자동 배포/승인 불가=헌법 V3+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## §17~§18 성능·완료
성능=`DemandForecast` in-sample·`Mmm` 사전집계 seed(벤치 대상 미존재). 완료=형식 통합 Forecast Engine/완전 Model Registry/Scenario Engine 구현 시(부분 충족·코드 0). ★단 예측·드리프트/재학습은 실 강함(경쟁 Klaviyo 수준).

## 판정
전 메커니즘 **설계-only·코드 0·NOT_CERTIFIED.** ★예측(`DemandForecast`/`Mmm`/`CustomerAI`)·모델 모니터(`ModelMonitor`·drift/retrain)·이상(`AnomalyDetection`)·Audit(`SecurityAudit`) 재사용·승격(★중복 예측/모델 모니터 절대 금지=값 분산=회귀)·형식 통합 Enterprise Forecast Engine/완전 Prediction Model Registry/Scenario Engine만 신설(예측 재구현 없이). Part 013~016/Data Platform/헌법 상속·재정의 금지·AI 모델 자동 배포/승인 불가.
