# DSAR — Approval Decision Definition (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§9 DEFINITION 필수 필드:
- `definition_id` · `registry_id` · `code` · `name`
- `approval domain`
- `workflow/chain/stage/level/step type reference`
- `allowed action types`
- `decision slot policy`
- `actor/validation/commit policy`
- `progression event policy`
- `current version` · `owner` · `valid_from/to` · `status` · `evidence`

## 2. 기존 구현 대조

- **결정 정의(Definition) 자산 부재.** Definition의 핵심 참조인 `workflow/chain/stage/level/step type reference`가 선행 부재로 성립 불가:
  - Approval workflow/chain **0** — `AgencyPortal.php:20,80,381`은 승인/거절 **이진상태**일 뿐 다단계 workflow/chain 구조가 없다.
  - Sequential(stage/level/step) **ABSENT** — 진행은 하드코딩 status flip(`AgencyPortal.php:381,400`)으로만 발생, step type을 참조하는 정의 계층이 없다(§GROUND_TRUTH §3.5, "가장 치명적").
  - `allowed action types` 를 정의에 묶는 지점 → **no hits**. 현행은 핸들러별 in-code enum(`Handlers/AdminGrowth.php:1321`)에 분산.
  - `decision slot policy`·`progression event policy` → 개념 ABSENT(Slot은 PARTIAL이나 정책화 부재, §13 참조).
- `registry_id` 외래키 대상인 Registry(§7) 자체가 ABSENT → Definition은 상위 참조가 없어 정박점이 없다.

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE** (workflow/chain 부재)
- 선행 의존: §3.1 Approval(workflow/chain 0), §3.5 Sequential(stage/level/step 부재). Definition은 workflow/chain/step type을 참조·조립하는 계층이므로, 이 선행 축이 없으면 정의할 대상 구조 자체가 없다. 추가로 §7 Registry 부재가 `registry_id` 정박을 막는다.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- Definition은 **선행 Approval/Sequential 신설 이후**에만 성립하는 파생 계층 — 본 세션에서 실 구현 불가, 선행 4축(Approval·Authority·Delegation·Sequential) 신설이 하드 선행 조건.
- 신설 시 Registry(§7) → Policy(§8) → Definition(§9) → Version(§10) 위계. Definition은 `allowed action types`(§11)를 워크플로우 단계별로 묶고, `decision slot policy`(§13)로 동일 Slot 단일 Committed를 강제.
- 확장 기반: `AdminGrowth::approvalDecide:1321` enum 화이트리스트를 `allowed action types` 검증의 원형으로, `Mapping::approve:287` 정족수를 단계 완료 정책 원형으로 재사용. 진행(progression)은 Decision이 다음 Step을 직접 활성화하지 않고 Sequential Completion Reference(§49)를 발행해 Sequential Engine이 소비하도록 분리.
- 무후퇴: 기존 Mapping 정족수 승인·AdminGrowth·Catalog approveQueue 동작을 Definition 하위로 흡수하되 회귀 0(§70).

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
