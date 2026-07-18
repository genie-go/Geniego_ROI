<!--
  ★선영속(ⓐ) — EPIC 06-A-03-02-02 Decision Actions Governance 스펙 원문.
  289차 13회차 사용자 제공. 소실 방지 verbatim 골격. 판정 전 원문 고정.

  ═══ 착수 전 필독: 측정된 선행조건 상태 (289차 감사 실측) ═══
  §3 선행조건 대부분 ABSENT — Decision Actions는 없는 기반 위에 얹힌다:
   - §3.1 Decision Processing Core: ★06-A-03-02-01 감사=승인 결정 in-place status UPDATE 4핸들러·Decision Record/원자Commit/Slot/Outbox/Idempotency ABSENT.
   - §3.2 Sequential: ABSENT(하드코딩 status flip). §3.3 Assignment: ABSENT. §3.4 Authority/Delegation: ABSENT.
   - §3.5 Content·Document Foundation: MediaHost 이미지호스팅·catalog base64 업로드 실존 가능하나 ★Malware Scan/DLP/File Type Validation/Data Classification/Retention/Legal Hold/PII/Immutable Archive 대부분 ABSENT 예상(ⓑ 확인).
   - §3.6 Identity/Security: Tenant Guard·SecurityAudit::verify PRESENT.
  ★결론: Action은 Decision Core(Record/Slot/Commit) 위에서 Effect Mapping으로 작동하는데 그 Core가 없다 → §70 산출물 대부분 ABSENT/BLOCKED_PREREQUISITE·cover 0이 정직판정.
  ★실존 인접: approve/reject 액션=in-place status UPDATE(Action≠Outcome 분리 없음)·REJECT/RETURN/CANCEL/WITHDRAW/RESUBMIT/ACKNOWLEDGE/DEFER 구분 대부분 ABSENT·Reason=자유텍스트/status·Comment=approvals_json/CRM notes·Attachment=MediaHost 파일호스팅(Malware/DLP 미검증).
  ★실 위험: ①Attachment Malware/DLP 미검증(악성파일 업로드) ②Return≠Reject 미구분(반려 의미 혼용) ③Cancel≠Withdraw 미구분 ④Reason 자유텍스트(taxonomy 부재) ⑤민감 Comment 노출 통제 부재.
  ★규율: Golden Rule(Extend not Replace)·중복 Action 도메인 금지·코드 변경 0(설계)·"결론의 근거도 재실증". 실 구현=선행 신설 후 별도 승인세션(RP-002).
  후속 = EPIC 06-A-03-02-03 Decision Integrity & Security Governance.
-->

# GeniegoROI Enterprise Engineering Handbook — EPIC 06-A-03-02-02
# Decision Actions Governance (Version 1.0)

## 0. 목적
Canonical Decision Processing Core 위에서 실제 승인 Action의 의미·조건·상태효과·사유·의견·첨부·대상단계·후속·재제출 규칙 구현. **상세구현**: APPROVE/REJECT/RETURN/REQUEST_CHANGES/CANCEL/WITHDRAW/RESUBMIT/ACKNOWLEDGE/DEFER/ABSTAIN Foundation. **제외(후속)**: Digital/E-Signature·MFA/Biometric·Non-repudiation·Reversal/Correction/Supersession 상세·Parallel/Committee/Quorum/Consensus·Conditional Route·Exception/Risk/Financial Threshold·SLA·Notification·Production Certification.

## 1. 구현 범위 (76)
Action Registry·Definition·Version·Policy·Capability·Eligibility·Effect·Outcome·Target·Transition Mapping · APPROVE·REJECT·RETURN·REQUEST_CHANGES·CANCEL·WITHDRAW·RESUBMIT·ACKNOWLEDGE·DEFER·ABSTAIN Foundation·NO_ACTION·CUSTOM · Reason Registry/Definition/Version/Policy/Category/Requirement/Applicability · Comment/Policy/Classification · Attachment Manifest/Policy/Requirement/Validation · Return Target/Scope · Change Request/Item/Response Foundation · Resubmission Package/Validation · Cancellation/Withdrawal Scope · Outcome/Sequential/Assignment/Claim·Lease/Workflow Effect Mapping · Action Conflict/Precedence/Compatibility/Idempotency/Snapshot/Evidence/Audit/Simulation/Reconciliation · Static Lint·Runtime Guard·Error/Warning Contract·API·Index·Cache·Performance·Migration·Existing/Duplicate Audit·Docs·ADR·PM/Repeat/Agent History.

## 3. 선행조건 (★대부분 ABSENT — 상단 헤더)
3.1 Decision Core(Registry/Policy/Definition/Version/Action Type/Instance/Slot/Command/Context/Eligibility/Validation Result/State Machine/Commit/Record/History/Idempotency/Lock/Snapshot/Outbox/Sequential Completion Reference) · 3.2 Sequential(Instance/Stage/Level/Step/State/Transition/Cursor/Snapshot/Reconciliation) · 3.3 Assignment(Work Item/Assignment/Claim/Lease/Release/Reassignment/Return-to-Queue/Snapshot) · 3.4 Authority·Delegation(Resolution/Snapshot) · 3.5 Content·Document(File/Document/Attachment Registry·Object Storage Adapter·Malware Scan·File Type/Size Validation·Data Classification·Retention·Legal Hold·DLP/Redaction Hook·PII Classification·Access Control·Evidence Store·Immutable Archive) · 3.6 Identity/Security(Tenant Guard·Actor·SoD).

## 5. 핵심 원칙 (요약)
5.1 Action Type≠Outcome(REJECT가 항상 전체 Workflow Rejected 아님·같은 문자열 처리 금지) · 5.2 Action≠Transition(한 Action이 여러 Transition Effect) · 5.3 Reason≠Comment≠Attachment(코드 taxonomy/사람 텍스트/증빙파일·단일 자유텍스트 대체 금지) · 5.4 RETURN≠REJECT(부정판단 vs 이전 Scope 복귀·혼용 금지) · 5.5 REQUEST_CHANGES≠RETURN(명시 수정항목 vs Cursor 이동·Request Changes는 Return 없이 현 Step 수정대기 가능) · 5.6 CANCEL≠WITHDRAW(관리자/시스템 vs 요청자·동일 Action 저장 금지) · 5.7 Resubmit=새 검증 Context(Case Version/변경항목/첨부/금액/통화/조직/법인/체인/권한/배정/SoD/CoI 재검증) · 5.8 Committed Decision Record 수정 금지(새 Action+새 Record+관계연결) · 5.9 UI 검증 불신(Comment/Reason/Attachment/Return Target/Eligibility 서버검증) · 5.10 Action Effect=Versioned Policy(Decision/Sequential/Assignment/Claim/Lease/Work Item/Requirement/Case/Workflow/Requester Task/Outbox) · 5.11 Mandatory Control 고객설정 비활성 불가(Tenant Isolation·Actor/Action Eligibility·Return Target Validation·Controlled Action Reason Requirement·Immutable Record·Attachment Security Validation·Sequential Effect Validation·Duplicate Action Guard·Snapshot·Audit·Reconciliation).

## 6. Canonical Entity (기존 없을 시 최소·재구현 금지)
APPROVAL_DECISION_ACTION_{REGISTRY·DEFINITION·VERSION·POLICY·CAPABILITY·ELIGIBILITY·EFFECT·OUTCOME·TARGET·TRANSITION_MAPPING·CONFLICT·SNAPSHOT·EVIDENCE·RECONCILIATION·SIMULATION·AUDIT_EVENT} · APPROVAL_DECISION_REASON_{REGISTRY·DEFINITION·VERSION·POLICY·APPLICABILITY} · APPROVAL_DECISION_{COMMENT·COMMENT_POLICY} · APPROVAL_DECISION_ATTACHMENT_{MANIFEST·POLICY·VALIDATION} · APPROVAL_DECISION_{RETURN_TARGET·CHANGE_REQUEST·CHANGE_REQUEST_ITEM·RESUBMISSION_PACKAGE}

## 28. CANCEL vs WITHDRAW 강제 (핵심 구분)
CANCEL=관리자/시스템/권한자·운영종료·Command~Workflow·기존결정 유지·관리적 사유·Administrative Authority·Compensation. WITHDRAW=요청자/제출자·자기요청 회수·주로 Request/Case·기존결정 유지·회수사유·Request Ownership·Cleanup/Resubmit.

## 45. Assignment Effect Mapping (기본 권장)
APPROVE→MARK_COMPLETED · REJECT→CLOSE_AND_ARCHIVE · RETURN→RELEASE/RETURN_TO_QUEUE · REQUEST_CHANGES→KEEP_ACTIVE/SUSPEND · CANCEL→CANCEL · WITHDRAW→CANCEL · RESUBMIT→RECREATE_ON_RESUBMIT · DEFER→KEEP_ACTIVE/SUSPEND.

## 4. 전수조사 / 63. 분류 태그
Approve/Reject/Decline/Deny·Return/Send Back/Rework·Request Changes/Change Request·Cancel/Withdraw/Recall/Revoke·Resubmit/Reopen·Acknowledge/Confirm·Defer/Hold·Abstain·Decision Outcome/Task Outcome·Reason Code/Rejection Reason·Decision/Reviewer/Internal/External Comment·Attachment/Supporting Document·Return Target/Previous Approver·Change Item/Field Change·Resubmission Package/Revision Number·Direct Status Update/Hardcoded Outcome·UI-only Validation/Client-side Required Comment·Email/Mobile/ERP/BPMN Outcome·Legacy Status·Stored Procedure/Trigger. 태그: CANONICAL_APPROVAL_DECISION_ACTION_* · VALIDATED_WORKFLOW/BPMN_OUTCOME/ERP_ACTION/LEGACY_ACTION · EXTERNAL_ACTION_ADAPTER · LEGACY_ADAPTER · MIGRATION/CONSOLIDATION_REQUIRED · DEPRECATION_CANDIDATE · KEEP_SEPARATE_WITH_REASON · BLOCKED_CROSS_TENANT/ACTION_INTEGRITY/DOCUMENT_SECURITY/HISTORICAL_INTEGRITY_RISK · UNVERIFIED · TEST_ONLY.

## 58. Critical Gap (요지)
Action Version 없음·Action·Outcome 혼용·Return·Reject 혼용·Cancel·Withdraw 혼용·Request Changes·Return 혼용·Reason 필수인데 없음/잘못된 Action에 Reason·Comment/Attachment 필수인데 없음·Malware Scan 없는 Attachment·DLP 없는 민감 Attachment·Invalid/Cross-Case/Forward Return·Return Loop·Max Return 초과·Change Item 없음·Resubmit 미해결 Item/Case Version 누락·Cancel 권한 없음·Withdraw Actor≠요청자·Irreversible 이후 Cancel/Withdraw·APPROVE+REJECT 동시·Terminal 중복·Effect Mapping/Assignment/Claim-Lease/Sequential Effect 누락·Decision Record 수정·UI-only 검증·Client Filename/MIME 신뢰·Comment Visibility 오류·민감 Comment 노출·Snapshot/Audit 누락·Mandatory Control 제거·중복 Action Entity.

## 70. 생성/갱신 문서 (기존 동일목적 통합)
docs/segmentation/DSAR_APPROVAL_DECISION_{ACTION_REGISTRY·ACTION_DEFINITION·ACTION_VERSION·ACTION_POLICY·ACTION_CAPABILITY·ACTION_ELIGIBILITY·ACTION_EFFECT·ACTION_OUTCOME·ACTION_TARGET·ACTION_TRANSITION_MAPPING·APPROVE_ACTION·REJECT_ACTION·REJECT_SCOPE·RETURN_ACTION·RETURN_SCOPE·RETURN_TARGET_RESOLUTION·RETURN_LOOP_GOVERNANCE·REQUEST_CHANGES_ACTION·CHANGE_REQUEST·CHANGE_REQUEST_ITEM·CHANGE_RESPONSE_FOUNDATION·CANCEL_ACTION·CANCEL_SCOPE·WITHDRAW_ACTION·WITHDRAW_SCOPE·CANCEL_WITHDRAW_BOUNDARY·RESUBMIT_ACTION·RESUBMISSION_PACKAGE·RESUBMISSION_VERSION_POLICY·ACKNOWLEDGE_ACTION·DEFER_ACTION·ABSTAIN_FOUNDATION·REASON_REGISTRY·REASON_DEFINITION·REASON_VERSION·REASON_CATEGORY·REASON_APPLICABILITY·COMMENT·COMMENT_POLICY·COMMENT_VISIBILITY·ATTACHMENT_MANIFEST·ATTACHMENT_POLICY·ATTACHMENT_VALIDATION·ASSIGNMENT_EFFECT_MAPPING·CLAIM_LEASE_EFFECT_MAPPING·SEQUENTIAL_EFFECT_MAPPING·ACTION_PRECEDENCE·ACTION_COMPATIBILITY·ACTION_CONFLICT·ACTION_IDEMPOTENCY·ACTION_SNAPSHOT·ACTION_EVIDENCE·ACTION_AUDIT_EVENT·ACTION_SIMULATION·ACTION_RECONCILIATION·ACTION_RECONCILIATION_STATUS·ACTION_CRITICAL_GAP_POLICY·ACTION_STATIC_LINT·ACTION_RUNTIME_GUARDS·ACTION_ERROR_WARNING_CONTRACT·ACTION_API_CONTRACT·ACTION_INDEX_PERFORMANCE·ACTION_CACHE_POLICY·ACTION_EXISTING_IMPLEMENTATION·ACTION_DUPLICATE_IMPLEMENTATION_AUDIT·ACTION_FUNCTION_REGRESSION_GATE}.md · docs/architecture/ADR_DSAR_DECISION_ACTIONS_GOVERNANCE.md · docs/pm/{PM_CHANGE_HISTORY·REPEAT_PROBLEM_HISTORY·AGENT_EXECUTION_HISTORY}.md

## 82. 최종 실행 명령 (요지)
검증된 Approval/Chain/Authority/Delegation/Assignment/Sequential/Decision Core 위에 Decision Actions 구축. 전수조사→중복 시 Canonical Adapter. Action Type≠Outcome. Action≠Transition. Reason/Comment/Attachment 분리. APPROVE~DEFER를 Action Definition+Versioned Policy 기반. APPROVE→STEP_APPROVED Reference Event(다음 Step 직접활성 금지). REJECT≠RETURN(Scope별 Outcome Mapping·표준 Reason Code+Applicability). RETURN Target Canonical Resolution(Previous Approver 문자열 금지·동일 Case 계보·이전 위치·재개가능)·Cross-Case/Forward/Terminal/Archived Return 차단·Return Loop(count/cycle hash/max) 차단. REQUEST_CHANGES=Change Request+Item(Target/Field Path/Change Type/Instruction/Mandatory/Evidence). CANCEL≠WITHDRAW(Scope·Authority·Irreversible 검증·비가역 이후 차단). RESUBMIT=Origin 연결·미해결 Item 차단·Case Version 정책·History 보존. ACKNOWLEDGE≠APPROVE(Authority Ceiling 미소비). DEFER 만료 필수. ABSTAIN=Foundation만(Mandatory 충족 처리 금지). Reason Registry/Version/Applicability(잘못된 Action에 Reason 금지·과거 Version 유지). Comment(Type/Visibility/PII/Redaction·민감 내부 Comment 자동노출 금지·Committed 수정금지→Correction 새 Record). Attachment=Canonical File/Document Registry Reference+Immutable Manifest(Hash/MIME/Size/Malware/DLP/Encryption/Classification/Retention/Legal Hold·Client Filename/MIME 불신·Executable/Script/DLP/Quarantine 차단). Effect Versioned Mapping(Cursor 직접변경 금지·Sequential이 검증 후 Transition). Terminal 후 Claim/Lease 잔존 금지. 상충 Action 동시 Commit 차단(Lock/Version/Sequence/Fencing/Compatibility). Precedence는 참고만. Idempotency Key(Slot/Round/Action/Actor/Target/Reason/Comment Hash/Attachment Manifest Hash/Change Request Hash/Resubmission Hash). Snapshot 불변·과거 재작성 금지. Simulation 실 Action 미생성. Reconciliation(Workflow/ERP/Legacy↔Canonical). Static Lint·Runtime Guard. Mandatory Control 고객제거 금지. 기존 무회귀·중복 제거/Adapter. ADR·PM·Repeat·Agent History 기록. → 다음 06-A-03-02-03 Decision Integrity & Security Governance.

<!-- 원문 전체(§0~§82·전 필드·Enum·Error/Warning·API·Index·Cache·Test)는 289차 13회차 사용자 메시지에 존재. 본 파일=착수 헤더+골격. ⓒ 전사 시 원문에서 직접 인용. -->
