# MEA Part 022 — Enterprise Product Information Management (PIM) Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **MEA Part 021(Commerce Foundation)+Data Platform(001~012)+ROI Platform(013~020)**을 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). ★**상품 카탈로그/이미지/발행/동기화는 이미 실재**(GT①·`Catalog`·`ChannelImage`·`ChannelSync`)·본 Part는 형식 Product Master Repository/Attribute Manager 계층만 추가(상품 도메인 재구현 없이). file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
판매 상품 정보를 중앙 생성/관리/검증/배포/동기화하는 표준. 상품 마스터 데이터 단일 기준(SSOT). Marketplace/ERP/OMS/WMS/AI Commerce/ROI Platform 상품 정보 표준.

## §2 구현 범위
Product Master Management · Product Catalog · Classification · Attribute Management · Digital Asset Management · Product Lifecycle · Validation · Publishing · Synchronization · AI Product Intelligence.

## §3 구현 목표 (10)
Product Master Repository · Product Catalog Manager · Product Attribute Manager · Product Classification Manager · Digital Asset Manager · Product Validation Engine · Product Publishing Service · Product Synchronization Service · Product Audit Service · AI Product Intelligence Engine.

## §4 아키텍처 원칙 (10)
Product Single Source of Truth · Metadata Driven · Reusable Product Information · API First · Event Driven · Version Controlled · Marketplace Ready · AI Assisted · Enterprise Standard · Audit by Default.

## §5 Canonical Entity (15)
PRODUCT_MASTER · PRODUCT_VARIANT · PRODUCT_CATEGORY · PRODUCT_BRAND · PRODUCT_ATTRIBUTE · PRODUCT_ATTRIBUTE_SET · PRODUCT_IMAGE · PRODUCT_VIDEO · PRODUCT_DOCUMENT · PRODUCT_SPECIFICATION · PRODUCT_TAG · PRODUCT_STATUS · PRODUCT_VERSION · PRODUCT_AUDIT · PRODUCT_PUBLISH_PROFILE. → 상세 = `MEA_PART022_CANONICAL_ENTITIES.md`.

## §6 Product Domain (10)
Physical/Digital/Subscription/Service/Bundle/Variant/Marketplace/Logistics/AI/Enterprise Product. Product Master 기준. → ★현행=Physical/Marketplace=`Catalog`·Subscription=`Paddle`·Bundle/Variant=`ProductAddon`/`Catalog`(옵션)·Logistics=`Wms`. 형식 Product Master 통합=부분.

## §7 Product Lifecycle (8)
Draft→Review→Approval→Published→Active→Suspended→Discontinued→Archived. Published 이전 판매 금지. → ★현행=`Catalog`(catalog_writeback_job·operation=publish·catalog_writeback_approval 승인 게이트·GT①)·high-value 승인(289차). 형식 통합 Lifecycle Manager(Draft~Archived)=부분.

## §8 Product Attribute Management (8)
Attribute Definition/Group/Template · Multi-language · Required Validation · Custom · Marketplace Attribute Mapping · Version. Category별 Template. → ★현행=Marketplace Attribute Mapping=`Catalog`(category mapping 227차·[[reference_st11_product_register_full_spec]] 필수필드)·Multi-language=15개국 i18n. ★형식 Attribute Definition/Set/Template/Version Manager=ABSENT.

## §9 Product Catalog (8)
Category Tree · Collection · Featured · Bundle · Cross/Up Selling · Related Product · Search Index. Marketplace별 구성. → ★현행=Category=`Catalog`(src_category→channel_code 매핑 227차)·Cross/Up Selling=`AutoRecommend`(CF 282차)·Bundle=`ProductAddon`. 형식 Collection/Featured/Search Index=부분.

## §10 Digital Asset Management (8)
Product Image/Thumbnail/Gallery/Video · User Manual · Technical/Certification Document · Marketing Asset. 버전 관리·원본 보존. → ★★현행=`ChannelImage`(278차·채널별 MODE_ID/MODE_URL·max·GT①)+`MediaHost`(sha256 content-addressed immutable·원본 보존)+`ChannelContract`. 이미지 실 강함. Video/Document(형식)=부분.

## §11 Product Publishing (8)
Internal/Marketplace/Channel/Scheduled/Incremental/Bulk Publishing · Validation · Rollback. 감사 대상. → ★현행=`Catalog`(catalog_writeback_job·writeback 송출·승인 게이트·GT①)·`ChannelSync`(채널 발행). ★Publishing 감사=`SecurityAudit`. Scheduled/Rollback(형식)=부분.

## §12 Product Synchronization (8)
ERP/OMS/WMS/Marketplace/Mobile/Web/AI Commerce/ROI Platform. Event 기반. → ★현행=Marketplace=`ChannelSync`(14채널)·WMS=`Wms`·ROI=`Rollup`/`Pnl`. ★재고 델타 자동 푸시(283차). ERP(사방넷 이상)=부분. Event-driven(형식)=부분.

## §13 Data Security
Tenant Isolation · Product Data Encryption · RBAC · Asset Access Control · Audit Logging · Version Protection. → ★Part 021 상속: Tenant=`Db.php`·RBAC=`index.php`·Encryption=`Crypto`·Asset=`MediaHost`/`ChannelImage`·Audit=`SecurityAudit`.

## §14 Runtime 규칙
Product/Attribute/Category/Asset 검증 · Publishing · Synchronization · Audit. → ★현행=Product=`Catalog`·Category=매핑(227차)·Asset=`ChannelImage`(MIME allowlist 잔여 289차)·Publishing=`Catalog`·Sync=`ChannelSync`·Audit=`SecurityAudit`.

## §15 API 표준 (8)
Register/Update/Publish/Query Product · Upload Asset · Validate · Synchronize · Query Audit. → ★현행=`Catalog` API(등록/writeback·GT①)·`ChannelImage` API(자산)·`ChannelSync` API(sync) 실재. Part 001 API 표준(`/api` 접두) 상속.

## §16 Event 표준 (8)
ProductCreated/Updated/Published/Activated/Discontinued · ProductAssetUploaded · ProductSynchronized · ProductAudited. → ★현행=`Catalog`(writeback)·`ChannelSync`(sync) seed(동기·event-driven 부재). Data Platform §15 정합.

## §17 AI Integration
상품 속성/설명 자동 생성 · 카테고리 자동 추천 · 태그 자동 생성 · 이미지 품질 분석 · Marketplace 최적화 · SEO 최적화 · 상품 성과 예측. **AI는 상품 정보 자동 승인/직접 게시 불가.** → ★현행=성과 예측=`Mmm`/`DemandForecast`·상품 추천=`AutoRecommend`·설명/속성 생성=`ClaudeAI`(마케팅 AI KEEP_SEPARATE)·Explainability=헌법 V4·자동 게시 불가=헌법 V3+V5+`CHANGE_GATE`.

## §18 성능 요구사항
상품 조회 ≤200ms · 등록 ≤500ms · 검증 ≤300ms · Publishing ≤2초 · Sync ≤3초 · Availability ≥99.99%. (현행 `Catalog`·11번가 N+1 회피 285차 seed.)

## §19 Completion Criteria
Product Master Repository·Catalog·Attribute·DAM·Publishing·Sync·Security·Runtime·API/Event·AI 구현. → **부분 충족**(카탈로그/발행/DAM/동기화 실재·형식 Product Master Repository·Attribute Manager·Lifecycle Manager=미완). 코드 0.

## 판정
**PARTIAL-strong(★상품 카탈로그=`Catalog`(등록/writeback·category mapping)·DAM=`ChannelImage`(채널별 이미지)+`MediaHost`(sha256 immutable 원본 보존)·Publishing=`Catalog`(writeback_job·승인 게이트)·Sync=`ChannelSync`(14채널·재고 델타 283차)·11번가 표준필수 정본(286차)·Security=Tenant/RBAC/Crypto/SecurityAudit) / ABSENT-formal(형식 Product Master Repository(SSOT·variant/attribute-set/version-controlled)·Product Attribute Manager(Definition/Set/Template/Version)·Product Classification Manager·Product Lifecycle Manager(Draft~Archived)·Product Validation Engine(형식)·Event 표준).** ★핵심=상품 카탈로그·발행·DAM·동기화는 **실재**(278차 이미지 아키텍처·192차 writeback·286차 11번가 정본)이나 형식 metadata-driven Product Master Repository·Attribute Set/Template·version-controlled PIM은 부재(상품=채널 집계 중심·Part 021 handler별 구현 정합). Part 021/Data Platform 상속(재정의 금지)·★중복 상품/카탈로그/이미지 도메인 절대 금지(값 분산=회귀)·마케팅 AI KEEP_SEPARATE·★AI 상품 정보 자동 승인/직접 게시 불가(V3+V5). 코드 변경 0.

## 다음
MEA Part 023 — Enterprise Product Pricing & Pricing Intelligence Architecture(본 PIM 상속·확장).
