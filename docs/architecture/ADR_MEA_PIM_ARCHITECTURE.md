# ADR — MEA Part 022 Enterprise Product Information Management (PIM) Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part022 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 022는 PIM(상품 마스터 데이터 SSOT). ★코드베이스에는 **상품 카탈로그/이미지/발행/동기화가 이미 실재**: `Catalog.php`(192차·catalog_product·catalog_writeback_job/approval 발행 승인 게이트·category mapping 227차·high-value 게이트 289차·GT①)·`ChannelImage.php`(278차·채널별 MODE_ID/MODE_URL 이미지·max·GT①)+`MediaHost`(sha256 content-addressed immutable·원본 보존)·`ChannelSync`(14채널 동기화)·11번가 표준필수 정본([[reference_st11_product_register_full_spec]]·286차). 본 Part는 Part 021/Data Platform 상속(재정의 금지).

## 결정
- **D-1 (Part 021/Data Platform 재정의 금지):** Commerce Foundation(Part 021)·Metadata(Part 004)·DataPlatform을 준수·인용. 상품 도메인=`Catalog`/`ChannelImage`/`ChannelSync`. 중복 정의 금지.
- **D-2 (상품 카탈로그 = Catalog 승격·★중복 상품 도메인 절대 금지):** 상품 등록/발행 = `Catalog`(catalog_writeback_job·writeback·category mapping 227차)·옵션/번들=`ProductAddon`. ★11번가 표준필수 정본(286차·selPrc/optSelectYn/원산지/ProductNotification·[[reference_st11_product_register_full_spec]]) 재구현/재학습 금지. ★중복 상품/카탈로그 도메인 신설 절대 금지(값 분산=회귀). 형식 Product Master Repository는 채널 집계를 SSOT로 승격(상품 재구현 아님).
- **D-3 (DAM = ChannelImage/MediaHost 승격):** Digital Asset = `ChannelImage`(278차·채널별 이미지 mode)+`MediaHost`(sha256 content-addressed immutable·원본 보존·[[project_n278_channel_image_architecture]])+`ChannelContract`. ★brandAssetUpload MIME allowlist 잔여(289차)=후속 fix. 형식 Video/Document Asset Manager=순신설(중복 미디어 스토어 금지).
- **D-4 (Master/Attribute = 형식 신설):** ★형식 Product Master Repository(variant/attribute-set/version-controlled)·Product Attribute Manager(Definition/Set/Template/Version)·Product Classification Manager·Lifecycle Manager(Draft~Archived)=ABSENT(상품=채널 집계 중심)·순신설. ★Attribute Mapping seed=category mapping(227차)·표준모델(데이터 헌법·채널 나열 금지).
- **D-5 (Publishing/Sync/Security/AI = 헌법·무후퇴 정합):** Publishing=`Catalog`(writeback+승인 게이트)·Sync=`ChannelSync`(14채널·재고 델타 283차)·Tenant=`Db.php`·RBAC=`index.php`·Asset=`MediaHost`·Audit=`SecurityAudit`. AI(속성/설명 생성·카테고리 추천·이미지 품질)=`ClaudeAI`(마케팅 AI KEEP_SEPARATE)/`AutoRecommend`·성과 예측=`DemandForecast`/`Mmm`·Explainability=헌법 V4·★AI 상품 정보 자동 승인/직접 게시 불가=헌법 V3+V5+`CHANGE_GATE`.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 021/Data Platform/헌법 상속·재정의 금지·상품 카탈로그(`Catalog`)·DAM(`ChannelImage`/`MediaHost`)·발행(`Catalog` writeback)·동기화(`ChannelSync`)·11번가 정본(286차)·`SecurityAudit` 재사용(★중복 상품/카탈로그/이미지 도메인 절대 금지)·형식 Product Master Repository·Attribute Manager·Classification/Lifecycle Manager만 신설(상품 재구현 없이). 실행은 채널 집계→마스터 SSOT 승격 계층 신설 종속.
