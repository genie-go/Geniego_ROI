# CWIS Part004-01 — Navigation Analysis (자동 생성)

> 생성기: `tools/navigation_analyze.mjs` — 정적 분석(소스 미실행). 수정 시 재실행으로 갱신.

## 1. 지표

| 항목 | 값 |
|---|---|
| navigation_items_discovered | 77 |
| sidebar_member_items | 64 |
| sidebar_admin_items | 13 |
| routes_total | 137 |
| routes_authenticated | 123 |
| routes_public | 14 |
| routes_redirect | 24 |
| command_palette_items | 28 |
| mobile_tabs | 5 |
| navigation_dead_links_total | 0 |
| navigation_duplicates_total | 1 |
| navigation_permission_mismatches_total | 1 |
| navigation_unreachable_total | 5 |
| issues | P0=0 · P1=0 · P2=7 · P3=12 · P4=13 |

## 2. 메뉴 트리

### MEMBER

- **home** (gNav.home)
  - `/dashboard` — gNav.dashboardLabel · plan=free · status=ACTIVE
  - `/rollup` — gNav.rollupLabel · plan=free · status=ACTIVE
- **ai_marketing** (gNav.aiMarketing)
  - `/auto-marketing` — gNav.autoMarketingLabel · plan=starter · status=ACTIVE
  - `/campaign-manager` — gNav.campaignManagerLabel · plan=starter · status=ACTIVE
  - `/journey-builder` — gNav.journeyBuilderLabel · plan=growth · status=ACTIVE
  - `/onsite-cro` — gNav.onsiteCroLabel · plan=growth · status=ACTIVE
  - `/web-popup` — gNav.webPopupLabel · plan=growth · status=ACTIVE
- **ad_analytics** (gNav.adAnalytics)
  - `/marketing` — gNav.adPerformanceLabel · plan=starter · status=ACTIVE
  - `/budget-tracker` — gNav.budgetTrackerLabel · plan=growth · status=ACTIVE
  - `/account-performance` — gNav.accountPerformanceLabel · plan=growth · status=ACTIVE
  - `/attribution` — gNav.attributionLabel · plan=growth · status=ACTIVE
  - `/marketing-mix` — gNav.marketingMixLabel · plan=growth · status=ACTIVE
  - `/channel-kpi` — gNav.channelKpiLabel · plan=growth · status=ACTIVE
  - `/graph-score` — gNav.graphScoreLabel · plan=growth · status=ACTIVE
- **crm** (gNav.crmLabel)
  - `/crm` — gNav.crmMainLabel · plan=starter · status=ACTIVE
  - `/kakao-channel` — gNav.kakaoChannelLabel · plan=starter · status=ACTIVE
  - `/email-marketing` — gNav.emailMarketingLabel · plan=starter · status=ACTIVE
  - `/sms-marketing` — gNav.smsMarketingLabel · plan=starter · status=ACTIVE
  - `/line-channel` — gNav.lineChannelLabel · plan=growth · status=ACTIVE
  - `/whatsapp` — gNav.whatsappLabel · plan=growth · status=ACTIVE
  - `/instagram-dm` — gNav.instagramDmLabel · plan=growth · status=ACTIVE
  - `/influencer` — gNav.influencerLabel · plan=growth · status=ACTIVE
  - `/content-calendar` — gNav.contentCalendarLabel · plan=starter · status=ACTIVE
  - `/reviews-ugc` — gNav.reviewsUgcLabel · plan=starter · status=ACTIVE
- **commerce** (gNav.commerceLabel)
  - `/omni-channel` — gNav.omniChannelLabel · plan=free · status=ACTIVE
  - `/catalog-sync` — gNav.catalogLabel · plan=free · status=ACTIVE
  - `/live-commerce` — gNav.liveCommerceLabel · plan=pro · status=ACTIVE
  - `/order-hub` — gNav.orderHubLabel · plan=free · status=ACTIVE
  - `/wms-manager` — gNav.wmsLabel · plan=pro · status=ACTIVE
  - `/price-opt` — gNav.priceOptLabel · plan=pro · status=ACTIVE
  - `/supply-chain` — gNav.supplyChainLabel · plan=pro · status=ACTIVE
  - `/demand-forecast` — gNav.demandForecastLabel · plan=pro · status=ACTIVE
  - `/returns-portal` — gNav.returnsPortalLabel · plan=pro · status=ACTIVE
  - `/operations` — gNav.operationsLabel · plan=pro · status=ACTIVE
- **analytics** (gNav.analytics)
  - `/performance` — gNav.performanceHubLabel · plan=free · status=ACTIVE
  - `/report-builder` — gNav.reportBuilderLabel · plan=growth · status=ACTIVE
  - `/pnl` — gNav.pnlLabel · plan=growth · status=ACTIVE
  - `/ai-insights` — gNav.aiInsightsLabel · plan=growth · status=ACTIVE
- **automation** (gNav.automation)
  - `/ai-rule-engine` — gNav.aiRuleEngineLabel · plan=pro · status=ACTIVE
  - `/approvals` — gNav.approvalsLabel · plan=pro · status=ACTIVE
  - `/writeback` — gNav.writebackLabel · plan=pro · status=ACTIVE
  - `/onboarding` — gNav.onboardingLabel · plan=free · status=ACTIVE
- **pm** (gNav.pmGroup)
  - `/pm` — gNav.pmOverviewLabel · plan=pro · status=ACTIVE
  - `/pm/portfolio` — gNav.pmPortfolioLabel · plan=pro · status=ACTIVE
  - `/pm/resources` — gNav.pmResourcesLabel · plan=pro · status=ACTIVE
  - `/pm/collaboration` — gNav.pmCollaborationLabel · plan=pro · status=ACTIVE
- **data** (gNav.data)
  - `/integration-hub` — gNav.integrationHubLabel · plan=free · status=ACTIVE
  - `/data-schema` — gNav.dataSchemaLabel · plan=pro · status=ACTIVE
  - `/data-trust` — gNav.dataTrustLabel · plan=pro · status=ACTIVE
  - `/data-assets` — gNav.dataAssetsLabel · plan=pro · status=ACTIVE
  - `/pixel-tracking` — gNav.pixelTracking · plan=pro · status=ACTIVE
  - `/data-product` — gNav.dataProductLabel · plan=pro · status=ACTIVE
- **finance** (gNav.finance)
  - `/settlements` — gNav.settlementsLabel · plan=free · status=ACTIVE
  - `/reconciliation` — gNav.reconciliationLabel · plan=free · status=ACTIVE
  - `/payment-methods` — gNav.paymentMethodsLabel · plan=free · status=ACTIVE
  - `/app-pricing` — gNav.pricingLabel · plan=free · status=ACTIVE
- **member_tools** (gNav.memberTools)
  - `/team-members` — gNav.memberComposeLabel · plan=free · status=ACTIVE
  - `/workspace` — gNav.workspaceLabel · plan=free · status=ACTIVE
  - `/agency-access` — gNav.agencyAccessLabel · plan=free · status=ACTIVE
  - `/case-study` — gNav.caseStudyLabel · plan=free · status=ACTIVE
  - `/help` — gNav.helpLabel · plan=free · status=ACTIVE
  - `/feedback` — gNav.feedbackLabel · plan=free · status=ACTIVE
  - `/audit` — gNav.auditLogLabel · plan=free · status=ACTIVE
  - `/developer-hub` — gNav.developerHubLabel · plan=enterprise · status=ACTIVE

### ADMIN

- **system** (gNav.adminSystem)
  - `/admin` — gNav.platformEnvLabel · plan=admin · status=HIDDEN_BY_PERMISSION
  - `/admin/growth` — gNav.growthCenterLabel · plan=admin · status=HIDDEN_BY_PERMISSION
  - `/admin/plan-pricing` — gNav.planPricingLabel · plan=admin · status=HIDDEN_BY_PERMISSION
  - `/user-management` — gNav.memberMgmtLabel · plan=admin · status=HIDDEN_BY_PERMISSION
  - `/admin/access-review` — gNav.accessReviewLabel · plan=admin · status=HIDDEN_BY_PERMISSION
  - `/admin/sub-admins` — gNav.subAdminMgmtLabel · plan=pro · status=HIDDEN_BY_PERMISSION
  - `/admin/agencies` — gNav.agencyMgmtLabel · plan=admin · status=HIDDEN_BY_PERMISSION
  - `/admin/site-intro` — gNav.siteIntroLabel · plan=admin · status=HIDDEN_BY_PERMISSION
  - `/admin/legal-docs` — gNav.legalDocsLabel · plan=admin · status=HIDDEN_BY_PERMISSION
  - `/admin/menu-tree` — gNav.menuTreeLabel · plan=admin · status=HIDDEN_BY_PERMISSION
  - `/db-admin` — gNav.dbSchemaLabel · plan=admin · status=HIDDEN_BY_PERMISSION
  - `/pg-config` — gNav.paymentPgLabel · plan=admin · status=HIDDEN_BY_PERMISSION
  - `/system-monitor` — gNav.systemMonitorLabel · plan=admin · status=HIDDEN_BY_PERMISSION

## 3. 이슈 (심각도순)

| 심각도 | 코드 | 대상 | 내용 |
|---|---|---|---|
| P2 | CONTEXT_NOT_IN_URL | `(tenant context)` | 테넌트 컨텍스트가 URL 이 아니라 localStorage.tenantId(디바이스 전역)에만 있다 → ① 같은 브라우저 다른 탭에서 테넌트를 바꾸면 두 탭이 같은 컨텍스트를 공유(탭 간 충돌), ② 공유된 딥링크가 수신자의 현재 테넌트로 해석된다(URL 자체는 테넌트 무자격). 서버측 격리는 유지되므로 데이터 유출은 아니나, 화면이 조용히 다른 테넌트를 가리킬 수 있다. |
| P2 | MOBILE_NO_PERMISSION_FILTER | `(mobile bottom nav)` | 모바일 하단 탭이 hasMenuAccess/pathToMenuKey 를 전혀 쓰지 않는다 → 플랜/역할과 무관하게 5개 탭 고정 노출. 탭 진입 자체는 MenuAccessGuard 가 PlanGate 로 막지만, 사용자에겐 "쓸 수 없는 탭"이 계속 보인다(사이드바와 노출 규칙 불일치). |
| P2 | UNREACHABLE_PAGE | `/ai-recommend` | 메뉴(사이드바/팔레트/모바일)에도, 앱 내 링크(to/navigate/href)에도 없다 → URL 직접입력 외 도달 불가. |
| P2 | UNREACHABLE_PAGE | `/amazon-risk` | 메뉴(사이드바/팔레트/모바일)에도, 앱 내 링크(to/navigate/href)에도 없다 → URL 직접입력 외 도달 불가. |
| P2 | UNREACHABLE_PAGE | `/license` | 메뉴(사이드바/팔레트/모바일)에도, 앱 내 링크(to/navigate/href)에도 없다 → URL 직접입력 외 도달 불가. |
| P2 | UNREACHABLE_PAGE | `/menu-access-manager` | 메뉴(사이드바/팔레트/모바일)에도, 앱 내 링크(to/navigate/href)에도 없다 → URL 직접입력 외 도달 불가. |
| P2 | UNREACHABLE_PAGE | `/rules-editor-v2` | 메뉴(사이드바/팔레트/모바일)에도, 앱 내 링크(to/navigate/href)에도 없다 → URL 직접입력 외 도달 불가. |
| P3 | A11Y_DIALOG_SEMANTICS | `(command palette)` | Ctrl+K 팔레트가 오버레이 모달인데 다이얼로그 시맨틱이 누락: dialog, ariaModal, label, activedescendant. 포커스 트랩도 없어 Tab 이 배경 페이지로 빠진다. (Escape/방향키 조작은 구현되어 있다: escape=true, arrowKeys=true) |
| P3 | A11Y_NO_NAV_LANDMARK | `(desktop sidebar)` | 데스크톱 사이드바가 <nav> 랜드마크도 role="navigation" 도 쓰지 않는다(div 구조) → 스크린리더의 랜드마크 점프로 주 내비게이션을 찾을 수 없다. (섹션 단위 aria-expanded/aria-controls/role="region" 은 이미 적용되어 있어 아코디언 자체는 양호. 모바일 하단 탭은 role="navigation" 보유.) |
| P3 | A11Y_NO_SKIP_LINK | `(global)` | Skip Link(본문 바로가기)가 없다 → 키보드 사용자가 매 페이지마다 사이드바 77개 링크를 Tab 으로 통과해야 본문에 도달한다(WCAG 2.4.1 Bypass Blocks 미충족). |
| P3 | DUPLICATED_ROUTE_TARGET | `/pricing , /app-pricing` | 동일 컴포넌트 PricingPublic 가 서로 다른 2개 경로로 렌더 → canonical URL 부재(즐겨찾기/최근항목/분석 분산). |
| P3 | MOBILE_COVERAGE_GAP | `(15 paths)` | 모바일 하단 탭의 to/match 어디에도 없는 회원 메뉴 15개: /onsite-cro, /budget-tracker, /account-performance, /marketing-mix, /live-commerce, /pm, /pm/portfolio, /pm/resources, /pm/collaboration, /integration-hub, /data-assets, /payment-methods …. (사이드바 자체는 모바일에서도 열리므로 완전 차단은 아니며, 하단 탭 활성표시/바로가기에서 누락된다.) |
| P3 | NO_WORKSPACE_CONTEXT | `(workspace context)` | 워크스페이스 전환 UI·URL 컨텍스트가 존재하지 않는다(워크스페이스=테넌트 단일 KV). Part004-03 Workspace Switcher 는 "기존 전환기 확장"이 아니라 신규 축 도입 — 도입 전 워크스페이스 1급 엔티티 여부 결정 필요. |
| P3 | ORPHAN_NAV_COMPONENT | `components/GlobalSearch.jsx` | GlobalSearch 컴포넌트가 어디에서도 import/마운트되지 않는다(사장된 코드). 내부에 43개 경로의 **네 번째 하드코딩 메뉴 인덱스**를 들고 있어 Part004-06(통합 검색) 착수 시 '신규 구현'이 아니라 '기존 자산 재활성화 또는 폐기' 판단이 먼저다. |
| P3 | PALETTE_ADMIN_ENTRY | `/user-management` | Command Palette 에 admin 전용 명령(system\|\|user_management) 포함 — 런타임 hasMenuAccess 필터로 차단되지만 정의 자체가 admin 메뉴를 회원 팔레트에 섞는다. |
| P3 | PALETTE_COVERAGE | `(command palette)` | 팔레트 명령 28개 중 사이드바 정본과 일치 27개. 사이드바 회원 메뉴 64개 대비 커버리지 42% — 팔레트가 manifest 를 참조하지 않고 하드코딩이라 메뉴 추가 시 자동 반영되지 않는다(구조적 드리프트). |
| P3 | PREFS_DEVICE_LOCAL | `(user navigation preferences)` | 즐겨찾기·최근항목·개인 메뉴 숨김이 전부 localStorage(디바이스 로컬)에만 있고 서버 영속이 없다 → 기기/브라우저를 바꾸면 초기화되고 계정 간 이동도 안 된다. ★단 tenantStorage.js 는 "UI 프리퍼런스는 디바이스 단위라 스코프 불요"를 명시적 설계로 문서화하고 있고 저장값이 경로 문자열뿐이라 **테넌트 격리 위반은 아니다**(결함 아님 — Part004-04 서버 영속 설계 시의 전제). |
| P3 | SHORTCUT_CONFLICT | `Ctrl/Cmd+K` | Ctrl+K 를 CommandPalette / KeyboardShortcuts 가 각각 window 리스너로 가로채고 둘 다 preventDefault 한다 → 동작이 등록 순서에 의존. 게다가 KeyboardShortcuts 가 포커스를 옮기려는 [data-search-input] 요소는 저장소에 존재하지 않는다(팬텀 타깃). 단축키 소유권 일원화 필요. |
| P3 | UNDECLARED_ACCESS_KEY | `system||sub_admin_mgmt` | 사이드바가 쓰는 menuKey 가 MENU_MIN_PLAN 에 없다 → DEFAULT_MIN_PLAN(pro) 폴백. fail-secure 라 보안 문제는 아니나 의도치 않은 상위플랜 게이팅 위험. |
| P4 | EXTERNAL_ENTRY_ONLY | `/payment/fail` | 외부 진입 전용(정상): PG 결제 실패 리다이렉트 콜백 — 위와 동일. (재감사 시 도달불가로 재플래그 금지) |
| P4 | EXTERNAL_ENTRY_ONLY | `/payment/success` | 외부 진입 전용(정상): PG(결제사)가 리다이렉트하는 콜백 — 앱 내 링크가 없는 것이 정상. (재감사 시 도달불가로 재플래그 금지) |
| P4 | INTENTIONAL_UNGATED | `/license` | 게이트 미적용이 의도됨: 라이선스 활성화 — 플랜 승급 경로 자체라 게이팅하면 잠금(deadlock). (재감사 시 결함으로 재플래그 금지) |
| P4 | INTENTIONAL_UNGATED | `/me/menu` | 게이트 미적용이 의도됨: 개인 메뉴 표시 설정 — 계정 개인화 스코프(플랜 무관). (재감사 시 결함으로 재플래그 금지) |
| P4 | INTENTIONAL_UNGATED | `/my-coupons` | 게이트 미적용이 의도됨: 보유 쿠폰/구독 혜택 — 과금 스코프(PlanGate 자체가 여기로 유도). (재감사 시 결함으로 재플래그 금지) |
| P4 | INTENTIONAL_UNGATED | `/payment/fail` | 게이트 미적용이 의도됨: PG 결제 실패 콜백 — 위와 동일. (재감사 시 결함으로 재플래그 금지) |
| P4 | INTENTIONAL_UNGATED | `/payment/success` | 게이트 미적용이 의도됨: PG 결제 콜백 — 결제 직후 모든 플랜이 도달해야 한다(게이팅 시 결제 완료 화면 소실). (재감사 시 결함으로 재플래그 금지) |
| P4 | MENU_UNREACHABLE | `/digital-shelf` | 메뉴 미등재(앱 내 링크로만 도달): frontend/src/pages/AmazonRisk.jsx, frontend/src/pages/InfluencerUGC.jsx |
| P4 | MENU_UNREACHABLE | `/kr-channel` | 메뉴 미등재(앱 내 링크로만 도달): frontend/src/pages/PnLDashboard.jsx |
| P4 | MENU_UNREACHABLE | `/me/menu` | 메뉴 미등재(앱 내 링크로만 도달): frontend/src/layout/Topbar.jsx |
| P4 | MENU_UNREACHABLE | `/my-coupons` | 메뉴 미등재(앱 내 링크로만 도달): frontend/src/components/PlanGate.jsx |
| P4 | MENU_UNREACHABLE | `/pricing` | 메뉴 미등재(앱 내 링크로만 도달): frontend/src/components/PlanGate.jsx, frontend/src/layout/PremiumLayout.jsx, frontend/src/pages/Approvals.jsx 외 |
| P4 | STALE_MATCH_PREFIX | `/budget-planner` | 모바일 탭 활성화 판정(match)에 남은 폐기 경로 — 라우트 부재. 오탐 활성표시만 유발(기능 영향 없음). |
