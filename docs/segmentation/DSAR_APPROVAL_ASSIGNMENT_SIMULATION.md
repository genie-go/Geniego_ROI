# DSAR — Approval Assignment Simulation (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`SIMULATION`(§55) — 정책·전략·큐·후보·상태 변경을 **실제 부작용 없이 가상 실행**해 배정 결과(랭킹·승자·fallback·충돌·영향받는 활성 배정)를 예측하는 What-if 계층. **★실제 Assignment/Claim/Lease/Lock/Notification/Decision 을 미생성**하는 것이 핵심 불변식이다.

### SIMULATION_TYPE enum (원문 20종)

1. SINGLE_WORK_ITEM
2. SINGLE_QUEUE
3. SINGLE_CANDIDATE
4. BATCH_WORK_ITEM
5. STRATEGY_CHANGE
6. QUEUE_CHANGE
7. MEMBERSHIP_CHANGE
8. CAPACITY_CHANGE
9. AVAILABILITY_CHANGE
10. DELEGATION_CHANGE
11. AUTHORITY_CHANGE
12. LEGAL_ENTITY_CHANGE
13. REASSIGNMENT
14. TRANSFER
15. FALLBACK
16. CLAIM_CONTENTION
17. LEASE_EXPIRATION
18. RECOVERY
19. HISTORICAL_REPLAY
20. CUSTOM

### 필수 필드 (원문)

1. simulation_id
2. type
3. work item
4. policy / strategy / queue version
5. candidate set
6. authority / delegation state
7. legal entity
8. organization
9. resource
10. action
11. amount
12. currency
13. capacity / workload / availability state
14. simulated ranking / winner / fallback
15. conflicts
16. affected active assignments
17. simulation hash
18. status
19. evidence

## 2. 기존 구현 대조

배정 Simulation 은 **ABSENT**(§GROUND_TRUTH 개념별 판정: Simulation=ABSENT). Simulation 은 Resolution(§18) 엔진을 부작용 없이 재실행하는 계층인데, Resolution·Candidate·Strategy 가 모두 ABSENT 이므로 시뮬레이션할 실행 대상 자체가 없다.

- 🔴 **`AdminGrowth.simulate` 는 배정 시뮬레이션과 무관하다** — 그것은 성장/캠페인 시뮬(마케팅 도메인)이며 승인 배정 후보 랭킹·승자 산출·충돌 예측과 아무 관계가 없다. 이름 유사성으로 커버라 오판 금지(§규율 2: 이름에서 능력 추론 금지).

| 필드군 | 선행 축·현행 대조 (허용목록 file:line) | 판정 |
|---|---|---|
| Simulation 엔진 자체 | 부재 — 부작용 없는 배정 재실행 계층 0 | ABSENT |
| simulated ranking / winner / fallback | Resolution(§18)·Strategy(§20)·Candidate(§15) ABSENT — 재실행할 해결 로직 없음 | ABSENT |
| authority / delegation / legal entity state | 선행 축2 Authority·축3 Org **ABSENT** | BLOCKED_PREREQUISITE |
| capacity / workload state | 인접 = `PM/Enterprise.php:371-400`(읽기전용·미환류) | PARTIAL(읽기전용) |
| affected active assignments | Approval Assignment ABSENT — 영향 대상 집합 없음 | ABSENT |
| CLAIM_CONTENTION / LEASE_EXPIRATION 시뮬 | 인접 = `omni_outbox` FOR UPDATE SKIP LOCKED(`Omnichannel.php:425-448`)·`catalog_writeback_job` 600s 회수(`Catalog.php:1699-1702`) — 실 동시성이지 가상 시뮬 아님 | PARTIAL(실동작·시뮬 부재) |
| simulation hash | 결정론 재현·evidence 정본 = `SecurityAudit.php:56-68` verify() | ABSENT / LEGACY_ADAPTER(evidence) |

## 3. 판정

- Verdict: **ABSENT** — 배정 Simulation 엔진 통째 부재. `AdminGrowth.simulate`(캠페인 시뮬)는 무관.
- 선행 의존: authority/delegation/legal entity state 는 **선행 4축 부재**로 `BLOCKED_PREREQUISITE`. ranking/winner/fallback 은 Resolution(§18)·Strategy(§20)·Candidate(§15) ABSENT 의존. capacity/workload·claim contention 은 인접 자산 `PARTIAL`.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- Simulation 은 순신설이며 **Resolution(§18) 엔진을 선행**으로 요구한다 — Simulation 은 "부작용 플래그를 끈 Resolution 재실행"이므로 Resolution 이 없으면 시뮬레이션도 불가능하다.
- **★부작용 금지 불변식을 스키마·API 계약에 못박아라** — Simulation 경로는 실제 Assignment/Claim/Lease/Lock/Notification/Decision INSERT/UPDATE 를 **구조적으로** 못 하도록(읽기전용 트랜잭션·별도 결과 테이블). "실수로 실배정" 을 코드가 아니라 아키텍처로 차단.
- **결정론(§21) 공유** — Simulation 과 실 Resolution 은 동일 candidate set hash·simulation hash·replay seed 를 써 "시뮬 결과=실행 결과" 를 보장해야 신뢰 가능. HISTORICAL_REPLAY(19)는 과거 Snapshot(§54)을 입력으로 재생하되 **과거 재작성 금지**.
- `AdminGrowth.simulate` 를 재사용·확장하지 마라 — 도메인이 다르므로 승인 배정 Simulation 은 별도 엔티티. 혼용은 §66 Duplicate Implementation 위반.
- CLAIM_CONTENTION(16)/LEASE_EXPIRATION(17) 시뮬은 현행 `omni_outbox`(`Omnichannel.php:425-448`)·`catalog_writeback_job`(`Catalog.php:1699-1702`) 동시성 패턴을 **모델 입력으로 참조**하되 실 락을 잡지 않는 가상 경합으로 구현.
- 코드 변경 0 유지 — 실 구현은 별도 승인세션(Golden+verify+배포승인).

관련: [[DSAR_APPROVAL_ASSIGNMENT_SNAPSHOT]] · [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
