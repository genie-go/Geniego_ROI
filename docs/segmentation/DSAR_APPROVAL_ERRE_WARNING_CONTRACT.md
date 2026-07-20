# DSAR — ERRE Warning Contract (EPIC 06-A-03-02-03-04 Part 3-7 · per-entity: Effective Role Resolution Engine Warning Contract)

- **상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
- **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §31
- **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
- **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
- **불변**: 경고는 소프트(집행 아님) · 무후퇴(Extend-only) · KEEP_SEPARATE · 반날조(`파일:라인`은 SPEC·ADR·Ground-Truth ①② 등장분만·없으면 ABSENT)

---

## 1. 목적

SPEC §31(Warning Contract)은 ERRE가 권한 계산을 **차단하지 않으면서** 관찰 가능한 이상·변경을 신호하는 **5종 소프트 경고**를 정의한다.

원문 5종(§31):

1. `RESOLUTION_DRIFT` (Resolution Drift)
2. `POLICY_UPDATED` (Policy Updated)
3. `SCOPE_NARROWED` (Scope Narrowed)
4. `CACHE_REBUILD_REQUIRED` (Cache Rebuild Required)
5. `RUNTIME_CONTEXT_CHANGED` (Runtime Context Changed)

Error Contract(§30)가 하드 차단이라면 Warning Contract는 **소프트 경고** — resolution은 계속되되 드리프트/변경/재빌드 필요를 로그·이벤트로 남긴다. 판정 핵심: 현행 저장소에는 Warning 5종을 발동할 **Drift/Cache/Runtime Context 계층 자체가 grep 0**(Ground-Truth ② §2 #4·#5·#6, 전부 ABSENT). 유일한 근접물은 scope 축소를 **동기 강제**하는 로직(경고가 아닌 즉시 재클램프)뿐이다. "경고는 있는데 로그만 안 남긴다"식 과장을 금지한다.

## 2. Ground-Truth (substrate or ABSENT+KEEP_SEPARATE)

### 2.1 실존 근접 substrate (PARTIAL — 단 경고 아닌 동기 강제)

- **scope 축소 재클램프**: 팀권한 축소 시 멤버 권한을 즉시 재클램프하는 `reclampTeamMembers()`(`TeamPermissions.php:809`)가 실재. 이는 `SCOPE_NARROWED`(#3)의 근접이나 **경고가 아닌 영속 재계산(동기 강제)** — 축소를 알리는 게 아니라 축소를 즉시 반영. 마찬가지로 `scopeWithinCap()`(`TeamPermissions.php:356`)이 위임 상한 초과를 fail-closed로 차단(경고 아닌 거부).
- **plan 만료 다운그레이드**: `resolveActivePlan()`(`UserAuth.php:119`)이 구독 만료 시 free로 자동 강등(DB 영속). `POLICY_UPDATED`(#2)의 원거리 근접이나 **정책 변경 경고가 아닌 상태 전이**.

### 2.2 ABSENT 거버넌스 (SPEC §31 전용 경고)

- **Drift/Revalidation/Reconciliation 부재**(② §2 #5, ABSENT): effective 권한 드리프트·재검증·조정 grep 0 → `RESOLUTION_DRIFT`(#1) 발동 기준(스냅샷 대비 현재 diff) 자체가 없음.
- **Cache/Invalidation 부재**(② §2 #4, ABSENT): 권한계산 캐시·버전 무효화 grep 0 → `CACHE_REBUILD_REQUIRED`(#4) 신호 대상 부재. 매 요청 DB 재조회(`TeamPermissions.php:202`·`:215`)라 "재빌드 필요"라는 상태 자체가 성립 안 함.
- **Runtime Context 부재**(② §2 #6, ABSENT): `RUNTIME_CONTEXT_CHANGED`(#5) 판정에 필요한 Resolution Context(SPEC §6: Session/Device/Auth Level/Geo/Time Zone) 모델 부재.
- **Snapshot 부재**(② §2 #3, ABSENT): `RESOLUTION_DRIFT`(#1)는 스냅샷과 런타임 재계산의 diff인데 스냅샷 자체가 없어 비교 기준선 부재.

### 2.3 KEEP_SEPARATE (오흡수 금지 · 가짜녹색 회피)

- `ModelMonitor`(model drift)·`Risk.php:81`(policy ML probability)·`PgSettlement`(정산 reconciliation)·`Connectors.php:819`(요청당 1회 채널캐시)·`Wms`(reconcileChannelStock)는 이름에 "drift/cache/reconcile"이 들어가나 **권한 resolution 경고가 아니다**(Ground-Truth ② §4). ERRE Warning으로 흡수·개명 금지.
- `Alerting.php:665`("executor identity")는 알림 실행자지 resolution 경고 발행기가 아니다.

## 3. Canonical 설계 (5 Warning)

| # | 경고 | 발동 계기(SPEC §22·§23·§24) | 판정 | 근거(`파일:라인`) |
|---|---|---|---|---|
| 1 | `RESOLUTION_DRIFT` | Drift Detection(§23) — 스냅샷 vs 런타임 diff | **ABSENT** | Drift 계층·Snapshot 기준선 grep 0(② §2 #3·#5). 비교 대상 부재 |
| 2 | `POLICY_UPDATED` | Revalidation(§24) — Policy Update trigger | **PARTIAL(원거리)** | 근접=plan 만료 다운그레이드(`UserAuth.php:119`)·plan 재해석(`UserAuth.php:77`)이나 정책 변경 "경고"가 아닌 상태 전이. 통합 정책 버전 이벤트 ABSENT |
| 3 | `SCOPE_NARROWED` | Scope Projection(§9) 축소 감지 | **PARTIAL(동기 강제·경고 아님)** | 근접=`reclampTeamMembers()`(`TeamPermissions.php:809`)·`scopeWithinCap()`(`:356`)이 축소를 즉시 반영/차단. 소프트 경고 발행 ABSENT |
| 4 | `CACHE_REBUILD_REQUIRED` | Cache Invalidation(§22) trigger | **ABSENT** | 캐시 계층 grep 0(② §2 #4). 매 요청 재계산이라 "재빌드 필요" 상태 부재 |
| 5 | `RUNTIME_CONTEXT_CHANGED` | Runtime Context 변경 감지 | **ABSENT** | Resolution Context 모델 부재(② §2 #6). 근접=`X-Tenant-Id` 주입(`index.php:608`)은 컨텍스트 변경 감지가 아닌 위조차단 |

**설계 원칙**:

1. **경고 ≠ 집행(soft)** — Warning 5종은 resolution을 차단하지 않는다. `SCOPE_NARROWED`(#3)의 현행 근접(`reclampTeamMembers`)이 "동기 강제"임을 정직 표기 — ERRE Warning은 강제와 **별도로** 축소 사실을 관찰 신호로 발행(강제 로직은 그대로 존치).
2. **ABSENT 3종 과장 금지** — `RESOLUTION_DRIFT`(#1)·`CACHE_REBUILD_REQUIRED`(#4)·`RUNTIME_CONTEXT_CHANGED`(#5)는 발동 계층 자체가 없다. "구현은 됐는데 이벤트만 안 쏜다"식 표기 금지.
3. **Drift는 Snapshot 선행**(#1) — 드리프트는 불변 스냅샷(SPEC §18) 대비 diff이므로 Snapshot Engine 신설이 선행. 스냅샷 없이 드리프트 판정 불가.
4. **경고 채널(설계 방향)**: 응답 헤더 `X-ERRE-Warnings` + Evidence 로그(SPEC §19). 실 채널은 구현 세션 확정.

### 3.1 경고별 정직 판정 서술

- **`RESOLUTION_DRIFT`(#1, ABSENT)**: 드리프트는 정의상 "과거 스냅샷 대비 현재 재계산 결과의 diff"다. 현행은 스냅샷을 저장하지 않고(`effectiveForUser` `TeamPermissions.php:393` 반환만) 매 요청 재계산하므로 **비교할 기준선 자체가 존재하지 않는다**. Drift Detection(SPEC §23: Role/Permission/Scope/Runtime/Policy Drift)은 Snapshot Engine(§18) 신설이 절대 선행이다.
- **`POLICY_UPDATED`(#2, PARTIAL 원거리)**: 현행에 정책 상태 전이는 있다 — `resolveActivePlan()`(`UserAuth.php:119`)이 구독 만료 시 free로 DB 영속 강등. 그러나 이는 "정책이 갱신되었으니 재검증하라"는 **관찰 신호**가 아니라 이미 일어난 **상태 변경**이다. ERRE의 `POLICY_UPDATED`는 정책 버전 증가를 감지해 캐시 무효화·재검증(SPEC §24)을 촉발하는 이벤트로, 통합 정책 버전 개념이 없는 현행엔 부재하다.
- **`SCOPE_NARROWED`(#3, PARTIAL 동기강제)**: 가장 근접한 substrate다. 팀권한 축소 시 `reclampTeamMembers()`(`TeamPermissions.php:809`)가 멤버 권한을 즉시 재클램프하고, `scopeWithinCap()`(`:356`)이 상한 초과를 fail-closed로 차단한다. 그러나 이는 축소를 **알리는 경고가 아니라 축소를 즉시 반영/차단하는 강제**다. ERRE Warning은 이 강제와 **분리되어**, 영향받는 subject에게 "당신의 scope가 좁아졌다"를 관찰 신호로 통지한다(강제 로직은 존치).
- **`CACHE_REBUILD_REQUIRED`(#4, ABSENT)**: 매 요청 DB 재조회(`TeamPermissions.php:202`·`:215`) 구조에서는 "재빌드 필요"라는 상태가 성립하지 않는다 — 캐시가 없으니 언제나 fresh 계산. 이 경고는 Cache Engine(§21) 도입 후 Assignment/Policy 변경 시 캐시 stale을 신호하는 용도로, 순신규다.
- **`RUNTIME_CONTEXT_CHANGED`(#5, ABSENT)**: Session/Device/Geo/Auth Level 등 Resolution Context(SPEC §6) 모델이 없어 "컨텍스트가 바뀌었다"를 판정할 기준 상태가 없다. 근접물 `X-Tenant-Id` 주입(`index.php:608`)은 tenant 하나만 다루는 위조차단이다.

## 4. Kernel 매핑 (SPEC §22~§24 ↔ 경고 코드)

- **Cache Invalidation(§22)** → `CACHE_REBUILD_REQUIRED`(#4). trigger 원문: Assignment/Role/Permission/Policy/Scope/Dynamic Rule/Runtime Context 변경. substrate ABSENT.
- **Drift Detection(§23)** → `RESOLUTION_DRIFT`(#1). 대상: Effective Role/Permission/Scope/Runtime/Policy Drift. substrate ABSENT.
- **Revalidation(§24)** → `POLICY_UPDATED`(#2). trigger: Policy/Role/Assignment/Organization/Runtime Update. 근접 substrate=`resolveActivePlan()`(`UserAuth.php:119`)·`requireFeaturePlan()`(`UserAuth.php:77`).
- **Scope Projection(§9)** → `SCOPE_NARROWED`(#3). substrate=`reclampTeamMembers()`(`TeamPermissions.php:809`)·`scopeWithinCap()`(`TeamPermissions.php:356`)·`clampActions()`(`:423`).
- **Runtime Context(§6)** → `RUNTIME_CONTEXT_CHANGED`(#5). substrate ABSENT.

## 5. 무후퇴 · Extend

- **동기 강제 로직 존치(ADR D-1)**: `reclampTeamMembers()`(`TeamPermissions.php:809`)·`scopeWithinCap()`(`:356`)의 축소 즉시반영·차단을 **삭제하지 않는다**. ERRE Warning은 그 위에 관찰 신호를 얹을 뿐 — fail-closed 강제는 후퇴 없이 유지.
- **plan 상태 전이 존치**: `resolveActivePlan()`(`UserAuth.php:119`)의 만료 다운그레이드를 경고로 대체하지 않는다. 경고는 부가 신호이지 강등 로직 대체가 아니다.
- **Snapshot/Cache 선행 의존**: Warning 3종(#1·#4·#5)은 Snapshot(§18)·Cache(§21)·Runtime Context(§6) 신설 이후 발동 — 순신규 그린필드. 병행 기간엔 매 요청 재계산 유지(후퇴 아님).
- **KEEP_SEPARATE 불흡수**: `ModelMonitor`·`Risk.php:81`·`PgSettlement`·`Connectors.php:819`·`Wms`의 drift/cache/reconcile을 ERRE Warning으로 통합 금지.

### 5.1 무후퇴 회귀 시나리오

1. **강제-경고 분리 검증**: `reclampTeamMembers()`(`TeamPermissions.php:809`)의 즉시 재클램프가 ERRE Warning 도입 후에도 동기적으로 유지되어야 한다. "경고만 쏘고 실제 축소는 나중에" 식으로 강제를 지연시키면 권한 잔존 취약점 발생 — 강제는 즉시, 경고는 부가.
2. **소프트 경고의 비차단성**: Warning 5종은 어떤 경우에도 정상 resolution을 막지 않는다. `RESOLUTION_DRIFT`(#1)가 감지되어도 요청은 계속 처리되되(현재 재계산값 사용) 관리자에게 재검증을 신호할 뿐. 경고를 하드 차단으로 격상하는 회귀는 가용성 사고.
3. **plan 강등 존치**: `resolveActivePlan()`(`UserAuth.php:119`) 만료 다운그레이드를 경고로 대체하지 않는다. 경고는 강등을 통지할 뿐 강등 자체를 수행하지 않는다.

### 5.2 경고 수명주기 (설계 방향)

경고는 **발행(emit) → 관찰(observe) → 조치(reconcile) → 소멸(clear)** 수명주기를 가진다. 현행엔 이 수명주기가 없다 — `reclampTeamMembers()`(`TeamPermissions.php:809`)는 강제 후 즉시 종료(경고 상태 미보존). ERRE는 Evidence Engine(SPEC §19)에 경고를 영속하고 Reconciliation(§25)으로 조치 여부를 추적한다. 이는 Snapshot(§18)·Evidence(§19) 계층 신설 이후 가능하며, 본 단계는 계약만 정의한다.

## 6. 완료 게이트

- **BLOCKED_PREREQUISITE**: 5종 전부 Drift(§23)·Cache(§21·§22)·Snapshot(§18)·Runtime Context(§6) 실 구현 이후 발동. 본 단계는 명세·계약만.
- **ABSENT(순신규 3종)**: `RESOLUTION_DRIFT`(#1)·`CACHE_REBUILD_REQUIRED`(#4)·`RUNTIME_CONTEXT_CHANGED`(#5).
- **PARTIAL(근접·불충분 2종)**: `POLICY_UPDATED`(#2, 원거리)·`SCOPE_NARROWED`(#3, 동기 강제·경고 아님).
- **완료 판정**: 5종 전 경고가 소프트(비차단)로 발행 + Evidence 로그 동반 + 강제 로직과 분리 검증 + 회귀 테스트 통과. NOT_CERTIFIED 유지.

## 7. 반날조 인용 출처

본 문서가 인용한 `파일:라인`은 전부 SPEC §31 / ADR / Ground-Truth ①② 등장분이다.

- `backend/src/Handlers/TeamPermissions.php` — `:202`(subjectPerms) · `:215`(subjectScope) · `:356`(scopeWithinCap) · `:423`(clampActions) · `:809`(reclampTeamMembers)
- `backend/src/Handlers/UserAuth.php` — `:77`(requireFeaturePlan) · `:119`(resolveActivePlan)
- `backend/public/index.php` — `:608`(X-Tenant-Id 주입)
- **KEEP_SEPARATE(권한 아님·오흡수 금지)**: `Risk.php:81`(policy ML) · `Connectors.php:819`(채널캐시) · `Alerting.php:665`(알림 실행자) · `ModelMonitor` · `PgSettlement` · `Wms`(reconcileChannelStock)

---
**요약**: SPEC §31의 5 경고 판정 = ABSENT 3(Drift/CacheRebuild/RuntimeContextChanged)·PARTIAL 2(PolicyUpdated 원거리·ScopeNarrowed 동기강제). 현행은 축소를 경고가 아닌 즉시 재클램프(`reclampTeamMembers`)로 강제. Drift는 Snapshot 선행, Cache 경고는 캐시 계층 선행 — 전부 순신규. 경고는 소프트·비차단·강제와 분리. NOT_CERTIFIED.
