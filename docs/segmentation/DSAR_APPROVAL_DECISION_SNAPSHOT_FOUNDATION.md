# DSAR — Decision Snapshot Foundation (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**SNAPSHOT_FOUNDATION (§54)** — 필수 필드:
- `snapshot_id` · snapshot type · instance/command/record id
- 캡처 대상 상태 묶음: request/case/workflow/chain/sequential version · stage/level/step instance · cursor · work item · assignment · claim · lease · actor identity · role assignment · position incumbency · authority · delegation · legal entity · organization · resource snapshot · action type · amount · currency · security · SoD/CoI result · validation/commit result · lock snapshot · fencing token · idempotency snapshot
- `effective_at`/`captured_at` · `immutable_hash` · status · evidence

**SNAPSHOT TYPE (§54)**: `COMMAND_RECEIVED` / `VALIDATION_STARTED` / `VALIDATION_COMPLETED` / `COMMIT_REQUESTED` / `COMMIT_STARTED` / `DECISION_COMMITTED` / `COMMIT_FAILED` / `DUPLICATE_DETECTED` / `REPLAY_BLOCKED` / `CONFLICT` / `RETRY` / `RECOVERY` / `RECONCILIATION` / `SIMULATION` / `AUDIT_RECONSTRUCTION`.

★ 핵심 원칙: Snapshot 은 **결정 시점(Decision-time)의 전 상태를 불변 해시로 고정**한 것이다. 요청 시점(Request-time)에 담아둔 payload 는 Snapshot 이 아니다.

## 2. 기존 구현 대조

- **불변 Decision Snapshot 엔티티 = 전면 부재.** 선행 6군 판정에서 Snapshot 은 ABSENT(§GROUND_TRUTH 개념별 판정). `snapshot_id`·`immutable_hash`·`captured_at` 을 갖는 결정 스냅샷 테이블/생성 경로는 존재하지 않는다.
- **혼동 주의 — `payload_json` 은 Snapshot 이 아니다.** `AdminGrowth::approvalDecide`(:1313-1344)가 참조하는 `payload_json`(:1294)은 **승인 요청 등록 시점에 저장된 요청 스냅샷**이다. 결정(approve/reject) 시점의 actor·authority·delegation·assignment·resource·version 전 상태를 캡처한 Decision-time Snapshot 이 **아니다**. 결정은 단일 UPDATE(:1330)로 status/decided_by 만 뒤집을 뿐, 그 순간의 컨텍스트를 불변으로 고정하지 않는다.
- `Mapping::approve`(:238-293) 역시 approvals_json(:273) append + 단일 UPDATE(:288)뿐 — 결정 시점 상태 캡처 없음. `Alerting`·`Catalog` 도 동일하게 UPDATE 후 side-effect 만 있고 Snapshot 부재.
- 인접 재사용 후보: `SecurityAudit::verify`(`SecurityAudit.php:56-68`)는 감사 무결 정본이나 **상태 스냅샷이 아니라 감사 체인 검증**이며, Snapshot 이 요구하는 `immutable_hash` 를 감은 전(全) 결정 상태 캡처와는 축이 다르다.

## 3. 판정

- Verdict: **ABSENT** (선행 부재 의존 → 실질 **BLOCKED_PREREQUISITE**)
- 선행 의존: §3.1 Approval(chain/workflow 부재)·§3.4 Assignment·§3.5 Sequential 이 ABSENT 이므로, 스냅샷이 캡처해야 할 assignment/sequential/authority/delegation 상태 자체가 존재하지 않는다. Snapshot 은 이들 선행 6군이 신설된 뒤에만 의미를 갖는다.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **순신규 엔티티** — 실존 대응 자산 없음. `payload_json`(요청 스냅샷)을 Decision Snapshot 으로 재해석·재사용 금지(요청≠결정 시점, 가짜녹색 회피).
- **Mandatory Control**: Snapshot 은 §48 Transaction Boundary 7단계에서 Record·History 와 **동일 트랜잭션 내** 생성되어야 한다. 현행 4핸들러는 트랜잭션 없음(Mapping TOCTOU :287, Alerting 비원자 :631/:653)이므로, 원자 Commit 골격(§33) 신설이 선행 조건.
- `immutable_hash` 는 `SecurityAudit::verify`(:56-68)가 확립한 감사 무결 해시 패턴을 **일반화**하여 재사용 — 신규 해시 엔진 난립 금지(Golden Rule = Extend).
- 무후퇴: 신설 Snapshot 은 기존 Mapping 정족수 승인·AdminGrowth·Catalog·Alerting 경로를 대체하지 않고 side-effect 로 부가.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
