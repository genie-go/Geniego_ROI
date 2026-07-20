# DSAR — ERRE Resolution Snapshot Engine (EPIC 06-A-03-02-03-04 Part 3-7)

> **거버넌스 상태**: 설계 명세 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §18 Snapshot Engine
> **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
> **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
> **반날조**: 모든 `파일:라인`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만 인용. 그 밖은 `ABSENT`. **SecurityAudit 해시체인 ≠ resolution snapshot**(KEEP_SEPARATE). 289차 확정분(P1~P5) 재플래그 금지.

---

## 1. 목적

**ERRE Resolution Snapshot Engine**(SPEC §18)은 특정 시점의 effective 권한 계산 결과 전체를 **불변(immutable)으로 동결**하는 축이다. 런타임 접근 제어는 매번 재계산하지 않고 이 스냅샷을 참조(lock-free read path, SPEC §35)하며, 이것이 결정적(deterministic)·감사가능(traceable) authorization의 물리적 기반이 된다.

SPEC §18이 규정하는 Snapshot 저장 대상은 7종이다.

- **Effective Roles** — 중복 제거·canonical ordering 후 최종 role 집합(SPEC §7)
- **Effective Permissions** — merge rule 적용 후 최종 permission 집합(SPEC §8)
- **Effective Scopes** — intersection 적용 후 최종 scope 집합(SPEC §9)
- **Constraints** — time/device/region/amount/API 등 제약(SPEC §10)
- **Deny** — Explicit/Runtime/Risk/Policy/Environment Deny(SPEC §11)
- **Risk** — Effective Risk 등급(SPEC §12)
- **Resolution Version** — 스냅샷을 산출한 정책·입력 버전 바인딩(SPEC §33)

Snapshot은 "지금 이 주체가 무엇을 가졌는가"가 아니라 **"그 버전·그 시점에 무엇을 가졌는가"**를 사후 재구성하기 위한 substrate다. Reconciliation(별편 §25)·Drift(별편 §23)의 "기대값(expected)" 원본이다.

## 2. Ground-Truth 판정 (전수조사 기반 · ABSENT-dominant)

### 2.1 판정 = **ABSENT** (effective 결과는 반환만·저장 안 함)

Snapshot/Digest/Version(immutable)은 Ground-Truth ② 판정표 #3에서 **ABSENT**로 확정된다.

- **핵심 근거**: effective 결과를 불변 스냅샷·해시·버전으로 영속하는 로직 grep 0. `effectiveForUser`(`TeamPermissions.php:393`)는 결과를 **반환만 하고 저장하지 않는다**(Ground-Truth ② §2 #3 명시).
- **매 요청 재계산**: 권한은 매 요청 DB 재조회(`TeamPermissions.php:202`·`:215`)로 즉석 산출되며, 어떤 시점의 결과도 동결되지 않는다(Ground-Truth ② §1).
- **version binding 부재**: `acl_permission`은 UPDATE in-place 변경으로 이력·버전이 없다(Ground-Truth ② §5). immutable 제약 없이 최신값만 유지.
- **전용 테이블 부재**: `resolution_snapshot`/`resolution_version` 테이블은 백엔드·`backend/migrations/` grep 0(Ground-Truth ② §5).

### 2.2 실존 substrate (PARTIAL·동결될 "값"만 존재)

Snapshot에 담길 effective **값 자체**는 라이브 계산으로 존재하나, 이를 시점 동결하는 계층이 없다.

- Effective Roles/Permissions 값: `effectiveForUser`(`TeamPermissions.php:393`)·`normActions`(`TeamPermissions.php:182`)가 canonical ordering·dedupe까지 수행(Ground-Truth ① §2).
- Effective Scopes 값: `effectiveScope`(`TeamPermissions.php:236`)가 owner→null·비-owner 실패→`__deny__`(`:234`)·상속 clamp까지 산출.
- Deny 값: 통합 deny는 부재하나 scope 차원 `__deny__` 센티넬(`TeamPermissions.php:234`→`:272`→`:286`)로 국소 존재.

### 2.3 ★KEEP_SEPARATE 오흡수 경고

- `SecurityAudit.php:25`~`:31`·`:56`~`:64` **append-only 해시체인은 snapshot이 아니라 audit이다**(Ground-Truth ② §4 명시). 이벤트 무결성 체인이지 effective 권한 상태의 시점 동결이 아니며, Reconciliation의 "기대값"이 될 수 없다. Snapshot Engine으로 병합·개명 금지(ADR D-5, 가짜녹색 회피).
- `PgSettlement`(정산 reconciliation)·`Connectors.php:819`(요청당1회 채널캐시)의 스냅샷 유사 개념은 정산·채널 도메인이며 권한 resolution 아님 — 오흡수 금지.

## 3. Canonical 설계 (`ERRE_RESOLUTION_SNAPSHOT` · 전부 신규 · 실값 아님)

| # | 필드 | 의미 |
|---|---|---|
| 1 | snapshot_id | 스냅샷 식별자 |
| 2 | tenant | 테넌트 스코프(격리 필수 · 전역 스냅샷 금지) |
| 3 | subject_ref | 대상 주체(user/api_key/service identity) |
| 4 | resolution_version | 산출 정책·입력 버전 바인딩(불변) |
| 5 | effective_roles | canonical ordering·dedupe 후 role 집합(SPEC §7) |
| 6 | effective_permissions | merge rule 적용 후 permission 집합(SPEC §8) |
| 7 | effective_scopes | intersection 후 scope 집합(SPEC §9) |
| 8 | constraints | time/device/region/amount/API 등 제약(SPEC §10) |
| 9 | deny_set | Explicit/Runtime/Risk/Policy/Environment Deny(SPEC §11) |
| 10 | risk_level | Effective Risk 등급(SPEC §12) |
| 11 | captured_at | 동결 시각 |
| 12 | snapshot_digest | 무결성 다이제스트(별편 Digest §20 참조) |

### 3.1 설계 원칙

- **불변(Append-only)**: 스냅샷 생성 후 수정 금지 — 변경은 새 스냅샷(새 `resolution_version`). Evidence(§19)·Digest(§20)와 동일 불변 계열.
- **Version-aware / lock-free read**: 런타임은 최신 유효 스냅샷을 참조만 하며 재계산하지 않음(SPEC §35 Lock-Free Read Path). Cache(§21)가 이 스냅샷을 version 키로 서빙.
- **Reconciliation/Drift 기대값 원본**: Snapshot은 Reconciliation(§25)·Drift(§23)가 runtime 실측과 비교할 "기대값(expected)"의 정본.
- **Tenant 격리 절대**: `tenant` 필수(Ground-Truth ② §5 `WHERE tenant_id=?` 규율 계승).
- **DB 제약**: Immutable Resolution Version·Snapshot Integrity·Digest Validation·Version Binding(SPEC §33).

### 3.2 Error / Warning 계약 (SPEC §30·§31 중 본 축 해당분)

- **MISSING SNAPSHOT / MISSING VERSION**(SPEC §28 Runtime Guard): 스냅샷·버전이 없는 상태로 런타임 접근 시 Guard가 차단(fail-secure). 스냅샷 미존재는 "권한 없음"이 아니라 "판정 불가"로 처리해 재계산으로 유도.
- **CACHE_CORRUPTED**(SPEC §30): 캐시가 가리키는 스냅샷 무결성(Digest §20) 불일치 시 에러·재빌드.
- **Scope Narrowed 경고**(SPEC §31): 새 스냅샷이 이전보다 scope를 좁힌 경우 경고 방출(정상 축소이나 관측 필요).

### 3.3 API 표면 (SPEC §32 중 본 축 해당분)

- **Compare Snapshots**: 두 스냅샷(버전)의 effective 차이(Permission/Scope/Risk Diff)를 반환 — Drift(§23)·Simulation(§26)의 기반.
- **Validate Resolution**: 스냅샷 Integrity·Version Binding 검증.
- 스냅샷은 **쓰기 API로 수정 불가** — 변경은 새 버전 생성만.

### 3.4 인덱스 · 성능 (SPEC §34·§35)

- **인덱스**: Subject·Snapshot·Version 인덱스(SPEC §34)로 런타임 lookup O(log n).
- **성능**: 스냅샷 참조는 lock-free read path(SPEC §35 P95≤20ms·Cache Hit≥95%)의 물리적 기반 — 재계산을 스냅샷 조회로 대체하는 것이 성능 목표 달성의 핵심 메커니즘.

## 4. Kernel 매핑 (동결 대상 값의 계산 소스)

| Snapshot 축(SPEC §18) | 계산 소스(Pipeline §4) | 최근접 substrate | 판정 |
|---|---|---|---|
| Effective Roles | Effective Role Generation(14) | `TeamPermissions.php:393`·`:182` | **PARTIAL**(값만·동결 없음) |
| Effective Permissions | Effective Permission Generation(15) | `TeamPermissions.php:393`·`:423` | **PARTIAL**(값만·동결 없음) |
| Effective Scopes | Scope Projection(7) | `TeamPermissions.php:236`·`:286` | **PARTIAL**(값만·동결 없음) |
| Constraints | Constraint Projection(8) | `Catalog.php:1036`·`UserAuth.php:941`·`Keys.php:99` | **PARTIAL**(분산·통합모델 없음) |
| Deny | Deny Projection(9) | `TeamPermissions.php:234` `__deny__` | **PARTIAL**(scope 차원만) |
| Risk | Risk Projection(10) | — | **ABSENT**(Risk Calculator 부재) |
| Resolution Version | Snapshot Generation(16) | `acl_permission` UPDATE in-place | **ABSENT**(version binding 부재) |
| **시점 동결 자체** | Snapshot Generation(16) | — | **ABSENT** |

> Constraint의 3개 substrate(`Catalog.php:1036` HIGH_VALUE_KRW·`UserAuth.php:941` MFA·`Keys.php:99` scope+expires)는 분산 실재이나 통합 constraint 모델은 부재(Ground-Truth ② §2 #8) — 동결 시 통합 스키마 신설 필요.

## 5. 무후퇴 · Extend

- **Golden Rule(Extend)**: `effectiveForUser`(`TeamPermissions.php:393`)를 파괴하지 않고, 계산 완료 직후 결과를 스냅샷으로 **부수 영속(persist-after-compute)**하도록 확장(ADR D-2). 팀 한정 로직을 plan·api_key 차원까지 확장해 통합 스냅샷 형성.
- **중복 스토어 금지**: `SecurityAudit` 해시체인(§2.3)과 별도 append-only 스냅샷 스토어 신설 — 감사 체인과 혼합·개명 금지.
- **forward-only**: 시행일 이후 전방 동결만. 소급 스냅샷 불가(과거 요청 결과는 재계산으로도 원본 재현 불가 — 정책·데이터 변동).
- **병행 유지**: 스냅샷 완성 전까지 현행 라이브 재계산 경로(미들웨어 RBAC·`effectiveScope`·`requirePlan`) 유지. 스냅샷은 read path 최적화를 추가할 뿐 판정을 바꾸지 않음.
- **실재 과신 회피(ADR D-7)**: `effectiveForUser`의 반환값은 "일시적 결과"이지 스냅샷이 아니다 — 매 요청 재생성되는 값을 "이미 동결된다"로 오판 금지.
- **부재 과장 회피(ADR D-7)**: `resolution_snapshot` 테이블 grep 0은 실측 부재. 단 `acl_permission` 등 RBAC substrate는 런타임 생성으로 실재(마이그레이션 밖) — "스키마 자체가 없다"로 확대 금지.

### 5.1 점진 수렴 로드맵 (무후퇴)

1. **shadow 동결**: `effectiveForUser` 계산 직후 결과를 스냅샷으로 기록(판정은 여전히 라이브 값 사용).
2. **참조 전환**: read path를 스냅샷 참조로 전환(Cache §21 Hit), Miss 시 라이브 fallthrough.
3. **버전 강제**: DB 제약(SPEC §33)으로 Immutable Version·Snapshot Integrity 강제, `acl_permission` version binding 부채(ADR D-8) 정합.
- 각 단계는 이전 경로를 유지한 채 겹쳐 쌓이며 판정 후퇴 없음.

## 6. 완료 게이트

- Snapshot Engine 7종 필드(Roles/Permissions/Scopes/Constraints/Deny/Risk/Version) immutable 영속 구축.
- Version binding — 동일 입력(Subject+Context+Version)→동일 스냅샷 100% 재현(SPEC §35 Deterministic 100%).
- Digest(§20)로 Snapshot Integrity 검증 · Cache(§21)가 version 키로 lock-free 서빙 · Cache Hit≥95%(SPEC §35).
- Reconciliation(§25)·Drift(§23)가 이 스냅샷을 기대값 정본으로 소비 가능.
- DB 제약(SPEC §33) — Immutable Version·Snapshot Integrity·Tenant Isolation·Version Binding 강제. `acl_permission` 런타임 생성 스키마의 version binding 부채(ADR D-8) 정합.
- **선행 의존**: 통합 스냅샷은 Part 1~3-6(plan/api_key/team 통합 PDP) 실구현 후. 본 편 **코드/DB 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**.

### 6.1 테스트 전략 (SPEC §36 중 본 축 해당분)

- **Unit(Snapshot)**: 동일 입력(Subject+Context+Version)→동일 스냅샷 재현 100%(Deterministic) · 불변성(생성 후 수정 시도 거부).
- **Integration(Assignment·Scope)**: `effectiveForUser`·`effectiveScope` 산출값이 스냅샷 7종 필드에 손실 없이 동결되는지.
- **Performance(Incremental Cache Refresh)**: 스냅샷 참조 read가 lock-free·P95≤20ms를 만족하는지.
- **Security(Cache Poisoning)**: 불변 스냅샷이 임의 쓰기로 변조 불가한지 · Digest(§20) 무결성 검증 통과.
- **Regression**: 라이브 재계산 경로와 스냅샷 참조 경로가 정확히 동일 판정을 내는지(무후퇴).

### 6.2 인접 엔진 경계

Snapshot은 Reconciliation(§25)·Drift(§23)의 "기대값(expected)" 정본이자 Cache(§21)가 서빙하는 값의 실체다. Evidence(§19 추론 근거)·Digest(§20 지문)와 불변 계열이나 역할이 구분된다. `SecurityAudit` 해시체인(감사 이벤트)과 절대 혼합 금지(§2.3).

## 7. 반날조 인용 출처

- `backend/src/Handlers/TeamPermissions.php:182`·`:234`·`:236`·`:272`·`:286`·`:393`·`:423` — effective 값 계산 substrate(Ground-Truth ①)
- `backend/src/Handlers/TeamPermissions.php:202`·`:215` — 매 요청 DB 재조회(Ground-Truth ②)
- `backend/src/Handlers/Catalog.php:1036` · `backend/src/Handlers/UserAuth.php:941` · `backend/src/Handlers/Keys.php:99` — 분산 constraint substrate(Ground-Truth ②)
- `backend/src/Handlers/SecurityAudit.php:25`~`:31`·`:56`~`:64` — 해시체인 **KEEP_SEPARATE**(Ground-Truth ②)

그 밖의 모든 Snapshot 거버넌스 로직·전용 테이블은 **ABSENT**(grep 0). 실 엔진은 별도 승인세션(RP-track).
