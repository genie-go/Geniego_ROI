# DSAR — Role Reconciliation (§46)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 비교 대상(16)
IdP Group vs Internal Role · SCIM Membership vs Subject Binding · HRIS Department vs Organization Scope · **HRIS Employment Status vs Active Assignment** · Tenant Membership vs Tenant Role · Workspace Membership vs Workspace Role · Legal Entity Employment vs Financial Role Scope · External Contract vs External Role Validity · Provider Permission vs Internal Role · Role Definition Version vs Assignment Version · **Role Grant vs Actual Permission** · **Role Revocation vs Active Session** · **Group Removal vs Assignment Removal** · Program Termination vs Program Role · Deprecated Role vs Active Assignment · **Role Usage vs Assigned Privilege**.

## 계약
reconciliation id·subject·role·assignment·comparison type·source state·**canonical state**·difference·severity·detected_at·resolved_at·resolution·evidence.

## 🔴 실측
| 비교 | 가능 여부 |
|---|---|
| **IdP Group vs Internal Role** | ✅ **원재료 REAL** — `sso_group_role_map` + `roleForGroups()` |
| **SCIM Membership vs Subject Binding** | ✅ **원재료 REAL** — `sso_config.scim_enabled`·`scimJson()` |
| **Role Revocation vs Active Session** | ✅ **원재료 REAL** — `user_session` · `EnterpriseAuth.php:400` |
| **HRIS** 관련 4종 | ❌ **HRIS 연동 부재(grep 0)** |
| 나머지 | ❌ Registry 부재 |

## 🔴 "Role Grant vs Actual Permission" 이 가장 중요하다
**부여했다고 믿는 것과 실제 권한이 다른 상태**를 잡는 비교이며,
**06-A 관통 패턴("있다고 믿는 것이 없다")의 직접 탐지기**다.

## 분류
IdP/SCIM/Session = **VALIDATED_LEGACY(원재료 재사용)** · Reconciliation 엔진 = **NOT_APPLICABLE → 신설**(1-1 Reconciliation 패턴 재사용).
