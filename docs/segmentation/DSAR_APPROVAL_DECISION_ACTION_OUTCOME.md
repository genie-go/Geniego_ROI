# DSAR — Approval Decision Action Outcome (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§14 ACTION_OUTCOME enum (원문 전사):
- `STEP_APPROVED` / `STEP_REJECTED` / `STEP_RETURNED` / `STEP_CHANGES_REQUESTED` / `STEP_ACKNOWLEDGED` / `STEP_DEFERRED` / `STEP_ABSTAINED_REFERENCE`
- `LEVEL_APPROVED` / `LEVEL_REJECTED_REFERENCE`
- `STAGE_APPROVED` / `STAGE_REJECTED_REFERENCE`
- `CASE_REJECTED` / `CASE_CANCELLED` / `CASE_WITHDRAWN_REFERENCE`
- `CASE_RESUBMISSION_PENDING` / `CASE_RESUBMITTED`
- `WORKFLOW_CANCELLED` / `WORKFLOW_WITHDRAWN_REFERENCE`
- `NO_TERMINAL_EFFECT` / `CUSTOM`

★규율: **Action ↔ Outcome 1:1 하드코딩 금지 · Versioned Mapping**. 동일 액션이 컨텍스트(step/level/stage/case/workflow)에 따라 다른 outcome을 낳으며, 매핑은 버전화돼 과거 Decision의 outcome 해석이 소급 변경되지 않아야 한다.

## 2. 기존 구현 대조

- **Action ↔ Outcome 분리 부재** — 액션 결과가 별도 outcome enum으로 표준화되지 않고 핸들러 status 문자열에 직접 융합(§28·§64 확정: Action Definition→Effect Mapping→Outcome=ABSENT · 직접 status UPDATE).
- 실재 액션의 결과 표현:
  - `AdminGrowth::approvalDecide`(`Handlers/AdminGrowth.php:1321`) → status `approved`/`rejected` 직접 기록. STEP_APPROVED/STEP_REJECTED 같은 outcome enum 부재.
  - `Alerting::decideAction`(`Handlers/Alerting.php:593`) → 이진 파생(approve 아니면 rejected). Return/Changes/Acknowledge/Defer outcome 매핑 없음.
  - `Catalog::approveQueue`(`Handlers/Catalog.php:2383`) → status='queued'.
  - `Mapping::apply`(`Handlers/Mapping.php:327`) → 적용 상태 직접 기록.
- 계층별 outcome(`LEVEL_*`/`STAGE_*`/`CASE_*`/`WORKFLOW_*`) → **no hits**(§3.2 Sequential ABSENT — level/stage/case 계층 자체 부재).
- `CASE_RESUBMISSION_PENDING`/`CASE_RESUBMITTED`/`CASE_WITHDRAWN_REFERENCE`/`WORKFLOW_CANCELLED` → **no hits**(RESUBMIT/WITHDRAW/CANCEL 승인도메인 ABSENT · withdraw=GDPR·cancel=구독결제 `routes.php:979,1198`로 의미 상이).
- `NO_TERMINAL_EFFECT`(ACKNOWLEDGE/DEFER 비종결) → **no hits**(ACKNOWLEDGE/DEFER ABSENT).
- Versioned Mapping → **no hits**(§9 Version ABSENT — 매핑 버전화 불가).

## 3. 판정

- Verdict: **ABSENT** (Action↔Outcome 분리 없음 · status 문자열 직접 융합)
- 선행 의존: §3.2 Sequential ABSENT — level/stage/case/workflow outcome 계층 부재. Effect(§13)·Version(§9) ABSENT — outcome mapping의 결합 대상·버전화 불가. RETURN/CANCEL/WITHDRAW/RESUBMIT/ACKNOWLEDGE/DEFER 액션 자체 ABSENT — 해당 outcome 원천 부재.
- cover: **0** (outcome enum 표준화 전무 · 실재는 approved/rejected/queued status 문자열 · 이진 파생 `Alerting.php:593`).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_action_outcome` 매핑 — action version(§9) × 컨텍스트(step/level/stage/case/workflow)를 20종 outcome으로 **버전화 매핑**. status 문자열 직접 기록(`AdminGrowth.php:1321`·`Catalog.php:2383`·`Mapping.php:327`)을 outcome 매핑 조회로 대체.
- ★Action↔Outcome 1:1 하드코딩 금지: `Alerting::decideAction`(`Alerting.php:593`)의 이진 파생(approve/else)이 대표적 안티패턴 — 동일 APPROVE라도 step vs case 종결 여부가 다르므로 컨텍스트별 outcome을 매핑으로 분리. else 폴백은 미지원 액션을 STEP_REJECTED로 오분류하므로 제거.
- Mandatory Control(무후퇴): `NO_TERMINAL_EFFECT`를 명시해 ACKNOWLEDGE/DEFER가 승인으로 오취급(§32 "APPROVE로 취급 금지")되지 않도록 함. 과거 Decision은 판정 시점 outcome mapping version을 스냅샷 유지(§52) — 매핑 변경 소급 금지.
- 선행 의존: level/stage/case/workflow outcome은 §3.2 Sequential 신설 이후 연결 — 그 전까지 `STEP_APPROVED`/`STEP_REJECTED`/`NO_TERMINAL_EFFECT` 최소집합만 표준화하되 이진 파생 오분류부터 정정.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
