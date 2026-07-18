# DSAR — Audit Event (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§65 AUDIT_EVENT — 순차 승인 상태머신이 방출하는 표준 감사 이벤트 타입 집합:

APPROVAL_SEQUENTIAL_REGISTRY_CREATED · POLICY_CREATED · DEFINITION_CREATED · VERSION_CREATED · INSTANCE_CREATED · INSTANCE_INITIALIZED · STAGE_CREATED / STAGE_ACTIVATED · LEVEL_CREATED / LEVEL_ACTIVATED · STEP_CREATED / STEP_ACTIVATED · ASSIGNMENT_REQUESTED / ASSIGNMENT_LINKED · DECISION_REFERENCE_RECEIVED · STEP_COMPLETED / STEP_SKIPPED · LEVEL_COMPLETED / LEVEL_SKIPPED · STAGE_COMPLETED / STAGE_SKIPPED · NEXT_STEP_RESOLVED / NEXT_LEVEL_RESOLVED / NEXT_STAGE_RESOLVED · PAUSED / RESUMED / SUSPENDED / BLOCKED · RETRY_STARTED / RECOVERY_STARTED · RECOVERY_COMPLETED · ORPHAN_DETECTED / DEADLOCK_DETECTED / DUPLICATE_EVENT / DUPLICATE_TRANSITION / CURSOR_DRIFT / CONFLICT_DETECTED · SNAPSHOT_CREATED · SIMULATION_STARTED / SIMULATION_COMPLETED · RECONCILIATION_STARTED / RECONCILIATION_COMPLETED · MANUAL_REVIEW_REQUESTED.

★원칙: 모든 상태 생성·전이·완료·스킵·일시정지·차단·복구·탐지·스냅샷·시뮬레이션·정합·수동검토가 감사 이벤트로 append-only 기록된다.

## 2. 기존 구현 대조

- **이 감사 이벤트를 방출할 상태머신 부재**: 나열된 이벤트가 지목하는 생명주기(Registry~Reconciliation) 전 계층이 §GROUND_TRUTH 상 ABSENT — 방출 지점이 없다.
- **하드코딩 전이의 감사 흔적은 파편적**: catalog_writeback_job·admin_growth_approval·mapping_change_request 는 status 최종값과 일부 처리 로그만 남기며, `STAGE_ACTIVATED`·`NEXT_STEP_RESOLVED`·`CURSOR_DRIFT`·`ORPHAN_DETECTED` 같은 다단·탐지 이벤트를 방출하지 않는다(해당 계층 부재).
- **★단, 감사 무결 substrate 는 실존**: `SecurityAudit::verify`(`SecurityAudit.php:56-68`)는 감사 체인 검증 로직으로 **실재**한다. 이는 §65 이벤트를 tamper-evident append-only 로 담을 때 **재사용 가능한 substrate** 다.
  - 주의(MEMORY 정정 289차 116편): `menu_audit_log.hash_chain` 은 체인 쓰기만 실재하고 verify() 커버 0·preimage ts 소실로 **tamper-evident 아님**(장식). 감사 무결 정본은 어디까지나 `SecurityAudit::verify`(`SecurityAudit.php:56-68`) 이며, 감사 이벤트 신설 시 이 검증 경로에 편입해야지 hash_chain 을 진실원으로 삼으면 안 된다.

## 3. 판정

- Verdict: **ABSENT** (이벤트 방출 계층 부재 · 감사 무결 substrate `SecurityAudit.php:56-68` 만 재사용 가능)
- 선행 의존: 전 계층 상태머신(Registry~Reconciliation)·Transition·Cursor·탐지기 신설이 선결
- cover: **0** (SecurityAudit verify 는 substrate 일 뿐 §65 이벤트 셋 커버 아님)

## 4. 확장/구현 방향 (설계)

- **순신규 이벤트 셋 · append-only**: §65 타입을 단일 상수 카탈로그로 정의, 전 상태 전이/탐지/스냅샷 지점이 동일 계약으로 방출.
- ★**감사 체인 재사용(Extend)**: tamper-evident 저장은 `SecurityAudit::verify`(`SecurityAudit.php:56-68`) 체인 검증을 substrate 로 확장 — 새 검증기 난립 금지, `menu_audit_log.hash_chain` 류 미검증 장식 체인 재사용 금지.
- **Evidence 연계**: 각 Audit Event 는 §64 Evidence 와 audit reference 로 상호 연결하되, 저장금지(Credential/PII/Body/Secret/HR) 항목은 이벤트 payload 에도 담지 않음.
- **탐지 이벤트 배선 우선순위**: `CURSOR_DRIFT`·`DUPLICATE_TRANSITION`·`ORPHAN_DETECTED`·`DEADLOCK_DETECTED`·`CONFLICT_DETECTED` 는 각 탐지기(§43/44/56)·Fencing(§49)·Cursor(§45) 신설과 동시 배선 — 현재 부재가 stale/중복 실위험.
- **무후퇴**: 기존 하드코딩 전이 통합(§67 CONSOLIDATION) 시에도 과거 감사 흔적 유실 없이 이관.
- **BLOCKED_PREREQUISITE**: 선행 5군 + 상태머신 전 계층 신설 후.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EVIDENCE]] · [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
