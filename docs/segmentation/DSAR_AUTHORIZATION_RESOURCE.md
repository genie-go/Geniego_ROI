# DSAR — Authorization Resource (§10)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Entity `AUTHORIZATION_RESOURCE`
authorization_resource_id · resource_type · canonical_resource_id · **tenant_id · workspace_id · organization_id · brand_id · store_id · merchant_id · vendor_id · partner_id · legal_entity_id · country · region · environment · provider_id · provider_account_id · rebate_program_id · rebate_program_version_id · contract_reference · data_classification · financial_sensitivity · PII_sensitivity · operational_criticality** · status · valid_from/to · evidence

## 규칙
- **Resource Attribute 는 실 Canonical Entity 에서 파생하되 Decision 시점 Snapshot 생성** — 현재 값으로 과거 Decision 근거 덮어쓰기 금지(4-5-3-1-4 §38 Historical Binding 정합).
- **현행 한계**: 권한 대상이 **메뉴 단위**(acl_permission)라 **Resource Instance/Program/Version 수준 부재** → 신설(§13 Granularity).
- data_classification / financial_sensitivity / PII_sensitivity **미지정 Resource 는 최고 민감도로 취급**(fail-closed).
