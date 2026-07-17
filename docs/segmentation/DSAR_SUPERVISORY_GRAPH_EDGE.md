# DSAR — Supervisory Graph Edge (§48)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §48 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### 🔴 **`graph_edge` 는 스키마 쌍둥이다 — "부재"라 쓰지 마라**

| 항목 | 실측 | 판정 |
|---|---|---|
| `graph_edge` DDL | `Db.php:826-837` — `id`·`tenant_id`·`src_type`·`src_id`·`dst_type`·`dst_id`·`edge_weight DOUBLE`·`edge_label`·`meta_json`·`created_at` **10컬럼** | **스키마 쌍둥이** |
| **인덱스** | ✅ **2개 존재** — `idx_graph_edge_src(tenant_id,src_type,src_id)`(`:838`) · `idx_graph_edge_dst(tenant_id,dst_type,dst_id)`(`:839`). ★**node 축(`:816-824`)과 대비 — node 는 0** | `PARTIAL` |
| **UNIQUE** | ⚠️ **0** — 멱등성은 스키마가 아니라 **애플리케이션 SELECT-then-upsert 로 확보**(`GraphScore.php:138-148`) | 🔴 결격 |
| 타입 게이트 | 🔴 **없음** — `upsertEdge:117-119` 는 **비어있지 않음만 검증**. `upsertNode` 의 화이트리스트(`:57-59`)가 **여기엔 없다** | 🔴 우회 경로 |
| 방향 규약 | **`src → dst`**(`:829-832`) · 의미 = **마케팅 귀속 흐름** `influencer→creative→sku→order`(`:193`,`:207`,`:217`) | **도메인 상이** |
| 내부 생산자 | ⚠️ **0**(쓰기 = `GraphScore.php:146` 외부 API 엔드포인트 자신뿐) | **`VACUOUS` 미배제** |

### ★★ **§48 방향 표준화 요구 — 레포는 도메인마다 방향 규약이 다르다**

원문 말미: *"Edge 방향은 `subordinate → manager` 또는 `manager → subordinate` 중 하나로 표준화하고 **전 Repository에서 동일하게 사용하라**."* **현행 실측 — 표준이 없다:**

| 스토어 | 방향 규약 | 도메인 | 증거 |
|---|---|---|---|
| `graph_edge` | **`src → dst`** | **마케팅 귀속**(영향 흐름) | `Db.php:829-832` · `GraphScore.php:193`,`:207` |
| `pm_task_dependencies` | **`predecessor → successor`** | **일정 선후행** | `Handlers/PM/Dependencies.php:38-41`,`:90-91` |
| `app_user.parent_user_id` | **child → parent**(자식이 부모를 가리킴) | **테넌트 소속 포인터**(보고선 아님) | `UserAuth.php:156-167` |

🔴 **3개 스토어의 방향 의미가 전부 다르다**(영향 흐름 · 시간 선후 · 소속 상위). **"레포 관례가 `src→dst` 이니 따르면 된다"는 거짓** — `graph_edge` 의 `src→dst` 는 **"영향을 주는 쪽 → 받는 쪽"**이지 계층 상하가 아니다. **§48 방향 결정은 전례 없는 신규 판단**이며, 어느 쪽을 고르든 **위 3개와 충돌하지 않는 별도 규약임을 명시**해야 한다.

⚠️ **`app_user.parent_user_id` 는 방향 선례로 인용 금지** — **보고선이 아니라 테넌트 소속 포인터**이며(주석 `UserAuth.php:156`), **owner 직속 2단으로 봉인**(전 생성경로 `:1226-1227`·`EnterpriseAuth.php:500`·`:1574/1581`·`:670` — **3단 경로 없음**), 순회는 **단일 홉**(`resolveTenantId:200-217` `LIMIT 1` 1회 · 재귀 없음)이다.

## 1. 원문 전사 + 판정 — **원문 16종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | supervisory_graph_edge_id | `graph_edge.id INT AUTO_INCREMENT`(`Db.php:827`) — 형태만 | `PARTIAL` |
| 2 | supervisory_hierarchy_version_id | 🔴 **버전 축 0**(optimistic lock `version` grep 0 · `menu_defaults.version` 은 리터럴 `'baseline'` 라벨) | `ABSENT` |
| 3 | source node | `src_type`+`src_id`(`:829-830`) — ★**의미 = 마케팅 영향 기점**(계층 하위 아님) | `KEEP_SEPARATE_WITH_REASON` |
| 4 | target node | `dst_type`+`dst_id`(`:831-832`) — 동상 | `KEEP_SEPARATE_WITH_REASON` |
| 5 | manager relationship type | 🔴 `edge_label VARCHAR(100)`(`:834`) = **무검증 자유 문자열**(ENUM/CHECK/`in_array` **0**) → §11 27종 **강제 불가** | `NAME_ONLY` |
| 6 | relationship id | 부재 · FK 0 | `ABSENT` |
| 7 | primary 여부 | 부재 · 🔴 복수 관계 표현 수단 0이라 **primary 를 선언할 상대가 없다**(규칙 10) | `ABSENT` |
| 8 | hierarchy forming 여부 | 부재 | `ABSENT` |
| 9 | manager chain eligible 여부 | 부재 · `manager_chain` **전역 grep 0** | `ABSENT` |
| 10 | approval routing eligible 여부 | 🔴 **적격 술어 0** — 승인 4경로 전량 "호출자가 곧 승인자" | `ABSENT` |
| 11 | edge priority | ⚠️ **`edge_weight DOUBLE DEFAULT 1.0`**(`:833`) = **귀속 가중치**(`SUM(edge_weight)` 스코어 집계 `:193`,`:207`) — **우선순위 아님**(형태 유사 함정) | `KEEP_SEPARATE_WITH_REASON` |
| 12 | legal entity boundary type | 부재 · Legal Entity 축 0 | `ABSENT` |
| 13 | valid_from | 🔴 **grep 0** · `created_at`(`:836`)은 **행 생성 시각**이지 유효 시작 아님 | `ABSENT` |
| 14 | valid_to | 🔴 **grep 0** | `ABSENT` |
| 15 | status | 부재 · `graph_edge` 에 상태 컬럼 없음(`:826-837`) | `ABSENT` |
| 16 | evidence | 부재 · `meta_json MEDIUMTEXT`(`:835`) = **인덱스 불가·as-of 질의 불가** | `KV_ONLY` |

**실측 개수: 16 / 16 전사**(측정기 16 · 원문 대조 일치). 커버리지 = 커버 **0** · `KEEP_SEPARATE_WITH_REASON` 3 · `PARTIAL` 1 · `NAME_ONLY` 1 · `KV_ONLY` 1 · `ABSENT` 10.

## 2. 규칙

- 🔴 **새 엣지 스토어 신설 금지** — `graph_edge`(`Db.php:826-837`)가 **스키마 쌍둥이**. **확장하라.**
- ★ **§48 방향 결정은 전례가 없다.** `src→dst`(영향)·`predecessor→successor`(시간)·`child→parent`(소속) **3개 규약이 공존**하며 **어느 것도 감독 계층이 아니다**. 방향을 고르되 **"기존 관례 준수"라 적지 마라 — 준수할 관례가 없다.** 선택 후 **전 Repository 단일 규약**을 문서·린트로 강제해야 한다(원문 요구).
- 🔴 **#11 `edge_weight` 를 `edge priority` 로 계산 금지.** `SUM(edge_weight)` 로 **스코어를 집계하는 귀속 가중치**(`:193`,`:207`,`:232`)이며, 우선순위로 전용하면 **마케팅 스코어가 오염**된다(값 단일소스 위반).
- 🔴 **#5 `edge_label` 에 §11 27종을 담지 마라(그대로는).** `VARCHAR(100)` **무검증**이라 누구든 임의 문자열 삽입 가능 → **"열거에 없다"는 논증이 성립하지 않는다**(규칙 11 — 제약이 **코드로 강제**되는지 먼저 보라). 타입 강제가 필요하면 **`in_array` 화이트리스트 또는 CHECK 를 신설**해야 한다.
- 🔴 **`upsertEdge` 는 타입 게이트가 없다**(`:117-119` 비어있지 않음만 검증) → **`upsertNode` 화이트리스트(`:57-59`)를 우회해 임의 `node_type` 을 `graph_node` 에 삽입**한다(`:126-133`). §47/§48 확장 전 **이 우회로 봉인이 선결**이며 **별도 승인세션** 대상이다.
- ⚠️ **UNIQUE 0 · 멱등은 애플리케이션 의존**(`:138-148` SELECT-then-upsert). 동시 요청 하 **TOCTOU 로 중복 엣지 가능** — ⚠️**등급 미부여**(실 경합 경로 미검증). 스키마 `UNIQUE(tenant_id,src_type,src_id,dst_type,dst_id)` 가 정공법이나 **기존 중복 행이 있으면 ALTER 실패** → `ensureTables` 의 **`try{ALTER}catch{}` 가 조용히 삼킨다**(가짜 녹색).
- ⚠️ **`VACUOUS` 미배제 — "운영 중인 그래프"로 인용 금지.** 내부 생산자 0.
</content>
