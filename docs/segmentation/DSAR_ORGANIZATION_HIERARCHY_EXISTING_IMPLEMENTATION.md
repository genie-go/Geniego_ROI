# DSAR — 기존 구현 분류 (§64)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §64 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

### 0.1 ★대전제 — 조직 계층은 **애초에 존재한 적이 없다** (팬텀도 유물도 아니다)

이 블록의 가장 중요한 실측이다. 승인(5-3-2)에서는 "테이블 4개가 있으나 1개만 REAL"이었다. **조직은 다르다 — 0개다.**

| 축 | 실측 | 의미 |
|---|---|---|
| `git log --all -S "org_unit"` | **0** | 삭제된 조직 코드 **0** |
| `organization_unit` | **0**(289차 스펙 커밋 제외) | 과거 시도 흔적 **0** |
| `hierarch` (`backend/src` 전역 grep) | **0** | 현행 계층 어휘 **0** |
| `organization`·`division`·`department`·`squad`·`matrix_`·`position_unit`·`legal_entity`·`cost_center`·`profit_center`·`hris`·`workday`·`payroll`·`procurement`·`treasury`·`external_party`·`contractor` | **backend/src 전역 0 또는 무관 히트** | — |

**→ "팬텀"(주석·문서에만 존재)도 아니고 "유물"(과거 구현 잔해)도 아니다. 결번(缺番)이다.** 이 구분이 실무적으로 결정적이다: 유물이면 흡수·통합이고, 팬텀이면 제거지만, **결번이면 신설이다.** 단 아래 §0.2 가 그 신설의 범위를 극적으로 좁힌다.

**동음이의 오탐 4건 — 재플래그 금지**

| 히트 | 실체 | 무관 사유 |
|---|---|---|
| `business_unit` | **Trustpilot 리뷰 API 자격증명 `business_unit_id`**(`ChannelSync.php:2573-2580`·`ChannelRegistry.php:126`) | 벤더 계정 ID |
| `company_id` ×2 | **Adobe Analytics 커넥터 자격증명**(`Connectors.php:3880`·`ChannelRegistry.php:115`) | 법인 아님 |
| `quota` | **AI 호출 한도**(`ClaudeAI.php:523-599`) | 조직 배분 아님 |
| `po_*` | **Price Optimization**(`PriceOpt.php:38-146`) | Purchase Order 아님 |

### 0.2 ★★능력은 실재한다 — 이름 grep 0 이 곧 자산 0 이 아니다 (8회차 교훈의 정면 적용)

🔴 **이것이 이 문서의 존재 이유다.** §0.1 만 보고 "조직 = 전부 ABSENT → 전면 신설"로 결론냈다면 **아래 8개 실자산을 전부 놓치고 두 번째 엔진을 8개 만들었을 것이다.** 이름은 0 이지만 **능력은 8건 실재한다.**

| # | 자산 | 실측(file:line) | 제공 능력 |
|---|---|---|---|
| 1 | **`ORG_PRESET` 15단위** | `TeamPermissions.php:706-722` · `seedOrg:725-753` · 배선 `routes.php:1589`+`:2570` `$register`+`teamApi.js:261` | 표준 조직 단위 **열거**(구조 아님) |
| 2 | **`app_user.parent_user_id`** | `UserAuth.php:156-167`(주석 :156) | 레포 **유일 부모-자식 간선** |
| 3 | ★**`EnterpriseAuth` SSO/SCIM** | OIDC/SAML/SCIM 2.0 · `routes.php:915-932`+`$register :2383-2400` | **외부 IdP 신원 인입 — REAL** |
| 4 | **`graph_node`/`graph_edge`** | `Db.php:816-839` · `/v419/graph/*` 9라우트 `routes.php:721-729` | **Node/Edge 분리 + 타입드 관계 + 가중치** |
| 5 | **`PM/Dependencies`** | `PM/Dependencies.php:79-100` | **반복 DFS 순환검출 + 쓰기 전 차단** |
| 6 | **`PM/Gantt`** | `PM/Gantt.php:104-125` | **Kahn 위상정렬 + 정석 순환 판정** |
| 7 | **`menu_tree`** | `AdminMenu.php:108-117` · `wouldCycle:540-555` | **완성형 인접리스트 트리** |
| 8 | **`menu_audit_log.hash_chain`** | `AdminMenu.php:128` · 생성 `:182-197` · `lastHash():214-219` | **SHA-256 prev-chain 감사** |
| 9 | **`agency_client_link`** | `AgencyPortal.php:64-72` · `resolveAccessContext:414-432` | **크로스테넌트 위임 엣지 + `READ_ONLY` effect 실구현** |

### 0.3 ★★8회차 교훈을 반사실(counterfactual)까지 기록한다

> **5-3-2 에서 무슨 일이 있었나**: `BPMN` grep **0** → "워크플로 엔진 부재" 로 판정 직전이었다. **`JourneyBuilder` 가 그 판정을 뒤집었다** — 이름(BPMN)은 0 이지만 능력(노드 10종·엣지·런타임 방문집합·enrollment 상태기계)은 REAL 이었고, 레포 **유일한 실 Flow 엔진**이었다.
>
> **★이번 블록의 반사실**: 조직 이름 grep 은 **BPMN 보다 더 깨끗한 0** 이다(`git log --all -S` 까지 0). **이름 grep 0 으로 밀었다면 위 9개 자산을 전부 놓치고 신설했을 것이다** — 즉 IdP 커넥터를 새로 짜고(`EnterpriseAuth` 중복), 순환검출을 새로 짜고(`PM/Dependencies` 중복), 그래프 스토어를 새로 짜고(`graph_node` 중복), 해시체인 감사를 새로 짰을 것이다(`menu_audit_log` 중복). **깨끗한 0 일수록 능력 조사를 더 해야 한다** — 이름이 0 이라는 사실은 **능력에 대해 아무것도 말하지 않는다.**

🔴 **내 초판 브리핑 오류 #1 이 정확히 이 지점이다**: 나는 **SSO/SCIM 을 `ABSENT` 로 예측**했고 ⓑ 실측이 **`EnterpriseAuth` REAL** 로 뒤집었다. **IdP 커넥터 신설 = 두 번째 엔진 = 헌법 위반.** 이 문서에 이 오류를 남기는 이유는, 동일한 예측 편향이 나머지 8개 자산에도 걸려 있었기 때문이다.

### 0.4 ★대칭 오류 금지 — 능력 존재 ≠ 요구 충족

| 자산 | 있는 것 | **없는 것**(이것을 지우면 역산) |
|---|---|---|
| `ORG_PRESET` | 15단위 이름 | **`parent_team_id` 없음**(`team` DDL `:145-151`/`:168`) — "마케팅 글로벌팀"이 "마케팅팀"의 자식이라는 **구조 링크 0** |
| `parent_user_id` | 부모 간선 | **전 경로 owner 직속 2단 봉인** · **3단 생성 경로 부재** · 순회 단일 홉(`resolveTenantId:200-217`) |
| `EnterpriseAuth` | Users CRUD | **SCIM Groups = GET 전용**(`scimListGroups:417-423`·`routes.php:932`) — **IdP→내부 인입 경로 없음** · 그룹은 **평문 문자열**(`sso_group_role_map:70,:72`·`roleForGroups:78-85`) |
| `graph_node`/`graph_edge` | Node/Edge 분리 | **`node_type` 화이트리스트 `['influencer','creative','sku','order']` → 422**(`GraphScore.php:57-60`) — **조직 노드 타입은 코드가 거부한다** |
| `menu_tree` | 완성형 트리 | **`tenant_id` 컬럼 없음**(전역 단일 트리) |
| `agency_client_link` | 위임 엣지 | **이분·N:M·1홉 전용** · 조직↔조직 아님 |

## 1. 원문 전사 + 판정 — **원문 33종**

> **축 해설**: §64 는 **분류 어휘(vocabulary)** 목록이다. 따라서 "현행 대조" = **각 라벨로 분류되는 현행 자산의 실측**이고, "판정" = **그 분류 버킷의 현 상태**다. CANONICAL_* 19종은 **목표 상태 클래스**이므로 현행 자산이 그리로 분류되지 않으면 버킷이 비는 것이 정상이다.

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | `CANONICAL_ORGANIZATION_REGISTRY` | **버킷 공집합.** 조직 레지스트리 0. 인접 = `ORG_PRESET` 15단위(`TeamPermissions.php:706-722`) — **열거이지 레지스트리 아님**(등록·조회·소스 우선순위 축 전무) · `channel_registry`(`ChannelRegistry.php:32-49`)는 **tenant 없는 플랫폼 전역 채널 카탈로그**(주석 `:11`) | `NOT_APPLICABLE`(부재→신설) + `PARTIAL`(`ORG_PRESET`) |
| 2 | `CANONICAL_ORGANIZATION_UNIT` | **버킷 공집합.** Unit 엔티티 0. 인접 = `team`(`TeamPermissions.php:145-151` MySQL/`:168` SQLite) — `id·tenant_id·name·description·team_type·manager_user_id·status·created_by·created_at·updated_at` | `PARTIAL`(`team` = 평면 단위) |
| 3 | `CANONICAL_ORGANIZATION_UNIT_VERSION` | **버킷 공집합.** ★**엔티티 `version` 은 `menu_defaults.version` 단 1건**(`AdminMenu.php:120`). `\bversion\b` 40건 전부 API 버전 문자열·DB 버전·벤더 헤더. **optimistic lock `version` grep 0** | `NOT_APPLICABLE` |
| 4 | `CANONICAL_ORGANIZATION_TYPE` | **버킷 공집합**(Registry화 기준). 인접 = `TEAM_TYPES` 17종(`TeamPermissions.php:44-49`) — **평면 문자열 카탈로그**(코드 상수 · 테이블 아님 · 확장 불가) | `PARTIAL` — 🔴 **"Type Registry 존재"로 계산 금지** |
| 5 | `CANONICAL_ORGANIZATION_RELATIONSHIP` | **버킷 공집합.** 관계 타입 축 0. 조직 간 관계를 표현하는 행/컬럼 자체가 없다 | `NOT_APPLICABLE` |
| 6 | `CANONICAL_ORGANIZATION_HIERARCHY` | **버킷 공집합.** `hierarch` grep **0** | `NOT_APPLICABLE` |
| 7 | `CANONICAL_ORGANIZATION_HIERARCHY_VERSION` | **버킷 공집합.** 계층이 없으므로 버전도 없음 | `NOT_APPLICABLE` |
| 8 | `CANONICAL_ORGANIZATION_GRAPH_NODE` | **구조적 쌍둥이 REAL · 도메인 상이.** `graph_node`(`Db.php:816-825`) = `tenant_id`+`node_type`+`node_id`+`label`+`meta_json`. 🔴 **`node_type` 이 `['influencer','creative','sku','order']` 화이트리스트로 422 강제**(`GraphScore.php:57-60`) → **조직 노드 타입은 코드가 구조적으로 거부한다** | `KEEP_SEPARATE_WITH_REASON` — 🔴 **커버 금지 · 단 §66 선례 가치 최상** |
| 9 | `CANONICAL_ORGANIZATION_GRAPH_EDGE` | **구조적 쌍둥이 REAL · 도메인 상이.** `graph_edge`(`Db.php:826-837`) = `src_type/src_id`→`dst_type/dst_id`+`edge_weight`+`edge_label` · **양방향 인덱스**(`:838-839`) · 9라우트 실배선(`routes.php:721-729`+`$register :2306-2314`). ⚠️ **내부 생산자 0**(frontend 호출 0 → 외부 POST 전용) | `KEEP_SEPARATE_WITH_REASON` + `UNVERIFIED`(VACUOUS 미배제) |
| 10 | `CANONICAL_ORGANIZATION_GRAPH_PATH` | **버킷 공집합 · 전례 0.** Closure Table(`closure`/`ancestor`/`descendant`/`graph_path`) **0** · Materialized Path **컬럼**(`full_path`/`path_str`/`tree_path`/`idpath`) **0** · Nested Set(`lft`/`rgt`) **0**. 🔴 현행 대체물 = `GraphScore::scoreInfluencer:187-240` **하드코딩 3-hop 런타임 전개** · **hop3∈hop2∈hop1 N+1**(`:207-219`) | `NOT_APPLICABLE`(**순수 신규**) |
| 11 | `CANONICAL_ORGANIZATION_MEMBERSHIP` | **버킷 공집합**(Effective-dated 기준). 인접 = `team_member`(팀↔사용자) · `app_user.parent_user_id`(`UserAuth.php:156-167`) — **effective date 없음 · 현재상태 전용** | `PARTIAL` |
| 12 | `CANONICAL_ORGANIZATION_LEGAL_ENTITY_BINDING` | **버킷 공집합.** ★**법인 엔티티 자체가 없다** — 사업자정보 = `app_user` **프로필 평문 필드**(`business_number`·`ceo_name`·`country` — `UserAuth.php:499`·`:1720`) · `biz_no`/`brn`/`corp_reg`/`tax_id` **전부 0**. 🔴 **`DATA_SCOPES` 의 `'company'` 는 법인 경계가 아니라 무제한 센티넬**(`effectiveScope():258` `if ($st === 'company') return null; // 전사 = 무제한`) | `NOT_APPLICABLE` — 🔴 **`'company'` 를 Legal Entity Scope 로 계산 시 의미가 정반대** |
| 13 | `CANONICAL_ORGANIZATION_WORKSPACE_BINDING` | **버킷 공집합.** 테넌트 = 구독 단위 · **마스터 테이블 없음**(`api_key.tenant_id VARCHAR(100)` **FK 없음** `Db.php:944`) · 발급 = `'acct_'.$id` 문자열 생성(`UserAuth.php:220-224`) · 열거 = `SELECT DISTINCT tenant_id` **19개소 역추론**. **테넌트↔워크스페이스 분리 축 자체가 없다** | `NOT_APPLICABLE` |
| 14 | `CANONICAL_ORGANIZATION_COST_CENTER_BINDING` | **버킷 공집합.** `cost_center` grep **0** | `NOT_APPLICABLE` |
| 15 | `CANONICAL_ORGANIZATION_PROFIT_CENTER_BINDING` | **버킷 공집합.** `profit_center` grep **0**. 인접 = `pnl_vat_summary` tenant 키(`Pnl.php:402-423`) — **법인 회계가 아니라 구독자별 리포트** | `NOT_APPLICABLE` |
| 16 | `CANONICAL_ORGANIZATION_POSITION_UNIT` | **버킷 공집합.** `position_unit` grep **0** · `reports_to` **0** · `manager_id` **0**(단 `team.manager_user_id` 존재 = 팀 1개의 담당자 포인터이지 직위 단위 아님) | `NOT_APPLICABLE` |
| 17 | `CANONICAL_ORGANIZATION_MATRIX_RELATIONSHIP` | **버킷 공집합.** `matrix_` grep **0**. ★**Primary Hierarchy 자체가 없으므로 Matrix 와 구분할 대상도 없다** | `NOT_APPLICABLE` |
| 18 | `CANONICAL_ORGANIZATION_SNAPSHOT` | **버킷 공집합 · 선례 2건.** `menu_defaults(snapshot_data JSON, version, created_at)`(`AdminMenu.php:120`·`:139`·생성 `:308`·복원 `:584-590`) = **유일한 "버전 붙은 스냅샷"**(단 **immutable_hash 없음 · 전역 1행 · 최신 1건만 조회**) · `pm_baseline(snapshot_json, captured_at)`(`PM\Enterprise.php:55`·`:62`·`:360-364`) | `NOT_APPLICABLE`(조직) + `VALIDATED_LEGACY`(**패턴 재사용 강제**) |
| 19 | `CANONICAL_ORGANIZATION_RECONCILIATION` | **버킷 공집합.** 소스가 1개(내부)뿐이므로 대사 대상이 없다. HRIS/ERP 커넥터 **0**(§20 증명) | `NOT_APPLICABLE` |
| 20 | `VALIDATED_EXTERNAL_SOURCE` | ★**`EnterpriseAuth` = 유일 실 외부 신원 소스**(OIDC Authorization Code + id_token RS256/JWKS · SAML ds:Signature C14N+RSA-SHA256 · 어설션 리플레이 방어 `:56` · SCIM 2.0 Users CRUD · KEK 회전 · `routes.php:915-932`+`$register :2383-2400` **양쪽 배선**) | ★**`VALIDATED_EXTERNAL_SOURCE`(IdP) — 확장 강제** |
| 21 | `EXTERNAL_SOURCE_ADAPTER` | **IdP 어댑터 = `EnterpriseAuth` 1개**(위). ★**HRIS·ERP 어댑터 0 — 능력축 증명**: `ChannelRegistry.php:12`,`:79` `group_type` 도메인 = sales/marketing/logistics/pg/messaging · `sync_kind` = commerce/ad/messaging/none + 증설 analytics(`:112`)·cs(`:116`)·esp(`:121`)·review(`:125`) → **`erp`·`finance`·`hr` 값이 열거에 없다.** 헌법 Vol2(`docs/DATA_SOURCE_ARCHITECTURE_CONSTITUTION.md:71`)가 ERP 를 12분류로 정의하나 **이름만 있고 커넥터·수집·정규화 어느 층도 없다** · `backend/migrations/` 전량 grep 0 · git log 전 이력 히트 = **289차 스펙 문서 자신뿐** | `LEGACY_ADAPTER`(IdP) + `NOT_APPLICABLE`(HRIS·ERP) |
| 22 | `VALIDATED_LEGACY` | ★**요구를 실제로 충족하는 자산 = 알고리즘 계층 2건뿐**: **`PM/Dependencies::validateDependency`**(`:79-100` — 반복형 DFS + 명시적 `$visited` + **tenant 필터** + **최대깊이 10000** + **쓰기 전 차단** `:32-34`→422 `cycle_detected` + self-loop 차단 `:29-31`) · **`PM/Gantt`**(`:104-125` — Kahn 위상정렬 + `count($topo) !== count($taskMap)` 정석 순환 판정 + 순환 시 **500이 아니라 부분결과+경고 degrade**). 저장 = `pm_task_dependencies` 엣지리스트 · `UNIQUE(tenant,pred,succ,dep_type)` · pred/succ 양방향 인덱스(`20260526_168_004:12-14`) · 배선 REAL(`routes.php:1424-1425`+`/api` 별칭 `:1472-1473`) | ★**`VALIDATED_LEGACY` — 재구현 절대 금지 · 확장만**(레포 최고 품질) |
| 23 | `LEGACY_ADAPTER` | **인접 자산·위임 5건**: `menu_tree` 조상 walk(`wouldCycle:540-555` — 반복 조회 + `$depth<100` 하드캡 `:545` + 자기참조 즉시 차단 `:542`) · `menu_audit_log.hash_chain`(`AdminMenu.php:128`) · `schema_migrations.checksum`(`Migrate.php:50` `hash('sha256',$sql)`) · `ChannelSync::elevenStCategoryCatalog:911-971`(adjacency→materialized path 파생 · 가드 `guard<10` `:954-963`) · `AdminGrowth::fail`(`:181-186` 에러 봉투) | `LEGACY_ADAPTER` — 🔴 **커버 아님**(패턴 인용 전용) |
| 24 | `MIGRATION_REQUIRED` | **해당 없음 — 이행할 원본 데이터가 없다.** ★**단 제약이 결정적**: `backend/migrations/` **21파일 · 최신 `20260527_172_002_coupon_tables.sql` = 172차 정지 확정** → 조직 스키마는 **마이그레이션 파일로 들어갈 수 없다**(경로가 죽음) → `ensureTables` 멱등 `CREATE TABLE IF NOT EXISTS`+`try{ALTER}catch{}`(`Db.php:1123-1127`·`CRM.php:109`) 필수 · **MySQL/SQLite 2방언 수기 중복**(`CRM.php:48` vs `:77`) 의무 | `NOT_APPLICABLE`(데이터) — **단 §14 제약 참조 필수** |
| 25 | `CONSOLIDATION_REQUIRED` | ★**진짜 중복 0**(§65 정본). 조직 트리가 0 개이므로 통합할 2 개가 없다. 🔴 **"중복 없음"을 "양호"로 읽지 마라 — 기능 부재다** | `NOT_APPLICABLE` — §65 참조 |
| 26 | `DEPRECATION_CANDIDATE` | **1건 실재**: `PolicyTreeEditor.jsx`(재귀 DFS `:30-65`) = **어디서도 import 되지 않음**(전 `frontend/src` grep = 정의부뿐) | `VACUOUS` → `DEPRECATION_CANDIDATE` |
| 27 | `KEEP_SEPARATE_WITH_REASON` | **6건**: `graph_node`/`graph_edge`(마케팅 귀속 influencer→creative→sku→order) · `api_key` RBAC(`index.php:554` `['viewer'=>0,'connector'=>1,'analyst'=>2,'admin'=>3]` — ★**`connector` 가 결정적**: 조직에 "커넥터" 직위는 없다 · 주체가 사람이 아니라 **키** · 판정 축이 **HTTP 메서드** `:568`) · `partner_account`(`PartnerPortal.php:52-59` · `TYPES=['supplier','logistics','warehouse']` `:29` ↔ §36 `PARTNERSHIP_TYPE` 12종 **교집합 0**) · `journey_node_logs`(`JourneyBuilder.php:69` — tenant_id 보유 스키마 선례 최적이나 마케팅 도메인) · `channel_registry`(플랫폼 전역 채널 카탈로그) · `catalog_brand`(`Catalog.php:151-169` — 목적 = 11번가 상품등록 필수 브랜드코드 `BRAND_REQUIRED_CHANNELS=['11st','st11']` `:415` = **상품속성이지 조직 아님**) | `KEEP_SEPARATE_WITH_REASON` — 🔴 **전부 커버 아님** |
| 28 | `BLOCKED_CROSS_TENANT` | **격리 강제는 REAL**: 인증키 tenant 로 `X-Tenant-Id` **무조건 덮어쓰기**(`index.php:600`) · 세션→`auth_tenant` 주입(`:429-442`) · strict fail-closed(`:585`). ★**크로스테넌트 표면 2건**: `menu_tree` **`tenant_id` 컬럼 없음**(전역 단일 트리) · `menu_defaults` 전역 1행. `X-Act-As-Tenant` 는 **하드코딩 스위치**(`UserAuth.php:397-400` — admin **AND** 헤더값이 정확히 `'platform_growth'` 일 때만 → 임의 임퍼소네이트 구조적 불가 · 286차 사고 수정 결과) | `BLOCKED_CROSS_TENANT`(`menu_tree`·`menu_defaults` 를 조직 스토어로 전용 시) |
| 29 | `BLOCKED_LEGAL_ENTITY_RISK` | **버킷 공집합 — 법인 엔티티 부재로 위험 표면 자체가 없다.** 🔴 **단 `'company'` 센티넬**(`TeamPermissions.php:258`)이 이 버킷의 유일 함정: 이름만 보고 법인 경계로 읽으면 **무제한 해제를 법인 격리로 오독** | `NOT_APPLICABLE` — 🔴 **`'company'` 재플래그 금지** |
| 30 | `BLOCKED_GRAPH_CYCLE` | **순환 방어 3계층 존재 · 품질 편차 극심**: `PM/Dependencies` **쓰기 전 차단**(최상급) · `menu_tree` 쓰기 전 차단(깊이캡 100) · **`graph_node`/`graph_edge` 순환 방어 없음** · `journeys.edges` = **런타임 방문집합만**(`JourneyBuilder.php:511-518` — 작성자 JSON 무검증 자인) | `BLOCKED_GRAPH_CYCLE`(`graph_edge`·`journeys`) + `VALIDATED_LEGACY`(PM) |
| 31 | `BLOCKED_HISTORICAL_INTEGRITY_RISK` | ★**시점 능력 거의 전무 — 이 버킷이 최대 위험**: `kr_fee_rule.effective_from`(`Db.php:898`) = **전 코드베이스 유일 effective date** · 쓰기 `KrChannel.php:128-140` · **읽기가 전부 `ORDER BY effective_from DESC LIMIT 1`(최신승)**(`Pnl.php:454`·`KrChannel.php:102`·`:151`·`:459`). 🔴 **`WHERE effective_from <= :as_of` 술어 = backend/src 전역 0건**(PM 직접 검증) → `Pnl.php:449` 가 기간(`$from`,`$to`)을 받고도 `:454` 는 기간을 무시 → **과거 기간 P&L 도 오늘자 최신 VAT율로 계산**. **단 주석 `:451` 이 *"테넌트 최신 kr_fee_rule(채널 무관 최신)"* 로 의도를 명시** → **설계 선택일 수 있음 · 등급 미부여 · 관찰 사실로만 등재**(라이브 확인 필요). **`effective_to` 없음**(`valid_to\|effective_to` grep 0) → **폐구간 모델은 신규** | `BLOCKED_HISTORICAL_INTEGRITY_RISK` — **§44 결번의 정확한 실증**: 컬럼은 있으나 **as-of 조회 능력이 없다** |
| 32 | `UNVERIFIED` | ★**라이브 미검증 5건 — 단정 금지**: ⓐ `graph_node`/`graph_edge` **내부 생산자 0**(VACUOUS 미배제) ⓑ `menu_tree` **운영 0행 가능성 실재**(`AdminMenuManager.jsx:252` "menu_tree 가 비어 있습니다" 분기 + `:341` "⚠ menu_tree 미등록" 배지 · `reorder` **프론트 호출자 0**) ⓒ `data_scope` **런타임 행 수 미확인**(`:255-256` "미설정=무제한" → 행 0 이면 5곳 배선 전부 no-op) ⓓ `agency_client_link` **실 데이터 미확인** ⓔ 라이브 SQLite 버전 미실측 | `UNVERIFIED` — 🔴 **"운영 중인 트리"·"실사용 중인 ABAC"으로 단정 금지** |
| 33 | `TEST_ONLY` | **버킷 공집합 · 커버리지 0.** `tools/e2e/` 3종(`smoke.mjs`·`render.mjs`·`scenarios.mjs`)에 `organization\|hierarchy\|org_unit\|sso\|scim` grep **0** → **조직·SSO 회귀 커버리지 0** | `NOT_APPLICABLE` — 🔴 **§79 회귀 게이트의 전제가 없다** |

**실측 개수: 33 / 33 전사.** 원문 개수와 전사 개수 **일치**.

**분류 결과 요약**: CANONICAL_* 19 버킷 중 **17 이 공집합**(GRAPH_NODE·GRAPH_EDGE 만 구조적 쌍둥이 존재·도메인 상이) · `VALIDATED_EXTERNAL_SOURCE` **1**(`EnterpriseAuth`) · `VALIDATED_LEGACY` **2**(`PM/Dependencies`·`PM/Gantt`) · `LEGACY_ADAPTER` **5** · `KEEP_SEPARATE_WITH_REASON` **6** · `DEPRECATION_CANDIDATE` **1** · `BLOCKED_*` **3 버킷 실재** · `UNVERIFIED` **5** · `TEST_ONLY` **0**.

## 2. 규칙

- 🔴 **"조직 계층 전면 신설"로 서술 금지.** 정확한 서술은 **"구조는 결번 · 능력은 9건 실재"** 다. 결번인 것은 **구조(Unit·Version·Hierarchy·Path·Binding·Snapshot·Reconciliation)** 이고, 실재하는 것은 **알고리즘(순환검출·위상정렬)·인프라(IdP·그래프 스토어·해시체인·트리 walk)** 다. **후자를 신설하면 전부 두 번째 엔진이다.**
- 🔴 **`EnterpriseAuth` 확장 강제 — IdP 커넥터 신설 금지.** OIDC/SAML/SCIM 이 실배선(`routes.php:915-932`+`$register :2383-2400`)돼 있다. **내 초판 예측(#1: SSO/SCIM = ABSENT)이 실측에 뒤집힌 지점이다.** 확장 지점은 **`scimListGroups:417-423` 을 GET 전용에서 인입 경로로 넓히는 것**이지 새 커넥터가 아니다.
- 🔴 **`PM/Dependencies::validateDependency`(`:79-100`)·`PM/Gantt`(`:104-125`) 재구현 절대 금지.** 반복 DFS + visited + tenant 필터 + 깊이캡 + **쓰기 전 차단**, Kahn 위상정렬 + 정석 순환 판정 + degrade — **레포 최고 품질이며 §19/§52/§53 을 이미 충족한다.** 확장만 하라.
- 🔴 **`graph_node`/`graph_edge` 를 조직 커버로 계산 금지.** 도메인 판단 이전에 **코드가 거부한다** — `node_type` 화이트리스트 `['influencer','creative','sku','order']` → 422(`GraphScore.php:57-60`). **§66 선례로만 인용하라.**
- 🔴 **`ORG_PRESET` 을 "Organization Registry ABSENT" 로 밀지 마라 · 동시에 "Registry 존재"로도 계산하지 마라.** 정확한 표현 = **"구조가 아니라 열거"** → `PARTIAL`. `team` DDL 에 **`parent_team_id` 가 없다**(`:145-151`/`:168`).
- 🔴 **`app_user.parent_user_id` 를 §21 Tenant Hierarchy 근거로 쓰지 마라.** ⓐ **전 경로 owner 직속 2단 봉인**(`UserAuth.php:1226-1227`·`EnterpriseAuth.php:500`·`UserAuth.php:1574/1581`·`:670` — **3단 생성 경로 부재**, PM 전수 검증) ⓑ 순회 단일 홉(`resolveTenantId:200-217` — `LIMIT 1` 1회 후 즉시 return · 재귀 없음) ⓒ **용도 = 한 테넌트 안의 사용자 트리 + owner→member tenant 상속**, 보고선도 테넌트 간 부모-자식도 아니다. `parent_tenant`/`tenant_parent`/`sub_tenant`/`child_tenant`/`tenant_tree`/`tenant_hierarchy` = **backend+frontend 전역 grep 0** → **§21 = `ABSENT`**(이름·능력 양쪽).
- 🔴 **"테넌트 = 법인" 가정 금지 = 역산.** plan 은 `parent_user_id IS NULL` owner 계정에서 읽힌다(`PlanLimits.php:36-37`) = **테넌트 = 1 owner 계정의 구독 스코프**. **한 법인이 다수 테넌트를 갖거나 그 반대를 막는 것도 표현하는 것도 없다.**
- 🔴 **`DATA_SCOPES` 의 `'company'` 를 Legal Entity Scope 로 계산하면 의미가 정반대가 된다.** `effectiveScope():258` `if ($st === 'company') return null; // 전사 = 무제한` — **법인 경계를 긋는 게 아니라 지운다.**
- 🔴 **아이덴티티 병합 ≠ 계층.** `crm_customers.identity_id`(`CRM.php:109`)는 **union-find 등가류**(`resolveIdentitiesForTenant:597-643` — `roots`/`sizes` 클러스터링). **등가관계 = 대칭·추이적** vs **계층 = 반대칭 부분순서**. `crm_identity_merge_link(a_id,b_id)`(`:708-712`)의 `UNIQUE(tenant_id,a_id,b_id)` 도 **무방향 엣지**다. **Account Hierarchy 로 계산하면 역산.** (**CRM Account Hierarchy = `ABSENT`** — `crm_customers` 전 컬럼(`CRM.php:48-56`/`:77-83`)에 account/company/parent/hierarchy 전무 · `app_user.company` 는 **문자열 1개**.)
- 🔴 **`agency_client_link` 를 §21 근거로 쓰면 역산.** ⓐ **이분(bipartite)** — `agency_account`(`:56-63`)는 **테넌트가 아니라 별도 인증 realm**(자체 login/session `:73`·잠금 `:179`·화이트라벨 `brand_json`) ⓑ **N:M · 1홉 전용**(순회·이행성·깊이 0) ⓒ 조직↔조직 엣지 아님 ⓓ **동의 기반 접근 허가**이지 소유·포함 관계 아님. **단 §43 Scope Effect 의 유일한 실 선례**(`defaultScope():89` `['write'=>false,...]` → `index.php:92-96` write 미허가 시 **403**) 이며 `index.php:100` 이 위임 scope 의 `write` 로 `auth_role` 을 `analyst`/`viewer` 로 **합성 주입** = **조직역할축↔API등급축을 잇는 유일 지점**이다.
- 🔴 **`Db::envLabel()` 을 Environment Scope 로 계산 금지 = 역산.** **코드가 스스로 금지한다**: `Db.php:51-54` *"표시(관측성) 전용 env 라벨 — 게이트용 env()와 분리. ★게이트 로직(env())은 절대 이걸 쓰지 말 것"*. 27개 호출처 전부 응답 메타 또는 dev 노출 판정 · **인가 결정 사용 0**.
- 🔴 **주석·문서·인계서를 근거로 삼지 마라 — 정의부를 Read 하라.** 이 블록에서 규율 10 이 실제로 적중했다: `TeamPermissions.php:230` 주석의 **"팀 스코프 상속"은 상속이 아니라 폴백**(`:253-254` — user 에 없으면 team **1회** 조회 · 단일 홉 · 비재귀 · **부모 팀 컬럼 자체가 없으므로 구조적 불가**). 권한 "상속"도 **하향 클램프**(`clampActions:382-389`·`:396-402` — 팀 권한을 **상한**으로 멤버 권한 교집합 축소)이지 조직 계층 전파가 아니다.
- **`ensureTables` 제약 2 를 §14 에 반드시 반영하라**: **`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다** → **Hierarchy Version 간 데이터 이행 · §46 Retroactive 재계산은 집행 수단이 현재 없다.** (변종: PM 8테이블은 마이그레이션 정의 + 런타임 자가치유 **병행** — `PM\Shared::ensurePmTables:37-53` 이 부재 시 `Migrate::applyFiles` 로 168차 SQL 을 런타임 적용.)
- **오탐 재플래그 금지**: `business_unit`(Trustpilot 자격증명) · `company_id`(Adobe Analytics) · `quota`(AI 한도) · `po_*`(Price Optimization) · `wms_bins` `zone/aisle/rack/level/slot`(**고정깊이 평면 컬럼** `Wms.php:193-194` · `level`=물리 선반단 ≠ 트리 depth) · `Geo`(**IP→ISO alpha-2 → 언어** 매핑 `Geo.php:23-53` · ★**`:19` 는 `class Geo {` 줄** · **Country→Region 매핑 코드 0건**) · `region` **3축 병존**(광고 인구통계 `Db.php:681,690` / **Amazon Ads 엔드포인트 na·eu·fe** `Connectors.php:2704-2710` / **WMS 창고 시·도** `Wms.php:129`·`regionOf():284-286` · **`APAC`/`EMEA`/`AMERICAS`/`LATAM` grep 0**) · `plan_period_pricing.period_months`(`20260527_171_003:21-34` = **구독 기간 상품 옵션**이지 유효기간 아님 — **§44 선례 아님**, 내 브리핑 오류 #5).
