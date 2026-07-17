# Approval Chain — Reconciliation · Reconciliation 상태

> EPIC 06-A Part 4-5-3-1-5-3-3-3 · 원문 §53, §54 전사
> 원문 정본: `docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_3_VERBATIM.md`
> 판정 근거: 289차 ⓑ 전수조사(105항목) 실측. 코드 변경 0.

## 1. 원문 전사

### §53. Chain Reconciliation (원문 줄 2410-2465 · 분모 44)

`APPROVAL_CHAIN_RECONCILIATION` — 비교 대상 24 + 필수 필드 20.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | Chain Definition vs Active Version | Chain Definition·Active Version **양쪽 부재**(`approval_chain` 전역 grep 0) → 비교 피연산자 없음 | ABSENT |
| 2 | Chain Version vs Template Version | 양쪽 부재. optimistic lock `version` grep **0** · Template 버전 축 0 | ABSENT |
| 3 | Stage Definition vs Stage Version | `approval_stage`/`step_order` grep **0**. ★오탐: `stage`/`sc_stages` = 물류 마일스톤 체크리스트(`SupplyChain.php:50-54`, `:193-199` · `done TINYINT`=체크박스 · **`sort_order` 는 INSERT 시 배열 인덱스 `$i`**) | ABSENT |
| 4 | Level Definition vs Level Version | `approval_level`/`approval_depth` grep **0** | ABSENT |
| 5 | Route Definition vs Route Version | `approval_route`/`route_id` grep **0**. ★오탐: `route` 단독 = SPA URL(`menu_tree.route VARCHAR(255)` · `20260526_168_101_create_menu_tree.sql:10`) · `backend/src/routes.php` 1636줄 | ABSENT |
| 6 | Route Node vs Route Edge | Route 부재. 인접 노드/엣지 스토어 **2종 병존**하나 Chain 무관: `journeys.nodes/edges`(`JourneyBuilder` · `:35-41`) · `graph_node`/`graph_edge`(`Db.php:816-839`) | ABSENT |
| 7 | Route Edge vs Topological Order | Route Edge 부재. 위상정렬 **알고리즘은 실재**하나 대상이 PM 일정: `PM/Gantt.php:104-122` **Kahn** + `:119` `count($topo)!==count($taskMap)` | ABSENT |
| 8 | Applicability vs Selection Result | Applicability·Selection 양쪽 부재. 인접 = `Catalog.php:1016` `HIGH_VALUE_KRW = 5000000.0` → `:1103-1105` — **상수 1개, 선택 결과 없음** | ABSENT |
| 9 | Priority vs Selected Chain | Chain 선택 개념 부재. ★오탐: `source_priority` = 데이터소스 Trust 우선순위(`DataPlatform.php:65`, `:184`) | ABSENT |
| 10 | Override vs Compiled Artifact | 양쪽 부재. ★오탐: `override` = 스칼라 선행순위(`Mmm.php:381-382` · `OrderHub.php:1274`) | ABSENT |
| 11 | Fallback vs Compiled Artifact | 양쪽 부재. 현행 폴백은 전부 하드코딩(`JourneyBuilder nextNode:811-814` · `pickWeighted:729`) — 정의된 Fallback 아님 | ABSENT |
| 12 | Chain Version vs Workflow Definition | 🔴 §70 Step 2 확정 — Canonical DAG SoT 후보 **셋 다 탈락**(`JourneyBuilder`·`graph_node`/`graph_edge`·`pm_task_dependencies`). Workflow Definition 은 실재하나(`journeys` MEDIUMTEXT `:36` **무검증 저장**) Chain Version 이 없어 비교 불가 | ABSENT |
| 13 | Chain Snapshot vs Chain Version | 양쪽 부재(→ `APPROVAL_CHAIN_SNAPSHOT.md`) | ABSENT |
| 14 | Chain Resolution Result vs Snapshot | 양쪽 부재 | ABSENT |
| 15 | Approval Case vs Selected Chain | 🔴 **Approval Case 개념 자체 ABSENT** — 요청 1행 = 결정 1행 = 종결(`Mapping.php:284-289` · `Alerting.php:591-595` · `AdminGrowth.php:1329-1330`) · 재개·이관 코드 0 | ABSENT |
| 16 | Planned Task vs Chain Level | Approval Task·Level 양쪽 부재. ★오탐: `pm_task*` = PM 도메인 | ABSENT |
| 17 | Actual Task vs Chain Level Reference | 동일 | ABSENT |
| 18 | Authority Reference vs Level | 🔴 권한 축 **2벌 분열** — `$roleRank`(`backend/public/index.php:554`) ↔ `team_role`(owner>manager>member) **매핑 코드 전수 0**. 🔴 `acl_permission.approve` 는 **완전한 장식**: `TeamPermissions::ACTIONS:39` 에 실재 · `normActions:186` 강제 · `seedOrg:711` 실 시드 — **그러나 `approve` 를 읽어 승인 가부를 판정하는 코드 0** | ABSENT |
| 19 | Actor Resolver Reference vs Level | 🔴 **Existing Approval Manager Resolver = ABSENT(능력 확인)** — `resolveApprover`/`routeApproval`/`next_approver`/`approver_id`/`escalat` 승인 히트 **0**. 4경로 전량 "호출자가 곧 승인자" | ABSENT |
| 20 | Organization Hierarchy Version vs Resolution Input | 조직 계층 버전·해석 입력 **양쪽 부재**. `ORGANIZATION_*` 11종 **이름·능력 양쪽 0** · `team`(`TeamPermissions.php:143-151`)에 `parent_team_id` **없음** | ABSENT |
| 21 | Reporting Line Version vs Resolution Input | 🔴 `parent_user_id` 는 **상급자를 표현할 수 없다** — 전 4 생성경로 owner 하드고정(`UserAuth.php:1225-1227` 주석 자인 · `EnterpriseAuth.php:502` · `UserAuth.php:1549`, `:1576`) → 보고선 버전 이전에 보고선 자체가 없음 | ABSENT |
| 22 | Active Chain Cache vs Current Version | 🔴 **서버 캐시 계층 자체가 부재** — Redis/Memcached **0**(★오탐: `redis` 3히트 전량 `Payment.php:817-820` `totalBefore`**`Dis`**`c`) · `apcu_*` 는 `SystemMetrics.php:225-451` 지표 보고 전용 | ABSENT |
| 23 | Future Change vs Scheduler | 미래 변경·스케줄러 **양쪽 부재**. `idempoten` 5히트 전량 DDL/시드 멱등(스케줄러 아님) | ABSENT |
| 24 | Legacy Route vs Canonical Chain | Canonical Chain 부재 → 비교 불가. **Legacy 후보는 실재**: `FeedTemplate`(`submitDraft:265-268` · `approveDraft:271-274` · `publishDraft:277-287` 409 `must_approve_first`) = 레포 최근접 승인 시퀀스 · §62 `MIGRATE_TO_CANONICAL` 후보 1순위 | ABSENT |
| 25 | approval_chain_reconciliation_id | 엔티티 부재. ★오탐: `reconcil` 히트 = `Connectors.php:902` `roasReconciliation`(매체 vs 귀속 ROAS) · `Wms.php:2160` `reconcileChannelStock`(채널 재고) — 둘 다 Chain 무관 | ABSENT |
| 26 | tenant | Chain 조정 엔티티 부재. ⚠️ 테넌트 마스터 테이블 자체가 없음(`api_key.tenant_id` FK 없는 VARCHAR `Db.php:944` · 열거 = `SELECT DISTINCT` **19개소 역추론**) | ABSENT |
| 27 | approval domain | 승인 도메인 축 **0**. 현행 4경로는 도메인 구분 없이 스키마가 각각 상이 | ABSENT |
| 28 | chain definition | 부재 | ABSENT |
| 29 | chain version | 부재 | ABSENT |
| 30 | request | Chain 참조 요청 부재 | ABSENT |
| 31 | case | Approval Case ABSENT | ABSENT |
| 32 | source component | 비교 원천 컴포넌트 축 **0** | ABSENT |
| 33 | canonical component | 🔴 Canonical 정본 자체가 없다 — 합법 전이 집합 선언 **레포 전역 0** → 무엇과 비교할 canonical 이 없음 | ABSENT |
| 34 | effective date | 발효일 축 **0**. `WHERE effective_from <= :as_of` **전역 0** | ABSENT |
| 35 | difference | 차이 산출·보존 **0** | ABSENT |
| 36 | affected requests | 영향 요청 산출 **0** | ABSENT |
| 37 | affected cases | Case 부재 → 피연산자 없음 | ABSENT |
| 38 | affected tasks | Task 부재 → 피연산자 없음 | ABSENT |
| 39 | severity | 심각도 축 **0** | ABSENT |
| 40 | resolution | 해소 축 **0** | ABSENT |
| 41 | resolved_by | 해소자 축 **0**. ⚠️ 인접 `AdminGrowth.php:147` `decided_by`/`decided_at` 2컬럼 존재하나 🔴 `requested_by`·`decided_by` **양쪽 있는데 비교 코드 0**(`:1324-1331`) | ABSENT |
| 42 | resolved_at | 해소 시각 축 **0** | ABSENT |
| 43 | status | 조정 상태 축 **0**(→ §54). `SET status *=` **128건/42파일** 전부 도메인 엔티티 상태 | ABSENT |
| 44 | evidence | 근거 보존 축 **0** | ABSENT |

### §54. Reconciliation 상태 (원문 줄 2466-2496 · 분모 26)

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | MATCH | 🔴 **상태머신 ABSENT** — `SET status *=` **128건/42파일**(실측 재확인) · **합법 전이 집합 선언 0** · 전이 가드 최소 8곳뿐 → 128건 중 대부분 무가드. Chain 조정 상태 열거 **0** | ABSENT |
| 2 | ACTIVE_VERSION_MISMATCH | Active Version 축 부재 | ABSENT |
| 3 | TEMPLATE_VERSION_MISMATCH | Template 버전 축 부재 | ABSENT |
| 4 | STAGE_VERSION_MISMATCH | Stage 축 부재 | ABSENT |
| 5 | LEVEL_VERSION_MISMATCH | Level 축 부재 | ABSENT |
| 6 | ROUTE_VERSION_MISMATCH | Route 축 부재 | ABSENT |
| 7 | NODE_EDGE_MISMATCH | Route Node·Edge 부재. 🔴 인접 반례: `JourneyBuilder` **엣지에 id 없음**(`from`+`when` 매칭 `:789`, `:796`) → §22 Route Edge 참조 불가 | ABSENT |
| 8 | TOPOLOGICAL_ORDER_MISMATCH | 위상 불일치 상태 **0**. 확장기반 `PM/Gantt.php:119-125`(`count($topo)!==count($taskMap)` → 500 아닌 **부분결과+경고 degrade**) | ABSENT |
| 9 | APPLICABILITY_MISMATCH | Applicability 부재 | ABSENT |
| 10 | PRIORITY_SELECTION_MISMATCH | 우선순위·선택 부재 | ABSENT |
| 11 | OVERRIDE_MISMATCH | Override 부재 | ABSENT |
| 12 | FALLBACK_MISMATCH | Fallback 부재 | ABSENT |
| 13 | WORKFLOW_DEFINITION_MISMATCH | Workflow Definition 은 실재하나(`journeys` MEDIUMTEXT `:36`) **무검증 저장**(`createJourney:135`/`updateJourney:153-154` `nodes`/`edges` 무검증 `json_encode` · `:512` 주석이 acyclicity 미검증 자인) → 불일치 탐지 대상 자체가 미검증 | ABSENT |
| 14 | SNAPSHOT_VERSION_MISMATCH | Snapshot·Version 양쪽 부재 | ABSENT |
| 15 | RESOLUTION_RESULT_MISMATCH | Resolution 결과 부재 | ABSENT |
| 16 | CASE_CHAIN_MISMATCH | Case·Chain 양쪽 부재 | ABSENT |
| 17 | TASK_LEVEL_MISMATCH | Task·Level 양쪽 부재 | ABSENT |
| 18 | AUTHORITY_REFERENCE_MISMATCH | 🔴 권한 축 2벌 분열(`$roleRank` ↔ `team_role` 매핑 **전수 0**) → 불일치를 **판정할 기준 축이 없다** | ABSENT |
| 19 | ACTOR_RESOLVER_REFERENCE_MISMATCH | Actor Resolver ABSENT | ABSENT |
| 20 | ORGANIZATION_VERSION_MISMATCH | 조직 버전 부재 | ABSENT |
| 21 | REPORTING_LINE_VERSION_MISMATCH | 보고선 버전 부재 | ABSENT |
| 22 | CACHE_VERSION_MISMATCH | 서버 캐시 계층 **자체가 부재** | ABSENT |
| 23 | FUTURE_CHANGE_SCHEDULING_MISMATCH | 미래 변경·스케줄러 부재 | ABSENT |
| 24 | LEGACY_ROUTE_MISMATCH | Canonical 없음 → Legacy 판정 불가(Legacy 후보 `FeedTemplate` 는 실재) | ABSENT |
| 25 | MANUAL_REVIEW | 수동 검토 상태 **0** | ABSENT |
| 26 | BLOCKED | 차단 상태 **0**. 인접 fail-closed 선례 = `PM/Dependencies.php:32-34` 422 `cycle_detected`(쓰기 전 차단) — 🔴 단 `:48` `auditLog` **미도달**(§3 참조) | ABSENT |

## 2. 설계 계약

### C-53-1 · 24 비교를 전수 수행
`APPROVAL_CHAIN_RECONCILIATION` 은 §53 표 #1~#24 **24 비교를 빠짐없이** 수행한다. 일부만 비교하고 `MATCH` 로 결론내는 것을 금지한다(규칙 6 — "불일치 없음" ≠ "정합").

### C-53-2 · `source component` ↔ `canonical component` 이원 보존
차이(`difference`)만 저장하지 말고 **비교 양변을 모두** 보존하라. 근거 — `menu_audit_log` 의 실패 모드: preimage 가 `'ts'=>date('c')`(`AdminMenu.php:195`)인데 저장은 `created_at DEFAULT CURRENT_TIMESTAMP`(`:129`) → 양변 재구성 불가 → **검증 불가능한 장식**이 되었다. 감사 정본 선례는 `SecurityAudit`(`SecurityAudit.php:27` tenant 포함 preimage · `:45-52` DDL · **`verify():56-68`** `:64` `hash_equals` · `created_at` 을 애플리케이션이 명시 기록하여 재구성 가능).

### C-54-1 · 26 상태는 **선언된 열거**여야 한다 (§54 의 실질)
규칙 8 — *"열거에 없다"는 열거가 실재할 때만 유효*. 따라서 §54 는 `ENUM`/`CHECK`/`in_array` 중 하나로 **코드·스키마가 강제**해야 한다.
- 강제 선례 2건(둘 다 결함 동반 — 복제 시 교정 필수):
  - `TeamPermissions::DATA_SCOPES` + `:342` `in_array($stype, self::DATA_SCOPES)` → 🔴 **무음 강등 폴백(`'own'`)**.
  - `TeamPermissions::ACTIONS`(`:39`) + `normActions:186` `in_array` → 🔴 **무음 드롭**.
- → Chain 조정 상태는 **무음 폴백/드롭 금지 · 422 fail-closed** 로 구현하라.

### C-53-3 · 🔴 감사 결함을 복제하지 마라
`PM/Dependencies.php:32-34` 가 **422 조기반환하여 `:48` `auditLog` 에 미도달** → **순환 탐지 시 감사 이벤트가 없다**. Reconciliation 이 `BLOCKED`·`MANUAL_REVIEW` 를 산출할 때는 **차단과 동시에** 감사 이벤트를 남겨야 한다. 이 결함을 복제하지 마라(§58/§61 과 동일 지침).

### C-53-4 · 확장 기반 (신설 금지)
- **#7 Route Edge vs Topological Order** → `PM/Gantt.php:104-122` **Kahn 위상정렬** 알고리즘 추출·재사용. `:119` `count($topo)!==count($taskMap)` = 순환·고립 동시 판정 · `:120-125` 부분결과+경고 degrade.
- **#6 Route Node vs Route Edge** → `PM/Dependencies.php:79-100` 반복 DFS + `$visited` + **tenant 필터 `:91` 매 홉**.
- 🔴 **알고리즘만 가져오고 스키마는 복제 금지** — `Dependencies.php:90-91` 의 `dep_type` 술어 부재 결함이 동반 이식된다.
- 🔴 **경로 표기**: `backend/src/Handlers/PM/…`. **`backend/src/PM/` 는 존재하지 않는다.**

### C-53-5 · 조정은 읽기 전용 · 자동 교정 금지
§53 은 **비교와 기록**까지다. `resolution`/`resolved_by`/`resolved_at` 는 **사람의 해소를 기록하는 필드**이지 자동 교정 트리거가 아니다. 근거 — 🔴 `Catalog::approveQueue:2350` 이 **ids 미지정 시 테넌트 전체 `pending_approval` 일괄 승인**(기본 동작이 전량 승인). "미지정 = 전량 적용" 패턴을 조정 도메인에 복제하면 조정기가 대량 오교정기가 된다.

## 3. 미결·선행조건

### BLOCKED_PREREQUISITE — 조정의 피연산자가 없다
§53/§54 **70항목 전량 ABSENT**. Reconciliation 은 **Chain Definition·Version·Route·Stage·Level·Snapshot·Case·Task 를 비교 양변으로 요구**하는데 전부 부재.
- 이름 축 전역 grep **0**(재실측): `approval_chain|approval_route|approval_level|approval_stage|step_order|sequence_no|route_id|next_step|previous_step|approval_depth|approver_order` → backend/src + frontend/src 합계 **0 히트**.
- → §70 Step 2 확정(`APPROVAL_ROUTE_*` 신규 SoT 구축이 정합 — §72-18·§6 **양쪽 다 전건이 거짓**이라 금지가 발동하지 않음)이 선행조건.

### 🔴 규칙 7 — 현행이 "MATCH"인 것이 아니다
현행 시스템에서 §54 의 25개 MISMATCH 가 발생하지 않는 것은 **비교 대상이 없어서**이지 정합해서가 아니다. `MATCH` 조차 `ABSENT` 로 판정한 이유다. **대상 부재를 준수로 계산하지 않았다.**

### 🔴 §54 상태머신 부재는 Chain 도메인 밖에서도 위험이다 (별도 승인세션 대상)
- `SET status *=` **128건 / 42파일**(실측 재확인) · **합법 전이 집합 선언 레포 전역 0**.
- 전이 가드는 **최소 8곳뿐**: `FeedTemplate:239`, `:258`, `:285` · `CustomerAI:469` · `Dsar:555` · `AdminGrowth:1327` · `LiveCommerce:530` · `Mapping:264`.
- → 128건 중 대부분이 무가드. 이 세션은 **코드 변경 0**이며, 상태머신 도입은 별도 승인세션 대상이다.

### 🔴 Canonical component 를 만들 때 `FeedTemplate` 의 실패 모드를 반복하지 마라
`FeedTemplate::transition(…, string $from, string $to)`(`:249`)은 **전이 쌍을 호출자 인자로 받는다** → 가드는 "현재 status == 넘겨받은 from" 만 검사(`:258`). 합법 전이 집합이 **3개 메서드 본문에 분산된 리터럴**로만 존재한다. 🔴 **승인자 신원 검사 0**(자기 제출 → 자기 승인 무제한). → §53 이 비교할 `canonical component` 가 되려면 전이 집합이 **데이터로 선언**되어야 한다.

### ★grep 오염 — 인용 전 확인
`reconcil`(ROAS `Connectors.php:902` · WMS 재고 `Wms.php:2160`) · `route`(SPA URL·`routes.php`) · `stage`/`sc_stages`(물류 마일스톤) · `chain_id`(챗봇 안내 문자열 `GeniegoKnowledge.php:430` 유일) · `override`(스칼라 선행순위) · `source_priority`(데이터소스 Trust) · `node_count`/`edge_count`(SQL 별칭 `GraphScore.php:434`) · `redis`(`Payment.php:817` `totalBeforeDisc`) · `snapshot`(CCTV JPEG `routes.php:271` 최다) · `escalat`(`Reviews.php:173-187`) · `pm_task*`(PM 도메인) · `depth`(루프 지역변수).

### 분모 대조
- §53 = 44행 / 분모 44 ✅ (비교 대상 24 + 필수 필드 20. 산문 명령 *"다음을 비교하라"* 는 표제이므로 별행 미계상)
- §54 = 26행 / 분모 26 ✅ (상태 열거 26)
- **합계 70행 / 분모 70 ✅**
