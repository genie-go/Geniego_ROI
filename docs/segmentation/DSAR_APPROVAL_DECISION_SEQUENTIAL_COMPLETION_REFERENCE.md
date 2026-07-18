# DSAR — Sequential Completion Reference (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**SEQUENTIAL_COMPLETION_REFERENCE(§49)** 필수 필드:
`reference id` · `tenant id` · decision record id · action type · sequential instance id · stage instance id · level instance id · step instance id · slot id · actor subject id · assignment id · authority resolution id · delegation resolution id · committed_at · decision hash · correlation id · causation id · idempotency key · status · evidence.

★계약 핵심: **Sequential Engine이 이 Reference를 소비**해 다음 Step을 진행시킨다. **Decision이 다음 Step을 직접 활성화하는 것은 금지** — 결정 커밋은 완료 사실을 Reference로 발행(§48 11단계 Outbox)할 뿐, 워크플로 진행은 Sequential Engine의 책임.

## 2. 기존 구현 대조

- **Sequential Completion Reference = ABSENT.** 이를 소비할 **Sequential Engine 자체가 부재**(§3.5 Sequential = ABSENT). `AgencyPortal.php:381,400`은 **하드코딩 status flip**(승인=상태 전이 이진)으로, `sequential instance / stage / level / step instance` 개념이 없다 — §GROUND_TRUTH가 "가장 치명적"으로 분류한 축.
- 4개 결정 핸들러 중 결정 커밋 후 **step 완료를 Reference로 발행하는 경로는 없다.** 각 핸들러는 자기 단건 상태 UPDATE로 종료하며(`Mapping::approve:288` · `AdminGrowth::approvalDecide:1330` · `Alerting::decideAction:594` · `Catalog::approveQueue:2397`), 다단계 순차 워크플로의 "다음 단계"라는 개념 자체가 없다.
- **직접 활성화 안티패턴의 잠재 사례**: 결정이 곧 다음 상태를 직접 세팅(`AgencyPortal.php:381,400` status flip)하는 방식은 §49가 금지하는 "Decision이 다음 Step 직접 활성화"의 원형이다 — 완료 발행/소비 분리가 없다.

## 3. 판정

- **Verdict: ABSENT · BLOCKED_PREREQUISITE.** 선행 §3.5 Sequential 6군 부재에 정면으로 막힌다. Sequential Instance/Stage/Level/Step 실체가 없으면 이들을 참조하는 Reference 행은 **정의 자체가 불가능**하다.
- **선행 의존**: §3.5 Sequential(치명적 부재) + Decision Record(§35)·Outbox(§46)·Sequential Engine 전부 선행 필요. 4중 BLOCKED.
- **cover: 0.**

## 4. 확장/구현 방향 (설계)

- **선행 신설이 절대조건.** Sequential Engine(단계/커서/진행 이벤트)과 Decision Record가 먼저 존재해야 Reference가 성립 — 본 축은 **06-A-03-02-01 범위 내 최후행**이며, Sequential 6군 신설 전 착수 금지(BLOCKED).
- 설계 원칙: 결정 커밋은 **완료 사실만 Reference로 발행**(§48 11단계, 트랜잭셔널 Outbox 행)하고, **Sequential Engine이 소비**해 커서를 전진시킨다 — `AgencyPortal.php:381,400`형 **결정→다음상태 직접 flip 금지**(§49 위배). 이 분리가 병렬 결재·되돌림·경합 시 진행 정합을 지킨다.
- Reference는 `decision record id` + `sequential step instance id`를 묶고 `idempotency key`/`decision hash`로 **동일 step 이중 진행을 차단**(§37 SEQUENCE: 동일 Step Single Committed).
- **VACUOUS 회피**: 소비자(Sequential Engine) 없이 Reference 행만 발행하면 죽은 스켈레톤(287차). 생산(§48)·소비(Engine) 동시 설계.
- 실 구현 = **별도 승인 세션**(Sequential 6군 선행 세션 이후). 본 문서는 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
