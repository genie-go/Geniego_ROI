# DSAR — Scope Function Regression Gate (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Function Regression Gate)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Decision Core 실 구현 부재
- **불변**: 무후퇴 · Tenant Isolation 무력화 금지 · Default Intersection · Scope 자동확대 금지 · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차 재플래그 금지

---

## 1. 목적

§47(Regression: 기존 Approval·기존 Assignment·기존 RBAC·기존 Workflow)의 **기존 기능 회귀 게이트**를 정의한다. Canonical Scope Registry는 7곳 산재 scope substrate(data_scope·tenant_id·api_key.scopes_json·high_value·wms_permissions.warehouses·menu_key·menu_tree.parent_id, DUPLICATE_AUDIT D-1)를 **대체·재구현이 아니라 단일 Registry로 중개**하므로(ADR D-1·D-6), **실 구현 시 이들 위에 서 있는 실존 기능이 동일하게 동작**해야 한다(무후퇴·회귀 0). 본 게이트는 어떤 기능 표면을 어떤 기준으로 재검증할지 명세한다.

★**본 차수는 코드 변경 0(설계 명세만)이므로 회귀 표면이 발생하지 않는다** — 실제 게이트 실행은 Canonical Scope Registry 실구현 세션(RP-002)에서 발동한다. 본 문서는 그 세션의 통과 기준을 사전 봉인한다.

## 2. Canonical 필드

- **기능 표면 ID** — 아래 §3 표 번호
- **검증 기준(회귀 0)** — 도입 전/후 판정 동일성 조건
- **현행 substrate** — 근접 인용(file:line)
- **회귀 위험도** — `HIGH`(4/9차원 직접 접촉) / `MEDIUM`(간접 참조) / `LOW`(별개 도메인·참조만)

## 3. 열거형 / 타입 (회귀 검증 표면 + 통과 기준)

| # | 기능 표면 | 검증 기준(회귀 0) | 현행 substrate (file:line) | 위험도 |
|---|---|---|---|---|
| 1 | **Catalog 상품 scope 필터(channel/product/brand)** | SQL WHERE 강제 결과 동일 | `Catalog.php:1001-1003` | **HIGH**(4/9차원 실소비 직접 접촉) |
| 2 | **OrderHub 주문 scope 필터(channel/sku)** | `scopeChannelProduct` 결과 동일 | `OrderHub.php:261` | **HIGH**(4/9차원 실소비 직접 접촉) |
| 3 | **Wms 창고 scope 필터(warehouse/wh_id)** | `scopeSql` 결과 동일(warehouse 이중구현 단일화 후에도) | `Wms.php:1291` | **HIGH**(4/9차원 실소비 직접 접촉·warehouse 이중구현 통합 대상) |
| 4 | **AdPerformance ABAC scope** | `applyAbacScope` 판정 동일 | `AdPerformance.php:26,62,64,90,92,115,117,134` | **HIGH**(4/9차원 실소비 직접 접촉) |
| 5 | **effectiveScope 산출** | owner/admin null·비owner+무tenant DENY_SCOPE·예외 DENY_SCOPE·company null·미설정 fail-open 분기 전부 동일 | `TeamPermissions.php:236-265` | **HIGH**(Effective Scope Engine 확장 대상) |
| 6 | **replaceScope 전량교체** | DELETE→INSERT 동작 자체는 무후퇴(Version 신설이 별도 레이어로 추가되되 기존 동작 대체 아님) | `TeamPermissions.php:337-346` | **HIGH**(Missing Version lint 대상이자 회귀 감시 지점) |
| 7 | **wms_permissions 창고 화이트리스트(guardWarehouse)** | 판정 동일(warehouse 이중구현 단일화 시에도 caller 응답 불변) | `Wms.php:557-590,575-584` | **HIGH**(warehouse 이중구현 통합 최고위험 지점) |
| 8 | **tenant 격리 미들웨어** | X-Tenant-Id 위조 배제·authedTenant fail-closed 판정 동일 | `index.php:609-619`·`UserAuth.php:399,401-429` | **HIGH**(TENANT_SCOPE_TYPE 흡수 대상) |
| 9 | **api_key scope 게이트웨이** | `defaultScopes`/`allowedScopesForRole` 상한 판정 동일 | `Keys.php:189-210`·`index.php:573-598,583-586,587-597` | **HIGH**(PROGRAMMATIC_SCOPE 통합 대상) |
| 10 | **api_key defaultScopes 2곳 중복** | 통합 후에도 양쪽 caller 응답 동일(drift 없음 유지) | `UserAuth.php:4305-4311`·`Keys.php:191,204` | MEDIUM(D-3 통합 대상) |
| 11 | **high_value ₩5M 서버측 강제** | `evaluatePolicy`/`requiresHighValueApproval` 판정 동일(289차 클라 우회 봉인 무후퇴) | `Catalog.php:1036,1104-1148,1159-1169` | **HIGH**(AMOUNT_SCOPE 확장 대상) |
| 12 | **environment(demo/production) 라벨** | `envLabel` 판정 동일·데이터 scope로 재분류되지 않음(NOT_SCOPE 유지) | `Db.php:56-61`·`UserAuth.php:1173` | LOW(오분류 감시 지점) |
| 13 | **acl_permission menu×action** | ACTIONS/MENU_CATALOG 판정 동일 | `TeamPermissions.php:39,55-82,152-159` | MEDIUM(RESOURCE_SCOPE 확장 대상) |
| 14 | **menu_tree.parent_id UI 위계** | 판정 동일·Scope Hierarchy로 오흡수되지 않음(NOT_SCOPE 유지) | `AdminMenu.php:107-117` | LOW(오분류 감시 지점) |
| 15 | **PM 프로젝트(scope 미연동)** | role rank 기반 gate 동일·data_scope 강제 신규 부여되지 않음(경계 보존) | `PM/Shared.php:59-89` | LOW(경계 검증·Scope Registry 밖 유지 대상) |
| 16 | **ORG_PRESET 시드** | idempotent 재실행 판정 동일(승인 Hook은 신규 추가이지 기존 동작 대체 아님) | `TeamPermissions.php:706-722` | MEDIUM(D-5 부수 결함 감시 지점) |

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| 회귀 표면 | 판정 | 실 substrate (file:line) |
|---|---|---|
| data_scope 4/9차원 SQL 강제 | **CANONICAL_SCOPE_SSOT(확장·무후퇴)** | `Catalog.php:1001-1003`·`OrderHub.php:261`·`Wms.php:1291`·`AdPerformance.php:26,62,64,90,92,115,117,134` |
| effectiveScope/replaceScope | **EFFECTIVE_RESOLUTION_SUBSTRATE(확장·무후퇴)** | `TeamPermissions.php:236-265,337-346` |
| warehouse 이중구현(data_scope↔wms_permissions) | **CONSOLIDATION_REQUIRED(무후퇴)** | `Wms.php:1291`·`Wms.php:557-590,575-584` |
| tenant 격리 | **TENANT_SCOPE_TYPE(흡수·무후퇴)** | `index.php:609-619`·`UserAuth.php:399,401-429` |
| api_key scope(2곳 중복) | **PROGRAMMATIC_SCOPE(통합·무후퇴)** | `Keys.php:189-210`·`UserAuth.php:4305-4311` |
| high_value ₩5M | **AMOUNT_SCOPE(확장·무후퇴)** | `Catalog.php:1036,1104-1169` |
| environment(demo/prod) | **NOT_SCOPE(배제·무후퇴)** | `Db.php:56-61` |
| menu_key(acl_permission) | **RESOURCE_SCOPE(확장·무후퇴)** | `TeamPermissions.php:39,55-82,152-159` |
| menu_tree.parent_id | **NOT_SCOPE(배제·무후퇴)** | `AdminMenu.php:107-117` |
| PM 프로젝트(미연동) | **경계 보존(Scope Registry 밖 유지)** | `PM/Shared.php:59-89` |

## 5. 설계 원칙

1. **Extend not Replace = 회귀 0의 근거** — Canonical Scope Registry는 7곳 산재(#1~#9)를 삭제하지 않고 **Scope Type 축으로 통합**하므로(ADR D-1), 정형화 후에도 위 16개 표면은 **동일 판정**이어야 한다.
2. **warehouse 이중구현 통합(#3·#7)이 최고위험 회귀 지점** — 동일 "창고 접근 판정"을 2개 코드경로(`scopeSql` vs `guardWarehouse`)로 수행 중이므로(DUPLICATE_AUDIT D-2), 통합 시 어느 한쪽 caller가 판정 차이로 회귀를 겪지 않아야 한다.
3. **envLabel/menu_tree.parent_id(#12·#14)는 Scope Registry로 오흡수 금지** — 각기 배포환경 라벨·UI 위계라는 별개 개념(ADR D-1 표 NOT_SCOPE)이며 오분류가 곧 회귀(D-4).
4. **PM 프로젝트(#15)는 Scope Registry 밖 유지가 회귀 기준** — data_scope 미연동 현행(role rank만)을 Scope Registry 도입이 강제 연동으로 바꾸면 PM Workflow 회귀 위험(§47 Regression > Workflow와 동일 경계).
5. **ORG_PRESET 시드(#16)는 D-5 부수 결함 감시 지점이나 이번 차수 수정 대상 아님** — 승인 Hook은 신규 추가 레이어이며 idempotent 시드 동작 자체는 무후퇴 유지, 재무팀 프리셋 `scope='company'` 값 자체를 임의 변경하지 않는다(별도 fix 세션).
6. **정직 부재는 게이트 대상 아님** — Simulation·Scope Drift·Projection·Version 관련 기능이 현재 존재하지 않으므로 "회귀"가 아니라 "신규 기능 검증"으로 분류(날조 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 실 게이트 실행은 Canonical Scope Registry + Part 2/3-1/3-2/3-3 실 구현 세션에서 발동.
- **본 차수 회귀 표면 없음**: 코드 변경 0(설계 명세)이므로 이번 세션에서 회귀할 기능이 없다(정직).
- **최고위험 감시 지점(부수 발견 아님·설계 우선순위)**: warehouse 이중구현 통합(#3·#7)·api_key defaultScopes 2곳 통합(#9·#10)·effectiveScope/replaceScope 확장(#5·#6) — 전부 ADR D-1·GROUND_TRUTH 인용, 본 차수 수정 아님.
- **무후퇴 원칙**: 위 16개 표면은 실존 기능(또는 명시적 유지 대상) → Scope Registry 도입 과정에서 삭제·재구현 금지.
- **판정**: NOT_CERTIFIED · 실 게이트 = Canonical Scope Registry 신설 세션(RP-002)에서 실행.

관련: [[DSAR_APPROVAL_SCOPE_TEST_STRATEGY]] · [[DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT]] · [[DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SCOPED_ROLE_GOVERNANCE]]
