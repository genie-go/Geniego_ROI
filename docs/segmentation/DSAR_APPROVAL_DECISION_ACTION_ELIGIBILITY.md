# DSAR — Approval Decision Action Eligibility (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§12 ACTION_ELIGIBILITY 검증 순서 (원문 전사):
- `Action Definition Active` · `Action Version Active`
- `Actor Type 허용` · `Source Decision State 허용` · `Source Sequential State 허용`
- `Current Assignee 또는 Valid Delegate`
- `Action Authority`
- `Legal Entity / Organization / Resource / Amount 범위` · `Currency Scope`
- `Reason Requirement` · `Comment Requirement` · `Attachment Requirement` · `Return Target Requirement` · `Change Request Item Requirement` · `Resubmission Package Requirement`
- `Action Conflict 없음` · `Existing Terminal Action 없음`
- `Idempotency` · `Lock / Fencing`

의미: Action Eligibility는 Capability(§11)가 정적 허용을 판정한 뒤, 런타임 상태(assignee/delegate·authority·amount/currency·requirement 충족·conflict·terminal·idempotency·lock)를 종합해 **실제 실행 가능 여부**를 fail-closed로 확정한다. Approve(§16)/Reject(§17)/Return(§19) 등 개별 액션 실행의 직전 관문이다.

## 2. 기존 구현 대조

- **종합 적격성 검증 파이프라인 부재** — 위 검증 항목을 순서대로 통과시키는 단일 Eligibility 게이트 전무. 각 핸들러가 부분 조건만 임의 확인.
- `Action Definition/Version Active` → **no hits**(§8·§9 ABSENT).
- `Current Assignee / Valid Delegate` → **no hits**(§3.3 Assignment ABSENT · `orderhub_claims` `OrderHub.php:93,530`=CS 클레임 오탐 · §3.4 Delegation ABSENT).
- `Action Authority` → **no hits**(정적 RBAC role만 `index.php:404-420`, 액션 authority 부재).
- `Amount / Currency Scope`·`Legal Entity / Organization / Resource 범위` → **no hits**(승인에 결합된 금액/통화/법인 스코프 검증 부재).
- `Reason/Comment/Attachment/Return Target/Change Request/Resubmission Requirement` → 대부분 ABSENT(Reason 자유텍스트 `ReturnsPortal.php:36,324` · Comment note만 · Attachment=MediaHost MIME만 `MediaHost.php:81-91` · Return Target/Change Request/Resubmission 전무).
- `Existing Terminal Action 없음`·`Action Conflict 없음` → **no hits**(§50 Conflict 등록소 부재).
- `Idempotency`·`Lock / Fencing` → **PARTIAL**(§51 idempotency key·fencing 체계 부재 · 핸들러별 임시 방지만).
- 유일 인접: `Mapping::approve`(`Mapping.php:238-331`) Maker-Checker가 이중승인 상태만 확인 — 종합 적격성 아님.

## 3. 판정

- Verdict: **ABSENT · BLOCKED_PREREQUISITE**
- 선행 의존(다중): Definition(§8)/Version(§9) ABSENT · §3.3 Assignment ABSENT(assignee/delegate 확인 불가) · §3.4 Authority/Delegation ABSENT(action authority 불가) · Reason(§35~)/Return Target(§20)/Change Request(§23)/Resubmission(§30) ABSENT(requirement 검증 대상 부재) · Conflict(§50)/Idempotency(§51) ABSENT.
- cover: **0** (종합 적격성 게이트 전무 · 인접 Maker-Checker는 이중승인 상태만 확인).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_action_eligibility` 검증 파이프라인 — 위 선행 6군 다수가 신설된 뒤에야 완전 착수 가능(BLOCKED). Capability(§11) 이후 런타임 fail-closed 게이트로 배치.
- 확장 기반: `Mapping::approve`(`Mapping.php:238-331`) Maker-Checker=VALIDATED_LEGACY를 `Existing Terminal Action 없음`+이중승인 검증의 일부로 재사용 · Tenant Guard(`index.php:404-420`)를 tenant/actor 스코프 검증에 재사용.
- Mandatory Control(무후퇴·실위험): `Reason Requirement`를 REJECT/RETURN에 강제 — 현재 `AdminGrowth.php:1319-1331` 거절 사유 미입력을 Eligibility에서 fail-closed 차단. `Idempotency`+`Lock/Fencing`을 강제해 `Alerting::executeAction`(`Alerting.php:601-655`)의 비원자 집행 중복실행을 방지.
- 선행 완결 전 부분 착수 가능한 항목: `Existing Terminal Action 없음`·`Idempotency`·`Reason/Comment/Attachment Requirement`는 선행 저강도 — 우선 도입해 이중집행·무사유 거절부터 차단.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
