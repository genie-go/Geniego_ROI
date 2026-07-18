# DSAR — Action Reconciliation Status (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§56 ACTION_RECONCILIATION_STATUS (enum 전사)

`MATCH` / `ACTION_VERSION_MISMATCH` / `ACTION_OUTCOME_MISMATCH` / `REASON_APPLICABILITY_MISMATCH` / `COMMENT_REQUIREMENT_MISMATCH` / `ATTACHMENT_REQUIREMENT_MISMATCH` / `ATTACHMENT_REGISTRY_MISMATCH` / `RETURN_TARGET_MISMATCH` / `CHANGE_REQUEST_MISMATCH` / `RESUBMISSION_PACKAGE_MISMATCH` / `CANCEL_SCOPE_MISMATCH` / `WITHDRAW_ACTOR_MISMATCH` / `ASSIGNMENT_CLAIM_LEASE_MISMATCH` / `SEQUENTIAL_EFFECT_MISMATCH` / `WORKFLOW_OUTCOME_MISMATCH` / `ERP_OUTCOME_MISMATCH` / `LEGACY_STATUS_MISMATCH` / `MANUAL_REVIEW` / `BLOCKED`.

(원문 §56 축약 표기: `MATCH` · `ACTION_VERSION` · `ACTION_OUTCOME` · `REASON_APPLICABILITY` · `COMMENT/ATTACHMENT_REQUIREMENT` · `ATTACHMENT_REGISTRY` · `RETURN_TARGET` · `CHANGE_REQUEST` · `RESUBMISSION_PACKAGE` · `CANCEL_SCOPE` · `WITHDRAW_ACTOR` · `ASSIGNMENT/CLAIM_LEASE/SEQUENTIAL_EFFECT` · `WORKFLOW_OUTCOME` · `ERP_OUTCOME` · `LEGACY_STATUS_MISMATCH` · `MANUAL_REVIEW` · `BLOCKED`.)

## 2. 기존 구현 대조

- 코드 기반 판정 **ABSENT** — §56 enum은 §55 Action Reconciliation의 결과 코드로서, 부모 엔티티(§55) 자체가 ABSENT이므로 이 상태 enum도 성립하지 않음.
- 오탐 주의: 재무 정산 대사(`routes.php:1943-1998`, `/recon/reports/.../approve`·`.../lock`)는 자체 status(정산 리포트 승인/락)를 갖지만, 이는 정산 도메인 상태이지 §56 결정-액션 대사 상태 코드가 아님(명명 충돌·도메인 무관).
- 부재/미구현:
  - `ACTION_VERSION_MISMATCH`·`ACTION_OUTCOME_MISMATCH`·`REASON_APPLICABILITY_MISMATCH`·`RETURN_TARGET_MISMATCH`·`CANCEL_SCOPE_MISMATCH`·`WITHDRAW_ACTOR_MISMATCH`·`SEQUENTIAL_EFFECT_MISMATCH` → **no hits**. 각 상태가 지시하는 대조 대상(Action Version·Outcome·Return Target·Cancel Scope·Withdraw Actor·Sequential Effect)이 전부 ABSENT.
  - `LEGACY_STATUS_MISMATCH` 를 산출·기록하는 로직 → 부재. in-place status UPDATE(`Alerting.php:594` · `AdminGrowth.php:1330` · `Catalog.php:2383`)는 canonical vs legacy 이원 상태를 만들지 않으므로 mismatch 판별 대상이 없음.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §56은 §55 Action Reconciliation의 결과 enum — §55가 ABSENT이고, §55는 다시 §3.1 Decision Core·§9 Version·§14 Outcome·§15 Target·§26 Cancel·§27 Withdraw·§47 Sequential Effect(전부 ABSENT)에 종속 → **BLOCKED_PREREQUISITE**.
- cover: **0**.

## 4. 확장/구현 방향 (설계)

- 순신규: §56 19종 status enum을 §55 `approval_decision_action_reconciliation.status` 컬럼으로 선언. 부모 §55 구현과 동시에만 의미가 있음(독립 구현 불가).
- Mandatory Control: `MATCH` 외 모든 mismatch는 자동 정정 금지 — `MANUAL_REVIEW` 또는 `BLOCKED`로 라우팅하여 사람이 canonical 상태를 확정. 자동 우회는 감사 무결성 훼손.
- 마이그레이션 경로: `LEGACY_STATUS_MISMATCH`는 현행 in-place UPDATE(`Alerting.php:594`·`AdminGrowth.php:1330`·`Catalog.php:2383`) 잔재를 canonical Decision Record로 흡수하는 전용 상태 — 무후퇴(§68) 원칙 하에 기존 status를 삭제하지 말고 canonical과 병존시키며 mismatch를 명시적으로 기록.
- 실위험: 상태 enum만 선언하고 §55 대조 로직 없이 노출하면 "장식적 status"가 됨(289차 menu_audit_log hash-chain·SecurityAudit::verify 정정과 동일 함정) — status는 반드시 실 대조 결과로만 채워져야 함.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
