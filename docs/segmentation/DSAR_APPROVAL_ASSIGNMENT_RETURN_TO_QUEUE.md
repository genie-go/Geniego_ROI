# DSAR — Approval Assignment Return-to-Queue (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`RETURN_TO_QUEUE`(§50) — 배정된 Work Item 을 다시 큐로 **되돌리는** 동작. 다음 트리거에서 지원되어야 한다.

### 지원 트리거 (원문)

1. Claim Release
2. Lease Expiration
3. Assignee Unavailable
4. Authority Lost
5. Delegation Expired
6. Security Suspension
7. Conflict
8. Manual Return
9. Recovery
10. Failed Reassignment

원문 원칙: **원 Queue 비활성 시 → Fallback Queue**(§51)로 반환.

## 2. 기존 구현 대조

Return-to-Queue 정본 동작은 **부재**하다(개념별 판정: Return-to-Queue = ABSENT 계열). 유일한 인접물은 `catalog_writeback_job` 의 600s stuck-processing → queued 재적재로, 이것은 Lease Expiration/Recovery 한 축의 암묵 회수일 뿐 10개 트리거를 포괄하는 반환 이벤트가 아니며 target queue·fallback queue 선택 로직을 남기지 않는다.

| 트리거/필드 | 선행 축·현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|
| Return-to-Queue 이벤트 자체 | 부재 — 반환 이벤트/History 0 | ABSENT |
| Lease Expiration / Recovery | `catalog_writeback_job` 600s 처리 회수 → queued 재적재(`Catalog.php:1699-1702`) — **암묵 회수만** | PARTIAL(암묵 회수) |
| Claim Release | 인접 = CAS claim(`Catalog.php:1721-1731`)·`omni_outbox` claim_id(`Omnichannel.php:425-448`) — 명시 unclaim→return 없음 | PARTIAL(claim 실재·반환 미배선) |
| Authority Lost / Delegation Expired | 선행 축2 Authority·위임 정본 ABSENT | BLOCKED_PREREQUISITE |
| Security Suspension | 축4 break-glass(`UserAuth.php:773-778`) 실재하나 배정 반환과 미연결 | PARTIAL(무관) |
| Conflict / Failed Reassignment | Conflict=PARTIAL(동시성만)·Reassignment ABSENT | ABSENT |
| 원 Queue 비활성 → Fallback Queue | Fallback(§51)=PARTIAL(채널 waterfall·approver-fallback 아님) | ABSENT |

## 3. 판정

- Verdict: **ABSENT** — 10개 트리거를 포괄하는 Return-to-Queue 정본 이벤트 전무. `catalog_writeback_job` 600s 재적재(`Catalog.php:1699-1702`)가 Lease Expiration/Recovery 한 축의 **암묵 회수**로만 존재.
- 선행 의존: Authority Lost·Delegation Expired 트리거는 선행 축2·위임 부재로 `BLOCKED_PREREQUISITE`. Fallback Queue 반환은 Fallback(§51)이 approver-fallback 아닌 채널 waterfall 이라 부재. Conflict/Failed Reassignment 는 상위 엔티티 ABSENT 에 의존.
- cover: **부분** — 암묵 회수 근거 `Catalog.php:1699-1702` (반환 이벤트·target/fallback queue 로직 없음).

## 4. 확장/구현 방향 (설계)

- 현행 암묵 회수(`Catalog.php:1699-1702`)를 **명시적 Return-to-Queue 이벤트로 승격**하고 10개 트리거를 단일 경로로 통합. 각 반환은 History(§14)에 RETURNED_TO_QUEUE 로 기록·target queue 를 명시.
- **원 Queue 비활성 시 Fallback Queue(§51)로 반환**하는 규칙을 강제 — 단, 현행 Fallback(§51)은 채널 waterfall(`Omnichannel.php`)로 approver-fallback 이 아니므로 재사용 불가, 승인 Fallback 은 별도 신설.
- Return-to-Queue 는 Release(§46)·Claim Unclaim(§40)·Recovery 와 일원화 — Claim Release·Lease Expiration 시 자동으로 Return-to-Queue 트리거.
- Authority Lost/Delegation Expired 자동 반환은 선행 4축 성립 후에만 — 그 전에는 Manual Return·Recovery(시간초과)만 신뢰(fail-closed).
- 코드 변경 0 유지 — 실 구현은 별도 승인세션.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
