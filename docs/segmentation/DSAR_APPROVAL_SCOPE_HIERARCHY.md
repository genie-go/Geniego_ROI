# DSAR — Scope Hierarchy 승인 (EPIC 06-A-03-02-03-04 Part 3-4 · Scoped Role Governance)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **ground-truth**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Role Assignment(Part 3-3)·Decision Core 실구현 후 별도 승인세션
- **불변**: Default Intersection(§9) · Scope 자동확대 금지 · Scope Hierarchy ≠ Organization Hierarchy(§13·D-3) · 반날조(부재 날조·실재 과신 양방향 금지)

---

## 1. 목적

Scope Hierarchy(스펙 §13)는 Parent/Child/Ancestor/Descendant 관계로 scope 간 상속을 표현하는 계층이며, 스펙은 명시적으로 "조직 계층과 분리 관리"를 요구한다. Part 3-4 판정 중 가장 명확한 **ABSENT**·순신규 축이다.

## 2. Canonical 필드

스펙 §2 Canonical Entity `APPROVAL_SCOPE_REGISTRY` / `APPROVAL_SCOPE_DEFINITION`(§5 Parent Scope 필드 포함). Hierarchy 관계(스펙 §13 원문): Parent Scope · Child Scope · Ancestor · Descendant.

## 3. 열거형 / 타입

Hierarchy Relation: PARENT_SCOPE · CHILD_SCOPE · ANCESTOR · DESCENDANT.

## 4. 실 substrate 매핑 (PARTIAL/PRESENT/ABSENT)

**ABSENT** — data_scope 9차원은 **FLAT**(`TeamPermissions.php:41`) 구조로, company 차원만 사실상 wildcard 특례(`:258,372`)일 뿐 부모-자식 관계 필드 자체가 없다. team 테이블도 평면(`TeamPermissions.php:145-151`·parent_team_id 없음) — 팀 간 상속 없음.

★"위계"라는 명칭을 공유하나 Scope Hierarchy가 **아닌** 것(오흡수 금지, ADR D-1/D-3):
- `menu_tree.parent_id`(`AdminMenu.php:107-117`) — UI 메뉴 위계(NOT_SCOPE, ADR D-1).
- envLabel(`Db.php:56-61`) — 배포환경 라벨(NOT_SCOPE, ADR D-1).

## 5. 설계 원칙

- ADR D-3: **Scope Hierarchy ≠ Organization Hierarchy** — data_scope 9차원 FLAT·team 평면·menu_tree(UI)·계정 위계류는 전부 Scope Hierarchy로 오흡수 금지. Scope Hierarchy는 물리적으로 조직 위계와 분리 관리(스펙 §13 원문 요구사항 그대로).
- ADR D-2: 상위 scope가 하위를 자동 포함(자동확대)하지 않음 — Hierarchy 신설 시에도 상속은 명시적 정책(Union이 아닌 Intersection 기본, §9)과 정합돼야 한다.
- company=null(현행 wildcard, `TeamPermissions.php:258`)을 Hierarchy의 "루트"로 오해석 금지 — 이는 미설정 fail-open 예외(`:255-256`)이지 계층 루트 설계가 아니다.

## 6. Gap / BLOCKED_PREREQUISITE

Parent/Child/Ancestor/Descendant 관계 substrate 전무(순신규). 신설 시 조직 위계(team 평면)와 물리적으로 분리된 독립 Hierarchy 테이블이 필요(ADR D-3). BLOCKED_PREREQUISITE: RP-002.
