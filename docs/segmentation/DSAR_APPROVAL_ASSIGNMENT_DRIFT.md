# DSAR — Approval Assignment Drift (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`DRIFT`(§53) — 배정 시점 Snapshot 과 현재 상태가 **어긋난 것을 탐지**하는 축. 아래 신호를 감지해야 한다.

### 탐지 신호 (원문)

1. Assignee Inactive
2. Employment Inactive
3. Role Removed
4. Position Changed
5. Authority Revoked / Reduced
6. Delegation Expired / Revoked / Suspended
7. Queue Membership Removed
8. Queue Version Changed
9. Legal Entity / Organization Changed
10. Resource Ownership Changed
11. Action Permission Removed
12. Amount Limit Reduced
13. Currency Scope Changed
14. Capacity Exhausted
15. Availability Changed
16. Security Suspended
17. SoD / CoI 발생
18. Lease Expired
19. Lock Stale
20. Policy Version Drift
21. Task Assignee ↔ Snapshot 불일치
22. Decision Actor ↔ Assignment 불일치

## 2. 기존 구현 대조

Drift 탐지 축은 **통째로 부재**하다(개념별 판정: Drift=ABSENT). 대부분의 탐지 신호는 선행 4축(Authority·Org·Delegation·SoD)과 Snapshot(§54) 정본에 의존하는데, 이들이 모두 부재하므로 "무엇이 어긋났는지" 비교할 기준선 자체가 없다.

| 탐지 신호 | 선행 축·현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|
| Drift 탐지 축 자체 | 부재 — 배정 drift 비교 코드 0 | ABSENT |
| Task Assignee ↔ Snapshot 불일치 | Snapshot(§54) 정본 **ABSENT** · `pm_task_assignees`(`PM/Assignees.php:17-72`) 수동 목록만 존재하나 배정 시점 Snapshot 없음 | BLOCKED_PREREQUISITE |
| Authority Revoked/Reduced · Amount Limit Reduced | 선행 축2 Authority Matrix ABSENT(`TeamPermissions.php:627-647` = ACL 부여상한, drift 축 아님) | BLOCKED_PREREQUISITE |
| Delegation Expired/Revoked/Suspended | 위임 정본 ABSENT | BLOCKED_PREREQUISITE |
| Legal Entity / Organization Changed · Position Changed | 선행 축3 `org_unit/reporting_line/legal_entity/incumbency` ABSENT(`UserAuth.php:156-157,1225-1227`) | BLOCKED_PREREQUISITE |
| SoD / CoI 발생 | 선행 축4 SoD hook·CoI foundation 부재 | BLOCKED_PREREQUISITE |
| Security Suspended | 축4 break-glass(`UserAuth.php:773-778,864,910,1006`) 실재하나 배정 drift 와 미연결 | PARTIAL(무관) |
| Lease Expired / Lock Stale | 인접 = 600s 처리 회수(`Catalog.php:1699-1702`)·CAS claim fencing 부재(`Catalog.php:1721-1731`) | PARTIAL(회수만·fencing 부재) |
| Assignee/Employment Inactive · Queue Membership Removed | Queue Membership(§24)·employment 상태 정본 ABSENT | BLOCKED_PREREQUISITE |

## 3. 판정

- Verdict: **ABSENT** — Drift 탐지 축 전무. 22개 탐지 신호 다수가 **선행 4축·Snapshot(§54) 부재**에 의존.
- 선행 의존: Authority Revoked·Delegation Expired·Legal Entity/Org/Position Changed·SoD/CoI·Assignee Inactive·Queue Membership Removed 는 모두 **선행 4축 부재**로 `BLOCKED_PREREQUISITE`. Task Assignee↔Snapshot 불일치는 Snapshot(§54) 정본 부재로 비교 기준선 없음. Lease Expired/Lock Stale 은 회수 유사물(`Catalog.php:1699-1702`)·fencing 부재로 `PARTIAL`.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- Drift 는 **탐지축**이므로 반드시 **Snapshot(§54)이 선행**되어야 한다 — "배정 시점 상태 vs 현재 상태" 비교는 배정 시점 Snapshot 이 있어야만 가능. Snapshot 없이 Drift 를 세우면 비교 대상 없는 빈 탐지기가 된다.
- 22개 신호 대부분이 선행 4축(Authority·Org/Legal Entity·Delegation·SoD/CoI)의 상태 변화를 관찰하므로, **선행 4축이 성립한 후에야 대부분의 Drift 신호가 구현 가능**하다(BLOCKED_PREREQUISITE). 그 전에 구현 가능한 것은 Lease Expired·Lock Stale(fencing 추가 시)·Policy Version Drift 정도.
- Reconciliation(§56)과 짝을 이루도록 설계 — Drift 는 "실시간 어긋남 탐지", Reconciliation 은 "주기적 대조". 두 축 모두 Snapshot(§54)을 공유.
- `pm_task_assignees`(`PM/Assignees.php:17-72`) 수동 목록을 Snapshot 없이 drift 판정에 쓰지 마라 — 배정 시점 상태를 Snapshot 으로 고정한 뒤에만 Task Assignee↔Snapshot 불일치 탐지가 성립.
- 코드 변경 0 유지 — 실 구현은 선행 4축·Snapshot 신설 후 별도 승인세션.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
