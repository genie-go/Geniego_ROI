# DSAR — Action Audit Event (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§54 ACTION_AUDIT_EVENT (이벤트 종류 전사)

`REGISTRY_CREATED` / `DEFINITION_CREATED` / `VERSION_CREATED` · `CAPABILITY_EVALUATED` · `VALIDATION_STARTED` / `VALIDATED` / `VALIDATION_FAILED` · `APPROVED` / `REJECTED` / `RETURNED` / `CHANGES_REQUESTED` / `CANCELLED` / `WITHDRAWN` / `RESUBMITTED` / `ACKNOWLEDGED` / `DEFERRED` / `ABSTAINED_REFERENCE` · `REASON_SELECTED` · `COMMENT_RECORDED` · `ATTACHMENT_VALIDATED` / `ATTACHMENT_REJECTED` · `RETURN_TARGET_RESOLVED` · `CHANGE_REQUEST_CREATED` · `CHANGE_REQUEST_ITEM_RESOLVED` · `RESUBMISSION_PACKAGE_CREATED` · `ACTION_CONFLICT_DETECTED` · `SNAPSHOT_CREATED` · `RECONCILIATION_REQUIRED` · `SIMULATION_STARTED` / `SIMULATION_COMPLETED` · `MANUAL_REVIEW_REQUESTED`.

## 2. 기존 구현 대조

- 코드 기반 판정 **ABSENT** — 범용 audit 기록 substrate는 편재하나(핸들러별 `self::audit(...)`, 예 `Handlers/Mapping.php:328` "mapping_apply"), §54가 규정하는 **Action Audit Event 타입 체계**(28+ 이벤트 enum·capability/validation/conflict/snapshot/reconciliation/simulation 단계별)는 부재.
- 실존(무결성 검증 정본):
  - `SecurityAudit::verify()`(`:56,64`) — hash-chain 무결성 검증의 **정본**. audit event의 tamper-evidence는 이 verify가 담당(쓰기만으로는 tamper-evident 아님).
  - Tenant Guard 로깅 근거(`index.php:404-420` · `Alerting.php:580-582`).
- 부재/미구현:
  - `CAPABILITY_EVALUATED`·`VALIDATION_STARTED/VALIDATED/FAILED`·`RETURN_TARGET_RESOLVED`·`CHANGE_REQUEST_*`·`RESUBMISSION_PACKAGE_CREATED`·`ACTION_CONFLICT_DETECTED`·`SNAPSHOT_CREATED`·`RECONCILIATION_REQUIRED`·`SIMULATION_*`·`MANUAL_REVIEW_REQUESTED` → **no hits**. 이들 이벤트가 지시하는 선행 단계(능력평가·검증·충돌·스냅샷·재조정·시뮬레이션) 자체가 ABSENT.
  - `APPROVED`/`REJECTED`는 status UPDATE에 융합(`Mapping.php:262` · `AdminGrowth.php:1330`)될 뿐, 정규화된 audit event 타입으로 발행되지 않음. `RETURNED`/`CANCELLED`/`WITHDRAWN`/`RESUBMITTED`/`ACKNOWLEDGED`/`DEFERRED` 는 액션 자체가 부재(승인 도메인).
  - 현행 `self::audit`는 자유형 문자열 event name(예 `Mapping.php:328`)이라 §54 enum 스키마·순서·완전성 보장 없음.

## 3. 판정

- Verdict: **ABSENT** (범용 audit substrate 편재 · Action Event 타입 체계 부재)
- 선행 의존: §54 이벤트 대부분이 §11 Capability·§12 Eligibility·§50 Conflict·§52 Snapshot·§55 Reconciliation·§57 Simulation 단계 발생을 전제 — 전부 ABSENT. §3.6 Identity/Security(`SecurityAudit::verify:56,64`)만 PRESENT하여 event 무결성 정본으로 재사용 가능.
- cover: **범용 audit + verify 정본 존재**(`SecurityAudit::verify:56,64` · `Mapping.php:328`) · **§54 Action Event 타입 = 0**.

## 4. 확장/구현 방향 (설계)

- 확장 기반(Golden Rule = Extend): 산재한 `self::audit(...)`(예 `Mapping.php:328`) 자유형 로깅을 **§54 enum 스키마로 정규화** — 신규 audit 엔진 신설 금지, 기존 `SecurityAudit` chain 위에 event type 컬럼을 얹어 확장.
- Mandatory Control(정본): audit event의 신뢰는 chain 존재가 아니라 `SecurityAudit::verify()`(`:56,64`) 통과로 성립 — event 조회/증거 제출 시 verify 결과 동반 필수(장식적 hash-chain 금지, 289차 정정 재확인).
- 완전성(No-Gap): APPROVE/REJECT뿐 아니라 `CAPABILITY_EVALUATED`·`VALIDATION_*`·`ACTION_CONFLICT_DETECTED`·`SNAPSHOT_CREATED`·`RECONCILIATION_REQUIRED`·`MANUAL_REVIEW_REQUESTED`까지 발행 — 단, 이는 각 선행 단계(§11·§50·§52·§55)가 구현된 후에만 의미가 있으므로 **BLOCKED_PREREQUISITE**.
- 실위험: 현행 `APPROVED`가 status UPDATE에 융합돼 감사 이벤트로 분리 발행되지 않음 → 승인 이력 재구성(AUDIT_RECONSTRUCTION §52) 불가. 액션 확정과 audit event 발행을 동일 Transaction Boundary에 묶어 부분 누락 방지.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
