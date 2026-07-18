# DSAR — Sequential Level Instance (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§14 LEVEL_INSTANCE 필수 필드:
- level_instance_id · stage_instance_id · chain_level_id · chain_level_version
- level sequence · level type · mandatory · blocking · optional
- activation policy · completion policy · skip policy
- participant resolution reference · assignment requirement
- current step instance id
- level status(→ 상세 enum = §16 별 문서 [[DSAR_APPROVAL_SEQUENTIAL_LEVEL_STATUS]])
- activated_at · completed_at · skipped_at · suspended_at · blocked_at
- version · status · evidence

## 2. 기존 구현 대조

- **다단 Level Instance 자체가 전무.** `current_step/current_stage/current_level/step_order/stage_order/sequence_no` backend 전체 **no hits**(§GROUND_TRUTH 워크플로/다단/cursor). Level 이라는 순차 승인 단위가 실체로 존재하지 않는다.
- **부모(Stage Instance)도 ABSENT** → `stage_instance_id` FK 가 참조할 대상 자체가 없다(§13 Stage Instance 부재).
- **`chain_level_id`·`chain_level_version` 이 참조할 Approval Chain 이 ABSENT**(§3.1: `approval_chain/workflow` 0 · `Catalog.php:2300` approvalCreate·`Catalog.php:395` requiresHighValueApproval 은 도메인특화 승인값이지 Chain Level 아님).
- **`participant resolution reference`·`assignment requirement`·`current step instance id`→assignee 가 참조할 Assignment SoT 가 ABSENT**(§3.4: `work_item/assignment/queue` 0 · Step→assignee 해석 실체 없음).
- 최근접 상태 커서 = JourneyBuilder `current_node`(`JourneyBuilder.php:44,68,504`)이나 이는 **마케팅 그래프 단일 노드 커서**이지 다단 승인 Level 이 아니다(§GROUND_TRUTH: KEEP_SEPARATE·승인무관).

## 3. 판정

- Verdict: **ABSENT / BLOCKED_PREREQUISITE**
- 선행 의존: §3.1 Approval Chain(chain_level_id·version 참조 불가) · §3.4 Assignment(participant resolution·assignment requirement·step→assignee 참조 불가) + 부모 §13 Stage Instance 부재
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **순신규.** 대응하는 실존 레거시 자산이 없다(하드코딩 status 3종은 전부 단발/정족수·다단 Level 개념 부재 — §GROUND_TRUTH).
- 활성화 원자성은 **재생성 금지·기존 primitive 재사용**: CAS 조건부 UPDATE(`Catalog.php:1726-1730`·`JourneyBuilder.php:415-425`)를 Level Activation 의 단일 Commit 게이트로 인용한다.
- **Mandatory Control**: `mandatory`·`blocking` Level 의 완료 검증은 `status=COMPLETED` 만으로 불충분(§28) — Completion Event + Snapshot 병행이 신설 조건. `participant resolution reference` 가 Null 이면 Fail-closed(§21 Mandatory Guard=Fail Closed).
- **무후퇴**: Level Instance 는 선행 4군(Approval/Authority/Delegation/Assignment) 신설 후에만 실체를 가진다 → 본 엔티티 실 구현은 **BLOCKED_PREREQUISITE**, 별도 승인세션(RP-002).
- **실위험**: 활성화 경쟁 시 Fencing Token 부재(§GROUND_TRUTH: `fencing` 0)로 stale worker overwrite 이론창 존재 → Level Activation 에 Fencing Token 을 신설 요구(§49 적용대상).

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
