# DSAR — Permission Granularity (§13·20종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Granularity (20) — 현행 대비
| Level | 현행 | 근거 |
|---|---|---|
| Resource Type | △(메뉴 키) | acl_permission |
| **Resource Instance** | ❌ 부재 | — |
| **Tenant** | ✅ REAL | auth_tenant · authedTenant 64 · tenant_id=? RLS |
| Workspace | △ | DATA_SCOPES(company/team) |
| **Program** / **Program Version** | ❌ 부재 | — |
| Brand / Store | ✅ REAL(부분) | DATA_SCOPES(brand) |
| Merchant / Vendor | △ | DATA_SCOPES(partner) |
| Country / Region | ❌ 부재 | — |
| **Legal Entity** | ❌ 부재 | 1-1/1-3 확정 |
| **Environment** | ❌ 부재(권한) | GENIE_ENV 는 데이터 격리용 |
| **Provider Account** | ❌ 부재 | — |
| Contract | ❌ 부재 | — |
| **Financial Threshold** | ❌ 부재 | — |
| **Field** | △ 산재 | Masking 3+곳 |
| **Row** | ✅ REAL | tenant_id=? |
| Operation | ✅ REAL | 8동작 |

## 규칙
**Tenant·Row·Operation 은 재사용** · 나머지는 **신설**. **Tenant Scope 없는 Rebate Permission 금지**(§44 Lint) · **Financial Threshold 초과 시 REQUIRE_APPROVAL**(§34).
