# DSAR — Approval Decision Transition Definition (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`§29 TRANSITION_DEFINITION` — 필수 필드(원문 전사):

`def_id` · `decision_version_id` · transition code · source/target state · triggering event · guard/precondition references · lock required · lease/authority/delegation/assignment revalidation required · snapshot/audit/outbox required · retry/failure policy · priority · valid_from/to · status · evidence.

## 2. 기존 구현 대조

- **전이 정의 전면 부재**: `def_id`·`decision_version_id`·source/target state·triggering event·guard references를 선언하는 전이 정의가 실존하지 않는다. 상태 변경은 정의를 거치지 않고 **직접 UPDATE**로 이뤄진다.
- `AdminGrowth::approvalDecide`(:1330) 단일 UPDATE status/decided_by — source/target·트리거 이벤트·가드 참조 없이 pending→approved/rejected를 코드로 직접 flip. enum 검사(:1321)·이미처리 409(:1327)는 인라인 가드일 뿐 전이 정의가 아니다.
- `Alerting::decideAction`(:594) 단일 UPDATE + `executeAction`(:601-665) 별도 :631 pause + :653 UPDATE — 전이가 **두 비원자 UPDATE**로 흩어져 있고 정의·revalidation 요구가 선언되지 않음.
- `Catalog::approveQueue`(:2397) bulk UPDATE status='queued' — CAS-lite WHERE status가 유일한 전이 조건, 정의 없음.
- `AgencyPortal.php:381,400` — 하드코딩 status flip(§3.5 Sequential ABSENT의 가장 치명적 근거). 전이가 코드에 박제됨.
- **버전화·재검증 요구 부재**: `decision_version_id`별 전이 세트가 없어 정책 변경 이력이 없다. lock required·lease/authority/delegation/assignment revalidation required·snapshot/audit/outbox required 같은 전이별 부수효과 계약이 전무 → `Mapping::approve` TOCTOU(:273→:288)가 재검증 없는 직접 UPDATE의 실증.

## 3. 판정

- Verdict: **ABSENT** — 전이 정의 없음. 직접 UPDATE로 상태 변경.
- 선행 의존: §27 State Machine(PARTIAL·암묵 상태)·§24 Guard(PARTIAL·인라인)·§28 Event(ABSENT). 전이 정의는 형식 상태·가드·트리거 이벤트를 참조하므로 이 세 축이 선행. 나아가 revalidation 대상 Assignment/Authority/Delegation(§3.2/§3.3/§3.4 ABSENT)이 있어야 전이별 재검증 요구가 의미를 가진다.
- cover: **0** (직접 UPDATE는 전이 정의의 부재이지 대체물 아님).

## 4. 확장/구현 방향 (설계)

- **직접 UPDATE → 선언적 전이 정의**: `AdminGrowth`(:1330)·`Alerting`(:594,:653)·`Catalog`(:2397)·`AgencyPortal`(:381,400)의 status flip을 `transition_definition`(def_id·decision_version_id·source/target·triggering event·guard refs·revalidation/snapshot/audit/outbox required)으로 대체. 상태기계(§27)와 정합.
- **버전화**: 전이 세트를 `decision_version_id`에 바인딩하여 정책 변경을 불변 버전으로 관리(§10 VERSION의 STATE_POLICY_CHANGE 축).
- **전이별 부수효과 계약**: 각 전이에 lock required·lease/authority/delegation/assignment revalidation·snapshot/audit/outbox required를 명시하여 Commit 직전 재검증(§32)·원자 경계(§48)를 정의가 강제하게 함. omni_outbox(`Omnichannel.php:390-448`) lock/lease를 전이 lock 설계 원형으로 참조(KEEP_SEPARATE).
- **하드코딩 flip 제거 우선**: `AgencyPortal.php:381,400` 이진 flip이 살아있는 한 Sequential 결정이 성립 못함 — 선행 §3.5 신설이 본 엔티티의 전제.
- 실 구현 = §27/§24/§28·선행 6군 신설 후 별도 승인 세션. 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
