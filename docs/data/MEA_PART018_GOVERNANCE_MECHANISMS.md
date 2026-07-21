# MEA Part 018 — Governance Mechanisms (§7~§18 통합)

> **거버넌스 상태**: 거버넌스 메커니즘 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★추천(`AutoRecommend`/`Mmm`)·룰엔진(`RuleEngine`)·의사결정(`Decisioning`)·근거(`Insights`)·SecurityAudit 재사용(★중복 추천/룰엔진 절대 금지)·형식 통합 Decision Engine 신설(추천 재구현 없이·Authority foundation 종속).

## §7 Workflow 거버넌스
Request→데이터→KPI/ROI→Rule 평가→시나리오→추천→영향도→승인/검토→Audit→실행. 현행=`AutoRecommend`(요청→추천)·`RuleEngine`(조건→액션→rule_log)·KPI/ROI=`Rollup`/`Pnl`(SSOT). ★승인=EPIC 06-A(Human-in-the-Loop·헌법 V5). 형식 통합 Workflow Manager=순신설.

## §8 Recommendation 거버넌스
Best Action/ROI 우선순위/Profit/Cost/Resource/Budget Allocation/Campaign/Logistics/Pricing/Investment. 현행=`AutoRecommend`(ROI 기반·benchmark·learned prior·guardrails)·Budget=`Mmm`(frontier)·Pricing=`PriceOpt`. ★근거(Evidence) 필수=`Insights`(aggregate)+XAI(헌법 V4). ★마케팅 폐루프(251차) 재사용. 중복 추천 금지.

## §9 Simulation 거버넌스
What-if/Multi Scenario/Risk/Benefit/Cost Impact/ROI Comparison/Capacity/Sensitivity. 현행=`Mmm`(PROFIT(T)·ROI 비교)·`DemandForecast`(Capacity·Part 017). ★Simulation 독립 저장·형식 Decision Simulation Engine(Monte Carlo)=순신설.

## §10 Governance 거버넌스 (★Authority ABSENT)
Decision Policy/Approval Workflow/Decision Authority/Delegation/Compliance/Regulatory/Business Rule Version/Lifecycle. 현행=승인정책(EPIC 06-A·헌법 V5 안전 자동화=검증데이터+승인정책+로그+롤백)·Delegation=RBAC 부여상한(289차 12회차). ★**Decision/Approval Authority 개념=ABSENT**(289차 11회차·오탐 금지). 형식 Governance Manager=선행 Authority foundation 종속.

## §11 Knowledge Base 거버넌스
Business Rule/Decision Pattern/Historical/Success·Failure Case/AI Recommendation History/Expert Knowledge/Best Practice. 현행=`RuleEngine`(rule_engine·rule_log)·`AutoRecommend`(learned prior·251차 폐루프)·챗봇 지식(270차·[[reference_chatbot_knowledge_pipeline]]). 형식 Decision Knowledge Repository=순신설.

## §12 Security 거버넌스
Tenant=`Db.php`([[reference_platform_growth_actas_tenant_hijack]])·RBAC=`index.php`(viewer<connector<analyst<admin+writeGuard)·Decision Audit=`SecurityAudit::verify`(★유일 tamper-evident·[[reference_menu_audit_log_not_tamper_evident]])·Knowledge Encryption=`Crypto`(AES-256-GCM)·Policy Protection=git+`CHANGE_GATE`.

## §13 Runtime 거버넌스
요청 검증·Rule Engine·KPI/ROI 검증·추천안·영향도·Audit. Rule=`RuleEngine`·추천=`AutoRecommend`/`Mmm`·KPI/ROI=`Rollup`/`Pnl` SSOT·품질=Trust First(Part 006/015)·Audit=`SecurityAudit`.

## §14 API 거버넌스 (8)
Create Decision Request/Execute Analysis/Query Recommendation/Execute Simulation/Query History/Register Rule/Update Policy/Executive Dashboard. 현행=`AutoRecommend`(/v424/marketing/auto-recommend)·`RuleEngine`(/v424/rules·GET/POST/PUT/DELETE/run/logs)·`Mmm`(/v424/mmm/frontier) 실재. Part 001 API 표준(`/api` 접두·[[reference_api_prefix_routing]]) 상속.

## §15 Event 거버넌스 (8)
DecisionRequested/Analyzed/RecommendationGenerated/Approved/Rejected/SimulationCompleted/DecisionExecuted/DecisionAudited. 현행=`RuleEngine`(트리거→액션·rule_log)=DecisionExecuted seed(동기·event-driven 부재). Data Platform §15 정합.

## §16 AI 거버넌스
최적 추천/패턴/위험 예측/KPI·ROI 영향/Rule 충돌 탐지/Explainable/Best Practice. 현행=추천=`AutoRecommend`·이상=`AnomalyDetection`·Explainability=헌법 V4. ★AI는 최종 의사결정 승인/자동 실행 불가=헌법 V5(안전 자동화·승인정책 존중)+V3+`CHANGE_GATE`(Human-in-the-Loop). 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## §17~§18 성능·완료
성능=`AutoRecommend`·`RuleEngine` seed(벤치 대상 미존재). 완료=형식 통합 Decision Engine/Knowledge Base/Simulation/Governance Manager 구현 시(부분 충족·코드 0). ★단 추천·룰엔진·의사결정 스코어는 실재.

## 판정
전 메커니즘 **설계-only·코드 0·NOT_CERTIFIED.** ★추천(`AutoRecommend`/`Mmm`)·룰엔진(`RuleEngine`)·의사결정 스코어(`Decisioning`)·근거(`Insights`)·Audit(`SecurityAudit`) 재사용·승격(★중복 추천/룰엔진 절대 금지=값 분산=회귀)·형식 통합 Enterprise Decision Engine/Knowledge Repository/Simulation Engine/Governance Manager만 신설(추천 재구현 없이·Decision Authority foundation 선행 종속). Part 013~017/Data Platform/헌법 상속·재정의 금지·★AI 최종 의사결정 승인/자동 실행 불가(V5+V3+CHANGE_GATE·Human-in-the-Loop).
