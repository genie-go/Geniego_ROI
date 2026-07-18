# DSAR — Sequential Step Instance (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§15 STEP_INSTANCE 필수 필드:
- step_instance_id · level_instance_id · step definition id · step sequence
- step type(→ enum = §15 별 문서 [[DSAR_APPROVAL_SEQUENTIAL_STEP_TYPE]]) · mandatory · blocking
- assignment required · claim required
- work item id · assignment id · assignment version
- original participant subject id · current assignee subject id
- delegation version id · authority version id
- activation policy · completion policy · skip policy
- current state · previous state
- activated_at · assignment_ready_at · claimed_at · decision_wait_started_at · completed_at · skipped_at · paused_at · suspended_at · blocked_at
- version · status · evidence
- (STEP_STATUS 상세 enum = §16 별 문서 [[DSAR_APPROVAL_SEQUENTIAL_STEP_STATUS]])

## 2. 기존 구현 대조

- **Step 이라는 순차 승인 단위가 전무.** `step_order/step_sequence/current_step` backend 전체 **no hits**(§GROUND_TRUTH 다단 Stage/Level/Step ABSENT). 큐 순서는 `ORDER BY id ASC` FIFO(`Catalog.php:1716`·`Omnichannel.php:405`)이지 Step sequence 가 아니다.
- **★ Step→assignee 연결의 실체가 없다**(핵심 결함): §3.4 Assignment ABSENT — `work item id`·`assignment id`·`assignment version`·`original participant subject id`·`current assignee subject id` 가 참조할 Assignment/Work Item SoT 가 존재하지 않는다(`work_item/assignment/queue` 0 · 289차 13회차 감사). Step Activation 이 assignee 를 연결하려 해도 **공회전**한다.
- **`delegation version id` 참조 대상 ABSENT**(§3.3 Delegation 부재).
- **`authority version id` 참조 대상 ABSENT**(§3.2 Authority Matrix 부재 · `TeamPermissions.php:120,136` roleOf/isManagerAdmin = 정적 role 서열이지 버전화된 Authority 아님).
- 최근접 원자적 소유 획득 = omni_outbox claim_id/claimed_at(`Omnichannel.php:97,410,418,560`)·FOR UPDATE SKIP LOCKED(`Omnichannel.php:405`)이나 이는 **큐 소비자 워커 선점**이지 승인 Step 의 assignee claim 이 아니다(§GROUND_TRUTH: CANONICAL primitive·상이 도메인).

## 3. 판정

- Verdict: **ABSENT / BLOCKED_PREREQUISITE**
- 선행 의존: §3.4 Assignment(★Step→assignee 실체 없음·최다 차단) · §3.2 Authority(authority version) · §3.3 Delegation(delegation version) · 부모 §14 Level Instance
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **순신규.** Step Instance 는 선행 5군 중 최소 3군(Assignment·Authority·Delegation)이 신설돼야 필드가 참조 무결성을 얻는다.
- **claim/lease primitive 재사용(재생성 금지)**: `claim required` 의 원자적 획득은 omni_outbox 패턴(`Omnichannel.php:405` SKIP LOCKED·`:395-399` claimed_at+TTL 900s 회수)과 JourneyBuilder CAS(`JourneyBuilder.php:415-425`)를 참조 정본으로 인용한다.
- **Mandatory Control(§28 Previous Step Validation)**: `previous state`·완료 검증은 `status=COMPLETED` 만으로 불충분 → Completion Event + Snapshot + Decision Commit Reference 병행. `mandatory`+`blocking` Step 은 Fail-closed.
- **실위험**: ① Assignment SoT 부재 시 `WAITING_FOR_ASSIGNMENT` 가 영구 정체(Orphan §43: "Active Step 인데 Work Item 없음") ② Fencing Token 부재(§GROUND_TRUTH: `fencing` 0)로 claim 경쟁 시 stale worker overwrite. Step Activation·Claim 에 Fencing Token 신설 요구(§49).
- **무후퇴**: 실 구현 = 선행 신설 후 별도 승인세션(RP-002). 본 문서는 설계 명세.

관련: [[DSAR_APPROVAL_SEQUENTIAL_STEP_TYPE]] · [[DSAR_APPROVAL_SEQUENTIAL_STEP_STATUS]] · [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
