# DSAR — Reconciliation (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§57 RECONCILIATION — Canonical 상태와 파생/외부 상태를 대조해 Drift 를 탐지하는 정합 엔진.

비교(comparison type) 항목:
- Workflow Def ↔ Sequential Def
- Chain Version ↔ Sequential Version
- Stage / Level / Step Def ↔ Instance
- Sequence ↔ Runtime Order
- Dependency Def ↔ Runtime
- Current Cursor ↔ Actual Active
- Stage ↔ Child Level · Level ↔ Child Step
- Step ↔ Work Item / Assignment / Claim / Decision Reference
- Completion Event ↔ State
- Snapshot ↔ History
- Transition History ↔ State
- Idempotency ↔ Applied
- Lock / Lease ↔ Transition
- Workflow Engine / BPMN / ERP / Legacy ↔ Canonical

필드: reconciliation_id · instance_id · comparison type · source/canonical state · difference · affected stage/level/step · severity · detected_at · resolution · resolved_by/at · status · evidence.

(정합 결과 enum = §58 RECONCILIATION_STATUS — 별 문서 [[DSAR_APPROVAL_SEQUENTIAL_RECONCILIATION_STATUS]].)

## 2. 기존 구현 대조

- **대조할 두 진실원(源)이 없다**: Reconciliation 은 "Canonical Sequential 상태"와 "파생/외부 상태"라는 두 개의 실체를 전제한다. §GROUND_TRUTH 상 Sequential Definition/Instance·Stage/Level/Step·Cursor·Transition History·Snapshot 이 전부 ABSENT — 비교의 좌/우변 자체가 존재하지 않는다.
- **"reconcile" 명칭 실존은 재고 도메인**: `ChannelSync` 의 `reconcileChannelStock` 류는 **채널 재고 수량 정합**으로 승인 상태전이와 무관하다(키트 규율 2: 이름으로 능력 추론 금지 — 재고 reconcile 은 §57 대상 아님). 명칭이 겹칠 뿐 Canonical↔파생 승인상태 대조 능력은 아니다.
- **하드코딩 전이 3종에는 대조 substrate 자체가 없음**: catalog_writeback_job(`Catalog.php:80`)·admin_growth_approval(`AdminGrowth.php:146`)·mapping_change_request(`Mapping.php:287`)은 인라인 `SET status` 로 상태가 곧 진실이며, 이를 검증할 별도 Definition/Snapshot/Transition History 가 없으므로 Drift 개념이 성립하지 않는다.
- Workflow Engine(camunda/temporal/bpmn/saga)=ABSENT 전무 → "Workflow Engine/BPMN/ERP ↔ Canonical" 비교축도 대상 부재.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §3.1 Approval Chain(Sequential Def)·다단 Stage/Level/Step·Cursor(§45)·Snapshot(§52)·Transition Instance(§20) 전부 선행 필수. 이들이 없으면 대조할 Canonical/파생 쌍이 없음(BLOCKED_PREREQUISITE).
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **순신규**. Reconciliation 은 State Machine·Snapshot·Cursor·Transition History 가 실존한 **뒤에야** 의미를 갖는 후행 정합 계층이다 — 선행 없이 배선 금지.
- ★**재고 reconcile 재사용 금지**: `reconcileChannelStock` 는 수량 병합 로직으로 승인 상태 Drift 탐지와 코드/개념 공유 불가. 혼입 시 중복·오판(재고 정합을 승인 정합으로 오독).
- **무후퇴 원칙**: Reconciliation 은 탐지 전용 — Drift 발견 시 상태를 **임의 덮어쓰기 금지**, 반드시 별도 Recovery Transition(§42)/Manual Review 로만 교정(§54 REPLAY 원칙과 동일).
- Drift 결과는 §58 STATUS enum 으로 분류하고, Cross-Tenant·Multiple Active·Cursor 불일치 등 Critical 은 §59 CRITICAL_GAP_POLICY 로 승격.
- **BLOCKED_PREREQUISITE**: 선행 5군 + State Machine/Snapshot/Cursor 신설 후.

관련: [[DSAR_APPROVAL_SEQUENTIAL_RECONCILIATION_STATUS]] · [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
