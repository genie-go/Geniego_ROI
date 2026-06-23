# MOBILE_OVERLAP_FIX_REPORT (238차)

## 범위
컨테이너 겹침·페이지 잘림·옆으로 긴 레이아웃의 구조적 근본(가로 팽창) 차단.

## 근본 원인
앱 셸 계층(`App.jsx`):
```
.container → .app-scroll-wrap (minWidth:0, overflow-x:hidden) → .app-content-area → 라우트 페이지
```
`.app-scroll-wrap`은 `minWidth:0`이 있어 가로 제약 OK였으나, **그 자식 `.app-content-area`는 인라인 `minHeight:0`만 있고 `minWidth:0` 없음** → flex item이 자식(grid·표)의 콘텐츠 min-content로 팽창 가능 → 페이지가 viewport를 넘어 우측 잘림/겹침 유발.

## 해결
1. `App.jsx` `.app-content-area`:
```jsx
minWidth: 0,      // flex item 가로 축소 강제
maxWidth: '100%',
```
2. `styles.css`(mobile) 라우트 루트 캡 — 페이지 루트가 콘텐츠 폭으로 팽창하지 못하게:
```css
.app-content-area > div { max-width: 100% !important; /* 기존 height/overflow unconstrain에 추가 */ }
```

기존 안전망(유지·검증):
- `.app-content-area, .app-content-area * { min-width: 0 }` (콘텐츠 전체 축소)
- `[style*="flex-direction: column"] { flex-wrap: nowrap !important }` (세로 flex가 자식을 우측 컬럼으로 wrap시켜 off-screen 클립하던 트랩 차단 — 234차)
- `[style*="display:grid"]:not([style*="minmax"]) { grid-template-columns: 1fr !important }` (고정 grid → 1열)
- `[style*="display: flex"]:not([style*="column"]) { flex-wrap: wrap }` (가로 카드/필터 → 세로 정렬)

## 검증 (라이브 모바일 390px)
- 대시보드·연동허브: viewport 초과 요소 0.
- team-members(폼/탭): 폼 필드 100% 폭 세로 정렬, 탭 wrap 정상, 겹침 없음.
- 라우트 루트 `max-width:100%` 적용으로 잔여 팽창 차단.

## 데스크톱 영향
- 추가 규칙은 전부 `@media (max-width:768px)` 내부이거나(`styles.css`) flex item의 `minWidth:0`(데스크톱 레이아웃은 grid 200px+1fr로 영향 없음). 데스크톱 UX 무변경.
