# DSAR — Resource Type (§9)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Entity `AUTHORIZATION_RESOURCE_TYPE`
resource_type_code · domain · description_reference · **default_data_classification · default_financial_sensitivity · default_PII_sensitivity · operational_criticality · instance_level_required · environment_scoped · provider_scoped** · version · status · evidence

## 규칙
- **Resource Type 없는 Authorization Check 금지**(§44 Lint).
- Rebate Resource Type 40 = [REBATE_AUTHORIZATION_RESOURCE_REGISTRY](DSAR_REBATE_AUTHORIZATION_RESOURCE_REGISTRY.md).
- **현행**: Resource Type Registry 부재(메뉴 키가 사실상 Resource) → **Canonical Registry 신설 + 기존 메뉴 키 매핑**(중복 신설 금지).
