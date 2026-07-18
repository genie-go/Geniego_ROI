# DSAR — Deadlock Detection (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §44 DEADLOCK_DETECTION — 탐지 조건
A↔B 상호대기 · Stage/Level/Step Dependency Cycle · Cursor 진행불가 Terminal 이전 · 모든 Candidate 제외 + Fallback 없음 · Pause/Resume Loop · Retry Exhausted · Recovery Loop · Queue Routing Loop · Assignment Fallback Loop · Transition Lock 만료안됨 + 소유자없음. 발생 시 차단 + Manual Review/Recovery.

## 2. 기존 구현 대조

- **승인 도메인 Deadlock 탐지 = ABSENT.** A↔B 상호대기·Dependency Cycle·Cursor 진행불가·Pause/Resume Loop·Recovery Loop·Assignment Fallback Loop 를 탐지하는 그래프 순환 검사·워치독은 존재하지 않는다.
- **탐지의 전제(Dependency/Cursor/Assignment)가 전부 부재.** Dependency(§23) 그래프·Cursor(§45)·Assignment(§3.4)·다단 Stage/Level/Step 이 모두 ABSENT 이므로 "Cycle"·"Cursor 진행불가"·"Assignment Fallback Loop" 는 정의 자체가 성립하지 않는다.
- **부분적 시간초과 회수만 존재(≠ Deadlock 탐지).** 잡/아웃박스는 stale 항목을 시간 기준으로 되살린다(`Catalog.php:1700` 600s·`Omnichannel.php:395` 900s). 이는 "Transition Lock 만료안됨 + 소유자없음" 을 시간 만료로 우회 회수할 뿐, **순환/상호대기 관계를 탐지하는 Deadlock 검사가 아니다** — 무한 Retry/Recovery Loop 를 순환으로 인지하지 못한다(Retry Exhausted·Recovery Loop 카운팅 없음).
- 워크플로 엔진(camunda/temporal/bpmn/saga/state_machine)=**ABSENT 전무**이므로 엔진 제공 데드락 감지도 없다.

## 3. 판정

- Verdict: **ABSENT** — 승인 도메인 Deadlock(상호대기·Dependency Cycle·Loop·Cursor 정체) 탐지 없음. 시간초과 회수는 순환 탐지가 아님.
- 선행 의존: Dependency(§23)·Cursor(§45)·Assignment(§3.4)·다단 Step 전부 ABSENT → 탐지 전제 자체가 **BLOCKED_PREREQUISITE**.
- cover: 0

## 4. 확장/구현 방향 (설계)

- 순신규 **Deadlock 탐지기**: Dependency 그래프(§23) 신설 후 위상정렬 기반 Cycle 검사 + Cursor 정체(§45)·Retry Exhausted·Recovery Loop 카운터를 워치독으로 감시. 발생 시 §40 Block(`DEADLOCK`) + Manual Review 라우팅(§59 Critical Gap: Deadlock 미탐지 금지).
- 재사용: stale 시간초과 회수(`Catalog.php:1700`·`Omnichannel.php:395`)는 "소유자 없는 만료 Lock 회수" 로만 유효 — Deadlock 탐지와 **역할 분리**(시간 회수 ≠ 순환 탐지). Recovery Loop 를 만들지 않도록 max-attempts/max-recovery 컷을 §8 POLICY 로 선언.
- ★탐지 전제(Dependency/Cursor/Assignment)가 모두 선행 SoT 신설에 막혀 있으므로, 현 단계에서 Deadlock 탐지는 순신규 대상이며 허구 탐지기 배선 금지 — 미구현이 정직한 상태.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
