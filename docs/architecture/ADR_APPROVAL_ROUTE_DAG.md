# ADR — Approval Route DAG 표현·검증

> EPIC 06-A Part 4-5-3-1-5-3-3-3 · 원문 §18·§20~§29 · §39
> 상위 결정: [`ADR_APPROVAL_CHAIN_CANONICAL_SOURCE.md`](ADR_APPROVAL_CHAIN_CANONICAL_SOURCE.md) (D-1 SoT · D-2 확장 3건 · D-3 Kahn 정정)
> 전사 정본: `docs/approval/APPROVAL_ROUTE_GRAPH.md`(210행) · `HIERARCHICAL_ROUTE_FOUNDATION.md`(46행)
> 상태: **결정** · 289차(10회차) · **코드 변경 0**
> 경로: §71 은 `docs/adr/` 을 지정했으나 `docs/architecture/`(ADR 정본 83편)로 통합 — 근거는 §71 자신. 상세 = CANONICAL_SOURCE ADR 머리말.

## Context

`APPROVAL_ROUTE_GRAPH.md` 210행 **전량 ABSENT**(cover 0). `approval_route`/`route_id`/`APPROVAL_ROUTE` = `backend/src`+`frontend/src` **전수 0**. 상위 ADR D-1 이 신규 SoT 를 정합으로 확정했으므로, 이 ADR 은 **그 SoT 를 어떻게 표현·검증할 것인가**만 정한다.

---

## D-1. **저장 = Relational Adjacency List** (Typed JSON 배제)

**선례 = `pm_task_dependencies`**(`migrations/20260526_168_004`) — 엣지 리스트 + `UNIQUE(tenant,pred,succ,dep_type)` + **양방향 인덱스**(`:12-14`).

**Typed JSON 을 배제하는 이유**(상위 ADR D-8): §64 가 요구하는 `JSON Schema` + `Database Reference Integrity` 가 **양쪽 다 부재**하고, **`Db::sql()` SQLite 분기(`Db.php:205-234`)가 FK 절을 물리 제거**한다. **"FK 를 걸었으니 무결"은 이 레포에서 거짓이다** → 무결성은 **애플리케이션 계층**(D-4)이 강제한다.

**`journeys.nodes/edges` JSON 을 답습하지 마라** — 그 방식이 낳은 결과가 `createJourney:135`/`updateJourney:153-154` 의 **무검증 저장**이고, §39 검증 38항목이 걸릴 자리가 통째로 없는 상태다.

## D-2. ★**Route Edge 는 고유 id 를 가진다** (JourneyBuilder 와 갈리는 지점)

🔴 **`journeys.edges` JSON 에는 엣지 id 자체가 없다** — `JourneyBuilder.php:126` 의 시드가 `[['from'=>…,'to'=>…]]` 이고 **`id` 키가 없다**(노드는 `:121-124` 에 `id` 有). 그래서 `nextNode:789`,`:796` 이 **`from`+`when` 매칭**으로 엣지를 찾는다.

**귀결**: §22 Route Edge 참조 불가 · §27 Merge 의 incoming branch references **구조적 불가** · 엣지 단위 감사·오버라이드·버전 전부 불가.

∴ **`APPROVAL_ROUTE_EDGE` 는 반드시 서로게이트 id 를 갖는다.** 이것이 `JourneyBuilder` 를 SoT 로 쓸 수 없는 4가지 이유 중 하나였다(상위 ADR D-1).

⚠️ **범위 명확화**: `graph_edge` 는 **id 를 가진다**(`Db.php:827` `id INT AUTO_INCREMENT PRIMARY KEY`). "엣지에 id 없음"은 **`journeys.edges` JSON 한정**이다. `graph_edge` 의 탈락 사유는 id 가 아니라 **acyclicity 검사 부재·순회기 0·내부 생산자 0**이다.

## D-3. **§23 Route 방향 = `source → next`** · 판정은 `ABSENT`(초안 `CONSOLIDATION_REQUIRED` 기각)

현행 3벌 — `from`/`to`(`JourneyBuilder:126`) · `src_type`/`src_id`→`dst_type`/`dst_id`(`GraphScore:107-148`) · `predecessor_id`/`successor_id`(`PM/Dependencies:38-41`) — 은 **의미론이 셋 다 이미 source→target 이다.**

**그럼에도 `ABSENT` 인 이유 3**:
1. `CONSOLIDATION_REQUIRED` 는 **"통합할 중복이 실재한다"는 주장**인데 `approval_route`/`route_id` 가 **전수 0** — 통합 대상이 없다. 없는 것을 "통합 필요"라 부르면 후속 차수가 실재하지 않는 선행 구현을 찾아 헤맨다.
2. **§23 의 규범적 스코프를 2문장(`:1288`)이 한정한다** — *"다른 모듈에서 역방향을 사용하더라도 **Approval Route 내부** Canonical Direction 은 변경하지 마라."* §23 은 타 모듈 명명 통일 요구가 **아니다**.
3. **3벌이 모두 source→target 인 것은 우연한 일치이지 준수가 아니다**(규칙 7). 세 구현은 각자 독립 도메인에서 그렇게 됐을 뿐 §23 을 이행한 바 없다.

∴ 3벌 분열은 **§23 의 충족 근거가 아니라, 신설 시 참조할 선례 목록**으로만 유효하다. **Ancestor·Predecessor 조회는 별도 역방향 인덱스**로 처리한다(`pm_task_dependencies` `:12-14` 선례).

## D-4. **검증 = `PM/Dependencies` + `PM/Gantt` 추출** · 단 **도달성·고립은 신규**

| §39 요구 | 확장/신설 | 근거 |
|---|---|---|
| 자기루프 없음 | **추출** | `PM/Dependencies:29-31` |
| 순환 없음 | **추출** | `PM/Dependencies:79-100` 반복 DFS + `$visited` + **tenant 필터 `:91` 매 홉** · **쓰기 전 422 차단 `:32-34`** |
| 위상 정렬(동작) | **추출** | `PM/Gantt:104-122` Kahn |
| **Terminal Reachable** | 🔴**신규** | D-5 |
| **고립 Node 없음** | 🔴**신규** | D-5 |
| **START Node 정확히 하나** | 🔴**신규** | D-6 |

🔴**스키마는 복제 금지** — `Dependencies:90-91` 에 **`dep_type` 술어가 없어** 전 타입을 무차별 순회한다. 복제하면 결함이 동반 이식된다.
🔴**감사 순서 결함도 복제 금지** — `:32-34` 가 **422 조기 반환하여 `:48` `auditLog` 에 도달하지 않는다** → 순환 탐지 시 감사 이벤트 없음.
🔴**경로 표기** — `backend/src/Handlers/PM/…`. **`backend/src/PM/` 는 존재하지 않는다**(5-3-3-1 문서 25편 오표기).

## D-5. ★**Kahn 은 도달성·고립을 판정하지 않는다** (PM 브리핑 정정 · 실측)

`Gantt.php:108` `foreach ($indeg as $id => $d) if ($d === 0) $queue[] = $id;` — **indeg 0 인 노드를 전부** 큐에 넣는다. → **진입점 미도달 고아 노드도 indeg 0 → `$topo` 에 정상 포함** → `:119` `count($topo)!==count($taskMap)` 이 참이 되는 건 **순환에 갇힌 노드가 있을 때뿐**(변수명도 `$hasCycle`).

∴ **Kahn = 순환 탐지 전용.** 도달성·고립은 **추출이 아니라 신규 구현**이다. 초판 PM 브리핑을 따랐다면 `LEGACY_ADAPTER` 3건이 과대계상됐다. **이름에서 능력을 추론한 오독**이었다.

## D-6. **START Node 부재가 리터럴 폴백으로 은폐된다** — 복제 금지

**`JourneyBuilder::enroll:198` `$startNode = $nodes[0]['id'] ?? 'trigger_1'`** — entry 노드를 **배열 위치로 채택**하고 **리터럴로 폴백**한다. → §39-10("START Node 정확히 하나")·§40-8·§40-9 는 "탐지 실패"가 아니라 **부재가 조용히 은폐**된다.

∴ `APPROVAL_ROUTE` 의 Entry 는 **명시 플래그**로 선언하고, **0개 또는 2개 이상이면 활성화 거부(422)**. 위치·리터럴 폴백 금지.

## D-7. 🔴 **§72-10 위반이 레포에 살아 있다** — 4건 전부 복제 금지

| 위치 | 패턴 |
|---|---|
| `nextNode:811-812` | **무라벨 레거시 그래프에 위치 폴백 존치**(`$idx = in_array($bl,['true','a','yes','1']) ? 0 : (count($cand)>1 ? 1 : 0)`) |
| `nextNode:814` | 분기 없으면 **첫 후보 반환** |
| `pickWeighted:729` | `if ($total <= 0) return $keys[0]` — **첫 키 폴백** |
| `enroll:198` | **배열 위치 + 리터럴 폴백**(D-6) |

★**286차 실 장애가 이 계열에서 났다** — 주석 `:801-803` 이 자인: 위치 폴백이 *"조건 불충족 고객을 엉뚱한 분기(예: YES 보상)로 오발송"*.

**PM 초판 브리핑 정정**: *"286차가 위치 폴백을 의도적으로 제거"* 는 **부분 오류**다. `:809` `if ($hasLabeled) return ''` 는 **라벨 있는 그래프에만** 적용되고 `:810` 주석이 *"라벨 전무(레거시 무라벨 그래프)만 위치 폴백 유지"* 를 자인한다. ∴ **§22 `BLOCK_ON_NO_MATCH` 는 "확립된 의미론"이 아니라 조건부로만 확립됐다.**

∴ `APPROVAL_ROUTE` 는 **`BLOCK_ON_NO_MATCH` 무조건 적용**. 레거시 호환 분기를 두지 마라 — 승인엔 레거시가 없다.

## D-8. 🔴 **§72-11 위반도 실재** — 다중 일치는 탐지·기록·거부

`nextNode:799` **첫 일치 즉시 return** → **다중 일치 무탐지·무기록**. ∴ `APPROVAL_ROUTE` 의 조건 평가는 **전 후보를 평가**하고 **다중 일치 시 `FAIL_ON_MULTIPLE`(§40 Conflict 생성)**. 첫 일치 단축 금지.

## D-9. **§25 Condition = `RuleEngine` 확장** · 단 **fail 방향이 반대다**

**신규 표현식 엔진 신설 금지** — `RuleEngine`(`:24` · 화이트리스트 `OPS:33` · `compare:433-439` switch · `:438` `default: return false` · **`eval` 미사용**)이 §25 *"허용된 DSL·Typed Expression"* 의 기존 선례이며 Part 2 Canonical DSL ADR(`ADR_CANONICAL_SEGMENT_DSL`)의 확장이다.

🔴 **그러나 `evalCondition` 의 fail 방향을 이식하지 마라**: 정의 `:818` → `:844` `?? null` → `compare:848`(`:850` `if ($a === null) return false`). **미추적 신호 → false**. 마케팅에선 안전(발송 안 함)이나 **승인에선 방향이 반대다** — 조건 불충족과 **입력 부재를 구분하지 못하면 미추적 신호가 곧 승인 우회**가 된다.

∴ `APPROVAL_ROUTE_CONDITION` 은 **입력 부재 → `INPUT_MISSING` 명시 오류(fail-closed)** · 조건 불충족 → false. **두 경우를 하나로 접지 마라.**

## D-10. **§26 Branch 는 배타 택일이지 parallel fork 가 아니다** · `split` 은 **결정론**이다

`split:610` → `pickWeighted:725-734` = `(($seed * 2654435761) + 1) % 100000` **enrollId 해시 기반 결정적 분배**(주석 `:610-611` *"등록ID 결정적 분배 — 동일 고객 동일 분기·재현가능"*).

**PM 초판 브리핑 정정**: *"가중 **확률** 택일"* → **확률이 아니라 결정론**이다. 결론(배타 택일 · parallel fork 아님)은 유효하고 **오히려 강화**된다 — ★**§4.7 "Chain Selection 은 결정론적"의 기존 선례로 승격**할 수 있다.

🔴 단 `:729` 첫 키 폴백은 복제 금지(D-7).

## D-11. **§28 은 재료 부재 · §29 는 쓰기 경로 봉인** — 성격이 다르다

- **§28** = 데이터를 넣으면 풀린다.
- **§29** = **코드가 2단 체인 생성을 능동 차단**한다. `UserAuth::createTeamMember:1225-1227` 이 manager 가 만든 멤버의 parent 를 **manager 자신이 아니라 manager 의 parent(=owner)** 로 올린다. 동일 고정이 `EnterpriseAuth::provisionUser:502` · `createSubAdmin`(`UserAuth:1549`,`:1576`) 에도 있고 sub 는 계정 생성 차단(`:1254-1256`) → **전 4 생성경로 봉인**.

∴ **§29 는 스키마·데이터 이관이 아니라 애플리케이션 코드 변경이 선결**이다. **Manager Resolver 보다 쓰기 경로 4곳이 먼저다.**

🔴 **`parent_user_id` 재사용 금지** — 12+ 판독자가 이 컬럼을 **tenant 해석 술어**로 쓴다(`resolveTenantId:207-215` 등). 의미를 바꾸면 **테넌트 해석이 전역 붕괴**한다. Reporting Line 은 **별도 축 신설**(무후퇴).

## D-12. **다단 상향 순회 선례 = 사람 축에 0**

DB 기반 상향 순회 = **`AdminMenu::wouldCycle:540-555` 1건뿐**(`menu_tree.parent_id` · `$depth<100`). 🔴**메뉴 트리이지 사람이 아니고 · `$visited` 없고 · `menu_tree` 에 `tenant_id` 도 없다**(`:107-118`) → **깊이 캡 착상만 유효**하고 나머지는 복제 금지.

★**오탐**: `CRM::resolveIdentitiesForTenant:608` `while ($parent[$x] !== $x)` = **Union-Find 경로압축**(메모리 배열 · 고객 아이덴티티 병합 · 조직 무관).
★**`pm_tasks.parent_task_id`**(`migrations/20260526_168_002:8`) = 레포 유일 **tenant 격리 자기참조 트리**이나 🔴**순회기 0**(7히트 전량 저장·정렬·투영 · 중첩은 프론트 위임) → **이름은 트리, 능력은 평면 리스트**.

---

## 무후퇴

1. `nextNode:811-812`·`:814`·`pickWeighted:729`·`enroll:198` **4건 복제 금지**(D-7).
2. `nextNode:799` 첫 일치 단축 **복제 금지**(D-8).
3. `evalCondition` fail 방향 **이식 금지**(D-9).
4. `pm_task_dependencies` **스키마 복제 금지**(`dep_type` 술어 부재 동반 이식) · `Dependencies:32-34` **감사 미도달 복제 금지**(D-4).
5. `menu_tree` 의 tenant 부재·`$visited` 부재 **복제 금지**(D-12).
6. `parent_user_id` **재해석 금지**(D-11).
7. `journeys.edges` **무 id JSON 답습 금지**(D-2) · **무검증 저장 답습 금지**(D-1).

## 미결

| # | 미결 | 사유 |
|---|---|---|
| U-1 | 깊이 상한 값 | `Dependencies:84` 는 `$depth<10000` = **방문 노드 예산**(깊이 캡 아님) · `AdminMenu:545` 는 `$depth<100` = 진짜 깊이 캡(단 1회전 1홉). **두 선례의 의미가 달라** 승인 라우트 상한은 §21/§22 스키마 확정 후 |
| U-2 | §29 쓰기 경로 4곳 변경 범위 | 별도 승인세션(코드 변경) |
