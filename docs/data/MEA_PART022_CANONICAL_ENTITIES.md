# MEA Part 022 — Canonical Entities Design & Judgment (§5~§17)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★Catalog/ChannelImage/MediaHost/ChannelSync 재사용·형식 Product Master Repository/Attribute Manager greenfield·Part 021 상속·11번가 정본(286차) 재구현 금지.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | PRODUCT_MASTER | 채널 집계(형식 마스터 부재) | `Catalog.php`(catalog_product) | PARTIAL(집계·형식 마스터 ABSENT) |
| 2 | PRODUCT_VARIANT | 옵션/애드온 | `ProductAddon.php`·`Catalog`(옵션) | PARTIAL |
| 3 | PRODUCT_CATEGORY | src→channel 매핑 | `Catalog.php`(227차) | PARTIAL-strong |
| 4 | PRODUCT_BRAND | 브랜드(부분) | `Catalog`·`DigitalShelf` | PARTIAL-informal |
| 5 | PRODUCT_ATTRIBUTE | 필수필드(11번가) | [[reference_st11_product_register_full_spec]] | PARTIAL |
| 6 | PRODUCT_ATTRIBUTE_SET | 부재(형식 Set) | — | ABSENT-formal |
| 7 | PRODUCT_IMAGE | 채널별 이미지 | `ChannelImage.php`(278차) | PARTIAL-strong |
| 8 | PRODUCT_VIDEO | 부재(형식 Video) | — | ABSENT-formal |
| 9 | PRODUCT_DOCUMENT | 부재(형식 Document) | — | ABSENT-formal |
| 10 | PRODUCT_SPECIFICATION | ProductNotification(11번가) | [[reference_st11_product_register_full_spec]] | PARTIAL-informal |
| 11 | PRODUCT_TAG | 부재(형식 Tag) | — | ABSENT-formal |
| 12 | PRODUCT_STATUS | writeback 상태 | `Catalog`(writeback_job) | PARTIAL |
| 13 | PRODUCT_VERSION | 부재(형식 Version)·git | git | ABSENT-formal |
| 14 | PRODUCT_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| 15 | PRODUCT_PUBLISH_PROFILE | writeback+승인 게이트 | `Catalog`(approval) | PARTIAL |

## §6~§17 표준 판정
- **§6 Domain(10)**: Physical/Marketplace=Catalog·Subscription=Paddle·Bundle/Variant=ProductAddon·Logistics=Wms. 형식 Master 통합=부분.
- **§7 Lifecycle(8)**: catalog_writeback_job+approval(발행 승인)·high-value(289차)·형식 Lifecycle Manager(Draft~Archived)=부분.
- **§8 Attribute(8)**: Marketplace Mapping=category mapping(227차)+11번가 필수(286차)·형식 Attribute Set/Template/Version=ABSENT.
- **§9 Catalog(8)**: Category=Catalog 매핑·Cross/Up Selling=AutoRecommend(CF)·Bundle=ProductAddon·Search Index(형식)=부분.
- **§10 DAM(8)**: ★이미지=ChannelImage(278차)+MediaHost(sha256 immutable 원본 보존)·Video/Document(형식)=ABSENT.
- **§11 Publishing(8)**: Catalog writeback+승인 게이트·ChannelSync·Rollback/Scheduled(형식)=부분.
- **§12 Sync(8)**: ChannelSync(14채널)·Wms·재고 델타(283차)·ERP(사방넷 이상)=부분.
- **§13 Security**: Tenant/RBAC/Encryption/Asset(MediaHost)/Audit(Part 021 상속).
- **§17 AI**: 성과 예측=Mmm/DemandForecast·설명/속성=ClaudeAI(KEEP_SEPARATE)·Explainability=헌법 V4·자동 게시 불가=헌법 V3+V5+CHANGE_GATE.

## 판정
**PARTIAL-strong(§3·§7·§14=카테고리/발행/감사, ★§7 이미지=§10) / PARTIAL(§1·§2·§4·§5·§10 spec·§12·§15) / ABSENT-formal(§6·§8·§9·§11·§13 VERSION·형식 Product Master Repository/Attribute Set·Manager/Video·Document/Classification·Lifecycle Manager).** 코드 0. ★상품 카탈로그(`Catalog`)·이미지(`ChannelImage`/`MediaHost`)·동기화(`ChannelSync`) 재사용(★중복 상품/이미지 도메인 절대 금지·11번가 정본 재구현 금지)·형식 Product Master Repository/Attribute Manager 신설(상품 재구현 없이)·Part 021 상속·★AI 상품 정보 자동 승인/직접 게시 불가(V3+V5+CHANGE_GATE).
