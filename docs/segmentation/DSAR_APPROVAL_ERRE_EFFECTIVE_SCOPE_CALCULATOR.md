# DSAR — ERRE Effective Scope Calculator (per-entity)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · BLOCKED_PREREQUISITE.
> **EPIC**: 06-A-03-02-03-04 Part 3-7 (Effective Role Resolution Engine)
> **상위 SPEC**: `docs/spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md` §9
> **상위 ADR**: `docs/architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md` (D-1·D-4·D-7)
> **Ground-Truth**: `DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
> **Canonical Entity**: `APPROVAL_EFFECTIVE_SCOPE`

---

## 1. 목적

본 DSAR은 ERRE Resolution Pipeline(SPEC §4)의 **7단계 Scope Projection** 및 **Effective Scope Calculator**(SPEC §9)의 거버넌스 계약을 정의한다. Effective Scope Calculator는 한 Subject(요청자)가 특정 시점·컨텍스트에서 실제로 접근 가능한 **데이터 범위(data scope)**를 결정적(deterministic)으로 산출하는 계산기이며, ERRE의 Effective Role·Permission·Constraint·Deny 산출과 결합해 최종 접근 결정을 형성한다.

핵심 원칙은 **교집합(intersection) 기본 적용**(SPEC §9)과 **narrow scope > wide scope**(SPEC §8 Permission Merge Rule)이다. 즉 여러 차원의 scope 제약이 동시에 존재할 때 가장 좁은 범위가 최종 실효 범위가 되며, 어떤 차원이든 명시적 deny(`__deny__`)가 있으면 그 차원은 전면 차단된다.

본 계산기는 GeniegoROI에서 이미 **팀 도메인 한정으로 실존하는 substrate**(`TeamPermissions::effectiveScope` 계열)를 파괴하지 않고 plan·api_key·조직 차원까지 확장·승격(Extend)하는 것을 목표로 한다. 대체(Replace)가 아니라 확장(Extend)이 Golden Rule이다(ADR D-1).

## 2. Ground-Truth 판정

### 2.1 실존 substrate (PARTIAL — Ground-Truth ① §2.A)

Scope 계산 substrate는 `TeamPermissions.php` 내에 **팀 도메인 한정으로 실재**한다. 아래는 반날조 허용목록 등장분이다.

| 파일:라인 | 역할 | ERRE 매핑 | 상태 |
|---|---|---|---|
| `backend/src/Handlers/TeamPermissions.php:41` | `DATA_SCOPES` 9차원 상수(company..own) | Scope vocabulary | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:215` | `subjectScope()` — data_scope 행 조회 → {scope_type, values[]} | Assignment Collection(scope) | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:234` | `DENY_SCOPE` 센티넬 `__deny__` | Deny Projection(scope 차원) | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:236` | `effectiveScope()` — 요청자 실효 데이터범위 라이브 산출. owner/admin→null(무제한)·비-owner 실패→DENY_SCOPE(fail-closed)·user 우선→team 상속 | **Effective Scope Generation(중추)** | PRESENT(live) |
| `backend/src/Handlers/TeamPermissions.php:272` | `scopeValuesFor()` — 차원별 허용값. `__deny__`→[]·타차원→null(무제한) | Scope Projection | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:286` | `scopeSql()` — 차원값→SQL IN절, deny→`AND 1=0` | Scope enforcement | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:299` | `scopeSqlNamed()` — named-param 변형 | Scope enforcement | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:315` | `scopeChannelProduct()` — channel/product/brand 다차원 동시강제 | 다차원 intersection | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:356` | `scopeWithinCap()` — 요청 scope ⊆ manager scope 부분집합 검증(교차차원·무제한=fail-closed) | Scope cap(위임상한) | PRESENT |

**결합 로직 실측**(Ground-Truth ① §3): `effectiveScope()`(`:236`)는 user 우선→team 상속의 계층적 fallback을 수행하며, 비-owner 조회 실패 시 `DENY_SCOPE`를 반환하는 **fail-closed** 설계다. `scopeChannelProduct()`(`:315`)는 channel·product·brand 차원을 동시 강제해 다차원 intersection의 부분 구현을 보인다.

### 2.2 부재·부분 (ABSENT/PARTIAL — Ground-Truth ② §2, §6)

- **통합 scope 모델 부재**: plan 차원·api_key 차원·조직(organization) 차원의 scope를 하나의 canonical scope로 교차하는 통합 계산기는 없다. 현행 scope는 `team_role`(data_scope 테이블) 차원에 국한된다.
- **Scope Cache/Snapshot/Version ABSENT**(Ground-Truth ② 표 #3·#4): scope 결과는 매 요청 DB 재조회(`TeamPermissions.php:215`)로 산출되며, 불변 스냅샷·버전·캐시가 전무하다.
- **Scope Drift/Reconciliation ABSENT**(② 표 #5): scope 축소·확대 드리프트 탐지 없음.
- **canonical evaluation ordering PARTIAL**(① §3): 차원 내 정렬은 있으나 cross-차원 canonical ordering 부재.

### 2.3 KEEP_SEPARATE (오흡수 금지 · Ground-Truth ② §4)

`GraphScore.php:13`~`:25`(마케팅 어트리뷰션 그래프)·`ChannelRegistry.php`(채널 레지스트리)·`Connectors.php:819`(요청당1회 채널캐시)는 이름상 scope·channel과 유사하나 **권한 scope resolution이 아니다**. ERRE Effective Scope Calculator에 흡수·개명 금지(가짜녹색 회피).

## 3. Canonical 설계

### 3.1 Canonical Entity: `APPROVAL_EFFECTIVE_SCOPE`

Effective Scope는 Subject+Context+Version 입력에 대해 아래 형태의 불변 산출물이다.

```
APPROVAL_EFFECTIVE_SCOPE {
  subject_ref        : 정규화된 Subject 식별자 (DSAR Subject Resolution 산출)
  resolution_version : 불변 버전 바인딩 (SPEC §33 Immutable Resolution Version)
  scope_dimensions   : { dimension → { type: allow|deny|unlimited, values: [] } }
  intersection_proof : 각 차원별 입력 소스(assignment/role/permission/runtime/context)와 교집합 결과의 evidence 체인
  deny_dimensions    : []  // __deny__ 승격 결과 (Effective Deny Calculator와 정합)
  digest             : scope_dimensions 정규화 후 해시 (SPEC §20 Digest 입력)
}
```

### 3.2 계산 대상 5원(SPEC §9)

Effective Scope Calculator는 아래 5개 scope 소스를 차원별로 교집합한다.

1. **Assignment Scope** — `subjectScope()`(`:215`)의 data_scope 행 (substrate 승격).
2. **Role Scope** — role별 기본 scope 상한(assignableMap 계열, DSAR Subject Resolution 산출과 연동).
3. **Permission Scope** — menu_key별 부여된 권한에 결부된 scope.
4. **Runtime Scope** — 요청 컨텍스트(세션·act-as 등)에서 파생되는 동적 scope.
5. **Context Scope** — Tenant/Organization/Department/Project(SPEC §6 Resolution Context) 경계.

### 3.3 결합 규칙 (SPEC §8·§9)

- **Intersection 기본**: 동일 차원에 여러 소스가 값을 제시하면 값 집합의 교집합을 취한다. 한 소스가 `unlimited`(null)이면 다른 소스의 값이 그대로 유효(무제한 소스는 제약을 추가하지 않음) — `scopeValuesFor()`(`:272`)의 "타차원→null" 시맨틱을 통합 규칙으로 승격.
- **narrow > wide**: 교집합의 결과로 항상 가장 좁은 범위가 채택된다(`clampActions`/`scopeWithinCap` 계열의 부분집합 원칙 확장).
- **deny 우선**: 어느 소스든 차원에 `__deny__`(`:234`)를 두면 그 차원은 `deny`로 확정되고 다른 allow가 무효화된다(ADR D-4 deny>allow 전역화). 이는 `scopeSql()`(`:286`)의 `AND 1=0` 강제와 정합한다.
- **다차원 동시강제**: `scopeChannelProduct()`(`:315`)처럼 여러 차원이 동시에 걸리면 AND 결합(모든 차원 만족).

### 3.4 Determinism·Immutability (ADR D-2)

동일 (Subject, Context, Version) → 동일 `scope_dimensions` 100% 보장. 결과는 Resolution Snapshot에 불변 영속되고, 런타임은 스냅샷을 참조(lock-free read path). scope 소스(assignment/role/permission) 변경 시에만 Cache Invalidation(SPEC §22).

### 3.5 Snapshot·Digest·Cache 계약 (SPEC §18·§20·§21)

- **Snapshot**(SPEC §18): effective scope 집합은 Resolution Version과 함께 불변 스냅샷으로 영속. 현행 `effectiveScope()`(`:236`)는 반환만 하고 저장하지 않으므로(Ground-Truth ② 표 #3) 영속 계층은 순신규.
- **Digest**(SPEC §20): `scope_dimensions` 정규화(차원 정렬·값 정렬·dedupe) 후 해시. 동일 effective scope → 동일 digest → Cache/Reconciliation 일치의 기준.
- **Scope Cache**(SPEC §21): 차원별 scope 캐시. version 기반 키. Cache Hit ≥ 95%(SPEC §35). Invalidation trigger(SPEC §22): Assignment/Role/Permission/Scope/Runtime Context 변경.

### 3.6 Explain·Evidence (SPEC §17·§19)

Effective Scope Calculator는 "어떤 Scope 때문인가"(SPEC §17)를 사람이해·JSON 양형으로 제공해야 한다. `intersection_proof`가 각 차원의 소스(assignment/role/permission/runtime/context)와 교집합 축소 경로를 Evidence(SPEC §19 Scope Resolution)로 기록한다. fail-closed로 DENY_SCOPE가 반환된 경우 "비-owner 조회 실패"의 사유도 명시.

### 3.7 Error·Warning Contract (SPEC §30·§31)

- **Error**(SPEC §30): scope 소스 조회 실패·차원 모순 시 `ROLE_RESOLUTION_FAILED`, 무효 컨텍스트 시 `INVALID_RUNTIME_CONTEXT`. fail-closed 원칙상 오류는 곧 deny.
- **Warning**(SPEC §31): scope가 이전 스냅샷보다 좁아지면 `Scope Narrowed`, 재빌드 필요 시 `Cache Rebuild Required`.

## 4. Kernel 매핑 (Resolution Pipeline)

| Pipeline 단계(SPEC §4) | 본 계산기 관여 | substrate 승격 대상 |
|---|---|---|
| 3. Assignment Collection | scope 행 수집 | `subjectScope()`(`:215`) |
| 7. Scope Projection | 5원 scope 소스 투영 | `effectiveScope()`(`:236`)·`scopeValuesFor()`(`:272`) |
| 9. Explicit Deny Projection | `__deny__` 차원 확정 | `DENY_SCOPE`(`:234`)→`scopeSql`(`:286`) |
| 13. Conflict Detection | scope cap 위반 탐지 | `scopeWithinCap()`(`:356`) |
| 14/15. Effective Generation | 교집합 최종 scope | `scopeChannelProduct()`(`:315`) |
| 16. Snapshot Generation | 불변 scope 스냅샷 | (신규 — ABSENT) |

Effective Scope Calculator의 산출물은 SPEC §27 Runtime Authorization Projection의 **Effective Scope Set**으로 노출되고, SPEC §32 API `Resolve Effective Scope`로 제공된다.

### 4.1 DB·Index·Runtime Guard 계약 (SPEC §28·§33·§34)

- **DB Constraint**(SPEC §33): scope 스냅샷은 Immutable Resolution Version·Tenant Isolation·Version Binding 제약을 받는다. 현행 data_scope는 `WHERE tenant_id=?`(Ground-Truth ② §5)로 tenant 격리는 있으나 version binding·immutable 이력이 부재하므로 신규 제약.
- **Index**(SPEC §34): Subject·Scope·Version 인덱스로 P95 ≤ 20ms 달성.
- **Runtime Guard**(SPEC §28): Scope Escalation(더 넓은 범위 요청) 차단. `scopeWithinCap()`(`:356`)의 부분집합 검증을 Guard 신호로 승격.

## 5. 무후퇴 · Extend (ADR D-1·D-7)

- **Extend-only**: `effectiveScope()`(`:236`)·`scopeSql()`(`:286`)·`scopeChannelProduct()`(`:315`)를 파괴·개명하지 않고 ERRE Scope Projection 단계의 **구현체로 승격**한다. 팀 한정 로직을 plan·api_key·organization 차원으로 확장.
- **실재 과신 회피**(D-7): `effectiveScope`는 팀 data_scope 차원의 부분 계산기지 통합 scope kernel이 아니다. plan/api_key scope를 통합한다고 오판 금지.
- **부재 과장 회피**(D-7): Scope Cache/Snapshot/Version grep 0은 실측 부재지 숨은 구현이 아니다.
- **병행 유지**: ERRE 완성 전까지 현행 `effectiveScope`+`scopeSql` 게이트는 그대로 유지·병행(무후퇴). fail-closed 시맨틱(비-owner 실패→DENY_SCOPE) 절대 보존.

## 6. 완료 게이트

본 Calculator는 아래를 모두 만족해야 인증(CERTIFIED)된다.

1. Effective Scope Calculator가 5원 scope 소스를 차원별 교집합으로 산출.
2. `__deny__` 차원이 어떤 allow보다 우선(deny>allow) — Effective Deny Calculator와 정합.
3. 동일 (Subject·Context·Version) → 동일 scope 100%(deterministic, SPEC §35).
4. Scope Snapshot·Digest·Version 영속(SPEC §18·§20·§33 Immutable).
5. Scope Cache Hit ≥ 95%·Invalidation 정합(SPEC §21·§22·§35).
6. Regression: 현행 `effectiveScope`/`scopeSql` 팀 시나리오 100% 무후퇴(SPEC §36).
7. Security: Scope Escalation 차단(SPEC §28 Runtime Guard·§36 Security).

### 6.1 테스트 계약 (SPEC §36)

- **Unit**: 5원 scope 교집합·`__deny__` 차원 override·narrow>wide 우선·null(무제한) 소스 무영향.
- **Integration**: `subjectScope`(`:215`)→`effectiveScope`(`:236`)→`scopeSql`(`:286`) 파이프 회귀, user 우선→team 상속 fallback, `scopeChannelProduct`(`:315`) 다차원 AND.
- **Performance**: 100K 동시 resolution·1M scope projection에서 P95 ≤ 20ms·Cache Hit ≥ 95%(SPEC §35).
- **Security**: Scope Escalation·Cache Poisoning·Graph Manipulation 차단(SPEC §36).
- **Regression**: 현행 팀 data_scope 시나리오(owner=null·member 상속·비-owner→DENY_SCOPE) 100% 동일 출력.

> 선행 의존: 실 구현은 Part 1~3-6 인증 후 별도 승인 세션(RP-track). 본 문서는 명세·거버넌스 계약만(코드 0).

## 7. 반날조 인용 출처

본 DSAR이 인용한 `파일:라인`은 전부 상위 4문서(SPEC·ADR·Ground-Truth ①②) 등장분이다.

- `TeamPermissions.php:41·:215·:234·:236·:272·:286·:299·:315·:356` — Ground-Truth ① §2.A
- SPEC §4(Pipeline)·§6(Context)·§8·§9·§18·§20·§21·§22·§27·§32·§33·§35·§36
- ADR D-1(Extend)·D-2(deterministic/immutable)·D-4(deny>allow)·D-7(정직 분리)
- KEEP_SEPARATE: `GraphScore.php:13~:25`·`ChannelRegistry.php`·`Connectors.php:819` — Ground-Truth ② §4

**요약**: Effective Scope Calculator = PARTIAL-substrate(`effectiveScope`/`scopeSql`/`scopeChannelProduct` 팀 한정 실재) / ABSENT-governance(통합 scope 모델·Cache·Snapshot·Version 순신규). Extend-only·intersection 기본·narrow>wide·deny 우선·deterministic·immutable snapshot. 코드 0·NOT_CERTIFIED·선행의존.
