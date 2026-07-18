# DSAR — Approval Decision Return Target Resolution (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§20 RETURN_TARGET_RESOLUTION — 순서(원문 전사):
1. 명시 Target 검증
2. Policy 허용
3. 동일 Case 계보
4. Stage / Level / Step Sequence
5. 이전 위치
6. Runtime 상태
7. Definition Version
8. 재개 가능
9. Assignment 재생성 가능
10. Return Loop / Count
11. Security / Legal Entity
12. Final Target Snapshot

(Return Target Resolution은 RETURN 액션의 Target을 위 12단계로 확정해 최종 Target Snapshot을 산출하는 결정 절차다. ACTION_TARGET(§15)의 `target validity result`·`resolved_at`를 생산한다.)

## 2. 기존 구현 대조

- Target을 다단계로 해석·확정하는 절차 → **no hits**.
- 승인 도메인에 RETURN 액션 자체가 부재(§19) — 해석할 Target도, 절차도 전무.
- 12단계가 참조하는 선행 좌표 전부 부재:
  - `Stage/Level/Step Sequence`·`이전 위치`·`Definition Version`·`재개 가능` → Sequential(§3.2) ABSENT(`sequential_*/approval_stage/step` 0).
  - `Assignment 재생성 가능` → Assignment(§3.3) ABSENT(`orderhub_claims` `OrderHub.php:93,530`=CS 클레임 오탐).
  - `Return Loop/Count` → Return Loop Governance(§21) 부재.
  - `Runtime 상태` → 불변 Decision Record/Slot(§3.1) 부재로 재개 가능한 Runtime 상태 개념 없음.
- 실존 Security 재사용 자산(부분): `Security/Legal Entity` 검증에 쓸 Tenant Guard(`index.php:404-420`·`Alerting.php:580-582`)·`SecurityAudit::verify():56,64`는 실재 — 단 Target 해석 절차와 결합돼 있지 않음.

## 3. 판정

- Verdict: **ABSENT** · **BLOCKED_PREREQUISITE** (Sequential stage/step 부재)
- 선행 의존: §3.2 Sequential(Stage/Level/Step Sequence·이전 위치·재개)이 결정적 차단 · §3.3 Assignment(재생성) · Return Loop Governance(§21) · §3.1 Decision Core(Runtime 상태) 부재. Security(§3.6)만 부분 재사용 가능.
- cover: **0** (재사용 후보 Tenant Guard/SecurityAudit는 절차 미결합).

## 4. 확장/구현 방향 (설계)

- 순신규 Return Target Resolution 절차 — 단, **Sequential Engine(§3.2) 신설 없이는 4~9단계(Sequence·이전 위치·Definition Version·재개·Assignment 재생성)가 전부 공백** → BLOCKED_PREREQUISITE.
- 재사용: `Security/Legal Entity` 단계(11)는 실존 Tenant Guard(`index.php:404-420`·`Alerting.php:580-582`)·`SecurityAudit::verify():56,64`를 그대로 결합(신규 보안 엔진 난립 금지).
- Mandatory Control: 12단계 전부 통과해야만 `Final Target Snapshot` 생성 — 하나라도 실패 시 RETURN 차단(§58 Invalid/Cross-Case/Forward Return 방지). `Return Loop/Count`(§21 A→B→A·Max 초과) 위반은 Manual Review로 승격, 자동 진행 금지.
- 산출물 고정: Resolution 결과를 ACTION_TARGET(§15) 레코드의 `target validity result`·`target selection reason`·`resolved_at`로 불변 기록 — Client target id 무신뢰, 서버 재해석만 정본.
- 무후퇴: 기존 이진 결정 도메인은 Return 미도입 유지 가능. 도입 시 기존 Record/Snapshot 삭제 절대 금지(§19).

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
