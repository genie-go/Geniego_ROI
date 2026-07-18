# DSAR — Current Level Resolution (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §26 CURRENT_LEVEL_RESOLUTION
현재 Level 해석 = 가장 앞선 Created · Not Terminal · Blocking Previous 완료 · Skip/Cancel 아님 · Guard/Dependency 통과 · **(+Level) Optional 평가 · Assignment 가능**. 동시 2+ Current = Conflict 생성·진행 차단.

## 2. 기존 구현 대조

- **Level 개념 자체 ABSENT** → 현재 Level 해석 로직 ABSENT. `current_level/approval_level/level_instance/level_sequence` backend 전체 no matches.
- (+Level) 특유 조건 **Assignment 가능** 판정이 참조할 §3.4 Assignment SoT 부재(work_item/assignment/queue 0) → assignee 해석 실체 없음.
- Optional Level 평가·Guard/Dependency 통과 평가 대상 부재(Guard=PARTIAL·Dependency=ABSENT).
- 유일한 "레벨 유사" 는 mapping_change_request 단일 레벨 M-of-N 정족수(`Mapping.php:287`)이나, **레벨이 하나뿐인 병렬 승인**으로 다단 레벨 커서 해석과 무관(순차 아님).

## 3. 판정

- Verdict: **ABSENT** — Level 및 그 현재 해석 전무.
- 선행 의존: §14 Level Instance ABSENT + §3.4 Assignment ABSENT(Assignment 가능 판정 불가) + §21 Guard(PARTIAL)·§23 Dependency(ABSENT) → **BLOCKED_PREREQUISITE**.
- cover: 0

## 4. 확장/구현 방향 (설계)

- 순신규. Level Instance(§14) 신설 후 **current level resolver**(가장 앞선 Created·Not Terminal·Blocking Previous 완료·Optional 평가·Assignment 가능·Guard/Dependency 통과). 결과는 부모 Stage Instance 의 current_level_instance_id + Cursor(§45) 에 기록.
- ★핵심 전제 = **Assignment SoT(§3.4)** — "Assignment 가능" 이 실 판정이 되려면 work_item/assignment 신설 필수. 부재 시 Level 활성화가 assignee 없이 공회전(BLOCKED_PREREQUISITE).
- 동시 2+ Current Level = Conflict(§56)·진행 차단(Fail Closed). Mandatory Level 미완료 시 다음 Level 진행 금지(§59 High 갭 방지). mapping M-of-N 정족수는 "단일 레벨 병렬 승인" 패턴으로 별도 보존(VALIDATED_LEGACY) — 다단 레벨과 혼동 금지.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
