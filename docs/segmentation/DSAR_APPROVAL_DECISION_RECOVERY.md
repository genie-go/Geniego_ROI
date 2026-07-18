# DSAR — Decision Recovery (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**RECOVERY(§53)** — 복구 **대상**:
Commit Pending Timeout · **Record는 생성됐으나 Outbox/History/Snapshot/Idempotency/Sequential Reference 중 일부 누락** · Instance Drift · External Workflow Mismatch · Duplicate Event · Stale Lock · Orphan Command.

★핵심 계약: **기존 Record 수정 없이**(§35 Record 불변) 누락된 side-effect를 복구하거나 Manual Review로 승격. COMMAND_TYPE `RECOVER_COMMAND`(§14). 분산 원자성의 뒷문 — §48 Transaction Boundary가 부분 실패했을 때의 사후 정합 장치.

## 2. 기존 구현 대조

- **Decision Recovery = ABSENT.** 복구는 **Record + Outbox/History/Snapshot/Idempotency/Sequential Reference라는 다중 side-effect가 존재**해야 "그중 일부 누락"을 복구할 수 있는데, 현행 결정은 **단일 상태 UPDATE로 끝나** side-effect 집합 자체가 없다: `Mapping::approve:288` · `AdminGrowth::approvalDecide:1330` · `Alerting::decideAction:594` · `Catalog::approveQueue:2397`. Record(§35)·Outbox(§46)·Snapshot(§54)·Idempotency(§39)가 모두 ABSENT.
- **Commit Pending Timeout / Orphan Command 개념 부재**: 결정이 동기 단일 UPDATE여서 "커밋 대기 중 타임아웃"이나 "레코드 없는 고아 커맨드" 상태가 발생하지 않는다(Command 실체 자체가 없음, §14 ABSENT).
- **Stale Lock 복구 대상 부재**: Lock(§41)/Lease(§42)가 없어 회수할 stale lock이 없다. 반면 인접 `omni_outbox`(`Omnichannel.php:390-448`)의 15분 리스는 **메시지 도메인에서** stale claim 회수(리스 만료 후 재claim)의 실전 선례를 제공한다(KEEP_SEPARATE).
- **위험 인접**: `Alerting` 결정(`:594`)과 집행(`:631`+`:653`)의 비원자 분리는 정확히 §53이 겨냥하는 "일부만 수행된 상태"를 만들 수 있으나, 이를 감지·복구하는 워커가 없어 **불일치가 방치**된다.

## 3. 판정

- **Verdict: ABSENT.**
- **선행 의존**: Record(§35)·Outbox(§46)·History(§36)·Snapshot(§54)·Idempotency(§39)·Lock/Lease(§41/§42)·Command(§14)·Transaction Boundary(§48) 전부 부재. 복구가 대상으로 삼을 "부분 완료 상태" 자체가 성립하지 않아 다중 BLOCKED_PREREQUISITE.
- **cover: 0** (결정 도메인). `omni_outbox` 리스 회수는 메시지 도메인 선례일 뿐.

## 4. 확장/구현 방향 (설계)

- Recovery는 §48 Transaction Boundary·Outbox·Snapshot·Idempotency가 **먼저 존재해야 의미가 생기는 최후행 축**이다 — 선행 신설 전 착수 시 VACUOUS(복구할 side-effect 집합이 없음). 착수 순서: Record/Outbox/Snapshot → Recovery.
- **불변 원칙 준수**: 복구는 **기존 Record를 수정/삭제하지 않고**(§35) 누락 side-effect(Outbox/History/Snapshot/Idempotency/Sequential Reference)만 재생성하거나 **Manual Review로 승격**(§64 `MANUAL_REVIEW_REQUIRED`). Record 재작성으로 과거를 고치는 방식 금지.
- **`omni_outbox` 리스 만료/재claim 패턴 재사용**으로 Stale Lock·Commit Pending Timeout 회수 워커를 구성(Golden Rule=Extend), 결정 도메인 전용 신설.
- **최우선 실효 대상 = Alerting 비원자 불일치**(`:594` vs `:631`+`:653`) — 원자화(§48)가 우선이며, 그 전까지 발생하는 불일치는 Reconciliation(§57)/Recovery로 사후 정합. **부분 완료를 성공으로 표시 금지**(가짜녹색).
- 실 구현 = **별도 승인 세션**(선행 축 신설 이후). 본 문서는 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
