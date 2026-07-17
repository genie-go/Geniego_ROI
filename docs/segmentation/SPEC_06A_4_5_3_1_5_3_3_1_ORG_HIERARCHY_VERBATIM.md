# 스펙 원문 영속 (Verbatim) — EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-3-1

> **Rebate Organization Hierarchy & Organizational Graph Foundation Governance · Version 1.0**
> 289차(2026-07-17) 수령분 · **원문 그대로 · 코드변경 0**
> 상위 블록: `5-3-3` Multi-Level Approval & Hierarchical Approval Governance (**14블록 분할** — 본 문서 §상단)
> 선행: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) · [`SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md)

## 🔴 원문 영속 우선 — 289차 확립 규칙

**1-6 D-3**: *"`source_persisted = false` 인 요구는 분모에 넣을 수 없다. **세션 컨텍스트는 저장소가 아니다.**"*

289차 5-3-1 에서 **3단계 오류**가 실증됐다:
1. **개수만 적고 "영속했다"고 판단** → 항목명은 저장소에 없었다
2. **그 개수마저 25축이 틀렸다**(필드 19축이 전부 `evidence` 누락 — **손으로 세면 "일관되게" 틀린다**)
3. ★**개수가 맞아도 항목명이 날조였다**(`REQUIREMENT_TYPE` 20/20 개수 일치인데 **축 자체가 다름**)

> ★**결론: 개수 검증만으로 날조를 못 잡는다. 분모 검증은 항목명 원문 대조여야 한다.**
> **그래서 이 파일이 설계·조사보다 먼저 작성됐다.** 이 파일이 `source_persisted = true` 의 실체이며,
> **인용 근거는 항상 이 원문**이다. 개수를 인용해야 하면 **이 파일을 직접 세라**(집계본을 베끼지 말 것).

## ⚠️ 순서 관련 인계 사항 (289차 기록)

**인계서(f7dddb9a55a)는 1순위를 `5-3-2` 본작업**(Workflow Definition & Flow Execution Engine)으로 기록했다.
**`5-3-2` 는 스펙 원문만 영속됐고 DSAR 85편(§75)은 미착수**다. 본 블록(`5-3-3-1`)은 그보다 **뒤 순서**이나
사용자 지시로 먼저 수령됐다. **`5-3-2` 미완 상태를 "완료"로 읽지 말 것** — `5-3-3` 스펙 §1 은
`5-3-2` 를 "완료"로 표기하나 **저장소 실측은 계약 문서 0편**이다(스펙의 진행 표기 ≠ 저장소 실측).

---

## 권장 세부 분할 구조 (5-3-3 전체 · 14블록)

전체 Multi-Level Approval & Hierarchical Approval Governance를 다음 14개 블록으로 분할하여 순차적으로 구현하라.

### `5-3-3-1` **Organization Hierarchy & Organizational Graph Foundation**

Organization Hierarchy · Organization Graph · Hierarchy Node·Edge · Business Unit · Division · Department · Team · Squad · Legal Entity · Brand · Region · Country · Store · Merchant · Vendor · Partner · Cost Center · Profit Center · Matrix Organization · Effective Dating · Hierarchy Version

### `5-3-3-2` **Reporting Line, Manager Relationship & Supervisory Hierarchy Governance**

Direct Manager · Functional Manager · Administrative Manager · Dotted-line Manager · Project Manager · Acting Manager · Temporary Manager · Skip-level Manager · Executive Reporting Line · Manager-of-manager Resolution · Circular Reporting Detection

### `5-3-3-3` **Approval Chain Definition & Hierarchical Route Foundation**

Approval Chain · Approval Level · Approval Stage · Approval Route · Hierarchy-based Routing · Chain Version · Chain Template · Chain Resolution · Chain Override · Chain Conflict

### `5-3-3-4` **Approval Authority Matrix & Delegation of Authority Foundation**

Authority Matrix · Delegation of Authority · Authority Limit · Monetary Authority · Currency Authority · Transaction Authority · Legal Entity Authority · Program Authority · Product Authority · Regional Authority · Effective Authority

### `5-3-3-5` **Manager Resolution, Approver Candidate & Eligibility Engine**

Manager Resolver · Candidate Resolver · Role Resolver · Resource Owner Resolver · Cost Center Owner Resolver · Budget Owner Resolver · Program Owner Resolver · Legal Entity Officer Resolver · Eligibility Check · Candidate Ranking · Candidate Exclusion

### `5-3-3-6` **Multi-Level Sequential Approval Execution Governance**

Level-by-level Approval · Sequential Chain · Previous-level Completion · Next-level Activation · Level Skip · Level Re-entry · Return-to-previous-level · Reapproval · Chain Termination · Sequential Evidence

### `5-3-3-7` **Skip-Level, Executive & Exceptional Hierarchy Routing Governance**

Skip-level Approval · Executive Approval · CEO·CFO·COO·CLO Approval · Board-level Reference · Seniority Routing · Missing Manager Handling · Self-approval Avoidance · Vacant Position Handling · Exceptional Route · Fallback Route

### `5-3-3-8` **Matrix Organization & Multi-Manager Approval Governance**

Functional Manager · Regional Manager · Business Manager · Project Manager · Dual Reporting · Triple Reporting · Matrix Approval · Mandatory Manager Set · Optional Manager Set · Manager Conflict · Matrix Resolution

### `5-3-3-9` **Committee, Panel, Quorum & Consensus Approval Foundation**

Committee · Approval Panel · Voting Member · Chair · Secretary · Quorum · Majority · Supermajority · Unanimous Consent · Consensus · Abstention · Tie-breaking

### `5-3-3-10` **Cross-Entity, Cross-Region & Global Approval Governance**

Cross-Legal Entity · Intercompany · Regional · Country · Global · Headquarters · Subsidiary · Branch · Joint Venture · Partner Entity · Cross-currency · Cross-border Control

### `5-3-3-11` **Hierarchy Snapshot, Effective Dating & Historical Resolution Governance**

Hierarchy Snapshot · Approval-time Snapshot · Historical Manager · Historical Authority · Effective Dating · Future-dated Hierarchy · Retroactive Change · Version Resolution · Snapshot Immutability · Historical Reconstruction

### `5-3-3-12` **Hierarchy Change, Transfer, Reorganization & Migration Governance**

Employee Transfer · Department Transfer · Legal Entity Transfer · Organization Merge · Organization Split · Reorganization · Manager Change · Position Change · Workflow Impact · In-flight Approval Migration · Reassignment · Grandfathering

### `5-3-3-13` **Hierarchy Conflict, Drift, Reconciliation & Runtime Resolution Governance**

Hierarchy Conflict · Manager Conflict · Authority Conflict · Scope Conflict · Missing Hierarchy · Stale Hierarchy · HRIS Drift · IdP Drift · ERP Drift · Runtime Resolution · Reconciliation · Manual Review

### `5-3-3-14` **Hierarchical Approval Audit, Evidence, Static Lint, Runtime Guard & Production Certification**

Audit · Evidence · Lineage · Static Lint · Runtime Guard · Security Test · Regression Test · Performance Test · Chaos Test · Production Certification · ADR · PM History · Repeat Problem History · Agent Execution History

---

# 0. 작업 목적

앞 단계에서 구축한 다음 기반 위에 승인 계층을 결정하는 Canonical Organization Hierarchy와 Organizational Graph Foundation을 구축하라.

* Rebate Authorization Foundation
* RBAC·ABAC·PBAC
* Tenant·Workspace·Organization·Scope Governance
* Canonical Approval Foundation
* Approval Workflow Definition
* Flow Execution Engine

이번 단계에서는 조직의 구성 요소와 관계, 계층, Graph, Version 및 Effective Period를 표준화한다.

이번 단계는 구체적인 Manager Resolution, Approval Chain Execution, Authority Matrix, Sequential Approval, Committee Approval 또는 Production Certification을 완성하는 단계가 아니다.

후속 계층형 승인 기능이 신뢰할 수 있는 조직 구조를 사용하도록 다음을 완성한다.

* Organization Registry
* Organization Unit
* Organization Hierarchy
* Organization Graph
* Hierarchy Node
* Hierarchy Edge
* Hierarchy Path
* Hierarchy Level
* Hierarchy Version
* Organization Type
* Organization Relationship Type
* Legal Entity Hierarchy
* Business Unit Hierarchy
* Division Hierarchy
* Department Hierarchy
* Team·Squad Hierarchy
* Region·Country Hierarchy
* Brand·Store·Merchant Hierarchy
* Vendor·Partner Relationship
* Cost Center·Profit Center Relationship
* Position Unit Foundation
* Matrix Organization Foundation
* Effective Dating
* Future-dated Relationship
* Historical Relationship
* Organization Snapshot
* Hierarchy Validation
* Hierarchy Candidate
* Hierarchy Reconciliation
* Hierarchy Evidence
* Hierarchy Audit

다음 질문에 정확히 답할 수 있어야 한다.

* 특정 사용자는 어느 조직에 속하는가
* 해당 조직의 상위 조직은 무엇인가
* Tenant와 Organization은 어떤 관계인가
* Workspace와 Organization은 어떤 관계인가
* Legal Entity와 Business Unit은 어떻게 구분되는가
* Department와 Team은 어느 Division 아래에 있는가
* 특정 조직이 어느 Country·Region에 속하는가
* 특정 Brand가 어느 Legal Entity에 속하는가
* 특정 Store·Merchant·Vendor는 어느 조직과 연결되는가
* Cost Center와 Profit Center의 책임 조직은 어디인가
* 한 조직이 여러 상위 조직을 가질 수 있는가
* Matrix Organization 관계는 어떻게 표현되는가
* Primary Hierarchy와 Functional Hierarchy는 어떻게 구분되는가
* 특정 날짜에 유효한 조직 구조는 무엇인가
* 미래에 적용될 조직 개편이 등록되어 있는가
* 과거 승인 당시의 조직 구조를 재현할 수 있는가
* 조직 관계가 순환하거나 단절되어 있는가
* 다른 Tenant의 조직이 연결되어 있는가
* 다른 Legal Entity의 조직이 잘못 병합되어 있는가
* HRIS·ERP·IdP·내부 Registry의 조직 구조가 일치하는가
* 조직 구조가 변경되면 진행 중 승인에 어떤 영향을 주는가
* 승인자는 현재 조직이 아니라 승인 시점 조직을 기준으로 검증되는가
* 고객사가 자신의 조직 구조를 안전하게 등록할 수 있는가

---

# 1. 구현 범위

이번 블록에서는 다음을 구현한다.

1. Organization Registry
2. Organization Unit Registry
3. Organization Type Registry
4. Organization Relationship Type Registry
5. Organization Hierarchy
6. Organization Graph
7. Organization Graph Node
8. Organization Graph Edge
9. Organization Path
10. Organization Level
11. Hierarchy Version
12. Hierarchy Effective Period
13. Tenant Hierarchy
14. Workspace Hierarchy
15. Legal Entity Hierarchy
16. Business Unit Hierarchy
17. Division Hierarchy
18. Department Hierarchy
19. Team·Squad Hierarchy
20. Region·Country Hierarchy
21. Brand Hierarchy
22. Store·Merchant Relationship
23. Vendor·Partner Relationship
24. Cost Center Relationship
25. Profit Center Relationship
26. Position Unit Foundation
27. Matrix Organization Foundation
28. Organization Ownership
29. Organization Membership Foundation
30. Organization Scope Binding
31. Organization Lifecycle
32. Organization Snapshot
33. Hierarchy Candidate
34. Hierarchy Reconciliation
35. 기본 Static Lint
36. 기본 Runtime Guard
37. Evidence·Audit
38. 기존 구현 분류
39. 중복 구현 감사
40. ADR·PM·Repeat Problem·Agent History

이번 블록에서는 다음을 상세 구현하지 않는다.

* 실제 Direct Manager Resolution
* Manager-of-manager Resolution
* Approval Chain 계산
* Approval Authority Matrix
* Monetary Approval Threshold
* Sequential Approval 실행
* Committee Voting
* Delegation·Substitute
* SLA·Escalation
* Emergency Approval
* 전체 Production Certification

후속 블록이 사용할 Canonical Contract와 Hook만 준비한다.

---

# 2. 실행 역할

너는 다음 역할을 동시에 수행한다.

* Enterprise Organization Architecture 책임자
* Organization Hierarchy Architect
* Organizational Graph Architect
* Tenant Hierarchy 책임자
* Workspace Hierarchy 책임자
* Legal Entity Hierarchy 책임자
* Business Unit·Division 책임자
* Department·Team·Squad 책임자
* Region·Country Hierarchy 책임자
* Brand·Store·Merchant 구조 책임자
* Vendor·Partner 관계 책임자
* Cost Center·Profit Center 책임자
* Matrix Organization Foundation 책임자
* Organization Effective Dating 책임자
* Historical Organization Resolution 책임자
* Organization Snapshot 책임자
* Organization Graph Integrity 책임자
* Cross-Tenant Isolation 책임자
* Cross-Legal-Entity Boundary 책임자
* HRIS·ERP·IdP Organization Adapter 책임자
* Hierarchy Reconciliation 책임자
* Evidence·Audit·Lineage 책임자
* 기존 조직 구현의 비파괴적 통합 책임자
* ADR·PM History 관리 책임자

---

# 3. 선행조건

작업 전 다음 구현을 확인하라.

## 3.1 Tenant·Workspace·Organization 기반

* Tenant Registry
* Workspace Registry
* Organization Registry
* Organization Relationship Graph
* Business Unit Registry
* Division Registry
* Department Registry
* Team Registry
* Group Registry
* Legal Entity Registry
* Country Registry
* Region Registry
* Brand Registry
* Store Registry
* Merchant Registry
* Vendor Registry
* Partner Registry
* Cost Center Registry
* Profit Center Registry
* Position Registry가 존재하는 경우
* Employment Registry
* Contractor Registry
* External Party Registry

## 3.2 Authorization 기반

* `AUTHORIZATION_SUBJECT`
* `AUTHORIZATION_RESOURCE`
* `AUTHORIZATION_SCOPE`
* `AUTHORIZATION_SCOPE_BINDING`
* `AUTHORIZATION_ROLE`
* `AUTHORIZATION_SUBJECT_ROLE`
* `REBATE_ROLE_ASSIGNMENT`
* `REBATE_ROLE_ASSIGNMENT_SCOPE`
* Tenant Isolation Policy
* Legal Entity Scope Policy
* Environment Scope Policy

## 3.3 Approval 기반

* `APPROVAL_REQUEST`
* `APPROVAL_CASE`
* `APPROVAL_ITEM`
* `APPROVAL_REQUIREMENT`
* `APPROVAL_PARTICIPANT`
* `APPROVAL_ACTOR`
* `APPROVAL_ACTOR_AUTHORIZATION_SNAPSHOT`
* `APPROVAL_WORKFLOW_DEFINITION`
* `APPROVAL_WORKFLOW_VERSION`
* `APPROVAL_WORKFLOW_INSTANCE`
* `APPROVAL_WORKFLOW_TASK`
* `APPROVAL_WORKFLOW_ASSIGNMENT_RULE_REFERENCE`

## 3.4 외부 Source 조사

다음을 전수 조사하라.

* HRIS Organization Data
* ERP Organization Data
* IdP Group Structure
* SCIM Group Structure
* CRM Account Hierarchy
* Finance Legal Entity Structure
* Finance Cost Center Structure
* Finance Profit Center Structure
* Treasury Entity Structure
* Payroll Organization
* Procurement Organization
* Sales Organization
* Marketing Organization
* Regional Organization
* Country Organization
* Brand Organization
* Store Organization
* Merchant Organization
* Vendor Organization
* Partner Organization
* Existing Org Chart
* Existing Reporting Line
* Existing Department Tree
* Existing Business Unit Tree
* Existing Tenant Organization Mapping
* Existing Workspace Organization Mapping
* Existing Legal Entity Mapping
* Existing Region·Country Mapping
* Existing Position Hierarchy
* Existing Manager Fields
* Existing Matrix Reporting
* Existing Organization Version
* Existing Effective Date
* Existing Organization Snapshot
* Existing Graph Database
* Existing Closure Table
* Existing Materialized Path
* Existing Nested Set
* Existing Adjacency List
* Existing Tree Traversal API
* Existing Organization Cache
* Existing Organization Audit
* Git 이력
* Migration 이력
* 운영 로그
* 테스트 결과

동일 목적 모델이 있으면 새 모델을 무조건 만들지 말고 Canonical Organization Graph로 통합하라.

---

# 4. 핵심 원칙

## 4.1 Organization과 Legal Entity를 동일시하지 않는다

Legal Entity는 법적·회계적 주체다.

Organization Unit은 운영·업무·관리 구조다.

하나의 Legal Entity에 여러 Organization Unit이 존재할 수 있다.

## 4.2 Organization Tree만으로 제한하지 않는다

실제 기업 조직은 다음 구조를 동시에 가질 수 있다.

* Administrative Hierarchy
* Functional Hierarchy
* Financial Hierarchy
* Legal Entity Hierarchy
* Regional Hierarchy
* Brand Hierarchy
* Project Hierarchy
* Matrix Hierarchy

따라서 단일 Parent ID만으로 모든 조직 관계를 표현하지 마라.

Canonical Organization Graph를 구축하라.

## 4.3 Primary Hierarchy와 Secondary Relationship을 구분한다

각 Organization Unit은 특정 Hierarchy Type에서 하나의 Primary Parent를 가질 수 있다.

Matrix·Functional·Advisory Relationship은 Secondary Edge로 관리한다.

## 4.4 모든 관계에 Effective Period를 적용한다

조직 관계는 시간이 지나며 변경된다.

`valid_from`, `valid_to`, `recorded_at`을 구분하라.

## 4.5 과거 데이터를 현재 구조로 재해석하지 않는다

과거 승인 당시의 조직·Legal Entity·Department 구조를 당시 Version과 Snapshot으로 재현한다.

## 4.6 Cross-Tenant Edge를 금지한다

다른 Tenant의 Organization Unit 간 직접 Parent·Child 또는 Membership Edge를 생성하지 마라.

Platform-level Shared Reference는 별도 Registry Reference로 관리한다.

## 4.7 Cross-Legal-Entity Relationship을 명시한다

다른 Legal Entity에 속한 Organization 간 관계는 `INTERCOMPANY`, `SHARED_SERVICE`, `MATRIX`, `ADVISORY` 등 명시적 Relationship Type을 사용한다.

일반 Parent·Child로 자동 병합하지 마라.

## 4.8 삭제보다 비활성화와 유효기간 종료를 사용한다

조직 개편으로 제거되는 Unit과 Edge를 물리적으로 삭제하지 말고 종료·대체·보관 상태로 전환한다.

## 4.9 이름으로 조직을 식별하지 않는다

Organization ID, Organization Code, Source System Reference 및 Version을 사용한다.

## 4.10 조직 Graph 변경은 승인·감사 가능해야 한다

Production Organization Hierarchy 변경은 변경자, 근거, Effective Date, Impact 및 Evidence를 기록한다.

---

# 5. Canonical Entity

기존 동등 Entity가 없을 경우 최소 다음 Entity를 구축하라.

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
* `ORGANIZATION_EFFECTIVE_PERIOD`
* `ORGANIZATION_TENANT_BINDING`
* `ORGANIZATION_WORKSPACE_BINDING`
* `ORGANIZATION_LEGAL_ENTITY_BINDING`
* `ORGANIZATION_BUSINESS_UNIT_PROFILE`
* `ORGANIZATION_DIVISION_PROFILE`
* `ORGANIZATION_DEPARTMENT_PROFILE`
* `ORGANIZATION_TEAM_PROFILE`
* `ORGANIZATION_SQUAD_PROFILE`
* `ORGANIZATION_REGION_PROFILE`
* `ORGANIZATION_COUNTRY_PROFILE`
* `ORGANIZATION_BRAND_PROFILE`
* `ORGANIZATION_STORE_PROFILE`
* `ORGANIZATION_MERCHANT_PROFILE`
* `ORGANIZATION_VENDOR_PROFILE`
* `ORGANIZATION_PARTNER_PROFILE`
* `ORGANIZATION_COST_CENTER_BINDING`
* `ORGANIZATION_PROFIT_CENTER_BINDING`
* `ORGANIZATION_POSITION_UNIT`
* `ORGANIZATION_MATRIX_RELATIONSHIP`
* `ORGANIZATION_OWNER`
* `ORGANIZATION_MEMBERSHIP`
* `ORGANIZATION_SCOPE_BINDING`
* `ORGANIZATION_LIFECYCLE_EVENT`
* `ORGANIZATION_SNAPSHOT`
* `ORGANIZATION_GRAPH_VALIDATION`
* `ORGANIZATION_HIERARCHY_CANDIDATE`
* `ORGANIZATION_HIERARCHY_RECONCILIATION`
* `ORGANIZATION_HIERARCHY_EVIDENCE`
* `ORGANIZATION_HIERARCHY_AUDIT_EVENT`

공통 Organization Platform이 존재하면 Rebate 전용 조직 테이블을 별도로 복제하지 마라.

Rebate Approval Domain이 공통 Organization Graph를 참조하도록 구현하라.

---

# 6. Organization Registry

`ORGANIZATION_REGISTRY`

필수 필드:

* organization_registry_id
* tenant_id
* registry_code
* registry_name
* registry_type
* authoritative_source
* source priority
* supported hierarchy types
* effective dating support
* historical support
* matrix support
* external reference support
* synchronization mode
* synchronization frequency
* owner
* active version
* valid_from
* valid_to
* status
* evidence

Registry Type:

* PLATFORM
* TENANT
* LEGAL_ENTITY
* HRIS
* ERP
* FINANCE
* CRM
* REGIONAL
* BRAND
* PARTNER
* CUSTOM

Authoritative Source 후보:

* HRIS
* ERP
* FINANCE_MASTER
* TENANT_ADMIN
* PLATFORM_ADMIN
* CRM
* EXTERNAL_DIRECTORY
* MANUAL_GOVERNED
* MIGRATED
* CUSTOM

---

# 7. Organization Unit

`ORGANIZATION_UNIT`

필수 필드:

* organization_unit_id
* organization_registry_id
* tenant_id
* organization_code
* organization_name
* display_name
* organization_type_id
* organization_category
* description
* primary legal entity id
* primary business unit id
* primary region id
* primary country code
* primary workspace id
* parent reference for compatibility only
* authoritative source
* external source id
* source version
* owner subject
* active version
* valid_from
* valid_to
* created_at
* updated_at
* status
* evidence

`parent reference for compatibility only`를 Canonical Graph Source of Truth로 사용하지 마라.

---

# 8. Organization Category

지원 Category:

* ENTERPRISE
* HOLDING_COMPANY
* CORPORATE_GROUP
* LEGAL_ENTITY
* SUBSIDIARY
* BRANCH
* BUSINESS_UNIT
* DIVISION
* DEPARTMENT
* TEAM
* SQUAD
* PROJECT
* PROGRAM
* FUNCTION
* SHARED_SERVICE
* REGION
* COUNTRY
* AREA
* TERRITORY
* BRAND
* PRODUCT_LINE
* STORE
* MERCHANT
* SELLER
* VENDOR
* PARTNER
* DISTRIBUTOR
* DEALER
* RESELLER
* COST_CENTER
* PROFIT_CENTER
* POSITION_UNIT
* COMMITTEE_REFERENCE
* VIRTUAL_ORGANIZATION
* CUSTOM

---

# 9. Organization Unit Version

`ORGANIZATION_UNIT_VERSION`

필수 필드:

* organization_unit_version_id
* organization_unit_id
* version_number
* previous_version_id
* organization name
* organization type
* organization category
* legal entity
* business unit
* region
* country
* workspace
* owner
* changed fields
* change reason
* source version
* effective_from
* effective_to
* recorded_at
* recorded_by
* immutable_hash
* status
* evidence

Version Type:

* INITIAL
* NAME_CHANGE
* TYPE_CHANGE
* OWNERSHIP_CHANGE
* LEGAL_ENTITY_CHANGE
* REGIONAL_CHANGE
* ORGANIZATION_TRANSFER
* MERGE
* SPLIT
* REORGANIZATION
* CORRECTION
* MIGRATION
* RESTORATION
* RETIREMENT

---

# 10. Organization Type Registry

`ORGANIZATION_TYPE`

필수 필드:

* organization_type_id
* type_code
* type_name
* category
* tenant configurable 여부
* hierarchical 여부
* legal entity required 여부
* country required 여부
* parent type constraints
* child type constraints
* allowed relationship types
* approval hierarchy eligible 여부
* manager hierarchy eligible 여부
* authority matrix eligible 여부
* financial scope eligible 여부
* status
* evidence

---

# 11. Organization Relationship Type

`ORGANIZATION_RELATIONSHIP_TYPE`

지원 Relationship Type:

* PARENT_OF
* CHILD_OF
* REPORTS_THROUGH
* FUNCTIONALLY_ALIGNED_TO
* ADMINISTRATIVELY_ALIGNED_TO
* FINANCIALLY_OWNED_BY
* LEGALLY_OWNED_BY
* OPERATED_BY
* MANAGED_BY
* SUPPORTED_BY
* SHARED_SERVICE_FOR
* LOCATED_IN
* BELONGS_TO_REGION
* BELONGS_TO_COUNTRY
* BRAND_OWNED_BY
* STORE_OPERATED_BY
* MERCHANT_MANAGED_BY
* VENDOR_FOR
* PARTNER_OF
* COST_CENTER_OF
* PROFIT_CENTER_OF
* PROJECT_SPONSORED_BY
* MATRIX_REPORTS_TO
* ADVISORY_TO
* INTERCOMPANY_RELATION
* JOINT_VENTURE_RELATION
* DELEGATED_OPERATION
* TEMPORARILY_ATTACHED_TO
* REPLACES
* MERGED_INTO
* SPLIT_FROM
* CUSTOM

필수 필드:

* relationship_type_id
* relationship_code
* relationship_name
* relationship category
* directional 여부
* inverse relationship type
* transitive 여부
* hierarchy forming 여부
* cycle allowed 여부
* cross legal entity allowed 여부
* cross tenant allowed 여부
* approval routing eligible 여부
* manager resolution eligible 여부
* effective dating required 여부
* maximum parent count
* maximum child count
* status
* evidence

---

# 12. Organization Hierarchy

`ORGANIZATION_HIERARCHY`

필수 필드:

* organization_hierarchy_id
* organization_registry_id
* tenant_id
* hierarchy_code
* hierarchy_name
* hierarchy_type
* hierarchy purpose
* root organization unit
* legal entity scope
* workspace scope
* country scope
* environment scope
* primary hierarchy 여부
* matrix enabled 여부
* multiple roots allowed 여부
* maximum depth
* authoritative source
* owner
* active version
* valid_from
* valid_to
* status
* evidence

Hierarchy Type:

* CORPORATE
* LEGAL_ENTITY
* ADMINISTRATIVE
* FUNCTIONAL
* FINANCIAL
* MANAGEMENT
* APPROVAL
* REGIONAL
* COUNTRY
* BRAND
* SALES
* MARKETING
* PROCUREMENT
* TREASURY
* COST_CENTER
* PROFIT_CENTER
* PROJECT
* MATRIX
* PARTNER
* CUSTOM

---

# 13. Hierarchy Version

`ORGANIZATION_HIERARCHY_VERSION`

필수 필드:

* organization_hierarchy_version_id
* organization_hierarchy_id
* version_number
* previous_version_id
* root nodes
* node count
* edge count
* maximum depth
* structural changes
* affected organization units
* affected users
* affected role assignments
* affected approval workflows
* affected active approval cases
* source version
* effective_from
* effective_to
* recorded_at
* recorded_by
* reviewed_by
* approved_by reference
* immutable_hash
* migration policy
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
* DEPRECATED
* SUSPENDED
* ARCHIVED
* BLOCKED

---

# 14. Hierarchy Version Migration Policy

지원 정책:

* NEW_RESOLUTIONS_ONLY
* NEW_APPROVAL_CASES_ONLY
* ACTIVE_CASES_KEEP_SNAPSHOT
* ACTIVE_CASES_REEVALUATE
* SELECTED_CASES_MIGRATE
* ALL_ELIGIBLE_CASES_MIGRATE
* MANUAL_REVIEW
* BLOCK_NEW_APPROVALS
* CUSTOM

기본값은 다음과 같이 설정하라.

* 과거 완료 승인: 기존 Snapshot 유지
* 진행 중 승인: 기존 Snapshot 유지
* 새로운 승인: 새 Active Hierarchy Version 사용
* Critical Security Change: 명시적 재평가 Hook
* Cross-Legal-Entity 변경: Manual Review
* Tenant Boundary 변경: 차단

---

# 15. Organization Graph Node

`ORGANIZATION_GRAPH_NODE`

필수 필드:

* organization_graph_node_id
* organization_hierarchy_version_id
* organization_unit_id
* organization_unit_version_id
* node role
* hierarchy level
* depth
* root 여부
* leaf 여부
* primary node 여부
* legal entity id
* business unit id
* region id
* country code
* workspace id
* valid_from
* valid_to
* status
* evidence

Node Role:

* ROOT
* INTERMEDIATE
* LEAF
* VIRTUAL_ROOT
* SHARED_SERVICE
* MATRIX_NODE
* EXTERNAL_REFERENCE
* PLACEHOLDER
* ARCHIVED_REFERENCE

---

# 16. Organization Graph Edge

`ORGANIZATION_GRAPH_EDGE`

필수 필드:

* organization_graph_edge_id
* organization_hierarchy_version_id
* source_node_id
* target_node_id
* relationship_type_id
* edge direction
* primary 여부
* hierarchy forming 여부
* approval routing eligible 여부
* manager resolution eligible 여부
* edge priority
* edge weight
* legal entity boundary type
* source reference
* valid_from
* valid_to
* recorded_at
* status
* evidence

Legal Entity Boundary Type:

* SAME_LEGAL_ENTITY
* CROSS_LEGAL_ENTITY
* INTERCOMPANY
* SHARED_SERVICE
* JOINT_VENTURE
* EXTERNAL_PARTNER
* NOT_APPLICABLE

---

# 17. Primary Parent 규칙

Hierarchy Type별 Primary Parent 규칙을 지원한다.

기본 규칙:

* Administrative Hierarchy: Active Period에 Primary Parent 최대 1개
* Legal Entity Hierarchy: Active Period에 Legal Parent 최대 1개
* Functional Hierarchy: Primary Functional Parent 최대 1개, Secondary 허용
* Matrix Hierarchy: 여러 Parent 허용
* Project Hierarchy: 여러 Sponsor Reference 허용 가능
* Approval Hierarchy: Policy에 따라 여러 Parent 허용 가능
* Financial Hierarchy: Cost Center·Profit Center 규칙에 따라 분리

동일 Hierarchy Type과 유효기간에서 허용 수보다 많은 Primary Parent를 차단하라.

---

# 18. Organization Graph Path

`ORGANIZATION_GRAPH_PATH`

Closure Table 또는 동등한 Path Index를 구축한다.

필수 필드:

* organization_graph_path_id
* organization_hierarchy_version_id
* ancestor_node_id
* descendant_node_id
* path length
* path type
* primary path 여부
* path sequence reference
* legal entity crossings
* region crossings
* country crossings
* valid_from
* valid_to
* computed_at
* status
* evidence

Path Type:

* SELF
* DIRECT
* TRANSITIVE
* PRIMARY
* SECONDARY
* MATRIX
* CROSS_ENTITY
* FUNCTIONAL
* ADMINISTRATIVE
* FINANCIAL
* APPROVAL_ELIGIBLE

---

# 19. Path 계산 원칙

다음을 지원하라.

* Ancestor 조회
* Descendant 조회
* Immediate Parent 조회
* Immediate Child 조회
* Root 조회
* Lowest Common Ancestor 후보
* Path Length
* Hierarchy Level
* Legal Entity Crossing 여부
* Country Crossing 여부
* Primary Path
* Functional Path
* Administrative Path
* Approval-eligible Path

Graph Traversal 시 다음을 강제하라.

* Tenant Filter
* Hierarchy Version Filter
* Effective Date Filter
* Relationship Type Filter
* Legal Entity Boundary Policy
* Maximum Depth
* Cycle Protection
* Query Timeout
* Result Limit

---

# 20. Hierarchy Level

`ORGANIZATION_HIERARCHY_LEVEL`

필수 필드:

* hierarchy_level_id
* organization_hierarchy_id
* level code
* level name
* level number
* allowed organization types
* expected parent level
* expected child level
* skip level allowed 여부
* approval eligible 여부
* manager resolution eligible 여부
* default authority tier reference
* status
* evidence

예:

* Level 0: Corporate Group
* Level 1: Holding Company
* Level 2: Legal Entity
* Level 3: Business Unit
* Level 4: Division
* Level 5: Department
* Level 6: Team
* Level 7: Squad

실제 고객사 구조에 맞게 Tenant별 Custom Level을 허용하라.

---

# 21. Tenant Hierarchy

Tenant Hierarchy는 다음을 표현한다.

* Platform Tenant
* Parent Tenant
* Subsidiary Tenant
* Managed Tenant
* Partner Tenant
* Sandbox Tenant
* Demo Tenant
* Consolidated Reporting Tenant

그러나 Tenant Isolation을 우회하는 일반 Organization Edge로 사용하지 마라.

`ORGANIZATION_TENANT_BINDING`

필수 필드:

* tenant binding id
* organization unit
* tenant id
* binding type
* primary 여부
* inherited 여부
* data ownership
* operational ownership
* reporting relationship
* valid_from
* valid_to
* status
* evidence

Binding Type:

* OWNED_BY
* OPERATED_IN
* VISIBLE_TO_REFERENCE
* MANAGED_BY_REFERENCE
* REPORTING_ONLY
* SHARED_SERVICE_REFERENCE
* PARTNER_REFERENCE

Cross-Tenant 데이터 접근은 Organization Binding이 아니라 Authorization Policy에서 별도로 결정한다.

---

# 22. Workspace Hierarchy

`ORGANIZATION_WORKSPACE_BINDING`

필수 필드:

* workspace binding id
* organization unit
* workspace id
* tenant id
* binding type
* primary 여부
* operational scope
* approval workflow scope
* role assignment scope
* reporting scope
* inherited 여부
* valid_from
* valid_to
* status
* evidence

Workspace Binding Type:

* PRIMARY_WORKSPACE
* OPERATIONAL_WORKSPACE
* FINANCE_WORKSPACE
* APPROVAL_WORKSPACE
* AUDIT_WORKSPACE
* REPORTING_WORKSPACE
* READ_ONLY_REFERENCE
* CUSTOM

Workspace가 다른 Tenant의 Organization에 연결되지 않도록 하라.

---

# 23. Legal Entity Hierarchy

`ORGANIZATION_LEGAL_ENTITY_BINDING`

필수 필드:

* legal entity binding id
* organization unit
* legal entity id
* relationship type
* primary 여부
* employing entity 여부
* operating entity 여부
* funding entity 여부
* liability entity 여부
* accounting entity 여부
* settlement entity 여부
* payout entity 여부
* tax entity 여부
* valid_from
* valid_to
* status
* evidence

Relationship Type:

* LEGALLY_PART_OF
* OPERATED_BY
* EMPLOYED_BY
* FUNDED_BY
* ACCOUNTED_BY
* SETTLED_BY
* PAID_BY
* TAX_REPORTED_BY
* SHARED_SERVICE_BY
* INTERCOMPANY_SUPPORTED_BY

Financial Approval Routing에서 단순 Primary Legal Entity만 사용하지 말고 해당 Financial Responsibility Binding을 선택할 수 있게 하라.

---

# 24. Legal Entity Boundary Guard

다음을 차단하라.

* Legal Entity가 없는 Financial Organization Unit
* 존재하지 않는 Legal Entity Binding
* 동시에 여러 Primary Legal Entity
* Effective Period가 중첩된 Primary Binding
* 다른 Tenant Legal Entity Binding
* 일반 Parent Edge로 Cross-entity 관계 은폐
* Funding Entity와 Payout Entity 불일치 미표시
* 회계 책임 Entity 없는 Settlement Organization
* 종료된 Legal Entity에 신규 Organization Binding

---

# 25. Business Unit Profile

`ORGANIZATION_BUSINESS_UNIT_PROFILE`

필수 필드:

* business unit profile id
* organization unit id
* business unit code
* business unit name
* executive owner reference
* legal entities
* regions
* countries
* brands
* cost centers
* profit centers
* default approval hierarchy
* default workflow catalog
* valid_from
* valid_to
* status
* evidence

---

# 26. Division Profile

`ORGANIZATION_DIVISION_PROFILE`

필수 필드:

* division profile id
* organization unit id
* division code
* business unit reference
* division owner reference
* legal entity scope
* functional scope
* regional scope
* default approval hierarchy
* valid_from
* valid_to
* status
* evidence

---

# 27. Department Profile

`ORGANIZATION_DEPARTMENT_PROFILE`

필수 필드:

* department profile id
* organization unit id
* department code
* division reference
* business unit reference
* department owner reference
* administrative owner reference
* functional owner reference
* cost center references
* profit center references
* legal entity references
* region references
* country references
* default workspace
* approval hierarchy eligibility
* valid_from
* valid_to
* status
* evidence

---

# 28. Team Profile

`ORGANIZATION_TEAM_PROFILE`

필수 필드:

* team profile id
* organization unit id
* team code
* department reference
* team owner reference
* functional owner reference
* project references
* program references
* cost center reference
* legal entity scope
* workspace scope
* approval hierarchy eligibility
* valid_from
* valid_to
* status
* evidence

---

# 29. Squad Profile

`ORGANIZATION_SQUAD_PROFILE`

필수 필드:

* squad profile id
* organization unit id
* squad code
* team reference
* department reference
* product reference
* project reference
* temporary 여부
* squad lead reference
* valid_from
* valid_to
* status
* evidence

Temporary Squad에는 종료일을 요구한다.

Temporary Squad 종료 후 Membership과 Approval Route 재평가 Hook을 생성하라.

---

# 30. Region Profile

`ORGANIZATION_REGION_PROFILE`

필수 필드:

* region profile id
* organization unit id
* region code
* region name
* parent region
* included countries
* excluded countries
* regional headquarters
* regional legal entities
* regional executive reference
* timezone policy
* currency policy
* approval hierarchy reference
* valid_from
* valid_to
* status
* evidence

예:

* GLOBAL
* APAC
* EMEA
* AMERICAS
* NORTH_ASIA
* SOUTHEAST_ASIA
* NORTH_AMERICA
* LATAM

Region 이름으로 Country 포함 여부를 추론하지 말고 명시적 Binding을 사용하라.

---

# 31. Country Profile

`ORGANIZATION_COUNTRY_PROFILE`

필수 필드:

* country profile id
* organization unit id
* ISO country code
* country organization name
* parent region
* local legal entities
* country manager reference
* local currency
* local timezone
* local compliance profile
* local tax profile reference
* approval hierarchy reference
* valid_from
* valid_to
* status
* evidence

---

# 32. Brand Profile

`ORGANIZATION_BRAND_PROFILE`

필수 필드:

* brand profile id
* organization unit id
* brand id
* brand owner organization
* legal owner entity
* operating entities
* regions
* countries
* stores
* merchants
* product lines
* program scope
* approval hierarchy reference
* valid_from
* valid_to
* status
* evidence

Brand 관계를 Legal Entity 소유권과 운영 조직 관계로 분리하라.

---

# 33. Store Profile

`ORGANIZATION_STORE_PROFILE`

필수 필드:

* store profile id
* organization unit id
* store id
* store type
* merchant reference
* brand reference
* operating organization
* legal entity
* country
* region
* manager position reference
* cost center
* profit center
* approval hierarchy reference
* valid_from
* valid_to
* status
* evidence

---

# 34. Merchant Profile

`ORGANIZATION_MERCHANT_PROFILE`

필수 필드:

* merchant profile id
* organization unit id
* merchant id
* merchant type
* tenant relationship
* legal entity relationship
* brand relationships
* store relationships
* contract references
* country scope
* region scope
* merchant owner organization
* approval hierarchy reference
* valid_from
* valid_to
* status
* evidence

Merchant는 고객사의 내부 Organization 또는 외부 Party일 수 있으므로 `internal/external`을 명확히 구분하라.

---

# 35. Vendor Profile

`ORGANIZATION_VENDOR_PROFILE`

필수 필드:

* vendor profile id
* organization unit or external party reference
* vendor id
* vendor type
* tenant relationship
* legal entity relationship
* contract references
* service categories
* country scope
* region scope
* vendor manager organization
* internal sponsor reference
* approval hierarchy reference
* valid_from
* valid_to
* status
* evidence

---

# 36. Partner Profile

`ORGANIZATION_PARTNER_PROFILE`

필수 필드:

* partner profile id
* organization unit or external party reference
* partner id
* partnership type
* tenant relationship
* legal entity relationships
* joint program references
* contract references
* operating countries
* operating regions
* internal owner organization
* approval hierarchy reference
* valid_from
* valid_to
* status
* evidence

Partnership Type:

* STRATEGIC
* RESELLER
* DISTRIBUTOR
* DEALER
* AGENCY
* TECHNOLOGY
* PAYMENT
* LOGISTICS
* AUDIT
* CONSULTING
* JOINT_VENTURE
* OTHER

---

# 37. Cost Center Binding

`ORGANIZATION_COST_CENTER_BINDING`

필수 필드:

* cost center binding id
* organization unit
* cost center id
* binding type
* primary 여부
* budget owner reference
* finance owner reference
* legal entity
* currency
* financial responsibility
* approval hierarchy reference
* valid_from
* valid_to
* status
* evidence

Binding Type:

* PRIMARY_COST_CENTER
* SHARED_COST_CENTER
* CHARGED_TO
* MANAGED_BY
* BUDGET_OWNED_BY
* REPORTING_ONLY

---

# 38. Profit Center Binding

`ORGANIZATION_PROFIT_CENTER_BINDING`

필수 필드:

* profit center binding id
* organization unit
* profit center id
* binding type
* primary 여부
* profit owner reference
* legal entity
* currency
* regional scope
* brand scope
* approval hierarchy reference
* valid_from
* valid_to
* status
* evidence

---

# 39. Position Unit Foundation

`ORGANIZATION_POSITION_UNIT`

이번 단계에서는 Position과 Organization의 관계 기반만 구축한다.

필수 필드:

* position_unit_id
* position registry reference
* organization unit
* position code
* position title
* position category
* hierarchy level
* executive level
* manager eligible 여부
* approval eligible 여부
* authority matrix eligible 여부
* incumbent subject reference
* vacancy state
* temporary incumbent reference
* valid_from
* valid_to
* status
* evidence

구체적인 Manager·Acting Manager·Skip-level Resolution은 다음 블록에서 구현한다.

---

# 40. Matrix Organization Foundation

`ORGANIZATION_MATRIX_RELATIONSHIP`

필수 필드:

* matrix relationship id
* subject organization unit
* related organization unit
* matrix type
* primary hierarchy reference
* secondary hierarchy reference
* relationship priority
* responsibility scope
* resource scope
* country scope
* program scope
* approval routing eligible 여부
* manager resolution eligible 여부
* valid_from
* valid_to
* status
* evidence

Matrix Type:

* FUNCTIONAL
* REGIONAL
* PRODUCT
* PROJECT
* PROGRAM
* BRAND
* CUSTOMER
* LEGAL_ENTITY
* SHARED_SERVICE
* CUSTOM

Matrix Relationship을 Primary Administrative Parent로 자동 전환하지 마라.

---

# 41. Organization Owner

`ORGANIZATION_OWNER`

필수 필드:

* organization_owner_id
* organization unit
* owner type
* owner subject
* owner position
* owner organization
* responsibility scope
* approval eligible 여부
* resource owner eligible 여부
* valid_from
* valid_to
* status
* evidence

Owner Type:

* EXECUTIVE_OWNER
* ADMINISTRATIVE_OWNER
* FUNCTIONAL_OWNER
* FINANCIAL_OWNER
* BUDGET_OWNER
* PROGRAM_OWNER
* BRAND_OWNER
* REGIONAL_OWNER
* COUNTRY_OWNER
* COST_CENTER_OWNER
* PROFIT_CENTER_OWNER
* DATA_OWNER
* SECURITY_OWNER
* COMPLIANCE_OWNER
* CUSTOM

Owner와 Manager를 동일시하지 마라.

---

# 42. Organization Membership

`ORGANIZATION_MEMBERSHIP`

이번 단계에서는 Membership Foundation을 구축한다.

필수 필드:

* organization_membership_id
* subject id
* organization unit
* membership type
* primary 여부
* employment type
* position reference
* legal entity reference
* workspace reference
* source system
* source membership id
* valid_from
* valid_to
* status
* evidence

Membership Type:

* EMPLOYEE
* CONTRACTOR
* CONSULTANT
* PARTNER
* VENDOR
* TEMPORARY
* PROJECT_MEMBER
* COMMITTEE_MEMBER_REFERENCE
* SHARED_SERVICE_MEMBER
* EXTERNAL_AUDITOR
* SYSTEM_OWNER
* CUSTOM

한 Subject가 여러 Organization Membership을 가질 수 있으나 Primary Employment Membership은 유효기간별로 명시적으로 관리하라.

---

# 43. Organization Scope Binding

`ORGANIZATION_SCOPE_BINDING`

필수 필드:

* organization_scope_binding_id
* organization unit
* scope type
* scope resource
* scope effect
* inherited 여부
* inheritance hierarchy
* legal entity restriction
* country restriction
* environment restriction
* valid_from
* valid_to
* status
* evidence

Scope Type:

* TENANT
* WORKSPACE
* LEGAL_ENTITY
* REGION
* COUNTRY
* BRAND
* STORE
* MERCHANT
* VENDOR
* PARTNER
* PROGRAM
* COST_CENTER
* PROFIT_CENTER
* PROVIDER_ACCOUNT
* ENVIRONMENT
* DATA_CLASSIFICATION
* CUSTOM

Scope Effect:

* INCLUDE
* EXCLUDE
* READ_ONLY
* APPROVAL_ELIGIBLE
* MANAGER_RESOLUTION_ELIGIBLE
* REPORTING_ONLY
* CUSTOM

---

# 44. Organization Effective Period

`ORGANIZATION_EFFECTIVE_PERIOD`

필수 필드:

* effective period id
* entity type
* entity id
* business valid from
* business valid to
* system recorded from
* system recorded to
* timezone
* future dated 여부
* retroactive 여부
* correction 여부
* source effective date
* status
* evidence

Business Time과 System Time을 구분하는 Bitemporal 또는 동등한 모델을 권장한다.

---

# 45. Future-Dated Organization Change

지원 변경:

* New Organization
* Organization Rename
* Parent Change
* Legal Entity Change
* Business Unit Transfer
* Department Transfer
* Region Transfer
* Country Transfer
* Owner Change
* Cost Center Change
* Profit Center Change
* Merge
* Split
* Retirement

Future-dated 변경에는 다음을 기록한다.

* scheduled effective date
* source
* change set
* affected nodes
* affected edges
* affected members
* affected roles
* affected approval chains
* affected active approvals
* validation result
* status
* evidence

---

# 46. Retroactive Change

Retroactive Change는 과거 날짜부터 조직 구조를 수정한다.

다음을 강제하라.

* Business Justification
* Authorized Requester
* Approval Reference
* Affected Historical Period
* Affected Approval Cases
* Affected Audit Evidence
* Original Version Preservation
* Correction Version
* Reconciliation
* Manual Review for Financial Impact

과거 조직 Version과 Snapshot을 덮어쓰지 마라.

---

# 47. Organization Lifecycle

`ORGANIZATION_LIFECYCLE_EVENT`

Lifecycle Event:

* ORGANIZATION_CREATED
* ORGANIZATION_ACTIVATED
* ORGANIZATION_RENAMED
* ORGANIZATION_REPARENTED
* ORGANIZATION_TRANSFERRED
* ORGANIZATION_MERGED
* ORGANIZATION_SPLIT
* ORGANIZATION_SUSPENDED
* ORGANIZATION_RESTORED
* ORGANIZATION_RETIRED
* ORGANIZATION_ARCHIVED
* LEGAL_ENTITY_CHANGED
* REGION_CHANGED
* COUNTRY_CHANGED
* OWNER_CHANGED
* COST_CENTER_CHANGED
* PROFIT_CENTER_CHANGED
* MATRIX_RELATION_CREATED
* MATRIX_RELATION_ENDED
* MEMBERSHIP_CHANGED
* CORRECTION_RECORDED

필수 필드:

* lifecycle event id
* organization unit
* event type
* previous version
* new version
* effective date
* recorded date
* actor
* source
* reason
* approval reference
* affected objects
* status
* evidence

---

# 48. Organization Snapshot

`ORGANIZATION_SNAPSHOT`

Approval Request 제출, Case 생성 및 Decision 시점에 사용할 조직 Snapshot 기반을 구축한다.

필수 필드:

* organization_snapshot_id
* snapshot type
* tenant id
* hierarchy id
* hierarchy version id
* organization unit
* organization unit version
* hierarchy path
* hierarchy level
* parents
* ancestors
* primary legal entity
* business unit
* division
* department
* team
* region
* country
* brands
* cost centers
* profit centers
* position reference
* organization owners
* membership reference
* effective_at
* captured_at
* immutable_hash
* status
* evidence

Snapshot Type:

* APPROVAL_REQUEST_SUBMISSION
* APPROVAL_CASE_CREATION
* APPROVER_RESOLUTION
* TASK_ASSIGNMENT
* TASK_CLAIM
* APPROVAL_DECISION
* APPROVAL_EXECUTION
* ORGANIZATION_CHANGE
* RECONCILIATION
* AUDIT_RECONSTRUCTION

---

# 49. Snapshot 원칙

* Snapshot 생성 이후 직접 수정 금지
* 현재 Hierarchy 조회 결과로 과거 Snapshot 대체 금지
* Approval Decision 시점에 사용된 Hierarchy Version 저장
* Primary·Functional·Financial Path를 구분
* Legal Entity Boundary 기록
* Cross-country Path 기록
* Matrix Relationship 기록
* Snapshot Hash 검증
* 원본 Source Reference 보존
* 민감 Employee 정보 최소화

---

# 50. Hierarchy Candidate

`ORGANIZATION_HIERARCHY_CANDIDATE`

필수 필드:

* hierarchy candidate id
* tenant
* subject
* approval request
* approval case
* resource
* requested action
* effective date
* candidate hierarchy types
* candidate hierarchy versions
* candidate organization memberships
* primary organization
* secondary organizations
* legal entity candidates
* regional candidates
* country candidates
* matrix relationships
* cost center candidates
* profit center candidates
* conflicts
* proposed hierarchy
* proposed path
* manual review requirement
* status
* evidence

후속 Manager Resolution Engine은 이 Candidate를 입력으로 사용한다.

---

# 51. Hierarchy Selection 기본 우선순위

Approval Domain별 상세 규칙은 후속 블록에서 구현한다.

기본 후보 우선순위:

1. Explicit Approval Hierarchy Binding
2. Resource-specific Organization Hierarchy
3. Legal Entity Approval Hierarchy
4. Business Unit Approval Hierarchy
5. Department Approval Hierarchy
6. Cost Center Approval Hierarchy
7. Profit Center Approval Hierarchy
8. Program Approval Hierarchy
9. Regional Approval Hierarchy
10. Tenant Default Approval Hierarchy
11. Platform Template Hierarchy
12. Manual Review
13. Block

동일 우선순위에서 여러 Active Hierarchy가 충돌하면 임의 선택하지 마라.

---

# 52. Graph Validation

`ORGANIZATION_GRAPH_VALIDATION`

Hierarchy Version 활성화 전에 다음을 검증하라.

* Tenant 일치
* Root 존재
* 허용되지 않은 Multiple Root 없음
* Node 중복 없음
* Edge 중복 없음
* Source Node 존재
* Target Node 존재
* Self-loop 금지
* Cycle 금지 관계에서 Cycle 없음
* Primary Parent 수 제한
* Maximum Depth 준수
* Unreachable Node 없음
* Orphan Node 없음
* Legal Entity Binding 유효
* Cross-Legal-Entity Edge 명시
* Region·Country Binding 유효
* Effective Period 중첩 검증
* 종료된 Node에 Active Edge 없음
* Future-dated Node와 Edge 일관성
* Parent·Child Type Constraint 준수
* Inverse Relationship 일관성
* Path Index 일관성
* Snapshot 생성 가능
* Approval Routing Eligible Path 존재
* Manager Resolution Eligible Path 존재
* Immutable Version Hash 유효

---

# 53. Cycle Detection

최소 다음 방식 중 Repository 구조에 적절한 방식을 사용하라.

* DFS Cycle Detection
* Topological Sort
* Recursive CTE with Cycle Guard
* Graph Database Cycle Query
* Closure Table Constraint
* Materialized Path Prefix Validation

다음 Relationship은 기본적으로 Cycle을 허용하지 않는다.

* PARENT_OF
* LEGALLY_OWNED_BY
* FINANCIALLY_OWNED_BY
* REPORTS_THROUGH
* COST_CENTER_OF
* PROFIT_CENTER_OF
* BELONGS_TO_REGION
* BELONGS_TO_COUNTRY

Matrix·Advisory 관계도 무제한 순환을 허용하지 말고 별도 Cycle Risk를 탐지하라.

---

# 54. Orphan Node

Orphan 후보:

* Root가 아닌데 Parent가 없음
* Active Membership이 있으나 Hierarchy Node가 없음
* Active Role Assignment이 있으나 Organization Unit이 종료됨
* Approval Workflow Binding이 있으나 Hierarchy가 없음
* Legal Entity Binding이 없음
* Parent Version이 종료됨
* Source HRIS Unit이 삭제됨
* Merge 대상이 없는 Superseded Unit
* Split 대상이 없는 Retired Unit

처리:

* BLOCK
* ATTACH_TO_PLACEHOLDER_ROOT
* MANUAL_REVIEW
* MIGRATION_REQUIRED
* ARCHIVE
* RESTORE_SOURCE
* CORRECT_BINDING

Production Approval Routing에서는 Placeholder Root를 자동 승인 경로로 사용하지 마라.

---

# 55. Hierarchy Reconciliation

`ORGANIZATION_HIERARCHY_RECONCILIATION`

다음을 비교하라.

* HRIS Organization vs Canonical Organization
* ERP Organization vs Canonical Organization
* Finance Legal Entity vs Canonical Binding
* Cost Center Master vs Canonical Cost Center Binding
* Profit Center Master vs Canonical Profit Center Binding
* IdP Group vs Organization Membership
* SCIM Membership vs Organization Membership
* CRM Account Hierarchy vs Merchant·Partner Hierarchy
* Tenant Registry vs Organization Tenant Binding
* Workspace Registry vs Organization Workspace Binding
* Legal Entity Registry vs Organization Legal Binding
* Country Registry vs Organization Country Profile
* Region Registry vs Organization Region Profile
* Brand Registry vs Organization Brand Profile
* Store Registry vs Organization Store Profile
* Vendor Registry vs Organization Vendor Profile
* Position Registry vs Position Unit
* Current Hierarchy Version vs Path Index
* Current Node·Edge vs Snapshot
* Organization Membership vs Role Assignment Scope
* Organization Hierarchy vs Approval Workflow Binding
* Organization Hierarchy vs Active Approval Task Assignment
* Retired Organization vs Active Approval Cases
* Future-dated Change vs Scheduled Activation

필수 필드:

* hierarchy reconciliation id
* tenant
* organization unit
* hierarchy
* hierarchy version
* comparison type
* source system
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

# 56. Reconciliation 상태

* MATCH
* HRIS_ORGANIZATION_MISMATCH
* ERP_ORGANIZATION_MISMATCH
* LEGAL_ENTITY_BINDING_MISMATCH
* COST_CENTER_BINDING_MISMATCH
* PROFIT_CENTER_BINDING_MISMATCH
* IDP_MEMBERSHIP_MISMATCH
* SCIM_MEMBERSHIP_MISMATCH
* CRM_HIERARCHY_MISMATCH
* TENANT_BINDING_MISMATCH
* WORKSPACE_BINDING_MISMATCH
* COUNTRY_PROFILE_MISMATCH
* REGION_PROFILE_MISMATCH
* BRAND_PROFILE_MISMATCH
* STORE_PROFILE_MISMATCH
* VENDOR_PROFILE_MISMATCH
* POSITION_UNIT_MISMATCH
* GRAPH_PATH_MISMATCH
* SNAPSHOT_VERSION_MISMATCH
* ROLE_SCOPE_MISMATCH
* WORKFLOW_BINDING_MISMATCH
* ACTIVE_TASK_HIERARCHY_MISMATCH
* RETIRED_ORGANIZATION_ACTIVE_CASE
* FUTURE_CHANGE_SCHEDULING_MISMATCH
* MANUAL_REVIEW
* BLOCKED

---

# 57. Critical Gap 후보

다음은 High 또는 Critical로 처리하라.

* Cross-Tenant Organization Edge
* Cross-Tenant Membership
* 다른 Tenant Workspace Binding
* Cycle이 있는 Administrative Hierarchy
* Cycle이 있는 Legal Entity Hierarchy
* Active Period에 여러 Primary Parent
* Active Period에 여러 Primary Legal Entity
* Financial Organization에 Legal Entity 없음
* Settlement Organization에 Accounting Entity 없음
* Payout Organization에 Payout Entity 없음
* 종료된 Organization에 신규 Membership
* 종료된 Organization에 신규 Role Assignment
* 종료된 Organization에 신규 Approval Workflow Binding
* Approval 시점 Hierarchy Snapshot 없음
* Hierarchy Version 없는 Approval Resolution
* 다른 Legal Entity 경계를 일반 Parent Edge로 은폐
* 과거 Hierarchy Version 덮어쓰기
* Retroactive Change에 Evidence 없음
* Organization Graph Cycle로 승인 경로 무한 반복
* Path Index와 Node·Edge 불일치
* HRIS에서 삭제된 조직에 Active Approver 존재
* Future-dated 변경 활성화 실패
* Matrix Relationship을 Primary Hierarchy로 오해
* Approval Routing Eligible Path 없음
* Organization Source of Truth 불명확

---

# 58. 최소 Static Lint

이번 블록에서는 다음을 차단하라.

* Tenant 없는 Organization Unit
* Organization Type 없는 Unit
* Active Version 없는 Active Unit
* Active Hierarchy에 Root 없음
* 허용되지 않은 Multiple Root
* Self-loop Edge
* 금지된 Cycle
* Source·Target 없는 Edge
* Cross-Tenant Edge
* Cross-Tenant Membership
* 다른 Tenant Workspace Binding
* Legal Entity 없는 Financial Unit
* 중첩된 Primary Parent
* 중첩된 Primary Legal Entity
* 종료된 Node에 Active Edge
* 종료된 Unit에 Active Membership
* 유효기간 없는 Temporary Unit
* Effective Period가 역전됨
* Parent·Child Type Constraint 위반
* Maximum Depth 초과
* Orphan Node
* Unreachable Node
* Path Index 누락
* Hierarchy Version Hash 누락
* Active Version 직접 수정
* Snapshot 직접 수정
* Organization 이름 기반 Join
* 기존 Organization Registry 중복 생성

---

# 59. 최소 Runtime Guard

다음을 차단하라.

* Organization Unit Not Found
* Organization Version Not Active
* Hierarchy Not Found
* Hierarchy Version Not Active
* Tenant Mismatch
* Workspace Mismatch
* Legal Entity Mismatch
* Effective Date Outside Validity
* Organization Retired
* Hierarchy Suspended
* Graph Cycle Detected
* Path Resolution Failed
* Maximum Depth Exceeded
* Primary Parent Conflict
* Legal Entity Binding Missing
* Country Binding Missing
* Approval-eligible Path Missing
* Manager-resolution Path Missing
* Snapshot Missing
* Snapshot Hash Invalid
* Path Index Drift
* Critical Reconciliation Drift
* Future Change Activation Failed
* Kill Switch 활성

---

# 60. Error Contract

* ORGANIZATION_REGISTRY_NOT_FOUND
* ORGANIZATION_UNIT_NOT_FOUND
* ORGANIZATION_UNIT_VERSION_NOT_FOUND
* ORGANIZATION_UNIT_INACTIVE
* ORGANIZATION_UNIT_RETIRED
* ORGANIZATION_TYPE_NOT_FOUND
* ORGANIZATION_RELATIONSHIP_TYPE_NOT_FOUND
* ORGANIZATION_HIERARCHY_NOT_FOUND
* ORGANIZATION_HIERARCHY_VERSION_NOT_FOUND
* ORGANIZATION_HIERARCHY_VERSION_INACTIVE
* ORGANIZATION_HIERARCHY_IMMUTABLE
* ORGANIZATION_HIERARCHY_ROOT_MISSING
* ORGANIZATION_HIERARCHY_MULTIPLE_ROOTS
* ORGANIZATION_GRAPH_NODE_NOT_FOUND
* ORGANIZATION_GRAPH_EDGE_NOT_FOUND
* ORGANIZATION_GRAPH_SELF_LOOP
* ORGANIZATION_GRAPH_CYCLE
* ORGANIZATION_GRAPH_ORPHAN_NODE
* ORGANIZATION_GRAPH_UNREACHABLE_NODE
* ORGANIZATION_GRAPH_MAX_DEPTH_EXCEEDED
* ORGANIZATION_PRIMARY_PARENT_CONFLICT
* ORGANIZATION_TENANT_MISMATCH
* ORGANIZATION_WORKSPACE_MISMATCH
* ORGANIZATION_LEGAL_ENTITY_MISMATCH
* ORGANIZATION_LEGAL_ENTITY_BINDING_MISSING
* ORGANIZATION_COUNTRY_BINDING_MISSING
* ORGANIZATION_EFFECTIVE_PERIOD_INVALID
* ORGANIZATION_PATH_RESOLUTION_FAILED
* ORGANIZATION_PATH_INDEX_MISMATCH
* ORGANIZATION_SNAPSHOT_MISSING
* ORGANIZATION_SNAPSHOT_INVALID
* ORGANIZATION_FUTURE_CHANGE_ACTIVATION_FAILED
* ORGANIZATION_RECONCILIATION_FAILED
* ORGANIZATION_RUNTIME_BLOCKED

---

# 61. Warning Contract

* ORGANIZATION_SOURCE_WARNING
* ORGANIZATION_VERSION_WARNING
* ORGANIZATION_HIERARCHY_WARNING
* ORGANIZATION_GRAPH_WARNING
* ORGANIZATION_CYCLE_RISK_WARNING
* ORGANIZATION_ORPHAN_WARNING
* ORGANIZATION_EFFECTIVE_DATE_WARNING
* ORGANIZATION_RETROACTIVE_CHANGE_WARNING
* ORGANIZATION_FUTURE_CHANGE_WARNING
* ORGANIZATION_LEGAL_ENTITY_WARNING
* ORGANIZATION_MATRIX_WARNING
* ORGANIZATION_MEMBERSHIP_WARNING
* ORGANIZATION_POSITION_WARNING
* ORGANIZATION_PATH_WARNING
* ORGANIZATION_SNAPSHOT_WARNING
* ORGANIZATION_RECONCILIATION_WARNING
* ORGANIZATION_MANUAL_REVIEW_REQUIRED

---

# 62. Evidence Contract

`ORGANIZATION_HIERARCHY_EVIDENCE`

필수 필드:

* evidence id
* tenant
* organization registry
* organization unit
* organization unit version
* hierarchy
* hierarchy version
* graph node
* graph edge
* graph path
* relationship type
* legal entity binding
* workspace binding
* region
* country
* cost center
* profit center
* position unit
* membership
* owner
* effective period
* source system
* source record
* source version
* change request
* approval reference
* snapshot reference
* reconciliation reference
* effective_at
* recorded_at
* immutable hash
* lineage
* audit reference

다음을 저장하지 마라.

* Password
* Token
* Credential Secret
* 불필요한 Employee PII
* 급여 정보
* 민감 HR 평가 정보
* Bank Data
* Source System 전체 Payload
* 삭제가 요구되는 개인정보 원문

---

# 63. Audit Event

`ORGANIZATION_HIERARCHY_AUDIT_EVENT`

지원 Event:

* ORGANIZATION_REGISTRY_CREATED
* ORGANIZATION_UNIT_CREATED
* ORGANIZATION_UNIT_VERSION_CREATED
* ORGANIZATION_UNIT_ACTIVATED
* ORGANIZATION_UNIT_RENAMED
* ORGANIZATION_UNIT_REPARENTED
* ORGANIZATION_UNIT_TRANSFERRED
* ORGANIZATION_UNIT_MERGED
* ORGANIZATION_UNIT_SPLIT
* ORGANIZATION_UNIT_SUSPENDED
* ORGANIZATION_UNIT_RETIRED
* ORGANIZATION_TYPE_REGISTERED
* ORGANIZATION_RELATIONSHIP_REGISTERED
* ORGANIZATION_HIERARCHY_CREATED
* ORGANIZATION_HIERARCHY_VERSION_CREATED
* ORGANIZATION_HIERARCHY_VALIDATED
* ORGANIZATION_HIERARCHY_ACTIVATED
* ORGANIZATION_GRAPH_NODE_ADDED
* ORGANIZATION_GRAPH_EDGE_ADDED
* ORGANIZATION_GRAPH_EDGE_ENDED
* ORGANIZATION_CYCLE_DETECTED
* ORGANIZATION_ORPHAN_DETECTED
* ORGANIZATION_LEGAL_ENTITY_BOUND
* ORGANIZATION_WORKSPACE_BOUND
* ORGANIZATION_COST_CENTER_BOUND
* ORGANIZATION_PROFIT_CENTER_BOUND
* ORGANIZATION_MATRIX_RELATION_CREATED
* ORGANIZATION_MEMBERSHIP_CREATED
* ORGANIZATION_MEMBERSHIP_ENDED
* ORGANIZATION_OWNER_ASSIGNED
* ORGANIZATION_SNAPSHOT_CREATED
* ORGANIZATION_RETROACTIVE_CORRECTION_RECORDED
* ORGANIZATION_FUTURE_CHANGE_SCHEDULED
* ORGANIZATION_FUTURE_CHANGE_ACTIVATED
* ORGANIZATION_DRIFT_DETECTED
* MANUAL_REVIEW_REQUESTED

---

# 64. 기존 구현 분류

기존 구현을 다음으로 분류하라.

* `CANONICAL_ORGANIZATION_REGISTRY`
* `CANONICAL_ORGANIZATION_UNIT`
* `CANONICAL_ORGANIZATION_UNIT_VERSION`
* `CANONICAL_ORGANIZATION_TYPE`
* `CANONICAL_ORGANIZATION_RELATIONSHIP`
* `CANONICAL_ORGANIZATION_HIERARCHY`
* `CANONICAL_ORGANIZATION_HIERARCHY_VERSION`
* `CANONICAL_ORGANIZATION_GRAPH_NODE`
* `CANONICAL_ORGANIZATION_GRAPH_EDGE`
* `CANONICAL_ORGANIZATION_GRAPH_PATH`
* `CANONICAL_ORGANIZATION_MEMBERSHIP`
* `CANONICAL_ORGANIZATION_LEGAL_ENTITY_BINDING`
* `CANONICAL_ORGANIZATION_WORKSPACE_BINDING`
* `CANONICAL_ORGANIZATION_COST_CENTER_BINDING`
* `CANONICAL_ORGANIZATION_PROFIT_CENTER_BINDING`
* `CANONICAL_ORGANIZATION_POSITION_UNIT`
* `CANONICAL_ORGANIZATION_MATRIX_RELATIONSHIP`
* `CANONICAL_ORGANIZATION_SNAPSHOT`
* `CANONICAL_ORGANIZATION_RECONCILIATION`
* `VALIDATED_EXTERNAL_SOURCE`
* `EXTERNAL_SOURCE_ADAPTER`
* `VALIDATED_LEGACY`
* `LEGACY_ADAPTER`
* `MIGRATION_REQUIRED`
* `CONSOLIDATION_REQUIRED`
* `DEPRECATION_CANDIDATE`
* `KEEP_SEPARATE_WITH_REASON`
* `BLOCKED_CROSS_TENANT`
* `BLOCKED_LEGAL_ENTITY_RISK`
* `BLOCKED_GRAPH_CYCLE`
* `BLOCKED_HISTORICAL_INTEGRITY_RISK`
* `UNVERIFIED`
* `TEST_ONLY`

---

# 65. 중복 구현 감사

다음을 전수 탐지하라.

* 여러 Organization Registry
* 여러 Organization Unit Table
* 여러 Department Table
* 여러 Team Table
* 여러 Business Unit Table
* 여러 Legal Entity Mapping
* 여러 Organization Tree
* 여러 Parent ID 모델
* 여러 Closure Table
* 여러 Materialized Path
* 여러 Graph Database Mapping
* 여러 Cost Center Mapping
* 여러 Profit Center Mapping
* 여러 Region·Country Tree
* 여러 Brand Organization 모델
* 여러 Merchant Organization 모델
* 여러 Vendor·Partner Hierarchy
* 여러 Position Unit 모델
* 여러 Organization Membership
* HRIS·ERP·IdP별 독립 Organization ID
* 이름 기반 Organization Mapping
* Approval 모듈 내부의 별도 Organization Tree
* Role 모듈 내부의 별도 Department Tree
* Finance 모듈 내부의 별도 Legal Entity Tree
* Current Parent만 저장하고 History를 잃는 구현
* Effective Date 없는 조직 관계
* 과거 Version을 Update하는 구현
* Graph Path와 Edge가 별도 Source of Truth인 구현

---

# 66. 데이터 저장 전략

Repository의 기존 기술 스택을 우선 사용하라.

다음 중 적합한 패턴을 선택하거나 조합한다.

* Adjacency List
* Closure Table
* Materialized Path
* Nested Set
* Graph Database
* Recursive CTE
* Event-sourced Relationship History
* Bitemporal Table

권장 기본:

* Canonical Node·Edge: 관계 Source of Truth
* Closure Table 또는 Path Index: 빠른 Ancestor·Descendant 조회
* Immutable Hierarchy Version: 승인 시점 재현
* Effective Period: Business Time
* Recorded Period: System Time
* Snapshot: Approval Evidence

Path Index는 파생 데이터이며 Node·Edge와 Reconciliation 가능해야 한다.

---

# 67. API Contract

기존 API Convention에 따라 최소 다음 기능을 제공하라.

## Registry

* Organization Registry 조회
* Organization Registry 생성·수정
* Source 우선순위 조회

## Organization Unit

* Unit 생성
* Unit Version 생성
* Unit 조회
* Effective Date 기준 조회
* Unit Lifecycle 변경
* Unit History 조회

## Hierarchy

* Hierarchy 생성
* Hierarchy Version 생성
* Hierarchy 검증
* Hierarchy 활성화
* Hierarchy Version 조회
* 특정 날짜 Active Version 조회

## Graph

* Node 추가·종료
* Edge 추가·종료
* Parent 조회
* Child 조회
* Ancestor 조회
* Descendant 조회
* Path 조회
* Root 조회
* Cycle 검증
* Orphan 조회

## Binding

* Tenant Binding
* Workspace Binding
* Legal Entity Binding
* Cost Center Binding
* Profit Center Binding
* Region·Country Binding
* Brand·Store·Merchant Binding

## Snapshot

* Approval용 Organization Snapshot 생성
* Snapshot 조회
* Snapshot Hash 검증

## Reconciliation

* Source별 비교
* Drift 목록
* Manual Resolution
* Reconciliation History

모든 API에 다음을 적용하라.

* Tenant Context
* Authorization
* Idempotency
* Optimistic Lock
* Effective Date Validation
* Audit
* Evidence
* Rate Limit
* Pagination
* Error Contract

---

# 68. Index·Performance

최소 다음 조회를 최적화하라.

* Tenant별 Organization Unit
* Active Organization Version
* 특정 Effective Date의 Unit
* Hierarchy Active Version
* Parent·Child
* Ancestor·Descendant
* Legal Entity별 Organization
* Department별 Team
* Region별 Country
* Brand별 Store
* Merchant별 Organization
* Cost Center별 Organization
* Profit Center별 Organization
* Subject별 Membership
* Organization별 Owner
* Approval Routing Eligible Path
* Manager Resolution Eligible Path
* Future-dated Changes
* Orphan Node
* Reconciliation Mismatch

필요한 복합 Index를 추가하되 과도한 Index로 쓰기 성능을 훼손하지 마라.

---

# 69. Cache 원칙

Hierarchy Path와 Unit 조회 Cache를 사용할 수 있다.

필수 Cache Key 구성:

* tenant_id
* hierarchy_id
* hierarchy_version_id
* effective_date
* organization_unit_id
* relationship_type
* legal_entity scope
* query direction

다음을 적용하라.

* Version-aware Cache
* Tenant-isolated Cache
* Activation 시 Invalidation
* Edge 변경 시 Invalidation
* Unit Version 변경 시 Invalidation
* Future Change 활성화 시 Invalidation
* Reconciliation Drift 시 Critical Cache 차단
* Stale Cache 사용 여부 Evidence

과거 Snapshot은 Current Hierarchy Cache로 재구성하지 마라.

---

# 70. 테스트 범위

최소 다음 테스트를 구현하라.

## Unit Test

* Organization Unit 생성
* Unit Version 생성
* Relationship Type 검증
* Effective Period 검증
* Primary Parent 제한
* Legal Entity Binding
* Cross-Tenant Edge 차단
* Cycle Detection
* Path 계산
* Snapshot Hash
* Future-dated Change
* Retroactive Correction

## Integration Test

* HRIS Import
* ERP Legal Entity Mapping
* IdP Membership Mapping
* Hierarchy Activation
* Path Index 생성
* Snapshot 생성
* Approval Case Binding
* Cache Invalidation
* Reconciliation

## Property Test

* Acyclic Hierarchy
* Path Transitivity
* Tenant Isolation
* Effective Period Non-overlap
* Immutable Version
* Snapshot Determinism
* Parent Count Constraint

## Concurrency Test

* 동일 Unit Version 동시 생성
* 동일 Edge 동시 생성
* Hierarchy Activation 동시 실행
* Future Change Scheduler 중복 실행
* Snapshot 동시 생성
* Reconciliation 동시 처리

## Security Test

* Cross-Tenant 조회
* Cross-Tenant Edge 생성
* Unauthorized Hierarchy 수정
* Historical Version 변경
* Snapshot 변조
* 다른 Legal Entity 데이터 접근
* Source Payload Injection

## Regression Test

* 기존 Tenant Admin
* 기존 Workspace Admin
* 기존 Role Assignment
* 기존 Rebate Program
* 기존 Approval Request
* 기존 Workflow Assignment
* 기존 HRIS Sync
* 기존 ERP Sync

---

# 71. 실행 절차

## Step 1 — 기존 조직 모델 전수 조사

Database, API, HRIS, ERP, IdP, SCIM, CRM, Finance Master 및 Approval 코드를 조사한다.

## Step 2 — Source of Truth 결정

Organization Type별 Authoritative Source와 Source Priority를 정의한다.

## Step 3 — Organization Registry 구축

Platform·Tenant·HRIS·ERP·Finance Registry를 표준화한다.

## Step 4 — Organization Unit·Version 구축

Unit Identity와 변경 Version을 분리한다.

## Step 5 — Organization Type·Relationship Type 구축

Node Type과 Edge 의미를 Registry화한다.

## Step 6 — Organization Hierarchy·Version 구축

Hierarchy 목적과 Immutable Version을 구현한다.

## Step 7 — Graph Node·Edge 구축

단일 Parent Tree가 아닌 Canonical Graph를 구현한다.

## Step 8 — Path Index 구축

Ancestor·Descendant·Approval Path 조회를 지원한다.

## Step 9 — Graph Validation 구축

Cycle, Orphan, Primary Parent, Depth 및 Type Constraint를 검증한다.

## Step 10 — Tenant·Workspace Binding 구축

멀티테넌트 경계를 명확히 한다.

## Step 11 — Legal Entity Binding 구축

Operating, Funding, Accounting, Settlement 및 Payout 책임을 구분한다.

## Step 12 — Business Unit·Division·Department 구축

조직 유형별 Profile을 구현한다.

## Step 13 — Team·Squad 구축

영구·임시 하위 조직과 종료일을 관리한다.

## Step 14 — Region·Country 구축

명시적 Country 포함·제외 관계를 구현한다.

## Step 15 — Brand·Store·Merchant 구축

법적 소유와 운영 책임을 구분한다.

## Step 16 — Vendor·Partner 구축

내부 Organization과 외부 Party를 구분한다.

## Step 17 — Cost Center·Profit Center 구축

예산·재무 책임 조직을 연결한다.

## Step 18 — Position Unit·Matrix Foundation 구축

후속 Manager Resolution의 입력 기반을 만든다.

## Step 19 — Membership·Owner 구축

Subject와 Organization 관계 및 조직 책임자를 기록한다.

## Step 20 — Effective Dating 구축

Future·Historical·Retroactive 변경을 지원한다.

## Step 21 — Organization Snapshot 구축

Approval 시점 조직 구조를 불변으로 고정한다.

## Step 22 — Hierarchy Candidate 구축

후속 Manager·Approval Chain Resolution 입력을 생성한다.

## Step 23 — Reconciliation 구축

HRIS·ERP·IdP·Canonical Drift를 탐지한다.

## Step 24 — Static Lint·Runtime Guard 구축

Cross-Tenant, Cycle, Orphan, Version 오류를 차단한다.

## Step 25 — 기존 구현 분류·통합

중복 Tree·Department·Legal Entity Mapping을 정리한다.

## Step 26 — 문서·ADR·History 갱신

모든 결정, 위험, 마이그레이션 및 남은 문제를 기록한다.

---

# 72. 생성 또는 갱신할 문서

기존 동일 목적 문서가 있으면 통합하라.

* `docs/segmentation/DSAR_ORGANIZATION_REGISTRY.md`
* `docs/segmentation/DSAR_ORGANIZATION_AUTHORITATIVE_SOURCE.md`
* `docs/segmentation/DSAR_ORGANIZATION_UNIT.md`
* `docs/segmentation/DSAR_ORGANIZATION_UNIT_VERSION.md`
* `docs/segmentation/DSAR_ORGANIZATION_UNIT_VERSION_TYPE.md`
* `docs/segmentation/DSAR_ORGANIZATION_CATEGORY.md`
* `docs/segmentation/DSAR_ORGANIZATION_TYPE.md`
* `docs/segmentation/DSAR_ORGANIZATION_RELATIONSHIP_TYPE.md`
* `docs/segmentation/DSAR_ORGANIZATION_HIERARCHY.md`
* `docs/segmentation/DSAR_ORGANIZATION_HIERARCHY_TYPE.md`
* `docs/segmentation/DSAR_ORGANIZATION_HIERARCHY_VERSION.md`
* `docs/segmentation/DSAR_ORGANIZATION_HIERARCHY_VERSION_STATUS.md`
* `docs/segmentation/DSAR_ORGANIZATION_HIERARCHY_MIGRATION_POLICY.md`
* `docs/segmentation/DSAR_ORGANIZATION_GRAPH_NODE.md`
* `docs/segmentation/DSAR_ORGANIZATION_GRAPH_NODE_ROLE.md`
* `docs/segmentation/DSAR_ORGANIZATION_GRAPH_EDGE.md`
* `docs/segmentation/DSAR_ORGANIZATION_GRAPH_PATH.md`
* `docs/segmentation/DSAR_ORGANIZATION_GRAPH_PATH_TYPE.md`
* `docs/segmentation/DSAR_ORGANIZATION_HIERARCHY_LEVEL.md`
* `docs/segmentation/DSAR_ORGANIZATION_PRIMARY_PARENT_POLICY.md`
* `docs/segmentation/DSAR_ORGANIZATION_TENANT_BINDING.md`
* `docs/segmentation/DSAR_ORGANIZATION_WORKSPACE_BINDING.md`
* `docs/segmentation/DSAR_ORGANIZATION_LEGAL_ENTITY_BINDING.md`
* `docs/segmentation/DSAR_ORGANIZATION_LEGAL_ENTITY_BOUNDARY_POLICY.md`
* `docs/segmentation/DSAR_ORGANIZATION_BUSINESS_UNIT_PROFILE.md`
* `docs/segmentation/DSAR_ORGANIZATION_DIVISION_PROFILE.md`
* `docs/segmentation/DSAR_ORGANIZATION_DEPARTMENT_PROFILE.md`
* `docs/segmentation/DSAR_ORGANIZATION_TEAM_PROFILE.md`
* `docs/segmentation/DSAR_ORGANIZATION_SQUAD_PROFILE.md`
* `docs/segmentation/DSAR_ORGANIZATION_REGION_PROFILE.md`
* `docs/segmentation/DSAR_ORGANIZATION_COUNTRY_PROFILE.md`
* `docs/segmentation/DSAR_ORGANIZATION_BRAND_PROFILE.md`
* `docs/segmentation/DSAR_ORGANIZATION_STORE_PROFILE.md`
* `docs/segmentation/DSAR_ORGANIZATION_MERCHANT_PROFILE.md`
* `docs/segmentation/DSAR_ORGANIZATION_VENDOR_PROFILE.md`
* `docs/segmentation/DSAR_ORGANIZATION_PARTNER_PROFILE.md`
* `docs/segmentation/DSAR_ORGANIZATION_COST_CENTER_BINDING.md`
* `docs/segmentation/DSAR_ORGANIZATION_PROFIT_CENTER_BINDING.md`
* `docs/segmentation/DSAR_ORGANIZATION_POSITION_UNIT.md`
* `docs/segmentation/DSAR_ORGANIZATION_MATRIX_RELATIONSHIP.md`
* `docs/segmentation/DSAR_ORGANIZATION_OWNER.md`
* `docs/segmentation/DSAR_ORGANIZATION_OWNER_TYPE.md`
* `docs/segmentation/DSAR_ORGANIZATION_MEMBERSHIP.md`
* `docs/segmentation/DSAR_ORGANIZATION_MEMBERSHIP_TYPE.md`
* `docs/segmentation/DSAR_ORGANIZATION_SCOPE_BINDING.md`
* `docs/segmentation/DSAR_ORGANIZATION_EFFECTIVE_PERIOD.md`
* `docs/segmentation/DSAR_ORGANIZATION_FUTURE_DATED_CHANGE.md`
* `docs/segmentation/DSAR_ORGANIZATION_RETROACTIVE_CHANGE.md`
* `docs/segmentation/DSAR_ORGANIZATION_LIFECYCLE_EVENT.md`
* `docs/segmentation/DSAR_ORGANIZATION_SNAPSHOT.md`
* `docs/segmentation/DSAR_ORGANIZATION_SNAPSHOT_TYPE.md`
* `docs/segmentation/DSAR_ORGANIZATION_HIERARCHY_CANDIDATE.md`
* `docs/segmentation/DSAR_ORGANIZATION_HIERARCHY_SELECTION_PRIORITY.md`
* `docs/segmentation/DSAR_ORGANIZATION_GRAPH_VALIDATION.md`
* `docs/segmentation/DSAR_ORGANIZATION_CYCLE_DETECTION.md`
* `docs/segmentation/DSAR_ORGANIZATION_ORPHAN_NODE_POLICY.md`
* `docs/segmentation/DSAR_ORGANIZATION_HIERARCHY_RECONCILIATION.md`
* `docs/segmentation/DSAR_ORGANIZATION_HIERARCHY_RECONCILIATION_STATUS.md`
* `docs/segmentation/DSAR_ORGANIZATION_HIERARCHY_CRITICAL_GAP_POLICY.md`
* `docs/segmentation/DSAR_ORGANIZATION_HIERARCHY_STATIC_LINT.md`
* `docs/segmentation/DSAR_ORGANIZATION_HIERARCHY_RUNTIME_GUARDS.md`
* `docs/segmentation/DSAR_ORGANIZATION_HIERARCHY_ERROR_WARNING_CONTRACT.md`
* `docs/segmentation/DSAR_ORGANIZATION_HIERARCHY_EVIDENCE.md`
* `docs/segmentation/DSAR_ORGANIZATION_HIERARCHY_AUDIT_EVENT.md`
* `docs/segmentation/DSAR_ORGANIZATION_HIERARCHY_API_CONTRACT.md`
* `docs/segmentation/DSAR_ORGANIZATION_HIERARCHY_INDEX_PERFORMANCE.md`
* `docs/segmentation/DSAR_ORGANIZATION_HIERARCHY_CACHE_POLICY.md`
* `docs/segmentation/DSAR_ORGANIZATION_HIERARCHY_EXISTING_IMPLEMENTATION.md`
* `docs/segmentation/DSAR_ORGANIZATION_HIERARCHY_DUPLICATE_IMPLEMENTATION_AUDIT.md`
* `docs/segmentation/DSAR_ORGANIZATION_HIERARCHY_FUNCTION_REGRESSION_GATE.md`
* `docs/architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md`
* `docs/pm/PM_CHANGE_HISTORY.md`
* `docs/pm/REPEAT_PROBLEM_HISTORY.md`
* `docs/pm/AGENT_EXECUTION_HISTORY.md`

---

# 73. Organization Unit Matrix

| Unit | Type | Tenant | Legal Entity | Business Unit | Region | Country | Active Version | Effective Period | Status |
| ---- | ---- | ------ | ------------ | ------------- | ------ | ------- | -------------- | ---------------- | ------ |

---

# 74. Hierarchy Matrix

| Hierarchy | Type | Version | Tenant | Root | Nodes | Edges | Max Depth | Effective Period | Status |
| --------- | ---- | ------- | ------ | ---- | ----- | ----- | --------- | ---------------- | ------ |

---

# 75. Graph Edge Matrix

| Source | Relationship | Target | Primary | Legal Boundary | Approval Eligible | Manager Eligible | Validity | Source | Status |
| ------ | ------------ | ------ | ------- | -------------- | ----------------- | ---------------- | -------- | ------ | ------ |

---

# 76. Legal Entity Binding Matrix

| Organization | Legal Entity | Relationship | Operating | Funding | Accounting | Settlement | Payout | Validity | Status |
| ------------ | ------------ | ------------ | --------- | ------- | ---------- | ---------- | ------ | -------- | ------ |

---

# 77. Membership Matrix

| Subject | Organization | Membership | Position | Legal Entity | Workspace | Primary | Validity | Source | Status |
| ------- | ------------ | ---------- | -------- | ------------ | --------- | ------- | -------- | ------ | ------ |

---

# 78. Reconciliation Matrix

| Organization | Source | Canonical State | Hierarchy Version | Difference | Affected Approval | Severity | Resolution | Owner | Status |
| ------------ | ------ | --------------- | ----------------- | ---------- | ----------------- | -------- | ---------- | ----- | ------ |

---

# 79. 검증 게이트

완료 전에 반드시 확인하라.

* Canonical Organization Registry가 구축되었는가
* Organization Unit과 Unit Version이 분리되는가
* Organization Type이 Registry화되었는가
* Relationship Type이 Registry화되었는가
* 단일 Parent Tree가 아닌 Graph를 지원하는가
* Organization Hierarchy와 Version이 분리되는가
* Active Hierarchy Version이 Immutable한가
* Graph Node·Edge가 구축되었는가
* Ancestor·Descendant Path Index가 구축되었는가
* Hierarchy Type별 Primary Parent 규칙이 적용되는가
* Cross-Tenant Edge가 차단되는가
* Tenant·Workspace Binding이 구분되는가
* Legal Entity 관계가 운영·자금·회계·정산·지급 책임으로 구분되는가
* Business Unit·Division·Department가 구분되는가
* Team·Squad가 구분되는가
* Region·Country Binding이 명시적인가
* Brand 소유와 운영 조직이 구분되는가
* Store·Merchant 관계가 구축되는가
* Vendor·Partner가 내부 조직과 외부 Party로 구분되는가
* Cost Center·Profit Center Binding이 구축되는가
* Position Unit Foundation이 구축되는가
* Matrix Relationship이 Primary Hierarchy와 구분되는가
* Organization Owner와 Manager가 구분되는가
* Subject Membership이 Effective-dated인가
* Future-dated Organization Change가 지원되는가
* Retroactive Correction이 Version으로 기록되는가
* 과거 Version이 덮어써지지 않는가
* Approval 시점 Organization Snapshot이 생성되는가
* Hierarchy Candidate가 생성되는가
* Cycle·Orphan·Unreachable Node가 탐지되는가
* HRIS·ERP·IdP·Canonical Reconciliation이 작동하는가
* 최소 Static Lint·Runtime Guard가 작동하는가
* 기존 Organization 기능의 회귀가 없는가
* 중복 Organization Tree가 생성되지 않았는가
* ADR·PM·Repeat Problem·Agent History가 갱신되었는가
* 다음 Reporting Line·Manager Relationship 단계가 실행 가능한가

---

# 80. 완료 보고 형식

다음 순서로 보고하라.

1. Organization Registry 수
2. Organization Unit 수
3. Active Organization Unit 수
4. Retired Organization Unit 수
5. Organization Unit Version 수
6. Organization Type 수
7. Relationship Type 수
8. Organization Hierarchy 수
9. Hierarchy Version 수
10. Active Hierarchy Version 수
11. Scheduled Hierarchy Version 수
12. Graph Node 수
13. Graph Edge 수
14. Primary Edge 수
15. Secondary Edge 수
16. Matrix Edge 수
17. Cross-Legal-Entity Edge 수
18. Graph Path 수
19. Maximum Hierarchy Depth
20. Business Unit 수
21. Division 수
22. Department 수
23. Team 수
24. Squad 수
25. Legal Entity Binding 수
26. Workspace Binding 수
27. Region 수
28. Country Organization 수
29. Brand Organization 수
30. Store Organization 수
31. Merchant Organization 수
32. Vendor Organization 수
33. Partner Organization 수
34. Cost Center Binding 수
35. Profit Center Binding 수
36. Position Unit 수
37. Matrix Relationship 수
38. Organization Owner 수
39. Organization Membership 수
40. Primary Membership 수
41. Temporary Membership 수
42. Future-dated Change 수
43. Retroactive Correction 수
44. Organization Snapshot 수
45. Hierarchy Candidate 수
46. Cycle Detection 수
47. Cycle 차단 수
48. Orphan Node 수
49. Unreachable Node 수
50. Primary Parent Conflict 수
51. Legal Entity Binding 오류 수
52. Cross-Tenant Edge 차단 수
53. Cross-Tenant Membership 차단 수
54. Path Index Mismatch 수
55. Reconciliation Mismatch 수
56. HRIS Mismatch 수
57. ERP Mismatch 수
58. IdP·SCIM Mismatch 수
59. Active Approval Impact 수
60. Static Lint Rule 수
61. Runtime Guard 수
62. Existing Implementation 수
63. Duplicate Implementation 수
64. Migration Required 수
65. Manual Review 수
66. Function Regression 수
67. 생성·갱신한 문서
68. 남은 리스크
69. 다음 Reporting Line, Manager Relationship & Supervisory Hierarchy Governance 준비 상태

---

# 81. 완료 조건

다음 조건을 모두 충족해야 이번 블록을 완료로 인정한다.

1. Organization Registry가 구축되었다.
2. Organization Unit이 구축되었다.
3. Organization Unit Version이 구축되었다.
4. Organization Type이 구축되었다.
5. Organization Relationship Type이 구축되었다.
6. Organization Hierarchy가 구축되었다.
7. Organization Hierarchy Version이 구축되었다.
8. Organization Graph Node가 구축되었다.
9. Organization Graph Edge가 구축되었다.
10. Organization Graph Path가 구축되었다.
11. Hierarchy Level이 구축되었다.
12. Tenant Binding이 구축되었다.
13. Workspace Binding이 구축되었다.
14. Legal Entity Binding이 구축되었다.
15. Business Unit Profile이 구축되었다.
16. Division Profile이 구축되었다.
17. Department Profile이 구축되었다.
18. Team Profile이 구축되었다.
19. Squad Profile이 구축되었다.
20. Region Profile이 구축되었다.
21. Country Profile이 구축되었다.
22. Brand Profile이 구축되었다.
23. Store Profile이 구축되었다.
24. Merchant Profile이 구축되었다.
25. Vendor Profile이 구축되었다.
26. Partner Profile이 구축되었다.
27. Cost Center Binding이 구축되었다.
28. Profit Center Binding이 구축되었다.
29. Position Unit Foundation이 구축되었다.
30. Matrix Organization Foundation이 구축되었다.
31. Organization Owner가 구축되었다.
32. Organization Membership이 구축되었다.
33. Organization Scope Binding이 구축되었다.
34. Effective Dating이 구축되었다.
35. Future-dated Change가 구축되었다.
36. Retroactive Correction이 구축되었다.
37. Organization Lifecycle Event가 구축되었다.
38. Organization Snapshot이 구축되었다.
39. Hierarchy Candidate가 구축되었다.
40. Graph Validation이 구축되었다.
41. Cycle Detection이 구축되었다.
42. Orphan Detection이 구축되었다.
43. Hierarchy Reconciliation이 구축되었다.
44. 최소 Static Lint가 구축되었다.
45. 최소 Runtime Guard가 구축되었다.
46. 기존 Organization 구현이 분류되었다.
47. 중복 Organization 모델 통합 계획이 작성되었다.
48. 기존 정상 기능의 회귀가 없다.
49. ADR·PM Change History·Repeat Problem·Agent History가 갱신되었다.
50. 다음 Reporting Line·Manager Relationship Engine이 사용할 검증된 Organization Graph Foundation이 준비되었다.

---

# 82. 최종 실행 명령

지금 즉시 검증된 Authorization, Role, Organization Scope, Approval Foundation 및 Workflow Execution Engine 위에 Rebate Organization Hierarchy & Organizational Graph Foundation Governance를 구축하라.

기존 Repository, Database, API, HRIS, ERP, Finance Master, CRM, IdP, SCIM, Tenant Admin, Workspace Admin, Role System 및 Approval System에서 Organization, Legal Entity, Business Unit, Division, Department, Team, Region, Country, Brand, Store, Merchant, Vendor, Partner, Cost Center, Profit Center, Position 및 Membership 구현을 전수 조사하라.

기존 동일 목적 Organization Registry, Tree, Graph, Closure Table, Materialized Path 또는 External Directory가 존재하면 중복 생성하지 말고 Canonical Organization Graph와 Adapter로 통합하라.

Organization과 Legal Entity를 동일시하지 마라.

Organization Unit Identity와 Organization Unit Version을 분리하라.

Organization 이름을 Key로 사용하지 말고 Canonical ID, Code, Source Reference 및 Version을 사용하라.

Administrative, Functional, Financial, Legal Entity, Regional, Country, Brand, Project, Matrix 및 Approval Hierarchy를 구분하라.

단일 Parent ID로 모든 조직 관계를 표현하지 말고 Canonical Node·Edge Graph를 구축하라.

Hierarchy Type별 Primary Parent와 Secondary Relationship을 구분하라.

Administrative·Legal·Financial Hierarchy에서 허용되지 않은 Multiple Primary Parent를 차단하라.

Matrix·Functional·Project 관계를 Primary Administrative Parent로 자동 해석하지 마라.

Organization Registry, Organization Unit, Unit Version, Type Registry, Relationship Registry, Hierarchy, Hierarchy Version, Node, Edge, Path, Level 및 Effective Period를 구축하라.

Active Hierarchy Version을 직접 수정하지 말고 새 Version을 생성하라.

Hierarchy Version에 Root, Node Count, Edge Count, Maximum Depth, Effective Period, Source Version, Affected Users, Affected Role Assignments, Affected Approval Workflows, Affected Active Approval Cases 및 Immutable Hash를 기록하라.

Tenant, Workspace, Legal Entity, Region, Country, Brand, Store, Merchant, Vendor, Partner, Cost Center, Profit Center 및 Program Scope Binding을 지원하라.

다른 Tenant Organization 간 Parent·Child Edge, Membership 및 Workspace Binding을 차단하라.

Cross-Tenant 운영·보고 Reference가 필요한 경우 일반 Hierarchy Edge가 아니라 제한된 Reference Binding을 사용하라.

Legal Entity Binding에서 Employing, Operating, Funding, Liability, Accounting, Settlement, Payout 및 Tax Responsibility를 구분하라.

Financial Organization Unit에는 Legal Entity Binding을 강제하라.

Settlement Organization에는 Accounting Entity와 Settlement Entity를 확인하라.

Payout Organization에는 Payout Entity를 확인하라.

Cross-Legal-Entity 관계는 Intercompany, Shared Service, Joint Venture 또는 명시적 Matrix Relationship으로 기록하라.

Business Unit, Division, Department, Team 및 Squad Profile을 구축하고 각각의 Owner, Legal Entity, Region, Country, Cost Center, Profit Center, Workspace 및 Approval Hierarchy Reference를 관리하라.

Temporary Squad와 Temporary Organization Unit에는 Valid To를 강제하라.

Region과 Country 관계를 이름으로 추론하지 말고 명시적 Binding으로 관리하라.

Brand의 Legal Owner와 Operating Organization을 분리하라.

Store, Merchant, Vendor 및 Partner가 내부 Organization인지 외부 Party인지 명시하라.

Cost Center와 Profit Center의 Owner, Legal Entity, Currency, Financial Responsibility 및 Approval Hierarchy Reference를 기록하라.

Position Unit Foundation을 구축하되 구체적인 Manager Resolution은 다음 블록에서 구현하라.

Organization Owner와 Manager를 동일시하지 마라.

Executive Owner, Administrative Owner, Functional Owner, Financial Owner, Budget Owner, Program Owner, Brand Owner, Regional Owner, Country Owner, Cost Center Owner 및 Profit Center Owner를 구분하라.

Subject의 Employee, Contractor, Partner, Vendor, Temporary, Project 및 Shared Service Membership을 Effective-dated로 관리하라.

Subject가 여러 Membership을 가질 수 있게 하되 Primary Employment Membership을 명확히 하라.

Business Valid Time과 System Recorded Time을 구분하여 Historical·Future-dated·Retroactive Organization Change를 지원하라.

Retroactive Change 시 기존 Version과 Snapshot을 덮어쓰지 말고 Correction Version, Justification, Approval Reference, Affected Period 및 Reconciliation을 생성하라.

Future-dated Organization 생성, Parent 변경, Legal Entity 변경, Department Transfer, Region Transfer, Merge, Split 및 Retirement를 예약할 수 있게 하라.

Future Change 활성화 시 Node, Edge, Path Index, Cache, Membership, Role Assignment, Workflow Binding 및 진행 중 Approval 영향도를 평가하라.

Approval Request Submission, Case Creation, Approver Resolution, Task Assignment, Task Claim, Approval Decision 및 Execution 시점에 불변 Organization Snapshot을 생성할 수 있게 하라.

Snapshot에 Hierarchy ID, Hierarchy Version, Organization Unit Version, Primary·Functional·Financial Path, Hierarchy Level, Legal Entity, Business Unit, Division, Department, Team, Region, Country, Brand, Cost Center, Profit Center, Position, Owner, Membership, Effective Date 및 Immutable Hash를 기록하라.

현재 Organization Graph로 과거 Approval Snapshot을 대체하지 마라.

Ancestor, Descendant, Immediate Parent, Immediate Child, Root, Path Length 및 Approval-eligible Path 조회를 지원하라.

Graph Traversal에 Tenant, Hierarchy Version, Effective Date, Relationship Type, Legal Entity Boundary, Maximum Depth, Cycle Protection 및 Timeout을 적용하라.

Closure Table, Materialized Path, Recursive CTE 또는 Graph Database 중 기존 기술 스택에 적합한 방식을 사용하되 Node·Edge를 Canonical Source of Truth로 유지하라.

Graph Version 활성화 전에 Root, Multiple Root, Node·Edge Validity, Cycle, Self-loop, Orphan, Unreachable Node, Maximum Depth, Primary Parent, Type Constraint, Legal Entity Boundary, Effective Period, Path Index 및 Immutable Hash를 검증하라.

PARENT_OF, LEGALLY_OWNED_BY, FINANCIALLY_OWNED_BY, REPORTS_THROUGH, COST_CENTER_OF, PROFIT_CENTER_OF, BELONGS_TO_REGION 및 BELONGS_TO_COUNTRY 관계의 Cycle을 차단하라.

Matrix·Advisory 관계의 순환도 Risk로 탐지하라.

Approval Hierarchy Candidate에 Subject Membership, Primary Organization, Secondary Organization, Legal Entity, Region, Country, Cost Center, Profit Center, Matrix Relationship, Candidate Hierarchy Version, Proposed Path, Conflict 및 Manual Review Requirement를 기록하라.

Explicit Approval Hierarchy, Resource Hierarchy, Legal Entity Hierarchy, Business Unit Hierarchy, Department Hierarchy, Cost Center Hierarchy, Profit Center Hierarchy, Program Hierarchy, Regional Hierarchy, Tenant Default 및 Platform Template 순서의 기본 후보 우선순위를 제공하라.

동일 우선순위에서 여러 Hierarchy가 충돌하면 임의 선택하지 말고 Manual Review 또는 Block으로 처리하라.

HRIS, ERP, Finance Master, IdP, SCIM, CRM, Tenant Registry, Workspace Registry, Legal Entity Registry, Country Registry, Region Registry, Brand Registry, Store Registry, Merchant Registry, Vendor Registry, Position Registry, Role Assignment 및 Approval Workflow Binding을 Canonical Organization Graph와 Reconciliation하라.

Cross-Tenant Edge, Cross-Tenant Membership, Cycle, Multiple Primary Parent, Legal Entity 누락, 종료된 Organization의 Active Membership·Role·Workflow, 과거 Version 덮어쓰기, Snapshot 누락, Path Index Drift 및 Source of Truth 불명확을 Critical Gap으로 생성하라.

Tenant 없는 Unit, Type 없는 Unit, Root 없는 Hierarchy, Self-loop, Cycle, Orphan, Unreachable Node, Cross-Tenant Edge, 중첩된 Primary Parent, Effective Period 오류, 종료된 Node의 Active Edge, Version Hash 누락, Active Version 직접 수정, Snapshot 수정 및 Organization 이름 기반 Join을 Static Lint에서 차단하라.

Inactive Unit·Hierarchy, Tenant·Workspace·Legal Entity Mismatch, Effective Date 오류, Graph Cycle, Path Resolution Failure, Primary Parent Conflict, Snapshot 오류, Path Index Drift, Future Change Activation Failure 및 Critical Reconciliation Drift를 Runtime Guard로 차단하라.

기존 Tenant Admin, Workspace Admin, Role Assignment, HRIS Sync, ERP Sync, Rebate Program, Approval Request, Workflow Task 및 Financial 기능과 Legacy Equivalence를 수행하라.

기존 정상 기능을 유지하면서 중복 Organization Tree, 독립 Department Table, 이름 기반 Mapping, 현재 Parent만 저장하는 모델, Effective Date 없는 관계 및 Historical Version Update를 제거하거나 Canonical Adapter로 전환하라.

모든 Organization Registry, Unit, Version, Type, Relationship, Hierarchy, Node, Edge, Path, Binding, Profile, Membership, Owner, Effective Period, Future Change, Retroactive Correction, Snapshot, Candidate, Reconciliation, 중복 구현 및 남은 위험을 ADR, PM Change History, Repeat Problem History 및 Agent Execution History에 기록하라.

다음 단계인 **EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-3-2 — Rebate Reporting Line, Manager Relationship & Supervisory Hierarchy Governance**를 구현할 수 있는 검증된 Organization Hierarchy & Graph Foundation을 완성하라.
