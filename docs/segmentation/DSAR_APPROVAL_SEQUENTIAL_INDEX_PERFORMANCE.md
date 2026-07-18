# DSAR — Index & Performance (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§69 INDEX_PERFORMANCE — Sequential Approval 운영을 위해 요구되는 인덱스/조회 최적화 대상(전사):
1. Tenant / Case / Workflow / Chain / Status 별 Instance 조회
2. Current Stage / Level / Step 조회
3. Waiting Assignment / Claim / Decision 조회
4. Transition Pending / Advancement Pending 조회
5. Paused / Suspended / Blocked / Retry Pending / Recovery Pending 조회
6. Orphaned / Deadlocked / Completed 조회
7. Stage / Level / Step Sequence 조회
8. Event Idempotency Key 조회
9. Transition Status 조회
10. Lock / Lease Expiration 조회
11. Cursor Version 조회
12. Conflict 조회
13. Snapshot 조회
14. Reconciliation Mismatch 조회

## 2. 기존 구현 대조

- **인덱스 대상 엔티티 자체가 부재**: 조회 대상인 Instance(§11)·Stage/Level/Step Instance(§13~15)·Cursor(§45)·Transition Instance(§20)·Conflict(§56)·Snapshot(§52)·Reconciliation(§57)이 모두 ABSENT — 인덱싱할 테이블이 없음(§GROUND_TRUTH 개념별 판정).
- **다단 Sequence 인덱스(7항) 대상 부재**: `current_step/stage/level/step_order/sequence_no` backend 전체 0 hits — Sequence 컬럼이 없어 정렬/인덱스 대상 없음.
- **Idempotency Key 인덱스(8항) — PARTIAL**: 도메인별 UNIQUE 제약만 실존(Paddle notification_id `Paddle.php:343-348`·journey_node_sent UNIQUE `JourneyBuilder.php:454,482,490`) — 범용 event idempotency 인덱스 아님.
- **Lock/Lease Expiration 인덱스(10항) — PARTIAL substrate**: 시간기반 stale 회수 쿼리가 `updated_at`/`claimed_at` 비교로 존재(`Omnichannel.php:395-399` 900s·`Catalog.php:1700` 600s·`JourneyBuilder.php:396` 1800s) — 전용 lease/lock 만료 인덱스 아니라 인접 잡/저니 도메인의 시간 컬럼 스캔.
- **큐 순서 조회(7항 인접)**: 실존 대기열은 `ORDER BY id ASC` FIFO(`Catalog.php:1716`·`Omnichannel.php:405`) — 승인 Sequence 정렬 아님.
- **Cursor Version 인덱스(11항) 부재**: Cursor(§45) ABSENT — version 컬럼·인덱스 없음(낙관적 version CAS도 ABSENT).

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: Instance/Stage/Level/Step/Cursor/Transition/Conflict/Snapshot/Reconciliation 엔티티 신설이 선행되어야 인덱스가 성립. 근원적으로 Approval Chain(§3.1)·Assignment(§3.4) 부재에 종속.
- cover: 0

## 4. 확장/구현 방향 (설계)

- **순신규**. 인덱스는 구현 대상 테이블과 동시 설계 — 후행 애드혹 금지(운영 규모에서 full-scan 유발).
- **핫패스 우선순위**: (3) Waiting Assignment/Claim/Decision·(4) Transition/Advancement Pending·(10) Lock/Lease Expiration·(6) Orphaned/Deadlocked 는 **cron/워커 폴링 대상**이라 복합 인덱스(tenant + status + expires_at)가 필수. 실존 stale-회수 쿼리(`Omnichannel.php:395-399`·`Catalog.php:1700`·`JourneyBuilder.php:396`)가 이 접근 패턴의 참조 사례 — 동일하게 시간 컬럼 인덱스로 커버.
- **Idempotency 인덱스**: 범용 event idempotency key(§48)에 UNIQUE(tenant, instance, event_type, idempotency_key) — 실존 UNIQUE 멱등(`JourneyBuilder.php:454`·`Paddle.php:343-348`)을 일반화한 확장.
- **Cursor Version 인덱스**: Fencing Token(§49) ABSENT·낙관적 version CAS ABSENT → Cursor Version 조회(11항)·Conflict(12항) 인덱스가 stale worker 탐지의 관측 경로. ★실위험: 인덱스 없이 fencing 검증을 열면 진행표시 조회가 O(n) 스캔이 되어 동시성 게이트가 성능상 무력화.
- **BLOCKED_PREREQUISITE**: 대상 엔티티 신설 전 인덱스 설계 무의미. 실 구현은 선행 4군 + 엔티티 스키마 확정 후.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
