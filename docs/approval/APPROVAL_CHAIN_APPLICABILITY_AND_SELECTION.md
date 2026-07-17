# Approval Chain Applicability and Selection

> EPIC 06-A Part 4-5-3-1-5-3-3-3 · 원문 §30, §31, §32, §33, §34, §35, §36, §37 전사
> 원문 정본: `docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_3_VERBATIM.md`
> 판정 근거: 289차 ⓑ 전수조사(105항목) 실측. 코드 변경 0.

## 1. 원문 전사

### §30. Approval Chain Applicability (원문 줄 1519-1562 · 분모 31)

`APPROVAL_CHAIN_APPLICABILITY`

★ **이 블록 유일의 능력 기반 반전 1건이 여기에 있다.** `amount_threshold` grep 이 0 임에도 **금액이 승인 필요 여부를 실제로 결정한다**:
`backend/src/Handlers/Catalog.php:1016` `private const HIGH_VALUE_KRW = 5000000.0;` → **`:1103-1105`** `elseif ($price >= self::HIGH_VALUE_KRW) { $requiresApproval = true; $approvalType = $approvalType ?: 'high_value'; }`
→ **Amount Band 로 승격하고 상수를 은퇴시켜라. 신규 임계 상수 추가 금지.**

🔴 **단 "Route" 는 없다** — `approval_type` 은 승인자·경로를 **하나도 선택하지 않는다**(§2.2 상술).

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | approval_chain_applicability_id | `approval_chain_applicability` 이름·능력 0 | ABSENT |
| 2 | chain definition | `approval_chain`·`approval_chain_id` grep 0. ★오염: `chain_id`→챗봇 안내 문자열(`GeniegoKnowledge.php:430` 유일) | ABSENT |
| 3 | chain version | Chain 도메인 version 0. `menu_defaults.version`=리터럴 `'baseline'`(`AdminMenu.php:309`) · optimistic lock version 0 | ABSENT |
| 4 | tenant | Applicability 엔티티 부재. 인접: 승인 질의 tenant 술어=`Catalog::approveQueue:2350` 실재 · 🔴 `AdminGrowth.php:1324` `WHERE id=?` **tenant 술어 없음**·`:142-149` **`tenant_id` 컬럼 자체 없음** | ABSENT |
| 5 | approval domain | 도메인 축 0. 4 승인경로가 각자 다른 스키마·의미론(`mapping_change_request`/`catalog_writeback_job`/`action_request`/`admin_growth_approval`) — 도메인으로 묶는 코드 0 | ABSENT |
| 6 | request type | `approval_type`('high_value'\|'unregister') `Catalog.php:1125` 계산 → 🔴 `logJob:1179` **시그니처에 `approval_type` 파라미터 없음** → 미저장 · `approvalCreate:2275` 도 미전달. 소비처=`frontend/src/pages/Writeback.jsx:170`,`:261` 표시뿐 | NAME_ONLY |
| 7 | resource type | 자원 "유형" 축 0. `operation`(`catalog_writeback_job`)은 동작이지 자원유형 아님. `MENU_CATALOG`(`TeamPermissions.php:55-82` 26개)=메뉴 한정 자원 레지스트리 — 리베이트/승인건은 자원 아님 | ABSENT |
| 8 | transaction type | 거래유형 축 0 | ABSENT |
| 9 | rebate type | Rebate 도메인 이름·능력 전무 | ABSENT |
| 10 | organization scope | §3.1 Organization Foundation REAL 0(`ORG_PRESET`=PHP 상수 `TeamPermissions.php:706-722` · `seedOrg:739` INSERT 에 parent 컬럼 부재) | BLOCKED_PREREQUISITE |
| 11 | organization type | 조직 유형 축 0. `team`(`TeamPermissions.php:143-151`) `parent_team_id` 없음 → 유형 구분 불가 | BLOCKED_PREREQUISITE |
| 12 | legal entity scope | Legal Entity 이름·능력 0(유일 히트 `MarketingDataHub.php:181` "한국 법인 철수"=데모 문자열). `effectiveScope:258` `'company'`→null(**무제한 센티넬** · 법인 아님) | ABSENT |
| 13 | workspace scope | ★오염: `workspace`→`WorkspaceState.php:25`,`:28-33` **13키 화이트리스트 테넌트 KV**(워크스페이스 엔티티 아님). `approval_cfg`(`:29`)도 프론트 설정탭 KV | ABSENT |
| 14 | country scope | ★오염: `country_code`→TikTok 리포트 차원(`Connectors.php:2044`,`:2071`)·IP Geo(`Geo.php:106`). 조직 국가 스코프 0 | ABSENT |
| 15 | region scope | 지역 스코프 축 0. ★오염: `APAC`→`SOAPAction`/`capacity` | ABSENT |
| 16 | program scope | Program 축 0 | ABSENT |
| 17 | product scope | Applicability 축 부재. 인접 `DATA_SCOPES` `product` 실재하나 **행 단위 읽기 필터**(`scopeChannelProduct:319-320` · 호출처 `AdPerformance.php:26`·`Wms.php:1291`·`Catalog.php:981-983`·`OrderHub.php:261`) — 승인 chain 매칭 미배선(규칙 7) | ABSENT |
| 18 | brand scope | 🔴 `DATA_SCOPES` `brand` 존재하나 `scopeChannelProduct:319-320` 이 **brand·product 둘 다 SKU 컬럼에 매핑**(`:312` 자인 "브랜드=상품집합") → **brand 는 독립 차원 아님** | ABSENT |
| 19 | partner scope | Partner 축 0. `agency_client_link`(`AgencyPortal.php:20`)는 **테넌트↔테넌트** 링크이지 파트너 스코프 아님 | ABSENT |
| 20 | channel scope | Applicability 축 부재. 인접 `catalog_writeback_job.channel` 실재하나 승인 chain 매칭 미배선 | ABSENT |
| 21 | customer segment scope | `crm_segments`+`members` 실 세그 SoT 실재(Part 1-3 정본)하나 **승인 도메인 미배선**. ★"segment" 3도메인 명명분리 주의 | ABSENT |
| 22 | amount band reference | ★**능력 실재 · 형태 미달** — `Catalog.php:1016` `HIGH_VALUE_KRW = 5000000.0` + `:1103-1105` `$price >= HIGH_VALUE_KRW` → `requires_approval=true`. 🔴 **Band 아니라 단일 임계** · **PHP 상수**(테넌트별 설정·버전·effective dating 전무) · reference 아님 | PARTIAL |
| 23 | currency reference | 통화 참조 0 — `HIGH_VALUE_KRW` 는 **KRW 하드고정**(명칭에 통화 매립). `fxToKrw`(`Connectors.php:1749`)=`app_setting` KV **단일행 덮어쓰기**(`:1804-1805` · 이력 없음) | ABSENT |
| 24 | risk band reference | Risk 축 0. ★오염: `hris`→`hig`**hRis**`k` | ABSENT |
| 25 | effective period | 🔴 `effective_from` = **`kr_fee_rule` 전용**(`Db.php:898` VARCHAR(32)) · **`WHERE effective_from <= :as_of` 전역 0**(읽기 4개소 전부 `ORDER BY effective_from DESC` 최신승: `Pnl.php:454`·`KrChannel.php:151`,`:459`) · **`effective_to` grep 0**(`Paddle.php:291` 은 Paddle API 리터럴 `'next_billing_period'`) | ABSENT |
| 26 | include conditions | 조건 표현식 축 승인 도메인 0. 확장 기반=`RuleEngine.php:24`(화이트리스트 `OPS:33` · `compare:433-439` switch · 테이블 `:43` · `eval` 미사용) — 미배선 | ABSENT |
| 27 | exclude conditions | 상동. 배제 조건 축 0 | ABSENT |
| 28 | specificity score reference | Specificity 계산 코드 전무(§32) | ABSENT |
| 29 | priority | Chain priority 축 0(§33). ★오염: `override`→스칼라 선행순위(`Mmm.php:381-382`·`OrderHub.php:1274`) · `source_priority`→데이터소스 Trust 우선순위(`DataPlatform.php:65`,`:184`) | ABSENT |
| 30 | status | Applicability status 축 0. 🔴 `SET status *=` 128건/42파일이나 **합법 전이 집합 선언 0** | ABSENT |
| 31 | evidence | Evidence 축 0. 감사 정본 선례=`SecurityAudit.php:27`·`:45-52`·`:56-68` `hash_equals` — Applicability 미배선 | ABSENT |

원문 산문 2건(*"Applicability는 Boolean 매칭 결과를 생성해야 한다"* 줄 1557 · *"실제 Approver Candidate를 생성하지 마라"* 줄 1559)은 필수 필드 열거가 아니므로 분모 31에 포함하지 않았다 → §2.1 계약으로 반영.

### §31. Approval Chain Selection Policy (원문 줄 1563-1602 · 분모 26)

`APPROVAL_CHAIN_SELECTION_POLICY`

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | HIGHEST_PRIORITY | Chain 선택 정책 코드 전무 | ABSENT |
| 2 | MOST_SPECIFIC | 상동 | ABSENT |
| 3 | PRIORITY_THEN_SPECIFICITY | 상동 | ABSENT |
| 4 | SPECIFICITY_THEN_PRIORITY | 상동 | ABSENT |
| 5 | EXPLICIT_BINDING_FIRST | 상동 | ABSENT |
| 6 | TENANT_OVERRIDE_FIRST | 상동. `override` 히트 전량 오염(`Mmm.php:381-382`·`OrderHub.php:1274` 스칼라 선행순위) | ABSENT |
| 7 | DOMAIN_DEFAULT | 상동 | ABSENT |
| 8 | FAIL_ON_MULTIPLE | 🔴 **정면 반례 실재** — `JourneyBuilder::nextNode:799` **첫 일치 즉시 return** → 다중 일치 **무탐지·무기록**(§72-11 위반이 마케팅 도메인에 실재) | ABSENT |
| 9 | MANUAL_REVIEW | 수동 검토 축 0 | ABSENT |
| 10 | CUSTOM | 상동 | ABSENT |
| 11 | approval_chain_selection_policy_id | 이름·능력 0 | ABSENT |
| 12 | tenant | 엔티티 부재 | ABSENT |
| 13 | approval domain | 도메인 축 0(§30 #5) | ABSENT |
| 14 | selection policy | 선택 정책 축 0. 4 승인경로 전량 "호출자가 곧 승인자" — 선택할 체인이 없음 | ABSENT |
| 15 | priority order | 우선순위 순서 축 0 | ABSENT |
| 16 | specificity dimensions | Specificity 차원 축 0(§32) | ABSENT |
| 17 | tie break policy | 동점 처리 축 0 | ABSENT |
| 18 | default chain reference | 기본 체인 축 0 | ABSENT |
| 19 | multiple match policy | 🔴 반례=`nextNode:799` 첫 일치 return(#8) | ABSENT |
| 20 | no match policy | 🔴 **§72-10 위반이 레포에 살아 있다** — `nextNode:809` `if ($hasLabeled) return ''`(BLOCK_ON_NO_MATCH)는 **라벨 있는 그래프에만** 적용 · `:811-812` 무라벨 레거시 그래프에 **위치 폴백 존치**(`$idx = in_array($bl,['true','a','yes','1']) ? 0 : (count($cand)>1 ? 1 : 0)`) · `:814` 분기 없으면 첫 후보 반환. ★286차 실 장애(주석 `:801-803`): *"조건 불충족 고객을 엉뚱한 분기로 오발송"* | ABSENT |
| 21 | evidence requirement | Evidence 축 0 | ABSENT |
| 22 | effective_from | `kr_fee_rule` 전용(`Db.php:898`) · as-of 질의 전역 0(§30 #25) | ABSENT |
| 23 | effective_to | grep 0. ★오염: `valid_to`→`in`**valid_to**`ken`(`Onsite.php:396` 유일) | ABSENT |
| 24 | version | Chain 도메인 version 0(§30 #3) | ABSENT |
| 25 | status | Selection policy status 축 0 | ABSENT |
| 26 | evidence | Evidence 축 0 | ABSENT |

원문 산문 1건(*"DB 조회 결과의 물리적 순서로 Chain을 선택하지 마라"* 줄 1599)은 필수 필드 열거가 아니므로 분모 26에 포함하지 않았다 → §2.3 계약으로 반영(결정론 선례 `pickWeighted:725-734`).

### §32. Chain Specificity (원문 줄 1603-1631 · 분모 18)

Specificity 계산 코드가 **전무**하다. 아래 18개 차원은 "가중치가 틀렸다"가 아니라 **가중할 계산 자체가 없다**.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | Exact Request Type | Specificity 계산 부재. `approval_type` 은 계산 후 소멸(§30 #6) | ABSENT |
| 2 | Exact Rebate Type | Rebate 도메인 전무 | ABSENT |
| 3 | Exact Resource Type | 자원 유형 축 0(§30 #7) | ABSENT |
| 4 | Exact Transaction Type | 거래유형 축 0 | ABSENT |
| 5 | Exact Organization | §3.1 REAL 0 | BLOCKED_PREREQUISITE |
| 6 | Exact Organization Type | §3.1 REAL 0 | BLOCKED_PREREQUISITE |
| 7 | Exact Legal Entity | Legal Entity 이름·능력 0(§30 #12) | ABSENT |
| 8 | Exact Country | `country_code` 전량 오염(§30 #14) | ABSENT |
| 9 | Exact Region | 지역 축 0 | ABSENT |
| 10 | Exact Program | Program 축 0 | ABSENT |
| 11 | Exact Product | Specificity 미계산. `DATA_SCOPES` product=읽기 필터(§30 #17) | ABSENT |
| 12 | Exact Brand | 🔴 brand 는 독립 차원 아님(`scopeChannelProduct:319-320` SKU 컬럼 매핑 · `:312` 자인) → **차원으로 채점 불가** | ABSENT |
| 13 | Exact Partner | Partner 축 0 | ABSENT |
| 14 | Exact Channel | Specificity 미계산 | ABSENT |
| 15 | Exact Customer Segment | `crm_segments` 실재하나 승인 도메인 미배선 | ABSENT |
| 16 | Exact Amount Band Reference | 🔴 Amount Band 자체가 부재(§30 #22 = 단일 PHP 상수 임계). **`Catalog.php:1016` 선례는 Applicability(§30) 능력이지 Specificity 능력이 아니다** — 채점 코드 0 | ABSENT |
| 17 | Exact Risk Band Reference | Risk 축 0(§30 #24) | ABSENT |
| 18 | Exact Environment | Environment 축 0. `Db::envLabel()` 은 운영/데모 라벨이지 승인 환경 차원 아님 | ABSENT |

원문 산문 2건(*"Specificity Weight는 Versioned Policy로 관리하라"* 줄 1626 · *"애플리케이션 코드에 하드코딩하지 마라"* 줄 1628)은 차원 열거가 아니므로 분모 18에 포함하지 않았다 → §2.4 계약으로 반영. ★ 이 두 산문은 **`HIGH_VALUE_KRW` PHP 상수가 정확히 그 안티패턴**임을 지목한다.

### §33. Approval Chain Priority (원문 줄 1632-1656 · 분모 14)

`APPROVAL_CHAIN_PRIORITY`

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | approval_chain_priority_id | 이름·능력 0 | ABSENT |
| 2 | chain definition | `approval_chain` grep 0(§30 #2) | ABSENT |
| 3 | chain version | Chain version 0(§30 #3) | ABSENT |
| 4 | tenant | 엔티티 부재. 🔴 승인 4경로 중 `admin_growth_approval` 은 **`tenant_id` 컬럼 자체가 없다**(`AdminGrowth.php:142-149`) | ABSENT |
| 5 | approval domain | 도메인 축 0(§30 #5) | ABSENT |
| 6 | priority value | Chain 우선순위 값 0. ★오염: `source_priority`→데이터소스 Trust(`DataPlatform.php:65`,`:184`) | ABSENT |
| 7 | priority category | 우선순위 범주 축 0 | ABSENT |
| 8 | override 여부 | ★오염: `override`→스칼라 선행순위(`Mmm.php:381-382`·`OrderHub.php:1274`). Tenant override 축 0 | ABSENT |
| 9 | effective_from | `kr_fee_rule` 전용(§30 #25) | ABSENT |
| 10 | effective_to | grep 0(§31 #23) | ABSENT |
| 11 | reason | 우선순위 사유 축 0 | ABSENT |
| 12 | approved governance reference | 거버넌스 승인 참조 축 0. 🔴 `docs/IMPLEMENTATION_STATUS.md:130` 이 *"Approvals 실집행"* 을 완료로 기록 — **§72-25 위반이 구현이력 정본에 실재** | ABSENT |
| 13 | status | Priority status 축 0 | ABSENT |
| 14 | evidence | Evidence 축 0 | ABSENT |

원문 산문 1건(*"동일 Scope·동일 Effective Period에 동일 Priority의 Active Chain이 여러 개 존재하면 Conflict를 생성하라"* 줄 1653)은 필수 필드 열거가 아니므로 분모 14에 포함하지 않았다 → §2.5 계약으로 반영.

### §34. Chain Resolution Input (원문 줄 1657-1709 · 분모 41)

`APPROVAL_CHAIN_RESOLUTION_INPUT`

★ **Chain Resolution 자체가 존재하지 않으므로**(§35/§36/§37 전량 부재) 어떤 필드도 "Resolution Input 으로서" 기능하지 못한다. 인접 자료가 있는 항목은 실측 칸에 병기했으나, **다른 목적의 유사 데이터를 Resolution Input 능력으로 계산하지 않았다**(규칙 6·7).

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | approval_chain_resolution_input_id | 이름·능력 0 | ABSENT |
| 2 | tenant | Resolution 부재. 인접: `Catalog::approveQueue:2350` tenant 술어 有 · 🔴 `AdminGrowth.php:1324` 無 | ABSENT |
| 3 | workspace | ★오염: `workspace`→테넌트 KV(`WorkspaceState.php:25`) | ABSENT |
| 4 | approval request | Resolution 입력으로서 부재. 인접: `catalog_writeback_job` status=`pending_approval`=실 승인요청 SSOT · 🔴 `catalog_writeback_approval` 테이블은 **고아**(CREATE 2회 `Catalog.php:86`,`:126` + 자인 주석 `:2269` · INSERT/SELECT **0**) | ABSENT |
| 5 | approval case | Case 축 0 | ABSENT |
| 6 | approval requirement | 인접: `required_approvals` **유일 생산자=`Mapping.php:209-210` 리터럴 `2`** + `Db.php:634` `DEFAULT 2`. UPDATE·설정 API·타 INSERT 전수 0 → **요건 모델이 아니라 상수**. 🔴 금액 무관 고정 — 1만원 매핑과 1억원 예산이 동일 승인 강도 | ABSENT |
| 7 | requester subject | 인접: `admin_growth_approval.requested_by`(`AdminGrowth.php:142-149`) · `Mapping.php:246-250` 신원 fail-closed. 🔴 `action_request` 는 **`requested_by` 컬럼 부재**(`Db.php:592-600`) → 자기승인 차단 구조적 불가 | ABSENT |
| 8 | requested for subject | 대리 요청 축 0 | ABSENT |
| 9 | beneficiary reference | 수익자 축 0. Rebate 도메인 전무 | ABSENT |
| 10 | resource | Resolution 입력으로서 부재. 인접: `catalog_writeback_job.sku`/`channel` | ABSENT |
| 11 | resource type | 자원 유형 축 0(§30 #7) | ABSENT |
| 12 | request type | `approval_type` 계산 후 소멸(§30 #6) | NAME_ONLY |
| 13 | transaction type | 거래유형 축 0 | ABSENT |
| 14 | rebate type | Rebate 도메인 전무 | ABSENT |
| 15 | organization | §3.1 Organization Foundation REAL 0 | BLOCKED_PREREQUISITE |
| 16 | legal entity | Legal Entity 이름·능력 0(§30 #12) | ABSENT |
| 17 | country | `country_code` 전량 오염(§30 #14) | ABSENT |
| 18 | region | 지역 축 0 | ABSENT |
| 19 | program | Program 축 0 | ABSENT |
| 20 | product | 인접 `DATA_SCOPES` product=읽기 필터(§30 #17) · 승인 미배선 | ABSENT |
| 21 | brand | 독립 차원 아님(§32 #12) | ABSENT |
| 22 | partner | Partner 축 0 | ABSENT |
| 23 | channel | Resolution 입력으로서 부재. 인접 `catalog_writeback_job.channel` | ABSENT |
| 24 | amount reference | 인접: `Catalog.php:1103` `$price` — 🔴 **참조(reference)가 아니라 지역 변수**. 승인 티켓에 금액이 영속되지 않음(`logJob:1179` 시그니처에 금액 없음) | ABSENT |
| 25 | currency reference | 통화 참조 0. `HIGH_VALUE_KRW` KRW 하드고정(§30 #23) | ABSENT |
| 26 | risk reference | Risk 축 0 | ABSENT |
| 27 | effective_at | as-of 질의 전역 0(`WHERE effective_from <= :as_of` 0건 · §30 #25) | ABSENT |
| 28 | resolution_time_basis | 시점 기준 축 0(아래 #36-41) | ABSENT |
| 29 | organization hierarchy version | §3.1 REAL 0 + version 축 0 | BLOCKED_PREREQUISITE |
| 30 | reporting line version | §3.2 REAL 0(`parent_user_id` 전 4 생성경로 owner 하드고정) + version 축 0 | BLOCKED_PREREQUISITE |
| 31 | policy version references | 정책 버전 축 0. 🔴 정책 게이트 자체가 우회됨 — `evaluatePolicy` 산출 `approval_type` 을 `logJob:2247` 이 저장하지 않고(`:2252` 응답에만) · **`approvalCreate:2259` 는 `evaluatePolicy` 를 호출조차 않는다** | ABSENT |
| 32 | environment | Environment 축 0(§32 #18) | ABSENT |
| 33 | correlation id | ★**신규 오염** — `CORRELATION_ID` 히트 6건 전량 **Walmart 아웃바운드 HTTP 헤더**(`ChannelSync.php:1705`,`:1709`,`:2874`,`:2878`,`:3467`,`:3471` `WM_QOS.CORRELATION_ID`). 승인 상관 ID 0 | ABSENT |
| 34 | idempotency key | `idempotenc` 히트 **1건 · 주석뿐** — `Paddle.php:343` *"UNIQUE constraint on notification_id = idempotency guard"*(웹훅 중복방지). 승인 멱등키 0 | ABSENT |
| 35 | evidence | Evidence 축 0 | ABSENT |
| 36 | REQUEST_EFFECTIVE_TIME | 시점 기준 열거 0 | ABSENT |
| 37 | REQUEST_CREATED_TIME | 상동. 인접 `created_at` 실재하나 기준 선택 축 아님 | ABSENT |
| 38 | CASE_CREATED_TIME | Case 축 0 | ABSENT |
| 39 | CHAIN_BUILD_TIME | Chain 축 0 | ABSENT |
| 40 | EXPLICIT_BUSINESS_TIME | 업무시각 축 0 | ABSENT |
| 41 | POLICY_DEFINED | 정책 정의 시점 축 0 | ABSENT |

### §35. Approval Chain Candidate (원문 줄 1710-1741 · 분모 19)

`APPROVAL_CHAIN_CANDIDATE`

★ **후보 집합을 만드는 코드가 전무하다.** `Existing Approval Manager Resolver` = **ABSENT(능력 확인)** — `resolveApprover`/`approval_chain`/`routeApproval`/`next_approver`/`approver_id`/`approval_level`/`approval_stage`/`step_order`/`escalat` **승인 히트 0**. **4 승인경로 전량 "호출자가 곧 승인자"**.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | approval_chain_candidate_id | 이름·능력 0 | ABSENT |
| 2 | resolution input | §34 전량 부재 | ABSENT |
| 3 | chain definition | `approval_chain` grep 0 | ABSENT |
| 4 | chain version | Chain version 0 | ABSENT |
| 5 | applicability result | Boolean 매칭 산출 코드 0(§30) | ABSENT |
| 6 | matched dimensions | 차원 매칭 코드 0 | ABSENT |
| 7 | unmatched optional dimensions | 상동 | ABSENT |
| 8 | excluded dimensions | 상동 | ABSENT |
| 9 | priority | Chain priority 0(§33) | ABSENT |
| 10 | specificity score | Specificity 계산 0(§32) | ABSENT |
| 11 | tenant override state | Tenant override 축 0(§33 #8) | ABSENT |
| 12 | effective period match | as-of 질의 전역 0(§30 #25) | ABSENT |
| 13 | validation state | Chain 검증 축 0. 확장 기반=`PM/Dependencies.php:79-100`(DFS+`$visited`+tenant 필터 `:91`) · `PM/Gantt.php:104-122`(Kahn 위상정렬) — 미배선 | ABSENT |
| 14 | compilation state | 컴파일 축 0 | ABSENT |
| 15 | conflict state | 🔴 Conflict 탐지 반례=`nextNode:799` 첫 일치 즉시 return(다중 일치 무탐지) | ABSENT |
| 16 | exclusion reasons | 배제 사유 축 0(§36) | ABSENT |
| 17 | proposed 여부 | 제안 상태 축 0 | ABSENT |
| 18 | manual review requirement | 수동 검토 축 0 | ABSENT |
| 19 | evidence | Evidence 축 0 | ABSENT |

원문 산문 2건(*"이번 Candidate는 Chain Definition 후보다"* 줄 1736 · *"Manager·Approver Subject Candidate와 혼동하지 마라"* 줄 1738)은 필수 필드 열거가 아니므로 분모 19에 포함하지 않았다 → §2.6 계약으로 반영.

### §36. Candidate Exclusion Reason (원문 줄 1742-1777 · 분모 29)

배제 사유를 기록하는 코드가 **전무**하다. 인가 결정조차 관측 불가하다 — 403 은 `backend/public/index.php:566`,`:576` `makeJson` **즉시 반환**(**Authorization Decision 로그 0**).

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | WRONG_TENANT | 배제 사유 기록 코드 0. 🔴 `AdminGrowth.php:1324` 는 tenant 술어 자체가 없어 배제 판정 불가 | ABSENT |
| 2 | WRONG_APPROVAL_DOMAIN | 도메인 축 0(§30 #5) | ABSENT |
| 3 | WRONG_REQUEST_TYPE | `approval_type` 로 필터하는 코드 0 — 🔴 `approveQueue:2350-2352` 는 `tenant_id`/`status`/`operation`/`ids` 로만 필터 → **`high_value` 와 `unregister` 가 동일 경로·동일 권한으로 승인** | ABSENT |
| 4 | WRONG_RESOURCE_TYPE | 자원 유형 축 0 | ABSENT |
| 5 | WRONG_TRANSACTION_TYPE | 거래유형 축 0 | ABSENT |
| 6 | WRONG_REBATE_TYPE | Rebate 도메인 전무 | ABSENT |
| 7 | WRONG_ORGANIZATION | §3.1 REAL 0 | BLOCKED_PREREQUISITE |
| 8 | WRONG_ORGANIZATION_TYPE | §3.1 REAL 0 | BLOCKED_PREREQUISITE |
| 9 | WRONG_LEGAL_ENTITY | Legal Entity 이름·능력 0 | ABSENT |
| 10 | WRONG_COUNTRY | `country_code` 오염(§30 #14) | ABSENT |
| 11 | WRONG_REGION | 지역 축 0 | ABSENT |
| 12 | WRONG_PROGRAM | Program 축 0 | ABSENT |
| 13 | WRONG_PRODUCT | 승인 도메인 product 매칭 0 | ABSENT |
| 14 | WRONG_BRAND | brand 독립 차원 아님(§32 #12) | ABSENT |
| 15 | WRONG_PARTNER | Partner 축 0 | ABSENT |
| 16 | WRONG_CHANNEL | 승인 도메인 channel 매칭 0 | ABSENT |
| 17 | WRONG_CUSTOMER_SEGMENT | `crm_segments` 승인 미배선 | ABSENT |
| 18 | WRONG_AMOUNT_BAND_REFERENCE | Amount Band 부재 — `Catalog.php:1103` 은 **배제가 아니라 요건 부여**(`requires_approval=true`)이며 사유를 기록하지 않음. `findings[] HIGH_VALUE`(`:1105`)는 **응답 전용**(logJob 미저장) | ABSENT |
| 19 | WRONG_RISK_BAND_REFERENCE | Risk 축 0 | ABSENT |
| 20 | OUTSIDE_EFFECTIVE_PERIOD | as-of 질의 전역 0(§30 #25) | ABSENT |
| 21 | VERSION_INACTIVE | version 축 0. `menu_defaults.version`=리터럴 `'baseline'`(`AdminMenu.php:309`) | ABSENT |
| 22 | VERSION_UNAPPROVED | 상동 | ABSENT |
| 23 | VALIDATION_FAILED | 인접 선례=`PM/Dependencies.php:32-34` **422 `cycle_detected` 쓰기 전 차단**. 🔴 단 `:48` `auditLog` 미도달 → **순환 탐지 시 감사 이벤트 없음**(복제 금지) · 승인 도메인 미배선 | ABSENT |
| 24 | COMPILATION_FAILED | 컴파일 축 0 | ABSENT |
| 25 | ROUTE_INVALID | ★오염: `route`→SPA URL(`menu_tree.route VARCHAR(255)` `migrations/20260526_168_101_create_menu_tree.sql:10` · `backend/src/routes.php` 1636줄). **`route` 단독 grep 무의미** | ABSENT |
| 26 | TENANT_OVERRIDE_REQUIRED | Tenant override 축 0 | ABSENT |
| 27 | EXPLICIT_EXCLUSION | 명시 배제 축 0 | ABSENT |
| 28 | MANUAL_EXCLUSION | 수동 배제 축 0 | ABSENT |
| 29 | OTHER | 배제 사유 열거 자체가 부재 | ABSENT |

### §37. Chain Resolution Result (원문 줄 1778-1824 · 분모 33)

`APPROVAL_CHAIN_RESOLUTION_RESULT`

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | approval_chain_resolution_result_id | 이름·능력 0 | ABSENT |
| 2 | resolution input | §34 전량 부재 | ABSENT |
| 3 | selected chain definition | 선택 대상 chain 0 | ABSENT |
| 4 | selected chain version | Chain version 0 | ABSENT |
| 5 | selected template version | 🔴 Workflow Template=NAME_ONLY — `createJourney:120-125` `$defaultNodes`/`$defaultEdges`=**PHP 리터럴 시드 그래프**(생성 시 1회 복사) · 레지스트리·버전·재적용 전무 | ABSENT |
| 6 | candidate references | 후보 집합 코드 전무(§35) | ABSENT |
| 7 | selection policy | 선택 정책 0(§31) | ABSENT |
| 8 | priority result | Priority 0(§33) | ABSENT |
| 9 | specificity result | Specificity 0(§32) | ABSENT |
| 10 | tie break result | 동점 처리 0 | ABSENT |
| 11 | stage references | `approval_stage` grep 0. ★오염: `stage`/`sc_stages`→물류 마일스톤 체크리스트(`SupplyChain.php:50-54`,`:193-199` · `done TINYINT`=체크박스) | ABSENT |
| 12 | level references | `approval_level` grep 0 | ABSENT |
| 13 | route version | `approval_route`/`route_id` grep 0(§36 #25 오염 주의) | ABSENT |
| 14 | compiled artifact reference | 컴파일 산출물 축 0 | ABSENT |
| 15 | required actor source requirements | 🔴 **행위자 자격을 물을 정본 축이 없다** — 권한 축 **2벌 분열**: `$roleRank`(`backend/public/index.php:554` `viewer0<connector1<analyst2<admin3`) ↔ `team_role`(owner>manager>member) · **매핑 코드 전수 0**(양방향). `$roleRank` 판정 축=**HTTP 메서드**(`:568`) → "무엇을 하는가"만 묻고 "누구인가"를 묻지 않는다 | ABSENT |
| 16 | authority policy references | 🔴 `acl_permission.approve` = **완전한 장식** — `TeamPermissions::ACTIONS:39` 실재 · `normActions:186` 코드 강제 열거 · `seedOrg:711` 실제 시드(`'sales_pipeline'=>['view','create','update','approve']`) — **그러나 `approve` 를 읽어 승인 가부를 판정하는 코드 0**. `actionsCover:194` 유일 호출처 `:639` 는 **위임 상한 검증**이지 승인 집행 아님 | ABSENT |
| 17 | fallback references | Fallback 축 0. 인접 폴백 선례 전부 복제 금지(`nextNode:811-814` · `pickWeighted:729`) | ABSENT |
| 18 | warning references | 경고 참조 축 0. 인접: `PM/Gantt.php:120-125` **500 아닌 부분결과+경고 degrade** 선례 — 승인 미배선 | ABSENT |
| 19 | conflict references | Conflict 축 0(§35 #15) | ABSENT |
| 20 | manual review requirement | 수동 검토 축 0 | ABSENT |
| 21 | resolution status | Resolution 부재(아래 #26-33) | ABSENT |
| 22 | resolved_at | 상동 | ABSENT |
| 23 | resolver version | Resolver 부재 | ABSENT |
| 24 | immutable_hash | 🔴 **감사 정본 선례=`SecurityAudit.php:27`(tenant 포함 해시)·`:45-52` DDL(`tenant_id`/`prev_hash`/`hash_chain`)·`:56-68` `verify()` `hash_equals` 검증기** + `schema_migrations.checksum`(`Migrate.php:50`) — Chain 도메인 0. ★`menu_audit_log.hash_chain` 을 선례로 인용하지 마라(preimage `'ts'=>date('c')` `AdminMenu.php:195` vs 저장 `created_at DEFAULT CURRENT_TIMESTAMP` `:129` → **재구성 불가** · `hash_equals` grep 0) | ABSENT |
| 25 | evidence | Evidence 축 0 | ABSENT |
| 26 | RESOLVED | Resolution status 열거 0 | ABSENT |
| 27 | RESOLVED_WITH_WARNINGS | 상동 | ABSENT |
| 28 | MULTIPLE_MATCH | 🔴 반례=`nextNode:799` 첫 일치 return(무탐지) | ABSENT |
| 29 | NO_MATCH | 🔴 반례=`nextNode:811-814` 무라벨 위치 폴백·첫 후보 반환(§72-10 위반 실재) | ABSENT |
| 30 | CONFLICT | Conflict 축 0 | ABSENT |
| 31 | MANUAL_REVIEW | 수동 검토 축 0 | ABSENT |
| 32 | BLOCKED | 차단 상태 축 0 | ABSENT |
| 33 | FAILED | 실패 상태 축 0. 🔴 `SET status *=` 128건/42파일이나 **합법 전이 집합 선언 0** · 전이 가드 최소 8곳뿐 | ABSENT |

원문 산문 1건(*"실제 Approver Subject 목록을 최종 결과로 확정하지 마라"* 줄 1821)은 필수 필드 열거가 아니므로 분모 33에 포함하지 않았다 → §2.6 계약으로 반영.

## 2. 설계 계약

### 2.1 Applicability = Boolean 매칭 · Candidate 생성 금지
원문 줄 1557·1559: Applicability 는 **Boolean 매칭 결과만** 생성하고 **실제 Approver Candidate 를 생성하지 마라**.
→ 현행 `Catalog.php:1103-1105` 는 이 계약을 **우연히 지키고 있다**(`requires_approval` Boolean 산출 · 승인자 미선정). 그러나 이는 준수가 아니라 **Candidate 개념 자체가 없어서**다(규칙 7). 계약으로 승격시켜 명문화하라.

### 2.2 ★HIGH_VALUE_KRW 승격 계약 — 능력은 있고 Route 는 없다
| 축 | 현행 | 계약 |
|---|---|---|
| 금액→승인 필요 판정 | ✅ `Catalog.php:1016`+`:1103-1105` **실동작** | Amount Band 로 승격 · **상수 은퇴** · 신규 임계 상수 추가 금지 |
| Band | ❌ 단일 임계(5,000,000) | 구간(band) 엔티티 |
| 테넌트별 설정 | ❌ PHP 상수 | 테넌트 스코프 설정 |
| 버전·effective dating | ❌ 전무 | Versioned + effective period |
| 통화 | ❌ KRW 명칭 매립 | currency reference |
| **승인자·경로 선택** | ❌ **하나도 안 한다** | Chain Definition 선택 |

🔴 **`approval_type` 은 Route 가 아니다**:
- `approvalCreate:2280` 에서 `$operation` 문자열 계산에만 쓰이고 **소멸**
- `approveQueue:2341-2360` 은 **`approval_type` 으로 필터하지 않는다** → `high_value` 와 `unregister` 가 **동일 경로·동일 권한**(`requirePro` `:2343`)으로 승인
- `logJob:1179` **시그니처에 `approval_type` 파라미터가 없다** → 영속 자체가 불가

### 2.3 결정론 계약 (원문 줄 1599)
*"DB 조회 결과의 물리적 순서로 Chain을 선택하지 마라."*
→ 확장할 선례 = **`JourneyBuilder::pickWeighted:725-734`** — `$r = ((($seed * 2654435761) + 1) % 100000) / 100000.0 * $total` **enrollId 해시 기반 결정적 분배**(주석 `:724` *"동일 고객 동일 분기·재현가능"*). **§4.7 "Chain Selection 은 결정론적"의 레포 선례.**
🔴 **`:729` `if ($total <= 0) return (string)($keys[0] ?? 'a');` 첫 키 폴백은 복제 금지**(§72-10 유사 — 물리적 순서 선택 그 자체).
🔴 **`:733` `return (string)end($keys);`** 도 동일 성격(부동소수 잔차 시 마지막 키) — Chain Selection 이식 시 **명시 오류**로 대체하라.

### 2.4 Specificity Weight = Versioned Policy (원문 줄 1626·1628)
*"Specificity Weight는 Versioned Policy로 관리하라. 애플리케이션 코드에 하드코딩하지 마라."*
→ **`HIGH_VALUE_KRW = 5000000.0`(PHP 상수)이 정확히 이 안티패턴이다.** §2.2 승격과 동일 작업으로 묶어라.
→ 조건 표현식 확장 기반 = **`RuleEngine.php:24`**(화이트리스트 `OPS:33` · `compare:433-439` switch · 테이블 `:43` · **`eval` 미사용** — `eval`/`create_function`/`system` `backend/src` **0**). Part 2 Canonical DSL ADR(`docs/architecture/ADR_CANONICAL_SEGMENT_DSL*`)의 **확장**이지 신규 엔진 아님.
🔴 **`evalCondition` 방향 반전 주의**: 정의 `JourneyBuilder.php:818` · `compare:848` `if ($a === null) return false` → **미추적 신호→false**. 마케팅에선 안전(발송 안 함)이나 **승인에선 방향이 반대**(승인 안 됨이 아니라 조건 미충족으로 체인 이탈 위험). §25 `fail closed 여부` 직결 — Approval 이식 시 **Unknown≠Pass 를 명시 설계**하라.

### 2.5 Conflict 생성 계약 (원문 줄 1653)
동일 Scope·동일 Effective Period·동일 Priority 의 Active Chain 다수 → **Conflict 생성**.
🔴 현행 반례가 마케팅 도메인에 실재: `nextNode:799` **첫 일치 즉시 return** → 다중 일치 무탐지·무기록(§72-11 위반). **이 패턴을 Approval 로 이식하면 Conflict 계약이 원천 불가능해진다.**

### 2.6 Chain Definition 후보 ≠ Approver Subject 후보 (원문 줄 1736·1738·1821)
§35 Candidate 는 **Chain Definition 후보**다. §37 도 **실제 Approver Subject 목록을 최종 결과로 확정하지 마라**.
→ 현행 4 승인경로가 전부 "호출자가 곧 승인자"이므로, 후속 구현이 편의상 `resolution_result` 에 `user_id` 배열을 채우려는 압력이 크다. **이는 §35/§37 정면 위반**이며 §29 Manager Subject Resolution(후속 블록)을 앞당겨 침범한다.

### 2.7 신설 금지 · 확장할 것
| 원문 요구 | 확장 대상 | 금지 |
|---|---|---|
| §39 DAG 검증 | `backend/src/Handlers/PM/Dependencies.php:79-100` + `PM/Gantt.php:104-122` | 스키마 복제(`:90-91` 결함 동반 이식) |
| §25 Condition 표현식 | `backend/src/Handlers/RuleEngine.php:24` | 신규 엔진 |
| §14/§30/§32/§33 금액 임계 | `Catalog.php:1016`+`:1103-1105` → Amount Band 승격 | 신규 임계 상수 |
🔴 경로 표기: `backend/src/Handlers/PM/…`. **`backend/src/PM/` 는 존재하지 않는다**(5-3-3-1 산출 25편 오표기).

## 3. 미결·선행조건

### 3.1 판정 분포 — cover 0
| 섹션 | 분모 | ABSENT | BLOCKED_PREREQUISITE | NAME_ONLY | PARTIAL | **cover** |
|---|---|---|---|---|---|---|
| §30 Applicability | 31 | 27 | 2 | 1 | **1** | **0** |
| §31 Selection Policy | 26 | 26 | 0 | 0 | 0 | **0** |
| §32 Chain Specificity | 18 | 16 | 2 | 0 | 0 | **0** |
| §33 Chain Priority | 14 | 14 | 0 | 0 | 0 | **0** |
| §34 Resolution Input | 41 | 37 | 3 | 1 | 0 | **0** |
| §35 Chain Candidate | 19 | 19 | 0 | 0 | 0 | **0** |
| §36 Exclusion Reason | 29 | 27 | 2 | 0 | 0 | **0** |
| §37 Resolution Result | 33 | 33 | 0 | 0 | 0 | **0** |
| **계** | **211** | **199** | **9** | **2** | **1** | **0** |

유일한 `PARTIAL` = §30 #22 amount band reference(`Catalog.php:1016`+`:1103-1105`). **cover(`VALIDATED_LEGACY`) 0.**

### 3.2 선행조건 — 문서 존재를 구현 존재로 계산하면 역산이다
289차 5-3-3-1/5-3-3-2 산출 **151편은 문서상 계약뿐**이다. ADR 자인: `docs/architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md:163` *"실 코드·테이블 0건"*.
→ §30 #10·#11 · §32 #5·#6 · §34 #15·#29·#30 · §36 #7·#8 의 `BLOCKED_PREREQUISITE` 9건은 **문서가 아니라 코드**를 기다린다.

### 3.3 Canonical DAG SoT = 셋 다 아니다 → 신규 SoT 구축이 정합
§72-18(*"Workflow Engine 과 별도 Route Source of Truth 를 만들지 마라"*)·§6(*"기존 Workflow Definition 이 범용 DAG 를 제공한다면"*) = **양쪽 다 전건이 거짓** → **금지가 발동하지 않는다** → `APPROVAL_ROUTE_*`·`APPROVAL_CHAIN_*` **신규 SoT 구축이 정합**.
탈락: `JourneyBuilder`(정의 계층 공백 · 엣지 id 없음 · `customer_id` 하드 전제 · version 0) · `graph_node`/`graph_edge`(acyclicity 검사 없음 · 순회기 0) · `pm_task_dependencies`(검증기이지 엔진 아님 · 도메인=PM).

### 3.4 마이그레이션 경로 부재
`backend/migrations/` **21파일 · `20260527_172_002` 정지** · approval/chain/route/workflow 마이그레이션 **0**(히트 5건 전량 `menu_tree`) → 신규 스키마는 **`ensureTables` 멱등** 경로뿐.
🔴 **`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다** → §48 Retroactive 집행 수단 없음. **`Migrate` 이름 겹침 주의**(DDL 적용기이지 도메인 이행기 아님).

### 3.5 후속 승인세션 대상 (이 세션 코드변경 0)
1. `HIGH_VALUE_KRW` → Amount Band 승격 + 상수 은퇴(§2.2·§2.4)
2. 🔴 **정책 게이트 우회 봉합** — `logJob` 이 `approval_type` 을 저장하지 않고 `approvalCreate:2259` 가 `evaluatePolicy` 를 호출조차 하지 않는다(§34 #31)
3. 🔴 **`Catalog::approveQueue:2350` — ids 미지정 시 테넌트 전체 `pending_approval` 일괄 승인**(기본 동작이 전량 승인)
4. 🔴 `Catalog::approveQueue` **감사 0**(클래스에 audit 함수 자체 부재 · 4경로 중 유일)
5. 🔴 `admin_growth_approval` **`tenant_id` 컬럼 부재**(`AdminGrowth.php:142-149`) · 조회 `:1324` tenant 술어 없음
6. 🔴 `requested_by`·`decided_by` **양쪽 있는데 비교 코드 0**(`AdminGrowth.php:1324-1331`) → 자기승인 차단 없음
7. 🔴 `docs/IMPLEMENTATION_STATUS.md:130` **§72-25 위반 정정** — *"Approvals 실집행"* 완료 기록이나 `action_request` **생산자 0 → 영원히 빈 테이블**

### 3.6 자진 신고
- §30 #22 `PARTIAL` 은 **판단 호출**이다. `Catalog.php:1016`+`:1103-1105` 는 Applicability 의 **본질 기능(금액→Boolean)을 실제로 수행**하므로 `ABSENT` 가 아니라 `PARTIAL` 로 두었다. Band·reference·버전·테넌트 설정이 전무하므로 cover 로 계산하지 않았다.
- §32 #16 `Exact Amount Band Reference` 는 동일 코드를 근거로 **`ABSENT`** 로 판정했다 — Applicability(§30) 능력과 Specificity(§32) 능력은 다르며, **채점 코드는 0**이다. 동일 코드에 서로 다른 판정을 준 이유를 여기 명시한다.
- §34/§36/§37 에서 인접 자료(`catalog_writeback_job.sku`/`channel`/`created_at` 등)를 `PARTIAL` 로 올리지 않았다. Chain Resolution 자체가 부재하여 **"Resolution Input/Result 로서" 기능하지 못하기 때문**이다(규칙 6: 미달을 중복이라 부르면 통합 결과가 자동으로 "기능 유지"로 위장된다).
- §29 후속 이관 항목과 달리, 이 문서의 항목은 원문이 후속 이관을 명시하지 않았다.
