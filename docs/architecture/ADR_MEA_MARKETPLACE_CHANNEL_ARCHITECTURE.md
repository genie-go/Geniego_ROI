# ADR — MEA Part 029 Enterprise Marketplace Integration & Channel Management Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part029 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 029는 Marketplace Integration & Channel Management(전 채널 통합·실시간 동기화). ★코드베이스에는 **채널 통합이 앱의 최강 도메인 중 하나로 광범위 실재**: `ChannelRegistry.php`(통합 채널 레지스트리·DB 동적·channel_registry·channel_key/name/group/fields/sync_kind·GET /v426/channels·GT①)·`ChannelSync.php`(14채널·saveOrders·pushStock·hasStockAdapter·channelPrice·per-channel adapter shopify/amazon/woocommerce/walmart·ingestPurchaseToCrm·GT①)·`ChannelContract.php`(preflight·op 검증)·`ChannelCreds.php`(v423·AES-256-GCM·masked·test·GT①)·`ChannelImage`(278차)·`Connectors`(connector interface)·`Omnichannel`/`KrChannel`/`LiveCommerce`. ★데이터 헌법 Vol2=Connector Registry·표준모델·채널 나열 금지. 본 Part는 Part 021~027 상속(재정의 금지).

## 결정
- **D-1 (Part 021~027/데이터 헌법 재정의 금지):** Commerce Foundation(Part 021)·PIM(Part 022)·Pricing(Part 023)·OMS(Part 024)·Inventory(Part 027)·데이터 헌법 Vol2(Connector)를 준수·인용. 채널 도메인=`ChannelRegistry`/`ChannelSync`. 중복 정의 금지·★채널 나열 금지(표준모델).
- **D-2 (채널 레지스트리 = ChannelRegistry 승격·★중복 채널 도메인 절대 금지):** 채널 = `ChannelRegistry`(DB 동적·channel_registry·형식 레지스트리 실재·4곳 하드코딩 통합). ★신규 채널=자동 노출(Connector Registry 등록·데이터 헌법 Vol2 §14). ★중복 채널 레지스트리/인텔리전스 신설 절대 금지(값 분산=회귀·데이터 헌법). 형식 Channel Management Engine은 `ChannelRegistry`를 승격(채널 재구현 아님).
- **D-3 (어댑터 = ChannelSync/ChannelContract 승격):** 어댑터 = `ChannelSync`(per-channel order/stock/price)·`ChannelContract`(preflight)·`Connectors`(interface)·`AdAdapters`(광고). ★11번가 표준필수([[reference_st11_product_register_full_spec]]·286차)·★st11 -997=(경로,메서드) 미등록(인증실패 아님·키·IP·이용신청 정상·재의심 금지·[[reference_st11_openapi_997_and_paths]])·재구현/재학습 금지. 형식 통합 Adapter Framework(REST/GraphQL/SOAP/FTP 표준 Connector Interface)=순신설(중복 어댑터 금지).
- **D-4 (동기화 = ChannelSync 승격·★중복 sync 절대 금지):** 주문 sync=`ChannelSync`(saveOrders·Idempotent 중복 방지)·재고 sync=`ChannelSync`(pushStock)·가격 sync=`ChannelSync`(channelPrice)/`MenuPricingSync`(287차)·재고 SSOT=`Wms`·재고 델타 자동 푸시(283차). ★11번가 N+1 회피(285차·루프 내 외부 API 금지)=정본. 형식 통합 Channel Sync Engine·Retry Policy=순신설(중복 sync 로직 금지).
- **D-5 (Security/Governance/AI = 헌법·자격증명 정합):** ★Credential Encryption=`ChannelCreds`(AES-256-GCM via `Crypto`·202차+·masked on read·평문노출 회피 [[feedback_credentials_handling]])·OAuth=`OAuth`·Tenant=`Db.php`·Rate Limit=전역(282차)·Audit=`SecurityAudit`. AI(채널 ROI/성과/오류 탐지)=`Rollup`(SoS 267차)/`AnomalyDetection`·Explainability=헌법 V4·★AI 외부 채널 자동 게시/설정 변경 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 021~027/데이터 헌법/헌법 상속·재정의 금지·채널 레지스트리(`ChannelRegistry`)·어댑터(`ChannelSync`/`ChannelContract`/`Connectors`)·자격증명(`ChannelCreds` AES-256-GCM)·동기화(`ChannelSync`)·`SecurityAudit` 재사용(★중복 채널/어댑터/자격증명 도메인 절대 금지·채널 나열 금지·표준모델·st11 정본 재구현 금지)·형식 통합 Marketplace Adapter Framework·Channel Sync Engine·Retry Policy·Governance Manager만 신설(채널 재구현 없이). 실행은 형식 통합 계층 신설 종속.
