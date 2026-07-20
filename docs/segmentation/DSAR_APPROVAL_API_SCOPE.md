# DSAR — API Scope (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 3-4)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **스펙 근거**: [`EPIC_06A_PART3_4_SCOPED_ROLE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_4_SCOPED_ROLE_GOVERNANCE_SPEC.md) §19 API Scope(API · Endpoint · Method)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment(Part 3-1/3-2/3-3)·Decision Core 실구현 후 별도 승인세션.
- **불변**: Default Intersection(§9 Scope Policy 기본) · envLabel≠Scope(배포라벨을 데이터 scope로 오분류 금지) · 반날조(부재 날조·실재 과신 양방향 금지) · 289차 P1~P4 재플래그 금지.

---

## 1. 목적

**API/Endpoint/HTTP Method 단위 접근범위**를 정형화한다. 프로그래매틱 접근(api_key)이 어떤 엔드포인트·메서드를 호출할 수 있는지를 Role Scope와 별개 축으로 정형화하되, 기존 api_key.scopes_json 및 index.php RBAC 게이트를 Canonical API Scope의 substrate로 재사용한다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `api_scope_code` | API Scope 식별자 |
| `api_ref` | 대상 API(서비스/버전 prefix, 예 `/v423`) 참조 |
| `endpoint_ref` | 대상 Endpoint(route) 참조 |
| `method` | HTTP Method(GET/POST/PUT/PATCH/DELETE) |
| `required_scope_token` | 요구되는 scope 토큰(`read:*`/`write:*`/`write:ingest`/`admin:keys` 등) |
| `required_role_floor` | 요구되는 최소 role(`viewer<connector<analyst<admin`) |

## 3. 열거형 / 타입

- **scope_level**: `API` · `ENDPOINT` · `METHOD`(스펙 §19 열거 그대로).
- **scope_token**(근접 substrate 값 집합): `read:*` · `write:*` · `write:ingest` · `admin:keys`(`Keys.php:189-195,201-210`).
- **role_floor**: `viewer` · `connector` · `analyst` · `admin`.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| api_key scope 토큰(동작권한 축) | `api_key.scopes_json` | **PRESENT(별개 축)** | EXISTING §3 · `Keys.php:189-195`(defaultScopes)·`:201-210`(allowedScopesForRole) |
| 게이트웨이 강제(Method/Role 단위) | index.php 인증 미들웨어 | **PRESENT** | `index.php:573-598`(admin:keys `:583-586`·write:*/write:ingest/analyst `:587-597`) |
| Endpoint(route) 개별 단위 scope | — | **ABSENT(근접만)** | 근접=index.php가 role/scope 토큰으로 write 여부만 판정, 개별 endpoint별 화이트리스트 grep 0 |
| api_key defaultScopes 정의 산재 | `UserAuth.php:4305-4311` · `Keys.php:191` | **중복(2곳)** | DUPLICATE §D-3 "동일 값·구조적 2곳 유지보수" |
| data_scope와의 교집합 | — | **ABSENT** | EXISTING §3 "RBAC scope(동작권한)와 data_scope(행필터)는 별개 축·교집합 로직 grep 0" |

★API Scope는 스펙 §19의 API/Endpoint/Method 3단위 중 **Method(HTTP verb) 및 API(버전 prefix) 단위는 PARTIAL(근접 실재)**, **Endpoint(개별 route) 단위 화이트리스트는 ABSENT**로 판정한다. api_key scope 토큰(`write:*` 등)은 스펙의 API Scope와 개념적으로 가장 가까운 substrate이나, RBAC 동작권한 축이며 data_scope(행필터)와는 교집합 로직이 없다(EXISTING §3).

## 5. 설계 원칙

- Canonical API Scope는 api_key.scopes_json + index.php 게이트를 **통합**(Golden Rule — 중복 API Scope Resolver 신설 금지).
- api_key defaultScopes 2곳 산재(`UserAuth.php:4305-4311`·`Keys.php:191`)를 단일 정의로 통합(DUPLICATE §D-3, ADR D-1 표 "api_key scope | PROGRAMMATIC_SCOPE(별개 축·통합)").
- data_scope(행필터)와 API Scope(동작권한)는 계속 별개 축으로 보존하되, Effective Scope Engine(§27)에서 교집합 계산 — 어느 한쪽이 다른 쪽을 자동 확장하지 않음(Default Intersection).
- Endpoint 단위 화이트리스트(개별 route별 허용/차단)는 순신규 — 현재는 role/scope 토큰 단위 게이팅만 존재.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: Method/API 단위=PARTIAL 실재, Endpoint 단위=ABSENT, data_scope 교집합=ABSENT.
- api_key defaultScopes 중복 정의 미통합(구조적 리스크·drift 없으나 유지보수 2곳).
- **BLOCKED_PREREQUISITE**: Canonical Scope Registry 통합 및 선행 Permission/Role 계열 실구현 후 — **RP-002**.
- 289차 P1~P4(특히 P1 writeGuard 서버전역) 재플래그 금지 — 기존 writeGuard 강제는 이미 반영된 것으로 취급.
