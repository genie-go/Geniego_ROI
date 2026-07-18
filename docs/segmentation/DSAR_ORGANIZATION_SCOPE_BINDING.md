# DSAR — Organization Scope Binding (§43)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §43 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `data_scope` DDL | `TeamPermissions.php:160-166`(MySQL) / `:171-172`(SQLite) = `id·tenant_id·subject_type·subject_id·scope_type·scope_values(TEXT)·updated_at` · **`UNIQUE(tenant_id, subject_type, subject_id)`**(`:164`) | `PARTIAL` |
| `DATA_SCOPES` 9종 | `TeamPermissions.php:41` = `company·brand·team·campaign·product·channel·warehouse·partner·own` | `PARTIAL` |
| 해석 | `effectiveScope():236-265` — owner/admin 무제한(`:246`) · user→team **폴백**(`:253-254`) · 미설정 무제한(`:256`) · `company` 무제한(`:258`) · fail-closed DENY(`:234`·`:263`) | (실배선) |
| 차원 필터 | `scopeValuesFor():272-280` — **`:277` `if (scope_type !== $dimension) return null;`** | (단일 차원) |
| SQL 생성 | `scopeSql():286-293` — **`:292` `" AND {$column} IN ({$ph})"`** · `scopeSqlNamed():299-307` · **effect INCLUDE 고정** | (평면 필터) |
| **`scopeSql*` 직접 호출 외부 = 5곳** | `AdPerformance.php:26`(scopeSqlNamed) · `Wms.php:1291`(scopeSql) · `Catalog.php:981`·`:982`·`:983`(scopeSqlNamed×3) | (실배선) |
| `OrderHub.php:261` | **래퍼 `scopeChannelProduct`**(정의 `TeamPermissions.php:315-322` → 내부 `scopeSql`×3 `:318-320`) | (직접 호출 아님) |
| `agency_client_link` | `AgencyPortal.php:64-72`(MySQL)/`:80`(SQLite) — 주체×리소스×`scope_json`×`status`×생명주기×`UNIQUE(agency_id, client_tenant_id)`(`:70`) | **`PARTIAL`(최근접 실자산)** |
| `READ_ONLY` effect | `defaultScope():89` `['write'=>false,...]` → `index.php:92-96` **403 `AGENCY_READ_ONLY`** · 매 요청 fail-closed 재검증 `resolveAccessContext():414-432` | **effect 유일 실 선례** |
| 계층/상속 구조 | `parent_*`·`path`·`depth`·`lft/rgt`·`ancestor` **전무** · `WITH RECURSIVE`/`ancestor`/`descendant`/`lft`/`rgt` **backend/src grep 0** | `NOT_APPLICABLE` |

### ★ 최우선 실측 — `scopeSql*` 는 **스코프 상속이 아니라 평면 필터다**(4증거)

| # | 증거 | file:line |
|---|---|---|
| ① | **팀 트리 자체가 없다** — `data_scope` 에 `parent_*`·`path`·`depth`·`lft/rgt`·`ancestor` **전무** · `team` DDL 에 **`parent_team_id` 없음**(`id·tenant_id·name·description·team_type·manager_user_id·status·created_by·created_at·updated_at`) | `TeamPermissions.php:160-166` / `:145-151` |
| ② | **재귀 순회 코드 0** — `WITH RECURSIVE`·`ancestor`·`descendant`·`lft`·`rgt` **backend/src grep 0** | (전역) |
| ③ | 🔴 **`:230` 주석의 "팀 스코프 상속"은 상속이 아니라 폴백** — `:253-254` `$sc = subjectScope(user); if (!$sc && !empty($u['team_id'])) $sc = subjectScope(team);` = **user 에 없으면 team 을 1회 조회**. **단일 홉·비재귀·중첩 불가** · **부모 팀 컬럼이 없으므로 구조적 불가**. **규율 10(주석·문서를 근거로 삼지 마라 — 정의부를 Read 하라) 적중 사례** | `TeamPermissions.php:230` vs `:253-254` |
| ④ | **단일 차원 IN 절** — `:277` 타 차원은 **null(무제한)** 반환 · `:311` **주석 자인** *"★사용자는 단일 scope_type만 가지므로(effectiveScope), 셋 중 최대 1개만 비공백 → 충돌 없음"* · `:286-293` `AND {$column} IN (?,?,…)` **조상/후손 확장 없음** · **effect INCLUDE 고정**(부정 필터 생성 경로 0) | `TeamPermissions.php:277`·`:311`·`:286-293` |

**권한 "상속"도 상속이 아니다** — `clampActions`(`:382-389`·`:396-402`)는 **하향 클램프**(팀 권한을 **상한**으로 멤버 권한을 교집합 축소)다. **조직 계층 전파가 아니다.**

### ★ `DATA_SCOPES` 의 `'company'` = **무제한 센티넬**(최대 함정)

`effectiveScope():258` — `if ($st === 'company') return null; // 전사 = 무제한`.
**법인 경계를 긋는 게 아니라 지운다.** 🔴 **이름만 보고 `LEGAL_ENTITY` Scope 로 계산하면 의미가 정반대가 된다.**

### ★ `agency_client_link` 가 `data_scope` 보다 §43 에 더 가깝다

| §43 요구 | `data_scope` | `agency_client_link` |
|---|---|---|
| 주체 × 리소스 바인딩 | subject × **차원값 목록**(TEXT) | `agency_id` ↔ `client_tenant_id`(`:65-66`) |
| scope 정의 | `scope_type`+`scope_values` | **`scope_json`**(`:68`) |
| **scope effect** | **INCLUDE 고정** | ★**`READ_ONLY` 실구현** — `defaultScope():89` `write=false` → `index.php:92-96` POST/PUT/PATCH/DELETE **403** |
| **status** | **없음** | **`status`**(`:67` pending/approved/revoked) |
| **생명주기 타임스탬프** | `updated_at` 뿐 | **`invited_at`/`approved_at`/`revoked_at`**(`:68-69`) |
| UNIQUE | `(tenant, subject_type, subject_id)`(`:164`) | `(agency_id, client_tenant_id)`(`:70`) |
| 런타임 강제 | 쿼리 IN 절(`:292`) | **매 요청 fail-closed 재검증**(`:414-432` — 세션→링크 재조회 `:423` → `status!=='approved'` null `:427` → 세션↔링크 tenant 불일치 방어 `:428`) |

★**`READ_ONLY` = `data_scope` 에 없는 능력 = §43 Scope Effect 의 유일한 실 선례.**
★`index.php:100` 이 위임 scope 의 `write` 여부로 `auth_role` 을 `analyst`/`viewer` 로 **합성 주입** — **조직역할축 ↔ API등급축을 잇는 유일 지점**.

🔴 **이를 무시하고 신설하면 두 번째 바인딩 모델 = 헌법 위반**(중복 엔진 금지).
🔴 **단 §21(Tenant Hierarchy) 근거로는 쓰지 마라** — ⓐ **이분(bipartite)**: `agency_account`(`:56-63`)는 테넌트가 아니라 **별도 인증 realm**(자체 login/session `:73`·화이트라벨 `brand_json`) ⓑ **N:M · 1홉 전용**(순회·이행성·깊이 0) ⓒ 조직↔조직 엣지 아님 ⓓ **동의 기반 접근 허가**이지 소유·포함 관계 아님.

## 1. 원문 전사 + 판정 — **원문 14종**(필수 필드)

> ⚠️ **개수 정정(규율 4 — 숫자를 조용히 맞추지 마라)**: 지시서는 **"13필수필드"**로 전달되었으나 **원문 실측 = 14**(`organization_scope_binding_id`부터 `evidence`까지). **14로 전사한다.**

| # | 원문 항목명 | 현행 대조 | 판정 | 대응 |
|---|---|---|---|---|
| 1 | organization_scope_binding_id | `data_scope.id`(`:161`) 실재. **단 주체가 `user`/`team`**(`:162`)이지 **조직단위가 아니며**, `UNIQUE(tenant,subject_type,subject_id)`(`:164`)로 **주체당 1행** = 다중 바인딩 불가 | `PARTIAL` | **0.5** |
| 2 | organization unit | 부재 — 조직단위 엔티티 없음. `subject_type='team'`(`:162`·소비 `:254`)이 가장 가까우나 **`team` 은 구조가 아니라 열거**(`parent_team_id` 없음 `:145-151` · `ORG_PRESET` 15단위 `:706-722`는 평면 이름) | `PARTIAL` | **0.5** |
| 3 | scope type | `data_scope.scope_type`(`:163`) + `DATA_SCOPES` 9종(`:41`) 실재·실소비(`:277`). **단 원문 17종과 축이 다름**(아래 §1-2) | `PARTIAL` | **1** |
| 4 | scope resource | `scope_values TEXT`(`:163`) = 허용 값 목록 → `IN (?,?,…)`(`:292`) **실강제**. 단 자유문자열(리소스 타입·FK·검증 없음) | `PARTIAL` | **1** |
| 5 | scope effect | ★**INCLUDE 고정**(`:292` `AND {col} IN (…)` — 부정/읽기전용 생성 경로 0). **7종 중 1.** `READ_ONLY` 는 `data_scope` 가 아니라 `agency_client_link`(`AgencyPortal.php:89`→`index.php:92-96`)에만 실재 | `PARTIAL` | **0.5** |
| 6 | inherited 여부 | ★**부재** — 상속 개념 없음. `:230` 주석 *"팀 스코프 상속"* 은 **폴백**(`:253-254` 단일 홉)이다. **주석을 근거로 이 필드를 커버로 계산하면 규율 10 위반** | `NOT_APPLICABLE` | 0 |
| 7 | inheritance hierarchy | ★**부재 · 구조적 불가** — `parent_team_id` 없음(`:145-151`) · `WITH RECURSIVE`/`ancestor`/`descendant`/`lft`/`rgt` **grep 0**. 계층을 표현할 자료구조가 존재하지 않는다 | `NOT_APPLICABLE` | 0 |
| 8 | legal entity restriction | **부재** — `legal_entity` grep 0. 🔴 `DATA_SCOPES` 의 `'company'`(`:41`)는 **무제한 센티넬**(`:258` `return null`)로 **의미가 정반대** | `NOT_APPLICABLE` | 0 |
| 9 | country restriction | **부재** — `Geo`(`Geo.php:23-53`)는 IP→ISO alpha-2→**언어** 매핑 · **Country→Region 매핑 코드 0건** · `app_user.country`(`UserAuth.php:499`)는 프로필 평문 | `NOT_APPLICABLE` | 0 |
| 10 | environment restriction | **부재(정책으로서)** — 🔴 **`Db::envLabel()` 은 Environment Scope 가 아니다. 코드가 스스로 금지**(`Db.php:51-54` *"표시(관측성) 전용 env 라벨 — 게이트용 env()와 분리. ★게이트 로직(env())은 절대 이걸 쓰지 말 것"*) · 27개 호출처 전부 응답 메타 · **인가 결정 사용 0** | `NOT_APPLICABLE` | 0 |
| 11 | valid_from | **부재** — `data_scope` 에 `updated_at` 뿐(`:163`). 유일 effective date 선례 `kr_fee_rule.effective_from`(`Db.php:898`)조차 **as-of 술어 backend/src 전역 0건** | `NOT_APPLICABLE` | 0 |
| 12 | valid_to | **부재** — `valid_to`/`effective_to` **grep 0** → **폐구간 모델은 순수 신규** | `NOT_APPLICABLE` | 0 |
| 13 | status | **부재** — `data_scope` 에 status 컬럼 없음(바인딩이 **항상 활성**). 인접 실 선례 = `agency_client_link.status`(`AgencyPortal.php:67` pending/approved/revoked + fail-closed 재검증 `:427`) | `LEGACY_ADAPTER` | 0 |
| 14 | evidence | **부재** — 스코프 부여 근거·부여자·시각 전무. 인접 선례 = `menu_audit_log.hash_chain`(`AdminMenu.php:128` · 🔴 쓰기 체인만 실재 · `verify()` 0 · preimage ts(`:195`) 소실 → tamper-evident 아님 · 검증형 정본 = `SecurityAudit::verify():56-68`) · `pm_audit_log`(tenant+diff_json+3인덱스) | `LEGACY_ADAPTER` | 0 |

**실측 개수: 14 / 14 전사.**
**대응 합계 = 3.5 / 14** (0.5 + 0.5 + 1 + 1 + 0.5). 커버리지 = **`VALIDATED_LEGACY` 0** · `PARTIAL` 5 · `LEGACY_ADAPTER` 2 · 부재 7.

**종합 판정: `PARTIAL`** — 바인딩의 **뼈대(주체·차원·값·IN 강제)는 실재하고 5곳에 실배선**되어 있다. **신설이 아니라 확장 대상이다.** 🔴 **`data_scope` 재구현 금지.**

## 1-2. 원문 전사 + 판정 — **원문 17종**(Scope Type)

현행 `DATA_SCOPES` 9종(`TeamPermissions.php:41`) = `company·brand·team·campaign·product·channel·warehouse·partner·own`.

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | TENANT | 부재(스코프 타입으로서) — 테넌트 격리는 **별개 층에서 REAL**(인증키 tenant 로 `X-Tenant-Id` 무조건 덮어쓰기 `index.php:600` · strict fail-closed `:585`)이나 `DATA_SCOPES` 열거에 없음. ★**테넌트 엔티티 테이블 자체가 없다**(`api_key.tenant_id VARCHAR(100)` **FK 없음** `Db.php:944`) | `LEGACY_ADAPTER` |
| 2 | WORKSPACE | 부재 — workspace 엔티티 grep 0(`WorkspaceState:50` 은 UI 상태) | `NOT_APPLICABLE` |
| 3 | LEGAL_ENTITY | 부재 — 🔴 `'company'` 는 **무제한 센티넬**(`:258`)로 **정반대 의미** · `legal_entity`/`biz_no`/`corp_reg` grep 0 | `NOT_APPLICABLE` |
| 4 | REGION | 부재 — `region` **3축 병존**이나 전부 무관(광고 인구통계 `Db.php:681`·`690` / **Amazon Ads 엔드포인트** `Connectors.php:2704-2710` / **WMS 창고 시·도** `Wms.php:129`) · `APAC`/`EMEA`/`AMERICAS`/`LATAM` **grep 0** · parent region 0 | `NOT_APPLICABLE` |
| 5 | COUNTRY | 부재 — Country→조직/지역 매핑 **0건** | `NOT_APPLICABLE` |
| 6 | BRAND | ★**`'brand'` 실재**(`:41` · 강제 `Catalog.php:983` scopeSqlNamed) — **단 매핑이 SKU 컬럼**(`scopeChannelProduct:320` 주석 `:312` *"product/brand→SKU 컬럼(이 시스템 브랜드=상품집합 거버넌스)"*) = **브랜드 엔티티 스코프가 아니라 상품집합 필터** | `PARTIAL` |
| 7 | STORE | 부재 — `commerce_product_daily.store_id`(`Insights.php:114`·dedup `:125`)는 **자유문자열** | `KV_ONLY` |
| 8 | MERCHANT | 부재 — `merchant_promotion`(`Promotion.php:51-60`)은 **`merchant_id` 컬럼조차 없다**(접두어일 뿐) · `shop_id`/`seller_id`/`vendor_id` 는 **`channel_credential` KV 값**(`Db.php:976-982`) | `NAME_ONLY` |
| 9 | VENDOR | 부재(스코프 타입으로서) — `wms_suppliers`(`Wms.php:105`·SSOT `SupplyChain.php:243`)는 **평면 거래처 마스터** · 스코프 차원 아님 | `NOT_APPLICABLE` |
| 10 | PARTNER | ★**`'partner'` 실재**(`:41`) — **단 `scopeSql*` 소비처 0**(5곳은 channel/warehouse/product/brand 만 사용) → **선언되었으나 강제되지 않는 차원** | `NAME_ONLY` |
| 11 | PROGRAM | 부재 — program 축 grep 0. `'campaign'`(`:41`)은 인접하나 **소비처 0**(동일) | `NOT_APPLICABLE` |
| 12 | COST_CENTER | 부재 — `cost_center` **grep 0** | `NOT_APPLICABLE` |
| 13 | PROFIT_CENTER | 부재 — `profit_center` **grep 0**(`po_*` 는 **Price Optimization** `PriceOpt.php:38-146` — 무관) | `NOT_APPLICABLE` |
| 14 | PROVIDER_ACCOUNT | 부재 — 인접 = `channel_credential` KV(`Db.php:976-982` tenant+channel+key_name/value) · `channel_registry` 는 **tenant 없는 글로벌 카탈로그**(`ChannelRegistry.php:32-49` 주석 `:11` *"플랫폼 전역 카탈로그(테넌트 무관)"*) | `LEGACY_ADAPTER` |
| 15 | ENVIRONMENT | 부재 — 🔴 `Db::envLabel()` 금지(`Db.php:51-54` 자기 금지). 진짜 강제선은 **물리 DB 분리**(`Db::pdoFor(bool $isDemo)` `:35-38`)이지 스코프 정책 아님 | `NOT_APPLICABLE` |
| 16 | DATA_CLASSIFICATION | 부재 — 데이터 분류 축 grep 0 | `NOT_APPLICABLE` |
| 17 | CUSTOM | 부재 — 확장 슬롯 없음(`DATA_SCOPES` 는 고정 9종 · `validMenu` 류 검증 관례) | `NOT_APPLICABLE` |

**실측 개수: 17 / 17 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `PARTIAL` 1 · `NAME_ONLY` 2 · `KV_ONLY` 1 · `LEGACY_ADAPTER` 2 · 부재 11.

**★현행 9종 중 원문 축에 대응하는 것은 `brand`·`partner` 2개뿐이며 둘 다 온전하지 않다**(`brand`=SKU 필터 · `partner`=소비처 0). 현행 고유 6종(`team`·`campaign`·`product`·`channel`·`warehouse`·`own`)은 **원문 17종에 없는 축**이다 — 🔴 **무후퇴 필수: 원문 축으로 교체하지 말고 병존시켜라.** `'company'` 는 **센티넬**로 별도 취급.

## 1-3. 원문 전사 + 판정 — **원문 7종**(Scope Effect)

> ⚠️ **개수 정정(규율 4)**: 지시서는 **"6종 중 INCLUDE만"**으로 전달되었으나 **원문 실측 = 7**(`CUSTOM` 포함). **7로 전사한다.** 판정(INCLUDE 만 실재)은 동일.

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | INCLUDE | ★**실재·고정** — `scopeSql():292` `" AND {$column} IN ({$ph})"` · `scopeSqlNamed():306` 동일. **effect 를 선택할 축이 없다**(항상 INCLUDE) | **`VALIDATED_LEGACY`**(단일 effect 한정) |
| 2 | EXCLUDE | **부재** — `NOT IN` 생성 경로 0. 인접 = fail-closed 센티넬 `' AND 1=0'`(`:290`·`:303`)이나 이는 **전부 거부**이지 부분 배제 아님 | `NOT_APPLICABLE` |
| 3 | READ_ONLY | **`data_scope` 에 부재** · ★**`agency_client_link` 에 실구현**: `defaultScope():89` `['write'=>false]` → `resolveAccessContext():431` `write` 반환 → `index.php:92-96` POST/PUT/PATCH/DELETE **403 `AGENCY_READ_ONLY`** + `:100` `auth_role` 합성(`viewer`/`analyst`) | **`LEGACY_ADAPTER`(유일 실 선례)** |
| 4 | APPROVAL_ELIGIBLE | **부재** — 승인 자격 축 grep 0(§41 `approval eligible` 과 짝) | `NOT_APPLICABLE` |
| 5 | MANAGER_RESOLUTION_ELIGIBLE | **부재** — manager 해석 체인 없음(`team.manager_user_id` 는 표시용 1홉 `:444-445`) | `NOT_APPLICABLE` |
| 6 | REPORTING_ONLY | **부재** — 보고 전용 effect 축 grep 0 | `NOT_APPLICABLE` |
| 7 | CUSTOM | **부재** — 확장 슬롯 없음 | `NOT_APPLICABLE` |

**실측 개수: 7 / 7 전사.** 커버리지 = `VALIDATED_LEGACY` 1(INCLUDE) · `LEGACY_ADAPTER` 1(READ_ONLY) · 부재 5.

## 2. 규칙

- 🔴 **`:230` 주석 *"팀 스코프 상속"* 을 `inherited 여부`/`inheritance hierarchy` 의 근거로 삼지 마라.** 정의부(`:253-254`)는 **폴백**이다 — user 스코프 부재 시 team 을 **1회** 조회. 단일 홉·비재귀·중첩 불가이며, **`team` 에 `parent_team_id` 가 없으므로 구조적으로 상속이 불가능**하다. **규율 10 적중 사례**(5-3-2 `Alerting::dispatch` 팬텀이 12개 문서를 오염시킨 것과 동형) — **주석≠실효**.
- 🔴 **`scopeSql*` 배선을 "계층 ABAC 이 이미 있다"의 근거로 쓰지 마라.** 4증거로 **평면 단일차원 IN 필터**임이 확정됐다. 형태 유사를 커버로 계산하면 역산(규율 9).
- 🔴 **`'company'` 를 `LEGAL_ENTITY` 로 계산 금지** — `:258` `return null`(**무제한 센티넬**). **법인 경계를 긋는 게 아니라 지운다.**
- 🔴 **`Db::envLabel()` 을 `environment restriction` 으로 계산 금지** — `Db.php:51-54` 가 **코드 스스로 게이트 사용을 금지**한다. 인가 결정 사용 0.
- 🔴 **`agency_client_link` 를 무시하고 새 바인딩 모델을 신설하면 두 번째 엔진 = 헌법 위반.** `status`(pending/approved/revoked)·생명주기 타임스탬프·`scope_json`·**`READ_ONLY` effect 실구현**·**매 요청 fail-closed 재검증**(`:414-432`)은 §43 이 요구하는 능력의 **유일한 실 선례**다. `data_scope` 확장 시 **이 계약을 흡수·재사용**하라.
  🔴 **단 §21(Tenant Hierarchy) 근거로는 쓰지 마라** — 이분(별도 인증 realm `:56-63`) · N:M · 1홉 전용 · **동의 기반 접근 허가**(소유·포함 아님).
- 🔴 **무후퇴 — `DATA_SCOPES` 9종을 원문 17종으로 교체 금지.** 현행 고유 6종(`team`·`campaign`·`product`·`channel`·`warehouse`·`own`)은 원문에 없다. **병존·확장**만.
- **`UNIQUE(tenant_id, subject_type, subject_id)`(`:164`)가 §43 의 구조적 상한이다.** 주체당 **1행 = 1 scope_type**(`:311` 주석 자인)이므로 **다중 바인딩·다중 effect·유효기간별 이력을 담을 수 없다.** 확장은 **UNIQUE 완화 + effect/유효기간 컬럼 추가**를 요구하며, `:277`·`:311`·`:315-322` 의 "단일 차원" 전제가 **동시에 깨진다** → **5곳 소비처 전부 회귀 검증 필수**(`AdPerformance:26`·`Wms:1291`·`Catalog:981`·`:982`·`:983`) **+ 래퍼 경유 `OrderHub:261`**.
- **`scopeSql*` 직접 호출 외부 = 정확히 5곳.** `OrderHub:261` 은 래퍼 `scopeChannelProduct`(`TeamPermissions:315-322`)다. 🔴 **"6곳"은 부정확** — 확장 영향범위 산정 시 **래퍼 1단을 별도 계층으로 취급**하라(래퍼가 내부적으로 `scopeSql`×3 을 호출 `:318-320`).
- **effect 도입은 `scopeSql` 반환 계약(`[whereFragment, params]`)을 깨지 않는 방향으로.** `EXCLUDE` = `NOT IN` 프래그먼트 · `READ_ONLY` = **SQL 이 아니라 미들웨어 층**(`index.php:92-96` 선례 — where 절로 표현 불가) · `APPROVAL_ELIGIBLE`/`MANAGER_RESOLUTION_ELIGIBLE`/`REPORTING_ONLY` = **행 필터가 아닌 능력 게이트** → **effect 를 전부 where 절로 밀어넣으려는 설계는 실패한다.**
- **fail-closed 관례를 보존하라** — `DENY_SCOPE`(`:234`) · 해석 오류 시 거부(`:263`) · `' AND 1=0'`(`:290`·`:303`, `IN ()` SQL 오류 회피). 확장 시 **무제한 누출 경로를 만들지 마라**.
- **저장 = `ensureTables` 멱등 패턴**(마이그레이션 **172차 정지**) + **MySQL/SQLite 양방언 동시 작성**(`:160-166` vs `:171-172`). ⚠️ `ensureTables` 는 **데이터 변환·백필을 하지 않는다** → 기존 `data_scope` 행의 effect/유효기간 백필 경로를 **명시 설계**하라.
- ⚠️ ★**`data_scope` 런타임 행 수 미확인 — 최우선 라이브 확인 항목.** `:255-256` *"스코프 미설정 = 테넌트 내 무제한"* 이므로 **행이 0이면 5곳 배선은 전부 no-op** 이고 §43 의 현행 대응 3.5 는 **계약상 존재이지 실작동이 아니다**(`VACUOUS` 가능성 미배제). 🔴 **"실사용 중인 ABAC"으로 단정 금지.** **라이브 `SELECT COUNT(*) FROM data_scope` · `SELECT scope_type, COUNT(*) FROM data_scope GROUP BY scope_type` 를 실행한 뒤에만 등급을 확정하라**(`partner`/`campaign` 이 실제 0행이면 `NAME_ONLY` 확정).
- ⚠️ **`agency_client_link` 실 데이터 존재도 미확인**(라이브 미조회). 죽은 스켈레톤 확률은 낮다고 **추정**(프론트 `AgencyConsole.jsx` 실재 · `index.php:85` 미들웨어 실배선)이나 **추정임을 명시**한다.
