# DSAR — Rebate Role Catalog (§6)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 실측 — 현행 Catalog 상당물
**Catalog 개념 부재(grep 0)**. 그러나 **역할 정의처가 3계통 분산 REAL**: ①`acl_permission` 메뉴×8동작(`TeamPermissions.php:15`) ②`api_key.role`+`scopes_json`(`Db.php:942-955`) ③admin master/sub(`requireMasterAdmin2` 5핸들러·286차).

## Canonical 계약
role_catalog_id·tenant_id·organization_id·catalog_type·catalog_name·standard/custom role support·restricted role policy·default assignment duration·access review frequency·environment scope·owner·active version·status·valid_from/to·evidence.

**Catalog Type(8)**: PLATFORM · TENANT · WORKSPACE · ORGANIZATION · PARTNER · VENDOR · SYSTEM · CUSTOM.

## 분류
**NOT_APPLICABLE → 신설**(Catalog 자체) + **CONSOLIDATION_REQUIRED**(3계통을 Catalog 하위로 통합 · **★4번째 Role Registry 신설 금지** — 5-1 §51 결론 2).
Workspace/Organization Catalog 는 **상위 Registry 부재로 계약만 준비**(§15).
