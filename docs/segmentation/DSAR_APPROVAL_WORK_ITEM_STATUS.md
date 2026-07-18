# DSAR — Approval Work Item Status (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§12 WORK_ITEM_STATUS enum (원문 전사·23종):

1. DRAFT
2. CREATED
3. ROUTING_PENDING
4. CANDIDATE_RESOLUTION_PENDING
5. ASSIGNMENT_PENDING
6. QUEUED
7. RESERVED
8. ASSIGNED
9. CLAIMED
10. IN_PROGRESS
11. RELEASED
12. REASSIGNMENT_PENDING
13. TRANSFER_PENDING
14. SUSPENDED
15. BLOCKED
16. COMPLETED
17. CANCELLED
18. EXPIRED
19. ORPHANED
20. RECOVERY_PENDING
21. DEAD_LETTER
22. ARCHIVED

## 2. 기존 구현 대조

- **통합 work item status enum 부재.** 배정 lifecycle(ROUTING_PENDING·CANDIDATE_RESOLUTION_PENDING·ASSIGNMENT_PENDING·RESERVED·CLAIMED·REASSIGNMENT_PENDING·TRANSFER_PENDING·ORPHANED·RECOVERY_PENDING·DEAD_LETTER)을 표현하는 상태집합은 존재하지 않는다 — routing/candidate/reservation/reassignment/transfer/recovery 개념 자체가 부재하기 때문.
- **부분 대응하는 인접 job/승인 상태(배정 아님)**: `catalog_writeback_job` 의 pending_approval→queued→processing→done/failed(`Catalog.php:75-84`, `Catalog.php:396`)는 QUEUED/IN_PROGRESS/COMPLETED 계열에 느슨히 대응하나, **job 처리 상태**이지 승인 배정 상태가 아니다. `admin_growth_approval` pending→approved/rejected(`AdminGrowth.php:142`)는 승인 결정 상태이지 assignment lifecycle 이 아니다.
- **합법 전이집합 선언 부재**: repo 전반에 상태 전이는 다수 있으나 legal transition set 을 선언·강제하는 계층은 없다.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: 상위 work item 은 substrate PARTIAL 이나, 이 status enum 이 표현하는 배정 lifecycle(routing/candidate/claim/reassignment/transfer/recovery)은 해당 엔진 부재로 전무. 인접 job/승인 상태는 배정 상태가 아님(KEEP_SEPARATE 성격).
- cover: **0** (통합 배정 status enum 부재 · 인접 job 상태는 처리 상태이지 배정 상태 아님)

## 4. 확장/구현 방향 (설계)

- **순신규 enum + 합법 전이 그래프**. 전이는 명시적 allowed-transition 표로 강제(임의 상태 점프 금지). ORPHANED·DEAD_LETTER·RECOVERY_PENDING 은 §52 Conflict/§53 Drift/§50 Return-to-Queue 처리 경로와 연동.
- **인접 매핑(재구현 금지)**: 통합 status 도입 시 `catalog_writeback_job` 상태를 canonical status 로 투영(mapping)하되, job 테이블 상태를 그대로 승인 배정 상태로 오용하지 말 것(§66 Workflow↔Approval 중복).
- **Mandatory Control**: EXPIRED/ORPHANED 는 lease 만료·drift 로만 진입 · COMPLETED 이후 재개 금지 · status 변경은 audit event(§64)와 evidence(§63) 동반.
- **선결**: work item 통합·배정 엔진 신설과 동반. 본 문서는 설계 명세.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
