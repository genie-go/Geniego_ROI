# CWIS Part004-01 — Implementation Report

> 작성 2026-07-24 · 판정: **COMPLETED_WITH_LIMITATIONS**
> ★교차검증 원칙(`feedback_cross_verify_all_commands`) 적용 — 명세를 맹목 이행하지 않고 실제 스택으로 적응.

---

## 1. 판정 근거

**완료**: 내비게이션 전 소스 전수 분석 + **실동작하는 진단 기반**(Scanner 6종 · Checker 15종 · Report Generator ·
CLI · 자동 테스트 36건)을 저장소 실제 스택으로 구현하고, 발견한 실결함 1건을 무회귀 수정했다.

**한계(설계상 의도)**: 명세의 `php artisan collaboration:navigation:analyze`(Laravel Console) · Blade/Twig 스캐너 ·
DB Navigation 스캐너 · PHPStan Level 8 · PHPUnit/Pest 는 **해당 스택이 존재하지 않아** 구현 대상이 없다.
아래 §2 에 각 항목의 부재 증거와 적응 방식을 남긴다. 또한 색상 대비비·스크린리더 실동작·실기기 반응형은
정적 분석으로 확정 불가라 **미측정**으로 정직 표기한다(측정한 것처럼 쓰지 않는다).

---

## 2. 교차검증 — 명세 전제 vs 실제 (부재 증명)

| 명세 전제 | 실제 | 증거 | 처리 |
|---|---|---|---|
| Laravel `php artisan` / Symfony Console | 없음 | `backend/bin/*` 은 전부 순수 PHP cron 스크립트, `artisan` 파일 부재 | `tools/*.mjs` CI 가드 계열로 적응 |
| Blade / Twig 템플릿 메뉴 | 없음 | `resources/views` 부재 · 백엔드는 JSON API 전용(Slim) | 스캐너 미구현(대상 없음) |
| DB 기반 메뉴 정의 | **부분** — 정의는 프론트 정적, DB 는 **가시성 오버레이만** | `menu_tree`(AdminMenu.php:107) 는 visibility/required_role/required_plan 만 보유 | 오버레이로 분류·정본 아님 |
| Eloquent / Repository / Enum / VO | 없음(Enum 0개 — CCIS Part005) | `grep -r "enum "` 백엔드 0건 | JS 상수 + PHP const 배열로 적응 |
| PHPStan Level 8 | Level 5 + baseline 215건 | `backend/phpstan.neon` | Level 5 로 실행(§8) |
| PHPUnit / Pest | 테스트 러너 없음 | `composer.json` require-dev 에 phpstan 만 | 의존성 0 자기검증 스크립트로 적응(§7) |
| `storage/app/cwis/` 출력 | `storage/` 디렉터리 없음 | — | `docs/cwis/`(리포트) + `backend/data/`(API 스냅샷) |

**결론**: 내비게이션 정본은 **100% 프론트엔드 정적 소스**다. PHP 런타임에 두 번째 분석 엔진을 만드는 것은
헌법 Reuse→Extend 위배(중복)이므로, 분석은 빌드타임 Node 스캐너가 수행하고 PHP 는 **스냅샷 노출 창구**만 맡는다.

---

## 3. 메뉴 정의 Source 인벤토리 (실측 — 5개 소스 병존)

| # | Source | 파일 | 항목 수 | 정본 여부 |
|---|---|---|---|---|
| 1 | 사이드바 manifest | `frontend/src/layout/sidebarManifest.js` | 회원 64 + 관리자 13 = **77** | **정본** |
| 2 | SPA 라우트 | `frontend/src/App.jsx` | 137 (인증 123 · 공개 14 · 리다이렉트 24) | 라우팅 정본 |
| 3 | Command Palette | `components/CommandPalette.jsx` | 28 (하드코딩) | 파생·드리프트 |
| 4 | 모바일 하단 탭 | `components/MobileBottomNav.jsx` | 5탭 + match 프리픽스 | 파생·드리프트 |
| 5 | **GlobalSearch(미장착)** | `components/GlobalSearch.jsx` | 43 (하드코딩) | **어디에도 마운트 안 됨** |

부가 레이어:
- 플랜 게이트 정책 — `auth/planMenuPolicy.js` (`MENU_MIN_PLAN` 등급표 + `_EXTRA_PATH_MENUKEYS` 5건 + `DEFAULT_MIN_PLAN='pro'` fail-secure)
- 가시성 오버레이 — `menu_tree`(DB) → `MenuVisibilityContext`(전역 hidden/disabled > 개인 hidden)
- 라벨 사전 — `layout/sidebarI18n.js` **SIDEBAR_DICT[15개 언어]** (★ `i18n/locales/*.js` 의 `gNav.*` 가 **아니다** — §6 참조)

---

## 4. 메뉴 트리

전체 트리(회원 11그룹 · 관리자 1그룹 · 항목별 plan/status)는 자동 생성 문서에 있다:
`docs/cwis/part004-01-navigation-analysis.md` §2.

- **Desktop(회원)**: home / ai_marketing / ad_analytics / crm / commerce / analytics / automation / **pm** / data / finance / member_tools (11그룹 64항목)
- **Admin**: system 1그룹 13항목(전부 `AdminRouteGuard` 적용 확인)
- **Mobile**: 하단 5탭(home / analytics / marketing / commerce / more) + 사이드바 드로어 공용
- **PM**: `/pm`, `/pm/portfolio`, `/pm/resources`, `/pm/collaboration` + 프로젝트 스코프 동적 라우트 10종(`/pm/projects/:id/*`)

---

## 5. 진단 결과 (실측)

| 검사 | 결과 |
|---|---|
| Dead Link (메뉴 O · 라우트 X) | **0건** |
| 팬텀 컴포넌트 (lazy import 대상 파일 부재) | **0건** |
| 사이드바 경로 중복 등재 | **0건** (257차에 제거된 `/operations` 중복이 재발하지 않음을 확인) |
| admin 라우트 가드 누락 | **0건** |
| 리다이렉트 순환 / 끊긴 리다이렉트 | **0건** |
| 플랜 게이트 실갭 | **0건** (의도된 미게이트 5건은 근거와 함께 P4 분류) |
| menu-tree API 실재(팬텀 API) | 정상 — `GET /v425/menu-tree`, `GET /v425/admin/menu-tree` 모두 `$custom` 존재 |
| **도달 불가 페이지** | **5건** (P2) |
| **모바일 권한 필터 부재** | 1건 (P2) |
| **테넌트 컨텍스트 URL 부재** | 1건 (P2) |
| 구조 드리프트/사용성 | 12건 (P3) |
| 정보·의도된 설계 | 13건 (P4) |

**P0/P1 = 0**. 이는 검사 누락이 아니라 위 표의 8개 항목을 실제로 검증한 결과다.
전체 목록: `part004-01-issues.json` · 우선순위 백로그: `part004-01-ux-priority-backlog.md`.

### 5.1 도달 불가 페이지 5건

`/amazon-risk` · `/ai-recommend` · `/rules-editor-v2` · `/menu-access-manager` · `/license`
— 메뉴에도 앱 내 링크(`to`/`navigate`/`href`)에도 없어 URL 직접 입력 외 진입 불가.
★`/digital-shelf` 는 `/amazon-risk` 에서만 링크되므로 **2단 도달 불가 사슬**을 이룬다.

### 5.2 권한 ↔ 노출 불일치

- **메뉴 보임 + API 거부**: 없음. 사이드바는 `hasMenuAccess` 로 잠금(🔒)·업그레이드 배지 표시, 딥링크는 `MenuAccessGuard`+`PlanGate`, 서버는 별도 강제 — 3중 정합.
- **메뉴 숨김 + 접근 가능**: 없음. `pathToMenuKey`(정확일치 → 최장 prefix, `/` 경계) 재현 검증으로 확인.
- **모바일**: `MobileBottomNav` 가 `hasMenuAccess`/`pathToMenuKey` 를 전혀 참조하지 않아 플랜·역할 무관 5탭 고정 노출.
  진입은 `MenuAccessGuard` 가 막으므로 **보안 결함은 아니나** 사이드바와 노출 규칙이 어긋난다(P2).
- **Command Palette**: admin 전용 `/user-management` 가 정의에 혼입(런타임 필터로 차단됨 — P3 위생 문제).
- **게스트/파트너**: Part003 에서 `PM\Shared::gate` 가 전면 Default Deny(403) — 본 Part 에서 변경 없음.

### 5.3 Context 전환

| 축 | URL 반영 | 저장 위치 | 전환 UI |
|---|---|---|---|
| Tenant | ✗ | `localStorage.tenantId` + `X-Tenant-ID` 헤더 | (관리자 act-as/대행사 배너만) |
| Organization | ✗ | 조직=tenant 매핑(Part002) — 별도 축 없음 | 없음 |
| Workspace | ✗ | `WorkspaceState`(tenant KV) | **없음** |
| Project | **✓** | `/pm/projects/:id` (라우트 10종) | 프로젝트 목록 |

→ ① 테넌트가 URL 에 없어 탭 간 컨텍스트 공유·딥링크 무자격 문제(P2), ② 워크스페이스는 **전환할 축 자체가 없다**(P3).
Part004-03 착수 전 "워크스페이스를 1급 엔티티로 승격할 것인가" 결정이 선행되어야 한다.

### 5.4 사용자 설정 저장 구조

| 키 | 용도 | 위치 | 테넌트 스코프 |
|---|---|---|---|
| `g_sidebar_favs` | 즐겨찾기 | localStorage | ✗ |
| `g_sidebar_recents` | 최근 방문 5건(경로만) | localStorage | ✗ |
| `g_user_menu_visibility` | 개인 메뉴 숨김 | localStorage | ✗ |
| `g_admin_menu_tree_cache` | 가시성 캐시(TTL 5분) | localStorage | ✗ |
| `menu_tree` | 전역 가시성/필수역할/필수플랜 | MySQL | ✗(플랫폼 전역) |

★**테넌트 격리 위반 아님**: `utils/tenantStorage.js` 가 *"UI 프리퍼런스(theme/sidebar/lang/tour)는 디바이스 단위라
스코프 불요"* 를 명시적 설계로 문서화했고 저장값이 경로 문자열뿐이다. 결함으로 재플래그하지 말 것.
다만 **서버 영속이 없어** 기기 변경 시 초기화된다 — Part004-04 의 전제.

### 5.5 검색 · 알림 재사용 구조

- **통합 검색**: 백엔드에 전역 검색 엔드포인트 **부재**(`/search` 라우트 0건). 페이지별 로컬 필터만 존재.
  Elasticsearch/OpenSearch/Meilisearch/Algolia/pgvector **전부 미사용**.
  ★**`GlobalSearch.jsx`(43경로 인덱스)가 이미 존재하나 어디에도 마운트되지 않는다** → Part004-06 은
  "신규 구현"이 아니라 **기존 자산 재활성화 또는 폐기 판단**이 먼저다(중복 신설 금지).
- **Command Palette**: `Ctrl+K` 실동작 + 플랜 필터 적용됨. 단 manifest 미참조 하드코딩 28건(커버리지 42%).
- **단축키 충돌**: `CommandPalette` 와 `KeyboardShortcuts` 가 **둘 다 Ctrl+K 를 가로채고 각각 preventDefault** 한다.
  게다가 후자가 포커스를 옮기려는 `[data-search-input]` 요소는 저장소에 존재하지 않는다(팬텀 타깃). 소유권 일원화 필요.
- **알림**: `GET /auth/notifications`(user_notification) + WebPush + 사이드바 미읽음 배지 실재 → Part004-05
  Unified Inbox 는 **기존 알림 파이프라인 확장**이 정답.

### 5.6 접근성 (WCAG 2.2 AA · 정적 검사 범위)

| 항목 | 결과 |
|---|---|
| 사이드바 아코디언 | **양호** — `<button>` + `aria-expanded` + `aria-controls` + `role="region"` + `aria-label` |
| 모바일 하단 탭 | **양호** — `<nav role="navigation" aria-label>`, `NavLink` 가 `aria-current` 자동 부여 |
| Skip Link | **부재** — 매 페이지 사이드바 링크 전부를 Tab 통과해야 본문 도달(WCAG 2.4.1 미충족) |
| 사이드바 랜드마크 | **부재** — `<nav>`/`role="navigation"` 없이 div 구조(WCAG 1.3.1) |
| Command Palette 다이얼로그 | `role="dialog"`·`aria-modal`·`aria-label`·`aria-activedescendant` **전부 부재**, 포커스 트랩 없음. 단 Escape·↑↓·Enter 는 동작 |
| 키보드 조작 | Tab/Shift+Tab/Enter/Escape/↑↓ 동작. Home/End/←→ 는 아코디언 미지원 |

**미측정(정적 분석 불가 — 측정한 척하지 않음)**: 색상 대비비, 스크린리더 실제 낭독, `prefers-reduced-motion`
실효(모바일 탭은 `pulse-glow` 무한 애니메이션 사용 — 실기기 검증 필요).

### 5.7 반응형

`useIsMobile` 임계값 768px 단일(320/375 별도 분기 없음). 사이드바는 `matchMedia('(max-width: 768px)')` 로
모바일 시 "펼침 전용"(즉시 네비게이션 금지 — drawer 조기 닫힘 방지) 처리됨. 터치 타깃 모바일 48px 확보.
**미측정**: 320/375/768/1024/1440 실기기 렌더링. 정적으로는 임계값 구조만 확인했다.

---

## 6. 수정한 실결함 (1건 · 무회귀 additive)

**SIDEBAR_DICT 라벨 누락 → 15개 언어 전부에 한글 누출**

- 근거: `Sidebar.jsx:248` — `const label = item.labelKey ? t(item.labelKey, item.label ?? …) : item.label`.
  `navT` 는 `SIDEBAR_DICT[lang][leaf]` 를 찾고 없으면 **manifest 의 한글 `label` 을 폴백**한다.
- `gNav.pmCollaborationLabel`(협업 · CWIS Part001 추가) · `gNav.accessReviewLabel`(접근 검토 · EPIC06-A Part3-8 추가)가
  15개 언어 사전에 **전무** → 일본어/영어/아랍어 사용자에게도 "협업"·"접근 검토"가 한글로 렌더되고 있었다.
- ★Part001 보고서는 `i18n/locales/{ko,en}.js` 에 `gNav.pmCollaborationLabel` 을 추가했다고 기록했으나,
  **사이드바는 그 파일을 읽지 않는다**(정본은 `sidebarI18n.js`) — 작업물 미적용 사례.
- 조치: `frontend/src/layout/sidebarI18n.js` 에 2키 × 15언어 = **30건 추가**. 기존 값은 한 건도 덮어쓰지 않음(스크립트가 `undefined` 일 때만 삽입).
- 검증: 15개 언어 재파싱 후 `MISSING_SIDEBAR_LABEL` 15 → **0**, ko/ja/ar/ru 실값 육안 확인, 기존 `dashboardLabel` 무손상 확인.

---

## 7. 구현물

### 7.1 `tools/navigation_analyze.mjs` (신규 · 약 780줄)

**Scanner 6종** (명세 §22.1 `NavigationSourceScanner::scan()` 계약을 JS 로 적응):

| Scanner | 대상 |
|---|---|
| `scanSidebarManifest` | `sidebarManifest.js` — 섹션/leaf/menuKey/ADMIN_ONLY_MENU_KEYS |
| `scanSpaRoutes` | `App.jsx` — 라우트·컴포넌트·가드·리다이렉트·인증셸/공개 구분·lazy import 매핑 |
| `scanCommandPalette` | `CommandPalette.jsx` COMMANDS |
| `scanMobileNav` | `MobileBottomNav.jsx` TAB_DEFS(to + match) |
| `scanPlanPolicy` | `planMenuPolicy.js` — MENU_MIN_PLAN·_EXTRA_PATH_MENUKEYS·DEFAULT_MIN_PLAN |
| `scanBackendRoutes` | `routes.php` `$custom` 맵(메뉴 API 실재 확인) |

보조: `scanInAppLinks`(전 소스 `to`/`navigate`/`href` 역인덱스) · `scanSidebarDict`(15개국 라벨 사전) ·
`detectComponentRedirect`(페이지 레벨 `<Navigate>` 별칭 탐지).

**Checker 15종**: Dead Link · 리다이렉트 무결성(순환/끊김) · 팬텀 컴포넌트 · 플랜 게이트 갭 ·
미선언 access key · admin 노출 정합 · 도달 불가 · 중복(경로/컴포넌트) · 소스 드리프트(팔레트) ·
모바일 커버리지/권한필터 · 팬텀 메뉴 API · 라벨 사전 커버리지 · Context Navigation · 설정 저장소 ·
접근성 5종(Skip Link·랜드마크·다이얼로그 시맨틱·단축키 충돌·미장착 컴포넌트).

**Report Generator**: Markdown 1 + JSON 5.

**CLI 옵션**: `--format=json|md|both` · `--output=<dir>` · `--fail-on=P0|P1|P2|none` ·
`--check-routes` · `--check-permissions` · `--check-i18n` · `--snapshot` · `--quiet`.

### 7.2 `tools/navigation_analyze_selftest.mjs` (신규 · 36 테스트)

Unit(파서·pathToMenuKey 동치성·리다이렉트 탐지) / Integration(실소스 스캔 정합) /
Security(소스 미실행 검증·경로 화이트리스트·시크릿 마스킹·크로스테넌트 부재) /
Regression(별칭 오탐 금지·ALWAYS_ACCESSIBLE 오탐 금지·메뉴 항목 수 스냅샷 64+13·경로 중복 0).

### 7.3 백엔드 (additive · +69줄, 삭제 0)

- `PM\Collaboration::navigationAnalysis` — `GET /v425/pm/collaboration/navigation/analysis`(+`/api` 별칭).
  **admin 게이트 + 테넌트 격리**(`Shared::gate('admin')` — 게스트/파트너는 상위 Default Deny) · `pm_audit_log` 감사 ·
  입력 경로 화이트리스트(`backend/data` 밖 절대 미열람) · **스냅샷 부재 시 `available:false` + 사유 + 생성방법**
  (0 이나 빈 배열로 '정상'인 척하지 않음).
- Capability Registry 8건 등록 — `analysis=ENABLED` / `registry=ANALYZING` / `favorites·recents·command_palette=PARTIAL`(실물이 존재하므로 정직 반영) / `sidebar·context_switcher·personal_hub=PLANNED`.
- `backend/data/cwis_navigation_analysis.json` — 배포와 함께 실리는 읽기 전용 스냅샷.

### 7.4 프론트엔드 (additive)

- `CollaborationHome.jsx` — 기존 협업 홈 안에 "🧭 내비게이션 진단" 접이식 섹션 추가.
  **신규 메뉴·라우트를 만들지 않았다**(`feedback_minimize_new_menus`·중복 메뉴 금지).
  기본 접힘 · 펼칠 때만 로드 · `aria-expanded` 부여 · 스냅샷 없으면 사유 표시.

### 7.5 npm 스크립트

```
npm run nav:analyze   # 리포트 + 백엔드 스냅샷 생성
npm run nav:check     # CI 가드 (P1 이상 발견 시 exit 1)
npm run nav:test      # 자기검증 36건
```

---

## 8. 검증 결과

| 검증 | 결과 |
|---|---|
| `node tools/navigation_analyze_selftest.mjs` | **36 passed, 0 failed** |
| `npm run nav:check` (`--fail-on=P1`) | **exit 0** (P0/P1 = 0) |
| `php -l` Collaboration.php · routes.php | **No syntax errors** |
| `tools/check_routes_registered.mjs` | **OK** — 신규 라우트 포함 전 plain `$custom` 이 `$register` 됨 |
| PHPStan (Level 5 + baseline) | 변경 전 **6건** → 변경 후 **6건** (신규 0건). 잔존 6건은 Part001~003 및 UserAuth 기존분 |
| 프론트 프로덕션 빌드 (`npx vite build`) | **성공** (경고는 기존 chunk-size 만) |
| i18n 무결성 | 15개 언어 재파싱 성공 · 기존 키 무손상 · 신규 30건 반영 |

**회귀 검증**:
- 기존 메뉴 구조 변경 0 — 셀프테스트가 회원 64 / 관리자 13 스냅샷을 강제(변경 시 테스트 실패)
- 기존 라우트 변경 0 — `App.jsx` 미변경(`git diff` 확인)
- 기존 사용자 설정 데이터 변경 0 — localStorage 키·`menu_tree` 미변경
- 백엔드는 신규 경로 1개 추가만(기존 핸들러·게이트 미변경)

---

## 9. 남은 위험

1. **스냅샷 신선도** — API 가 노출하는 값은 `npm run nav:analyze` 시점 기준이다. 배포 파이프라인에 미연결이라
   메뉴를 바꾸고 스캐너를 안 돌리면 화면이 낡은 값을 보여준다. → `deploy.ps1` 연결은 Part004-08 에서 판단.
2. **정적 분석의 한계** — 런타임에 계산되는 링크(템플릿 리터럴 경로 등)는 `scanInAppLinks` 가 못 잡아
   도달 불가가 과다 보고될 수 있다. §5.1 의 5건은 수동 재확인을 마쳤다.
3. **미측정 영역** — 색상 대비비·스크린리더·실기기 반응형(320~1440px). 브라우저 실검증은 후속 Part.
4. **드리프트 재발** — 팔레트·모바일 탭이 여전히 하드코딩이라 새 메뉴 추가 시 다시 벌어진다.
   `npm run nav:check` 를 CI 에 연결하기 전까지는 자동 차단되지 않는다.

---

## 10. 롤백

| 대상 | 방법 | 위험 |
|---|---|---|
| `tools/navigation_analyze*.mjs` | 파일 삭제 | 없음(런타임 미참여) |
| `backend/data/cwis_navigation_analysis.json` | 삭제 → API 가 `available:false` 반환 | 없음 |
| 백엔드 라우트 1건 + `navigationAnalysis` | routes.php 4줄 + 메서드 제거 | 없음(신규 경로만) |
| Capability 8건 | `CATALOG` 엔트리 제거 → 재시드 시 소멸 | 없음(레지스트리 데이터) |
| `CollaborationHome` 진단 섹션 | 해당 블록 + `nav` state 제거 | 없음 |
| `sidebarI18n.js` 30건 | 해당 키 제거(=수정 전 한글 폴백으로 복귀) | 없음 |
| `package.json` 3스크립트 | 제거 | 없음 |

**미배포** — 운영/데모 swap 은 사용자 승인 후(`feedback_deploy_approval_mandatory`).

---

## 11. Part004-02 진행 가능 여부

**가능 — 단, 아래 3건을 먼저 결정해야 한다.**

1. **메뉴 정본의 위치.** 현재 정의=프론트 정적(`sidebarManifest.js`), 가시성=DB(`menu_tree`).
   명세대로 "통합 Menu Registry" 를 DB 로 옮기면 번들 정적 트리와 이원화되어 부팅 시 메뉴 깜빡임·오프라인 붕괴 위험.
   → **권장: 정의는 정적 SSOT 유지, 레지스트리는 manifest 에서 파생·검증하는 계층으로 설계**(교체가 아니라 확장).
2. **워크스페이스 1급 엔티티 승격 여부.** 승격하지 않으면 Part004-03 Workspace Switcher 는 전환할 대상이 없다.
3. **기존 자산 처리.** `GlobalSearch.jsx`(미장착) · `/menu-access-manager`(도달 불가·기능 중복 의심) 는
   Part004-06/02 착수 전에 **재활성화 / 통합 / 폐기** 중 하나로 결론내야 한다(중복 신설 금지).

명세 §34 Completion Criteria 중 미충족 항목과 사유는 §2·§5.6·§5.7 에 명시했다.
