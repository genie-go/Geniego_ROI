# DSAR — Step Activation (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§33 STEP_ACTIVATION — Step 활성화 검증 및 후속:

**검증(Precondition)**
- Instance Active
- Parent(Level) Active
- Previous Blocking(이전 Step) 완료
- Guard/Dependency 통과
- Cursor 일치
- 중복 Active Step 없음
- Instance 가 Pause/Suspend/Block 아님
- Lock 획득 / Fencing Token 최신 / Idempotency 유효
- **(Step 고유)** Work Item 존재/생성 가능 · Assignment 가능 · Authority 유효 · Delegation 유효 · Legal Entity 일치

**후속(Post-activation)**
- Step Status = Active
- Cursor 갱신
- **Work Item 생성/연결 + Assignment 요청**
- Snapshot 생성
- Audit 기록

## 2. 기존 구현 대조

- **Step Instance 부재**(§GROUND_TRUTH): `step/current_step/step_order/approval_step` 0 hits. Step 계층 실존하지 않음.
- **★Work Item/Assignment 부재**(§3.4): `work_item/assignment/queue` 0. Step Activation 의 핵심 후속인 "Work Item 생성/연결 + Assignment 요청"이 연결될 실체가 전무 → 활성화해도 assignee 링크가 **공회전**(§8 EXISTING_IMPLEMENTATION: "Step→assignee 링크 공회전").
- **Authority/Delegation 부재**(§3.2/§3.3): Authority·Delegation 유효성 검증 대상 없음.
- **Legal Entity 부재**(§3.5): Legal Entity 개념 ABSENT(`parent_user_id`=owner 계정트리는 오탐) — Legal Entity 일치 검증 불가.
- Guard/Dependency/Cursor/Fencing/Snapshot 부재는 §31/§32 와 동일.
- 실존 상태전이 3종에는 Step 활성화 시 Work Item 생성/Assignment 요청 경로 없음.

## 3. 판정

- Verdict: **ABSENT · BLOCKED** (Work Item/Assignment 부재로 공회전)
- 선행 의존: **Assignment(§3.4) 부재가 결정적** — Step 은 활성화 즉시 Work Item 생성 + Assignment 요청을 후속으로 하는데 대상 SoT가 없어 활성화가 무의미. Authority/Delegation/Legal Entity(§3.2/§3.3/§3.5) 부재로 Step 고유 검증도 불가.
- cover: 0

## 4. 확장/구현 방향 (설계)

- 순신규. Step Instance(§15) 는 Work Item + Assignment SoT 가 선행되어야 활성화 후속(Work Item 생성·Assignment 요청)이 의미를 가짐.
- **Mandatory Control**: Work Item/Assignment 없이 Step 을 Active 로 두면 §43 Orphan(Active Step 인데 Work Item 없음) 상시 발생 — Step Activation Guard 에 `ASSIGNMENT_EXISTS`/`WORK_ITEM` 을 Fail-Closed 로 편입, 활성화와 Work Item 생성을 동일 Transaction Boundary(§51)에서 원자 커밋.
- 확장 substrate: CAS(`Catalog.php:1726-1730`)로 중복 Active Step 선점 차단, omni_outbox claim/lease 패턴 참조. Snapshot(STEP_ACTIVATION type §52)은 순신규.
- **★실위험**: Fencing Token 부재 → 활성화 커밋 시 stale worker 가 이미 Skip/Complete 된 Step 을 재활성화할 이론적 창(§59 stale worker overwrite). 활성화를 Fencing Token 검증 하에 둘 것.
- **BLOCKED**: Work Item/Assignment(§3.4) 신설 전 실 구현 시 공회전 — 별도 승인세션.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
