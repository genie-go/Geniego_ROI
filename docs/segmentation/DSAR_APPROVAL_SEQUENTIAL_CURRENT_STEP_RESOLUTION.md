# DSAR — Current Step Resolution (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §27 CURRENT_STEP_RESOLUTION
현재 Step 해석 = 가장 앞선 Created · Not Terminal · Blocking Previous 완료 · Skip/Cancel 아님 · Guard/Dependency 통과 · **(+Step) Work Item 존재 · Runtime 활성화 가능**. 동시 2+ Current = Conflict 생성·진행 차단.

## 2. 기존 구현 대조

- **Step 개념 자체 ABSENT** → 현재 Step 해석 로직 ABSENT. `current_step/approval_step/step_instance/step_order` backend 전체 no matches.
- (+Step) 특유 조건 **Work Item 존재** 판정이 참조할 §3.4 Assignment/Work Item SoT 부재(work_item/assignment 0) → Step→work item 링크 실체 없음.
- Runtime 활성화 가능·Guard/Dependency 통과 평가 대상 부재.
- ★**JourneyBuilder current_node 는 KEEP_SEPARATE 참조**: `journey_enrollments.current_node`(`JourneyBuilder.php:44,68,504`)는 그래프 순회 커서로 "현재 노드" 를 해석·전진(edges 기반 다음노드·CAS 선점 `:415-425`·stale 회수 `:396`). 이는 **가장 성숙한 커서/전진 참조 패턴**이나 마케팅 저니 전용이며 승인 Step 해석이 아니다 — 재사용 대상이 아니라 패턴 참조원.
- 실존 "현재 처리 대상" = 큐 FIFO(`Catalog.php:1716`·`Omnichannel.php:405`)로 Step 커서 해석 아님.

## 3. 판정

- Verdict: **ABSENT** — Step 및 그 현재 해석 전무. 저니 current_node 는 **KEEP_SEPARATE**(승인 무관·패턴 참조).
- 선행 의존: §15 Step Instance ABSENT + §3.4 Assignment/Work Item ABSENT(Work Item 존재 판정 불가) + §21 Guard(PARTIAL)·§23 Dependency(ABSENT)·§45 Cursor ABSENT → **BLOCKED_PREREQUISITE**.
- cover: 0

## 4. 확장/구현 방향 (설계)

- 순신규. Step Instance(§15) 신설 후 **current step resolver**(가장 앞선 Created·Not Terminal·Blocking Previous 완료·Work Item 존재·Runtime 활성화 가능·Guard/Dependency 통과). 결과는 부모 Level Instance 의 current_step_instance_id + Cursor(§45) 에 기록.
- 패턴 참조(재사용 아님): JourneyBuilder current_node 순회·CAS 선점·stale 회수(`JourneyBuilder.php:44,68,504,415-425,396`)는 커서 전진/원자성/lease 의 검증된 설계 참조정본 — 승인 도메인에 별도 이식(KEEP_SEPARATE, 공유 코드 아님).
- ★전제 = Work Item/Assignment SoT(§3.4). "Work Item 존재" 가 실 판정이 되려면 Assignment 신설 필수 — 부재 시 Step 활성화가 assignee 없이 공회전. 동시 2+ Current Step = Conflict(§56)·진행 차단(Fail Closed).

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
