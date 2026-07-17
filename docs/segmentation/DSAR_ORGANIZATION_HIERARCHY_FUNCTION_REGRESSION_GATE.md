# DSAR — 검증 게이트 (§79)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §79 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

### 0.1 ★정직 등급 필수 — 이 문서 전체가 `CONTRACT_ONLY`

§79 는 **"완료 전에 반드시 확인하라"** 는 **게이트 목록**이다. 5-3-3-1 은 **비파괴 설계 명세 · 코드변경 0** 이므로 **현 시점 36개 게이트 중 실 코드로 통과하는 것은 0이다.** 이 문서는 **게이트 계약을 확정할 뿐 통과를 주장하지 않는다.**

> 🔴 **가짜 녹색 금지**(288차 systemic 교훈). 아래 표의 "현행 대조" 열은 **인접 실자산의 존재**를 기록한 것이지 **게이트 통과**가 아니다. 인접 자산이 있다는 사실을 통과로 계상하면 **분모=분자 동어반복**이며, 289차가 5-3-1 에서 겪은 역산(`REQUIREMENT_TYPE` 20/20 개수 일치인데 **축 자체가 날조**)의 정확한 재현이다.

| 축 | 실측 | 판정 |
|---|---|---|
| 36개 게이트 전체 | **실 코드 0**(5-3-3-1 = 설계 명세 · 코드변경 0) | **전건 `CONTRACT_ONLY`** |
| 회귀 기준선 | ★§0.2 — **매우 좁다** | **기능후퇴 0 의 측정 대상** |
| `EquivalenceProof` | **현행 부재** — 통합·확장의 **선행 조건** | `NOT_APPLICABLE`(신설) |
| `ENFORCED(예방)` 등급 | 🔴 **현행 레포에 이 등급이 없다**(G-06b) | **탐지일 뿐 예방 아님** |
| 회귀 테스트 커버리지 | `tools/e2e/` 3종(`smoke.mjs`·`render.mjs`·`scenarios.mjs`)에 `organization\|hierarchy\|org_unit\|sso\|scim` grep **0** | 🔴 **조직·SSO 커버리지 0** |

### 0.2 ★기능후퇴 0 의 정확한 측정 대상 — **회귀 기준선이 매우 좁다**

§79 는 **"기존 Organization 기능의 회귀가 없는가"**(#33)를 묻는다. **★조직 도메인에서 이 질문은 승인(5-3-2)과 성격이 다르다.**

> **5-3-2 는 "1 REAL + 3 미달"이었다. 조직은 "0 REAL"이다** — 조직 계층 기능이 **애초에 존재한 적이 없다**(`git log --all -S "org_unit"` **0** · 삭제된 조직 코드 **0** = 팬텀도 유물도 아닌 **결번**).

🔴 **이것이 §79-33 의 최대 함정이다.** 회귀 기준선이 0 이면 **어떤 결과물도 자동으로 "기능 후퇴 없음"** 이 된다. **분모가 0인 통과 주장은 통과가 아니다.** 따라서 회귀 기준선은 **"조직 기능"이 아니라 "조직 신설이 건드리게 될 인접 실자산"** 으로 정의한다.

| 회귀 측정 대상 (실자산) | file:line | 후퇴 시 증상 |
|---|---|---|
| ★`PM/Dependencies::validateDependency` | `:79-100`(반복 DFS+visited+tenant 필터+깊이캡 10000+**쓰기 전 차단** `:32-34`→422 `cycle_detected`+self-loop `:29-31`) | 순환 태스크 의존성 허용 |
| ★`PM/Gantt` Kahn 위상정렬 | `:104-125`(+`count($topo)!==count($taskMap)` 정석 판정 + 순환 시 **부분결과+경고 degrade**) | 간트 500 또는 오정렬 |
| ★`EnterpriseAuth` SSO/SCIM | OIDC/SAML/SCIM · `routes.php:915-932`+`$register :2383-2400` · 리플레이 방어 `:56` · KEK 회전 | **엔터프라이즈 로그인 붕괴** |
| `TeamPermissions` 스코프 | `scopeSql*` 직접 호출 **5곳**(`AdPerformance.php:26`·`Wms.php:1291`·`Catalog.php:981`,`:982`,`:983`) + 래퍼 `scopeChannelProduct`(`OrderHub.php:261`→`:315-322`) · `clampActions:382-389`,`:396-402` | 데이터 노출 또는 과차단 |
| `team` CRUD + `seedOrg` | `routes.php:1589`+`$register :2565-2571` · `seedOrg:725-753`(동명 skip 멱등·트랜잭션·감사 `:747`) | 팀 관리 UI 붕괴 |
| `app_user.parent_user_id` 소비처 | `resolveTenantId:200-217` → `Rollup.php:56`·`ChannelSync.php:72`·`ChannelCreds.php:85`·`BillingMethod.php:88`·`AgencyPortal.php:478`·`PlanLimits.php:36-37` | 🔴 **테넌트 해석 붕괴 = 전 메뉴 공백**(286차 사고 유형) |
| `menu_tree` + `wouldCycle` | `AdminMenu.php:108-117`·`:540-555` | 관리자 메뉴 붕괴 |
| `agency_client_link` fail-closed | `resolveAccessContext:414-432` · `index.php:85-90` 403 · `:92-96` write 403 · `:100` role 합성 | **대행사 권한 우회** |
| `graph_node`/`graph_edge` | `Db.php:816-839` · `routes.php:721-729` | 마케팅 귀속 스코어 붕괴 |

★**최고 위험 = `resolveTenantId`(`UserAuth.php:200-217`).** 조직 계층은 `parent_user_id` 를 만지고 싶어지는 유일한 컬럼이고, 그 컬럼은 **테넌트 해석의 단일 홉 경로**다. **286차 `platform_growth` act-as 사고**(admin 최고관리자 전 메뉴 빈 화면 — 요청 시점 tenant 해석이 뒤집혀 발생)가 정확히 이 축에서 났다. 🔴 **`parent_user_id` 의 owner 직속 2단 봉인을 깨서 3단을 만들면, `resolveTenantId` 의 1홉 조회가 조용히 틀린 테넌트를 반환한다** — 재귀가 없기 때문이다. **이것이 §79 회귀 게이트의 1순위다.**

### 0.3 ★`EquivalenceProof` 선행 — 협상 대상 아님

조직 계층은 **`PM/Dependencies`/`PM/Gantt` 의 순환검출·위상정렬을 확장**하고 **`EnterpriseAuth` 의 그룹 수신 경로를 확장**한다(§64/§65 정본 — 신설 금지). **확장 전후 동일 입력 → 동일 판정 증명이 선행한다.**

- 근거: **286차 rank 맵 붕괴** — 동등해 보이는 재배치가 실제 판정을 바꿨다.
- 근거: **289차 5-3-2 G-01** — `Mapping::actorId` 가 닫은 우회로(익명 2회 = 정족수)가 재작성으로 다시 열릴 뻔했다. **위치 이동은 신규 작성이 아니다.**
- ★조직 고유 근거: **`validateDependency` 는 레포 최고 품질**(쓰기 전 차단 + tenant 필터 + 깊이캡)이다. **일반화하면서 이 4개 중 하나라도 조용히 빠지면 회귀 탐지가 불가능하다** — 순환은 **쓰기 시점이 아니라 조회 시점**에 폭발하기 때문이다.
- → `EquivalenceProof` 없는 확장은 §79 통과 주장 자체가 불가하며, **`BLOCKED_MIGRATION_RISK`** 로 판정한다.

### 0.4 🔴 `ENFORCED(예방)` 등급이 현행 레포에 없다 (G-06b)

§79-32 는 **"최소 Static Lint·Runtime Guard 가 작동하는가"** 를 묻는다. **작동은 두 등급이 있다.**

| 등급 | 의미 | 현행 |
|---|---|---|
| `DETECTED`(탐지) | 위반을 **사후 통보** | `security-scan.yml` `repo-guards` 잡 실행(차단 게이트·`continue-on-error` 없음 — 289차 ④) |
| `ENFORCED`(예방) | 위반을 **머지·배포 전에 차단** | 🔴 **현행 레포에 이 등급 없음** |

**G-06b 실측**: **브랜치 보호·required check 부재** → master **직 push 시 `repo-guards` 실패가 배포를 막지 못하고 사후 통보만** 한다(`deploy.yml` 은 독립 트리거) · **`--no-verify` 도 여전히 유효**. **GitHub 저장소 설정 = 코드로 해결 불가 · 사용자 결정사항.**

🔴 ★**"CI 가드 있음 = 안전"으로 읽으면 275차 오독의 재현이다.** §79-32 는 현재 **`DETECTED` 까지만 도달 가능**하며, `ENFORCED` 승격은 **브랜치 보호 선결(사용자 결정 G-06b)** 이다. **이 문서는 §79-32 를 "통과"로 적지 않는다.**

## 1. 원문 전사 + 판정 — **원문 36종**

| # | 원문 게이트 | 현행 대조 (인접 실자산 — **통과 아님**) | 판정 |
|---|---|---|---|
| 1 | Canonical Organization Registry가 구축되었는가 | 레지스트리 **0**. 인접 = `ORG_PRESET` 15단위(`TeamPermissions.php:706-722`) = **구조가 아니라 열거** | `CONTRACT_ONLY` |
| 2 | Organization Unit과 Unit Version이 분리되는가 | Unit·Version **양쪽 결번**. 엔티티 version 축 = `menu_defaults.version` **단 1건**(`AdminMenu.php:120`) | `CONTRACT_ONLY` |
| 3 | Organization Type이 Registry화되었는가 | 인접 = `TEAM_TYPES` 17종(`TeamPermissions.php:44-49`) = **코드 상수 · 평면 문자열 카탈로그** | `CONTRACT_ONLY` |
| 4 | Relationship Type이 Registry화되었는가 | 관계 타입 축 **0**. 인접 = `graph_edge.edge_label`(`Db.php:834`) **자유문자열** | `CONTRACT_ONLY` |
| 5 | 단일 Parent Tree가 아닌 Graph를 지원하는가 | ★**Node/Edge 분리 실자산 존재**(`graph_node`/`graph_edge` `Db.php:816-839`) — 🔴 **그러나 조직 커버 아님**: `node_type` 화이트리스트 `['influencer','creative','sku','order']` **422**(`GraphScore.php:57-60`) | `CONTRACT_ONLY` + `KEEP_SEPARATE_WITH_REASON` |
| 6 | Organization Hierarchy와 Version이 분리되는가 | `hierarch` grep **0** | `CONTRACT_ONLY` |
| 7 | Active Hierarchy Version이 Immutable한가 | **immutable 축 0**. 선례 = `schema_migrations.checksum`(`Migrate.php:50` `hash('sha256',$sql)`·`:63-64`·`:145`/`:151`) — 🔴 `menu_defaults` 는 **immutable_hash 없음** | `CONTRACT_ONLY` + `VALIDATED_LEGACY`(패턴) |
| 8 | Graph Node·Edge가 구축되었는가 | 마케팅 도메인 REAL(9라우트 `routes.php:721-729`+`$register :2306-2314`) · **조직 0**. ⚠️ **내부 생산자 0**(VACUOUS 미배제) · ⚠️ `graph_node` **인덱스·UNIQUE 0**(`Db.php:816-825`) | `CONTRACT_ONLY` + `UNVERIFIED` |
| 9 | Ancestor·Descendant Path Index가 구축되었는가 | 🔴 **전례 0** — Closure(`closure`/`ancestor`/`descendant`/`graph_path`) **0** · Materialized Path **컬럼 0** · Nested Set(`lft`/`rgt`) **0**. 현행 대체물 = `scoreInfluencer:187-240` **하드코딩 3-hop** · **N+1**(`:207-219`) | `CONTRACT_ONLY`(**순수 신규**) |
| 10 | Hierarchy Type별 Primary Parent 규칙이 적용되는가 | **Primary/Secondary 축 0.** `app_user.parent_user_id` 는 **유일 부모 간선이나 owner 직속 2단 봉인**(3단 생성 경로 부재) | `CONTRACT_ONLY` |
| 11 | Cross-Tenant Edge가 차단되는가 | ★**격리 강제 REAL**(`index.php:600` 무조건 덮어쓰기 · `:429-442` · fail-closed `:585` · `X-Act-As-Tenant` 는 **하드코딩 스위치** `UserAuth.php:397-400`). 🔴 **단 트리 자산 2개가 크로스테넌트**: `menu_tree` **`tenant_id` 컬럼 없음** · `menu_defaults` **전역 1행** | `CONTRACT_ONLY` + `BLOCKED_CROSS_TENANT`(`menu_tree` 전용 시) |
| 12 | Tenant·Workspace Binding이 구분되는가 | **워크스페이스 축 0.** 테넌트 = **구독 단위 · 마스터 테이블 없음**(`api_key.tenant_id VARCHAR(100)` **FK 없음** `Db.php:944` · `'acct_'.$id` 문자열 생성 `UserAuth.php:220-224` · 열거 = `SELECT DISTINCT tenant_id` **19개소 역추론**) | `CONTRACT_ONLY` |
| 13 | Legal Entity 관계가 운영·자금·회계·정산·지급 책임으로 구분되는가 | **법인 엔티티 0**(사업자정보 = `app_user` 평문 필드 `UserAuth.php:499`·`:1720` · `biz_no`/`brn`/`corp_reg`/`tax_id` **0**). 🔴 `'company'` = **무제한 센티넬**(`TeamPermissions.php:258`) · 🔴 **"테넌트=법인" 가정 = 역산**(plan 은 owner 계정에서 `PlanLimits.php:36-37`) | `CONTRACT_ONLY` |
| 14 | Business Unit·Division·Department가 구분되는가 | **3축 전부 0.** `business_unit` 유일 히트 = **Trustpilot 자격증명**(`ChannelSync.php:2573-2580`) — **재플래그 금지** | `CONTRACT_ONLY` |
| 15 | Team·Squad가 구분되는가 | `team` **1개 REAL**(`TeamPermissions.php:145-151`/`:168`) · `squad` grep **0** → **구분할 대상이 한쪽뿐** | `CONTRACT_ONLY` + `PARTIAL`(`team`) |
| 16 | Region·Country Binding이 명시적인가 | 🔴 **binding 0** · `region` **3축 병존**(광고 인구통계 `Db.php:681,690` / **Amazon Ads 엔드포인트 na·eu·fe** `Connectors.php:2704-2710` / **WMS 시·도** `Wms.php:129`·`regionOf():284-286`) · `APAC`/`EMEA`/`AMERICAS`/`LATAM` **0** · parent region **0** · `Geo` = **Country→언어** 매핑(`Geo.php:23-53` · ★`:19` 는 `class Geo {`) · **Country→Region 매핑 코드 0건** | `CONTRACT_ONLY` — 🔴 **`region` 어휘 한정 필수** |
| 17 | Brand 소유와 운영 조직이 구분되는가 | **양축 부재.** `catalog_brand`(`Catalog.php:151-169`)는 **11번가 상품등록 필수 브랜드코드**(`BRAND_REQUIRED_CHANNELS=['11st','st11']` `:415`) = **상품속성** · §32 15필수필드 중 실재 = `brand id`(name/code) 뿐 | `CONTRACT_ONLY` + `KEEP_SEPARATE_WITH_REASON` |
| 18 | Store·Merchant 관계가 구축되는가 | **KV_ONLY** — `commerce_product_daily.store_id` **자유문자열**(`Insights.php:114`·dedup `:125`) · `shop_id`/`seller_id`/`vendor_id` = **`channel_credential` KV**(`Db.php:976-982`) · `merchant_promotion` 은 **`merchant_id` 컬럼조차 없음**(`Promotion.php:51-60`) | `CONTRACT_ONLY` + `KV_ONLY`/`NAME_ONLY` |
| 19 | Vendor·Partner가 내부 조직과 외부 Party로 구분되는가 | **평면 2벌**: `wms_suppliers`(`Wms.php:105` · SSOT 선언 `SupplyChain.php:243` · `sc_suppliers.wms_id` `:88`) **parent 없음** → `PARTIAL`(vendor type·legal entity relationship·contract·country scope·approval hierarchy·valid_from/to·evidence **부재**) · `partner_account`(`PartnerPortal.php:52-59`) `TYPES=['supplier','logistics','warehouse']`(`:29`) ↔ §36 `PARTNERSHIP_TYPE` 12종 **교집합 0** | `CONTRACT_ONLY` + `PARTIAL` + `KEEP_SEPARATE_WITH_REASON` |
| 20 | Cost Center·Profit Center Binding이 구축되는가 | `cost_center`·`profit_center` grep **0**. 인접 = `pnl_vat_summary` tenant 키(`Pnl.php:402-423`) = **구독자별 리포트이지 법인 회계 아님** | `CONTRACT_ONLY` |
| 21 | Position Unit Foundation이 구축되는가 | `position_unit` **0** · `reports_to` **0** · `manager_id` **0**(단 `team.manager_user_id` = **팀 담당자 포인터**) | `CONTRACT_ONLY` |
| 22 | Matrix Relationship이 Primary Hierarchy와 구분되는가 | `matrix_` **0**. ★**Primary Hierarchy 자체가 없으므로 구분할 대상도 없다** | `CONTRACT_ONLY` |
| 23 | Organization Owner와 Manager가 구분되는가 | 🔴 **두 축이 융합** — `team.manager_user_id` 1개 컬럼(`:145-151`) + `parent_user_id IS NULL` owner(`PlanLimits.php:36-37`). **소유↔관리 분리 축 0** | `CONTRACT_ONLY` + `PARTIAL` |
| 24 | Subject Membership이 Effective-dated인가 | 🔴 **멤버십 3벌 전부 effective date 없음**(`team_member` · `app_user.parent_user_id` · `agency_client_link`). `agency_client_link` 만 시점 컬럼 보유(`invited_at`/`approved_at`/`revoked_at` `AgencyPortal.php:64-72`)하나 **as-of 조회 없음** | `CONTRACT_ONLY`(**순수 신규**) |
| 25 | Future-dated Organization Change가 지원되는가 | **미래 행 개념 0.** effective date 축 = `kr_fee_rule.effective_from`(`Db.php:898`) **전 코드베이스 유일** · 🔴 **`WHERE effective_from <= :as_of` 전역 0건** · **`effective_to` 없음** → **폐구간 모델 신규** | `CONTRACT_ONLY`(**순수 신규**) |
| 26 | Retroactive Correction이 Version으로 기록되는가 | 🔴 **집행 수단 부재.** `backend/migrations/` **172차 정지**(최신 `20260527_172_002_coupon_tables.sql`) → 전 스키마가 `ensureTables` 자가치유이며 ★**`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다** → **§46 Retroactive 재계산은 현재 집행 수단이 없다** | `CONTRACT_ONLY` — ★**§14 제약 직격** |
| 27 | 과거 Version이 덮어써지지 않는가 | ★**구조적 등가 위반 실재**: `kr_fee_rule` 은 새 행을 추가하나 **읽기가 전부 최신승**(`Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`) → **과거 행 조회 불가 = 실질적으로 덮어쓴 것과 동일**. `Pnl.php:449` 가 기간을 받고도 `:454` 는 무시 → **과거 기간 P&L 이 오늘자 VAT율로 계산**. ⚠️ **주석 `:451` 이 의도 명시 → 설계 선택일 수 있음 · 등급 미부여 · 라이브 확인 필요** | `UNVERIFIED` — **관찰 사실 등재** |
| 28 | Approval 시점 Organization Snapshot이 생성되는가 | **승인 도메인에 조직 트리 0**(§65 #22 — 승인자 결정 = **정족수 카운트** `Mapping.php:287`). 선례 = `menu_defaults(snapshot_data JSON, version, created_at)`(`AdminMenu.php:120`·생성 `:308`·복원 `:584-590`) · `pm_baseline(snapshot_json, captured_at)`(`PM\Enterprise.php:55`·`:360-364` — ★`captured_at` 명명이 §48 필드와 정확히 일치) | `CONTRACT_ONLY` + `VALIDATED_LEGACY`(패턴) |
| 29 | Hierarchy Candidate가 생성되는가 | **candidate 축 0** | `CONTRACT_ONLY` |
| 30 | Cycle·Orphan·Unreachable Node가 탐지되는가 | ★**Cycle 만 실자산 · 품질 편차 극심**: `PM/Dependencies:79-100`(**쓰기 전 차단** — 최상급) · `menu_tree::wouldCycle:540-555`(깊이캡 100 · 자기참조 즉시 차단 `:542`) · `PM/Gantt:104-125`(Kahn) — 🔴 **`graph_edge` 순환 방어 0** · `journeys.edges` = **런타임 방문집합만**(`JourneyBuilder.php:511-518` · 작성자 JSON 무검증 자인). **Orphan·Unreachable 탐지 = 전 구현 0** | `CONTRACT_ONLY`(Orphan·Unreachable) + ★`VALIDATED_LEGACY`(Cycle 알고리즘 — **재구현 금지**) |
| 31 | HRIS·ERP·IdP·Canonical Reconciliation이 작동하는가 | **IdP 만 REAL**(`EnterpriseAuth` — ★**내 브리핑 오류 #1 이 뒤집힌 지점**). ★**HRIS·ERP 부재 능력축 증명**: `ChannelRegistry.php:12`,`:79` `group_type`=sales/marketing/logistics/pg/messaging · `sync_kind`=commerce/ad/messaging/none + analytics(`:112`)·cs(`:116`)·esp(`:121`)·review(`:125`) → **`erp`·`finance`·`hr` 값이 열거에 없다** · 헌법 Vol2(`:71`)는 **이름만** · `backend/migrations/` 전량 grep 0. **Reconciliation = 소스 1개라 성립 안 함** | `CONTRACT_ONLY` + ★`VALIDATED_EXTERNAL_SOURCE`(IdP — **확장 강제**) |
| 32 | 최소 Static Lint·Runtime Guard가 작동하는가 | 🔴 **`ENFORCED(예방)` 등급 현행 부재**(G-06b) — `security-scan.yml` `repo-guards` 는 **차단 게이트로 실행되나**(289차 ④), **브랜치 보호·required check 부재** → master 직 push 시 **배포를 막지 못하고 사후 통보만**(`deploy.yml` 독립 트리거) · **`--no-verify` 유효**. **GitHub 저장소 설정 = 코드로 해결 불가 · 사용자 결정** | `PARTIAL`(`DETECTED` 까지만) — 🔴 **"CI 가드 있음 = 안전" = 275차 오독 재현** |
| 33 | 기존 Organization 기능의 회귀가 없는가 | 🔴🔴 **★최대 함정 — 회귀 기준선이 0 이다**(조직 기능 결번). **분모 0 이면 어떤 결과물도 자동 통과**. → 기준선을 **인접 실자산 9종**(§0.2)으로 재정의. **1순위 = `resolveTenantId`(`UserAuth.php:200-217`)** — `parent_user_id` 2단 봉인을 깨면 **1홉 조회가 조용히 틀린 테넌트를 반환**(재귀 없음) = **286차 전 메뉴 공백 사고 유형** | `CONTRACT_ONLY` — ★**§0.2 기준선 필수** |
| 34 | 중복 Organization Tree가 생성되지 않았는가 | **현재 조직 트리 0** → 자명 통과처럼 보이나 🔴 **이것이야말로 가짜 녹색이다**(없어서 중복이 없다). **실 위험 = 신설 시 중복 10종**(§65 §2 표: 그래프 스토어·순환검출·위상정렬·트리·IdP·스코프 바인딩·에러 봉투·해시체인·스냅샷·immutable_hash) | `CONTRACT_ONLY` — 🔴 **§65 중복 10종 표 대조 필수** |
| 35 | ADR·PM·Repeat Problem·Agent History가 갱신되었는가 | 문서 축(본 세션 산출). ADR = `ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md` | `CONTRACT_ONLY` |
| 36 | 다음 Reporting Line·Manager Relationship 단계가 실행 가능한가 | 🔴 **전제 부재** — `reports_to` **0** · `manager_id` **0** · `parent_user_id` 는 **보고선이 아니다**(owner 직속 2단 봉인 · 용도 = 한 테넌트 안의 사용자 트리 + owner→member tenant 상속). **다음 단계는 이 블록의 Position Unit·Membership 결번 해소에 전적으로 의존** | `CONTRACT_ONLY` |

**실측 개수: 36 / 36 전사.** 원문 개수와 전사 개수 **일치**.

**커버리지**: **`CONTRACT_ONLY` 34**(실 코드 0 — **전건 정직 등급**) · `PARTIAL` 1(#32 — `DETECTED` 까지만) · `UNVERIFIED` 1(#27) · 부수 배정 `VALIDATED_LEGACY` 4(순환 알고리즘·스냅샷 패턴·해시 패턴·IdP) · `KEEP_SEPARATE_WITH_REASON` 3 · `BLOCKED_CROSS_TENANT` 1 · `KV_ONLY`/`NAME_ONLY` 1.

🔴 **통과 게이트 = 0 / 36.** 이 문서는 **게이트 계약을 확정할 뿐 통과를 주장하지 않는다.**

## 2. 규칙

- 🔴🔴 **전건 `CONTRACT_ONLY` — 가짜 녹색 금지.** 5-3-3-1 은 **코드변경 0** 이다. **인접 실자산의 존재를 게이트 통과로 계상하지 마라** — 288차가 확정한 **가짜 녹색 systemic**(ChannelSync 14채널 18개소가 하드 실패에 `ok=>true` 위장)의 문서판이 정확히 이것이다.
- 🔴🔴 **#33(기능 회귀 0)의 분모가 0 이다 — 자동 통과를 통과로 읽지 마라.** 조직 기능은 **애초에 존재한 적이 없다**(`git log --all -S "org_unit"` 0). **회귀 기준선을 "조직 기능"으로 두면 어떤 결과물도 후퇴가 없다.** 기준선은 **§0.2 인접 실자산 9종**이다.
- 🔴 **#33 1순위 = `resolveTenantId`(`UserAuth.php:200-217`).** 조직 계층이 만지고 싶어지는 유일한 컬럼(`parent_user_id`)이 **테넌트 해석의 단일 홉 경로**다. **2단 봉인을 깨서 3단을 만들면 1홉 조회가 조용히 틀린 테넌트를 반환한다** — 재귀가 없기 때문이며, **에러가 아니라 오답으로 나온다.** 286차 사고(전 메뉴 공백)와 동일 축이다. **소비처 6곳**(`Rollup.php:56`·`ChannelSync.php:72`·`ChannelCreds.php:85`·`BillingMethod.php:88`·`AgencyPortal.php:478`·`PlanLimits.php:36-37`) 전부가 회귀 대상이다.
- 🔴 **#34(중복 트리 없음)를 자명 통과로 적지 마라 — 그것이 가짜 녹색의 교과서 사례다.** 현재 중복이 없는 이유는 **조직 트리가 0개**라서다. **실 위험은 신설 순간 발생하는 중복 10종**이며, 반드시 [DSAR_ORGANIZATION_HIERARCHY_DUPLICATE_IMPLEMENTATION_AUDIT.md](DSAR_ORGANIZATION_HIERARCHY_DUPLICATE_IMPLEMENTATION_AUDIT.md) §2 표와 대조하라.
- 🔴 **`EquivalenceProof` 선행 없이 `PM/Dependencies`·`PM/Gantt`·`EnterpriseAuth` 확장 금지 → `BLOCKED_MIGRATION_RISK`.** 286차 rank 맵 붕괴 재현 방지다. ★조직 고유 근거: **순환은 쓰기 시점이 아니라 조회 시점에 폭발한다** — `validateDependency` 의 4요소(반복 DFS+visited+**tenant 필터**+깊이캡+**쓰기 전 차단**) 중 하나라도 일반화 과정에서 조용히 빠지면 **회귀를 탐지할 방법이 없다.**
- 🔴 **#32 를 "통과"로 적지 마라 — `ENFORCED(예방)` 등급이 현행 레포에 없다(G-06b).** `repo-guards` 는 **탐지일 뿐 예방이 아니다**: 브랜치 보호·required check 부재 → master 직 push 시 **배포를 막지 못하고 사후 통보만** 하며 `--no-verify` 도 유효하다. **GitHub 저장소 설정 = 코드로 해결 불가 · 사용자 결정사항.** ★**"CI 가드 있음 = 안전" = 275차 오독의 재현.**
- 🔴 **#26(Retroactive Correction)은 집행 수단이 없다 — §14 제약 직격.** `backend/migrations/` 는 **172차 정지**이고 `ensureTables` 는 **테이블 생성만 하고 데이터 변환·백필을 하지 않는다.** 조직 스키마는 `ensureTables` 멱등 `CREATE TABLE IF NOT EXISTS`+`try{ALTER}catch{}`(`Db.php:1123-1127`·`CRM.php:109`)로 들어가야 하며 **MySQL/SQLite 2방언 수기 중복 작성 의무**(`CRM.php:48` vs `:77`)다. **"마이그레이션으로 백필하면 됨"은 성립하지 않는 경로다.**
- 🔴 **#31 은 IdP 만 REAL 이다 — `EnterpriseAuth` 확장 강제 · 커넥터 신설 = 헌법 위반.** ★**이 지점이 내 초판 브리핑 오류 #1**(SSO/SCIM = `ABSENT` 예측)이 실측에 뒤집힌 곳이다. 확장 지점은 **`scimListGroups:417-423` 을 GET 전용에서 인입 경로로 넓히는 것**이다. **HRIS·ERP 는 `ChannelRegistry` 열거(`:12`,`:79`)에 `erp`·`finance`·`hr` 값이 없다는 능력축 증명으로 부재 확정** — 헌법 Vol2(`:71`)에 이름이 있다는 사실을 구현 근거로 삼지 마라(**규율 10: 문서를 근거로 삼지 말고 정의부를 Read 하라**).
- 🔴 **#5·#8 을 `graph_node`/`graph_edge` 로 통과 주장 금지.** 도메인 판단 이전에 **코드가 거부한다**(`GraphScore.php:57-60` 422). **§66 선례로만 인용하라.**
- 🔴 **회귀 테스트 커버리지가 0 이다** — `tools/e2e/` 3종에 `organization\|hierarchy\|org_unit\|sso\|scim` grep **0**. **#33 을 자동으로 검증할 수단이 현재 없다.** 조직 구현 세션은 **e2e 시나리오 신설을 산출물에 포함**해야 하며(`reference_e2e_smoke`: 매 배포 전후 `npm run e2e`·`e2e:render`), 특히 **`resolveTenantId` 경로와 `EnterpriseAuth` 로그인**을 커버해야 한다.
- ⚠️ **미확정 5건 — §79 통과 주장 시 반드시 라이브 검증**: `graph_node`/`graph_edge` **내부 생산자 0**(VACUOUS 미배제) · `menu_tree` **운영 0행 가능성**(`AdminMenuManager.jsx:252`·`:341` · `reorder` 프론트 호출자 0) · `data_scope` **런타임 행 수 미확인**(0 이면 5곳 배선 no-op → **"실사용 중인 ABAC"으로 단정 금지**) · `agency_client_link` **실 데이터 미확인** · **라이브 SQLite 버전 미실측**(재귀 CTE 가능성은 **추론이며 사실로 인용 금지**).
- **오탐 재플래그 금지**: `business_unit_id`(Trustpilot) · `company_id`(Adobe Analytics) · `quota`(AI 한도) · `po_*`(Price Optimization) · `Geo.php:19`(**`class Geo {` 줄**) · `region` 3축(정상 설계) · `wms_bins` `level`(물리 선반단) · `plan_period_pricing.period_months`(구독 기간 상품 옵션 — **§44 선례 아님**) · `st11 seller_id` 실사용(288차 기각).
