# Approval Chain Domain Model — Canonical Entity · Registry · Type · Definition

> EPIC 06-A Part 4-5-3-1-5-3-3-3 · 원문 §6, §7, §8, §9 전사
> 원문 정본: `docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_3_VERBATIM.md`
> 판정 근거: 289차 ⓑ 전수조사(105항목) 실측. 코드 변경 0.

## 1. 원문 전사

### §6. Canonical Entity (원문 줄 550-596 · 분모 36)

원문 전문(前文): *"기존 동등 Entity가 없을 경우 최소 다음을 구축하라."*

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | `APPROVAL_CHAIN_REGISTRY` | 이름·능력 0. `approval_chain`/`registry_code`/`registry_type`/`authoritative_source` grep = `backend/src` 전수 0 | ABSENT |
| 2 | `APPROVAL_CHAIN_DEFINITION` | 이름 0. 승인 4경로(`Mapping.php:246-299` · `Catalog.php:2247-2362` · `Db.php:592-600` action_request · `AdminGrowth.php:142-149`) 전부 **정의 계층 없이 코드에 하드와이어** | ABSENT |
| 3 | `APPROVAL_CHAIN_VERSION` | 이름 0. optimistic lock `version` 0 · `menu_defaults.version` = 리터럴 `'baseline'`(`AdminMenu.php:309`) — Chain 도메인 0 | ABSENT |
| 4 | `APPROVAL_CHAIN_TEMPLATE` | 이름 0. 인접 = `JourneyBuilder::createJourney:120-125` `$defaultNodes`/`$defaultEdges` **PHP 리터럴 시드 그래프**(생성 시 1회 복사 · 레지스트리·재적용 0) — 템플릿 아님 | ABSENT |
| 5 | `APPROVAL_CHAIN_TEMPLATE_VERSION` | 이름 0. 상위(#4) 부재 → 종속 부재 | ABSENT |
| 6 | `APPROVAL_CHAIN_TYPE` | 이름 0. 승인 유형 열거 **실재 0** — `Catalog.php:1104` `approval_type='high_value'` 는 리터럴 1건이며 열거·CHECK·`in_array` 강제 없음 | ABSENT |
| 7 | `APPROVAL_STAGE_DEFINITION` | `approval_stage`/`stage` 승인 히트 0. `stage` grep 오염 = `SupplyChain.php:50-54` 물류 마일스톤 체크리스트 | ABSENT |
| 8 | `APPROVAL_STAGE_VERSION` | 상위(#7) 부재 → 종속 부재 | ABSENT |
| 9 | `APPROVAL_LEVEL_DEFINITION` | `approval_level` grep 0. 다단 승인 단계 개념 자체가 4경로 전량 부재(전부 1단 결정) | ABSENT |
| 10 | `APPROVAL_LEVEL_VERSION` | 상위(#9) 부재 → 종속 부재 | ABSENT |
| 11 | `APPROVAL_ROUTE_DEFINITION` | `approval_route`/`route_id` grep 0. `route` 단독 grep 은 **SPA URL 오염**(`menu_tree.route VARCHAR(255)` · `backend/src/routes.php`) | ABSENT |
| 12 | `APPROVAL_ROUTE_VERSION` | 상위(#11) 부재 → 종속 부재 | ABSENT |
| 13 | `APPROVAL_ROUTE_SEGMENT` | 이름·능력 0. 경로 구간 개념 선례 0 | ABSENT |
| 14 | `APPROVAL_ROUTE_NODE` | 승인 도메인 0. 인접 = `journeys.nodes` MEDIUMTEXT(`JourneyBuilder.php:35-41` · **무검증 `json_encode`** `:135`,`:153-154`) · `graph_node`(`Db.php:816-824`) — ⓑ §70 Step 2 에서 **양쪽 다 Canonical DAG SoT 로 탈락** | ABSENT |
| 15 | `APPROVAL_ROUTE_EDGE` | 승인 도메인 0. 인접 = `journeys.edges`(**엣지 id 없음** — `from`+`when` 매칭 `JourneyBuilder.php:789`,`:796` → 참조 불가) · `graph_edge`(`Db.php:826-839` · **acyclicity 검사 없음** `GraphScore` upsert 경로) | ABSENT |
| 16 | `APPROVAL_ROUTE_CONDITION` | 승인 도메인 0. **확장 대상 실재** = `RuleEngine`(`backend/src/Handlers/RuleEngine.php:24` · 화이트리스트 `OPS:33` · `compare:433-439` · 테이블 `:43` · `eval` 미사용) → §25 Typed Expression 의 기존 선례 | MIGRATION_REQUIRED |
| 17 | `APPROVAL_ROUTE_BRANCH` | 승인 도메인 0. 인접 = `JourneyBuilder` `condition:600`→`evalCondition:818` · `split:610`→`pickWeighted:725` (**배타 택일만** · 마케팅 도메인) | ABSENT |
| 18 | `APPROVAL_ROUTE_MERGE` | 이름·능력 0. 병합(join) 선례 레포 전수 0 — `nextNode:799` 은 **첫 일치 즉시 return**(다중 경로 병합 개념 없음) | ABSENT |
| 19 | `APPROVAL_CHAIN_APPLICABILITY` | 승인 도메인 0. **승격 대상 실재** = `Catalog.php:1016` `HIGH_VALUE_KRW = 5000000.0` + `:1103-1105` `$price >= HIGH_VALUE_KRW` → `requires_approval=true` — Amount Band 로 승격하고 상수 은퇴 | MIGRATION_REQUIRED |
| 20 | `APPROVAL_CHAIN_SELECTION_POLICY` | 이름·능력 0. 4경로 전량 **선택 없이 단일 하드와이어 경로** | ABSENT |
| 21 | `APPROVAL_CHAIN_PRIORITY` | 승인 도메인 0. `source_priority` grep 오염 = 데이터소스 Trust 우선순위(`DataPlatform.php:65`,`:184`) | ABSENT |
| 22 | `APPROVAL_CHAIN_RESOLUTION_INPUT` | 이름·능력 0. 해석 입력 개념 부재(경로가 코드 분기이므로 입력을 받지 않음) | ABSENT |
| 23 | `APPROVAL_CHAIN_CANDIDATE` | 이름·능력 0. 후보 집합 개념 부재 | ABSENT |
| 24 | `APPROVAL_CHAIN_RESOLUTION_RESULT` | 이름·능력 0. 해석 결과 영속 0 | ABSENT |
| 25 | `APPROVAL_CHAIN_VALIDATION` | 승인 도메인 0. **알고리즘 추출 대상 실재** = `backend/src/Handlers/PM/Dependencies.php:79-100`(반복 DFS + `$visited` + tenant 필터 `:91` 매 홉 + 쓰기 전 차단 `:32-34` 422 `cycle_detected`) · `PM/Gantt.php:104-122`(Kahn 위상정렬 + `:119` 도달성 판정). **스키마 복제 금지** | MIGRATION_REQUIRED |
| 26 | `APPROVAL_CHAIN_COMPILATION` | 이름·능력 0. 컴파일 산출물 개념 선례 0 | ABSENT |
| 27 | `APPROVAL_CHAIN_CONFLICT` | 이름·능력 0. **§72-11 위반이 마케팅 도메인에 실재** — `nextNode:799` 첫 일치 즉시 return → 다중 일치 무탐지·무기록 | ABSENT |
| 28 | `APPROVAL_CHAIN_OVERRIDE` | 승인 도메인 0. `override` grep 오염 = 스칼라 선행순위(`Mmm.php:381-382` · `OrderHub.php:1274`) | ABSENT |
| 29 | `APPROVAL_CHAIN_FALLBACK` | 이름 0. 현행 폴백은 전부 **무음 폴백**(복제 금지 대상) — `nextNode:811-812` 위치 폴백 · `pickWeighted:729` 첫 키 폴백 · `TeamPermissions:342` 무음 강등 | ABSENT |
| 30 | `MISSING_APPROVAL_CHAIN_POLICY` | 승인 도메인 0. 인접 = `JourneyBuilder::nextNode:809` `if ($hasLabeled) return ''`(BLOCK_ON_NO_MATCH) — **라벨 있는 그래프에만** 적용 · `:811-812` 무라벨 폴백 존치(286차 실 장애 주석 `:801-803`) → 조건부 확립일 뿐 | ABSENT |
| 31 | `APPROVAL_CHAIN_EFFECTIVE_PERIOD` | `valid_from`/`valid_to` grep **전수 0**(유일 히트 `Onsite.php:396` = `in`**valid_to**`ken` 오염). `effective_from` 은 `kr_fee_rule`(`Db.php:898`) 세율 도메인 한정 · **as-of 질의 0**(읽기 4개소 전부 `ORDER BY effective_from DESC` 최신승 — `Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`) | ABSENT |
| 32 | `APPROVAL_CHAIN_SNAPSHOT` | 승인 도메인 0. 스냅샷 선례 = `menu_defaults.snapshot_data`(`AdminMenu.php:119-120`)·`pm_baseline.snapshot_json`(`PM/Enterprise.php:360`) — Chain 도메인 0. `snapshot` grep 최다 오염 = CCTV JPEG(`routes.php:271`) | ABSENT |
| 33 | `APPROVAL_CHAIN_CHANGE_IMPACT` | 이름·능력 0. 변경 영향 분석 선례 0 | ABSENT |
| 34 | `APPROVAL_CHAIN_RECONCILIATION` | 이름·능력 0. `ensureTables` 는 **테이블 생성만 하고 데이터 변환·백필 없음** → 소급 정합 수단 자체가 없음 | ABSENT |
| 35 | `APPROVAL_CHAIN_EVIDENCE` | 이름·능력 0. 승인 증적 최근접 = `approvals_json`(`Mapping.php:285` **`["user"=>$actor,"ts"=>…]` 2키**) — 승인시점 권한/역할/플랜 미보존 → as-of 재구성 불가 | ABSENT |
| 36 | `APPROVAL_CHAIN_AUDIT_EVENT` | 승인 도메인 0. 감사 정본 선례 = `SecurityAudit`(`backend/src/SecurityAudit.php:27` tenant 포함 해시 · `:45-52` DDL `prev_hash`/`hash_chain` · `verify():56-68` `hash_equals`). 🔴 `menu_audit_log.hash_chain` 은 **검증 불가 장식**(인용 금지) | ABSENT |

**원문 §6 단서 조항(불릿 아님 · 분모 외 · 계약으로 전사)**
- 줄 591: *"Rebate 전용으로 기존 Workflow Chain을 복제하지 마라."*
- 줄 593: *"기존 Workflow Definition이 범용 DAG를 제공한다면 Approval Chain은 해당 Workflow Graph를 참조하거나 Approval 전용 Semantic Layer로 구현하라."* → **전건 거짓 확정**(§3 참조).

---

### §7. Approval Chain Registry (원문 줄 597-642 · 분모 34)

`APPROVAL_CHAIN_REGISTRY` — **필수 필드 (22)**

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | approval_chain_registry_id | 테이블 부재. `approval_chain*` grep `backend/src` 전수 0 | ABSENT |
| 2 | tenant_id | Registry 테이블 부재. 참고: **Tenant 마스터 테이블 자체가 없다**(`api_key.tenant_id` = FK 없는 VARCHAR `Db.php:944` · 열거 = `SELECT DISTINCT` 19개소 역추론) | ABSENT |
| 3 | registry_code | grep 0 | ABSENT |
| 4 | registry_name | grep 0 | ABSENT |
| 5 | registry_type | grep 0. 하위 Registry Type 열거 12종 전량 부재 | ABSENT |
| 6 | approval_domain | grep 0. 승인 4경로가 각자 다른 도메인에 하드와이어(mapping/catalog/alerting/admin_growth)이나 도메인 축 선언 0 | ABSENT |
| 7 | authoritative_source | grep 0. `source_priority` 오염 = DataPlatform Trust 우선순위(`DataPlatform.php:65`) | ABSENT |
| 8 | supported chain types | grep 0. Chain Type 열거 부재(§8) → 지원 목록 선언 불가 | ABSENT |
| 9 | template support | grep 0. Template 엔터티 부재(§6 #4) | ABSENT |
| 10 | hierarchy route support | grep 0. **다단 상향 순회 사람 축 선례 0** — DB 기반 상향순회 유일 = `AdminMenu::wouldCycle:540-555`(`menu_tree` · `$visited` 없음 · tenant_id 없음) | ABSENT |
| 11 | conditional route support | grep 0. 조건 분기 선례는 마케팅 도메인 한정(`JourneyBuilder::evalCondition:818`) | ABSENT |
| 12 | branch support | grep 0 | ABSENT |
| 13 | parallel reference support | grep 0. 병렬 승인 선례 레포 전수 0(4경로 전량 단일 결정) | ABSENT |
| 14 | effective dating support | grep 0. `valid_from`/`valid_to` 전수 0 · `effective_from` 은 `kr_fee_rule` 한정이며 **as-of 질의 0**(최신승만) | ABSENT |
| 15 | historical support | grep 0. 🔴 이력 소멸 반례 실재 = `agency_client_link` `:304`,`:381` 이 `revoked_at=NULL` 로 이전 해지시각 **물리 소거** | ABSENT |
| 16 | synchronization mode | grep 0. 동기화 모드 축 선례 0 | ABSENT |
| 17 | owner | grep 0. `owner` 개념은 `parent_user_id IS NULL` 술어(`PlanLimits:37`·`UserAuth:41`)로만 존재 — Registry 소유자 아님 | ABSENT |
| 18 | active version reference | grep 0. optimistic lock `version` 전수 0 | ABSENT |
| 19 | valid_from | grep 전수 0 | ABSENT |
| 20 | valid_to | grep 전수 0(`Onsite.php:396` = `invalid_token` 오염) | ABSENT |
| 21 | status | Registry 테이블 부재. 참고: `SET status *=` 128건/42파일이나 **합법 전이 집합 선언 0** | ABSENT |
| 22 | evidence | grep 0 | ABSENT |

**Registry Type (12)**

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 23 | PLATFORM | 열거 자체가 부재 → 값 부재. (규칙 8: "열거에 없다"는 열거 실재 시에만 유효) | ABSENT |
| 24 | TENANT | 열거 부재 | ABSENT |
| 25 | REBATE | 열거 부재. 리베이트 승인 도메인 코드 0 | ABSENT |
| 26 | FINANCE | 열거 부재 | ABSENT |
| 27 | LEGAL | 열거 부재. **Legal Entity 는 이름·능력 양쪽 0**(유일 히트 `MarketingDataHub.php:181` = 데모 문자열) | ABSENT |
| 28 | SECURITY | 열거 부재 | ABSENT |
| 29 | COMPLIANCE | 열거 부재 | ABSENT |
| 30 | SALES | 열거 부재. 인접 = `TeamPermissions::seedOrg:711` `'sales_pipeline'=>['view','create','update','approve']` — 🔴 `approve` 판독 코드 0(완전 장식) | ABSENT |
| 31 | PARTNER | 열거 부재 | ABSENT |
| 32 | WORKFLOW | 열거 부재. `workflow_*`/`flow_*`/`wf_*` grep 전수 0 | ABSENT |
| 33 | IMPORTED | 열거 부재 | ABSENT |
| 34 | CUSTOM | 열거 부재 | ABSENT |

---

### §8. Approval Chain Type (원문 줄 643-687 · 분모 33)

`APPROVAL_CHAIN_TYPE` — **지원 Type (18)**

🔴 전제: 승인 유형 열거(ENUM/CHECK/`in_array`)가 **레포에 실재하지 않는다**. 따라서 아래 18행은 "열거에서 빠졌다"가 아니라 **열거 자체가 없다** — 규칙 8 준수.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | SINGLE_LEVEL | 유형 열거 부재. 능력상 최근접 = `FeedTemplate::approveDraft:271-274` `transition(…,'submitted','approved')` 단일 결정 — 🔴 승인자 신원 검사 0 · 합법 전이 집합 선언 0 → 유형이 아니라 하드코딩 | ABSENT |
| 2 | MULTI_LEVEL | 열거 부재. 다단 승인 능력 0(`Mapping.php:287` 정족수 2 는 **동일 레벨 2인**이지 2단계 아님) | ABSENT |
| 3 | HIERARCHICAL | 열거 부재. 🔴🔴 **계층 승인 구조적 불가** — `parent_user_id` 전 4 생성경로가 owner 로 하드고정(`UserAuth::createTeamMember:1225-1227` 주석 자인 · `EnterpriseAuth::provisionUser:502` · `UserAuth:1549`,`:1576`) → 전 멤버 상급자 = owner 1단 평면 | ABSENT |
| 4 | SEQUENTIAL_REFERENCE | 열거 부재. 순차 참조 능력 0 | ABSENT |
| 5 | PARALLEL_REFERENCE | 열거 부재. 병렬 참조 능력 0 | ABSENT |
| 6 | CONDITIONAL | 열거 부재. 조건 분기는 마케팅 도메인 한정 · 🔴 `evalCondition:848` **미추적 신호→false** = 마케팅에선 안전(발송 안 함)이나 **승인에선 방향이 반대** | ABSENT |
| 7 | HYBRID | 열거 부재 | ABSENT |
| 8 | FUNCTIONAL | 열거 부재 | ABSENT |
| 9 | FINANCIAL | 열거 부재. 금액 축 유일 실재 = `Catalog.php:1016` 상수 1개 · 🔴 `required_approvals` 는 **금액 무관 고정 `2`**(`Mapping.php:210` 리터럴 · `Db.php:634` DEFAULT 2) | ABSENT |
| 10 | LEGAL | 열거 부재. Legal Entity 축 0 | ABSENT |
| 11 | COMPLIANCE | 열거 부재 | ABSENT |
| 12 | SECURITY | 열거 부재 | ABSENT |
| 13 | EXECUTIVE_REFERENCE | 열거 부재. 임원 축 0 | ABSENT |
| 14 | MATRIX_REFERENCE | 열거 부재. 🔴 권한 축 자체가 2벌 분열(`$roleRank` `backend/public/index.php:554` ↔ `team_role` owner>manager>member) · **매핑 코드 전수 0** | ABSENT |
| 15 | COMMITTEE_REFERENCE | 열거 부재. 위원회 축 0 | ABSENT |
| 16 | CROSS_ENTITY_REFERENCE | 열거 부재. Legal Entity·Organization 축 0(§3.1 REAL 0) | ABSENT |
| 17 | EXCEPTION_REFERENCE | 열거 부재 | ABSENT |
| 18 | CUSTOM | 열거 부재 | ABSENT |

**필수 필드 (15)**

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 19 | approval_chain_type_id | 테이블 부재. `chain_type` grep 0(`chain_id` 오염 = 챗봇 안내 문자열 `GeniegoKnowledge.php:430`) | ABSENT |
| 20 | type_code | grep 0 | ABSENT |
| 21 | type_name | grep 0 | ABSENT |
| 22 | category | Type 테이블 부재 | ABSENT |
| 23 | hierarchy_based 여부 | grep 0 | ABSENT |
| 24 | multiple_stage_allowed 여부 | grep 0. Stage 엔터티 부재(§6 #7) | ABSENT |
| 25 | multiple_level_allowed 여부 | grep 0. Level 엔터티 부재(§6 #9) | ABSENT |
| 26 | branching_allowed 여부 | grep 0 | ABSENT |
| 27 | merging_allowed 여부 | grep 0. Merge 능력 0(§6 #18) | ABSENT |
| 28 | parallel_reference_allowed 여부 | grep 0 | ABSENT |
| 29 | override_allowed 여부 | grep 0(`override` 오염 = `Mmm.php:381-382` 스칼라 선행순위) | ABSENT |
| 30 | fallback_allowed 여부 | grep 0. 현행 폴백은 선언 없는 무음 폴백뿐 | ABSENT |
| 31 | authority_reference_required 여부 | grep 0. 🔴 **4경로 전량 "호출자가 곧 승인자"** — `Mapping` = 미들웨어 통과+제안자 아님+미중복이면 누구나 · `Catalog:2343` = `requirePro` 플랜만(행위자 미판독) · `Alerting` = 게이트 없음 | ABSENT |
| 32 | status | Type 테이블 부재 | ABSENT |
| 33 | evidence | grep 0 | ABSENT |

---

### §9. Approval Chain Definition (원문 줄 688-734 · 분모 36)

`APPROVAL_CHAIN_DEFINITION` — **필수 필드 (36)**

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | approval_chain_definition_id | 테이블 부재. `approval_chain_id` grep 0 | ABSENT |
| 2 | approval_chain_registry_id | 상위 Registry 부재(§7) → 종속 부재 | ABSENT |
| 3 | tenant_id | Definition 테이블 부재. 🔴 인접 반례 = `admin_growth_approval` 에 **`tenant_id` 컬럼 없음**(`AdminGrowth.php:142-149`) · 조회 `:1324` `WHERE id=?` tenant 술어 없음 | ABSENT |
| 4 | chain_code | grep 0 | ABSENT |
| 5 | chain_name | grep 0 | ABSENT |
| 6 | chain_type_id | 상위 Type 부재(§8) → 종속 부재 | ABSENT |
| 7 | approval_domain | grep 0 | ABSENT |
| 8 | request_type | 승인 요청 유형 축 0. 🔴 `action_request` 는 **`INSERT` 전수 0**(생산자 없는 빈 테이블 · `Db.php:592-600`) | ABSENT |
| 9 | resource_type | grep 0. 자원 레지스트리는 **메뉴 한정**(`TeamPermissions::MENU_CATALOG:55-82` 26개 + `validMenu:180` 강제) — 리베이트/승인건은 자원이 아님 | ABSENT |
| 10 | transaction_type | grep 0 | ABSENT |
| 11 | rebate_type | grep 0. 리베이트 도메인 코드 전수 0 | ABSENT |
| 12 | chain purpose | grep 0 | ABSENT |
| 13 | chain description | grep 0 | ABSENT |
| 14 | organization scope | 🔴 `ORGANIZATION_*` 11종 **이름·능력 양쪽 0**(§3.1 REAL 0). 인접 = `ORG_PRESET`(`TeamPermissions.php:706-722` PHP 상수 15줄 · `seedOrg:739` INSERT 에 parent·manager 컬럼 없음) · `team`(`:143-151` **`parent_team_id` 없음**) | ABSENT |
| 15 | legal entity scope | Legal Entity 이름·능력 0(유일 히트 `MarketingDataHub.php:181` = 데모 문자열) | ABSENT |
| 16 | workspace scope | 🔴 `workspace` grep 오염 = **13키 화이트리스트 테넌트 KV**(`WorkspaceState.php:25`,`:28-33`) — 워크스페이스 엔터티 아님 | ABSENT |
| 17 | country scope | 🔴 `country_code` grep 오염 = TikTok 리포트 차원(`Connectors.php:2044`,`:2071`) · IP Geo(`Geo.php:106`) — 승인 스코프 축 아님 | ABSENT |
| 18 | region scope | 승인 스코프 0. `region` 실 히트는 광고 커넥터 설정(`amazon_ads region`) | ABSENT |
| 19 | program scope | grep 0 | ABSENT |
| 20 | product scope | 승인 스코프 0. `DATA_SCOPES` 에 `product` 실재하나 `scopeChannelProduct:319-320` 이 SKU 컬럼 매핑 = 데이터 열람 범위이지 승인 스코프 아님 | ABSENT |
| 21 | brand scope | 승인 스코프 0. 🔴 `DATA_SCOPES.brand` 는 **독립 차원 아님** — `scopeChannelProduct:319-320` 이 `product` 와 **둘 다 SKU 컬럼에 매핑**(`:312` 자인 "브랜드=상품집합") | ABSENT |
| 22 | partner scope | grep 0. 인접 = `agency_client_link`(`AgencyPortal.php:20`) — 단위가 **테넌트↔테넌트**이며 승인 위임 불가 | ABSENT |
| 23 | channel scope | 승인 스코프 0. 채널 축은 데이터 열람 범위 한정(`OrderHub:261` `scopeChannelProduct` 래퍼) | ABSENT |
| 24 | environment scope | grep 0. 환경 구분은 배포 계층(운영/데모 별도 빌드)일 뿐 도메인 축 0 | ABSENT |
| 25 | applicability policy reference | 상위 Applicability 부재(§6 #19) → 종속 부재 | ABSENT |
| 26 | selection policy reference | 상위 Selection Policy 부재(§6 #20) → 종속 부재 | ABSENT |
| 27 | authority policy reference | 🔴 **참조할 권한 정본 축이 없다** — `$roleRank`(`backend/public/index.php:554`) ↔ `team_role` 매핑 코드 전수 0 · `$roleRank` 판정 축 = **HTTP 메서드**(`:568`)이지 조직 역할 아님 | ABSENT |
| 28 | actor resolution policy reference | 🔴 **Approval Manager Resolver = ABSENT(능력 확인)** — `resolveApprover`/`next_approver`/`approver_id` 승인 히트 0 · `parent_user_id` 판독 12개소 이상 전량 **1홉이며 목적이 tenant 해석**(`UserAuth::resolveTenantId:207-215` 등) 또는 `IS NULL` owner 판별 | ABSENT |
| 29 | workflow definition reference | 🔴 **참조할 범용 Workflow Definition 이 없다**(§3 부재증명). `journeys` MEDIUMTEXT(`JourneyBuilder.php:36`)는 **무검증 저장** · `graph_edge`(`Db.php:826-839`)는 acyclicity 검사 없음 → ⓑ §70 Step 2 에서 3후보 전량 탈락 | ABSENT |
| 30 | fallback policy reference | 상위 Fallback 부재(§6 #29) → 종속 부재 | ABSENT |
| 31 | owner | grep 0. Definition 소유자 축 0 | ABSENT |
| 32 | active version | 상위 Version 부재(§6 #3) → 종속 부재. optimistic lock `version` 전수 0 | ABSENT |
| 33 | valid_from | grep 전수 0 | ABSENT |
| 34 | valid_to | grep 전수 0 | ABSENT |
| 35 | status | Definition 테이블 부재 | ABSENT |
| 36 | evidence | grep 0 | ABSENT |

**원문 §9 단서 조항(불릿 아님 · 분모 외 · 계약으로 전사)**
- 줄 731: *"Chain Definition에는 현재 Manager Subject ID나 현재 Approver Subject ID를 저장하지 마라."*
  🔴 **규칙 7 주의** — 현행이 이 금지를 "위반하지 않는" 것은 **Chain Definition 자체가 없어서**이지 준수해서가 아니다. 준수로 계산 금지.

---

## 2. 설계 계약

후속 구현이 지켜야 할 계약. **코드가 아니라 계약이다.**

### C-1. Registry / Type / Definition 3계층 분리 계약

원문은 세 엔터티를 별개로 요구한다. 현행 4경로는 **셋을 구분하지 않고 코드 한 곳에 융합**했다(경로가 곧 정의이자 유형이자 레지스트리). 후속 구현은 다음 책임 경계를 지킨다.

| 계층 | 책임 | 책임 아님 |
|---|---|---|
| `APPROVAL_CHAIN_REGISTRY` | 어떤 Chain 집합이 **어느 권위 아래 존재하는가**(authoritative_source · supported chain types · 지원 능력 플래그 8종 · active version reference) | 개별 Chain 의 내용 |
| `APPROVAL_CHAIN_TYPE` | Chain 이 **무엇을 할 수 있는가**의 능력 선언(hierarchy_based · branching/merging/parallel/override/fallback allowed · authority_reference_required) | 특정 테넌트·도메인 값 |
| `APPROVAL_CHAIN_DEFINITION` | **어떤 상황에 어떤 Chain 이 적용되는가**(scope 11종 · policy reference 6종 · request/resource/transaction/rebate type) | 현재 승인자가 누구인가 |

### C-2. Type 은 능력 선언이지 분기문이 아니다

§8 필수필드 11개가 `*_allowed 여부` 이다. 이는 **Type 이 Definition·Route 의 검증 술어를 공급한다**는 뜻이다.
- Definition 이 branch 를 선언했는데 그 Type 의 `branching_allowed=false` → **Validation 단계에서 거부**(런타임 무음 폴백 금지).
- `authority_reference_required=true` 인 Type 은 authority policy reference 없는 Definition 을 **활성화할 수 없다**.
- 🔴 현행 `Catalog::approveQueue:2343` 의 `requirePro`(플랜만 확인 · 행위자 미판독) 패턴을 `authority_reference_required` 의 구현으로 재사용 금지 — 플랜은 권위가 아니다.

### C-3. Definition 은 사람을 저장하지 않는다 (원문 줄 731)

Definition 은 **정책 참조(actor resolution policy reference)만** 보유한다. 현재 Manager/Approver Subject ID 저장 금지.
- 🔴 이 계약은 현행 `parent_user_id` 재사용 유혹을 원천 차단한다 — ⓑ 실측상 `parent_user_id` 는 **전 4 생성경로가 owner 로 하드고정**(`UserAuth::createTeamMember:1225-1227` · `EnterpriseAuth::provisionUser:502` · `UserAuth:1549`,`:1576`)이라 상급자를 표현할 수 없다. Definition 에 사람을 넣는 순간 이 결함이 Chain 도메인으로 이식된다.
- Resolver 는 **호출 시점에 정책으로 해석**하고, 그 결과는 Definition 이 아니라 Resolution Result·Evidence 에 기록한다.

### C-4. 신설 금지 · 확장 대상 3건 (위반 시 §63 중복)

표에서 `MIGRATION_REQUIRED` 로 판정한 3건은 **신규 구현 금지**다.

| 대상 엔터티 | 확장할 기존 자산 | 이식 금지 결함 |
|---|---|---|
| `APPROVAL_CHAIN_VALIDATION` (§6 #25) | `PM/Dependencies.php:79-100` 반복 DFS(+`$visited`+tenant 필터 `:91` 매 홉+쓰기 전 차단 `:32-34`) · `PM/Gantt.php:104-122` Kahn 위상정렬 — **알고리즘 추출·재사용** | 🔴 **스키마 복제 금지**(`:90-91` `dep_type` 술어 부재 결함 동반 이식 위험) · 🔴 `:32-34` 422 조기반환이 `:48` `auditLog` **미도달** → **순환 탐지 시 감사 이벤트 없음**. §58/§61 에서 이 결함 복제 금지 |
| `APPROVAL_ROUTE_CONDITION` (§6 #16) | `RuleEngine.php:24`(화이트리스트 `OPS:33` · `compare:433-439` · `eval` 미사용) — Part 2 Canonical DSL ADR(`docs/architecture/ADR_CANONICAL_SEGMENT_DSL*`)의 **확장** | 🔴 `JourneyBuilder::evalCondition:848` `if ($a===null) return false`(미추적 신호→false)를 그대로 이식 금지 — **마케팅에선 안전(발송 안 함)이나 승인에선 방향이 반대**(승인 통과로 기울 수 있음). §25 fail-closed 방향을 명시적으로 재결정할 것 |
| `APPROVAL_CHAIN_APPLICABILITY` (§6 #19) | `Catalog.php:1016` `HIGH_VALUE_KRW = 5000000.0` + `:1103-1105` → **Amount Band 로 승격하고 상수 은퇴** | 🔴 **신규 임계 상수 추가 금지**. 아울러 `required_approvals` 를 `Mapping.php:210` 리터럴 `2`·`Db.php:634` `DEFAULT 2` 로 방치하지 말 것 — **금액 무관 고정은 요건 모델이 아니라 상수** |

### C-5. 복제 절대 금지 패턴 (현행에 살아 있는 결함)

Chain 도메인이 기존 코드를 참조할 때 **아래를 함께 가져오면 안 된다.**

1. **무라벨 위치 폴백** — `JourneyBuilder::nextNode:811-812`. 286차 실 장애(주석 `:801-803`: *"조건 불충족 고객을 엉뚱한 분기로 오발송"*). §22 `BLOCK_ON_NO_MATCH` 는 `:809` 라벨 있는 그래프에만 적용되는 **조건부 확립**일 뿐이다.
2. **첫 일치 즉시 return** — `nextNode:799`. 다중 일치 무탐지·무기록(§72-11 위반). `APPROVAL_CHAIN_CONFLICT` 는 **탐지·기록**이 존재 이유다.
3. **무음 강등 폴백** — `TeamPermissions:342` `in_array($stype, self::DATA_SCOPES)` → `'own'`. 422 fail-closed 로 대체.
4. **ids 미지정 시 일괄 승인** — `Catalog::approveQueue:2350`(기본 동작이 테넌트 전체 `pending_approval` 전량 승인).
5. **정책 게이트 우회** — `approvalCreate:2259` 가 `evaluatePolicy` 를 호출조차 않고 클라이언트 `type` 을 그대로 받는다. Applicability 판정은 **서버가 산출하고 영속**해야 한다(`logJob:2247` 이 `approval_type` 을 저장하지 않는 것도 동일 결함).
6. **이력 물리 소거** — `AgencyPortal:304`,`:381` `revoked_at=NULL` 덮어쓰기. Chain 의 valid_from/valid_to·Snapshot 은 **append-only**.
7. **검증 불가 해시 장식** — `menu_audit_log.hash_chain`(preimage `AdminMenu.php:195` `'ts'=>date('c')` vs 저장 `created_at DEFAULT CURRENT_TIMESTAMP` `:129` → 재구성 불가 · `hash_equals` grep 0). **감사 정본 선례 = `SecurityAudit`**(`:27` tenant 포함 해시 · `:45-52` DDL · `verify():56-68`).

### C-6. Evidence·Audit Event 는 as-of 재구성이 가능해야 한다

§6 #35·#36 계약. 현행 `approvals_json`(`Mapping.php:285`)은 **`["user"=>$actor,"ts"=>…]` 2키**로 승인시점 권한/역할/플랜을 보존하지 않아 as-of 질의가 불가능하다(`Alerting:591` 3키 · `AdminGrowth` 2컬럼 — 셋 다 형태 상이).
- `APPROVAL_CHAIN_EVIDENCE` 는 승인 시점의 **행위자 권한 스냅샷**을 포함한다.
- `APPROVAL_CHAIN_AUDIT_EVENT` 는 `SecurityAudit` 패턴(tenant 포함 해시 체인 + 검증기)을 따른다.
- 🔴 자기승인 차단·승인자 dedup 은 4경로 중 `Mapping`(`:268-271`,`:278-283`) 1곳뿐이다. Chain 은 **Definition/Type 계층에서 선언적으로** 강제한다(경로별 애드혹 금지).

### C-7. 테넌트 술어는 매 홉 강제

`APPROVAL_ROUTE_*` 순회는 `PM/Dependencies.php:91` 패턴(**매 홉 tenant 필터**)을 따른다.
- 반례 2건 복제 금지: `AdminMenu::wouldCycle:540-555`(tenant_id 없음 `:107-118` · `$visited` 없음) · `admin_growth_approval`(tenant_id 컬럼 자체 없음).

---

## 3. 미결·선행조건

### ★3-1. §6 조건절 부재증명 — **왜 신규 Canonical SoT 를 만드는가**

> 원문 §6 줄 593: *"기존 Workflow Definition이 범용 DAG를 제공한다면 Approval Chain은 해당 Workflow Graph를 참조하거나 Approval 전용 Semantic Layer로 구현하라."*
> 원문 §72-18: *"Workflow Engine 과 별도 Route Source of Truth 를 만들지 마라."*

**두 조항 모두 전건이 거짓이다 → 금지가 발동하지 않는다 → `APPROVAL_ROUTE_*` 신규 SoT 구축이 정합이다.**
289차 ⓑ §70 Step 2 에서 후보 3종을 전수 검증했고 **셋 다 탈락**했다. 이 부재증명을 여기 명시하는 이유는 **후속 차수가 "왜 새로 만들었나"를 재심문하지 않도록** 하기 위함이다. 재심문 전 아래 표를 먼저 읽으라.

| 후보 | 탈락 사유(결정적) |
|---|---|
| `JourneyBuilder` (`journeys.nodes/edges`) | ❶ **정의 계층 공백** — `createJourney:135`/`updateJourney:153-154` 가 `nodes`/`edges` 를 **무검증 `json_encode`** · `:512` 주석이 acyclicity 미검증 자인 → §39 DAG 검증이 걸릴 자리 자체가 없다 ❷ **엣지에 id 가 없다**(`from`+`when` 매칭 `:789`,`:796`) → §22 Route Edge 참조 불가 ❸ **`customer_id` 하드 전제**(`:551`,`:556`,`:822`) → 승인건은 고객이 아니다 ❹ version·effective dating **0** |
| `graph_node`/`graph_edge` (`Db.php:816-839`) | ❶ **DAG 가 아니라 그래프 스토어** — `upsertEdge:107-148` 에 **acyclicity 검사 없음** ❷ **순회기 0** — `GraphScore:193~297` 은 `influencer→creative→sku→order` **하드코딩 3-hop** ❸ 판독자 4종 하드와이어 ❹ 내부 생산자 0 → VACUOUS 미배제 ❺ `upsertNode:57-59` 화이트리스트가 `upsertEdge` 엔 없어 `:126-133` 이 임의 타입을 자동 삽입(게이트 우회) |
| `pm_task_dependencies` | ❶ **DAG "검증기"이지 "엔진"이 아니다** — 노드타입 0 · 조건 0 · 실행기 0 ❷ 도메인이 PM(`dep_type ENUM('FS','SS','FF','SF')` = 일정 의존) ❸ `:90-91` `dep_type` 술어 부재 |

**단, 재사용 의무는 남는다**(C-4). "SoT 를 새로 만든다" ≠ "알고리즘을 새로 짠다". §39 DAG 검증은 `PM/Dependencies`·`PM/Gantt` 에서 **추출**하고, §25 조건은 `RuleEngine` 을 **확장**하며, 금액 임계는 `Catalog::HIGH_VALUE_KRW` 를 **승격**한다.

### 3-2. 선행조건 (BLOCKED_PREREQUISITE 사유 — Chain 도메인 밖에서 먼저 풀려야 함)

이 4개 섹션의 139항목이 전부 미달인 것은 Chain 도메인의 게으름이 아니라 **하위 기반이 없어서**다. 아래가 풀리지 않으면 Registry/Type/Definition 은 계약만 있고 값이 없는 껍데기가 된다.

| # | 선행조건 | 근거(ⓑ 실측) | 영향받는 원문 항목 |
|---|---|---|---|
| P-1 | **계층(Hierarchy) 축 신설** — `parent_user_id` 는 재사용 불가, **쓰기 경로부터 변경 필요** | 전 4 생성경로가 owner 하드고정(`UserAuth:1225-1227` 주석 자인 · `EnterpriseAuth:502` · `UserAuth:1549`,`:1576`) · sub 는 계정생성 차단(`:1254-1256`) → 재해석해도 **owner 1단 평면** | §7 `hierarchy route support` · §8 `HIERARCHICAL`·`hierarchy_based` · §9 `organization scope`·`actor resolution policy reference` |
| P-2 | **권한 정본 축 단일화** — `$roleRank` ↔ `team_role` 매핑 결정 | `backend/public/index.php:554`(viewer<connector<analyst<admin · 판정 축 = **HTTP 메서드** `:568`) ↔ `team_role`(owner>manager>member) · **매핑 코드 전수 0**(50+ 히트 · 역방향도 0) → "이 행위자가 이 단계를 승인할 권한이 있는가"를 물을 축이 없다 | §8 `authority_reference_required`·`MATRIX_REFERENCE` · §9 `authority policy reference` |
| P-3 | **Legal Entity / Organization 엔터티 신설** | `ORGANIZATION_*` 11종 **이름·능력 양쪽 0** · Legal Entity 유일 히트 = 데모 문자열(`MarketingDataHub.php:181`) · **Tenant 마스터 테이블도 없다**(`api_key.tenant_id` = FK 없는 VARCHAR `Db.php:944` · 열거 = `SELECT DISTINCT` 19개소 역추론) | §7 `LEGAL`·`TENANT` · §9 `legal entity scope`·`organization scope`·`tenant_id` |
| P-4 | **Effective Dating 저장·질의 계층 신설** | `valid_from`/`valid_to` grep **전수 0** · `effective_from` 은 `kr_fee_rule`(`Db.php:898`) 한정이며 **`WHERE effective_from <= :as_of` 전역 0**(읽기 4개소 전부 최신승 — `Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`) → **as-of 질의 선례 0** | §6 `APPROVAL_CHAIN_EFFECTIVE_PERIOD` · §7 `effective dating support`·`historical support`·`valid_from`·`valid_to` · §9 `valid_from`·`valid_to` |
| P-5 | **마이그레이션 경로 부재 해소** | `backend/migrations/` **21파일 · `20260527_172_002` 정지** · approval/chain/route/workflow 마이그레이션 0 → `ensureTables` 멱등에 의존. ★**`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다** → §48 Retroactive 집행 수단 자체가 없음 | §6 `APPROVAL_CHAIN_RECONCILIATION`·`APPROVAL_CHAIN_CHANGE_IMPACT` |
| P-6 | **`data_scope` 개인(member) 범위 사망 선결** | `effectiveScope:253` 이 **`'user'`** 로 조회하나 **`'user'` 로 쓰는 코드 전수 0**(쓰기 = `'member'` `:653` · `'team'` `:584`,`:743`) → 영구 0행 → `:254` team 폴백 → 팀 미배정이면 `:256` **`return null`(무제한)**. `getMemberPermissions:609` 가 `'member'` 로 읽어 되돌려주므로 **화면상 정상(가짜 녹색)**. ⚠️ 팀 범위는 정상 — **개인 단위만 죽음** · 정적 실측 · P0 미부여 · **별도 승인세션 대상** | §9 `organization scope` 계열이 개인 단위로 좁혀질 때 |

### 3-3. 원문 대비 발견 (원문이 전제하나 레포에 없는 것 / 원문 자체의 긴장)

1. **§9 `workflow definition reference` 는 §6 조건절과 충돌한다.** §6 은 범용 DAG 가 *있다면* 참조하라고 조건부로 말하는데, §9 는 이 참조 필드를 **무조건 필수**로 올린다. ⓑ 확정상 **참조할 범용 Workflow Definition 이 존재하지 않는다** → 이 필드는 신규 SoT(`APPROVAL_ROUTE_DEFINITION`) 를 가리키게 되며, 그 경우 **자기 도메인 내 참조**가 되어 필드의 원래 의도(외부 Workflow Engine 참조)와 달라진다. 후속 설계에서 **필드 의미를 명시적으로 재정의**해야 한다(현 단계 미결).
2. **§7 `synchronization mode` 의 동기화 상대가 원문에 명시되지 않는다.** 외부 Workflow Engine 과의 동기화를 전제하는 것으로 읽히나, 그 엔진이 부재하므로 이 필드는 현 시점 **의미가 정해지지 않았다**. 값 열거도 원문에 없다(Registry Type 만 열거됨).
3. **§7 Registry Type 12종에 `REBATE` 가 있으나 §6 줄 591 은 "Rebate 전용으로 기존 Workflow Chain 을 복제하지 마라"고 금지한다.** 둘은 모순이 아니다 — `REBATE` 는 **Registry 의 분류값**이지 별도 Chain 엔진이 아니다. 후속 차수가 `REBATE` Registry Type 을 근거로 리베이트 전용 Chain 스택을 세우면 §6 위반이다. 명시해 둔다.
4. **§9 `brand scope` 는 현행 데이터 모델에서 독립 차원이 아니다.** `scopeChannelProduct:319-320` 이 `brand`·`product` **둘 다 SKU 컬럼에 매핑**(`:312` 자인 "브랜드=상품집합"). 승인 스코프로 `brand` 를 세우려면 **브랜드 차원 자체를 먼저 신설**해야 한다(P-3 인접).
5. **원문 §6 전문의 "기존 동등 Entity가 없을 경우"라는 조건이 36항목 전부에 대해 참이다.** 즉 §6 은 조건부 요구지만 실측상 **무조건 요구로 붕괴**한다.

### 3-4. 규칙 7 적용 고지 — "위반하지 않음"을 준수로 계산하지 않았다

원문 §9 줄 731(*"Chain Definition에 현재 Manager/Approver Subject ID를 저장하지 마라"*)을 현행이 위반하지 않는 것은 **Chain Definition 자체가 없기 때문**이다. 대상 부재를 준수로 계산하지 않았고, 어떤 행도 이를 근거로 cover 판정하지 않았다.
동일 원리로 §6 줄 591(Workflow Chain 복제 금지) 역시 **복제할 Workflow Chain 이 없어서** 위반이 성립하지 않는다.

### 3-5. 분모·행수 대조

| § | 제목 | 원문 줄 | 분모 | 표 행 수 | 일치 |
|---|---|---|---|---|---|
| 6 | Canonical Entity | 550-596 | 36 | 36 | ✅ |
| 7 | Approval Chain Registry | 597-642 | 34 (필드 22 + Registry Type 12) | 34 | ✅ |
| 8 | Approval Chain Type | 643-687 | 33 (Type 18 + 필드 15) | 33 | ✅ |
| 9 | Approval Chain Definition | 688-734 | 36 | 36 | ✅ |
| | **합계** | | **139** | **139** | ✅ |

`node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_3_VERBATIM.md --sec={6,7,8,9}` 로 재확인 — 36 / 34 / 33 / 36 전부 일치. 분모 조정 없음.

§6 줄 591·593 과 §9 줄 731 은 **불릿이 아니어서 분모에 포함되지 않는다**(측정기 값과 일치). 표 밖에 "단서 조항"으로 전사했고 §2 계약(C-3 · 3-1)에 반영했다. **§23·§43 특례(행 수가 분모를 초과하는 경우)는 이 4개 섹션에 해당하지 않는다.**

### 3-6. 자진 신고 (약한 앵커 · 추정 · 미확인)

- **cover 0.** 139항목 중 `VALIDATED_LEGACY`(유일 cover) **0건**. 커버리지 0/139 = **0%**. 역산하지 않았다.
- **`MIGRATION_REQUIRED` 3건은 판정 선택이다.** §6 #16·#19·#25 는 상태로만 보면 `ABSENT` 와 동일(승인 도메인 구현 0)이나, **이전해야 할 기존 거동이 실재**하므로 더 많은 정보를 담는 `MIGRATION_REQUIRED` 를 택했다. 둘 다 non-cover 이므로 커버리지에는 영향 없다. 이견 시 `ABSENT` 로 강등해도 수치는 불변.
- **`journeys` DDL 위치 재확인 결과 ⓑ 앵커와 일치**(`JourneyBuilder.php:35-41`). `graph_node`/`graph_edge` = `Db.php:816-839` 일치.
- **★ⓑ 기술의 정밀화 1건** — ⓑ 는 JourneyBuilder 탈락 사유로 "엣지에 id 없음"을 들었다. 이는 **`journeys.edges` JSON 에 한해 정확**하며, `graph_edge` 는 `id INT AUTO_INCREMENT PRIMARY KEY`(`Db.php:827`)를 **가진다**. `graph_edge` 의 탈락 사유는 id 부재가 아니라 acyclicity·순회기·생산자 부재이므로 ⓑ 결론은 유지된다. 후속 차수가 "graph_edge 엔 id 가 있으니 ⓑ 가 틀렸다"고 오독하지 않도록 명기한다. **정정 아님 · 범위 명확화.**
- **`KrChannel.php:102` 추가 확인** — ⓑ 는 `effective_from` 읽기 4개소로 `Pnl:454`·`KrChannel:151`,`:459` 를 들었다. 실측 결과 `:102`(`ORDER BY category,effective_from DESC`)도 읽기 경로이며, 이 역시 **최신승**이라 "as-of 질의 0" 결론은 불변. 총 읽기 4개소(`Pnl:454`·`KrChannel:102`,`:151`,`:459`)로 수를 맞춘다.
- **직접 재검증한 앵커**: `Catalog.php:1016`,`:1103-1105` · `RuleEngine.php:24`,`:33`,`:43` · `Mapping.php:209-210`,`:287` · `SecurityAudit.php:27`,`:45-52` · `Db.php:592-600`(action_request — `required_approvals` 컬럼 **없음** 확인) · `Db.php:816-839` · `JourneyBuilder.php:35-41` · `FeedTemplate.php:249`,`:258`,`:265-268`,`:271-274` · `approval_chain*`/`registry_*`/`authoritative_source` grep 0 · `valid_from`/`valid_to` grep 0. **모두 ⓑ 와 일치.**
- **미재검증(ⓑ 전재)**: `TeamPermissions` 계열 줄번호(`:39`,`:55-82`,`:180`,`:342`,`:706-722`,`:711`,`:739`) · `PM/Dependencies.php:79-100`,`:32-34`,`:90-91` · `PM/Gantt.php:104-122` · `JourneyBuilder::nextNode:799`,`:809`,`:811-812` · `AgencyPortal:304`,`:381` · `AdminMenu:540-555`,`:195`,`:129` · `backend/public/index.php:554`,`:568`. 이 4개 섹션은 **전량 부재 판정**이라 이 앵커들은 판정을 좌우하지 않고 **맥락 주석으로만 쓰였다**. 판정 근거는 "해당 이름·능력의 grep 0"이며 그것은 직접 실증했다.
- **`APPROVAL_CHAIN_*` 이름 grep 은 `backend/src` 범위에서 수행**했다. `frontend/src`·`backend/migrations` 는 이 문서 범위에서 별도 실증하지 않았으나, ⓑ §3.5 가 `backend/migrations` 21파일 전수(approval/chain/route/workflow 0)를 실측했다.
