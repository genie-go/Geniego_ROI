# DSAR — Cancel Scope (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§26 CANCEL_SCOPE enum**:
`DECISION_COMMAND` / `INSTANCE` / `WORK_ITEM` / `APPROVAL_REQUIREMENT` / `ITEM` / `CASE` / `WORKFLOW_REFERENCE` / `FUTURE_PENDING_STEPS` / `CUSTOM`.

(Cancel 은 이 Scope 중 하나로 대상 범위를 확정하며, Committed Record 미삭제·Existing Record 유지가 전 Scope 공통 불변식.)

## 2. 기존 구현 대조

- Cancel 대상 범위를 **Command/Instance/Work Item/Case/Workflow/Future Steps** 로 구분하는 enum 부재 — Decision Cancel 액션 자체가 없다(§26 Cancel Action ABSENT).
- 리포의 취소(`routes.php:979`·`:1198`)는 구독/결제 단일 대상 취소로, 결정 구조상의 Scope 계층(Instance↔Case↔Workflow)을 갖지 않는다.
- `DECISION_COMMAND`/`INSTANCE`/`WORK_ITEM`/`FUTURE_PENDING_STEPS` 등 범위 축을 데이터로 선언하는 자산 → **no hits**.
- Scope 가 가리킬 계층 엔티티(Command/Instance/Work Item/Workflow) 자체가 부재(§3.1 Decision Core·§3.2 Sequential ABSENT).

## 3. 판정

- **Verdict: ABSENT · BLOCKED_PREREQUISITE**.
- 선행 의존: **§3.1 Decision Core**(DECISION_COMMAND/INSTANCE/ITEM/CASE)·**§3.2 Sequential**(WORK_ITEM/APPROVAL_REQUIREMENT/FUTURE_PENDING_STEPS/WORKFLOW). Scope enum 은 이 계층들이 실재해야 의미를 가진다.
- cover: **0**.

## 4. 확장/구현 방향 (설계)

- CANCEL_SCOPE 는 CANCEL_ACTION(§26)의 **대상 해상도(resolution axis)** — 순신규. 좁은 범위(FUTURE_PENDING_STEPS: 미래 단계만 차단)부터 넓은 범위(WORKFLOW_REFERENCE: 전체 워크플로 종료)까지 명시적으로 지정, 암묵 전체취소 금지.
- **불변식(전 Scope 공통)**: 어떤 Scope 든 이미 Committed 된 결정 Record 는 삭제/변경하지 않고 유지 — `FUTURE_PENDING_STEPS`/`WORK_ITEM` 은 미착수분만 차단, `CASE`/`WORKFLOW_REFERENCE` 는 진행 중단이되 과거 결정 보존(무후퇴).
- Mandatory Control: 넓은 Scope(CASE/WORKFLOW)일수록 비가역 효과 확인(Settlement/Legal Hold/Downstream, §26)과 고위험 추가승인 요건 강화. Scope 별 Compensation Reference 범위도 함께 확정.
- 재사용: Scope 별 Assignment/Claim/Lease 종료 매핑은 §45·§46 을, 취소 이벤트 증거는 `SecurityAudit::verify`(`:56-68`)를 재사용(신규 감사엔진 신설 금지).
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_CANCEL_ACTION]] · [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
