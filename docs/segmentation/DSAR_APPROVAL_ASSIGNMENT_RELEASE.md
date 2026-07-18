# DSAR — Approval Assignment Release (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`RELEASE`(§46) — 현재 배정(Assignment)을 명시적으로 **해제**하고 Lease/Lock 종료·Capacity 복원·필요 시 Queue 반환까지 처리하는 이벤트.

### 필수 필드 (원문)

1. release_id
2. assignment_id
3. released_by
4. reason
5. return to queue 여부
6. target queue
7. lease closed
8. lock released
9. capacity restored
10. released_at
11. status
12. evidence

### RELEASE REASON (원문 enum)

USER_REQUEST · WRONG_ASSIGNMENT · OUT_OF_OFFICE · CAPACITY · CONFLICT · AUTHORITY_LOST · DELEGATION_EXPIRED · SECURITY · SLA_REFERENCE · MANUAL · SYSTEM_RECOVERY · CUSTOM

## 2. 기존 구현 대조

명시적 Release 오퍼레이션은 **부재**하다(개념별 판정: Release=PARTIAL). 유일한 인접 동작은 `catalog_writeback_job` 의 stuck-processing → queued **암묵 재적재**로, 이것은 lease 회수(recovery)이지 사용자/시스템의 명시적 release 이벤트가 아니며 release_id·reason·capacity restored 같은 정본 필드를 남기지 않는다.

| 필드군 | 선행 축·현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|
| Release 이벤트 자체 (release_id·released_by·reason) | 부재 — 명시적 release op 없음 | ABSENT |
| return to queue / 암묵 재적재 | `catalog_writeback_job` stuck-processing → queued 재적재(`Catalog.php:1699-1702`) — **암묵 회수만**, 명시 release 아님 | PARTIAL(암묵 회수) |
| lease closed / lock released | 인접 = CAS claim(`Catalog.php:1721-1731`)·`omni_outbox` claim_id/claimed_at(`Omnichannel.php:425-448`) — claim/lease 유사물 실재하나 명시 close 계층 없음(fencing 부재) | PARTIAL(claim 실재·close 부재) |
| capacity restored | 인접 = `PM/Enterprise.php:371-400`(읽기전용·미환류) — 복원 반영 경로 없음 | PARTIAL(읽기전용) |
| reason enum (AUTHORITY_LOST/DELEGATION_EXPIRED 등) | 선행 축2 Authority·위임 정본 ABSENT → 사유 판정 불가 | BLOCKED_PREREQUISITE |
| evidence | 정본 = `SecurityAudit.php:56-68` verify() | LEGACY_ADAPTER(evidence) |

## 3. 판정

- Verdict: **PARTIAL** — 명시적 Release 이벤트는 ABSENT. `catalog_writeback_job` 600s stuck-processing → queued 재적재(`Catalog.php:1699-1702`)가 **암묵 회수**로만 존재하며, release_id/released_by/reason/capacity restored 정본을 남기지 않는다.
- 선행 의존: AUTHORITY_LOST/DELEGATION_EXPIRED 사유는 선행 축2 Authority·위임 정본 부재로 `BLOCKED_PREREQUISITE`. lease/lock close 는 claim 유사물(`Catalog.php:1721-1731`)에 의존하나 fencing 부재. capacity restored 는 읽기전용(`PM/Enterprise.php:371-400`).
- cover: **부분** — 암묵 회수 근거 `Catalog.php:1699-1702` (명시 release 필드 없음).

## 4. 확장/구현 방향 (설계)

- 현행 암묵 회수(`Catalog.php:1699-1702`)를 **명시적 Release 이벤트로 승격**하라 — 시간초과 회수도 reason=SYSTEM_RECOVERY 로 release_id·released_by·released_at 를 남겨 History(§14)에 RELEASED 이벤트로 기록. 무후퇴: 기존 600s 회수 동작은 유지하되 정본 필드를 덧붙인다.
- Release 는 반드시 **lease closed · lock released · capacity restored · return-to-queue 여부**를 원자적으로 처리. Lock 은 fencing token(§44)을 추가해 stale process 덮어쓰기 방지.
- return to queue 는 Return-to-Queue(§50)·Fallback(§51) 경로와 일원화 — 원 Queue 비활성 시 Fallback Queue.
- reason enum(AUTHORITY_LOST/DELEGATION_EXPIRED)은 선행 4축이 성립한 후에만 자동 판정 가능. 그 전에는 MANUAL/SYSTEM_RECOVERY 만 신뢰.
- evidence 는 `SecurityAudit::verify()`(`SecurityAudit.php:56-68`) 확장. 🔴 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]).
- 코드 변경 0 유지 — 실 구현은 별도 승인세션.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
