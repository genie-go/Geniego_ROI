# MOBILE_SIDEBAR_ACCORDION_REPORT

> 사이드바 대메뉴 Accordion(한 번에 하나) — 기존 구현 검증 + 모바일 보강

## 1. 결론 먼저

요구된 Accordion 동작은 **이미 `Sidebar.jsx`에 단일-open 방식으로 구현돼 있었음**.
이번 작업은 그것을 **모바일에서도 정상 동작하도록** 보강한 것이며, 새 아코디언을 만들지 않았다.

## 2. 기존 아코디언 동작 (변경 없이 유지)

`frontend/src/layout/Sidebar.jsx`

```jsx
const [openSectionId, setOpenSectionId] = useState(initialActiveSection);
// 토글: 같은 섹션이면 닫고, 다른 섹션이면 그 섹션으로 교체 → 항상 1개만 열림
onToggle={() => {
  setOpenSectionId(prev => prev === section.key ? null : section.key);
  setQuickExpanded(false);
}}
isOpen={openSectionId === section.key}
```

- `openSectionId`는 **단일 문자열 상태** → 동시에 두 대메뉴가 열릴 수 없음.
- `initialActiveSection`(현재 경로가 속한 섹션) → **현재 페이지의 대메뉴 자동 펼침/활성**.
- `useEffect([location.pathname]) → mobileClose()` → **하위 메뉴 클릭 후 모바일 drawer 자동 닫힘**.

| 요구사항 | 상태 |
|---|---|
| 대메뉴만 기본 표시, 클릭 시 해당 메뉴만 펼침 | ✅ 기존 |
| 다른 대메뉴 클릭 시 기존 펼침 자동 접힘 | ✅ 기존(단일 상태) |
| 한 번에 하나만 열림 | ✅ 기존 |
| 현재 페이지 대메뉴 자동 활성/펼침 | ✅ 기존 |
| 하위 클릭 → route 이동 후 사이드바 close | ✅ 기존 |

## 3. 이번에 보강한 점

### 3.1 모바일 대메뉴 클릭 = "펼침 전용" (핵심 수정)

**문제:** 기존 코드는 닫힌 대메뉴를 열 때 첫 하위 페이지로 즉시 `navigate()`.
모바일에서는 이 네비게이션이 라우트 변경 → `mobileClose()`를 유발해 **drawer가 즉시 닫혀 하위메뉴를 고를 수 없었음.**

**수정:** 모바일에서는 네비게이션을 억제하고 펼치기만 수행. 데스크톱 편의(자동 이동)는 유지.

```jsx
// ★모바일: 펼침 전용. 데스크톱: 기존 자동 이동 유지
if (!isMobile && !isOpen && navigate && _accessibleItems[0]?.to) navigate(_accessibleItems[0].to);
onToggle();
```

`isMobile`은 `window.matchMedia('(max-width:768px)')` 리스너로 관리(리사이즈/회전 대응).

### 3.2 펼침 높이 클리핑 방지

터치 영역을 44px로 키우면 기존 고정 `items*40px` maxHeight가 하위메뉴를 자름.
→ 적응형으로 변경:

```jsx
const _itemH = isMobile ? 48 : 40;
maxHeight: isOpen ? `${section.items.length * _itemH + 8}px` : "0px",
```

### 3.3 접근성(ARIA)

```jsx
<button className="nav-section-toggle" aria-expanded={isOpen} aria-controls={sectionPanelId}>
<div id={sectionPanelId} role="region" aria-label={sectionLabel}>
```

- `aria-expanded` — 펼침/접힘 스크린리더 전달.
- `aria-controls` / `role=region` / `aria-label` — 대메뉴 ↔ 하위 패널 연결.
- 하위 `NavLink`는 react-router가 활성 시 `aria-current="page"` 자동 부여.
- 회전 화살표 `▶`는 `aria-hidden`.

### 3.4 닫기 경로 추가

- **ESC 키** → drawer 닫힘.
- **Capacitor 하드웨어 백버튼**(존재 시) → drawer 닫힘(앱 종료/뒤로 대신).
- (기존) 바깥 오버레이 클릭 닫힘, 라우트 변경 닫힘은 유지.

### 3.5 긴 텍스트 처리

- 대메뉴 라벨: 줄바꿈(`white-space:normal; word-break:keep-all`) — 44px 헤더가 2줄 수용.
- 하위메뉴 라벨: 말줄임(`.truncate` ellipsis) — 단일 라인 높이 예측 가능.

## 4. 터치 영역 (styles.css, 모바일 전용)

```css
@media (max-width: 768px) {
  .sidebar .nav-section-toggle { min-height: 44px; padding: 9px 12px; }
  .sidebar .nav-item          { min-height: 44px; padding-top: 9px; padding-bottom: 9px; }
}
```

## 5. 데스크톱 불변 보장

모든 모바일 분기는 `isMobile` 또는 `@media(max-width:768px)`로 게이트. 데스크톱 아코디언/자동이동/레이아웃은 그대로.
