# Approval Chain — 데이터 저장 전략 · API Contract · Index·Performance · Cache 원칙

> EPIC 06-A Part 4-5-3-1-5-3-3-3 · 원문 §64, §65, §66, §67 전사
> 원문 정본: `docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_3_VERBATIM.md`
> 판정 근거: 289차 ⓑ 전수조사(105항목) 실측. 코드 변경 0.

## 1. 원문 전사

### §64. 데이터 저장 전략 (원문 줄 2879-2928 · 분모 10)

원문 항목 = "기존 기술 스택에 따라 다음을 사용할 수 있다"의 저장 기법 10종. 판정 = **승인 Chain 저장 전략으로서 현행 스택이 그 기법을 제공하는가**(인접 도메인 선례 실재 ≠ Chain 도메인 충족).

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | Relational Adjacency List | 기법 실재·승인 도메인 0 — `backend/migrations/20260526_168_004_create_pm_task_dependencies.sql:4-15`(`predecessor_id`/`successor_id` 엣지 리스트 + `UNIQUE(tenant,pred,succ,dep_type)` `:12` + 양방향 인덱스 `:13-14`) · `menu_tree.parent_id`(`backend/migrations/20260526_168_101_create_menu_tree.sql:21`) · `pm_tasks.parent_task_id`(`backend/migrations/20260526_168_002_create_pm_tasks.sql:8`). `approval_chain`/`approval_route` 테이블 0 | PARTIAL |
| 2 | DAG Table | 테이블 실재·DAG 아님 — `graph_node`/`graph_edge`(`backend/src/Db.php:816-839`). 🔴 `graph_node:816-824` = **id PK 뿐**(인덱스·UNIQUE 0) · `GraphScore.php:107` `upsertEdge` **acyclicity 검사 없음** → 그래프 스토어이지 DAG 스토어 아님 · `GraphScore.php:44` `upsertNode` 타입 화이트리스트가 `upsertEdge` 엔 부재 | PARTIAL |
| 3 | Materialized Path | `path`/`materialized_path` 계층경로 컬럼 `backend/src` **0**(`route` 히트는 SPA URL — `menu_tree.route VARCHAR(255)` `20260526_168_101_create_menu_tree.sql:10` · `backend/src/routes.php` 1636줄) | ABSENT |
| 4 | Closure Table | `closure` `backend/src` **0**(composer.lock `laravel/serializable-closure` 는 PHP 클로저 직렬화 라이브러리 — 무관) | ABSENT |
| 5 | Recursive CTE | `WITH RECURSIVE`·`CONNECT BY` `backend/src` **0**. 🔴 `Db.php:186` 가 SQLite 폴백 경로를 유지하고 `Db::sql()`(`:177-191`)은 **DDL 전용 번역기** — SELECT·CTE 미지원 → 재귀 CTE 는 이식성 축에서도 미확보 | ABSENT |
| 6 | Workflow Graph Adapter | 어댑터 계층 **0**. 그래프는 실재하나(`journeys.nodes`/`edges` `JourneyBuilder.php:35-41`) §70 Step 2 에서 SoT 후보 전량 탈락 — `createJourney:135`/`updateJourney:153-154` **무검증 `json_encode`** · 엣지 id 없음(`from`+`when` 매칭 `:789`,`:796`) · `customer_id` 하드 전제(`:551`,`:556`,`:822`). `Adapter` grep = `AdAdapters`(광고 채널) | ABSENT |
| 7 | BPMN Adapter | `bpmn` `backend/src` **0**(§3.5 이름 축 전량 0) | ABSENT |
| 8 | Typed JSON Definition | JSON Definition 실재·**Typed 0** — `journeys` MEDIUMTEXT(`JourneyBuilder.php:36`)에 무검증 저장. 🔴 JSON Schema 검증 라이브러리 `backend/composer.json:6-13` **부재**(slim/php-di/dotenv/illuminate-database/monolog 뿐) · `model_json_schema` 는 `backend/data/templates.json:626` 등 템플릿 스텁이며 `backend/src` 구현 **0** | PARTIAL |
| 9 | Policy Engine | 엔진 실재·승인 도메인 배선 0 — `backend/src/Handlers/RuleEngine.php:24`(연산자 화이트리스트 `OPS:33` · `compare:433-439` switch · 테이블 `:43` · **`eval` 미사용**; `eval`/`create_function`/`system` `backend/src` 0). §25 "허용된 DSL·Policy Engine" 의 기존 선례 | PARTIAL |
| 10 | Event-sourced Version History | 이벤트 소싱 **0** · Chain 도메인 version/effective **0** · 유사 `menu_defaults.version` = 리터럴 `'baseline'`(`AdminMenu.php:309`) · optimistic lock `version` 0 | ABSENT |

### §65. API Contract (원문 줄 2929-3044 · 분모 80)

#### Registry·Definition

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | Chain Registry 조회 | 부재. `approval_chain`·`approval_route`·`chain_id`(승인) 이름 축 `backend/src` 0 · `backend/src/routes.php` 1636줄에 chain 라우트 0 | ABSENT |
| 2 | Chain Definition 생성 | 부재. 상동 | ABSENT |
| 3 | Chain Definition 수정 | 부재. 상동 | ABSENT |
| 4 | Chain Definition 조회 | 부재. 상동 | ABSENT |
| 5 | Chain Definition History 조회 | 부재. Definition 자체 0 → History 0 | ABSENT |
| 6 | Chain Type 조회 | 부재. `approval_type` 히트는 `Catalog::evaluatePolicy`(`:2247`) 산출 문자열이며 🔴 `logJob:2247` 이 **저장하지 않고**(`:2252` 응답에만) 소비처는 `frontend/src/pages/Writeback.jsx:170`,`:261` — Chain Type 레지스트리 아님 | ABSENT |

#### Version

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 7 | Chain Version 생성 | 부재. Chain 도메인 version 컬럼 0 | ABSENT |
| 8 | Version 비교 | 부재 | ABSENT |
| 9 | Version 검증 | 부재 | ABSENT |
| 10 | Version Compile | 부재. Compilation Artifact 0 | ABSENT |
| 11 | Version Review 요청 | 부재 | ABSENT |
| 12 | Version 승인 Reference | 부재. 승인 4경로(`mapping_change_request`·`catalog_writeback_job`·`action_request`·`admin_growth_approval`) 어느 것도 Definition Version 을 참조하지 않음 | ABSENT |
| 13 | Version 활성화 | 부재 | ABSENT |
| 14 | Future Activation 예약 | 부재. 예약 스케줄러 선례 = SMS 예약 워커(286차)뿐 · Chain 축 0 | ABSENT |
| 15 | 특정 날짜 Version 조회 | 부재. 🔴 `WHERE effective_from <= :as_of` **전역 0** — `kr_fee_rule.effective_from`(`Db.php:898`) 조차 읽기 4개소 전부 `ORDER BY effective_from DESC` 최신승(`Pnl.php:454` · `KrChannel.php:151`,`:459`) | ABSENT |
| 16 | Version 종료 | 부재. `effective_to`/`valid_to` grep 0(`valid_to` 유일 히트 = `Onsite.php:396` `invalid_token`) | ABSENT |
| 17 | Version History 조회 | 부재 | ABSENT |

#### Template

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 18 | Template 생성 | 부재. 최근접 = `JourneyBuilder::createJourney:120-125` `$defaultNodes`/`$defaultEdges` **PHP 리터럴 시드**(생성 시 1회 복사) — 레지스트리·API 0 | ABSENT |
| 19 | Template Version 생성 | 부재 | ABSENT |
| 20 | Template 조회 | 부재 | ABSENT |
| 21 | Template Parameter 검증 | 부재. 파라미터화 자체 0 | ABSENT |
| 22 | Template로 Chain Version 생성 | 부재 | ABSENT |
| 23 | Template Compatibility 조회 | 부재 | ABSENT |

#### Stage·Level

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 24 | Stage 생성 | 부재. `approval_stage`·`step_order`·`sequence_no` `backend/src` 0(`stage` 히트 = `SupplyChain.php:50-54`,`:193-199` **물류 마일스톤 체크리스트** · `done TINYINT`=체크박스) | ABSENT |
| 25 | Stage Version 생성 | 부재 | ABSENT |
| 26 | Level 생성 | 부재. `approval_level`·`manager_level`·`approval_depth` 0 | ABSENT |
| 27 | Level Version 생성 | 부재 | ABSENT |
| 28 | Stage·Level 구조 조회 | 부재 | ABSENT |
| 29 | Stage·Level Validation | 부재 | ABSENT |

#### Route

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 30 | Route 생성 | 부재. `approval_route`·`route_id` 0(`route` 단독 히트는 SPA URL — `menu_tree.route` `20260526_168_101_create_menu_tree.sql:10`) | ABSENT |
| 31 | Route Version 생성 | 부재 | ABSENT |
| 32 | Node 생성 | 승인 라우트 부재. 인접 선례 = `GraphScore.php:44` `upsertNode`(타입 화이트리스트 `:57-59`) — 도메인=influencer/creative/sku/order | ABSENT |
| 33 | Edge 생성 | 승인 라우트 부재. 인접 선례 = `GraphScore.php:107` `upsertEdge` — 🔴 `:126-133` 이 화이트리스트 없이 임의 타입 자동삽입 | ABSENT |
| 34 | Condition 생성 | 승인 라우트 부재. 인접 선례 = `RuleEngine.php:24`(테이블 `:43`) · `JourneyBuilder` `condition:600`→`evalCondition:818` | ABSENT |
| 35 | Branch 생성 | 승인 라우트 부재. 인접 선례 = `JourneyBuilder` `split:610`→`pickWeighted:725-734`(**결정론적 해시 분배** — 확률 아님) · **배타 택일만** | ABSENT |
| 36 | Merge 생성 | 부재. Merge(합류) 노드 개념 `backend/src` 0 — `JourneyBuilder::nextNode:799` 는 **첫 일치 즉시 return** 단일 후속 | ABSENT |
| 37 | Route Graph 조회 | 부재 | ABSENT |
| 38 | Topological Order 조회 | 승인 라우트 부재. 알고리즘 선례 = `backend/src/Handlers/PM/Gantt.php:104-122` **Kahn 위상정렬**(도메인=PM 태스크 간트) | ABSENT |
| 39 | Reachability 검증 | 승인 라우트 부재. 알고리즘 선례 = `Gantt.php:119` `count($topo)!==count($taskMap)` + `:120-125` 500 아닌 부분결과+경고 degrade | ABSENT |
| 40 | Cycle 검증 | 승인 라우트 부재. 알고리즘 선례 = `backend/src/Handlers/PM/Dependencies.php:79-100`(반복 DFS + `$visited:81` + **tenant 필터 `:91` 매 홉**) + **쓰기 전 차단 `:32-34` 422 `cycle_detected`** + self-loop `:29-31`. 🔴 `:32-34` 는 422 조기반환하여 `:48` `auditLog` **미도달** | ABSENT |

#### Applicability·Selection

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 41 | Applicability 생성 | 부재. 최근접 = `Catalog.php:1016` 상수 `HIGH_VALUE_KRW = 5000000.0` + `:1103-1105` `$price >= HIGH_VALUE_KRW` → `requires_approval=true` — **하드코딩 상수이지 등록 가능한 Applicability 아님** | ABSENT |
| 42 | Applicability 검증 | 부재 | ABSENT |
| 43 | Chain Candidate 조회 | 부재. Chain 다중 후보 개념 0 | ABSENT |
| 44 | Chain Selection 실행 | 부재 | ABSENT |
| 45 | Selection Evidence 조회 | 부재. 선택 근거 보존 0 | ABSENT |
| 46 | Multiple Match 조회 | 부재. 🔴 인접 도메인은 **반례** — `JourneyBuilder::nextNode:799` 첫 일치 즉시 return → 다중 일치 무탐지·무기록(§72-11 위반이 마케팅 도메인에 실재) | ABSENT |
| 47 | No Match 처리 | 부재. 🔴 인접 도메인 부분 선례이자 반례 — `nextNode:809` `if ($hasLabeled) return ''`(BLOCK_ON_NO_MATCH)는 **라벨 있는 그래프에만** 적용 · `:811-812` 무라벨 레거시 위치 폴백 존치 · `:814` 분기 없으면 첫 후보 반환 · 286차 실장애 기록(주석 `:801-803`) | ABSENT |

#### Override·Fallback

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 48 | Override 생성 | 부재. `override` 히트 = **스칼라 선행순위**(`Mmm.php:381-382` · `OrderHub.php:1274`) — Chain Override 아님 | ABSENT |
| 49 | Override 종료 | 부재. 🔴 인접 반례 — `AgencyPortal.php:304`,`:381` 이 `revoked_at=NULL` 로 **이전 해지시각을 소거**(위임 이력 물리 소멸) | ABSENT |
| 50 | Active Override 조회 | 부재 | ABSENT |
| 51 | Fallback 생성 | 부재 | ABSENT |
| 52 | Fallback Sequence 조회 | 부재 | ABSENT |
| 53 | Fallback Cycle 검증 | 부재. Fallback 개념 자체 0 | ABSENT |

#### Resolution

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 54 | Resolution Input 생성 | 부재 | ABSENT |
| 55 | Chain Candidate 생성 | 부재 | ABSENT |
| 56 | Chain Resolution 실행 | 부재. ★`resolveApprover`/`routeApproval`/`next_approver`/`approver_id` **승인 히트 0** — 4경로 전량 "호출자가 곧 승인자" | ABSENT |
| 57 | Resolution Result 조회 | 부재 | ABSENT |
| 58 | Required Actor Source Requirement 조회 | 부재. `required_approvals` 유일 생산자 = `Mapping.php:209-210` **리터럴 `2`** + `Db.php:634` `DEFAULT 2` — 요건 모델이 아니라 상수. 🔴 `Db.php:592-600` `action_request` 엔 `required_approvals` **컬럼 자체가 없다**(`Alerting:562` `required_approvals=>2` 는 응답 투영 리터럴) | ABSENT |
| 59 | Manual Review 전환 | 부재. `escalat` 히트 = `Reviews.php:173-187` **부정리뷰 Slack 통지** | ABSENT |

#### Snapshot·Reconciliation

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 60 | Chain Snapshot 생성 | 부재. 스냅샷 선례는 `menu_defaults.snapshot_data`(`AdminMenu.php:119-120`) · `pm_baseline.snapshot_json`(`PM/Enterprise.php:360`)이나 Chain 도메인 0(`snapshot` 최다 히트 = **CCTV JPEG** `routes.php:271`) | ABSENT |
| 61 | Snapshot 조회 | 부재 | ABSENT |
| 62 | Snapshot Hash 검증 | 부재. 검증기 정본 선례 = `backend/src/SecurityAudit.php:56-68` `verify()` `hash_equals`(+ tenant 포함 해시 `:27` · DDL `:45-52`). 🔴 `menu_audit_log.hash_chain` 은 인용 금지 — preimage 의 `'ts'=>date('c')`(`AdminMenu.php:195`) 가 **`:199-203` INSERT 컬럼 목록에 `created_at` 이 없어 미저장**(`:129` DB DEFAULT) → 재구성 불가(★근거 정정 — `prev` 는 `lastHash():216` 으로 재구성 가능) | ABSENT |
| 63 | Historical Reconstruction | 부재. 🔴 `ensureTables` 자가치유는 **테이블 생성만 하고 데이터 변환·백필을 하지 않는다** · `backend/migrations/` **21파일 · `20260527_172_002` 정지** · approval/chain/route 마이그레이션 0 | ABSENT |
| 64 | Reconciliation 실행 | 부재 | ABSENT |
| 65 | Drift 조회 | 부재 | ABSENT |
| 66 | 영향 Case 조회 | 부재 | ABSENT |
| 67 | Manual Resolution | 부재 | ABSENT |

#### 모든 API에 적용

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 68 | Tenant Context | 메커니즘 실재·일관성 미달 — `backend/public/index.php` 인증 후 `auth_tenant` 속성 + `X-Tenant-Id` 주입 · `Catalog::approveQueue:2350` tenant 스코프 실재. 🔴 반례 = `admin_growth_approval` **`tenant_id` 컬럼 없음**(`AdminGrowth.php:142-149`) · 조회 `:1324` `WHERE id=?` tenant 술어 없음 · Tenant 마스터 테이블 부재(`api_key.tenant_id` FK 없는 VARCHAR `Db.php:944`) | PARTIAL |
| 69 | Authorization | 게이트 실재·정본 축 부재 — 🔴🔴 `$roleRank`(`backend/public/index.php:554` `viewer0<connector1<analyst2<admin3`) ↔ `team_role`(owner>manager>member) **매핑 코드 전수 0** · 판정 축 = **HTTP 메서드**(`:568` `in_array($method,['POST','PUT','PATCH','DELETE'])`) · 🔴 `acl_permission.approve`(`TeamPermissions::ACTIONS:39` · `seedOrg:711` 시드)를 **읽어 승인 가부를 판정하는 코드 0** | PARTIAL |
| 70 | Effective Date Validation | 부재. `kr_fee_rule.effective_from`(`Db.php:898`) **컬럼 有·as_of 질의 無** · 환율 `fxToKrw`(`Connectors.php:1749`)는 **컬럼도 이력도 無**(`app_setting` KV 단일행 덮어쓰기 `:1804-1805`) | ABSENT |
| 71 | Idempotency | 계약 부재. `backend/src` 전수 1히트 = `Paddle.php:343` 웹훅 `notification_id` UNIQUE(단일 웹훅 한정) · `Idempotency-Key` 헤더 계약 0 | ABSENT |
| 72 | Optimistic Lock | 부재. optimistic lock `version` 컬럼 0 · `ETag`/`If-Match` 0(유일 히트 `EnterpriseAuth.php:431` `'etag'=>['supported'=>false]` = SCIM 미지원 자인) | ABSENT |
| 73 | Audit | 실재·불균일 — 승인 4경로 중 3곳(`Mapping.php:213`,`:291` · `Alerting.php:597`,`:655` · `AdminGrowth.php:201`). 🔴 `Catalog::approveQueue` 감사 **0**(클래스에 audit 함수 자체 부재) · 🔴 `Dependencies.php:32-34` 순환 탐지 시 `:48` auditLog 미도달. 정본 선례 = `SecurityAudit.php:27`,`:45-52`,`:56-68` | PARTIAL |
| 74 | Evidence | 부재. `Actor Authorization Snapshot` 0 — `approvals_json`(`Mapping.php:285`) = `["user"=>$actor,"ts"=>gmdate('c')]` **정확히 2키** · `Alerting.php:591` = `{actor,decision,ts}` **3키**(형태 상이) · `AdminGrowth` = `decided_by`/`decided_at` 2컬럼 → 어느 것도 승인시점 권한/역할/플랜 미보존 → as-of 질의 불가 | ABSENT |
| 75 | Rate Limit | 실재·fail-open — `backend/public/index.php:515-549` api_key별 분당 윈도우(`api_rate_limit` upsert `:520`/`:522` · 429 + `Retry-After`/`X-RateLimit-Limit` `:546-548` · 테이블 부재 시 1회 자가치유 `:531-538`). 🔴 `:550` `catch (\Throwable $eRl) { /* fail-open: 가용성 우선 */ }` | PARTIAL |
| 76 | Pagination | 선례 실재·전역 계약 부재 — `AdminMenu.php:679-680`,`:702-704`(`page`/`page_size`/`has_more`/`total`) 1개 핸들러 · `LIMIT` 사용 91파일이나 통일 계약 선언 0 | PARTIAL |
| 77 | Error Contract | 형태 관례 실재·스키마 선언 0 — `index.php:566`,`:576`(`['error'=>'Forbidden','detail'=>...]`) · `Dependencies.php:27`,`:30`,`:33`(`['error'=>'invalid_input'|'self_dependency'|'cycle_detected']` 422) · `:44` 409 — 코드 열거·정본 문서 0 | PARTIAL |
| 78 | Correlation ID | 선례 1개소 — `AdminMenu.php:236-239` `requestId()` `X-Request-Id` 판독(64자 절단). 전역 미들웨어 주입 0. ★오탐: `WM_QOS.CORRELATION_ID`(`ChannelSync.php:1705`,`:1709`,`:2874`,`:3467` 등) = **Walmart 외부 API 헤더** | PARTIAL |
| 79 | Request Validation | 불균일 — 강제 선례 `Dependencies.php:26`(`validId` + `in_array($type, self::DEP_TYPES)` → 422) · `TeamPermissions::normActions:186`(`in_array` 강제이나 **무음 드롭**) · `:342` `in_array($stype, self::DATA_SCOPES)` **무음 강등 폴백(`'own'`)**. 🔴 `JourneyBuilder::createJourney:135`/`updateJourney:153-154` **무검증 `json_encode`** | PARTIAL |
| 80 | Version Check | 부재. Chain version 0 · `schema_migrations.checksum`(`Migrate.php:50`)은 마이그레이션 축(DDL 적용기)이며 도메인 버전 아님 | ABSENT |

### §66. Index·Performance (원문 줄 3045-3083 · 분모 32)

원문 = "최소 다음 조회를 최적화하라". 판정 = **승인 Chain 조회 축의 인덱스 실재 여부**. `approval_chain`/`approval_route`/`approval_stage`/`approval_level` 테이블이 전무하므로 32축 전량 대상 테이블 부재.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | Tenant별 Active Chain | 대상 테이블 부재. tenant 선두 복합인덱스 선례 = `Db.php:838-839`(`graph_edge(tenant_id,src_type,src_id)`) · `TeamPermissions.php:158`,`:165` | ABSENT |
| 2 | Approval Domain별 Active Chain | 대상 부재. `approval_domain` `backend/src` 0 | ABSENT |
| 3 | Request Type별 Applicable Chain | 대상 부재 | ABSENT |
| 4 | Resource Type별 Applicable Chain | 대상 부재. 자원 레지스트리 최근접 = `TeamPermissions::MENU_CATALOG:55-82`(26개 · `validMenu:180` 강제) = **메뉴 한정** — 리베이트/승인건은 자원 아님 | ABSENT |
| 5 | Rebate Type별 Applicable Chain | 대상 부재. `rebate` 도메인 테이블 0 | ABSENT |
| 6 | Organization별 Chain | 대상 부재. `ORGANIZATION_*` 이름·능력 양쪽 0 · `ORG_PRESET` = `TeamPermissions.php:706-722` **PHP 상수 15줄**(`seedOrg:739` INSERT 에 parent·manager 컬럼 없음) | ABSENT |
| 7 | Legal Entity별 Chain | 대상 부재. Legal Entity 이름·능력 0(유일 히트 `MarketingDataHub.php:181` "한국 법인 철수" = 데모 문자열) · `effectiveScope:258` `'company'` 는 **무제한 센티넬**이지 법인 아님 | ABSENT |
| 8 | Country·Region별 Chain | 대상 부재. ★오탐: `country_code` = TikTok 리포트 차원(`Connectors.php:2044`,`:2071`) · IP Geo(`Geo.php:106`) | ABSENT |
| 9 | Program·Product·Brand별 Chain | 대상 부재. 🔴 `DATA_SCOPES` `brand`/`product` 존재하나 `scopeChannelProduct:319-320` 이 **둘 다 SKU 컬럼에 매핑**(`:312` 자인) → brand 는 독립 차원 아님 | ABSENT |
| 10 | Partner·Channel별 Chain | 대상 부재. 채널 스코프 선례 = `OrderHub.php:261` `scopeChannelProduct` 래퍼 | ABSENT |
| 11 | Effective Date 기준 Chain Version | 대상 부재. 🔴 시점 질의 자체가 전역 0 — `WHERE effective_from <= :as_of` 0 · 읽기 4개소 전부 최신승(`Pnl.php:454` · `KrChannel.php:151`,`:459`) | ABSENT |
| 12 | Template별 Chain | 대상 부재 | ABSENT |
| 13 | Chain Version별 Stage | 대상 부재 | ABSENT |
| 14 | Stage별 Level | 대상 부재 | ABSENT |
| 15 | Route Version별 Node | 대상 부재 | ABSENT |
| 16 | Source Node별 Outgoing Edge | 승인 라우트 부재. 인덱싱 정본 선례 = `Db.php:838` `idx_graph_edge_src ON graph_edge(tenant_id,src_type,src_id)` · `20260526_168_004_create_pm_task_dependencies.sql:13` `idx_pm_dep_pred (predecessor_id)` | ABSENT |
| 17 | Target Node별 Incoming Edge | 승인 라우트 부재. 선례 = `Db.php:839` `idx_graph_edge_dst(tenant_id,dst_type,dst_id)` · `20260526_168_004:14` `idx_pm_dep_succ (successor_id)` | ABSENT |
| 18 | START Node | 대상 부재. START/Terminal 노드 타입 개념 `backend/src` 0 | ABSENT |
| 19 | Terminal Node | 대상 부재 | ABSENT |
| 20 | Branch Node | 대상 부재. 최근접 = `JourneyBuilder` `split` 노드(`:610`) — 인덱스 없이 JSON 내부 파싱 | ABSENT |
| 21 | Merge Node | 대상 부재. Merge 노드 개념 0 | ABSENT |
| 22 | Condition별 Route | 대상 부재. `RuleEngine` 테이블(`:43`)은 규칙 축이며 라우트 역인덱스 아님 | ABSENT |
| 23 | Priority별 Chain | 대상 부재. ★오탐: `source_priority` = 데이터소스 Trust 우선순위(`DataPlatform.php:65`,`:184`) · `sort_order` = INSERT 시 배열 인덱스(`SupplyChain.php:193-199`) | ABSENT |
| 24 | Specificity별 Candidate | 대상 부재. Specificity 개념 0 | ABSENT |
| 25 | Active Override | 대상 부재 | ABSENT |
| 26 | Active Fallback | 대상 부재 | ABSENT |
| 27 | Future-dated Change | 대상 부재. 미래시점 예약 컬럼 0 | ABSENT |
| 28 | Chain Conflict | 대상 부재. 충돌 탐지 자체 0(`nextNode:799` 첫 일치 즉시 return) | ABSENT |
| 29 | Chain Snapshot | 대상 부재 | ABSENT |
| 30 | Reconciliation Mismatch | 대상 부재 | ABSENT |
| 31 | Approval Case별 Chain | 대상 부재. 🔴 승인 4경로 스키마 4종 상이 — `required_approvals`=Mapping 에만 · `requested_by`=`action_request` 에 없음(`Db.php:592-600`) · `tenant_id`=`admin_growth_approval` 에 없음(`AdminGrowth.php:142-149`) → Case↔Chain 조인 축 자체가 미정의 | ABSENT |
| 32 | Workflow Task별 Chain Level | 대상 부재. `journeys` 는 엣지에 id 조차 없음(`JourneyBuilder.php:789`,`:796` `from`+`when` 매칭) → Level 참조 불가 | ABSENT |

### §67. Cache 원칙 (원문 줄 3084-3129 · 분모 36)

🔴 **서버 캐시 계층 자체가 부재**: Redis/Memcached `backend/src` **0**(★오탐: `redis` 유일 히트 = `Payment.php:817` `totalBeforeDisc`) · `apcu_*` 는 `SystemMetrics.php:225-455` **지표 보고 전용**(`:235` `apcu_cache_info` · `:433-434` `apcu_fetch` · `:454-455` `apcu_inc` 요청/에러 카운터) · 프론트 `g_admin_menu_tree_cache` = **localStorage**.
**규칙 7 적용**: 현행이 §67 의 금지 요구(Fail-open 금지 등)를 "위반하지 않는" 것은 **대상이 없어서**다 — 준수로 계산하지 않는다.

#### Chain Resolution Cache Key에 포함할 항목

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | tenant_id | Cache Key 자체 부재(서버 캐시 계층 0). 값 축은 실재(`index.php` `auth_tenant` 주입) | ABSENT |
| 2 | approval_domain | Cache Key 부재 + 값 축도 부재(`approval_domain` 0) | ABSENT |
| 3 | request_type | Cache Key 부재 + 값 축 부재 | ABSENT |
| 4 | resource_type | Cache Key 부재 + 값 축 부재 | ABSENT |
| 5 | transaction_type | Cache Key 부재 + 값 축 부재 | ABSENT |
| 6 | rebate_type | Cache Key 부재 + 값 축 부재 | ABSENT |
| 7 | organization_id | Cache Key 부재 + 값 축 부재(`ORGANIZATION_*` 이름·능력 0) | ABSENT |
| 8 | legal_entity_id | Cache Key 부재 + 값 축 부재 | ABSENT |
| 9 | country | Cache Key 부재. ★오탐: `country_code`(`Connectors.php:2044`)는 TikTok 리포트 차원 | ABSENT |
| 10 | region | Cache Key 부재. ★오탐: `amazon_ads region`(287차) = 광고 API 리전 | ABSENT |
| 11 | program_id | Cache Key 부재 + 값 축 부재 | ABSENT |
| 12 | product_id | Cache Key 부재. 값 축은 SKU 로 실재(`scopeChannelProduct:319-320`) | ABSENT |
| 13 | brand_id | Cache Key 부재. 🔴 값 축 미확립 — `brand` 가 SKU 컬럼에 매핑(`scopeChannelProduct:319-320` · `:312` 자인) | ABSENT |
| 14 | partner_id | Cache Key 부재 + 값 축 부재 | ABSENT |
| 15 | channel_id | Cache Key 부재. 값 축 실재(`OrderHub.php:261`) | ABSENT |
| 16 | amount_band_reference | Cache Key 부재. 🔴 Amount Band 미존재 — `Catalog.php:1016` `HIGH_VALUE_KRW = 5000000.0` **단일 상수**(`:1103-1105`) | ABSENT |
| 17 | risk_band_reference | Cache Key 부재 + Risk Band 0. ★오탐: `hris`→`highRisk` | ABSENT |
| 18 | effective_at 또는 effective version bucket | Cache Key 부재 + 시점 축 0(`WHERE effective_from <= :as_of` 전역 0) | ABSENT |
| 19 | selection_policy_version | Cache Key 부재 + Selection Policy 0 | ABSENT |
| 20 | applicability_version_set_hash | Cache Key 부재 + Applicability 0 | ABSENT |
| 21 | active_override_set_hash | Cache Key 부재 + Override 0 | ABSENT |
| 22 | environment | Cache Key 부재. 환경 판별 선례 = `Db::envLabel()`(278차 트랩) — 캐시 키 미사용 | ABSENT |

#### 적용 항목

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 23 | Version-aware Cache | 캐시 계층 0(Redis/Memcached `backend/src` 0 · `apcu_*` = `SystemMetrics.php:225-455` 지표 전용) + Chain version 0 | ABSENT |
| 24 | Tenant-isolated Cache | 캐시 계층 0. 🔴 프론트 `g_admin_menu_tree_cache` localStorage 는 테넌트 격리 축이 아니라 브라우저 축(286차 `platform_growth` localStorage 고착 사례 참조) | ABSENT |
| 25 | Effective-time-aware Cache | 캐시 계층 0 + 시점 질의 0 | ABSENT |
| 26 | Chain Version 활성화 시 Invalidation | **무효화할 캐시가 없다**(규칙 7 — 준수 아님) | ABSENT |
| 27 | Applicability 변경 시 Invalidation | 무효화 대상 부재 | ABSENT |
| 28 | Priority 변경 시 Invalidation | 무효화 대상 부재 | ABSENT |
| 29 | Override 시작·종료 시 Invalidation | 무효화 대상 부재 | ABSENT |
| 30 | Fallback 변경 시 Invalidation | 무효화 대상 부재 | ABSENT |
| 31 | Organization Binding 변경 시 Invalidation | 무효화 대상 부재 + Organization Binding 0 | ABSENT |
| 32 | Legal Entity Binding 변경 시 Invalidation | 무효화 대상 부재 + Legal Entity 0 | ABSENT |
| 33 | Critical Reconciliation Drift 시 Cache 차단 | 캐시 차단기 0 + Reconciliation 0 | ABSENT |
| 34 | Historical Snapshot을 Current Cache로 재생성 금지 | 강제 수단 부재(캐시 0 · Snapshot 0). 금지 위반이 없는 것은 **대상 부재 때문**(규칙 7) | ABSENT |
| 35 | Stale-while-revalidate는 승인 경로 선택에서 기본 금지 | 강제 수단 부재. SWR 구현 `backend/src` 0 | ABSENT |
| 36 | Fail-open Cache 사용 금지 | 강제 수단 부재. 🔴 **복제 금지 반례가 레포에 실재** — `backend/public/index.php:550` `catch (\Throwable $eRl) { /* fail-open: 가용성 우선 */ }`(레이트리밋) · `UserAuth::requireFeaturePlan:72` fail-open · `TeamPermissions::effectiveScope:256`,`:258` 스코프 미설정/`'company'` → **null(무제한)** | ABSENT |

---

## 2. 설계 계약

### 2.1 §64 — 저장 전략 (후속 구현이 지켜야 할 계약)

**C-64-1 (SoT).** §70 Step 2 확정에 따라 Canonical DAG SoT 후보 3종(`JourneyBuilder`·`graph_node`/`graph_edge`·`pm_task_dependencies`)은 **전량 탈락**했고, §72-18·§6 의 전건이 모두 거짓이므로 **금지가 발동하지 않는다** → `APPROVAL_ROUTE_*` 신규 SoT 구축이 정합.

**C-64-2 (엔티티 9종).** 원문 코드블록(2884-2909)이 지정한 저장 엔티티는 아래 9종이다. **분모 10(불릿)에 포함되지 않으므로 §1 표에 넣지 않았다** — 규칙 3(분모 무단 변경 금지) 준수. 후속 구현은 이 9종을 계약으로 삼는다.

| 엔티티 | 원문 정의 |
|---|---|
| `APPROVAL_CHAIN_DEFINITION` | Chain의 장기 Identity와 Scope |
| `APPROVAL_CHAIN_VERSION` | 특정 시점의 불변 실행 구조 |
| `APPROVAL_STAGE_DEFINITION` | 논리적 승인 구간 |
| `APPROVAL_LEVEL_DEFINITION` | Stage 내부 Actor Source Requirement |
| `APPROVAL_ROUTE_NODE·EDGE` | 실제 경로 DAG |
| `APPROVAL_CHAIN_APPLICABILITY` | 어떤 Request에 적용되는지 |
| `APPROVAL_CHAIN_SELECTION_POLICY` | 여러 Chain 중 선택 방법 |
| `APPROVAL_CHAIN_COMPILATION` | Runtime 최적화 Artifact |
| `APPROVAL_CHAIN_SNAPSHOT` | 승인 당시 Version 고정 |

**C-64-3 (Typed JSON 조건부 요구).** 원문 2925: *"Typed JSON을 사용할 경우 JSON Schema와 Database Reference Integrity를 함께 적용하라."* 이 산문 요구도 분모 불릿이 아니므로 §1 표 외로 둔다. 실측 결론:
- **JSON Schema 검증 수단 0** — `backend/composer.json:6-13` 에 스키마 검증 라이브러리 없음.
- **Database Reference Integrity 사실상 0** — 레포 전체 스키마의 `FOREIGN KEY ... REFERENCES` 는 **`backend/migrations/20260526_168_101_create_menu_tree.sql:21` 단 1건**(`fk_menu_tree_parent` self-FK · `ON DELETE CASCADE`). `backend/src` DDL 의 FK 선언 = **0**.
- 🔴 **SQLite 폴백에서는 FK 가 물리적으로 제거된다** — `Db::sql()` SQLite 분기(`Db.php:186` 이후)의 `:205-234` 가 `CONSTRAINT`/`FOREIGN KEY`/`REFERENCES` 라인을 필터링. → **MySQL/SQLite 이중 백엔드에서 FK 를 무결성 근거로 삼을 수 없다.**
→ **계약**: Typed JSON 채택 시 JSON Schema 검증기 도입 + 참조 무결성은 **애플리케이션 계층 검증으로 명시적 구현**(FK 의존 금지). `JourneyBuilder::createJourney:135` 의 무검증 `json_encode` 를 **복제 금지**.

**C-64-4 (선례 재사용·신설 금지).** 인접 도메인 선례를 **알고리즘·인덱스 설계 차원에서 재사용**하되 **스키마는 복제하지 마라**:
- 엣지 리스트 인덱싱 정본 = `20260526_168_004_create_pm_task_dependencies.sql:12-14`.
- 🔴 `pm_task_dependencies` 의 결함(`Dependencies.php:90-91` `dep_type` 술어 부재)은 **동반 이식 금지**.
- 🔴 `graph_node`(`Db.php:816-824`)의 인덱스·UNIQUE 0 상태를 **복제 금지**.

### 2.2 §65 — API Contract

**C-65-1 (라우팅 규약 — 위반 시 배선이 죽는다).**
- 신규 실배선은 **`/api` 접두 필수**. nginx SPA HTML 폴백이 **가짜 200 착시**를 만든다(핸들러 미배선인데 200).
- 라우트 정본 = `backend/src/routes.php`(1636줄). **핸들러는 자동발견되지 않는다** — `'METHOD /path' => 'Genie\Handlers\Class::method'` 등록 필수.
- `/api/...` 와 `/v{NNN}/...` 2형태 병존(`backend/public/index.php` 가 `Alias /api` 감지 시 `setBasePath('/api')`).
- 공개 엔드포인트를 두려면 `index.php:60-89` 바이패스 목록 **+ `/api/...` 별칭 변형 양쪽** 등록. Chain API 는 **공개 대상이 아니다** — 바이패스 등록 금지.

**C-65-2 (Authorization — 선결 미결).** §65 는 "모든 API에 Authorization 적용"을 요구하나, 현행에는 **"이 행위자가 이 단계를 승인할 권한이 있는가"를 물을 정본 축이 없다**(`$roleRank`(`index.php:554`) ↔ `team_role` 매핑 코드 0 · 판정 축이 HTTP 메서드 `:568`). Chain API 의 Authorization 은 **권한 축 통합이 선결**이다. `acl_permission.approve`(`TeamPermissions::ACTIONS:39`)를 판독 축으로 승격하는 것이 최소 경로이나, 이는 별도 승인세션 대상.

**C-65-3 (자기승인·집행 분리).** `mapping_change_request` 의 4중 방어(`Mapping.php:246-250` 신원 fail-closed · `:268-271` 자기승인 403 · `:278-283` 승인자 dedup · `:287` 정족수)는 레포 최상급 선례이므로 확장 기반으로 삼되, ⚠️ 집행 `apply:296-299` 가 `actorId` 아닌 `actor()`(`:299`)를 쓰는 결함은 **복제 금지**(승인자=집행자 차단 필요).

**C-65-4 (복제 금지 반례).**
- 🔴 `Catalog::approveQueue:2350` — **ids 미지정 시 테넌트 전체 `pending_approval` 일괄 승인**. Chain API 의 승인 엔드포인트는 **대상 명시 필수·전량 기본값 금지**.
- 🔴 `Catalog::approvalCreate:2259` — `evaluatePolicy` 를 **호출조차 않고** 클라이언트 `type` 을 그대로 받아 적재. Chain Selection 은 **서버 산출만** 신뢰.
- 🔴 `Alerting::decideAction:591-595` — **단일 결정 즉시 approved**. Multi-Level 계약 위반.
- 🔴 `JourneyBuilder::nextNode:811-812` — 무라벨 위치 폴백(286차 실장애). **§22 `BLOCK_ON_NO_MATCH` 는 "확립된 의미론"이 아니라 조건부로만 확립** — Approval 이식 시 폴백 분기 절대 복제 금지.
- 🔴 `pickWeighted:729` `if ($total<=0) return $keys[0]` 첫 키 폴백. 단 `pickWeighted:725-734` 의 **결정론적 해시 분배**는 §4.7 "Chain Selection 은 결정론적" 의 선례로 승격 가능.

**C-65-5 (Evidence 최소 형태).** 현행 3종(`Mapping:285` 2키 · `Alerting:591` 3키 · `AdminGrowth` 2컬럼)은 **전부 승인시점 권한/역할/플랜 미보존** → as-of 재구성 불가. Chain API 는 **Actor Authorization Snapshot** 을 Evidence 에 포함해야 한다. 해시 검증 정본 선례 = `SecurityAudit.php:27`,`:45-52`,`:56-68`(`hash_equals`). 🔴 `menu_audit_log.hash_chain` 은 **재구성 불가한 장식** — 인용 금지. ★근거 정정(289차 10회차 ⓔ): 막히는 축은 **`ts` 하나**로, preimage 의 `date('c')`(`AdminMenu.php:195`) 가 **`:199-203` INSERT 컬럼 목록에 `created_at` 이 없어 미저장**(`:129` DB DEFAULT)이다. `prev` 는 `lastHash():216` 이 직전 행 `hash_chain` 을 읽어 공급하므로 **재구성 가능**하다.

**C-65-6 (Rate Limit).** `index.php:515-549` 를 확장하되 🔴 `:550` fail-open 을 **승인 경로에 복제 금지**(§67-36 과 동일 원칙).

**C-65-7 (Idempotency·Optimistic Lock).** 양쪽 다 순수 신규. Idempotency 는 `Paddle.php:343` 의 UNIQUE 제약 기반 가드를 **일반화**하고 `Idempotency-Key` 헤더 계약을 신설. Optimistic Lock 은 `version` 컬럼 + `WHERE version=?` 갱신으로 신설(`ETag` 축은 `EnterpriseAuth.php:431` 이 미지원 자인).

### 2.3 §66 — Index·Performance

**C-66-1.** 32축 전량 대상 테이블 부재이므로 인덱스 설계는 **스키마 신설과 동시 수행**(사후 추가 금지). 마이그레이션 경로가 없으므로(`backend/migrations/` `20260527_172_002` 정지) `ensureTables` 자가치유 + `Db::idx()` 패턴으로 인덱스를 생성한다(`Db.php:838-839` 선례).

**C-66-2 (양방향 엣지 인덱스).** §66-16/17(Source/Target Node별 Edge)은 `Db.php:838-839` + `20260526_168_004:13-14` 의 **양방향 인덱스 정본 선례**를 그대로 따른다. 단 `tenant_id` 를 **선두 컬럼**에 두어야 한다(`graph_edge` 는 준수 · `pm_task_dependencies:13-14` 는 tenant 미포함 → **후자를 복제하지 말고 전자를 따르라**).

**C-66-3 (data_scope UNIQUE 선결).** §66 의 Organization/Legal Entity 축 확장은 🔴 `data_scope UNIQUE(tenant_id,subject_type,subject_id)`(`TeamPermissions.php:164`) **완화가 선결**이며 기존 5개 호출처로 파급된다: `AdPerformance.php:26` · `Wms.php:1291` · `Catalog.php:981`,`:982`,`:983` + `OrderHub.php:261` 래퍼.

**C-66-4 (Db::sql 한계).** `Db::sql()`(`Db.php:177-191`)은 **DDL 전용 번역기**다 — SELECT·CTE 를 번역하지 않는다. §66 최적화를 재귀 CTE 로 설계하면 **SQLite 폴백에서 조회가 죽는다**. 계층 조회는 **인접 리스트 + 애플리케이션 계층 순회**(`Dependencies.php:79-100` 패턴) 또는 **Compilation Artifact 사전 평탄화**로 해결한다.

### 2.4 §67 — Cache 원칙

**C-67-1 (순수 신규).** 서버 캐시 계층 자체가 없다. §67 은 **기존 캐시 교정이 아니라 캐시 계층 신설 시의 설계 계약**으로 읽어야 한다.

**C-67-2 (Fail-open 금지의 실제 무게).** §67-36 은 레포에 **살아 있는 반례 3종**을 겨냥한다: `index.php:550`(레이트리밋 fail-open) · `UserAuth::requireFeaturePlan:72` · `TeamPermissions::effectiveScope:256`,`:258`(무제한 null). Chain Resolution Cache 는 **오류 시 캐시 우회가 아니라 요청 실패**(fail-closed)여야 한다.

**C-67-3 (Cache Key 선결).** Cache Key 22항목 중 **값 축조차 부재**한 것이 다수다(`approval_domain`·`organization_id`·`legal_entity_id`·`program_id`·`partner_id`·`amount_band_reference`·`risk_band_reference`·`selection_policy_version` 등). 캐시 설계는 **§64 엔티티 9종 확정 이후**로 후행한다.

**C-67-4 (apcu 오용 금지).** `apcu_*` 는 현재 `SystemMetrics.php:225-455` 지표 보고 전용이다. Chain Resolution Cache 를 apcu 로 구현하면 **php-fpm 워커별 로컬 캐시**가 되어 §67 의 Invalidation 요구(26-32)를 구조적으로 만족할 수 없다(워커 간 무효화 전파 불가). 데모/운영 별도 pool + 소켓 구성이라 더욱 그렇다.

---

## 3. 미결·선행조건

### 3.1 분모 대조

| 섹션 | 원문 줄 | 분모 | 표 행 수 | 일치 |
|---|---|---|---|---|
| §64 | 2879-2928 | 10 | 10 | ✓ |
| §65 | 2929-3044 | 80 | 80 | ✓ |
| §66 | 3045-3083 | 32 | 32 | ✓ |
| §67 | 3084-3129 | 36 | 36 | ✓ |
| **합계** | | **158** | **158** | ✓ |

§65 내역: Registry·Definition 6 + Version 11 + Template 6 + Stage·Level 6 + Route 11 + Applicability·Selection 7 + Override·Fallback 6 + Resolution 6 + Snapshot·Reconciliation 8 = 67, + "모든 API에 적용" 13 = **80**.
§67 내역: Cache Key 22 + 적용 14 = **36**.

### 3.2 분모 외 원문 요구(표에 넣지 않은 것 — 규칙 3 준수)

§64 는 불릿 10 외에 **코드블록 9 엔티티**(2884-2909)와 **산문 조건부 요구 1건**(2925 Typed JSON → JSON Schema + DB Reference Integrity)을 담고 있다. 분모가 10 이므로 §1 표에 넣지 않고 **§2.1 C-64-2 / C-64-3 으로 전사**했다. §23·§43 과 달리 §64 에는 초과 전사 특례가 부여되지 않았으므로 표 행 수를 10 으로 고정했다. **이 판단이 잘못이면 보고 요망** — 코드블록 9 엔티티를 분모에 포함하면 §64 분모는 19(또는 20)가 된다.

### 3.3 BLOCKED_* 선행조건

| 대상 | 선결 |
|---|---|
| §65-69 Authorization | **권한 축 2벌 분열 해소**(`index.php:554` `$roleRank` ↔ `team_role` 매핑 0 · 판정 축이 HTTP 메서드 `:568`). 별도 승인세션. |
| §66 Organization/Legal Entity 축 | **`data_scope UNIQUE`(`TeamPermissions.php:164`) 완화** + 5개 호출처 파급 검증. |
| §65-63 Historical Reconstruction / §48 Retroactive | **마이그레이션 경로 부재**(`backend/migrations/` 21파일 · `20260527_172_002` 정지 · `ensureTables` 는 테이블 생성만 하고 백필 0). 데이터 이행 수단 신설이 선결. |
| §64 Recursive CTE / §66 계층 조회 | **SQLite 폴백 이식성**(`Db::sql()` 은 DDL 전용). 폴백 폐기 결정 또는 애플리케이션 계층 순회 확정이 선결. |
| §67 전 36항 | **§64 엔티티 9종 확정**이 선결(캐시 키 값 축 다수가 미존재). |

### 3.4 원문 대비 발견

1. **§65 는 Chain API 가 기존 Approval API 와 어떻게 공존하는지 규정하지 않는다.** 레포에는 승인 4경로가 이미 있고 스키마·의미론이 4종 전부 상이하다 — 어느 쪽으로 통합해도 한쪽은 후퇴 아니면 신설(§3.3 "중복 아니라 부재"). §65 를 그대로 신설하면 **5번째 승인 경로**가 된다. §62 `MIGRATE_TO_CANONICAL` 대상 확정이 §65 착수보다 앞서야 한다.
2. **§64 "Recursive CTE" 와 레포의 SQLite 투명 폴백은 양립하지 않는다.** 원문은 "기존 기술 스택에 따라 사용할 수 있다"고 전제하나, 이 레포의 기술 스택은 이중 백엔드다.
3. **§64 "Database Reference Integrity" 는 이 레포에서 사실상 성립 불가**(FK 선언 전체 1건 · SQLite 분기가 FK 제거). 원문이 전제하는 무결성 수단이 레포에 없다.
4. **§67 은 캐시가 존재함을 전제**하나 서버 캐시 계층 자체가 0 이다.

### 3.5 기지 실측 정정·확인

- **확인**: `graph_node`(`Db.php:816-824`) 인덱스·UNIQUE 0 · `graph_edge` 양방향 인덱스 `:838-839` — ⓑ 앵커 정확.
- **확인**: `Db::sql()` DDL 전용(`:177-191`, MySQL 조기반환 `:186`) — ⓑ 앵커 정확.
- **확인**: `index.php:554` `$roleRank` · `:568` HTTP 메서드 판정 축 — ⓑ 앵커 정확.
- **확인**: `TeamPermissions.php:164` `UNIQUE KEY uq_scope (tenant_id, subject_type, subject_id)` — ⓑ 앵커 정확.
- **확인**: Redis/Memcached 0 · `Payment.php:817` `totalBeforeDisc` 오탐 — ⓑ 앵커 정확.
- **확인**: `apcu_*` 범위는 `SystemMetrics.php:225-455`(ⓑ 는 `:225-451` 로 표기 — 실제 마지막 히트는 `:455` `apcu_inc($errKey,...)`). **미세 정정**.
- **확인**: `GraphScore.php:44` `upsertNode` / `:107` `upsertEdge` — ⓑ 표기 `upsertNode:57-59`/`upsertEdge:107-148` 은 본문 줄이며 함수 시그니처는 `:44`/`:107`. 상충 아님.
- **확인**: `backend/migrations/` **21파일** · `pm_task_dependencies` UNIQUE `:12` + 인덱스 `:13-14` — ⓑ 앵커 정확.
- **신규**: 🔴 **레포 전체 스키마의 `FOREIGN KEY ... REFERENCES` 는 `20260526_168_101_create_menu_tree.sql:21` 단 1건**이며 `backend/src` DDL 은 0. `Db::sql()` SQLite 분기(`:205-234`)가 FK 절을 물리 제거. (`Dsar.php:15` 주석이 "Db.php:205-215 가 FK 절을 제거한다"고 서술하나 — 규칙 5 — 정의부 확인 결과 **제거는 SQLite 분기 한정**이다. 주석의 무조건적 서술은 부정확하나, FK 선언이 애초에 1건뿐이라 **결론은 동일**.)
- **신규**: `backend/composer.json:6-13` 에 **JSON Schema 검증 라이브러리 부재**(§64 Typed JSON 조건부 요구 직결).
- **신규**: `index.php:515-549` **레이트리밋 실재**(api_key별 분당 · 429 + Retry-After · 자가치유 `:531-538`) + `:550` fail-open — ⓑ 브리핑에 없던 축.
- **신규**: Pagination 선례 = `AdminMenu.php:679-680`,`:702-704`(`page`/`page_size`/`has_more`) · Correlation ID 선례 = `AdminMenu.php:236-239` `X-Request-Id` — 양쪽 다 **1개 핸들러 한정**.

### 3.6 자진 신고

- **§64 판정의 성격**: §64 불릿 10 은 요구가 아니라 **선택지 제시**("사용할 수 있다")다. 따라서 판정을 "승인 Chain 저장 전략으로서 그 기법이 현행 스택에 제공되는가"로 해석했다. 이 해석에서 PARTIAL 4(Adjacency List·DAG Table·Typed JSON·Policy Engine)는 **기법이 인접 도메인에 실재하나 Chain 도메인 적용 0** 을 뜻하며, **cover 가 아니다**(cover 는 `VALIDATED_LEGACY` 뿐이며 0건). 해석이 다르면 전량 ABSENT 이 되고 결론(Chain 저장 0)은 변하지 않는다.
- **§65-71 Idempotency 를 ABSENT 로 판정**했다. `Paddle.php:343` 웹훅 UNIQUE 가드는 실재하나 (ⓐ)헤더 계약이 아니고 (ⓑ)단일 웹훅 한정이며 (ⓒ)근거가 **주석**이다(규칙 5 — UNIQUE 제약 정의부 미확인). 정의부 확인 시 PARTIAL 로 승격될 수 있다. **약한 앵커.**
- **§65-76/78 을 PARTIAL 로 판정**한 것은 "1개 핸들러 실재"에 근거한다. "모든 API에 적용"이라는 요구 기준으로는 ABSENT 에 가깝다. **경계 판정.**
- `frontend` 의 `g_admin_menu_tree_cache` 는 ⓑ 브리핑 인용이며 **직접 재실증하지 않았다**(이 문서는 backend 축 전사). §67-24 근거로 쓰되 앵커로 승격하지 않았다.
- `Mapping.php`·`Catalog.php`·`Alerting.php`·`AdminGrowth.php`·`JourneyBuilder.php`·`TeamPermissions.php` 의 세부 줄번호는 **ⓑ 전수조사 실측 인용**이며 이 문서에서 전량 재실증하지는 않았다(재실증분 = `Db.php`·`index.php`·`TeamPermissions.php:155-166`·`GraphScore` 시그니처·`Dependencies.php:25-100`·`Gantt.php:100-127`·`migrations/`·`composer.json`·`tools/e2e/`). 상충 발견 시 ⓑ 를 우선 검증하라.
- **스모크·CI 를 실행하지 않았다.** 실행 결과에 근거한 단정 0.
