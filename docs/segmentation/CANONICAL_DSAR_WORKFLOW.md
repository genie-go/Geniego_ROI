# Canonical DSAR Workflow — Classification, Priority/Risk, SLA/Due Date/Extension/Pause, Duplicate/Abuse, Verification/Authorization Hook, Evidence/Attachment, Assignment/Task, Processor, Communication, Decision/Approval/Escalation & Fulfillment

> **EPIC 06-A Part 3-3-3-3-1** (2/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): `Dsar.php` SLA_DAYS=30 하드코딩·운영자 직접 execute(분류/우선순위/위험/승인/배정/Task 전무)·verify 이메일토큰 fail-closed·anonymize 삭제(ANONYMIZE/DEL_BY_* 상수)·verify mail 1종 통신 · Part 3-3-3-2 Retention(Deletion Eligibility·Legal Hold·Tombstone) · Part 3-3-3-1 Privacy(Purpose·Notice).
> 형제: [`CANONICAL_DSAR_SCHEMA.md`](CANONICAL_DSAR_SCHEMA.md) · [`CANONICAL_DSAR_GOVERNANCE.md`](CANONICAL_DSAR_GOVERNANCE.md) · ADR=[`../architecture/ADR_CANONICAL_DSAR_REQUEST_REGISTRY.md`](../architecture/ADR_CANONICAL_DSAR_REQUEST_REGISTRY.md)

---

## 1. Classification (§30) · Priority (§31-32) · Risk (§33-34)

**Classification Input(§30)**: 원문 Request·Intake Channel·Subject·Requested Action·Data Category·Jurisdiction·Existing Cases·Identity Status·Brand·Language·Attachments → **Output**: Request Type·Subtype·Priority·Risk·Required Verification·Required Team·Required Workflow·SLA Policy·Manual Review 여부. **★AI 분류결과를 최종 법적 Decision 으로 사용 금지**(Manual/Legal 확정).
**Priority(§31, 5종)**: LOW · NORMAL · HIGH · URGENT · CRITICAL. **기준(§32)**: Due Date 임박·Regulator 전달·Security/Fraud·Minor·Vulnerable Subject·Large Data Exposure·Repeated Failure·Legal Hold·Active Complaint·Service Termination·Data Accuracy 즉시피해·Automated Decision 영향·Accessibility.
**Risk(§33, 19종)**: Identity Fraud·Unauthorized Agent·Account Takeover·Enumeration·Cross-Tenant Leakage·Wrong Subject·Excessive Disclosure·Third-party Rights·Sensitive Data Exposure·Security Secret Exposure·Malicious Attachment·Abusive Request·Duplicate Fulfillment·Wrong Delivery Channel·Deadline Risk·Processor Delay·Incomplete Discovery·Data Loss·Premature Deletion. **Level(§34)**: NONE/LOW/MEDIUM/HIGH/CRITICAL/UNKNOWN. **HIGH·CRITICAL·UNKNOWN = 강화검토 대상**.

---

## 2. SLA Policy (§35-36) · Due Date (§37-38) · Extension (§39-40) · Pause (§41-42)

**SLA Policy Schema(§35)**: sla_policy_id · jurisdiction · request_types · base_response_period · acknowledgement_period · identity_verification_effect · authorization_effect · complexity_extension_allowed · maximum_extension · pause_conditions · resume_conditions · calendar_type · holiday_calendar · timezone · escalation_thresholds · owner · legal_approver · version · status · effective_from/to. **★법정기간을 코드 단일숫자 하드코딩 금지**(현행 SLA_DAYS=30 위반) → Jurisdiction/Type/Verification/Complexity/Extension/Legal Hold 별 Policy Version. 구체 법정기간=검증된 정책 Registry(임의 단정 금지). **Matrix(§102)**: | Policy ID | Jurisdiction | Request Type | Base Period | Pause | Extension | Timezone | Escalation | Version | Status |
**SLA 상태(§36)**: ON_TRACK/DUE_SOON/AT_RISK/OVERDUE/PAUSED/EXTENDED/LEGAL_REVIEW/COMPLETED.
**Due Date(§37-38)**: Input=Received/Valid Start·Identity Completed·Authorization Completed·Jurisdiction·Type·Policy Version·Pause Periods·Extensions·Holidays·Timezone·Manual Adjustment·Legal Review. Record: due_date_id·request_id·original/current_due_date·calculation_basis·policy_version·timezone·pause/extension_duration·manual_adjustment·adjustment_reason·calculated_at·approved_by·audit_reference.
**Extension(§39-40)**: extension_id·request_id·reason·complexity_basis·processor_dependency·scope_size·approved_duration·requested/approved_at·requester_notification·new_due_date·approver·status·audit. 상태=NOT_REQUESTED/REQUESTED/APPROVED/REJECTED/NOTIFIED/ACTIVE/EXPIRED/CANCELLED.
**Pause(§41-42)**: 사유 Policy 제한(Identity Info Required·Authorization Evidence Required·Scope Clarification·Requester Response·Legal Hold Review·Security Investigation·Jurisdiction Clarification). 상태=REQUESTED/ACTIVE/RESUME_PENDING/RESUMED/REJECTED/EXPIRED/INVALID. **★Pause·Extension 으로 SLA 임의 회피 금지**(근거·기간·승인·Requester Notification·Audit 필수).

---

## 3. Acknowledgement (§43) · Duplicate (§44-46) · Abuse (§47)

**Acknowledgement(§43)**: Request Reference·Received Date·Type 후보·Verification 필요여부·추가정보요청·예상절차·공식 Communication Channel·Security Warning·Contact·Language·Accessibility·Notice Reference. **★민감데이터·계정존재 여부 과도확인 금지**(Enumeration 방지·§3.7).
**Duplicate Detection(§44)**: Subject·Requester·Type·Scope·Date Range·Intake Source·Existing Open/Completed Request·Message Hash·Attachment Hash·Authorization·Agent·Brand·Jurisdiction 비교. **Match 상태(§45)**: NOT_DUPLICATE/POSSIBLE_DUPLICATE/EXACT_DUPLICATE/OVERLAPPING_REQUEST/FOLLOW_UP_REQUEST/REOPEN_CANDIDATE/ABUSIVE_PATTERN_REVIEW/MANUAL_REVIEW. **처리(§46·자동거부 금지 §3.8)**: 기존연결·Scope 병합·별도유지·Follow-up·이전결과 재사용검토·증분처리·Manual Review·Abuse Review.
**Abuse/Excessive(§47)**: 매우짧은간격 반복·동일범위 반복·여러계정 대량·자동화 공격패턴·허위대리인·타고객정보 요구·Malware·내부시스템 탐색·서비스방해. **★정당한 권리행사를 Abuse 로 과대분류 금지**.

---

## 4. Identity Verification Hook (§48) & Authorization Hook (§49)

**Identity 상태(§48, 10종)**: NOT_STARTED/METHOD_SELECTION/PENDING/PARTIALLY_VERIFIED/VERIFIED/VERIFIED_WITH_LIMITS/FAILED/EXPIRED/MANUAL_REVIEW/BLOCKED. (현행 = 이메일토큰 verified/만료 → Method Selection·Limits·Manual Review 확장.) 상세=Part 3-3-3-3-2.
**Authorization Hook(§49)**: Requester-Subject 관계·Authorization Evidence·Allowed Request Types·Allowed Scope·Validity·Revocation·Jurisdiction·Minor/Guardian·Company/Legal Rep 권한 확인. **★검증 완료 전 Access/Export/Correction/Deletion Fulfillment 차단**(fail-closed).

---

## 5. Evidence (§50-53) & Attachment Governance (§54)

**Evidence Schema(§50)**: evidence_id·request_id·evidence_type·source·subject_reference·requester_reference·related_verification_id·content_reference·content_hash·captured/received_at·validity_period·verification_status·classification·access_policy·retention_policy·created_by·created_at·expires_at·deleted_at·audit_reference.
**Type(§51, 19종)**: REQUEST_SUBMISSION·IDENTITY_VERIFICATION·ACCOUNT_AUTHENTICATION·AUTHORIZATION_LETTER·GUARDIANSHIP_DOCUMENT·REPRESENTATIVE_AUTHORITY·ADDRESS/EMAIL/PHONE_CONFIRMATION·LEGAL_DOCUMENT·REGULATOR_FORWARD·REQUESTER_CLARIFICATION·SCOPE_CONFIRMATION·DELIVERY_CONFIRMATION·DECISION/DENIAL/EXTENSION_EVIDENCE·PROCESSOR_RESPONSE·FULFILLMENT_EVIDENCE. **상태(§52)**: PENDING/VERIFIED/VERIFIED_WITH_WARNINGS/INVALID/EXPIRED/REVOKED/CORRUPTED/MISSING/UNDER_REVIEW/DELETED.
**접근통제(§53)**: 최소권한·Tenant/Request Scope·Sensitive Classification·Download 제한·Signed URL·Short Expiry·Malware Scan·Watermark·Audit·Retention·Secure Delete.
**Attachment Governance(§54)**: File Type Allowlist·Size Limit·Malware Scan·Macro/Script 차단·Password-protected 정책·Archive Bomb 방지·Path Traversal 방지·MIME 검증·Content Disarm·Encryption·Access Expiry·Retention·Audit. **Matrix(§104)**: | Evidence ID | Type | Request | Subject Match | Requester Match | Integrity | Verification | Classification | Retention | Status |

---

## 6. Assignment (§55-57) · Task (§58-60) · Dependency (§61)

**Assignment 기준(§55)**: Tenant·Legal Entity·Brand·Jurisdiction·Request Type·Language·Risk·Minor·Sensitive Data·Security·Legal Review·Processor Dependency·Owner Capacity·Conflict of Interest. **Schema(§56)**: assignment_id·request_id·team·owner·role·assignment_reason·assigned/accepted/reassigned_at·due_date·workload·status·audit. **상태(§57)**: UNASSIGNED/ASSIGNED/ACCEPTED/IN_PROGRESS/REASSIGNMENT_REQUIRED/REASSIGNED/COMPLETED/ESCALATED/BLOCKED.
**Task Schema(§58)**: task_id·request_id·task_type·dependency_ids·assigned_team/owner·priority·status·due/started/completed_at·retry_count·result_reference·error_code·approval_required·audit_reference. **Type(§59, 22종)**: CLASSIFY_REQUEST·VERIFY_IDENTITY·VERIFY_AUTHORIZATION·RESOLVE_JURISDICTION·CONFIRM_SCOPE·DISCOVER_DATA·QUERY_PROCESSOR·REVIEW_DATA·REDACT_DATA·GENERATE_EXPORT·APPLY_CORRECTION·APPLY_RESTRICTION·APPLY_DELETION·REVIEW_OBJECTION·REVIEW_AUTOMATED_DECISION·LEGAL_REVIEW·SECURITY_REVIEW·APPROVE_FULFILLMENT·DELIVER_RESPONSE·CONFIRM_DELIVERY·CLOSE_CASE. **상태(§60)**: NOT_STARTED/READY/BLOCKED_BY_DEPENDENCY/IN_PROGRESS/WAITING_EXTERNAL/WAITING_REQUESTER/REVIEW_REQUIRED/APPROVAL_REQUIRED/COMPLETED/FAILED/CANCELLED/SKIPPED/ESCALATED. **Matrix(§103)**: | Task ID | Type | Dependency | Owner | Due Date | Status | Result | Approval | Error |
**Dependency(§61)**: Identity Verification·Authorization·Jurisdiction·Scope·Data Asset·Processor·Recipient·Archive·Legal Hold·Retention·Customer Merge/Unmerge·Consent·Suppression·Correction·Restriction·Deletion·Export·Delivery. (Part 3-3-3-2 Retention/Legal Hold·EPIC05 Merge·Part 3-3-1/3-3-2 Consent/Suppression 연계.)

---

## 7. Processor Request (§62-63)

**Schema(§62)**: processor_request_id·dsar_request_id·processor_id·request_type·subject_reference·scope·data_categories·request_sent_at·due_date·response_status·response_received_at·evidence·errors·escalation·audit. **상태(§63)**: NOT_REQUIRED/DRAFT/SENT/ACKNOWLEDGED/IN_PROGRESS/PARTIAL_RESPONSE/COMPLETED/OVERDUE/FAILED/DISPUTED/ESCALATED/BLOCKED. 실 Processor Discovery/Response=후속 강화(Part 3-3-3-1 Processor Registry 연계).

---

## 8. Communication (§64-66)

**Schema(§64)**: communication_id·request_id·direction·channel·template_id·locale·sender·recipient_reference·subject·body_reference·attachment_ids·sent/delivered/read/failed_at·failure_reason·security_level·audit_reference. **Type(§65, 14종)**: ACKNOWLEDGEMENT·INFORMATION_REQUEST·IDENTITY_VERIFICATION_REQUEST·AUTHORIZATION_REQUEST·SCOPE_CLARIFICATION·EXTENSION_NOTICE·STATUS_UPDATE·PARTIAL_RESPONSE·COMPLETION_NOTICE·DENIAL_NOTICE·DELIVERY_LINK·DELIVERY_CONFIRMATION·CLOSURE_NOTICE·ESCALATION_NOTICE. (현행 verify mail 1종 → History 형식화.)
**보안(§66)**: 수신자 검증·최소데이터·Sensitive Detail 최소화·Signed Link·Short Expiry·One-time Access·MFA 가능성·Attachment 암호화·Password 별도채널·Wrong Recipient 방지·Bounce 처리·Delivery Audit.

---

## 9. Decision (§67-69) · Approval (§70-71) · Escalation (§72-73)

**Decision Schema(§67)**: decision_id·request_id·decision_type·decision_scope·legal_basis·policy_version·reasons·supported/unsupported_portions·exemptions·restrictions·required_controls·approver·decided_at·valid_until·requester_communication·appeal_information·audit_reference. **Type(§68, 14종)**: ACCEPTED·ACCEPTED_WITH_LIMITS·PARTIALLY_ACCEPTED·CLARIFICATION_REQUIRED·IDENTITY_NOT_VERIFIED·AUTHORIZATION_INSUFFICIENT·OUT_OF_SCOPE·NOT_APPLICABLE·DENIED·WITHDRAWN·DUPLICATE_LINKED·LEGAL_REVIEW_REQUIRED·SECURITY_REVIEW_REQUIRED·PROCESSOR_RESPONSE_PENDING.
**★Denial 원칙(§69)**: 구체적 사유·Policy/Legal Basis·승인·범위·지원가능부분·Appeal/Contact·Communication·Audit 필수. **데이터 Discovery 어려움·시스템 불편만으로 자동거부 금지**.
**Approval(§70-71)**: Case Owner·Privacy Reviewer·Security Reviewer·Legal Reviewer·Data Owner·Processor Manager·Support Lead·Compliance Officer·Executive Escalation. 상태=NOT_REQUIRED/PENDING/APPROVED/APPROVED_WITH_CONDITIONS/REJECTED/EXPIRED/REVOKED/ESCALATED.
**Escalation Trigger(§72)**: Due Date 임박·Overdue·Identity Conflict·Jurisdiction Conflict·Legal Hold·Security Risk·High Sensitive·Minor·Agent Dispute·Processor Overdue·Discovery Gap·Wrong Delivery·Repeat Failure·Complaint·Regulator·Executive Risk. **상태(§73)**: REQUESTED/ASSIGNED/IN_REVIEW/ACTION_REQUIRED/RESOLVED/CLOSED/BLOCKED.

---

## 10. Fulfillment Job (§74-75) · Withdrawal (§76) · Closure (§77-78)

**Fulfillment Job Contract(§74)**: fulfillment_job_id·request_id·request_type·subject·scope·identity_verification_reference·authorization_reference·jurisdiction·policy_version·data_asset_scope·processor_scope·requested_format·due_date·priority·idempotency_key·status·correlation_id·environment. **★Access/Export/Rectification/Restriction/Erasure Engine 이 사용할 계약 — 세부 Engine=Part 3-3-3-3-3~6.** **상태(§75)**: NOT_STARTED/READY/VALIDATING/RUNNING/PARTIAL/REVIEW_REQUIRED/APPROVAL_REQUIRED/COMPLETED/FAILED/CANCELLED/ROLLED_BACK/BLOCKED.
**Withdrawal(§76)**: 철회의사 검증·Requester 인증·현재상태 확인·진행중 Job 취소가능성·완료 Action 확인·Processor 요청취소·Communication·Audit·Retention·재접수 가능성. **★이미 발생한 Consent Withdrawal/별도 Suppression 은 되돌리지 않음**(Part 3-3-1/3-3-2 정합).
**Closure 확인(§77)**: Identity·Authorization·Scope·Decision·Fulfillment·Review·Approval·Communication·Delivery·Processor 상태·Open Task·Open Escalation·Evidence·Audit·Retention Policy. **Reason(§78, 14종)**: COMPLETED·PARTIALLY_COMPLETED·DENIED·WITHDRAWN·DUPLICATE·INVALID_REQUEST·IDENTITY_FAILED·AUTHORIZATION_FAILED·REQUESTER_NON_RESPONSE·NOT_APPLICABLE·TRANSFERRED_TO_OTHER_ENTITY·LEGAL_BLOCK·SECURITY_BLOCK·SYSTEM_FAILURE.
