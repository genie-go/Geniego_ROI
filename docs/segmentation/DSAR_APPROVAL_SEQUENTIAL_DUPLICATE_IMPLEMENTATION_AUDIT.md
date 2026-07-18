# DSAR — Duplicate Implementation Audit (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 목적: Sequential Approval State Machine 신설 전, **실존 중복 후보의 정직한 열거**(이름 매치 아닌 코드 정독). 중복 신설 금지·기존 확장 우선(Golden Rule).

## 1. 원문 전사 (Canonical Contract)

§67 DUPLICATE_IMPLEMENTATION_AUDIT — 아래 중복/난립 패턴을 사전 탐지·금지 대상으로 명시:
1. 여러 State Machine / Current Step Column / Workflow Status Table 병존
2. Stage / Level / Step 혼합(구분 없이 한 컬럼에 압축)
3. 상태 문자열 직접변경(전이 정의 없이 `status=next`)
4. DB Trigger / Stored Procedure / Scheduler / Event Consumer 자동진행
5. Sequence 단독진행(가드 없이 순번만으로 진행)
6. Completion Event 없이 Completed 마킹
7. Snapshot 없이 전환
8. Lock 없이 Cursor 갱신
9. Idempotency 없는 Transition
10. Fencing 없는 Worker
11. 중복 활성 / 중복 Completion
12. Mandatory Skip
13. Pause / Suspension 중 진행
14. Orphan / Deadlock
15. Recovery 덮어쓰기
16. 과거 재해석
17. Cross-Tenant
18. Active Version 직접수정
19. Mandatory Guard 제거
20. Workflow Engine 이중 진실원
21. Legacy Status 불일치

## 2. 기존 구현 대조 (실존 중복 후보 정직 열거)

### 2.1 `catalog_writeback_job` — 하드코딩 전이 (전이할 SoT로 흡수)
- `status VARCHAR(30) DEFAULT 'queued'` 자유문자열(`Catalog.php:80`)·허용상태/전이제약 없음.
- 전이 전부 인라인 조건부 UPDATE: 승인 `SET status='queued' WHERE status='pending_approval'`(`Catalog.php:2397`)·선점 `WHERE id=? AND status IN('queued','awaiting_credentials')`(`:1726`)·복구(`:1700`, 600s)·재부활(`:1710`).
- 매칭 패턴: (1)(3)(4·cron 폴링)(8·Lock 없이 상태 갱신 — CAS는 있으나 Cursor 개념 없음)(9·범용 Idempotency 없음)(10·Fencing 없음).
- 판정: **VALIDATED_LEGACY(+CONSOLIDATION_REQUIRED)**. 하드코딩 전이 3종의 정형화 대상 — State Machine 신설 시 이 전이 로직을 Transition Definition으로 **흡수(전이)**하되 무후퇴(§71).

### 2.2 `admin_growth_approval` — 하드코딩 단발 전이
- `status VARCHAR(20) DEFAULT 'pending'`(`AdminGrowth.php:146`)·`pending→approved|rejected` 단일결정 인라인 UPDATE(`:1330`)·이미처리 409 가드(`:1327`)·후속 ref_type별 if/elseif 분기(`:1334-1341`).
- 매칭 패턴: (1)(3)(6·Completion Event/Snapshot 없이 approved 마킹)(7).
- 판정: **CONSOLIDATION_REQUIRED**. 단발 승인 SoT로 흡수 대상. 순차 아님(단일 결정).

### 2.3 `mapping_change_request` — Maker-Checker M-of-N 정족수 (별 개념·순차 아님)
- `status = count(approvals) >= required_approvals ? approved : pending`(`Mapping.php:287`)·approvals_json push(`:285`)·재승인 409(`:262`)·자기승인 차단(`:268`)·동일승인자 dedup(`:279`).
- **동일 레벨 N명 병렬 정족수** — 승인자 간 순서·단계·의존성 없음. 다단 순차의 중복이 **아니다**(반례 아님).
- 판정: **VALIDATED_LEGACY(별 개념·KEEP)**. Sequential State Machine이 이를 대체하지 않음 — Maker-Checker 정족수는 독립 승인 패턴으로 존치. 무후퇴(§71).

### 2.4 JourneyBuilder 저니 — 마케팅 그래프순회 상태머신 (KEEP_SEPARATE)
- cursor=`journey_enrollments.current_node`(`JourneyBuilder.php:44,68,504`)·상태 active/waiting/processing/completed+resume_at/wait_until(`:82`)·pause/resume=resume_at→cron(`:403`)·원자적 선점 CAS(`:415-425`)·stale(30분) 회수(`:396`)·멱등 journey_node_sent UNIQUE(`:446-490`)·releaseSendOnce(`:463`).
- 성격: 노드/엣지 그래프 순회(edges 기반 다음 노드)·**마케팅 전용·승인 무관**.
- 판정: **KEEP_SEPARATE**. Sequential Approval이 이를 흡수·대체하지 **않는다**(도메인 상이). 단 상태머신/멱등/pause-resume/lease 패턴의 **가장 성숙한 참조정본** — 설계 인용가치 높음(구현 복제 금지·참조만).

### 2.5 omni_outbox — 동시성 primitive (CANONICAL·재사용)
- `FOR UPDATE SKIP LOCKED`(`Omnichannel.php:405`)·폴백 조건부 UPDATE(`:429-441`)·claim_id/claimed_at(`:97,410,418`)·해제(`:560`)·시간기반 stale 회수(`:395-399`, 900s).
- 판정: **CANONICAL**. Transition Lock/Lease(§46/§47)가 재사용할 검증된 동시성 기반 — 신설 State Machine은 이 primitive를 **재사용(확장)**하고 새 lock 메커니즘을 난립시키지 않음.

### 2.6 부재로 인한 중복 불가 항목
- 워크플로 엔진 이중 진실원(20): `camunda/temporal/bpmn/saga/state_machine/CREATE TRIGGER` 0건 — 이중 엔진 자체가 없어 중복 위험 현재 없음(신설 시 단일 엔진 유지 필수).
- DB Trigger/Stored Procedure 자동진행(4): `CREATE TRIGGER` 0건 — 실존 자동진행은 **cron 폴링**(`Catalog.php:1716`·`Omnichannel.php:405`)뿐(DB 계층 자동진행 없음).

## 3. 판정

- Verdict: **부분 실존 중복 후보 확인** — State Machine 자체는 **ABSENT**이나, 정형화 시 흡수/존치 대상 5종 실존.
  - 흡수(CONSOLIDATION): `catalog_writeback_job`(VALIDATED_LEGACY+CONSOLIDATION)·`admin_growth_approval`(CONSOLIDATION_REQUIRED).
  - 존치(KEEP): `mapping_change_request`(VALIDATED_LEGACY·별 개념)·JourneyBuilder(KEEP_SEPARATE)·omni_outbox(CANONICAL·재사용).
- 선행 의존: State Machine·Transition Def/Instance·Stage/Level/Step ABSENT → 실 흡수 구현은 선행 4군 신설에 종속(BLOCKED_PREREQUISITE).
- cover: 흡수 후보 2 + 존치/재사용 3 = 실존 5(근거 §2 file:line). 순수 Sequential State Machine cover: 0.

## 4. 확장/구현 방향 (설계)

- **중복 신설 금지(Golden Rule)**: Sequential State Machine 신설 시 새 status 컬럼·새 lock·새 큐를 난립시키지 말고 —
  - `catalog_writeback_job`·`admin_growth_approval` 하드코딩 전이를 **Transition Definition(§19)으로 흡수(전이)**(무후퇴·§71).
  - omni_outbox CAS/SKIP LOCKED를 **Transition Lock/Lease(§46/§47)의 CANONICAL 기반으로 재사용**.
  - JourneyBuilder는 **참조만**(복제 금지·KEEP_SEPARATE).
  - `mapping_change_request` M-of-N은 **존치**(순차와 별 개념·대체 금지).
- **★실위험 편입**: 흡수 대상 전이는 현재 Fencing(10)·범용 Idempotency(9)·Snapshot(7) 없이 진행 — 정형화 시 이 세 gap을 반드시 채워 §59 Critical Gap을 해소(그렇지 않으면 중복 흡수가 결함까지 상속).
- **단일 진실원 유지(20)**: 이중 워크플로 엔진 금지 — 신설 State Machine 하나만 진실원. 실존 하드코딩 전이는 흡수 후 원본 제거(고아 stub 금지).
- **BLOCKED_PREREQUISITE**: 흡수/정형화 실 구현은 선행 4군 + Fencing/범용 Idempotency 신설 후 별도 승인세션.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
