# DSAR — Return Loop Governance (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§21 RETURN_LOOP_GOVERNANCE** — 필수 필드:
`return count` · `same-target return count` · `total rework count` · `previous return targets` · `return cycle hash` · `maximum returns policy` · `escalation reference` · `manual review threshold`.

**차단 / Manual Review 트리거**: 동일 Step 반복 Return · A→B→A Cycle · Max 초과 · SLA Aging 초기화(재작업 남용) · Authority 우회 · Rejected Scope 재활성화.

## 2. 기존 구현 대조

- **RETURN 액션 자체가 승인 도메인에 부재**(§GROUND_TRUTH 액션 실존: RETURN=승인도메인 no hits). Return 이 없으므로 Return **Loop** 를 추적·차단하는 거버넌스 계층은 논리적으로 존재할 수 없다.
- Return 근접 오탐: `ReturnsPortal.php:36`(reason TEXT)·`:324`(NULLIF 원문 그룹핑)는 **커머스 반품/환불(customer returns)**이지 결정 반려(decision return-to-step)가 아니다.
- `return count`·`same-target return count`·`return cycle hash`·`maximum returns policy`·`escalation reference`·`manual review threshold` 를 기록·평가하는 자산 → **no hits**.
- Return 대상(단계·요청자·이전 위치)을 해석할 선행 Sequential/Step 계보 자체가 부재(§3.2 Sequential ABSENT).

## 3. 판정

- **Verdict: ABSENT · BLOCKED_PREREQUISITE**.
- 선행 의존: **§3.1 Decision Core**(불변 Record/Slot·in-place UPDATE `Alerting.php:594`·`AdminGrowth.php:1330`·`Catalog.php:2383`)와 **§3.2 Sequential**(Return Target=단계 복귀 대상, ABSENT) 둘 다 부재. Return 액션(§19)·Return Target Resolution(§20)이 선행되지 않으면 Loop 카운트/사이클 해시의 모수(母數)가 없다.
- cover: **0**.

## 4. 확장/구현 방향 (설계)

- Return Loop Governance 는 RETURN_ACTION(§19)·RETURN_TARGET_RESOLUTION(§20) 위에 얹히는 **남용 방지 상위 계층** — 순신규. Return 이 발생할 때마다 `(decision case, source step, target)` 별 count·`previous return targets` 배열·`return cycle hash`(A→B→A 탐지)를 누적하고, `maximum returns policy`/`manual review threshold` 초과 시 Manual Review 로 escalate.
- **절대 선행**: Sequential Engine(§3.2)·Decision Core(§3.1) 실엔진 신설이 전제. 이 둘 없이 Loop Governance 를 구현하면 항상 빈 카운트(가짜녹색·287/288차 클래스)가 된다.
- Mandatory Control: **SLA Aging 리셋 남용 차단** — Return 을 반복해 승인 SLA 타이머를 초기화하는 우회를 `total rework count` 로 봉쇄. **Rejected Scope 재활성화 금지**(반려된 항목을 Return 으로 되살리는 경로 차단). Authority 우회 Return(권한 없는 반복 반려)도 차단 축.
- 재사용: escalation/manual-review 이벤트 증거는 `SecurityAudit::verify`(`:56-68`) append-only 무결 체인으로 기록(신규 감사엔진 신설 금지·Golden Rule=Extend). audit_log 는 장식이므로 판정 근거로 삼지 말 것.
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
