# DSAR — Approval Decision Approve Action (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§16 APPROVE_ACTION.

검증 (원문 전사):
- Step Decision 가능
- APPROVE 권한
- Assignment / Claim / Lease 유효
- Authority(Resource / Action / Amount / Currency)
- Delegation
- Required Reason / Comment / Attachment
- Mandatory Validation
- 동일 Slot Terminal 없음
- Cursor

효과 (원문 전사):
- Decision Record `APPROVE`
- Slot Committed
- Step Completion Reference
- Assignment Completed
- Claim Completed / Released
- Lease Closed
- Work Item Completed
- `STEP_APPROVED` Event
- 다음 Step 직접활성 금지

## 2. 기존 구현 대조

APPROVE 액션은 **5개 이상 도메인에 실존**(코드 기반):
- `AdminGrowth::approvalDecide`(`Handlers/AdminGrowth.php:1289-1344`) — `approved` 화이트리스트(`:1321`).
- `Mapping::approve/apply`(`Handlers/Mapping.php:238-331`) — Maker-Checker·`approvals_json`. decide(`:287`)→apply(`:327`) 2단계.
- `Alerting::decideAction/executeAction`(`Handlers/Alerting.php:572-655`) — decide(`:601`)→execute(`:655`). = **CANONICAL**.
- `Catalog::approveQueue`(`Handlers/Catalog.php:2383-2407`) — status='queued'(`:2397`).
- `AgencyPortal::approveAgency`(`Handlers/AgencyPortal.php:365-384`).
- 스텁: `routes.php:752,1868,1943-1998`.

실존 통제:
- **결정↔집행 2단계** 존재: Mapping approve→apply(`Mapping.php:287,327`)·Alerting decide→execute(`Alerting.php:601-655`). 단, 선언적 Effect Mapping이 아니라 절차적 분리.
- **Tenant Guard** 실재: `index.php:404-420` · `Alerting.php:580-582`.
- Maker-Checker(`Mapping.php:238-331`) = **VALIDATED_LEGACY**.

부재:
- Action Definition→Effect Mapping→Outcome 3계층 = **ABSENT**(직접 status UPDATE `Alerting.php:594`·`AdminGrowth.php:1330`·`Catalog.php:2383`). 효과가 코드에 하드코딩.
- **불변 Decision Record / Slot Committed** = 부재 → 자기 레코드 in-place UPDATE로 승인 표현. Commit/Snapshot 없음.
- Assignment Completed·Claim Completed/Released·Lease Closed·Work Item Completed·`STEP_APPROVED` Event = **부재**(선행 Assignment §3.3·Sequential §3.2·이벤트 인프라 없음).
- Authority(Amount/Currency)·Delegation 검증 = 정적 RBAC(§3.4)만, 결정 결합 부재.

## 3. 판정

- Verdict: **PARTIAL** (5도메인 실존 · Alerting decide/execute=CANONICAL · Mapping=VALIDATED_LEGACY · 단 Effect Mapping/불변 Record 없음)
- 선행 의존: §3.1 Decision Core(불변 Record/Slot/Commit) · §3.2 Sequential(Step Completion/Event) · §3.3 Assignment(Completed) · §3.4 Authority/Delegation(Amount/Currency) — 효과 절반이 여기에 막힘.
- cover: **액션 실행 존재(5+ 도메인)** · **Effect Mapping·불변 Commit·Assignment/Claim/Lease/Event 효과 = 0**.

## 4. 확장/구현 방향 (설계)

- Golden Rule=Extend: `Alerting::decideAction/executeAction`(`Alerting.php:572-655`) 2단계 분리를 **정본 결정↔집행 골격**으로 승격. `Mapping` Maker-Checker(`Mapping.php:238-331`)의 approvals_json은 다자 승인 참조 구현으로 보존.
- 신규는 효과의 **선언화**에 한정: 하드코딩된 status UPDATE를 Action Definition→Effect(§13)→Outcome(§14) 매핑으로 이전. Action↔Outcome 1:1 하드코딩 금지(Versioned Mapping).
- 불변 Commit 도입: 자기 레코드 in-place UPDATE를 **불변 Decision Record + Slot Committed**로 교체(무후퇴 — 기존 status 컬럼은 파생 뷰로 유지). Snapshot(§52)·Evidence(§53) 필수.
- Mandatory Control: `동일 Slot Terminal 없음`·Idempotency(§51)로 이중 승인 차단. **다음 Step 직접활성 금지** — 승인은 `STEP_APPROVED` 이벤트만 발행하고 진행은 Sequential Engine(§47)에 위임.
- 실위험: `Alerting` decide(`:601`)↔execute(`:655`)가 비원자·무아웃박스 — Slot Commit과 집행을 Transaction Boundary 안으로 흡수, 부분 승인 방지.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
