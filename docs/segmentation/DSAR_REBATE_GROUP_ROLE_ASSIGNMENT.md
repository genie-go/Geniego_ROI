# DSAR — Group-based Assignment (§28)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약
source group · source system · mapped role · mapped scope · membership source · **membership freshness** · synchronization interval · **removal behavior** · approval requirement · **high-risk role restriction** · evidence.

## 🔴 실측 — 이 항목은 REAL 기반이 가장 두껍다
| 요소 | 실측 |
|---|---|
| **source group → mapped role** | ✅ **REAL** — `sso_group_role_map`(id·**tenant_id**·**group_name**·role default 'member'·updated_at·**UNIQUE uq_sgrm(tenant_id, group_name)**) `EnterpriseAuth.php:70/72` |
| **해석 로직** | ✅ **REAL** — `roleForGroups(\$pdo, \$tenant, \$groups)` :78 |
| **source system** | ✅ **REAL** — `sso_config`(protocol oidc/saml · `scim_enabled` · `auto_provision` · `default_role`) :59 |
| mapped scope · membership freshness · sync interval · **removal behavior** · high-risk restriction | ❌ **부재** |

## 🔴 핵심 규칙 (§28)
**Group Membership 제거 시 관련 Assignment 를 자동 비활성화한다.**
**동기화 지연 중 고위험 접근이 지속되지 않도록 Reconciliation·Runtime Hook 을 준비하라.**

> **`sso_group_role_map` 은 매핑을 하되 "제거되면 어떻게 되는가"(removal behavior)를 기록하지 않는다.**
> IdP 에서 그룹이 빠져도 **다음 로그인 전까지는 아무 일도 일어나지 않는다.**
> → §48 Critical Gap **"Group 제거 후 Role 유지"** · §47 **GROUP_REMOVAL_NOT_PROPAGATED**.
> **본 세션은 실 동작을 라이브 검증하지 않았으므로 `UNVERIFIED` 로 둔다**(FP 레지스트리).

## 선례 — AgencyPortal
**매 요청 approved 재검증 fail-closed**(272차)가 **동기화 지연 문제의 해법을 이미 보여준다** → 확장 대상.

## 분류
`sso_group_role_map`·`roleForGroups` = **VALIDATED_LEGACY(재사용 강제)** + **CONSOLIDATION_REQUIRED**(removal behavior·freshness 축 추가).
