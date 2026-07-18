# DSAR — Reconciliation Status (enum) (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§58 RECONCILIATION_STATUS enum(정합 대조 결과 분류):
MATCH / DEFINITION_VERSION / CHAIN_VERSION / STAGE_INSTANCE / LEVEL_INSTANCE / STEP_INSTANCE / SEQUENCE / DEPENDENCY / CURSOR / MULTIPLE_ACTIVE_STATE / STAGE_CHILD_STATE / LEVEL_CHILD_STATE / WORK_ITEM_STATE / ASSIGNMENT_STATE / CLAIM_STATE / DECISION_REFERENCE / COMPLETION_EVENT / SNAPSHOT / TRANSITION_HISTORY / IDEMPOTENCY / LOCK_LEASE / WORKFLOW_ENGINE / BPMN_STATE / ERP_STATE / LEGACY_STATE_MISMATCH / MANUAL_REVIEW / BLOCKED.

- `MATCH` = 정합 일치(무Drift). 나머지 24종 `*_MISMATCH` 계열 = 각 비교축의 Drift 종류. `MANUAL_REVIEW`/`BLOCKED` = 자동 교정 불가 종결.

## 2. 기존 구현 대조

- **이 enum 을 담을 reconciliation 레코드가 실존하지 않는다**: §57 Reconciliation 자체가 ABSENT 이므로 결과 분류 enum 도 실체 없음.
- 실존 상태 문자열(catalog_writeback_job `Catalog.php:80`·admin_growth_approval `AdminGrowth.php:146`·mapping_change_request `Mapping.php:287`)은 모두 **단일 진실원**의 자유형/파생 status 로, "Canonical↔파생 Drift" 라는 대조 결과 축이 아예 없다 — MATCH/MISMATCH 개념 부재.
- `CURSOR`·`MULTIPLE_ACTIVE_STATE`·`SNAPSHOT`·`TRANSITION_HISTORY`·`IDEMPOTENCY`·`LOCK_LEASE` Drift 는 각각 Cursor(§45)·Snapshot(§52)·Transition Instance(§20)·범용 Idempotency(§48)·Lock/Lease(§46/47) 실존을 전제하나 전부 ABSENT/PARTIAL — 판정할 대상이 없음.
- `WORKFLOW_ENGINE`/`BPMN_STATE`/`ERP_STATE` Drift = 외부 워크플로 엔진 ABSENT 전무 → 비교 불가.
- ★ "status 컬럼 존재 ≠ Reconciliation 결과 상태"(키트 규율 2·6): 자유문자열 status 는 이 27종 대조결과 enum 의 실존 근거가 아니다.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §57 Reconciliation(부모) 부재 · 대조 좌/우변인 Definition/Instance·Stage/Level/Step·Cursor·Snapshot·Assignment/Claim/Decision 전부 선행 필수
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **순신규 enum**. 어떤 레거시 status 문자열도 이 27종으로 캐스팅 금지 — Drift 분류는 "두 진실원 대조"에서만 파생되며 단일 status 에는 정의되지 않는다.
- **결정론 강제**: 각 비교축(§57 comparison type)과 이 STATUS 는 1:1 파생 — reconcile 엔진이 비교축을 고정 매핑으로 산출하고 문자열 하드코딩 금지.
- **Critical 승격 경로**: `MULTIPLE_ACTIVE_STATE`·`CURSOR`·`WORK_ITEM_STATE`·`ASSIGNMENT_STATE`·`LEGACY_STATE_MISMATCH` 등은 §59 CRITICAL_GAP_POLICY 로, `MANUAL_REVIEW`/`BLOCKED` 은 진행 차단 + 수동 검토로 연결.
- **무후퇴**: MATCH 아닌 결과가 상태를 자동 덮어쓰지 못하게 §54 REPLAY/§42 RECOVERY 원칙 준수.
- **BLOCKED_PREREQUISITE**: §57 Reconciliation 및 선행 State Machine 신설 후.

관련: [[DSAR_APPROVAL_SEQUENTIAL_RECONCILIATION]] · [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
