# DSAR — Approval Decision Reject Scope (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§17 REJECT_SCOPE enum (원문 전사):
`STEP` / `LEVEL` / `STAGE` / `REQUIREMENT` / `ITEM` / `CASE` / `WORKFLOW_REJECTION` / `CUSTOM`.

(Reject Scope는 거절이 "어느 범위"에 종결 효과를 미치는지를 규정한다 — 단일 Step만인지, Level·Stage 전체인지, Case 전체 종결인지. Partial Approval Policy(§17)와 직접 결합된다.)

## 2. 기존 구현 대조

- 거절 범위를 데이터로 선언하는 구조 → **no hits**.
- 실존 REJECT(`Alerting.php:593`·`AdminGrowth.php:1321`)는 **자기 단일 레코드의 상태만 뒤집는 이진 파생** — "부분 거절"이라는 개념 자체가 없다. 하나의 거절이 Step인지 Case 전체인지 구분할 좌표계가 부재.
- Scope enum이 전제하는 선행 좌표 전부 부재:
  - `STEP`·`LEVEL`·`STAGE`·`WORKFLOW_REJECTION` → Sequential(§3.2) ABSENT.
  - `REQUIREMENT`·`ITEM` → Approval Requirement/Item 모델 부재.
  - `CASE` → 다단계 Case 집계 개념 부재(단일 레코드=단일 결정).
- Partial Approval Policy = 부재 → 부분 승인/거절을 판단할 정책 계층 없음.

## 3. 판정

- Verdict: **ABSENT** (부분 거절 개념 없음)
- 선행 의존: §3.2 Sequential(STEP/LEVEL/STAGE/WORKFLOW 좌표) · Approval Requirement/Item 모델(REQUIREMENT/ITEM) · Case 집계 모델(CASE) — 모두 부재. Scope는 상위 구조가 존재해야만 의미를 가짐.
- cover: **0**.

## 4. 확장/구현 방향 (설계)

- 순신규 `reject_scope` enum(8종)을 REJECT_ACTION(§17)의 필수 입력으로 편입 — 단, 실효는 Sequential(§3.2)·Requirement/Item 모델 신설 이후. 그 전까지는 사실상 `CASE`(단일 결정=전체 종결) 단일 Scope만 유효.
- Mandatory Control: Scope 유효성 검증(§17 `Scope 유효`) — 존재하지 않는 Level/Stage로의 거절 차단(§58 Invalid Scope 방지). Partial Approval Policy와 결합해 "일부 Item 거절 시 나머지 진행 여부"를 정책으로 결정(자동 종결 금지).
- 경계 유지: Reject Scope는 **Terminal 효과 범위**만 규정 — 비종결 재작업 범위는 RETURN_SCOPE(§19)로 분리(§49 REJECT+RETURN 차단).
- 무후퇴: 기존 이진 거절은 `CASE`/`STEP` 단일 Scope 특수사례로 흡수, 이력 파괴 금지.
- BLOCKED_PREREQUISITE 성격: 다범위 거절은 선행 좌표계 신설 세션에 종속.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
