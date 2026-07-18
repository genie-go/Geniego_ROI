# DSAR — Ordering (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §24 ORDERING — 순서 불변식
Stable Sequence Number · Unique within Parent · No Duplicate Active · No Negative/Null · Gap Policy · Reordering = 새 Version만 · Runtime 후 Definition Sequence 직접변경 금지 · Runtime = 생성 당시 Snapshot · Future Version 자동 재정렬 금지.

## 2. 기존 구현 대조

- **Sequence 컬럼 전면 ABSENT.** `step_order/stage_order/level_sequence/sequence_no/seq` 등 안정 순서번호 컬럼은 backend 전체 no matches. 다단 Stage/Level/Step 부재의 필연 귀결.
- 따라서 §24 불변식(Unique within Parent·No Duplicate Active·Gap Policy·Reorder=새 Version)이 강제할 대상 컬럼 자체가 없다.
- 실존하는 순서 결정은 **PK 기반 FIFO ORDER BY id ASC 뿐**: catalog_writeback_job 큐 소비(`Catalog.php:1716`)·omni_outbox 소비(`Omnichannel.php:405`). 이는 삽입순=처리순 도착순서이지, 승인 단계의 선언적 sequence 순서가 아니다.
- FIFO 는 재정렬 불가·gap 개념 없음·parent 범위 내 unique 개념 없음 — §24가 요구하는 "버전 스냅샷된 안정 순서"의 어떤 속성도 제공하지 않는다.
- mapping_change_request M-of-N(`Mapping.php:287`)은 승인자 간 순서가 아예 없는 병렬 정족수 → ordering 반례 아님.

## 3. 판정

- Verdict: **ABSENT** — sequence 컬럼 없음. 실존=`ORDER BY id ASC` FIFO(도착순, 선언적 단계순서 아님).
- 선행 의존: Stage/Level/Step Instance(§13~§15) + §10 Version(스냅샷 기준) ABSENT → **BLOCKED_PREREQUISITE**.
- cover: 0

## 4. 확장/구현 방향 (설계)

- 순신규 **stable sequence number**(stage/level/step 각 parent 범위 내 unique·no negative/null·gap policy 명시)를 Definition Version(§10)에 스냅샷. Runtime Instance 는 생성 당시 sequence 를 복제 보존(§24 "Runtime = 생성 당시 Snapshot").
- 무후퇴: Reordering 은 **새 Version 발행으로만** 허용, 활성 Runtime 의 Definition sequence 직접변경 금지(§59 High 갭 방지). Future Version 자동 재정렬 금지.
- FIFO(`Catalog.php:1716`·`Omnichannel.php:405`)는 큐 처리순으로 유지하되 승인 sequence 와 명확히 분리 — 동일 개념으로 혼용 금지. Sequence 신설은 Stage/Level/Step 골격 선행 후에만 의미.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
