# DSAR — Approval Assignment Reassignment (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`REASSIGNMENT`(§47) — 기존 Assignment 를 다른 Assignee/Queue 로 **재배정**하는 이벤트. History 보존·새 Sequence·전체 재검증을 동반한다.

### 필수 필드 (원문)

1. reassignment_id
2. source assignment id
3. work_item_id
4. previous assignee / new assignee
5. previous queue / new queue
6. type
7. requested_by
8. approved_by
9. reason
10. authority / delegation / capacity / SoD validation
11. effective_at
12. status
13. evidence

### REASSIGNMENT TYPE (원문 enum)

MANUAL · AUTOMATIC · MANAGER · ADMINISTRATIVE · DELEGATION_CHANGE · AUTHORITY_CHANGE · CAPACITY · AVAILABILITY · SECURITY · LEGAL_ENTITY_CHANGE · RECOVERY · ESCALATION_REFERENCE · CUSTOM

원문 원칙(§48): History 삭제 금지 · 새 Sequence · 기존 Claim/Lease/Lock 종료 · 새 Assignee 전체 재검증 · Reason 필수 · 고액 Reassign 승인 · 자기반복 Reassign 시 Aging 초기화 금지.

## 2. 기존 구현 대조

Reassignment 엔진은 **부재**하다(개념별 판정: Reassignment=ABSENT). 유일한 인접물은 `pm_task_assignees` 의 수동 add/remove 로, 이것은 작업 항목 담당자 목록을 사람이 직접 넣고 빼는 M:N 배정일 뿐 재검증·History·Claim/Lease 종료를 동반한 재배정 엔진이 아니다.

| 필드군 | 선행 축·현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|
| Reassignment 엔진 자체 | 부재 — 재배정 이벤트/재검증 파이프 0 | ABSENT |
| previous/new assignee (수동 add/remove) | `pm_task_assignees` M:N 수동 배정(`PM/Assignees.php:17-72`)·role(owner/contributor/reviewer/observer)(`PM/Assignees.php:32`) — 수동 목록만, 엔진 없음 | VALIDATED_LEGACY(수동 배정) |
| 기존 Claim/Lease/Lock 종료 | 인접 = `catalog_writeback_job` CAS claim(`Catalog.php:1721-1731`) — 재배정 시 종료 로직 없음 | PARTIAL(claim 실재·종료 미배선) |
| authority/delegation/SoD validation | 선행 축2 Authority·축4 SoD hook 부재 | BLOCKED_PREREQUISITE |
| capacity validation | `PM/Enterprise.php:371-400`(읽기전용·미환류) | PARTIAL(읽기전용) |
| approved_by (고액 Reassign 승인) | 인접 승인 = `catalog_writeback_job` 임의 requirePro(`Catalog.php:2385`)·`admin_growth_approval`(`AdminGrowth.php:142`) — 재배정 전용 승인 게이트 없음 | ABSENT |
| History(§14) 보존 / effective_at | Assignment History 정본 부재 → 삭제 금지 원칙 강제 불가 | ABSENT |

## 3. 판정

- Verdict: **ABSENT** — 재검증·History·Claim 종료를 동반한 Reassignment 엔진 전무. `pm_task_assignees` 수동 add/remove(`PM/Assignees.php:17-72`)는 담당자 목록 편집이지 재배정 엔진이 아니다.
- 선행 의존: authority/delegation/SoD validation 은 선행 축2·축4 부재로 `BLOCKED_PREREQUISITE`. capacity validation 은 읽기전용(`PM/Enterprise.php:371-400`). Claim/Lease/Lock 종료는 claim 유사물(`Catalog.php:1721-1731`)에 의존하나 종료 로직 미배선.
- cover: **0** (수동 배정 자산 `PM/Assignees.php:17-72` 은 VALIDATED_LEGACY 이나 재배정 엔진 커버 아님).

## 4. 확장/구현 방향 (설계)

- Reassignment 는 `pm_task_assignees`(`PM/Assignees.php:17-72`)를 **재구현하지 말고 확장**하라(CONSOLIDATION_REQUIRED). 수동 add/remove 를 정본 Reassignment 이벤트(reassignment_id·source assignment id·previous/new assignee·reason·approved_by)로 감싸 History(§14)에 REASSIGNED 로 남긴다.
- §48 Mandatory Control 강제: **History 삭제 금지 · 새 Sequence 발급 · 기존 Claim/Lease/Lock 종료 · 새 Assignee 전체 재검증(Authority/Delegation/Capacity/SoD) · Reason 필수 · 고액 Reassign 승인 · 자기반복 Reassign Aging 초기화 금지**(Reassignment Loop 방지).
- authority/delegation/SoD 재검증은 선행 4축(Authority·Org·SoD)이 먼저 성립해야 자동화 가능 — 그 전에는 MANUAL/ADMINISTRATIVE type + 명시 승인만 허용(fail-closed).
- 고액 승인 게이트는 `admin_growth_approval`(`AdminGrowth.php:142`)·`catalog_writeback_approval`(`Catalog.php:86`) 정족수 패턴을 참조하되 재배정 전용 정본은 신설.
- 코드 변경 0 유지 — 실 구현은 별도 승인세션.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
