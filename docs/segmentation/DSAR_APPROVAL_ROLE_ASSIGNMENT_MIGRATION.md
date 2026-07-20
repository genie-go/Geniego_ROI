# DSAR — Assignment Migration (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Role Assignment Migration)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Decision Core 실 구현 부재
- **불변**: 무후퇴 · Historical 수정 API 금지 · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 인가 실소비 role에만 적용(admin_roles 장식화 재발 금지) · 폐기 admin_roles/user_roles 재부활 금지 · 289차 재플래그 금지

---

## 1. 목적

§1(항목 48) Assignment Migration은 **현행 5분산 즉시-write 실행 substrate를 Canonical Assignment Registry로 이관하는 절차**다. 스펙 §6(Assignment Version)이 규정하는 Version Type 목록에 `Migration`이 명시 포함되어 있어(과거 Version 수정 금지 원칙 하), 신규 Assignment는 이관 시 `Migration` Version Type으로 최초 기록된다. ★Part 3-2(Role Hierarchy Migration)가 "매핑할 legacy가 이 저장소에 없다"는 대체로 ABSENT 판정이 지배적이었던 것과 **대조적으로**, 본 Part의 Migration 대상은 **5자원 실행 substrate가 실재(PARTIAL)**하므로 "이관할 데이터가 있다"는 점이 다르다. 단 이관 대상은 실 프로덕션 데이터(team_role/api_key/wms_permissions/pm_task_assignees 현재 값)이므로, Migration 설계는 **읽기 전용 매핑 계획**으로 한정하고 실 이관(스키마 신설+데이터 이동)은 코드화하지 않는다.

## 2. Canonical 필드

- **Migration Source** — 5분산 실행 substrate 중 1(team_role/api_key.role/admin_level/wms_permissions/pm_task_assignees)
- **Migration Target** — Canonical `APPROVAL_ROLE_ASSIGNMENT` + Version(Type=`Migration`)
- **Source 검증 규칙** — 각 소스의 독자 검증 로직(§4 표)
- **Consolidation 태그** — ADR D-1 분류(CANONICAL_ASSIGNMENT_SUBSTRATE / CONSOLIDATION_REQUIRED / SUB_AXIS / DOMAIN_ASSIGNMENT / DEPRECATED)
- **automatic migration allowed** — **기본값 false**(스펙 §6 원칙과 Part 3-2 Migration 동형 원칙 계승)
- **manual review required** — true(전 소스 공통)

## 3. 열거형 / 타입

**Migration Source Type**(이 저장소 5분산 실행 substrate에 한정 — 스펙 원문 Legacy Source Type 전체 열거가 아니라 실제 이관 대상만 열거):

`TEAM_ROLE_DIRECT_ASSIGNMENT` · `SSO_SCIM_PROVISIONED_ASSIGNMENT` · `API_KEY_ROLE_ASSIGNMENT_DUAL_PATH` · `ADMIN_LEVEL_SUB_AXIS` · `WMS_PERMISSION_ASSIGNMENT` · `PM_TASK_ASSIGNEE_ASSIGNMENT` · `DEPRECATED_ADMIN_ROLES(제외 대상)`.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Migration Source | 판정 | 실 substrate (file:line) | ADR D-1 태그 |
|---|---|---|---|
| `TEAM_ROLE_DIRECT_ASSIGNMENT` | **실재(PARTIAL)** | `createTeamMember`(`UserAuth.php:1334`)·`updateTeamMember`(`UserAuth.php:1392`) — 화이트리스트 `in_array(['manager','member'])` | **CANONICAL_ASSIGNMENT_SUBSTRATE(통합)** |
| `SSO_SCIM_PROVISIONED_ASSIGNMENT` | **실재(PARTIAL)** | `provisionUser`(`EnterpriseAuth.php:483-511`) — IdP 그룹→role(`roleForGroups`)·owner 강등 금지 | **CANONICAL_ASSIGNMENT_SUBSTRATE(통합)** |
| `API_KEY_ROLE_ASSIGNMENT_DUAL_PATH` | **실재(PARTIAL·2중 병렬)** | `Keys.php:81-187`(감사 0) vs `UserAuth.php:4340-4399`(감사 O) | **CONSOLIDATION_REQUIRED(통합)** |
| `ADMIN_LEVEL_SUB_AXIS` | **실재(PARTIAL)** | sub-admin 발급 `createSubAdmin`(`UserAuth.php:1639-1648`) | **SUB_AXIS(흡수)** |
| `WMS_PERMISSION_ASSIGNMENT` | **실재(PARTIAL·최소 통제)** | `savePermission`(`Wms.php:505-517`) — 항상 INSERT만·화이트리스트 없음·UNIQUE 없음 | **DOMAIN_ASSIGNMENT(흡수/Adapter)** |
| `PM_TASK_ASSIGNEE_ASSIGNMENT` | **실재(PARTIAL·유일 구조적 감사)** | `Assignees.php:17-72` — ROLE_ENUM owner/contributor/reviewer/observer·UNIQUE 409·auditLog | **DOMAIN_ASSIGNMENT(흡수/Adapter)** |
| `DEPRECATED_ADMIN_ROLES` | **역사적 반례(재부활 금지)** | admin_roles/user_roles + assignRole/revokeRole API — "인가 게이트 미소비 DORMANT" 289차 폐기(`c1646bc`) | **DEPRECATED(재부활 금지)** |

## 5. 설계 원칙

1. **automatic migration allowed는 기본값 false** — 어떤 Migration Source도 자동 이관 허용하지 않는다(스펙 §6 Version Type 원칙·Part 3-2 Migration DSAR와 동형).
2. **이관은 소스 write 자체를 삭제하지 않는다** — Canonical Assignment Registry는 5분산 write를 대체가 아니라 **단일 진입점으로 중개**(ADR D-1 "발명 아니라 조립+통합"). Migration Version은 기존 값을 Registry에 반영하는 기록이지, 소스 컬럼을 제거하는 절차가 아니다.
3. **`DEPRECATED_ADMIN_ROLES`는 Migration Source에서 명시 제외** — admin_roles/user_roles가 인가 미소비 장식으로 폐기된 전례를 Migration이 되살리지 않는다(D-3 "인가 실소비 role에만 적용" 규율의 직접 적용).
4. **api_key.role 2경로는 Migration 시점에 감사 비대칭을 먼저 해소** — `Keys.php`(감사 0)와 `UserAuth.php`(감사 O)를 동시에 Canonical Registry로 이관하면서 감사 로직을 일원화(단순 데이터 복사가 아니라 검증규칙 통합, DUPLICATE_AUDIT D-2).
5. **manual review required=true 전 소스 공통** — 5자원 모두 검증 규칙이 상이하므로(§4 "독자 검증규칙"), 자동 매핑 confidence가 낮은 케이스(예: wms_permissions의 화이트리스트 없는 임의 문자열 role)는 수동 검토 라우팅을 기본으로 한다.
6. **소유권 이전(ownership transfer) 대상 없음을 명시 유지** — EXISTING_IMPLEMENTATION §1.1이 확인한 대로 owner 이전 경로가 부재(`UserAuth.php:1384,1441`·`EnterpriseAuth.php:405,418` 전부 owner 배제)하므로, Migration Source 목록에도 owner 이전 케이스를 포함하지 않는다(날조 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 실 이관(스키마 신설+데이터 이동)은 Canonical Assignment Registry 실구현 + Part 2/3-1/3-2 이후.
- **Part 3-2와 대비**: Role Hierarchy Migration은 대상 legacy 대부분 ABSENT였으나, 본 Migration은 **5자원 전부 실재 substrate**를 갖는다 — "이관할 데이터가 있다"는 정직 판정.
- **역사적 반례 제외**: `DEPRECATED_ADMIN_ROLES`는 Migration Source 목록에서 명시 배제(재부활 금지).
- **정직 부재**: 소유권 이전(ownership transfer) Migration Source 없음.
- **판정**: NOT_CERTIFIED · 실 Migration = Canonical Assignment Registry 신설 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_ROLE_ASSIGNMENT_API_CONTRACT]] · [[DSAR_APPROVAL_ROLE_ASSIGNMENT_AUDIT]] · [[DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT]] · [[ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE]]
