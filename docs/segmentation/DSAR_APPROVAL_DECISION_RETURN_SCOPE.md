# DSAR — Approval Decision Return Scope (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§19 RETURN_SCOPE enum (원문 전사):
`RETURN_TO_REQUESTER` / `RETURN_TO_SUBMITTER` / `PREVIOUS_STEP` / `PREVIOUS_LEVEL` / `PREVIOUS_STAGE` / `SPECIFIC_STEP` / `SPECIFIC_LEVEL` / `SPECIFIC_STAGE` / `RESOURCE_OWNER` / `QUEUE` / `CUSTOM`.

(Return Scope는 반려가 "어디로 되돌아가는지"의 방향 종류를 열거한다 — 요청자/제출자에게인지, 이전/특정 단계인지, 자원소유자·큐인지. Return Target(§15 ACTION_TARGET·§20 Resolution)의 입력 축이다.)

## 2. 기존 구현 대조

- Return 방향을 데이터로 선언하는 구조 → **no hits**.
- 승인 도메인에 RETURN 액션 자체가 부재(§19 참조) — 따라서 그 하위 Scope enum도 전무.
- Scope 각 값이 전제하는 좌표 부재:
  - `PREVIOUS_STEP/LEVEL/STAGE`·`SPECIFIC_STEP/LEVEL/STAGE` → Sequential(§3.2) ABSENT.
  - `RETURN_TO_REQUESTER`·`RETURN_TO_SUBMITTER`·`RESOURCE_OWNER` → 요청자/제출자/자원소유자 Actor 모델을 결정 인스턴스에 결합하는 구조 부재.
  - `QUEUE` → Assignment Queue(§3.3) ABSENT(`orderhub_claims` `OrderHub.php:93,530`=CS 클레임 오탐).

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §3.2 Sequential(PREVIOUS/SPECIFIC STEP·LEVEL·STAGE) · Actor 모델(REQUESTER/SUBMITTER/RESOURCE_OWNER) · §3.3 Assignment(QUEUE) — 모두 부재. Return Action(§19) 자체가 없으므로 상위도 미성립.
- cover: **0**.

## 4. 확장/구현 방향 (설계)

- 순신규 `return_scope` enum(11종)을 RETURN_ACTION(§19)의 필수 입력이자 ACTION_TARGET(§15) TARGET_TYPE 사상 기준으로 편입. Scope → Target Resolution(§20) → Final Target Snapshot 파이프라인.
- 착수 순서: Sequential Engine(§3.2)·Actor 모델·Assignment Queue(§3.3) 신설이 선행 — 그 전에는 `RETURN_TO_REQUESTER`(단계 무관) 정도만 실효.
- Mandatory Control: Scope 선택 후 Target 유효성(동일 Case 계보·현 Scope 이전·§58 Forward Return 금지) 재검증. Client가 넘긴 Scope/Target 무신뢰 — 서버 재해석.
- 경계 유지: RETURN_SCOPE(비종결 방향)와 REJECT_SCOPE(종결 범위)는 별개 축 — 혼용 금지(§49 REJECT+RETURN 차단).
- BLOCKED_PREREQUISITE 성격: 다방향 Return은 선행 좌표계·Actor 모델 신설 세션 종속.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
