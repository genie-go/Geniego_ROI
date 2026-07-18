# DSAR — Supervisory Path (§49 · §77 저장 전략)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §49 · §77 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

**본 문서 = §49 `SUPERVISORY_PATH` 의 필수 필드 축(18) + §77 저장 전략 반영.** Path Type 축(13)은 [DSAR_SUPERVISORY_PATH_TYPE.md](DSAR_SUPERVISORY_PATH_TYPE.md).

## 0. 현행 실측 (file:line)

### 🔴 **§49 Path Index 는 순수 신규 — 전례 0**

| §77 권장 기술 | 레포 전례 | 증거 |
|---|---|---|
| **Adjacency List** | ✅ **단일 지배** | `pm_task_dependencies`(`Handlers/PM/Dependencies.php:38-41`) · `graph_edge`(`Db.php:826-837`) · `app_user.parent_user_id`(`UserAuth.php:156-167`) · `menu_tree` |
| **Closure Table** | ❌ **0** | `closure`·`ancestor`·`descendant` **backend/src grep 0** |
| **Materialized Path** | ❌ **0** | `materialized_path`·path prefix 컬럼 **0** |
| Nested Set | ❌ **0** | `lft`·`rgt`·`nested set` **0** |
| **Recursive CTE** | ❌ **0** | **`WITH RECURSIVE`·`CONNECT BY` backend/src grep 0** |
| **Graph Database** | ❌ **0** | `graph_node`/`graph_edge` = **관계형 테이블**(Neo4j 등 도입 0) |
| Bitemporal Table | ❌ **0** | `valid_from`/`valid_to`/`effective_to` **grep 0** · §38 이중 시간축 **전례 0** |
| Event-sourced Relationship History | ❌ **0** | append-only 선례는 `pm_audit_log`·`menu_audit_log` 뿐이며 **감사 로그이지 이벤트 소싱 아님**(🔴 `menu_audit_log.hash_chain` 도 쓰기 체인만 — `verify()` 0·preimage ts(`:195`) 소실 → tamper-evident 아님 · 검증형 정본 = `SecurityAudit::verify():56-68`) |

> **∴ 레포는 Adjacency List 단일 지배**이며 **트리 순회 전례가 전부 애플리케이션 계층**이다(이식성 — MySQL/SQLite 양 방언 지원 목적).
> | 전례 | 계층 | 증거 |
> |---|---|---|
> | DFS 도달성 | **PHP 반복 루프** | `Handlers/PM/Dependencies.php:79-100`(`while ($stack …)` · 홉마다 **별도 SELECT** `:89-93`) |
> | Topological Sort | **PHP Kahn** | `Handlers/PM/Gantt.php:104-118` |
> | parent 체인 조립 | **PHP `while`** | `ChannelSync.php:958-964` |
>
> 🔴 **어느 것도 SQL 재귀를 쓰지 않는다** → **§49 Path 사전계산(Path Index)은 레포 최초**다.

### 🔴 **`Db::sql()` 은 DDL 전용 번역기 — SELECT·CTE 미지원**

`Db::sql()`(`Db.php:177-194`)은 **`private static`** 이며 **DDL 문자열만 변환**한다:
- `:189` `INT AUTO_INCREMENT PRIMARY KEY` → `INTEGER PRIMARY KEY AUTOINCREMENT` · `:190-193` `TINYINT`/`DOUBLE`/`MEDIUMTEXT`/`VARCHAR(n)` 치환 · `:194` `ENGINE=InnoDB` 제거
- **실측: 비-DDL 호출자 0건**(`self::sql(`/`Db::sql(` 전수 grep — `CREATE TABLE`/`ALTER`/`CREATE INDEX` 외 히트 **없음**)

→ **재귀 CTE 를 쓰더라도 방언 차이를 흡수해 줄 계층이 없다.** MySQL/SQLite **양 방언 수기 중복 작성 의무**.

⚠️ **라이브 SQLite 버전 미실측 → 재귀 CTE 가용성은 추론이다.** SQLite 는 3.8.3+ 에서 `WITH RECURSIVE` 를 지원하나 **본 세션에서 운영/데모 SQLite 버전을 측정하지 않았다.** **"재귀 CTE 를 쓸 수 있다"를 사실로 인용 금지.**

### 인접 실측

| 항목 | 실측 | 판정 |
|---|---|---|
| `supervisory_path` 테이블 | **grep 0** | `ABSENT` |
| `path length`·`chain depth` | **grep 0** | `ABSENT` |
| Migration 경로 | 🔴 `backend/migrations/` **21파일 · 172차 정지**(최신 `20260527_172_002_coupon_tables.sql`) → `ensureTables` 멱등 경유 | 제약 |

## 1. 원문 전사 + 판정 — **원문 18종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | supervisory_path_id | 부재 · ID 선례 `self::genId('dep')`(`Dependencies.php:35`) | `ABSENT` |
| 2 | supervisory_hierarchy_version_id | 🔴 **버전 축 0**(`version` grep 0 · `menu_defaults.version` = 리터럴 `'baseline'` **라벨**) | `ABSENT` |
| 3 | subordinate node | 부재(§47 노드 축 미수용) | `ABSENT` |
| 4 | manager node | 부재 | `ABSENT` |
| 5 | path length | 🔴 **grep 0** · ⚠️ `Dependencies.php:84` `$depth<10000` 은 **깊이가 아니라 방문 노드 예산**(`:97` pop 마다 증가) — path length 로 계산 금지 | `ABSENT` |
| 6 | path type | 13종 부재 → [DSAR_SUPERVISORY_PATH_TYPE.md](DSAR_SUPERVISORY_PATH_TYPE.md) | `ABSENT` |
| 7 | relationship sequence | 부재 · 🔴 Adjacency List 는 **경로를 저장하지 않는다**(홉마다 재질의) | `ABSENT` |
| 8 | primary path 여부 | 부재 · 복수 경로 표현 수단 0(규칙 10) | `ABSENT` |
| 9 | direct manager 포함 여부 | 부재 | `ABSENT` |
| 10 | functional manager 포함 여부 | 부재 · `app_user.team_id` **단일 컬럼(1인 1팀)** → 병존 표현 불가 | `ABSENT` |
| 11 | matrix manager 포함 여부 | 부재 · matrix 축 0 | `ABSENT` |
| 12 | legal entity crossings | 부재 · Legal Entity 축 0 | `ABSENT` |
| 13 | organization crossings | 부재 · 🔴 계층 링크 0(`team` 에 `parent_team_id` 없음) | `ABSENT` |
| 14 | valid_from | 🔴 **grep 0** · Bitemporal 전례 0 | `ABSENT` |
| 15 | valid_to | 🔴 **grep 0** | `ABSENT` |
| 16 | computed_at | 부재 · ⚠️ **`as_of` 2건은 응답 타임스탬프**(`PgSettlement.php:279`·`AttributionEngine.php:666`)이지 as-of 질의 아님 · 🔴 **`pm_baseline.captured_at` 은 DB 컬럼이 아니라 `snapshot_json` 내부 JSON 키**(`Handlers/PM/Enterprise.php:360` · DDL 은 `created_at` `:55`/`:62`) → **인덱스 불가** | `ABSENT` |
| 17 | status | 부재 · ⚠️ **`is_active` 재사용 금지**(계정 상태 · fail-open) | `ABSENT` |
| 18 | evidence | 부재 · 저장 선례 = `pm_audit_log.diff_json`(migration `…168_008:13`) | `ABSENT`(선례는 `LEGACY_ADAPTER`) |

**실측 개수: 18 / 18 전사**(측정기 §49 합계 31 = 필수 필드 18 + Path Type 13 · **본 문서는 18 담당**). 커버리지 = `ABSENT` 18 · 커버 **0**.

## 2. 규칙 (§77 저장 전략 반영)

- 🔴 **§49 Path Index 는 순수 신규다 — "기존 스택을 따르면 된다"가 성립하지 않는다.** §77 이 제시한 7개 기술 중 **레포에 전례가 있는 것은 Adjacency List 하나뿐**이며, **Adjacency List 는 정의상 Path 를 저장하지 않는다**(§49 가 요구하는 바로 그것).
- ★ **Adjacency List 단일 지배 + 애플리케이션 계층 순회**가 레포 관례다(이식성 — MySQL/SQLite 양 지원). **Closure Table·Materialized Path 도입은 관례 이탈**이므로 ADR 에 **이탈 사유·이식성 영향**을 명시해야 한다.
- 🔴 **재귀 CTE 를 기본안으로 삼지 마라.** ① **레포 전례 0** ② **`Db::sql()` 은 DDL 전용**(`Db.php:177-194` · **비-DDL 호출자 0건 실측**)이라 **방언 흡수 계층이 없다** → **MySQL/SQLite 수기 중복** ③ ⚠️ **라이브 SQLite 버전 미실측 → 가용성은 추론이며 사실로 인용 금지**. **SQLite 폴백은 실재하는 운영 경로**다(`Db.php` MySQL 불가 시 자동 폴백).
- ★ **권장 = 애플리케이션 계층 사전계산 + Path 테이블 영속**(Closure Table 형). 근거: 순회 로직을 **PHP 에 두면 방언 무관**(레포 3개 전례 전부 이 형태) · Path 테이블은 **평범한 SELECT** 로 읽힌다 → `Db::sql()` 제약·SQLite 버전 추론 **양쪽을 회피**한다. 🔴 **단 이는 설계 권고이며 채택 결정은 별도 승인세션.**
- 🔴 **Path 계산기는 `Dependencies::validateDependency:79-100` 을 재사용하라**(재구현 금지) — **반복형 DFS + `$visited` + 매 홉 tenant 술어(`:90-91`) + 쓰기 전 422 차단(`:32-34`)**.
  - 🔴 **`pm_task_dependencies` 스키마는 복제 금지** — `:90-91` 이 **`dep_type` 을 술어에 안 넣어 전 타입 무차별 순회**한다 → **§11 27종별·§49 Path Type 13종별 경로 분리가 불가능**해진다. **경로 타입별 계산은 술어 분리가 전제.**
  - 🔴 **★경로 접두 필수 — `backend/src/PM/` 는 존재하지 않는다**(`ls` 실측). 정확한 경로 = **`backend/src/Handlers/PM/`**(5-3-3-1 문서 25편 오표기 전파).
  - 🔴 **`ChannelSync.php:954-964` 를 순회 선례로 삼지 마라** — 주석 `:954` 가 *"순환/과도한 깊이 방어"* 를 자칭하나 **`$visited` 없이 `:959` `$guard < 10` 으로 깊이만 자른다** → **순환 시 탐지 없이 조용히 절단**(규칙 8).
- ★ **#16 `computed_at` + 재계산 트리거가 §49 의 핵심 난점**이다 — Path 는 **파생 데이터**이므로 Edge 변경 시 **무효화·재계산**이 필요하다. 🔴 **레포에 파생 캐시 무효화 선례가 없다** → 신규 설계. **`ensureTables` 는 데이터 변환·백필을 하지 않으므로**(§40 집행 수단 없음) **초기 Path 백필은 수기 이행 계획 필요**.
- ⚠️ **Migration 경로 없음** — `backend/migrations/` **172차 정지** → `CREATE TABLE IF NOT EXISTS`+`try{ALTER}catch{}` 멱등 경유. **ALTER 실패가 조용히 삼켜진다**(가짜 녹색) → 스키마 적용 여부를 **실측으로 확인**하라(265차 Paddle 오탐 회피 = 라이브 `SHOW COLUMNS`).
- 🔴 **#18 evidence 는 `pm_audit_log` 패턴 확장**(`tenant_id NOT NULL`+`diff_json`+append-only). **`menu_audit_log` 스키마 복제 금지 — `tenant_id` 없음**(`lastHash():214-219` 에도 tenant 술어 없음) · **알고리즘만 이식 + `WHERE tenant_id=?` 필수**. 🔴 단 이식 대상은 **쓰기 체인뿐** — `menu_audit_log` 는 `verify()` 0·preimage ts(`:195`) 소실로 **tamper-evident 아님** → 검증기(`SecurityAudit::verify():56-68`)까지 함께 이식하라.
</content>
