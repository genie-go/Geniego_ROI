# DSAR — Organization Hierarchy Evidence Contract (§62)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §62 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

계약명: **`ORGANIZATION_HIERARCHY_EVIDENCE`**

## 0. 현행 실측 (file:line)

### ★전사 정확성 고지 (5-3-1 교훈의 직접 적용)

5-3-1 에서 **필드 목록 끝의 `evidence` 를 19축에서 일관되게 누락**했다(정확히 1씩 부족 = 일관된 편향). **본 문서는 그 재발 방지 대상이다.**

- 🔴 **원문 재확인 결과: §62 필수 필드 목록은 `evidence` 로 끝나지 않는다.** 목록은 **`evidence id` 로 시작**(첫 항목)해 **`audit reference` 로 끝난다**(마지막 항목). 
- ★규율 5 후단 준수: **관례에 맞추려고 없는 `evidence` 를 끝에 추가하지 않았다.** 원문 그대로 **33종**이다.
- 별도 목록인 **"다음을 저장하지 마라"(금지 9종)** 도 전사했다.

### 필드별 현행 자산 실측

| 원문 필드군 | 현행 실측 | 판정 |
|---|---|---|
| evidence id | Evidence 엔티티 자체가 **grep 0** | `ABSENT` |
| tenant | 도메인 테이블 관례 `tenant_id` 보유 · ★**테넌트 마스터 테이블 없음**(`api_key.tenant_id` **FK 없음** `Db.php:944`) · 발급 = `'acct_'.$id` 문자열 생성(`UserAuth.php:220-224`) | `PARTIAL`(키만 · 참조 무결성 없음) |
| organization registry / unit / unit version | `ORG_PRESET` 15단위(`TeamPermissions.php:706-722`) = **구조가 아니라 열거** · `team` DDL(`:145-151`) `parent_team_id` **없음** · 엔티티 version **0** | `PARTIAL` / `ABSENT` |
| hierarchy / hierarchy version | **grep 0** | `ABSENT` |
| graph node / graph edge | `graph_node`/`graph_edge`(`Db.php:816-839`) — `tenant_id`·`node_type`+`node_id`·`src/dst`·`edge_weight`·`edge_label`·`meta_json`·**양방향 인덱스**(`:838-839`) · `/v419/graph/*` 9라우트(`routes.php:721-729`) | ★`KEEP_SEPARATE_WITH_REASON` — **도메인 = 마케팅 귀속** · **§66 구조 선례 가치 최상** · ⚠️**내부 생산자 0**(외부 POST 전용 유입 · VACUOUS 가능성 미배제) |
| graph path | Closure Table·Path Index·Materialized Path 컬럼 **전부 0** · `GraphScore:187-240` 은 **하드코딩 3-hop 런타임 전개**(사전계산 경로 테이블 없음) | `ABSENT` |
| relationship type | `graph_edge.edge_label` 존재(마케팅) · 조직 관계 타입 **0** | `ABSENT` |
| legal entity binding | `biz_no`/`brn`/`corp_reg`/`tax_id` **전부 0건** · 사업자정보 = `app_user` **평문 필드**(`UserAuth.php:499`·`:1720`) | `ABSENT` |
| workspace binding | Workspace 엔티티 **0** | `ABSENT` |
| region | ★**3축 병존**: 광고 인구통계(`Db.php:681`,`690`) / Amazon Ads 엔드포인트 na·eu·fe(`Connectors.php:2704-2710`) / WMS 창고 시·도(`Wms.php:129`·`regionOf():284-286`). **`APAC`/`EMEA`/`AMERICAS` grep 0 · parent region 0** | `NAME_ONLY` — 조직 region 아님 |
| country | `Geo`(`Geo.php:23-53`) = IP→ISO alpha-2 · `COUNTRY_LANG_MAP` = 국가→**언어**. ★**Country→Region 매핑 코드 0건** · `app_user.country` 평문 | `PARTIAL`(값만 · binding 없음) |
| cost center / profit center | **grep 0** | `ABSENT` |
| position unit | **grep 0** | `ABSENT` |
| membership | **grep 0** · 인접 = `team` 멤버(평면) | `ABSENT` |
| owner | `app_user.parent_user_id IS NULL` = owner(`PlanLimits.php:36-37`) · `team.manager_user_id`(`TeamPermissions.php:145-151`) | `PARTIAL` — 조직 owner 아님 |
| effective period | ★**유일 effective date = `kr_fee_rule.effective_from`**(`Db.php:898`, 쓰기 `KrChannel.php:128-140`) · 🔴**`WHERE effective_from <= :as_of` 술어 전역 0건** · **`effective_to`/`valid_to` grep 0** | `ABSENT` — **폐구간 모델은 순수 신규** |
| source system / source record / source version | ★**커넥터 자격증명 축은 실재**하나 조직 소스 **0**. `ChannelRegistry.php:12`,`:79` `group_type` 열거 = sales/marketing/logistics/pg/messaging + analytics(`:112`)·cs(`:116`)·esp(`:121`)·review(`:125`) → **`erp`·`hr` 값 없음**(ERP/HRIS 부재의 능력축 증명) | `ABSENT` |
| change request | Change Request 엔티티 **0** · 인접 = `admin_growth_approval`(`AdminGrowth.php` · status pending/approved/rejected `:1321`·`:1327`) | `LEGACY_ADAPTER` |
| approval reference | 동상 | `LEGACY_ADAPTER` |
| snapshot reference | `menu_defaults(snapshot_data JSON, version, created_at)`(`AdminMenu.php:120`·생성 `:308`·복원 `:584-590`) — ★**immutable_hash 없음 · tenant 없음 · 최신 1건만 조회** · `pm_baseline(snapshot_json, captured_at)`(`PM\Enterprise.php:55`·`:62`·`:360-364`) | `PARTIAL` — 스냅샷 선례 존재 · 불변성 없음 |
| reconciliation reference | Reconciliation **0** · ★집행 수단도 없음(`ensureTables` 는 **백필을 하지 않는다**) | `ABSENT` |
| effective_at | 위 effective period 와 동일 | `ABSENT` |
| recorded_at | `created_at` 관례 보편 · `pm_baseline.captured_at`(`PM\Enterprise.php:62`) | `PARTIAL`(관례만) |
| immutable hash | ★**선례 실재**: `schema_migrations.checksum`(`Migrate.php:50` `hash('sha256',$sql)`·`:63-64`·`:145`/`:151`) · `menu_audit_log.hash_chain CHAR(64)`(`AdminMenu.php:128`) SHA-256 prev-chain(생성 `:182-197`·`lastHash():214-219`) | ★`VALIDATED_LEGACY`(패턴) — **조직 도메인엔 미적용** |
| lineage | Lineage 엔티티 조직 도메인 **0** · 헌법 Vol3 부록이 Lineage 를 정의하나 조직 축 미구현 | `ABSENT` |
| audit reference | ★**3계층 실재**: `menu_audit_log`(해시체인) · `pm_audit_log`(tenant+entity+diff_json+3인덱스, migration `20260526_168_008:5-20`) · 전역 `audit_log`(4컬럼·tenant 없음 `Db.php:540-545`/`AdminGrowth.php:157-159`) | `VALIDATED_LEGACY`(패턴 · 상세는 §63 문서) |

### 금지 저장 축 실측

| 금지 대상 | 현행 관련 실측 |
|---|---|
| Password / Token / Credential Secret | `channel_credential` KV(`Db.php:976-982`) · KEK 회전(`EnterpriseAuth`) · ★상시 규칙 = **자격증명 평문노출 회피** · `tools/scan_secrets.sh` + `.githooks/pre-commit` + `security-scan.yml` `repo-guards`(`:57`·`:82`) 가 **형태 차단**(B4) |
| Employee PII / 급여 / HR 평가 | ★**HRIS/ERP 커넥터 0** → 현재 유입 경로 자체가 없음. 신설 시 즉시 위험 |
| Bank Data | 결제 = Paddle 위임 |
| Source System 전체 Payload | ⚠️**레포 관례가 위반 방향**: `meta_json`(`graph_edge`)·`snapshot_data JSON`·`diff_json`·`details_json` 등 **JSON 통째 저장이 보편** |
| 삭제 요구 개인정보 원문 | DSAR 삭제 축 — 283차 DSAR 구현 존재 |

## 1. 원문 전사 + 판정

### 1-A. 필수 필드 — **원문 33종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | evidence id | Evidence 엔티티 부재 | `NOT_APPLICABLE` |
| 2 | tenant | 키 관례 실재 · 마스터 테이블·FK 없음 | `PARTIAL` |
| 3 | organization registry | `ORG_PRESET` 열거(구조 아님) | `PARTIAL` |
| 4 | organization unit | `team` 평면(`parent_team_id` 없음) | `PARTIAL` |
| 5 | organization unit version | 부재 | `NOT_APPLICABLE` |
| 6 | hierarchy | 부재 | `NOT_APPLICABLE` |
| 7 | hierarchy version | 부재 | `NOT_APPLICABLE` |
| 8 | graph node | `graph_node` = 마케팅 귀속 | `KEEP_SEPARATE_WITH_REASON` |
| 9 | graph edge | `graph_edge` = 마케팅 귀속 | `KEEP_SEPARATE_WITH_REASON` |
| 10 | graph path | Path Index 전례 0 · 3-hop 하드코딩만 | `NOT_APPLICABLE` |
| 11 | relationship type | 조직 관계 타입 0 | `NOT_APPLICABLE` |
| 12 | legal entity binding | Legal Entity 0 | `NOT_APPLICABLE` |
| 13 | workspace binding | Workspace 0 | `NOT_APPLICABLE` |
| 14 | region | 3축 병존 · 조직 region 아님 | `NAME_ONLY` |
| 15 | country | 값만 존재 · binding 0 | `PARTIAL` |
| 16 | cost center | grep 0 | `NOT_APPLICABLE` |
| 17 | profit center | grep 0 | `NOT_APPLICABLE` |
| 18 | position unit | grep 0 | `NOT_APPLICABLE` |
| 19 | membership | grep 0 | `NOT_APPLICABLE` |
| 20 | owner | `parent_user_id IS NULL`·`team.manager_user_id` — 조직 owner 아님 | `PARTIAL` |
| 21 | effective period | ★폐구간 0(`effective_to` grep 0) | `NOT_APPLICABLE` |
| 22 | source system | ERP/HRIS 0(`group_type` 열거에 `erp`·`hr` 없음) | `NOT_APPLICABLE` |
| 23 | source record | 부재 | `NOT_APPLICABLE` |
| 24 | source version | 부재 | `NOT_APPLICABLE` |
| 25 | change request | 인접 `admin_growth_approval` | `LEGACY_ADAPTER` |
| 26 | approval reference | 동상 | `LEGACY_ADAPTER` |
| 27 | snapshot reference | `menu_defaults`·`pm_baseline`(불변성 없음) | `PARTIAL` |
| 28 | reconciliation reference | 부재 · 집행 수단도 없음 | `NOT_APPLICABLE` |
| 29 | effective_at | ★as-of 술어 전역 0건 | `NOT_APPLICABLE` |
| 30 | recorded_at | `created_at`·`captured_at` 관례 | `PARTIAL` |
| 31 | immutable hash | ★`schema_migrations.checksum`·`menu_audit_log.hash_chain` 선례 | `VALIDATED_LEGACY`(패턴 · 조직 미적용) |
| 32 | lineage | 부재 | `NOT_APPLICABLE` |
| 33 | audit reference | ★`menu_audit_log`/`pm_audit_log` 선례 | `VALIDATED_LEGACY`(패턴 · 조직 미적용) |

**실측 개수: 33 / 33 전사.** ★**원문 목록은 `evidence id` 로 시작해 `audit reference` 로 끝난다 — 끝에 `evidence` 항목이 없으며, 없는 것을 추가하지 않았다.**

### 1-B. 저장 금지 — **원문 9종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Password | 조직 Evidence 부재 · 형태 차단 `tools/scan_secrets.sh`(pre-commit + `repo-guards :82`) | `NOT_APPLICABLE`(정책 계약) |
| 2 | Token | 동상 | `NOT_APPLICABLE` |
| 3 | Credential Secret | `channel_credential` KV(`Db.php:976-982`)는 **자격증명 저장소 자체** — Evidence 에 복사 금지 대상 | `NOT_APPLICABLE` |
| 4 | 불필요한 Employee PII | HRIS 커넥터 0 → 유입 경로 부재 | `NOT_APPLICABLE` |
| 5 | 급여 정보 | `payroll` grep 0 | `NOT_APPLICABLE` |
| 6 | 민감 HR 평가 정보 | 부재 | `NOT_APPLICABLE` |
| 7 | Bank Data | 결제 = Paddle 위임 | `NOT_APPLICABLE` |
| 8 | Source System 전체 Payload | 🔴**레포 관례가 위반 방향**(`meta_json`·`snapshot_data`·`diff_json`·`details_json` JSON 통째 저장 보편) | `NOT_APPLICABLE`(관례 역행 경고) |
| 9 | 삭제가 요구되는 개인정보 원문 | DSAR 삭제 축과 정합 필요 | `NOT_APPLICABLE` |

**실측 개수: 9 / 9 전사.**

**§62 합계: 필수 33 + 금지 9 = 42 / 42 전사.**

## 2. 규칙

- 🔴 **필드 33종 — 누락 0 확인.** 5-3-1 이 19축에서 목록 끝 항목을 일관 누락한 편향의 직접 대상 문서다. ★**동시에 반대 편향도 금지** — 원문이 `audit reference` 로 끝나므로 **`evidence` 항목을 지어내 34종으로 만들지 않았다**(규율 5 후단).
- 🔴 **`immutable hash`(#31)·`audit reference`(#33) 는 "선례 없음→신설"이 아니다.** `schema_migrations.checksum`(`Migrate.php:50`)·`menu_audit_log.hash_chain`(`AdminMenu.php:128`, 생성 `:182-197`)·`pm_audit_log`(migration `20260526_168_008`) = **실 선례**. **패턴 확장 강제 · 중복 해시/감사 스토어 신설 금지.**
- 🔴 **`graph node`(#8)/`graph edge`(#9) 를 커버로 계산 금지.** `graph_node`/`graph_edge` 는 **마케팅 귀속 도메인**(influencer→creative→sku→order) → `KEEP_SEPARATE_WITH_REASON`. ★**단 구조 선례 가치는 최상**(Node/Edge 분리 + 타입드 관계 + 가중치 + 양방향 인덱스 이미 존재) → **전용 그래프 DB 도입 불필요**(Neo4j/Cypher/Gremlin/Neptune/Arango/JanusGraph/TinkerPop **grep 0**). ⚠️**내부 생산자 0**(외부 POST 전용 유입)이므로 **"운영 중인 그래프"로 인용 금지**.
- 🔴 **`region`(#14) 을 실재로 계산 금지.** 3축 병존 전부 조직과 무관 · `APAC`/`EMEA` 열거 0 · parent region 0. `country`(#15) 도 **값은 있으나 binding 없음** — ★**Country→Region 매핑 코드 0건**.
- 🔴 **`effective period`(#21)/`effective_at`(#29) 은 컬럼을 얹는 것으로 끝나지 않는다.** ★**`WHERE effective_from <= :as_of` 술어 = backend/src 전역 0건** · `effective_to` **0건**. 유일 선례 `kr_fee_rule.effective_from`(`Db.php:898`)의 읽기가 **전부 최신승**(`Pnl.php:454`)이라 **컬럼만 만들면 동일하게 퇴화**한다. **as-of 조회 능력이 신규 구현 대상**임을 명시하라.
- 🔴 **#8(Source System 전체 Payload 금지) 은 레포 관례와 정면 충돌.** `meta_json`·`snapshot_data JSON`·`diff_json`·`details_json` = **JSON 통째 저장이 보편**. 조직 Evidence 에 이 관례를 답습하면 **설계 시점에 이미 §62 위반**. → **필드 선별 저장(allow-list) 강제 · raw payload 참조는 `source record`(#23) 식별자로만.**
- **#4~#6(Employee PII·급여·HR 평가) 은 "현재 유입 경로 없음"이 방어가 아니다.** HRIS/SCIM 인입을 여는 순간(`EnterpriseAuth` SCIM Groups 확장 등) **즉시 활성 위험**. → **인입 설계와 동시에 필드 allow-list 확정**.
- **자격증명 형태 차단은 재사용**: `tools/scan_secrets.sh` **규칙 SSOT** — pre-commit + `repo-guards`(`security-scan.yml:82`) 양쪽이 **같은 스크립트 호출**. 🔴 **정규식 CI 복사 금지.** ⚠️단 이는 **`WIRED(CI·탐지)` 등급**이며 브랜치 보호 미설정(G-06b)이라 **예방이 아니라 탐지**다.
- 🔴 **42종 "있다고 가정"하고 배선 금지.** `VALIDATED_LEGACY` 는 **패턴 축 2건(#31·#33)뿐**이며 **조직 도메인엔 미적용** — 필드 커버가 아니다.
