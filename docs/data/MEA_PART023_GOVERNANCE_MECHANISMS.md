# MEA Part 023 — Governance Mechanisms (§7~§19 통합)

> **거버넌스 상태**: 거버넌스 메커니즘 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★가격 최적화(`PriceOpt`)·할인(`CouponRedeem`)·다통화(`Connectors::fxToKrw`/`Pnl`)·채널가격(`MenuPricingSync`)·SecurityAudit 재사용(★중복 가격/할인/통화 계산 절대 금지)·형식 Price Master/Governance 신설(가격 재계산 없이).

## §7 Lifecycle 거버넌스
Draft→Rule Definition→Validation→Approval→Scheduled Publication→Active→Expiration→Archive. **미승인 가격 운영 금지.** 현행=`PriceOpt`(recommendations·optimize)·`MenuPricingSync` master 게이트(287차)·writeback 승인(`Catalog` 289차). 형식 통합 Lifecycle Manager=순신설.

## §8 Calculation Framework 거버넌스
Base→Customer Group→Price List→Discount→Promotion→Coupon→Surcharge→Tax→Currency→최종 판매가. 현행=Base=`PriceOpt`·Discount/Coupon=`CouponRedeem`(preview/redeem)·Tax=`Pnl`(VAT 267차)·Currency=`Connectors::fxToKrw`. ★계산 과정 Audit=`SecurityAudit`. 형식 순서 오케스트레이션 Framework=순신설.

## §9 Dynamic Pricing 거버넌스
Demand/Inventory/Competitor/Time/Region/Customer Segment/AI/Event-Based. 현행=`PriceOpt`(elasticityOptimal·po_elasticity·harvestElasticityFromOrders·optimalPrice·수요/재고 기반). ★정책 기반 자동 계산·승인 정책(헌법 V5). Competitor/AI Recommended=순신설.

## §10 Discount & Promotion 거버넌스
Fixed/Percentage/BOGO/Bundle/Tiered/Membership/Coupon/Flash Sale/Seasonal/Campaign. 현행=Coupon=`CouponRedeem`(원자 소진 UPDATE+rowCount·TOCTOU 289차)·`CouponAdmin`·Bundle=`ProductAddon`·Campaign=`AutoCampaign`. ★복수 할인 우선순위·중복 정책·형식 Tiered/BOGO 엔진=순신설(중복 할인 계산 금지).

## §11 Multi-Currency 거버넌스
Base/Selling Currency·Daily/Historical Exchange Rate·Precision/Rounding·Regional Tax·Currency Audit. 현행=Base=KRW(`Connectors::fxToKrw`/`fxRateKrwPerUnit`)·보고통화 환산=`Pnl`(krwPerUnit·app_setting)·Regional Tax=`Pnl`(VAT). ★기준+거래 통화 저장·★Daily/Historical Exchange Rate versioning·Currency Audit=순신설(Part 014 판정·중복 통화 변환 금지·fxToKrw 승격).

## §12 Governance 거버넌스
Price Approval Workflow·Rule Version·Pricing Authority·Scheduled Activation·Rollback·Price History·Compliance·Audit Trail. 현행=Approval=`MenuPricingSync` master 게이트(287차)+writeback 승인(289차)·Audit=`SecurityAudit`. ★Pricing Authority·형식 Governance Manager=순신설(Part 018 Authority ABSENT·선행 foundation 종속).

## §13 Security 거버넌스
Tenant=`Db.php`([[reference_platform_growth_actas_tenant_hijack]])·RBAC=`index.php`(viewer<connector<analyst<admin+writeGuard)·Pricing Encryption=`Crypto`·Price Rule Protection=git+`CHANGE_GATE`·Approval Authority Control=헌법 V5·Audit=`SecurityAudit::verify`(★유일 tamper-evident·[[reference_menu_audit_log_not_tamper_evident]]).

## §14 Runtime 거버넌스
Price Rule 검증·Discount 계산·Promotion 적용·Tax 계산·Currency 변환·Final Price·Audit. Discount=`CouponRedeem`·Tax=`Pnl`(VAT)·Currency=`Connectors::fxToKrw`·Price=`PriceOpt`·Audit=`SecurityAudit`.

## §15 API 거버넌스 (8)
Register/Update Price Rule·Calculate Selling Price·Query/Publish Price·Validate Policy·Compare Version·Query History. 현행=`PriceOpt` API(/v420/price/*·GT①)·`CouponRedeem` API·`MenuPricingSync` API 실재. ★`/v420/price/*`=public bypass(index.php)·[[reference_api_prefix_routing]]. Part 001 API 표준 상속.

## §16 Event 거버넌스 (8)
PriceCreated/Updated/Approved/Published/Activated/DynamicPriceCalculated/PriceChanged/PriceAudited. 현행=`PriceOpt`(optimize)·`MenuPricingSync`(sync) seed(동기·event-driven 부재). Data Platform §15 정합.

## §17 AI 거버넌스
최적 판매가/경쟁사 비교/민감도/수요 예측/할인 추천/프로모션 효과/수익성/Explainable. 현행=최적 판매가=`PriceOpt`(elasticity)·수요=`DemandForecast`·수익성=`Pnl`/`Mmm`·프로모션 효과=`AbTesting`·Explainability=헌법 V4. ★AI는 가격 정책 자동 승인/직접 반영 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## §18~§19 성능·완료
성능=`PriceOpt` sqlite seed(priceopt.sqlite 소유권 273차·벤치 대상 미존재). 완료=형식 Enterprise Pricing Engine/Governance Manager/Exchange Rate versioning 구현 시(부분 충족·코드 0). ★단 동적가격·할인·다통화는 실재.

## 판정
전 메커니즘 **설계-only·코드 0·NOT_CERTIFIED.** ★가격 최적화(`PriceOpt` elasticity)·할인(`CouponRedeem` 원자성)·다통화(`Connectors::fxToKrw`/`Pnl`)·채널가격(`MenuPricingSync`)·Tax(`Pnl` VAT)·Audit(`SecurityAudit`) 재사용·승격(★중복 가격/할인/통화/세금 계산 절대 금지=값 분산=회귀·정본 재구현 금지)·형식 Enterprise Pricing Engine(Single Price Authority)/Price Master/Exchange Rate versioning/Pricing Governance Manager만 신설(가격 재계산 없이). Part 014/018/021/022/Data Platform/헌법 상속·재정의 금지·★AI 가격 정책 자동 승인/직접 반영 불가(V3+V5+CHANGE_GATE).
