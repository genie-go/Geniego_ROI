# DSAR — Permission Row Scope (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Permission을 **행(레코드) 수준**으로 한정하는 축. "이 사용자는 자기가 생성/담당/승인한 case만 본다" 같은 조건을 통제한다. 핵심 불변식은 **Raw SQL을 저장하지 않고 Validated Canonical Filter AST로만 표현** — 조건을 검증 가능·재사용 가능·주입 불가능한 구조체(참조 컬럼·연산자·값)로 정형화한다. 신설이 아니라 실존 `TeamPermissions` `data_scope`(scope_type × scope_values 행필터·실 enforce)를 Row Scope의 최근접 substrate로 흡수하되, 원시 scope_values(JSON)를 Canonical Filter AST로 정형화한다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `filter_ast` | Validated Canonical Filter AST(참조 컬럼·연산자·값·AND/OR 조합) |
| `reference_columns` | 허용 참조 컬럼 집합(§3·화이트리스트) |
| `operators` | 허용 연산자 집합(eq/in/range/…) |
| `combine` | AST 결합 전략(AND 기본·Intersection) |
| `fail_closed` | Boolean(해석 실패 시 전부 거부·항상 true·Mandatory Control) |
| `applies_to_read` / `applies_to_mutation` | 조회·변경 양쪽 적용 여부 |
| `schema_version` | 참조 컬럼이 유효한 스키마 버전 |
| `digest` | Row Scope 정규화 스냅샷 해시 |

## 3. 열거형 / 타입

**reference kind(Query Filter Reference)**: `TENANT` · `LEGAL_ENTITY` · `ORGANIZATION` · `OWNER` · `CREATOR` · `ASSIGNEE` · `APPROVER` · `REVIEWER` · `STATUS` · `CLASSIFICATION` · `DATE_RANGE` · `CUSTOM`.
**operator**: `EQ` · `IN` · `RANGE` · `NOT_IN` · `EXISTS`.

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Row Scope 축(최근접) | `TeamPermissions` `data_scope`(scope_type × scope_values JSON) | ROW/DATA_SCOPE_CANDIDATE(확장) | `TeamPermissions.php:160-166`·`:171-172` |
| 실 행필터 enforce | `effectiveScope`·`scopeValuesFor`·`scopeSql`·`scopeSqlNamed` | 부분 substrate(4/57핸들러) | `TeamPermissions.php:236-265`·`:272-280`·`:286-293`·`:299-307` |
| fail-closed 성향 | `DENY_SCOPE`·`1=0` 센티넬 | 부분 substrate | `TeamPermissions.php:234`·`:290,303` |
| 채널×상품 복합필터 | `scopeChannelProduct` | 부분 substrate | `TeamPermissions.php:315-322` |
| `filter_ast`(검증 AST)·`reference_columns` 화이트리스트·`operators` 정형·`schema_version`·`digest` | — | **ABSENT(순신규)** | scope_values는 ad-hoc JSON·정형 AST 아님 |

★핵심: **행필터는 이미 실 enforce**된다(`scopeSql :286-322`). 부재는 (a) 원시 `scope_values` JSON을 검증된 Filter AST로 정형화, (b) 참조 컬럼/연산자 화이트리스트, (c) ~57핸들러 중 4곳만 소비하는 **enforcement gap** 확장이다.

## 5. 설계 원칙 / 결정

- **Raw SQL 저장 금지**: 조건은 Canonical Filter AST로만 — 주입 불가·검증 가능·재사용 가능. 실행 시 파라미터 바인딩(현행 `scopeSqlNamed :299-307`이 named param 지향인 점을 계승·강화).
- **fail-closed**: AST 해석 실패/부재 시 `1=0`(전부 거부)이 정본 — 현행 센티넬(`:290,303`) 계승.
- **결합은 Intersection**: 다중 Row Scope는 AND 결합(권한 확장 금지).
- **소비 확장 필수**: 4핸들러(Catalog/OrderHub/Wms/AdPerformance) → 전 mutating 표면으로 소비 확대(미필터 표면 = enforcement gap).
- Golden Rule: 중복 행필터 엔진 신설 금지 — `data_scope`/`scopeSql` 확장·정형화.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: `filter_ast`(검증 AST)·`reference_columns` 화이트리스트·`operators` 정형·`schema_version`·`digest` = 순신규 ABSENT.
- **Enforcement gap**: 실 enforce는 ~57핸들러 중 4곳만 → 전면 소비 확대 필요.
- **BLOCKED_PREREQUISITE**: AST 정형화·전면 소비는 Resolution 파이프라인·Canonical 컬럼 사전 신설 후 별도 승인세션 **RP-002**.
- Part 1 D-2 위험 4건은 289차 P1~P4로 해소됨 — 재플래그 금지.
