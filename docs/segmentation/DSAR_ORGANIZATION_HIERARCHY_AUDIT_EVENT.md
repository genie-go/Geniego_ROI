# DSAR — Organization Hierarchy Audit Event (§63)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §63 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

계약명: **`ORGANIZATION_HIERARCHY_AUDIT_EVENT`**

## 0. 현행 실측 (file:line)

### 🔴🔴 최우선 정정 — **"해시체인 없음"을 전역 명제로 쓰면 거짓이다**

이 절은 **289차 초판 브리핑이 오염원이었던 지점**이다. 초판은 *"`audit_log` 해시체인 없음"* 을 **전역 명제**로 서술했고, 그 결과 §63 을 **"선례 없음 → 신설"** 로 오도할 뻔했다. **전수조사가 이를 뒤집었다.**

| 명제 | 진위 |
|---|---|
| "레포에 감사 해시체인이 없다" | 🔴 **거짓** |
| "**전역 `audit_log` 에 한해** 해시체인이 없다" | ✅ **참** |

### ★감사 3계층 실측 — 해시체인 선례는 **실재한다**

| 계층 | 실측 | 판정 |
|---|---|---|
| ★**`menu_audit_log`** | **`hash_chain CHAR(64) DEFAULT NULL`**(`AdminMenu.php:128`) = **SHA-256 prev-chain 실구현**<br>· 생성 `:182-197` — `$prevHash = self::lastHash($pdo)`(`:182`) → payload 에 `'prev' => $prevHash`(`:194`)+`'ts'`(`:195`) 포함 → `$hash = hash('sha256', (string)$payload)`(`:197`) → INSERT 시 `hash_chain` 컬럼에 기록(`:199-210`)<br>· `lastHash()` `:214-219` — `SELECT hash_chain FROM menu_audit_log ORDER BY id DESC LIMIT 1`<br>· 🔴 **`:18` 의 "tamper-evident" 주석은 거짓** — preimage 의 `'ts'=>date('c')`(`:195`)가 **INSERT 컬럼 목록(`:199-203`)에 `created_at` 이 없어 미저장**(`:129` DB DEFAULT 가 채움) → **preimage 재구성 불가 → 변조 탐지 원리적 불가** · **검증기 0**(`hash_equals` 레포 24히트 중 AdminMenu **0건**). ★**체인 연결(prev)은 실재하나 검증 가능성은 영구 부재**<br>· 컬럼: `menu_id`·`action`·`old_value` JSON·`new_value` JSON·`changed_by`·`changed_by_role`·`reason`·`ip_address`·`user_agent`·`request_id`·`hash_chain`·`created_at`(`:123-129`) — ✅**필드 축은 풍부하며 유효한 선례**(해시체인 축과 분리)<br>· 마이그레이션 실재: `backend/migrations/20260526_168_102_create_menu_audit_log.sql`<br>· 🔴 **`tenant_id` 컬럼 없음**(전역 단일 메뉴 트리 도메인)<br>· ★**해시체인 실 정본 = `SecurityAudit`**(`:27` tenant 포함 · `:29-31` `created_at` 명시 저장 · **`verify():56-68`**) | **`PARTIAL`**(해시체인 축: 연결 실재·검증 부재 → **§63 정본 아님**) · 필드 축은 유효 선례 |
| ★**`pm_audit_log`** | migration `20260526_168_008_create_pm_audit_log.sql:5-20`<br>· **`tenant_id VARCHAR(64) NOT NULL`**(`:7`) ★<br>· `actor_user_id`(`:8`)·`actor_api_key`(`:9`) **행위자 2축**<br>· `entity_type` ENUM(`:10`)·`entity_id`(`:11`)<br>· `action` ENUM(create/update/delete/restore/status_change/assign/unassign)(`:12`)<br>· **`diff_json JSON`**(`:13`)<br>· `ip_addr`(`:14`)·`user_agent`(`:15`)·`created_at`(`:16`)<br>· ★**3인덱스**: `idx_pm_audit_tenant_time(tenant_id, created_at)`(`:17`) · `idx_pm_audit_entity(entity_type, entity_id)`(`:18`) · `idx_pm_audit_actor(actor_user_id)`(`:19`)<br>· 헤더 주석 `:2-3` — **append-only · application 차원 UPDATE/DELETE 거부**<br>· 🔴 **`hash_chain` 없음** | ★**`VALIDATED_LEGACY`(테넌트·엔티티·diff 패턴)** — **§63 의 정본 확장 대상** |
| 전역 **`audit_log`** | MySQL `Db.php:540-545` / SQLite `AdminGrowth.php:157-159`<br>· 컬럼 = **`actor`·`action`·`details_json`·`created_at` 4개뿐**(+`id`)<br>· 🔴 **`tenant_id` 없음**<br>· 🔴 **`hash_chain` 없음**<br>· 주석(`AdminGrowth.php:156`) *"audit_log 는 기존 테이블 재사용"* | `PARTIAL` — **가장 약한 계층. 조직 감사의 기반으로 쓰면 후퇴** |
| `journey_node_logs` | ★**`tenant_id` 보유**(`JourneyBuilder.php:69`) + **조회 술어 실배선**(`:248`) | `KEEP_SEPARATE_WITH_REASON`(마케팅 도메인) — 스키마 선례로만 |

### ★§63 의 정확한 성격 — **신설이 아니라 확장이다**

🔴 **§63 을 "선례 없음 → 신설"로 규정하면 오판이다.** 정확한 성격:

> **§63 = `menu_audit_log`(해시체인) + `pm_audit_log`(tenant·entity·diff·인덱스) 패턴의 확장.**

두 선례가 §63 이 요구하는 능력을 **분할 보유**한다:

| 요구 능력 | `menu_audit_log` | `pm_audit_log` | 전역 `audit_log` |
|---|---|---|---|
| tamper-evident 해시체인 | ✅ `hash_chain`(`:128`·`:182-197`) | ❌ | ❌ |
| tenant 격리 | ❌ | ✅ `:7` + 인덱스 `:17` | ❌ |
| entity 축(type+id) | 단일(`menu_id`) | ✅ `:10-11` + 인덱스 `:18` | ❌ |
| diff / old·new | ✅ `old_value`/`new_value` JSON | ✅ `diff_json` `:13` | ❌(`details_json` 뭉치) |
| 행위자 | `changed_by`+`changed_by_role` | ✅ `actor_user_id`+`actor_api_key` + 인덱스 `:19` | `actor` 문자열 |
| append-only 선언 | tamper-evident 주석 `:18` | ✅ 주석 `:2-3` | ❌ |
| 요청 추적 | ✅ `request_id`·`ip_address`·`user_agent` | ✅ `ip_addr`·`user_agent` | ❌ |

→ **조직 감사 = 두 패턴의 합집합**(`pm_audit_log` 골격 + `menu_audit_log` 해시체인)이며, **어느 것도 처음부터 발명할 대상이 아니다.**

🔴 **중복 감사 스토어 신설 금지.** 네 번째 감사 테이블을 독립 설계하면 레포에 **감사 스토어 4벌** — 헌법(중복 엔진 금지)·5-3-2 "술어 SSOT 부재" 패턴의 재발이다.

### 조직 도메인 이벤트 실측

| 항목 | 실측 | 판정 |
|---|---|---|
| `ORGANIZATION_*` 이벤트 코드 | `backend/src` grep **0**(레포 히트 = 289차 스펙 문서 자신뿐) | `ABSENT` |
| 조직 상태 전이(생성/개명/이전/병합/분할/중지/폐지) | 조직 엔티티 자체 부재 | `ABSENT` |
| 감사 기록 호출 관례 | `seedOrg` 감사(`TeamPermissions.php:747`) · `AdminMenu` 해시체인 기록(`:182-210`) | `LEGACY_ADAPTER` |

## 1. 원문 전사 + 판정 — **원문 36종**

원문(§63) 전제: *"지원 Event:"*

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | ORGANIZATION_REGISTRY_CREATED | Registry 부재 · 인접 = `seedOrg` 일괄생성+감사(`TeamPermissions.php:725-753`·`:747`) | `NOT_APPLICABLE` |
| 2 | ORGANIZATION_UNIT_CREATED | Unit 부재 · `pm_audit_log.action` ENUM `create`(`:12`) 어휘 선례 | `NOT_APPLICABLE` |
| 3 | ORGANIZATION_UNIT_VERSION_CREATED | 엔티티 version 부재(`menu_defaults.version` 1건뿐) | `NOT_APPLICABLE` |
| 4 | ORGANIZATION_UNIT_ACTIVATED | 부재 · `pm_audit_log.action` `status_change` 어휘 선례 | `NOT_APPLICABLE` |
| 5 | ORGANIZATION_UNIT_RENAMED | 부재 · ★`menu_audit_log.old_value`/`new_value`(`:125`) = 개명 기록 패턴 선례 | `NOT_APPLICABLE` |
| 6 | ORGANIZATION_UNIT_REPARENTED | 부재 · ★**패턴 선례 최적**: `AdminMenu` 이동 = `wouldCycle` 검사 후 UPDATE(`:487-503`) + 해시체인 기록 | `NOT_APPLICABLE` |
| 7 | ORGANIZATION_UNIT_TRANSFERRED | 부재 | `NOT_APPLICABLE` |
| 8 | ORGANIZATION_UNIT_MERGED | 부재 · ⚠️인접 merge 개념 = `crm_identity_merge_link`(`CRM.php:708-712`) — **union-find 무방향 등가류**(대칭·추이적)이지 조직 병합 아님 | `NOT_APPLICABLE` |
| 9 | ORGANIZATION_UNIT_SPLIT | 부재 | `NOT_APPLICABLE` |
| 10 | ORGANIZATION_UNIT_SUSPENDED | 부재 · `team.status` 존재(팀 축) | `NOT_APPLICABLE` |
| 11 | ORGANIZATION_UNIT_RETIRED | 부재 | `NOT_APPLICABLE` |
| 12 | ORGANIZATION_TYPE_REGISTERED | Type 부재 · `TEAM_TYPES` 17종(`TeamPermissions.php:44-49`) = 평면 문자열 카탈로그(등록 이벤트 없음) | `NOT_APPLICABLE` |
| 13 | ORGANIZATION_RELATIONSHIP_REGISTERED | 관계 타입 부재 | `NOT_APPLICABLE` |
| 14 | ORGANIZATION_HIERARCHY_CREATED | Hierarchy 부재 | `NOT_APPLICABLE` |
| 15 | ORGANIZATION_HIERARCHY_VERSION_CREATED | 부재 | `NOT_APPLICABLE` |
| 16 | ORGANIZATION_HIERARCHY_VALIDATED | 부재 · 검증 선례 = `PM/Dependencies::validateDependency`(`:79-100`) — 감사 이벤트 발행은 없음 | `NOT_APPLICABLE` |
| 17 | ORGANIZATION_HIERARCHY_ACTIVATED | 부재 | `NOT_APPLICABLE` |
| 18 | ORGANIZATION_GRAPH_NODE_ADDED | 조직 노드 부재 · `graph_node` upsert 존재하나 **마케팅 귀속** + ⚠️**내부 생산자 0** | `NOT_APPLICABLE` |
| 19 | ORGANIZATION_GRAPH_EDGE_ADDED | 동상 | `NOT_APPLICABLE` |
| 20 | ORGANIZATION_GRAPH_EDGE_ENDED | 부재 · ★엣지 "종료" = 폐구간 필요 · **`effective_to` grep 0** → 표현 수단 없음 | `NOT_APPLICABLE` |
| 21 | ORGANIZATION_CYCLE_DETECTED | 조직 부재 · ★탐지 선례 최상급 = `PM/Dependencies:32-34`(422 `cycle_detected`) · `AdminMenu::wouldCycle(:540-555)` · `PM/Gantt:104-125`(Kahn) — **탐지는 하되 감사 이벤트로 발행하지 않는다** | `NOT_APPLICABLE` |
| 22 | ORGANIZATION_ORPHAN_DETECTED | 부재 | `NOT_APPLICABLE` |
| 23 | ORGANIZATION_LEGAL_ENTITY_BOUND | Legal Entity 부재(`biz_no`/`corp_reg`/`tax_id` 0건) | `NOT_APPLICABLE` |
| 24 | ORGANIZATION_WORKSPACE_BOUND | Workspace 부재 | `NOT_APPLICABLE` |
| 25 | ORGANIZATION_COST_CENTER_BOUND | `cost_center` grep 0 | `NOT_APPLICABLE` |
| 26 | ORGANIZATION_PROFIT_CENTER_BOUND | `profit_center` grep 0 | `NOT_APPLICABLE` |
| 27 | ORGANIZATION_MATRIX_RELATION_CREATED | `matrix_` grep 0 | `NOT_APPLICABLE` |
| 28 | ORGANIZATION_MEMBERSHIP_CREATED | Membership 부재 · `pm_audit_log.action` `assign` 어휘 선례 | `NOT_APPLICABLE` |
| 29 | ORGANIZATION_MEMBERSHIP_ENDED | 부재 · `unassign` 어휘 선례 | `NOT_APPLICABLE` |
| 30 | ORGANIZATION_OWNER_ASSIGNED | 조직 owner 부재 · 인접 = `team.manager_user_id`(팀 1인 지정) | `NOT_APPLICABLE` |
| 31 | ORGANIZATION_SNAPSHOT_CREATED | 조직 스냅샷 부재 · ★선례 = `menu_defaults` 생성(`AdminMenu.php:308`) · `pm_baseline`(`PM\Enterprise.php:360-364`) — **immutable_hash 없음** | `NOT_APPLICABLE` |
| 32 | ORGANIZATION_RETROACTIVE_CORRECTION_RECORDED | Retroactive 부재 · ★집행 수단도 없음(`ensureTables` **백필 없음**) | `NOT_APPLICABLE` |
| 33 | ORGANIZATION_FUTURE_CHANGE_SCHEDULED | Future-dated 부재 · 인접 스케줄러 = SMS 예약 워커(286차) — 조직 무관 | `NOT_APPLICABLE` |
| 34 | ORGANIZATION_FUTURE_CHANGE_ACTIVATED | 부재 | `NOT_APPLICABLE` |
| 35 | ORGANIZATION_DRIFT_DETECTED | Drift 개념 부재(Path Index 부재 → drift 대상 없음) | `NOT_APPLICABLE` |
| 36 | MANUAL_REVIEW_REQUESTED | 부재 · ★**접두 없는 유일 항목 — 원문 그대로 전사**(`ORGANIZATION_` 붙이지 않았다) · 인접 = `admin_growth_approval` pending(`AdminGrowth.php:1321`·`:1327`) | `NOT_APPLICABLE` |

**실측 개수: 36 / 36 전사.** 판정 = `NOT_APPLICABLE` 36 / 36(이벤트 어휘 축). **단 저장 계층 축 = `VALIDATED_LEGACY`** — `menu_audit_log`(**필드 축 한정** · 🔴`tenant_id` 부재)/`pm_audit_log`(tenant+entity+diff_json) 확장. ⚠️**`menu_audit_log.hash_chain` 은 확장 대상에서 제외** — 검증 영구 불가(`:195` preimage `ts` 미저장 · 검증기 0) = `PARTIAL`. **해시체인이 필요하면 `SecurityAudit::verify():56-68` 을 이식하라.**

## 2. 규칙

- 🔴🔴 **"해시체인 없음"을 전역 명제로 인용 금지 — 289차 초판 브리핑 오염원.** 참인 것은 **전역 `audit_log`(`actor`·`action`·`details_json`·`created_at` 4컬럼 · tenant 없음 · 해시체인 없음 — `Db.php:540-545` / `AdminGrowth.php:157-159`)에 한해서**다. ★**SHA-256 prev-chain 쓰기 선례는 실재한다**: `menu_audit_log.hash_chain CHAR(64)`(`AdminMenu.php:128`) — 생성 `:182-197` · `lastHash():214-219`. 🔴 **단 tamper-evident 는 아니다** — `:18` 은 *주석*이고(규칙#3: 주석≠근거), `verify()` 0·preimage ts(`:195`) 소실로 **검증 불가능한 장식**. 검증형 정본 = **`SecurityAudit::verify():56-68`**(preimage ts 저장 `:31`).
- 🔴 **§63 은 "선례 없음 → 신설"이 아니라 `menu_audit_log`/`pm_audit_log` 패턴 확장이다.** 두 선례가 요구 능력을 **분할 보유**(§0 능력 대조표) → **조직 감사 = `pm_audit_log` 골격(tenant NOT NULL + entity type/id + diff_json + 3인덱스 + append-only) + `menu_audit_log` 해시체인(prev-chain SHA-256)의 합집합.** 🔴 단 `menu_audit_log` 는 **쓰기 체인만 실재**하고 검증기(`verify()`)가 0이며 preimage `ts`(`:195`) 소실로 재계산 불가 → **tamper-evident 아님**: 가져올 것은 prev-chain **쓰기** 알고리즘이며, 실제 재계산·교차검증이 도는 검증형 정본은 `SecurityAudit::verify():56-68` 이다.
- 🔴 **중복 감사 스토어 신설 금지.** 현재 감사 스토어 3벌(+`journey_node_logs`). 네 번째를 **독립 설계**하면 헌법 위반(중복 엔진)이며, 5-3-2 "술어 SSOT 부재"·ⓑ `isDemo` 12벌과 동형 재발이다.
- 🔴 **전역 `audit_log` 를 조직 감사 기반으로 쓰지 마라 = 기능후퇴.** `tenant_id` 없음 + 해시체인 없음 + `details_json` 뭉치 = **3계층 중 최약**. 조직은 **테넌트 격리 절대**(헌법 데이터 Vol1) → tenant 없는 테이블은 **구조적으로 부적격**.
- ⚠️ **`menu_audit_log` 를 그대로 복제하지 마라**: 🔴 **`tenant_id` 컬럼이 없다**(전역 단일 메뉴 트리 도메인 전제). **가져올 것은 해시체인 알고리즘이지 스키마 전체가 아니다.**
- ★**해시체인 구현 시 원 선례의 성질을 보존하라**(`AdminMenu.php:182-197`): payload 에 **`prev`(`:194`) + `ts`(`:195`) 포함** 후 SHA-256 → 이전 해시가 다음 해시에 물려야 tamper-evident 가 성립한다. `lastHash()`(`:214-219`)가 `ORDER BY id DESC LIMIT 1` 인 점 — **테넌트별 체인**으로 확장 시 **`WHERE tenant_id=?` 를 반드시 추가**해야 체인이 테넌트 간에 얽히지 않는다(원 선례엔 이 술어가 없다 — 전역 단일 체인이므로).
- 🔴 **36종 "있다고 가정"하고 배선 금지.** 이벤트 어휘 전건 `NOT_APPLICABLE` — 조직 도메인 실 코드 0.
- **#36 은 원문 그대로 `MANUAL_REVIEW_REQUESTED`**(접두 없음). ★**`ORGANIZATION_` 을 붙여 정규화하지 마라** — 요구 날조다.
- **#21(CYCLE_DETECTED) 은 탐지가 아니라 발행이 갭이다.** 탐지 선례는 레포 최상급(`PM/Dependencies:32-34` 422 `cycle_detected` · `AdminMenu::wouldCycle` · `PM/Gantt` Kahn)이나 **어느 것도 감사 이벤트를 발행하지 않는다**. → 조직 설계 시 **탐지 로직 재사용 + 이벤트 발행만 신규**.
- **#20/#32/#33/#34 는 표현·집행 수단부터 부재**: `effective_to` **grep 0**(엣지 종료 표현 불가) · `WHERE effective_from <= :as_of` 술어 **전역 0건** · `backend/migrations/` **172차 정지** + ★**`ensureTables` 는 테이블 생성만 하고 백필을 하지 않는다** → **Retroactive/Future 이벤트는 어휘 이전에 인프라가 신규 대상**.
- **스키마 작성 의무 상속**: 모든 스키마가 **MySQL/SQLite 두 방언 수기 중복**(`CRM.php:48` vs `:77` · `menu_audit_log` `AdminMenu.php:123-129` MySQL / SQLite 별도) → 조직 감사 테이블 도입 시 **양쪽 동시 작성 의무**. 또한 `pm_audit_log` 는 **마이그레이션 정의 + 런타임 자가치유 병행**(`PM\Shared::ensurePmTables:37-53` 이 부재 시 `Migrate::applyFiles` 로 168차 SQL 을 런타임 적용) — **172차 이후 도메인은 이 병행 경로를 쓸 수 없다.**
