# DSAR — Decision Reconciliation Foundation (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**RECONCILIATION_FOUNDATION (§57)** — 비교 축(원문 전사):
Command↔Record · Record↔History/Snapshot/Audit/Outbox/Sequential Completion Reference · Actor↔Assignment/Delegation/Authority · Claim↔Lease · Slot↔Committed Record · State↔Commit Result · Idempotency↔Record · Lock/Fencing↔Commit · Sequential Step↔Record · Workflow/BPMN/ERP/Legacy↔Record.

필드: `reconciliation_id` · instance/command/record id · comparison type · source/canonical state · difference · severity · detected_at · resolution · resolved_by/at · status · evidence.

**RECONCILIATION STATUS (§58)**: `MATCH` / `COMMAND_RECORD_MISMATCH` / `RECORD_HISTORY_MISMATCH` / `RECORD_SNAPSHOT_MISMATCH` / `RECORD_AUDIT_MISMATCH` / `RECORD_OUTBOX_MISMATCH` / `SEQUENTIAL_REFERENCE_MISMATCH` / `ACTOR_ASSIGNMENT_MISMATCH` / `ACTOR_DELEGATION_MISMATCH` / `ACTOR_AUTHORITY_MISMATCH` / `CLAIM_LEASE_MISMATCH` / `DECISION_SLOT_MISMATCH` / `DECISION_STATE_MISMATCH` / `IDEMPOTENCY_MISMATCH` / `LOCK_FENCING_MISMATCH` / `SEQUENTIAL_STEP_MISMATCH` / `WORKFLOW_ENGINE_MISMATCH` / `BPMN_MISMATCH` / `ERP_MISMATCH` / `LEGACY_STATUS_MISMATCH` / `MANUAL_REVIEW` / `BLOCKED`.

## 2. 기존 구현 대조

- **전면 부재 (ABSENT).** Reconciliation 은 §GROUND_TRUTH 개념별 판정에서 ABSENT. `reconciliation_id`·comparison type·drift 검출·resolution 을 갖는 대사(對査) 엔티티/경로는 존재하지 않는다.
- **비교 대상 자체가 부재**: §57 이 비교하려는 양변(Command·Record·History·Snapshot·Outbox·Sequential Completion Reference·Assignment·Delegation·Authority·Claim·Lease·Lock·Fencing) 중 다수가 ABSENT. 현행 결정은 단일 UPDATE(Mapping:288·AdminGrowth:1330·Alerting:594·Catalog:2397)로 status 만 뒤집을 뿐, 불변 Record 도 Outbox 도 없으므로 **대사할 두 진실원이 애초에 없다**.
- 인접 참조: `omni_outbox` claim/lease/SKIP LOCKED(`Omnichannel.php:390-448`)는 Outbox/Lock/Lease 설계원형(KEEP_SEPARATE)이나 결정 도메인 대사가 아니다. Alerting 의 비원자 집행(:631 AdAdapters::pause + :653 UPDATE)은 오히려 **Validation↔Commit·Record↔External 간 drift 를 낳는 구조**(§51 Drift)로, Reconciliation 이 필요한 이유를 방증할 뿐 그 구현이 아니다.

## 3. 판정

- Verdict: **ABSENT** (선행 부재 의존 → 실질 **BLOCKED_PREREQUISITE**)
- 선행 의존: §57 은 Record(§35)·History(§36)·Snapshot(§54)·Outbox(§46)·Sequential Completion Reference(§49)·Assignment(§3.4)·Delegation(§3.3)·Authority(§3.2)·Lock/Fencing(§41/§43) 을 양변으로 비교한다. 이들이 모두 ABSENT 이므로 Reconciliation 은 **선행 6군 + 결정 코어 신설 이후에만** 성립.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **순신규 엔티티** — 실존 대응 자산 없음.
- **`omni_outbox` 의 claim/lease/SKIP LOCKED 패턴(`Omnichannel.php:390-448`)** 을 Reconciliation Worker 의 안전한 스캔·클레임 골격으로 참조(KEEP_SEPARATE — 결정 도메인 별도 인스턴스). 중복 워커 엔진 난립 금지.
- **선행 순서 강제**: Record·History·Snapshot·Outbox·Sequential Completion Reference 가 §48 Transaction Boundary 안에서 원자 생성된 뒤라야 §57 comparison(Record↔History/Snapshot/Outbox …)이 의미를 가진다. Reconciliation 은 코어의 **최후단 무결 검증**이지 선행이 아니다.
- **Mandatory Control**: drift 검출(§58 …_MISMATCH) 시 자동 수정 금지 — resolution=`MANUAL_REVIEW`/`BLOCKED` fail-closed. §53 Recovery 원칙(기존 Record 수정 없이 누락 side-effect 복구)과 정합.
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
