# SPEC 원문 선영속 — EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-3-4

> **이 파일은 사용자 제공 원문의 무수정 보존본이다.** 요약·재구성·판단 금지. 아래 §0 부터가 원문이다.
>
> ## 선영속 이유 (5-3-1 교훈)
> 스펙은 **순서 무관·소실 방지**를 위해 **받는 즉시 먼저 영속**한다. 세션이 끊기면 원문은 사용자만 보유하며 복구 불가다.
>
> ## 착수 전 필독 (289차 10회차 기록)
>
> ### ★★§79 가 **다시 per-entity 로 돌아갔다** — 앞 블록 패턴을 관성으로 적용하지 마라
> - **5-3-3-3 §71** = *"Entity·Enum별 문서를 무조건 각각 생성하지 마라"* + `docs/approval/` **16편 통합**
> - **5-3-3-4 §79** = `docs/segmentation/DSAR_*` **88편**(+ADR 1 + PM 3) = **per-entity 복귀**
> - → **블록마다 산출 형태가 다르다.** 5-3-3-3 방식(통합 16편)을 그대로 쓰면 **§79 위반**이고, 5-3-3-3 에 per-entity 를 썼다면 **§71 위반**이었다. **매 블록 §산출문서 조항을 원문에서 직접 읽어라.**
> - 실측(10회차 종료 시점): `docs/segmentation/` **583편** · `DSAR_APPROVAL_AUTHORITY_*` **0편** · `*AUTHORITY*` **0편** → §79 88편 중 **실재 0**.
>
> ### ★분모는 반드시 측정기로 재라 (PM 육안 계수가 10회차에만 4번 틀렸다)
> ```
> node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=N
> ```
> **불릿 + 번호목록만 센다.** 🔴**불릿 0 인 섹션에도 요구가 실재할 수 있다**(산문 명령형·코드블록) — 5-3-3-3 의 §23(3행)·§43(8단계+2) 특례가 그 사례다. **반대로 이미 다른 섹션 분모에 있는 항목을 또 세면 이중계상**이다(§64 코드블록 9엔티티 사례). **둘을 구별하라.**
>
> ### ★§3.1 선행조건의 정직한 상태 — **참조 대상이 계약뿐이다**
> §3.1 이 요구하는 `APPROVAL_CHAIN_DEFINITION`·`_VERSION`·`_STAGE`·`_LEVEL`·`_RESOLUTION`·`_SNAPSHOT` 등은 **289차 10회차가 `docs/approval/` 16편으로 전사한 계약 명세**이며 **실 코드·테이블 0건**이다.
> - 5-3-3-3 커버리지 = **0 / 1817 = 0.00%**(측정기: `node tools/measure_06a_coverage.mjs --block=5333`). **네 블록 연속 감소·최초 0.**
> - **문서 존재를 구현 존재로 계산하면 역산이다.** §3.1 대부분은 `CONTRACT_ONLY` 또는 `BLOCKED_PREREQUISITE` 가 정직한 판정이다.
> - §3.2 `Position Registry`·`Employment Record`·§3.3 `Legal Entity Registry`·`Cost Center`·`Profit Center`·`Budget Registry`·`Currency Registry`·`Country/Region Registry` 등은 **10회차까지 이름·능력 양쪽 0 으로 확인된 것이 다수**다. **그러나 재실증하라** — 이번 세션에 PM 예측이 2회(BPMN→`JourneyBuilder` · SSO ABSENT→`EnterpriseAuth` REAL) 뒤집혔다.
>
> ### ★이 블록에서 특히 물어야 할 것 (10회차 실측이 미리 답을 준 축)
> | 원문 요구 | 10회차 실측 |
> |---|---|
> | §3.4 `Existing Hardcoded Amount Condition` | ★**실재**: `Catalog.php:1016` `HIGH_VALUE_KRW = 5000000.0` + `:1103-1105` `$price >= HIGH_VALUE_KRW` → `requires_approval=true`·`approval_type='high_value'`. **금액이 승인 필요 여부를 결정한다**(`amount_threshold` grep 0 임에도). 🔴**단 Route 는 없다** — `approval_type` 이 승인자·경로를 하나도 선택하지 않고(`approvalCreate:2280` 문자열 계산에만 쓰고 소멸) `approveQueue:2341-2360` 이 그것으로 필터하지 않아 **`high_value` 와 `unregister` 가 동일 경로·동일 권한으로 승인**된다. **PHP 상수**라 테넌트별 설정·버전·effective dating 전무 → **§24 Amount Band 로 승격하고 상수 은퇴. 신규 임계 상수 추가 금지.** |
> | §4.1 *"Manager 라고 자동 Authority 부여 금지"* | ★**현행은 Manager Resolver 자체가 ABSENT** — `parent_user_id` 판독자 12+ 는 **전량 1홉·목적이 tenant 해석**(`UserAuth::resolveTenantId:207-215` 등) 또는 `IS NULL` owner 판별. **상급자(사람)를 반환하는 함수 0.** 🔴**전 4 생성경로가 parent 를 owner 로 하드고정**(`createTeamMember:1225-1227` — manager 가 만든 멤버의 parent 를 **manager 자신이 아니라 manager 의 parent** 로 올린다 · `EnterpriseAuth::provisionUser:502` · `createSubAdmin` `UserAuth:1549`,`:1576` · sub 계정생성 차단 `:1254-1256`) → **재해석 불가·쓰기 경로부터 변경 필요.** 🔴**`parent_user_id` 재사용 금지** — 의미를 바꾸면 **테넌트 해석이 전역 붕괴**한다. |
> | §4.2 *"Role 이름으로 Authority 추론 금지"* | ★**권한 축이 2벌로 분열**: `$roleRank`(`backend/public/index.php:554` `viewer0<connector1<analyst2<admin3`) ↔ `team_role`(owner>manager>member) — **매핑 코드 전수 0(양방향)**. `$roleRank` 는 **판정 축이 HTTP 메서드**(`:568`)이고 `connector` 의 유일 의미가 ingest 쓰기(`:571-574`) → **기계 신원 API 등급**이지 조직 역할이 아니다. **"이 행위자가 이 단계를 승인할 권한이 있는가"를 물을 정본 축이 레포에 없다** → §45/§46 은 **`BLOCKED_PREREQUISITE`**. 🔴**`acl_permission.approve` 를 그 축으로 쓰지 마라 — 완전한 장식**: `ACTIONS:39` 에 실재하고 **`seedOrg` 5개소(`:708`,`:711`,`:714`,`:716`,`:717`)가 실제 시드**하지만 **`approve` 를 읽어 승인 가부를 판정하는 코드 0**(`actionsCover:194` 유일 호출처 `:639` 는 **위임 상한 검증**). |
> | §26/§27 Currency·FX | 🔴**환율은 저장 계층부터 부재** — `fxToKrw`(`Connectors.php:1749`)는 `app_setting` **KV 단일행 덮어쓰기**(`:1804-1805`) → **이력 자체가 없다** → §27 의 `rate date`·`stale rate 여부`·`USE_PREVIOUS_BUSINESS_DAY` 는 **구현 불가**(선행 신설 필요). 대조: **세율** `kr_fee_rule.effective_from`(`Db.php:898`)은 **컬럼 有·질의 無** — `WHERE effective_from <= :as_of` **전역 0** · 읽기 4개소 전부 최신승(`Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`) → **질의 계층만 고치면 됨**. ★**부재의 깊이가 다르다 — 균질화하지 마라.** |
> | §57 Effective Dating | `effective_to`/`valid_to`/`valid_from` **grep 0** · optimistic lock `version` **grep 0** · 엔티티 `version` **최소 6컬럼이나 전부 하드코딩 태그**(`menu_defaults.version` = 리터럴 `'baseline'` `AdminMenu.php:309` · `ml_models.version` · `risk_model_registry.model_version` · `risk_prediction.model_version` `Db.php:463` · `normalizer_version` `Db.php:1088` · `agent_version` `WmsCctv.php:160`) → **"버전 관리된 엔티티" 선례 0.** ★오탐: `valid_to` 유일 히트 = `Onsite.php:396` **`in`valid_to`ken`**. |
> | §59 Retroactive Correction | 🔴**집행 수단이 없다** — `backend/migrations/` **21파일·`20260527_172_002` 정지** · ★**`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다** · **`Migrate` 이름 겹침 주의**(DDL 적용기이지 도메인 이행기 아님). 🔴**§59 정면 반례 실재**: `AgencyPortal.php:304`·`:381` 이 **`revoked_at=NULL` 로 이전 해지 시각 소거** → **as-of 재구성 불가**. **복제 금지.** |
> | §55/§56 Snapshot · immutable_hash | ★**정본 = `backend/src/SecurityAudit.php`**(`:27` **tenant 포함 해시** · `:29-31` **`prev_hash`·`created_at` 명시 저장** · **`verify():56-68`** `:63` 재계산 + `:64` `hash_equals`+prev 교차검증). 🔴**`menu_audit_log.hash_chain` 인용 금지** — 아래 §확정사실. ★**`captured_at` 은 DB 컬럼이 아니라 JSON 키**(`PM/Enterprise.php:360`). ★오탐: `snapshot` 최다 히트 = **CCTV JPEG**(`routes.php:271`). |
> | §55 `Actor Authorization Snapshot` | **ABSENT** — `Mapping:285` `approvals_json` = **`{user, ts}` 정확히 2키** · `Alerting:591` = `{actor,decision,ts}` 3키 · `AdminGrowth` = `decided_by`/`decided_at` 2컬럼. **셋 다 승인 시점 권한·역할·플랜 미보존** → **as-of 질의 불가**. |
> | §72 기존 구현 분류 · §73 중복 감사 | **승인 4경로 = "2 REAL + 2 미달"**(★5-3-2 ADR 초판 "1 REAL+3 미달"은 **10회차에 정정**): `mapping_change_request` **REAL**(4중 방어 · **정족수 `Mapping:287` = 레포 유일 실집행**) · `catalog_writeback_job` status=`pending_approval` **REAL**(테이블 `catalog_writeback_approval` 은 **고아**이나 **능력은 살아 있다**) · `action_request` **VACUOUS**(생산자 0) · `admin_growth_approval` **REAL(단일테넌트 전제·`tenant_id` 없음)`**. ★**중복이 아니라 부재** — 스키마 4종이 전부 다르다(`required_approvals` 는 `Mapping` 에만 · `requested_by` 는 `action_request` 에 없음 · `tenant_id` 는 `admin_growth` 에 없음). |
> | §73 *"Existing DOA Matrix"*·*"ERP Authority Table"* | `required_approvals` **유일 생산자 = `Mapping.php:209-210` 리터럴 `2`** + `Db.php:634` `DEFAULT 2`. **UPDATE·설정 API·타 INSERT 전수 0** → **요건 모델이 아니라 상수** · 🔴**금액 무관 고정 — 1만원 매핑과 1억원 예산이 동일 승인 강도**. |
> | §76 Cache | 🔴**서버 캐시 계층 자체가 부재** — Redis/Memcached **0**(★오탐: `redis` 유일 히트 = `Payment.php:817` `totalBefore`**Dis**`c`) · `apcu_*` 는 `SystemMetrics.php:225-455` **지표 보고 전용** · 프론트 `g_admin_menu_tree_cache` localStorage 만. **무효화할 캐시가 없다** — 현행이 §76 을 "위반하지 않는" 것은 **대상이 없어서**다(우연한 준수를 계산 금지). |
> | §77 테스트 | **러너 0**(PHPUnit 스위트 없음·`npm test` 없음). 실재 = `tools/e2e/smoke.mjs`(476줄 · `npm run e2e`/`e2e:render`/`e2e:scenario`) — 🔴`:42` 가 `/api/v423/approvals` **HTTP 상태만** 확인 · **승인 의미론 테스트 0** · ⚠️`:148` 이 **503 을 실패에서 제외**하고 `:139` 백오프 재시도 → **레이트리밋에 회귀 은폐 여지**. **원문에 "러너를 세우라"가 없다 → 별도 계상.** |
> | §74 API | ★**신규 실배선은 `/api` 접두 필수**(nginx SPA HTML 폴백이 **가짜 200 착시**). 라우트 정본 = `backend/src/routes.php`(1636줄) · **핸들러 등록 필수**(자동발견 아님). 공개 EP 는 **`index.php:60-89` 바이패스 + `/api/...` 별칭 양쪽**. 🔴**레이트리밋 fail-open 이며 `api_key` 트래픽만 덮는다**(`index.php:508-551` · 주석 `:509-510`+코드 `:515` 자인 · `:550` fail-open) → **SPA/세션 경로 미도달**. |
> | §66 *"Cross-Tenant Binding 차단"* | 테넌트 격리 강제는 **REAL**(`index.php:600` 무조건 덮어쓰기 · strict fail-closed `:585` — **단 기본 OFF·옵트인**). 🔴**레포에 Tenant 마스터 테이블이 없다** — `api_key.tenant_id` = **FK 없는 VARCHAR(100)**(`Db.php:944`) · 열거 = `SELECT DISTINCT` **19개소 역추론**. 🔴**`tenant_id IS NULL` 을 Platform 센티넬로 쓰지 마라** — `effectiveScope:256`(NULL=무제한)과 같은 사고 패턴 재발. |
>
> ### 🔴 `menu_audit_log.hash_chain` 확정 사실 (10회차 ⓔ · 정의부 재실측 — **이대로 인용하라**)
> | | `menu_audit_log`(`AdminMenu.php`) | `security_audit_log`(`SecurityAudit.php`) |
> |---|---|---|
> | prev | ✅**재구성 가능** — `lastHash():216` 이 **직전 행 `hash_chain`** 을 읽어 `:194` `'prev'` 로 투입. **별도 prev_hash 컬럼 불필요한 정당한 체이닝**(그 부재는 결함이 아니다) | `:25`→`:38`(없으면 `'GENESIS'`) · **`prev_hash` 컬럼에도 저장**(`:29-31`) |
> | **ts** | 🔴**영구 소실** — `:195` `'ts'=>date('c')` 가 preimage 에 들어가나 **`:199-203` INSERT 컬럼 목록에 `created_at` 이 없다** → `:129` **DB DEFAULT** 가 채움 → **형식 차이 이전에 값 자체 소실** | ✅ `:24` `$now=gmdate(…)` 를 **INSERT 에 명시 전달**(`:31`) → `created_at`(`:51` **VARCHAR(32)·DB DEFAULT 아님**) |
> | 검증기 | 🔴**없음**(`hash_equals` 레포 24히트 중 **AdminMenu 0건**) | ✅ **`verify():56-68`** |
> | tenant | 🔴 DDL(`:123-131`)에 **없음** | ✅ `:27` 해시에 포함 |
>
> ★**두 구현을 가르는 것은 오직 "preimage 타임스탬프를 저장하는가".**
> 🔴 **PM 초판의 *"prev_hash 컬럼이 없어 preimage 2요소가 모두 미저장"* 은 틀렸다**(10회차 정정). 판정(**검증 불가능한 장식**)과 정본(**`SecurityAudit`**)은 유지되나 **근거가 다르다**. **"체인이 있다"가 "변조를 탐지할 수 있다"를 보증하지 않는다.**
> ★**교훈**: DDL 만 보고 `lastHash()` 정의부를 읽지 않은 채 결론으로 건너뛴 것 = **구조에서 능력 추론**. 같은 세션의 Kahn 오독과 동일 부류. **내 결론의 근거도 재실증 대상이다.**
>
> ### ★grep 오염 레지스트리 (이 블록에서 특히 걸릴 것)
> `hris`→**hig`hRis`k** · `redis`→`totalBefore`**Dis**`c` · `valid_to`→**`in`valid_to`ken`** · `business_unit_id`→**Trustpilot 자격증명** · `company_id`→**Adobe Analytics 자격증명** · `po_*`→**Price Optimization**(Purchase Order 아님) · `country_code`→**TikTok 리포트 차원**(`Connectors:2044`,`:2071`)·**IP Geo**(`Geo.php:106`) · `correlation_id`→**Walmart `WM_QOS.CORRELATION_ID`**(`ChannelSync`) · `template_id`→**발송 템플릿 FK** · `escalat`→**`Reviews.php:173-187` 부정리뷰 Slack 통지** · `agent_mode=>'approval'`(`UserAdmin.php:524`)→**AI 에이전트 권한모드** · `stage`/`sc_stages`→**물류 마일스톤 체크리스트**(`sort_order` = **배열 인덱스 `$i`**) · `override`→**스칼라 선행순위**(`Mmm:381-382`·`OrderHub:1274`) · `source_priority`→**데이터소스 Trust**(`DataPlatform:65`,`:184`) · `depth`→**루프 지역변수** · `snapshot`→**CCTV JPEG**
> 🔴**`limit` 단독 grep 은 무의미할 것**(SQL LIMIT·rate limit·plan limit 전역 다수) — **`approval_limit`/`spending_limit`/`amount_threshold` 등 복합어로만 물어라**(5-3-3-3 의 `route` 교훈).
>
> ### ★5번째 승인 축(브리핑에 없던 것 — 이 블록의 Authority 와 인접)
> **`app_user.agent_mode`(`'recommend'|'approval'|'auto'`)** — `AdAdapters::agentMode:42-49`(owner 행 판독) → `canAutoExecute:55` · `AutoCampaign:349`,`:1239` **실소비**. **워크플로가 아니라 자동집행을 억제하는 이진 게이트**. §72 분류 시 빠뜨리지 마라.
>
> ### 🔴 §72-25 계열 — 구현이력 정본이 오염돼 있다
> **`docs/IMPLEMENTATION_STATUS.md:130` 이 *"Approvals 실집행(가짜 로컬→실 Alerting action_request)"* 을 완료로 기록한다. 거짓이다** — `INSERT INTO action_request` **전수 0** → **영원히 빈 테이블을 읽는다**. `Db.php:592-600` 에 **`required_approvals`·`requested_by` 컬럼조차 없다**. 운영 규칙상 **매 감사 전 주입하는 정본**이므로 **인용 금지**(정정은 별도 승인세션).
>
> ### 이 세션의 작업 규율 (10회차 계승)
> **파이프라인** = ⓐ스펙 선영속 → ⓑ전수조사(**능력 기반**) → ⓒ전사 → ⓓADR → ⓔ인용검증 → ⓕ커버리지(**측정기 산출·손으로 쓰기 금지**)
> **핵심 규칙**: ①부재증명은 이름이 아니라 **능력**으로 ②존재증명도 능력으로(**"검증기가 있는가"·"판독자가 있는가"를 물어라**) ③**주석·docblock·인계서·이 헤더를 근거로 삼지 말고 정의부를 Read 하라** ④**요구 날조 0**(원문에 없으면 전사 금지) ⑤**역산 금지**(분모 = 원문 항목명) ⑥**"중복 없음" ≠ "기능 충족"** ⑦**우연한 일치를 준수로 계산 금지** ⑧**"열거에 없다"는 열거가 실재할 때만 유효**(ENUM/CHECK/`in_array` 확인 선결) ⑨**개수는 분모가 아니다** ⑩**어휘를 규율에만 추가하면 측정기가 못 세어 조용히 증발한다 — `tools/measure_06a_coverage.mjs` 의 `VOCAB` 와 항상 함께 갱신하라**
>
> **코드 변경 0** — `backend/src`·`frontend/src` 는 Read/Grep 전용. 실 결함 수정은 **별도 승인세션**.

---

# 0. 작업 목적

앞 단계에서 구축한 다음 기반 위에, 특정 Actor가 특정 Approval Domain·Resource·Legal Entity·Organization·Currency·Amount·Action 범위에서 어느 수준까지 승인할 수 있는지 판정하는 **Rebate Approval Authority Matrix Foundation Governance**를 구축하라.

* Canonical Approval Foundation
* Approval Workflow Definition & Flow Execution Engine
* Organization Hierarchy & Organizational Graph
* Reporting Line, Manager Relationship & Supervisory Hierarchy
* Approval Chain Definition & Hierarchical Route Foundation

이번 단계에서는 Approval Authority의 정의·버전·범위·한도·조건·적격성·해석·Snapshot·Simulation·Reconciliation 기반을 완성한다.

* Approval Authority Registry
* Approval Authority Definition
* Approval Authority Version
* Authority Type
* Authority Domain
* Authority Matrix
* Authority Matrix Entry
* Authority Subject Binding
* Authority Role Binding
* Authority Position Binding
* Authority Organization Binding
* Authority Legal Entity Binding
* Authority Geographic Binding
* Authority Resource Binding
* Authority Action Binding
* Authority Amount Band
* Authority Currency Scope
* Authority Threshold
* Authority Ceiling
* Authority Floor
* Authority Limit Period
* Authority Utilization Foundation
* Monetary Authority
* Spending Authority
* Commitment Authority
* Budget Authority
* Rebate Authority
* Claim Authority
* Settlement Authority
* Payment Authority
* Payout Authority
* Refund Authority
* Write-off Authority
* Credit Authority
* Contract Authority
* Exception Authority Reference
* Authority Eligibility
* Authority Candidate
* Authority Resolution
* Authority Conflict
* Authority Snapshot
* Effective Dating
* Authority Simulation
* Authority Reconciliation
* Static Lint
* Runtime Guard
* Evidence
* Audit

이번 단계에서는 Delegation, Substitute Approver, Acting Authority Inheritance, Out-of-office Routing 및 Emergency Delegation을 상세 구현하지 않는다.

해당 기능은 다음 **Delegation Foundation Governance**에서 구현한다.

이번 단계는 Authority 자체와 Authority 판정 기반을 완성한다.

다음 질문에 정확하게 답할 수 있어야 한다.

* 특정 Actor가 Rebate Program을 승인할 수 있는가
* 특정 Actor가 해당 Legal Entity에서 승인할 수 있는가
* 특정 Actor의 승인 한도는 얼마인가
* 승인 한도는 통화별로 다른가
* 승인 금액은 어느 Authority Band에 해당하는가
* Amount가 정확히 Threshold와 같을 때 승인 가능한가
* 승인 한도는 단건 기준인가 누적 기준인가
* 월간·분기·연간 누적 한도가 존재하는가
* 동일 Actor가 여러 Authority를 보유할 때 어떤 Authority를 사용하는가
* Role Authority와 Subject Authority 중 무엇이 우선하는가
* Position Authority와 Organization Authority 중 무엇이 우선하는가
* Authority가 다른 Legal Entity까지 적용되는가
* Authority가 특정 Country·Region에 한정되는가
* Authority가 특정 Cost Center·Profit Center에 한정되는가
* Authority가 특정 Program·Brand·Partner·Customer에 한정되는가
* Authority가 특정 Action에만 적용되는가
* Approve와 Reject 권한이 다른가
* Approve 권한은 있으나 Override 권한은 없는가
* Financial Approval Authority와 Manager 관계가 일치하는가
* Manager라고 해서 자동으로 승인 한도를 갖는가
* CFO 역할이라고 해서 모든 Tenant에서 동일 한도를 갖는가
* 계약 승인 권한과 Payment 승인 권한을 구분하는가
* Rebate 생성·수정·활성화·정산·지급 권한을 구분하는가
* Authority가 현재 유효한가
* 과거 Approval Decision 당시 어떤 Authority Version을 사용했는가
* Authority Matrix가 변경되면 진행 중 Task에 어떤 영향을 주는가
* Authority Threshold가 Chain Level과 일치하는가
* Amount가 한도를 초과하면 다음 Level로 상승하는가
* Authority가 중복되거나 충돌하는가
* Authority를 직접 Subject에게 부여한 이유가 있는가
* Customer Customization이 Platform Mandatory Financial Control을 제거하는가
* Authority 판정 결과를 Simulation할 수 있는가
* Authority 결정 근거를 감사할 수 있는가

---

# 1. 구현 범위

이번 블록에서는 다음을 구현한다.

1. Approval Authority Registry
2. Approval Authority Definition
3. Approval Authority Version
4. Authority Type
5. Authority Domain
6. Authority Matrix
7. Authority Matrix Version
8. Authority Matrix Entry
9. Authority Binding
10. Subject Authority
11. Role Authority
12. Position Authority
13. Organization Authority
14. Legal Entity Authority
15. Geographic Authority
16. Resource Authority
17. Action Authority
18. Amount Band
19. Currency Scope
20. Threshold
21. Floor·Ceiling
22. Limit Period
23. Monetary Authority
24. Spending Authority
25. Commitment Authority
26. Budget Authority
27. Rebate Authority
28. Claim Authority
29. Settlement Authority
30. Payment·Payout Authority
31. Refund·Credit·Write-off Authority
32. Contract Authority
33. Authority Eligibility
34. Authority Candidate
35. Authority Resolution
36. Authority Conflict
37. Authority Snapshot
38. Effective Dating
39. Authority Simulation
40. Authority Reconciliation
41. 기본 Static Lint
42. 기본 Runtime Guard
43. Evidence·Audit
44. 기존 구현 분류
45. 중복 구현 감사
46. ADR·PM·Repeat Problem·Agent History

이번 블록에서는 다음을 상세 구현하지 않는다.

* Delegation 전체 기능
* Substitute Approver
* Out-of-office Authority Transfer
* Vacation Delegation
* Emergency Delegation
* Actual Sequential Level Activation
* Committee·Quorum
* SLA·Escalation
* Risk Engine
* Final Decision State Machine
* Production Certification

---

# 2. 실행 역할

너는 다음 역할을 동시에 수행한다.

* Enterprise Approval Authority Architect
* Financial Authority Matrix Architect
* Delegation of Authority Foundation 선행 책임자
* Monetary Authority 책임자
* Spending Authority 책임자
* Commitment Authority 책임자
* Budget Authority 책임자
* Rebate Authority 책임자
* Claim Authority 책임자
* Settlement Authority 책임자
* Payment·Payout Authority 책임자
* Refund·Credit·Write-off Authority 책임자
* Contract Authority 책임자
* Authority Threshold 책임자
* Multi-Currency Authority 책임자
* Legal Entity Authority 책임자
* Geographic Authority 책임자
* Position·Role·Subject Authority 책임자
* Authority Eligibility 책임자
* Authority Resolution 책임자
* Authority Conflict 책임자
* Authority Snapshot 책임자
* Authority Simulation 책임자
* Authority Reconciliation 책임자
* Multi-tenant Isolation 책임자
* Mandatory Financial Control 책임자
* Evidence·Audit·Lineage 책임자
* 기존 Authority 구현의 비파괴적 통합 책임자
* ADR·PM History 관리 책임자

---

# 3. 선행조건

작업 전 다음 구현을 확인하라.

## 3.1 Approval Chain 기반

* `APPROVAL_CHAIN_DEFINITION`
* `APPROVAL_CHAIN_VERSION`
* `APPROVAL_CHAIN_STAGE`
* `APPROVAL_CHAIN_LEVEL`
* `APPROVAL_CHAIN_REQUIREMENT_BINDING`
* `APPROVAL_CHAIN_FINANCIAL_BINDING`
* `APPROVAL_CHAIN_LEGAL_ENTITY_BINDING`
* `APPROVAL_CHAIN_RESOLUTION`
* `APPROVAL_CHAIN_RESOLUTION_LEVEL`
* `APPROVAL_CHAIN_RESOLVED_PARTICIPANT`
* `APPROVAL_CHAIN_SNAPSHOT`

## 3.2 Identity·Authorization 기반

* Canonical Identity
* Subject Registry
* Role Registry
* Role Assignment
* Position Registry
* Employment Record
* Organization Membership
* Authorization Policy
* Scope Binding
* Entitlement
* Permission
* Actor Authorization Snapshot
* SoD Hook
* Conflict-of-interest Hook

## 3.3 Organization·Finance 기반

* Tenant Registry
* Workspace Registry
* Legal Entity Registry
* Organization Unit
* Organization Hierarchy
* Cost Center Registry
* Profit Center Registry
* Budget Registry
* Currency Registry
* FX Rate Reference
* Country Registry
* Region Registry
* Program Registry
* Project Registry
* Brand Registry
* Partner Registry
* Customer Registry
* Resource Registry

## 3.4 기존 Authority 구현 전수 조사

다음을 조사하라.

* Existing Approval Authority
* Existing Financial Authority
* Existing Monetary Limit
* Existing Spending Limit
* Existing Approval Limit
* Existing Budget Limit
* Existing Signature Authority
* Existing Commitment Authority
* Existing Payment Authority
* Existing Payout Authority
* Existing Refund Limit
* Existing Credit Limit
* Existing Write-off Limit
* Existing Contract Limit
* Existing Rebate Limit
* Existing Claim Limit
* Existing Settlement Limit
* Existing Department Approval Limit
* Existing Job Grade Threshold
* Existing Role Threshold
* Existing Position Threshold
* Existing Manager Limit
* Existing Legal Entity Limit
* Existing Country Limit
* Existing Currency Limit
* Existing Cost Center Limit
* Existing Program Limit
* Existing Daily Limit
* Existing Monthly Limit
* Existing Annual Limit
* Existing Per-transaction Limit
* Existing Cumulative Authority
* Existing Authority Override
* Existing Delegation of Authority Table
* Existing DOA Matrix
* Existing ERP Authority Table
* Existing Finance Approval Matrix
* Existing Procurement Authority
* Existing BPM Threshold Condition
* Existing Hardcoded Amount Condition
* Existing JSON Authority Configuration
* Existing Spreadsheet-based Authority Matrix
* Existing Approval Policy Rule
* Existing Authority History
* Existing Authority Snapshot
* Existing Authority Audit
* Git 이력
* Migration 이력
* 운영 로그
* 테스트 결과

동일 목적 Authority가 존재하면 새 Matrix를 중복 생성하지 말고 Canonical Approval Authority Domain으로 통합하라.

---

# 4. 핵심 원칙

## 4.1 Manager와 Authority를 동일시하지 않는다

Manager Relationship은 조직적 감독 관계다.

Approval Authority는 특정 Domain·Action·Scope·Amount에서 승인할 수 있는 권한이다.

Manager라는 이유만으로 Monetary Authority를 자동 부여하지 마라.

---

## 4.2 Role과 Authority를 동일시하지 않는다

Role은 권한 부여의 근거가 될 수 있지만 Authority 자체는 Versioned Matrix와 Scope를 통해 판정한다.

`CFO`, `Finance Manager`, `Department Head`라는 이름만으로 Authority를 추론하지 마라.

---

## 4.3 Authority는 Scope-bound다

Authority에는 최소 다음 Scope 중 필요한 범위를 명시한다.

* Tenant
* Workspace
* Legal Entity
* Organization
* Region
* Country
* Program
* Project
* Brand
* Partner
* Customer
* Cost Center
* Profit Center
* Budget
* Resource Type
* Resource
* Action
* Currency
* Amount
* Period
* Environment

---

## 4.4 Authority는 Effective-dated다

현재 Authority만 저장하지 말고 과거 Decision 시점의 Authority를 재현할 수 있어야 한다.

---

## 4.5 Amount Threshold의 경계를 명확히 한다

다음을 명시한다.

* Lower Bound
* Upper Bound
* Inclusive 여부
* Exclusive 여부
* Currency
* Conversion Policy
* Rounding Policy
* Precision
* Negative Amount Policy
* Zero Amount Policy

---

## 4.6 Financial Authority는 단건과 누적을 구분한다

다음을 구분한다.

* Per Transaction
* Per Approval Case
* Per Program
* Per Cost Center
* Daily
* Weekly
* Monthly
* Quarterly
* Annual
* Fiscal Period
* Lifetime
* Rolling Window

---

## 4.7 Authority Resolution과 Authority Definition을 분리한다

Definition은 일반 권한 규칙이다.

Resolution은 특정 Actor·Case·Amount·Currency·Scope·Effective Date에 대한 실제 판정 결과다.

---

## 4.8 Authority가 여러 개일 때 임의로 최대 한도를 선택하지 않는다

Scope Specificity, Source Priority, Effect, Conflict Policy 및 Legal Entity를 평가한다.

---

## 4.9 Explicit Deny는 Allow보다 우선한다

금지 Authority 또는 제한 Rule이 존재하면 더 넓은 Allow Authority로 우회하지 못하게 하라.

---

## 4.10 Authority Snapshot을 보존한다

Task Assignment, Claim, Decision 시점의 Authority Version과 Resolution을 불변 Snapshot으로 저장한다.

---

# 5. Canonical Entity

기존 동등 Entity가 없을 경우 최소 다음을 구축하라.

* `APPROVAL_AUTHORITY_REGISTRY`
* `APPROVAL_AUTHORITY_TYPE`
* `APPROVAL_AUTHORITY_DOMAIN`
* `APPROVAL_AUTHORITY_DEFINITION`
* `APPROVAL_AUTHORITY_VERSION`
* `APPROVAL_AUTHORITY_MATRIX`
* `APPROVAL_AUTHORITY_MATRIX_VERSION`
* `APPROVAL_AUTHORITY_MATRIX_ENTRY`
* `APPROVAL_AUTHORITY_BINDING`
* `APPROVAL_AUTHORITY_SUBJECT_BINDING`
* `APPROVAL_AUTHORITY_ROLE_BINDING`
* `APPROVAL_AUTHORITY_POSITION_BINDING`
* `APPROVAL_AUTHORITY_ORGANIZATION_BINDING`
* `APPROVAL_AUTHORITY_LEGAL_ENTITY_BINDING`
* `APPROVAL_AUTHORITY_GEOGRAPHIC_BINDING`
* `APPROVAL_AUTHORITY_RESOURCE_BINDING`
* `APPROVAL_AUTHORITY_ACTION_BINDING`
* `APPROVAL_AUTHORITY_AMOUNT_BAND`
* `APPROVAL_AUTHORITY_CURRENCY_SCOPE`
* `APPROVAL_AUTHORITY_THRESHOLD`
* `APPROVAL_AUTHORITY_LIMIT_PERIOD`
* `APPROVAL_AUTHORITY_ELIGIBILITY_PROFILE`
* `APPROVAL_AUTHORITY_CANDIDATE`
* `APPROVAL_AUTHORITY_RESOLUTION`
* `APPROVAL_AUTHORITY_RESOLUTION_RESULT`
* `APPROVAL_AUTHORITY_CONFLICT`
* `APPROVAL_AUTHORITY_UTILIZATION_REFERENCE`
* `APPROVAL_AUTHORITY_SNAPSHOT`
* `APPROVAL_AUTHORITY_SIMULATION`
* `APPROVAL_AUTHORITY_RECONCILIATION`
* `APPROVAL_AUTHORITY_EVIDENCE`
* `APPROVAL_AUTHORITY_AUDIT_EVENT`

---

# 6. Approval Authority Registry

`APPROVAL_AUTHORITY_REGISTRY`

필수 필드:

* approval_authority_registry_id
* tenant_id
* registry_code
* registry_name
* registry_type
* authoritative_source
* supported domains
* supported authority types
* monetary support
* multi-currency support
* cumulative limit support
* legal entity support
* geographic support
* resource scope support
* deny rule support
* simulation support
* owner
* active version
* valid_from
* valid_to
* status
* evidence

Registry Type:

* PLATFORM
* TENANT
* LEGAL_ENTITY
* FINANCE
* PROCUREMENT
* REBATE
* CLAIM
* SETTLEMENT
* PAYMENT
* CONTRACT
* ERP
* HRIS
* POLICY_ENGINE
* CUSTOM

---

# 7. Approval Authority Type

`APPROVAL_AUTHORITY_TYPE`

지원 Type:

* MONETARY_APPROVAL
* SPENDING
* COMMITMENT
* BUDGET
* REBATE
* CLAIM
* SETTLEMENT
* PAYMENT
* PAYOUT
* REFUND
* CREDIT
* WRITE_OFF
* CONTRACT
* PROCUREMENT
* DISCOUNT
* PRICE_OVERRIDE
* PROGRAM_ACTIVATION
* PROGRAM_MODIFICATION
* CUSTOMER_COMPENSATION
* PARTNER_INCENTIVE
* DATA_ACCESS
* SECURITY_EXCEPTION
* POLICY_EXCEPTION
* MANUAL_OVERRIDE_REFERENCE
* CUSTOM

필수 필드:

* approval_authority_type_id
* type_code
* type_name
* category
* monetary 여부
* cumulative 여부
* delegatable reference 여부
* legal entity bound 여부
* currency bound 여부
* resource bound 여부
* action bound 여부
* explicit deny support
* mandatory snapshot 여부
* status
* evidence

---

# 8. Approval Authority Domain

`APPROVAL_AUTHORITY_DOMAIN`

지원 Domain:

* REBATE_PROGRAM
* REBATE_RULE
* REBATE_BUDGET
* REBATE_CLAIM
* REBATE_SETTLEMENT
* REBATE_PAYMENT
* REBATE_PAYOUT
* REBATE_ADJUSTMENT
* REBATE_CANCELLATION
* REBATE_WRITE_OFF
* CUSTOMER_CREDIT
* CUSTOMER_REFUND
* PARTNER_INCENTIVE
* CONTRACT
* PROCUREMENT
* FINANCE
* ACCOUNTING
* TREASURY
* LEGAL
* COMPLIANCE
* SECURITY
* DATA
* CUSTOM

필수 필드:

* approval_authority_domain_id
* domain_code
* domain_name
* resource types
* supported actions
* mandatory control types
* default currency policy
* default threshold policy
* default legal entity policy
* status
* evidence

---

# 9. Approval Authority Definition

`APPROVAL_AUTHORITY_DEFINITION`

필수 필드:

* approval_authority_definition_id
* approval_authority_registry_id
* authority_code
* authority_name
* authority_description
* authority_type_id
* authority_domain_id
* effect
* assignment basis
* tenant_scope
* workspace_scope
* organization_scope
* legal_entity_scope
* geographic_scope
* resource_scope
* action_scope
* amount_scope
* currency_scope
* period_scope
* environment_scope
* approval chain applicability
* delegation eligibility reference
* owner
* active_version
* valid_from
* valid_to
* status
* evidence

Effect:

* ALLOW
* DENY
* REQUIRE_ADDITIONAL_APPROVAL
* REQUIRE_MANUAL_REVIEW
* RESTRICT
* CUSTOM

Assignment Basis:

* SUBJECT
* ROLE
* POSITION
* ORGANIZATION
* LEGAL_ENTITY_ROLE
* MANAGER_RELATIONSHIP
* JOB_LEVEL
* EXECUTIVE_LEVEL
* FUNCTIONAL_ROLE
* OWNER_RELATIONSHIP
* POLICY_RESOLVED
* HYBRID
* CUSTOM

---

# 10. Approval Authority Version

`APPROVAL_AUTHORITY_VERSION`

필수 필드:

* approval_authority_version_id
* approval_authority_definition_id
* version_number
* previous_version_id
* version_type
* change_summary
* matrix_reference
* scope_snapshot
* threshold_snapshot
* currency_snapshot
* period_snapshot
* deny_rule_snapshot
* delegation_eligibility_snapshot
* affected chains
* affected levels
* affected roles
* affected subjects
* affected active tasks
* effective_from
* effective_to
* created_by
* reviewed_by
* approved_by_reference
* activated_at
* immutable_hash
* migration_policy
* status
* evidence

Version Type:

* INITIAL
* LIMIT_CHANGE
* SCOPE_CHANGE
* CURRENCY_CHANGE
* PERIOD_CHANGE
* ACTION_CHANGE
* LEGAL_ENTITY_CHANGE
* ROLE_CHANGE
* POSITION_CHANGE
* DENY_RULE_CHANGE
* FINANCIAL_CONTROL_CHANGE
* SECURITY_PATCH
* LEGAL_CHANGE
* MIGRATION
* CORRECTION

상태:

* DRAFT
* VALIDATION_PENDING
* VALIDATION_FAILED
* REVIEW_PENDING
* APPROVAL_PENDING
* APPROVED
* SCHEDULED
* ACTIVE
* ACTIVE_WITH_WARNINGS
* SUPERSEDED
* SUSPENDED
* RETIRED
* ARCHIVED
* BLOCKED

---

# 11. Authority Version Migration Policy

지원 정책:

* NEW_CASES_ONLY
* ACTIVE_TASKS_KEEP_SNAPSHOT
* UNASSIGNED_LEVELS_REEVALUATE
* FUTURE_STAGES_REEVALUATE
* CURRENT_TASK_REVALIDATE
* SELECTED_CASES_MIGRATE
* ALL_ELIGIBLE_CASES_MIGRATE
* MANUAL_REVIEW
* BLOCK_NEW_DECISIONS
* NO_MIGRATION
* CUSTOM

완료된 Decision의 당시 Authority Snapshot을 변경하지 마라.

---

# 12. Approval Authority Matrix

`APPROVAL_AUTHORITY_MATRIX`

필수 필드:

* approval_authority_matrix_id
* approval_authority_registry_id
* tenant_id
* matrix_code
* matrix_name
* matrix_type
* authority_domains
* authority_types
* default currency
* fiscal calendar reference
* source priority policy
* conflict policy
* specificity policy
* cumulative usage support
* owner
* active_version
* valid_from
* valid_to
* status
* evidence

Matrix Type:

* ENTERPRISE
* TENANT
* LEGAL_ENTITY
* ORGANIZATION
* FUNCTIONAL
* JOB_LEVEL
* POSITION
* FINANCIAL
* REBATE
* CLAIM
* SETTLEMENT
* PAYMENT
* CONTRACT
* HYBRID
* CUSTOM

---

# 13. Approval Authority Matrix Version

`APPROVAL_AUTHORITY_MATRIX_VERSION`

필수 필드:

* approval_authority_matrix_version_id
* approval_authority_matrix_id
* version_number
* previous_version_id
* entry_count
* allow_entry_count
* deny_entry_count
* currency_count
* legal_entity_count
* subject_binding_count
* role_binding_count
* position_binding_count
* organization_binding_count
* change_summary
* source_version
* effective_from
* effective_to
* immutable_hash
* status
* evidence

---

# 14. Approval Authority Matrix Entry

`APPROVAL_AUTHORITY_MATRIX_ENTRY`

필수 필드:

* approval_authority_matrix_entry_id
* approval_authority_matrix_version_id
* authority_definition_id
* authority_version_id
* entry_code
* effect
* priority
* specificity
* subject binding reference
* role binding reference
* position binding reference
* organization binding reference
* legal entity binding reference
* geographic binding reference
* resource binding reference
* action binding reference
* amount band reference
* currency scope reference
* limit period reference
* eligibility profile reference
* condition reference
* source
* source record id
* valid_from
* valid_to
* status
* evidence

---

# 15. Authority Binding

`APPROVAL_AUTHORITY_BINDING`

Binding Type:

* SUBJECT
* ROLE
* POSITION
* ORGANIZATION
* LEGAL_ENTITY
* GEOGRAPHY
* RESOURCE
* ACTION
* JOB_LEVEL
* EXECUTIVE_LEVEL
* MANAGER_TYPE
* OWNER_TYPE
* FUNCTIONAL_DOMAIN
* HYBRID
* CUSTOM

필수 필드:

* approval_authority_binding_id
* authority_matrix_entry_id
* binding_type
* binding_effect
* source_reference
* scope_reference
* inherited 여부
* inheritance_depth
* priority
* valid_from
* valid_to
* status
* evidence

---

# 16. Subject Authority Binding

`APPROVAL_AUTHORITY_SUBJECT_BINDING`

필수 필드:

* subject_authority_binding_id
* authority_matrix_entry_id
* subject_id
* employment_reference
* position_reference
* tenant_id
* legal_entity_id
* organization_id
* direct assignment reason
* approval reference
* exceptional 여부
* temporary reference 여부
* valid_from
* valid_to
* status
* evidence

직접 Subject Authority는 일반 Role·Position Authority보다 예외성이 높으므로 다음을 요구하라.

* 명확한 사유
* 승인 근거
* 종료일 또는 Review Date
* Conflict 검증
* Audit
* 최소 권한 원칙

---

# 17. Role Authority Binding

`APPROVAL_AUTHORITY_ROLE_BINDING`

필수 필드:

* role_authority_binding_id
* authority_matrix_entry_id
* role_id
* role_version
* required role scope
* required assignment type
* tenant restriction
* legal entity restriction
* organization restriction
* environment restriction
* inherited role allowed 여부
* composite role policy
* valid_from
* valid_to
* status
* evidence

Role 이름이 아니라 Canonical Role ID와 Version을 사용하라.

---

# 18. Position Authority Binding

`APPROVAL_AUTHORITY_POSITION_BINDING`

필수 필드:

* position_authority_binding_id
* authority_matrix_entry_id
* position_id
* position version
* incumbent required 여부
* vacancy policy
* organization scope
* legal entity scope
* minimum job level
* executive level
* multiple incumbent policy
* valid_from
* valid_to
* status
* evidence

Position Authority는 현재 Active Incumbent에게 Resolution 시 연결한다.

공석 Position에 Authority를 부여하더라도 실제 승인 Actor로 자동 해석하지 마라.

---

# 19. Organization Authority Binding

`APPROVAL_AUTHORITY_ORGANIZATION_BINDING`

필수 필드:

* organization_authority_binding_id
* authority_matrix_entry_id
* organization_unit_id
* organization hierarchy version policy
* include descendants 여부
* maximum descendant depth
* organization role requirement
* owner relationship requirement
* legal entity restriction
* valid_from
* valid_to
* status
* evidence

Parent Organization Authority를 하위 조직에 상속할 경우 상속 깊이와 Legal Entity Boundary를 명시한다.

---

# 20. Legal Entity Authority Binding

`APPROVAL_AUTHORITY_LEGAL_ENTITY_BINDING`

필수 필드:

* legal_entity_authority_binding_id
* authority_matrix_entry_id
* legal_entity_id
* authority responsibility type
* operating entity 여부
* funding entity 여부
* accounting entity 여부
* settlement entity 여부
* payout entity 여부
* contracting entity 여부
* tax entity 여부
* intercompany allowed 여부
* allowed target legal entities
* prohibited target legal entities
* valid_from
* valid_to
* status
* evidence

다른 Legal Entity에서의 Authority를 자동 인정하지 마라.

---

# 21. Geographic Authority Binding

`APPROVAL_AUTHORITY_GEOGRAPHIC_BINDING`

필수 필드:

* geographic_authority_binding_id
* authority_matrix_entry_id
* geography_type
* region_id
* country_code
* territory reference
* include child geography 여부
* exclude geography references
* cross-border authority 여부
* legal entity interaction policy
* valid_from
* valid_to
* status
* evidence

Geography Type:

* GLOBAL
* REGION
* COUNTRY
* AREA
* TERRITORY
* LOCAL
* CUSTOM

---

# 22. Resource Authority Binding

`APPROVAL_AUTHORITY_RESOURCE_BINDING`

필수 필드:

* resource_authority_binding_id
* authority_matrix_entry_id
* resource_type
* resource_id
* resource owner type
* program_id
* project_id
* brand_id
* partner_id
* customer_id
* cost_center_id
* profit_center_id
* budget_id
* include child resources 여부
* resource status requirements
* valid_from
* valid_to
* status
* evidence

---

# 23. Action Authority Binding

`APPROVAL_AUTHORITY_ACTION_BINDING`

지원 Action:

* CREATE
* SUBMIT
* REVIEW
* APPROVE
* REJECT
* RETURN
* REQUEST_CHANGES
* ACTIVATE
* MODIFY
* INCREASE
* DECREASE
* EXTEND
* TERMINATE
* CANCEL
* REOPEN
* OVERRIDE_REFERENCE
* SETTLE
* PAY
* PAYOUT
* REFUND
* CREDIT
* WRITE_OFF
* COMMIT
* SIGN
* RELEASE
* POST
* REVERSE
* CUSTOM

필수 필드:

* action_authority_binding_id
* authority_matrix_entry_id
* action_type
* decision type reference
* resource state requirements
* before state
* after state
* additional approval requirement
* prohibited state transitions
* valid_from
* valid_to
* status
* evidence

Approve 권한과 Override·Activate·Pay 권한을 분리하라.

---

# 24. Approval Authority Amount Band

`APPROVAL_AUTHORITY_AMOUNT_BAND`

필수 필드:

* approval_authority_amount_band_id
* band_code
* band_name
* lower_bound
* lower_bound_inclusive
* upper_bound
* upper_bound_inclusive
* base_currency
* amount_basis
* aggregation_basis
* rounding_policy
* precision
* zero_amount_policy
* negative_amount_policy
* status
* evidence

Amount Basis:

* REQUEST_TOTAL
* APPROVAL_ITEM_AMOUNT
* LINE_ITEM_AMOUNT
* PROGRAM_BUDGET
* CLAIM_AMOUNT
* SETTLEMENT_AMOUNT
* PAYMENT_AMOUNT
* PAYOUT_AMOUNT
* REFUND_AMOUNT
* CREDIT_AMOUNT
* WRITE_OFF_AMOUNT
* CONTRACT_VALUE
* ANNUALIZED_CONTRACT_VALUE
* LIFETIME_VALUE
* INCREMENTAL_AMOUNT
* NET_CHANGE
* GROSS_AMOUNT
* NET_AMOUNT
* TAX_INCLUDED
* TAX_EXCLUDED
* POLICY_RESOLVED
* CUSTOM

---

# 25. Amount Band 경계 규칙

다음을 강제하라.

* 중첩 Band 탐지
* Band Gap 탐지
* Inclusive Boundary 충돌 탐지
* Lower Bound > Upper Bound 차단
* Currency 없는 Monetary Band 차단
* Decimal Precision 불일치 차단
* Infinity Band 명시
* Zero Amount 처리 명시
* Negative Adjustment 처리 명시
* Refund·Credit에 대한 부호 정책 명시

예:

* 0 이상 10,000 미만
* 10,000 이상 50,000 미만
* 50,000 이상 100,000 이하
* 100,000 초과

Threshold 경계에서 두 Level이 동시에 또는 모두 미적용되지 않게 하라.

---

# 26. Currency Scope

`APPROVAL_AUTHORITY_CURRENCY_SCOPE`

지원 정책:

* SINGLE_CURRENCY
* MULTI_CURRENCY_FIXED_LIMIT
* BASE_CURRENCY_CONVERSION
* LEGAL_ENTITY_FUNCTIONAL_CURRENCY
* PROGRAM_CURRENCY
* TRANSACTION_CURRENCY
* SETTLEMENT_CURRENCY
* POLICY_RESOLVED
* CUSTOM

필수 필드:

* approval_authority_currency_scope_id
* authority_matrix_entry_id
* currency_policy
* allowed currencies
* prohibited currencies
* base currency
* functional currency source
* fx rate type reference
* fx rate date policy
* missing rate policy
* rounding policy
* conversion precision
* triangulation allowed 여부
* valid_from
* valid_to
* status
* evidence

---

# 27. FX Reference 원칙

이번 단계에서는 FX Provider 자체를 구축하지 말고 기존 Canonical FX Rate Service를 참조한다.

반드시 기록할 항목:

* source currency
* target currency
* rate
* rate type
* rate source
* rate date
* retrieval timestamp
* rounding
* original amount
* converted amount
* conversion hash
* stale rate 여부
* fallback 여부

Missing Rate Policy:

* BLOCK
* USE_PREVIOUS_BUSINESS_DAY
* USE_LATEST_AVAILABLE_WITH_WARNING
* MANUAL_REVIEW
* FIXED_CONTRACT_RATE_REFERENCE
* CUSTOM

오래된 FX Rate로 고액 Approval을 자동 통과시키지 마라.

---

# 28. Approval Authority Threshold

`APPROVAL_AUTHORITY_THRESHOLD`

필수 필드:

* approval_authority_threshold_id
* authority_matrix_entry_id
* threshold_type
* amount_band_id
* lower_limit
* upper_limit
* currency_scope_id
* aggregation_basis
* limit_period_id
* comparison_operator
* tolerance
* threshold action
* next authority reference
* next chain level reference
* manual review policy
* valid_from
* valid_to
* status
* evidence

Threshold Type:

* MINIMUM
* MAXIMUM
* BAND
* EXACT
* CUMULATIVE
* INCREMENTAL
* NET_CHANGE
* PERCENTAGE
* QUANTITY
* COUNT
* CUSTOM

Comparison Operator:

* LT
* LTE
* EQ
* GTE
* GT
* BETWEEN_INCLUSIVE
* BETWEEN_EXCLUSIVE
* CUSTOM

---

# 29. Threshold Action

지원 Action:

* AUTHORITY_SATISFIED
* REQUIRE_NEXT_LEVEL
* REQUIRE_ADDITIONAL_LEVEL
* REQUIRE_FINANCE_REVIEW
* REQUIRE_EXECUTIVE_REVIEW
* REQUIRE_MANUAL_REVIEW
* DENY
* BLOCK
* CUSTOM

Amount가 한도를 초과했을 때 자동 Reject하지 말고 Chain Policy에 따라 상위 Authority Level을 요구할 수 있게 하라.

---

# 30. Approval Authority Limit Period

`APPROVAL_AUTHORITY_LIMIT_PERIOD`

Period Type:

* PER_TRANSACTION
* PER_APPROVAL_CASE
* PER_ITEM
* PER_PROGRAM
* PER_PROJECT
* PER_COST_CENTER
* PER_PROFIT_CENTER
* DAILY
* WEEKLY
* MONTHLY
* QUARTERLY
* ANNUAL
* FISCAL_PERIOD
* ROLLING_DAYS
* LIFETIME
* CUSTOM

필수 필드:

* approval_authority_limit_period_id
* period_type
* fiscal calendar reference
* rolling window days
* reset policy
* timezone
* aggregation key policy
* utilization source
* reservation support
* release policy
* reversal policy
* valid_from
* valid_to
* status
* evidence

---

# 31. Authority Utilization Foundation

`APPROVAL_AUTHORITY_UTILIZATION_REFERENCE`

이번 단계에서는 누적 사용량의 Reference Contract를 구축한다.

필수 필드:

* authority_utilization_reference_id
* authority definition
* authority version
* subject
* role
* position
* legal entity
* organization
* resource
* currency
* limit period
* period start
* period end
* approved amount
* committed amount
* pending amount
* reserved amount
* reversed amount
* released amount
* remaining amount
* source transactions
* calculated_at
* consistency state
* status
* evidence

실제 Ledger·Reservation Engine은 기존 Finance·Approval Transaction Service와 통합하라.

---

# 32. Utilization 계산 원칙

다음을 구분하라.

* Approved
* Pending
* Reserved
* Committed
* Paid
* Reversed
* Cancelled
* Expired
* Released

Authority Remaining Amount 계산 시 어떤 상태를 포함하는지 Policy로 명시하라.

예:

`remaining = limit - approved - pending - reserved + reversed + released`

이 공식을 하드코딩하지 말고 Authority Type별 Policy로 관리하라.

---

# 33. Monetary Approval Authority

Monetary Authority에는 다음을 기록한다.

* amount basis
* currency policy
* per transaction limit
* cumulative limit
* legal entity
* resource scope
* action scope
* effective period
* utilization policy
* next approval level
* evidence

---

# 34. Spending Authority

Spending Authority는 비용 발생·구매·예산 집행 승인 권한이다.

필수 속성:

* expense category
* procurement category
* cost center
* budget
* legal entity
* vendor·partner scope
* amount band
* currency
* fiscal period
* commitment 여부
* approval action
* status
* evidence

Spending Authority와 Payment Authority를 동일시하지 마라.

---

# 35. Commitment Authority

Commitment Authority는 회사가 향후 지급·비용·계약 의무를 부담하도록 확정하는 권한이다.

필수 속성:

* commitment type
* contract value
* annualized value
* total lifetime value
* cancellation liability
* legal entity
* contract term
* currency
* amount band
* signature authority reference
* status
* evidence

Payment 실행 권한과 Commitment 생성 권한을 분리하라.

---

# 36. Budget Authority

Budget Authority에는 다음을 기록한다.

* budget id
* budget version
* fiscal year
* budget owner
* budget organization
* cost center
* profit center
* approved budget
* available budget reference
* amount band
* transfer authority
* over-budget policy
* valid period
* status
* evidence

Budget Owner라고 해서 Payment·Settlement 권한을 자동 부여하지 마라.

---

# 37. Rebate Authority

Rebate Authority를 Action별로 구분하라.

* Rebate Program Create
* Program Submit
* Program Approve
* Program Activate
* Program Modify
* Budget Increase
* Threshold Change
* Eligibility Rule Change
* Reward Rate Change
* Retroactive Change
* Program Extend
* Program Terminate
* Claim Approve
* Settlement Approve
* Payment Approve
* Payout Release
* Adjustment Approve
* Cancellation Approve
* Write-off Approve

필수 속성:

* rebate program type
* funding source
* legal entity
* program owner organization
* partner·customer scope
* amount basis
* currency
* amount band
* action
* effective period
* status
* evidence

---

# 38. Claim Authority

Claim Authority에는 다음을 기록한다.

* claim type
* claimant type
* program
* partner
* customer
* legal entity
* claim amount basis
* adjustment inclusion
* tax inclusion
* currency
* amount band
* fraud·risk hook
* status
* evidence

Claim 검토 권한과 Claim 최종 승인 권한을 구분한다.

---

# 39. Settlement Authority

Settlement Authority에는 다음을 기록한다.

* settlement type
* settlement cycle
* counterparty
* legal entity
* accounting entity
* settlement currency
* gross amount
* deduction amount
* net amount
* adjustment amount
* threshold basis
* amount band
* accounting review reference
* status
* evidence

---

# 40. Payment·Payout Authority

Payment Authority와 Payout Release Authority를 구분하라.

Payment Authority 필수 속성:

* payment type
* payer legal entity
* payee type
* funding account reference
* currency
* amount
* payment batch 여부
* treasury review reference
* status
* evidence

Payout Authority 필수 속성:

* payout program
* payout recipient
* payout channel
* payout batch
* payout release action
* settlement reference
* amount band
* currency
* status
* evidence

Approval Decision만으로 실제 자금 이동이 자동 실행되지 않도록 Payment Execution Control Hook을 유지한다.

---

# 41. Refund Authority

Refund Authority에는 다음을 기록한다.

* refund type
* original transaction
* customer
* legal entity
* reason category
* original amount
* refund amount
* partial·full 여부
* currency
* amount band
* fraud review reference
* status
* evidence

---

# 42. Credit Authority

Credit Authority에는 다음을 기록한다.

* credit type
* customer
* account
* legal entity
* credit amount
* currency
* expiration
* utilization restriction
* accounting treatment
* amount band
* status
* evidence

---

# 43. Write-off Authority

Write-off Authority에는 다음을 기록한다.

* write-off type
* receivable·payable reference
* legal entity
* accounting period
* reason
* amount
* currency
* amount band
* tax impact reference
* accounting approval reference
* status
* evidence

---

# 44. Contract Authority

Contract Authority에는 다음을 기록한다.

* contract type
* contracting legal entity
* counterparty
* total contract value
* annualized value
* lifetime value
* automatic renewal
* cancellation liability
* governing law
* region
* country
* currency
* signature requirement
* legal review requirement
* amount band
* status
* evidence

Contract Authority와 Rebate Budget Authority를 구분하라.

---

# 45. Authority Eligibility Profile

`APPROVAL_AUTHORITY_ELIGIBILITY_PROFILE`

필수 필드:

* authority_eligibility_profile_id
* allowed subject types
* required identity state
* required employment state
* required position state
* required role state
* required tenant
* legal entity policy
* organization policy
* geographic policy
* minimum job level
* minimum executive level
* manager relationship requirement
* owner relationship requirement
* required certifications reference
* security suspension policy
* leave policy
* termination policy
* self approval policy
* conflict of interest hook
* SoD hook
* delegation eligibility reference
* valid_from
* valid_to
* status
* evidence

---

# 46. 기본 Authority Eligibility

기본적으로 다음을 요구한다.

* Active Canonical Identity
* Active Employment 또는 허용된 External Actor
* Active Role·Position Assignment
* 유효한 Authority Version
* 유효한 Matrix Entry
* 동일 Tenant
* 허용된 Legal Entity
* 허용된 Organization·Geography
* Action Match
* Resource Match
* Currency Match
* Amount Match
* Period Match
* Security Suspension 아님
* Terminated 아님
* SoD Hook 통과
* Conflict-of-interest Hook 통과
* Self-approval Policy 통과
* Runtime Authorization 통과

---

# 47. Approval Authority Candidate

`APPROVAL_AUTHORITY_CANDIDATE`

필수 필드:

* approval_authority_candidate_id
* approval_request_id
* approval_case_id
* approval_item_id
* approval_requirement_id
* chain_resolution_level_id
* subject_id
* role_id
* position_id
* organization_id
* legal_entity_id
* authority_definition_id
* authority_version_id
* authority_matrix_id
* authority_matrix_version_id
* matrix_entry_id
* authority_type
* authority_domain
* action
* resource
* original amount
* original currency
* converted amount
* comparison currency
* amount band
* limit period
* utilization reference
* remaining authority
* scope match
* eligibility result
* exclusion reasons
* conflict state
* priority
* proposed 여부
* status
* evidence

---

# 48. Authority Candidate Source Priority

권장 기본 순서:

1. Explicit Approved Subject Authority
2. Exact Position Authority
3. Exact Role + Legal Entity Authority
4. Exact Organization + Role Authority
5. Exact Resource Owner Authority
6. Exact Cost Center·Profit Center Authority
7. Exact Program Authority
8. Legal Entity Functional Authority
9. Country·Regional Authority
10. Tenant Default Role Authority
11. Platform Standard Authority
12. Manual Review
13. Block

Explicit Subject Authority라도 DENY·Expiry·Scope Mismatch를 우회하지 못하게 하라.

---

# 49. Candidate Exclusion Reason

지원 Exclusion:

* SUBJECT_INACTIVE
* EMPLOYMENT_INACTIVE
* ROLE_INACTIVE
* POSITION_INACTIVE
* POSITION_VACANT
* WRONG_TENANT
* WRONG_WORKSPACE
* WRONG_LEGAL_ENTITY
* WRONG_ORGANIZATION
* WRONG_REGION
* WRONG_COUNTRY
* WRONG_RESOURCE
* WRONG_ACTION
* WRONG_DOMAIN
* WRONG_AUTHORITY_TYPE
* WRONG_CURRENCY
* BELOW_MINIMUM
* ABOVE_MAXIMUM
* LIMIT_EXHAUSTED
* PERIOD_LIMIT_EXHAUSTED
* FX_RATE_UNAVAILABLE
* FX_RATE_STALE
* AUTHORITY_EXPIRED
* MATRIX_VERSION_INACTIVE
* EXPLICIT_DENY
* SECURITY_BLOCKED
* SELF_APPROVAL_BLOCKED
* SOD_FAILED
* CONFLICT_OF_INTEREST
* AUTHORIZATION_FAILED
* DELEGATION_REQUIRED_REFERENCE
* DUPLICATE_AUTHORITY
* MANUAL_EXCLUSION
* OTHER

---

# 50. Approval Authority Resolution

`APPROVAL_AUTHORITY_RESOLUTION`

필수 필드:

* approval_authority_resolution_id
* approval_request_id
* approval_request_version_id
* approval_case_id
* approval_item_id
* approval_requirement_id
* approval_chain_resolution_id
* resolution_level_id
* subject_id
* action
* authority_domain
* authority_type
* resource_type
* resource_id
* tenant_id
* workspace_id
* organization_id
* legal_entity_id
* region
* country
* original_amount
* original_currency
* comparison_amount
* comparison_currency
* fx_reference
* matrix_id
* matrix_version_id
* matrix_entry_id
* authority_definition_id
* authority_version_id
* amount_band_id
* limit_period_id
* utilization_reference
* remaining_authority
* effect
* eligibility_result
* conflict_result
* next_level_required 여부
* additional_approval_required 여부
* manual_review_required 여부
* resolution_hash
* resolved_at
* status
* evidence

---

# 51. Authority Resolution Result

`APPROVAL_AUTHORITY_RESOLUTION_RESULT`

지원 결과:

* AUTHORIZED
* AUTHORIZED_WITH_ADDITIONAL_APPROVAL
* AUTHORIZED_WITH_WARNING
* LIMIT_EXCEEDED
* PERIOD_LIMIT_EXCEEDED
* DENIED
* INELIGIBLE
* NO_AUTHORITY_FOUND
* CONFLICT
* NEXT_LEVEL_REQUIRED
* MANUAL_REVIEW_REQUIRED
* FX_UNAVAILABLE
* BLOCKED
* CUSTOM

필수 필드:

* authority_resolution_result_id
* authority_resolution_id
* result
* reason codes
* matched allow rules
* matched deny rules
* winning rule
* specificity result
* priority result
* threshold result
* utilization result
* next action
* next chain level
* status
* evidence

---

# 52. Specificity Resolution

Authority가 여러 개 일치할 때 다음 Specificity를 평가하라.

권장 순서:

1. Exact Subject + Exact Resource
2. Exact Subject + Exact Legal Entity
3. Exact Position + Exact Resource
4. Exact Role + Exact Legal Entity + Exact Action
5. Exact Organization + Exact Resource
6. Exact Cost Center·Profit Center
7. Exact Program·Project
8. Exact Country
9. Exact Region
10. Tenant-wide
11. Platform-wide

다만 Explicit DENY는 더 낮은 Specificity라도 Policy에 따라 우선할 수 있게 하라.

---

# 53. Authority Conflict

`APPROVAL_AUTHORITY_CONFLICT`

Conflict Type:

* ALLOW_DENY_CONFLICT
* MULTIPLE_ALLOW_DIFFERENT_LIMIT
* MULTIPLE_DENY_CONFLICT
* SUBJECT_ROLE_CONFLICT
* ROLE_POSITION_CONFLICT
* POSITION_ORGANIZATION_CONFLICT
* LEGAL_ENTITY_CONFLICT
* GEOGRAPHIC_CONFLICT
* RESOURCE_SCOPE_CONFLICT
* ACTION_SCOPE_CONFLICT
* CURRENCY_CONFLICT
* THRESHOLD_OVERLAP
* THRESHOLD_GAP
* PERIOD_LIMIT_CONFLICT
* UTILIZATION_CONFLICT
* SOURCE_PRIORITY_CONFLICT
* VERSION_CONFLICT
* EXPIRED_AUTHORITY_ACTIVE
* INELIGIBLE_AUTHORITY
* CUSTOM

필수 필드:

* approval_authority_conflict_id
* approval_request_id
* approval_case_id
* subject_id
* authority_candidates
* conflict_type
* conflicting entries
* amount
* currency
* resource
* legal entity
* effective period
* severity
* resolution policy
* resolved authority
* resolved result
* resolved_by
* resolved_at
* status
* evidence

---

# 54. Conflict Resolution 원칙

권장 기본 순서:

1. Explicit DENY
2. Mandatory Platform Financial Control
3. Explicit Approved Subject Restriction
4. Exact Legal Entity Rule
5. Exact Resource Rule
6. Exact Position Rule
7. Exact Role Rule
8. Exact Organization Rule
9. Country·Region Rule
10. Tenant Default
11. Platform Default
12. Manual Review
13. Block

더 높은 Allow Limit을 임의로 선택하지 마라.

---

# 55. Authority Snapshot

`APPROVAL_AUTHORITY_SNAPSHOT`

필수 필드:

* approval_authority_snapshot_id
* snapshot_type
* approval_request_id
* approval_request_version_id
* approval_case_id
* approval_case_version_id
* approval_item_id
* approval_requirement_id
* chain_resolution_level_id
* subject_id
* role_id
* position_id
* organization_id
* legal_entity_id
* authority_matrix_id
* authority_matrix_version_id
* matrix_entry_id
* authority_definition_id
* authority_version_id
* authority_type
* authority_domain
* action
* resource
* original_amount
* original_currency
* converted_amount
* comparison_currency
* fx_reference
* amount_band
* limit_period
* utilization reference
* remaining authority
* eligibility result
* conflict result
* resolution result
* policy versions
* effective_at
* captured_at
* immutable_hash
* status
* evidence

Snapshot Type:

* CASE_CREATION
* CHAIN_RESOLUTION
* CANDIDATE_RESOLUTION
* TASK_ASSIGNMENT
* TASK_CLAIM
* DECISION_ATTEMPT
* DECISION_COMMIT
* AUTHORITY_REEVALUATION
* AUTHORITY_CHANGE
* REOPEN
* MIGRATION
* SIMULATION
* AUDIT_RECONSTRUCTION

---

# 56. Snapshot 원칙

* Snapshot 생성 후 직접 수정 금지
* Current Authority로 과거 Snapshot 대체 금지
* Matrix Version 저장
* Authority Version 저장
* Matrix Entry 저장
* Actor Role·Position Version 저장
* Legal Entity·Organization Scope 저장
* Original·Converted Amount 저장
* FX Reference 저장
* Limit Period 저장
* Utilization Reference 저장
* Remaining Authority 저장
* Allow·Deny Rule 저장
* Conflict Resolution 저장
* Immutable Hash 검증

---

# 57. Authority Effective Dating

모든 Authority Entity에 다음을 적용하라.

* business_valid_from
* business_valid_to
* system_recorded_from
* system_recorded_to
* timezone
* future_dated 여부
* retroactive 여부
* correction 여부
* source_effective_date

과거 Authority를 현재 Role·Position 기준으로 재해석하지 마라.

---

# 58. Future-Dated Authority Change

지원 변경:

* Amount Limit 증가·감소
* Currency 변경
* Scope 변경
* Role 변경
* Position 변경
* Legal Entity 변경
* Country·Region 변경
* Resource Scope 변경
* Action Scope 변경
* Period Limit 변경
* Deny Rule 추가
* Authority 종료
* Subject Exception 추가
* Matrix Version 교체

Future Change에는 다음을 기록한다.

* scheduled effective date
* predecessor version
* successor version
* affected actors
* affected roles
* affected positions
* affected legal entities
* affected chain levels
* affected active tasks
* simulation result
* validation result
* activation result
* evidence

---

# 59. Retroactive Authority Correction

과거 Authority 오류를 수정할 때 다음을 강제하라.

* Correction Reason
* Authorized Requester
* Approval Reference
* Original Authority Version
* Correction Authority Version
* Original Matrix Entry
* Corrected Matrix Entry
* Affected Period
* Affected Approval Cases
* Affected Decisions
* Financial Exposure
* Snapshot Preservation
* Reconciliation
* Manual Review
* Audit Reconstruction

완료된 Decision Evidence를 덮어쓰지 마라.

---

# 60. Authority Change Impact

Authority 변경 시 다음 영향을 계산하라.

* Active Approval Candidate
* Unassigned Approval Level
* Assigned Task
* Claimed Task
* Pending Decision
* Approval Chain Resolution
* Delegation Reference
* Authority Utilization
* Reserved Amount
* Notification Recipient
* Reconciliation State
* Future Scheduled Approval
* Existing Snapshot

기본 정책:

* 완료 Decision: 당시 Snapshot 유지
* 미할당 Level: 재평가 가능
* 할당 Task: 정책에 따라 재검증
* Claim Task: Decision 시 재검증
* Authority 감소: Pending High-value Task 우선 재검증
* Explicit Deny 추가: Active Decision Attempt 차단
* Legal Entity 제거: 즉시 Runtime Guard
* Security Suspension: 즉시 차단

---

# 61. Authority Simulation

`APPROVAL_AUTHORITY_SIMULATION`

필수 필드:

* approval_authority_simulation_id
* simulation_type
* authority_matrix_id
* authority_matrix_version_id
* authority_definition_id
* authority_version_id
* subject_id
* role_id
* position_id
* organization_id
* legal_entity_id
* region
* country
* authority_domain
* authority_type
* action
* resource_type
* resource_id
* original_amount
* original_currency
* comparison_amount
* comparison_currency
* fx_reference
* limit_period
* utilization input
* simulated candidates
* simulated conflicts
* simulated result
* next level result
* manual review result
* simulation_hash
* status
* evidence

Simulation Type:

* SINGLE_ACTOR
* SINGLE_REQUEST
* BATCH_REQUEST
* MATRIX_VERSION_COMPARISON
* FUTURE_EFFECTIVE
* LIMIT_CHANGE_IMPACT
* CURRENCY_CHANGE_IMPACT
* LEGAL_ENTITY_CHANGE_IMPACT
* ROLE_CHANGE_IMPACT
* POSITION_CHANGE_IMPACT
* HISTORICAL_REPLAY
* CUSTOM

Simulation은 실제 Authority Utilization, Task 또는 Decision을 생성하지 않아야 한다.

---

# 62. Simulation 검증

Simulation에서 다음을 확인하라.

* Authority Candidate
* Allow Rule
* Deny Rule
* Winning Rule
* Threshold Match
* Threshold Gap
* Threshold Overlap
* Currency Conversion
* FX Rate 상태
* Period Limit
* Utilization
* Remaining Authority
* Legal Entity Match
* Resource Match
* Action Match
* Self-approval
* SoD Hook
* Next Level Requirement
* Manual Review
* Version 간 차이
* Active Task 영향

---

# 63. Authority Reconciliation

`APPROVAL_AUTHORITY_RECONCILIATION`

다음을 비교하라.

* ERP DOA Matrix vs Canonical Authority
* Finance Spreadsheet vs Canonical Matrix
* HRIS Job Level vs Authority Binding
* Role Assignment vs Role Authority
* Position Incumbent vs Position Authority
* Organization Owner vs Organization Authority
* Legal Entity Officer vs Legal Entity Authority
* Cost Center Owner vs Cost Center Authority
* Budget Owner vs Budget Authority
* Program Owner vs Program Authority
* Approval Chain Level vs Authority Requirement
* Resolved Participant vs Authority Candidate
* Task Assignee vs Authority Resolution
* Claim Actor vs Authority Snapshot
* Decision Actor vs Authority Snapshot
* Decision Amount vs Authority Limit
* Decision Currency vs Currency Scope
* Decision Date vs Effective Period
* Cumulative Usage vs Limit
* Current Matrix Version vs Case Snapshot
* Future Version vs Scheduled Activation
* External BPM Threshold vs Canonical Threshold
* Manual Override vs Approved Exception Reference

필수 필드:

* approval_authority_reconciliation_id
* approval_request_id
* approval_case_id
* approval_item_id
* subject_id
* authority_matrix_id
* authority_matrix_version_id
* authority_definition_id
* authority_version_id
* comparison_type
* source_state
* canonical_state
* amount
* currency
* difference
* affected task
* affected decision
* severity
* detected_at
* resolution
* resolved_by
* resolved_at
* status
* evidence

---

# 64. Reconciliation 상태

* MATCH
* ERP_DOA_MISMATCH
* FINANCE_MATRIX_MISMATCH
* JOB_LEVEL_BINDING_MISMATCH
* ROLE_AUTHORITY_MISMATCH
* POSITION_AUTHORITY_MISMATCH
* ORGANIZATION_AUTHORITY_MISMATCH
* LEGAL_ENTITY_AUTHORITY_MISMATCH
* COST_CENTER_AUTHORITY_MISMATCH
* BUDGET_AUTHORITY_MISMATCH
* PROGRAM_AUTHORITY_MISMATCH
* CHAIN_LEVEL_AUTHORITY_MISMATCH
* PARTICIPANT_AUTHORITY_MISMATCH
* TASK_ASSIGNEE_AUTHORITY_MISMATCH
* CLAIM_ACTOR_AUTHORITY_MISMATCH
* DECISION_ACTOR_AUTHORITY_MISMATCH
* DECISION_AMOUNT_LIMIT_MISMATCH
* DECISION_CURRENCY_MISMATCH
* DECISION_EFFECTIVE_DATE_MISMATCH
* CUMULATIVE_LIMIT_MISMATCH
* MATRIX_VERSION_SNAPSHOT_MISMATCH
* FUTURE_CHANGE_SCHEDULING_MISMATCH
* EXTERNAL_THRESHOLD_MISMATCH
* OVERRIDE_REFERENCE_MISMATCH
* MANUAL_REVIEW
* BLOCKED

---

# 65. Critical Gap 후보

다음은 High 또는 Critical로 처리하라.

* Authority Version 없이 Approval Decision 허용
* Matrix Version 없이 Authority 판정
* Actor에게 Authority가 없는데 승인 성공
* Amount가 Limit을 초과했는데 승인 성공
* Explicit Deny가 있는데 승인 성공
* Wrong Tenant Authority 사용
* Wrong Legal Entity Authority 사용
* Wrong Currency Authority 사용
* FX Rate 없이 Currency 변환 승인
* Stale FX Rate로 고액 승인
* Threshold Gap으로 승인 Actor 미결정
* Threshold Overlap으로 복수 Authority 충돌
* 동일 Actor의 누적 Limit 초과
* Position Vacancy Actor에게 Authority 부여
* Terminated Subject의 Active Authority
* Expired Authority로 승인
* Self-approval Policy 우회
* SoD Failure 무시
* Authority Snapshot 누락
* Current Matrix로 과거 Decision 재해석
* Task Assignee와 Authority Resolution 불일치
* Decision Actor와 Authority Snapshot 불일치
* Authority 감소 후 고액 Pending Task 미재검증
* Customer Customization으로 Mandatory Financial Limit 제거
* Static Subject Authority에 종료일·사유 없음
* Manager에게 자동 Monetary Authority 부여
* Role 이름 문자열로 Authority 판정
* Spreadsheet와 Canonical Matrix Drift 미탐지

---

# 66. 최소 Static Lint

이번 블록에서는 다음을 차단하라.

* Tenant 없는 Authority Definition
* Authority Type 없는 Definition
* Authority Domain 없는 Definition
* Effect 없는 Authority
* Active Version 없는 Active Authority
* Matrix 없는 Monetary Authority
* Matrix Version 없는 Active Matrix
* Amount Band 없는 Monetary Entry
* Currency Scope 없는 Monetary Entry
* Lower Bound > Upper Bound
* Overlapping Threshold
* Threshold Gap
* Inclusive Boundary 충돌
* Legal Entity Scope 없는 Financial Authority
* Action Scope 없는 Approval Authority
* Subject Authority 사유 누락
* Subject Authority 종료일·Review Date 누락
* Role Name 문자열 기반 Binding
* Position Vacancy Policy 누락
* Cross-Tenant Binding
* Active Version 직접 수정
* Snapshot 직접 수정
* Explicit Deny Effect 누락
* Limit Period 없는 Cumulative Authority
* Utilization Source 없는 Period Limit
* Missing FX Policy
* Mandatory Financial Control 제거
* 기존 Authority Matrix 중복 생성

---

# 67. 최소 Runtime Guard

다음을 차단하라.

* Authority Registry Not Found
* Authority Definition Not Found
* Authority Version Inactive
* Matrix Not Found
* Matrix Version Inactive
* Matrix Entry Inactive
* Subject Inactive
* Role Inactive
* Position Vacant
* Tenant Mismatch
* Workspace Mismatch
* Legal Entity Mismatch
* Organization Mismatch
* Geography Mismatch
* Resource Mismatch
* Action Mismatch
* Currency Mismatch
* FX Rate Unavailable
* FX Rate Stale
* Amount Below Floor
* Amount Above Ceiling
* Threshold Gap
* Threshold Conflict
* Limit Period Exhausted
* Cumulative Limit Exceeded
* Explicit Deny
* Eligibility Failed
* Security Blocked
* Self-approval Blocked
* SoD Failed
* Conflict of Interest
* Authority Conflict Unresolved
* Snapshot Missing
* Snapshot Hash Invalid
* Task Assignee Drift
* Decision Actor Drift
* Authority Changed Since Claim
* Critical Reconciliation Drift
* Future Version Activation Failed
* Kill Switch 활성

---

# 68. Error Contract

* APPROVAL_AUTHORITY_REGISTRY_NOT_FOUND
* APPROVAL_AUTHORITY_TYPE_NOT_FOUND
* APPROVAL_AUTHORITY_DOMAIN_NOT_FOUND
* APPROVAL_AUTHORITY_DEFINITION_NOT_FOUND
* APPROVAL_AUTHORITY_VERSION_NOT_FOUND
* APPROVAL_AUTHORITY_VERSION_INACTIVE
* APPROVAL_AUTHORITY_VERSION_IMMUTABLE
* APPROVAL_AUTHORITY_MATRIX_NOT_FOUND
* APPROVAL_AUTHORITY_MATRIX_VERSION_NOT_FOUND
* APPROVAL_AUTHORITY_MATRIX_VERSION_INACTIVE
* APPROVAL_AUTHORITY_MATRIX_ENTRY_NOT_FOUND
* APPROVAL_AUTHORITY_MATRIX_ENTRY_INACTIVE
* APPROVAL_AUTHORITY_BINDING_INVALID
* APPROVAL_AUTHORITY_SUBJECT_INACTIVE
* APPROVAL_AUTHORITY_ROLE_INACTIVE
* APPROVAL_AUTHORITY_POSITION_VACANT
* APPROVAL_AUTHORITY_TENANT_MISMATCH
* APPROVAL_AUTHORITY_WORKSPACE_MISMATCH
* APPROVAL_AUTHORITY_LEGAL_ENTITY_MISMATCH
* APPROVAL_AUTHORITY_ORGANIZATION_MISMATCH
* APPROVAL_AUTHORITY_GEOGRAPHY_MISMATCH
* APPROVAL_AUTHORITY_RESOURCE_MISMATCH
* APPROVAL_AUTHORITY_ACTION_MISMATCH
* APPROVAL_AUTHORITY_CURRENCY_MISMATCH
* APPROVAL_AUTHORITY_FX_RATE_UNAVAILABLE
* APPROVAL_AUTHORITY_FX_RATE_STALE
* APPROVAL_AUTHORITY_AMOUNT_BELOW_FLOOR
* APPROVAL_AUTHORITY_AMOUNT_ABOVE_CEILING
* APPROVAL_AUTHORITY_THRESHOLD_GAP
* APPROVAL_AUTHORITY_THRESHOLD_CONFLICT
* APPROVAL_AUTHORITY_LIMIT_PERIOD_EXHAUSTED
* APPROVAL_AUTHORITY_CUMULATIVE_LIMIT_EXCEEDED
* APPROVAL_AUTHORITY_EXPLICITLY_DENIED
* APPROVAL_AUTHORITY_ELIGIBILITY_FAILED
* APPROVAL_AUTHORITY_SELF_APPROVAL_BLOCKED
* APPROVAL_AUTHORITY_SOD_FAILED
* APPROVAL_AUTHORITY_CONFLICT_OF_INTEREST
* APPROVAL_AUTHORITY_CONFLICT_UNRESOLVED
* APPROVAL_AUTHORITY_SNAPSHOT_MISSING
* APPROVAL_AUTHORITY_SNAPSHOT_INVALID
* APPROVAL_AUTHORITY_TASK_ASSIGNEE_DRIFT
* APPROVAL_AUTHORITY_DECISION_ACTOR_DRIFT
* APPROVAL_AUTHORITY_REVALIDATION_REQUIRED
* APPROVAL_AUTHORITY_RECONCILIATION_FAILED
* APPROVAL_AUTHORITY_RUNTIME_BLOCKED

---

# 69. Warning Contract

* APPROVAL_AUTHORITY_SOURCE_WARNING
* APPROVAL_AUTHORITY_VERSION_WARNING
* APPROVAL_AUTHORITY_MATRIX_WARNING
* APPROVAL_AUTHORITY_BINDING_WARNING
* APPROVAL_AUTHORITY_SUBJECT_EXCEPTION_WARNING
* APPROVAL_AUTHORITY_POSITION_WARNING
* APPROVAL_AUTHORITY_LEGAL_ENTITY_WARNING
* APPROVAL_AUTHORITY_GEOGRAPHIC_WARNING
* APPROVAL_AUTHORITY_RESOURCE_WARNING
* APPROVAL_AUTHORITY_ACTION_WARNING
* APPROVAL_AUTHORITY_THRESHOLD_WARNING
* APPROVAL_AUTHORITY_CURRENCY_WARNING
* APPROVAL_AUTHORITY_FX_WARNING
* APPROVAL_AUTHORITY_UTILIZATION_WARNING
* APPROVAL_AUTHORITY_ELIGIBILITY_WARNING
* APPROVAL_AUTHORITY_CONFLICT_WARNING
* APPROVAL_AUTHORITY_CHANGE_IMPACT_WARNING
* APPROVAL_AUTHORITY_SIMULATION_WARNING
* APPROVAL_AUTHORITY_RECONCILIATION_WARNING
* APPROVAL_AUTHORITY_MANUAL_REVIEW_REQUIRED

---

# 70. Evidence Contract

`APPROVAL_AUTHORITY_EVIDENCE`

필수 필드:

* evidence_id
* tenant_id
* approval_request_id
* approval_request_version_id
* approval_case_id
* approval_case_version_id
* approval_item_id
* approval_requirement_id
* approval_chain_resolution_id
* resolution_level_id
* subject_id
* role_id
* role_version
* position_id
* position_version
* organization_id
* legal_entity_id
* authority_registry
* authority_type
* authority_domain
* authority_definition
* authority_version
* authority_matrix
* authority_matrix_version
* matrix_entry
* binding references
* action
* resource
* original amount
* original currency
* converted amount
* comparison currency
* fx reference
* amount band
* threshold
* limit period
* utilization reference
* remaining authority
* eligibility result
* allow rules
* deny rules
* conflict result
* resolution result
* snapshot reference
* simulation reference
* reconciliation reference
* effective_at
* recorded_at
* immutable_hash
* lineage
* audit reference

다음을 저장하지 마라.

* Password
* Access Token
* Credential Secret
* Bank Account 전체 값
* Card Number
* 급여 원문
* 민감 HR 평가
* 전체 ERP Payload
* 전체 FX Provider Secret
* 내부 Fraud Model 원문
* 불필요한 PII

---

# 71. Audit Event

`APPROVAL_AUTHORITY_AUDIT_EVENT`

지원 Event:

* APPROVAL_AUTHORITY_REGISTRY_CREATED
* APPROVAL_AUTHORITY_TYPE_CREATED
* APPROVAL_AUTHORITY_DOMAIN_CREATED
* APPROVAL_AUTHORITY_DEFINITION_CREATED
* APPROVAL_AUTHORITY_VERSION_CREATED
* APPROVAL_AUTHORITY_VALIDATED
* APPROVAL_AUTHORITY_APPROVED
* APPROVAL_AUTHORITY_ACTIVATED
* APPROVAL_AUTHORITY_SUSPENDED
* APPROVAL_AUTHORITY_MATRIX_CREATED
* APPROVAL_AUTHORITY_MATRIX_VERSION_CREATED
* APPROVAL_AUTHORITY_MATRIX_ENTRY_CREATED
* APPROVAL_AUTHORITY_SUBJECT_BOUND
* APPROVAL_AUTHORITY_ROLE_BOUND
* APPROVAL_AUTHORITY_POSITION_BOUND
* APPROVAL_AUTHORITY_ORGANIZATION_BOUND
* APPROVAL_AUTHORITY_LEGAL_ENTITY_BOUND
* APPROVAL_AUTHORITY_RESOURCE_BOUND
* APPROVAL_AUTHORITY_ACTION_BOUND
* APPROVAL_AUTHORITY_THRESHOLD_CREATED
* APPROVAL_AUTHORITY_CURRENCY_SCOPE_CREATED
* APPROVAL_AUTHORITY_CANDIDATE_CREATED
* APPROVAL_AUTHORITY_RESOLUTION_STARTED
* APPROVAL_AUTHORITY_RESOLVED
* APPROVAL_AUTHORITY_DENIED
* APPROVAL_AUTHORITY_LIMIT_EXCEEDED
* APPROVAL_AUTHORITY_PERIOD_LIMIT_EXCEEDED
* APPROVAL_AUTHORITY_CONFLICT_DETECTED
* APPROVAL_AUTHORITY_SNAPSHOT_CREATED
* APPROVAL_AUTHORITY_CHANGE_IMPACT_DETECTED
* APPROVAL_AUTHORITY_REVALIDATION_REQUESTED
* APPROVAL_AUTHORITY_SIMULATION_STARTED
* APPROVAL_AUTHORITY_SIMULATION_COMPLETED
* APPROVAL_AUTHORITY_DRIFT_DETECTED
* RETROACTIVE_AUTHORITY_CORRECTION_RECORDED
* MANUAL_REVIEW_REQUESTED

---

# 72. 기존 구현 분류

기존 구현을 다음으로 분류하라.

* `CANONICAL_APPROVAL_AUTHORITY_REGISTRY`
* `CANONICAL_APPROVAL_AUTHORITY_TYPE`
* `CANONICAL_APPROVAL_AUTHORITY_DOMAIN`
* `CANONICAL_APPROVAL_AUTHORITY_DEFINITION`
* `CANONICAL_APPROVAL_AUTHORITY_VERSION`
* `CANONICAL_APPROVAL_AUTHORITY_MATRIX`
* `CANONICAL_APPROVAL_AUTHORITY_MATRIX_VERSION`
* `CANONICAL_APPROVAL_AUTHORITY_MATRIX_ENTRY`
* `CANONICAL_APPROVAL_AUTHORITY_BINDING`
* `CANONICAL_APPROVAL_AUTHORITY_AMOUNT_BAND`
* `CANONICAL_APPROVAL_AUTHORITY_CURRENCY_SCOPE`
* `CANONICAL_APPROVAL_AUTHORITY_THRESHOLD`
* `CANONICAL_APPROVAL_AUTHORITY_LIMIT_PERIOD`
* `CANONICAL_APPROVAL_AUTHORITY_ELIGIBILITY`
* `CANONICAL_APPROVAL_AUTHORITY_CANDIDATE`
* `CANONICAL_APPROVAL_AUTHORITY_RESOLUTION`
* `CANONICAL_APPROVAL_AUTHORITY_CONFLICT`
* `CANONICAL_APPROVAL_AUTHORITY_SNAPSHOT`
* `CANONICAL_APPROVAL_AUTHORITY_SIMULATION`
* `CANONICAL_APPROVAL_AUTHORITY_RECONCILIATION`
* `VALIDATED_ERP_DOA_SOURCE`
* `VALIDATED_FINANCE_MATRIX_SOURCE`
* `EXTERNAL_AUTHORITY_ADAPTER`
* `VALIDATED_LEGACY`
* `LEGACY_ADAPTER`
* `MIGRATION_REQUIRED`
* `CONSOLIDATION_REQUIRED`
* `DEPRECATION_CANDIDATE`
* `KEEP_SEPARATE_WITH_REASON`
* `BLOCKED_CROSS_TENANT`
* `BLOCKED_FINANCIAL_CONTROL_RISK`
* `BLOCKED_HISTORICAL_INTEGRITY_RISK`
* `BLOCKED_THRESHOLD_CONFLICT`
* `UNVERIFIED`
* `TEST_ONLY`

---

# 73. 중복 구현 감사

다음을 전수 탐지하라.

* 여러 Authority Matrix
* 여러 DOA Table
* 여러 Approval Limit Table
* 여러 Financial Threshold Table
* Role별 하드코딩 Limit
* Job Grade별 하드코딩 Limit
* API Handler Amount 조건
* Workflow 내부 Amount Branch
* BPMN 내부 Threshold
* Tenant별 JSON Limit
* Spreadsheet 전용 Authority
* ERP와 Platform 이중 Authority
* Subject별 직접 Authority 남용
* Current Authority만 저장
* Authority Version 없음
* Authority Snapshot 없음
* Currency Conversion 근거 없음
* Legal Entity Scope 없음
* Period Limit 없음
* Utilization 계산 중복
* Manager에게 자동 Authority
* Position Vacancy Actor 승인
* Expired Authority 승인
* Deny보다 Allow 우선
* Threshold Gap
* Threshold Overlap
* 동일 Decision에서 다른 Matrix 사용
* Task Assignment 시 Authority 미검증
* Decision 시 Authority 재검증 없음
* Role Name 문자열 Join
* Email 기반 Authority Mapping

---

# 74. API Contract

기존 API Convention에 따라 최소 다음 기능을 제공하라.

## Registry·Definition

* Authority Registry 조회
* Authority Type 조회
* Authority Domain 조회
* Authority Definition 생성·수정
* Authority Version 생성
* Version 검증
* Version 승인
* Version 활성화
* Version History 조회
* 특정 날짜 Active Version 조회

## Matrix

* Matrix 생성·수정
* Matrix Version 생성
* Matrix Entry 생성
* Entry 종료
* Entry History 조회
* Overlap·Gap 검증
* Matrix Compare

## Binding

* Subject Binding
* Role Binding
* Position Binding
* Organization Binding
* Legal Entity Binding
* Geographic Binding
* Resource Binding
* Action Binding
* Binding History 조회

## Threshold·Currency

* Amount Band 생성
* Threshold 생성
* Currency Scope 생성
* FX Reference 검증
* Limit Period 생성
* Utilization Reference 조회

## Candidate·Resolution

* Authority Candidate 생성
* Candidate Exclusion
* Authority Resolution 실행
* Allow·Deny Rule 조회
* Remaining Authority 조회
* Next Level 결과 조회
* Conflict 조회
* Manual Resolution

## Snapshot·Simulation

* Authority Snapshot 생성
* Snapshot 조회
* Snapshot Hash 검증
* Simulation 실행
* Version Comparison
* Limit Change Impact
* Historical Replay

## Reconciliation

* ERP DOA 비교
* Finance Matrix 비교
* Task·Decision 비교
* Drift 조회
* Manual Resolution
* Reconciliation History

모든 API에 다음을 적용하라.

* Tenant Context
* Authorization
* Idempotency
* Optimistic Lock
* Effective Date Validation
* Version Validation
* Monetary Precision Validation
* Audit
* Evidence
* Rate Limit
* Pagination
* Error Contract

---

# 75. Index·Performance

최소 다음 조회를 최적화하라.

* Tenant별 Active Authority
* Domain별 Authority
* Type별 Authority
* Subject별 Authority
* Role별 Authority
* Position별 Authority
* Organization별 Authority
* Legal Entity별 Authority
* Country·Region별 Authority
* Resource별 Authority
* Action별 Authority
* Currency별 Authority
* Amount Band별 Entry
* Effective Date 기준 Authority
* Limit Period별 Utilization
* Approval Case별 Resolution
* Subject별 Remaining Authority
* Conflict 상태
* Future Authority Version
* Authority Snapshot
* Reconciliation Mismatch

---

# 76. Cache 원칙

Authority Resolution Cache Key에는 최소 다음을 포함하라.

* tenant_id
* subject_id
* role_assignment_version
* position_incumbency_version
* authority_domain
* authority_type
* action
* resource_type
* resource_id
* resource_version
* organization_id
* legal_entity_id
* region
* country
* original_amount
* original_currency
* comparison_currency
* authority_matrix_version_id
* authority_version_id
* limit_period
* utilization_version
* effective_date
* policy_version_set_hash

다음을 적용하라.

* Version-aware Cache
* Tenant-isolated Cache
* Actor-assignment-aware Cache
* Resource-version-aware Cache
* Amount·Currency-aware Cache
* Effective-date-aware Cache
* Authority Version 활성화 시 Invalidation
* Role·Position 변경 시 Invalidation
* Legal Entity 변경 시 Invalidation
* Threshold 변경 시 Invalidation
* FX Reference 변경 시 정책 기반 처리
* Utilization 변경 시 Invalidation
* Explicit Deny 추가 시 즉시 Invalidation
* Critical Drift 시 Cache 차단
* 과거 Snapshot은 Current Cache로 재생성 금지

---

# 77. 테스트 범위

## Unit Test

* Authority Definition 생성
* Authority Version 생성
* Matrix Entry 생성
* Subject·Role·Position Binding
* Legal Entity Binding
* Amount Band 경계
* Threshold Gap
* Threshold Overlap
* Currency Scope
* FX Conversion
* Period Limit
* Explicit Deny
* Specificity Resolution
* Conflict Resolution
* Snapshot Hash
* Simulation

## Integration Test

* Approval Chain Level 연계
* Role Assignment 연계
* Position Incumbency 연계
* Cost Center Authority
* Budget Authority
* Program Authority
* Rebate Authority
* Claim Authority
* Settlement Authority
* Payment Authority
* ERP DOA Import
* Finance Matrix Import
* Task Assignment
* Decision Revalidation
* Reconciliation

## Property Test

* Threshold Non-overlap
* Threshold Coverage
* Tenant Isolation
* Immutable Version
* Deterministic Resolution
* Explicit Deny Precedence
* Currency Conversion Determinism
* Snapshot Determinism
* Cumulative Limit Monotonicity
* Legal Entity Boundary Preservation

## Concurrency Test

* 동일 Authority Version 동시 생성
* Matrix Version 동시 활성화
* 동일 Subject Authority 동시 변경
* Utilization 동시 예약
* 동일 Decision Authority 동시 검증
* Future Version Scheduler 중복 실행

## Security Test

* Cross-Tenant Authority 사용
* Cross-Legal-Entity Authority 우회
* Unauthorized Subject Authority 생성
* Mandatory Financial Limit 제거
* Historical Snapshot 변조
* Role 이름 위조
* FX Rate 위조
* Utilization Race Condition
* Explicit Deny 우회
* Self-approval 우회

## Regression Test

* 기존 Approval Chain
* 기존 Workflow
* 기존 Manager Resolution
* 기존 Finance Approval
* 기존 Rebate Approval
* 기존 Claim Approval
* 기존 Settlement
* 기존 Payment·Payout
* 기존 ERP Integration
* 기존 Notification
* 기존 Audit

---

# 78. 실행 절차

## Step 1 — 기존 Authority·DOA 전수 조사

Repository, ERP, Finance Spreadsheet, Workflow, BPMN, JSON Configuration 및 Tenant Setting을 조사한다.

## Step 2 — Authority Source of Truth 결정

Authority Type별 Authoritative Source와 Source Priority를 정의한다.

## Step 3 — Authority Registry·Type·Domain 구축

Platform·Tenant·Financial·Rebate Authority를 표준화한다.

## Step 4 — Authority Definition·Version 구축

정책 Definition과 Immutable 실행 Version을 분리한다.

## Step 5 — Authority Matrix·Version 구축

Matrix와 Entry Version을 관리한다.

## Step 6 — Binding 구축

Subject·Role·Position·Organization·Legal Entity·Geography·Resource·Action Binding을 구현한다.

## Step 7 — Amount Band 구축

Floor, Ceiling, Inclusive Boundary 및 Amount Basis를 구현한다.

## Step 8 — Currency Scope 구축

Single·Multi Currency와 FX Reference를 구현한다.

## Step 9 — Threshold 구축

Amount·Cumulative·Incremental Threshold를 구현한다.

## Step 10 — Limit Period 구축

Per Transaction·Monthly·Annual·Rolling Limit을 구현한다.

## Step 11 — Utilization Foundation 구축

Pending·Reserved·Approved·Reversed 사용량 Reference를 구현한다.

## Step 12 — Domain Authority 구축

Spending, Commitment, Budget, Rebate, Claim, Settlement, Payment, Refund, Credit, Write-off 및 Contract Authority를 구현한다.

## Step 13 — Eligibility 구축

Actor, Role, Position, Tenant, Legal Entity, Scope 및 Security 상태를 검증한다.

## Step 14 — Candidate 구축

Chain Participant별 Authority Candidate를 생성한다.

## Step 15 — Resolution 구축

Amount·Currency·Scope·Period·Deny Rule을 평가한다.

## Step 16 — Conflict 구축

Allow·Deny, Limit, Scope 및 Source Conflict를 관리한다.

## Step 17 — Snapshot 구축

Assignment·Claim·Decision 시점 Authority를 불변 저장한다.

## Step 18 — Effective Dating 구축

Future·Historical·Retroactive Authority를 지원한다.

## Step 19 — Change Impact 구축

Active Task, Claimed Task 및 Pending Decision 영향을 계산한다.

## Step 20 — Simulation 구축

Limit·Currency·Version·Legal Entity 변경 Scenario를 검증한다.

## Step 21 — Reconciliation 구축

ERP·Finance·Role·Position·Task·Decision 상태를 비교한다.

## Step 22 — Static Lint·Runtime Guard 구축

Threshold Gap, Limit 초과, Deny 우회 및 Drift를 차단한다.

## Step 23 — 기존 구현 분류·통합

중복 DOA, Limit Table 및 Workflow Threshold를 정리한다.

## Step 24 — 문서·ADR·History 갱신

모든 결정·Conflict·Migration·남은 위험을 기록한다.

---

# 79. 생성 또는 갱신할 문서

기존 동일 목적 문서가 있으면 통합하라.

* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_REGISTRY.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_DOMAIN.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_DEFINITION.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_EFFECT.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_ASSIGNMENT_BASIS.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_VERSION.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_VERSION_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_VERSION_STATUS.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_MIGRATION_POLICY.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_MATRIX.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_MATRIX_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_MATRIX_VERSION.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_MATRIX_ENTRY.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_BINDING.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_BINDING_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_SUBJECT_BINDING.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_ROLE_BINDING.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_POSITION_BINDING.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_ORGANIZATION_BINDING.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_LEGAL_ENTITY_BINDING.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_GEOGRAPHIC_BINDING.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_RESOURCE_BINDING.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_ACTION_BINDING.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_ACTION_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_AMOUNT_BAND.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_AMOUNT_BASIS.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_AMOUNT_BOUNDARY_POLICY.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_CURRENCY_SCOPE.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_CURRENCY_POLICY.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_FX_REFERENCE.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_FX_MISSING_RATE_POLICY.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_THRESHOLD.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_THRESHOLD_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_THRESHOLD_ACTION.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_LIMIT_PERIOD.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_PERIOD_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_UTILIZATION_REFERENCE.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_UTILIZATION_POLICY.md`
* `docs/segmentation/DSAR_MONETARY_APPROVAL_AUTHORITY.md`
* `docs/segmentation/DSAR_SPENDING_AUTHORITY.md`
* `docs/segmentation/DSAR_COMMITMENT_AUTHORITY.md`
* `docs/segmentation/DSAR_BUDGET_AUTHORITY.md`
* `docs/segmentation/DSAR_REBATE_AUTHORITY.md`
* `docs/segmentation/DSAR_CLAIM_AUTHORITY.md`
* `docs/segmentation/DSAR_SETTLEMENT_AUTHORITY.md`
* `docs/segmentation/DSAR_PAYMENT_AUTHORITY.md`
* `docs/segmentation/DSAR_PAYOUT_AUTHORITY.md`
* `docs/segmentation/DSAR_REFUND_AUTHORITY.md`
* `docs/segmentation/DSAR_CREDIT_AUTHORITY.md`
* `docs/segmentation/DSAR_WRITE_OFF_AUTHORITY.md`
* `docs/segmentation/DSAR_CONTRACT_AUTHORITY.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_ELIGIBILITY_PROFILE.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_ELIGIBILITY_POLICY.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_CANDIDATE.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_CANDIDATE_PRIORITY.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_CANDIDATE_EXCLUSION_REASON.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_RESOLUTION.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_RESOLUTION_RESULT.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_SPECIFICITY_POLICY.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_CONFLICT.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_CONFLICT_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_CONFLICT_RESOLUTION.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_SNAPSHOT.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_SNAPSHOT_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_EFFECTIVE_DATING.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_FUTURE_DATED_CHANGE.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_RETROACTIVE_CORRECTION.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_CHANGE_IMPACT.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_SIMULATION.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_SIMULATION_TYPE.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_RECONCILIATION.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_RECONCILIATION_STATUS.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_CRITICAL_GAP_POLICY.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_STATIC_LINT.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_RUNTIME_GUARDS.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_ERROR_WARNING_CONTRACT.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_EVIDENCE.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_AUDIT_EVENT.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_API_CONTRACT.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_INDEX_PERFORMANCE.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_CACHE_POLICY.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_DUPLICATE_IMPLEMENTATION_AUDIT.md`
* `docs/segmentation/DSAR_APPROVAL_AUTHORITY_FUNCTION_REGRESSION_GATE.md`
* `docs/architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md`
* `docs/pm/PM_CHANGE_HISTORY.md`
* `docs/pm/REPEAT_PROBLEM_HISTORY.md`
* `docs/pm/AGENT_EXECUTION_HISTORY.md`

---

# 80. Authority Matrix

| Authority | Version | Type | Domain | Binding | Legal Entity | Action | Currency | Amount Band | Period | Effect | Status |
| --------- | ------- | ---- | ------ | ------- | ------------ | ------ | -------- | ----------- | ------ | ------ | ------ |

---

# 81. Threshold Matrix

| Entry | Lower | Lower Inclusive | Upper | Upper Inclusive | Currency | Amount Basis | Period | Threshold Action | Status |
|---|---|---|---|---|---|---|---|---|---|---|

---

# 82. Actor Authority Matrix

| Subject | Role | Position | Organization | Legal Entity | Resource | Action | Limit | Currency | Remaining | Status |
| ------- | ---- | -------- | ------------ | ------------ | -------- | ------ | ----- | -------- | --------- | ------ |

---

# 83. Authority Resolution Matrix

| Case | Level | Actor | Authority Version | Amount | Currency | Limit | Utilization | Result | Next Level | Status |
| ---- | ----- | ----- | ----------------- | ------ | -------- | ----- | ----------- | ------ | ---------- | ------ |

---

# 84. Authority Conflict Matrix

| Actor | Authority A | Authority B | Conflict | Amount | Currency | Scope | Severity | Resolution | Status |
| ----- | ----------- | ----------- | -------- | ------ | -------- | ----- | -------- | ---------- | ------ |

---

# 85. Authority Simulation Matrix

| Simulation | Actor | Scenario | Amount | Currency | Matched Authority | Conflict | Remaining | Result | Status |
| ---------- | ----- | -------- | ------ | -------- | ----------------- | -------- | --------- | ------ | ------ |

---

# 86. Authority Reconciliation Matrix

| Case | Actor | Source Authority | Canonical Authority | Amount | Currency | Difference | Severity | Resolution | Status |
| ---- | ----- | ---------------- | ------------------- | ------ | -------- | ---------- | -------- | ---------- | ------ |

---

# 87. 검증 게이트

완료 전에 반드시 확인하라.

* Approval Authority Registry가 구축되었는가
* Authority Type과 Domain이 구축되었는가
* Authority Definition과 Version이 분리되는가
* Active Authority Version이 Immutable한가
* Authority Matrix와 Matrix Version이 구축되는가
* Matrix Entry가 Versioned되는가
* Subject·Role·Position Binding이 분리되는가
* Organization·Legal Entity Binding이 구축되는가
* Geographic·Resource·Action Binding이 구축되는가
* Manager와 Authority가 분리되는가
* Role 이름으로 Authority를 추론하지 않는가
* Amount Band가 구축되는가
* Boundary Inclusive·Exclusive가 명시되는가
* Threshold Gap·Overlap이 차단되는가
* Currency Scope가 구축되는가
* FX Reference가 Evidence로 저장되는가
* Per Transaction과 Cumulative Limit이 구분되는가
* Limit Period가 구축되는가
* Utilization Foundation이 구축되는가
* Spending·Commitment·Budget Authority가 구분되는가
* Rebate·Claim·Settlement Authority가 구분되는가
* Payment·Payout Authority가 구분되는가
* Refund·Credit·Write-off Authority가 구축되는가
* Contract Authority가 구축되는가
* Legal Entity Boundary가 적용되는가
* Explicit Deny가 Allow보다 우선하는가
* Authority Eligibility가 구축되는가
* Authority Candidate가 생성되는가
* Authority Resolution이 생성되는가
* Amount·Currency·Scope·Period가 모두 평가되는가
* Next Level Requirement가 Chain과 연결되는가
* Authority Conflict가 탐지되는가
* Authority Snapshot이 생성되는가
* 과거 Decision이 현재 Authority로 재해석되지 않는가
* Future-dated Authority가 지원되는가
* Retroactive Correction이 Version으로 기록되는가
* Authority Change Impact가 계산되는가
* Simulation이 실제 사용량·Task·Decision 없이 실행되는가
* ERP·Finance·Task·Decision Reconciliation이 작동하는가
* 최소 Static Lint·Runtime Guard가 작동하는가
* 기존 Authority 기능의 회귀가 없는가
* 중복 DOA Matrix가 생성되지 않았는가
* ADR·PM·Repeat Problem·Agent History가 갱신되었는가
* 다음 Delegation Foundation 단계가 실행 가능한가

---

# 88. 완료 보고 형식

다음 순서로 보고하라.

1. Approval Authority Registry 수
2. Authority Type 수
3. Authority Domain 수
4. Authority Definition 수
5. Authority Version 수
6. Active Authority Version 수
7. Scheduled Authority Version 수
8. Authority Matrix 수
9. Authority Matrix Version 수
10. Matrix Entry 수
11. Allow Entry 수
12. Deny Entry 수
13. Subject Binding 수
14. Role Binding 수
15. Position Binding 수
16. Organization Binding 수
17. Legal Entity Binding 수
18. Geographic Binding 수
19. Resource Binding 수
20. Action Binding 수
21. Amount Band 수
22. Threshold 수
23. Threshold Gap 수
24. Threshold Overlap 수
25. Currency Scope 수
26. FX Reference 수
27. FX Missing 수
28. FX Stale 수
29. Limit Period 수
30. Utilization Reference 수
31. Monetary Authority 수
32. Spending Authority 수
33. Commitment Authority 수
34. Budget Authority 수
35. Rebate Authority 수
36. Claim Authority 수
37. Settlement Authority 수
38. Payment Authority 수
39. Payout Authority 수
40. Refund Authority 수
41. Credit Authority 수
42. Write-off Authority 수
43. Contract Authority 수
44. Eligibility Profile 수
45. Authority Candidate 수
46. Candidate Exclusion 수
47. Authority Resolution 수
48. Authorized 수
49. Next Level Required 수
50. Denied 수
51. Limit Exceeded 수
52. Period Limit Exceeded 수
53. Explicit Deny 수
54. Authority Conflict 수
55. Allow·Deny Conflict 수
56. Scope Conflict 수
57. Currency Conflict 수
58. Authority Snapshot 수
59. Future-dated Authority Change 수
60. Retroactive Authority Correction 수
61. Active Task 영향 수
62. Claimed Task 재검증 수
63. Authority Simulation 수
64. Version Comparison Simulation 수
65. Simulation Conflict 수
66. Reconciliation Mismatch 수
67. ERP DOA Mismatch 수
68. Finance Matrix Mismatch 수
69. Task Assignee Drift 수
70. Decision Actor Drift 수
71. Decision Amount Limit Mismatch 수
72. Cumulative Limit Mismatch 수
73. Static Lint Rule 수
74. Runtime Guard 수
75. Existing Implementation 수
76. Duplicate Implementation 수
77. Migration Required 수
78. Manual Review 수
79. Function Regression 수
80. 생성·갱신한 문서
81. 남은 리스크
82. 다음 Delegation Foundation Governance 준비 상태

---

# 89. 완료 조건

다음 조건을 모두 충족해야 이번 블록을 완료로 인정한다.

1. Approval Authority Registry가 구축되었다.
2. Authority Type이 구축되었다.
3. Authority Domain이 구축되었다.
4. Authority Definition이 구축되었다.
5. Authority Version이 구축되었다.
6. Authority Matrix가 구축되었다.
7. Authority Matrix Version이 구축되었다.
8. Authority Matrix Entry가 구축되었다.
9. Authority Binding이 구축되었다.
10. Subject Binding이 구축되었다.
11. Role Binding이 구축되었다.
12. Position Binding이 구축되었다.
13. Organization Binding이 구축되었다.
14. Legal Entity Binding이 구축되었다.
15. Geographic Binding이 구축되었다.
16. Resource Binding이 구축되었다.
17. Action Binding이 구축되었다.
18. Amount Band가 구축되었다.
19. Currency Scope가 구축되었다.
20. FX Reference Contract가 구축되었다.
21. Threshold가 구축되었다.
22. Limit Period가 구축되었다.
23. Authority Utilization Foundation이 구축되었다.
24. Monetary Authority가 구축되었다.
25. Spending Authority가 구축되었다.
26. Commitment Authority가 구축되었다.
27. Budget Authority가 구축되었다.
28. Rebate Authority가 구축되었다.
29. Claim Authority가 구축되었다.
30. Settlement Authority가 구축되었다.
31. Payment Authority가 구축되었다.
32. Payout Authority가 구축되었다.
33. Refund Authority가 구축되었다.
34. Credit Authority가 구축되었다.
35. Write-off Authority가 구축되었다.
36. Contract Authority가 구축되었다.
37. Authority Eligibility Profile이 구축되었다.
38. Authority Candidate가 구축되었다.
39. Authority Resolution이 구축되었다.
40. Authority Resolution Result가 구축되었다.
41. Specificity Resolution이 구축되었다.
42. Explicit Deny 우선 정책이 구축되었다.
43. Authority Conflict가 구축되었다.
44. Authority Snapshot이 구축되었다.
45. Effective Dating이 구축되었다.
46. Future-dated Authority Change가 구축되었다.
47. Retroactive Authority Correction이 구축되었다.
48. Authority Change Impact가 구축되었다.
49. Authority Simulation이 구축되었다.
50. Authority Reconciliation이 구축되었다.
51. 최소 Static Lint가 구축되었다.
52. 최소 Runtime Guard가 구축되었다.
53. 기존 Authority 구현이 분류되었다.
54. 중복 DOA·Threshold 모델 통합 계획이 작성되었다.
55. 기존 정상 기능의 회귀가 없다.
56. ADR·PM Change History·Repeat Problem·Agent History가 갱신되었다.
57. 다음 Delegation Foundation Governance에서 사용할 검증된 Authority Foundation이 준비되었다.

---

# 90. 최종 실행 명령

지금 즉시 검증된 Approval Foundation, Approval Chain, Organization Hierarchy, Reporting Line, Identity, Role, Position, Legal Entity, Finance 및 Currency 기반 위에 Rebate Approval Authority Matrix Foundation Governance를 구축하라.

기존 Repository, Database, API, ERP, Finance Spreadsheet, BPMN, Workflow Configuration, Tenant Setting, Role Table, Position Table, Cost Center, Budget, Rebate, Claim, Settlement, Payment 및 Contract 코드에서 Approval Authority, DOA Matrix, Financial Limit, Spending Limit, Threshold 및 Currency Rule 구현을 전수 조사하라.

동일 목적 Authority Matrix, DOA Table, Limit Table 또는 Workflow Threshold가 존재하면 중복 생성하지 말고 Canonical Approval Authority Contract와 Adapter로 통합하라.

Manager Relationship과 Approval Authority를 동일시하지 마라.

Role 이름, Job Title, Position 이름 또는 이메일 문자열만으로 Authority를 판정하지 마라.

Approval Authority Registry, Type, Domain, Definition, Version, Matrix, Matrix Version, Entry, Binding, Amount Band, Currency Scope, Threshold, Limit Period, Eligibility, Candidate, Resolution, Conflict, Snapshot, Simulation 및 Reconciliation을 구축하라.

Active Authority Version과 Active Matrix Version을 직접 수정하지 말고 새 Version을 생성하라.

Authority Definition에 Effect, Assignment Basis, Tenant, Workspace, Organization, Legal Entity, Geography, Resource, Action, Amount, Currency, Period, Environment 및 Approval Chain Applicability를 기록하라.

Subject, Role, Position, Organization, Legal Entity, Geography, Resource 및 Action Authority Binding을 서로 분리하라.

Subject 직접 Authority에는 사유, 승인 근거, Review Date 또는 종료일, Conflict 검증 및 Audit을 강제하라.

Role Authority는 Canonical Role ID와 Role Version을 사용하라.

Position Authority는 Active Incumbent에게 Resolution 시 연결하고 Vacancy 상태에서는 승인 Actor로 자동 선택하지 마라.

Organization Authority 상속에는 Descendant Depth와 Legal Entity Boundary를 적용하라.

Cross-Legal-Entity Authority는 명시적인 Legal Entity Binding과 허용된 Target Entity를 요구하라.

Authority를 Approve, Reject, Return, Activate, Modify, Increase, Cancel, Reopen, Settle, Pay, Payout, Refund, Credit, Write-off, Commit, Sign 및 Release Action별로 구분하라.

Approve 권한이 있다고 해서 Pay, Payout, Activate 또는 Override 권한을 자동 부여하지 마라.

Monetary Authority에 Amount Basis, Lower Bound, Upper Bound, Inclusive Boundary, Currency, Conversion Policy, Rounding, Precision, Period 및 Aggregation Basis를 기록하라.

Threshold Gap, Threshold Overlap 및 Inclusive Boundary 충돌을 차단하라.

Amount가 Threshold와 정확히 같을 때 어느 Band에 속하는지 명확히 결정하라.

Request Total, Item Amount, Program Budget, Claim Amount, Settlement Amount, Payment Amount, Payout Amount, Refund Amount, Credit Amount, Write-off Amount, Contract Value, Annualized Value, Lifetime Value 및 Net Change를 서로 다른 Amount Basis로 지원하라.

Single Currency, Multi Currency, Base Currency Conversion, Legal Entity Functional Currency, Program Currency, Transaction Currency 및 Settlement Currency 정책을 지원하라.

FX 변환 시 Original Amount, Original Currency, Converted Amount, Comparison Currency, Rate, Rate Type, Rate Source, Rate Date, Retrieval Time, Rounding 및 Conversion Hash를 Evidence로 저장하라.

FX Rate가 없거나 Stale한 경우 Block, Previous Business Day, Latest with Warning, Contract Rate 또는 Manual Review 정책을 적용하라.

고액 Approval에서 오래된 FX Rate를 자동 허용하지 마라.

Per Transaction, Per Approval Case, Per Program, Per Cost Center, Daily, Monthly, Quarterly, Annual, Fiscal Period, Rolling Window 및 Lifetime Authority Limit을 지원하라.

Pending, Reserved, Approved, Committed, Paid, Reversed, Cancelled, Expired 및 Released 사용량을 구분하라.

Authority Remaining Amount 계산 정책을 Authority Type별로 Version 관리하라.

Spending Authority, Commitment Authority, Budget Authority, Rebate Authority, Claim Authority, Settlement Authority, Payment Authority, Payout Authority, Refund Authority, Credit Authority, Write-off Authority 및 Contract Authority를 분리하라.

Budget Owner라고 해서 Payment·Settlement Authority를 자동 부여하지 마라.

Commitment Authority와 실제 Payment Execution Authority를 동일시하지 마라.

Rebate Program Create, Approve, Activate, Modify, Budget Increase, Rule Change, Retroactive Change, Claim Approve, Settlement Approve, Payment Approve, Payout Release, Adjustment, Cancellation 및 Write-off Authority를 Action별로 분리하라.

Authority Eligibility에서 Identity, Employment, Role, Position, Tenant, Legal Entity, Organization, Geography, Resource, Action, Currency, Amount, Period, Security, Self-approval, SoD 및 Conflict-of-interest를 검증하라.

Approval Chain에서 Resolved Participant가 생성되면 해당 Actor의 Authority Candidate를 생성하라.

Authority Candidate에 Matrix, Matrix Version, Entry, Authority Version, Amount, Currency, FX, Amount Band, Limit Period, Utilization, Remaining Authority, Scope Match, Eligibility 및 Conflict를 기록하라.

Authority Resolution에서 Allow Rule, Deny Rule, Specificity, Source Priority, Threshold, Currency, Period Limit 및 Utilization을 평가하라.

Explicit DENY를 넓은 Allow Rule로 우회하지 못하게 하라.

Authority가 여러 개 일치할 때 단순히 가장 높은 Limit을 선택하지 말고 Subject, Position, Role, Organization, Legal Entity, Resource, Country, Region 및 Tenant Specificity를 평가하라.

Amount가 Actor의 Authority를 초과하면 Chain 정책에 따라 Next Level, Additional Approval, Manual Review, Deny 또는 Block 결과를 생성하라.

Authority Resolution에 Original Amount, Original Currency, Converted Amount, Comparison Currency, FX Reference, Remaining Authority, Effect, Eligibility, Conflict, Next Level 및 Resolution Hash를 기록하라.

Task Assignment, Task Claim, Decision Attempt 및 Decision Commit 시 Immutable Authority Snapshot을 생성하라.

Snapshot에 Actor Role·Position Version, Matrix Version, Authority Version, Matrix Entry, Scope, Amount, Currency, FX, Amount Band, Limit Period, Utilization, Remaining Authority, Allow·Deny Rules, Conflict 및 Resolution Result를 기록하라.

현재 Authority Matrix로 과거 Approval Decision을 재작성하지 마라.

Authority Definition, Version, Matrix, Entry 및 Binding에 Business Valid Time과 System Recorded Time을 적용하라.

Future-dated Limit, Currency, Scope, Role, Position, Legal Entity, Resource, Action, Period 및 Deny Rule 변경을 새 Version으로 예약하라.

Future Authority Version 활성화 전에 Simulation과 Active Task Impact Analysis를 실행하라.

Retroactive Authority Correction 시 Original Version, Correction Version, Affected Period, Affected Cases, Affected Decisions, Financial Exposure, Reconciliation 및 Audit Reconstruction을 기록하라.

완료된 Decision과 당시 Authority Snapshot을 덮어쓰지 마라.

Authority 변경 시 Unassigned Level, Assigned Task, Claimed Task, Pending Decision, Chain Resolution, Delegation Reference, Reserved Amount, Utilization 및 Reconciliation 영향을 계산하라.

Authority 감소, Explicit Deny 추가, Legal Entity 제거 및 Security Suspension이 발생하면 Active High-value Task를 즉시 재검증하라.

Authority Simulation에서 Single Actor, Single Request, Batch, Matrix Version Comparison, Future Effective, Limit Change, Currency Change, Legal Entity Change, Role Change, Position Change 및 Historical Replay를 지원하라.

Simulation은 실제 Authority Utilization, Approval Task, Decision 또는 Notification을 생성하지 않게 하라.

ERP DOA, Finance Matrix, HRIS Job Level, Role Assignment, Position Incumbent, Organization Owner, Legal Entity Officer, Cost Center Owner, Budget Owner, Program Owner, Chain Level, Participant, Task Assignee, Claim Actor, Decision Actor, Decision Amount, Currency, Effective Date, Cumulative Usage 및 Snapshot을 Canonical Authority와 Reconciliation하라.

Authority Version 누락, Matrix Version 누락, Limit 초과 승인, Explicit Deny 우회, Wrong Tenant, Wrong Legal Entity, Wrong Currency, FX Rate 누락, Threshold Gap, Threshold Overlap, Cumulative Limit 초과, Vacant Position Authority, Terminated Actor Authority, Snapshot 누락, Decision Actor Drift, Authority 감소 후 미재검증 및 Mandatory Financial Control 제거를 Critical Gap으로 생성하라.

Tenant 없는 Authority, Type·Domain·Effect 누락, Matrix 없는 Monetary Authority, Amount Band·Currency Scope 누락, Invalid Bound, Overlap, Gap, Legal Entity Scope 누락, Subject Authority 사유 누락, Role Name Binding, Cross-Tenant Binding, Active Version 직접 수정, Snapshot 수정, Period Limit Source 누락, FX Policy 누락 및 Mandatory Financial Control 제거를 Static Lint에서 차단하라.

Inactive Authority, Matrix·Entry 비활성, Actor·Role·Position 비활성, Tenant·Legal Entity·Organization·Geography·Resource·Action·Currency Mismatch, FX Rate 오류, Amount Floor·Ceiling 위반, Threshold Conflict, Period Limit Exhaustion, Explicit Deny, Eligibility Failure, Self-approval, SoD Failure, Conflict-of-interest, Unresolved Conflict, Snapshot 오류, Task Assignee Drift, Decision Actor Drift 및 Critical Reconciliation Drift를 Runtime Guard로 차단하라.

기존 Approval Chain, Workflow, Manager Resolution, Finance Approval, Rebate, Claim, Settlement, Payment, Payout, ERP Integration 및 Notification 기능과 Legacy Equivalence를 수행하라.

기존 정상 기능을 유지하면서 하드코딩 Amount Condition, 중복 DOA Table, Current Authority만 저장하는 모델, Role 이름 기반 Authority, Manager 자동 Authority, Currency Evidence 없는 변환, Threshold Gap·Overlap 및 Decision 시 Authority 미재검증을 제거하거나 Canonical Adapter로 전환하라.

모든 Authority Registry, Type, Domain, Definition, Version, Matrix, Entry, Binding, Threshold, Currency, Limit Period, Utilization, Candidate, Resolution, Conflict, Snapshot, Simulation, Reconciliation, 중복 구현 및 남은 위험을 ADR, PM Change History, Repeat Problem History 및 Agent Execution History에 기록하라.

다음 단계인 **EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-3-5 — Rebate Delegation Foundation Governance**를 구현할 수 있는 검증된 Approval Authority Matrix Foundation을 완성하라.
