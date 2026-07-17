# DSAR — 중복 구현 감사 (§65)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §65 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

### 0.1 🔴🔴 축 주의 — **"중복 없음"과 "기능 부재"를 엄격히 분리하라** (5-3-2 §72 교훈)

이 문서에서 가장 중요한 규율이다. 원문 §65 는 **"여러 X"** 형태로 중복을 묻는다. **조직 도메인에서는 거의 모든 항목이 "여러 개"가 아니라 "0개"다.**

> **5-3-2 가 가르친 것**: 승인 테이블 4개를 보고 "중복 4벌 → 통합"으로 읽으면 틀린다. 실제는 **1 REAL + 3 미달**이었고, **미달을 중복이라 부르면 통합 대상의 절반이 처음부터 존재하지 않던 기능이 되어, 통합 결과물이 자동으로 "기능 유지"로 위장된다.**
>
> **★조직 블록은 이 함정의 극단이다** — 조직 트리가 **0개**이므로 §65 표는 `CONSOLIDATION_REQUIRED` 가 거의 비게 된다. **그 공백을 "양호"로 읽으면 정반대의 오독이다.** 중복이 없는 이유는 잘 통합돼 있어서가 아니라 **기능이 없어서**다.

**따라서 이 표는 3 상태를 엄격히 분리한다.**

| 상태 | 의미 | 판정 |
|---|---|---|
| **진짜 중복** | 같은 능력이 2벌 이상 병존 → 통합 대상 | `CONSOLIDATION_REQUIRED` |
| **기능 부재** | 0개 → 신설 대상. **중복 없음 ≠ 양호** | `NOT_APPLICABLE` |
| **단일 정본** | 1개가 요구를 실제로 충족 → 확장 | `VALIDATED_LEGACY` |

### 0.2 ★저장 전략 지형 — **Adjacency List 단일 지배 · 품질 4등급**

| 구현 | 저장 | 순회 | 순환 방어 | 배선 |
|---|---|---|---|---|
| `pm_task_dependencies` | 엣지 리스트 · UNIQUE · 양방향 인덱스 | **반복 DFS + Kahn** | **쓰기 전 차단**(최상급) | REAL |
| `menu_tree` | Adjacency + `idx_menu_tree_parent` | 조상 walk(깊이캡 100) | 쓰기 전 차단 | 라우트 REAL / **`reorder` 프론트 호출자 0** |
| `graph_node`/`graph_edge` | Adjacency(타입드) · **edge 양방향 인덱스** | **하드코딩 3-hop**(범용 아님) | **없음** | 라우트 REAL / **내부 생산자 0** |
| `journeys.edges` | JSON 문서 | 단일 next(`:786`) | **런타임 방문집합만**(`:511-518` · 작성자 JSON 무검증 자인) | REAL |
| 라우트/메뉴키 | Materialized Path(**문자열**) | 최장 prefix | — | REAL |

**전례 0**: Closure Table · Materialized Path(**DB 컬럼**) · Nested Set · Graph DB 엔진 · `WITH RECURSIVE`/`CONNECT BY`.

### 0.3 🔴 신규 관찰 (미수정 · 별도 세션 · **등급 미부여 · 라이브 미검증**)

| ID | 관찰 | 실측 |
|---|---|---|
| **N-1** | **`graph_node` UNIQUE 부재로 `INSERT IGNORE` 중복제거가 무효** | `GraphScore.php:65-67` **주석이 자인**: *"graph_node 에는 (tenant_id,node_type,node_id) UNIQUE 제약이 없어 SQLite·MySQL 모두 upsert 불가 → SELECT-then-upsert(207차 정본)"*. `upsertNode:70-79` 는 그 우회를 쓴다. **그러나 `upsertEdge:126-133` 의 자동 노드 생성은 `INSERT IGNORE`/`INSERT OR IGNORE` 를 쓴다** — **유니크 제약이 없으면 IGNORE 는 무시할 충돌이 없다** → 엣지 upsert 마다 `graph_node` 행이 누적될 수 있다. **DDL 재확인(`Db.php:816-825`): `graph_node` 에 UNIQUE 도 INDEX 도 없다.** 코드 정합 근거는 확실하나 **런타임 행 중복은 라이브 미검증** |
| **N-2** | `AuthContext.jsx:834` **경계 구분자 없는 prefix 매칭** | `allowedKeys.some(k => k === menuKey \|\| menuKey.startsWith(k))` — 전 레포 유일 무가드(PM 직접 확인). **실제 오매칭 성립 조건 = `MENU_CATALOG` 26키(`TeamPermissions.php:55-82`) 중 한 키가 다른 키의 prefix 여야 함 — 미대조** → **"위험한 패턴"까지만 등재 · 결함 단정 보류** |

## 1. 원문 전사 + 판정 — **원문 28종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | 여러 Organization Registry | **중복 없음 — 레지스트리 0.** ★**기능 부재**(`hierarch`/`organization_unit` grep 0 · `git log --all -S "org_unit"` 0). 인접 1건 = `ORG_PRESET` 15단위(`TeamPermissions.php:706-722`) = **열거이지 레지스트리 아님** | `NOT_APPLICABLE`(**부재 → 신설**) |
| 2 | 여러 Organization Unit Table | **중복 없음 — 조직 단위 테이블 0.** 인접 1건 = `team`(`TeamPermissions.php:145-151`/`:168`) | `NOT_APPLICABLE` + `PARTIAL`(`team`) |
| 3 | 여러 Department Table | **중복 없음 — 0.** `department`/`division` grep **0**. 부서는 `ORG_PRESET` 의 **문자열 이름**으로만 존재 | `NOT_APPLICABLE` |
| 4 | 여러 Team Table | ★**중복 없음 — `team` 1개(단일 정본).** 실배선 REAL(`routes.php:1589`+`$register :2565-2570`+`teamApi.js:261`) · `team_type` 17종(`TEAM_TYPES:44-49`) · `manager_user_id` | `VALIDATED_LEGACY`(단일 · **확장 대상**) — 🔴 **두 번째 Team 테이블 신설 금지** |
| 5 | 여러 Business Unit Table | **중복 없음 — 0.** 유일 히트 `business_unit_id` = **Trustpilot 리뷰 API 자격증명**(`ChannelSync.php:2573-2580`·`ChannelRegistry.php:126`) — **무관 · 재플래그 금지** | `NOT_APPLICABLE` |
| 6 | 여러 Legal Entity Mapping | **중복 없음 — 법인 엔티티 자체가 0.** 사업자정보 = `app_user` **프로필 평문 필드**(`business_number`·`ceo_name`·`country` — `UserAuth.php:499`·`:1720`) · `biz_no`/`brn`/`corp_reg`/`tax_id` **전부 0** · `company_id` 2건 = **Adobe Analytics 커넥터 자격증명**(`Connectors.php:3880`·`ChannelRegistry.php:115`) | `NOT_APPLICABLE` |
| 7 | 여러 Organization Tree | **중복 없음 — 조직 트리 0.** ★**단 트리 구현은 5벌 병존**(§0.2) — **전부 비조직 도메인**: PM 의존성 · 메뉴 · 마케팅 그래프 · 여정 JSON · 라우트 문자열 경로. 🔴 **이들을 "여러 Organization Tree" 로 계상하면 역산** | `NOT_APPLICABLE`(조직) + `KEEP_SEPARATE_WITH_REASON`(5벌) |
| 8 | 여러 Parent ID 모델 | ★**진짜 다수 — parent 컬럼 3벌 병존 · 의미 전부 상이**: ⓐ `app_user.parent_user_id`(`UserAuth.php:156-167` · **nullable** · **owner 직속 2단 봉인** · 순회 단일 홉 `resolveTenantId:200-217`) ⓑ `menu_tree.parent_id`(`AdminMenu.php:108` · **tenant 없음** · 조상 walk `wouldCycle:540-555`) ⓒ `pm_task_dependencies.predecessor_id`(엣지 리스트 · **컬럼형 parent 아닌 관계형**). **공통 부모 모델·공통 순회 계약 0** | `CONSOLIDATION_REQUIRED`(**계약 수준** — 🔴 **3벌 물리 통합 금지**: 도메인·격리축이 다르다. 통합 대상은 **순회/가드 계약**이지 테이블이 아니다) |
| 9 | 여러 Closure Table | **중복 없음 — 0.** `closure`/`ancestor`/`descendant`/`graph_path` grep **0**. ★**전례 0 = §18/§66 요구는 순수 신규** | `NOT_APPLICABLE`(**순수 신규**) |
| 10 | 여러 Materialized Path | ★**애매 — DB 컬럼은 0 · 문자열 경로는 2벌 + 파생 1벌**: DB 컬럼(`full_path`/`path_str`/`tree_path`/`idpath`) **0**. 문자열 경로 = 라우트/메뉴키(최장 prefix 매칭). 파생 선례 = `ChannelSync::elevenStCategoryCatalog:911-971`(**1패스 `dispNo→[name,parent,leaf]` XMLReader 스트리밍 맵 `:919`(15,000노드 OOM 회피) → 2패스 parent 체인 역주행으로 `whole`("대 > 중 > 소 > 세") 구성 `:918` · `depth` `:914` · 순환·과깊이 가드 `guard<10` `:954-963`**). ⚠️ **충돌 해소**: `Catalog.php` 의 `channel_category_catalog` 는 **별개** — `whole_name` 이 경로처럼 보이나 **`LIKE '%term%'` 중위 검색**(`:299`) · `parent_id` **없음** · `is_leaf=1` 만 노출(`:296-297`) = **리프 평면 캐시 · 트리 아님** | `NOT_APPLICABLE`(DB 컬럼) + `VALIDATED_LEGACY`(`ChannelSync` 파생 패턴) — 🔴 **`Catalog` 를 Materialized Path 선례로 인용 금지** |
| 11 | 여러 Graph Database Mapping | **중복 없음 — 전용 그래프 DB 0.** Neo4j/Cypher/Gremlin/Neptune/Arango/JanusGraph/TinkerPop **grep 0**. ★**내장 그래프 1벌 REAL**(`graph_node`/`graph_edge` `Db.php:816-839` · 9라우트 `routes.php:721-729`+`$register :2306-2314`) → **전용 그래프 DB 도입 불필요** | `KEEP_SEPARATE_WITH_REASON`(마케팅 귀속) — 🔴 **그래프 DB 신설 금지** |
| 12 | 여러 Cost Center Mapping | **중복 없음 — 0.** `cost_center` grep **0** | `NOT_APPLICABLE` |
| 13 | 여러 Profit Center Mapping | **중복 없음 — 0.** `profit_center` grep **0**. 인접 = `pnl_vat_summary` tenant 키(`Pnl.php:402-423`) = **구독자별 리포트이지 법인 회계 아님** | `NOT_APPLICABLE` |
| 14 | 여러 Region·Country Tree | ★**진짜 다수 — `region` 3축 병존 · 전부 트리 아님 · 전부 의미 상이**: ⓐ 광고 오디언스 인구통계(`Db.php:681`,`:690`) ⓑ **Amazon Ads API 엔드포인트 na·eu·fe**(`Connectors.php:2704-2710`) ⓒ **WMS 창고 시·도**(`Wms.php:129`·`regionOf():284-286`). **`APAC`/`EMEA`/`AMERICAS`/`LATAM` grep 0** · **parent region 컬럼 0** · **Country↔Region binding 0**. `Geo` 는 **IP→ISO alpha-2 → 언어** 매핑(`Geo.php:23-53` · `SUPPORTED` 15언어 `:21` · ★**`:19` 는 `class Geo {` 줄**) — **Country→Region 매핑 코드 0건** | `CONSOLIDATION_REQUIRED`(**명명 충돌 — 신설 시 `region` 어휘를 반드시 한정**) + `NOT_APPLICABLE`(Tree) |
| 15 | 여러 Brand Organization 모델 | **중복 없음 — 1개 · 조직 아님.** `catalog_brand`(`Catalog.php:151-169`) = `tenant_id·name·code` · `UNIQUE(tenant_id,name)` · CRUD `:443-465` · `ensureBrand():427`. **목적 = 11번가 상품등록 필수 브랜드코드**(`BRAND_REQUIRED_CHANNELS=['11st','st11']` `:415`) = **상품속성**. **§79 "Brand 소유와 운영 조직 구분" 의 두 축이 모두 부재** | `KEEP_SEPARATE_WITH_REASON` — 🔴 **`catalog_brand` 를 Brand 조직으로 계산 금지** |
| 16 | 여러 Merchant Organization 모델 | **중복 없음 — 조직 모델 0 · KV 산포 실재.** `commerce_product_daily.store_id` **자유문자열**(`Insights.php:114`·dedup `:125`) · `shop_id`(Shopee `ChannelSync.php:1799`)·`seller_id`(Yahoo `:1956`·Qoo10 `:1922`·ESM `:2298`)·`vendor_id`(쿠팡 `Connectors.php:1263`·`ChannelSync.php:631`) = 전부 **`channel_credential` KV 값**(`Db.php:976-982` tenant+channel+key_name/value). `merchant_promotion`(`Promotion.php:51-60`)은 **`merchant_id` 컬럼조차 없다**(접두어일 뿐) | `KV_ONLY` + `NAME_ONLY`(`merchant_promotion`) — **엔티티화는 신규** |
| 17 | 여러 Vendor·Partner Hierarchy | **중복 없음 — 계층 0 · 평면 2벌 병존**: `wms_suppliers`(`Wms.php:105` · SSOT 선언 `SupplyChain.php:243` · `sc_suppliers.wms_id` 링크 `:88`) = 외부 거래처 마스터(tenant_id·name·contact·active) **평면·parent 없음** → Vendor `PARTIAL`(vendor type·legal entity relationship·contract·country scope·approval hierarchy·valid_from/to·evidence **부재**) · `partner_account`(`PartnerPortal.php:52-59` — tenant_id·partner_type·partner_id·partner_name·전용세션 `:60`·스코프 필수검증 `:97-100`·플랜한도 `:104-110`) `TYPES=['supplier','logistics','warehouse']`(`:29`) ↔ §36 `PARTNERSHIP_TYPE` 12종(STRATEGIC/RESELLER/DISTRIBUTOR/…) **교집합 0** | `PARTIAL`(`wms_suppliers`) + `KEEP_SEPARATE_WITH_REASON`(`partner_account`) — 🔴 **`wms_suppliers` SSOT 선언 존중 · 세 번째 벤더 마스터 신설 금지** |
| 18 | 여러 Position Unit 모델 | **중복 없음 — 0.** `position_unit` grep **0** · `reports_to` **0** · `manager_id` **0**. 인접 = `team.manager_user_id`(`:145-151`) = **팀 1개의 담당자 포인터**이지 직위 단위 아님 | `NOT_APPLICABLE` |
| 19 | 여러 Organization Membership | ★**진짜 다수 — 멤버십 3벌 병존 · 전부 effective date 없음**: ⓐ `team_member`(팀↔사용자) ⓑ `app_user.parent_user_id`(owner↔member · **2단 봉인**) ⓒ `agency_client_link`(`AgencyPortal.php:64-72` — agency↔client_tenant **N:M** · `status`(pending/approved/revoked) · `scope_json` · `invited_at`/`approved_at`/`revoked_at` · `UNIQUE(agency_id, client_tenant_id)` · 양방향 인덱스 `:71`). ★**시점 축은 ⓒ만 보유**(invited/approved/revoked_at) 하나 **as-of 조회는 없다** | `CONSOLIDATION_REQUIRED`(**계약 수준**) — 🔴 **물리 통합 금지**: ⓒ는 **이분·크로스테넌트·동의 기반**으로 축이 다르다 |
| 20 | HRIS·ERP·IdP별 독립 Organization ID | **중복 없음 — IdP 1개 · HRIS·ERP 0.** ★**IdP = `EnterpriseAuth` 단일 정본 REAL**(OIDC/SAML/SCIM 2.0 · `routes.php:915-932`+`$register :2383-2400`). ★**HRIS·ERP 부재의 능력축 증명**: `ChannelRegistry.php:12`,`:79` `group_type` = sales/marketing/logistics/pg/messaging · `sync_kind` = commerce/ad/messaging/none + 증설 analytics(`:112`)·cs(`:116`)·esp(`:121`)·review(`:125`) → **`erp`·`finance`·`hr` 값이 열거에 없다**. 헌법 Vol2(`DATA_SOURCE_ARCHITECTURE_CONSTITUTION.md:71`)가 ERP 를 12분류로 정의하나 **이름만 있고 커넥터·수집·정규화 어느 층도 없다** · `backend/migrations/` 전량 grep 0 | `VALIDATED_LEGACY`(IdP — 🔴 **커넥터 신설 = 두 번째 엔진 = 헌법 위반**) + `NOT_APPLICABLE`(HRIS·ERP) |
| 21 | 이름 기반 Organization Mapping | 🔴🔴 **★전면 실재 — 이것이 현행 지배 패턴이다.** ⓐ **SSO 그룹이 엔티티가 아니라 평문 문자열**: `sso_group_role_map(tenant_id, group_name, role)`(`EnterpriseAuth.php:70`·`:72`) · 해석 `roleForGroups:78-85` · 어설션 `groups` 수신 `:374` → **`group_name IN (?)` 단순 룩업**(`:84`) · **부모-자식·중첩그룹·그룹ID 없음** — **수신하되 저장하지 않고 롤 1개로 즉시 소모** ⓑ **`seedOrg` 멱등키가 이름**(`:725-753` — 동명 skip) ⓒ `catalog_brand` `UNIQUE(tenant_id,name)` ⓓ `ORG_PRESET` 계층이 **이름에만** 존재("마케팅 글로벌팀" ⊂ "마케팅팀" 구조 링크 0) | `CONSOLIDATION_REQUIRED` — ★**§65 에서 유일하게 "여러 개"가 아니라 "전면"인 항목** |
| 22 | Approval 모듈 내부의 별도 Organization Tree | **중복 없음 — 0.** 승인 도메인(5-3-2 정본: `mapping_change_request` REAL · `action_request` VACUOUS · `admin_growth_approval` tenant 미격리 · `catalog_writeback_approval` 고아) **어디에도 조직 트리가 없다**. 승인자 결정은 **정족수 카운트**(`Mapping.php:287`)이지 조직 경로 해석이 아니다 | `NOT_APPLICABLE` — 🔴 **§79 "Approval Routing Eligible Path" 의 전제가 현재 없다** |
| 23 | Role 모듈 내부의 별도 Department Tree | **중복 없음 — 0 · 단 역할축 2벌 병존(미연결)**: ⓐ `team_role`(owner>manager>member `TeamPermissions.php:17`) = **사람 역할축** ⓑ `api_key` `$roleRank = ['viewer'=>0,'connector'=>1,'analyst'=>2,'admin'=>3]`(`index.php:554`) = **기계 신원 API 등급**(★`connector` 가 결정적 — 조직에 "커넥터" 직위는 없다 · 유일 의미 = ingest 쓰기 허용 `:571-574` · 판정 축이 **HTTP 메서드** `:568`). **두 축 사이 매핑 코드 0** — `effectiveScope():245-246` 은 `team_role` 만 읽고 `auth_role` 을 읽지 않는다. **부서 트리는 어느 쪽에도 없다** | `NOT_APPLICABLE`(Department Tree) + `KEEP_SEPARATE_WITH_REASON`(역할 2축) |
| 24 | Finance 모듈 내부의 별도 Legal Entity Tree | **중복 없음 — 0.** Finance 는 **테넌트 키로 집계**한다(`pnl_vat_summary` `Pnl.php:402-423`) — **법인 축 자체가 없다** | `NOT_APPLICABLE` |
| 25 | Current Parent만 저장하고 History를 잃는 구현 | 🔴🔴 **★전면 실재 — 현행 parent 3벌 전부가 이것이다.** `app_user.parent_user_id` · `menu_tree.parent_id` · `pm_task_dependencies` — **셋 다 현재 상태만 보유 · 이력 테이블 0 · 이전 parent 조회 불가**. `menu_defaults`(`AdminMenu.php:120`) 만이 유일한 "버전 붙은 스냅샷"이나 **immutable_hash 없음 · 전역 1행(tenant 없음) · 최신 1건만 조회**(`:584-590`) | `BLOCKED_HISTORICAL_INTEGRITY_RISK` — **신설 전 필수 해결** |
| 26 | Effective Date 없는 조직 관계 | 🔴🔴 **★전면 실재 — 조직 관계 전부가 이것이다.** ★**`kr_fee_rule.effective_from`(`Db.php:898`) = 전 코드베이스 유일 effective date**(쓰기 `KrChannel.php:128-140`) — **조직에는 0**. **`effective_to` 없음**(`valid_to\|effective_to` grep 0) → **폐구간 모델은 신규**. ⚠️ **정정**: `plan_period_pricing.period_months`(`20260527_171_003:21-34`)는 **구독 기간(1/3/6/12개월 상품 옵션)** 이지 유효기간 아님 · effective date 없음 · `updated_at` 덮어쓰기 = **현재상태 전용** → **§44 선례 아님** | `NOT_APPLICABLE`(**순수 신규**) |
| 27 | 과거 Version을 Update하는 구현 | ★**애매 — 판정 불가에 가깝다.** ⓐ **엔티티 version 축이 `menu_defaults.version` 단 1건**이므로 "과거 버전"이 존재하는 곳이 사실상 없다(`\bversion\b` 40건 전부 API 버전 문자열·DB 버전·벤더 헤더 · **optimistic lock `version` grep 0** — 5-3-2 확정 재실증 · `crm_segments` version/snapshot/evaluated_at 전무 `CRM.php:64-70`) ⓑ **다만 구조적 등가물 실재**: `kr_fee_rule` 은 새 `effective_from` 행을 추가하나 **읽기가 전부 최신승**(`Pnl.php:454`·`KrChannel.php:102`·`:151`·`:459`)이므로 **과거 행이 조회 불가 = 실질적으로 덮어쓴 것과 동일**. 🔴 **`WHERE effective_from <= :as_of` 술어 = backend/src 전역 0건**(PM 직접 검증) → `Pnl.php:449` 가 기간을 받고도 `:454` 는 무시 → **과거 기간 P&L 도 오늘자 최신 VAT율로 계산**. **단 주석 `:451` 이 *"테넌트 최신 kr_fee_rule(채널 무관 최신)"* 로 의도 명시 → 설계 선택일 수 있음 · 등급 미부여 · 관찰 사실로만 등재**(라이브 확인 필요) | `UNVERIFIED` — **관찰 사실 등재 · 등급 미부여** |
| 28 | Graph Path와 Edge가 별도 Source of Truth인 구현 | **중복 없음 — Path 스토어 0** → 이중 SoT 표면 자체가 없다. ★**현행은 정반대 극단**: `GraphScore::scoreInfluencer:187-240` 이 **사전계산 경로 테이블 없이 하드코딩 3-hop 을 런타임 전개**하며 **hop3∈hop2∈hop1 N+1**(`:207-219`) — 285차 "루프 내 N+1=즉시장애" 트랩의 **DB판**. ★**Path Index 도입 시 이 항목이 즉시 실위험이 된다**(Edge 가 SoT · Path 는 파생 캐시임을 계약에 못박아야 함) | `NOT_APPLICABLE`(현재) — 🔴 **§66 도입 즉시 활성 위험** |

**실측 개수: 28 / 28 전사.** 원문 개수와 전사 개수 **일치**.

**커버리지**: **진짜 중복(`CONSOLIDATION_REQUIRED`) 5** — Parent ID 3벌(#8) · Region 3축(#14) · Membership 3벌(#19) · **이름 기반 매핑 전면(#21)** · Current-Parent-only 전면(#25 → `BLOCKED_*` 로 승격) · **기능 부재(`NOT_APPLICABLE`) 15** · `VALIDATED_LEGACY` 4(`team`·`ChannelSync` 경로 파생·IdP·— ) · `KEEP_SEPARATE_WITH_REASON` 6 · `BLOCKED_HISTORICAL_INTEGRITY_RISK` 1 · `UNVERIFIED` 1 · `KV_ONLY`/`NAME_ONLY`/`PARTIAL` 부수 배정.

🔴 **이 표에서 `NOT_APPLICABLE` 15건은 "양호 15건"이 아니다. "기능 부재 15건"이다.**

## 2. 규칙

- 🔴🔴 **"중복 없음"을 "양호"로 읽지 마라 — 15/28 이 기능 부재다.** 5-3-2 §72 교훈의 정면 적용: **미달·부재를 중복이라 부르면 통합 결과가 자동으로 "기능 유지"로 위장된다.** 이 표의 판정은 `NOT_APPLICABLE`(부재→신설) 과 `CONSOLIDATION_REQUIRED`(진짜 중복) 을 **엄격히 분리**했다. 완료 보고 시 이 둘을 합산하지 마라.
- 🔴 **신설 시 중복이 되는 대상 10종 — 전부 확장하라, 신설하지 마라.**

  | 신설하려는 것 | **이미 있는 정본** | file:line |
  |---|---|---|
  | 그래프 스토어 | `graph_node`/`graph_edge` | `Db.php:816-839` |
  | 순환 검출 | `PM/Dependencies::validateDependency` | `PM/Dependencies.php:79-100` |
  | 위상 정렬 | `PM/Gantt` (Kahn) | `PM/Gantt.php:104-125` |
  | 트리(인접리스트+조상 walk) | `menu_tree`·`wouldCycle` | `AdminMenu.php:108-117`·`:540-555` |
  | IdP 커넥터 | `EnterpriseAuth` | `routes.php:915-932`·`$register :2383-2400` |
  | 스코프 바인딩 | `data_scope` + `agency_client_link` | `TeamPermissions.php:160-166`·`AgencyPortal.php:64-72` |
  | 에러 봉투 | `AdminGrowth::fail` | `AdminGrowth.php:181-186` |
  | 감사 해시체인 | `menu_audit_log.hash_chain` | `AdminMenu.php:128`·`:182-197`·`:214-219` |
  | 스냅샷 | `menu_defaults` / `pm_baseline` | `AdminMenu.php:120`·`PM\Enterprise.php:55`,`:360-364` |
  | `immutable_hash` | `schema_migrations.checksum` | `Migrate.php:50`·`:63-64`·`:145`/`:151` |

- 🔴 **`CONSOLIDATION_REQUIRED` 5건 중 물리 통합 대상은 0 이다.** #8(Parent 3벌)·#14(Region 3축)·#19(Membership 3벌)은 **도메인·격리축·기수(cardinality)가 전부 다르다.** 통합 대상은 **계약**이다 — 공통 순회 계약(반복 DFS+visited+tenant 필터+깊이캡), 공통 어휘 한정(`region` 3축 명명 분리), 공통 시점 계약(effective_from/to). **테이블을 합치면 무후퇴 붕괴다.**
- 🔴 **#21(이름 기반 매핑) 이 §65 에서 가장 큰 실재 결함이다.** SSO 그룹이 **평문 문자열로 즉시 소모**(`EnterpriseAuth.php:70-85`·`:374`)되고, `seedOrg` 멱등키가 **이름**(`:725-753`)이며, `ORG_PRESET` 계층이 **이름에만** 있다. **조직 ID 축을 신설하되 `EnterpriseAuth` 의 그룹 수신 경로를 확장해 흡수하라 — 두 번째 IdP 경로 금지.**
- 🔴 **#28 은 지금 안전하고 §66 도입 즉시 위험해진다.** Path 스토어가 0 이라 이중 SoT 가 없을 뿐이다. **Path Index 도입 시 "Edge = SoT · Path = 파생(재구축 가능)" 을 계약에 못박아라.** 동시에 `GraphScore.php:207-219` N+1 이 Path Index 도입의 **정당화 근거**임을 잊지 마라 — 285차 "루프 내 외부/DB N+1 = 즉시장애" 의 DB판이다.
- 🔴 **재귀 CTE 도입 금지 권고.** 엔진은 가능하다(MySQL 8.0.37 · SQLite 3.8.3+ — ⚠️**라이브 SQLite 버전 미실측 → 추론이다. 사실로 인용 금지**). 그러나 ⓐ `WITH RECURSIVE` **backend/src 0** ⓑ `Db::sql()`(`Db.php:177-191`)은 **DDL 전용 번역기**(AUTO_INCREMENT/TINYINT/DOUBLE/COMMENT 치환)로 **SELECT·CTE 미지원** ⓒ **트리 5개 전부 애플리케이션 계층 순회 택함**(이식성). **`Dependencies::validateDependency` 패턴 확장이 무후퇴·최저위험**이며, 재귀 CTE 는 **두 번째 순회 방식 도입**이 되어 정합 부담을 진다.
- 🔴 **`Catalog.php` 의 `channel_category_catalog` 를 트리·Materialized Path 선례로 인용 금지.** `whole_name` 이 경로처럼 보이나 **`LIKE '%term%'` 중위 검색**(`:299`) · `parent_id` 없음 · `is_leaf=1` 만 노출(`:296-297`) = **리프 평면 캐시**. 선례는 **`ChannelSync::elevenStCategoryCatalog:911-971`** 쪽이다.
- 🔴 **`wms_suppliers` SSOT 선언(`SupplyChain.php:243`) 존중 — 세 번째 벤더 마스터 신설 금지.** Vendor 계층은 `wms_suppliers` 확장이다.
- **오탐 재플래그 금지**: `business_unit_id`(Trustpilot) · `company_id`(Adobe Analytics) · `quota`(AI 한도) · `po_*`(Price Optimization) · `wms_bins` `zone/aisle/rack/level/slot`(**고정깊이 평면 컬럼** `Wms.php:193-194`) · `region` 3축(전부 정상 설계) · `Geo.php:19`(**`class Geo {` 줄** — 실체 `:23-53`) · `st11 seller_id` 실사용(288차 오탐 기각).
- **미확정 2건 — 단정 금지**: **N-1**(`graph_node` UNIQUE 부재 → `upsertEdge:126-133` INSERT IGNORE 무효 가능성 · **라이브 행 중복 미검증**) · **N-2**(`AuthContext.jsx:834` 무가드 prefix — **`MENU_CATALOG` 26키 `TeamPermissions.php:55-82` 대조 전까지 결함 단정 보류** · 대조는 §53 Prefix Validation 문서 담당).
