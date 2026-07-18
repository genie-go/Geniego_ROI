# DSAR — Next Step Resolution (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§30 NEXT_STEP_RESOLUTION — 다음 대상 해석 순서(고정 우선순위):
1. 동일 Level 내 다음 Mandatory Step
2. 동일 Level 내 다음 Optional Step
3. Optional Skip 평가
4. Level Completion 평가
5. 다음 Level
6. Stage Completion 평가
7. 다음 Stage
8. Instance Completion Reference

★원칙: Skip/Optional 을 **암묵적으로 처리 금지** → 모든 진행/스킵은 명시적 Transition + Audit 로 기록.

## 2. 기존 구현 대조

- **다단 Stage/Level/Step 부재**(§GROUND_TRUTH): 위 8단계 해석은 Stage/Level/Step 구조와 Sequence ordering 을 전제하나 `current_step/stage/level/step_order/sequence_no` 0 hits — 해석 알고리즘이 순회할 계층이 없음.
- **순서 진행 substrate**: 실존하는 유일한 "다음" 개념은 큐 FIFO(`ORDER BY id ASC` — `Catalog.php:1716`·`Omnichannel.php:405`). 이는 처리 순서일 뿐 승인 단계 시퀀싱(Mandatory→Optional→Level→Stage)이 아님.
- **명시적 Transition + Audit 부재**: 상태 전이 3종(catalog_writeback_job·admin_growth_approval·mapping_change_request)은 인라인 `SET status=next` 하드코딩 — 전이 정의 테이블·Transition Instance 기록 없음. §30 이 요구하는 "암묵 진행 금지·Transition+Audit" 계약을 만족하는 실존 자산 없음.
- JourneyBuilder edges 기반 다음 노드 해석(`JourneyBuilder.php:504`)은 그래프 순회로, 승인의 Mandatory/Optional/Level/Stage 우선순위 해석과 성격이 다름(KEEP_SEPARATE).

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: Approval Chain(§3.1) 의 Stage/Level/Step 정의·Sequence ordering(§24) 부재로 해석 대상 자체가 없음. Assignment/Authority/Delegation 부재로 해석된 다음 Step 을 활성화할 후속도 공회전.
- cover: 0

## 4. 확장/구현 방향 (설계)

- 순신규. §24 Ordering(Stable Sequence·Unique within Parent·No Duplicate Active) 위에서만 결정론적 해석 가능.
- **Mandatory Control**: 8단계 해석 결과(Next Step / Skip / Level·Stage·Instance Completion)는 반드시 Transition Instance(§20) + Audit Event(§65 NEXT_STEP/LEVEL/STAGE_RESOLVED)로 커밋 — 암묵 진행 절대 금지.
- 확장 substrate: JourneyBuilder 의 그래프 순회 커서 전진 패턴을 **참조 정본**으로 인용하되 승인 계층 해석 로직은 순신규.
- 동시 2+ Current 발생 시 Conflict(§56) 생성·진행 차단 — Unique Current Cursor Constraint(§51)로 강제.
- **BLOCKED_PREREQUISITE**: Stage/Level/Step Instance + Cursor 선행 필수.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
