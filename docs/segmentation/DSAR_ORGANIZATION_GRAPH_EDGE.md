# DSAR — Organization Graph Edge (§16)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §16 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)
>
> 자매 문서: Node = [DSAR_ORGANIZATION_GRAPH_NODE.md](DSAR_ORGANIZATION_GRAPH_NODE.md) · Path = [DSAR_ORGANIZATION_GRAPH_PATH.md](DSAR_ORGANIZATION_GRAPH_PATH.md)

## 0. 현행 실측 (file:line)

### ★ 핵심 — `graph_edge` = §16 의 **구조적 쌍둥이가 이미 존재한다**(레포 최적 선례)

| 항목 | 실측 | 판정 |
|---|---|---|
| `graph_edge` DDL | `Db.php:826-837` — `id` · `tenant_id VARCHAR(100)` · **`src_type`/`src_id` → `dst_type`/`dst_id`**(타입드 양끝) · **`edge_weight DOUBLE NOT NULL DEFAULT 1.0`** · **`edge_label VARCHAR(100)`** · `meta_json MEDIUMTEXT` · `created_at` | `KEEP_SEPARATE_WITH_REASON` |
| **양방향 인덱스** | `Db.php:838-839` — `idx_graph_edge_src(tenant_id,src_type,src_id)` · `idx_graph_edge_dst(tenant_id,dst_type,dst_id)` | ★**Ancestor/Descendant 양방향 조회의 정본 선례** |
| 멱등 upsert | `GraphScore.php:138-155` — `(tenant,src,dst)` 단위 1행 유지. 주석 `:135-137` 이 **append-only 였던 과거를 자인**: *"동일 (src,dst) 엣지를 멱등 재동기화할 때마다 무조건 INSERT 해 중복행이 누적, SUM(edge_weight) 집계 스코어가 단조 팽창해 top-scorer 랭킹이 최다동기화 엔티티로 왜곡"* | ★**교훈: 엣지 중복 = 집계 왜곡** |
| 참조무결성 | `GraphScore.php:126-133` — 엣지 upsert 시 양끝 노드 **자동 생성**(MySQL `INSERT IGNORE` / SQLite `INSERT OR IGNORE`) | 선례 |
| 배선 | `POST/GET /v419/graph/edges`(`routes.php:723-724`) — `/v419/graph/*` 9라우트 중 2 | REAL |
| **전용 그래프 DB** | Neo4j·Cypher·Gremlin·Neptune·Arango·JanusGraph·TinkerPop **grep 0** | **도입 불필요** |

### ★ 두 번째 선례 — `pm_task_dependencies` (엣지 리스트의 **최상급** 구현)

| 항목 | 실측 |
|---|---|
| 저장 | 엣지 리스트 · **`UNIQUE(tenant,pred,succ,dep_type)`** · pred/succ **양방향 인덱스**(migration `20260526_168_004:12-14`) |
| 쓰기 게이트 | ★**쓰기 전 차단** — self-loop 422(`PM/Dependencies.php:29-31` `self_dependency`) · cycle 422(`:32-34` `cycle_detected`) → **INSERT 는 검증 통과 후에만**(`:37-41`) |
| 중복 방어 | `PDOException` `Duplicate` → **409**(`:42-46`) — UNIQUE 제약이 실제로 작동 |
| 감사 | `auditLog`(`:48-54`) — tenant·actor·entity·diff·ip·ua |
| 배선 | `routes.php:1424-1425` + `/api` 별칭 `:1472-1473` | REAL |

**→ `graph_edge` 는 `UNIQUE` 도 순환방어도 없다. `pm_task_dependencies` 가 두 결함을 모두 해결한 상급 선례다.**

### ★축 주의 — 도메인이 다르다

`graph_edge` 의 도메인은 **마케팅 귀속**(`GraphScore.php:15` `influencer → creative → sku → order`)이다. 조직 커버로 계산하면 **역산** → `KEEP_SEPARATE_WITH_REASON`. **단 §66 선례 가치 최상.**

### ⚠️ 인용 시 주의 — 실측된 약점 4건

| # | 실측 | 의미 |
|---|---|---|
| 1 | **내부 생산자 0** — `upsertEdge` 호출처 = 라우트뿐 · frontend 0 | **외부 POST 전용** → `VACUOUS` 미배제(라이브 미조회). 🔴 "운영 중"으로 인용 금지 |
| 2 | **순환 방어 0** — `graph_edge` 에 cycle/self-loop 차단 코드 **없음**. `upsertEdge`(`:107-155`)는 `src == dst` 도 그대로 INSERT | `pm_task_dependencies` 와 정반대. **조직 엣지에 이 선례를 복제하면 즉시 결함** |
| 3 | **타입 화이트리스트 비대칭** — `upsertNode` 는 4종 강제(`:57-59` 위반 422)이나 **`upsertEdge` 는 `src_type`/`dst_type` 을 검증하지 않는다**(`:112-119` 공백 체크만) | 엣지 경유로 **화이트리스트 밖 노드가 자동 생성**된다(`:126-133`). 유효성 축이 두 경로에서 불일치 |
| 4 | **`edge_direction` 컬럼 없음** — 방향은 `src`→`dst` 컬럼 배치로 **암묵 표현** · 무방향/양방향 표현 불가 | §16 `edge direction` 은 명시 필드 요구 |

### 인접 자산

| 자산 | 실측 | 조직 해당 |
|---|---|---|
| `agency_client_link` | `AgencyPortal.php:64-72`(MySQL)/`:80`(SQLite) — `agency_id ↔ client_tenant_id` · `status`(pending/approved/revoked) · `scope_json` · `invited_at`/`approved_at`/`revoked_at` · **`UNIQUE(agency_id, client_tenant_id)`** · 양방향 인덱스(`:71`) · **매 요청 fail-closed 재검증**(`resolveAccessContext:414-432` → `status!=='approved'` null `:427` → `index.php:85-90` 403) | 🔴 **커버 금지** — ⓐ **이분(bipartite)**: `agency_account`(`:56-63`)는 테넌트가 아니라 **별도 인증 realm** ⓑ **N:M · 1홉 전용**(순회·이행성·깊이 0) ⓒ 조직↔조직 엣지 아님 ⓓ **동의 기반 접근 허가**이지 소유·포함 아님. ⚠️실 데이터 미확인 |
| `crm_identity_merge_link(a_id,b_id)` | `CRM.php:708-712` · `UNIQUE(tenant_id,a_id,b_id)` · union-find 등가류(`resolveIdentitiesForTenant:597-643`) | 🔴 ★**등가관계(대칭·추이적) ≠ 계층(반대칭 부분순서)** · **무방향 엣지** → 계층 엣지로 계산하면 역산 |
| `journeys.edges` | JSON 문서 · 단일 next(`JourneyBuilder.php:786`) · **런타임 방문집합만**(`:511-518` — 작성자 JSON 무검증 자인) | 마케팅 여정 · 쓰기 전 검증 없음 → **반면교사** |
| `sso_group_role_map(tenant_id, group_name, role)` | `EnterpriseAuth.php:70`·`:72` · 해석 `roleForGroups:78-85` · 어설션 `groups` 수신 `:374` · `group_name IN (?)` 단순 룩업(`:84`) | ★**그룹이 엔티티가 아니라 평문 문자열** — 부모-자식·중첩그룹·그룹ID 없음. 수신하되 저장 않고 롤 1개로 즉시 소모 → IdP 발 조직 엣지 인입 경로 **없음**(SCIM Groups 는 **GET 전용** `scimListGroups:417-423`·`routes.php:932`) |
| `reports_to`·`manager_id` | **backend/src grep 0**(단 `team.manager_user_id` 존재 — `TeamPermissions.php:145-151`) | 보고선 엣지 `ABSENT` |

## 1. 원문 전사 + 판정 — **원문 19종**

`ORGANIZATION_GRAPH_EDGE` 필수 필드.

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | organization_graph_edge_id | `graph_edge.id INT AUTO_INCREMENT`(`Db.php:827`) · `pm_task_dependencies.id`(`PM/Dependencies.php:35` `genId('dep')`) = 대리키 선례 2종 | `KEEP_SEPARATE_WITH_REASON` |
| 2 | organization_hierarchy_version_id | 엔티티 version = `menu_defaults.version` 단 1건(전역·최신 1건만) · optimistic lock version **grep 0** · `graph_edge` 에 version 컬럼 **없음** | `NOT_APPLICABLE` |
| 3 | source_node_id | `graph_edge.src_type`+`src_id`(`Db.php:829-830`) · 인덱스 `idx_graph_edge_src`(`:838`) · `pm_task_dependencies.predecessor_id` | `KEEP_SEPARATE_WITH_REASON` |
| 4 | target_node_id | `graph_edge.dst_type`+`dst_id`(`Db.php:831-832`) · 인덱스 `idx_graph_edge_dst`(`:839`) · `pm_task_dependencies.successor_id` | `KEEP_SEPARATE_WITH_REASON` |
| 5 | relationship_type_id | **관계타입 엔티티 없음.** 최근접 = `graph_edge.edge_label VARCHAR(100)`(`Db.php:834`, **nullable·자유문자열·FK 없음** `GraphScore.php:143`·`:150`) · `pm_task_dependencies.dep_type`(`self::DEP_TYPES` 화이트리스트 `PM/Dependencies.php:26` · **UNIQUE 키에 포함** `20260526_168_004`) | `KV_ONLY` |
| 6 | edge direction | **컬럼 없음** — `src`→`dst` 컬럼 배치로 암묵 표현(`Db.php:829-832`) · 무방향/양방향 표현 불가 | `NOT_APPLICABLE` |
| 7 | primary 여부 | `is_primary`/`primary_flag` **grep 0** · §17 Primary Parent 개념 자체 부재 | `NOT_APPLICABLE` |
| 8 | hierarchy forming 여부 | **grep 0.** 계층을 형성하는 엣지와 참조 엣지의 구분 개념 없음(`graph_edge` 는 전부 동격) | `NOT_APPLICABLE` |
| 9 | approval routing eligible 여부 | **grep 0.** ★승인 라우팅 자체가 조직을 경유하지 않는다 — 승인은 노드가 아니라 **핸들러 메서드**(5-3-2 실측: `Mapping::approve`) · `INSERT INTO action_request` **grep 0**(생산자 전무) | `NOT_APPLICABLE` |
| 10 | manager resolution eligible 여부 | **grep 0.** `manager_id`·`reports_to` **0** · `team.manager_user_id`(`TeamPermissions.php:145-151`)는 **팀 1개의 관리자 포인터**이지 엣지 자격 플래그 아님 · ★`app_user.parent_user_id` 는 **보고선이 아니라 테넌트 상속용**(`UserAuth.php:197`·`:214` 동일값 UPDATE) | `NAME_ONLY` |
| 11 | edge priority | **grep 0.** 인접 = `menu_tree` 의 `display_order`(정렬 `AdminMenu.php:272`·`:333`) — 형제 표시순서이지 엣지 우선순위 아님 | `NOT_APPLICABLE` |
| 12 | edge weight | ★**`graph_edge.edge_weight DOUBLE NOT NULL DEFAULT 1.0`**(`Db.php:833`) — **레포 유일 실 엣지 가중치.** 쓰기 `GraphScore.php:121`·`:142-153` · 집계 `SUM(edge_weight)`(`:193`·`:207`·`:217`·`:232`) · 인접 `pm_task_dependencies.lag_days`(`PM/Dependencies.php:25`·`:41`) | `KEEP_SEPARATE_WITH_REASON` |
| 13 | legal entity boundary type | **grep 0** — 법인 엔티티 자체가 없다(`legal_entity_id` 0 · `biz_no`/`brn`/`corp_reg`/`tax_id` 0 · 사업자정보는 `app_user` 평문필드 `UserAuth.php:499`·`:1720`). 축 전사는 아래 §1-B | `NOT_APPLICABLE` |
| 14 | source reference | **엣지 출처 컬럼 없음.** ⚠️`graph_edge.meta_json`(`Db.php:835`)은 **요청 본문 잔여를 통째로 담는 슬롯**(`GraphScore.php:123-124`·`:151`)이지 출처 필드 아님. 인접 = `schema_migrations.checksum`(`Migrate.php:50`)·`pm_audit_log.diff_json`(migration `20260526_168_008`) | `NOT_APPLICABLE` |
| 15 | valid_from | `kr_fee_rule.effective_from`(`Db.php:898`) = **전 코드베이스 유일 effective date** · 🔴 **읽기가 전부 최신승**(`ORDER BY effective_from DESC LIMIT 1` — `Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`) · **`WHERE effective_from <= :as_of` 전역 0건** → 컬럼만 있고 as-of 능력 없음. `graph_edge` 에는 컬럼조차 없음 | `PARTIAL`(타 도메인 컬럼 선례만) |
| 16 | valid_to | `valid_to`/`effective_to` **grep 0** → **폐구간 순수 신규** | `NOT_APPLICABLE` |
| 17 | recorded_at | `graph_edge.created_at VARCHAR(32)`(`Db.php:836` · 쓰기 `GraphScore.php:152` `gmdate('c')`) = System Time 선례. **단 UPDATE 경로(`:142`)는 `created_at` 을 갱신하지 않아 최초 생성시각으로 고정** → recorded period 표현 불가 | `PARTIAL` |
| 18 | status | `graph_edge` 에 `status` 컬럼 **없음**(`Db.php:826-837`) — 엣지 철회 = **행 삭제뿐**(이력 소실). 인접 = `agency_client_link.status`(pending/approved/revoked + `revoked_at` `AgencyPortal.php:64-72`) | `LEGACY_ADAPTER`(status+타임스탬프 패턴) |
| 19 | **evidence** | `graph_edge` 무. 인접 선례 = `menu_audit_log.hash_chain CHAR(64)` SHA-256 prev-chain(`AdminMenu.php:128`·`:182-197`·`lastHash():214-219`) · `pm_audit_log`(tenant+entity+diff_json+3인덱스) · **★엣지 쓰기 감사 실선례 = `PM/Dependencies.php:48-54`**(엣지 생성 시 diff 감사 · `:67-72` 삭제 시도) | `LEGACY_ADAPTER` |

**실측 개수: 19 / 19 전사.** 커버리지 = `VALIDATED_LEGACY` **0** · `KEEP_SEPARATE_WITH_REASON` 5 · `LEGACY_ADAPTER` 2 · `PARTIAL` 2 · `KV_ONLY` 1 · `NAME_ONLY` 1 · `NOT_APPLICABLE` 8.

> 🔴 **커버 = 0.** `graph_edge` 가 §16 의 구조적 쌍둥이라는 사실은 **저장전략 선례**이지 **요구 충족이 아니다**(규율 9).

## 1-B. Legal Entity Boundary Type 축 — **원문 7종**

원문 §16 필드 #13 의 열거 축.

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | SAME_LEGAL_ENTITY | **grep 0** — 법인 엔티티 부재로 "같은 법인"을 판정할 대상이 없음 | `NOT_APPLICABLE` |
| 2 | CROSS_LEGAL_ENTITY | **grep 0** · 🔴 **테넌트 경계를 법인 경계로 대체 금지**(테넌트 = 구독 단위 · 마스터 테이블 없음 · `api_key.tenant_id` **FK 없음** `Db.php:944`) | `NOT_APPLICABLE` |
| 3 | INTERCOMPANY | **grep 0** — 사내거래 개념·계정 없음(`cost_center`/`profit_center` **grep 0**) | `NOT_APPLICABLE` |
| 4 | SHARED_SERVICE | **grep 0.** 🔴 ★`DATA_SCOPES` 의 `'company'`(`TeamPermissions.php:41`)를 여기 매핑 금지 — **무제한 센티넬**(`effectiveScope():258` `if ($st === 'company') return null; // 전사 = 무제한`)이며 **법인 경계를 긋는 게 아니라 지운다**(의미 정반대) | `NOT_APPLICABLE` |
| 5 | JOINT_VENTURE | **grep 0**. 인접 = `partner_account.TYPES=['supplier','logistics','warehouse']`(`PartnerPortal.php:29`) — §36 `PARTNERSHIP_TYPE` 12종과 **교집합 0** | `NOT_APPLICABLE` |
| 6 | EXTERNAL_PARTNER | **grep 0**(`external_party`·`contractor` 0). 인접 = `partner_account`(`PartnerPortal.php:52-59`)·`wms_suppliers`(`Wms.php:105` · **평면·parent 없음**)·`agency_account`(`AgencyPortal.php:56-63`, **별도 인증 realm**) — 외부 party **계정**이지 조직 엣지의 경계타입 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 7 | NOT_APPLICABLE | 열거 자체 부재 | `NOT_APPLICABLE` |

**실측 개수: 7 / 7 전사.** 커버 = 0.

> 원문의 이 축은 `NOT_APPLICABLE` 불릿(`SPEC …:975`)으로 **끝난다** — `evidence` 로 끝나지 않는다. 없는 항목을 추가하지 않았다.

## 2. 규칙

- ★**엣지 리스트(Adjacency)로 간다.** 레포는 **Adjacency List 단일 지배**이며, `graph_edge`(타입드 양끝 + 가중치 + **양방향 인덱스** `Db.php:838-839`)와 `pm_task_dependencies`(**UNIQUE + 양방향 인덱스 + 쓰기 전 순환차단**)가 §16 을 **패턴 수준에서 이미 증명**했다. 🔴 **전용 그래프 DB 도입 금지**(grep 0 · 두 번째 저장엔진 = 헌법 위반).
- 🔴 **`graph_edge` 재사용·확장 금지 — 패턴만 차용하라.** 도메인 = 마케팅 귀속 · `edge_label` 은 FK 없는 자유문자열 · `status`/`valid_*`/`version` 수용 불가 · 마케팅 `SUM(edge_weight)` 스코어링과 조직 인가 경로가 같은 테이블을 공유하면 오염.
- ★**정본 선례는 `graph_edge` 가 아니라 `pm_task_dependencies` 다.** 조직 엣지는 **다음 4개를 반드시 함께** 가져와라:
  1. **`UNIQUE(tenant, source, target, relationship_type)`** — `graph_edge` 에는 없어서 SELECT-then-upsert 로 후퇴했고(`GraphScore.php:65-67` 자인), 그 이전엔 **중복행 누적으로 집계가 단조 팽창**해 랭킹이 왜곡됐다(`:135-137` 자인). `relationship_type_id` 를 **UNIQUE 키에 포함**하라(`dep_type` 선례).
  2. **양방향 인덱스** — `(tenant,source)` + `(tenant,target)`. Ancestor/Descendant 양방향 조회의 전제.
  3. **쓰기 전 차단** — self-loop 422(`PM/Dependencies.php:29-31`) · cycle 422(`:32-34`). 🔴 **`graph_edge` 에는 순환방어가 0** 이고 `journeys.edges` 는 **작성자 JSON 무검증**(`JourneyBuilder.php:511-518` 자인)이다. **둘 다 반면교사.**
  4. **엣지 쓰기 감사** — `PM/Dependencies.php:48-54`(diff+actor+ip+ua).
- 🔴 **`upsertEdge` 의 타입 비대칭을 복제하지 마라** — `upsertNode` 는 화이트리스트 422(`GraphScore.php:57-59`)인데 `upsertEdge` 는 `src_type`/`dst_type` **무검증**(`:112-119`)이고 심지어 **양끝 노드를 자동 생성**한다(`:126-133`). 조직 엣지는 **양끝 노드의 존재·타입·유효기간을 쓰기 전 검증**해야 한다(자동 생성 = Placeholder 를 소리 없이 만드는 것).
- 🔴 **`crm_customers.identity_id` union-find(`CRM.php:597-643`)·`crm_identity_merge_link`(`:708-712`)를 계층 엣지로 계산 금지.** **등가관계(대칭·추이적) ≠ 계층(반대칭 부분순서)** — 동일성 해소이지 계층이 아니다. 최대 함정.
- 🔴 **`agency_client_link` 를 §16 근거로 인용 금지**(bipartite · 1홉 · 동의 기반 접근허가). ★단 **`READ_ONLY` effect 실구현**(`defaultScope():89` `['write'=>false]` → `index.php:92-96` write 미허가 시 4개 메서드 403)은 **`data_scope` 에는 없는 능력**이며 Edge effect 설계 시 **유일한 실 선례**다.
- **`relationship_type_id`(#5)는 엔티티여야 한다.** 현행 최근접 2종이 양극단을 보여준다: `edge_label`(FK 없는 자유문자열 = `KV_ONLY`) vs `dep_type`(코드 상수 화이트리스트 + UNIQUE 키 참여). 🔴 **`edge_label` 방식 금지** — §65 금지의 *"이름 기반 Organization Mapping"*(`SPEC …:2606`)과 같은 병리다.
- **`status`(#18) 없이 엣지를 지우지 마라.** `graph_edge` 는 철회 수단이 삭제뿐이라 이력이 소실된다 — §65 금지 *"Current Parent만 저장하고 History를 잃는 구현"*(`SPEC …:2610`) 직격. `agency_client_link`(status + `revoked_at`) 패턴을 확장하라.
- **`recorded_at`(#17) 은 UPDATE 시 갱신 규칙이 필요하다.** `graph_edge` 는 UPDATE 경로(`GraphScore.php:142`)가 `created_at` 을 그대로 두어 **System Time 이 최초 생성시각에 고정**된다. §66 의 Recorded Period 를 만족하려면 **행을 갱신하지 말고 새 행을 append** 해야 한다(§65 *"과거 Version을 Update하는 구현"* 금지 `SPEC …:2612`).
- **스키마 도입 제약**: `backend/migrations/` 는 **172차 정지** → `ensureTables` 멱등 `CREATE TABLE IF NOT EXISTS` + `try{ALTER}catch{}` 필수 · **MySQL/SQLite 두 방언 동시 작성 의무**. ⚠️단 `pm_task_dependencies` 는 **변종** — 마이그레이션 정의 + 런타임 자가치유 **병행**(`PM\Shared::ensurePmTables:37-53` 이 부재 시 `Migrate::applyFiles` 로 168차 SQL 을 런타임 적용).
- ⚠️ **미확인**: `SELECT COUNT(*) FROM graph_edge` 라이브 미조회 — 0행이면 `VACUOUS` 이며 "검증된 운영 패턴"으로 인용 불가(패턴 차용 근거는 유지).
