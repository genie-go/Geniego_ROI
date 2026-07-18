# DSAR — Approval Assignment Conflict (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`CONFLICT`(§52) — 배정/큐/권한/락 계층에서 발생하는 **충돌을 탐지·해소**하는 엔티티.

### CONFLICT TYPE (원문 enum)

MULTIPLE_ACTIVE_ASSIGNMENTS · MULTIPLE_ACTIVE_CLAIMS · ASSIGNEE_QUEUE_CONFLICT · AUTHORITY · DELEGATION · LEGAL_ENTITY · ORGANIZATION · RESOURCE · ACTION · MONETARY · CURRENCY · CAPACITY · AVAILABILITY_CONFLICT · SOD_CONFLICT · CONFLICT_OF_INTEREST · STALE_LOCK · STALE_LEASE · ORPHAN_ASSIGNMENT · VERSION_CONFLICT · REASSIGNMENT_LOOP · QUEUE_ROUTING_LOOP · FALLBACK_LOOP · CUSTOM

### 필수 필드 (원문)

1. conflict_id
2. work_item_id
3. assignment ids
4. candidate ids
5. queue ids
6. conflict type
7. severity
8. detected_at
9. resolution policy
10. winning assignment
11. resolved_by / resolved_at
12. status
13. evidence

## 2. 기존 구현 대조

배정 수준 Conflict 엔진은 **부재**하다(개념별 판정: Conflict=PARTIAL·동시성만). 코드에 존재하는 것은 **동시성 double-claim 방지 락**(CAS·FOR UPDATE SKIP LOCKED)뿐으로, 이것은 두 워커가 같은 job 을 동시 claim 하는 것을 막는 lock 이지 배정 수준 충돌(다중 활성 배정·권한/SoD/CoI 충돌·loop) 탐지·해소가 아니다.

| Conflict Type / 필드 | 선행 축·현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|
| Conflict 엔티티 자체 (conflict_id·resolution policy·winning assignment) | 부재 — 배정 충돌 탐지/해소 코드 0 | ABSENT |
| MULTIPLE_ACTIVE_CLAIMS (동시성 double-claim) | `catalog_writeback_job` CAS claim(`Catalog.php:1721-1731`)·`omni_outbox` FOR UPDATE SKIP LOCKED(`Omnichannel.php:425-448`) — **동시성 락만**, 배정 충돌 아님 | PARTIAL(동시성만) |
| STALE_LEASE / ORPHAN_ASSIGNMENT | 인접 = 600s 처리 회수(`Catalog.php:1699-1702`) — stale 회수 유사물, orphan 탐지 엔진 없음 | PARTIAL(회수만) |
| AUTHORITY / DELEGATION / LEGAL_ENTITY / ORGANIZATION conflict | 선행 축2 Authority·축3 Org 부재 | BLOCKED_PREREQUISITE |
| SOD_CONFLICT / CONFLICT_OF_INTEREST | 선행 축4 SoD hook·CoI foundation **부재** | BLOCKED_PREREQUISITE |
| STALE_LOCK (fencing) | CAS claim 실재하나 fencing token 부재(`Catalog.php:1721-1731`) → stale lock 판정 불가 | PARTIAL(fencing 부재) |
| REASSIGNMENT_LOOP / QUEUE_ROUTING_LOOP / FALLBACK_LOOP | Reassignment·Routing·Fallback 엔티티 ABSENT → loop 탐지 대상 없음 | ABSENT |

## 3. 판정

- Verdict: **PARTIAL** (동시성만) — 배정 수준 Conflict 엔진 부재. `catalog_writeback_job` CAS(`Catalog.php:1721-1731`)·`omni_outbox` FOR UPDATE SKIP LOCKED(`Omnichannel.php:425-448`)는 double-claim 방지 **동시성 락**이지 conflict 탐지·해소가 아니다.
- 선행 의존: AUTHORITY/DELEGATION/LEGAL_ENTITY/SOD/CoI conflict 는 **선행 축2·축3·축4 부재**로 `BLOCKED_PREREQUISITE`. STALE_LOCK 은 fencing token 부재로 판정 불가. Loop 계열은 상위 엔티티(Reassignment/Routing/Fallback) ABSENT 에 의존.
- cover: **부분** — 동시성 락 근거 `Catalog.php:1721-1731`·`Omnichannel.php:425-448` (배정 충돌 탐지·winning assignment 선정 로직 없음).

## 4. 확장/구현 방향 (설계)

- 현행 동시성 락(`Catalog.php:1721-1731`·`Omnichannel.php:425-448`)을 **배정 충돌 해소(§52)와 혼동하지 마라** — 락은 CANONICAL 이나 Conflict Resolution 계층은 별도 신설. 락은 "동시에 못 잡게" 하고, Conflict 는 "이미 어긋난 상태를 탐지·해소"한다.
- **STALE_LOCK 탐지를 위해 fencing token(§44) 추가**가 선행 — 현행 CAS claim 은 fencing 이 없어 오래된 프로세스 덮어쓰기를 막지 못한다(§66 Fencing 없는 Lock).
- SOD_CONFLICT/CONFLICT_OF_INTEREST 는 선행 축4(SoD hook·CoI foundation)가 성립해야 탐지 가능 — 그 전에는 BLOCKED_PREREQUISITE.
- Loop 계열(REASSIGNMENT/QUEUE_ROUTING/FALLBACK)은 각 상위 엔티티 신설 시 방문 집합 추적으로 동시 설계 — §58 Critical Gap(Loop).
- Conflict 는 severity·resolution policy·winning assignment·resolved_by 를 남겨 History(§14)·Evidence(§63)에 기록. evidence 는 `SecurityAudit::verify()`(`SecurityAudit.php:56-68`) 확장.
- 코드 변경 0 유지 — 실 구현은 별도 승인세션.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
