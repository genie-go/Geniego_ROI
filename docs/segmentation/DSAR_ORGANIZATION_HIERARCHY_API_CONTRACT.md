# DSAR — API Contract (§67)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §67 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

### 0.1 기존 그래프 API = **9라우트 REAL · 조직 노드는 코드가 거부**

| # | 라우트 | 핸들러 |
|---|---|---|
| 1 | `POST /v419/graph/nodes` | `GraphScore::upsertNode` |
| 2 | `GET /v419/graph/nodes` | `GraphScore::listNodes` |
| 3 | `POST /v419/graph/edges` | `GraphScore::upsertEdge` |
| 4 | `GET /v419/graph/edges` | `GraphScore::listEdges` |
| 5 | `GET /v419/graph/score/influencer/{id}` | `GraphScore::scoreInfluencer` |
| 6 | `GET /v419/graph/score/creative/{id}` | `GraphScore::scoreCreative` |
| 7 | `GET /v419/graph/score/sku/{sku}` | `GraphScore::scoreSku` |
| 8 | `GET /v419/graph/score/order/{id}` | `GraphScore::scoreOrder` |
| 9 | `GET /v419/graph/summary` | `GraphScore::summary` |

매핑 `routes.php:721-729` · `$register` `routes.php:2306-2314` — **2단계 등록 양쪽 배선 REAL**.

🔴 **그러나 조직 API 로 재사용 불가**: `GraphScore.php:57-60` 이 `node_type` 을 `['influencer','creative','sku','order']` 화이트리스트로 검증하고 위반 시 **422** 를 반환한다. **`org_unit` 노드는 코드가 구조적으로 거부한다** → **`KEEP_SEPARATE_WITH_REASON`**(§64/§65 정본). Ancestor/Descendant/Path/Root/Cycle/Orphan 라우트도 **존재하지 않는다**(위 9개가 전부).

### 0.2 ★라우트 2단계 등록 관례 (신설 시 필수)

| 단계 | 위치 | 내용 |
|---|---|---|
| ① 매핑 | `routes.php` 배열 | `'METHOD /path' => 'Genie\Handlers\Class::method'` |
| ② `$register` | `routes.php` 하단 | `$register('METHOD', '/path');` |

**한쪽만 하면 라우트가 살지 않는다.** 예: `/auth/team/*`(`routes.php:1589` + `$register :2565-2575`) · `/v419/graph/*`(`:721-729` + `:2306-2314`) · PM(`:1424-1425` + `:1472-1473`).

### 0.3 🔴 `/api` 접두 별칭 — 신규 실배선 필수

`/v419/graph/*` 에는 **`/api` 별칭이 없다**(`api/v419/graph` grep **0**). 반면 PM 은 **양쪽 등록**돼 있다(`routes.php:1424-1425` 원본 + `:1470-1476` `/api/v425/pm/*` 별칭).

🔴 **신규 조직 라우트는 `/api` 접두 별칭을 반드시 함께 등록하라.** 접두 누락 시 **nginx SPA HTML 폴백**이 200 을 반환해 **배선된 것처럼 보이는 착시**가 발생한다(레퍼런스: `reference_api_prefix_routing`). `/v419/graph/*` 가 `/api` 별칭 없이 살아 있는 것은 **선례가 아니라 예외**다 — 복제 금지.

### 0.4 횡단 관심사 10종 현행 실측

| 관심사 | 현행 | 판정 |
|---|---|---|
| Tenant Context | **REAL 강제** — 인증키 tenant 로 `X-Tenant-Id` **무조건 덮어쓰기**(`index.php:600`) · 세션→`auth_tenant` 주입(`:429-442`) · strict fail-closed(`:585`) | `VALIDATED_LEGACY` |
| Authorization | **REAL** — `$roleRank = ['viewer'=>0,'connector'=>1,'analyst'=>2,'admin'=>3]`(`index.php:554`) · 쓰기 판정 축 = **HTTP 메서드**(`:568`) · ingest = `connector+`(`:571-574`) | `VALIDATED_LEGACY`(API 등급) — 🔴 **조직 역할축 아님** |
| Idempotency | **`idempotency_key` grep 0.** 자연키 선점 3패턴만: `claimSendOnce`(`JourneyBuilder.php:672`) · `notification_id` UNIQUE(Paddle) · `uq_rve_dedup`(`Db.php:1017-1034`) | `NOT_APPLICABLE`(**신규**) |
| Optimistic Lock | **`version` optimistic lock grep 0**(5-3-2 확정 재실증). 동시성 = **조건부 UPDATE+rowCount CAS** — **SQLite 폴백 호환이 명시적 설계 제약** | `NOT_APPLICABLE` — 🔴 **`version` 락 도입 = 제약 위반** |
| Effective Date Validation | 🔴 **`WHERE effective_from <= :as_of` 술어 backend/src 전역 0건.** 유일 effective date = `kr_fee_rule.effective_from`(`Db.php:898`) · **읽기 전부 최신승** | `NOT_APPLICABLE`(**신규**) |
| Audit | **3계층 병존** — ★`menu_audit_log.hash_chain`(`AdminMenu.php:128`·`:182-197`·`lastHash():214-219`) SHA-256 prev-chain **실구현** · `pm_audit_log`(tenant+entity+diff_json+3인덱스 `20260526_168_008`) · 전역 `audit_log`(`actor·action·details_json·created_at` **4컬럼·tenant 없음·해시체인 없음** — MySQL `Db.php:540-545`/SQLite `AdminGrowth.php:157-159`) | `VALIDATED_LEGACY`(**패턴 확장**) |
| Evidence | 조직 evidence 축 **0** | `NOT_APPLICABLE` |
| Rate Limit | ★**전역 REAL**(ⓑ 미기재 — 아래 §0.5) | `VALIDATED_LEGACY` |
| Pagination | **표준 계약 없음** — `LIMIT 500` 하드코딩(`GraphScore::listNodes:90-95`) · `offset`(`OrderHub.php:74`) 등 **핸들러별 임의** | `PARTIAL` |
| Error Contract | `AdminGrowth::fail`(`:181-186`) → `['code'=>..., 'detail'=>...]` + HTTP status. `TemplateResponder::respond($res->withStatus(422), ['error'=>...])`(`GraphScore.php:54`) = **다른 봉투** | `PARTIAL` — **봉투 2벌 병존** |

### 0.5 ★기지 실측 정정 — Rate Limit 은 부재가 아니라 REAL

ⓑ 실측에 **누락된 항목**이다. **전역 레이트리밋이 실재한다**: `index.php:508-545` — **API 키 단위 고정 1분 윈도우 카운터** · `api_rate_limit(key_id, window_min, cnt)` PK(key_id,window_min) · 기본 **1200 req/min**(`GENIE_RATE_LIMIT_PER_MIN`, `0` 이면 비활성) · MySQL `ON DUPLICATE KEY UPDATE` / SQLite `ON CONFLICT DO UPDATE` 양방언 · **테이블 부재 시 1회 자가치유 생성 후 재시도**(`ensureTables` 패턴) · 저확률 GC(`rand(1,500)===1` → `window_min < $win-3` 삭제) · 초과 시 `Retry-After: 60 - (time()%60)` · **fail-open**(DB 오류 시 통과 — 주석 `:511` 이 가용성 우선을 명시).

⚠️ **범위 한정**: 주석 `:509` 이 명시 — **대상 = 실제 `api_key` 프로그래매틱 트래픽만.** **SPA/세션 게이트 경로는 그 이전에 return 되어 미도달한다.** 별도 축으로 `UserAuth` 인증 레이트리밋(`rateLimitRetryAfter:3366`·`rateLimitFail`·`rateLimitClear` · `ensureRateLimitSchema:3329`)이 로그인·OTP 에 존재한다.

→ 🔴 **조직 API 에 새 레이트리미터를 만들지 마라.** `index.php:508-545` 가 커버한다. **단 세션 경로(admin UI 등)로 노출되는 조직 API 는 이 리미터에 도달하지 않는다** — 세션 경로 노출 시 이 공백을 명시적으로 다뤄라.

## 1. 원문 전사 + 판정 — **원문 49종** (기능 39 + 횡단 10)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| | **Registry** | | |
| 1 | Organization Registry 조회 | 부재 — 조직 레지스트리 0 | `CONTRACT_ONLY` |
| 2 | Organization Registry 생성·수정 | 부재. 인접 = `seedOrg`(`TeamPermissions.php:725-753` · `routes.php:1589`+`$register :2570` `POST /auth/team/teams/seed-org`) = **15단위 일괄 생성**(동명 skip 멱등·트랜잭션·감사 `:747`) — **열거 시딩이지 레지스트리 CRUD 아님** | `CONTRACT_ONLY` + `LEGACY_ADAPTER`(`seedOrg`) |
| 3 | Source 우선순위 조회 | 부재 — 소스가 1개(내부)뿐. IdP(`EnterpriseAuth`)와 내부 간 우선순위 개념 **0** | `CONTRACT_ONLY` |
| | **Organization Unit** | | |
| 4 | Unit 생성 | 부재. 인접 = `POST /auth/team/teams`(`routes.php:1589`+`$register :2566`) | `CONTRACT_ONLY` + `LEGACY_ADAPTER` |
| 5 | Unit Version 생성 | 부재 — **엔티티 version 축이 `menu_defaults.version` 단 1건** | `CONTRACT_ONLY` |
| 6 | Unit 조회 | 부재. 인접 = `GET /auth/team/teams`(`$register :2565`) | `CONTRACT_ONLY` + `LEGACY_ADAPTER` |
| 7 | Effective Date 기준 조회 | 부재 — 🔴 **`WHERE effective_from <= :as_of` 전역 0건** | `CONTRACT_ONLY`(**순수 신규**) |
| 8 | Unit Lifecycle 변경 | 부재. 인접 = `PATCH /auth/team/teams/{id}`(`$register :2567`) · `DELETE`(`:2568`) · `POST .../restore`(`:2571`) · `team.status` 컬럼 | `CONTRACT_ONLY` + `LEGACY_ADAPTER` |
| 9 | Unit History 조회 | 부재 — **이력 테이블 0**(§65 #25) | `CONTRACT_ONLY` |
| | **Hierarchy** | | |
| 10 | Hierarchy 생성 | 부재 — `hierarch` grep **0** | `CONTRACT_ONLY` |
| 11 | Hierarchy Version 생성 | 부재 | `CONTRACT_ONLY` |
| 12 | Hierarchy 검증 | 부재(조직). ★**알고리즘 정본 실재** = `PM/Dependencies::validateDependency`(`:79-100`) 반복 DFS+visited+tenant 필터+깊이캡 10000 + **쓰기 전 차단**(`:32-34`→422 `cycle_detected`) | `CONTRACT_ONLY` + ★`VALIDATED_LEGACY`(**알고리즘 확장 강제**) |
| 13 | Hierarchy 활성화 | 부재 — 활성 버전 개념 **0** | `CONTRACT_ONLY` |
| 14 | Hierarchy Version 조회 | 부재 | `CONTRACT_ONLY` |
| 15 | 특정 날짜 Active Version 조회 | 부재 — **as-of 능력 0** | `CONTRACT_ONLY`(**순수 신규**) |
| | **Graph** | | |
| 16 | Node 추가·종료 | **추가만 존재 · 종료 없음 · 도메인 상이**: `POST /v419/graph/nodes`(`routes.php:721`) — 🔴 `node_type` 화이트리스트 422(`GraphScore.php:57-60`) · **논리 종료(end-dating) 축 0** | `KEEP_SEPARATE_WITH_REASON` + `CONTRACT_ONLY`(종료) |
| 17 | Edge 추가·종료 | **추가만 존재 · 종료 없음**: `POST /v419/graph/edges`(`:723`) · 자동 노드 생성(`GraphScore.php:126-133`) | `KEEP_SEPARATE_WITH_REASON` + `CONTRACT_ONLY`(종료) |
| 18 | Parent 조회 | 부재(조직). 인접 = `graph_edge` dst 인덱스(`Db.php:839`)로 **1홉 역방향 조회 가능** · `menu_tree` 조상 walk(`AdminMenu.php:540-555`) | `CONTRACT_ONLY` + `LEGACY_ADAPTER` |
| 19 | Child 조회 | 부재(조직). 인접 = `graph_edge` src 인덱스(`Db.php:838`) | `CONTRACT_ONLY` + `LEGACY_ADAPTER` |
| 20 | Ancestor 조회 | **부재 — 라우트 0.** `/v419/graph/*` 9개 중 ancestor 없음. Closure/Path **전례 0** | `CONTRACT_ONLY`(**순수 신규**) |
| 21 | Descendant 조회 | **부재 — 라우트 0.** 현행 유사물 = `scoreInfluencer:187-240` **하드코딩 3-hop** · 🔴 **N+1**(`:207-219`) | `CONTRACT_ONLY`(**순수 신규**) |
| 22 | Path 조회 | **부재 — Path 스토어·라우트 0** | `CONTRACT_ONLY`(**순수 신규**) |
| 23 | Root 조회 | 부재. 인접 패턴 = `parent_user_id IS NULL`(`PlanLimits.php:36-37`) · `COALESCE(parent_id,"")`(`AdminMenu.php:272`·`:333`) | `CONTRACT_ONLY` + `LEGACY_ADAPTER` |
| 24 | Cycle 검증 | 부재(조직·그래프). 🔴 **`graph_edge` 순환 방어 0**. ★정본 = `PM/Dependencies:79-100`(쓰기 전 차단) · `menu_tree::wouldCycle:540-555`(깊이캡 100·자기참조 즉시 차단 `:542`) · `PM/Gantt:104-125`(Kahn + `count($topo)!==count($taskMap)` 정석 판정) | `CONTRACT_ONLY`(라우트) + ★`VALIDATED_LEGACY`(**알고리즘**) |
| 25 | Orphan 조회 | 부재 — **전 트리 구현에 orphan 탐지 0** | `CONTRACT_ONLY` |
| | **Binding** | | |
| 26 | Tenant Binding | **인접 REAL** — 강제는 미들웨어에 있으나(`index.php:600`·`:429-442`·`:585`) **테넌트 마스터 테이블이 없다**(`api_key.tenant_id VARCHAR(100)` **FK 없음** `Db.php:944` · 발급 = `'acct_'.$id` 문자열 `UserAuth.php:220-224` · 열거 = `SELECT DISTINCT tenant_id` **19개소 역추론**) | `PARTIAL` — **바인딩 API 는 신규** |
| 27 | Workspace Binding | 부재 — 워크스페이스 축 **0** | `CONTRACT_ONLY` |
| 28 | Legal Entity Binding | 부재 — **법인 엔티티 0**. 🔴 `'company'` 는 **무제한 센티넬**(`TeamPermissions.php:258`) | `CONTRACT_ONLY` |
| 29 | Cost Center Binding | 부재 — `cost_center` grep **0** | `CONTRACT_ONLY` |
| 30 | Profit Center Binding | 부재 — `profit_center` grep **0** | `CONTRACT_ONLY` |
| 31 | Region·Country Binding | 부재 — **Country↔Region binding 0** · `region` **3축 병존**(`Db.php:681,690` / `Connectors.php:2704-2710` / `Wms.php:129`) · `Geo` 는 **Country→언어** 매핑(`Geo.php:23-53`) | `CONTRACT_ONLY` — 🔴 **`region` 어휘 한정 필수** |
| 32 | Brand·Store·Merchant Binding | 부재. 인접: `catalog_brand` CRUD(`Catalog.php:443-465`) = **상품속성**(`BRAND_REQUIRED_CHANNELS` `:415`) · Store/Merchant = **KV_ONLY**(`channel_credential` `Db.php:976-982`) | `CONTRACT_ONLY` + `KV_ONLY` |
| | **Snapshot** | | |
| 33 | Approval용 Organization Snapshot 생성 | 부재. ★선례 = `menu_defaults`(`AdminMenu.php:120`·생성 `:308`) · `pm_baseline`(`PM\Enterprise.php:55`·`:360-364`) | `CONTRACT_ONLY` + `VALIDATED_LEGACY`(**패턴**) |
| 34 | Snapshot 조회 | 부재. `menu_defaults` 복원 = `:584-590`(**최신 1건만**) | `CONTRACT_ONLY` + `LEGACY_ADAPTER` |
| 35 | Snapshot Hash 검증 | 부재 — **`menu_defaults` 에 immutable_hash 없음**. ★선례 = `schema_migrations.checksum`(`Migrate.php:50` `hash('sha256',$sql)`·검증 `:63-64`·`:145`/`:151`) · `menu_audit_log.hash_chain`(`AdminMenu.php:128`) | `CONTRACT_ONLY` + `VALIDATED_LEGACY`(**패턴**) |
| | **Reconciliation** | | |
| 36 | Source별 비교 | 부재 — 소스 1개 | `CONTRACT_ONLY` |
| 37 | Drift 목록 | 부재 | `CONTRACT_ONLY` |
| 38 | Manual Resolution | 부재 | `CONTRACT_ONLY` |
| 39 | Reconciliation History | 부재 | `CONTRACT_ONLY` |
| | **모든 API 적용 (횡단)** | | |
| 40 | Tenant Context | **REAL** — `index.php:600` 무조건 덮어쓰기 · `:429-442` · fail-closed `:585` | `VALIDATED_LEGACY` — 🔴 **재구현 금지** |
| 41 | Authorization | **REAL**(`index.php:554`·`:568`·`:571-574`) — 🔴 **기계 신원 API 등급이지 조직 역할 아님**. `team_role`(`TeamPermissions.php:17`)과 **매핑 코드 0** | `VALIDATED_LEGACY` + `KEEP_SEPARATE_WITH_REASON` |
| 42 | Idempotency | **`idempotency_key` grep 0.** 자연키 선점 3패턴(`claimSendOnce` `JourneyBuilder.php:672` 최정합 · Paddle `notification_id` UNIQUE · `uq_rve_dedup` `Db.php:1017-1034`) | `CONTRACT_ONLY`(**신규** — 패턴은 `claimSendOnce` 채택) |
| 43 | Optimistic Lock | **grep 0.** 🔴 **`version` 락·분산락·`GET_LOCK` 도입 금지** — SQLite 폴백 호환 제약. **조건부 UPDATE+rowCount CAS 채택** | `CONTRACT_ONLY` — **CAS 로 구현** |
| 44 | Effective Date Validation | 🔴 **전역 0건**(`WHERE effective_from <= :as_of`). `effective_to` 없음 → **폐구간 모델 신규** | `CONTRACT_ONLY`(**순수 신규**) |
| 45 | Audit | **REAL · 3계층** — `menu_audit_log.hash_chain`(`AdminMenu.php:128`) · `pm_audit_log`(`20260526_168_008`) · 전역 `audit_log`(**4컬럼·tenant 없음·해시체인 없음** `Db.php:540-545`). 🔴 **"해시체인 없음"을 전역 명제로 인용하면 오염 — 참인 것은 전역 `audit_log` 에 한해서다** | `VALIDATED_LEGACY`(**`menu_audit_log`/`pm_audit_log` 패턴 확장 — 신설 금지**) |
| 46 | Evidence | 조직 evidence 축 **0** | `CONTRACT_ONLY` |
| 47 | Rate Limit | ★**REAL**(ⓑ 미기재·본 문서 정정) — `index.php:508-545` `api_rate_limit` · 1200 req/min 기본 · 양방언 upsert · 자가치유 · fail-open · `Retry-After`. ⚠️ **대상 = `api_key` 프로그래매틱 트래픽만**(주석 `:509`) — **세션 경로 미도달** | `VALIDATED_LEGACY` — 🔴 **신설 금지** · ⚠️ **세션 노출 시 공백 명시** |
| 48 | Pagination | **표준 계약 없음** — `LIMIT 500` 하드코딩(`GraphScore::listNodes:90-95`) · `offset`(`OrderHub.php:74`) · 핸들러별 임의 | `PARTIAL` — **조직 API 는 명시적 계약 필요** |
| 49 | Error Contract | **봉투 2벌 병존** — `AdminGrowth::fail:181-186`(`['code'=>..., 'detail'=>...]`+status) vs `TemplateResponder::respond($res->withStatus(422), ['error'=>...])`(`GraphScore.php:54`·`:59`) | `PARTIAL` — **`AdminGrowth::fail` 봉투 채택 권고**(정형 `code` 축 보유) |

**실측 개수: 49 / 49 전사** (기능 39 + 횡단 10). 원문 개수와 전사 개수 **일치**.

**커버리지**: `CONTRACT_ONLY` **32**(실 코드 0) · `VALIDATED_LEGACY` **8**(Tenant Context·Authorization·Audit·Rate Limit·순환 알고리즘·스냅샷 패턴·해시 패턴·`seedOrg` 시딩축) · `KEEP_SEPARATE_WITH_REASON` **3**(graph node/edge·역할축) · `PARTIAL` **4**(Tenant Binding·Pagination·Error Contract·— ) · `LEGACY_ADAPTER` 부수 배정 · `KV_ONLY` 1.

## 2. 규칙

- 🔴 **`/v419/graph/*` 를 조직 API 로 확장하지 마라.** `GraphScore.php:57-60` 이 `node_type` 을 `['influencer','creative','sku','order']` 로 422 검증한다 — 화이트리스트를 넓히는 순간 **마케팅 귀속 스코어 도메인이 조직 도메인과 한 테이블에서 섞인다**(§64/§65 `KEEP_SEPARATE_WITH_REASON` 파기). **조직은 별도 라우트 네임스페이스 · 별도 노드/엣지 스토어 · 단 순회 알고리즘은 `PM/Dependencies` 확장.**
- 🔴 **라우트 2단계 등록 필수** — `routes.php` 매핑 + `$register`. **한쪽만 하면 라우트가 살지 않는다.**
- 🔴 **`/api` 접두 별칭 필수.** `/v419/graph/*` 는 별칭이 **없다**(grep 0) — **선례가 아니라 예외이며 복제 금지**다. 별칭 누락 시 **nginx SPA HTML 폴백이 200 을 반환해 배선 착시**가 생긴다. PM 패턴(`routes.php:1424-1425` + `:1470-1476`)을 따르라.
- 🔴 **Tenant Context·Authorization·Rate Limit·Audit 재구현 금지 — 전부 REAL 이다.** 조직 API 는 이 4종을 **소비**하는 쪽이지 구현하는 쪽이 아니다.
- 🔴 **`version` optimistic lock 도입 금지 — SQLite 폴백 호환이 명시적 설계 제약이다.** §67 이 요구하는 Optimistic Lock 은 **조건부 UPDATE + rowCount CAS** 로 구현하라(레포 4곳 선례: `Catalog:1683` · `ChannelSync:6136-6153` · `JourneyBuilder:411` · `Omnichannel::claimConditional:427-447`). **`\bversion\b` 40건은 전부 API/DB/벤더 버전 문자열이며 락이 아니다.**
- 🔴 **Idempotency 는 `claimSendOnce`(`JourneyBuilder.php:672`) 패턴을 채택하라** — `idempotency_key` 축은 레포에 **0** 이며, 자연키 선점이 현행 유일 정합 수단이다.
- 🔴 **Error Contract 는 `AdminGrowth::fail`(`:181-186`) 봉투를 채택하라.** 세 번째 봉투 신설 = 중복. 현행 2벌(`{code,detail}` vs `{error}`) 중 정형 `code` 축을 가진 쪽이 정본이다.
- 🔴 **Effective Date Validation·Ancestor·Descendant·Path·Snapshot Hash 는 순수 신규다.** 인접 자산으로 "있다고 가정하고 배선" 금지. 단 **패턴은 반드시 재사용**: 해시=`schema_migrations.checksum`(`Migrate.php:50`) · 스냅샷=`menu_defaults`/`pm_baseline` · 순회=`PM/Dependencies`.
- ⚠️ **Rate Limit 세션 경로 공백을 명시하라.** `index.php:508-545` 는 주석 `:509` 가 밝히듯 **`api_key` 프로그래매틱 트래픽만** 커버한다. 조직 API 를 admin UI(세션) 로 노출하면 **레이트리밋 밖**이다. 이를 "커버됨"으로 적으면 역산이다.
- ⚠️ **Pagination 계약을 조직 API 에 명시하라.** 현행은 표준이 없고 `LIMIT 500` 하드코딩(`GraphScore::listNodes:90-95`)이다. 조상/후손 조회는 결과 집합이 트리 크기에 비례하므로 **무제한 응답이 곧 장애**다.
