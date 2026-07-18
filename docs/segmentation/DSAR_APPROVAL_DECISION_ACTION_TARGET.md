# DSAR — Approval Decision Action Target (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§15 ACTION_TARGET.

TARGET_TYPE enum (원문 전사):
`CURRENT` / `PREVIOUS` / `SPECIFIC_STEP` / `LEVEL` / `STAGE` / `REQUESTER` / `SUBMITTER` / `RESOURCE_OWNER` / `ASSIGNMENT_QUEUE` / `APPROVAL_REQUIREMENT` / `ITEM` / `CASE` / `WORKFLOW` / `CUSTOM`.

필수 필드:
- `target_id`
- `decision command id`
- `action type`
- `target type`
- `target id` · `target version` · `target sequence`
- `target actor` · `work item reference`
- `target validity result`
- `target selection reason`
- `resolved_at`
- `status` · `evidence`

(Action Target은 RETURN·REQUEST_CHANGES 등 방향성 액션이 "어디로/누구에게" 향하는지를 데이터로 확정하는 엔티티다.)

## 2. 기존 구현 대조

- `target_id`·`decision command id`·`target type`·`target version`·`target sequence`·`target validity result`·`target selection reason`·`resolved_at` 를 데이터로 선언하는 구조 → **no hits**.
- 실존 액션은 전부 **in-place status UPDATE**(`Alerting.php:594,653`·`AdminGrowth.php:1330`·`Catalog.php:2383`)로, 대상 해석(target resolution) 없이 자기 레코드의 상태만 뒤집는다. 방향(누구에게/어느 단계로)이라는 개념 자체가 코드에 없다.
- TARGET_TYPE 열거의 전제인 선행 자산이 부재:
  - `PREVIOUS`·`SPECIFIC_STEP`·`LEVEL`·`STAGE` → Sequential(§3.2) ABSENT(`sequential_*/approval_stage/step` 0)이라 참조할 단계 좌표 없음.
  - `ASSIGNMENT_QUEUE`·`work item reference` → Assignment(§3.3) ABSENT(`orderhub_claims` `OrderHub.php:93,530`=CS 클레임 오탐, 승인 Assignment 아님).
  - `REQUESTER`·`SUBMITTER`·`RESOURCE_OWNER` → 요청자/제출자/자원소유자를 결정 인스턴스에 결합하는 Actor 모델 부재.
- 결론: 대상 해석 엔티티는 전무하며, 그 상위 좌표계(Sequential·Assignment·Actor)도 부재.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §3.2 Sequential(단계 좌표 `PREVIOUS`/`SPECIFIC_STEP`/`LEVEL`/`STAGE`) · §3.3 Assignment(`ASSIGNMENT_QUEUE`/`work item reference`) · Actor 모델(`REQUESTER`/`SUBMITTER`/`RESOURCE_OWNER`) — 모두 부재.
- cover: **0**.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_action_target` 엔티티 — TARGET_TYPE 14종 + `target validity result`·`target selection reason`을 데이터로 선언. Action Target은 RETURN/REQUEST_CHANGES/CANCEL 등 방향성 액션의 필수 입력이므로, **§20 Return Target Resolution**의 산출물(Final Target Snapshot)을 그대로 물리 레코드로 고정한다.
- 선행 차단이 본질: Sequential Engine·Assignment·Actor Resolution이 없으면 `PREVIOUS`/`SPECIFIC_STEP`/`ASSIGNMENT_QUEUE`가 가리킬 좌표가 없다 → **BLOCKED_PREREQUISITE 성격의 신규**. 최소 착수 단위는 `CURRENT`/`REQUESTER`/`SUBMITTER`/`CASE`(단계 무관)부터.
- Mandatory Control: `target validity result`(동일 Case 계보·현 Scope 이전·Terminal/Archived 아님)를 통과하지 못한 Target은 액션 진행 차단(§58 Invalid/Cross-Case/Forward Return 방지). Client가 넘긴 target id 무신뢰 — 서버 재해석 후 `resolved_at`·`evidence` 기록.
- 무후퇴: 기존 5개 승인 도메인의 status UPDATE는 유지하되, 방향성 액션 도입 시 대상은 반드시 이 엔티티를 경유(직접 다른 레코드 상태 변경 금지).

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
