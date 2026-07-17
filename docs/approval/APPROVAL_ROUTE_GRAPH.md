# Approval Route Graph — Route Definition·Segment·Node·Edge·Direction·Entry/Exit·Condition·Branch·Merge

> EPIC 06-A Part 4-5-3-1-5-3-3-3 · 원문 §18, §20, §21, §22, §23, §24, §25, §26, §27 전사
> 원문 정본: `docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_3_VERBATIM.md`
> 판정 근거: 289차 ⓑ 전수조사(105항목) 실측 + 본 전사 시 재실증. 코드 변경 0.
>
> **부재증명(전 섹션 공통)**: `approval_route` · `route_id` · `APPROVAL_ROUTE` 3어 grep = `backend/src` + `frontend/src` **전수 0건**. `APPROVAL_ROUTE_*` 계열 Entity 는 **이름·능력 양쪽 모두 레포에 존재하지 않는다.**
> **§19 Approval Route Version 은 본 문서 범위 밖**(VERSIONING 문서 담당).

---

## 1. 원문 전사

### §18. Approval Route Definition (원문 줄 1073-1115 · 분모 31)

`APPROVAL_ROUTE_DEFINITION` — 필수 필드 22 + Route Type 9.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | approval_route_definition_id | `approval_route` grep 0(backend/src·frontend/src) · Route 식별자 축 부재 | ABSENT |
| 2 | approval_chain_version_id | Chain Version 축 0 — `menu_defaults.version` = 리터럴 `'baseline'`(`backend/src/Handlers/AdminMenu.php:309`)뿐 | ABSENT |
| 3 | tenant_id | Route 엔터티 부재. 인접 선례 = `graph_edge.tenant_id`(`backend/src/Db.php:816-839`) · `pm_task_dependencies` tenant 필터 매 홉(`backend/src/Handlers/PM/Dependencies.php:91`) | ABSENT |
| 4 | route_code | `route` 단독 grep 오염 — 실체는 SPA URL(`migrations/20260526_168_101_create_menu_tree.sql:10` `menu_tree.route VARCHAR(255)`)·HTTP 라우트(`backend/src/routes.php`). Route Code 축 0 | ABSENT |
| 5 | route_name | 동일 — 명명 축 0 | ABSENT |
| 6 | route_type | Route Type 열거 부재. `journeys` 그래프에 그래프 유형 선언 0 | ABSENT |
| 7 | entry node | START 노드 개념 0. `journeys` 는 `$defaultNodes[0]='trigger_1'`(`backend/src/Handlers/JourneyBuilder.php:121`) **관례적 시작**일 뿐 선언·강제 없음 | ABSENT |
| 8 | terminal nodes | Terminal 노드 유형 0. `nextNode:790` `if(!$cand) return ''` = **후보 소진이 곧 종료**(암묵 종료·선언 없음) | ABSENT |
| 9 | default route 여부 | Default Route 축 0 | ABSENT |
| 10 | conditional 여부 | 그래프 수준 플래그 0. 노드 수준 `type==='condition'`(`JourneyBuilder.php:599`)만 존재 | ABSENT |
| 11 | hierarchy based 여부 | Hierarchical Route 축 0 · Reporting Line 자체가 ABSENT(§3.2 — 상급자 반환 함수 0) | ABSENT |
| 12 | branch allowed 여부 | 정의 계층 공백 — `createJourney:135`·`updateJourney:153-154` 가 `nodes`/`edges` 를 **무검증 `json_encode`** | ABSENT |
| 13 | merge allowed 여부 | Merge 개념 0(§27 참조) | ABSENT |
| 14 | parallel reference 여부 | 병렬 축 0. `split`(`JourneyBuilder.php:609-621`)은 **배타 택일**이지 parallel fork 아님 | ABSENT |
| 15 | maximum depth | 상한 축 0. 인접 = `validateDependency:84` `$depth < 10000` **DFS 안전밸브**(정책 상한 아님) | ABSENT |
| 16 | maximum branch count | 상한 축 0 | ABSENT |
| 17 | maximum node count | 상한 축 0 · `journeys.nodes` MEDIUMTEXT(`backend/src/Db.php:36`) 무제한 | ABSENT |
| 18 | fallback reference | Fallback Route 축 0. 현행 폴백은 **암묵·위치 기반**(`nextNode:811-812`) — 복제 금지 대상 | ABSENT |
| 19 | valid_from | 시점 축 0 · `effective_to`/`valid_to`/`valid_from` grep 0(`valid_to` 유일 히트 = `in`+`valid_to`+`ken` `Onsite.php:396`) | ABSENT |
| 20 | valid_to | 동일 | ABSENT |
| 21 | status | Route status 축 0. `journeys.status`(`Db.php:36-41`)는 draft/active 발행상태이지 Route 정의 상태 아님 | ABSENT |
| 22 | evidence | Evidence 축 0 · 감사 정본 선례 = `backend/src/SecurityAudit.php:27`(tenant 포함 해시)·`:45-52`(DDL)·`:56-68`(`hash_equals` 검증기) | ABSENT |
| 23 | Route Type: LINEAR | 열거 부재 | ABSENT |
| 24 | Route Type: HIERARCHICAL | 열거 부재 · 계층 축 0 | ABSENT |
| 25 | Route Type: CONDITIONAL | 열거 부재 | ABSENT |
| 26 | Route Type: BRANCHED | 열거 부재 | ABSENT |
| 27 | Route Type: MERGED | 열거 부재 | ABSENT |
| 28 | Route Type: PARALLEL_REFERENCE | 열거 부재 | ABSENT |
| 29 | Route Type: HYBRID | 열거 부재 | ABSENT |
| 30 | Route Type: EXCEPTION_REFERENCE | 열거 부재 | ABSENT |
| 31 | Route Type: CUSTOM | 열거 부재 | ABSENT |

---

### §20. Route Segment (원문 줄 1143-1180 · 분모 24)

`APPROVAL_ROUTE_SEGMENT` — Segment Type 11 + 필수 필드 13. 원문: *"Segment는 Route의 논리적 부분을 나타낸다."*

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | Segment Type: MANAGEMENT_SEGMENT | Segment 축 0. 🔴`segment` grep 오염 — 실체는 마케팅 고객 세그(`crm_segments`, 5-3-2 SoT) · 조직/승인 무관 | ABSENT |
| 2 | Segment Type: FINANCE_SEGMENT | 열거 부재 | ABSENT |
| 3 | Segment Type: LEGAL_SEGMENT | 열거 부재 · Legal Entity 자체가 이름·능력 0(유일 히트 `MarketingDataHub.php:181` = 데모 문자열) | ABSENT |
| 4 | Segment Type: COMPLIANCE_SEGMENT | 열거 부재 | ABSENT |
| 5 | Segment Type: SECURITY_SEGMENT | 열거 부재 | ABSENT |
| 6 | Segment Type: PROGRAM_SEGMENT | 열거 부재 | ABSENT |
| 7 | Segment Type: REGIONAL_SEGMENT | 열거 부재 · `country_code` 오염(TikTok 리포트 차원 `Connectors:2044`,`:2071` · IP Geo `Geo.php:106`) | ABSENT |
| 8 | Segment Type: EXECUTIVE_REFERENCE_SEGMENT | 열거 부재 | ABSENT |
| 9 | Segment Type: EXCEPTION_SEGMENT | 열거 부재 | ABSENT |
| 10 | Segment Type: MANUAL_REVIEW_SEGMENT | 열거 부재 | ABSENT |
| 11 | Segment Type: CUSTOM | 열거 부재 | ABSENT |
| 12 | approval_route_segment_id | Segment 엔터티 0 | ABSENT |
| 13 | route version | Route Version 축 0(§19 범위 · 본 문서는 참조만) | ABSENT |
| 14 | segment code | 축 0. 🔴`stage`/`sc_stages` 오염 — 물류 마일스톤 체크리스트(`SupplyChain.php:50-54`,`:193-199` · `done TINYINT`=체크박스) | ABSENT |
| 15 | segment name | 축 0 | ABSENT |
| 16 | segment type | 축 0 | ABSENT |
| 17 | entry node | 축 0 · Segment 경계 개념 자체가 부재 | ABSENT |
| 18 | exit node | 축 0. `journeys` 의 `exit` 노드(`JourneyBuilder.php:623-624`)는 **이탈 조건(여정 즉시 종료)**이지 Segment 출구 아님 | ABSENT |
| 19 | stage references | 축 0 · `approval_stage`/`step_order` grep 승인 히트 0 | ABSENT |
| 20 | condition references | 축 0 · 인접 = `RuleEngine`(`backend/src/Handlers/RuleEngine.php:24`) 이나 Segment 참조 관계 없음 | ABSENT |
| 21 | required 여부 | 축 0 | ABSENT |
| 22 | fallback reference | 축 0 | ABSENT |
| 23 | status | 축 0 | ABSENT |
| 24 | evidence | 축 0 | ABSENT |

---

### §21. Route Node (원문 줄 1181-1228 · 분모 34)

`APPROVAL_ROUTE_NODE` — Node Type 15 + 필수 필드 19. (원문 `:1225` 산문 요구 — TERMINAL_REJECTED·CANCELLED 실행 전이 금지 — 는 불릿이 아니므로 분모 밖. **`## 2. 설계 계약`에 전사.**)

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | Node Type: START | 열거 부재. `journeys` 노드 유형은 **본문 분산 리터럴**(`type==='condition'` `:599` · `'split'` `:609` · `'exit'` `:623`) — **합법 노드유형 선언 집합 0** | ABSENT |
| 2 | Node Type: STAGE | 열거 부재 | ABSENT |
| 3 | Node Type: LEVEL | 열거 부재 · `approval_level` grep 승인 히트 0 | ABSENT |
| 4 | Node Type: CONDITION | 열거로는 부재. 인접 실동작 = `JourneyBuilder.php:599-605`(`evalCondition:818` → `nextNode:603`) — **마케팅 도메인 · 승인 아님** | ABSENT |
| 5 | Node Type: BRANCH | 열거 부재 · 인접 = `split:609-621`(배타 택일) | ABSENT |
| 6 | Node Type: MERGE | 열거 부재 · Merge 순회 0 | ABSENT |
| 7 | Node Type: ACTOR_SOURCE | 열거 부재 · ★Approver Resolver 능력 0(`resolveApprover`/`next_approver`/`approver_id` 승인 히트 0 · 4경로 전량 "호출자가 곧 승인자") | ABSENT |
| 8 | Node Type: AUTHORITY_CHECK_REFERENCE | 열거 부재 · 권한 축 2벌 분열(`$roleRank` `backend/public/index.php:554` ↔ `team_role`) **매핑 코드 0** → 참조할 정본 축이 없음 | ABSENT |
| 9 | Node Type: MANUAL_REVIEW | 열거 부재 | ABSENT |
| 10 | Node Type: FALLBACK | 열거 부재. 현행 폴백은 노드가 아니라 **암묵 위치 규칙**(`nextNode:811-812`) | ABSENT |
| 11 | Node Type: TERMINAL_APPROVED | 열거 부재. 인접 = `FeedTemplate::approveDraft:271-274` `transition(…,'submitted','approved')` — 상태 리터럴이지 노드 아님 | ABSENT |
| 12 | Node Type: TERMINAL_REJECTED_REFERENCE | 열거 부재 | ABSENT |
| 13 | Node Type: TERMINAL_BLOCKED | 열거 부재 | ABSENT |
| 14 | Node Type: TERMINAL_CANCELLED_REFERENCE | 열거 부재 | ABSENT |
| 15 | Node Type: CUSTOM | 열거 부재 | ABSENT |
| 16 | approval_route_node_id | 축 0. 인접 = `journeys.nodes[].id`(`JourneyBuilder.php:121-124` `'trigger_1'` 등) — **JSON 내부 문자열 · FK 아님 · 무검증** | ABSENT |
| 17 | approval_route_version_id | 축 0 · `journeys` version 0 | ABSENT |
| 18 | tenant_id | 축 0. `journeys` 노드는 행 단위 tenant 상속(`:131-135`)이며 노드별 tenant 0 · `graph_node` 는 노드별 tenant 有(`Db.php:816-839`)이나 승인 무관 | ABSENT |
| 19 | node_code | 축 0 | ABSENT |
| 20 | node_name | 축 0 · 인접 `journeys.nodes[].label`(`:121`) 표시용 | ABSENT |
| 21 | node_type | 축 0 · 합법 유형 열거 선언 0(위 #1) | ABSENT |
| 22 | stage reference | 축 0 | ABSENT |
| 23 | level reference | 축 0 | ABSENT |
| 24 | condition reference | 축 0. `journeys` 는 조건을 **참조가 아니라 노드 내부 `config` 인라인**(`:124` `['field'=>'email_clicked','op'=>'eq','value'=>true]`) → 재사용·버전·거버넌스 불가 | ABSENT |
| 25 | actor source reference | 축 0 · 🔴`parent_user_id` 는 상급자를 표현 불가(전 4 생성경로가 owner 하드고정 — `UserAuth::createTeamMember:1225-1227` 주석 자인 · `EnterpriseAuth::provisionUser:502`) | ABSENT |
| 26 | authority check reference | 축 0 · 🔴`acl_permission.approve`(`TeamPermissions.php:39` ACTIONS · `:711` seedOrg 실시드)는 **읽어서 승인 가부를 판정하는 코드 0** = 완전한 장식 | ABSENT |
| 27 | fallback reference | 축 0 | ABSENT |
| 28 | terminal state reference | 축 0 · 🔴#34 State Machine ABSENT — `SET status *=` **128건/42파일** · **합법 전이 집합 선언 0** | ABSENT |
| 29 | required 여부 | 축 0 | ABSENT |
| 30 | enabled 여부 | 축 0 · 인접 = `rule_engine.enabled`(`RuleEngine.php:44`) 룰 토글(노드 아님) | ABSENT |
| 31 | valid_from | 축 0 | ABSENT |
| 32 | valid_to | 축 0 | ABSENT |
| 33 | status | 축 0 | ABSENT |
| 34 | evidence | 축 0 | ABSENT |

---

### §22. Route Edge (원문 줄 1229-1279 · 분모 36)

`APPROVAL_ROUTE_EDGE` — 필수 필드 17 + Edge Type 11 + 금지 8.

🔴🔴**본 섹션의 결정적 실측**: `journeys.edges` JSON 에 **엣지 id 자체가 없다** — `$defaultEdges = [['from'=>'trigger_1','to'=>'email_1'], …]`(`backend/src/Handlers/JourneyBuilder.php:126`), 해석기는 `from` 일치(`:789`) + `when`/`branch`/`condition`/`label` 매칭(`:796`)으로만 엣지를 고른다. → **엣지를 식별·참조·버전·감사할 방법이 구조적으로 없다.**

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | approval_route_edge_id | 🔴**`journeys.edges` 에 id 키 부재**(`JourneyBuilder.php:126` · 매칭은 `from`+`when` `:789`,`:796`) · `graph_edge.id`(`Db.php:816-839`)는 존재하나 승인 무관 그래프 스토어 | ABSENT |
| 2 | approval_route_version_id | 축 0 | ABSENT |
| 3 | tenant_id | 축 0. `graph_edge.tenant_id` 有이나 🔴`upsertEdge`(`GraphScore.php:107-148`)가 tenant 검증 없이 `graph_node` 자동삽입(`:126-133`) → `upsertNode:57-59` 화이트리스트 우회 | ABSENT |
| 4 | source_node_id | 축 0 · 인접 3벌 분열: `from`(`JourneyBuilder:126`) · `src_type`+`src_id`(`GraphScore:107-148`) · `predecessor_id`(`PM/Dependencies.php:39`) | ABSENT |
| 5 | target_node_id | 축 0 · 동일 3벌 분열: `to` · `dst_type`+`dst_id` · `successor_id` | ABSENT |
| 6 | edge_type | 축 0. `journeys` 엣지는 유형 없이 `when` 라벨만(`:796`) · `pm_task_dependencies.dep_type ENUM('FS','SS','FF','SF')` = **일정 의존**(승인 무관)이며 🔴`:90-91` 술어에서 미사용 | ABSENT |
| 7 | condition reference | 축 0. 현행은 참조가 아니라 **문자열 라벨 인라인 비교**(`:796-799`) | ABSENT |
| 8 | branch key | 축 0. 인접 = `$e['branch']`(`:796`) 문자열 라벨 · `split` 의 `branches[].key`(`:613`) — 정의·검증·열거 0 | ABSENT |
| 9 | priority | 축 0 · 🔴`nextNode:799` **첫 일치 즉시 return** = 순서가 곧 우선순위(선언 없음·JSON 배열 순서 의존) | ABSENT |
| 10 | default edge 여부 | 축 0 · 🔴현행 "기본"은 `nextNode:814` `return (string)($cand[0]['to'] ?? '')` = **첫 후보 암묵 반환** | ABSENT |
| 11 | required 여부 | 축 0 | ABSENT |
| 12 | failure edge 여부 | 축 0 | ABSENT |
| 13 | fallback edge 여부 | 축 0 · 🔴폴백이 엣지 속성이 아니라 **위치 계산**(`:811-812`) | ABSENT |
| 14 | valid_from | 축 0 | ABSENT |
| 15 | valid_to | 축 0 | ABSENT |
| 16 | status | 축 0 | ABSENT |
| 17 | evidence | 축 0 | ABSENT |
| 18 | Edge Type: NORMAL | 열거 부재 | ABSENT |
| 19 | Edge Type: CONDITIONAL_TRUE | 열거로는 부재. 인접 = `nextNode:794` `$want = ['true','yes','y','1']` **문자열 관용 집합**(선언된 열거 아님) | ABSENT |
| 20 | Edge Type: CONDITIONAL_FALSE | 인접 = `:794` `['false','no','n','0']` — 동일 | ABSENT |
| 21 | Edge Type: BRANCH | 열거 부재 | ABSENT |
| 22 | Edge Type: MERGE | 열거 부재 | ABSENT |
| 23 | Edge Type: OPTIONAL | 열거 부재 | ABSENT |
| 24 | Edge Type: FALLBACK | 열거 부재 | ABSENT |
| 25 | Edge Type: FAILURE_REFERENCE | 열거 부재 | ABSENT |
| 26 | Edge Type: MANUAL_REVIEW | 열거 부재 | ABSENT |
| 27 | Edge Type: TERMINAL | 열거 부재 | ABSENT |
| 28 | Edge Type: CUSTOM | 열거 부재 | ABSENT |
| 29 | 금지: 동일 Source에서 동일 Priority의 복수 Default Edge | 🔴**priority·default 축이 없어 위반 대상 자체가 없다**(규칙 7 — 대상 부재를 준수로 계산 금지). 현행은 동일 source 복수 엣지를 `:788-789` 로 전부 수집한 뒤 `:799`/`:814` 가 **첫 항목을 말없이 택함** | ABSENT |
| 30 | 금지: 존재하지 않는 Node 참조 | 🔴검증 0 — `createJourney:135`/`updateJourney:154` 무검증 `json_encode`. 실행 시 `nextNode:790` `if(!$cand) return ''` → **무음 여정 종료**(오류 아님) | ABSENT |
| 31 | 금지: 다른 Tenant Route Node 참조 | 🔴Route 부재. 인접 반례 = `GraphScore::upsertEdge:126-133` 이 임의 타입 노드를 자동삽입(게이트 우회). 선례 = `PM/Dependencies.php:91` **DFS 매 홉 tenant 필터**(이식 대상) | ABSENT |
| 32 | 금지: 다른 Chain Version Node 참조 | Version 축 0 → 대상 부재 | ABSENT |
| 33 | 금지: 자기 자신으로 향하는 Edge | Route 부재. 선례 = `PM/Dependencies.php:29-31` `if($pred===$succ)` → **422 `self_dependency`**(쓰기 전 차단 · 알고리즘 추출 대상) | ABSENT |
| 34 | 금지: 허용되지 않은 Cycle | Route 부재. 🔴`journeys`: `createJourney:512` 주석이 **acyclicity 미검증 자인** · `GraphScore::upsertEdge:107-148` **검사 없음**. 선례 = `PM/Dependencies.php:32-34`(422 `cycle_detected`) + `:79-100`(반복 DFS · `$visited:81` · tenant 필터 `:91` · `$depth<10000:84`) | ABSENT |
| 35 | 금지: 도달 불가능한 Node | Route 부재. 선례 = `PM/Gantt.php:104-118` **Kahn 위상정렬** + `:119` `count($topo)!==count($taskMap)` + `:120-125` **500 아닌 부분결과+경고 degrade**(도달성·고립 동시 판정) | ABSENT |
| 36 | 금지: Terminal Node에서 나가는 일반 Edge | Terminal 노드 유형 0 → 대상 부재 | ABSENT |

---

### §23. Route 방향 표준 (원문 줄 1280-1293 · 분모 0 ← ★특례)

★**분모 측정기 0**(불릿 0 · 산문 명령형 + `text` 코드블록). **요구 3건은 실재**하므로 3행으로 전사한다. **행 수(3)가 분모(0)를 초과하는 것이 정상이다** — 근거는 `## 3. 미결·선행조건` 참조.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | 전체 Repository에서 Route 방향을 `source node → next node` 로 표준화하라 | 🔴**3벌 분열 실측**: `from`/`to`(`JourneyBuilder.php:126`,`:789`,`:799`) · `src_type`/`src_id`→`dst_type`/`dst_id`(`GraphScore.php:107-148`) · `predecessor_id`/`successor_id`(`PM/Dependencies.php:38-41`). 방향 **의미론은 셋 다 source→target 으로 일치**하나 **명명 표준 선언 0**. ★**[PM 판정] `CONSOLIDATION_REQUIRED` → `ABSENT` 정정** — ⓐ`CONSOLIDATION_REQUIRED` 는 "통합할 중복이 실재한다"는 주장인데 `approval_route`/`route_id` 는 `backend/src`+`frontend/src` **전수 0**(통합 대상 부재) ⓑ§23 의 규범적 스코프는 2문장(`:1288`)이 한정하는 **"Approval Route 내부 Canonical Direction"** 이며 그 Route 가 없다 ⓒ현행 3벌이 모두 source→target 인 것은 **우연한 일치이지 준수가 아니다**(규칙 7). 3벌 분열은 **§23 의 충족 근거가 아니라 신설 시 참조할 선례 목록**으로만 유효 | ABSENT |
| 2 | 다른 모듈에서 역방향을 사용하더라도 Approval Route 내부 Canonical Direction은 변경하지 마라 | Approval Route 모듈 부재 → Canonical Direction 선언 0. 불변식을 담을 자리가 없음 | ABSENT |
| 3 | Ancestor·Predecessor 조회는 별도 Index 또는 역방향 조회로 처리하라 | 역방향 Index 0. 인접: `PM/Dependencies.php:89-91` 은 `predecessor_id` 로 **정방향만** 조회 · `PM/Gantt.php:100` `$predOf[$d['successor_id']][]` = **메모리 내 역인덱스**(DB Index 아님 · 요청마다 재구축) · DB 기반 상향순회 선례 = `AdminMenu::wouldCycle:540-555` **1건뿐**(🔴`$visited` 없음 · 🔴`tenant_id` 없음 `:107-118` — 복제 금지) | ABSENT |

---

### §24. Route Entry·Exit (원문 줄 1294-1310 · 분모 8)

원문: *"모든 Active Route에는 다음을 요구하라."* (`:1307` 산문 — Multiple Entry 시 Virtual START Node — 는 불릿 밖 · `## 2.` 에 전사.)

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | 정확히 하나의 START Node | 🔴강제 0. `journeys` 는 START 선언이 없고 실행기가 `runEnrollment` 진입 시 노드를 관례로 집는다 · `$defaultNodes[0]='trigger_1'`(`JourneyBuilder.php:121`)은 **시드 리터럴**이지 불변식 아님. 복수 trigger 금지 코드 0 | ABSENT |
| 2 | 하나 이상의 Terminal Node | 🔴강제 0 · Terminal 유형 0 · 종료는 `nextNode:790`/`:809` 의 **빈 문자열 반환**(암묵) | ABSENT |
| 3 | 모든 Required Node가 START에서 도달 가능 | 🔴검증 0(`createJourney:135` 무검증 저장) · Required 축 0. 선례 = `PM/Gantt.php:104-119` Kahn 도달성 판정(PM 도메인) | ABSENT |
| 4 | 모든 Non-terminal Required Node가 Terminal로 도달 가능 | 🔴검증 0 · **역방향 도달성 판정기 레포 전무**(Gantt 는 정방향 Kahn 만) | ABSENT |
| 5 | 고립 Node 없음 | 🔴검증 0. 인접 = `Gantt:119-125` 가 위상정렬 잔여분으로 고립·순환을 **동시 판정**하나 **차단 아닌 best-effort 부분결과 degrade**(`:123` 주석) | ABSENT |
| 6 | 무한 경로 없음 | 🔴`journeys` acyclicity 미검증(`createJourney:512` 주석 자인) · 실행 시 순환 방어 0. 선례 = `PM/Dependencies.php:32-34` 쓰기 전 422 차단 + `:84` `$depth<10000` 안전밸브 | ABSENT |
| 7 | Branch 후 Merge가 필요한 정책이면 유효한 Merge 존재 | Merge 개념 0 → 검증 대상 부재(규칙 7) | ABSENT |
| 8 | Fallback Route가 종료 가능한 경로를 가짐 | Fallback Route 축 0. 🔴현행 폴백(`nextNode:811-812`)은 경로 보증이 아니라 **위치 추측** — 종료 가능성 미보장 | ABSENT |

---

### §25. Route Condition (원문 줄 1311-1368 · 분모 40)

`APPROVAL_ROUTE_CONDITION` — Condition Category 22 + 필수 필드 18. (`:1361`·`:1363`·`:1365` 산문 3건은 불릿 밖 · `## 2.` 에 전사.)

★**확장 기반 확정**: `RuleEngine`(`backend/src/Handlers/RuleEngine.php:24`)이 원문 *"허용된 DSL, Policy Engine 또는 Typed Expression"* 의 **레포 기존 선례**다 — 화이트리스트 `OPS:33`(`lt/lte/gt/gte/eq`) · `METRICS:32` · `compare:433-439` **순수 switch** · `default: return false`(`:438` — 미지 연산자 fail-closed) · 테이블 `:41-46` · **`eval` 미사용**(`eval(` grep = `backend/src` **0건** 재실증). **신규 표현식 엔진 신설 금지** — Part 2 Canonical DSL ADR(`docs/architecture/ADR_CANONICAL_SEGMENT_DSL*`)의 확장으로 처리하라.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | Category: REQUEST_TYPE | 열거 부재 · Route Condition 엔터티 0 | ABSENT |
| 2 | Category: REBATE_TYPE | 열거 부재 · Rebate 도메인 자체가 레포 0 | ABSENT |
| 3 | Category: RESOURCE_TYPE | 열거 부재 · 인접 = `MENU_CATALOG`(`TeamPermissions.php:55-82` 26개 + `validMenu:180` 강제) = **자원 레지스트리이나 메뉴 한정** — 리베이트/승인건은 자원 아님 | ABSENT |
| 4 | Category: TRANSACTION_TYPE | 열거 부재 | ABSENT |
| 5 | Category: ORGANIZATION | 열거 부재 · `ORGANIZATION_*` 11종 이름·능력 양쪽 0 | ABSENT |
| 6 | Category: ORGANIZATION_TYPE | 열거 부재 · 인접 `ORG_PRESET`(`TeamPermissions.php:706-722`) = **PHP 상수 15줄**(`seedOrg:739` INSERT 에 parent·manager 컬럼 없음) | ABSENT |
| 7 | Category: LEGAL_ENTITY | 열거 부재 · Legal Entity 이름·능력 0 | ABSENT |
| 8 | Category: COUNTRY | 열거 부재 · `country_code` 오염(TikTok 차원 `Connectors:2044` · IP Geo `Geo.php:106`) | ABSENT |
| 9 | Category: REGION | 열거 부재 | ABSENT |
| 10 | Category: PROGRAM | 열거 부재 | ABSENT |
| 11 | Category: PRODUCT | 열거 부재 · 인접 `DATA_SCOPES` 에 `product` 有이나 🔴`scopeChannelProduct:319-320` 이 brand·product **둘 다 SKU 컬럼에 매핑**(`:312` 자인) | ABSENT |
| 12 | Category: BRAND | 열거 부재 · 🔴brand 는 독립 차원 아님(위 #11) | ABSENT |
| 13 | Category: PARTNER | 열거 부재 · `agency_client_link`(`AgencyPortal.php:20`)는 테넌트↔테넌트 링크 | ABSENT |
| 14 | Category: CHANNEL | 열거 부재 · 인접 = `rule_engine.target`(`RuleEngine.php:43`) 채널 문자열(룰 대상이지 Route Condition 아님) | ABSENT |
| 15 | Category: CUSTOMER_SEGMENT | 열거 부재 · 실 세그 SoT = `crm_segments`+members(5-3-2 확정 · **마케팅 도메인** · 승인 라우팅 참조 0) | ABSENT |
| 16 | Category: RISK_REFERENCE | 열거 부재 · `hris` grep 오염 = `hig`+`hRis`+`k` | ABSENT |
| 17 | Category: AMOUNT_BAND_REFERENCE | 열거 부재. ★인접 = `Catalog.php:1016` `HIGH_VALUE_KRW = 5000000.0` + `:1103-1105` `$price >= HIGH_VALUE_KRW` → `requires_approval=true`·`approval_type='high_value'` = **레포 유일 금액 승인 임계이나 단일 상수·Band 아님**(재실증 완료) | ABSENT |
| 18 | Category: CURRENCY_REFERENCE | 열거 부재 · 🔴환율 `fxToKrw`(`Connectors.php:1749`)는 **컬럼도 이력도 없음** — `app_setting` KV 단일행 덮어쓰기(`:1804-1805`) → as-of 통화 조건 불가 | ABSENT |
| 19 | Category: AUTHORITY_RESULT_REFERENCE | 열거 부재 · 🔴Authorization Decision 로그 0 — 403 은 `makeJson` 즉시 반환(`backend/public/index.php:566`,`:576`) → **인가 결과를 참조할 산출물이 없다** | ABSENT |
| 20 | Category: MANAGER_RELATIONSHIP_REFERENCE | 열거 부재 · 🔴Manager Resolver ABSENT(상급자를 반환하는 함수 0 · `parent_user_id` 판독 12+개소 전량 1홉 tenant 해석 또는 `IS NULL` owner 판별) | ABSENT |
| 21 | Category: ATTRIBUTE_POLICY_REFERENCE | 열거 부재 · 🔴`data_scope` 개인(member) 범위가 강제 경로 미도달(`effectiveScope:253` 이 `'user'` 조회 · 쓰기는 `'member'` `:653` → 영구 0행) | ABSENT |
| 22 | Category: CUSTOM | 열거 부재 | ABSENT |
| 23 | approval_route_condition_id | 축 0 · 현행 조건은 참조 가능한 엔터티가 아니라 노드 `config` 인라인(`JourneyBuilder.php:124`) | ABSENT |
| 24 | tenant_id | 축 0 · 인접 `rule_engine.tenant_id`(`RuleEngine.php:42`) 有(확장 시 계승) | ABSENT |
| 25 | condition_code | 축 0 · `rule_engine` 은 `name`(`:42`)만 有 · 안정 코드 축 없음 | ABSENT |
| 26 | condition_name | 축 0 · 인접 `rule_engine.name VARCHAR(200)`(`:42`) | ABSENT |
| 27 | condition category | 축 0 · 인접 `METRICS:32` 6종 화이트리스트(채널 지표 한정 — 승인 카테고리 아님) | ABSENT |
| 28 | condition expression reference | 축 0. ★인접 = `RuleEngine` 3튜플 `metric`/`op`/`threshold`(`:43`) + `OPS:33` 화이트리스트 + `compare:433-439` — **참조가 아니라 인라인 컬럼**이나 **Typed Expression 선례로 확장 가능** | ABSENT |
| 29 | policy engine reference | 축 0 · 엔진 참조 개념 없음(`RuleEngine` 은 단일 하드와이어 평가기) | ABSENT |
| 30 | input schema | 축 0 · 🔴`evalCondition:820-823` 이 `config.field`/`op`/`value` 를 **무검증 캐스팅** — 스키마 선언 0 | ABSENT |
| 31 | output type | 축 0 · 현행 출력은 암묵 이진(`evalCondition:845` `? 'true' : 'false'` 문자열) | ABSENT |
| 32 | deterministic 여부 | 축 0 · 선언 0. 실동작상 `RuleEngine::compare:433-439` 는 순수함수(부수효과 0)이나 **속성으로 선언·강제되지 않음** | ABSENT |
| 33 | side effect free 여부 | 축 0 · 🔴`evalCondition:829-842` 은 평가 중 **DB 2회 질의**(`crm_customers` · `email_sends`) — 읽기전용이나 순수 아님 · 선언 축 없음 | ABSENT |
| 34 | fail closed 여부 | 축 0. ★현행 방향은 **암묵 fail-closed**: `evalCondition:844` `$actual = $facts[$field] ?? null` → `compare:850` `if ($a === null) return false` · `RuleEngine::compare:438` `default: return false`. 🔴**마케팅에선 안전(발송 안 함)이나 승인에선 방향이 반대** — false = "조건 불충족" 이 승인 라우팅에선 우회로 전락 가능 | ABSENT |
| 35 | missing input policy | 축 0 · 🔴현행은 정책이 아니라 **하드코딩 침묵 폴백**(`:844` `?? null` → 무조건 false · 미추적 신호와 실제 false 를 **구분 불가**) | ABSENT |
| 36 | effective_from | 축 0 · 🔴시점 질의 선례 부재 — `kr_fee_rule.effective_from`(`Db.php:898`) **컬럼 有·질의 無**(`WHERE effective_from <= :as_of` 전역 0 · 읽기 4개소 전부 `ORDER BY … DESC` 최신승 `Pnl.php:454`·`KrChannel.php:151`,`:459`) | ABSENT |
| 37 | effective_to | 축 0 · `effective_to` grep 0 | ABSENT |
| 38 | version | 축 0 · optimistic lock `version` 레포 0 | ABSENT |
| 39 | status | 축 0 · 인접 `rule_engine.enabled INTEGER`(`:44`) 이진 토글(status 아님) | ABSENT |
| 40 | evidence | 축 0 | ABSENT |

---

### §26. Route Branch (원문 줄 1369-1405 · 분모 21)

`APPROVAL_ROUTE_BRANCH` — 필수 필드 15 + Branch Type 6. (`:1400`·`:1402` 산문 2건 — 병렬 Task 실행 후속 · 이번엔 구조만 — 은 불릿 밖 · `## 2.` 에 전사.)

★**결정론 선례 재실증**: `split:609-621` → `pickWeighted:725-734` = `(($seed * 2654435761) + 1) % 100000`(`:730`) **enrollId 해시 기반 결정적 분배**(확률 아님 · 주석 `:724`,`:607-608` *"등록ID 결정적 분배 — 동일 고객 동일 분기·재현가능"*). **§4.7 "Chain Selection 결정론"의 선례로 승격 가능.** 🔴단 `:729` `if ($total <= 0) return (string)($keys[0] ?? 'a')` = **첫 키 폴백** — 복제 금지.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | approval_route_branch_id | 축 0 · 현행 분기는 엔터티가 아니라 노드 `config.branches` 인라인(`JourneyBuilder.php:612-613`) | ABSENT |
| 2 | route version | 축 0 | ABSENT |
| 3 | branch node | 축 0 · 인접 = `type==='split'` 노드(`:609`) | ABSENT |
| 4 | branch type | 축 0 · 🔴현행은 유형 없이 **가중치 분배 1종**뿐 | ABSENT |
| 5 | condition reference | 축 0 · 🔴`split` 은 조건을 **읽지 않는다**(가중치만 `:613`) · `condition` 노드는 인라인 `config`(`:124`) | ABSENT |
| 6 | branch keys | 축 0. 인접 = `$cfg['branches'][].key`(`:613` `trim((string)($b['key'] ?? ''))`) · 레거시 `weight_a` 2-way a/b 폴백(`:615`) — **열거·검증 0**(임의 문자열) | ABSENT |
| 7 | branch priorities | 축 0 · 🔴우선순위 없음 — 선택은 가중 누적구간(`pickWeighted:732`) · 엣지 해석은 첫 일치(`nextNode:799`) | ABSENT |
| 8 | default branch | 축 0 · 🔴암묵 기본 = `:729` **첫 키 폴백**(총가중 0 시) · `:733` `end($keys)` 말미 폴백 — 선언 아님 | ABSENT |
| 9 | maximum selected branches | 축 0 · 🔴현행은 **항상 정확히 1개 선택**(배타 택일 하드코딩) · 상한 선언 0 | ABSENT |
| 10 | minimum selected branches | 축 0 · 인접 = `:612` `count($cfg['branches']) >= 2` **입력 최소 분기 수**(선택 하한 아님) | ABSENT |
| 11 | exclusive 여부 | 축 0. 🔴실동작은 **배타 고정**(`pickWeighted` 가 단일 문자열 반환 `:725`)이나 **속성으로 선언·전환 불가** | ABSENT |
| 12 | parallel reference 여부 | 축 0 · **병렬 fork 능력 0**(`nextNode:603`,`:619` 이 `$nodeId` 를 단일 값으로 덮어씀 = 실행 포인터 1개) | ABSENT |
| 13 | merge requirement | 축 0 · Merge 개념 0 | ABSENT |
| 14 | status | 축 0 | ABSENT |
| 15 | evidence | 축 0 · 인접 = `logNode(…, 'split', ['branch'=>$pick,'branches'=>$branches])`(`:617`) **분기 결과 로그**(근거 계약 아님) | ABSENT |
| 16 | Branch Type: EXCLUSIVE | 열거 부재. 🔴실동작은 배타이나 **우연한 일치**(대안이 구현되지 않아서일 뿐 — 규칙 7) | ABSENT |
| 17 | Branch Type: INCLUSIVE | 열거 부재 · 능력 0 | ABSENT |
| 18 | Branch Type: MULTI_SELECT_REFERENCE | 열거 부재 · 능력 0 | ABSENT |
| 19 | Branch Type: CONDITION_SET | 열거 부재 · 🔴조건 집합 개념 0(단일 `field`/`op`/`value` `:821-823`) | ABSENT |
| 20 | Branch Type: POLICY_RESOLVED | 열거 부재 · 정책 해석기 0 | ABSENT |
| 21 | Branch Type: CUSTOM | 열거 부재 | ABSENT |

---

### §27. Route Merge (원문 줄 1406-1435 · 분모 16)

`APPROVAL_ROUTE_MERGE` — 필수 필드 11 + Merge Policy Reference 5. (`:1432` 산문 — 실제 Wait·Join 은 후속 Execution Governance — 은 불릿 밖 · `## 2.` 에 전사.)

🔴**§72-11 위반이 레포에 실재**: `nextNode:799` `if (in_array($ws, $want, true)) return (string)($e['to'] ?? '');` = **첫 일치 즉시 return** → 다중 일치 **무탐지·무기록**. Route Conflict 개념이 성립할 자리가 없다.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | approval_route_merge_id | 축 0 · Merge 엔터티 0 | ABSENT |
| 2 | route version | 축 0 | ABSENT |
| 3 | merge node | 축 0 · MERGE 노드 유형 0(§21 #6) | ABSENT |
| 4 | incoming branch references | 축 0. 🔴**구조적 불가** — `journeys.edges` 에 엣지 id 가 없어(`JourneyBuilder.php:126`) 유입 엣지를 참조할 식별자가 존재하지 않는다 | ABSENT |
| 5 | merge policy reference | 축 0 | ABSENT |
| 6 | required incoming count | 축 0. 인접 = `required_approvals`(`Mapping.php:287` 레포 유일 정족수 실집행)이나 🔴**유일 생산자가 리터럴 `2`**(`Mapping.php:209-210` INSERT 10번째 인자 · `Db.php:634` `DEFAULT 2`) · UPDATE·설정 API 전수 0 → **요건 모델이 아니라 상수** · 노드 유입 개수와 무관 | ABSENT |
| 7 | wait policy reference | 축 0 · 🔴대기 개념은 `journeys` 의 `delay`/`waiting`(`:595`)뿐 = **시간 대기**이지 Join 대기 아님 | ABSENT |
| 8 | timeout policy reference | 축 0 · 승인 타임아웃 축 0 · `escalat` grep 오염(`Reviews.php:173-187` 부정리뷰 Slack 통지) | ABSENT |
| 9 | fallback reference | 축 0 | ABSENT |
| 10 | status | 축 0 | ABSENT |
| 11 | evidence | 축 0 | ABSENT |
| 12 | Merge Policy: ALL_SELECTED_BRANCHES_REFERENCE | 열거 부재 · 실행 포인터 1개(`:603`,`:619`) → 합류 대상 자체가 없음 | ABSENT |
| 13 | Merge Policy: ANY_SELECTED_BRANCH_REFERENCE | 열거 부재 | ABSENT |
| 14 | Merge Policy: REQUIRED_BRANCHES_REFERENCE | 열거 부재 | ABSENT |
| 15 | Merge Policy: POLICY_RESOLVED | 열거 부재 | ABSENT |
| 16 | Merge Policy: CUSTOM | 열거 부재 | ABSENT |

---

## 2. 설계 계약

후속 구현이 지켜야 할 계약이다. **코드가 아니다.** 본 세션 코드 변경 0.

### 2.1 원문 산문 요구(분모 밖 · 계약으로 승격)

| 출처 | 원문 요구 | 계약 |
|---|---|---|
| §21 `:1225` | *"이번 단계에서 `TERMINAL_REJECTED`, `CANCELLED`의 실제 실행 전이는 구현하지 말고 Reference Contract만 구축하라."* | `TERMINAL_REJECTED_REFERENCE`·`TERMINAL_CANCELLED_REFERENCE` 는 **참조 계약만**. 상태 전이 실행기 작성 금지. |
| §24 `:1307` | *"Multiple Entry가 필요한 경우 Virtual START Node를 생성하라."* | 복수 진입은 Virtual START 로 정규화 — "START 정확히 1개" 불변식(§24 #1)을 예외 없이 유지. |
| §25 `:1361` | *"금액·통화 조건은 실제 Authority 계산을 수행하지 말고 Amount Band 또는 Authority Result Reference만 사용하라."* | Route Condition 은 금액을 **계산하지 않는다**. `Catalog.php:1016` `HIGH_VALUE_KRW` 는 `APPROVAL_CHAIN_APPLICABILITY` 의 **Amount Band 로 승격하고 상수 은퇴**. **신규 임계 상수 추가 금지.** |
| §25 `:1363` | *"Condition Expression을 임의 코드 실행 문자열로 저장하지 마라."* | 현행 준수 상태 유지 — `eval(` grep `backend/src` **0건**(재실증). 회귀 시 CI 게이트 대상. |
| §25 `:1365` | *"허용된 DSL, Policy Engine 또는 Typed Expression을 사용하라."* | **`RuleEngine` 확장**(`RuleEngine.php:24` · `OPS:33` 화이트리스트 · `compare:433-439` switch). **신규 표현식 엔진 신설 금지** — Part 2 Canonical DSL ADR 의 확장. |
| §26 `:1400`,`:1402` | *"실제 병렬 Task 실행은 후속 블록에서 구현한다. 이번 단계에서는 선택 가능한 Route 구조만 정의하라."* | Branch 는 **구조 정의만**. 병렬 실행기 작성 금지. |
| §27 `:1432` | *"실제 Wait·Join 실행은 후속 Execution Governance에서 구현한다."* | Merge 는 **구조 정의만**. Wait·Join 실행기 작성 금지. |

### 2.2 확장할 것 — 신설 금지(§63 중복 방지)

| 요구 | 확장 대상(정본 경로) | 추출할 것 / 동반 이식 금지할 것 |
|---|---|---|
| §22 #34·#35 · §24 #3·#5·#6 DAG 검증 | `backend/src/Handlers/PM/Dependencies.php:79-100` + `backend/src/Handlers/PM/Gantt.php:104-125` | **추출**: 반복 DFS + `$visited`(`:81`) + **tenant 필터 매 홉**(`:91`) + **쓰기 전 차단**(`:32-34` 422 `cycle_detected`) + self-loop(`:29-31`) + **Kahn 위상정렬**(`Gantt:104-118`) + 도달성·고립 동시 판정(`:119`). **알고리즘만 추출 · 스키마 복제 금지**(`:90-91` `dep_type` 술어 부재 결함 동반 이식 위험). 🔴**`:32-34` 가 422 조기반환하여 `:48` `auditLog` 미도달 → 순환 탐지 시 감사 이벤트 없음** — §58/§61 에서 이 결함 복제 금지. 🔴경로 표기는 `backend/src/Handlers/PM/…`(**`backend/src/PM/` 는 존재하지 않는다**). |
| §25 조건 표현식 | `backend/src/Handlers/RuleEngine.php:24` | 화이트리스트(`OPS:33`) · 순수 switch(`compare:433-439`) · 미지 연산자 `default: return false`(`:438`) · tenant 컬럼(`:42`) 계승. **신규 엔진 금지.** |
| §18 #22 · 전 섹션 evidence | `backend/src/SecurityAudit.php:27`,`:45-52`,`:56-68` | tenant 포함 해시 · `prev_hash`/`hash_chain` DDL · **`verify()` `hash_equals` 검증기**. 🔴**`menu_audit_log.hash_chain` 을 선례로 인용 금지** — preimage `'ts'=>date('c')`(`AdminMenu.php:195`) vs 저장 `created_at … DEFAULT CURRENT_TIMESTAMP`(`:129`) → **재구성 불가** · `hash_equals` grep 0 = 검증 불가능한 장식. |
| §23 ⓒ 역방향 조회 | 신설(선례 부재) | `PM/Gantt.php:100` `$predOf` 는 **요청마다 메모리 재구축** — DB Index 아님. `AdminMenu::wouldCycle:540-555` 는 🔴`$visited` 없음·`tenant_id` 없음(`:107-118`) → **복제 금지**. |

### 2.3 ★이식 시 절대 복제 금지 — 286차 실장애 근거

| 반패턴 | 위치(재실증) | 근거 |
|---|---|---|
| **무라벨 위치 폴백** | `JourneyBuilder.php:811-812` `$idx = in_array($bl,['true','a','yes','1'],true) ? 0 : (count($cand)>1 ? 1 : 0)` | 🔴🔴**§72-10 위반이 레포에 살아 있다.** `:809` `if ($hasLabeled) return ''` = **BLOCK_ON_NO_MATCH 이나 라벨 그래프에만** · `:811-812` 무라벨 레거시에 위치 폴백 **존치** · `:814` 분기 없으면 첫 후보 반환. 286차 실 장애(주석 `:801-803`): 위치 폴백이 *"조건 불충족 고객을 엉뚱한 분기(예: YES 보상)로 오발송"*. → **§22 `BLOCK_ON_NO_MATCH` 는 확립된 의미론이 아니라 조건부로만 확립. Approval 이식 시 무라벨 폴백 분기 절대 복제 금지.** |
| **첫 일치 즉시 return** | `JourneyBuilder.php:799` | 🔴**§72-11 위반.** 다중 일치 **무탐지·무기록** → §27 Merge·Route Conflict 직결. Approval Route 는 **다중 일치를 Conflict 로 검출·기록**해야 한다(우선순위 침묵 해소 금지). |
| **첫 키 폴백** | `JourneyBuilder.php:729` `if ($total<=0) return (string)($keys[0] ?? 'a')` | §72-10 유사. 결정론 선례(`pickWeighted:730`)는 승격하되 **이 폴백은 제외**. |
| **무음 강등 폴백** | `TeamPermissions.php:342` `in_array($stype, self::DATA_SCOPES)` → `'own'` | 승인 도메인은 **422 fail-closed** 권고. |
| **무검증 그래프 저장** | `JourneyBuilder.php:135`,`:153-154` `json_encode($b['nodes'])` | §39 가 걸릴 자리가 없어진다. Approval Route 는 **쓰기 전 검증**(`PM/Dependencies.php:32-34` 패턴). |
| **임의 타입 자동삽입** | `GraphScore.php:126-133`(`upsertNode:57-59` 화이트리스트가 `upsertEdge` 엔 없음) | 노드 유형 게이트 우회. Approval 은 열거 강제. |

### 2.4 §25 fail-closed 방향 반전 — 최우선 설계 결정

현행 `evalCondition:844` `?? null` → `compare:850` `if ($a===null) return false` 는 **마케팅에선 안전**(신호 미추적 시 발송 안 함)하나 **승인에선 방향이 반대**다 — 승인 라우팅에서 `false` 는 "이 단계를 건너뛴다"로 귀결될 수 있어 **미추적 신호가 곧 승인 우회**가 된다. → `APPROVAL_ROUTE_CONDITION.fail closed 여부` + `missing input policy` 는 **입력 부재와 조건 불충족을 반드시 구분**해야 하며(현행은 구분 불가), 기본값은 **BLOCK**이어야 한다.

---

## 3. 미결·선행조건

### 3.1 ★§23 특례 — 행 수(3) > 분모(0) 는 정상

§23 Route 방향 표준(1280-1293)은 **불릿 0**(산문 명령형 + `text` 코드블록)이므로 **분모 측정기가 0 을 반환**한다. 그러나 요구 3건(ⓐ`source node → next node` 표준화 ⓑ타 모듈 역방향이어도 Canonical Direction 불변 ⓒAncestor·Predecessor 별도 Index/역방향 조회)은 **원문에 실재**한다. 규율의 §23·§43 특례 조항에 따라 **3행으로 전사**했다. **행 수가 분모를 초과하는 것이 이 섹션에서는 정상이며, 날조가 아니다.** 나머지 8개 섹션은 분모와 행 수가 **전건 일치**한다(§18=31 · §20=24 · §21=34 · §22=36 · §24=8 · §25=40 · §26=21 · §27=16 · 합계 210).

### 3.2 ★★Canonical DAG SoT 부재증명 — `APPROVAL_ROUTE_*` 신규 SoT 구축이 정합

**§70 Step 2 확정: 후보 셋 다 아니다.** 따라서 §72-18(*"Workflow Engine 과 별도 Route Source of Truth 를 만들지 마라"*)·§6(*"기존 Workflow Definition 이 범용 DAG 를 제공한다면"*)은 **양쪽 다 전건이 거짓 → 금지가 발동하지 않는다.** `APPROVAL_ROUTE_*` **신규 SoT 구축이 정합**이며, 이는 §63 중복 신설이 아니다.

| 후보 | 탈락 사유(결정적 · 본 전사에서 재실증) |
|---|---|
| `JourneyBuilder` | ❶**정의 계층 공백** — `createJourney:135`/`updateJourney:153-154` `nodes`/`edges` **무검증 `json_encode`**(재실증), `:512` 주석이 acyclicity 미검증 자인 → §39 가 걸릴 자리 없음 ❷🔴**엣지에 id 없음**(`:126` `['from'=>…,'to'=>…]` · 매칭 `:789`,`:796`) → **§22 Route Edge 참조 불가**(§27 #4 도 구조적 불가) ❸**`customer_id` 하드 전제**(`:551`,`:556`,`:822`,`:824`) ❹version/effective **0** |
| `graph_node`/`graph_edge` | ❶**DAG 아니라 그래프 스토어** — `upsertEdge:107-148` **acyclicity 검사 없음**(재실증) ❷**순회기 0** — `GraphScore:193~297` = `influencer→creative→sku→order` **하드코딩 3-hop** ❸판독자 4종 하드와이어 ❹**내부 생산자 0 → VACUOUS 미배제** ❺`upsertNode:57-59` 화이트리스트가 `upsertEdge` 엔 없어 `:126-133` 이 임의 타입 자동삽입 |
| `pm_task_dependencies` | ❶**DAG "검증기"이지 "엔진" 아님** — 노드타입 0·조건 0·실행기 0 ❷도메인=PM(`dep_type ENUM('FS','SS','FF','SF')`=일정 의존) ❸`:90-91` `dep_type` 술어 부재 |

### 3.3 선행조건 — 본 문서 9개 섹션이 BLOCKED 인 이유

| 선행조건 | 차단 대상 | 사유 |
|---|---|---|
| **Chain Version 축 확립**(§19 · VERSIONING 문서) | §18 #2 · §20 #13 · §21 #17 · §22 #2,#32 · §26 #2 · §27 #2 | Route 는 Chain Version 에 매달린다. Version 축 없이 Route 정의 불가. |
| **Reporting Line Foundation**(§3.2 — REAL 0) | §18 #11 · §21 #7,#25 · §25 #20 · §28 Hierarchical Route 전체 | 🔴🔴**`parent_user_id` 는 상급자를 표현할 수 없다** — 전 4 생성경로가 owner 하드고정(`UserAuth::createTeamMember:1225-1227` 주석 자인 · `EnterpriseAuth::provisionUser:502` · `createSubAdmin` `UserAuth:1549`,`:1576` · sub 계정생성 차단 `:1254-1256`). **컬럼 재사용 불가 · 쓰기 경로부터 변경 필요.** |
| **권한 축 단일화**(§3.4 최대 미결) | §21 #8,#26 · §25 #19 | `$roleRank`(`backend/public/index.php:554`) ↔ `team_role` **매핑 코드 전수 0**. `$roleRank` 판정 축 = **HTTP 메서드**(`:568`) → "무엇을 하는가"만 묻고 "누구인가"를 묻지 않는다. **"이 행위자가 이 단계를 승인할 권한이 있는가"를 물을 정본 축이 없다.** |
| **마이그레이션 경로**(#43 ABSENT) | 전 섹션 물리 스키마 | `backend/migrations/` **21파일 · `20260527_172_002` 정지** · approval/chain/route/workflow 마이그레이션 0 → `ensureTables` 멱등에 의존. ★**`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다** → §48 Retroactive 집행 수단 없음. |
| **§67 Cache** | Route 컴파일 캐시 | 서버 캐시 계층 자체가 부재(Redis/Memcached 0 · `apcu_*` 는 `SystemMetrics.php:225-451` 지표 보고 전용) → **무효화할 캐시가 없다**(규칙 7). |

### 3.4 자진 신고

1. **판정 단일화의 보수성**: 9개 섹션 210행 **전량 ABSENT**(★§23 ⓐ 는 `CONSOLIDATION_REQUIRED` 로 초안됐으나 **PM 판정으로 `ABSENT` 정정** — 아래 2 참조). 이는 `APPROVAL_ROUTE_*` 가 이름·능력 양쪽 0(부재증명: `approval_route`/`route_id`/`APPROVAL_ROUTE` grep 전수 0)이기 때문이다. **인접 구현(`RuleEngine`·`PM/Dependencies`·`pickWeighted`)은 확장 기반으로서 실측 칸에 인용했으나, 원문 항목(= Approval Route 의 필드/열거)을 충족하지는 않으므로 `PARTIAL` 로 올리지 않았다.** 미달을 부분충족이라 부르면 통합 결과가 자동으로 "기능 유지"로 위장된다(규칙 6).
2. ★**§23 ⓐ — PM 판정 완료: `ABSENT` 확정**(전사자가 약한 앵커로 자진 신고하고 PM 확인을 요청한 건). 초안 `CONSOLIDATION_REQUIRED` 를 기각한 근거 3:
   - ⓐ **`CONSOLIDATION_REQUIRED` 는 "통합할 중복이 실재한다"는 주장**이다. 그러나 `approval_route`/`route_id`/`APPROVAL_ROUTE` 는 `backend/src`+`frontend/src` **전수 0** — **통합 대상이 없다.** 없는 것을 "통합 필요"라 부르면 후속 차수가 실재하지 않는 선행 구현을 찾아 헤맨다.
   - ⓑ **§23 의 규범적 스코프는 2문장(`:1288`)이 한정한다** — *"다른 모듈에서 역방향을 사용하더라도 **Approval Route 내부** Canonical Direction 은 변경하지 마라."* 즉 §23 은 타 모듈의 명명을 통일하라는 요구가 **아니다**. 대상은 Approval Route 내부이며 그것이 부재한다.
   - ⓒ **현행 3벌이 모두 source→target 인 것은 우연한 일치이지 준수가 아니다**(규칙 7). 세 구현은 서로 독립 도메인에서 각자 그렇게 됐을 뿐 §23 을 이행한 바 없다. **우연한 일치를 준수로 계산하면 커버리지가 거짓으로 오른다.**
   → 3벌 분열 실측(`from`/`to` · `src_*`/`dst_*` · `predecessor_id`/`successor_id`)은 **§23 의 충족 근거가 아니라, 신설 시 참조할 선례 목록**으로만 유효하다.
3. **줄번호 정정 2건(경미)**: ⓑ 앵커의 `compare:848(if($a===null) return false)` — `compare` **정의부는 `:848` 이 맞으나 null 가드는 `:850`** 이다(본문은 `:850` 으로 표기). ⓑ 앵커의 RuleEngine `테이블 :43` — **`CREATE TABLE rule_engine` 은 `:41` 에서 시작**하고 `:43` 은 `metric`/`op`/`threshold` 컬럼 줄이다(본문은 `:41-46` 으로 표기).
4. **미확인**: `PM/Gantt.php:104-125` 는 재실증했으나 `GraphScore:193~297` 하드코딩 3-hop · `AdminMenu::wouldCycle:540-555` · `TeamPermissions` 계열 · `EnterpriseAuth::provisionUser:502` 는 **ⓑ 앵커를 그대로 계승**했고 본 전사에서 정의부를 재열람하지 않았다(배정 범위 밖). 인용은 실측 칸의 **인접 근거**로만 쓰였고 어떤 행의 판정도 이들에 의존하지 않는다(전건 ABSENT).
5. **§21 `:1225`·§24 `:1307`·§25 `:1361-1365`·§26 `:1400-1402`·§27 `:1432` 는 원문에 실재하는 요구이나 불릿이 아니어서 분모 밖**이다. 분모를 지키기 위해 표에 넣지 않고 `## 2.1` 에 계약으로 전사했다(§23 과 달리 이들 섹션은 분모가 0 이 아니므로 특례 대상이 아니다).
