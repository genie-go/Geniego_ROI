# DSAR — Permission Scope (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Permission이 **어디까지·무엇에·어떤 조건에서** 적용되는지 경계를 선언하는 최상위 Scope 엔티티. 개별 Scope 축(Tenant/LegalEntity/Org/Resource/Field/Row/Data/API/UI/Channel/Client/Amount/Currency/Time)을 하나의 **Composite Scope**로 결합하며, 결합 규칙은 **Intersection(교집합)** — 어떤 축도 권한을 넓히지 못하고 좁히기만 한다(Expansion Guard). Scope는 문자열 태그가 아니라 **정형·검증·불변 digest**된 구조체다. 중복 Scope 모델 신설 금지 — 실존 `TeamPermissions` `data_scope`(행필터)를 Row/Data Scope substrate로 흡수·정규화하고 나머지 축을 상위 신설한다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `scope_type` | Scope 축 분류(§3 열거·COMPOSITE는 하위 결합) |
| `tenant` | 귀속 테넌트(모든 Scope 필수·Cross-tenant 금지 — [`DSAR_APPROVAL_PERMISSION_TENANT_SCOPE`](DSAR_APPROVAL_PERMISSION_TENANT_SCOPE.md)) |
| `legal_entity` | 법인 경계(없으면 ABSENT — [`DSAR_APPROVAL_PERMISSION_LEGAL_ENTITY_SCOPE`](DSAR_APPROVAL_PERMISSION_LEGAL_ENTITY_SCOPE.md)) |
| `organization` | 조직 경계(+ `include_descendants` Boolean) |
| `resource` | 대상 Resource Type/Instance/Version 참조 |
| `action` | 허용 동작 집합(view/create/update/delete/approve/export/execute/manage) |
| `field_filter` | 필드 경계(허용/거부 Canonical Field Path 집합) |
| `row_filter` | 행 경계(Canonical Filter AST 참조 — [`DSAR_APPROVAL_PERMISSION_ROW_SCOPE`](DSAR_APPROVAL_PERMISSION_ROW_SCOPE.md)) |
| `data_categories` | 데이터 분류 경계(PUBLIC…REGULATED_DATA) |
| `api` | 허용 API Operation ID 집합 |
| `ui` | 허용 UI surface 집합(UI_HINT_ONLY·서버 재검증 필수) |
| `channel` | 허용 채널 경계 |
| `client` | 대행사 멀티클라이언트 경계 |
| `amount_min` / `amount_max` | 금액 하한·상한 |
| `currencies` | 허용 통화 집합 |
| `time_window` | 유효 시간창(start/end·recurring) |
| `include_descendants` | 계층 하위 포함 여부 |
| `exclusions` | 명시 제외 집합(Exclusion overrides inclusion) |
| `specificity_score` | 구체성 점수(Most-Specific 우선순위 산정용) |
| `digest` | Scope 정규화 스냅샷 불변 해시 |

## 3. 열거형 / 타입

**scope_type**: `PLATFORM` · `TENANT` · `LEGAL_ENTITY` · `ORGANIZATION` · `ORGANIZATION_SUBTREE` · `RESOURCE_TYPE` · `RESOURCE_INSTANCE` · `RESOURCE_VERSION` · `ACTION` · `FIELD` · `ROW` · `DATA_CATEGORY` · `API` · `UI` · `CHANNEL` · `CLIENT` · `AMOUNT` · `CURRENCY` · `TIME` · `ENVIRONMENT` · `COMPOSITE` · `CUSTOM`.

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Row/Data Scope 축 | `TeamPermissions` `data_scope`(scope_type × scope_values JSON 행필터) | ROW/DATA_SCOPE_CANDIDATE(확장) | `TeamPermissions.php:160-166`·`:171-172` |
| Scope 축 어휘 | `DATA_SCOPES` 9 dims | 정형화 | `TeamPermissions.php:41` |
| Scope 실 enforce | `effectiveScope`·`scopeSql`·`scopeSqlNamed`·`scopeChannelProduct` | 부분 substrate(4/57핸들러 소비) | `TeamPermissions.php:236-265`·`:286-293`·`:299-307`·`:315-322` |
| Intersection/fail-closed 성향 | `DENY_SCOPE`·`1=0` 센티넬 | 부분 substrate | `TeamPermissions.php:234`·`:290,303` |
| Tenant 축(모든 grant 귀속) | index.php tenant 강제주입 | CANONICAL(PEP) | `index.php:619` |
| Action 축 | `ACTIONS` 8동작 | 정형화 | `TeamPermissions.php:39` |
| Field/API/UI/Channel/Client/Amount/Currency/Time/LegalEntity/Org/COMPOSITE/specificity/exclusions/digest 축 | — | **ABSENT(순신규)** | 정형 Scope 구조체 부재 |

★현행 substrate는 **Row/Data 두 축만** 실 enforce(그것도 4핸들러 한정)이며, 22 scope_type을 하나의 검증된 Composite로 결합·`specificity_score`·`digest`·`exclusions`·Expansion Guard는 **순신규 ABSENT**.

## 5. 설계 원칙 / 결정

- **Scope 결합 = Intersection**: 어떤 축도 다른 축을 넓힐 수 없다(권한 확장 금지). `exclusions`는 항상 inclusion을 이긴다.
- **Scope ≠ Role ≠ Authority**: Scope는 경계일 뿐이며 금액 승인권(Authority)이나 역할(Role) 판정을 담지 않는다(ADR §6.2·D-5).
- **UI·API 축은 UI_HINT_ONLY 아님 주의**: UI surface 노출 여부는 힌트이나 API operation 경계는 서버 PEP에서 강제된다(§6.9).
- **Scope는 불변 정규화**: 저장 시 검증된 구조체로 정형화하고 `digest`로 고정(원시 문자열/JSON 그대로 판정 금지).
- Golden Rule: 중복 Scope 엔진 신설 금지 — `data_scope` 확장·정규화, 나머지 축 상위 신설.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: 22 scope_type 정형 구조체·`specificity_score`·`digest`·`exclusions`·Field/API/UI/Channel/Client/Amount/Currency/Time/LegalEntity/Org 축·COMPOSITE Intersection = 순신규 ABSENT.
- **Enforcement gap**: 실 enforce되는 Row/Data 축도 ~57핸들러 중 4곳(Catalog/OrderHub/Wms/AdPerformance)만 소비 — 나머지 mutating 표면은 미필터.
- **BLOCKED_PREREQUISITE**: Scope Intersection/Expansion Guard 실 엔진은 선행 Decision Core + Canonical Resource/Action Registry 신설 후 별도 승인세션 **RP-002**.
- Part 1 D-2 위험 4건은 289차 P1~P4로 해소됨 — 재플래그 금지.
