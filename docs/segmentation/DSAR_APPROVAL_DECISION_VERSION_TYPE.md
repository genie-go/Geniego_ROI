# DSAR — Approval Decision Version Type (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§10 VERSION_TYPE enum (원문 전사):
`INITIAL` / `ACTION_POLICY_CHANGE` / `ACTOR_POLICY_CHANGE` / `ASSIGNMENT_POLICY_CHANGE` / `AUTHORITY_POLICY_CHANGE` / `DELEGATION_POLICY_CHANGE` / `STATE_POLICY_CHANGE` / `VALIDATION_POLICY_CHANGE` / `COMMIT_POLICY_CHANGE` / `IDEMPOTENCY_POLICY_CHANGE` / `LOCK_POLICY_CHANGE` / `OUTBOX_POLICY_CHANGE` / `CORRECTION` / `MIGRATION`.

(총 14종. `version_type` 필드는 §10 Version 레코드 소속.)

## 2. 기존 구현 대조

- **Version Type enum 부재.** 현행에 결정 정의 버전이 없으므로(§10 Version = ABSENT) 그 변경 유형을 분류하는 enum도 **no hits**.
- enum이 참조하는 각 정책 축(action/actor/assignment/authority/delegation/state/validation/commit/idempotency/lock/outbox)은 §GROUND_TRUTH에서 개별적으로:
  - ACTION/ACTOR: PARTIAL (`AdminGrowth.php:1321` enum·`Mapping.php:36-53` actor) — 그러나 이는 결정 실행 로직이지 정책 버전 유형이 아니다.
  - ASSIGNMENT/AUTHORITY/DELEGATION/STATE(sequential): ABSENT (선행 §3.2~§3.5).
  - VALIDATION/COMMIT/IDEMPOTENCY/LOCK/OUTBOX 정책: ABSENT.
- 유일 근접 사례 = 스키마 마이그레이션이나, 이는 코드/DB 스키마 버전이지 `MIGRATION` version_type(정책 이관)과 다른 개념 — 매핑 금지.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §10 Version(ABSENT) → §9 Definition(BLOCKED) 연쇄. Version Type은 Version 레코드의 분류 필드이므로 상위가 없으면 성립 불가.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- 순신규 enum — Version(§10) 신설과 동시에 도입. `INITIAL`은 최초 활성화, 나머지는 어떤 정책 축이 변경됐는지를 명시(감사·재현·Reconciliation §57에서 변경 원인 추적에 사용).
- `CORRECTION`/`MIGRATION`은 Revision Foundation(§38)과 정합 — 기존 Version 레코드 수정 없이 새 Version 발행(불변).
- 각 `*_POLICY_CHANGE`는 해당 선행 축 신설을 전제: 예) `DELEGATION_POLICY_CHANGE`는 Delegation 엔진(§3.3, 현재 `TeamPermissions.php:614-647` = 부여상한 오탐일 뿐 위임 위임 아님)이 실재해야 의미를 갖는다.
- 무근거 enum 남발 금지: 실 정책 축이 신설되기 전까지 해당 version_type은 발행되지 않도록 Validation Pipeline에서 Fail-Closed.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
