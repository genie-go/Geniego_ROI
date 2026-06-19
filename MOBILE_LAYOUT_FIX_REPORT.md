# MOBILE_LAYOUT_FIX_REPORT

> 페이지 잘림/스크롤/정렬 점검 결과 + 보강

## 1. 점검 방법

`App.jsx` 레이아웃 트리와 `styles.css`의 `@media(max-width:768px)` 블록(라인 663~1045)을 전수 확인.
기존에 잘림 방지 인프라가 대부분 존재함을 확인하고, 미흡한 부분(viewport 높이 단위)만 교정.

## 2. 레이아웃 구조 (App.jsx)

```
.container (display:block, height:100dvh*)        ← *모바일 교정
 └ 메인 컬럼 (flex column, 100dvh, overflow:hidden)
    ├ Topbar (sticky)
    └ 스크롤 래퍼 (flex:1, overflow-y:auto, -webkit-overflow-scrolling:touch)  ← 세로 스크롤 주체
       └ .app-content-area (flex:1, padding-bottom: safe-area)
          └ <Routes/> 페이지
 (.container 밖) MobileBottomNav (fixed bottom)
```

## 3. 이미 충족돼 있던 항목 (기존 CSS)

| 요구 | 기존 규칙 |
|---|---|
| 세로 스크롤 가능 | 스크롤 래퍼 `overflow-y:auto` |
| 바텀네비에 안 가림 | `padding-bottom: calc(80px + env(safe-area-inset-bottom))` |
| 가로 스크롤 억제 | `html,body{overflow-x:hidden; max-width:100vw}` |
| 2/3열 → 1열 | `.grid4/.grid3/.grid2 → 1fr` (≤768/900px) |
| 차트 100% | `svg/canvas/[class*=chart]{max-width:100%}` |
| 테이블 | `table{display:block; overflow-x:auto}` + `div:has(>table){overflow-x:auto}` |
| 폼 input 100% | `input/select/textarea{width:100%; font-size:16px}` |
| 모달 풀폭 | `[class*=modal]{max-width:calc(100vw-20px); max-height:92dvh}` |
| 고정높이 박스 | inline `height+overflow:hidden` → `height:auto; overflow:visible` (mobile.css) |
| 고정 px 너비 박스 | `[style*="width:"]{max-width:100%}` |

## 4. 이번에 교정한 항목

### 4.1 viewport 높이 단위 (100vh → 100dvh)

`.container`는 인라인 `height:100vh`를 가진다. iOS Safari에서 100vh는 URL 바를 포함한 과대값이라
하단 콘텐츠가 가려질 수 있음. 모바일에서 동적 뷰포트로 교정:

```css
@media (max-width: 768px) {
  .container { height: 100dvh !important; }  /* 인라인 100vh 오버라이드 */
}
```

메인 컬럼/스크롤 래퍼는 이미 `100dvh`를 사용 중이라 정합.

### 4.2 safe-area 사이드바 반영

```css
@media (max-width: 768px) {
  .sidebar {
    padding-top:    calc(16px + env(safe-area-inset-top, 0px));
    padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    padding-left:   calc(12px + env(safe-area-inset-left, 0px));
    -webkit-overflow-scrolling: touch;   /* 사이드바 내부 관성 스크롤 */
  }
}
```

→ 메뉴가 화면 높이를 초과하면 사이드바 내부만 자연 스크롤(기존 `overflow-y:auto` + 본 보강).

## 5. fixed-height / overflow-hidden / min-width 점검 결론

- 신규 잘림 유발 패턴 없음. 기존 mobile.css가 인라인 `height+overflow:hidden`을 `auto/visible`로 해제, `[style*=width]`를 `max-width:100%`로 축소.
- `.container` 인라인 `100vh`만 모바일 단위 부정확 → 4.1에서 교정.

## 6. 결과

- 모든 페이지는 스크롤 래퍼를 통해 세로 스크롤되고, 바텀네비/노치/홈바에 가리지 않음.
- 카드/차트/테이블/폼/모달은 기존 규칙으로 1열·100%·가로스크롤 정렬 유지.
- 빌드 통과(에러 0).
