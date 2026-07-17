# ADR — Approval Chain Canonical Source of Truth

> EPIC 06-A Part 4-5-3-1-5-3-3-3 · 원문 §6 · §62 · §63 · §70 Step 2 · §72-18
> 원문 정본: `docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_3_VERBATIM.md`
> 전사 정본: `docs/approval/` 16편 · 커버리지 = 측정기(`node tools/measure_06a_coverage.mjs --block=5333`)
> 상태: **결정** · 289차(10회차) · **코드 변경 0**

## 경로 결정 (원문 §71과의 차이 — 먼저 밝힌다)

§71 은 이 문서를 `docs/adr/ADR_APPROVAL_CHAIN_CANONICAL_SOURCE.md` 로 지정했다. **`docs/architecture/` 에 배치한다.**
- 근거 = **§71 자신**: *"기존 동일 목적 문서가 있으면 새로 중복 생성하지 말고 통합하라."*
- 실측: `docs/adr/` **부재** · `docs/architecture/` 에 **ADR 83편 실재**. `docs/adr/` 를 만들면 **두 번째 ADR 거처**가 생긴다.
- 원문 텍스트는 `SPEC_..._VERBATIM.md` 에 **무수정 보존**했다. 이 결정은 배치에 한하며 내용을 바꾸지 않는다.
- ★대칭 아님을 명시: `docs/approval/` 16편은 **원문 그대로 생성**했다. 그쪽엔 충돌이 없기 때문이다(승인 목적 디렉터리 부재 · 16편 중 실재 0). **충돌이 있는 곳만 통합한다.**

---

## Context

§70 Step 2 가 요구하는 첫 결정: **Canonical SoT 를 정하라.** 그리고 §72-18 이 금지한다 — *"Workflow Engine 과 별도 Route Source of Truth 를 만들지 마라."* §6 도 조건부로 말한다 — *"기존 Workflow Definition 이 **범용 DAG 를 제공한다면** Approval Chain 은 해당 Workflow Graph 를 참조하거나 Approval 전용 Semantic Layer 로 구현하라."*

즉 이 블록 전체의 향방은 **"레포에 범용 DAG 가 있는가"** 하나에 걸려 있다.

**미리 결론내지 않았다.** 이 세션에서 PM 예측이 두 번 뒤집혔기 때문이다 — 8회차 `bpmn`/`state_machine` grep 0 → "워크플로 엔진 부재" 오판 → **`JourneyBuilder` 로 반전** · 9회차 "SSO/SCIM 은 ABSENT 일 것" → **`EnterpriseAuth` REAL 로 반전**. 그래서 ⓑ 전수조사(105항목)를 **이름이 아니라 능력**으로 수행했다.

---

## D-1. **Canonical DAG SoT = 셋 다 아니다** → §72-18 은 **발동하지 않는다**

§6 과 §72-18 은 **양쪽 다 전건이 거짓**이다. 후보 3종을 정의부까지 읽어 판정했다.

| 후보 | 무엇이 실재하는가 | **탈락 사유(결정적)** |
|---|---|---|
| **`JourneyBuilder`** (`backend/src/Handlers/JourneyBuilder.php`) | 레포 **유일 실 Flow 실행 엔진** — 노드 13종 · `advanceEnrollment:498-700+` · 순환 감지 `:511-518` · cron 배선 REAL | ❶**정의 계층이 통째로 비어 있다** — `createJourney:135`/`updateJourney:153-154` 가 `nodes`/`edges` 를 **무검증 `json_encode`** 저장하고 `:512` 주석이 *"작성자 JSON 에 acyclicity 검증 없음"* 을 자인 → **§39 검증 38항목이 걸릴 자리가 없다** ❷**엣지에 id 가 없다**(`journeys.edges` JSON · `from`+`when` 매칭 `:789`,`:796`) → **§22 Route Edge 참조 불가** ❸**`customer_id` 하드 전제**(`:551`,`:556`,`:822`) — 승인 요청은 고객이 아니다 ❹version·effective 컬럼 **0** → §46 불가 |
| **`graph_node`/`graph_edge`** (`Db.php:816-839`) | 범용 타입드 프로퍼티 그래프 · src/dst 양방향 인덱스(`:838-839`) · `/v419/graph/*` 9라우트 | ❶**DAG 가 아니라 그래프 스토어** — `upsertEdge:107-148` 에 **acyclicity 검사가 없다** ❷**순회기 0** — `GraphScore:193~297` 은 `influencer→creative→sku→order` **하드코딩 3-hop** ❸**판독자가 4종에 하드와이어** → 다른 타입을 넣어도 읽는 코드가 없다 ❹**내부 생산자 0 → VACUOUS 미배제** ❺`upsertNode:57-59` 화이트리스트가 `upsertEdge` 엔 없어 `:126-133` 이 임의 타입 노드를 자동 삽입 = **게이트 우회** |
| **`pm_task_dependencies`** (`backend/src/Handlers/PM/Dependencies.php` + `PM/Gantt.php`) | ★**DAG 검증 최상급** — 반복 DFS `:79-100` + `$visited` + **tenant 필터 `:91` 매 홉** + **쓰기 전 차단 `:32-34`(422 `cycle_detected`)** | ❶**DAG "검증기"이지 "엔진"이 아니다** — 노드 타입 0 · 조건 0 · 실행기 0 · 저장은 엣지 리스트뿐 ❷도메인 = PM 태스크(`dep_type ENUM('FS','SS','FF','SF')` = **일정 의존 유형**) ❸`:90-91` **`dep_type` 술어 부재** → 전 타입 무차별 순회 |

**부재증명 보강**(이름 축): `workflow_*`/`flow_*`/`wf_*` · `bpmn` · `state_machine` · `approval_chain`/`approval_route`/`route_id`/`step_order`/`sequence_no`/`next_step`/`approval_level`/`approval_stage`/`approval_depth` — **`backend/src`+`frontend/src` 전수 0**. `WITH RECURSIVE`/`CONNECT BY` · Closure Table · Nested Set · Materialized Path · Graph DB 엔진 **전부 0**. `Db::sql()`(`:177-191`)은 **DDL 전용 번역기**라 CTE 를 번역하지 못한다.

> ∴ **`APPROVAL_ROUTE_*` 를 신규 Canonical SoT 로 구축하는 것은 §72-18 위반이 아니다.** 참조할 Workflow Engine 이 없기 때문이다.
>
> 🔴 **이 부재증명을 여기 남기는 이유**: 후속 차수가 "왜 새로 만들었나 — §72-18 위반 아닌가"를 재심문하지 않도록. **재조사 금지. 뒤집으려면 위 3후보의 정의부 실측을 반증하라.**

## D-2. **SoT 신설 ≠ 알고리즘 신설** (D-1 의 필수 짝)

D-1 이 허용한 것은 **저장·정의의 SoT** 하나뿐이다. **다음 3건은 신설 금지 — 기존 확장이다.**

| 요구 | 확장 대상 | 신설 시 위반 |
|---|---|---|
| **§39 DAG 검증**(순환·자기루프) | **`PM/Dependencies:79-100`**(DFS·`$visited`·tenant 매 홉 `:91`·**쓰기 전 422 차단 `:32-34`**·self-loop `:29-31`) + **`PM/Gantt:104-122`**(Kahn) | §63 중복 |
| **§25 Route Condition** | **`RuleEngine`**(`:24` · 화이트리스트 `OPS:33` · `compare:433-439` switch · **`eval` 미사용**) = §25 *"허용된 DSL·Typed Expression"* 의 **기존 선례**. Part 2 Canonical DSL ADR(`ADR_CANONICAL_SEGMENT_DSL`)의 확장이지 신규 엔진 아님 | §63 중복 + 표현식 엔진 2벌 |
| **§30/§32/§33 금액 임계** | **`Catalog.php:1016` `HIGH_VALUE_KRW=5000000.0` + `:1103-1105`** → `APPROVAL_CHAIN_APPLICABILITY` 의 **Amount Band 로 승격하고 상수 은퇴** | 임계 상수 2벌 |

🔴 **알고리즘은 추출하되 스키마는 복제하지 마라** — `pm_task_dependencies` 는 `:90-91` 에 `dep_type` 술어가 없어 전 타입을 무차별 순회한다. 복제하면 **결함이 동반 이식**된다.

## D-3. ★**Kahn 위상정렬은 도달성·고립을 판정하지 않는다** (PM 초판 브리핑 정정 · 실측)

초판 브리핑은 *"`Gantt:104-122` Kahn = 도달성·고립 동시 판정"* 이라 기술했다. **틀렸다.**
- `:108` `foreach ($indeg as $id => $d) if ($d === 0) $queue[] = $id;` — **indeg 0 인 노드를 전부** 큐에 넣는다.
- → **진입점에서 도달 불가능한 고아 노드도 indeg 0 → `$topo` 에 정상 포함**된다.
- → `:119` `count($topo) !== count($taskMap)` 이 참이 되는 경우는 **순환에 갇힌 노드가 있을 때뿐**. 변수명도 `$hasCycle` 이다.

∴ **Kahn 은 순환 탐지 전용**이다. §38-30 Reachability · §39-14 Terminal Reachable · §39-18 고립 Node 없음 = **`ABSENT` — 추출이 아니라 신규 구현**이다.

> **이것이 규칙 2("존재증명도 이름이 아니라 능력으로 — 검증기가 있는가를 물어라")를 PM 스스로 어긴 사례다.** "Kahn 이 있으니 도달성도 되겠지"로 **이름에서 능력을 추론**했다. 브리핑을 그대로 따랐다면 `LEGACY_ADAPTER` 3건이 과대계상됐다.

## D-4. **§39 활성화 전 검증의 정합 선례는 `Dependencies:32-34` 하나뿐**

`JourneyBuilder:511-518` 의 순환 감지는 **런타임 탐지**(순회 중 `$seen` 방문집합 + guard<100)이지 **쓰기 차단이 아니다**. `:512` 주석이 자인한다. §39 는 *"활성화 전 검증"* 을 요구하므로 **`JourneyBuilder` 는 §39 의 선례가 아니다.**

🔴 **단 `Dependencies:32-34` 는 422 조기 반환하여 `:48` `auditLog` 에 도달하지 않는다** → **순환 탐지 시 감사 이벤트가 없다.** §58 Error Contract·§61 Audit Event 설계 시 **이 결함을 복제하지 마라**(에러 반환과 감사 기록의 순서).

## D-5. **§62 기존 구현 분류 — 중복은 3건뿐, 나머지는 부재**

§63 중복 구현 감사에 올릴 항목은 **3건**(= D-2 의 3행). **나머지 45/48 은 부재다.**

★**경고**: `JourneyBuilder` 가 "노드·엣지"를 갖고 있다는 이유로 §63 에서 **중복으로 분류하면 안 된다.** 그것은 §9~§24 요구(정의 검증·버전·엣지 id·Stage/Level·Applicability)를 **하나도 충족하지 않는다**. **미달을 중복이라 부르면 통합 결과가 자동으로 "기능 유지"로 위장된다**(5-3-2 §72 교훈).

**`MIGRATE_TO_CANONICAL` 후보 1순위 = `FeedTemplate`** — 레포에서 승인 체인에 가장 근접한 능력이다:
`submitDraft:265-268`(`'draft'→'submitted'`) → `approveDraft:271-274`(`'submitted'→'approved'`) → `publishDraft:277-287`(`status!=='approved'` → **409 `must_approve_first`**). 역행 차단·순차 강제 실재.
🔴 그러나 **승인자 신원 검사 0**(자기 제출→자기 승인 무제한) · **합법 전이 집합 선언 0**(`transition(…, string $from, string $to)` `:249` 가 전이 쌍을 **호출자 인자로 받아** `:258` 이 "현재 status == 넘겨받은 from"만 검사).

## D-6. **§6 조건절이 36항목 전부에 대해 참** → 조건부 요구가 무조건 요구로 붕괴

§6 전문의 *"기존 동등 Entity 가 없을 경우"* 는 **§6 의 36항목 전부에 대해 참**이다. 원문은 "있으면 재사용"을 상정하고 썼으나 레포엔 **하나도 없다**. 이 사실을 기록해 두지 않으면 후속 차수가 §6 을 "조건부라 안 해도 됨"으로 오독한다.

## D-7. **§9 `workflow definition reference` 의 의미 재정의** (원문 모순 · 미결)

§6 은 범용 DAG 가 **"있다면"** 참조하라는 **조건부**인데, §9 는 `workflow definition reference` 를 **무조건 필수 필드**로 올린다. D-1 로 참조 대상이 부재하므로 **이 필드는 신규 SoT 자신을 가리키게 되어 자기 도메인 내 참조가 된다.**

**결정**: 이 필드를 **`APPROVAL_CHAIN_VERSION` 의 자기 참조로 재정의하지 마라.** 외부 Workflow Engine 이 훗날 도입될 때를 위한 **nullable 확장점으로 보존**하고, 현 단계에선 **항상 NULL** 로 둔다. 값을 채우는 코드를 쓰지 마라 — 채우면 `IMPLEMENTATION_STATUS.md:130` 과 같은 **가짜 완료 기록**이 된다(D-9 참조).

## D-8. **§64 무결성 수단 2종이 양쪽 다 없다** → Typed JSON 경로 선택 시 선행 구축 필수

§64: *"Typed JSON 을 사용할 경우 JSON Schema 와 Database Reference Integrity 를 함께 적용하라."* **양쪽 다 부재한다.**
- `FOREIGN KEY ... REFERENCES` = 레포 전체 **1건**(`migrations/20260526_168_101_create_menu_tree.sql:21` · self-FK) · `backend/src` DDL **0**.
- **`Db::sql()` SQLite 분기(`Db.php:205-234`)가 FK 절을 물리적으로 제거한다** — 이중 백엔드에서 FK 는 강제되지 않는다.
- JSON Schema 검증 라이브러리 **`composer.json:6-13` 에 부재**.

∴ **Typed JSON 을 택하면 §64 를 충족할 수 없다.** Relational Adjacency List(= `pm_task_dependencies` 선례)를 택하고, 무결성은 **애플리케이션 계층 검증**(D-2 의 `PM/Dependencies` 확장)으로 강제하라. **"FK 를 걸었으니 무결"은 이 레포에서 거짓이다.**

## D-9. 🔴 **구현이력 정본이 오염돼 있다** — §72-25 위반이 정본에 실재

**`docs/IMPLEMENTATION_STATUS.md:130` 이 *"Approvals 실집행(가짜 로컬→실 Alerting action_request)"* 을 완료로 기록한다. 거짓이다.**
- `INSERT INTO action_request` = **backend 전수 0**(멀티라인 탐색 포함).
- 프론트를 읽기/결정 엔드포인트에 배선했을 뿐 **생산자가 없어 영원히 빈 테이블을 읽는다**.
- `Db.php:592-600` 에 **`required_approvals` 컬럼조차 없다** → `Alerting:562` `required_approvals=>2` 는 **순수 응답 장식**.
- **`requested_by` 컬럼도 없다** → 자기승인 차단이 **구조적으로 불가능**.

**결정**: `IMPLEMENTATION_STATUS.md:130` 은 **정정 대상**이다(별도 승인세션). 그때까지 **이 줄을 근거로 인용하지 마라.** 288차 "보류 = action_request 생산자" 메모와 정합한다.

> ★**이것이 이 ADR 에서 가장 위험한 발견이다.** 운영 규칙상 "매 감사 전 `IMPLEMENTATION_STATUS.md` 필독+주입"인데 **그 정본 자체가 §72-25("미구현을 구현 완료로 기록하지 마라")를 위반**하고 있다. 정본이 틀리면 이후 인용이 전부 그것을 복제한다(289차 ② "351 사건" 패턴).

## D-10. **§65 API 를 그대로 신설하면 5번째 승인 경로가 된다** → §62 선행

현행 승인 경로 **4개**의 스키마·의미론이 **전부 다르다**(D-11). §65 를 먼저 세우면 5번째가 추가될 뿐이다. **§62 `MIGRATE_TO_CANONICAL` 확정이 §65 착수보다 선행한다.**

## D-11. **승인 지형 = "2 REAL + 2 미달"** (★5-3-2 ADR D-5 정정 — 아래 무후퇴 참조)

| 경로 | 등급 | 실측 |
|---|---|---|
| `mapping_change_request` | **REAL** | 4중 방어 — 신원 fail-closed `Mapping:246-250` · 자기승인 403 `:268-271` · 승인자 dedup `:278-283` · **정족수 `:287`(레포 유일 실집행)** |
| `catalog_writeback_job` status=`pending_approval` | **REAL** | 정책게이트 `evaluatePolicy:2247` → `approvalCreate:2275` → `approveQueue:2341` → **집행 `processWritebackQueue:2362`**. 🔴테이블 `catalog_writeback_approval` 은 **고아**(CREATE 2회 + 자인 주석 `:2269` · INSERT/SELECT 0) — **테이블은 죽었고 능력은 살아 있다** |
| `action_request` | **VACUOUS** | 생산자 0(D-9) |
| `admin_growth_approval` | **REAL(단일테넌트 전제)** | 🔴**`tenant_id` 컬럼 없음**(`AdminGrowth:142-149`) · 조회 `:1324` tenant 술어 없음 |

**중복이 아니라 부재다**: `required_approvals` 는 `Mapping` 에만 · `requested_by` 는 `action_request` 에 없음 · `tenant_id` 는 `admin_growth` 에 없음. **어느 쪽으로 통합해도 한쪽은 후퇴 아니면 신설이다.**

## D-12. **`Existing Approval Manager Resolver` = ABSENT** → §35 Candidate 는 순수 신설

**4경로 전량이 "호출자가 곧 승인자"다**: `Mapping` = 미들웨어 통과 + 제안자 아님 + 미중복이면 **누구나** · `Catalog:2343` = **`requirePro` 플랜만 · 행위자를 읽지도 않음** · `AdminGrowth:1301-1302` = `requirePlan('admin')`+`requireSubAdminMenu` · `Alerting` = **게이트 없음**.

∴ **"누가 승인 가능한가"는 인가 게이트로 REAL 하게 판정되나, "이 건의 승인자는 누구인가"를 결정하는 코드는 0이다.**

## D-13. **권한 축 2벌 분열 = §34 Resolution Input 의 최대 미결**

`$roleRank`(`backend/public/index.php:554` `viewer0<connector1<analyst2<admin3`) ↔ `team_role`(owner>manager>member) **매핑 코드 전수 0**(양방향).
- `$roleRank` 는 **판정 축이 HTTP 메서드**(`:568`)이고 `connector` 의 유일 의미가 ingest 쓰기(`:571-574`) → **기계 신원 API 등급**이지 조직 역할이 아니다. **"무엇을 하는가"만 묻고 "누구인가"를 묻지 않는다.**

∴ **"이 행위자가 이 단계를 승인할 권한이 있는가"를 물을 정본 축이 레포에 없다.** §34 는 이 축의 확정 없이 착수할 수 없다 → **`BLOCKED_PREREQUISITE`**.

🔴 **`acl_permission.approve` 를 그 축으로 쓰지 마라 — 완전한 장식이다**: `ACTIONS:39` 에 실재하고 **`seedOrg` 가 5개소(`:708`,`:711`,`:714`,`:716`,`:717`)에서 실제 시드**하지만, **`approve` 를 읽어 승인 가부를 판정하는 코드가 0**이다. `actionsCover:194` 의 유일 호출처 `:639` 는 **위임 상한 검증**이지 승인 집행이 아니다.

## D-14. **§28/§29 는 차단 성격이 다르다** — 이 구별을 잃으면 후속 차수가 헛짚는다

- **§28 Hierarchical Route Foundation = 재료 부재.** 데이터를 넣으면 풀린다.
- **§29 Manager-of-manager Route = 쓰기 경로가 코딩돼 있다.** DB 에 2단 체인이 **물리적으로 적재될 수 없다** → 스키마·데이터 이관이 아니라 **애플리케이션 코드 변경이 선결**이다.

**실측**: `UserAuth::createTeamMember:1225-1227` 은 manager 가 만든 멤버의 parent 를 **manager 자신이 아니라 manager 의 parent(=owner)** 로 올린다 — **코드가 2단 체인 생성을 능동 차단**한다. 같은 고정이 `EnterpriseAuth::provisionUser:502`(`(int)$owner['id']`) · `createSubAdmin`(`UserAuth:1549`,`:1576`) 에도 있고, sub 는 계정 생성이 차단된다(`:1254-1256`). **전 4 생성경로 봉인.**

## D-15. **`parent_user_id` 재사용 금지** — 재해석하면 테넌트 해석이 무너진다

12개 이상의 판독자가 이 컬럼을 **tenant 해석 술어**로 쓴다(`UserAuth::resolveTenantId:207-215` · `Rollup:56-61` · `ChannelSync:72` · `ChannelCreds:85` · `BillingMethod:88`) 또는 **`IS NULL` owner 판별**(`PlanLimits:37`·`UserAuth:41`·`AdAdapters:45`·`KakaoChannel:356`·`TeamPermissions:129`).

∴ 의미를 "실 상급자"로 바꾸면 **테넌트 해석이 전역 붕괴**한다. **Reporting Line 은 별도 축 신설이 필수**(무후퇴).

## D-16. **§67 무효화 요구는 무효화할 캐시가 없다** — 우연한 준수를 계산하지 마라

Redis/Memcached **backend/src 0**(★`redis` 유일 히트 = `Payment.php:817` `totalBefore`**Dis**`c`) · `apcu_*` 는 `SystemMetrics.php:225-455` **지표 보고 전용** · 프론트 `g_admin_menu_tree_cache` localStorage 만. → **서버 캐시 계층 자체가 순수 신규**. 현행이 §67 을 "위반하지 않는" 것은 **대상이 없어서**다.

## D-17. **§69 는 테스트 러너의 존재를 전제하나 러너가 0이다**

PHPUnit 스위트 없음 · `npm test` 없음. 실재 = `tools/e2e/smoke.mjs`(476줄 · `npm run e2e`/`e2e:render`/`e2e:scenario`). 🔴`:42` 가 `/api/v423/approvals` 를 **HTTP 상태만** 확인하고 **승인 의미론 테스트 0**. **원문 어디에도 "러너를 세우라"가 없다** → **인프라 신설을 별도 선행 항목으로 계상하라.**
- §69 Regression 11항 중 **4항은 보호할 기존 기능이 0**(Multi-Level·Manager·Finance·Legal) → **회귀 테스트가 성립하지 않는다.**
- ⚠️`smoke.mjs:148` 이 **503 을 실패에서 제외**(`r.s !== 503`)하고 `:139` 백오프 재시도 → 레이트리밋에 회귀가 은폐될 구조적 여지.

---

## 무후퇴 (Non-Regression) — 이 결정들이 지켜야 할 것

1. **D-1 을 근거로 알고리즘까지 신설하지 마라** — D-2 의 3건은 확장이다.
2. **`Mapping:245-290` 5단 규율을 재작성하지 마라** — 289차 G-01 이 닫은 우회로(익명 2회 = 정족수)를 다시 연다. **위치 이동이지 신규 작성이 아니다.**
3. **`pm_task_dependencies` 스키마를 복제하지 마라** — `:90-91` `dep_type` 술어 부재가 동반 이식된다.
4. **`Dependencies:32-34` 의 감사 미도달을 복제하지 마라**(D-4).
5. **`nextNode:811-812` 무라벨 위치 폴백 · `:814` 첫 후보 · `pickWeighted:729` 첫 키 · `enroll:198` `$nodes[0]['id'] ?? 'trigger_1'` 를 복제하지 마라** — 4건 전부 §72-10 계열이며 286차에 **실 오발송 장애**를 냈다(주석 `:801-803`).
6. **`nextNode:799` 첫 일치 즉시 return 을 복제하지 마라** — §72-11(다중 일치 무탐지)이 마케팅 도메인에 실재한다.
7. **`:342` 무음 강등 폴백(`'own'`) · `normActions:186` 무음 드롭을 복제하지 마라** — 422 fail-closed 로 가라.
8. **`evalCondition` 의 "미추적 신호 → false" 를 그대로 이식하지 마라** — 마케팅에선 안전(발송 안 함)이나 **승인에선 방향이 반대**다(§25 `fail closed 여부` 직결).
9. **`tenant_id IS NULL` 을 Platform 센티넬로 쓰지 마라** — `effectiveScope:256`(NULL=무제한)과 **같은 사고 패턴**이 재발한다(§11 #14).
10. **`menu_audit_log` 를 감사 선례로 인용하지 마라**(D-18).
11. **§10 상태 16종을 §14/§16/§19/§11/§12 에 복사해 채우지 마라** — 원문이 그것들의 `status` 허용 값을 열거하지 않았다. 복사는 **날조**다.
12. **`IMPLEMENTATION_STATUS.md:130` 을 인용하지 마라**(D-9).
13. **`revoked_at=NULL` 소거 패턴을 복제하지 마라** — `AgencyPortal:304`,`:381` 이 이전 해지 시각을 지워 **as-of 재구성을 불가능하게** 만든다(§48 정면 반례).
14. **"eval 0 이니 임의 코드 실행 불가"로 §68 을 REAL 처리하지 마라**(D-18).

## D-18. 감사·보안 선례를 틀리게 인용하지 마라 (2건)

**ⓐ `menu_audit_log.hash_chain` = 검증 불가능한 장식.** DDL(`AdminMenu.php:123-131`)에 **`prev_hash` 컬럼 자체가 없고 `tenant_id` 도 없다**. preimage 는 `'ts'=>date('c')`(`:195`)인데 저장은 `created_at DEFAULT CURRENT_TIMESTAMP`(`:129`) → **preimage 2요소가 모두 미저장 → 재구성 불가**. `hash_equals` 는 레포 24히트지만 **`AdminMenu` 엔 0건 = 검증기 없음**.
→ ★**감사 정본 선례 = `backend/src/SecurityAudit.php`**: `:27` **tenant 포함 해시** · `:45-52` DDL(`tenant_id`/`prev_hash`/`hash_chain`) · **`verify():56-68` `hash_equals` 실 검증기**.
→ 🔴289차 문서 ~60편이 `menu_audit_log` 를 잘못 인용했다 — **ⓔ 정정 대상**.
→ ⚠️추가 실측: `Alerting::audit:28-31` 의 INSERT 는 `audit_log(actor,action,details_json,created_at)` **4컬럼 — `tenant_id` 없음** → **Alerting 승인 감사는 테넌트 귀속 불가**.

**ⓑ "임의 코드 실행 불가"는 거짓.** `eval`/`create_function`/`system` 이 0 인 것은 맞으나 **`WmsCctv.php:563-564` `shell_exec` · `:635` `proc_open(['/bin/sh','-c',$cmd])` 가 실재**하고 **차단 게이트는 0**이다. 세 함수의 부재는 **우연이지 게이트의 결과가 아니다**(규칙 7).

---

## 이 ADR 이 남기는 미결 (다음 차수가 답할 것)

| # | 미결 | 왜 지금 못 정하나 |
|---|---|---|
| U-1 | **§34 권한 축 확정**(`$roleRank` vs `team_role` vs 신설) | D-13 — 두 축 매핑이 0이라 어느 쪽도 정본이 아니다. 제품 결정 필요 |
| U-2 | **§46 `resolution_time_basis` 요청측 필드** | 원문 §46 의 14필드가 전부 저장측이고 해석 시각 기준을 전달할 필드가 정의되지 않았다 |
| U-3 | **§49 organization/reporting line version 필드** | 원문이 필드는 필수로 요구하면서 산문은 5-3-3-11 로 이연 지시 — 충돌. 실측상 표현 자체가 불가(D-14/D-15) → **참조 컬럼만 두고 이연**이 유일 정합 |
| U-4 | **§64 저장 기법 최종 선택** | D-8 로 Typed JSON 은 배제되나 Adjacency List 확정은 §21/§22 스키마 확정 후 |
| U-5 | **`data_scope` 개인 범위 미도달 결함**(별도 승인세션) | `effectiveScope:253` 이 `'user'` 로 조회하나 쓰기는 `'member'`(`:653`)/`'team'`(`:584`,`:743`) — **`'user'` 쓰기 코드 0** → 영구 0행 → 팀 미배정 시 `:256` 무제한. `getMemberPermissions:609` 가 `'member'` 로 되돌려주어 **화면상 정상**(가짜 녹색). ⚠️**팀 범위는 정상 · 정적 실측 · P0 미부여 · PM 재증명 완료** |

## 측정

**커버리지는 손으로 쓰지 않는다.** 정본 = 측정기.
```
node tools/measure_06a_coverage.mjs --block=5333
```
분모 정합: 섹션별 불릿 합 **1804** + §23 특례 **3** + §43 특례 **10** = **1817**(두 측정기 독립 일치).
