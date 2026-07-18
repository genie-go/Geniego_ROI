# DSAR — Request Changes Action (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§22 REQUEST_CHANGES_ACTION** — CHANGE_SCOPE enum:
`FIELD` / `DOCUMENT` / `AMOUNT` / `CURRENCY` / `DATE` / `CONTRACT_TERM` / `CUSTOMER` / `PARTNER` / `PRODUCT` / `PROGRAM` / `BUDGET` / `COST_CENTER` / `LEGAL_ENTITY` / `ORGANIZATION` / `EVIDENCE` / `JUSTIFICATION` / `CUSTOM`.

검증: Request Changes 허용 · Change Item ≥1 · 변경대상 명확 · 응답 Actor/Role 지정 · Due Date · Sensitive Field 변경권한 · Decision/Sequential State 유효 · Assignment/Claim 정책 · 중복 Change Request 방지.

## 2. 기존 구현 대조

- REQUEST_CHANGES 는 **승인 도메인에 부재**(§GROUND_TRUTH: RETURN/REQUEST_CHANGES/... = no hits).
- ★혼동 배제(코드 기반): `mapping_change_request`(`Mapping.php:209`)는 **매핑 제안(proposal)** 이지 반려-후-수정요청(request changes) 항목이 아니다. 제안자가 자발적으로 매핑을 제출하는 흐름이며, 승인자가 "이 부분을 고쳐 다시 내라"고 지시하는 Change Request 와 방향·의미가 반대다.
- CHANGE_SCOPE enum(FIELD/DOCUMENT/AMOUNT/…) 을 데이터로 선언하거나, Change Item·응답 Actor·Due Date·Sensitive Field 권한을 검증하는 자산 → **no hits**.
- 결정↔집행 2단계 분리는 2도메인 실재하나(`Mapping::approve→apply :287,:327`·`Alerting::decideAction→executeAction :601-655`) 모두 이진 approve/reject 이며 "변경 요청 후 응답 대기" 상태를 갖지 않는다.

## 3. 판정

- **Verdict: ABSENT · BLOCKED_PREREQUISITE**.
- 선행 의존: **§3.1 Decision Core**(변경요청이 얹힐 불변 Decision Record/Slot 부재·in-place status UPDATE `AdminGrowth.php:1330`)·**§3.2 Sequential**(응답 대기 중 Step 상태 보류 필요, ABSENT). Change Request/Item(§23·§24)·Change Response(§25)가 함께 신설돼야 완결.
- cover: **0** (`Mapping.php:209` 는 반대 방향 제안이므로 cover 아님).

## 4. 확장/구현 방향 (설계)

- REQUEST_CHANGES 는 **비종결(non-terminal) 결정 액션** — Reject(종결)·Return(위치 복귀)과 명확히 구분. 승인자가 CHANGE_SCOPE 별 Change Item ≥1 을 첨부해 응답 Actor/Role·Due Date 를 지정하고, Case 는 "응답 대기" 로 보류된다.
- **Return 과 미혼동**: REQUEST_CHANGES 는 Slot/Assignment 를 유지(KEEP_ACTIVE/SUSPEND, §45)하고 요청자에게 수정 지시만 전달 — Return 처럼 이전 Step 으로 커서를 되돌리지 않는다. Reject 처럼 종결하지도 않는다.
- 순신규: `approval_change_request`(§23) + `approval_change_request_item`(§24) 를 데이터로 신설하고, Sensitive Field(AMOUNT/CURRENCY/LEGAL_ENTITY) 변경 지시는 Sensitive Field 권한 검증을 통과해야 함.
- Mandatory Control: 중복 Change Request 차단(§50 CHANGE_REQUEST_DUPLICATE)·Change Item 0 개인 공허한 변경요청 금지·응답 없이 자동 승인 금지.
- 재사용: 응답 대기/증거는 `SecurityAudit::verify`(`:56-68`) 로 기록. 무기한 대기 방지는 Due Date + escalation.
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_CHANGE_REQUEST]] · [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
