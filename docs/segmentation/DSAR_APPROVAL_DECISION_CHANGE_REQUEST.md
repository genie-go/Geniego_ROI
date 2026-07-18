# DSAR — Change Request (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§23 CHANGE_REQUEST** — 필수 필드:
`change_request_id` · `tenant_id` · decision instance/command/record id · case id/version · step instance id · requested by / response owner subject id · response owner role id · change request scope · summary · detailed instruction · priority · due date · blocking · resubmission required · case version increment required · current status · created/responded/resolved_at · `status` · `evidence`.

**STATUS enum**: `DRAFT` / `OPEN` / `ACKNOWLEDGED` / `IN_PROGRESS` / `RESPONSE_SUBMITTED` / `VALIDATION_PENDING` / `RESOLVED` / `REJECTED_RESPONSE` / `CANCELLED` / `EXPIRED` / `ARCHIVED`.

## 2. 기존 구현 대조

- 승인자가 발행하고 요청자가 응답·해소하는 **변경요청 레코드 부재**. REQUEST_CHANGES 액션(§22) 자체가 없으므로 그 산출물인 Change Request 도 없다.
- ★혼동 배제: `mapping_change_request`(`Mapping.php:209`)는 명칭이 유사하나 **매핑 제안 제출**이며, §23 의 lifecycle(DRAFT→OPEN→…→RESOLVED)·response owner·resubmission required·case version increment 같은 필드를 갖지 않는다. 이름 기반 매칭 금지(규율 2).
- `change_request_id`·`response owner role id`·`blocking`·`case version increment required`·STATUS 11 상태를 선언·전이하는 자산 → **no hits**.
- Case Version 자체가 부재(§3.1 Decision Core ABSENT) — `case version` / `case version increment required` 를 채울 선행 엔티티 없음.

## 3. 판정

- **Verdict: ABSENT · BLOCKED_PREREQUISITE**.
- 선행 의존: **§3.1 Decision Core**(decision instance/command/record·case id/version — 전부 부재)·**§3.2 Sequential**(step instance id). Change Request 는 Decision Record 와 Step 에 연결돼야 성립.
- cover: **0**.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_change_request` — REQUEST_CHANGES 액션(§22)의 산출물. STATUS 11 상태를 명시적 전이(hardcoded 상태 없이 상태머신으로). `blocking=true` 면 Case 진행 차단, `resubmission required=true` 면 응답이 Resubmission Package(§30)로 이어진다.
- `case version increment required` = 중대 변경(AMOUNT/CURRENCY/LEGAL_ENTITY 등, §31 정책)일 때 새 Case Version 요구 — 경미 변경은 Minor Revision(Audit+Hash).
- Mandatory Control: `due date` 필수 + `EXPIRED` 자동 전이(무기한 대기 금지)·`REJECTED_RESPONSE`(부적합 응답 반려) 경로 필수·요청자 자동해소 금지(validator result 필요).
- 재사용: 상태 전이 증거는 `SecurityAudit::verify`(`:56-68`). Change Request 원문/첨부는 중복저장 금지하고 Canonical Reference+Hash 로 참조(§53 원칙).
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_CHANGE_REQUEST_ITEM]] · [[DSAR_APPROVAL_DECISION_REQUEST_CHANGES_ACTION]] · [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
