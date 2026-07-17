# DSAR — Organization Brand Profile (§32)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §32 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `catalog_brand` DDL | `Catalog.php:151-169` — `id·tenant_id·name·code·created_at·updated_at` · `UNIQUE KEY uq_cb (tenant_id, name)` (MySQL) / `UNIQUE(tenant_id, name)` (SQLite) | `PARTIAL`(brand id 축만) |
| 브랜드 CRUD | `Catalog.php:443-465` (`GET /catalog/brands` — 사용 상품수 포함) · `saveBrand` `:465~` | 실배선 |
| 자동 등록 | `ensureBrand()` `Catalog.php:427` — 상품 저장 경로에서 멱등 호출 · 빈값 무시 · `mb_substr(...,0,190)` | 실배선 |
| ★**존재 목적** | `BRAND_REQUIRED_CHANNELS = ['11st', 'st11']` (`Catalog.php:415`) · 주석 `:149` *"code = 채널 브랜드코드(11번가 apiPrdAttrBrandCd 등, 선택). 없으면 name 을 그대로 전송"* | **상품속성** |
| `organization_unit` / `org_unit` | **backend/src 전역 0** (ⓑ 대전제) | `ABSENT` |
| `legal_entity` | **backend/src 전역 0** · 사업자정보는 `app_user` 평문 필드(`business_number`·`ceo_name`·`country` — `UserAuth.php:499`·`:1720`) | `ABSENT` |
| `cost_center`/`profit_center`/`matrix_`/`position_unit` | **PM 재확인 grep = 0건** | `ABSENT` |
| Region 축 | `region` 3축 병존(광고 인구통계 `Db.php:681`,`690` / Amazon Ads 엔드포인트 `Connectors.php:2704-2710` / WMS 시·도 `Wms.php:129`) · **parent region 컬럼 0 · Country↔Region binding 0** | `NAME_ONLY` |
| Country 축 | `Geo` = **IP→ISO alpha-2 → 언어** 매핑(`Geo.php:23-53`) · **Country→Region/조직 매핑 코드 0건** | `KEEP_SEPARATE_WITH_REASON` |
| Store/Merchant 축 | KV_ONLY (§33·§34 문서 참조) | `KV_ONLY` |

**★축 주의 — `catalog_brand` 는 조직이 아니라 상품속성이다.**
`catalog_brand` 는 **11번가 상품등록이 브랜드를 필수로 요구**(`Catalog.php:415`)해서 태어난 **채널 전송용 코드 테이블**이다. 주석 `Catalog.php:412-414` 이 그 연혁을 자인한다 — *"writeback payload 에만 잠깐 실려 카탈로그에 영속되지 않았고, 수집 상품(네이버 등)은 브랜드가 비어 있어 11번가 등록이 영구 거부됐다"*. **소유(ownership)·운영(operating)·승인(approval) 어느 축도 없다.** 이름이 `brand` 로 일치한다는 이유로 §32 커버로 계산하면 **역산**이다 → `PARTIAL`(brand id 축 1개만 실재) + 나머지 전 축 `ABSENT`.

## 1. 원문 전사 + 판정 — **원문 17종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | brand profile id | 부재 — `catalog_brand.id` 는 **브랜드 자체의 id**이지 프로필(관계 레코드) id 아님 | `NOT_APPLICABLE` |
| 2 | organization unit id | **`organization_unit` 전역 0** | `ABSENT` |
| 3 | brand id | **`catalog_brand.id`/`name`/`code`**(`Catalog.php:151-169`) — §32 중 **유일 실재 축** | `PARTIAL` |
| 4 | brand owner organization | 부재 — 소유 조직 개념 전무 | `ABSENT` |
| 5 | legal owner entity | **`legal_entity` 전역 0** · `app_user.business_number` 는 프로필 문자열(`UserAuth.php:499`) | `ABSENT` |
| 6 | operating entities | 부재 — 운영 주체 축 없음 | `ABSENT` |
| 7 | regions | `region` 3축 병존이나 **전부 무관**(광고 인구통계·Amazon 엔드포인트·WMS 시도) · parent region 0 | `NAME_ONLY` |
| 8 | countries | `Geo` = 국가→**언어** 매핑(`Geo.php:23-53`) · 국가→조직 매핑 0 | `KEEP_SEPARATE_WITH_REASON` |
| 9 | stores | `commerce_product_daily.store_id` **자유문자열**(`Insights.php:114` · dedup 키 `:125`) — 엔티티 아님 | `KV_ONLY` |
| 10 | merchants | `merchant_promotion` 은 **`merchant_id` 컬럼조차 없다**(`Promotion.php:51-60` — 접두어일 뿐) | `NAME_ONLY` |
| 11 | product lines | 부재 — `catalog_listing` 은 SKU 평면 · product line 축 0 | `ABSENT` |
| 12 | program scope | 부재 — `program` 축 0 | `ABSENT` |
| 13 | approval hierarchy reference | 부재 — 승인 계층 전역 0(5-3-2 §12 확정) | `ABSENT` |
| 14 | valid_from | 부재 — `catalog_brand` 는 `created_at`/`updated_at` **현재상태 전용** · effective date 선례는 `kr_fee_rule.effective_from`(`Db.php:898`) 단 1건 | `ABSENT` |
| 15 | valid_to | **`valid_to`/`effective_to` grep 0** → 폐구간 모델은 순수 신규 | `ABSENT` |
| 16 | status | 부재 — `catalog_brand` 에 status 컬럼 없음(`Catalog.php:151-169`) | `ABSENT` |
| 17 | evidence | 부재 | `ABSENT` |

**실측 개수: 17 / 17 전사.** 커버리지 = `PARTIAL` 1(brand id) · `KV_ONLY` 1 · `NAME_ONLY` 2 · `KEEP_SEPARATE_WITH_REASON` 1 · `NOT_APPLICABLE` 1 · `ABSENT` 11. **`VALIDATED_LEGACY` = 0.**

> ⚠️ **기지 실측 정정**: ⓒ 지시 브리핑은 §32 를 *"15필수필드"* 로 기술했으나 **원문 실측은 17개**(`SPEC…:1445-1461`). 15가 아니라 17이다. *"15필수필드 중 실재 = brand id 뿐"* 의 **결론(실재=brand id 1개)은 그대로 유효**하나 **분모는 17**이다. 규율 4(숫자를 조용히 맞추지 마라)에 따라 사실대로 기록한다.

## 2. 규칙

- 🔴 **`catalog_brand` 를 Brand Profile 로 승격하지 마라.** 이것은 **11번가 필수 브랜드코드 전송용 상품속성**(`Catalog.php:415`·주석 `:149`)이다. §32 의 17축 중 16축이 없다. 형태(이름) 일치를 커버로 계산 = **규율 9(능력 존재 ≠ 요구 충족) 위반**.
- 🔴 **`catalog_brand` 재구현·대체 금지(규율 12).** §32 를 구현하더라도 `catalog_brand` 는 **상품 등록 경로의 정본으로 존치**하고, Brand Profile 은 **`brand id` 로 이를 참조**하라. `ensureBrand()`(`:427`) 의 멱등 자동등록 경로를 끊으면 **11번가 등록이 영구 거부**되는 285차 회귀가 재발한다.
- **`UNIQUE(tenant_id, name)`**(`Catalog.php:158`·`:168`)가 이미 **테넌트 격리 + 이름 유일성**을 강제한다 → Brand Profile 의 `brand id` 참조는 **(tenant, name)** 또는 `catalog_brand.id` 를 키로 삼는다. **브랜드명 자유입력 재도입 금지** — 주석 `:414` 이 명시: *"자유입력만 두면 표기 흔들림(청정원/淸淨園/CJW)이 그대로 채널에 나간다"*.
- 🔴 **`regions`/`countries` 를 현행 `region`/`Geo` 로 배선하지 마라.** `region` 3축은 **광고 인구통계·Amazon Ads 엔드포인트·WMS 창고 시도**로 전부 도메인 상이하고, `Geo` 는 국가→**언어** 매핑이다. **`APAC`/`EMEA`/`AMERICAS`/`LATAM` grep 0 · parent region 0 · Country↔Region binding 0** → 지역 축은 **순수 신규**.
- 🔴 **`stores`/`merchants` 를 관계로 배선하지 마라** — 양쪽 다 엔티티가 아니다(§33·§34). `store_id` 는 자유문자열, `merchant_promotion` 에는 `merchant_id` 컬럼조차 없다.
- **원문 지시 준수**: *"Brand 관계를 Legal Entity 소유권과 운영 조직 관계로 분리하라"*(`SPEC…:1463`) → `legal owner entity`(소유) 와 `operating entities`(운영)는 **단일 필드로 병합 금지**. 현행에 **양쪽 다 없으므로** 신설 시 처음부터 2축으로 설계한다.
- **`valid_from`/`valid_to` 신설 시**: 선례는 `kr_fee_rule.effective_from`(`Db.php:898`) **단 1건**이며 그 읽기는 전부 `ORDER BY effective_from DESC LIMIT 1`(최신승 — `Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`)이다. **`WHERE effective_from <= :as_of` 술어는 backend/src 전역 0건** → **as-of 조회 능력은 신규**이며 `effective_to` 도 없으므로 **폐구간 모델 전체가 신규**다.
- **스키마 도입 제약**: `backend/migrations/` 는 **172차에서 정지**(최신 `20260527_172_002_coupon_tables.sql`) → 조직 스키마는 **`ensureTables` 멱등 `CREATE TABLE IF NOT EXISTS` + `try{ALTER}catch{}`** 패턴(`Catalog.php:151-169` 자체가 선례)으로만 도입 가능하고, **MySQL/SQLite 두 방언 동시 작성 의무**(`Catalog.php:151` vs `:161`)를 진다.
- 🔴 **11축 `ABSENT` 를 "있다고 가정"하고 배선 금지**(규율 7).
