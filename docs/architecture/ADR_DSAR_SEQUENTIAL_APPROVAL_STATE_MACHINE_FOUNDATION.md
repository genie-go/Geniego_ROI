# ADR — Sequential Approval State Machine Foundation Governance (EPIC 06-A-03-01)

- **상태**: Accepted (설계 정본 · 코드 변경 0 · 구현은 선행 5군 신설 후 별도 승인세션)
- **차수**: 289차 13회차 (2026-07-18)
- **스펙**: [`SPEC_06A_03_01_SEQUENTIAL_STATE_MACHINE_VERBATIM`](../segmentation/SPEC_06A_03_01_SEQUENTIAL_STATE_MACHINE_VERBATIM.md)
- **전수조사(ⓑ)**: [`DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION`](../segmentation/DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION.md)
- **선행**: [`ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE`](ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE.md)(06-A-02) · [`ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION`](ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md) · [`ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE`](ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md) · [`ADR_DSAR_REBATE_APPROVAL_FOUNDATION`](ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

---

## 1. 맥락 (Context)

EPIC 06-A-03-01은 Chain의 각 Stage/Level/Step을 순서대로 실행·이전 완료 검증·현재 실행가능 단계 결정·중복실행/순서건너뛰기/동시진행/상태역전/재처리오류를 방지하는 **Canonical Sequential Approval State Machine**을 요구한다(Decision 상세처리는 06-A-03-02로 이관). §3은 5개 선행군(Approval·Authority·Delegation·Assignment·Identity/Org/Security)을 전제한다.

능력 기반 전수조사(ⓑ·2 에이전트·코드 정독) 결과: **명시적 State Machine·Transition Definition·다단 Stage/Level/Step·Sequence ordering·Fencing Token·Deadlock·Simulation·Replay 전부 ABSENT.** 실존=하드코딩 status 전이·CAS 동시성 primitive·마케팅 저니 그래프순회.

## 2. 결정 (Decision)

### D-1. Canonical Sequential State Machine을 **신설**하되 실존 패턴/primitive를 확장한다(Golden Rule)

| 실존 | §66 태그 | 확장 결정 |
|---|---|---|
| CAS 조건부 UPDATE·`FOR UPDATE SKIP LOCKED`·claim_id/claimed_at | **CANONICAL(동시성 primitive)** | Transition Lock/Lease/Concurrent Prevention은 이 관용구(`Catalog.php:1726-1730`·`Omnichannel.php:405,429-441`) 재사용. ★단 **fencing token(단조증가)·낙관적 version CAS 부재**가 실결함 — 신설 시 필수 추가. |
| `journey_enrollments` 상태머신(current_node·resume_at/wait_until·CAS 선점·stale 회수·journey_node_sent 멱등) | **KEEP_SEPARATE(마케팅)** | 승인 도메인 아님(재분류 금지). 단 State Machine/Cursor/Pause-Resume/Lease/Idempotency의 **가장 성숙한 참조 구현**(`JourneyBuilder.php:388-490`) — 설계 패턴 인용. |
| catalog_writeback_job 하드코딩 전이 | **VALIDATED_LEGACY(+CONSOLIDATION)** | 상태 전이를 명시적 Transition Definition/State Machine으로 **정형화**할 후보(`Catalog.php:80,1700-1731,2397`). 새 status 컬럼 병설 금지. |
| admin_growth_approval 단발승인 | **CONSOLIDATION_REQUIRED** | 승인 SoT로 흡수(`AdminGrowth.php:142-149,1327-1341`). |
| Paddle/journey_node_sent UNIQUE 멱등 | **VALIDATED_LEGACY** | 범용 Idempotency Key로 확장(현행=도메인별 UNIQUE만·`Paddle.php:343-348`). |

### D-2. **KEEP_SEPARATE_WITH_REASON** (순차 승인 선행 art로 재분류 금지)

- `mapping_change_request` = **M-of-N 정족수 병렬**(동일 레벨 N명·순서/단계/의존성 없음·`Mapping.php:287`). 다단 순차 Stage의 반례 아님.
- `journey_enrollments` = 마케팅 그래프순회. DLQ replay(`routes.php:1927-1932`) = 데드레터 재처리(상태머신 리플레이 아님). `Wms::reconcileChannelStock` = 재고 정합(승인 아님).

### D-3. **구현 BLOCKED_PREREQUISITE** — 선행 5군 신설 후 별도 승인세션(RP-002)

| 선행군 | 상태 |
|---|---|
| §3.1 Approval Chain/Workflow | **ABSENT** |
| §3.2 Authority Matrix | **ABSENT** |
| §3.3 Delegation | **ABSENT** |
| §3.4 **Assignment**(06-A-02 감사) | **ABSENT** — ★Step Activation의 assignee 연결(Work Item·Candidate·Queue) 해석 실체 없음 → 활성화 전이 공회전 |
| §3.5 Identity/Org/Security | **PARTIAL**(Tenant Guard·SecurityAudit verify PRESENT·나머지 ABSENT) |

→ 다단 Stage/Level/Step이 참조할 Chain·Assignment SoT 전무 → **§73 per-entity 대부분 ABSENT/BLOCKED_PREREQUISITE·cover 0**이 정직판정. 이번 차수=설계 명세(코드 0).

### D-4. 경계 유지 — Step Completion ≠ Decision (06-A-03-02)

Step Completion은 Decision Commit Reference + Completion Event 수신 후에만. 이번 블록은 **Event 수신 + State Progression Foundation만** 구현 대상(설계). Decision Action 상세=06-A-03-02.

### D-5. Mandatory State Control 고객설정 비활성 불가(§5.12)

Tenant Isolation·Version·Previous Completion·Duplicate Active Step·Idempotency·Transition Lock·Fencing Token·Immutable History·Snapshot·Authority Revalidation Hook·Assignment Validation Hook·Reconciliation — 설정 무력화 금지(구현 시 강제).

## 3. ★실 위험 (별도 수정세션 후보 — 이번엔 설계만)

1. **Fencing Token 부재** — 전 동시성 경로(catalog CAS·omni_outbox·journey)가 claim_id 동등성/시간TTL만·**단조 fencing 없음** → stale worker overwrite 이론창(현재 CAS+상태가드로 대부분 차단). State Machine Transition Lock 신설 시 fencing 필수(§49).
2. **범용 Idempotency Key 부재** — 도메인별 UNIQUE(Paddle notification_id·journey_node_sent)만·범용 event idempotency 미들웨어 없음 → 재전달/재시도 중복전이 방어 산발적.
3. **낙관적 version CAS 부재** — expected-version 기반 동시전이 방어 없음(CAS-on-status만).
4. **명시적 상태전이 정의 부재** — `status=next` 하드코딩 산재 → 허용전이 제약·guard 레지스트리 없음(불법 전이 정적 검증 불가).

## 4. 대안 (Considered)

- **A. 지금 State Machine 구현** — 기각. 선행 5군 중 4군 ABSENT(D-3). Assignment 부재로 Step→assignee 공회전. 반쪽=가짜 녹색·RP-002 위반.
- **B. JourneyBuilder 상태머신을 승인으로 재사용** — 부분 채택(패턴 참조·D-1). 단 마케팅 그래프순회는 승인 다단 Stage/Level/Step·정족수·SoD와 도메인 상이(KEEP_SEPARATE) — 직접 전용 금지.
- **C. 설계 명세만(코드 0)+실존 패턴 확장계획+선행 전제 명문화** — **채택**. 06-A-01/02/5-3-3-4 패턴 일관.

## 5. 귀결 (Consequences)

- (+) 동시성 primitive(CANONICAL)·상태전이 정형화 대상·JourneyBuilder 참조패턴의 정본 지위 확정 → 구현이 재구현 없이 착수.
- (+) 선행 5군 전제·실 위험 4건(특히 fencing/idempotency) 문서화 → 다음 세션이 순서(5군→06-A-03-01→06-A-03-02)를 안다.
- (−) 이번 차수 런타임 기능 증가 0.
- (→) 다음: 선행 5군 실구현 → 06-A-03-01 실 State Machine → EPIC 06-A-03-02 Decision Processing & Action Engine.

## 6. 규율 준수

Golden Rule(Extend not Replace) · 중복 State Machine 금지 · 무후퇴 · "결론의 근거도 재실증"(status 컬럼≠State Machine·코드 정독) · Mandatory Control 무력화 금지 · 코드 변경 0(설계) · RP-002.
