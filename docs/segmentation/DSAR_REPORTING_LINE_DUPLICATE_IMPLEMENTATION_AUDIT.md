# DSAR — 중복 구현 감사 (§76)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §76 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★총평 — **중복 0. 그러나 정합의 증거가 아니라 축의 부재다**(규칙 9)

§76 이 탐지를 요구한 25항목 중 **22항목이 "1개도 없어서 0"**이다.

🔴 **대표 사례(규칙 10 적중)**: *"Circular Detection 없는 Recursive Manager Query"* = **0건**. 그러나 이는 **모든 recursive manager query 에 순환탐지가 있다는 뜻이 아니라, recursive manager query 가 0개라서 0**이다.

🔴 **★이 문서의 결론을 "중복 0 = 통합 대상 없음 = 기능 유지"로 읽으면 규칙 9 가 경고한 바로 그 위장이다.** 필요한 것은 **통합이 아니라 신설**이며, 아래 3개 대체물은 **커버 계산 금지**다.

### 🔴 단 3건은 실재한다

| # | 실재 항목 | 실측 |
|---|---|---|
| ① | **Acting Manager 를 기존 Manager 덮어쓰기** | `TeamPermissions.php:492-501` — `manager_user_id` 교체 시 **전임자 강등 없음**(UPDATE 는 `team` 행만 · `promoteManager:469`/`:495` 는 **신임자 승격만** 수행) |
| ② | **Vacant Position 을 Active Manager 로 처리** | `promoteManager:768-776` **강등 경로 0** → `manager_user_id=NULL` 로 바꿔도 **전임자 `team_role='manager'` 잔존** → 위임 권한(`isManagerAdmin:136`·`putMemberPermissions:618`) **계속 보유** |
| ③ | **Manager 라는 이유만으로 Approval Authority 자동 부여** | `UserAuth.php:1064` `in_array($role,['owner','manager'],true)` · `TeamPermissions.php:136` `isManagerAdmin` |

### ★승인 4종 = **"2 REAL"** (5-3-2 "1 REAL + 3 미달" 정정)

| 구현 | 판정 | 실측 |
|---|---|---|
| `mapping_change_request` | **REAL** | 289차 G-01: 신원 fail-closed(`Mapping.php:246-250`) · 자기승인 차단(`:268-271`) · dedup(`:278-283`) · 정족수(`:287`) |
| **`catalog_writeback_job` status=`pending_approval`** | ★**REAL** | **282차 근본수정** · 실경로 `approvalCreate:2275` → `approveQueue:2341`(테넌트 스코프 `:2350`) → **집행 `processWritebackQueue:2362`** · 정책 게이트 `evaluatePolicy`→`requires_approval`(`:2247`) |
| `action_request` | **VACUOUS** | `INSERT INTO action_request` **grep 0 확정**(실측 재확인) · `Alerting.php:562` `required_approvals=>2` 는 **컬럼이 아니라 응답 투영 리터럴** · `decideAction:591-595` **단일 결정으로 즉시 approved** = **정족수를 표시하나 집행하지 않는다** |
| `admin_growth_approval` | **REAL(단일테넌트 전제)** | 생산자 `AdminGrowth.php:1294` · 결정 `:1330` · 🔴**`tenant_id` 컬럼 없음**(`:142-149`) · 조회도 tenant 술어 없음(`:641`·`:1292`·`:1306`·`:1324`) · `decided_by` 자유 텍스트 · 정족수 없음 |

🔴 **`catalog_writeback_approval` 테이블은 고아가 맞다**(`Catalog.php:86`·`:126` **CREATE 뿐** · INSERT/SELECT **0** — 실측 재확인) — **그러나 테이블은 죽었고 능력은 살아 있다. "테이블 고아 = 축 미달"로 계산하면 규칙 7 위반.**

## 1. 원문 전사 + 판정 — **원문 25종**

> ★측정기 25 / 원문 대조 25 / 전사 25 — **일치**.

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | 여러 Manager Registry | **0 — Registry 가 0개라서 0**(규칙 10) | **중복 없음(축 부재)** |
| 2 | 여러 `manager_id` 필드 | **`manager_id` grep 0** · git 삭제이력 0 | **중복 없음(축 부재)** |
| 3 | 여러 `reports_to` 필드 | **grep 0** · git 삭제이력 0 | **중복 없음(축 부재)** |
| 4 | 여러 Supervisor Table | **`supervisor_id` grep 0** | **중복 없음(축 부재)** |
| 5 | 여러 Position Hierarchy | **Position 축 0** · 🔴`position_idx` = **PM 태스크 정렬순서**(무관) | **중복 없음(축 부재)** |
| 6 | 여러 Subject Manager Table | **0** | **중복 없음(축 부재)** |
| 7 | HRIS·ERP·IdP별 독립 Manager ID | **0 — manager 보유 소스가 0개라서 0.** HRIS/ERP/Directory 커넥터 카탈로그 행 0·fetcher 0 · IdP 는 `EnterpriseAuth` 실재하나 **manager 속성 0**(`sso_config` DDL `:45-54` = `email_attr`·`name_attr` **2슬롯뿐**) | **중복 없음(무대상)** |
| 8 | Department Head 별도 Table | **`department_head_id`·`head_id` grep 0** | **중복 없음(축 부재)** |
| 9 | Team Lead 별도 Table | **`team_lead_id` grep 0** · 🔴`lead_id`(`AdminGrowth.php:111` 외 13개소) = **B2B 영업 리드 ID**(이름 함정) | **중복 없음(축 부재)** |
| 10 | Cost Center Manager 별도 Table | **0** — Cost/Profit Center 축 자체 부재 | **중복 없음(축 부재)** |
| 11 | Program Manager 별도 Table | **0** · 🔴**`pm_portfolio` "프로그램" = 주석 팬텀**(`Enterprise.php:13` 주석이 "포트폴리오/**프로그램**" 자칭하나 **코드에 program 개념 0** · `\bprogram\b` = LiveCommerce WebRTC 스트림명뿐) — **규칙 8 재적중** | **중복 없음(축 부재)** |
| 12 | Approval Module 내부의 독립 Manager Resolver | **0 — ★승인자 후보를 계산하는 코드가 레포에 없다**(`resolveApprover`/`approval_chain`/`routeApproval` **0** · `approver` 2건은 **에러 메시지 문자열** `Mapping.php:248`,`:280`) | **중복 없음(무대상 · `ABSENT`)** |
| 13 | Workflow Module 내부의 독립 Reporting Line | **0** — Reporting Line 개념 0 | **중복 없음(축 부재)** |
| 14 | Role Module 내부의 별도 Manager Relationship | **0 — `team_role='manager'` 는 롤 라벨이지 관계가 아니다**(관계 테이블 0) | **중복 없음(축 부재)** |
| 15 | **Acting Manager를 기존 Manager 덮어쓰기로 처리** | 🔴**실재** — `TeamPermissions.php:492-501` 교체 시 **전임자 강등 없음** | 🔴**실재 ①** |
| 16 | Temporary Manager 종료일 없는 구현 | **0 — Temporary Manager 가 0개라서 0**(`acting`·`vacan`·`deputy` 0 · `interim` 1건 무관). ⚠️단 `team.manager_user_id` 는 **effective date 0 · 이력 0** → **신설 시 동일 결함 재발 위험** | **중복 없음(축 부재)** |
| 17 | **Current Manager만 저장하는 구현** | ⚠️**형태상 해당** — `team.manager_user_id` **팀당 1칸 · 이력 0** · `app_user.team_id` **단일 컬럼 = 1인 1팀**. 🔴**단 "여러 개를 저장하다 하나로 줄인" 것이 아니라 여러 개를 표현할 수단이 없다**(규칙 10) | **중복 아님 · 구조적 단일값** |
| 18 | Historical Manager Update | **0 — 이력 자체가 0.** 🔴**단 인접 반례 실재**: `AgencyPortal.php:304`·`:381` 이 **`revoked_at=NULL` 로 이전 해지 시각을 소거** → **이력 물리적 소멸**(§55 정면 반례 · 복제 금지) | **중복 없음(축 부재)** |
| 19 | 이름·이메일 기반 Manager Mapping | **0(Manager 축 부재)**. ⚠️인접: `wms_warehouses.manager VARCHAR(120)` = **자유텍스트 · FK 0 · 판독 술어 0**(`NAME_ONLY`) · `pm_raid.owner`(`Enterprise.php:42`,`:60`) = 자유문자열 · `ceo_name` = `app_user` **평문 문자열**(`UserAuth.php:306-307`) · `admin_growth_approval.decided_by` = 자유 텍스트 | **중복 없음 · ⚠️패턴 선례 4건(복제 금지)** |
| 20 | **Circular Detection 없는 Recursive Manager Query** | 🔴**0 — recursive manager query 가 0개라서 0**(규칙 10 정면 적중). ★**"순환탐지가 다 있다"로 읽으면 정반대 오판**이다 | **중복 없음(무대상)** |
| 21 | Cross-Tenant Manager 조회 | **0(Manager 축 부재)**. 🔴**단 인접 반례 실재**: `admin_growth_approval` **`tenant_id` 컬럼 없음**(`:142-149`) · `menu_tree`·`menu_audit_log` **tenant_id 없음** · `AdminMenu::wouldCycle:540-555` **tenant 술어 0** · `lastHash():214-219` tenant 술어 0 | **중복 없음 · ⚠️반례 4건(복제 금지)** |
| 22 | **Vacant Position을 Active Manager로 처리** | 🔴**실재** — `promoteManager:768-776` **강등 경로 0** → `manager_user_id=NULL` 로 바꿔도 **전임자 `team_role='manager'` 잔존** → 위임 권한(`isManagerAdmin:136`·`putMemberPermissions:618`) 계속 보유 | 🔴**실재 ②** |
| 23 | Task Assignment 시 Manager Snapshot 미생성 | **0 — Snapshot 축 0 · `Actor Authorization Snapshot` `ABSENT`**(승인 시점 권한 동결 0). `pm_task_assignees(role ENUM('owner','contributor','reviewer','observer'))` = **태스크 역할이지 매니저 아님** | **중복 없음(축 부재)** |
| 24 | Manager 변경 후 Task Candidate Cache 미무효화 | **0 — ★무효화할 캐시도 Candidate 도 없다**(§80 참조: Redis/Memcached **0** · 서버 캐시 계층 자체 부재) | **중복 없음(이중 무대상)** |
| 25 | **Manager라는 이유만으로 Approval Authority 자동 부여** | 🔴**실재** — `UserAuth.php:1064` · `TeamPermissions.php:136` · 적격 술어 **0** | 🔴**실재 ③** |

**실측 개수: 25 / 25 전사.** 분포 = **중복 없음(축 부재/무대상) 22** · 🔴**실재 3**(①⑮ ②⑯ ③㉕ = #15·#22·#25). ⚠️**#17 은 구조적 단일값**(중복 아님).

## 2. 규칙

- 🔴 **"중복 0" 을 정합으로 계산 금지**(규칙 9). 22항목의 0 은 **축의 부재**이며, 통합이 아니라 **신설**이 필요하다.
- 🔴 **3개 대체물(`team.manager_user_id`·`team_role='manager'`·`pm_projects.owner_user_id`)을 커버 계산 금지.** 서로 다른 축이며 **어느 것도 §4.3/§4.4/§4.6 을 표현하지 못한다.**
- 🔴 **★승인 통합 시 능력 소실 경고**: `Catalog::approveQueue` 는 `Mapping` 의 maker-checker(**actor·정족수·자기승인 차단**)를 **전혀 갖지 않는다**(`:2341-2365` 는 **행위자를 읽지도 않는다** · 자격 판정 축 = **구독 플랜** `:2343` `requirePro`). → **"중복 제거"로 포장하면 `Mapping` 의 능력이 소실된다**(규칙 9).
- 🔴 **`catalog_writeback_approval` 테이블 고아 ≠ 축 미달**(규칙 7). **테이블은 죽었고 능력은 살아 있다.** 폐기 대상은 **테이블뿐**이며 `catalog_writeback_job` 경로는 **REAL 로 보존**하라.
- 🔴 **`action_request` = VACUOUS 이나 잠복 결함**: `Alerting::actor:33-36` 이 **여전히 `X-User-Email` 헤더 / `?actor=` 쿼리 / `'unknown'` 폴백** = 289차 G-01 이 `Mapping` 에서 고친 **바로 그 위조가능 패턴**. `decideAction:591` 이 이 actor 를 그대로 기록하며 **상태가드·자기승인차단·dedup·정족수 전부 없음**. **생산자를 하나 붙이는 순간 위조가능 승인이 활성화된다** → 참조 구현으로 삼지 마라.
- ⚠️ **등급 미부여 관찰**: `Mapping::actorId` 는 동일인이 **API키/세션 경로로 접근하면 actor 문자열이 다르다** → `:279` dedup·`:268` 자기승인 차단이 **경로 전환으로 우회 가능**. **실 경합 경로 미검증.**
- 🔴 **`pm_task_dependencies` 스키마 복제 금지** — `:90-91` 이 `dep_type` 을 술어에 안 넣어 **전 타입 무차별 순회** → 이 결함을 물려받으면 **설계 시점에 이미 §11 Manager Type 27종별 순환정책이 불가능**해진다.
