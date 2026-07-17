# Approval Stage & Level Definition — 원문 전사 및 실측 판정

> EPIC 06-A Part 4-5-3-1-5-3-3-3 · 원문 §13, §15, §17 전사
> 원문 정본: `docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_3_VERBATIM.md`
> 판정 근거: 289차 ⓑ 전수조사(105항목) 실측 + 본 편 재실증. 코드 변경 0.
>
> ※ Stage Version(§14) · Level Version(§16) 은 VERSIONING 담당 문서의 범위이며 본 편에서 다루지 않는다.

## 1. 원문 전사

### §13. Approval Stage Definition (원문 줄 873-931 · 분모 41)

원문 엔티티: `APPROVAL_STAGE_DEFINITION` — *"Stage는 승인 목적 또는 책임 영역을 나타낸다."*

★**이름 grep 전량 0**: `approval_stage` · `stage_code` · `stage_category` · `approval_chain_version` 전부 `backend/src` · `frontend/src` · `backend/migrations` 히트 **0**.
★**오탐 배제**: `stage` / `sc_stages`(`backend/src/Handlers/SupplyChain.php:50-54`, `:193-199`)는 **물류 마일스톤 체크리스트**다 — `stage VARCHAR(120)` 자유문자열(`'Purchase Order'`·`'생산'`·`'선적'`·`'통관'`·`'입고'`·`'출고준비'` 리터럴 시드 `:193-195`) · `done TINYINT(1)` = 체크박스 · `sort_order` 는 INSERT 시 **배열 인덱스 `$i`**(`:198-199`). 승인 Stage 로 인용하지 않는다.

#### 지원 Stage Category (17)

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | MANAGEMENT | 부재 — `stage_category` 컬럼·열거 grep 0 | ABSENT |
| 2 | FINANCE | 부재 — 동상 | ABSENT |
| 3 | LEGAL | 부재 — Legal Entity 자체가 이름·능력 0(유일 히트 `backend/src/Handlers/MarketingDataHub.php:181` = 데모 문자열) | ABSENT |
| 4 | COMPLIANCE | 부재 — `compliance_officer`/`compliance` 승인 히트 0 | ABSENT |
| 5 | SECURITY | 부재 — `backend/src/SecurityAudit.php` 는 감사 해시체인이지 승인 Stage 아님 | ABSENT |
| 6 | RISK | 부재 — `risk` 히트는 `SupplyChain.php:46` 공급망 리드타임 리스크 | ABSENT |
| 7 | PROGRAM | 부재 — `program_manager` grep 0 | ABSENT |
| 8 | PRODUCT | 부재 — `DATA_SCOPES` 의 `product`(`backend/src/Handlers/TeamPermissions.php`)는 데이터 범위이지 승인 Stage 아님 | ABSENT |
| 9 | BRAND | 부재 — `scopeChannelProduct:319-320` 이 brand/product 를 **둘 다 SKU 컬럼에 매핑**(`:312` 자인) → 독립 차원조차 아님 | ABSENT |
| 10 | REGIONAL | 부재 — `regional_manager` grep 0 | ABSENT |
| 11 | COUNTRY | 부재 — `country_code` 히트는 TikTok 리포트 차원(`Connectors.php:2044`,`:2071`)·IP Geo(`Geo.php:106`) | ABSENT |
| 12 | PARTNER | 부재 — `agency_client_link`(`AgencyPortal.php:20`)는 테넌트↔테넌트 링크이지 승인 Stage 아님 | ABSENT |
| 13 | OPERATIONS | 부재 — 동상 | ABSENT |
| 14 | EXECUTIVE_REFERENCE | 부재 — 동상 | ABSENT |
| 15 | COMMITTEE_REFERENCE | 부재 — `committee` grep **0**(backend/src 전량) | ABSENT |
| 16 | MANUAL_REVIEW | 부재 — 수동 검토 Stage 개념 0. `FeedTemplate` 의 `submitted` 상태가 형태상 유사하나 Stage 모델 아님(§3.5 #6 참조) | ABSENT |
| 17 | CUSTOM | 부재 — 확장 슬롯 개념 0 | ABSENT |

#### 필수 필드 (24)

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 18 | approval_stage_definition_id | 부재 — `approval_stage` grep 0 | ABSENT |
| 19 | approval_chain_version_id | 부재 — `approval_chain` · `approval_chain_version` grep 0 | ABSENT |
| 20 | tenant_id | Stage 엔티티 부재로 필드 부재. (테넌트 격리 선례는 실재 — `sc_stages.tenant_id`(`SupplyChain.php:51`)·`mapping_change_request.tenant_id`(`Db.php` 승인테이블 DDL) — 그러나 Stage 도메인 0) | ABSENT |
| 21 | stage_code | 부재 — `stage_code` grep 0 | ABSENT |
| 22 | stage_name | 부재. 오탐 `sc_stages.stage VARCHAR(120)`(`SupplyChain.php:52`) = 물류 마일스톤 라벨 | ABSENT |
| 23 | stage_category | 부재 — 열거 자체가 없다(규칙 8: "열거에 없다"를 주장할 열거가 없음) | ABSENT |
| 24 | stage purpose | 부재 | ABSENT |
| 25 | stage order reference | 부재. 오탐 `sc_stages.sort_order`(`SupplyChain.php:53`)는 **INSERT 시 배열 인덱스 `$i`**(`:198-199`) — 의미 있는 순서 참조가 아니라 입력 배열의 위치 | ABSENT |
| 26 | stage group | 부재 — Stage 그룹핑 축 0 | ABSENT |
| 27 | required 여부 | 부재. 오탐 `sc_stages.done TINYINT(1)`(`SupplyChain.php:52`) = 완료 체크박스이지 필수성 선언 아님 | ABSENT |
| 28 | optional 여부 | 부재 | ABSENT |
| 29 | conditional 여부 | 부재. 조건 분기 선례는 마케팅 도메인에만(`JourneyBuilder` `condition:600`→`evalCondition:818`) — 승인 도메인 0 | ABSENT |
| 30 | repeatable 여부 | 부재. `Mapping::approve:262-265` 는 이미 처리된 건 재승인을 409 로 차단할 뿐 반복 Stage 모델 아님 | ABSENT |
| 31 | skippable reference | 부재 — skip 정책 0 | ABSENT |
| 32 | entry condition reference | 부재. 표현식 선례 `backend/src/Handlers/RuleEngine.php:24`(화이트리스트 `OPS:33` · `compare:433-439`)는 실재하나 **승인 Stage 에 배선 0** | ABSENT |
| 33 | completion policy reference | 부재. 최근접물 = `Mapping.php:287` `count($approvals) >= (int)$r["required_approvals"]` — **동일 레벨 2-of-N 정족수**이며 Stage 완료 정책이 아니고 참조 가능한 Policy 도 아님(§2 참조) | ABSENT |
| 34 | actor source policy reference | 부재 — `resolveApprover`/`next_approver`/`approver_id` 승인 히트 0. 4경로 전량 "호출자가 곧 승인자" | ABSENT |
| 35 | authority policy reference | 부재. `acl_permission.approve`(`TeamPermissions.php:39` `ACTIONS`·`seedOrg:711` 실 시드)는 **읽어서 승인 가부를 판정하는 코드 0** = 완전한 장식 | ABSENT |
| 36 | failure policy reference | 부재 — 승인 실패/거부 정책 선언 0 | ABSENT |
| 37 | fallback reference | 부재. 오탐 주의 — `JourneyBuilder::nextNode:811-812` 무라벨 위치 폴백은 **복제 금지 대상**(286차 실 장애 `:801-803`) | ABSENT |
| 38 | valid_from | 부재 — `valid_from` grep 0 | ABSENT |
| 39 | valid_to | 부재 — `valid_to` grep 0(유일 히트 `Onsite.php:396` = `invalid_token` 부분일치 오탐) | ABSENT |
| 40 | status | Stage 엔티티 부재로 필드 부재. (`SET status *=` 128건/42파일 실재하나 **합법 전이 집합 선언 0**, Stage 도메인 0) | ABSENT |
| 41 | evidence | 부재 — 승인 근거 보존 축 0. `approvals_json`(`Mapping.php:285`)은 `["user"=>$actor,"ts"=>gmdate('c')]` **정확히 2키**로 권한/역할 스냅샷 미보존 | ABSENT |

---

### §15. Approval Level Definition (원문 줄 957-1030 · 분모 58)

원문 엔티티: `APPROVAL_LEVEL_DEFINITION` — *"Level은 Stage 내부에서 요구되는 승인 계층 또는 Actor Source Requirement다."*

★**이름 grep 전량 0**: `approval_level` · `level_code` · `level_number` · `manager_level` · `actor_source` 히트 **0**.
★**Level 인접 부재**: `hierarchy_level` · `org_level` · `tree_level` · `organization_level` 컬럼 grep **0**. 유일 `depth` = **루프 지역변수**(`backend/src/Handlers/AdminMenu.php:544-552` `$depth = 0; while ($cur !== null && $depth < 100)` · `backend/src/Handlers/PM/Dependencies.php:84`) — 데이터가 아니라 순회 카운터.
★**`Mapping.php:287` 정족수는 동일 레벨 2-of-N** — 계층이 아니며 **순서가 없다**(승인자 집합의 크기만 센다).

#### 필수 필드 (32)

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | approval_level_definition_id | 부재 — `approval_level` grep 0 | ABSENT |
| 2 | approval_stage_definition_id | 부재 — 상위 Stage 엔티티 자체가 §13 전량 ABSENT | ABSENT |
| 3 | approval_chain_version_id | 부재 — `approval_chain` grep 0 | ABSENT |
| 4 | tenant_id | Level 엔티티 부재로 필드 부재 | ABSENT |
| 5 | level_code | 부재 — `level_code` grep 0 | ABSENT |
| 6 | level_name | 부재 | ABSENT |
| 7 | level_number | 부재 — `level_number` grep 0 | ABSENT |
| 8 | hierarchy depth reference | 부재 + **선행조건 미충족** — 계층 컬럼 0 · 유일 `depth` = 루프 지역변수(`AdminMenu.php:544`) · DB 기반 상향순회 선례는 `AdminMenu::wouldCycle:540-555`(**`menu_tree`** 대상 · `$visited` 없음 · tenant_id 없음) 1건뿐이며 **사람 축 선례 0** | BLOCKED_PREREQUISITE |
| 9 | level category | 부재 — 열거 0 | ABSENT |
| 10 | actor source type | 부재 — `actor_source` grep 0. 4경로 전량 "호출자가 곧 승인자" | ABSENT |
| 11 | actor resolver reference | 부재 — `resolveApprover`/`routeApproval`/`next_approver` 승인 히트 0 | ABSENT |
| 12 | manager relationship type reference | **선행조건 0%** — `parent_user_id` 는 전 4 생성경로가 owner 로 하드고정(`UserAuth::createTeamMember:1225-1227` 주석 자인 · `EnterpriseAuth::provisionUser:502` · `UserAuth::createSubAdmin:1549`,`:1576` · sub 계정생성 차단 `:1254-1256`) → 재해석 시 전 멤버 상급자 = owner 1단 평면. 관계 **유형** 축 자체가 없다 | BLOCKED_PREREQUISITE |
| 13 | role requirement reference | 권한 축 **2벌 분열** — `$roleRank`(`backend/public/index.php:554` `['viewer'=>0,'connector'=>1,'analyst'=>2,'admin'=>3]`, 판정축 = HTTP 메서드 `:568`) ↔ `team_role`(owner>manager>member) · **매핑 코드 전수 0**. 승인 권한을 물을 정본 축 없음 | PARTIAL |
| 14 | authority profile reference | 부재 — `authority_profile` grep 0 | ABSENT |
| 15 | resource owner type reference | 부재 — 자원 소유자 축 0. `MENU_CATALOG`(`TeamPermissions.php:55-82` 26개 · `validMenu:180` 강제)는 **메뉴 한정 자원 레지스트리**이며 승인건/리베이트는 자원이 아님 | ABSENT |
| 16 | organization level reference | **선행조건 0%** — `ORGANIZATION_*` 11종 이름·능력 양쪽 0 · `team`(`TeamPermissions.php:143-151`)에 **`parent_team_id` 없음** · `ORG_PRESET`(`:706-722`)은 PHP 상수 15줄 · `wms_warehouses`(`Wms.php:59-65`) 완전 평면 | BLOCKED_PREREQUISITE |
| 17 | minimum actor count | 부재 — 하한 축 0 | ABSENT |
| 18 | maximum actor count | 부재 — 상한 축 0 | ABSENT |
| 19 | required actor count | 최근접물 `required_approvals` — **유일 생산자 = `Mapping.php:209-210` 리터럴 `2`**(INSERT 11컬럼/11인자, 10번째 인자) + `Db.php:634` `required_approvals INT NOT NULL DEFAULT 2`. **UPDATE·설정 API·타 INSERT 전수 0** → 요건 모델이 아니라 상수. Level 스코프 아님(요청 단위) · 금액 무관 고정 | PARTIAL |
| 20 | required 여부 | 부재 — Level 필수성 선언 0 | ABSENT |
| 21 | optional 여부 | 부재 | ABSENT |
| 22 | conditional 여부 | 부재 — 승인 도메인 조건부 Level 0 | ABSENT |
| 23 | duplicate actor policy | 하드코딩 1경로 — `Mapping.php:278-283` 동일 행위자 재승인 409 차단. **정책 필드가 아니라 메서드 본문 리터럴** · 4경로 중 1곳뿐(`AdminGrowth:1292` 는 **요청** dedup 이지 승인자 dedup 아님) · 구성 불가 | PARTIAL |
| 24 | same actor across level policy | 부재 — Level 이 없으므로 교차 Level 정책이 성립하지 않는다(규칙 7: 대상 부재를 준수로 계산 금지) | ABSENT |
| 25 | self approval policy reference | 하드코딩 1경로 — `Mapping.php:268-271` `requested_by === $actor` → 403. **참조 가능한 Policy 아님** · `action_request` 는 `requested_by` **컬럼 부재**(`Db.php:592-600`)로 구조적 차단 불가 · `AdminGrowth:1324-1331` 은 `requested_by`·`decided_by` 양쪽 있으나 **비교 코드 0** · `FeedTemplate` 은 승인자 신원 검사 **0**(자기 제출→자기 승인 무제한) | PARTIAL |
| 26 | vacancy policy reference | 부재 — `vacancy` grep 0. 형태 유사물 `TeamPermissions.php:444` `if(!empty(...))` = **표시 생략**뿐 | ABSENT |
| 27 | missing actor policy reference | 부재. ★`JourneyBuilder::nextNode:811-812` 무라벨 위치 폴백은 **반례**(286차 실 장애 `:801-803` — 조건 불충족 대상을 엉뚱한 분기로 오발송) → 승인 이식 시 복제 금지 | ABSENT |
| 28 | fallback reference | 부재 — Level 폴백 축 0 | ABSENT |
| 29 | valid_from | 부재 — grep 0 | ABSENT |
| 30 | valid_to | 부재 — grep 0(`Onsite.php:396` `invalid_token` 오탐 배제) | ABSENT |
| 31 | status | Level 엔티티 부재로 필드 부재 | ABSENT |
| 32 | evidence | 부재 — `Actor Authorization Snapshot` ABSENT 확정(`Mapping.php:285` 2키 · `Alerting:591` 3키 · `AdminGrowth` 2컬럼 — 어느 것도 승인시점 권한/역할/플랜 미보존 → as-of 질의 불가) | ABSENT |

#### Actor Source Type (26)

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 33 | DIRECT_MANAGER | **선행조건 0%** — 상급자(사람)를 반환하는 함수 **0**. `parent_user_id` 판독자 12+개소 전량 1홉이며 목적이 tenant 해석(`UserAuth::resolveTenantId:207-215`·`Rollup:56-61`·`ChannelSync:72`·`ChannelCreds:85`·`BillingMethod:88`) 또는 `IS NULL` owner 판별(`PlanLimits:37`·`UserAuth:41`·`AdAdapters:45`·`KakaoChannel:356`·`TeamPermissions:129`). `team.manager_user_id`(`TeamPermissions.php:148`)는 팀당 1칸·판독자 = `:444-445` 표시용 투영 1개소뿐(권한/승인 판독 0)·`seedOrg:739` INSERT 에 컬럼 부재로 시드 NULL·변경은 `:495` 덮어쓰기 | BLOCKED_PREREQUISITE |
| 34 | MANAGER_OF_MANAGER | **선행조건 0%** — 다단 상향 순회 사람 축 선례 0. 유일 DB 상향순회 = `AdminMenu::wouldCycle:540-555`(`menu_tree` 대상) | BLOCKED_PREREQUISITE |
| 35 | ADMINISTRATIVE_MANAGER | **선행조건 0%** — 관리자/기능 관리자 구분 축 0. `manager`(EnterpriseAuth) 히트는 **롤 리터럴 6건** 오탐 | BLOCKED_PREREQUISITE |
| 36 | FUNCTIONAL_MANAGER | **선행조건 0%** — 동상 | BLOCKED_PREREQUISITE |
| 37 | DOTTED_LINE_MANAGER_REFERENCE | **선행조건 0%** — `dotted_line` grep 0 · 부 보고선 축 0 | BLOCKED_PREREQUISITE |
| 38 | PROJECT_MANAGER | **선행조건 0%** — `pm_tasks.parent_task_id`(`migrations/20260526_168_002_create_pm_tasks.sql:8`)는 레포 유일 tenant 격리 자기참조 트리이나 **순회기 0**(저장·정렬·투영 7히트뿐, 중첩은 프론트 위임) → 이름은 트리, 능력은 평면 리스트. 사람 축 아님 | BLOCKED_PREREQUISITE |
| 39 | PROGRAM_MANAGER | **선행조건 0%** — `program_manager` grep 0 | BLOCKED_PREREQUISITE |
| 40 | REGIONAL_MANAGER | **선행조건 0%** — 지역 조직 축 0 | BLOCKED_PREREQUISITE |
| 41 | COUNTRY_MANAGER | **선행조건 0%** — 국가 조직 축 0(`country_code` 오탐 = TikTok 리포트 차원·IP Geo) | BLOCKED_PREREQUISITE |
| 42 | BRAND_MANAGER | **선행조건 0%** — brand 는 독립 차원조차 아님(`scopeChannelProduct:319-320` 이 brand/product 를 둘 다 SKU 컬럼에 매핑 · `:312` 자인) | BLOCKED_PREREQUISITE |
| 43 | COST_CENTER_MANAGER | **선행조건 0%** — `cost_center` grep 0 | BLOCKED_PREREQUISITE |
| 44 | PROFIT_CENTER_MANAGER | **선행조건 0%** — `profit_center` grep 0 | BLOCKED_PREREQUISITE |
| 45 | ORGANIZATION_HEAD | **선행조건 0%** — `organization_head` grep 0 · `ORGANIZATION_*` 11종 이름·능력 0 | BLOCKED_PREREQUISITE |
| 46 | POSITION_SUPERVISOR | **선행조건 0%** — `position_supervisor` grep 0 · 직위 축 0(`EnterpriseAuth::provisionUser:476` 시그니처에 `title`/`department`/`employeeNumber` 파라미터 자체가 없음) | BLOCKED_PREREQUISITE |
| 47 | ROLE | 축이 **2벌 분열** — `$roleRank`(`backend/public/index.php:554`)는 HTTP 메서드로만 판정(`:568` `in_array($method,['POST','PUT','PATCH','DELETE'])`)하는 **기계 신원 API 등급** ↔ `team_role`(owner>manager>member). **매핑 코드 전수 0**(50+ 히트 확인·역방향 0). `acl_permission.approve` 는 시드되나(`TeamPermissions:711`) 판독 코드 0 | PARTIAL |
| 48 | AUTHORITY_PROFILE | 부재 — `authority_profile` grep 0 | ABSENT |
| 49 | RESOURCE_OWNER | 부재 — 자원 소유자 해석기 0. `parent_user_id IS NULL` 은 **테넌트 owner** 판별이지 자원 소유자 아님 | ABSENT |
| 50 | CASE_OWNER | 부재 — `case_owner` grep 0 · 승인 건(case) 소유 축 0 | ABSENT |
| 51 | REQUEST_OWNER | 부분 — `requested_by` 실재 2경로(`mapping_change_request` `Db.php:632` `requested_by VARCHAR(255) NOT NULL` → `Mapping.php:268` 자기승인 차단에 실소비 · `admin_growth_approval.requested_by` 존재하나 `AdminGrowth:1324-1331` 비교 코드 0). 🔴`action_request` 는 **컬럼 부재**(`Db.php:592-600`) · `catalog_writeback_job` 경로도 요청자 축 미확립 | PARTIAL |
| 52 | LEGAL_ENTITY_OFFICER | **선행조건 0%** — Legal Entity 이름·능력 0(유일 히트 `MarketingDataHub.php:181` = 데모 문자열) | BLOCKED_PREREQUISITE |
| 53 | SECURITY_OFFICER | 부재 — `security_officer` grep 0. `SecurityAudit.php` 는 감사 해시체인이지 직책 아님 | ABSENT |
| 54 | COMPLIANCE_OFFICER | 부재 — `compliance_officer` grep 0 | ABSENT |
| 55 | FIXED_GOVERNED_SUBJECT_REFERENCE | 부재 — 고정 승인주체 지정 축 0 · 승인된 Governance 근거·Effective Period 보존 수단 0 | ABSENT |
| 56 | COMMITTEE_REFERENCE | 부재 — `committee` grep **0**(backend/src 전량) | ABSENT |
| 57 | MANUAL_SELECTION | 부재 — 승인자 수동 선택 UI/API 0 | ABSENT |
| 58 | CUSTOM_RESOLVER_REFERENCE | 부재 — resolver 개념 자체가 0 | ABSENT |

---

### §17. Stage와 Level 관계 원칙 (원문 줄 1056-1072 · 분모 10)

원문: *"다음을 강제하라."* — 즉 10건 전부 **강제(enforcement)** 요구다. 현행에 Chain/Stage/Level 엔티티가 없으므로 강제할 대상도 강제 코드도 없다(규칙 7 — "위반하지 않음"은 대상 부재 때문이지 준수가 아니다).

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | 하나의 Chain Version은 하나 이상의 Stage를 가진다. | 강제 부재 — `approval_chain`·`approval_stage` grep 0 · 카디널리티 검증 코드 0 | ABSENT |
| 2 | 하나의 Stage는 하나 이상의 Level을 가질 수 있다. | 강제 부재 — 동상 | ABSENT |
| 3 | Level은 반드시 하나의 Stage에 속한다. | 강제 부재 — 소속 FK·검증 0 | ABSENT |
| 4 | Level Number는 표시 및 논리적 깊이 정보이며 Route Edge를 대체하지 않는다. | 강제 부재 — `level_number` 0 · `approval_route`/`route_id` 0. ★`route` 단독 grep 은 **SPA URL 오탐**(`menu_tree.route VARCHAR(255)` `migrations/20260526_168_101_create_menu_tree.sql:10` · `backend/src/routes.php` 1636줄) | ABSENT |
| 5 | Stage Order도 Route Edge를 대체하지 않는다. | 강제 부재 — `stage order` 축 0(오탐 `sc_stages.sort_order` = 배열 인덱스 `SupplyChain.php:198-199`) · Route Edge 0 | ABSENT |
| 6 | 서로 다른 Stage의 Level이 직접 연결될 수 있다. | 강제 부재 — 엣지 모델 0. `journeys.nodes/edges`(`Db.php:35-41`)는 **엣지에 id 가 없어**(`from`+`when` 매칭 `JourneyBuilder:789`,`:796`) Edge 참조 자체가 불가 | ABSENT |
| 7 | 조건부 Stage는 Route Condition을 통해 진입한다. | 강제 부재 — 승인 도메인 조건 진입 0. `RuleEngine.php:24`(화이트리스트 `OPS:33`·`compare:433-439`·`eval` 미사용)는 표현식 선례이나 승인 배선 0 | ABSENT |
| 8 | 비활성 Level은 Active Chain Version에서 참조하지 않는다. | 강제 부재 — Level·활성 상태·Chain Version 3축 전부 0. 버전 선례도 0(`menu_defaults.version` = 리터럴 `'baseline'` `AdminMenu.php:309` · optimistic lock `version` 0) | ABSENT |
| 9 | 동일 Stage 내 Level Code는 유일해야 한다. | 강제 부재 — UNIQUE 제약 0 · `level_code` 컬럼 0 | ABSENT |
| 10 | 동일 Chain Version 내 Stage Code는 유일해야 한다. | 강제 부재 — UNIQUE 제약 0 · `stage_code` 컬럼 0. (인접 UNIQUE 선례: `sc_stages` 는 UNIQUE 조차 없고 `KEY idx_sc_stages (tenant_id, line_id)` 뿐 `SupplyChain.php:53`) | ABSENT |

---

## 2. 설계 계약

후속 구현(별도 승인세션)이 지켜야 할 계약. **본 문서는 코드가 아니며 이 세션의 코드 변경은 0이다.**

### C-1. Stage/Level 은 순서를 소유하지 않는다
원문 §13 산문(926-928) *"`stage order`만으로 실행 순서를 확정하지 마라 / 실제 순서는 Route Edge로 표현한다"* 와 §17-4·§17-5 는 동일 요구의 3중 진술이다.
→ `stage order reference` · `level_number` · `hierarchy depth reference` 는 **표시/논리 깊이 전용**이며 실행 순서 판정에 절대 사용 금지. 실행 순서 SoT = `APPROVAL_ROUTE_EDGE` 단일.
→ 🔴**레포 반례 이식 금지**: `sc_stages.sort_order`(`SupplyChain.php:198-199`)는 배열 인덱스를 그대로 순서로 쓰는 패턴이다. 이 패턴이 Approval Stage 에 복제되면 §13 산문·§17-5 를 동시에 위반한다.

### C-2. `FIXED_GOVERNED_SUBJECT_REFERENCE` 만이 특정 Subject ID 를 허용한다
원문 §15 산문(1027): *"특정 Subject ID는 `FIXED_GOVERNED_SUBJECT_REFERENCE`에서만 허용하며, 승인된 Governance 근거와 Effective Period를 요구하라."*
→ 나머지 25종 Actor Source Type 은 **해석기(resolver)** 를 통해서만 승인자를 산출한다. 하드코딩 사용자 ID 금지.
→ Effective Period 요구는 `valid_from`/`valid_to` 축을 전제하는데 **레포 전량 0**이며, 시점 질의 선례도 결함이다(`kr_fee_rule.effective_from` `Db.php:898` = 컬럼 有·`WHERE effective_from <= :as_of` **전역 0**, 읽기 4개소 전부 `ORDER BY effective_from DESC` 최신승 — `Pnl.php:454`·`KrChannel.php:151`,`:459`). **컬럼만 만들고 질의를 안 만드는 기존 결함을 복제하지 마라.**

### C-3. Level 정족수는 "동일 레벨 N인" 이지 "계층 N단" 이 아니다
`Mapping.php:287` `count($approvals) >= (int)$r["required_approvals"]` 는 **집합 크기**만 센다 — 순서·계층·역할 무관.
→ Canonical 모델에서 `required actor count` 는 **Level 스코프**여야 하고, Level 간 진행은 Route Edge 가 결정한다. 두 개념을 하나의 카운터로 합치면 현행 결함(`required_approvals` = 금액 무관 고정 리터럴 `2` · `Mapping.php:209-210` 유일 생산자 · UPDATE·설정 API 전수 0)이 그대로 재현된다.

### C-4. 자기승인·중복승인 차단은 정책 필드이지 메서드 본문 리터럴이 아니다
현행 `Mapping.php:268-271`(자기승인 403) · `:278-283`(dedup 409) 은 **레포 유일 실집행**이나 4경로 중 1곳에만 존재하고 구성 불가하다.
→ `self approval policy reference` · `duplicate actor policy` · `same actor across level policy` 는 **선언적 정책**으로 승격하고, `Mapping` 의 검사 순서(신원 fail-closed → 상태 → 자기승인 → dedup → 정족수)를 **표준 판정 순서**로 채택하라.
→ 🔴 `Mapping` 도 완전하지 않다: 집행 `apply:296-299` 는 `actorId` 아닌 `actor()`(`:299`) 를 쓴다 → 집행 단계 신원 fail-closed 아님 · 승인자=집행자 차단 없음. **이 갭을 함께 닫아라.**

### C-5. `evidence` = Actor Authorization Snapshot (as-of 재구성 가능)
현행 3형태 전부 미달: `Mapping.php:285` `["user"=>$actor,"ts"=>gmdate('c')]` 2키 · `Alerting:591` `{actor,decision,ts}` 3키(형태 상이) · `AdminGrowth` `decided_by`/`decided_at` 2컬럼. **어느 것도 승인시점 권한/역할/플랜을 보존하지 않는다.**
→ Stage/Level `evidence` 는 **승인 시점의 Actor 권한 스냅샷**을 포함해야 as-of 질의가 성립한다.
→ 감사 정본 선례 = **`backend/src/SecurityAudit.php`**(`:27` tenant 포함 해시 · `:45-52` DDL `tenant_id`/`prev_hash`/`hash_chain` · **`verify():56-68` `hash_equals` 검증기**). 🔴`menu_audit_log.hash_chain` 을 선례로 인용하지 마라 — preimage `'ts'=>date('c')`(`AdminMenu.php:195`) vs 저장 `created_at DEFAULT CURRENT_TIMESTAMP`(`:129`) → 재구성 불가 · `hash_equals` grep 0.

### C-6. `entry condition reference` 의 fail 방향은 마케팅과 반대다
`RuleEngine`(`backend/src/Handlers/RuleEngine.php:24` · 화이트리스트 `OPS:33` · `compare:433-439` · `eval` 미사용)이 §15/§17-7 조건 표현식의 **기존 선례**이며 **Part 2 Canonical DSL ADR(`docs/architecture/ADR_CANONICAL_SEGMENT_DSL*`)의 확장**이다 — 신규 엔진 금지.
→ 🔴단 `JourneyBuilder::evalCondition:818`(`compare:848` `if ($a===null) return false`)의 **미추적 신호→false** 의미론은 마케팅에선 안전(발송 안 함)이나 **승인에선 방향이 반대다**(조건 미평가 → Stage 미진입 → 승인 없이 통과 위험). Approval 이식 시 **fail-closed 로 반전**하라.

### C-7. 신설 금지 · 확장할 것
- **DAG 검증**(§17-6 교차 Stage 연결의 acyclicity) → `backend/src/Handlers/PM/Dependencies.php:79-100`(반복 DFS + `$visited` + tenant 필터 `:91` 매 홉 + 쓰기 전 차단 `:32-34` 422 `cycle_detected`) + `backend/src/Handlers/PM/Gantt.php:104-122`(Kahn 위상정렬 + `:119` 고립 판정 + `:120-125` degrade). **알고리즘 추출·재사용 · 스키마 복제 금지**.
  - 🔴`Dependencies.php:32-34` 는 422 조기반환하여 `:48` `auditLog` **미도달** → 순환 탐지 시 감사 이벤트 없음. **이 결함 복제 금지.**
  - 🔴경로 표기: `backend/src/Handlers/PM/…`. **`backend/src/PM/` 는 존재하지 않는다.**
- **금액 임계**(Stage 진입 조건의 주 후보) → `Catalog.php:1016` `HIGH_VALUE_KRW = 5000000.0` + `:1103-1105` `$price >= HIGH_VALUE_KRW` → `requires_approval=true`·`approval_type='high_value'`. **`APPROVAL_CHAIN_APPLICABILITY` 의 Amount Band 로 승격하고 상수 은퇴. 신규 임계 상수 추가 금지.**

### C-8. §62 `MIGRATE_TO_CANONICAL` 1순위 = `FeedTemplate`
레포에서 승인 시퀀스에 **가장 근접한 능력**: `submitDraft:265-268` → `approveDraft:271-274` → `publishDraft:277-287`(`status!=='approved'` → 409 `must_approve_first`). 본 편에서 정의부 재실증 완료.
→ 그러나 Stage/Level 로 볼 수 없다: 🔴**승인자 신원 검사 0**(자기 제출→자기 승인 무제한 — `transition:249-262` 어디에도 actor 판독 없음) · **합법 전이 집합 선언 0**(`transition(Request,Response,array,string $from,string $to)` `:249` 이 **전이 쌍을 호출자 인자로 받고** 가드 `:258` 은 "현재 status == 넘겨받은 from"만 검사 → 합법 전이의 정본이 3개 메서드 본문에 분산된 리터럴).
→ Canonical 이행 시 `draft/submitted/approved/published/archived` 를 **Stage 로 승격**하고 전이 집합을 **선언적 Route Edge** 로 외부화하라.

---

## 3. 미결·선행조건

### P-1. 🔴 BLOCKED_PREREQUISITE — §3.2 Reporting Line 전량 ABSENT (Level 최대 미결)
§15 Actor Source Type 26종 중 **14종**(#33-#47 중 ROLE 제외)과 필수 필드 **3종**(`hierarchy depth reference` · `manager relationship type reference` · `organization level reference`)이 **조직 계층 축을 전제**한다. 그 선행조건이 **0%** 다.

- **Manager Resolver = ABSENT(능력 기준)** — 상급자(사람)를 반환하는 함수 **0**. `parent_user_id` 판독자 12+개소는 전량 1홉이며 목적이 tenant 해석 또는 `IS NULL` owner 판별이다.
- 🔴🔴**`parent_user_id` 는 상급자를 표현할 수 없다 — 전 4 생성경로가 owner 로 하드고정**:
  - `UserAuth::createTeamMember:1225-1227` (주석 자인: *"manager 가 추가해도 parent 는 최상위 owner"*)
  - `EnterpriseAuth::provisionUser:502` (`(int)$owner['id']`)
  - `UserAuth::createSubAdmin:1549`, `:1576` (`parent=$masterId`)
  - sub 계정은 계정생성 자체 차단 (`:1254-1256`)
  - → 재해석하면 **전 멤버 상급자 = owner 1단 평면**. **컬럼 재사용 불가 · 쓰기 경로부터 변경 필요.**
- **`EnterpriseAuth` 는 manager 를 받을 수조차 없다** — `provisionUser:476` **시그니처에 manager 파라미터 자체가 없다**. SCIM 이 읽는 키 = `userName`/`emails[0].value`/`name.*`/`externalId`(`:364-367`) + `groups`(`:374`). Enterprise User 확장 `manager` 파싱 0 · `department`/`title`/`employeeNumber` 0. `scimUpdateUser:388-395` 는 `active`/`name` 만 → **manager 전송 시 무음 폐기**.
- **다단 상향 순회 사람 축 선례 0** — 유일 DB 상향순회 = `AdminMenu::wouldCycle:540-555`(`menu_tree` · `$depth<100` · **`$visited` 없음** · **tenant_id 없음** `:107-118`).
- ★오탐 배제: `CRM::resolveIdentitiesForTenant:608` `while ($parent[$x] !== $x)` = **Union-Find 경로압축**(메모리 배열 · 고객 아이덴티티 병합 · 조직 무관).

→ **Level 을 조직 계층에 결속하려는 어떤 구현도 §3.2 Reporting Line Foundation(16항목) 선행 없이는 착수 불가.** 289차 5-3-3-1 산출 70편은 **문서상 계약뿐**이며 ADR 자인(`docs/architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md:163` *"실 코드·테이블 0건"*)이 이를 확인한다. **문서 존재를 구현 존재로 계산하면 역산이다.**

### P-2. 권한 축 2벌 분열 — `role requirement reference`(#13)·`ROLE`(#47) 이 PARTIAL 에 머무는 이유
`$roleRank`(`backend/public/index.php:554`) ↔ `team_role`(owner>manager>member) **매핑 코드 전수 0**(50+ 히트 확인 · 역방향도 0).
`$roleRank` 의 판정 축은 **HTTP 메서드**(`:568`)이고 `connector` 의 유일 의미는 ingest 쓰기(`:571-574`) → **기계 신원 API 등급**이지 조직 역할이 아니다. **"무엇을 하는가"만 묻고 "누구인가"를 묻지 않는다.**
→ **"이 행위자가 이 Level 을 승인할 권한이 있는가"를 물을 정본 축이 레포에 없다.** Level 의 `role requirement reference` 는 이 축이 통합되기 전엔 해석 불가.
→ 🔴`acl_permission.approve` 는 **완전한 장식**: `ACTIONS:39` 에 실재 · `normActions:186` 코드 강제 열거 · `seedOrg:711` 실제 시드(`'sales_pipeline'=>['view','create','update','approve']`) — **그러나 읽어서 승인 가부를 판정하는 코드 0**. `actionsCover:194` 의 유일 호출처 `:639` 는 **위임 상한 검증**이지 승인 집행이 아니다.

### P-3. Level 위임(`actor resolver`)의 기반은 정적 grant 뿐
- **최상급 선례 = `TeamPermissions::putMemberPermissions:614-661`** — `assignableMap:354` 상한 → `:639` 초과 시 403 `DELEGATION_EXCEEDED`(`:645-646`) · `clampActions:396` · `reclampTeamMembers:586`. **확장 기반 · 신설 금지.**
- 🔴그러나 **정적 grant 이지 "특정 건 승인권 한시 이양"이 아니다**(대상·기간·회수 축 0) → Level `vacancy policy` / `missing actor policy` 를 얹을 자리가 없다.
- `agency_client_link`(`AgencyPortal.php:20`) 는 Approval 위임 불가: 단위가 테넌트↔테넌트 · 기본 읽기전용(`:86`)·write 는 단일 불리언 · 🔴`:304`,`:381` 이 `revoked_at=NULL` 로 이전 해지시각 **소거** → 위임 이력 물리 소멸 → **as-of 승인권 재구성 불가**(§48 정면 반례).

### P-4. 신규 스키마의 이행 경로 부재
`backend/migrations/` = **21파일 · `20260527_172_002` 정지** · approval/chain/route/workflow 마이그레이션 **0**(히트 5건 전량 `menu_tree`) → 신규 Stage/Level 스키마는 마이그레이션 경로가 없고 `ensureTables` 멱등에 의존해야 한다.
★**`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다** → §13 `valid_from`/`valid_to` · §15 Effective Period 의 **소급(Retroactive) 집행 수단이 없다**. Stage/Level 도입 시 백필 전략을 별도로 설계해야 한다.
(`Migrate` 이름 겹침 주의 — DDL 적용기이지 도메인 이행기 아님 · `PM/Shared.php:37-53` 도 예외 아님.)

### P-5. 분모·범위 자진 신고
- **행 수 = 분모 일치**: §13 = 41(Category 17 + 필수 필드 24) · §15 = 58(필수 필드 32 + Actor Source Type 26) · §17 = 10. **불일치 없음.**
- **산문 미계상(정상)**: §13 줄 926-928(*"stage order만으로 실행 순서를 확정하지 마라 / 실제 순서는 Route Edge로 표현한다"*) 과 §15 줄 1027(*"특정 Subject ID는 FIXED_GOVERNED_SUBJECT_REFERENCE에서만 허용"*)은 **불릿이 아니어서 분모에 없다** → 표에 넣지 않고 **§2 설계 계약 C-1·C-2 로 이관**했다. 이는 §23/§43 특례(불릿 0인데 요구 실재)와 달리 **분모 항목이 이미 요구를 담고 있는 보강 산문**이므로 행 추가가 오히려 날조다.
- **§14 Stage Version · §16 Level Version 은 본 편 범위 밖**(VERSIONING 담당). 표에 포함하지 않았다.
- **cover 0** — `VALIDATED_LEGACY` 판정 **0건**. 109항목 전량 비-cover(**ABSENT 85 · BLOCKED_PREREQUISITE 18 · PARTIAL 6**). 이는 §3.3 결론(*"중복 아니라 부재"*)과 정합한다.
  - BLOCKED_PREREQUISITE 18 = §15 필수 필드 3(#8·#12·#16) + Actor Source Type 15(#33-#46 · #52)
  - PARTIAL 6 = §15 #13 `role requirement reference` · #19 `required actor count` · #23 `duplicate actor policy` · #25 `self approval policy reference` · #47 `ROLE` · #51 `REQUEST_OWNER`
  - §13(41) · §17(10) 은 **전량 ABSENT**
- **약한 앵커**: `tenant_id`(§13 #20)·`status`(§13 #40)·`tenant_id`(§15 #4)·`status`(§15 #31) 4행은 **컬럼 이름 자체는 레포에 흔하나 Stage/Level 엔티티가 없어** ABSENT 로 판정했다. "이름이 있으니 PARTIAL"로 올리면 규칙 6(미달을 중복이라 부르지 마라)·규칙 2(역산) 위반이 된다.
- **PARTIAL 6건의 근거 한계**: #13/#19/#23/#25/#47/#51 은 전부 **단일 경로(주로 `Mapping`)에만 존재하고 구성 불가한 하드코딩**이다. "부분 커버"라기보다 **"한 경로의 우연한 근접"** 에 가깝다. 보수적으로 읽으려면 ABSENT 로 강등해도 결론(cover 0)은 변하지 않는다.
