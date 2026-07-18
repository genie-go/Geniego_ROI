# DSAR — Approval Assignment Candidate Source (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`CANDIDATE_SOURCE` enum (§16) — 후보 1건이 **어느 해석 소스**에서 산출됐는지. 원문 20종.

1. APPROVAL_CHAIN_PARTICIPANT
2. APPROVAL_AUTHORITY_RESOLUTION
3. APPROVAL_DELEGATION_RESOLUTION
4. REPORTING_LINE
5. MANAGER_RESOLUTION
6. OWNER_RESOLUTION
7. ROLE_ASSIGNMENT
8. POSITION_INCUMBENCY
9. QUEUE_MEMBERSHIP
10. GROUP_MEMBERSHIP
11. RESOURCE_OWNER
12. PROGRAM_OWNER
13. BUDGET_OWNER
14. COST_CENTER_OWNER
15. PROFIT_CENTER_OWNER
16. LEGAL_ENTITY_CONTROLLER
17. REGIONAL_CONTROLLER
18. COUNTRY_CONTROLLER
19. FINANCE_SHARED_SERVICE
20. CUSTOM

## 2. 기존 구현 대조

★**핵심**: Candidate Source 는 후보를 산출하는 **선행 해석 엔진**을 참조한다. 그런데 이 소스 대부분이 선행 4축(Approval Chain·Authority·Delegation·Reporting Line·Org)의 산출물이며, 그 4축이 §GROUND_TRUTH 상 **ABSENT/PARTIAL**이다. 따라서 대부분 소스는 `BLOCKED_PREREQUISITE` 다.

| # | Source | 선행 축·현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|---|
| 1 | APPROVAL_CHAIN_PARTICIPANT | 축1 Approval Chain **ABSENT**(chain_* grep 0) · flat 승인테이블만(`AdminGrowth.php:142`·`Catalog.php:86`·`Mapping.php:273` 정족수2) | BLOCKED_PREREQUISITE |
| 2 | APPROVAL_AUTHORITY_RESOLUTION | 축2 Authority Matrix **ABSENT**(authority_matrix/amount_band 0) | BLOCKED_PREREQUISITE |
| 3 | APPROVAL_DELEGATION_RESOLUTION | 위임 정본 부재 · `TeamPermissions.php:627-647` DELEGATION_EXCEEDED=ACL 부여상한(인접상이) | BLOCKED_PREREQUISITE |
| 4 | REPORTING_LINE | 축3 reporting_line **ABSENT** · parent_user_id=owner 붕괴(`UserAuth.php:156-157,1225-1227`) | BLOCKED_PREREQUISITE |
| 5 | MANAGER_RESOLUTION | Manager Resolution Foundation 부재(축3 ABSENT) | BLOCKED_PREREQUISITE |
| 6 | OWNER_RESOLUTION | owner=`parent_user_id IS NULL`(`UserAuth.php:156-157`)는 Canonical Owner Binding 아님 | BLOCKED_PREREQUISITE |
| 7 | ROLE_ASSIGNMENT | team_role flat 3값(`UserAuth.php:1225-1227`) — Role Assignment 해석 계층(§28) 없음 | BLOCKED_PREREQUISITE |
| 8 | POSITION_INCUMBENCY | 축3 Position Incumbency **ABSENT**(incumbency grep 0) | BLOCKED_PREREQUISITE |
| 9 | QUEUE_MEMBERSHIP | 인접 = `catalog_writeback_job`(`Catalog.php:75-84`)·`omni_outbox`(`Omnichannel.php:95-99`) 큐 실재하나 Queue Membership 엔티티 **ABSENT** | PARTIAL(큐 실재·멤버십 부재) |
| 10 | GROUP_MEMBERSHIP | 부재 — group membership 축 0 | ABSENT |
| 11 | RESOURCE_OWNER | 축3 Org·리소스 소유 정본 부재 | BLOCKED_PREREQUISITE |
| 12 | PROGRAM_OWNER | 부재 — program owner 축 0 | ABSENT |
| 13 | BUDGET_OWNER | 부재 — budget owner 축 0 | ABSENT |
| 14 | COST_CENTER_OWNER | 부재 — cost center 축 0(축3 Org ABSENT) | BLOCKED_PREREQUISITE |
| 15 | PROFIT_CENTER_OWNER | 부재 — profit center 축 0(축3 Org ABSENT) | BLOCKED_PREREQUISITE |
| 16 | LEGAL_ENTITY_CONTROLLER | 축3 legal_entity **ABSENT** | BLOCKED_PREREQUISITE |
| 17 | REGIONAL_CONTROLLER | 축3 Org 지역 계층 부재 | BLOCKED_PREREQUISITE |
| 18 | COUNTRY_CONTROLLER | 축3 Org 국가 계층 부재 | BLOCKED_PREREQUISITE |
| 19 | FINANCE_SHARED_SERVICE | 부재 — finance shared service 축 0 | ABSENT |
| 20 | CUSTOM | 부재 | ABSENT |

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE** (지배 판정) — 20종 중 12종이 선행 4축(Chain/Authority/Delegation/ReportingLine/Org) 부재에 직접 막힘. PARTIAL 1(QUEUE_MEMBERSHIP)·ABSENT 5·나머지 12 BLOCKED_PREREQUISITE.
- 선행 의존: **축1 Approval Chain·축2 Authority Matrix·축3 Identity/Org·위임 정본** — 이 4축이 신설되기 전에는 Candidate Source 의 대다수가 참조할 산출 엔진 자체가 없다.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- ★**Candidate Source 는 독립 신설이 불가능하다** — 후보 소스는 정의상 선행 해석 엔진(Chain Participant·Authority Resolution·Delegation Resolution·Reporting Line·Org)의 출력이다. 이 4축을 EPIC 06-A-01 계열에서 선행 신설한 뒤에야 Source enum 이 의미를 갖는다.
- **선행 4축 없이 Source 를 상수·NULL 로 채우지 마라** — APPROVAL_CHAIN_PARTICIPANT/AUTHORITY_RESOLUTION 을 임의로 "resolved" 처리하면 §58 Critical Gap("Authority/Delegation 미검증 Assignment")을 구조적으로 재현하고, §56 Reconciliation(Chain Participant↔Candidate·Authority Resolution↔Assignee 대조)을 무력화한다.
- QUEUE_MEMBERSHIP 만 부분 착수 가능 — `catalog_writeback_job`(`Catalog.php:75-84`)·`omni_outbox`(`Omnichannel.php:95-99`) 큐를 기반으로 Queue Membership 엔티티를 신설하되 Queue Version(§23)·Eligibility Profile(§25) 정본 위에 세워라.
- 코드 변경 0 유지 — 실 구현은 선행 4축 신설 후 별도 승인세션.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
