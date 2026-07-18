# DSAR — Sequential Step Status (enum) (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§16 STEP_STATUS enum(29종):
NOT_CREATED / CREATED / NOT_READY / READY / ACTIVATION_PENDING / ACTIVE / WAITING_FOR_ASSIGNMENT / ASSIGNMENT_READY / WAITING_FOR_CLAIM / CLAIMED / WAITING_FOR_DECISION / DECISION_RECEIVED_REFERENCE / TRANSITION_PENDING / COMPLETION_PENDING / COMPLETED / SKIP_PENDING / SKIPPED / PAUSE_PENDING / PAUSED / RESUME_PENDING / SUSPEND_PENDING / SUSPENDED / BLOCKED / RETRY_PENDING / RECOVERY_PENDING / FAILED / CANCELLED / ARCHIVED.

## 2. 기존 구현 대조

- **Step 상태 축이 실존하지 않는다**(§GROUND_TRUTH 다단 Step ABSENT). 실존 status 문자열은 세분화되지 않은 소수 어휘:
  - `catalog_writeback_job.status VARCHAR(30)` 자유문자열(`Catalog.php:80`) — queued/pending_approval/processing.
  - `admin_growth_approval.status VARCHAR(20)`(`AdminGrowth.php:146`) — pending/approved/rejected 3종·이미처리 409(`AdminGrowth.php:1327`).
  - `mapping_change_request.status`(`Mapping.php:287`) — pending/approved.
- 이 29종의 **claim/decision/transition/skip/pause/retry/recovery 세부 대기 상태**(WAITING_FOR_CLAIM·ASSIGNMENT_READY·DECISION_RECEIVED_REFERENCE·SKIP_PENDING·RETRY_PENDING·RECOVERY_PENDING 등)를 담는 실존 스키마는 없다.
- 근접한 상태 세분 = JourneyBuilder(active/waiting/processing/completed·`JourneyBuilder.php:44,68`)이나 승인 Step 이 아니라 마케팅 여정 상태다(§GROUND_TRUTH: KEEP_SEPARATE).
- **★ "status 컬럼 존재 ≠ State Machine"**: 자유문자열 status 존재가 29종 enum 실존 근거가 아니다.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §3.4 Assignment(WAITING_FOR_ASSIGNMENT·ASSIGNMENT_READY·WAITING_FOR_CLAIM·CLAIMED 의 참조 실체 부재) · §3.1 Approval Chain(DECISION_RECEIVED_REFERENCE) · 부모 §15 Step Instance
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **순신규 enum.** 레거시 3종 status 문자열을 29종으로 매핑 승격하지 마라.
- **`*_PENDING` 전이 중간상태는 Transition Instance(§20)와 짝**: ACTIVATION_PENDING/TRANSITION_PENDING/COMPLETION_PENDING/SKIP_PENDING/PAUSE_PENDING/SUSPEND_PENDING/RETRY_PENDING/RECOVERY_PENDING 은 전이 원자성을 위한 중간상태이므로 Transition Lock·Fencing Token(§46/§49·현재 ABSENT) 없이 하드코딩 UPDATE 로 진입시키면 stale worker overwrite 위험.
- **터미널/비터미널·회복 플래그는 State(§17) 정의 테이블에서 파생**: COMPLETED/SKIPPED/CANCELLED/ARCHIVED/FAILED=터미널, RETRY_PENDING/RECOVERY_PENDING/BLOCKED/SUSPENDED=회복대상. 문자열 비교 하드코딩 금지.
- **무후퇴**: Step Instance·Step Status·State Machine 동시 신설·선행 5군 이후 → **BLOCKED_PREREQUISITE**.

관련: [[DSAR_APPROVAL_SEQUENTIAL_STEP_INSTANCE]] · [[DSAR_APPROVAL_SEQUENTIAL_STATE]] · [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
