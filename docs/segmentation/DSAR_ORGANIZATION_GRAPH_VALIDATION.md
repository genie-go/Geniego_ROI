# DSAR — Graph Validation (§52)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §52 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

★**본 절은 5-3-3-1 에서 `VALIDATED_LEGACY` 를 쓸 수 있는 유일 영역이다** — 단 **알고리즘 축에 한해서**다.

| 자산 | 실측 | 검증 능력 |
|---|---|---|
| ★`PM\Dependencies::validateDependency` | `PM/Dependencies.php:79-100` — **반복형 DFS**(`$stack`/`array_pop` :85) + **명시적 `$visited`**(:81·:86-87) + **tenant 필터**(:91 `WHERE tenant_id = ?`) + **쓰기 전 차단**(:32-34 → 422 `cycle_detected`) + **self-loop 차단**(:29-31 → 422 `self_dependency`) | 레포 최고 품질 |
| ★`PM\Gantt` 위상정렬 | `PM/Gantt.php:104-125` — **Kahn**(indeg :106 · queue :108 · 감소 :115) + **`count($topo) !== count($taskMap)` 정석 순환 판정**(:119) + 순환 시 **500이 아니라 부분결과+경고 degrade**(:120-125) | §53 정본 선례 |
| 저장 | `pm_task_dependencies` **엣지 리스트** · **`UNIQUE(tenant,pred,succ,dep_type)`** · pred/succ **양방향 인덱스**(migration `20260526_168_004:12-14`) · 중복 시 409(`Dependencies.php:43-44`) | 스키마 선례 |
| 배선 | `routes.php:1424-1425` + `/api` 별칭 `:1472-1473` — **REAL** | — |
| `AdminMenu::wouldCycle` | `:540-555` — 조상 상향 walk · **`$depth<100` 하드캡**(:545) · 자기참조 즉시 차단(:542) · 이동 시 검사 후 UPDATE(`:487-503`) | 쓰기 전 차단 |
| `JourneyBuilder` | `:511-518` — **런타임 방문집합만** · **작성자 JSON 무검증 자인**(:512) | 🔴 반례 |
| 11번가 카테고리 | `ChannelSync.php:954-963` — `guard<10` 순환·과깊이 가드 | 가드 선례 |
| `graph_node`/`graph_edge` | `Db.php:816-839` — Node/Edge 분리 · 타입드 · `edge_weight` · **양방향 인덱스**(:838-839) · 9라우트(`routes.php:721-729`) · **순환 방어 없음** · **내부 생산자 0** | 🔴 검증 0 |

### ★★ 축 분리 — 이것을 틀리면 규율 9(대칭 오류) 위반이다

**알고리즘 축**: `Dependencies::validateDependency` 는 §52 의 **Tenant 일치·Self-loop 금지·Cycle 금지**를 **실제로 충족**한다 → **`VALIDATED_LEGACY` · 재구현 절대 금지 · 확장만.**

**도메인 축**: 그 코드의 도메인은 **PM 태스크 의존성**(`pm_task_dependencies`)이다. **조직 그래프에는 배선되어 있지 않다** — `org_unit`/`organization_unit` **grep 0**, 조직 노드를 읽는 경로가 **존재하지 않는다**.

> 🔴 **따라서 "§52 는 충족됨" 은 거짓이다.** 참인 명제는 정확히 두 개다:
> ① **알고리즘은 충족 — 새로 짜지 마라**(재구현 = 두 번째 순회 엔진 = 헌법 위반).
> ② **조직 적용은 미배선 — 갭은 실재한다**(적용 대상 그래프가 없다).
> 능력 존재 ≠ 요구 충족. 아래 표의 `VALIDATED_LEGACY(알고리즘)` 는 **커버가 아니라 "확장 대상 정본 지정"** 이다.

## 1. 원문 전사 + 판정 — **원문 26종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Tenant 일치 | ★DFS 순회 **내부**에 tenant 필터(`Dependencies.php:91`) — 크로스테넌트 도달 구조적 차단. 격리 강제 REAL(`index.php:600`·`:585`) | `VALIDATED_LEGACY`(알고리즘) |
| 2 | Root 존재 | 부재 — Root 개념 없음. `Gantt:108` indeg=0 큐는 **root 도출**이지 **존재 검증 아님** | `NOT_APPLICABLE` |
| 3 | 허용되지 않은 Multiple Root 없음 | 부재 — ★`Gantt:108` 은 **다중 root 를 정상으로 취급**(전부 큐에 투입) · 개수 제한 0 | `NOT_APPLICABLE` |
| 4 | Node 중복 없음 | 부재(노드 레벨) — `taskMap`(`Gantt:95`)은 PK 기반 맵이라 **중복이 조용히 덮인다** · `graph_node` 는 `node_type`+`node_id` 보유 | `PARTIAL` |
| 5 | Edge 중복 없음 | ★**`UNIQUE(tenant,pred,succ,dep_type)`**(migration `20260526_168_004:12-14`) + **409 `dependency_exists`**(`Dependencies.php:43-44`) — DB 제약 + 앱 응답 양층 | `VALIDATED_LEGACY`(알고리즘) |
| 6 | Source Node 존재 | ⚠️`Gantt:98` `isset($taskMap[$d['successor_id']], $taskMap[$d['predecessor_id']])` = **댕글링 엣지를 조용히 스킵** — **검증이 아니라 은폐**. 쓰기 시점 존재 검사 **없음**(`Dependencies::create:26-34` 는 `validId` **형식**만 검사) | `PARTIAL` |
| 7 | Target Node 존재 | 동일(`Gantt:98`) — 조용한 스킵 | `PARTIAL` |
| 8 | Self-loop 금지 | ★**쓰기 전 차단** `Dependencies.php:29-31` → 422 `self_dependency` · `AdminMenu:542` 자기참조 즉시 차단 | `VALIDATED_LEGACY`(알고리즘) |
| 9 | Cycle 금지 관계에서 Cycle 없음 | ★**쓰기 전 차단** `Dependencies.php:32-34` → 422 `cycle_detected`(DFS `:79-100`) — **최상급**. 🔴 단 **"Cycle 금지 관계" 축이 없다**(§53 8종 relationship type 부재) → 전 엣지 일률 금지 | `VALIDATED_LEGACY`(알고리즘) |
| 10 | Primary Parent 수 제한 | 부재 — **primary 개념 0** · `pm_task_dependencies` 는 **다중 predecessor 정상 허용**(DAG) | `NOT_APPLICABLE` |
| 11 | Maximum Depth 준수 | ⚠️**정정 — `Dependencies.php:84` `$depth < 10000` 은 깊이가 아니다.** `:97` 이 **pop 1회당 `$depth++`** 이므로 실제로는 **방문 노드 수(반복 예산)** 다. 진짜 깊이 캡은 `AdminMenu:545 $depth<100`(조상 1홉씩 상향) · `ChannelSync:954-963 guard<10` | `PARTIAL` |
| 12 | Unreachable Node 없음 | 부재 — `Gantt:119` 의 `count` 차이는 **cycle 판정 전용** · 도달불가 노드는 `:122-123` 에서 **best-effort 로 topo 에 밀어넣어 무시** | `NOT_APPLICABLE` |
| 13 | Orphan Node 없음 | 부재 → **§54 참조**. `AdminMenu:272` `ORDER BY COALESCE(parent_id,"")` 는 **고아를 루트처럼 취급** | `NOT_APPLICABLE` |
| 14 | Legal Entity Binding 유효 | 부재 — 법인 엔티티 없음(`biz_no`/`corp_reg`/`tax_id` **0건**) | `ABSENT` |
| 15 | Cross-Legal-Entity Edge 명시 | 부재 | `ABSENT` |
| 16 | Region·Country Binding 유효 | 부재 — `region` **3축 병존** · **Country→Region 매핑 코드 0건**(`Geo.php:23-53` 은 국가→**언어**) | `ABSENT` |
| 17 | Effective Period 중첩 검증 | 부재 — `effective_from` 유일(`Db.php:898`) · **`effective_to` grep 0** → **폐구간 없음 = 중첩 판정 불가** | `ABSENT` |
| 18 | 종료된 Node에 Active Edge 없음 | 부재 — 노드 종료(retire) 개념 없음 | `ABSENT` |
| 19 | Future-dated Node와 Edge 일관성 | 부재 — **as-of 술어 backend/src 전역 0건** → 미래일자 개념 자체 없음 | `ABSENT` |
| 20 | Parent·Child Type Constraint 준수 | 부재 — `DEP_TYPES`(`Dependencies.php:26`)는 **엣지 종류**(FS 등)이지 **노드 타입 제약 아님** | `NOT_APPLICABLE` |
| 21 | Inverse Relationship 일관성 | 부재 — 🔴**함정: `graph_edge` 양방향 인덱스(`Db.php:838-839`)·`pm_task_dependencies` pred/succ 인덱스는 조회 성능용이지 역관계 정의가 아니다.** 역관계 선언·검증 0 | `NOT_APPLICABLE` |
| 22 | Path Index 일관성 | 부재 — **Closure Table·Materialized Path 컬럼 grep 0** · Path Index 전례 **0** | `ABSENT` |
| 23 | Snapshot 생성 가능 | 부재(조직) · 선례 = `menu_defaults(snapshot_data JSON, version)`(`AdminMenu.php:120`·생성 `:308`) · `pm_baseline(snapshot_json, captured_at)`(`PM\Enterprise.php:55`·`:360-364`) | `PARTIAL`(선례만) |
| 24 | Approval Routing Eligible Path 존재 | 부재 — 승인 라우팅 전무(5-3-2 §12) | `ABSENT` |
| 25 | Manager Resolution Eligible Path 존재 | 부재 — `reports_to` **0** · `manager_id` **0**(단 `team.manager_user_id` 존재·평면) | `ABSENT` |
| 26 | Immutable Version Hash 유효 | 부재(조직) · 선례 = `schema_migrations.checksum`(`Migrate.php:50` `hash('sha256',$sql)`·:63-64·:145) · `menu_audit_log.hash_chain CHAR(64)`(`AdminMenu.php:128`·생성 :182-197·`lastHash()` :214-219)(🔴 쓰기 체인만 실재·`verify()` 0·preimage `ts` `:195` 소실 → tamper-evident 아님; 검증형 정본 = `SecurityAudit::verify():56-68`) | `PARTIAL`(선례만) |

**실측 개수: 26 / 26 전사.** 원문은 **검증 체크리스트**이며 **필수필드 축이 아니다** → 목록이 `evidence` 로 끝나지 **않는다**(원문 :2143 = `Immutable Version Hash 유효`). **관례에 맞추려고 `evidence` 를 추가하지 않았다.**

커버리지 = **`VALIDATED_LEGACY`(알고리즘) 4**(#1·#5·#8·#9) · `PARTIAL` 6(#4·#6·#7·#11·#23·#26) · `NOT_APPLICABLE` 7 · `ABSENT` 9.
→ ★**26항목 중 조직 그래프에 실제로 배선된 것은 0.** 4건은 **PM 도메인에서 검증된 알고리즘**이다.

## 2. 규칙

- ★🔴 **`Dependencies::validateDependency`(`PM/Dependencies.php:79-100`) 재구현 절대 금지 — 확장하라.** 반복 DFS + `$visited` + tenant 필터 + 반복 예산 + **쓰기 전 차단**은 레포 최고 품질이며 §52 #1·#8·#9 를 실제로 충족한다. 조직 그래프 검증은 **이 함수의 일반화**(테이블·엣지 타입 파라미터화)로 가야 하며, **두 번째 순환 검출기 신설은 헌법 위반**이다.
- ★🔴 **"검증"과 "은폐"를 구분하라 — `Gantt:98` 은 반례다.** `isset($taskMap[...])` 로 **댕글링 엣지를 조용히 스킵**하는 것은 #6/#7(Source·Target Node 존재)을 **충족하지 않는다.** 오히려 **끊어진 엣지를 정상처럼 보이게 만든다**(288차 `ok=>true` 위장과 동형). 조직 그래프는 **쓰기 시점에 노드 존재를 검사하고 422 로 거절**해야 한다 — `Dependencies::create` 도 현재 `validId`(**형식만**) 검사뿐이므로 **이 지점은 확장 대상**이다.
- ★⚠️ **`$depth < 10000`(`:84`)을 "Maximum Depth 준수"(#11)로 계산하지 마라.** `:97` 이 **pop 1회당 증가**하므로 **방문 노드 수 = 반복 예산**이지 트리 깊이가 아니다. §52 #11 은 **정책 깊이 한도**를 요구하므로 **신규**다. 진짜 깊이 캡 선례는 `AdminMenu:545`(`$depth<100`, 조상 1홉씩 상향)다.
- 🔴 **`JourneyBuilder:511-518` 을 참조 구현으로 삼지 마라.** **런타임 방문집합만** 있고 **작성자 JSON 을 무검증**한다(`:512` 자인) — 즉 **순환을 저장은 허용하고 실행 때만 막는다.** §52 는 **"Hierarchy Version 활성화 전 검증"**(:2116)이므로 **쓰기 전 차단**(`Dependencies:32-34` 패턴)이 정본이다.
- 🔴 **`graph_node`/`graph_edge`(`Db.php:816-839`)를 §52 커버로 계산 금지.** 구조는 §15/§16 의 쌍둥이(Node/Edge 분리·타입드·가중치·양방향 인덱스)이나 ⓐ 도메인 = **마케팅 귀속**(influencer→creative→sku→order) → `KEEP_SEPARATE_WITH_REASON` ⓑ **순환 방어가 아예 없다** ⓒ **내부 생산자 0**(`upsertNode`/`upsertEdge` 호출처 = 핸들러·라우트뿐·frontend 0 → 외부 POST 전용 · **VACUOUS 가능성 미배제**). **단 §66 선례 가치는 최상 — 전용 그래프 DB 도입은 불필요**(Neo4j/Cypher/Gremlin/Neptune **grep 0**).
- 🔴 **#21 Inverse Relationship 을 양방향 인덱스로 계산 금지.** 인덱스는 **조회 성능**이지 **역관계 선언**이 아니다 — 규율 9 직격.
- **#26 Immutable Version Hash 는 "선례 없음→신설"이 아니다.** `schema_migrations.checksum`(SHA-256) · `menu_audit_log.hash_chain`(SHA-256 prev-chain 쓰기 `AdminMenu.php:182-197` · 🔴 `:18` 은 *주석*이고 `verify()`·preimage ts 없음 → **tamper-evident 아님**) **쓰기 알고리즘은 실구현**이다(검증형은 `SecurityAudit::verify()`). 🔴 **"해시체인 없음"을 전역 명제로 인용하면 오염이다** — 참인 것은 **전역 `audit_log`(4컬럼·tenant 없음·해시체인 없음 `Db.php:540-545`)에 한해서**다.
- **#23 Snapshot 도 선례 실재** — `menu_defaults`(version+snapshot_data) · `pm_baseline`(`captured_at` 명명 일치). 단 **`menu_defaults` 는 immutable_hash 없음 · 전역 1행(tenant 없음) · 최신 1건만 조회** → **그대로 복제 금지**.
- **N+1 순회 금지** — `GraphScore::scoreInfluencer:187-240` 은 **하드코딩 3-hop 런타임 전개**에 **hop3∈hop2∈hop1 = N+1**(`:207-219`). 285차 "루프 내 외부API N+1 = 즉시장애" 트랩의 DB판이며 **Path Index(#22) 도입의 정당화 근거**다.
- **스키마 도입 제약**: `backend/migrations/` **172차 정지** → `ensureTables` 멱등 패턴 + **MySQL/SQLite 두 방언 동시 작성** 의무. ⚠️단 **PM 8테이블은 변종** — 마이그레이션 정의 + 런타임 자가치유 **병행**(`PM\Shared::ensurePmTables:37-53` 이 부재 시 `Migrate::applyFiles` 로 168차 SQL 을 **런타임 적용**). 조직 그래프가 `Dependencies` 를 확장한다면 **이 변종 패턴을 따르게 된다**.
- **회귀 커버리지 0** — `tools/e2e/` 3종에서 `organization|hierarchy|org_unit|sso|scim` **grep 0**. §52 구현 시 **E2E 신설이 완료 조건**이다.
