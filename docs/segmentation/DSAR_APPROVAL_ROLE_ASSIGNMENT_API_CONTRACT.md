# DSAR — Assignment API Contract (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Role Assignment API Contract)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Decision Core 실 구현 부재
- **불변**: 무후퇴 · Historical 수정 API 금지 · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 인가 실소비 role에만 적용(admin_roles 장식화 재발 금지) · 폐기 admin_roles/user_roles 재부활 금지 · 289차 재플래그 금지

---

## 1. 목적

§39의 **Assignment 생성·수정·종료·조회·Effective Assignment 조회·Effective Permission 조회·Assignment Simulation·Assignment Revalidation·Assignment Audit 조회** API 계약을 정의한다. 실 엔드포인트는 본 저장소 라우팅 컨벤션(`/api/...`·`/v{NNN}/...` 이중 shape·`routes.php` 문자열 매핑)에 정합해야 하며, **본 차수 코드 0**(설계 계약만). ★현행 5분산 write(team_role 3핸들러·api_key 2경로·wms_permissions·pm_task_assignees)는 이미 각자의 라우트를 갖고 있으므로(DUPLICATE_AUDIT D-1·D-2), Canonical Assignment API는 이들을 **대체 신설이 아니라 단일 진입점으로 중개**한다(ADR D-1).

## 2. Canonical 필드

- **API Group** — 아래 §3.1 9항
- **Operation Type** — `READ`(조회) / `WRITE`(생성·수정·종료 — Version 발행) / `SIMULATE`(부작용 없음) / `REVALIDATE`(부작용 없음 원칙)
- **Auth Requirement** — Bearer/api_key + RBAC role(현행 미들웨어 계승)
- **Write Guard Set** — Expected Version·Idempotency-Key·Approval Reference·Audit·Evidence·Server-side Enforcement(전 Write API 공통 필수)
- **Historical Mutation** — 항상 `FORBIDDEN`(과거 Assignment Version 수정 API 미제공)
- **Consolidation Target** — 이 API가 중개하는 현행 분산 write 경로(§4)

## 3. 열거형 / 타입

### 3.1 API 그룹 (§39 원문 매핑)

| 그룹 | 책임 | 중개 대상(현행 분산 write) |
|---|---|---|
| **Assignment 생성** | 신규 Assignment(+Version Initial) 발행 | team_role 3핸들러·api_key 2경로·wms_permissions·pm_task_assignees |
| **Assignment 수정** | Scope/Role Version/Status 변경(+Version 발행) | `updateTeamMember`(`UserAuth.php:1369-1423`)·`promoteManager` 계열 |
| **Assignment 종료** | Revocation/Suspension/Expiration(+Version 발행) | is_active 토글·하드 DELETE 경로 중개 |
| **Assignment 조회** | 목록/상세/이력 | 현재 목록/상세 API는 각 자원별 개별 존재(통합 조회 부재) |
| **Effective Assignment 조회** | 버전 기준 유효 assignment 집합 | `effectiveForUser`(`TeamPermissions.php:366-394`) substrate 확장 |
| **Effective Permission 조회** | 버전 기준 유효 permission 투영 | `effectiveScope`(`TeamPermissions.php:236-265`) substrate 확장 |
| **Assignment Simulation** | 부작용 없는 사전 시뮬레이션 | ABSENT → 신설 |
| **Assignment Revalidation** | Drift 재검증 | ABSENT → 신설 |
| **Assignment Audit 조회** | 변경 이력 조회 | `auth_audit_log`(SSOT 표방)·`pm_audit_log`(PM 별도) 2중 조회 통합 |

### 3.2 모든 Write API 공통 필수 요구 (§39 계약 원칙)

Authentication · Authorization · Expected Version(낙관적 동시성) · Idempotency-Key · Approval Reference · Audit · Evidence · Server-side Enforcement.

### 3.3 불변(수정 금지 표면)

**Historical Assignment Version / Snapshot / Evidence / Audit 수정 API 금지** — 조회/발행만 허용. In-place Update·과거 재작성 API 미제공(Append-only).

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical API 축 | 판정 | 실 substrate (file:line) |
|---|---|---|
| 라우팅 컨벤션(`/api`·`/v{NNN}`·routes.php) | **재사용(컨벤션)** | 상위 CLAUDE.md 라우팅 규약(신규 라우트 등록 필요) |
| Auth/Authorization 미들웨어 | **CANONICAL(계승)** | writeGuard/`guardTeamWrite`(`UserAuth.php:1167`·`index.php:72-85`) |
| team_role 3분산 write | **CONSOLIDATION_REQUIRED** | `UserAuth.php:1334,1392`(createTeamMember/updateTeamMember)·`EnterpriseAuth.php:507-509`(provisionUser) |
| api_key.role 2중 병렬 | **CONSOLIDATION_REQUIRED** | `Keys.php:81-187`(감사 0) vs `UserAuth.php:4340-4399`(감사 O) — 동일 자원·상이 감사(DUPLICATE_AUDIT D-2) |
| wms_permissions/pm_task_assignees | **DOMAIN_ASSIGNMENT(흡수/Adapter)** | `Wms.php:505-526`(무검증·무UNIQUE)·`Assignees.php:17-72`(유일 구조적 감사) |
| Effective Assignment/Permission 조회 API | **EFFECTIVE_RESOLUTION_SUBSTRATE(확장)** | `TeamPermissions.php:366-394,236-265` |
| Assignment Audit 조회 API | **PARTIAL(2중 분산)** | `auth_audit_log`(`TeamPermissions.php` 소비)·`pm_audit_log`(`Shared.php:129-148`) — 통합 조회 API 부재 |
| Simulation/Revalidation API | **ABSENT → 신설** | 없음 |
| 승인 참조(Approval Reference) | **ABSENT** | 승인 workflow 부재(EXISTING_IMPLEMENTATION §3) — `pending_approval`/`approveQueue`는 role과 무관한 다른 도메인 |

## 5. 설계 원칙

1. **라우팅 정합 필수** — 신규 실 배선은 `/api` 접두(SPA HTML 폴백 착시 회피) 또는 최신 `/v{NNN}` 프리픽스로 등록하고 `routes.php`에 명시 매핑.
2. **폐기 admin_roles API 재부활 금지** — Assignment API는 신설 Registry로만 제공. 289차 DORMANT 제거(assignRole/revokeRole) 역행 금지.
3. **불변 표면 봉인** — Snapshot/Evidence/Audit 수정 API를 애초에 제공하지 않는다(수정 불가가 계약).
4. **5분산 write는 삭제가 아니라 중개** — Canonical API는 `UserAuth`/`EnterpriseAuth`/`TeamPermissions`/`Keys`/`Wms`/`Assignees`의 write 자체를 보존하고, 검증·감사·version을 Assignment Registry 진입점으로 일원화한다(ADR D-1 "발명 아니라 조립+통합").
5. **api_key.role 2경로 통합이 최우선 정합 대상** — 동일 자원(api_key.role)에 감사 비대칭(`Keys.php` 감사 0 vs `UserAuth.php` 감사 O)이 있으므로, Consolidation API가 이를 단일 감사 경로로 흡수(DUPLICATE_AUDIT D-2).
6. **Assignment Audit 조회 API는 2중 테이블을 통합 뷰로 제공하되 원본 테이블은 유지** — `auth_audit_log`+`pm_audit_log`를 하나로 재작성하지 않고 조회 계층에서 통합(무후퇴).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Effective Permission 조회는 Part 2 Permission Engine 이후. Role Version 결합 API는 Part 3-1 이후.
- **CONSOLIDATION_REQUIRED**: team_role 3분산 write·api_key.role 2경로 — 삭제가 아니라 단일 Assignment API 진입점으로 중개(§5).
- **Gap(순신규)**: Assignment Simulation·Revalidation API 전무.
- **PARTIAL**: Assignment Audit 조회는 2중 테이블 통합 뷰 부재.
- **판정**: NOT_CERTIFIED · 실 API = Registry 신설 + Part 2/3-1/3-2 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_ROLE_ASSIGNMENT_ERROR_WARNING_CONTRACT]] · [[DSAR_APPROVAL_ROLE_ASSIGNMENT_TEST_STRATEGY]] · [[DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE]]
