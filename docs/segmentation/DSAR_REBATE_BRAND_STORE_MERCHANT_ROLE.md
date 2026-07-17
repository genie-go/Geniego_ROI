# DSAR — Brand·Store·Merchant Role (§20)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약 — Role Scope
특정 Brand 전체 · 특정 Store · 특정 Merchant · 특정 Seller · 특정 Marketplace · 특정 Product Program.

## 🔴 규칙
- **Brand Manager 가 Merchant Funding·Payout 정보를 자동 조회하지 않게 하라.**
- **Merchant User 는 자신의 Merchant Scope 를 벗어난 Program 을 조회하지 못하게 한다.**

## 🔴 실측 — Brand Registry 는 REAL 이다 (1-1 정정)
| 축 | 실측 |
|---|---|
| **Brand** | ✅ **REAL** — `catalog_brand`(id·**tenant_id**·name·code·created_at·updated_at·**UNIQUE(tenant_id,name)**) `Catalog.php:151/161` · 조회 :353 · **285차 신설**(CRUD 4EP) |
| **Merchant·Seller** | ✅ **REAL** — `channel_credential.seller_id` · `kr_settlement_line` · ChannelRegistry |
| **Product** | ✅ **REAL** — `Catalog`(catalog_listing/catalog_category) · `channel_products` |
| **Store** | ❌ **부재(grep 0)** |

## 🔴 1-1 실측 정정
**1-1 `MASTER_REGISTRY` §0 은 "Workspace/Brand/Store registry = 부재(NOT_APPLICABLE)"** 로 기록했다.
**Brand 는 부재가 아니다** — `catalog_brand` 가 **285차에 신설**됐고 tenant 격리 UNIQUE 까지 갖췄다.
**Workspace·Store 는 부재가 맞다.**

> 원인 추정: 1-1 작성 시점에 `catalog_brand`(285차)를 보지 못했거나 `brand` 를 DATA_SCOPES 값으로만 인식했을 수 있다.
> **본 세션은 1-1 문서를 수정하지 않는다**(비파괴 · 남의 블록 산출물) → **인계**.

## 분류
Brand·Merchant·Seller·Product = **VALIDATED_LEGACY(재사용 강제)** · Store = **NOT_APPLICABLE → 신설**.
