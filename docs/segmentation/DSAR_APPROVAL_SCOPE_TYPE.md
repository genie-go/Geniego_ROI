# DSAR — Approval Scope Type (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Type)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment(Part 3-1/3-2/3-3)·Decision Core 실 구현 부재
- **불변**: Default Intersection · Scope 자동확대 금지 · Scope Hierarchy ≠ Organization Hierarchy · envLabel ≠ Scope · Golden Rule(7곳 산재 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Scope Type은 시스템이 인식하는 **Scope의 분류 축 자체**다(스펙 §3 — TENANT부터 ENVIRONMENT까지 33종). ADR D-1이 정리한 대로 현행 scope 개념은 7곳에 산재하며, 각 축(tenant/data_scope 9차원/api_key/amount/warehouse/menu)이 서로 다른 값체계로 독립 구현되어 있다. Scope Type 엔티티는 이 산재된 축들을 **하나의 정규화된 타입 열거**로 통합하는 계약이며, 어떤 타입이 실제로 SQL 강제되는지·정의만 되어 있는지·전혀 없는지를 정직하게 구분한다(ADR D-5).

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `scope_type_code` | Type 코드(§3 열거값) |
| `enforcement_level` | 강제 수준(§3 분류: SQL_ENFORCED/DEFINED_ONLY/ABSENT) |
| `dimension_group` | 축 그룹(DATA/PARTITION/PROGRAMMATIC/AMOUNT/ENVIRONMENT/RESOURCE/ORGANIZATION 등) |
| `consolidation_source` | 흡수 대상 산재 위치(§4) |
| `hierarchy_capable` | Scope Hierarchy(§13) 참여 가능 여부 |

## 3. 열거형 / 타입

- **`scope_type_code`**(스펙 §3 verbatim, 33종): `TENANT` · `LEGAL_ENTITY` · `ORGANIZATION` · `BUSINESS_UNIT` · `COST_CENTER` · `POSITION` · `PROJECT` · `RESOURCE_TYPE` · `RESOURCE_INSTANCE` · `DATASET` · `DOCUMENT` · `FOLDER` · `FIELD` · `APPLICATION` · `MODULE` · `API` · `SCREEN` · `REGION` · `COUNTRY` · `CITY` · `WAREHOUSE` · `PLANT` · `BRANCH` · `CURRENCY` · `AMOUNT` · `TIME` · `SHIFT` · `DEVICE` · `CLIENT` · `NETWORK` · `SESSION` · `ENVIRONMENT`.
- **`enforcement_level`**(설계 판정 축, ADR D-5 반영): `SQL_ENFORCED`(실제 WHERE 행필터) · `DEFINED_ONLY`(값 저장·조회는 되나 강제 경로 없음) · `PRESENT_SEPARATE_AXIS`(별개 축으로 강함) · `ABSENT`(grep 0).

## 4. 실 substrate 매핑 (PARTIAL/PRESENT/ABSENT·ground-truth만 인용)

| Scope Type(스펙 §3) | 판정 | 실 substrate (file:line) |
|---|---|---|
| `WAREHOUSE`(및 CHANNEL/PRODUCT/BRAND — data_scope 실차원) | **SQL_ENFORCED** | `Catalog.php:1001-1003`·`OrderHub.php:261`·`Wms.php:1291`·`AdPerformance.php:26,134`(EXISTING_IMPLEMENTATION §1) |
| `ORGANIZATION`(company/team/campaign/partner/own 잔여) | **DEFINED_ONLY** | `TeamPermissions.php:41` 정의·시드(`:706-722`)·SQL WHERE 강제 호출 grep 0(EXISTING_IMPLEMENTATION §1) |
| `TENANT` | **PRESENT_SEPARATE_AXIS(강함)** | `index.php:614-619`·`UserAuth.php:399,423-428`(EXISTING_IMPLEMENTATION §2) |
| `CLIENT`(programmatic — api_key scope) | **PRESENT_SEPARATE_AXIS** | `Keys.php:189-210`(EXISTING_IMPLEMENTATION §3) — RBAC 동작권한 축, data_scope와 교집합 로직 grep 0 |
| `AMOUNT`/`CURRENCY` | **PRESENT_SEPARATE_AXIS(단일임계)** | `Catalog.php:1036,1104-1169` — ₩5M 단일 정적 임계치뿐, 역할/팀/테넌트별 차등·다중통화 grep 0(EXISTING_IMPLEMENTATION §4) |
| `ENVIRONMENT` | **PRESENT_SEPARATE_AXIS(2값)** | `Db.php:56-61`(envLabel demo/production)·`UserAuth.php:1173`(guardTeamWrite 데모 우회) — ★NOT_SCOPE(배제) 판정과 병기(ADR D-4) |
| `RESOURCE_TYPE`/`API`/`MODULE`(메뉴 근접) | **DEFINED_ONLY(메뉴만)** | `TeamPermissions.php:39,55-82,152-159` — menu×action, field/row/dataset/document 부재(EXISTING_IMPLEMENTATION §6) |
| `DATASET`/`DOCUMENT`/`FOLDER`/`FIELD` | **ABSENT** | grep 0(EXISTING_IMPLEMENTATION §6·§10) |
| `TIME`/`SHIFT`/`DEVICE`/`NETWORK`/`SESSION`(만료 외) | **ABSENT** | grep 0(EXISTING_IMPLEMENTATION §7·`Attribution.php:444` time_window은 마케팅 어트리뷰션 FP·배제) |
| `POSITION`/`BUSINESS_UNIT` | **ABSENT** | grep 0(EXISTING_IMPLEMENTATION §8) |
| `PROJECT` | **DEFINED_ONLY(별개체계·미연동)** | `PM/Projects.php:30-143`·`PM/Shared.php:59-89`(role rank만, data_scope 미연동·EXISTING_IMPLEMENTATION §8) |
| `LEGAL_ENTITY`/`REGION`/`COUNTRY`/`CITY`/`PLANT`/`BRANCH` | **ABSENT** | grep 0 |

★33종 중 **SQL_ENFORCED=4종**(channel/product/brand/warehouse), **DEFINED_ONLY=6종 내외**(company/team/campaign/partner/own·menu), **PRESENT_SEPARATE_AXIS=4종**(tenant/client/amount/environment), **나머지=ABSENT**. 스펙 33종 열거 자체는 순신규 설계이며 기존 코드에 대응 열거값이 존재하지 않는다(ABSENT 표기는 "부재를 정직 인정"이지 결함 아님).

## 5. 설계 원칙

1. **정직 3분류 유지** — SQL_ENFORCED/DEFINED_ONLY/ABSENT를 혼동하지 않음(실재 과신·부재 과장 양방향 회피, ADR §D-5).
2. **envLabel은 ENVIRONMENT Type 근접이나 NOT_SCOPE 배제 병기** — 배포 라벨을 데이터 접근범위로 오분류 금지(ADR D-1 표 D-4).
3. **PROJECT Type은 PM 모듈과 data_scope 미연동 상태를 명시** — 통합 시 PM/Shared.php 게이트에 data_scope 결합이 필요하나 이번 차수는 설계만.
4. **CLIENT(api_key)와 data_scope는 교집합 로직 순신규** — 별개 축을 하나의 Scope Type 열거 안에 두되 판정 로직은 분리 유지.
5. **Golden Rule** — 새 Scope Type enum은 기존 축을 재구현하지 않고 라벨링·정규화한다.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Scope Type을 Role/Permission Version과 결합하는 지점은 선행 Part 2/3-1/3-2/3-3 실 구현 이후. 본 차수 코드 0.
- **Gap-1(편중)**: 4/9 data_scope 차원만 SQL 강제·33종 스펙 중 대다수 ABSENT(EXISTING_IMPLEMENTATION §10 총평표) — 투기성 스키마 방지 위해 Gap을 정직 등재.
- **Gap-2(교집합 로직 부재)**: TENANT/CLIENT/AMOUNT/ENVIRONMENT 각 축이 독립 강제되며 상호 교집합 계산 로직 grep 0(DUPLICATE_AUDIT §2) — Scope Policy(§9) 신설 시 결합 필요.
- **정직 부재**: LEGAL_ENTITY/REGION/COUNTRY/CITY/PLANT/BRANCH/POSITION/BUSINESS_UNIT/TIME/SHIFT/DEVICE/NETWORK 대응 코드 ABSENT — 결함으로 날조 금지. 289차 P1~P4 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Decision Core 실 구현 + 별도 승인세션(RP-002).
