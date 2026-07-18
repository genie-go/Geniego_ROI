# DSAR — Approval Decision Reject Action (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§17 REJECT_ACTION.

검증 (원문 전사):
- REJECT 허용
- Scope 유효
- **Reason 필수**
- Comment / Attachment 정책
- Reject 권한
- Step State
- Terminal 없음
- **Return과 미혼동**
- Partial Approval Policy
- Financial / Legal / Compliance Control

효과 (원문 전사):
- Decision Record `REJECT`
- Reason Snapshot
- Rejected Completion Reference
- Assignment / Claim / Lease Closed
- `STEP_REJECTED` Event

Reason Policy(§18) enum(원문): `INSUFFICIENT_EVIDENCE` / `POLICY_VIOLATION` / `AUTHORITY_LIMIT_EXCEEDED` / `BUDGET_UNAVAILABLE` / `DUPLICATE_REQUEST` / `INVALID_AMOUNT` / `CURRENCY` / `CONTRACT` / `COMPLIANCE_FAILURE` / `LEGAL_RISK` / `SECURITY_RISK` / `FRAUD_RISK` / `CONFLICT_OF_INTEREST` / `MISSING_DOCUMENT` / `INCORRECT_INFORMATION` / `OUT_OF_SCOPE` / `EXPIRED_REQUEST` / `BUSINESS_NOT_JUSTIFIED` / `CUSTOMER·PARTNER·REBATE·CLAIM·PAYMENT_NOT_ELIGIBLE` / `CUSTOM`.

## 2. 기존 구현 대조

- REJECT는 **이진 파생으로만 실존**(코드 기반):
  - `Alerting.php:593` — decideAction의 else 분기(approve 아니면 reject).
  - `AdminGrowth.php:1321` — `rejected` 화이트리스트 값.
- 부재/미구현:
  - **Reason 필수** = 미충족. `AdminGrowth` 거절 사유 미입력(`AdminGrowth.php:1319-1331`) — 거절에 사유 코드가 결합되지 않음. `reason_code/rejection_reason` = **no hits**(§Reason ABSENT). 자유텍스트(`ReturnsPortal.php:36,324`)·Mapping note만 존재.
  - **Scope** = 없음(§17 REJECT_SCOPE 별도 문서 — 부분 거절 개념 부재).
  - **Return과 미혼동** = 통제 부재. Return 개념 자체가 ABSENT이라 경계선이 없음.
  - Reason Snapshot·Rejected Completion Reference·Assignment/Claim/Lease Closed·`STEP_REJECTED` Event = 부재(선행 Decision Core §3.1·Sequential §3.2·이벤트 인프라 없음).
  - Reason Policy(§18) 22종 taxonomy = 전무.
- 위험: `Alerting.php:593` else 폴백은 미지원 액션을 무음 reject로 오분류 — 명시적 REJECT 의도와 폴백 reject가 구별 불가.

## 3. 판정

- Verdict: **PARTIAL** (이진 파생 `Alerting.php:593` · scope/사유 없음)
- 선행 의존: Reason Registry/Definition(§35~38) 부재로 `Reason 필수` 불가 · §3.1 Decision Core(Reason Snapshot/Completion Reference) · §3.2 Sequential(`STEP_REJECTED` Event) · Return(§19) 부재로 `Return과 미혼동` 경계 미성립.
- cover: **REJECT 상태값 존재(2도메인)** · **Reason 필수·Scope·Snapshot·Event·Reason Policy = 0**.

## 4. 확장/구현 방향 (설계)

- Golden Rule=Extend: `AdminGrowth.php:1321` 화이트리스트를 REJECT 허용 검증 정본으로 승격. 반면 `Alerting.php:593` else 폴백 reject는 **최우선 제거** — 미지원 액션을 명시적 오류로 처리(무음 오분류가 승인 이력 오염, §58 UI-only/무음 위험).
- Mandatory Control: `Reason 필수` 강제 — Reason Policy(§18) 22종 taxonomy 신설 후 REJECT는 유효 Reason Code 없이는 커밋 불가. `AdminGrowth.php:1319-1331`의 사유 미입력 공백을 이 통제로 메움. Reason Snapshot(§37 당시 버전 고정)으로 사후 변조 차단.
- `Return과 미혼동` 경계 명문화: REJECT=Terminal(Assignment/Claim/Lease Closed·Rejected Completion), RETURN=비종결 재작업. 두 액션의 효과 매핑을 분리(§49 ACTION_COMPATIBILITY REJECT+RETURN 차단).
- Financial/Legal/Compliance Control: 해당 Reason(`BUDGET_UNAVAILABLE`·`LEGAL_RISK`·`COMPLIANCE_FAILURE` 등)은 Comment/Attachment 정책과 결합(§43) — 근거 없는 고위험 거절 방지.
- 무후퇴: 기존 이진 거절 이력 유지. `STEP_REJECTED` Event는 Sequential Engine(§47) 도입 후 발행 — 선행 종속.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
