# DSAR — Approval Assignment History (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`ASSIGNMENT_HISTORY`(§14) — 하나의 Assignment 가 겪은 모든 상태·소유 변경을 삭제 불가·불변으로 축적하는 이벤트 원장.

### 필수 필드 (17)

1. history_id
2. assignment_id
3. work_item_id
4. sequence
5. event type
6. previous assignee
7. new assignee
8. previous queue
9. new queue
10. previous status
11. new status
12. actor
13. reason code / text
14. authority snapshot
15. delegation snapshot
16. policy version
17. occurred_at · immutable_hash · evidence

### EVENT_TYPE enum (21)

CREATED / ROUTED / QUEUED / ASSIGNED / RESERVED / CLAIMED / LEASE_RENEWED / UNCLAIMED / RELEASED / REASSIGNED / TRANSFERRED / RETURNED_TO_QUEUE / SUSPENDED / RESUMED / EXPIRED / CANCELLED / RECOVERED / FAILED_OVER / FALLBACK_APPLIED / COMPLETED / ARCHIVED.

## 2. 기존 구현 대조

상위 Approval Assignment 엔티티가 **ABSENT**(§GROUND_TRUTH)이므로 그 이력 원장인 Assignment History 도 통째로 부재하다. 어떤 필드도 실존 컬럼에 대응하지 않는다.

| 항목 | 현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|
| Assignment 자체 | ABSENT — Assignment 엔티티 없음(개념별 판정: Approval Assignment=ABSENT) | ABSENT |
| 이력 축적 선례(인접) | `catalog_writeback_job` 상태전이(`Catalog.php:396,2383-2407`)는 job 행 상태 갱신이지 소유·배정 변경 이력 원장이 아님 | PARTIAL(무관·job) |
| authority/delegation snapshot | 선행 축2 Authority·위임 정본 ABSENT — 스냅샷 대상 자체 부재 | BLOCKED_PREREQUISITE |
| immutable_hash / evidence | 정본 해시체인 = `SecurityAudit.php:56-68` verify() 실재(tenant 해시·prev 교차) — 확장 대상 인접 자산이나 Assignment History 커버 아님 | LEGACY_ADAPTER |
| actor(누가 변경했나) | 인접 = `pm_task_assignees`(`PM/Assignees.php:14,32`) 배정 주체 기록 존재하나 이력 원장·불변성 없음 | VALIDATED_LEGACY(수동 배정) |

## 3. 판정

- Verdict: **ABSENT** — Assignment History 엔티티 통째 부재. 이력 원장·불변 해시·삭제금지(§48) 계층 없음.
- 선행 의존: authority/delegation snapshot 필드는 **축2 Authority Matrix·위임 정본 부재**로 `BLOCKED_PREREQUISITE`. 이력 원장 자체는 상위 Assignment(ABSENT) 신설 후에만 성립.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- Assignment History 는 순신설이나 **불변 해시체인은 `SecurityAudit::verify()`(`SecurityAudit.php:56-68`)를 정본으로 확장**하라. 🔴 `menu_audit_log.hash_chain` 은 tamper-evident 아님([[reference_menu_audit_log_not_tamper_evident]]) — 인용 금지.
- **History 삭제·과거 재작성 금지**(§48·§58 Critical Gap). 모든 이벤트는 새 `sequence`+append-only, `occurred_at`·`actor`·`reason` 필수.
- authority/delegation snapshot 필드는 선행 4축이 세워지기 전까지 채우지 마라 — 없는 스냅샷을 NULL 로 봉인하면 §56 Reconciliation(Decision Actor↔Snapshot 불일치) 탐지를 무력화한다.
- 배정 주체 actor 는 `pm_task_assignees`(`PM/Assignees.php`) 배정 주체 기록을 참조하되 이력 원장은 별도 불변 계층으로 신설.
- 코드 변경 0 유지 — 실 구현은 별도 승인세션.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
