# GeniegoROI Claude Code Implementation Specification

# CCIS Part027 — AI Model Lifecycle, MLOps & Model Governance Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

AI Model Lifecycle·MLOps·Model Governance 표준을 수립한다.

> ★**성격(약한 스택 — 자체 ML 학습 없음)**: 이 저장소는 **자체 ML 모델을 학습하지 않는다**. AI 실체는
> ① **외부 LLM**(`ClaudeAI::complete` Gateway·CCIS Part021·MEA 053) + ② **통계/알고리즘 모델**(`Mmm`
> ROI frontier·`AttributionEngine` markov·`DemandForecast`) + ③ **모델 메타 레지스트리·드리프트 모니터**
> (`ModelMonitor` = 정본·`ml_models`/`ml_model_metrics`/`ml_retrain_log` 3테이블) + ④ **V3 Data Trust**
> (데이터 신뢰검증)로 구성된다. 명세가 요구하는 **Feature Store·형식 Model Registry(MLflow)·Training/
> Validation Pipeline(Kubeflow/SageMaker)·Continuous Training·Canary/Shadow Deployment·형식 XAI(SHAP/
> LIME)**는 **부재**한다(자체 학습을 하지 않으므로 학습 파이프라인 자체가 없다 — MEA 057 AI
> Observability weak). Part001 §4 에 따라 실측 → MLOps 스택 부재증명 → 실 AI 스택(외부 LLM Gateway +
> 통계모델 + ModelMonitor + V3 Trust) 성문화했다. ★**핵심 문화자산**: `ModelMonitor`는 운영 테넌트에서
> **재학습 정확도를 mt_rand로 날조하지 않고 `queued` 반환**, **드리프트 점수를 날조하지 않고 빈 결과+사유
> 반환**한다(정직 미산출 — 057 SystemMetrics·058 Mmm·059 PriceOpt 와 동일 문화). (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 AI 모델 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Model Registry | MLflow/SageMaker Registry | ★**`ml_models` 테이블**(id/name/type/version/status/accuracy/auc_roc/f1/drift_score·테넌트격리) — 경량 레지스트리 |
| Model Versioning | Semantic Versioning | **`version` 컬럼**(`v2.1` 등 문자열). 형식 SemVer 자동증분 아님 |
| Feature Store | Feast/Tecton | **부재**. 학습·추론 공용 feature 없음 — 통계모델은 rollup 집계(`performance_metrics`·`channel_orders`)를 직접 입력 |
| Dataset Management | Version/Hash/Lineage | **부분** — `training_samples` 카운트만. Dataset Hash/버전관리 부재(자체 학습 없음) |
| Training Pipeline | Kubeflow/Airflow | **부재**. AI=외부 LLM 호출 + 통계 계산(`Mmm::frontier`·`AttributionEngine` markov). 학습 단계 자체 없음 |
| Validation Pipeline | Accuracy/Precision/Recall Gate | **부분** — `ml_model_metrics`(accuracy/auc_roc/f1/precision/recall) 기록 스키마는 존재. 배포 게이트 자동화 아님 |
| Continuous Training | 신규데이터/Drift 자동재학습 | **부분(정직 미산출)** — 조건 스키마(`auto_retrain`·`retrain_threshold`) 존재. **운영은 큐잉만**(실 파이프라인 미연결·날조 금지) |
| Model Deployment | Blue/Green·Canary·Shadow·Rolling | **부재**(모델 배포 개념 없음). 코드 배포=dist swap+fpm reload(Part015) |
| A/B Testing | Model A vs B 통계유의 | ★**`AbTesting`**(캠페인/크리에이티브 A/B)·`WebPopupCampaign` A/B. **모델** A/B 아님 |
| Model Monitoring | Latency/Error/Drift | ★**`ModelMonitor`**(drift-report·drift-check)·`ml_model_metrics` 이력. LLM 호출 감사=`ai_call_log`(053) |
| Data/Feature/Model Drift | 분포변화 감지 | **부분(정직 미산출)** — drift_score/drift_status 스키마·임계값. **운영 실 계산 미연결 → 빈결과+사유**(데모만 시뮬) |
| Explainable AI | SHAP/LIME/Feature Importance | **대응물** — V4 헌법 "근거/신뢰도 표시"(`Decisioning`·`Mmm` 근거·V3 Trust 신뢰도). 형식 SHAP/LIME 부재(MEA 056 `shap` grep 0) |
| AI Governance | 승인/감사/Risk/Compliance | ★**`action_request`+`agent_mode`**(승인)·`SecurityAudit`(감사)·`Risk`·`Compliance`(SIEM). MEA 056 weak |
| Audit Logging | Version/Dataset/Deploy/Operator | **부분** — `ml_retrain_log`(trigger/old·new accuracy/operator 부분)·`ai_call_log`(LLM). Model 변경 승인이력 부분 |
| Disaster Recovery | Registry/Artifact/Dataset Backup | **부분** — DB 백업(Part015)에 `ml_*` 포함. Artifact 백업 대상 없음(모델 파일 없음) |
| Monitoring Dashboard | Model Health/Drift/Cost | **프론트 대시보드**(모델 상태·드리프트)·`SystemMetrics`(정직 null) |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Reproducible/Version/Continuous Eval/Explain/Human Approval/Audit) | **부분 준수** | ★Human Approval(`action_request`)·Explain(근거/신뢰도·V4)·Audit(SecurityAudit) 준수. Reproducible Training=대상 없음(학습 안 함) |
| §4 Lifecycle Architecture | **부분(대응물)** | 학습부터 재학습 자동화 없음. ★**추론 파이프라인**=Trust(V3)→통계모델/LLM→ModelMonitor 감시 |
| §5 Model Registry | **★대응물** | ★`ml_models`(id/version/framework=type/metrics/owner=tenant/status·created_at) — 명세 관리항목 대부분 실재. MLflow 아님 |
| §6 Model Versioning | **부분** | `version` 문자열 컬럼(SemVer 형식). 자동 증분·태깅 아님 |
| §7 Feature Store | **부재** | Feast/Tecton 없음. 통계모델은 rollup 집계 직접 사용(학습·추론 feature 분리 개념 없음) |
| §8 Dataset Management | **부분** | `training_samples` 카운트만. Source/Hash/Label 버전관리 부재 |
| §9 Training Pipeline | **부재** | 자체 학습 없음. Mmm=통계 최적화(frontier)·Attribution=markov 확률 계산 |
| §10 Validation Pipeline | **부분** | `ml_model_metrics`(accuracy/auc/f1/precision/recall) 스키마 존재. 배포 게이트 미자동화 |
| §11 Evaluation(Offline/Online/KPI/Latency/Cost) | **부분** | Business KPI=rollup·Latency=SystemMetrics·Cost=`ai_call_log` 토큰. Offline/Online 분리 없음 |
| §12~§14 Deployment/Canary/Shadow | **부재** | 모델 배포 개념 없음(모델 파일 없음). 코드 배포=dist swap(Part015) |
| §15 A/B Testing | **대응물(모델 아님)** | ★`AbTesting`·`WebPopupCampaign` A/B(캠페인·크리에이티브). **모델** A/B 부재 |
| §16 Model Monitoring | **★부분 준수** | ★`ModelMonitor`(drift-report/check·`ml_model_metrics` 이력). LLM=`ai_call_log`(053) |
| §17~§19 Data/Feature/Model Drift | **부분(정직 미산출)** | drift_score/status·임계값 스키마. ★**운영 실 계산 미연결 → 빈결과+사유**(mt_rand 날조 금지·데모만 시뮬) |
| §20 Continuous Training | **부분(정직 미산출)** | `auto_retrain`/`retrain_threshold` 조건·`ml_retrain_log`. ★**운영 재학습=`queued`**(파이프라인 미연결·정확도 날조 금지) |
| §21 Explainable AI | **대응물** | V4 "근거/신뢰도 표시"(`Decisioning`·`Mmm` 근거·V3 Trust confidence). SHAP/LIME 부재 |
| §22 AI Governance | **부분 준수** | ★`action_request`+`agent_mode`(승인)·`SecurityAudit`(감사)·`Risk`. Risk Assessment 형식화 부분(MEA 056 weak) |
| §23 Security | **부분 준수** | Access Control(RBAC)·Secret(`Crypto` AES·Part006). Model Encryption/Artifact Integrity=대상 없음(모델 파일 없음) |
| §24 Audit Logging | **부분** | `ml_retrain_log`(trigger/accuracy/시각)·`ai_call_log`(LLM). Dataset Version/Operator/Approval 부분 |
| §25 Disaster Recovery | **부분** | DB 백업에 `ml_*` 포함(Part015). Artifact/Dataset 백업 대상 없음 |
| §26 Monitoring Dashboard | **부분 준수** | 프론트 모델 상태/드리프트 대시보드·SystemMetrics(정직 null) |
| §27~§28 PHP/Claude(Registry API/Queue Training/Drift Worker/Governance) | **부분 준수** | ★Registry API(`/models*`)·Governance(승인/감사). Queue Training/Drift Worker=미연결(스키마만·정직) |
| §29~§30 검증(artisan model:list 등) | **대상 없음** | artisan 없음(Slim). `GET /models`·`GET /models/drift-report`·`POST /models/drift-check` 로 대체 |

---

## 4. 확립된 표준 (신규 AI/모델 코드가 따를 정본)

- ★**Gateway = `ClaudeAI::complete`**(외부 LLM 단일 통과점·CCIS Part021·MEA 053)·**감사=`ai_call_log`**. 신규 LLM 호출은 반드시 Gateway 경유(BYO 키 우선 보존). **직접 전송 경로 신설 금지**.
- ★**모델 감시 = `ModelMonitor`**(정본·`ml_models`/`ml_model_metrics`/`ml_retrain_log`). 신규 모델 메타는 이 레지스트리 확장. **드리프트/재학습 엔진 난립 금지**.
- ★**통계/알고리즘 모델 = `Mmm`(ROI frontier)·`AttributionEngine`(markov)·`DemandForecast`·`Decisioning`·`CustomerAI`** 확장(중복 엔진 금지). 이들은 **학습형 ML이 아니라 통계·확률 계산**이므로 Training Pipeline 이식 대상이 아니다.
- ★**정직 미산출(이 저장소 문화자산·모범)**: 산출 불가·파이프라인 미연결 시 **날조 금지 → 빈결과/`queued`/`null` + 명시적 사유**. ModelMonitor 운영 경로(재학습=`queued`·드리프트=빈결과)·Mmm frontier `optimized:false`+사유·PriceOpt null/422 가 정본 패턴. **mt_rand 시뮬레이션은 데모(showcase) 테넌트 한정**.
- ★**테넌트 격리 절대**: 모든 `ml_*` 조회/쓰기는 위조 불가 권위 tenant(`auth_tenant` 미들웨어)로 격리. **운영 tenant의 'demo' 폴백=가짜데이터 유입 P0**(ModelMonitor::tenant() 방어).
- ★**AI 거버넌스**: 자동 집행은 `action_request`+`agent_mode` 승인정책 경유·`SecurityAudit` 감사. **신뢰도/권한/통계신뢰 부족 시 자동집행 금지→경고**(V5 Safety Rule).
- ★**Explainable = V4 "근거/신뢰도 표시"**(`Decisioning`/`Mmm` 근거·V3 Trust confidence). 근거없는 결론 금지. 형식 SHAP/LIME 이식 금지(대상 모델 없음).
- ★**AI는 V3 Trust READY 데이터만 사용**(수집≠사용·Part026·헌법 V3). BLOCKED/WARNING 데이터로 추천/자동화 금지.

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **Feature Store(Feast/Tecton)** — 안 함. 자체 학습이 없어 학습·추론 공용 feature 개념 불필요. 통계모델은 rollup 집계 직접 입력.
2. **형식 Model Registry(MLflow)·Training/Validation Pipeline(Kubeflow/SageMaker/Airflow)** — 안 함. **자체 ML 학습을 하지 않는다**(외부 LLM + 통계모델). `ml_models` 경량 레지스트리로 충분.
3. **Continuous Training(자동 재학습 실행)** — 조건 스키마만. **운영은 큐잉(`queued`)까지만**·실 학습 파이프라인 미연결(연결 전 정확도 날조=데이터 위조라 금지).
4. **Model Deployment(Blue/Green·Canary·Shadow·Rolling)** — 안 함. 모델 파일/서빙 아티팩트가 없다. 코드 배포=dist swap+fpm reload(Part015).
5. **모델 Drift 실 계산(운영)** — 미연결. **빈결과+사유 정직 반환**(데모만 mt_rand 시뮬). 실 예측 로그 기반 계산 도입 시 확장.
6. **형식 XAI(SHAP/LIME)·Model Encryption/Artifact Integrity** — 안 함. 대상 학습 모델/아티팩트가 없다. 대응물=V4 근거/신뢰도·V3 Trust.
7. **artisan `model:*`/`ml:*` 명령** — 없음(Laravel 아님·Slim). `GET /models`·`/models/drift-report`·`POST /models/drift-check` HTTP 엔드포인트로 대체.

★**준수하는 실 원칙**: **단일 Gateway(LLM)·단일 모델감시(ModelMonitor)·통계모델 확장(난립 금지)·정직 미산출(날조 금지·큐잉/null+사유)·테넌트 격리·승인 거버넌스(action_request)·Explainable(근거/신뢰도)·V3 Trust READY 게이트(수집≠사용)**.

---

## 6. Claude Code 구현 규칙

1. LLM 호출=`ClaudeAI::complete` Gateway 경유·`ai_call_log` 감사. 직접 전송 신설 금지(BYO 키 우선).
2. 모델 메타/드리프트/재학습=`ModelMonitor`(`ml_models` 등) 확장. 드리프트/재학습 엔진 난립 금지.
3. 통계·확률 모델=`Mmm`/`AttributionEngine`/`DemandForecast`/`Decisioning` 확장(중복 금지). **Training Pipeline·Feature Store·MLflow 를 "명세에 있다"는 이유로 이식하지 않는다**(자체 학습 없음).
4. ★**정직 미산출=날조 금지**: 파이프라인 미연결 시 `queued`/빈결과/`null`+사유. mt_rand 시뮬레이션은 **데모 테넌트 한정**(운영 tenant는 절대 시드/시뮬 금지).
5. ★**테넌트 격리**: `ml_*` 는 위조 불가 권위 tenant로만 격리. 운영의 'demo' 폴백 차단.
6. AI 자동집행=`action_request`+`agent_mode` 승인·`SecurityAudit` 감사·V5 Safety Rule(신뢰도/권한 부족→경고). Explainable(근거/신뢰도)·V3 Trust READY 데이터만.
7. Canary/Shadow/Blue-Green **모델 배포**·SHAP/LIME·Feature Store 를 이식하지 않는다(대상 모델/아티팩트 부재).

---

## 7. Completion Criteria

- [x] AI 모델 스택 **실측**(자체 학습 0·`ml_models` 레지스트리·통계모델 Mmm/Attribution/DemandForecast·ModelMonitor 정본·V3 Trust)
- [x] 명세 §3~§30 **섹션별 매핑·판정**(Feature Store/MLflow/Training Pipeline/Canary·Shadow/SHAP·LIME 부재 증명)
- [x] 실 AI 스택(외부 LLM Gateway + 통계모델 + ModelMonitor + V3 Trust) 성문화(§4)
- [x] ★정직 미산출(ModelMonitor 운영=큐잉/빈결과+사유)·테넌트 격리·승인 거버넌스·Explainable(근거/신뢰도) 명시
- [x] 의도적 미적용 + 사유(§5) — Feature Store/Training Pipeline/Continuous Training/Model Deployment/XAI/artisan
- [x] Claude Code 규칙(§6) · `GET /models`·`/models/drift-report`·`/models/drift-check` 실 엔드포인트 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **자체 ML 학습을 하지 않는** 저장소의 실 AI 스택(외부 LLM Gateway
> + 통계/확률 모델 + ModelMonitor 정직 감시 + V3 Trust)의 성문화이지 MLflow/Kubeflow/Feature Store 이식이
> 아니다. **핵심 문화자산**: ModelMonitor 는 운영 테넌트에서 재학습 정확도·드리프트 점수를 **날조하지 않고
> `queued`/빈결과+사유** 를 반환한다(057/058/059 와 동일 정직 미산출 문화).

---

## 다음 Part

**CCIS Part028 — Enterprise Integration, External API, EDI & Partner Connectivity Standards** — ★사전 실측 예고: 형식 EDI(ANSI X12/EDIFACT)·EIP 프레임워크(Camel/MuleSoft)는 **부재**하나, **커넥터 표준(DATA 헌법 Volume 2·Connector Registry)·채널 어댑터(`AdAdapters`·`ChannelSync` 14채널)·Webhook(`WebhookToken`·215차)·외부 API 연동(11번가/네이버/쿠팡 OpenAPI)·`OpenPlatform`·재시도/장애복구**는 실재. Part028 도 실측→EDI/EIP 부재증명→커넥터 표준+채널 어댑터+Webhook 성문화(EIP 프레임워크 이식 금지).
