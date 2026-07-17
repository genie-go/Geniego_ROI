# DSAR — Organization Role Profile (§14)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약
organization role profile id·tenant·workspace·organization·legal entities·departments·teams·role catalog·default roles·restricted roles·external roles·service account roles·role request policy·assignment approval policy·maximum assignment duration·access review schedule·deprovisioning policy·**IdP group mapping policy**·owner·version·status·evidence.

## 🔴 실측 — 절반은 REAL 이다
| 요구 | 실측 |
|---|---|
| **IdP group mapping policy** | ✅ **REAL** — `sso_group_role_map`(tenant_id·group_name·role·UNIQUE uq_sgrm) `EnterpriseAuth.php:70/72` + `roleForGroups()`:78 + `sso_config.default_role`/`auto_provision` :59 |
| **teams** | ✅ **REAL** — `team`(tenant_id·name·team_type·manager_user_id·status) `TeamPermissions.php:145/168` |
| **deprovisioning policy** | ✅ **부분 REAL** — `EnterpriseAuth.php:400` `active===0 → DELETE FROM user_session`(즉시 deprovision) |
| **access review schedule** | ❌ 부재(**1-9까지 미해소**) |
| organization · departments · legal entities · workspace | ❌ **부재(grep 0)** |

## 분류
**부분 REAL** — IdP mapping·team·deprovision = **VALIDATED_LEGACY(재사용 강제)** · 상위 조직 축 = **NOT_APPLICABLE → 신설**.
