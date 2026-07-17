# DSAR — Role Permission Profile (§7·§45)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약
Role 에 결속된 Permission 묶음 — Resource·Action·Scope·Condition·Field Access 단위.

## 🔴 실측 — 기반이 REAL 이다
| 요소 | 실측 |
|---|---|
| **Action 8** | `TeamPermissions.php:39` — view/create/update/delete/**approve**/export/**execute**/manage |
| **Permission 매트릭스** | `acl_permission` 메뉴×8동작 — `TeamPermissions.php:15` |
| **Scope 9** | `DATA_SCOPES` — `TeamPermissions.php:41` |
| **API scope 게이트** | `admin:keys`/`write:*`/`write:ingest` — `index.php:562-575` |

## 분류
🔴 **VALIDATED_LEGACY — 재사용 강제**(5-1 §50 판정 계승).
**Rebate Permission 은 `acl_permission` 매트릭스에 등록**하고 **별도 Rebate 전용 IAM 신설 금지**(5-1 §51 결론 1).
**Field Access Profile = CONSOLIDATION_REQUIRED** — Masking 이 **3+곳 산재**(AttributionEngine·ChannelCreds·UserAuth).
