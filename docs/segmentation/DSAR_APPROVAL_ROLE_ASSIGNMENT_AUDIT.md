# DSAR — Assignment Audit (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Role Assignment Audit)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Decision Core 실 구현 부재
- **불변**: 무후퇴 · Historical 수정 API 금지 · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 인가 실소비 role에만 적용(admin_roles 장식화 재발 금지) · 폐기 admin_roles/user_roles 재부활 금지 · 289차 재플래그 금지

---

## 1. 목적

§1(항목 49) Assignment Audit는 Assignment 생성·승인·변경·만료·정지·복원·이관의 **전 생애주기 변화를 append-only로 기록**하는 감사 계층이다(스펙 §4 Audit Policy·§12 Mandatory Audit·§23 Revocation 후 Audit 생성·§26/§27 Snapshot/Evidence의 Audit 결합·§39 Assignment Audit 조회 API). ★GROUND_TRUTH가 확정한 대로, 이 저장소의 Assignment 감사는 **비일관(단일 SSOT 아님)**이다 — `auth_audit_log`(SSOT 표방)과 `pm_audit_log`(PM 별도)로 2중 분산되어 있고, 고빈도 일상 경로(팀원 초대/역할변경/비활성·SSO/SCIM provisionUser·`/v421/keys`·wms_permissions)는 **감사 자체가 없다**. 유일 tamper-evident 체인인 `SecurityAudit::verify`는 role assignment 이벤트를 기록하지 않는다.

## 2. Canonical 필드

- **Audit Event ID**
- **Assignment Reference** — 대상 Assignment(Version 포함)
- **Event Type** — 생성/승인/변경/만료/정지/취소/복원/이관(Migration)
- **Actor Reference** — 발화 Actor(위조 불가 신원 축)
- **Before/After Reference** — 변경 전후 Snapshot 참조(순신규)
- **Occurred At**
- **Tamper Evidence** — Hash Chain 봉인 참조(SecurityAudit 승격 대상)

## 3. 열거형 / 타입

Assignment Audit Event Type(스펙 매핑): `ASSIGNMENT_CREATED` · `ASSIGNMENT_APPROVED`(BLOCKED — 승인워크플로우 부재) · `ASSIGNMENT_MODIFIED` · `ASSIGNMENT_EXPIRED` · `ASSIGNMENT_SUSPENDED` · `ASSIGNMENT_REVOKED` · `ASSIGNMENT_RESTORED` · `ASSIGNMENT_MIGRATED`.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| 감사 대상(자원) | 판정 | 실 substrate (file:line) |
|---|---|---|
| team_role 초대/역할변경/비활성(고빈도 일상경로) | **ABSENT(감사 없음)** | `createTeamMember`/`updateTeamMember`/`deleteTeamMember`(`UserAuth.php:1281-1451`) — 감사 호출 인용 없음(GROUND_TRUTH §5 "감사 없음" 목록) |
| SSO/SCIM provisionUser | **ABSENT(감사 없음)** | `EnterpriseAuth.php:483-511` — 감사 호출 인용 없음 |
| sub-admin 발급/변경 | **PARTIAL(감사 있음)** | `UserAuth.php:1626,1656,1708` |
| api_key.role(`/v421/keys`) | **ABSENT(감사 없음)** | `Keys.php:81-187` — 감사 0(GROUND_TRUTH §1.3 "감사 0·파일 전체") |
| api_key.role(`/auth/api-keys`) | **PARTIAL(감사 있음·비대칭)** | `UserAuth.php:4360,4375,4398` — 동일 자원인데 진입경로 따라 감사 여부 상이(DUPLICATE_AUDIT D-2) |
| wms_permissions | **ABSENT(감사 없음)** | `Wms.php:505-526` — 감사 0(파일 내 audit는 재고이벤트 전용) |
| pm_task_assignees | **PARTIAL(유일 구조적 감사)** | `Assignees.php:41-47,65-70` → pm_audit_log |
| team CRUD/acl 위임 | **PARTIAL(감사 있음)** | `TeamPermissions.php`(`UserAuth::logAudit` 소비)·`UserAuth.php:470,502,527,531,548,588,655,747` |
| 감사 저장소 SSOT 여부 | **비일관(2중 병존)** | `auth_audit_log`(SSOT 표방·`TeamPermissions.php:19`) + `pm_audit_log`(PM 별도·`Shared.php:129-148`) — **완전 SSOT 아님** |
| Tamper-evident 승격 | **ABSENT(assignment 미기록)** | `SecurityAudit::verify`(`SecurityAudit.php:56-68`) — 유일 실 tamper-evident 체인이나 role assignment 이벤트 미기록. 실 소비=auth.login/breakglass/plan.* 등 role assignment 밖 도메인 |
| 근접이나 tamper-evident 아닌 대체물 | **오인용 경계** | `menu_audit_log` hash_chain — verify() 없음=검증 불가능한 장식([[reference_menu_audit_log_not_tamper_evident]]), Assignment Audit 정본으로 재사용 금지 |

## 5. 설계 원칙

1. **auth_audit_log = SSOT 지정, 4번째 스토어 신설 금지** — Assignment Audit는 별도 저장소를 만들지 않고 `auth_audit_log`를 SSOT로 삼되(Golden Rule), event_type ENUM·tenant 체인·Snapshot 참조를 확장한다(ADR D-1 "auth_audit_log → PARTIAL(승격)").
2. **`pm_audit_log`는 흡수 대상이 아니라 참조 대상** — pm_task_assignees는 별개 네임스페이스(과제 단위)로 유지하고, pm_audit_log 기록을 Assignment Audit 통합 조회 API(§39)에서 참조만 한다(원본 삭제·이관 금지).
3. **고빈도 일상 경로의 감사 부재를 최우선 정형화 대상으로 명시** — team_role 초대/변경/비활성·SSO provisionUser·`/v421/keys`·wms_permissions는 실행 substrate는 실재하되 감사가 전무하므로, Canonical Assignment Registry 진입점 신설 시 **감사 호출을 반드시 동반**(설계 원칙, 코드화는 실 구현 세션).
4. **api_key.role 2경로 감사 비대칭은 통합 우선순위 1위** — 동일 자원에 진입경로별 감사 유무가 다른 것은 "가짜 녹색"과 동형 리스크(감사 로그 부재 경로로 우회 시 무기록). Consolidation API 신설 시 단일 감사 경로로 흡수.
5. **SecurityAudit 승격은 신규 해시체인 발명이 아니라 기존 확장** — role assignment 이벤트를 `SecurityAudit::verify` 체계에 결합하되, 새 tamper-evident 엔진을 남립하지 않는다(무결성 정본 단일화).
6. **menu_audit_log를 tamper-evident 정본으로 오인용 금지** — hash_chain 존재가 곧 검증 가능함을 의미하지 않는다([[reference_menu_audit_log_not_tamper_evident]] 289차 확정·재오염 금지).
7. **Approval 관련 Audit Event(`ASSIGNMENT_APPROVED`)는 BLOCKED_PREREQUISITE로 고정** — 승인 workflow 자체가 부재하므로(EXISTING_IMPLEMENTATION §3) 해당 이벤트는 승인 엔진 신설 전까지 발화 불가.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: `ASSIGNMENT_APPROVED` 이벤트는 승인 workflow(Assignment Approval, §9~§10) 실구현 이후.
- **ABSENT(감사 없음·고빈도)**: team_role 초대/변경/비활성·SSO provisionUser·`/v421/keys`·wms_permissions — 5자원 중 4개 경로가 무감사.
- **비일관(SSOT 아님)**: `auth_audit_log` + `pm_audit_log` 2중 병존.
- **승격 대상**: `SecurityAudit::verify`에 role assignment 이벤트 결합 — 현재 미기록.
- **판정**: NOT_CERTIFIED · 실 감사 일원화 = Canonical Assignment Registry + SecurityAudit 확장 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_ROLE_ASSIGNMENT_MIGRATION]] · [[DSAR_APPROVAL_ROLE_ASSIGNMENT_FUNCTION_REGRESSION_GATE]] · [[DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE]]
