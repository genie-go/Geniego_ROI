# MEA Part 022 — Governance Mechanisms (§7~§19 통합)

> **거버넌스 상태**: 거버넌스 메커니즘 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★상품 카탈로그(`Catalog`)·이미지(`ChannelImage`/`MediaHost`)·동기화(`ChannelSync`)·SecurityAudit 재사용(★중복 상품/이미지 도메인 절대 금지·11번가 정본 재구현 금지)·형식 Product Master Repository/Attribute Manager 신설(상품 재구현 없이).

## §7 Lifecycle 거버넌스
Draft→Review→Approval→Published→Active→Suspended→Discontinued→Archived. **Published 이전 판매 금지.** 현행=`Catalog`(catalog_writeback_job·operation=publish·catalog_writeback_approval 승인 게이트)+high-value 승인(289차). 형식 통합 Lifecycle Manager=순신설.

## §8 Attribute 거버넌스
Definition/Group/Template/Multi-language/Required Validation/Custom/Marketplace Mapping/Version. 현행=Marketplace Mapping=`Catalog`(src→channel 227차)+11번가 필수필드([[reference_st11_product_register_full_spec]]·286차·selPrc/optSelectYn/원산지/ProductNotification)·Multi-language=15개국 i18n. ★형식 Attribute Definition/Set/Template/Version Manager=순신설(11번가 정본 재구현 금지).

## §9 Catalog 거버넌스
Category Tree/Collection/Featured/Bundle/Cross·Up Selling/Related/Search Index. 현행=Category=`Catalog`(매핑 227차)·Cross/Up=`AutoRecommend`(CF 282차)·Bundle=`ProductAddon`. Marketplace별 구성·형식 Collection/Search Index=순신설.

## §10 DAM 거버넌스
Image/Thumbnail/Gallery/Video/Manual/Technical·Certification Document/Marketing Asset·버전 관리·원본 보존. ★현행=`ChannelImage`(278차·채널별 MODE_ID/MODE_URL·max)+`MediaHost`(sha256 content-addressed immutable·원본 보존·[[project_n278_channel_image_architecture]])+`ChannelContract`. ★brandAssetUpload MIME allowlist 잔여(289차)=후속 fix. Video/Document(형식)=순신설(중복 미디어 스토어 금지).

## §11 Publishing 거버넌스
Internal/Marketplace/Channel/Scheduled/Incremental/Bulk/Validation/Rollback·감사 대상. 현행=`Catalog`(writeback_job·승인 게이트)·`ChannelSync`(채널 발행)·Audit=`SecurityAudit`·high-value 게이트(289차). Scheduled/Rollback(형식)=순신설.

## §12 Sync 거버넌스
ERP/OMS/WMS/Marketplace/Mobile/Web/AI Commerce/ROI Platform·Event 기반. 현행=Marketplace=`ChannelSync`(14채널)·WMS=`Wms`·ROI=`Rollup`/`Pnl`·재고 델타 자동 푸시(283차). ★채널 나열 금지·표준모델(데이터 헌법). ERP(사방넷 이상)=순신설.

## §13 Security 거버넌스
Tenant=`Db.php`([[reference_platform_growth_actas_tenant_hijack]])·RBAC=`index.php`(viewer<connector<analyst<admin+writeGuard)·Product Encryption=`Crypto`·Asset Access=`MediaHost`/`ChannelImage`·Audit=`SecurityAudit::verify`(★유일 tamper-evident·[[reference_menu_audit_log_not_tamper_evident]])·Version Protection=git+`CHANGE_GATE`.

## §14 Runtime 거버넌스
Product/Attribute/Category/Asset 검증·Publishing·Sync·Audit. Product=`Catalog`·Category=매핑(227차)·Asset=`ChannelImage`(MIME allowlist 289차)·Publishing=`Catalog`·Sync=`ChannelSync`·Audit=`SecurityAudit`·품질=Trust First(Part 006).

## §15 API 거버넌스 (8)
Register/Update/Publish/Query Product·Upload Asset·Validate·Synchronize·Query Audit. 현행=`Catalog` API·`ChannelImage` API·`ChannelSync` API 실재. ★신규 실배선 `/api` 접두 필수([[reference_api_prefix_routing]]). Part 001 API 표준 상속.

## §16 Event 거버넌스 (8)
ProductCreated/Updated/Published/Activated/Discontinued/ProductAssetUploaded/ProductSynchronized/ProductAudited. 현행=`Catalog`(writeback)·`ChannelSync`(sync) seed(동기·event-driven 부재). Data Platform §15 정합.

## §17 AI 거버넌스
속성/설명 자동 생성/카테고리 추천/태그/이미지 품질/Marketplace·SEO 최적화/성과 예측. 현행=성과 예측=`Mmm`/`DemandForecast`·추천=`AutoRecommend`·설명/속성=`ClaudeAI`(마케팅 AI KEEP_SEPARATE)·Explainability=헌법 V4. ★AI는 상품 정보 자동 승인/직접 게시 불가=헌법 V3+V5+`CHANGE_GATE`.

## §18~§19 성능·완료
성능=`Catalog`·11번가 N+1 회피(285차) seed(벤치 대상 미존재). 완료=형식 Product Master Repository/Attribute Manager/Lifecycle Manager 구현 시(부분 충족·코드 0). ★단 카탈로그·발행·DAM·동기화는 실재.

## 판정
전 메커니즘 **설계-only·코드 0·NOT_CERTIFIED.** ★상품 카탈로그(`Catalog`)·이미지(`ChannelImage`/`MediaHost`)·발행(`Catalog` writeback)·동기화(`ChannelSync`)·11번가 정본(286차)·Audit(`SecurityAudit`) 재사용·승격(★중복 상품/카탈로그/이미지 도메인 절대 금지=값 분산=회귀·정본 재구현 금지)·형식 Product Master Repository/Attribute Manager/Classification·Lifecycle Manager만 신설(상품 재구현 없이). Part 021/Data Platform/데이터 헌법(채널 나열 금지)/헌법 상속·재정의 금지·★AI 상품 정보 자동 승인/직접 게시 불가(V3+V5+CHANGE_GATE).
