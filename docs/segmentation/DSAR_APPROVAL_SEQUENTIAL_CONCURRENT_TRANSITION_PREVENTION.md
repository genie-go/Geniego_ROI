# DSAR — Concurrent Transition Prevention (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §51 CONCURRENT_TRANSITION_PREVENTION — 수단
Expected Aggregate Version · Optimistic Lock · Transition Lock · Fencing Token · Idempotency Key · Unique Active State Constraint · Unique Current Cursor Constraint · CAS · Transaction Boundary · Outbox · Retry with Revalidation.

## 2. 기존 구현 대조

- **동시전이 방지 수단 중 일부만 실존**하며, 승인 전이가 아니라 잡/저니 primitive 다.
  - **CAS 조건부 UPDATE = PRESENT**: `Catalog.php:1726-1730`(선점 시 status 조건부 갱신·affected-rows 로 경합 판정)·`JourneyBuilder.php:415-425`·`ChannelSync.php:6148`.
  - **FOR UPDATE SKIP LOCKED = PRESENT**: `Omnichannel.php:405`(행 잠금 기반 단일 소비), 폴백 경로 `:429-441`. claim_id/claimed_at(`Omnichannel.php:97,410,418,560`).
  - **Transition Lease = PARTIAL**: claimed_at + TTL 시간 회수(`Omnichannel.php:395-399` 900s·`Catalog.php:1700` 600s·`JourneyBuilder.php:396` 1800s).
- **부재 수단**:
  - **Optimistic Lock / Expected Aggregate Version CAS = ABSENT** — 낙관적 version CAS 없음(menu_defaults.version 은 라벨). 전이가 "내가 읽은 버전과 현재 버전이 같은가"를 검증하지 못한다.
  - **Fencing Token = ABSENT**(`fencing` 0 hits)·**범용 Idempotency Key = 부재**(§48 국소 UNIQUE 뿐).
  - **Unique Active State Constraint · Unique Current Cursor Constraint = ABSENT** — 다단 Stage/Level/Step·Cursor 자체가 ABSENT 이므로 "복수 Active 금지" DB 제약도 없다.
- 즉 실존 방지력은 **획득 시점 경합(CAS·SKIP LOCKED)** 에 한정 — 획득 후 stale commit·version drift 는 막지 못한다.

## 3. 판정

- Verdict: **PARTIAL** — CAS(`Catalog.php:1726-1730`) + FOR UPDATE SKIP LOCKED(`Omnichannel.php:405`)만 존재(§28·§29 §66 CANONICAL 후보). 낙관적 version CAS·Fencing·Unique Active/Cursor Constraint **부재**.
- 선행 의존: Expected Version·Fencing·Cursor Constraint 는 §20·§45·§49(전부 ABSENT)에 막힘 → **BLOCKED_PREREQUISITE**.
- cover: 부분(CAS 조건부 UPDATE · SKIP LOCKED 행잠금) · 나머지 0

## 4. 확장/구현 방향 (설계)

- 순신규 결합: 순차 전이는 **Expected Aggregate Version(낙관적 CAS) + Transition Lock + Fencing Token + Unique Active State/Cursor Constraint** 를 한 트랜잭션 경계에서 동시 충족해야 commit 허용. 실패 시 `VERSION_MISMATCH`/`CONFLICT`(§20).
- 재사용 기반: `Catalog.php:1726-1730`(CAS)를 낙관적 버전 UPDATE 로 확장(`WHERE id=? AND version=?`), `Omnichannel.php:405`(SKIP LOCKED)를 전이 락 획득의 참조정본으로, TTL 리스(`Omnichannel.php:395-399`·`Catalog.php:1700`·`JourneyBuilder.php:396`)에 fencing token 부가.
- ★실위험 무후퇴 필수: **낙관적 version CAS·Fencing 부재 = 동시 전이가 마지막-쓰기-승리(last-write-wins)로 서로를 덮어쓸 창.** Retry with Revalidation(§41: 재검증 없는 자동 retry 금지)·Outbox·Unique Current Cursor 로 단일 Current 보장(§25~§27: 동시 2+ Current = Conflict). Fail Closed(§59·§61).

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
