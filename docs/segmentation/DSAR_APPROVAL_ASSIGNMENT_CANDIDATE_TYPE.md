# DSAR — Approval Assignment Candidate Type (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`CANDIDATE_TYPE` enum (§15) — 후보 1건이 **어떤 신원 축**에서 도출됐는지 분류. 원문 13종.

1. SUBJECT
2. ROLE
3. POSITION
4. MANAGER
5. OWNER
6. DELEGATE
7. SUBSTITUTE
8. ACTING
9. GROUP
10. QUEUE_MEMBER
11. POOL_MEMBER
12. SERVICE_ACCOUNT_REFERENCE
13. CUSTOM

## 2. 기존 구현 대조

상위 Candidate 엔티티가 **ABSENT**(개념별 판정)이므로 `candidate type` 카탈로그 컬럼은 실존하지 않는다. 각 값의 인접 자산 부재 깊이:

| # | Type | 현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|---|
| 1 | SUBJECT | 인접 = `pm_task_assignees` subject 배정(`PM/Assignees.php:14,32,17-72`) · owner 신원 `UserAuth.php:156-157` — 후보 도출 산물 아님 | LEGACY_ADAPTER |
| 2 | ROLE | 인접 = team_role flat 3값(`UserAuth.php:1225-1227`) — Role Assignment 해석 계층 없음(§28 미해석) | LEGACY_ADAPTER |
| 3 | POSITION | 부재 — 축3 Position Incumbency ABSENT(incumbency grep 0) | BLOCKED_PREREQUISITE |
| 4 | MANAGER | 부재 — 축3 reporting_line ABSENT, parent_user_id=owner 붕괴(`UserAuth.php:156-157,1225-1227`) | BLOCKED_PREREQUISITE |
| 5 | OWNER | 인접 = owner=`parent_user_id IS NULL`(`UserAuth.php:156-157`) — Canonical Owner Binding(§31) 아님 | BLOCKED_PREREQUISITE |
| 6 | DELEGATE | 부재 — 위임 정본 ABSENT · `TeamPermissions.php:627-647` DELEGATION_EXCEEDED 는 ACL 부여상한(인접상이) | BLOCKED_PREREQUISITE |
| 7 | SUBSTITUTE | 부재 — 대리 정본 부재(축2·축3) | BLOCKED_PREREQUISITE |
| 8 | ACTING | 부재 — 직무대행(Position Incumbency 축3 ABSENT) | BLOCKED_PREREQUISITE |
| 9 | GROUP | 부재 — group membership 후보축 0 | ABSENT |
| 10 | QUEUE_MEMBER | 인접 = `catalog_writeback_job` 승인큐(`Catalog.php:75-84`)·`omni_outbox`(`Omnichannel.php:95-99`) — 큐 실재하나 멤버십 후보축 아님(Queue Membership=ABSENT) | PARTIAL(큐 실재·멤버십 부재) |
| 11 | POOL_MEMBER | 부재 — pool membership 0 | ABSENT |
| 12 | SERVICE_ACCOUNT_REFERENCE | 부재 — 서비스계정 후보축 0 | ABSENT |
| 13 | CUSTOM | 부재 | ABSENT |

## 3. 판정

- Verdict: **ABSENT** — Candidate 엔티티 부재 → `candidate type` 컬럼 원천 없음. 인접 LEGACY_ADAPTER 2·BLOCKED_PREREQUISITE 6·PARTIAL 1·ABSENT 4.
- 선행 의존: POSITION/MANAGER/OWNER/DELEGATE/SUBSTITUTE/ACTING 6종은 **축2 Authority·축3 Identity/Org·위임 정본 부재**로 `BLOCKED_PREREQUISITE`.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- Type 카탈로그는 순신설이나 **인접 신원을 재구현하지 마라** — SUBJECT=`pm_task_assignees`/`UserAuth`, ROLE=team_role 를 참조하되 §28(Role→Active Subject 해석·Snapshot) 계층을 신설하라. 문자열 이름 판정 금지(§29).
- **OWNER 를 `parent_user_id IS NULL` 로 봉인 금지** — 그 정의는 tenant owner 붕괴(`UserAuth.php:156-157,1225-1227`)를 그대로 상속한다. Canonical Owner Binding(§31)을 선행 신설.
- POSITION/MANAGER/DELEGATE/SUBSTITUTE/ACTING 5종은 선행 4축 신설 전 채우지 마라 — Vacant Fallback(§29)·Manager Resolution(§30)·Delegation Snapshot(§32) 정본 없이 이름 문자열로 판정하면 §58 Critical Gap 재현.
- CUSTOM 포함 확장 가능 카탈로그로 두고 ENUM 하드코딩 금지.
- 코드 변경 0 유지 — 실 구현은 별도 승인세션.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
