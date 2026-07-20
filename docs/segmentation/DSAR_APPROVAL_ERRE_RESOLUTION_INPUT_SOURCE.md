# DSAR — ERRE Resolution Input Source (EPIC 06-A-03-02-03-04 Part 3-7)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §3(Resolution Input Source · 22입력)
> **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: 실재 과신·부재 과장 양방향 회피(ADR D-7) · **반날조**: `파일:라인`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만 · 근접물 오흡수 금지 · 289차 확정분 재플래그 금지

---

## 1. 목적

**Resolution Input Source**(SPEC §3)는 ERRE Resolution Pipeline이 effective 권한을 계산하기 위해 수집하는 **22종 입력 데이터의 정본 목록**이다. 본 편의 목적은 이 22 입력 각각을 현행 substrate에 정확히 매핑하여, 무엇이 실존하고(PRESENT/PARTIAL) 무엇이 순신규(ABSENT)인지 정직하게 확정하는 것이다.

이는 ERRE 설계의 출발점이다. Pipeline(§4)·Graph(§5)·Calculator(§7~12)가 모두 이 입력을 소비하므로, 입력 substrate의 실재/부재 판정이 후속 모든 편의 기반이 된다. ADR D-7의 양방향 회피 원칙 — "실재 과신 회피(`effectiveForUser`는 팀 한정 부분 PDP)"와 "부재 과장 회피(grep 0은 실측 부재지 숨겨진 구현 아님)" — 을 입력 단위로 엄격 적용한다.

## 2. Ground-Truth (22 입력 substrate 매핑)

SPEC §3의 22 입력을 5군으로 묶어 판정한다.

### 2.1 Assignment 계열 (부분 실존)

| # | SPEC §3 입력 | 판정 | 실 substrate / 근거 |
|---|---|---|---|
| 1 | Direct Assignment | **PARTIAL** | `subjectPerms`(`TeamPermissions.php:202`) acl_permission 직접 grant·`subjectScope`(`:215`) — 단 팀 도메인 한정 |
| 2 | Group Assignment | **PARTIAL** | team 상속(`effectiveForUser` `:393` member→team→own scope 상속) — 조직/그룹 일반화는 부재 |
| 3 | Organization Assignment | **ABSENT** | 조직 단위 assignment 부재(grep 0). tenant 격리(`:202` `WHERE tenant_id`)는 격리지 조직 role 아님 |
| 15 | Scoped Role | **PARTIAL** | `data_scope`(`:215`)·`effectiveScope`(`:236`)·`scopeWithinCap`(`:356`) — 9차원 중 일부만 실강제(Part 3-4 판정) |

### 2.2 Role 확장 계열 (대부분 순신규)

| # | SPEC §3 입력 | 판정 | 실 substrate / 근거 |
|---|---|---|---|
| 4 | Composite Role | **ABSENT** | role↔role 합성 그래프 부재(Ground-Truth ② §2 #2). manage=슈퍼셋(`:39`)은 action 슈퍼셋이지 composite role 아님 |
| 5 | Hierarchical Role | **PARTIAL(협소)** | owner>manager>member 3단 위계(`roleOf` `:120`·`isManagerAdmin` `:136`) — role 그래프 아닌 하드코딩 3단 |
| 6 | Dynamic Role | **ABSENT** | ABAC 룰 기반 동적 role 부재(Part 3-5 판정 대부분 ABSENT) |
| 8 | Conditional Role | **ABSENT** | 조건부 role 활성화 엔진 부재(grep 0) |

### 2.3 비인간·특수 Role 계열 (순신규)

| # | SPEC §3 입력 | 판정 | 실 substrate / 근거 |
|---|---|---|---|
| 7 | Session Role | **PARTIAL** | 세션→user row(`userByToken` `UserAuth.php:249`) team_role 기본값(`:316` `parent_user_id?member:owner`) — 세션 전용 role 아닌 user role 재사용 |
| 9 | Service Role | **PARTIAL** | api_key role(`index.php:573` viewer/connector/analyst/admin)이 유일 비인간 identity(Part 3-6) |
| 10 | Machine Role | **ABSENT** | 기계 전용 role 부재(grep 0) |
| 11 | Temporary Role | **ABSENT** | 시한부 role·TTL 부재 |
| 12 | Emergency Role | **ABSENT** | 긴급 role 부재. break-glass 명명 함수 부재(Ground-Truth ① §2-C 말미) |
| 13 | Delegated Role | **PARTIAL** | `assignableMap`(`:381`)·`putMemberPermissions`(`:641`) manager 위임(assignable 초과→403 DELEGATION_EXCEEDED)·`scopeWithinCap`(`:356`) — Approval Delegation 개념은 부재(Part 3-3 판정) |
| 14 | Break Glass Role | **ABSENT** | 명시적 break-glass 부재. `parent_user_id`가 위계 판정 substrate일 뿐(`:316`·`:120`) |

### 2.4 Policy·Deny 계열

| # | SPEC §3 입력 | 판정 | 실 substrate / 근거 |
|---|---|---|---|
| 16 | Permission Policy | **PARTIAL** | plan 게이트(`PlanPolicy::FEATURE_MIN_PLAN` `:27`·`allows` `:53`)·api_key scope(`index.php:587`)·owner-only(`UserAuth.php:1117` TEAM_OWNER_ONLY) — 통합 policy 모델 부재 |
| 17 | Explicit Deny | **PARTIAL** | `__deny__` 센티넬(`TeamPermissions.php:234`→`:286` `AND 1=0`)·member 전역차단(`guardTeamWrite` `UserAuth.php:1167`+`index.php:82`) — 행 단위 negative-ACL 레코드 부재(allow-only grant) |
| 18 | Runtime Policy | **ABSENT** | 런타임 정책 평가 엔진 부재(grep 0) |

### 2.5 Context·환경 계열 (대부분 순신규)

| # | SPEC §3 입력 | 판정 | 실 substrate / 근거 |
|---|---|---|---|
| 19 | Environment | **ABSENT** | 환경(prod/staging) 기반 권한 분기 부재. `GENIE_STRICT_AUTH`(`index.php:604`)는 무-tenant deny 토글이지 환경 role 아님 |
| 20 | Context | **PARTIAL** | tenant 컨텍스트(`authedTenant` `UserAuth.php:409`·`X-Act-As-Tenant` 임퍼소네이트)·X-Tenant-Id 주입(`index.php:608`) — 통합 Resolution Context 모델 부재 |
| 21 | Time Window | **PARTIAL** | 구독 만료(`resolveActivePlan` `UserAuth.php:119` 만료→free)·api_key expires(`Keys.php:99`)·유휴 자동로그아웃(`:249`) — 통합 시간창 constraint 부재 |
| 22 | Risk Score | **ABSENT** | role→risk 등급 계산기 부재(Ground-Truth ② §2 #7). MFA 정적게이트(`UserAuth.php:941`)는 risk-score 없는 정적 분기 |

### 2.6 KEEP_SEPARATE (입력원으로 오흡수 금지)

- `Risk.php:12`·`:81`·`:91`(churn ML probability/drivers) — Risk Score 입력처럼 보이나 **마케팅 이탈예측**이지 권한 risk 아님(Ground-Truth ② §4). #22 Risk Score를 이것으로 채우면 가짜녹색.
- `RuleEngine.php`(channel_roas/sku_stock) — Dynamic Role 입력처럼 보이나 캠페인 자동제어. **권한 아님.**
- `Connectors.php:819`(채널 캐시)·`ChannelRegistry.php` — Context/Registry 입력 아님.

## 3. Canonical 설계

### 3.1 22 입력의 canonical 수집 계약

ERRE Resolution Pipeline(§4)의 초기 3단계(Subject Resolution→Identity Validation→Assignment Collection)가 22 입력을 canonical 형태로 정규화·수집한다. 각 입력은 출처(source)·신뢰(trust)·수집시각을 태깅해 Evidence(§19)로 기록한다.

- **Direct/Group/Org Assignment(#1~3)**: `subject_type × subject_id × grant` 정규 레코드로 통합. 현행 acl_permission(user/team subject)을 org 차원까지 확장.
- **Role 확장(#4~6, #8)**: Composite/Hierarchical/Dynamic/Conditional을 Role Graph(§5) 노드·엣지로 표현(순신규).
- **비인간·특수(#7, #9~14)**: Session/Service/Machine/Temporary/Emergency/Delegated/Break Glass를 Subject 유형 분류로 통합(대부분 순신규).
- **Policy·Deny(#16~18)**: 분산된 plan/scope/owner-only/deny 센티넬을 통합 Policy·Deny 입력으로 승격.
- **Context·환경(#19~22)**: Environment/Context/Time Window/Risk를 Resolution Context(§6)·Effective Risk(§12) 입력으로 통합.

### 3.2 입력→Pipeline 매핑

22 입력은 §4 Pipeline 순서대로 소비된다: #1~3(Assignment Collection)→#4~5(Hierarchy/Composite Expansion)→#6·8(Dynamic Evaluation)→#15(Scope Projection)→#17(Deny Projection)→#22(Risk Projection)→#16·18(Policy Evaluation)→#19~21(Context 전 단계 관통).

## 4. Kernel 매핑 (입력별 실존/부재 요약)

| 입력군 | PRESENT/PARTIAL 개수 | ABSENT 개수 | 종합 |
|---|---|---|---|
| Assignment 계열(#1·2·3·15) | 3 PARTIAL | 1 ABSENT | 팀 한정 실존, org 순신규 |
| Role 확장(#4·5·6·8) | 1 PARTIAL | 3 ABSENT | 위계 3단만 협소 실존 |
| 비인간·특수(#7·9~14) | 3 PARTIAL | 4 ABSENT | api_key/위임만 실존 |
| Policy·Deny(#16·17·18) | 2 PARTIAL | 1 ABSENT | 분산 실존, 통합 부재 |
| Context·환경(#19~22) | 2 PARTIAL | 2 ABSENT | tenant/시간만 부분 |

**종합**: 22 입력 중 PARTIAL 11 · ABSENT 11. 실존 입력은 전부 **팀/plan/api_key 3차원에 분산**되어 있으며, 이를 하나의 canonical 입력 수집 계층으로 통합하는 Input Source 정규화기는 순신규(통합 PDP 부재, Ground-Truth ① §4).

## 5. 무후퇴 · Extend

- **Golden Rule(Extend, ADR D-1)**: 실존 입력 substrate(`subjectPerms`·`subjectScope`·`effectiveScope`·plan 게이트·api_key role)는 **파괴하지 않고** canonical Input Source 수집기의 소스로 승격한다. 팀 한정 로직을 org/plan/api_key 차원까지 확장.
- **양방향 정직(ADR D-7)**: 실존 11 입력을 "통합 완료"로 과신 금지(팀/plan/api_key에 분산). ABSENT 11 입력을 "숨겨진 구현"으로 과장 금지(grep 0은 실측 부재).
- **무후퇴**: 입력 수집 통합은 기존 게이트 통과 로직을 바꾸지 않는다 — 동일 입력을 canonical 형태로 정규 수집할 뿐. 3-rank 직교 게이트(미들웨어 RBAC→guardTeamWrite→requirePlan)는 ERRE 완성까지 병행.
- **KEEP_SEPARATE 유지**: Risk churn ML·RuleEngine·Connectors 캐시는 입력원으로 흡수 금지.

## 6. 완료 게이트

- [ ] 22 입력 canonical 정규화·수집 계층 실 구현(source/trust/시각 태깅)
- [ ] 실존 11 입력 substrate를 org/plan/api_key 차원까지 확장·통합
- [ ] ABSENT 11 입력(Org/Composite/Dynamic/Conditional/Machine/Temporary/Emergency/Break Glass/Runtime Policy/Environment/Risk) 순신규 구현
- [ ] 입력→Pipeline(§4) 소비 순서 배선·Evidence(§19) 기록
- [ ] KEEP_SEPARATE(Risk ML/RuleEngine) 미흡수 회귀 검증
- [ ] **BLOCKED_PREREQUISITE 해소**: 선행 foundation(Part 1~3-6) 인증 후 별도 승인세션(RP-track)
- [ ] 본 편 코드/DB 변경 **0** 유지 · NOT_CERTIFIED

## 7. 반날조 인용 출처

- SPEC §3(22 입력)·§4(Pipeline)·§5(Graph)·§6(Context)·§12(Risk)·§19(Evidence)
- ADR D-1(Extend)·D-5(KEEP_SEPARATE)·D-7(양방향 정직)
- Ground-Truth ① §2-A(`TeamPermissions.php:39`·`:120`·`:136`·`:202`·`:215`·`:234`·`:236`·`:286`·`:356`·`:381`·`:393`·`:641`)·§2-B(`index.php:82`·`:573`·`:587`·`:604`·`:608`)·§2-C(`UserAuth.php:119`·`:249`·`:316`·`:409`·`:941`·`:1117`·`:1167`)·§2-D(`PlanPolicy.php:27`·`:53`)·§2-E(`Keys.php:99`)·§4(통합 PDP 부재)
- Ground-Truth ② §2 #2(Composite/Graph ABSENT)·#6(Dynamic/Simulation ABSENT)·#7(Risk ABSENT)·§4(Risk `:12`/`:81`/`:91`·RuleEngine·Connectors `:819`·ChannelRegistry = KEEP_SEPARATE)
- ABSENT 판정 입력은 전부 grep 0 실측 — 근접물로 채우기 금지.
