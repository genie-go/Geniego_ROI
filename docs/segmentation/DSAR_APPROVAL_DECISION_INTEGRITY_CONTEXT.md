# DSAR — Decision Integrity Context (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§12 INTEGRITY_CONTEXT 필수 필드 (원문 전사):
- `context id` · `tenant id`
- `decision instance id` · `decision slot id` · `decision record id` · `decision command id` · `decision commit id`
- `decision action type` · `decision version id` · `action version id`
- `approval request id` · `approval version id` · `approval case id` · `case version id` · `approval item id` · `requirement id`
- `work item id` · `assignment id` · `authority resolution id` · `delegation resolution id`
- `sequential instance id` · `stage id` · `level id` · `step id` · `cursor version`
- `actor subject id` · `legal entity id` · `organization id`
- `resource type` · `resource id` · `amount` · `currency`
- `event time` · `commit time` · `recorded time`
- `context version` · `context reference hash foundation`
- `status` · `evidence`

의미: Integrity Context는 원장 Append(§17 Entry)가 참조해야 할 **결정 실행 맥락 전체**(instance/slot/record/command/commit·action/version·approval case/item·work item/assignment/authority/delegation·sequential stage/level/step·actor/legal entity·resource/amount/currency·event/commit/recorded time)를 하나의 불변 스냅샷으로 묶는다. Entry의 Mandatory Reference(§18)의 원천이다.

## 2. 기존 구현 대조

- **무결성 컨텍스트 구조체는 부재** — `context id` 및 참조 대상 id 대부분이 실존하지 않는 상위 엔티티를 가리킨다.
- 선행 의존 대상의 전면 부재(§GROUND_TRUTH):
  - `decision instance/slot/record/command/commit id`·`decision action type`·`decision/action version id` → **§3.1 Decision Core ABSENT**(`approval_decision` 0·`Mapping.php:285-289,327` approvals_json in-place UPDATE·`Db.php:623,655` 테이블)·**§3.2 Actions ABSENT** → 참조 대상 자체가 없음.
  - `approval request/version/case/item/requirement id`·`work item/assignment/authority resolution/delegation resolution id`·`sequential instance/stage/level/step id`·`cursor version` → 선행 축(Approval/Work/Sequential) 부재 → **no hits**.
  - `actor subject id`·`legal entity id`·`organization id`·`resource type/id`·`amount`·`currency` → 원장 컨텍스트로 묶는 구조 부재.
  - `event/commit/recorded time` → 서버 UTC substrate(`Db.php:438`·`SecurityAudit.php:24`·`Mapping.php:285,315`)는 재사용 가능하나 3-time(event/commit/recorded) 분리 컨텍스트는 부재.
  - `context reference hash foundation` → SHA-256 substrate(`SecurityAudit.php:27`·`MediaHost.php:93`·`Migrate.php:50`)만 존재, 컨텍스트 해시 적용 없음.

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE** (§CONTRACTS 지정 — Decision Core 부재)
- 선행 의존: 컨텍스트가 참조하는 거의 모든 id가 §3.1 Decision Core·§3.2 Actions·§3.3 Runtime ABSENT 및 선행 Approval/Work/Sequential 축 부재에 종속. 참조 대상이 없어 컨텍스트 자체가 구성 불가.
- cover: **0** (컨텍스트 구조체 전무 · 참조 대상 상위 엔티티 전면 부재).

## 4. 확장/구현 방향 (설계)

- 선행 신설 필수(엄격): §3.1 Decision Core(decision instance/slot/record/command/commit)·§3.2 Action Definition·선행 Approval/Work/Sequential 축을 먼저 신설해야 컨텍스트가 실 id를 참조. 선행 부재 상태에서 컨텍스트 신설은 전면 허공 참조 — 착수 금지.
- 순신규 `decision_integrity_context` — 선행 완비 후, Entry(§17) Append의 Mandatory Reference(§18) 원천으로 결정 맥락 전체를 불변 스냅샷화.
- 재사용 substrate: 서버 UTC(`Db.php:438`·`SecurityAudit.php:24`)를 `event/commit/recorded time`의 시간원으로, SHA-256(`SecurityAudit.php:27`)을 `context reference hash foundation`으로 채택.
- 실위험: 컨텍스트 없이 Entry를 Append하면 §18 Reference Matrix의 필수 Reference 누락 → §56 Critical Gap. 컨텍스트를 Transaction Boundary(§38) 안에서 원자적으로 생성해 Committed-but-Ledger-Pending을 방지.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
