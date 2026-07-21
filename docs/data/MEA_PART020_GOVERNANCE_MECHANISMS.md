# MEA Part 020 — Governance Mechanisms (§7~§18 통합)

> **거버넌스 상태**: 거버넌스 메커니즘 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★폐루프 최적화(`AutoRecommend` 자가학습·`Mmm` optimize/frontier)·개선 측정(`AbTesting`)·성과(`Rollup`/`Pnl`)·SecurityAudit 재사용(★중복 최적화/추천 절대 금지)·형식 Continuous Improvement 계층 신설(최적화 재구현 없이).

## §7 Closed-Loop Workflow 거버넌스
KPI/ROI 분석→Gap 식별→개선 목표→시나리오→ROI 영향→Action 추천→승인→실행→성과 측정→지속 개선. ★현행=`AutoRecommend`(자가학습 폐루프·실행 성과→EWMA prior 정밀화·다음 Cycle 입력·251차)·`Mmm`(optimize/frontier)·승인=헌법 V5(Human Approval). ★무회귀(MIN_PRIOR_SAMPLE 미만=전역 benchmark) 준수. 형식 통합 Workflow=순신설.

## §8 Goal Management 거버넌스
Strategic/Business/Department/Team/Individual Goal·Alignment/Tracking/Achievement. 현행=objective 퍼널(220차)+`AutoRecommend`. ★Goal=KPI/ROI 연결(Part 015·Part 013). 형식 Goal Management Service=순신설(중복 KPI 집계 금지).

## §9 Action Recommendation 거버넌스
Cost Reduction/Revenue Growth/Resource/Budget Reallocation/Campaign/Inventory/Logistics/Workforce/Pricing/AI Model Optimization. 현행=Budget Reallocation=`Mmm::optimize`(greedy allocate)·Campaign=`AutoRecommend`/`AutoCampaign`·Pricing=`PriceOpt`·Inventory=`Wms`. ★예상 ROI+기대 효과=`Mmm`(frontier) 필수. 중복 추천 금지.

## §10 Improvement Tracking 거버넌스
Planned/Actual/ROI·KPI Improvement/Completion/Benefit Realization/Cost·Time Saving/Productivity/CSAT. 현행=실측 성과=`Rollup`/`Pnl`(SSOT)·A/B=`AbTesting`. ★형식 Performance Improvement Tracker(Planned vs Actual·Benefit Realization)=순신설(중복 성과 계산 금지·SSOT 파생).

## §11 Continuous Monitoring 거버넌스
Goal Achievement/ROI·KPI Trend/Improvement Progress/Benefit/Success Rate/Risk/Continuous Improvement Score. 현행=Trend=`Rollup`·Risk=`Alerting`/`AnomalyDetection`·A/B 성공률=`AbTesting`. 형식 Continuous Improvement Score=순신설.

## §12 Security 거버넌스
Tenant=`Db.php`([[reference_platform_growth_actas_tenant_hijack]])·RBAC=`index.php`(viewer<connector<analyst<admin+writeGuard)·Optimization Audit=`SecurityAudit::verify`(★유일 tamper-evident·[[reference_menu_audit_log_not_tamper_evident]])·Executive Approval Control=헌법 V5(승인정책+로그+롤백)·Improvement Plan Protection=git+`CHANGE_GATE`·Masking=`ChannelCreds`.

## §13 Runtime 거버넌스
Performance Gap 분석·Goal Alignment·ROI 영향 계산·Recommendation·Improvement 상태·Audit. ROI 영향=`Mmm`(frontier)·Recommendation=`AutoRecommend`·Gap=`Rollup` vs 목표·Audit=`SecurityAudit`·품질=Trust First(Part 006/015).

## §14 API 거버넌스 (8)
Create Improvement Goal/Execute Optimization Analysis/Generate Recommendation/Execute Simulation/Query Status/Update Plan/Dashboard/Query Audit. 현행=`Mmm`(/v424/mmm/optimize·/frontier)·`AutoRecommend`(/v424/marketing/auto-recommend)·`AbTesting` API 실재·Goal/Plan/Status(형식)=순신설. Part 001 API 표준(`/api` 접두·[[reference_api_prefix_routing]]) 상속.

## §15 Event 거버넌스 (8)
ImprovementGoalCreated/OptimizationStarted/RecommendationGenerated/ImprovementApproved/ImprovementExecuted/BenefitMeasured/OptimizationCompleted/OptimizationAudited. 현행=`AutoRecommend` 자가학습(cron)=OptimizationCompleted seed(동기·event-driven 부재). Data Platform §15 정합.

## §16 AI 거버넌스
최적 개선안/ROI 향상 예측/Goal 우선순위/Cost Saving/Resource Allocation/Action 효과 예측/Best Practice/Continuous Improvement Report. 현행=개선 추천=`AutoRecommend`(자가학습)·Resource=`Mmm::optimize`·ROI 예측=`Mmm`(frontier)·Explainability=헌법 V4. ★AI는 개선 계획 자동 승인/운영 직접 적용 불가=헌법 V5(안전 자동화·검증데이터+승인정책+로그+롤백)+V3+`CHANGE_GATE`(Human Approval). 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## §17~§18 성능·완료
성능=`Mmm`·`AutoRecommend` seed(벤치 대상 미존재). 완료=형식 Continuous Improvement Manager/Goal Management/Improvement Tracker 구현 시(부분 충족·코드 0). ★단 폐루프 최적화·자가학습은 실재(251차 차별점).

## 판정
전 메커니즘 **설계-only·코드 0·NOT_CERTIFIED.** ★폐루프 최적화(`AutoRecommend` 자가학습·`Mmm` optimize/frontier)·개선 측정(`AbTesting`)·성과(`Rollup`/`Pnl`)·승인정책(헌법 V5)·Audit(`SecurityAudit`) 재사용·승격(★중복 최적화/추천/성과 계산 절대 금지=값 분산=회귀)·형식 Enterprise ROI Optimization Engine/Continuous Improvement Manager/Goal Management Service/Improvement Tracker만 신설(최적화 재구현 없이). Part 013~019/Data Platform/헌법 상속·재정의 금지·★AI 개선 계획 자동 승인/직접 적용 불가(V5+V3+CHANGE_GATE·Human Approval). ★ROI Intelligence Platform(Part 013~020) 설계 완료.
