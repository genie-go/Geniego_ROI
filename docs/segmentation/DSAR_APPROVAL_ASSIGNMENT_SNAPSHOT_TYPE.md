# DSAR — Approval Assignment Snapshot Type (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`SNAPSHOT_TYPE` enum (§54) — 원문 18종. Snapshot(§54)이 배정 수명주기의 **어느 이벤트 시점을 동결했는지**를 나타내는 분류축이다. 상위 `SNAPSHOT`(§54) 레코드는 이 enum 을 `snapshot type` 컬럼으로 참조한다.

1. WORK_ITEM_CREATION
2. CANDIDATE_RESOLUTION
3. QUEUE_ROUTING
4. ASSIGNMENT_CREATION
5. RESERVATION
6. CLAIM
7. LEASE_RENEWAL
8. RELEASE
9. REASSIGNMENT
10. TRANSFER
11. RETURN_TO_QUEUE
12. RECOVERY
13. FALLBACK
14. DECISION_ATTEMPT
15. DECISION_COMMIT
16. SIMULATION
17. RECONCILIATION
18. AUDIT_RECONSTRUCTION

## 2. 기존 구현 대조

Snapshot(§54) 엔티티 자체가 **ABSENT**(§GROUND_TRUTH 개념별 판정: Snapshot=ABSENT). 따라서 `snapshot type` 카탈로그 컬럼은 실존하지 않는다. 아래는 각 enum 값이 가리키는 **이벤트 자체의 실존/부재** 대조이며, **이벤트 인접 자산 존재 ≠ 시점 동결 커버**다.

| # | Type | 현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|---|
| 1 | WORK_ITEM_CREATION | Work Item=PARTIAL(pm_tasks/`catalog_writeback_job` `Catalog.php:75-84`) 실재하나 생성시점 동결 0 | PARTIAL(이벤트 실재·동결 부재) |
| 2 | CANDIDATE_RESOLUTION | Candidate(§15)·Resolution(§18) ABSENT — 동결할 해결 이벤트 없음 | ABSENT |
| 3 | QUEUE_ROUTING | Routing Rule(§26) ABSENT · 인접 큐만 실재(`Catalog.php:75-84`·`Omnichannel.php:405`) | ABSENT |
| 4 | ASSIGNMENT_CREATION | Approval Assignment ABSENT — 배정 생성 이벤트 원천 없음 | ABSENT |
| 5 | RESERVATION | Reservation=ABSENT(개념별 판정) | ABSENT |
| 6 | CLAIM | 인접 = `catalog_writeback_job` CAS claim(`Catalog.php:1721-1731`)·`omni_outbox` claim(`Omnichannel.php:425-448`) — claim 이벤트 실재하나 시점 동결 아님 | PARTIAL(job/발송용) |
| 7 | LEASE_RENEWAL | 인접 = `catalog_writeback_job` 600s 회수(`Catalog.php:1699-1702`)·`omni_outbox` claimed_at(`Omnichannel.php:95-99`) — lease 재개념이나 갱신 동결 0 | PARTIAL(job용) |
| 8 | RELEASE | Release=PARTIAL(job lease 회수만) · 동결 0 | PARTIAL(job용) |
| 9 | REASSIGNMENT | Reassignment=ABSENT(개념별 판정) | ABSENT |
| 10 | TRANSFER | Transfer=ABSENT(개념별 판정) | ABSENT |
| 11 | RETURN_TO_QUEUE | 인접 = `catalog_writeback_job` 회수→재큐(`Catalog.php:1699-1702`) · 배정 반환 아님 | PARTIAL(job용) |
| 12 | RECOVERY | 인접 = `catalog_writeback_job` 600s 회수(`Catalog.php:1699-1702`) · job 복구이지 배정 복구 동결 아님 | PARTIAL(job용) |
| 13 | FALLBACK | 인접 = `omni_outbox` CAS fallback(`Omnichannel.php:425-448`) — 발송 채널 fallback·무관 | PARTIAL(무관·채널) |
| 14 | DECISION_ATTEMPT | 승인 시도 = flat 승인(`AdminGrowth.php:142,1289-1298`·`Catalog.php:2383-2407`·`Mapping.php:267-271`) · 시도 시점 동결 0 | PARTIAL(flat 승인·동결 부재) |
| 15 | DECISION_COMMIT | 동상 — 승인 확정은 실재하나 확정시점 문맥 동결 부재(§GROUND_TRUTH 축4 Actor Snapshot 부재) | ABSENT |
| 16 | SIMULATION | Simulation=ABSENT(개념별 판정) → [[DSAR_APPROVAL_ASSIGNMENT_SIMULATION]] | ABSENT |
| 17 | RECONCILIATION | Reconciliation=ABSENT(개념별 판정) → [[DSAR_APPROVAL_ASSIGNMENT_RECONCILIATION]] | ABSENT |
| 18 | AUDIT_RECONSTRUCTION | as-of 재구성 계층 부재 · 불변 정본 = `SecurityAudit.php:56-68` verify() | LEGACY_ADAPTER(해시 정본) |

## 3. 판정

- Verdict: **ABSENT** (Snapshot 엔티티 통째 부재 → `snapshot type` 컬럼 원천 없음). 이벤트 인접 자산 PARTIAL 8(job/발송/flat 승인)·LEGACY_ADAPTER 1(AUDIT_RECONSTRUCTION 해시)·ABSENT 9.
- 선행 의존: 이벤트별 값 동결은 상위 Assignment/Candidate/Resolution·선행 4축 부재에 의존. claim/lease/recovery 계열은 `catalog_writeback_job`·`omni_outbox` 인접 자산에 PARTIAL.
- cover: **0** (인접 이벤트 자산은 확장 대상이지 시점 동결 커버가 아니다.)

## 4. 확장/구현 방향 (설계)

- Snapshot Type 카탈로그는 순신설이며 **Snapshot(§54) 저장계층 신설이 선행**이다. Type 만 정의하고 동결 원본이 없으면 무의미하다.
- CLAIM/LEASE_RENEWAL/RECOVERY/RETURN_TO_QUEUE 시점은 `catalog_writeback_job` claim/회수(`Catalog.php:1699-1702,1721-1731`)·`omni_outbox` claim(`Omnichannel.php:425-448`) 이벤트에 **동결 훅을 얹되 큐를 재구현하지 마라**(§66 Duplicate Implementation Audit).
- DECISION_ATTEMPT/DECISION_COMMIT 동결은 현행 flat 승인(`AdminGrowth.php:1289-1298`·`Catalog.php:2383-2407`·`Mapping.php:267-271`) 시점에 **Actor Snapshot(§GROUND_TRUTH 축4 부재)** 을 신설해 붙여야 §58 Critical Gap("Snapshot 누락")을 닫는다.
- 18종은 확장 가능 카탈로그로 두고 ENUM 하드코딩 금지.
- 코드 변경 0 유지 — 실 구현은 별도 승인세션(Golden+verify+배포승인).

관련: [[DSAR_APPROVAL_ASSIGNMENT_SNAPSHOT]] · [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
