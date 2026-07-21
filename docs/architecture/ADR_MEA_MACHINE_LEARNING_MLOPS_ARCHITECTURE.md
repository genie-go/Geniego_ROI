# ADR — MEA Part 052 Enterprise Machine Learning & MLOps Architecture

> **거버넌스 상태**: 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★부재증명 완료·오흡수 금지·과대주장 금지·헌법 V4/V5/데이터 헌법 V3/CHANGE_GATE 우선. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**

## Context
MEA Part 052는 전 ML 모델의 개발→학습→검증→배포→모니터링→재학습 전체 생명주기를 자동화하는 형식 MLOps 플랫폼(Feature Store·Training Pipeline·Experiment Tracking·Model Registry·GPU Training)을 표준화하려 한다. GeniegoROI의 실 MLOps 자산은 `ModelMonitor`의 드리프트 모니터링 스캐폴드(ml_models 3테이블)뿐이며, 실 학습 파이프라인/Feature Store/실험 추적/GPU는 부재(Part 051 GPU 부재 승계). 현행 실 예측은 통계 모델(Holt-Winters/Markov/MMM) 인라인 계산.

## D-1 실 MLOps=ModelMonitor 드리프트 스캐폴드만·형식 MLOps 파이프라인은 순신설
**결정**: 실재=`ModelMonitor`(ml_models/ml_model_metrics/ml_retrain_log·drift_score/retrain_threshold/auto_retrain·`driftCheck()`/`retrain()`·259/288차)=드리프트 모니터링 스캐폴드 재사용(★중복 모니터 금지). 형식 Feature Store·Feature Engineering·Training Pipeline·Experiment Tracking·HPO·AutoML·Distributed/GPU Training·Dataset Versioning·형식 Model Registry(lineage)·Canary Deployment=부재(grep 0·부재증명 완료)·순신설이나 GPU/데이터 파이프라인 인프라 선행 종속.

## D-2 ★ModelMonitor.retrain()은 mt_rand 시뮬레이션·실 Training Pipeline 아님 (★오흡수 금지·정직 표기)
**결정**: `ModelMonitor::retrain()`은 새 accuracy를 `mt_rand`로 산출(:201)하는 **시뮬레이션 재학습**(실제 모델 학습 없음). ml_retrain_log에 started/completed 상태는 기록하나 학습 연산 부재. ★이를 실 Training Pipeline/AutoML/Reproducible Training으로 과대주장 금지. 드리프트 모니터링 스캐폴드(테이블·임계값·상태·감사)는 실재이나 학습 엔진은 순신설.

## D-3 통계 모델·ml_models 테이블 ≠ 형식 Model Registry/Feature Store (★오흡수 금지)
**결정**: 현행 실 예측=통계(Holt-Winters `DemandForecast`·Markov `Attribution`·MMM 탄력성 `Mmm`·`Risk`)=인라인 계산이지 학습/등록된 ML 모델 아님. ml_models 테이블=경량 모델 메타이지 형식 Model Registry(version control·lineage·approval·promotion) 아님. Feature=각 핸들러 인라인 산출이지 중앙 Feature Store(online/offline·versioning·lineage) 아님. ★전부 seed·형식 MLOps 자산 아님·과대주장 금지.

## D-4 Auto Retraining은 승인·안전장치 종속 (헌법 V5)
**결정**: `ModelMonitor`의 auto_retrain/needs_retrain은 임계값 초과 플래그이나, ★AI가 운영 모델 자동 교체/승인 없는 재학습 자동 수행 불가=헌법 V5(안전 자동화·마케팅 자동화 안전장치)+`CHANGE_GATE`+배포 승인([[feedback_deploy_approval_mandatory]]). Automated Retraining Recommendation은 인사이트-only.

## D-5 ML Data Security는 Part 049/047/048 상속·중복 금지
**결정**: Training Data Encryption=`Crypto`(Part 049·중앙 KMS 부재)·Tenant=`Db`·RBAC=`index.php`(047)·Audit=`SecurityAudit`(048·[[reference_menu_audit_log_not_tamper_evident]]). ★중복 암호화/IAM/Audit 신설 금지·Secure Feature Store/Model Integrity Validation(형식)만 순신설. AI 데이터=데이터 헌법 V3(READY만 학습).

## Consequences
- 코드 변경 0·NOT_CERTIFIED. ★실 MLOps=드리프트 모니터링 스캐폴드뿐·형식 MLOps 파이프라인/Feature Store/실험/GPU는 부재·GPU/데이터 인프라 선행 종속.
- ★중복 금지: `ModelMonitor`(드리프트)·`DemandForecast`/`Mmm`/`Attribution`(예측)·`Crypto`·`SecurityAudit` 재사용(중복 MLOps 엔진 신설 금지).
- ★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·AI 운영 모델 자동 교체/승인 없는 재학습 불가(V5+CHANGE_GATE). Part 044/047/048/049/051 상속·재감사 금지.
