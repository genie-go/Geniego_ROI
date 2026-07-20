# DSAR — ERRE Resolution Cache Engine (EPIC 06-A-03-02-03-04 Part 3-7)

> **거버넌스 상태**: 설계 명세 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §21 Cache Engine
> **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
> **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
> **반날조**: 모든 `파일:라인`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만 인용. 그 밖은 `ABSENT`. **Connectors 채널캐시 ≠ resolution cache**(KEEP_SEPARATE). 289차 확정분(P1~P5) 재플래그 금지.

---

## 1. 목적

**ERRE Resolution Cache Engine**(SPEC §21)은 effective 계산 결과를 **version 기반으로 캐싱**해 매 요청 재계산을 제거하는 축이다. 성능 요구(SPEC §35 P95≤20ms·P99≤50ms·Cache Hit≥95%·Lock-Free Read Path)는 이 캐시 없이는 달성 불가능하다.

SPEC §21이 규정하는 Cache 대상은 5종이며, **모두 version 기반**이다(SPEC §21 원문 "Version 기반").

- **Effective Role Cache**
- **Effective Permission Cache**
- **Scope Cache**
- **Constraint Cache**
- **Policy Cache**

Cache의 키는 Digest(§20) 또는 (Subject+Context+resolution_version)이며, 값은 Snapshot(§18)이다. Cache Hit 시 런타임은 스냅샷을 lock-free로 반환하고 Pipeline을 재실행하지 않는다.

## 2. Ground-Truth 판정 (전수조사 기반 · ABSENT-dominant)

### 2.1 판정 = **ABSENT** (매 요청 DB 재조회)

Cache/Invalidation(version)은 Ground-Truth ② 판정표 #4에서 **ABSENT**로 확정된다.

- **핵심 근거**: 권한계산 결과를 캐시·무효화하는 로직 grep 0. **매 요청 DB 재조회**(`TeamPermissions.php:202` `subjectPerms`·`:215` `subjectScope`)로 즉석 산출(Ground-Truth ② §2 #4 명시).
- **비영속 결과**: `effectiveForUser`(`TeamPermissions.php:393`)는 반환만 하므로 캐싱할 안정적 결과 객체가 없다(Ground-Truth ② §2 #3).
- **version 부재**: version binding이 없어(Ground-Truth ② §5) version 기반 캐시 키를 구성할 수 없다. `acl_permission` UPDATE in-place는 캐시 무효화 시그널조차 남기지 않음.

### 2.2 실존 substrate (요청 단위 지역 캐시만·권한 아님)

request-time에 반복 조회를 줄이는 지역적 재사용은 있으나 cross-request effective 캐시가 아니다.

- 권한 계산은 한 요청 내에서도 `subjectPerms`/`subjectScope`를 필요 시마다 DB 조회 — 요청 간 재사용 없음.

### 2.3 ★KEEP_SEPARATE 오흡수 경고

- `Connectors.php:819` **요청당 1회 채널 캐시는 외부 채널 API 응답 캐시이지 resolution cache가 아니다**(Ground-Truth ② §4). 채널 데이터 도메인이며 권한 effective 결과와 무관 — Cache Engine으로 오흡수 금지(ADR D-5, 가짜녹색 회피).
- `PgSettlement`(정산)·`ModelMonitor`(model)·`ChannelRegistry`·`PriceOpt`의 캐시/레지스트리는 각 도메인 캐시이며 권한 resolution 아님.

## 3. Canonical 설계 (`ERRE_RESOLUTION_CACHE` · 전부 신규 · 실값 아님)

| # | 필드 | 의미 |
|---|---|---|
| 1 | cache_key | (subject_ref + runtime_context_hash + resolution_version) 또는 digest |
| 2 | tenant | 테넌트 스코프(격리 필수 · cross-tenant 캐시 금지) |
| 3 | resolution_version | 캐시 유효성 판정 버전 |
| 4 | effective_role_cache | Effective Role 캐시 값 |
| 5 | effective_permission_cache | Effective Permission 캐시 값 |
| 6 | scope_cache | Scope 캐시 값 |
| 7 | constraint_cache | Constraint 캐시 값 |
| 8 | policy_cache | Policy 캐시 값 |
| 9 | snapshot_ref | 캐시가 가리키는 불변 Snapshot(§18) |
| 10 | cached_at / valid_until | 캐시 적재·유효 만료 시각 |

### 3.1 설계 원칙

- **Version 기반(SPEC §21)**: 캐시 유효성은 TTL이 아니라 `resolution_version` 일치로 판정. 버전 변경 = 캐시 무효(별편 Cache Invalidation §22).
- **Snapshot 참조·불변**: 캐시는 불변 Snapshot(§18)을 가리키므로 캐시 값 자체가 변조 불가 — Cache Poisoning(SPEC §29·§30 CACHE_CORRUPTED·§36 security) 방어.
- **Lock-Free Read Path**: Cache Hit는 락 없이 스냅샷 반환(SPEC §35). Miss 시에만 Pipeline 재실행 후 적재.
- **Tenant 격리 절대**: cache_key에 tenant 포함 — cross-tenant 캐시 오염 금지.
- **Digest 정합**: 캐시 키/무결성은 Digest(§20) 동등성으로 검증.

### 3.2 Error / Warning 계약 (SPEC §30·§31 중 본 축 해당분)

- **CACHE_CORRUPTED**(SPEC §30): 캐시 값이 가리키는 Snapshot(§18) 무결성 불일치 시 에러·재빌드. 오염 캐시로 판정 진행 금지(fail-to-recompute).
- **Cache Rebuild Required 경고**(SPEC §31): version 변경(무효화 §22) 시 재빌드 필요 시그널.
- **Runtime Context Changed 경고**(SPEC §31): 컨텍스트 변경으로 캐시 키가 달라지면 경고·재조회.

### 3.3 API 표면 (SPEC §32 중 본 축 해당분)

- **Resolve Effective Roles/Permissions/Scope**: 캐시 Hit 시 스냅샷 반환, Miss 시 Pipeline 재실행 후 적재 — API 계약은 캐시 유무와 무관하게 동일 결과(투명).
- **Validate Resolution**: 캐시-스냅샷 정합(digest §20) 검증.

### 3.4 인덱스 · 성능 (SPEC §34·§35)

- **인덱스**: Subject·Version·Snapshot 인덱스(SPEC §34) + cache_key 해시 인덱스로 Hit 판정 O(1).
- **성능**: Cache Hit≥95%·P95≤20ms·P99≤50ms·Lock-Free Read Path·Incremental Recalculation(SPEC §35). 캐시는 이 목표들의 유일한 달성 수단 — 현행 매 요청 재조회(`TeamPermissions.php:202`·`:215`)로는 불가.

## 4. Kernel 매핑 (캐시 대상 값의 소스)

| Cache 축(SPEC §21) | 소스 | 최근접 substrate | 판정 |
|---|---|---|---|
| Effective Role Cache | Effective Role Generation(14) | `TeamPermissions.php:393` | **ABSENT**(매 요청 재계산) |
| Effective Permission Cache | Permission Generation(15) | `TeamPermissions.php:202`·`:423` | **ABSENT**(매 요청 DB 조회) |
| Scope Cache | Scope Projection(7) | `TeamPermissions.php:215`·`:236` | **ABSENT**(매 요청 DB 조회) |
| Constraint Cache | Constraint Projection(8) | `Catalog.php:1036`·`Keys.php:99` | **ABSENT**(캐시 없음) |
| Policy Cache | Policy Evaluation(12) | `PlanPolicy.php:19`(정적 상수) | **PARTIAL**(상수는 프로세스 상주·version 캐시 아님) |
| version 키·무효화 | Cache Engine(§21·§22) | — | **ABSENT**(version binding 부재) |

> Policy는 `PlanPolicy::RANK`가 코드 상수로 프로세스에 상주할 뿐 version 기반 무효화 가능한 캐시가 아니다 — version-aware cache로 전환 필요.

## 5. 무후퇴 · Extend

- **Golden Rule(Extend)**: `subjectPerms`(`TeamPermissions.php:202`)·`subjectScope`(`TeamPermissions.php:215`)의 매 요청 DB 조회 경로를 파괴하지 않고, 그 앞단에 version 기반 캐시 룩업을 **추가**(Cache Hit 시 조회 skip, Miss 시 기존 경로 fallthrough). 계산 로직 무변경.
- **중복 캐시 금지**: `Connectors.php:819` 채널캐시(§2.3)와 별도로 resolution 전용 캐시 신설 — 채널·정산 캐시와 혼합·개명 금지.
- **Cache Poisoning 방어**: 캐시 값은 불변 Snapshot 참조로만 채워지고 임의 쓰기 불가(SPEC §29 Cache Poisoning Risk 정적탐지·§36 security test).
- **병행 유지**: 캐시 Miss·비활성 시 현행 라이브 재계산이 정확히 동일 결과 반환(캐시는 순수 성능 계층 — fail-open이 아니라 fail-to-recompute).
- **실재 과신 회피(ADR D-7)**: `PlanPolicy::RANK` 상수가 프로세스에 상주하는 것은 캐시가 아니다 — version 기반 무효화가 불가능한 정적 상수를 "권한 캐시가 있다"로 오판 금지.
- **부재 과장 회피(ADR D-7)**: resolution cache grep 0은 실측 부재. `Connectors` 채널캐시가 존재해도 권한 캐시가 아님(§2.3).

### 5.1 점진 수렴 로드맵 (무후퇴)

1. **shadow 적재**: Miss 시 라이브 계산 후 결과를 캐시에 기록(판정은 라이브 값 사용, 정합만 관측).
2. **Hit 서빙**: 검증 후 Hit 시 스냅샷 서빙으로 전환(lock-free), 정확성 회귀 0 확인.
3. **무효화 결합**: Cache Invalidation(§22) 트리거와 결합해 version 변경 시 즉시 stale — under-serving 0.
- 각 단계는 라이브 경로를 fallthrough로 유지, 성능만 개선.

## 6. 완료 게이트

- Cache Engine 5종(Role/Permission/Scope/Constraint/Policy) version 기반 캐시 구축.
- Cache Hit≥95% · P95≤20ms · P99≤50ms · Lock-Free Read Path(SPEC §35).
- 캐시 값이 불변 Snapshot(§18) 참조로만 채워짐 — Cache Poisoning 0(SPEC §36 security).
- Cache Invalidation(§22) 트리거와 정합 — version 변경 시 즉시 stale 처리.
- Tenant 격리 회귀 0 · CACHE_CORRUPTED(SPEC §30) 에러 계약 구현.
- **선행 의존**: 캐시 값 = Snapshot(§18), 키 = Digest(§20), 무효화 = §22 — 모두 선행. 본 편 **코드/DB 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**.

### 6.1 테스트 전략 (SPEC §36 중 본 축 해당분)

- **Performance**: Cache Hit≥95% · P95≤20ms · P99≤50ms · 100K Concurrent Resolution · Incremental Cache Refresh(SPEC §35·§36).
- **Integration**: Hit/Miss 경로가 동일 결과를 반환(투명성) · Miss 시 라이브 fallthrough 정확성.
- **Security(Cache Poisoning)**: 캐시 값이 불변 Snapshot 참조로만 채워지고 임의 쓰기 불가한지 · CACHE_CORRUPTED 처리.
- **Regression**: 캐시 비활성/무효화 후 라이브 재계산과 100% 일치(무후퇴).

### 6.2 인접 엔진 경계

Cache는 Snapshot(§18)을 값으로, Digest(§20)를 키로 서빙하며 Cache Invalidation(§22)이 version 변경 시 stale 처리한다. `Connectors` 채널캐시·`PgSettlement`·`ChannelRegistry`·`PriceOpt`의 캐시/레지스트리는 각 도메인 것이며 권한 캐시가 아니다(§2.3) — 오흡수·개명 금지.

## 7. 반날조 인용 출처

- `backend/src/Handlers/TeamPermissions.php:202`·`:215`·`:236`·`:393`·`:423` — 매 요청 재계산 substrate(Ground-Truth ①②)
- `backend/src/Handlers/Catalog.php:1036` · `backend/src/Handlers/Keys.php:99` — constraint substrate(Ground-Truth ②)
- `backend/src/PlanPolicy.php:19` — 정적 정책 상수(Ground-Truth ①)
- `backend/src/Handlers/Connectors.php:819` — 채널캐시 **KEEP_SEPARATE**(Ground-Truth ②)

그 밖의 모든 Cache 거버넌스 로직·전용 테이블은 **ABSENT**(grep 0). 실 엔진은 별도 승인세션(RP-track).
