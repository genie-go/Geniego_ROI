# DSAR — Organization Graph Node (§15)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §15 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)
>
> 자매 문서: Node Role 축 = [DSAR_ORGANIZATION_GRAPH_NODE_ROLE.md](DSAR_ORGANIZATION_GRAPH_NODE_ROLE.md) · Edge = [DSAR_ORGANIZATION_GRAPH_EDGE.md](DSAR_ORGANIZATION_GRAPH_EDGE.md) · Path = [DSAR_ORGANIZATION_GRAPH_PATH.md](DSAR_ORGANIZATION_GRAPH_PATH.md)

## 0. 현행 실측 (file:line)

### ★ 핵심 — `graph_node` = §15 의 **구조적 쌍둥이가 이미 존재한다**

| 항목 | 실측 | 판정 |
|---|---|---|
| `graph_node` DDL | `Db.php:816-824` — `id INT AUTO_INCREMENT` · `tenant_id VARCHAR(100)` · `node_type VARCHAR(100)` · `node_id VARCHAR(255)` · `label VARCHAR(500)` · `meta_json MEDIUMTEXT` · `created_at VARCHAR(32)` | `KEEP_SEPARATE_WITH_REASON` |
| 배선 | `/v419/graph/*` **9라우트**(`routes.php:721-729`) — nodes upsert/list · edges upsert/list · score×4 · summary | REAL |
| 테넌트 격리 | `GraphScore::tenantId:33-40` — 미들웨어 주입 `auth_tenant` 우선(위조불가) · raw `X-Tenant-Id` 불신 자인(`:37`) · 미해결 시 `demo` | REAL(은행급 fail-closed) |
| upsert 방식 | **SELECT-then-upsert**(`GraphScore.php:70-79`) | ⚠️ 아래 |
| **전용 그래프 DB** | Neo4j·Cypher·Gremlin·Neptune·Arango·JanusGraph·TinkerPop **grep 0** | `ABSENT` → **도입 불필요** |

**→ 결론: Node/Edge 분리 · 타입드 노드 · `meta_json` 확장슬롯 · tenant 격리가 이미 관계형 스키마로 구현돼 있다. 전용 그래프 DB 도입은 두 번째 저장엔진 도입이며 정당화되지 않는다.**

### ★축 주의 — 구조가 닮았을 뿐 **도메인이 다르다**

`graph_node` 의 도메인은 **마케팅 귀속**(`GraphScore.php:15` docblock: `influencer → creative → sku → order`)이다. **조직이 아니다.**

- 🔴 **`node_type` 은 화이트리스트로 봉인돼 있다** — `GraphScore.php:57-58` `$allowed = ['influencer','creative','sku','order']`. 그 외 값은 **422**(`:59`). **조직 노드 타입은 현 코드로 저장 자체가 불가능하다.**
- 따라서 §15 커버로 계산하면 **역산**이다 → `KEEP_SEPARATE_WITH_REASON`. **단 §66 저장전략의 선례 가치는 레포 최상.**

### ⚠️ 인용 시 주의 — 실측된 약점 3건

| # | 실측 | 의미 |
|---|---|---|
| 1 | **내부 생산자 0** — `upsertNode`/`upsertEdge` 호출처 = 라우트뿐 · frontend 호출자 0 | **외부 POST 전용 유입** → **`VACUOUS` 가능성 미배제**(라이브 `SELECT COUNT(*) FROM graph_node` 미조회). 🔴 **"운영 중인 그래프"로 인용 금지.** |
| 2 | **`UNIQUE(tenant_id,node_type,node_id)` 없음** — 코드가 자인(`GraphScore.php:65-67` 주석: *"graph_node 에는 (tenant_id,node_type,node_id) UNIQUE 제약이 없어 SQLite·MySQL 모두 upsert 불가 → SELECT-then-upsert"*) | 원자적 upsert 불가 · **TOCTOU 중복행 여지**. §15 의 `organization_graph_node_id` 유일성 요구는 이 선례를 **그대로 복제하면 안 된다.** |
| 3 | **`graph_node` 에 인덱스 0** — `Db.php:838-839` 의 `self::idx()` 2개는 **`graph_edge` 전용**(src/dst 양방향). `graph_node` 조회(`:70` `WHERE tenant_id=? AND node_type=? AND node_id=?`)는 **풀스캔** | 양방향 인덱스 선례는 **Edge 에만** 있다. Node 축 인덱스는 신설 시 **선례 없이 직접 설계**해야 한다. |

### 인접 자산 (필드 축 대조용)

| 자산 | 실측 | 조직 해당 |
|---|---|---|
| `menu_tree.parent_id` + `idx_menu_tree_parent` | `AdminMenu.php:108-117`(MySQL)·`:134`(SQLite) | 🔴 **`tenant_id` 컬럼 없음(전역 단일 트리)** → 조직 아님. **선례로만.** ⚠️ `AdminMenuManager.jsx:252`/`:341` 이 "menu_tree 비어 있음"/"미등록" 분기를 갖는다 → **운영 0행 가능성 실재** |
| `app_user.parent_user_id` | `UserAuth.php:156-167`(nullable) | **전 생성 경로가 owner 직속 2단**(`:1226-1227`·`EnterpriseAuth.php:500`·`UserAuth.php:1574/1581`·`:670`) · 순회는 **단일 홉**(`resolveTenantId:200-217`). **3단 생성 경로 없음** → 조직 그래프 아님 |
| `TeamPermissions::ORG_PRESET` 15단위 | `TeamPermissions.php:706-722` · `seedOrg:725-753` · 배선 `routes.php:1589`·`:2570`·`teamApi.js:261` | ★**계층은 이름에만 있다** — `team` DDL(`:145-151`/`:168`)에 **`parent_team_id` 없음**. "마케팅 글로벌팀"→"마케팅팀" 구조링크 **0** → **"구조가 아니라 열거"** = `PARTIAL` |
| `is_leaf` | `channel_category_catalog`(`Catalog.php:200` MySQL DDL·`:209` SQLite·`KEY idx_ccc_leaf` `:203`·조회 `:297` `is_leaf=1`) | 채널 카테고리 **리프 평면 캐시** · `parent_id` 없음 → 트리 아님 |
| `is_root` | **backend/src grep 0** | `ABSENT` |
| `workspace_id`·`region_id`·`legal_entity_id` | **backend/src grep 0** | `ABSENT` |
| `country_code` | TikTok 리포트 **dimension**(`Connectors.php:2044`·`:2071`) · Geo `ipwho.is` 응답필드(`Geo.php:106`) | 무관 — 조직 국가 귀속 아님 |
| `depth` | ★**정정** — `ChannelSync.php:914` 의 `depth` 는 **11번가 API 응답 필드를 설명한 주석**이며 코드는 **읽지 않는다**. `elevenStCategoryCatalog:921-972` 반환 shape = `{code,name,whole,leaf}` — **depth 없음** | 🔴 규율 10 적중 — 주석을 필드 존재 근거로 삼지 마라 |
| `wms_bins.level` | `Wms.php:193-194` `zone/aisle/rack/level/slot` **고정깊이 평면 컬럼** | `level` = 물리 선반단 ≠ 트리 depth → `NAME_ONLY` |
| 시점/버전 | `menu_defaults(version)`(`AdminMenu.php:120`·`:139`) = **엔티티 version 유일 1건** · 전역 1행 · 최신 1건만 조회 · `kr_fee_rule.effective_from`(`Db.php:898`) = **전 코드베이스 유일 effective date** · **`effective_to` grep 0** | `valid_from`/`valid_to` 폐구간 = **신규** |

## 1. 원문 전사 + 판정 — **원문 19종**

`ORGANIZATION_GRAPH_NODE` 필수 필드.

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | organization_graph_node_id | `graph_node.id INT AUTO_INCREMENT`(`Db.php:817`) = 대리키 선례. **단 조직 도메인 아님 · UNIQUE 제약 부재**(`GraphScore.php:65-67`) | `KEEP_SEPARATE_WITH_REASON` |
| 2 | organization_hierarchy_version_id | 엔티티 version = `menu_defaults.version` **단 1건**(전역·최신 1건만) · `\bversion\b` 40건 전부 API/DB/벤더 버전 문자열 · optimistic lock version **grep 0** | `NOT_APPLICABLE` |
| 3 | organization_unit_id | `org_unit`·`organization_unit` **backend/src grep 0**(스펙 커밋 제외) · `git log --all -S "org_unit"` **0** | `NOT_APPLICABLE` |
| 4 | organization_unit_version_id | 상동 + version 부재(#2) | `NOT_APPLICABLE` |
| 5 | node role | `graph_node.node_type`(`Db.php:819`)은 **엔티티 종류**(influencer/creative/sku/order `GraphScore.php:57`)이지 그래프 내 **역할**이 아니다. → 축 전사는 [NODE_ROLE 문서](DSAR_ORGANIZATION_GRAPH_NODE_ROLE.md) | `NOT_APPLICABLE` |
| 6 | hierarchy level | `hierarch` **backend/src grep 0** · `wms_bins.level`(`Wms.php:193-194`)은 물리 선반단 | `NAME_ONLY` |
| 7 | depth | **저장 컬럼 0.** ★`ChannelSync.php:914` 의 depth 는 주석뿐(반환 shape `:964-969` 에 없음) · `menu_tree` 는 `$depth<100` **런타임 가드 변수**(`AdminMenu.php:545`)이지 컬럼 아님 | `NOT_APPLICABLE` |
| 8 | root 여부 | `is_root` **grep 0** · `parent_user_id IS NULL`(`PlanLimits.php:36-37`)·`COALESCE(parent_id,"")`(`AdminMenu.php:272`) = **NULL 관례로 root 표현** — 명시 플래그 없음 | `NOT_APPLICABLE` |
| 9 | leaf 여부 | `channel_category_catalog.is_leaf`(`Catalog.php:200`·`:209` · 인덱스 `:203`) + `elevenStCategoryCatalog` 반환 `leaf`(`ChannelSync.php:948`·`:968`) — **채널 카테고리 도메인** | `KEEP_SEPARATE_WITH_REASON` |
| 10 | primary node 여부 | `is_primary`/`primary_flag` **grep 0** · Primary Parent 개념(§17) 자체 부재 | `NOT_APPLICABLE` |
| 11 | legal entity id | `legal_entity_id` **grep 0** · `legal_entity` **grep 0** · 사업자정보는 `app_user` **프로필 평문 필드**(`business_number`·`ceo_name`·`country` — `UserAuth.php:499`·`:1720`) · `biz_no`/`brn`/`corp_reg`/`tax_id` **전부 0** → 법인 엔티티 없음. ★**테넌트 ≠ 법인**(`PlanLimits.php:36-37` — 테넌트 = 1 owner 계정의 구독 스코프) | `NOT_APPLICABLE` |
| 12 | business unit id | `business_unit` 유일 히트 = **Trustpilot 리뷰 API 자격증명 `business_unit_id`**(`ChannelSync.php:2573-2580`·`ChannelRegistry.php:126`) — **무관**. 🔴 이름 일치를 커버로 계산하면 역산 | `NAME_ONLY` |
| 13 | region id | `region_id` **grep 0** · `region` **3축 병존**(광고 인구통계 `Db.php:681`,`690` / Amazon Ads 엔드포인트 na·eu·fe `Connectors.php:2704-2710` / WMS 창고 시·도 `Wms.php:129`·`regionOf():284-286`) · `APAC`/`EMEA`/`AMERICAS`/`LATAM` **grep 0** · **parent region 컬럼 0** | `NOT_APPLICABLE` |
| 14 | country code | `country_code` 히트 = TikTok 리포트 dimension(`Connectors.php:2044`·`:2071`) · Geo IP 탐지(`Geo.php:106`) — 조직 국가귀속 아님. ★`Geo`(`Geo.php:23-53`)는 국가→**언어** 매핑이지 국가→**조직/지역** 아님 · **Country→Region 매핑 코드 0건** | `NAME_ONLY` |
| 15 | workspace id | `workspace_id` **grep 0** · `WorkspaceState.php` 는 UI 상태 저장(테넌트 스코프)이지 조직 workspace 엔티티 아님 | `NOT_APPLICABLE` |
| 16 | valid_from | `kr_fee_rule.effective_from`(`Db.php:898`) = **전 코드베이스 유일 effective date**(쓰기 `KrChannel.php:128-140`). ★단 **읽기가 전부 `ORDER BY effective_from DESC LIMIT 1` 최신승**(`Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`) — **`WHERE effective_from <= :as_of` 술어 backend/src 전역 0건** → 컬럼만 있고 **as-of 조회 능력 없음** | `PARTIAL`(컬럼 선례만) |
| 17 | valid_to | `valid_to`/`effective_to` **grep 0** → **폐구간 모델 순수 신규** | `NOT_APPLICABLE` |
| 18 | status | `graph_node` 에 `status` 컬럼 **없음**(`Db.php:816-824`) · 인접 = `agency_client_link.status`(pending/approved/revoked `AgencyPortal.php:64-72`)·`team.status` | `NOT_APPLICABLE` |
| 19 | **evidence** | 승인 증적 필드 부재 · 인접 선례 = `menu_audit_log.hash_chain CHAR(64)` SHA-256 prev-chain(`AdminMenu.php:128`·생성 `:182-197`·`lastHash():214-219`)(🔴 쓰기 체인만 실재·`verify()` 0·preimage `ts` `:195` 소실 → tamper-evident 아님; 검증형 정본 = `SecurityAudit::verify():56-68`)·`pm_audit_log`(tenant+entity+diff_json+3인덱스, migration `20260526_168_008`)·`schema_migrations.checksum`(`Migrate.php:50` `hash('sha256',$sql)`) | `LEGACY_ADAPTER`(해시체인 패턴 확장) |

**실측 개수: 19 / 19 전사.** 커버리지 = `VALIDATED_LEGACY` **0** · `KEEP_SEPARATE_WITH_REASON` 3 · `LEGACY_ADAPTER` 1 · `PARTIAL` 1 · `NAME_ONLY` 3 · `NOT_APPLICABLE` 11.

> 🔴 **커버 = 0.** `graph_node` 가 구조적 쌍둥이라는 사실은 **저장전략 선례**이지 **요구 충족이 아니다**(규율 9 — 능력 존재 ≠ 요구 충족).

## 2. 규칙

- ★**전용 그래프 DB 도입 금지.** Neo4j/Cypher/Gremlin/Neptune/Arango/JanusGraph/TinkerPop **grep 0** 이고, `graph_node`/`graph_edge` 가 **Node/Edge 분리 + 타입드 + tenant 격리 + 양방향 인덱스(Edge)** 를 관계형으로 이미 증명했다. 두 번째 저장엔진 도입 = 헌법 위반(중복 엔진).
- 🔴 **`graph_node` 를 조직 노드로 재사용 금지 — 확장도 금지.** 이유 ⓐ 도메인 = 마케팅 귀속(`GraphScore.php:15`) ⓑ `node_type` 이 4종 화이트리스트로 **봉인**(`:57-58` · 위반 422) ⓒ `organization_hierarchy_version_id`·`valid_from/to`·`status`·`evidence` 어느 것도 수용 불가 ⓓ 마케팅 스코어링(`SUM(edge_weight)`)과 조직 인가 경로가 같은 테이블을 공유하면 **오염**. → **패턴만 차용해 조직 전용 테이블 신설**(`KEEP_SEPARATE_WITH_REASON` 의 정확한 귀결).
- ★**`graph_node` 의 실패 3건을 복제하지 마라**: ⓐ **`UNIQUE(tenant_id, ...)` 를 반드시 걸어라** — `GraphScore.php:65-67` 이 UNIQUE 부재 때문에 SELECT-then-upsert 로 후퇴했다고 **코드가 자인**한다(209차에 MySQL 1064 500 유발). ⓑ **Node 축 인덱스를 빠뜨리지 마라** — `graph_node` 는 인덱스가 0이라 `:70` 룩업이 풀스캔이다. ⓒ **내부 생산자를 함께 배선하라** — 생산자 0이면 `VACUOUS` 다.
- 🔴 **`business_unit`(#12)·`country_code`(#14)·`level`(#6)·`region`(#13) 의 이름 일치를 커버로 계산 금지.** 전부 타 도메인(Trustpilot 자격증명 · TikTok dimension · WMS 물리 선반 · 광고 인구통계)이다 → `NAME_ONLY`.
- 🔴 **"테넌트 = 법인" 가정 금지**(#11). 테넌트는 **구독 단위**이며 마스터 테이블조차 없다(`api_key.tenant_id VARCHAR(100)` **FK 없음** `Db.php:944` · 발급 = `'acct_'.$id` 문자열 생성 `UserAuth.php:220-224`). `legal entity id` 를 tenant_id 로 대체하면 역산이다.
- 🔴 **★`DATA_SCOPES` 의 `'company'` 를 Legal Entity 로 읽지 마라** — `effectiveScope():258` `if ($st === 'company') return null; // 전사 = 무제한`. **법인 경계를 긋는 게 아니라 지운다.** 의미가 정반대다.
- **`evidence`(#19)는 "선례 없음→신설"이 아니다.** `menu_audit_log.hash_chain`(SHA-256 prev-chain 실구현) · `pm_audit_log`(tenant+diff_json) 패턴을 **확장**하라. 🔴 단 `menu_audit_log.hash_chain` 은 **쓰기 체인만 실재**하고 검증기(`verify()`)가 0이며 preimage `ts`(`:195`)가 INSERT 컬럼에서 소실돼 재계산 불가 → **tamper-evident 아님**(`:18` 주석은 근거 아님). 실제 재계산·prev_hash 교차검증이 도는 정본은 `SecurityAudit::verify():56-68` 이다. 🔴 **"레포에 해시체인 없음"은 전역 명제로 인용하면 오염** — 참인 것은 **전역 `audit_log` 4컬럼**(`Db.php:540-545`·`AdminGrowth.php:157-159`)에 한해서다.
- **스키마 도입 제약 3건**(§20): ⓐ `backend/migrations/` 는 **172차 정지**(최신 `20260527_172_002_coupon_tables.sql`) → 조직 스키마는 마이그레이션 파일로 들어갈 수 없다. **핸들러 self-healing `ensureTables`** 필수 ⓑ `ensureTables` 는 **생성만 하고 백필하지 않는다** ⓒ **MySQL/SQLite 두 방언 동시 수기 작성 의무**(`CRM.php:48` vs `:77`).
- ⚠️ **미확인 · 라이브 검증 권장**: `SELECT COUNT(*) FROM graph_node` / `graph_edge` — 0행이면 `/v419/graph/*` 9라우트는 전부 `VACUOUS` 이며 §66 의 "실동작 선례" 논거가 **선례에서 계약으로 강등**된다(패턴 차용 근거는 유지되나 "검증된 운영 패턴"으로는 인용 불가).
