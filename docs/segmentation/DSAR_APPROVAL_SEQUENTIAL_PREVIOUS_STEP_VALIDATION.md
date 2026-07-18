# DSAR — Previous Step Validation (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §28 PREVIOUS_STEP_VALIDATION
이전 Step 검증 = Previous Step 존재/Mandatory/Blocking/Status · **Completion Event 존재** · **Completion Snapshot 존재** · Assignment 상태 · Decision Commit Reference · Skip Policy · Recovery 상태 · Reconciliation Drift. **★`status=COMPLETED` 만으로 불충분 · Event + Snapshot 병행 필수.**

## 2. 기존 구현 대조

- **이전 Step 검증 개념 전면 ABSENT** — Step 자체가 없어(`current_step/step_instance` 0) "이전 Step" 참조 대상이 없다.
- ★핵심 부재: **Completion Event 개념 없음 · Completion Snapshot 개념 없음.** 상태전이 3종은 모두 `status=next` 인라인 UPDATE(`Catalog.php:1726`·`AdminGrowth.php:1330`·`Mapping.php:287`)로, 완료를 별도 이벤트로 발행하거나 불변 스냅샷(§52)으로 봉인하지 않는다. 즉 현행은 정확히 §28이 **금지**하는 "`status=COMPLETED` 문자열만으로 완료 인정" 패턴이다.
- Decision Commit Reference·Reconciliation Drift(§57)·Recovery 상태(§42) 부재. Assignment 상태 참조는 §3.4 Assignment ABSENT 로 불가.
- 부분 substrate: SecurityAudit::verify(`SecurityAudit.php:56-68`)=감사 무결 기반은 있으나 Step Completion Event/Snapshot 검증과 무관.

## 3. 판정

- Verdict: **ABSENT** — 이전 Step 검증 및 그 전제인 **Completion Event / Completion Snapshot 개념 자체 없음**. 현행 `status=COMPLETED` 단독 인정은 §28 위반 패턴.
- 선행 의존: §15 Step Instance·§18 Event(Completion Event)·§52 Snapshot·§3.4 Assignment 전부 ABSENT → **BLOCKED_PREREQUISITE**.
- cover: 0

## 4. 확장/구현 방향 (설계)

- 순신규. **Completion Event(§18) + Completion Snapshot(§52) 이중 요건**을 신설하고, 다음 Step 활성화(§33)의 전이 precondition(§22)으로 강제 — `status=COMPLETED` 단독으로는 결코 진행 불가(§59 "Completion Event/Snapshot 없이 Completed" Critical 갭 방지).
- 무후퇴·Mandatory Control: 이전 Step Mandatory·Blocking 이면 Completion Event 존재 + immutable_hash Snapshot 존재 + Decision Commit Reference + Reconciliation Drift 없음 을 모두 통과해야 다음 Step READY. 미충족 = Block(§40 `MISSING_COMPLETION_EVENT/SNAPSHOT`·`PREVIOUS_STEP_INCOMPLETE`).
- 재사용: JourneyBuilder journey_node_sent UNIQUE 멱등(`JourneyBuilder.php:454,482,490`)이 "완료 이벤트 1회 봉인" 의 참조 패턴(멱등·중복처리 방지) — 단 저니 전용(KEEP_SEPARATE), 승인 Completion Event 로 별도 이식. Step/Event/Snapshot/Assignment 골격 선행 필수.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
