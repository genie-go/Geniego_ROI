# CAPACITOR_ANDROID_IOS_CHECKLIST (238차)

Capacitor Android/iOS 래핑 기준 모바일 점검표. ✅=코드 확인됨, ⚠=실기기 실측 필요(2차).

## Safe Area / Viewport
- ✅ `index.html` viewport: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, **viewport-fit=cover**` — 노치/홈바 영역 포함.
- ✅ Safe-area 변수: `public/mobile.css`에 `--safe-t/-b/-l/-r` 정의, `env(safe-area-inset-*)` 사용.
- ✅ 콘텐츠 하단: `App.jsx` `.app-content-area { paddingBottom: env(safe-area-inset-bottom) }`.
- ✅ 사이드바 Drawer: `padding-top/bottom/left: calc(N + env(safe-area-inset-*))` (styles.css).
- ✅ 하단 네비(MobileBottomNav) 영역 확보: `.container>div:last-child>div:last-child { padding-bottom: calc(80px + env(safe-area-inset-bottom)) }`.
- ⚠ iOS 노치/Dynamic Island 실측 — 실기기에서 상단 App Bar·하단 네비 겹침 여부.

## 100vh / 스크롤
- ✅ 모바일 `.container { height: 100dvh }`(100vh 고정 회피) — iOS Safari URL바 변동 대응.
- ✅ 단일 스크롤 권원: `.app-scroll-wrap`(세로 스크롤) — 내부 `height:100vh/100% + overflow:hidden` 스크롤박스는 모바일에서 `overflow:visible`로 풀어 메인 래퍼 1축 스크롤로 통합.
- ✅ 가로: 표/차트만 자체 `overflow-x:auto`(+어포던스), 나머지는 `overflow-x:hidden`로 페이지 밀림 차단.
- ⚠ Capacitor WebView 오버스크롤 바운스 — `native.css` 억제 규칙 존재, 실기기 확인.

## 아코디언/메뉴
- ✅ 사이드바 단일 아코디언 모바일 정상화(238차) — `max-height` 접힘 패널이 unconstrain 규칙에 안 걸리도록 제외.
- ✅ 터치 타깃 ≥44px: `.nav-section-toggle`, `.nav-item`, 버튼/입력 min-height 44px.

## 빌드/번들
- ✅ `public/mobile.css`는 정적 자산으로 dist 복사(번들 외) — Capacitor 자산 동기화 시 포함.
- ✅ `:has()` 선택자 사용(표 래퍼 어포던스) — 최신 WebView(Android Chrome 105+/iOS 15.4+) 지원. 구형 폴백: 표 자체 `overflow-x:auto`로 스크롤 자체는 동작(힌트만 미표시).

## 실기기 2차 점검 항목 (⚠)
1. iOS safe-area 상/하단 실측(노치·홈 인디케이터).
2. Android 제스처 네비 영역과 하단 네비 겹침.
3. 소프트 키보드가 input 가림 — `Keyboard` 플러그인 resize 모드(`ionic`/`native`) 설정.
4. WebView `:has()`/`100dvh` 지원 버전 확인(타깃 minSdk/iOS 버전).
5. 가로 스크롤 어포던스(스크롤바/페이드) 실제 가시성.
