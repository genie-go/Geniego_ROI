# DSAR — Current Stage Resolution (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §25 CURRENT_STAGE_RESOLUTION
현재 Stage 해석 = 가장 앞선 Created · Not Terminal · Blocking Previous 완료 · Skip/Cancel 아님 · Guard/Dependency 통과. **동시 2+ Current = Conflict 생성·진행 차단.**

## 2. 기존 구현 대조

- **Stage 개념 자체 ABSENT** → 현재 Stage 해석 로직도 ABSENT. `current_stage/approval_stage/stage_instance/stage_order` backend 전체 no matches.
- "가장 앞선 Created·Not Terminal·Blocking Previous 완료" 를 판정할 Stage 인스턴스 집합이 존재하지 않는다.
- Guard/Dependency 통과 평가(§21/§23) 역시 부재(Guard=PARTIAL·WHERE절 암묵만·Dependency=ABSENT).
- 동시 2+ Current Conflict 탐지(§56)·진행 차단 로직 없음.
- 실존하는 "현재 처리 대상" 은 큐 FIFO 픽업(`Catalog.php:1716`·`Omnichannel.php:405`)으로, Stage 커서 해석이 아니다.

## 3. 판정

- Verdict: **ABSENT** — Stage 및 그 현재 해석 전무.
- 선행 의존: §13 Stage Instance ABSENT + §21 Guard(PARTIAL)·§23 Dependency(ABSENT) + §45 Cursor(승인) ABSENT → **BLOCKED_PREREQUISITE**.
- cover: 0

## 4. 확장/구현 방향 (설계)

- 순신규. Stage Instance(§13) 골격 신설 후 **current stage resolver**(가장 앞선 Created·Not Terminal·Blocking Previous 완료·Skip/Cancel 제외·Guard/Dependency 통과) 구현. 결과는 Cursor(§45)에 기록(Derived Cache 아님·Runtime Consistency Contract).
- ★동시 2+ Current = **Conflict(§56) 생성 + 진행 차단**(Fail Closed). Unique Current 제약(§51 Concurrent Transition Prevention·Unique Current Cursor Constraint)으로 강제.
- 전제: Stage/Level/Step + Guard 레지스트리 + Dependency + Cursor 선행. JourneyBuilder current_node 순회(`JourneyBuilder.php:44,68,504`)는 그래프 커서 해석의 참조 패턴이나 마케팅 전용(**KEEP_SEPARATE**) — 승인 Stage resolver 로 직접 재사용 아님.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
