# DSAR — Approval Decision Action Capability (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§11 ACTION_CAPABILITY 필수 필드 (원문 전사):
- `capability_id` · `decision instance id` · `slot id` · `actor subject id`
- `action definition id` · `action version id`
- `source decision state` · `source sequential state`
- `assignment result` · `authority result` · `delegation result` · `actor type result`
- `reason requirement` · `comment requirement` · `attachment requirement` · `target requirement`
- `capability result` · `exclusion reasons`
- `evaluated_at` · `expires_at`
- `status` · `evidence`

§11 RESULT enum: `ALLOWED` / `ALLOWED_WITH_REQUIREMENTS` / `NOT_ALLOWED` / `TEMPORARILY_UNAVAILABLE` / `ADMIN_ONLY` / `REQUESTER_ONLY` / `SYSTEM_ONLY` / `MANUAL_REVIEW_REQUIRED`.

의미: Action Capability는 특정 actor가 특정 decision slot에서 특정 action(정의·버전)을 실행할 수 있는지를 assignment·authority·delegation·actor type 결과와 reason/comment/attachment/target 요구를 합산해 판정하고 `expires_at`까지 캐시(§67)한다. 사전 조회(pre-flight) 능력판정으로 UI/API 일관성의 기준이다.

## 2. 기존 구현 대조

- **능력 판정(capability evaluation) 자체가 부재** — 실제 액션 시점에 정적 RBAC role 게이트만 통과시킬 뿐, `capability_result`(8종)·`exclusion reasons`·`expires_at`을 산출하는 사전 능력판정 전무.
- 현존하는 것은 RBAC 게이트뿐: Tenant Guard(`index.php:404-420`) · `Alerting.php:580-582`(테넌트/권한 체크). 이는 `assignment/authority/delegation/actor type result`를 분리 산출하지 않고 단일 role 통과/차단만 반환.
- `assignment result` → **no hits**(§3.3 Assignment ABSENT · `orderhub_claims` `OrderHub.php:93,530`은 CS 클레임이지 승인 Assignment 아님 = 오탐). `authority result`·`delegation result` → **no hits**(§3.4 Authority/Delegation ABSENT · 정적 RBAC만).
- `actor type result`(ADMIN_ONLY/REQUESTER_ONLY/SYSTEM_ONLY 구분) → **no hits**.
- `reason/comment/attachment/target requirement` (능력판정에 결합된 요구 산출) → **no hits**(Reason ABSENT · Comment PARTIAL · Attachment MediaHost MIME만).
- `capability_id`·`evaluated_at`·`expires_at`·캐시 → **no hits**(§67 Capability Cache Key 부재).
- 결과: UI가 버튼을 노출하고 나서 실행 시점에야 role로 거부 — 사전 능력판정·`ALLOWED_WITH_REQUIREMENTS`(요구 명시) 부재로 UI/API 불일치(§58 "UI-only") 위험.

## 3. 판정

- Verdict: **ABSENT** (RBAC 게이트만 실재)
- 선행 의존: §3.3 Assignment ABSENT · §3.4 Authority/Delegation ABSENT — `assignment/authority/delegation result` 산출 불가. Definition(§8)·Version(§9) ABSENT — 능력판정 대상 정의 부재. 즉 다중 선행축 부재.
- cover: **0** (능력판정 전무 · 인접자산은 실행시점 정적 RBAC 게이트 `index.php:404-420`뿐 — 사전 pre-flight capability 아님).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_action_capability` — Definition/Version·Assignment·Authority/Delegation 선행 완료 후 착수(다중 BLOCKED). 8종 RESULT와 `exclusion reasons`를 산출, `expires_at`로 캐시(§67 Capability Cache Key).
- 확장 기반: Tenant Guard(`index.php:404-420`)·`Alerting.php:580-582` RBAC 게이트를 `actor type result` 산출의 최소 입력으로 재사용(Extend) — 단, RBAC 통과만으로 `ALLOWED` 판정 금지(assignment/authority/delegation 결과 합산 필수).
- Mandatory Control: `ALLOWED_WITH_REQUIREMENTS`를 반환해 reason/comment/attachment 요구를 사전 노출 → UI가 요구 충족 UI를 미리 렌더(UI/API 일관). `NOT_ALLOWED`·`MANUAL_REVIEW_REQUIRED`는 fail-closed.
- 실위험: 현재 role 통과만으로 `AdminGrowth::approvalDecide`(`AdminGrowth.php:1289-1344`)가 승인 확정 — 능력판정 없이 assignment/authority 미검증으로 권한 우회 가능. Capability를 Eligibility(§12)·Approve(§16)/Reject(§17) 실행의 선행 관문으로 배치해야 함.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
