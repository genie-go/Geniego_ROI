# DSAR — Audit Event (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§64 AUDIT_EVENT 원문 경계: `APPROVAL_WORK_ITEM_CREATED … APPROVAL_ASSIGNMENT_MANUAL_REVIEW_REQUESTED`. 아래는 §11~§57 lifecycle(Work Item·Assignment·Assignment History §14 EVENT_TYPE·Claim·Lease·Lock·Reassignment·Transfer·Return·Conflict·Reconciliation)에 대응하는 정본 감사 이벤트를 정규화한 목록이다. **전부 미구현.**

1. `APPROVAL_WORK_ITEM_CREATED`
2. `APPROVAL_WORK_ITEM_ROUTED`
3. `APPROVAL_CANDIDATE_RESOLVED`
4. `APPROVAL_RESOLUTION_COMPLETED`
5. `APPROVAL_QUEUE_ROUTED`
6. `APPROVAL_WORK_ITEM_QUEUED`
7. `APPROVAL_ASSIGNMENT_CREATED`
8. `APPROVAL_ASSIGNMENT_RESERVED`
9. `APPROVAL_ASSIGNMENT_CLAIMED`
10. `APPROVAL_LEASE_CREATED`
11. `APPROVAL_LEASE_RENEWED`
12. `APPROVAL_LEASE_EXPIRED`
13. `APPROVAL_LOCK_ACQUIRED`
14. `APPROVAL_LOCK_RELEASED`
15. `APPROVAL_ASSIGNMENT_UNCLAIMED`
16. `APPROVAL_ASSIGNMENT_RELEASED`
17. `APPROVAL_ASSIGNMENT_REASSIGNED`
18. `APPROVAL_ASSIGNMENT_TRANSFERRED`
19. `APPROVAL_RETURNED_TO_QUEUE`
20. `APPROVAL_ASSIGNMENT_SUSPENDED`
21. `APPROVAL_ASSIGNMENT_RESUMED`
22. `APPROVAL_ASSIGNMENT_EXPIRED`
23. `APPROVAL_ASSIGNMENT_CANCELLED`
24. `APPROVAL_ASSIGNMENT_RECOVERED`
25. `APPROVAL_ASSIGNMENT_FAILED_OVER`
26. `APPROVAL_FALLBACK_APPLIED`
27. `APPROVAL_CONFLICT_DETECTED`
28. `APPROVAL_CONFLICT_RESOLVED`
29. `APPROVAL_DRIFT_DETECTED`
30. `APPROVAL_RECONCILIATION_RUN`
31. `APPROVAL_SIMULATION_RUN`
32. `APPROVAL_ASSIGNMENT_COMPLETED`
33. `APPROVAL_ASSIGNMENT_ARCHIVED`
34. `APPROVAL_ASSIGNMENT_MANUAL_REVIEW_REQUESTED`

## 2. 기존 구현 대조

§GROUND_TRUTH 기준: 위 감사 이벤트를 방출하는 Approval Assignment lifecycle 은 **ABSENT**.

**단, 재사용 가능 substrate 명시**: `SecurityAudit.php:56-68` `verify()` — 실존하는 감사 체인 검증. 위 이벤트들의 tamper-evident 기록·검증 기반으로 **재사용 가능**하다. (주의: `reference_menu_audit_log_not_tamper_evident.md` — `menu_audit_log.hash_chain` 은 tamper-evident 가 아니며 verify() 0 이므로 정본 검증 substrate 는 오직 `SecurityAudit::verify()` 임. 신규 감사 체인 신설 금지 — 이것을 확장.)

인접 실존 흔적:
- `catalog_writeback_job` `approvalCreate` SSOT(`Catalog.php:2301-2319`)·상태 전이(`Catalog.php:396,2383-2407`) — job 승인/큐잉/처리 흔적은 남으나 위 정규화 감사 이벤트 스키마와 무관.
- `pm_task_assignees`(`PM/Assignees.php:14,32,17-72`) 수동 배정 — 배정 흔적은 있으나 CLAIMED/LEASE/REASSIGNED 등 lifecycle 이벤트 부재.

## 3. 판정

- Verdict: **ABSENT** (감사 이벤트 lifecycle 미구현)
- 선행 의존: **BLOCKED_PREREQUISITE** — 이벤트 3(Candidate)·10~12(Lease)·17(Reassign)·27~30(Conflict/Drift/Reconciliation)은 각각 Candidate·Lease·Reassignment·Conflict 엔티티 부재에 막힘. 검증 substrate(`SecurityAudit.php:56-68`)만 실존.
- cover: **0** (감사 이벤트 방출) / substrate PARTIAL(축4 verify())

## 4. 확장/구현 방향 (설계)

- 순신규 감사 이벤트 enum. 기록·검증은 **`SecurityAudit.php:56-68` verify() 를 확장 재사용**(엔진 난립 금지). `menu_audit_log` 계열은 검증 불가 장식이므로 정본으로 쓰지 않는다.
- Mandatory Control: 모든 상태전이(§14 EVENT_TYPE)는 감사 이벤트 1건을 강제 방출(Silent Pass 금지). History 삭제·과거 재작성 금지(§58).
- 무후퇴: `catalog_writeback_job` 승인 흔적·`omni_outbox` 발송 흔적은 유지하고, 신규 감사 이벤트는 그 위에 병행 기록.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
