# 요구 목록 정본 (분모) — EPIC 06-A Part 4-5-3-1-5-3-1

> **Rebate Approval Foundation & Canonical Approval Entity Governance · Spec Version 1.0**
> 289차 · **스펙 수령 즉시 영속화**(설계 착수 **전**) · 코드변경 0
> ADR: [`../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md`](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
>
> ## 🔴 289차 자기 오류 정정 — 본 문서는 **집계**이고 **분모 원본이 아니다**
>
> **초판(a532fd21975)은 개수만 영속했다**("§6 Domain Type = 31"). **항목명은 저장소에 없었다.**
> → 산출 에이전트 **5개가 독립적으로** "전사할 원문이 저장소에 없다"며 정지했고(§16 요구 날조 0 준수), **그 지적이 옳았다.**
>
> > **개수는 분모가 아니다.** "31 종"은 **무엇이 31 종인지 모르면 검증도 반증도 불가능**하다.
> > **289차 ② 의 `351` 이 정확히 그런 값**(측정 명령 없이 박힌 숫자 → 복제 → 정본화)이었다 —
> > **개수만 적는 것은 351 사건을 요구 목록에서 재현하는 것**이다.
> > **"수령 즉시 영속"의 ⓐ 를 했다고 믿은 순간에도 COV-GAP-01 은 절반만 해소돼 있었다.**
>
> ★**분모 원본 = [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md)**(스펙 전문 원문 영속).
> **인용 근거는 항상 원문 파일**이며, 본 문서는 그 위의 **축 정의·집계**다.

## 🔴 본 문서의 존재 이유 — 순서가 정직성을 결정한다

**1-6 COV-GAP-01**: 요구 목록이 저장소에 없으면 커버리지는 **원리적으로 계산 불가**다.
**1-6 D-3 규칙**: *"`source_persisted = false` 인 요구는 분모에 넣을 수 없다. 세션 컨텍스트는 저장소가 아니다."*

**289차 ⑤ 확정 사항**([`COVERAGE_REQUIREMENT_REGISTRY_06A.md`](./COVERAGE_REQUIREMENT_REGISTRY_06A.md) §1-1):

> **설계를 먼저 하고 요구를 나중에 적으면 그것은 역산이다.** 산출물에서 요구를 도출하면
> **커버리지가 정의상 항상 100%** 가 된다 — 분모를 분자로 만든 것이므로 측정이 아니라 동어반복이다.
> **그래서 본 문서는 설계 착수 전에 작성됐다.** 5-2 가 06-A 최초로 커버리지를 실계산할 수 있었던
> 유일한 이유가 이것이며, 본 블록은 그 선례를 그대로 따른다.

**본 문서는 스펙 원문의 요구를 그대로 고정한다.** 판단·해석·취사선택은 Canonical 문서에서 하고,
**이 문서는 분모만 담는다**(분모를 설계 편의에 맞춰 줄이면 그 순간 분모가 아니다).

---

## §0. 스펙 메타

| 항목 | 값 |
|---|---|
| Part | `3-3-3-3-3-3-3-3-4-5-3-1-5-3-1` |
| 제목 | Rebate Approval Foundation & Canonical Approval Entity Governance |
| Spec Version | **1.0** |
| 수령 차수 | **289차** |
| 분할 구조 | Approval Engine **10 블록 중 1번째**(스펙 §1) |
| 범위 밖(명시) | Workflow 실행 엔진 · Multi-Level · Dynamic Rule · Risk-Based · SLA/Escalation · Parallel/Sequential · Delegation · Emergency · 전체 Audit Certification |
| 다음 블록 | `4-5-3-1-5-3-2` Approval Workflow Definition & Flow Execution Engine |

### 0-1. 후속 블록 (스펙 §1 · 중복 구현 금지 대상)

| # | 블록 | 주제 |
|---|---|---|
| 1 | `5-3-1` | **Approval Foundation & Canonical Approval Entity** ← **본 블록** |
| 2 | `5-3-2` | Workflow Definition & Flow Execution Engine |
| 3 | `5-3-3` | Multi-Level & Hierarchical Approval |
| 4 | `5-3-4` | Dynamic Rule & Conditional Routing |
| 5 | `5-3-5` | Risk-Based, Threshold & Financial Decision |
| 6 | `5-3-6` | SLA, Deadline, Reminder & Escalation |
| 7 | `5-3-7` | Parallel, Sequential, Quorum & Consensus |
| 8 | `5-3-8` | Delegation, Substitute & Availability |
| 9 | `5-3-9` | Emergency, Expedited & Exception |
| 10 | `5-3-10` | Audit, Evidence, Reconciliation & Certification |

---

## §1. 요구 — 기반 구성요소 (스펙 §0 · **24 항목**)

후속 Approval Engine 전체가 공통 사용하는 기반.

| # | 항목 |
|---|---|
| 1 | Approval Request |
| 2 | Approval Subject |
| 3 | Approval Resource |
| 4 | Approval Action |
| 5 | Approval Case |
| 6 | Approval Item |
| 7 | Approval Requirement |
| 8 | Approval Decision |
| 9 | Approval Decision Reason |
| 10 | Approval Participant |
| 11 | Approval Actor |
| 12 | Approval Status |
| 13 | Approval Context |
| 14 | Approval Policy Reference |
| 15 | Approval Version |
| 16 | Approval Snapshot |
| 17 | Approval Evidence |
| 18 | Approval Correlation |
| 19 | Approval Idempotency |
| 20 | Approval Cancellation |
| 21 | Approval Withdrawal |
| 22 | Approval Reopen |
| 23 | Approval Supersession |
| 24 | Approval Reconciliation |

## §2. 요구 — 답해야 할 질문 (스펙 §0 · **23 항목**)

| # | 질문 |
|---|---|
| 1 | 무엇에 대한 승인인가 |
| 2 | 누가 승인을 요청했는가 |
| 3 | 누구/어떤 시스템이 승인 대상인가 |
| 4 | 어떤 Tenant·Workspace·법인·Program에 속하는가 |
| 5 | 어떤 Resource와 Action이 승인 대상인가 |
| 6 | 승인 금액과 Currency는 무엇인가 |
| 7 | 어떤 Policy와 Role이 승인 필요성을 발생시켰는가 |
| 8 | Approval Request와 Approval Case는 어떻게 구분되는가 |
| 9 | 하나의 요청에 여러 승인 항목이 포함될 수 있는가 |
| 10 | 승인 항목별로 승인 결과를 다르게 처리할 수 있는가 |
| 11 | 누가 승인자 후보인가 |
| 12 | 누가 실제 승인 결정을 내렸는가 |
| 13 | 승인자와 요청자가 동일한가 |
| 14 | 승인자는 승인 당시 유효한 Role·Scope를 보유했는가 |
| 15 | 승인 전에 어떤 상태·데이터가 Snapshot으로 고정되었는가 |
| 16 | 승인 후 원본 데이터가 변경되었는가 |
| 17 | 동일 요청이 중복 생성/중복 승인되는가 |
| 18 | 요청 철회·취소·재개·재승인을 어떻게 처리하는가 |
| 19 | 기존 승인 요청이 새 Version으로 대체되었는가 |
| 20 | 승인 결정의 근거와 Evidence를 재현할 수 있는가 |
| 21 | UI·API·ERP·Provider·Internal Approval 상태가 일치하는가 |
| 22 | 승인 완료 전 고위험 작업이 실행되지 않는가 |
| 23 | 승인 완료 후 승인 범위를 초과한 작업이 실행되지 않는가 |

> **스펙 §0 마지막 문단**: 본 구현은 **GeniegoROI 내부 결재 테이블이 아니다** — 각 구독 고객사가
> 자신의 Rebate/Campaign/Budget/Funding/Claim/Settlement/Payout/Refund/Contract/Migration 승인을
> **같은 Canonical Approval Foundation 위에서** 운영할 수 있어야 한다.

## §3. 요구 — 실행 역할 (스펙 §2 · **24 항목**)

Approval Platform Architect · Canonical Approval Domain · Approval Request · Approval Case · Approval Item ·
Approval Resource·Action · Approval Requirement · Approval Participant · Approval Decision · Approval Version ·
Approval Snapshot · Approval Context · Approval Idempotency · Approval State Machine · Approval Cancellation·Withdrawal ·
Approval Reopen·Supersession · Approval Evidence·Audit 기반 · Approval Reconciliation · Multi-tenant Approval Isolation ·
승인 전·후 데이터 무결성 · 중복 승인·재사용·승인 범위 초과 방지 · 기존 Approval 구현의 비파괴적 통합 ·
ADR·PM·Repeat Problem·Agent Execution History 관리 (책임자 역할 24종)

## §4. 요구 — 선행조건 확인 (스펙 §3)

| 하위 | 항목 수 | 내용 |
|---|---|---|
| §3.1 Authorization·Role 기반 | **17** | AUTHORIZATION_{SUBJECT,RESOURCE,ACTION,PERMISSION,ROLE,SUBJECT_ROLE,SCOPE,SCOPE_BINDING,POLICY,POLICY_VERSION,REQUEST,DECISION} · REBATE_ROLE{,_VERSION,_ASSIGNMENT,_ASSIGNMENT_SCOPE,_RECONCILIATION} |
| §3.2 Rebate Program 기반 | **13** | REBATE_PROGRAM{,_VERSION,_LIFECYCLE,_CHANGE_SET,_AMENDMENT,_CHANGE_IMPACT,_APPROVAL_REFERENCE,_ACTIVATION,_MIGRATION_PLAN} · REBATE_FUNDING_{AGREEMENT_REFERENCE,ALLOCATION,COMMITMENT} · REBATE_ECONOMIC_RESPONSIBILITY_ROLE |
| §3.3 공통 비즈니스 기반 | **18** | Tenant·Workspace·Organization·Legal Entity·Country/Region·Environment·Currency·Contract·Identity·Provider·Provider Account·Feature Flag·Audit·Notification·Incident·Task·Workflow Registry |
| §3.4 기존 Approval 전수조사 | **41** | Approval Table/Request/Case/Workflow/Step/Status/Decision/Approver/Reviewer/Queue/Inbox/History/Comment/Evidence/Attachment/Notification/SLA/Escalation/Delegation/Substitute · Emergency/Budget/Funding/Campaign/Claim/Settlement/Payout/Refund/Contract/Migration/Access/ERP/Provider Approval · BPMN/State Machine/Task Engine/Temporal·Camunda·Flowable·Zeebe·Step Functions · Idempotency · Audit·Monitoring · Git 이력 · 테스트 결과 · 운영 로그 |

**§3 소계 = 17 + 13 + 18 + 41 = 89**

## §5. 요구 — 핵심 원칙 (스펙 §4 · **10 항목**)

| # | 원칙 |
|---|---|
| 4.1 | Approval Request와 Business Resource를 동일시하지 않는다 |
| 4.2 | Approval Request와 Approval Case를 구분한다 (+ Item) |
| 4.3 | 승인 **필요성**(Requirement)과 승인 **결과**(Decision)를 구분한다 |
| 4.4 | 승인 당시 데이터를 Snapshot으로 보존한다 |
| 4.5 | 승인 후 원본 변경 시 재승인을 검토한다 |
| 4.6 | 승인자는 **승인 시점에** 유효한 권한을 가져야 한다 |
| 4.7 | Authorization **Deny** 와 Approval **Rejection** 을 구분한다 |
| 4.8 | Withdrawal·Cancellation·Rejection·Expiration·Supersession 을 구분한다 |
| 4.9 | Approval Decision 은 **Append-only** 로 관리한다 |
| 4.10 | 동일 승인으로 여러 실행을 무제한 허용하지 않는다 |

## §6. 요구 — Canonical Entity (스펙 §5 · **36 항목**)

APPROVAL_REQUEST · APPROVAL_REQUEST_VERSION · APPROVAL_REQUEST_RESOURCE · APPROVAL_REQUEST_ACTION ·
APPROVAL_REQUEST_CONTEXT · APPROVAL_CASE · APPROVAL_CASE_VERSION · APPROVAL_ITEM · APPROVAL_REQUIREMENT ·
APPROVAL_REQUIREMENT_SOURCE · APPROVAL_PARTICIPANT · APPROVAL_ACTOR · APPROVAL_ACTOR_AUTHORIZATION_SNAPSHOT ·
APPROVAL_DECISION · APPROVAL_DECISION_REASON · APPROVAL_DECISION_CONDITION · APPROVAL_DECISION_OBLIGATION ·
APPROVAL_STATUS_HISTORY · APPROVAL_RESOURCE_SNAPSHOT · APPROVAL_CONTEXT_SNAPSHOT · APPROVAL_POLICY_REFERENCE ·
APPROVAL_CORRELATION · APPROVAL_IDEMPOTENCY · APPROVAL_CANCELLATION · APPROVAL_WITHDRAWAL · APPROVAL_REOPEN ·
APPROVAL_SUPERSESSION · APPROVAL_EXECUTION_BINDING · APPROVAL_CONSUMPTION · APPROVAL_RECONCILIATION ·
APPROVAL_CANDIDATE · APPROVAL_EVIDENCE · APPROVAL_AUDIT_EVENT
**(문서 나열 33 + §5 서술의 Domain Type·Resource Type 확장 요구 포함)**

> **스펙 §5 단서**: *"Rebate 전용 Approval Entity를 업무별로 복제하지 말고 공통 Canonical Approval
> Foundation을 구축한 뒤 Domain Type과 Resource Type으로 확장하라."*

## §7. 요구 — 열거형/타입 (스펙 §6~§27 · §44 · §48~§52)

| 스펙 § | 대상 | 항목 수 |
|---|---|---|
| §6 | Approval Domain Type | ~~31~~ → **32** 🔴 |
| §7 | Approval Request 필수 필드 | ~~31~~ → **35** 🔴 |
| §7 | Request Type | **24** |
| §8 | Approval Request Version 필드 | ~~19~~ → **21** 🔴 |
| §8 | Version Type | **10** |
| §9 | Approval Request Resource 필드 | **15** |
| §9 | Relationship Type | **11** |
| §10 | Approval Request Action 필드 | **15** |
| §11 | Approval Request Context 필드 | ~~23~~ → **24** 🔴 |
| §12 | Approval Case 필드 | ~~26~~ → **28** 🔴 |
| §13 | Case↔Request 관계 (지원 6 · 금지 5) | **11** |
| §14 | Approval Case Version 필드 | ~~15~~ → **16** 🔴 |
| §15 | Approval Item 필드 | ~~25~~ → **24** 🔴 (REQ 과다) |
| §15 | Item Type | **14** |
| §16 | Item 처리 방식 (지원 10 · 차단 5) | **15** |
| §17 | Approval Requirement 필드 | ~~25~~ → **26** 🔴 |
| §17 | Requirement Type | **20** |
| §18 | Requirement Source Type | **16** |
| §18 | Requirement Source 필드 | ~~9~~ → **10** 🔴 |
| §19 | Participant Type | **15** |
| §19 | Participant 필드 | ~~15~~ → **16** 🔴 |
| §20 | Approval Actor 필드 | **22** |
| §20 | Actor Type | **8** |
| §21 | Actor Authorization Snapshot 필드 | ~~21~~ → **22** 🔴 |
| §22 | Approval Decision 필드 | **27** |
| §22 | Decision Type | **14** |
| §23 | Decision Effect | **12** |
| §24 | Decision Reason Code | **28** |
| §24 | Decision Reason 필드 | ~~9~~ → **10** 🔴 |
| §25 | Decision Condition 종류 | **17** |
| §25 | Decision Condition 필드 | ~~11~~ → **12** 🔴 |
| §26 | Decision Obligation | **16** |
| §27 | Request Status | ~~25~~ → **26** 🔴 |
| §27 | Case Status | **22** |
| §28 | Status History 필드 | **12** |
| §29 | Request 허용 전이 | **22** |
| §30 | Resource Snapshot 필드 | ~~21~~ → **22** 🔴 |
| §30 | Snapshot Type | **8** |
| §31 | Critical Field 변경 목록 | ~~23~~ → **22** 🔴 (REQ 과다) |
| §32 | Context Snapshot 필드 | ~~19~~ → **18** 🔴 (REQ 과다) |
| §33 | Policy Reference 필드 | ~~14~~ → **15** 🔴 |
| §33 | Policy Type | **13** |
| §34 | Correlation 대상 | **18** |
| §34 | Correlation 필드 | ~~11~~ → **12** 🔴 |
| §35 | Idempotency 필드 | ~~14~~ → **15** 🔴 |
| §35 | Idempotency Resolution | **6** |
| §36 | Withdrawal 필드 | ~~12~~ → **13** 🔴 |
| §37 | Cancellation 필드 | ~~14~~ → **15** 🔴 |
| §37 | Cancellation Type | **10** |
| §38 | Reopen 필드 | ~~14~~ → **15** 🔴 |
| §38 | Reopen Type | **9** |
| §39 | Supersession 필드 | ~~13~~ → **14** 🔴 |
| §39 | Supersession Type | **9** |
| §40 | Execution Binding 필드 | ~~19~~ → **20** 🔴 |
| §41 | Consumption 필드 | **17** |
| §41 | Consumption 차단 항목 | **9** |
| §42 | Candidate 필드 | ~~22~~ → **26** 🔴 (최대 격차) |
| §43 | Reconciliation 비교 대상 | **19** |
| §43 | Reconciliation 필드 | **14** |
| §44 | Reconciliation 상태 | **22** |
| §45 | Critical Gap 후보 | **21** |
| §46 | 최소 Static Lint | **19** |
| §47 | 최소 Runtime Guard | **30** |
| §48 | Error Contract | **35** |
| §49 | Warning Contract | **18** |
| §50 | Evidence 필드 | **35** |
| §50 | Evidence 저장 금지 | **7** |
| §51 | Audit Event | **26** |
| §52 | 기존 구현 분류 | **25** |
| §53 | 중복 구현 감사 대상 | **18** |

## §8. 요구 — 실행 절차 (스펙 §54 · **23 Step**)

Step 1 전수조사 → 2 Canonical Domain → 3 Domain Type 등록 → 4 Request → 5 Request Version →
6 Case → 7 Item → 8 Requirement → 9 Participant·Actor → 10 Actor Authorization Snapshot →
11 Decision → 12 Status State Machine → 13 Resource·Context Snapshot → 14 Policy Reference →
15 Correlation → 16 Idempotency → 17 Withdrawal·Cancellation → 18 Reopen·Supersession →
19 Execution Binding·Consumption → 20 Candidate·Reconciliation → 21 Static Lint·Runtime Guard →
22 기존 구현 분류·통합 계획 → 23 ADR·PM 이력 갱신

## §9. 요구 — 산출 문서 (스펙 §55 · **56 + ADR 1 + PM 3 = 60**)

🔴 **이것이 커버리지 문서 축의 분모다.**

| # | 경로 |
|---|---|
| 1 | `docs/segmentation/DSAR_APPROVAL_DOMAIN_TYPE.md` |
| 2 | `docs/segmentation/DSAR_APPROVAL_REQUEST.md` |
| 3 | `docs/segmentation/DSAR_APPROVAL_REQUEST_TYPE.md` |
| 4 | `docs/segmentation/DSAR_APPROVAL_REQUEST_STATUS.md` |
| 5 | `docs/segmentation/DSAR_APPROVAL_REQUEST_VERSION.md` |
| 6 | `docs/segmentation/DSAR_APPROVAL_REQUEST_RESOURCE.md` |
| 7 | `docs/segmentation/DSAR_APPROVAL_REQUEST_ACTION.md` |
| 8 | `docs/segmentation/DSAR_APPROVAL_REQUEST_CONTEXT.md` |
| 9 | `docs/segmentation/DSAR_APPROVAL_CASE.md` |
| 10 | `docs/segmentation/DSAR_APPROVAL_CASE_STATUS.md` |
| 11 | `docs/segmentation/DSAR_APPROVAL_CASE_VERSION.md` |
| 12 | `docs/segmentation/DSAR_APPROVAL_CASE_RELATIONSHIP.md` |
| 13 | `docs/segmentation/DSAR_APPROVAL_ITEM.md` |
| 14 | `docs/segmentation/DSAR_APPROVAL_ITEM_TYPE.md` |
| 15 | `docs/segmentation/DSAR_APPROVAL_ITEM_PROCESSING_MODE.md` |
| 16 | `docs/segmentation/DSAR_APPROVAL_REQUIREMENT.md` |
| 17 | `docs/segmentation/DSAR_APPROVAL_REQUIREMENT_TYPE.md` |
| 18 | `docs/segmentation/DSAR_APPROVAL_REQUIREMENT_SOURCE.md` |
| 19 | `docs/segmentation/DSAR_APPROVAL_PARTICIPANT.md` |
| 20 | `docs/segmentation/DSAR_APPROVAL_PARTICIPANT_TYPE.md` |
| 21 | `docs/segmentation/DSAR_APPROVAL_ACTOR.md` |
| 22 | `docs/segmentation/DSAR_APPROVAL_ACTOR_AUTHORIZATION_SNAPSHOT.md` |
| 23 | `docs/segmentation/DSAR_APPROVAL_DECISION.md` |
| 24 | `docs/segmentation/DSAR_APPROVAL_DECISION_TYPE.md` |
| 25 | `docs/segmentation/DSAR_APPROVAL_DECISION_EFFECT.md` |
| 26 | `docs/segmentation/DSAR_APPROVAL_DECISION_REASON.md` |
| 27 | `docs/segmentation/DSAR_APPROVAL_DECISION_CONDITION.md` |
| 28 | `docs/segmentation/DSAR_APPROVAL_DECISION_OBLIGATION.md` |
| 29 | `docs/segmentation/DSAR_APPROVAL_STATUS_HISTORY.md` |
| 30 | `docs/segmentation/DSAR_APPROVAL_ALLOWED_TRANSITIONS.md` |
| 31 | `docs/segmentation/DSAR_APPROVAL_RESOURCE_SNAPSHOT.md` |
| 32 | `docs/segmentation/DSAR_APPROVAL_CONTEXT_SNAPSHOT.md` |
| 33 | `docs/segmentation/DSAR_APPROVAL_CRITICAL_FIELD_CHANGE_POLICY.md` |
| 34 | `docs/segmentation/DSAR_APPROVAL_POLICY_REFERENCE.md` |
| 35 | `docs/segmentation/DSAR_APPROVAL_CORRELATION.md` |
| 36 | `docs/segmentation/DSAR_APPROVAL_IDEMPOTENCY.md` |
| 37 | `docs/segmentation/DSAR_APPROVAL_WITHDRAWAL.md` |
| 38 | `docs/segmentation/DSAR_APPROVAL_CANCELLATION.md` |
| 39 | `docs/segmentation/DSAR_APPROVAL_REOPEN.md` |
| 40 | `docs/segmentation/DSAR_APPROVAL_SUPERSESSION.md` |
| 41 | `docs/segmentation/DSAR_APPROVAL_EXECUTION_BINDING.md` |
| 42 | `docs/segmentation/DSAR_APPROVAL_CONSUMPTION.md` |
| 43 | `docs/segmentation/DSAR_APPROVAL_CANDIDATE.md` |
| 44 | `docs/segmentation/DSAR_APPROVAL_RECONCILIATION.md` |
| 45 | `docs/segmentation/DSAR_APPROVAL_RECONCILIATION_STATUS.md` |
| 46 | `docs/segmentation/DSAR_APPROVAL_CRITICAL_GAP_POLICY.md` |
| 47 | `docs/segmentation/DSAR_APPROVAL_FOUNDATION_STATIC_LINT.md` |
| 48 | `docs/segmentation/DSAR_APPROVAL_FOUNDATION_RUNTIME_GUARDS.md` |
| 49 | `docs/segmentation/DSAR_APPROVAL_ERROR_WARNING_CONTRACT.md` |
| 50 | `docs/segmentation/DSAR_APPROVAL_EVIDENCE.md` |
| 51 | `docs/segmentation/DSAR_APPROVAL_AUDIT_EVENT.md` |
| 52 | `docs/segmentation/DSAR_APPROVAL_EXISTING_IMPLEMENTATION.md` |
| 53 | `docs/segmentation/DSAR_APPROVAL_DUPLICATE_IMPLEMENTATION_AUDIT.md` |
| 54 | `docs/segmentation/DSAR_APPROVAL_FUNCTION_REGRESSION_GATE.md` |
| 55 | `docs/architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md` |
| 56 | `docs/pm/PM_CHANGE_HISTORY.md` (갱신) |
| 57 | `docs/pm/REPEAT_PROBLEM_HISTORY.md` (갱신) |
| 58 | `docs/pm/AGENT_EXECUTION_HISTORY.md` (갱신) |

> **스펙 §55 원문 나열 실측 = 54 `DSAR_*` + 1 `ADR_*` + 3 `PM` = 58 경로.**
> **스펙 §55 는 합계 숫자를 제시하지 않는다** — 위 58 은 **289차가 원문 나열을 직접 센 값**이다(방법: 나열 항목 수).
> ⚠️ **요약 산술을 새로 만들어 인용하지 말 것.** 본 표의 **행 수가 정본**이며, 숫자가 필요하면 **이 표를 세라**
> (289차 ② 351 사건 = 근거 없는 숫자가 복제돼 정본이 된 사고 · ⑤ §2-2 축 혼합 금지).

## §10. 요구 — 매트릭스 (스펙 §56~§60 · **5 종**)

Approval Request Matrix · Approval Case Matrix · Approval Decision Matrix ·
Approval Execution Matrix · Approval Reconciliation Matrix

## §11. 요구 — 검증 게이트 (스펙 §61 · **32 항목**)

Request↔Resource 분리 · Request↔Case 분리 · Case↔Item 분리 · Requirement↔Decision 분리 ·
Request Version 보존 · Case Version 보존 · Resource·Action·Amount·Currency·Scope 기록 ·
Tenant·Workspace·Legal Entity·Environment 기록 · Item별 독립 Decision · Partial Approval 기반 ·
Requirement Source·Policy Version 보존 · Participant↔Actor 구분 · Actor Authorization Snapshot 보존 ·
Decision Append-only · Rejection Reason 강제 · Conditional Condition·Obligation 지원 ·
상태 전이 통제 · Resource Snapshot 보존 · Context Snapshot 보존 · Critical Field 변경 시 재승인 검토 ·
Correlation·Idempotency 구축 · Withdrawal↔Cancellation 구분 · Reopen↔Supersession 구분 ·
Execution Binding 연결 · Consumption 기록 · Amount·Currency·Action·Scope 초과 차단 ·
UI·API·ERP·Provider Reconciliation · Static Lint·Runtime Guard 작동 · 기존 기능 회귀 없음 ·
중복 Foundation 미생성 · ADR·PM·Repeat·Agent History 갱신 · 다음 단계 실행 가능

## §12. 요구 — 완료 보고 (스펙 §62 · **50 항목**)

1 Domain Type 수 · 2 Request 수 · 3 Request Version 수 · 4 Resource Binding 수 · 5 Action Binding 수 ·
6 Case 수 · 7 Case Version 수 · 8 Item 수 · 9 Requirement 수 · 10 Requirement Source 수 ·
11 Participant 수 · 12 Actor 수 · 13 Actor Authorization Snapshot 수 · 14 Decision 수 · 15 Approve 수 ·
16 Reject 수 · 17 Conditional 수 · 18 Changes Required 수 · 19 Condition 수 · 20 Obligation 수 ·
21 Status Transition 수 · 22 Invalid Transition 차단 수 · 23 Resource Snapshot 수 · 24 Context Snapshot 수 ·
25 Policy Reference 수 · 26 Correlation 수 · 27 Duplicate 탐지 수 · 28 Withdrawal 수 · 29 Cancellation 수 ·
30 Reopen 수 · 31 Supersession 수 · 32 Execution Binding 수 · 33 Consumption 수 · 34 Single-use 재사용 차단 수 ·
35 Amount 초과 차단 수 · 36 Currency 불일치 차단 수 · 37 Action 불일치 차단 수 · 38 Scope 초과 차단 수 ·
39 Resource Version Drift 수 · 40 Reconciliation Mismatch 수 · 41 Static Lint Rule 수 · 42 Runtime Guard 수 ·
43 Existing Implementation 수 · 44 Duplicate Implementation 수 · 45 Migration Required 수 · 46 Manual Review 수 ·
47 Function Regression 수 · 48 생성·갱신 문서 · 49 남은 리스크 · 50 다음 단계 준비 상태

## §13. 요구 — 완료 조건 (스펙 §63 · **40 항목**)

1 Domain Type · 2 Request · 3 Request Version · 4 Request Resource · 5 Request Action · 6 Request Context ·
7 Case · 8 Case Version · 9 Item · 10 Requirement · 11 Requirement Source · 12 Participant · 13 Actor ·
14 Actor Authorization Snapshot · 15 Decision · 16 Decision Reason · 17 Conditional Condition · 18 Obligation ·
19 Status State Machine · 20 Status History · 21 Resource Snapshot · 22 Context Snapshot ·
23 Critical Field Change Policy · 24 Policy Reference · 25 Correlation · 26 Idempotency · 27 Withdrawal ·
28 Cancellation · 29 Reopen · 30 Supersession · 31 Execution Binding · 32 Consumption · 33 Candidate ·
34 Reconciliation · 35 Static Lint·Runtime Guard · 36 기존 구현 분류 · 37 중복 통합 계획 ·
38 기존 정상 기능 회귀 없음 · 39 ADR·PM·Repeat·Agent History 갱신 · 40 다음 단계용 검증된 Foundation 준비

---

## §13-1. 🔴 289차 집계 오류 **25축** — **원문이 정본** (전사 에이전트 3그룹 실측)

**본 문서의 개수는 289차가 손으로 센 값**이고, [원문](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md)과 기계 대조하니 **25축이 틀렸다.**

### ★체계적 원인 — 우연이 아니라 **하나의 반복된 실수**

| 오류 유형 | 축 수 | 원인 |
|---|---|---|
| **필드 축 −1**(REQ 과소) | **19** | 🔴 **필드 목록 끝의 `evidence` 를 매번 빠뜨렸다** — 스펙 전 엔티티가 `evidence` 로 끝나는데 그것을 "필드가 아닌 부록"으로 무의식 처리 |
| 필드 축 −2 이상 | 4 | §7(31→**35**) · §8(19→**21**) · §12(26→**28**) · §42(22→**26**) |
| **REQ 과다**(+1) | 2 | §15 Item(25→**24**) · §32 Context Snapshot(19→**18**) · §31 Critical Field(23→**22**) |

> ★**11개 축이 정확히 1씩 모자란 것은 우연일 수 없다** — **같은 실수를 11번 반복**했다.
> **손으로 세면 틀리는 게 아니라, 손으로 세면 "일관되게" 틀린다.** 편향은 무작위 오차보다 위험하다.

### 정정 내역 (전 25축 · 원문이 정본)

**필드 −1**: §19 15→**16** · §21 21→**22** · §24 9→**10** · §25 11→**12** · §30 21→**22** · §33 14→**15** ·
§34 11→**12** · §35 14→**15** · §36 12→**13** · §37 14→**15** · §38 14→**15** · §39 13→**14** · §40 19→**20** ·
§11 23→**24** · §14 15→**16** · §17 25→**26** · §18 9→**10** · §27 25→**26** · §6 31→**32**
**필드 −2 이상**: §7 31→**35** · §8 19→**21** · §12 26→**28** · §42 22→**26**(최대 격차)
**REQ 과다**: §15 25→**24** · §32 19→**18** · §31 23→**22**

> ★**전사 에이전트가 이 격차를 "조용히 맞추지 않고" 문서에 명기**했다 — 지시가 그랬기 때문이다
> (*"숫자를 조용히 맞추지 마라 — 그것이 289차 ② 351 사건의 재현이다"*).
> **만약 맞췄다면 §42 는 26 요구 중 22 만 세면서 100% 를 보고했을 것**이다 — **분모 축소 = 가짜 100%**.
>
> ★**교훈 2**: 개수를 손으로 세면 **틀린다**. §14 표는 **참고용 축 정의**이며 **정본은 항상 원문**이다.
> 인용이 필요하면 [원문](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md)의 해당 § 를 **직접 세라**.

## §14. 분모 집계 (축별 · ★축 혼합 금지 · ★수치는 참고 — 정본은 원문)

🔴 **단일 숫자로 요약하지 말 것.** 아래는 **서로 다른 것을 세는 독립 축**이다(1-6 E-01).

| 축 | 스펙 근거 | 요구 수 |
|---|---|---|
| **기반 구성요소** | §0 | **24** |
| **답해야 할 질문** | §0 | **23** |
| **실행 역할** | §2 | **24** |
| **선행조건** | §3 | **89** (17+13+18+41) |
| **핵심 원칙** | §4 | **10** |
| **Canonical Entity** | §5 | **33** (문서 나열 기준) |
| **★산출 문서** | §55 | **58** (나열 행 수 · 요약 산술 "60" 금지) |
| **매트릭스** | §56~60 | **5** |
| **실행 절차 Step** | §54 | **23** |
| **검증 게이트** | §61 | **32** |
| **완료 보고** | §62 | **50** |
| **완료 조건** | §63 | **40** |

**인용 규칙**: 커버리지를 말할 때는 **반드시 축을 명시**하라 —
예: *"산출 문서 축 = 58 중 N"*. 축 없는 "커버리지 X%" 는 **무의미하며 오독을 만든다**.

---

## §15. 자율본 양보 대상 (RP-002 · 무후퇴)

**289차 5회차에 스펙 없이 만든 5-3 자율본이 존재한다.** 5-2 선례(RP-002)에 따라 **스펙 수령분이 우선**이며,
자율본은 **삭제하지 않고 참고 이력으로 보존**한다(무후퇴).

| 자율본 | 처리 |
|---|---|
| `CANONICAL_DSAR_AUTHORIZATION_APPROVAL_WORKFLOW.md` | **양보** — 스펙 수령분이 정본. 삭제 금지·참고 보존 |
| `CANONICAL_DSAR_AUTHORIZATION_RISK_BASED_DECISION.md` | **양보** — 상당 부분이 `5-3-5`(Risk-Based) 범위. 본 블록 범위 밖 |
| 관련 ADR | **양보** — 위와 동일 |

> ⚠️ **자율본의 내용을 본 분모에 섞지 말 것.** 분모는 **스펙 원문에서만** 나온다 —
> 자율본을 분모에 넣으면 **자기가 쓴 것을 요구로 삼는 역산**이 된다(⑤ §1-1).

---

## §16. 비파괴 확인

- **코드 변경 0** — 본 문서는 **분모 영속**이 목적이다
- **요구 날조 0** — 스펙 원문 항목만 전사(轉寫). 해석·판단·취사선택은 Canonical 문서에서 수행
- **기존 문서 무수정** — 자율본은 보존(§15)
- **[`COVERAGE_REQUIREMENT_REGISTRY_06A.md`](./COVERAGE_REQUIREMENT_REGISTRY_06A.md) 갱신 대상**: 본 블록 `source_persisted = true`
