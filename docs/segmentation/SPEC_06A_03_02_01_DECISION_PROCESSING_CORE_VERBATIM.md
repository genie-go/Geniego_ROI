<!--
  ★선영속(ⓐ) — EPIC 06-A-03-02-01 Decision Processing Core Governance 스펙 원문.
  289차 13회차 사용자 제공. 소실 방지 verbatim 골격. 판정 전 원문 고정.

  ═══ 착수 전 필독: 측정된 선행조건 상태 (289차 11·12·13회차 감사 실측) ═══
  §3 선행조건 6군 대부분 ABSENT — Decision Core는 없는 기반 위에 얹힌다:
   - §3.1 Approval Foundation: chain/stage/level/resolution/workflow 0(flat 승인만). ABSENT.
   - §3.2 Authority Foundation: Authority Matrix/Resolution 0. ABSENT.
   - §3.3 Delegation Foundation: Approval Delegation 개념 0. ABSENT.
   - §3.4 Assignment Foundation: Work Item/Assignment/Claim/Lease/Lock 0(06-A-02 감사). ABSENT.
   - §3.5 Sequential Foundation: ★06-A-03-01 감사=Sequential State Machine/Stage/Level/Step/Cursor/Transition 전무·하드코딩 status 전이만. ABSENT.
   - §3.6 Identity/Security: Tenant Guard·SecurityAudit::verify() PRESENT·Org/Identity/Position/Legal Entity/SoD/Actor Snapshot ABSENT. PARTIAL.
  ★결론: Decision Validation Pipeline이 재검증할 Assignment/Claim/Lease/Authority/Delegation/Sequential Step/Cursor가 전무 → §72 산출물 대부분 ABSENT/BLOCKED_PREREQUISITE·cover 0이 정직판정.
  ★실존 인접(재구현 금지·정직 분류): 승인 결정=in-place `status=approved` UPDATE 3종(catalog approveQueue·admin_growth approvalDecide·mapping decide·불변 Decision Record/원자적 Commit/Outbox 아님)·Alerting decide/executeAction(287차 정직집행·생산자 부재)·Paddle UNIQUE(notification_id) 멱등·omni_outbox 트랜잭셔널 아웃박스 패턴(CANONICAL 참조)·SecurityAudit::verify 감사무결.
  ★실 위험: ①Decision Record 불변성 부재(in-place UPDATE=과거 결정 소실) ②Decision Commit 원자성(Record+History+Snapshot+Outbox+Sequential Ref) 부재 ③Fencing Token/nonce/replay protection 부재 ④Commit 직전 재검증(Actor/Authority/Assignment) 부재 ⑤Decision Slot unique 부재(동일 Step 복수 결정 이론 가능).
  ★규율: Golden Rule(Extend not Replace)·중복 Decision 도메인 금지·코드 변경 0(설계)·"결론의 근거도 재실증"(status=approved UPDATE ≠ Decision Record). 실 구현=선행 6군 신설 후 별도 승인세션(RP-002).
  후속 = EPIC 06-A-03-02-02 Decision Actions Governance.
-->

# GeniegoROI Enterprise Engineering Handbook — EPIC 06-A-03-02-01
# Decision Processing Core Governance (Version 1.0)

## 0. 목적
승인 Actor 제출 의사결정을 Canonical Decision Command로 수신→입력/Actor/Assignment/권한/위임/상태/순서/중복/동시성/무결성 검증→불변 Decision Record + Decision Commit 결과 생성하는 Decision Processing Core. **개별 Action(APPROVE/REJECT/RETURN/REQUEST_CHANGES/CANCEL/WITHDRAW/RESUBMIT) 상세=06-A-03-02-02로 이관.**

## 1. 구현 범위 (65)
Decision Registry·Policy·Definition·Version·Action Type Registry·Instance·Command·Command Envelope·Command Validation·Actor/Target/Scope Resolution·Context·Preconditions·Guard·State Machine·Event·Transition Def/Instance·Eligibility·Candidate·Validation Result·Commit Request·Commit·Commit Result·Record·History·Sequence·Revision Foundation·Supersession Foundation·Idempotency·Lock·Lease·Fencing Token·Optimistic Version·Concurrency Control·Duplicate Prevention·Replay Protection·Snapshot Foundation·Evidence Foundation·Audit Foundation·Outbox·Inbox Deduplication·Retry·Recovery·Conflict·Drift Detection·Reconciliation Foundation·Simulation Foundation·Static Lint·Runtime Guard·Error/Warning Contract·API·Cache·Index·Performance·Migration·Existing/Duplicate Impl Audit·Docs·ADR·PM/Repeat/Agent History.
**상세 제외(후속)**: Action별 Reason/Comment/Attachment/Return Target/Resubmit·Signature/E-sign/MFA/Biometric·Rollback/Correction 상세·Parallel/Committee/Quorum/Consensus·Conditional Route·Exception/Risk-based/Financial Threshold·SLA·Final Completion·Production Certification.

## 3. 선행조건 (★대부분 ABSENT — 상단 헤더)
3.1 Approval(Request/Case/Item/Requirement/Workflow/Chain/Stage/Level/Resolution/Snapshot) · 3.2 Authority(Registry/Def/Version/Matrix/Resolution/Snapshot/Conflict) · 3.3 Delegation(Def/Version/Resolution/Snapshot/Conflict/Reconciliation) · 3.4 Assignment(Work Item/Assignment/History/Resolution/Claim/Lease/Lock/Snapshot/Reconciliation) · 3.5 Sequential(Def/Version/Instance/Stage/Level/Step Instance/State/Event/Transition/Cursor/Lock/Idempotency/Snapshot/Reconciliation) · 3.6 Identity/Security(Identity/Subject/Employment/Role Assignment/Position Incumbency/Org Hierarchy/Legal Entity/Authorization Policy/Actor Snapshot/SoD/CoI/Security Suspension/Tenant Guard).

## 5. 핵심 원칙 (요약)
5.1 Decision Command≠Decision Record(수신≠완료) · 5.2 Validation≠Commit(검증만으로 Step 완료 금지) · 5.3 Decision≠Sequential Progression(Decision은 Commit+Completion Reference Event 생성·Sequential이 소비·Cursor 직접변경 금지) · 5.4 Decision Actor=Current Assignee 또는 유효 Delegate(타 Actor=명시 권한/정책) · 5.5 Commit 시점 전 권한 재검증(Identity/Employment/Role/Position/Assignment/Claim/Lease/Authority/Delegation/Legal Entity/Org/Resource/Action/Amount/Currency/Security/SoD/CoI) · 5.6 Decision Record Immutable(Update/Delete 금지·Correction/Reversal/Supersession=새 Record+Link) · 5.7 동일 Slot 단일 Committed Decision(Parallel/Committee=후속 Group) · 5.8 Idempotent Command(동일 key+payload=동일결과·동일key+다른payload=Conflict) · 5.9 Commit 원자성(Record+History+Snapshot+Audit+Sequential Completion Ref+Outbox+Idempotency Result 한 트랜잭션/Saga·Outbox) · 5.10 외부채널(Email/Slack/Teams/Mobile/Magic Link)=Command Channel일 뿐·채널인증≠Authority · 5.11 Client 시간 불신(Server Trusted Time) · 5.12 Mandatory Integrity Control 고객설정 비활성 불가(Tenant Isolation·Canonical Actor Resolution·Assignment/Authority/Delegation Revalidation·Sequential State Validation·Idempotency·Decision Lock·Fencing Token·Immutable Record·Snapshot·Audit·Outbox·Duplicate Commit Guard).

## 6. Canonical Entity (기존 없을 시 최소·재구현 금지)
APPROVAL_DECISION_{REGISTRY·POLICY·DEFINITION·VERSION·ACTION_TYPE·INSTANCE·COMMAND·COMMAND_ENVELOPE·CONTEXT·CANDIDATE·ELIGIBILITY·VALIDATION_RESULT·STATE·EVENT·TRANSITION_DEFINITION·TRANSITION_INSTANCE·COMMIT_REQUEST·COMMIT·COMMIT_RESULT·RECORD·HISTORY·IDEMPOTENCY·LOCK·LEASE·CONFLICT·SNAPSHOT·EVIDENCE·OUTBOX·INBOX_DEDUP·RECONCILIATION·SIMULATION·AUDIT_EVENT}

## 13. Decision Slot Key (핵심 무결성)
tenant_id·case_id·case_version_id·requirement_id·sequential_instance_id·stage/level/step instance id·decision group ref·decision round ref·action scope ref. ★Sequential 단일승인=동일 Slot 단일 Committed Decision.

## 25. Validation Pipeline (27단계·Versioned)
Envelope→Tenant→Auth Context→Actor Resolution→Target Resolution→Decision Version→Sequential State→Assignment→Claim→Lease→Authority→Delegation→Legal Entity→Org→Resource→Action→Amount→Currency→Security→SoD→CoI→Idempotency→Replay→Existing Decision→Lock Acquisition→Fencing Token→Final Context Hash.

## 48. Transaction Boundary (원자적 Commit)
1)Lock 검증 2)Fencing 검증 3)Expected Version 검증 4)Slot Unique 검증 5)Record 생성 6)History 생성 7)Snapshot 생성 8)Audit 생성 9)Instance 상태갱신 10)Idempotency Result 저장 11)Sequential Completion Ref Outbox 12)Committed Outbox. 분산 시 Outbox/Inbox+Recovery Contract.

## 4. 전수조사 / 65. 분류 태그
Approval Decision·Decision Record/History/Log/Command/Request/Result/Status/Action·Approve/Reject/Return/Request Changes/Send Back/Cancel/Withdraw/Resubmit·Decision/Approve/Reject API·Complete User Task·Task Outcome·BPMN/Camunda Complete·ERP/CRM/Mobile/Email/Slack/Teams Approval·One-click/Bulk/Auto Approval·Decision Comment/Reason/Attachment·Signature/E-sign/MFA/OTP·Decision Token/Approval Link/Magic Link·Idempotency Key/Request ID/Correlation ID·Decision Lock/Lease/Transaction/Event/Outbox/Inbox·Duplicate/Stale Decision·Optimistic/Pessimistic Lock·Fencing·Snapshot/Evidence/Audit/Reconciliation/Simulation/Replay/Retry/Recovery/Rollback/Correction·DB Trigger/Stored Procedure/Legacy Status Update/Direct Status Change. 태그: CANONICAL_APPROVAL_DECISION_* · VALIDATED_WORKFLOW_DECISION/BPMN_OUTCOME/ERP_DECISION/LEGACY_DECISION · EXTERNAL_DECISION_ADAPTER · LEGACY_ADAPTER · MIGRATION/CONSOLIDATION_REQUIRED · DEPRECATION_CANDIDATE · KEEP_SEPARATE_WITH_REASON · BLOCKED_CROSS_TENANT/AUTHORITY/STATE_INTEGRITY/HISTORICAL_INTEGRITY/CONCURRENCY_RISK · UNVERIFIED · TEST_ONLY.

## 60. Critical Gap / 61. Static Lint / 62. Runtime Guard (요지)
Decision Version 없음·Command·Record 혼합·Validation 없이 Commit·Actor Canonical Resolution 없음·Assignment/Authority/Delegation/Sequential Step 미검증·Claim/Lease 부재·Cross-Tenant/Legal-Entity·Wrong Resource/Action·Amount 초과·Currency Mismatch·Security/SoD/CoI 실패 Actor·동일 Slot 복수 Committed·Idempotency Key 없음·동일 key 다른 payload·Replay Token 재사용·Decision Lock/Fencing 없음·stale worker Commit·Expected Version 미검증·Decision Record Update/Delete·Snapshot/Audit/Outbox/Sequential Ref 누락·Partial Commit·Client Time을 Commit Time·Email/Channel만으로 Actor/Authority·과거 재작성·Mandatory Control 고객제거·중복 Decision Entity.

## 72. 생성/갱신 문서 (기존 동일목적 통합)
docs/segmentation/DSAR_APPROVAL_DECISION_{REGISTRY·POLICY·DEFINITION·VERSION·VERSION_TYPE·ACTION_TYPE·INSTANCE·SLOT·COMMAND·COMMAND_ENVELOPE·CHANNEL_TYPE·CONTEXT·ACTOR_RESOLUTION·TARGET_RESOLUTION·SCOPE_RESOLUTION·ELIGIBILITY·CANDIDATE·PRECONDITION·GUARD·VALIDATION_PIPELINE·VALIDATION_RESULT·STATE_MACHINE·EVENT·TRANSITION_DEFINITION·TRANSITION_INSTANCE·COMMIT_REQUEST·COMMIT_REVALIDATION·COMMIT·COMMIT_RESULT·RECORD·HISTORY·SEQUENCE·REVISION_FOUNDATION·IDEMPOTENCY·REPLAY_PROTECTION·LOCK·LEASE·FENCING_TOKEN·OPTIMISTIC_VERSION·DUPLICATE_PREVENTION·OUTBOX·INBOX_DEDUP·TRANSACTION_BOUNDARY·SEQUENTIAL_COMPLETION_REFERENCE·CONFLICT·DRIFT·RETRY·RECOVERY·SNAPSHOT_FOUNDATION·EVIDENCE_FOUNDATION·AUDIT_FOUNDATION·RECONCILIATION_FOUNDATION·SIMULATION_FOUNDATION·CRITICAL_GAP_POLICY·STATIC_LINT·RUNTIME_GUARDS·ERROR_WARNING_CONTRACT·API_CONTRACT·INDEX_PERFORMANCE·CACHE_POLICY·EXISTING_IMPLEMENTATION·DUPLICATE_IMPLEMENTATION_AUDIT·FUNCTION_REGRESSION_GATE}.md · docs/architecture/ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE.md · docs/pm/{PM_CHANGE_HISTORY·REPEAT_PROBLEM_HISTORY·AGENT_EXECUTION_HISTORY}.md

## 82. 최종 실행 명령 (요지)
검증된 Approval/Chain/Authority/Delegation/Assignment/Sequential 위에 Decision Core 구축. 전수조사→중복 시 Canonical Adapter 통합. Command≠Record(수신≠완료). Validation≠Commit. Decision은 Commit 후 Sequential Completion Reference Event 생성·Sequential이 소비(Cursor 직접변경 금지). Active Version 직접수정 금지. Slot=Canonical Unique Key·단일 Committed. Envelope≠Business Command. Client 관계 불신·Canonical 재검증. Actor=Authenticated Principal→Canonical Subject(Email/Channel User ID만으로 판정 금지)·기본 Current Assignee/Delegate. Validation Pipeline 27단계 Versioned·TTL·Commit 직전 Critical Revalidation. Mandatory Guard Fail Closed. Decision State Machine 명시(Received/Validating/Valid/Commit Pending/Committed…)·직접 status 변경 금지. Idempotency(동일key 다른hash=Conflict). Replay(nonce/expiry/one-time link/session binding). Lock/Lease(무기한 금지)·Fencing Token(낮은 토큰 차단). Optimistic Version(Instance/Case/Work Item/Assignment/Claim/Lease/Step/Cursor/Policy). Duplicate 차단(double-click/API Retry/Redelivery/Email·Slack 재사용). Record Immutable(Update/Delete 금지·Correction=새 Record+Link)·Commit Sequence 서버생성. Transaction Boundary(Record+History+Snapshot+Audit+Instance+Idempotency+Sequential Ref Outbox+Committed Outbox). Partial Commit Recovery(Record 수정 금지). Snapshot 불변·과거 재작성 금지. Evidence(Password/Token/OTP/MFA Secret/Private Key/Session/Email Body/PII 저장금지). Conflict/Drift(Validation↔Commit 사이 변화 시 차단). Retry(Transient만)≠Recovery. Simulation 실 Commit 미생성. Reconciliation(Workflow/BPMN/ERP/Legacy↔Canonical). Static Lint·Runtime Guard. Mandatory Control 고객제거 금지. 기존 무회귀·중복 제거/Adapter. ADR·PM·Repeat·Agent History 기록. → 다음 06-A-03-02-02 Decision Actions Governance.

<!-- 원문 전체(§0~§82·전 필드·Enum·Error/Warning·API·Index·Cache·Test)는 289차 13회차 사용자 메시지에 존재. 본 파일=착수 헤더+골격. ⓒ 전사 시 원문에서 직접 인용. -->
