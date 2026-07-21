# ADR — MEA Part 021 Commerce Platform Foundation Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part021 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 021은 Commerce Platform Foundation(신규 Commerce 계열의 Baseline). ★Commerce는 **앱의 핵심 도메인으로 이미 광범위 실재**: Product=`Catalog`/`ProductAddon`·Customer=`CRM`·Order=`OrderHub`·Inventory/Fulfillment=`Wms`·Pricing=`PriceOpt`·Promotion/Coupon=`CouponAdmin`/`CouponRedeem`·Payment=`Payment`/`Paddle`·Settlement=`PgSettlement`/`ChannelSync`·Marketplace=`ChannelSync`/`ChannelRegistry`/`KrChannel`/`Omnichannel`(14채널·GT①). 다수 감사 하드닝 이력(취소 역분개 268차·VAT 267차·Coupon TOCTOU 289차·재고 원자성·11번가 285차). 본 Part는 ROI Platform(013~020)+Data Platform(001~012) 상속(재정의 금지).

## 결정
- **D-1 (ROI/Data Platform 재정의 금지):** ROI 값(Part 013)·KPI(Part 015)·DataPlatform(Part 001~012)를 준수·인용. Commerce Analytics=`Rollup`/`Pnl`. 중복 정의 금지.
- **D-2 (Commerce 도메인 = 기존 handler 승격·★중복 도메인 절대 금지):** 상품/주문/고객/가격/쿠폰/결제/정산/재고/배송/Marketplace = 각 실 handler(`Catalog`/`OrderHub`/`CRM`/`PriceOpt`/`CouponAdmin`/`Payment`/`PgSettlement`/`Wms`/`ChannelSync`). ★값(주문/정산/재고/이익)=무후퇴 단일소스([[feedback_no_regression_value_unification]])·다수 감사 정본(268차 취소 역분개·267차 VAT·289차 TOCTOU·재구현 금지). ★중복 상품/주문/결제/정산/재고 도메인 신설 절대 금지(값 분산=회귀). 형식 Commerce Foundation은 도메인을 조립(도메인 재구현 아님).
- **D-3 (Commerce Registry/Metadata = Channel* 승격·형식 신설):** Marketplace/채널 Registry seed = `ChannelRegistry`/`ChannelContract`/`ChannelCreds`(278차 채널 이미지 아키텍처)·상품 표준모델=[[reference_st11_product_register_full_spec]]. ★채널 나열 금지·표준모델 정규화(데이터 헌법). 형식 통합 Commerce Registry/Metadata Repository=순신설(중복 채널 인텔리전스 금지).
- **D-4 (Governance/Lifecycle = 기존 게이트 승격·형식 신설):** Pricing=MenuPricingSync master 게이트(287차)·Coupon=원자 UPDATE+rowCount(289차)·Marketplace 발송 게이트(288/289차)·Payment webhook 토큰(215차). ★형식 통합 Commerce Governance Manager/Lifecycle Manager=순신설(기존 게이트 오케스트레이션·중복 게이트 금지).
- **D-5 (Security/AI = 헌법·무후퇴 정합):** Tenant=`Db.php`·RBAC=`index.php`·MFA=`UserAuth`·Encryption=`Crypto`·Audit=`SecurityAudit`·Secret=`ChannelCreds`·No-PII 집계(v418.1). AI(상품 추천/가격/재고 예측/이상)=`AutoRecommend`(CF 282차)/`PriceOpt`/`DemandForecast`/`AnomalyDetection`·Explainability=헌법 V4·★AI 주문/결제/정산 자동 승인 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. ROI/Data Platform/헌법 상속·재정의 금지·Commerce 도메인 handler 전부(`Catalog`/`OrderHub`/`CRM`/`Wms`/`PriceOpt`/`CouponAdmin`/`Payment`/`PgSettlement`/`ChannelSync`/`ChannelRegistry`)·`SecurityAudit` 재사용(★중복 도메인 절대 금지)·형식 통합 Commerce Platform Foundation·Registry·Metadata Repository·Governance Manager만 신설(도메인 재구현 없이). 실행은 도메인 오케스트레이션 계층 신설 종속. ★신규 Commerce Platform 계열(Part 021~) 착수.
