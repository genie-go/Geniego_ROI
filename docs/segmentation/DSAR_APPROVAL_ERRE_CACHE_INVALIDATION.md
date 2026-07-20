# DSAR — ERRE Cache Invalidation (EPIC 06-A-03-02-03-04 Part 3-7)

> **거버넌스 상태**: 설계 명세 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §22 Cache Invalidation
> **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
> **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
> **반날조**: 모든 `파일:라인`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만 인용. 그 밖은 `ABSENT`. Connectors 채널캐시 갱신·PgSettlement/Wms reconcile은 권한 무효화 아님(KEEP_SEPARATE). 289차 확정분(P1~P5) 재플래그 금지.

---

## 1. 목적

**ERRE Cache Invalidation**(SPEC §22)은 권한 입력이 변경될 때 stale된 Resolution Cache(§21)를 **정확한 트리거로 무효화**하는 축이다. 캐시가 실효 권한과 다른 값을 서빙하면 권한 상승·미회수(under-revocation)로 직결되므로, 무효화의 정합성은 fail-secure의 핵심이다.

SPEC §22가 규정하는 Invalidation 트리거는 7종이다.

- **Assignment 변경** — grant 부여·회수
- **Role 변경** — role 정의·권한 매핑 변경
- **Permission 변경** — permission 매핑 변경
- **Policy 변경** — RBAC/ABAC/plan 정책 변경
- **Scope 변경** — data_scope 차원값 변경
- **Dynamic Rule 변경** — ABAC 규칙 변경
- **Runtime Context 변경** — env/session/risk 컨텍스트 변경

무효화는 캐시 엔트리 삭제가 아니라 **`resolution_version` 증가로 stale 마킹**(version 기반, SPEC §21)이 정본 방식이다.

## 2. Ground-Truth 판정 (전수조사 기반 · ABSENT-dominant)

### 2.1 판정 = **ABSENT** (캐시가 없으니 무효화도 없음)

Cache/Invalidation(version)은 Ground-Truth ② 판정표 #4에서 **ABSENT**로 확정된다.

- **선행 부재**: resolution cache 자체가 grep 0(별편 Cache §21). 무효화할 캐시가 없으므로 무효화 트리거도 부재(Ground-Truth ② §2 #4).
- **version 시그널 부재**: `acl_permission`은 UPDATE in-place로 변경되며(Ground-Truth ② §5) 버전 증가·무효화 이벤트를 방출하지 않는다. 변경이 곧 무효화 신호가 되어야 하나 그 신호 자체가 없음.
- **매 요청 재조회로 우회**: 현행은 캐시가 없어 매 요청 DB 재조회(`TeamPermissions.php:202`·`:215`)하므로 stale 문제가 구조적으로 발생하지 않음 — 대신 성능(SPEC §35)을 희생(무효화 부재의 이면).

### 2.2 실존 substrate (변경 write 지점 = 미래 트리거 후보)

무효화 트리거가 걸릴 **write 지점**은 실재하나, 무효화를 방출하지 않는다.

- Assignment write: `replacePerms`(`TeamPermissions.php:325` DELETE→INSERT)·`putMemberPermissions`(`:641`)·`reclampTeamMembers`(`:809` 영속 재계산).
- Scope write: `replaceScope`(`TeamPermissions.php:337` DELETE→INSERT).
- api_key write: `Keys.php:88`·`:99`(role/scope 저장).
- 이들은 grant를 변경하나 캐시 무효화 이벤트를 emit하지 않음(캐시 부재).

### 2.3 ★KEEP_SEPARATE 오흡수 경고

- `Connectors.php:819` 채널캐시 갱신·`Wms` `reconcileChannelStock`·`PgSettlement` 정산 reconcile은 **데이터 도메인 캐시/정합이지 권한 무효화가 아니다**(Ground-Truth ② §4). Cache Invalidation으로 오흡수 금지(ADR D-5).
- `ModelMonitor`(model drift 재학습 트리거)의 무효화·재계산 개념은 ML 도메인 — 권한 resolution 아님.

## 3. Canonical 설계 (`ERRE_CACHE_INVALIDATION` · 전부 신규 · 실값 아님)

| # | 필드 | 의미 |
|---|---|---|
| 1 | invalidation_id | 무효화 이벤트 식별자 |
| 2 | tenant | 테넌트 스코프(격리 필수) |
| 3 | trigger_type | 7종 트리거(③) |
| 4 | affected_subject_ref | 영향 주체(단건/집합) |
| 5 | prev_resolution_version | 무효화 전 버전 |
| 6 | new_resolution_version | 무효화 후 증가 버전 |
| 7 | source_write_ref | 무효화를 유발한 write 지점 참조 |
| 8 | invalidated_at | 무효화 시각 |
| 9 | propagation_status | 전파 상태(캐시 노드 반영 완료 여부) |

### 3.1 열거형 / 타입

- **trigger_type**: ASSIGNMENT · ROLE · PERMISSION · POLICY · SCOPE · DYNAMIC_RULE · RUNTIME_CONTEXT (SPEC §22)

### 3.2 설계 원칙

- **version 증가 방식**: 캐시 삭제가 아니라 `resolution_version` 증가로 stale 마킹 — 다음 요청이 새 버전으로 Miss→재계산→적재(SPEC §21 Version 기반).
- **write 지점 hook**: 모든 grant/scope/policy write가 무효화 이벤트를 **부수 방출**. 누락 = under-revocation 위험 → Static Lint(§29)·Revalidation(§24)로 이중 안전망.
- **fail-secure**: 무효화 확신 불가 시 캐시 stale 간주(재계산 강제) — 오래된 권한 서빙 금지.
- **Tenant 격리**: 무효화 전파는 tenant 경계 내 — cross-tenant 캐시 오무효화·오유지 금지.

### 3.3 Error / Warning 계약 (SPEC §30·§31 중 본 축 해당분)

- **Cache Rebuild Required 경고**(SPEC §31): 무효화 후 다음 요청이 Miss→재빌드해야 함을 알림.
- **Policy Updated 경고**(SPEC §31): Policy 트리거 무효화 시 방출 — 정책 변경이 실효에 반영됨을 관측.
- **CACHE_CORRUPTED**(SPEC §30): 무효화 누락으로 stale 서빙이 감지되면 오염 처리·강제 재빌드.

### 3.4 API · 인덱스 · 성능 (SPEC §32·§34·§35)

- **API**: 무효화는 직접 호출 API가 아니라 write hook 부수 이벤트가 정본. 관측용 조회는 Validate Resolution에 포함.
- **인덱스**: affected_subject·Version 인덱스(SPEC §34)로 무효화 대상 조회 O(log n).
- **성능**: version 증가 방식은 개별 캐시 엔트리 삭제보다 전파 비용이 낮음(Incremental Recalculation, SPEC §35). under-revocation 0이 성능보다 우선.

## 4. Kernel 매핑 (트리거별 write 지점)

| Trigger(SPEC §22) | write 지점 | 최근접 substrate | 판정 |
|---|---|---|---|
| Assignment 변경 | `replacePerms`·`putMemberPermissions`·`reclampTeamMembers` | `TeamPermissions.php:325`·`:641`·`:809` | **PARTIAL**(write 있음·emit 없음) |
| Scope 변경 | `replaceScope` | `TeamPermissions.php:337` | **PARTIAL**(write 있음·emit 없음) |
| Permission/Role 변경 | api_key role/scope 저장 | `Keys.php:88`·`:99` | **PARTIAL**(write 있음·emit 없음) |
| Policy 변경 | plan 상수·게이트 | `PlanPolicy.php:19`·`:27` | **ABSENT**(정적 상수·런타임 변경 이벤트 없음) |
| Dynamic Rule 변경 | Part 3-5 Dynamic/ABAC | — | **BLOCKED_PREREQUISITE** |
| Runtime Context 변경 | context 주입 | `index.php:608` | **PARTIAL**(주입만·무효화 없음) |
| **무효화 emit·전파 자체** | Invalidation(§22) | — | **ABSENT** |

## 5. 무후퇴 · Extend

- **Golden Rule(Extend)**: `replacePerms`(`:325`)·`replaceScope`(`:337`)·`reclampTeamMembers`(`:809`) 등 기존 write 경로를 파괴하지 않고, 각 write 성공 직후 무효화 이벤트를 **부수 방출**하도록 확장. write 시맨틱 무변경.
- **reclampTeamMembers 관계**: `:809`는 팀권한 축소 시 멤버 권한을 영속 재클램프하는 실재 로직 — 이는 Revalidation(§24)의 근접물이나 **트리거 기반 캐시 무효화는 아니다**(별편 Revalidation §2 참조). Invalidation은 재클램프를 캐시 stale 마킹으로 이어붙이는 계층.
- **중복 무효화 금지**: `Connectors`/`Wms`/`PgSettlement` 데이터 reconcile(§2.3)과 별도로 권한 전용 무효화 채널 신설 — 혼합·개명 금지.
- **병행 유지**: 캐시 도입 전까지 매 요청 재조회가 사실상 "항상 무효화" 상태를 보장 — 무효화 미구현이 회귀를 유발하지 않음(캐시와 함께 도입).
- **실재 과신 회피(ADR D-7)**: `reclampTeamMembers`(`:809`)의 영속 재클램프는 무효화 emit이 아니다 — write는 있으나 캐시 stale 시그널을 방출하지 않는다.
- **부재 과장 회피(ADR D-7)**: 무효화 로직 grep 0은 실측 부재. write 지점은 실재하나(§2.2) 무효화를 촉발하지 않음.

### 5.1 점진 수렴 로드맵 (무후퇴)

1. **hook 부착**: 모든 grant/scope/policy write 성공 직후 무효화 이벤트 emit(캐시 없어도 무해).
2. **version 증가**: 무효화가 `resolution_version`을 증가시켜 다음 캐시 Miss 유도.
3. **누락 감사**: Static Lint(§29)로 무효화 emit 누락 write 경로를 탐지·수렴(under-revocation 0).
- 각 단계는 write 시맨틱 무변경·부수 이벤트만 추가.

## 6. 완료 게이트

- Cache Invalidation 7종 트리거(Assignment/Role/Permission/Policy/Scope/Dynamic Rule/Runtime Context) 무효화 이벤트 방출·전파 구축.
- version 증가 방식 무효화 — 모든 grant/scope/policy write가 무효화 emit(누락 0, Static Lint §29 검증).
- under-revocation 0 — 무효화 후 stale 서빙 회귀 테스트 통과(SPEC §36 Regression).
- Runtime Context Changed 경고 계약(SPEC §31)·Cache Rebuild Required 경고 구현.
- Tenant 격리 회귀 0.
- **선행 의존**: Cache(§21)·Snapshot(§18)·version binding 선행. Dynamic Rule 트리거는 Part 3-5 선행. 본 편 **코드/DB 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**.

### 6.1 테스트 전략 (SPEC §36 중 본 축 해당분)

- **Security(under-revocation)**: grant 회수·정책 강화 후 stale 캐시가 옛 권한을 서빙하지 않는지(권한 미회수 0) — 최우선 시나리오.
- **Integration**: 7종 트리거 각각이 정확히 무효화를 emit하는지 · 무효화 전파가 tenant 경계를 넘지 않는지.
- **Performance**: version 증가 방식이 전파 비용을 낮추는지(Incremental Recalculation).
- **Regression**: 무효화 hook 추가가 write 시맨틱을 바꾸지 않는지(무후퇴).

### 6.2 인접 엔진 경계

Cache Invalidation은 Cache(§21)의 stale 마킹을 담당하며, Revalidation(§24)의 능동 재검증과 짝을 이루나 다르다 — 무효화=lazy(다음 요청이 재계산), 재검증=eager(즉시 재산출). `Connectors`/`Wms`/`PgSettlement` 데이터 reconcile·`ModelMonitor` 재학습 트리거는 권한 무효화가 아님(§2.3).

## 7. 반날조 인용 출처

- `backend/src/Handlers/TeamPermissions.php:202`·`:215`·`:325`·`:337`·`:641`·`:809` — write·재계산 substrate(Ground-Truth ①②)
- `backend/src/Handlers/Keys.php:88`·`:99` — api_key role/scope write(Ground-Truth ①)
- `backend/src/PlanPolicy.php:19`·`:27` — 정적 정책 상수(Ground-Truth ①)
- `backend/public/index.php:608` — runtime context 주입(Ground-Truth ①)
- `backend/src/Handlers/Connectors.php:819` — 채널캐시 **KEEP_SEPARATE**(Ground-Truth ②)

그 밖의 모든 Invalidation 거버넌스 로직은 **ABSENT**(grep 0). 실 엔진은 별도 승인세션(RP-track).
