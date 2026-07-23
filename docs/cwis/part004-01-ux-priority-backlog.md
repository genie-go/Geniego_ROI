# CWIS Part004-01 — UX 개선 Backlog (P0~P4)

> 작성 2026-07-24 · 근거 = `tools/navigation_analyze.mjs` 실측(`part004-01-issues.json`) + 수동 코드 검증
> ★본 Part 에서는 **진단만** 하고 내비게이션 구조 변경은 하지 않는다. 아래 항목은 Part004-02~09 착수 대상.

## 우선순위 요약

| 심각도 | 건수 | 성격 |
|---|---|---|
| P0 | **0** | 보안·테넌트 격리 결함 없음(실측) |
| P1 | **0** | 핵심 업무 차단 없음(실측) |
| P2 | 7 | 접근성/도달성 저하 — Part004-02·03·06 대상 |
| P3 | 7 | 사용성/구조 드리프트 |
| P4 | 13 | 정보(의도된 설계 5 + 외부진입 2 + 링크전용 5 + 폐기 잔재 1) |

★P0/P1 이 0 인 것은 "검사를 안 해서"가 아니다. 다음 항목을 실제로 검증한 결과다:
Dead Link 0 · 팬텀 컴포넌트 0 · admin 라우트 가드 누락 0 · menu-tree API 실재 · 사이드바 경로 중복 0 ·
플랜 게이트 미적용 실결함 0(의도된 5건은 근거와 함께 P4 로 분류).

---

## P2 — 주요 기능 접근 어려움 (7건)

### B-1. 도달 불가 페이지 5건 (`UNREACHABLE_PAGE`)

메뉴(사이드바·팔레트·모바일)에도, 앱 내 링크(`to`/`navigate`/`href`)에도 없어 **URL 직접 입력 외 진입 경로가 없다.**

| 경로 | 컴포넌트 | 상태 | 처리 방향 |
|---|---|---|---|
| `/amazon-risk` | AmazonRisk | 실페이지 · 플랜게이트 `marketing_advanced` | 진입점 부여 또는 폐기 결정 |
| `/ai-recommend` | AIRecommendTab | 실페이지 · `marketing_advanced` | 상위 페이지 탭으로 흡수 검토(단독 메뉴 신설 금지) |
| `/rules-editor-v2` | RulesEditorV2 (227줄) | 실페이지 · `data||data_schema` | `/ai-rule-engine` 또는 `/data-schema` 내 진입점 |
| `/menu-access-manager` | MenuAccessManager (214줄) | admin 전용(가드 O) | `/admin/plan-pricing`·`/admin/menu-tree` 와 **기능 중복 검토** 후 통합 또는 진입점 |
| `/license` | LicenseActivation | 계정 스코프(미게이트=의도) | Topbar 계정 메뉴에 진입점 |

★`/digital-shelf` 는 `AmazonRisk`·`InfluencerUGC` 에서만 링크된다(P4 `MENU_UNREACHABLE`). 그런데 `AmazonRisk`
자체가 도달 불가라 **실질적으로 2단 도달 불가 사슬**을 이룬다 — B-1 처리 시 함께 판단.

### B-2. 모바일 하단 탭에 권한·플랜 필터 없음 (`MOBILE_NO_PERMISSION_FILTER`)

`MobileBottomNav.jsx` 는 `hasMenuAccess`/`pathToMenuKey` 를 전혀 참조하지 않아 플랜·역할과 무관하게 5탭이 고정 노출된다.
진입 자체는 `MenuAccessGuard` 가 `PlanGate` 로 막으므로 **보안 문제는 아니다**. 다만 사이드바는 잠금(🔒)·업그레이드 배지로
표시하는 것과 규칙이 어긋나 "탭을 눌렀더니 업그레이드 화면"이 반복된다. → Part004-07(반응형 통합)에서 사이드바와 동일 게이트 적용.

### B-3. 테넌트 컨텍스트가 URL 에 없음 (`CONTEXT_NOT_IN_URL`)

테넌트는 `localStorage.tenantId` + `X-Tenant-ID` 헤더로만 전달된다(`services/apiClient.js:39`).
- 같은 브라우저의 다른 탭이 테넌트를 공유 → 탭 간 컨텍스트 충돌
- 공유된 딥링크는 **수신자의 현재 테넌트로 해석**된다(URL 자체가 테넌트 무자격)

서버측 격리는 유지되므로 데이터 유출은 아니다. Part004-03 컨텍스트 전환기 설계의 전제 조건.

---

## P3 — 사용성 저하 (7건)

| # | 항목 | 내용 | 담당 Part |
|---|---|---|---|
| B-4 | `PALETTE_COVERAGE` | Command Palette 28개가 `sidebarManifest` 를 참조하지 않는 **하드코딩** → 회원 메뉴 64개 대비 커버리지 42%. 메뉴를 추가해도 자동 반영되지 않는 구조적 드리프트 | 004-06 |
| B-5 | `PALETTE_ADMIN_ENTRY` | 팔레트 정의에 admin 전용 `/user-management` 혼입(런타임 `hasMenuAccess` 로 차단되나 정의 자체가 혼재) | 004-06 |
| B-6 | `MOBILE_COVERAGE_GAP` | 모바일 탭 `to`/`match` 어디에도 없는 회원 메뉴 15개(PM 4종·연동허브·수요예측 등) — 하단 탭 활성 표시 누락 | 004-07 |
| B-7 | `DUPLICATED_ROUTE_TARGET` | `PricingPublic` 이 `/pricing`·`/app-pricing` 두 경로로 렌더 → canonical URL 부재(즐겨찾기/최근항목/분석 분산) | 004-02 |
| B-8 | `UNDECLARED_ACCESS_KEY` | `system||sub_admin_mgmt` 가 `MENU_MIN_PLAN` 미정의 → `DEFAULT_MIN_PLAN='pro'` 폴백. fail-secure 라 안전하나 의도치 않은 등급 | 004-02 |
| B-9 | `NO_WORKSPACE_CONTEXT` | 워크스페이스 전환 축(UI·URL) 자체가 없음. 워크스페이스=테넌트 단일 KV(`WorkspaceState`) | 004-03 |
| B-10 | `PREFS_DEVICE_LOCAL` | 즐겨찾기·최근항목·개인 메뉴 숨김이 전부 localStorage(디바이스 로컬) — 기기 변경 시 초기화 | 004-04 |

★B-10 주의: `utils/tenantStorage.js` 는 **"UI 프리퍼런스(theme/sidebar/lang/tour)는 디바이스 단위라 스코프 불요"** 를
명시적 설계로 문서화하고 있고, 저장값이 경로 문자열뿐이라 **테넌트 격리 위반이 아니다**. 결함이 아니라 Part004-04 서버 영속 설계의 전제로만 다룬다.

---

## P4 — 정보 / 재플래그 금지 (13건)

### 의도된 미게이트 5건 (`INTENTIONAL_UNGATED`) — 결함 아님

`/payment/success` · `/payment/fail`(PG 콜백) · `/my-coupons`(과금 스코프) · `/license`(플랜 승급 경로 — 게이팅 시 deadlock) ·
`/me/menu`(계정 개인화). 스캐너 `INTENTIONAL_UNGATED` 목록에 근거와 함께 등재되어 있다.

### 외부 진입 전용 2건 (`EXTERNAL_ENTRY_ONLY`) — 결함 아님

`/payment/success` · `/payment/fail` 은 PG 가 리다이렉트하는 콜백이라 앱 내 링크가 없는 것이 정상.

### 링크 전용 도달 5건 (`MENU_UNREACHABLE`)

`/digital-shelf` · `/kr-channel` · `/me/menu` · `/my-coupons` · `/pricing` — 메뉴엔 없으나 앱 내 링크로 도달 가능.

### 폐기 잔재 1건 (`STALE_MATCH_PREFIX`)

`MobileBottomNav` 의 `match` 배열에 라우트가 없는 `/budget-planner` 잔존 — 활성 표시 오탐만 유발.

---

## Part004-02 착수 전 결정이 필요한 사항

1. **메뉴 정본을 어디에 둘 것인가.** 현재 정의는 프론트 정적(`sidebarManifest.js`), 가시성 오버레이는 DB(`menu_tree`).
   Part004-02 "통합 Menu Registry" 를 DB 로 옮기면 **번들 정적 트리와 이원화**되어 부팅 시 메뉴 깜빡임·오프라인 붕괴 위험.
   → 권장: **정의는 정적 유지(SSOT), 레지스트리는 정적 manifest 에서 파생/검증**하는 방향.
2. **워크스페이스를 1급 엔티티로 승격할 것인가.** 승격하지 않으면 Part004-03 Workspace Switcher 는 만들 대상이 없다.
3. **`/menu-access-manager` 존치 여부.** `/admin/plan-pricing`·`/admin/menu-tree` 와의 기능 중복 실사 후 결정.
