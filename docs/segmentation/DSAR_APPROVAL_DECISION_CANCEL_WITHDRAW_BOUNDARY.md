# DSAR — Cancel / Withdraw Boundary (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§28 CANCEL_WITHDRAW_BOUNDARY (원문 전사):

**CANCEL** =
- 주체: 관리자 / 시스템 / 권한자
- 목적: 운영 종료(Operational Termination)
- 범위: Command ~ Workflow
- 기존 결정: 유지
- 사유: 관리적 사유(Administrative Reason)
- 권한 기반: Administrative Authority
- 후속: Compensation

**WITHDRAW** =
- 주체: 요청자 / 제출자
- 목적: 자기 요청 회수(Self-request Recall)
- 범위: 주로 Request / Case
- 기존 결정: 유지
- 사유: 회수 사유(Withdrawal Reason)
- 권한 기반: Request Ownership
- 후속: Cleanup / Resubmit

## 2. 기존 구현 대조

- **Cancel ≠ Withdraw 구분 자체가 부재** → ABSENT.
- 현행 "cancel" hit = 구독/결제 취소(`routes.php:979`·`routes.php:1198`) — 승인 결정의 관리적 취소가 아니라 커머스 구독·결제 라이프사이클. 승인 도메인 CANCEL 아님.
- 현행 "withdraw" hit = GDPR 개인정보 회수(Dsar 도메인). 요청자 자기요청 회수(§28 WITHDRAW)와 무관.
- 두 액션을 구분하는 축(주체 Administrative Authority vs Request Ownership · 목적 운영종료 vs 자기회수 · 후속 Compensation vs Cleanup/Resubmit)을 코드로 분기하는 지점 → **no hits**. 승인 확정/거절은 `AdminGrowth::approvalDecide`(`AdminGrowth.php:1289-1344`)의 approved/rejected 이진뿐이며 취소·회수 분기 없음.
- 기존 결정 유지(양쪽 공통 불변) 성립 전제인 불변 Decision Record = 부재(§3.1 Decision Core ABSENT · in-place UPDATE `Alerting.php:594`·`AdminGrowth.php:1330`·`Catalog.php:2383`).

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §3.1 Decision Core(양쪽 공통 "기존 결정 유지"의 불변 이력) · §3.4 Authority/Delegation(CANCEL의 Administrative Authority vs WITHDRAW의 Request Ownership 판정 근거 — 정적 RBAC만 존재). 경계 규정 자체가 두 선행 축에 종속.
- cover: **0** (Cancel·Withdraw 어느 쪽도 승인 도메인에 미구현. 경계 분기 전무).

## 4. 확장/구현 방향 (설계)

- 본 문서는 **개념 경계 정본** — 별도 엔티티가 아니라 §26 CANCEL / §27 WITHDRAW 두 액션의 **상호 배타 규칙(Precedence §48: Administrative Cancel > Valid Withdraw)** 을 명시하는 결정 규범.
- Mandatory Control: 두 액션 모두 **기존 결정 미삭제**. Compensation(Cancel) 과 Cleanup/Resubmit(Withdraw) 의 후속 경로를 혼용 금지.
- 실위험 = 혼용. 요청자에게 관리적 Cancel 권한을 주거나, 관리자 Cancel을 Withdraw로 로깅하면 감사 추적이 오염. Authority(관리적) ≠ Ownership(요청자) 판정을 Delegation Foundation(§3.4) 신설 후 강제해야 정직.
- 커머스 취소(`routes.php:979,1198`)·GDPR 회수(Dsar)와 **명명 격리** — 승인 도메인 CANCEL/WITHDRAW는 신규 네임스페이스로 분리(중복 엔티티/의미 충돌 방지).

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
