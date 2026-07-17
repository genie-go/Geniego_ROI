# Approval Chain Compilation & Validation

> EPIC 06-A Part 4-5-3-1-5-3-3-3 · 원문 §38, §39 전사
> 원문 정본: `docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_3_VERBATIM.md`
> 판정 근거: 289차 ⓑ 전수조사(105항목) 실측. 코드 변경 0.

## 1. 원문 전사

### §38. Approval Chain Compilation (원문 줄 1825-1879 · 분모 39)

`APPROVAL_CHAIN_COMPILATION` — Definition을 Runtime에서 안전하게 사용할 수 있는 불변 Artifact로 Compile하라.

#### 필수 필드 (24)

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | approval_chain_compilation_id | `approval_chain_compilation` 이름 grep 0 (backend/src 전수) | ABSENT |
| 2 | chain version | Chain 도메인 version 축 0. version 선례 = `AdminMenu.php:309` `menu_defaults.version` 리터럴 `'baseline'` | ABSENT |
| 3 | template version | Workflow Template = `JourneyBuilder.php:120-126` `$defaultNodes`/`$defaultEdges` PHP 리터럴 시드(생성 시 1회 복사) · 레지스트리·버전 전무 | ABSENT |
| 4 | route version | `approval_route`/`route_id` grep 0 (`route` 단독 = SPA URL `menu_tree.route` · `backend/src/routes.php` FP) | ABSENT |
| 5 | compiler version | 컴파일러 자체 부재 | ABSENT |
| 6 | source structure hash | 구조 해시 0. 해시 선례 = `SecurityAudit.php:27`(감사 로그 체인) · `Migrate.php:50` `schema_migrations.checksum`(DDL 파일) — 둘 다 그래프 구조 해시 아님 | ABSENT |
| 7 | compiled artifact | 컴파일 산출물 저장처 전무 | ABSENT |
| 8 | compiled stage index | Stage 개념 0 (`stage`/`sc_stages` = `SupplyChain.php:50-54` 물류 마일스톤 체크리스트 FP) | ABSENT |
| 9 | compiled level index | `approval_level` grep 0 | ABSENT |
| 10 | compiled node index | `journeys.nodes` MEDIUMTEXT(`JourneyBuilder.php:38`) = 원본 JSON 무검증 저장(`:135` `json_encode`) · 인덱스 아님 | ABSENT |
| 11 | compiled edge index | `journeys.edges` 엣지에 **id 없음**(`from`+`when` 매칭 `:789`,`:796`) → 인덱싱 대상 식별자 부재 | ABSENT |
| 12 | compiled condition index | 조건은 노드 config 인라인(`:818` `evalCondition`) · 색인 0 | ABSENT |
| 13 | topological order | 위상정렬 **알고리즘**은 `PM/Gantt.php:104-118`(Kahn) 실재하나 **요청마다 인메모리 계산·미저장 · PM 태스크 일정 도메인** | ABSENT |
| 14 | entry node | ★`JourneyBuilder.php:198` `$startNode = $nodes[0]['id'] ?? 'trigger_1'` = **배열 위치 기반 첫 원소** · 선언·유일성 검증 0 | ABSENT |
| 15 | terminal nodes | Terminal 선언·검증 0 (`nextNode:790` `if(!$cand) return ''` = 런타임 무연결 종료) | ABSENT |
| 16 | minimum depth | 깊이 축 0 (`depth` grep = `AdminMenu:544`·`Dependencies:84` 루프 지역변수 FP) | ABSENT |
| 17 | maximum depth | 동상. `Dependencies:84` `$depth < 10000`·`AdminMenu:541` `$depth<100` = 폭주 가드이지 산출 필드 아님 | ABSENT |
| 18 | unresolved references | 참조 해소 단계 자체 부재 | ABSENT |
| 19 | warning count | `PM/Gantt.php:119-125` 가 cycle 시 경고 degrade 하나 **응답 전용·미저장·PM 도메인** | ABSENT |
| 20 | error count | 동상 | ABSENT |
| 21 | compiled_at | 컴파일 이벤트 부재 | ABSENT |
| 22 | immutable_hash | 불변 해시 정본 선례 = `SecurityAudit.php:27`(tenant 포함 sha256) + `:45-52` DDL(`prev_hash`/`hash_chain`) + `verify():56-68` `hash_equals` 검증기 — **감사 로그 도메인 · Chain 0** | ABSENT |
| 23 | status | `journeys.status`(`:38` DEFAULT `'draft'`) 는 여정 상태이지 컴파일 산출물 상태 아님 | ABSENT |
| 24 | evidence | Evidence 축 0 | ABSENT |

#### Compilation 시 수행 (15)

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 25 | Reference Resolution | 참조 해소기 0. `findNode:519-520` = **런타임** 미발견 시 여정 중단(활성화 전 해소 아님) | ABSENT |
| 26 | Stage·Level Index 생성 | Stage·Level 개념 0 | ABSENT |
| 27 | Node·Edge Index 생성 | 엣지 식별자 부재(`:789`,`:796`) → 색인 불가 | ABSENT |
| 28 | Topological Sort | ★`PM/Gantt.php:104-118` **Kahn 위상정렬 실동작**(`$indeg` → `$queue` → `$topo`) · 추출·재사용 대상 · Chain 도메인 미적용 | LEGACY_ADAPTER |
| 29 | Cycle Detection | ★`PM/Dependencies.php:79-100` **반복 DFS + `$visited`(`:81`,`:86-87`) + tenant 필터 매 홉(`:91`) + 쓰기 전 차단 `:32-34`(422 `cycle_detected`)** · `PM/Gantt.php:119` `count($topo)!==count($taskMap)` 병행 | LEGACY_ADAPTER |
| 30 | Reachability Validation | ★**PM 앵커 정정**: Kahn 잔여(`Gantt:119`)는 **순환만** 판정한다 — 진입점 미도달 노드는 indeg 0 이라 `$topo` 에 정상 포함됨 → **도달성 판정 아님**. Chain·PM 양쪽 도달성 검증기 0 | ABSENT |
| 31 | Terminal Validation | Terminal 선언 0 → 검증 대상 없음 | ABSENT |
| 32 | Condition Type Validation | 조건 타입 검증 0. `journeys.nodes` 무검증 `json_encode`(`:135`) · `RuleEngine.php:33` `OPS` 화이트리스트는 **평가 시점 연산자 제한**이지 컴파일 시 타입 검증 아님 | ABSENT |
| 33 | Applicability Validation | Applicability 축 0 (금액 임계 유일 선례 = `Catalog.php:1016` `HIGH_VALUE_KRW = 5000000.0` → `:1103-1105` `requires_approval=true`) | ABSENT |
| 34 | Tenant Boundary Validation | 순회 중 tenant 강제 선례 = `PM/Dependencies.php:91`(매 홉 `WHERE tenant_id = ?`) — 스코프 제한이지 **경계 위반 검증기 아님** · 대조군 `AdminMenu::wouldCycle:540-555` 는 tenant_id 술어 없음 | ABSENT |
| 35 | Version Compatibility Validation | 버전 축 0 → 호환성 검증 대상 없음 | ABSENT |
| 36 | Authority Reference Validation | 🔴`acl_permission.approve` 는 `ACTIONS:39` 실재·`normActions:186` 강제·`seedOrg:711` 시드되나 **승인 가부를 판정하는 판독자 0**(`actionsCover:194` 유일 호출처 `:639` = 위임 상한 검증) | ABSENT |
| 37 | Actor Resolver Reference Validation | Approval Manager Resolver **능력 기준 ABSENT** — `resolveApprover`/`next_approver`/`approver_id` 승인 히트 0 · 4경로 전량 "호출자가 곧 승인자" | ABSENT |
| 38 | Fallback Termination Validation | Fallback 종료 검증 0. 🔴 반례 실재 = `JourneyBuilder.php:811-812` 무라벨 위치 폴백 · `pickWeighted:729` `if($total<=0) return $keys[0]` | ABSENT |
| 39 | Hash 생성 | 해시 생성기 선례 = `SecurityAudit.php:27` (감사 도메인) · Chain 0 | ABSENT |

> 원문: *"Compiled Artifact는 Source Definition을 대체하지 않는다."* (1876) — 산문 1건, 분모 외. §2 계약에 반영.

---

### §39. Chain Validation (원문 줄 1880-1928 · 분모 38)

`APPROVAL_CHAIN_VALIDATION` — 활성화 전에 최소 다음을 검증하라.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | Tenant 존재 | 🔴**Tenant 마스터 테이블 없음** — `api_key.tenant_id` = FK 없는 VARCHAR(`Db.php:944`) · 테넌트 열거 = `SELECT DISTINCT` **19개소 역추론** → "존재" 검증 불가 | ABSENT |
| 2 | Chain Definition 존재 | `approval_chain` 이름 grep 0 | ABSENT |
| 3 | Chain Version 존재 | version 축 0 | ABSENT |
| 4 | Template Version 존재 | `JourneyBuilder.php:120-126` 시드 리터럴 = 버전 없음 | ABSENT |
| 5 | Chain Type 유효 | Chain Type 열거 0 (규칙 8: 열거 부재 → "열거에 없다" 무효) | ABSENT |
| 6 | 하나 이상의 Stage 존재 | Stage 개념 0 (`SupplyChain.php:50-54` = 물류 체크리스트 FP) | ABSENT |
| 7 | 각 Required Stage에 Level 존재 | Stage·Level 양축 0 | ABSENT |
| 8 | Stage Code 유일 | 동상 | ABSENT |
| 9 | Level Code 유일 | 동상 | ABSENT |
| 10 | START Node 정확히 하나 | 🔴`JourneyBuilder.php:198` `$nodes[0]['id'] ?? 'trigger_1'` = **위치 기반 첫 원소 채택** · 유일성 검사 0 · `createJourney:135` 무검증 저장 | ABSENT |
| 11 | Terminal Node 하나 이상 | Terminal 선언·검증 0 | ABSENT |
| 12 | Node Reference 유효 | `findNode:519-520` = **런타임** 미발견 시 `$nodeId=''` 중단 — 활성화 전 검증 아님 | ABSENT |
| 13 | Edge Reference 유효 | 엣지에 id 없음(`:789`,`:796`) → 참조 무결성 검사 불가 | ABSENT |
| 14 | 모든 Required Node Reachable | ★**PM 앵커 정정**: `Gantt:119` Kahn 잔여는 순환 전용 — 고아 노드는 indeg 0 로 `$topo` 에 포함되어 **도달성 미판정**. 도달성 검증기 0 | ABSENT |
| 15 | 모든 Required Node에서 Terminal Reachable | 역방향 도달성 검증기 0 (`Gantt:153` backward pass = CPM 일정 계산이지 도달성 검증 아님) | ABSENT |
| 16 | Self-loop 없음 | ★`PM/Dependencies.php:29-31` `if ($pred === $succ) return 422 self_dependency` — **쓰기 전 차단 실동작** | LEGACY_ADAPTER |
| 17 | 허용되지 않은 Cycle 없음 | ★`PM/Dependencies.php:32-34` → `validateDependency:79-100`(DFS·`$visited`·tenant 매 홉 `:91`) = **활성화(쓰기) 전 차단**. 🔴`JourneyBuilder:511-518` 은 **런타임 탐지**(주석 `:512` acyclicity 미검증 자인)이므로 §39 선례 **아님** | LEGACY_ADAPTER |
| 18 | 고립 Node 없음 | ★**PM 앵커 정정**: Kahn 은 고립 노드를 정상 처리(indeg 0 → `$topo` 포함)하므로 **고립 판정 불가**. 고립 검증기 0 | ABSENT |
| 19 | 동일 Source의 Default Edge 충돌 없음 | 🔴`JourneyBuilder::nextNode:799` **첫 일치 즉시 return** → 다중 일치 **무탐지·무기록**(§72-11 위반이 마케팅 도메인에 실재) | ABSENT |
| 20 | Branch Default 유효 | 🔴`nextNode:811-812` 무라벨 그래프 위치 폴백(`$idx = in_array($bl,['true','a','yes','1']) ? 0 : (count($cand)>1 ? 1 : 0)`) = **default 선언이 아니라 위치 추측** | ABSENT |
| 21 | Merge Reference 유효 | Merge 노드 개념 0 (`JourneyBuilder` 분기는 배타 택일만 — `condition:600`→`:818` · `split:610`→`pickWeighted:725`) | ABSENT |
| 22 | Condition Schema 유효 | `createJourney:135`/`updateJourney:153-154` **무검증 `json_encode`** → 스키마 검증 지점 없음 | ABSENT |
| 23 | Condition Expression 안전 | `RuleEngine.php:24` 화이트리스트(`OPS:33`)·`compare:433-439` switch·**`eval` 미사용**(backend/src `eval`/`create_function`/`system` 0) = §25 선례. 🔴 단 **Chain 조건 자체가 없어 "안전"이 대상 부재의 결과**(규칙 7 — 우연한 준수 계산 금지) | ABSENT |
| 24 | Applicability 유효 | Applicability 모델 0. 유일 인접 = `Catalog.php:1016`,`:1103-1105` 금액 임계 상수 | ABSENT |
| 25 | Selection Policy 유효 | Selection Policy 0. ★결정론 선례 = `pickWeighted:730` `((($seed*2654435761)+1) % 100000)`(enrollId 해시 결정적 분배) — 마케팅 분기 도메인 | ABSENT |
| 26 | Priority 충돌 없음 | Priority 축 0 (`source_priority` = `DataPlatform.php:65`,`:184` **데이터소스 Trust 우선순위** FP) | ABSENT |
| 27 | Effective Period 유효 | `kr_fee_rule.effective_from`(`Db.php:898`) **컬럼 有·질의 無**(`WHERE effective_from <= :as_of` 전역 0 · 읽기 4개소 전부 `ORDER BY ... DESC` 최신승) · `effective_to`/`valid_from`/`valid_to` grep **0**(`Onsite.php:396` `invalid_token` FP 유일) | ABSENT |
| 28 | Cross-Tenant Reference 없음 | ★`PM/Dependencies.php:91` 순회 매 홉 `WHERE tenant_id = ?` = **레포 유일 tenant 격리 그래프 순회** · 추출 대상. 🔴 대조군 `AdminMenu::wouldCycle:540-555` 는 tenant_id 술어 **없음**(`:107-118`) — 이 결함 복제 금지 | LEGACY_ADAPTER |
| 29 | Legal Entity Scope 유효 | 🔴**Legal Entity 이름·능력 0** — 유일 히트 `MarketingDataHub.php:181` "한국 법인 철수" = 데모 문자열. `'company'` scope 는 법인이 아니라 **무제한 센티넬**(`TeamPermissions::effectiveScope:258` `return null`) | BLOCKED_PREREQUISITE |
| 30 | Organization Scope 유효 | `ORGANIZATION_*` 11종 이름·능력 양쪽 0 · 5-3-3-1 70편은 **문서상 계약뿐**(ADR 자인 `ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md:163` "실 코드·테이블 0건") | BLOCKED_PREREQUISITE |
| 31 | Manager Relationship Type Reference 유효 | 🔴🔴`parent_user_id` 는 상급자를 표현 못 함 — 전 4 생성경로가 owner 하드고정(`UserAuth::createTeamMember:1225-1227` 주석 자인 · `EnterpriseAuth::provisionUser:502` · `UserAuth:1549`,`:1576`). Relationship **Type** 축 자체 0 | BLOCKED_PREREQUISITE |
| 32 | Actor Resolver Reference 유효 | Resolver 0 → 참조 검증 대상 없음. `parent_user_id` 판독자 12+ 전량 1홉·목적은 tenant 해석(`UserAuth::resolveTenantId:207-215` 등) | ABSENT |
| 33 | Authority Policy Reference 유효 | 🔴🔴**권한 축 2벌 분열** — `$roleRank`(`backend/public/index.php:554`) ↔ `team_role`(owner>manager>member) **매핑 코드 전수 0** → "이 행위자가 이 단계를 승인할 권한이 있는가"를 물을 정본 축 없음 | ABSENT |
| 34 | Missing Actor Policy Reference 유효 | `MISSING_MANAGER_POLICY` 형태 유사물 = `UserAuth:1226-1227`(정책 아니라 **평면화 하드코딩**) · `TeamPermissions:444` `if(!empty(...))` **표시 생략**뿐 | ABSENT |
| 35 | Fallback Route 종료 가능 | Fallback 축 0 · 종료 검증 0 | ABSENT |
| 36 | Active Version Immutable | 불변 버전 0 — `menu_defaults.version` = 리터럴 `'baseline'`(`AdminMenu.php:309`) · optimistic lock `version` **0** | ABSENT |
| 37 | Structure Hash 유효 | 구조 해시 부재. 🔴`menu_audit_log.hash_chain` 을 선례로 인용 금지 — preimage 의 `'ts'=>date('c')`(`AdminMenu.php:195`) 가 **`:199-203` INSERT 컬럼 목록에 `created_at` 이 없어 미저장**(`:129` DB DEFAULT) → **재구성 불가** · `hash_equals` grep 0(`AdminMenu` 내). ★근거 정정 — `prev` 는 `lastHash():216` 으로 재구성 가능 | ABSENT |
| 38 | Compilation 성공 | §38 전항 부재 → 성공 판정 대상 없음 | ABSENT |

> 원문: *"Validation 결과에는 Error·Warning·Affected Component를 저장하라."* (1925) — 산문 1건, 분모 외. §2 계약에 반영.

---

## 2. 설계 계약

후속 구현(별도 승인세션)이 지켜야 할 계약. 본 문서는 코드가 아니다.

### C-1. 신설 금지 — DAG 알고리즘은 추출·재사용한다
§72-18(*"Workflow Engine 과 별도 Route Source of Truth 를 만들지 마라"*)·§6 은 **양쪽 다 전건이 거짓**(ⓑ §70 Step 2 확정: `JourneyBuilder`·`graph_node`/`graph_edge`·`pm_task_dependencies` 셋 다 Canonical DAG SoT 탈락) → 금지가 발동하지 않으므로 `APPROVAL_CHAIN_*` 신규 SoT 구축이 정합. **단 §39 검증 알고리즘은 신설하지 마라.**

| 요구 | 추출 원본 | 추출 대상 |
|---|---|---|
| Cycle Detection · Self-loop | `backend/src/Handlers/PM/Dependencies.php:29-34`, `:79-100` | 반복 DFS + `$visited` + tenant 매 홉 + **쓰기 전 422 차단** |
| Topological Sort | `backend/src/Handlers/PM/Gantt.php:104-118` | Kahn(`$indeg`/`$queue`/`$topo`) + `:119` `count()` 불일치 판정 |
| 부분결과 degrade | `backend/src/Handlers/PM/Gantt.php:120-125` | 500 아닌 경고 동반 부분결과 |
| Audit Hash | `backend/src/SecurityAudit.php:27`, `:45-52`, `:56-68` | tenant 포함 sha256 체인 + `hash_equals` 검증기 |

**경로 표기 주의**: `backend/src/Handlers/PM/…`. **`backend/src/PM/` 는 존재하지 않는다**(5-3-3-1 문서 25편 오표기).

### C-2. 🔴 동반 이식 금지 결함 (원본에 붙어 있는 버그)
1. **스키마 복제 금지** — `Dependencies:90-91` 는 순회 SELECT 에 **`dep_type` 술어가 없다**. 알고리즘만 가져오고 스키마·술어는 Chain 도메인에서 새로 정의하라.
2. **`Dependencies:32-34` 는 422 조기반환하여 `:48` `auditLog` 에 미도달** → **순환 탐지 시 감사 이벤트가 없다**. Chain Validation 은 **실패도 감사한다**(§38 `error count`·§39 Error 저장 요구와 정합).
3. **`AdminMenu::wouldCycle:540-555` 를 선례로 쓰지 마라** — `$visited` 없음 · tenant_id 없음(`:107-118`).
4. **`menu_audit_log.hash_chain` 을 해시 선례로 쓰지 마라** — 검증 불가능한 장식(막히는 축 = preimage 의 `ts` 미저장 하나 · `AdminMenu.php:195` vs `:199-203`). 정본은 `SecurityAudit`(`$now` 를 `created_at` 에 명시 저장).

### C-3. Compiled Artifact 는 Source 를 대체하지 않는다 (원문 1876)
Source Definition 테이블과 Compilation 테이블은 **분리 보관**하고, Compilation 은 `source structure hash` 로 Source 를 참조만 한다. 컴파일 실패가 Source 를 훼손해서는 안 된다.

### C-4. Validation 결과 저장 (원문 1925)
Error·Warning·**Affected Component**를 저장한다. `Gantt:120-125` 의 degrade 패턴(500 아닌 부분결과+경고)은 **조회 API 에만** 적용하고, **활성화 게이트에는 적용하지 마라** — 활성화는 `Dependencies:32-34` 식 **쓰기 전 차단**이 정합 선례다.

### C-5. Entry Node — 위치 기반 채택 금지
`JourneyBuilder:198` `$nodes[0]['id'] ?? 'trigger_1'` 은 **복제 금지**. §39-10("START Node 정확히 하나")는 **선언된 노드 타입에 대한 개수 검증**이어야 하며, 배열 순서에 의존해서는 안 된다.

### C-6. Applicability 금액 임계는 승격한다
`Catalog.php:1016` `HIGH_VALUE_KRW = 5000000.0` → `:1103-1105` 을 `APPROVAL_CHAIN_APPLICABILITY` 의 Amount Band 로 승격하고 **상수를 은퇴**시킨다. **신규 임계 상수 추가 금지.**

---

## 3. 미결·선행조건

### 3.1 행 수 = 분모 (특례 없음)
- §38 = 39행(필수 필드 24 + 수행 15) = 분모 39 ✅
- §39 = 38행 = 분모 38 ✅
- 두 섹션 모두 **불릿 목록이 분모**이며 §23·§43 같은 특례에 해당하지 않는다. 산문 2건(1876 "Compiled Artifact 는 Source 를 대체하지 않는다" · 1925 "Error·Warning·Affected Component 저장")은 **분모 외**이므로 표에 넣지 않고 §2 계약(C-3·C-4)으로 옮겼다.

### 3.2 ★PM 앵커 정정 2건 (규율 9에 따른 보고)
PM 브리핑·규율 82행은 `Gantt.php:104-122` 를 *"도달성·고립 **동시 판정**"* 이라 기술했으나 **정의부 실측 결과 성립하지 않는다**:
- `:105-118` Kahn 은 `$indeg[$id] === 0` 인 노드를 전부 `$queue` 에 넣는다(`:108`). **진입점에서 도달 불가능한 고아 노드도 indeg 0 이므로 `$topo` 에 정상 포함**된다.
- `:119` `count($topo) !== count($taskMap)` 가 참이 되는 경우는 **순환에 갇힌 노드가 있을 때뿐**이다.
- → Kahn 잔여 = **Cycle 판정 전용**. **Reachability(§38-30, §39-14) 도, 고립(§39-18) 도 판정하지 못한다.**
- 따라서 §38-30 · §39-14 · §39-18 을 `ABSENT` 로 판정했다(브리핑을 따랐다면 `LEGACY_ADAPTER` 3건이 과대계상됐을 것). **도달성·고립 검증은 추출이 아니라 신규 구현이다.**
- `Cycle Detection`(§38-29 · §39-17)·`Self-loop`(§39-16)·`Topological Sort`(§38-28)·`Cross-Tenant`(§39-28)의 `LEGACY_ADAPTER` 판정은 정의부 실측으로 **확인됨**.

### 3.3 선행조건 (BLOCKED_PREREQUISITE 3건)
| 항목 | 차단 사유 |
|---|---|
| §39-29 Legal Entity Scope | Legal Entity **이름·능력 0**. `'company'` = 법인 아니라 무제한 센티넬(`TeamPermissions:258`) |
| §39-30 Organization Scope | `ORGANIZATION_*` 전량 CONTRACT_ONLY. **문서 존재를 구현 존재로 계산하면 역산**(규칙 2) |
| §39-31 Manager Relationship Type | `parent_user_id` 4 생성경로 전부 owner 하드고정 → **컬럼 재사용 불가 · 쓰기 경로부터 변경 필요** |

### 3.4 §38 은 저장처가 통째로 없다
컴파일 산출물을 적재할 테이블이 **전무**하고, `backend/migrations/` 는 `20260527_172_002` 에서 정지(21파일 · approval/chain/route/workflow 마이그레이션 0)했다. 이후 스키마는 핸들러별 `ensureTables` 자가치유가 담당하나 ★**`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다** → §48 Retroactive 집행 수단이 없다. 신규 `APPROVAL_CHAIN_COMPILATION` 은 마이그레이션 경로 자체를 함께 결정해야 한다. (`Migrate` 이름 겹침 주의 — DDL 적용기이지 도메인 이행기 아님.)

### 3.5 §39 가 걸릴 자리가 마케팅 도메인엔 비어 있다
`JourneyBuilder::createJourney:135`/`updateJourney:153-154` 가 `nodes`/`edges` 를 **무검증 `json_encode`** 로 저장하고 `:512` 주석이 acyclicity 미검증을 자인한다. 즉 §39("활성화 전 검증")가 삽입될 지점이 존재하지 않는다. `:511-518` 은 **런타임(advance 패스) 탐지**이므로 §39 선례가 아니다 — 이식 시 혼동 금지.

### 3.6 UNVERIFIED / 자진 신고
- 본 문서 판정은 전부 **정적 실측**이다. 운영 서버 로그 미접근(ⓑ #45) — 런타임에서 컴파일 유사 동작이 존재할 가능성은 배제하지 못하나, 이름·정의부 grep 0 이므로 그 확률은 무시할 수준으로 본다.
- §38-13 `topological order`(필드) 와 §38-28 `Topological Sort`(동작)를 **다르게 판정**했다(ABSENT vs LEGACY_ADAPTER). 근거: 원문이 전자는 **저장 필드**, 후자는 **수행 동작**으로 요구하며, `Gantt` 는 동작만 있고 저장이 없다.
- §39-23 `Condition Expression 안전` 을 `ABSENT` 로 판정한 것은 규칙 7(우연한 일치를 준수로 계산 금지) 적용 결과다. 레포 전역 `eval` 0 은 사실이나 **Chain 조건식이 없어서** 안전한 것이며, 안전성 검증기가 있는 것이 아니다.
