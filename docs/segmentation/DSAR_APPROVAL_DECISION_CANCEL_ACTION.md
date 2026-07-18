# DSAR — Cancel Action (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§26 CANCEL_ACTION** — 검증:
Cancel 권한 · Scope 허용 · Committed Record 미삭제 · 취소불가 Settlement/Payment 아님 · External Commitment/Financial Posting/Legal Hold/Downstream 확인 · Compensation Reference · Reason 필수 · 고위험 추가승인.

**효과**: 대상 Cancelled Reference · Pending Assignment Cancel/Release · Claim·Lease 종료 · Future Work Item 차단 · Existing Record 유지 · Cancellation Reference Event.

(경계 규정: §28 CANCEL_WITHDRAW_BOUNDARY — CANCEL=관리자/시스템/권한자·운영종료·Command~Workflow 범위·기존결정 유지·Administrative Authority·Compensation.)

## 2. 기존 구현 대조

- **결정(decision) Cancel 액션 부재**(§GROUND_TRUTH: CANCEL=승인도메인 no hits).
- ★혼동 배제(코드 기반): 리포의 `cancel` 은 전부 **구독/결제 취소**다 — `routes.php:979`·`routes.php:1198`(subscription/billing cancel). 이는 상거래 계약 취소이지, 진행 중 승인 결정/워크플로를 관리적으로 종료하는 Decision Cancel 이 아니다. 이름 기반 매칭 금지(규율 2).
- `Cancel 권한`·`Scope 허용`·`Compensation Reference`·`Committed Record 미삭제` 보장·`Cancellation Reference Event` 를 갖춘 자산 → **no hits**.
- Committed Decision Record 자체가 부재(§3.1 Decision Core ABSENT·in-place UPDATE `Alerting.php:594`·`AdminGrowth.php:1330`·`Catalog.php:2383`) — "Committed Record 미삭제" 를 보장할 불변 레코드가 없다.

## 3. 판정

- **Verdict: ABSENT · BLOCKED_PREREQUISITE**.
- 선행 의존: **§3.1 Decision Core**(취소 대상 Command/Instance/Record·불변 유지)·**§3.3 Assignment**(Pending Assignment Cancel/Release·Claim/Lease 종료, ABSENT). 취소가 손댈 Runtime 상태(assignment/claim/lease/future work item)가 존재하지 않는다.
- cover: **0** (`routes.php:979,1198` 은 구독/결제 취소로 cover 아님).

## 4. 확장/구현 방향 (설계)

- Decision Cancel 은 **관리적 운영 종료** — 요청자 자기회수(Withdraw, §27)와 구분(§28 경계). 관리자/권한자가 진행 중 Command~Workflow 를 종료하되 **기존 Committed 결정은 유지**하고 Future Work Item 만 차단.
- **비가역 효과 게이트(Mandatory Control)**: `취소불가 Settlement/Payment 아님`·`Financial Posting/Legal Hold/External Commitment/Downstream 확인` 을 통과해야 Cancel 허용 — 정산/결제 확정 이후 취소 시 반드시 `Compensation Reference`(보상 트랜잭션) 요구. 고위험은 추가승인.
- `Reason 필수` — 관리적 취소 사유 taxonomy(§18 계열)로 기록(현행 REJECT 사유조차 없는 `AdminGrowth::approvalDecide :1319-1331` 대비 강화). Committed Record 삭제 금지(무후퇴·기존결정 보존).
- 재사용: Assignment/Claim/Lease 종료 매핑(§45·§46)·취소 이벤트는 `SecurityAudit::verify`(`:56-68`)·outbox 패턴. Tenant Guard(`index.php:404-420`)로 타 테넌트 결정 취소 IDOR 차단.
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_CANCEL_SCOPE]] · [[DSAR_APPROVAL_DECISION_WITHDRAW_ACTION]] · [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
