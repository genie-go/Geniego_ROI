# DSAR — Sequential Transition Definition (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§19 TRANSITION_DEFINITION 필수 필드:
- def_id · sequential_version_id · transition code · name · scope type
- source state · target state · triggering event
- guard reference · precondition reference · postcondition reference
- assignment validation required · authority validation required · delegation validation required
- lock required · lease required · snapshot required · audit required
- retry policy · failure policy · compensation reference · priority
- valid_from · valid_to · status · evidence

SCOPE_TYPE enum: INSTANCE / STAGE / LEVEL / STEP / CURSOR / SYSTEM.

## 2. 기존 구현 대조

- **전이 정의 테이블이 없다.** 허용 전이는 선언적 데이터가 아니라 **인라인 조건부 UPDATE 의 WHERE 절(암묵 precondition)**로 코드에 산재:
  - `catalog_writeback_job`: 승인 `WHERE status='pending_approval'`(`Catalog.php:2397`)·선점 `WHERE id=? AND status IN('queued','awaiting_credentials')`(`Catalog.php:1726`)·복구 `WHERE status='processing' AND updated_at<now-600s`(`Catalog.php:1700`)·재부활(`Catalog.php:1710`). **전이 정의/전이 함수/guard 레지스트리 없음**(§GROUND_TRUTH).
  - `admin_growth_approval`: `pending→approved|rejected` 를 코드가 결정(`AdminGrowth.php:1330`), source/target/event 를 선언한 데이터 없음.
  - `mapping_change_request`: `count>=required ? approved : pending`(`Mapping.php:287`) — 정족수 계산이지 전이 정의 아님.
- guard/precondition/postcondition·assignment/authority/delegation validation required·lock/lease/snapshot required·compensation·priority 를 선언하는 **전이 메타데이터가 전무**. 검증은 산발적 if/409(`AdminGrowth.php:1327`·`Mapping.php:262,268`)로만 존재.
- scope type(INSTANCE/STAGE/LEVEL/STEP/CURSOR)이 참조할 다단 구조 자체가 ABSENT(§GROUND_TRUTH 다단 Stage/Level/Step ABSENT).

## 3. 판정

- Verdict: **ABSENT** (전이정의 테이블 없음 · 인라인 `status=next` WHERE 절 암묵 전이만)
- 선행 의존: §3.1 Approval Chain(sequential_version·scope 참조) · §3.2 Authority(authority validation) · §3.3 Delegation(delegation validation) · §3.4 Assignment(assignment validation) · §17 State(source/target state)
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **순신규 전이 정의 테이블.** 산재된 WHERE 절 암묵 precondition 을 선언적 (source state, target state, triggering event, guard/precondition ref) 로 승격 — **정형화 대상(CONSOLIDATION)이지 재구현 아님**.
- **실존 CAS 술어를 전이 실행 primitive 로 인용(CANONICAL)**: `Catalog.php:1726-1730` 조건부 UPDATE + rowCount CAS 를 전이 정의의 lock/atomic-commit 구현 근거로 사용. 새 동시성 모델 도입 금지.
- **Mandatory Guard=Fail Closed(§21)**: `assignment/authority/delegation validation required`·`lock/lease/snapshot/audit required` 플래그가 true 인 전이는 대응 선행군(§3.2~§3.4)이 신설·통과돼야 Commit. 선행 부재 상태에서 전이는 Fail-closed(BLOCKED).
- **실위험**: `lock required`·전이 원자성에 Fencing Token 이 필요하나 현행 ABSENT(§GROUND_TRUTH: `fencing` 0) → 전이 정의에 fencing 요구를 명시하고 stale worker overwrite 를 §49 로 차단.
- **무후퇴**: catalog_writeback_job/admin_growth_approval 기존 전이 동작 보존(정형화가 동작을 바꾸면 안 됨). 실 구현 = 선행 신설 후 별도 승인세션 → **BLOCKED_PREREQUISITE**.

관련: [[DSAR_APPROVAL_SEQUENTIAL_TRANSITION_INSTANCE]] · [[DSAR_APPROVAL_SEQUENTIAL_STATE]] · [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
