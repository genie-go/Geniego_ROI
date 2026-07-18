# DSAR — Withdraw Action (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§27 WITHDRAW_ACTION** — ACTOR enum:
`ORIGINAL` / `CURRENT_REQUESTER` / `ORIGINAL_SUBMITTER` / `RESOURCE_OWNER` / `AUTHORIZED_PROXY` / `ADMINISTRATIVE_ACTOR` / `SYSTEM_REFERENCE`.

검증: Actor=요청자/대리인 · Case Withdraw 가능 · 비가역 외부효과 없음 · Final Payment/Settlement/Contract 아님 · Deadline · Reason · Concurrent Conflict 없음 · Lock/Fencing · Compensation/Cleanup.

**효과**: Case Withdrawn · Pending Work Item Cancelled · Assignment/Claim/Lease 종료 · Existing Decisions 유지 · Withdrawal Reference Event.

(경계 규정: §28 CANCEL_WITHDRAW_BOUNDARY — WITHDRAW=요청자/제출자·자기요청 회수·주로 Request/Case 범위·기존결정 유지·Request Ownership·Cleanup/Resubmit.)

## 2. 기존 구현 대조

- **결정(decision) Withdraw 액션 부재**(§GROUND_TRUTH: WITHDRAW=승인도메인 no hits).
- ★혼동 배제(코드 기반): 리포의 `withdraw` 은 **GDPR 동의 철회(consent withdrawal)** 계열이지, 요청자가 자기 승인요청을 회수하는 Decision Withdraw 가 아니다. 개인정보 처리동의를 거두는 프라이버시 행위이며(§GROUND_TRUTH: withdraw=GDPR 동의철회), 승인 Case 회수와 도메인·주체·효과가 전혀 다르다. 이름 기반 매칭 금지(규율 2).
- `ACTOR` 7종(ORIGINAL/CURRENT_REQUESTER/AUTHORIZED_PROXY 등) 검증·`Withdrawal Reference Event`·`Concurrent Conflict 없음`·`Lock/Fencing` 을 갖춘 자산 → **no hits**.
- 회수 대상 Case/Request ownership 을 판정할 요청자↔Case 연결 자체가 부재(§3.1 Decision Core ABSENT).

## 3. 판정

- **Verdict: ABSENT · BLOCKED_PREREQUISITE**.
- 선행 의존: **§3.1 Decision Core**(회수 대상 Case·Request Ownership·불변 Existing Decisions 유지)·**§3.3 Assignment**(Pending Work Item Cancelled·Assignment/Claim/Lease 종료, ABSENT). Withdraw 가 종료할 Runtime 상태가 없다.
- cover: **0** (GDPR 동의철회는 별 도메인이라 cover 아님).

## 4. 확장/구현 방향 (설계)

- Decision Withdraw 는 **요청자/제출자의 자기요청 회수** — 관리자 주도 Cancel(§26)과 명확히 구분(§28 경계). 주 범위는 Request/Case 이며 기존 Committed 결정은 유지, Cleanup/Resubmit 로 이어질 수 있다.
- **Actor 정당성 게이트(Mandatory Control)**: `Actor=요청자/대리인` 검증 — ORIGINAL/CURRENT_REQUESTER/ORIGINAL_SUBMITTER/AUTHORIZED_PROXY 만 자기 Case 회수 가능. 타인 Case Withdraw 는 IDOR — Tenant Guard(`index.php:404-420`) + Case Ownership 검증으로 봉쇄.
- **비가역 외부효과 게이트**: `Final Payment/Settlement/Contract 아님`·`비가역 외부효과 없음` 통과 시에만 허용, 아니면 Compensation/Cleanup 요구. `Concurrent Conflict 없음`·`Lock/Fencing` 으로 동시 결정과의 경합 차단.
- Withdraw 후 `Deadline` 내 Resubmit(§29) 가능 경로 설계 — Existing Decisions 삭제 금지(무후퇴).
- 재사용: 회수 이벤트 증거는 `SecurityAudit::verify`(`:56-68`) append-only·outbox 패턴(`omni_outbox`). GDPR withdraw 로직과는 코드 경로 분리(중복 엔진 금지이되 도메인 상이 — KEEP_SEPARATE).
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_CANCEL_ACTION]] · [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
