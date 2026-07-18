# DSAR — Level Activation (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§32 LEVEL_ACTIVATION — Level 활성화 검증 및 후속:

**검증(Precondition)**
- Instance Active
- Parent(Stage) Active
- Previous Blocking(이전 Level) 완료
- Guard/Dependency 통과
- Cursor 일치
- 중복 Active Level 없음
- Instance 가 Pause/Suspend/Block 아님
- Lock 획득 / Fencing Token 최신 / Idempotency 유효
- **(Level 고유)** Participant Resolution 가능 · **Assignment Policy 존재**

**후속(Post-activation)**
- Level Status = Active
- Cursor 갱신
- 하위(첫 Step) 활성화
- Snapshot 생성
- Audit 기록

## 2. 기존 구현 대조

- **Level Instance 부재**(§GROUND_TRUTH): `level/current_level/approval_level` 0 hits. Level 계층 실존하지 않음.
- **★Assignment Policy 부재**(§3.4): `work_item/assignment/queue/assignment_claim/lease` 0. Level Activation 이 요구하는 "Assignment Policy 존재" 조건이 참조할 SoT가 없어 근본적으로 성립 불가.
- **Participant Resolution 부재**(§3.2/§3.3/§3.5): Authority Matrix·Delegation·Canonical Identity 모두 ABSENT — Participant(승인 참가자) 를 해석할 실체 없음.
- Guard/Dependency/Cursor/Fencing/Snapshot 부재는 §31 Stage Activation 과 동일.
- 실존 상태전이 3종은 Level 계층·Participant/Assignment 해석 없음.

## 3. 판정

- Verdict: **ABSENT · BLOCKED** (Assignment Policy 부재)
- 선행 의존: **Assignment(§3.4) 부재가 결정적** — Level 은 Participant/Assignment Policy 를 요구하나 그 SoT가 전무. 추가로 Approval Chain(Level 정의)·Authority·Delegation 부재로 Participant Resolution 불가.
- cover: 0

## 4. 확장/구현 방향 (설계)

- 순신규. Level Instance(§14) 는 Assignment SoT(work_item/assignment) + Participant Resolution(Authority/Delegation/Identity) 이 선행되어야 활성화 의미를 가짐.
- **Mandatory Control**: Assignment Policy 부재 상태에서 Level 을 Active 로 전이하면 하위 Step 이 assignee 없이 공회전(§33 참조) — Level Activation Guard 에 `ASSIGNMENT_EXISTS`(§21)를 Fail-Closed Mandatory Guard 로 편입.
- 확장 substrate: omni_outbox claim/lease(`Omnichannel.php:97,410,418`)는 큐 도메인이나 Assignment Claim/Lease 설계의 검증된 패턴 참조원(KEEP_SEPARATE·CANONICAL primitive).
- 중복 Active Level 금지는 Unique Active State Constraint(§51), Cursor 일치는 Fencing Token(§49).
- **BLOCKED**: Assignment Policy(선행 5군 §3.4) 신설 전 실 구현 불가 — 별도 승인세션.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
