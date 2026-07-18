# DSAR — Organization Snapshot (§48 + §49)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §48(필수 필드)·§49(Snapshot 원칙) · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)
>
> Snapshot Type 축(§48 후반·§49)은 별도 문서: [DSAR_ORGANIZATION_SNAPSHOT_TYPE.md](DSAR_ORGANIZATION_SNAPSHOT_TYPE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `ORGANIZATION_SNAPSHOT` | **grep 0** | `ABSENT` |
| ★**선례 1 — `menu_defaults`** | `snapshot_data JSON NOT NULL, version VARCHAR(32) NOT NULL, created_at`(`AdminMenu.php:119-122` MySQL / `:138-139` SQLite) · 생성 `:308` · 복원 `:584-590` = **레포 유일 "버전 붙은 스냅샷"** | `PARTIAL` |
| ★**선례 2 — `pm_baseline`** | `snapshot_json LONGTEXT, created_at`(`PM/Enterprise.php:55` MySQL / `:62` SQLite) · 생성 `:360-364` | `PARTIAL` |
| ★**선례 3 — immutable_hash** | `schema_migrations.checksum` = `hash('sha256', $sql)`(`Migrate.php:50`) · INSERT `:63-64` | `LEGACY_ADAPTER`(해시 패턴 정본) |
| 해시체인 | `menu_audit_log.hash_chain CHAR(64)`(`AdminMenu.php:128`) = SHA-256 prev-chain 실구현(`:182-197`·`lastHash():214-219`) | `LEGACY_ADAPTER` |
| `immutable_hash`/`snapshot_hash` | **backend/src grep 0**(PM 재검증) | `ABSENT` |
| as-of 조회 | 🔴 **`effective_from *<=` 전역 0건** · 스냅샷 조회도 **최신승**(`AdminMenu.php:584` `ORDER BY created_at DESC LIMIT 1`) | `ABSENT` |
| hierarchy path / ancestors | Closure Table·Materialized Path **컬럼**(`full_path`/`path_str`/`tree_path`/`idpath`)·Nested Set(`lft`/`rgt`) **전부 0** | `ABSENT` |

### 🔴 ★기지 실측 정정 — `pm_baseline` 의 `captured_at` 은 **컬럼이 아니다**

ⓑ 브리핑은 *"`pm_baseline(snapshot_json, captured_at)`(`PM\Enterprise.php:55`·`:62`) — **`captured_at` 명명이 §48 필드와 정확히 일치**"* 라 했다. **정의부 실독 결과 이는 부정확하다.**

```
PM/Enterprise.php:55   name VARCHAR(160), bac DOUBLE DEFAULT 0, snapshot_json LONGTEXT, created_at VARCHAR(32),   ← MySQL DDL
PM/Enterprise.php:62   … bac REAL DEFAULT 0, snapshot_json TEXT, created_at TEXT)                                  ← SQLite DDL
PM/Enterprise.php:363  INSERT INTO pm_baseline (id,tenant_id,project_id,name,bac,snapshot_json,created_at) VALUES (?,?,?,?,?,?,?)
```

★**DDL 컬럼명은 `created_at` 이다. `captured_at` 은 DB 컬럼이 아니라 `snapshot_json` **내부 JSON 페이로드의 키**다**(`PM/Enterprise.php:360` — `$snapshot = ['captured_at' => self::now(), 'budget_amount' => …]`). **`captured_at` grep 전역 = 이 1건뿐**(PM 재검증).

**정정된 사실**: `captured_at` 이라는 **명명은 실재하나 질의 가능한 컬럼이 아니다** — JSON 문서 안에 묻혀 있어 **인덱스 불가 · as-of 조회 불가**. → §48 `captured_at` 의 판정은 `VALIDATED_LEGACY` 가 아니라 **`KV_ONLY`**(JSON 값으로만 존재). 🔴 **"명명이 정확히 일치하므로 선례 충족"으로 계산하면 역산이다**(규율 8 — 부재증명은 이름이 아니라 능력으로. **여기선 역으로 "존재증명"도 이름이 아니라 능력으로 해야 한다**).

### ★`menu_defaults` 의 4중 한계 — **PM 직접 확인**

| # | 한계 | 증거 |
|---|---|---|
| ⓐ | **`tenant_id` 없음 — 전역 1행** | `AdminMenu.php:119-122` 전 컬럼(`id`,`snapshot_data`,`version`,`created_at`) |
| ⓑ | **최신 1건만 조회** | `:584` `SELECT snapshot_data, version FROM menu_defaults ORDER BY created_at DESC LIMIT 1` — as-of 불가 |
| ⓒ | **`immutable_hash` 없음** | 위 DDL — 무결성 검증 수단 0 |
| ⓓ | ★**`version` 이 버전이 아니다** | **유일 생산자 `:308`** 이 `version` 자리에 **리터럴 `'baseline'` 고정** · `id` 는 `'baseline-'.gmdate('YmdHis')`. **`menu_defaults` 참조 전 8곳 중 INSERT 는 `:308` 단 1개**(PM 전수 확인) → **버전 계열이 아니라 라벨** |

⚠️ **추가**: `:281` 주석이 *"[282차 R2 MED] '공장 기본값 복원(reset)' 항상 404 근본수정 — menu_defaults 에 스냅샷을 기록하는 코드가 [없었다]"* 라 자인 → **282차까지 이 테이블은 0행이었다**(`seedDefaultsIfEmpty:294` 로 사후 보강). **"운영 중인 스냅샷 체계"로 인용 금지 · 라이브 행 수 미확인.**

## 1. 원문 전사 + 판정 — 필수 필드 **원문 29종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | organization_snapshot_id | 부재 · 인접 = `menu_defaults.id`(`AdminMenu.php:120`) `'baseline-'.YmdHis`(`:308`) · `pm_baseline.id` `genId('bl')`(`:362`) | `LEGACY_ADAPTER`(ID 패턴) |
| 2 | snapshot type | 부재 — 타입 축 전무. 별도 문서 [DSAR_ORGANIZATION_SNAPSHOT_TYPE.md](DSAR_ORGANIZATION_SNAPSHOT_TYPE.md) | `ABSENT` |
| 3 | tenant id | ★**선례 갈림** — `pm_baseline.tenant_id`(`PM/Enterprise.php:54`) **있음** · **`menu_defaults` 없음**(전역 1행) | `PARTIAL` |
| 4 | hierarchy id | 조직 계층 부재(`hierarch` grep 0) | `ABSENT` |
| 5 | hierarchy version id | 부재 — **엔티티 version 자체가 `menu_defaults.version` 1건이고 리터럴 고정** | `ABSENT` |
| 6 | organization unit | `org_unit`·`organization_unit` **grep 0** | `ABSENT` |
| 7 | organization unit version | 부재 · **optimistic lock `version` grep 0** | `ABSENT` |
| 8 | hierarchy path | **Materialized Path 컬럼 0**(`full_path`/`path_str`/`tree_path`/`idpath`). ⚠️인접 = 11번가 `whole`("대 > 중 > 소 > 세" `ChannelSync.php:918`) = **파생 경로 문자열 선례**(채널 카테고리 도메인) | `KEEP_SEPARATE_WITH_REASON` |
| 9 | hierarchy level | ⚠️인접 = `ChannelSync` `depth` 필드(`:914`) · 🔴**`wms_bins.level`(`Wms.php:193-194`)은 물리 선반단 ≠ 트리 depth — 인용 금지** | `KEEP_SEPARATE_WITH_REASON` |
| 10 | parents | ★**부모 간선 = `app_user.parent_user_id`(`UserAuth.php:156-167`) 유일** — **단 2단 봉인**(전 생성경로가 owner 직속 `:1226-1227`·`EnterpriseAuth.php:500`·`UserAuth.php:1574/1581`·`:670`) · 순회 **단일 홉**(`resolveTenantId:200-217` 재귀 없음) · **용도 = tenant 상속이지 보고선 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 11 | ancestors | **Closure Table 0**(`closure`/`ancestor`/`descendant`/`graph_path`) · `WITH RECURSIVE` **backend/src 0**. 인접 = `menu_tree` 조상 walk(`AdminMenu.php:540-555` 반복조회+`$depth<100` 캡) — **전역 트리·조직 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 12 | primary legal entity | 법인 엔티티 부재 · `biz_no`/`brn`/`corp_reg`/`tax_id` **0건** · 사업자정보 = `app_user` 평문(`UserAuth.php:499`·`:1720`) | `ABSENT` |
| 13 | business unit | 유일 히트 = **Trustpilot 자격증명 `business_unit_id`**(`ChannelSync.php:2573-2580`·`ChannelRegistry.php:126`) — 무관 | `ABSENT` |
| 14 | division | **grep 0** | `ABSENT` |
| 15 | department | **grep 0** | `ABSENT` |
| 16 | team | ★**실재** — `team` 테이블(`TeamPermissions.php:145-151`/`:168`) + `ORG_PRESET` 15단위(`:706-722`) + `seedOrg`(`:725-753`) **실배선**(`routes.php:1589`·`:2570`·`teamApi.js:261`). 🔴**단 `parent_team_id` 없음 = 구조가 아니라 열거** | `PARTIAL` |
| 17 | region | **3축 병존 · 전부 비조직**(`Db.php:681`,`690` 광고 인구통계 / `Connectors.php:2704-2710` Amazon Ads na·eu·fe / `Wms.php:129` 창고 시·도) · `APAC`/`EMEA`/`AMERICAS`/`LATAM` **grep 0** · parent region **0** | `KEEP_SEPARATE_WITH_REASON` |
| 18 | country | `Geo` = IP→ISO alpha-2 → **언어** 매핑(`Geo.php:23-53`·`COUNTRY_LANG_MAP`) · **Country→Region 매핑 코드 0건** · `app_user.country` 평문 1필드(`UserAuth.php:499`) | `KV_ONLY` |
| 19 | brands | ★**실재** — `catalog_brand`(`Catalog.php:151-169`) `tenant_id·name·code` · `UNIQUE(tenant_id,name)` · CRUD `:443-465` · `ensureBrand():427`. 🔴**단 목적 = 11번가 상품등록 필수 브랜드코드**(`BRAND_REQUIRED_CHANNELS=['11st','st11']` `:415`) = **상품속성이지 조직 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 20 | cost centers | `cost_center` **grep 0** | `ABSENT` |
| 21 | profit centers | `profit_center` **grep 0** | `ABSENT` |
| 22 | position reference | `position_unit` **grep 0** · 직위 개념 전무 · `reports_to`·`manager_id` **0**(단 `team.manager_user_id` 존재) | `ABSENT` |
| 23 | organization owners | 인접 = `team.manager_user_id`(`TeamPermissions.php:145-151`) · owner = `parent_user_id IS NULL` 계정(`PlanLimits.php:36-37`) — **덮어쓰기 · 이력 없음** | `PARTIAL` |
| 24 | membership reference | 인접 = `app_user.parent_user_id`(2단 봉인) · `team_role`(owner>manager>member `TeamPermissions.php:17`) — **현재 상태만 · 스냅샷 아님** | `PARTIAL` |
| 25 | effective_at | 🔴**부재** — `kr_fee_rule.effective_from`(`Db.php:898`)이 유일 effective date이나 **as-of 술어 0건** · 스냅샷과 무관(채널 요율) | `KEEP_SEPARATE_WITH_REASON` |
| 26 | captured_at | ★**정정** — DB 컬럼 아님. **`snapshot_json` 내부 JSON 키**(`PM/Enterprise.php:360`)로만 존재 · DDL 은 `created_at`(`:55`·`:62`) · **인덱스/질의 불가** | `KV_ONLY` |
| 27 | immutable_hash | 🔴**`immutable_hash`/`snapshot_hash` grep 0.** ★**패턴 선례는 실재** = `schema_migrations.checksum`(`Migrate.php:50` `hash('sha256',$sql)` · INSERT `:63-64`) · `menu_audit_log.hash_chain`(`AdminMenu.php:128`)(🔴 쓰기 체인만 실재·`verify()` 0·preimage `ts` `:195` 소실 → tamper-evident 아님; 검증형 정본 = `SecurityAudit::verify():56-68`) | `LEGACY_ADAPTER` |
| 28 | status | 부재 — `menu_defaults`·`pm_baseline` 둘 다 status 컬럼 없음(DDL 전 컬럼 확인) | `ABSENT` |
| 29 | evidence | 부재 | `ABSENT` |

**실측 개수: 29 / 29 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `PARTIAL` 5 · `LEGACY_ADAPTER` 3 · `KEEP_SEPARATE_WITH_REASON` 7 · `KV_ONLY` 3 · `ABSENT` 11.

## 1-2. 원문 전사 + 판정 — §49 Snapshot 원칙 **원문 10종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Snapshot 생성 이후 직접 수정 금지 | ★**현행 스냅샷 2건 다 UPDATE 코드가 없다**(`menu_defaults` INSERT 는 `:308` 단 1개 · `pm_baseline` INSERT `:363` — **UPDATE 문 grep 0**) = **사실상 append-only**. 🔴**단 강제 아님** — 불변을 **보장하는 장치(해시·트리거·제약)가 없어** 우발적 UPDATE 를 막지 못함 | `PARTIAL` |
| 2 | 현재 Hierarchy 조회 결과로 과거 Snapshot 대체 금지 | 🔴**현행이 정확히 이 금지를 위반하는 형태** — `AdminMenu.php:584` 가 **최신 1건만 조회**(`ORDER BY created_at DESC LIMIT 1`) · as-of 술어 0건 → **과거 스냅샷을 지목할 수단 자체가 없다** | `ABSENT` |
| 3 | Approval Decision 시점에 사용된 Hierarchy Version 저장 | 부재 — **승인 엔티티 부재**(5-3-2 확정) + **Version 축 부재** = 양쪽 다 없음 | `ABSENT` |
| 4 | Primary·Functional·Financial Path를 구분 | 부재 — **Path 개념 자체가 0**(Materialized Path 컬럼 0 · Closure 0) · 다중 경로 축 전무 | `ABSENT` |
| 5 | Legal Entity Boundary 기록 | 법인 엔티티 부재. 🔴**★최대 함정 — `DATA_SCOPES` 의 `'company'` 를 법인 경계로 계산 금지**: `effectiveScope():258` `if ($st === 'company') return null; // 전사 = 무제한` — **경계를 긋는 게 아니라 지운다**(의미 정반대) | `ABSENT` |
| 6 | Cross-country Path 기록 | 부재 — **Country→Region 매핑 코드 0건** · 국가 간 경로 개념 전무 | `ABSENT` |
| 7 | Matrix Relationship 기록 | `matrix_` **grep 0** — 매트릭스 조직 전무 | `ABSENT` |
| 8 | Snapshot Hash 검증 | 🔴 스냅샷 해시 **0**. ★**검증 패턴 선례는 실재** = `schema_migrations.checksum`(`Migrate.php:50`,`:63-64`) · `menu_audit_log.hash_chain` prev-chain(`AdminMenu.php:182-197`·`lastHash():214-219`). 🔴 단 `menu_audit_log.hash_chain` 은 **쓰기 체인만 실재**하고 검증기(`verify()`)가 0이며 preimage `ts`(`:195`) 소실로 재계산 불가 → **tamper-evident 아님** — 실제 재계산·교차검증이 도는 검증형 정본은 `SecurityAudit::verify():56-68` 이다 | `LEGACY_ADAPTER` |
| 9 | 원본 Source Reference 보존 | 부재 — 원천 참조 축 없음(**ERP/HRIS 커넥터 0** · `ChannelRegistry.php:12`,`:79` `group_type` 열거에 `erp`·`finance`·`hr` 없음) | `ABSENT` |
| 10 | 민감 Employee 정보 최소화 | ★**정책 선례 실재** — 헌법 **No PII storage**(CLAUDE.md · v418.1 집계 전용 설계). ⚠️단 조직 스냅샷 맥락의 employee 최소화 규칙은 부재 | `LEGACY_ADAPTER` |

**실측 개수: 10 / 10 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `PARTIAL` 1 · `LEGACY_ADAPTER` 3 · `ABSENT` 6.

> ⚠️ **규율 5 준수**: §49 는 **`evidence` 로 끝나지 않는다**(*"민감 Employee 정보 최소화"* 가 마지막). **관례에 맞추려 없는 항목을 추가하지 않았다.**

## 2. 규칙

- ★**§48 판정 = `PARTIAL`.** 근거: **스냅샷이라는 형태(JSON 문서 + 생성시각 + 테넌트)는 `pm_baseline` 이, 버전 라벨은 `menu_defaults` 가, 불변 해시는 `schema_migrations.checksum` 이 각각 선례를 제공**한다. 그러나 **29 필드 중 `VALIDATED_LEGACY` 는 0** — 조직 축(hierarchy/legal entity/cost center/…)이 통째로 없고 **as-of 조회 능력이 전무**하다.
- ★**§49 판정 = `PARTIAL`.** 10원칙 중 **3건은 인접 패턴 존재**(Hash 검증·PII 최소화·append-only 관행), **나머지 7건은 선행 엔티티(Version/Path/Legal Entity/승인) 부재로 성립 불가.**
- 🔴 **★`pm_baseline.captured_at` 을 컬럼으로 인용하지 마라 — JSON 키다**(`PM/Enterprise.php:360`). DDL 은 `created_at`(`:55`·`:62`). **ⓑ 브리핑의 "명명이 §48 필드와 정확히 일치" 는 정정 대상**이며, 정확한 표현 = **"명명은 실재하나 질의 불가한 JSON 값"**(`KV_ONLY`). **JSON 안에 시점을 묻으면 인덱스도 as-of 조회도 불가능하다 — 신설 시 반드시 컬럼으로 승격하라.**
- ★**Snapshot 신설 = `pm_baseline` 골격 + `menu_defaults` 4중 결함 교정 + `schema_migrations.checksum` 해시.** 구체적으로:
  - **`tenant_id` 필수**(`pm_baseline.tenant_id` `PM/Enterprise.php:54` 패턴 · 🔴 `menu_defaults` 전역 1행 복제 금지 = **테넌트 격리 위반**)
  - **`captured_at`·`effective_at` 은 컬럼으로**(JSON 키 금지) + **인덱스**
  - **`immutable_hash CHAR(64)`** = `hash('sha256', <정규화 직렬화>)`(`Migrate.php:50` 패턴)
  - **`version` 에 리터럴 상수 금지**(`AdminMenu.php:308` 의 `'baseline'` 고정이 반면교사)
  - **조회는 as-of 술어**(🔴 `ORDER BY created_at DESC LIMIT 1` 복제 금지 — `AdminMenu.php:584` 가 바로 §49 원칙 2 위반 형태)
- 🔴 **★immutable_hash 계산 시 직렬화 정규화를 먼저 정의하라.** `Migrate.php:50` 은 **파일 원문 바이트**를 해싱하므로 안전하지만, **조직 스냅샷은 DB 행에서 조립한 구조체**다 — **키 순서·부동소수 표기·NULL/빈문자·타임존 표기가 흔들리면 같은 스냅샷이 다른 해시를 낳는다.** 🔴 **`json_encode` 기본 옵션에 의존하지 마라**(PHP 연관배열 순서 의존). **정렬된 키 + 명시적 스칼라 규칙을 계약으로 못박아라.**
- 🔴 **불변을 "UPDATE 코드가 없다"로 보장하지 마라.** 현행 append-only 는 **관행이지 강제가 아니다**(제약·트리거·해시 검증 0). §49 원칙 1 을 충족하려면 **해시 재검증 경로**가 있어야 한다 — **저장 시 해시 기록 + 판독 시 재계산 대조**(`Migrate.php:63-64` 가 checksum 을 남기는 이유와 동형).
- 🔴 **★`DATA_SCOPES` 의 `'company'` 를 Legal Entity Boundary 로 계산 금지**(§49 원칙 5). `effectiveScope():258` — `if ($st === 'company') return null; // 전사 = 무제한`. **이름만 보면 법인 경계, 실제 의미는 무제한 센티넬 = 정반대.** ⓑ 가 지목한 **최대 함정**.
- 🔴 **`menu_defaults` 를 "운영 중인 스냅샷 체계"로 인용 금지** — `AdminMenu.php:281` 주석이 **282차까지 0행이었음을 자인**. **라이브 행 수 미확인.**
- **스키마 도입 = `ensureTables` 경로 + MySQL/SQLite 양 방언 동시 작성**(ⓑ §20 제약 1·3). ⚠️**JSON 컬럼 주의**: `menu_defaults` 가 MySQL `JSON`(`:120`) / SQLite `TEXT`(`:139`) 로 **방언별 타입이 갈린다** — 조직 스냅샷도 동일 분기 필요.
