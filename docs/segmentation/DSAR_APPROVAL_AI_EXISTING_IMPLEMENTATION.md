# DSAR — Authorization AI Governance: 실존 구현 substrate 전수조사 (Ground-Truth ①)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> 본 문서는 Part 3-15 설계의 반날조 인용 **정본 허용목록**이다. 하위 per-entity DSAR은 본 문서 + Ground-Truth ② + ADR 등장 `파일:라인`만 인용.

---

## 0. 조사 범위·방법

- 대상: `backend/src/`·`backend/src/Db.php`. 읽기 전용. 배제: `_be_*/`·`clean_src/`·`backup/`.
- 방법: ai/ml/model/recommend/predict/optimize/xai/explainab/feature.store/dataset/drift/confidence 다중 grep + AI 인프라(ModelMonitor/ClaudeAI/DataPlatform/Risk)·authz(TeamPermissions/AccessReview) 정독. 2 Explore 스레드(38 tool-use) 상호검증. 라인 실측.

## 1. 핵심 판정 요약

**인가/RBAC AI 거버넌스(role/permission 최적화 추천·authz risk/threat/compliance 예측·SoD 추천·XAI·Human Approval Gateway·Continuous Learning)는 대부분 부재(ABSENT)다.** 인가 계층은 전부 **결정론적 rule-based**이며, 존재하는 ML/XAI는 **전부 마케팅·커머스 도메인**이다.

- **PARTIAL 2종(authz 본류)**: AccessReview classify(결정론적 임계 proto-recommendation·AI 아님)·maker-checker(Human Approval substrate·AI 미배선).
- **재사용 도메인중립 ML 인프라(authz 미배선)**: ModelMonitor 드리프트/재학습·ClaudeAI LLM/quota·risk_model_registry 버전 레지스트리 패턴·DataPlatform quality gate. 전부 마케팅 모델 대상.
- **대량 KEEP_SEPARATE**: 8개 마케팅 AI 엔진(GT②). 실 엔진은 도메인중립 인프라를 authz로 **재배선·신설(Extend)** 하되 마케팅 AI를 **흡수 금지**.

## 2. 실존 substrate 카탈로그

### A. authz proto-recommendation / 최적화 (PARTIAL — 결정론적·AI 아님)

| 파일:라인 | 심볼 | 설명 | Part3-15 매핑 |
|---|---|---|---|
| `backend/src/Handlers/AccessReview.php:87-122` · `:158` · `:162-163` | `classify`·`needs_review`·심각도 정렬 | EXPIRED/DORMANT(90d)/STALE_UNUSED/EXPIRING_SOON(14d) 실 필드 파생·검토후보 surfacing | Role/Permission Recommendation(§6·§7·proto·AI 아님) |
| `backend/src/Handlers/TeamPermissions.php:152-159` · `:810-831` | acl_permission·`reclampTeamMembers` | 정적 RBAC/ABAC·위임상한 재클램프 | Assignment/Scope(정적·추천 아님) |
| `backend/src/Handlers/TeamPermissions.php:356-373` · `:381-387` | `scopeWithinCap`·`assignableMap` | 수동 위임상한(추천 아님) | Scope Optimization(수동) |

### B. Human Approval substrate (PARTIAL — maker-checker·AI 미배선)

| 파일:라인 | 심볼 | 설명 | Part3-15 매핑 |
|---|---|---|---|
| `backend/src/Handlers/Mapping.php:238-294` · `:268-271` · `:287` | approve·self-approval 차단·정족수 | 서로 다른 2인·self 차단·dedup(실동작) | Human Approval Gateway(§19·재활용) |
| `backend/src/Handlers/Alerting.php:601-608` · `:634-641` · `:642-650` | 신원확인·dedup·quorum≥2 | maker-checker 완비 | Human Approval(재활용) |
| `backend/src/Handlers/AccessReview.php:177-242` · `:225` | decision(justification 필수)·SecurityAudit 이중기록 | 사유 필수 human 결정 게이트 | Human Approval·AI Evidence(§23) |

★대상이 mapping_change_request/action_request/수동 접근검토 — **AI 추천/자동변경 승인 게이트에 배선된 것 없음**(재활용 후보).

### C. 재사용 도메인중립 ML 인프라 (PRESENT·authz 미배선)

| 파일:라인 | 심볼 | 설명 | Part3-15 매핑 |
|---|---|---|---|
| `backend/src/Handlers/ModelMonitor.php:30-72` · `:142-158` · `:221-241` · `:244-291` · `:161-218` | ml_models/ml_model_metrics/ml_retrain_log 스키마·modelMetrics·drift report·`driftCheck`·`retrain` | drift_score/drift_status/retrain_threshold/auto_retrain 상태머신(도메인 컬럼 없음) | AI Drift Detection(§26)·Continuous Learning(§21) 참고 substrate |
| `backend/src/Handlers/ModelMonitor.php:183-194` · `:255-266` · `:293-313` | 운영 정직 폴백·`seedDemoModels` | 미연결 시 mt_rand 날조 금지·queue만(seed=이탈/전환/추천/LTV/ROAS 마케팅) | 정직 폴백 패턴 참고 |
| `backend/src/Handlers/ClaudeAI.php:70` · `:542` · `:564` · `:597-666` · `:20` · `:46` | `complete`·quotaGate·quotaConsume·callClaude(Tools)·모델상수·apiKey | LLM 호출/quota/키관리 코어(도메인중립) | XAI 설명생성(§17)·Recommendation infra 참고 |
| `backend/src/Handlers/DataPlatform.php:23-70` · `:231-346` | data_source·tenant_business_profile·`dataQuality`·`dataLineage` | 데이터 소스 카탈로그+품질/신뢰 게이트(**ML feature store 아님**) | AI Feature Store(§4)·Dataset(§?) 참고(소비=마케팅) |

### D. 모델 버전 레지스트리 (PRESENT·마케팅 도메인·불변강제 없음)

| 파일:라인 | 심볼 | 설명 | Part3-15 매핑 |
|---|---|---|---|
| `backend/src/Db.php:448-456` · `:463` | `risk_model_registry`(model_name/model_version/is_deployed/metrics_json/training_range_json)·risk_prediction.model_version | 배포모델 버전·메트릭·학습범위 레지스트리(risk_prediction 스탬핑) | AI Model/Model Version(§2·패턴 참고) |
| `backend/src/Handlers/Risk.php:81` · `:118` · `:149-152` · `:175` | 배포모델 조회·model_version 스탬핑 | is_deployed=1 조회·예측시 버전 기록 | Model Version 패턴(★마케팅 fraud 도메인 KEEP_SEPARATE) |
| `backend/src/Handlers/ModelMonitor.php:35` | ml_models.version(단일 컬럼·이력 아님) | 모델당 1행 갱신 | Model Version(부분) |

### E. authz risk 라벨·compliance (PARTIAL — 예측 아님)

| 파일:라인 | 심볼 | 설명 | Part3-15 매핑 |
|---|---|---|---|
| `backend/src/Handlers/UserAuth.php:4165` · `:4174` · `:4190-4191` · `:4150` · `:4203` | auth_audit_log.risk(정적 라벨)·audit·logAudit SSOT | 호출측 'high' 리터럴·**예측 없음** | Risk Forecast(§12·정적·예측 ABSENT) |
| `backend/src/Handlers/Compliance.php:53-130` · `:120` | posture(control introspection+정적 SOC2/ISO 매핑+산술 readiness%) | ML 아님 | Compliance Forecast(§14·정적·예측 ABSENT)·AI Evidence |

## 3. 종합 판정

**Authorization AI Governance = ABSENT-greenfield / PARTIAL-substrate / 대량-KEEP_SEPARATE(마케팅 AI).** AI Governance Registry·authz Feature Store·ML Dataset·Policy/Role/Permission/Scope/Assignment Recommendation(AI)·authz Risk/Threat/Compliance Prediction·SoD Recommendation·JIT Optimization·XAI·AI Confidence·Human Approval Gateway(AI배선)·Autonomous Optimization·Continuous Learning·AI Snapshot/Evidence/Digest/Analytics/Drift/Simulation·immutable model store 전부 순신규. 재활용(흡수 아님·재배선/확장): AccessReview classify(§A·proto)·maker-checker(§B·Human Approval)·ModelMonitor 드리프트/재학습(§C)·ClaudeAI LLM/quota(§C·XAI infra)·risk_model_registry 버전패턴(§D)·DataPlatform quality(§C)·SecurityAudit(AI Evidence). 실 엔진은 이 도메인중립 인프라를 authz 데이터(acl_permission/auth_audit_log/access_review_item)로 재배선하고, human approval을 AI 게이트에 배선하며, XAI/confidence/immutable model store를 신설한다. 마케팅 AI 8종(GT②)은 **흡수 금지**.
