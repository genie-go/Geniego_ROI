# DSAR — Approval Delegation API Contract (§60)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 API 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §60(2475-2573) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md)(§1·§2·§3) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_API_CONTRACT.md](DSAR_APPROVAL_AUTHORITY_API_CONTRACT.md)
>
> **측정기 분모**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=60` → **불릿 66 / 합계 66**(줄범위 2475-2573). 육안 금지·측정기 확정.

## 0. 한 문장 결론

🔴 **Delegation Registry/Type/Definition/Version/Scope/Acceptance·Approval/Lifecycle/Candidate·Resolution/Snapshot·Simulation/Reconciliation API 52종 전부 신설(ABSENT)이다.** `delegation`·`delegate` 라우트 grep **0**(유일 이름히트 `DELEGATION_EXCEEDED`는 RBAC 부여상한 오탐·ⓑ §1). 인접 **승인 라우트는 실재**하나(GET/POST `/v423/approvals`·`/catalog/approvals`·`/v424/admin/growth/approvals`·routes.php 등록·`/api` 접두 양쪽) **상태머신 API이지 Delegation API가 아니다**(승인자=actor 본인·대리자 없음·ⓑ §2.2). 교차 규약 14종 중 6종(Tenant Context·Authorization·Audit·Evidence·Rate Limit·Error Contract)만 인접 인프라 `LEGACY_ADAPTER`, 나머지 8종은 `ABSENT`.

## 1. 현행 실측 (file:line)

### 1.1 인접 실재 라우트 = `LEGACY_ADAPTER`(상태머신 API · Delegation API 아님)

| 라우트 | 실측 (routes.php) | §60 대응 |
|---|---|---|
| `GET /v423/approvals`·`POST /{id}/decide`·`POST /{id}/execute` | `:436-438`(+`/api` 접두 `:439-441`) → `Alerting::listActionRequests/decideAction/executeAction` | **Delegation API 아님** — action_request 상태전이(승인자=진입 actor·backup/acting 없음·ⓑ §2.2). Acceptance/Resolution/Snapshot 아님 |
| `POST /catalog/approvals` | `:113` → `Catalog::approvalCreate` · catalog `:2341-2364`(승인자 identity 미기록·ⓑ §2.2) | **Delegation API 아님** — `pending_approval→queued` 상태 UPDATE(1인 결재) |
| `GET /v424/admin/growth/approvals`·`POST /{id}/decide` | `:1334-1335`(+`/api` `:1358-1359`·`$register` `:2663-2664`) → `AdminGrowth::approvals/approvalDecide` | **Delegation API 아님** — 단일 플랫폼 큐 상태전이(decided_by=호출자·tenant_id 없음·ⓑ §2.2) |

★ 위 3경로는 §60이 요구하는 "Delegation Registry/Definition/Version/Scope/Acceptance/Lifecycle/Resolution/Snapshot/Reconciliation"의 어느 항목도 **커버하지 않는다**. 스키마·의미론이 상태머신이며, Delegator→Delegate 관계·시간제한 이양·수락/재위임 축이 부재하다(ⓑ §2.1·§2.2).

### 1.2 Delegation API 부재 실증(grep 재확인)

| 탐지 | 결과 | 판정 |
|---|---|---|
| `delegation`·`delegate`·`/acceptance`·`/candidate`·`/resolution`·`/reconciliation`(delegation) 라우트 | routes.php grep **0** | `ABSENT` |
| 유일 이름히트 `DELEGATION_EXCEEDED` | `TeamPermissions.php:645`(RBAC 부여상한 403·ⓑ §1) — 라우트 아님·delegation API 아님(오탐) | `NOT_APPLICABLE` |
| `reconciliation` 라우트 | PG정산·ROAS 등(Delegation HRIS/Calendar/ERP 대사 아님·소스 0·ⓑ §1) | `NOT_APPLICABLE`(오탐) |

★ **엔티티·라우트 전체 부재 → 커버 원천 불가.** `VALIDATED_LEGACY` = **0**(cover 0).

## 2. §60 신설 API 이행 규율 (🔴 실배선 필수)

- 🔴 **신규 실배선 = `/api` 접두 필수** — 프론트→백엔드 라우팅상 nginx SPA HTML 폴백이 미배선 라우트를 200으로 착시시킨다([[reference_api_prefix_routing]]). 승인 라우트 선례처럼 **버전 접두 + `/api` 접두 양쪽 등록**(예: `/v425/delegation/*` 와 `/api/v425/delegation/*`).
- 🔴 **핸들러 routes.php 등록 필수(자동발견 아님)** — `routes.php`가 `'METHOD /path' => 'Genie\Handlers\Class::method'` 문자열 매핑 + `$register(...)` 이중 등록이다(admin_growth approvals 선례 `:1334-1335`·`$register :2663-2664`). 두 곳 모두 배선하지 않으면 라우트가 죽는다(미배선 = 실백엔드 아님).
- 🔴 **레이트리밋 = fail-open · api_key 트래픽만** — `index.php:508-551`이 api_key 단위 1분 윈도우 카운터이며 `:511`·`:550` catch로 **fail-open**(DB오류·테이블부재 시 통과)이고 `:514` `!empty($keyRow['id'])` — **api_key 프로그래매틱 트래픽에만 도달**(SPA/세션 게이트 경로는 이미 상단에서 return·미도달). Delegation API에 "Rate Limit 적용"을 선언하되 세션 경로 사각을 상속하지 마라.
- 🔴 **재구현 금지·확장 우선** — Audit/Evidence는 `SecurityAudit::verify():56-68`(ⓑ §2.5) 확장 · Tenant Context는 `index.php:600` 주입 확장. 중복 엔진 금지. 실 Delegation 엔진은 §3 선행조건(Approval·Authority·Reporting-Line Resolver·Authorization Safety) 신설 후 별도 승인세션.

## 3. 원문 전사 + 판정 — **원문 66종**(측정기 확정)

### 3.1 Registry·Type (3)

| # | 원문 API(verbatim) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | Delegation Registry 조회 | `delegation` registry 라우트/엔티티 0(§1.2) | `ABSENT` |
| 2 | Delegation Type 조회 | Delegation Type(§8) 자체 부재(ⓑ §4 §58 전량 ABSENT) | `ABSENT` |
| 3 | Delegation Policy 조회 | Delegation Policy 엔티티 0 · 재위임/depth 정책 grep 0(ⓑ §2.1·§2.4) | `ABSENT` |

### 3.2 Definition·Version (6)

| # | 원문 API(verbatim) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 4 | Delegation Definition 생성 | Delegator→Delegate 관계 엔티티 0(ⓑ §2.1) | `ABSENT` |
| 5 | Delegation Definition 수정 | 정의 엔티티 부재 → UPDATE API 무발동 | `ABSENT` |
| 6 | Delegation Version 생성 | 불변 버전체인 선례 0(ⓑ §2.1 재위임/버전 없음) | `ABSENT` |
| 7 | Version 검증 | Version Validation 축 부재 | `ABSENT` |
| 8 | Version History 조회 | 버전 이력 API 0 · `revoked_at=NULL` in-place 소거 반례(AgencyPortal·ⓑ §2.3) | `ABSENT` |
| 9 | 특정 날짜 Active Version 조회 | as-of 조회 불가(effective dating delegation 엔티티 부재·ⓑ §2.1) | `ABSENT` |

### 3.3 Scope (9)

| # | 원문 API(verbatim) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 10 | Authority Scope 설정 | Authority Foundation ABSENT(`authority_matrix`·`approval_authority` 0·ⓑ §3.2) → 이양할 권한 단위 미정의 | `ABSENT` |
| 11 | Resource Scope 설정 | 인접 = `acl_permission.scopeSql` 데이터-행 필터(`TeamPermissions.php:286`)이나 delegation 리소스 스코프 아님(ⓑ §2.1) | `ABSENT` |
| 12 | Action Scope 설정 | Action별 위임 스코프 매핑 0(acl 단조성은 부여상한·ⓑ §2.1) | `ABSENT` |
| 13 | Organization Scope 설정 | Org 엔티티 0·조직 위임 스코프 0(ⓑ §3.3) | `ABSENT` |
| 14 | Legal Entity Scope 설정 | Legal Entity 엔티티 0(회사프로필 단일 문자열·법인 아님·ⓑ §3.3) | `ABSENT` |
| 15 | Geographic Scope 설정 | `Geo`(IP→ISO)는 지리 차원이나 delegation 지리 스코프 아님(ⓑ §2) | `ABSENT` |
| 16 | Monetary Scope 설정 | 금액축 부재(유일 = `HIGH_VALUE_KRW` 상수·boolean·ⓑ §3.2) | `ABSENT` |
| 17 | Currency Scope 설정 | 통화 스코프 0·환율 저장계층 부재(ⓑ §3.2) | `ABSENT` |
| 18 | Period 설정 | 위임 유효기간(시작·종료) 엔티티 0 — acl은 영구·expiry 컬럼 없음(ⓑ §2.1) | `ABSENT` |

### 3.4 Acceptance·Approval (6)

| # | 원문 API(verbatim) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 19 | Acceptance 요청 | Delegate 수락 요청 축 부재(manager 일방 치환·ⓑ §2.1) | `ABSENT` |
| 20 | Acceptance | 수락 처리 0(ⓑ §2.1 수락 없음) | `ABSENT` |
| 21 | Decline | 거절 처리 0 | `ABSENT` |
| 22 | Approval 요청 | 위임 승인 요청 0 · 인접 승인 라우트는 상태머신(delegation 승인 아님·§1.1) | `ABSENT` |
| 23 | Approve | 위임 승인 처리 0(4경로 "승인자"=진입 actor 본인·ⓑ §2.2) | `ABSENT` |
| 24 | Reject | 위임 반려 처리 0 | `ABSENT` |

### 3.5 Lifecycle (7)

| # | 원문 API(verbatim) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 25 | Schedule | 미래 활성 예약(effective dating) 0(ⓑ §2.1) | `ABSENT` |
| 26 | Activate | delegation 활성화 상태전이 0(delegation 엔티티 부재) | `ABSENT` |
| 27 | Suspend | delegation 정지 0 · Security Suspension=로그인 스로틀(권한정지 아님·ⓑ §3.4) | `ABSENT` |
| 28 | Resume | 정지 해제 0 | `ABSENT` |
| 29 | Revoke | delegation 철회 0(`revoked_at`은 AgencyPortal 접근권 수동철회·delegation 아님·ⓑ §2.3) | `ABSENT` |
| 30 | Expire | 만료 전이 0 · 만료축(`valid_to`/`effective_to`) 승인엔티티 0(ⓑ §2.1) | `ABSENT` |
| 31 | Supersede | 버전 승계(supersede) 0(버전체인 부재·ⓑ §2.1) | `ABSENT` |

### 3.6 Candidate·Resolution (7)

| # | 원문 API(verbatim) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 32 | Delegation Candidate 생성 | 후보 도출 코드 부재(ⓑ §4 §58 CANDIDATE ABSENT) | `ABSENT` |
| 33 | Candidate Exclusion | 제외사유 부재(ⓑ §4) | `ABSENT` |
| 34 | Resolution 실행 | Resolution 부재 → 판정 축 없음(Authority/Chain/Org 선행 ABSENT·ⓑ §3) | `ABSENT` |
| 35 | Winning Delegation 조회 | 우선순위/specificity 해소 코드 0(ⓑ §2.1) | `ABSENT` |
| 36 | Conflict 조회 | 충돌 탐지 0 · "conflict" 히트는 `ON CONFLICT` upsert(무관) | `ABSENT` |
| 37 | Cycle 조회 | Delegation 전용 cycle 코드 0(PM/메뉴 cycle은 도메인 상이·ⓑ §2.4) | `ABSENT` |
| 38 | Depth 조회 | 재위임 depth 거버넌스 0(재위임 경로 0·ⓑ §2.1) | `ABSENT` |

### 3.7 Snapshot·Simulation (7)

| # | 원문 API(verbatim) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 39 | Delegation Snapshot 생성 | Delegation Snapshot 엔티티 0(ⓑ §2.5) | `ABSENT` |
| 40 | Snapshot 조회 | 스냅샷 엔티티 부재 → 조회 무발동 | `ABSENT` |
| 41 | Snapshot Hash 검증 | 인접 정본 = `SecurityAudit::verify():56-68`(확장 대상)이나 delegation 스냅샷 해시 아님 · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `ABSENT` |
| 42 | Simulation 실행 | Delegation Simulation 0 | `ABSENT` |
| 43 | Future Activation Simulation | 미래 활성 시뮬 0(Schedule/effective dating 부재) | `ABSENT` |
| 44 | Revocation Impact Simulation | 철회 영향 분석 0(철회 엔티티 부재) | `ABSENT` |
| 45 | Historical Replay | as-of 재구성 불가(Snapshot·effective dating 부재·ⓑ §2.5) | `ABSENT` |

### 3.8 Reconciliation (7)

| # | 원문 API(verbatim) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 46 | HRIS 비교 | HRIS 위임 소스 0(`hris`=`hig`hRis`k` 오탐·ⓑ §1) → 대사 대상 부재 | `ABSENT` |
| 47 | Calendar 비교 | Calendar 소스 0(`calendar`=콘텐츠 캘린더 오탐·ⓑ §1) | `ABSENT` |
| 48 | ERP 비교 | ERP Delegate 소스 0(ⓑ §1) | `ABSENT` |
| 49 | Task·Decision 비교 | Delegation 정의 vs 부여 대사 0(delegation 엔티티 부재) | `ABSENT` |
| 50 | Drift 조회 | drift 기준(정의) 부재 → 무발동 | `ABSENT` |
| 51 | Manual Resolution | 대사 수동 해소 0 | `ABSENT` |
| 52 | Reconciliation History 조회 | `reconciliation` 라우트 히트는 PG정산·ROAS(delegation 대사 아님·§1.2 오탐) | `ABSENT` |

### 3.9 모든 API 공통 적용 규약 (14)

| # | 원문 항목(verbatim) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 53 | Tenant Context | 인접 REAL = `index.php:600` 무조건 `X-Tenant-Id` 주입 · auth_tenant(🔴 strict fail-closed 기본 OFF `:585`·ⓑ §3.4) | `LEGACY_ADAPTER` |
| 54 | Authorization | 인접 REAL = `$roleRank` 미들웨어(`index.php:554`)이나 **판정축 HTTP메서드 · `team_role`과 직교**(ⓑ §3.3) | `LEGACY_ADAPTER` |
| 55 | Idempotency | 멱등키 계층 0 · 승인경로 dedup은 `Mapping.php:278` 단건뿐(ⓑ §2.2) | `ABSENT` |
| 56 | Optimistic Lock | optimistic-lock version 0(불변 버전체인 부재·ⓑ §2.1) | `ABSENT` |
| 57 | Effective Date Validation | `valid_to`/`effective_to` 0(위임 엔티티·ⓑ §2.1) | `ABSENT` |
| 58 | Version Validation | 불변 버전체인 선례 0(ⓑ §2.1) | `ABSENT` |
| 59 | Scope Validation | 위임 Scope 엔티티 부재(§3.3 전량 ABSENT) → 검증 무발동 | `ABSENT` |
| 60 | Authority Validation | Authority Foundation ABSENT(`authority_matrix` 0·ⓑ §3.2) → 이양권한 검증 불가 | `ABSENT` |
| 61 | Monetary Precision Validation | 금액축·통화 저장계층 부재(`HIGH_VALUE_KRW` 상수뿐·ⓑ §3.2) | `ABSENT` |
| 62 | Audit | 인접 정본 = `SecurityAudit::verify():56-68`(확장 대상·ⓑ §2.5) 🔴`menu_audit_log.hash_chain` 인용 금지 | `LEGACY_ADAPTER` |
| 63 | Evidence | 인접 = `SecurityAudit` preimage ts 저장·검증기(ⓑ §2.5) — 위임 evidence 신설 시 확장 | `LEGACY_ADAPTER` |
| 64 | Rate Limit | 인접 = `index.php:508-551` 🔴 **fail-open · api_key 트래픽만**(`:514`·`:550`·SPA/세션 미도달·ⓑ §3) | `LEGACY_ADAPTER` |
| 65 | Pagination | Delegation API 미존재 · 표준 페이지네이션 규약 ⓑ 무근거 | `ABSENT` |
| 66 | Error Contract | 인접 = 핸들러별 `{"detail":...}` JSON 관용(`Mapping.php:206` 400 detail) — 표준 오류 계약 아님(ad-hoc) | `LEGACY_ADAPTER` |

**실측 개수: 66 / 66 전사(측정기 확정).** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 6(#53·54·62·63·64·66) · `ABSENT` 60(엔드포인트 52종 #1~52 + 공통 #55·56·57·58·59·60·61·65).

> 🔴 **커버 0.** Delegation API 52종이 통째로 부재하므로 어떤 엔드포인트도 `VALIDATED_LEGACY`가 아니다. `LEGACY_ADAPTER` 6건은 **교차 규약의 확장 대상 인접 인프라**(Tenant Context·Authorization·Audit·Evidence·Rate Limit·Error Contract)이지 Delegation 엔드포인트 커버가 아니다. §1.1 인접 승인 라우트(3경로)는 **상태머신 API**로, §60 어느 항목도 커버하지 않는다.

## 4. 규칙

- 🔴 **인접 승인 라우트를 Delegation API로 확장하지 마라** — `/v423/approvals`·`/catalog/approvals`·`/v424/admin/growth/approvals`는 상태머신이며 승인자=진입 actor 본인이다(대리자 없음·ⓑ §2.2). Delegation Registry/Definition/Acceptance/Resolution은 별도 신설이며 이 라우트에 위임 의미론을 덧대면 안 된다.
- 🔴 **신규 라우트 `/api` 접두 + `$register` 이중 등록**(§2) — 미배선은 nginx SPA 폴백으로 200 착시(실백엔드 아님·[[reference_api_prefix_routing]]).
- 🔴 **교차 규약 6종(LEGACY_ADAPTER)은 확장 재사용** — Tenant Context/Authorization/Audit/Evidence/Rate Limit/Error Contract는 인접 인프라를 확장하되 결함(strict OFF·2축 직교·fail-open·api_key 한정·ad-hoc detail)을 상속하지 마라.
- 🔴 **`Authority Validation`/`Monetary Precision`(#60·#61)을 "있음"으로 표기 금지** — Authority Foundation·금액축·환율 저장계층부터 부재다(ⓑ §3.2). API 플래그가 실제 능력을 초과 선언하면 위임이 원본 Authority를 초과하는 gap을 구조적으로 유발한다(§5.2 "Delegation은 원본 Authority를 초과할 수 없다").
- 🔴 **Reconciliation API(#46~52)는 소스 신설이 선행** — HRIS/Calendar/ERP 위임 소스가 0이므로(ⓑ §1) 대사 대상 자체가 없다. 외부 소스 어댑터 신설이 선행돼야 한다.
- 🔴 **코드 변경 0 유지** — 실 Delegation 엔진은 §3 선행조건(Approval·Authority·Reporting-Line Resolver·Authorization Safety) 신설 후 **별도 승인세션**(Golden+verify+배포승인).
