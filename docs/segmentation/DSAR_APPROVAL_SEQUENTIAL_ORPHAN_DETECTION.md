# DSAR — Orphan Detection (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §43 ORPHAN_DETECTION — 탐지 조건
Active Step인데 Work Item 없음 · Waiting Assignment인데 Request 없음 · Assigned인데 Assignment 없음 · Claimed인데 Claim 없음 · Cursor가 Terminal 가리킴 · Current Level/Stage 없음 · Parent Completed인데 Child Active · Transition Pending Timeout · Event 처리완료인데 State 미변경 · State 변경인데 Snapshot 없음.

## 2. 기존 구현 대조

- **잡/아웃박스 도메인의 stale-claim 회수 = PARTIAL.** omni_outbox 에서 소유자를 잃은(또는 만료된) 'processing' 항목을 시간 기준으로 회수한다: `UPDATE omni_outbox SET status='queued', claim_id=NULL, claimed_at=NULL WHERE ... status='processing' AND (claimed_at IS NULL OR claimed_at < (now-900s))`(`Omnichannel.php:395`). 이는 §43 의 "Claimed인데 유효 Claim 없음(stale)" 조건을 아웃박스 도메인에서 부분 탐지·자가치유한다.
- **그러나 §43 계약의 핵심 부재**:
  - **승인 도메인 Orphan 개념 없음.** "Active Step인데 Work Item 없음"·"Waiting Assignment인데 Request 없음"·"Parent Completed인데 Child Active"·"Cursor가 Terminal 가리킴" 은 Step/Work Item/Assignment/다단 Parent-Child/Cursor 자체가 ABSENT 이라 탐지 대상이 존재하지 않는다.
  - **탐지 ≠ 표면화.** omni_outbox 회수는 **탐지 즉시 조용히 상태를 되돌릴 뿐** Orphan 을 명시 상태/사유/Audit(ORPHAN_DETECTED §65)로 남기지 않는다. §43 이 요구하는 "탐지 → Manual Review/Recovery Transition" 경로가 아니다(상태 직접 덮어쓰기).
  - **"Event 처리완료인데 State 미변경"·"State 변경인데 Snapshot 없음"** 은 Event/Snapshot SoT 부재로 탐지 불가.
- **선행 SoT 부재.** Assignment(§3.4 ABSENT)·다단 Stage/Level/Step(ABSENT)·Cursor(ABSENT) 가 없어 승인 Orphan 은 정의 자체가 성립하지 않는다.

## 3. 판정

- Verdict: **PARTIAL** — omni_outbox stale-claim 시간회수(`Omnichannel.php:395`)만 존재(아웃박스 도메인). **승인 도메인 Orphan(Step/Assignment/Cursor/Parent-Child) 탐지·표면화·Recovery 경로** 전무.
- 선행 의존: Assignment(§3.4)·다단 Step/Stage·Cursor·Event/Snapshot SoT 부재 → 승인 Orphan 대부분 **BLOCKED_PREREQUISITE**.
- cover: 부분(아웃박스 stale-claim 회수 1종·별 도메인) · 승인 Orphan 0

## 4. 확장/구현 방향 (설계)

- 재사용: omni_outbox 시간회수 로직(900s TTL, `Omnichannel.php:395`)을 Sequential Lease 만료·stale-claim Orphan 탐지의 런타임 패턴으로 흡수(§47 Lease). 단 조용한 덮어쓰기가 아니라 **Orphan Detected Audit + Recovery Transition** 으로 표면화(§42·§59 Critical Gap: Orphan 미탐지 금지).
- 순신규 **Orphan 탐지 규칙 집합**: §43 각 조건(Active Step w/o Work Item·Claimed w/o Claim·Parent Completed w/ Child Active·Cursor→Terminal)을 주기 스캔으로 탐지 → Block/Manual Review 로 라우팅.
- ★탐지 대상들(Step/Assignment/Cursor/Work Item)은 각 선행 SoT 신설 후에만 실효 — 그 전까지 승인 Orphan 미구현이 정직한 상태(허구 탐지기 금지). 아웃박스 회수(`Omnichannel.php:395`)는 별 도메인으로 KEEP_SEPARATE 유지.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
