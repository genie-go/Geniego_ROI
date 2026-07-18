# DSAR — Sequential Approval Execution Status (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§12 EXECUTION_STATUS enum (원문 전사·22종):

1. DRAFT
2. INITIALIZING
3. READY
4. ACTIVE
5. WAITING_FOR_ASSIGNMENT
6. WAITING_FOR_CLAIM
7. WAITING_FOR_DECISION
8. TRANSITION_PENDING
9. ADVANCEMENT_PENDING
10. PAUSED
11. SUSPENDED
12. BLOCKED
13. RETRY_PENDING
14. RECOVERY_PENDING
15. COMPLETED
16. CANCELLED
17. WITHDRAWN_REFERENCE
18. RETURNED_REFERENCE
19. FAILED
20. DEADLOCKED
21. ORPHANED
22. ARCHIVED

## 2. 기존 구현 대조

- **Execution Status 상태집합 부재.** 22종 실행 상태를 가진 다단 순차 인스턴스 자체가 ABSENT([[DSAR_APPROVAL_SEQUENTIAL_INSTANCE]]). 실존 상태는 flat·자유문자열이며 이 집합의 부분집합조차 아니다:
  - `catalog_writeback_job.status VARCHAR(30)` 자유문자열(`Catalog.php:80`) — queued/awaiting_credentials/processing/pending_approval 등 잡 처리 상태이지 승인 실행 상태가 아니다.
  - `admin_growth_approval.status VARCHAR(20)`(`AdminGrowth.php:146`) — pending→approved|rejected 단발.
- **WAITING_FOR_ASSIGNMENT/CLAIM/DECISION(5–7)**: Assignment/Claim/Decision 대기 개념은 승인 도메인에 부재(축4 Assignment ABSENT). claim 대기 유사물은 잡 큐(`Omnichannel.php:405` SKIP LOCKED)로만 있고 승인 배정 대기가 아니다.
- **TRANSITION_PENDING/ADVANCEMENT_PENDING(8–9)·DEADLOCKED/ORPHANED(20–21)**: Transition·다단 Advancement·Deadlock·Orphan 탐지 전부 ABSENT — 진입할 상태 조건이 코드에 존재하지 않는다.
- **PAUSED/RETRY_PENDING/RECOVERY_PENDING(10,13,14)**: 저니(pause/resume `JourneyBuilder.php:403`)·잡(stale 회수=암묵 recovery `Catalog.php:1700`)에 유사 개념이 있으나 승인 실행 상태가 아니며 명시 상태값으로 모델링돼 있지 않다.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: instance 엔티티([[DSAR_APPROVAL_SEQUENTIAL_INSTANCE]] BLOCKED) 및 상태 진입 조건(Assignment/Claim/Decision 대기·Transition·Deadlock/Orphan 탐지) 부재에 종속.
- cover: **0** (flat 자유문자열 status는 이 22종 상태기계 아님)

## 4. 확장/구현 방향 (설계)

- **순신규 enum**. 자유문자열 status(`Catalog.php:80`·`AdminGrowth.php:146`)를 제약 상태집합으로 정형화하되, §17 State 원칙(terminal/active/waiting/mutable·assignment/claim/decision/transition allowed 플래그)로 각 상태의 허용 전이를 선언 — 임의 `status=next` 변경(현행 하드코딩) 금지.
- **Mandatory Control**: DEADLOCKED/ORPHANED/BLOCKED 진입은 §43/§44 탐지 결과로만 세팅되고 Manual Review/Recovery Transition을 통해서만 해제(상태 임의 덮어쓰기 금지·§42). WITHDRAWN_REFERENCE/RETURNED_REFERENCE는 참조 이벤트로만 진입.
- **무후퇴**: 기존 잡/승인 상태 동작을 회귀시키지 않게 실행 상태를 별 축으로 매핑.
- **선결**: instance 신설과 동반. 본 문서는 설계 명세.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
