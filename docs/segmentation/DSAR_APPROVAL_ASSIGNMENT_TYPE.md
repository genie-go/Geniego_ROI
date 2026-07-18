# DSAR — Approval Assignment Type (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`ASSIGNMENT_TYPE` enum (§13) — 원문 14종. Assignment 이 어떤 경로로 성립했는지를 나타내는 분류축이다.

1. DIRECT
2. QUEUE
3. CLAIMED_FROM_QUEUE
4. AUTO_ASSIGNED
5. MANUAL_ASSIGNED
6. DELEGATED
7. SUBSTITUTE
8. ACTING
9. REASSIGNED
10. TRANSFERRED
11. FALLBACK
12. RECOVERED
13. EMERGENCY
14. CUSTOM

(참고: 상위 `ASSIGNMENT`(§13) 필수 필드는 이 enum 을 `type` 컬럼으로 참조한다. `assignment sequence·source·policy version id·strategy id/version·queue id/version id·assignee subject id·delegator subject id·delegation/authority resolution id·candidate id·resolution id·claim required·claim status·current lease/lock id·status·evidence.)

## 2. 기존 구현 대조

Approval Assignment 엔티티 자체가 **ABSENT**(§GROUND_TRUTH 개념별 판정: Approval Assignment=ABSENT). 따라서 `ASSIGNMENT_TYPE` 카탈로그 컬럼은 실존하지 않는다. 아래는 각 enum 값에 **인접**하는 실존 자산의 부재 깊이 기록이며, **인접 자산 존재 ≠ 커버**다.

| # | Type | 현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|---|
| 1 | DIRECT | 인접 = `pm_task_assignees` M:N 수동 배정(`PM/Assignees.php:14,32,17-72`, role owner/contributor/reviewer/observer) — Work Item↔Assignee 직접 결선이나 승인 Assignment Type 아님 | VALIDATED_LEGACY(수동 배정)+CONSOLIDATION_REQUIRED |
| 2 | QUEUE | 인접 = `catalog_writeback_job` 승인큐(`Catalog.php:75-84`, 상태 pending_approval→queued→processing→done/failed `Catalog.php:396,2383-2407`) — 큐 실재하나 Assignment 소유 아님 | VALIDATED_LEGACY(Approval Queue) |
| 3 | CLAIMED_FROM_QUEUE | 인접 = `omni_outbox` claim/lease 패턴(`Omnichannel.php:95-99,405,425-448`, FOR UPDATE SKIP LOCKED·CAS fallback) · `catalog_writeback_job` CAS claim(`Catalog.php:1721-1731`) — claim 패턴 정본이나 승인 Assignment 문맥 아님 | CANONICAL(claim/lease) |
| 4 | AUTO_ASSIGNED | 부재 — 자동 배정 전략(Strategy=ABSENT) 선행 없음 | ABSENT |
| 5 | MANUAL_ASSIGNED | 인접 = `pm_task_assignees` 수동 배정(`PM/Assignees.php:17-72`) — 승인 도메인 아님 | VALIDATED_LEGACY(수동 배정)+CONSOLIDATION_REQUIRED |
| 6 | DELEGATED | 선행 축2 Authority Matrix·위임 정본 ABSENT — `TeamPermissions.php:627-647` DELEGATION_EXCEEDED 는 ACL 부여상한 monotonicity(인접상이) | BLOCKED_PREREQUISITE |
| 7 | SUBSTITUTE | 위임/대리 정본 부재(선행 축2·축3) | BLOCKED_PREREQUISITE |
| 8 | ACTING | 직무대행(Position Incumbency·축3 Identity/Org=ABSENT) 선행 없음 | BLOCKED_PREREQUISITE |
| 9 | REASSIGNED | 부재 — Reassignment 개념 ABSENT(개념별 판정) | ABSENT |
| 10 | TRANSFERRED | 부재 — Transfer 개념 ABSENT(개념별 판정) | ABSENT |
| 11 | FALLBACK | 인접 = `omni_outbox` CAS fallback(`Omnichannel.php:425-448`) — 발송용·무관 채널 fallback이지 승인 Assignment fallback 아님 | PARTIAL(무관·채널) |
| 12 | RECOVERED | 인접 = `catalog_writeback_job` 600s 회수(`Catalog.php:1699-1702`) — job lease 회수이지 Assignment 복구 아님 | PARTIAL(job용) |
| 13 | EMERGENCY | 인접 = break-glass(`UserAuth.php:773-778,864,910,1006`) — 긴급 접근이나 Emergency Assignment 아님 | KEEP_SEPARATE_WITH_REASON |
| 14 | CUSTOM | 부재 | ABSENT |

## 3. 판정

- Verdict: **ABSENT** (Approval Assignment 엔티티 통째 부재 → `type` 컬럼 원천 없음). 인접 자산 VALIDATED_LEGACY 2(pm_task_assignees)·CANONICAL 1(omni_outbox claim)·VALIDATED_LEGACY 1(catalog_writeback_job 큐)·BLOCKED_PREREQUISITE 3·PARTIAL 2·KEEP_SEPARATE 1·ABSENT 4.
- 선행 의존: DELEGATED/SUBSTITUTE/ACTING 3종은 **축2 Authority Matrix·축3 Identity/Org 부재**에 막힌 `BLOCKED_PREREQUISITE`. AUTO_ASSIGNED 는 Strategy(§20 ABSENT) 선행 부재.
- cover: **0** (엔티티 부재. 인접 자산은 확장 대상이지 커버가 아니다.)

## 4. 확장/구현 방향 (설계)

- Assignment Type 카탈로그는 순신설이나 **인접 자산을 재구현하지 마라** — DIRECT/MANUAL_ASSIGNED 는 `pm_task_assignees`(`PM/Assignees.php`) 확장, QUEUE 는 `catalog_writeback_job`(`Catalog.php:75-84`) 확장, CLAIMED_FROM_QUEUE 는 `omni_outbox` claim/lease(`Omnichannel.php:425-448`)를 정본 패턴으로 참조. **중복 큐/배정 테이블 금지**(§66 Duplicate Implementation Audit).
- **DELEGATED/SUBSTITUTE/ACTING 을 "있음"으로 표기 금지** — 선행 4축(Approval Chain·Authority·Org·Delegation)이 선행 신설되어야 이 3종이 의미를 갖는다. 없는 상태에서 상수/NULL 로 채우면 §58 Critical Gap("Authority/Delegation 미검증 Assignment")을 구조적으로 재현한다.
- Type 14종은 `CUSTOM` 포함 **확장 가능 카탈로그**로 두고 ENUM 하드코딩 금지.
- EMERGENCY 는 break-glass(`UserAuth.php:773-778`)와 결선하되 Actor Snapshot(§54)·Reason 필수(§58) 통과 없이는 성립 금지.
- 코드 변경 0 유지 — 실 구현은 별도 승인세션(Golden+verify+배포승인).

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
