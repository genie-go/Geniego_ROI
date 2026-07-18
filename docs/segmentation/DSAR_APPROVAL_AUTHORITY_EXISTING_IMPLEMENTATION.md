# DSAR — Approval Authority Matrix ⓑ 전수조사 (§3.4·§72·§73·§65)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 전수조사 — 코드변경 0**
> 스펙 원문: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md)
> 방법: 6 클러스터 병렬 **능력 기반 재실증**(정의부 Read·주석/인계서 불신). 헤더 10회차 실측을 CONFIRM/FLIP.

---

## 0. 한 문장 결론

**레포에 "Approval Authority"(Domain·Action·Scope·Amount 에서 승인할 권한) 개념이 없다.** 승인은 **① 미들웨어/플랜 진입 게이트 통과 여부 + ② 상태 전이**로만 이뤄지며, **금액축(monetary authority)·후보 도출·특이성/충돌 해소·버전/스냅샷이 전무**하다. §5~§64 Canonical Entity 20종(§72 `CANONICAL_APPROVAL_AUTHORITY_*`)은 **전량 신설 대상(ABSENT)**. 기존 4승인경로는 통합할 "동일 목적 Authority"가 아니라 **서로 다른 스키마의 상태머신**이다(§3.4 마지막 문장의 "중복 생성 금지" 전건 거짓 → 통합 대상 없음).

---

## 1. §3.4 기존 Authority 구현 전수조사 (44항목)

식별자 복합어 grep(backend/src) + 히트 정의부 Read. 🔴`limit` 단독 grep 무의미(SQL/rate/plan) → 복합어만.

| 결과 | 항목 |
|---|---|
| **부재(0 hit)** | approval_limit · spending_limit · monetary_limit · signature_authority · commitment_authority · payment_authority · payout_authority · refund_limit · credit_limit · writeoff_limit · contract_limit · rebate_limit · claim_limit · settlement_limit · doa_matrix · authority_matrix · approval_policy · delegation_of_authority · per_transaction · cumulative_authority · daily_limit · monthly_limit · annual_limit · budget_limit · department_approval · job_grade_threshold · position_threshold · manager_limit · legal_entity_limit · country_limit · currency_limit · cost_center_limit · program_limit · DOA/ERP/Finance Matrix · BPM Threshold · JSON/Spreadsheet Authority · Authority History/Snapshot/Audit(승인권한 축) |
| **실재(예외)** | ① **`Catalog.php:1016` `HIGH_VALUE_KRW=5000000.0`**(PHP 상수) — `:1103-1105` `$price>=HIGH_VALUE_KRW`→`requires_approval=true`. **승인 필요 여부 boolean 만 켠다**(=Existing Hardcoded Amount Condition). ② **`AutoCampaign.php:843-889`** 광고예산 상한(아래 §4). |

**★"Existing DOA Matrix / ERP Authority Table" = 없다.** `required_approvals` 유일 생산자 = `Mapping.php:209-210` 리터럴 `2` + `Db.php:634` `DEFAULT 2`. UPDATE·설정 API·타 INSERT **0** → **요건 모델이 아니라 상수**. 금액·건종류 무관 고정 2.

---

## 2. 승인 4경로 실측 + §72 분류

| 경로 | 스키마·집행 | 정족수 | 승인자 선택 | §72 분류 |
|---|---|---|---|---|
| **mapping_change_request** `Mapping::approve:238-294` | `approvals_json`={user,ts}(`:285` 2키) · `required_approvals`(리터럴2 `:209`) · 4중 방어(신원 fail-closed `:247` · 자기승인차단 `:268` · dedup `:278` · 정족수 `:287` `count>=required`) | **✅ REAL 2인** — 레포 유일 실 정족수 | 미들웨어 통과 **analyst+ api-key 서로 다른 2명**(역할·금액 무관) | `LEGACY_ADAPTER`(maker-checker 정족수 실집행 · 단 Authority 아님) |
| **catalog_writeback_job** `Catalog::approveQueue:2341-2365` | `status='pending_approval'→'queued'` UPDATE 후 큐 소비 · 생산자 `logJob:1197` · 🔴`catalog_writeback_approval`(DDL `:86`,`:126`)은 **고아**(INSERT/SELECT 0) | ❌ **1인 결재** | `UserAuth::requirePro`(유료 플랜 1인 · 신원·역할 무관) | `LEGACY_ADAPTER` |
| **action_request** `Alerting` | DDL `Db.php:592-600`(id·policy_id·tenant_id·status·action_json·approvals_json·created_at — **`required_approvals`·`requested_by` 컬럼 없음**) | ❌ **1회 즉시 approved**(`decideAction:593`) · `list:562` `required_approvals=2` = **표시용 하드코딩·미집행(fake-looks-real)** | `self::actor`(미확인시 'unknown') | **VACUOUS** — 🔴생산자 `INSERT INTO action_request` **전수 0**. ⚠️**집행기 `executeAction:601-655`는 실코드**(287차 · AdAdapters::pause `:631`/updateBudget `:634` 실호출·정직상태) — **"살아있는 집행기 + 없는 생산자 = 죽은 파이프라인"**(순수 장식 아님). §72-25=`docs/IMPLEMENTATION_STATUS.md:130` 거짓기록(인용 금지) |
| **admin_growth_approval** `AdminGrowth::approvalDecide:1313-1344` | DDL `:142-149`(requested_by·decided_by·decided_at 有 · 🔴**tenant_id 없음**) · 생산자 `:1294` · 결재 `:1330` | ❌ **1인 결재** | `requirePlan('admin')`+`requireSubAdminMenu` 1인 | `VALIDATED_LEGACY`(단일 플랫폼 큐 · 테넌트 격리 설계상 N/A) |
| **(5번째 축)** `app_user.agent_mode` `AdAdapters::agentMode:42-49` | owner 행 판독 · `'recommend'\|'approval'\|'auto'` VARCHAR(20)(코드 in_array 강제·DB CHECK 아님) | — | 자동집행 억제 **이진 게이트**(`agentAutoAllowed:53-56`·`AutoCampaign:349`,`:1239` `==='auto'`) | 워크플로 아님 — §72 분류 시 별도 |

**§73 중복 구현 감사 = "중복이 아니라 부재"**: 스키마 4종이 전부 다르다(`required_approvals`는 Mapping·`requested_by`는 action_request에 없음·`tenant_id`는 admin_growth에 없음). **여러 Authority Matrix / DOA Table / Approval Limit Table = 0**. 유일 중복 후보 = HIGH_VALUE_KRW(§73 "API Handler Amount 조건") 단건.

---

## 3. §4.1 Manager · §4.2 Role — Authority 판독 축이 없다

- **§4.1 Manager Resolver ABSENT (CONFIRM)** — `parent_user_id` 판독자 **25개소** 전량 정의부 Read: (a)owner 판별(`IS NULL`/`ORDER BY`) (b)1홉 tenant 상속(`resolveTenantId:207-215`) (c)team_role 파생 (d)write 시 parent=**최상위 owner** 하드고정(`createTeamMember:1226`·`provisionUser:502`·`createSubAdmin:1549`) (e)소유권 검증. **상급자(사람)를 반환하는 함수 0 · 다홉 사람계층 walk 0.** 🔴`parent_user_id` 재사용 금지(의미 변경 시 tenant 해석 전역 붕괴).
- **§4.2 권한 축 2벌 분열 (CONFIRM)** — `$roleRank`(`index.php:554` viewer<connector<analyst<admin)는 **판정축이 HTTP 메서드**(`:568`)·`connector` 유일의미가 ingest 쓰기(`:571-574`) = **기계 신원(api_key) API 등급**. `team_role`(owner>manager>member)과 **양방향 매핑 0**. 세션토큰(app_user) 경로는 api_key 미들웨어 미경유 → `auth_role` 미설정. **두 축 완전 직교.**
- **`acl_permission.approve` = 장식 (CONFIRM)** — `TeamPermissions.php:39` ACTIONS에 실재 · seedOrg 5개소 시드(`:708`~`:717`) · 그러나 **소비처가 `scopeSql`(데이터-행 필터)+위임상한 자기정합(`:639` `DELEGATION_EXCEEDED`)뿐**, **`approve` 비트를 읽어 승인 가부를 판정하는 핸들러 0**. `effectiveForUser`(`:366`) 소비처는 프론트 응답용(`:608`,`:669`).
- **결론**: "이 행위자가 이 단계를 승인할 권한이 있는가"를 물을 **정본 축이 레포에 없다** → §45/§46 Eligibility·§47~§54 Resolution = `BLOCKED_PREREQUISITE`. 승인 4경로의 "승인자"는 전부 **진입 게이트 통과자**(analyst+ / requirePro / requirePlan('admin'))이지 자격자 후보가 아니다.

---

## 4. §24~§31 Amount·Currency·Limit·Utilization

- **§24 Amount Band / §28 Threshold**: `amount_threshold`·`amount_band`·`approval_threshold` **0**. 유일 = HIGH_VALUE_KRW **PHP 상수**(테넌트 설정·버전·effective dating 원천 불가). 🔴**high_value 라우팅 갭 CONFIRM**: `approval_type='high_value'`는 `evaluatePolicy`에서 계산돼 **JSON 응답으로만 반환**(`:1125`·`:2252`) · `logJob:1197` INSERT·`jobs()` SELECT 어디에도 저장 안 됨 · `approveQueue:2350-2357`이 `tenant_id+status='pending_approval'`만 필터(approval_type 무시)·권한 공통 `requirePro` → **high_value(₩5M+)와 unregister가 동일 경로·동일 권한으로 결재**. → §24 Amount Band 로 승격·상수 은퇴(신규 임계상수 추가 금지).
- **§26 Currency Scope**: `currency_scope`·`allowed_currency` **0**. 통화는 변환 전용(`fxToKrw:1749`·`krwToCurrency:1763`).
- **§27 FX Reference**: 🔴**환율 저장계층 부재** — `app_setting` KV 단일행 덮어쓰기(`Connectors.php:1790`,`:1804-1805`) · `rate_date`/`business_day` 컬럼 없음 → rate date·as-of·USE_PREVIOUS_BUSINESS_DAY **구현 불가**. ⚠️**FLIP(균질화 방지)**: `:1794-1796` **24h TTL 신선도 가드**(`$age<86400` 만료 시 라이브 재조회) 실재 → "완전 무방비"는 아니나 **과거환율 조회는 여전히 불가**.
- **§57 대조 — 세율 vs 환율 부재 깊이 (균질화 금지)**:

| 축 | 환율(§27) | 세율(`kr_fee_rule`) |
|---|---|---|
| 저장계층 | **부재**(KV 덮어쓰기·rate_date 없음) | **존재** `effective_from VARCHAR(32) NOT NULL`(`Db.php:898`·`KrChannel.php:128,140` INSERT) |
| 질의계층 | 원천 불가(이력 없음) | **부재** `WHERE effective_from<=:as_of` 전역 0 · 읽기 4개소 전부 최신승(`Pnl:454`·`KrChannel:102,151,459` `ORDER BY effective_from DESC LIMIT 1`) |
| **깊이** | **저장계층부터**(스키마 신설 선행) | **질의계층만**(컬럼·데이터 有·술어만 추가) |

- **§30 Limit Period / §31 Utilization — ★FLIP**: 도메인 Authority 식별자 전부 0이나 **`AutoCampaign.php:843-889` = 실 "한도+기간+누적차감"**. `periodSpentToDate:855`(기간 내 누적 지출)→`budget` 비교(`:856`)→상한 도달 시 `AdAdapters::pause`(`:864`)+`optimization_log action='budget_cap_pause'`(`:878`). **§30 기간·§31 누적사용량·상한집행을 갖춘 유일 실 로직**(§36/§39 Budget Authority 성격 · 단 마케팅 도메인 · 승인 워크플로 아님). 나머지 monetary/spending/commitment/rebate/claim/settlement/payment/refund/credit/writeoff/contract 한도+누적차감 = **부재**.

---

## 5. §55~§59 Snapshot·Effective·Retroactive

- **§55/§56 immutable_hash 정본 = `SecurityAudit.php` (CONFIRM)** — `:27` tenant 포함 해시 · `:29-31` prev_hash·created_at 명시 저장 · **`verify():56-68`**(`:63` 재계산·`:64` `hash_equals`+prev 교차). 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]] · verify() 0·preimage ts 소실 = 검증 불가능한 장식).
- **§55 Actor Authorization Snapshot = ABSENT (CONFIRM)** — 3경로 다 승인시점 권한/역할/플랜 미보존: `Mapping:285`{user,ts} · `Alerting:591`{actor,decision,ts} · `admin_growth` decided_by/decided_at 2컬럼. **as-of 재구성 불가.**
- **§57 Effective Dating — 부분 FLIP** — `effective_to`·`valid_to`·`valid_from` **0**(오탐 `Onsite.php:396` invalid_token 제외) · optimistic-lock version **0**. 🔴**단 `effective_from`은 수수료/VAT 도메인에서 실 open-interval valid-from dating**(§4 표) → "전면 부재"는 틀림. **승인/권한 엔티티에는 없음.** version 컬럼 6개(`menu_defaults.version`='baseline' 리터럴 · `normalizer_version` · `ml_models.version` · `agent_version` · `risk_prediction.model_version` · `risk_model_registry.model_version`) **전부 하드코딩/서술 태그** → **불변 prev-링크 버전체인 선례 0**(risk_model_registry가 append+is_deployed로 근접하나 UPDATE-mutable).
- **§58 Future-Dated = ABSENT** (로컬 미래 effective_from 예약 0 · `Paddle.php:291`은 외부 PSP 파라미터 위임).
- **§59 Retroactive Correction (CONFIRM)** — `backend/migrations/` 21파일·`20260527_172_002` 정지 · `ensureTables`=CREATE만·백필 0. 🔴**정면 반례** `AgencyPortal.php:304`,`:381` `revoked_at=NULL` in-place 소거 → as-of 재구성 불가 · **복제 금지**.

---

## 6. §47~§54 Candidate·Resolution·Specificity·Conflict = 전 ABSENT

후보 도출(§47)·소스 우선순위(§48)·제외사유(§49)·Resolution(§50/§51)·특이성(§52)·충돌 탐지/해소(§53/§54) **전 항목 코드 부재**. "conflict" 60+ 히트는 전부 SQL `ON CONFLICT` upsert 또는 `RuleEngine.php:250` ad_schedule precedence(무관). explicit-deny>allow(§4.9) 구조 없음 — `acl_permission`은 allow-only(deny 표현 자체가 없음). **§4.8 임의 최대한도 선택 금지**는 애초에 복수 Authority가 없어 무발동.

---

## 7. §63~§77 인프라

- **§63 Reconciliation = ABSENT** — Authority 정의 vs 실제 부여 대사 0. 🔴**Tenant 마스터 테이블 부재**(`api_key.tenant_id`=FK 없는 VARCHAR(100) `Db.php:944` · 열거는 `SELECT DISTINCT` ~30개소 역추론) → **대사 기준 자체가 없음**(§63 ABSENT 보강).
- **§66/§67 Guard** — Cross-Tenant 차단 **REAL**(`index.php:600` 무조건 `X-Tenant-Id` 덮어쓰기 · `:593` auth_tenant) 🔴**단 strict fail-closed 기본 OFF**(`:585` `GENIE_STRICT_AUTH==='1'` 옵트인) · 레이트리밋 **fail-open**(`:550` catch)·**api_key 트래픽만**(`:514` · SPA/세션 미도달).
- **§74 API = REAL** — 승인 라우트 실등록·`/api` 접두 양쪽(GET `/v423/approvals`·decide·execute `routes.php:436-441`,`3769-3774` · `/catalog/approvals` `:113`,`:2978` · `/v424/admin/growth/approvals` `:1334-1335`). SPA 폴백 착시 없음.
- **§76 Cache = 부재** — Redis/Memcached 소스 0(`composer.json` require 없음·transitive만) · `apcu_*`=`SystemMetrics.php:222-262` 지표 보고 전용 · 서버 캐시 계층 없음 → **무효화할 캐시 없음**(우연한 준수 · 계산 금지).
- **§77 Test = 러너 0** — PHPUnit·`npm test` 없음 · `tools/e2e/smoke.mjs:42` `/api/v423/approvals`는 **HTTP 상태만**(승인 의미론 0) · `:148` 503 실패 제외·`:139` 백오프 → 레이트리밋 회귀 은폐. **원문에 "러너 세우라" 없음 → 별도 계상.**

---

## 8. §65 Critical Gap 실재 매핑

실측이 §65 gap 프로파일과 일치(High/Critical):
- **Actor에게 Authority 없는데 승인 성공** ✅ 실재 — Authority 개념 자체가 없어 "아무 analyst+/유료/admin 1~2인" 통과.
- **Amount가 Limit 초과인데 승인 성공** ✅ 실재 — high_value가 필요여부만 켜고 한도 미집행.
- **Explicit Deny 우선 위반**·**Threshold Gap/Overlap**·**누적 Limit 초과**·**Authority Snapshot 누락**·**Current Matrix로 과거 재해석**·**Manager 자동 Authority**·**Role 이름 문자열 판정** — 전부 **선행 엔티티 부재로 "판정 자체가 없음"** → gap 이 아니라 **미구현**. (self-approval 우회는 Mapping만 방어 `:268`, 나머지 3경로 미방어.)
- **Wrong Tenant Authority** — Cross-tenant 차단 REAL이나 strict 기본 OFF → 잔여 위험.

---

## 9. ★능력기반 재실증 FLIP 5건 (헤더 10회차 실측 정정)

1. **action_request `executeAction`은 "순수 장식"이 아니다** — 287차 수정으로 AdAdapters::pause/updateBudget 실호출·정직상태(`:601-655`). **VACUOUS 결론은 유지**(생산자 0=죽은 파이프라인)하되 "장식" 서술 정정.
2. **§57 effective_from은 실 open-interval dating** — 수수료/VAT 도메인 한정(승인 엔티티엔 없음). "effective dating 전면 부재" 정정.
3. **§30/§31 AutoCampaign 예산 상한 = 실 한도+기간+누적차감**(`:843-889`) — "도메인 authority 한도+누적 전무"의 유일 예외.
4. **FX에 24h TTL 신선도 가드 실재**(`Connectors:1794-1796`) — "완전 무방비" 정정(단 과거환율 조회는 여전 불가).
5. **Alerting `required_approvals=2`는 응답 표시용 하드코딩**(`:562`·미집행) — 이름/필드 히트≠능력 사례(fake-looks-real). VACUOUS 보강.

---

## 10. 다음 단계

- **ⓒ 전사** — §79 = **per-entity `DSAR_APPROVAL_AUTHORITY_*` 88편**(5-3-3-3 §71 통합 16편과 정반대 · 실재 0편). §5~§64 Canonical Entity 각 원문 항목명 전사 + 현행 대조 + 판정. 분모 = 측정기(`measure_spec_denominator.mjs --sec=N` · 육안 금지).
- **ⓓ ADR** — Authority SoT 결정: 신설(선례 0) · high_value 상수→§24 Amount Band 승격 · Mapping 정족수 패턴 확장(재구현 금지).
- **ⓔ 인용검증 → ⓕ 커버리지**(측정기 산출).
- 🔴**코드 변경 0 유지** — 실 결함(high_value 라우팅 갭·1인 결재 3경로·Actor Auth Snapshot 부재)은 **별도 승인세션**.
