# DSAR — Approval Assignment Reconciliation (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`RECONCILIATION`(§56) — 배정의 **정본 상태와 그 근거·연계 시스템 간 정합성을 주기적으로 대사**하여 불일치(drift)를 탐지·표기하는 계층. 결과는 `RECONCILIATION_STATUS`(§57)로 분류한다([[DSAR_APPROVAL_ASSIGNMENT_RECONCILIATION_STATUS]]).

### 대사 비교 항목 (원문)

1. Chain Participant ↔ Candidate
2. Authority Resolution ↔ Assignee
3. Delegation Resolution ↔ Assignee
4. Queue Membership ↔ Claimed Actor
5. Queue Version ↔ Active Assignment
6. Role Assignment ↔ Assignee
7. Position Incumbency ↔ Assignee
8. Legal Entity / Organization ↔ Assignee
9. Resource Owner ↔ Owner Assignment
10. Work Item Status ↔ Assignment Status
11. Assignment ↔ Claim ↔ Lease ↔ Lock Status
12. Capacity Utilization ↔ Active Assignment
13. Queue Backlog ↔ Work Items
14. Current Assignee ↔ Snapshot
15. Decision Actor ↔ Snapshot
16. Reassignment History ↔ Current
17. ERP Inbox ↔ Canonical
18. Workflow Task ↔ Canonical
19. Legacy Task ↔ Canonical

## 2. 기존 구현 대조

배정 Reconciliation 은 **ABSENT**(§GROUND_TRUTH 개념별 판정: Reconciliation=ABSENT). 대사는 "정본(Assignment)" 과 "근거(Chain/Authority/Delegation/Queue/Snapshot)" 를 양변으로 두는데, **양변이 모두 부재**하므로 대사할 기준선 자체가 없다.

| 대사 비교군 | 선행 축·현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|
| Reconciliation 엔진 자체 | 부재 — 주기적 정합성 대사 계층 0 | ABSENT |
| Chain Participant ↔ Candidate | 축1 Approval Chain **ABSENT**(`chain_*` 0 · flat 승인만 `AdminGrowth.php:142`·`Catalog.php:86`·`Mapping.php:273`) · Candidate ABSENT | BLOCKED_PREREQUISITE |
| Authority / Delegation Resolution ↔ Assignee | 축2 Authority **ABSENT** · `TeamPermissions.php:627-647` DELEGATION_EXCEEDED=ACL 상한(인접상이) | BLOCKED_PREREQUISITE |
| Role Assignment / Position Incumbency ↔ Assignee | 축3 Identity/Org **ABSENT**(incumbency 0 · `UserAuth.php:156-157,1225-1227` parent_user_id=owner 붕괴) | BLOCKED_PREREQUISITE |
| Legal Entity / Organization ↔ Assignee | 축3 부재(legal_entity 0) | BLOCKED_PREREQUISITE |
| Assignment ↔ Claim ↔ Lease ↔ Lock Status | 인접 = `catalog_writeback_job` 상태전이(`Catalog.php:396,2383-2407`)+CAS claim(`Catalog.php:1721-1731`)·`omni_outbox` claim(`Omnichannel.php:425-448`) — 큐 상태는 실재하나 Assignment 정본 부재로 대사 불가 | PARTIAL(큐 상태·정본 부재) |
| Capacity Utilization ↔ Active Assignment | 인접 = `PM/Enterprise.php:371-400`(읽기전용·미환류) · Active Assignment 부재 | PARTIAL(읽기전용) |
| Queue Backlog ↔ Work Items | 인접 = `catalog_writeback_job` pending 큐(`Catalog.php:75-84`)·`pm_task_assignees`(`PM/Assignees.php:14,32,17-72`) | PARTIAL(큐 실재) |
| Current Assignee / Decision Actor ↔ Snapshot | Snapshot(§54) **ABSENT** → 대조 우변 없음 | ABSENT |
| ERP Inbox ↔ Canonical | ERP Inbox 통합·Canonical 배정 둘 다 부재 | ABSENT |
| Workflow Task / Legacy Task ↔ Canonical | 인접 = `pm_task_assignees`(`PM/Assignees.php:17-72`)·`catalog_writeback_job`(`Catalog.php:75-84`) — 레거시 Task 실재하나 Canonical 배정 부재로 대사 불가 | PARTIAL(레거시 실재·Canonical 부재) |
| 대사 결과 무결성(evidence) | 정본 = `SecurityAudit.php:56-68` verify() | LEGACY_ADAPTER(evidence) |

## 3. 판정

- Verdict: **ABSENT** — 배정 정합성 대사 엔진 통째 부재. 정본(Assignment)·근거(Chain/Authority/Snapshot) 양변 모두 부재로 대사 기준선 없음.
- 선행 의존: Chain/Authority/Delegation/Role/Position/Legal Entity 대사 6군은 **선행 4축 부재**로 `BLOCKED_PREREQUISITE`. Snapshot 대조 2군은 Snapshot(§54) ABSENT. 큐/레거시 Task/Capacity 대사는 인접 자산 `PARTIAL`.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- Reconciliation 은 순신설이며 **Assignment(§13)·Snapshot(§54)·선행 4축이 모두 선행**되어야 양변이 생긴다. 정본도 근거도 없이 대사기만 세우면 항상 MATCH(대조 대상 0) 를 반환하는 거짓 초록이 된다.
- **레거시 Task 대사(17·18·19)를 정합성의 출발점으로 삼아라** — 실존 인접 자산 `pm_task_assignees`(`PM/Assignees.php:17-72`)·`catalog_writeback_job`(`Catalog.php:75-84`)·`admin_growth_approval`(`AdminGrowth.php:142`)·agency 접근승인(`AgencyPortal.php:80,365-384`)은 **무후퇴 대상**(§70). Canonical 배정 신설 시 이들을 삭제·재구현하지 말고 대사로 연결.
- Snapshot 대조(14·15)는 Snapshot(§54) 신설이 선행이며, 그 무결성은 **`SecurityAudit::verify()`(`SecurityAudit.php:56-68`)** 로 검증(새 해시엔진 금지). 🔴 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]).
- Reconciliation 은 불일치 발견 시 **정본을 자동 덮어쓰지 말고 표기·차단**(§57 MANUAL_REVIEW/BLOCKED) — 자동 정정은 과거 재작성(§58 Critical Gap) 위험.
- 코드 변경 0 유지 — 실 구현은 별도 승인세션(Golden+verify+배포승인).

관련: [[DSAR_APPROVAL_ASSIGNMENT_RECONCILIATION_STATUS]] · [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
