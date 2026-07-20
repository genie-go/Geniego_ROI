# DSAR — ERRE Database Constraint (EPIC 06-A-03-02-03-04 Part 3-7 · per-entity: Effective Role Resolution Engine Database Constraint)

- **상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
- **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §33
- **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
- **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
- **불변**: 테넌트 격리 절대 · 불변(immutable) 스냅샷 · 무후퇴(Extend-only) · 반날조(`파일:라인`은 SPEC·ADR·Ground-Truth ①② 등장분만·없으면 ABSENT)

---

## 1. 목적

SPEC §33(Database Constraint)은 ERRE의 resolution 데이터가 만족해야 하는 **6개 DB 제약**을 정의한다.

원문 6종(§33):

1. Immutable Resolution Version
2. Snapshot Integrity
3. Digest Validation
4. Graph Integrity
5. Tenant Isolation
6. Version Binding

본 문서는 이 6개 제약 각각을 현행 DB substrate와 대조한다. 판정 핵심(ADR §2.2·Ground-Truth ② §5): **Tenant Isolation은 실재**(모든 쿼리 `WHERE tenant_id=?`)하나, **전용 resolution 테이블은 전부 ABSENT**(`effective_role`/`resolution_snapshot`/`resolution_version`/`role_graph`/`sod_*` grep 0). RBAC substrate(`team`/`acl_permission`/`data_scope`)는 마이그레이션 파일 밖에서 **런타임 생성**(`TeamPermissions.php:139`)되며 **version binding·immutable 이력이 부재**(acl_permission UPDATE in-place). 즉 판정 = **PARTIAL**(tenant isolation 실재 + version binding/immutable ABSENT).

## 2. Ground-Truth (substrate or ABSENT+KEEP_SEPARATE)

### 2.1 실존 substrate (PARTIAL)

- **Tenant Isolation PRESENT**(② §5): 모든 RBAC 쿼리가 `WHERE tenant_id=?`(`TeamPermissions.php:202`·`:215`). 미들웨어가 `auth_tenant` 주입 + `X-Tenant-Id` 강제덮어쓰기로 위조차단(`index.php:608`). `authedTenant()`(`UserAuth.php:409`)가 인증 user 격리 tenant 산출. **6제약 중 유일하게 실재.**
- **RBAC substrate 런타임 생성**(② §5): `team`/`acl_permission`(subject_type×subject_id×menu_key×actions)/`data_scope`(scope_type×values)는 `backend/migrations/*.sql`에 없고 `TeamPermissions::ensureSchema`(`TeamPermissions.php:139`)가 요청 시 `CREATE TABLE IF NOT EXISTS`로 생성. **스키마 거버넌스(마이그레이션 파일) 밖.**
- **영속 재계산**: `replacePerms()`(`TeamPermissions.php:325`)·`replaceScope()`(`:337`)가 DELETE→INSERT 전체교체. **in-place 변경·버전 없음**(이력/스냅샷 미보존).

### 2.2 ABSENT 거버넌스 (SPEC §33 전용 제약)

- **전용 resolution 테이블 ABSENT**(② §5): `effective_role`/`resolution_snapshot`/`resolution_version`/`role_graph`/`sod_*` = 백엔드·`backend/migrations/` grep 0.
- **Immutable Resolution Version(#1)·Version Binding(#6) ABSENT**(② §5): acl_permission UPDATE in-place, 이력/버전 컬럼 없음. `replacePerms()`(`TeamPermissions.php:325`)가 이전 상태 미보존.
- **Snapshot Integrity(#2)·Digest Validation(#3) ABSENT**(② §2 #3): 불변 스냅샷/해시 영속 자체 grep 0. `effectiveForUser()`(`TeamPermissions.php:393`)는 반환만·저장 안 함.
- **Graph Integrity(#4) ABSENT**(② §2 #2): role↔role 그래프 테이블·엣지 무결성 제약 grep 0.
- **migrations 실측**(② §5): role/permission/resolution SQL 0. pm_task_dependencies·menu_tree·plan_menu_access 등 비-권한resolution만 존재.

### 2.3 KEEP_SEPARATE (오흡수 금지 · 가짜녹색 회피)

- `SecurityAudit.php:56-64`(append-only 해시체인)는 audit 무결성이지 **resolution snapshot integrity가 아니다**(Ground-Truth ② §4). Digest Validation(#3)으로 흡수 금지.
- `ChannelRegistry.php`(`channel_registry`/`risk_model_registry` 테이블)는 채널/모델 레지스트리지 role graph가 아니다. `Db.php`는 PDO 싱글턴·스키마 부트스트랩 참고용.

## 3. Canonical 설계 (6 Constraint)

| # | 제약 | 대상 테이블(설계) | 판정 | 근거(`파일:라인`) |
|---|---|---|---|---|
| 1 | Immutable Resolution Version | `resolution_version`(append-only) | **ABSENT** | 버전 테이블 grep 0(② §5). acl_permission UPDATE in-place(`TeamPermissions.php:325`) |
| 2 | Snapshot Integrity | `resolution_snapshot`(불변) | **ABSENT** | 스냅샷 영속 grep 0(② §2 #3). `effectiveForUser`(`TeamPermissions.php:393`) 반환만 |
| 3 | Digest Validation | snapshot digest 컬럼 | **ABSENT** | 권한 digest grep 0. SecurityAudit 해시체인은 KEEP_SEPARATE |
| 4 | Graph Integrity | `role_graph`(DAG 제약) | **ABSENT** | role↔role 그래프 테이블 grep 0(② §2 #2) |
| 5 | Tenant Isolation | 전 테이블 `tenant_id` | **PRESENT** | 모든 쿼리 `WHERE tenant_id=?`(`TeamPermissions.php:202`·`:215`)·주입(`index.php:608`)·격리(`UserAuth.php:409`) |
| 6 | Version Binding | snapshot↔version FK | **ABSENT** | 이력/버전 바인딩 부재(② §5). RBAC substrate 런타임 생성(`TeamPermissions.php:139`) |

**설계 원칙**:

1. **Tenant Isolation 무후퇴 최우선(#5)** — 현행 `WHERE tenant_id=?` 전면 강제(`TeamPermissions.php:202`)·`X-Tenant-Id` 위조차단(`index.php:608`)을 ERRE 전용 테이블에도 **동일 강제**. 테넌트 격리는 데이터 헌법상 절대 — 후퇴·완화 금지.
2. **불변 스냅샷 신설(#1·#2·#6)** — resolution 결과를 append-only `resolution_snapshot`+`resolution_version`으로 영속. 현행 `replacePerms()`(`TeamPermissions.php:325`) DELETE→INSERT는 grant 영속용으로 존치하되, **effective 결과 스냅샷은 별도 불변 테이블**로 신설(in-place 변경 금지).
3. **RBAC substrate 마이그레이션 정합(#6)** — `TeamPermissions::ensureSchema`(`TeamPermissions.php:139`) 런타임 CREATE를 마이그레이션 파일로 승격하고 version binding 컬럼 추가(ADR D-8 아키텍처 부채 정합 대상).
4. **Digest는 SecurityAudit와 분리(#3)** — resolution digest는 스냅샷 무결성용 자체 해시. `SecurityAudit.php:56-64` audit 체인을 재사용·개명 금지.

### 3.1 제약별 정직 판정 서술

- **Immutable Resolution Version(#1, ABSENT) / Version Binding(#6, ABSENT)**: 현행 grant 모델은 `replacePerms()`(`TeamPermissions.php:325`)·`replaceScope()`(`:337`)가 DELETE→INSERT로 **이전 상태를 파괴**한다. 즉 "이 subject가 3월엔 어떤 권한이었나"를 재구성할 수 없다 — 이력·버전이 없다. ERRE의 immutable version은 grant 변경마다 새 버전을 append하여, 임의 시점의 effective를 재현 가능하게 한다. 이는 grant 테이블(mutable)과 분리된 별도 이력 테이블로 신설된다.
- **Snapshot Integrity(#2, ABSENT) / Digest Validation(#3, ABSENT)**: `effectiveForUser()`(`TeamPermissions.php:393`)는 결과를 반환만 하고 저장하지 않는다. 저장이 없으니 무결성 검증할 대상도 없다. Snapshot Integrity는 저장된 effective 결과가 변조되지 않았음을 digest 해시로 보증한다. 이 digest는 `SecurityAudit.php:56-64`의 audit 해시체인과 목적이 다르다(audit=행위 이력 tamper-evidence, snapshot digest=계산 결과 무결성) — 재사용·통합 금지.
- **Graph Integrity(#4, ABSENT)**: role↔role 상속 그래프 테이블(`role_graph`)이 없어(② §5) DAG 무결성(순환 금지·SPEC §5)을 강제할 대상이 없다. 근접물 menu_tree(`AdminMenu.php:504` wouldCycle)는 메뉴 트리 순환탐지지 role 그래프가 아니므로 KEEP_SEPARATE.
- **Tenant Isolation(#5, PRESENT)**: 6제약 중 유일한 실재. 모든 RBAC 쿼리가 `WHERE tenant_id=?`(`TeamPermissions.php:202`·`:215`), 미들웨어가 `X-Tenant-Id`를 강제덮어써 클라이언트 위조를 차단하고(`index.php:608`), `authedTenant()`(`UserAuth.php:409`)가 인증 user의 격리 tenant를 산출한다. ERRE 전용 테이블은 이 격리 규율을 **그대로 상속**해야 한다.

## 4. Kernel 매핑 (SPEC §18~§21 ↔ DB 제약)

- **Snapshot Engine(§18)** → Immutable Version(#1)·Snapshot Integrity(#2). substrate ABSENT — `effectiveForUser()`(`TeamPermissions.php:393`) 결과를 영속화하는 것이 신설.
- **Digest Engine(§20)** → Digest Validation(#3). substrate ABSENT.
- **Resolution Graph(§5)** → Graph Integrity(#4). substrate ABSENT.
- **Tenant(§6 Context)** → Tenant Isolation(#5). substrate PRESENT=`WHERE tenant_id=?`(`TeamPermissions.php:202`·`:215`)·`authedTenant()`(`UserAuth.php:409`)·`index.php:608`.
- **Cache(§21, version 기반)** → Version Binding(#6). substrate ABSENT — RBAC 런타임 생성(`TeamPermissions.php:139`).

## 5. 무후퇴 · Extend

- **Tenant Isolation 절대 유지(ADR 데이터 헌법)**: `TeamPermissions.php:202`·`:215`의 `WHERE tenant_id=?`, `index.php:608` 위조차단을 ERRE 전용 테이블에도 강제. 격리 완화 절대 금지.
- **RBAC substrate 존치·확장(ADR D-1)**: `acl_permission`/`data_scope`/`team` 테이블과 `ensureSchema`(`TeamPermissions.php:139`)를 **삭제하지 않고** version binding·마이그레이션 정합으로 확장. `replacePerms()`(`:325`)·`replaceScope()`(`:337`) grant 영속 로직 유지.
- **불변 스냅샷은 별도 신설**: effective 결과 스냅샷 테이블은 기존 grant 테이블과 분리 신설 — grant는 mutable(현행), snapshot은 immutable(신설). 혼동·통합 금지.
- **KEEP_SEPARATE 불흡수**: `SecurityAudit.php:56-64` 해시체인·`ChannelRegistry` 레지스트리 테이블을 ERRE Digest/Graph 제약으로 통합·개명 금지.

### 5.1 무후퇴 회귀 시나리오

1. **격리 완화 금지**: ERRE 전용 스냅샷 테이블 도입 시 `WHERE tenant_id=?`(`TeamPermissions.php:202`) 필터 누락은 크로스테넌트 유출(가장 심각한 취약점). 모든 신규 쿼리는 tenant 선두 필터를 강제하며, 이는 회귀 테스트로 고정한다.
2. **grant 영속 로직 존치**: `replacePerms()`(`TeamPermissions.php:325`)·`replaceScope()`(`:337`) DELETE→INSERT는 현행 grant 저장 방식으로 유지. 불변 스냅샷은 이와 **별도 테이블**로 추가되며, grant 테이블을 immutable로 바꿔 기존 부여 UX를 깨지 않는다.
3. **런타임 CREATE 폴백 유지**: `ensureSchema`(`TeamPermissions.php:139`)를 마이그레이션으로 승격하되, SQLite fallback 등 무마이그레이션 환경(Db.php 폴백) 대비 런타임 CREATE IF NOT EXISTS 폴백은 존치.

### 5.2 스키마 거버넌스 부채 (ADR D-8 정합 대상)

현행 RBAC substrate(`acl_permission`/`data_scope`/`team`)는 `backend/migrations/`에 없고 `TeamPermissions.php:139` 런타임 생성이다(② §5). 이는 라이브 실결함은 아니나 **스키마 이력·버전 바인딩 부재**라는 아키텍처 부채다 — 마이그레이션 밖이라 스키마 변경 추적이 불가능하다. ERRE Database Constraint 도입은 이 substrate를 마이그레이션 파일로 승격하고 version binding 컬럼을 추가하는 정합 작업을 포함한다(즉시 수정 대상 아님·완료 게이트 통과 시). CLAUDE.md 명시대로 마이그레이션은 원격 서버에서만 실행되므로, 승격 시 운영/데모 양쪽 정합이 필수다.

## 6. 완료 게이트

- **BLOCKED_PREREQUISITE**: 6제약 중 5종(#1~#4·#6)이 전용 resolution 테이블 신설 이후 적용 가능. 본 단계는 스키마 계약만.
- **PRESENT(1종)**: Tenant Isolation(#5) — 무후퇴 유지·ERRE 전용 테이블로 확대 강제.
- **ABSENT(순신규 5종)**: Immutable Version(#1)·Snapshot Integrity(#2)·Digest Validation(#3)·Graph Integrity(#4)·Version Binding(#6).
- **완료 판정**: 6제약 전부 실 테이블·FK·CHECK 제약으로 강제 + 마이그레이션 파일 정합 + 테넌트 격리 회귀 0 + 불변성 검증. NOT_CERTIFIED 유지.

## 7. 반날조 인용 출처

본 문서가 인용한 `파일:라인`은 전부 SPEC §33 / ADR / Ground-Truth ①② 등장분이다.

- `backend/src/Handlers/TeamPermissions.php` — `:139`(ensureSchema 런타임 CREATE) · `:202`(subjectPerms `WHERE tenant_id`) · `:215`(subjectScope) · `:325`(replacePerms DELETE→INSERT) · `:337`(replaceScope) · `:393`(effectiveForUser)
- `backend/public/index.php` — `:608`(X-Tenant-Id 강제덮어쓰기·위조차단)
- `backend/src/Handlers/UserAuth.php` — `:409`(authedTenant 격리)
- `backend/src/Db.php` — PDO 싱글턴·스키마 부트스트랩(참고)
- `backend/migrations/*.sql` — role/permission/resolution SQL 부재 확인(② §5)
- **KEEP_SEPARATE(권한 아님·오흡수 금지)**: `SecurityAudit.php:56-64`(audit 해시체인) · `ChannelRegistry.php`(채널/모델 레지스트리 테이블)

---
**요약**: SPEC §33의 6 DB 제약 판정 = PRESENT 1(Tenant Isolation, `WHERE tenant_id=?` 전면)·ABSENT 5(Immutable Version/Snapshot Integrity/Digest/Graph Integrity/Version Binding). 전용 resolution 테이블 전부 grep 0. RBAC substrate는 마이그레이션 밖 런타임 생성(`TeamPermissions.php:139`)·in-place 변경(version 부재). 테넌트 격리 절대 유지 + 불변 스냅샷/버전 순신규. Extend-only·NOT_CERTIFIED.
