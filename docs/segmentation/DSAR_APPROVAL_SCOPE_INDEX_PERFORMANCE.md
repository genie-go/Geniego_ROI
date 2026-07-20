# DSAR — Scope Index & DB Constraint (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Index & DB Constraint)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Decision Core 실 구현 부재
- **불변**: 무후퇴 · Tenant Isolation 무력화 금지 · Default Intersection · Scope 자동확대 금지 · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차 재플래그 금지

---

## 1. 목적

§45(Database Constraint)는 **Unique Scope Code · Immutable Version · Parent Validation · Scope Path Validation · Tenant Isolation · Version Binding**(6종)을, §46(Index)은 **Scope Code · Scope Type · Parent · Version · Assignment · Projection**(6종)을 정의한다. ★현행 유일 실 스키마는 `data_scope(tenant_id,subject_type,subject_id,scope_type,scope_values,updated_at)`(`TeamPermissions.php:160-166`)이며 **`UNIQUE(tenant,subject_type,subject_id)`=subject당 scope_type 1개만**(ADR §1·다차원 동시부여 불가 구조적 제약). Scope Code/Version/Parent/Path 컬럼 자체가 없다. 본 문서는 12개 제약/인덱스 항목을 근접 substrate와 대조한다.

## 2. Canonical 필드

- **항목** — §45/§46 원문 12종 중 1
- **분류** — Constraint(§45)/Index(§46)
- **판정** — PRESENT/PARTIAL/ABSENT
- **현재 substrate** — file:line(없으면 ABSENT)

## 3. 열거형 / 타입

**Constraint(§45) 6종(원문 그대로)**: `UNIQUE_SCOPE_CODE` · `IMMUTABLE_VERSION` · `PARENT_VALIDATION` · `SCOPE_PATH_VALIDATION` · `TENANT_ISOLATION` · `VERSION_BINDING`.

**Index(§46) 6종(원문 그대로)**: `IDX_SCOPE_CODE` · `IDX_SCOPE_TYPE` · `IDX_PARENT` · `IDX_VERSION` · `IDX_ASSIGNMENT` · `IDX_PROJECTION`.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| # | 항목 | 분류 | 판정 | 근거(file:line) |
|---|---|---|---|---|
| 1 | Unique Scope Code | Constraint | **ABSENT** | Scope Code 컬럼 자체 부재 — 현행 UNIQUE(`TeamPermissions.php:160-166`)는 subject 식별자 조합(tenant+subject_type+subject_id) 유니크이지 "Scope Code" 유니크가 아님(오분류 금지) |
| 2 | Immutable Version | Constraint | **ABSENT** | Version 컬럼 부재. `replaceScope`(`:337-346`)는 오히려 정반대(가변·전량교체) |
| 3 | Parent Validation | Constraint | **ABSENT** | data_scope 9차원=FLAT(부모-자식 없음·`company`만 특례, ADR D-3 확정). menu_tree.parent_id(`AdminMenu.php:107-117`)는 UI 위계이지 Scope Hierarchy가 아님(NOT_SCOPE, ADR D-1 표·오흡수 금지) |
| 4 | Scope Path Validation | Constraint | **ABSENT** | Scope Path 컬럼 부재 — Scope Hierarchy≠Organization Hierarchy(ADR D-3)이므로 team 테이블 parent_team_id 부재(`TeamPermissions.php:145-151`)를 대체 근거로 오용 금지 |
| 5 | Tenant Isolation | Constraint | **PRESENT(강)** | data_scope 스키마 tenant_id 컬럼이 UNIQUE 키 구성원(`TeamPermissions.php:160-166`)·index.php 미들웨어 무조건 주입 및 위조 배제(`index.php:609-619`)·`UserAuth.php:399,401-429` authedTenant fail-closed(188차) |
| 6 | Version Binding | Constraint | **ABSENT** | Version 자체 부재 → 바인딩할 대상 없음(#2와 동일 근본 원인) |
| 7 | Scope Code 인덱스 | Index | **ABSENT** | 컬럼 자체 부재(#1과 동일) |
| 8 | Scope Type 인덱스 | Index | **PARTIAL** | `scope_type` 컬럼은 실재(`TeamPermissions.php:160-166`)하나 UNIQUE 키 구성원이 아닌 값 컬럼 — 전용 인덱스 존재 여부는 GROUND_TRUTH 인용 범위 밖(스키마 DDL 상세 미인용, 과신 금지) |
| 9 | Parent 인덱스 | Index | **ABSENT** | Parent 컬럼 부재(#3과 동일) |
| 10 | Version 인덱스 | Index | **ABSENT** | Version 컬럼 부재(#2와 동일) |
| 11 | Assignment 인덱스 | Index | **PARTIAL** | `UNIQUE(tenant,subject_type,subject_id)`(`:160-166`) 자체가 subject-scope 결합의 사실상 유일 인덱스·조회 키 — 단 이는 "1 subject = 1 scope_type" 구조적 제약의 부산물이지 전용 Assignment 인덱스 설계가 아님 |
| 12 | Projection 인덱스 | Index | **ABSENT** | Projection 스키마 자체 부재(EXISTING_IMPLEMENTATION §9) |

## 5. 설계 원칙

1. **UNIQUE(tenant,subject_type,subject_id)를 Unique Scope Code로 오표기 금지** — 서로 다른 유니크 키 대상(subject 식별 vs scope 정의 식별)임을 문서 전체에서 일관되게 구분.
2. **Tenant Isolation(#5)은 유일 강한 실재 축 — 신규 스키마도 이 축을 그대로 계승** — 새 Scope Registry/Definition/Version 테이블 전부 tenant_id를 최우선 파티션 키로 상속(무력화 금지, D-6 규율).
3. **Parent/Path Validation(#3·#4)은 순신규이며 조직 위계와 물리 분리 유지** — menu_tree.parent_id·team 평면구조를 Scope Hierarchy의 대체 근거로 사용하지 않는다(ADR D-3 "Scope Hierarchy ≠ Organization Hierarchy" 원칙 유지).
4. **1 subject = 1 scope_type 구조적 제약은 무후퇴 대상이자 확장 지점** — 현행 UNIQUE 제약을 삭제하지 않고, 다차원 동시부여를 지원하는 신규 스키마는 이 제약 위에 별도 매핑 테이블(`APPROVAL_SCOPE_MAPPING`)로 확장.
5. **Version Binding/Immutable Version(#2·#6)은 Static Lint #4 Missing Version과 동일 근거로 설계** — `replaceScope`의 가변 전량교체 패턴이 정확히 이 제약이 막으려는 사례.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 12종 전부 Canonical Scope Registry/Definition/Version 테이블 실구현 이후에 제약/인덱스 적용 가능.
- **PRESENT(강)**: Tenant Isolation(#5) — 유일하게 강하게 실재하는 제약, 무후퇴 계승 대상.
- **PARTIAL**: Scope Type 인덱스(#8, DDL 상세 미인용 유보)·Assignment 인덱스(#11, 구조적 부산물).
- **ABSENT(순신규)**: Unique Scope Code(#1)·Immutable Version(#2)·Parent Validation(#3)·Scope Path Validation(#4)·Version Binding(#6)·Scope Code/Parent/Version/Projection 인덱스(#7·#9·#10·#12).
- **판정**: NOT_CERTIFIED · 실 제약/인덱스 = Canonical Scope Registry 테이블 신설 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_SCOPE_API_CONTRACT]] · [[DSAR_APPROVAL_SCOPE_TEST_STRATEGY]] · [[DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SCOPED_ROLE_GOVERNANCE]]
