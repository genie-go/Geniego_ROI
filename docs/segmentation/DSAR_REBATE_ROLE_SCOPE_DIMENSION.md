# DSAR — Role Scope Dimension (§15)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약 — 24 Dimension
TENANT · WORKSPACE · ORGANIZATION · DEPARTMENT · TEAM · GROUP · BRAND · STORE · MERCHANT · SELLER · VENDOR · PARTNER · LEGAL_ENTITY · PROGRAM · PROGRAM_VERSION · CONTRACT · COUNTRY · REGION · ENVIRONMENT · PROVIDER · PROVIDER_ACCOUNT · DATA_CLASSIFICATION · FINANCIAL_THRESHOLD · FIELD_PROFILE.

## 🔴 실측 대조 — 현행 DATA_SCOPES 9 (`TeamPermissions.php:41`)
| 현행 9 | 계약 24 대응 |
|---|---|
| company | ORGANIZATION **근사**(정확 일치 아님) |
| **brand** | BRAND ✅ — **`catalog_brand` Registry REAL**(`Catalog.php:151`·285차) |
| **team** | TEAM ✅ — `team` REAL |
| campaign | **계약 24에 없음 — 현행 고유** |
| product | **계약 24에 없음 — 현행 고유** |
| channel | PROVIDER **근사** |
| warehouse | **계약 24에 없음 — 현행 고유** |
| **partner** | PARTNER ✅ — PartnerPortal REAL |
| own | **계약 24에 없음 — 현행 고유**(Subject 자기 범위) |

## 🔴 최종 Dimension = 24 ∪ 현행 고유 4 = **28** (합집합·무후퇴)
5-1 §51 판정: **"통합(기존 9종 의미 변경 금지)"**.
`campaign`·`product`·`warehouse`·`own` 은 **계약 24에 없는 현행 고유 축**이며 **삭제 시 즉시 회귀**한다.
**스펙에 없다는 이유로 기존 축을 버리면 1-9 최우선 명령(정상 접근 유지) 위반이다.**

**부재 Dimension(9)**: WORKSPACE · DEPARTMENT · GROUP · STORE · LEGAL_ENTITY · REGION · DATA_CLASSIFICATION · FINANCIAL_THRESHOLD · FIELD_PROFILE.
