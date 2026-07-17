# DSAR — Authorization Scope (§25·24 Dimension)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## 실측 — ★현행 DATA_SCOPES 9종이 기반
`TeamPermissions::DATA_SCOPES = ['company','brand','team','campaign','product','channel','warehouse','partner','own']`(**9종**·TeamPermissions.php:41) = **VALIDATED_LEGACY(재사용·의미 변경 금지)**. `TEAM_TYPES`(:44) 병행.

## Scope Dimension (24)
TENANT(REAL) · WORKSPACE · ORGANIZATION · TEAM(REAL) · DEPARTMENT · **BRAND**(REAL) · STORE · MERCHANT · SELLER · VENDOR · **PARTNER**(REAL) · **LEGAL_ENTITY**(부재) · **PROGRAM**(부재) · **PROGRAM_VERSION**(부재) · CONTRACT(부재) · COUNTRY(부재) · REGION(부재) · **ENVIRONMENT**(권한 분리 부재) · PROVIDER(부재) · **PROVIDER_ACCOUNT**(부재) · DATA_CLASSIFICATION(부재) · **FINANCIAL_THRESHOLD**(부재) · FIELD(산재) · CUSTOM

## Entity `AUTHORIZATION_SCOPE`
authorization_scope_id · **scope_dimension · canonical_entity_reference · inclusion_mode · inherited · parent_scope** · valid_from/to · status · evidence

## 규칙
**기존 9종에 legal_entity·environment·provider_account·program·financial_threshold·field 추가**(기존 의미 변경 금지·Golden Rule=Extend) · **Scope 는 Canonical Entity Reference**(문자열 배열 금지).
