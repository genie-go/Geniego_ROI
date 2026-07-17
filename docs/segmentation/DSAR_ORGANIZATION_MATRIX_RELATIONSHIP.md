# DSAR — Organization Matrix Relationship Foundation (§40)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §40 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| ★`matrix_` | ★**PM 직접 재확인 — `backend/src` 전역 grep = 0건** | `ABSENT`(이름·능력 양쪽) |
| Matrix Type 10종 | `FUNCTIONAL`/`REGIONAL`/`PRODUCT`/`PROJECT`/`PROGRAM`/`BRAND`/`CUSTOMER`/`LEGAL_ENTITY`/`SHARED_SERVICE`/`CUSTOM` — **전부 grep 0** | `ABSENT` |
| ★`DELEGATION_EXCEEDED` | `TeamPermissions.php:645` — ★**권한 부여 상한 초과 오류**(자기가 가진 것보다 큰 권한을 남에게 못 준다)이지 **매트릭스 보고선 아님**. 🔴 **이름 함정** | `KEEP_SEPARATE_WITH_REASON` |
| 권한 "상속"의 실체 | ★**하향 클램프** — `clampActions`(`TeamPermissions.php:382-389`,`:396-402`): 팀 권한을 **상한**으로 멤버 권한 **교집합 축소**. **조직 계층 전파 아님** | `KEEP_SEPARATE_WITH_REASON` |
| `data_scope` | `TeamPermissions.php:160-166` — `tenant_id·subject_type·subject_id·scope_type·scope_values(TEXT)·updated_at`. ★**`parent_*`·`path`·`depth`·`lft/rgt`·`ancestor` 전무** · **단일 차원**(`:277`·`:311` 주석 자인) · SQL = **IN 절 1개**(`:286-293`) · effect **INCLUDE 고정** | `KEEP_SEPARATE_WITH_REASON` |
| ★"팀 스코프 상속"(`:230` 주석) | ★**상속이 아니라 폴백**(`:253-254` — user 에 없으면 team **1회** 조회 · 단일 홉·비재귀·중첩 불가 · **부모 팀 컬럼 자체가 없으므로 구조적 불가**). 🔴 **규율 10 적중 — 주석을 근거 삼지 마라** | `KEEP_SEPARATE_WITH_REASON` |
| `team` DDL | `TeamPermissions.php:145-151`(MySQL)/`:168`(SQLite) — `id·tenant_id·name·description·team_type·manager_user_id·status·created_by·created_at·updated_at`. ★**`parent_team_id` 없음** → **1차 계층조차 없다** | `ABSENT`(계층축) |
| `graph_node`/`graph_edge` | `Db.php:816-839` — `tenant_id`·`node_type`+`node_id`·`src_type`/`src_id`→`dst_type`/`dst_id`·`edge_weight`·`edge_label`·`meta_json`·**src/dst 양방향 인덱스**(`:838-839`) · `/v419/graph/*` **9라우트 실배선**(`routes.php:721-729`) | ★**구조적 쌍둥이**(§15/§16) · `KEEP_SEPARATE_WITH_REASON` |
| `agency_client_link` | `AgencyPortal.php:64-72` — 크로스테넌트 **위임 엣지**(N:M·1홉·동의 기반) | **§43 소관** |
| `crm_customers.identity_id` | `CRM.php:109` — ★**union-find 등가류**(`resolveIdentitiesForTenant:597-643`) · `crm_identity_merge_link(a_id,b_id)`(`:708-712`) **무방향 엣지** | 🔴 **계층 아님**(§19 함정) |

**★축 주의 1 — `DELEGATION_EXCEEDED` 는 매트릭스가 아니다.**
`TeamPermissions.php:645` 의 이 상수는 **"자신이 보유한 권한을 초과해 위임할 수 없다"** 는 **권한 부여 상한 검사**다. §40 의 `relationship priority`·`approval routing eligible`·`manager resolution eligible`(복수 보고선 간 우선순위 해석)과는 **아무 관계가 없다**. 🔴 **`delegation` 이라는 이름만 보고 매트릭스 보고선으로 계산하면 규율 8 위반.** 같은 함정이 `clampActions`(`:382-389`)의 "상속"에도 있다 — **하향 클램프(교집합 축소)이지 계층 전파가 아니다.**

**★축 주의 2 — `graph_node`/`graph_edge` 는 §40 의 구조적 쌍둥이이나 커버가 아니다.**
`Db.php:816-839` 는 **Node/Edge 분리 + 타입드 관계 + 가중치(`edge_weight`) + 양방향 인덱스**를 이미 갖췄다 — §40 의 `matrix type`·`relationship priority` 를 담을 **형태**가 실재한다. 그러나 ⓐ 도메인이 **마케팅 귀속**(influencer→creative→sku→order) ⓑ ★**내부 생산자 0**(`upsertNode`/`upsertEdge` 호출처 = 핸들러·라우트뿐 · frontend 0 → **외부 POST 전용 유입** · **VACUOUS 가능성 미배제**) ⓒ **순환 방어 없음** → `KEEP_SEPARATE_WITH_REASON`. **형태 유사를 커버로 계산 = 규율 9 위반.**

**★축 주의 3 — 아이덴티티 병합 ≠ 계층.**
`crm_customers.identity_id`(`CRM.php:109`)는 **union-find 등가류**(`:597-643` — `roots`/`sizes` 클러스터링)다. **등가관계 = 대칭·추이적** vs **계층 = 반대칭 부분순서**. `crm_identity_merge_link(a_id,b_id)`(`:708-712`)의 `UNIQUE(tenant_id,a_id,b_id)` 도 **무방향 엣지**다. 🔴 **동일성 해소이지 계층이 아니다.**

## 1. 원문 전사 + 판정 — **원문 17종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | matrix relationship id | ★**`matrix_` 전역 0** | `ABSENT` |
| 2 | subject organization unit | **`organization_unit` 전역 0** | `ABSENT` |
| 3 | related organization unit | **전역 0** | `ABSENT` |
| 4 | matrix type | **전역 0**(아래 10종 전부 부재) | `ABSENT` |
| 5 | primary hierarchy reference | ★**계층 자체가 0** — `team` DDL 에 `parent_team_id` 없음(`TeamPermissions.php:145-151`) · `parent_user_id`(`UserAuth.php:156-167`)는 **owner 직속 2단·tenant 상속용**(보고선 아님) | `ABSENT` |
| 6 | secondary hierarchy reference | **전역 0** — 복수 보고선 개념 전무 | `ABSENT` |
| 7 | relationship priority | 부재 · ⚠️ 인접 형태 = `graph_edge.edge_weight`(`Db.php:816-839`) — **마케팅 귀속 가중치**(도메인 상이) | `KEEP_SEPARATE_WITH_REASON` |
| 8 | responsibility scope | 부재 · 🔴 `data_scope`(`TeamPermissions.php:160-166`)는 **가시성 필터**(단일 차원 `:277`·INCLUDE 고정)이지 책임 범위 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 9 | resource scope | 부재 — 자원 배정 축 0 | `ABSENT` |
| 10 | country scope | `Geo` = 국가→**언어**(`Geo.php:23-53`) · 국가→조직 매핑 **0건** | `KEEP_SEPARATE_WITH_REASON` |
| 11 | program scope | **program 축 grep 0** | `ABSENT` |
| 12 | approval routing eligible 여부 | 부재 — 승인 라우팅 전역 0(5-3-2 §12 확정) · 🔴 `DELEGATION_EXCEEDED`(`:645`)는 **권한 상한**이지 라우팅 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 13 | manager resolution eligible 여부 | 부재 — ★복수 보고선이 없으므로 **해석할 대상이 없다** · `team.manager_user_id`(`:145-151`)는 **단일 포인터** | `ABSENT` |
| 14 | valid_from | 부재 — 유일 선례 `kr_fee_rule.effective_from`(`Db.php:898`)조차 as-of 조회 불가(전역 0건) | `ABSENT` |
| 15 | valid_to | **`valid_to`/`effective_to` grep 0** | `ABSENT` |
| 16 | status | 부재(매트릭스 상태) · ⚠️ `team.status`(`:145-151`)는 팀 상태 | `KEEP_SEPARATE_WITH_REASON` |
| 17 | evidence | 부재 | `ABSENT` |

**실측 개수: 17 / 17 전사.** 커버리지 = `KEEP_SEPARATE_WITH_REASON` 6 · `ABSENT` 11. **`VALIDATED_LEGACY` = 0 · `PARTIAL` 0 → 전면 `ABSENT`.**

### Matrix Type — **원문 10종**

| # | 원문 값 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | FUNCTIONAL | grep 0 · ⚠️ `TEAM_TYPES` 17종(`TeamPermissions.php:44-49`)은 **평면 문자열 카탈로그** | `ABSENT` |
| 2 | REGIONAL | grep 0 · 🔴 `region` 3축 전부 무관 · **parent region 0** · `APAC`/`EMEA`/`AMERICAS`/`LATAM` grep 0 | `ABSENT` |
| 3 | PRODUCT | grep 0(매트릭스 축으로서) · ⚠️ `data_scope` 에 `product` **차원** 존재(`:318-320`) — **가시성 필터**이지 매트릭스 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 4 | PROJECT | grep 0(조직 매트릭스로서) · ⚠️ 인접 = PM 도메인(`pm_task_dependencies` 엣지 리스트 · `PM/Dependencies.php:79-100`) — **작업 의존성**이지 조직 관계 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 5 | PROGRAM | grep 0 | `ABSENT` |
| 6 | BRAND | grep 0(매트릭스 축으로서) · ⚠️ `catalog_brand`(`Catalog.php:151-169`) = **11번가 필수 브랜드코드**(상품속성) · `data_scope` `brand` 차원(`:318-320`) = 필터 | `KEEP_SEPARATE_WITH_REASON` |
| 7 | CUSTOMER | grep 0(매트릭스 축으로서) · 🔴 `crm_customers.identity_id`(`CRM.php:109`)는 **union-find 등가류**(대칭·추이적)이지 계층 아님(§19 함정) | `KEEP_SEPARATE_WITH_REASON` |
| 8 | LEGAL_ENTITY | ★**`legal_entity` 전역 0** · 사업자정보는 `app_user` 평문 필드(`UserAuth.php:499`) · 🔴 테넌트 ≠ 법인 | `ABSENT` |
| 9 | SHARED_SERVICE | grep 0 · 🔴 `DATA_SCOPES` 의 `'company'` 는 **무제한 센티넬**(`:258` *"전사 = 무제한"*)이지 공유서비스 아님 | `ABSENT` |
| 10 | CUSTOM | grep 0 | `ABSENT` |

**실측 개수: 10 / 10 전사.** 커버리지 = `KEEP_SEPARATE_WITH_REASON` 5 · `ABSENT` 5. **커버 0.**

## 2. 규칙

- 🔴 **§40 은 `ABSENT` 다 — 이름·능력 양쪽 부재.** `matrix_` **전역 grep 0**(PM 재확인) · Matrix Type 10종 **전부 0**. **능력축으로도** 성립 불가: 매트릭스는 **1차 계층 위에 2차 보고선을 얹는 구조**인데 **1차 계층 자체가 없다**(`team` DDL 에 `parent_team_id` 없음 `TeamPermissions.php:145-151` · `parent_user_id` 는 owner 직속 2단 `UserAuth.php:156-167`). → **§21(Tenant/Org Hierarchy) 선행 없이는 §40 을 구현할 수 없다.**
- 🔴 **`DELEGATION_EXCEEDED`(`TeamPermissions.php:645`)를 매트릭스 근거로 인용 금지 — 이름 함정.** 그것은 **권한 부여 상한 초과 오류**다. 같은 함정: `clampActions`(`:382-389`,`:396-402`)의 "상속"은 ★**하향 클램프**(팀 권한을 상한으로 멤버 권한 교집합 축소)이지 **계층 전파가 아니다.**
- 🔴 **`data_scope`(`:160-166`)를 `responsibility scope`/`resource scope` 로 배선 금지.** ⓐ **`parent_*`·`path`·`depth`·`lft/rgt`·`ancestor` 전무** ⓑ **단일 차원**(`:277` `if ($sc['scope_type'] !== $dimension) return null;` · `:311` 주석 자인) — 매트릭스가 요구하는 **다중 축 동시 소속을 구조적으로 표현 불가** ⓒ SQL = **IN 절 1개**(`:286-293`) · 조상/후손 확장 없음 ⓓ effect **INCLUDE 고정**.
- 🔴 **`:230` 주석의 "팀 스코프 상속"을 근거 삼지 마라 — 상속이 아니라 폴백이다**(`:253-254` — user 에 없으면 team **1회** 조회 · 단일 홉·비재귀 · **부모 팀 컬럼이 없어 구조적으로 중첩 불가**). ★**규율 10 적중 사례** — 정의부를 Read 하라.
- 🔴 **`graph_node`/`graph_edge`(`Db.php:816-839`)를 §40 커버로 계산 금지** — 도메인이 **마케팅 귀속**이다. **단 선례 가치는 최상**: Node/Edge 분리·타입드 관계·`edge_weight`·**양방향 인덱스**(`:838-839`)가 §40 의 `matrix type`/`relationship priority` 를 담을 **검증된 형태**이며, **전용 그래프 DB 도입은 불필요**(Neo4j/Cypher/Gremlin/Neptune/Arango/JanusGraph/TinkerPop **grep 0** — 두 번째 엔진 = 헌법 위반).
  - ⚠️ **인용 시 정직하게**: `graph_node`/`graph_edge` 는 ★**내부 생산자 0**(frontend 호출 0 · 외부 POST 전용 유입) → **VACUOUS 가능성 미배제** · **순환 방어 없음**. **"운영 중인 그래프"로 인용 금지.**
- 🔴 **`crm_customers.identity_id` 를 `CUSTOMER` 매트릭스로 계산 금지** — **union-find 등가류**(`CRM.php:109`·`:597-643`)이며 **등가관계(대칭·추이적) ≠ 계층(반대칭 부분순서)**. `crm_identity_merge_link`(`:708-712`)도 **무방향 엣지**다.
- 🔴 **`agency_client_link`(`AgencyPortal.php:64-72`)를 §40 근거로 인용 금지** — **§43 소관**(크로스테넌트 위임 엣지 · N:M · **1홉 전용**(순회·이행성·깊이 0) · **동의 기반 접근 허가**이지 조직↔조직 엣지 아님).
- **원문 지시 준수 — 최우선**: *"Matrix Relationship을 Primary Administrative Parent로 자동 전환하지 마라"*(`SPEC…:1713`) → 🔴 **2차 보고선이 1차 관리 계층을 침식하지 않도록 `primary hierarchy reference` 와 `secondary hierarchy reference` 를 구조적으로 분리**하고, `manager resolution eligible`/`approval routing eligible` 은 **명시 플래그**로만 작동시켜라. **암묵적 승격 경로를 만들지 마라.**
- **순회 구현 시 정본 패턴 강제**: 🔴 **재귀 CTE 금지 권고** — `WITH RECURSIVE` **backend/src 0** · `Db::sql()`(`Db.php:177-191`)은 **DDL 전용 번역기**(SELECT·CTE 미지원) · 레포의 트리 5개가 **전부 애플리케이션 계층 순회**(이식성). ★**정본 = `PM/Dependencies::validateDependency`(`PM/Dependencies.php:79-100`)** — **반복형 DFS + 명시적 `$visited` + tenant 필터 + 최대깊이 10000 + 쓰기 전 차단**(`:32-34` → 422 `cycle_detected`) + self-loop 차단(`:29-31`). 이 패턴 **확장이 무후퇴·최저위험**이다.
- 🔴 **N+1 순회 금지** — `GraphScore::scoreInfluencer:187-240` 이 **하드코딩 3-hop 런타임 전개** + **hop3∈hop2∈hop1 = N+1**(`:207-219`)로 285차 *"루프 내 N+1=즉시장애"* 트랩의 DB판을 재현한다. 매트릭스 순회는 **사전계산 경로 테이블(Path Index)** 을 정당화한다 — 단 **Closure Table/Path Index 전례 0**(순수 신규).
- **스키마 도입 제약**: 마이그레이션 경로 정지(172차) → `ensureTables` 멱등 패턴 + MySQL/SQLite 두 방언 동시 작성 의무.
- 🔴 11축 + Type 10종 `ABSENT` 를 **"있다고 가정"하고 배선 금지**(규율 7).
