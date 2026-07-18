# DSAR — Approval Authority API Contract (§74)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 API 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §74(3003-3095) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md)(§2·§7 §74 REAL) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)
>
> **측정기 분모**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=74` → **불릿 65 / 합계 65**(줄범위 3003-3097). 육안 금지·측정기 확정.

## 0. 한 문장 결론

🔴 **Authority Registry/Definition/Matrix/Binding/Threshold/Candidate·Resolution/Snapshot·Simulation/Reconciliation API 53종 전부 신설(ABSENT)이다.** `authority`·`/matrix`·`/binding`·`/simulation` 라우트 grep **0**(`reconciliation` 히트는 `PgSettlement::reconciliation`·`Connectors::roasReconciliation` — Authority 대사 아님·오탐 제외). 인접 **승인 라우트는 실재**하나(GET/POST `/v423/approvals`·`/catalog/approvals`·`/v424/admin/growth/approvals`·routes.php 등록·`/api` 접두 양쪽) **상태머신 API이지 Authority API가 아니다**(ⓑ §2·§7 §74). 교차 규약 12종은 인접 인프라(Tenant Context·Authorization·Audit·Evidence·Rate Limit·Error Contract)만 `LEGACY_ADAPTER`.

## 1. 현행 실측 (file:line)

### 1.1 인접 실재 라우트 = `LEGACY_ADAPTER`(상태머신 API · Authority API 아님)

| 라우트 | 실측 (routes.php) | §74 대응 |
|---|---|---|
| `GET /v423/approvals`·`POST /{id}/decide`·`POST /{id}/execute` | `:436-441`(+`/api` 접두)·`$register` `:3769-3774` → `Alerting::listActionRequests/decideAction/executeAction` | **Authority API 아님** — action_request 상태전이(1회 즉시 approved·ⓑ §2). Authority Resolution/Version 아님 |
| `POST /catalog/approvals`·`POST /catalog/writeback/approve` | `:113`·`:99`·`$register` `:2978`·`:2964` → `Catalog::approvalCreate/approveQueue` | **Authority API 아님** — `pending_approval→queued` 상태 UPDATE(1인 결재·ⓑ §2) |
| `GET /v424/admin/growth/approvals`·`POST /{id}/decide` | `:1334-1335`(+`/api` `:1358-1359`)·`$register` `:2663-2664` → `AdminGrowth::approvals/approvalDecide` | **Authority API 아님** — 단일 플랫폼 큐 상태전이(1인 결재·tenant_id 없음·ⓑ §2) |

★ 위 3경로는 §74가 요구하는 "Authority Registry/Matrix/Resolution/Simulation/Reconciliation"의 어느 항목도 **커버하지 않는다**. 스키마·의미론이 상태머신이며, Authority 축(Domain·Action·Scope·Amount 승인권한)이 부재하다.

### 1.2 Authority API 부재 실증(grep 재확인)

| 탐지 | 결과 | 판정 |
|---|---|---|
| `authority`·`/matrix`·`/binding`·`/simulation` 라우트 | routes.php grep **0** | `ABSENT` |
| `reconciliation` 라우트 | `:644-645`(PG 정산)·`:1235-1236`(ROAS) — **Authority DOA 대사 아님**(오탐) | `NOT_APPLICABLE` |

★ **엔티티·라우트 전체 부재 → 커버 원천 불가.** `VALIDATED_LEGACY` = **0**(cover 0).

## 2. §74 신설 API 이행 규율 (🔴 실배선 필수)

- 🔴 **신규 실배선 = `/api` 접두 필수** — 프론트→백엔드 라우팅상 nginx SPA HTML 폴백이 미배선 라우트를 200으로 착시시킨다([[reference_api_prefix_routing]]). 승인 라우트 선례처럼 **버전 접두 + `/api` 접두 양쪽 등록**(예: `/v425/authority/*` 와 `/api/v425/authority/*`).
- 🔴 **핸들러 등록 필수(자동발견 아님)** — `routes.php`가 `'METHOD /path' => 'Genie\Handlers\Class::method'` 문자열 매핑 + `$register(...)` 이중 등록이다. 신규 핸들러는 두 곳 모두 배선하지 않으면 라우트가 죽는다(미배선 = 실백엔드 아님).
- 🔴 **레이트리밋 = fail-open · api_key 트래픽만** — `index.php:550` catch로 fail-open이며 `:514` api_key 미들웨어 트래픽에만 도달(SPA/세션 경로 미적용·ⓑ §7). Authority API에 "Rate Limit 적용"을 선언하되 세션 경로 사각을 상속하지 마라.
- 🔴 **재구현 금지·확장 우선** — Audit/Evidence는 `SecurityAudit::verify()`(ⓑ §5) 확장 · Tenant Context는 `index.php:600` 주입 확장 · high_value 상수는 §24 Amount Band 승격. 중복 엔진 금지.

## 3. 원문 전사 + 판정 — **원문 65종**(측정기 확정)

### 3.1 Registry·Definition (10)

| # | 원문 API(verbatim) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | Authority Registry 조회 | `authority_registry` 라우트/엔티티 0(§1.2) | `ABSENT` |
| 2 | Authority Type 조회 | Authority Type(§7) 자체 부재 | `ABSENT` |
| 3 | Authority Domain 조회 | Authority Domain(§8) 자체 부재 | `ABSENT` |
| 4 | Authority Definition 생성·수정 | 정의 엔티티 0 · UPDATE/설정 API 0(ⓑ §1) | `ABSENT` |
| 5 | Authority Version 생성 | 불변 버전체인 선례 0(ⓑ §5) | `ABSENT` |
| 6 | Version 검증 | Version Validation 축 부재 | `ABSENT` |
| 7 | Version 승인 | 인접 = 상태머신 decide(`Alerting`/`AdminGrowth`)이나 **Authority Version 승인 아님**(ⓑ §2·§1.1) | `ABSENT` |
| 8 | Version 활성화 | active version 선언 0 · version 컬럼 하드코딩 태그(ⓑ §5) | `ABSENT` |
| 9 | Version History 조회 | 버전 이력 API 0 · `revoked_at=NULL` in-place 소거 반례(`AgencyPortal.php:304`·ⓑ §5) | `ABSENT` |
| 10 | 특정 날짜 Active Version 조회 | as-of 조회 불가(effective dating 승인엔티티 부재·ⓑ §5) | `ABSENT` |

### 3.2 Matrix (7)

| # | 원문 API(verbatim) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 11 | Matrix 생성·수정 | `authority_matrix`·`doa_matrix` 0(ⓑ §1) | `ABSENT` |
| 12 | Matrix Version 생성 | Matrix 엔티티 부재 → 버전 무발동 | `ABSENT` |
| 13 | Matrix Entry 생성 | Entry(밴드/한도 행) 개념 0 | `ABSENT` |
| 14 | Entry 종료 | 폐구간 종료(`valid_to`) 0(ⓑ §5) | `ABSENT` |
| 15 | Entry History 조회 | Entry 이력 0 | `ABSENT` |
| 16 | Overlap·Gap 검증 | 복수 Threshold 부재 → 검증 무발동(§73 #25·#26) | `ABSENT` |
| 17 | Matrix Compare | 비교 대상 Matrix 0 | `ABSENT` |

### 3.3 Binding (9)

| # | 원문 API(verbatim) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 18 | Subject Binding | Subject Authority 개념 0(ⓑ §3) | `ABSENT` |
| 19 | Role Binding | 인접 = `roleRank`/`team_role` 문자열 2축 분열(ⓑ §3)이나 Authority Binding 아님 | `ABSENT` |
| 20 | Position Binding | Position/incumbency 개념 0(§73 #22) | `ABSENT` |
| 21 | Organization Binding | 조직 Authority 스코프 0 | `ABSENT` |
| 22 | Legal Entity Binding | Legal Entity 엔티티 0(ⓑ §1·Registry §1 #12) | `ABSENT` |
| 23 | Geographic Binding | `Geo`(IP→ISO)는 지리 차원이나 Authority 지리 스코프 아님(Registry §1 #13) | `ABSENT` |
| 24 | Resource Binding | 인접 = `acl_permission.scopeSql` 데이터-행 필터(`TeamPermissions.php:286`)이나 Authority 리소스 스코프 아님(장식·ⓑ §3) | `ABSENT` |
| 25 | Action Binding | Action별 승인권한 매핑 0 | `ABSENT` |
| 26 | Binding History 조회 | Binding 엔티티 부재 → 이력 무발동 | `ABSENT` |

### 3.4 Threshold·Currency (6)

| # | 원문 API(verbatim) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 27 | Amount Band 생성 | `amount_band` 0 · 유일 = `HIGH_VALUE_KRW` PHP 상수(`Catalog.php:1016`·boolean만·ⓑ §4) | `ABSENT` |
| 28 | Threshold 생성 | `approval_threshold`·`amount_threshold` 0(ⓑ §4) | `ABSENT` |
| 29 | Currency Scope 생성 | `currency_scope`·`allowed_currency` 0 · 통화=변환 전용(`fxToKrw:1749`·ⓑ §4) | `ABSENT` |
| 30 | FX Reference 검증 | 🔴 환율 저장계층 부재(`app_setting` KV·`rate_date` 없음·`Connectors.php:1790`) · 24h TTL 신선도 가드만(`:1794`·과거환율 불가·ⓑ §4 §27) | `ABSENT` |
| 31 | Limit Period 생성 | 인접 = `AutoCampaign` 예산 기간(`:843-889`·마케팅·승인아님·ⓑ §4 §30) | `ABSENT` |
| 32 | Utilization Reference 조회 | 인접 = `periodSpentToDate:855`(마케팅 단일소스·ⓑ §4 §31) — 승인 Utilization 부재 | `ABSENT` |

### 3.5 Candidate·Resolution (8)

| # | 원문 API(verbatim) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 33 | Authority Candidate 생성 | §47 후보 도출 코드 부재(ⓑ §6) | `ABSENT` |
| 34 | Candidate Exclusion | §49 제외사유 부재(ⓑ §6) | `ABSENT` |
| 35 | Authority Resolution 실행 | §50/§51 Resolution 부재 → `BLOCKED_PREREQUISITE`(판정 축 없음·ⓑ §3·§6) | `ABSENT` |
| 36 | Allow·Deny Rule 조회 | explicit deny 표현 자체 없음(`acl_permission`=allow-only·ⓑ §6) | `ABSENT` |
| 37 | Remaining Authority 조회 | 잔여 권한 계산 부재(누적 한도 승인축 0·ⓑ §4) | `ABSENT` |
| 38 | Next Level 결과 조회 | 다음 레벨 승계 = Manager Resolver ABSENT(사람 계층 walk 0·ⓑ §3) | `ABSENT` |
| 39 | Conflict 조회 | §53/§54 충돌 탐지 부재 · "conflict" 히트는 `ON CONFLICT` upsert(무관·ⓑ §6) | `ABSENT` |
| 40 | Manual Resolution | 수동 해소 API 0 | `ABSENT` |

### 3.6 Snapshot·Simulation (7)

| # | 원문 API(verbatim) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 41 | Authority Snapshot 생성 | §55 Actor Authorization Snapshot ABSENT(ⓑ §5) | `ABSENT` |
| 42 | Snapshot 조회 | 스냅샷 엔티티 부재 → 조회 무발동 | `ABSENT` |
| 43 | Snapshot Hash 검증 | 인접 정본 = `SecurityAudit::verify():56-68`(확장 대상·ⓑ §5)이나 Authority 스냅샷 해시 아님 | `ABSENT` |
| 44 | Simulation 실행 | §61 Authority Simulation 0(Registry §1 #16) | `ABSENT` |
| 45 | Version Comparison | 비교할 버전체인 부재(ⓑ §5) | `ABSENT` |
| 46 | Limit Change Impact | 한도 변경 영향 분석 0(한도축 부재·ⓑ §4) | `ABSENT` |
| 47 | Historical Replay | as-of 재구성 불가(Snapshot·effective dating 부재·ⓑ §5) | `ABSENT` |

### 3.7 Reconciliation (6)

| # | 원문 API(verbatim) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 48 | ERP DOA 비교 | ERP DOA Table 0(ⓑ §1) → 비교 대상 부재 | `ABSENT` |
| 49 | Finance Matrix 비교 | Finance Approval Matrix 0(ⓑ §1) | `ABSENT` |
| 50 | Task·Decision 비교 | §63 Reconciliation ABSENT(Authority 정의 vs 부여 대사 0·ⓑ §7) | `ABSENT` |
| 51 | Drift 조회 | drift 기준(정의) 부재 → 무발동 | `ABSENT` |
| 52 | Manual Resolution | 대사 수동 해소 0 | `ABSENT` |
| 53 | Reconciliation History | 🔴 `reconciliation` 라우트 히트는 PG정산(`:644`)·ROAS(`:1235`) — Authority 대사 아님(§1.2 오탐) | `ABSENT` |

### 3.8 모든 API 공통 적용 규약 (12)

| # | 원문 항목(verbatim) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 54 | Tenant Context | 인접 REAL = `index.php:600` 무조건 `X-Tenant-Id` 주입 · `:593` auth_tenant(🔴 strict fail-closed 기본 OFF `:585`·ⓑ §7) | `LEGACY_ADAPTER` |
| 55 | Authorization | 인접 REAL = `$roleRank` 미들웨어(`index.php:554`)이나 **판정축 HTTP메서드 · `team_role`과 직교**(ⓑ §3) | `LEGACY_ADAPTER` |
| 56 | Idempotency | 멱등키 계층 0 · 4승인경로 dedup은 `Mapping.php:278` 단건뿐(ⓑ §2) | `ABSENT` |
| 57 | Optimistic Lock | optimistic-lock version 0 · version 6컬럼 하드코딩 태그(ⓑ §5) | `ABSENT` |
| 58 | Effective Date Validation | `valid_to`/`effective_to` 0(승인엔티티·ⓑ §5) | `ABSENT` |
| 59 | Version Validation | 불변 버전체인 선례 0(ⓑ §5) | `ABSENT` |
| 60 | Monetary Precision Validation | 금액축·통화 저장계층 부재(`HIGH_VALUE_KRW` 상수뿐·ⓑ §4) | `ABSENT` |
| 61 | Audit | 인접 정본 = `SecurityAudit::verify():56-68`(확장 대상·ⓑ §5) 🔴`menu_audit_log.hash_chain` 인용 금지 | `LEGACY_ADAPTER` |
| 62 | Evidence | 인접 = `SecurityAudit` preimage ts 저장·검증기(ⓑ §5) — 승인 evidence 신설 시 확장 | `LEGACY_ADAPTER` |
| 63 | Rate Limit | 인접 = `index.php:550` 🔴 **fail-open · api_key 트래픽만**(`:514`·SPA/세션 미도달·ⓑ §7) | `LEGACY_ADAPTER` |
| 64 | Pagination | Authority API 미존재 · 표준 페이지네이션 규약 ⓑ 무근거 | `ABSENT` |
| 65 | Error Contract | 인접 = 핸들러별 `{"detail":...}` JSON 관용(`Mapping.php:206` 400 detail) — 표준 오류 계약 아님(ad-hoc) | `LEGACY_ADAPTER` |

**실측 개수: 65 / 65 전사(측정기 확정).** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 6(#54·55·61·62·63·65) · `ABSENT` 59(엔드포인트 53종 #1~53 + 공통 #56·57·58·59·60·64).

> 🔴 **커버 0.** Authority API 53종이 통째로 부재하므로 어떤 엔드포인트도 `VALIDATED_LEGACY`가 아니다. `LEGACY_ADAPTER` 6건은 **교차 규약의 확장 대상 인접 인프라**(Tenant Context·Authorization·Audit·Evidence·Rate Limit·Error Contract)이지 Authority 엔드포인트 커버가 아니다. §1.1 인접 승인 라우트(3경로)는 **상태머신 API**로, §74 어느 항목도 커버하지 않는다.

## 4. 규칙

- 🔴 **인접 승인 라우트를 Authority API로 확장하지 마라** — `/v423/approvals`·`/catalog/approvals`·`/v424/admin/growth/approvals`는 스키마 4종이 상이한 상태머신이다(§73 감사). Authority Registry/Matrix/Resolution은 별도 신설이며 이 라우트에 의미론을 덧대면 §65 gap을 상속한다.
- 🔴 **신규 라우트 `/api` 접두 + `$register` 이중 등록**(§2) — 미배선은 nginx SPA 폴백으로 200 착시(실백엔드 아님).
- 🔴 **교차 규약 6종(LEGACY_ADAPTER)은 확장 재사용** — Tenant Context/Authorization/Audit/Evidence/Rate Limit/Error Contract는 인접 인프라를 확장하되 결함(strict OFF·2축 직교·fail-open·api_key 한정)을 상속하지 마라.
- 🔴 **`Monetary Precision`/`FX Reference`(#60·#30)를 "있음"으로 표기 금지** — 금액축·환율 저장계층부터 부재다(ⓑ §4). API 플래그가 실제 능력을 초과 선언하면 §65 "Amount가 Limit 초과인데 승인 성공" gap을 구조적으로 유발한다.
- 🔴 **코드 변경 0 유지** — 실 결함(high_value 라우팅 갭·1인 결재 3경로·Actor Auth Snapshot 부재)은 별도 승인세션(Golden+verify+배포승인).
