# DSAR — Delegated Role Assignment (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity 설계 · 스펙 §14)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 선행 Permission Engine(Part 2) + Role Registry(Part 3-1) + Role Hierarchy(Part 3-2) 실 구현 후 별도 승인세션)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ) ground-truth**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **불변**: **Delegated Assignment는 원 Assignment보다 넓은 Scope를 가질 수 없다**(스펙 §14 원문) · Emergency Assignment = Auto Expiration + Mandatory Audit(스펙 §12) · 과거 Version 수정 금지(ADR §D-2)
- **반날조 규율**: 모든 `file:line`은 위 ADR·전수조사 2문서에서만 인용한다. 그 밖은 **ABSENT**. ★**정직 판정 핵심**: 실존 `assignableMap`/`DELEGATION_EXCEEDED`(`TeamPermissions.php:354-360,644-647`)은 **acl_permission(메뉴 권한) 위임상한**이며 **team_role 부여의 위임이 아니다**(289차 06-A-01 정합). 실존 impersonation(`UserAdmin.php:451,478-489`)은 **대행 세션**이며 role 부여가 아니다. 두 substrate 모두 Delegated Role Assignment(스펙 §14)의 실 구현이 아닌 근접 참조로만 인용한다.

---

## 1. 목적

Delegated Role Assignment(스펙 §14) = Delegator가 Delegate에게 자신의 role/권한을 특정 Window·Scope·Duration 내에서 위임하는 Assignment 유형. 필수 필드: Delegator·Delegate·Delegation Window·Maximum Scope·Maximum Duration·Delegation Evidence(스펙 원문 그대로). 핵심 제약은 **"원 Assignment보다 넓은 Scope를 가질 수 없다"** — 즉 위임은 항상 하위집합(subset)이어야 한다.

- **근접이나 정직 재분류 필요**: `assignableMap`은 acl_permission(메뉴별 CRUD 권한)의 위임 **상한**을 계산하는 substrate이지, team_role 자체를 위임하는 메커니즘이 아니다(EXISTING §3 "★team_role 세팅(createTeamMember/updateTeamMember)엔 미적용 — role 부여상한은 값 화이트리스트로만 제한").

## 2. Canonical 필드

`APPROVAL_ROLE_ASSIGNMENT`(Delegated 하위유형 · 스펙 §14 원문 그대로)

| # | 필드 | 의미 |
|---|---|---|
| 1 | assignment id | Assignment 식별자 |
| 2 | delegator | 위임하는 주체(Subject) |
| 3 | delegate | 위임받는 주체(Subject) |
| 4 | delegation window | 위임 유효 기간 |
| 5 | maximum scope | 위임 가능한 최대 Scope(★원 Assignment Scope 이하로 clamp) |
| 6 | maximum duration | 위임 가능한 최대 기간 |
| 7 | delegation evidence | 위임 근거자료(Mandatory) |
| 8 | source assignment reference | 위임 원본이 되는 Assignment 참조 |

## 3. 열거형 / 타입

지원 Assignment 유형(스펙 §3)에 `Delegated`가 1급 유형으로 명시. Assignment Risk(스펙 §20) 평가축 중 "Delegation 여부"가 포함 — 위임된 Assignment는 별도 리스크 프로젝션 대상.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Delegated 요소 | 최근접 substrate | file:line | 판정 |
|---|---|---|---|
| Delegator/Delegate/Maximum Scope(근접이나 acl 한정) | `assignableMap`(owner=null 무제한·manager=팀 acl맵·member=빈맵) | `TeamPermissions.php:354-360` | ★근접 PARTIAL — **acl_permission(메뉴 권한) 위임상한 계산**이지 team_role 위임 레코드가 아님. Delegator/Delegate/Window/Evidence 필드 자체는 존재하지 않음 |
| Maximum Scope 초과 거부(근접이나 acl 한정) | `DELEGATION_EXCEEDED` 즉시 403 | `TeamPermissions.php:644-647` | ★근접 — 스펙 §14 "원 Assignment보다 넓은 Scope 불가" 불변과 **개념적으로 일치하는 clamp 로직**이나, 대상이 acl_permission이지 role assignment가 아님(289차 06-A-01 정합 유지) |
| Maximum Scope clamp 연산(근접) | `clampActions` | `TeamPermissions.php:396-402`(EXISTING §7 표) | 근접 — acl action 집합을 상한 내로 제한하는 연산 패턴. Role Scope clamp의 참조 알고리즘으로 재사용 가능하나 role assignment 미적용 |
| Delegate가 원 권한 행사(근접이나 role 발급 아님) | `UserAdmin::impersonate`(user_session.impersonated_by) | `UserAdmin.php:451,478-489` | ★근접 — **대행(proxy auth) 세션**이며 Delegate에게 새 role이 발급되지 않음(EXISTING §7 표 "proxy auth 세션 대행이지 새 role 발급 아님") |
| Delegation Window(시간 제약) | — | ABSENT | 위임 유효기간 필드 grep 0 |
| Delegation Evidence(Mandatory) | — | ABSENT | 위임 근거자료 필드 grep 0 |
| Delegator/Delegate 구조적 관계(1급 필드) | — | ABSENT | assignableMap은 팀/멤버 acl맵일 뿐 "누가 누구에게" 관계를 레코드화하지 않음 |

## 5. 설계 원칙

- **"위임(acl 상한)" ≠ "역할 위임(role assignment)"을 끝까지 분리**: assignableMap/DELEGATION_EXCEEDED는 acl_permission 축이고, Delegated Role Assignment(스펙 §14)는 team_role/Role Definition 축이다. Canonical Assignment Registry 신설 시 이 둘을 동일 엔티티로 병합하지 않는다(289차 06-A-01에서 이미 확정된 경계 — 재혼동 금지).
- **Maximum Scope ≤ 원 Assignment Scope는 Mandatory Control**(스펙 §14 불변) — `DELEGATION_EXCEEDED`의 clamp 패턴(`TeamPermissions.php:644-647`)을 알고리즘 참조로 재사용하되, 검증 대상을 acl action에서 role Scope로 확장할 때도 동일한 fail-closed 거부(403) 원칙 유지.
- **impersonation을 Delegated Assignment로 오흡수 금지**: 대행 세션(impersonate)은 "Delegate가 Delegator 신원으로 행동"이지 "Delegate 본인 계정에 새 role이 부여"가 아니다(ADR §3 "경계 보존: …impersonation(대행)…은 Assignment 밖").
- **Delegation Evidence는 Mandatory**: 스펙 원문상 필수 근거자료이므로, 신설 시 Assignment Evidence(§27) 공통 인프라를 재사용(중복 Evidence 저장소 신설 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- Delegator/Delegate/Delegation Window/Delegation Evidence 4개 필수 필드 = **전 구간 ABSENT**.
- Maximum Scope clamp는 **acl_permission 축에서만 근접 PARTIAL**(`TeamPermissions.php:354-360,644-647,396-402`) — team_role/Role Definition 축으로의 확장은 순신규.
- Delegated Assignment가 참조할 Role Definition/Version(Part 3-1)·Role Hierarchy(Part 3-2)가 아직 설계뿐(코드 0) → **BLOCKED_PREREQUISITE**.
- Assignment Risk 평가(스펙 §20 "Delegation 여부") = Part 2 Permission Engine·본 Part 코드 0로 **BLOCKED_PREREQUISITE**.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 **별도 승인세션(RP-002)**. 본 편 코드/DB 0 · NOT_CERTIFIED.
