# MEA Part 029 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 029 SPEC/ADR.

## 전수조사 방법
channel/marketplace/adapter/connector/sync/creds/registry/oauth 키워드로 `backend/src/Handlers` 전수 grep + 판독.

## 실존 substrate (★채널 레지스트리·어댑터·자격증명·동기화·최강 도메인)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| 채널 레지스트리(형식) | DB 동적·통합 | `ChannelRegistry.php`(:10·channel_registry:32·GET /v426/channels) | PARTIAL-strong |
| 주문 동기화 | per-channel·Idempotent | `ChannelSync.php`(saveOrders:4309·shopifyOrderStatus:438·amazonOrderItems:547) | PARTIAL-strong |
| 재고 동기화 | stock adapter | `ChannelSync.php`(pushStock:2821·hasStockAdapter:2811·woocommerceStock:2848·walmartStock:2872) | PARTIAL-strong |
| 가격 동기화 | 통화 변환 | `ChannelSync.php`(channelPrice:3904)·`MenuPricingSync`(287차) | PARTIAL-strong |
| 어댑터/계약 | preflight·op 검증 | `ChannelContract.php`(preflight:83)·`Connectors.php`(interface) | PARTIAL-strong |
| 자격증명 암호화 | AES-256-GCM·masked | `ChannelCreds.php`(v423:13·Crypto 202차:16·test:23) | PARTIAL-strong |
| 상품 배포/이미지 | writeback·채널 이미지 | `Catalog`(writeback)·`ChannelImage`(278차) | PARTIAL-strong |
| CRM 연계 | 구매 ingest | `ChannelSync.php`(ingestPurchaseToCrm:4512) | PARTIAL-strong |
| Omnichannel/Live | 채널별 | `Omnichannel`·`KrChannel`·`LiveCommerce` | PARTIAL |
| 채널 ROI/성과 | SoS | `Rollup`(SoS 267차) | PARTIAL |
| Rate Limit | 전역 | (282차 전역 레이트리밋) | PARTIAL |
| Audit | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |

## 부재(ABSENT-formal) — 형식 통합 Adapter Framework (grep 판정)
형식 통합 Marketplace Adapter Framework(REST/GraphQL/SOAP/FTP/File/Event 표준 Connector Interface)·Channel Sync Engine(통합 오케스트레이션)·Retry Policy(형식)·형식 Channel Governance Manager·CHANNEL_SYNC_JOB/CHANNEL_ERROR 형식 관리·Publication Rollback·Event 표준(ChannelRegistered 등).

## 판정
**PARTIAL-strong / ABSENT-formal.** ★채널 통합은 **앱의 최강 도메인 중 하나로 광범위 실재**: `ChannelRegistry`(DB 동적 형식 레지스트리)·`ChannelSync`(14채널·order/stock/price per-channel adapter·saveOrders Idempotent·pushStock·channelPrice)·`ChannelContract`(preflight)·`ChannelCreds`(AES-256-GCM·masked·test)·`ChannelImage`(278차)·`Connectors`(interface)이나, **형식 통합 Marketplace Adapter Framework(표준 Connector Interface)·Channel Sync Engine(통합)·Retry Policy는 부재**(Part 021 정합·데이터 헌법 Vol2 Connector Registry 정합). 실행은 형식 통합 계층 신설(채널 재구현 없이) 종속.
