# DSAR — Approval Decision Return Action (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§19 RETURN_ACTION.

검증 (원문 전사):
- Return 허용
- **Reason 필수**
- **Target 필수**
- Target 동일 Case
- Version 계보
- 현 Scope 이전
- Terminal / Archived 아님
- Definition / Runtime 존재
- Return Loop 정책
- Max Return
- Change Item 정책
- Assignment Release / Claim
- Lease 종료 정책
- Sequential Return Reference

★ **기존 Record / Snapshot 삭제 금지.**

## 2. 기존 구현 대조

- 승인 도메인에서의 RETURN(반려·단계복귀) → **no hits**.
- "return"이라는 문자열은 다른 도메인 의미로만 존재:
  - `withdraw` = GDPR 동의 철회, `cancel` = 구독/결제 취소(`routes.php:979,1198`) — 승인 결정 액션 아님.
  - `ReturnsPortal.php:36,324` = 커머스 반품 자유텍스트 — 승인 반려 아님.
- 실존 결정 도메인은 **APPROVE/REJECT 이진**뿐 — 결정을 이전 단계/요청자에게 되돌리는 비종결 액션이 전무.
- RETURN이 요구하는 선행 자산 전부 부재:
  - `Target 필수`·`현 Scope 이전`·`Sequential Return Reference` → Sequential(§3.2) ABSENT(`sequential_*/approval_stage/step` 0)이라 되돌릴 단계 좌표 없음.
  - `Reason 필수` → Reason Registry(§35) ABSENT.
  - `Return Loop 정책`·`Max Return` → Return Loop Governance(§21) 부재.
  - `Assignment Release/Claim`·`Lease 종료` → Assignment(§3.3) ABSENT.

## 3. 판정

- Verdict: **ABSENT** · **BLOCKED_PREREQUISITE** (승인 return 없음)
- 선행 의존: §3.2 Sequential(되돌릴 단계 좌표·`Sequential Return Reference`·`현 Scope 이전`)이 결정적 차단 · Reason Registry(§35) · Return Target(§20) · Return Loop Governance(§21) · Assignment(§3.3) 모두 부재.
- cover: **0**.

## 4. 확장/구현 방향 (설계)

- 순신규 RETURN 액션 — 단, **Sequential Engine(§3.2)·Return Target Resolution(§20) 선행 신설 없이는 착수 불가**(되돌릴 좌표 부재). BLOCKED_PREREQUISITE.
- Return≠Reject 경계 명문화(실위험 핵심): REJECT=Terminal(Assignment Closed), RETURN=**비종결 재작업**(Assignment Release/Claim·기존 결정 보존). §49 REJECT+RETURN·RETURN+RESUBMIT(same round) 차단으로 혼동 방지.
- ★불변성 절대 준수: `기존 Record/Snapshot 삭제 금지` — Return은 새 라운드를 여는 것이지 과거 결정을 지우는 것이 아님. 현행 in-place UPDATE(`Alerting.php:594`·`AdminGrowth.php:1330`) 패턴을 Return에 그대로 쓰면 이력 소실 → 반드시 불변 Record 위에서만 구현.
- Mandatory Control: `Target 필수`·`Target 동일 Case`·`Version 계보`·`Terminal/Archived 아님` 검증(§20 Return Target Resolution 경유). `Max Return`·`Return Loop`(§21 A→B→A Cycle·동일 Step 반복) 초과 시 Manual Review 강제 — 무한 반려 루프 방지.
- 무후퇴: 기존 이진 결정 도메인은 Return 미도입 상태로 유지 가능(선택적 확장).

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
