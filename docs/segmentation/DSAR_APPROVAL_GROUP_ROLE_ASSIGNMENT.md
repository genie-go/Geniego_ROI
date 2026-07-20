# DSAR — Approval Group Role Assignment (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Group Assignment)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core 실 구현 부재
- **불변**: Assignment ≠ 즉시 direct write · 인가 실소비 role에만 · Golden Rule(5분산 write 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

스펙 §1-7(Group Assignment)·§3(지원 Assignment 유형에 Group 포함) — SSO/SCIM IdP 그룹 멤버십을 근거로 간접적으로 Role을 부여하는 Assignment 유형이다. Direct Assignment(3분산 write 중 하나인 `EnterpriseAuth::provisionUser`)와 동일 컬럼(`app_user.team_role`)을 대상으로 하되, 소스가 그룹→역할 매핑이라는 점에서 별도 유형으로 분리된다(ADR D-1 CANONICAL_ASSIGNMENT_SUBSTRATE 통합 대상).

## 2. Canonical 필드

스펙 §5 Assignment Definition 원문 그대로(Direct와 공유): Assignment ID · Assignment Code · Subject ID · Subject Type · Role Definition ID · Role Version · Assignment Type(=Group) · Assignment Source(=IdP/Group) · Assignment Owner · Assignment Status · Assignment Lifecycle · Assignment Scope · Effective From · Effective To · Created By · Approved By · Snapshot ID · Digest · Evidence. ★스펙에 Group 전용 필드(Group ID 등)는 별도 열거되지 않음 — Assignment Source가 그룹 근거를 담당한다는 것이 스펙 원문의 유일한 근거.

## 3. 열거형 / 타입

- **Assignment Type** 값 중 Group(§3).
- Group→Role 매핑 값 도메인은 스펙 비열거. 근접 substrate인 `sso_group_role_map`(`EnterpriseAuth.php:78-91`)이 실 매핑 테이블로 실재하나, 이는 스펙이 정의한 Canonical 열거형이 아니라 기존 구현 substrate임을 명시.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT · ground-truth만 인용)

**PARTIAL — SSO/SCIM group→role provisionUser 실재(EXISTING §1.2)**:

- `EnterpriseAuth::provisionUser`(`EnterpriseAuth.php:483-511`) — OIDC/SAML/SCIM 3프로토콜 공용. 신규 INSERT `team_role=$role`(`:507-509`, mappedRole 우선 `:504`), 기존 UPDATE 동기화(`:492-497`), **owner 강등 금지**(`:495`).
- `EnterpriseAuth::roleForGroups`(`EnterpriseAuth.php:78-91`) — `sso_group_role_map` 참조, manager 우선 매핑.
- OIDC groups 클레임(`EnterpriseAuth.php:241,243`).
- SAML groups/memberOf(`EnterpriseAuth.php:298-299,301`) — ★서명 서브트리만 신뢰(XSW 방지), 현 세션에 배선됨.
- `scimUpdateUser`는 team_role 변경 불가(active/name만·`EnterpriseAuth.php:388-410`) — SCIM 경로는 Group Assignment 갱신을 수행하지 않음.

→ DUPLICATE_AUDIT D-1: `EnterpriseAuth::provisionUser`는 `app_user.team_role` 3분산 write 중 하나(UserAuth/EnterpriseAuth/TeamPermissions)로, IdP 그룹→role 매핑이라는 독자 검증규칙을 가진 채 독립적으로 write.

**ABSENT — 거버넌스 계층**: Group Assignment 전용 Registry/Definition/Version/Lifecycle/Snapshot/Evidence/Digest는 순신규(EXISTING §6 공통 부재 목록). Group Membership Drift(§29 Organization Drift/Membership Drift에 해당하는 능력) 탐지 부재.

## 5. 설계 원칙

- ADR D-1: `EnterpriseAuth::provisionUser`는 team_role 3분산 write 통합 대상 중 하나 — Canonical Assignment Registry가 IdP 그룹 매핑 검증규칙을 흡수하되 write 자체는 보존.
- D-4: Group Assignment의 Subject Type은 여전히 Human(app_user) — Service Account/System Actor 그룹은 부재(D-4 Subject 유형 판정과 정합).
- `sso_group_role_map` 같은 기존 그룹→역할 매핑 테이블을 신규 Group Assignment Registry가 흡수·확장하되 중복 매핑 테이블 신설 금지(Golden Rule).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: Role Version Binding·Approval 결합은 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후.
- **Gap**: 스펙이 Group Assignment 전용 Canonical 필드(예: Group Definition ID)를 별도 열거하지 않아 설계 확정 필요. SCIM 경로가 Group Assignment 갱신을 수행하지 않는 비대칭(scimUpdateUser)의 거버넌스 처리 미정. Group Membership Drift 탐지 순신규.
- 실 구현 = provisionUser/roleForGroups substrate를 Canonical Assignment Registry로 통합 + 거버넌스 신설(선행 구현 후 별도 승인세션 RP-002). 이번 차수는 설계 명세(코드 0).
