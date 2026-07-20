# DSAR — ERRE: 해석 파이프라인 (APPROVAL_ROLE_RESOLUTION_PIPELINE)

> 거버넌스 상태: 설계 명세 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
> 상위 SPEC: docs/spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md
> 상위 ADR: docs/architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md
> Ground-Truth: DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION / _DUPLICATE_IMPLEMENTATION_AUDIT

---

## 1. 목적·범위

본 DSAR은 Canonical Entity **`APPROVAL_ROLE_RESOLUTION_PIPELINE`** — ERRE의 **18단계 실효 권한 해석 파이프라인**(SPEC §4) — 을 명세한다. 파이프라인은 Subject Resolution부터 Audit Logging까지 순서를 이루며 **순서 변경이 불가**하다(SPEC §4 L156 "Pipeline 순서는 변경 불가", ADR D-3).

18단계(SPEC §4 L137~154):

1. Subject Resolution
2. Identity Validation
3. Assignment Collection
4. Hierarchy Expansion
5. Composite Expansion
6. Dynamic Evaluation
7. Scope Projection
8. Constraint Projection
9. Explicit Deny Projection
10. Risk Projection
11. Permission Projection
12. Policy Evaluation
13. Conflict Detection
14. Effective Role Generation
15. Effective Permission Generation
16. Snapshot Generation
17. Cache Generation
18. Audit Logging

범위: 파이프라인의 단계 계약·순서 불변성·각 단계의 현행 substrate 매핑. 각 Calculator의 상세는 형제 엔티티 및 상위 계보 DSAR 참조.

**코드 변경 절대 0.** 설계 명세.

---

## 2. Ground-Truth 현황 (실존 substrate vs ABSENT)

### 2.1 파이프라인 자체 = ABSENT

Ground-Truth ② #1(L27)이 실측: `ResolutionPipeline|resolveGraph|Planner|Optimizer|Executor` **백엔드 실코드 0**. 권한 계산은 파이프라인 없이 `TeamPermissions.php:393`(`effectiveForUser`)이 **if/switch로 직접 산출**한다. 즉 18단계로 분해·정렬된 파이프라인 구조는 순신규 그린필드다.

### 2.2 단계별 substrate 매핑 (인라인 분산)

현행 `effectiveForUser` 내부에 인라인된 로직 및 미들웨어를 SPEC §4 단계에 매핑하면(Ground-Truth ① §2 "resolution kernel 매핑" 열 근거):

| SPEC §4 단계 | 현행 substrate (`파일:라인`) | 판정 |
|---|---|---|
| 1. Subject Resolution | `roleOf()` `TeamPermissions.php:120` · `isAdmin` `:132` · `userByToken` `UserAuth.php:249` · `index.php:573` roleRank · `PlanPolicy.php:41` `rank()` | PARTIAL(차원별 분산) |
| 2. Identity Validation | `userByToken` 세션검증·유휴 자동로그아웃 `UserAuth.php:249` · `authedTenant` `:409` | PARTIAL |
| 3. Assignment Collection | `subjectPerms()` `TeamPermissions.php:202` · `subjectScope()` `:215` · `assignableMap()` `:381` · `index.php:575` role/scopes 로드 | PARTIAL |
| 4. Hierarchy Expansion | `parent_user_id` 위계(`roleOf:120`·`userByToken:316`) — role↔role 그래프 아님 | 약PARTIAL |
| 5. Composite Expansion | ABSENT(composite role 확장 없음) | ABSENT |
| 6. Dynamic Evaluation | ABSENT(권한 dynamic rule 부재; 마케팅 RuleEngine=KEEP_SEPARATE) | ABSENT |
| 7. Scope Projection | `effectiveScope()` `:236` · `scopeValuesFor()` `:272` · `scopeSql()` `:286` | PRESENT |
| 8. Constraint Projection | amount `Catalog.php:1036` · MFA `UserAuth.php:941` · api_key `Keys.php:99` · data_scope `TeamPermissions.php:272` (분산·통합모델 없음) | PARTIAL |
| 9. Explicit Deny Projection | `DENY_SCOPE='__deny__'` `:234`→`:272`→`:286` `AND 1=0` · member 쓰기 `guardTeamWrite` `UserAuth.php:1167`+`index.php:82` | PARTIAL(국소) |
| 10. Risk Projection | ABSENT(role→risk 계산기 없음; churn `Risk.php`=KEEP_SEPARATE) | ABSENT |
| 11. Permission Projection | `normActions()` `:182` · `actionsCover()` `:194` · `index.php:587` write 게이트 | PARTIAL |
| 12. Policy Evaluation | `requirePlan` `UserAuth.php:364` · `requireFeaturePlan` `:77` · `PlanPolicy::allows` `:53` | PARTIAL(plan 단독) |
| 13. Conflict Detection | `clampActions()` `:423` · `scopeWithinCap()` `:356` · `putMemberPermissions` `:641`(DELEGATION_EXCEEDED) — SoD ABSENT | PARTIAL(clamp만) |
| 14. Effective Role Generation | `effectiveForUser()` `:393`(팀 한정) | PARTIAL |
| 15. Effective Permission Generation | `effectiveForUser` 반환값(`effectivePermissions:694`) | PARTIAL |
| 16. Snapshot Generation | ABSENT(스냅샷 영속 0) | ABSENT |
| 17. Cache Generation | ABSENT(캐시 0·매요청 재조회) | ABSENT |
| 18. Audit Logging | (SecurityAudit 해시체인=KEEP_SEPARATE·비-권한 감사) | ABSENT(권한resolution 감사) |

### 2.3 종합

18단계 중 **PRESENT 1 · PARTIAL 8 · ABSENT 9**. 단계 로직은 차원별로 흩어져 존재하나 **순서 불변 파이프라인으로 조립된 실체는 없다**. `effectiveForUser`가 5·7·11·13·14·15를 인라인으로 뭉쳐 수행할 뿐 1~3·8~10·12를 통합 실행하지 않는다.

### 2.4 KEEP_SEPARATE

`RuleEngine`(Dynamic Evaluation 오해 대상·마케팅 automation)·`Risk`(Risk Projection 오해·churn ML)·`SecurityAudit`(Audit Logging 오해·해시체인)은 **비-권한·KEEP_SEPARATE**. 파이프라인 단계 substrate로 인용 금지(ADR D-5).

---

## 3. Canonical 설계 (순서 불변·단계 계약)

### 3.1 순서 불변 (ADR D-3·SPEC §4 L156)

Subject Resolution → Identity Validation → Assignment Collection → Hierarchy/Composite Expansion → Dynamic Evaluation → Scope/Constraint/Deny/Risk/Permission Projection → Policy Evaluation → Conflict Detection → Effective Generation → Snapshot → Cache → Audit. **순서 변경 불가.** 이는 deny·scope·risk projection이 permission generation보다 앞서 수행되어 fail-secure를 보장하기 위함이다.

### 3.2 단계 계약

- 각 단계는 순수 함수적(입력→출력)으로 정의되어 Executor의 결정성(SPEC §16)을 보장.
- Deny Projection(9)은 Permission Projection(11)·Effective Generation(14)보다 **선행**하여 "Explicit Deny > Allow"(ADR D-4·SPEC §11 L277) 전역 규칙을 파이프라인 구조로 강제.
- Snapshot(16)·Cache(17)·Audit(18)은 계산 후단으로, 결과 불변화·성능·추적성을 담당.

### 3.3 Graph 의존 (SPEC §5)

파이프라인의 Hierarchy/Composite Expansion(4·5)은 Resolution Graph(DAG)를 순회하며, 그래프는 **순환 구조를 허용하지 않는다**(SPEC §5 L176). 순환 시 파이프라인은 `INVALID_RESOLUTION_GRAPH`(SPEC §30)로 중단.

---

## 4. Resolution Kernel 매핑 (SPEC §4 파이프라인 위치)

본 엔티티는 SPEC §4 파이프라인 **그 자체**다. ERRE Engine(`APPROVAL_EFFECTIVE_ROLE_ENGINE`)이 이 파이프라인을 오케스트레이션하며, Planner가 실행 계획을, Executor가 결정적 실행을, Optimizer가 단계 최적화를 담당한다(형제 DSAR).

---

## 5. 무후퇴·Extend 원칙

- ADR D-1: `effectiveForUser`(`:393`)의 인라인 if/switch를 **파괴하지 않고** 파이프라인 단계 구현체로 분해·승격. 팀 한정 로직을 plan·api_key 차원으로 확장.
- 무후퇴: 현행 게이트 layering(미들웨어→guardTeamWrite→requirePlan→effectiveScope)은 파이프라인 완성까지 병행 유지.

---

## 6. 완료 게이트 기여 (SPEC §37)

- SPEC §37 "Resolution Engine 구축"의 필수 하위 — 18단계 파이프라인이 순서 불변으로 조립·동작.
- Unit Test(SPEC §36) "Pipeline" 항목 통과가 인증 조건.
- 현재: **NOT_CERTIFIED · 코드 0 · BLOCKED_PREREQUISITE.**

---

## 7. 반날조 인용 출처 (전부 허용목록 내)

- `TeamPermissions.php`: `:120`·`:132`·`:182`·`:194`·`:202`·`:215`·`:234`·`:236`·`:272`·`:286`·`:316`(via userByForm 위계)·`:356`·`:381`·`:393`·`:423`·`:641`·`:694`
- `UserAuth.php`: `:77`·`:249`·`:364`·`:409`·`:941`·`:1167`
- `index.php`: `:82`·`:573`·`:575`·`:587`
- `PlanPolicy.php`: `:41`·`:53`
- `Keys.php:99` · `Catalog.php:1036`
- KEEP_SEPARATE(비-권한, substrate 인용 아님): `RuleEngine`·`Risk`·`SecurityAudit`

**판정 요약: APPROVAL_ROLE_RESOLUTION_PIPELINE = ABSENT(조립된 파이프라인). 18단계 중 PRESENT 1·PARTIAL 8·ABSENT 9. 순서 불변 파이프라인 구조는 순신규 그린필드.**
