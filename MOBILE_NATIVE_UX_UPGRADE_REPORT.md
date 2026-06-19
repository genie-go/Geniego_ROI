# MOBILE_NATIVE_UX_UPGRADE_REPORT

> GeniegoROI 네이티브 모바일 UX 초고도화 — **중복 구현 0건, 기존 구조만 확장**
> 대상 환경: React 18 + Vite 7 + Capacitor Android/iOS. Breakpoint 768px.

## 0. 핵심 원칙 준수

**신규 Sidebar/Layout/Menu/Route/CSS 파일을 한 개도 만들지 않았습니다.**
탐색 결과 모바일 인프라가 이미 단일 소스로 존재함을 확인하고, 그 위에 진짜 갭만 보강했습니다.

| 기존 자산(재사용) | 위치 | 비고 |
|---|---|---|
| 사이드바(단일-open 아코디언) | `frontend/src/layout/Sidebar.jsx` | 기존 `openSectionId` 단일 상태 유지 |
| 모바일 Drawer 상태 | `frontend/src/context/MobileSidebarContext.jsx` | `open/toggle/close` 그대로 사용 |
| 햄버거 + 모바일 헤더 | `frontend/src/layout/Topbar.jsx` | `.topbar-hamburger` 기존 존재 |
| 메뉴/권한 트리(SSOT) | `frontend/src/layout/sidebarManifest.js` | 11 대메뉴, 변경 없음 |
| 하단 탭 네비 | `frontend/src/components/MobileBottomNav.jsx` | 그대로 |
| 반응형 CSS | `frontend/src/styles.css`, `public/mobile.css` | 기존 `@media(max-width:768px)` 블록에 추가 |
| Capacitor/뷰포트 | `capacitor.config.json`, `index.html` | `viewport-fit=cover` 기존 |

## 1. 탐색에서 확인된 "이미 구현된" 사항 (재구현 금지 대상)

- 사이드바는 이미 **단일-open 아코디언** (`setOpenSectionId(prev => prev === key ? null : key)`) — 다른 대메뉴 클릭 시 기존 메뉴 자동 접힘.
- **현재 페이지의 대메뉴 자동 활성/펼침** (`initialActiveSection` + `useEffect`).
- **메뉴 선택 후 모바일 사이드바 자동 닫힘** (`useEffect([location.pathname]) → mobileClose()`).
- 모바일 사이드바 = **fixed 오버레이 Drawer + 배경 딤 + 바깥 클릭 닫힘** (`.sidebar-open`, `.sidebar-overlay`).
- 페이지 스크롤 영역 = `100dvh` + `overflow-y:auto` + 바텀네비 여백 + `safe-area-inset-bottom`.
- 그리드 1열 전환, 테이블 가로 스크롤, input 100%/16px, 모달 풀폭, 차트 `max-width:100%` 등.

## 2. 실제로 보강한 갭 (이번 작업)

| # | 갭 | 조치 | 파일 |
|---|---|---|---|
| G1 | 모바일에서 **대메뉴 클릭 시 즉시 하위페이지로 이동 → drawer 닫힘** → 하위 탐색 불가 | 모바일에서는 **펼침 전용**(네비게이션 억제), 데스크톱은 기존 자동이동 유지 | Sidebar.jsx |
| G2 | 터치 영역 < 44px (헤더 ~28px, 하위 ~30px, 일반 버튼 36px) | 모바일 `.nav-section-toggle`/`.nav-item`/`button` **min-height 44px** | styles.css |
| G3 | 아코디언 펼침 높이 고정 `items*40px` → 44px 적용 시 클리핑 | 적응형 `items*(모바일48/데스크40)+8px` | Sidebar.jsx |
| G4 | 접근성·닫기 경로 부족 | `aria-expanded`/`aria-controls`/`role=region`/`aria-label` + **ESC 키 + Capacitor 하드웨어 백버튼**으로 drawer 닫기 | Sidebar.jsx |
| G5 | iOS 노치/홈바 safe-area 사이드바 미반영 | 모바일 `.sidebar` 상/하/좌 `env(safe-area-inset-*)` 패딩 | styles.css |
| G6 | iOS 100vh 과대값으로 하단 잘림 여지 | 모바일 `.container { height:100dvh }` 교정 | styles.css |
| G7 | 긴 대메뉴 텍스트 처리 | 대메뉴 라벨 줄바꿈(keep-all), 하위메뉴 말줄임(.truncate) 보장 | Sidebar.jsx/styles.css |

## 3. 데스크톱 영향도

- G1·G2·G3(48px)·G5·G6은 **모바일 전용**(`isMobile` 게이트 또는 `@media(max-width:768px)`)이라 데스크톱 무영향.
- G4의 aria 속성과 G3의 `+8px` 여유는 데스크톱에도 적용되나 시각/동작상 무해(접근성 향상).
- 데스크톱의 "대메뉴 클릭 → 첫 하위로 자동 이동" 편의는 **그대로 유지**.

## 4. 권한 구조 보존

메뉴 가시성·권한 필터(`itemHasAccess`, `ADMIN_ONLY_MENU_KEYS`, `hasMenuAccess`, `isSubAdmin/subMenuAllowed`, `useMenuVisibility`)는 **한 줄도 변경하지 않음**. 모바일에서도 권한 없는 메뉴는 동일하게 숨김/잠금. 백엔드 RBAC와 충돌 없음.

## 5. 검증

- `npm run build` → **✓ built in 46.13s, 에러 0**.
- 상세 체크리스트: `RESPONSIVE_TEST_RESULTS.md`, `CAPACITOR_MOBILE_CHECKLIST.md`.

## 6. 변경 파일 (총 2개)

- `frontend/src/layout/Sidebar.jsx`
- `frontend/src/styles.css`

> 신규 파일 0. 중복 컴포넌트/CSS 0. 기존 권한·메뉴 구조 100% 보존.
