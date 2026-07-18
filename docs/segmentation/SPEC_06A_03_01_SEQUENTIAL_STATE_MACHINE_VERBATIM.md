<!--
  ★선영속(ⓐ) — EPIC 06-A-03-01 Sequential Approval State Machine Foundation Governance 스펙 원문.
  289차 13회차 사용자 제공. 소실 방지 verbatim 골격 보존. 판정 전 원문 고정.

  ═══ 착수 전 필독: 측정된 선행조건 상태 (289차 11·12·13회차 감사 실측) ═══
  §3 선행조건 5군 대부분 ABSENT — 이 State Machine은 없는 기반 위에 얹힌다:
   - §3.1 Approval Foundation: 범용 chain/stage/level/resolution/workflow 0(단발 승인 3종만·flat). cover 0.
   - §3.2 Authority Foundation: Authority Matrix/Resolution 0(5-3-3-4 감사·개념 부재).
   - §3.3 Delegation Foundation: Approval Delegation 개념 0(06-A-01 감사).
   - §3.4 Assignment Foundation: ★289차 13회차 감사=EPIC Assignment Engine 부재(Work Item/Assignment/Candidate/Resolution/Queue Version/Claim/Lease/Lock/Snapshot 전무). 실존=catalog_writeback_job 승인큐(VALIDATED_LEGACY)+omni_outbox claim/lease(CANONICAL)만·per-approver 라우팅 없음.
   - §3.5 Identity/Org/Security: Reporting-Line=parent_user_id owner 붕괴·Org/Position/Legal Entity/Employment 0·SoD/Actor Snapshot 0·SecurityAudit::verify()+break-glass+tenant격리(분산) 실재(PARTIAL).
  ★결론: 다단 Stage/Level/Step 순차 실행이 참조할 Chain·Authority·Assignment SoT가 전무 → §73 산출물 대부분 ABSENT/BLOCKED_PREREQUISITE·cover 0이 정직판정.
  ★실존 인접(재구현 금지·정직 분류): 상태 전이는 catalog_writeback_job/admin_growth_approval의 status 컬럼 하드코딩 전이(명시적 Transition Definition/State Machine 아님)·동시성 primitive=CAS 조건부 UPDATE(Catalog.php:1721-1731)+FOR UPDATE SKIP LOCKED(Omnichannel.php:405)·**fencing token/idempotency key 부재=실위험**·JourneyBuilder=마케팅 저니(승인 아님·KEEP_SEPARATE).
  ★규율: Golden Rule(Extend not Replace)·중복 State Machine 금지·코드 변경 0(설계)·측정기 cover·VALIDATED_LEGACY는 실존 증거만·"결론의 근거도 재실증"(status 컬럼 존재≠State Machine). 실 구현=선행 5군 신설 후 별도 승인세션(RP-002).
  후속 = EPIC 06-A-03-02 Decision Processing & Action Engine Governance.
-->

# GeniegoROI Enterprise Engineering Handbook — EPIC 06-A-03-01
# Sequential Approval State Machine Foundation Governance (Version 1.0)

## 0. 목적
Chain의 각 Stage/Level을 순서대로 실행·이전 완료 검증·현재 실행가능 단계 결정·중복실행/순서건너뛰기/동시진행/상태역전/재처리오류 방지하는 Canonical Sequential Approval State Machine 완성. **Decision 상세처리(Approve/Reject/Return/Cancel/Withdraw)는 06-A-03-02로 이관·이번엔 State Progression Foundation만.**
답해야 할 질문: 현재 Stage/Level/Step·이전 완료·Mandatory 충족·Skip 가능·다음 Level/Stage·Block 이유·중복 활성/전이·동시 활성화·stale worker overwrite·Assignment 없는 활성·Cursor 일치·과거 재현·순서오류 탐지·Simulation·Workflow Engine 일치·Drift Reconciliation.

## 1. 구현 범위 (76)
Registry·Policy·Definition·Version·Instance·Stage/Level/Step Instance·Transition Def/Instance·State Machine·State·Event·Guard·Precondition·Postcondition Foundation·Stage/Level/Step Activation·Current Stage/Level/Step Resolution·Previous Step Completion Validation·Next Step Eligibility/Resolution·Stage/Level/Step Progression·Sequential Ordering·Sequence Number Governance·Dependency Validation·Blocking/Optional/Conditional Dependency·Skip/Auto-skip/Auto-activation Foundation·Pause·Resume·Suspend·Block·Retry·Recovery·Orphan/Deadlock Detection·Duplicate Execution/Concurrent Transition Prevention·Transition Lock/Lease/Idempotency/Fencing Token·Execution/Sequence Cursor·State/Transition Snapshot·Replay·Simulation·Reconciliation·Static Lint·Runtime Guard·Error/Warning Contract·Evidence·Audit·API·Cache·Index·Performance·Migration·Existing/Duplicate Impl Audit·Docs·ADR·PM/Repeat/Agent History.
**상세구현 제외(후속)**: Approve/Reject/Return/RequestChanges/Withdraw/Cancel Action·Decision Commit/Reversal/Reason/Signature/Evidence Finalization·Parallel/Committee/Quorum/Consensus·Conditional Route 상세·Exception/Risk-based/Financial Threshold·SLA Escalation·Notification·Final Completion·Production Certification.

## 3. 선행조건 (★대부분 ABSENT — 상단 헤더)
3.1 Approval(Request/Case/Item/Requirement/Workflow/Chain/Stage/Level/Resolution/Resolved Participant/Snapshot) · 3.2 Authority(Registry/Def/Version/Matrix/Resolution/Snapshot/Conflict) · 3.3 Delegation(Def/Version/Resolution/Snapshot/Conflict/Reconciliation) · 3.4 Assignment(Work Item/Assignment/History/Candidate/Resolution/Queue/Queue Version/Claim/Lease/Lock/Snapshot/Reconciliation) · 3.5 Identity/Org/Security(Identity/Subject/Employment/Role Assignment/Position Incumbency/Org Hierarchy/Reporting Line/Legal Entity/Authorization Policy/Actor Snapshot/SoD/CoI/Security Suspension/Tenant Guard).

## 5. 핵심 원칙 (요약)
5.1 Definition≠Runtime Instance(혼합 금지) · 5.2 Stage≠Level≠Step(단일 status로 표현 금지) · 5.3 이전 Mandatory Blocking 완료 후 다음 활성 · 5.4 Sequence Number만 신뢰 금지(Dependency/State/Guard/Snapshot 병행) · 5.5 명시적 Transition(`status=next` 임의변경 금지·Transition Def/Guard/Event/Actor/Idempotency/Lock/Audit) · 5.6 동일 Scope 단일 Current Stage/Level/Step · 5.7 Active≠Assigned(기본 Assignment Required) · 5.8 Step Completion≠Decision(Decision Commit+Completion Event 후에만·이번엔 Event 수신+Progression Foundation만) · 5.9 Idempotent Transition · 5.10 Fencing Token으로 stale worker 차단 · 5.11 상태역전 금지(Return/Reopen/Correction/Replay=별도 Versioned Transition) · 5.12 Mandatory State Control 고객설정 비활성 불가(Tenant Isolation·Version·Previous Completion·Duplicate Active Step·Idempotency·Lock·Fencing·Immutable History·Snapshot·Authority Revalidation Hook·Assignment Validation Hook·Reconciliation).

## 6. Canonical Entity (기존 없을 시 최소·재구현 금지)
APPROVAL_SEQUENTIAL_{REGISTRY·POLICY·DEFINITION·VERSION·INSTANCE·STAGE_INSTANCE·LEVEL_INSTANCE·STEP_INSTANCE·STATE·EVENT·TRANSITION_DEFINITION·TRANSITION_INSTANCE·GUARD·PRECONDITION·DEPENDENCY·CURSOR·LOCK·LEASE·IDEMPOTENCY·SNAPSHOT·SIMULATION·RECONCILIATION·CONFLICT·EVIDENCE·AUDIT_EVENT}

## 4. 전수조사 대상 / 66. 분류 태그
Sequential/Serial/Ordered/Step/Stage/Level Approval·Approval Sequence/Order·Sequence Number·Current Step/Stage/Level·Next/Previous Approver·Advance/Progress·State Machine·Workflow/Approval State·Transition·Event·Guard·Pre/Postcondition·Activation·Skip/Auto Skip·Pause/Resume/Suspend/Block·Retry/Recovery/Reopen/Rollback/Reset·Deadlock/Orphan/Stuck·Duplicate Step/Transition·Concurrent·Optimistic/Pessimistic Lock·Fencing Token·Idempotency Key·Cursor·Snapshot·BPMN/Camunda/Temporal/Saga·ERP/CRM Approval Stage·Legacy Status Column·Trigger/Stored Procedure/Cron/Event/Queue-driven Progression·Kafka. 태그: CANONICAL_SEQUENTIAL_* · VALIDATED_WORKFLOW_ENGINE/BPMN/ERP/LEGACY_SEQUENCE · EXTERNAL_WORKFLOW_ADAPTER · LEGACY_ADAPTER · MIGRATION/CONSOLIDATION_REQUIRED · DEPRECATION_CANDIDATE · KEEP_SEPARATE_WITH_REASON · BLOCKED_CROSS_TENANT/STATE_INTEGRITY/HISTORICAL_INTEGRITY/CONCURRENCY_RISK · UNVERIFIED · TEST_ONLY.

## 59. Critical Gap / 60. Static Lint / 61. Runtime Guard (요지)
Sequential Version 없음·Definition·Runtime 혼합·Stage/Level/Step 미구분·Sequence 중복·Previous Mandatory 미완료 진행·Completion Event/Snapshot 없이 Completed·Assignment 없이 Active·Authority/Delegation 미검증·복수 Active Scope·Transition 없는 상태변경·Idempotency/Lock/Fencing 없음·stale worker overwrite·Duplicate Completion/Next Step·Pause/Suspension/Block 중 진행·Mandatory 무단 Skip·Auto-skip Audit 누락·Snapshot 누락·과거 재작성·Cursor-Active 불일치·Transition Pending 정체·Orphan/Deadlock 미탐지·Recovery History 덮어쓰기·Cross-Tenant Transition·Mandatory Guard 고객제거·Workflow Engine 불일치·Decision Reference 없이 Completion·Active Version/Snapshot 직접수정.

## 73. 생성/갱신 문서 (기존 동일목적 통합)
docs/segmentation/DSAR_APPROVAL_SEQUENTIAL_{REGISTRY·POLICY·DEFINITION·VERSION·VERSION_TYPE·INSTANCE·EXECUTION_STATUS·STAGE_INSTANCE·STAGE_STATUS·LEVEL_INSTANCE·LEVEL_STATUS·STEP_INSTANCE·STEP_TYPE·STEP_STATUS·STATE·EVENT·TRANSITION_DEFINITION·TRANSITION_INSTANCE·TRANSITION_RESULT·GUARD·PRECONDITION·DEPENDENCY·ORDERING·CURRENT_STAGE_RESOLUTION·CURRENT_LEVEL_RESOLUTION·CURRENT_STEP_RESOLUTION·PREVIOUS_STEP_VALIDATION·NEXT_STEP_ELIGIBILITY·NEXT_STEP_RESOLUTION·STAGE_ACTIVATION·LEVEL_ACTIVATION·STEP_ACTIVATION·AUTO_ACTIVATION·SKIP_FOUNDATION·AUTO_SKIP_FOUNDATION·PAUSE_RESUME·SUSPENSION·BLOCK·RETRY·RECOVERY·ORPHAN_DETECTION·DEADLOCK_DETECTION·CURSOR·LOCK·LEASE·IDEMPOTENCY·FENCING_TOKEN·DUPLICATE_EXECUTION_PREVENTION·CONCURRENT_TRANSITION_PREVENTION·SNAPSHOT·SNAPSHOT_TYPE·REPLAY_FOUNDATION·SIMULATION·CONFLICT·RECONCILIATION·RECONCILIATION_STATUS·CRITICAL_GAP_POLICY·STATIC_LINT·RUNTIME_GUARDS·ERROR_WARNING_CONTRACT·EVIDENCE·AUDIT_EVENT·API_CONTRACT·INDEX_PERFORMANCE·CACHE_POLICY·EXISTING_IMPLEMENTATION·DUPLICATE_IMPLEMENTATION_AUDIT·FUNCTION_REGRESSION_GATE}.md · docs/architecture/ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION.md · docs/pm/{PM_CHANGE_HISTORY·REPEAT_PROBLEM_HISTORY·AGENT_EXECUTION_HISTORY}.md

## 84. 최종 실행 명령 (요지)
검증된 Approval/Chain/Org/Reporting Line/Identity/Role/Position/Legal Entity/Authority/Delegation/Assignment 위에 Sequential State Machine 구축. 전수조사→중복 시 Canonical Adapter 통합. Definition≠Runtime. Stage/Level/Step 분리. Active Version 직접수정 금지(새 Version). Runtime Instance는 생성당시 Version/Sequence/Dependency/Transition Snapshot 유지. Sequence Number 단독 진행 금지(Previous Completion Event/Snapshot/Dependency/Assignment/Authority/Delegation/Guard 병행). 동일 Scope 단일 Current Stage/Level/Step. Parallel은 후속·이번엔 복수 Active Step 차단. `status=next` 임의변경 금지→Transition Def/Instance. Mandatory Guard Fail Closed. Step Completion=Decision Commit Reference+Completion Event 후에만(Decision 상세=06-A-03-02). Deterministic Resolution. Optional/Skip 암묵 금지→Transition/Audit. Mandatory Financial/Legal/Compliance/Security Auto-skip 금지. Pause/Suspension/Block 중 진행 차단. Retry(동일 Idempotency/Causation/Expected State)≠Recovery(별도 Transition·History 덮어쓰기 금지). Orphan/Deadlock 탐지. Lock/Lease/CAS/Unique Active/Fencing Token. Idempotency(동일 key 다른 hash=Conflict). Cursor=Consistency Contract(Derived Cache 아님)·Active 불일치 시 차단. Snapshot 불변·과거 재작성 금지. Replay/Simulation 실 상태 미변경. Reconciliation. Static Lint·Runtime Guard. Mandatory Control 고객제거 금지. 기존 무회귀·중복 제거/Adapter. ADR·PM·Repeat·Agent History 기록. → 다음 06-A-03-02 Decision Processing & Action Engine.

<!-- 원문 전체(§0~§84·전 필드·Enum·Error/Warning·API·Index·Cache·Test)는 289차 13회차 사용자 메시지에 존재. 본 파일=착수 헤더+골격. ⓒ 전사 시 원문에서 직접 인용. -->
