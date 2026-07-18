# DSAR — Approval Assignment Reconciliation Status (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`RECONCILIATION_STATUS` enum (§57) — 원문 26종. Reconciliation(§56) 대사 1건의 결과를 분류한다. `MATCH` 를 제외한 나머지는 각 대사 비교축의 불일치(mismatch)를 지목한다. 상위 대사 레코드가 이 enum 을 `status` 로 참조한다.

1. MATCH
2. CHAIN_PARTICIPANT_MISMATCH
3. AUTHORITY_MISMATCH
4. DELEGATION_MISMATCH
5. QUEUE_MEMBERSHIP_MISMATCH
6. QUEUE_VERSION_MISMATCH
7. ROLE_ASSIGNMENT_MISMATCH
8. POSITION_INCUMBENCY_MISMATCH
9. LEGAL_ENTITY_MISMATCH
10. ORGANIZATION_MISMATCH
11. RESOURCE_OWNER_MISMATCH
12. WORK_ITEM_STATUS_MISMATCH
13. ASSIGNMENT_STATUS_MISMATCH
14. CLAIM_STATUS_MISMATCH
15. LEASE_STATUS_MISMATCH
16. LOCK_STATUS_MISMATCH
17. CAPACITY_UTILIZATION_MISMATCH
18. QUEUE_BACKLOG_MISMATCH
19. ASSIGNEE_SNAPSHOT_MISMATCH
20. DECISION_ACTOR_MISMATCH
21. REASSIGNMENT_HISTORY_MISMATCH
22. ERP_INBOX_MISMATCH
23. WORKFLOW_TASK_MISMATCH
24. LEGACY_TASK_MISMATCH
25. MANUAL_REVIEW
26. BLOCKED

## 2. 기존 구현 대조

Reconciliation(§56) 엔티티 자체가 **ABSENT**([[DSAR_APPROVAL_ASSIGNMENT_RECONCILIATION]]). 따라서 `status` 카탈로그 컬럼은 실존하지 않는다. 아래는 각 mismatch 값이 판정하려는 **대사축의 실존/부재** 대조이며, 대사기 자체가 없으므로 어떤 값도 실측될 수 없다.

| # 군 | 대상 mismatch | 선행 축·현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|---|
| 1 | MATCH | 대사기 부재 → 항상 초록 반환은 **거짓 초록**(대조 대상 0) | ABSENT |
| 2·3·4 | CHAIN / AUTHORITY / DELEGATION | 축1 Chain·축2 Authority ABSENT · `AdminGrowth.php:142`·`Catalog.php:86`·`Mapping.php:273` flat 승인만·`TeamPermissions.php:627-647` ACL 상한 | BLOCKED_PREREQUISITE |
| 5·6 | QUEUE_MEMBERSHIP / QUEUE_VERSION | Queue Membership(§24)·Version(§23) ABSENT · 인접 큐 `Catalog.php:75-84`·`Omnichannel.php:405`에 버전/멤버십 없음 | ABSENT |
| 7·8 | ROLE_ASSIGNMENT / POSITION_INCUMBENCY | 축3 Identity/Org ABSENT(incumbency 0·`UserAuth.php:156-157,1225-1227`) | BLOCKED_PREREQUISITE |
| 9·10·11 | LEGAL_ENTITY / ORGANIZATION / RESOURCE_OWNER | 축3 부재(legal_entity 0) | BLOCKED_PREREQUISITE |
| 12·13 | WORK_ITEM_STATUS / ASSIGNMENT_STATUS | 인접 = `catalog_writeback_job` 상태전이(`Catalog.php:396,2383-2407`) · Assignment 정본 부재 | PARTIAL(큐 상태·정본 부재) |
| 14·15·16 | CLAIM / LEASE / LOCK_STATUS | 인접 = `catalog_writeback_job` CAS(`Catalog.php:1721-1731`)·`omni_outbox` claim(`Omnichannel.php:95-99,425-448`) — 상태 실재하나 Assignment 미소유 | PARTIAL(job/발송용) |
| 17 | CAPACITY_UTILIZATION | 인접 = `PM/Enterprise.php:371-400`(읽기전용·미환류) | PARTIAL(읽기전용) |
| 18 | QUEUE_BACKLOG | 인접 = `catalog_writeback_job` pending(`Catalog.php:75-84`)·`pm_task_assignees`(`PM/Assignees.php:14`) | PARTIAL(큐 실재) |
| 19·20 | ASSIGNEE_SNAPSHOT / DECISION_ACTOR | Snapshot(§54) ABSENT → 대조 우변 없음 | ABSENT |
| 21 | REASSIGNMENT_HISTORY | Reassignment=ABSENT(개념별 판정) | ABSENT |
| 22·23·24 | ERP_INBOX / WORKFLOW_TASK / LEGACY_TASK | 인접 = `pm_task_assignees`(`PM/Assignees.php:17-72`)·`catalog_writeback_job`(`Catalog.php:75-84`) — 레거시 실재·Canonical 부재 | PARTIAL(레거시 실재) |
| 25·26 | MANUAL_REVIEW / BLOCKED | 종결 처분 어휘 · 대사기 부재로 미발동 | ABSENT |

## 3. 판정

- Verdict: **ABSENT** (Reconciliation 엔티티 통째 부재 → `status` 컬럼 원천 없음). mismatch 인접 자산 PARTIAL 8군(큐 상태·claim·capacity·레거시 Task)·BLOCKED_PREREQUISITE 8군(Chain/Authority/Delegation/Role/Position/Legal Entity/Org/Resource)·ABSENT 나머지.
- 선행 의존: Chain/Authority/Delegation/Role/Position/Legal Entity mismatch 는 **선행 4축 부재**로 `BLOCKED_PREREQUISITE`. Snapshot mismatch 2군은 Snapshot(§54) ABSENT. 큐/claim/레거시 mismatch 는 인접 자산 `PARTIAL`.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- Reconciliation Status 카탈로그는 순신설이며 **Reconciliation(§56) 엔진 신설이 선행**이다. Status 만 정의하고 대사기가 없으면 항상 `MATCH`(대조 0) 를 뱉는 거짓 초록이 된다 — 이는 §288 "가짜녹색 systemic" 의 재현이다.
- **MISMATCH 는 자동 정정 금지, 표기·차단 전용** — LEGACY_TASK_MISMATCH(24)·ASSIGNEE_SNAPSHOT_MISMATCH(19) 발견 시 정본을 자동 덮어쓰면 과거 재작성(§58 Critical Gap). `MANUAL_REVIEW`(25)/`BLOCKED`(26) 로 처분하고 사람 판단에 넘겨라.
- LEGACY_TASK / WORKFLOW_TASK mismatch(23·24)는 무후퇴 대상 `pm_task_assignees`(`PM/Assignees.php:17-72`)·`catalog_writeback_job`(`Catalog.php:75-84`) 와 Canonical 배정을 대사하는 값이므로, 이들 레거시를 삭제하지 말고 대사 축으로 보존(§70 Regression Gate).
- 26종은 확장 가능 카탈로그로 두고 ENUM 하드코딩 금지.
- 코드 변경 0 유지 — 실 구현은 별도 승인세션(Golden+verify+배포승인).

관련: [[DSAR_APPROVAL_ASSIGNMENT_RECONCILIATION]] · [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
