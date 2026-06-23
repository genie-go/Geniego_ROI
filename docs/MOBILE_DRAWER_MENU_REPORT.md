# MOBILE_DRAWER_MENU_REPORT (238차)

## 증상
모바일 드로어를 열면 **모든 대메뉴(Home·AI Marketing·CRM·Commerce…)가 동시에 펼쳐져** 하위 항목이 전부 노출. ▶ 화살표는 "접힘"을 표시하는데 하위가 렌더되는 모순 상태. 네이티브 앱의 단일 아코디언과 거리가 멂.

## 근본 원인 (정밀)
`frontend/src/layout/Sidebar.jsx`의 아코디언은 **이미 단일-open 구현**(`openSectionId` 상태, `isOpen={openSectionId === section.key}`)이며, 접힘 패널은 인라인 스타일 `max-height: 0px; overflow: hidden`으로 clip한다.

그러나 `frontend/public/mobile.css`의 고정높이 unconstrain 규칙:
```css
div[style*="height: "][style*="overflow: hidden"] {
  height: auto !important; overflow: visible !important;
}
```
이 패널을 **오매칭**한다 — `[style*="height: "]`가 `max-height: 0px`의 부분문자열 `height: `에 매칭되기 때문. 결과적으로 `overflow:visible !important`가 강제되어 `max-height:0` 박스가 자식을 클립하지 못하고 전 항목이 노출.

라이브 계산값(수정 전): 모든 `[role="region"]` 패널이 `max-height:0px` + `overflow:visible` + 자연 높이(88~484px) → 펼쳐짐.

## 해결
1. `public/mobile.css` 규칙에 제외 추가 — 아코디언/드롭다운(max-height·role=region)은 풀지 않음:
```css
div[style*="height: "][style*="overflow: hidden"]:not([style*="max-height"]):not([role="region"]),
div[style*="height:"][style*="overflow:hidden"]:not([style*="max-height"]):not([role="region"]) { … }
```
2. `styles.css`(mobile) 방어 — role=region 접힘 패널 clip 재확인(높은 특이성):
```css
.sidebar div[role="region"][aria-label] { overflow: hidden !important; }
```

## 검증 (라이브 모바일 390px)
- 드로어 오픈 직후: **11개 대메뉴 중 1개만 펼침**("Home" — 현재 페이지 자동 펼침), 나머지 `max-height:0 · overflow:hidden · 높이 0`.
- "AI Marketing" 토글 클릭 → **AI Marketing만 펼침, Home 자동 접힘**(expandedCount=1).
- ▶/▼ 화살표 상태 정확.

## 사용자 요구 충족 매핑 (섹션4)
- 모바일 사이드바 기본 숨김 + 햄버거 Drawer + Overlay dim + 바깥/선택 시 닫힘: 기존 구현(styles.css `.sidebar` fixed translateX(-110%), `.sidebar-overlay`) — 유지.
- 대메뉴 기본 접힘 / 클릭 시 해당만 펼침 / 다른 클릭 시 자동 접힘 / 현재 페이지 자동 펼침: **본 수정으로 정상화**.
- 권한 없는 메뉴 미표시: 기존 `itemHasAccess` 게이트 유지(데스크톱·모바일 공통).
- 데스크톱 사이드바 UX: 무변경(아코디언 패널 clip은 원래 정상 동작, 모바일 전용 규칙만 수정).
