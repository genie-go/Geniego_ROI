# DSAR — Organization Registry (§6)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §6 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| **Organization Registry (축 전체)** | **`TeamPermissions::ORG_PRESET`(TeamPermissions.php:706-722) 15 표준 조직단위 + `seedOrg`(:725-753) tenant별 멱등 시딩 + 전 계층 실배선(routes.php:1589 · routes.php:2570 `$register` · frontend teamApi.js:261)** | **`PARTIAL` — "구조가 아니라 열거"** |
| `ORGANIZATION_REGISTRY` 테이블 | `organization_registry`/`org_registry` **backend/src grep 0** | `NOT_APPLICABLE`(엔티티 부재) |
| 산출 저장소 | `team` DDL(TeamPermissions.php:145-151 MySQL / :168 SQLite) = `id·tenant_id·name·description·team_type·manager_user_id·status·created_by·created_at·updated_at` | `PARTIAL` |
| **계층 링크** | ★**`team` DDL 에 `parent_team_id` 없음**(PM 직접 확인 :145-151/:168) | **구조 링크 0** |
| `TEAM_TYPES` | 17종 **평면 문자열 카탈로그**(TeamPermissions.php:44-49) — `internal_super`…`custom` | `KV_ONLY`(카탈로그일 뿐 타입 레지스트리 아님) |
| 조직 계층 이력 | `git log --all -S "org_unit"` **0** · `organization_unit` **0**(스펙 커밋 제외) · `hierarch` backend/src **0** | **삭제된 조직 코드 0 — 팬텀도 유물도 아님** |

**🔴 축 판정 정정 — "Organization Registry ABSENT" 로 밀면 오판이다.** `ORG_PRESET` 15단위는 **실재하고 실배선**되어 있다(라우트 2벌 + 프론트 호출자). 부재한 것은 **레지스트리 엔티티와 계층 구조**이지 표준 조직단위 목록이 아니다. 정확한 표현 = **`PARTIAL` · "구조가 아니라 열거"** — "마케팅 글로벌팀"(`ORG_PRESET` :709)이 "마케팅팀"(:708)의 **자식이라는 링크가 0**이며, 부모-자식은 오직 **이름의 어감**에만 존재한다.

**★대칭 오류 경계** — 위 `PARTIAL` 을 **필드 커버로 환산 금지**. 레지스트리 엔티티가 없으므로 §6 의 20 필수필드는 **걸 곳이 없다**. 아래 필드 표가 대부분 `NOT_APPLICABLE` 인 것과 축 판정 `PARTIAL` 은 모순이 아니다 — **커버된 것은 "표준 단위 열거+시딩"이라는 능력 1개**이지 필드가 아니다.

## 1. 원문 전사 + 판정 — 필수 필드 **원문 20종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | organization_registry_id | 부재 — 레지스트리는 **PHP const 1개**(`ORG_PRESET`)로 암묵 존재 · ID 없음 | `NOT_APPLICABLE` |
| 2 | tenant_id | `seedOrg` 가 tenant별 시딩(:730 `tenantOf` · :739 `INSERT … tenant_id`) — 단 **레지스트리 자체는 전역 const**, tenant 는 산출 행에만 | `PARTIAL` |
| 3 | registry_code | 부재 — 코드 컬럼 없음 | `NOT_APPLICABLE` |
| 4 | registry_name | 부재 — 이름 컬럼 없음(const 식별자뿐) | `NOT_APPLICABLE` |
| 5 | registry_type | 부재 — 11종 열거 없음(아래 Registry Type 표) | `NOT_APPLICABLE` |
| 6 | authoritative_source | 부재 — 별도 문서 [DSAR_ORGANIZATION_AUTHORITATIVE_SOURCE.md](DSAR_ORGANIZATION_AUTHORITATIVE_SOURCE.md) | `NOT_APPLICABLE` |
| 7 | source priority | 부재 — 소스 다중화·우선순위 개념 전무 | `NOT_APPLICABLE` |
| 8 | supported hierarchy types | 부재 — **계층 자체가 없다**(`team.parent_team_id` 없음) | `NOT_APPLICABLE` |
| 9 | effective dating support | 부재 — `kr_fee_rule.effective_from`(Db.php:898)이 **전 코드베이스 유일 effective date** · ★**`WHERE effective_from <= :as_of` 술어 backend/src 전역 0건** · `effective_to` grep 0 | `NOT_APPLICABLE` |
| 10 | historical support | 부재 — 조직 이력 테이블 0 | `NOT_APPLICABLE` |
| 11 | matrix support | 부재 — `matrix_` backend/src grep 0 | `NOT_APPLICABLE` |
| 12 | external reference support | 부재 · 인접 = `EnterpriseAuth` SCIM Users CRUD(routes.php:915-932) — ★**Groups 는 GET 전용**(`scimListGroups` EnterpriseAuth.php:417-423 · routes.php:932) → **IdP→내부 조직 인입 경로 0** | `LEGACY_ADAPTER`(인입 아님·투영 전용) |
| 13 | synchronization mode | 부재(조직) · 인접 `ChannelSync` 는 **채널 도메인** | `NOT_APPLICABLE` |
| 14 | synchronization frequency | 부재 | `NOT_APPLICABLE` |
| 15 | owner | 부재(레지스트리 소유자) · 인접 `team.manager_user_id`(:148)는 **팀 관리자**이지 레지스트리 owner 아님 | `NOT_APPLICABLE` |
| 16 | active version | 부재 — ★엔티티 `version` 은 **`menu_defaults.version`(AdminMenu.php:120) 단 1건**. `\bversion\b` 40건 전부 API/DB/벤더 헤더 | `NOT_APPLICABLE` |
| 17 | valid_from | 부재 | `NOT_APPLICABLE` |
| 18 | valid_to | 부재 — `valid_to\|effective_to` grep 0 → **폐구간 모델은 신규** | `NOT_APPLICABLE` |
| 19 | status | 부재(레지스트리) · `status` 컬럼 관례는 확립(`team.status` :148 `'active'` 기본) | `NOT_APPLICABLE` |
| 20 | evidence | 부재 — 전 도메인 0 | `NOT_APPLICABLE` |

**실측 개수: 20 / 20 전사.** 커버리지 = 부분 1(`tenant_id`) · 어댑터 1(`external reference support`) · 부재 18.

## 2. 원문 전사 + 판정 — Registry Type **원문 11종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | PLATFORM | 부재(조직) · 인접 = `channel_registry` **tenant 없는 글로벌 카탈로그**(ChannelRegistry.php:32-49 · 주석 :11 "플랫폼 전역 카탈로그(테넌트 무관)") — **채널 종류 카탈로그이지 조직 레지스트리 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 2 | TENANT | 부재 — ★**테넌트 엔티티 테이블이 존재하지 않는다**(`api_key.tenant_id VARCHAR(100)` Db.php:944 **FK 없음** · 발급 = `'acct_'.$id` 문자열 생성 UserAuth.php:220-224) · 열거는 `SELECT DISTINCT tenant_id` **19개소 역추론** | `NOT_APPLICABLE` |
| 3 | LEGAL_ENTITY | 부재 — `legal_entity` grep 0 · 사업자정보는 `app_user` **프로필 평문 필드**(`business_number`·`ceo_name`·`country` UserAuth.php:499·:1720) · `biz_no`/`brn`/`corp_reg`/`tax_id` **전부 0건** | `NOT_APPLICABLE` |
| 4 | HRIS | 부재 — `hris`/`workday`/`payroll` grep 0 | `NOT_APPLICABLE` |
| 5 | ERP | 부재 — ★**능력축 증명**: `ChannelRegistry.php:12`,`:79` `group_type` 도메인 = sales/marketing/logistics/pg/messaging · `sync_kind` = commerce/ad/messaging/none + 증설 analytics(:112)·cs(:116)·esp(:121)·review(:125) → **`erp` 값이 열거에 없다.** 헌법 Vol2(docs/DATA_SOURCE_ARCHITECTURE_CONSTITUTION.md:71)가 ERP 를 12분류로 정의하나 **이름만 있고 커넥터·수집·정규화 어느 층도 없다** | `NAME_ONLY`(헌법 이름만) |
| 6 | FINANCE | 부재 — `group_type` 열거에 `finance` 없음(위와 동일 증명) · `ORG_PRESET` '재무팀'(:717)은 **팀이지 레지스트리 아님** | `NOT_APPLICABLE` |
| 7 | CRM | 부재(조직 레지스트리) · ★**CRM Account Hierarchy = ABSENT**: `crm_customers` 전 컬럼(CRM.php:48-56 MySQL/:77-83 SQLite)에 account/company/parent/hierarchy **전무** | `NOT_APPLICABLE` |
| 8 | REGIONAL | 부재 — `region` **3축 병존**(광고 인구통계 Db.php:681,690 / Amazon Ads 엔드포인트 na·eu·fe Connectors.php:2704-2710 / WMS 창고 시·도 Wms.php:129) · **`APAC`/`EMEA`/`AMERICAS`/`LATAM` grep 0** · **parent region 컬럼 0** · Country↔Region binding 0 | `NOT_APPLICABLE` |
| 9 | BRAND | 부재(레지스트리) · 인접 `catalog_brand`(Catalog.php:151-169) = `tenant_id·name·code` · **목적 = 11번가 상품등록 필수 브랜드코드**(`BRAND_REQUIRED_CHANNELS=['11st','st11']` :415) → **상품속성이지 조직 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 10 | PARTNER | 부재(레지스트리) · 인접 `partner_account`(PartnerPortal.php:52-59) `TYPES=['supplier','logistics','warehouse']`(:29) = **외부 party 로그인 계정** · `ORG_PRESET` 파트너 4종(:718-721)은 **내부 `team` 행** | `KEEP_SEPARATE_WITH_REASON` |
| 11 | CUSTOM | 부재(레지스트리) · 인접 `TEAM_TYPES` 말미 `'custom'`(:48) — **팀 유형 자유입력 허용**(주석 :43)이지 레지스트리 확장점 아님 | `LEGACY_ADAPTER` |

**실측 개수: 11 / 11 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · 도메인 상이 3 · 어댑터 1 · 이름만 1 · 부재 6.

## 3. 규칙

- 🔴 **"Organization Registry ABSENT" 로 쓰지 마라 — 오판이다.** `ORG_PRESET`(:706-722) + `seedOrg`(:725-753) + 3계층 실배선(routes.php:1589 · :2570 · teamApi.js:261)이 실재한다. 정본 표현 = **`PARTIAL` · "구조가 아니라 열거"**.
- 🔴 **대칭 오류 금지 — 열거가 있다고 구조가 있는 게 아니다.** `team` DDL 에 `parent_team_id` 가 **없다**(:145-151/:168). "마케팅 글로벌팀 ⊂ 마케팅팀" 은 **이름의 어감이지 데이터가 아니다.** 이름 유사를 계층 커버로 계산하면 역산이다.
- 🔴 **`ORG_PRESET` 재구현 금지 — 확장만.** 신규 조직 레지스트리를 별도 상수/테이블로 만들면 **표준 조직단위 SSOT 가 2벌**이 된다(헌법 중복엔진 금지). 15단위는 **시드 데이터 정본**으로 보존하고, 레지스트리 엔티티는 `team` 을 참조하도록 **덧붙여라**.
- 🔴 **`TEAM_TYPES` 17종을 §6 Registry Type 11종에 매핑 금지.** 교집합 0 · 축 자체가 다르다(팀 유형 vs 레지스트리 출처 유형).
- 🔴 **`channel_registry` 를 Organization Registry 선례로 쓰지 마라.** `tenant_id` 컬럼이 **없다**(ChannelRegistry.php:32-49 · 주석 :11) → 테넌트 격리 헌법과 정면 충돌. **`team` 의 tenant 관례(:146)를 따르라.**
- 🔴 **테넌트 = 법인 가정 금지 — 역산이다.** 테넌트 엔티티 테이블 자체가 없고(Db.php:944 FK 없음), plan 은 `parent_user_id IS NULL` owner 계정에서 읽는다(PlanLimits.php:36-37) = **테넌트 = 1 owner 계정의 구독 스코프**. 한 법인이 다수 테넌트를 갖는 것도 그 반대도 **표현되지 않는다**.
- 🔴 **`DATA_SCOPES` 의 `'company'` 를 LEGAL_ENTITY 레지스트리로 계산 금지 — 의미가 정반대다.** `effectiveScope():258` `if ($st === 'company') return null; // 전사 = 무제한` — **법인 경계를 긋는 게 아니라 지운다.**
- 스키마 도입 시 **마이그레이션 파일 경로가 죽어 있다**(`backend/migrations/` 최신 `20260527_172_002` = 172차 정지) → 핸들러 self-healing `ensureTables` 멱등 `CREATE TABLE IF NOT EXISTS` + `try{ALTER}catch{}` 필수 · **MySQL/SQLite 두 방언 동시 작성 의무**(TeamPermissions.php:145 vs :168 패턴).
- ⚠️ **`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다** → 레지스트리 도입 시 기존 `team` 행의 레지스트리 귀속 백필은 **집행 수단이 현재 없다**.
