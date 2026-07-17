# DSAR — Index·Performance (§68)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §68 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

### 0.1 🔴🔴 최대 위험 — `GraphScore.php:207-219` **N+1 = 285차 트랩의 DB판**

`GraphScore::scoreInfluencer:187-240` 은 **사전계산 경로 테이블 없이 3-hop 을 런타임 전개**한다. 그 구조가 **중첩 N+1** 이다.

```
hop1: influencer → creative   (1 쿼리)
  foreach creative:                         ← :202
    hop2: creative → sku      (N 쿼리)      ← :207-209
      foreach sku:                          ← :211
        hop3: sku → order     (N×M 쿼리)    ← :217-219
```

**총 쿼리 = 1 + N + (N×M).** hop3(`:217-219`)가 hop2(`:207-209`) 루프 안에, 그 hop2 가 hop1 루프(`:202`) 안에 있다.

> **★285차 정본 교훈**: *"루프 내 외부 API N+1 = 즉시장애"* — 공용 카탈로그를 실테넌트로 읽어 상품마다 11번가 3MB 를 재수집해 40s 타임아웃(→0.25s 로 수정). **이것은 그 트랩의 DB판이다.** 외부 API 가 아니라 DB 라 개별 쿼리는 싸지만, **곱셈 구조는 동일**하다. 그래프가 커지면 동일하게 붕괴한다.

🔴 **이것이 §18/§66 Path Index 도입의 정당화 근거다.** Ancestor/Descendant 를 매 요청 런타임 전개하면 조직 그래프에서 정확히 같은 곱셈이 재현된다.
⚠️ **현재 무해한 유일한 이유** = `graph_node`/`graph_edge` **내부 생산자 0**(`upsertNode`/`upsertEdge` 호출처 = 핸들러·라우트뿐 · frontend 0 → 외부 POST 전용 유입) — **안전장치가 아니라 우연이다**(라이브 행 수 미검증).

### 0.2 ★인덱스 선례 3건 — 전부 **양방향**

| 자산 | 인덱스 | file:line |
|---|---|---|
| `graph_edge` | `idx_graph_edge_src (tenant_id,src_type,src_id)` · `idx_graph_edge_dst (tenant_id,dst_type,dst_id)` | `Db.php:838-839` |
| `pm_task_dependencies` | `UNIQUE uq_pm_dep (tenant_id,predecessor_id,successor_id,dep_type)` · `KEY idx_pm_dep_pred (predecessor_id)` · `KEY idx_pm_dep_succ (successor_id)` | `20260526_168_004:12-14` |
| `menu_tree` | `KEY idx_menu_tree_parent (parent_id)` · SQLite `:134` | `AdminMenu.php:117` |

★**공통 교훈 = 부모→자식 · 자식→부모 양방향 인덱스가 레포 관례다.** 조직 엣지 신설 시 **단방향 인덱스는 관례 위반**이며, Ancestor 조회가 즉시 풀스캔이 된다.

★**품질 편차 2건 — 관례가 균일하지 않다**:
- `graph_edge` 인덱스는 **tenant_id 를 선두 컬럼**으로 포함(멀티테넌트 정합) — **최선례**.
- `pm_task_dependencies` 의 `idx_pm_dep_pred`/`idx_pm_dep_succ` 는 **tenant_id 를 포함하지 않는다**(UNIQUE 키에만 있음) → 테넌트 다수 환경에서 선택도 저하 가능. **관찰 사실 등재 · 등급 미부여 · 라이브 미검증.**
- `menu_tree` 는 **`tenant_id` 컬럼 자체가 없다**(전역 단일 트리) → 조직 인덱스 선례로 인용 시 **테넌트 축이 통째로 빠진다**.

### 0.3 🔴 기지 실측 정정 — `graph_node` 에는 **인덱스가 없다**

ⓑ 실측과 과업 브리핑이 *"`graph_node`/`graph_edge` 양방향 인덱스(`Db.php:838-839`)"* 로 적었으나, **정의부 재확인 결과 `:838-839` 는 `graph_edge` 전용이다.**

| 테이블 | DDL | 인덱스 |
|---|---|---|
| `graph_node` | `Db.php:816-825` | **없음.** PK(`id` AUTO_INCREMENT) 외 **인덱스 0 · UNIQUE 0** |
| `graph_edge` | `Db.php:826-837` | `:838-839` src/dst 양방향 |

**결과 2건**(관찰 사실 · 등급 미부여 · 라이브 미검증):
1. **`listNodes` 는 항상 풀스캔** — `SELECT * FROM graph_node WHERE tenant_id=? AND node_type=? ORDER BY created_at DESC LIMIT 500`(`GraphScore.php:90-95`)에 쓸 인덱스가 없다.
2. ★**`upsertEdge:126-133` 의 `INSERT IGNORE`/`INSERT OR IGNORE` 자동 노드 생성이 중복을 막지 못한다** — **유니크 제약이 없으면 IGNORE 는 무시할 충돌이 없다.** `GraphScore.php:65-67` 주석이 UNIQUE 부재를 **자인**하며(`upsertNode` 는 그래서 SELECT-then-upsert `:70-79` 를 쓴다), **`upsertEdge` 만 그 사실을 반영하지 않았다.**

🔴 **조직 그래프에 `graph_node` DDL 을 복제하지 마라.** 복제 대상은 `graph_edge`(`:826-839`) 쪽이다.

### 0.4 ★조회 축 현행 능력 — 대부분 **평면 IN 절**

| 축 | 현행 | 한계 |
|---|---|---|
| 스코프 필터 | `data_scope`(`TeamPermissions.php:160-166`) — `scope_values(TEXT)` → **`AND {col} IN (?,?,…)` 1개**(`:286-293`) | **조상/후손 확장 없음** · effect **INCLUDE 고정** · **단일 차원**(`:277` `if ($sc['scope_type'] !== $dimension) return null;` · 주석 자인 `:311`) |
| 배선 | `scopeSql*` 직접 호출 **5곳**(`AdPerformance.php:26` · `Wms.php:1291` · `Catalog.php:981`,`:982`,`:983`) + 래퍼 `scopeChannelProduct`(`OrderHub.php:261` → `TeamPermissions.php:315-322`, 내부 scopeSql×3) | ⚠️ **`data_scope` 런타임 행 수 미확인** — `:255-256` "미설정=무제한" → 행 0 이면 5곳 전부 no-op |
| Root 조회 | `parent_user_id IS NULL`(`PlanLimits.php:36-37`) · `COALESCE(parent_id,"")`(`AdminMenu.php:272`·`:333`) | `COALESCE` 정렬은 **인덱스 미사용** |
| 테넌트 열거 | `SELECT DISTINCT tenant_id FROM <도메인테이블>` **19개소** | **권위 목록이 아니라 데이터 행 역추론**(19는 하한) |
| Effective Date | `ORDER BY effective_from DESC LIMIT 1`(`Pnl.php:454` 등) | **as-of 술어 0건** → 인덱스 설계 선례 없음 |

## 1. 원문 전사 + 판정 — **원문 20종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Tenant별 Organization Unit | 대상 테이블 부재. 선례 = `graph_edge` 인덱스가 **tenant_id 선두**(`Db.php:838-839`) — 관례 정본 | `CONTRACT_ONLY` + `VALIDATED_LEGACY`(패턴) |
| 2 | Active Organization Version | **version 축 부재**(`menu_defaults.version` 단 1건 `AdminMenu.php:120`) — 인덱스 선례 0 | `CONTRACT_ONLY` |
| 3 | 특정 Effective Date의 Unit | 🔴 **`WHERE effective_from <= :as_of` 전역 0건** → **as-of 인덱스 선례 0**. 유일 컬럼 `kr_fee_rule.effective_from`(`Db.php:898`)에도 전용 인덱스 없음 | `CONTRACT_ONLY`(**순수 신규**) |
| 4 | Hierarchy Active Version | 부재 — `hierarch` grep 0 | `CONTRACT_ONLY` |
| 5 | Parent·Child | ★**선례 3건 전부 실재**(§0.2) — `graph_edge` src/dst(`Db.php:838-839`) · `pm_task_dependencies` pred/succ(`168_004:12-14`) · `menu_tree` parent(`AdminMenu.php:117`) | ★`VALIDATED_LEGACY` — **양방향 인덱스 필수 · 단방향은 관례 위반** |
| 6 | Ancestor·Descendant | 🔴 **최대 결번.** Path/Closure **전례 0**. 현행 대체물 = `scoreInfluencer:187-240` **하드코딩 3-hop** · **N+1**(`:207-219`) · `menu_tree` 조상 walk(`wouldCycle:540-555`)는 **반복 조회 · 깊이당 1쿼리** | `CONTRACT_ONLY`(**순수 신규**) — ★**N+1 이 Path Index 정당화 근거** |
| 7 | Legal Entity별 Organization | **법인 엔티티 0** → 인덱스 대상 없음 | `CONTRACT_ONLY` |
| 8 | Department별 Team | **`parent_team_id` 없음**(`team` DDL `TeamPermissions.php:145-151`/`:168`) → **인덱스를 걸 컬럼 자체가 없다**. `ORG_PRESET` 계층은 **이름에만** 존재 | `CONTRACT_ONLY` — 🔴 **선결 = 구조 링크 신설** |
| 9 | Region별 Country | **Country↔Region binding 0** · `region` **3축 병존**(`Db.php:681,690` / `Connectors.php:2704-2710` / `Wms.php:129`·`regionOf():284-286`) · `APAC`/`EMEA` grep 0 · parent region 컬럼 0 | `CONTRACT_ONLY` |
| 10 | Brand별 Store | `catalog_brand` `UNIQUE(tenant_id,name)`(`Catalog.php:151-169`) 존재하나 **Store 엔티티가 KV_ONLY**(`commerce_product_daily.store_id` **자유문자열** `Insights.php:114`·dedup `:125`) → **조인할 축이 없다** | `KV_ONLY` → `CONTRACT_ONLY` |
| 11 | Merchant별 Organization | Merchant = **`channel_credential` KV**(`Db.php:976-982`) · `merchant_promotion` 은 **`merchant_id` 컬럼조차 없음**(`Promotion.php:51-60`) | `NAME_ONLY` → `CONTRACT_ONLY` |
| 12 | Cost Center별 Organization | `cost_center` grep **0** | `CONTRACT_ONLY` |
| 13 | Profit Center별 Organization | `profit_center` grep **0** | `CONTRACT_ONLY` |
| 14 | Subject별 Membership | 멤버십 3벌(`team_member` · `app_user.parent_user_id` `UserAuth.php:156-167` · `agency_client_link` `AgencyPortal.php:64-72`). ★인덱스 선례 = `agency_client_link` **`UNIQUE(agency_id, client_tenant_id)` + 양방향 인덱스**(`:71`) — **subject↔object 양방향 관례 재확인** | `PARTIAL` + `VALIDATED_LEGACY`(패턴) |
| 15 | Organization별 Owner | 인접 = `team.manager_user_id`(`TeamPermissions.php:145-151`) · `parent_user_id IS NULL` owner(`PlanLimits.php:36-37`). ★**§79 "Owner 와 Manager 구분" 의 두 축이 현행 1개 컬럼에 융합** | `PARTIAL` |
| 16 | Approval Routing Eligible Path | 🔴 **전제 부재** — 승인 도메인에 조직 트리가 **0**(§65 #22). 승인자 결정 = **정족수 카운트**(`Mapping.php:287`)이지 경로 해석 아님 | `CONTRACT_ONLY` |
| 17 | Manager Resolution Eligible Path | 🔴 **전제 부재** — `reports_to` **0** · `manager_id` **0** · `parent_user_id` 는 **보고선이 아니다**(owner 직속 2단 봉인 · 용도 = tenant 상속) | `CONTRACT_ONLY` |
| 18 | Future-dated Changes | 부재 — effective date 축 0 · 미래 행 개념 0 | `CONTRACT_ONLY` |
| 19 | Orphan Node | 부재 — **전 트리 구현에 orphan 탐지 0**. 🔴 **`graph_node` 는 인덱스가 없어**(§0.3) orphan 스캔이 **풀스캔 + 안티조인**이 된다 | `CONTRACT_ONLY` |
| 20 | Reconciliation Mismatch | 부재 — 소스 1개(내부) · HRIS·ERP 커넥터 **0**(`ChannelRegistry.php:12`,`:79` `group_type`/`sync_kind` 열거에 `erp`·`finance`·`hr` 없음) | `CONTRACT_ONLY` |

**실측 개수: 20 / 20 전사.** 원문 개수와 전사 개수 **일치**.

**커버리지**: `CONTRACT_ONLY` **17**(실 인덱스 0) · `VALIDATED_LEGACY`(패턴 재사용 강제) **3**(Tenant 선두 인덱스 · Parent·Child 양방향 · Membership 양방향) · `PARTIAL` **2** · `KV_ONLY`/`NAME_ONLY` 2.

## 2. 규칙

- 🔴🔴 **Ancestor·Descendant 를 런타임 전개로 구현 금지.** `GraphScore.php:207-219` 가 그 결말을 이미 보여준다 — **hop3∈hop2∈hop1 = 1+N+(N×M) 쿼리**. **285차 "루프 내 N+1 = 즉시장애" 트랩의 DB판**이며, 조직 그래프에서 곱셈 구조가 그대로 재현된다. **Path Index(§18/§66) 도입의 정당화 근거가 바로 이 코드다.**
- 🔴 **엣지 인덱스는 양방향 필수 — 단방향은 레포 관례 위반이다.** 선례 3건이 전부 양방향이다: `Db.php:838-839` · `20260526_168_004:12-14` · `AdminMenu.php:117`. **부모→자식만 인덱싱하면 Ancestor 조회가 즉시 풀스캔이다.**
- 🔴 **인덱스 선두 컬럼에 `tenant_id` 를 넣어라 — `graph_edge`(`Db.php:838-839`) 가 최선례다.** 반례를 복제하지 마라: `pm_task_dependencies` 의 `idx_pm_dep_pred`/`idx_pm_dep_succ` 는 **tenant_id 미포함**(관찰 사실·등급 미부여) · `menu_tree` 는 **`tenant_id` 컬럼 자체가 없다**(전역 단일 트리) → **인덱스 선례로 인용 시 테넌트 축이 통째로 빠진다.**
- 🔴 **`graph_node` DDL(`Db.php:816-825`) 복제 금지 — 인덱스도 UNIQUE 도 없다.** 브리핑의 *"graph_node/graph_edge 양방향 인덱스"* 는 **부정확**하며 `:838-839` 는 **`graph_edge` 전용**이다(본 문서 §0.3 정정). 조직 노드 테이블에는 최소 **`UNIQUE(tenant_id, node_type, node_id)`** 를 걸어라 — 그것이 없어서 `GraphScore` 가 **SELECT-then-upsert 우회**(`:65-79`)를 쓰고 있고, `upsertEdge:126-133` 의 `INSERT IGNORE` 는 **무시할 충돌이 없어 중복 제거가 무효**다(관찰 사실 · 라이브 미검증).
- 🔴 **Department별 Team·Manager Resolution·Approval Routing 은 인덱스 문제가 아니라 결번 문제다.** `team` 에 **`parent_team_id` 가 없고**(`:145-151`/`:168`), `reports_to`/`manager_id` 가 **0** 이다. **인덱스를 걸 컬럼 자체가 없다** — 선결은 구조 링크 신설이다. **"인덱스 추가로 최적화" 로 서술하면 결번을 은폐한다.**
- 🔴 **as-of 조회 인덱스는 선례가 없다.** `WHERE effective_from <= :as_of` 술어가 **전역 0건**이고 `effective_to` 도 **0** 이므로, 폐구간 `(effective_from, effective_to)` 범위 인덱스는 **레포 최초**다. 기존 `ORDER BY effective_from DESC LIMIT 1`(최신승) 패턴을 인덱스 선례로 인용하지 마라 — **그것은 as-of 가 아니다.**
- 🔴 **`data_scope` 의 `IN` 절 확장으로 Ancestor 를 구현하지 마라.** `scopeSql*`(`:286-293`)은 **평면 IN 1개**이며 **단일 차원**(`:277`)·**effect INCLUDE 고정**이다. 조상 집합을 IN 절에 펼치면 **트리 크기에 비례하는 바인딩 폭발**이 된다. Path Index 조인으로 풀어라.
- **과도한 인덱스 금지(원문 명시).** 조직 엣지는 **쓰기가 드물고 읽기가 압도적**이므로 읽기 인덱스 우위가 정당하나, `graph_edge` 가 **인덱스 2개로 src/dst 를 모두 커버**하는 절제를 따르라. 20개 조회 축마다 인덱스를 만들면 쓰기 성능이 훼손된다.
- ⚠️ **미확정 3건 — 단정 금지**: `graph_node`/`graph_edge` **내부 생산자 0**(현재 N+1 이 무해한 이유이나 **안전장치가 아니라 우연**) · `data_scope` **런타임 행 수 미확인**(0 이면 5곳 배선 전부 no-op → **"실사용 중인 ABAC"으로 단정 금지**) · `menu_tree` **운영 0행 가능성**(`AdminMenuManager.jsx:252`·`:341` · `reorder` 프론트 호출자 0 → **"운영 중인 트리"로 인용 금지**).
