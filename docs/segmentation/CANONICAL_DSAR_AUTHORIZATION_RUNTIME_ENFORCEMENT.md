# CANONICAL DSAR — Runtime Authorization & Enforcement Infrastructure (PDP·PEP·Enforcement Point·Bypass Registry·Cache·Revocation Propagation)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-6 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> **★★스펙 미수령 — 설계 자율 판단(사용자 명시 승인)**: 상세 스펙 미제공(파트 번호·이름만 5-1 §1 명시). **구조·Entity·분류는 실측 + 5-1~5-5 산출 + 도메인 판단으로 자율 설계** · **정본 스펙 수령 시 재정합** · **§요구 부재 → 완료 조건 판정 불가·§53/§59 없음**(RP-001 정합).
> 정본 쌍: 본 문서(PDP/PEP/Bypass/Cache/Revocation) + [`CANONICAL_DSAR_AUTHORIZATION_UI_API_CONSISTENCY.md`](CANONICAL_DSAR_AUTHORIZATION_UI_API_CONSISTENCY.md)(UI·API 일관성/Drift/CI Guard).
> ADR: [`../architecture/ADR_DSAR_REBATE_RUNTIME_AUTHORIZATION_PDP_INFRASTRUCTURE.md`](../architecture/ADR_DSAR_REBATE_RUNTIME_AUTHORIZATION_PDP_INFRASTRUCTURE.md).
> 선행: **5-1**(중앙 PDP 부재·PEP 분산·Decision Contract·평가 순서 18) · 5-2(Scope Resolution) · 5-3(Approval) · 5-4(SoD) · **5-5**(Revocation 경로 불일치 관찰 위임 수령).
> **범위**: 런타임 집행 인프라만 — Audit/Access Review=5-7 · **전체 Lint/Guard Certification·Golden·Production Certification=5-8**.

---

## 0. 실측 요약 — ★분산 규모를 숫자로 확정했다

| 축 | **실측 수치** | 근거 |
|---|---|---|
| **라우트 총수** | **1,448** | `routes.php` (`'METHOD /path' =>` 매핑) |
| **PEP ①: api_key 미들웨어** | **1개소** · **bypass 조건 143** / index.php **667 라인** | [index.php](../../backend/public/index.php) |
| **PEP ②: 세션 self-auth(`authedTenant`)** | **64 핸들러** | Handlers/*.php |
| **PEP ③: 플랜 게이트(`requirePro`/`requirePlan`)** | **56 핸들러 · 호출부 455**(UserAuth 정의부 제외 · 총 465) | Handlers/*.php |
| **PEP ④: admin 게이트(`requireMasterAdmin2`)** | **5 핸들러** | 286차 |
| **중앙 PDP** | ❌ **부재** — 판정이 위 4계통에 분산 | — |
| **Authorization Cache** | ❌ **부재**(5-1 §51 확정) | — |
| **UI 권한 소스** | **`frontend/src/auth/planMenuPolicy.js`** — `MENU_MIN_PLAN`(Object.freeze·:25) · `PLAN_TIER_RANK`(:91) | 프론트 |
| **백엔드 권한 소스** | `PlanPolicy::RANK`(PlanPolicy.php:19) · 기능키→최소플랜(:24) | 백엔드 |
| **★UI↔API 동기화** | ⚠️ **수동** — "프론트 PLAN_TIER_RANK / MENU_MIN_PLAN 과 정합 유지(**변경 시 양쪽 동시 갱신**)"(PlanPolicy.php:14) | 짝 문서 |
| **★CI 가드 선례** | ✅ **REAL** — **`tools/guard_headerless_getjson.mjs`**(275차: 헤더리스 getJson **401 회귀 2차 재발** → **CI 가드로 클래스 제거**) | tools/ |
| **★E2E 3계층** | ✅ **REAL** — `tools/e2e/{smoke,render,scenarios}.mjs`(266차 · smoke=GET 500 스윕+계약키 가드·**CI Phase6 게이트**) | tools/e2e/ |
| **Tenant 주입(위조불가)** | ✅ **REAL** — agency 토큰 서버바인딩(index.php:97-100) · `auth_tenant` | 5-1 |

**★결론(정직)**: **중앙 PDP 는 부재**하고 **PEP 는 최소 126 개소**(미들웨어 1 + authedTenant 64 + plan gate 56 + admin 5) **· 실 호출부 기준으로는 525+**(bypass 143 + authedTenant 64 + plan 455 + admin 5 초과)에 **분산**되어 있다. **1,448 라우트**를 이 분산 구조가 지킨다. **Authorization Cache 는 부재**(→ **역설적으로 5-5 Revocation 경로 불일치 관찰의 위험을 낮춘다**·§5). 실 인접 = **CI 가드 선례**(275차 guard_headerless_getjson) · **E2E 3계층**(266차) · 위조불가 tenant 주입.

### ★인접 관찰 (코드변경 0·근거 기록만)

**[관찰 1·자기 인용 정정] `requirePro` 호출부는 351 이 아니라 455 다** — 5-1~5-5 에서 인용한 **"호출부 351"** 은 **코드 주석의 값**("기존 351개 호출부의 실효 동작을 보존한다"·UserAuth.php:329)이며 이는 **286차 시점 기준**이다. **현재 실측 = 465**(UserAuth 정의부 제외 **455**). → **주석 작성 후 100+ 증가**. **★이는 "PEP 분산이 계속 심화되고 있다"는 신호** — 새 핸들러마다 self-auth 를 또 추가하는 패턴이 진행 중(5-1 §51 "PEP 를 101번째로 추가하는 것" 이 실제로 일어나고 있다). **정직 표기: 앞선 파트의 "351" 인용은 주석 인용이며 현재 실측치는 455**.

**[관찰 2] `index.php` bypass 조건 143개 / 667 라인** — **파일의 상당 부분이 bypass 목록**이다. 5-1 §43 "UI 에서는 차단되지만 API 직접 호출 허용"·275차 "헤더리스 getJson 401 회귀 **2차 재발**" 이 **이 구조에서 나온다**: bypass 에 **넣으면 미들웨어가 안 지키고**(핸들러 self-auth 에 의존), **안 넣으면 세션 토큰 호출이 401**. → **양쪽 다 위험한 이분법** → §3 Bypass Registry 로 **명시적 계약화** 필요.

**[관찰 3·5-5 위임 판정] Revocation 경로 불일치 — 위험도 하향(자율 판정)**: 5-5 가 "SCIM 만 즉시 세션 삭제·타 경로 미확인"을 Critical 후보로 넘겼다. **본 블록 실측 결과 `Authorization Cache` 가 부재**(5-1 §51)하고 **판정이 요청마다 DB 를 재조회**하는 구조(authedTenant·requirePlan 이 매 요청 `app_user` 조회·UserAuth.php:41-45 패턴)이므로, **Role/plan 변경은 다음 요청부터 즉시 반영**된다 → **"Revoked 권한으로 접근 지속" 위험은 낮다**. **다만 세션 자체는 유효**하므로 **계정 비활성화 시엔 SCIM 처럼 세션 삭제가 필요**(EnterpriseAuth.php:400 패턴). **★자율 판정: 5-5 관찰은 "Critical" 이 아니라 "설계상 완화됨(캐시 부재 덕분)"** — 단 **캐시를 도입하는 순간 이 위험이 실재화**된다(§5 규칙). **PM 재증명 전 확정 금지**.

---

## 1. Canonical Entity (14) — 자율 설계

POLICY_DECISION_POINT · POLICY_ENFORCEMENT_POINT · PEP_REGISTRY · ENFORCEMENT_BINDING · BYPASS_REGISTRY · BYPASS_JUSTIFICATION · DECISION_CACHE_POLICY · CACHE_INVALIDATION_EVENT · REVOCATION_PROPAGATION · ENFORCEMENT_COVERAGE · PDP_PERFORMANCE_BUDGET · RUNTIME_RECONCILIATION · ENFORCEMENT_EVIDENCE · ENFORCEMENT_AUDIT_EVENT.

## 2. PDP (§1) · PEP Registry (§2) — 통합 전략

- **PDP(§1)**: 단일 `authorize(subject, resource, action, context) → Decision`(5-1 §29 Decision Contract) · **평가 순서 18 고정**(5-1 §32) · **Policy Version 기록**(5-1 §22) · **Reason·Obligation 반환**(5-1 §30·§31).
- **★통합 전략(자율 판단·핵심)**: **PEP 126+ 개소를 한 번에 바꾸는 것은 불가능**하다(회귀 위험·§0 관찰 1). → **3단계 점진 통합**:
  1. **PDP 를 신설하되 기존 게이트를 대체하지 않는다** — 기존 `authedTenant`/`requirePlan`/`requireMasterAdmin2` **내부에서 PDP 를 호출**하도록 **위임**(Adapter). **동작 동일 = 회귀 0** · **판정 근거만 PDP 가 기록**(5-1 Decision 부재 해소).
  2. **PEP Registry 로 전수 목록화** — 어느 라우트가 어느 PEP 로 보호되는지 **1,448 라우트 × PEP 매핑**(§4 Coverage).
  3. **신규 라우트만 PDP 직결** — **기존 455 호출부는 건드리지 않는다**(Legacy Equivalence=5-8).
- **PEP Registry(§2)**: pep_id · **pep_type**(MIDDLEWARE / HANDLER_SELF_AUTH / PLAN_GATE / ADMIN_GATE / DB_RLS / UI) · location(file:line) · **보호 대상 라우트** · **위임 여부**(PDP 호출) · evidence.

| PEP | 유형 | 규모 | 통합 순서 |
|---|---|---|---|
| index.php 미들웨어 | MIDDLEWARE | 1개소 · **bypass 143** | ①Adapter |
| `authedTenant` | HANDLER_SELF_AUTH | **64 핸들러** | ①Adapter |
| `requirePro`/`requirePlan` | PLAN_GATE | **56 핸들러 · 호출부 455** | ①Adapter(★최대 회귀 위험) |
| `requireMasterAdmin2`/`requireSubAdminMenu` | ADMIN_GATE | **5 핸들러** | ①Adapter |
| `tenant_id=?` | DB_RLS | 전역 관례 | 유지(선언적) |
| `planMenuPolicy.js` | UI | 프론트 | 짝 문서(Drift) |

## 3. ★Bypass Registry (§3) — 143 조건의 계약화

- **Bypass Registry(§3)**: bypass_id · **path_pattern · method · reason_code · justification · self_auth_mechanism**(무엇이 대신 지키는가) · **owner · added_at · review_at** · evidence.
- **★현행 실측**: index.php **bypass 조건 143개**(667 라인 중 상당 부분) — 주석으로 이유가 산발 기록되어 있으나(예: "프론트가 세션 토큰으로 호출 → api_key 미들웨어 401 회피"·"공개 bypass 필수"·"파트너 토큰 자가인증") **구조화된 Registry 는 없다**.
- **★Bypass 는 "인증 없음"이 아니다** — 대부분 **다른 인증 수단으로 위임**(세션 self-auth·파트너 토큰·서명 HMAC·공개 비콘). **★Registry 의 핵심 필드 = `self_auth_mechanism`**(무엇이 대신 지키는가). **이 값이 비면 = 진짜 무인증 = Critical**.
- **★규칙**: **신규 bypass 추가 시 `self_auth_mechanism` + `justification` + `owner` 필수** · **주기 review**(5-7) · **★`/api` 별칭 변형 동시 등록**(192차 권한상승 교훈 — bypass 도 게이트도 `/api` 변형 누락 시 우회) · **bypass 추가는 Approval 대상**(5-3).

## 4. Enforcement Coverage (§4) — 1,448 라우트 전수

- **Coverage(§4)**: route · method · **보호 PEP 목록 · Resource Type · Action · Tenant Scope 검증 여부 · Environment 검증 여부** · **미보호 여부** · evidence.
- **★목표**: **1,448 라우트 전수 매핑** → **미보호 라우트 0 증명**. 현행은 **어느 라우트가 무엇으로 지켜지는지 전수 파악이 불가능**(4계통 분산 + bypass 143).
- **★재사용 정본**: **`tools/e2e/smoke.mjs`**(266차 · GET 500 스윕 + **계약키 가드** · **CI Phase6 게이트**)가 **라우트 전수 순회의 실 인프라** → **Coverage 검증에 확장**(중복 도구 신설 금지). **`render.mjs`**(119 라우트 자동 도출·281차)도 인접.
- **Lint(§4b)**: **PEP 없는 라우트** · Resource Type 없는 라우트 · Tenant 검증 없는 라우트 · **bypass 인데 `self_auth_mechanism` 없음** · **`/api` 별칭 미등록**.

## 5. ★Decision Cache (§5) · Revocation Propagation (§6) — 5-5 위임 판정

- **★현행: Cache 부재 = 위험 완화(§0 관찰 3)**: 판정이 **요청마다 DB 재조회**(authedTenant·requirePlan 이 매 요청 `app_user` 조회) → **Role/plan 변경이 다음 요청부터 즉시 반영** → **5-5 "Revocation 경로 불일치" 위험은 설계상 낮다**. **★단 세션 자체는 유효**하므로 **계정 비활성화 시엔 세션 삭제 필요**(SCIM 정본·EnterpriseAuth.php:400).
- **★Cache Policy(§5) — 도입 시 강행 규칙**: **캐시를 도입하는 순간 5-5 위험이 실재화**된다. → **①TTL 상한(짧게) ②Revocation 시 즉시 무효화 ③고위험 Action 은 `DISABLE_CACHE`**(5-1 §30 Obligation) **④Policy Version 변경 시 전량 무효화** **⑤캐시 미스가 아니라 캐시 히트가 위험**(만료 권한 허용·5-1 §43 Critical).
- **Revocation Propagation(§6)**: revocation_event(5-5 §8) → **①Grant REVOKED ②세션 종료**(SCIM 패턴) **③캐시 무효화**(도입 시) **④진행 중 요청 처리 정책** · **★"권한 회수 = 세 곳 모두"**(5-5 결론 계승).

## 6. Performance Budget (§7) · Reconciliation (§8) · Guard/Error (§9)

- **Budget(§7)**: PDP 판정 **latency 상한**(5-1 §29 `decision_latency` 필드) · **초과 시 fail-closed**(느리다고 통과 금지) · **1,448 라우트 × 판정** 부하 고려 · **캐시 없이도 성립해야 함**(현행 DB 재조회가 이미 그러함).
- **Reconciliation(§8, 7)**: **PEP Registry ↔ 실 라우트**(1,448) · **Bypass Registry ↔ index.php 실 조건**(143) · Coverage ↔ 미보호 라우트 · PDP Decision ↔ 각 PEP 판정(**Adapter 단계에서 불일치 = 통합 버그**) · Cache ↔ Revocation · **UI ↔ API**(짝 문서) · Gateway ↔ Service ↔ DB RLS.
- **Guard(§9a, 8)**: PEP_MISSING · **BYPASS_WITHOUT_SELF_AUTH** · ROUTE_NOT_IN_COVERAGE · **API_ALIAS_NOT_REGISTERED**(192차) · CACHE_SERVING_REVOKED · **PDP_TIMEOUT**(fail-closed) · DECISION_WITHOUT_POLICY_VERSION · ADAPTER_DECISION_MISMATCH.
- **Error(§9b, 6)**: `AUTHORIZATION_PEP_MISSING` · `AUTHORIZATION_BYPASS_UNJUSTIFIED` · `AUTHORIZATION_ROUTE_UNPROTECTED` · `AUTHORIZATION_PDP_TIMEOUT` · `AUTHORIZATION_CACHE_STALE` · `AUTHORIZATION_ADAPTER_MISMATCH`.

## 7. Runtime Matrix — 현행

| 계층 | 현행 | 규모 | 통합 |
|---|---|---|---|
| **PDP** | ❌ **부재**(판정 분산) | — | **신설(Adapter 위임)** |
| **PEP ① 미들웨어** | ✅ REAL | 1 · **bypass 143** | Adapter |
| **PEP ② 세션 self-auth** | ✅ REAL | **64 핸들러** | Adapter |
| **PEP ③ 플랜 게이트** | ✅ REAL | **56 핸들러 · 호출부 455**(★주석 351=286차 값) | Adapter(**최대 회귀 위험**) |
| **PEP ④ admin 게이트** | ✅ REAL | 5 | Adapter |
| **DB RLS** | ✅ REAL(관례) | 전역 `tenant_id=?` | 유지 |
| **UI** | ✅ REAL | planMenuPolicy.js(MENU_MIN_PLAN·PLAN_TIER_RANK) | **짝 문서(Drift)** |
| **Cache** | ❌ **부재** | — | **★도입 시 5-5 위험 실재화** |
| **CI 가드** | ✅ **REAL** — guard_headerless_getjson(275차) · e2e 3계층(266차) | — | **재사용·확장** |
