# DSAR — ERRE Resolution Explain Engine (XAI) (EPIC 06-A-03-02-03-04 Part 3-7)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §17(Explain Engine) · §19(Evidence)
> **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: 근거 없는 결론 금지(Explainable Authorization) · **반날조**: `파일:라인`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만 · SecurityAudit 해시체인=KEEP_SEPARATE(감사≠설명) · 289차 확정분 재플래그 금지

---

## 1. 목적

**Resolution Explain Engine**(SPEC §17)은 ERRE의 XAI(Explainable Authorization) 축이다. 산출된 effective 권한이 **왜 그렇게 결정되었는가**를 사람과 기계 모두가 이해할 수 있는 형태로 설명한다. SPEC §17 원문이 요구하는 설명 항목은 다음 6가지다.

1. **왜 이 Role이 활성화되었는가**
2. **어떤 Assignment 때문인가**
3. **어떤 Rule 때문인가**
4. **어떤 Scope 때문인가**
5. **어떤 Policy 때문인가**
6. **어떤 Deny 때문인가**

Explain 결과는 **사람이 읽는 형태(human-readable)와 JSON 형태**를 모두 제공해야 한다(SPEC §17 말미).

목적의 본질은 GeniegoROI Authorization의 최상위 원칙인 "근거 없는 결론 금지"의 권한 도메인 구현이다. 접근 허용/거부 결정마다 그 근거 체인(Assignment→Role→Scope→Policy→Deny)을 추적 가능하게 노출해 감사·이의제기·최소권한 검증을 가능케 한다. 이는 SPEC §19 Evidence Engine(Rule Evaluation·Policy Decision·Assignment Chain·Hierarchy Chain·Scope Resolution·Risk Evaluation 저장)과 결합해 완성된다.

## 2. Ground-Truth (substrate / ABSENT / KEEP_SEPARATE)

### 2.1 판정 요약 — **ABSENT (순신규 그린필드)**

권한 결정에 대한 "왜"를 설명하는 XAI 경로는 백엔드 실코드 **grep 0**이다(Ground-Truth ② §2 표 #6 "Simulation/Explain(XAI) = ABSENT"). 현행 권한 계산(`TeamPermissions.php:393` `effectiveForUser`)은 effective role/permission/scope를 **반환만** 하고, 그 결정 근거(어떤 assignment·어떤 clamp·어떤 deny 센티넬 때문인지)를 구조화해 함께 반환하지 않는다. Evidence 저장(Rule Evaluation·Policy Decision·Assignment Chain 등)도 부재하다.

### 2.2 실 substrate 부재 대조표

| SPEC §17 설명 항목 | 산출은 하나 "왜"를 노출하지 않는 실 substrate | 판정 | 근거 |
|---|---|---|---|
| 왜 이 Role이 활성인가 | `roleOf`(`TeamPermissions.php:120`)·`effectiveForUser`(`:393`) — role 판정은 하나 근거 체인 미노출 | **ABSENT**(설명 경로 없음) | Ground-Truth ① §2-A |
| 어떤 Assignment 때문인가 | `subjectPerms`(`:202`)·`subjectScope`(`:215`) — acl_permission/data_scope 조회는 하나 결정 귀속 미기록 | **ABSENT** | Ground-Truth ① §2-A |
| 어떤 Rule 때문인가 | `clampActions`(`:423`)·`scopeWithinCap`(`:356`) 내부 분기 — 설명 산출 없음 | **ABSENT** | Ground-Truth ② §2 #6 |
| 어떤 Scope 때문인가 | `effectiveScope`(`:236`)·`scopeValuesFor`(`:272`) — scope는 계산하나 근거 미설명 | **ABSENT** | Ground-Truth ① §2-A |
| 어떤 Policy 때문인가 | `requirePlan`(`UserAuth.php:364`)·`PlanPolicy::allows`(`PlanPolicy.php:53`) — 게이트 통과/거부는 하나 사유 구조화 없음 | **ABSENT** | Ground-Truth ① §2-C·D |
| 어떤 Deny 때문인가 | `__deny__` 센티넬(`TeamPermissions.php:234`→`:272`→`:286`) — deny는 발동하나 "왜 deny인지" 설명 없음 | **ABSENT** | Ground-Truth ① §3 |
| human + JSON 이중 출력 | — | **ABSENT**(grep 0) | Ground-Truth ② §2 #6 |
| Evidence 저장(§19) | — | **ABSENT** | Ground-Truth ② §2 #6 |

### 2.3 KEEP_SEPARATE — 감사·해시체인은 "설명"이 아니다 (오흡수 금지)

Ground-Truth ② §4가 확정한 대로, 다음은 **권한 결정 설명(XAI)이 아니다.** ERRE Explain substrate로 인용 금지.

- `SecurityAudit.php:25~:31`·`:56~:64`(append-only hash chain) — **감사 로그(무엇이 일어났는가)**이지 결정 근거 설명(왜 그렇게 결정했는가)이 아니다. 감사≠설명. (289차 정정: 해시체인은 tamper-evident도 아님 — 재오염 금지.)
- `Risk.php:12`·`:81`·`:91`(churn ML `drivers`) — 마케팅 이탈예측의 기여요인이지 권한 결정 근거가 아니다. **권한 아님.**
- `Alerting.php:665`("executor identity") — 알림 실행자이지 resolution executor·설명이 아니다.

특히 `Risk.php`의 `drivers`는 "XAI/설명"이라는 표면 유사성이 강하나, 입력이 role/assignment/scope가 아니라 고객 행동 피처이므로 오흡수 절대 금지.

## 3. Canonical 설계

### 3.1 Canonical Entity — `APPROVAL_ROLE_RESOLUTION_EXPLAIN`(SPEC §2)

전량 신규. 핵심 필드:

| # | 필드 | 의미 |
|---|---|---|
| 1 | explain_id | 설명 식별자 |
| 2 | tenant | 테넌트 격리 |
| 3 | subject_ref | 설명 대상 Subject |
| 4 | snapshot_ref | 설명 대상 effective snapshot(§18) |
| 5 | decision_target | 설명 대상 결정(특정 role/permission/scope/deny) |
| 6 | role_activation_reason | 활성 role의 근거(§17-1) |
| 7 | assignment_chain | 귀속 Assignment 체인(§19·§17-2) |
| 8 | rule_reason | 발동 Rule 근거(§17-3) |
| 9 | scope_reason | scope 결정 근거(§17-4) |
| 10 | policy_reason | policy 결정 근거(§17-5) |
| 11 | deny_reason | deny 발동 근거(§17-6) |
| 12 | human_readable | 사람이 읽는 서술 |
| 13 | json_form | 기계 판독 JSON |

### 3.2 이중 출력 계약

- **human_readable**: "member X는 team T의 write 권한이 없어 차단됨 — guardTeamWrite(member 전역 read-only)" 형태의 자연어 서술.
- **json_form**: 동일 근거를 구조화(`{decision, role, assignment_chain[], deny:{type, source, sentinel}}`)해 API·감사 시스템이 파싱 가능하게 제공.
- 두 형태는 **동일 근거의 두 표현**이어야 한다(내용 불일치 금지).

### 3.3 Evidence 결합(SPEC §19)

Explain은 Evidence Engine이 저장한 Rule Evaluation·Policy Decision·Assignment Chain·Hierarchy Chain·Scope Resolution·Risk Evaluation을 소비해 설명을 조립한다. Evidence는 Resolution Pipeline(§4) 실행 중 각 단계가 남기는 결정 기록이며, Explain은 이를 subject/snapshot 기준으로 재구성한다.

## 4. Kernel 매핑 (설명 근거의 발생 지점)

Explain의 각 항목은 SPEC §4 Pipeline의 특정 단계 결정을 근거로 삼는다. 실 substrate는 결정을 내리나 근거를 노출하지 않으므로, 승격 시 **각 단계에 근거 기록(Evidence emit)을 추가**해야 한다.

| §17 설명 항목 | 근거 발생 Pipeline 단계 | 승격 대상 substrate | 판정 |
|---|---|---|---|
| Role 활성 근거 | Subject Resolution·Assignment Collection(§4-1·3) | `roleOf`(`:120`)·`subjectPerms`(`:202`) | 근거 emit 추가 |
| Assignment 근거 | Assignment Collection(§4-3) | `subjectScope`(`:215`)·`assignableMap`(`:381`) | 근거 emit 추가 |
| Rule 근거 | Dynamic Evaluation·Conflict Detection(§4-6·13) | `clampActions`(`:423`)·`scopeWithinCap`(`:356`) | 근거 emit 추가 |
| Scope 근거 | Scope Projection(§4-7) | `effectiveScope`(`:236`)·`scopeValuesFor`(`:272`) | 근거 emit 추가 |
| Policy 근거 | Policy Evaluation(§4-12) | `requirePlan`(`UserAuth.php:364`)·`PlanPolicy::allows`(`PlanPolicy.php:53`) | 근거 emit 추가 |
| Deny 근거 | Explicit Deny Projection(§4-9) | `__deny__`(`TeamPermissions.php:234`)·`guardTeamWrite`(`UserAuth.php:1167`) | 근거 emit 추가 |

핵심: 실 substrate는 **결정은 하나 근거를 버린다**. Explain은 이 결정 로직을 재사용하되 각 분기점에서 근거를 구조화해 보존하는 계층이다.

## 5. 무후퇴 · Extend

- **Golden Rule(Extend, ADR D-1)**: Explain은 `effectiveForUser`/`effectiveScope`/`requirePlan` 등 결정 로직을 **대체하지 않는다.** 동일 결정 경로에 근거 기록(Evidence emit) 훅을 얹어 설명을 파생한다.
- **무후퇴**: 근거 기록 추가는 결정 결과(허용/거부)를 바꾸지 않는다 — 오직 "왜"를 추가 노출할 뿐. 성능 경로(hot path)에서는 Evidence emit을 lock-free·비동기로 설계해 P95≤20ms(§35)를 침해하지 않는다.
- **KEEP_SEPARATE 유지**: SecurityAudit 해시체인(감사)·Risk drivers(마케팅 XAI)는 각 도메인에 존치, Explain으로 통합 금지. 감사와 설명은 별개 계층으로 병행.
- **P1~P5 재활용**: 289차 admin SSOT(`resolveAdminByToken` `UserAuth.php:2998`)·plan fail-secure(`requireFeaturePlan` `:77`)는 Explain의 Subject/Policy 근거 substrate로 재활용(재플래그 금지).

## 6. 완료 게이트

- [ ] `APPROVAL_ROLE_RESOLUTION_EXPLAIN` Canonical Entity 실 구현
- [ ] 6개 설명 항목(Role/Assignment/Rule/Scope/Policy/Deny) 근거 체인 산출
- [ ] human_readable + json_form 이중 출력·내용 일치 검증
- [ ] Pipeline 각 단계 Evidence emit 훅 배선(§19 결합)·성능 무후퇴(§35)
- [ ] SPEC §32 API `Explain Authorization` 배선
- [ ] KEEP_SEPARATE(SecurityAudit/Risk drivers) 미통합 회귀 검증
- [ ] **BLOCKED_PREREQUISITE 해소**: 선행 Resolution Pipeline·Evidence·Snapshot 실구현 후 별도 승인세션(RP-track)
- [ ] 본 편 코드/DB 변경 **0** 유지 · NOT_CERTIFIED

## 7. 반날조 인용 출처

- SPEC §17(Explain Engine 6항목·human+JSON)·§19(Evidence)·§4(Pipeline)·§18(Snapshot)·§32(API)·§35(성능)
- ADR D-1(Extend)·D-5(KEEP_SEPARATE)·D-7(정직 분리)
- Ground-Truth ① §2-A(`TeamPermissions.php:120`·`:202`·`:215`·`:234`·`:236`·`:272`·`:356`·`:381`·`:393`·`:423`)·§2-C(`UserAuth.php:77`·`:364`·`:1167`·`:2998`)·§2-D(`PlanPolicy.php:53`)·§3(deny 센티넬)
- Ground-Truth ② §2 표 #6(Explain XAI ABSENT)·§4(SecurityAudit `:25~:31`/`:56~:64`·Risk `:12`/`:81`/`:91`·Alerting `:665` = KEEP_SEPARATE)
- 그 외 모든 축은 **ABSENT**(grep 0) 정직 유지.
