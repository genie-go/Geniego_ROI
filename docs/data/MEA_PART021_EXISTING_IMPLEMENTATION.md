# MEA Part 021 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 021 SPEC/ADR.

## 전수조사 방법
order/catalog/product/price/coupon/paddle/settle/wms/channel/crm/payment 키워드로 `backend/src/Handlers` 전수 grep + 판독.

## 실존 substrate (★Commerce 도메인 광범위 실재·앱 핵심)
| Canonical Entity | 실존 handler | 인용 | 판정 |
|---|---|---|---|
| PRODUCT/CATEGORY | 상품 카탈로그·애드온 | `Catalog.php`·`ProductAddon.php` | PARTIAL-strong |
| CUSTOMER | 고객 CRM(LTV·360) | `CRM.php` | PARTIAL-strong |
| ORDER/ORDER_ITEM | 주문 허브(취소 역분개) | `OrderHub.php`(268차) | PARTIAL-strong |
| INVENTORY | WMS(on_hand·FEFO) | `Wms.php` | PARTIAL-strong |
| PRICE | 가격 최적화·master 게이트 | `PriceOpt.php`(287차) | PARTIAL-strong |
| PROMOTION/COUPON | 쿠폰(TOCTOU 원자성) | `CouponAdmin.php`·`CouponRedeem.php`(289차) | PARTIAL-strong |
| PAYMENT | 결제·구독 | `Payment.php`·`Paddle.php` | PARTIAL-strong |
| SETTLEMENT | PG/채널 정산 | `PgSettlement.php`·`ChannelSync.php` | PARTIAL-strong |
| SHIPMENT/Fulfillment | WMS 배송·CCTV | `Wms.php`·`WmsCctv.php` | PARTIAL-strong |
| MARKETPLACE | 14채널·레지스트리·계약 | `ChannelSync.php`·`ChannelRegistry.php`·`ChannelContract.php`·`KrChannel.php`·`Omnichannel.php` | PARTIAL-strong |
| COMMERCE_POLICY | 게이트 산재 | MenuPricingSync/발송 게이트(287~289차) | PARTIAL |
| Commerce Analytics | ROI/P&L | `Rollup.php`·`Pnl.php` | PARTIAL-strong |
| Security | Tenant/RBAC/MFA/Crypto/Audit | `Db`·`index`·`UserAuth`·`Crypto`·`SecurityAudit`·`ChannelCreds` | PARTIAL-strong |

## 부재(ABSENT-formal) — 형식 통합 Commerce Foundation (meta-layer 부재)
형식 통합 Commerce Platform Foundation(도메인 handler별 산재)·Commerce Registry(통합)·Commerce Metadata Repository·Commerce Governance Manager(통합)·Commerce Runtime Manager·Commerce Integration Manager·Commerce Policy Manager(통합)·Commerce Lifecycle Manager(형식)·Event 표준(ProductRegistered 등).

## 판정
**PARTIAL-strong / ABSENT-formal.** ★Commerce는 **앱의 핵심으로 도메인이 광범위 실재**: 상품(`Catalog`)·고객(`CRM`)·주문(`OrderHub`)·재고(`Wms`)·가격(`PriceOpt`)·쿠폰(`CouponAdmin`/`CouponRedeem`)·결제(`Payment`/`Paddle`)·정산(`PgSettlement`)·Marketplace(`ChannelSync`/`ChannelRegistry`·14채널)·배송(`Wms` FEFO)·보안(Tenant/RBAC/MFA/Crypto/SecurityAudit) 모두 실재이며 다수 감사 하드닝 이력(268차 취소 역분개·267차 VAT·289차 TOCTOU·285차 11번가)이나, **형식 통합 Commerce Platform Foundation(Registry/Metadata Repository/Governance Manager meta-layer)은 부재**(도메인 handler별 구현·Data Platform Foundation 판정과 동형). 실행은 도메인 오케스트레이션 계층 신설(도메인 재구현 없이) 종속.
