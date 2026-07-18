# SPEC 원문 선영속 — EPIC 06-A-01 Rebate Delegation Foundation Governance

> **이 파일은 사용자 제공 원문의 무수정 보존본이다.** 요약·재구성·판단 금지. 아래 `# GeniegoROI Enterprise Engineering Handbook` 부터가 원문이다.
>
> ## 선영속 이유 (5-3-1 교훈)
> 스펙은 **순서 무관·소실 방지**를 위해 **받는 즉시 먼저 영속**한다. 세션이 끊기면 원문은 사용자만 보유하며 복구 불가다.
>
> ## 착수 전 필독 (289차 11회차 기록 — 5-3-3-4 완결 시점 실측 주입)
>
> ### ★★이 블록의 선행조건(§3)은 대부분 미충족이다 — "문서 존재 ≠ 구현 존재"
> Delegation은 **Authority/Approval Foundation 위에** 올라가는데, 5-3-2~5-3-3-4 전수조사 결과 그 토대가 **개념 자체 부재**다:
> - **§3.1 Approval Foundation**(Request/Case/Chain/Stage/Level/Resolution) = 5-3-2/5-3-3-3 **커버 0.00%**. `docs/approval/` 16편은 **계약 명세일 뿐 실 코드·테이블 0건**. → 대부분 `BLOCKED_PREREQUISITE`.
> - **§3.2 Authority Foundation**(Registry/Type/Domain/Definition/Matrix/Binding/Candidate/Resolution/Snapshot/Conflict/Reconciliation) = **5-3-3-4 결론: 레포에 Approval Authority 개념 없음**. §72 Canonical Entity 20종 전량 ABSENT([[DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION]]). "위임할 Authority" 자체가 없다 → §12 Authority Binding·§18 Monetary·§26/§27 Eligibility 대부분 `BLOCKED_PREREQUISITE`.
> - **§3.3 Identity·Organization**: `Organization Unit`/`Organization Hierarchy` 엔티티 **부재**(5-3-3-1 확정)·**Manager Resolver ABSENT**(`parent_user_id` 판독자 25 전량 owner/tenant·상급자 반환 0)·**Legal Entity 전면 void**(`biz_no`/`corp_reg`/`tax_id` grep 0)·`Position`/`Employment Record` 엔티티 0. → §15 Org Binding·§16 Legal Entity Binding·§19(Acting Manager)·§21 Delegator·§22 Delegate 대부분 ABSENT.
> - **§3.4 Authorization·Security**: `acl_permission`=**allow-only**(deny 표현 없음)·SoD Hook ABSENT·Conflict-of-interest Hook ABSENT·Break-glass 부재·Tenant Isolation Guard=REAL(`index.php:600` 무조건 덮어쓰기·단 strict 기본 OFF `:585`).
>
> ### ★이 블록에서 유일하게 "실 delegation 인접"인 코드 (미리 답을 아는 축)
> | 원문 요구 | 5-3-3-4 실측 |
> |---|---|
> | Delegation / DOA / 위임 상한 | 🔴**유일 실재 = `acl_permission` 위임 상한 자기정합 검증** — `TeamPermissions::putMemberPermissions`(`:639`)가 `actionsCover:194`로 **manager가 자기 assignable에 없는 action을 하위에 위임 시도 시 `DELEGATION_EXCEEDED` 403**(`:645`). ★**단 이것은 "위임 가능 상한 검증"이지 §9 Delegation Definition/§10 Version/§39 Snapshot/§30 Resolution 아님** — Delegator→Delegate 엔티티·기간·수락·승인·Cycle 전무. `LEGACY_ADAPTER`(자산은 실재·Delegation 도메인 아님) |
> | Substitute/Proxy/Backup/Acting Approver | ★grep 재검증 필요. 승인 4경로(mapping/catalog/action_request/admin_growth)에 **대리 승인자 지정 개념 0**(승인자=진입게이트 통과자). Acting Manager=Manager Resolver 부재로 불가 |
> | Vacation/Out-of-office/Emergency Delegate | ★부재 예상. `sharedCalendarEvents`(`GlobalDataContext`)=**콘텐츠 캘린더**(OOO 아님·오탐). HRIS/Leave 엔티티 0 |
> | 재위임 Cycle/Depth 검증 | 인접 선례=그래프 순환검출 `PM/Dependencies.php:79-100`(DFS·tenant 매홉)·`AdminMenu::wouldCycle:540-555`(조상 walk·depth<100)·`PM/Gantt` Kahn — **도메인 상이(PM 태스크/메뉴)·Delegation Chain 아님**. `KEEP_SEPARATE_WITH_REASON` |
> | evidence / immutable_hash / Snapshot | 정본 = `SecurityAudit::verify():56-68`(preimage ts 저장·hash_equals·prev_hash·tenant). 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) |
> | Effective dating / Period | `kr_fee_rule.effective_from`(수수료 open-interval·질의계층만 부재)·`valid_to`/`effective_to` grep 0. Delegation 엔티티엔 없음 |
> | Acting Position / Position Vacancy | Position 엔티티 부재 → ABSENT |
> | Reconciliation(§49) vs HRIS/Calendar/ERP | HRIS/ERP/Calendar 위임 소스 **존재조차 안 함**(ABSENT)·Tenant 마스터 부재로 canonical 기준 자체 없음 |
>
> ### ★grep 오염 레지스트리 (이 블록에서 특히 걸릴 것)
> `delegation`→**acl 위임상한**(`TeamPermissions:639`·`actionsCover:194`)·**AI agent 위임**(무관) · `proxy`→네트워크/프록시 무관 · `acting`→**tr`acting`/attr`acting`/ex`tracting`** 부분문자열 오탐(단어경계 필수) · `vacation`→부재 · `calendar`→**콘텐츠 캘린더 `sharedCalendarEvents`/`DEMO_CALENDAR_EVENTS`**(OOO 아님) · `hris`→**hig`hRis`k**(hash·highRisk) · `substitute`→부재 · `backup`→**DB 백업/`.bak` 파일**(승인자 아님) · `reassign`→Task 재할당(별 도메인·이번 블록 미구현 대상) · `revoke`→**토큰/자격 폐기**(`AgencyPortal revoked_at`·API키 revoke — Delegation revoke 아님) · `depth`→**루프 지역변수/그래프 깊이캡** · `cycle`→**SQL `ON CONFLICT`/빌링 주기/`lifecycle`** · `emergency`→부재.
> 🔴**`limit`/`scope` 단독 grep 무의미** → `delegation_scope`/`delegated_ceiling`/`redelegation`/`delegate_id` 복합어로만.
>
> ### ★§65 산출문서 = per-entity (5-3-3-4 §79와 동형·통합형 아님)
> `docs/segmentation/DSAR_APPROVAL_DELEGATION_*` **약 60편** + ADR `ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md` + PM 3편. 실측: `DSAR_APPROVAL_DELEGATION_*` **현재 0편**·`*DELEGATION*` 세그 문서 **0편**. **매 블록 §산출문서 조항을 원문에서 직접 읽어라**(관성 금지).
>
> ### 이 세션의 작업 규율 (11회차 계승)
> **파이프라인** = ⓐ스펙 선영속 → ⓑ전수조사(**능력 기반**) → ⓒ전사 → ⓓADR → ⓔ인용검증 → ⓕ커버리지(**측정기 산출·손으로 쓰기 금지**: `node tools/measure_06a_coverage.mjs`·`measure_spec_denominator.mjs`)
> **핵심 규칙**: ①부재증명은 이름 아닌 **능력**으로 ②존재증명도 능력으로(판독자·검증기 있는가) ③**주석·docblock·인계서·이 헤더를 근거로 삼지 말고 정의부를 Read** ④**요구 날조 0**(원문에 없으면 전사 금지) ⑤**역산 금지**(분모=원문 항목명) ⑥**"중복 없음"≠"기능 충족"** ⑦**우연한 부재/일치를 준수로 계산 금지** ⑧**"열거에 없다"는 ENUM/CHECK 실재 확인 후** ⑨개수는 분모가 아니다 ⑩어휘를 규율에만 추가하면 측정기가 못 세어 증발 — VOCAB과 함께 갱신 ⑪**측정기가 육안분모를 5-3-3-4에서만 8번 정정**했다 → 분모는 반드시 측정기로.
>
> **코드 변경 0** — `backend/src`·`frontend/src`는 Read/Grep 전용. 실 구현/결함 수정은 **별도 승인세션**. Delegation은 §3 선행조건(Authority/Chain/Org/Legal Entity/Position) 신설이 **선행**돼야 실구현 가능 → 본 블록은 **비파괴 설계 명세**.

---

# GeniegoROI Enterprise Engineering Handbook

## EPIC 06-A-01

# Rebate Delegation Foundation Governance

Version 1.0

---

# 0. 작업 목적

앞 단계에서 구축한 다음 기반 위에 Enterprise급 **Rebate Delegation Foundation Governance**를 구축하라.

* Canonical Approval Foundation
* Approval Workflow Definition
* Approval Chain Definition
* Organization Hierarchy
* Reporting Line
* Manager Resolution
* Approval Authority Matrix Foundation
* Approval Authority Resolution
* Approval Authority Snapshot
* Approval Authority Reconciliation

이번 단계의 핵심 목적은 승인 권한 또는 승인 업무를 다른 Actor에게 위임할 때 원본 권한, 위임 범위, 기간, 사유, 법인 경계, 금액 한도, 승인 단계, 위험 수준 및 감사 근거를 보존하면서 안전하게 해석할 수 있는 Canonical Delegation Foundation을 완성하는 것이다.

이번 단계에서는 다음을 구축한다.

* Delegation Registry
* Delegation Definition
* Delegation Version
* Delegation Type
* Delegation Status
* Delegation Source
* Delegation Scope
* Delegation Authority Scope
* Delegation Resource Scope
* Delegation Action Scope
* Delegation Organization Scope
* Delegation Legal Entity Scope
* Delegation Geographic Scope
* Delegation Monetary Scope
* Delegation Currency Scope
* Delegation Period
* Delegator
* Delegate
* Substitute Approver
* Acting Approver
* Acting Manager
* Emergency Delegate
* Out-of-office Delegate
* Vacation Delegate
* Temporary Delegate
* Scheduled Delegate
* Partial Delegate
* Full Delegate
* Chain-specific Delegate
* Level-specific Delegate
* Authority-specific Delegate
* Task-specific Delegate
* Delegation Eligibility
* Delegation Acceptance
* Delegation Activation
* Delegation Suspension
* Delegation Revocation
* Delegation Expiration
* Delegation Resolution
* Delegation Conflict
* Delegation Cycle Detection
* Delegation Depth Governance
* Delegation Snapshot
* Delegation Simulation
* Delegation Reconciliation
* Delegation Evidence
* Delegation Audit
* Delegation Static Lint
* Delegation Runtime Guard
* Delegation API
* Delegation Cache
* Delegation Index
* Delegation Migration
* Delegation Documentation

이번 단계에서는 실제 Approval Task Assignment Queue, Workload Balancing, Claim, Release, Reassign 및 Auto Assignment Engine을 상세 구현하지 않는다.

해당 기능은 다음 단계인 **EPIC 06-A-02 — Approval Assignment Engine**에서 구현한다.

이번 단계는 Delegation의 정의, 검증, 버전, 해석, Snapshot, Simulation 및 Runtime Governance를 완성한다.

다음 질문에 정확하게 답할 수 있어야 한다.

* 누가 누구에게 승인 권한을 위임했는가
* 위임은 언제 시작되고 언제 종료되는가
* 위임 사유는 무엇인가
* 위임이 승인되었는가
* Delegate가 위임을 수락했는가
* 위임이 현재 활성 상태인가
* 위임이 특정 Approval Domain에만 적용되는가
* 특정 Rebate Program에만 적용되는가
* 특정 Legal Entity에만 적용되는가
* 특정 Organization에만 적용되는가
* 특정 Country 또는 Region에만 적용되는가
* 특정 Action에만 적용되는가
* Approve는 위임되지만 Reject는 위임되지 않는가
* Payment Release 권한은 위임에서 제외되는가
* 원본 Actor의 Monetary Authority보다 더 큰 한도를 Delegate가 사용할 수 있는가
* Delegate 자신의 Authority와 위임받은 Authority가 충돌하는가
* 위임된 Authority가 누적 한도에 포함되는가
* Delegator와 Delegate 중 누구의 Authority Utilization으로 계산되는가
* 한 Actor가 여러 Delegation을 동시에 보유할 수 있는가
* Delegation Chain이 순환하는가
* A가 B에게, B가 C에게 재위임할 수 있는가
* 재위임 깊이는 몇 단계까지 허용되는가
* Cross-Tenant Delegation이 가능한가
* Cross-Legal-Entity Delegation이 가능한가
* Self-delegation이 가능한가
* 동일 Task에 복수 Delegate가 존재할 때 누가 우선하는가
* Vacation Delegation과 Emergency Delegation이 충돌할 때 무엇이 우선하는가
* Delegator가 Authority를 상실하면 Delegation은 어떻게 되는가
* Delegate가 퇴사하거나 정지되면 어떻게 되는가
* Delegation 기간 중 Authority Matrix가 변경되면 어떻게 되는가
* 기존 Assigned Task가 Delegation 시작 후 자동 이동하는가
* Delegation 종료 시 미완료 Task가 원복되는가
* Decision 시점에 Delegation이 만료되었으면 승인할 수 있는가
* 과거 Decision 당시 어떤 Delegation Version을 사용했는가
* Delegation을 Simulation할 수 있는가
* Delegation Drift를 Reconciliation할 수 있는가
* Delegation을 감사 증거로 재현할 수 있는가

---

# 1. 구현 범위

이번 블록에서 다음을 구현하라.

1. Delegation Registry
2. Delegation Type
3. Delegation Definition
4. Delegation Version
5. Delegation Scope
6. Delegation Authority Binding
7. Delegation Resource Binding
8. Delegation Action Binding
9. Delegation Organization Binding
10. Delegation Legal Entity Binding
11. Delegation Geographic Binding
12. Delegation Monetary Binding
13. Delegation Currency Binding
14. Delegation Period
15. Delegator Binding
16. Delegate Binding
17. Substitute Approver
18. Acting Approver
19. Acting Manager
20. Temporary Delegation
21. Scheduled Delegation
22. Vacation Delegation
23. Out-of-office Delegation
24. Emergency Delegation
25. Partial Delegation
26. Full Delegation
27. Delegation Acceptance
28. Delegation Approval
29. Delegation Activation
30. Delegation Suspension
31. Delegation Revocation
32. Delegation Expiration
33. Delegation Eligibility
34. Delegation Candidate
35. Delegation Resolution
36. Delegation Priority
37. Delegation Conflict
38. Delegation Cycle Detection
39. Delegation Depth Governance
40. Re-delegation Governance
41. Delegation Snapshot
42. Delegation Simulation
43. Delegation Reconciliation
44. Static Lint
45. Runtime Guard
46. Evidence
47. Audit
48. API
49. Cache
50. Index
51. Performance
52. Migration
53. Existing Implementation Audit
54. Duplicate Implementation Audit
55. ADR
56. PM Change History
57. Repeat Problem History
58. Agent Execution History

이번 블록에서 다음은 상세 구현하지 않는다.

* Approval Assignment Queue
* Workload Capacity Engine
* Skill-based Assignment
* Claim
* Release
* Reassign
* Queue Prioritization
* Sequential Approval Execution
* Parallel Approval Execution
* Committee Voting
* Quorum
* SLA
* Escalation
* Notification Delivery
* Final Decision State Machine
* Production Certification

---

# 2. 실행 역할

너는 다음 역할을 동시에 수행한다.

* Enterprise Delegation Architect
* Approval Governance Architect
* Delegation of Authority Architect
* Temporary Authority Architect
* Acting Authority Architect
* Out-of-office Governance 책임자
* Vacation Delegation 책임자
* Emergency Delegation 책임자
* Substitute Approver 책임자
* Delegation Eligibility 책임자
* Delegation Resolution 책임자
* Delegation Conflict 책임자
* Delegation Cycle Detection 책임자
* Re-delegation Governance 책임자
* Multi-tenant Isolation 책임자
* Legal Entity Boundary 책임자
* Monetary Authority Boundary 책임자
* Delegation Snapshot 책임자
* Delegation Simulation 책임자
* Delegation Reconciliation 책임자
* Evidence·Audit·Lineage 책임자
* Existing Implementation Consolidation 책임자
* Regression Protection 책임자
* ADR·PM·Agent History 책임자

---

# 3. 선행조건

작업 시작 전 다음 구현을 확인하라.

## 3.1 Approval Foundation

* Approval Request
* Approval Case
* Approval Item
* Approval Requirement
* Approval Workflow
* Approval Chain
* Approval Chain Version
* Approval Chain Stage
* Approval Chain Level
* Approval Chain Resolution
* Approval Chain Resolution Level
* Approval Chain Resolved Participant
* Approval Chain Snapshot

## 3.2 Authority Foundation

* Approval Authority Registry
* Approval Authority Type
* Approval Authority Domain
* Approval Authority Definition
* Approval Authority Version
* Approval Authority Matrix
* Approval Authority Matrix Version
* Approval Authority Matrix Entry
* Approval Authority Binding
* Approval Authority Candidate
* Approval Authority Resolution
* Approval Authority Snapshot
* Approval Authority Conflict
* Approval Authority Reconciliation

## 3.3 Identity·Organization Foundation

* Canonical Identity
* Subject Registry
* Employment Record
* Role Registry
* Role Assignment
* Position Registry
* Position Incumbency
* Organization Unit
* Organization Hierarchy
* Reporting Line
* Manager Relationship
* Legal Entity
* Country
* Region
* Cost Center
* Profit Center
* Budget
* Program
* Project
* Resource Registry

## 3.4 Authorization·Security Foundation

* Authorization Policy
* Permission
* Entitlement
* Scope Binding
* Actor Authorization Snapshot
* Segregation of Duties Hook
* Conflict-of-interest Hook
* Security Suspension
* Break-glass Reference
* Tenant Isolation Guard

---

# 4. 기존 Delegation 구현 전수 조사

Repository 전체를 검색하여 다음을 조사하라.

* Delegation Table
* Delegation Entity
* Approval Delegate
* Substitute Approver
* Proxy Approver
* Backup Approver
* Alternate Approver
* Acting Manager
* Acting Director
* Acting Executive
* Vacation Approver
* Out-of-office Approver
* Temporary Approver
* Emergency Approver
* Delegated Authority
* Delegation of Authority
* DOA Delegation
* Proxy Authorization
* Temporary Role Assignment
* Acting Role Assignment
* Substitute Position Assignment
* Forward Approval
* Task Reassignment
* Approval Reassignment
* Email-based Delegate Mapping
* User Preference Delegate
* Calendar-based Out-of-office
* HRIS Leave Delegate
* Workflow-specific Delegate
* BPMN Delegate
* Hardcoded Substitute
* JSON Delegate Configuration
* Tenant-specific Delegate Setting
* Spreadsheet Delegate List
* ERP Delegate Mapping
* Microsoft 365 Out-of-office Integration
* Google Calendar Out-of-office Integration
* Slack Status Integration
* Teams Status Integration
* Delegation Audit
* Delegation History
* Delegation Snapshot
* Delegation API
* Delegation Cache
* Delegation Batch
* Git History
* Migration History
* Production Logs
* Existing Tests

동일 목적 구현이 존재하면 새로운 중복 모델을 만들지 말고 Canonical Delegation Domain에 통합하라.

---

# 5. 핵심 원칙

## 5.1 Authority와 Delegation을 분리한다

Authority는 원본 Actor가 가진 승인 권한이다.

Delegation은 해당 Authority 또는 Approval Responsibility의 제한적이고 기간이 있는 이전 규칙이다.

Delegation이 새로운 영구 Authority를 생성하는 것으로 구현하지 마라.

---

## 5.2 Delegation은 원본 Authority를 초과할 수 없다

Delegate는 Delegator가 실제로 보유하고 있는 Scope, Action, Amount, Currency, Legal Entity 및 Effective Period 범위 안에서만 권한을 행사할 수 있다.

---

## 5.3 Delegation은 Effective-dated다

모든 Delegation에는 시작 시점과 종료 시점이 있어야 한다.

영구 Delegation처럼 보이는 경우에도 Review Date 또는 Governance Review Cycle을 요구하라.

---

## 5.4 Cross-Tenant Delegation을 금지한다

Delegator와 Delegate는 동일 Tenant에 속해야 한다.

Platform Operator 등 특별한 시스템 Actor는 별도의 Mandatory Governance Policy를 통해서만 허용한다.

---

## 5.5 Cross-Legal-Entity Delegation은 명시적으로 검증한다

Delegator가 Legal Entity A의 Authority를 갖고 있어도 Delegate가 Legal Entity A에서 승인할 수 있는 Identity·Employment·Role·Authorization 조건을 충족하지 않으면 위임을 허용하지 마라.

---

## 5.6 Delegation은 최소 권한 원칙을 따른다

기본값은 Full Delegation이 아니라 Partial Delegation이다.

다음을 명시적으로 제한할 수 있어야 한다.

* Domain
* Authority Type
* Action
* Resource
* Organization
* Legal Entity
* Geography
* Amount
* Currency
* Approval Chain
* Stage
* Level
* Period

---

## 5.7 재위임은 기본 금지다

Delegate가 다시 제3자에게 재위임할 수 있는지 명시적으로 정의한다.

기본값은 금지다.

허용 시 최대 깊이, Scope 축소, 원본 승인 및 감사 근거를 요구한다.

---

## 5.8 Delegation Cycle을 금지한다

A → B → C → A 형태의 순환 위임을 차단하라.

---

## 5.9 Self-delegation을 금지한다

Delegator와 Delegate가 동일 Subject이면 차단한다.

---

## 5.10 Delegation과 Task Reassignment를 분리한다

Delegation은 권한과 책임의 자격을 정의한다.

Task Reassignment는 특정 Task의 실제 담당자를 바꾸는 실행 행위다.

이번 단계에서는 Task Reassignment 자체를 구현하지 않는다.

---

## 5.11 Decision 시점에 재검증한다

Task가 과거에 Delegate에게 할당되었더라도 Decision 시점에 Delegation이 만료, 취소, 정지 또는 Scope 변경되었다면 승인할 수 없어야 한다.

---

## 5.12 Snapshot을 보존한다

Task Assignment, Claim, Decision Attempt 및 Decision Commit 시점의 Delegation Version을 Snapshot으로 저장한다.

---

# 6. Canonical Entity

기존 동등 Entity가 없을 경우 최소 다음을 구축하라.

* `APPROVAL_DELEGATION_REGISTRY`
* `APPROVAL_DELEGATION_TYPE`
* `APPROVAL_DELEGATION_DEFINITION`
* `APPROVAL_DELEGATION_VERSION`
* `APPROVAL_DELEGATION_SCOPE`
* `APPROVAL_DELEGATION_AUTHORITY_BINDING`
* `APPROVAL_DELEGATION_RESOURCE_BINDING`
* `APPROVAL_DELEGATION_ACTION_BINDING`
* `APPROVAL_DELEGATION_ORGANIZATION_BINDING`
* `APPROVAL_DELEGATION_LEGAL_ENTITY_BINDING`
* `APPROVAL_DELEGATION_GEOGRAPHIC_BINDING`
* `APPROVAL_DELEGATION_MONETARY_BINDING`
* `APPROVAL_DELEGATION_CURRENCY_BINDING`
* `APPROVAL_DELEGATION_PERIOD`
* `APPROVAL_DELEGATOR_BINDING`
* `APPROVAL_DELEGATE_BINDING`
* `APPROVAL_DELEGATION_ACCEPTANCE`
* `APPROVAL_DELEGATION_APPROVAL`
* `APPROVAL_DELEGATION_ELIGIBILITY_PROFILE`
* `APPROVAL_DELEGATION_CANDIDATE`
* `APPROVAL_DELEGATION_RESOLUTION`
* `APPROVAL_DELEGATION_RESOLUTION_RESULT`
* `APPROVAL_DELEGATION_CONFLICT`
* `APPROVAL_DELEGATION_CHAIN`
* `APPROVAL_DELEGATION_SNAPSHOT`
* `APPROVAL_DELEGATION_SIMULATION`
* `APPROVAL_DELEGATION_RECONCILIATION`
* `APPROVAL_DELEGATION_EVIDENCE`
* `APPROVAL_DELEGATION_AUDIT_EVENT`

---

# 7. Delegation Registry

`APPROVAL_DELEGATION_REGISTRY`

필수 필드:

* approval_delegation_registry_id
* tenant_id
* registry_code
* registry_name
* registry_type
* authoritative_source
* supported delegation types
* authority delegation support
* task responsibility delegation support
* monetary delegation support
* re-delegation support
* emergency delegation support
* out-of-office integration support
* legal entity restriction support
* multi-currency support
* acceptance required default
* approval required default
* owner
* active_version
* valid_from
* valid_to
* status
* evidence

Registry Type:

* PLATFORM
* TENANT
* LEGAL_ENTITY
* ORGANIZATION
* FINANCE
* REBATE
* CLAIM
* SETTLEMENT
* PAYMENT
* CONTRACT
* HRIS
* ERP
* WORKFLOW
* CUSTOM

---

# 8. Delegation Type

`APPROVAL_DELEGATION_TYPE`

지원 Type:

* TEMPORARY
* SCHEDULED
* VACATION
* OUT_OF_OFFICE
* ACTING_MANAGER
* ACTING_POSITION
* SUBSTITUTE_APPROVER
* BACKUP_APPROVER
* EMERGENCY
* MEDICAL_LEAVE
* PARENTAL_LEAVE
* BUSINESS_TRAVEL
* SYSTEM_UNAVAILABLE
* WORKLOAD_OVERFLOW_REFERENCE
* LEGAL_ENTITY_COVERAGE
* FUNCTIONAL_COVERAGE
* PROGRAM_SPECIFIC
* TASK_SPECIFIC_REFERENCE
* FULL
* PARTIAL
* PERMANENT_WITH_REVIEW
* CUSTOM

필수 필드:

* approval_delegation_type_id
* type_code
* type_name
* category
* default duration policy
* acceptance required
* approval required
* re-delegation allowed
* maximum delegation depth
* monetary delegation allowed
* emergency override reference
* review cycle required
* status
* evidence

---

# 9. Delegation Definition

`APPROVAL_DELEGATION_DEFINITION`

필수 필드:

* approval_delegation_definition_id
* approval_delegation_registry_id
* delegation_code
* delegation_name
* delegation_description
* delegation_type_id
* delegator_id
* delegate_id
* delegation effect
* authority transfer mode
* responsibility transfer mode
* acceptance policy
* approval policy
* activation policy
* revocation policy
* expiration policy
* re-delegation policy
* maximum depth
* scope reference
* period reference
* source
* source record id
* owner
* active_version
* valid_from
* valid_to
* status
* evidence

Delegation Effect:

* ALLOW
* RESTRICT
* SUBSTITUTE
* ACTING
* BACKUP
* EMERGENCY
* DENY
* CUSTOM

Authority Transfer Mode:

* NO_AUTHORITY_TRANSFER
* ELIGIBILITY_ONLY
* LIMITED_AUTHORITY_TRANSFER
* FULL_WITHIN_ORIGINAL_SCOPE
* CHAIN_LEVEL_SPECIFIC
* ACTION_SPECIFIC
* RESOURCE_SPECIFIC
* MONETARY_LIMITED
* CUSTOM

Responsibility Transfer Mode:

* NONE
* NEW_TASKS_ONLY
* UNCLAIMED_TASKS
* ACTIVE_TASKS_REFERENCE
* FUTURE_STAGES
* ALL_ELIGIBLE_REFERENCE
* CUSTOM

---

# 10. Delegation Version

`APPROVAL_DELEGATION_VERSION`

필수 필드:

* approval_delegation_version_id
* approval_delegation_definition_id
* version_number
* previous_version_id
* version_type
* change_summary
* delegator_snapshot
* delegate_snapshot
* authority scope snapshot
* organization scope snapshot
* legal entity scope snapshot
* resource scope snapshot
* action scope snapshot
* monetary scope snapshot
* currency scope snapshot
* period snapshot
* re-delegation snapshot
* acceptance snapshot
* approval snapshot
* affected active cases
* affected active tasks
* effective_from
* effective_to
* created_by
* reviewed_by
* approved_by
* activated_at
* immutable_hash
* migration policy
* status
* evidence

Version Type:

* INITIAL
* PERIOD_CHANGE
* DELEGATE_CHANGE
* SCOPE_CHANGE
* AUTHORITY_CHANGE
* ACTION_CHANGE
* RESOURCE_CHANGE
* ORGANIZATION_CHANGE
* LEGAL_ENTITY_CHANGE
* MONETARY_LIMIT_CHANGE
* CURRENCY_CHANGE
* REDELEGATION_CHANGE
* ACCEPTANCE_CHANGE
* APPROVAL_CHANGE
* SUSPENSION
* REVOCATION
* EMERGENCY_ACTIVATION
* CORRECTION
* MIGRATION

상태:

* DRAFT
* VALIDATION_PENDING
* VALIDATION_FAILED
* ACCEPTANCE_PENDING
* APPROVAL_PENDING
* APPROVED
* SCHEDULED
* ACTIVE
* ACTIVE_WITH_WARNINGS
* SUSPENDED
* REVOKED
* EXPIRED
* SUPERSEDED
* RETIRED
* ARCHIVED
* BLOCKED

---

# 11. Delegation Scope

`APPROVAL_DELEGATION_SCOPE`

필수 필드:

* approval_delegation_scope_id
* approval_delegation_version_id
* scope_mode
* include all authorities 여부
* include all actions 여부
* include all resources 여부
* include all organizations 여부
* include all legal entities 여부
* include all geographies 여부
* include all currencies 여부
* include all chains 여부
* include all stages 여부
* include all levels 여부
* exclusion policy
* valid_from
* valid_to
* status
* evidence

Scope Mode:

* FULL_WITHIN_ORIGINAL_AUTHORITY
* PARTIAL
* AUTHORITY_SPECIFIC
* DOMAIN_SPECIFIC
* RESOURCE_SPECIFIC
* ACTION_SPECIFIC
* ORGANIZATION_SPECIFIC
* LEGAL_ENTITY_SPECIFIC
* GEOGRAPHIC_SPECIFIC
* MONETARY_SPECIFIC
* CHAIN_SPECIFIC
* LEVEL_SPECIFIC
* TASK_SPECIFIC_REFERENCE
* HYBRID
* CUSTOM

---

# 12. Delegation Authority Binding

`APPROVAL_DELEGATION_AUTHORITY_BINDING`

필수 필드:

* approval_delegation_authority_binding_id
* approval_delegation_version_id
* approval_authority_definition_id
* approval_authority_version_id
* authority type
* authority domain
* include 여부
* maximum delegated effect
* original authority validation policy
* utilization attribution policy
* revalidation policy
* valid_from
* valid_to
* status
* evidence

위임되는 Authority는 반드시 Delegator의 Active Authority Resolution으로 검증하라.

---

# 13. Delegation Resource Binding

`APPROVAL_DELEGATION_RESOURCE_BINDING`

필수 필드:

* approval_delegation_resource_binding_id
* approval_delegation_version_id
* resource_type
* resource_id
* include descendants 여부
* program_id
* project_id
* brand_id
* partner_id
* customer_id
* cost_center_id
* profit_center_id
* budget_id
* exclusion references
* valid_from
* valid_to
* status
* evidence

---

# 14. Delegation Action Binding

`APPROVAL_DELEGATION_ACTION_BINDING`

지원 Action:

* REVIEW
* APPROVE
* REJECT
* RETURN
* REQUEST_CHANGES
* ACTIVATE
* MODIFY
* INCREASE
* DECREASE
* EXTEND
* TERMINATE
* CANCEL
* REOPEN
* SETTLE
* PAY
* PAYOUT
* REFUND
* CREDIT
* WRITE_OFF
* COMMIT
* SIGN
* RELEASE
* OVERRIDE_REFERENCE
* CUSTOM

필수 필드:

* approval_delegation_action_binding_id
* approval_delegation_version_id
* action_type
* include 여부
* resource state restriction
* decision type restriction
* mandatory additional approval
* prohibited transition
* valid_from
* valid_to
* status
* evidence

Approve 위임이 Pay, Release, Sign 또는 Override 권한까지 포함한다고 추론하지 마라.

---

# 15. Delegation Organization Binding

`APPROVAL_DELEGATION_ORGANIZATION_BINDING`

필수 필드:

* approval_delegation_organization_binding_id
* approval_delegation_version_id
* organization_unit_id
* include descendants 여부
* maximum descendant depth
* required organization relationship
* exclude organization references
* valid_from
* valid_to
* status
* evidence

---

# 16. Delegation Legal Entity Binding

`APPROVAL_DELEGATION_LEGAL_ENTITY_BINDING`

필수 필드:

* approval_delegation_legal_entity_binding_id
* approval_delegation_version_id
* legal_entity_id
* authority responsibility type
* delegate eligibility required
* cross legal entity allowed 여부
* permitted destination legal entities
* prohibited destination legal entities
* intercompany restriction
* valid_from
* valid_to
* status
* evidence

Cross-Legal-Entity Delegation은 기본 금지다.

---

# 17. Delegation Geographic Binding

`APPROVAL_DELEGATION_GEOGRAPHIC_BINDING`

필수 필드:

* approval_delegation_geographic_binding_id
* approval_delegation_version_id
* geography_type
* region_id
* country_code
* territory reference
* include descendants 여부
* exclusions
* cross-border 여부
* valid_from
* valid_to
* status
* evidence

---

# 18. Delegation Monetary Binding

`APPROVAL_DELEGATION_MONETARY_BINDING`

필수 필드:

* approval_delegation_monetary_binding_id
* approval_delegation_version_id
* amount basis
* lower bound
* lower inclusive
* upper bound
* upper inclusive
* original authority ceiling
* delegated ceiling
* delegation reduction percentage
* cumulative limit policy
* utilization attribution policy
* period limit reference
* valid_from
* valid_to
* status
* evidence

Delegated Ceiling은 Original Authority Ceiling을 초과할 수 없다.

---

# 19. Delegation Currency Binding

`APPROVAL_DELEGATION_CURRENCY_BINDING`

필수 필드:

* approval_delegation_currency_binding_id
* approval_delegation_version_id
* allowed currencies
* prohibited currencies
* base currency
* conversion policy
* fx rate policy
* missing rate policy
* rounding policy
* valid_from
* valid_to
* status
* evidence

---

# 20. Delegation Period

`APPROVAL_DELEGATION_PERIOD`

필수 필드:

* approval_delegation_period_id
* approval_delegation_version_id
* start_at
* end_at
* timezone
* all-day 여부
* recurrence policy
* business calendar reference
* holiday policy
* early activation allowed 여부
* automatic activation 여부
* automatic expiration 여부
* grace period
* review date
* maximum duration policy
* valid_from
* valid_to
* status
* evidence

종료일 없는 Delegation은 `PERMANENT_WITH_REVIEW` 유형에서만 허용하며 Review Date를 필수로 요구하라.

---

# 21. Delegator Binding

`APPROVAL_DELEGATOR_BINDING`

필수 필드:

* approval_delegator_binding_id
* approval_delegation_version_id
* delegator_subject_id
* employment reference
* role assignment reference
* position reference
* organization reference
* legal entity reference
* original authority references
* original authority resolution references
* delegator eligibility result
* status
* evidence

---

# 22. Delegate Binding

`APPROVAL_DELEGATE_BINDING`

필수 필드:

* approval_delegate_binding_id
* approval_delegation_version_id
* delegate_subject_id
* employment reference
* role assignment reference
* position reference
* organization reference
* legal entity reference
* delegate eligibility profile
* acceptance required 여부
* accepted 여부
* acceptance reference
* conflict result
* status
* evidence

---

# 23. Delegation Acceptance

`APPROVAL_DELEGATION_ACCEPTANCE`

필수 필드:

* approval_delegation_acceptance_id
* approval_delegation_version_id
* delegate_subject_id
* acceptance status
* accepted_at
* declined_at
* reason
* scope acknowledged
* monetary limit acknowledged
* legal entity acknowledged
* re-delegation policy acknowledged
* terms version
* immutable hash
* status
* evidence

Acceptance Status:

* NOT_REQUIRED
* PENDING
* ACCEPTED
* DECLINED
* EXPIRED
* REVOKED

Delegate가 Decline한 Delegation을 활성화하지 마라.

---

# 24. Delegation Approval

`APPROVAL_DELEGATION_APPROVAL`

필수 필드:

* approval_delegation_approval_id
* approval_delegation_version_id
* approval policy
* approver subject
* approver role
* approver authority snapshot
* approval decision
* approved scope
* approved monetary limit
* approved period
* approved_at
* immutable hash
* status
* evidence

고액, Payment, Payout, Write-off, Contract, Executive 및 Emergency Delegation은 별도 승인 정책을 적용하라.

---

# 25. Delegation Eligibility Profile

`APPROVAL_DELEGATION_ELIGIBILITY_PROFILE`

필수 필드:

* approval_delegation_eligibility_profile_id
* allowed delegator subject types
* allowed delegate subject types
* required identity state
* required employment state
* required role state
* required position state
* tenant policy
* legal entity policy
* organization policy
* geographic policy
* minimum job level
* maximum reporting distance
* same manager requirement
* same function requirement
* certification requirement
* training requirement
* security suspension policy
* leave policy
* termination policy
* self delegation policy
* conflict-of-interest hook
* SoD hook
* re-delegation eligibility
* valid_from
* valid_to
* status
* evidence

---

# 26. 기본 Delegator Eligibility

Delegator는 다음을 충족해야 한다.

* Active Canonical Identity
* Active Employment 또는 허용된 External Actor
* Active Role 또는 Position
* Active Original Authority
* 동일 Tenant
* 허용된 Legal Entity
* 허용된 Organization
* 허용된 Delegation Type
* Delegation 대상 Action 보유
* Delegation 대상 Resource Scope 보유
* Delegation 대상 Monetary Authority 보유
* Security Suspension 아님
* Terminated 아님
* Delegation 금지 정책 없음
* SoD Hook 통과
* Conflict-of-interest Hook 통과
* Runtime Authorization 통과

---

# 27. 기본 Delegate Eligibility

Delegate는 다음을 충족해야 한다.

* Active Canonical Identity
* Active Employment 또는 허용된 External Actor
* 동일 Tenant
* Active Role 또는 Position
* 허용된 Legal Entity
* 허용된 Organization 또는 Function
* 최소 Job Level 충족
* 필수 Certification 충족
* Security Suspension 아님
* Terminated 아님
* Delegation 수락 완료
* Self-delegation 아님
* SoD Hook 통과
* Conflict-of-interest Hook 통과
* Runtime Authorization 통과

---

# 28. Delegation Candidate

`APPROVAL_DELEGATION_CANDIDATE`

필수 필드:

* approval_delegation_candidate_id
* approval_request_id
* approval_case_id
* approval_item_id
* approval_requirement_id
* approval_chain_resolution_id
* approval_chain_resolution_level_id
* original participant subject id
* delegator subject id
* delegate subject id
* delegation definition id
* delegation version id
* delegation type
* authority definition id
* authority version id
* matrix entry id
* action
* resource
* organization
* legal entity
* geography
* original amount
* original currency
* delegated amount ceiling
* delegated currency scope
* period match
* scope match
* authority match
* eligibility result
* acceptance result
* approval result
* conflict result
* cycle result
* depth result
* priority
* exclusion reasons
* proposed 여부
* status
* evidence

---

# 29. Candidate Exclusion Reason

지원 Exclusion:

* DELEGATOR_INACTIVE
* DELEGATE_INACTIVE
* DELEGATOR_AUTHORITY_MISSING
* DELEGATOR_AUTHORITY_EXPIRED
* DELEGATE_NOT_ELIGIBLE
* ACCEPTANCE_PENDING
* ACCEPTANCE_DECLINED
* APPROVAL_PENDING
* APPROVAL_REJECTED
* DELEGATION_NOT_STARTED
* DELEGATION_EXPIRED
* DELEGATION_SUSPENDED
* DELEGATION_REVOKED
* WRONG_TENANT
* WRONG_LEGAL_ENTITY
* WRONG_ORGANIZATION
* WRONG_GEOGRAPHY
* WRONG_RESOURCE
* WRONG_ACTION
* WRONG_AUTHORITY_DOMAIN
* WRONG_AUTHORITY_TYPE
* WRONG_CURRENCY
* AMOUNT_ABOVE_DELEGATED_LIMIT
* PERIOD_LIMIT_EXHAUSTED
* SELF_DELEGATION
* REDELEGATION_NOT_ALLOWED
* MAXIMUM_DEPTH_EXCEEDED
* DELEGATION_CYCLE
* SECURITY_BLOCKED
* SOD_FAILED
* CONFLICT_OF_INTEREST
* TASK_SPECIFIC_MISMATCH
* CHAIN_SPECIFIC_MISMATCH
* LEVEL_SPECIFIC_MISMATCH
* MANUAL_EXCLUSION
* OTHER

---

# 30. Delegation Resolution

`APPROVAL_DELEGATION_RESOLUTION`

필수 필드:

* approval_delegation_resolution_id
* approval_request_id
* approval_request_version_id
* approval_case_id
* approval_item_id
* approval_requirement_id
* approval_chain_resolution_id
* approval_chain_resolution_level_id
* original participant subject id
* delegator subject id
* delegate subject id
* delegation definition id
* delegation version id
* delegation type
* delegation priority
* authority definition id
* authority version id
* matrix entry id
* action
* resource type
* resource id
* organization id
* legal entity id
* region
* country
* original amount
* original currency
* delegated ceiling
* delegated currency scope
* original authority resolution
* delegate own authority resolution
* utilization attribution
* acceptance result
* approval result
* eligibility result
* conflict result
* cycle result
* depth result
* effective result
* winning delegation
* resolution hash
* resolved_at
* status
* evidence

---

# 31. Delegation Resolution Result

`APPROVAL_DELEGATION_RESOLUTION_RESULT`

지원 결과:

* DELEGATION_APPLICABLE
* DELEGATION_APPLICABLE_WITH_WARNING
* DELEGATION_NOT_APPLICABLE
* DELEGATION_NOT_STARTED
* DELEGATION_EXPIRED
* DELEGATION_SUSPENDED
* DELEGATION_REVOKED
* ACCEPTANCE_REQUIRED
* APPROVAL_REQUIRED
* DELEGATOR_INELIGIBLE
* DELEGATE_INELIGIBLE
* AUTHORITY_SCOPE_MISMATCH
* RESOURCE_SCOPE_MISMATCH
* ACTION_SCOPE_MISMATCH
* LEGAL_ENTITY_SCOPE_MISMATCH
* MONETARY_LIMIT_EXCEEDED
* CURRENCY_SCOPE_MISMATCH
* REDELEGATION_BLOCKED
* MAXIMUM_DEPTH_EXCEEDED
* DELEGATION_CYCLE_DETECTED
* CONFLICT
* MANUAL_REVIEW_REQUIRED
* BLOCKED

필수 필드:

* approval_delegation_resolution_result_id
* approval_delegation_resolution_id
* result
* reason codes
* matched delegations
* excluded delegations
* winning delegation
* priority result
* specificity result
* period result
* scope result
* authority result
* acceptance result
* approval result
* conflict result
* next action
* status
* evidence

---

# 32. Delegation Priority

권장 기본 우선순위:

1. Emergency Delegation
2. Task-specific Approved Delegation
3. Chain Level-specific Delegation
4. Authority-specific Delegation
5. Legal Entity-specific Delegation
6. Resource-specific Delegation
7. Action-specific Delegation
8. Acting Position Delegation
9. Vacation Delegation
10. Out-of-office Delegation
11. Scheduled Temporary Delegation
12. Backup Approver
13. Tenant Default Delegation
14. Manual Review
15. Block

단, 우선순위가 높아도 Scope, Authority, Eligibility, Legal Entity, Amount, Currency 및 Period 검증을 우회할 수 없다.

---

# 33. Specificity Resolution

동일 Actor에게 여러 Delegation이 적용될 때 다음 Specificity를 평가하라.

1. Exact Task
2. Exact Approval Case
3. Exact Chain Level
4. Exact Authority Version
5. Exact Resource
6. Exact Legal Entity
7. Exact Organization
8. Exact Action
9. Exact Amount Band
10. Exact Currency
11. Exact Country
12. Exact Region
13. General Domain
14. Tenant-wide

가장 넓은 Full Delegation을 무조건 선택하지 마라.

---

# 34. Delegation Conflict

`APPROVAL_DELEGATION_CONFLICT`

Conflict Type:

* MULTIPLE_ACTIVE_DELEGATIONS
* MULTIPLE_DELEGATES
* SAME_PRIORITY_CONFLICT
* FULL_PARTIAL_CONFLICT
* EMERGENCY_STANDARD_CONFLICT
* VACATION_OUT_OF_OFFICE_CONFLICT
* SUBJECT_ROLE_CONFLICT
* DELEGATOR_AUTHORITY_CONFLICT
* DELEGATE_OWN_AUTHORITY_CONFLICT
* LEGAL_ENTITY_CONFLICT
* ORGANIZATION_CONFLICT
* RESOURCE_CONFLICT
* ACTION_CONFLICT
* MONETARY_LIMIT_CONFLICT
* CURRENCY_CONFLICT
* PERIOD_OVERLAP
* REDELEGATION_CONFLICT
* DELEGATION_CYCLE
* DEPTH_CONFLICT
* TASK_ASSIGNMENT_REFERENCE_CONFLICT
* VERSION_CONFLICT
* CUSTOM

필수 필드:

* approval_delegation_conflict_id
* approval_request_id
* approval_case_id
* approval_item_id
* delegator subject id
* delegate subject ids
* delegation candidates
* conflict type
* conflicting delegation versions
* authority
* resource
* action
* organization
* legal entity
* amount
* currency
* period
* severity
* resolution policy
* winning delegation
* resolved_by
* resolved_at
* status
* evidence

---

# 35. Conflict Resolution 원칙

권장 기본 순서:

1. Explicit Delegation Deny
2. Mandatory Platform Security Control
3. Mandatory Financial Control
4. Emergency Delegation with Valid Approval
5. Task-specific Delegation
6. Chain Level-specific Delegation
7. Authority-specific Delegation
8. Resource-specific Delegation
9. Legal Entity-specific Delegation
10. Organization-specific Delegation
11. Scheduled Temporary Delegation
12. Backup Delegation
13. Manual Review
14. Block

---

# 36. Delegation Chain

`APPROVAL_DELEGATION_CHAIN`

필수 필드:

* approval_delegation_chain_id
* root delegator subject id
* current delegate subject id
* parent delegation version id
* child delegation version id
* depth
* maximum allowed depth
* re-delegation policy
* scope reduction result
* cycle detection result
* legal entity consistency result
* authority consistency result
* path hash
* status
* evidence

---

# 37. Re-delegation Governance

기본 정책:

* 기본 금지
* 허용 시 원본 Delegator 승인 필요
* Scope 확대 금지
* Amount Ceiling 확대 금지
* Legal Entity 확대 금지
* Action 확대 금지
* Resource 확대 금지
* Period 연장 금지
* Currency 확대 금지
* 최대 깊이 기본 1
* 모든 Chain을 Snapshot으로 저장
* Decision 시 전체 Chain 재검증

---

# 38. Cycle Detection

다음을 탐지하라.

* A → A
* A → B → A
* A → B → C → A
* 동일 Subject가 서로 다른 Role로 Cycle 구성
* Position 기반 Cycle
* Organization Owner 기반 Cycle
* Emergency Delegation과 Standard Delegation 간 Cycle
* Future-dated Delegation 활성화 시 Cycle
* Delegation Version 변경으로 새 Cycle 발생

Cycle이 발견되면 활성화를 차단하라.

---

# 39. Delegation Snapshot

`APPROVAL_DELEGATION_SNAPSHOT`

필수 필드:

* approval_delegation_snapshot_id
* snapshot_type
* approval_request_id
* approval_request_version_id
* approval_case_id
* approval_case_version_id
* approval_item_id
* approval_requirement_id
* approval_chain_resolution_id
* approval_chain_resolution_level_id
* original participant subject id
* delegator subject id
* delegate subject id
* delegation definition id
* delegation version id
* delegation type
* scope snapshot
* authority snapshot
* original authority resolution
* delegate own authority resolution
* resource snapshot
* action snapshot
* organization snapshot
* legal entity snapshot
* geography snapshot
* monetary snapshot
* currency snapshot
* period snapshot
* acceptance snapshot
* approval snapshot
* re-delegation chain snapshot
* conflict result
* resolution result
* effective_at
* captured_at
* immutable_hash
* status
* evidence

Snapshot Type:

* DELEGATION_CREATION
* DELEGATION_APPROVAL
* DELEGATION_ACCEPTANCE
* DELEGATION_ACTIVATION
* CHAIN_RESOLUTION
* TASK_ASSIGNMENT_REFERENCE
* TASK_CLAIM_REFERENCE
* DECISION_ATTEMPT
* DECISION_COMMIT
* DELEGATION_SUSPENSION
* DELEGATION_REVOCATION
* DELEGATION_EXPIRATION
* DELEGATION_CHANGE
* REDELEGATION
* SIMULATION
* RECONCILIATION
* AUDIT_RECONSTRUCTION

---

# 40. Snapshot 원칙

* Snapshot 직접 수정 금지
* Current Delegation으로 과거 Snapshot 대체 금지
* Delegation Version 저장
* Delegator Identity·Role·Position Version 저장
* Delegate Identity·Role·Position Version 저장
* Original Authority Version 저장
* Scope 저장
* Amount·Currency 저장
* Period 저장
* Acceptance 저장
* Approval 저장
* Re-delegation Chain 저장
* Conflict Resolution 저장
* Immutable Hash 검증

---

# 41. Delegation Lifecycle

지원 Lifecycle:

* DRAFT
* VALIDATION_PENDING
* VALIDATION_FAILED
* ACCEPTANCE_PENDING
* APPROVAL_PENDING
* APPROVED
* SCHEDULED
* ACTIVE
* ACTIVE_WITH_WARNINGS
* SUSPENDED
* REVOKED
* EXPIRED
* SUPERSEDED
* RETIRED
* ARCHIVED
* BLOCKED

허용 전이 예:

* DRAFT → VALIDATION_PENDING
* VALIDATION_PENDING → VALIDATION_FAILED
* VALIDATION_PENDING → ACCEPTANCE_PENDING
* VALIDATION_PENDING → APPROVAL_PENDING
* ACCEPTANCE_PENDING → APPROVAL_PENDING
* APPROVAL_PENDING → APPROVED
* APPROVED → SCHEDULED
* APPROVED → ACTIVE
* SCHEDULED → ACTIVE
* ACTIVE → SUSPENDED
* ACTIVE → REVOKED
* ACTIVE → EXPIRED
* SUSPENDED → ACTIVE
* SUSPENDED → REVOKED
* ACTIVE → SUPERSEDED

Invalid Transition을 차단하라.

---

# 42. Delegation Activation

Activation 시 다음을 검증하라.

* Delegator Active
* Delegate Active
* Original Authority Active
* Delegation Version Approved
* Acceptance 완료
* Approval 완료
* Start Time 도달
* End Time 미도달
* Tenant 일치
* Legal Entity 일치
* Scope 유효
* Monetary Limit 유효
* Currency Scope 유효
* Re-delegation 유효
* Cycle 없음
* Depth 초과 없음
* SoD 통과
* Conflict-of-interest 통과
* Critical Conflict 없음

---

# 43. Delegation Suspension

지원 Suspension 사유:

* SECURITY_SUSPENSION
* DELEGATOR_AUTHORITY_SUSPENDED
* DELEGATE_SUSPENDED
* LEGAL_ENTITY_RESTRICTION
* ORGANIZATION_CHANGE
* ROLE_CHANGE
* POSITION_CHANGE
* PERIOD_ANOMALY
* CONFLICT_DETECTED
* SOD_FAILURE
* AUDIT_HOLD
* MANUAL_HOLD
* CUSTOM

Suspension 중에는 새로운 Decision을 허용하지 마라.

---

# 44. Delegation Revocation

Revocation 시 기록:

* revoked_by
* revoked_at
* revocation reason
* immediate 여부
* affected active tasks
* affected claimed tasks
* affected pending decisions
* migration policy
* notification reference
* reconciliation reference
* evidence

완료된 Decision Snapshot은 유지한다.

---

# 45. Delegation Expiration

Expiration 시 다음을 처리하라.

* New Candidate 생성 중지
* New Assignment Eligibility 제거
* Pending Decision 재검증
* Claimed Task 재검증
* Unclaimed Task Assignment Engine 전달용 이벤트 생성
* Delegation Snapshot 생성
* Reconciliation 생성
* 원본 Actor 복귀 가능성 평가
* Backup Delegate 평가
* Audit Event 생성

---

# 46. Original Authority Change Impact

Delegator의 Authority가 다음처럼 변경되면 Delegation을 재검증하라.

* Authority Revoked
* Authority Suspended
* Amount Limit 감소
* Currency Scope 감소
* Legal Entity 제거
* Organization Scope 변경
* Resource Scope 변경
* Action 제거
* Period Limit 소진
* Explicit Deny 추가
* Authority Version 교체
* Security Suspension
* Employment 종료
* Position 변경

Delegation은 원본 Authority보다 넓게 유지될 수 없다.

---

# 47. Delegate State Change Impact

Delegate에게 다음 변화가 발생하면 재검증하라.

* Employment 종료
* Identity 비활성
* Role 제거
* Position 변경
* Legal Entity 변경
* Organization 변경
* Security Suspension
* Certification 만료
* SoD Conflict 발생
* Leave 상태
* Acceptance Revoked
* Conflict-of-interest 발생

---

# 48. Delegation Simulation

`APPROVAL_DELEGATION_SIMULATION`

필수 필드:

* approval_delegation_simulation_id
* simulation_type
* delegation definition id
* delegation version id
* delegator subject id
* delegate subject id
* authority definition id
* authority version id
* approval request id
* approval case id
* chain level id
* resource
* action
* organization
* legal entity
* geography
* amount
* currency
* period
* original authority result
* delegate eligibility result
* acceptance result
* approval result
* cycle result
* depth result
* conflict result
* simulated resolution
* affected active tasks
* affected pending decisions
* simulation hash
* status
* evidence

Simulation Type:

* SINGLE_DELEGATION
* SINGLE_REQUEST
* SINGLE_CHAIN_LEVEL
* BATCH_REQUEST
* FUTURE_ACTIVATION
* FUTURE_EXPIRATION
* DELEGATE_CHANGE
* PERIOD_CHANGE
* SCOPE_CHANGE
* MONETARY_LIMIT_CHANGE
* LEGAL_ENTITY_CHANGE
* REDELEGATION
* EMERGENCY_ACTIVATION
* REVOCATION_IMPACT
* AUTHORITY_CHANGE_IMPACT
* HISTORICAL_REPLAY
* CUSTOM

Simulation은 실제 Delegation Activation, Task Assignment 또는 Decision을 생성하지 않아야 한다.

---

# 49. Delegation Reconciliation

`APPROVAL_DELEGATION_RECONCILIATION`

다음을 비교하라.

* HRIS Leave Delegate vs Canonical Delegation
* Calendar Out-of-office vs Canonical Delegation
* ERP Delegate vs Canonical Delegation
* Workflow Delegate vs Canonical Delegation
* Tenant Setting vs Canonical Delegation
* Delegator Authority vs Delegated Scope
* Delegate Eligibility vs Active Delegation
* Role Assignment vs Delegation
* Position Incumbency vs Delegation
* Legal Entity Membership vs Delegation
* Organization Membership vs Delegation
* Active Period vs Current Time
* Acceptance vs Active Status
* Approval vs Active Status
* Re-delegation Chain vs Policy
* Task Assignee vs Winning Delegation
* Decision Actor vs Delegation Snapshot
* Decision Time vs Delegation Period
* Decision Amount vs Delegated Ceiling
* Decision Currency vs Delegated Currency
* Current Version vs Case Snapshot
* Revoked Delegation vs Pending Task
* Expired Delegation vs Claimed Task
* Suspended Delegation vs Decision Attempt

필수 필드:

* approval_delegation_reconciliation_id
* approval_request_id
* approval_case_id
* approval_item_id
* delegation definition id
* delegation version id
* delegator subject id
* delegate subject id
* comparison type
* source state
* canonical state
* difference
* affected task
* affected decision
* severity
* detected_at
* resolution
* resolved_by
* resolved_at
* status
* evidence

---

# 50. Reconciliation 상태

* MATCH
* HRIS_DELEGATION_MISMATCH
* CALENDAR_DELEGATION_MISMATCH
* ERP_DELEGATION_MISMATCH
* WORKFLOW_DELEGATION_MISMATCH
* TENANT_SETTING_MISMATCH
* DELEGATOR_AUTHORITY_MISMATCH
* DELEGATE_ELIGIBILITY_MISMATCH
* ROLE_ASSIGNMENT_MISMATCH
* POSITION_INCMUMBENCY_MISMATCH
* LEGAL_ENTITY_MISMATCH
* ORGANIZATION_MISMATCH
* PERIOD_MISMATCH
* ACCEPTANCE_MISMATCH
* APPROVAL_MISMATCH
* REDELEGATION_POLICY_MISMATCH
* TASK_ASSIGNEE_MISMATCH
* DECISION_ACTOR_MISMATCH
* DECISION_TIME_MISMATCH
* MONETARY_LIMIT_MISMATCH
* CURRENCY_SCOPE_MISMATCH
* VERSION_SNAPSHOT_MISMATCH
* REVOKED_DELEGATION_ACTIVE_TASK
* EXPIRED_DELEGATION_CLAIMED_TASK
* SUSPENDED_DELEGATION_DECISION_ATTEMPT
* MANUAL_REVIEW
* BLOCKED

---

# 51. Critical Gap 후보

다음은 High 또는 Critical로 처리하라.

* Delegation Version 없이 활성화
* Delegator Authority 검증 없이 위임
* Original Authority보다 높은 Amount Ceiling 위임
* Cross-Tenant Delegation
* 승인 없는 Emergency Delegation
* Acceptance 없는 Active Delegation
* Self-delegation
* Delegation Cycle
* Maximum Depth 초과
* Re-delegation 금지 상태에서 재위임
* Expired Delegation으로 승인
* Revoked Delegation으로 승인
* Suspended Delegation으로 승인
* Wrong Legal Entity Delegation
* Wrong Resource Delegation
* Wrong Action Delegation
* Wrong Currency Delegation
* Amount Limit 초과 승인
* Terminated Delegate 승인
* Security Suspended Delegate 승인
* SoD Conflict 무시
* Conflict-of-interest 무시
* Delegation Snapshot 누락
* 현재 Delegation으로 과거 Decision 재해석
* Delegator Authority 상실 후 Delegation 유지
* Delegate State 변경 후 미재검증
* Task Assignee와 Winning Delegation 불일치
* Decision Actor와 Delegation Snapshot 불일치
* 고객 설정으로 Mandatory Delegation Control 제거
* 종료일 없는 Temporary Delegation
* 직접 DB 수정으로 Active Delegation 변경
* Calendar Out-of-office를 검증 없이 Authority로 사용

---

# 52. 최소 Static Lint

다음을 차단하라.

* Tenant 없는 Delegation
* Delegator 없는 Delegation
* Delegate 없는 Delegation
* Delegator와 Delegate 동일
* Delegation Type 없음
* Active Version 없음
* Start Time 없음
* Temporary Delegation End Time 없음
* Permanent Delegation Review Date 없음
* Scope 없음
* Authority Binding 없음
* Monetary Delegation Currency 없음
* Delegated Ceiling > Original Ceiling
* Cross-Tenant Binding
* Cross-Legal-Entity 허용 근거 없음
* Acceptance Required인데 Acceptance Policy 없음
* Approval Required인데 Approval Policy 없음
* Re-delegation 허용인데 Maximum Depth 없음
* Delegation Cycle
* Overlapping Delegation Conflict 미처리
* Role Name 문자열 기반 Delegate
* Email 문자열 기반 Delegate
* Active Version 직접 수정
* Snapshot 직접 수정
* Expired Original Authority 참조
* Terminated Delegate 참조
* Mandatory Financial Control 제거
* 기존 Delegation Entity 중복 생성

---

# 53. 최소 Runtime Guard

다음을 차단하라.

* Delegation Registry Not Found
* Delegation Definition Not Found
* Delegation Version Inactive
* Delegator Inactive
* Delegate Inactive
* Original Authority Missing
* Original Authority Inactive
* Delegation Not Started
* Delegation Expired
* Delegation Suspended
* Delegation Revoked
* Acceptance Missing
* Approval Missing
* Tenant Mismatch
* Legal Entity Mismatch
* Organization Mismatch
* Geography Mismatch
* Resource Mismatch
* Action Mismatch
* Authority Domain Mismatch
* Authority Type Mismatch
* Amount Above Delegated Ceiling
* Currency Mismatch
* Period Limit Exhausted
* Self Delegation
* Re-delegation Blocked
* Maximum Depth Exceeded
* Delegation Cycle
* Security Blocked
* SoD Failed
* Conflict-of-interest
* Unresolved Conflict
* Snapshot Missing
* Snapshot Hash Invalid
* Delegation Changed Since Claim
* Task Assignee Drift
* Decision Actor Drift
* Critical Reconciliation Drift
* Kill Switch 활성

---

# 54. Error Contract

* APPROVAL_DELEGATION_REGISTRY_NOT_FOUND
* APPROVAL_DELEGATION_TYPE_NOT_FOUND
* APPROVAL_DELEGATION_DEFINITION_NOT_FOUND
* APPROVAL_DELEGATION_VERSION_NOT_FOUND
* APPROVAL_DELEGATION_VERSION_INACTIVE
* APPROVAL_DELEGATION_VERSION_IMMUTABLE
* APPROVAL_DELEGATION_SCOPE_INVALID
* APPROVAL_DELEGATOR_NOT_FOUND
* APPROVAL_DELEGATOR_INACTIVE
* APPROVAL_DELEGATE_NOT_FOUND
* APPROVAL_DELEGATE_INACTIVE
* APPROVAL_DELEGATION_SELF_DELEGATION_BLOCKED
* APPROVAL_DELEGATION_ORIGINAL_AUTHORITY_MISSING
* APPROVAL_DELEGATION_ORIGINAL_AUTHORITY_INACTIVE
* APPROVAL_DELEGATION_NOT_STARTED
* APPROVAL_DELEGATION_EXPIRED
* APPROVAL_DELEGATION_SUSPENDED
* APPROVAL_DELEGATION_REVOKED
* APPROVAL_DELEGATION_ACCEPTANCE_REQUIRED
* APPROVAL_DELEGATION_APPROVAL_REQUIRED
* APPROVAL_DELEGATION_TENANT_MISMATCH
* APPROVAL_DELEGATION_LEGAL_ENTITY_MISMATCH
* APPROVAL_DELEGATION_ORGANIZATION_MISMATCH
* APPROVAL_DELEGATION_GEOGRAPHY_MISMATCH
* APPROVAL_DELEGATION_RESOURCE_MISMATCH
* APPROVAL_DELEGATION_ACTION_MISMATCH
* APPROVAL_DELEGATION_AUTHORITY_SCOPE_MISMATCH
* APPROVAL_DELEGATION_AMOUNT_LIMIT_EXCEEDED
* APPROVAL_DELEGATION_CURRENCY_MISMATCH
* APPROVAL_DELEGATION_PERIOD_LIMIT_EXHAUSTED
* APPROVAL_DELEGATION_REDELEGATION_BLOCKED
* APPROVAL_DELEGATION_MAXIMUM_DEPTH_EXCEEDED
* APPROVAL_DELEGATION_CYCLE_DETECTED
* APPROVAL_DELEGATION_SECURITY_BLOCKED
* APPROVAL_DELEGATION_SOD_FAILED
* APPROVAL_DELEGATION_CONFLICT_OF_INTEREST
* APPROVAL_DELEGATION_CONFLICT_UNRESOLVED
* APPROVAL_DELEGATION_SNAPSHOT_MISSING
* APPROVAL_DELEGATION_SNAPSHOT_INVALID
* APPROVAL_DELEGATION_TASK_ASSIGNEE_DRIFT
* APPROVAL_DELEGATION_DECISION_ACTOR_DRIFT
* APPROVAL_DELEGATION_REVALIDATION_REQUIRED
* APPROVAL_DELEGATION_RECONCILIATION_FAILED
* APPROVAL_DELEGATION_RUNTIME_BLOCKED

---

# 55. Warning Contract

* APPROVAL_DELEGATION_SOURCE_WARNING
* APPROVAL_DELEGATION_VERSION_WARNING
* APPROVAL_DELEGATION_SCOPE_WARNING
* APPROVAL_DELEGATION_PERIOD_WARNING
* APPROVAL_DELEGATION_ACCEPTANCE_WARNING
* APPROVAL_DELEGATION_APPROVAL_WARNING
* APPROVAL_DELEGATION_AUTHORITY_WARNING
* APPROVAL_DELEGATION_MONETARY_WARNING
* APPROVAL_DELEGATION_CURRENCY_WARNING
* APPROVAL_DELEGATION_LEGAL_ENTITY_WARNING
* APPROVAL_DELEGATION_ORGANIZATION_WARNING
* APPROVAL_DELEGATION_REDELEGATION_WARNING
* APPROVAL_DELEGATION_DEPTH_WARNING
* APPROVAL_DELEGATION_CONFLICT_WARNING
* APPROVAL_DELEGATION_CHANGE_IMPACT_WARNING
* APPROVAL_DELEGATION_SIMULATION_WARNING
* APPROVAL_DELEGATION_RECONCILIATION_WARNING
* APPROVAL_DELEGATION_MANUAL_REVIEW_REQUIRED

---

# 56. Evidence Contract

`APPROVAL_DELEGATION_EVIDENCE`

필수 필드:

* evidence_id
* tenant_id
* approval_request_id
* approval_request_version_id
* approval_case_id
* approval_case_version_id
* approval_item_id
* approval_requirement_id
* approval_chain_resolution_id
* approval_chain_resolution_level_id
* delegation registry
* delegation type
* delegation definition
* delegation version
* delegator subject
* delegator role
* delegator position
* delegate subject
* delegate role
* delegate position
* original authority definition
* original authority version
* original authority resolution
* delegate own authority resolution
* scope references
* resource
* action
* organization
* legal entity
* geography
* original amount
* original currency
* delegated ceiling
* delegated currency
* period
* acceptance
* approval
* re-delegation chain
* conflict result
* resolution result
* snapshot
* simulation
* reconciliation
* effective_at
* recorded_at
* immutable_hash
* lineage
* audit reference

다음을 저장하지 마라.

* Password
* Access Token
* Credential Secret
* 전체 HR Medical Data
* 상세 건강 사유
* 전체 Calendar Body
* 전체 Email Body
* 불필요한 PII
* Bank Account 전체 값
* 민감한 Security Secret

Vacation 또는 Medical Leave 사유는 최소한의 Category만 저장하라.

---

# 57. Audit Event

`APPROVAL_DELEGATION_AUDIT_EVENT`

지원 Event:

* APPROVAL_DELEGATION_REGISTRY_CREATED
* APPROVAL_DELEGATION_TYPE_CREATED
* APPROVAL_DELEGATION_DEFINITION_CREATED
* APPROVAL_DELEGATION_VERSION_CREATED
* APPROVAL_DELEGATION_VALIDATED
* APPROVAL_DELEGATION_ACCEPTANCE_REQUESTED
* APPROVAL_DELEGATION_ACCEPTED
* APPROVAL_DELEGATION_DECLINED
* APPROVAL_DELEGATION_APPROVAL_REQUESTED
* APPROVAL_DELEGATION_APPROVED
* APPROVAL_DELEGATION_REJECTED
* APPROVAL_DELEGATION_SCHEDULED
* APPROVAL_DELEGATION_ACTIVATED
* APPROVAL_DELEGATION_SUSPENDED
* APPROVAL_DELEGATION_RESUMED
* APPROVAL_DELEGATION_REVOKED
* APPROVAL_DELEGATION_EXPIRED
* APPROVAL_DELEGATION_REDELEGATED
* APPROVAL_DELEGATION_CYCLE_DETECTED
* APPROVAL_DELEGATION_CONFLICT_DETECTED
* APPROVAL_DELEGATION_CANDIDATE_CREATED
* APPROVAL_DELEGATION_RESOLUTION_STARTED
* APPROVAL_DELEGATION_RESOLVED
* APPROVAL_DELEGATION_SNAPSHOT_CREATED
* APPROVAL_DELEGATION_CHANGE_IMPACT_DETECTED
* APPROVAL_DELEGATION_REVALIDATION_REQUESTED
* APPROVAL_DELEGATION_SIMULATION_STARTED
* APPROVAL_DELEGATION_SIMULATION_COMPLETED
* APPROVAL_DELEGATION_DRIFT_DETECTED
* RETROACTIVE_DELEGATION_CORRECTION_RECORDED
* MANUAL_REVIEW_REQUESTED

---

# 58. 기존 구현 분류

기존 구현을 다음으로 분류하라.

* `CANONICAL_APPROVAL_DELEGATION_REGISTRY`
* `CANONICAL_APPROVAL_DELEGATION_TYPE`
* `CANONICAL_APPROVAL_DELEGATION_DEFINITION`
* `CANONICAL_APPROVAL_DELEGATION_VERSION`
* `CANONICAL_APPROVAL_DELEGATION_SCOPE`
* `CANONICAL_APPROVAL_DELEGATOR_BINDING`
* `CANONICAL_APPROVAL_DELEGATE_BINDING`
* `CANONICAL_APPROVAL_DELEGATION_PERIOD`
* `CANONICAL_APPROVAL_DELEGATION_ACCEPTANCE`
* `CANONICAL_APPROVAL_DELEGATION_APPROVAL`
* `CANONICAL_APPROVAL_DELEGATION_ELIGIBILITY`
* `CANONICAL_APPROVAL_DELEGATION_CANDIDATE`
* `CANONICAL_APPROVAL_DELEGATION_RESOLUTION`
* `CANONICAL_APPROVAL_DELEGATION_CONFLICT`
* `CANONICAL_APPROVAL_DELEGATION_CHAIN`
* `CANONICAL_APPROVAL_DELEGATION_SNAPSHOT`
* `CANONICAL_APPROVAL_DELEGATION_SIMULATION`
* `CANONICAL_APPROVAL_DELEGATION_RECONCILIATION`
* `VALIDATED_HRIS_DELEGATION_SOURCE`
* `VALIDATED_CALENDAR_SOURCE`
* `VALIDATED_ERP_DELEGATION_SOURCE`
* `EXTERNAL_DELEGATION_ADAPTER`
* `VALIDATED_LEGACY`
* `LEGACY_ADAPTER`
* `MIGRATION_REQUIRED`
* `CONSOLIDATION_REQUIRED`
* `DEPRECATION_CANDIDATE`
* `KEEP_SEPARATE_WITH_REASON`
* `BLOCKED_CROSS_TENANT`
* `BLOCKED_LEGAL_ENTITY_RISK`
* `BLOCKED_FINANCIAL_CONTROL_RISK`
* `BLOCKED_HISTORICAL_INTEGRITY_RISK`
* `BLOCKED_CYCLE_RISK`
* `UNVERIFIED`
* `TEST_ONLY`

---

# 59. 중복 구현 감사

다음을 전수 탐지하라.

* 여러 Delegation Table
* 여러 Substitute Approver Table
* 여러 Acting Manager Model
* 여러 Vacation Delegate Setting
* HRIS와 Workflow 이중 Delegation
* Calendar와 Platform 이중 Delegation
* Tenant별 JSON Delegate
* Email 기반 Proxy Approver
* User Preference 기반 Delegate
* 하드코딩 Backup Approver
* Task Reassignment를 Delegation으로 사용
* Role Assignment를 Delegation으로 사용
* Delegation Version 없음
* Delegation Snapshot 없음
* 종료일 없는 Temporary Delegation
* Acceptance 없음
* Approval 없음
* Cross-Tenant Delegate
* Cross-Legal-Entity Delegate
* Self-delegation
* Re-delegation Cycle
* Original Authority보다 넓은 Scope
* Original Authority보다 큰 Amount
* Decision 시 재검증 없음
* Expired Delegation 승인
* Revoked Delegation 승인
* Suspended Delegation 승인
* Current Delegation으로 과거 Decision 재해석
* Calendar Out-of-office를 자동 Authority로 사용
* Manager 변경 시 Delegate 자동 승계
* Position Vacancy에서 Delegate 자동 생성
* Role Name 문자열 Join
* Email 문자열 Join

---

# 60. API Contract

기존 API Convention에 따라 최소 다음 기능을 제공하라.

## Registry·Type

* Delegation Registry 조회
* Delegation Type 조회
* Delegation Policy 조회

## Definition·Version

* Delegation Definition 생성
* Delegation Definition 수정
* Delegation Version 생성
* Version 검증
* Version History 조회
* 특정 날짜 Active Version 조회

## Scope

* Authority Scope 설정
* Resource Scope 설정
* Action Scope 설정
* Organization Scope 설정
* Legal Entity Scope 설정
* Geographic Scope 설정
* Monetary Scope 설정
* Currency Scope 설정
* Period 설정

## Acceptance·Approval

* Acceptance 요청
* Acceptance
* Decline
* Approval 요청
* Approve
* Reject

## Lifecycle

* Schedule
* Activate
* Suspend
* Resume
* Revoke
* Expire
* Supersede

## Candidate·Resolution

* Delegation Candidate 생성
* Candidate Exclusion
* Resolution 실행
* Winning Delegation 조회
* Conflict 조회
* Cycle 조회
* Depth 조회

## Snapshot·Simulation

* Delegation Snapshot 생성
* Snapshot 조회
* Snapshot Hash 검증
* Simulation 실행
* Future Activation Simulation
* Revocation Impact Simulation
* Historical Replay

## Reconciliation

* HRIS 비교
* Calendar 비교
* ERP 비교
* Task·Decision 비교
* Drift 조회
* Manual Resolution
* Reconciliation History 조회

모든 API에 다음을 적용하라.

* Tenant Context
* Authorization
* Idempotency
* Optimistic Lock
* Effective Date Validation
* Version Validation
* Scope Validation
* Authority Validation
* Monetary Precision Validation
* Audit
* Evidence
* Rate Limit
* Pagination
* Error Contract

---

# 61. Index·Performance

최소 다음 조회를 최적화하라.

* Tenant별 Active Delegation
* Delegator별 Delegation
* Delegate별 Delegation
* Type별 Delegation
* Status별 Delegation
* Effective Date 기준 Delegation
* Organization별 Delegation
* Legal Entity별 Delegation
* Resource별 Delegation
* Action별 Delegation
* Authority별 Delegation
* Amount Band별 Delegation
* Currency별 Delegation
* Chain Level별 Delegation
* Approval Case별 Delegation Resolution
* Active Conflict
* Cycle 상태
* Future Activation
* Future Expiration
* Revoked Delegation
* Suspended Delegation
* Snapshot
* Reconciliation Mismatch

---

# 62. Cache 원칙

Delegation Resolution Cache Key에는 최소 다음을 포함하라.

* tenant_id
* delegator_subject_id
* delegate_subject_id
* delegation_version_id
* delegation_status
* original_authority_version_id
* authority_domain
* authority_type
* action
* resource_type
* resource_id
* organization_id
* legal_entity_id
* geography
* amount
* currency
* approval_chain_version_id
* approval_chain_level_id
* effective_timestamp
* acceptance_version
* approval_version
* re-delegation_chain_hash
* policy_version_set_hash

다음을 적용하라.

* Version-aware Cache
* Tenant-isolated Cache
* Effective-time-aware Cache
* Authority-aware Cache
* Actor-state-aware Cache
* Acceptance-aware Cache
* Approval-aware Cache
* Cycle-aware Cache
* Delegation Activation 시 Invalidation
* Suspension 시 즉시 Invalidation
* Revocation 시 즉시 Invalidation
* Expiration 시 즉시 Invalidation
* Authority 변경 시 Invalidation
* Role·Position 변경 시 Invalidation
* Legal Entity 변경 시 Invalidation
* Delegate 상태 변경 시 Invalidation
* Critical Conflict 시 Cache 차단
* 과거 Snapshot은 Current Cache로 재생성 금지

---

# 63. 테스트 범위

## Unit Test

* Delegation Definition 생성
* Delegation Version 생성
* Scope Binding
* Period Validation
* Delegator Eligibility
* Delegate Eligibility
* Acceptance
* Approval
* Activation
* Suspension
* Revocation
* Expiration
* Amount Ceiling
* Currency Scope
* Re-delegation
* Depth
* Cycle Detection
* Conflict Resolution
* Snapshot Hash
* Simulation

## Integration Test

* Approval Authority 연계
* Approval Chain Level 연계
* Role Assignment 연계
* Position Incumbency 연계
* Organization 연계
* Legal Entity 연계
* HRIS Leave 연계
* Calendar Out-of-office 연계
* ERP Delegation 연계
* Rebate Program
* Claim
* Settlement
* Payment
* Payout
* Contract
* Task Assignment Reference
* Decision Revalidation
* Reconciliation

## Property Test

* Tenant Isolation
* Immutable Version
* Delegated Scope ⊆ Original Scope
* Delegated Ceiling ≤ Original Ceiling
* Delegation Period Determinism
* No Self-delegation
* No Cycle
* Depth Bound Preservation
* Legal Entity Boundary Preservation
* Deterministic Resolution
* Snapshot Determinism

## Concurrency Test

* 동일 Delegation Version 동시 생성
* 동일 Delegation 동시 활성화
* Acceptance·Approval 동시 처리
* Revocation·Decision 동시 처리
* Expiration·Decision 동시 처리
* Re-delegation 동시 생성
* Future Scheduler 중복 실행

## Security Test

* Cross-Tenant Delegation
* Cross-Legal-Entity 우회
* Unauthorized Delegation 생성
* Original Authority 초과
* Monetary Ceiling 확대
* Self-delegation
* Cycle 우회
* Depth 우회
* Acceptance 우회
* Approval 우회
* Revocation 우회
* Historical Snapshot 변조
* Role Name 위조
* Calendar Status 위조
* Mandatory Control 제거

## Regression Test

* 기존 Approval Chain
* 기존 Authority Resolution
* 기존 Manager Resolution
* 기존 Workflow
* 기존 Rebate Approval
* 기존 Claim Approval
* 기존 Settlement
* 기존 Payment·Payout
* 기존 ERP Integration
* 기존 Notification Hook
* 기존 Audit

---

# 64. 실행 절차

## Step 1 — 기존 Delegation 전수 조사

Repository, HRIS, ERP, Calendar, Workflow, BPMN, JSON Configuration 및 Tenant Setting을 조사한다.

## Step 2 — Delegation Source of Truth 결정

Delegation Type별 Authoritative Source와 Source Priority를 정의한다.

## Step 3 — Registry·Type 구축

Platform·Tenant·Financial·Rebate Delegation을 표준화한다.

## Step 4 — Definition·Version 구축

Delegation Definition과 Immutable 실행 Version을 분리한다.

## Step 5 — Scope 구축

Authority, Resource, Action, Organization, Legal Entity, Geography, Amount, Currency 및 Period Scope를 구현한다.

## Step 6 — Delegator·Delegate Binding 구축

Canonical Identity, Employment, Role, Position 및 Organization과 연결한다.

## Step 7 — Acceptance·Approval 구축

Delegation 수락과 승인 절차를 구현한다.

## Step 8 — Lifecycle 구축

Schedule, Activate, Suspend, Resume, Revoke, Expire 및 Supersede를 구현한다.

## Step 9 — Eligibility 구축

Delegator와 Delegate의 자격을 검증한다.

## Step 10 — Candidate 구축

Approval Chain Participant별 Delegation Candidate를 생성한다.

## Step 11 — Resolution 구축

Priority, Specificity, Scope, Period, Authority, Amount, Currency 및 Conflict를 평가한다.

## Step 12 — Re-delegation 구축

기본 금지, 최대 깊이, Scope 축소 및 Chain 검증을 구현한다.

## Step 13 — Cycle Detection 구축

직접·간접 Cycle을 탐지하고 차단한다.

## Step 14 — Snapshot 구축

Activation, Assignment Reference, Claim Reference 및 Decision 시점 Delegation을 불변 저장한다.

## Step 15 — Change Impact 구축

Delegator Authority, Delegate State, Scope, Period 및 Version 변경 영향을 계산한다.

## Step 16 — Simulation 구축

Future Activation, Expiration, Revocation, Re-delegation 및 Historical Replay를 구현한다.

## Step 17 — Reconciliation 구축

HRIS, Calendar, ERP, Workflow, Task 및 Decision 상태를 비교한다.

## Step 18 — Static Lint·Runtime Guard 구축

Cycle, Scope 초과, 기간 오류, Authority 초과 및 Drift를 차단한다.

## Step 19 — 기존 구현 통합

중복 Substitute, Proxy, Vacation 및 Out-of-office 구현을 Canonical Adapter로 통합한다.

## Step 20 — 문서·ADR·History 갱신

모든 결정, Migration, Conflict 및 남은 위험을 기록한다.

---

# 65. 생성 또는 갱신할 문서

기존 동일 목적 문서가 있으면 통합하라.

* `docs/segmentation/DSAR_APPROVAL_DELEGATION_REGISTRY.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_DEFINITION.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_VERSION.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_VERSION_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_STATUS.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_SCOPE.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_AUTHORITY_BINDING.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_RESOURCE_BINDING.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_ACTION_BINDING.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_ORGANIZATION_BINDING.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_LEGAL_ENTITY_BINDING.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_GEOGRAPHIC_BINDING.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_MONETARY_BINDING.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_CURRENCY_BINDING.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_PERIOD.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATOR_BINDING.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATE_BINDING.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_ACCEPTANCE.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_APPROVAL.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_ELIGIBILITY_PROFILE.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_CANDIDATE.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_CANDIDATE_EXCLUSION_REASON.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_RESOLUTION.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_RESOLUTION_RESULT.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_PRIORITY.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_SPECIFICITY_POLICY.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_CONFLICT.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_CONFLICT_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_CONFLICT_RESOLUTION.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_CHAIN.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_REDELEGATION_POLICY.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_CYCLE_DETECTION.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_DEPTH_GOVERNANCE.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_LIFECYCLE.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_ACTIVATION.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_SUSPENSION.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_REVOCATION.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_EXPIRATION.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_CHANGE_IMPACT.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_SNAPSHOT.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_SNAPSHOT_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_SIMULATION.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_SIMULATION_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_RECONCILIATION.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_RECONCILIATION_STATUS.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_CRITICAL_GAP_POLICY.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_STATIC_LINT.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_RUNTIME_GUARDS.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_ERROR_WARNING_CONTRACT.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_EVIDENCE.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_AUDIT_EVENT.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_API_CONTRACT.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_INDEX_PERFORMANCE.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_CACHE_POLICY.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`
* `docs/segmentation/DSAR_APPROVAL_DELEGATION_FUNCTION_REGRESSION_GATE.md`
* `docs/architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md`
* `docs/pm/PM_CHANGE_HISTORY.md`
* `docs/pm/REPEAT_PROBLEM_HISTORY.md`
* `docs/pm/AGENT_EXECUTION_HISTORY.md`

---

# 66. Delegation Matrix

| Delegation | Version | Type | Delegator | Delegate | Authority | Scope | Period | Status |
| ---------- | ------- | ---- | --------- | -------- | --------- | ----- | ------ | ------ |

---

# 67. Delegation Scope Matrix

| Delegation | Domain | Action | Resource | Organization | Legal Entity | Amount | Currency | Period |
| ---------- | ------ | ------ | -------- | ------------ | ------------ | ------ | -------- | ------ |

---

# 68. Delegation Resolution Matrix

| Case | Level | Delegator | Delegate | Delegation Version | Authority | Amount | Result | Status |
| ---- | ----- | --------- | -------- | ------------------ | --------- | ------ | ------ | ------ |

---

# 69. Delegation Conflict Matrix

| Delegator | Delegate | Delegation A | Delegation B | Conflict | Severity | Resolution | Status |
| --------- | -------- | ------------ | ------------ | -------- | -------- | ---------- | ------ |

---

# 70. Re-delegation Matrix

| Root | Delegator | Delegate | Depth | Max Depth | Scope Reduced | Cycle | Status |
| ---- | --------- | -------- | ----- | --------- | ------------- | ----- | ------ |

---

# 71. Delegation Simulation Matrix

| Simulation | Delegator | Delegate | Scenario | Authority | Amount | Conflict | Result | Status |
| ---------- | --------- | -------- | -------- | --------- | ------ | -------- | ------ | ------ |

---

# 72. Delegation Reconciliation Matrix

| Case | Source | Canonical Delegation | Difference | Affected Task | Severity | Resolution | Status |
| ---- | ------ | -------------------- | ---------- | ------------- | -------- | ---------- | ------ |

---

# 73. 검증 게이트

완료 전에 반드시 확인하라.

* Delegation Registry가 구축되었는가
* Delegation Type이 구축되었는가
* Delegation Definition과 Version이 분리되는가
* Active Version이 Immutable한가
* Delegator와 Delegate가 Canonical Identity에 연결되는가
* Self-delegation이 차단되는가
* Cross-Tenant Delegation이 차단되는가
* Legal Entity Boundary가 적용되는가
* Authority Scope가 Original Authority 이내인가
* Delegated Ceiling이 Original Ceiling 이하인가
* Resource·Action Scope가 분리되는가
* Organization·Geography Scope가 적용되는가
* Period가 Effective-dated 되는가
* Temporary Delegation에 End Time이 있는가
* Permanent Delegation에 Review Date가 있는가
* Acceptance가 지원되는가
* Approval이 지원되는가
* Emergency Delegation 승인 정책이 있는가
* Schedule·Activate·Suspend·Revoke·Expire가 구현되는가
* Delegator Eligibility가 검증되는가
* Delegate Eligibility가 검증되는가
* Delegation Candidate가 생성되는가
* Delegation Resolution이 생성되는가
* Multiple Delegation Priority가 결정되는가
* Specificity가 평가되는가
* Delegation Conflict가 탐지되는가
* Re-delegation 기본 금지가 적용되는가
* Maximum Depth가 적용되는가
* Cycle Detection이 작동하는가
* Decision 시 Delegation이 재검증되는가
* Delegation Snapshot이 생성되는가
* 과거 Decision이 현재 Delegation으로 재해석되지 않는가
* Delegator Authority 변경 영향이 계산되는가
* Delegate State 변경 영향이 계산되는가
* Simulation이 실제 Task·Decision 없이 실행되는가
* HRIS·Calendar·ERP·Task·Decision Reconciliation이 작동하는가
* 최소 Static Lint가 작동하는가
* 최소 Runtime Guard가 작동하는가
* 기존 Delegation 기능의 회귀가 없는가
* 중복 Delegation 모델이 생성되지 않았는가
* ADR·PM·Repeat Problem·Agent History가 갱신되었는가
* 다음 Approval Assignment Engine 단계가 실행 가능한가

---

# 74. 완료 보고 형식

다음 순서로 보고하라.

1. Delegation Registry 수
2. Delegation Type 수
3. Delegation Definition 수
4. Delegation Version 수
5. Active Delegation 수
6. Scheduled Delegation 수
7. Suspended Delegation 수
8. Revoked Delegation 수
9. Expired Delegation 수
10. Temporary Delegation 수
11. Vacation Delegation 수
12. Out-of-office Delegation 수
13. Acting Manager Delegation 수
14. Emergency Delegation 수
15. Substitute Approver 수
16. Full Delegation 수
17. Partial Delegation 수
18. Delegator Binding 수
19. Delegate Binding 수
20. Authority Binding 수
21. Resource Binding 수
22. Action Binding 수
23. Organization Binding 수
24. Legal Entity Binding 수
25. Geographic Binding 수
26. Monetary Binding 수
27. Currency Binding 수
28. Delegation Period 수
29. Acceptance Pending 수
30. Accepted 수
31. Declined 수
32. Approval Pending 수
33. Approved 수
34. Delegator Eligibility Failure 수
35. Delegate Eligibility Failure 수
36. Delegation Candidate 수
37. Candidate Exclusion 수
38. Delegation Resolution 수
39. Applicable 수
40. Not Applicable 수
41. Monetary Limit Exceeded 수
42. Currency Mismatch 수
43. Legal Entity Mismatch 수
44. Delegation Conflict 수
45. Multiple Active Delegation Conflict 수
46. Period Overlap 수
47. Re-delegation 수
48. Maximum Depth Exceeded 수
49. Cycle Detected 수
50. Delegation Snapshot 수
51. Delegator Authority Change Impact 수
52. Delegate State Change Impact 수
53. Active Task 영향 수
54. Claimed Task 재검증 수
55. Pending Decision 재검증 수
56. Delegation Simulation 수
57. Future Activation Simulation 수
58. Revocation Impact Simulation 수
59. Simulation Conflict 수
60. Reconciliation Mismatch 수
61. HRIS Mismatch 수
62. Calendar Mismatch 수
63. ERP Mismatch 수
64. Task Assignee Mismatch 수
65. Decision Actor Mismatch 수
66. Static Lint Rule 수
67. Runtime Guard 수
68. Existing Implementation 수
69. Duplicate Implementation 수
70. Migration Required 수
71. Manual Review 수
72. Function Regression 수
73. 생성·갱신한 문서
74. 남은 리스크
75. 다음 Approval Assignment Engine 준비 상태

---

# 75. 완료 조건

다음 조건을 모두 충족해야 이번 블록을 완료로 인정한다.

1. Delegation Registry가 구축되었다.
2. Delegation Type이 구축되었다.
3. Delegation Definition이 구축되었다.
4. Delegation Version이 구축되었다.
5. Delegation Scope가 구축되었다.
6. Authority Binding이 구축되었다.
7. Resource Binding이 구축되었다.
8. Action Binding이 구축되었다.
9. Organization Binding이 구축되었다.
10. Legal Entity Binding이 구축되었다.
11. Geographic Binding이 구축되었다.
12. Monetary Binding이 구축되었다.
13. Currency Binding이 구축되었다.
14. Delegation Period가 구축되었다.
15. Delegator Binding이 구축되었다.
16. Delegate Binding이 구축되었다.
17. Delegation Acceptance가 구축되었다.
18. Delegation Approval이 구축되었다.
19. Delegation Lifecycle이 구축되었다.
20. Delegator Eligibility가 구축되었다.
21. Delegate Eligibility가 구축되었다.
22. Delegation Candidate가 구축되었다.
23. Delegation Resolution이 구축되었다.
24. Delegation Resolution Result가 구축되었다.
25. Delegation Priority가 구축되었다.
26. Delegation Specificity가 구축되었다.
27. Delegation Conflict가 구축되었다.
28. Re-delegation Governance가 구축되었다.
29. Maximum Depth가 구축되었다.
30. Cycle Detection이 구축되었다.
31. Delegation Snapshot이 구축되었다.
32. Delegator Authority Change Impact가 구축되었다.
33. Delegate State Change Impact가 구축되었다.
34. Delegation Simulation이 구축되었다.
35. Delegation Reconciliation이 구축되었다.
36. Static Lint가 구축되었다.
37. Runtime Guard가 구축되었다.
38. Existing Implementation이 분류되었다.
39. Duplicate Implementation 통합 계획이 작성되었다.
40. Legacy 기능의 회귀가 없다.
41. ADR·PM Change History·Repeat Problem·Agent History가 갱신되었다.
42. 다음 Approval Assignment Engine이 사용할 검증된 Delegation Foundation이 준비되었다.

---

# 76. 최종 실행 명령

지금 즉시 검증된 Approval Foundation, Approval Chain, Organization Hierarchy, Reporting Line, Identity, Role, Position, Legal Entity 및 Approval Authority Matrix Foundation 위에 **Rebate Delegation Foundation Governance**를 구축하라.

Repository, Database, API, HRIS, ERP, Calendar, Workflow, BPMN, Tenant Setting 및 Legacy Approval 코드에서 Delegation, Substitute Approver, Proxy Approver, Backup Approver, Acting Manager, Vacation Delegate, Out-of-office Delegate, Temporary Approver, Emergency Approver 및 Reassignment 관련 구현을 전수 조사하라.

동일 목적 Delegation 구현이 존재하면 중복 Entity를 만들지 말고 Canonical Delegation Contract와 Adapter로 통합하라.

Delegation과 Authority를 동일시하지 마라.

Delegation이 새로운 영구 Authority를 생성하도록 구현하지 마라.

Delegation은 Delegator가 실제로 보유한 Active Authority의 Scope, Action, Resource, Organization, Legal Entity, Geography, Amount, Currency 및 Effective Period 범위 안에서만 유효하게 하라.

Delegated Monetary Ceiling이 Original Authority Ceiling을 초과하지 못하게 하라.

Cross-Tenant Delegation을 차단하라.

Cross-Legal-Entity Delegation은 명시적 정책, Delegate Eligibility, Employment, Role, Position 및 Authorization 검증이 있는 경우에만 허용하라.

Self-delegation을 차단하라.

Delegation Definition, Version, Scope, Period, Delegator, Delegate, Acceptance, Approval, Eligibility, Candidate, Resolution, Conflict, Chain, Snapshot, Simulation 및 Reconciliation을 구축하라.

Active Delegation Version을 직접 수정하지 말고 새 Version을 생성하라.

Temporary, Scheduled, Vacation, Out-of-office, Acting Manager, Acting Position, Substitute Approver, Backup Approver, Emergency, Medical Leave, Business Travel, Program-specific, Authority-specific, Chain-specific, Level-specific, Full 및 Partial Delegation을 구분하라.

기본값은 Partial Delegation과 Re-delegation 금지로 설정하라.

Full Delegation은 Original Authority 전체가 아니라 Original Authority 내에서만 작동하게 하라.

Delegation Scope에 Authority, Domain, Action, Resource, Organization, Legal Entity, Geography, Amount, Currency, Approval Chain, Stage, Level 및 Period를 기록하라.

Approve 위임이 Reject, Activate, Pay, Payout, Release, Sign 또는 Override 권한까지 자동으로 포함하지 않게 하라.

Delegator와 Delegate를 Canonical Subject ID, Employment, Role Assignment, Position Incumbency, Organization 및 Legal Entity에 연결하라.

Role 이름, Position 이름, Job Title 또는 Email 문자열만으로 Delegate를 판정하지 마라.

Delegator가 Delegation 대상 Authority를 실제로 보유하는지 Active Approval Authority Resolution으로 검증하라.

Delegate의 Identity, Employment, Role, Position, Tenant, Legal Entity, Organization, Geography, Certification, Security, SoD 및 Conflict-of-interest를 검증하라.

Acceptance Required 정책이 적용되면 Delegate의 명시적 수락 전에는 활성화하지 마라.

Approval Required 정책이 적용되면 승인 완료 전에는 활성화하지 마라.

Payment, Payout, Write-off, Contract, Executive 및 Emergency Delegation은 강화된 승인 정책을 적용하라.

Delegation Period에 Start Time, End Time, Timezone, Automatic Activation, Automatic Expiration, Grace Period 및 Review Date를 기록하라.

종료일 없는 Temporary Delegation을 차단하라.

Permanent-with-review Delegation에는 Review Date를 필수로 적용하라.

Schedule, Activate, Suspend, Resume, Revoke, Expire, Supersede 및 Archive Lifecycle을 구현하라.

Activation 시 Delegator, Delegate, Original Authority, Acceptance, Approval, Period, Tenant, Legal Entity, Scope, Amount, Currency, Cycle, Depth, SoD 및 Conflict-of-interest를 모두 재검증하라.

Suspension, Revocation 및 Expiration 이후 새로운 Approval Decision을 차단하라.

Delegation Candidate를 Approval Chain Resolution Level과 연결하라.

Delegation Candidate에 Original Participant, Delegator, Delegate, Delegation Version, Authority Version, Resource, Action, Organization, Legal Entity, Amount, Currency, Period, Eligibility, Acceptance, Approval, Conflict, Cycle 및 Depth를 기록하라.

Multiple Delegation이 존재할 때 Emergency, Task-specific, Chain Level-specific, Authority-specific, Legal Entity-specific, Resource-specific, Action-specific, Acting Position, Vacation, Out-of-office, Temporary 및 Backup 순서의 기본 Priority를 적용하되 모든 Scope와 Authority 검증을 유지하라.

동일 Priority에서는 Task, Approval Case, Chain Level, Authority, Resource, Legal Entity, Organization, Action, Amount, Currency, Country, Region 및 Tenant Specificity를 평가하라.

가장 넓은 Full Delegation이나 가장 높은 Amount Ceiling을 임의로 선택하지 마라.

Multiple Active Delegation, Multiple Delegate, Full·Partial, Emergency·Standard, Vacation·Out-of-office, Authority, Legal Entity, Organization, Resource, Action, Amount, Currency, Period, Re-delegation, Version 및 Task Assignment Conflict를 탐지하라.

Re-delegation은 기본 금지로 구현하라.

Re-delegation이 허용될 때 Scope, Amount, Currency, Legal Entity, Action, Resource 및 Period가 원본보다 확대되지 않게 하라.

최대 Delegation Depth를 적용하라.

A→A, A→B→A, A→B→C→A 및 Role·Position 기반 간접 Cycle을 탐지하고 활성화를 차단하라.

Task Assignment와 Delegation을 분리하라.

Delegation은 누가 자격이 있는지를 정의하고 실제 Queue Assignment, Claim, Release 및 Reassign은 다음 Approval Assignment Engine에서 처리하도록 경계를 유지하라.

Task Assignment Reference, Task Claim Reference, Decision Attempt 및 Decision Commit 시 Delegation Version과 Resolution을 Immutable Snapshot으로 저장하라.

Decision 시점에 Delegation이 Active인지, Period가 유효한지, Delegator Authority가 유지되는지, Delegate가 Eligible한지, Scope와 Amount가 일치하는지 재검증하라.

과거 Task 또는 Decision을 현재 Delegation 상태로 재작성하지 마라.

Delegator Authority가 Revoked, Suspended, Reduced 또는 Scope 변경되면 모든 Active Delegation을 재검증하라.

Delegate의 Employment, Role, Position, Organization, Legal Entity, Certification, Security 또는 SoD 상태가 변경되면 Active Delegation을 재검증하라.

Delegation Expiration 시 New Candidate 생성을 중지하고 Pending Decision, Claimed Task 및 Assignment Reference를 재검증하라.

Delegation Simulation에서 Single Delegation, Single Request, Chain Level, Batch, Future Activation, Future Expiration, Delegate Change, Period Change, Scope Change, Monetary Limit Change, Legal Entity Change, Re-delegation, Emergency Activation, Revocation Impact, Authority Change Impact 및 Historical Replay를 지원하라.

Simulation은 실제 Delegation Activation, Task Assignment, Notification 또는 Decision을 생성하지 않게 하라.

HRIS Leave, Calendar Out-of-office, ERP Delegate, Workflow Delegate, Tenant Setting, Delegator Authority, Delegate Eligibility, Role Assignment, Position Incumbency, Legal Entity, Organization, Period, Acceptance, Approval, Re-delegation Chain, Task Assignee 및 Decision Actor를 Canonical Delegation과 Reconciliation하라.

Delegation Version 누락, Original Authority 미검증, Scope 초과, Amount Ceiling 초과, Cross-Tenant, 승인 없는 Emergency, Acceptance 없는 Active Delegation, Self-delegation, Cycle, Depth 초과, Expired·Revoked·Suspended Delegation 승인, Wrong Legal Entity, Wrong Resource, Wrong Action, Wrong Currency, Terminated Delegate, SoD Conflict, Snapshot 누락, Decision Actor Drift 및 Mandatory Control 제거를 Critical Gap으로 생성하라.

Tenant, Delegator, Delegate, Type, Active Version, Start Time, End Time, Review Date, Scope, Authority Binding, Currency, Ceiling, Acceptance Policy, Approval Policy, Maximum Depth 및 Cycle 검증을 Static Lint에서 강제하라.

Inactive Delegation, Inactive Actor, Missing Authority, Period 오류, Acceptance·Approval 누락, Scope Mismatch, Amount Limit 초과, Currency Mismatch, Re-delegation 금지, Depth 초과, Cycle, Security, SoD, Conflict-of-interest, Snapshot 오류, Task Assignee Drift 및 Decision Actor Drift를 Runtime Guard로 차단하라.

Calendar Out-of-office 또는 HRIS Leave 상태만으로 자동 승인 Authority를 생성하지 마라.

외부 상태는 Delegation Proposal 또는 Source Signal로만 사용하고 Canonical Delegation Validation, Acceptance, Approval 및 Activation을 거치게 하라.

기존 Approval Chain, Approval Authority, Manager Resolution, Workflow, Rebate, Claim, Settlement, Payment, Payout, Contract, ERP Integration 및 Audit 기능과 Legacy Equivalence를 수행하라.

기존 정상 기능을 유지하면서 중복 Delegation Table, 하드코딩 Substitute Approver, Email 기반 Proxy, 종료일 없는 Temporary Delegate, Current State만 저장하는 구현, Cycle 미검증, Decision 시 재검증 누락 및 Cross-Legal-Entity 우회를 제거하거나 Canonical Adapter로 전환하라.

모든 Delegation Registry, Type, Definition, Version, Scope, Period, Delegator, Delegate, Acceptance, Approval, Eligibility, Candidate, Resolution, Conflict, Chain, Snapshot, Simulation, Reconciliation, Existing Implementation, Duplicate Implementation, Migration 및 남은 위험을 ADR, PM Change History, Repeat Problem History 및 Agent Execution History에 기록하라.

다음 단계인 **EPIC 06-A-02 — Approval Assignment Engine**을 구현할 수 있는 검증된 Rebate Delegation Foundation Governance를 완성하라.
