# MEA Part 018 — Enterprise Decision Intelligence Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **MEA Part 013(ROI)+014(Calc)+015(KPI)+016(Profit)+017(Forecast)+Data Platform(001~012)**을 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). ★**추천/룰엔진/의사결정은 이미 실재**(GT①·`AutoRecommend`·`RuleEngine`·`Decisioning`·`Mmm`)·본 Part는 형식 통합 Decision Engine·Knowledge Base 계층만 추가(추천 재구현 없이). file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
전 데이터 기반 경영진/운영 조직 최적 의사결정 지원. ROI Platform 최상위 의사결정 계층·Enterprise Decision Framework 표준.

## §2 구현 범위
Enterprise Decision Engine · Decision Intelligence · Business Rule Engine · Recommendation Engine · Decision Workflow/Simulation/Knowledge Base/Governance · Executive Decision Dashboard · AI Decision Advisor.

## §3 구현 목표 (10)
Decision Intelligence Engine · Business Rule Engine · Decision Recommendation Engine · Decision Workflow Manager · Decision Knowledge Repository · Decision Simulation Engine · Executive Decision Dashboard · Decision Audit Service · Decision Governance Manager · AI Decision Advisor.

## §4 아키텍처 원칙 (10)
Data Driven Decision · Explainable Decision · Evidence Based Recommendation · Business Outcome First · Policy Driven · **Human in the Loop** · Metadata Driven · Event Driven · AI Assisted · Enterprise Standard.

## §5 Canonical Entity (15)
DECISION · DECISION_REQUEST · DECISION_RESULT · DECISION_OPTION · DECISION_SCENARIO · DECISION_POLICY · DECISION_RULE · DECISION_SCORE · DECISION_PRIORITY · DECISION_APPROVAL · DECISION_REASON · DECISION_AUDIT · DECISION_KNOWLEDGE · DECISION_RECOMMENDATION · DECISION_STATUS. → 상세 = `MEA_PART018_CANONICAL_ENTITIES.md`.

## §6 Decision Domain (12)
Executive/Financial/Marketing/Sales/Commerce/Logistics/Customer/AI/Operations/Investment/Risk/Enterprise Decision. 공통 프레임워크. → ★현행=Marketing=`AutoRecommend`/`Mmm`·Commerce/Logistics=`RuleEngine`(reorder/pause_channel)·Customer=`Decisioning`(segment)·Financial=`Pnl`/`Mmm` frontier.

## §7 Decision Workflow (10)
Request→데이터 수집→KPI/ROI 분석→Rule 평가→시나리오→추천안→영향도→승인/검토→Audit→실행 전달. → ★현행=`AutoRecommend`(budget/objective→추천·guardrails)·`RuleEngine`(조건 평가→액션→rule_log)·승인=EPIC 06-A(승인정책·Human-in-the-Loop). 형식 통합 Workflow Manager=부분.

## §8 Recommendation Engine (10)
Best Action · ROI 우선순위 · Profit 최적화 · Cost 절감 · Resource/Budget Allocation · Campaign/Logistics Optimization · Pricing/Investment Recommendation. **근거(Evidence) 필수.** → ★현행=`AutoRecommend`(ROI 기반·benchmark·learned prior·GT①)·Budget Allocation=`Mmm`(frontier·T*)·Pricing=`PriceOpt`·근거=`Insights`(aggregate·XAI 헌법 V4). 실재 강함.

## §9 Decision Simulation (8)
What-if · Multi Scenario · Risk/Benefit/Cost Impact Analysis · ROI Comparison · Capacity Impact · Sensitivity. Simulation 독립 저장. → ★현행=`Mmm`(PROFIT(T) 시나리오·ROI 비교)·`DemandForecast`(Capacity)·What-if(형식)=Part 017 상속. 형식 Decision Simulation Engine=ABSENT.

## §10 Decision Governance (8)
Decision Policy · Approval Workflow · Decision Authority · Delegation Rule · Compliance Check · Regulatory Validation · Business Rule Version · Decision Lifecycle. → ★현행=승인정책(EPIC 06-A·헌법 V5 안전 자동화)·★Decision/Approval Authority 개념=**ABSENT**(289차 11회차 판정)·Delegation=RBAC 부여상한(289차 12회차). 형식 Governance Manager=ABSENT.

## §11 Knowledge Base (8)
Business Rule · Decision Pattern · Historical Decision · Success/Failure Case · AI Recommendation History · Expert Knowledge · Best Practice. 지속 축적. → ★현행=`RuleEngine`(rule_engine·rule_log)·`AutoRecommend`(learned prior·251차 폐루프)·챗봇 지식(270차). 형식 Decision Knowledge Repository=ABSENT.

## §12 Data Security
Tenant Isolation · RBAC · Decision Audit Logging · Sensitive Decision Masking · Policy Protection · Knowledge Repository Encryption. → ★Part 001~017 상속: Tenant=`Db.php`·RBAC=`index.php`·Audit=`SecurityAudit`·Encryption=`Crypto`·Policy Protection=git+`CHANGE_GATE`.

## §13 Runtime 규칙
요청 검증 · Rule Engine 실행 · KPI/ROI 검증 · 추천안 생성 · 영향도 분석 · Audit. → ★Rule=`RuleEngine`·추천=`AutoRecommend`/`Mmm`·KPI/ROI=`Rollup`/`Pnl`(SSOT)·Audit=`SecurityAudit`. 품질 게이트=Trust First(Part 006/015).

## §14 API 표준 (8)
Create Decision Request · Execute Decision Analysis · Query Recommendation · Execute Simulation · Query History · Register Business Rule · Update Decision Policy · Get Executive Dashboard. → ★현행=`AutoRecommend`(/v424/marketing/auto-recommend·GT①)·`RuleEngine`(/v424/rules·GET/POST/PUT/DELETE/run/logs·GT①)·`Mmm`(/v424/mmm/frontier) 실재. Part 001 API 표준(`/api` 접두) 상속.

## §15 Event 표준 (8)
DecisionRequested · DecisionAnalyzed · RecommendationGenerated · DecisionApproved/Rejected · SimulationCompleted · DecisionExecuted · DecisionAudited. → ★현행=`RuleEngine`(트리거→액션·rule_log)=DecisionExecuted seed(동기·event-driven 부재). Data Platform §15 정합.

## §16 AI Integration
최적 의사결정 추천 · Decision Pattern 분석 · 위험 예측 · KPI/ROI 영향 분석 · Rule 충돌 탐지 · Explainable Recommendation · Best Practice 추천. **AI는 최종 의사결정 승인/자동 실행 불가.** → ★현행=추천=`AutoRecommend`/`Mmm`·이상=`AnomalyDetection`·Explainability=헌법 V4·★자동 실행/승인 불가=헌법 V5(안전 자동화·승인정책 존중)+V3+`CHANGE_GATE`. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §17 성능 요구사항
Recommendation ≤2초 · Simulation ≤5초 · Rule Engine ≤300ms · Dashboard ≤2초 · History ≤500ms · Availability ≥99.99%. (현행 `AutoRecommend`·`RuleEngine` seed.)

## §18 Completion Criteria
Decision Engine·Recommendation·Rule Engine·Simulation·Knowledge Base·Governance·Security·Runtime·API/Event·AI 구현. → **부분 충족**(추천/룰엔진=`AutoRecommend`/`RuleEngine` 실재·형식 통합 Decision Engine·Knowledge Base·Simulation·Governance Manager=미완). 코드 0.

## 판정
**PARTIAL(★추천 실재=`AutoRecommend`(ROI 기반·benchmark·learned prior·guardrails)·Budget Allocation=`Mmm`(frontier)·Rule Engine=`RuleEngine`(IF-THEN·rule_engine·ACTIONS·rule_log·tenant 격리)·의사결정 스코어=`Decisioning`(segment·no-PII)·근거=`Insights`(aggregate·XAI 헌법 V4)·Human-in-the-Loop=헌법 V5 승인정책) / ABSENT-formal(형식 통합 Enterprise Decision Engine·Decision Knowledge Repository·Decision Simulation Engine·★Decision/Approval Authority(EPIC 06-A 판정 ABSENT)·Decision Governance Manager·Event 표준).** ★핵심=추천·룰엔진·의사결정 스코어는 **실재**(마케팅 폐루프 251차·guardrail 안전장치)이나 형식 통합 Decision Intelligence Engine·Knowledge Base·Governance Manager는 부재(Part 013~017 동일 판정·EPIC 06-A Approval Authority 부재 정합). Part 013~017/Data Platform 상속(재정의 금지)·★중복 추천/룰엔진 절대 금지(값 분산=회귀)·마케팅 AI KEEP_SEPARATE·★AI 최종 의사결정 승인/자동 실행 불가(V5+V3+CHANGE_GATE·Human-in-the-Loop). 코드 변경 0.

## 다음
MEA Part 019 — Enterprise Executive Intelligence & Strategic Dashboard Architecture(본 Decision Intelligence 상속·확장).
