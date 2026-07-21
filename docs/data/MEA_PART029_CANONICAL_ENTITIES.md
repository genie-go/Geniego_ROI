# MEA Part 029 — Canonical Entities Design & Judgment (§5~§18)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★ChannelRegistry/ChannelSync/ChannelContract/ChannelCreds 재사용·형식 통합 Adapter Framework greenfield·Part 021~027 상속·채널 나열 금지.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | SALES_CHANNEL | channel_registry | `ChannelRegistry.php`(:32) | PARTIAL-strong |
| 2 | MARKETPLACE | 14채널 | `ChannelSync.php` | PARTIAL-strong |
| 3 | CHANNEL_ACCOUNT | 자격증명 계정 | `ChannelCreds.php` | PARTIAL-strong |
| 4 | CHANNEL_PRODUCT | 채널 상품 | `Catalog`·`ChannelImage`(278차) | PARTIAL-strong |
| 5 | CHANNEL_ORDER | 채널 주문 | `ChannelSync.php`(saveOrders:4309) | PARTIAL-strong |
| 6 | CHANNEL_INVENTORY | 채널 재고 | `ChannelSync.php`(pushStock:2821) | PARTIAL-strong |
| 7 | CHANNEL_PRICE | 채널 가격 | `ChannelSync.php`(channelPrice:3904) | PARTIAL-strong |
| 8 | CHANNEL_PROMOTION | 채널 프로모션 | `Promotion`·`CouponAdmin` | PARTIAL |
| 9 | CHANNEL_MAPPING | category mapping | `Catalog`(227차) | PARTIAL-strong |
| 10 | CHANNEL_ADAPTER | per-channel·preflight | `ChannelSync`·`ChannelContract`(preflight:83)·`Connectors` | PARTIAL-strong |
| 11 | CHANNEL_POLICY | 게이트 산재 | `ChannelRegistry`(sync_kind) | PARTIAL |
| 12 | CHANNEL_STATUS | 채널 상태·test | `ChannelCreds`(test)·`ChannelRegistry` | PARTIAL |
| 13 | CHANNEL_SYNC_JOB | sync(cron·형식 Job 부분) | `ChannelSync` | PARTIAL |
| 14 | CHANNEL_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| 15 | CHANNEL_ERROR | 오류(부분·형식 부재) | `ChannelSync`·`AnomalyDetection` | PARTIAL |

## §6~§18 표준 판정
- **§6 Domain(10)**: Marketplace=ChannelSync(14채널)·Live=LiveCommerce·Social=Omnichannel·Partner=PartnerPortal·레지스트리=ChannelRegistry.
- **§7 Lifecycle(10)**: Registration=ChannelRegistry·Auth=ChannelCreds(test)·Mapping=Catalog·Sync=ChannelSync·형식 Lifecycle Manager=부분.
- **§8 Distribution(8)**: Publishing=Catalog(writeback)·Category=Catalog(227차)·Image=ChannelImage·Bulk/Rollback=부분.
- **§9 Order Sync(8)**: ChannelSync(saveOrders·Idempotent)·취소/반품=OrderHub·Shipment=Logistics.
- **§10 Inventory Sync(8)**: ChannelSync(pushStock)·재고 SSOT=Wms·재고 델타(283차)·Safety Stock(Part 027)=부분.
- **§11 Price/Promo Sync(8)**: channelPrice+MenuPricingSync(287차)·Currency=fxToKrw·Tax=Pnl·Promotion=Promotion/CouponAdmin.
- **§12 Adapter Framework(8)**: per-channel(shopify/amazon/woocommerce/walmart)·ChannelContract(preflight)·Connectors·★형식 REST/GraphQL/SOAP/FTP 표준 인터페이스=부분.
- **§13 Governance(8)**: Credential=ChannelCreds·Mapping=Catalog·Rate Limit=전역(282차)·Retry Policy(형식)=부분.
- **§14 Security**: ★Credential Encryption=ChannelCreds(AES-256-GCM·masked)·OAuth·Tenant·Audit(Part 021 상속).
- **§18 AI**: 채널 ROI/성과=Rollup(SoS)·수수료=PgSettlement/Pnl·오류=AnomalyDetection·Explainability=헌법 V4·외부 채널 자동 게시/설정 변경 불가=헌법 V3+V5+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§1~7·§9·§10·§14=레지스트리/채널/계정/상품/주문/재고/가격/감사·§10 Adapter) / PARTIAL(§8·§11·§12 형식·§13·§15) / ABSENT-formal(형식 통합 Marketplace Adapter Framework(표준 Connector Interface)·Channel Sync Engine·Retry Policy·CHANNEL_ERROR 형식).** 코드 0. ★채널 레지스트리(`ChannelRegistry`)·어댑터/sync(`ChannelSync`/`ChannelContract`)·자격증명(`ChannelCreds` AES-256-GCM) 재사용(★중복 채널/어댑터/자격증명 도메인 절대 금지·채널 나열 금지·표준모델·st11 정본 재구현 금지)·형식 통합 Adapter Framework 신설(채널 재구현 없이)·Part 021~027 상속·★AI 외부 채널 자동 게시/설정 변경 불가(V3+V5+CHANGE_GATE).
