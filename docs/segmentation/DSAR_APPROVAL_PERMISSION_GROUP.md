# DSAR — Permission Group (EPIC 06-A-03-02-03-04 Part 2 · Permission Engine)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **GROUND_TRUTH 인용원(반날조 allowlist)**: [ADR](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md) · [DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md). `file:line`은 이 2문서에서만 인용.

---

## ① 목적 (Purpose)

Permission Group은 **관리 편의를 위해 여러 Permission을 하나의 재사용 묶음으로 명명·조직**하는 Entity다. 예: `Approval Viewer`(승인건 조회 권한 묶음)·`Payment Reviewer`(결제 검토 권한 묶음)·`Support Read-only`(지원팀 읽기전용 묶음). Group을 Subject(사용자/팀)에 부여하면 그 안의 Permission들이 일괄 적용되어, 개별 Permission을 반복 부여하는 운영 부담을 줄인다.

★**Group ≠ Role (핵심 규율·ADR D-5)**. Group은 **Permission의 정적 묶음(bag of permissions)** 이며, Role(Part 3 RBAC)은 Subject에 Group/Permission을 부여하는 **주체 지향 배정 개념**이다. Group을 Role로 취급하거나 Role Registry로 승격하지 않는다. `Approval Viewer`는 "권한 묶음"이지 "직책"이 아니다.

## ② Canonical 필드

- `group id` · `tenant` · `code` · `name` · `description`
- `type`(아래 열거) · `nested allowed`(하위 Group 중첩 허용 여부) · `max nesting depth`(중첩 상한) · `risk`(위험등급)
- `direct grant allowed`(Subject 직접 부여 허용 여부) · `current version`(현행 Group Version 참조)
- `owner` · `status` · `valid_from` · `valid_to` · `evidence`

## ③ 열거형

- **TYPE**(10종): `FUNCTIONAL` / `RESOURCE` / `DATA` / `API` / `UI` / `ADMINISTRATIVE` / `READ_ONLY` / `SERVICE_ACCOUNT` / `SYSTEM_ACTOR` / `CUSTOM`.
- **RISK**(예시): `LOW` / `MEDIUM` / `HIGH` / `CRITICAL`(승인·결제·관리 묶음일수록 상향).

## ④ substrate 매핑 (§92)

| Canonical 요소 | 실존 substrate | §92 태그 | 근거(allowlist) |
|---|---|---|---|
| 묶음의 원소(Permission) | `acl_permission`(menu×action) | CANONICAL_PERMISSION_SCOPE_CANDIDATE | EXISTING `TeamPermissions.php:152-171` |
| 부여 대상(subject_type user/team/member) | acl_permission `subject_type` | Grant substrate | EXISTING `TeamPermissions.php:152-159` |
| 위임상한(부여 가능 범위 clamp) | assignableMap · clampActions · putMemberPermissions(`DELEGATION_EXCEEDED`) | 위임 substrate(Group 아님) | EXISTING `TeamPermissions.php:354-360,396-402,628-647` |
| Group code/name·type·nested·max depth·risk·direct grant·version | — | **ABSENT(순신규)** | ADR §D-4 "Group/Bundle=순신규" |

- Permission을 재사용 묶음으로 명명·중첩·버전화하는 Group 구조체 → **no hits(ABSENT)**. `menu_key`별 개별 부여만 존재하며, 명명된 Permission 묶음 개념은 부재.
- ★**혼동 금지**: `app_user.team_role`(owner/manager/member·EXISTING `TeamPermissions.php:120-131`)은 Role 서열이지 Permission Group이 아니다. Group으로 계상 금지.

## ⑤ 설계원칙

- **★Group ≠ Role(Golden Rule·ADR D-5)**: Group을 Role로 취급 금지. Group은 Permission 묶음, Role(Part 3)이 Group/Permission을 Subject에 배정. Group을 `team_role` enum에 매핑하거나 Role Registry로 승격하지 않는다.
- **Golden Rule = Extend**: 묶음 원소는 기존 `acl_permission`을 참조(재구현 금지). Group 부여는 `subject_type` grant substrate를 확장. 중복 부여 엔진 신설 금지.
- **Risk 기반 통제**: `risk=HIGH/CRITICAL`(예 `Payment Reviewer`) Group은 `direct grant allowed=false`로 강제하거나 별도 승인(Part 5 Authority·연결 Contract)을 요구. `SERVICE_ACCOUNT`/`SYSTEM_ACTOR` type Group을 Human 승인권으로 부여 금지.
- **불변 버전화**: Group 멤버십 변경은 In-place Update 금지 → Group Version(별도 문서)으로만 반영·`current version` 이동.

## ⑥ Gap

- **BLOCKED_PREREQUISITE(RP-002)**: Group이 묶을 Canonical Permission Definition/Version(순신규)과 부여 결과를 봉인할 Decision Core가 코드 0(ADR §D-4).
- **cover 0**: 명명된 Permission Group 전무. 실 엔진은 흩어진 `acl_permission` menu×action을 재사용 묶음으로 정형화하는 "조립".
- **NOT_CERTIFIED**: 코드/DB 변경 0. `FULL_ACCESS`/`MANAGE_ALL`/`SUPER_ADMIN` 전권 묶음은 부재(ADR §D-3) — Group 결함으로 날조 금지. Part 1 D-2 위험 4건 재플래그 금지.

관련: [[DSAR_APPROVAL_PERMISSION_GROUP_VERSION]] · [[DSAR_APPROVAL_PERMISSION_GROUP_MEMBERSHIP]] · [[DSAR_APPROVAL_PERMISSION_GRAPH]] · [[ADR_DSAR_PERMISSION_ENGINE_FOUNDATION]].
