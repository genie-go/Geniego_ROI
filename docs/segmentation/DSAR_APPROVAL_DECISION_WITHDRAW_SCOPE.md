# DSAR — Withdraw Action / Withdraw Scope (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§27 WITHDRAW_ACTION / WITHDRAW_SCOPE — Withdraw Actor enum (원문 전사):
`ORIGINAL` / `CURRENT_REQUESTER` / `ORIGINAL_SUBMITTER` / `RESOURCE_OWNER` / `AUTHORIZED_PROXY` / `ADMINISTRATIVE_ACTOR` / `SYSTEM_REFERENCE`.

§27 검증(Validation) 필수:
- Actor = 요청자 / 대리인(Authorized Proxy) 여부
- Case Withdraw 가능 상태
- 비가역 외부효과 없음 (Final Payment / Settlement / Contract 아님)
- Withdrawal Deadline
- Reason 필수
- Concurrent Conflict 없음
- Lock / Fencing
- Compensation / Cleanup 참조

§27 효과(Effect):
- Case Withdrawn
- Pending Work Item Cancelled
- Assignment / Claim / Lease 종료
- Existing Decisions 유지 (기존 결정 미삭제)
- Withdrawal Reference Event

## 2. 기존 구현 대조

- 승인 도메인의 `WITHDRAW` 액션 = **부재**. §GROUND_TRUTH "RETURN/CANCEL/WITHDRAW/RESUBMIT/ACKNOWLEDGE/DEFER/ABSTAIN=승인도메인 ABSENT" 확정.
- 코드베이스의 "withdraw"류 hit = **GDPR 데이터 회수(Dsar)** 계열뿐 — 승인 결정 회수가 아니라 개인정보 삭제/익명화 도메인(`Handlers/Dsar.php:89-97`, `Dsar.php:765` = PII redaction/anonymize). 이는 §27 Withdraw Actor(요청자 회수)와 개념·대상이 다름 → 승인 Withdraw로 재사용 불가.
- Withdraw Actor enum 7종(`ORIGINAL`…`SYSTEM_REFERENCE`)을 데이터로 선언하는 구조 → **no hits**.
- 전제인 **Case 엔티티 / Decision Core(불변 Record/Slot/Commit)** 자체가 부재(§3.1 Decision Core ABSENT — in-place UPDATE `Alerting.php:594`·`AdminGrowth.php:1330`·`Catalog.php:2383`). "Case Withdrawn·Existing Decisions 유지"를 성립시킬 불변 결정 이력이 없다.

## 3. 판정

- Verdict: **ABSENT** (실행상 BLOCKED_PREREQUISITE)
- 선행 의존: §3.1 Decision Core(불변 Case/Record·Withdrawn 상태 전이 대상) · §3.2 Sequential(Pending Work Item 종료 대상) · Assignment/Claim/Lease(§3.3 ABSENT) — 셋 다 부재. Withdraw는 "기존 결정 유지 + Case만 회수"라는 이력 보존을 요구하나, 현행은 in-place UPDATE라 회수 시 이력이 남지 않음.
- cover: **0** (승인 도메인 Withdraw·Actor enum·Case Withdrawn 이벤트 전무. GDPR Dsar는 별도 도메인).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_withdraw` — Withdraw Actor enum 7종을 데이터 선언. GDPR `Dsar` 회수 로직과 **명명·도메인 분리**(중복 엔티티 금지: 개인정보 회수 ≠ 승인 요청 회수).
- Mandatory Control(무후퇴): **Existing Decisions 미삭제**. 선행 Decision Core의 불변 Record가 반드시 먼저 존재해야 함 → Decision Core 신설 전에는 구현 불가(BLOCKED_PREREQUISITE).
- 비가역 외부효과 게이트 = 실위험. Final Payment/Settlement 이후 Withdraw 금지 검증이 없으면 결제·계약 확정 후 회수로 정합성 붕괴. `routes.php:979,1198`(구독/결제 취소 경로)와의 상호배제를 §28 Boundary에서 규정.
- Actor 검증은 선행 Authority/Delegation(§3.4 ABSENT — 정적 RBAC만)에 의존. `AUTHORIZED_PROXY` 판정은 Delegation Foundation 신설 후에만 정직하게 성립.
- Concurrent Conflict/Lock/Fencing = 선행 Identity/Security Tenant Guard(`index.php:404-420`·`Alerting.php:580-582`) 재사용 가능.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
