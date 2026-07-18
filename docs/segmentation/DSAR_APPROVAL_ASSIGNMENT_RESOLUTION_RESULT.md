# DSAR — Approval Assignment Resolution Result (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`RESOLUTION_RESULT` enum (§19) — Resolution(§18) 이 산출한 **결과 분류**. 원문 20종.

1. DIRECT_ASSIGNEE_RESOLVED
2. QUEUE_RESOLVED
3. CLAIMABLE_QUEUE_RESOLVED
4. AUTO_ASSIGNEE_RESOLVED
5. DELEGATED_ASSIGNEE_RESOLVED
6. SUBSTITUTE_ASSIGNEE_RESOLVED
7. FALLBACK_ASSIGNEE_RESOLVED
8. MULTIPLE_CANDIDATES_RANKED
9. NO_ELIGIBLE_CANDIDATE
10. QUEUE_EMPTY
11. CAPACITY_EXHAUSTED
12. ALL_CANDIDATES_UNAVAILABLE
13. AUTHORITY_MISMATCH
14. DELEGATION_MISMATCH
15. LEGAL_ENTITY_MISMATCH
16. MONETARY_LIMIT_MISMATCH
17. CONFLICT
18. MANUAL_REVIEW_REQUIRED
19. BLOCKED
20. (CUSTOM 확장 여지 — 상위 Resolution `status`·`evidence` 와 함께 기록)

## 2. 기존 구현 대조

상위 Resolution 엔진이 **ABSENT**(개념별 판정)이므로 결과 코드를 산출·기록하는 계층이 통째로 부재하다. 각 결과값의 인접 자산 부재 깊이:

| # | Result | 선행 축·현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|---|
| 1 | DIRECT_ASSIGNEE_RESOLVED | 인접 = `pm_task_assignees` 수동 직접배정(`PM/Assignees.php:17-72`) — Resolution 산출 아님 | VALIDATED_LEGACY(수동 배정) |
| 2 | QUEUE_RESOLVED | 인접 = `catalog_writeback_job` 큐(`Catalog.php:75-84`) | VALIDATED_LEGACY(큐) |
| 3 | CLAIMABLE_QUEUE_RESOLVED | 인접 = `omni_outbox` claim(`Omnichannel.php:425-448`)·`catalog_writeback_job` CAS claim(`Catalog.php:1721-1731`) | CANONICAL(claim) |
| 4 | AUTO_ASSIGNEE_RESOLVED | 부재 — 자동 배정 전략 ABSENT | ABSENT |
| 5 | DELEGATED_ASSIGNEE_RESOLVED | 위임 정본 부재(`TeamPermissions.php:627-647` ACL 상한·인접상이) | BLOCKED_PREREQUISITE |
| 6 | SUBSTITUTE_ASSIGNEE_RESOLVED | 대리 정본 부재(축2·축3) | BLOCKED_PREREQUISITE |
| 7 | FALLBACK_ASSIGNEE_RESOLVED | Fallback=PARTIAL(무관·채널) · `omni_outbox` CAS fallback(`Omnichannel.php:425-448`)은 발송 무관 | PARTIAL(무관·채널) |
| 8 | MULTIPLE_CANDIDATES_RANKED | 후보 랭킹 엔진 ABSENT(Candidate·Strategy ABSENT) | ABSENT |
| 9 | NO_ELIGIBLE_CANDIDATE | 후보 자격 판정 부재 → 산출 불가 | ABSENT |
| 10 | QUEUE_EMPTY | 인접 = `catalog_writeback_job` 상태(`Catalog.php:396`) 빈 큐 판별 가능하나 Resolution 결과로 미환류 | PARTIAL(큐) |
| 11 | CAPACITY_EXHAUSTED | 인접 = `PM/Enterprise.php:371-400`(읽기전용·미환류) | PARTIAL(읽기전용) |
| 12 | ALL_CANDIDATES_UNAVAILABLE | Availability 축 ABSENT | ABSENT |
| 13 | AUTHORITY_MISMATCH | 축2 Authority Matrix ABSENT | BLOCKED_PREREQUISITE |
| 14 | DELEGATION_MISMATCH | 위임 정본 부재 | BLOCKED_PREREQUISITE |
| 15 | LEGAL_ENTITY_MISMATCH | 축3 legal_entity ABSENT | BLOCKED_PREREQUISITE |
| 16 | MONETARY_LIMIT_MISMATCH | amount_band 0(축2 ABSENT) | BLOCKED_PREREQUISITE |
| 17 | CONFLICT | Conflict=PARTIAL(동시성만) · 동시성 락(`Omnichannel.php:425-448`·`Catalog.php:1721-1731`)은 배정 충돌 아님 | PARTIAL(동시성만) |
| 18 | MANUAL_REVIEW_REQUIRED | 인접 = flat 승인테이블 수동검토(`AdminGrowth.php:142`·`Mapping.php:267-271,273`) — Resolution 산출 아님 | KEEP_SEPARATE_WITH_REASON |
| 19 | BLOCKED | 선행 4축 부재 시의 정직한 종착 상태 — 신설 시 fail-closed 기본값 | ABSENT(신설 기본값) |
| 20 | CUSTOM | 부재 | ABSENT |

## 3. 판정

- Verdict: **ABSENT** — Resolution 엔진 부재 → 결과 코드 산출 계층 없음. 인접 VALIDATED_LEGACY 2·CANONICAL 1·BLOCKED_PREREQUISITE 6·PARTIAL 4·KEEP_SEPARATE 1·ABSENT 6.
- 선행 의존: AUTHORITY/DELEGATION/LEGAL_ENTITY/MONETARY_MISMATCH·DELEGATED/SUBSTITUTE_RESOLVED 는 **선행 4축 부재**로 `BLOCKED_PREREQUISITE`.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- Result 카탈로그는 순신설이나 상위 Resolution 엔진(§18)·Candidate(§15)·Strategy(§20)가 선행되어야 산출 주체가 생긴다.
- **fail-closed 기본값을 BLOCKED 로 두라** — 선행 4축이 미완이거나 검증 실패 시 임의 배정 대신 BLOCKED/MANUAL_REVIEW_REQUIRED 로 종착. §58 Critical Gap("Authority/Delegation 미검증 Assignment") 방지의 핵심.
- DIRECT_ASSIGNEE_RESOLVED/QUEUE_RESOLVED/CLAIMABLE_QUEUE_RESOLVED 는 각각 `pm_task_assignees`·`catalog_writeback_job`·`omni_outbox` claim 을 정본 패턴으로 확장(중복 큐/배정 신설 금지·§66).
- MANUAL_REVIEW_REQUIRED 는 flat 승인테이블(`AdminGrowth.php:142`·`Mapping.php:267-271`)과 결선하되 별도 도메인 유지(KEEP_SEPARATE).
- *_MISMATCH 계열은 선행 4축이 세워진 뒤에만 실제 판정 — 그 전엔 산출하지 마라.
- 코드 변경 0 유지 — 실 구현은 별도 승인세션.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
