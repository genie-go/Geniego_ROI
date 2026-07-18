# DSAR — Approval Assignment Reservation (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`RESERVATION`(§45) — Work Item 을 특정 후보/큐에 **잠정 예약**하되 아직 Assignment 도 Claim 도 아닌 중간 상태. 만료 정책을 가진다.

### 필수 필드 (원문)

1. reservation_id
2. work_item_id
3. reserved candidate
4. reserved queue
5. reason
6. priority
7. reserved_at
8. expires_at
9. converted assignment id
10. status
11. evidence

원문 원칙: **Assignment/Claim 아님** · 만료 정책 필수(무기한 예약 금지).

## 2. 기존 구현 대조

예약(Reservation) 개념은 **통째로 부재**하다(개념별 판정: Reservation=ABSENT). Work Item 을 배정 전 잠정 점유하는 중간 상태·만료 정책·Assignment 전환 경로가 코드에 존재하지 않는다.

| 필드군 | 선행 축·현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|
| Reservation 엔티티 자체 | 부재 — 잠정 예약 상태/전환 코드 0 | ABSENT |
| reserved candidate | Candidate(§15) ABSENT · 후보 해석기 없음 | ABSENT |
| reserved queue | 인접 큐 = `catalog_writeback_job`(`Catalog.php:75-84`)·`omni_outbox`(`Omnichannel.php:95-99`) 실재하나 예약 슬롯 개념 없음 | PARTIAL(큐 실재·예약 부재) |
| reserved_at / expires_at (만료 정책) | 인접 = `catalog_writeback_job` 600s 처리 회수(`Catalog.php:1699-1702`)는 lease 회수이지 예약 만료 아님 | PARTIAL(회수 있음·예약 부재) |
| converted assignment id | Assignment(§13) 정본 부재 → 전환 대상 없음 | BLOCKED_PREREQUISITE |
| priority / reason | 배정 우선순위 축(§38) 부재 | ABSENT |

## 3. 판정

- Verdict: **ABSENT** — Reservation 엔티티·잠정 점유 상태·만료 전환 계층 전무.
- 선행 의존: converted assignment id 는 Assignment(§13) 정본 부재로 `BLOCKED_PREREQUISITE`. reserved candidate 는 Candidate(§15) ABSENT 에 의존. reserved queue·만료 정책은 인접 큐/회수(`Catalog.php:75-84,1699-1702`)가 있어 `PARTIAL` 이나 예약 의미는 없다.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- Reservation 은 순신설이며 Work Item(§11)·Candidate(§15)·Assignment(§13) 가 선행되어야 성립한다. 후보도 배정 정본도 없이 예약만 두면 전환 대상 없는 고아 상태가 된다.
- **만료 정책을 처음부터 필수화**하라 — 무기한 예약은 §58 Critical Gap(영구 Claim/Reservation)에 해당. reserved_at·expires_at·converted assignment id 를 두어 예약→Assignment 전환 또는 만료→Return-to-Queue(§50) 경로를 강제.
- 예약 큐는 `catalog_writeback_job`·`omni_outbox` 를 재구현하지 말고 Queue(§22) 정본으로 확장. 600s 처리 회수(`Catalog.php:1699-1702`)는 lease 회수이므로 예약 만료와 혼동 금지.
- Reservation ≠ Claim(§40) ≠ Assignment(§13) 경계를 명시. 예약은 우선순위/제외 신호일 뿐 권한 부여가 아니다.
- 코드 변경 0 유지 — 실 구현은 별도 승인세션.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
