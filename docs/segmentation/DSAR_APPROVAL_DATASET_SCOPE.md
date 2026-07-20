# DSAR — Dataset Scope (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 3-4)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **스펙 근거**: [`EPIC_06A_PART3_4_SCOPED_ROLE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_4_SCOPED_ROLE_GOVERNANCE_SPEC.md) §17 Dataset Scope(Dataset · Schema · Table · Column · Row)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment(Part 3-1/3-2/3-3)·Decision Core 실구현 후 별도 승인세션.
- **불변**: Default Intersection(§9 Scope Policy 기본) · envLabel≠Scope(배포라벨을 데이터 scope로 오분류 금지) · 반날조(부재 날조·실재 과신 양방향 금지) · 289차 P1~P4 재플래그 금지.

---

## 1. 목적

**데이터 자산의 구조적 최소단위(Dataset/Schema/Table/Column/Row)에 대한 접근범위**를 정형화한다. 현행 data_scope 9차원(company/brand/team/campaign/product/channel/warehouse/partner/own)은 **비즈니스 엔티티 값 단위 필터**(예: 특정 channel 값·특정 warehouse 값)이며, 데이터베이스 구조 단위(어느 스키마/테이블/컬럼/행을 볼 수 있는가)를 표현하지 않는다. 이 갭을 Canonical Dataset Scope로 정형화한다. 순신규 엔티티.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `dataset_scope_code` | Dataset Scope 식별자 |
| `dataset_ref` | 대상 Dataset(논리 자산 단위) 참조 |
| `schema_ref` | 대상 Schema 참조 |
| `table_ref` | 대상 Table 참조 |
| `column_ref` | 대상 Column(Field) 참조 — Field Scope와 접합점 |
| `row_predicate_ref` | Row 단위 필터 조건 참조 — data_scope 9차원과 접합점 |
| `access_level` | READ / WRITE / MASK / DENY |
| `scope_level` | DATASET / SCHEMA / TABLE / COLUMN / ROW(§3) |

## 3. 열거형 / 타입

- **scope_level**: `DATASET` · `SCHEMA` · `TABLE` · `COLUMN` · `ROW`(스펙 §17 열거 그대로).
- **access_level**: `READ` · `WRITE` · `MASK`(컬럼 마스킹) · `DENY`.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Dataset/Schema/Table 단위 scope | — | **ABSENT** | grep 0(EXISTING §10 요약표 "field/row/dataset/document"=ABSENT) |
| Column(Field) scope | — | **ABSENT** | EXISTING §6 "field/row/column scope 부재(field_scope\|row_level\|column_mask grep 0)" |
| Row 단위 scope(근접만) | data_scope 9차원 SQL 행필터 — 단 비즈니스 값 필터이지 임의 Row-level 정책 아님 | **PARTIAL(근접·비동형)** | `TeamPermissions.php:41`(9차원 정의)·실 SQL 강제 4차원뿐 `Catalog.php:1001-1003`·`OrderHub.php:261`·`Wms.php:1291`·`AdPerformance.php:26,134` |
| Resource scope(근접이나 리소스=메뉴 단위) | acl_permission menu×action | **PARTIAL(비동형)** | `TeamPermissions.php:39,55-82,152-159` |

★data_scope의 "row" 강제(4/9차원)는 Dataset Scope §17의 Row와 **개념이 다르다**: data_scope는 특정 비즈니스 컬럼 값(channel/product/brand/warehouse)에 대한 WHERE 필터이며, 임의 Row 조건식·Table/Schema/Dataset 단위 게이팅이 아니다. 동일시하면 오분류(D-1 Golden Rule "발명 아니라 조립+통합" 위반 방지를 위해 근접(PARTIAL)으로만 표기하고, canonical Dataset/Schema/Table/Column 단위는 ABSENT로 유지).

## 5. 설계 원칙

- Dataset Scope는 data_scope의 Row 필터를 **재사용**(중복 필터 엔진 신설 금지) — Row 단위는 data_scope scopeSql 계열을 Canonical Row 조건으로 승격.
- Dataset/Schema/Table/Column 단위는 **순신규 계층**으로, 기존 acl_permission(menu 단위)·data_scope(값 단위) 위에 얹는 상위 구조로 설계 — 메뉴/값 필터를 대체하지 않고 확장.
- Column(Field) 단위는 후속 Permission Engine Field Scope(`DSAR_APPROVAL_PERMISSION_FIELD_SCOPE`)와 접합 — 중복 Field Scope Registry 신설 금지, 단일 정의를 Dataset Scope Column 참조로 공유.
- Default Intersection: Dataset Scope와 data_scope Row 필터가 동시 적용될 경우 합집합이 아닌 교집합.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: Dataset/Schema/Table/Column 단위 전부 순신규(ABSENT). Row는 data_scope 4/9차원에 근접하나 비동형.
- **BLOCKED_PREREQUISITE**: Canonical Scope Registry(§4 스펙) 및 선행 Permission/Role 계열 실구현 후 — **RP-002**.
- 289차 P1~P4(writeGuard·featurePlan·admin·토큰해시) 재플래그 금지.
