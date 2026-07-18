# ADR — Decision Processing Core Governance (EPIC 06-A-03-02-01)

- **상태**: Accepted (설계 정본 · 코드 변경 0 · 구현은 선행 6군 신설 후 별도 승인세션)
- **차수**: 289차 13회차 (2026-07-18)
- **스펙**: [`SPEC_06A_03_02_01_DECISION_PROCESSING_CORE_VERBATIM`](../segmentation/SPEC_06A_03_02_01_DECISION_PROCESSING_CORE_VERBATIM.md)
- **전수조사(ⓑ)**: [`DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION`](../segmentation/DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION.md)
- **선행**: [`ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION`](ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION.md)(06-A-03-01) · [`ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE`](ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE.md)(06-A-02) · [`ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION`](ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md) · [`ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE`](ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)

---

## 1. 맥락 (Context)

EPIC 06-A-03-02-01은 승인 Actor의 의사결정을 Canonical Decision Command로 수신→검증→**불변 Decision Record + 원자적 Commit**으로 생성하는 Decision Processing Core를 요구한다(Action별 상세=06-A-03-02-02). §3은 6개 선행군(Approval·Authority·Delegation·Assignment·Sequential·Identity/Security)을 전제한다.

능력 기반 전수조사(ⓑ·2 에이전트·코드 정독): 승인 결정 = **in-place `status` UPDATE 4핸들러 산재**(Mapping/AdminGrowth/Alerting/Catalog). 불변 Decision Record·Command→Validation→Commit 분리·원자 Commit·Decision Outbox·Idempotency/Replay/Fencing 거의 전부 ABSENT.

## 2. 결정 (Decision)

### D-1. Canonical Decision Processing Core를 **신설**하되 실존 정본/패턴을 확장(Golden Rule)

| 실존 | §65 태그 | 확장 결정 |
|---|---|---|
| `Mapping::actorId` + maker-checker(자기승인 차단·정족수·fail-closed) | **CANONICAL** | Decision Actor Resolution/Validation의 정본(`Mapping.php:36-53,262-291`). 위조불가 신원·fail-closed를 전 결정경로로 승격. |
| Paddle 웹훅 UNIQUE 멱등 | **VALIDATED_LEGACY** | Decision Idempotency로 **일반화**(`Paddle.php:343-368`·현행 웹훅 국한). |
| omni_outbox claim/lease/SKIP LOCKED | **KEEP_SEPARATE(패턴 참조)** | 메시지 발송 전용. Decision Outbox/Lock/Lease의 **설계 원형**만 차용(`Omnichannel.php:390-448`)·코드 상속·중복 엔진 금지. |
| SecurityAudit::verify·Tenant Guard·app_user | **재사용 substrate** | Decision Audit(tamper-evident `SecurityAudit.php:56-68`)·격리·Canonical Identity 정본. |

### D-2. **CONSOLIDATION_REQUIRED** — 기존 승인 결정 4종을 Canonical Decision으로 흡수

`Mapping`(정족수 정본)·`AdminGrowth::approvalDecide`·`Catalog::approveQueue`(승인자 미기록 bulk)를 Canonical Decision Command→Commit→불변 Record로 통합(직접 status UPDATE 제거). `Decisioning.php`(마케팅 집계엔진)는 이름충돌·KEEP_SEPARATE.

### D-3. **BLOCKED_SECURITY** — `Alerting::actor` 헤더 위조 (★실 위험)

`Alerting::actor()`(`:33-35`)가 `X-User-Email` 헤더/`?actor=` 쿼리로 승인자 신원을 받아 **클라이언트 위조 가능** → action_request 승인/집행 감사 스푸핑. Canonical Actor Resolution(Mapping 패턴) 도입 전엔 이 경로의 결정을 신뢰 불가. **별도 수정세션 후보**(라이브 재증명).

### D-4. **구현 BLOCKED_PREREQUISITE** — 선행 6군 신설 후 별도 승인세션(RP-002)

| 선행군 | 상태 |
|---|---|
| §3.1 Approval · §3.2 Authority · §3.3 Delegation · §3.4 Assignment · §3.5 Sequential | **전부 ABSENT** |
| §3.6 Identity/Security | **PARTIAL**(Tenant Guard·SecurityAudit verify PRESENT·Org/Position/SoD/Actor Snapshot ABSENT) |

→ Decision Validation Pipeline이 재검증할 대상(Authority 행렬·Sequential Step 커서·Assignment work-item·Delegation 정의)이 **전무** → 입력 없는 검증기로 **공회전**. 특히 §3.5 Sequential 부재로 "다음 결재 단계 진행"을 표현할 상태 축이 없다. → **§72 per-entity 대부분 ABSENT/BLOCKED_PREREQUISITE·cover 0**이 정직판정. 이번 차수=설계 명세(코드 0).

### D-5. 경계 유지 — Decision ≠ Sequential Progression (§5.3)

Decision Commit 후 **Sequential Completion Reference Event**만 생성·Sequential Engine이 소비하여 Step Completion·다음 단계 진행. Decision Engine이 Cursor 직접 변경 금지. Action별 상세(APPROVE/REJECT/…)=06-A-03-02-02.

### D-6. Mandatory Integrity Control 고객설정 비활성 불가(§5.12)

Tenant Isolation·Canonical Actor Resolution·Assignment/Authority/Delegation Revalidation·Sequential State Validation·Idempotency·Decision Lock·Fencing Token·Immutable Record·Snapshot·Audit·Outbox·Duplicate Commit Guard — 무력화 금지.

## 3. ★실 위험 (별도 수정세션 후보)

1. **Alerting::actor 위조**(BLOCKED_SECURITY·D-3).
2. **Decision Record 불변성 부재** — in-place UPDATE로 과거 결정 소실(Correction/Reversal 불가).
3. **`Mapping::approve` TOCTOU** — 트랜잭션/FOR UPDATE 없는 approvals_json R-M-W → 동시 승인 경합(정족수 이중통과 이론창).
4. **Decision 도메인 Outbox/Idempotency/Replay/Fencing 전무** — 재전달/재시도/double-click 중복 결정 방어 산발.
5. **Commit 직전 재검증 부재**(Actor/Authority/Assignment).

## 4. 대안 (Considered)

- **A. 지금 Decision Core 구현** — 기각. 선행 6군 중 5군 ABSENT(D-4)·Validation 공회전. RP-002 위반.
- **B. 기존 승인 UPDATE를 Decision Record로 개칭** — 기각. 불변성·원자성·재검증 없이 이름만 바꾸면 가짜 녹색.
- **C. 설계 명세만(코드 0)+실존 정본 확장계획+선행 전제 명문화** — **채택**. 06-A-01/02/03-01/5-3-3-4 패턴 일관.

## 5. 귀결 (Consequences)

- (+) Mapping actor 정본·Paddle 멱등·omni_outbox 아웃박스 패턴·SecurityAudit의 정본 지위·확장점 확정.
- (+) 선행 6군 전제·실 위험 5건(특히 Alerting 위조·TOCTOU) 문서화 → 다음 세션이 순서(6군→Decision Core→Decision Actions)를 안다.
- (−) 이번 차수 런타임 기능 증가 0.
- (→) 다음: 선행 6군 실구현 → Decision Core 실 엔진 → EPIC 06-A-03-02-02 Decision Actions Governance.

## 6. 규율 준수

Golden Rule(Extend not Replace) · 중복 Decision 도메인 금지 · 무후퇴 · "결론의 근거도 재실증"(status=approved UPDATE ≠ Decision Record·코드 정독) · Mandatory Control 무력화 금지 · 코드 변경 0(설계) · RP-002 · ★치유된 이슈(parent_user_id 286차) 재플래그 금지.
