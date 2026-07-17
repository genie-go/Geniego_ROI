# Approval Chain — Security, Guards, Contracts (§55~§61, §68)

> EPIC 06-A Part 4-5-3-1-5-3-3-3 · 원문 §55, §56, §57, §58, §59, §60, §61, §68 전사
> 원문 정본: `docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_3_VERBATIM.md`
> 판정 근거: 289차 ⓑ 전수조사(105항목) 실측 + 본 전사에서 재실증. 코드 변경 0.

## 1. 원문 전사

### §55. Critical Gap 후보 (원문 줄 2497-2536 · 분모 33)

원문 지시: *"다음을 High 또는 Critical로 처리하라."*

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | Active Chain Version 없음 | `APPROVAL_CHAIN*`/`chain_version` grep = **0**(`backend/src`·`backend/public`·`frontend/src`·`tools`·`backend/migrations`) — Chain·Version 축 자체 부재 | ABSENT |
| 2 | 승인된 Chain Version 없음 | Version 승인 상태 컬럼·판독자 0. 승인 4경로 전량 대상이 개별 건이지 정의(Version)가 아님 | ABSENT |
| 3 | Chain Version 없이 Approval Case 생성 | `Mapping.php:209-210` INSERT 11컬럼에 version 축 없음 · `Catalog::approvalCreate:2259` 도 동일 · 검사 대상 개념 부재 | ABSENT |
| 4 | Multiple Applicable Chain 미해결 | 적용성(Applicability) 판정 코드 0. 🔴유사 결함 실재 — `JourneyBuilder::nextNode:799` **첫 일치 즉시 return** → 다중 일치 무탐지·무기록 | ABSENT |
| 5 | 동일 Scope 동일 Priority Chain 충돌 | Scope·Priority 축 0. `Mmm.php:381-382`·`OrderHub.php:1274` `override` 는 스칼라 선행순위(grep 오염) · `DataPlatform.php:65`,`:184` `source_priority` 는 데이터소스 Trust | ABSENT |
| 6 | 동일 Effective Period Version 중복 | `effective_to`/`valid_to`/`valid_from` grep 0 · `kr_fee_rule.effective_from`(`Db.php:898`)은 **컬럼有·as_of 질의無**(읽기 4개소 전량 `ORDER BY effective_from DESC` 최신승) | ABSENT |
| 7 | START Node 없음 | `journeys.nodes`(`JourneyBuilder.php:35-41`)는 `createJourney:135`/`updateJourney:153-154` **무검증 `json_encode`** · START 개념 0 | ABSENT |
| 8 | START Node 여러 개 | 동일 — 노드 역할 열거·중복 검사 0 | ABSENT |
| 9 | Terminal Node 없음 | 동일 — Terminal 판정 코드 0 | ABSENT |
| 10 | Required Node 도달 불가 | 도달성 선례 = `PM/Gantt.php:104-122` **Kahn 위상정렬**(`:119` `count($topo)!==count($taskMap)`) — PM 일정 도메인 한정 · Chain 0 | ABSENT |
| 11 | Required Node에서 Terminal 도달 불가 | 역방향(하류) 도달성 판정 코드 0 · Required 개념 0 | ABSENT |
| 12 | Route Cycle | 순환검증 선례 = `PM/Handlers` `PM/Dependencies.php:79-100` 반복 DFS(+`$visited`·tenant 필터 `:91`·쓰기 전 차단 `:32-34` 422 `cycle_detected`) — `pm_task_dependencies` 한정 · Route 축 0 | ABSENT |
| 13 | Fallback Cycle | Fallback 축 0 — 대상 자체 부재 | ABSENT |
| 14 | Cross-Tenant Node·Edge 참조 | `GraphScore::upsertEdge:107-148` **교차테넌트 검증 0**(`:126-133` 임의 타입 자동삽입) · `journeys` nodes/edges 무검증 | ABSENT |
| 15 | 다른 Chain Version Node 참조 | 버전 축 0 → 참조 무결성 검사 대상 부재 | ABSENT |
| 16 | Active Version 직접 수정 | `updateJourney:153-154` nodes/edges **무검증 덮어쓰기** · optimistic lock `version` 전역 0 · 불변 축 0 | ABSENT |
| 17 | Chain History 덮어쓰기 | 🔴이력 소멸 실사례 = `AgencyPortal.php:304`,`:381` `revoked_at=NULL` 이 이전 해지시각 **물리 소거** · `TeamPermissions.php:495` manager 덮어쓰기(이전 값 소멸) | ABSENT |
| 18 | Chain Snapshot 누락 | 스냅샷 선례 = `AdminMenu.php:119-120` `menu_defaults.snapshot_data` · `PM/Enterprise.php:360` `pm_baseline.snapshot_json` — Chain 도메인 0 | ABSENT |
| 19 | Snapshot Hash 불일치 | 해시 검증기 선례 = `SecurityAudit.php:56-68`(`:64` `hash_equals` 재계산) · Chain 스냅샷 0 | ABSENT |
| 20 | Condition Expression 검증 실패 | `RuleEngine.php:24`·`OPS:33` 화이트리스트·`compare:433-439` switch 실재하나 **승인 조건식 0** · `JourneyBuilder::evalCondition:818`(`compare:848`)은 미추적 신호→false(마케팅 안전측) | ABSENT |
| 21 | 임의 코드 실행 Condition | `eval(`/`create_function`/`system(`/`passthru` `backend/src` **0** — 단 **차단 게이트(lint/CI) 0** 이라 우연한 부재 · 🔴`WmsCctv.php:563-564` `shell_exec`·`:635` `proc_open` 실재 | ABSENT |
| 22 | 특정 현재 Employee ID 하드코딩 | Employee 축 자체 부재(Legal Entity·HRIS 이름·능력 0) · 유사 하드코딩 = `UserAuth::createTeamMember:1225-1227` parent=owner 고정 | ABSENT |
| 23 | Authority Limit를 Chain에 중복 저장 | 금액 임계 = `Catalog.php:1016` `HIGH_VALUE_KRW = 5000000.0` **PHP 상수 1곳**(`:1103-1105` 소비) · Authority Policy 축 0 → 중복될 Chain 자체 부재 | ABSENT |
| 24 | Manager Candidate를 Chain 단계에서 최종 확정 | Manager Resolver **능력 기준 부재** — 상급자(사람)를 반환하는 함수 0 · `parent_user_id` 판독 12+개소 전량 1홉 tenant 해석 또는 `IS NULL` owner 판별 | ABSENT |
| 25 | No Match 시 임의 Chain 선택 | 🔴**동형 결함이 레포에 살아 있다** — `JourneyBuilder::nextNode:811-812` 무라벨 그래프 **위치 폴백**(286차 오발송 실장애 `:801-803` 자인) · `:814` 첫 후보 반환 · `pickWeighted:729` `if($total<=0) return $keys[0]` | ABSENT |
| 26 | Workflow Task와 Chain Level 불일치 | Chain Level 축 0 · Workflow↔승인 드리프트 탐지기 0 | ABSENT |
| 27 | Chain 변경 후 Cache 미무효화 | **서버 캐시 계층 자체 부재** — Redis/Memcached 0 · `apcu_*` = `SystemMetrics.php:225-451` **지표 보고 전용** · 무효화할 캐시가 없음(규칙 7) | ABSENT |
| 28 | Compiled Artifact와 Source Hash 불일치 | 컴파일 산출물 0 · 체크섬 선례 = `Migrate.php:50` `schema_migrations.checksum` | ABSENT |
| 29 | 과거 Approval을 현재 Chain으로 재작성 | 소급 집행 수단 0 — `ensureTables` 는 **DDL 생성만·백필 0** · `backend/migrations/` 21파일 `20260527_172_002` 정지 · approval/chain/route 마이그레이션 0 | ABSENT |
| 30 | Override 승인 근거 누락 | Override 축 0 — 근거 필드·판독자 0 | ABSENT |
| 31 | 무기한 Temporary Override | 한시 위임 축 0 — 최상급 위임 선례 `TeamPermissions::putMemberPermissions:614-661` 도 **정적 grant**(대상·기간·회수 축 0) | ABSENT |
| 32 | Fallback 종료 경로 없음 | Fallback 축 0 | ABSENT |
| 33 | In-flight Impact 미계산 | 변경 영향(진행 중 건) 분석 코드 0 · `APPROVAL_CHAIN_CHANGE_IMPACT` 계열 grep 0 | ABSENT |

---

### §56. 최소 Static Lint (원문 줄 2537-2579 · 분모 36)

원문 지시: *"이번 블록에서 다음을 차단하라."*
CI 실측 정본 = `.github/workflows/deploy.yml` — `verify` job(`:37-75`) **GATE 1~5**: 팬텀 정적자산 `:46`(`tools/check_static_refs.mjs`) · 라우트 등록 정합 + PHP 구문 `:50-51`(`check_routes_registered.mjs`·`check_php_lint.sh`) · rules-of-hooks + **no-undef** `:57`(`check_rules_of_hooks.sh`) · 프로덕션 빌드 `:62` · E2E 스모크 `:75`. `deploy` job 은 `needs: verify`(`:79`). **어느 게이트도 스키마/DAG/승인 정의를 검사하지 않는다.**

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | Tenant 없는 Chain | Chain 엔티티 0 · CI 게이트 5종 중 스키마 린트 0(`deploy.yml:45-75`) | ABSENT |
| 2 | Chain Type 없는 Chain | Chain Type 열거 0 · 린트 0 | ABSENT |
| 3 | Active Version 없는 Active Chain | Active/Version 축 0 · 린트 0 | ABSENT |
| 4 | 승인되지 않은 Version 활성화 | Version 승인 상태 0 · 활성화 경로 0 | ABSENT |
| 5 | Active Version 직접 수정 | 불변 축 0 — `updateJourney:153-154` 무검증 덮어쓰기가 현행 기본 동작 | ABSENT |
| 6 | Stage 없는 Chain | `APPROVAL_STAGE*` grep 0 · `stage`/`sc_stages` 는 물류 마일스톤 체크리스트(`SupplyChain.php:50-54`,`:193-199` · grep 오염) | ABSENT |
| 7 | Required Stage에 Level 없음 | Stage·Level 축 0 | ABSENT |
| 8 | Stage Code 중복 | 동일 — 코드 유일성 제약 0 | ABSENT |
| 9 | Level Code 중복 | `approval_level` 승인 히트 0 | ABSENT |
| 10 | START Node 없음 또는 중복 | 노드 역할 열거 0 · `journeys.nodes` 무검증(`JourneyBuilder.php:135`) | ABSENT |
| 11 | Terminal Node 없음 | 동일 | ABSENT |
| 12 | 존재하지 않는 Node를 참조하는 Edge | `journeys` 엣지에 id 없음(`from`+`when` 매칭 `:789`,`:796`) · `GraphScore::upsertEdge:107-148` 참조 존재 검증 0 | ABSENT |
| 13 | Cross-Tenant Node·Edge | `upsertEdge:107-148` 교차테넌트 검증 0 | ABSENT |
| 14 | 다른 Chain Version Node 참조 | 버전 축 0 | ABSENT |
| 15 | Self-loop | 선례 = `PM/Dependencies.php:29-31` 422 `self_dependency` — pm 도메인 한정·**런타임 가드이지 static lint 아님** | ABSENT |
| 16 | Route Cycle | 선례 = `PM/Dependencies.php:79-100` DFS(쓰기 전 차단 `:32-34`) — **런타임 가드** · CI 정적 검사 0 | ABSENT |
| 17 | 고립 Node | 선례 = `PM/Gantt.php:104-122` Kahn(`:119` 개수 비교로 도달성·고립 동시 판정 · `:120-125` 500 아닌 부분결과+경고 degrade) — PM 한정 | ABSENT |
| 18 | Dead-end Required Node | Required 축 0 · dead-end 판정 0 | ABSENT |
| 19 | Default Edge 충돌 | Default Edge 개념 0 · `nextNode:799` 첫 일치 return | ABSENT |
| 20 | Branch Default 누락 | 🔴반례 실재 — `nextNode:809` `if ($hasLabeled) return ''`(BLOCK_ON_NO_MATCH)은 **라벨 있는 그래프에만** · `:811-812` 무라벨 위치 폴백 존치 | ABSENT |
| 21 | Merge Reference 누락 | Merge 노드 개념 0 — `JourneyBuilder` 는 배타 택일 분기만(`condition:600`→`evalCondition:818` · `split:610`→`pickWeighted:725`) | ABSENT |
| 22 | Condition Schema 누락 | 조건 스키마 선언 0 · `journeys` MEDIUMTEXT(`:36`) 무검증 저장 | ABSENT |
| 23 | Unsafe Expression | `RuleEngine.php` `OPS:33` 화이트리스트가 유일 선례(승인 도메인 미적용) · CI 표현식 린트 0 | ABSENT |
| 24 | Effective Period 역전 | `effective_to`/`valid_from` grep 0 → 역전 검사 대상 부재 | ABSENT |
| 25 | 동일 Scope Active Version 중복 | Scope·Version 축 0 | ABSENT |
| 26 | 동일 Priority Chain 충돌 | Priority 축 0 | ABSENT |
| 27 | Fallback Cycle | Fallback 축 0 | ABSENT |
| 28 | 무기한 Temporary Override | Override 축 0 · 기간 축 0 | ABSENT |
| 29 | 승인 근거 없는 Override | Override 축 0 | ABSENT |
| 30 | 특정 직원 ID 하드코딩 | Employee 축 0 · 하드코딩 탐지 린트 0 · `tools/scan_secrets.sh` 는 **시크릿 스캐너**(직원 ID 대상 아님) | ABSENT |
| 31 | 이름·이메일 기반 Actor Binding | 🔴**현행이 정면 위반** — `Alerting::actor:33-36` `X-User-Email` 헤더 + `?actor=` 쿼리 + `'unknown'` 폴백(위조가능) · 선례 `Mapping::actorId:36-53` 3분기(`apikey:{id}` `:41`/`user:{email}` `:47`/`user:#{id}` `:49`)도 **이메일 문자열 바인딩 잔존** · 차단 린트 0 | ABSENT |
| 32 | Chain 내부 Monetary Authority 중복 정의 | 금액 임계 = `Catalog.php:1016` 상수 1곳 · 중복 탐지 린트 0 | ABSENT |
| 33 | Chain 내부 최종 Candidate 확정 | Candidate 축 0 | ABSENT |
| 34 | 기존 Workflow Chain 중복 생성 | 중복 탐지 린트 0 · 현행 병존 실사례 = Workflow Node·Edge **2종**(`journeys.nodes/edges` `JourneyBuilder.php:35-41` + `graph_node`/`graph_edge` `Db.php:816-839`) | ABSENT |
| 35 | Snapshot 직접 수정 | 스냅샷 불변 강제 0 · `menu_defaults.snapshot_data`(`AdminMenu.php:119-120`) 보호 코드 0 | ABSENT |
| 36 | History 덮어쓰기 | 🔴반례 실재 — `AgencyPortal.php:304`,`:381` `revoked_at=NULL` 소거 · 차단 린트 0 | ABSENT |

---

### §57. 최소 Runtime Guard (원문 줄 2580-2614 · 분모 28)

원문 지시: *"다음을 차단하라."*
전제 실측: `APPROVAL_CHAIN|APPROVAL_ROUTE|APPROVAL_STAGE|APPROVAL_LEVEL` grep = **0건**(`backend/src`·`backend/public`·`frontend/src`·`tools`·`backend/migrations`). 아래 28개 가드는 **전량 미존재**이며, 실측 칸은 각 가드가 대체할 현행 동작(= 차단되지 않는 실경로)을 기록한다.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | APPROVAL_CHAIN_NOT_FOUND | grep 0 · 현행 승인은 Chain 조회 없이 건 단위 처리(`Mapping.php:264`·`Catalog:2341`·`Alerting:572`·`AdminGrowth:1324`) | ABSENT |
| 2 | APPROVAL_CHAIN_VERSION_NOT_FOUND | grep 0 · 버전 축 0 | ABSENT |
| 3 | APPROVAL_CHAIN_VERSION_INACTIVE | grep 0 · 활성 상태 축 0 | ABSENT |
| 4 | APPROVAL_CHAIN_VERSION_UNAPPROVED | grep 0 · 정의 승인 축 0 | ABSENT |
| 5 | APPROVAL_CHAIN_VERSION_IMMUTABLE | grep 0 · `updateJourney:153-154` 무검증 덮어쓰기 | ABSENT |
| 6 | APPROVAL_CHAIN_MULTIPLE_MATCH | grep 0 · `nextNode:799` 첫 일치 즉시 return(다중일치 무탐지) | ABSENT |
| 7 | APPROVAL_CHAIN_NO_MATCH | grep 0 · `nextNode:809` BLOCK_ON_NO_MATCH 은 라벨 그래프 한정 · `:811-812` 위치 폴백 · `:814` 첫 후보 | ABSENT |
| 8 | APPROVAL_CHAIN_SELECTION_CONFLICT | grep 0 · 선택 정책 축 0 | ABSENT |
| 9 | APPROVAL_CHAIN_OUTSIDE_EFFECTIVE_PERIOD | grep 0 · `WHERE effective_from <= :as_of` 전역 0 | ABSENT |
| 10 | APPROVAL_CHAIN_TENANT_MISMATCH | grep 0 · 🔴`AdminGrowth:1324` `WHERE id=?` **tenant 술어 없음** · `admin_growth_approval` 에 `tenant_id` 컬럼 자체 부재(`:142-149`) | ABSENT |
| 11 | APPROVAL_CHAIN_LEGAL_ENTITY_MISMATCH | grep 0 · Legal Entity 이름·능력 0(유일 히트 `MarketingDataHub.php:181` = 데모 문자열) | ABSENT |
| 12 | APPROVAL_CHAIN_ORGANIZATION_MISMATCH | grep 0 · `ORGANIZATION_*` 11종 이름·능력 0 · `team`(`TeamPermissions.php:143-151`) 에 `parent_team_id` 없음 | ABSENT |
| 13 | APPROVAL_CHAIN_VALIDATION_FAILED | grep 0 · 정의 검증 계층 0 | ABSENT |
| 14 | APPROVAL_CHAIN_COMPILATION_FAILED | grep 0 · 컴파일 단계 0 | ABSENT |
| 15 | APPROVAL_CHAIN_ROUTE_INVALID | grep 0 · `route` 단독 grep 은 SPA URL 오염(`menu_tree.route`·`backend/src/routes.php`) | ABSENT |
| 16 | APPROVAL_CHAIN_CYCLE_DETECTED | grep 0 · 인접 선례 `PM/Dependencies.php:32-34` 422 `cycle_detected`(pm 한정). 🔴이 선례는 `:48` `auditLog` 미도달 — **복제 금지** | ABSENT |
| 17 | APPROVAL_CHAIN_UNREACHABLE_NODE | grep 0 · 인접 선례 `PM/Gantt.php:119` | ABSENT |
| 18 | APPROVAL_CHAIN_DEAD_END | grep 0 | ABSENT |
| 19 | APPROVAL_CHAIN_CONDITION_FAILED | grep 0 · `evalCondition:818`/`compare:848`(`if ($a===null) return false`)은 예외 아닌 **무음 false** | ABSENT |
| 20 | APPROVAL_CHAIN_OVERRIDE_INVALID | grep 0 · Override 축 0 | ABSENT |
| 21 | APPROVAL_CHAIN_FALLBACK_EXHAUSTED | grep 0 · Fallback 축 0 | ABSENT |
| 22 | APPROVAL_CHAIN_FALLBACK_CYCLE | grep 0 | ABSENT |
| 23 | APPROVAL_CHAIN_SNAPSHOT_MISSING | grep 0 · Chain 스냅샷 0 | ABSENT |
| 24 | APPROVAL_CHAIN_SNAPSHOT_INVALID | grep 0 · 검증기 선례 `SecurityAudit.php:64` | ABSENT |
| 25 | APPROVAL_CHAIN_CACHE_STALE | grep 0 · 서버 캐시 계층 부재(Redis/Memcached 0) → 대상 없음(규칙 7) | ABSENT |
| 26 | APPROVAL_CHAIN_WORKFLOW_DRIFT | grep 0 · 드리프트 탐지기 0 | ABSENT |
| 27 | APPROVAL_CHAIN_CRITICAL_RECONCILIATION_DRIFT | grep 0 · `reconciliation` 히트는 ROAS 정합(`/api/v423/connectors/roas-reconciliation`) — 승인 무관 | ABSENT |
| 28 | APPROVAL_CHAIN_KILL_SWITCH_ACTIVE | grep 0 · 승인 도메인 킬스위치 0 | ABSENT |

---

### §58. Error Contract (원문 줄 2615-2661 · 분모 42)

전제 실측: 42개 코드 전량 grep **0건**. 아래는 각 코드가 대체할 현행 오류 응답(있으면)을 기록한다.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | APPROVAL_CHAIN_REGISTRY_NOT_FOUND | grep 0 · Registry 축 0 | ABSENT |
| 2 | APPROVAL_CHAIN_DEFINITION_NOT_FOUND | grep 0 | ABSENT |
| 3 | APPROVAL_CHAIN_TYPE_NOT_FOUND | grep 0 | ABSENT |
| 4 | APPROVAL_CHAIN_VERSION_NOT_FOUND | grep 0 | ABSENT |
| 5 | APPROVAL_CHAIN_VERSION_INACTIVE | grep 0 | ABSENT |
| 6 | APPROVAL_CHAIN_VERSION_UNAPPROVED | grep 0 | ABSENT |
| 7 | APPROVAL_CHAIN_VERSION_IMMUTABLE | grep 0 | ABSENT |
| 8 | APPROVAL_CHAIN_TEMPLATE_NOT_FOUND | grep 0 · Template 유사물 = `createJourney:120-125` PHP 리터럴 시드(레지스트리·버전 0) | ABSENT |
| 9 | APPROVAL_CHAIN_TEMPLATE_VERSION_NOT_FOUND | grep 0 | ABSENT |
| 10 | APPROVAL_STAGE_NOT_FOUND | grep 0 | ABSENT |
| 11 | APPROVAL_STAGE_INVALID | grep 0 | ABSENT |
| 12 | APPROVAL_LEVEL_NOT_FOUND | grep 0 | ABSENT |
| 13 | APPROVAL_LEVEL_INVALID | grep 0 | ABSENT |
| 14 | APPROVAL_ROUTE_NOT_FOUND | grep 0 | ABSENT |
| 15 | APPROVAL_ROUTE_VERSION_NOT_FOUND | grep 0 | ABSENT |
| 16 | APPROVAL_ROUTE_NODE_NOT_FOUND | grep 0 | ABSENT |
| 17 | APPROVAL_ROUTE_EDGE_NOT_FOUND | grep 0 · `journeys` 엣지 id 부재(`:789`,`:796` `from`+`when` 매칭) → 참조 실패를 표현할 식별자조차 없음 | ABSENT |
| 18 | APPROVAL_ROUTE_INVALID | grep 0 | ABSENT |
| 19 | APPROVAL_ROUTE_CYCLE | grep 0 · 인접 = `PM/Dependencies.php:33` `'error'=>'cycle_detected'` 422 | ABSENT |
| 20 | APPROVAL_ROUTE_START_INVALID | grep 0 | ABSENT |
| 21 | APPROVAL_ROUTE_TERMINAL_MISSING | grep 0 | ABSENT |
| 22 | APPROVAL_ROUTE_UNREACHABLE_NODE | grep 0 · 인접 = `PM/Gantt.php:120-125` 는 **500 아닌 경고 degrade** | ABSENT |
| 23 | APPROVAL_ROUTE_DEAD_END | grep 0 | ABSENT |
| 24 | APPROVAL_ROUTE_DEFAULT_EDGE_CONFLICT | grep 0 | ABSENT |
| 25 | APPROVAL_ROUTE_BRANCH_INVALID | grep 0 | ABSENT |
| 26 | APPROVAL_ROUTE_MERGE_INVALID | grep 0 · Merge 개념 0 | ABSENT |
| 27 | APPROVAL_ROUTE_CONDITION_INVALID | grep 0 · `Mapping::validateValue:203` 은 400 반환하나 **검증결과 미보존**(`:209-210` INSERT 에 검증 컬럼 없음) | ABSENT |
| 28 | APPROVAL_CHAIN_APPLICABILITY_FAILED | grep 0 · 적용성 판정 0 | ABSENT |
| 29 | APPROVAL_CHAIN_MULTIPLE_MATCH | grep 0 | ABSENT |
| 30 | APPROVAL_CHAIN_NO_MATCH | grep 0 | ABSENT |
| 31 | APPROVAL_CHAIN_PRIORITY_CONFLICT | grep 0 | ABSENT |
| 32 | APPROVAL_CHAIN_SPECIFICITY_CONFLICT | grep 0 | ABSENT |
| 33 | APPROVAL_CHAIN_OVERRIDE_INVALID | grep 0 | ABSENT |
| 34 | APPROVAL_CHAIN_FALLBACK_INVALID | grep 0 | ABSENT |
| 35 | APPROVAL_CHAIN_FALLBACK_EXHAUSTED | grep 0 | ABSENT |
| 36 | APPROVAL_CHAIN_FALLBACK_CYCLE | grep 0 | ABSENT |
| 37 | APPROVAL_CHAIN_EFFECTIVE_PERIOD_INVALID | grep 0 | ABSENT |
| 38 | APPROVAL_CHAIN_COMPILATION_FAILED | grep 0 | ABSENT |
| 39 | APPROVAL_CHAIN_SNAPSHOT_MISSING | grep 0 | ABSENT |
| 40 | APPROVAL_CHAIN_SNAPSHOT_INVALID | grep 0 | ABSENT |
| 41 | APPROVAL_CHAIN_RECONCILIATION_FAILED | grep 0 | ABSENT |
| 42 | APPROVAL_CHAIN_RUNTIME_BLOCKED | grep 0 · 현행 승인 거부 응답 = `Mapping.php:269-271` 403 자기승인 · `:280-282` 409 dedup · `Catalog:2359` 500 · `AdminGrowth:1327` 409 — **코드 체계 없이 자유 문자열** | ABSENT |

---

### §59. Warning Contract (원문 줄 2662-2686 · 분모 20)

전제 실측: 20개 코드 전량 grep **0건**. 레포에 **경고(비차단) 응답 계약 자체가 없다** — 유일 유사 선례 = `PM/Gantt.php:120-125`(위상정렬 실패 시 500 아닌 **부분결과 + 경고** degrade).

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | APPROVAL_CHAIN_REGISTRY_WARNING | grep 0 · 경고 계약 0 | ABSENT |
| 2 | APPROVAL_CHAIN_VERSION_WARNING | grep 0 | ABSENT |
| 3 | APPROVAL_CHAIN_TEMPLATE_WARNING | grep 0 | ABSENT |
| 4 | APPROVAL_STAGE_WARNING | grep 0 | ABSENT |
| 5 | APPROVAL_LEVEL_WARNING | grep 0 | ABSENT |
| 6 | APPROVAL_ROUTE_WARNING | grep 0 · 유사 degrade 선례 `PM/Gantt.php:120-125` | ABSENT |
| 7 | APPROVAL_ROUTE_CONDITION_WARNING | grep 0 · `evalCondition:848` 은 경고 없이 무음 false | ABSENT |
| 8 | APPROVAL_ROUTE_BRANCH_WARNING | grep 0 · `nextNode:811-812` 위치 폴백도 **경고 미발생**(286차 오발송이 무음으로 진행된 이유) | ABSENT |
| 9 | APPROVAL_ROUTE_MERGE_WARNING | grep 0 | ABSENT |
| 10 | APPROVAL_CHAIN_APPLICABILITY_WARNING | grep 0 | ABSENT |
| 11 | APPROVAL_CHAIN_PRIORITY_WARNING | grep 0 | ABSENT |
| 12 | APPROVAL_CHAIN_SPECIFICITY_WARNING | grep 0 | ABSENT |
| 13 | APPROVAL_CHAIN_OVERRIDE_WARNING | grep 0 | ABSENT |
| 14 | APPROVAL_CHAIN_FALLBACK_WARNING | grep 0 | ABSENT |
| 15 | APPROVAL_CHAIN_EFFECTIVE_DATE_WARNING | grep 0 | ABSENT |
| 16 | APPROVAL_CHAIN_COMPILATION_WARNING | grep 0 | ABSENT |
| 17 | APPROVAL_CHAIN_SNAPSHOT_WARNING | grep 0 | ABSENT |
| 18 | APPROVAL_CHAIN_CHANGE_IMPACT_WARNING | grep 0 · 영향 분석 0 | ABSENT |
| 19 | APPROVAL_CHAIN_RECONCILIATION_WARNING | grep 0 | ABSENT |
| 20 | APPROVAL_CHAIN_MANUAL_REVIEW_REQUIRED | grep 0 · 수동 검토 요청 경로 0 | ABSENT |

---

### §60. Evidence Contract (원문 줄 2687-2751 · 분모 53)

원문 `APPROVAL_CHAIN_EVIDENCE` — **필수 필드 43** + **저장 금지 10**.
전제 실측: `APPROVAL_CHAIN_EVIDENCE` grep **0** · 증거 레코드 테이블 0. 현행 승인 증거의 전부 = `approvals_json` **2키**(`Mapping.php:285` `["user"=>$actor,"ts"=>gmdate('c')]`) · **3키**(`Alerting.php:591` `{actor,decision,ts}`) · **2컬럼**(`admin_growth_approval.decided_by`/`decided_at` `AdminGrowth.php:147`).

#### 필수 필드 (원문 줄 2693-2735 · 43)

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | evidence id | 증거 레코드 0 — `approvals_json` 은 배열 원소이지 식별 가능한 행이 아님(`Mapping.php:285`) | ABSENT |
| 2 | tenant | 🔴승인 증거에 tenant 미보존 — `approvals_json` 2키에 없음 · `audit_log` INSERT(`Alerting.php:29`) 4컬럼(`actor,action,details_json,created_at`)에 **tenant 컬럼 없음** · `admin_growth_approval` 에도 없음(`:142-149`) | ABSENT |
| 3 | chain registry | Registry 축 0 | ABSENT |
| 4 | chain definition | 정의 축 0 | ABSENT |
| 5 | chain version | 버전 축 0 | ABSENT |
| 6 | template | Template 축 0 | ABSENT |
| 7 | template version | 동일 | ABSENT |
| 8 | stage | Stage 축 0 | ABSENT |
| 9 | stage version | 동일 | ABSENT |
| 10 | level | Level 축 0 | ABSENT |
| 11 | level version | 동일 | ABSENT |
| 12 | route | Route 축 0 | ABSENT |
| 13 | route version | 동일 | ABSENT |
| 14 | route node | 노드 축 0 | ABSENT |
| 15 | route edge | `journeys` 엣지 id 부재(`JourneyBuilder.php:789`,`:796`) → 증거에 실을 식별자 없음 | ABSENT |
| 16 | condition | `Mapping::validateValue:203` 검증결과 **미보존**(INSERT `:209-210` 에 검증 컬럼 없음) | ABSENT |
| 17 | applicability | 적용성 판정 0 | ABSENT |
| 18 | selection policy | 선택 정책 0 | ABSENT |
| 19 | priority | Priority 축 0 | ABSENT |
| 20 | resolution input | 해석 입력 보존 0 | ABSENT |
| 21 | chain candidate | Candidate 축 0 | ABSENT |
| 22 | resolution result | 해석 결과 보존 0 | ABSENT |
| 23 | compilation | 컴파일 단계 0 | ABSENT |
| 24 | conflict | 충돌 기록 0 · `nextNode:799` 다중일치 무기록 | ABSENT |
| 25 | override | Override 축 0 | ABSENT |
| 26 | fallback | Fallback 축 0 | ABSENT |
| 27 | effective period | `effective_to`/`valid_from` grep 0 | ABSENT |
| 28 | snapshot | Chain 스냅샷 0 | ABSENT |
| 29 | change impact | 영향 분석 0 | ABSENT |
| 30 | reconciliation | 정합 검증 0 | ABSENT |
| 31 | approval request | 🔴`action_request` **`INSERT` 전수 0**(생산자 0) → 요청 레코드가 영원히 비어 있음 · `Db.php:592-600` 컬럼 7종(`requested_by`·`required_approvals` **없음**) | ABSENT |
| 32 | approval case | Case 개념 0 — 현행은 도메인별 건(mapping/writeback/action/growth) 4종 분열 | ABSENT |
| 33 | approval requirement | 🔴`required_approvals` 유일 생산자 = `Mapping.php:210` 리터럴 `2`(+`Db.php:634` `DEFAULT 2`) · UPDATE·설정 API 0 → **요건 모델이 아니라 상수** · `Alerting.php:562` `required_approvals=>2` 는 **컬럼조차 없는 응답 리터럴** | ABSENT |
| 34 | workflow reference | 승인↔워크플로 참조 0 | ABSENT |
| 35 | organization hierarchy version | 조직 계층 이름·능력 0 · 버전 0 | ABSENT |
| 36 | reporting line version | `parent_user_id` 4 생성경로 전량 owner 하드고정(`UserAuth.php:1225-1227`·`EnterpriseAuth.php:502`·`UserAuth:1549`,`:1576`) → 보고선 자체가 1단 평면 · 버전 0 | ABSENT |
| 37 | authority policy reference | Authority Policy 0 · 금액 임계는 `Catalog.php:1016` PHP 상수 | ABSENT |
| 38 | actor resolver reference | Approval Manager Resolver **능력 부재** — 4경로 전량 "호출자가 곧 승인자" | ABSENT |
| 39 | effective_at | as-of 축 0 — 승인시점 권한/역할/플랜 미보존(`approvals_json` 2키) → as-of 질의 불가 | ABSENT |
| 40 | recorded_at | `ts`(`Mapping.php:285` `gmdate('c')`)는 있으나 **effective 와 미분리** — 단일 시각축 | ABSENT |
| 41 | immutable hash | 승인 증거에 해시 0 · 선례 = `SecurityAudit.php:27`(`hash('sha256', prev\|tenant\|actor\|action\|details\|now)`) + `:64` `hash_equals` 검증기 | ABSENT |
| 42 | lineage | 🔴grep 오염 — `lineage` 유일 히트 = `DataPlatform.php:313-345` **데이터소스 계보**(승인 무관) · 승인 계보 0 | ABSENT |
| 43 | audit reference | 승인 감사 = 4경로 중 3(`Mapping:213`,`:291`·`Alerting:597`,`:655`·`AdminGrowth:201`) · 🔴`Catalog::approveQueue:2341-2365` 감사 0 · 증거→감사 참조 링크 0 | ABSENT |

#### 저장 금지 (원문 줄 2739-2748 · 10)

원문 지시: *"다음을 저장하지 마라."* — **증거 저장소 자체가 부재하므로 현행 미위반은 준수가 아니라 "대상 없음"이다(규율 규칙 7).** 금지를 강제하는 필터·검사기는 0.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | Password | 증거 저장소 0 · 최소화 필터 0 — 미위반은 대상 부재에 의한 우연 | ABSENT |
| 2 | Access Token | 동일 · 자격증명 저장은 별도 경로(`ChannelCreds`)이며 증거 계약과 무관 | ABSENT |
| 3 | Credential Secret | 동일 · `tools/scan_secrets.sh` 는 **레포 소스 시크릿 스캐너**이지 런타임 증거 필터 아님 | ABSENT |
| 4 | 불필요한 Employee PII | Employee 축 자체 부재 → 대상 없음 | ABSENT |
| 5 | 전체 HRIS Payload | HRIS 연동 0(`hris` grep = `hig`**hRis**`k` 오염) | ABSENT |
| 6 | 전체 Approval Request 민감 Payload | 🔴반례 소지 — `action_request.action_json` MEDIUMTEXT(`Db.php:597`)·`admin_growth_approval.payload_json`(`AdminGrowth.php:145`)·`catalog_writeback_job.payload` 전량 **원 payload 통째 저장**(필터 0) | ABSENT |
| 7 | Bank Data | 증거 저장소 0 · 필터 0 | ABSENT |
| 8 | Health 정보 | 동일 | ABSENT |
| 9 | 민감 계약 원문 | 동일 | ABSENT |
| 10 | 암호화되지 않은 Secret | 동일 · 증거 계층 암호화 정책 0 | ABSENT |

---

### §61. Audit Event (원문 줄 2752-2796 · 분모 36)

원문 `APPROVAL_CHAIN_AUDIT_EVENT` — 지원 Event 36종. 전량 grep **0**.

**★감사 정본 선례 = `backend/src/SecurityAudit.php`** — `:27` `hash('sha256', $prev.'|'.$tenant.'|'.$actor.'|'.$action.'|'.$dj.'|'.$now)` **tenant 포함 해시** · `:48-51` DDL(`tenant_id`/`prev_hash`/`hash_chain`/`created_at VARCHAR(32)`) · **`verify():56-68` 이 `:63` preimage 재계산 + `:64` `hash_equals`** → **재구성 가능 + 검증기 실재**.
🔴🔴**`menu_audit_log.hash_chain` 은 감사 선례로 인용 금지 — 검증 불가능한 장식이다**: preimage 가 `'ts'=>date('c')`·`'prev'=>$prevHash`(`AdminMenu.php:186-197`)를 포함하나 저장은 `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`(`:129`)이고 **DDL(`:123-131`)에 `prev_hash` 컬럼조차 없다** → **preimage 재구성 물리적 불가** · **`hash_equals` 검증기 0** · **`tenant_id` 컬럼 0**.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | APPROVAL_CHAIN_REGISTRY_CREATED | grep 0 · Registry 축 0 | ABSENT |
| 2 | APPROVAL_CHAIN_DEFINITION_CREATED | grep 0 | ABSENT |
| 3 | APPROVAL_CHAIN_VERSION_CREATED | grep 0 · 버전 축 0 | ABSENT |
| 4 | APPROVAL_CHAIN_TEMPLATE_CREATED | grep 0 · `createJourney:120-125` 시드 복사는 감사 0 | ABSENT |
| 5 | APPROVAL_CHAIN_TEMPLATE_VERSION_CREATED | grep 0 | ABSENT |
| 6 | APPROVAL_STAGE_CREATED | grep 0 | ABSENT |
| 7 | APPROVAL_STAGE_VERSION_CREATED | grep 0 | ABSENT |
| 8 | APPROVAL_LEVEL_CREATED | grep 0 | ABSENT |
| 9 | APPROVAL_LEVEL_VERSION_CREATED | grep 0 | ABSENT |
| 10 | APPROVAL_ROUTE_CREATED | grep 0 | ABSENT |
| 11 | APPROVAL_ROUTE_VERSION_CREATED | grep 0 | ABSENT |
| 12 | APPROVAL_ROUTE_NODE_CREATED | grep 0 · `updateJourney:153-154` 노드 변경 감사 0 | ABSENT |
| 13 | APPROVAL_ROUTE_EDGE_CREATED | grep 0 · `GraphScore::upsertEdge:107-148` 감사 0 | ABSENT |
| 14 | APPROVAL_ROUTE_CONDITION_CREATED | grep 0 | ABSENT |
| 15 | APPROVAL_CHAIN_VALIDATED | grep 0 · 정의 검증 계층 0 | ABSENT |
| 16 | APPROVAL_CHAIN_VALIDATION_FAILED | grep 0 · 🔴복제 금지 선례 — `PM/Dependencies.php:32-34` 는 **422 조기반환**하여 `:48` `auditLog` **미도달** → 순환 탐지 시 감사 이벤트 없음 | ABSENT |
| 17 | APPROVAL_CHAIN_COMPILED | grep 0 | ABSENT |
| 18 | APPROVAL_CHAIN_COMPILATION_FAILED | grep 0 | ABSENT |
| 19 | APPROVAL_CHAIN_ACTIVATED | grep 0 · 활성화 경로 0 | ABSENT |
| 20 | APPROVAL_CHAIN_SELECTION_STARTED | grep 0 | ABSENT |
| 21 | APPROVAL_CHAIN_CANDIDATE_CREATED | grep 0 | ABSENT |
| 22 | APPROVAL_CHAIN_SELECTED | grep 0 | ABSENT |
| 23 | APPROVAL_CHAIN_MULTIPLE_MATCH_DETECTED | grep 0 · `nextNode:799` 첫 일치 return → 다중일치 **무탐지·무기록** | ABSENT |
| 24 | APPROVAL_CHAIN_NO_MATCH_DETECTED | grep 0 · `nextNode:811-812` 위치 폴백이 **무음 진행**(286차 오발송) | ABSENT |
| 25 | APPROVAL_CHAIN_CONFLICT_DETECTED | grep 0 | ABSENT |
| 26 | APPROVAL_CHAIN_OVERRIDE_CREATED | grep 0 | ABSENT |
| 27 | APPROVAL_CHAIN_OVERRIDE_APPLIED | grep 0 | ABSENT |
| 28 | APPROVAL_CHAIN_FALLBACK_APPLIED | grep 0 | ABSENT |
| 29 | APPROVAL_CHAIN_MANUAL_REVIEW_REQUESTED | grep 0 | ABSENT |
| 30 | APPROVAL_CHAIN_SNAPSHOT_CREATED | grep 0 | ABSENT |
| 31 | APPROVAL_CHAIN_CHANGE_IMPACT_DETECTED | grep 0 | ABSENT |
| 32 | APPROVAL_CHAIN_FUTURE_CHANGE_SCHEDULED | grep 0 · 예약 변경 축 0 | ABSENT |
| 33 | APPROVAL_CHAIN_FUTURE_CHANGE_ACTIVATED | grep 0 | ABSENT |
| 34 | APPROVAL_CHAIN_RETROACTIVE_CORRECTION_RECORDED | grep 0 · 소급 정정 수단 0(`ensureTables` = DDL 전용·백필 0) | ABSENT |
| 35 | APPROVAL_CHAIN_DRIFT_DETECTED | grep 0 | ABSENT |
| 36 | APPROVAL_CHAIN_RUNTIME_BLOCKED | grep 0 · 🔴**인가 결정 로그 0** — 403 은 `backend/public/index.php:566`,`:576` `makeJson` 즉시 반환 · `auth_audit_log` 는 **관리행위 로그**이지 인가결정 로그 아님 | ABSENT |

---

### §68. 보안 원칙 (원문 줄 3130-3156 · 분모 18)

원문 지시: *"다음을 강제하라."* (분모 18 = 불릿 18. 산문 1건 *"Chain Definition 관리 권한과 Approval Decision 권한을 동일시하지 마라"*(`:3153`)는 불릿이 아니므로 표에 넣지 않고 §2 계약에 전사한다.)

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | Tenant-scoped Query | `backend/public/index.php:600` 인증 키의 `tenant_id` 로 `X-Tenant-Id` **무조건 덮어쓰기**(위조 원천 차단·REAL) · 🔴그러나 `admin_growth_approval` 에 `tenant_id` 컬럼 **부재**(`AdminGrowth.php:142-149`)·조회 `:1324` `WHERE id=?` **tenant 술어 없음** · `audit_log` INSERT(`Alerting.php:29`) 에 tenant 컬럼 없음 | PARTIAL |
| 2 | Cross-Tenant Reference Block | `index.php:595-600` 헤더 위조 차단 · `Alerting::decideAction:582` IDOR 방어(tenant 술어) · `Mapping.php:288-289` UPDATE tenant 술어 · 🔴엔티티 간 교차참조 검증(FK/검증기) 0 — `GraphScore::upsertEdge:107-148` 무검증 · `api_key.tenant_id` **FK 없는 VARCHAR**(`Db.php:944`) | PARTIAL |
| 3 | Platform Template Read-only | Template 축 0 — `createJourney:120-125` `$defaultNodes`/`$defaultEdges` = PHP 리터럴 시드 1회 복사(레지스트리·버전·읽기전용 보호 전무) | ABSENT |
| 4 | Tenant Override Authorization | Override 축 0 · `override` grep 은 스칼라 선행순위 오염(`Mmm.php:381-382`) | ABSENT |
| 5 | Case-specific Override 강화 Authorization | 건별(case) 권한 축 0 · 최상급 위임 선례 `TeamPermissions::putMemberPermissions:614-661` 도 정적 grant(대상·기간·회수 0) | ABSENT |
| 6 | Retroactive Correction 강화 Authorization | 소급 정정 경로 0 · `ensureTables` DDL 전용(백필 0) · `backend/migrations/` `20260527_172_002` 정지 | ABSENT |
| 7 | Chain Activation Separation of Duties Reference | SoD 실선례 = `Mapping.php:268-271` 자기승인 403 — **4경로 중 1곳뿐** · 🔴`action_request` 는 `requested_by` 컬럼 부재(`Db.php:592-600`)로 **자기승인 차단 구조적 불가** · `AdminGrowth:1324-1331` 은 `requested_by`/`decided_by` 양쪽 있는데 **비교 코드 0** · Chain Activation 축 0 | ABSENT |
| 8 | Active Version 수정 차단 | optimistic lock `version` 전역 0 · `menu_defaults.version` = 리터럴 `'baseline'`(`AdminMenu.php:309`) · `updateJourney:153-154` 무검증 덮어쓰기 | ABSENT |
| 9 | Evidence·Snapshot 변조 차단 | 선례 = `SecurityAudit.php:27` tenant 포함 해시 + `:64` `hash_equals` 검증기(**정본**) · 🔴`menu_audit_log`(`AdminMenu.php:123-131`,`:195`)는 preimage 재구성 불가·검증기 0 = 장식 · Chain Evidence·Snapshot 0 | ABSENT |
| 10 | Unsafe Expression 차단 | `RuleEngine.php:24`·`OPS:33` 화이트리스트 + `compare:433-439` switch(`eval` 미사용) = 유일 선례이나 **승인 도메인 미적용** · 표현식 린트/CI 게이트 0 | ABSENT |
| 11 | Arbitrary Code Execution 차단 | `eval(`/`create_function`/`system(`/`passthru` `backend/src` **0** — 단 **차단 게이트 0**(CI 5게이트에 없음) 이라 우연한 부재(규칙 7) · 🔴`WmsCctv.php:563-564` `shell_exec`·`:635` `proc_open(['/bin/sh','-c',$cmd],…)` 실재 | ABSENT |
| 12 | Fixed Subject Reference 최소화 | 최소화 정책·검사기 0 · 🔴반례 = `UserAuth::createTeamMember:1225-1227` parent=owner **하드고정**(주석 자인) · `EnterpriseAuth::provisionUser:502` 동일 | ABSENT |
| 13 | Sensitive Request Attribute 최소 저장 | 최소화 필터 0 · 🔴반례 = `action_request.action_json`(`Db.php:597`)·`admin_growth_approval.payload_json`(`AdminGrowth.php:145`)·`catalog_writeback_job.payload` 전량 원 payload 통째 저장 | ABSENT |
| 14 | Audit Event 강제 | 승인 4경로 중 **3곳**(`Mapping.php:213`,`:291` · `Alerting.php:597`,`:655` · `AdminGrowth.php:201`) · 🔴`Catalog::approveQueue:2341-2365` **감사 0**(클래스에 audit 함수 자체 부재) · 🔴`PM/Dependencies.php:32-34` 422 조기반환 → `:48` `auditLog` 미도달 · 강제 미들웨어 0 · `SecurityAudit::log:32` 는 best-effort(실패 무시) | PARTIAL |
| 15 | Authorization Decision 기록 | 🔴**0** — 403 은 `index.php:566`(`admin:keys`)·`:576`(write) `makeJson` **즉시 반환**, 기록 없음 → 인가 결정이 관측 불가 · `auth_audit_log` 는 관리행위 로그 | ABSENT |
| 16 | Rate Limit | `index.php:508-551` API 키 단위 **고정 1분 윈도우**(`api_rate_limit` upsert `:520-527` · 기본 1200/min `:513` · 429 `:544-549`) · 🔴**fail-open**(`:550` `catch → 무시`, 주석 `:508`,`:511` 자인) · 🔴주석 `:509-510` + 코드 위치가 자인: **api_key 프로그래매틱 트래픽만** — SPA/세션 게이트 경로는 상위에서 return 되어 **미도달** | PARTIAL |
| 17 | Idempotency | `Idempotency-Key` 헤더 처리 **0** · 유일 유사 = `Paddle.php:343` `notification_id` UNIQUE(웹훅 한정) · 승인 경로 멱등키 0 — `Catalog::approveQueue` 재호출 시 중복 집행 방어 없음 | ABSENT |
| 18 | Replay Protection Reference | 승인/Chain 경로 0 · 유사 = `Paddle.php:1067` 5분 윈도우 리플레이 가드(웹훅 한정) · `PixelTracking.php:212`,`:255` `INSERT IGNORE` event_id(픽셀 한정) | ABSENT |

---

## 2. 설계 계약

후속 구현이 지켜야 할 계약(코드 아님).

### C-1. 감사 선례는 `SecurityAudit` 하나다
- `APPROVAL_CHAIN_AUDIT_EVENT`(§61) 의 해시체인은 **`backend/src/SecurityAudit.php` 를 확장**한다. 필수 계승: ① preimage 에 **tenant 포함**(`:27`) ② 시각을 **애플리케이션이 산출해 컬럼에 저장**(`:24` `gmdate` → `:51` `created_at VARCHAR(32)`) — DB `DEFAULT CURRENT_TIMESTAMP` 금지 ③ **`prev_hash` 컬럼 저장**(`:51`) ④ **`verify()` 검증기 동봉**(`:56-68` · `hash_equals` `:64`).
- **`menu_audit_log` 패턴 복제 금지**: preimage 에 `'ts'`/`'prev'` 를 넣고 컬럼으로는 저장하지 않으면(`AdminMenu.php:186-197` vs `:123-131`) 해시는 영원히 재계산 불가한 장식이 된다. 289차 문서 다수가 이를 선례로 오인용했다 — ⓔ 정정 대상.
- `SecurityAudit::log:32` 의 best-effort(감사 실패가 원 액션 비차단)는 **가용성 선택**이다. §68-14 *"Audit Event 강제"* 를 만족하려면 승인 경로에서는 **감사 실패 = 승인 실패(fail-closed)** 로 계약을 뒤집어야 한다. 이 반전은 별도 승인세션 사안.

### C-2. 에러 반환과 감사 기록의 순서 (§58 × §61)
`PM/Dependencies.php` 의 결함을 복제하지 마라: `:32-34` 가 422 `cycle_detected` 로 **조기반환**하여 `:48` `auditLog` 에 도달하지 못한다 → **순환 탐지라는 가장 중요한 사건이 감사에 남지 않는다**.
계약: **거부 응답 생성 전에 감사 이벤트를 기록한다.** §57/§58 의 모든 차단 코드(`APPROVAL_CHAIN_CYCLE_DETECTED`·`APPROVAL_CHAIN_VALIDATION_FAILED`·`APPROVAL_CHAIN_RUNTIME_BLOCKED` …)는 §61 의 대응 이벤트(`APPROVAL_CHAIN_VALIDATION_FAILED`·`APPROVAL_CHAIN_RUNTIME_BLOCKED`)와 **1:1로 짝지어 기록된 뒤에만** 반환된다.

### C-3. 인가 결정 기록 (§68-15)
403 을 `makeJson` 으로 즉시 반환하는 현행(`index.php:566`,`:576`)은 **인가 결정을 관측 불가능하게 만든다**. Chain 도메인의 모든 인가 판정(허용/거부 양쪽)은 `APPROVAL_CHAIN_AUDIT_EVENT` 로 기록한다. `auth_audit_log` 를 재사용하지 마라 — 그것은 관리행위 로그이지 인가결정 로그가 아니다.

### C-4. Actor Binding (§56-31)
`Alerting::actor:33-36`(`X-User-Email` 헤더 + `?actor=` 쿼리 + `'unknown'` 폴백) 패턴을 **절대 복제하지 마라** — 위조 가능하다. 위조불가 선례 = `Mapping::actorId:36-53` 3분기(`apikey:{id}` `:41` / `user:{email}` `:47` / `user:#{id}` `:49`), 미확인 → **null → 403(fail-closed)**.
⚠️ 단 `Mapping::actorId` 도 완전하지 않다: **경로 전환 시 actor 문자열이 달라져**(같은 사람이 API 키로 제안하고 세션으로 승인하면 `apikey:12` vs `user:a@b.c`) dedup·자기승인 차단이 우회될 수 있다. 실 경합은 미검증(등급 미부여). Chain 설계에서는 **actor 를 문자열이 아니라 안정적 subject id 로 정규화**한다.
또한 §56-31 이 *"이름·이메일 기반 Actor Binding"* 을 금지하므로 `user:{email}` 분기(`:47`)도 Chain 도메인에서는 **`user:#{id}` 로 통일**한다.

### C-5. Evidence 는 투영이 아니라 저장이다 (§60)
현행 반례:
- `Alerting.php:564-565` `dry_run_diff`·`rollback_plan` — `action_json` 에서 읽어 응답에 투영하나 **`INSERT INTO action_request` 생산자 전수 0** → 항상 null → **VACUOUS**. (※ 두 필드는 §60 원문 필수 필드 목록에 없다. 여기 기록하는 이유는 "필드를 응답에 그리면 계약이 성립한 것처럼 보인다"는 실패 양식의 표본이기 때문이다.)
- `Alerting.php:562` `required_approvals => 2` — **컬럼조차 없는 응답 리터럴**(`Db.php:592-600`).
- `Mapping::validateValue:203` — 검증 결과가 400 게이트로만 쓰이고 **INSERT(`:209-210`)에 보존되지 않는다** → 사후에 "무엇이 검증됐는가"를 물을 수 없다.
계약: `APPROVAL_CHAIN_EVIDENCE` 의 43개 필수 필드는 **응답 필드가 아니라 저장 컬럼/키**다. 생산자 없는 필드는 계약에 넣지 않는다.

### C-6. 기본 동작이 전량 승인이면 안 된다 (§55-25, §57)
🔴 `Catalog::approveQueue:2341-2365` — `ids` 미지정 시 `where = "tenant_id=? AND status='pending_approval'"`(`:2350`)만으로 **테넌트 전체 pending 을 일괄 승인**한다(docblock `:2338` 자인). 행위자도 판독하지 않는다(`:2343` `requirePro` 플랜 게이트뿐). Chain 집행은 **대상 명시 필수 · 미지정 = 422**.

### C-7. 정책 게이트를 응답에만 실지 마라 (§55-23, §60-33)
🔴 `Catalog::logJob:2247` 이 `evaluatePolicy`(`:2245`) 산출 `approval_type` 을 **저장하지 않고** `:2252` 응답에만 싣는다. 더 나아가 `approvalCreate:2259` 는 **`evaluatePolicy` 를 호출조차 하지 않고** 클라이언트가 보낸 `type`(`:2265`)을 그대로 수용해 `pending_approval` 을 적재한다(`:2275`) → **정책 게이트 우회**.
계약: Applicability/Selection 결과는 **Case 레코드에 저장**되며, 클라이언트가 보낸 chain/type/level 은 **입력이 아니라 검증 대상**이다.

### C-8. §55-23 Authority Limit 의 단일 소재
금액 임계의 유일 실 구현 = `Catalog.php:1016` `HIGH_VALUE_KRW = 5000000.0` + `:1103-1105`(`$price >= HIGH_VALUE_KRW` → `requires_approval=true`·`approval_type='high_value'`). 이를 `APPROVAL_CHAIN_APPLICABILITY` 의 Amount Band 로 **승격하고 상수는 은퇴**한다. **신규 임계 상수 추가 금지** — 추가하는 순간 §55-23(Authority Limit 중복 저장)이 발동한다.
현행 `required_approvals` 는 **금액 무관 고정 상수 2**(`Mapping.php:210` 유일 생산자 + `Db.php:634` `DEFAULT 2`) — 1만원 매핑과 1억원 예산이 동일 승인 강도다. 이것이 §60-33 `approval requirement` 가 ABSENT 인 이유다.

### C-9. §68 산문 (원문 `:3153`)
> **"Chain Definition 관리 권한과 Approval Decision 권한을 동일시하지 마라."**

현행 반례: 4경로 전량이 **"호출자가 곧 승인자"** 다 — `Mapping` = 미들웨어 통과 + 제안자 아님 + 미중복이면 누구나 · `Catalog:2343` = `requirePro` 플랜만 · `AdminGrowth:1301-1302` = `requirePlan('admin')` + `requireSubAdminMenu` · `Alerting` = **게이트 없음**.
권한 축을 물을 정본도 없다: `$roleRank`(`index.php:554` `viewer<connector<analyst<admin`) ↔ `team_role`(owner>manager>member) **매핑 코드 전수 0**. `$roleRank` 의 판정 축은 **HTTP 메서드**(`:568`)이지 조직 역할이 아니다 — "무엇을 하는가"만 묻고 "누구인가"를 묻지 않는다.
🔴 `acl_permission.approve` 는 **완전한 장식**이다: `TeamPermissions::ACTIONS:39` 에 실재하고 `seedOrg:708`,`:711`,`:714`,`:716`,`:717` 이 실제 시드하지만 **`approve` 를 읽어 승인 가부를 판정하는 코드 0**(유일 소비 `actionsCover:194`→`:639` 는 **위임 상한 검증**). Chain Definition 권한과 Decision 권한의 분리는 **먼저 `approve` 를 판독하는 코드가 생겨야** 성립한다.

### C-10. 무음 폴백 복제 금지 (§55-25, §57-7, §59-8)
- `TeamPermissions.php:342` `if (!in_array($stype, self::DATA_SCOPES, true)) $stype = 'own';` — **무음 강등**
- `TeamPermissions::normActions:186` — 미허용 action **무음 드롭**
- `JourneyBuilder::nextNode:811-812` — 무라벨 그래프 **위치 폴백**(286차 오발송 실장애 `:801-803`) · `:814` 첫 후보 반환
- `JourneyBuilder::pickWeighted:729` `if ($total<=0) return $keys[0]` — **첫 키 폴백**
전부 **422 fail-closed + §59 경고 이벤트**로 대체한다. 특히 §22 `BLOCK_ON_NO_MATCH` 는 **"확립된 의미론"이 아니라 라벨 있는 그래프에만 조건부로 확립**되어 있다 — Approval 이식 시 무라벨 폴백 분기를 절대 복제하지 마라.

### C-11. Rate Limit·Idempotency 는 신규다 (§68-16,17,18)
`index.php:508-551` 레이트리밋은 **API 키 단위 · fail-open · SPA/세션 경로 미도달**이다(주석 `:509-511` 자인). 승인 결정은 대부분 세션 경로로 들어오므로 **현행 레이트리밋이 승인 경로를 전혀 보호하지 않는다**. Chain 도메인은 별도 계층이 필요하며, **fail-open 을 복제해서는 안 된다**(§67 *"Fail-open Cache 사용 금지"* 와 동일 취지).
Idempotency 도 순수 신규다 — `Idempotency-Key` 처리 0. `Catalog::approveQueue` 는 재호출 시 중복 집행 방어가 없다.

### C-12. Static Lint 부착 지점 (§56)
CI 실재 = `.github/workflows/deploy.yml` `verify` job(`:37-75`) GATE 1~5, `deploy` 는 `needs: verify`(`:79`). §56 의 36개 린트는 **GATE 2 옆에 신규 게이트로 부착**하는 것이 정합이다(GATE 2 가 이미 `check_routes_registered.mjs` + `check_php_lint.sh` 로 백엔드 정합을 본다).
- 🔴 **CI 배포는 inert** — 시크릿 미등록으로 `HAS_SSH_SECRETS` 등이 false → CI 는 사실상 **빌드/검증만** 하고 실제 배포는 수동 `pscp`/`plink` 다. **린트를 CI 에만 걸면 배포된 산출물은 검사되지 않는다** — 린트는 CI + 로컬 `deploy.ps1` 양쪽에 걸어야 실효가 있다.
- 기존 자산 재사용: **no-undef 게이트**(280차 · `tools/check_rules_of_hooks.sh` `:57`) · **`tools/scan_secrets.sh`**(289차 ④ SSOT · §56-30 의 "직원 ID 하드코딩"은 대상이 달라 **재사용 불가**).
- ★**283차 트랩: raw NUL 이 ripgrep 을 실명시킨다** — 정적 스캐너를 새로 쓸 때 바이너리/NUL 포함 파일에서 무음 0건이 나올 수 있다. 린트가 0건을 반환하면 **"위반 없음"이 아니라 "스캐너가 죽었을 수 있음"** 으로 다뤄라(§56 전체가 fail-closed 여야 하는 이유).

---

## 3. 미결·선행조건

### 3.1 분모 대조 — 전 섹션 일치

| § | 제목 | 원문 줄 | 분모 | 본 문서 행 수 | 일치 |
|---|---|---|---|---|---|
| 55 | Critical Gap 후보 | 2497-2536 | 33 | 33 | ✅ |
| 56 | 최소 Static Lint | 2537-2579 | 36 | 36 | ✅ |
| 57 | 최소 Runtime Guard | 2580-2614 | 28 | 28 | ✅ |
| 58 | Error Contract | 2615-2661 | 42 | 42 | ✅ |
| 59 | Warning Contract | 2662-2686 | 20 | 20 | ✅ |
| 60 | Evidence Contract | 2687-2751 | 53 | 43 + 10 = 53 | ✅ |
| 61 | Audit Event | 2752-2796 | 36 | 36 | ✅ |
| 68 | 보안 원칙 | 3130-3156 | 18 | 18 | ✅ |
| **계** | | | **266** | **266** | ✅ |

§68 의 산문 1건(`:3153`)은 불릿이 아니므로 표에 넣지 않고 §2 C-9 에 전사했다(분모 18 유지).
§60 은 원문이 *"필수 필드"*(43)와 *"저장하지 마라"*(10)로 나뉘어 있어 표를 두 개로 분할했다 — 합계 53 으로 분모와 일치한다.

### 3.2 판정 분포

- **REAL 0 · VALIDATED_LEGACY 0** — 즉 **커버 0건**.
- PARTIAL 4(§68-1 Tenant-scoped Query · §68-2 Cross-Tenant Reference Block · §68-14 Audit Event 강제 · §68-16 Rate Limit)
- ABSENT 262

§55~§61(248항목)이 전량 ABSENT 인 이유는 단순하다: **`APPROVAL_CHAIN|APPROVAL_ROUTE|APPROVAL_STAGE|APPROVAL_LEVEL` grep 0건 · `chain_registry|chain_version|route_node|route_edge|chain_definition|chain_template` grep 0건** — 계약이 기술할 도메인 자체가 레포에 없다. 이는 §70 Step 2 결론(Canonical DAG SoT 후보 3종 전부 탈락 → `APPROVAL_ROUTE_*` 신규 SoT 구축이 정합)과 정합한다.

### 3.3 BLOCKED — 선행조건

| 항목 | 사유 |
|---|---|
| §68-7 Chain Activation SoD | **BLOCKED_PREREQUISITE** — 권한 축 2벌 분열(`$roleRank` ↔ `team_role` 매핑 코드 전수 0)이 해소되어야 "이 행위자가 이 단계를 승인할 권한이 있는가"를 물을 수 있다. `acl_permission.approve` 판독자 0 도 선결. |
| §60-36 reporting line version | **BLOCKED_PREREQUISITE** — `parent_user_id` 는 상급자를 표현할 수 없다(4 생성경로 전량 owner 하드고정). **쓰기 경로부터 변경**해야 하며 컬럼 재사용 불가. |
| §60-38 actor resolver reference | **BLOCKED_PREREQUISITE** — Approval Manager Resolver 능력 부재(상급자 반환 함수 0). |
| §55-29 / §61-34 소급 정정 | **BLOCKED_PREREQUISITE** — `ensureTables` 는 DDL 생성만 하고 백필하지 않는다 · `backend/migrations/` 는 `20260527_172_002` 에서 정지 → **소급 집행 수단 자체가 없다**. |
| §68-14 Audit Event 강제(fail-closed 반전) | **BLOCKED_PREREQUISITE** — `SecurityAudit::log:32` 의 best-effort 계약을 뒤집는 것은 가용성 정책 변경이다. 별도 승인세션. |
| §68-11 Arbitrary Code Execution 차단 | `WmsCctv.php:563-564`,`:635` 의 `shell_exec`/`proc_open` 은 CCTV 도메인의 기존 기능이다. Chain 도메인 린트는 **`backend/src/Handlers/**` 신규 코드 대상 화이트리스트 방식**으로 한정해야 무후퇴다. |

### 3.4 원문 대비 발견 (원문이 전제하나 레포에 없는 것 / 원문 자체의 특성)

1. **§57 이 "차단하라"고 하나 28개 항목은 전부 에러 코드명이다.** 원문은 가드의 *동작*이 아니라 *결과 코드*를 나열한다 — §58 Error Contract 와 상당 부분 중복된다(`APPROVAL_CHAIN_VERSION_NOT_FOUND`·`_INACTIVE`·`_UNAPPROVED`·`_IMMUTABLE`·`_MULTIPLE_MATCH`·`_NO_MATCH`·`_COMPILATION_FAILED`·`_SNAPSHOT_MISSING`·`_SNAPSHOT_INVALID`·`_FALLBACK_EXHAUSTED`·`_FALLBACK_CYCLE`·`_OVERRIDE_INVALID` = **12개가 §57·§58 양쪽에 등장**). 두 섹션은 배타 분모로 계수되나 **구현 시 단일 코드 테이블이어야 한다**(§63 중복 감사 대상 — ADR 담당).
2. **§55·§56·§57 삼중 중복**: `Active Version 직접 수정`·`START Node 없음`·`Terminal Node 없음`·`Route Cycle`·`Fallback Cycle`·`Cross-Tenant Node·Edge 참조`·`다른 Chain Version Node 참조`·`무기한 Temporary Override`·`승인 근거 없는 Override`·`특정 직원 ID 하드코딩`·`History 덮어쓰기` 등이 §55(심각도 분류)·§56(정적 린트)·§57/§58(런타임 코드) 세 축에 반복 등장한다. **원문의 의도는 동일 위반을 세 계층에서 잡으라는 것**으로 읽히나, 원문에 그 관계가 명시돼 있지 않다 — 설계 시 **위반 1건 = (린트 규칙, 런타임 가드, 심각도) 삼중 매핑 테이블**로 정규화할 것을 권고한다(§63 판단은 ADR 담당).
3. **§60 이 `effective_at` 과 `recorded_at` 을 분리 요구**하나, 레포에는 **as-of 질의 계층 자체가 없다**: `kr_fee_rule.effective_from`(`Db.php:898`)은 컬럼만 있고 `WHERE effective_from <= :as_of` 전역 0 · 환율(`Connectors::fxToKrw:1749`)은 컬럼도 이력도 없는 KV 단일행 덮어쓰기(`:1804-1805`). §60-39/40 은 **저장 계층 신설 + 질의 계층 신설 양쪽**이 선행이다.
4. **§68 이 `Rate Limit`·`Idempotency`·`Replay Protection` 을 나열**하나, 원문은 **승인 도메인 고유의 임계치·키 범위·윈도우를 지정하지 않는다**. 현행 레이트리밋(`index.php:513` 기본 1200/min · API 키 단위)은 승인 경로에 도달조차 하지 않으므로 **원문만으로는 파라미터를 도출할 수 없다** → 구현 시 별도 결정 필요(UNVERIFIED 영역).
5. **§60 `lineage` 의 의미가 원문에 정의돼 있지 않다.** 레포의 유일한 `lineage`(`DataPlatform.php:313-345`)는 데이터소스 계보로 의미가 다르다. **동명이의 충돌 위험** — Chain lineage 구현 시 명명 분리 필요.

### 3.5 기지 실측 정정 (ⓑ 앵커 대비 — 규율 규칙 9)

| # | 앵커 진술 | 재실증 결과 | 영향 |
|---|---|---|---|
| 1 | *"CI 실재 = `deploy.yml`(EN locale 구문 가드 → build → SCP → chown/reload → 로그인 스모크)"* | **낡았다.** 실제로는 `verify` job(`:37-75`)에 **GATE 1~5**(팬텀 정적자산 `:46` · 라우트 등록 정합 + PHP 구문 `:50-51` · rules-of-hooks + no-undef `:57` · 빌드 `:62` · E2E 스모크 `:75`)가 선행하고 `deploy` 는 `needs: verify`(`:79`). EN locale 가드는 `deploy` job 의 PHASE 1(`:92-93`). | §56 에 **유리한 정정** — 정적 게이트 부착 지점이 앵커가 기술한 것보다 성숙하다(C-12). |
| 2 | *"`SecurityAudit` `:45-52` DDL"* | DDL 은 `:47-52`(`ensure()` 는 `:43-53`). 컬럼 나열은 `:49-51`. | 표기 정밀화만. 결론 무변. |
| 3 | *"Rate Limit(`index.php:508-545`)"* | 블록은 **`:508-551`**(429 반환 `:544-549` · fail-open catch `:550`). | 표기 정정. 결론 무변. |
| 4 | *"strict fail-closed `:585`"* | 정확하나 **기본 OFF** — `getenv('GENIE_STRICT_AUTH') === '1'` 일 때만 발동(주석 `:584` *"기본 OFF 이므로 정상 흐름 무회귀"* 자인). 즉 **무-테넌트 키 거부는 옵트인**이며 운영 활성화 여부는 미확인. | §68-1 을 REAL 이 아니라 **PARTIAL** 로 판정한 근거 중 하나. |
| 5 | *"`eval`/`create_function`/`system` backend/src 0"* | **문자 그대로는 정확**(`passthru` 도 0). **그러나** `WmsCctv.php:563-564` `shell_exec` · `:635` `proc_open(['/bin/sh','-c',$cmd],…)` 실재. | §68-11 *"Arbitrary Code Execution 차단"* 을 REAL 로 올릴 수 없는 이유. 앵커의 3함수 열거만 보고 "차단 REAL"로 결론내면 오판. |
| 6 | *"`hash_equals` grep 0(검증기 없음)"* (menu_audit_log 문맥) | **문맥 한정으로 정확** — `AdminMenu.php` 내 `hash_equals` 0 확인. 레포 전역으로는 20+ 히트(웹훅 서명·토큰 비교 등)이므로 **범위를 명시하지 않고 인용하면 오독된다**. | 인용 시 "AdminMenu 내" 명시 필요. |
| 7 | *"`menu_audit_log` preimage 재구성 불가(`ts` 불일치)"* | **정확하고, 더 심하다** — DDL(`:123-131`)에 **`prev_hash` 컬럼 자체가 없다**(`hash_chain` 만). preimage(`:194` `'prev'=>$prevHash`)의 두 요소(`prev`·`ts`)가 **모두** 저장되지 않는다. `tenant_id` 컬럼도 없다. | 앵커 결론 강화. |
| 8 | *"`Alerting` 감사 = `:597`,`:655`"* | 정확. **추가 발견** — `Alerting::audit:28-31` 의 INSERT 는 `audit_log(actor,action,details_json,created_at)` **4컬럼**으로 **`tenant_id` 가 없다** → Alerting 승인 감사는 테넌트 귀속 불가. | §60-2 `tenant` · §68-1 판정에 반영. |
| 9 | *"`seedOrg:711` 이 실제 시드"*(acl_permission.approve) | 정확하나 **1개소가 아니라 5개소** — `TeamPermissions.php:708`(마케팅팀)·`:711`(영업팀)·`:714`(대기업영업팀)·`:716`(물류팀)·`:717`(재무팀). 판독자 0 이라는 결론은 무변. | 인용 정밀화. |
| 10 | *"`data_scope` `'user'` 로 쓰는 코드 0"* | **재실증 확인** — `replaceScope` 호출처 4곳 전부 `'team'`(`:584`,`:743`) 또는 `'member'`(`:653`) · `subjectScope` 호출처 중 `'user'` 는 **강제 경로 `:253` 단 하나**. `getMemberPermissions:609` 는 `'member'` 로 읽어 되돌려줌(가짜 녹색) 확인. | 앵커 정확. 본 문서 범위(§55~§61,§68) 밖이나 §68-1/§68-15 배경으로 유효. |

### 3.6 자진 신고 (약한 앵커·추정·미확인)

1. **§68-1/§68-2 를 PARTIAL 로 판정한 것은 프레임 선택의 결과다.** §68 은 Chain 도메인이 아니라 **일반 보안 원칙**이므로 "현행 승인/인가 인프라에 이 원칙이 실현돼 있는가"로 평가했다. Chain 도메인 기준으로만 보면 18개 전부 ABSENT 이다. ⓔ 가 다른 프레임을 채택하면 이 4건(1·2·14·16)이 ABSENT 로 내려간다. **이 프레임 선택을 명시적으로 신고한다.**
2. **§55·§56 의 "린트/가드 부재"는 정적 실측이다.** 운영 서버에 배포된 코드가 로컬 레포와 동일하다는 전제 위에 있다(운영 로그·런타임 미접근). #45 운영 로그 = 미확인(`UNVERIFIED`) 이라는 ⓑ 결론과 동일한 한계.
3. **`GENIE_STRICT_AUTH` 운영 활성화 여부 미확인** — 운영 `.env` 미접근. 활성화돼 있다면 §68-1 의 근거 하나가 강화되나 판정(PARTIAL)은 바뀌지 않는다(admin_growth_approval 의 tenant_id 컬럼 부재가 독립 사유).
4. **§60-6 "전체 Approval Request 민감 Payload"를 ABSENT 로 판정했으나 반례 소지가 있다.** `action_request.action_json`·`admin_growth_approval.payload_json`·`catalog_writeback_job.payload` 가 원 payload 를 통째 저장한다. 다만 이들은 **§60 이 규정하는 Evidence 레코드가 아니라 요청 레코드**이므로 §60 위반으로 계수하지 않았다. 경계 판단이며 ⓔ 재검토 대상.
5. **§55 의 33항목을 전부 ABSENT 로 두었으나, 원문 지시는 "High/Critical 로 처리하라"(= 심각도 분류 요구)다.** "Gap 이 존재하는가"가 아니라 "Gap 을 심각도로 다루는 체계가 있는가"로 읽었다. 후자 기준으로 레포에는 승인 도메인 심각도 분류 체계가 0 이다. 전자 기준(= 결함 존재 여부)으로 읽으면 §55-25(No Match 시 임의 선택)·§55-17(History 덮어쓰기)은 **결함이 실재**하므로 다른 어휘가 필요할 수 있다. 실측 칸에 두 사실을 모두 기록해 ⓔ 가 판별 가능하도록 했다.
6. **§56-31 에서 `Mapping::actorId:47` `user:{email}` 분기를 "이름·이메일 기반 Actor Binding" 금지의 잔존 위반으로 지목한 것은 본 전사의 해석이다.** 289차 G-01 은 이 분기를 **개선**으로 도입했다(`Alerting` 의 헤더 위조 대비). 원문 §56-31 의 금지는 *위조 가능한* 바인딩을 겨눈 것으로 읽는 것이 자연스러우며, 서버측 세션에서 도출한 이메일은 위조 불가다. **C-4 의 `user:#{id}` 통일 권고는 안전측 해석이며, 실 위반 등급은 미부여**.
7. **§57/§58 12개 코드 중복(3.4-1)은 원문 줄 대조로 산출**했으나, 두 섹션의 의도 차이(가드 vs 계약)를 원문이 명시하지 않아 **"중복"이라는 성격 규정 자체가 추정**이다. §63(중복 감사) 판단 권한은 ADR 담당에 있다 — 본 문서는 사실만 기록한다.
