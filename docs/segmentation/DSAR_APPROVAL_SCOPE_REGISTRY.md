# DSAR — Approval Scope Registry (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Registry)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment(Part 3-1/3-2/3-3)·Decision Core 실 구현 부재
- **불변**: Default Intersection · Scope 자동확대 금지 · Scope Hierarchy ≠ Organization Hierarchy · envLabel ≠ Scope · Golden Rule(7곳 산재 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Scope Registry는 플랫폼·테넌트 전체의 **모든 Scope 정의를 단일 정본으로 등록·소유·버전화·인증하는 최상위 컨테이너 엔티티**다(스펙 §4). 현재 scope 개념은 **통합 Registry 없이 최소 7곳에 독립 정의·저장·강제**된다 — data_scope 9차원·tenant_id 격리·api_key.scopes_json·high_value ₩5M·wms_permissions.warehouses·menu_key(acl_permission)·menu_tree.parent_id(DUPLICATE_AUDIT D-1). 본 엔티티는 이 7곳을 대체·재구현하지 않고 **Canonical Scope Registry 밑에 Scope Type 축으로 통합·중개**하는 계약을 정의한다(ADR D-1). 실 판정 코드는 그대로 두고(회귀 0), Registry는 "이 테넌트에서 어떤 Scope Type/축이 유효한가"를 선언·인증·버전화하는 상위 데이터층이다. **중복 Scope Registry/Resolver 신설 금지**.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `scope_registry_id` | Registry 식별자(PK) |
| `registry_type` | Registry 분류(§3) |
| `tenant_id` | 테넌트 격리 키(플랫폼 Registry는 `__platform__`) |
| `version` | 현재 유효 Registry Version 참조(§ Scope Version 문서) |
| `policy` | 기본 Scope Policy(§9 Intersection/Union/Most Restrictive/Explicit Mapping/Dynamic Rule — 기본 Intersection) |
| `owner` | Registry 소유자 |
| `evidence` | 변경 Evidence 참조(§36) |
| `digest` | Registry 정의 불변 digest(무결성) |
| `consolidated_sources` | 이 Registry가 흡수하는 산재 축 목록(§4 매핑 참조) |

## 3. 열거형 / 타입

- **`registry_type`**: `PLATFORM` · `TENANT` · `RESOURCE` · `ORGANIZATION` · `DATA` · `PROGRAMMATIC`(api_key 축) · `FINANCIAL`(amount 축) · `ENVIRONMENT` · `CUSTOM`.
- **`consolidated_sources`**(요소, DUPLICATE_AUDIT D-1 7곳 대응): `DATA_SCOPE_9DIM` · `TENANT_PARTITION` · `API_KEY_SCOPE` · `AMOUNT_HIGH_VALUE` · `WMS_WAREHOUSE_WHITELIST` · `MENU_ACL` · `MENU_TREE_HIERARCHY(배제 대상 — NOT_SCOPE)`.
- Registry 자체의 lifecycle(`status`)은 §Scope Version 문서에서 정의(DRAFT/ACTIVE/LOCKED/DEPRECATED/ARCHIVED — Role Registry 선례 준용).

## 4. 실 substrate 매핑 (PARTIAL/PRESENT/ABSENT·ground-truth만 인용)

| Canonical | 판정 | 실 substrate (file:line) |
|---|---|---|
| 통합 Scope Registry(단일 정본) | **ABSENT → 신설** | 통합 ScopeRegistry grep 0(DUPLICATE_AUDIT §1 D-1 총평) — 7곳 독립 구현 |
| data_scope 9차원(정본 SSOT 후보) | **PARTIAL/PRESENT(확장대상)** | `TeamPermissions.php:41,160-166` — DATA_SCOPES enum·스키마(EXISTING_IMPLEMENTATION §1) |
| tenant_id 전역격리(최광의 축) | **PRESENT(강)** | `index.php:614-619`·`UserAuth.php:399,423-428`(EXISTING_IMPLEMENTATION §2) |
| api_key.scopes_json(별개 축) | **PRESENT** | `Keys.php:189-210`(EXISTING_IMPLEMENTATION §3·DUPLICATE_AUDIT D-1 #3) |
| high_value ₩5M(금액 축) | **PRESENT(단일임계)** | `Catalog.php:1036,1104-1169`(EXISTING_IMPLEMENTATION §4) |
| wms_permissions.warehouses(창고 축·이중구현) | **PRESENT(이중구현·통합대상)** | `Wms.php:1291`(scopeSql) — DUPLICATE_AUDIT D-2 |
| menu_key(acl_permission·리소스 축) | **PARTIAL(메뉴만)** | `TeamPermissions.php:52-82,152-159`(DUPLICATE_AUDIT D-1 #6) |
| menu_tree.parent_id | **NOT_SCOPE(배제)** | UI 위계·scope 오흡수 금지(ADR D-1 표) |
| envLabel | **NOT_SCOPE(배제)** | 배포환경 라벨·scope 아님(`Db.php:56-61`·ADR D-1 표) |
| `registry_type`/`version`/`policy`/`owner`/`evidence`/`digest` | **ABSENT** | Registry 컨테이너 개념 전무 — grep 0(EXISTING_IMPLEMENTATION §9) |

★현행에는 **Registry라는 상위 컨테이너 자체가 부재**하다. data_scope 9차원이 정본 SSOT 후보로 가장 근접하나(ADR D-1 표) version/policy/owner/evidence/digest가 없어 정식 Registry가 아니다.

## 5. 설계 원칙

1. **Extend not Replace** — data_scope·tenant_id·api_key scope·high_value·wms_permissions·menu_key를 Registry 밑 substrate로 흡수. 판정 코드 의미 변경 금지(회귀 0).
2. **7곳 산재 통합(Golden Rule)** — 중복 Scope Registry/Resolver 신설 금지·기존 축을 Scope Type으로 정규화(ADR D-1).
3. **warehouse 이중구현 단일화** — `scopeSql`↔`guardWarehouse` 두 경로를 Registry 하위 단일 강제경로로 정합(DUPLICATE_AUDIT D-2).
4. **Tenant Isolation 절대** — Registry는 tenant_id로 격리(플랫폼 Registry는 명시 스코프).
5. **envLabel·menu_tree 오분류 금지** — Environment/UI 위계는 Scope Type으로 흡수하되 데이터 scope로 오흡수 금지(D-4·D-3).
6. **Default Intersection** — Registry 기본 Policy=Intersection(§9)·자동확대 금지(ADR D-2).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Registry가 참조할 Role/Assignment/Permission Version 결합은 선행 Part 2/3-1/3-2/3-3 실 구현(코드 0) 이후 가능. 본 차수 코드 0.
- **Gap-1(ABSENT)**: Registry 컨테이너·registry_type·version·policy·owner·evidence·digest 계약 전무 — 순신설.
- **Gap-2(산재 통합)**: 7곳이 서로 다른 테이블·값체계(9종 enum vs read:*/write:* 문자열 vs 창고ID JSON vs menu_key)·강제경로로 완전 독립 구현(DUPLICATE_AUDIT §1) — 통합 Registry가 흡수해야 할 정합 범위가 큼.
- **Gap-3(이중구현)**: warehouse가 data_scope 차원과 wms_permissions.warehouses 두 경로로 중복(DUPLICATE_AUDIT D-2) — Registry 통합 전 단일화 필요.
- **정직 부재**: field/row/dataset/document/time/device/network/client scope Registry 대상 substrate ABSENT(EXISTING_IMPLEMENTATION §7·§10) — 결함으로 날조 금지. 289차 P1~P4 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Decision Core 실 구현 + 별도 승인세션(RP-002).
