# MEA Part 021 — Canonical Entities Design & Judgment (§5~§16)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★Commerce 전 도메인 handler 재사용·형식 통합 Commerce Foundation greenfield·ROI/Data Platform 상속·★중복 도메인 절대 금지.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 handler | 인용 | 판정 |
|---|---|---|---|---|
| 1 | COMMERCE_DOMAIN | 도메인 산재(통합 부재) | (전 handler) | PARTIAL(통합 부재) |
| 2 | PRODUCT | 상품 카탈로그 | `Catalog.php`·`ProductAddon.php` | PARTIAL-strong |
| 3 | PRODUCT_CATEGORY | 카테고리(11번가 등) | `Catalog.php`·[[reference_st11_product_register_full_spec]] | PARTIAL-strong |
| 4 | CUSTOMER | 고객 360·LTV | `CRM.php` | PARTIAL-strong |
| 5 | ORDER | 주문 허브(취소 역분개) | `OrderHub.php`(268차) | PARTIAL-strong |
| 6 | ORDER_ITEM | 주문 라인 | `OrderHub.php` | PARTIAL-strong |
| 7 | INVENTORY | WMS on_hand·FEFO | `Wms.php` | PARTIAL-strong |
| 8 | PRICE | 가격 최적화·master 게이트 | `PriceOpt.php`(287차) | PARTIAL-strong |
| 9 | PROMOTION | 프로모션/쿠폰 | `CouponAdmin.php` | PARTIAL |
| 10 | COUPON | 쿠폰 원자 소진 | `CouponRedeem.php`(289차 TOCTOU) | PARTIAL-strong |
| 11 | PAYMENT | 결제·구독 | `Payment.php`·`Paddle.php` | PARTIAL-strong |
| 12 | SETTLEMENT | PG/채널 정산·VAT | `PgSettlement.php`·`Pnl.php`(267차) | PARTIAL-strong |
| 13 | SHIPMENT | WMS 배송 | `Wms.php` | PARTIAL-strong |
| 14 | MARKETPLACE | 14채널·레지스트리 | `ChannelSync.php`·`ChannelRegistry.php`·`ChannelContract.php` | PARTIAL-strong |
| 15 | COMMERCE_POLICY | 게이트 산재 | (287~289차 게이트) | PARTIAL |

## §6~§16 표준 판정
- **§6 Domain(12)**: 전 도메인 실 handler 매핑(Product=Catalog·Order=OrderHub·Inventory=Wms·Payment=Payment/Paddle·Settlement=PgSettlement·Marketplace=ChannelSync). 형식 통합 Domain 부재.
- **§7 Lifecycle(10)**: Catalog→OrderHub→Payment→Wms→PgSettlement→CRM 실 흐름·형식 Lifecycle Manager=부분.
- **§8 Governance(8)**: MenuPricingSync master 게이트·Coupon TOCTOU·발송 게이트(287~289차)·형식 통합 Governance Manager=ABSENT.
- **§9 Integration(10)**: ROI=Rollup/Pnl·Data=DataPlatform·PG=Paddle/Payment·Marketplace=ChannelSync·Tax=Pnl VAT·Partner=PartnerPortal·ERP(사방넷 이상)=부분.
- **§10 Security(8)**: Tenant/RBAC/MFA/Crypto/Audit/Secret/No-PII(Part 001~020 상속).
- **§14 AI**: 상품추천=AutoRecommend(CF)·가격=PriceOpt·재고예측=DemandForecast·이상=AnomalyDetection·구매패턴=CustomerAI·Explainability=헌법 V4·주문/결제/정산 자동 승인 불가=헌법 V3+V5+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§2~8·§10~14=전 Commerce 도메인 실재) / PARTIAL(§1·§9·§15 COMMERCE_POLICY·통합 계층) / ABSENT-formal(형식 통합 Commerce Platform Foundation/Registry/Metadata Repository/Governance Manager).** 코드 0. ★Commerce 전 도메인 handler 재사용(★중복 도메인/값 계산 절대 금지·다수 감사 정본 재구현 금지)·형식 통합 Commerce Foundation 신설(도메인 재구현 없이)·ROI/Data Platform 상속·★AI 주문/결제/정산 자동 승인 불가(V3+V5+CHANGE_GATE).
