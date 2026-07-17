# Approval Chain / Stage / Level / Route — Versioning 계층 전사

> EPIC 06-A Part 4-5-3-1-5-3-3-3 · 원문 §10, §14, §16, §19 전사
> 원문 정본: `docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_3_VERBATIM.md`
> 판정 근거: 289차 ⓑ 전수조사(105항목) 실측. 코드 변경 0.

---

## 1. 원문 전사

### §10. Approval Chain Version (원문 줄 735-798 · 분모 50)

`APPROVAL_CHAIN_VERSION` — 필수 필드 34 + 상태 16 = 50.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | approval_chain_version_id | 부재 — `approval_chain` 이름 축 grep 0(§3.5 확정). `backend/src` 전역 히트 0 | ABSENT |
| 2 | approval_chain_definition_id | 부재 — `approval_chain_id` grep 0 | ABSENT |
| 3 | tenant_id | 부재(본 엔티티 기준) — 테넌트 컬럼 관례는 실재하나(`Db.php:944` `api_key.tenant_id` FK 없는 VARCHAR) **Tenant 마스터 테이블 없음**, Chain 도메인 테이블 자체가 0 | ABSENT |
| 4 | version_number | 부재 — `version_number` grep 0(`backend/src` 전역) | ABSENT |
| 5 | previous_version_id | 부재 — `previous_version` grep 0. 레포에 버전 계보(lineage) 컬럼 자체가 없다 | ABSENT |
| 6 | template version reference | 부재 — `template_version`/`approval_chain_template` grep 0 | ABSENT |
| 7 | stage count | 부재 — `approval_stage` grep 0. `stage` 히트는 물류 마일스톤(`SupplyChain.php:50-54`) | ABSENT |
| 8 | level count | 부재 — `approval_level` grep 0 | ABSENT |
| 9 | route node count | 부재 — `node_count` 히트 2건 전량 SQL 별칭(`GraphScore.php:434`,`:454` `node_counts`) = 귀속 그래프 집계 | ABSENT |
| 10 | route edge count | 부재 — `edge_count` 히트 3건 전량 SQL 별칭(`GraphScore.php:434`,`:438`,`:442` `COUNT(*) AS edge_count`) | ABSENT |
| 11 | branch count | 부재 — `branch_count` grep 0 | ABSENT |
| 12 | merge count | 부재 — `merge_count` grep 0. 레포 유일 그래프 분기(`JourneyBuilder::nextNode:799`)는 **첫 일치 즉시 return** = 병합 개념 없음 | ABSENT |
| 13 | root node reference | 부재 — `root_node` grep 0 | ABSENT |
| 14 | terminal node references | 부재 — `terminal_node` grep 0. `Gantt.php:104-122` Kahn 위상정렬이 도달성을 판정하나 PM 태스크 도메인 | ABSENT |
| 15 | minimum chain depth | 부재 — 깊이 컬럼 0. `depth` 히트는 루프 지역변수(`AdminMenu.php:544` `$depth<100` · `PM/Dependencies.php:84`) | ABSENT |
| 16 | maximum chain depth | 부재 — 상동. 저장되는 깊이 축 0 | ABSENT |
| 17 | structure hash | 부재 — `structure_hash` grep 0 | ABSENT |
| 18 | compiled artifact reference | 부재 — `compiled` 히트 2건 전량 리포트 지표 수식 컴파일(`Reports.php:401-402` `compileMetricFormula`) | ABSENT |
| 19 | source version | 부재 — `source_version` grep 0. `source_priority`(`DataPlatform.php:65`,`:184`)는 데이터소스 Trust 우선순위 | ABSENT |
| 20 | affected request types | 부재 — `affected_` grep 0 | ABSENT |
| 21 | affected organizations | 부재 — `ORGANIZATION_*` 이름·능력 양쪽 0(§3.1 확정) | ABSENT |
| 22 | affected legal entities | 부재 — Legal Entity 이름·능력 0. 유일 히트 `MarketingDataHub.php:181` "한국 법인 철수" = 데모 문자열 | ABSENT |
| 23 | affected programs | 부재 — Rebate Program 엔진 grep 0 | ABSENT |
| 24 | affected workflows | 부재 — `workflow_*`/`flow_*`/`wf_*` 이름 축 전량 0(§3.5) | ABSENT |
| 25 | affected active cases | 부재 — 승인 4경로(`mapping_change_request`·`catalog_writeback_job`·`action_request`·`admin_growth_approval`) 어디에도 정의 변경의 영향 케이스를 산출하는 코드 0 | ABSENT |
| 26 | effective_from | 부재(본 엔티티 기준) — 동명 컬럼은 세율 도메인에만(`Db.php:898` `kr_fee_rule.effective_from`) 존재하며 **as-of 질의 0**(읽기 4개소 전부 `ORDER BY effective_from DESC` 최신승 · `Pnl.php:454`·`KrChannel.php:151`,`:459`). Chain 도메인 0 | ABSENT |
| 27 | effective_to | 부재 — **`effective_to` grep 0**(재실증: `backend/src` 전역 히트 0 · `valid_to` 유일 히트 `Onsite.php:396` = `invalid_token` 오염). 레포에 **종료 시점 축이 존재하지 않는다** | ABSENT |
| 28 | recorded_at | 부재(본 엔티티 기준) — 동명 컬럼은 가격 스냅샷에만(`PriceOpt.php:88`) | ABSENT |
| 29 | recorded_by | 부재 — `recorded_by` grep 0 | ABSENT |
| 30 | reviewed_by | 부재 — `reviewed_by` grep 0 | ABSENT |
| 31 | approved_by reference | 부재 — `approved_by` grep 0. 승인 흔적은 각기 다른 형태로만 존재: `approvals_json`(`Mapping.php:285` `["user"=>$actor,"ts"=>…]` 2키) · `Alerting.php:591`(3키) · `AdminGrowth.php` `decided_by`. **어느 것도 Version 엔티티 참조 아님** | ABSENT |
| 32 | immutable_hash | 부재 — **`immutable_hash` grep 0**. 검증 가능한 해시 선례는 `SecurityAudit`뿐(`backend/src/SecurityAudit.php:27` tenant 포함 SHA-256 · `:45-52` DDL(`prev_hash`/`hash_chain`) · **`verify():56-68` `hash_equals` 실 검증기**). Chain 도메인 적용분 0 | ABSENT |
| 33 | status | 부재(본 엔티티 기준) — `SET status *=` 128건/42파일이 실재하나 **합법 전이 집합 선언 0**(#34 State Machine ABSENT) · Chain Version 상태 축 0 | ABSENT |
| 34 | evidence | 부재(본 엔티티 기준) — `evidence_json` 유일 실재는 귀속 신뢰도 근거(`Db.php:809` `attribution_result.evidence_json` · `Attribution.php:379-462`) | ABSENT |
| 35 | DRAFT | 부재(본 엔티티 기준) — `'draft'` 리터럴은 여정(`JourneyBuilder.php:132`)·피드 초안(`FeedTemplate::submitDraft:265-268`) 등 **레코드 상태**이지 Version 생명주기 아님 | ABSENT |
| 36 | VALIDATION_PENDING | 부재 — 검증 대기 상태 0. DAG 검증은 **쓰기 전 동기 차단**(`PM/Dependencies.php:32-34` 422 `cycle_detected`)이라 대기 상태 자체가 없다 | ABSENT |
| 37 | VALIDATION_FAILED | 부재 — 상동. 실패는 422 응답으로 소멸하며 **감사 이벤트도 남지 않는다**(`:32-34` 조기반환 → `:48` `auditLog` 미도달) | ABSENT |
| 38 | REVIEW_PENDING | 부재 — 검토 단계 축 0 | ABSENT |
| 39 | APPROVAL_PENDING | 부재(본 엔티티 기준) — `catalog_writeback_job.status='pending_approval'`(`Catalog.php:2275`)는 **개별 요청**의 승인 대기이지 정의 버전의 승인 대기 아님 | ABSENT |
| 40 | APPROVED | 부재(본 엔티티 기준) — `FeedTemplate::approveDraft:271-274` `transition(…,'submitted','approved')`가 최근접이나 **콘텐츠 초안** 상태 · 승인자 신원 검사 0 | ABSENT |
| 41 | COMPILE_PENDING | 부재 — 컴파일 파이프라인 0 | ABSENT |
| 42 | COMPILE_FAILED | 부재 — 상동 | ABSENT |
| 43 | SCHEDULED | 부재(본 엔티티 기준) — `scheduled_at` 은 캠페인 발송 예약(`KakaoChannel.php:247`) | ABSENT |
| 44 | ACTIVE | 부재(본 엔티티 기준) — `is_active`/`status='active'` 다수이나 버전 활성 축 아님(예: `ml_models.status DEFAULT 'active'` `ModelMonitor.php:36`) | ABSENT |
| 45 | ACTIVE_WITH_WARNINGS | 부재 — 경고 동반 활성 개념 0. 유사 degrade 선례는 `Gantt.php:120-125`(500 아닌 부분결과+경고)이나 **응답 한정·저장 안 됨** | ABSENT |
| 46 | SUPERSEDED | 부재(본 엔티티 기준) — 동명 리터럴 실재하나 **잡 대체** 의미(`Catalog.php:1188` `UPDATE catalog_writeback_job SET status='superseded'` · 판정 제외 `:1873`). 버전 승계 아님 | ABSENT |
| 47 | SUSPENDED | 부재 — `suspended` 승인/버전 히트 0 | ABSENT |
| 48 | RETIRED | 부재 — 은퇴 상태 축 0 | ABSENT |
| 49 | ARCHIVED | 부재 — 보존 상태 축 0 | ABSENT |
| 50 | BLOCKED | 부재 — 차단 상태 축 0 | ABSENT |

### §14. Approval Stage Version (원문 줄 932-956 · 분모 16)

`APPROVAL_STAGE_VERSION` — 필수 필드 16.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | approval_stage_version_id | 부재 — `approval_stage` grep 0. `stage`/`sc_stages` 히트는 물류 마일스톤 체크리스트(`SupplyChain.php:50-54`,`:193-199` · `done TINYINT`=체크박스) | ABSENT |
| 2 | approval_stage_definition_id | 부재 — 상동 | ABSENT |
| 3 | chain version | 부재 — `chain_version` grep 0 | ABSENT |
| 4 | version_number | 부재 — `version_number` grep 0 | ABSENT |
| 5 | previous_version_id | 부재 — `previous_version` grep 0 | ABSENT |
| 6 | category | 부재(본 엔티티 기준) — Stage Category 열거 0 | ABSENT |
| 7 | required state | 부재 — Stage 필수 여부 축 0. `required_approvals` 유일 생산자는 `Mapping.php:209-210` **리터럴 `2`**(+ `Db.php:634` `DEFAULT 2`) = 상수이지 상태 아님 | ABSENT |
| 8 | condition references | 부재(본 엔티티 기준) — 조건 평가 선례는 실재하나 마케팅 도메인: `RuleEngine.php:24`(화이트리스트 `OPS:33` · `compare:433-439` · `eval` 미사용) · `JourneyBuilder::evalCondition:818`. **Stage 참조 0** | ABSENT |
| 9 | level references | 부재 — `approval_level` grep 0 | ABSENT |
| 10 | entry node | 부재 — `entry_node` grep 0 | ABSENT |
| 11 | exit node | 부재 — `exit_node` grep 0 | ABSENT |
| 12 | effective_from | 부재(본 엔티티 기준) — 동명 컬럼은 세율 도메인 한정(`Db.php:898`) · as-of 질의 0 | ABSENT |
| 13 | effective_to | 부재 — `effective_to` grep 0(전역) | ABSENT |
| 14 | immutable_hash | 부재 — `immutable_hash` grep 0. 선례=`SecurityAudit.php:27`·`:56-68` | ABSENT |
| 15 | status | 부재(본 엔티티 기준) — Stage 상태 축 0 | ABSENT |
| 16 | evidence | 부재(본 엔티티 기준) — `evidence_json` 은 귀속 근거 한정(`Db.php:809`) | ABSENT |

### §16. Approval Level Version (원문 줄 1031-1055 · 분모 16)

`APPROVAL_LEVEL_VERSION` — 필수 필드 16.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | approval_level_version_id | 부재 — `approval_level` grep 0(§3.5 이름 축 전량 0) | ABSENT |
| 2 | approval_level_definition_id | 부재 — 상동 | ABSENT |
| 3 | chain version | 부재 — `chain_version` grep 0 | ABSENT |
| 4 | version_number | 부재 — `version_number` grep 0 | ABSENT |
| 5 | previous_version_id | 부재 — `previous_version` grep 0 | ABSENT |
| 6 | actor source type | 부재 — `actor_source` grep 0. 승인 4경로 전량 **"호출자가 곧 승인자"**(§3.3 확정): `Mapping`=미들웨어 통과+제안자 아님+미중복이면 누구나 · `Catalog.php:2343`=`requirePro` 플랜만 · `AdminGrowth.php:1301-1302`=플랜/메뉴 게이트 · `Alerting`=게이트 없음 | ABSENT |
| 7 | resolver reference | 부재 — `resolveApprover`/`next_approver`/`approver_id` **승인 히트 0**. `resolver` 히트는 추천인 해석(`Referral.php:205` `resolveReferrer`). **상급자(사람)를 반환하는 함수 0**(§3.2 확정) | ABSENT |
| 8 | hierarchy depth | 부재 — `hierarchy_depth` grep 0. 사람 축 다단 상향 순회 선례 0(DB 상향순회 유일 사례 `AdminMenu::wouldCycle:540-555` 는 **menu_tree** · `$visited` 없음 · tenant_id 없음) | ABSENT |
| 9 | required actor count | 부재 — `required_actor` grep 0. `required_approvals` 는 `Mapping` 전용 고정 리터럴 `2`(`Mapping.php:209-210`) → **금액 무관 상수** | ABSENT |
| 10 | policies | 부재 — Level 정책 묶음 축 0. `acl_permission` 의 `approve` 동작은 실재하나(`TeamPermissions.php:39` · 시드 `:711`) **읽어서 승인 가부를 판정하는 코드 0** = 완전한 장식 | ABSENT |
| 11 | source version | 부재 — `source_version` grep 0 | ABSENT |
| 12 | effective_from | 부재(본 엔티티 기준) — 세율 도메인 한정(`Db.php:898`) | ABSENT |
| 13 | effective_to | 부재 — `effective_to` grep 0 | ABSENT |
| 14 | immutable_hash | 부재 — `immutable_hash` grep 0. 선례=`SecurityAudit.php:27`·`:56-68` | ABSENT |
| 15 | status | 부재(본 엔티티 기준) — Level 상태 축 0 | ABSENT |
| 16 | evidence | 부재(본 엔티티 기준) — `evidence_json` 은 귀속 근거 한정(`Db.php:809`) | ABSENT |

### §19. Approval Route Version (원문 줄 1116-1142 · 분모 18)

`APPROVAL_ROUTE_VERSION` — 필수 필드 18.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | approval_route_version_id | 부재 — `approval_route`/`route_id` grep 0. **`route` 단독 grep 은 무의미**(SPA URL 오염: `menu_tree.route VARCHAR(255)` `migrations/20260526_168_101_create_menu_tree.sql:10` · `backend/src/routes.php`) | ABSENT |
| 2 | approval_route_definition_id | 부재 — 상동 | ABSENT |
| 3 | chain version | 부재 — `chain_version` grep 0 | ABSENT |
| 4 | version_number | 부재 — `version_number` grep 0 | ABSENT |
| 5 | previous_version_id | 부재 — `previous_version` grep 0 | ABSENT |
| 6 | node count | 부재 — `node_count` 히트는 SQL 별칭(`GraphScore.php:454`) | ABSENT |
| 7 | edge count | 부재 — `edge_count` 히트는 SQL 별칭(`GraphScore.php:434`,`:438`,`:442`) | ABSENT |
| 8 | branch count | 부재 — `branch_count` grep 0 | ABSENT |
| 9 | merge count | 부재 — `merge_count` grep 0 | ABSENT |
| 10 | root node | 부재 — `root_node` grep 0 | ABSENT |
| 11 | terminal nodes | 부재 — `terminal_node` grep 0 | ABSENT |
| 12 | route hash | 부재 — `route_hash` grep 0 | ABSENT |
| 13 | compiled route reference | 부재 — 라우트 컴파일 산출물 0. `compiled` 히트는 지표 수식(`Reports.php:401-402`) | ABSENT |
| 14 | effective_from | 부재(본 엔티티 기준) — 세율 도메인 한정(`Db.php:898`) | ABSENT |
| 15 | effective_to | 부재 — `effective_to` grep 0 | ABSENT |
| 16 | immutable_hash | 부재 — `immutable_hash` grep 0. 선례=`SecurityAudit.php:27`·`:56-68` | ABSENT |
| 17 | status | 부재(본 엔티티 기준) — Route 상태 축 0 | ABSENT |
| 18 | evidence | 부재(본 엔티티 기준) — `evidence_json` 은 귀속 근거 한정(`Db.php:809`) | ABSENT |

---

## 2. 설계 계약

후속 구현이 지켜야 할 계약. **본 세션 코드 변경 0.**

### 2.1 판정 총평 — "중복이 아니라 부재"

배정 4섹션 **100항목 전부 ABSENT**. 이는 §3.5 ⓑ 확정("**이름 축 전량 0**: `approval_chain`·`approval_route`·`approval_level`·`approval_stage`·`step_order`·`route_id`·`approval_chain_id` …")과 정합한다. **버전 계층은 확장할 레거시가 없다** — §72-18 금지("Workflow Engine 과 별도 Route SoT 를 만들지 마라")는 §70 Step 2 확정에 따라 **전건이 거짓이므로 발동하지 않는다**(`JourneyBuilder`·`graph_node`/`graph_edge`·`pm_task_dependencies` 3후보 전부 탈락).

⚠️ **규칙 6 유의**: 위 100 ABSENT 는 "중복 없음"을 뜻하지, "신설이 자유롭다"를 뜻하지 않는다. 아래 2.2~2.5 의 **확장 의무 3건**은 그대로 구속력이 있다.

### 2.2 엔티티 `version` 축 — 레포에 계보가 없다

| 컬럼 | 실측 | 성격 |
|---|---|---|
| `menu_defaults.version` | `AdminMenu.php:309` — INSERT 3번째 인자가 **리터럴 `'baseline'`** | 하드코딩 시드 |
| `ml_models.version` | `ModelMonitor.php:35` `version VARCHAR(50) DEFAULT 'v1.0'` | DEFAULT 시드 |
| `risk_model_registry.model_version` | `Db.php:451` `VARCHAR(100) NOT NULL` | ML 모델 태그 |

**★재실증 결과 — PM 앵커("레포 3컬럼뿐")보다 3개 더 있다**(아래 3.3 정정). 그러나 **결론은 불변**: 6개 전부 **모델/빌드 태그**이며, `version_number`(정수 증분)·`previous_version_id`(계보)·`structure_hash` 는 **전역 grep 0**. → **Optimistic Lock 도 Version Lineage 도 선례 0.** APPROVAL_*_VERSION 은 **순수 신규**이며, 참조할 사내 패턴이 없으므로 스키마 설계 시 기존 컬럼 재사용 유혹(예: `menu_defaults.version` 패턴 답습)을 금지한다.

### 2.3 시점 축(`effective_from`/`effective_to`) — 저장 계층과 질의 계층 둘 다 신설

- `effective_to`/`valid_to`/`valid_from` = **전역 grep 0**(재실증 완료 · 유일 히트 `Onsite.php:396` `invalid_token` = 오염).
- `effective_from` 은 컬럼만 존재(`Db.php:898` `kr_fee_rule`)하고 **`WHERE effective_from <= :as_of` 는 전역 0** — 읽기 4개소 전부 `ORDER BY effective_from DESC` **최신승**(`Pnl.php:454`·`KrChannel.php:151`,`:459`).
- → **계약**: Chain/Stage/Level/Route Version 의 as-of 조회는 반드시 `effective_from <= :as_of AND (effective_to IS NULL OR effective_to > :as_of)` 술어를 **질의 계층에 강제**하라. `ORDER BY … DESC LIMIT 1` 최신승 패턴을 복제하면 §46~§48 이 정의상 불가능해진다.
- 🔴 **§48 Retroactive 집행 수단 부재**: `backend/migrations/` **21파일 · `20260527_172_002` 정지** → 신규 스키마는 마이그레이션 경로가 없고 `ensureTables` 로만 생성된다. **`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다.** 소급 재계산기를 별도로 설계하지 않으면 `effective_from` 컬럼은 §46 을 만족시키지 못한다.

### 2.4 `immutable_hash` — 선례는 하나뿐이며 반례도 하나 있다

- ✅ **정본 선례 = `SecurityAudit`**: `backend/src/SecurityAudit.php:27`(prev + **tenant** + actor + action + details + now → SHA-256) · `:45-52` DDL(`prev_hash CHAR(64)`, `hash_chain CHAR(64)`) · **`verify():56-68` 이 `hash_equals` 로 전 행 재계산**(`:64`). preimage 구성요소가 전부 저장 컬럼이라 **재구성 가능** → 검증기가 성립한다.
- 🔴 **반례 = `menu_audit_log.hash_chain` — 인용 금지**: preimage 가 `'ts'=>date('c')`(`AdminMenu.php:195`)인데 저장은 `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`(`:129`) → **preimage 재구성 불가** · `hash_equals` grep **0**(검증기 없음). **검증 불가능한 장식**이다.
- → **계약**: `immutable_hash` 의 preimage 는 **전부 저장 컬럼**으로 구성하고, **`verify()` 검증기를 같은 커밋에 함께 넣어라**. 검증기 없는 해시 컬럼은 §61 을 만족하지 않는다(2.4 반례가 그 증거).

### 2.5 `structure hash` / `route hash` — 구조 동일성의 정의를 먼저 고정하라

`structure_hash`/`route_hash` grep 0. 신설 시 **정규화 규칙**(노드 정렬 순서·JSON 키 순서·부동소수 표기)을 명세에 못박지 않으면 동일 구조가 서로 다른 해시를 낳는다. 레포의 유일한 유사 선례는 `schema_migrations.checksum`(`Migrate.php:50`)이나 **파일 바이트 해시**라 구조 정규화 선례로 쓸 수 없다.

### 2.6 상태 열거 — "선언된 합법 전이 집합"이 레포에 존재한 적이 없다

§10 의 16 상태를 도입하려면 전이 집합을 **선언**해야 하나, 레포 실측은 반대다:

- `SET status *=` **128건/42파일** · **합법 전이 집합 선언 0**(#34 State Machine ABSENT) · 전이 가드 **최소 8곳**뿐 → 128건 중 대부분 무가드.
- 최근접 선례 `FeedTemplate`(`submitDraft:265-268` → `approveDraft:271-274` → `publishDraft:277-287` 409 `must_approve_first`)조차 **`transition(…, string $from, string $to)`(`:249`)이 전이 쌍을 호출자 인자로 받는다** → 가드는 "현재 status == 넘겨받은 from"만 검사(`:258`). **전이 집합이 3개 메서드 본문에 분산 리터럴로 흩어져 있다.**
- → **계약**: 16 상태는 **단일 상수 배열 + 허용 전이 인접행렬**로 선언하고, 전이 함수는 `from` 을 **인자로 받지 말고 DB 현재값에서 읽어라**. `FeedTemplate` 패턴 복제 금지.

### 2.7 신설 금지 · 확장 의무 (본 4섹션에 걸리는 것)

1. **§39 DAG 검증(§10 #9~#16 counts·depth 산출의 전제)** → **`backend/src/Handlers/PM/Dependencies.php:79-100`**(반복 DFS + `$visited` + **tenant 필터 `:91` 매 홉** + 쓰기 전 차단 `:32-34`) + **`backend/src/Handlers/PM/Gantt.php:104-122`**(**Kahn 위상정렬** + `:119` `count($topo)!==count($taskMap)` 고립 판정). **알고리즘 추출·재사용 · 스키마 복제 금지.** 🔴 `:32-34` 가 422 조기반환하여 `:48` `auditLog` **미도달** → **순환 탐지 시 감사 이벤트 없음**. §10 `VALIDATION_FAILED` 상태를 구현할 때 **이 결함을 복제하지 마라**(위 §14 #37 참조).
   - 🔴 경로 표기: **`backend/src/Handlers/PM/…`**. `backend/src/PM/` 는 **존재하지 않는다**.
2. **§25 Condition 표현식(§14 #8 `condition references`)** → **`RuleEngine`**(`backend/src/Handlers/RuleEngine.php:24` · 화이트리스트 `OPS:33` · `compare:433-439` · **`eval` 미사용**)의 확장. Part 2 Canonical DSL ADR(`docs/architecture/ADR_CANONICAL_SEGMENT_DSL*`)의 연장이지 신규 엔진 아님.
3. **금액 임계** → `Catalog.php:1016` `HIGH_VALUE_KRW = 5000000.0` + `:1103-1105` 를 `APPROVAL_CHAIN_APPLICABILITY` 의 Amount Band 로 승격하고 **상수 은퇴**. 신규 임계 상수 추가 금지.

---

## 3. 미결·선행조건

### 3.1 BLOCKED_PREREQUISITE — 버전 계층은 정의 계층 없이는 착수 불가

§10/§14/§16/§19 는 전부 `*_definition_id` 를 필수 필드로 요구한다. 해당 정의 엔티티(§9 Chain Definition · §13 Stage Definition · §15 Level Definition · §18 Route Definition)는 **본 문서의 배정 밖**이며 레포 실측도 전량 부재다. → **버전 스키마 확정은 정의 스키마 확정 이후.**

추가 선행:

- §16 `actor source type`·`resolver reference` 는 **Manager Resolver 를 전제**하나 §3.2 확정은 **ABSENT(능력 기준)**이며, 더 깊게는 🔴🔴 **`parent_user_id` 가 상급자를 표현할 수 없다** — 전 4 생성경로가 owner 로 하드고정(`UserAuth::createTeamMember:1225-1227` 주석 자인 · `EnterpriseAuth::provisionUser:502` · `UserAuth:1549`,`:1576` · sub 차단 `:1254-1256`). **컬럼 재사용 불가 · 쓰기 경로부터 변경 필요.**
- §10 `approved_by reference`·§14/§16 `status` 는 **승인 권한 판정 축을 전제**하나 §3.4 최대 미결이 미해소: `$roleRank`(`backend/public/index.php:554`) ↔ `team_role`(owner>manager>member) **매핑 코드 전수 0**. **"이 행위자가 이 단계를 승인할 권한이 있는가"를 물을 정본 축이 없다.**

### 3.2 원문 대비 발견 (원문이 전제하나 레포에 없는 것)

1. **§10 `affected active cases` 는 산출 불가**: 정의 변경이 진행 중 케이스에 미치는 영향을 계산하려면 케이스 ↔ Chain Version 참조가 필요하나, 현행 승인 4경로 중 **어느 것도 자신이 어떤 정의로 만들어졌는지 기록하지 않는다**. 원문은 이 역참조가 존재한다고 전제한다.
2. **§10 `merge count` 는 현행 그래프 의미론과 충돌**: `JourneyBuilder::nextNode:799` 는 **첫 일치 즉시 return** 이라 다중 경로 병합 개념 자체가 없고, 다중 일치를 **무탐지·무기록**한다(§72-11 위반이 마케팅 도메인에 실재). Route 에 Merge 를 도입하면 **레포에 선례 없는 신규 의미론**이다.
3. **§10 상태 16종 vs §14/§16/§19 상태 열거 부재 — 원문 내부 비대칭**: §10 만 상태 열거를 명시하고 §14·§16·§19 는 `status` 를 필수 필드로 요구하면서 **허용 값을 열거하지 않는다**. 규칙 8("열거에 없다는 열거가 실재할 때만 유효")에 따라, 하위 3 엔티티의 상태 열거는 **원문에 없으므로 §10 을 복사해 채우지 마라**(날조 위험). 후속 명세가 별도로 확정해야 한다.
4. **§19 `compiled route reference` vs §43 Compilation — 컴파일러가 부재**: 원문은 Compilation 단계(§43 7단계 중 마지막)를 전제하나 레포에 라우트 컴파일 파이프라인이 없고, 유일한 "컴파일" 히트는 리포트 지표 수식(`Reports.php:401-402`)이다.
5. **§10 `evidence`·`immutable_hash` 동시 요구 vs 감사 공백**: `Catalog::approveQueue` 는 **감사 0**(클래스에 audit 함수 자체 부재)이고, `PM/Dependencies` 는 **검증 실패 시 감사 미도달**(`:32-34`). 원문의 evidence 요구를 만족시키려면 **감사 배선부터 신설**해야 한다.

### 3.3 기지 실측 정정 (규율 9에 따른 보고)

🔴 **규율 앵커 "엔티티 `version` = 레포 3컬럼뿐" → 부정확. 최소 6컬럼이다.**

재실증(`^\s*[a-z_]*version[a-z_]*\s+(VARCHAR|INT|…)` 정규식 · `backend/src` 전역):

| 컬럼 | 위치 | 앵커 포함 여부 |
|---|---|---|
| `menu_defaults.version` | `AdminMenu.php:309`(리터럴 `'baseline'`) | ✅ 앵커 |
| `ml_models.version` | `ModelMonitor.php:35` `DEFAULT 'v1.0'` | ✅ 앵커 |
| `risk_model_registry.model_version` | `Db.php:451` | ✅ 앵커 |
| **`risk_prediction.model_version`** | **`Db.php:463`** | ❌ **앵커 누락** |
| **`normalizer_version`** | **`Db.php:1088` `DEFAULT 'v423_rule_v1'`** | ❌ **앵커 누락** |
| **`agent_version`** | **`WmsCctv.php:160` `VARCHAR(32) DEFAULT ''`** | ❌ **앵커 누락** |

**단, 앵커의 결론은 유효하다** — 누락 3건도 전부 **모델/룰셋/에이전트 빌드 태그**이며 계보(`previous_version_id`)·증분(`version_number`)·구조해시가 없다. 판정(전량 ABSENT)에는 영향이 없으나, 후속 문서가 "3컬럼"을 인용하면 오표기가 전파되므로 보고한다.

✅ **재실증하여 앵커와 일치 확인**: `effective_to`/`valid_to`/`valid_from` grep 0 · `immutable_hash` grep 0 · `menu_defaults.version` 리터럴 `'baseline'`(`AdminMenu.php:309`) · `SecurityAudit` 검증기 실재(`:56-68` `hash_equals`) · `menu_audit_log.hash_chain` 검증기 0.

### 3.4 자진 신고

- **§10 상태 16종의 "부재" 판정은 전역 grep 기반**이다. 각 상태 문자열이 **다른 도메인에 동명으로 존재**하는 경우(`draft`·`approved`·`active`·`superseded`·`scheduled`)를 개별 확인해 오염으로 분류했으나, `SUSPENDED`/`RETIRED`/`ARCHIVED`/`BLOCKED` 는 **승인/버전 문맥 히트 0** 만 확인했고 전 도메인 동명 히트를 전수 열거하지는 않았다. 판정(ABSENT)은 불변이나 오염 목록은 완전하지 않을 수 있다.
- **§10 #25 `affected active cases`** 의 "역참조 코드 0" 은 승인 4경로 스키마(ⓑ §3.3 실측)에 근거한 **파생 추론**이다. 4경로 전 컬럼 목록을 본 세션에서 직접 재열람하지는 않았다.
- **§19 #1 `approval_route_version_id`** 의 오염 회피는 규율의 지시(`route` 단독 grep 금지)를 따랐다. `approval_route`/`route_id` 두 패턴만 확인했으며 `rt_`·`path_` 등 축약 명명 변형은 조사하지 않았다.
- **본 문서는 §10·§14·§16·§19 만 전사한다.** §9/§13/§15/§18(정의 계층)·§11/§12(Template)·§17(Stage-Level 관계 원칙)·§20(Route Segment)·§23·§43 특례는 **타 배정분**이다.
