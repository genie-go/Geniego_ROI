# Canonical DSAR Schema — Request/Version, Type/Subtype, Subject/Requester/Representative, Intake, Jurisdiction, Responsible Entity, Scope & State Machine

> **EPIC 06-A Part 3-3-3-3-1** (1/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): 기존 `backend/src/Handlers/Dsar.php`(283차·/v424·861줄) — `dsar_request`+`dsar_audit_log` 2테이블·타입 `access|erasure|portability` 3종 하드코딩·상태 `pending_verification/verified/completed/rejected` 4종·`SLA_DAYS=30` 하드코딩·`VERIFY_TTL_HOURS=72`·이메일토큰(sha256) fail-closed·Requester≡Subject·운영자대행 접수 1채널 · `GdprConsent`(쿠키동의)·`Compliance`(SOC2/ISO) · Part 3-3-3-1 Privacy(Subject·Purpose·Notice)·Part 3-3-3-2 Retention(Deletion Eligibility·Legal Hold·Tombstone).
> 형제: [`CANONICAL_DSAR_WORKFLOW.md`](CANONICAL_DSAR_WORKFLOW.md) · [`CANONICAL_DSAR_GOVERNANCE.md`](CANONICAL_DSAR_GOVERNANCE.md) · ADR=[`../architecture/ADR_CANONICAL_DSAR_REQUEST_REGISTRY.md`](../architecture/ADR_CANONICAL_DSAR_REQUEST_REGISTRY.md)
> **성격**: 목표 계약. 실 Data Discovery·Export 파일생성·Correction·Restriction Enforcement·삭제 실행은 Part 3-3-3-3-2~8. 실 Registry 구현은 후속 승인 세션.

---

## 0. 현행 대비 (실측 → Canonical)

| 현행 (Dsar.php 283차) | Canonical 목표 |
|---|---|
| `dsar_request`(id·subject_email/phone·req_type·status·verify_token_hash·verify_expires_at·verified_at·requested_at·due_at·completed_at·result_json·note) 단일테이블 | `DSAR_REQUEST`+`DSAR_REQUEST_VERSION`(불변 이력)·정규화 Entity 30여종 |
| req_type `access\|erasure\|portability` **3종 하드코딩**(§283 in_array 화이트리스트) | Request Type Registry 14종 + Subtype(Access 9·Rectification 7·Restriction 5…)·상태(ACTIVE/DEPRECATED…) |
| status 4종 flat(pending_verification→verified→completed/rejected) | Request State Machine 30+상태·금지전이·Versioning |
| **Requester ≡ Subject 가정**(subject_email 로만 식별) | Subject ≠ Requester 분리·Representative·Authorization(본인/Agent/Guardian/Legal Rep/Company Rep) |
| 접수=운영자 대행 POST(requirePro)+subject 이메일 verify 링크 **1채널** | Intake Channel Registry 13종(Web/Portal/Email/Support/Phone/API/Agent Portal/Regulator…)·Intake Validation·Malicious Content 방어 |
| Jurisdiction **없음**·SLA_DAYS=30 단일하드코딩 | Jurisdiction Candidate/Resolution·Responsible Legal Entity·SLA Policy Registry(Version) |
| Scope=암묵(subject email/phone → collectSubjectData 다테이블 조회) | DSAR Scope Contract(Subject/Tenant/Brand/Account/Date/Category/Activity/Processor/Recipient·Exclusion) |
| Priority/Risk/Duplicate/Abuse/Extension/Pause **전무** | Priority·Risk Assessment·Duplicate Detection·Abuse·Extension·Pause 기반 |
| Evidence=audit_log 텍스트만·Attachment 없음 | Evidence Schema(무결성/분류/접근/Retention)·Attachment Governance(Allowlist/Malware/Macro/Bomb) |
| Assignment/Task/Dependency/Processor Request/Decision/Approval/Escalation **없음**(운영자 직접 execute) | Case Assignment·Task/Dependency Graph·Processor Request·Decision/Approval/Escalation·Fulfillment Job Contract |

**무후퇴**: Dsar.php 의 이메일 fail-closed 본인확인·access/erasure/portability·GDPR Art.20/PIPA §35 export·anonymize 삭제·append-only audit·GdprConsent·Compliance 는 **정본 — 재구현 금지, Canonical DSAR Registry·공통 Workflow 로 확장**. Request Type별(Access/Export/Correction/Restriction/Deletion) 독립 Case Registry 신설 금지(§108).

---

## 1. Canonical DSAR Entity Model (§4)

Entity: `DSAR_REQUEST(_VERSION)` · `DSAR_REQUEST_TYPE` · `DSAR_SUBJECT` · `DSAR_REQUESTER` · `DSAR_REPRESENTATIVE` · `DSAR_AUTHORIZATION` · `DSAR_INTAKE` · `DSAR_SCOPE` · `DSAR_JURISDICTION` · `DSAR_RESPONSIBLE_ENTITY` · `DSAR_POLICY` · `DSAR_SLA_POLICY` · `DSAR_DUE_DATE` · `DSAR_EXTENSION` · `DSAR_PAUSE` · `DSAR_EVIDENCE` · `DSAR_ATTACHMENT` · `DSAR_IDENTITY_VERIFICATION` · `DSAR_RISK_ASSESSMENT` · `DSAR_DUPLICATE_MATCH` · `DSAR_CASE_ASSIGNMENT` · `DSAR_TASK` · `DSAR_DEPENDENCY` · `DSAR_PROCESSOR_REQUEST` · `DSAR_COMMUNICATION` · `DSAR_DECISION` · `DSAR_APPROVAL` · `DSAR_ESCALATION` · `DSAR_FULFILLMENT_JOB` · `DSAR_AUDIT_EVENT`. (기존 등가=dsar_request/dsar_audit_log → 확장·나머지 신규. CE Registry 등재.)

---

## 2. DSAR Request Schema (§5) & Version (§26)

**Request(§5)**: dsar_request_id · request_reference · request_version_id · tenant_id · workspace_id · brand_id · legal_entity_id · subject_id · requester_id · representative_id · request_type · request_subtypes · intake_channel · intake_source · original_request_reference · received_at · acknowledged_at · jurisdiction_status · jurisdiction_ids · responsible_entity_id · scope_status · identity_verification_status · authorization_status · eligibility_status · priority · risk_level · status · sla_policy_id · due_date · extension_status · pause_status · assigned_team · assigned_owner · approval_status · fulfillment_status · communication_status · closure_reason · created/updated/closed_at · lineage_id · audit_reference.

**Version(§26·불변 이력)**: request_version_id · request_id · version_number · previous_version_id · changed_fields · previous_status · current_status · change_reason · changed_by · changed_at · source_event_id · audit_reference. **★분류·Scope·Assignment·DueDate·Extension·Decision·Communication 변경은 덮어쓰지 않고 Version/Event 로 보존**(§3.9). **Matrix(§101)**: | Request ID | Type | Subject | Requester | Jurisdiction | Scope | Verification | SLA | Status | Owner | Risk |

---

## 3. Request Type (§6) · Subtype (§7) · 상태 (§8)

**Type(§6, 14종)**: ACCESS · PORTABILITY · RECTIFICATION · RESTRICTION · ERASURE · OBJECTION · CONSENT_WITHDRAWAL · MARKETING_OPT_OUT · AUTOMATED_DECISION_REVIEW · PROFILING_OBJECTION · DATA_SHARING_OBJECTION · COMPLAINT · INFORMATION_REQUEST · OTHER_PRIVACY_REQUEST. **★일반 Privacy 문의를 모두 DSAR 로 과대분류 금지·실권리요청을 단순 Support Ticket 으로 축소 금지**(§3.1).
**Subtype(§7)**: ACCESS→{CURRENT_DATA·PROCESSING_PURPOSES·DATA_SOURCES·RECIPIENTS·RETENTION_INFORMATION·PROFILING_INFORMATION·AUTOMATED_DECISION_INFORMATION·CONSENT_HISTORY·SHARING_HISTORY} · RECTIFICATION→{CONTACT_INFO·IDENTITY_INFO·ACCOUNT_INFO·TRANSACTION_INFO·PREFERENCE_INFO·DERIVED_PROFILE·MODEL_OUTPUT_DISPUTE} · RESTRICTION→{DISPUTED_ACCURACY·UNLAWFUL_PROCESSING_CLAIM·LEGAL_CLAIM_PRESERVATION·OBJECTION_PENDING_REVIEW·MANUAL_RESTRICTION_REQUEST}.
**Type 상태(§8)**: ACTIVE/RESTRICTED/LEGAL_REVIEW_REQUIRED/DEPRECATED/SUSPENDED/BLOCKED. Deprecated Type 신규 Intake 사용 금지.

---

## 4. Subject (§9-10) · Requester (§11-12) · Representative (§13) · Authorization (§14)

**Subject(§9)**: dsar_subject_id · subject_type · canonical_subject_reference · customer_profile_id · person_id · account_id · external_contact_id · tenant/ws/brand/legal_entity_id · jurisdiction_candidates · identity_status · relationship_status · deletion_status · created/updated_at · lineage_id. (EPIC05 person_id·Part3-3-3-1 Privacy Subject 정합.)
**Subject Type(§10, 15종)**: PERSON · CUSTOMER · PROSPECT · LEAD · SUBSCRIBER · ACCOUNT_CONTACT · COMPANY_CONTACT · ANONYMOUS_VISITOR · DEVICE_USER · CREATOR · PARTNER_CONTACT · EMPLOYEE_CONTACT · FORMER_CUSTOMER · DELETED_SUBJECT · UNKNOWN_SUBJECT.

**Requester(§11)**: requester_id · requester_type · name_reference · contact_method · contact_reference · relationship_to_subject · identity_verification_status · authorization_required · authorization_status · locale · timezone · preferred_communication_channel · accessibility_requirement · created/updated_at. **Type(§12, 10종)**: DATA_SUBJECT · AUTHORIZED_AGENT · PARENT · GUARDIAN · LEGAL_REPRESENTATIVE · EXECUTOR · COMPANY_REPRESENTATIVE · GOVERNMENT_AUTHORITY · INTERNAL_STAFF · UNKNOWN. **★Requester≠Subject 절대 분리**(§3.3)·Unauthorized Third Party 는 별도 처리.

**Representative(§13)**: representative_id · requester_id · subject_id · representative_type · authority_source · authorization_evidence_id · valid_from/until · allowed_request_types · allowed_scope · verification_status · revocation_status · created/updated_at · audit_reference.
**Authorization 상태(§14, 10종)**: NOT_REQUIRED · PENDING · VERIFIED · VERIFIED_WITH_LIMITS · EXPIRED · REVOKED · INVALID · INSUFFICIENT · MANUAL_REVIEW · BLOCKED. 상세 Engine=Part 3-3-3-3-2.

---

## 5. Intake (§15-18)

**Channel Registry(§15, 13종)**: WEB_FORM · ACCOUNT_PORTAL · PREFERENCE_CENTER · EMAIL · POSTAL_MAIL · CUSTOMER_SUPPORT · PHONE · MOBILE_APP · API · AUTHORIZED_AGENT_PORTAL · REGULATOR_FORWARD · INTERNAL_REFERRAL · OTHER. (현행 = 운영자 POST + subject verify 링크 1채널 → 확장.)
**Schema(§16)**: intake_id · request_id · channel · source_system · source_account · submitted_at · received_at · raw_message_reference · parsed_request_type · parsed_subject_reference · locale · attachment_ids · spam_score · malware_scan_status · intake_validation_status · idempotency_key · correlation_id · audit_reference.
**Validation(§17)**: 최소연락수단·Request Intent·Subject Reference·Tenant/Brand 후보·Attachment 보안·중복·Spam·Phishing·Prompt Injection·Malicious File·Unsupported·Jurisdiction 후보·Language·Accessibility·Emergency·Security Incident.
**★Malicious Content 방어(§18·3.7)**: Email/Form/Attachment 의 자연어 지시를 **시스템 명령으로 취급 금지**. 차단: Tool 실행지시·관리자권한요청·데이터필터 우회지시·시스템 Prompt 노출요청·타고객 데이터요청·Raw Query 삽입·File Path 조작·URL 자동다운로드·Attachment Macro/Script.

---

## 6. Jurisdiction (§19-20) & Responsible Entity (§21-22)

**Candidate Schema(§19)**: jurisdiction_candidate_id · request_id · jurisdiction · source · confidence · subject_residence_evidence · account_region · legal_entity · service_region · notice_version · conflict · review_status · selected · audit_reference. **★Requester 선택값만으로 확정 금지**(§3.5) — Subject Residence·Account Region·Contracting Entity·Service Region·Data Controller·Brand·Applicable Notice·Request Context·Legal Review 종합.
**Resolution 상태(§20)**: RESOLVED · MULTIPLE_APPLICABLE · LEGAL_REVIEW_REQUIRED · INSUFFICIENT_INFORMATION · CONFLICT · NOT_APPLICABLE · BLOCKED.
**Responsible Entity Mapping(§21)**: Tenant·Brand·Contracting Entity·Service·Customer Region·Processing Activity·Notice·Controller 역할·Joint Controller·Processor 역할·Legal Review 기준 결정. **상태(§22)**: RESOLVED · JOINT_RESPONSIBILITY · PROCESSOR_ONLY · CONTROLLER_CONFIRMATION_REQUIRED · LEGAL_REVIEW_REQUIRED · UNKNOWN · BLOCKED.

---

## 7. DSAR Scope Contract (§23-25)

**Contract(§23)**: request_scope · subject_scope · tenant_scope · brand_scope · account_scope · source_system_scope · date_range · data_category_scope · processing_activity_scope · processor_scope · recipient_scope · request_exclusions · requested_format · requested_delivery_method · language · accessibility · urgency · notes.
**상태(§24)**: NOT_DEFINED · DRAFT · SUBJECT_CONFIRMATION_REQUIRED · REVIEW_REQUIRED · CONFIRMED · LIMITED · EXPANDED · PARTIALLY_SUPPORTED · BLOCKED · COMPLETED.
**원칙(§25)**: 필요범위만·**다른 Subject/Tenant/Brand 제외**·법적제한 데이터 제외가능·Third-party Rights 검토·Security Secret 제외·Internal Privileged/Trade Secret 검토·과도요청 검토·요청자 실제의도 반영. (현행 collectSubjectData 의 subject email/phone → customerIds/orderIds 범위를 형식화·Cross-Tenant 혼입 차단.)

---

## 8. Request State Machine (§27-29)

**상태(§27, 30+)**: RECEIVED · INTAKE_VALIDATION · ACKNOWLEDGEMENT_PENDING · CLASSIFICATION_PENDING · IDENTITY_VERIFICATION_PENDING · AUTHORIZATION_PENDING · JURISDICTION_REVIEW · SCOPE_REVIEW · ELIGIBILITY_REVIEW · DATA_DISCOVERY_PENDING · FULFILLMENT_PENDING · FULFILLMENT_IN_PROGRESS · REVIEW_PENDING · APPROVAL_PENDING · DELIVERY_PENDING · DELIVERED · PARTIALLY_FULFILLED · COMPLETED · DENIED · WITHDRAWN_BY_REQUESTER · CANCELLED · DUPLICATE_LINKED · PAUSED · EXTENDED · ESCALATED · LEGAL_REVIEW_REQUIRED · MANUAL_REVIEW · FAILED · CLOSED.
**전이 요구(§28)**: 모든 전이에 Actor·Reason·Prev/Next Status·Timestamp·Policy Version·Permission·SLA 영향·Communication 필요여부·Audit.
**★금지 전이(§29·검증없이 불허)**: RECEIVED→COMPLETED · RECEIVED→DENIED · Identity Pending→Data Delivered · Authorization Pending→Fulfillment · Scope 미확정→대량 Export · Approval Pending→Delivered · Legal Review Required→자동승인 · Closed→Fulfillment 재개 · 다른 Request 결과복사 · 다른 Subject 결과연결. **Transition Matrix**: | Current | Trigger/Actor | Next | Permission | Validation | SLA 영향 | Communication | Audit |
