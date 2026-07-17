# DSAR — Organization Store Profile (§33)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §33 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| ★`commerce_product_daily.store_id` | `Insights.php:114` — SQLite DDL `store_id TEXT` · **자유문자열 · FK 없음 · 마스터 테이블 없음** | `KV_ONLY` |
| `store_id` 의 실제 역할 | **dedup 자연키의 한 조각**(`Insights.php:125` — `ensureDedup(…, 'commerce_product_daily', ['tenant_id','channel','store_id','product_sku','event_date'])`) | 집계 키(엔티티 아님) |
| `shop_id`(Shopee) | `ChannelSync.php:1799` — **`channel_credential` KV 값** | `KV_ONLY` |
| `seller_id`(Yahoo/Qoo10/ESM) | `ChannelSync.php:1956` · `:1922` · `:2298` — **`channel_credential` KV 값** | `KV_ONLY` |
| `vendor_id`(쿠팡) | `Connectors.php:1263` · `ChannelSync.php:631` — **`channel_credential` KV 값** | `KV_ONLY` |
| `channel_credential` DDL | `Db.php:976-982` — `tenant + channel + key_name/value` **범용 KV** | 저장소만 |
| `store_type` | **grep 0** — 스토어 유형 열거 전무 | `ABSENT` |
| `organization_unit`/`legal_entity`/`cost_center`/`profit_center`/`position_unit` | **PM 재확인 grep = 0건** | `ABSENT` |
| `channel_registry` | **tenant 없는 글로벌 카탈로그**(`ChannelRegistry.php:32-49` DDL 에 tenant_id 없음 · `UNIQUE(channel_key)` · 주석 `:11` *"플랫폼 전역 카탈로그(테넌트 무관)"*) | `KEEP_SEPARATE_WITH_REASON` |

**★축 주의 — Store 는 엔티티가 아니라 KV 값이다.**
현행 `store_id` 는 **어떤 곳에서도 마스터 행으로 존재하지 않는다.** ⓐ `commerce_product_daily.store_id` = ingest 가 보낸 **자유문자열**이며 **집계 dedup 키의 조각**(`Insights.php:125`)일 뿐 ⓑ 채널별 스토어 식별자(`shop_id`/`seller_id`/`vendor_id`)는 **`channel_credential` 의 KV 값**(`Db.php:976-982`) — 즉 **자격증명 항목**이지 조직 단위가 아니다. **스토어를 열거·소유·승인·기간관리할 수 있는 구조가 0** → `KV_ONLY`. 이름 일치를 커버로 계산하면 **역산**이다.

## 1. 원문 전사 + 판정 — **원문 18종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | store profile id | 부재 — 스토어 마스터 행 자체가 없음 | `ABSENT` |
| 2 | organization unit id | **`organization_unit` 전역 0** | `ABSENT` |
| 3 | store id | **`commerce_product_daily.store_id` 자유문자열**(`Insights.php:114`) · `shop_id`/`seller_id`/`vendor_id` = `channel_credential` KV(`Db.php:976-982`) | `KV_ONLY` |
| 4 | store type | **grep 0** — 유형 열거 전무 | `ABSENT` |
| 5 | merchant reference | 부재 — `merchant_promotion` 에 `merchant_id` 컬럼조차 없음(`Promotion.php:51-60`) | `NAME_ONLY` |
| 6 | brand reference | `catalog_brand`(`Catalog.php:151-169`) 실재하나 **스토어↔브랜드 링크 0** | `PARTIAL` |
| 7 | operating organization | 부재 | `ABSENT` |
| 8 | legal entity | **`legal_entity` 전역 0** | `ABSENT` |
| 9 | country | `Geo` = 국가→**언어** 매핑(`Geo.php:23-53`) · 스토어↔국가 링크 0 | `KEEP_SEPARATE_WITH_REASON` |
| 10 | region | `region` 3축 전부 무관 · parent region 0 · Country↔Region binding 0 | `NAME_ONLY` |
| 11 | manager position reference | **`position_unit` 전역 0** · 인접 = `team.manager_user_id`(`TeamPermissions.php:145-151`)이나 **팀↔스토어 링크 0** | `ABSENT` |
| 12 | cost center | ★**`cost_center` 전역 0**(PM 재확인) | `ABSENT` |
| 13 | profit center | ★**`profit_center` 전역 0**(PM 재확인) | `ABSENT` |
| 14 | approval hierarchy reference | 부재 — 승인 계층 전역 0 | `ABSENT` |
| 15 | valid_from | 부재 — `commerce_product_daily` 는 `event_date`(사실 발생일)만 보유 · **유효기간 아님** | `ABSENT` |
| 16 | valid_to | **`valid_to`/`effective_to` grep 0** | `ABSENT` |
| 17 | status | 부재 | `ABSENT` |
| 18 | evidence | 부재 | `ABSENT` |

**실측 개수: 18 / 18 전사.** 커버리지 = `KV_ONLY` 1 · `PARTIAL` 1 · `NAME_ONLY` 2 · `KEEP_SEPARATE_WITH_REASON` 1 · `ABSENT` 13. **`VALIDATED_LEGACY` = 0.**

## 2. 규칙

- 🔴 **`store_id` 를 Store Profile 의 FK 로 삼지 마라.** 참조 대상 행이 **존재하지 않는다**. `commerce_product_daily.store_id`(`Insights.php:114`)는 ingest 자유문자열이고 **dedup 자연키의 조각**(`:125`)이다. 여기에 FK 를 걸면 **기존 ingest 가 전부 거부**되어 회귀한다(무후퇴 위반).
- 🔴 **`channel_credential` KV(`Db.php:976-982`)를 Store 마스터로 승격하지 마라.** `shop_id`(`ChannelSync.php:1799`)·`seller_id`(`:1956`,`:1922`,`:2298`)·`vendor_id`(`Connectors.php:1263`)는 **채널 API 인증에 쓰이는 자격증명 값**이다. 조직 축으로 재해석하면 **자격증명 스키마 오염 + 규율 9 위반**.
- 🔴 **`channel_registry` 를 Store 로 계산 금지** — **tenant 컬럼 자체가 없는 플랫폼 전역 채널 카탈로그**(`ChannelRegistry.php:32-49` · 주석 `:11`)다. 채널 = 플랫폼 종류이지 스토어가 아니다.
- **Store Profile 신설 시 `store id` 는 KV 값을 참조(reference)만 하라** — `(tenant_id, channel, store_id)` 3키로 **느슨히 연결**하고, 기존 ingest 경로(`Insights.php` dedup)는 **그대로 존치**한다(비파괴).
- **`brand reference` 는 `catalog_brand`(`Catalog.php:151-169`) 를 참조** — §32 규칙과 동일하게 **재구현 금지·`UNIQUE(tenant_id,name)` 키 재사용**.
- 🔴 **`cost center`/`profit center` 를 현행 무엇으로도 대체하지 마라** — 전역 0이다. §37/§38 문서 참조. 특히 **`data_scope` 의 차원(`warehouse`·`channel`·`product`·`brand` — `TeamPermissions.php:284`,`:318-320`)은 필터 차원이지 조직 귀속이 아니다.**
- **스키마 도입 제약**: 마이그레이션 경로 정지(172차) → `ensureTables` 멱등 패턴 + **MySQL/SQLite 두 방언 동시 작성** 의무.
- 🔴 13축 `ABSENT` 를 **"있다고 가정"하고 배선 금지**(규율 7).
