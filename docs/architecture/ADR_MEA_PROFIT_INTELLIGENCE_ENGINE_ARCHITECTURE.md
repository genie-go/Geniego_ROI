# ADR — MEA Part 016 Enterprise Profit Intelligence Engine Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part016 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 016은 Profit Intelligence Engine(매출/비용/이익/손실/투자 통합 분석). ★"이익 계산"은 Part 013 ROI·Part 014 Calc Engine에서 반복 등장했고, 코드베이스에는 **`Pnl.php`가 P&L SSOT로 실재**(grossProfit=revenue−cogs·operatingProfit·netProfit·VAT·비용 컴포넌트 조립·GT①)하며, **`Mmm::frontier`가 이익 최적화(PROFIT(T) 곡선·T*·profitOptSpend)로 실재**(경쟁사 미제공·270차). Attribution=`Attribution.php`. 본 Part는 Part 013/014/015/Data Platform 상속(재정의 금지).

## 결정
- **D-1 (Part 013/014/015/Data Platform 재정의 금지):** 이익 값(Part 013)·Calc Engine(Part 014)·KPI(Part 015)·Metadata(Part 004)·Certification/Trust First(Part 006/008)를 준수·인용. Profit 도메인(§6)=실 핸들러 매핑. 중복 정의 금지.
- **D-2 (P&L SSOT = Pnl 승격·★중복 이익/비용/매출 계산 절대 금지):** 이익/매출/비용 값 = `Pnl.php`(grossProfit/operatingProfit/netProfit·COGS·VAT·비용 컴포넌트 조립). ★값은 무후퇴 단일소스([[feedback_no_regression_value_unification]])로 이미 강제(VAT 267차·CRM LTV 역분개 263차). ★중복 이익/비용/매출 계산 신설 절대 금지(값 분산=회귀). 형식 Profit Intelligence Engine은 분석을 래핑(값 재계산 아님).
- **D-3 (이익 최적화/Forecast = Mmm 승격):** Profit Optimization/Forecast/Scenario seed = `Mmm::frontier`(PROFIT(T) 곡선·이익최적 T*·profitOptSpend·marginal_roas·GT①). ★경쟁사 미제공 차별점(270차). 형식 Scenario/What-if/Best-Worst Case Engine=순신설(중복 최적화 로직 금지).
- **D-4 (Cost Center/Attribution = 기존 승격·형식 신설):** 비용=`Pnl` 컴포넌트 조립(cogs/adSpend/platformFee/couponDiscount/returnFee/shippingCost/influencerCost)·CAC=`Rollup`·Attribution=`Attribution`(UTM/Coupon/Deeplink). ★형식 Cost Center/Cost Element 테이블·Profit Attribution(비용·이익 원인 추적)=순신설(중복 attribution 금지·Attribution 재사용).
- **D-5 (Security/AI/Runtime = 헌법·무후퇴 정합):** Financial Encryption=`Crypto`(AES-256-GCM)·Tenant=`Db.php`·RBAC=`index.php`·Audit=`SecurityAudit`·Formula Protection=git+G2 sacred SHA+`CHANGE_GATE`·Masking=`ChannelCreds`. AI(이익 최적화/비용 이상/손익 시뮬)=`Mmm`/`AnomalyDetection`/231차 AI Profit OS·Explainability=헌법 V4·AI Profit 직접변경/승인 불가=헌법 V3+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 013/014/015/Data Platform/헌법 상속·재정의 금지·P&L 값(`Pnl`)·이익 최적화(`Mmm` frontier)·Attribution(`Attribution`)·비용 컴포넌트(`Pnl`)·CRM LTV·`SecurityAudit` 재사용(★중복 이익/비용/매출 계산 절대 금지)·형식 metadata-driven Profit Intelligence Engine·Cost Center 계층·Scenario/Forecast Engine만 신설(값 재계산 없이). 실행은 선행 Part 001~015 종속.
