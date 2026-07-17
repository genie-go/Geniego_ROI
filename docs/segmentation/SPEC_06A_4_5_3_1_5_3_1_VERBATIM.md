# 스펙 원문 영속 (Verbatim) — EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1

> **Rebate Approval Foundation & Canonical Approval Entity Governance · Version 1.0**
> 289차(2026-07-17) 수령분 · **원문 그대로 · 코드변경 0**
> 요구 집계(분모 축): [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md)

## 🔴 이 파일이 존재하는 이유 — 289차 자기 오류 정정

**1-6 D-3**: *"`source_persisted = false` 인 요구는 분모에 넣을 수 없다. **세션 컨텍스트는 저장소가 아니다.**"*

289차는 스펙 수령 즉시 `REQ_...APPROVAL_FOUNDATION.md` 를 만들며 **분모를 영속했다고 판단했다.**
그러나 그 파일은 **개수만**(“§6 Domain Type = 31”) 담았고 **항목명은 담지 않았다.**
→ 산출 에이전트가 **"전사할 원문이 저장소에 없다"** 며 정지했고(요구 날조 0 준수), **그 지적이 옳았다.**

> **개수는 분모가 아니다.** "31 종"은 **무엇이 31 종인지 모르면 검증도 반증도 불가능**하다 —
> **289차 ② 의 `351` 이 정확히 그런 값이었다**(측정 명령 없이 박힌 숫자 → 복제 → 정본화).
> **개수만 적는 것은 351 사건을 요구 목록에서 재현하는 것이다.**

**따라서 스펙 원문을 여기 그대로 고정한다.** 이 파일이 **`source_persisted = true` 의 실체**이며,
`REQ_*` 는 그 위의 **집계·축 정의**다. **인용 근거는 항상 이 파일**이다.

---

# 0. 작업 목적

앞 단계에서 구축한 Rebate Authorization Foundation과 Role·Organization·Tenant·Workspace·Scope Governance 위에, Rebate Program과 관련된 모든 승인 요청을 표준화하여 관리하는 **Rebate Approval Foundation & Canonical Approval Entity Governance**를 구축하라.

이번 단계는 Approval Workflow 실행 엔진, Multi-Level Approval, Dynamic Rule Engine, Risk-Based Approval, SLA·Escalation, Parallel·Sequential Approval, Delegation, Emergency Approval 또는 전체 Approval Audit Certification을 완성하는 단계가 아니다.

이번 블록에서는 후속 Approval Engine 전체가 공통으로 사용하는 다음 기반을 완성한다.

* Approval Request
* Approval Subject
* Approval Resource
* Approval Action
* Approval Case
* Approval Item
* Approval Requirement
* Approval Decision
* Approval Decision Reason
* Approval Participant
* Approval Actor
* Approval Status
* Approval Context
* Approval Policy Reference
* Approval Version
* Approval Snapshot
* Approval Evidence
* Approval Correlation
* Approval Idempotency
* Approval Cancellation
* Approval Withdrawal
* Approval Reopen
* Approval Supersession
* Approval Reconciliation

다음 질문에 정확하게 답할 수 있어야 한다.

* 무엇에 대한 승인인가
* 누가 승인을 요청했는가
* 누구 또는 어떤 시스템이 승인 대상인가
* 어떤 Tenant·Workspace·법인·Program에 속하는가
* 어떤 Resource와 Action이 승인 대상인가
* 승인 금액과 Currency는 무엇인가
* 어떤 Policy와 Role이 승인 필요성을 발생시켰는가
* Approval Request와 Approval Case는 어떻게 구분되는가
* 하나의 요청에 여러 승인 항목이 포함될 수 있는가
* 승인 항목별로 승인 결과를 다르게 처리할 수 있는가
* 누가 승인자 후보인가
* 누가 실제 승인 결정을 내렸는가
* 승인자와 요청자가 동일한가
* 승인자는 승인 당시 유효한 Role·Scope를 보유했는가
* 승인 전에 어떤 상태와 데이터가 Snapshot으로 고정되었는가
* 승인 후 원본 데이터가 변경되었는가
* 동일 요청이 중복 생성되거나 중복 승인되는가
* 요청 철회·취소·재개·재승인을 어떻게 처리하는가
* 기존 승인 요청이 새 Version으로 대체되었는가
* 승인 결정의 근거와 Evidence를 재현할 수 있는가
* UI, API, ERP, Provider 및 Internal Approval 상태가 일치하는가
* 승인 완료 전 고위험 작업이 실행되지 않는가
* 승인 완료 후 승인 범위를 초과한 작업이 실행되지 않는가

이번 구현은 GeniegoROI 내부 운영만을 위한 결재 테이블이 아니다.

각 GeniegoROI 구독 고객사가 자신의 Rebate, Campaign, Budget, Funding, Claim, Settlement, Payout, Refund, Contract 및 Migration 승인 업무를 같은 Canonical Approval Foundation 위에서 운영할 수 있도록 해야 한다.

---

# 1. Approval Engine 전체 권장 분할 구조

Approval Engine은 다음 순서로 구현한다.

1. `4-5-3-1-5-3-1` Approval Foundation & Canonical Approval Entity
2. `4-5-3-1-5-3-2` Approval Workflow Definition & Flow Execution Engine
3. `4-5-3-1-5-3-3` Multi-Level Approval & Hierarchical Approval Governance
4. `4-5-3-1-5-3-4` Dynamic Approval Rule & Conditional Routing Engine
5. `4-5-3-1-5-3-5` Risk-Based Approval, Threshold & Financial Decision Governance
6. `4-5-3-1-5-3-6` Approval SLA, Deadline, Reminder & Escalation Governance
7. `4-5-3-1-5-3-7` Parallel, Sequential, Quorum & Consensus Approval Governance
8. `4-5-3-1-5-3-8` Approval Delegation, Substitute & Availability Governance
9. `4-5-3-1-5-3-9` Emergency, Expedited & Exception Approval Governance
10. `4-5-3-1-5-3-10` Approval Audit, Evidence, Reconciliation & Certification

이번 블록에서는 첫 번째 기반만 구현한다.

후속 블록의 상세 Workflow 실행 로직을 중복 구현하지 말고 확장 가능한 Contract와 Hook을 준비하라.

---

# 2. 실행 역할

너는 다음 역할을 동시에 수행한다.

* 초엔터프라이즈급 Approval Platform Architect
* Canonical Approval Domain 책임자
* Approval Request 책임자
* Approval Case 책임자
* Approval Item 책임자
* Approval Resource·Action 책임자
* Approval Requirement 책임자
* Approval Participant 책임자
* Approval Decision 책임자
* Approval Version 책임자
* Approval Snapshot 책임자
* Approval Context 책임자
* Approval Idempotency 책임자
* Approval State Machine 책임자
* Approval Cancellation·Withdrawal 책임자
* Approval Reopen·Supersession 책임자
* Approval Evidence·Audit 기반 책임자
* Approval Reconciliation 책임자
* Multi-tenant Approval Isolation 책임자
* 승인 전·후 데이터 무결성 책임자
* 중복 승인·재사용·승인 범위 초과 방지 책임자
* 기존 Approval 구현의 비파괴적 통합 책임자
* ADR·PM·Repeat Problem·Agent Execution History 관리 책임자

---

# 3. 선행조건

작업 전 반드시 다음 결과를 확인하라.

## 3.1 Authorization·Role 기반

* `AUTHORIZATION_SUBJECT`
* `AUTHORIZATION_RESOURCE`
* `AUTHORIZATION_ACTION`
* `AUTHORIZATION_PERMISSION`
* `AUTHORIZATION_ROLE`
* `AUTHORIZATION_SUBJECT_ROLE`
* `AUTHORIZATION_SCOPE`
* `AUTHORIZATION_SCOPE_BINDING`
* `AUTHORIZATION_POLICY`
* `AUTHORIZATION_POLICY_VERSION`
* `AUTHORIZATION_REQUEST`
* `AUTHORIZATION_DECISION`
* `REBATE_ROLE`
* `REBATE_ROLE_VERSION`
* `REBATE_ROLE_ASSIGNMENT`
* `REBATE_ROLE_ASSIGNMENT_SCOPE`
* `REBATE_ROLE_RECONCILIATION`

## 3.2 Rebate Program 기반

* `REBATE_PROGRAM`
* `REBATE_PROGRAM_VERSION`
* `REBATE_PROGRAM_LIFECYCLE`
* `REBATE_PROGRAM_CHANGE_SET`
* `REBATE_PROGRAM_AMENDMENT`
* `REBATE_PROGRAM_CHANGE_IMPACT`
* `REBATE_PROGRAM_APPROVAL_REFERENCE`
* `REBATE_PROGRAM_ACTIVATION`
* `REBATE_PROGRAM_MIGRATION_PLAN`
* `REBATE_FUNDING_AGREEMENT_REFERENCE`
* `REBATE_FUNDING_ALLOCATION`
* `REBATE_FUNDING_COMMITMENT`
* `REBATE_ECONOMIC_RESPONSIBILITY_ROLE`

## 3.3 공통 비즈니스 기반

* Tenant Registry
* Workspace Registry
* Organization Registry
* Legal Entity Registry
* Country·Region Registry
* Environment Registry
* Currency Registry
* Contract Registry
* Identity Registry
* Provider Registry
* Provider Account Registry
* Feature Flag Registry
* Audit Registry
* Notification Registry
* Incident Registry
* Task Registry
* Workflow Registry가 존재하는 경우 해당 구현

## 3.4 기존 Approval 구현 전수 조사

Repository와 연결 시스템에서 다음을 확인하라.

* Existing Approval Table
* Existing Approval Request
* Existing Approval Case
* Existing Approval Workflow
* Existing Approval Step
* Existing Approval Status
* Existing Approval Decision
* Existing Approver
* Existing Reviewer
* Existing Approval Queue
* Existing Approval Inbox
* Existing Approval History
* Existing Approval Comment
* Existing Approval Evidence
* Existing Approval Attachment
* Existing Approval Notification
* Existing Approval SLA
* Existing Approval Escalation
* Existing Approval Delegation
* Existing Approval Substitute
* Existing Emergency Approval
* Existing Budget Approval
* Existing Funding Approval
* Existing Campaign Approval
* Existing Claim Approval
* Existing Settlement Approval
* Existing Payout Approval
* Existing Refund Approval
* Existing Contract Approval
* Existing Migration Approval
* Existing Access Approval
* Existing ERP Approval
* Existing Provider Approval
* Existing BPMN Workflow
* Existing State Machine
* Existing Task Engine
* Existing Temporal·Camunda·Flowable·Zeebe·Step Functions 사용 여부
* Existing Idempotency
* Existing Audit·Monitoring
* Git 이력
* 테스트 결과
* 운영 로그

동일 목적 Approval Foundation이 존재하면 중복 생성하지 말고 Canonical Approval Domain에 통합하라.

---

# 4. 핵심 원칙

## 4.1 Approval Request와 Business Resource를 동일시하지 않는다

Approval Request는 특정 Business Resource에 대한 승인 요청이다.

원본 Rebate Program·Funding·Claim·Settlement·Payout Record 자체를 Approval Request로 사용하지 않는다.

## 4.2 Approval Request와 Approval Case를 구분한다

* Approval Request: 사용자가 제출한 승인 요구
* Approval Case: Approval Engine이 실제로 평가·진행하는 승인 건
* Approval Item: 하나의 Case에 포함된 개별 승인 항목

## 4.3 승인 필요성과 승인 결과를 구분한다

Authorization 또는 Business Policy가 Approval Requirement를 생성한다.

승인자는 그 Requirement에 대해 Decision을 내린다.

## 4.4 승인 당시 데이터를 Snapshot으로 보존한다

승인 대상 Resource가 이후 변경되더라도 당시 무엇을 승인했는지 재현할 수 있어야 한다.

## 4.5 승인 후 원본이 변경되면 재승인을 검토한다

Critical Field 또는 Financial Amount가 변경되면 기존 승인을 자동 재사용하지 않는다.

## 4.6 승인자는 승인 시점에 유효한 권한을 가져야 한다

현재 Role뿐 아니라 Decision 시점의 Role Version, Assignment Scope, Tenant, Legal Entity 및 Environment를 보존한다.

## 4.7 Deny와 Rejection을 구분한다

* Authorization Deny: 승인 요청 또는 접근 자체를 허용하지 않음
* Approval Rejection: 유효한 승인 요청을 승인자가 거부함

## 4.8 취소와 철회를 구분한다

* Withdrawal: 요청자가 승인 완료 전에 요청을 철회
* Cancellation: 시스템·관리자가 승인 Case를 무효화
* Rejection: 승인자가 거절
* Expiration: 기한 만료
* Supersession: 새 요청 또는 Version으로 대체

## 4.9 Approval Decision은 Append-only로 관리한다

기존 Decision을 덮어쓰거나 삭제하지 말고 새 Decision·Correction·Reversal Event를 추가한다.

## 4.10 동일 승인으로 여러 실행을 무제한 허용하지 않는다

Approval은 승인된 Resource, Action, Scope, Amount, Currency, Version 및 Validity 범위 안에서만 사용할 수 있어야 한다.

---

# 5. Canonical Entity

기존 동등 Entity가 없을 경우 최소 다음을 구축하라.

* `APPROVAL_REQUEST`
* `APPROVAL_REQUEST_VERSION`
* `APPROVAL_REQUEST_RESOURCE`
* `APPROVAL_REQUEST_ACTION`
* `APPROVAL_REQUEST_CONTEXT`
* `APPROVAL_CASE`
* `APPROVAL_CASE_VERSION`
* `APPROVAL_ITEM`
* `APPROVAL_REQUIREMENT`
* `APPROVAL_REQUIREMENT_SOURCE`
* `APPROVAL_PARTICIPANT`
* `APPROVAL_ACTOR`
* `APPROVAL_ACTOR_AUTHORIZATION_SNAPSHOT`
* `APPROVAL_DECISION`
* `APPROVAL_DECISION_REASON`
* `APPROVAL_DECISION_CONDITION`
* `APPROVAL_DECISION_OBLIGATION`
* `APPROVAL_STATUS_HISTORY`
* `APPROVAL_RESOURCE_SNAPSHOT`
* `APPROVAL_CONTEXT_SNAPSHOT`
* `APPROVAL_POLICY_REFERENCE`
* `APPROVAL_CORRELATION`
* `APPROVAL_IDEMPOTENCY`
* `APPROVAL_CANCELLATION`
* `APPROVAL_WITHDRAWAL`
* `APPROVAL_REOPEN`
* `APPROVAL_SUPERSESSION`
* `APPROVAL_EXECUTION_BINDING`
* `APPROVAL_CONSUMPTION`
* `APPROVAL_RECONCILIATION`
* `APPROVAL_CANDIDATE`
* `APPROVAL_EVIDENCE`
* `APPROVAL_AUDIT_EVENT`

Rebate 전용 Approval Entity를 업무별로 복제하지 말고 공통 Canonical Approval Foundation을 구축한 뒤 Domain Type과 Resource Type으로 확장하라.

---

# 6. Approval Domain Type

최소 다음 Domain Type을 지원하라.

* REBATE_PROGRAM
* REBATE_PROGRAM_VERSION
* REBATE_PROGRAM_ACTIVATION
* REBATE_PROGRAM_TERMINATION
* REBATE_PROGRAM_MIGRATION
* REBATE_PROGRAM_RESTORATION
* REBATE_FUNDING
* REBATE_FUNDING_ALLOCATION
* REBATE_BUDGET
* REBATE_COMMITMENT
* REBATE_CLAIM
* REBATE_CLAIM_ADJUSTMENT
* REBATE_ACCRUAL
* REBATE_ACCRUAL_ADJUSTMENT
* REBATE_SETTLEMENT
* REBATE_CREDIT_MEMO
* REBATE_DEBIT_MEMO
* REBATE_PAYOUT
* REBATE_PAYOUT_REVERSAL
* REBATE_RECOVERY
* REBATE_DISPUTE
* REBATE_CONTRACT
* REBATE_PROVIDER_CHANGE
* REBATE_ACCESS_REQUEST
* REBATE_POLICY_CHANGE
* REBATE_EMERGENCY_ACTION
* CAMPAIGN
* MARKETING_BUDGET
* REFUND
* CONTRACT
* DATA_EXPORT
* CUSTOM

---

# 7. Approval Request

`APPROVAL_REQUEST`

필수 필드:

* approval_request_id
* request_number
* approval_domain_type
* request_type
* tenant_id
* workspace_id
* organization_id
* legal_entity_id
* country
* region
* environment
* requester_subject_id
* requester_role_assignment_id
* requested_for_subject_id
* source_system
* source_channel
* business_resource_type
* business_resource_id
* business_resource_version
* requested_action
* requested_amount
* requested_currency
* requested_scope
* business_justification
* urgency
* risk_reference
* policy_reference
* authorization_decision_reference
* correlation_id
* parent_request_id
* original_request_id
* submitted_at
* valid_until
* status
* evidence

Request Type:

* CREATE
* UPDATE
* APPROVE
* ACTIVATE
* PAUSE
* RESUME
* SUSPEND
* TERMINATE
* DELETE
* RESTORE
* MIGRATE
* FUND
* ALLOCATE
* COMMIT
* ADJUST
* SETTLE
* PAY
* REVERSE
* REFUND
* EXPORT
* ACCESS
* POLICY_CHANGE
* EMERGENCY
* CUSTOM

---

# 8. Approval Request Version

`APPROVAL_REQUEST_VERSION`

필수 필드:

* approval_request_version_id
* approval_request_id
* version_number
* previous_version_id
* version_type
* change_summary
* changed_fields
* amount_before
* amount_after
* currency_before
* currency_after
* scope_before
* scope_after
* resource_version_before
* resource_version_after
* created_at
* created_by
* immutable_hash
* requires_reapproval
* status
* evidence

Version Type:

* INITIAL
* REQUESTER_EDIT
* SYSTEM_ENRICHMENT
* POLICY_ENRICHMENT
* CORRECTION
* RESUBMISSION
* REOPEN
* SUPERSESSION
* MIGRATION
* EMERGENCY

---

# 9. Approval Request Resource

`APPROVAL_REQUEST_RESOURCE`

하나의 요청이 하나 이상의 Resource를 참조할 수 있게 하라.

필수 필드:

* approval_request_resource_id
* approval_request_id
* resource_type
* resource_id
* resource_version
* relationship_type
* primary 여부
* tenant_id
* workspace_id
* legal_entity_id
* environment
* data_classification
* financial_sensitivity
* status
* evidence

Relationship Type:

* PRIMARY
* AFFECTED
* DEPENDENCY
* FUNDING_SOURCE
* CONTRACT_SOURCE
* BENEFICIARY
* PROVIDER_ACCOUNT
* MIGRATION_SOURCE
* MIGRATION_TARGET
* SUPPORTING
* OTHER

---

# 10. Approval Request Action

`APPROVAL_REQUEST_ACTION`

필수 필드:

* approval_request_action_id
* approval_request_id
* authorization_action_id
* action_code
* target_resource_type
* target_resource_id
* requested execution count
* maximum execution count
* amount limit
* currency
* scope limit
* environment
* execution validity
* status
* evidence

승인된 Action과 실제 실행 Action이 일치하도록 후속 Execution Binding에 사용하라.

---

# 11. Approval Request Context

`APPROVAL_REQUEST_CONTEXT`

필수 필드:

* approval_request_context_id
* approval_request_id
* request_time
* timezone
* source channel
* source device reference
* source network zone
* authentication assurance
* MFA state
* session reference
* requester risk
* resource risk
* transaction risk
* incident state
* financial amount
* currency
* contract reference
* funding reference
* provider reference
* customer impact
* compliance impact
* accounting impact
* urgency
* evidence

---

# 12. Approval Case

`APPROVAL_CASE`

Approval Engine이 실제로 관리하는 최상위 실행 단위다.

필수 필드:

* approval_case_id
* case_number
* approval_request_id
* approval_request_version_id
* approval_domain_type
* workflow_definition_reference
* workflow_version_reference
* policy_reference
* policy_version_reference
* tenant_id
* workspace_id
* organization_id
* legal_entity_id
* environment
* case_owner
* current_stage_reference
* current_step_reference
* total_item_count
* pending_item_count
* approved_item_count
* rejected_item_count
* cancelled_item_count
* overall_effect
* opened_at
* completed_at
* expires_at
* status
* evidence

---

# 13. Approval Case와 Request 관계

다음을 지원하라.

* 하나의 Request → 하나의 Case
* 하나의 Request → 여러 Case
* 여러 Request → 하나의 Consolidated Case
* Parent Case → Child Case
* Original Case → Reopened Case
* Original Case → Superseding Case

다음은 명시적 Policy 없이 허용하지 마라.

* 다른 Tenant Request의 Case 병합
* 다른 Legal Entity Request의 Financial Case 병합
* Production과 Sandbox Request 병합
* 다른 Currency 금액의 무조건 합산
* 다른 Approval Domain의 무분별한 병합

---

# 14. Approval Case Version

`APPROVAL_CASE_VERSION`

필수 필드:

* approval_case_version_id
* approval_case_id
* version_number
* previous_version_id
* workflow version
* policy version
* request version
* participant snapshot
* resource snapshot
* context snapshot
* effective_from
* effective_to
* immutable_hash
* created_at
* status
* evidence

Case 진행 중 Workflow·Policy가 변경되더라도 기존 Case가 어떤 Version으로 처리되었는지 보존한다.

---

# 15. Approval Item

`APPROVAL_ITEM`

하나의 Approval Case 안에서 독립적으로 승인 가능한 항목이다.

필수 필드:

* approval_item_id
* approval_case_id
* item_number
* item_type
* resource_type
* resource_id
* resource_version
* requested_action
* requested_amount
* currency
* quantity
* scope
* legal_entity_id
* country
* environment
* risk_reference
* policy_reference
* parent_item_id
* bundle_reference
* item owner
* current requirement count
* current decision state
* status
* evidence

Item Type:

* PROGRAM
* PROGRAM_VERSION
* FUNDING_ALLOCATION
* BUDGET_LINE
* CLAIM
* CLAIM_LINE
* ACCRUAL
* SETTLEMENT_LINE
* PAYOUT
* CONTRACT_CHANGE
* MIGRATION_BATCH
* ACCESS_ASSIGNMENT
* EXPORT
* CUSTOM

---

# 16. Approval Item 처리 방식

지원 처리:

* ALL_OR_NOTHING
* ITEM_BY_ITEM
* PARTIAL_APPROVAL_ALLOWED
* PARTIAL_REJECTION_ALLOWED
* BUNDLE_DECISION
* GROUPED_BY_RESOURCE
* GROUPED_BY_LEGAL_ENTITY
* GROUPED_BY_CURRENCY
* GROUPED_BY_RISK
* CUSTOM

다음은 차단하라.

* Currency가 다른 Item의 금액 단순 합산
* 다른 Tenant Item 병합
* 다른 Legal Entity Payout Item 무분별한 통합
* 승인되지 않은 Item의 전체 Case 승인 처리
* Partial Approval Policy 없이 일부만 실행

---

# 17. Approval Requirement

`APPROVAL_REQUIREMENT`

Approval Requirement는 승인 필요성을 나타낸다.

필수 필드:

* approval_requirement_id
* approval_case_id
* approval_item_id
* requirement_type
* source_type
* source_reference
* policy_reference
* policy_version
* required actor type
* required role
* required scope
* required organization
* required legal entity
* required country
* required environment
* required clearance
* required approval count
* minimum approval count
* maximum rejection count
* decision mode
* mandatory 여부
* waivable 여부
* valid_from
* valid_to
* status
* evidence

Requirement Type:

* MANAGER
* RESOURCE_OWNER
* PROGRAM_OWNER
* FINANCE
* LEGAL
* COMPLIANCE
* SECURITY
* RISK
* ACCOUNTING
* TREASURY
* DATA_OWNER
* TENANT_ADMIN
* WORKSPACE_ADMIN
* PLATFORM_ADMIN
* CUSTOMER
* PARTNER
* PROVIDER
* AUDITOR
* EXECUTIVE
* CUSTOM

---

# 18. Approval Requirement Source

`APPROVAL_REQUIREMENT_SOURCE`

Source Type:

* AUTHORIZATION_POLICY
* BUSINESS_POLICY
* FINANCIAL_THRESHOLD
* RISK_POLICY
* CONTRACT
* REGULATION
* DATA_CLASSIFICATION
* PROGRAM_LIFECYCLE
* FUNDING_MODEL
* CUSTOMER_CONFIGURATION
* TENANT_CONFIGURATION
* WORKFLOW_DEFINITION
* MANUAL
* INCIDENT
* EMERGENCY_POLICY
* CUSTOM

필수 필드:

* requirement_source_id
* approval_requirement_id
* source_type
* source_id
* source_version
* source effective period
* source condition
* matched result
* generated_at
* evidence

---

# 19. Approval Participant

`APPROVAL_PARTICIPANT`

지원 Participant Type:

* REQUESTER
* REQUESTED_FOR
* APPROVER_CANDIDATE
* APPROVER
* REVIEWER
* OBSERVER
* RESOURCE_OWNER
* CASE_OWNER
* ESCALATION_OWNER
* DELEGATE_REFERENCE
* SUBSTITUTE_REFERENCE
* SYSTEM_ACTOR
* AUDITOR
* NOTIFICATION_RECIPIENT
* OTHER

필수 필드:

* approval_participant_id
* approval_case_id
* approval_item_id
* approval_requirement_id
* participant_type
* subject_id
* role_assignment_id
* organization_id
* legal_entity_id
* scope
* environment
* valid_from
* valid_to
* active 여부
* status
* evidence

---

# 20. Approval Actor

`APPROVAL_ACTOR`

실제 Decision을 내리거나 Approval Event를 수행한 Actor를 기록한다.

필수 필드:

* approval_actor_id
* subject_id
* actor_type
* canonical_identity_id
* tenant_id
* workspace_id
* organization_id
* legal_entity_id
* environment
* acting_role_id
* acting_role_version_id
* acting_assignment_id
* acting_scope
* authentication assurance
* MFA state
* session reference
* device reference
* network zone
* risk reference
* acted_at
* status
* evidence

Actor Type:

* HUMAN
* SERVICE_ACCOUNT
* SYSTEM
* AUTOMATION
* POLICY_ENGINE
* EXTERNAL_PARTY
* EMERGENCY_OPERATOR_REFERENCE
* OTHER

고위험 Human Approval을 Service Account가 대신 결정하지 못하게 한다.

---

# 21. Actor Authorization Snapshot

`APPROVAL_ACTOR_AUTHORIZATION_SNAPSHOT`

필수 필드:

* snapshot_id
* approval_actor_id
* approval_case_id
* approval_requirement_id
* authorization_request_reference
* authorization_decision_reference
* role
* role version
* assignment
* permission
* policy
* policy version
* tenant scope
* workspace scope
* legal entity scope
* program scope
* environment scope
* financial threshold
* field access profile
* valid_at_decision_time
* immutable_hash
* evidence

승인자의 현재 권한으로 과거 승인을 재해석하지 마라.

---

# 22. Approval Decision

`APPROVAL_DECISION`

필수 필드:

* approval_decision_id
* approval_case_id
* approval_item_id
* approval_requirement_id
* approval_actor_id
* decision_type
* decision_effect
* decision_reason_code
* decision_comment_reference
* condition references
* obligation references
* approved amount
* approved currency
* approved scope
* approved action
* approved resource version
* valid_from
* valid_to
* decision_sequence
* supersedes_decision_id
* correction_of_decision_id
* reversal_of_decision_id
* decided_at
* recorded_at
* immutable_hash
* status
* evidence

Decision Type:

* APPROVE
* REJECT
* CONDITIONAL_APPROVE
* REQUEST_CHANGES
* RETURN
* ABSTAIN
* ACKNOWLEDGE
* WAIVE_REFERENCE
* ESCALATE_REFERENCE
* CANCEL_REFERENCE
* REVERSE
* CORRECT
* SYSTEM_DECISION
* MANUAL_REVIEW

---

# 23. Decision Effect

지원 Effect:

* APPROVED
* REJECTED
* CONDITIONALLY_APPROVED
* CHANGES_REQUIRED
* RETURNED
* NO_DECISION
* BLOCKED
* CANCELLED
* EXPIRED
* SUPERSEDED
* REVERSED
* ERROR

---

# 24. Approval Decision Reason

`APPROVAL_DECISION_REASON`

Reason Code:

* BUSINESS_REQUIREMENT_MET
* FINANCIAL_REVIEW_PASSED
* LEGAL_REVIEW_PASSED
* COMPLIANCE_REVIEW_PASSED
* RISK_ACCEPTABLE
* EVIDENCE_SUFFICIENT
* BUDGET_AVAILABLE
* FUNDING_CONFIRMED
* CONTRACT_VALID
* RESOURCE_SCOPE_VALID
* AMOUNT_WITHIN_LIMIT
* DUPLICATE_REQUEST
* INSUFFICIENT_EVIDENCE
* BUDGET_INSUFFICIENT
* FUNDING_UNCONFIRMED
* CONTRACT_INVALID
* WRONG_LEGAL_ENTITY
* WRONG_TENANT
* WRONG_ENVIRONMENT
* RISK_TOO_HIGH
* AMOUNT_EXCEEDS_LIMIT
* POLICY_VIOLATION
* CONFLICT_OF_INTEREST_REFERENCE
* RESOURCE_CHANGED
* VERSION_CHANGED
* REQUEST_INCOMPLETE
* MANUAL_REVIEW_REQUIRED
* OTHER

필수 필드:

* approval_decision_reason_id
* approval_decision_id
* reason_code
* reason category
* reason detail reference
* policy reference
* evidence reference
* customer visible 여부
* internal only 여부
* status

민감한 내부 Risk Signal이나 개인정보를 고객 노출 Reason에 포함하지 마라.

---

# 25. Conditional Approval

`APPROVAL_DECISION_CONDITION`

지원 조건:

* MAX_AMOUNT
* MIN_AMOUNT
* ALLOWED_CURRENCY
* ALLOWED_SCOPE
* ALLOWED_ACTION
* RESOURCE_VERSION_MATCH
* EXECUTE_BEFORE
* EXECUTE_AFTER
* REQUIRE_SECOND_APPROVAL_REFERENCE
* REQUIRE_EVIDENCE
* REQUIRE_CONTRACT
* REQUIRE_BUDGET
* REQUIRE_FUNDING
* REQUIRE_NOTIFICATION
* REQUIRE_MONITORING
* REQUIRE_POST_REVIEW
* CUSTOM

필수 필드:

* decision_condition_id
* approval_decision_id
* condition type
* operator
* expected value
* actual evaluation source
* valid_from
* valid_to
* consumed 여부
* satisfied 여부
* failure effect
* evidence

---

# 26. Approval Obligation

`APPROVAL_DECISION_OBLIGATION`

지원 Obligation:

* LOG_DECISION
* LOG_SENSITIVE_DECISION
* NOTIFY_REQUESTER
* NOTIFY_FINANCE
* NOTIFY_LEGAL
* NOTIFY_CUSTOMER
* MASK_DATA
* LIMIT_AMOUNT
* LIMIT_SCOPE
* REQUIRE_DUAL_CONTROL_REFERENCE
* REQUIRE_POST_ACTION_REVIEW
* REQUIRE_RECONCILIATION
* REQUIRE_AUDIT_SAMPLE
* REQUIRE_EXECUTION_EVIDENCE
* REQUIRE_EXPIRY
* CUSTOM

---

# 27. Approval Status

Approval Request 상태:

* DRAFT
* SUBMITTED
* VALIDATION_PENDING
* VALIDATION_FAILED
* ACCEPTED
* CASE_CREATION_PENDING
* IN_REVIEW
* APPROVAL_PENDING
* PARTIALLY_APPROVED
* APPROVED
* CONDITIONALLY_APPROVED
* REJECTED
* CHANGES_REQUIRED
* RETURNED
* WITHDRAWAL_PENDING
* WITHDRAWN
* CANCELLATION_PENDING
* CANCELLED
* EXPIRED
* REOPEN_PENDING
* REOPENED
* SUPERSEDED
* COMPLETED
* BLOCKED
* FAILED
* UNKNOWN

Approval Case 상태:

* CREATED
* OPEN
* ROUTING_PENDING
* ASSIGNMENT_PENDING
* IN_PROGRESS
* WAITING_FOR_DECISION
* PARTIALLY_COMPLETED
* APPROVED
* CONDITIONALLY_APPROVED
* REJECTED
* CHANGES_REQUIRED
* RETURNED
* PAUSED
* WITHDRAWN
* CANCELLED
* EXPIRED
* REOPENED
* SUPERSEDED
* COMPLETED
* BLOCKED
* FAILED
* UNKNOWN

---

# 28. Approval Status History

`APPROVAL_STATUS_HISTORY`

필수 필드:

* approval_status_history_id
* entity_type
* entity_id
* previous_status
* new_status
* transition_type
* actor
* transition reason
* effective_at
* recorded_at
* correlation id
* evidence

허용되지 않은 상태 전이를 Runtime Guard에서 차단하라.

---

# 29. Request 기본 허용 전이

최소 다음을 지원하라.

* DRAFT → SUBMITTED
* SUBMITTED → VALIDATION_PENDING
* VALIDATION_PENDING → VALIDATION_FAILED
* VALIDATION_PENDING → ACCEPTED
* ACCEPTED → CASE_CREATION_PENDING
* CASE_CREATION_PENDING → IN_REVIEW
* IN_REVIEW → APPROVAL_PENDING
* APPROVAL_PENDING → PARTIALLY_APPROVED
* APPROVAL_PENDING → APPROVED
* APPROVAL_PENDING → CONDITIONALLY_APPROVED
* APPROVAL_PENDING → REJECTED
* APPROVAL_PENDING → CHANGES_REQUIRED
* APPROVAL_PENDING → RETURNED
* SUBMITTED·IN_REVIEW·APPROVAL_PENDING → WITHDRAWAL_PENDING
* WITHDRAWAL_PENDING → WITHDRAWN
* OPEN 상태 계열 → CANCELLATION_PENDING
* CANCELLATION_PENDING → CANCELLED
* 유효기간 경과 → EXPIRED
* REJECTED·CHANGES_REQUIRED·RETURNED → REOPEN_PENDING
* REOPEN_PENDING → REOPENED
* 기존 요청 → SUPERSEDED
* APPROVED·CONDITIONALLY_APPROVED → COMPLETED

---

# 30. Approval Resource Snapshot

`APPROVAL_RESOURCE_SNAPSHOT`

필수 필드:

* approval_resource_snapshot_id
* approval_request_id
* approval_case_id
* approval_item_id
* resource_type
* resource_id
* resource_version
* snapshot type
* snapshot payload reference
* included fields
* excluded sensitive fields
* tenant_id
* legal_entity_id
* environment
* amount
* currency
* scope
* immutable_hash
* captured_at
* source timestamp
* status
* evidence

Snapshot Type:

* SUBMISSION
* CASE_CREATION
* PRE_DECISION
* DECISION
* EXECUTION
* POST_EXECUTION
* REOPEN
* SUPERSESSION

---

# 31. Critical Field 변경

다음 변경은 기본적으로 기존 승인 재사용을 차단하거나 재승인을 요구한다.

* Tenant
* Workspace
* Legal Entity
* Program
* Program Version
* Requested Action
* Amount
* Currency
* Beneficiary
* Claimant
* Funding Party
* Funding Allocation
* Contract
* Settlement Destination
* Payout Destination Reference
* Provider Account
* Environment
* Effective Date
* Migration Source
* Migration Target
* Data Export Scope
* Sensitive Data Classification

---

# 32. Approval Context Snapshot

`APPROVAL_CONTEXT_SNAPSHOT`

필수 필드:

* approval_context_snapshot_id
* approval_request_id
* approval_case_id
* requester snapshot
* actor candidate snapshot
* authorization snapshot
* organization snapshot
* role snapshot
* policy snapshot
* risk snapshot
* contract snapshot
* funding snapshot
* budget snapshot
* incident snapshot
* environment snapshot
* captured_at
* immutable_hash
* evidence

---

# 33. Approval Policy Reference

`APPROVAL_POLICY_REFERENCE`

필수 필드:

* approval_policy_reference_id
* approval_request_id
* approval_case_id
* approval_item_id
* approval_requirement_id
* policy type
* policy id
* policy version
* rule id
* matched condition
* generated requirement
* effect
* effective_from
* effective_to
* evidence

Policy Type:

* AUTHORIZATION
* BUSINESS
* FINANCIAL
* RISK
* LEGAL
* COMPLIANCE
* SECURITY
* CONTRACT
* TENANT
* CUSTOMER_DEFINED
* WORKFLOW
* EMERGENCY
* CUSTOM

---

# 34. Approval Correlation

`APPROVAL_CORRELATION`

Approval 요청을 다음과 연결하라.

* Authorization Request
* Business Transaction
* Program Change Set
* Contract Amendment
* Funding Request
* Claim
* Accrual
* Settlement
* Payout
* Refund
* Migration Plan
* Access Request
* Incident
* Notification
* Workflow Instance
* Task
* ERP Document
* Provider Request

필수 필드:

* approval_correlation_id
* approval_request_id
* approval_case_id
* correlation_type
* source_system
* source_entity_type
* source_entity_id
* source_version
* correlation_id
* parent correlation id
* status
* evidence

---

# 35. Approval Idempotency

`APPROVAL_IDEMPOTENCY`

필수 필드:

* approval_idempotency_id
* tenant_id
* source_system
* source request key
* business resource
* requested action
* request payload hash
* existing approval request
* duplicate detection window
* first_seen_at
* last_seen_at
* duplicate count
* resolution
* status
* evidence

Resolution:

* RETURN_EXISTING
* REJECT_DUPLICATE
* CREATE_NEW_VERSION
* CREATE_SUPERSEDING_REQUEST
* MERGE_REFERENCE
* MANUAL_REVIEW

같은 Payout·Settlement·Funding 작업에 대해 중복 Approval Request와 중복 실행이 생성되지 않도록 하라.

---

# 36. Approval Withdrawal

`APPROVAL_WITHDRAWAL`

필수 필드:

* approval_withdrawal_id
* approval_request_id
* approval_case_id
* requested_by
* reason
* requested_at
* effective_at
* affected items
* completed decisions
* reversible 여부
* downstream execution state
* status
* evidence

이미 실행된 Financial Action은 단순 Withdrawal로 되돌리지 마라.

필요하면 별도의 Reversal 또는 Correction 절차를 요구한다.

---

# 37. Approval Cancellation

`APPROVAL_CANCELLATION`

필수 필드:

* approval_cancellation_id
* approval_request_id
* approval_case_id
* cancellation type
* cancelled_by
* cancellation reason
* incident reference
* policy reference
* affected items
* affected decisions
* execution state
* cancellation effective at
* notification result
* status
* evidence

Cancellation Type:

* SYSTEM
* ADMINISTRATIVE
* POLICY_CHANGE
* RESOURCE_DELETED
* DUPLICATE
* SECURITY_INCIDENT
* LEGAL_HOLD
* PROGRAM_TERMINATION
* REQUESTER_REFERENCE
* OTHER

---

# 38. Approval Reopen

`APPROVAL_REOPEN`

필수 필드:

* approval_reopen_id
* original request
* original case
* reopen type
* reopen reason
* requested by
* approved by reference
* new request version
* new case version
* preserved decisions
* invalidated decisions
* new requirements
* reopened at
* status
* evidence

Reopen Type:

* CHANGES_SUBMITTED
* NEW_EVIDENCE
* CORRECTION
* POLICY_CHANGE
* RESOURCE_CHANGE
* APPEAL
* ADMINISTRATIVE
* SYSTEM_RECOVERY
* OTHER

---

# 39. Approval Supersession

`APPROVAL_SUPERSESSION`

필수 필드:

* approval_supersession_id
* predecessor request
* predecessor case
* successor request
* successor case
* supersession type
* reason
* carried decisions
* invalidated decisions
* carried evidence
* new resource version
* effective_at
* status
* evidence

Supersession Type:

* NEW_VERSION
* MATERIAL_CHANGE
* CORRECTION
* CONSOLIDATION
* SPLIT
* POLICY_REEVALUATION
* MIGRATION
* EMERGENCY_REPLACEMENT
* OTHER

Material Change가 있으면 기존 Approval Decision을 자동 이전하지 않는다.

---

# 40. Approval Execution Binding

`APPROVAL_EXECUTION_BINDING`

승인 완료 후 실제 작업 실행과 연결한다.

필수 필드:

* approval_execution_binding_id
* approval_request_id
* approval_case_id
* approval_item_id
* approval_decision_id
* approved resource type
* approved resource id
* approved resource version
* approved action
* approved amount
* approved currency
* approved scope
* approved environment
* valid_from
* valid_to
* maximum executions
* execution service
* execution endpoint reference
* status
* evidence

---

# 41. Approval Consumption

`APPROVAL_CONSUMPTION`

승인이 실제로 사용된 내역을 기록한다.

필수 필드:

* approval_consumption_id
* approval_execution_binding_id
* execution id
* execution attempt
* resource id
* resource version
* action
* amount
* currency
* scope
* environment
* consumed_at
* idempotency key
* execution result
* remaining executions
* status
* evidence

다음을 차단하라.

* 승인된 Amount 초과
* 승인된 Currency 불일치
* 승인된 Resource Version 불일치
* 승인되지 않은 Action
* 승인 Scope 초과
* 승인 Environment 불일치
* 승인 Validity 만료
* Maximum Execution Count 초과
* 이미 소비된 Single-use Approval 재사용

---

# 42. Approval Candidate

`APPROVAL_CANDIDATE`

필수 필드:

* candidate_id
* request_id
* approval domain
* requester
* requested for
* resource
* resource version
* action
* amount
* currency
* tenant
* workspace
* legal entity
* environment
* risk
* authorization decision
* matched policies
* generated requirements
* candidate participants
* resource snapshot
* context snapshot
* duplicate result
* proposed case type
* proposed status
* manual review requirement
* evidence

---

# 43. Approval Reconciliation

`APPROVAL_RECONCILIATION`

다음을 비교하라.

* Source System Request vs Canonical Approval Request
* UI Status vs Backend Status
* API Status vs Case Status
* Approval Request Version vs Resource Version
* Approval Policy Version vs Runtime Policy
* Approval Participant Role vs Current Role
* Decision Actor Scope vs Required Scope
* Decision Amount vs Requested Amount
* Decision Currency vs Requested Currency
* Decision Resource Version vs Current Resource Version
* Approved Action vs Executed Action
* Approved Scope vs Executed Scope
* Approval Consumption vs Business Execution
* ERP Approval vs Internal Approval
* Provider Approval vs Internal Approval
* Notification State vs Approval State
* Audit Event vs Decision
* Cancelled Request vs Active Execution
* Revoked Approval vs Cached Execution Permission

필수 필드:

* approval_reconciliation_id
* approval request
* approval case
* approval item
* comparison type
* source state
* canonical state
* difference
* severity
* detected_at
* resolved_at
* resolution
* status
* evidence

---

# 44. Reconciliation 상태

* MATCH
* SOURCE_REQUEST_MISMATCH
* UI_BACKEND_STATUS_MISMATCH
* API_CASE_STATUS_MISMATCH
* REQUEST_RESOURCE_VERSION_MISMATCH
* POLICY_VERSION_MISMATCH
* PARTICIPANT_ROLE_MISMATCH
* ACTOR_SCOPE_MISMATCH
* DECISION_AMOUNT_MISMATCH
* DECISION_CURRENCY_MISMATCH
* DECISION_RESOURCE_VERSION_MISMATCH
* EXECUTED_ACTION_MISMATCH
* EXECUTED_SCOPE_MISMATCH
* CONSUMPTION_EXECUTION_MISMATCH
* ERP_APPROVAL_MISMATCH
* PROVIDER_APPROVAL_MISMATCH
* NOTIFICATION_STATE_MISMATCH
* AUDIT_DECISION_MISMATCH
* CANCELLED_REQUEST_EXECUTED
* REVOKED_APPROVAL_STILL_USABLE
* MANUAL_REVIEW
* BLOCKED

---

# 45. Critical Approval Gap 후보

다음은 High 또는 Critical로 처리하라.

* Approval Request Tenant와 Resource Tenant 불일치
* Approval Request Legal Entity와 Financial Resource 불일치
* Approval 없이 Program Activation 실행
* Approval 없이 Funding Allocation 변경
* Approval 없이 Settlement·Payout 실행
* Requester와 Approval Actor가 동일하지만 허용 근거 없음
* 승인자 Role·Scope가 Decision 시점에 유효하지 않음
* 승인 후 Critical Field 변경
* 승인된 Amount 초과 실행
* 승인 Currency와 실행 Currency 불일치
* 승인되지 않은 Resource Version 실행
* Cancelled·Withdrawn·Expired Approval 사용
* Single-use Approval 재사용
* 중복 Payout Approval Request
* Decision Evidence 누락
* Approval Policy Version 누락
* Cross-Tenant Case 병합
* 다른 Legal Entity Payout Case 무분별 병합
* Service Account가 Human Financial Approval 수행
* 기존 Decision 덮어쓰기
* Approval Reconciliation Critical Drift

---

# 46. 최소 Static Lint

전체 인증은 `4-5-3-1-5-3-10`에서 완성한다.

이번 블록에서는 다음을 차단하라.

* Approval Request 없이 Approval Case 생성
* Resource Type 없는 Approval Request
* Requested Action 없는 Approval Request
* Tenant 없는 Approval Request
* Environment 없는 Production Approval Request
* Legal Entity 없는 Financial Approval Request
* Currency 없는 Financial Amount
* Request Version 없는 변경 승인
* Resource Snapshot 없는 Decision
* Actor Authorization Snapshot 없는 Decision
* Policy Version 없는 Approval Requirement
* Decision Reason 없는 Rejection
* Immutable Hash 없는 Final Decision
* Approval Status 직접 덮어쓰기
* Decision Update·Delete 사용
* Idempotency 없는 Financial Approval Request
* Execution Binding 없는 승인 후 실행
* Approval Consumption 기록 없는 Single-use 실행
* 기존 Approval Foundation 중복 생성

---

# 47. 최소 Runtime Guard

다음을 차단하라.

* Approval Request Not Found
* Approval Case Not Found
* Approval Item Not Found
* Request Not Active
* Case Not Active
* Invalid Status Transition
* Tenant Mismatch
* Workspace Mismatch
* Legal Entity Mismatch
* Environment Mismatch
* Resource Version Mismatch
* Request Version Mismatch
* Approval Requirement Missing
* Actor Role Invalid
* Actor Scope Invalid
* Actor Assignment Expired
* Actor Authentication Insufficient
* Decision Already Final
* Duplicate Decision
* Approval Expired
* Approval Withdrawn
* Approval Cancelled
* Approval Superseded
* Approved Amount Exceeded
* Approved Currency Mismatch
* Approved Action Mismatch
* Approved Scope Exceeded
* Approval Execution Count Exceeded
* Critical Reconciliation Drift
* Kill Switch 활성

---

# 48. Error Contract

* APPROVAL_REQUEST_NOT_FOUND
* APPROVAL_REQUEST_INVALID
* APPROVAL_REQUEST_VERSION_NOT_FOUND
* APPROVAL_REQUEST_DUPLICATE
* APPROVAL_REQUEST_TENANT_MISMATCH
* APPROVAL_REQUEST_WORKSPACE_MISMATCH
* APPROVAL_REQUEST_LEGAL_ENTITY_MISMATCH
* APPROVAL_REQUEST_ENVIRONMENT_MISMATCH
* APPROVAL_CASE_NOT_FOUND
* APPROVAL_CASE_INVALID
* APPROVAL_CASE_CROSS_TENANT
* APPROVAL_ITEM_NOT_FOUND
* APPROVAL_REQUIREMENT_NOT_FOUND
* APPROVAL_POLICY_REFERENCE_MISSING
* APPROVAL_RESOURCE_SNAPSHOT_MISSING
* APPROVAL_CONTEXT_SNAPSHOT_MISSING
* APPROVAL_ACTOR_NOT_AUTHORIZED
* APPROVAL_ACTOR_SCOPE_MISMATCH
* APPROVAL_ACTOR_ASSIGNMENT_EXPIRED
* APPROVAL_DECISION_DUPLICATE
* APPROVAL_DECISION_ALREADY_FINAL
* APPROVAL_DECISION_REASON_REQUIRED
* APPROVAL_STATUS_TRANSITION_INVALID
* APPROVAL_WITHDRAWN
* APPROVAL_CANCELLED
* APPROVAL_EXPIRED
* APPROVAL_SUPERSEDED
* APPROVAL_RESOURCE_VERSION_CHANGED
* APPROVAL_AMOUNT_EXCEEDED
* APPROVAL_CURRENCY_MISMATCH
* APPROVAL_ACTION_MISMATCH
* APPROVAL_SCOPE_EXCEEDED
* APPROVAL_EXECUTION_LIMIT_EXCEEDED
* APPROVAL_RECONCILIATION_FAILED
* APPROVAL_RUNTIME_BLOCKED

---

# 49. Warning Contract

* APPROVAL_REQUEST_WARNING
* APPROVAL_REQUEST_VERSION_WARNING
* APPROVAL_RESOURCE_VERSION_WARNING
* APPROVAL_CONTEXT_STALE_WARNING
* APPROVAL_POLICY_VERSION_WARNING
* APPROVAL_PARTICIPANT_WARNING
* APPROVAL_ACTOR_ROLE_WARNING
* APPROVAL_ACTOR_SCOPE_WARNING
* APPROVAL_DECISION_WARNING
* APPROVAL_CONDITIONAL_WARNING
* APPROVAL_WITHDRAWAL_WARNING
* APPROVAL_CANCELLATION_WARNING
* APPROVAL_REOPEN_WARNING
* APPROVAL_SUPERSESSION_WARNING
* APPROVAL_EXECUTION_BINDING_WARNING
* APPROVAL_CONSUMPTION_WARNING
* APPROVAL_RECONCILIATION_WARNING
* APPROVAL_MANUAL_REVIEW_REQUIRED

---

# 50. Evidence Contract

`APPROVAL_EVIDENCE`

필수 필드:

* evidence_id
* approval_request_id
* approval_request_version_id
* approval_case_id
* approval_case_version_id
* approval_item_id
* approval_requirement_id
* approval_actor_id
* approval_decision_id
* requester reference
* requested resource reference
* resource version
* action
* amount
* currency
* scope
* tenant
* workspace
* legal entity
* environment
* role assignment reference
* authorization decision reference
* policy reference
* policy version
* resource snapshot reference
* context snapshot reference
* decision reason reference
* execution binding reference
* consumption reference
* correlation reference
* effective_at
* recorded_at
* result hash
* lineage
* audit reference

다음을 저장하지 마라.

* Password
* Access Token
* Credential Secret
* Bank Account 원문
* 불필요한 PII
* 승인에 필요하지 않은 Claim Evidence 원문
* 내부 Risk Model 전체 원문

---

# 51. Approval Audit Event

`APPROVAL_AUDIT_EVENT`

지원 Event:

* APPROVAL_REQUEST_CREATED
* APPROVAL_REQUEST_UPDATED
* APPROVAL_REQUEST_SUBMITTED
* APPROVAL_REQUEST_VALIDATED
* APPROVAL_REQUEST_REJECTED_BY_VALIDATION
* APPROVAL_CASE_CREATED
* APPROVAL_CASE_VERSION_CREATED
* APPROVAL_ITEM_CREATED
* APPROVAL_REQUIREMENT_GENERATED
* APPROVAL_PARTICIPANT_ADDED
* APPROVAL_ACTOR_VALIDATED
* APPROVAL_DECISION_RECORDED
* APPROVAL_CONDITION_ADDED
* APPROVAL_OBLIGATION_ADDED
* APPROVAL_STATUS_CHANGED
* APPROVAL_WITHDRAWAL_REQUESTED
* APPROVAL_WITHDRAWN
* APPROVAL_CANCELLED
* APPROVAL_REOPENED
* APPROVAL_SUPERSEDED
* APPROVAL_EXECUTION_BOUND
* APPROVAL_CONSUMED
* APPROVAL_EXECUTION_BLOCKED
* APPROVAL_DUPLICATE_DETECTED
* APPROVAL_DRIFT_DETECTED
* MANUAL_REVIEW_REQUESTED

---

# 52. 기존 구현 분류

* `CANONICAL_APPROVAL_REQUEST`
* `CANONICAL_APPROVAL_CASE`
* `CANONICAL_APPROVAL_ITEM`
* `CANONICAL_APPROVAL_REQUIREMENT`
* `CANONICAL_APPROVAL_PARTICIPANT`
* `CANONICAL_APPROVAL_ACTOR`
* `CANONICAL_APPROVAL_DECISION`
* `CANONICAL_APPROVAL_STATUS`
* `CANONICAL_APPROVAL_SNAPSHOT`
* `CANONICAL_APPROVAL_IDEMPOTENCY`
* `CANONICAL_APPROVAL_EXECUTION_BINDING`
* `CANONICAL_APPROVAL_RECONCILIATION`
* `VALIDATED_LEGACY`
* `LEGACY_ADAPTER`
* `MIGRATION_REQUIRED`
* `CONSOLIDATION_REQUIRED`
* `DEPRECATION_CANDIDATE`
* `KEEP_SEPARATE_WITH_REASON`
* `BLOCKED_CROSS_TENANT`
* `BLOCKED_WRONG_LEGAL_ENTITY`
* `BLOCKED_FINANCIAL_RISK`
* `BLOCKED_DUPLICATE_APPROVAL`
* `BLOCKED_APPROVAL_REUSE`
* `BLOCKED_POLICY_DRIFT`
* `UNVERIFIED`
* `TEST_ONLY`

---

# 53. 중복 구현 감사

다음을 전수 탐지하라.

* 여러 Approval Request Table
* 여러 Approval Status Enum
* 여러 Approval Decision Table
* 여러 Approver 모델
* 여러 Approval History Store
* 여러 Approval Comment Store
* 여러 Approval Attachment Store
* 여러 Approval Snapshot 모델
* 여러 Approval Queue 모델
* 여러 Approval Idempotency 구현
* 여러 Approval Execution Binding
* Claim·Funding·Payout별 독립 Approval Engine
* ERP·Provider·Admin UI별 독립 승인 상태
* API별 하드코딩된 승인 Flag
* Boolean `approved` 필드만 사용하는 구현
* 원본 Business Record 안에 승인 상태만 저장하는 구현
* Decision을 Update하는 구현
* Approval 없이 직접 실행 가능한 우회 경로

---

# 54. 실행 절차

## Step 1 — 기존 Approval 구현 전수 조사

Approval Request, Status, Decision, Workflow, ERP·Provider 연결을 확인한다.

## Step 2 — Canonical Approval Domain 구축

Request, Case, Item, Requirement, Participant, Actor, Decision을 분리한다.

## Step 3 — Approval Domain Type 등록

Rebate Program, Funding, Claim, Settlement, Payout, Migration 및 Access 승인 유형을 등록한다.

## Step 4 — Approval Request 구축

Tenant, Resource, Action, Amount, Currency, Scope 및 Justification을 기록한다.

## Step 5 — Request Version 구축

요청 변경과 재승인 필요 여부를 관리한다.

## Step 6 — Approval Case 구축

실제 승인 실행 단위와 Version을 관리한다.

## Step 7 — Approval Item 구축

개별 승인 가능한 항목과 Partial Approval 지원 기반을 마련한다.

## Step 8 — Approval Requirement 구축

Policy·Contract·Risk·Financial Threshold가 생성한 승인 요구를 기록한다.

## Step 9 — Participant·Actor 구축

후보 참여자와 실제 결정자를 구분한다.

## Step 10 — Actor Authorization Snapshot 구축

결정 시점의 Role·Scope·Policy를 고정한다.

## Step 11 — Approval Decision 구축

Append-only Decision, Reason, Condition 및 Obligation을 관리한다.

## Step 12 — Status State Machine 구축

Request·Case 상태와 허용 전이를 구현한다.

## Step 13 — Resource·Context Snapshot 구축

승인 대상과 결정 환경을 불변 Snapshot으로 기록한다.

## Step 14 — Policy Reference 구축

승인 Requirement를 생성한 Policy Version을 연결한다.

## Step 15 — Correlation 구축

Authorization, Business Transaction, ERP 및 Provider 문서와 연결한다.

## Step 16 — Idempotency 구축

중복 요청·중복 승인을 탐지한다.

## Step 17 — Withdrawal·Cancellation 구축

철회·취소와 이미 실행된 업무를 구분한다.

## Step 18 — Reopen·Supersession 구축

재제출·새 Version·대체 요청을 관리한다.

## Step 19 — Execution Binding·Consumption 구축

승인 결과와 실제 실행을 제한적으로 연결한다.

## Step 20 — Candidate·Reconciliation 구축

Source·UI·API·ERP·Provider Approval Drift를 탐지한다.

## Step 21 — 최소 Static Lint·Runtime Guard 구축

승인 없는 실행, Amount·Currency·Scope 초과를 차단한다.

## Step 22 — 기존 구현 분류·통합 계획 작성

중복 Approval Table·Flag·Status를 통합한다.

## Step 23 — ADR·PM 이력 갱신

모든 승인 기반 결정·충돌·위험을 기록한다.

---

# 55. 생성 또는 갱신할 문서

기존 동일 목적 문서가 있으면 통합하라.

* `docs/segmentation/DSAR_APPROVAL_DOMAIN_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_REQUEST.md`
* `docs/segmentation/DSAR_APPROVAL_REQUEST_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_REQUEST_STATUS.md`
* `docs/segmentation/DSAR_APPROVAL_REQUEST_VERSION.md`
* `docs/segmentation/DSAR_APPROVAL_REQUEST_RESOURCE.md`
* `docs/segmentation/DSAR_APPROVAL_REQUEST_ACTION.md`
* `docs/segmentation/DSAR_APPROVAL_REQUEST_CONTEXT.md`
* `docs/segmentation/DSAR_APPROVAL_CASE.md`
* `docs/segmentation/DSAR_APPROVAL_CASE_STATUS.md`
* `docs/segmentation/DSAR_APPROVAL_CASE_VERSION.md`
* `docs/segmentation/DSAR_APPROVAL_CASE_RELATIONSHIP.md`
* `docs/segmentation/DSAR_APPROVAL_ITEM.md`
* `docs/segmentation/DSAR_APPROVAL_ITEM_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_ITEM_PROCESSING_MODE.md`
* `docs/segmentation/DSAR_APPROVAL_REQUIREMENT.md`
* `docs/segmentation/DSAR_APPROVAL_REQUIREMENT_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_REQUIREMENT_SOURCE.md`
* `docs/segmentation/DSAR_APPROVAL_PARTICIPANT.md`
* `docs/segmentation/DSAR_APPROVAL_PARTICIPANT_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_ACTOR.md`
* `docs/segmentation/DSAR_APPROVAL_ACTOR_AUTHORIZATION_SNAPSHOT.md`
* `docs/segmentation/DSAR_APPROVAL_DECISION.md`
* `docs/segmentation/DSAR_APPROVAL_DECISION_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_DECISION_EFFECT.md`
* `docs/segmentation/DSAR_APPROVAL_DECISION_REASON.md`
* `docs/segmentation/DSAR_APPROVAL_DECISION_CONDITION.md`
* `docs/segmentation/DSAR_APPROVAL_DECISION_OBLIGATION.md`
* `docs/segmentation/DSAR_APPROVAL_STATUS_HISTORY.md`
* `docs/segmentation/DSAR_APPROVAL_ALLOWED_TRANSITIONS.md`
* `docs/segmentation/DSAR_APPROVAL_RESOURCE_SNAPSHOT.md`
* `docs/segmentation/DSAR_APPROVAL_CONTEXT_SNAPSHOT.md`
* `docs/segmentation/DSAR_APPROVAL_CRITICAL_FIELD_CHANGE_POLICY.md`
* `docs/segmentation/DSAR_APPROVAL_POLICY_REFERENCE.md`
* `docs/segmentation/DSAR_APPROVAL_CORRELATION.md`
* `docs/segmentation/DSAR_APPROVAL_IDEMPOTENCY.md`
* `docs/segmentation/DSAR_APPROVAL_WITHDRAWAL.md`
* `docs/segmentation/DSAR_APPROVAL_CANCELLATION.md`
* `docs/segmentation/DSAR_APPROVAL_REOPEN.md`
* `docs/segmentation/DSAR_APPROVAL_SUPERSESSION.md`
* `docs/segmentation/DSAR_APPROVAL_EXECUTION_BINDING.md`
* `docs/segmentation/DSAR_APPROVAL_CONSUMPTION.md`
* `docs/segmentation/DSAR_APPROVAL_CANDIDATE.md`
* `docs/segmentation/DSAR_APPROVAL_RECONCILIATION.md`
* `docs/segmentation/DSAR_APPROVAL_RECONCILIATION_STATUS.md`
* `docs/segmentation/DSAR_APPROVAL_CRITICAL_GAP_POLICY.md`
* `docs/segmentation/DSAR_APPROVAL_FOUNDATION_STATIC_LINT.md`
* `docs/segmentation/DSAR_APPROVAL_FOUNDATION_RUNTIME_GUARDS.md`
* `docs/segmentation/DSAR_APPROVAL_ERROR_WARNING_CONTRACT.md`
* `docs/segmentation/DSAR_APPROVAL_EVIDENCE.md`
* `docs/segmentation/DSAR_APPROVAL_AUDIT_EVENT.md`
* `docs/segmentation/DSAR_APPROVAL_EXISTING_IMPLEMENTATION.md`
* `docs/segmentation/DSAR_APPROVAL_DUPLICATE_IMPLEMENTATION_AUDIT.md`
* `docs/segmentation/DSAR_APPROVAL_FUNCTION_REGRESSION_GATE.md`
* `docs/architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md`
* `docs/pm/PM_CHANGE_HISTORY.md`
* `docs/pm/REPEAT_PROBLEM_HISTORY.md`
* `docs/pm/AGENT_EXECUTION_HISTORY.md`

---

# 56. Approval Request Matrix

| Request | Domain | Requester | Resource | Action | Amount | Currency | Tenant | Legal Entity | Status |
| ------- | ------ | --------- | -------- | ------ | ------ | -------- | ------ | ------------ | ------ |

---

# 57. Approval Case Matrix

| Case | Request | Workflow Version | Policy Version | Items | Requirements | Pending | Approved | Rejected | Status |
| ---- | ------- | ---------------- | -------------- | ----- | ------------ | ------- | -------- | -------- | ------ |

---

# 58. Approval Decision Matrix

| Case | Item | Requirement | Actor | Role | Scope | Decision | Amount | Validity | Evidence |
| ---- | ---- | ----------- | ----- | ---- | ----- | -------- | ------ | -------- | -------- |

---

# 59. Approval Execution Matrix

| Approval | Resource | Version | Approved Action | Approved Amount | Currency | Executed Action | Consumed Amount | Remaining | Status |
| -------- | -------- | ------- | --------------- | --------------- | -------- | --------------- | --------------- | --------- | ------ |

---

# 60. Approval Reconciliation Matrix

| Source | Request | Case | Resource Version | Decision | Execution | Difference | Severity | Resolution | Status |
| ------ | ------- | ---- | ---------------- | -------- | --------- | ---------- | -------- | ---------- | ------ |

---

# 61. 검증 게이트

완료 전에 반드시 확인하라.

* Approval Request와 Business Resource가 분리되는가
* Approval Request와 Approval Case가 분리되는가
* Approval Case와 Approval Item이 분리되는가
* Approval Requirement와 Decision이 분리되는가
* Request Version이 보존되는가
* Case Version이 보존되는가
* Resource·Action·Amount·Currency·Scope가 기록되는가
* Tenant·Workspace·Legal Entity·Environment가 기록되는가
* Approval Item별 독립 Decision이 가능한가
* Partial Approval 처리 기반이 있는가
* Requirement Source와 Policy Version이 보존되는가
* Participant와 실제 Actor가 구분되는가
* Actor Authorization Snapshot이 보존되는가
* Decision이 Append-only인가
* Rejection에 Reason이 강제되는가
* Conditional Approval의 Condition·Obligation이 지원되는가
* Request·Case 상태 전이가 통제되는가
* Resource Snapshot이 보존되는가
* Context Snapshot이 보존되는가
* Critical Field 변경 시 재승인이 검토되는가
* Correlation과 Idempotency가 구축되는가
* Withdrawal·Cancellation이 구분되는가
* Reopen·Supersession이 구분되는가
* 승인 결과와 실행이 Execution Binding으로 연결되는가
* Approval Consumption이 기록되는가
* Amount·Currency·Action·Scope 초과 실행이 차단되는가
* UI·API·ERP·Provider 상태가 Reconciliation되는가
* 최소 Static Lint·Runtime Guard가 작동하는가
* 기존 Approval 기능의 회귀가 없는가
* 중복 Approval Foundation이 생성되지 않았는가
* ADR·PM·Repeat Problem·Agent History가 갱신되었는가
* 다음 Workflow Definition & Flow Execution 단계가 실행 가능한가

---

# 62. 완료 보고 형식

다음 순서로 보고하라.

1. Approval Domain Type 수
2. Approval Request 수
3. Approval Request Version 수
4. Approval Resource Binding 수
5. Approval Action Binding 수
6. Approval Case 수
7. Approval Case Version 수
8. Approval Item 수
9. Approval Requirement 수
10. Requirement Source 수
11. Approval Participant 수
12. Approval Actor 수
13. Actor Authorization Snapshot 수
14. Approval Decision 수
15. Approve Decision 수
16. Reject Decision 수
17. Conditional Approval 수
18. Changes Required 수
19. Decision Condition 수
20. Decision Obligation 수
21. Approval Status Transition 수
22. Invalid Transition 차단 수
23. Resource Snapshot 수
24. Context Snapshot 수
25. Policy Reference 수
26. Approval Correlation 수
27. Duplicate Request 탐지 수
28. Withdrawal 수
29. Cancellation 수
30. Reopen 수
31. Supersession 수
32. Execution Binding 수
33. Approval Consumption 수
34. Single-use 재사용 차단 수
35. Amount 초과 실행 차단 수
36. Currency 불일치 차단 수
37. Action 불일치 차단 수
38. Scope 초과 차단 수
39. Resource Version Drift 수
40. Approval Reconciliation Mismatch 수
41. Static Lint Rule 수
42. Runtime Guard 수
43. Existing Implementation 수
44. Duplicate Implementation 수
45. Migration Required 수
46. Manual Review 수
47. Function Regression 수
48. 생성·갱신한 문서
49. 남은 리스크
50. 다음 Approval Workflow Definition & Flow Execution Engine 준비 상태

---

# 63. 완료 조건

다음 조건을 모두 충족해야 이번 블록을 완료로 인정한다.

1. Canonical Approval Domain Type이 구축되었다.
2. Approval Request가 구축되었다.
3. Approval Request Version이 구축되었다.
4. Approval Request Resource가 구축되었다.
5. Approval Request Action이 구축되었다.
6. Approval Request Context가 구축되었다.
7. Approval Case가 구축되었다.
8. Approval Case Version이 구축되었다.
9. Approval Item이 구축되었다.
10. Approval Requirement가 구축되었다.
11. Approval Requirement Source가 구축되었다.
12. Approval Participant가 구축되었다.
13. Approval Actor가 구축되었다.
14. Actor Authorization Snapshot이 구축되었다.
15. Approval Decision이 구축되었다.
16. Decision Reason이 구축되었다.
17. Conditional Decision Condition이 구축되었다.
18. Decision Obligation이 구축되었다.
19. Approval Status State Machine이 구축되었다.
20. Approval Status History가 구축되었다.
21. Approval Resource Snapshot이 구축되었다.
22. Approval Context Snapshot이 구축되었다.
23. Critical Field Change Policy가 구축되었다.
24. Approval Policy Reference가 구축되었다.
25. Approval Correlation이 구축되었다.
26. Approval Idempotency가 구축되었다.
27. Approval Withdrawal이 구축되었다.
28. Approval Cancellation이 구축되었다.
29. Approval Reopen이 구축되었다.
30. Approval Supersession이 구축되었다.
31. Approval Execution Binding이 구축되었다.
32. Approval Consumption이 구축되었다.
33. Approval Candidate가 구축되었다.
34. Approval Reconciliation이 구축되었다.
35. 최소 Static Lint·Runtime Guard가 구축되었다.
36. 기존 Approval 구현이 분류되었다.
37. 중복 Approval 모델 통합 계획이 작성되었다.
38. 기존 정상 기능의 회귀가 없다.
39. ADR·PM Change History·Repeat Problem·Agent History가 갱신되었다.
40. 다음 Approval Workflow Definition & Flow Execution Engine 단계에 사용할 검증된 Approval Foundation이 준비되었다.

---

# 64. 최종 실행 명령

지금 즉시 검증된 Authorization, Role, Organization, Tenant, Workspace 및 Scope Governance 위에 Rebate Approval Foundation & Canonical Approval Entity Governance를 구축하라.

기존 Repository, Admin UI, API, ERP, Provider Connector, Workflow Engine, Task Engine, Notification System 및 Database에서 Approval Request, Status, Decision, Approver, History, Queue, Comment, Attachment, SLA, Escalation, Delegation 및 Emergency Approval 구현을 전수 조사하라.

동일 목적 Approval Foundation이 존재하면 중복 생성하지 말고 Canonical Approval Domain으로 통합하라.

Approval Request를 Business Resource 자체와 동일시하지 마라.

Approval Request, Approval Case, Approval Item, Approval Requirement, Approval Participant, Approval Actor 및 Approval Decision을 서로 다른 Canonical Entity로 관리하라.

Approval Request에는 Domain, Tenant, Workspace, Organization, Legal Entity, Environment, Requester, Requested For, Resource, Resource Version, Action, Amount, Currency, Scope, Justification, Risk, Policy, Correlation 및 Validity를 기록하라.

Program, Program Version, Funding, Budget, Claim, Accrual, Settlement, Payout, Refund, Contract, Migration, Access 및 Policy Change를 Approval Domain Type으로 지원하라.

Approval Request 변경 시 새 Request Version을 생성하고 Amount, Currency, Scope, Resource Version 및 Critical Field 변경 여부를 기록하라.

Critical Field가 변경되면 기존 승인을 자동 재사용하지 말고 재승인 또는 Manual Review를 요구하라.

Approval Case는 Workflow와 Policy Version을 고정하고 Request Version, Participant Snapshot, Resource Snapshot 및 Context Snapshot을 보존하라.

하나의 Case에 여러 Approval Item을 포함할 수 있게 하되 Tenant, Legal Entity, Currency 및 Environment 경계를 무분별하게 병합하지 마라.

Item-by-item, All-or-nothing, Partial Approval 및 Bundle Decision 기반을 지원하라.

Approval Requirement가 Authorization Policy, Business Policy, Financial Threshold, Risk, Contract, Regulation, Data Classification, Program Lifecycle, Funding Model 및 Customer Configuration에서 생성되도록 하라.

Requirement마다 Required Actor Type, Role, Scope, Legal Entity, Country, Environment, Clearance, Approval Count 및 Decision Mode를 기록하라.

Approval Participant 후보와 실제 Decision Actor를 구분하라.

실제 Actor의 Identity, Role, Role Version, Assignment, Scope, Tenant, Legal Entity, Environment, Authentication Assurance, MFA, Session 및 Risk 상태를 Decision 시점 Snapshot으로 보존하라.

현재 Role로 과거 승인의 유효성을 재해석하지 마라.

고위험 Human Financial Approval을 Service Account나 Automation Agent가 대신 결정하지 못하게 하라.

Approval Decision을 Append-only로 저장하고 기존 Decision을 Update 또는 Delete하지 마라.

Approve, Reject, Conditional Approve, Request Changes, Return, Abstain, Reverse, Correct 및 System Decision을 구분하라.

Rejection에는 Reason Code와 Evidence를 강제하라.

Conditional Approval에는 Amount, Currency, Scope, Action, Resource Version, Execution Deadline, Evidence, Contract, Budget, Funding, Notification 및 Post-review 조건을 지원하라.

Approval Request와 Approval Case에 명시적인 State Machine과 허용 Transition을 적용하라.

Status 필드를 직접 덮어쓰지 말고 Status History Event를 생성하라.

Submission, Case Creation, Pre-decision, Decision, Execution 및 Post-execution 시점의 Resource Snapshot을 생성하라.

Snapshot에는 Resource Version, Tenant, Legal Entity, Environment, Amount, Currency, Scope 및 Immutable Hash를 기록하라.

Approval Policy Reference에는 승인 Requirement를 생성한 Policy ID, Version, Rule, Matched Condition 및 Effect를 기록하라.

Authorization Request, Business Transaction, Program Change Set, Funding, Claim, Settlement, Payout, Migration, Access Request, ERP Document 및 Provider Request와 Approval을 Correlation하라.

Financial Approval Request에는 Idempotency Key와 Payload Hash를 강제하여 중복 Funding, Settlement 및 Payout Approval을 방지하라.

Withdrawal, Cancellation, Rejection, Expiration, Reopen 및 Supersession을 서로 다른 상태와 Event로 관리하라.

이미 실행된 Financial Action을 Withdrawal이나 Cancellation만으로 삭제하지 말고 필요하면 Reversal 또는 Correction 절차를 요구하라.

Reopen 시 보존할 Decision과 무효화할 Decision을 구분하고 새 Request Version과 Case Version을 생성하라.

Material Change에 따른 Supersession에서는 기존 Decision을 자동 이전하지 마라.

승인 완료 후 실제 작업은 Approval Execution Binding을 통해서만 수행하도록 하라.

Execution Binding에는 승인된 Resource, Resource Version, Action, Amount, Currency, Scope, Environment, Validity 및 Maximum Execution Count를 기록하라.

Approval Consumption으로 실제 실행 내역과 잔여 실행 가능 횟수를 기록하라.

승인 Amount 초과, Currency 불일치, Action 불일치, Scope 초과, Resource Version 불일치, Environment 불일치, Validity 만료 및 Maximum Execution Count 초과를 차단하라.

Single-use Approval을 재사용하지 못하게 하라.

Source System, UI, API, Case, Request Version, Resource Version, Policy Version, Participant Role, Actor Scope, Decision Amount, Decision Currency, Execution Action, Execution Scope, ERP, Provider, Notification 및 Audit 상태를 Reconciliation하라.

Cross-Tenant Case 병합, Wrong Legal Entity 승인, Approval 없는 Program Activation·Funding·Settlement·Payout, 유효하지 않은 Actor, Critical Field 변경 후 기존 승인 사용, Cancelled·Withdrawn·Expired Approval 실행, 중복 Payout Approval 및 Decision Evidence 누락을 Critical Gap으로 생성하라.

Resource Type·Action·Tenant·Environment가 없는 Approval Request, Legal Entity 없는 Financial Approval, Currency 없는 Amount, Snapshot 없는 Decision, Actor Authorization Snapshot 없는 Decision, Policy Version 없는 Requirement, Reason 없는 Rejection, Immutable Hash 없는 Final Decision, Idempotency 없는 Financial Approval 및 Execution Binding 없는 승인 실행을 Static Lint에서 차단하라.

Invalid Status Transition, Tenant·Workspace·Legal Entity·Environment Mismatch, Resource Version Mismatch, Actor Role·Scope·Assignment 오류, Duplicate Decision, Expired·Withdrawn·Cancelled·Superseded Approval, Amount·Currency·Action·Scope 초과, Execution Count 초과 및 Critical Reconciliation Drift를 Runtime Guard로 차단하라.

기존 Claim, Funding, Settlement, Payout, Campaign, Refund, Contract, Access, ERP 및 Provider Approval 기능과 Legacy Equivalence를 수행하라.

기존 정상 승인 업무를 유지하면서 Boolean Approval Flag, 중복 Approval Table, Decision 덮어쓰기, 승인 없는 우회 실행 및 중복 승인 사용을 제거하라.

모든 Approval Request, Version, Case, Item, Requirement, Participant, Actor, Decision, Snapshot, Status, Idempotency, Withdrawal, Cancellation, Reopen, Supersession, Execution Binding, Consumption, Reconciliation, 중복 구현 및 남은 위험을 ADR, PM Change History, Repeat Problem History 및 Agent Execution History에 기록하라.

다음 단계인 **EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 — Rebate Approval Workflow Definition & Flow Execution Engine Governance**를 구현할 수 있는 검증된 Approval Foundation을 완성하라.
