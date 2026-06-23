# NATIVE_MOBILE_UX_UPGRADE_REPORT (238차)

GeniegoROI 모바일을 "웹 축소판"이 아닌 네이티브 앱 수준으로 끌어올리기 위한 1차 작업 보고서.
**원칙 준수**: 신규 Layout/Sidebar/Dashboard/MobilePage 생성 0 — 전부 **기존 구조(App.jsx · Sidebar.jsx · styles.css · public/mobile.css) 수정·통합**. 데스크톱 UX 무변경.

라이브: 운영 `index-B2K8xoZM.js` / 데모 `index-BZaiIp3O.js` (운영 roi.genie-go.com / 데모 roidemo.genie-go.com 동반 배포·검증).

## 진단 방법
- Playwright를 390×844(iPhone급) 뷰포트로 고정해 실제 모바일 렌더를 재현.
- 모든 요소의 `getBoundingClientRect`/`scrollWidth`/computed style을 순회해 **viewport 초과·도달 불가 클리핑**을 정량 측정(추정 아님).

## 사용자 보고 증상 → 근본 원인 → 해결

### A. "사이드바 메뉴가 전부 펼쳐져 있다" (네이티브 Drawer 아님)
- **근본 원인**: `public/mobile.css`의 고정높이 박스 unconstrain 규칙
  `div[style*="height: "][style*="overflow: hidden"] { overflow: visible !important }` 이
  사이드바 아코디언 접힘 패널(`max-height: 0px; overflow: hidden`)을 **`max-height: 0px`의 `height: ` 부분문자열로 오매칭**해 `overflow:visible`을 강제 → maxHeight:0 박스가 자식을 클립하지 못해 **모든 대메뉴가 동시에 펼쳐짐**.
- **해결**: 해당 규칙에 `:not([style*="max-height"]):not([role="region"])` 추가(아코디언/드롭다운 collapse 제외) + `styles.css`에 `.sidebar div[role="region"][aria-label] { overflow:hidden !important }` 방어.
- **검증(라이브)**: 11개 대메뉴 중 **1개만 펼침**(현재 페이지 자동 펼침). 다른 대메뉴 클릭 시 기존 자동 접힘 — 단일 아코디언 정상 동작.
- 상세: [MOBILE_DRAWER_MENU_REPORT.md](./MOBILE_DRAWER_MENU_REPORT.md)

### B. "분류된 페이지(매트릭스)가 우측으로 잘리고 스크롤도 안 된다"
- **근본 원인**: 권한 매트릭스 등 넓은 표는 이미 `overflow-x:auto`로 **내부 스크롤이 가능**하나, 모바일에서 스크롤바가 숨겨져 "우측에 내용이 더 있고 스와이프로 볼 수 있다"는 **시각 신호(어포던스)가 전무** → 사용자가 잘림으로 오인.
- **해결**: 모바일 표/매트릭스에 ① 항상 보이는 얇은 스크롤바 ② 우측 끝 그라데이션 페이드 힌트(`div:has(>table)::after`, pointer-events 없음) 추가.
- **검증(라이브)**: 매트릭스 표 `clientWidth 300 / scrollWidth 562 / overflow-x auto / scrollbar thin / ::after gradient` — 스와이프 가능 + 시각 신호 노출.
- 상세: [MOBILE_SCROLL_FIX_REPORT.md](./MOBILE_SCROLL_FIX_REPORT.md)

### C. 잔여 가로 오버플로우 갭
- **근본 원인**: `.app-content-area`(라우트 렌더 영역)가 flex item인데 인라인 `minWidth:0` 미적용 → 자식 grid/표가 콘텐츠 min-content로 팽창 가능.
- **해결**: `App.jsx` `.app-content-area`에 `minWidth:0; maxWidth:100%` 추가 + `styles.css` `.app-content-area > div`에 `max-width:100%` 캡.
- 상세: [MOBILE_OVERLAP_FIX_REPORT.md](./MOBILE_OVERLAP_FIX_REPORT.md)

## 변경 파일
- `frontend/src/App.jsx` — app-content-area minWidth/maxWidth
- `frontend/public/mobile.css` — unconstrain 규칙 아코디언 제외
- `frontend/src/styles.css` — 표 스크롤 어포던스 · 사이드바 아코디언 clip 방어 · 라우트 루트 max-width 캡

## 테스트 결과
[MOBILE_RESPONSIVE_TEST_RESULTS.md](./MOBILE_RESPONSIVE_TEST_RESULTS.md) · Capacitor 점검 [CAPACITOR_ANDROID_IOS_CHECKLIST.md](./CAPACITOR_ANDROID_IOS_CHECKLIST.md)

## 후속(잔여 — 2차)
기존 모바일 인프라(233·234차)는 견고하며 본 차수는 그 **구멍**을 메웠다. 추가로 권장:
- 페이지별 정밀 모바일 점검(섹션6 17개 페이지 전수)
- 넓은 표의 **카드형 리스트** 변환 옵션(현재는 내부 가로 스크롤+어포던스로 도달성 확보)
- `useIsMobile` 로컬 3중 구현 → 공용 훅 통합
- Capacitor 실기기(Android/iOS) safe-area 실측
