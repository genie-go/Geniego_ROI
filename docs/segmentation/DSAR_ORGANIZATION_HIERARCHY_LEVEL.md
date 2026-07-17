# DSAR — Hierarchy Level (§20)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §20 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `ORGANIZATION_HIERARCHY_LEVEL` | **grep 0** — 계층 엔티티 자체 부재 | `ABSENT` |
| ★**`wms_bins.level`** | 🔴 **물리 선반단이지 트리 depth 가 아니다** — `Wms.php:193-194` 실측: `zone VARCHAR(60), aisle VARCHAR(40), rack VARCHAR(40), level VARCHAR(40), slot VARCHAR(40), seq INT` = **고정깊이 평면 컬럼** · `parent_id` 없음 · 순회 없음 | `KEEP_SEPARATE_WITH_REASON` — **최대 함정** |
| `depth` 필드 (유일) | `ChannelSync::elevenStCategoryCatalog` **11번가 카테고리**(`ChannelSync.php:914`) — 채널 카테고리 트리의 depth. **조직 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 깊이 캡 (런타임) | `PM/Dependencies.php:79-100` **10000** · `AdminMenu.php:545` `$depth<100` · `ChannelSync.php:954-963` `guard<10` — **전부 순환 방어 가드**이지 레벨 정의 아님 | `LEGACY_ADAPTER` |
| 트리 레벨 정의 | `level code`/`level number`/`allowed organization types` 축 **grep 0** — `menu_tree`(`AdminMenu.php:108-117`)도 **레벨 개념 없이 `parent_id` 만** | `ABSENT` |
| 실제 사용자 트리 깊이 | ★**2 로 봉인**(`app_user.parent_user_id` 전 생성 경로가 owner 직속 — [§17 문서](DSAR_ORGANIZATION_PRIMARY_PARENT_POLICY.md)) → **Level 0/1 외 존재 불가** | `PARTIAL` |
| `authority tier` | `tier` = 플랜 5티어(246차) · `roleRank`(`index.php:554` viewer0/connector1/analyst2/admin3) — **API 등급**. `team_role` 3단(`TeamPermissions.php:17`) — **팀 서열**. **레벨↔권한 tier 바인딩 코드 0** | `KEEP_SEPARATE_WITH_REASON` |
| Tenant별 Custom Level | 부재 · ⚠️ `menu_tree` 는 **`tenant_id` 컬럼조차 없다**(전역 단일 트리) — 테넌트별 트리 커스터마이즈 선례 0 | `ABSENT` |

### ★축 주의 — `level` 이름 함정 (본 문서 최대 위험)

🔴 **`wms_bins.level` 을 Hierarchy Level 로 계산하면 역산이다.**

```
zone VARCHAR(60), aisle VARCHAR(40), rack VARCHAR(40), level VARCHAR(40), slot VARCHAR(40)
                                                        ^^^^^ 물리 선반 "단"
```
`Wms.php:193-194` 는 **창고 위치를 5개 고정 컬럼으로 평면 기술**한다. `level` = *"랙의 몇 번째 단"* 이라는 **물리 좌표 성분**이지 **트리 깊이가 아니다**. 증거 3중:
1. **`parent_id` 없음** — 트리 자체가 없다.
2. **고정 깊이 평면 컬럼** — zone/aisle/rack/level/slot 이 항상 5개. 가변 깊이 트리가 아니다.
3. **순회 코드 없음** — 조상/후손 조회가 존재하지 않는다. `regionOf()`(`Wms.php:284-286`)는 창고 **시·도** 매핑이지 계층 순회가 아니다.
→ **창고 계층 아님**(ⓑ 실측 §18 확정). 이름이 원문 `level number`/`Level 0..7` 과 겹치는 것이 **형태 유사 함정**이다.

🔴 **`ChannelSync` 의 `depth`(`:914`) 도 커버 아님** — 11번가 카테고리(대>중>소>세) 트리의 깊이다. 단 **선례 가치는 최상**: 1패스 `dispNo→[name,parent,leaf]` **XMLReader 스트리밍 맵**(15,000노드 OOM 회피 `:919`) → 2패스 **parent 체인 역주행으로 `whole`("대 > 중 > 소 > 세") 구성**(`:918`) · **순환·과깊이 가드 `guard<10`**(`:954-963`) = **adjacency → materialized path 파생의 유일 실선례**.
⚠️ **충돌 해소**: `Catalog.php` 의 `channel_category_catalog` 는 **별개** — `whole_name` 이 경로처럼 보이나 **`LIKE '%term%'` 중위 검색**(`Catalog.php:299`) · `parent_id` **없음** · `is_leaf=1` 만 노출(`:296-297`) = **리프 평면 캐시**. **트리 아님.** 선례는 `ChannelSync` 쪽이다.

## 1. 원문 전사 + 판정 — **원문 14종(필수 필드) + 예시 8종**

### 1-1. 필수 필드 — **원문 14종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | hierarchy_level_id | 부재 — 엔티티 grep 0 | `NOT_APPLICABLE` |
| 2 | organization_hierarchy_id | 부재 | `NOT_APPLICABLE` |
| 3 | level code | 부재 · 🔴 `wms_bins.level`(`Wms.php:193-194`)은 **물리 선반단** — 매핑 금지 | `NOT_APPLICABLE` |
| 4 | level name | 부재 | `NOT_APPLICABLE` |
| 5 | level number | 부재 · 유일 `depth` = 11번가 카테고리(`ChannelSync.php:914`) — 채널 도메인 | `KEEP_SEPARATE_WITH_REASON` |
| 6 | allowed organization types | 부재 — 조직 타입 축 자체 없음([Type 문서](DSAR_ORGANIZATION_HIERARCHY_TYPE.md) 커버 0) · `TEAM_TYPES` 17종(`TeamPermissions.php:44-49`)은 **평면 라벨** | `NAME_ONLY` |
| 7 | expected parent level | 부재 — 레벨 간 제약 grep 0 | `NOT_APPLICABLE` |
| 8 | expected child level | 부재 | `NOT_APPLICABLE` |
| 9 | skip level allowed 여부 | 부재 — ★**애초에 skip 할 레벨이 없다**(사용자 트리 깊이 **2 봉인**) | `NOT_APPLICABLE` |
| 10 | approval eligible 여부 | **부재** — 승인 도메인 grep 0(5-3-2 확정) · 승인 = 핸들러 메서드(`Mapping::approve` `Mapping.php:238-294`) | `ABSENT` |
| 11 | manager resolution eligible 여부 | **부재** — `reports_to`·`manager_id` **grep 0**(단 `team.manager_user_id` 존재 = **팀 1개의 관리자**이지 보고선 해석 아님) · manager 상향 탐색 코드 0 | `ABSENT` |
| 12 | default authority tier reference | 부재 · 인접 3축 **전부 미연결** — `roleRank`(`index.php:554`) **기계 신원 API 등급** / `team_role`(`TeamPermissions.php:17`) **사람 서열** / 플랜 tier. ★**`effectiveScope():245-246` 은 `team_role` 만 읽고 `auth_role` 을 읽지 않음** = 두 축 매핑 코드 없음 | `KEEP_SEPARATE_WITH_REASON` |
| 13 | status | 도메인별 개별(`team.status` 등) · 레벨 status 부재 | `NOT_APPLICABLE` |
| 14 | evidence | `menu_audit_log.hash_chain`(`AdminMenu.php:128`) / `pm_audit_log`(migration `20260526_168_008`) 패턴 확장 | `LEGACY_ADAPTER` |

**실측 개수: 14 / 14 전사.** 커버리지 = `VALIDATED_LEGACY` **0** · `LEGACY_ADAPTER` 1 · `KEEP_SEPARATE_WITH_REASON` 2 · `NAME_ONLY` 1 · `ABSENT` 2 · `NOT_APPLICABLE` 8.

### 1-2. 예시 레벨 — **원문 8종**

원문은 이를 **예(例)** 로 제시하며 말미에 *"실제 고객사 구조에 맞게 Tenant별 Custom Level을 허용하라"* 고 명시한다 — **고정 enum 이 아니다**. 전사하되 **요구 항목으로 취급하지 않는다**.

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Level 0: Corporate Group | 부재 — `corporate`·`group` 조직 축 grep 0 | `NOT_APPLICABLE` |
| 2 | Level 1: Holding Company | 부재 — `holding` grep 0 · `app_user.company` 는 **문자열 1개** | `ABSENT` |
| 3 | Level 2: Legal Entity | **부재** — `legal_entity`·`biz_no`/`brn`/`corp_reg`/`tax_id` **전부 0건** · 사업자정보 = `app_user` 평문 필드(`UserAuth.php:499`·`:1720`) | `ABSENT` |
| 4 | Level 3: Business Unit | **부재** — 🔴 `business_unit` 유일 히트 = **Trustpilot 리뷰 API 자격증명 `business_unit_id`**(`ChannelSync.php:2573-2580`·`ChannelRegistry.php:126`) — 무관 | `ABSENT` |
| 5 | Level 4: Division | `division` **grep 0** | `ABSENT` |
| 6 | Level 5: Department | `department` **grep 0** | `ABSENT` |
| 7 | Level 6: Team | ★**유일 실재** — `team` 테이블(`TeamPermissions.php:145-151`) + `ORG_PRESET` 15단위(`:706-722`) + `seedOrg`(`:725-753`) **실배선**(`routes.php:1589`·`:2570`·`teamApi.js:261`). 🔴 **단 `parent_team_id` 없음** → **레벨 6 만 있고 5·7 이 없으며 상하 링크도 없다** = 레벨이 아니라 **단일 평면** | `PARTIAL` |
| 8 | Level 7: Squad | `squad` **grep 0** | `ABSENT` |

**실측 개수: 8 / 8 전사.** 커버리지 = `VALIDATED_LEGACY` **0** · `PARTIAL` 1 · `ABSENT` 6 · `NOT_APPLICABLE` 1.

> **합계: 원문 22종(필수 필드 14 + 예시 8) / 22 전사. 커버 0.**
> ★**8단 예시 중 실재는 Level 6(Team) 하나뿐이고, 그마저 부모 컬럼이 없어 "레벨"이 아니다.** 단일 평면에 레벨 번호를 붙일 수는 없다.

## 2. 규칙

- 🔴 **`wms_bins.level`(`Wms.php:193-194`) 을 Hierarchy Level 로 계산 금지.** **물리 선반단이지 트리 depth 가 아니다** — `parent_id` 없음 · 고정깊이 평면 컬럼(zone/aisle/rack/level/slot) · 순회 없음. **본 문서의 최대 함정**이며 이름 겹침만으로 커버 계산하면 역산이다.
- 🔴 **`ChannelSync` 의 `depth`(`:914`)·`Catalog` 의 `whole_name` 을 커버로 계산 금지.** 전자는 11번가 카테고리 트리(**선례 가치는 최상**), 후자는 **`parent_id` 없는 리프 평면 캐시**(`Catalog.php:296-299` — `LIKE '%term%'` 중위 검색)로 **트리조차 아니다**. 둘을 혼동하지 마라.
- 🔴 **`ORG_PRESET` 15단위를 "Level 6 실재"의 근거로 확대 해석 금지.** `team` DDL 에 **`parent_team_id` 가 없어** "마케팅 글로벌팀"이 "마케팅팀"의 자식이라는 **구조 링크가 0**이다. 레벨 축은 **부모 링크 없이 성립하지 않는다** → `PARTIAL`(구조가 아니라 열거). 단 **재구현 금지 · `ORG_PRESET`/`seedOrg`(동명 skip 멱등 · 트랜잭션 · 감사 `:747`) 확장**이 정본.
- 🔴 **"Tenant별 Custom Level" 을 `menu_tree` 패턴으로 구현하지 마라.** `menu_tree` 는 **`tenant_id` 컬럼이 없는 전역 단일 트리**(`AdminMenu.php:108-117`)다. 조상 walk + 순환 차단(`wouldCycle` `:540-555` — 반복 조회 + `$depth<100` 하드캡 `:545` · 자기참조 즉시 차단 `:542` · 이동 시 검사 후 UPDATE `:487-503`)의 **알고리즘 형태만 인용**하고, **테넌트 격리는 별도 설계**하라.
  ⚠️ 또한 `menu_tree` 를 **"운영 중인 트리"로 인용 금지** — `reorder` **프론트 호출자 0** · `AdminMenuManager.jsx:252` *"menu_tree 가 비어 있습니다"* 분기 + `:341` *"⚠ menu_tree 미등록"* 배지 → **운영 0행 가능성 실재**(라이브 미검증).
- 🔴 **`default authority tier reference` 를 `roleRank`(`index.php:554`) 로 배선 금지.** `roleRank` 의 `connector` 가 결정적 증거 — **조직에 "커넥터" 직위는 없다**. 유일 의미 = **ingest 엔드포인트 쓰기 허용**(`:571-574`) = **기계 신원의 API 능력 등급**이며, **주체가 사람이 아니라 키**(`$keyRow['role']` → `auth_key`/`auth_role` 주입 `:590-593`)다. 판정 축도 **HTTP 메서드**(`:568`)이지 리소스·조직이 아니다. 조직 역할축(`team_role`)과는 **매핑 코드가 없다**(`effectiveScope():245-246` 은 `team_role` 만 읽음).
- 🔴 **`manager resolution eligible` 을 `team.manager_user_id` 로 구현 가능하다고 전제 금지.** 그것은 **팀 1개의 관리자 포인터**이고, manager resolution 은 **상향 탐색**을 요구하는데 **`reports_to`·`manager_id` 가 grep 0**이며 `app_user.parent_user_id` 는 **owner 직속 2단 봉인**(→ 상향 탐색 결과가 언제나 owner)이다.
- **레벨 제약 검증(`expected parent level`·`skip level allowed`)은 `Dependencies::validateDependency`(`PM/Dependencies.php:79-100`) 의 ★쓰기 전 차단**(`:32-34` → 422) **패턴을 확장하라.** 사후 검출이 아니라 **쓰기 전 거부**가 레포 정본. 신규 검증기 신설 = 두 번째 엔진 = 헌법 위반.
- **순회 방식은 재귀 CTE 가 아니라 애플리케이션 계층 반복 DFS 를 택하라.** `WITH RECURSIVE` **backend/src 0** · `Db::sql()`(`Db.php:177-191`)은 **DDL 전용 번역기**(AUTO_INCREMENT/TINYINT/DOUBLE/COMMENT 치환)로 **SELECT·CTE 미지원** → 재귀 CTE 는 번역기 지원 없이 raw SQL 이며 **두 번째 순회 방식 도입**이 되어 정합 부담을 진다. 레포 트리 5개가 **전부 애플리케이션 계층 순회**를 택했다(이식성).
  ⚠️ 엔진 지원 여부(MySQL 8.0.37 지원 · SQLite 3.8.3+ 지원)는 **라이브 SQLite 버전 미실측 → 추론이다. 사실로 인용 금지.**
- **N+1 순회 금지.** `GraphScore::scoreInfluencer:187-240` = **하드코딩 3-hop 런타임 전개** · **hop3∈hop2∈hop1 = N+1**(`:207-219`) — 285차 *"루프 내 N+1=즉시장애"* 트랩의 DB판. 레벨/경로 조회를 순회로 매번 풀면 동일 함정 → **Path Index 도입 정당화 근거**.
- 🔴 22종 **"있다고 가정"하고 배선 금지.**
