# DSAR — Sequential Level Status (enum) (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§14 LEVEL_STATUS enum(20종):
NOT_CREATED / CREATED / NOT_READY / READY / ACTIVE / WAITING_FOR_ASSIGNMENT / WAITING_FOR_CLAIM / WAITING_FOR_DECISION / TRANSITION_PENDING / COMPLETION_PENDING / COMPLETED / SKIPPED / PAUSED / SUSPENDED / BLOCKED / FAILED / CANCELLED / ARCHIVED.

## 2. 기존 구현 대조

- **Level 이라는 상태 축이 실존하지 않으므로 이 enum 을 담을 컬럼도 없다.** 실존 상태 문자열은 전부 자유형/단발이다:
  - `catalog_writeback_job.status VARCHAR(30)` 자유문자열(`Catalog.php:80`) — 실사용 어휘 = queued/pending_approval/processing 수준.
  - `admin_growth_approval.status VARCHAR(20)`(`AdminGrowth.php:146`) — pending→approved|rejected 단발(`AdminGrowth.php:1330`).
  - `mapping_change_request.status` — 정족수 파생 pending/approved(`Mapping.php:287`).
- 이들 중 어느 것도 `WAITING_FOR_ASSIGNMENT`·`WAITING_FOR_CLAIM`·`WAITING_FOR_DECISION`·`TRANSITION_PENDING`·`COMPLETION_PENDING` 같은 **다단 순차·대기·전이 세분 상태**를 갖지 않는다.
- JourneyBuilder 상태 어휘(active/waiting/processing/completed)는 **마케팅 여정 실행** 상태이지 승인 Level 상태가 아니다(§GROUND_TRUTH: KEEP_SEPARATE).
- **★ "status 컬럼 존재 ≠ State Machine"**(키트 규율 2·6): 자유문자열 status 가 있다는 사실이 이 20종 enum 의 실존 근거가 되지 못한다.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §3.4 Assignment(WAITING_FOR_ASSIGNMENT/CLAIM/DECISION 의 대기 대상이 참조할 Assignment/Claim/Decision 실체 부재) · 부모 §14 Level Instance 부재
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **순신규 enum.** 어떤 레거시 status 문자열도 이 20종으로 승격하지 마라 — 자유문자열을 enum 으로 캐스팅하면 의미 역산이다.
- **대기 상태(WAITING_FOR_*)는 참조 무결성 선결**: `WAITING_FOR_ASSIGNMENT/CLAIM/DECISION` 은 각각 §3.4 Assignment·Claim·Decision Reference 가 실존해야 의미를 가진다 → 선행 신설 전 배선 금지.
- **터미널/비터미널 구분 강제**: COMPLETED/SKIPPED/CANCELLED/ARCHIVED/FAILED = 터미널, BLOCKED/SUSPENDED/PAUSED = 회복대상 비터미널. State(§17) 정의 테이블에서 terminal/waiting/mutable 플래그로 파생하고 문자열 비교로 하드코딩하지 마라.
- **무후퇴**: Level Status 는 Level Instance(§14) 와 동시 신설·선행 4군 이후 → **BLOCKED_PREREQUISITE**.

관련: [[DSAR_APPROVAL_SEQUENTIAL_LEVEL_INSTANCE]] · [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
