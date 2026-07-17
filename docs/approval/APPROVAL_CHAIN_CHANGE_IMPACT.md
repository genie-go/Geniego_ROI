# Approval Chain — Change Impact · In-flight Case Policy Reference

> EPIC 06-A Part 4-5-3-1-5-3-3-3 · 원문 §51, §52 전사
> 원문 정본: `docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_3_VERBATIM.md`
> 판정 근거: 289차 ⓑ 전수조사(105항목) 실측. 코드 변경 0.

## 1. 원문 전사

### §51. Chain Change Impact (원문 줄 2335-2390 · 분모 39)

`APPROVAL_CHAIN_CHANGE_IMPACT` — 영향 계산 대상 16 + 필수 필드 15 + 기본 정책 8.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | New Approval Request | Chain 변경 개념 부재 → 영향 산출기 **0**. 승인 요청은 4경로가 각각 존재하나 Chain 참조 없음 | ABSENT |
| 2 | Open Approval Case | 🔴 **Approval Case 개념 자체 ABSENT** — 요청 1행 = 결정 1행 = 종결. `Mapping.php:284-289` · `Alerting.php:591-595` · `AdminGrowth.php:1329-1330` 전부 단일 UPDATE 종결 | ABSENT |
| 3 | Pending Chain Build | Chain Build 단계 부재 | ABSENT |
| 4 | Planned Task | Approval Task 개념 부재. ★오탐: `pm_task*` = PM 도메인(`dep_type ENUM('FS','SS','FF','SF')` = 일정 의존) | ABSENT |
| 5 | Unclaimed Task | Task Claim 개념 **0**(`claim` 승인 히트 0) | ABSENT |
| 6 | Claimed Task | 동일 — Claim 상태 축 없음 | ABSENT |
| 7 | Completed Decision | 결정 이력은 존재하나 Chain 참조 **0** → 영향 대상 식별 불가. `Mapping.php:285` `approvals_json` = `["user"=>$actor,"ts"=>gmdate('c')]` **정확히 2키**(Chain·Version 미포함) | ABSENT |
| 8 | Future Scheduled Case | 미래 예약 Case **0**(§47 scheduled activation 부재와 동근) | ABSENT |
| 9 | Chain Snapshot | Chain 스냅샷 부재(→ `APPROVAL_CHAIN_SNAPSHOT.md`) | ABSENT |
| 10 | Authority Policy Reference | 🔴 권한 축 **2벌 분열** — `$roleRank`(`backend/public/index.php:554` `viewer0<connector1<analyst2<admin3`) ↔ `team_role`(owner>manager>member) **매핑 코드 전수 0** → 참조할 정본 정책 없음 | ABSENT |
| 11 | Candidate Resolution Reference | 승인 후보 해석기 **0**. `resolveApprover`/`next_approver`/`approver_id` grep 승인 히트 **0** | ABSENT |
| 12 | Notification Reference | 승인 알림 참조 **0**. ★오탐: `escalat` = `Reviews.php:173-187` 부정리뷰 Slack 통지(승인 무관) | ABSENT |
| 13 | SLA Reference | 승인 SLA **0** | ABSENT |
| 14 | Escalation Reference | 에스컬레이션 **0**(★오탐 위와 동일) | ABSENT |
| 15 | Cache Entry | 🔴 **서버 캐시 계층 자체가 부재** — Redis/Memcached **0**(★오탐: `redis` 3히트 전량 `Payment.php:817-820` `totalBefore`**`Dis`**`c`) · `apcu_*` 는 `SystemMetrics.php:225-451` 지표 보고 전용 · 프론트 `g_admin_menu_tree_cache` localStorage 만 | ABSENT |
| 16 | Reconciliation State | 조정 상태 **0**(→ `APPROVAL_CHAIN_RECONCILIATION.md`). ★오탐: `reconcil` 히트 = `Connectors.php:902` `roasReconciliation` · `Wms.php:2160` `reconcileChannelStock` | ABSENT |
| 17 | approval_chain_change_impact_id | 엔티티 부재 | ABSENT |
| 18 | old chain version | Chain Version 축 **0**. optimistic lock `version` grep **0** | ABSENT |
| 19 | new chain version | 동일 | ABSENT |
| 20 | effective date | 발효일 축 **0**. `WHERE effective_from <= :as_of` **전역 0**(레포에 as-of 질의 선례 자체 없음) | ABSENT |
| 21 | affected scopes | 스코프 영향 산출 **0** | ABSENT |
| 22 | affected requests | 요청 영향 산출 **0** | ABSENT |
| 23 | affected cases | Case 부재 → 피연산자 없음 | ABSENT |
| 24 | affected tasks | Task 부재 → 피연산자 없음 | ABSENT |
| 25 | affected snapshots | Snapshot 부재 → 피연산자 없음 | ABSENT |
| 26 | risk level | 위험 등급 축 **0** | ABSENT |
| 27 | migration policy reference | 🔴 이행 정책 참조 **0**. `backend/migrations/` **21파일 · 172차 정지** · approval/chain/route/workflow 마이그레이션 **0건**(실측 재확인) · `ensureTables` 는 **테이블 생성만 하고 데이터 변환·백필 안 함** | ABSENT |
| 28 | revalidation requirement | 재검증 요구 축 **0** | ABSENT |
| 29 | manual review requirement | 수동 검토 요구 축 **0** | ABSENT |
| 30 | status | 영향분석 상태 축 **0**. `SET status *=` **128건/42파일**은 전부 도메인 엔티티 상태 | ABSENT |
| 31 | evidence | 근거 보존 축 **0** | ABSENT |
| 32 | 완료된 Decision: 변경하지 않음 | 정책 선언 **0**. ⚠️ 현행이 완료 결정을 변경하지 않는 것은 **변경 기구가 없기 때문**(규칙 7 — 우연한 일치를 준수로 계산 금지). 🔴 반례 실재: `AgencyPortal.php:304`, `:381` 이 `revoked_at=NULL` 로 **과거 사실을 소거** | ABSENT |
| 33 | 기존 Snapshot: 변경하지 않음 | 정책 선언 **0**. Snapshot 부재 → 대상 없음 | ABSENT |
| 34 | 새 Request: 새 Chain Version 사용 | 정책 선언 **0**. Chain Version 부재 | ABSENT |
| 35 | Chain Build 전 Case: 새 Version 적용 가능 | 정책 선언 **0**. Case·Build 단계 모두 부재 | ABSENT |
| 36 | 이미 Chain Build 완료된 Case: In-flight Policy 적용 | 정책 선언 **0**. In-flight 개념 부재(→ §52) | ABSENT |
| 37 | Claimed Task: 자동 변경 금지 | 정책 선언 **0**. Claim 축 부재 | ABSENT |
| 38 | Critical Invalid Chain: 신규 Resolution Block | 정책 선언 **0**. 인접 fail-closed 선례 = `PM/Dependencies.php:32-34`(순환 탐지 시 **쓰기 전 차단** 422 `cycle_detected`) — Chain 무관·감사 미도달(§3 참조) | ABSENT |
| 39 | Security Critical Change: Active Case Revalidation Hook | 정책 선언 **0**. Hook 기구 **0** | ABSENT |

### §52. In-flight Case Policy Reference (원문 줄 2391-2409 · 분모 8)

지원 Reference 8.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | GRANDFATHER_EXISTING_CHAIN | Chain·Case 양쪽 부재 → 승계 대상 없음 | ABSENT |
| 2 | APPLY_NEW_CHAIN_BEFORE_TASK_CREATION | Task 생성 단계 자체가 없음(승인 = 단일 UPDATE 종결) | ABSENT |
| 3 | REBUILD_UNCLAIMED_LEVELS | Level·Claim 축 부재 | ABSENT |
| 4 | KEEP_CLAIMED_TASKS | Claim 축 부재 | ABSENT |
| 5 | REVALIDATE_ON_NEXT_LEVEL | 🔴 "다음 단계" 개념 부재 — 레포 최근접 승인 시퀀스 `FeedTemplate` 도 단계 축이 아니라 status 리터럴 3전이(`submitDraft:265-268` `('draft','submitted')` · `approveDraft:271-274` `('submitted','approved')` · `publishDraft:277-287` `status!=='approved'` → 409 `must_approve_first`) | ABSENT |
| 6 | REQUIRE_MANUAL_MIGRATION | 수동 이행 요구 축 **0**. ★ `Migrate` 이름 겹침 주의 — `backend/src/Migrate.php` 는 **DDL 적용기**(`:50` `schema_migrations.checksum`)이지 도메인 이행기가 아니다(`PM/Shared.php:37-53` 도 예외 아님) | ABSENT |
| 7 | BLOCK_NEW_TRANSITIONS | 전이 차단 정책 **0**. 🔴 **합법 전이 집합 선언 자체가 레포 전역 0** · 전이 가드 최소 8곳(`FeedTemplate:239`, `:258`, `:285` · `CustomerAI:469` · `Dsar:555` · `AdminGrowth:1327` · `LiveCommerce:530` · `Mapping:264`) — 차단할 전이 정의가 없다 | ABSENT |
| 8 | CUSTOM | 확장 슬롯 **0** | ABSENT |

## 2. 설계 계약

### C-51-1 · 이번 단계 범위 한정 (원문 §51 산문)
*"실제 In-flight Migration은 5-3-3-12에서 상세 구현한다."* → 본 블록은 `APPROVAL_CHAIN_CHANGE_IMPACT` **엔티티와 영향 계산**까지만 만든다. 실제 마이그레이션 집행기는 만들지 마라.

### C-52-1 · 이번 단계 범위 한정 (원문 §52 산문 2건)
- *"이번 단계에서는 Policy Reference와 Hook만 구축한다."*
- *"Task 재생성·취소·재할당 실행은 후속 블록에서 구현한다."*
→ §52 의 8 Reference 는 **열거 + Hook 지점**까지만. 8종의 **실행 의미론을 이 블록에서 구현하면 범위 위반**.

### C-51-2 · 영향 계산은 16 대상 전수 (원문 §51 원문 순서 보존)
`APPROVAL_CHAIN_CHANGE_IMPACT` 산출 시 §51 표 #1~#16 **16 대상을 빠짐없이** 계산한다. 일부만 계산하고 "영향 없음"으로 결론내는 것을 금지한다.

### C-51-3 · 기본 정책 8건은 선언적 정책 테이블로 (원문 §51 "기본 정책")
§51 표 #32~#39 는 **코드 분기 리터럴이 아니라 선언된 정책**이어야 한다. 근거 — 레포 최근접 선례 `FeedTemplate` 의 실패 모드:
- `transition(…, string $from, string $to)`(`FeedTemplate.php:249`)이 **전이 쌍을 호출자 인자로 받는다** → 가드는 "현재 status == 넘겨받은 from" 만 검사(`:258`).
- → **합법 전이 집합이 3개 메서드 본문에 분산된 리터럴**로만 존재. 정책이 코드에 매몰되면 §53 Reconciliation 이 비교할 canonical component 가 생기지 않는다.
- → §62 `MIGRATE_TO_CANONICAL` 후보 1순위.

### C-51-4 · Cache Entry 영향은 캐시 신설과 동시에 설계
§51 #15 는 무효화할 캐시가 **아직 없다**. 서버 캐시를 도입하는 순간 Chain Version 을 캐시 키에 포함하지 않으면 §54 `CACHE_VERSION_MISMATCH` 를 탐지할 수 없다.

### C-51-5 · 🔴 fail-closed 확장 기반 (신설 금지 · 확장할 것)
§51 #38(`Critical Invalid Chain: 신규 Resolution Block`) 구현 시 **알고리즘을 추출·재사용**하되 스키마는 복제하지 마라.
- `PM/Dependencies.php:79-100` — 반복 DFS + `$visited` + **tenant 필터 `:91` 매 홉** + **쓰기 전 차단 `:32-34` 422 `cycle_detected`** + self-loop `:29-31`.
- `PM/Gantt.php:104-122` — **Kahn 위상정렬** + `:119` `count($topo)!==count($taskMap)` + `:120-125` 500 아닌 **부분결과+경고 degrade**(도달성·고립 동시 판정).
- 🔴 **`Dependencies.php:90-91` 의 `dep_type` 술어 부재 결함을 동반 이식하지 마라.**
- 🔴 **경로 표기**: `backend/src/Handlers/PM/…`. **`backend/src/PM/` 는 존재하지 않는다.**

## 3. 미결·선행조건

### BLOCKED_PREREQUISITE — 영향분석의 피연산자가 없다
§51/§52 **47항목 전량 ABSENT**. 영향분석·In-flight 정책은 **Chain·Chain Version·Approval Case·Approval Task 를 피연산자로 요구**하는데 전부 부재:
- 이름 축 전역 grep **0**(재실측): `approval_chain|approval_route|approval_level|approval_stage|step_order|sequence_no|route_id|next_step|previous_step|approval_depth|approver_order` → backend/src + frontend/src 합계 **0 히트**.
- Approval Case: 요청 1행 = 결정 1행 = 종결. 재개·이관 코드 **0**.

### 🔴 규칙 7 — 기본 정책 8건이 "이미 지켜지고 있다"고 계산하지 않았다
현행 시스템은 §51 #32~#39 를 **위반하지 않는다**. 그러나 이는 **변경할 Chain 이 없어서**이지 정책이 있어서가 아니다. 따라서 8건 전부 `NOT_APPLICABLE` 이 아니라 `ABSENT` 로 판정했다.
- 오히려 **정면 반례가 실재**한다: `AgencyPortal.php:304`(`revoked_at=NULL`)·`:381`(`revoked_at=NULL`) 이 이전 해지 시각을 소거 → 위임 이력 물리 소멸 → **as-of 승인권 재구성 불가**. Chain 도메인에 이 패턴이 들어오면 #32/#33 이 즉시 붕괴한다.
- 🔴 `Catalog::approveQueue:2350` — **ids 미지정 시 테넌트 전체 `pending_approval` 일괄 승인**(기본 동작이 전량 승인). Chain 변경 시 "영향 대상 미지정 = 전량 적용" 패턴을 절대 복제하지 마라.

### 🔴 이행 경로 부재 (필드 #27 `migration policy reference` 의 실질)
- `backend/migrations/` 21파일 · `20260527_172_002_coupon_tables.sql` 정지(172차) · approval/chain/route/workflow **0건**.
- 172차 이후 모든 스키마 변경은 핸들러별 `ensureTables` 로만 적용되며 **`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다**.
- → §51 이 참조할 `migration policy` 를 **레포가 제공하지 못한다**. 신규 Chain 스키마 도입 시 이행 경로를 함께 설계하지 않으면 §51 #27 은 영구 미충족.

### 🔴 감사 결함을 복제하지 마라 (§51 #38 구현 시)
`PM/Dependencies.php:32-34` 가 **422 조기반환하여 `:48` `auditLog` 에 미도달** → **순환 탐지 시 감사 이벤트가 없다**. `Critical Invalid Chain: 신규 Resolution Block` 은 차단과 **동시에** 감사 이벤트를 남겨야 한다(감사 정본 선례 = `SecurityAudit.php:27`, `:45-52`, **`verify():56-68`** `:64` `hash_equals`).

### ★grep 오염 — 인용 전 확인
`route`(SPA URL `menu_tree.route`·`routes.php` 1636줄) · `stage`/`sc_stages`(물류 마일스톤 `SupplyChain.php:50-54`) · `override`(스칼라 선행순위 `Mmm.php:381-382`·`OrderHub.php:1274`) · `chain_id`(챗봇 안내 문자열 `GeniegoKnowledge.php:430`) · `escalat`(`Reviews.php:173-187`) · `depth`(루프 지역변수) · `redis`(`Payment.php:817` `totalBeforeDisc`) · `reconcil`(ROAS·WMS 재고).

### 분모 대조
- §51 = 39행 / 분모 39 ✅ (영향 계산 16 + 필수 필드 15 + 기본 정책 8. 산문 1건 — 5-3-3-12 이연 — 은 §2 로 이관)
- §52 = 8행 / 분모 8 ✅ (지원 Reference 8. 산문 2건 — Policy Reference·Hook 만 · 실행은 후속 — 은 §2 로 이관)
- **합계 47행 / 분모 47 ✅**
