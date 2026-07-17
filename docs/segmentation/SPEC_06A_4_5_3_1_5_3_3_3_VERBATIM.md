# 스펙 원문 영속 (Verbatim) — EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-3-3

> **Rebate Approval Chain Definition & Hierarchical Route Foundation Governance** · Version 1.0
> 289차(2026-07-17) 수령 · **원문 무손실 전재**. 이 파일은 이 블록의 **유일한 요구 분모(정본)** 다.

## 🔴 이 파일이 먼저 작성된 이유 — 5-3-1 에서 배운 것

5-3-1 에서 "수령 즉시 분모 영속"을 **했다고 판단**했으나 **개수만** 적었다. 항목명은 저장소에 없었고 스펙 원문은 **채팅에만** 있어 산출 에이전트 **5개가 독립적으로 정지**했다("전사할 원문이 없다 · 지어내면 역산"). **그 지적이 옳았다.**
★**개수는 분모가 아니다** · ★**개수마저 틀린다**(5-3-3-2 에서 PM 분모 4건 오류 — 전부 *"섹션에 목록이 둘인데 첫 번째만 셈"*) · ★**개수가 맞아도 항목명이 날조일 수 있다**(`REQUIREMENT_TYPE` 20/20 인데 축 상이).
∴ **분모 검증은 개수가 아니라 항목명 원문 대조여야 한다. 그래서 원문을 먼저 박는다.**
> 분모는 `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_3_VERBATIM.md --sec=N` 로 센다(불릿 `* ` + 번호목록 `N. ` 양쪽).

## ⚠️ 착수 전 확정 사항 — §71 경로 충돌

원문 §71 은 `docs/adr/ADR_*.md` 를 지정하나 **레포에 `docs/adr/` 는 없고 ADR 정본은 `docs/architecture/`(83편)** 다. `docs/adr/` 신설 = **ADR 거처 2벌 = 헌법(중복 금지) 위반**.
→ **원문은 그대로 보존**하되 산출은 **`docs/architecture/`** 로 간다. 근거는 **§71 자신**: *"기존 동일 목적 문서가 있으면 새로 중복 생성하지 말고 통합하라."*
또한 §71 은 **"Entity·Enum별 문서를 무조건 각각 생성하지 마라"** 를 명시한다 — **앞 세 블록(5-3-2 84편 · 5-3-3-1 70편 · 5-3-3-2 81편)의 per-entity 전사 패턴을 이 블록에 적용하면 원문 위반**이다.

---

# 0. 작업 목적

앞 단계에서 구축한 다음 기반 위에 Rebate Approval의 단계·레벨·경로·순서를 선언적으로 정의하고, 특정 Approval Request에 적용할 승인 경로를 일관되게 해석할 수 있는 **Rebate Approval Chain Definition & Hierarchical Route Foundation Governance**를 구축하라.

선행 기반:

* Organization Hierarchy & Organizational Graph Foundation
* Reporting Line, Manager Relationship & Supervisory Hierarchy Governance
* Canonical Identity
* Authorization Foundation
* Approval Request·Case·Requirement
* Workflow Definition·Execution Foundation
* Tenant·Workspace·Legal Entity·Scope Governance

이번 단계에서는 다음을 완성한다.

* Approval Chain Registry
* Approval Chain Definition
* Approval Chain Version
* Approval Chain Template
* Approval Chain Template Version
* Approval Stage Definition
* Approval Level Definition
* Approval Route Definition
* Hierarchical Route Foundation
* Route Segment
* Route Node
* Route Edge
* Route Condition
* Route Branch
* Route Merge
* Route Entry
* Route Exit
* Chain Applicability
* Chain Selection
* Chain Resolution Foundation
* Chain Resolution Input
* Chain Resolution Result
* Chain Candidate
* Chain Conflict
* Chain Override
* Chain Fallback
* Chain Validation
* Chain Compilation
* Chain Snapshot Foundation
* Chain Change Impact
* Chain Reconciliation
* Static Lint
* Runtime Guard
* Evidence
* Audit
* 기존 구현 통합
* 중복 구현 감사
* ADR·PM·Repeat Problem·Agent History

이번 단계는 다음 기능을 최종 완성하는 단계가 아니다.

* 금액별 최종 승인 권한 계산
* Currency·Monetary Authority Matrix
* 실제 Manager·Approver Candidate 최종 선정
* 최종 Candidate Ranking
* Sequential Task 실행
* Parallel Task 실행
* Committee·Quorum·Voting
* Delegation·Substitute 실행
* SLA·Escalation
* Skip-Level·Executive 예외 경로 전체 기능
* Matrix Organization 다중 관리자 최종 승인 실행
* Cross-Entity Global Approval 전체 기능
* Production Certification

후속 블록이 신뢰할 수 있는 Versioned Approval Chain과 Hierarchical Route Definition을 사용할 수 있도록 기반을 완성한다.

이번 단계 완료 후 다음 질문에 정확하게 답할 수 있어야 한다.

* 특정 Rebate Request에 어떤 Approval Chain Definition이 적용되는가
* 동일 조건에 여러 Chain이 적용되면 무엇을 선택하는가
* Chain은 몇 개의 Stage와 Level로 구성되는가
* Stage와 Level의 차이는 무엇인가
* 각 Level은 어떤 관리자 계층 또는 Actor Source를 요구하는가
* Direct Manager부터 몇 단계 상위 Manager까지 경로에 포함하는가
* Organization Head·Functional Manager·Cost Center Owner를 어느 Level에서 요구하는가
* Route가 순차·병렬·조건부·혼합 중 무엇인지 알 수 있는가
* 특정 Level이 필수인지 선택인지 알 수 있는가
* 특정 조건에서 Level이 추가·제외되는가
* Route Branch가 어디에서 분기되고 다시 병합되는가
* Chain에 시작점과 종료점이 명확한가
* 순환 Route가 존재하는가
* 연결되지 않은 Stage·Level·Node가 존재하는가
* 특정 Chain Version이 언제부터 유효한가
* 과거 Approval 당시 사용한 Chain Version을 재현할 수 있는가
* Active Chain Version을 직접 수정하고 있는가
* Chain Override가 어떤 근거로 적용되었는가
* Tenant·Legal Entity·Program·Country Scope가 일치하는가
* Chain이 Authority Matrix를 참조하지만 Authority 자체를 중복 정의하지 않는가
* Chain이 Manager Relationship을 참조하지만 Manager를 직접 확정하지 않는가
* Chain Definition과 실제 Workflow Task가 일치하는가
* Chain 변경이 진행 중 Approval Case에 어떤 영향을 주는가
* Chain Resolution 실패 시 어떤 Fallback 또는 Manual Review가 적용되는가

---

# 1. 구현 범위

이번 블록에서는 다음을 구현한다.

1. Approval Chain Registry
2. Approval Chain Definition
3. Approval Chain Version
4. Approval Chain Template
5. Approval Chain Template Version
6. Approval Chain Type
7. Approval Stage Definition
8. Approval Stage Version
9. Approval Level Definition
10. Approval Level Version
11. Approval Route Definition
12. Approval Route Version
13. Hierarchical Route
14. Route Segment
15. Route Node
16. Route Edge
17. Route Entry·Exit
18. Route Condition
19. Route Branch
20. Route Merge
21. Route Applicability
22. Chain Applicability
23. Chain Selection Policy
24. Chain Priority
25. Chain Resolution Input
26. Chain Resolution Candidate
27. Chain Resolution Result
28. Chain Compilation
29. Chain Validation
30. Chain Conflict
31. Chain Override
32. Chain Fallback
33. Missing Chain Handling
34. Chain Effective Dating
35. Future-dated Chain Change
36. Retroactive Chain Correction
37. Chain Snapshot Foundation
38. Chain Change Impact
39. In-flight Case Policy Reference
40. Chain Reconciliation
41. 기본 Static Lint
42. 기본 Runtime Guard
43. Error Contract
44. Warning Contract
45. Evidence·Audit
46. API Contract
47. Index·Performance
48. Cache Governance
49. Test
50. 기존 구현 분류
51. 중복 구현 감사
52. ADR·PM·Repeat Problem·Agent History

이번 블록에서는 다음을 상세 구현하지 않는다.

* 실제 금액 한도 승인 권한
* Monetary Authority 계산
* Currency Conversion Authority
* 최종 Approver Subject 선정
* Manager Candidate 최종 Ranking
* Candidate Authorization 최종 판정
* Workflow Task 순차 활성화
* Committee Voting
* Delegation 실행
* Substitute 실행
* Escalation 실행
* Final Production Certification

이번 블록에서는 다음 후속 기능이 사용할 **Canonical Contract와 Versioned Definition**만 구축한다.

---

# 2. 실행 역할

너는 다음 역할을 동시에 수행한다.

* Enterprise Approval Architecture 책임자
* Approval Chain Domain Architect
* Hierarchical Route Architect
* Approval Stage 책임자
* Approval Level 책임자
* Approval Route 책임자
* Chain Template 책임자
* Chain Versioning 책임자
* Chain Applicability 책임자
* Chain Selection 책임자
* Conditional Route 책임자
* Branch·Merge 책임자
* Hierarchical Manager Route 책임자
* Approval Definition Compiler 책임자
* Chain Validation 책임자
* Chain Conflict 책임자
* Chain Override 책임자
* Chain Effective Dating 책임자
* Historical Chain Reconstruction 책임자
* Chain Snapshot 책임자
* In-flight Approval Impact 책임자
* Tenant Isolation 책임자
* Cross-Legal-Entity Route Boundary 책임자
* Evidence·Audit·Lineage 책임자
* 기존 Approval Chain 구현의 비파괴적 통합 책임자
* ADR·PM History 책임자

---

# 3. 선행조건

작업 시작 전 Repository 전체를 조사하고 다음 구현의 실제 존재 여부·스키마·API·서비스·테스트 상태를 확인하라.

## 3.1 Organization Foundation

* `ORGANIZATION_REGISTRY`
* `ORGANIZATION_UNIT`
* `ORGANIZATION_UNIT_VERSION`
* `ORGANIZATION_HIERARCHY`
* `ORGANIZATION_HIERARCHY_VERSION`
* `ORGANIZATION_GRAPH_NODE`
* `ORGANIZATION_GRAPH_EDGE`
* `ORGANIZATION_GRAPH_PATH`
* `ORGANIZATION_HIERARCHY_LEVEL`
* `ORGANIZATION_SCOPE_BINDING`
* `ORGANIZATION_SNAPSHOT`
* Tenant·Workspace·Legal Entity Binding

## 3.2 Reporting Line Foundation

* `REPORTING_LINE_REGISTRY`
* `REPORTING_LINE_DEFINITION`
* `REPORTING_LINE_VERSION`
* `SUPERVISORY_HIERARCHY`
* `SUPERVISORY_HIERARCHY_VERSION`
* `MANAGER_RELATIONSHIP_TYPE`
* `MANAGER_RELATIONSHIP`
* `MANAGER_RELATIONSHIP_VERSION`
* `MANAGER_ASSIGNMENT`
* `MANAGER_ASSIGNMENT_SCOPE`
* `MANAGER_EFFECTIVE_PERIOD`
* `MANAGER_VACANCY`
* `MISSING_MANAGER_POLICY`
* `SUPERVISORY_PATH`
* `MANAGER_CHAIN_REFERENCE`
* `MANAGER_RELATIONSHIP_SNAPSHOT`

## 3.3 Approval Foundation

* Approval Request
* Approval Case
* Approval Requirement
* Approval Participant
* Approval Actor
* Approval Decision
* Approval Policy
* Approval Workflow Definition
* Approval Workflow Version
* Approval Workflow Task
* Approval Assignment Hook
* Approval Snapshot
* Actor Authorization Snapshot
* Approval Evidence
* Approval Audit Event

## 3.4 Authorization Foundation

* Canonical Identity
* Subject Registry
* Role Registry
* Role Assignment
* Permission
* Scope Binding
* Authorization Policy
* Authorization Decision
* Resource Registry
* Tenant Context
* Workspace Context
* Legal Entity Context
* Country·Region Context
* Program·Product·Brand Context

## 3.5 기존 구현 전수 조사

다음을 Repository 전체에서 탐지하라.

* Existing Approval Chain
* Existing Approval Route
* Existing Approval Level
* Existing Approval Stage
* Existing Approval Step
* Existing Approval Sequence
* Existing Approver Order
* Existing Workflow Route
* Existing Workflow Node·Edge
* Existing Conditional Branch
* Existing Manager Approval Rule
* Existing Hierarchical Approval
* Existing Multi-Level Approval
* Existing Amount-based Route
* Existing Rebate Approval Route
* Existing Finance Approval Chain
* Existing Legal Approval Chain
* Existing Security Approval Chain
* Existing Executive Approval Chain
* Existing `approval_chain_id`
* Existing `approval_level`
* Existing `approval_stage`
* Existing `step_order`
* Existing `sequence_no`
* Existing `route_id`
* Existing `next_step`
* Existing `previous_step`
* Existing `manager_level`
* Existing `approval_depth`
* Existing Hard-coded Approver Sequence
* Existing Hard-coded Manager-of-manager Query
* Existing JSON Workflow Definition
* Existing BPMN Definition
* Existing State Machine Definition
* Existing Rule Engine Definition
* Existing Workflow Template
* Existing Chain Snapshot
* Existing Chain Version
* Existing Chain Override
* Existing Approval Fallback
* Existing Missing Chain Handling
* Existing Route Conflict Handling
* Migration History
* Git History
* 운영 로그
* 장애 기록
* 테스트 결과
* 문서·ADR·PM History

동일 목적 구현이 존재하면 새 Rebate 전용 Chain Engine을 무조건 생성하지 마라.

기존 Canonical Approval·Workflow Domain과 통합하거나 Adapter로 연결하라.

---

# 4. 핵심 원칙

## 4.1 Chain Definition과 Chain Execution을 분리한다

Approval Chain Definition은 승인 경로가 어떻게 구성되어야 하는지를 선언한다.

Approval Execution은 실제 Task를 생성하고 활성화하며 완료 상태를 관리한다.

이번 단계에서 실제 Sequential Task Activation을 구현하지 마라.

---

## 4.2 Manager Relationship과 Approval Chain을 분리한다

Reporting Line은 누가 누구의 Manager인지 나타낸다.

Approval Chain은 어떤 관리자 관계 또는 Actor Source가 어떤 Level에서 필요한지 정의한다.

Chain Definition에 특정 현재 직원 ID를 하드코딩하지 마라.

---

## 4.3 Authority와 Route를 분리한다

Approval Chain은 승인 순서와 경로를 정의한다.

Authority Matrix는 해당 Actor가 금액·통화·법인·거래 범위에서 승인할 권한이 있는지 결정한다.

Chain Level에 Monetary Limit를 중복 저장하지 말고 Authority Policy Reference만 연결하라.

---

## 4.4 Stage와 Level을 구분한다

Stage는 승인 목적 또는 논리적 처리 구간이다.

Level은 Stage 안에서 필요한 승인 계층·순서·깊이다.

예:

```text
Stage: Management Review
 ├─ Level 1: Direct Manager
 └─ Level 2: Manager of Manager

Stage: Finance Review
 └─ Level 1: Cost Center Owner
```

Stage와 Level을 동일 테이블의 단순 `step_order`로 압축하지 마라.

---

## 4.5 Chain은 Versioned·Immutable해야 한다

Active Chain Version을 직접 수정하지 마라.

변경 시 새 Version을 생성하고 유효 시점을 기록하라.

과거 Approval은 당시 Chain Version으로 재현해야 한다.

---

## 4.6 Route는 Directed Acyclic Graph를 기본으로 한다

Route Node와 Edge는 기본적으로 Cycle이 없어야 한다.

Return·Reapproval 같은 실행상 되돌림은 후속 Sequential Execution에서 별도 Transition Policy로 구현한다.

Definition Route 자체에 무제한 Cycle을 허용하지 마라.

---

## 4.7 Chain Selection은 결정론적이어야 한다

동일 Approval Request에 여러 Chain이 일치하는 경우 결과가 임의 순서에 따라 달라지지 않게 하라.

Priority, Specificity, Effective Period 및 Tie-break Policy를 명시한다.

---

## 4.8 Override는 원본 Chain을 수정하지 않는다

Override는 Base Chain Version에 대한 별도 Overlay로 저장한다.

원본 Chain Definition과 Version은 보존한다.

---

## 4.9 Hierarchical Route는 관리자 Subject를 직접 저장하지 않는다

Route Level에는 다음과 같은 Actor Source Requirement를 저장한다.

* DIRECT_MANAGER
* MANAGER_OF_MANAGER
* ADMINISTRATIVE_MANAGER
* FUNCTIONAL_MANAGER
* ORGANIZATION_HEAD
* COST_CENTER_OWNER
* PROGRAM_OWNER
* ROLE
* AUTHORITY_PROFILE
* CUSTOM_RESOLVER_REFERENCE

실제 Subject Resolution은 후속 5-3-3-5에서 수행한다.

---

## 4.10 과거 Chain을 현재 Definition으로 재해석하지 않는다

Approval Request·Case·Chain Build 시 사용한 Chain Version과 Resolution Evidence를 보존하라.

---

## 4.11 Tenant Isolation을 강제한다

다른 Tenant Chain, Template, Stage, Level 또는 Route Node를 참조하지 마라.

Shared Template이 필요한 경우 Platform Template을 Tenant별로 명시적으로 Binding하라.

---

## 4.12 단일 Canonical Source of Truth를 유지한다

`APPROVAL_CHAIN_DEFINITION`을 Chain Identity의 Canonical Source of Truth로 사용하라.

Stage·Level·Route는 Chain Version에 속하는 구성요소다.

Workflow Module 내부에 독립 Approval Chain을 다시 만들지 마라.

---

# 5. 책임 경계

이번 블록의 책임:

```text
Approval Request Context
        ↓
Applicable Chain Definition 선택
        ↓
Chain Version 확정
        ↓
Stage·Level·Route 구조 해석
        ↓
Actor Source Requirement 생성
        ↓
Chain Resolution Foundation 결과
```

후속 블록 책임:

```text
5-3-3-4
Authority Matrix와 권한 한도

5-3-3-5
실제 Manager·Role·Owner Candidate와 Eligibility

5-3-3-6
Task 생성·순차 활성화·완료·재진입

5-3-3-7
Skip-Level·Executive·Exceptional Route

5-3-3-8
Matrix Organization과 Multi-Manager 실행

5-3-3-9
Committee·Panel·Voting

5-3-3-11
전체 Hierarchy Snapshot 심화

5-3-3-12
조직 변경과 In-flight Migration

5-3-3-13
Runtime Conflict·Drift 심화

5-3-3-14
Production Certification
```

---

# 6. Canonical Entity

기존 동등 Entity가 없을 경우 최소 다음을 구축하라.

* `APPROVAL_CHAIN_REGISTRY`
* `APPROVAL_CHAIN_DEFINITION`
* `APPROVAL_CHAIN_VERSION`
* `APPROVAL_CHAIN_TEMPLATE`
* `APPROVAL_CHAIN_TEMPLATE_VERSION`
* `APPROVAL_CHAIN_TYPE`
* `APPROVAL_STAGE_DEFINITION`
* `APPROVAL_STAGE_VERSION`
* `APPROVAL_LEVEL_DEFINITION`
* `APPROVAL_LEVEL_VERSION`
* `APPROVAL_ROUTE_DEFINITION`
* `APPROVAL_ROUTE_VERSION`
* `APPROVAL_ROUTE_SEGMENT`
* `APPROVAL_ROUTE_NODE`
* `APPROVAL_ROUTE_EDGE`
* `APPROVAL_ROUTE_CONDITION`
* `APPROVAL_ROUTE_BRANCH`
* `APPROVAL_ROUTE_MERGE`
* `APPROVAL_CHAIN_APPLICABILITY`
* `APPROVAL_CHAIN_SELECTION_POLICY`
* `APPROVAL_CHAIN_PRIORITY`
* `APPROVAL_CHAIN_RESOLUTION_INPUT`
* `APPROVAL_CHAIN_CANDIDATE`
* `APPROVAL_CHAIN_RESOLUTION_RESULT`
* `APPROVAL_CHAIN_VALIDATION`
* `APPROVAL_CHAIN_COMPILATION`
* `APPROVAL_CHAIN_CONFLICT`
* `APPROVAL_CHAIN_OVERRIDE`
* `APPROVAL_CHAIN_FALLBACK`
* `MISSING_APPROVAL_CHAIN_POLICY`
* `APPROVAL_CHAIN_EFFECTIVE_PERIOD`
* `APPROVAL_CHAIN_SNAPSHOT`
* `APPROVAL_CHAIN_CHANGE_IMPACT`
* `APPROVAL_CHAIN_RECONCILIATION`
* `APPROVAL_CHAIN_EVIDENCE`
* `APPROVAL_CHAIN_AUDIT_EVENT`

Rebate 전용으로 기존 Workflow Chain을 복제하지 마라.

기존 Workflow Definition이 범용 DAG를 제공한다면 Approval Chain은 해당 Workflow Graph를 참조하거나 Approval 전용 Semantic Layer로 구현하라.

---

# 7. Approval Chain Registry

`APPROVAL_CHAIN_REGISTRY`

필수 필드:

* approval_chain_registry_id
* tenant_id
* registry_code
* registry_name
* registry_type
* approval_domain
* authoritative_source
* supported chain types
* template support
* hierarchy route support
* conditional route support
* branch support
* parallel reference support
* effective dating support
* historical support
* synchronization mode
* owner
* active version reference
* valid_from
* valid_to
* status
* evidence

Registry Type:

* PLATFORM
* TENANT
* REBATE
* FINANCE
* LEGAL
* SECURITY
* COMPLIANCE
* SALES
* PARTNER
* WORKFLOW
* IMPORTED
* CUSTOM

---

# 8. Approval Chain Type

`APPROVAL_CHAIN_TYPE`

지원 Type:

* SINGLE_LEVEL
* MULTI_LEVEL
* HIERARCHICAL
* SEQUENTIAL_REFERENCE
* PARALLEL_REFERENCE
* CONDITIONAL
* HYBRID
* FUNCTIONAL
* FINANCIAL
* LEGAL
* COMPLIANCE
* SECURITY
* EXECUTIVE_REFERENCE
* MATRIX_REFERENCE
* COMMITTEE_REFERENCE
* CROSS_ENTITY_REFERENCE
* EXCEPTION_REFERENCE
* CUSTOM

필수 필드:

* approval_chain_type_id
* type_code
* type_name
* category
* hierarchy_based 여부
* multiple_stage_allowed 여부
* multiple_level_allowed 여부
* branching_allowed 여부
* merging_allowed 여부
* parallel_reference_allowed 여부
* override_allowed 여부
* fallback_allowed 여부
* authority_reference_required 여부
* status
* evidence

---

# 9. Approval Chain Definition

`APPROVAL_CHAIN_DEFINITION`

필수 필드:

* approval_chain_definition_id
* approval_chain_registry_id
* tenant_id
* chain_code
* chain_name
* chain_type_id
* approval_domain
* request_type
* resource_type
* transaction_type
* rebate_type
* chain purpose
* chain description
* organization scope
* legal entity scope
* workspace scope
* country scope
* region scope
* program scope
* product scope
* brand scope
* partner scope
* channel scope
* environment scope
* applicability policy reference
* selection policy reference
* authority policy reference
* actor resolution policy reference
* workflow definition reference
* fallback policy reference
* owner
* active version
* valid_from
* valid_to
* status
* evidence

Chain Definition에는 현재 Manager Subject ID나 현재 Approver Subject ID를 저장하지 마라.

---

# 10. Approval Chain Version

`APPROVAL_CHAIN_VERSION`

필수 필드:

* approval_chain_version_id
* approval_chain_definition_id
* tenant_id
* version_number
* previous_version_id
* template version reference
* stage count
* level count
* route node count
* route edge count
* branch count
* merge count
* root node reference
* terminal node references
* minimum chain depth
* maximum chain depth
* structure hash
* compiled artifact reference
* source version
* affected request types
* affected organizations
* affected legal entities
* affected programs
* affected workflows
* affected active cases
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
* COMPILE_PENDING
* COMPILE_FAILED
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

# 11. Approval Chain Template

`APPROVAL_CHAIN_TEMPLATE`

Template은 여러 Chain에서 재사용 가능한 구조적 기본형이다.

지원 Template 예:

* Direct Manager Only
* Direct Manager + Manager of Manager
* Management + Finance
* Management + Finance + Legal
* Program Owner + Finance
* Cost Center Owner + Finance Controller
* Country + Regional
* Functional + Administrative
* Executive Reference
* Exception Review
* Manual Review

필수 필드:

* approval_chain_template_id
* tenant_id
* platform template 여부
* template_code
* template_name
* template category
* supported approval domains
* supported resource types
* parameter schema
* default stage structure
* default level structure
* default route structure
* default fallback reference
* owner
* active version
* status
* evidence

Platform Template을 Tenant가 직접 수정하지 못하게 하라.

Tenant Customization은 Template Binding 또는 Override로 처리하라.

---

# 12. Approval Chain Template Version

`APPROVAL_CHAIN_TEMPLATE_VERSION`

필수 필드:

* approval_chain_template_version_id
* approval_chain_template_id
* version_number
* previous_version_id
* parameter schema version
* stage blueprint
* level blueprint
* route blueprint
* required parameters
* optional parameters
* compatibility range
* structure hash
* effective_from
* effective_to
* immutable_hash
* status
* evidence

Template 변경이 이미 생성된 Chain Version을 자동 변경하지 않게 하라.

---

# 13. Approval Stage Definition

`APPROVAL_STAGE_DEFINITION`

Stage는 승인 목적 또는 책임 영역을 나타낸다.

지원 Stage Category:

* MANAGEMENT
* FINANCE
* LEGAL
* COMPLIANCE
* SECURITY
* RISK
* PROGRAM
* PRODUCT
* BRAND
* REGIONAL
* COUNTRY
* PARTNER
* OPERATIONS
* EXECUTIVE_REFERENCE
* COMMITTEE_REFERENCE
* MANUAL_REVIEW
* CUSTOM

필수 필드:

* approval_stage_definition_id
* approval_chain_version_id
* tenant_id
* stage_code
* stage_name
* stage_category
* stage purpose
* stage order reference
* stage group
* required 여부
* optional 여부
* conditional 여부
* repeatable 여부
* skippable reference
* entry condition reference
* completion policy reference
* actor source policy reference
* authority policy reference
* failure policy reference
* fallback reference
* valid_from
* valid_to
* status
* evidence

`stage order`만으로 실행 순서를 확정하지 마라.

실제 순서는 Route Edge로 표현한다.

---

# 14. Approval Stage Version

`APPROVAL_STAGE_VERSION`

필수 필드:

* approval_stage_version_id
* approval_stage_definition_id
* chain version
* version_number
* previous_version_id
* category
* required state
* condition references
* level references
* entry node
* exit node
* effective_from
* effective_to
* immutable_hash
* status
* evidence

---

# 15. Approval Level Definition

`APPROVAL_LEVEL_DEFINITION`

Level은 Stage 내부에서 요구되는 승인 계층 또는 Actor Source Requirement다.

필수 필드:

* approval_level_definition_id
* approval_stage_definition_id
* approval_chain_version_id
* tenant_id
* level_code
* level_name
* level_number
* hierarchy depth reference
* level category
* actor source type
* actor resolver reference
* manager relationship type reference
* role requirement reference
* authority profile reference
* resource owner type reference
* organization level reference
* minimum actor count
* maximum actor count
* required actor count
* required 여부
* optional 여부
* conditional 여부
* duplicate actor policy
* same actor across level policy
* self approval policy reference
* vacancy policy reference
* missing actor policy reference
* fallback reference
* valid_from
* valid_to
* status
* evidence

Actor Source Type:

* DIRECT_MANAGER
* MANAGER_OF_MANAGER
* ADMINISTRATIVE_MANAGER
* FUNCTIONAL_MANAGER
* DOTTED_LINE_MANAGER_REFERENCE
* PROJECT_MANAGER
* PROGRAM_MANAGER
* REGIONAL_MANAGER
* COUNTRY_MANAGER
* BRAND_MANAGER
* COST_CENTER_MANAGER
* PROFIT_CENTER_MANAGER
* ORGANIZATION_HEAD
* POSITION_SUPERVISOR
* ROLE
* AUTHORITY_PROFILE
* RESOURCE_OWNER
* CASE_OWNER
* REQUEST_OWNER
* LEGAL_ENTITY_OFFICER
* SECURITY_OFFICER
* COMPLIANCE_OFFICER
* FIXED_GOVERNED_SUBJECT_REFERENCE
* COMMITTEE_REFERENCE
* MANUAL_SELECTION
* CUSTOM_RESOLVER_REFERENCE

특정 Subject ID는 `FIXED_GOVERNED_SUBJECT_REFERENCE`에서만 허용하며, 승인된 Governance 근거와 Effective Period를 요구하라.

---

# 16. Approval Level Version

`APPROVAL_LEVEL_VERSION`

필수 필드:

* approval_level_version_id
* approval_level_definition_id
* chain version
* version_number
* previous_version_id
* actor source type
* resolver reference
* hierarchy depth
* required actor count
* policies
* source version
* effective_from
* effective_to
* immutable_hash
* status
* evidence

---

# 17. Stage와 Level 관계 원칙

다음을 강제하라.

* 하나의 Chain Version은 하나 이상의 Stage를 가진다.
* 하나의 Stage는 하나 이상의 Level을 가질 수 있다.
* Level은 반드시 하나의 Stage에 속한다.
* Level Number는 표시 및 논리적 깊이 정보이며 Route Edge를 대체하지 않는다.
* Stage Order도 Route Edge를 대체하지 않는다.
* 서로 다른 Stage의 Level이 직접 연결될 수 있다.
* 조건부 Stage는 Route Condition을 통해 진입한다.
* 비활성 Level은 Active Chain Version에서 참조하지 않는다.
* 동일 Stage 내 Level Code는 유일해야 한다.
* 동일 Chain Version 내 Stage Code는 유일해야 한다.

---

# 18. Approval Route Definition

`APPROVAL_ROUTE_DEFINITION`

필수 필드:

* approval_route_definition_id
* approval_chain_version_id
* tenant_id
* route_code
* route_name
* route_type
* entry node
* terminal nodes
* default route 여부
* conditional 여부
* hierarchy based 여부
* branch allowed 여부
* merge allowed 여부
* parallel reference 여부
* maximum depth
* maximum branch count
* maximum node count
* fallback reference
* valid_from
* valid_to
* status
* evidence

Route Type:

* LINEAR
* HIERARCHICAL
* CONDITIONAL
* BRANCHED
* MERGED
* PARALLEL_REFERENCE
* HYBRID
* EXCEPTION_REFERENCE
* CUSTOM

---

# 19. Approval Route Version

`APPROVAL_ROUTE_VERSION`

필수 필드:

* approval_route_version_id
* approval_route_definition_id
* chain version
* version_number
* previous_version_id
* node count
* edge count
* branch count
* merge count
* root node
* terminal nodes
* route hash
* compiled route reference
* effective_from
* effective_to
* immutable_hash
* status
* evidence

---

# 20. Route Segment

`APPROVAL_ROUTE_SEGMENT`

Segment는 Route의 논리적 부분을 나타낸다.

지원 Segment Type:

* MANAGEMENT_SEGMENT
* FINANCE_SEGMENT
* LEGAL_SEGMENT
* COMPLIANCE_SEGMENT
* SECURITY_SEGMENT
* PROGRAM_SEGMENT
* REGIONAL_SEGMENT
* EXECUTIVE_REFERENCE_SEGMENT
* EXCEPTION_SEGMENT
* MANUAL_REVIEW_SEGMENT
* CUSTOM

필수 필드:

* approval_route_segment_id
* route version
* segment code
* segment name
* segment type
* entry node
* exit node
* stage references
* condition references
* required 여부
* fallback reference
* status
* evidence

---

# 21. Route Node

`APPROVAL_ROUTE_NODE`

Node Type:

* START
* STAGE
* LEVEL
* CONDITION
* BRANCH
* MERGE
* ACTOR_SOURCE
* AUTHORITY_CHECK_REFERENCE
* MANUAL_REVIEW
* FALLBACK
* TERMINAL_APPROVED
* TERMINAL_REJECTED_REFERENCE
* TERMINAL_BLOCKED
* TERMINAL_CANCELLED_REFERENCE
* CUSTOM

필수 필드:

* approval_route_node_id
* approval_route_version_id
* tenant_id
* node_code
* node_name
* node_type
* stage reference
* level reference
* condition reference
* actor source reference
* authority check reference
* fallback reference
* terminal state reference
* required 여부
* enabled 여부
* valid_from
* valid_to
* status
* evidence

이번 단계에서 `TERMINAL_REJECTED`, `CANCELLED`의 실제 실행 전이는 구현하지 말고 Reference Contract만 구축하라.

---

# 22. Route Edge

`APPROVAL_ROUTE_EDGE`

필수 필드:

* approval_route_edge_id
* approval_route_version_id
* tenant_id
* source_node_id
* target_node_id
* edge_type
* condition reference
* branch key
* priority
* default edge 여부
* required 여부
* failure edge 여부
* fallback edge 여부
* valid_from
* valid_to
* status
* evidence

Edge Type:

* NORMAL
* CONDITIONAL_TRUE
* CONDITIONAL_FALSE
* BRANCH
* MERGE
* OPTIONAL
* FALLBACK
* FAILURE_REFERENCE
* MANUAL_REVIEW
* TERMINAL
* CUSTOM

다음을 금지하라.

* 동일 Source에서 동일 Priority의 복수 Default Edge
* 존재하지 않는 Node 참조
* 다른 Tenant Route Node 참조
* 다른 Chain Version Node 참조
* 자기 자신으로 향하는 Edge
* 허용되지 않은 Cycle
* 도달 불가능한 Node
* Terminal Node에서 나가는 일반 Edge

---

# 23. Route 방향 표준

전체 Repository에서 Route 방향을 다음으로 표준화하라.

```text
source node → next node
```

다른 모듈에서 역방향을 사용하더라도 Approval Route 내부 Canonical Direction은 변경하지 마라.

Ancestor·Predecessor 조회는 별도 Index 또는 역방향 조회로 처리하라.

---

# 24. Route Entry·Exit

모든 Active Route에는 다음을 요구하라.

* 정확히 하나의 START Node
* 하나 이상의 Terminal Node
* 모든 Required Node가 START에서 도달 가능
* 모든 Non-terminal Required Node가 Terminal로 도달 가능
* 고립 Node 없음
* 무한 경로 없음
* Branch 후 Merge가 필요한 정책이면 유효한 Merge 존재
* Fallback Route가 종료 가능한 경로를 가짐

Multiple Entry가 필요한 경우 Virtual START Node를 생성하라.

---

# 25. Route Condition

`APPROVAL_ROUTE_CONDITION`

지원 Condition Category:

* REQUEST_TYPE
* REBATE_TYPE
* RESOURCE_TYPE
* TRANSACTION_TYPE
* ORGANIZATION
* ORGANIZATION_TYPE
* LEGAL_ENTITY
* COUNTRY
* REGION
* PROGRAM
* PRODUCT
* BRAND
* PARTNER
* CHANNEL
* CUSTOMER_SEGMENT
* RISK_REFERENCE
* AMOUNT_BAND_REFERENCE
* CURRENCY_REFERENCE
* AUTHORITY_RESULT_REFERENCE
* MANAGER_RELATIONSHIP_REFERENCE
* ATTRIBUTE_POLICY_REFERENCE
* CUSTOM

필수 필드:

* approval_route_condition_id
* tenant_id
* condition_code
* condition_name
* condition category
* condition expression reference
* policy engine reference
* input schema
* output type
* deterministic 여부
* side effect free 여부
* fail closed 여부
* missing input policy
* effective_from
* effective_to
* version
* status
* evidence

금액·통화 조건은 실제 Authority 계산을 수행하지 말고 Amount Band 또는 Authority Result Reference만 사용하라.

Condition Expression을 임의 코드 실행 문자열로 저장하지 마라.

허용된 DSL, Policy Engine 또는 Typed Expression을 사용하라.

---

# 26. Route Branch

`APPROVAL_ROUTE_BRANCH`

필수 필드:

* approval_route_branch_id
* route version
* branch node
* branch type
* condition reference
* branch keys
* branch priorities
* default branch
* maximum selected branches
* minimum selected branches
* exclusive 여부
* parallel reference 여부
* merge requirement
* status
* evidence

Branch Type:

* EXCLUSIVE
* INCLUSIVE
* MULTI_SELECT_REFERENCE
* CONDITION_SET
* POLICY_RESOLVED
* CUSTOM

실제 병렬 Task 실행은 후속 블록에서 구현한다.

이번 단계에서는 선택 가능한 Route 구조만 정의하라.

---

# 27. Route Merge

`APPROVAL_ROUTE_MERGE`

필수 필드:

* approval_route_merge_id
* route version
* merge node
* incoming branch references
* merge policy reference
* required incoming count
* wait policy reference
* timeout policy reference
* fallback reference
* status
* evidence

Merge Policy Reference:

* ALL_SELECTED_BRANCHES_REFERENCE
* ANY_SELECTED_BRANCH_REFERENCE
* REQUIRED_BRANCHES_REFERENCE
* POLICY_RESOLVED
* CUSTOM

실제 Wait·Join 실행은 후속 Execution Governance에서 구현한다.

---

# 28. Hierarchical Route Foundation

Hierarchical Route는 Reporting Line과 Organization Hierarchy를 사용하여 Level Requirement를 정의한다.

필수 속성:

* hierarchy source type
* reporting line type
* supervisory hierarchy type
* starting subject source
* starting position source
* starting organization source
* manager relationship type
* hierarchy direction
* required depth
* minimum depth
* maximum depth
* root handling
* missing level policy
* duplicate manager policy
* same actor across level policy
* legal entity boundary policy
* organization boundary policy
* country boundary policy
* matrix branch reference
* snapshot requirement
* evidence requirement

Hierarchy Source Type:

* REPORTING_LINE
* SUPERVISORY_PATH
* ORGANIZATION_HIERARCHY
* POSITION_HIERARCHY
* FUNCTIONAL_HIERARCHY
* REGIONAL_HIERARCHY
* FINANCIAL_HIERARCHY
* CUSTOM

이번 단계에서는 실제 Manager Subject를 확정하지 않는다.

다음과 같은 Requirement만 생성한다.

```text
Level 1:
DIRECT_MANAGER, distance=1

Level 2:
DIRECT_MANAGER chain, distance=2

Level 3:
ORGANIZATION_HEAD, organization_type=BUSINESS_UNIT
```

---

# 29. Manager-of-manager Route

Manager-of-manager Level에는 다음을 기록한다.

* base manager relationship type
* starting point
* chain distance
* exact distance 여부
* minimum distance
* maximum distance
* skip duplicate subject policy
* root reached policy
* missing intermediate manager policy
* cross legal entity policy
* manager chain snapshot requirement
* fallback reference

다음은 후속 블록에서 처리한다.

* 실제 Manager Subject Resolution
* Candidate Eligibility
* Authority Check
* Terminated Manager 대체
* Acting Manager 우선순위

---

# 30. Approval Chain Applicability

`APPROVAL_CHAIN_APPLICABILITY`

필수 필드:

* approval_chain_applicability_id
* chain definition
* chain version
* tenant
* approval domain
* request type
* resource type
* transaction type
* rebate type
* organization scope
* organization type
* legal entity scope
* workspace scope
* country scope
* region scope
* program scope
* product scope
* brand scope
* partner scope
* channel scope
* customer segment scope
* amount band reference
* currency reference
* risk band reference
* effective period
* include conditions
* exclude conditions
* specificity score reference
* priority
* status
* evidence

Applicability는 Boolean 매칭 결과를 생성해야 한다.

실제 Approver Candidate를 생성하지 마라.

---

# 31. Approval Chain Selection Policy

`APPROVAL_CHAIN_SELECTION_POLICY`

지원 Policy:

* HIGHEST_PRIORITY
* MOST_SPECIFIC
* PRIORITY_THEN_SPECIFICITY
* SPECIFICITY_THEN_PRIORITY
* EXPLICIT_BINDING_FIRST
* TENANT_OVERRIDE_FIRST
* DOMAIN_DEFAULT
* FAIL_ON_MULTIPLE
* MANUAL_REVIEW
* CUSTOM

필수 필드:

* approval_chain_selection_policy_id
* tenant
* approval domain
* selection policy
* priority order
* specificity dimensions
* tie break policy
* default chain reference
* multiple match policy
* no match policy
* evidence requirement
* effective_from
* effective_to
* version
* status
* evidence

DB 조회 결과의 물리적 순서로 Chain을 선택하지 마라.

---

# 32. Chain Specificity

Specificity 계산 시 다음 차원을 사용할 수 있다.

* Exact Request Type
* Exact Rebate Type
* Exact Resource Type
* Exact Transaction Type
* Exact Organization
* Exact Organization Type
* Exact Legal Entity
* Exact Country
* Exact Region
* Exact Program
* Exact Product
* Exact Brand
* Exact Partner
* Exact Channel
* Exact Customer Segment
* Exact Amount Band Reference
* Exact Risk Band Reference
* Exact Environment

Specificity Weight는 Versioned Policy로 관리하라.

애플리케이션 코드에 하드코딩하지 마라.

---

# 33. Approval Chain Priority

`APPROVAL_CHAIN_PRIORITY`

필수 필드:

* approval_chain_priority_id
* chain definition
* chain version
* tenant
* approval domain
* priority value
* priority category
* override 여부
* effective_from
* effective_to
* reason
* approved governance reference
* status
* evidence

동일 Scope·동일 Effective Period에 동일 Priority의 Active Chain이 여러 개 존재하면 Conflict를 생성하라.

---

# 34. Chain Resolution Input

`APPROVAL_CHAIN_RESOLUTION_INPUT`

필수 필드:

* approval_chain_resolution_input_id
* tenant
* workspace
* approval request
* approval case
* approval requirement
* requester subject
* requested for subject
* beneficiary reference
* resource
* resource type
* request type
* transaction type
* rebate type
* organization
* legal entity
* country
* region
* program
* product
* brand
* partner
* channel
* amount reference
* currency reference
* risk reference
* effective_at
* resolution_time_basis
* organization hierarchy version
* reporting line version
* policy version references
* environment
* correlation id
* idempotency key
* evidence

Resolution Time Basis:

* REQUEST_EFFECTIVE_TIME
* REQUEST_CREATED_TIME
* CASE_CREATED_TIME
* CHAIN_BUILD_TIME
* EXPLICIT_BUSINESS_TIME
* POLICY_DEFINED

---

# 35. Approval Chain Candidate

`APPROVAL_CHAIN_CANDIDATE`

필수 필드:

* approval_chain_candidate_id
* resolution input
* chain definition
* chain version
* applicability result
* matched dimensions
* unmatched optional dimensions
* excluded dimensions
* priority
* specificity score
* tenant override state
* effective period match
* validation state
* compilation state
* conflict state
* exclusion reasons
* proposed 여부
* manual review requirement
* evidence

이번 Candidate는 **Chain Definition 후보**다.

Manager·Approver Subject Candidate와 혼동하지 마라.

---

# 36. Candidate Exclusion Reason

지원 Exclusion:

* WRONG_TENANT
* WRONG_APPROVAL_DOMAIN
* WRONG_REQUEST_TYPE
* WRONG_RESOURCE_TYPE
* WRONG_TRANSACTION_TYPE
* WRONG_REBATE_TYPE
* WRONG_ORGANIZATION
* WRONG_ORGANIZATION_TYPE
* WRONG_LEGAL_ENTITY
* WRONG_COUNTRY
* WRONG_REGION
* WRONG_PROGRAM
* WRONG_PRODUCT
* WRONG_BRAND
* WRONG_PARTNER
* WRONG_CHANNEL
* WRONG_CUSTOMER_SEGMENT
* WRONG_AMOUNT_BAND_REFERENCE
* WRONG_RISK_BAND_REFERENCE
* OUTSIDE_EFFECTIVE_PERIOD
* VERSION_INACTIVE
* VERSION_UNAPPROVED
* VALIDATION_FAILED
* COMPILATION_FAILED
* ROUTE_INVALID
* TENANT_OVERRIDE_REQUIRED
* EXPLICIT_EXCLUSION
* MANUAL_EXCLUSION
* OTHER

---

# 37. Chain Resolution Result

`APPROVAL_CHAIN_RESOLUTION_RESULT`

필수 필드:

* approval_chain_resolution_result_id
* resolution input
* selected chain definition
* selected chain version
* selected template version
* candidate references
* selection policy
* priority result
* specificity result
* tie break result
* stage references
* level references
* route version
* compiled artifact reference
* required actor source requirements
* authority policy references
* fallback references
* warning references
* conflict references
* manual review requirement
* resolution status
* resolved_at
* resolver version
* immutable_hash
* evidence

Resolution Status:

* RESOLVED
* RESOLVED_WITH_WARNINGS
* MULTIPLE_MATCH
* NO_MATCH
* CONFLICT
* MANUAL_REVIEW
* BLOCKED
* FAILED

실제 Approver Subject 목록을 최종 결과로 확정하지 마라.

---

# 38. Approval Chain Compilation

`APPROVAL_CHAIN_COMPILATION`

Definition을 Runtime에서 안전하게 사용할 수 있는 불변 Artifact로 Compile하라.

필수 필드:

* approval_chain_compilation_id
* chain version
* template version
* route version
* compiler version
* source structure hash
* compiled artifact
* compiled stage index
* compiled level index
* compiled node index
* compiled edge index
* compiled condition index
* topological order
* entry node
* terminal nodes
* minimum depth
* maximum depth
* unresolved references
* warning count
* error count
* compiled_at
* immutable_hash
* status
* evidence

Compilation 시 다음을 수행하라.

* Reference Resolution
* Stage·Level Index 생성
* Node·Edge Index 생성
* Topological Sort
* Cycle Detection
* Reachability Validation
* Terminal Validation
* Condition Type Validation
* Applicability Validation
* Tenant Boundary Validation
* Version Compatibility Validation
* Authority Reference Validation
* Actor Resolver Reference Validation
* Fallback Termination Validation
* Hash 생성

Compiled Artifact는 Source Definition을 대체하지 않는다.

---

# 39. Chain Validation

`APPROVAL_CHAIN_VALIDATION`

활성화 전에 최소 다음을 검증하라.

* Tenant 존재
* Chain Definition 존재
* Chain Version 존재
* Template Version 존재
* Chain Type 유효
* 하나 이상의 Stage 존재
* 각 Required Stage에 Level 존재
* Stage Code 유일
* Level Code 유일
* START Node 정확히 하나
* Terminal Node 하나 이상
* Node Reference 유효
* Edge Reference 유효
* 모든 Required Node Reachable
* 모든 Required Node에서 Terminal Reachable
* Self-loop 없음
* 허용되지 않은 Cycle 없음
* 고립 Node 없음
* 동일 Source의 Default Edge 충돌 없음
* Branch Default 유효
* Merge Reference 유효
* Condition Schema 유효
* Condition Expression 안전
* Applicability 유효
* Selection Policy 유효
* Priority 충돌 없음
* Effective Period 유효
* Cross-Tenant Reference 없음
* Legal Entity Scope 유효
* Organization Scope 유효
* Manager Relationship Type Reference 유효
* Actor Resolver Reference 유효
* Authority Policy Reference 유효
* Missing Actor Policy Reference 유효
* Fallback Route 종료 가능
* Active Version Immutable
* Structure Hash 유효
* Compilation 성공

Validation 결과에는 Error·Warning·Affected Component를 저장하라.

---

# 40. Approval Chain Conflict

`APPROVAL_CHAIN_CONFLICT`

Conflict Type:

* MULTIPLE_APPLICABLE_CHAIN
* SAME_PRIORITY_CHAIN
* SAME_SPECIFICITY_CHAIN
* OVERLAPPING_EFFECTIVE_PERIOD
* DUPLICATE_CHAIN_CODE
* DUPLICATE_STAGE_CODE
* DUPLICATE_LEVEL_CODE
* MULTIPLE_START_NODE
* NO_START_NODE
* NO_TERMINAL_NODE
* UNREACHABLE_NODE
* DEAD_END_NODE
* SELF_LOOP
* ROUTE_CYCLE
* DEFAULT_EDGE_CONFLICT
* BRANCH_POLICY_CONFLICT
* MERGE_POLICY_MISSING
* STAGE_LEVEL_MISMATCH
* ACTOR_SOURCE_CONFLICT
* AUTHORITY_REFERENCE_CONFLICT
* TEMPLATE_VERSION_CONFLICT
* WORKFLOW_REFERENCE_CONFLICT
* TENANT_SCOPE_CONFLICT
* LEGAL_ENTITY_SCOPE_CONFLICT
* ORGANIZATION_SCOPE_CONFLICT
* FALLBACK_CYCLE
* OVERRIDE_CONFLICT
* VERSION_CONFLICT
* CUSTOM

필수 필드:

* approval_chain_conflict_id
* tenant
* approval domain
* chain definitions
* chain versions
* stage references
* level references
* route references
* conflict type
* effective period
* affected requests
* affected cases
* severity
* resolution policy
* resolved chain reference
* resolved_by
* resolved_at
* status
* evidence

---

# 41. Conflict Resolution 기본 순서

권장 기본 순서:

1. Approved Governance Override
2. Explicit Request-Type Binding
3. Tenant-specific Chain
4. Higher Priority
5. Higher Specificity
6. Newer Approved Effective Version
7. Domain Default
8. Manual Review
9. Block

Material Conflict는 자동으로 숨기지 마라.

자동 Resolution을 수행한 경우 선택 근거를 Evidence로 저장하라.

---

# 42. Approval Chain Override

`APPROVAL_CHAIN_OVERRIDE`

Override Type:

* TENANT_OVERRIDE
* LEGAL_ENTITY_OVERRIDE
* ORGANIZATION_OVERRIDE
* COUNTRY_OVERRIDE
* PROGRAM_OVERRIDE
* PRODUCT_OVERRIDE
* BRAND_OVERRIDE
* PARTNER_OVERRIDE
* REQUEST_TYPE_OVERRIDE
* TEMPORARY_OVERRIDE
* EMERGENCY_REFERENCE
* CASE_SPECIFIC_OVERRIDE
* GOVERNANCE_CORRECTION
* CUSTOM

필수 필드:

* approval_chain_override_id
* tenant
* base chain definition
* base chain version
* override type
* target scope
* replacement chain reference
* stage modification reference
* level modification reference
* route modification reference
* condition modification reference
* fallback modification reference
* reason
* requested_by
* approved_by reference
* approval evidence
* valid_from
* valid_to
* maximum duration
* renewal count
* status
* evidence

Override는 Base Chain Version을 직접 수정하지 않는다.

Case-specific Override에는 다음을 요구하라.

* Explicit Approval Reference
* Reason
* Expiration
* Audit
* Snapshot
* Authorization Check
* Separation of Duties Reference

---

# 43. Override Overlay 원칙

Override 적용 순서:

```text
Base Chain Version
→ Tenant Override
→ Domain Override
→ Legal Entity·Organization Override
→ Program·Product·Brand Override
→ Approved Case-specific Override
→ Validation
→ Compilation
```

적용 순서는 Versioned Policy로 관리하라.

동일 Scope에 상충하는 Override가 있으면 Conflict를 생성하라.

---

# 44. Approval Chain Fallback

`APPROVAL_CHAIN_FALLBACK`

지원 Fallback:

* USE_DOMAIN_DEFAULT_CHAIN
* USE_TENANT_DEFAULT_CHAIN
* USE_PARENT_ORGANIZATION_CHAIN
* USE_LEGAL_ENTITY_DEFAULT_CHAIN
* USE_GLOBAL_DEFAULT_CHAIN_REFERENCE
* CREATE_MANUAL_REVIEW
* ESCALATE_REFERENCE
* BLOCK_REQUEST
* CUSTOM

필수 필드:

* approval_chain_fallback_id
* tenant
* approval domain
* request type
* organization type
* legal entity scope
* country scope
* fallback sequence
* maximum fallback depth
* cross legal entity allowed 여부
* evidence requirement
* manual review threshold
* terminal policy
* status
* evidence

Fallback Chain 자체가 다시 원본 Chain을 참조하여 Cycle을 만들지 않게 하라.

---

# 45. Missing Approval Chain Policy

`MISSING_APPROVAL_CHAIN_POLICY`

지원 Policy:

* USE_EXPLICIT_DEFAULT
* USE_DOMAIN_DEFAULT
* USE_TENANT_DEFAULT
* USE_PARENT_ORGANIZATION_DEFAULT
* CREATE_MANUAL_REVIEW
* BLOCK_APPROVAL_CASE
* RETURN_CONFIGURATION_ERROR
* CUSTOM

필수 필드:

* missing_approval_chain_policy_id
* tenant
* approval domain
* request type
* resource type
* organization scope
* legal entity scope
* policy
* fallback references
* maximum attempts
* evidence requirement
* severity
* status
* evidence

No Match 상태에서 임의의 첫 번째 Chain을 선택하지 마라.

---

# 46. Effective Dating

`APPROVAL_CHAIN_EFFECTIVE_PERIOD`

필수 필드:

* approval_chain_effective_period_id
* entity type
* entity id
* business valid from
* business valid to
* system recorded from
* system recorded to
* timezone
* future dated 여부
* retroactive 여부
* scheduled activation reference
* source effective date
* status
* evidence

Business Time과 System Time을 구분하라.

Chain Resolution은 요청의 `resolution_time_basis`에 따라 유효 Version을 선택한다.

---

# 47. Future-Dated Chain Change

지원 변경:

* New Chain Activation
* Chain Version Replacement
* Stage Addition
* Stage Removal
* Level Addition
* Level Removal
* Route Change
* Condition Change
* Priority Change
* Applicability Change
* Template Change
* Override Start
* Override End
* Fallback Change

필수 기록:

* scheduled effective date
* predecessor version
* successor version
* affected scopes
* affected request types
* affected active cases
* affected future requests
* validation result
* compilation result
* activation result
* rollback reference
* evidence

Scheduler 중복 실행에도 Idempotent하게 동작하라.

---

# 48. Retroactive Chain Correction

과거 Chain Definition을 수정해야 할 경우 다음을 강제하라.

* Correction Reason
* Authorized Requester
* Approval Reference
* Original Chain Version
* Correction Version
* Affected Period
* Affected Approval Requests
* Affected Approval Cases
* Affected Tasks
* Affected Decisions
* Historical Snapshot Impact
* Financial Impact Reference
* Reconciliation
* Manual Review

과거 Chain Version·Snapshot·Decision Evidence를 덮어쓰지 마라.

Correction Version과 원본 Version을 모두 보존하라.

---

# 49. Chain Snapshot Foundation

`APPROVAL_CHAIN_SNAPSHOT`

필수 필드:

* approval_chain_snapshot_id
* snapshot type
* tenant
* approval request
* approval case
* approval requirement
* chain definition
* chain version
* template version
* route version
* stage versions
* level versions
* condition versions
* applicability reference
* selection policy version
* priority references
* override references
* fallback references
* organization hierarchy version
* reporting line version
* authority policy references
* actor resolver references
* compiled artifact hash
* effective_at
* captured_at
* immutable_hash
* status
* evidence

Snapshot Type:

* CHAIN_SELECTION
* CHAIN_RESOLUTION
* CHAIN_BUILD
* CASE_CREATION
* TASK_PLAN_REFERENCE
* CHAIN_CHANGE
* RECONCILIATION
* AUDIT_RECONSTRUCTION

Snapshot 생성 후 직접 수정하지 마라.

이번 단계에서는 Chain Structure Snapshot을 구현하고, 전체 Hierarchy Snapshot 심화는 5-3-3-11에서 확장하라.

---

# 50. Snapshot 저장 최적화

동일 Chain Version과 동일 Policy Version 조합을 Approval Event마다 전체 복제하지 마라.

권장 구조:

```text
APPROVAL_CHAIN_SNAPSHOT
= Canonical Immutable Structure Snapshot

APPROVAL_CHAIN_EVENT_REFERENCE
= Request·Case·Task Event에서 Snapshot ID 참조
```

Snapshot 재사용 시 다음 값이 동일해야 한다.

* tenant
* chain version
* template version
* route version
* override set hash
* fallback version
* applicability version
* selection policy version
* effective_at 기준 Version Set
* compiled artifact hash

---

# 51. Chain Change Impact

`APPROVAL_CHAIN_CHANGE_IMPACT`

Chain 변경 시 다음 영향을 계산하라.

* New Approval Request
* Open Approval Case
* Pending Chain Build
* Planned Task
* Unclaimed Task
* Claimed Task
* Completed Decision
* Future Scheduled Case
* Chain Snapshot
* Authority Policy Reference
* Candidate Resolution Reference
* Notification Reference
* SLA Reference
* Escalation Reference
* Cache Entry
* Reconciliation State

필수 필드:

* approval_chain_change_impact_id
* old chain version
* new chain version
* effective date
* affected scopes
* affected requests
* affected cases
* affected tasks
* affected snapshots
* risk level
* migration policy reference
* revalidation requirement
* manual review requirement
* status
* evidence

기본 정책:

* 완료된 Decision: 변경하지 않음
* 기존 Snapshot: 변경하지 않음
* 새 Request: 새 Chain Version 사용
* Chain Build 전 Case: 새 Version 적용 가능
* 이미 Chain Build 완료된 Case: In-flight Policy 적용
* Claimed Task: 자동 변경 금지
* Critical Invalid Chain: 신규 Resolution Block
* Security Critical Change: Active Case Revalidation Hook

실제 In-flight Migration은 5-3-3-12에서 상세 구현한다.

---

# 52. In-flight Case Policy Reference

지원 Reference:

* GRANDFATHER_EXISTING_CHAIN
* APPLY_NEW_CHAIN_BEFORE_TASK_CREATION
* REBUILD_UNCLAIMED_LEVELS
* KEEP_CLAIMED_TASKS
* REVALIDATE_ON_NEXT_LEVEL
* REQUIRE_MANUAL_MIGRATION
* BLOCK_NEW_TRANSITIONS
* CUSTOM

이번 단계에서는 Policy Reference와 Hook만 구축한다.

Task 재생성·취소·재할당 실행은 후속 블록에서 구현한다.

---

# 53. Chain Reconciliation

`APPROVAL_CHAIN_RECONCILIATION`

다음을 비교하라.

* Chain Definition vs Active Version
* Chain Version vs Template Version
* Stage Definition vs Stage Version
* Level Definition vs Level Version
* Route Definition vs Route Version
* Route Node vs Route Edge
* Route Edge vs Topological Order
* Applicability vs Selection Result
* Priority vs Selected Chain
* Override vs Compiled Artifact
* Fallback vs Compiled Artifact
* Chain Version vs Workflow Definition
* Chain Snapshot vs Chain Version
* Chain Resolution Result vs Snapshot
* Approval Case vs Selected Chain
* Planned Task vs Chain Level
* Actual Task vs Chain Level Reference
* Authority Reference vs Level
* Actor Resolver Reference vs Level
* Organization Hierarchy Version vs Resolution Input
* Reporting Line Version vs Resolution Input
* Active Chain Cache vs Current Version
* Future Change vs Scheduler
* Legacy Route vs Canonical Chain

필수 필드:

* approval_chain_reconciliation_id
* tenant
* approval domain
* chain definition
* chain version
* request
* case
* source component
* canonical component
* effective date
* difference
* affected requests
* affected cases
* affected tasks
* severity
* resolution
* resolved_by
* resolved_at
* status
* evidence

---

# 54. Reconciliation 상태

* MATCH
* ACTIVE_VERSION_MISMATCH
* TEMPLATE_VERSION_MISMATCH
* STAGE_VERSION_MISMATCH
* LEVEL_VERSION_MISMATCH
* ROUTE_VERSION_MISMATCH
* NODE_EDGE_MISMATCH
* TOPOLOGICAL_ORDER_MISMATCH
* APPLICABILITY_MISMATCH
* PRIORITY_SELECTION_MISMATCH
* OVERRIDE_MISMATCH
* FALLBACK_MISMATCH
* WORKFLOW_DEFINITION_MISMATCH
* SNAPSHOT_VERSION_MISMATCH
* RESOLUTION_RESULT_MISMATCH
* CASE_CHAIN_MISMATCH
* TASK_LEVEL_MISMATCH
* AUTHORITY_REFERENCE_MISMATCH
* ACTOR_RESOLVER_REFERENCE_MISMATCH
* ORGANIZATION_VERSION_MISMATCH
* REPORTING_LINE_VERSION_MISMATCH
* CACHE_VERSION_MISMATCH
* FUTURE_CHANGE_SCHEDULING_MISMATCH
* LEGACY_ROUTE_MISMATCH
* MANUAL_REVIEW
* BLOCKED

---

# 55. Critical Gap 후보

다음을 High 또는 Critical로 처리하라.

* Active Chain Version 없음
* 승인된 Chain Version 없음
* Chain Version 없이 Approval Case 생성
* Multiple Applicable Chain 미해결
* 동일 Scope 동일 Priority Chain 충돌
* 동일 Effective Period Version 중복
* START Node 없음
* START Node 여러 개
* Terminal Node 없음
* Required Node 도달 불가
* Required Node에서 Terminal 도달 불가
* Route Cycle
* Fallback Cycle
* Cross-Tenant Node·Edge 참조
* 다른 Chain Version Node 참조
* Active Version 직접 수정
* Chain History 덮어쓰기
* Chain Snapshot 누락
* Snapshot Hash 불일치
* Condition Expression 검증 실패
* 임의 코드 실행 Condition
* 특정 현재 Employee ID 하드코딩
* Authority Limit를 Chain에 중복 저장
* Manager Candidate를 Chain 단계에서 최종 확정
* No Match 시 임의 Chain 선택
* Workflow Task와 Chain Level 불일치
* Chain 변경 후 Cache 미무효화
* Compiled Artifact와 Source Hash 불일치
* 과거 Approval을 현재 Chain으로 재작성
* Override 승인 근거 누락
* 무기한 Temporary Override
* Fallback 종료 경로 없음
* In-flight Impact 미계산

---

# 56. 최소 Static Lint

이번 블록에서 다음을 차단하라.

* Tenant 없는 Chain
* Chain Type 없는 Chain
* Active Version 없는 Active Chain
* 승인되지 않은 Version 활성화
* Active Version 직접 수정
* Stage 없는 Chain
* Required Stage에 Level 없음
* Stage Code 중복
* Level Code 중복
* START Node 없음 또는 중복
* Terminal Node 없음
* 존재하지 않는 Node를 참조하는 Edge
* Cross-Tenant Node·Edge
* 다른 Chain Version Node 참조
* Self-loop
* Route Cycle
* 고립 Node
* Dead-end Required Node
* Default Edge 충돌
* Branch Default 누락
* Merge Reference 누락
* Condition Schema 누락
* Unsafe Expression
* Effective Period 역전
* 동일 Scope Active Version 중복
* 동일 Priority Chain 충돌
* Fallback Cycle
* 무기한 Temporary Override
* 승인 근거 없는 Override
* 특정 직원 ID 하드코딩
* 이름·이메일 기반 Actor Binding
* Chain 내부 Monetary Authority 중복 정의
* Chain 내부 최종 Candidate 확정
* 기존 Workflow Chain 중복 생성
* Snapshot 직접 수정
* History 덮어쓰기

---

# 57. 최소 Runtime Guard

다음을 차단하라.

* APPROVAL_CHAIN_NOT_FOUND
* APPROVAL_CHAIN_VERSION_NOT_FOUND
* APPROVAL_CHAIN_VERSION_INACTIVE
* APPROVAL_CHAIN_VERSION_UNAPPROVED
* APPROVAL_CHAIN_VERSION_IMMUTABLE
* APPROVAL_CHAIN_MULTIPLE_MATCH
* APPROVAL_CHAIN_NO_MATCH
* APPROVAL_CHAIN_SELECTION_CONFLICT
* APPROVAL_CHAIN_OUTSIDE_EFFECTIVE_PERIOD
* APPROVAL_CHAIN_TENANT_MISMATCH
* APPROVAL_CHAIN_LEGAL_ENTITY_MISMATCH
* APPROVAL_CHAIN_ORGANIZATION_MISMATCH
* APPROVAL_CHAIN_VALIDATION_FAILED
* APPROVAL_CHAIN_COMPILATION_FAILED
* APPROVAL_CHAIN_ROUTE_INVALID
* APPROVAL_CHAIN_CYCLE_DETECTED
* APPROVAL_CHAIN_UNREACHABLE_NODE
* APPROVAL_CHAIN_DEAD_END
* APPROVAL_CHAIN_CONDITION_FAILED
* APPROVAL_CHAIN_OVERRIDE_INVALID
* APPROVAL_CHAIN_FALLBACK_EXHAUSTED
* APPROVAL_CHAIN_FALLBACK_CYCLE
* APPROVAL_CHAIN_SNAPSHOT_MISSING
* APPROVAL_CHAIN_SNAPSHOT_INVALID
* APPROVAL_CHAIN_CACHE_STALE
* APPROVAL_CHAIN_WORKFLOW_DRIFT
* APPROVAL_CHAIN_CRITICAL_RECONCILIATION_DRIFT
* APPROVAL_CHAIN_KILL_SWITCH_ACTIVE

---

# 58. Error Contract

* APPROVAL_CHAIN_REGISTRY_NOT_FOUND
* APPROVAL_CHAIN_DEFINITION_NOT_FOUND
* APPROVAL_CHAIN_TYPE_NOT_FOUND
* APPROVAL_CHAIN_VERSION_NOT_FOUND
* APPROVAL_CHAIN_VERSION_INACTIVE
* APPROVAL_CHAIN_VERSION_UNAPPROVED
* APPROVAL_CHAIN_VERSION_IMMUTABLE
* APPROVAL_CHAIN_TEMPLATE_NOT_FOUND
* APPROVAL_CHAIN_TEMPLATE_VERSION_NOT_FOUND
* APPROVAL_STAGE_NOT_FOUND
* APPROVAL_STAGE_INVALID
* APPROVAL_LEVEL_NOT_FOUND
* APPROVAL_LEVEL_INVALID
* APPROVAL_ROUTE_NOT_FOUND
* APPROVAL_ROUTE_VERSION_NOT_FOUND
* APPROVAL_ROUTE_NODE_NOT_FOUND
* APPROVAL_ROUTE_EDGE_NOT_FOUND
* APPROVAL_ROUTE_INVALID
* APPROVAL_ROUTE_CYCLE
* APPROVAL_ROUTE_START_INVALID
* APPROVAL_ROUTE_TERMINAL_MISSING
* APPROVAL_ROUTE_UNREACHABLE_NODE
* APPROVAL_ROUTE_DEAD_END
* APPROVAL_ROUTE_DEFAULT_EDGE_CONFLICT
* APPROVAL_ROUTE_BRANCH_INVALID
* APPROVAL_ROUTE_MERGE_INVALID
* APPROVAL_ROUTE_CONDITION_INVALID
* APPROVAL_CHAIN_APPLICABILITY_FAILED
* APPROVAL_CHAIN_MULTIPLE_MATCH
* APPROVAL_CHAIN_NO_MATCH
* APPROVAL_CHAIN_PRIORITY_CONFLICT
* APPROVAL_CHAIN_SPECIFICITY_CONFLICT
* APPROVAL_CHAIN_OVERRIDE_INVALID
* APPROVAL_CHAIN_FALLBACK_INVALID
* APPROVAL_CHAIN_FALLBACK_EXHAUSTED
* APPROVAL_CHAIN_FALLBACK_CYCLE
* APPROVAL_CHAIN_EFFECTIVE_PERIOD_INVALID
* APPROVAL_CHAIN_COMPILATION_FAILED
* APPROVAL_CHAIN_SNAPSHOT_MISSING
* APPROVAL_CHAIN_SNAPSHOT_INVALID
* APPROVAL_CHAIN_RECONCILIATION_FAILED
* APPROVAL_CHAIN_RUNTIME_BLOCKED

---

# 59. Warning Contract

* APPROVAL_CHAIN_REGISTRY_WARNING
* APPROVAL_CHAIN_VERSION_WARNING
* APPROVAL_CHAIN_TEMPLATE_WARNING
* APPROVAL_STAGE_WARNING
* APPROVAL_LEVEL_WARNING
* APPROVAL_ROUTE_WARNING
* APPROVAL_ROUTE_CONDITION_WARNING
* APPROVAL_ROUTE_BRANCH_WARNING
* APPROVAL_ROUTE_MERGE_WARNING
* APPROVAL_CHAIN_APPLICABILITY_WARNING
* APPROVAL_CHAIN_PRIORITY_WARNING
* APPROVAL_CHAIN_SPECIFICITY_WARNING
* APPROVAL_CHAIN_OVERRIDE_WARNING
* APPROVAL_CHAIN_FALLBACK_WARNING
* APPROVAL_CHAIN_EFFECTIVE_DATE_WARNING
* APPROVAL_CHAIN_COMPILATION_WARNING
* APPROVAL_CHAIN_SNAPSHOT_WARNING
* APPROVAL_CHAIN_CHANGE_IMPACT_WARNING
* APPROVAL_CHAIN_RECONCILIATION_WARNING
* APPROVAL_CHAIN_MANUAL_REVIEW_REQUIRED

---

# 60. Evidence Contract

`APPROVAL_CHAIN_EVIDENCE`

필수 필드:

* evidence id
* tenant
* chain registry
* chain definition
* chain version
* template
* template version
* stage
* stage version
* level
* level version
* route
* route version
* route node
* route edge
* condition
* applicability
* selection policy
* priority
* resolution input
* chain candidate
* resolution result
* compilation
* conflict
* override
* fallback
* effective period
* snapshot
* change impact
* reconciliation
* approval request
* approval case
* approval requirement
* workflow reference
* organization hierarchy version
* reporting line version
* authority policy reference
* actor resolver reference
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
* 전체 HRIS Payload
* 전체 Approval Request 민감 Payload
* Bank Data
* Health 정보
* 민감 계약 원문
* 암호화되지 않은 Secret

---

# 61. Audit Event

`APPROVAL_CHAIN_AUDIT_EVENT`

지원 Event:

* APPROVAL_CHAIN_REGISTRY_CREATED
* APPROVAL_CHAIN_DEFINITION_CREATED
* APPROVAL_CHAIN_VERSION_CREATED
* APPROVAL_CHAIN_TEMPLATE_CREATED
* APPROVAL_CHAIN_TEMPLATE_VERSION_CREATED
* APPROVAL_STAGE_CREATED
* APPROVAL_STAGE_VERSION_CREATED
* APPROVAL_LEVEL_CREATED
* APPROVAL_LEVEL_VERSION_CREATED
* APPROVAL_ROUTE_CREATED
* APPROVAL_ROUTE_VERSION_CREATED
* APPROVAL_ROUTE_NODE_CREATED
* APPROVAL_ROUTE_EDGE_CREATED
* APPROVAL_ROUTE_CONDITION_CREATED
* APPROVAL_CHAIN_VALIDATED
* APPROVAL_CHAIN_VALIDATION_FAILED
* APPROVAL_CHAIN_COMPILED
* APPROVAL_CHAIN_COMPILATION_FAILED
* APPROVAL_CHAIN_ACTIVATED
* APPROVAL_CHAIN_SELECTION_STARTED
* APPROVAL_CHAIN_CANDIDATE_CREATED
* APPROVAL_CHAIN_SELECTED
* APPROVAL_CHAIN_MULTIPLE_MATCH_DETECTED
* APPROVAL_CHAIN_NO_MATCH_DETECTED
* APPROVAL_CHAIN_CONFLICT_DETECTED
* APPROVAL_CHAIN_OVERRIDE_CREATED
* APPROVAL_CHAIN_OVERRIDE_APPLIED
* APPROVAL_CHAIN_FALLBACK_APPLIED
* APPROVAL_CHAIN_MANUAL_REVIEW_REQUESTED
* APPROVAL_CHAIN_SNAPSHOT_CREATED
* APPROVAL_CHAIN_CHANGE_IMPACT_DETECTED
* APPROVAL_CHAIN_FUTURE_CHANGE_SCHEDULED
* APPROVAL_CHAIN_FUTURE_CHANGE_ACTIVATED
* APPROVAL_CHAIN_RETROACTIVE_CORRECTION_RECORDED
* APPROVAL_CHAIN_DRIFT_DETECTED
* APPROVAL_CHAIN_RUNTIME_BLOCKED

---

# 62. 기존 구현 분류

기존 구현을 다음으로 분류하라.

* `CANONICAL_APPROVAL_CHAIN_REGISTRY`
* `CANONICAL_APPROVAL_CHAIN_DEFINITION`
* `CANONICAL_APPROVAL_CHAIN_VERSION`
* `CANONICAL_APPROVAL_CHAIN_TEMPLATE`
* `CANONICAL_APPROVAL_STAGE`
* `CANONICAL_APPROVAL_LEVEL`
* `CANONICAL_APPROVAL_ROUTE`
* `CANONICAL_APPROVAL_ROUTE_GRAPH`
* `CANONICAL_APPROVAL_CHAIN_APPLICABILITY`
* `CANONICAL_APPROVAL_CHAIN_SELECTION`
* `CANONICAL_APPROVAL_CHAIN_COMPILATION`
* `CANONICAL_APPROVAL_CHAIN_CONFLICT`
* `CANONICAL_APPROVAL_CHAIN_OVERRIDE`
* `CANONICAL_APPROVAL_CHAIN_FALLBACK`
* `CANONICAL_APPROVAL_CHAIN_SNAPSHOT`
* `CANONICAL_APPROVAL_CHAIN_RECONCILIATION`
* `VALIDATED_WORKFLOW_ENGINE`
* `VALIDATED_RULE_ENGINE`
* `VALIDATED_BPMN_ENGINE`
* `VALIDATED_LEGACY`
* `LEGACY_ADAPTER`
* `EXTERNAL_SOURCE_ADAPTER`
* `MIGRATION_REQUIRED`
* `CONSOLIDATION_REQUIRED`
* `DEPRECATION_CANDIDATE`
* `KEEP_SEPARATE_WITH_REASON`
* `BLOCKED_CROSS_TENANT`
* `BLOCKED_ROUTE_CYCLE`
* `BLOCKED_HISTORICAL_INTEGRITY_RISK`
* `BLOCKED_CHAIN_CONFLICT`
* `UNVERIFIED`
* `TEST_ONLY`

---

# 63. 중복 구현 감사

다음을 전수 탐지하라.

* 여러 Approval Chain Registry
* 여러 Approval Chain Table
* 여러 Approval Stage Table
* 여러 Approval Level Table
* 여러 Approval Step Table
* Workflow Module 내부 독립 Approval Chain
* Rebate Module 내부 독립 Approval Chain
* Finance Module 내부 독립 Route
* Legal Module 내부 독립 Route
* Hard-coded Approver Sequence
* Hard-coded Manager Level
* 여러 `step_order`
* 여러 `sequence_no`
* 여러 `next_step`
* 여러 `approval_depth`
* 여러 JSON Route Definition
* BPMN과 DB Chain의 중복 Source of Truth
* Rule Engine과 Application Code의 중복 조건
* 현재 Employee ID가 포함된 Chain
* 이름·이메일 기반 Approver Binding
* Active Chain 직접 수정
* Current Chain만 저장하는 구현
* Historical Chain 덮어쓰기
* Version 없는 Chain
* Snapshot 없는 Chain Build
* Cycle Detection 없는 Route
* No Match 시 첫 번째 Chain 선택
* Priority Tie 미처리
* Authority Limit를 Chain에 중복 저장
* Manager Resolver를 Chain에 중복 구현
* Chain 변경 후 Cache 미무효화
* Chain과 Workflow Task 불일치
* Override가 Base Chain을 직접 수정
* 무기한 Override
* Fallback Cycle
* Tenant 구분 없는 Global Chain 조회

---

# 64. 데이터 저장 전략

권장 구조:

```text
APPROVAL_CHAIN_DEFINITION
= Chain의 장기 Identity와 Scope

APPROVAL_CHAIN_VERSION
= 특정 시점의 불변 실행 구조

APPROVAL_STAGE_DEFINITION
= 논리적 승인 구간

APPROVAL_LEVEL_DEFINITION
= Stage 내부 Actor Source Requirement

APPROVAL_ROUTE_NODE·EDGE
= 실제 경로 DAG

APPROVAL_CHAIN_APPLICABILITY
= 어떤 Request에 적용되는지

APPROVAL_CHAIN_SELECTION_POLICY
= 여러 Chain 중 선택 방법

APPROVAL_CHAIN_COMPILATION
= Runtime 최적화 Artifact

APPROVAL_CHAIN_SNAPSHOT
= 승인 당시 Version 고정
```

기존 기술 스택에 따라 다음을 사용할 수 있다.

* Relational Adjacency List
* DAG Table
* Materialized Path
* Closure Table
* Recursive CTE
* Workflow Graph Adapter
* BPMN Adapter
* Typed JSON Definition
* Policy Engine
* Event-sourced Version History

Typed JSON을 사용할 경우 JSON Schema와 Database Reference Integrity를 함께 적용하라.

---

# 65. API Contract

기존 API Convention을 따르고 최소 다음 기능을 제공하라.

## Registry·Definition

* Chain Registry 조회
* Chain Definition 생성
* Chain Definition 수정
* Chain Definition 조회
* Chain Definition History 조회
* Chain Type 조회

## Version

* Chain Version 생성
* Version 비교
* Version 검증
* Version Compile
* Version Review 요청
* Version 승인 Reference
* Version 활성화
* Future Activation 예약
* 특정 날짜 Version 조회
* Version 종료
* Version History 조회

## Template

* Template 생성
* Template Version 생성
* Template 조회
* Template Parameter 검증
* Template로 Chain Version 생성
* Template Compatibility 조회

## Stage·Level

* Stage 생성
* Stage Version 생성
* Level 생성
* Level Version 생성
* Stage·Level 구조 조회
* Stage·Level Validation

## Route

* Route 생성
* Route Version 생성
* Node 생성
* Edge 생성
* Condition 생성
* Branch 생성
* Merge 생성
* Route Graph 조회
* Topological Order 조회
* Reachability 검증
* Cycle 검증

## Applicability·Selection

* Applicability 생성
* Applicability 검증
* Chain Candidate 조회
* Chain Selection 실행
* Selection Evidence 조회
* Multiple Match 조회
* No Match 처리

## Override·Fallback

* Override 생성
* Override 종료
* Active Override 조회
* Fallback 생성
* Fallback Sequence 조회
* Fallback Cycle 검증

## Resolution

* Resolution Input 생성
* Chain Candidate 생성
* Chain Resolution 실행
* Resolution Result 조회
* Required Actor Source Requirement 조회
* Manual Review 전환

## Snapshot·Reconciliation

* Chain Snapshot 생성
* Snapshot 조회
* Snapshot Hash 검증
* Historical Reconstruction
* Reconciliation 실행
* Drift 조회
* 영향 Case 조회
* Manual Resolution

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
* Correlation ID
* Request Validation
* Version Check

---

# 66. Index·Performance

최소 다음 조회를 최적화하라.

* Tenant별 Active Chain
* Approval Domain별 Active Chain
* Request Type별 Applicable Chain
* Resource Type별 Applicable Chain
* Rebate Type별 Applicable Chain
* Organization별 Chain
* Legal Entity별 Chain
* Country·Region별 Chain
* Program·Product·Brand별 Chain
* Partner·Channel별 Chain
* Effective Date 기준 Chain Version
* Template별 Chain
* Chain Version별 Stage
* Stage별 Level
* Route Version별 Node
* Source Node별 Outgoing Edge
* Target Node별 Incoming Edge
* START Node
* Terminal Node
* Branch Node
* Merge Node
* Condition별 Route
* Priority별 Chain
* Specificity별 Candidate
* Active Override
* Active Fallback
* Future-dated Change
* Chain Conflict
* Chain Snapshot
* Reconciliation Mismatch
* Approval Case별 Chain
* Workflow Task별 Chain Level

---

# 67. Cache 원칙

Chain Resolution Cache Key에는 최소 다음을 포함하라.

* tenant_id
* approval_domain
* request_type
* resource_type
* transaction_type
* rebate_type
* organization_id
* legal_entity_id
* country
* region
* program_id
* product_id
* brand_id
* partner_id
* channel_id
* amount_band_reference
* risk_band_reference
* effective_at 또는 effective version bucket
* selection_policy_version
* applicability_version_set_hash
* active_override_set_hash
* environment

다음을 적용하라.

* Version-aware Cache
* Tenant-isolated Cache
* Effective-time-aware Cache
* Chain Version 활성화 시 Invalidation
* Applicability 변경 시 Invalidation
* Priority 변경 시 Invalidation
* Override 시작·종료 시 Invalidation
* Fallback 변경 시 Invalidation
* Organization Binding 변경 시 Invalidation
* Legal Entity Binding 변경 시 Invalidation
* Critical Reconciliation Drift 시 Cache 차단
* Historical Snapshot을 Current Cache로 재생성 금지
* Stale-while-revalidate는 승인 경로 선택에서 기본 금지
* Fail-open Cache 사용 금지

---

# 68. 보안 원칙

다음을 강제하라.

* Tenant-scoped Query
* Cross-Tenant Reference Block
* Platform Template Read-only
* Tenant Override Authorization
* Case-specific Override 강화 Authorization
* Retroactive Correction 강화 Authorization
* Chain Activation Separation of Duties Reference
* Active Version 수정 차단
* Evidence·Snapshot 변조 차단
* Unsafe Expression 차단
* Arbitrary Code Execution 차단
* Fixed Subject Reference 최소화
* Sensitive Request Attribute 최소 저장
* Audit Event 강제
* Authorization Decision 기록
* Rate Limit
* Idempotency
* Replay Protection Reference

Chain Definition 관리 권한과 Approval Decision 권한을 동일시하지 마라.

---

# 69. 테스트 범위

## Unit Test

* Chain Definition 생성
* Chain Version 생성
* Template 생성
* Stage 생성
* Level 생성
* Route Node·Edge 생성
* START·Terminal 검증
* Cycle Detection
* Reachability
* Branch Validation
* Merge Validation
* Applicability Match
* Priority Selection
* Specificity Selection
* Override Overlay
* Fallback Sequence
* Effective Period
* Snapshot Hash
* Compilation Hash

## Integration Test

* Organization Hierarchy Reference
* Reporting Line Reference
* Workflow Definition Reference
* Approval Request → Chain Selection
* Approval Case → Chain Snapshot
* Template → Chain Version
* Future Chain Activation
* Override Start·End
* Fallback Resolution
* Chain Change Impact
* Reconciliation
* Cache Invalidation

## Property Test

* Route Graph Acyclic
* START Node 정확히 하나
* Required Node Reachable
* Required Node에서 Terminal Reachable
* Tenant Isolation
* Active Version Immutability
* Snapshot Determinism
* Effective Period Non-overlap
* Selection Determinism
* 동일 입력·동일 Version Set의 동일 결과
* Fallback Termination

## Concurrency Test

* 동일 Chain Version 동시 생성
* 동일 Scope Chain 동시 활성화
* 동일 Priority 동시 등록
* Future Scheduler 중복 실행
* Override 동시 생성
* Snapshot 동시 생성
* Compilation 동시 실행
* Cache Invalidation 경쟁

## Security Test

* Cross-Tenant Chain 조회
* Cross-Tenant Node 참조
* Unauthorized Chain Activation
* Unauthorized Override
* Unauthorized Retroactive Correction
* Active Version 변조
* Snapshot 변조
* Unsafe Expression Injection
* Fixed Subject 권한 상승
* Chain을 통한 Authority 자동 상승 방지

## Performance Test

* 대량 Chain Applicability 검색
* 대량 Candidate Selection
* 복잡한 DAG Compilation
* 최대 허용 Node·Edge Route
* 다중 Branch·Merge
* Historical Version 조회
* Snapshot 조회
* Cache Hit·Miss
* Concurrent Resolution

## Regression Test

* 기존 Single Approval
* 기존 Multi-Level Approval
* 기존 Workflow Definition
* 기존 Workflow Task
* 기존 Manager Approval
* 기존 Finance Approval
* 기존 Legal Approval
* 기존 Role Assignment
* 기존 Notification
* 기존 Audit
* 기존 API Compatibility

---

# 70. 실행 절차

## Step 1 — 기존 Approval Chain·Route 전수 조사

Approval, Workflow, Rebate, Finance, Legal, Security 및 Rule Engine 코드를 조사하라.

## Step 2 — Canonical Source of Truth 결정

기존 Workflow Graph와 Approval Chain의 책임 경계를 확정하라.

## Step 3 — 중복 구현 분류

Chain, Stage, Level, Step, Route, Node, Edge 및 Sequence 구현을 분류하라.

## Step 4 — Approval Chain Registry 구축

Platform·Tenant·Domain Registry를 표준화하라.

## Step 5 — Chain Definition·Type 구축

Chain Identity, Scope 및 Type을 구축하라.

## Step 6 — Chain Version 구축

불변 Version과 Effective Dating을 구현하라.

## Step 7 — Template·Template Version 구축

재사용 가능한 Chain 구조를 구현하라.

## Step 8 — Stage·Stage Version 구축

승인 목적별 논리 구간을 구현하라.

## Step 9 — Level·Level Version 구축

Actor Source Requirement 기반 승인 계층을 구현하라.

## Step 10 — Route Definition·Version 구축

Chain의 Directed Route 구조를 구축하라.

## Step 11 — Node·Edge 구축

START, Stage, Level, Condition, Branch, Merge, Fallback 및 Terminal Node를 구현하라.

## Step 12 — Route Condition 구축

Typed Condition과 Policy Reference를 구현하라.

## Step 13 — Branch·Merge Foundation 구축

조건 분기와 병합 구조를 구현하라.

## Step 14 — Hierarchical Route Foundation 구축

Reporting Line과 Organization Hierarchy 기반 Level Requirement를 구현하라.

## Step 15 — Applicability 구축

Request Context와 Chain Scope 매칭을 구현하라.

## Step 16 — Selection Policy·Priority 구축

다중 Chain 선택의 결정론적 규칙을 구현하라.

## Step 17 — Resolution Input·Candidate·Result 구축

Chain Definition 선택 결과와 근거를 구현하라.

## Step 18 — Validation 구축

Structure, Scope, Version, Reference 및 Route Integrity를 검증하라.

## Step 19 — Compilation 구축

Runtime용 불변 Compiled Artifact를 생성하라.

## Step 20 — Conflict 구축

Multiple Match, Priority, Route 및 Version Conflict를 탐지하라.

## Step 21 — Override 구축

Base Chain을 보존하는 Overlay 구조를 구현하라.

## Step 22 — Fallback·Missing Chain 구축

No Match와 Invalid Route 처리 기반을 구축하라.

## Step 23 — Effective Dating 구축

Future·Historical·Retroactive Chain Version을 지원하라.

## Step 24 — Snapshot Foundation 구축

Approval 시점 Chain 구조를 고정하라.

## Step 25 — Change Impact 구축

Active Case와 Task에 미치는 영향을 계산하라.

## Step 26 — Reconciliation 구축

Definition, Version, Compiled Artifact, Workflow 및 Task Drift를 탐지하라.

## Step 27 — Static Lint·Runtime Guard 구축

잘못된 Definition과 Runtime Resolution을 차단하라.

## Step 28 — 기존 구현 통합

중복 Chain과 Hard-coded Route를 Canonical Adapter로 전환하라.

## Step 29 — 테스트·문서·History 갱신

모든 결과와 남은 위험을 기록하라.

---

# 71. 생성 또는 갱신할 문서

기존 동일 목적 문서가 있으면 새로 중복 생성하지 말고 통합하라.

권장 통합 문서:

* `docs/approval/APPROVAL_CHAIN_DOMAIN_MODEL.md`
* `docs/approval/APPROVAL_CHAIN_VERSIONING.md`
* `docs/approval/APPROVAL_CHAIN_TEMPLATE.md`
* `docs/approval/APPROVAL_STAGE_AND_LEVEL.md`
* `docs/approval/APPROVAL_ROUTE_GRAPH.md`
* `docs/approval/HIERARCHICAL_ROUTE_FOUNDATION.md`
* `docs/approval/APPROVAL_CHAIN_APPLICABILITY_AND_SELECTION.md`
* `docs/approval/APPROVAL_CHAIN_COMPILATION.md`
* `docs/approval/APPROVAL_CHAIN_OVERRIDE_AND_FALLBACK.md`
* `docs/approval/APPROVAL_CHAIN_EFFECTIVE_DATING.md`
* `docs/approval/APPROVAL_CHAIN_SNAPSHOT.md`
* `docs/approval/APPROVAL_CHAIN_CHANGE_IMPACT.md`
* `docs/approval/APPROVAL_CHAIN_RECONCILIATION.md`
* `docs/approval/APPROVAL_CHAIN_SECURITY_AND_GUARDS.md`
* `docs/approval/APPROVAL_CHAIN_API.md`
* `docs/approval/APPROVAL_CHAIN_TEST_PLAN.md`
* `docs/adr/ADR_APPROVAL_CHAIN_CANONICAL_SOURCE.md`
* `docs/adr/ADR_APPROVAL_CHAIN_WORKFLOW_BOUNDARY.md`
* `docs/adr/ADR_APPROVAL_ROUTE_DAG.md`
* `docs/adr/ADR_APPROVAL_CHAIN_VERSIONING.md`
* `docs/adr/ADR_APPROVAL_CHAIN_COMPILATION.md`

Entity·Enum별 문서를 무조건 각각 생성하지 마라.

Schema Reference는 가능하면 코드·Migration·OpenAPI에서 자동 생성하라.

---

# 72. 구현 시 절대 금지사항

다음을 절대 하지 마라.

1. 현재 직원 ID를 일반 Chain Level에 하드코딩하지 마라.
2. `manager_id`를 Chain Definition에 직접 저장하지 마라.
3. Chain에서 최종 Approver Eligibility를 결정하지 마라.
4. Chain에서 Monetary Authority를 중복 계산하지 마라.
5. Active Version을 직접 수정하지 마라.
6. 과거 Version을 덮어쓰지 마라.
7. Snapshot을 수정하지 마라.
8. Route Graph에 무제한 Cycle을 허용하지 마라.
9. DB 반환 순서로 Chain을 선택하지 마라.
10. No Match 시 첫 Chain을 선택하지 마라.
11. Multiple Match를 숨기지 마라.
12. Override로 Base Chain을 수정하지 마라.
13. Temporary Override를 무기한 허용하지 마라.
14. Fallback Cycle을 허용하지 마라.
15. Tenant Context 없는 Chain Query를 허용하지 마라.
16. 이름·이메일로 Actor를 연결하지 마라.
17. 임의 JavaScript·Python·SQL Condition 실행을 허용하지 마라.
18. Workflow Engine과 별도 Route Source of Truth를 만들지 마라.
19. Stage Order와 Level Number만으로 Route를 계산하지 마라.
20. Chain 변경으로 완료된 Decision을 수정하지 마라.
21. 과거 Approval을 현재 Chain으로 재해석하지 마라.
22. 기존 정상 기능을 파괴하지 마라.
23. 테스트를 삭제하거나 약화하지 마라.
24. 실패한 테스트를 Skip 처리하여 완료로 보고하지 마라.
25. 미구현 기능을 구현 완료로 기록하지 마라.

---

# 73. 구현 결과 보고 형식

작업 완료 후 다음 순서로 상세 보고하라.

1. 조사한 기존 Approval Chain 구현
2. 조사한 기존 Workflow Route 구현
3. Canonical로 채택한 구현
4. Adapter로 유지한 구현
5. Migration이 필요한 구현
6. 제거 또는 Deprecation한 중복 구현
7. Approval Chain Registry 수
8. Chain Definition 수
9. Chain Version 수
10. Active Chain Version 수
11. Template 수
12. Template Version 수
13. Stage 수
14. Stage Version 수
15. Level 수
16. Level Version 수
17. Route 수
18. Route Version 수
19. Route Node 수
20. Route Edge 수
21. Condition 수
22. Branch 수
23. Merge 수
24. Hierarchical Route 수
25. Applicability Rule 수
26. Selection Policy 수
27. Priority Rule 수
28. Resolution Input 수
29. Chain Candidate 수
30. Chain Resolution Result 수
31. Validation Rule 수
32. Validation Failure 수
33. Compilation 수
34. Compilation Failure 수
35. Conflict 수
36. Multiple Match 수
37. No Match 수
38. Priority Conflict 수
39. Specificity Conflict 수
40. Route Cycle 탐지 수
41. Unreachable Node 수
42. Dead-end Node 수
43. Override 수
44. Active Override 수
45. Fallback 수
46. Missing Chain Case 수
47. Manual Review 수
48. Future-dated Change 수
49. Retroactive Correction 수
50. Snapshot 수
51. Change Impact 수
52. 영향 Approval Request 수
53. 영향 Approval Case 수
54. 영향 Task 수
55. Reconciliation Mismatch 수
56. Workflow Drift 수
57. Task Level Drift 수
58. Cache Invalidation 수
59. Static Lint Rule 수
60. Runtime Guard 수
61. Unit Test 결과
62. Integration Test 결과
63. Property Test 결과
64. Concurrency Test 결과
65. Security Test 결과
66. Performance Test 결과
67. Regression Test 결과
68. 생성·수정한 Migration
69. 생성·수정한 API
70. 생성·수정한 문서
71. 생성·수정한 ADR
72. 남은 위험
73. 후속 5-3-3-4 준비 상태

각 항목에는 다음을 포함하라.

* 파일 경로
* 주요 클래스·함수·테이블
* 변경 이유
* 테스트 근거
* 미완료 여부
* 남은 위험
* 후속 작업

---

# 74. 완료 조건

다음 조건을 모두 충족해야 이번 블록을 완료로 인정한다.

1. 기존 Approval Chain과 Route 구현을 전수 조사했다.
2. Canonical Source of Truth를 결정했다.
3. Approval Chain Registry가 구축되었다.
4. Approval Chain Type이 구축되었다.
5. Approval Chain Definition이 구축되었다.
6. Approval Chain Version이 구축되었다.
7. Approval Chain Template이 구축되었다.
8. Template Version이 구축되었다.
9. Approval Stage가 구축되었다.
10. Stage Version이 구축되었다.
11. Approval Level이 구축되었다.
12. Level Version이 구축되었다.
13. Approval Route가 구축되었다.
14. Route Version이 구축되었다.
15. Route Segment가 구축되었다.
16. Route Node가 구축되었다.
17. Route Edge가 구축되었다.
18. START·Terminal 규칙이 구현되었다.
19. Route Condition이 구축되었다.
20. Branch Foundation이 구축되었다.
21. Merge Foundation이 구축되었다.
22. Hierarchical Route Foundation이 구축되었다.
23. Manager-of-manager Level Requirement가 구축되었다.
24. Chain Applicability가 구축되었다.
25. Chain Selection Policy가 구축되었다.
26. Chain Priority가 구축되었다.
27. Specificity 계산 기반이 구축되었다.
28. Resolution Input이 구축되었다.
29. Chain Candidate가 구축되었다.
30. Resolution Result가 구축되었다.
31. Chain Validation이 구축되었다.
32. Chain Compilation이 구축되었다.
33. Route Cycle Detection이 구축되었다.
34. Reachability Validation이 구축되었다.
35. Chain Conflict가 구축되었다.
36. Chain Override가 구축되었다.
37. Chain Fallback이 구축되었다.
38. Missing Chain Policy가 구축되었다.
39. Chain Effective Dating이 구축되었다.
40. Future-dated Change가 구축되었다.
41. Retroactive Correction 기반이 구축되었다.
42. Chain Snapshot Foundation이 구축되었다.
43. Chain Change Impact가 구축되었다.
44. In-flight Case Policy Hook이 구축되었다.
45. Chain Reconciliation이 구축되었다.
46. Static Lint가 구축되었다.
47. Runtime Guard가 구축되었다.
48. Error Contract가 구축되었다.
49. Warning Contract가 구축되었다.
50. Evidence Contract가 구축되었다.
51. Audit Event가 구축되었다.
52. Tenant Isolation이 검증되었다.
53. Active Version Immutability가 검증되었다.
54. Snapshot Immutability가 검증되었다.
55. Selection Determinism이 검증되었다.
56. Fallback Termination이 검증되었다.
57. 기존 Workflow와 Regression이 통과했다.
58. 중복 Chain 구현이 분류·통합되었다.
59. 문서와 ADR이 갱신되었다.
60. 후속 Authority Matrix가 사용할 Contract가 준비되었다.

---

# 75. 최종 실행 명령

Repository 전체를 먼저 조사한 후 기존 정상 기능을 보존하면서 구현하라.

`APPROVAL_CHAIN_DEFINITION`을 Approval Chain Identity의 Canonical Source of Truth로 사용하라.

`APPROVAL_CHAIN_VERSION`을 특정 시점에 실행 가능한 불변 구조로 사용하라.

Stage와 Level을 분리하고, 실제 경로는 `APPROVAL_ROUTE_NODE`와 `APPROVAL_ROUTE_EDGE`의 Directed Acyclic Graph로 표현하라.

Stage Order와 Level Number만으로 실행 순서를 결정하지 마라.

Reporting Line에서 실제 Manager Subject를 Chain에 복사하지 말고 Actor Source Requirement와 Manager Relationship Type Reference만 저장하라.

실제 Manager·Role·Resource Owner Candidate Resolution 및 Eligibility는 후속 5-3-3-5에서 수행하도록 Contract만 제공하라.

Monetary·Currency·Transaction Authority는 Chain에 중복 저장하지 말고 후속 5-3-3-4 Authority Policy Reference만 연결하라.

실제 Sequential Task Activation, Previous-Level Completion, Next-Level Activation 및 Reapproval는 후속 5-3-3-6에서 구현하도록 Definition Contract만 제공하라.

기존 Workflow Engine이 Canonical DAG를 제공하는 경우 별도 Graph Source of Truth를 생성하지 말고 Adapter 또는 Semantic Layer로 통합하라.

Active Chain Version을 직접 수정하지 말고 모든 변경을 새 Version으로 생성하라.

과거 Approval Request·Case가 사용한 Chain Version과 Snapshot을 현재 Chain으로 대체하지 마라.

Chain Applicability와 Selection은 Tenant·Domain·Request Type·Resource·Organization·Legal Entity·Country·Program·Product·Brand·Partner·Channel·Effective Time을 기준으로 결정론적으로 수행하라.

동일 입력과 동일 Version Set에서는 항상 동일 Chain Resolution Result가 생성되어야 한다.

Multiple Match, No Match, Priority Conflict 및 Specificity Conflict를 숨기거나 임의로 선택하지 마라.

Override는 Base Chain을 수정하지 않는 Versioned Overlay로 구현하라.

Fallback은 최대 깊이와 종료 조건을 가지며 Cycle을 금지하라.

Route 활성화 전 START, Terminal, Reachability, Dead-end, Cycle, Branch, Merge, Condition, Tenant, Version 및 Reference Integrity를 검증하라.

Runtime에는 검증·Compile된 불변 Artifact만 사용하라.

Chain 변경 시 Approval Request, Case, Planned Task, Unclaimed Task, Claimed Task, Snapshot, Cache 및 Workflow에 대한 영향을 계산하라.

완료된 Approval Decision과 Historical Snapshot은 Chain 변경으로 수정하지 마라.

기존 Single Approval, Multi-Level Approval, Workflow, Manager Approval, Finance Approval, Role Assignment, Notification 및 Audit 기능을 유지하라.

중복 Chain Table, 중복 Route Graph, Hard-coded Approver Sequence, 현재 Employee ID Binding, 이름·이메일 Mapping, Current-only Chain, Version 없는 Route, Snapshot 없는 Chain Build 및 Cycle Detection 없는 Workflow를 Canonical 구조로 통합하거나 Deprecation하라.

모든 구현 결정, 충돌, Migration, 테스트 결과, 남은 위험 및 후속 Contract를 ADR, PM Change History, Repeat Problem History 및 Agent Execution History에 기록하라.

다음 단계인:

**EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-3-4 — Rebate Approval Authority Matrix & Delegation of Authority Foundation Governance**

를 구현할 수 있도록 검증된 Approval Chain Definition, Approval Stage, Approval Level, Hierarchical Route, Version, Template, Applicability, Selection, Compilation, Override, Fallback, Snapshot 및 Evidence Foundation을 완성하라.
