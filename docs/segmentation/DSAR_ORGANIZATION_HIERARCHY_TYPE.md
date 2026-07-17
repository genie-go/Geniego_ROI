# DSAR — Organization Hierarchy Type (§12)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §12 (Hierarchy Type 축) · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `hierarchy_type` enum | **backend/src grep 0** — 계층 엔티티 자체가 부재하므로 타입 축도 부재 | `ABSENT` |
| 가장 가까운 타입 카탈로그 | `TeamPermissions::TEAM_TYPES` **17종**(`TeamPermissions.php:44-49`) — **평면 문자열 카탈로그** · 구조 의미 0 | `NAME_ONLY` |
| `ORG_PRESET` 15단위 | `TeamPermissions.php:706-722` — 각각 `team_type`·기본 `scope`·기본 `perms`. 브랜드팀·마케팅팀·마케팅 글로벌팀·마케팅 국내팀·영업팀·해외영업팀·국내영업팀·대기업영업팀·유통/총판영업팀·물류팀·재무팀 + 파트너 4종 | `PARTIAL` — **구조가 아니라 열거** |
| `DATA_SCOPES` 9종 | `TeamPermissions.php:41` — company/brand/team/campaign/product/channel/warehouse/partner/own · **단일 차원**(`:277` `if ($sc['scope_type'] !== $dimension) return null;`) | `KEEP_SEPARATE_WITH_REASON` |
| `ChannelRegistry` `group_type` | `ChannelRegistry.php:12`,`:79` = sales/marketing/logistics/pg/messaging + analytics(`:112`)·cs(`:116`)·esp(`:121`)·review(`:125`) — ★**`erp`·`finance`·`hr` 값이 열거에 없다** | `ABSENT`(능력축 증명) |

**★축 주의 — 타입 이름 유사 ≠ 계층 타입.**
`TEAM_TYPES` 17종과 `ORG_PRESET` 15단위는 **"마케팅"·"영업"·"물류"·"재무" 같은 이름**을 갖는다. 원문 `hierarchy_type` 의 `MARKETING`/`SALES`/`FINANCIAL` 과 **글자가 겹친다**. 그러나 원문의 `hierarchy_type` 은 **"이 계층 트리가 어떤 축의 트리인가"** 를 선언하는 메타 속성이고, `TEAM_TYPES` 는 **"이 팀 하나가 어떤 팀인가"** 를 붙이는 라벨이다. `team` DDL(`TeamPermissions.php:145-151`)에 **`parent_team_id` 가 없어 트리 자체가 없으므로**, 트리의 타입이 존재할 여지가 없다. 🔴 **이름 겹침을 커버로 계산하면 갭이 정의상 소멸하는 역산이다.**

## 1. 원문 전사 + 판정 — **원문 20종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | CORPORATE | 부재 — 법인 엔티티 자체 없음(`legal_entity`·`corp_reg` grep 0) | `NOT_APPLICABLE` |
| 2 | LEGAL_ENTITY | **부재**(이름·능력 양쪽) · 사업자정보 = `app_user` 평문 필드(`UserAuth.php:499`·`:1720`) — 엔티티 아님 | `ABSENT` |
| 3 | ADMINISTRATIVE | 부재 · 인접 = `app_user.parent_user_id`(`UserAuth.php:156-167`) — 🔴 **2단 봉인 · 보고선 아님** | `LEGACY_ADAPTER` |
| 4 | FUNCTIONAL | 부재 · 이름 인접 = `TEAM_TYPES` 17종(`TeamPermissions.php:44-49`) **평면** | `NAME_ONLY` |
| 5 | FINANCIAL | 부재 · `cost_center`/`profit_center`/`treasury` **grep 0** | `ABSENT` |
| 6 | MANAGEMENT | 부재 · `reports_to`·`manager_id` **grep 0**(단 `team.manager_user_id` 존재 — 팀 1개의 관리자이지 보고선 아님) | `LEGACY_ADAPTER` |
| 7 | APPROVAL | 부재 · 승인 계층 grep 0 · 인접 = `team_role` owner>manager>member(`TeamPermissions.php:17`) **3단 고정 서열**이지 트리 아님 | `NOT_APPLICABLE` |
| 8 | REGIONAL | 부재 · `region` **3축 병존**(광고 인구통계 `Db.php:681`,`690` / Amazon Ads 엔드포인트 na·eu·fe `Connectors.php:2704-2710` / WMS 시·도 `Wms.php:129`·`regionOf()` `:284-286`) · **`APAC`/`EMEA`/`AMERICAS`/`LATAM` grep 0 · parent region 컬럼 0** | `KEEP_SEPARATE_WITH_REASON` |
| 9 | COUNTRY | 부재 · `Geo`(`Geo.php:23-53`) = 국가→**언어** 매핑(`COUNTRY_LANG_MAP`) · **Country→Region 매핑 코드 0건** | `NAME_ONLY` |
| 10 | BRAND | 부재 · `catalog_brand`(`Catalog.php:151-169`) = `tenant_id·name·code` · **목적 = 11번가 상품등록 필수 브랜드코드**(`BRAND_REQUIRED_CHANNELS=['11st','st11']` `:415`) — **상품속성이지 조직 아님** · `ORG_PRESET` 에 "브랜드팀" 이름만 존재 | `KEEP_SEPARATE_WITH_REASON` |
| 11 | SALES | 부재(구조) · `ORG_PRESET` 에 영업팀·해외영업팀·국내영업팀·대기업영업팀·유통/총판영업팀 **5개 이름 존재 · 서로 간 부모-자식 링크 0** | `PARTIAL` |
| 12 | MARKETING | 부재(구조) · `ORG_PRESET` 에 마케팅팀·마케팅 글로벌팀·마케팅 국내팀 **3개 이름 존재 · 구조 링크 0** | `PARTIAL` |
| 13 | PROCUREMENT | `procurement` **grep 0** · ⚠️ `po_*` 는 **Price Optimization**(`PriceOpt.php:38-146`)이지 Purchase Order 아님 | `ABSENT` |
| 14 | TREASURY | `treasury` **grep 0** | `ABSENT` |
| 15 | COST_CENTER | `cost_center` **grep 0** | `ABSENT` |
| 16 | PROFIT_CENTER | `profit_center` **grep 0** | `ABSENT` |
| 17 | PROJECT | 부재(조직 계층) · 인접 = PM 도메인(`pm_task_dependencies` 엣지 리스트 · `Dependencies::validateDependency` `PM/Dependencies.php:79-100`) — **작업 의존 그래프이지 조직 트리 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 18 | MATRIX | `matrix_` **grep 0** · 다중 부모 표현 수단 전무(`parent_user_id` 단일 컬럼) | `ABSENT` |
| 19 | PARTNER | 부재(계층) · `partner_account`(`PartnerPortal.php:52-59`) `TYPES=['supplier','logistics','warehouse']`(`:29`) · `ORG_PRESET` 파트너 4종 — **평면 · parent 없음** | `PARTIAL` |
| 20 | CUSTOM | 부재 — 확장 축 자체가 없음 | `NOT_APPLICABLE` |

**실측 개수: 20 / 20 전사.** 커버리지 = `VALIDATED_LEGACY` **0** · `PARTIAL` 4 · `LEGACY_ADAPTER` 2 · `KEEP_SEPARATE_WITH_REASON` 3 · `NAME_ONLY` 2 · `ABSENT` 6 · `NOT_APPLICABLE` 3.

> 🔴 **커버 0.** 20종 중 `VALIDATED_LEGACY` 는 **하나도 없다**. ★**개수는 분모가 아니다** — 20/20 전사는 "원문 항목을 빠짐없이 옮겼다"는 뜻일 뿐 커버리지가 아니다.

## 2. 규칙

- 🔴 **`TEAM_TYPES` 17종 · `ORG_PRESET` 15단위를 `hierarchy_type` 20종에 매핑 금지.** 이름 겹침(마케팅/영업/물류/재무)은 **형태 유사**다. **트리가 없으면 트리 타입도 없다** — `team` DDL 에 `parent_team_id` 부재(`TeamPermissions.php:145-151`)가 결정적 증거.
- 🔴 **`ORG_PRESET` 을 근거로 "SALES/MARKETING 계층 있음"이라 쓰지 마라.** "마케팅 글로벌팀"이 "마케팅팀"의 자식이라는 **구조 링크가 0**이다.
- 🔴 **`REGIONAL` 을 `region` 3축 중 아무거나로 커버 계산 금지.** 셋은 서로 무관한 도메인(광고 인구통계 / API 엔드포인트 / 창고 시·도)이고 **셋 다 parent 컬럼이 없다**.
- 🔴 **`BRAND` 를 `catalog_brand` 로 커버 계산 금지.** 존재 목적이 **11번가 상품등록 필수 브랜드코드**(`Catalog.php:415`)다 — 상품 속성이지 조직 축이 아니다. 단 **재구현 금지** — 브랜드 축이 필요하면 `catalog_brand`·`ensureBrand()`(`:427`) 를 참조·확장한다.
- 🔴 **`PROCUREMENT` 판정 시 `po_*` 를 근거로 삼지 마라** — `PriceOpt.php:38-146` 의 Price Optimization 접두어다.
- **ERP/HRIS 를 `authoritative source` 로 전제하지 마라.** 헌법 Vol2(`docs/DATA_SOURCE_ARCHITECTURE_CONSTITUTION.md:71`)가 ERP 를 12분류로 정의하나 **이름만 있고 커넥터·수집·정규화 어느 층도 없다** — `ChannelRegistry` `group_type`/`sync_kind` 열거에 `erp`·`finance`·`hr` **값이 없다**(능력축 증명). `backend/migrations/` 전량 grep 0.
- `PROJECT` 타입 신설 시 **PM 도메인을 재구현하지 마라.** `pm_task_dependencies`(UNIQUE + pred/succ 양방향 인덱스 · migration `20260526_168_004:12-14`) · `Dependencies::validateDependency` 반복 DFS · `PM/Gantt` Kahn 위상정렬(`PM/Gantt.php:104-125`)이 레포 정본 선례다.
- `MATRIX` 는 **다중 부모**를 요구한다 — 현행 유일 간선 `app_user.parent_user_id` 는 **단일 컬럼**이라 구조적으로 표현 불가. 신설 시 **엣지 테이블**(`graph_edge` `Db.php:816-839` 패턴) 이 유일 경로다.
- 🔴 20종 **"있다고 가정"하고 배선 금지.**
