# DSAR — Organization Category (§8)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §8 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `organization_category` 컬럼 | **grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| **최근접 열거 = `TEAM_TYPES`** | 17종 **평면 문자열**(TeamPermissions.php:44-49): `internal_super·brand·marketing·marketing_global·marketing_domestic·sales·sales_global·sales_domestic·sales_enterprise·sales_channel·logistics·finance·partner_agency·partner_live·partner_supplier·partner_distribution·custom` · 주석 :43 *"자유 입력도 허용하되 카탈로그로 안내"* | `KEEP_SEPARATE_WITH_REASON` |
| ↑ **축 대조** | ★**`TEAM_TYPES` 는 Category 가 아니라 기능(function) 라벨**이다 — 원문 35 Category 는 **조직의 종류**(법인/사업부/부서/지역/브랜드…), `TEAM_TYPES` 는 **팀이 하는 일**(마케팅/영업/물류). **전 35종과 교집합 0** | **축 상이** |
| `DATA_SCOPES` | 9종(TeamPermissions.php:41): `company·brand·team·campaign·product·channel·warehouse·partner·own` — **인가 필터 차원**이지 조직 분류 아님 | `KEEP_SEPARATE_WITH_REASON` |
| Category 전용 열거 | `ENTERPRISE`/`HOLDING_COMPANY`/`CORPORATE_GROUP`/`SUBSIDIARY`/`BRANCH`/`DIVISION`/`DEPARTMENT`/`SQUAD`/`PROGRAM`/`SHARED_SERVICE`/`TERRITORY`/`POSITION_UNIT`/`COMMITTEE_REFERENCE`/`VIRTUAL_ORGANIZATION` — **backend/src grep 0 또는 무관 히트** | `NOT_APPLICABLE` |

**★최대 함정 — `DATA_SCOPES` 의 `'company'` 를 `LEGAL_ENTITY`/`ENTERPRISE` Category 로 계산하면 의미가 정반대가 된다.** `effectiveScope():258` — `if ($st === 'company') return null; // 전사 = 무제한`. **법인 경계를 긋는 게 아니라 지운다.** 이름만 보고 분류축으로 환산하는 것이 이 축의 가장 큰 역산 위험이다.

**★대칭 오류 경계 — 이름 유사 3건 주의.** `brand`·`partner`·`warehouse` 는 `TEAM_TYPES`/`DATA_SCOPES` 에 문자열로 존재하지만, 원문의 `BRAND`/`PARTNER`/(창고 계층)와 **의미가 다르다**. 각각 팀 기능 라벨 · 인가 필터 차원이며 **조직 분류가 아니다** → 커버로 계산 금지.

## 1. 원문 전사 + 판정 — **원문 35종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | ENTERPRISE | 부재 · ★`DATA_SCOPES` `'company'`(:41)는 **무제한 센티넬**(`effectiveScope():258` `return null`) — 정반대 의미 | `NOT_APPLICABLE` |
| 2 | HOLDING_COMPANY | 부재 — grep 0 | `NOT_APPLICABLE` |
| 3 | CORPORATE_GROUP | 부재 — grep 0 · `group_type`(ChannelRegistry.php:12·:79)은 **채널 분류**(sales/marketing/logistics/pg/messaging) | `NOT_APPLICABLE` |
| 4 | LEGAL_ENTITY | 부재 — `legal_entity` grep 0 · 사업자정보 = `app_user` **프로필 평문 필드**(`business_number`·`ceo_name`·`country` UserAuth.php:499·:1720) · `biz_no`/`brn`/`corp_reg`/`tax_id` **전부 0건** → 법인 엔티티 아님 | `NOT_APPLICABLE` |
| 5 | SUBSIDIARY | 부재 — grep 0 | `NOT_APPLICABLE` |
| 6 | BRANCH | 부재 — grep 0 | `NOT_APPLICABLE` |
| 7 | BUSINESS_UNIT | 부재 — ★**유일 히트 = Trustpilot 리뷰 API 자격증명 `business_unit_id`**(ChannelSync.php:2573-2580 · ChannelRegistry.php:126) — **무관** | `NOT_APPLICABLE` |
| 8 | DIVISION | 부재 — `division` grep 0 | `NOT_APPLICABLE` |
| 9 | DEPARTMENT | 부재 — `department` grep 0 | `NOT_APPLICABLE` |
| 10 | TEAM | ★**실재 — `team` 테이블**(TeamPermissions.php:145-151/:168) · `ORG_PRESET` 15단위(:706-722) · `seedOrg`(:725-753) · 실배선(routes.php:1589·:2570·teamApi.js:261). 단 **Category 값으로서가 아니라 유일한 조직 엔티티 그 자체** — 35종 중 이것만 있다는 것은 **분류축이 없다는 뜻** | `PARTIAL` |
| 11 | SQUAD | 부재 — `squad` grep 0 | `NOT_APPLICABLE` |
| 12 | PROJECT | 부재(조직) · 인접 = PM 도메인(`pm_task_dependencies`·`PM\Gantt`·`pm_baseline` PM\Enterprise.php:55) — **작업 관리이지 조직 단위 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 13 | PROGRAM | 부재 — grep 0 | `NOT_APPLICABLE` |
| 14 | FUNCTION | 부재(분류) · ★역설적으로 **`TEAM_TYPES` 17종이 사실상 이 축**(marketing/sales/logistics/finance) — 그러나 **Category 컬럼이 아니라 `team.team_type` 평면 문자열**(:147) | `KV_ONLY` |
| 15 | SHARED_SERVICE | 부재 — grep 0 | `NOT_APPLICABLE` |
| 16 | REGION | 부재(조직) — ★`region` **3축 병존**: 광고 오디언스 인구통계(Db.php:681,690) / **Amazon Ads API 엔드포인트 na·eu·fe**(Connectors.php:2704-2710) / **WMS 창고 시·도**(Wms.php:129·`regionOf()` :284-286). **`APAC`/`EMEA`/`AMERICAS`/`LATAM` grep 0** · **parent region 컬럼 0** · Country↔Region binding 0 | `KEEP_SEPARATE_WITH_REASON` |
| 17 | COUNTRY | 부재(조직) · 인접 `Geo`(Geo.php:23-53 `lang()` · IP :56-60 · `SUPPORTED` 15언어 :21) = **IP→ISO alpha-2→언어** 매핑(`COUNTRY_LANG_MAP`) → 국가→**언어**이지 국가→**조직/지역** 아님. ★**Country→Region 매핑 코드 0건** | `KEEP_SEPARATE_WITH_REASON` |
| 18 | AREA | 부재 — grep 0 · `wms_bins` 의 `zone/aisle`(Wms.php:193-194)은 **물리 선반 좌표** | `NOT_APPLICABLE` |
| 19 | TERRITORY | 부재 — grep 0 · 영업 territory 개념 전무(`ORG_PRESET` 영업팀 5종 :711-715 은 **권한 프리셋**) | `NOT_APPLICABLE` |
| 20 | BRAND | 부재(조직) · 인접 `catalog_brand`(Catalog.php:151-169) = `tenant_id·name·code` · `UNIQUE(tenant_id,name)` · CRUD :443-465 · `ensureBrand()` :427 — ★**목적 = 11번가 상품등록 필수 브랜드코드**(`BRAND_REQUIRED_CHANNELS=['11st','st11']` :415) → **상품속성이지 조직 아님** · `TEAM_TYPES` `'brand'`(:45)는 **팀 기능 라벨** | `KEEP_SEPARATE_WITH_REASON` |
| 21 | PRODUCT_LINE | 부재 — grep 0 · 상품 계층은 카탈로그 도메인 | `NOT_APPLICABLE` |
| 22 | STORE | **KV_ONLY** — `commerce_product_daily.store_id` **자유문자열**(Insights.php:114 · dedup :125) · `shop_id`(Shopee ChannelSync.php:1799) = **`channel_credential` KV 값**(Db.php:976-982 tenant+channel+key_name/value) → 엔티티 아님 | `KV_ONLY` |
| 23 | MERCHANT | **NAME_ONLY** — ★`merchant_promotion`(Promotion.php:51-60)은 **`merchant_id` 컬럼조차 없다**(접두어일 뿐) | `NAME_ONLY` |
| 24 | SELLER | **KV_ONLY** — `seller_id`(Yahoo ChannelSync.php:1956 · Qoo10 :1922 · ESM :2298) = **자격증명 KV 값**(Db.php:976-982) · 288차 **st11 `seller_id` 실사용 확인(오탐 기각)** | `KV_ONLY` |
| 25 | VENDOR | `PARTIAL` — `wms_suppliers`(Wms.php:105 · SSOT 선언 SupplyChain.php:243 · `sc_suppliers.wms_id` 링크 :88) = **외부 거래처 마스터**(tenant_id·name·contact·active) · **평면·parent 없음** · vendor type·legal entity relationship·contract·country scope·approval hierarchy·valid_from/to·evidence **부재** · `vendor_id`(쿠팡 Connectors.php:1263·ChannelSync.php:631)는 **자격증명 KV** | `PARTIAL` |
| 26 | PARTNER | 부재(조직 분류) · 인접 `partner_account`(PartnerPortal.php:52-59) = 외부 party 로그인 계정(tenant_id·partner_type·partner_id·partner_name·전용세션 :60·스코프 필수검증 :97-100·플랜한도 :104-110) · ★**`TYPES=['supplier','logistics','warehouse']`(:29)** ↔ 원문 Category 파트너 계열(PARTNER/DISTRIBUTOR/DEALER/RESELLER) **교집합 0** | `KEEP_SEPARATE_WITH_REASON` |
| 27 | DISTRIBUTOR | 부재 · 인접 `ORG_PRESET` '유통 파트너'(`partner_distribution` :721)·'유통/총판영업팀'(`sales_channel` :715) = **내부 `team` 행 + 권한 프리셋**이지 외부 조직 분류 아님 | `NOT_APPLICABLE` |
| 28 | DEALER | 부재 — grep 0 | `NOT_APPLICABLE` |
| 29 | RESELLER | 부재 — `partner_account.TYPES`(:29)에 없음 | `NOT_APPLICABLE` |
| 30 | COST_CENTER | 부재 — `cost_center` grep 0 | `NOT_APPLICABLE` |
| 31 | PROFIT_CENTER | 부재 — `profit_center` grep 0 · ★인접 `pnl_vat_summary` tenant 키(Pnl.php:402-423)는 **법인 회계가 아니라 구독자별 리포트** | `NOT_APPLICABLE` |
| 32 | POSITION_UNIT | 부재 — `position_unit` grep 0 · `reports_to` **0** · `manager_id` **0**(단 `team.manager_user_id` 존재 — **팀 관리자 1인**이지 직위 단위 아님) | `NOT_APPLICABLE` |
| 33 | COMMITTEE_REFERENCE | 부재 — grep 0 | `NOT_APPLICABLE` |
| 34 | VIRTUAL_ORGANIZATION | 부재 — grep 0 · `matrix_` grep 0 | `NOT_APPLICABLE` |
| 35 | CUSTOM | 부재(Category 확장점) · 인접 `TEAM_TYPES` 말미 `'custom'`(:48) + 주석 :43 *"자유 입력도 허용"* → **검증 없는 자유문자열**이지 거버넌스된 확장점 아님 | `LEGACY_ADAPTER` |

**실측 개수: 35 / 35 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · 부분 2(`TEAM`·`VENDOR`) · 도메인 상이 6 · KV 3 · 이름만 1 · 어댑터 1 · 부재 22.

## 2. 규칙

- 🔴 **`TEAM_TYPES` 17종을 원문 35 Category 에 매핑 금지 — 축이 다르다.** Category = **조직의 종류**(법인/사업부/부서/지역/브랜드), `TEAM_TYPES` = **팀이 하는 일**(마케팅/영업/물류). 매핑하면 형태 유사를 커버로 계산하는 역산이다. 정확히는 `TEAM_TYPES` 가 대응하는 것은 **`FUNCTION` 1종의 값 집합**이며, 그것도 **Category 컬럼이 아니라 `team.team_type` 평면 문자열**이다.
- 🔴 **`DATA_SCOPES` 의 `'company'` 를 `ENTERPRISE`/`LEGAL_ENTITY` 로 계산 금지 — 의미가 정반대다.** `effectiveScope():258` `if ($st === 'company') return null; // 전사 = 무제한` — **경계를 긋는 게 아니라 지운다.**
- 🔴 **`brand`·`partner`·`warehouse` 이름 일치를 커버로 계산 금지.** `catalog_brand` 는 **11번가 상품등록용 브랜드코드**(Catalog.php:415) · `partner_account.TYPES`(PartnerPortal.php:29)는 **외부 로그인 계정 3종** · `wms_bins` 의 `zone/aisle/rack/level/slot`(Wms.php:193-194)은 **고정깊이 물리 좌표**(`level`=선반단 ≠ 트리 depth · parent 없음) → **창고 계층 아님**.
- 🔴 **35종 중 34종을 "있다고 가정"하고 배선 금지.** 실재는 `TEAM` 1종뿐이며, 그것조차 **Category 값이 아니라 유일한 조직 엔티티**다.
- 🔴 **`crm_customers.identity_id` 를 조직 분류로 계산 금지 — 최대 함정.** union-find **등가류**(`resolveIdentitiesForTenant` CRM.php:597-643 — `roots`/`sizes` 클러스터링)이며 **등가관계는 대칭·추이적**, **계층은 반대칭 부분순서**다. `crm_identity_merge_link(a_id,b_id)`(:708-712)의 `UNIQUE(tenant_id,a_id,b_id)`도 **무방향 엣지**다. **동일성 해소이지 분류·계층이 아니다.**
- Category 신설 시 **`team.team_type` 을 대체하지 마라 — 직교 축으로 병치하라.** `team_type`(기능)은 `ORG_PRESET` 15행·`TEAM_TYPES` 17종·프론트가 이미 소비 중이다. Category(종류) 컬럼을 **추가**하고 기존 값은 전부 `TEAM` 으로 기본 부여하면 **무후퇴**다.
- ⚠️ **`ensureTables` 는 백필을 하지 않는다**(제약 2) → Category 기본값은 **DDL DEFAULT 로 선언**하라. 기존 15 시드행에 대한 소급 UPDATE 는 **집행 수단이 현재 없다.**
- `VENDOR` 확장은 **`wms_suppliers` 정본 재구현 금지**(SSOT 선언 SupplyChain.php:243) — 부족한 축(vendor type·legal entity·contract·country scope·approval hierarchy·valid_from/to·evidence)만 **덧붙여라**.
