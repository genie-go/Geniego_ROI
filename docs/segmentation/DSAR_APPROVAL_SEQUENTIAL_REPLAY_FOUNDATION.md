# DSAR — Replay Foundation (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §54 REPLAY_FOUNDATION — 능력
Historical State Reconstruction · Transition Sequence Replay · Cursor Reconstruction · Event Ordering Validation · Missing Snapshot/Duplicate Event/State Drift Detection · Definition Version Replay · Assignment/Authority/Delegation Snapshot Replay.

★Runtime 자동 덮어쓰기 금지 · Repair = 별도 Recovery Transition.

## 2. 기존 구현 대조

- **Replay 기반 ABSENT.** 과거 상태 재구성·전이 시퀀스 재생·커서 재구성·이벤트 순서 검증·drift 탐지 능력이 없다. 전제인 Snapshot(§52)·Transition Instance(§20)·Event(§18)·Cursor(§45)가 전부 ABSENT 이므로 재생할 이력 구조 자체가 없다.
- **DLQ replay ≠ Replay Foundation.** `routes.php:1927-1932` 는 **데드레터(dead-letter)** 경로로, 실패 항목의 보관/재투입 성격이지 §54가 정의하는 상태 재구성·전이 시퀀스 재생이 아니다 → **KEEP_SEPARATE**.
- 상태전이 3종은 in-place UPDATE 로 과거를 덮어쓰므로(§52 스냅샷 부재), 재생의 원천 자료(불변 이력)가 존재하지 않는다. SecurityAudit::verify(`SecurityAudit.php:56-68`)는 감사 해시 무결 substrate 이나 상태 재구성 엔진이 아니다.

## 3. 판정

- Verdict: **ABSENT** — Replay Foundation 없음. DLQ replay(`routes.php:1927-1932`)는 데드레터로 KEEP_SEPARATE.
- 선행 의존: §52 Snapshot·§20 Transition Instance·§18 Event·§45 Cursor 전부 ABSENT → 재생 원천 부재 → **BLOCKED_PREREQUISITE**.
- cover: 0

## 4. 확장/구현 방향 (설계)

- 순신규. Snapshot(§52) + Transition Instance(§20) + Event(§18) 이력을 기반으로 **결정론적 재생 엔진** 구현 — 과거 상태 재구성·전이 시퀀스 재생·커서 재구성·이벤트 순서 검증·Missing Snapshot/Duplicate Event/State Drift 탐지.
- KEEP_SEPARATE 명시: DLQ 데드레터(`routes.php:1927-1932`)는 실패 재투입 인프라로 유지 — Replay 엔진과 혼합하지 않되, 재생 중 발견된 drift 의 후속 처리 창구로는 연계 가능.
- ★무후퇴 필수(원칙 위반 금지): **Replay 는 Runtime 상태를 자동으로 덮어쓰지 않는다.** drift 발견 시 임의 수정이 아니라 별도 Recovery Transition(§42) 생성으로만 교정. Assignment/Authority/Delegation 은 전이 시점 스냅샷으로 재생(현재 값 아님). Mandatory Control(§59 Recovery History 덮어쓰기·과거 재해석 금지). Fail Closed.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
