<!--
  ★선영속(ⓐ) — EPIC 06-A-02 Approval Assignment Engine Governance 스펙 원문.
  289차 13회차 사용자 제공. 소실 방지 목적 verbatim 보존. 순서 무관·판정 전 원문 고정.

  ═══ 착수 전 필독: 측정된 선행조건 상태 주입 (289차 11·12회차 감사 실측) ═══
  이 스펙 §3 선행조건(Approval/Authority/Delegation/Identity·Organization/Security·Authorization Foundation)은
  289차 11·12회차 전수감사에서 **전 축 ABSENT(개념 부재)로 확정**됐다. 요약:
   - §3.1 Approval Foundation: 범용 chain/stage/level/resolution 0 (단발 승인 3종만). cover 0.00%(5-3-3-3).
   - §3.2 Authority Foundation: Approval Authority Matrix/binding/amount_band 0 · §72 Canonical Entity 20종 전량 ABSENT(5-3-3-4 감사).
     유일 근접=HIGH_VALUE_KRW ₩5M 상수(Catalog)·AutoCampaign 예산상한. DOA 식별자 44 전부 0.
   - §3.3 Delegation Foundation: Approval Delegation 개념 부재(06-A-01 감사). 유일 히트 DELEGATION_EXCEEDED=RBAC 부여상한 monotonicity(오탐).
   - §3.4 Identity·Organization: Reporting-Line Resolver가 parent_user_id→owner로 붕괴(UserAuth.php:156-157,1225-1227)·Org/Legal Entity/Position/Employment 엔티티 0.
   - §3.5 Security·Authorization: SoD/CoI/Break-glass/Actor Snapshot ABSENT · acl allow-only. 진짜 검증형 정본=SecurityAudit::verify().
  ★결론: 06-A-02 Assignment Engine은 4축 위에 얹히는데 그 4축이 없다 → 대부분 §산출물은 BLOCKED_PREREQUISITE/ABSENT·cover 0 이 정직한 판정.
  ★실존 인접 인프라(재구현 금지·정직 분류): Catalog catalog_writeback_job + pending_approval + approveQueue(실 승인 큐 흐름·286/289차)·
    Alerting action_request(생산자 VACUOUS·287차)·AdminGrowth 1인 승인·TeamPermissions DELEGATION_EXCEEDED·AgencyPortal 접근권 승인.
  ★규율: Golden Rule(Extend not Replace)·중복 엔티티 금지·코드 변경 0(설계 명세)·측정기 기반 cover·VALIDATED_LEGACY는 실존 증거 있을 때만·
    "결론의 근거도 재실증 대상"(DDL/이름에서 능력 추론 금지). 실 엔진 구현=선행 4축 실구현 후 별도 승인세션(RP-002).
  후속 = EPIC 06-A-03 Sequential Approval Engine Governance.
-->

# GeniegoROI Enterprise Engineering Handbook

## EPIC 06-A-02

# Approval Assignment Engine Governance

Version 1.0

---

# 0. 작업 목적

앞 단계에서 구축한 다음 기반 위에 Enterprise급 **Approval Assignment Engine Governance**를 구축하라.

* Canonical Approval Foundation
* Approval Workflow Definition
* Approval Chain Definition
* Approval Chain Version
* Organization Hierarchy
* Reporting Line
* Manager Resolution
* Approval Authority Matrix Foundation
* Approval Delegation Foundation Governance
* Delegation Eligibility
* Delegation Resolution
* Delegation Snapshot
* Approval Participant Resolution

이번 단계의 핵심 목적은 Approval Chain Resolution과 Delegation Resolution에서 결정된 승인 자격 후보를 실제 승인 업무 실행 단위인 Assignment, Queue, Work Item 및 Assignee로 안전하게 변환하는 것이다.

이번 단계에서는 다음을 구축한다.

* Approval Assignment Registry
* Approval Assignment Policy
* Approval Assignment Definition
* Approval Assignment Version
* Approval Work Item
* Approval Assignment
* Assignment Candidate
* Assignment Resolution
* Assignment Strategy
* Assignment Queue
* Queue Definition
* Queue Version
* Queue Membership
* Queue Eligibility
* Queue Routing
* Direct Assignment
* Role-based Assignment
* Position-based Assignment
* Manager-based Assignment
* Owner-based Assignment
* Delegation-aware Assignment
* Group Assignment
* Pool Assignment
* Skill-based Assignment Foundation
* Capacity-aware Assignment Foundation
* Load-aware Assignment Foundation
* Availability-aware Assignment
* Geographic Assignment
* Legal Entity Assignment
* Organization Assignment
* Resource Assignment
* Action Assignment
* Monetary-band Assignment
* Priority Assignment
* Weighted Assignment
* Round-robin Assignment
* Least-loaded Assignment
* Sticky Assignment
* Case-affinity Assignment
* Customer-affinity Assignment
* Program-affinity Assignment
* Claim / Unclaim / Release / Reassign / Transfer / Return to Queue
* Assignment Reservation / Lease / Lock / Expiration / Timeout / Suspension / Cancellation
* Assignment Recovery / Failover / Fallback / Conflict / Drift Detection
* Assignment Snapshot / Simulation / Reconciliation / Evidence / Audit
* Assignment Static Lint / Runtime Guard / API / Cache / Index / Performance / Migration
* Existing Implementation Audit / Duplicate Implementation Audit / ADR / PM·Repeat·Agent History

이번 단계에서는 Sequential Approval의 단계 진행, Parallel Join, Committee Vote, Quorum, SLA Escalation 및 최종 Decision State Machine을 상세 구현하지 않는다. 해당 기능은 후속 단계(06-A-03)에서 구현한다.

이번 단계는 승인 업무가 다음 질문에 정확히 답하도록 Assignment Foundation을 완성한다: 어떤 Approval Requirement가 Work Item으로 생성되었는가 / 어떤 Chain Level이 Assignment를 생성했는가 / 누가 원래 후보였는가 / Delegation이 적용되었는가 / 어떤 Strategy가 사용되었는가 / Direct인가 Queue인가 / 어떤 Queue가 선택되었는가 / 어떤 후보가 평가·제외되었는가 / 최종 Assignee는 누구인가 / 언제 생성·Claim되었는가 / Lease는 언제 만료되는가 / 누가 Release·Reassign했고 사유는 / 현재 유효한가 / Assignee가 권한·자격을 여전히 보유하는가 / Delegation 만료·휴가·퇴사·정지·과부하인가 / Queue Membership 변경·Legal Entity 경계 위반 / Amount Band 적합 / 고액을 일반 Queue로 보냈는가 / 중복 Assignment·Claim / 영구 Lock / Drift / Simulation·Reconciliation·감사 재현 가능한가.

---

# 1. 구현 범위 (75개)

1 Assignment Registry · 2 Assignment Policy · 3 Assignment Definition · 4 Assignment Version · 5 Work Item · 6 Assignment Candidate · 7 Assignment Resolution · 8 Assignment Strategy · 9 Assignment Queue · 10 Queue Version · 11 Queue Membership · 12 Queue Eligibility · 13 Queue Routing · 14 Direct Assignment · 15 Role Assignment · 16 Position Assignment · 17 Manager Assignment · 18 Owner Assignment · 19 Delegation-aware Assignment · 20 Group Assignment · 21 Pool Assignment · 22 Skill Matching Foundation · 23 Capacity Matching Foundation · 24 Load Matching Foundation · 25 Availability Matching · 26 Legal Entity Matching · 27 Organization Matching · 28 Geographic Matching · 29 Resource Matching · 30 Action Matching · 31 Monetary Band Matching · 32 Priority Scoring · 33 Weighted Scoring · 34 Round-robin · 35 Least-loaded · 36 Sticky Assignment · 37 Case Affinity · 38 Customer Affinity · 39 Program Affinity · 40 Claim · 41 Unclaim · 42 Release · 43 Reassign · 44 Transfer · 45 Return to Queue · 46 Reservation · 47 Lease · 48 Lock · 49 Expiration · 50 Timeout · 51 Suspension · 52 Cancellation · 53 Recovery · 54 Failover · 55 Fallback · 56 Conflict · 57 Drift Detection · 58 Snapshot · 59 Simulation · 60 Reconciliation · 61 Static Lint · 62 Runtime Guard · 63 Evidence · 64 Audit · 65 API · 66 Cache · 67 Index · 68 Performance · 69 Migration · 70 Existing Implementation Audit · 71 Duplicate Implementation Audit · 72 ADR · 73 PM Change History · 74 Repeat Problem History · 75 Agent Execution History

상세 구현 제외(후속): Sequential Stage Advancement · Parallel Fork·Join · Committee Voting · Quorum · Consensus · Conditional Route Execution · Exception/Risk-based Approval · Financial Threshold Decision Engine · SLA Escalation · Notification Delivery · Final Decision State Machine · Production Certification.

---

# 3. 선행조건 (★전 축 ABSENT 실측 — 상단 헤더 참조)

## 3.1 Approval Foundation
Approval Request/Version · Case/Version · Item · Requirement · Workflow · Chain · Chain Version · Stage · Level · Resolution · Resolution Level · Resolved Participant · Chain Snapshot

## 3.2 Authority Foundation
Authority Registry · Definition · Version · Matrix · Matrix Version · Matrix Entry · Candidate · Resolution · Snapshot · Conflict

## 3.3 Delegation Foundation
Delegation Registry · Definition · Version · Scope · Delegator Binding · Delegate Binding · Candidate · Resolution · Resolution Result · Conflict · Chain · Snapshot · Reconciliation

## 3.4 Identity·Organization Foundation
Canonical Identity · Subject Registry · Employment Record · Role Registry · Role Assignment · Position Registry · Position Incumbency · Organization Unit · Organization Hierarchy · Reporting Line · Manager Relationship · Legal Entity · Country · Region · Cost Center · Profit Center · Budget · Program · Project · Resource Registry

## 3.5 Security·Authorization Foundation
Authorization Policy · Permission · Entitlement · Scope Binding · Actor Authorization Snapshot · Segregation of Duties Hook · Conflict-of-interest Hook · Security Suspension · Tenant Isolation Guard · Break-glass Reference

---

# 5. 핵심 원칙 (요약 — 원문 전문 보존)

5.1 Eligibility ≠ Assignment (자격 후보라고 자동 배정 아님) · 5.2 Assignment ≠ Decision(책임배정 vs 승인판단·다르면 명시 근거) · 5.3 Assignment는 Version-aware(Request/Case/Chain/ChainResolution/Authority/Delegation/Policy/Queue 버전 고정) · 5.4 Immutable History(현재상태 변경가능·History/Claim/Release/Reassign/Snapshot 불변) · 5.5 Direct vs Queue 분리(assignee_id nullable 하나로 처리 금지) · 5.6 Queue Membership ≠ Eligibility(Task별 Authority/Delegation/LegalEntity/Org/Resource/Action/Amount/Currency/Conflict 재검증) · 5.7 Claim=Lease 기반(무기한 소유권 아님·Renewal/Expiration/Recovery) · 5.8 중복 Assignment 방지(동일 Requirement·Level 복수 Active 차단·Parallel은 후속 명시 그룹만) · 5.9 Assignment 시점·Decision 시점 모두 재검증 · 5.10 Cross-Tenant Assignment 금지 · 5.11 Cross-Legal-Entity는 명시 정책 필요 · 5.12 Mandatory Control 고객설정 비활성 불가(Tenant Isolation·Original Authority·Delegation·Legal Entity Boundary·SoD·CoI·Snapshot·Decision-time Revalidation·Immutable Audit·Duplicate Guard).

# 21. Determinism 원칙
동일 입력·정책버전·후보 Snapshot·Effective Time → 동일 Resolution. Round-robin/Weighted도 deterministic cursor·cursor version·partition key·queue version·candidate set hash·tie-break key·resolution timestamp·replay seed 기록.

# 39. Tie-break 기본순서
Exact Authority → Exact Legal Entity → Exact Resource → Exact Action → Exact Amount Band → Active Delegation → Higher Availability → Higher Remaining Capacity → Lower Workload → Higher Skill → Stronger Affinity → Queue Priority → Oldest Last Assignment → Stable Subject Identifier. 무작위는 Deterministic Seed 있을 때만.

# 43. Lease 원칙
Lease 없는 Claim 금지 · 만료 후 Decision Commit 차단 · Renewal 시 권한·자격 재검증 · Heartbeat 누락→Recovery · 무기한 연장 금지 · Maximum Renewal 적용.

---

# 6. Canonical Entity (기존 동등 없을 시 최소 구축 — 재구현 금지·기존 확장 우선)
APPROVAL_ASSIGNMENT_REGISTRY · _POLICY · _DEFINITION · _VERSION · APPROVAL_WORK_ITEM · APPROVAL_ASSIGNMENT · _HISTORY · _CANDIDATE · _RESOLUTION · _STRATEGY · APPROVAL_QUEUE · _VERSION · _MEMBERSHIP · _ELIGIBILITY_PROFILE · _ROUTING_RULE · APPROVAL_ASSIGNMENT_CLAIM · _LEASE · _LOCK · _RESERVATION · _REASSIGNMENT · _TRANSFER · _RELEASE · _FALLBACK · _CONFLICT · _SNAPSHOT · _SIMULATION · _RECONCILIATION · _EVIDENCE · _AUDIT_EVENT

# 4. 기존 Assignment 구현 전수 조사 (§65 분류)
Approval Task/Work Item/Assignment · Task/Workflow Assignment · BPMN User Task · Human Task · Queue/Inbox Task · Pending Approval · Assigned/Current Approver · Task Owner/Assignee · Candidate User/Group/Role/Position · Queue(Work/Approval/Shared/Team/Department/Legal Entity/Country/Finance/Rebate/Claim/Settlement/Payment/Exception/Manual Review) · Round Robin · Least Loaded · Load Balance · Capacity · Workload · Skill/Language/Country/Region/Customer/Program/Brand/Partner Routing · Claim/Release/Reassign/Transfer/Forward/Return/Delegate/Substitute Task · Backup Approver · Claim/Task/Optimistic/Pessimistic Lock · Lease · Reservation · Timeout/Expiration · Stale/Orphan/Dead-letter · Retry Queue · Cache/Batch/Scheduler · Audit/History/Snapshot/API/Event · Kafka/Camunda/Temporal/Airflow · ERP Approval Inbox · CRM Approval Queue · Legacy Task Table · Git/Migration History · Production Logs · Existing Tests. → 동일 목적 존재 시 중복 모델 금지·Canonical에 통합.

# 65. 기존 구현 분류 태그
CANONICAL_* (WORK_ITEM/ASSIGNMENT/HISTORY/CANDIDATE/RESOLUTION/STRATEGY/QUEUE/QUEUE_VERSION/QUEUE_MEMBERSHIP/QUEUE_ROUTING/CLAIM/LEASE/LOCK/RESERVATION/REASSIGNMENT/TRANSFER/FALLBACK/SNAPSHOT/SIMULATION/RECONCILIATION) · VALIDATED_WORKFLOW_TASK_SOURCE · VALIDATED_ERP_INBOX_SOURCE · VALIDATED_LEGACY_TASK · EXTERNAL_ASSIGNMENT_ADAPTER · LEGACY_ADAPTER · MIGRATION_REQUIRED · CONSOLIDATION_REQUIRED · DEPRECATION_CANDIDATE · KEEP_SEPARATE_WITH_REASON · BLOCKED_CROSS_TENANT · BLOCKED_LEGAL_ENTITY_RISK · BLOCKED_FINANCIAL_CONTROL_RISK · BLOCKED_HISTORICAL_INTEGRITY_RISK · UNVERIFIED · TEST_ONLY

---

# 58. Critical Gap 후보 (High/Critical)
Work Item/Assignment Policy/Queue Version 없음 · Authority·Delegation 미검증 Assignment · Cross-Tenant/Cross-Legal-Entity · Inactive/Terminated/Security-Suspended Subject · Wrong Resource/Action · Amount 초과 · Currency Mismatch · Queue Membership/Eligibility/Lease 없는 Claim · 만료 Lease Decision · Stale Lock 변경 · 동일 Work Item 중복 Active Assignment/Claim · History 삭제 · Snapshot 누락 · 과거를 현재상태로 재작성 · Reassignment Reason 누락 · Reassignment/Queue Routing/Fallback Loop · Orphan Work Item · 영구 Claim/Reservation · Hard Capacity 우회 · SoD/CoI 우회 · Mandatory Control 고객설정 비활성 · Decision Actor 불일치 · Drift 미처리 · 고객별 하드코딩 Assignee · Email/Role Name 문자열 Assignee.

# 72. 생성/갱신 문서 (기존 동일목적 통합)
docs/segmentation/DSAR_APPROVAL_ASSIGNMENT_{REGISTRY,POLICY,DEFINITION,VERSION,VERSION_TYPE}.md · _WORK_ITEM{,_STATUS} · _ASSIGNMENT{,_TYPE,_HISTORY} · _CANDIDATE{,_TYPE,_SOURCE,_EXCLUSION_REASON} · _RESOLUTION{,_RESULT} · _STRATEGY · _DETERMINISM · _QUEUE{,_TYPE,_VERSION,_MEMBERSHIP,_ELIGIBILITY_PROFILE,_ROUTING_RULE} · _{DIRECT,ROLE,POSITION,MANAGER,OWNER,DELEGATION_AWARE}_ASSIGNMENT · _SKILL_ASSIGNMENT_FOUNDATION · _CAPACITY_FOUNDATION · _WORKLOAD_FOUNDATION · _AVAILABILITY_MATCHING · _AFFINITY_ASSIGNMENT · _PRIORITY_SCORING · _TIE_BREAK · _CLAIM · _LEASE · _LOCK · _RESERVATION · _RELEASE · _REASSIGNMENT · _TRANSFER · _RETURN_TO_QUEUE · _FALLBACK · _CONFLICT · _DRIFT · _SNAPSHOT{,_TYPE} · _SIMULATION · _RECONCILIATION{,_STATUS} · _CRITICAL_GAP_POLICY · _STATIC_LINT · _RUNTIME_GUARDS · _ERROR_WARNING_CONTRACT · _EVIDENCE · _AUDIT_EVENT · _API_CONTRACT · _INDEX_PERFORMANCE · _CACHE_POLICY · _EXISTING_IMPLEMENTATION · _DUPLICATE_IMPLEMENTATION_AUDIT · _FUNCTION_REGRESSION_GATE · docs/architecture/ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE.md · docs/pm/{PM_CHANGE_HISTORY,REPEAT_PROBLEM_HISTORY,AGENT_EXECUTION_HISTORY}.md

# 82. 완료 조건 (50항목 요약)
Registry/Policy/Definition/Version/Work Item/Assignment/History/Candidate/Resolution/Strategy/Queue/Queue Version/Membership/Eligibility/Routing/Direct/Role/Position/Manager/Owner/Delegation-aware/Skill/Capacity/Workload/Availability/Affinity/Priority/Tie-break/Claim/Lease/Lock+Fencing/Reservation/Release/Reassignment/Transfer/Return-to-Queue/Fallback/Recovery/Conflict/Drift/Snapshot/Simulation/Reconciliation/Static Lint/Runtime Guard 구축 + Existing 분류 + Duplicate 통합계획 + Legacy 무회귀 + ADR·PM·Repeat·Agent History 갱신 + 다음 Sequential Engine용 검증된 Foundation 준비.

# 83. 최종 실행 명령 (요지)
검증된 Approval Foundation·Chain·Org Hierarchy·Reporting Line·Identity·Role·Position·Legal Entity·Authority Matrix·Delegation Foundation 위에 Approval Assignment Engine Governance 구축. 전수조사→중복 시 Canonical Adapter 통합. Eligibility≠Assignment, Candidate≠Assignee, Assignment≠Decision. Requirement·Chain Resolution Level에서 Work Item 생성(전 버전 고정). Role/Position/Job Title/Email/Display Name 문자열만으로 Assignee 판정 금지→Canonical Identity/Employment/Role/Position/Org/Legal Entity 연결. Direct vs Queue 분리. Claim 시 전 축 재검증. Deterministic Resolution. Cross-Tenant/Cross-Legal-Entity 차단. Lease 기반 Claim·Fencing Token·중복 Active 차단. Snapshot 불변·과거 재작성 금지. Simulation은 실 Assignment 미생성. Reconciliation. Static Lint·Runtime Guard. 기존 정상기능 무회귀·중복 제거/Adapter 전환. ADR·PM·Repeat·Agent History 기록. → 다음 EPIC 06-A-03 Sequential Approval Engine Governance 준비.

---

<!-- 원문 전체(§0~§83)는 289차 13회차 사용자 메시지에 존재. 본 파일은 착수 헤더+핵심 골격 선영속.
     각 §의 필수 필드·Enum·Error/Warning Contract·API·Index·Cache·Test 상세는 ⓒ 전사 시 원문에서 직접 인용한다.
     ★블록마다 산출형태 상이 — §72가 per-entity DSAR(70편)를 지시하므로 앞 블록 통합패턴 관성 적용 금지. -->
