# DSAR — Cycle Detection (§53)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §53 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

원문(:2149)은 **"최소 다음 방식 중 Repository 구조에 적절한 방식을 사용하라"** — 즉 **6종 전부가 아니라 적합한 것을 고르라**는 선택 명세다. 레포 구조는 **답을 이미 정해 두었다**.

| 방식 | 레포 실측 | 적합성 |
|---|---|---|
| DFS | ★`PM/Dependencies.php:79-100` **반복형 DFS + `$visited` + tenant 필터 + 쓰기 전 차단**(:32-34 → 422) | ★**정본** |
| Topological Sort | ★`PM/Gantt.php:104-125` **Kahn** + `count($topo) !== count($taskMap)`(:119) **정석 판정** + **degrade**(:120-125) | ★**정본** |
| Recursive CTE | `WITH RECURSIVE` **backend/src 0** · `Db::sql()`(`Db.php:177-191`)은 **DDL 전용 번역기**(SELECT·CTE 미지원) | 🔴 부적합 |
| Graph DB Query | Neo4j/Cypher/Gremlin/Neptune/Arango/JanusGraph/TinkerPop **grep 0** | 🔴 부적합 |
| Closure Table | `closure`/`ancestor`/`descendant`/`graph_path` **grep 0** | 전례 0 |
| Materialized Path Prefix | ✅`planMenuPolicy.js:293-295` / 🔴`AuthContext.jsx:834` — **정답과 오답 공존** | 조건부 |

**★레포는 Adjacency List 단일 지배 · 트리 5개 전부 애플리케이션 계층 순회를 택했다**(이식성 — MySQL/SQLite 이중 방언 때문). 순환 방어 4종 대조:

| 구현 | 순환 방어 | 차단 시점 |
|---|---|---|
| `PM/Dependencies` | 반복 DFS + `$visited` + tenant 필터 | ★**쓰기 전**(최상급) |
| `AdminMenu::wouldCycle:540-555` | 조상 상향 walk · `$depth<100` 하드캡(:545) · 자기참조 즉시(:542) | **쓰기 전**(`:493-495`) |
| `JourneyBuilder:511-518` | **런타임 방문집합만** · 작성자 JSON **무검증 자인**(:512) | 🔴 **실행 시점**(저장은 허용) |
| `ChannelSync` 11번가 `:954-963` | `guard<10` | 파생 중 |

## 1. 원문 전사 + 판정

### 1-A. 검출 방식 — **원문 6종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | DFS Cycle Detection | ★`Dependencies::validateDependency:79-100` — 반복형(재귀 아님·스택오버플로 면역) · `$visited` 명시(:81·:86-87) · **tenant 필터가 순회 내부에**(:91) · 반복 예산 `$depth<10000`(:84) · **쓰기 전 422 차단**(:32-34) | `VALIDATED_LEGACY`(알고리즘) |
| 2 | Topological Sort | ★`Gantt.php:104-125` — Kahn(indeg :106·queue :108·감소 :115) · **`count($topo)!==count($taskMap)`**(:119) 정석 · 순환 시 **500이 아니라 부분결과+경고**(:120-125) | `VALIDATED_LEGACY`(알고리즘) |
| 3 | Recursive CTE with Cycle Guard | **`WITH RECURSIVE`/`CONNECT BY` backend/src 0**. 엔진은 지원(MySQL 8.0.37 · SQLite 3.8.3+) — ⚠️**라이브 SQLite 버전 미실측 = 추론** · `Db::sql()` 은 **DDL 전용 번역기**라 raw SQL 필요 | `ABSENT` · 🔴**채택 금지** |
| 4 | Graph Database Cycle Query | **엔진 grep 0**. `graph_node`/`graph_edge`(`Db.php:816-839`)가 Node/Edge 분리+타입드+가중치+양방향 인덱스를 **이미 제공** | `ABSENT` · 🔴**도입 불필요** |
| 5 | Closure Table Constraint | **grep 0 — 순수 신규** | `ABSENT` |
| 6 | Materialized Path Prefix Validation | ✅**정답** `planMenuPolicy.js:293-295` `pathname === p \|\| pathname.startsWith(p + "/")` — 주석 명시 *"경계 '/' 보장 — '/pm' 이 '/pmx' 를 매칭하지 않도록"* / 🔴**오답** `AuthContext.jsx:834` `menuKey.startsWith(k)` **경계 가드 없음** | `PARTIAL` |

**실측 개수: 6 / 6 전사.**

### 1-B. Cycle 금지 Relationship — **원문 8종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | PARENT_OF | **grep 0** · 유일 부모 간선 `app_user.parent_user_id` 는 **2단 봉인·테넌트 상속 전용** | `ABSENT` |
| 2 | LEGALLY_OWNED_BY | **grep 0** — 법인 엔티티 부재 | `ABSENT` |
| 3 | FINANCIALLY_OWNED_BY | **grep 0** | `ABSENT` |
| 4 | REPORTS_THROUGH | **grep 0** · `reports_to` **0** · `manager_id` **0**(단 `team.manager_user_id` 존재·평면·순회 없음) | `ABSENT` |
| 5 | COST_CENTER_OF | **grep 0** | `ABSENT` |
| 6 | PROFIT_CENTER_OF | **grep 0** — ★`po_*` 는 **Price Optimization**(`PriceOpt.php:38-146`) 무관 | `ABSENT` |
| 7 | BELONGS_TO_REGION | **grep 0** · `region` **3축 병존** · **parent region 컬럼 0** | `ABSENT` |
| 8 | BELONGS_TO_COUNTRY | **grep 0** · **Country→Region 매핑 코드 0건** | `ABSENT` |

**실측 개수: 8 / 8 전사.** 원문에 **필수필드 축 없음** → 필드 표 없음. 말미 규칙 1건(Matrix·Advisory) = §2 에 반영.

★**Relationship Type 축이 통째로 부재하다는 사실이 §52 #9 의 정확한 한계다** — `pm_task_dependencies` 는 **전 엣지를 일률 금지**하므로 "**Cycle 금지 관계에서만** 금지"라는 선택적 정책을 표현할 수 없다. `dep_type`(`DEP_TYPES` `Dependencies.php:26`)이 형태상 유사하나 **FS/SS/FF/SF 스케줄 종류**이지 관계 의미론이 아니다 → 확장 시 **`edge_type` 별 cycle 정책 테이블이 신규 요구**다.

## 2. 규칙

- ★🔴 **#1 DFS 와 #2 Topological Sort 를 재구현하지 마라 — 레포에 정본이 있다.** 조직 순환 검출은 `Dependencies::validateDependency`(**쓰기 전 차단**)를 일반화하고, 활성화 전 전체 그래프 검증은 `Gantt` 의 **Kahn + `count` 비교**(`:119`)를 일반화하라. **두 방식 다 쓰되 역할이 다르다** — DFS = **엣지 1건 추가 시 증분 검사**, Kahn = **Hierarchy Version 활성화 시 전수 검사**(§52 :2116 "활성화 전에 검증").
- ★🔴 **#3 Recursive CTE 채택 금지.** 기술적으로 가능하나 **레포 관례에 반한다** — 트리 5개 전부 애플리케이션 계층 순회를 택했고(이식성), `Db::sql()` 이 **DDL 전용 번역기**라 CTE 는 번역기 지원 없이 raw SQL 이 된다. 채택하면 **두 번째 순회 방식 도입**이 되어 MySQL/SQLite 이중 정합 부담을 진다. **`Dependencies` 패턴 확장이 무후퇴·최저위험.**
  ⚠️ SQLite 재귀 CTE 지원은 **버전 추론**(라이브 미실측)이다 — **사실로 인용 금지**.
- ★🔴 **#4 Graph DB 도입 금지 = 두 번째 엔진 = 헌법 위반.** `graph_node`/`graph_edge` 가 **Node/Edge 분리 + 타입드 관계 + 가중치 + 양방향 인덱스**(`Db.php:816-839`)를 이미 제공한다 → **전용 그래프 DB 불필요**가 실측 결론이다.
- 🔴 **`JourneyBuilder:511-518` 을 참조 구현으로 삼지 마라.** **런타임 방문집합만** 있고 **작성자 JSON 무검증**(`:512` 자인) → **순환 저장은 허용, 실행 때만 방어**. §53 은 §52("활성화 **전** 검증")와 짝이므로 **쓰기 전 차단이 정본**이다.
- ★**원문 말미가 규칙이다**(:2169): **"Matrix·Advisory 관계도 무제한 순환을 허용하지 말고 별도 Cycle Risk를 탐지하라."** → 8종은 **하드 금지(422)**, Matrix·Advisory 는 **허용하되 Cycle Risk 를 탐지·기록**. 🔴 **현행에 2단계 정책을 표현할 수단이 없다** — `pm_task_dependencies` 는 일률 금지뿐이므로 **`edge_type` 별 cycle 정책(BLOCK/RISK_FLAG)은 순수 신규**다. **"일률 금지로 충분"하다고 축소하면 Matrix 요구가 소멸하는 역산이다.**

### ★ #6 Materialized Path Prefix Validation — 26키 대조 결과 (판정 근거)

**지시받은 대조를 수행했고, 전제가 실측과 달랐다. 정정을 아래 3단으로 보고한다.**

1. **★기지 실측 정정 — `AuthContext.jsx:834` 의 비교 대상은 `MENU_CATALOG` 26키가 아니다.**
   `:828` `const allowedKeys = planMenuAccess[userPlan] || planMenuAccess["free"]` — 즉 좌변 `k` 는 **`plan_menu_access` DB 행의 `menu_key`**(`AdminPlans.php:393`·`:526` · 스키마 `plan_id, menu_key, enabled`)다. **백엔드 `TeamPermissions::MENU_CATALOG`(26키)는 권한 매트릭스 SSOT(`:52` 주석)로 별개 네임스페이스이며 `:834` 에 도달하지 않는다.** 증거: `:830-833` 이 다루는 `"ops"`·`"commerce_channel"` 은 **`MENU_CATALOG` 26키에 없다**.

2. **양쪽 네임스페이스를 각각 대조했다 — 정적으로는 prefix 쌍이 없다.**
   - `MENU_CATALOG` **26키**(`TeamPermissions.php:55-82`) 전수 확인: dashboard·ai_command_center·marketing·campaign·customer·commerce·product·live_commerce·sales_pipeline·logistics·inventory·warehouse·delivery·returns·finance·billing·settlement·connector_hub·supplier_portal·distribution_portal·team_management·member_management·permission_management·audit_log·admin_settings·security_settings → **어떤 키도 다른 키의 prefix 가 아니다**(`commerce` ⊄ `live_commerce` — 후자는 `live_` 로 시작).
   - `:834` 의 **실제** 키 우주 = sidebar manifest menuKey **35종**(`sidebarManifest.js` 실측: home‖dashboard·home‖rollup·marketing_core·marketing_advanced·commerce_channel·commerce_live·ops·billing·analytics‖*5·automation‖*4·data‖*3·system‖*13) → **정적으로도 prefix 쌍 없음**.

3. **★그러나 "미성립"으로 단정할 수 없다 — 키 우주가 정적 enum 이 아니라 DB 행이다.**
   `plan_menu_access.menu_key` 는 **자유문자열 · enum/FK 제약 없음**(`AdminPlans.php:526`)이며, **레거시 키가 실제로 잔존한다는 증거가 코드 안에 있다** — `:830-833` 이 *"202차: commerce_channel 은 기존 coarse `ops` 에서 분리됨 … ops 보유 시 commerce_channel 도 허용"* 이라며 **레거시 키 전용 shim 을 명시적으로 두고 있다.**
   결정적으로 `planMenuPolicy.js:27` 이 *"**marketing 단일키를 core/advanced 로 분할**"*(246차)이라 적는다. → **저장된 레거시 키 `"marketing"` 이 한 행이라도 남아 있으면**, 경계 가드가 없는 `:834` 에서 `"marketing_core".startsWith("marketing")` **및** `"marketing_advanced".startsWith("marketing")` 이 **둘 다 true** → **Starter 플랜이 Growth 전용 `marketing_advanced` 를 획득하는 권한 상승**이 된다. (`:830-833` 의 shim 은 이 무가드 매칭이 **의도된 레거시 호환**일 가능성도 시사한다 — 의도 판별 불가.)

   **→ 판정: `PARTIAL` — "위험 패턴" 확정 · "활성 결함"은 조건부(라이브 미검증).**
   성립 조건 = `SELECT DISTINCT menu_key FROM plan_menu_access WHERE menu_key NOT IN (<manifest 35키>)` 가 **1행 이상**. **현 정적 카탈로그만으로는 오매칭이 성립하지 않으므로 결함으로 단정하지 않는다**(근거 없는 단정 금지). **라이브 조회 권장** — 5-3-3-1 범위 밖(코드변경 0)이므로 **관찰 사실로 등재**한다.

- ★**따라서 #6 채택 시 경계 가드는 사활적이다.** 조직 Materialized Path 는 **반드시 `planMenuPolicy.js:293-295` 패턴**(`p === x || x.startsWith(p + SEP)`)을 쓰고, **`AuthContext.jsx:834` 패턴을 복제하지 마라.** 조직 경로는 `/` 구분자가 관례이며 **구분자 없는 `startsWith` 는 `/org/1` 이 `/org/10` 을 삼킨다** — 계층에서는 이것이 **크로스 조직 승인 권한 유출**이다.
- 🔴 **8종 Relationship 을 "있다고 가정"하고 배선 금지.**
