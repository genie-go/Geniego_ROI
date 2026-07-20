# DSAR — ERRE Index Strategy (EPIC 06-A-03-02-03-04 Part 3-7 · per-entity: Effective Role Resolution Engine Index Strategy)

- **상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
- **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §34
- **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
- **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
- **불변**: 테넌트 격리 절대(모든 인덱스 tenant_id 선두) · 무후퇴(Extend-only) · 반날조(`파일:라인`은 SPEC·ADR·Ground-Truth ①② 등장분만·없으면 ABSENT)

---

## 1. 목적

SPEC §34(Index)는 ERRE resolution의 P95≤20ms 성능(SPEC §35)을 뒷받침하는 **8개 인덱스**를 정의한다.

원문 8종(§34):

1. Subject
2. Assignment
3. Role
4. Permission
5. Scope
6. Runtime
7. Snapshot
8. Version

본 문서는 이 8개 인덱스 각각을 현행 DB substrate와 대조한다. 판정 핵심(Ground-Truth ② §5): **전용 resolution 테이블이 전부 ABSENT**이므로 8 인덱스 대상 테이블 자체가 대부분 부재(`resolution_snapshot`/`resolution_version`/`role_graph` grep 0). RBAC substrate(`acl_permission`/`data_scope`)는 런타임 생성(`TeamPermissions.php:139`)되며 매 요청 `WHERE tenant_id=?` 조회(`:202`·`:215`)를 수행하나 **인덱스 정의가 마이그레이션 밖**에 있어 명시적 인덱스 거버넌스가 부재하다. 즉 판정 = **ABSENT-dominant**(RBAC substrate 조회는 실재하나 전용 resolution 인덱스는 순신규).

## 2. Ground-Truth (substrate or ABSENT+KEEP_SEPARATE)

### 2.1 실존 근접 substrate (PARTIAL — 조회 패턴만)

- **Subject/Assignment 조회**: `subjectPerms()`(`TeamPermissions.php:202`)가 `WHERE tenant_id=? AND subject_type=? AND subject_id=?`로 acl_permission 조회, `subjectScope()`(`:215`)가 data_scope 조회. **조회 패턴(=인덱스 후보 컬럼)은 실재**하나 인덱스 DDL은 `ensureSchema`(`TeamPermissions.php:139`) 런타임 생성 내부라 마이그레이션 거버넌스 밖.
- **tenant 선두 조회**: 모든 RBAC 쿼리 `WHERE tenant_id=?`(② §5) — 복합 인덱스 선두 컬럼은 반드시 `tenant_id`(격리 절대).
- **api_key 조회**: 미들웨어가 sha256 해시로 api_key 조회(`index.php:575` role/rank/scopes 로드) — Subject Resolution 인덱스 근접.

### 2.2 ABSENT 거버넌스 (SPEC §34 전용 인덱스)

- **Snapshot/Version 인덱스 ABSENT**(② §5): `resolution_snapshot`/`resolution_version` 테이블 자체 grep 0 → 인덱스(#7·#8) 대상 부재.
- **Runtime 인덱스 ABSENT**(② §2 #6): Runtime Context 모델 부재 → 인덱스(#6) 대상 부재.
- **Role 인덱스 ABSENT**(② §2 #2): `role_graph` 등 role↔role 테이블 부재 → 인덱스(#3) 대상 부재.
- **명시적 인덱스 DDL 부재**(② §5): RBAC substrate 인덱스가 마이그레이션 파일에 없음 — `TeamPermissions.php:139` 런타임 CREATE 내부에 PK/UNIQUE만 존재할 수 있으나 성능 인덱스 거버넌스 부재.

### 2.3 KEEP_SEPARATE (오흡수 금지 · 가짜녹색 회피)

- `ChannelRegistry.php`(`channel_registry`/`risk_model_registry` 테이블 인덱스)·`Connectors.php:819`(채널캐시)는 채널/모델 데이터 인덱스지 **role resolution 인덱스가 아니다**(Ground-Truth ② §4). ERRE 인덱스로 흡수 금지.
- `PM/Dependencies.php:77-90`(task 그래프)·`GraphScore.php:13-25`(마케팅 그래프)의 그래프 조회 인덱스는 role graph가 아니다.

## 3. Canonical 설계 (8 Index)

| # | 인덱스 | 대상 테이블(설계)·키(선두 tenant_id) | 판정 | 근거(`파일:라인`) |
|---|---|---|---|---|
| 1 | Subject | `(tenant_id, subject_type, subject_id)` | **PARTIAL** | 조회 패턴 실재(`TeamPermissions.php:202`)·`userByToken`(`UserAuth.php:249`)·api_key(`index.php:575`). 명시 인덱스 DDL 마이그레이션 밖 |
| 2 | Assignment | `acl_permission(tenant_id, subject, menu_key)` | **PARTIAL** | subjectPerms 조회(`TeamPermissions.php:202`)·replacePerms(`:325`). 인덱스 거버넌스 부재 |
| 3 | Role | `role_graph(tenant_id, role_id)` | **ABSENT** | role↔role 테이블 grep 0(② §2 #2·§5) |
| 4 | Permission | `acl_permission(tenant_id, menu_key, actions)` | **PARTIAL** | subjectPerms menu_key⇒actions 맵(`TeamPermissions.php:202`). 전용 permission 인덱스 ABSENT |
| 5 | Scope | `data_scope(tenant_id, scope_type)` | **PARTIAL** | subjectScope 조회(`TeamPermissions.php:215`)·scopeValuesFor(`:272`). 인덱스 거버넌스 부재 |
| 6 | Runtime | `resolution_runtime(tenant_id, context_hash)` | **ABSENT** | Runtime Context 모델 부재(② §2 #6) |
| 7 | Snapshot | `resolution_snapshot(tenant_id, subject, version)` | **ABSENT** | 스냅샷 테이블 grep 0(② §2 #3·§5) |
| 8 | Version | `resolution_version(tenant_id, version)` | **ABSENT** | 버전 테이블 grep 0(② §5) |

**설계 원칙**:

1. **tenant_id 선두 강제(격리 절대)** — 8 인덱스 전부 복합 키 선두가 `tenant_id`. 현행 `WHERE tenant_id=?`(`TeamPermissions.php:202`) 패턴과 정합. 격리 완화 인덱스 금지.
2. **Subject/Assignment/Scope 인덱스 마이그레이션 승격(#1·#2·#5)** — 현행 조회 패턴(`TeamPermissions.php:202`·`:215`)의 인덱스를 `ensureSchema`(`:139`) 런타임 생성에서 마이그레이션 파일로 승격, 성능 인덱스 명시화(ADR D-8 정합).
3. **Snapshot/Version/Runtime/Role 인덱스는 전용 테이블 신설 후(#3·#6·#7·#8)** — 순신규. lock-free read path(SPEC §35)를 위해 snapshot 인덱스는 covering index 설계.
4. **Permission 인덱스는 actions 포함 covering(#4)** — subjectPerms의 menu_key⇒actions 맵(`TeamPermissions.php:202`)을 인덱스만으로 반환(테이블 조회 회피).

### 3.1 인덱스별 정직 판정 서술

- **Subject Index(#1, PARTIAL)**: subject 조회는 세 경로에서 일어난다 — 팀 acl_permission(`subjectPerms` `TeamPermissions.php:202`)·세션 user(`userByToken` `UserAuth.php:249`)·api_key(`index.php:575`). 조회 컬럼(tenant_id, subject_type, subject_id)은 인덱스 후보로 명확하나, DDL이 `ensureSchema`(`TeamPermissions.php:139`) 런타임 CREATE 내부에 있어 성능 인덱스가 마이그레이션 거버넌스 밖이다. 인덱스 존재 여부가 스키마 파일로 검증되지 않는 상태.
- **Assignment(#2)·Permission(#4)·Scope(#5) Index (PARTIAL)**: 전부 `acl_permission`/`data_scope`를 대상으로 하는 조회 인덱스다(`TeamPermissions.php:202`·`:215`). Permission 인덱스는 menu_key⇒actions 맵을 covering으로 만들어 P95≤20ms(§35)에 기여할 수 있으나, 현행은 명시 인덱스 거버넌스가 없어 테이블 스캔 리스크가 존재한다(데이터 규모 증가 시).
- **Role Index(#3, ABSENT)**: role↔role 그래프 테이블(`role_graph`)이 없어(② §5) 인덱스 대상 자체가 부재. Hierarchy/Composite 확장(SPEC §4 단계 4·5) 구현 시 신설.
- **Runtime(#6)·Snapshot(#7)·Version(#8) Index (ABSENT)**: 전용 테이블(`resolution_runtime`/`resolution_snapshot`/`resolution_version`)이 grep 0(② §5)이므로 인덱스 대상 부재. Snapshot 인덱스는 lock-free read path(§35 목표 #6)의 핵심으로, `(tenant_id, subject, version)` covering을 통해 런타임이 테이블 접근 없이 스냅샷을 읽도록 설계된다.

## 4. Kernel 매핑 (SPEC §4 Pipeline ↔ 인덱스)

- **Subject Resolution(1)** → Subject Index(#1). substrate=`roleOf()`(`TeamPermissions.php:120`)·`userByToken()`(`UserAuth.php:249`)·`index.php:575`.
- **Assignment Collection(3)** → Assignment(#2)·Permission(#4)·Scope(#5). substrate=`subjectPerms()`(`TeamPermissions.php:202`)·`subjectScope()`(`:215`).
- **Hierarchy/Composite Expansion(4·5)** → Role Index(#3). substrate ABSENT.
- **Runtime Projection(§6 Context)** → Runtime Index(#6). substrate ABSENT.
- **Snapshot Generation(16)** → Snapshot(#7)·Version(#8). substrate ABSENT.

## 5. 무후퇴 · Extend

- **조회 패턴 존치(ADR D-1)**: `subjectPerms()`(`TeamPermissions.php:202`)·`subjectScope()`(`:215`)의 `WHERE tenant_id=? AND subject...` 조회를 **변경하지 않고** 인덱스만 마이그레이션으로 명시화. 쿼리 재작성 아님.
- **tenant_id 선두 무후퇴**: 인덱스 선두 컬럼 격리 강제는 데이터 헌법상 절대 — 어떤 인덱스도 tenant 필터 없는 스캔 유도 금지.
- **런타임 CREATE 정합(ADR D-8)**: `ensureSchema`(`TeamPermissions.php:139`) 내부 인덱스를 마이그레이션 파일로 승격하되, 런타임 생성 폴백은 SQLite fallback 등 무마이그레이션 환경 대비 존치.
- **KEEP_SEPARATE 불흡수**: `ChannelRegistry`·`Connectors.php:819`·`PM/Dependencies.php:77-90`·`GraphScore.php:13-25`의 인덱스를 ERRE 인덱스로 통합 금지.

### 5.1 무후퇴 회귀 시나리오

1. **격리 인덱스 무후퇴**: 8 인덱스 선두 컬럼은 반드시 `tenant_id`. 인덱스 선두를 subject/role로 바꿔 tenant를 후행 컬럼으로 밀면, 옵티마이저가 tenant 필터 없는 스캔을 선택할 여지가 생겨 크로스테넌트 성능 유출 위험. 선두 tenant 규율은 회귀 고정.
2. **런타임 CREATE 인덱스 보존**: `ensureSchema`(`TeamPermissions.php:139`)가 생성하는 PK/UNIQUE는 마이그레이션 승격 후에도 유지 — 승격이 기존 제약을 누락하면 무결성 후퇴.
3. **covering 인덱스는 정확성 후행**: Permission covering(#4)이 stale 데이터를 서빙하지 않도록 grant 변경(`replacePerms` `TeamPermissions.php:325`) 시 인덱스도 즉시 갱신(트랜잭션 일관성).

### 5.2 성능-정확성 균형 (SPEC §35 연계)

인덱스 전략의 목적은 P95≤20ms(§35 #1)이나, 이는 정확성(deny 우선·fail-closed)을 훼손하지 않는 선에서다. Snapshot covering 인덱스(#7)로 lock-free read를 달성하더라도, Assignment/Policy 변경 시 스냅샷 무효화(SPEC §22)가 즉시 반영되지 않으면 stale allow를 서빙하게 된다 — 이는 성능을 위해 보안을 희생하는 안티패턴이다. 따라서 인덱스는 "빠르게 읽되 변경엔 즉시 무효화"라는 캐시 일관성(SPEC §21 version 기반)과 짝을 이뤄 설계되어야 한다. 현행은 캐시·스냅샷 자체가 부재(② §2 #3·#4)하므로 이 균형 설계는 순신규다.

## 6. 완료 게이트

- **BLOCKED_PREREQUISITE**: 8 인덱스 중 4종(#3·#6·#7·#8)이 전용 resolution 테이블 신설 이후 생성 가능. 본 단계는 인덱스 계약만.
- **PARTIAL(조회 패턴 실재 4종)**: Subject(#1)·Assignment(#2)·Permission(#4)·Scope(#5) — 마이그레이션 승격 대상.
- **ABSENT(순신규 4종)**: Role(#3)·Runtime(#6)·Snapshot(#7)·Version(#8).
- **완료 판정**: 8 인덱스 전부 tenant_id 선두 복합 키 + 마이그레이션 파일 명시 + P95≤20ms(§35) 벤치 통과 + EXPLAIN 인덱스 사용 검증. NOT_CERTIFIED 유지.

## 7. 반날조 인용 출처

본 문서가 인용한 `파일:라인`은 전부 SPEC §34 / ADR / Ground-Truth ①② 등장분이다.

- `backend/src/Handlers/TeamPermissions.php` — `:120`(roleOf) · `:139`(ensureSchema 런타임 CREATE) · `:202`(subjectPerms 조회) · `:215`(subjectScope 조회) · `:272`(scopeValuesFor) · `:325`(replacePerms)
- `backend/src/Handlers/UserAuth.php` — `:249`(userByToken)
- `backend/public/index.php` — `:575`(role/rank/scopes 로드)
- `backend/migrations/*.sql` — role/permission/resolution 인덱스 부재 확인(② §5)
- `backend/src/Db.php` — 스키마 부트스트랩(참고)
- **KEEP_SEPARATE(권한 아님·오흡수 금지)**: `ChannelRegistry.php` · `Connectors.php:819` · `PM/Dependencies.php:77-90` · `GraphScore.php:13-25`

---
**요약**: SPEC §34의 8 인덱스 판정 = PARTIAL 4(Subject/Assignment/Permission/Scope, 조회 패턴 실재·인덱스 거버넌스 마이그레이션 밖)·ABSENT 4(Role/Runtime/Snapshot/Version, 전용 테이블 부재). 전 인덱스 tenant_id 선두 강제(격리 절대). 현행 조회 인덱스를 `ensureSchema`(`TeamPermissions.php:139`) 런타임 생성에서 마이그레이션 승격 + 전용 테이블 인덱스 순신규. Extend-only·NOT_CERTIFIED.
