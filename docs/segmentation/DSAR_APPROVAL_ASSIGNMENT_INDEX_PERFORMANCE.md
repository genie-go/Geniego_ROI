# DSAR — Index / Performance (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§68 INDEX_PERFORMANCE 인덱스 대상(원문 전사):

1. Tenant / Case / Chain Level / 상태별 Work Item
2. Assignee별 Active (assignment)
3. Queue별 Backlog / Claimable
4. Subject별 Claimed
5. Lease Expiration
6. Stale Lock
7. Reassignment Pending
8. Transfer Pending
9. Orphan
10. Recovery
11. Legal Entity별
12. Organization별
13. Resource별
14. Action별
15. Amount Band별
16. Currency별
17. Priority별
18. Due Date별
19. Delegation별
20. Authority별
21. Conflict
22. Drift
23. Snapshot
24. Reconciliation Mismatch

## 2. 기존 구현 대조

§GROUND_TRUTH 기준: 위 인덱스 대상 테이블(Work Item·Assignment·Claim·Lease·Lock·Queue·Conflict·Drift·Snapshot·Reconciliation)이 **ABSENT** 이므로 대응 인덱스도 ABSENT.

인접 실존 자산의 조회 패턴(계약과 무관):
- `catalog_writeback_job`(`Catalog.php:75-84`) — 상태별(`pending_approval/queued/processing/done/failed`) 조회·CAS claim(`Catalog.php:1721-1731`)·600s 회수 스캔(`Catalog.php:1699-1702`)이 존재. "Stale Lock/Recovery" 인덱스(§68-6,10)에 개념적으로 인접하나 job 테이블 전용.
- `omni_outbox`(`Omnichannel.php:95-99,405,425-448`) — `FOR UPDATE SKIP LOCKED`·claim_id/claimed_at 기반 큐 소비. "Queue Claimable"(§68-3) 패턴에 인접하나 발송 outbox 전용.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: **BLOCKED_PREREQUISITE** — 인덱스는 대상 테이블 존재를 전제. Work Item·Assignment·Queue·Lease·Lock·Conflict·Drift·Snapshot·Reconciliation 이 모두 부재하여 인덱스 설계가 실행 불가(선행 4축 및 §11~§57 엔티티 부재에 종속).
- cover: **0**

## 4. 확장/구현 방향 (설계)

- 엔티티 신설 시 §68 인덱스 24종을 스키마와 동시 정의(hot path: Assignee별 Active·Queue별 Claimable·Lease Expiration·Stale Lock — 스캐너/회수 워커의 tenant-partitioned 인덱스 필수).
- 성능 유의: `omni_outbox` 의 `FOR UPDATE SKIP LOCKED` claim 패턴은 CANONICAL 이므로 Queue Claimable 조회의 참조 구현으로 재사용. Lease Expiration·Stale Lock 스캔은 `catalog_writeback_job` 600s 회수(`Catalog.php:1699-1702`) 방식보다 fencing token 결합형으로 상향.
- 무후퇴: 신규 인덱스는 기존 job/outbox 테이블 조회 성능에 영향 주지 않도록 별도 테이블에 격리.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
