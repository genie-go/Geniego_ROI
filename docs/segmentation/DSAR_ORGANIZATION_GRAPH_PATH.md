# DSAR — Organization Graph Path (§18 + §19 + §66)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §18(Graph Path) · §19(Path 계산 원칙) · §66(데이터 저장 전략) · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)
>
> 자매 문서: Path Type 축 = [DSAR_ORGANIZATION_GRAPH_PATH_TYPE.md](DSAR_ORGANIZATION_GRAPH_PATH_TYPE.md) · Node = [DSAR_ORGANIZATION_GRAPH_NODE.md](DSAR_ORGANIZATION_GRAPH_NODE.md) · Edge = [DSAR_ORGANIZATION_GRAPH_EDGE.md](DSAR_ORGANIZATION_GRAPH_EDGE.md)

## 0. 현행 실측 (file:line)

### ★ 핵심 1 — §18 Graph Path = **레포 전례 0 · 순수 신규**

Node·Edge 와 달리 **Path 축은 구조적 쌍둥이가 없다.**

| 후보 패턴 | 실측 | 판정 |
|---|---|---|
| **Closure Table** | `closure`·`ancestor`·`descendant`·`graph_path` **backend/src grep 0** | `ABSENT` |
| **Nested Set** | `lft`/`rgt` **grep 0** | `ABSENT` |
| **Materialized Path(DB 컬럼)** | `full_path`/`path_str`/`tree_path`/`idpath` **grep 0** | `ABSENT` |
| **Recursive CTE** | `WITH RECURSIVE`·`CONNECT BY` **backend/src grep 0** | `ABSENT` |
| **Graph Database** | Neo4j·Cypher·Gremlin·Neptune·Arango·JanusGraph·TinkerPop **grep 0** | `ABSENT` |
| **사전계산 경로 테이블** | **0** — 경로는 전부 **요청 시 런타임 전개** | `ABSENT` |

**→ §18 의 `ORGANIZATION_GRAPH_PATH` 는 Node(`graph_node`)·Edge(`graph_edge`)와 달리 차용할 선례가 없다. Path Index 는 이 EPIC 이 레포에 처음 들여오는 구조다.**

### ★ 핵심 2 — Path Index 도입 정당화 근거 = **`GraphScore` 의 N+1**

`GraphScore::scoreInfluencer`(`GraphScore.php:187-240`)는 **하드코딩 3-hop 런타임 전개**다.

| 실측 | 근거 |
|---|---|
| Hop 1: influencer→creative | `:193-195` — 쿼리 1회 |
| Hop 2: creative→sku | **`:207-209` — `foreach ($creatives as $c)` 루프 안**(`:202`) |
| Hop 3: sku→order | **`:217-219` — `foreach ($skus as $s)` 루프 안**(`:211`), 즉 **hop3 ∈ hop2 ∈ hop1** |
| 총 쿼리 수 | **1 + C + (C×S)** — creative C개 · SKU S개에 **곱셈으로 증가** |
| 범용성 | **없음** — `'influencer'`/`'creative'`/`'sku'`/`'order'` 문자열이 SQL 에 하드코딩(`:193`,`:207`,`:217`) · 깊이 3 고정 · **가변 깊이 순회 불가** |
| 순환 방어 | **없음** |

🔴 **이것은 285차 "루프 내 외부API N+1 = 즉시장애" 트랩의 DB판이다.** 285차 사고는 *공용 카탈로그를 실테넌트로 읽어 상품마다 11번가 3MB 재수집* → **40s 타임아웃 → 502**였고, 근본 형태는 **"루프 안에서 원격 호출"** 이었다. `GraphScore.php:207-219` 는 원격이 외부 API 대신 **DB** 일 뿐 **동일한 구조**다.

**→ 조직 그래프에서 이 패턴을 반복하면 승인 라우팅·매니저 해석·스코프 확장이 매 요청 N+1 을 낸다. §18 Path Index(사전계산)는 이 실측 결함에 대한 직접 대응이며, 도입 정당화 근거로 인용 가능하다.**

### ★ 핵심 3 — §19 순회 강제 3종은 **이미 최상급 구현이 존재**(재구현 금지)

★**`PM/Dependencies::validateDependency`(`PM/Dependencies.php:79-100`)** — 레포 최고 품질의 순회 구현.

```
$visited = [];  $stack = [$succId];  $depth = 0;
while ($stack && $depth < 10000) {          // :84  작업량 상한
    $cur = array_pop($stack);                // :85  반복형 DFS(재귀 아님 → 스택오버플로 없음)
    if (isset($visited[$cur])) continue;     // :86  ★명시적 방문집합
    $visited[$cur] = true;                   // :87
    if ($cur === $predId) return false;      // :88  도달 = cycle
    ... WHERE tenant_id = ? AND predecessor_id = ?   // :90-91  ★tenant 필터
    $depth++;                                // :97
}
```

| §19 강제 항목 | 충족 | 근거 |
|---|---|---|
| **Tenant Filter** | ✅ | `:91` `WHERE tenant_id = ?` — 순회 **매 홉**에 강제 |
| **Cycle Protection** | ✅ | `:86-87` 명시적 `$visited` + `:88` 도달 판정 + **★쓰기 전 차단**(`:32-34` → 422 `cycle_detected`) + self-loop 사전 차단(`:29-31` → 422 `self_dependency`) |
| **Maximum Depth** | ⚠️ **PARTIAL** | `:84` `$depth < 10000` 은 ★**경로 깊이 상한이 아니라 방문 노드 예산**이다 — `$depth++`(`:97`)가 **pop 한 노드마다** 증가한다. 작업량은 유계이나 **"깊이 N 이하만 순회"는 표현 불가**(§20 Hierarchy Level 강제에 부족) |

**보조 선례 2건**

| 자산 | 실측 | 가치 |
|---|---|---|
| ★`PM/Gantt`(`PM/Gantt.php:104-125`) | **Kahn 위상정렬** + `count($topo) !== count($taskMap)` **정석 순환 판정** + 순환 시 **500이 아니라 부분결과+경고로 degrade** | §53 Topological Sort 정본 선례 |
| `AdminMenu::wouldCycle`(`:540-555`) | 조상 체인 **상향 walk** · **재귀 CTE 아닌 반복 조회** + `$depth<100` 하드캡(`:545`) + 자기참조 즉시 차단(`:542`) + 이동 시 검사 후 UPDATE(`:487-503`) | Ancestor walk 선례. 🔴 **`tenant_id` 컬럼 없음(전역 단일 트리)** → 조직 아님 · ⚠️`AdminMenuManager.jsx:252`/`:341` 이 "비어 있음"/"미등록" 분기 보유 → **운영 0행 가능성** |

**→ §19 는 "선례 없음→신설"이 아니다. `validateDependency` 패턴(반복 DFS + `$visited` + tenant 필터 + 작업량 캡 + 쓰기 전 차단) 을 확장하라. 🔴 재구현 금지.**

### ★ 핵심 4 — Materialized Path 문자열 선례 (§66 조합 후보)

| 자산 | 실측 |
|---|---|
| 11번가 카테고리 | `ChannelSync::elevenStCategoryCatalog:921-972` — **1패스** `dispNo→[name,parent,leaf]` XMLReader **스트리밍 맵**(`:932-951` · 3MB DOM 회피 자인 `:919`) → **2패스 parent 체인 역주행으로 `whole`("대 > 중 > 소 > 세") 구성**(`:954-969`) · **순환·과깊이 가드 `$guard < 10`**(`:959`). **= adjacency → materialized path 파생 선례** |
| 라우트/메뉴키 | prefix 매칭(§2 규칙 참조) |

⚠️ **충돌 해소**: `Catalog.php` 의 `channel_category_catalog`(`:200`/`:209`)는 **별개** — `whole_name` 이 경로처럼 보이나 **`LIKE '%term%'` 중위 검색**(`:299`) · `parent_id` **없음** · `is_leaf=1` 만 노출(`:297`) = **리프 평면 캐시. 트리 아님.** 선례는 `ChannelSync` 쪽이다.

### ⚠️ 기타 실측

- `journeys.edges` = **JSON 문서** · 단일 next(`JourneyBuilder.php:786`) · **런타임 방문집합만**(`:511-518` — 작성자 JSON 무검증 자인) → 경로 인덱스 아님 · **반면교사**
- `PolicyTreeEditor.jsx`(재귀 DFS `:30-65`) = **어디서도 import 되지 않음**(전 frontend/src grep = 정의부뿐) → **VACUOUS 고아 컴포넌트.** 🔴 선례로 인용 금지
- 서버 캐시 계층(Redis/Memcached) **grep 0** — `apcu_*` 는 `SystemMetrics.php:225-451` **지표 보고 전용** → **Path 조회 캐시로 우회 불가 = Path Index 가 유일 수단**
- 테스트: `tools/e2e/` 3종(`smoke.mjs`·`render.mjs`·`scenarios.mjs`)에 `organization|hierarchy|org_unit|sso|scim` **grep 0** → 조직 회귀 커버리지 0

## 1. 원문 전사 + 판정 — **§18 원문 16종**

`ORGANIZATION_GRAPH_PATH` 필수 필드. 원문 지시: *"Closure Table 또는 동등한 Path Index를 구축한다."*(`SPEC …:1001`)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | organization_graph_path_id | 경로 테이블 자체 **부재**(`graph_path` grep 0) · 경로는 **런타임 배열**(`GraphScore.php:197` `$paths = []` · `:226` 즉석 조립 후 응답과 함께 소멸 — **식별자 없음·영속 없음**) | `NOT_APPLICABLE` |
| 2 | organization_hierarchy_version_id | version 컬럼 = `menu_defaults.version` 단 1건 · optimistic lock version **grep 0** | `NOT_APPLICABLE` |
| 3 | ancestor_node_id | `ancestor` **grep 0.** 최근접 능력 = `AdminMenu::wouldCycle:540-555` **조상 상향 walk**(런타임·비영속·전역트리) | `NOT_APPLICABLE` |
| 4 | descendant_node_id | `descendant` **grep 0.** 최근접 = `validateDependency:79-100` 하향 DFS(런타임·비영속·**boolean 만 반환**) | `NOT_APPLICABLE` |
| 5 | path length | **컬럼 0.** `GraphScore` 는 깊이 3 **하드코딩**(`:193`,`:207`,`:217`)이라 길이 개념이 없고, `elevenSt` 는 `$guard`(`:959`)를 **가드로만 쓰고 저장하지 않는다**(반환 shape `:964-969` = `{code,name,whole,leaf}` — **길이·depth 없음**) | `NOT_APPLICABLE` |
| 6 | path type | 축 부재 — 전사는 [PATH_TYPE 문서](DSAR_ORGANIZATION_GRAPH_PATH_TYPE.md) | `NOT_APPLICABLE` |
| 7 | primary path 여부 | `is_primary`/`primary_flag` **grep 0** · §17 Primary Parent 자체 부재 | `NOT_APPLICABLE` |
| 8 | path sequence reference | **경로 시퀀스 영속 0.** ⚠️인접 오독 주의 — `GraphScore.php:226` 의 `['influencer'=>…,'creative'=>…,'sku'=>…,'order'=>…]` 는 **고정 4슬롯 응답 DTO**(가변 시퀀스 아님·비영속) | `NOT_APPLICABLE` |
| 9 | legal entity crossings | **grep 0** — 법인 엔티티 자체 부재(`legal_entity_id` 0 · `biz_no`/`brn`/`corp_reg`/`tax_id` 0) → 교차 계산 대상 없음 | `NOT_APPLICABLE` |
| 10 | region crossings | **grep 0** · `region` **3축 병존**(광고 인구통계 `Db.php:681`,`690` / Amazon Ads 엔드포인트 `Connectors.php:2704-2710` / WMS 시·도 `Wms.php:129`,`regionOf():284-286`) · **parent region 컬럼 0** · `APAC`/`EMEA`/`AMERICAS`/`LATAM` **0** | `NOT_APPLICABLE` |
| 11 | country crossings | **grep 0** · ★**Country→Region 매핑 코드 0건** · `Geo`(`Geo.php:23-53`)는 국가→**언어** 매핑(`SUPPORTED` 15언어 `:21`)이지 국가→조직/지역 아님 | `NOT_APPLICABLE` |
| 12 | valid_from | `kr_fee_rule.effective_from`(`Db.php:898`) = **전 코드베이스 유일 effective date** · 🔴 **`WHERE effective_from <= :as_of` 술어 backend/src 전역 0건**(읽기 전부 `ORDER BY effective_from DESC LIMIT 1` 최신승 — `Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`) | `PARTIAL`(타 도메인 컬럼 선례만) |
| 13 | valid_to | `valid_to`/`effective_to` **grep 0** → **폐구간 순수 신규** | `NOT_APPLICABLE` |
| 14 | computed_at | ★**파생 데이터의 계산시각 = 레포 전례 0**(경로 사전계산 자체가 없으므로). 인접 명명 = `pm_baseline.captured_at`(`PM\Enterprise.php:55`·`:62`·`:360-364`) · `channel_category_catalog.synced_at`(`Catalog.php:209`·`:660-663`) = **파생 캐시의 갱신시각** 선례 | `LEGACY_ADAPTER` |
| 15 | status | 경로 테이블 부재 · `graph_edge`/`graph_node` 에도 `status` 없음(`Db.php:816-837`) | `NOT_APPLICABLE` |
| 16 | **evidence** | 부재. 인접 선례 = `menu_audit_log.hash_chain`(SHA-256 prev-chain `AdminMenu.php:128`·`:182-197`·`lastHash():214-219`)(🔴 쓰기 체인만 실재·`verify()` 0·preimage `ts` `:195` 소실 → tamper-evident 아님; 검증형 정본 = `SecurityAudit::verify():56-68`) · `pm_audit_log`(tenant+entity+diff_json+3인덱스) · `schema_migrations.checksum`(`Migrate.php:50` `hash('sha256',$sql)`·`:63-64`·`:145`/`:151`) | `LEGACY_ADAPTER` |

**실측 개수: 16 / 16 전사.** 커버리지 = `VALIDATED_LEGACY` **0** · `LEGACY_ADAPTER` 2 · `PARTIAL` 1 · `NOT_APPLICABLE` 13.

> **Node·Edge 와의 결정적 차이**: Node/Edge 는 `KEEP_SEPARATE_WITH_REASON`(구조적 쌍둥이 존재)이 다수였으나 **Path 는 `KEEP_SEPARATE_WITH_REASON` 이 0** 이다 — **닮은 것조차 없다.**

## 1-B. §19 Path 계산 원칙 — **원문 조회 14종 + 순회 강제 9종**

### (a) 지원 요구 — **원문 14종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Ancestor 조회 | `AdminMenu::wouldCycle:540-555` 조상 상향 walk **실재**(반복 조회·`$depth<100` 캡 `:545`). 🔴 **단 `menu_tree` 는 tenant 컬럼 없는 전역 단일 트리** · 목적이 조회가 아니라 **순환 판정**(boolean) · 조상 목록을 반환하지 않음 | `KEEP_SEPARATE_WITH_REASON` |
| 2 | Descendant 조회 | `validateDependency:79-100` 하향 DFS **실재**(tenant 필터 有). 단 **boolean 만 반환** — 후손 목록 미반환 | `PARTIAL` |
| 3 | Immediate Parent 조회 | `resolveTenantId`(`UserAuth.php:200-217`) — `$pid` 로 `LIMIT 1` **1회 조회 후 즉시 return** · 재귀 없음. 소비처 1홉: `Rollup.php:56`·`ChannelSync.php:72`·`ChannelCreds.php:85`·`BillingMethod.php:88`·`AgencyPortal.php:478`·`PlanLimits.php:36-37`. ★**용도 = 테넌트 상속**(`:197`·`:214` 동일값 UPDATE)이지 조직 부모 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 4 | Immediate Child 조회 | `SELECT … WHERE parent_id = ?` 형태 실재(`AdminMenu` 조립 `:272`·`:333` `ORDER BY COALESCE(parent_id,""), display_order, id` — **앱단 조립**) | `KEEP_SEPARATE_WITH_REASON` |
| 5 | Root 조회 | `parent_user_id IS NULL`(`PlanLimits.php:36-37`) · `COALESCE(parent_id,"")`(`AdminMenu.php:272`) — **NULL 관례** · 조직 root 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 6 | Lowest Common Ancestor 후보 | **`lca`·`lowest_common` grep 0** · LCA 계산 코드 전무 | `NOT_APPLICABLE` |
| 7 | Path Length | **부재**(§1 #5) | `NOT_APPLICABLE` |
| 8 | Hierarchy Level | **부재** — `hierarch` grep 0 · `wms_bins.level`(`Wms.php:193-194`)은 물리 선반단 | `NAME_ONLY` |
| 9 | Legal Entity Crossing 여부 | **부재** — 법인 엔티티 없음 | `NOT_APPLICABLE` |
| 10 | Country Crossing 여부 | **부재** — Country→조직 귀속 없음 · Country→Region 매핑 **0건** | `NOT_APPLICABLE` |
| 11 | Primary Path | **부재** — primary 개념 없음 | `NOT_APPLICABLE` |
| 12 | Functional Path | **부재** — Hierarchy Type 축 자체 없음 | `NOT_APPLICABLE` |
| 13 | Administrative Path | **부재** | `NOT_APPLICABLE` |
| 14 | Approval-eligible Path | **부재** — ★승인이 조직을 경유하지 않는다(승인 = 핸들러 메서드 · `INSERT INTO action_request` **grep 0** = 생산자 전무) | `NOT_APPLICABLE` |

**실측 개수: 14 / 14 전사.** 커버 = `VALIDATED_LEGACY` **0** · `KEEP_SEPARATE_WITH_REASON` 4 · `PARTIAL` 1 · `NAME_ONLY` 1 · `NOT_APPLICABLE` 8.

### (b) Graph Traversal 강제 — **원문 9종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | **Tenant Filter** | ★**`validateDependency:90-91` `WHERE tenant_id = ? AND predecessor_id = ?`** — 순회 **매 홉** 강제. 플랫폼 격리도 REAL(인증키 tenant 로 `X-Tenant-Id` **무조건 덮어쓰기** `index.php:600` · 세션→`auth_tenant` 주입 `:429-442` · strict fail-closed `:585`) | ✅ `VALIDATED_LEGACY` |
| 2 | Hierarchy Version Filter | version 개념 부재 → 필터 대상 없음 | `NOT_APPLICABLE` |
| 3 | Effective Date Filter | 🔴 **`WHERE effective_from <= :as_of` 술어 backend/src 전역 0건.** 순회에 날짜 필터를 거는 코드 **0** | `NOT_APPLICABLE` |
| 4 | Relationship Type Filter | ⚠️ **미충족** — `pm_task_dependencies` 는 `dep_type` 을 **보유**(UNIQUE 키에 포함)하나 `validateDependency:90-91` 이 **`dep_type` 을 술어에 넣지 않아** 순회는 **전 타입을 무차별 통과**한다 | `PARTIAL` |
| 5 | Legal Entity Boundary Policy | 법인 경계 개념 부재 | `NOT_APPLICABLE` |
| 6 | **Maximum Depth** | ⚠️ `validateDependency:84` `$depth < 10000` · `AdminMenu:545` `$depth<100` · `elevenSt:959` `$guard<10` — **작업량 상한은 3곳에 실재.** 🔴 **단 `validateDependency` 의 `$depth` 는 pop 마다 증가(`:97`)하므로 경로 깊이가 아니라 방문 노드 예산이다.** `AdminMenu:545`/`elevenSt:959` 는 **선형 체인 walk 라 실제 깊이 캡**(분기 없음) | `PARTIAL` |
| 7 | **Cycle Protection** | ★**최상급 실재** — `validateDependency:86-87` 명시적 `$visited` + `:88` 도달판정 + **쓰기 전 차단 422**(`:32-34`) + self-loop 422(`:29-31`) · `Gantt:104-125` Kahn `count($topo)!==count($taskMap)` + **degrade** · `wouldCycle:540-555` + `:542` 자기참조 차단. 🔴 **단 `graph_edge` 는 순환방어 0** · `journeys` 는 **런타임 방문집합만**(작성자 JSON 무검증 자인 `:511-518`) | ✅ `VALIDATED_LEGACY`(PM 계열 한정) |
| 8 | Query Timeout | ⚠️ **순회 쿼리 타임아웃 grep 0.** 인접 = HTTP 타임아웃(`ChannelSync.php:923` `httpGetRaw(…, 40)`) — 외부 API 용이지 DB 순회 아님 | `NOT_APPLICABLE` |
| 9 | Result Limit | **순회 결과 상한 0** — `validateDependency` 는 `$stack` 무제한 push(`:94-96`) · `GraphScore` 는 `$paths[]` 무제한 누적(`:226`) · **응답 크기 상한 없음** | `NOT_APPLICABLE` |

**실측 개수: 9 / 9 전사.** 커버 = `VALIDATED_LEGACY` **2**(Tenant Filter · Cycle Protection) · `PARTIAL` 2 · `NOT_APPLICABLE` 5.

> ★**본 5-3-3-1 전체에서 `VALIDATED_LEGACY` 가 나온 유일한 지점**이다. Tenant Filter·Cycle Protection 은 **실제로 충족**돼 있다 → **확장만 · 재구현 금지.**

## 1-C. §66 데이터 저장 전략 — **원문 패턴 8종 + 권장 기본 6종**

원문 첫 문장: *"Repository의 기존 기술 스택을 우선 사용하라."*(`SPEC …:2619`)

### (a) 선택 후보 패턴 — **원문 8종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | **Adjacency List** | ★**레포 단일 지배** — `pm_task_dependencies`(엣지 리스트·UNIQUE·양방향 인덱스) · `menu_tree.parent_id`+`idx_menu_tree_parent`(`AdminMenu.php:108-117`) · `graph_edge`(타입드·양방향 인덱스 `Db.php:838-839`) · `app_user.parent_user_id`(`UserAuth.php:156-167`) · `agency_client_link`(`AgencyPortal.php:64-72`) | ✅ **채택** — 기존 스택 |
| 2 | Closure Table | **grep 0**(`closure`/`ancestor`/`descendant`/`graph_path`) | `ABSENT` → **신규 도입**(§18 요구) |
| 3 | Materialized Path | **DB 컬럼 0**(`full_path`/`path_str`/`tree_path`/`idpath`). 단 **문자열 파생 선례 실재**: `elevenStCategoryCatalog:954-969` parent 체인 역주행 `whole` · 라우트/메뉴키 prefix | `PARTIAL`(파생 로직만) |
| 4 | Nested Set | `lft`/`rgt` **grep 0** | `ABSENT` |
| 5 | Graph Database | Neo4j·Cypher·Gremlin·Neptune·Arango·JanusGraph·TinkerPop **grep 0** | `ABSENT` → 🔴 **도입 불필요·금지** |
| 6 | Recursive CTE | `WITH RECURSIVE`·`CONNECT BY` **backend/src grep 0**. 아래 §2 판단 참조 | `ABSENT` → 🔴 **채택 금지** |
| 7 | Event-sourced Relationship History | **grep 0.** 인접 = `menu_audit_log`(해시체인 `AdminMenu.php:128`)·`pm_audit_log`(diff_json) = **감사 로그이지 재구성 가능한 이벤트 스트림 아님**(로그로부터 상태를 재생하는 코드 0) | `LEGACY_ADAPTER` |
| 8 | Bitemporal Table | **부재 확정** — Business Time = `kr_fee_rule.effective_from` **1건뿐**(`Db.php:898`)이고 `effective_to` **0** · as-of 술어 **전역 0건** · System Time = `created_at` 관례(단 `graph_edge` UPDATE 는 `created_at` 미갱신 `GraphScore.php:142`) → **두 축이 한 테이블에 공존한 사례 0** | `NOT_APPLICABLE` |

**실측 개수: 8 / 8 전사.**

### (b) 권장 기본 — **원문 6종**

| # | 원문 항목명 | 현행 선례 | 판정 |
|---|---|---|---|
| 1 | Canonical Node·Edge: 관계 Source of Truth | ★**선례 최상** — `graph_node`/`graph_edge`(`Db.php:816-839`) = Node/Edge 분리 + 타입드 + 가중치 + 양방향 인덱스 · `pm_task_dependencies` = UNIQUE + 쓰기 전 순환차단. **도메인만 다르다** | `KEEP_SEPARATE_WITH_REASON`(패턴 차용) |
| 2 | Closure Table 또는 Path Index: 빠른 Ancestor·Descendant 조회 | **전례 0**(§1-C(a)#2) · 현행은 런타임 전개 + **N+1**(`GraphScore.php:207-219`) | `NOT_APPLICABLE` → **순수 신규** |
| 3 | Immutable Hierarchy Version: 승인 시점 재현 | `menu_defaults(snapshot_data JSON, version, created_at)`(`AdminMenu.php:120`·`:139` · 생성 `:308` · 복원 `:584-590`) = **유일한 "버전 붙은 스냅샷"**. 🔴 단 **immutable_hash 없음 · 전역 1행(tenant 없음) · 최신 1건만 조회** | `PARTIAL` |
| 4 | Effective Period: Business Time | `kr_fee_rule.effective_from`(`Db.php:898`) **유일** · `effective_to` **0** · 🔴 **as-of 조회 능력 0**(전역 `WHERE effective_from <= :as_of` 0건) | `PARTIAL` |
| 5 | Recorded Period: System Time | `created_at` 관례 광범위(`graph_node`/`graph_edge` `Db.php:823`·`:836`) · `pm_baseline.captured_at`(`PM\Enterprise.php:55`·`:62`) — 단 **폐구간(recorded_from/to) 0** · `graph_edge` UPDATE 가 `created_at` 미갱신(`GraphScore.php:142`) | `PARTIAL` |
| 6 | Snapshot: Approval Evidence | `menu_defaults.snapshot_data`(`AdminMenu.php:120`) · `pm_baseline.snapshot_json`(`PM\Enterprise.php:55`·`:360-364`) · **immutable_hash 선례 = `schema_migrations.checksum`**(`Migrate.php:50` `hash('sha256',$sql)`·`:63-64`·`:145`/`:151`) · **해시체인 = `menu_audit_log.hash_chain CHAR(64)`**(`AdminMenu.php:128`·`:182-197`)(🔴 쓰기 체인만 실재·`verify()` 0·preimage `ts` `:195` 소실 → tamper-evident 아님; 검증형 정본 = `SecurityAudit::verify():56-68`) | `LEGACY_ADAPTER`(조합 확장) |

**실측 개수: 6 / 6 전사.**

원문 마지막 문장: *"Path Index는 파생 데이터이며 Node·Edge와 Reconciliation 가능해야 한다."*(`SPEC …:2641`) — 이는 §65 금지 *"Graph Path와 Edge가 별도 Source of Truth인 구현"*(`SPEC …:2613`)과 **한 쌍**이다.

## 2. 규칙

### 저장 전략 결정 (§66)

- ★**Adjacency List(Canonical Node·Edge) + Closure Table/Path Index(파생) 조합으로 간다.** 원문 §66 이 *"Repository의 기존 기술 스택을 우선 사용하라"* 를 첫 문장으로 못박았고, 실측상 **레포는 Adjacency List 단일 지배**다.

  | 구현 | 저장 | 순회 | 순환 방어 | 배선 |
  |---|---|---|---|---|
  | `pm_task_dependencies` | 엣지 리스트 · UNIQUE · 양방향 인덱스 | **반복 DFS + Kahn** | **쓰기 전 차단**(최상급) | REAL |
  | `menu_tree` | Adjacency + idx | 조상 walk(깊이캡 100) | 쓰기 전 차단 | 라우트 REAL / **reorder 프론트 호출자 0** |
  | `graph_node`/`graph_edge` | Adjacency(타입드) · 양방향 인덱스 | **하드코딩 3-hop**(범용 아님) | **없음** | 라우트 REAL / **내부 생산자 0** |
  | `journeys.edges` | JSON 문서 | 단일 next(`:786`) | **런타임 방문집합만**(`:511-518` 자인) | REAL |
  | 라우트/메뉴키 | Materialized Path(문자열) | 최장 prefix | — | REAL |

- 🔴 **전용 그래프 DB 도입 금지**(패턴 #5). grep 0 이며, `graph_node`/`graph_edge` 가 **Node/Edge 분리 + 타입드 관계 + 가중치 + 양방향 인덱스**를 관계형으로 이미 증명했다. 두 번째 저장엔진 = 헌법 위반(중복 엔진).
- 🔴 **재귀 CTE 채택 금지**(패턴 #6). 판단 근거:
  - **엔진**: MySQL 8.0.37 지원 · SQLite 3.8.3+ 지원. ⚠️ **라이브 SQLite 버전은 실측하지 않았다 — 이는 추론이며 사실로 인용 금지.** (PHP 8.1 동봉 SQLite 면 충족이라는 것도 추론.)
  - **레포**: `WITH RECURSIVE` **backend/src 0** · ★**`Db::sql()`(`Db.php:177-191`)은 DDL 전용 번역기**(AUTO_INCREMENT/TINYINT/DOUBLE/COMMENT 치환)로 **SELECT·CTE 를 번역하지 않는다** → 재귀 CTE 는 번역기 지원 없이 **방언별 raw SQL 2벌**을 지게 된다.
  - **관례**: 트리 5개(`pm_task_dependencies`·`menu_tree`·`graph_edge`·`journeys`·11번가 카테고리)가 **전부 애플리케이션 계층 순회**를 택했다(이식성 = MySQL/SQLite 이중 지원의 귀결).
  - **→ 기술적으로 가능하나 레포 관례에 반한다.** 재귀 CTE 도입 = **두 번째 순회 방식 도입**이며 정합 부담을 진다. **`validateDependency` 패턴 확장이 무후퇴·최저위험.**
- 🔴 **Nested Set 금지**(패턴 #4) — 전례 0이며 쓰기 비용(전 서브트리 `lft/rgt` 재계산)이 §14 버전 이행과 상충.
- **Materialized Path(패턴 #3)는 보조로만.** 문자열 경로는 `elevenStCategoryCatalog:954-969` 처럼 **표시·검색용 파생**으로 유효하나, **인가 판정 축으로 쓰면 prefix 경계 사고**를 부른다(아래 참조).

### Path Index 구축 (§18)

- ★**Path Index 도입 정당화 근거 = `GraphScore.php:207-219` 의 N+1.** hop3 ∈ hop2 ∈ hop1 · 쿼리 `1 + C + (C×S)` · 깊이 3 하드코딩 · 순환방어 0 — **285차 "루프 내 N+1 = 즉시장애" 트랩의 DB판**이다. 🔴 **조직 그래프에서 이 패턴을 반복 금지.** 서버 캐시 계층(Redis/Memcached)이 **grep 0**(apcu 는 `SystemMetrics.php:225-451` 지표 전용)이므로 **캐시로 우회할 수단도 없다** → Path Index 가 유일한 대응.
- ★**Path Index 는 파생이다. Node·Edge 가 SoT.**(`SPEC …:2641`) 🔴 **Path 를 직접 쓰기 가능하게 만들지 마라** — §65 금지 *"Graph Path와 Edge가 별도 Source of Truth인 구현"*(`:2613`) 직격. **Reconciliation(Edge 로부터 Path 재계산 → 대조) 수단을 함께 설계**하고, `computed_at`(#14)을 그 근거로 삼아라.
- ⚠️ **재계산·백필의 집행 수단이 현재 없다.** `backend/migrations/` 는 **172차 정지**(최신 `20260527_172_002_coupon_tables.sql`)이고, 대체 경로인 **`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다**(`CRM.php:44`·`EnterpriseAuth.php:45`·`AdminMenu.php:108` 패턴). → **Path Index 재구축 잡(job)은 별도 배선이 필요**하며, 이는 §14 Hierarchy Version 간 데이터 이행·§46 Retroactive 재계산과 **동일한 결번**이다. 설계 시 명시하라.
- **스키마 도입 제약**: 멱등 `CREATE TABLE IF NOT EXISTS` + `try{ALTER}catch{}`(`Db.php:1123-1127`·`CRM.php:109` 패턴) · **MySQL/SQLite 두 방언 동시 수기 작성 의무**(`CRM.php:48` vs `:77`). ⚠️변종 = PM 8테이블은 마이그레이션 + 런타임 자가치유 **병행**(`PM\Shared::ensurePmTables:37-53` → `Migrate::applyFiles`).
- **`computed_at`(#14) 명명은 `pm_baseline.captured_at`·`channel_category_catalog.synced_at` 계열을 따른다** — 신규 명명 축 도입 금지.

### 순회 (§19)

- ★🔴 **`PM/Dependencies::validateDependency`(`:79-100`) 재구현 금지 — 이 패턴을 확장하라.** **Tenant Filter**(`:91` 매 홉)와 **Cycle Protection**(`:86-88` + **쓰기 전 차단 422** `:32-34` + self-loop 422 `:29-31`)은 **실제로 충족**돼 있다(`VALIDATED_LEGACY`). **반복형 DFS**(재귀 아님 → 스택오버플로 없음)·**명시적 `$visited`** 를 그대로 계승하라.
- ★**쓰기 전 차단이 핵심이다.** `validateDependency` 는 **INSERT 이전에** 422 로 막는다(`:32-34` → `:37`). 반면 `journeys` 는 **런타임에만** 방문집합을 쓰고 작성자 JSON 을 무검증 통과시킨다(`JourneyBuilder.php:511-518` 자인) — 🔴 **journeys 방식 금지.** `graph_edge` 는 순환방어가 **아예 없다** — 🔴 **graph_edge 방식 금지.**
- **순환 시 응답 정책은 `PM/Gantt`(`:104-125`)를 따른다** — Kahn 위상정렬 + `count($topo)!==count($taskMap)` 정석 판정 + **500 이 아니라 부분결과+경고로 degrade**. 조회 경로에서 순환을 만났다고 전체를 500 으로 죽이지 마라(쓰기 경로는 반대로 422 차단).
- ⚠️ **미충족 4종을 신규 설계하라 — 기존이 커버한다고 착각 금지**:
  - **Maximum Depth**(#6) — `validateDependency:84` 의 `$depth<10000` 은 ★**깊이가 아니라 방문 노드 예산**(`$depth++` 가 pop 마다 `:97`). §20 Hierarchy Level 을 강제하려면 **경로 길이 축의 진짜 캡**이 필요하다. `AdminMenu:545`(`$depth<100`)·`elevenSt:959`(`$guard<10`)는 선형 체인이라 실제 깊이 캡이나 **분기 그래프에는 그대로 적용 불가**.
  - **Relationship Type Filter**(#4) — `dep_type` 은 존재하나 `validateDependency:90-91` 이 **술어에 넣지 않아** 전 타입 무차별 순회다. 조직 순회는 **`relationship_type` 을 술어에 반드시 포함**하라(§17 Hierarchy Type 별 Primary Parent 규칙이 이에 의존).
  - **Query Timeout**(#8) · **Result Limit**(#9) — **전례 0.** `validateDependency` 는 `$stack` 무제한 push(`:94-96`), `GraphScore` 는 `$paths[]` 무제한 누적(`:226`). 신규 설계 필수.
  - **Effective Date Filter**(#3) — **전역 0건.** 아래 참조.
- ★**Prefix 경계 가드는 사활적이다** — 레포에 **정답과 오답이 공존**한다:
  - ✅ `planMenuPolicy.js:293-295` `if (pathname === p || pathname.startsWith(p + "/"))` — 주석이 **명시**: *"경계 '/' 보장 — '/pm' 이 '/pmx' 를 매칭하지 않도록"*
  - 🔴 `frontend/src/auth/AuthContext.jsx:834` `allowedKeys.some(k => k === menuKey || menuKey.startsWith(k))` — **경계 구분자 가드 없음**(전 레포 유일 무가드)
  - ⚠️ **실제 오매칭 성립 조건 = `MENU_CATALOG` 26키(`TeamPermissions.php:55-82`) 중 한 키가 다른 키의 prefix 여야 함 — 미대조. "위험한 패턴"까지만 등재 · 결함 단정 보류.**
  - **→ Materialized Path 를 조합하면 반드시 `startsWith(p + 구분자)` 형태로 경계를 강제하라.**

### 시점 (§66 권장 #3~#6)

- 🔴 **Effective Date 없는 조직 관계 금지**(§65 `:2611`)이나, 레포에는 **as-of 조회 능력이 없다**: `WHERE effective_from <= :as_of` 술어 **backend/src 전역 0건** · `effective_to` **grep 0**. → **폐구간 + as-of 조회는 순수 신규 설계**다. **기존 `kr_fee_rule` 의 "최신승" 읽기 패턴(`ORDER BY effective_from DESC LIMIT 1`)을 복제하면 §18 `valid_from`/`valid_to` 가 무의미해진다.**
- ⚠️ **관찰 사실(등급 미부여)**: `Pnl.php:449` 가 기간(`$from`,`$to`)을 받고도 `:454` 는 기간을 무시해 **과거 기간 P&L 도 오늘자 최신 VAT율로 계산**된다. 단 주석(`:451`)이 *"테넌트 최신 kr_fee_rule(채널 무관 최신)"* 로 **의도를 명시**하므로 설계 선택일 수 있다 — **결함 단정 보류 · 라이브 확인 필요.** 본 문서에서는 **"as-of 조회 능력 부재"의 실증**으로만 인용한다.
- **Immutable Version(#3)**: `menu_defaults` 가 유일 선례이나 **immutable_hash 없음 · tenant 없음 · 최신 1건만 조회** → **`schema_migrations.checksum`(`Migrate.php:50`) 의 `hash('sha256',$sql)` 패턴과 조합**해야 불변성이 성립한다.
- 🔴 **과거 Version 을 UPDATE 하지 마라**(§65 `:2612`). `graph_edge` 의 UPDATE-in-place(`GraphScore.php:142`)는 **System Time 이 최초 생성시각에 고정**되는 반례다 — append 방식으로 설계하라.
