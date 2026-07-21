# MEA Part 023 — Enterprise Product Pricing & Pricing Intelligence Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **MEA Part 021(Commerce Foundation)+022(PIM)+014(ROI Calc·통화)+Data Platform(001~012)**을 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). ★**가격 최적화/할인/다통화는 이미 실재**(GT①·`PriceOpt`·`CouponRedeem`·`Connectors::fxToKrw`)·본 Part는 형식 Price Master/Governance 계층만 추가(가격 재계산 없이). file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
모든 상품 가격 정책/계산/할인/동적가격/다통화/채널별 가격·AI 가격 최적화 표준. PIM/OMS/Marketplace/ROI/Financial Platform 연계 Enterprise Pricing Framework.

## §2 구현 범위
Pricing Engine · Pricing Policy · Dynamic Pricing · Discount Engine · Promotion Pricing · Multi-Currency Pricing · Marketplace Pricing · Pricing Analytics · Pricing Governance · AI Pricing Intelligence.

## §3 구현 목표 (10)
Enterprise Pricing Engine · Pricing Policy Manager · Dynamic Pricing Engine · Discount Calculation Engine · Currency Conversion Service · Pricing Analytics Service · Pricing Governance Manager · Pricing Dashboard · Pricing Audit Service · AI Pricing Advisor.

## §4 아키텍처 원칙 (10)
Single Price Authority · Policy Driven Pricing · Explainable Pricing · Real-Time Calculation · Multi-Channel Ready · Event Driven · Metadata Driven · AI Assisted · Enterprise Standard · Audit by Default.

## §5 Canonical Entity (15)
PRICE_MASTER · PRICE_LIST · PRICE_POLICY · PRICE_RULE · PRICE_VERSION · PRICE_COMPONENT · DISCOUNT_RULE · SURCHARGE_RULE · TAX_RULE · EXCHANGE_RATE · PRICE_CALCULATION · PRICE_HISTORY · PRICE_APPROVAL · PRICE_AUDIT · PRICE_STATUS. → 상세 = `MEA_PART023_CANONICAL_ENTITIES.md`.

## §6 Pricing Domain (10)
Base/Customer/Membership/Channel/Marketplace/Regional/Promotional/Subscription/Wholesale/Enterprise Pricing. Price Master 기준. → ★현행=Base/Channel=`PriceOpt`(base_price·채널별)+`MenuPricingSync`(287차)·Marketplace=`ChannelSync`(selPrc 11번가 286차)·Subscription=`Paddle`/`AdminPlans`·Promotional=`CouponRedeem`. 형식 Price Master 통합=부분.

## §7 Pricing Lifecycle (8)
Price Draft→Rule Definition→Validation→Approval→Scheduled Publication→Active→Expiration→Archive. 미승인 가격 운영 사용 금지. → ★현행=`PriceOpt`(recommendations·optimize)·`MenuPricingSync` master 게이트(287차)·writeback 승인(`Catalog` 289차). 형식 통합 Lifecycle Manager=부분.

## §8 Price Calculation Framework (10)
Base Price→Customer Group→Price List→Discount→Promotion→Coupon→Surcharge→Tax→Currency 변환→최종 판매가. 계산 과정 Audit. → ★현행=Base=`PriceOpt`·Discount/Coupon=`CouponRedeem`(preview·redeem)·Tax=`Pnl`(VAT 267차)·Currency=`Connectors::fxToKrw`. 형식 통합 Calculation Framework(순서 오케스트레이션)=부분.

## §9 Dynamic Pricing (8)
Demand/Inventory/Competitor/Time/Region/Customer Segment/AI Recommended/Event-Based Pricing. 정책 기반 자동 계산·승인 정책. → ★★현행=`PriceOpt`(elasticityOptimal·po_elasticity·harvestElasticityFromOrders·optimalPrice·algo='elasticity'·GT①)=Demand/Inventory-based dynamic pricing 실재. Competitor/AI Recommended=부분. ★승인 정책(헌법 V5).

## §10 Discount & Promotion Pricing (10)
Fixed/Percentage/BOGO/Bundle/Tiered/Membership/Coupon Discount · Flash Sale · Seasonal · Campaign Pricing. 복수 할인 우선순위·중복 정책. → ★현행=Coupon=`CouponRedeem`(원자 소진·TOCTOU 289차)·`CouponAdmin`·Bundle=`ProductAddon`·Campaign=`AutoCampaign`. 형식 Tiered/BOGO/우선순위 정책 엔진=부분.

## §11 Multi-Currency Pricing (8)
Base/Selling Currency · Daily/Historical Exchange Rate · Precision · Rounding · Regional Tax · Currency Audit. 기준+거래 통화 저장. → ★현행=Base=KRW(`Connectors::fxToKrw`·`fxRateKrwPerUnit`)·보고통화 환산 뷰=`Pnl`(app_setting)·Regional Tax=`Pnl`(VAT). ★형식 Daily/Historical Exchange Rate versioning·Currency Audit=ABSENT(Part 014 판정 정합).

## §12 Pricing Governance (8)
Price Approval Workflow · Rule Version · Pricing Authority · Scheduled Activation · Rollback · Price History · Compliance · Audit Trail. → ★현행=Approval=`MenuPricingSync` master 게이트(287차)+writeback 승인(289차)·Audit=`SecurityAudit`. ★Pricing Authority·형식 Governance Manager=ABSENT(Part 018 Authority ABSENT 정합).

## §13 Data Security
Tenant Isolation · Pricing Data Encryption · RBAC · Price Rule Protection · Approval Authority Control · Audit Logging. → ★Part 021 상속: Tenant=`Db.php`·RBAC=`index.php`·Encryption=`Crypto`·Rule Protection=git+`CHANGE_GATE`·Audit=`SecurityAudit`.

## §14 Runtime 규칙
Price Rule 검증 · Discount 계산 · Promotion 적용 · Tax 계산 · Currency 변환 · Final Price · Audit. → ★현행=Discount=`CouponRedeem`·Tax=`Pnl`(VAT)·Currency=`Connectors::fxToKrw`·Price=`PriceOpt`·Audit=`SecurityAudit`.

## §15 API 표준 (8)
Register/Update Price Rule · Calculate Selling Price · Query/Publish Price · Validate Policy · Compare Version · Query History. → ★현행=`PriceOpt` API(/v420/price/*·elasticity·optimize·recommendations·GT①)·`CouponRedeem` API·`MenuPricingSync` API 실재. Compare Version(형식)=부분. Part 001 API 표준(`/api` 접두) 상속.

## §16 Event 표준 (8)
PriceCreated/Updated/Approved/Published/Activated · DynamicPriceCalculated · PriceChanged · PriceAudited. → ★현행=`PriceOpt`(optimize)·`MenuPricingSync`(sync) seed(동기·event-driven 부재). Data Platform §15 정합.

## §17 AI Integration
최적 판매가 추천 · 경쟁사 가격 비교 · 가격 민감도 · 수요 기반 예측 · 할인 정책 추천 · 프로모션 효과 예측 · 수익성 영향 · Explainable Pricing Report. **AI는 가격 정책 자동 승인/직접 반영 불가.** → ★현행=최적 판매가=`PriceOpt`(elasticity)·수요 예측=`DemandForecast`·수익성=`Pnl`/`Mmm`·프로모션 효과=`AbTesting`·Explainability=헌법 V4·자동 반영 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §18 성능 요구사항
단일 계산 ≤100ms · Dynamic ≤300ms · 조회 ≤150ms · 게시 ≤2초 · Exchange Rate ≤100ms · Availability ≥99.99%. (현행 `PriceOpt` sqlite seed·priceopt.sqlite 소유권 273차.)

## §19 Completion Criteria
Enterprise Pricing Engine·Dynamic Pricing·Discount Engine·Multi-Currency·Governance·Security·Runtime·API/Event·AI 구현. → **부분 충족**(가격 최적화/할인/다통화 실재·형식 Price Master·Governance Manager·Exchange Rate versioning=미완). 코드 0.

## 판정
**PARTIAL-strong(★Dynamic Pricing=`PriceOpt`(elasticity·po_elasticity·optimalPrice·수요 기반·v420)·Discount=`CouponRedeem`(원자 소진 TOCTOU 289차)·Multi-Currency=`Connectors::fxToKrw`(KRW base 정규화)·Channel Pricing=`MenuPricingSync`(master 게이트 287차)/`ChannelSync`(selPrc 286차)·Tax=`Pnl`(VAT 267차)·Subscription=`Paddle`·수익성=`Pnl`/`Mmm`·Explainable=헌법 V4) / ABSENT-formal(형식 Enterprise Pricing Engine(Single Price Authority master)·Price Master/Price List/Price Rule version-controlled·Daily/Historical Exchange Rate versioning·Currency Audit(Part 014 판정)·Pricing Governance Manager(Approval Workflow·Pricing Authority·Part 018 정합)·Tiered/BOGO 우선순위 정책 엔진·Event 표준).** ★핵심=가격 최적화·할인·다통화는 **실재**(PriceOpt elasticity 동적가격·CouponRedeem 원자성·fxToKrw 다통화)이나 형식 Single Price Authority master·Exchange Rate versioning·Pricing Governance/Authority는 부재(가격=handler별·Part 014/018/021 동일 판정). Part 021/022/014/Data Platform 상속(재정의 금지)·★중복 가격/할인/통화 계산 절대 금지(값 분산=회귀)·마케팅 AI KEEP_SEPARATE·★AI 가격 정책 자동 승인/직접 반영 불가(V3+V5). 코드 변경 0.

## 다음
MEA Part 024 — Enterprise Order Management System (OMS) Architecture(본 Pricing 상속·확장).
