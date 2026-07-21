# ADR — MEA Part 017 Enterprise Forecast & Predictive Intelligence Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part017 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 017은 Forecast & Predictive Intelligence(미래 매출/비용/ROI/수요/고객 예측). ★코드베이스에는 **예측이 이미 실재**: `DemandForecast.php`(Holt-Winters/Holt/이동평균 자동선택·sMAPE·"날조 금지"·GT①)·`ModelMonitor.php`(ml_models/ml_model_metrics/ml_retrain_log·drift_score·auto_retrain·retrain_threshold=0.15·drift-report/drift-check API·GT①)·`CustomerAI.php`(churn/purchase_prob 예측)·`Mmm::frontier`(이익/ROI 예측)·`AnomalyDetection`(이상). 본 Part는 Part 013~016/Data Platform 상속(재정의 금지).

## 결정
- **D-1 (Part 013~016/Data Platform 재정의 금지):** ROI/이익 값(Part 013/016)·Calc(Part 014)·KPI(Part 015)·Metadata(Part 004)·Certification/Trust First(Part 006/008)를 준수·인용. Forecast 도메인(§6)=실 핸들러 매핑. 중복 정의 금지.
- **D-2 (예측 엔진 = DemandForecast/Mmm/CustomerAI 승격·★중복 예측 절대 금지):** 예측 = `DemandForecast`(수요/재고·Holt-Winters/Holt/MA·sMAPE)·`Mmm`(이익/ROI·frontier)·`CustomerAI`(고객 churn/CLV). ★"날조 금지" in-sample sMAPE(279차 BG/NBD 분모·263차)로 정확도 실측 강제. ★중복 예측 엔진 신설 절대 금지(값 분산=회귀). 형식 통합 Forecast Engine은 도메인 예측을 래핑(예측 재구현 아님).
- **D-3 (Model Registry/Monitoring = ModelMonitor 승격):** Prediction Model Registry/Drift/Accuracy/Retraining seed = `ModelMonitor`(ml_models·drift_score·drift_status·auto_retrain·retrain_threshold·ml_retrain_log·GT①). ★운영 MySQL 3테이블 미생성→ensureTables 자가치유(GT①). 형식 완전 Model Registry(Version/Owner/Effective Date)·Scenario Prediction Engine=순신설(중복 모니터 금지).
- **D-4 (Scenario/Accuracy = 기존 승격·형식 신설):** Scenario seed=`DemandForecast`(seasonality/trend)·`Mmm`(PROFIT(T)/T*)·Accuracy=`DemandForecast`(sMAPE)+`ModelMonitor`(accuracy/drift). ★형식 Best/Worst Case·What-if·Monte Carlo·MAE/RMSE(형식)=순신설(중복 계절/추세 계산 금지·기존 파생).
- **D-5 (Security/AI/Runtime = 헌법·무후퇴 정합):** Tenant=`Db.php`·RBAC=`index.php`·Encryption=`Crypto`·Audit/Integrity=`SecurityAudit`(해시체인)·Model Protection=git+`CHANGE_GATE`. AI(Drift/이상/재학습 권고)=`ModelMonitor`/`AnomalyDetection`·Explainability=헌법 V4·★AI 예측 모델 자동 배포/승인 불가=헌법 V3+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 013~016/Data Platform/헌법 상속·재정의 금지·예측(`DemandForecast`/`Mmm`/`CustomerAI`)·모델 모니터(`ModelMonitor`)·이상(`AnomalyDetection`)·`SecurityAudit` 재사용(★중복 예측/모델 모니터 절대 금지)·형식 통합 Forecast Engine·완전 Model Registry·Scenario Engine만 신설(예측 재구현 없이). 실행은 선행 Part 001~016 종속.
