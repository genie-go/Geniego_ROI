# Approval Chain — Snapshot Foundation · 저장 최적화

> EPIC 06-A Part 4-5-3-1-5-3-3-3 · 원문 §49, §50 전사
> 원문 정본: `docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_3_VERBATIM.md`
> 판정 근거: 289차 ⓑ 전수조사(105항목) 실측. 코드 변경 0.

## 1. 원문 전사

### §49. Chain Snapshot Foundation (원문 줄 2254-2305 · 분모 36)

`APPROVAL_CHAIN_SNAPSHOT` — 필수 필드 28 + Snapshot Type 8.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | approval_chain_snapshot_id | `APPROVAL_CHAIN_SNAPSHOT` 부재. Chain 도메인 스냅샷 **0** | ABSENT |
| 2 | snapshot type | 스냅샷 유형 축 **0**. 선례 `menu_defaults`(`AdminMenu.php:119-120`)·`pm_baseline`(`PM/Enterprise.php:53-57`) 모두 유형 컬럼 없음 | ABSENT |
| 3 | tenant | Chain 스냅샷 부재. ★선례 대조: `menu_defaults` DDL(`AdminMenu.php:119-121`)에 **`tenant_id` 컬럼 없음**(전역 단일) · `pm_baseline:54` 는 `tenant_id VARCHAR(100) NOT NULL` 보유 | ABSENT |
| 4 | approval request | 요청 참조 축 **0**. 승인 4경로 어디에도 스냅샷 참조 컬럼 없음 | ABSENT |
| 5 | approval case | 🔴 **Approval Case 개념 자체 ABSENT** — 요청 1행 = 결정 1행 = 종결. 재개·이관 코드 0 | ABSENT |
| 6 | approval requirement | 요구 모델 부재. `required_approvals` 유일 생산자 = `Mapping.php:209-210` **리터럴 `2`** + `Db.php:634` `DEFAULT 2` — UPDATE·설정 API·타 INSERT 전수 0 → **요건 모델이 아니라 상수** | ABSENT |
| 7 | chain definition | Chain Definition 부재(`approval_chain` grep 0) | ABSENT |
| 8 | chain version | Chain Version 축 **0**. optimistic lock `version` grep **0**(`SET version=version+1`·`WHERE version=?` 전역 0) | ABSENT |
| 9 | template version | Template 버전 **0**. 인접 `createJourney:120-125` 리터럴 시드 그래프 — 버전·재적용 전무 | ABSENT |
| 10 | route version | `approval_route`/`route_id` grep **0**. ★오탐: `route` 단독 = SPA URL(`menu_tree.route VARCHAR(255)`)·`backend/src/routes.php` | ABSENT |
| 11 | stage versions | `approval_stage`/`step_order` grep **0**. ★오탐: `stage`/`sc_stages` = 물류 마일스톤(`SupplyChain.php:50-54`, `:193-199`) | ABSENT |
| 12 | level versions | `approval_level`/`approval_depth` grep **0** | ABSENT |
| 13 | condition versions | 조건 버전 **0**. 확장기반 `RuleEngine.php:24`(`OPS:33` 화이트리스트 · `compare:433-439` · 테이블 `:43`)에 버전 축 없음 | ABSENT |
| 14 | applicability reference | Applicability 엔티티 부재. 인접 = `Catalog.php:1016` `HIGH_VALUE_KRW = 5000000.0` → `:1103-1105` `requires_approval=true`·`approval_type='high_value'` — **상수 1개, 참조 불가** | ABSENT |
| 15 | selection policy version | 선택 정책 버전 **0** | ABSENT |
| 16 | priority references | 우선순위 참조 **0**. ★오탐: `source_priority` = 데이터소스 Trust 우선순위(`DataPlatform.php:65`, `:184`) | ABSENT |
| 17 | override references | Override 참조 **0**. ★오탐: `override` = 스칼라 선행순위(`Mmm.php:381-382` · `OrderHub.php:1274`) | ABSENT |
| 18 | fallback references | Fallback 참조 **0**. 현행 폴백은 전부 하드코딩(`JourneyBuilder nextNode:811-814` 위치 폴백 · `pickWeighted:729` 첫 키 폴백) — 참조 가능 엔티티 아님 | ABSENT |
| 19 | organization hierarchy version | 조직 계층 버전 **0**. ⓑ §3.1: `ORGANIZATION_*` 11종 **이름·능력 양쪽 0** · `team`(`TeamPermissions.php:143-151`)에 **`parent_team_id` 없음** · `wms_warehouses`(`Wms.php:59-65`) 완전 평면 | ABSENT |
| 20 | reporting line version | 보고선 버전 **0**. ⓑ §3.2: 🔴 `parent_user_id` 전 4 생성경로가 **owner 로 하드고정**(`UserAuth.php:1225-1227` 주석 자인 · `EnterpriseAuth.php:502` · `UserAuth.php:1549`, `:1576`) → 보고선 자체가 표현 불가 | ABSENT |
| 21 | authority policy references | 권한 정책 참조 **0**. 🔴 ⓑ §3.4 최대 미결: `$roleRank`(`backend/public/index.php:554`) ↔ `team_role`(owner>manager>member) **매핑 코드 전수 0** → 권한 축이 2벌로 분열, 참조할 정본 없음 | ABSENT |
| 22 | actor resolver references | 🔴 **Existing Approval Manager Resolver = ABSENT(능력 확인)**. `resolveApprover`/`routeApproval`/`next_approver`/`approver_id`/`escalat` 승인 히트 **0**. 4경로 전량 "호출자가 곧 승인자" | ABSENT |
| 23 | compiled artifact hash | Compile 산출물 개념 부재 → 해시 대상 없음 | ABSENT |
| 24 | effective_at | 발효 시각 축 **0**(§46 참조 · `effective_to`/`valid_from`/`valid_to` grep 0) | ABSENT |
| 25 | captured_at | Chain 도메인 **0**. ★선례 정정: `pm_baseline` 의 `captured_at` 은 **DB 컬럼이 아니라 JSON 키**(`PM/Enterprise.php:360` `$snapshot = ['captured_at' => self::now(), …]` → `snapshot_json LONGTEXT` `:55` 에 매몰) → **질의 불가** | ABSENT |
| 26 | immutable_hash | Chain 도메인 **0**. 선례 = `SecurityAudit.php:27`(tenant 포함 해시)·`:45-52` DDL·**`verify():56-68`**(`:64` `hash_equals`) + `Migrate.php:50` `schema_migrations.checksum` | ABSENT |
| 27 | status | 스냅샷 상태 축 **0** | ABSENT |
| 28 | evidence | 근거 보존 축 **0** | ABSENT |
| 29 | CHAIN_SELECTION | Snapshot Type 열거 부재 → 유형 미정의 | ABSENT |
| 30 | CHAIN_RESOLUTION | 동일 | ABSENT |
| 31 | CHAIN_BUILD | 동일. Chain Build 단계 개념 자체 부재 | ABSENT |
| 32 | CASE_CREATION | 동일. Approval Case ABSENT → 생성 시점 스냅샷 대상 없음 | ABSENT |
| 33 | TASK_PLAN_REFERENCE | 동일. Approval Task 개념 부재. ★오탐: `pm_task*` = PM 도메인 | ABSENT |
| 34 | CHAIN_CHANGE | 동일(→ `APPROVAL_CHAIN_CHANGE_IMPACT.md`) | ABSENT |
| 35 | RECONCILIATION | 동일(→ `APPROVAL_CHAIN_RECONCILIATION.md`) | ABSENT |
| 36 | AUDIT_RECONSTRUCTION | 동일. 🔴 현행 승인 3종 결정 이력(`Mapping.php:285` 2키 · `Alerting.php:591` 3키 · `AdminGrowth.php:147` 2컬럼) **어느 것도 승인시점 권한/역할/플랜 미보존** → **as-of 재구성 불가** | ABSENT |

### §50. Snapshot 저장 최적화 (원문 줄 2306-2334 · 분모 10)

Snapshot 재사용 시 동일해야 하는 값 10.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | tenant | 재사용 판정 축 부재(스냅샷 자체 0). 선례 `menu_defaults` 는 **매 시드마다 전량 INSERT**(`AdminMenu.php:308-309` `'baseline-'.gmdate('YmdHis')`) — 중복 판정 없음 | ABSENT |
| 2 | chain version | Chain Version 축 **0** | ABSENT |
| 3 | template version | Template 버전 **0** | ABSENT |
| 4 | route version | Route 버전 **0** | ABSENT |
| 5 | override set hash | Override Set 해시 **0**(Override 엔티티 부재) | ABSENT |
| 6 | fallback version | Fallback 버전 **0** | ABSENT |
| 7 | applicability version | Applicability 버전 **0** | ABSENT |
| 8 | selection policy version | 선택 정책 버전 **0** | ABSENT |
| 9 | effective_at 기준 Version Set | as-of Version Set 산출 **0**. `WHERE effective_from <= :as_of` **전역 0** — 레포에 as-of 질의 선례 자체가 없다 | ABSENT |
| 10 | compiled artifact hash | Compile 산출물 부재 | ABSENT |

## 2. 설계 계약

### C-49-1 · 불변성 (원문 §49 산문)
*"Snapshot 생성 후 직접 수정하지 마라."* → `APPROVAL_CHAIN_SNAPSHOT` 은 **INSERT-only**. UPDATE 경로를 만들지 마라. 정정은 §48 Correction Version 신규 행으로만.

### C-49-2 · 이번 단계 범위 한정 (원문 §49 산문)
*"이번 단계에서는 Chain Structure Snapshot을 구현하고, 전체 Hierarchy Snapshot 심화는 5-3-3-11에서 확장하라."*
→ 필드 19(`organization hierarchy version`)·20(`reporting line version`)은 **참조 컬럼만** 두고, 계층 전체 직렬화는 5-3-3-11 로 이연한다. 실측상 두 축은 레포에 **표현 자체가 불가**(§3 참조)하므로 이연이 유일한 정합 선택이다.

### C-49-3 · 스냅샷 선례에서 무엇을 가져오고 무엇을 버리는가

| 선례 | 가져올 것 | 🔴 버릴 것 |
|---|---|---|
| `menu_defaults`(`AdminMenu.php:119-120`) | `snapshot_data JSON NOT NULL` + `version VARCHAR(32) NOT NULL` **2컬럼 분리** 구조 | `version` 이 **리터럴 `'baseline'`**(`:309`) — 실 버전이 아님. `tenant_id` 컬럼 **부재**(전역 단일) |
| `pm_baseline`(`PM/Enterprise.php:53-57`) | `tenant_id NOT NULL` + `KEY idx_bl_project (tenant_id, project_id)` 테넌트 스코프 인덱스 | `captured_at` 이 **JSON 키**(`:360`)라 질의 불가 → **DB 컬럼으로 승격 필수** |
| `SecurityAudit`(`SecurityAudit.php:27`, `:45-52`, `:56-68`) | **tenant 포함 preimage** · `prev_hash`+`hash_chain` 이원 · **`verify()` 검증기 동반**(`:64` `hash_equals`) · `created_at` 을 **애플리케이션이 명시 기록**(`$now = gmdate(...)`)하여 preimage 재구성 가능 | `:31` 감사 실패 비차단(`catch` 무음) — 스냅샷은 **fail-closed** 여야 함 |

### C-49-4 · 🔴 `menu_audit_log.hash_chain` 인용 금지
검증 불가능한 장식이다. preimage 가 `'ts'=>date('c')`(`AdminMenu.php:195`)인데 저장은 `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`(`:129`) → **DB 가 채운 값과 preimage 값이 다르므로 재구성 불가** · `hash_equals` 전역 24히트 중 `AdminMenu` **0건**(검증기 없음). **감사 정본 선례 = `SecurityAudit` 단독.**

### C-50-1 · 정규화 구조 (원문 §50 코드블록 원문)
```text
APPROVAL_CHAIN_SNAPSHOT
= Canonical Immutable Structure Snapshot

APPROVAL_CHAIN_EVENT_REFERENCE
= Request·Case·Task Event에서 Snapshot ID 참조
```
→ 원문 §50 명령: *"동일 Chain Version과 동일 Policy Version 조합을 Approval Event마다 전체 복제하지 마라."* 재사용 판정 키 = §50 표의 **10값 전부 일치**. 부분 일치는 재사용 금지.

### C-50-2 · 재사용 키는 해시로 축약하되 원값도 보존
`compiled artifact hash` 단독 비교로 갈음하지 마라 — 해시 충돌·preimage 변경 시 원값 없이는 §53 Reconciliation 이 차이를 지목할 수 없다.

## 3. 미결·선행조건

### BLOCKED_PREREQUISITE — 스냅샷할 구조가 없다
§49/§50 **46항목 전량 ABSENT**. 스냅샷은 **Chain Definition·Version·Route·Stage·Level·Condition 을 피연산자로 요구**하는데 전부 부재(`approval_chain|approval_route|approval_level|approval_stage|step_order|sequence_no|route_id|next_step|previous_step|approval_depth|approver_order` 전역 grep **0** — 실측 재확인).

### 🔴 필드 19·20 은 "부재"보다 깊다 — 표현 자체가 불가
- **19 organization hierarchy version**: 스냅샷할 계층이 없다. `pm_tasks.parent_task_id`(`migrations/20260526_168_002_create_pm_tasks.sql:8`)가 레포 유일 tenant 격리 자기참조 트리이나 **순회기 0**(이름은 트리, 능력은 평면 리스트) · 도메인은 PM.
- **20 reporting line version**: 🔴 `parent_user_id` 는 **상급자를 표현할 수 없다** — 전 4 생성경로가 owner 로 하드고정(`UserAuth.php:1225-1227` 주석 자인 *"manager 가 추가해도 parent 는 최상위 owner"*). 재해석하면 전 멤버 상급자 = owner **1단 평면**. → **컬럼 재사용 불가 · 쓰기 경로부터 변경 필요.**
- → 두 축은 5-3-3-11 이연(C-49-2) 이전에 **§3.1/§3.2 Foundation 실 구현**이 선행조건이다.

### 스냅샷 선례는 실재하나 Chain 도메인은 0 (규칙 6 — "중복 없음" ≠ "기능 충족")
`menu_defaults`·`pm_baseline` 이 있다고 해서 `APPROVAL_CHAIN_SNAPSHOT` 을 "기존 확장"으로 처리하면 **미달을 중복이라 부르는 것**이다. 두 선례 모두 ①Chain 무관 도메인 ②버전 축 미달(`'baseline'` 리터럴) ③불변 해시 없음 → **§71 "기존 동일 목적 문서/구현 통합" 대상이 아니다**(동일 목적이 아님).

### ★grep 오염 — 인용 전 확인
- `snapshot` **최다 히트 = CCTV JPEG**(`routes.php:271`) — 스냅샷 선례 아님.
- `ClaudeAI.data_snapshot`(`ClaudeAI.php:474`, `:490`) = AI 대화 입력 데이터 캡처 — Chain 무관.
- `AdminMenu.php:584-592`(`invalid_snapshot`) = menu_defaults 복원 경로 — Chain 무관.

### §67 Cache 연동 주의 (규칙 7)
서버 캐시 계층 **자체가 부재**: Redis/Memcached **0**(★오탐 재확인: `redis` grep 3히트 전량 `Payment.php:817-820` `totalBefore`**`Dis`**`c`) · `apcu_*` 는 `SystemMetrics.php:225-451` **지표 보고 전용** · 프론트 `g_admin_menu_tree_cache` localStorage 만. → 스냅샷 캐시 무효화 설계는 **캐시 신설과 동시에** 해야 하며, "현행이 캐시 무효화 요구를 위반하지 않음"은 **대상 부재**이지 준수가 아니다.

### 분모 대조
- §49 = 36행 / 분모 36 ✅ (필수 필드 28 + Snapshot Type 8. 산문 2건 — 생성 후 수정 금지 · 5-3-3-11 이연 — 은 §2 로 이관)
- §50 = 10행 / 분모 10 ✅ (재사용 동일값 10. 산문 1건 + 코드블록 1건 — 전체 복제 금지 · 권장 구조 — 은 §2 로 이관)
- **합계 46행 / 분모 46 ✅**
