# DSAR — Organization Relationship Type (§11)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §11 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `ORGANIZATION_RELATIONSHIP_TYPE` | `relationship_type`/`relationship_code` **backend/src grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| **관계 타입 실재 후보 ①** | ★`agency_client_link`(AgencyPortal.php:64-72 MySQL/:80 SQLite): `agency_id ↔ client_tenant_id` · `status`(pending/approved/revoked) · `scope_json` · `invited_at`/`approved_at`/`revoked_at` · **`UNIQUE(agency_id, client_tenant_id)`** · 양방향 인덱스(:71) — **위임·N:M·이분** | `KEEP_SEPARATE_WITH_REASON` |
| **관계 타입 실재 후보 ②** | ★`pm_task_dependencies.dep_type` **`ENUM('FS','SS','FF','SF')`**(migration `20260526_168_004:9` · PM/Dependencies.php:24·:39 · PM/Gantt.php:20 주석 *"dep_type semantics (lag = days…)"*) — **작업 일정 의존** | `KEEP_SEPARATE_WITH_REASON` |
| ★**핵심 판정** | **둘 다 조직↔조직이 아니다.** ①은 **대행사 realm ↔ 테넌트**(이분) · ②는 **작업 ↔ 작업**. 원문 32 Relationship Type 중 **조직↔조직 간선은 0** | **`VALIDATED_LEGACY` 0** |
| 타입드 간선 인프라 | ★`graph_node`/`graph_edge`(Db.php:816-839): `tenant_id` · `node_type`+`node_id` · `src_type`/`src_id`→`dst_type`/`dst_id` · `edge_weight` · `edge_label` · `meta_json` · **src/dst 양방향 인덱스**(:838-839) · `/v419/graph/*` **9라우트 실배선**(routes.php:721-729) | `KEEP_SEPARATE_WITH_REASON`(**선례 가치 최상**) |
| ↑ ⚠️ | **도메인 = 마케팅 귀속**(influencer→creative→sku→order) · **내부 생산자 0**(`upsertNode`/`upsertEdge` 호출처 = 핸들러·라우트뿐 · frontend 0 → **외부 POST 전용 유입** · **VACUOUS 가능성 미배제**) · **순환 방어 없음** | **조직 커버 계산 금지** |
| 저장 전략 | **레포는 Adjacency List 단일 지배.** Closure Table(`closure`/`ancestor`/`descendant`/`graph_path`) **0** · Nested Set(`lft`/`rgt`) **0** · Materialized Path **컬럼**(`full_path`/`path_str`/`tree_path`/`idpath`) **0** · Graph DB 엔진(Neo4j/Cypher/Gremlin/Neptune/Arango/JanusGraph/TinkerPop) **0** · `WITH RECURSIVE`/`CONNECT BY` backend/src **0** | **§11 관계 테이블 = 순수 신규** |

**★규율 8 최대 적중 지점 — `agency_client_link` 를 조직 관계로 계산하면 4중 역산이다.** ⓐ **이분(bipartite)** — `agency_account`(:56-63)는 **테넌트가 아니라 별도 인증 realm**(자체 login/session :73 · 잠금 :179 · 화이트라벨 `brand_json`) ⓑ **N:M · 1홉 전용**(순회·이행성·깊이 0) ⓒ **조직↔조직 엣지 아님** ⓓ **동의 기반 접근 허가**이지 소유·포함 관계 아님. 형태(엣지·타입·상태·시점 3종)가 원문과 가장 닮았기에 **가장 위험하다**.

**★단 `agency_client_link` 는 §11 의 3개 필드에 대해 레포 유일 실선례**다(아래 표 `directional`·`cross tenant allowed`·`effective dating required`). **커버가 아니라 패턴 정본**으로 인용하라.

## 1. 원문 전사 + 판정 — Relationship Type **원문 32종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | PARENT_OF | 부재 — ★`team` DDL 에 `parent_team_id` **없음**(TeamPermissions.php:145-151/:168) · 레포 유일 부모-자식 간선 `app_user.parent_user_id`(UserAuth.php:156-167)는 **사용자 계정 축 · 깊이 2 봉인 · 비재귀**(:200-217) | `NOT_APPLICABLE` |
| 2 | CHILD_OF | 부재 — 역방향 간선 개념 0 | `NOT_APPLICABLE` |
| 3 | REPORTS_THROUGH | 부재 — ★`reports_to` **grep 0** · `manager_id` **grep 0** | `NOT_APPLICABLE` |
| 4 | FUNCTIONALLY_ALIGNED_TO | 부재 — `matrix_` grep 0 · 기능 정렬축 0 | `NOT_APPLICABLE` |
| 5 | ADMINISTRATIVELY_ALIGNED_TO | 부재 — grep 0 | `NOT_APPLICABLE` |
| 6 | FINANCIALLY_OWNED_BY | 부재 — `cost_center`/`profit_center` grep 0 · ★`pnl_vat_summary` tenant 키(Pnl.php:402-423)는 **법인 회계가 아니라 구독자별 리포트** | `NOT_APPLICABLE` |
| 7 | LEGALLY_OWNED_BY | 부재 — **법인 엔티티 자체가 없다**(`legal_entity` grep 0 · `biz_no`/`brn`/`corp_reg`/`tax_id` **전부 0건**) | `NOT_APPLICABLE` |
| 8 | OPERATED_BY | 부재 — grep 0 | `NOT_APPLICABLE` |
| 9 | MANAGED_BY | 부재(조직↔조직) · 인접 `team.manager_user_id INT NULL`(:148) = **팀→사용자 포인터**(조직↔사람 · 관계 타입 아님 · ★`seedOrg:739` 미기입으로 시드 15행 NULL) | `PARTIAL` |
| 10 | SUPPORTED_BY | 부재 — grep 0 | `NOT_APPLICABLE` |
| 11 | SHARED_SERVICE_FOR | 부재 — `shared_service` grep 0 | `NOT_APPLICABLE` |
| 12 | LOCATED_IN | 부재 — `wms_bins` 의 `zone/aisle/rack/level/slot`(Wms.php:193-194)은 **고정깊이 평면 컬럼**(`parent_id`·순회 없음 · `level`=물리 선반단 ≠ 트리 depth) → 위치 관계 아님 | `NOT_APPLICABLE` |
| 13 | BELONGS_TO_REGION | 부재 — `region` **3축 병존**(Db.php:681,690 / Connectors.php:2704-2710 / Wms.php:129·`regionOf()` :284-286) · **`APAC`/`EMEA`/`AMERICAS`/`LATAM` grep 0** · **parent region 컬럼 0** · **Country↔Region binding 0** | `NOT_APPLICABLE` |
| 14 | BELONGS_TO_COUNTRY | 부재 — ★`Geo`(Geo.php:23-53 `lang()` · IP :56-60 · `SUPPORTED` 15언어 :21)는 국가→**언어** 매핑이지 국가→**조직/지역** 아님 · ★**Country→Region 매핑 코드 0건** | `NOT_APPLICABLE` |
| 15 | BRAND_OWNED_BY | 부재 — `catalog_brand`(Catalog.php:151-169)는 `tenant_id·name·code` 뿐 · **소유 관계 컬럼 0** · 목적 = **11번가 상품등록 브랜드코드**(:415) | `NOT_APPLICABLE` |
| 16 | STORE_OPERATED_BY | 부재 — `store_id` 는 **자유문자열**(Insights.php:114 · dedup :125) · `shop_id`(Shopee ChannelSync.php:1799) = **자격증명 KV**(Db.php:976-982) → 엔티티가 없으니 관계도 없음 | `NOT_APPLICABLE` |
| 17 | MERCHANT_MANAGED_BY | 부재 — ★`merchant_promotion`(Promotion.php:51-60)은 **`merchant_id` 컬럼조차 없다**(접두어일 뿐) | `NAME_ONLY` |
| 18 | VENDOR_FOR | 부재(관계) · 인접 `sc_suppliers.wms_id → wms_suppliers`(SupplyChain.php:88 · SSOT 선언 :243) = **테이블 간 링크**이지 조직 관계 타입 아님 · `wms_suppliers`(Wms.php:105) **평면 · parent 없음** | `LEGACY_ADAPTER` |
| 19 | PARTNER_OF | 부재(관계) · 인접 `partner_account`(PartnerPortal.php:52-59) `TYPES=['supplier','logistics','warehouse']`(:29) = **외부 party 로그인 계정**(tenant 소속 · 관계 엣지 아님) | `KEEP_SEPARATE_WITH_REASON` |
| 20 | COST_CENTER_OF | 부재 — `cost_center` grep 0 | `NOT_APPLICABLE` |
| 21 | PROFIT_CENTER_OF | 부재 — `profit_center` grep 0 | `NOT_APPLICABLE` |
| 22 | PROJECT_SPONSORED_BY | 부재 — PM 도메인에 스폰서 관계 0 | `NOT_APPLICABLE` |
| 23 | MATRIX_REPORTS_TO | 부재 — `matrix_` grep 0 · **다중 부모 개념 전무**(유일 부모축 `app_user.parent_user_id` 는 **단일 부모 · 깊이 2**) | `NOT_APPLICABLE` |
| 24 | ADVISORY_TO | 부재 — grep 0 | `NOT_APPLICABLE` |
| 25 | INTERCOMPANY_RELATION | 부재 — 법인 부재로 성립 여지 0 | `NOT_APPLICABLE` |
| 26 | JOINT_VENTURE_RELATION | 부재 — grep 0 | `NOT_APPLICABLE` |
| 27 | DELEGATED_OPERATION | ★**최근접 실자산 = `agency_client_link`**(AgencyPortal.php:64-72) — **동의 기반 위임**(pending/approved/revoked) · **매 요청 fail-closed 재검증** `resolveAccessContext`(:414-432 — 세션→링크 재조회 :423 → `status!=='approved'` 이면 null :427 → 세션↔링크 tenant 불일치 방어 :428 → index.php:85-90 **403**). 🔴 **단 이분·N:M·1홉·조직↔조직 아님 → 커버 계산 금지** | `KEEP_SEPARATE_WITH_REASON` |
| 28 | TEMPORARILY_ATTACHED_TO | 부재 — 임시 배속 0 · 시점 부여 간선 전무(`effective_to` grep 0) | `NOT_APPLICABLE` |
| 29 | REPLACES | 부재 — 대체 관계 0 · 버전 체인 자체가 없음([§9](DSAR_ORGANIZATION_UNIT_VERSION.md)) | `NOT_APPLICABLE` |
| 30 | MERGED_INTO | 부재 — ★`crm_identity_merge_link(a_id,b_id)`(CRM.php:708-712 · `UNIQUE(tenant_id,a_id,b_id)`)는 **무방향 등가 엣지**(union-find :597-643 `roots`/`sizes`) — **등가관계는 대칭·추이적**, `MERGED_INTO` 는 **방향성 있는 흡수**. 동일성 해소이지 조직 병합 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 31 | SPLIT_FROM | 부재 — 분할 0 · union-find 에는 **split 연산이 존재하지 않는다**(union 전용) | `NOT_APPLICABLE` |
| 32 | CUSTOM | 부재 — 관계 확장점 0 · ★인접 `graph_edge.edge_label`(Db.php:816-839)이 **임의 타입드 간선 라벨**을 허용하나 **마케팅 귀속 도메인 · 내부 생산자 0** | `KEEP_SEPARATE_WITH_REASON` |

**실측 개수: 32 / 32 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · 부분 1(`MANAGED_BY`) · 도메인 상이 5 · 어댑터 1 · 이름만 1 · 부재 24.

## 2. 원문 전사 + 판정 — 필수 필드 **원문 18종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | relationship_type_id | 부재 — 관계 타입이 엔티티가 아님 | `NOT_APPLICABLE` |
| 2 | relationship_code | 부재 · ★인접 `pm_task_dependencies.dep_type ENUM('FS','SS','FF','SF')`(migration `20260526_168_004:9`) = **레포 유일 관계 타입 열거** — **작업 일정 의존 도메인** | `KEEP_SEPARATE_WITH_REASON` |
| 3 | relationship_name | 부재 — 표시명 0 · 다국어 0 | `NOT_APPLICABLE` |
| 4 | relationship category | 부재 — 관계 분류축 0 | `NOT_APPLICABLE` |
| 5 | directional 여부 | 부재(플래그) · ★**선례 실재**: `agency_client_link` 는 **방향 있음**(`agency_id`→`client_tenant_id` · 양방향 인덱스 :71로 역방향 조회 지원) vs `crm_identity_merge_link` 는 **무방향**(:708-712) → **두 방향성이 코드에 공존하나 플래그로 선언되지 않는다** | `PARTIAL` |
| 6 | inverse relationship type | 부재 — 역관계 선언 0 · `graph_edge` 도 역엣지를 **인덱스로만 지원**(:838-839)하고 타입 역쌍 개념 없음 | `NOT_APPLICABLE` |
| 7 | transitive 여부 | 부재 — ★**이행성 실물 0**: `agency_client_link` **1홉 전용** · `app_user.parent_user_id` **단일 홉·비재귀**(:200-217) · `graph_edge` 는 **하드코딩 3-hop**(GraphScore::scoreInfluencer:187-240 — 범용 아님) | `NOT_APPLICABLE` |
| 8 | hierarchy forming 여부 | 부재 — **계층 형성 간선 자체가 0** | `NOT_APPLICABLE` |
| 9 | cycle allowed 여부 | 부재(플래그) · ★**순환 방어 실선례 최상급**: `Dependencies::validateDependency`(PM/Dependencies.php:79-100) **반복형 DFS + 명시적 `$visited` + tenant 필터 + 최대깊이 10000 + 쓰기 전 차단**(:32-34 → 422 `cycle_detected` · self-loop :29-31) · `menu_tree` `wouldCycle`(AdminMenu.php:540-555 · `$depth<100` 하드캡 :545 · 자기참조 즉시 차단 :542) · `PM/Gantt`(:104-125) **Kahn 위상정렬 + `count($topo)!==count($taskMap)` 정석 판정 + 순환 시 부분결과+경고 degrade**. 🔴 **단 `graph_edge` 는 순환 방어 0** | `LEGACY_ADAPTER`(패턴 정본) |
| 10 | cross legal entity allowed 여부 | 부재 — 법인 부재로 성립 여지 0 | `NOT_APPLICABLE` |
| 11 | cross tenant allowed 여부 | ★**유일한 실 선례 = `agency_client_link`** — **크로스테넌트 위임 엣지 REAL**(`UNIQUE(agency_id, client_tenant_id)` :72) + **매 요청 fail-closed 재검증**(:414-432 → index.php:85-90 403). 단 **플래그가 아니라 하드코딩된 단일 경로** · ★`X-Act-As-Tenant` 는 **하드코딩 스위치**(`authedTenant` UserAuth.php:397-400 — admin **AND** 정확히 `'platform_growth'` · 임의 임퍼소네이트 **구조적 불가** · 286차 사고 수정 결과) | `PARTIAL` |
| 12 | approval routing eligible 여부 | 부재 — 승인 라우팅 0 · `perms` `'approve'`(`ORG_PRESET` :708·:711·:716·:717)는 **메뉴별 액션 플래그**이지 라우팅 아님 | `NOT_APPLICABLE` |
| 13 | manager resolution eligible 여부 | 부재 — `reports_to`/`manager_id` **양쪽 grep 0** · 해석 알고리즘 0 | `NOT_APPLICABLE` |
| 14 | effective dating required 여부 | 부재(플래그) · ★**시점 3종 실선례 = `agency_client_link.invited_at`/`approved_at`/`revoked_at`(:64-72)** — **레포에서 관계에 시점이 붙은 유일 사례**. 단 **as-of 조회 불가**(`WHERE effective_from <= :as_of` 술어 **backend/src 전역 0건** · `effective_to` grep 0) · `kr_fee_rule.effective_from`(Db.php:898)은 **채널 수수료 도메인 · 최신승 전용** | `PARTIAL` |
| 15 | maximum parent count | 부재 — ★다중 부모 개념 전무 · `app_user.parent_user_id` = **단일 부모 컬럼**(구조적으로 max=1 고정이나 **선언이 아니라 스키마 우연**) | `NOT_APPLICABLE` |
| 16 | maximum child count | 부재 — 자식 수 제한 0 · 인접 `PlanLimits`(:36-37)는 **플랜 좌석 한도**(`parent_user_id IS NULL` owner 에서 plan 조회)이지 관계 카디널리티 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 17 | status | 부재(타입) · ★인접 `agency_client_link.status`(pending/approved/revoked :64-72) = **인스턴스 상태**(관계 타입 상태 아님) | `PARTIAL` |
| 18 | evidence | 부재 — 전 도메인 0 | `NOT_APPLICABLE` |

**실측 개수: 18 / 18 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · 부분 4 · 어댑터 1 · 도메인 상이 3 · 부재 10.

## 3. 규칙

- 🔴 **`agency_client_link` 를 조직 관계로 계산 금지 — 4중 역산.** ⓐ **이분** — `agency_account`(:56-63)는 **테넌트가 아니라 별도 인증 realm**(자체 login/session :73 · 잠금 :179 · 화이트라벨 `brand_json`) ⓑ **N:M · 1홉 전용**(순회·이행성·깊이 0) ⓒ **조직↔조직 엣지 아님** ⓓ **동의 기반 접근 허가**이지 소유·포함 아님.
- 🔴 **`pm_task_dependencies.dep_type` 을 조직 관계 타입에 매핑 금지.** `FS/SS/FF/SF`(migration `20260526_168_004:9`)는 **작업 일정 의존 semantics**(PM/Gantt.php:20 주석 *"lag = days"*)다. 원문 32종과 **교집합 0** · 축 자체가 다르다.
- 🔴 **`crm_identity_merge_link` 를 `MERGED_INTO` 로 계산 금지 — 대수적으로 다르다.** union-find **등가류**(대칭·추이적)와 `MERGED_INTO`(방향성 흡수)는 다른 관계이며, 등가류에는 **`SPLIT_FROM` 연산이 아예 없다**.
- 🔴 **`graph_edge` 를 조직 관계 정본으로 전용 금지**(도메인 = 마케팅 귀속). **단 §11 설계의 선례 가치는 최상**: Node/Edge 분리 + 타입드 관계(`edge_label`) + 가중치 + **양방향 인덱스**(Db.php:838-839)가 **이미 존재** → **전용 그래프 DB 도입 불필요**(Neo4j/Cypher/Gremlin/Neptune/Arango/JanusGraph/TinkerPop **grep 0**).
- 🔴 **`graph_edge` 의 2결함을 복제하지 마라**: ⓐ **순환 방어 0** ⓑ **하드코딩 3-hop 런타임 전개**(GraphScore::scoreInfluencer:187-240 — 사전계산 경로 테이블 없음 · **hop3∈hop2∈hop1 = N+1** :207-219) — 285차 **"루프 내 N+1 = 즉시장애"** 트랩의 DB판. **Path Index 도입 정당화 근거.**
- ★**순환 방어는 `Dependencies::validateDependency`(PM/Dependencies.php:79-100) 확장이 정본** — **반복형 DFS + 명시적 `$visited` + tenant 필터 + 최대깊이 10000 + 쓰기 전 차단**(:32-34 → 422). `cycle allowed 여부` 플래그는 **이 검사를 조건부로 만드는 게이트**로 설계하고, **`cycle_allowed=false` 를 기본값(fail-closed)** 으로 두라.
- ★**위상정렬은 `PM/Gantt`(:104-125) 선례를 따르라** — Kahn + `count($topo)!==count($taskMap)` 정석 판정 + **순환 시 500이 아니라 부분결과+경고로 degrade**.
- ★**재귀 CTE 를 쓰지 마라 — 레포 관례에 반한다.** `WITH RECURSIVE` **backend/src 0** · `Db::sql()`(Db.php:177-191)은 **DDL 전용 번역기**(AUTO_INCREMENT/TINYINT/DOUBLE/COMMENT 치환)라 **SELECT·CTE 미지원** → raw SQL 이 된다. 트리 5개가 **전부 애플리케이션 계층 순회**를 택했다(이식성). 재귀 CTE 도입 = **두 번째 순회 방식** = 정합 부담. ⚠️엔진 지원 여부(MySQL 8.0.37 ○ · SQLite 3.8.3+)는 **라이브 SQLite 버전 미실측 → 추론이다. 사실로 인용 금지.**
- ★**`effective dating required` 는 `agency_client_link` 3시점(:64-72)이 유일 선례**이나 **as-of 조회 능력이 0**이다(전역 술어 0건). 관계에 시점을 붙이려면 **`effective_from`/`effective_to` 폐구간 + as-of 술어를 처음부터 SSOT 로** 고정하라 — 현행 최신승 술어 4개소 분산·`isDemo` 12벌·백오프 3공식과 같은 **술어 SSOT 부재**를 반복하지 말 것.
- 🔴 **`cross tenant allowed` 설계 시 테넌트 격리 강제선을 우회하지 마라** — 인증키 tenant 로 `X-Tenant-Id` **무조건 덮어쓰기**(index.php:600) · 세션→`auth_tenant` 주입(:429-442) · strict fail-closed(:585)는 **REAL** 이다. 크로스테넌트 관계는 **`agency_client_link` 의 매 요청 재검증 패턴(:414-432)을 확장**해야 하며, 새 우회 경로 신설은 **보안 후퇴**다.
- 🔴 **관계 신설 시 `index.php:100` 의 역할 합성을 깨지 마라** — 위임 scope 의 `write` 여부로 `auth_role` 을 `analyst`/`viewer` 로 **합성 주입**하는 **조직역할축↔API등급축의 유일 접점**이다. `api_key` RBAC 의 R 은 **기계 신원 API 등급**(`roleRank` :554 · ★`connector` 는 조직 직위가 아니라 **ingest 쓰기 허용** :571-574 · 판정 축이 **HTTP 메서드** :568)이고, 조직 역할축 `team_role`(owner>manager>member TeamPermissions.php:17)과는 **매핑 코드가 없다**(`effectiveScope():245-246` 은 `team_role` 만 읽음). **두 축을 임의로 잇지 마라.**
- 스키마는 **MySQL/SQLite 두 방언 동시 작성 의무** · `ensureTables` 멱등(`backend/migrations/` **172차 정지**) · **백필 불가**(제약 2).
- ⚠️ **`agency_client_link` 실 데이터 존재 미확인**(라이브 미조회). 죽은 스켈레톤 확률은 낮다고 **추정**(프론트 `AgencyConsole.jsx` 실재 · index.php:85 미들웨어 실배선). **"실사용 중"으로 단정 금지.**
