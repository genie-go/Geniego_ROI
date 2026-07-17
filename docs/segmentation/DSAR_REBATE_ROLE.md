# DSAR — Rebate Role (§7)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 실측
**`REBATE_*` Role 부재(grep 0)**. 현행 Role 값: `team_role`(owner>manager>member·`TeamPermissions.php:13/17`) · `api_key.role`(viewer0<connector1<analyst2<admin3·`index.php:554`) · admin master/sub(286차).

## Canonical 계약(주요)
rebate_role_id·**authorization_role_id**(5-1 CANONICAL_AUTHORIZATION_ROLE 연결)·role_catalog_id·role_code·role_name·role_category·role_type·tenant_id·organization_id·default workspace/legal entity/environment/program scope·**sensitive/financial/PII/production 여부**·external user assignable·service account assignable·**delegable**(→5-4)·**inheritable**·composable·assignment approval requirement·**maximum assignment duration**·periodic review requirement·owner·status·valid_from/to·version·evidence.

**Role Type(9)**: STANDARD · CUSTOM · SYSTEM · SERVICE · EXTERNAL · TEMPORARY_TEMPLATE · COMPOSITE · READ_ONLY · RESTRICTED.

## 원칙(§4.1·§4.5)
**Role ≠ Permission**(Role = Permission 의 관리 가능한 묶음) · **Role 이름으로 권한 하드코딩 금지 — 항상 Role-Permission Binding 사용**.
