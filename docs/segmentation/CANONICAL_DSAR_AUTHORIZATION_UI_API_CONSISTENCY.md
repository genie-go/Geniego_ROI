# CANONICAL DSAR — UI·API Authorization Consistency (Single Source·Drift Detection·Reconciliation·CI Guard)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-6 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> **★★스펙 미수령 — 설계 자율 판단(사용자 명시 승인)** · 정본 스펙 수령 시 재정합 · **§요구 부재 → 완료 조건 판정 불가·§53/§59 없음**.
> 정본 쌍: [`CANONICAL_DSAR_AUTHORIZATION_RUNTIME_ENFORCEMENT.md`](CANONICAL_DSAR_AUTHORIZATION_RUNTIME_ENFORCEMENT.md)(PDP/PEP/Bypass/Cache) + 본 문서.
> ADR: [`../architecture/ADR_DSAR_REBATE_RUNTIME_AUTHORIZATION_PDP_INFRASTRUCTURE.md`](../architecture/ADR_DSAR_REBATE_RUNTIME_AUTHORIZATION_PDP_INFRASTRUCTURE.md).
> 선행: **5-1 §4.8**("UI 와 API 권한을 분리 구현하지 않는다"·UI_API_MISMATCH Reconciliation) · 5-2(PlanPolicy↔UI 수동 동기화 MIGRATION_REQUIRED).
> **범위**: UI·API 일관성만 — 전체 Certification=5-8.

---

## 0. 실측 요약 — ★권한 소스가 2개다

| 축 | 실측 | 근거 |
|---|---|---|
| **백엔드 권한 소스** | `PlanPolicy::RANK`(플랜 위계·[PlanPolicy.php:19](../../backend/src/PlanPolicy.php)) · **기능키 → 최소 요구 플랜**(:24) · `rank()`(:41) | 백엔드 |
| **UI 권한 소스** | **`frontend/src/auth/planMenuPolicy.js`** — **`MENU_MIN_PLAN`**(Object.freeze·:25) · **`PLAN_TIER_RANK`**(Object.freeze·:91) | 프론트 |
| **★동기화 방식** | ⚠️ **수동** — 코드 주석이 명시: **"프론트 PLAN_TIER_RANK / MENU_MIN_PLAN 과 정합 유지(변경 시 양쪽 동시 갱신)"**(PlanPolicy.php:14) | **MIGRATION_REQUIRED(5-2)** |
| **★드리프트 실현 이력** | ✅ **REAL(사고)** — **286차: rank 맵이 `starter=growth=pro=1` 로 붕괴** → `requirePro` 가 **사실상 'starter+'** 로 동작(UserAuth.php:330-332) | **실 사고 근거** |
| **★UI-only 보호 재발 이력** | ✅ **REAL(사고)** — **275차: 헤더리스 getJson 4페이지 401 회귀 · 237차 클래스 2차 재발** → **`tools/guard_headerless_getjson.mjs` CI 가드로 클래스 제거** | **CI 가드 정본** |
| **E2E 계약 가드** | ✅ **REAL** — `tools/e2e/smoke.mjs`(266차 · GET 500 스윕 + **계약키 가드** · **CI Phase6 게이트**) · `render.mjs`(라우트 자동 도출) · `scenarios.mjs` | **재사용** |
| **자동 Drift 탐지** | ❌ **부재** — PlanPolicy ↔ planMenuPolicy.js 대조 도구 없음 | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **권한 소스가 백엔드/프론트 2개로 분리**되어 있고 **동기화가 수동**이다(주석이 그렇게 지시). **★이 구조는 이미 2번 사고를 냈다** — ①**286차 rank 맵 붕괴**(UI/백엔드 위계 불일치 → requirePro 의미 변질) ②**275차 헤더리스 getJson 401 회귀 2차 재발**(UI 는 되는데 API 는 401). 후자는 **CI 가드로 클래스 제거**했다 → **★전자(Plan 정합)도 동일하게 CI 가드로 해소하는 것이 정합**(§4).

### ★인접 관찰 (코드변경 0)
- **[관찰] UI/API 드리프트의 두 방향은 위험이 다르다**:
  - **UI 허용 · API 거부** → **가용성 사고**(사용자가 클릭했는데 401/403) — **275차 사례**. 눈에 띄어서 **빨리 발견**된다.
  - **UI 차단 · API 허용** → **보안 사고**(메뉴에 없지만 API 직접 호출 시 통과) — **5-1 §43 Critical**. **눈에 안 띄어서 오래 잠복**한다.
  - **★286차 rank 맵 붕괴는 후자에 가까웠다**(requirePro 가 사실상 starter+ = **의도보다 넓게 허용**). → **"UI 차단·API 허용" 방향을 우선 탐지**해야 한다.
- **[관찰] `Object.freeze` 는 정합을 보장하지 않는다** — planMenuPolicy.js 가 `MENU_MIN_PLAN`/`PLAN_TIER_RANK` 를 **freeze** 하지만(:25/:91), 이는 **런타임 변조만 막을 뿐** **백엔드와의 값 일치는 보장하지 않는다**. 정합은 **사람의 "양쪽 동시 갱신"에 의존**(PlanPolicy.php:14).

---

## 1. Canonical Entity (10) — 자율 설계

AUTHORIZATION_SOURCE_OF_TRUTH · UI_PERMISSION_PROJECTION · DRIFT_DETECTION_RULE · DRIFT_FINDING · CONSISTENCY_RECONCILIATION · CI_GUARD_REGISTRY · CONTRACT_TEST · DRIFT_SEVERITY_POLICY · CONSISTENCY_EVIDENCE · CONSISTENCY_AUDIT_EVENT.

## 2. Single Source of Truth (§1) · UI Projection (§2)

- **★§4.8 원칙(5-1 계승)**: **UI 와 API 권한을 분리 구현하지 않는다** — **UI 메뉴 숨김만으로 보호 금지** · API·Service·Database 까지 **동일 Decision Contract**.
- **SoT(§1)**: **백엔드가 유일한 정본** — `PlanPolicy`(현행) → 향후 PDP(짝 문서 §2). **UI 는 정본의 투영(Projection)일 뿐 판정 주체가 아니다**.
- **★UI Projection(§2) — 3가지 해소 방식(자율 판단·권장순)**:
  1. **★런타임 투영(권장)**: UI 가 자체 테이블을 갖지 않고 **백엔드가 내려주는 권한 맵**(예: `/me` 응답의 `allowed_menus`)을 사용 → **드리프트 구조적으로 불가능**. **단 초기 로딩·오프라인 UX 고려 필요**.
  2. **빌드타임 생성**: `planMenuPolicy.js` 를 **백엔드 정본에서 자동 생성**(수기 편집 금지) → 드리프트 불가 · **빌드 파이프라인 의존**.
  3. **CI 대조 가드(최소·즉시 적용 가능)**: 양쪽을 **파싱해 비교**하는 CI 스크립트 → **드리프트 발생은 하되 머지 전 차단**. **★275차 `guard_headerless_getjson.mjs` 선례와 동일 형태** → **가장 현실적인 1단계**.
- **★현행 제약**: planMenuPolicy.js 는 **주석상 "menuAccess 설정 전에도 정본 기본 등급(MENU_MIN_PLAN)으로 접근"**(:6) — **UI 가 fallback 정본 역할**을 겸한다 → **①번(런타임 투영)으로 바꾸려면 이 fallback 요구를 먼저 해소**해야 한다(무조건 ①이 정답은 아님).

## 3. Drift Detection (§3) · Severity (§4)

- **Detection Rule(§3, 7)**: **①플랜 위계 값 대조**(`PlanPolicy::RANK` ↔ `PLAN_TIER_RANK`) **②기능키→최소플랜 대조**(백엔드 매핑 ↔ `MENU_MIN_PLAN`) **③메뉴 키 집합 대조**(UI 에만 있는 키 / 백엔드에만 있는 키) **④라우트 ↔ 메뉴 매핑**(286차 `키=ADMIN_MENU it.to` 정합 검증 선례) **⑤bypass ↔ UI 노출**(짝 문서 §3) **⑥`/api` 별칭 정합**(192차) **⑦Role 3계통 ↔ UI 표기**(5-2).
- **★Severity(§4·자율 판단)**:

| 방향 | 결과 | Severity | 근거 |
|---|---|---|---|
| **UI 차단 · API 허용** | **보안 사고**(잠복) | **CRITICAL** | 5-1 §43 · 286차 rank 붕괴 |
| **UI 허용 · API 거부** | 가용성 사고(즉시 발견) | **HIGH** | 275차 401 회귀 |
| 값 불일치(위계) | 양방향 가능 | **CRITICAL** | 286차 |
| 키 집합 불일치 | 미정의 동작 | HIGH | — |

## 4. ★CI Guard Registry (§5) — 275차 선례 확장

- **Registry(§5)**: guard_id · **guard_type · 대상 · 검출 클래스 · CI Phase · 차단 여부** · evidence.
- **★현행 REAL(재사용·확장)**:

| 가드 | 검출 클래스 | 차수 | 확장 방향 |
|---|---|---|---|
| **`tools/guard_headerless_getjson.mjs`** | 헤더리스 getJson **401 회귀**(UI/API 불일치) — **2차 재발 후 클래스 제거** | **275차** | **★본 문서 §3 Drift 가드의 직접 선례** |
| **`tools/e2e/smoke.mjs`** | GET 500 스윕 + **계약키 가드** · **CI Phase6 게이트** | 266차 | **Coverage 검증 확장**(짝 문서 §4) |
| `tools/e2e/render.mjs` | 라우트 자동 도출 · 마운트 크래시 | 266/281차 | 라우트 전수 목록 원천 |
| `tools/e2e/scenarios.mjs` | 쓰기 시나리오(자가정리) | 266차 | 권한 시나리오 확장 |
| `.githooks/baseline.json` | sacred SHA(의도적 변경만) | 267차 | Policy 변경 게이트 |
| **route check · php -l** | 라우트 무결성 | — | PEP 매핑 검증 |

- **★신설 권장 가드(자율)**: **`guard_plan_policy_drift.mjs`** — `PlanPolicy.php` 의 RANK/기능키 매핑과 `frontend/src/auth/planMenuPolicy.js` 의 `PLAN_TIER_RANK`/`MENU_MIN_PLAN` 을 **파싱·대조**하여 **불일치 시 CI 차단**. **★275차 가드와 동일 패턴** · **중복 도구 신설이 아니라 동일 클래스 확장**.
- **★규칙**: **"양쪽 동시 갱신" 을 사람에게 의존하지 마라**(PlanPolicy.php:14 의 지시는 **가드로 대체**되어야 한다) — **286차가 그 의존이 실패한 증거**.

## 5. Reconciliation (§6) · Contract Test (§7) · Error (§8)

- **Reconciliation(§6, 6)**: PlanPolicy ↔ planMenuPolicy.js(값·키) · UI 메뉴 ↔ 라우트(286차 `it.to` 정합 선례) · UI 노출 ↔ API 실 판정(**샘플 호출 대조**) · bypass ↔ UI 노출 · Role 3계통 ↔ UI 표기 · **PDP Adapter 판정 ↔ 기존 게이트 판정**(짝 문서 §2 통합 1단계 — **불일치 = 통합 버그**).
- **Contract Test(§7)**: **역할별 × 메뉴/라우트 매트릭스**를 **실 호출로 검증**(UI 표기와 API 응답이 같은가) — **`tools/e2e/scenarios.mjs` 확장**(중복 신설 금지) · **헤드리스 실검증**(메모리 `feedback_browser_verify_always`·286차 role 별 전 메뉴 공백 사례).
- **Error(§8, 5)**: `AUTHORIZATION_UI_API_DRIFT` · `AUTHORIZATION_PLAN_RANK_MISMATCH` · `AUTHORIZATION_MENU_KEY_MISMATCH` · `AUTHORIZATION_UI_BLOCKS_API_ALLOWS`(**CRITICAL**) · `AUTHORIZATION_UI_ALLOWS_API_BLOCKS`.

## 6. Consistency Matrix — 현행

| 항목 | 백엔드 | 프론트 | 동기화 | 가드 |
|---|---|---|---|---|
| **플랜 위계** | `PlanPolicy::RANK`(:19) | **`PLAN_TIER_RANK`**(:91) | ⚠️ **수동**(주석 :14) | ❌ **부재 → 신설 권장** |
| **기능키→최소플랜** | PlanPolicy(:24) | **`MENU_MIN_PLAN`**(:25) | ⚠️ **수동** | ❌ 부재 |
| **헤더리스 getJson** | — | — | — | ✅ **REAL**(275차 가드) |
| **GET 500·계약키** | — | — | — | ✅ **REAL**(266차 smoke·CI Phase6) |
| **메뉴 키 ↔ 라우트** | ADMIN_MENU | `it.to` | 수동 | △ 286차 검증(1회) |
| **드리프트 사고 이력** | **286차 rank 맵 붕괴** · **275차 401 회귀 2차 재발** | | | |
