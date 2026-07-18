# DSAR — Fencing Token (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §49 FENCING_TOKEN — 적용 대상
Transition Lock · Cursor Update · Stage/Level/Step Activation · Completion Progression · Skip · Pause · Resume · Recovery · Reconciliation Repair.

★낮은 Fencing Token 을 든 Process 의 Commit 을 차단(stale worker 축출).

## 2. 기존 구현 대조

- **Fencing Token ABSENT — 전무.** 코드베이스 전수조사에서 `fencing` **0 hits**. 단조 증가 토큰을 발급·비교·보관하는 필드/컬럼/로직이 어디에도 없다.
- 인접 substrate 는 있으나 **fencing 이 아니다**:
  - Transition Lease(부분): claimed_at + TTL 기반 시간 회수만 존재 — `Omnichannel.php:395-399`(900s)·`Catalog.php:1700`(600s)·`JourneyBuilder.php:396`(1800s). 이는 시간 만료로 소유권을 회수할 뿐, **회수 후 복귀한 구(舊) 소유자의 늦은 commit 을 토큰으로 거부하지 못한다**.
  - claim_id/claimed_at(`Omnichannel.php:97,410,418,560`)·CAS 조건부 UPDATE(`Catalog.php:1726-1730`)·SKIP LOCKED(`Omnichannel.php:405`)는 획득 시점 경합만 막고, **획득 후 리스 만료–재획득 사이의 stale commit 창**은 열려 있다.
- **낙관적 version CAS 도 ABSENT**(menu_defaults.version 은 라벨). 따라서 expected/actual aggregate version 비교로 stale 을 잡는 우회 경로도 없다.

## 3. 판정

- Verdict: **ABSENT** — fencing 0 hits. ★실위험.
- 선행 의존: fencing token 은 §46 Lock·§47 Lease·§45 Cursor 에 결속되어야 하나 Lock/Cursor 는 ABSENT, Lease 는 시간 TTL 부분뿐 → **BLOCKED_PREREQUISITE**.
- cover: 0

## 4. 확장/구현 방향 (설계)

- 순신규 **fencing token(단조 증가 정수)**. Lock 획득 시 발급, 모든 보호 대상(Transition Lock·Cursor Update·Activation·Completion·Skip·Pause/Resume·Recovery·Reconciliation Repair)에 토큰 동반, commit 직전 저장된 토큰보다 낮으면 `STALE_FENCING_TOKEN`(§20 Result)으로 거부.
- 재사용 기반: 기존 claimed_at+TTL 리스(`Omnichannel.php:395-399`·`Catalog.php:1700`·`JourneyBuilder.php:396`)에 fencing token 컬럼을 부가 — 시간 회수 시 토큰 증가, 구 소유자 commit 을 토큰 비교로 축출한다. CAS 패턴(`Catalog.php:1726-1730`)이 토큰 검증 UPDATE 의 원자 단위.
- ★실위험 무후퇴 필수(최우선): **현재 fencing 부재 = stale worker overwrite 이론창이 그대로 방치된 상태.** 리스 만료 후 지연 복귀한 워커가 이미 다른 워커가 진행시킨 상태를 덮어쓸 수 있다. Mandatory Control(§59 Critical Gap: stale worker overwrite·§61 Runtime Guard: Stale Fencing). Fail Closed — 토큰 없는/낮은 commit 은 무조건 거부.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
