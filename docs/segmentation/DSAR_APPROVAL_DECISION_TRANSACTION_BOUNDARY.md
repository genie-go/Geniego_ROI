# DSAR — Decision Transaction Boundary (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**TRANSACTION_BOUNDARY(§48)** — 단일 원자 커밋 안에서 순서대로 수행되어야 하는 12단계:

1. Lock 검증 · 2. Fencing 검증 · 3. Expected Version 검증 · 4. Slot Unique 검증 · 5. Record 생성 · 6. History 생성 · 7. Snapshot 생성 · 8. Audit 생성 · 9. Instance 상태갱신 · 10. Idempotency Result 기록 · 11. Sequential Completion Reference Outbox · 12. Committed Outbox.

★분산 환경 = Outbox/Inbox + Recovery Contract로 원자성 대체(2PC 대신). ★Partial Commit(§60) = Critical Gap.

## 2. 기존 구현 대조

- **12단계 원자 커밋 = ABSENT.** 승인 결정 4핸들러 어디에도 위 12단계를 감싸는 트랜잭션 경계가 없다.
- **Mapping::approve(:238-293)** — read approvals_json(`:273`) → append → 단일 UPDATE(`:288`)이 **트랜잭션 없이** 수행된다(§GROUND_TRUTH 명시 **TOCTOU**). read와 write 사이에 경쟁 쓰기가 끼면 정족수 계산이 깨진다. 1~4단계(Lock/Fencing/Expected Version/Slot Unique) 검증 전무, 5~12단계(Record/History/Snapshot/Audit/Idempotency/Outbox) 미생성.
- **Catalog::approveQueue(:2383-2407)** — bulk UPDATE status='queued'(`:2397`) **직후 같은 요청에서** `processWritebackQueue`(`:2404`) 즉시 실행 = **결정과 집행이 원자 경계 없이 융합**(2PC도 Outbox도 아님). 중간 실패 시 일부만 큐잉/처리된 Partial Commit 위험.
- **Alerting decideAction(:594) → executeAction(:601-665)** — 결정 UPDATE(`:594`)와 집행(`AdAdapters::pause` `:631` + UPDATE `:653`)이 **별도 호출·비원자**. 외부 어댑터 성공 후 로컬 UPDATE 실패 시 side-effect와 상태가 어긋난다(§48 Recovery Contract가 있어야 할 자리).
- **AdminGrowth::approvalDecide(:1330)** — 단일 UPDATE + audit(`:1342`). audit은 있으나 Record/History/Snapshot/Outbox와 **하나의 트랜잭션으로 묶이지 않음**.
- 재사용 가능한 원자성 부품: `omni_outbox` claim/lease(`Omnichannel.php:390-448`)가 분산 Outbox Contract의 선례를 제공하나, 결정 커밋 트랜잭션에 배선돼 있지 않다.

## 3. 판정

- **Verdict: ABSENT.** 이름·주석이 아닌 코드 기반: 어느 핸들러도 5~12단계를 하나의 커밋으로 보장하지 않으며 Mapping은 트랜잭션조차 없다(TOCTOU).
- **선행 의존**: §3.5 Sequential 부재(11단계 Sequential Completion Reference Outbox 성립 불가) + Record(§35)/Lock(§41)/Fencing(§43)/Idempotency(§39) 전부 ABSENT → **경계가 감쌀 내용물 자체가 없음**.
- **cover: 0.**

## 4. 확장/구현 방향 (설계)

- **최우선 실위험 = Mapping TOCTOU**(`Mapping.php:273→288` 트랜잭션 부재). 정족수 maker-checker(`:287`)·자기승인 차단(`:268`)·dedup(`:278`)은 살아 있으나, read-modify-write가 원자적이지 않아 **동시 승인 시 정족수 우회** 가능. 최소 조치로 SELECT ... FOR UPDATE 또는 조건부 UPDATE(Expected Version, §44)로 4단계 Slot Unique 검증을 선행해야 한다.
- 12단계는 **단일 DB 트랜잭션**으로 감싸되, 외부 side-effect(11·12 Outbox)는 **커밋 인라인 발행이 아니라 트랜잭셔널 Outbox 행 기록**으로만 수행(발행은 소비 워커). 분산 원자성은 2PC가 아니라 **Outbox/Inbox + Recovery(§53)** 로 확보 — `omni_outbox` 패턴 재사용.
- **Catalog의 결정·집행 융합**(`:2397`+`:2404`)과 **Alerting의 결정·집행 분리 비원자**는 상반된 결함이나 해법은 동일: 결정 커밋은 트랜잭션 안에서 종료하고, 집행은 커밋된 Outbox 이벤트를 소비해 수행(§46). **Partial Commit 금지**(§60).
- Record는 **Update/Delete 없이 생성만**(§35) — 트랜잭션 롤백은 미커밋 Record를 없앨 뿐, 커밋 후 정정은 새 Record(§38).
- 실 구현 = **별도 승인 세션**. 본 문서는 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
