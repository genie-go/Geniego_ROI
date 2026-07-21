# MEA Part 022 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = PIM 신설이 기존 상품 카탈로그(`Catalog`)·이미지(`ChannelImage`/`MediaHost`)·동기화(`ChannelSync`)·Part 021과 중복 재정의하지 않도록 경계 확정. ★상품 도메인 실재로 중복 위험 최상.

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| PRODUCT/CATEGORY | ★MEA Part 021 Commerce Foundation·`Catalog` | ★재정의 금지·재사용 |
| Product Metadata | ★MEA Part 004 Metadata·`DataPlatform` | 참조·재사용 |
| Marketplace/채널 이미지 | ★데이터 헌법(채널 나열 금지)·`ChannelImage`(278차) | ★재정의 금지·재사용 |
| 11번가 표준필수 | ★[[reference_st11_product_register_full_spec]](286차) | ★재정의/재학습 금지 |
| Product Security | ★MEA Part 021·`index`/`Crypto`/`SecurityAudit` | 참조·재정의 금지 |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★중복 상품/이미지 도메인 절대 금지)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| 상품 카탈로그/발행 | writeback·승인 게이트 | `Catalog.php`(192차) | ★재사용(★중복 상품 도메인 신설 절대 금지) |
| Digital Asset(이미지) | 채널별 이미지 | `ChannelImage.php`(278차) | ★재사용(중복 DAM 금지) |
| 원본 보존 | sha256 immutable | `MediaHost` | ★재사용(★중복 미디어 스토어 절대 금지) |
| 동기화 | 14채널 sync | `ChannelSync.php` | 재사용(중복 sync 금지) |
| Category Mapping | src→channel | `Catalog.php`(227차) | 재사용 |
| Security | Tenant/RBAC/Crypto/Audit | `index`·`Crypto`·`SecurityAudit` | 재사용·재정의 금지 |
| AI | 설명 생성·마케팅 AI | `ClaudeAI` | KEEP_SEPARATE |

## ★교훈 반영
- [[feedback_no_regression_value_unification]]: 상품 마스터 단일 정의·값 무후퇴=★중복 상품/이미지 도메인 절대 금지(값 분산=회귀).
- [[feedback_no_duplicate_features]]: 착수 전 grep 전수·있으면 기존 심화. ★상품 카탈로그/이미지/동기화 이미 실재.
- ★11번가 표준필수 정본(286차)·selPrc/optSelectYn/원산지/ProductNotification=재구현/재학습 금지([[reference_st11_product_register_full_spec]]).
- ★MediaHost=sha256 content-addressed immutable(278차)=원본 보존 정본·중복 미디어 스토어 금지.
- [[reference_platform_growth_actas_tenant_hijack]]: Cross-Tenant Product Leakage·Tenant Isolation.
- [[reference_menu_audit_log_not_tamper_evident]]: Product Audit 정본 = `SecurityAudit::verify`만.

## 확장 대상(중복 신설 금지·기존 승격)
- 상품 카탈로그=`Catalog` 승격(상품 재구현 금지·마스터 SSOT 승격). DAM=`ChannelImage`/`MediaHost` 승격. 동기화=`ChannelSync`. Audit=`SecurityAudit`.

## 판정
**중복 위험 최상(상품 카탈로그·이미지·동기화 실재).** ★핵심=`Catalog`(등록/writeback)·`ChannelImage`+`MediaHost`(이미지·원본 보존)·`ChannelSync`(동기화)·`ProductAddon`(옵션)·11번가 정본(286차)·`SecurityAudit`는 **재사용/승격**(★중복 상품/카탈로그/이미지 도메인 신설 절대 금지=값 분산=무후퇴 위반·정본 재구현 금지). Part 021 Commerce Foundation·Part 004 Metadata·데이터 헌법(채널 나열 금지)·Security Part·헌법 **재정의 금지**. 본 Part 고유 순신설=형식 Product Master Repository(SSOT·variant/attribute-set/version)·Attribute Manager(Definition/Set/Template/Version)·Classification/Lifecycle Manager·Video/Document Asset Manager·Event 표준뿐. 마케팅 AI KEEP_SEPARATE·★AI 상품 정보 자동 승인/직접 게시 불가(V3+V5+CHANGE_GATE).
