# ADR — Organization Registry, Hierarchy, Graph, Scope Binding, Effective Period & Reconciliation Foundation (EPIC 06-A Part 4-5-3-1-5-3-3-1)

- **일자**: 289차 (2026-07-17)
- **상태**: Accepted (Organization Hierarchy & Graph Foundation 계약 명세 확정. **비파괴 — 코드변경 0**). 실 Registry/Unit/Hierarchy/Graph/Path/Scope 스토어·Lint·Guard 구현은 **후속 승인 세션**(Golden Organization Dataset + Conformance + Legacy Equivalence + verify + 배포승인).
- **근거**: 스펙 원문 [`SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md`](../segmentation/SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §0~§82 · 산출 70편 [`DSAR_ORGANIZATION_*`](../segmentation/) · ⓑ 전수조사(§3.1 22 · §3.2 11 · §3.3 12 · §3.4 46).
- **선행 정본**: [`ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE`](ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)(5-3-2) · [`ADR_CANONICAL_SEGMENT_DSL`](ADR_CANONICAL_SEGMENT_DSL.md).

---

## 0. 맥락 — 이 블록의 대전제

**조직 계층은 애초에 존재한 적이 없다.**
`git log --all -S "org_unit"` **0** · `organization_unit` **0**(스펙 커밋 제외) · 현 `backend/src` 내 `hierarch` **grep 0**. **삭제된 조직 코드조차 0** → 5-3-2 의 `Alerting::dispatch`(주석에만 남은 유물)와 달리 **팬텀도 유물도 아니다.**

> **그러나 "이름 grep 0" 으로 밀었다면 능력 자산 8개를 전부 놓치고 신설했을 것이다.**
> 8회차 교훈(BPMN grep 0 → "워크플로 엔진 부재" 오판 → `JourneyBuilder` 로 뒤집힘)이 이 블록에서 **8번 반복 적중**했다.
> ★**부재증명은 이름이 아니라 능력으로.** ★**그리고 존재증명도 이름이 아니라 능력으로**(D-13 `pm_baseline.captured_at` 사례 — 5-3-3-1 이 추가한 역방향 규칙).

---

## 1. 결정 (핵심)

### D-1. Organization Registry = **`ABSENT` 가 아니라 `PARTIAL`** — "구조가 아니라 열거"
`TeamPermissions::ORG_PRESET`(`TeamPermissions.php:706-722`) = **표준 조직 15단위**(브랜드팀·마케팅 글로벌팀·해외영업팀·물류팀·재무팀 + 파트너 4종), 각각 `team_type`·기본 `scope`·기본 `perms`. `seedOrg`(`:725-753`)가 `team` 행으로 일괄 생성(동명 skip=멱등·트랜잭션·감사 `:747`). **3계층 실배선**(`routes.php:1589` + `:2570` `$register` + 프론트 `teamApi.js:261`).
- 🔴 **계층은 이름에만 있다**: `team` DDL(`:145-151`/`:168`)에 **`parent_team_id` 없음** → "마케팅 글로벌팀"이 "마케팅팀"의 자식이라는 **구조 링크 0**. **부모가 없어 구조가 아니라 열거다.**
- ★**축 판정 `PARTIAL` ↔ 필드 대부분 `NOT_APPLICABLE` 은 모순이 아니다** — 커버된 것은 **"열거+시딩" 능력 1개**이지 필드가 아니다.
- ⚠️ **`seedOrg:739` INSERT 에 `manager_user_id` 가 없다** → **시드 15팀 전부 manager NULL**. "team owner 실사용" 인용 금지. (등급 미부여 — 시딩 시점 담당자 미정은 합리적 설계일 수 있음.)
- ⚠️ **`seedOrg:738` 멱등키가 이름 문자열**(`in_array($p['name'], $have)`)이고 **`team.name` 에 UNIQUE 없음**(`:150-151`) → 개명 시 중복 생성 가능.

### D-2. 부모-자식 간선 = `app_user.parent_user_id` **단 하나 · owner 직속 2단으로 봉인**
정의 `UserAuth.php:156-167`(주석 `:156` "하위(팀원) 계정의 상위 owner id. owner=NULL") · **DDL nullable**.
★**PM 전수 검증 — 전 생성 경로가 owner 직속**:
| 경로 | parent |
|---|---|
| `UserAuth.php:1226-1227`(팀원 추가) | manager 의 parent(=owner) 또는 `$ownerId` · 주석 `:1225` *"항상 최상위 owner 에 종속"* |
| `EnterpriseAuth.php:500`(**SSO/SCIM 프로비저닝**) | `(int)$owner['id']` |
| `UserAuth.php:1574/1581`(하위 관리자) | `$masterId` |
| `UserAuth.php:670`(owner 자신) | `null` |
**3단을 만드는 경로가 존재하지 않는다.** 순회도 **단일 홉**(`resolveTenantId` `:200-217` · `LIMIT 1` 1회 후 return · 재귀 없음).
- ★**용도 = 테넌트 소속 포인터**(하위계정이 상위 owner 의 tenant_id 를 **그대로** 물려받음 `:197`·`:214`) — **보고선 아님 · 테넌트 간 부모-자식 아님**.
- 🔴 **3단 허용 시 `resolveTenantId` 의 단일 홉 가정이 깨진다** → **286차 테넌트 하이재킹과 동형 사고**. **2단 봉인은 우연이 아니라 다른 코드가 그 가정 위에 서 있다** → **일반화가 선결**(5-3-2 enrollment 컨텍스트 일반화와 같은 구조).

### D-3. Tenant = **구독 단위 · 마스터 테이블 없음** → §21 Tenant Hierarchy `ABSENT`
- ★**테넌트 엔티티 테이블이 존재하지 않는다.** `api_key.tenant_id VARCHAR(100)`(`Db.php:944`, **FK 없음**) · 발급 = `resolveTenantId` 가 `'acct_'.$id` **문자열 생성+영속**(`UserAuth.php:220-224`).
- ★**열거 = `SELECT DISTINCT tenant_id FROM <도메인테이블>` 을 도메인마다 개별 수행 — 19개소**(하한). **권위 목록이 아니라 데이터 행에서 역추론.**
- `parent_tenant`/`tenant_parent`/`sub_tenant`/`child_tenant`/`tenant_tree`/`tenant_hierarchy` **전역 grep 0**.
- 🔴 **"테넌트=법인" 가정 = 역산**: plan 을 `parent_user_id IS NULL` owner 계정에서 읽음(`PlanLimits.php:36-37` · **`backend/src/` 직하 · `Handlers/` 아님**) = **테넌트 = 1 owner 계정의 구독 스코프**. `pnl_vat_summary` tenant 키(`Pnl.php:402-423`)는 **법인 회계가 아니라 구독자별 리포트**. **한 법인이 다수 테넌트를 갖거나 그 반대를 막는 것도 표현하는 것도 없다.**
- **격리 강제는 REAL**(인증키 tenant 로 `X-Tenant-Id` **무조건 덮어쓰기** `index.php:600` · strict fail-closed `:585`)이나 **평면**이다.
- **`X-Act-As-Tenant` 도 계층이 아니다** — `authedTenant`(`UserAuth.php:397-400`)는 admin **AND** 헤더값이 **정확히 `'platform_growth'`** 일 때만 동작하는 **하드코딩 스위치**(286차 사고 수정 결과) → 임의 임퍼소네이트 구조적 불가.

### D-4. Legal Entity = `ABSENT` · ★**`'company'` 스코프는 법인이 아니라 무제한 센티넬**
- `legal_entity`/`legalEntity`/`entity_code`/`biz_no`/`brn`/`corp_reg`/`tax_id` **전부 0**. 사업자정보는 `app_user` **프로필 평문 필드**(`UserAuth.php:499`·`:1720`) · `company_id` 2건은 **Adobe Analytics 자격증명**.
- 🔴 **최대 함정**: `effectiveScope():258` — `if ($st === 'company') return null; // 전사 = 무제한`. **법인 경계를 긋는 게 아니라 지운다.** **이름만 보고 Legal Entity Scope 로 계산하면 의미가 정반대가 된다.**
- §24 Boundary Guard 차단 **9종 전부 대상 부재**.

### D-5. ★`graph_node`/`graph_edge` = 구조는 쌍둥이나 **현 코드로는 조직 저장 불가**
`Db.php:816-839`: `tenant_id` · `node_type`+`node_id` · `src_type`/`src_id`→`dst_type`/`dst_id` · `edge_weight` · `edge_label` · `meta_json` · **src/dst 양방향 인덱스**(`:838-839`) · `/v419/graph/*` **9라우트 실배선**(`routes.php:721-729`). Neo4j/Cypher/Gremlin/Neptune/Arango/JanusGraph/TinkerPop **grep 0** → **전용 그래프 DB 도입 불필요**.
- 🔴 ★**결정적 제약**: `GraphScore.php:57-59` 가 `node_type` 을 **`['influencer','creative','sku','order']` 화이트리스트로 봉인**하고 위반 시 **422** → **조직 노드는 현 코드로 저장 자체가 불가** = `KEEP_SEPARATE_WITH_REASON` 의 근거. **스키마가 닮아도 게이트가 조직을 막는다.**
- ⚠️ **`upsertEdge` 검증 비대칭**(PM 직접 확인 · **관찰 사실 · 등급 미부여**): `upsertNode` 는 화이트리스트 422 인데 `upsertEdge`(`:112-119`)는 `src_type`/`dst_type` **빈 값만 검사**하고 **양끝 노드를 `INSERT IGNORE` 로 자동 생성**(`:128-133`) → **화이트리스트 밖 노드가 엣지 경유로 유입**. 🔴 **조직 타입을 `upsertNode` 화이트리스트에 추가하는 순간 이 무검증 경로도 함께 열린다 → 재사용 결정 시 비대칭 해소가 선결.** (라이브 `SELECT DISTINCT node_type FROM graph_node` 확인 권장.)
- ⚠️ ★**`graph_node` 는 인덱스도 UNIQUE 도 0**(PM 재확인 · `Db.php:816-825` = `id` PK · `tenant_id`/`node_type`/`node_id`/`label`/`meta_json`/`created_at` **뿐**). **`:838-839` 양방향 인덱스는 `graph_edge` 전용**(`idx_graph_edge_src`/`_dst`) → **ⓑ 브리핑의 "graph_node/graph_edge 양방향 인덱스"는 부정확**. Node 축 인덱스 선례 **없음** · `UNIQUE` 부재를 코드가 자인(`GraphScore.php:65-67` — 209차 MySQL 1064 500).
  - ⚠️ **파생 관찰(등급 미부여)**: `UNIQUE` 가 없는데 `upsertEdge:128-133` 이 `INSERT IGNORE`/`INSERT OR IGNORE` 로 노드를 자동 생성 → **무시할 충돌이 없어 중복제거가 무효**일 수 있다. 코드 정합 근거는 확실하나 **런타임 행 중복은 라이브 미검증**.
- ⚠️ **내부 생산자 0**(`upsertNode`/`upsertEdge` 호출처 = 핸들러·라우트뿐, frontend 0) → **외부 POST 전용**. **`VACUOUS` 미배제** → **"운영 중인 그래프"로 인용 금지.**
- ✅ **교훈 채택**: 과거 append-only 로 동일 `(src,dst)` 중복행 누적 → `SUM(edge_weight)` 단조 팽창 → **랭킹 왜곡**(`:135-137` 자인). 현재는 멱등 upsert 로 수정됨(`:138-155`) → **"엣지 중복 = 집계 왜곡"** 을 Canonical Edge 규율로 승계.

### D-6. §52/§53 = **알고리즘은 충족 · 조직 적용은 미배선** (축 분리 필수)

> ⚠️ **경로 표기 정정(289차 9회차 · 5-3-3-2 ⓑ 실측)**: 본 ADR 및 5-3-3-1 산출 문서군이 `PM/Dependencies.php`·`PM/Gantt.php`·`PM\Enterprise.php` 로 표기했으나 **실경로는 `backend/src/Handlers/PM/…`** 다(`backend/src/PM/` 는 **존재하지 않는다**). 줄번호는 정확. 5-3-3-2 조사 에이전트의 `Read` 가 **즉시 실패**해 발견됐다 — **문서 25편에 동일 표기가 전파**돼 있으므로 후속 세션은 접두를 확인하고 인용하라.

★**`PM/Dependencies::validateDependency`(`backend/src/Handlers/PM/Dependencies.php:79-100`)** = **반복형 DFS** + 명시적 `$visited` + **tenant 필터**(`:91` 매 홉) + **쓰기 전 차단**(`:32-34` → 422 `cycle_detected`) + self-loop 차단(`:29-31`). ★**`PM/Gantt`(`:104-125`)** = **Kahn 위상정렬** + `count($topo) !== count($taskMap)` 정석 판정 + 순환 시 **500이 아니라 부분결과+경고 degrade**. 저장 = `pm_task_dependencies` **엣지 리스트** · `UNIQUE(tenant,pred,succ,dep_type)` · 양방향 인덱스(migration `20260526_168_004:12-14`) · 배선 REAL.
- ✅ **`VALIDATED_LEGACY`(알고리즘) 6건** — 5-3-3-1 커버의 실질 전부. **재구현 금지 · 이 패턴 확장.**
- 🔴 **"§52 는 충족됨"은 거짓** — **알고리즘 축 = 충족** ↔ **조직 적용 = 미배선·갭 실재**. 축을 섞으면 규율 9(대칭오류) 위반.
- ★**정정 2건**(두 에이전트 독립 발견): ⓐ **`:84` `$depth < 10000` 은 깊이 캡이 아니라 방문 노드 예산**(`:97` `$depth++` 가 **pop 마다**) → §19/§52 Maximum Depth 는 **`PARTIAL`**. 진짜 깊이 캡 선례는 `AdminMenu:545`(조상 1홉씩 상향). ⓑ **Relationship Type Filter 미충족** — `dep_type` 을 보유하나 `:90-91` 이 술어에 넣지 않아 **전 타입 무차별 순회** → "Cycle 금지 **관계에서만**" 표현 불가.

### D-7. 저장 전략 = **Adjacency List 단일 지배 · Path Index 는 순수 신규**
| 구현 | 저장 | 순회 | 순환 방어 |
|---|---|---|---|
| `pm_task_dependencies` | 엣지 리스트·양방향 인덱스 | **반복 DFS + Kahn** | **쓰기 전 차단**(최상급) |
| `menu_tree`(`AdminMenu.php:108-117`) | Adjacency + `idx_menu_tree_parent` | 조상 walk(**깊이캡 100** `:545`) | 쓰기 전 차단(`:493-503`) |
| `graph_node`/`graph_edge` | Adjacency(타입드) | **하드코딩 3-hop**(범용 아님) | **없음** |
| `journeys.edges` | JSON 문서 | 단일 next(`:786`) | **런타임 방문집합만**(`:511-518` · 작성자 JSON 무검증 자인) |
| 라우트/메뉴키 | Materialized Path(**문자열**) | 최장 prefix | — |
- 🔴 **Closure Table·Path Index·Nested Set·Materialized Path(DB 컬럼) 전례 0** → **§18/§66 은 순수 신규**. 반면 **Node·Edge 는 `graph_node`/`graph_edge` 가, Snapshot 은 `menu_defaults`/`pm_baseline` 이, immutable_hash 는 `schema_migrations.checksum`(`Migrate.php:50`)이, 해시체인은 `menu_audit_log` 가 선례 제공.**
- ⚠️ **`menu_tree` 는 `tenant_id` 없음(전역 단일 트리)** → 조직 아님 · **선례로만**. `reorder` 프론트 호출자 0 · `AdminMenuManager.jsx:252` "menu_tree 가 비어 있습니다" 분기 → **운영 0행 가능성** → **"운영 중인 트리"로 인용 금지.**
- ★**Path Index 도입 정당화** = `GraphScore.php:207-219` **N+1**(hop3∈hop2∈hop1) — 285차 "루프 내 N+1=즉시장애" 트랩의 DB판.

### D-8. 재귀 CTE = **기술적으로 가능하나 레포 관례에 반한다**
- 엔진: MySQL 8.0.37 지원 · SQLite 3.8.3+ 지원 — ⚠️**라이브 SQLite 버전 미실측 → 추론. 사실로 인용 금지.**
- 레포: `WITH RECURSIVE`/`CONNECT BY` **backend/src 0** · **`Db::sql()`(`Db.php:177-191`)은 DDL 전용 번역기**(AUTO_INCREMENT/TINYINT/DOUBLE/COMMENT 치환)로 **SELECT·CTE 미지원** → 번역기 지원 없이 raw SQL.
- ★**판단**: **트리 5개 전부 애플리케이션 계층 순회**를 택했다(SQLite 폴백 이식성). **`Dependencies::validateDependency` 패턴 확장이 무후퇴·최저위험**이며, 재귀 CTE 는 **두 번째 순회 방식 도입**이 되어 정합 부담을 진다.

### D-9. Scope Binding = **평면 필터 · 상속 아님** (§43)
`data_scope`(`TeamPermissions.php:160-166`) = `tenant_id·subject_type·subject_id·scope_type·scope_values(TEXT)·updated_at`. **`parent_*`·`path`·`depth`·`lft/rgt`·`ancestor` 전무** · `team` 에 **`parent_team_id` 없음 → 팀 트리 자체가 없다.**
- **단일 차원**(`:277` 타 차원 null · `:311` 주석 자인 *"★사용자는 단일 scope_type만 가지므로 셋 중 최대 1개만 비공백"*) · **SQL = IN 절 1개**(`:286-293`) · effect **INCLUDE 고정**.
- 🔴 ★**`:230` 주석의 "팀 스코프 상속"은 상속이 아니라 폴백**(`:253-254` — user 에 없으면 team **1회** 조회 · 단일 홉 · **부모 팀 컬럼이 없으므로 구조적 불가**). **규율 "주석≠실효" 적중.**
- 권한 "상속"도 **하향 클램프**(`clampActions` `:382-389`·`:396-402` — 팀 권한을 **상한**으로 멤버 권한 교집합 축소). **조직 계층 전파 아님.**
- ★**PM 검증: `scopeSql*` 직접 호출 외부 = 5곳**(`AdPerformance:26`·`Wms:1291`·`Catalog:981/982/983`). **`OrderHub:261` 은 래퍼 `scopeChannelProduct`**(`:315-322`). **"6곳"은 부정확.**
- ⚠️ **`partner`·`campaign` scope_type = 선언되었으나 소비처 0** — 실제 쓰는 차원은 **channel/warehouse/product/brand 4개뿐** → `:277` 에서 항상 `!== $dimension` → **영원히 무제한** → `NAME_ONLY`.
- ⚠️ **`brand` 도 온전한 대응이 아니다** — `scopeChannelProduct:320` 이 brand 를 **SKU 컬럼**에 매핑(주석 `:312` *"브랜드=상품집합 거버넌스"* 자인) → **브랜드 엔티티 스코프가 아니라 상품집합 필터**.
- ★**구조적 한계**: `READ_ONLY`/`APPROVAL_ELIGIBLE`/`MANAGER_RESOLUTION_ELIGIBLE`/`REPORTING_ONLY` 는 **where 절로 표현 불가**(능력 게이트) → `scopeSql` 의 `[whereFragment, params]` 계약에 밀어넣는 설계는 **실패한다**. `READ_ONLY` 실 선례가 **미들웨어 층**(`index.php:92-96`)인 것이 그 증거.
- ⚠️ **`data_scope` 런타임 행 수 미확인** — `:255-256` "미설정=무제한"이므로 **0행이면 5곳 배선 전부 no-op**. **"실사용 중인 ABAC"으로 단정 금지** · 라이브 `SELECT COUNT(*)` 선결.

### D-10. ★`agency_client_link` = §43 최근접 실자산 (`data_scope` 보다 가깝다)
`AgencyPortal.php:64-72`(MySQL)/`:80`(SQLite): `agency_id ↔ client_tenant_id` · `status`(pending/approved/revoked) · `scope_json` · `invited_at`/`approved_at`/`revoked_at` · **`UNIQUE(agency_id, client_tenant_id)`** · 양방향 인덱스(`:71`).
- **매 요청 fail-closed 재검증** `resolveAccessContext`(`:414-432`) → `status!=='approved'` 이면 null(`:427`) → 세션↔링크 tenant 불일치 방어(`:428`) → `index.php:85-90` 403.
- ★**`READ_ONLY` effect 실구현**: `defaultScope():89` `['write'=>false,...]` → `index.php:92-96` write 미허가 시 POST/PUT/PATCH/DELETE **403**. **`data_scope` 에 없는 능력 = §43 Scope Effect 의 유일한 실 선례.**
- ★`index.php:100` 이 위임 scope 의 `write` 여부로 `auth_role` 을 `analyst`/`viewer` 로 **합성 주입** — **조직역할축↔API등급축을 잇는 유일 지점**.
- 🔴 **무시하고 신설하면 두 번째 바인딩 모델 = 헌법 위반.**
- 🔴 **단 §21 근거로 쓰면 역산**: ⓐ **이분(bipartite)** — `agency_account`(`:56-63`)는 **테넌트가 아니라 별도 인증 realm**(자체 login/session `:73`·잠금 `:179`·화이트라벨 `brand_json`) ⓑ **N:M · 1홉 전용**(순회·이행성·깊이 0) ⓒ 조직↔조직 엣지 아님 ⓓ **동의 기반 접근 허가**이지 소유·포함 아님.
- ⚠️ **§47 Lifecycle 선례이나 이력 소멸**: `AgencyPortal.php:304`·`:381` 이 **`revoked_at=NULL` 로 이전 해지 시각을 명시적으로 지운다** → 해지→재초대 사이클 시 **이력 물리적 소멸**. **이벤트 테이블 아님 · 전이 이력 누적 불가.**

### D-11. IdP = **`EnterpriseAuth` REAL · 신설 금지** (★예측이 뒤집힌 지점)
OIDC Authorization Code + id_token RS256/JWKS 검증 · SAML ds:Signature 검증(C14N+RSA-SHA256) · 어설션 리플레이 방어(`:56`) · SCIM 2.0 **Users CRUD** · KEK 회전. 라우트 `routes.php:915-932` + `$register` `:2383-2400` **양쪽 배선**.
- 🔴 **IdP 커넥터 신설 = 두 번째 엔진 = 헌법 위반. `EnterpriseAuth` 확장 강제.**
- **단 조직 구조는 전달되지 않는다**: **SCIM Groups = GET 전용**(`scimListGroups` `:417-423` · `routes.php:932` — Groups 는 GET 1개뿐, Users 는 CRUD 5개) → 내부 `team` 을 **투영해 내보낼 뿐 IdP→내부 인입 경로 없음**. `sso_group_role_map(tenant_id, group_name, role)`(`:70`·`:72`) 는 **그룹이 엔티티가 아니라 평문 문자열**(`group_name IN (?)` 단순 룩업 `:84`) — **부모-자식·중첩그룹·그룹ID 없음** → **수신하되 저장하지 않고 롤 1개로 즉시 소모.**
- **HRIS/ERP = `ABSENT`** — 헌법 Vol2(`docs/DATA_SOURCE_ARCHITECTURE_CONSTITUTION.md:71`)가 ERP 를 12분류로 정의하나 **이름만 있고 커넥터·수집·정규화 어느 층도 없다.** `hris`/`workday`/`sap`/`netsuite`/`dynamics`/`payroll` 소스 히트 0 · migrations 전량 0.
  - 🔴 ★**초판 논증 철회(289차 9회차 · 5-3-3-2 ⓑ 실측이 정정)**: 초판은 *"`group_type` 도메인 = sales/marketing/logistics/pg/messaging · `sync_kind` = commerce/ad/… → `erp`·`hr` 값이 **열거에 없다**"* 를 능력축 증명으로 삼았다. **이 논증은 성립하지 않는다** — `ChannelRegistry.php:36`,`:38`(MySQL)/`:46`,`:47`(SQLite) 실측 = **`group_type VARCHAR(40)`·`sync_kind VARCHAR(20)` 자유 문자열 · ENUM/CHECK 없음** · `in_array` 화이트리스트 **전역 0** → **누구든 `group_type='hr'` 을 삽입할 수 있다.** 주석(`:12`·`:79`)이 나열한 값은 **열거가 아니라 관례**이며(게다가 실값 `support` 가 주석에 **누락된 stale**), **주석을 스키마 제약으로 읽은 것이 규칙 6(주석≠실효) 위반**이다.
  - ✅ **재접지된 근거(능력축)**: 커넥터 **카탈로그 행 0** · **fetcher 0** · **정규화 테이블 0**. 결론(`ABSENT`)은 불변이나 **근거가 교체된다.**
  - ★**교훈**: *"열거에 없다"* 는 **열거가 실재할 때만** 유효한 논증이다. **제약이 코드로 강제되는지 먼저 확인하라** — 결론이 맞아도 논증이 틀리면 다음 사람이 같은 형식으로 틀린 결론에 도달한다.

### D-12. Audit = **`pm_audit_log` 골격 + `menu_audit_log` 해시체인 합집합 확장** (★내 브리핑이 오염원이었던 지점)
- 🔴 **"해시체인 없음"은 전역 명제로 쓰면 거짓.** **참인 것은 전역 `audit_log`(`actor·action·details_json·created_at` **4컬럼** · tenant 없음 · 해시체인 없음 — MySQL `Db.php:540-545`/SQLite `AdminGrowth.php:157-159`)에 한해서**다.
- ★**해시체인 선례 실재**: `menu_audit_log.hash_chain CHAR(64)`(`AdminMenu.php:128`) = **SHA-256 prev-chain**(생성 `:182-197` — payload 에 `'prev'`+`'ts'` → `hash('sha256',...)` · `lastHash()` `:214-219` · tamper-evident 주석 `:18`) · 마이그레이션 실재(`20260526_168_102_create_menu_audit_log.sql`).
- ★**`pm_audit_log`** = `tenant_id NOT NULL`(migration `20260526_168_008:7`) + `entity` + `diff_json`(`:13`) + **3인덱스**(`:17-19`) + append-only 주석(`:2-3`).
- 🔴 **그러나 선례는 알고리즘 수준이지 스키마 수준이 아니다**: ⓐ **`menu_audit_log` 에 `tenant_id` 가 없다** → **스키마 복제 금지 · 알고리즘만 이식** ⓑ **`lastHash()` 에 tenant 술어가 없다** → 테넌트별 체인 확장 시 **`WHERE tenant_id=?` 추가 필수**.
- **중복 감사 스토어 신설 금지.** `journey_node_logs` 는 **tenant_id 보유**(`JourneyBuilder.php:69`)+조회 술어 실배선(`:248`) — 스키마 선례(단 마케팅 도메인 → 커버 금지).

### D-13. ★Effective Period = **결번이 두 축에서 동형 재현 · 부재의 깊이가 다르다**
| 축 | 상태 | 교정 계층 |
|---|---|---|
| **세율** `kr_fee_rule.effective_from`(`Db.php:898`) | **컬럼 있고 질의 없음** — 행은 쌓이나 묻지 않음 | **질의 계층**(as-of 술어 추가 → **과거 복원 가능**) |
| **환율** `fxToKrw`(`Connectors.php:1749`) | **컬럼도 이력도 없음** — `app_setting` KV 단일행 덮어쓰기(`:1804-1805`) → **과거 값 물리적 소멸** | **저장 계층 신설**(dated 테이블) — **술어를 추가해도 복원할 게 없다** |
> 🔴 ★**"시점 컬럼만 붙이면 된다"는 일반화가 환율 축에서 깨진다.**
- ★**PM 직접 검증**: `WHERE effective_from <= :as_of` **backend/src 전역 0건**. 읽기가 전부 `ORDER BY effective_from DESC LIMIT 1`(최신승) — `Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`. **`Pnl.php:449` 가 기간(`$from`,`$to`)을 받고도 `:454` 는 기간을 무시** → **과거 기간 P&L 도 오늘자 최신 VAT율로 계산**. `effective_to`/`valid_to` **grep 0** → **폐구간 모델은 신규**.
- 🔴 **등급 미부여 · 관찰 사실로만 등재**: 주석 `:451` 이 *"테넌트 최신 kr_fee_rule(채널 무관 최신)"* 로 **의도를 명시** → 설계 선택일 수 있다. 환율 24h 캐시도 **명시적 설계**(`:1780`)이며 거래일 vs 보고일 환산은 **회계 정책 문제**. **라이브 확인 선결**(287차 블라인드 지양). *(KRW 단일 정산이면 무해 · 다통화면 환산 왜곡 실재.)*
- ★**정정(존재증명도 능력으로)**: **`pm_baseline.captured_at` 은 DB 컬럼이 아니다** — DDL 컬럼은 `created_at`(`PM\Enterprise.php:55`/`:62`), INSERT 도 `created_at`(`:363`). `captured_at` 은 **`snapshot_json` 내부 JSON 페이로드 키**(`:360`)로만 존재 → **인덱스 불가·as-of 질의 불가** → `KV_ONLY`.
- ★**`menu_defaults.version` 은 버전이 아니라 라벨** — 유일 생산자 `AdminMenu.php:308` 이 **리터럴 `'baseline'` 고정**. 주석 `:281` 이 **282차까지 0행이었음을 자인** → **"운영 중인 스냅샷 체계" 인용 금지.**
- **`plan_period_pricing.period_months` 는 구독 기간 상품 옵션**(1/3/6/12개월)이지 유효기간 아님 → **§44 선례 아님.** **`Paddle.php:291` `['effective_from' => 'next_billing_period']` 는 외부 API 요청 파라미터**이지 스키마 아님 → 선례 오인 금지.

### D-14. Reconciliation = **Canonical 선언이 선행** (양변 부재 → 자동 MATCH = 가짜 녹색)
24종 비교가 전부 `X vs Canonical` 인데 **Canonical Organization 미선언** → **대사는 항상 MATCH** = **288차 `ok=>true` 위장과 동형**. 24종 중 **성립 0**(좌변 부분실재 5건도 우변 전부 부재).
- ★**순서 강제**: **①Node·Edge → ②Version → ③Path Index → ④대사 → ⑤상태**.
- ★**`MATCH` 반전 규칙**: canonical null → **`BLOCKED`** · 커넥터 미등록 → **`MANUAL_REVIEW`**. 🔴 **"비교 못함" ≠ "일치함".**
- **외부 소스 대사 대상 자체가 없다**(D-11 — HRIS/ERP 커넥터 부재).

### D-15. Error·Warning = `AdminGrowth::fail` 확장 · **warning 슬롯 자체가 없다**
- **"에러 코드 체계 부재"는 과장** — `AdminGrowth::fail`(`:181-184` `code`+`detail`)이 `approvalDecide` 에 **실배선**(`:1322` VALIDATION 422 / `:1326` NOT_FOUND 404 / `:1327` CONFLICT 409) → **`VALIDATED_LEGACY` · 두 번째 봉투 신설 금지.**
- ⚠️ **비대칭**: `AdminGrowth::json`(`:164-179`) 키 5개(`success`/`data`/`message`/`error`/`meta`)에 **warning 슬롯 없음** → §61 은 **봉투 구조 변경이 선결**(작업량 과소평가 금지).
- ⚠️ **`fail`/`json` 이 `private static`** → **가시성 승격 선결**(5-3-2 `Alerting::pushEvent` 와 동일 패턴). ⚠️ **`AdminGrowth` 봉투가 전사 표준인지 미확인** — 추출 시 선결 확인.

### D-15b. Rate Limit = **REAL · 신설 금지** (★ⓑ 미기재 · 커버 정정)
`index.php:508-545` — **전역 API 키 단위 고정 1분 윈도우 카운터**(282차 R3 보안 하드닝): `api_rate_limit` 테이블 · 기본 **1200 req/min**(`GENIE_RATE_LIMIT_PER_MIN`, `0`이면 비활성) · 양방언 upsert · 자가치유 · **fail-open**(DB 오류/테이블 부재 시 가용성 우선 — 인증은 이미 통과) · `Retry-After`.
- ✅ §67 #47 = **`VALIDATED_LEGACY`**(초판 `CONTRACT_ONLY` 오판 정정) · **레이트리밋 신설 금지 · 확장.**
- 🔴 ★**공백을 함께 기록**: 주석 `:509-510` 이 자인하듯 **대상 = `api_key` 프로그래매틱 트래픽만**이며 **SPA/세션 게이트 경로는 위에서 이미 return 되어 미도달**. → **조직 API 를 세션 경로로 노출하면 레이트리밋이 걸리지 않는다.** "레이트리밋 있음"으로 §67 을 닫으면 **분모를 API 키 축으로 갈아끼우는 역산**(5-3-2 §29 "완비→배선만" 오판과 동형).
- ⚠️ **fail-open 이 설계 선택**임을 명시 — 조직 API 에 그대로 승계할지는 후속 결정(가용성 vs 남용 차단).

### D-16. Cache = **서버 캐시 계층 자체가 부재** → 순수 신규
Redis/Memcached **0** · `apcu_*` 는 `SystemMetrics.php:225-451` **지표 보고 전용**(캐시 API 아님). 프론트 `g_admin_menu_tree_cache`(`MenuVisibilityContext.jsx:28`) localStorage 트리 캐시만 존재.

### D-17. Migration = **§14 집행 수단이 없다**
- `backend/migrations/` **21파일 · 172차 정지**(최신 `20260527_172_002_coupon_tables.sql`) → **조직 스키마는 마이그레이션 파일로 들어갈 수 없다** → `ensureTables` 멱등 `CREATE TABLE IF NOT EXISTS` + `try{ALTER}catch{}` 필수.
- 🔴 ★**`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다** → **§14 Hierarchy Version 간 데이터 이행 · §46 Retroactive 재계산은 집행 수단이 현재 없다** → `CONTRACT_ONLY`.
- 🔴 **`Migrate` 이름 겹침 함정** — **DDL 적용기이지 도메인 데이터 이행기가 아니다.** ⚠️ 유일 탈출구 후보 = `PM\Shared::ensurePmTables:37-53`(부재 시 `Migrate::applyFiles` 로 168차 SQL **런타임 적용**) — **미검증 경로**.
- **MySQL/SQLite 두 방언 수기 중복 작성**(`CRM.php:48` vs `:77`) → 조직 스키마 도입 시 **양쪽 동시 작성 의무**.

---

## 2. 정직 등급 (허구 전환 금지)

- **실 코드·테이블·노드 = 0건.** 산출 70편 전부 **계약 명세**. **"구축 완료"가 아니라 "계약 명세 확정"**.
- ★**커버 = `VALIDATED_LEGACY` 만.** 수치는 **문서에 박지 않는다** → `node tools/measure_06a_coverage.mjs --block=5331`. 정의·오독 방지 = [`COVERAGE_06A_532_MEASUREMENT_SSOT.md`](../segmentation/COVERAGE_06A_532_MEASUREMENT_SSOT.md)(블록 공용).
- **§58 Lint 28 / §59 Guard 24 전건 `CONTRACT_ONLY`** — **누적 Lint 75 + Guard 91 = 166종 전건 계약만**(5-3-1 19+30 · 5-3-2 28+37 · 5-3-3-1 28+24). **세 블록 연속 실 코드 0.**
- **§57 Critical Gap 25종 중 24 부재 · #25(SoT 불명확)만 `PARTIAL`(현행 사실).** 🔴 **"판정 전건 부재 = 갭 0 = 양호"로 읽지 마라** — 판정 대상 개념 자체가 부재하며 **신설 시 25건 동시 활성**.
- **가드 등급 3단**(정밀화): `WIRED(pre-commit·로컬)` — ★**`core.hooksPath` = `.githooks` 가 본 클론에는 설정돼 있다**(실측). 단 **클론별 로컬 설정 · 신규 클론 기본 미설정 · `--no-verify` 우회 가능** → **보장 아님** / `WIRED(CI·탐지)` — `security-scan.yml` `repo-guards` · 규칙 SSOT `tools/scan_secrets.sh`(**정규식 CI 복사 금지**) / 🔴 **`ENFORCED(예방)` = 현행 레포에 없음**(브랜치 보호 + required check 미설정 G-06b) → **§58/§59 원문의 "차단하라"는 미충족.**

**원문에 축이 없어 비워 둔 것**(지어내지 않음): **§38 Binding Type 열거 없음**(§37 은 6종 명시 `:1610-1617` — **비대칭. §37 을 복사하면 날조**) · §51/§53/§54 필드 축 없음.
**`evidence` 양방향 준수**: §6·§7·§9·§10·§11·§12·§13·§20·§25~§31·§41·§42·§43·§44·§47·§48·§50·§55 는 원문이 `evidence` 로 끝나 전사 / **§8·§9 Version Type·§11 Relationship Type·§14·§17·§15 Node Role·§16 Boundary Type·§18 Path Type·§46·§49·§52·§53·§54·§56·§60·§61 은 원문이 `evidence` 로 끝나지 않아 추가하지 않음.** **§62 는 `evidence id` 로 시작해 `audit reference` 로 끝난다**(33종 확정).

---

## 3. 무후퇴·영구 규칙

1. **정본 재구현 금지 · 확장만. 기능후퇴 0.** `EquivalenceProof` 선행 없이 통합 금지.
2. **순서 절대**: Canonical Node·Edge 선언 **→** Version **→** Path Index **→** Reconciliation **→** 상태. (Canonical 없이 대사하면 **항상 MATCH = 가짜녹색**.)
3. **순서 절대**: `app_user.parent_user_id` **2단 봉인 일반화**(`resolveTenantId` 단일 홉 가정 해소) **→** 조직 계층 도입. **뒤집으면 286차 하이재킹과 동형 사고.**
4. **순서 절대**: `upsertEdge` 타입 검증 비대칭 해소 **→** `graph_node` 화이트리스트에 조직 타입 추가.
5. **★부재증명은 이름이 아니라 능력으로. ★존재증명도 이름이 아니라 능력으로**(`pm_baseline.captured_at` — JSON 키를 컬럼으로 오인).
6. **★주석을 코드/API 근거로 삼지 마라. 정의부를 Read 하라.** 실증 2건: 5-3-2 `Alerting::dispatch`(주석에만 남은 팬텀) · **본 블록 `ChannelSync.php:914` `depth`(11번가 API 응답 필드를 설명한 주석이며 코드는 읽지 않는다 — 반환 shape 은 `{code,name,whole,leaf}`)**. **같은 병이 두 블록 연속 재발했다.**
7. **형태 유사를 커버로 계산 금지**(역산): `tenant_id`(평면 스코프) · `team`(부모 없음) · `parent_user_id`(테넌트 포인터) · `agency_client_link`(N:M 위임) · `menu_tree`/11번가 카테고리(도메인 상이) · `wms_bins.level`(**물리 선반단** `Wms.php:193-194` 고정깊이 평면) · `business_unit_id`(**Trustpilot 자격증명**) · `company_id`(**Adobe Analytics 자격증명**) · `quota`(**AI 호출 한도**) · `po_*`(**Price Optimization**) · `DELEGATION_EXCEEDED`(권한 상한) · `admin_growth_lead.owner`(자사 B2B 리드 담당자 문자열) · OS cron.
8. ★**우연한 일치를 준수로 계산 금지** — §17 "Primary Parent 최대 1개"가 현행과 **숫자상 일치하나**, 이는 **규칙 준수가 아니라 여러 개를 표현할 수단이 없어서**다(컬럼 1개). `KEEP_SEPARATE_WITH_REASON` 이지 `VALIDATED_LEGACY` 아님. **술어의 양변**(Hierarchy Type 좌변 · 유효기간 우변)이 모두 부재.
9. ★**아이덴티티 병합 ≠ 계층** — `crm_customers.identity_id`(`CRM.php:109`)는 **union-find 등가류**(`resolveIdentitiesForTenant:597-643` `roots`/`sizes`). **등가관계 = 대칭·추이적** vs **계층 = 반대칭 부분순서**. `crm_identity_merge_link(a_id,b_id)`(`:708-712`)도 **무방향 엣지**. **동일성 해소이지 계층이 아니다.**
10. ★**`'company'` 스코프는 법인이 아니라 무제한 센티넬**(D-4) — **이름만 보고 계산하면 의미가 정반대.**
11. **`Db::envLabel()` 을 Environment Scope 로 계산 금지** — **코드가 스스로 금지**(`Db.php:51-54` *"표시(관측성) 전용 env 라벨 — 게이트용 env()와 분리. ★게이트 로직(env())은 절대 이걸 쓰지 말 것"*). 27개 호출처 전부 응답 메타 · **인가 결정 사용 0**.
12. **`api_key` RBAC 의 R 은 조직 Role 이 아니다** — `connector` 등급이 결정적 증거(조직에 "커넥터" 직위는 없다 · 유일 의미 = ingest 쓰기 허용 `index.php:571-574`). **주체가 사람이 아니라 키** · 판정 축이 **HTTP 메서드**(`:568`) · `team_role` 축과 **매핑 코드 없음**.
13. **SQLite 폴백 호환 유지** — 신규 lease/락·MySQL 전용 ENUM·재귀 CTE 단독 의존 금지. **MySQL/SQLite 이중 DDL 동시 작성 의무.**
14. **테넌트 격리 절대** — 신규 조직 테이블은 `tenant_id` 필수(`menu_tree`·`channel_registry`·`admin_growth_approval`·`paddle_events`·`audit_log`·`menu_audit_log` 의 tenant 부재를 **선례로 삼지 마라**).
15. **내부 상태변경만으로 완료 선언 금지**.

---

## 4. 관찰 사실 (등급 미부여 · 라이브 확인 선결 · **결함 단정 보류**)

> 287차 "죽은 스켈레톤=결함" · "라이브 검증 후 구현" 원칙. **판단에 필요한 정보를 갖지 못한 채 등급을 매기지 않는다.**

| ID | 관찰 | 근거 | 확인 방법 |
|---|---|---|---|
| **ORG-O1** | `Pnl.php:449` 가 기간을 받고 `:454` 가 무시 → **과거 P&L 도 오늘자 VAT율** | 주석 `:451` 이 의도 명시 → **설계 선택 가능** | `SELECT tenant_id,COUNT(*) FROM kr_fee_rule GROUP BY tenant_id HAVING COUNT(*)>1` — 세율 변경 이력이 없으면 무해 |
| **ORG-O2** | **환율 이력 물리적 부재**(`fxToKrw` KV 덮어쓰기) | 24h 캐시 = 명시적 설계(`:1780`) · **회계 정책 문제** | 과거 기간 **다통화 정산 존재 여부** — KRW 단일이면 무해 |
| **ORG-O3** | **`isDemo` 술어 12벌**(`Pnl:39` prefix 포함 ↔ **`Rollup:70` `=== 'demo'` 만** ↔ **`AdPerformance:31` `return false`**(주석 *"Demo removed"*) ↔ `ChannelCreds:154` **plan 기반**) → `demo_acct_1` 이 핸들러마다 다르게 판정 | 물리 DB 분리(`Db::pdoFor`)가 **별개 층에서 강제 중** · `AdPerformance` 는 **의도된 제거 가능** | 실제 `demo_*` 접두 테넌트 존재 여부 · cross-check 403 이 `Pnl`·`OrderHub` **2곳뿐**인 이유 |
| **ORG-O4** | ★**`AuthContext.jsx:834` prefix 무가드** `menuKey.startsWith(k)` — **레포 유일**(정답 `planMenuPolicy.js:293-295` 는 `p+"/"` 경계 강제 + 주석 *"'/pm' 이 '/pmx' 를 매칭하지 않도록"*) | ★**비교 우주 = `MENU_CATALOG` 26키가 아니라 DB `plan_menu_access.menu_key`**(`:828` `planMenuAccess[userPlan]` · `AdminPlans.php:393`) · **`VARCHAR(255)` enum/FK 없음**(migration `20260527_169_003:9`) → **정적 배제 불가**. 26키·sidebarManifest 35키 **양쪽 prefix 쌍 없음 확인** | 🔴 **성립 조건**: 246차 `marketing`→`marketing_core`/`marketing_advanced` 분할 · `:830-833` 에 **레거시 키 shim 실재**(202차 `ops`→`commerce_channel`) → **저장된 레거시 `"marketing"` 1행이면 둘 다 매칭 = Starter→Growth 권한 상승**. **확인**: `SELECT plan_id,menu_key FROM plan_menu_access WHERE enabled=1` — 레거시 키 잔존 여부 |
| **ORG-O5** | `upsertEdge` 타입 검증 비대칭 → 화이트리스트 밖 노드 엣지 경유 유입 | `upsertNode` 422(`:57-59`) ↔ `upsertEdge` 빈값만 검사(`:112-119`) + `INSERT IGNORE` 자동생성(`:128-133`) · **내부 생산자 0** | `SELECT DISTINCT node_type FROM graph_node` |
| **ORG-O6** | `seedOrg:739` 가 `manager_user_id` 미삽입 → 시드 15팀 manager NULL · `:738` 멱등키가 이름 문자열 + `team.name` UNIQUE 없음 → 개명 시 중복 | 시딩 시점 담당자 미정은 **합리적 설계 가능** | `SELECT COUNT(*) FROM team WHERE manager_user_id IS NULL` |

**라이브 미검증(VACUOUS 미배제)**: `data_scope` 행 수(0이면 `scopeSql*` 5곳 **전부 no-op**) · `graph_node`/`graph_edge` 행 수(0이면 9라우트 `VACUOUS` · §66 논거가 "검증된 운영 패턴"→"패턴 차용 근거"로 **강등**) · `menu_tree` 운영 0행 가능성 · `agency_client_link` 실데이터 · `team.manager_user_id`/`app_user.team_id` 배정률 · **라이브 SQLite 버전**(재귀 CTE 가용성은 **추론**).

---

## 5. 결과

- **채택**: D-1~D-17. 산출 70편 = `docs/segmentation/DSAR_ORGANIZATION_*.md`. **코드변경 0 · 배포 없음 · master 미접촉 · 06-A `NOT_CERTIFIED` 불변.**
- **후속 승인 세션 입력**: 선결 4순서(D-14 Canonical 선언 · D-2 2단 봉인 일반화 · D-5 `upsertEdge` 비대칭 해소 · D-15 가시성 승격) → 재사용 강제(`PM/Dependencies` 순환검출 · `EnterpriseAuth` IdP · `menu_audit_log` 해시체인 **알고리즘만** · `agency_client_link` 바인딩 · `AdminGrowth::fail` 봉투) → 신설 불가피(**Closure Table/Path Index** 전례 0 · **캐시 계층** 부재 · **조직 Registry/Unit/Hierarchy/Version/Snapshot**) → Lint/Guard `ENFORCED` 승격(**브랜치 보호 선결 = 사용자 결정 G-06b**).
- **전제**: Golden Organization Dataset + Conformance + Legacy Equivalence Proof + verify + **배포 승인**.

> ★**이 ADR 의 최대 산출은 결정이 아니라 규율이 오판을 막은 횟수다.**
> "이름 grep 0 → 부재"로 밀었다면 능력 자산 **8개**(`ORG_PRESET` · `parent_user_id` · `EnterpriseAuth` · `graph_node`/`graph_edge` · `PM/Dependencies`+`Gantt` · `menu_tree` · `menu_audit_log` 해시체인 · `agency_client_link`)를 전부 놓치고 **신설**했을 것이다.
> 반대로 "닮았으니 충족"으로 밀었다면 **`'company'` 센티넬을 법인 경계로**(의미 정반대), **§17 우연한 일치를 준수로**, **`graph_node` 를 조직 저장 가능으로**(화이트리스트 422) 오판했을 것이다.
> **부재증명도 존재증명도 이름이 아니라 능력으로. 주석은 실효가 아니다.**
