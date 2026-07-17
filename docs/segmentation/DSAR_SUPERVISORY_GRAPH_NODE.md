# DSAR — Supervisory Graph Node (§47)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §47 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### 🔴 **`graph_node` 는 스키마 쌍둥이다 — "부재"라 쓰지 마라**

`graph_node`(`Db.php:816-824`)는 §47 과 **형태가 겹친다**. 신설 시 **두 번째 그래프 스토어 = 헌법 위반**(중복 인텔리전스 금지).

| 항목 | 실측 | 판정 |
|---|---|---|
| `graph_node` DDL | `Db.php:816-824` — `id`·`tenant_id`·`node_type VARCHAR(100)`·`node_id`·`label`·`meta_json`·`created_at` **7컬럼** | **스키마 쌍둥이** |
| **인덱스·UNIQUE** | ⚠️ **0** — `:816-824` 는 **`id` PK 뿐**. **`:838-839` 는 `graph_edge` 전용**(`idx_graph_edge_src`·`idx_graph_edge_dst`) | 🔴 결격 |
| 노드 타입 게이트 | `GraphScore.php:57-59` 화이트리스트 `['influencer','creative','sku','order']` → **422** | 🔴 **`upsertNode` 한정 — 아래 ★정정** |
| 라우트 | `POST /v419/graph/nodes` → `upsertNode`(`routes.php:721`) · `POST /v419/graph/edges` → `upsertEdge`(`:723`) | — |
| **내부 생산자** | ⚠️ **0** — 쓰기 경로는 `GraphScore.php:77`·`:130` 뿐이며 **둘 다 외부 API 엔드포인트 자신**. 주문/인플루언서 수집 파이프라인 등 **내부 생산자 0** | **`VACUOUS` 미배제** |
| 판독자 | `scoreInfluencer`/`scoreCreative`/`scoreSku`/`scoreOrder`/`summary` — **4종 마케팅 타입에 하드와이어**(`GraphScore.php:193`,`:207`,`:217`,`:232`,`:271`,`:286`,`:297`) | **마케팅 귀속 도메인** |

### ★★ **정정 — 화이트리스트는 저장을 막지 못한다**(ⓑ 전제가 실측으로 뒤집힘 · 규칙 8/12)

ⓑ 브리핑은 *"`GraphScore.php:57-59` 화이트리스트 → 422 가 조직/Subject 노드 저장을 **막는다**"* 로 기술했다. **정의부 실측 결과 이는 부분적으로 거짓이다:**

- ✅ `upsertNode`(`:44-82`) — 화이트리스트 `:57-59` **있음** → `node_type='SUBJECT'` **422 차단** ✓
- 🔴 **`upsertEdge`(`:107-148`) — 화이트리스트 없음.** 검증은 `:117-119` **비어있지 않음뿐**이며, `:126-133` 이 **임의 타입 문자열로 `graph_node` 행을 자동 삽입**한다:
  ```
  :127  $ins = ... 'INSERT IGNORE' : 'INSERT OR IGNORE';
  :128  foreach ([[$srcType, $srcId], [$dstType, $dstId]] as [$t, $nid]) {
  :130      $ins . ' INTO graph_node(tenant_id,node_type,node_id,label,meta_json,created_at)'
  ```
  → **`POST /v419/graph/edges` 에 `src_type=SUBJECT` 를 보내면 `node_type='SUBJECT'` 행이 저장된다.** 노드 타입 계약은 **엔드포인트 하나에만 걸린 우회 가능한 게이트**다.
- 🔴 **`INSERT IGNORE` 는 여기서 무의미하다** — `graph_node` 에 **UNIQUE 가 없으므로**(`:816-824`) IGNORE 할 충돌이 없다 → **엣지 upsert 마다 중복 노드 행이 누적**된다. `graph_edge` 는 SELECT-then-upsert 로 멱등(`:138-148`)이나 **노드 자동 upsert 는 멱등이 아니다.**
  ⚠️ **등급 미부여** — 라이브 행 수 미실측. **`graph_node` 인덱스·UNIQUE 0 의 실동작 귀결**로만 기록한다.
- ★ **`:65-67` 주석이 UNIQUE 부재를 자인**하나, **본 판정의 근거는 주석이 아니라 DDL 정의부 `Db.php:816-824` 직독**이다(규칙 8).

> **∴ `KEEP_SEPARATE_WITH_REASON` 의 근거를 다시 적는다.**
> "화이트리스트가 저장을 막는다"는 **불완전한 사실**이므로 근거로 쓸 수 없다. 유효한 근거 3가지:
> ① **선언된 타입 계약이 4종 마케팅 엔티티**(`:57-59`)이며 ② **판독자 전량이 그 4종에 하드와이어**(`:193`~`:297`) → SUBJECT/POSITION 노드를 넣어도 **읽는 코드가 없다** ③ **저장 계층이 §47 을 담을 수 없다** — UNIQUE·인덱스 **0** · `valid_from`/`valid_to`/`status`/`version` **컬럼 0**.
> 🔴 **"다른 것이니 새로 만든다"가 아니라 "같은 스토어를 확장하되 §47 요건을 이 스토어가 충족 못 한다"가 판정 사유**다.

### ⚠️ **"운영 중인 그래프"로 인용 금지**

**내부 생산자 0** → `graph_node` 는 **외부에서 POST 하지 않으면 영원히 빈 테이블**이다. **`VACUOUS` 를 배제하지 못했다.** §47 설계 시 "이미 그래프가 돌고 있다"고 인용하면 **가짜 녹색**이다.

## 1. 원문 전사 + 판정 — **원문 24종**(Node Type 8 + 필수 필드 16)

### 1-1. Node Type — **8종 전부 저장 불가**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | SUBJECT | 🔴 `upsertNode` 화이트리스트 422(`:57-59`) · 판독자 0 · ★단 `upsertEdge:126-133` 우회로 **행 자체는 저장 가능**(위 ★정정) | `KEEP_SEPARATE_WITH_REASON` |
| 2 | POSITION | 동상 · Position 축 0(§3.1 `CONTRACT_ONLY`) | `KEEP_SEPARATE_WITH_REASON` |
| 3 | ORGANIZATION | 동상 · `ORGANIZATION_*` **backend 전역 grep 0** | `KEEP_SEPARATE_WITH_REASON` |
| 4 | VIRTUAL_ROOT | 동상 · `root` 개념 0 | `KEEP_SEPARATE_WITH_REASON` |
| 5 | VACANT_POSITION | 동상 · `vacan` grep 0 · ⚠️ §76 실재 결함(강등 경로 0) | `KEEP_SEPARATE_WITH_REASON` |
| 6 | ACTING_ASSIGNMENT | 동상 · `acting` grep 0 · 🔴 `impersonate:466-525` 는 **신원 위장 열람**(계산 금지) | `KEEP_SEPARATE_WITH_REASON` |
| 7 | INTERIM_ASSIGNMENT | 동상 · `interim` 1건 = 지오리프트(`AttributionEngine.php:672`) **무관** | `KEEP_SEPARATE_WITH_REASON` |
| 8 | EXTERNAL_REFERENCE | 동상 · 외부 상관자 3컬럼은 `app_user` 에만(`EnterpriseAuth.php:64-65`) | `KEEP_SEPARATE_WITH_REASON` |

### 1-2. 필수 필드 — **원문 16종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | supervisory_graph_node_id | `graph_node.id INT AUTO_INCREMENT`(`Db.php:817`) — **형태만 존재** | `PARTIAL` |
| 2 | supervisory_hierarchy_version_id | 🔴 **버전 축 0** — optimistic lock `version` grep 0 · 엔티티 `version` 1건은 `menu_defaults.version` 이며 **유일 생산자 `AdminMenu.php:309` 가 리터럴 `'baseline'` 고정 = 버전이 아니라 라벨** | `ABSENT` |
| 3 | node type | `graph_node.node_type VARCHAR(100)`(`:819`) · **8종 전부 미수용**(위) | `KEEP_SEPARATE_WITH_REASON` |
| 4 | subject reference | `node_id VARCHAR(255)`(`:820`) = **자유 문자열 · FK 0** | `NAME_ONLY` |
| 5 | position reference | 부재 | `ABSENT` |
| 6 | organization reference | 부재 | `ABSENT` |
| 7 | tenant_id | ✅ `graph_node.tenant_id NOT NULL`(`:818`) · 전 질의 tenant 술어(`:70`,`:91`,`:94`) | `VALIDATED_LEGACY`(**본 축 유일**) |
| 8 | legal entity | 부재 · `ceo_name` = 프로필 평문(`UserAuth.php:306-307`) | `ABSENT` |
| 9 | hierarchy level | 부재 · 🔴 계층 링크 0(`ORG_PRESET` 열거+시딩뿐 · `team` 에 `parent_team_id` 없음) | `ABSENT` |
| 10 | executive level | 🔴 **`admin_level`(master\|sub `UserAuth.php:171`) ≠ Executive Level**(콘솔 특권) · `grade` 45+건 전량 무관 | `ABSENT` |
| 11 | active incumbent | 부재 · ⚠️ **`is_active` 재사용 금지**(계정 상태 · `NOT NULL DEFAULT 1` → **미지가 자동 "가용" = fail-open**) | `ABSENT` |
| 12 | root 여부 | 부재 | `ABSENT` |
| 13 | valid_from | 🔴 **grep 0** · §38 Business/System 이중 시간축 **전례 0** | `ABSENT` |
| 14 | valid_to | 🔴 **grep 0** | `ABSENT` |
| 15 | status | 부재 · `graph_node` 에 상태 컬럼 없음(`:816-824`) | `ABSENT` |
| 16 | evidence | 부재 · `meta_json MEDIUMTEXT`(`:822`)는 **인덱스 불가·as-of 질의 불가** | `KV_ONLY` |

**실측 개수: 24 / 24 전사**(측정기 24 = Node Type 8 + 필수 필드 16 · 원문 대조 일치). 커버리지 = `VALIDATED_LEGACY` **1**(tenant_id) · `KEEP_SEPARATE_WITH_REASON` 9 · `PARTIAL` 1 · `NAME_ONLY` 1 · `KV_ONLY` 1 · `ABSENT` 11.

## 2. 규칙

- 🔴 **`ORGANIZATION_GRAPH_NODE`/§47 을 "부재"라 쓰지 마라 · 새 그래프 스토어 신설 금지.** `graph_node`(`Db.php:816-824`)가 **스키마 쌍둥이**이며 신설은 **두 번째 그래프 스토어 = 헌법 위반**이다.
- 🔴 **★그러나 "화이트리스트가 막는다"를 근거로 쓰지 마라 — 실측으로 뒤집혔다.** `upsertEdge:126-133` 이 **타입 검증 없이 `graph_node` 를 자동 삽입**하므로 게이트는 **`upsertNode` 한정·우회 가능**하다. 유효 근거 = **① 선언 타입 계약 4종 ② 판독자 하드와이어 ③ 저장 계층 미충족(UNIQUE·인덱스·시점 컬럼 0)**.
- ★ **확장 방향**: `graph_node` 를 **확장**하되 §47 요건 3가지를 **선결**하라 — ① **`UNIQUE(tenant_id,node_type,node_id)` 추가**(현재 0 → 중복 행 누적·upsert 불가) ② **`valid_from`/`valid_to`/`status`/`version` 컬럼** ③ **화이트리스트를 `upsertEdge` 에도 적용**(현행 우회 경로 봉인). ①③ 은 **현행 결함 수정**이므로 **별도 승인세션**(Golden Rule + verify + 배포승인) 대상이다.
- ⚠️ **`VACUOUS` 미배제 — "운영 중인 그래프"로 인용 금지.** 내부 생산자 0(쓰기 경로 = 외부 API 엔드포인트 자신뿐). §47 을 이 위에 얹으면 **빈 파이프라인 위 설계**(280차 팬텀 `/pixel.js` 와 동형).
- 🔴 **`UNIQUE` 추가는 비파괴가 아니다** — 기존 중복 행이 있으면 **ALTER 실패**한다. `ensureTables` 는 **`try{ALTER}catch{}`** 라 **조용히 삼킨다**(가짜 녹색). 🔴 **`ensureTables` 는 데이터 변환·백필을 하지 않는다** → 중복 병합은 **수기 이행 계획 필요**(§40 Retroactive Correction 집행 수단 없음 · migrations 는 **172차 정지**).
- ★ **#7 `tenant_id` 만이 유일한 커버**다. 이식 시 **매 질의 tenant 술어**(`:70`,`:91`,`:94` 패턴)를 유지하라 — `menu_tree`·`menu_audit_log` 처럼 **tenant_id 를 빠뜨린 선례가 레포에 실재**한다.
</content>
