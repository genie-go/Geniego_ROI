# ADR — MEA Part 051 Enterprise AI Platform Foundation Architecture

> **거버넌스 상태**: 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★부재증명 완료·오흡수 금지·과대주장 금지·헌법 V4/V5/CHANGE_GATE 우선. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE 최우선.**

## Context
MEA Part 051은 전 AI(ML/DL/Generative/Agent/Decision/ROI Intelligence)를 통합하는 형식 Enterprise AI Platform(GPU 인프라·클러스터·Model Serving Runtime·AI Workspace·Experiment Mgmt)을 표준화하려 한다. GeniegoROI의 AI 능력은 강하게 실재하나 **외부 LLM API(Anthropic)+통계 모델**이며, self-hosted GPU 딥러닝 서빙/클러스터/형식 AI 플랫폼 인프라는 부재(단일호스트·GPU 부재·Part 044/050 승계).

## D-1 AI 능력은 강하게 실재·형식 AI Platform Infrastructure는 순신설
**결정**: AI 능력=`ClaudeAI`(마케팅 LLM)·`AiGenerate`(Generative)·`ModelMonitor`(ML drift/retrain·ml_models 3테이블)·`AutoRecommend`·`Decisioning`(v418.1)·`DemandForecast`(Holt-Winters)·`Mmm`·`Attribution`(Markov)·`Risk`=재사용(★중복 AI 엔진 절대 금지·[[feedback_no_duplicate_features]]). 형식 GPU Resource Mgmt·AI Cluster·Distributed Computing·Model Serving Runtime(self-host)·형식 Model Repository·Experiment Mgmt·AI Workspace/Developer Portal·AI Endpoint 표준=부재(부재증명 완료)·순신설이나 GPU/멀티노드 인프라 선행 종속.

## D-2 ★★마케팅 AI(ClaudeAI)/dev AI(Claude Code) KEEP_SEPARATE (헌법·최우선)
**결정**: `ClaudeAI`(운영 마케팅 인텔리전스·Anthropic Claude·고객 대상)와 dev AI(Claude Code·개발 도구·본 세션 주체)는 **절대 혼합 금지**(헌법 Volume 4/5·데이터 헌법). 본 Part의 "AI Platform"은 운영 마케팅/ML AI 자산 대상이지 개발 도구 AI 아님. ★AI Agent Integration/Multi-LLM Integration은 `ClaudeAI` 확장·dev AI 흡수 금지.

## D-3 ml_models 테이블·외부 LLM API·통계 모델 ≠ 형식 AI Platform Infra (★오흡수 금지)
**결정**: `ModelMonitor`의 ml_models/ml_model_metrics/ml_retrain_log(259/288차·drift/retrain 모니터)는 **경량 모델 메타 registry seed**이지 형식 Model Repository/GPU Cluster/Experiment Tracking 아님. 외부 Anthropic API(`ClaudeAI`)≠self-host Model Serving Runtime/GPU Inference. 통계 모델(Holt-Winters `DemandForecast`·Markov `Attribution`·MMM 탄력성 `Mmm`)≠Deep Learning/Computer Vision. ★전부 seed·형식 AI Platform 인프라 아님·과대주장 금지.

## D-4 Decisioning은 집계·Human-in-the-Loop·자율 의사결정 아님 (재감사 금지·v418.1)
**결정**: `Decisioning`(v418.1)은 집계 cohort 기반 추천이지 PII 저장/자율 집행 아님([[feedback_pm_operational_rules]]·No-PII). ★AI는 승인 없이 운영 정책 자동 변경/중요 의사결정 단독 수행 불가=헌법 V5(안전 자동화)+`CHANGE_GATE`+마케팅 자동화 안전장치(Volume 5). v418.1 집계-only 설계 재감사 금지.

## D-5 AI Data Security는 Part 049/047 상속·중복 금지
**결정**: AI Data Encryption=`Crypto`(Part 049)·Tenant Isolation=`Db`·RBAC/중앙 IAM=`index.php`(Part 047)·Secret Mgmt=CRED_ENC_KEY(Part 049·중앙 KMS 부재)·Audit=`SecurityAudit`(Part 048). ★중복 암호화/IAM/Audit 엔진 신설 금지·Secure Model Storage(형식)만 순신설.

## Consequences
- 코드 변경 0·NOT_CERTIFIED. ★AI 능력 강하게 실재이나 형식 AI Platform 인프라(GPU/클러스터/서빙 런타임/워크스페이스/실험관리)는 부재·GPU/멀티노드 선행 종속.
- ★중복 금지: `ClaudeAI`·`ModelMonitor`·`AutoRecommend`·`Decisioning`·`DemandForecast`·`Mmm`·`Attribution`·`Risk`·`AiGenerate` 재사용(중복 AI 엔진 신설 금지).
- ★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·AI 운영 정책 자동 변경/단독 의사결정 불가(V5+CHANGE_GATE). Part 044/047/048/049/050 상속·재감사 금지.
