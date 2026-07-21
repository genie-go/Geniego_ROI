# MEA Part 022 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 022 SPEC/ADR.

## 전수조사 방법
catalog/product/master/variant/attribute/image/asset/publish/category/brand 키워드로 `backend/src/Handlers` 전수 grep + 판독.

## 실존 substrate (★상품 카탈로그·이미지·발행)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| 상품 카탈로그/등록 | 일괄 등록·writeback | `Catalog.php`(192차·catalog_product:55·GT) | PARTIAL-strong |
| 상품 발행(Publishing) | writeback job·승인 게이트 | `Catalog.php`(catalog_writeback_job:75·approval:86·operation=publish:79) | PARTIAL-strong |
| Category Mapping | src→channel 매핑 | `Catalog.php`(227차:95) | PARTIAL-strong |
| 11번가 표준필수 | 필수필드 정본 | [[reference_st11_product_register_full_spec]](286차) | PARTIAL-strong |
| Digital Asset(이미지) | 채널별 이미지 mode | `ChannelImage.php`(278차·MODE_ID/MODE_URL:44~50·max) | PARTIAL-strong |
| 원본 보존 | sha256 immutable | `MediaHost`(content-addressed·278차) | PARTIAL-strong |
| 상품 동기화 | 14채널 sync | `ChannelSync.php`·재고 델타(283차) | PARTIAL-strong |
| 옵션/번들 | 애드온 | `ProductAddon.php` | PARTIAL |
| Digital Shelf | 진열/계약 | `DigitalShelf.php`·`ChannelContract` | PARTIAL |
| Cross/Up Selling | CF 추천 | `AutoRecommend`(282차) | PARTIAL |
| Security | Tenant/RBAC/Crypto/Audit | `Db`·`index`·`Crypto`·`SecurityAudit` | PARTIAL-strong |

## 부재(ABSENT-formal) — 형식 Product Master/Attribute (grep 0 또는 산재)
형식 Product Master Repository(SSOT·variant/attribute-set/version-controlled)·Product Attribute Manager(Definition/Group/Set/Template/Version)·Product Classification Manager(형식 Category Tree)·Product Lifecycle Manager(Draft~Archived)·Product Validation Engine(형식)·Video/Document Asset Manager·Publish Profile·Event 표준(ProductCreated 등).

## 판정
**PARTIAL-strong / ABSENT-formal.** ★상품 카탈로그·발행·DAM·동기화는 **실재**: `Catalog`(등록/writeback·catalog_writeback_job·승인 게이트·category mapping 227차)·`ChannelImage`(278차 채널별 이미지)+`MediaHost`(sha256 immutable 원본 보존)·`ChannelSync`(14채널·재고 델타 283차)·11번가 표준필수 정본(286차)이나, **형식 metadata-driven Product Master Repository·Attribute Manager(Set/Template/Version)·Classification/Lifecycle Manager는 부재**(상품=채널 집계 중심·Part 021 handler별 구현 정합). 실행은 채널 집계→마스터 SSOT 승격 계층 신설(상품 재구현 없이) 종속.
