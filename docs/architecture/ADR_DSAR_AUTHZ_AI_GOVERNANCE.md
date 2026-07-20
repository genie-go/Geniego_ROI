# ADR — Authorization AI Governance & Autonomous Optimization Foundation

- **Status**: PROPOSED · NOT_CERTIFIED · BLOCKED_PREREQUISITE (설계 명세 · 코드 변경 0)
- **EPIC**: 06-A-03-02-03-04 Part 3-15
- **Date**: 2026-07-20
- **상위 SPEC**: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md` (canonical 원문 verbatim · Version 1.0)
- **Ground-Truth**: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
- **선행 계보**: Part 1~3-13 · **3-14(Observability)** — AI 학습 데이터원

---

## 1. Context

GeniegoROI의 인가는 **전부 결정론적 rule-based**이며, AI/ML 기반 인가 거버넌스(role/permission 최적화 추천·authz risk/threat/compliance 예측·SoD 추천·XAI·Human Approval Gateway·Continuous Learning)는 부재하다. 저장소는 마케팅/커머스 AI 플랫폼이라 AI/ML/recommendation/prediction/model이 대량 존재하나 **거의 전부 마케팅 도메인**(AutoRecommend/Mmm/CustomerAI/Decisioning/AnomalyDetection/Risk/DemandForecast/GraphScore)이며 authz와 데이터 소스·목적이 완전히 분리된다. authz축의 유일 근접물은 AccessReview classify(결정론적 임계 proto-recommendation)와 maker-checker(Human Approval substrate·AI 미배선)뿐이다.

본 ADR은 **Authorization AI Governance & Autonomous Optimization** — 인가 환경을 지속 학습·분석해 정책/역할/권한을 최적화 추천하고 risk/threat/compliance를 예측하되, 모든 추천은 Explainable(XAI)하고 자동변경은 Human Approval/Governance Rule을 통과하는 Autonomous Authorization Control System — 의 거버넌스 기반을 정의한다. ISO/IEC 42001·NIST AI RMF 참조. Part 3-14 Observability 이벤트가 AI 학습 데이터원, Part 3-8~3-13 통제가 최적화 대상.

## 2. Ground-Truth 판정 (2 스레드 상호검증)

### 2.1 실존 substrate (GT①)
- **authz PARTIAL 2종**: AccessReview classify(`AccessReview.php:87-122`·proto-recommendation)·maker-checker(`Mapping.php:268-271`·`Alerting.php:642-650`·`AccessReview.php:177-242`·Human Approval·AI 미배선).
- **재사용 도메인중립 ML 인프라(authz 미배선)**: ModelMonitor 드리프트/재학습(`ModelMonitor.php:30-291`)·ClaudeAI LLM/quota(`ClaudeAI.php:70`·`:542-666`)·risk_model_registry 버전패턴(`Db.php:448-456`·`Risk.php:149-187`)·DataPlatform quality(`DataPlatform.php:231-346`).
- **AI Evidence**: SecurityAudit(`AccessReview.php:225`)·logAudit(`UserAuth.php:4203`).

### 2.2 거버넌스 계층 (GT②)
AI Governance Registry·Feature Store·ML Dataset·Recommendation/Prediction 엔진·XAI·Confidence·Human Approval Gateway(AI 배선)·Autonomous Optimization·Continuous Learning·AI Snapshot/Evidence/Digest/Analytics/Drift/Simulation·immutable model·Guard/Lint = **grep 0(authz)**.

### 2.3 종합
**판정 = ABSENT-greenfield / PARTIAL-substrate / 대량-KEEP_SEPARATE(마케팅 AI).**

## 3. Decision

### D-1. 도메인중립 ML 인프라를 authz로 재배선 (Extend, 대체 아님)
ModelMonitor 드리프트/재학습(`ModelMonitor.php:30-291`)·risk_model_registry 버전패턴(`Db.php:448-456`)·DataPlatform quality(`DataPlatform.php:231-346`)를 **authz 데이터(acl_permission/auth_audit_log/access_review_item)로 재배선**해 AI Drift(§26)·Model Version(§2)·Feature Store(§4)를 신설. 마케팅 seed·소비는 KEEP_SEPARATE.

### D-2. AccessReview classify를 AI Recommendation의 결정론 baseline로 승격
`AccessReview.php:87-122`(결정론적 임계 proto-recommendation)를 Role/Permission Recommendation(§6·§7)의 baseline로 승격·AI 모델로 확장(unused role/duplicate permission/least-privilege). XAI(§17)로 confidence/근거/feature 제공.

### D-3. Human Approval Gateway를 AI 추천 승인에 배선
maker-checker(`Mapping.php:268-271`·`Alerting.php:642-650`)·AccessReview decision(`:177-242` justification 필수)을 **AI 추천/자동변경 승인 게이트(§19)** 에 배선. Critical Policy/SoD Rule/Production Permission/Global Scope는 Human Approval 필수(§19)·Autonomous 자동수행 금지(§20).

### D-4. XAI/Confidence/Continuous Learning은 순신규 (LLM infra 재활용)
XAI(§17 recommendation/confidence/evidence/feature/benefit/risk)·AI Confidence(§18 0~100)·Continuous Learning(§21 10단계)는 순신규. XAI 설명생성은 ClaudeAI LLM/quota(`ClaudeAI.php:70`·`:542-666`) infra 재활용. ★근거없는 결론 금지(V4 헌법 Explainable AI 정합).

### D-5. Immutable Model/Dataset·AI Evidence는 SecurityAudit 확장
Immutable Model Version(§33)·Training Dataset·AI Evidence(§23)는 SecurityAudit 해시체인(`AccessReview.php:225` 참조패턴) 확장(현행 risk_model_registry·ml_models 가변→불변강제 신설).

### D-6. Part 1~3-14와의 관계 (학습 대상·무중복)
AI는 Observability(3-14) 이벤트를 학습 데이터원으로, RBAC/SoD(3-10)/JIT(3-9)/PDP(3-12)/Zero Trust(3-13) 통제를 최적화 대상으로 소비한다. 각 통제 엔진 재구현 금지(중복 금지). AI는 추천·예측만·집행은 기존 통제.

### D-7. 마케팅 AI 흡수 절대 금지 (KEEP_SEPARATE)
AutoRecommend/Mmm/CustomerAI/Decisioning/AnomalyDetection/Risk/DemandForecast/GraphScore(GT② §4)는 `performance_metrics`/`crm_*` 소스 마케팅 AI. authz AI로 **흡수·개명 금지**. ★특히 `Decisioning.php:433-477` "explainability"·`Risk.php:61-66` top_drivers는 마케팅 설명이지 authz XAI 아님(오흡수 최다 함정).

### D-8. 정직 분리
- **실재 과신 회피**: AccessReview classify=결정론적 임계(AI 아님)·maker-checker=AI 미배선·ML 인프라=마케팅 대상. authz AI 없음.
- **부재 과장 회피**: authz AI recommendation/prediction/XAI/feature store/immutable model grep 0은 실측 부재(그린필드).
- **오흡수 회피**: 마케팅 AI 8종·explainability/top_drivers는 authz AI 아님.

## 4. Consequences

- **긍정**: 지속 학습 기반 최소권한 최적화·risk 예측·설명가능·human 통제·규제준수(ISO 42001/NIST AI RMF). Autonomous Authorization Control.
- **비용**: 신규(AI Registry·Feature Store·Recommendation/Prediction 엔진·XAI·Confidence·Human Approval Gateway·Autonomous·Continuous Learning·Snapshot/Evidence/Digest/Analytics/Drift/Simulation·immutable model·Guard/Lint). ML 인프라 authz 재배선.
- **선행 의존**: Part 1~3-14 인증 후 실 구현(BLOCKED_PREREQUISITE). Observability(3-14) 이벤트가 학습원.
- **무후퇴**: 마케팅 AI·ModelMonitor·ClaudeAI·AccessReview·maker-checker·SecurityAudit 유지·병행. Extend-only.

## 5. Compliance / Certification

- **NOT_CERTIFIED**: 코드 변경 0. SPEC은 사용자 제공 canonical 원문 verbatim(Version 1.0).
- 하위 per-entity DSAR은 본 ADR + GT①② 등장 `파일:라인`만 인용(반날조).
- Completion Gate·Performance(Recommendation≤500ms·Accuracy≥95%)·AI Governance Validation(ISO 42001/NIST AI RMF/OWASP LLM Top10)·Regression은 실 구현 세션(RP-track) 조건.

---
**요약**: Authorization AI Governance = ABSENT-greenfield(AI Registry·Feature Store·Recommendation/Prediction 엔진·XAI·Confidence·Human Approval Gateway 배선·Autonomous·Continuous Learning·Snapshot/Evidence/Analytics/Drift/Simulation·immutable model·Guard/Lint 순신규) / PARTIAL(AccessReview classify proto·maker-checker·도메인중립 ML 인프라 미배선) / 대량 마케팅 AI KEEP_SEPARATE. Extend: ModelMonitor/risk_model_registry/DataPlatform→authz 재배선·classify→AI baseline·maker-checker→AI 승인 게이트·ClaudeAI LLM→XAI infra·SecurityAudit→immutable model/Evidence·Part1~3-14 학습/최적화(무중복). 코드0·NOT_CERTIFIED·선행의존. **마케팅 AI 8종·explainability/top_drivers 흡수 금지·근거없는 결론 금지(XAI).**
