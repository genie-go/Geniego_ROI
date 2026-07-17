# 스펙 원문 영속 (Verbatim) — EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-3-2

> **Rebate Reporting Line, Manager Relationship & Supervisory Hierarchy Governance** · Version 1.0
> 289차(2026-07-17) 수령 · **원문 무손실 전재**. 이 파일은 이 블록의 **유일한 요구 분모(정본)** 다.

## 🔴 이 파일이 먼저 작성된 이유 — 5-3-1 에서 배운 것

5-3-1 에서 나는 "수령 즉시 분모 영속"을 **했다고 판단**했으나 **개수만** 적었다(`§6 Domain Type = 31`).
항목명은 저장소에 없었고 **스펙 원문은 채팅에만** 있었다 → 산출 에이전트 **5개가 독립적으로 정지**했다
("전사할 원문이 없다 · 지어내면 역산"). **그 지적이 옳았다.**

★**개수는 분모가 아니다.** "31종"은 **무엇이** 31종인지 모르면 검증도 반증도 불가능하다.
★**그리고 개수마저 틀린다** — 5-3-1 에서 필드 축 **19건이 정확히 1씩 부족**했고 원인은 전부
**목록 끝의 `evidence` 누락**(일관된 편향). 5-3-3-1 에서는 **PM 브리핑 분모가 3건 과소**했다
(§28 15→16 · §43 13→14 · §32 15→17 — **전부 같은 편향**).
★**개수가 맞아도 항목명이 날조일 수 있다**(`REQUIREMENT_TYPE` 20/20 인데 축 자체가 상이).

∴ **분모 검증은 개수가 아니라 항목명 원문 대조여야 한다. 그래서 원문을 먼저 박는다.**

---

# 0. 작업 목적

앞 단계에서 구축한 **Organization Hierarchy & Organizational Graph Foundation** 위에, 특정 Subject·Position·Organization Unit의 관리자 관계와 감독 계층을 일관되게 표현하고 특정 시점에 유효한 Reporting Line을 안전하게 해석하는 **Rebate Reporting Line, Manager Relationship & Supervisory Hierarchy Governance**를 구축하라.

이번 단계에서는 다음을 완성한다.

* Reporting Line Registry
* Supervisory Hierarchy
* Manager Relationship
* Direct Manager
* Administrative Manager
* Functional Manager
* Dotted-line Manager
* Project Manager
* Program Manager
* Regional Manager
* Country Manager
* Brand Manager
* Cost Center Manager
* Profit Center Manager
* Acting Manager
* Temporary Manager
* Interim Manager
* Co-manager
* Skip-level Manager Reference
* Manager-of-manager Relationship
* Position-based Manager
* Subject-based Manager
* Organization-based Manager
* Manager Assignment
* Manager Eligibility
* Manager Effective Dating
* Reporting Line Version
* Supervisory Path
* Manager Candidate
* Manager Resolution Input
* Manager Relationship Snapshot
* Manager Vacancy
* Missing Manager Handling
* Manager Conflict
* Circular Reporting Detection
* Self-reporting Detection
* Cross-Tenant Manager Guard
* Cross-Legal-Entity Manager Guard
* Historical Manager Reconstruction
* Reporting Line Reconciliation
* Static Lint
* Runtime Guard
* Evidence
* Audit

이번 단계는 최종 Approval Chain, Approval Level, Monetary Authority, Sequential Approval, Executive Escalation 또는 Committee Voting을 완성하는 단계가 아니다.

후속 **Approval Chain Definition & Hierarchical Route Foundation**이 신뢰할 수 있는 Reporting Line과 Manager Relationship을 사용하도록 기반을 완성한다.

다음 질문에 정확하게 답할 수 있어야 한다.

* 특정 Subject의 Direct Manager는 누구인가
* 특정 날짜 기준 Direct Manager는 누구였는가
* Subject 기반 Manager와 Position 기반 Manager 중 무엇이 우선하는가
* Administrative Manager와 Functional Manager는 어떻게 구분되는가
* Dotted-line Manager는 승인 경로에 포함되는가
* Temporary Manager와 Acting Manager는 언제 적용되는가
* 원래 Manager가 휴직·부재·공석인 경우 누구를 사용하는가
* 동일 Subject에게 여러 Direct Manager가 등록되어 있는가
* Matrix Organization에서 어떤 Manager 관계가 Primary인가
* 특정 Approval Domain에서 어떤 Manager Type을 사용해야 하는가
* Employee의 Primary Membership과 Manager Organization이 일치하는가
* Manager가 다른 Tenant에 속해 있는가
* Manager가 다른 Legal Entity에 속해 있는가
* Cross-Legal-Entity Manager 관계가 허용되는가
* Manager가 자기 자신으로 등록되어 있는가
* A가 B의 Manager이고 B가 A의 Manager인 순환 관계가 있는가
* Manager Chain이 Root Executive까지 도달하는가
* Manager Chain이 중간에서 끊기는가
* 현재 Manager가 과거 승인 당시에도 Manager였는가
* HRIS·IdP·ERP·Canonical Reporting Line이 일치하는가
* Organization Transfer 후 Manager Relationship이 갱신되었는가
* Position Vacancy 상태에서 Manager Resolution이 가능한가
* 관리자 권한이 있다고 해서 승인 권한도 자동으로 있는가
* Manager Candidate가 Approval Actor로 적격한가
* Manager Relationship 변경이 진행 중 Approval Task에 영향을 주는가
* 과거 Reporting Line을 현재 조직도로 재해석하지 않는가

---

# 1. 구현 범위

이번 블록에서는 다음을 구현한다.

1. Reporting Line Registry
2. Reporting Line Definition
3. Reporting Line Version
4. Supervisory Hierarchy
5. Manager Relationship Type
6. Subject-to-Subject Manager Relationship
7. Position-to-Position Manager Relationship
8. Organization-to-Position Manager Relationship
9. Organization-to-Subject Manager Relationship
10. Direct Manager
11. Administrative Manager
12. Functional Manager
13. Dotted-line Manager
14. Project Manager
15. Program Manager
16. Regional Manager
17. Country Manager
18. Brand Manager
19. Cost Center Manager
20. Profit Center Manager
21. Acting Manager
22. Temporary Manager
23. Interim Manager
24. Co-manager
25. Manager Assignment
26. Manager Eligibility Foundation
27. Manager Effective Period
28. Manager Vacancy
29. Missing Manager Policy
30. Manager Conflict
31. Supervisory Path
32. Manager Chain Foundation
33. Manager Candidate
34. Manager Relationship Snapshot
35. Circular Reporting Detection
36. Self-reporting Detection
37. Cross-Tenant Guard
38. Cross-Legal-Entity Guard
39. Historical Reconstruction
40. Reporting Line Reconciliation
41. 기본 Static Lint
42. 기본 Runtime Guard
43. Evidence·Audit
44. 기존 구현 분류
45. 중복 구현 감사
46. ADR·PM·Repeat Problem·Agent History

이번 블록에서는 다음을 상세 구현하지 않는다.

* 최종 Approval Chain 생성
* Approval Stage·Level 실행
* Monetary Authority Matrix
* 실제 Sequential Approval Activation
* Committee·Quorum
* Delegation·Substitute 전체 기능
* SLA·Escalation
* Risk-Based Approval
* Emergency Approval
* 전체 Production Certification

---

# 2. 실행 역할

너는 다음 역할을 동시에 수행한다.

* Enterprise Reporting Line Architect
* Supervisory Hierarchy Architect
* Manager Relationship Domain 책임자
* Direct Manager Resolution 기반 책임자
* Administrative Manager 책임자
* Functional Manager 책임자
* Dotted-line Manager 책임자
* Project·Program Manager 책임자
* Regional·Country Manager 책임자
* Brand·Cost Center·Profit Center Manager 책임자
* Acting·Temporary·Interim Manager 책임자
* Position-based Reporting 책임자
* Subject-based Reporting 책임자
* Matrix Reporting 책임자
* Manager Effective Dating 책임자
* Historical Manager Reconstruction 책임자
* Reporting Line Snapshot 책임자
* Manager Conflict Detection 책임자
* Circular Reporting Detection 책임자
* Cross-Tenant Isolation 책임자
* Cross-Legal-Entity Relationship 책임자
* HRIS·IdP·SCIM·ERP Reporting Adapter 책임자
* Reporting Line Reconciliation 책임자
* Evidence·Audit·Lineage 책임자
* 기존 Manager 구현의 비파괴적 통합 책임자
* ADR·PM History 관리 책임자

---

# 3. 선행조건

작업 전 다음 구현을 확인하라.

## 3.1 Organization Foundation

* `ORGANIZATION_REGISTRY`
* `ORGANIZATION_UNIT`
* `ORGANIZATION_UNIT_VERSION`
* `ORGANIZATION_TYPE`
* `ORGANIZATION_RELATIONSHIP_TYPE`
* `ORGANIZATION_HIERARCHY`
* `ORGANIZATION_HIERARCHY_VERSION`
* `ORGANIZATION_GRAPH_NODE`
* `ORGANIZATION_GRAPH_EDGE`
* `ORGANIZATION_GRAPH_PATH`
* `ORGANIZATION_HIERARCHY_LEVEL`
* `ORGANIZATION_POSITION_UNIT`
* `ORGANIZATION_MATRIX_RELATIONSHIP`
* `ORGANIZATION_OWNER`
* `ORGANIZATION_MEMBERSHIP`
* `ORGANIZATION_SCOPE_BINDING`
* `ORGANIZATION_SNAPSHOT`
* `ORGANIZATION_HIERARCHY_CANDIDATE`

## 3.2 Identity·Employment 기반

* Canonical Identity
* Subject Registry
* Employee Registry
* Contractor Registry
* Employment Record
* Position Registry
* Position Incumbency
* Job Profile
* Job Level
* Executive Level
* Employment Legal Entity
* Employment Status
* Leave Status
* Termination Status
* Work Location
* Country
* Region
* Timezone

## 3.3 Authorization·Approval 기반

* Authorization Role
* Role Assignment
* Scope Binding
* Approval Request
* Approval Case
* Approval Requirement
* Approval Participant
* Approval Actor
* Approval Workflow Task
* Workflow Assignment Hook
* Organization Snapshot
* Actor Authorization Snapshot

## 3.4 외부 Source 전수 조사

다음을 조사하라.

* HRIS Manager Field
* HRIS Supervisory Organization
* HRIS Position Hierarchy
* HRIS Employee Reporting Line
* ERP Personnel Hierarchy
* ERP Cost Center Manager
* ERP Profit Center Manager
* IdP Manager Attribute
* SCIM Enterprise User Manager
* Directory Manager Attribute
* CRM Account Owner
* Project Management Project Manager
* Program Management Program Owner
* Regional Directory
* Country Directory
* Brand Manager Registry
* Existing Org Chart Manager
* Existing Team Lead
* Existing Department Head
* Existing Division Head
* Existing Business Unit Head
* Existing Legal Entity Officer
* Existing Approver Table
* Existing Supervisor Field
* Existing `manager_id`
* Existing `reports_to`
* Existing `supervisor_id`
* Existing `team_lead_id`
* Existing `department_head_id`
* Existing Acting Manager
* Existing Temporary Manager
* Existing Proxy Manager
* Existing Vacancy Handling
* Existing Reporting Line History
* Existing Effective Date
* Existing Manager Snapshot
* Existing Circular Detection
* Existing Approval Manager Resolver
* Git 이력
* Migration 이력
* 운영 로그
* 테스트 결과

동일 목적 구현이 존재하면 별도 Manager Table을 무조건 추가하지 말고 Canonical Reporting Line Domain으로 통합하라.

---

# 4. 핵심 원칙

## 4.1 Manager와 Approver를 동일시하지 않는다

Manager는 조직적 감독 관계를 나타낸다.

Approver는 특정 Approval Requirement를 충족할 권한과 적격성을 가진 Actor다.

Manager라고 해서 자동으로 모든 승인 권한을 갖지 않는다.

---

## 4.2 Subject 기반 관계와 Position 기반 관계를 분리한다

* Subject-based relationship: 특정 사람에게 직접 연결
* Position-based relationship: Position 구조를 통해 연결
* Organization-based relationship: 조직 책임자나 관리 Position을 통해 연결

Position 기반 관계를 우선 사용하면 인사 이동 시 유지 관리가 쉬울 수 있으나, 기존 Source of Truth에 맞게 명시적 우선순위를 설정하라.

---

## 4.3 Manager Type을 구분한다

Direct, Administrative, Functional, Project, Regional 및 Financial Manager를 하나의 `manager_id` 필드로 압축하지 마라.

---

## 4.4 Reporting Line은 Effective-dated다

현재 Manager만 저장하지 말고 특정 날짜에 유효한 관계를 재현할 수 있어야 한다.

---

## 4.5 Acting·Temporary Manager는 원래 Manager를 삭제하지 않는다

원래 관계는 유지하고 대행 관계를 별도 Assignment와 Effective Period로 기록한다.

---

## 4.6 Multiple Manager를 허용하되 의미를 명확히 한다

Matrix Organization에서는 여러 Manager가 존재할 수 있다.

각 관계의 Type, Priority, Responsibility Scope 및 Approval Routing Eligibility를 명시한다.

---

## 4.7 Self-reporting과 Circular Reporting을 금지한다

Subject가 자기 자신의 Manager가 되거나 Manager Chain이 순환하지 못하게 하라.

---

## 4.8 Cross-Tenant Manager를 기본 금지한다

다른 Tenant Subject를 일반 Manager로 지정하지 마라.

Shared Service 또는 Managed Service가 필요한 경우 명시적 제한 관계와 Authorization Policy를 적용한다.

---

## 4.9 Cross-Legal-Entity Manager는 명시적으로 통제한다

다른 Legal Entity의 Manager 관계는 Shared Service, Group Function, Regional Leadership 또는 Intercompany Management로 명시한다.

---

## 4.10 과거 승인 당시 Manager를 현재 관계로 대체하지 않는다

Approval Task Assignment·Claim·Decision 시점의 Reporting Line Snapshot을 보존한다.

---

# 5. Canonical Entity

기존 동등 Entity가 없을 경우 최소 다음을 구축하라.

* `REPORTING_LINE_REGISTRY`
* `REPORTING_LINE_DEFINITION`
* `REPORTING_LINE_VERSION`
* `SUPERVISORY_HIERARCHY`
* `SUPERVISORY_HIERARCHY_VERSION`
* `MANAGER_RELATIONSHIP_TYPE`
* `MANAGER_RELATIONSHIP`
* `MANAGER_RELATIONSHIP_VERSION`
* `SUBJECT_MANAGER_BINDING`
* `POSITION_MANAGER_BINDING`
* `ORGANIZATION_MANAGER_BINDING`
* `MANAGER_ASSIGNMENT`
* `MANAGER_ASSIGNMENT_SCOPE`
* `MANAGER_ASSIGNMENT_PRIORITY`
* `MANAGER_ELIGIBILITY_PROFILE`
* `MANAGER_EFFECTIVE_PERIOD`
* `MANAGER_AVAILABILITY_REFERENCE`
* `MANAGER_VACANCY`
* `MISSING_MANAGER_POLICY`
* `MANAGER_CONFLICT`
* `SUPERVISORY_GRAPH_NODE`
* `SUPERVISORY_GRAPH_EDGE`
* `SUPERVISORY_PATH`
* `MANAGER_CHAIN_REFERENCE`
* `MANAGER_CANDIDATE`
* `MANAGER_RELATIONSHIP_SNAPSHOT`
* `REPORTING_LINE_VALIDATION`
* `REPORTING_LINE_RECONCILIATION`
* `REPORTING_LINE_EVIDENCE`
* `REPORTING_LINE_AUDIT_EVENT`

Rebate 전용 `rebate_manager` 테이블을 별도로 복제하지 마라.

공통 Reporting Line Domain을 Approval Domain에서 참조하도록 구현하라.

---

# 6. Reporting Line Registry

`REPORTING_LINE_REGISTRY`

필수 필드:

* reporting_line_registry_id
* tenant_id
* registry_code
* registry_name
* registry_type
* authoritative_source
* source priority
* supported manager types
* position based support
* subject based support
* organization based support
* matrix support
* acting manager support
* historical support
* effective dating support
* synchronization mode
* owner
* active version
* valid_from
* valid_to
* status
* evidence

Registry Type:

* PLATFORM
* TENANT
* HRIS
* ERP
* DIRECTORY
* PROJECT
* FINANCE
* REGIONAL
* BRAND
* CUSTOM

---

# 7. Reporting Line Definition

`REPORTING_LINE_DEFINITION`

필수 필드:

* reporting_line_definition_id
* reporting_line_registry_id
* tenant_id
* definition_code
* definition_name
* reporting line type
* subject type
* organization scope
* legal entity scope
* country scope
* environment scope
* supported manager relationship types
* primary manager policy
* multiple manager policy
* cross legal entity policy
* cross tenant policy
* vacancy policy
* missing manager policy
* historical resolution policy
* owner
* active version
* valid_from
* valid_to
* status
* evidence

Reporting Line Type:

* EMPLOYMENT
* ADMINISTRATIVE
* FUNCTIONAL
* POSITION
* PROJECT
* PROGRAM
* REGIONAL
* COUNTRY
* BRAND
* COST_CENTER
* PROFIT_CENTER
* SHARED_SERVICE
* MATRIX
* APPROVAL_REFERENCE
* CUSTOM

---

# 8. Reporting Line Version

`REPORTING_LINE_VERSION`

필수 필드:

* reporting_line_version_id
* reporting_line_definition_id
* version_number
* previous_version_id
* relationship count
* active subject count
* active position count
* active organization count
* structural changes
* source version
* affected subjects
* affected positions
* affected organizations
* affected approval workflows
* affected active tasks
* effective_from
* effective_to
* recorded_at
* recorded_by
* reviewed_by
* approved_by reference
* immutable_hash
* status
* evidence

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
* SUPERSEDED
* SUSPENDED
* RETIRED
* ARCHIVED
* BLOCKED

Active Version을 직접 수정하지 마라.

---

# 9. Supervisory Hierarchy

`SUPERVISORY_HIERARCHY`

필수 필드:

* supervisory_hierarchy_id
* reporting_line_definition_id
* tenant_id
* hierarchy_code
* hierarchy_name
* hierarchy type
* root subject or position reference
* root organization reference
* legal entity scope
* workspace scope
* country scope
* environment scope
* position based 여부
* subject based 여부
* matrix enabled 여부
* multiple roots allowed 여부
* maximum depth
* owner
* active version
* valid_from
* valid_to
* status
* evidence

Hierarchy Type:

* ENTERPRISE_SUPERVISORY
* LEGAL_ENTITY_SUPERVISORY
* BUSINESS_UNIT_SUPERVISORY
* FUNCTIONAL_SUPERVISORY
* REGIONAL_SUPERVISORY
* COUNTRY_SUPERVISORY
* PROJECT_SUPERVISORY
* PROGRAM_SUPERVISORY
* BRAND_SUPERVISORY
* COST_CENTER_SUPERVISORY
* PROFIT_CENTER_SUPERVISORY
* MATRIX_SUPERVISORY
* CUSTOM

---

# 10. Supervisory Hierarchy Version

`SUPERVISORY_HIERARCHY_VERSION`

필수 필드:

* supervisory_hierarchy_version_id
* supervisory_hierarchy_id
* version_number
* previous_version_id
* root references
* node count
* edge count
* maximum depth
* affected employees
* affected contractors
* affected positions
* affected tasks
* affected approval cases
* source version
* effective_from
* effective_to
* immutable_hash
* status
* evidence

---

# 11. Manager Relationship Type

`MANAGER_RELATIONSHIP_TYPE`

지원 Type:

* DIRECT_MANAGER
* ADMINISTRATIVE_MANAGER
* FUNCTIONAL_MANAGER
* DOTTED_LINE_MANAGER
* PROJECT_MANAGER
* PROGRAM_MANAGER
* PRODUCT_MANAGER
* REGIONAL_MANAGER
* COUNTRY_MANAGER
* BRAND_MANAGER
* STORE_MANAGER
* MERCHANT_MANAGER
* VENDOR_MANAGER
* PARTNER_MANAGER
* COST_CENTER_MANAGER
* PROFIT_CENTER_MANAGER
* BUDGET_MANAGER
* RESOURCE_MANAGER
* POSITION_SUPERVISOR
* EXECUTIVE_SPONSOR
* ACTING_MANAGER
* TEMPORARY_MANAGER
* INTERIM_MANAGER
* CO_MANAGER
* SHARED_SERVICE_MANAGER
* MATRIX_MANAGER
* CUSTOM

필수 필드:

* manager_relationship_type_id
* relationship code
* relationship name
* relationship category
* primary eligible 여부
* multiple allowed 여부
* transitive 여부
* approval routing eligible 여부
* manager chain eligible 여부
* skip level eligible 여부
* cross legal entity allowed 여부
* cross tenant allowed 여부
* acting replacement eligible 여부
* temporary assignment eligible 여부
* maximum active relationship count
* priority
* status
* evidence

---

# 12. Manager Relationship Category

지원 Category:

* EMPLOYMENT
* ADMINISTRATIVE
* FUNCTIONAL
* MATRIX
* PROJECT
* PROGRAM
* REGIONAL
* FINANCIAL
* BRAND
* RESOURCE
* TEMPORARY
* ACTING
* EXECUTIVE
* EXTERNAL
* CUSTOM

---

# 13. Manager Relationship

`MANAGER_RELATIONSHIP`

필수 필드:

* manager_relationship_id
* reporting_line_version_id
* supervisory_hierarchy_version_id
* tenant_id
* relationship_type_id
* subordinate subject reference
* subordinate position reference
* subordinate organization reference
* manager subject reference
* manager position reference
* manager organization reference
* relationship basis
* primary 여부
* hierarchy forming 여부
* manager chain eligible 여부
* approval routing eligible 여부
* responsibility scope
* organization scope
* legal entity scope
* workspace scope
* region scope
* country scope
* program scope
* cost center scope
* profit center scope
* source system
* source relationship id
* valid_from
* valid_to
* status
* evidence

Relationship Basis:

* SUBJECT_TO_SUBJECT
* POSITION_TO_POSITION
* SUBJECT_TO_POSITION
* POSITION_TO_SUBJECT
* ORGANIZATION_TO_POSITION
* ORGANIZATION_TO_SUBJECT
* OWNER_RELATIONSHIP
* SOURCE_SYSTEM_REFERENCE
* MANUAL_GOVERNED
* CUSTOM

---

# 14. Manager Relationship Version

`MANAGER_RELATIONSHIP_VERSION`

필수 필드:

* manager_relationship_version_id
* manager_relationship_id
* version_number
* previous_version_id
* subordinate reference
* manager reference
* relationship type
* primary state
* scope
* source version
* change type
* change reason
* effective_from
* effective_to
* recorded_at
* recorded_by
* immutable_hash
* status
* evidence

Change Type:

* INITIAL
* MANAGER_CHANGE
* TYPE_CHANGE
* SCOPE_CHANGE
* PRIORITY_CHANGE
* ACTING_ASSIGNMENT
* TEMPORARY_ASSIGNMENT
* RESTORATION
* CORRECTION
* TRANSFER
* REORGANIZATION
* TERMINATION
* MIGRATION

---

# 15. Subject Manager Binding

`SUBJECT_MANAGER_BINDING`

필수 필드:

* subject_manager_binding_id
* subordinate subject id
* manager subject id
* relationship type
* tenant_id
* subordinate employment reference
* manager employment reference
* subordinate organization
* manager organization
* subordinate legal entity
* manager legal entity
* primary 여부
* approval routing eligible 여부
* valid_from
* valid_to
* source
* status
* evidence

Subject Binding은 개인 교체 시 유지보수 비용이 높으므로 Source of Truth가 실제로 Subject-based일 때만 사용하라.

---

# 16. Position Manager Binding

`POSITION_MANAGER_BINDING`

필수 필드:

* position_manager_binding_id
* subordinate position id
* manager position id
* relationship type
* tenant_id
* subordinate organization
* manager organization
* legal entity scope
* hierarchy level
* primary 여부
* incumbent required 여부
* vacancy handling policy
* approval routing eligible 여부
* valid_from
* valid_to
* source
* status
* evidence

Position 기반 Reporting Line은 현재 Incumbent를 Resolution 단계에서 연결하도록 하라.

Position이 공석이더라도 관계 자체를 삭제하지 마라.

---

# 17. Organization Manager Binding

`ORGANIZATION_MANAGER_BINDING`

필수 필드:

* organization_manager_binding_id
* organization unit id
* manager subject or position reference
* relationship type
* manager role
* responsibility scope
* legal entity scope
* country scope
* program scope
* primary 여부
* approval routing eligible 여부
* valid_from
* valid_to
* status
* evidence

예:

* Department Head
* Division Head
* Business Unit Head
* Country Manager
* Regional Head
* Brand Head
* Cost Center Owner
* Profit Center Owner

---

# 18. Direct Manager

Direct Manager는 Subject의 Primary Employment 또는 Position Supervisory Relationship에서 해석한다.

기본 Resolution 순서:

1. Explicit Active Direct Manager Subject Binding
2. Position-to-position Supervisory Binding의 Active Incumbent
3. Primary Organization의 Administrative Manager
4. Tenant-configured Fallback
5. Missing Manager Policy

이 순서는 Tenant별 Versioned Policy로 변경 가능해야 한다.

다음은 기본적으로 허용하지 않는다.

* 동일 기간 여러 Primary Direct Manager
* 자기 자신을 Direct Manager로 지정
* 종료된 Subject를 Direct Manager로 지정
* 다른 Tenant Subject를 일반 Direct Manager로 지정
* Effective Period가 겹치는 중복 Binding

---

# 19. Administrative Manager

Administrative Manager는 인사·근태·업무 배치 등 공식 관리 관계를 나타낸다.

필수 속성:

* official supervisory relationship
* primary organization alignment
* employment legal entity
* HRIS source priority
* manager chain eligibility
* approval routing eligibility
* valid period
* historical reconstruction

Administrative Manager와 Functional Manager가 다를 수 있게 하라.

---

# 20. Functional Manager

Functional Manager는 전문 기능·직무·업무 기준의 관리 관계다.

예:

* Finance Functional Head
* Legal Functional Head
* Marketing Functional Head
* Security Functional Head
* Data Functional Head

필수 속성:

* functional domain
* functional organization
* responsibility scope
* resource scope
* country scope
* legal entity scope
* primary functional 여부
* approval routing eligible 여부
* valid period

Functional Manager가 Direct Manager를 자동 대체하지 않게 하라.

---

# 21. Dotted-Line Manager

Dotted-line Manager는 Secondary 또는 Matrix Reporting 관계다.

필수 속성:

* relationship purpose
* responsibility scope
* decision scope
* approval routing eligibility
* priority
* mandatory review 여부
* mandatory approval 여부
* valid period

기본값:

* 조직 감독: Secondary
* 일반 Manager Chain: 제외
* 명시적 Workflow Policy가 있는 경우 Approval Route 후보
* Direct Manager 대체: 금지
* Self-approval 방지 계산: 포함 가능

---

# 22. Project Manager

Project Manager 관계에는 다음을 기록한다.

* project reference
* project organization
* project role
* project budget scope
* project resource scope
* project start and end date
* project legal entity
* project sponsor reference
* approval routing eligibility
* valid period

Project 종료 후 Manager Relationship을 Active로 유지하지 마라.

---

# 23. Program Manager

Program Manager 관계에는 다음을 기록한다.

* program reference
* program organization
* program owner
* program funding scope
* program region
* program country
* program legal entity
* program approval scope
* valid period

Rebate Program Owner와 Employment Manager를 동일시하지 마라.

---

# 24. Regional Manager

Regional Manager 관계에는 다음을 기록한다.

* region id
* included countries
* excluded countries
* regional legal entities
* regional organization
* regional responsibility
* approval routing eligibility
* cross legal entity state
* valid period

Country 포함 여부를 Region 이름으로 추론하지 마라.

---

# 25. Country Manager

Country Manager 관계에는 다음을 기록한다.

* country code
* country organization
* local legal entities
* local responsibility scope
* regulatory scope
* local financial scope
* approval routing eligibility
* valid period

Country Manager가 모든 Local Legal Entity의 법적 승인 권한을 가진다고 가정하지 마라.

---

# 26. Brand Manager

Brand Manager 관계에는 다음을 기록한다.

* brand id
* brand owner organization
* legal owner entity
* operating entities
* region scope
* country scope
* program scope
* approval routing eligibility
* valid period

Brand 운영 책임과 법적·재무 승인 권한을 구분한다.

---

# 27. Cost Center Manager

Cost Center Manager 관계에는 다음을 기록한다.

* cost center id
* legal entity
* currency
* budget scope
* expense scope
* manager subject or position
* finance owner reference
* approval routing eligibility
* valid period

Cost Center Manager와 Budget Owner를 동일시하지 않는다.

---

# 28. Profit Center Manager

Profit Center Manager 관계에는 다음을 기록한다.

* profit center id
* legal entity
* currency
* revenue scope
* margin scope
* region scope
* brand scope
* manager subject or position
* approval routing eligibility
* valid period

---

# 29. Acting Manager

`ACTING_MANAGER`는 원래 Manager의 업무를 일정 기간 대행한다.

필수 필드:

* acting assignment reference
* original manager reference
* acting manager subject or position
* acting reason
* start date
* end date
* covered manager relationship types
* covered scope
* approval routing eligible 여부
* approval authority inherited 여부
* explicit authority reference
* status
* evidence

Acting Manager 관계만으로 원래 Manager의 모든 Approval Authority를 자동 상속하지 마라.

Authority 상속은 후속 Authority Matrix 정책으로 검증한다.

---

# 30. Temporary Manager

Temporary Manager는 특정 조직·Project·Program 또는 Transition 기간의 임시 관리자다.

필수 필드:

* temporary assignment reference
* temporary manager
* target subject·position·organization
* assignment purpose
* relationship type
* scope
* valid_from
* valid_to
* maximum duration
* renewal count
* approval routing eligibility
* approval reference
* status
* evidence

Temporary Manager에는 종료일을 강제한다.

무기한 Temporary Assignment를 허용하지 마라.

---

# 31. Interim Manager

Interim Manager는 공석 Position이나 조직 개편 중 임시 책임을 수행한다.

필수 필드:

* vacant position reference
* interim manager
* interim start
* expected end
* vacancy reason
* incumbent search state
* covered responsibilities
* approval routing eligibility
* authority reference
* status
* evidence

Interim Manager와 Acting Manager를 구분하라.

* Acting: 기존 Manager가 존재하지만 일시 부재
* Interim: Position 또는 역할이 공석

---

# 32. Co-Manager

`CO_MANAGER`는 동일 범위에 복수의 공식 Manager가 존재하는 구조다.

필수 필드:

* co-manager group reference
* members
* responsibility split
* primary coordination manager
* decision policy reference
* approval routing policy
* conflict policy
* valid period
* status
* evidence

Co-manager가 존재할 때 임의로 첫 번째 Manager만 선택하지 마라.

후속 Approval Chain 정책에서 다음 중 하나를 선택할 수 있게 하라.

* ANY_ONE
* ALL
* PRIMARY_ONLY
* DOMAIN_SPECIFIC
* MANUAL_SELECTION
* POLICY_RESOLVED

---

# 33. Manager Assignment

`MANAGER_ASSIGNMENT`

필수 필드:

* manager_assignment_id
* manager relationship id
* assignment type
* subordinate reference
* manager reference
* position reference
* organization reference
* relationship type
* responsibility scope
* approval routing scope
* manager chain priority
* source priority
* primary 여부
* acting 여부
* temporary 여부
* interim 여부
* co-manager group
* valid_from
* valid_to
* status
* evidence

Assignment Type:

* PERMANENT
* POSITION_BASED
* SUBJECT_BASED
* ORGANIZATION_BASED
* ACTING
* TEMPORARY
* INTERIM
* PROJECT
* PROGRAM
* REGIONAL
* FINANCIAL
* MATRIX
* MANUAL_GOVERNED
* CUSTOM

---

# 34. Manager Assignment Scope

`MANAGER_ASSIGNMENT_SCOPE`

지원 Scope:

* ALL_RESPONSIBILITIES
* PEOPLE_MANAGEMENT
* FUNCTIONAL_REVIEW
* PERFORMANCE_REFERENCE
* BUDGET
* COST_CENTER
* PROFIT_CENTER
* PROGRAM
* PROJECT
* BRAND
* REGION
* COUNTRY
* LEGAL_ENTITY
* SECURITY
* COMPLIANCE
* DATA
* APPROVAL_ROUTING
* READ_ONLY_REVIEW
* CUSTOM

필수 필드:

* manager_assignment_scope_id
* manager_assignment_id
* scope type
* resource reference
* scope effect
* legal entity restriction
* country restriction
* environment restriction
* amount reference
* valid_from
* valid_to
* status
* evidence

---

# 35. Manager Assignment Priority

`MANAGER_ASSIGNMENT_PRIORITY`

기본 우선순위 후보:

1. Explicit Active Acting Manager for requested scope
2. Explicit Active Interim Manager
3. Explicit Active Temporary Manager
4. Primary Direct Manager
5. Primary Position Supervisor
6. Administrative Manager
7. Functional Manager for matching domain
8. Project or Program Manager for matching resource
9. Regional or Country Manager for matching geography
10. Brand Manager for matching brand
11. Cost Center or Profit Center Manager for matching financial scope
12. Dotted-line or Matrix Manager
13. Organization Owner
14. Missing Manager Fallback
15. Manual Review
16. Block

이 우선순위를 하드코딩하지 말고 Tenant·Domain별 Versioned Policy로 관리하라.

---

# 36. Manager Eligibility Profile

`MANAGER_ELIGIBILITY_PROFILE`

이번 단계에서는 기본 적격성 기반을 구축한다.

필수 필드:

* manager_eligibility_profile_id
* relationship types
* subject types
* employment states
* position states
* required tenant
* required organization
* legal entity policy
* country policy
* role requirement reference
* minimum job level
* minimum executive level
* active employment required 여부
* leave state policy
* suspension policy
* termination policy
* conflict of interest hook
* self approval exclusion
* approval routing eligible 여부
* manager chain eligible 여부
* valid_from
* valid_to
* status
* evidence

상세 Approval Authority와 Financial Threshold는 후속 블록에서 구현한다.

---

# 37. 기본 Manager Eligibility

기본적으로 다음을 요구한다.

* Active Canonical Identity
* Active Employment 또는 허용된 Contractor State
* Active Manager Assignment
* 유효한 Effective Period
* 동일 Tenant 또는 명시적 Cross-Tenant Reference
* 허용된 Legal Entity 관계
* 비종료 Position
* Vacancy가 아닌 Manager Position 또는 유효한 Interim Incumbent
* Required Scope 충족
* Self-reporting 아님
* Circular Relationship 없음
* Security Suspension 아님
* Authorization Runtime Check 통과
* Approval Requirement와 Relationship Type 일치

---

# 38. Manager Effective Period

`MANAGER_EFFECTIVE_PERIOD`

필수 필드:

* manager_effective_period_id
* entity type
* entity id
* business valid from
* business valid to
* system recorded from
* system recorded to
* timezone
* future dated 여부
* retroactive 여부
* acting period 여부
* temporary period 여부
* interim period 여부
* source effective date
* status
* evidence

Business Time과 System Time을 구분하라.

---

# 39. Future-Dated Manager Change

지원 변경:

* Direct Manager Change
* Position Supervisor Change
* Functional Manager Change
* Organization Head Change
* Acting Assignment Start
* Acting Assignment End
* Temporary Assignment Start
* Temporary Assignment End
* Interim Assignment Start
* Interim Assignment End
* Organization Transfer
* Position Transfer
* Legal Entity Transfer
* Project Assignment Change
* Program Assignment Change
* Regional Manager Change
* Country Manager Change
* Cost Center Manager Change

Future Change에는 다음을 기록한다.

* scheduled effective date
* predecessor manager
* successor manager
* affected subjects
* affected positions
* affected organizations
* affected active tasks
* affected approval chains
* source
* validation result
* activation result
* evidence

---

# 40. Retroactive Manager Correction

과거 Manager 관계를 수정할 때 다음을 강제하라.

* Correction Reason
* Authorized Requester
* Approval Reference
* Original Relationship Version
* Correction Version
* Affected Period
* Affected Approval Tasks
* Affected Decisions
* Historical Snapshot Impact
* Reconciliation
* Manual Review for Financial Approval Impact

과거 Assignment·Snapshot·Decision Evidence를 덮어쓰지 마라.

---

# 41. Manager Availability Reference

`MANAGER_AVAILABILITY_REFERENCE`

이번 단계에서는 가용성 Reference만 구축한다.

상세 Delegation·Substitute는 후속 전용 블록에서 구현한다.

지원 상태:

* AVAILABLE
* ON_LEAVE
* OUT_OF_OFFICE
* SUSPENDED
* TEMPORARILY_UNAVAILABLE
* TERMINATED
* SECURITY_BLOCKED
* UNKNOWN

필수 필드:

* availability reference id
* manager subject
* source
* availability state
* start
* end
* timezone
* acting manager reference
* delegation reference
* substitute reference
* approval routing effect
* status
* evidence

---

# 42. Manager Vacancy

`MANAGER_VACANCY`

Vacancy Type:

* POSITION_VACANT
* MANAGER_TERMINATED
* MANAGER_TRANSFERRED
* MANAGER_ON_EXTENDED_LEAVE
* ORGANIZATION_HEAD_MISSING
* SOURCE_DATA_MISSING
* INTERIM_PENDING
* REORGANIZATION
* UNKNOWN

필수 필드:

* manager_vacancy_id
* position reference
* organization reference
* expected relationship type
* previous manager
* vacancy type
* vacancy start
* expected fill date
* interim manager reference
* fallback policy
* affected subjects
* affected approval tasks
* risk level
* status
* evidence

---

# 43. Missing Manager Policy

`MISSING_MANAGER_POLICY`

지원 Policy:

* USE_POSITION_SUPERVISOR
* USE_ORGANIZATION_HEAD
* USE_PARENT_ORGANIZATION_MANAGER
* USE_FUNCTIONAL_MANAGER
* USE_ACTING_MANAGER
* USE_INTERIM_MANAGER
* USE_DESIGNATED_FALLBACK_ROLE
* USE_CASE_OWNER_REFERENCE
* CREATE_MANUAL_REVIEW
* ESCALATE_REFERENCE
* BLOCK_APPROVAL
* CUSTOM

필수 필드:

* missing_manager_policy_id
* tenant
* reporting line type
* approval domain
* organization type
* legal entity scope
* country scope
* fallback sequence
* maximum hierarchy climb
* cross legal entity allowed 여부
* evidence requirement
* manual review threshold
* status
* evidence

---

# 44. Parent Organization Manager Fallback

Parent Organization Manager를 사용할 때 다음을 검증하라.

* 같은 Tenant인가
* 허용된 Hierarchy Type인가
* 유효한 Organization Path인가
* Maximum Climb을 초과하지 않는가
* Legal Entity Boundary를 넘는가
* Cross-Legal-Entity 정책이 있는가
* 해당 Manager Type이 Approval Domain과 일치하는가
* Manager Eligibility를 충족하는가
* Root까지 도달했는데도 Manager가 없는가

무제한 Parent Traversal을 허용하지 마라.

---

# 45. Manager Conflict

`MANAGER_CONFLICT`

Conflict Type:

* MULTIPLE_PRIMARY_DIRECT_MANAGER
* MULTIPLE_PRIMARY_POSITION_SUPERVISOR
* SUBJECT_POSITION_MANAGER_MISMATCH
* ADMINISTRATIVE_FUNCTIONAL_CONFLICT
* ACTING_ORIGINAL_CONFLICT
* TEMPORARY_PERMANENT_CONFLICT
* INTERIM_INCUMBENT_CONFLICT
* CO_MANAGER_POLICY_MISSING
* CROSS_TENANT_CONFLICT
* CROSS_LEGAL_ENTITY_CONFLICT
* EFFECTIVE_PERIOD_OVERLAP
* SOURCE_PRIORITY_CONFLICT
* MANAGER_INELIGIBLE
* MANAGER_TERMINATED
* MANAGER_POSITION_VACANT
* SELF_REPORTING
* CIRCULAR_REPORTING
* HIERARCHY_PATH_MISSING
* CUSTOM

필수 필드:

* manager_conflict_id
* subordinate reference
* candidate managers
* conflict type
* source systems
* effective period
* affected reporting line
* affected approval cases
* severity
* resolution policy
* resolved manager reference
* resolved_by
* resolved_at
* status
* evidence

---

# 46. Conflict Resolution 기본 우선순위

권장 기본 순서:

1. Explicit Governance Override
2. Higher-priority Authoritative Source
3. Active Acting Assignment for matching scope
4. Active Interim Assignment
5. Position-based Primary Supervisor
6. Subject-based Primary Direct Manager
7. Organization Primary Administrative Manager
8. Domain-specific Functional Manager
9. Manual Review
10. Block

충돌이 Material한 경우 자동 Resolution 결과와 근거를 Evidence로 남겨라.

---

# 47. Supervisory Graph Node

`SUPERVISORY_GRAPH_NODE`

Node Type:

* SUBJECT
* POSITION
* ORGANIZATION
* VIRTUAL_ROOT
* VACANT_POSITION
* ACTING_ASSIGNMENT
* INTERIM_ASSIGNMENT
* EXTERNAL_REFERENCE

필수 필드:

* supervisory_graph_node_id
* supervisory_hierarchy_version_id
* node type
* subject reference
* position reference
* organization reference
* tenant_id
* legal entity
* hierarchy level
* executive level
* active incumbent
* root 여부
* valid_from
* valid_to
* status
* evidence

---

# 48. Supervisory Graph Edge

`SUPERVISORY_GRAPH_EDGE`

필수 필드:

* supervisory_graph_edge_id
* supervisory_hierarchy_version_id
* source node
* target node
* manager relationship type
* relationship id
* primary 여부
* hierarchy forming 여부
* manager chain eligible 여부
* approval routing eligible 여부
* edge priority
* legal entity boundary type
* valid_from
* valid_to
* status
* evidence

Edge 방향은 `subordinate → manager` 또는 `manager → subordinate` 중 하나로 표준화하고 전 Repository에서 동일하게 사용하라.

---

# 49. Supervisory Path

`SUPERVISORY_PATH`

필수 필드:

* supervisory_path_id
* supervisory_hierarchy_version_id
* subordinate node
* manager node
* path length
* path type
* relationship sequence
* primary path 여부
* direct manager 포함 여부
* functional manager 포함 여부
* matrix manager 포함 여부
* legal entity crossings
* organization crossings
* valid_from
* valid_to
* computed_at
* status
* evidence

Path Type:

* SELF
* DIRECT
* PRIMARY_CHAIN
* ADMINISTRATIVE_CHAIN
* FUNCTIONAL_CHAIN
* POSITION_CHAIN
* MATRIX_CHAIN
* PROJECT_CHAIN
* PROGRAM_CHAIN
* REGIONAL_CHAIN
* FINANCIAL_CHAIN
* APPROVAL_ELIGIBLE_CHAIN
* CROSS_ENTITY_CHAIN

---

# 50. Manager Chain Foundation

`MANAGER_CHAIN_REFERENCE`

이번 단계에서는 Manager Chain 참조 기반을 구축한다.

필수 필드:

* manager_chain_reference_id
* subordinate subject
* subordinate position
* hierarchy version
* effective date
* chain type
* direct manager
* level 1 manager
* level 2 manager
* level 3 manager
* root manager
* chain depth
* legal entity crossings
* matrix branches
* missing levels
* conflicts
* candidate snapshot
* status
* evidence

Chain Type:

* DIRECT
* ADMINISTRATIVE
* FUNCTIONAL
* POSITION
* MATRIX
* REGIONAL
* FINANCIAL
* APPROVAL_REFERENCE
* CUSTOM

최종 Approval Chain 생성은 다음 블록에서 구현한다.

---

# 51. Manager Candidate

`MANAGER_CANDIDATE`

필수 필드:

* manager_candidate_id
* subordinate subject
* subordinate position
* organization
* approval request
* approval case
* approval requirement
* requested action
* resource
* effective date
* candidate manager subject
* candidate manager position
* candidate manager organization
* relationship type
* relationship version
* source type
* source priority
* assignment priority
* hierarchy level
* chain distance
* legal entity relationship
* scope match
* domain match
* availability state
* eligibility result
* exclusion reasons
* conflict state
* ranking score reference
* proposed 여부
* manual review requirement
* status
* evidence

---

# 52. Candidate Exclusion Reason

지원 Exclusion:

* SELF
* SAME_SUBJECT_AS_REQUESTER
* TERMINATED
* INACTIVE
* SUSPENDED
* SECURITY_BLOCKED
* POSITION_VACANT
* ASSIGNMENT_EXPIRED
* RELATIONSHIP_EXPIRED
* WRONG_TENANT
* WRONG_LEGAL_ENTITY
* WRONG_COUNTRY
* WRONG_ORGANIZATION
* WRONG_SCOPE
* WRONG_MANAGER_TYPE
* OUTSIDE_EFFECTIVE_PERIOD
* CONFLICT_OF_INTEREST_REFERENCE
* CIRCULAR_RELATIONSHIP
* DUPLICATE_CANDIDATE
* UNAVAILABLE_REFERENCE
* AUTHORIZATION_FAILED
* MANUAL_EXCLUSION
* OTHER

---

# 53. Candidate Deduplication

동일 Subject가 다음 여러 경로로 Candidate가 될 수 있다.

* Direct Manager
* Position Supervisor
* Functional Manager
* Organization Head
* Program Manager
* Regional Manager
* Cost Center Manager

이 경우 Subject를 중복 Task로 생성하지 말고 Candidate Source와 Relationship Type을 여러 개 연결하라.

단, 각 Relationship이 별도의 Approval Requirement를 충족해야 한다면 개별 Requirement Binding을 유지한다.

---

# 54. Manager Relationship Snapshot

`MANAGER_RELATIONSHIP_SNAPSHOT`

필수 필드:

* manager_relationship_snapshot_id
* snapshot type
* tenant
* subordinate subject
* subordinate position
* subordinate organization
* manager subject
* manager position
* manager organization
* relationship type
* relationship version
* reporting line version
* supervisory hierarchy version
* assignment reference
* assignment scope
* source system
* source version
* legal entity relationship
* organization path
* supervisory path
* availability state
* eligibility result
* effective_at
* captured_at
* immutable_hash
* status
* evidence

Snapshot Type:

* APPROVAL_REQUEST
* APPROVAL_CASE
* MANAGER_RESOLUTION
* APPROVAL_CHAIN_BUILD
* TASK_ASSIGNMENT
* TASK_CLAIM
* APPROVAL_DECISION
* REPORTING_LINE_CHANGE
* RECONCILIATION
* AUDIT_RECONSTRUCTION

---

# 55. Snapshot 원칙

* Snapshot 생성 후 직접 수정 금지
* 현재 Manager 관계로 과거 Snapshot 대체 금지
* Reporting Line Version 저장
* Manager Relationship Version 저장
* Organization Hierarchy Version 저장
* Position Version 저장
* Employment Version 저장
* Acting·Temporary·Interim 상태 저장
* Legal Entity Crossing 저장
* Availability Reference 저장
* Eligibility Result 저장
* Source Priority 저장
* Resolution 근거 저장
* Immutable Hash 검증

---

# 56. Self-Reporting Detection

다음을 차단하라.

* subordinate subject = manager subject
* subordinate position = manager position
* Organization Manager가 자기 조직의 유일한 Subject로 자기 자신을 관리
* Acting Manager가 자신을 대행
* Co-manager Group에 동일 Subject 중복
* Manager Candidate와 Requester가 같고 Self-approval 금지
* Task Assignee와 Requested For가 같고 Policy 근거 없음

Self-reporting과 Self-approval은 다른 개념이므로 별도 Error·Audit Event로 관리하라.

---

# 57. Circular Reporting Detection

다음 Cycle을 탐지하라.

* A → B → A
* A → B → C → A
* Subject Chain Cycle
* Position Chain Cycle
* Subject·Position Mixed Cycle
* Organization Manager Cycle
* Acting Assignment Cycle
* Temporary Assignment Cycle
* Matrix Relationship Cycle
* Cross-Legal-Entity Supervisory Cycle

최소 다음 방식 중 적합한 것을 사용한다.

* DFS
* Topological Sort
* Recursive CTE
* Closure Table
* Graph Query
* Path Prefix Validation

---

# 58. Cycle 처리

Cycle 탐지 시 다음을 수행하라.

* 관계 활성화 차단
* 영향 Subject 계산
* 영향 Approval Task 계산
* 영향 Approval Chain Reference 계산
* Source System 표시
* Conflict 생성
* Manual Review 생성
* High 또는 Critical Audit Event 생성
* 관련 Cache 무효화
* 신규 Manager Resolution 차단
* 기존 Approval Snapshot 유지

---

# 59. Cross-Tenant Manager Guard

다음을 차단하라.

* 다른 Tenant Subject를 Direct Manager로 지정
* 다른 Tenant Position을 Supervisor로 지정
* 다른 Tenant Organization Head를 Manager로 지정
* Cross-Tenant Acting Manager
* Cross-Tenant Temporary Manager
* Cross-Tenant Supervisory Path
* Cross-Tenant Approval Candidate

명시적 Shared Service가 필요한 경우 다음을 요구한다.

* Shared Service Reference
* Contract Reference
* Tenant-to-Tenant Trust Policy
* Allowed Scope
* Data Access Policy
* Authorization Check
* Approval Routing Eligibility
* Effective Period
* Evidence
* Audit

---

# 60. Cross-Legal-Entity Manager Guard

Cross-Legal-Entity Manager 관계에 다음을 기록한다.

* subordinate legal entity
* manager legal entity
* relationship reason
* group function reference
* shared service reference
* regional leadership reference
* intercompany agreement
* country restriction
* approval routing eligibility
* financial authority reference
* effective period
* evidence

Cross-Legal-Entity Manager라고 해서 Financial Approval Authority를 자동 부여하지 마라.

---

# 61. Manager Relationship Validation

`REPORTING_LINE_VALIDATION`

활성화 전에 다음을 검증하라.

* Tenant 일치
* Subject 존재
* Position 존재
* Organization 존재
* Employment 상태
* Position Incumbency 상태
* Relationship Type 유효
* Effective Period 유효
* Source Reference 유효
* Primary Count 제한
* Self-reporting 없음
* Circular Reporting 없음
* Cross-Tenant 정책
* Cross-Legal-Entity 정책
* Manager Eligibility
* Organization Path 유효
* Supervisory Path 생성 가능
* Acting Original Manager 존재
* Temporary End Date 존재
* Interim Vacancy 존재
* Co-manager Policy 존재
* Historical Version Hash 유효
* Active Version Immutable

---

# 62. Source Priority

Tenant별로 Versioned Source Priority를 설정하라.

권장 예:

1. Approved Governance Override
2. HRIS Supervisory Organization
3. HRIS Position Hierarchy
4. HRIS Explicit Manager
5. ERP Personnel Hierarchy
6. Canonical Position Registry
7. Canonical Organization Manager Binding
8. IdP Manager Attribute
9. SCIM Manager Reference
10. Manual Governed Relationship
11. Imported Legacy Reference
12. Unverified Source

IdP·SCIM Manager Attribute를 HRIS보다 무조건 우선하지 마라.

---

# 63. Historical Manager Reconstruction

특정 날짜 `T`의 Manager를 해석할 때 다음 Version을 사용하라.

* Subject Identity Version at T
* Employment Version at T
* Position Incumbency at T
* Position Manager Binding at T
* Subject Manager Binding at T
* Organization Unit Version at T
* Organization Hierarchy Version at T
* Reporting Line Version at T
* Acting·Temporary·Interim Assignment at T
* Legal Entity Binding at T
* Availability Reference at T
* Source Priority Version at T

현재 데이터로 과거 Manager를 추정하지 마라.

---

# 64. Manager Change Impact

Manager Relationship 변경 시 다음 영향을 계산하라.

* Active Approval Task Assignee
* Available Task Candidate
* Claimed Task
* Pending Approval Chain
* Approval Requirement
* SLA Owner Reference
* Escalation Owner Reference
* Delegation Reference
* Notification Recipient
* Organization Snapshot
* Manager Snapshot
* Future Scheduled Task
* Reconciliation State

기본 정책:

* 완료된 Decision: 변경하지 않음
* 이미 Claim된 Task: 정책에 따라 유지 또는 재검증
* 미Claim Task: Candidate 재평가 가능
* 새 Approval Case: 새 Manager 관계 사용
* Critical Security Change: Active Task 재검증
* Terminated Manager: Active Task 재할당 Hook
* Cross-Tenant Drift: 즉시 Block

---

# 65. Claimed Task와 Manager 변경

Manager가 Task를 Claim한 후 Reporting Line이 변경된 경우 다음 정책을 지원하라.

* KEEP_CLAIM_UNTIL_COMPLETION
* REVALIDATE_ON_COMPLETION
* RELEASE_AND_REASSIGN
* KEEP_IF_AUTHORITY_VALID
* BLOCK_IF_TERMINATED
* BLOCK_IF_TENANT_CHANGED
* BLOCK_IF_LEGAL_ENTITY_CHANGED
* MANUAL_REVIEW
* CUSTOM

Task Claim 자체가 Approval Authority를 영구 보장하지 않게 하라.

---

# 66. Reporting Line Reconciliation

`REPORTING_LINE_RECONCILIATION`

다음을 비교하라.

* HRIS Manager vs Canonical Direct Manager
* HRIS Position Supervisor vs Canonical Position Manager
* ERP Personnel Manager vs Canonical Manager
* IdP Manager vs Canonical Manager
* SCIM Manager vs Canonical Manager
* Directory Manager vs Canonical Manager
* Organization Head vs Organization Manager Binding
* Department Head vs Department Profile
* Cost Center Manager vs Finance Master
* Profit Center Manager vs Finance Master
* Project Manager vs Project Registry
* Program Manager vs Program Registry
* Regional Manager vs Region Registry
* Country Manager vs Country Registry
* Position Incumbent vs Manager Assignment
* Manager Assignment vs Employment Status
* Manager Assignment vs Organization Membership
* Manager Legal Entity vs Subordinate Legal Entity
* Reporting Line Version vs Supervisory Path
* Supervisory Edge vs Path Index
* Manager Snapshot vs Source Version
* Manager Candidate vs Active Relationship
* Task Assignee vs Current Candidate
* Task Claim Actor vs Manager Snapshot
* Terminated Manager vs Active Task
* Vacant Position vs Active Position Manager
* Future Manager Change vs Scheduler
* Approval Chain Reference vs Reporting Line

필수 필드:

* reporting_line_reconciliation_id
* tenant
* subordinate subject
* subordinate position
* organization
* relationship type
* source system
* source manager
* canonical manager
* effective date
* difference
* affected tasks
* affected approval cases
* severity
* resolution
* resolved_by
* resolved_at
* status
* evidence

---

# 67. Reconciliation 상태

* MATCH
* HRIS_MANAGER_MISMATCH
* HRIS_POSITION_MISMATCH
* ERP_MANAGER_MISMATCH
* IDP_MANAGER_MISMATCH
* SCIM_MANAGER_MISMATCH
* DIRECTORY_MANAGER_MISMATCH
* ORGANIZATION_HEAD_MISMATCH
* DEPARTMENT_HEAD_MISMATCH
* COST_CENTER_MANAGER_MISMATCH
* PROFIT_CENTER_MANAGER_MISMATCH
* PROJECT_MANAGER_MISMATCH
* PROGRAM_MANAGER_MISMATCH
* REGIONAL_MANAGER_MISMATCH
* COUNTRY_MANAGER_MISMATCH
* POSITION_INCUMBENT_MISMATCH
* EMPLOYMENT_STATE_MISMATCH
* MEMBERSHIP_MISMATCH
* LEGAL_ENTITY_MISMATCH
* SUPERVISORY_PATH_MISMATCH
* PATH_INDEX_MISMATCH
* SNAPSHOT_VERSION_MISMATCH
* TASK_ASSIGNEE_MISMATCH
* CLAIM_ACTOR_MISMATCH
* TERMINATED_MANAGER_ACTIVE_TASK
* VACANT_POSITION_MANAGER_ACTIVE
* FUTURE_CHANGE_SCHEDULING_MISMATCH
* APPROVAL_CHAIN_REFERENCE_MISMATCH
* MANUAL_REVIEW
* BLOCKED

---

# 68. Critical Gap 후보

다음은 High 또는 Critical로 처리하라.

* Cross-Tenant Direct Manager
* Cross-Tenant Position Supervisor
* Self-reporting
* Circular Reporting
* 동일 기간 여러 Primary Direct Manager
* 동일 기간 여러 Primary Position Supervisor
* 종료된 Subject가 Active Manager
* Terminated Manager의 Active Approval Task
* Security Suspended Manager의 Active Task
* 공석 Position이 Active Manager로 사용됨
* Acting Manager가 원래 Manager 없이 등록됨
* 무기한 Temporary Manager
* Interim Manager가 Vacancy 없이 등록됨
* Co-manager Policy 없음
* Manager Relationship Version 없음
* Reporting Line Version 없음
* Historical Snapshot 없음
* Approval Task에 사용된 Manager 근거 없음
* 다른 Legal Entity Manager에게 Financial Authority 자동 부여
* Source Priority 충돌 미해결
* Manager Chain이 Root 전에 단절
* Manager Chain Maximum Depth 초과
* Manager Change 후 Candidate Cache 미갱신
* HRIS와 Canonical Direct Manager 불일치
* Task Assignee와 Manager Snapshot 불일치
* Current Relationship으로 과거 Approval Evidence 재작성

---

# 69. 최소 Static Lint

이번 블록에서는 다음을 차단하라.

* Tenant 없는 Manager Relationship
* Relationship Type 없는 Manager Relationship
* subordinate·manager 모두 없는 관계
* Self-reporting 관계
* 금지된 Circular Reporting
* 동일 기간 Primary Direct Manager 중복
* 동일 기간 Primary Position Supervisor 중복
* Effective Period 역전
* Acting Manager 종료일 누락
* Temporary Manager 종료일 누락
* Interim Manager Vacancy Reference 누락
* Co-manager Policy 누락
* Cross-Tenant 일반 Manager 관계
* 허용 근거 없는 Cross-Legal-Entity 관계
* 종료된 Manager Subject
* 종료된 Manager Position
* Vacant Position의 Incumbent 사용
* Active Reporting Line Version 직접 수정
* Manager Relationship History 덮어쓰기
* Reporting Line Snapshot 직접 수정
* Source Priority 누락
* 승인 경로 적격성 없는 Manager를 Approval Candidate로 사용
* 이름·이메일 기반 Manager Join
* 기존 Manager Registry 중복 생성

---

# 70. 최소 Runtime Guard

다음을 차단하라.

* Reporting Line Not Found
* Reporting Line Version Inactive
* Manager Relationship Not Found
* Manager Relationship Inactive
* Manager Assignment Expired
* Manager Subject Inactive
* Manager Position Vacant
* Tenant Mismatch
* Legal Entity Policy Violation
* Effective Date Outside Validity
* Self-reporting Detected
* Circular Reporting Detected
* Primary Manager Conflict
* Source Priority Conflict
* Manager Eligibility Failed
* Manager Availability Blocked
* Missing Manager Policy Exhausted
* Maximum Hierarchy Climb Exceeded
* Supervisory Path Missing
* Snapshot Missing
* Snapshot Hash Invalid
* Task Assignee Drift
* Critical Reconciliation Drift
* Future Manager Change Activation Failed
* Kill Switch 활성

---

# 71. Error Contract

* REPORTING_LINE_REGISTRY_NOT_FOUND
* REPORTING_LINE_DEFINITION_NOT_FOUND
* REPORTING_LINE_VERSION_NOT_FOUND
* REPORTING_LINE_VERSION_INACTIVE
* REPORTING_LINE_VERSION_IMMUTABLE
* SUPERVISORY_HIERARCHY_NOT_FOUND
* SUPERVISORY_HIERARCHY_VERSION_NOT_FOUND
* MANAGER_RELATIONSHIP_TYPE_NOT_FOUND
* MANAGER_RELATIONSHIP_NOT_FOUND
* MANAGER_RELATIONSHIP_INACTIVE
* MANAGER_RELATIONSHIP_INVALID
* MANAGER_ASSIGNMENT_NOT_FOUND
* MANAGER_ASSIGNMENT_EXPIRED
* MANAGER_SUBJECT_NOT_FOUND
* MANAGER_SUBJECT_INACTIVE
* MANAGER_POSITION_NOT_FOUND
* MANAGER_POSITION_VACANT
* MANAGER_SELF_REPORTING
* MANAGER_CIRCULAR_REPORTING
* MANAGER_PRIMARY_CONFLICT
* MANAGER_SOURCE_PRIORITY_CONFLICT
* MANAGER_TENANT_MISMATCH
* MANAGER_LEGAL_ENTITY_POLICY_VIOLATION
* MANAGER_EFFECTIVE_PERIOD_INVALID
* MANAGER_ELIGIBILITY_FAILED
* MANAGER_AVAILABILITY_BLOCKED
* MANAGER_ACTING_ASSIGNMENT_INVALID
* MANAGER_TEMPORARY_ASSIGNMENT_INVALID
* MANAGER_INTERIM_ASSIGNMENT_INVALID
* MANAGER_CO_MANAGER_POLICY_MISSING
* MANAGER_SUPERVISORY_PATH_MISSING
* MANAGER_CHAIN_DEPTH_EXCEEDED
* MANAGER_SNAPSHOT_MISSING
* MANAGER_SNAPSHOT_INVALID
* MANAGER_TASK_ASSIGNEE_DRIFT
* MANAGER_RECONCILIATION_FAILED
* MANAGER_RUNTIME_BLOCKED

---

# 72. Warning Contract

* REPORTING_LINE_SOURCE_WARNING
* REPORTING_LINE_VERSION_WARNING
* MANAGER_RELATIONSHIP_WARNING
* MANAGER_SOURCE_PRIORITY_WARNING
* MANAGER_POSITION_WARNING
* MANAGER_VACANCY_WARNING
* MANAGER_ACTING_WARNING
* MANAGER_TEMPORARY_WARNING
* MANAGER_INTERIM_WARNING
* MANAGER_CO_MANAGER_WARNING
* MANAGER_MATRIX_WARNING
* MANAGER_CROSS_ENTITY_WARNING
* MANAGER_AVAILABILITY_WARNING
* MANAGER_HISTORICAL_WARNING
* MANAGER_SNAPSHOT_WARNING
* MANAGER_TASK_IMPACT_WARNING
* MANAGER_RECONCILIATION_WARNING
* MANAGER_MANUAL_REVIEW_REQUIRED

---

# 73. Evidence Contract

`REPORTING_LINE_EVIDENCE`

필수 필드:

* evidence id
* tenant
* reporting line registry
* reporting line definition
* reporting line version
* supervisory hierarchy
* supervisory hierarchy version
* manager relationship
* manager relationship version
* subordinate subject
* subordinate position
* subordinate organization
* manager subject
* manager position
* manager organization
* relationship type
* assignment
* assignment scope
* source system
* source record
* source version
* employment reference
* organization hierarchy version
* legal entity relationship
* effective period
* acting reference
* temporary reference
* interim reference
* vacancy reference
* candidate reference
* snapshot reference
* approval request reference
* approval case reference
* task reference
* reconciliation reference
* effective_at
* recorded_at
* immutable hash
* lineage
* audit reference

다음을 저장하지 마라.

* Password
* Access Token
* Credential Secret
* 불필요한 Employee PII
* 급여 원문
* 성과 평가 원문
* 민감 Leave 사유
* Health 정보
* Bank Data
* HRIS 전체 Payload
* Directory Secret

---

# 74. Audit Event

`REPORTING_LINE_AUDIT_EVENT`

지원 Event:

* REPORTING_LINE_REGISTRY_CREATED
* REPORTING_LINE_DEFINITION_CREATED
* REPORTING_LINE_VERSION_CREATED
* REPORTING_LINE_VALIDATED
* REPORTING_LINE_ACTIVATED
* MANAGER_RELATIONSHIP_CREATED
* MANAGER_RELATIONSHIP_VERSION_CREATED
* DIRECT_MANAGER_ASSIGNED
* ADMINISTRATIVE_MANAGER_ASSIGNED
* FUNCTIONAL_MANAGER_ASSIGNED
* DOTTED_LINE_MANAGER_ASSIGNED
* PROJECT_MANAGER_ASSIGNED
* PROGRAM_MANAGER_ASSIGNED
* REGIONAL_MANAGER_ASSIGNED
* COUNTRY_MANAGER_ASSIGNED
* COST_CENTER_MANAGER_ASSIGNED
* PROFIT_CENTER_MANAGER_ASSIGNED
* ACTING_MANAGER_ASSIGNED
* TEMPORARY_MANAGER_ASSIGNED
* INTERIM_MANAGER_ASSIGNED
* CO_MANAGER_GROUP_CREATED
* MANAGER_ASSIGNMENT_ENDED
* MANAGER_VACANCY_DETECTED
* MISSING_MANAGER_DETECTED
* MANAGER_CONFLICT_DETECTED
* SELF_REPORTING_DETECTED
* CIRCULAR_REPORTING_DETECTED
* CROSS_TENANT_MANAGER_BLOCKED
* CROSS_ENTITY_MANAGER_REVIEWED
* SUPERVISORY_PATH_CREATED
* MANAGER_CANDIDATE_CREATED
* MANAGER_SNAPSHOT_CREATED
* MANAGER_CHANGE_IMPACT_DETECTED
* TASK_REASSIGNMENT_REQUESTED
* REPORTING_LINE_DRIFT_DETECTED
* FUTURE_MANAGER_CHANGE_SCHEDULED
* FUTURE_MANAGER_CHANGE_ACTIVATED
* RETROACTIVE_MANAGER_CORRECTION_RECORDED
* MANUAL_REVIEW_REQUESTED

---

# 75. 기존 구현 분류

기존 구현을 다음으로 분류하라.

* `CANONICAL_REPORTING_LINE_REGISTRY`
* `CANONICAL_REPORTING_LINE_DEFINITION`
* `CANONICAL_REPORTING_LINE_VERSION`
* `CANONICAL_SUPERVISORY_HIERARCHY`
* `CANONICAL_SUPERVISORY_GRAPH`
* `CANONICAL_MANAGER_RELATIONSHIP_TYPE`
* `CANONICAL_MANAGER_RELATIONSHIP`
* `CANONICAL_SUBJECT_MANAGER_BINDING`
* `CANONICAL_POSITION_MANAGER_BINDING`
* `CANONICAL_ORGANIZATION_MANAGER_BINDING`
* `CANONICAL_MANAGER_ASSIGNMENT`
* `CANONICAL_MANAGER_ELIGIBILITY`
* `CANONICAL_MANAGER_VACANCY`
* `CANONICAL_MANAGER_CONFLICT`
* `CANONICAL_MANAGER_CANDIDATE`
* `CANONICAL_MANAGER_SNAPSHOT`
* `CANONICAL_REPORTING_LINE_RECONCILIATION`
* `VALIDATED_HRIS_SOURCE`
* `VALIDATED_ERP_SOURCE`
* `VALIDATED_DIRECTORY_SOURCE`
* `EXTERNAL_SOURCE_ADAPTER`
* `VALIDATED_LEGACY`
* `LEGACY_ADAPTER`
* `MIGRATION_REQUIRED`
* `CONSOLIDATION_REQUIRED`
* `DEPRECATION_CANDIDATE`
* `KEEP_SEPARATE_WITH_REASON`
* `BLOCKED_CROSS_TENANT`
* `BLOCKED_CIRCULAR_REPORTING`
* `BLOCKED_HISTORICAL_INTEGRITY_RISK`
* `BLOCKED_MANAGER_ELIGIBILITY`
* `UNVERIFIED`
* `TEST_ONLY`

---

# 76. 중복 구현 감사

다음을 전수 탐지하라.

* 여러 Manager Registry
* 여러 `manager_id` 필드
* 여러 `reports_to` 필드
* 여러 Supervisor Table
* 여러 Position Hierarchy
* 여러 Subject Manager Table
* HRIS·ERP·IdP별 독립 Manager ID
* Department Head 별도 Table
* Team Lead 별도 Table
* Cost Center Manager 별도 Table
* Program Manager 별도 Table
* Approval Module 내부의 독립 Manager Resolver
* Workflow Module 내부의 독립 Reporting Line
* Role Module 내부의 별도 Manager Relationship
* Acting Manager를 기존 Manager 덮어쓰기로 처리
* Temporary Manager 종료일 없는 구현
* Current Manager만 저장하는 구현
* Historical Manager Update
* 이름·이메일 기반 Manager Mapping
* Circular Detection 없는 Recursive Manager Query
* Cross-Tenant Manager 조회
* Vacant Position을 Active Manager로 처리
* Task Assignment 시 Manager Snapshot 미생성
* Manager 변경 후 Task Candidate Cache 미무효화
* Manager라는 이유만으로 Approval Authority 자동 부여

---

# 77. 데이터 저장 전략

권장 구조:

* Reporting Line Definition: 관계 정책
* Reporting Line Version: 불변 실행 Version
* Manager Relationship: Canonical 관계
* Manager Relationship Version: 변경 이력
* Supervisory Graph Node·Edge: Chain 계산 기반
* Supervisory Path: 빠른 상위 Manager 조회
* Assignment: Acting·Temporary·Interim 상태
* Candidate: Approval Resolution 입력
* Snapshot: 과거 승인 재현
* Reconciliation: Source Drift 탐지

기존 기술 스택에 따라 다음을 사용할 수 있다.

* Adjacency List
* Closure Table
* Materialized Path
* Recursive CTE
* Graph Database
* Bitemporal Table
* Event-sourced Relationship History

---

# 78. API Contract

기존 API Convention에 따라 최소 다음 기능을 제공하라.

## Reporting Line

* Registry 조회
* Definition 생성·수정
* Version 생성
* Version 검증
* Version 활성화
* 특정 날짜 Version 조회

## Manager Relationship

* Relationship 생성
* Relationship Version 생성
* Relationship 종료
* Subject Manager 조회
* Position Manager 조회
* Organization Manager 조회
* Effective Date 기준 조회
* Relationship History 조회

## Manager Type

* Direct Manager 조회
* Administrative Manager 조회
* Functional Manager 조회
* Project·Program Manager 조회
* Regional·Country Manager 조회
* Cost Center·Profit Center Manager 조회

## Acting·Temporary·Interim

* Assignment 생성
* Assignment 종료
* Active Assignment 조회
* Vacancy 연결
* 충돌 검증

## Supervisory Graph

* Direct Parent Manager 조회
* Manager Ancestor 조회
* Supervisory Path 조회
* Chain Depth 조회
* Cycle 검증
* Root Manager 조회

## Candidate

* Manager Candidate 생성
* Candidate Exclusion
* Candidate Deduplication
* Candidate Ranking Reference
* Manual Review 전환

## Snapshot

* Manager Snapshot 생성
* Snapshot 조회
* Snapshot Hash 검증
* Historical Reconstruction

## Reconciliation

* Source별 비교
* Drift 조회
* 영향 Task 조회
* Manual Resolution
* Reconciliation History

모든 API에 다음을 적용하라.

* Tenant Context
* Authorization
* Effective Date Validation
* Idempotency
* Optimistic Lock
* Audit
* Evidence
* Rate Limit
* Pagination
* Error Contract

---

# 79. Index·Performance

최소 다음 조회를 최적화하라.

* Subject별 Active Direct Manager
* Position별 Active Supervisor
* Organization별 Active Manager
* Effective Date 기준 Manager
* Acting Manager
* Temporary Manager
* Interim Manager
* Vacancy별 Interim Manager
* Manager별 Subordinate
* Direct Subordinate
* 전체 Descendant
* Manager Ancestor Chain
* Root Manager
* Legal Entity별 Manager
* Department별 Head
* Cost Center별 Manager
* Profit Center별 Manager
* Program별 Manager
* Region별 Manager
* Country별 Manager
* Active Approval Candidate
* Manager Snapshot
* Future Manager Change
* Reporting Line Conflict
* Circular Relationship
* Reconciliation Mismatch

---

# 80. Cache 원칙

Manager Resolution Cache Key에는 최소 다음을 포함하라.

* tenant_id
* subordinate_subject_id
* subordinate_position_id
* organization_id
* reporting_line_version_id
* supervisory_hierarchy_version_id
* effective_date
* manager_relationship_type
* approval_domain
* legal_entity_scope
* resource_scope

다음을 적용하라.

* Version-aware Cache
* Tenant-isolated Cache
* Effective-date-aware Cache
* Manager Change 시 Invalidation
* Position Incumbent Change 시 Invalidation
* Acting Assignment 시작·종료 시 Invalidation
* Temporary·Interim 변경 시 Invalidation
* Organization Transfer 시 Invalidation
* Employment Termination 시 Invalidation
* Reconciliation Critical Drift 시 Cache 차단
* 과거 Snapshot은 Current Cache로 재생성 금지

---

# 81. 테스트 범위

## Unit Test

* Direct Manager Relationship 생성
* Position Manager Binding
* Administrative Manager
* Functional Manager
* Acting Assignment
* Temporary Assignment
* Interim Assignment
* Co-manager Policy
* Effective Period
* Self-reporting 차단
* Circular Reporting 차단
* Primary Manager Conflict
* Cross-Tenant Guard
* Cross-Legal-Entity Guard
* Snapshot Hash
* Candidate Deduplication

## Integration Test

* HRIS Manager Import
* HRIS Position Hierarchy Import
* IdP Manager Sync
* SCIM Manager Sync
* ERP Cost Center Manager Sync
* Organization Transfer
* Position Incumbent Change
* Acting Manager Start·End
* Manager Candidate 생성
* Approval Task Assignment Hook
* Snapshot 생성
* Reconciliation

## Property Test

* Acyclic Supervisory Graph
* 동일 기간 Primary Direct Manager 최대 1
* Tenant Isolation
* Historical Version Immutability
* Snapshot Determinism
* Effective Period Non-overlap
* Manager Chain Termination

## Concurrency Test

* 동일 Subject Manager 동시 변경
* 동일 Position Supervisor 동시 변경
* Acting Assignment 동시 생성
* Future Change Scheduler 중복 실행
* Candidate Cache 무효화
* Snapshot 동시 생성

## Security Test

* Cross-Tenant Manager 생성
* 다른 Tenant Manager 조회
* Historical Relationship 변조
* Snapshot 변조
* Unauthorized Acting Assignment
* Unauthorized Retroactive Correction
* Manager Authority 자동 상승 방지

## Regression Test

* 기존 HRIS Sync
* 기존 IdP Sync
* 기존 Organization Chart
* 기존 Team Lead 기능
* 기존 Approval Assignment
* 기존 Role Assignment
* 기존 Workflow Task
* 기존 Notification

---

# 82. 실행 절차

## Step 1 — 기존 Manager·Reporting Line 전수 조사

HRIS, ERP, IdP, SCIM, Directory, Project, Program, Finance 및 Approval 코드를 조사한다.

## Step 2 — Authoritative Source 우선순위 결정

Manager Type별 Source of Truth와 Source Priority를 정의한다.

## Step 3 — Reporting Line Registry 구축

Platform·Tenant·HRIS·ERP·Directory Registry를 표준화한다.

## Step 4 — Reporting Line Definition·Version 구축

관계 정책과 불변 Version을 분리한다.

## Step 5 — Manager Relationship Type 구축

Direct, Administrative, Functional, Matrix, Project, Regional 및 Financial Manager를 구분한다.

## Step 6 — Manager Relationship·Version 구축

Subject·Position·Organization 기반 관계를 표준화한다.

## Step 7 — Subject·Position·Organization Binding 구축

각 관계 근거를 분리한다.

## Step 8 — Direct Manager Foundation 구축

Primary Direct Manager 규칙을 구현한다.

## Step 9 — Functional·Matrix Manager 구축

Secondary Reporting 관계를 구현한다.

## Step 10 — Project·Program·Regional Manager 구축

업무·지역 기반 관계를 구현한다.

## Step 11 — Cost Center·Profit Center Manager 구축

재무 관리 관계를 연결한다.

## Step 12 — Acting·Temporary·Interim 구축

원래 관계를 보존하면서 대행 관계를 관리한다.

## Step 13 — Co-manager Foundation 구축

복수 관리자 정책 Hook을 구현한다.

## Step 14 — Assignment·Scope·Priority 구축

Manager 관계의 적용 범위와 우선순위를 관리한다.

## Step 15 — Eligibility Foundation 구축

Active 상태, Tenant, Legal Entity, Scope 및 Security 상태를 검증한다.

## Step 16 — Effective Dating 구축

Future·Historical·Retroactive Manager 관계를 지원한다.

## Step 17 — Vacancy·Missing Manager Policy 구축

공석과 단절 경로를 처리한다.

## Step 18 — Supervisory Graph 구축

Subject·Position·Organization Node와 Edge를 생성한다.

## Step 19 — Path·Manager Chain Foundation 구축

Direct·Ancestor·Root Manager 조회 기반을 구현한다.

## Step 20 — Candidate 구축

Approval Chain이 사용할 Manager 후보를 생성한다.

## Step 21 — Self·Cycle Detection 구축

자기 보고와 순환 보고를 차단한다.

## Step 22 — Snapshot 구축

Approval 시점 관계를 불변으로 고정한다.

## Step 23 — Change Impact 구축

진행 중 Task와 Approval Case 영향을 계산한다.

## Step 24 — Reconciliation 구축

HRIS·ERP·IdP·Canonical Drift를 탐지한다.

## Step 25 — Static Lint·Runtime Guard 구축

잘못된 Manager 관계와 Resolution을 차단한다.

## Step 26 — 기존 구현 분류·통합

중복 `manager_id`, Supervisor Table 및 Resolver를 정리한다.

## Step 27 — 문서·ADR·History 갱신

모든 결정·충돌·Migration·남은 위험을 기록한다.

---

# 83. 생성 또는 갱신할 문서

기존 동일 목적 문서가 있으면 통합하라.

* `docs/segmentation/DSAR_REPORTING_LINE_REGISTRY.md`
* `docs/segmentation/DSAR_REPORTING_LINE_AUTHORITATIVE_SOURCE.md`
* `docs/segmentation/DSAR_REPORTING_LINE_DEFINITION.md`
* `docs/segmentation/DSAR_REPORTING_LINE_TYPE.md`
* `docs/segmentation/DSAR_REPORTING_LINE_VERSION.md`
* `docs/segmentation/DSAR_REPORTING_LINE_VERSION_STATUS.md`
* `docs/segmentation/DSAR_SUPERVISORY_HIERARCHY.md`
* `docs/segmentation/DSAR_SUPERVISORY_HIERARCHY_TYPE.md`
* `docs/segmentation/DSAR_SUPERVISORY_HIERARCHY_VERSION.md`
* `docs/segmentation/DSAR_MANAGER_RELATIONSHIP_TYPE.md`
* `docs/segmentation/DSAR_MANAGER_RELATIONSHIP_CATEGORY.md`
* `docs/segmentation/DSAR_MANAGER_RELATIONSHIP.md`
* `docs/segmentation/DSAR_MANAGER_RELATIONSHIP_VERSION.md`
* `docs/segmentation/DSAR_MANAGER_RELATIONSHIP_CHANGE_TYPE.md`
* `docs/segmentation/DSAR_SUBJECT_MANAGER_BINDING.md`
* `docs/segmentation/DSAR_POSITION_MANAGER_BINDING.md`
* `docs/segmentation/DSAR_ORGANIZATION_MANAGER_BINDING.md`
* `docs/segmentation/DSAR_DIRECT_MANAGER.md`
* `docs/segmentation/DSAR_ADMINISTRATIVE_MANAGER.md`
* `docs/segmentation/DSAR_FUNCTIONAL_MANAGER.md`
* `docs/segmentation/DSAR_DOTTED_LINE_MANAGER.md`
* `docs/segmentation/DSAR_PROJECT_MANAGER_RELATIONSHIP.md`
* `docs/segmentation/DSAR_PROGRAM_MANAGER_RELATIONSHIP.md`
* `docs/segmentation/DSAR_REGIONAL_MANAGER_RELATIONSHIP.md`
* `docs/segmentation/DSAR_COUNTRY_MANAGER_RELATIONSHIP.md`
* `docs/segmentation/DSAR_BRAND_MANAGER_RELATIONSHIP.md`
* `docs/segmentation/DSAR_COST_CENTER_MANAGER_RELATIONSHIP.md`
* `docs/segmentation/DSAR_PROFIT_CENTER_MANAGER_RELATIONSHIP.md`
* `docs/segmentation/DSAR_ACTING_MANAGER.md`
* `docs/segmentation/DSAR_TEMPORARY_MANAGER.md`
* `docs/segmentation/DSAR_INTERIM_MANAGER.md`
* `docs/segmentation/DSAR_CO_MANAGER.md`
* `docs/segmentation/DSAR_MANAGER_ASSIGNMENT.md`
* `docs/segmentation/DSAR_MANAGER_ASSIGNMENT_TYPE.md`
* `docs/segmentation/DSAR_MANAGER_ASSIGNMENT_SCOPE.md`
* `docs/segmentation/DSAR_MANAGER_ASSIGNMENT_PRIORITY.md`
* `docs/segmentation/DSAR_MANAGER_ELIGIBILITY_PROFILE.md`
* `docs/segmentation/DSAR_MANAGER_ELIGIBILITY_POLICY.md`
* `docs/segmentation/DSAR_MANAGER_EFFECTIVE_PERIOD.md`
* `docs/segmentation/DSAR_MANAGER_FUTURE_DATED_CHANGE.md`
* `docs/segmentation/DSAR_MANAGER_RETROACTIVE_CORRECTION.md`
* `docs/segmentation/DSAR_MANAGER_AVAILABILITY_REFERENCE.md`
* `docs/segmentation/DSAR_MANAGER_VACANCY.md`
* `docs/segmentation/DSAR_MISSING_MANAGER_POLICY.md`
* `docs/segmentation/DSAR_PARENT_ORGANIZATION_MANAGER_FALLBACK.md`
* `docs/segmentation/DSAR_MANAGER_CONFLICT.md`
* `docs/segmentation/DSAR_MANAGER_CONFLICT_TYPE.md`
* `docs/segmentation/DSAR_MANAGER_CONFLICT_RESOLUTION.md`
* `docs/segmentation/DSAR_SUPERVISORY_GRAPH_NODE.md`
* `docs/segmentation/DSAR_SUPERVISORY_GRAPH_EDGE.md`
* `docs/segmentation/DSAR_SUPERVISORY_PATH.md`
* `docs/segmentation/DSAR_SUPERVISORY_PATH_TYPE.md`
* `docs/segmentation/DSAR_MANAGER_CHAIN_REFERENCE.md`
* `docs/segmentation/DSAR_MANAGER_CANDIDATE.md`
* `docs/segmentation/DSAR_MANAGER_CANDIDATE_EXCLUSION_REASON.md`
* `docs/segmentation/DSAR_MANAGER_CANDIDATE_DEDUPLICATION.md`
* `docs/segmentation/DSAR_MANAGER_RELATIONSHIP_SNAPSHOT.md`
* `docs/segmentation/DSAR_MANAGER_RELATIONSHIP_SNAPSHOT_TYPE.md`
* `docs/segmentation/DSAR_MANAGER_SELF_REPORTING_POLICY.md`
* `docs/segmentation/DSAR_MANAGER_CIRCULAR_REPORTING_DETECTION.md`
* `docs/segmentation/DSAR_MANAGER_CROSS_TENANT_GUARD.md`
* `docs/segmentation/DSAR_MANAGER_CROSS_LEGAL_ENTITY_GUARD.md`
* `docs/segmentation/DSAR_REPORTING_LINE_VALIDATION.md`
* `docs/segmentation/DSAR_MANAGER_SOURCE_PRIORITY.md`
* `docs/segmentation/DSAR_HISTORICAL_MANAGER_RECONSTRUCTION.md`
* `docs/segmentation/DSAR_MANAGER_CHANGE_IMPACT.md`
* `docs/segmentation/DSAR_MANAGER_CLAIMED_TASK_CHANGE_POLICY.md`
* `docs/segmentation/DSAR_REPORTING_LINE_RECONCILIATION.md`
* `docs/segmentation/DSAR_REPORTING_LINE_RECONCILIATION_STATUS.md`
* `docs/segmentation/DSAR_REPORTING_LINE_CRITICAL_GAP_POLICY.md`
* `docs/segmentation/DSAR_REPORTING_LINE_STATIC_LINT.md`
* `docs/segmentation/DSAR_REPORTING_LINE_RUNTIME_GUARDS.md`
* `docs/segmentation/DSAR_REPORTING_LINE_ERROR_WARNING_CONTRACT.md`
* `docs/segmentation/DSAR_REPORTING_LINE_EVIDENCE.md`
* `docs/segmentation/DSAR_REPORTING_LINE_AUDIT_EVENT.md`
* `docs/segmentation/DSAR_REPORTING_LINE_API_CONTRACT.md`
* `docs/segmentation/DSAR_REPORTING_LINE_INDEX_PERFORMANCE.md`
* `docs/segmentation/DSAR_REPORTING_LINE_CACHE_POLICY.md`
* `docs/segmentation/DSAR_REPORTING_LINE_EXISTING_IMPLEMENTATION.md`
* `docs/segmentation/DSAR_REPORTING_LINE_DUPLICATE_IMPLEMENTATION_AUDIT.md`
* `docs/segmentation/DSAR_REPORTING_LINE_FUNCTION_REGRESSION_GATE.md`
* `docs/architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md`
* `docs/pm/PM_CHANGE_HISTORY.md`
* `docs/pm/REPEAT_PROBLEM_HISTORY.md`
* `docs/pm/AGENT_EXECUTION_HISTORY.md`

---

# 84. Reporting Line Matrix

| Subordinate | Position | Organization | Manager | Manager Position | Relationship | Primary | Effective Period | Source | Status |
| ----------- | -------- | ------------ | ------- | ---------------- | ------------ | ------- | ---------------- | ------ | ------ |

---

# 85. Manager Assignment Matrix

| Manager | Type | Target | Scope | Acting | Temporary | Interim | Priority | Validity | Status |
| ------- | ---- | ------ | ----- | ------ | --------- | ------- | -------- | -------- | ------ |

---

# 86. Supervisory Path Matrix

| Subordinate | Direct Manager | Level 2 | Level 3 | Root | Chain Type | Depth | Legal Crossings | Conflicts | Status |
| ----------- | -------------- | ------- | ------- | ---- | ---------- | ----- | --------------- | --------- | ------ |

---

# 87. Manager Candidate Matrix

| Subject | Candidate | Relationship | Distance | Scope Match | Legal Entity | Availability | Eligibility | Exclusion | Status |
| ------- | --------- | ------------ | -------- | ----------- | ------------ | ------------ | ----------- | --------- | ------ |

---

# 88. Manager Change Impact Matrix

| Change | Previous Manager | New Manager | Affected Subjects | Active Tasks | Claimed Tasks | Approval Cases | Action | Severity | Status |
| ------ | ---------------- | ----------- | ----------------- | ------------ | ------------- | -------------- | ------ | -------- | ------ |

---

# 89. Reporting Line Reconciliation Matrix

| Subject | Source | Source Manager | Canonical Manager | Effective Date | Difference | Affected Task | Severity | Resolution | Status |
| ------- | ------ | -------------- | ----------------- | -------------- | ---------- | ------------- | -------- | ---------- | ------ |

---

# 90. 검증 게이트

완료 전에 반드시 확인하라.

* Reporting Line Registry가 구축되었는가
* Reporting Line Definition과 Version이 분리되는가
* Active Version이 Immutable한가
* Supervisory Hierarchy와 Version이 구축되는가
* Manager Relationship Type이 Registry화되는가
* Subject·Position·Organization 기반 관계가 분리되는가
* Direct Manager가 Effective-dated인가
* Administrative Manager와 Functional Manager가 구분되는가
* Dotted-line Manager가 Secondary로 처리되는가
* Project·Program Manager가 Resource Scope를 가지는가
* Regional·Country Manager가 Geography Scope를 가지는가
* Cost Center·Profit Center Manager가 Financial Scope를 가지는가
* Acting Manager가 원래 Manager를 삭제하지 않는가
* Temporary Manager에 종료일이 강제되는가
* Interim Manager에 Vacancy Reference가 강제되는가
* Co-manager Policy가 지원되는가
* Manager Assignment Scope와 Priority가 구축되는가
* Eligibility Foundation이 구축되는가
* Manager 관계가 Bitemporal 또는 Effective-dated인가
* Future-dated Manager Change가 지원되는가
* Retroactive Correction이 Version으로 기록되는가
* Vacancy·Missing Manager Policy가 구축되는가
* Supervisory Graph Node·Edge가 구축되는가
* Supervisory Path가 구축되는가
* Manager Chain Reference가 구축되는가
* Manager Candidate가 생성되는가
* Candidate Deduplication이 작동하는가
* Self-reporting이 차단되는가
* Circular Reporting이 차단되는가
* Cross-Tenant Manager가 차단되는가
* Cross-Legal-Entity 관계가 명시적으로 통제되는가
* Manager Snapshot이 생성되는가
* 과거 Manager 관계가 재현되는가
* Manager Change가 Active Task에 미치는 영향이 계산되는가
* HRIS·ERP·IdP·Canonical Reconciliation이 작동하는가
* 최소 Static Lint·Runtime Guard가 작동하는가
* 기존 Reporting 기능의 회귀가 없는가
* 중복 Manager Resolver가 생성되지 않았는가
* ADR·PM·Repeat Problem·Agent History가 갱신되었는가
* 다음 Approval Chain Definition 단계가 실행 가능한가

---

# 91. 완료 보고 형식

다음 순서로 보고하라.

1. Reporting Line Registry 수
2. Reporting Line Definition 수
3. Reporting Line Version 수
4. Active Reporting Line Version 수
5. Supervisory Hierarchy 수
6. Supervisory Hierarchy Version 수
7. Manager Relationship Type 수
8. Manager Relationship 수
9. Manager Relationship Version 수
10. Subject Manager Binding 수
11. Position Manager Binding 수
12. Organization Manager Binding 수
13. Direct Manager 수
14. Administrative Manager 수
15. Functional Manager 수
16. Dotted-line Manager 수
17. Project Manager 수
18. Program Manager 수
19. Regional Manager 수
20. Country Manager 수
21. Brand Manager 수
22. Cost Center Manager 수
23. Profit Center Manager 수
24. Acting Manager 수
25. Temporary Manager 수
26. Interim Manager 수
27. Co-manager Group 수
28. Manager Assignment 수
29. Manager Assignment Scope 수
30. Manager Eligibility Profile 수
31. Manager Vacancy 수
32. Missing Manager Case 수
33. Missing Manager Fallback 성공 수
34. Missing Manager Block 수
35. Supervisory Graph Node 수
36. Supervisory Graph Edge 수
37. Supervisory Path 수
38. Manager Chain Reference 수
39. 최대 Manager Chain Depth
40. Manager Candidate 수
41. Candidate Deduplication 수
42. Candidate Exclusion 수
43. Manager Snapshot 수
44. Self-reporting 탐지 수
45. Self-reporting 차단 수
46. Circular Reporting 탐지 수
47. Circular Reporting 차단 수
48. Primary Manager Conflict 수
49. Source Priority Conflict 수
50. Cross-Tenant Manager 차단 수
51. Cross-Legal-Entity Review 수
52. Terminated Manager Active Task 수
53. Vacant Position Manager 수
54. Future-dated Manager Change 수
55. Retroactive Manager Correction 수
56. Active Task 영향 수
57. Task Reassignment 요청 수
58. Claimed Task 재검증 수
59. Reporting Line Reconciliation Mismatch 수
60. HRIS Manager Mismatch 수
61. ERP Manager Mismatch 수
62. IdP·SCIM Manager Mismatch 수
63. Task Assignee Mismatch 수
64. Static Lint Rule 수
65. Runtime Guard 수
66. Existing Implementation 수
67. Duplicate Implementation 수
68. Migration Required 수
69. Manual Review 수
70. Function Regression 수
71. 생성·갱신한 문서
72. 남은 리스크
73. 다음 Approval Chain Definition & Hierarchical Route Foundation 준비 상태

---

# 92. 완료 조건

다음 조건을 모두 충족해야 이번 블록을 완료로 인정한다.

1. Reporting Line Registry가 구축되었다.
2. Reporting Line Definition이 구축되었다.
3. Reporting Line Version이 구축되었다.
4. Supervisory Hierarchy가 구축되었다.
5. Supervisory Hierarchy Version이 구축되었다.
6. Manager Relationship Type이 구축되었다.
7. Manager Relationship이 구축되었다.
8. Manager Relationship Version이 구축되었다.
9. Subject Manager Binding이 구축되었다.
10. Position Manager Binding이 구축되었다.
11. Organization Manager Binding이 구축되었다.
12. Direct Manager 기반이 구축되었다.
13. Administrative Manager가 구축되었다.
14. Functional Manager가 구축되었다.
15. Dotted-line Manager가 구축되었다.
16. Project Manager가 구축되었다.
17. Program Manager가 구축되었다.
18. Regional Manager가 구축되었다.
19. Country Manager가 구축되었다.
20. Brand Manager가 구축되었다.
21. Cost Center Manager가 구축되었다.
22. Profit Center Manager가 구축되었다.
23. Acting Manager가 구축되었다.
24. Temporary Manager가 구축되었다.
25. Interim Manager가 구축되었다.
26. Co-manager Foundation이 구축되었다.
27. Manager Assignment가 구축되었다.
28. Manager Assignment Scope가 구축되었다.
29. Manager Assignment Priority가 구축되었다.
30. Manager Eligibility Foundation이 구축되었다.
31. Manager Effective Dating이 구축되었다.
32. Future-dated Manager Change가 구축되었다.
33. Retroactive Manager Correction이 구축되었다.
34. Manager Availability Reference가 구축되었다.
35. Manager Vacancy가 구축되었다.
36. Missing Manager Policy가 구축되었다.
37. Manager Conflict가 구축되었다.
38. Supervisory Graph Node가 구축되었다.
39. Supervisory Graph Edge가 구축되었다.
40. Supervisory Path가 구축되었다.
41. Manager Chain Reference가 구축되었다.
42. Manager Candidate가 구축되었다.
43. Candidate Exclusion·Deduplication이 구축되었다.
44. Manager Relationship Snapshot이 구축되었다.
45. Self-reporting Detection이 구축되었다.
46. Circular Reporting Detection이 구축되었다.
47. Cross-Tenant Guard가 구축되었다.
48. Cross-Legal-Entity Guard가 구축되었다.
49. Historical Manager Reconstruction이 가능하다.
50. Manager Change Impact가 구축되었다.
51. Reporting Line Reconciliation이 구축되었다.
52. 최소 Static Lint가 구축되었다.
53. 최소 Runtime Guard가 구축되었다.
54. 기존 Manager·Reporting Line 구현이 분류되었다.
55. 중복 Manager 모델 통합 계획이 작성되었다.
56. 기존 정상 기능의 회귀가 없다.
57. ADR·PM Change History·Repeat Problem·Agent History가 갱신되었다.
58. 다음 Approval Chain Definition & Hierarchical Route Foundation이 사용할 검증된 Reporting Line Foundation이 준비되었다.

---

# 93. 최종 실행 명령

지금 즉시 검증된 Organization Hierarchy & Organizational Graph Foundation 위에 Rebate Reporting Line, Manager Relationship & Supervisory Hierarchy Governance를 구축하라.

기존 Repository, Database, API, HRIS, ERP, IdP, SCIM, Directory, Project System, Program System, Finance Master, Organization Chart, Role System, Approval System 및 Workflow Engine에서 Manager, Supervisor, Reports-to, Position Hierarchy, Department Head, Team Lead, Cost Center Manager, Project Manager, Acting Manager, Temporary Manager, Vacancy 및 Reporting Line History 구현을 전수 조사하라.

동일 목적 Reporting Line Registry, Supervisor Table, Manager Resolver 또는 External Directory가 존재하면 중복 생성하지 말고 Canonical Reporting Line Domain과 Adapter로 통합하라.

Manager와 Approver를 동일시하지 마라.

Manager Relationship은 조직적 감독 관계이며 Approval Authority는 별도 정책과 Authority Matrix에서 검증하도록 하라.

Subject 기반, Position 기반 및 Organization 기반 Manager Relationship을 분리하라.

Direct, Administrative, Functional, Dotted-line, Project, Program, Regional, Country, Brand, Cost Center, Profit Center, Acting, Temporary, Interim, Co-manager 및 Matrix Manager를 서로 다른 Relationship Type으로 관리하라.

하나의 `manager_id` 또는 `reports_to` 필드로 모든 Manager 의미를 표현하지 마라.

Reporting Line Definition, Reporting Line Version, Supervisory Hierarchy, Supervisory Hierarchy Version, Manager Relationship, Manager Relationship Version, Assignment, Scope, Priority, Vacancy, Conflict, Candidate 및 Snapshot을 구축하라.

Active Reporting Line Version과 Manager Relationship Version을 직접 수정하지 말고 새 Version을 생성하라.

각 Manager Relationship에 Tenant, Subordinate Subject·Position·Organization, Manager Subject·Position·Organization, Relationship Type, Relationship Basis, Primary State, Responsibility Scope, Approval Routing Eligibility, Legal Entity Scope, Source, Effective Period 및 Evidence를 기록하라.

동일 유효기간에 여러 Primary Direct Manager 또는 Primary Position Supervisor가 존재하지 못하게 하라.

Matrix Organization에서는 여러 Manager를 허용하되 Type, Scope, Priority 및 Approval Routing Eligibility를 명시하라.

Dotted-line Manager를 Direct Manager로 자동 대체하지 마라.

Functional Manager를 Administrative Manager로 자동 해석하지 마라.

Project·Program Manager는 해당 Resource와 Effective Period 범위 안에서만 Manager Candidate가 되게 하라.

Regional·Country Manager는 명시적인 Region·Country Binding을 사용하라.

Cost Center·Profit Center Manager는 Financial Scope, Legal Entity 및 Currency Reference를 기록하라.

Acting Manager는 원래 Manager를 삭제하지 말고 별도 Assignment로 관리하라.

Acting Manager 관계만으로 원래 Manager의 모든 Approval Authority를 자동 상속하지 마라.

Temporary Manager에는 종료일과 Maximum Duration을 강제하라.

Interim Manager에는 Vacancy Reference를 강제하라.

Co-manager가 존재할 경우 ANY_ONE, ALL, PRIMARY_ONLY, DOMAIN_SPECIFIC, MANUAL_SELECTION 또는 Policy-resolved 처리 Hook을 제공하라.

Manager Assignment에 Relationship Type, Responsibility Scope, Approval Routing Scope, Manager Chain Priority, Source Priority, Acting·Temporary·Interim 상태 및 Effective Period를 기록하라.

Manager Eligibility Profile에 Active Identity, Employment State, Position State, Tenant, Legal Entity, Country, Required Scope, Minimum Job Level, Security Status, Self-exclusion 및 Approval Routing Eligibility를 기록하라.

Manager라고 해서 승인 권한이 있다고 가정하지 말고 Runtime Authorization과 후속 Authority Matrix 검증을 수행하라.

Reporting Line과 Manager Assignment에 Business Valid Time과 System Recorded Time을 적용하라.

Future-dated Direct Manager Change, Position Supervisor Change, Acting Assignment, Temporary Assignment, Interim Assignment, Organization Transfer, Position Transfer, Regional Manager Change 및 Cost Center Manager Change를 예약할 수 있게 하라.

Future Change 활성화 시 Candidate Cache, Supervisory Path, Active Task, Approval Chain Reference 및 Notification Recipient 영향을 계산하라.

Retroactive Manager Correction 시 기존 Relationship Version, Snapshot, Task Assignment 및 Decision Evidence를 덮어쓰지 말고 Correction Version과 Reconciliation을 생성하라.

Manager Availability Reference에 Available, Leave, Out-of-office, Suspended, Terminated 및 Security-blocked 상태를 기록하라.

상세 Delegation과 Substitute는 후속 전용 블록에서 구현하고 이번 단계에서는 Reference Hook만 구축하라.

Position Vacancy, Manager Termination, Organization Head Missing 및 Source Data Missing을 Manager Vacancy로 관리하라.

Missing Manager Policy에서 Position Supervisor, Organization Head, Parent Organization Manager, Functional Manager, Acting Manager, Interim Manager, Fallback Role, Manual Review 및 Block을 지원하라.

Parent Organization Manager Fallback에 Maximum Hierarchy Climb, Legal Entity Boundary 및 Eligibility 검증을 적용하라.

무제한 Root Traversal을 허용하지 마라.

Subject, Position 및 Organization을 Supervisory Graph Node로 표현하고 Manager Relationship을 Edge로 표현하라.

Graph Edge 방향을 Repository 전체에서 표준화하라.

Direct, Primary, Administrative, Functional, Matrix, Project, Regional, Financial 및 Approval-eligible Supervisory Path를 생성하라.

Self-reporting, A→B→A 및 다단계 Circular Reporting을 차단하라.

Cycle 탐지 시 관계 활성화, 신규 Manager Resolution 및 관련 Approval Assignment를 차단하라.

다른 Tenant Subject, Position 또는 Organization을 일반 Manager로 지정하지 못하게 하라.

Shared Service Cross-Tenant 관계가 필요한 경우 Contract, Trust Policy, Allowed Scope, Authorization, Effective Period 및 Evidence를 요구하라.

Cross-Legal-Entity Manager 관계에는 Group Function, Shared Service, Regional Leadership 또는 Intercompany 근거를 기록하라.

Cross-Legal-Entity Manager에게 Financial Approval Authority를 자동 부여하지 마라.

Manager Candidate에 Subordinate, Approval Request, Approval Case, Requirement, Resource, Effective Date, Candidate Subject·Position·Organization, Relationship Type, Source Priority, Assignment Priority, Chain Distance, Scope Match, Legal Entity Relationship, Availability, Eligibility, Exclusion Reason 및 Conflict를 기록하라.

동일 Subject가 여러 Manager 경로로 Candidate가 된 경우 중복 Task 생성을 방지하고 Candidate Source를 통합하라.

각 Approval Requirement가 별도 Manager Type을 요구하는 경우 Requirement Binding은 분리하여 유지하라.

Approval Request, Case, Manager Resolution, Approval Chain Build, Task Assignment, Task Claim 및 Decision 시점에 Immutable Manager Relationship Snapshot을 생성하라.

Snapshot에 Reporting Line Version, Supervisory Hierarchy Version, Manager Relationship Version, Position, Employment, Organization Hierarchy Version, Assignment Scope, Source Version, Legal Entity Relationship, Supervisory Path, Availability, Eligibility 및 Immutable Hash를 기록하라.

현재 Reporting Line으로 과거 Approval Snapshot을 재작성하지 마라.

Manager Relationship 변경 시 Active Task, Available Candidate, Claimed Task, Pending Approval Chain, SLA Owner, Escalation Owner, Delegation Reference 및 Notification Recipient 영향을 계산하라.

완료된 Approval Decision은 Manager 변경으로 수정하지 마라.

미Claim Task는 정책에 따라 Candidate를 재평가하고, Claim된 Task는 Revalidate, Release, Keep 또는 Block 정책을 적용하라.

Terminated Manager, Security Suspended Manager, Cross-Tenant Drift 및 Legal Entity Critical Change는 Active Task Runtime Guard를 실행하라.

HRIS Manager, HRIS Position Supervisor, ERP Personnel Manager, IdP Manager, SCIM Manager, Directory Manager, Organization Head, Department Head, Cost Center Manager, Profit Center Manager, Project Manager, Program Manager, Regional Manager 및 Country Manager를 Canonical Reporting Line과 Reconciliation하라.

Cross-Tenant Manager, Self-reporting, Circular Reporting, Multiple Primary Manager, Terminated Manager Active Task, Vacant Position Manager, 무기한 Temporary Assignment, Vacancy 없는 Interim Manager, Snapshot 누락, Source Priority Conflict, Manager Chain 단절 및 Task Assignee Drift를 Critical Gap으로 생성하라.

Tenant 없는 관계, Relationship Type 없는 관계, Effective Period 오류, Self-reporting, Circular Reporting, Primary 중복, Cross-Tenant 관계, Active Version 직접 수정, History 덮어쓰기, Snapshot 수정, 이름·이메일 기반 Join 및 Approval Authority 자동 부여를 Static Lint에서 차단하라.

Inactive Relationship, Expired Assignment, Inactive Manager, Vacant Position, Tenant·Legal Entity 위반, Self·Cycle, Primary Conflict, Source Conflict, Eligibility Failure, Availability Block, Missing Manager Policy Exhaustion, Maximum Climb 초과, Snapshot 오류 및 Critical Reconciliation Drift를 Runtime Guard로 차단하라.

기존 HRIS Sync, ERP Sync, IdP·SCIM Sync, Organization Chart, Team Lead, Department Head, Role Assignment, Approval Workflow Task 및 Notification 기능과 Legacy Equivalence를 수행하라.

기존 정상 기능을 유지하면서 중복 Manager Table, 중복 Resolver, 현재 Manager만 저장하는 모델, Acting Manager 덮어쓰기, 무기한 Temporary Manager, Circular Query 및 이름 기반 Mapping을 제거하거나 Canonical Adapter로 전환하라.

모든 Reporting Line Registry, Definition, Version, Supervisory Hierarchy, Manager Relationship, Assignment, Scope, Priority, Eligibility, Availability, Vacancy, Conflict, Path, Candidate, Snapshot, Change Impact, Reconciliation, 중복 구현 및 남은 위험을 ADR, PM Change History, Repeat Problem History 및 Agent Execution History에 기록하라.

다음 단계인 **EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-3-3 — Rebate Approval Chain Definition & Hierarchical Route Foundation Governance**를 구현할 수 있는 검증된 Reporting Line, Manager Relationship & Supervisory Hierarchy Foundation을 완성하라.

다음 순서는 **Part 5-3-3-3 — Approval Chain Definition & Hierarchical Route Foundation Governance**입니다.
