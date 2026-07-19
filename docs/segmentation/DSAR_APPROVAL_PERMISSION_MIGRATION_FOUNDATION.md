# DSAR — Permission Migration Foundation 설계 명세 (EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 목표 Canonical Registry/Code/Namespace 부재)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **반날조**: 모든 file:line 인용은 상위 ADR·[`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md) 두 문서에 한함.

---

## ① 목적

플랫폼 곳곳에 흩어진 **Legacy 권한 표현**을 Canonical Permission Model(`{DOMAIN}:{RESOURCE}:{ACTION}` Code·Version·Scope·Namespace)로 이관하기 위한 **원천 분류·매핑 원칙**을 세운다.

★**Golden Rule(절대)**: Legacy의 `ADMIN` / `ALL` / `*` / `FULL_ACCESS`류 광역 권한을 **자동으로 Canonical Permit로 변환 금지**. 반드시 실제 사용처를 분해(decompose)하여 필요한 최소 Permission 집합으로 재구성한다(권한 확장 방지·Default Deny).

★**매핑 방침**:
- `acl_permission.menu_key` → Canonical Code(정형화 매핑 대상·confidence 기록).
- `admin_roles` / `user_roles` = **289차 P3 폐기 · 마이그레이션 대상 아님**(미소비 죽은 RBAC·재플래그 금지).

## ② Canonical 필드 (Migration Source Inventory)

| 필드 | 설명 |
|---|---|
| `source_id` | 레거시 원천 식별자 |
| `tenant_id` | 대상 테넌트(격리) |
| `source_type` | 아래 ③ 열거형 |
| `source_ref` | 원천 테이블/코드/플래그 위치 |
| `raw_expression` | 원본 권한 표현(예: menu_key, is_admin, scope 문자열) |
| `decompose_required` | 광역 권한 분해 필요 여부(bool·ADMIN/ALL/*/FULL_ACCESS면 true 강제) |
| `candidate_canonical_codes` | 분해 후보 Canonical Code 집합 |
| `mapping_confidence` | HIGH / MEDIUM / LOW / UNRESOLVED |
| `disposition` | MAP / DECOMPOSE / DEPRECATE / EXCLUDE |
| `notes` | 근거·수동검토 메모 |

## ③ 열거형 — Legacy Source Type

- `ROLE_PERMISSION_TABLE` / `USER_PERMISSION_TABLE` / `GROUP_PERMISSION_TABLE`
- `API_SCOPE` / `JWT_SCOPE` / `OAUTH_SCOPE`
- `UI_MENU_PERMISSION` / `UI_BUTTON_PERMISSION`
- `FEATURE_FLAG`
- `IS_ADMIN`
- `MANAGER_FLAG`
- `DEPARTMENT_AUTHORITY`
- `ERP_PERMISSION` / `WORKFLOW_PERMISSION`
- `DATABASE_ACL` / `FILE_ACL`
- `CUSTOM_CODE_CHECK`

## ④ substrate 매핑 (§92 · file:line 없으면 ABSENT)

| Source Type | substrate | §92 태그 / disposition | 근거 |
|---|---|---|---|
| `UI_MENU_PERMISSION` | acl_permission menu_key + actions(CSV) | CANONICAL_PERMISSION_SCOPE_CANDIDATE / **MAP→분해** | `TeamPermissions:152-171`·`:39` |
| `UI_BUTTON_PERMISSION` | ACTIONS 8종·MENU_CATALOG 26메뉴 | vocabulary 근접 / MAP | `:39`·`:55-82` |
| `ROLE_PERMISSION_TABLE`(team_role) | team_role owner/manager/member | roleOf / MAP(Role→Part3 Adapter) | `:120-131` |
| `API_SCOPE`/`JWT_SCOPE` | api_key scopes(read:*/write:*/write:ingest/…) | CANONICAL(프로그래매틱)·wildcard=제한범위 / **DECOMPOSE(광역)** | `Keys.php:191,204`·`UserAuth:4307` |
| `OAUTH_SCOPE` | connector_token.scopes(아웃바운드 광고 OAuth·내부 authz 아님) | KEEP_SEPARATE / EXCLUDE | EXISTING §1.6 |
| `IS_ADMIN` | resolveAdminByToken(plan/plans/admin_level) | CANONICAL(admin SSOT) / **DECOMPOSE(전권 금지)** | `UserAuth:2998` |
| `MANAGER_FLAG` | team_role manager(isManagerAdmin) | roleOf / MAP | `:136` |
| `FEATURE_FLAG` | PlanPolicy FEATURE_MIN_PLAN(상용 게이트·직교) | KEEP_SEPARATE_WITH_REASON / EXCLUDE | `PlanPolicy:27` |
| `ROLE_PERMISSION_TABLE`(admin_roles/user_roles) | 289차 P3 폐기·미소비 | DEPRECATED / **EXCLUDE(대상 아님)** | EXISTING §2 |
| `DATABASE_ACL`/`FILE_ACL` (data_scope 행필터) | data_scope scopeSql | ROW/DATA_SCOPE_CANDIDATE / MAP | `:286-307` |
| `DEPARTMENT_AUTHORITY`/`ERP_PERMISSION`/`WORKFLOW_PERMISSION` | — | **ABSENT** (해당 모델 부재) | ABSENT |
| `GROUP_PERMISSION_TABLE`/`USER_PERMISSION_TABLE` | acl_permission subject_type=user(부분) | subject 축 부분 / MAP | `:152-171` |
| `CUSTOM_CODE_CHECK` | index.php 중앙 RBAC·guardTeamWrite(코드 게이트) | CANONICAL(PEP) / 재현·검증 후 MAP | `index.php:553-619`·UserAuth`:1167` |

## ⑤ 설계 원칙

- **Golden Rule 최우선**: `ADMIN`/`ALL`/`*`/`FULL_ACCESS` → 자동 Permit 변환 절대 금지. `decompose_required=true` 강제, 실제 호출·사용 표면 조사로 최소 Permission 집합 도출.
- **api_key wildcard 분해**: `write:*`/`read:*`는 §6.8 부합(api_key 프로그래매틱 한정)이나, Canonical 이관 시 실제 소비 엔드포인트 기준으로 분해(무제한 이관 금지).
- **폐기분 제외**: admin_roles/user_roles·connector OAuth·feature flag(plan)는 마이그레이션 대상 아님(재플래그 금지·직교 축 유지).
- **plan 분리 유지**: FEATURE_FLAG/plan은 Permission이 아니므로 이관하지 않고 연결 Contract만(§6.2).
- **Confidence 필수**: 모든 매핑에 mapping_confidence 기록. LOW/UNRESOLVED는 수동검토·이관 보류.
- **Fail-closed 이관**: 애매하면 좁은 Permission으로 이관(넓게 이관 금지). 이관 후 Reconciliation(LEGACY_VS_CANONICAL)으로 검증.
- **Permission ≠ Role ≠ Authority**: Role 테이블은 Role→Permission Adapter(Part 3)로, 부서/조직 authority는 Part 5로 분리 이관.

## ⑥ Gap

- 목표 Canonical Registry/Code/Namespace/Version이 ABSENT — 이관 목적지 미확립(BLOCKED_PREREQUISITE).
- ERP/Workflow/Department Authority substrate 부재 — 해당 원천은 라이브 확인 후 대상 여부 판단.
- 실 이관 record는 별도 문서([`DSAR_APPROVAL_PERMISSION_MIGRATION`](DSAR_APPROVAL_PERMISSION_MIGRATION.md)) — 매핑표·의미등가·리스크 기록 체계.
- 실 구현 = 선행 Canonical Registry 신설 + 별도 승인세션(RP-002).
