# DSAR — Assignment Runtime Guard (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Role Assignment Runtime Guard)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Decision Core 실 구현 부재
- **불변**: 무후퇴 · Historical 수정 API 금지 · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 인가 실소비 role에만 적용(admin_roles 장식화 재발 금지) · 폐기 admin_roles/user_roles 재부활 금지 · 289차 재플래그 금지

---

## 1. 목적

§35(Runtime Guard)는 Assignment 해석·검증이 발생하는 **매 요청 시점**에 발동해야 하는 차단 목록이다: **Expired · Suspended · Revoked Assignment · Invalid Scope · Invalid Role Version · Invalid Subject · SoD Conflict · Risk Policy 위반**(8종). ★ADR/GROUND_TRUTH가 확정한 대로, 이 저장소에서 이 목록에 **가장 근접한 실 substrate는 writeGuard/`guardTeamWrite`(`UserAuth.php:1167`·`index.php:72-85`·`teamRolePolicy.js`)**이나, 이는 **assignment 생애주기(만료/정지/취소)를 판정하는 전용 guard가 아니라 정적 team_role 값 게이트**(member 쓰기 403)다 — status/expiry 개념 자체가 substrate에 없다. 본 문서는 §35의 8개 차단 항목 각각을 실 substrate와 대조해 PARTIAL/ABSENT를 정직 판정한다.

## 2. Canonical 필드

- **Guard ID** — §35 8종 중 1
- **Trigger Condition** — 차단 발동 조건(§35 원문)
- **Related Assignment Status** — Lifecycle 상태 참조(Part 3-3 §7 Assignment Lifecycle·순신규)
- **Related Error Code** — §37 대응 코드([[DSAR_APPROVAL_ROLE_ASSIGNMENT_ERROR_WARNING_CONTRACT]])
- **Enforcement Point** — Read-time(Effective 조회) / Write-time(Assignment 생성·변경)
- **현재 substrate** — file:line(없으면 ABSENT)

## 3. 열거형 / 타입

§35 Runtime Guard 8종(원문 그대로): `EXPIRED_ASSIGNMENT_BLOCKED` · `SUSPENDED_ASSIGNMENT_BLOCKED` · `REVOKED_ASSIGNMENT_BLOCKED` · `INVALID_SCOPE_BLOCKED` · `INVALID_ROLE_VERSION_BLOCKED` · `INVALID_SUBJECT_BLOCKED` · `SOD_CONFLICT_BLOCKED` · `RISK_POLICY_VIOLATION_BLOCKED`.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| # | §35 차단 항목 | 판정 | 근거(file:line) |
|---|---|---|---|
| 1 | Expired Assignment 차단 | **ABSENT** | team_role 만료 컬럼·cron 부재(EXISTING_IMPLEMENTATION §2 표·"role/permission 만료 cron 부재·bin 34 스크립트 0"). 유일 시간기반 실효는 api_key `expires_at`(`Keys.php:119,170`)이나 이는 API_CLIENT 축 자원이지 team_role assignment 전용 guard 아님·요청시점 게이트(`index.php:518-520`)일 뿐 전용 Runtime Guard 아님 |
| 2 | Suspended Assignment 차단 | **PARTIAL** | is_active=0 이진 토글이 team_role(`UserAuth.php:1445`)·sub-admin·api_key(`Keys.php:135-148`/`UserAuth.php:4364-4377`) 3/5 자원의 "정지" 대용이나, 정식 Suspended 상태·재검증 없이 요청 즉시 반영되는 값일 뿐 별도 Runtime Guard 판정 로직 없음 |
| 3 | Revoked Assignment 차단 | **PARTIAL** | wms_permissions 하드 DELETE(`Wms.php:519-526`)·pm_task_assignees 하드 DELETE(`Assignees.php:52-72`)가 즉시 소거이나, Revocation Version/Reason/Audit 없이 물리 삭제 — "차단 판정"이 아니라 "행 소멸" |
| 4 | Invalid Scope 차단 | **PARTIAL** | `effectiveScope`(`TeamPermissions.php:236-265`) fail-closed DENY_SCOPE 존재하나 매 요청 라이브 재계산이지 Assignment Scope 엔티티 참조 아님(ADR §근접 substrate 3종) |
| 5 | Invalid Role Version 차단 | **BLOCKED_PREREQUISITE** | Role Version 개념 자체가 Part 3-1 Role Registry 미구현(코드 0) — 검사 대상 없음 |
| 6 | Invalid Subject 차단 | **PARTIAL** | Human(app_user)/API Client(api_key) Subject Type 분리는 실재(`UserAuth.php`·`Keys.php:95`)하나 Subject Type eligibility를 강제하는 전용 guard 없음(D-4) |
| 7 | SoD Conflict 차단 | **ABSENT** | SoD(직무분리) 개념·isManager/isApprover 부재(Part 3-1 GROUND_TRUTH 정합). `assignableMap`/`DELEGATION_EXCEEDED`(`TeamPermissions.php:354-360,644-647`)은 acl_permission 위임상한이지 SoD 충돌 탐지 아님 |
| 8 | Risk Policy 위반 차단 | **ABSENT** | Assignment Risk 컬럼·Risk Policy 개념 부재. break-glass(`UserAuth.php:790-801`)는 인증우회지 Risk 기반 assignment 차단 아님 |

**근접 Runtime Guard substrate 정리**: writeGuard.js + `guardTeamWrite`(`UserAuth.php:1167`·`index.php:72-85`) — team_role 값이 `member`일 때 쓰기 403 반환하는 **정적 게이트**. §35가 요구하는 "Assignment 상태(만료/정지/취소/버전/SoD/Risk) 기반 차단"과는 판정 축이 다르다(값 화이트리스트 vs 생애주기 상태머신). PARTIAL로도 표기하지 않고 "근접이나 부적용"으로 명시한다(ADR §근접 substrate 3종 표와 정합).

## 5. 설계 원칙

1. **writeGuard/guardTeamWrite는 확장 기반이지 Assignment Runtime Guard 자체가 아니다** — Canonical Runtime Guard는 이 정적 게이트를 대체하지 않고 그 위에 Lifecycle/Scope/Version/SoD/Risk 판정 레이어로 얹는다(무후퇴·기존 게이트 삭제 금지).
2. **Expired/Suspended/Revoked 3종은 Lifecycle 상태머신 신설이 선행** — 상태 컬럼 없는 현행에서는 "차단"할 대상 자체가 없다(정직 부재).
3. **Invalid Role Version은 BLOCKED_PREREQUISITE로 고정** — Part 3-1 Role Registry Version 실구현 전에는 검증 불가능한 참조.
4. **SoD/Risk Guard는 assignableMap과 혼동 금지** — acl_permission 위임상한(권한 상한 클램프)과 SoD 충돌 탐지(역할 조합 금지)는 서로 다른 축(D-5 정합).
5. **is_active 이진 토글을 Suspended/Revoked 정식 상태로 오표기 금지** — 근접이나 재검증·사유·감사 없는 값 토글일 뿐임을 문서 전체에서 일관되게 PARTIAL로 명시.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Invalid Role Version 차단(#5)은 Part 3-1 Role Registry Version 실구현 이후.
- **ABSENT(순신규)**: Expired(#1)·SoD Conflict(#7)·Risk Policy(#8) — 대상 상태/개념 자체가 substrate에 없음(날조 금지).
- **PARTIAL(근접·불충분)**: Suspended(#2)·Revoked(#3)·Invalid Scope(#4)·Invalid Subject(#6) — is_active 토글·하드 DELETE·effectiveScope·Subject Type 분리가 근접이나 전용 Runtime Guard 판정 로직 없음.
- **판정**: NOT_CERTIFIED · 실 Guard = Assignment Lifecycle 상태머신 + Role Registry Version 신설 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_ROLE_ASSIGNMENT_ERROR_WARNING_CONTRACT]] · [[DSAR_APPROVAL_ROLE_ASSIGNMENT_STATIC_LINT]] · [[DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE]]
