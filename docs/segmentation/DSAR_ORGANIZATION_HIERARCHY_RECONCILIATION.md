# DSAR — Hierarchy Reconciliation (§55)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §55 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

### ★★ 대사(reconciliation)는 **양변**이 있어야 성립한다 — 현행은 **양변이 모두 없다**

**오른쪽 변(Canonical Organization) = 미선언.** `organization_unit`/`org_unit` **grep 0** · `git log --all -S "org_unit"` **0**.

**왼쪽 변(외부 소스) = 커넥터 자체가 부재.** ★**능력축 증명**: `ChannelRegistry.php:12`·`:79` 의 `group_type` 도메인 = **sales/marketing/logistics/pg/messaging** + 증설 **analytics(`:112`)·cs(`:116`)·esp(`:121`)·review(`:125`)** · `sync_kind` = **commerce/ad/messaging/none**. → **`erp`·`finance`·`hr` 값이 열거에 없다.** 헌법 Vol2(`docs/DATA_SOURCE_ARCHITECTURE_CONSTITUTION.md:71`)가 ERP 를 12분류로 정의하나 **이름만 있고 커넥터·수집·정규화 어느 층도 없다** · `backend/migrations/` 전량 **grep 0** · git log 전 이력 히트는 **289차 스펙 문서 자신뿐**.

| 소스 | 실측 | 대사 가능성 |
|---|---|---|
| HRIS | `hris`/`workday`/`payroll` **grep 0** · `group_type` 에 `hr` 없음 | ⊘ 양변 부재 |
| ERP | `group_type`/`sync_kind` 에 `erp` 없음 · 마이그레이션 0 | ⊘ 양변 부재 |
| Finance | `group_type` 에 `finance` 없음 · 법인 엔티티 0 | ⊘ 양변 부재 |
| IdP | ★`EnterpriseAuth` **REAL**(OIDC RS256/JWKS · SAML ds:Signature · 리플레이 방어 `:56`) · 그러나 그룹 = **평문 문자열**(`sso_group_role_map(tenant_id, group_name, role)` `:70`·`:72` · 해석 `roleForGroups:78-85` · 수신 `:374`) — **엔티티 아님 · 부모-자식/중첩/그룹ID 없음 · 롤 1개로 즉시 소모** | 좌변 `PARTIAL`·우변 ⊘ |
| SCIM | ★**Groups = GET 전용**(`scimListGroups:417-423` · `routes.php:932` — Groups 1개 vs Users CRUD 5개) → 내부 `team` 을 **투영해 내보낼 뿐 IdP→내부 인입 경로 없음** | 좌변 `PARTIAL`·우변 ⊘ |

> ★**5-3-2 와 동형의 함정 — 이것이 본 문서의 핵심이다.**
> 비교의 오른쪽 변(Canonical Organization)이 **미선언**이면 대사기는 **비교할 것이 없어 차이를 0으로 보고**한다 → **결과는 항상 `MATCH`**(§56 #1). 288차 `ok=>true` 위장(하드 실패를 성공으로 보고)과 **구조가 같다.**
> 🔴 **따라서 §55 의 선행 조건은 §55 안에 없다** — **Canonical 조직 모델 선언이 §55 보다 반드시 선행한다.** 이것을 규칙으로 못박는다(§2).

## 1. 원문 전사 + 판정

### 1-A. 비교 대상 — **원문 24종**

표기: **좌**=소스 시스템 / **우**=Canonical. `⊘`=부재.

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | HRIS Organization vs Canonical Organization | 좌⊘(HRIS 커넥터 0·`group_type` 에 `hr` 없음) · 우⊘ | `ABSENT`(양변) |
| 2 | ERP Organization vs Canonical Organization | 좌⊘(`erp` 열거값 없음) · 우⊘ | `ABSENT`(양변) |
| 3 | Finance Legal Entity vs Canonical Binding | 좌⊘ · 우⊘ — 법인 엔티티 0(`biz_no`/`corp_reg`/`tax_id` **0건**) | `ABSENT`(양변) |
| 4 | Cost Center Master vs Canonical Cost Center Binding | 좌⊘ · 우⊘ — `cost_center` **grep 0** | `ABSENT`(양변) |
| 5 | Profit Center Master vs Canonical Profit Center Binding | 좌⊘ · 우⊘ — `profit_center` **grep 0**(★`po_*` = Price Optimization `PriceOpt.php:38-146` 무관) | `ABSENT`(양변) |
| 6 | IdP Group vs Organization Membership | ★좌 **부분 실재** — `sso_group_role_map`(`EnterpriseAuth.php:70`·`:72`) 이 그룹명을 **평문**으로 보유 · `group_name IN (?)` 단순 룩업(`:84`) · **저장하지 않고 롤 1개로 즉시 소모** / 우⊘ | `PARTIAL`(좌) · 대사 불가 |
| 7 | SCIM Membership vs Organization Membership | ★좌 **투영 전용** — `scimListGroups`(`:417-423`) **GET 1개뿐**(Users 는 CRUD 5개) → **내부→외부 방향** · **IdP→내부 인입 0** / 우⊘ | `PARTIAL`(좌) · 대사 불가 |
| 8 | CRM Account Hierarchy vs Merchant·Partner Hierarchy | ★**양변 부재** — `crm_customers` 전 컬럼(`CRM.php:48-56`/`:77-83`)에 account/company/parent/hierarchy **전무** · `app_user.company` 는 **문자열 1개** · Merchant = **`NAME_ONLY`**(`merchant_promotion`(`Promotion.php:51-60`)은 **`merchant_id` 컬럼조차 없다**) | `ABSENT`(양변) |
| 9 | Tenant Registry vs Organization Tenant Binding | ★**좌변도 부재** — **테넌트 마스터 테이블이 존재하지 않는다**(`api_key.tenant_id VARCHAR(100)` **FK 없음** `Db.php:944`) · 발급 = `'acct_'.$id` 문자열 생성(`UserAuth.php:220-224`) · 열거 = `SELECT DISTINCT tenant_id` **19개소 역추론**(권위 목록 아님·19는 하한) / 우⊘ | `ABSENT`(양변) |
| 10 | Workspace Registry vs Organization Workspace Binding | 좌 ⚠️**미확인**(`system‖workspace` 메뉴 실재하나 registry 여부 미실측) · 우⊘ | `ABSENT` · ⚠️미확인 |
| 11 | Legal Entity Registry vs Organization Legal Binding | 좌⊘ — 사업자정보는 `app_user` **프로필 평문 필드**(`business_number`·`ceo_name`·`country` `UserAuth.php:499`·`:1720`)이지 **법인 엔티티 아님** / 우⊘ | `ABSENT`(양변) |
| 12 | Country Registry vs Organization Country Profile | 좌 `NAME_ONLY` — `Geo`(`Geo.php:23-53`)는 **IP→ISO alpha-2→언어**(`COUNTRY_LANG_MAP`) · **국가→조직/지역 매핑 아님** · ★앵커 주의: `Geo.php:19` 는 `class Geo {` 줄 / 우⊘ | `NAME_ONLY`(좌) |
| 13 | Region Registry vs Organization Region Profile | 좌 **3축 병존·registry 아님** — 광고 인구통계(`Db.php:681`,`690`) / **Amazon Ads 엔드포인트 na·eu·fe**(`Connectors.php:2704-2710`) / **WMS 시·도**(`Wms.php:129`·`regionOf():284-286`) · **`APAC`/`EMEA`/`AMERICAS`/`LATAM` grep 0** · **parent region 0** · Country↔Region binding 0 / 우⊘ | `ABSENT`(양변) |
| 14 | Brand Registry vs Organization Brand Profile | ★좌 **실재** — `catalog_brand`(`Catalog.php:151-169`) `tenant_id·name·code` · `UNIQUE(tenant_id,name)` · CRUD `:443-465` · `ensureBrand():427`. **단 목적 = 11번가 상품등록 필수 브랜드코드**(`BRAND_REQUIRED_CHANNELS=['11st','st11']` `:415`) = **상품 속성이지 조직 아님** / 우⊘ | `KEEP_SEPARATE_WITH_REASON` |
| 15 | Store Registry vs Organization Store Profile | 좌 `KV_ONLY` — `commerce_product_daily.store_id` **자유문자열**(`Insights.php:114`·dedup `:125`) · `shop_id`/`seller_id`/`vendor_id` = **`channel_credential` KV 값**(`Db.php:976-982`) / 우⊘ | `KV_ONLY`(좌) |
| 16 | Vendor Registry vs Organization Vendor Profile | ★좌 **부분 실재** — `wms_suppliers`(`Wms.php:105` · SSOT 선언 `SupplyChain.php:243` · `sc_suppliers.wms_id` 링크 `:88`) = 외부 거래처 마스터(tenant_id·name·contact·active) **평면·parent 없음**. vendor type·법인관계·계약·국가스코프·승인계층·valid_from/to·evidence **부재** / 우⊘ | `PARTIAL`(좌) |
| 17 | Position Registry vs Position Unit | 좌⊘ · 우⊘ — `position_unit` **grep 0** · 직위 축 전무 | `ABSENT`(양변) |
| 18 | Current Hierarchy Version vs Path Index | **양변 부재** — Hierarchy Version 0 · **Path Index 전례 0**(Closure Table·Materialized Path 컬럼 **grep 0**) | `ABSENT`(양변) |
| 19 | Current Node·Edge vs Snapshot | 우⊘ · 선례만 = `menu_defaults(snapshot_data, version)`(`AdminMenu.php:120`·:308) · `pm_baseline(snapshot_json, captured_at)`(`PM\Enterprise.php:55`·:360-364) | `PARTIAL`(선례만) |
| 20 | Organization Membership vs Role Assignment Scope | 좌⊘ · 우 **평면 스코프만** — `data_scope`(`TeamPermissions.php:160-166`) `tenant_id·subject_type·subject_id·scope_type·scope_values·updated_at` · **`parent_*`/`path`/`depth`/`lft-rgt`/`ancestor` 전무** · **단일 차원**(`:277`) · SQL = **IN 절 1개**(`:286-293`, 조상/후손 확장 없음) | `PARTIAL`(우) |
| 21 | Organization Hierarchy vs Approval Workflow Binding | **양변 부재** — 승인 워크플로 **grep 0**(5-3-2 §12: 30종 전부 부재) | `ABSENT`(양변) |
| 22 | Organization Hierarchy vs Active Approval Task Assignment | **양변 부재** — Task/배정/클레임 개념 전무 | `ABSENT`(양변) |
| 23 | Retired Organization vs Active Approval Cases | **양변 부재** — Retire·Case 양쪽 없음 | `ABSENT`(양변) |
| 24 | Future-dated Change vs Scheduled Activation | **양변 부재** — ★**`WHERE effective_from <= :as_of` 술어 backend/src 전역 0건** · **`effective_to` grep 0** → 미래일자·예약활성 개념 자체 없음 | `ABSENT`(양변) |

**실측 개수: 24 / 24 전사.** 커버리지 = `ABSENT`(양변) 15 · `PARTIAL` 5(#6·#7·#16·#19·#20) · `NAME_ONLY` 1 · `KV_ONLY` 1 · `KEEP_SEPARATE_WITH_REASON` 1 · ⚠️미확인 1(#10) · **`VALIDATED_LEGACY` 0**.
→ ★**24종 중 대사가 성립하는 것은 0** — 좌변이 부분 실재하는 5건도 **우변이 전부 부재**라 비교 자체가 불가능하다.

### 1-B. 필수 필드 — **원문 16종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | hierarchy reconciliation id | 부재 | `ABSENT` |
| 2 | tenant | 격리 강제 REAL(`index.php:600`·`:585`) · **마스터 테이블 없음** | `PARTIAL` |
| 3 | organization unit | 부재 | `ABSENT` |
| 4 | hierarchy | 부재 | `ABSENT` |
| 5 | hierarchy version | 부재 — 엔티티 `version` = `menu_defaults.version` **단 1건** · **optimistic lock `version` grep 0** | `ABSENT` |
| 6 | comparison type | 부재 — 1-A 24종의 타입 축 | `ABSENT` |
| 7 | source system | 부재 — ★**소스 시스템 자체가 없다**(`group_type` 에 erp/finance/hr 없음) | `ABSENT` |
| 8 | source state | 부재 | `ABSENT` |
| 9 | canonical state | 부재 — ★**Canonical 미선언 = 본 필드가 항상 null** | `ABSENT` |
| 10 | difference | 부재 — ★**양변 부재 시 항상 "차이 없음"으로 계산됨**(가짜 녹색의 발생 지점) | `ABSENT` |
| 11 | severity | 부재 · 인접 = §57 Critical Gap 후보(스펙 :2284-) | `ABSENT` |
| 12 | detected_at | 부재 · 명명 선례 = `pm_baseline.captured_at`(`PM\Enterprise.php:55`) | `ABSENT` |
| 13 | resolved_at | 부재 · 명명 선례 = `agency_client_link.approved_at`/`revoked_at`(`AgencyPortal.php:64-72`) | `ABSENT` |
| 14 | resolution | 부재 | `ABSENT` |
| 15 | status | 부재 → **§56 참조** | `ABSENT` |
| 16 | evidence | 부재 | `ABSENT` |

**실측 개수: 16 / 16 전사.** 목록 끝 = `evidence` **확인**(원문 :2249).

★**관찰(수 불일치 — 조용히 맞추지 않고 사실대로 적는다)**: **1-A 비교 24종 ↔ §56 상태 26종**이나, §56 에서 `MATCH`·`MANUAL_REVIEW`·`BLOCKED` 3종을 빼면 **mismatch 상태는 23종**이다. 매핑하면 **#3 Finance Legal Entity 와 #11 Legal Entity Registry 가 `LEGAL_ENTITY_BINDING_MISMATCH` 하나를 공유**한다(24→23). 🔴 **이를 "누락"으로 단정하지 않으며 새 상태를 지어내지도 않는다** — 원문이 그렇게 쓰여 있고, 두 비교가 같은 바인딩을 다른 소스에서 보는 것이므로 **의도된 공유일 수 있다.** 구현 시 `comparison type`(필드 #6)이 **둘을 구분하는 축**이 된다.

## 2. 규칙

- ★★🔴 **Canonical 조직 모델 선언이 §55 보다 선행한다 — 예외 없음.**
  대사기는 **양변 비교**다. 오른쪽 변이 미선언인 채 §55 를 구현하면 **`canonical state`(필드 #9)가 항상 null → `difference`(#10)가 항상 공집합 → `status`(#15)가 항상 `MATCH`** 다. **전 항목 녹색 = 288차 `ok=>true` 하드실패 위장과 구조 동형.** 5-3-2 에서 이미 같은 함정을 확인했다.
  → **구현 순서 강제**: ① Canonical Organization(§15/§16 Node·Edge) 선언 → ② Hierarchy Version(§14) → ③ Path Index(§18) → **④ §55 대사**. 🔴 **역순 금지.**
- ★🔴 **대사 대상 소스가 없다 — "미구현"이 아니라 "원천 불가"다.** HRIS/ERP/Finance 는 **커넥터 열거값조차 없다**(`ChannelRegistry` `group_type`/`sync_kind`). 헌법 Vol2 가 ERP 를 12분류로 **이름만** 정의한다. → 비교 #1~#5 는 **커넥터 신설이 선행 조건**이며, 이는 헌법 Vol2 §14 상 **Connector Registry 등록 + Quality Gate + Trust Score + 회귀테스트까지 완료해야 완료**다. **§55 하나로 끝나는 작업이 아니다.**
- ★🔴 **IdP/SCIM(#6·#7)에서 "그룹을 받고 있으니 대사 가능"으로 계산 금지 = 역산.**
  ⓐ 그룹이 **엔티티가 아니라 평문 문자열**이다 — `sso_group_role_map` 은 수신 즉시 **롤 1개로 소모**(`roleForGroups:78-85`)하고 **저장하지 않는다.** 부모-자식·중첩그룹·그룹ID **없음**.
  ⓑ **SCIM Groups 는 GET 전용**(`:417-423`) — **방향이 반대**다(내부 `team` → 외부 투영). **IdP→내부 인입 경로가 없으므로 "소스 상태"를 읽을 수 없다.**
  → 대사하려면 **그룹을 엔티티로 영속하고 인입 방향을 여는 것**이 선행이다.
- ★🔴 **IdP 커넥터 신설 금지 = 두 번째 엔진 = 헌법 위반. `EnterpriseAuth` 확장 강제.** 실 SSO/SCIM 스택이 **REAL**(OIDC Authorization Code + id_token RS256/JWKS · SAML ds:Signature C14N+RSA-SHA256 · 어설션 리플레이 방어 `:56` · KEK 회전 · 라우트 `routes.php:915-932` + `$register` `:2383-2400` **양쪽 배선**)이다.
- 🔴 **#14 Brand·#16 Vendor 의 좌변 실재를 커버로 계산 금지.** `catalog_brand` 는 **11번가 브랜드코드용 상품 속성**(`:415`)이고 `wms_suppliers` 는 **평면 거래처 마스터**다. **우변(Organization Brand/Vendor Profile)이 없으므로 대사는 여전히 불가**하며, 이들을 조직 프로파일로 승격하면 **도메인 혼입**이다(`KEEP_SEPARATE_WITH_REASON`).
- 🔴 **#9 Tenant Registry 를 "테넌트는 있으니 좌변 有"로 계산 금지.** **권위 목록이 존재하지 않는다** — 열거가 `SELECT DISTINCT tenant_id FROM <도메인테이블>` **19개소 역추론**(하한)이다. **Registry 는 신규**이며, 이것 없이 #9 대사는 **어떤 테넌트가 존재해야 하는지를 모르는 채 비교**하게 된다.
- 🔴 **#20 에서 `data_scope` "팀 스코프 상속"(`:230` 주석)을 계층 상속으로 읽지 마라 — 규율 10 직격.** 실제는 **폴백**이다(`:253-254` — user 에 없으면 team **1회** 조회 · 단일 홉 · 비재귀 · **부모 팀 컬럼 자체가 없어 구조적 불가**). 권한 "상속"도 **하향 클램프**(`clampActions:382-389`·`:396-402` — 팀 권한을 **상한**으로 교집합 축소)이지 조직 계층 전파가 아니다.
  ⚠️ **`data_scope` 런타임 행 수 미확인** — `:255-256` "미설정=무제한"이므로 **행이 0이면 `scopeSql*` 배선 5곳**(`AdPerformance.php:26` · `Wms.php:1291` · `Catalog.php:981`,`:982`,`:983` — `OrderHub.php:261` 은 래퍼 `scopeChannelProduct`)**은 전부 no-op**다. **"실사용 중인 ABAC"으로 단정 금지** · 라이브 `SELECT COUNT(*) FROM data_scope` 권장.
- 🔴 **`DATA_SCOPES` 의 `'company'` 를 Legal Entity 대사축으로 쓰지 마라 — 의미가 정반대다.** `effectiveScope():258` `if ($st === 'company') return null; // 전사 = 무제한` — **경계를 긋는 게 아니라 지운다.**
- 🔴 **`agency_client_link` 를 #9/#20 대사 근거로 쓰지 마라.** **이분(bipartite)**(`agency_account:56-63` 은 **별도 인증 realm**) · **N:M · 1홉 전용** · 조직↔조직 엣지 아님 · **동의 기반 접근 허가**이지 소유·포함 아님. ⚠️실 데이터 존재 **미확인**.
- **#19 Snapshot 대사는 선례를 확장하라** — `menu_defaults`/`pm_baseline`. 단 `menu_defaults` 는 **immutable_hash 없음·전역 1행(tenant 없음)·최신 1건만 조회** → **그대로 복제 금지**. immutable_hash 는 `schema_migrations.checksum`(`Migrate.php:50`), 감사 해시체인은 `menu_audit_log.hash_chain`(`AdminMenu.php:128`) 확장. 🔴 단 `menu_audit_log.hash_chain` 은 **쓰기 체인만 실재**하고 검증기(`verify()`)가 0이며 preimage `ts`(`:195`) 소실로 재계산 불가 → **tamper-evident 아님**; 실제 재계산·prev_hash 교차검증이 도는 검증형 정본은 `SecurityAudit::verify():56-68` 이다.
- **대사 결과 기록은 `pm_audit_log` 패턴**(`tenant_id`+`entity`+`diff_json`+3인덱스 · migration `20260526_168_008`)**을 확장하라.** 🔴 **전역 `audit_log`(4컬럼·tenant 없음·해시체인 없음 `Db.php:540-545`)를 쓰면 테넌트 격리가 깨진다.**
- 🔴 **24종 비교·16필드 "있다고 가정"하고 배선 금지.**
