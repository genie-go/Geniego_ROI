# DSAR — Approval Decision Instance (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§12 INSTANCE 필수 필드:
- `instance_id` · `tenant_id`
- `approval_request_id/version` · `case_id/version` · `item_id` · `requirement_id` · `work_item_id` · `assignment_id` · `sequential_instance_id`
- `stage/level/step instance id`
- `decision definition/version id`
- `decision slot id`
- `current decision state`
- `active command id`
- `committed decision record id`
- `instance version`
- `created/committed/completed/cancelled_at`
- `status` · `evidence`

## 2. 기존 구현 대조

- **결정 인스턴스(Instance) 자산 부재.** 현행에서 "인스턴스"에 대응하는 실체는 **승인 요청 행 그 자체**일 뿐, 상태·명령·레코드를 분리 추적하는 Instance 계층이 없다:
  - `AdminGrowth::approvalDecide` — pending 행을 직접 UPDATE(`Handlers/AdminGrowth.php:1330`), 이미처리 409(`:1327`). 즉 요청 행 = 상태 그 자체이며 `active command id`/`committed decision record id`/`instance version`을 분리 보관하지 않는다.
  - `Mapping::approve` — approvals_json에 append 후 단일 UPDATE(`Handlers/Mapping.php:288`). 결정 상태가 컬럼 하나에 융합, Instance-Command-Record 3분리 없음.
  - `Catalog::approveQueue` — bulk status UPDATE(`Handlers/Catalog.php:2397`), 인스턴스 개념 자체 없음.
- 필드 대조:
  - `current decision state`·`active command id`·`committed decision record id`·`instance version` → **no hits**(Command/Record가 in-place UPDATE로 혼합됨).
  - `sequential_instance_id`·`stage/level/step instance id` → 선행 Sequential ABSENT(`AgencyPortal.php:381,400` 하드코딩 flip).
  - `decision definition/version id`·`decision slot id` → §9/§10/§13 부재로 참조 대상 없음.

## 3. 판정

- Verdict: **ABSENT** ("인스턴스" = 요청 행)
- 선행 의존: §9 Definition·§10 Version·§13 Slot 참조 부재. 나아가 §12 Instance는 Command(§14)/Record(§35)와의 3분리를 전제하나 현행은 요청 행 하나에 상태·명령·레코드가 융합(§66 "Command·Record 혼합" 항목 정면 해당).
- cover: **0**

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_instance` — 하나의 승인 대상(request/case/work item)에 대한 결정 수명주기의 앵커. Instance는 상태(`current decision state`)만 보유하고, 실제 명령은 Command(§14)로, 확정 사실은 불변 Record(§35)로 분리(3분리 원칙).
- `instance version`으로 Optimistic Concurrency(§44) — Expected Version 불일치 시 자동 Commit 금지→Revalidation(현행 TOCTOU `Mapping.php:288` 무트랜잭션 UPDATE의 근본 해소).
- `committed decision record id`는 동일 Slot(§13) 단일 Committed 불변식과 결합 — Sequential 단일승인 시 동일 Slot에 단 하나의 Record만.
- 무후퇴: 기존 요청-행-직접-UPDATE 동작(AdminGrowth/Mapping/Catalog)을 Instance 하위로 승격하되 기능 회귀 0(§70). 요청 행은 Instance가 참조하는 비즈니스 대상으로 잔존하고, 결정 상태 소유권만 Instance로 이관.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
