# MEA Part 016 — Enterprise Profit Intelligence Engine Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **MEA Part 013(ROI Foundation)+Part 014(Calc Engine)+Part 015(KPI Management)+Data Platform(001~012)**을 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). ★**P&L SSOT는 이미 실재**(`Pnl.php`·grossProfit/operatingProfit/netProfit/VAT)·본 Part는 형식 Profit Intelligence 계층만 추가(값 재계산 없이). file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
매출/비용/이익/손실/투자/생산성을 통합 분석하여 실시간 수익성·경영 의사결정을 지원하는 표준. ROI Platform의 핵심 분석 엔진.

## §2 구현 범위
Profit Intelligence Engine · Profit/Cost/Revenue/Margin Analysis · Profit Attribution/Forecast/Optimization · Financial Intelligence · AI Profit Intelligence.

## §3 구현 목표 (10)
Profit Intelligence Engine · Revenue/Cost/Margin Analysis Engine · Profit Attribution Engine · Profit Forecast/Optimization Engine · Financial Intelligence Service · Profit Dashboard Service · AI Profit Advisor.

## §4 아키텍처 원칙 (10)
Profit First · Financial Accuracy · Explainable Analytics · Event Driven · Metadata Driven · Real-Time Intelligence · Predictive Analytics · AI Assisted · Enterprise Standard · Audit by Default.

## §5 Canonical Entity (15)
PROFIT_MODEL · PROFIT_RESULT · PROFIT_FACTOR · REVENUE_SOURCE · COST_CENTER · COST_ELEMENT · MARGIN · CONTRIBUTION_MARGIN · GROSS_PROFIT · OPERATING_PROFIT · NET_PROFIT · PROFIT_FORECAST · PROFIT_SCENARIO · PROFIT_ALERT · PROFIT_AUDIT. → 상세 = `MEA_PART016_CANONICAL_ENTITIES.md`.

## §6 Profit Domain (12)
Enterprise/Business Unit/Department/Product/Customer/Campaign/Channel/Region/Logistics/AI/Marketplace/Partner Profit. → ★현행=`Pnl`(P&L SSOT)·Product/Channel/Campaign=`Rollup`/`Attribution`·Customer=`CRM`(LTV)·모든 Profit 동일 계산기준=★무후퇴 단일소스.

## §7 Profit 분석 모델 (10)
Revenue Analysis · Cost Breakdown · Margin Analysis · Contribution Analysis · Break-even · Trend · Comparison · Variance · Sensitivity · Multi-Dimensional. → ★현행=`Pnl`(grossProfit=revenue−cogs·operatingProfit·netProfit·GT①)·Margin=`Pnl`·Trend=`Rollup`. Break-even/Variance/Sensitivity(형식)=ABSENT.

## §8 Cost Intelligence (10)
Fixed/Variable/Direct/Indirect/Operating/Marketing/Logistics/AI Operating/Customer Acquisition/Maintenance Cost. Cost Center·Cost Element 연결. → ★현행=`Pnl`(cogs·adSpend·platformFee·couponDiscount·returnFee·shippingCost·influencerCost 컴포넌트 조립·GT①)·CAC=`Rollup`. ★형식 Cost Center/Cost Element 테이블=ABSENT(비용=컴포넌트 조립).

## §9 Revenue Intelligence (10)
Gross/Net/Recurring/Subscription/Marketplace/Logistics/Service/Advertising/Commission/Partner Revenue. 제품/고객/채널/기간별. → ★현행=`Pnl`(revenue·netPayout)·`OrderHub`(주문매출)·Subscription=`Paddle`·채널별=`Rollup`/`ChannelSync`. Recurring/Commission 분해(형식)=부분.

## §10 Profit Attribution (8)
Revenue/Cost/Campaign/Channel/Customer/Product/AI Contribution/Organization Attribution. 원인(Factor) 추적. → ★현행=`Attribution.php`(UTM/Coupon/Deeplink·confidence)·Channel/Campaign=`Rollup`/`Mmm`. 형식 Profit Attribution(비용·이익 원인 추적)=순신설(★Attribution 재사용).

## §11 Forecast 및 Scenario (10)
Profit/Revenue/Cost/Margin Forecast · What-if · Best/Expected/Worst Case · Budget Comparison · Forecast Accuracy. → ★현행=`Mmm`(frontier·PROFIT(T) 곡선·T*·profitOptSpend·이익 예측 seed·GT①). 형식 Scenario/What-if/Best-Worst/Budget Comparison Engine=ABSENT.

## §12 Data Security
Financial Data Encryption · Tenant Isolation · RBAC · Audit Logging · Sensitive Financial Data Masking · Profit Formula Protection. → ★Part 001~015 상속: Encryption=`Crypto`(AES-256-GCM)·Tenant=`Db.php`·RBAC=`index.php`·Audit=`SecurityAudit`·Formula Protection=git+G2 sacred SHA+`CHANGE_GATE`.

## §13 Runtime 규칙
Revenue/Cost 검증 · Margin/Profit 계산 · Attribution 분석 · Forecast 생성 · Audit. → ★Profit 계산=`Pnl`(SSOT)·Attribution=`Attribution`·Forecast=`Mmm`·Audit=`SecurityAudit`. Revenue/Cost 검증(형식 게이트)=Trust First(Part 006/015).

## §14 API 표준 (8)
Execute Profit Analysis · Query Profit/Revenue/Cost · Generate Profit Forecast · Compare Profit Scenario · Query Attribution · Get Profit Dashboard. → ★현행=`Pnl` API(/v424/pnl/summary·/vat·GT①)·`Mmm` API(/v424/mmm/frontier)·`Attribution` API 실재·Scenario 비교=ABSENT. Part 001 API 표준(`/api` 접두) 상속.

## §15 Event 표준 (8)
ProfitCalculationStarted/Completed · RevenueUpdated · CostUpdated · ProfitForecastGenerated · MarginThresholdExceeded · ProfitScenarioEvaluated · ProfitAuditRecorded. → ABSENT(event-driven 부재·`Alerting` threshold=MarginThresholdExceeded seed). Data Platform §15 정합.

## §16 AI Integration
Profit 예측 · 비용 이상 탐지 · 수익 감소 원인 분석 · 이익 최적화 추천 · 가격 정책 영향 · 손익 시뮬레이션 · 투자 대비 효과 · **Explainable Profit Report**. **AI는 Profit 계산 결과를 임의 변경/승인 불가.** → ★현행=이익 최적화=`Mmm`(frontier·profitOptSpend)·비용 이상=`AnomalyDetection`·Profit OS=231차 AI Profit OS·Explainability=헌법 V4·직접 변경/승인 불가=헌법 V3+`CHANGE_GATE`. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §17 성능 요구사항
Profit 계산 ≤300ms · Forecast ≤3초 · Dashboard ≤2초 · Scenario ≤5초 · Availability ≥99.99%. (현행 `Pnl` 컴포넌트 조립·`Rollup` 사전집계 seed.)

## §18 Completion Criteria
Profit Intelligence/Revenue/Cost/Margin/Attribution/Forecast·Scenario/Security/Runtime/API·Event/AI 구현. → **현재 미충족**(형식 Profit Intelligence Engine·Cost Center·Scenario/Forecast Engine ABSENT·코드 0). ★단 P&L SSOT(`Pnl`)·이익 최적화(`Mmm`)·Attribution은 실 강함.

## 판정
**PARTIAL-strong(★P&L SSOT=`Pnl`·grossProfit/operatingProfit/netProfit/VAT·COGS·비용 컴포넌트 조립·이익 최적화=`Mmm` frontier/PROFIT(T)/T*·Attribution=`Attribution`·Margin=`Pnl`·Customer Profit=`CRM` LTV·AI Profit=231차 OS·Explainable=헌법 V4) / ABSENT-formal(형식 Profit Intelligence Engine·Cost Center/Cost Element 테이블·Contribution/Break-even/Variance/Sensitivity 모델·Profit Scenario/What-if Engine·형식 Profit Forecast Engine·Event 표준).** ★핵심=이익/매출/비용 **값**은 이미 서버 SSOT(`Pnl` 무후퇴 단일소스·VAT 267차·제품 핵심)·이익 최적화 프론티어(`Mmm`·경쟁사 미제공)는 실재이나 형식 metadata-driven Profit Intelligence Engine·Cost Center 계층·Scenario Engine은 부재(값 코드 내재·Part 013/014/015 동일 판정). Part 013/014/015/Data Platform 상속(재정의 금지)·★중복 이익/비용/매출 계산 절대 금지(값 분산=회귀)·마케팅 AI KEEP_SEPARATE·AI Profit 직접변경/승인 불가(V3+CHANGE_GATE). 코드 변경 0.

## 다음
MEA Part 017 — Enterprise Forecast & Predictive Intelligence Architecture(본 Profit Intelligence 상속·확장).
