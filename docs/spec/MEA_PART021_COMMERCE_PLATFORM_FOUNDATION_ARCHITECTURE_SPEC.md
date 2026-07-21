# MEA Part 021 — Commerce Platform Foundation Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**신규 계열(Commerce Platform Foundation)**: 본 Part는 ROI Platform(Part 013~020)+Data Platform(001~012) 위에서 Commerce 서비스 공통 기반을 정의하며, 이후 Commerce Part(022~)는 본 문서를 확장만 하고 중복 정의하지 않는다(Golden Rule=Extend). ★**Commerce 도메인은 이미 광범위 실재**(GT①·앱 핵심)·본 Part는 형식 통합 Commerce Foundation(Registry/Metadata/Governance)만 추가(도메인 재구현 없이). file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
Commerce Platform 전체 구조 정의 최상위 표준. 상품/주문/고객/가격/프로모션/결제/정산/재고/배송/Marketplace/AI Commerce 공통 기반(Standard Foundation).

## §2 구현 범위
Commerce Platform · Commerce Domain Model · Governance · Runtime · Integration · Metadata · Security · Event Framework · API Framework · AI Foundation.

## §3 구현 목표 (10)
Commerce Platform · Commerce Registry · Commerce Metadata Repository · Commerce Governance Manager · Commerce Runtime Manager · Commerce Integration Manager · Commerce Dashboard Foundation · Commerce Policy Manager · Commerce Audit Service · AI Commerce Foundation.

## §4 아키텍처 원칙 (10)
Commerce First · Customer First · API First · Event Driven · Metadata Driven · AI Assisted · Enterprise Standard · Multi-Tenant · High Availability · Audit by Default.

## §5 Canonical Entity (15)
COMMERCE_DOMAIN · PRODUCT · PRODUCT_CATEGORY · CUSTOMER · ORDER · ORDER_ITEM · INVENTORY · PRICE · PROMOTION · COUPON · PAYMENT · SETTLEMENT · SHIPMENT · MARKETPLACE · COMMERCE_POLICY. → 상세 = `MEA_PART021_CANONICAL_ENTITIES.md`.

## §6 Commerce Domain (12)
Product/Customer/Order/Inventory/Pricing/Promotion/Payment/Settlement/Marketplace/Fulfillment Management · Commerce Analytics · AI Commerce. → ★★현행 대부분 실재: Product=`Catalog`/`ProductAddon`·Customer=`CRM`·Order=`OrderHub`·Inventory=`Wms`·Pricing=`PriceOpt`·Promotion/Coupon=`CouponAdmin`/`CouponRedeem`·Payment=`Payment`/`Paddle`·Settlement=`PgSettlement`/`ChannelSync`·Marketplace=`ChannelSync`/`ChannelRegistry`/`KrChannel`/`Omnichannel`·Fulfillment=`Wms`.

## §7 Commerce Lifecycle (10)
Product Registration→Publication→Customer Purchase→Order Creation→Payment Approval→Inventory Allocation→Shipment→Settlement→Customer Service→Order Completion. → ★현행=`Catalog`(등록·11번가 등)→`OrderHub`(주문)→`Payment`/`Paddle`(결제)→`Wms`(재고 할당·배송·FEFO)→`PgSettlement`(정산)→`CRM`(CS). Lifecycle 실 구현·형식 통합 Lifecycle Manager=부분.

## §8 Commerce Governance (8)
Product/Pricing/Promotion/Payment/Settlement/Marketplace/Inventory/Customer Governance. 버전 관리. → ★현행=Pricing=`PriceOpt`+MenuPricingSync master 게이트(287차)·Coupon=TOCTOU 원자성(289차)·Marketplace=`ChannelContract`·발송 게이트(288/289차). 형식 통합 Commerce Governance Manager=ABSENT.

## §9 Integration 표준 (10)
ROI Platform · Data Platform · Logistics · AI · ERP · CRM · Marketplace · Payment Gateway · Tax · External Partner. 표준 API/Event. → ★현행=ROI=`Rollup`/`Pnl`·Data=`DataPlatform`·CRM=`CRM`·Marketplace=`ChannelSync`(14채널)·PG=`Paddle`/`Payment`/`PgSettlement`·Tax=`Pnl`(VAT 267차)·Partner=`PartnerPortal`/`AgencyPortal`. ERP(사방넷 이상 목표)=부분.

## §10 Security 정책 (8)
Tenant Isolation · RBAC · MFA · Payment Data Encryption · Customer Data Protection · Audit Logging · Secret Management · API Security. → ★Part 001~020 상속: Tenant=`Db.php`·RBAC=`index.php`·MFA=`UserAuth`(OTP)·Encryption=`Crypto`(AES-256-GCM)·Audit=`SecurityAudit`·Secret=`ChannelCreds`·No-PII 집계(v418.1).

## §11 Runtime 규칙
Product 검증 · Customer 검증 · Order 생성 · Payment 검증 · Inventory 확인 · Event 발행 · Audit. → ★현행=Order=`OrderHub`(취소 역분개·268차)·Payment=`Payment`/`Paddle`(webhook 토큰 215차)·Inventory=`Wms`(원자 재고·on_hand)·Audit=`SecurityAudit`. Event 발행(형식)=부분.

## §12 API 표준 (8)
Register Product/Customer · Create Order · Query Inventory · Process Payment · Generate Shipment · Query Settlement · Query Commerce Status. → ★현행=`Catalog`/`OrderHub`/`Wms`/`Payment`/`PgSettlement` API 실재(/api·/v{NNN}). Part 001 API 표준(`/api` 접두·nginx SPA 폴백 착시 유의) 상속.

## §13 Event 표준 (8)
ProductRegistered · ProductPublished · OrderCreated · PaymentApproved · InventoryAllocated · ShipmentCreated · SettlementCompleted · CommerceAudited. → ★현행=`Payment`(webhook)·`Wms`(재고 델타 자동 푸시 283차) seed(동기·event-driven 부재). Data Platform §15 정합.

## §14 AI Integration
상품 추천 · 가격 최적화 · 재고 예측 · 주문 이상 탐지 · 고객 구매 패턴 · 판매 예측 · 프로모션 추천 · Marketplace 성과. **AI는 주문/결제/정산 자동 승인 불가.** → ★현행=상품 추천=`AutoRecommend`(CF 282차)·가격=`PriceOpt`·재고 예측=`DemandForecast`·이상=`AnomalyDetection`·구매 패턴=`CustomerAI`·판매 예측=`Mmm`/`DemandForecast`·Explainability=헌법 V4·자동 승인 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §15 성능 요구사항
상품 조회 ≤200ms · 주문 생성 ≤500ms · 결제 ≤2초 · 재고 조회 ≤300ms · Availability ≥99.99%. (현행 handler seed·11번가 N+1 회피 285차.)

## §16 Completion Criteria
Commerce Platform·Registry·Governance·Runtime·Integration·Security·API/Event·Audit·AI Foundation 구현. → **부분 충족**(도메인 광범위 실재·형식 통합 Commerce Foundation(Registry/Metadata Repository/Governance Manager)=미완). 코드 0.

## 판정
**PARTIAL-strong(★Commerce 도메인 대부분 실재=Product=`Catalog`·Customer=`CRM`·Order=`OrderHub`·Inventory=`Wms`·Pricing=`PriceOpt`·Coupon=`CouponAdmin`/`CouponRedeem`·Payment=`Payment`/`Paddle`·Settlement=`PgSettlement`·Marketplace=`ChannelSync`/`ChannelRegistry`(14채널)·Fulfillment=`Wms`(FEFO)·Security=Tenant/RBAC/MFA/Crypto/SecurityAudit·AI=`AutoRecommend`/`PriceOpt`/`DemandForecast`/`CustomerAI`) / ABSENT-formal(형식 통합 Commerce Platform Foundation·Commerce Registry·Commerce Metadata Repository·Commerce Governance Manager(통합)·Commerce Runtime/Integration Manager·Event 표준).** ★핵심=Commerce는 **앱의 핵심으로 도메인이 광범위 실재**(handler별 구현·다수 감사 하드닝 이력)이나 형식 통합 Commerce Foundation(Registry/Metadata/Governance meta-layer)은 부재(도메인 산재·Data Platform Foundation 판정과 동형). ROI Platform/Data Platform 상속(재정의 금지)·★중복 상품/주문/결제/정산/재고 도메인 절대 금지(값 분산=회귀·기존 handler 승격)·마케팅 AI KEEP_SEPARATE·★AI 주문/결제/정산 자동 승인 불가(V3+V5). 코드 변경 0.

## 다음
MEA Part 022 — Enterprise Product Information Management (PIM) Architecture(본 Commerce Foundation 상속·확장).
