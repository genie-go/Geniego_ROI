# 스펙 원문 영속 (Verbatim) — EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2

> **Rebate Approval Workflow Definition & Flow Execution Engine Governance · Version 1.0**
> 289차(2026-07-17) 수령분 · **원문 그대로 · 코드변경 0**
> 선행: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md)(5-3-1 Approval Foundation)

## 🔴 이 파일이 먼저 작성된 이유 — 5-3-1 에서 배운 것

**5-3-1 에서 289차는 "스펙 수령 즉시 분모 영속"을 했다고 판단했으나 실제로는 개수만 적었다**
(`"§6 Domain Type = 31"`). **항목명은 저장소에 없었고 스펙 원문은 채팅에만** 있었다.
→ 산출 에이전트 **5개가 전부 독립적으로 정지**("전사할 원문이 저장소에 없다").

> **개수는 분모가 아니다.** "31 종"은 **무엇이 31 종인지 모르면 검증도 반증도 불가능**하다.
> **1-6 D-3**: *"세션 컨텍스트는 저장소가 아니다."* — **채팅에만 있는 스펙은 다음 세션에 존재하지 않는 것과 같다.**
>
> ★**그래서 5-3-2 는 설계·조사보다 먼저 원문을 영속한다.** 이 파일이 `source_persisted = true` 의 실체다.

---

# 0. 작업 목적

앞 단계에서 구축한 Canonical Approval Foundation 위에, 승인 요청을 검증하고 적절한 승인 흐름을 선택하며 각 단계·작업·분기·대기·재시도·완료를 일관되게 실행하는 **Rebate Approval Workflow Definition & Flow Execution Engine Governance**를 구축하라.

이번 단계에서는 다음을 완성한다.

* Workflow Definition
* Workflow Version
* Workflow Template
* Workflow Node
* Workflow Edge
* Start·End Node
* Approval Task Node
* Review Task Node
* System Task Node
* Decision Gateway
* Condition Gateway
* Event Gateway
* Timer Node
* Wait Node
* Notification Node
* Sub-workflow Node
* Human Task
* System Task
* Workflow Instance
* Workflow Execution
* Workflow Token
* Workflow Transition
* Workflow State
* Task Assignment Hook
* Task Claim·Release
* Task Completion
* Retry·Backoff
* Pause·Resume
* Cancellation
* Failure Handling
* Compensation Hook
* Workflow Migration
* Workflow Replay
* Workflow Idempotency
* Concurrency Control
* Workflow Reconciliation
* Workflow Evidence·Audit

이번 단계는 Multi-Level Approval의 조직 계층 계산, Risk-Based Threshold 결정, SLA·Escalation 세부 정책, Delegation·Substitute, Emergency Approval 및 전체 Production Certification을 완성하는 단계가 아니다.

이번 블록은 후속 승인 기능이 공통으로 사용하는 실행 엔진을 구축한다.

다음 질문에 정확하게 답할 수 있어야 한다.

* 어떤 Approval Request에 어떤 Workflow가 선택되었는가
* Workflow 선택 기준은 무엇인가
* 어떤 Workflow Version이 실행되었는가
* 현재 승인 흐름은 어느 Node와 Step에 있는가
* 현재 어떤 Task가 누구에게 배정되어 있는가
* 어떤 조건으로 다음 Node가 선택되었는가
* Sequential·Parallel 실행의 기반이 준비되어 있는가
* Human Task와 System Task는 어떻게 구분되는가
* 승인자가 Task를 Claim하고 완료하는 과정은 어떻게 관리되는가
* Task가 중복 생성되거나 중복 완료되는가
* Workflow가 중단되면 어디서 다시 시작하는가
* 실패한 System Task는 몇 번 재시도되는가
* 외부 ERP·Provider 응답을 기다리는 동안 어떤 상태인가
* Approval Request가 철회·취소되면 Workflow는 어떻게 종료되는가
* 원본 Resource가 변경되면 Workflow를 중단하거나 재평가하는가
* 실행 중 Workflow Definition이 변경되면 기존 Instance는 어떻게 되는가
* 오래된 Workflow Instance를 새 Version으로 Migration할 수 있는가
* 동일 Event가 중복 수신되어도 중복 Transition이 발생하지 않는가
* 둘 이상의 Worker가 같은 Task를 동시에 실행하지 않는가
* Workflow Event와 Approval Status가 일치하는가
* Workflow 완료 전에 Business Action이 실행되지 않는가
* Workflow 실패가 조용히 무시되지 않는가
* 고객사가 코드 변경 없이 자신만의 승인 흐름을 구성할 수 있는가
* 고객사 Custom Workflow가 Platform 보안 정책을 우회하지 않는가
* 모든 실행 경로와 분기 근거를 재현할 수 있는가

이번 구현은 특정 Rebate 승인만을 위한 하드코딩된 상태 머신이 아니다.

GeniegoROI 구독 고객사가 Rebate Program, Funding, Budget, Claim, Settlement, Payout, Refund, Contract, Campaign, Migration 및 Access Approval Workflow를 설정하고 실행할 수 있는 범용 멀티테넌트 Approval Workflow Engine이어야 한다.

---

# 1. 전체 Approval Engine 진행 위치

Approval Engine 세부 구현 순서는 다음과 같다.

1. `4-5-3-1-5-3-1` Approval Foundation & Canonical Approval Entity — 완료
2. `4-5-3-1-5-3-2` Approval Workflow Definition & Flow Execution Engine — 이번 단계
3. `4-5-3-1-5-3-3` Multi-Level Approval & Hierarchical Approval Governance
4. `4-5-3-1-5-3-4` Dynamic Approval Rule & Conditional Routing Engine
5. `4-5-3-1-5-3-5` Risk-Based Approval, Threshold & Financial Decision Governance
6. `4-5-3-1-5-3-6` Approval SLA, Deadline, Reminder & Escalation Governance
7. `4-5-3-1-5-3-7` Parallel, Sequential, Quorum & Consensus Approval Governance
8. `4-5-3-1-5-3-8` Approval Delegation, Substitute & Availability Governance
9. `4-5-3-1-5-3-9` Emergency, Expedited & Exception Approval Governance
10. `4-5-3-1-5-3-10` Approval Audit, Evidence, Reconciliation & Certification

후속 기능을 중복 구현하지 말고 이번 단계에서는 Workflow Definition과 실행 인프라를 완성하라.

---

# 2. 실행 역할

너는 다음 역할을 동시에 수행한다.

* 초엔터프라이즈급 Workflow Platform Architect
* Approval Workflow Domain 책임자
* Workflow Definition 책임자
* Workflow Version 책임자
* Workflow Template 책임자
* Workflow Node·Edge 책임자
* Flow Execution Engine 책임자
* Workflow Instance 책임자
* Workflow State Machine 책임자
* Human Task 책임자
* System Task 책임자
* Decision Gateway 책임자
* Timer·Event·Wait Node 책임자
* Task Assignment·Claim·Completion 책임자
* Workflow Token 책임자
* Retry·Backoff·Failure Handling 책임자
* Pause·Resume·Cancellation 책임자
* Compensation Hook 책임자
* Workflow Migration·Replay 책임자
* Idempotency·Concurrency 책임자
* Multi-tenant Workflow Isolation 책임자
* Workflow Security 책임자
* External Engine Adapter 책임자
* Workflow Evidence·Audit·Lineage 책임자
* 기존 BPM·Workflow 구현의 비파괴적 통합 책임자
* ADR·PM·Repeat Problem·Agent Execution History 관리 책임자

---

# 3. 선행조건

작업 전 다음 구현을 확인하라.

## 3.1 Approval Foundation

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
* `APPROVAL_STATUS_HISTORY`
* `APPROVAL_RESOURCE_SNAPSHOT`
* `APPROVAL_CONTEXT_SNAPSHOT`
* `APPROVAL_POLICY_REFERENCE`
* `APPROVAL_CORRELATION`
* `APPROVAL_IDEMPOTENCY`
* `APPROVAL_WITHDRAWAL`
* `APPROVAL_CANCELLATION`
* `APPROVAL_REOPEN`
* `APPROVAL_SUPERSESSION`
* `APPROVAL_EXECUTION_BINDING`
* `APPROVAL_CONSUMPTION`
* `APPROVAL_RECONCILIATION`

## 3.2 Authorization·Role 기반

* Authorization Subject
* Authorization Resource
* Authorization Action
* Permission Registry
* Role Registry
* Role Assignment
* Tenant Scope
* Workspace Scope
* Legal Entity Scope
* Program Scope
* Environment Scope
* Policy Registry
* Authorization Decision
* Actor Authorization Snapshot

## 3.3 공통 플랫폼 기반

* Tenant Registry
* Workspace Registry
* Organization Registry
* Legal Entity Registry
* Environment Registry
* Feature Flag Registry
* Notification Service
* Scheduler
* Queue·Message Broker
* Event Bus
* Distributed Lock
* Idempotency Store
* Audit Store
* Evidence Store
* Object Storage
* Secrets Management
* Observability
* Tracing
* Dead Letter Queue
* Incident Registry

## 3.4 기존 Workflow 구현 전수 조사

다음을 확인하라.

* Existing Workflow Definition
* Existing Workflow Template
* Existing BPMN Definition
* Existing State Machine
* Existing Flow Builder
* Existing Workflow Designer
* Existing Workflow Version
* Existing Workflow Instance
* Existing Workflow Execution
* Existing Workflow Step
* Existing Workflow Node
* Existing Workflow Edge
* Existing Human Task
* Existing System Task
* Existing User Task
* Existing Service Task
* Existing Script Task
* Existing Manual Task
* Existing Decision Gateway
* Existing Exclusive Gateway
* Existing Inclusive Gateway
* Existing Parallel Gateway
* Existing Event Gateway
* Existing Timer
* Existing Wait State
* Existing Signal
* Existing Message Correlation
* Existing Workflow Token
* Existing Task Assignment
* Existing Task Claim
* Existing Task Queue
* Existing Task Inbox
* Existing Retry
* Existing Backoff
* Existing Timeout
* Existing Dead Letter Queue
* Existing Compensation
* Existing Workflow Cancellation
* Existing Workflow Migration
* Existing Workflow Replay
* Existing Workflow Audit
* Existing Workflow Monitoring
* Existing Temporal
* Existing Camunda
* Existing Flowable
* Existing Zeebe
* Existing AWS Step Functions
* Existing Azure Logic Apps
* Existing Google Workflows
* Existing Airflow
* Existing BullMQ
* Existing Celery
* Existing Sidekiq
* Existing Quartz
* Existing Custom Worker
* Git 이력
* 테스트 결과
* 운영 로그

동일 목적 엔진이 존재하면 중복 Workflow Engine을 생성하지 말고 Canonical Workflow Contract와 Adapter로 통합하라.

---

# 4. 핵심 원칙

## 4.1 Definition과 Instance를 분리한다

* Workflow Definition: 실행 규칙과 구조
* Workflow Version: 특정 시점의 불변 정의
* Workflow Instance: 실제 Approval Case의 실행
* Workflow Execution: Instance 내 개별 실행 시도

## 4.2 실행 중 Definition을 덮어쓰지 않는다

새로운 Workflow 변경은 새 Version을 만든다.

기존 Instance는 시작 시 고정된 Version을 사용하거나 명시적 Migration을 수행한다.

## 4.3 Workflow 상태와 Approval 상태를 동일시하지 않는다

Workflow는 실행 상태를 나타내고 Approval은 비즈니스 승인 상태를 나타낸다.

두 상태는 Mapping과 Reconciliation으로 연결한다.

## 4.4 모든 Transition은 Event로 기록한다

현재 Node ID만 변경하지 말고 Transition Event, Source Node, Target Node, Condition Result 및 Actor를 기록한다.

## 4.5 Human Task와 System Task를 구분한다

* Human Task: 사람이 Claim·Decision·Complete
* System Task: Worker·Service·Connector가 실행
* Manual Task: 외부 수동 처리 후 Evidence 입력
* Review Task: Decision 없이 검토·확인
* Approval Task: Approval Decision 생성

## 4.6 At-least-once Delivery를 전제로 설계한다

Queue·Event·Webhook은 중복 전달될 수 있다.

모든 Task·Transition·External Callback에 Idempotency를 적용한다.

## 4.7 Exactly-once를 가정하지 않는다

Financial 실행은 Idempotency Key, Execution Binding 및 Approval Consumption으로 중복 효과를 방지한다.

## 4.8 실패를 정상 완료로 처리하지 않는다

Task 실패, Callback 실패, Timeout 및 상태 불일치를 명시적으로 기록하고 Retry·Dead Letter·Manual Review로 처리한다.

## 4.9 Tenant 간 Workflow Definition을 공유하더라도 실행 데이터는 격리한다

Platform Template은 공유할 수 있으나 Tenant Customization과 Workflow Instance는 Tenant별로 분리한다.

## 4.10 Custom Workflow는 보안 정책을 우회할 수 없다

고객사가 Workflow를 구성하더라도 다음을 제거할 수 없게 한다.

* Mandatory Approval Requirement
* Explicit Deny
* Tenant Isolation
* Legal Entity Boundary
* Production Security Gate
* Financial Control
* Mandatory Evidence
* Mandatory Audit
* Approval Consumption
* SoD Hook
* Emergency Policy Hook

---

# 5. Canonical Entity

기존 동등 Entity가 없을 경우 최소 다음을 구축하라.

* `APPROVAL_WORKFLOW_CATALOG`
* `APPROVAL_WORKFLOW_TEMPLATE`
* `APPROVAL_WORKFLOW_DEFINITION`
* `APPROVAL_WORKFLOW_VERSION`
* `APPROVAL_WORKFLOW_VARIABLE_DEFINITION`
* `APPROVAL_WORKFLOW_NODE`
* `APPROVAL_WORKFLOW_EDGE`
* `APPROVAL_WORKFLOW_NODE_CONFIGURATION`
* `APPROVAL_WORKFLOW_GATEWAY`
* `APPROVAL_WORKFLOW_CONDITION_REFERENCE`
* `APPROVAL_WORKFLOW_EVENT_DEFINITION`
* `APPROVAL_WORKFLOW_TIMER_DEFINITION`
* `APPROVAL_WORKFLOW_TASK_DEFINITION`
* `APPROVAL_WORKFLOW_ASSIGNMENT_RULE_REFERENCE`
* `APPROVAL_WORKFLOW_INSTANCE`
* `APPROVAL_WORKFLOW_EXECUTION`
* `APPROVAL_WORKFLOW_TOKEN`
* `APPROVAL_WORKFLOW_TRANSITION`
* `APPROVAL_WORKFLOW_VARIABLE`
* `APPROVAL_WORKFLOW_TASK`
* `APPROVAL_WORKFLOW_TASK_ASSIGNMENT`
* `APPROVAL_WORKFLOW_TASK_CLAIM`
* `APPROVAL_WORKFLOW_TASK_ATTEMPT`
* `APPROVAL_WORKFLOW_TASK_RESULT`
* `APPROVAL_WORKFLOW_WAIT_STATE`
* `APPROVAL_WORKFLOW_SIGNAL`
* `APPROVAL_WORKFLOW_MESSAGE_CORRELATION`
* `APPROVAL_WORKFLOW_RETRY_POLICY`
* `APPROVAL_WORKFLOW_FAILURE`
* `APPROVAL_WORKFLOW_DEAD_LETTER`
* `APPROVAL_WORKFLOW_PAUSE`
* `APPROVAL_WORKFLOW_RESUME`
* `APPROVAL_WORKFLOW_CANCELLATION`
* `APPROVAL_WORKFLOW_COMPENSATION_REFERENCE`
* `APPROVAL_WORKFLOW_MIGRATION_PLAN`
* `APPROVAL_WORKFLOW_MIGRATION_EXECUTION`
* `APPROVAL_WORKFLOW_REPLAY`
* `APPROVAL_WORKFLOW_IDEMPOTENCY`
* `APPROVAL_WORKFLOW_LOCK`
* `APPROVAL_WORKFLOW_RECONCILIATION`
* `APPROVAL_WORKFLOW_CANDIDATE`
* `APPROVAL_WORKFLOW_EVIDENCE`
* `APPROVAL_WORKFLOW_AUDIT_EVENT`

---

# 6. Workflow Catalog

`APPROVAL_WORKFLOW_CATALOG`

필수 필드:

* workflow_catalog_id
* tenant_id
* organization_id
* workspace_id
* catalog_type
* catalog_name
* supported domains
* template support
* custom workflow support
* restricted node policy
* mandatory control policy
* environment scope
* owner
* active version
* status
* valid_from
* valid_to
* evidence

Catalog Type:

* PLATFORM
* TENANT
* WORKSPACE
* ORGANIZATION
* DOMAIN
* PARTNER
* CUSTOM

---

# 7. Workflow Template

`APPROVAL_WORKFLOW_TEMPLATE`

Template Type:

* SIMPLE_SINGLE_APPROVAL
* MANAGER_APPROVAL
* FINANCE_APPROVAL
* LEGAL_APPROVAL
* SECURITY_APPROVAL
* PROGRAM_ACTIVATION
* FUNDING_CHANGE
* CLAIM_APPROVAL
* SETTLEMENT_APPROVAL
* PAYOUT_APPROVAL
* MIGRATION_APPROVAL
* ACCESS_APPROVAL
* CONTRACT_APPROVAL
* CUSTOM

필수 필드:

* workflow_template_id
* template_code
* template_name
* domain types
* template version
* default nodes
* default edges
* default requirements
* mandatory nodes
* optional nodes
* prohibited modifications
* supported variables
* supported assignment hooks
* production certification state
* owner
* status
* evidence

---

# 8. Workflow Definition

`APPROVAL_WORKFLOW_DEFINITION`

필수 필드:

* workflow_definition_id
* workflow_catalog_id
* workflow_code
* workflow_name
* workflow_description
* workflow_type
* tenant_id
* workspace_id
* organization_id
* legal_entity_scope
* country scope
* environment scope
* approval domain types
* applicable request types
* applicable resource types
* template reference
* default priority
* start node reference
* terminal node references
* maximum execution duration
* maximum active instances
* custom 여부
* system defined 여부
* reusable 여부
* sub-workflow usable 여부
* owner
* active version
* status
* valid_from
* valid_to
* evidence

Workflow Type:

* STANDARD
* TEMPLATE_BASED
* CUSTOM
* SYSTEM
* SUB_WORKFLOW
* EMERGENCY_REFERENCE
* MIGRATION
* READ_ONLY_REVIEW
* HYBRID

---

# 9. Workflow Version

`APPROVAL_WORKFLOW_VERSION`

필수 필드:

* workflow_version_id
* workflow_definition_id
* version_number
* previous_version_id
* version type
* change summary
* node count
* edge count
* variable definitions
* start node
* terminal nodes
* definition payload reference
* definition format
* semantic version
* effective_from
* effective_to
* created_by
* reviewed_by
* approved_by
* activated_at
* immutable_hash
* migration compatibility
* backward compatibility
* production certification reference
* status
* evidence

Version Type:

* INITIAL
* MINOR
* MAJOR
* SECURITY_PATCH
* POLICY_UPDATE
* STRUCTURAL_CHANGE
* MIGRATION
* EMERGENCY_PATCH

상태:

* DRAFT
* VALIDATION_PENDING
* VALIDATION_FAILED
* REVIEW_PENDING
* APPROVAL_PENDING
* APPROVED
* SCHEDULED
* ACTIVE
* ACTIVE_WITH_WARNINGS
* DEPRECATED
* SUSPENDED
* RETIRED
* ARCHIVED
* BLOCKED

---

# 10. Workflow Definition Format

최소 다음을 지원하라.

* INTERNAL_JSON_DSL
* BPMN_2_REFERENCE
* STATE_MACHINE_JSON
* YAML_DSL
* EXTERNAL_ENGINE_REFERENCE
* CUSTOM_ADAPTER

Canonical 실행 의미는 내부 Workflow Contract로 표준화한다.

외부 BPMN 또는 Engine Definition을 직접 Runtime Source of Truth로 사용하더라도 Canonical Node·Edge·Version·Execution Mapping을 유지하라.

---

# 11. Workflow Variable Definition

`APPROVAL_WORKFLOW_VARIABLE_DEFINITION`

지원 Scope:

* REQUEST
* CASE
* ITEM
* WORKFLOW
* NODE
* TASK
* EXECUTION
* SYSTEM
* SECRET_REFERENCE

필수 필드:

* variable_definition_id
* workflow_version_id
* variable_name
* variable type
* scope
* required 여부
* default value reference
* allowed values
* data classification
* mutable 여부
* input 여부
* output 여부
* persisted 여부
* searchable 여부
* encrypted 여부
* masking policy
* validation rule
* status
* evidence

Variable Type:

* STRING
* INTEGER
* DECIMAL
* BOOLEAN
* DATE
* DATETIME
* DURATION
* CURRENCY
* MONEY
* ENUM
* LIST
* MAP
* RESOURCE_REFERENCE
* SUBJECT_REFERENCE
* POLICY_REFERENCE
* EVIDENCE_REFERENCE
* SECRET_REFERENCE
* JSON
* CUSTOM

Credential Secret 원문을 Workflow Variable에 저장하지 마라.

---

# 12. Workflow Node

`APPROVAL_WORKFLOW_NODE`

Node Type:

* START
* END
* APPROVAL_TASK
* REVIEW_TASK
* HUMAN_TASK
* MANUAL_TASK
* SYSTEM_TASK
* SERVICE_TASK
* SCRIPT_TASK_RESTRICTED
* NOTIFICATION_TASK
* DECISION_GATEWAY
* CONDITION_GATEWAY
* EXCLUSIVE_GATEWAY
* INCLUSIVE_GATEWAY
* PARALLEL_GATEWAY_REFERENCE
* EVENT_GATEWAY
* TIMER
* WAIT
* SIGNAL_CATCH
* MESSAGE_CATCH
* MESSAGE_THROW
* SUB_WORKFLOW
* COMPENSATION_REFERENCE
* ERROR_BOUNDARY
* TIMEOUT_BOUNDARY
* CANCEL_BOUNDARY
* MERGE
* FORK_REFERENCE
* JOIN_REFERENCE
* CUSTOM_RESTRICTED

필수 필드:

* workflow_node_id
* workflow_version_id
* node_code
* node_name
* node_type
* description
* incoming edge count
* outgoing edge count
* task definition reference
* gateway reference
* timer reference
* event reference
* assignment rule reference
* authorization requirement
* approval requirement reference
* timeout policy
* retry policy
* failure policy
* compensation reference
* skippable 여부
* mandatory 여부
* customer editable 여부
* position metadata
* status
* evidence

---

# 13. Start Node

모든 Workflow Version은 정확히 하나의 Primary Start Node를 가져야 한다.

지원 Start Trigger:

* APPROVAL_REQUEST_ACCEPTED
* APPROVAL_CASE_CREATED
* MANUAL_START
* API_START
* EVENT_START
* SCHEDULED_START
* MESSAGE_START
* SUB_WORKFLOW_START
* MIGRATION_START
* REOPEN_START
* EMERGENCY_REFERENCE

다음을 차단하라.

* Start Node 없음
* 명시적 Multi-start 정책 없이 여러 Start Node
* 들어오는 Edge가 있는 Primary Start Node
* Mandatory Input 검증 없이 실행 시작

---

# 14. End Node

지원 End Type:

* APPROVED
* CONDITIONALLY_APPROVED
* REJECTED
* CHANGES_REQUIRED
* RETURNED
* CANCELLED
* WITHDRAWN
* EXPIRED
* COMPLETED
* FAILED
* COMPENSATED
* BLOCKED
* SUPERSEDED
* CUSTOM

각 End Node는 Approval Case·Request 상태 Mapping을 가져야 한다.

완료되지 않은 Mandatory Approval Requirement가 존재하는데 Approved End로 이동하지 못하게 하라.

---

# 15. Workflow Edge

`APPROVAL_WORKFLOW_EDGE`

필수 필드:

* workflow_edge_id
* workflow_version_id
* edge_code
* source_node_id
* target_node_id
* edge_type
* condition reference
* condition priority
* default path 여부
* event reference
* timeout reference
* label
* enabled 여부
* status
* evidence

Edge Type:

* NORMAL
* CONDITIONAL
* DEFAULT
* APPROVED
* REJECTED
* CONDITIONAL_APPROVED
* CHANGES_REQUIRED
* RETURNED
* TIMEOUT
* ERROR
* CANCEL
* SIGNAL
* MESSAGE
* COMPENSATION_REFERENCE
* LOOP
* CUSTOM

---

# 16. Graph Validation

Workflow Version 활성화 전에 다음을 검증하라.

* 정확한 Start Node 존재
* 최소 하나의 Terminal Node 존재
* Start에서 Terminal까지 도달 가능
* Orphan Node 없음
* Unreachable Node 없음
* Dead-end Non-terminal Node 없음
* Edge Source·Target 유효
* Gateway Default Path 규칙 충족
* 무한 Loop 위험 탐지
* Loop에 종료 조건 존재
* Mandatory Node 우회 경로 없음
* Cross-Tenant Sub-workflow Reference 없음
* Production에서 Restricted Script Node 없음
* Approval Requirement 없는 Approval Task 없음
* Assignment Hook 없는 Human Task 없음
* Error Boundary 없는 Critical System Task 경고
* Retry Policy 없는 External Service Task 경고
* 민감 Variable의 Masking Policy 존재
* Node Code 중복 없음
* Edge Code 중복 없음
* Version Immutable Hash 유효

---

# 17. Node Configuration

`APPROVAL_WORKFLOW_NODE_CONFIGURATION`

필수 필드:

* node_configuration_id
* workflow_node_id
* configuration version
* input mappings
* output mappings
* variable mappings
* form reference
* UI schema reference
* task instruction reference
* evidence requirements
* attachment policy
* comment policy
* authorization action
* required permission
* required role reference
* execution service reference
* connector reference
* notification template reference
* status
* evidence

---

# 18. Workflow Gateway

`APPROVAL_WORKFLOW_GATEWAY`

Gateway Type:

* EXCLUSIVE
* INCLUSIVE
* DECISION
* CONDITION
* EVENT
* PARALLEL_REFERENCE
* COMPLEX_REFERENCE
* MERGE
* FORK_REFERENCE
* JOIN_REFERENCE

필수 필드:

* workflow_gateway_id
* workflow_node_id
* gateway type
* evaluation mode
* outgoing edge policy
* default edge
* no match behavior
* multiple match behavior
* evaluation timeout
* evidence capture
* status

Evaluation Mode:

* FIRST_MATCH
* HIGHEST_PRIORITY
* ALL_MATCHES
* SINGLE_REQUIRED
* DEFAULT_ON_NO_MATCH
* BLOCK_ON_NO_MATCH
* MANUAL_REVIEW_ON_CONFLICT

---

# 19. Condition Reference

`APPROVAL_WORKFLOW_CONDITION_REFERENCE`

이번 단계에서는 조건 실행 Contract와 Hook을 구축한다.

상세 Dynamic Rule Engine은 후속 단계에서 완성한다.

필수 필드:

* condition_reference_id
* workflow_version_id
* node or edge reference
* condition source type
* condition id
* condition version
* expected result
* failure behavior
* stale data behavior
* timeout behavior
* evidence capture
* status

Condition Source Type:

* APPROVAL_POLICY
* AUTHORIZATION_POLICY
* BUSINESS_RULE
* FINANCIAL_RULE
* RISK_RULE
* CONTRACT_RULE
* RESOURCE_ATTRIBUTE
* REQUEST_ATTRIBUTE
* WORKFLOW_VARIABLE
* EXTERNAL_DECISION_SERVICE
* MANUAL_REFERENCE
* CUSTOM

---

# 20. Workflow Event Definition

`APPROVAL_WORKFLOW_EVENT_DEFINITION`

Event Type:

* REQUEST_SUBMITTED
* CASE_CREATED
* TASK_CREATED
* TASK_ASSIGNED
* TASK_CLAIMED
* TASK_COMPLETED
* TASK_FAILED
* DECISION_RECORDED
* RESOURCE_CHANGED
* POLICY_CHANGED
* ROLE_CHANGED
* TIMER_FIRED
* SIGNAL_RECEIVED
* MESSAGE_RECEIVED
* EXTERNAL_CALLBACK
* INCIDENT_OPENED
* CANCELLATION_REQUESTED
* WITHDRAWAL_REQUESTED
* REOPEN_REQUESTED
* MIGRATION_REQUESTED
* CUSTOM

필수 필드:

* workflow_event_definition_id
* event code
* event type
* source
* schema reference
* correlation strategy
* idempotency strategy
* authentication requirement
* authorization requirement
* tenant validation
* timeout
* retry policy
* status
* evidence

---

# 21. Timer Definition

`APPROVAL_WORKFLOW_TIMER_DEFINITION`

Timer Type:

* DURATION
* ABSOLUTE_DATETIME
* BUSINESS_CALENDAR
* DEADLINE_REFERENCE
* SLA_REFERENCE
* CRON_REFERENCE
* RELATIVE_TO_NODE_ENTRY
* RELATIVE_TO_TASK_ASSIGNMENT
* RELATIVE_TO_REQUEST_SUBMISSION
* CUSTOM

필수 필드:

* timer_definition_id
* workflow_node_id
* timer type
* timer expression
* timezone
* business calendar reference
* start reference
* maximum delay
* catch-up policy
* missed timer policy
* duplicate fire protection
* target transition
* status
* evidence

상세 SLA·Escalation은 후속 단계에서 구현한다.

---

# 22. Workflow Task Definition

`APPROVAL_WORKFLOW_TASK_DEFINITION`

Task Type:

* APPROVAL
* REVIEW
* HUMAN
* MANUAL
* SYSTEM
* SERVICE
* NOTIFICATION
* DATA_VALIDATION
* POLICY_EVALUATION
* EVIDENCE_COLLECTION
* RESOURCE_SNAPSHOT
* AUTHORIZATION_CHECK
* EXTERNAL_CALLBACK_WAIT
* EXECUTION_BINDING
* RECONCILIATION
* SUB_WORKFLOW
* CUSTOM_RESTRICTED

필수 필드:

* task_definition_id
* workflow_node_id
* task code
* task name
* task type
* task description
* input contract
* output contract
* assignment hook
* required permission
* required role type
* required approval requirement
* form reference
* evidence requirement
* due date hook
* retry policy
* timeout policy
* idempotency policy
* completion policy
* status
* evidence

---

# 23. Approval Task

Approval Task는 다음을 강제한다.

* 연결된 Approval Requirement
* 승인자 후보 Assignment Hook
* Actor Authorization Check
* Resource Snapshot 검증
* Decision Append-only 기록
* Decision Reason 처리
* Condition·Obligation 처리
* Task Completion과 Decision Correlation
* 중복 Decision 방지
* Final Decision 후 재완료 방지

Approval Task 완료 결과:

* APPROVED
* REJECTED
* CONDITIONALLY_APPROVED
* CHANGES_REQUIRED
* RETURNED
* ABSTAINED
* MANUAL_REVIEW

---

# 24. Review Task

Review Task는 Approval Decision을 생성하지 않을 수 있다.

지원 결과:

* REVIEW_COMPLETED
* INFORMATION_SUFFICIENT
* INFORMATION_INSUFFICIENT
* CHANGES_RECOMMENDED
* ESCALATION_RECOMMENDED
* ACKNOWLEDGED
* BLOCKED

Review 완료가 Approval Requirement 충족으로 잘못 처리되지 않게 하라.

---

# 25. Human Task

Human Task는 다음 Lifecycle을 가진다.

* CREATED
* ASSIGNMENT_PENDING
* ASSIGNED
* AVAILABLE
* CLAIMED
* IN_PROGRESS
* SUSPENDED
* COMPLETION_PENDING
* COMPLETED
* RELEASED
* REASSIGNMENT_PENDING
* CANCELLED
* EXPIRED
* FAILED
* BLOCKED

Human Task에 다음을 기록한다.

* Candidate Subjects
* Candidate Roles
* Candidate Groups
* Required Scope
* Required Legal Entity
* Required Environment
* Claimed By
* Claimed At
* Assignment Version
* Due Date Reference
* Priority
* Form Reference
* Evidence Requirement
* Decision Requirement
* Task Token
* Lock Version

---

# 26. Manual Task

Manual Task는 외부 시스템 밖에서 수행되는 활동을 추적한다.

예:

* 서면 계약 검토
* 오프라인 회의
* 외부 은행 확인
* 고객 승인서 수령
* 법률 문서 확인

Manual Task 완료 시 다음을 요구할 수 있다.

* 수행자
* 수행 일시
* 수행 결과
* Evidence
* 외부 Reference
* 확인자
* Resource Version 확인
* Comment

Evidence 없이 Critical Manual Task를 완료하지 못하게 하라.

---

# 27. System·Service Task

System Task와 Service Task에는 다음을 적용한다.

* Idempotency Key
* Execution Attempt
* Worker Identity
* Service Account Authorization
* Tenant Context
* Environment Context
* Input Hash
* Output Hash
* Retry Policy
* Timeout
* Circuit Breaker Reference
* Dead Letter Policy
* Trace ID
* Correlation ID
* Execution Evidence

예:

* Approval Requirement 생성
* Actor Authorization 검증
* Resource Snapshot 생성
* Budget 확인
* Funding 확인
* ERP Document 조회
* Provider 상태 확인
* Notification 발송
* Approval Execution Binding 생성
* Reconciliation 실행

---

# 28. Script Task 제한

Script Task는 기본적으로 제한한다.

Production에서 다음을 차단하라.

* 임의 코드 실행
* Secret 원문 접근
* 직접 Database Write
* Authorization 우회
* Approval Status 직접 변경
* 외부 Network 무제한 호출
* Tenant Context 없는 실행
* Dynamic Eval
* Shell 실행
* 파일 시스템 임의 접근

필요한 경우 사전 승인된 Sandboxed Expression 또는 Registered Function만 사용한다.

---

# 29. Notification Task

Notification Task는 다음 Channel을 지원할 수 있다.

* IN_APP
* EMAIL
* SMS_REFERENCE
* PUSH
* SLACK_REFERENCE
* TEAMS_REFERENCE
* WEBHOOK
* ERP_INBOX
* PROVIDER_NOTIFICATION
* CUSTOM

필수:

* recipient resolution hook
* template version
* tenant branding reference
* locale
* timezone
* sensitive data policy
* retry policy
* delivery result
* notification correlation
* evidence

Notification 실패를 Approval Decision 실패로 자동 해석하지 않는다.

---

# 30. Sub-workflow Node

`SUB_WORKFLOW`는 다른 Workflow Definition을 호출한다.

필수:

* child workflow definition
* child workflow version selection
* input mapping
* output mapping
* tenant compatibility
* environment compatibility
* legal entity compatibility
* completion policy
* cancellation propagation
* failure propagation
* timeout
* evidence

다음을 차단하라.

* 순환 Sub-workflow 호출
* Cross-Tenant Child Workflow
* Production Parent에서 미승인 Sandbox Child 호출
* Mandatory Control이 없는 Child Workflow
* Version 미고정 Child 실행

---

# 31. Workflow Instance

`APPROVAL_WORKFLOW_INSTANCE`

필수 필드:

* workflow_instance_id
* workflow_definition_id
* workflow_version_id
* approval_request_id
* approval_case_id
* parent_workflow_instance_id
* root_workflow_instance_id
* tenant_id
* workspace_id
* organization_id
* legal_entity_id
* environment
* current state
* current node references
* active token count
* active task count
* suspended 여부
* cancellation requested 여부
* started_at
* last_transition_at
* completed_at
* expires_at
* lock version
* status
* evidence

Instance 상태:

* CREATED
* INITIALIZING
* RUNNING
* WAITING
* WAITING_FOR_HUMAN
* WAITING_FOR_EVENT
* WAITING_FOR_TIMER
* WAITING_FOR_SUB_WORKFLOW
* PAUSE_PENDING
* PAUSED
* RESUME_PENDING
* CANCELLATION_PENDING
* CANCELLING
* COMPENSATION_PENDING
* COMPENSATING
* COMPLETED
* CANCELLED
* FAILED
* DEAD_LETTERED
* MIGRATION_PENDING
* MIGRATING
* REPLAY_PENDING
* BLOCKED
* SUPERSEDED
* UNKNOWN

---

# 32. Workflow Execution

`APPROVAL_WORKFLOW_EXECUTION`

Instance 내 Worker 또는 Engine 실행 시도를 기록한다.

필수 필드:

* workflow_execution_id
* workflow_instance_id
* execution type
* worker identity
* engine reference
* engine version
* node reference
* task reference
* token reference
* attempt number
* input hash
* output hash
* started_at
* heartbeat_at
* completed_at
* execution result
* error reference
* retry scheduled at
* trace id
* status
* evidence

Execution Type:

* INITIALIZATION
* NODE_ENTRY
* TASK_CREATION
* TASK_ASSIGNMENT
* TASK_EXECUTION
* CONDITION_EVALUATION
* TRANSITION
* TIMER_FIRE
* SIGNAL_PROCESSING
* MESSAGE_PROCESSING
* CALLBACK_PROCESSING
* COMPENSATION
* MIGRATION
* REPLAY
* RECONCILIATION
* OTHER

---

# 33. Workflow Token

`APPROVAL_WORKFLOW_TOKEN`

Token은 실행 경로를 추적한다.

필수 필드:

* workflow_token_id
* workflow_instance_id
* parent_token_id
* source_node_id
* current_node_id
* token type
* branch reference
* fork reference
* join reference
* created_at
* consumed_at
* cancelled_at
* status
* lock version
* evidence

Token Type:

* PRIMARY
* BRANCH
* SUB_WORKFLOW
* COMPENSATION
* REPLAY
* MIGRATION
* ERROR
* TIMEOUT

동일 Token이 같은 Edge를 중복 통과하지 않도록 하라.

---

# 34. Workflow Transition

`APPROVAL_WORKFLOW_TRANSITION`

필수 필드:

* workflow_transition_id
* workflow_instance_id
* workflow_token_id
* source_node_id
* target_node_id
* edge_id
* transition type
* triggered by
* trigger event reference
* condition references
* condition results
* default path used 여부
* actor reference
* execution reference
* transitioned_at
* idempotency key
* immutable hash
* status
* evidence

Transition Type:

* AUTOMATIC
* HUMAN_COMPLETION
* DECISION
* EVENT
* TIMER
* SIGNAL
* MESSAGE
* ERROR
* TIMEOUT
* CANCEL
* COMPENSATION
* MIGRATION
* REPLAY
* ADMINISTRATIVE

---

# 35. Workflow Variable

`APPROVAL_WORKFLOW_VARIABLE`

필수 필드:

* workflow_variable_id
* workflow_instance_id
* workflow_token_id
* node reference
* task reference
* variable definition
* variable name
* variable value reference
* value type
* scope
* source
* version
* immutable 여부
* encrypted 여부
* masked 여부
* created_at
* updated_at
* status
* evidence

Immutable Approval Snapshot 관련 Variable은 수정하지 못하게 한다.

---

# 36. Workflow Task

`APPROVAL_WORKFLOW_TASK`

필수 필드:

* workflow_task_id
* workflow_instance_id
* workflow_token_id
* workflow_node_id
* task_definition_id
* approval_case_id
* approval_item_id
* approval_requirement_id
* task type
* task code
* task title
* task priority
* candidate participants
* assigned participant
* claimed by
* task input reference
* task output reference
* due date reference
* timeout at
* created_at
* assigned_at
* claimed_at
* started_at
* completed_at
* status
* lock version
* evidence

---

# 37. Task Assignment

`APPROVAL_WORKFLOW_TASK_ASSIGNMENT`

필수 필드:

* task_assignment_id
* workflow_task_id
* assignment type
* candidate subject
* candidate role
* candidate group
* candidate organization
* required tenant
* required workspace
* required legal entity
* required environment
* required program scope
* required financial threshold
* assignment rule reference
* assignment rule version
* authorization precheck
* assigned_at
* valid_from
* valid_to
* status
* evidence

Assignment Type:

* DIRECT
* ROLE_BASED
* GROUP_BASED
* ORGANIZATION_BASED
* RESOURCE_OWNER
* REQUESTER_MANAGER_REFERENCE
* CASE_OWNER
* ROUND_ROBIN_REFERENCE
* LOAD_BALANCED_REFERENCE
* POLICY_RESOLVED
* MANUAL
* DELEGATION_REFERENCE
* SUBSTITUTE_REFERENCE
* SYSTEM

상세 계층·Delegation은 후속 단계에서 확장한다.

---

# 38. Task Claim

`APPROVAL_WORKFLOW_TASK_CLAIM`

필수 필드:

* task_claim_id
* workflow_task_id
* claimed_by
* actor authorization snapshot
* claim token
* claimed_at
* claim expires at
* exclusive 여부
* lock version
* released_at
* release reason
* status
* evidence

다음을 차단하라.

* 후보가 아닌 Subject의 Claim
* 유효하지 않은 Role·Scope로 Claim
* 다른 Tenant Task Claim
* 만료된 Assignment로 Claim
* 이미 Exclusive Claim된 Task 중복 Claim
* Claim Token 없는 완료

---

# 39. Task Release·Reassignment

지원 사유:

* USER_RELEASE
* ROLE_REVOKED
* ASSIGNMENT_EXPIRED
* ORGANIZATION_TRANSFER
* UNAVAILABLE_REFERENCE
* TIMEOUT
* ADMINISTRATIVE
* SECURITY_INCIDENT
* WORKFLOW_MIGRATION
* TASK_CANCELLED

Release 이후 Task 상태와 Assignment Candidate를 재평가한다.

완료된 Task는 일반 Release 대상으로 사용하지 않는다.

---

# 40. Task Attempt

`APPROVAL_WORKFLOW_TASK_ATTEMPT`

필수 필드:

* task_attempt_id
* workflow_task_id
* attempt number
* actor or worker
* execution id
* input hash
* idempotency key
* started_at
* heartbeat_at
* completed_at
* outcome
* error code
* retryable 여부
* retry scheduled at
* status
* evidence

---

# 41. Task Result

`APPROVAL_WORKFLOW_TASK_RESULT`

필수 필드:

* task_result_id
* workflow_task_id
* task_attempt_id
* result type
* output reference
* approval decision reference
* evidence references
* next transition hint
* completed by
* completed at
* immutable hash
* status
* evidence

Result Type:

* SUCCESS
* APPROVED
* REJECTED
* CONDITIONALLY_APPROVED
* CHANGES_REQUIRED
* RETURNED
* REVIEW_COMPLETED
* WAITING
* RETRY
* FAILED
* CANCELLED
* EXPIRED
* BLOCKED
* MANUAL_REVIEW

---

# 42. Task Completion

Task 완료 전에 다음을 검증하라.

* Task가 Active 상태인가
* 올바른 Workflow Instance인가
* Claim이 필요한 경우 유효한 Claim이 있는가
* Actor Authorization이 유효한가
* Required Evidence가 있는가
* Required Form Field가 충족되는가
* Approval Task면 Decision이 생성되었는가
* Resource Version이 유효한가
* Task Lock Version이 일치하는가
* Idempotency Key가 유효한가
* 이미 완료된 Task가 아닌가

Task Completion과 Workflow Transition을 Transactional Outbox 또는 동등한 신뢰성 패턴으로 연결하라.

---

# 43. Wait State

`APPROVAL_WORKFLOW_WAIT_STATE`

Wait Type:

* HUMAN_DECISION
* EXTERNAL_CALLBACK
* EVENT
* SIGNAL
* MESSAGE
* TIMER
* RESOURCE_CHANGE
* POLICY_EVALUATION
* SUB_WORKFLOW
* MANUAL_CONFIRMATION
* CUSTOM

필수 필드:

* wait_state_id
* workflow_instance_id
* workflow_token_id
* workflow_node_id
* wait type
* correlation key
* expected event type
* expected source
* entered_at
* timeout_at
* resume policy
* duplicate event policy
* status
* evidence

---

# 44. Signal

`APPROVAL_WORKFLOW_SIGNAL`

필수 필드:

* workflow_signal_id
* signal type
* signal name
* source system
* source subject
* tenant_id
* workflow instance reference
* correlation key
* payload reference
* payload hash
* received_at
* authenticated 여부
* authorized 여부
* consumed_at
* duplicate 여부
* status
* evidence

Signal Type:

* RESUME
* CANCEL
* RESOURCE_UPDATED
* POLICY_UPDATED
* ROLE_UPDATED
* EXTERNAL_APPROVED
* EXTERNAL_REJECTED
* INCIDENT_OPENED
* INCIDENT_RESOLVED
* CUSTOM

---

# 45. Message Correlation

`APPROVAL_WORKFLOW_MESSAGE_CORRELATION`

필수 필드:

* message_correlation_id
* message id
* message type
* source system
* tenant_id
* workspace_id
* correlation key
* business resource reference
* approval request reference
* approval case reference
* workflow instance reference
* target node
* payload hash
* received_at
* correlated_at
* duplicate 여부
* unmatched 여부
* status
* evidence

Unmatched Message는 즉시 폐기하지 말고 보존 기간과 Manual Reconciliation 정책을 적용한다.

---

# 46. Retry Policy

`APPROVAL_WORKFLOW_RETRY_POLICY`

필수 필드:

* retry_policy_id
* policy name
* applicable task types
* maximum attempts
* initial delay
* backoff strategy
* backoff multiplier
* maximum delay
* jitter 여부
* retryable error codes
* non-retryable error codes
* timeout
* dead letter behavior
* alert threshold
* status
* evidence

Backoff Strategy:

* FIXED
* LINEAR
* EXPONENTIAL
* EXPONENTIAL_WITH_JITTER
* CUSTOM

Financial Execution Task는 외부 시스템 Idempotency 확인 없이 무조건 Retry하지 마라.

---

# 47. Workflow Failure

`APPROVAL_WORKFLOW_FAILURE`

필수 필드:

* workflow_failure_id
* workflow_instance_id
* workflow_execution_id
* workflow_task_id
* workflow_node_id
* failure type
* error code
* error category
* retryable 여부
* attempt count
* source system
* occurred_at
* detected_at
* impact
* affected approval case
* affected resource
* recovery recommendation
* incident reference
* status
* evidence

Failure Type:

* VALIDATION
* AUTHORIZATION
* ASSIGNMENT
* TASK_EXECUTION
* CONDITION_EVALUATION
* EXTERNAL_SERVICE
* TIMEOUT
* CONCURRENCY
* IDEMPOTENCY
* PERSISTENCE
* EVENT_DELIVERY
* CALLBACK
* POLICY_VERSION
* RESOURCE_VERSION
* MIGRATION
* COMPENSATION
* UNKNOWN

---

# 48. Dead Letter

`APPROVAL_WORKFLOW_DEAD_LETTER`

필수 필드:

* dead_letter_id
* workflow instance
* execution
* task
* message or event reference
* failure reference
* payload reference
* payload hash
* failed attempts
* first failed at
* last failed at
* next action
* assigned operator
* replay allowed 여부
* status
* evidence

Next Action:

* MANUAL_REVIEW
* REPLAY
* RETRY_AFTER_FIX
* CANCEL_INSTANCE
* MIGRATE_INSTANCE
* COMPENSATE_REFERENCE
* IGNORE_WITH_REASON
* BLOCK

---

# 49. Pause

`APPROVAL_WORKFLOW_PAUSE`

Pause Trigger:

* MANUAL
* POLICY_CHANGE
* RESOURCE_CHANGE
* SECURITY_INCIDENT
* LEGAL_HOLD
* MAINTENANCE
* WORKFLOW_MIGRATION
* EXTERNAL_DEPENDENCY
* RISK_REEVALUATION
* OTHER

필수 필드:

* pause_id
* workflow instance
* pause trigger
* requested by
* reason
* effective at
* affected tokens
* affected tasks
* active timers policy
* external callbacks policy
* resume conditions
* status
* evidence

---

# 50. Resume

`APPROVAL_WORKFLOW_RESUME`

필수 필드:

* resume_id
* workflow instance
* pause reference
* requested by
* resume reason
* condition validation
* resource version validation
* policy version validation
* actor assignment validation
* timer recalculation
* resumed at
* status
* evidence

Resume 전 Resource·Policy·Role·Approval Requirement를 재검증할 수 있어야 한다.

---

# 51. Workflow Cancellation

`APPROVAL_WORKFLOW_CANCELLATION`

필수 필드:

* workflow_cancellation_id
* workflow_instance_id
* approval cancellation reference
* cancellation type
* requested by
* reason
* active task handling
* active token handling
* sub-workflow propagation
* external task handling
* compensation reference
* effective at
* completed at
* status
* evidence

다음을 구분하라.

* 승인 전 단순 취소
* 일부 Decision 후 취소
* 외부 작업 실행 후 취소
* Financial Execution 후 취소
* Compensation 필요 취소

---

# 52. Compensation Hook

이번 단계에서는 Compensation 실행 Contract와 Reference를 구축한다.

상세 Financial Reversal은 각 Domain 정책으로 처리한다.

`APPROVAL_WORKFLOW_COMPENSATION_REFERENCE`

필수 필드:

* compensation_reference_id
* workflow instance
* source task
* source execution
* compensation task definition
* compensation order
* compensation condition
* approval requirement reference
* idempotency policy
* status
* evidence

Compensation은 원본 Event 삭제가 아니라 별도 보상 작업으로 처리한다.

---

# 53. Workflow Idempotency

`APPROVAL_WORKFLOW_IDEMPOTENCY`

적용 대상:

* Instance Start
* Task Creation
* Task Assignment
* Task Completion
* Decision Recording
* Transition
* Timer Fire
* Signal
* Message
* Callback
* Sub-workflow Start
* Cancellation
* Migration
* Replay
* Compensation

필수 필드:

* workflow_idempotency_id
* tenant_id
* idempotency type
* idempotency key
* workflow instance
* task reference
* transition reference
* request payload hash
* first result reference
* first seen at
* last seen at
* duplicate count
* expiry
* resolution
* status
* evidence

---

# 54. Concurrency Lock

`APPROVAL_WORKFLOW_LOCK`

Lock Type:

* WORKFLOW_INSTANCE
* WORKFLOW_TOKEN
* WORKFLOW_TASK
* TASK_CLAIM
* TRANSITION
* MIGRATION
* CANCELLATION
* REPLAY
* COMPENSATION

필수 필드:

* workflow_lock_id
* lock type
* resource id
* owner
* fencing token
* lock version
* acquired at
* heartbeat at
* expires at
* released at
* status
* evidence

Database Row Lock만으로 분산 Worker 동시성을 해결할 수 없는 경우 Distributed Lock 또는 Optimistic Concurrency와 Fencing Token을 사용하라.

---

# 55. Optimistic Concurrency

다음 Entity에 Lock Version 또는 ETag를 적용하라.

* Workflow Instance
* Workflow Token
* Workflow Task
* Task Claim
* Workflow Transition
* Workflow Variable
* Migration Execution
* Cancellation

Stale Version Update를 차단하라.

---

# 56. Workflow Migration Plan

`APPROVAL_WORKFLOW_MIGRATION_PLAN`

실행 중 Instance를 새 Workflow Version으로 Migration할 수 있는 기반을 마련한다.

필수 필드:

* migration_plan_id
* source workflow version
* target workflow version
* tenant scope
* environment scope
* eligible instance states
* node mapping
* variable mapping
* task mapping
* token mapping
* active approval decision handling
* active task handling
* timer handling
* event subscription handling
* rollback policy
* dry-run result
* risk assessment
* requested by
* approved by reference
* scheduled at
* status
* evidence

Migration Policy:

* NEW_INSTANCES_ONLY
* SAFE_POINT_ONLY
* PAUSED_INSTANCES_ONLY
* SELECTED_INSTANCES
* ALL_ELIGIBLE_INSTANCES
* NO_MIGRATION
* MANUAL

---

# 57. Workflow Migration Execution

`APPROVAL_WORKFLOW_MIGRATION_EXECUTION`

필수 필드:

* migration_execution_id
* migration plan
* workflow instance
* source version
* target version
* source node
* target node
* source tokens
* target tokens
* source variables
* migrated variables
* active tasks result
* timers result
* event subscriptions result
* started at
* completed at
* validation result
* rollback reference
* status
* evidence

다음을 차단하라.

* Node Mapping 없는 Active Node Migration
* Mandatory Approval Task 우회
* 완료된 Decision 손실
* Tenant 변경 Migration
* Environment 변경 Migration
* Legal Entity 경계 변경
* 승인되지 않은 Target Version
* Active Financial Execution 중 무검증 Migration

---

# 58. Workflow Replay

`APPROVAL_WORKFLOW_REPLAY`

Replay Type:

* EVENT_REPLAY
* TASK_REPLAY
* CALLBACK_REPLAY
* TRANSITION_REPLAY
* DEAD_LETTER_REPLAY
* RECONCILIATION_REPLAY
* AUDIT_RECONSTRUCTION

필수 필드:

* replay_id
* workflow instance
* source execution
* source event
* replay type
* replay reason
* requested by
* replay from point
* dry run 여부
* side effect policy
* idempotency validation
* resource version validation
* started at
* completed at
* result
* status
* evidence

Replay 기본값은 Side-effect 방지 모드로 설정한다.

Financial System Task의 Side Effect를 재실행하기 전에 외부 실행 상태와 Idempotency를 확인하라.

---

# 59. Workflow Candidate

`APPROVAL_WORKFLOW_CANDIDATE`

Workflow 선택 시 다음을 기록한다.

* candidate_id
* approval request
* approval request version
* approval case
* approval domain
* request type
* resource type
* resource version
* tenant
* workspace
* organization
* legal entity
* country
* environment
* amount
* currency
* risk reference
* matched workflow definitions
* matched workflow versions
* template reference
* selection policy reference
* excluded workflows
* conflict result
* proposed workflow
* proposed start node
* required variables
* validation result
* manual review requirement
* evidence

상세 Dynamic Routing은 후속 Rule Engine에서 확장한다.

---

# 60. Workflow Selection 기본 우선순위

권장 우선순위:

1. Explicit Workflow Binding
2. Approval Domain 전용 Tenant Workflow
3. Legal Entity 전용 Workflow
4. Workspace 전용 Workflow
5. Program 전용 Workflow
6. Country·Region Workflow
7. Financial Threshold 전용 Workflow Reference
8. Risk Workflow Reference
9. Tenant Default Workflow
10. Platform Standard Template
11. Manual Review
12. Block

동일 우선순위의 여러 Workflow가 충돌하면 자동 임의 선택하지 마라.

---

# 61. Workflow Reconciliation

`APPROVAL_WORKFLOW_RECONCILIATION`

다음을 비교하라.

* Approval Case Workflow Reference vs Runtime Instance
* Workflow Definition Version vs Runtime Version
* Workflow Instance State vs Approval Case Status
* Current Node vs Active Tasks
* Active Tokens vs Active Branches
* Task Assignment vs Approval Participant
* Task Claim Actor vs Decision Actor
* Task Completion vs Approval Decision
* Transition Event vs Node State
* Timer State vs Scheduler State
* Wait State vs Event Subscription
* External Callback vs Message Correlation
* Retry State vs Execution Attempt
* Dead Letter vs Failed Execution
* Workflow Cancellation vs Active Tasks
* Workflow Pause vs Running Worker
* Workflow Completion vs Pending Mandatory Requirement
* Workflow End State vs Approval Request Status
* Workflow Execution vs Audit Event
* External Engine State vs Canonical State
* Migration State vs Runtime Version
* Replay Result vs Original State
* Approval Execution Binding vs Workflow Completion

필수 필드:

* workflow_reconciliation_id
* workflow instance
* approval case
* comparison type
* source state
* canonical state
* difference
* severity
* detected at
* resolved at
* resolution
* status
* evidence

---

# 62. Reconciliation 상태

* MATCH
* CASE_INSTANCE_MISMATCH
* DEFINITION_VERSION_MISMATCH
* INSTANCE_CASE_STATUS_MISMATCH
* NODE_TASK_MISMATCH
* TOKEN_BRANCH_MISMATCH
* TASK_PARTICIPANT_MISMATCH
* CLAIM_DECISION_ACTOR_MISMATCH
* TASK_DECISION_MISMATCH
* TRANSITION_STATE_MISMATCH
* TIMER_SCHEDULER_MISMATCH
* WAIT_SUBSCRIPTION_MISMATCH
* CALLBACK_CORRELATION_MISMATCH
* RETRY_ATTEMPT_MISMATCH
* DEAD_LETTER_EXECUTION_MISMATCH
* CANCELLATION_TASK_MISMATCH
* PAUSE_EXECUTION_MISMATCH
* COMPLETION_REQUIREMENT_MISMATCH
* END_REQUEST_STATUS_MISMATCH
* EXECUTION_AUDIT_MISMATCH
* EXTERNAL_ENGINE_MISMATCH
* MIGRATION_VERSION_MISMATCH
* REPLAY_STATE_MISMATCH
* EXECUTION_BINDING_MISMATCH
* MANUAL_REVIEW
* BLOCKED

---

# 63. Workflow State Mapping

최소 다음 Mapping을 정의하라.

| Workflow Instance State | Approval Case State    | Approval Request State        |
| ----------------------- | ---------------------- | ----------------------------- |
| CREATED·INITIALIZING    | CREATED                | CASE_CREATION_PENDING         |
| RUNNING                 | IN_PROGRESS            | IN_REVIEW                     |
| WAITING_FOR_HUMAN       | WAITING_FOR_DECISION   | APPROVAL_PENDING              |
| WAITING_FOR_EVENT       | IN_PROGRESS            | IN_REVIEW                     |
| PAUSED                  | PAUSED                 | APPROVAL_PENDING 또는 IN_REVIEW |
| COMPLETED-APPROVED      | APPROVED               | APPROVED                      |
| COMPLETED-CONDITIONAL   | CONDITIONALLY_APPROVED | CONDITIONALLY_APPROVED        |
| COMPLETED-REJECTED      | REJECTED               | REJECTED                      |
| COMPLETED-CHANGES       | CHANGES_REQUIRED       | CHANGES_REQUIRED              |
| CANCELLED               | CANCELLED              | CANCELLED                     |
| FAILED                  | FAILED                 | FAILED                        |
| BLOCKED                 | BLOCKED                | BLOCKED                       |
| SUPERSEDED              | SUPERSEDED             | SUPERSEDED                    |

Mapping은 하드코딩된 단일 Enum 변환이 아니라 Versioned Mapping Registry 또는 명시적 Contract로 관리하라.

---

# 64. Critical Workflow Gap 후보

다음은 High 또는 Critical로 처리하라.

* 승인된 Workflow Version 없이 Instance 실행
* 다른 Tenant Workflow Definition 사용
* Production Instance에서 Sandbox Workflow Version 실행
* Start Node가 없는 Active Workflow
* Terminal Node에 도달할 수 없는 Workflow
* Mandatory Approval Task 우회 경로
* Approval Requirement 없는 Approval Task
* Candidate 검증 없는 Human Task Assignment
* 다른 Tenant 사용자의 Task Claim
* 중복 Task Completion
* 중복 Workflow Transition
* 동일 Event 중복 처리로 Node 반복 진입
* Approval Decision 없이 Approval Task 완료
* Workflow 완료 상태인데 Mandatory Requirement 미충족
* Workflow 완료 전에 Approval Execution Binding 생성
* Cancelled Workflow의 Active Task 지속
* Paused Workflow에서 Worker 실행 지속
* Financial System Task의 무제한 Retry
* External Callback 인증·Tenant 검증 누락
* Workflow Migration으로 Mandatory Node 우회
* Replay로 Financial Side Effect 중복 실행
* Workflow Instance와 Approval Case 상태 불일치
* External Engine과 Canonical State의 Critical Drift
* Secret이 Workflow Variable 또는 Audit에 저장
* Script Task로 Authorization·Approval 우회
* Workflow Definition 직접 수정으로 실행 이력 훼손

---

# 65. 최소 Static Lint

전체 Production Certification은 마지막 Approval Audit 단계에서 완성한다.

이번 블록에서는 다음을 차단하라.

* Active Workflow에 Start Node 없음
* Terminal Node 없음
* Unreachable Node
* Dead-end Non-terminal Node
* Orphan Edge
* 잘못된 Source·Target
* Node Code 중복
* Edge Code 중복
* 무한 Loop 종료 조건 누락
* Gateway Default Path 규칙 위반
* Approval Requirement 없는 Approval Task
* Assignment Hook 없는 Human Task
* Retry Policy 없는 Critical External Task
* Idempotency 없는 System Task
* Tenant Scope 없는 Workflow Definition
* Environment Scope 없는 Production Workflow
* Version 없는 Workflow 실행
* Mutable Active Workflow Version
* Production Script Task
* Cross-Tenant Sub-workflow
* Version 미고정 Sub-workflow
* Secret Variable
* Masking 없는 Sensitive Variable
* Evidence Requirement 없는 Critical Manual Task
* Completion Policy 없는 Task
* Error Handling 없는 Critical Node
* State Mapping 없는 End Node
* 기존 Workflow Engine 중복 생성

---

# 66. 최소 Runtime Guard

다음을 차단하라.

* Workflow Definition Not Found
* Workflow Version Not Active
* Tenant Scope Mismatch
* Workspace Scope Mismatch
* Legal Entity Scope Mismatch
* Environment Scope Mismatch
* Approval Domain Mismatch
* Resource Type Mismatch
* Invalid Start Trigger
* Invalid Node Transition
* Inactive Workflow Instance
* Paused Workflow Execution
* Cancelled Workflow Execution
* Superseded Workflow Execution
* Duplicate Instance Start
* Duplicate Task Creation
* Duplicate Task Completion
* Duplicate Transition
* Invalid Task Claim
* Task Claim Expired
* Actor Authorization Invalid
* Resource Version Drift
* Policy Version Drift
* Missing Approval Requirement
* Missing Required Evidence
* Optimistic Lock Conflict
* Distributed Lock Lost
* Retry Limit Exceeded
* Non-retryable Error
* Invalid Callback Authentication
* Callback Tenant Mismatch
* Event Correlation Failed
* Workflow Migration Invalid
* Replay Side-effect Risk
* Mandatory Requirement Pending
* Critical Reconciliation Drift
* Kill Switch 활성

---

# 67. Error Contract

* APPROVAL_WORKFLOW_DEFINITION_NOT_FOUND
* APPROVAL_WORKFLOW_VERSION_NOT_FOUND
* APPROVAL_WORKFLOW_VERSION_INACTIVE
* APPROVAL_WORKFLOW_VERSION_IMMUTABLE
* APPROVAL_WORKFLOW_GRAPH_INVALID
* APPROVAL_WORKFLOW_START_NODE_INVALID
* APPROVAL_WORKFLOW_END_NODE_INVALID
* APPROVAL_WORKFLOW_NODE_NOT_FOUND
* APPROVAL_WORKFLOW_EDGE_NOT_FOUND
* APPROVAL_WORKFLOW_TRANSITION_INVALID
* APPROVAL_WORKFLOW_GATEWAY_NO_MATCH
* APPROVAL_WORKFLOW_GATEWAY_CONFLICT
* APPROVAL_WORKFLOW_TENANT_MISMATCH
* APPROVAL_WORKFLOW_WORKSPACE_MISMATCH
* APPROVAL_WORKFLOW_LEGAL_ENTITY_MISMATCH
* APPROVAL_WORKFLOW_ENVIRONMENT_MISMATCH
* APPROVAL_WORKFLOW_DOMAIN_MISMATCH
* APPROVAL_WORKFLOW_INSTANCE_NOT_FOUND
* APPROVAL_WORKFLOW_INSTANCE_INACTIVE
* APPROVAL_WORKFLOW_INSTANCE_PAUSED
* APPROVAL_WORKFLOW_INSTANCE_CANCELLED
* APPROVAL_WORKFLOW_INSTANCE_SUPERSEDED
* APPROVAL_WORKFLOW_INSTANCE_DUPLICATE
* APPROVAL_WORKFLOW_TASK_NOT_FOUND
* APPROVAL_WORKFLOW_TASK_ALREADY_COMPLETED
* APPROVAL_WORKFLOW_TASK_CLAIM_INVALID
* APPROVAL_WORKFLOW_TASK_CLAIM_EXPIRED
* APPROVAL_WORKFLOW_TASK_ACTOR_UNAUTHORIZED
* APPROVAL_WORKFLOW_TASK_EVIDENCE_REQUIRED
* APPROVAL_WORKFLOW_TASK_RETRY_EXCEEDED
* APPROVAL_WORKFLOW_TRANSITION_DUPLICATE
* APPROVAL_WORKFLOW_EVENT_DUPLICATE
* APPROVAL_WORKFLOW_EVENT_CORRELATION_FAILED
* APPROVAL_WORKFLOW_CALLBACK_UNAUTHORIZED
* APPROVAL_WORKFLOW_CALLBACK_TENANT_MISMATCH
* APPROVAL_WORKFLOW_RESOURCE_VERSION_CHANGED
* APPROVAL_WORKFLOW_POLICY_VERSION_CHANGED
* APPROVAL_WORKFLOW_LOCK_CONFLICT
* APPROVAL_WORKFLOW_LOCK_LOST
* APPROVAL_WORKFLOW_MIGRATION_INVALID
* APPROVAL_WORKFLOW_REPLAY_BLOCKED
* APPROVAL_WORKFLOW_MANDATORY_REQUIREMENT_PENDING
* APPROVAL_WORKFLOW_RECONCILIATION_FAILED
* APPROVAL_WORKFLOW_RUNTIME_BLOCKED

---

# 68. Warning Contract

* APPROVAL_WORKFLOW_VERSION_WARNING
* APPROVAL_WORKFLOW_GRAPH_WARNING
* APPROVAL_WORKFLOW_LOOP_WARNING
* APPROVAL_WORKFLOW_GATEWAY_WARNING
* APPROVAL_WORKFLOW_ASSIGNMENT_WARNING
* APPROVAL_WORKFLOW_TASK_WARNING
* APPROVAL_WORKFLOW_RETRY_WARNING
* APPROVAL_WORKFLOW_TIMEOUT_WARNING
* APPROVAL_WORKFLOW_TIMER_WARNING
* APPROVAL_WORKFLOW_EVENT_WARNING
* APPROVAL_WORKFLOW_CALLBACK_WARNING
* APPROVAL_WORKFLOW_SUB_WORKFLOW_WARNING
* APPROVAL_WORKFLOW_PAUSE_WARNING
* APPROVAL_WORKFLOW_CANCELLATION_WARNING
* APPROVAL_WORKFLOW_COMPENSATION_WARNING
* APPROVAL_WORKFLOW_MIGRATION_WARNING
* APPROVAL_WORKFLOW_REPLAY_WARNING
* APPROVAL_WORKFLOW_RECONCILIATION_WARNING
* APPROVAL_WORKFLOW_MANUAL_REVIEW_REQUIRED

---

# 69. Evidence Contract

`APPROVAL_WORKFLOW_EVIDENCE`

필수 필드:

* evidence_id
* workflow definition
* workflow version
* workflow instance
* workflow execution
* workflow token
* workflow node
* workflow edge
* workflow transition
* workflow task
* task assignment
* task claim
* task attempt
* task result
* approval request
* approval case
* approval item
* approval requirement
* approval decision
* tenant
* workspace
* legal entity
* environment
* actor or worker
* authorization decision reference
* resource version
* policy version
* event reference
* timer reference
* retry reference
* failure reference
* migration reference
* replay reference
* effective at
* recorded at
* result hash
* lineage
* audit reference

다음을 저장하지 마라.

* Password
* Access Token
* Credential Secret
* Bank Account 원문
* 불필요한 PII
* 외부 Callback Secret
* 민감 Payload 전체
* Script 실행 코드 원문
* 보안 정책 내부 전체

---

# 70. Audit Event

`APPROVAL_WORKFLOW_AUDIT_EVENT`

지원 Event:

* WORKFLOW_CATALOG_CREATED
* WORKFLOW_TEMPLATE_REGISTERED
* WORKFLOW_DEFINITION_CREATED
* WORKFLOW_DEFINITION_UPDATED
* WORKFLOW_VERSION_CREATED
* WORKFLOW_VERSION_VALIDATED
* WORKFLOW_VERSION_APPROVED
* WORKFLOW_VERSION_ACTIVATED
* WORKFLOW_VERSION_DEPRECATED
* WORKFLOW_INSTANCE_CREATED
* WORKFLOW_INSTANCE_STARTED
* WORKFLOW_NODE_ENTERED
* WORKFLOW_NODE_EXITED
* WORKFLOW_TASK_CREATED
* WORKFLOW_TASK_ASSIGNED
* WORKFLOW_TASK_CLAIMED
* WORKFLOW_TASK_RELEASED
* WORKFLOW_TASK_COMPLETED
* WORKFLOW_TASK_FAILED
* WORKFLOW_TRANSITION_EXECUTED
* WORKFLOW_GATEWAY_EVALUATED
* WORKFLOW_TIMER_SCHEDULED
* WORKFLOW_TIMER_FIRED
* WORKFLOW_SIGNAL_RECEIVED
* WORKFLOW_MESSAGE_CORRELATED
* WORKFLOW_CALLBACK_PROCESSED
* WORKFLOW_RETRY_SCHEDULED
* WORKFLOW_DEAD_LETTERED
* WORKFLOW_PAUSED
* WORKFLOW_RESUMED
* WORKFLOW_CANCELLED
* WORKFLOW_COMPENSATION_REQUESTED
* WORKFLOW_MIGRATION_STARTED
* WORKFLOW_MIGRATION_COMPLETED
* WORKFLOW_REPLAY_STARTED
* WORKFLOW_REPLAY_COMPLETED
* WORKFLOW_COMPLETED
* WORKFLOW_FAILED
* WORKFLOW_DRIFT_DETECTED
* MANUAL_REVIEW_REQUESTED

---

# 71. 기존 구현 분류

* `CANONICAL_APPROVAL_WORKFLOW_CATALOG`
* `CANONICAL_APPROVAL_WORKFLOW_TEMPLATE`
* `CANONICAL_APPROVAL_WORKFLOW_DEFINITION`
* `CANONICAL_APPROVAL_WORKFLOW_VERSION`
* `CANONICAL_APPROVAL_WORKFLOW_NODE`
* `CANONICAL_APPROVAL_WORKFLOW_EDGE`
* `CANONICAL_APPROVAL_WORKFLOW_INSTANCE`
* `CANONICAL_APPROVAL_WORKFLOW_TASK`
* `CANONICAL_APPROVAL_WORKFLOW_TRANSITION`
* `CANONICAL_APPROVAL_WORKFLOW_EVENT`
* `CANONICAL_APPROVAL_WORKFLOW_TIMER`
* `CANONICAL_APPROVAL_WORKFLOW_RETRY`
* `CANONICAL_APPROVAL_WORKFLOW_MIGRATION`
* `CANONICAL_APPROVAL_WORKFLOW_REPLAY`
* `CANONICAL_APPROVAL_WORKFLOW_RECONCILIATION`
* `VALIDATED_EXTERNAL_ENGINE`
* `EXTERNAL_ENGINE_ADAPTER`
* `VALIDATED_LEGACY`
* `LEGACY_ADAPTER`
* `MIGRATION_REQUIRED`
* `CONSOLIDATION_REQUIRED`
* `DEPRECATION_CANDIDATE`
* `KEEP_SEPARATE_WITH_REASON`
* `BLOCKED_CROSS_TENANT`
* `BLOCKED_WORKFLOW_BYPASS`
* `BLOCKED_DUPLICATE_EXECUTION`
* `BLOCKED_MIGRATION_RISK`
* `BLOCKED_REPLAY_RISK`
* `BLOCKED_SECURITY_RISK`
* `UNVERIFIED`
* `TEST_ONLY`

---

# 72. 중복 구현 감사

다음을 전수 탐지하라.

* 여러 Workflow Definition Store
* 여러 Workflow Version Store
* 여러 Workflow Instance Table
* 여러 Workflow Task Table
* 여러 Task Queue
* 여러 Human Task Inbox
* 여러 State Machine
* 여러 Timer Scheduler
* 여러 Retry Framework
* 여러 Callback Correlation Store
* 여러 Dead Letter Store
* 여러 Idempotency Store
* 여러 Workflow Lock 구현
* 여러 Workflow Audit Store
* Claim·Funding·Payout별 독립 Workflow Engine
* ERP·Provider·Admin UI별 독립 Workflow 상태
* API Handler 안의 하드코딩된 단계 전환
* Cron Job으로 직접 상태 변경
* Boolean `completed` 기반 Workflow
* Active Definition 직접 수정
* Workflow Task 없이 Approval Decision 생성
* Approval Decision 없이 Workflow Approval Task 완료
* Callback으로 Authorization 없이 직접 Transition
* External Engine과 Internal Engine의 이중 실행

---

# 73. 외부 Workflow Engine 통합 원칙

Temporal, Camunda, Flowable, Zeebe, Step Functions 또는 기타 엔진이 이미 존재하는 경우 다음을 적용하라.

* Canonical Workflow Definition ID 매핑
* Canonical Workflow Version 매핑
* External Deployment ID 매핑
* Canonical Instance ID 매핑
* External Instance ID 매핑
* Canonical Task ID 매핑
* External Task ID 매핑
* Canonical State Mapping
* Event Correlation
* Tenant Context
* Authorization Context
* Idempotency
* Audit Synchronization
* Retry State Mapping
* Cancellation Mapping
* Migration Mapping
* Reconciliation

외부 엔진이 존재한다는 이유로 Canonical Approval·Authorization·Evidence Contract를 생략하지 마라.

---

# 74. 실행 절차

## Step 1 — 기존 Workflow·BPM 전수 조사

Repository, Queue, Scheduler, BPMN, External Engine 및 운영 Worker를 확인한다.

## Step 2 — Canonical Workflow Catalog 구축

Platform·Tenant·Workspace·Domain Workflow를 분리한다.

## Step 3 — Workflow Template 구축

표준 Rebate·Funding·Claim·Settlement·Payout Template을 등록한다.

## Step 4 — Workflow Definition·Version 구축

Definition과 Immutable Version을 분리한다.

## Step 5 — Variable Definition 구축

Request·Case·Item·Task Variable과 민감도 정책을 구현한다.

## Step 6 — Node·Edge Graph 구축

Start, End, Task, Gateway, Timer, Wait 및 Sub-workflow를 표준화한다.

## Step 7 — Graph Validation 구축

Unreachable Node, Dead-end, Loop, Mandatory Node 우회 등을 차단한다.

## Step 8 — Task Definition 구축

Approval, Review, Human, Manual, System, Notification Task를 분리한다.

## Step 9 — Workflow Instance·Execution 구축

실제 Approval Case 실행 상태와 Worker 시도를 관리한다.

## Step 10 — Token·Transition 구축

실행 경로와 Branch를 Event 기반으로 기록한다.

## Step 11 — Task Assignment·Claim 구축

후보, Scope, Claim Token 및 동시성 제어를 구현한다.

## Step 12 — Task Attempt·Result 구축

Retry, Outcome, Decision Correlation을 관리한다.

## Step 13 — Wait·Signal·Message Correlation 구축

외부 Event와 Callback을 안전하게 처리한다.

## Step 14 — Retry·Failure·Dead Letter 구축

재시도, 비재시도 오류 및 운영 복구 경로를 구현한다.

## Step 15 — Pause·Resume·Cancellation 구축

중단·재개·취소 시 Active Task·Token을 통제한다.

## Step 16 — Compensation Hook 구축

삭제가 아닌 보상 작업 Reference를 준비한다.

## Step 17 — Idempotency·Concurrency 구축

Instance, Task, Transition 및 Callback 중복 실행을 방지한다.

## Step 18 — Workflow Migration 구축

실행 중 Instance의 안전한 Version Migration 기반을 구현한다.

## Step 19 — Replay 구축

Dead Letter·Event·Task Replay를 Side-effect 안전하게 처리한다.

## Step 20 — Workflow Candidate·Selection 구축

Request 특성에 따른 Workflow 후보와 선택 근거를 기록한다.

## Step 21 — Reconciliation 구축

Case, Instance, Task, Token, Timer, Callback, External Engine 상태를 비교한다.

## Step 22 — 최소 Static Lint·Runtime Guard 구축

잘못된 Graph, 중복 Transition, 잘못된 Claim 및 Workflow 우회를 차단한다.

## Step 23 — 기존 구현 분류·통합 계획 작성

중복 Engine·Queue·State Machine을 정리한다.

## Step 24 — ADR·PM 이력 갱신

모든 Workflow 결정·실패·Migration·Replay 위험을 기록한다.

---

# 75. 생성 또는 갱신할 문서

기존 동일 목적 문서가 있으면 통합하라.

* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_CATALOG.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_TEMPLATE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_TEMPLATE_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_DEFINITION.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_VERSION.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_VERSION_STATUS.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_DEFINITION_FORMAT.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_VARIABLE_DEFINITION.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_VARIABLE_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_NODE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_NODE_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_START_NODE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_END_NODE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_EDGE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_EDGE_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_GRAPH_VALIDATION.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_NODE_CONFIGURATION.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_GATEWAY.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_GATEWAY_EVALUATION_MODE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_CONDITION_REFERENCE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_EVENT_DEFINITION.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_EVENT_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_TIMER_DEFINITION.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_TIMER_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_TASK_DEFINITION.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_TASK_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_APPROVAL_TASK.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_REVIEW_TASK.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_HUMAN_TASK.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_MANUAL_TASK.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_SYSTEM_SERVICE_TASK.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_SCRIPT_TASK_RESTRICTION.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_NOTIFICATION_TASK.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_SUB_WORKFLOW.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_INSTANCE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_INSTANCE_STATUS.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_EXECUTION.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_EXECUTION_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_TOKEN.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_TOKEN_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_TRANSITION.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_TRANSITION_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_VARIABLE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_TASK.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_TASK_STATUS.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_TASK_ASSIGNMENT.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_TASK_ASSIGNMENT_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_TASK_CLAIM.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_TASK_RELEASE_REASSIGNMENT.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_TASK_ATTEMPT.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_TASK_RESULT.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_TASK_COMPLETION.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_WAIT_STATE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_SIGNAL.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_MESSAGE_CORRELATION.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_RETRY_POLICY.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_FAILURE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_DEAD_LETTER.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_PAUSE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_RESUME.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_CANCELLATION.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_COMPENSATION_REFERENCE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_IDEMPOTENCY.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_LOCK.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_OPTIMISTIC_CONCURRENCY.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_MIGRATION_PLAN.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_MIGRATION_EXECUTION.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_REPLAY.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_CANDIDATE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_SELECTION_PRIORITY.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_RECONCILIATION.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_RECONCILIATION_STATUS.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_STATE_MAPPING.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_CRITICAL_GAP_POLICY.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_STATIC_LINT.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_RUNTIME_GUARDS.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_ERROR_WARNING_CONTRACT.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_EVIDENCE.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_AUDIT_EVENT.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_EXTERNAL_ENGINE_ADAPTER.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_EXISTING_IMPLEMENTATION.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_DUPLICATE_IMPLEMENTATION_AUDIT.md`
* `docs/segmentation/DSAR_APPROVAL_WORKFLOW_FUNCTION_REGRESSION_GATE.md`
* `docs/architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md`
* `docs/pm/PM_CHANGE_HISTORY.md`
* `docs/pm/REPEAT_PROBLEM_HISTORY.md`
* `docs/pm/AGENT_EXECUTION_HISTORY.md`

---

# 76. Workflow Definition Matrix

| Workflow | Version | Domain | Tenant | Environment | Nodes | Edges | Start | Terminal | Status |
| -------- | ------- | ------ | ------ | ----------- | ----- | ----- | ----- | -------- | ------ |

---

# 77. Workflow Node Matrix

| Node | Type | Task | Requirement | Assignment | Timeout | Retry | Incoming | Outgoing | Status |
| ---- | ---- | ---- | ----------- | ---------- | ------- | ----- | -------- | -------- | ------ |

---

# 78. Workflow Instance Matrix

| Instance | Case | Version | Current Node | Active Tokens | Active Tasks | State | Started | Updated | Status |
| -------- | ---- | ------- | ------------ | ------------- | ------------ | ----- | ------- | ------- | ------ |

---

# 79. Workflow Task Matrix

| Task | Type | Case | Requirement | Candidate | Assigned | Claimed | Due | Result | Status |
| ---- | ---- | ---- | ----------- | --------- | -------- | ------- | --- | ------ | ------ |

---

# 80. Workflow Transition Matrix

| Instance | Token | Source | Edge | Target | Trigger | Condition | Actor | Time | Status |
| -------- | ----- | ------ | ---- | ------ | ------- | --------- | ----- | ---- | ------ |

---

# 81. Workflow Reconciliation Matrix

| Instance | Case State | Runtime State | Node | Tasks | Tokens | External State | Difference | Severity | Status |
| -------- | ---------- | ------------- | ---- | ----- | ------ | -------------- | ---------- | -------- | ------ |

---

# 82. 검증 게이트

완료 전에 반드시 확인하라.

* Workflow Catalog가 구축되었는가
* Standard Template과 Tenant Custom Workflow가 구분되는가
* Workflow Definition과 Version이 분리되는가
* Active Version이 Immutable한가
* Request·Case가 Workflow Instance와 연결되는가
* Start·End Node가 검증되는가
* Node·Edge Graph Validation이 작동하는가
* Unreachable·Dead-end Node가 차단되는가
* Mandatory Approval Task 우회가 차단되는가
* Approval·Review·Human·Manual·System Task가 구분되는가
* Human Task Assignment·Claim이 구현되는가
* Candidate Scope·Tenant·Legal Entity 검증이 적용되는가
* Approval Task 완료 시 Decision이 강제되는가
* Workflow Instance·Execution·Token·Transition이 분리되는가
* 모든 Transition이 Event로 기록되는가
* 중복 Task·Transition이 차단되는가
* Wait·Timer·Signal·Message Correlation이 구현되는가
* External Callback이 인증·Tenant 검증되는가
* Retry·Backoff·Failure·Dead Letter가 구현되는가
* Financial Task Retry가 Idempotency를 확인하는가
* Pause·Resume·Cancellation이 구현되는가
* Compensation Hook이 구축되는가
* Workflow Idempotency가 구현되는가
* Optimistic Concurrency·Distributed Lock이 적용되는가
* 실행 중 Workflow Migration 기반이 구축되는가
* Replay가 Side-effect 안전한가
* Workflow Candidate·Selection 근거가 기록되는가
* Workflow State와 Approval State가 Mapping되는가
* External Engine과 Canonical Contract가 Reconciliation되는가
* 최소 Static Lint·Runtime Guard가 작동하는가
* 기존 Workflow 기능의 회귀가 없는가
* 중복 Workflow Engine이 생성되지 않았는가
* ADR·PM·Repeat Problem·Agent History가 갱신되었는가
* 다음 Multi-Level Approval 단계가 실행 가능한가

---

# 83. 완료 보고 형식

다음 순서로 보고하라.

1. Workflow Catalog 수
2. Workflow Template 수
3. Workflow Definition 수
4. Standard Workflow 수
5. Tenant Custom Workflow 수
6. Workflow Version 수
7. Active Version 수
8. Deprecated Version 수
9. Workflow Variable Definition 수
10. Workflow Node 수
11. Start Node 수
12. End Node 수
13. Approval Task Node 수
14. Review Task Node 수
15. Human Task Node 수
16. Manual Task Node 수
17. System·Service Task Node 수
18. Gateway 수
19. Timer Node 수
20. Wait Node 수
21. Sub-workflow Node 수
22. Workflow Edge 수
23. Graph Validation Error 수
24. Unreachable Node 수
25. Dead-end Node 수
26. Loop Risk 수
27. Mandatory Node 우회 차단 수
28. Workflow Instance 수
29. Running Instance 수
30. Waiting Instance 수
31. Paused Instance 수
32. Failed Instance 수
33. Workflow Execution 수
34. Workflow Token 수
35. Workflow Transition 수
36. Duplicate Transition 차단 수
37. Workflow Task 수
38. Human Task 수
39. System Task 수
40. Task Assignment 수
41. Task Claim 수
42. Invalid Claim 차단 수
43. Task Attempt 수
44. Task Retry 수
45. Retry Exceeded 수
46. Dead Letter 수
47. Wait State 수
48. Signal 수
49. Message Correlation 수
50. Unmatched Message 수
51. Callback 인증 실패 수
52. Timer 수
53. Duplicate Timer Fire 차단 수
54. Pause 수
55. Resume 수
56. Cancellation 수
57. Compensation Reference 수
58. Idempotency Record 수
59. Duplicate Instance 차단 수
60. Distributed Lock Conflict 수
61. Workflow Migration Plan 수
62. Migration Execution 수
63. Migration Failure 수
64. Replay 수
65. Replay Side-effect 차단 수
66. Workflow Candidate 수
67. Workflow Selection Conflict 수
68. Workflow Reconciliation Mismatch 수
69. External Engine Adapter 수
70. Static Lint Rule 수
71. Runtime Guard 수
72. Existing Implementation 수
73. Duplicate Implementation 수
74. Migration Required 수
75. Manual Review 수
76. Function Regression 수
77. 생성·갱신한 문서
78. 남은 리스크
79. 다음 Multi-Level Approval & Hierarchical Approval Governance 준비 상태

---

# 84. 완료 조건

다음 조건을 모두 충족해야 이번 블록을 완료로 인정한다.

1. Approval Workflow Catalog가 구축되었다.
2. Workflow Template이 구축되었다.
3. Workflow Definition이 구축되었다.
4. Workflow Version이 구축되었다.
5. Workflow Variable Definition이 구축되었다.
6. Workflow Node가 구축되었다.
7. Workflow Edge가 구축되었다.
8. Start·End Node가 구축되었다.
9. Graph Validation이 구축되었다.
10. Node Configuration이 구축되었다.
11. Gateway가 구축되었다.
12. Condition Reference가 구축되었다.
13. Event Definition이 구축되었다.
14. Timer Definition이 구축되었다.
15. Task Definition이 구축되었다.
16. Approval Task가 구축되었다.
17. Review Task가 구축되었다.
18. Human Task가 구축되었다.
19. Manual Task가 구축되었다.
20. System·Service Task가 구축되었다.
21. Notification Task가 구축되었다.
22. Sub-workflow가 구축되었다.
23. Workflow Instance가 구축되었다.
24. Workflow Execution이 구축되었다.
25. Workflow Token이 구축되었다.
26. Workflow Transition이 구축되었다.
27. Workflow Variable이 구축되었다.
28. Workflow Task가 구축되었다.
29. Task Assignment이 구축되었다.
30. Task Claim·Release가 구축되었다.
31. Task Attempt·Result가 구축되었다.
32. Task Completion Guard가 구축되었다.
33. Wait State가 구축되었다.
34. Signal이 구축되었다.
35. Message Correlation이 구축되었다.
36. Retry Policy가 구축되었다.
37. Workflow Failure가 구축되었다.
38. Dead Letter가 구축되었다.
39. Pause·Resume가 구축되었다.
40. Workflow Cancellation이 구축되었다.
41. Compensation Reference가 구축되었다.
42. Workflow Idempotency가 구축되었다.
43. Workflow Lock·Concurrency가 구축되었다.
44. Workflow Migration Plan·Execution이 구축되었다.
45. Workflow Replay가 구축되었다.
46. Workflow Candidate·Selection이 구축되었다.
47. Workflow Reconciliation이 구축되었다.
48. Workflow·Approval State Mapping이 구축되었다.
49. 최소 Static Lint·Runtime Guard가 구축되었다.
50. 기존 Workflow 구현이 분류되었다.
51. External Workflow Engine Adapter 기준이 구축되었다.
52. 중복 Workflow 모델 통합 계획이 작성되었다.
53. 기존 정상 기능의 회귀가 없다.
54. ADR·PM Change History·Repeat Problem·Agent History가 갱신되었다.
55. 다음 Multi-Level Approval & Hierarchical Approval Governance에서 사용할 검증된 Workflow Execution Engine이 준비되었다.

---

# 85. 최종 실행 명령

지금 즉시 검증된 Canonical Approval Foundation 위에 Rebate Approval Workflow Definition & Flow Execution Engine Governance를 구축하라.

기존 Repository, Admin UI, API, Queue, Scheduler, Event Bus, Worker, ERP, Provider Connector 및 외부 Workflow Engine에서 사용 중인 Workflow Definition, BPMN, State Machine, Task, Timer, Retry, Callback, Migration, Replay 및 Audit 구현을 전수 조사하라.

Temporal, Camunda, Flowable, Zeebe, Step Functions 또는 동등 엔진이 이미 존재하면 별도의 중복 Engine을 만들지 말고 Canonical Approval Workflow Contract와 Adapter로 통합하라.

Workflow Definition, Workflow Version, Workflow Instance, Workflow Execution, Workflow Token, Workflow Transition 및 Workflow Task를 서로 다른 Entity로 관리하라.

활성 Workflow Definition을 직접 수정하지 말고 새 Version을 생성하라.

실행 중 Instance에는 시작 시 선택된 Workflow Version을 고정하라.

Workflow Version에 Node, Edge, Variable, Start Node, Terminal Node, Immutable Hash, Effective Period 및 Production Certification Reference를 기록하라.

Start, End, Approval Task, Review Task, Human Task, Manual Task, System Task, Service Task, Notification Task, Decision Gateway, Condition Gateway, Event Gateway, Timer, Wait, Signal, Message, Sub-workflow, Error Boundary 및 Timeout Boundary Node를 지원하라.

Active Workflow Version에 대해 Start Node, Terminal Node, Reachability, Dead-end, Orphan Edge, Loop, Gateway Default Path, Mandatory Node 우회, Assignment Hook, Retry Policy, Sensitive Variable 및 Sub-workflow Version을 검증하라.

Mandatory Approval Task를 우회하여 Approved End Node로 이동할 수 없게 하라.

Approval Task는 Approval Requirement, Actor Authorization, Resource Snapshot 및 Append-only Approval Decision을 요구하라.

Review Task 완료를 Approval Decision으로 잘못 처리하지 마라.

Human Task는 Candidate Subject, Role, Group, Tenant, Workspace, Legal Entity, Program 및 Environment Scope를 기반으로 배정하라.

Task Claim 시 Actor Role·Assignment·Scope를 재검증하고 Claim Token과 Lock Version을 발급하라.

다른 Tenant 사용자, 만료된 Assignment 사용자 또는 후보가 아닌 사용자의 Claim을 차단하라.

Task Completion에는 Active State, Valid Claim, Actor Authorization, Required Evidence, Required Form Field, Resource Version, Approval Decision, Idempotency Key 및 Lock Version을 검증하라.

Task Completion과 Workflow Transition을 Transactional Outbox 또는 동등한 신뢰성 패턴으로 연결하라.

System·Service Task에는 Worker Identity, Service Account Authorization, Tenant Context, Environment, Input Hash, Idempotency Key, Retry Policy, Timeout, Trace ID 및 Evidence를 적용하라.

Production에서 임의 Script 실행, Secret 접근, 직접 Database Write, Authorization 우회, Approval Status 직접 변경 및 무제한 외부 호출을 차단하라.

Workflow Instance에 Approval Request, Case, Workflow Definition, Workflow Version, Tenant, Workspace, Legal Entity, Environment, Current Node, Active Tokens, Active Tasks, State 및 Lock Version을 기록하라.

Workflow 실행 경로를 Token으로 관리하고 모든 Node 이동을 Append-only Transition Event로 기록하라.

동일 Token이 같은 Edge를 중복 통과하지 못하게 하라.

Queue, Event, Timer 및 Callback이 중복 전달될 수 있음을 전제로 Instance Start, Task Creation, Task Completion, Transition, Timer Fire, Signal, Message 및 Callback에 Idempotency를 적용하라.

Exactly-once Delivery를 가정하지 마라.

Financial System Task의 중복 효과는 Approval Execution Binding, Approval Consumption 및 외부 Idempotency 확인으로 차단하라.

Timer, Wait State, Signal, Message Correlation 및 External Callback을 지원하라.

External Callback에는 인증, Signature Reference, Tenant, Environment, Correlation Key, Payload Hash 및 Duplicate Protection을 적용하라.

Unmatched Callback이나 Message를 조용히 폐기하지 말고 Reconciliation 가능한 상태로 보존하라.

Retry Policy에는 Maximum Attempts, Backoff, Jitter, Retryable Error, Non-retryable Error, Timeout 및 Dead Letter 동작을 정의하라.

Financial Execution Task를 외부 실행 상태 확인 없이 자동 재시도하지 마라.

Workflow Failure를 Validation, Authorization, Assignment, Task Execution, Condition, External Service, Timeout, Concurrency, Idempotency, Event Delivery, Callback, Policy Version, Resource Version, Migration 및 Compensation 실패로 분류하라.

재시도 한도를 초과한 Execution은 Dead Letter로 이동하고 Manual Review, Replay, Retry After Fix, Cancellation 또는 Compensation 경로를 제공하라.

Workflow Pause 시 Active Task, Token, Timer 및 External Callback 처리 정책을 기록하라.

Resume 전 Resource Version, Policy Version, Role Assignment 및 Approval Requirement를 재검증하라.

Workflow Cancellation 시 Active Task, Active Token, Sub-workflow, External Task 및 Compensation 필요 여부를 처리하라.

이미 실행된 Financial Action을 Workflow 상태 삭제로 되돌리지 말고 별도 Compensation·Reversal 절차를 요구하라.

Workflow Instance, Token, Task, Claim, Transition, Migration 및 Cancellation에 Optimistic Lock 또는 Distributed Lock과 Fencing Token을 적용하라.

동시에 여러 Worker가 동일 Task 또는 Transition을 실행하지 못하게 하라.

Workflow Migration Plan에는 Source·Target Version, Eligible State, Node Mapping, Variable Mapping, Task Mapping, Token Mapping, Timer, Event Subscription, Active Decision, Rollback 및 Dry-run 결과를 기록하라.

Migration으로 완료된 Decision, Mandatory Approval Task, Tenant, Legal Entity 또는 Environment 경계를 우회하지 못하게 하라.

Workflow Replay는 기본적으로 Side-effect 방지 모드로 실행하라.

Financial Task Replay 전에 외부 실행 결과와 Idempotency 상태를 확인하라.

Approval Request의 Domain, Request Type, Resource, Tenant, Workspace, Legal Entity, Country, Environment, Amount, Currency 및 Risk를 기반으로 Workflow Candidate를 생성하라.

Explicit Workflow Binding, Tenant Workflow, Legal Entity Workflow, Workspace Workflow, Program Workflow, Country Workflow, Tenant Default 및 Platform Template 순서의 기본 선택 기반을 제공하라.

동일 우선순위에서 여러 Workflow가 충돌하면 임의 선택하지 말고 Manual Review 또는 Block으로 처리하라.

Workflow Instance State, Approval Case State 및 Approval Request State를 명시적인 Versioned Mapping으로 관리하라.

Workflow가 Approved End에 도달했더라도 Mandatory Approval Requirement가 남아 있으면 완료를 차단하라.

Workflow 완료 전에 Approval Execution Binding이나 Financial Execution을 허용하지 마라.

Approval Case, Workflow Instance, Workflow Version, Current Node, Active Task, Token, Claim, Decision, Transition, Timer, Wait Subscription, Callback, Retry, Dead Letter, Pause, Cancellation, External Engine, Migration, Replay 및 Audit 상태를 Reconciliation하라.

Start Node 없는 Workflow, Unreachable Node, Mandatory Task 우회, 다른 Tenant Task Claim, Duplicate Completion, Duplicate Transition, 무제한 Financial Retry, 인증되지 않은 Callback, Migration 우회, Replay 중복 실행, Cancelled Workflow의 Active Task 및 Secret Variable을 Critical Gap으로 생성하라.

그래프 오류, Version 누락, Mutable Active Version, Assignment Hook 없는 Human Task, Idempotency 없는 System Task, Production Script Task, Cross-Tenant Sub-workflow, Sensitive Variable Masking 누락, Error Handling 없는 Critical Node 및 State Mapping 없는 End Node를 Static Lint에서 차단하라.

Inactive·Paused·Cancelled·Superseded Instance 실행, Invalid Transition, Duplicate Instance·Task·Transition, Invalid Claim, Actor Authorization 오류, Resource·Policy Version Drift, Lock Conflict, Retry 초과, Callback 인증 실패, Migration 오류, Replay Side-effect 위험 및 Mandatory Requirement 미충족을 Runtime Guard로 차단하라.

기존 Approval, BPMN, Queue, Scheduler, Worker, ERP, Provider 및 External Workflow Engine 기능과 Legacy Equivalence를 수행하라.

기존 정상 Workflow를 유지하면서 하드코딩된 상태 전환, 중복 Engine, 직접 Status Update, 승인 없는 우회 실행, Callback 중복 처리 및 Worker 동시 실행 문제를 제거하라.

모든 Workflow Definition, Version, Node, Edge, Instance, Execution, Token, Transition, Task, Claim, Attempt, Result, Wait, Signal, Message, Retry, Failure, Dead Letter, Pause, Resume, Cancellation, Compensation, Idempotency, Lock, Migration, Replay, Reconciliation, 중복 구현 및 남은 위험을 ADR, PM Change History, Repeat Problem History 및 Agent Execution History에 기록하라.

다음 단계인 **EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-3 — Rebate Multi-Level Approval & Hierarchical Approval Governance**를 구현할 수 있는 검증된 Approval Workflow Execution Engine을 완성하라.
