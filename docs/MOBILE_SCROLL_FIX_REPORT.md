# MOBILE_SCROLL_FIX_REPORT (238차)

## 증상
"분류된 페이지(권한 매트릭스 등)가 우측 옆으로 길게 나타나고, 우측으로 스크롤도 되지 않아 우측에 무엇이 있는지 안 보인다."

## 진단 (정량)
- `/team-members` 권한 매트릭스 표: `clientWidth 300 / scrollWidth 562` → 내용이 viewport보다 넓음.
- 표의 computed `overflow-x: auto` → **실제로는 스와이프로 가로 스크롤 가능**(도달 불가 클리핑 아님).
- 그러나 모바일(webkit/Capacitor)에서 overflow 스크롤바는 오버레이라 **평소 보이지 않음** → 사용자에게 "더 있고 스크롤된다"는 신호가 전무 → 잘림으로 오인.
- 문서 레벨 `scrollWidth == clientWidth`(390) → 전체 페이지가 가로로 밀리지는 않음(설계 의도: `.app-scroll-wrap { overflow-x: hidden }`).

→ **본질은 클리핑이 아니라 "가로 스크롤 어포던스(시각 신호) 부재"**.

## 해결 (styles.css 모바일 블록)
1. 표/매트릭스에 **항상 보이는 얇은 스크롤바**:
```css
table { scrollbar-width: thin !important; scrollbar-color: rgba(79,142,247,0.45) transparent !important; }
table::-webkit-scrollbar, div:has(>table)::-webkit-scrollbar { height: 6px !important; display: block !important; -webkit-appearance: none !important; }
table::-webkit-scrollbar-thumb, div:has(>table)::-webkit-scrollbar-thumb { background: rgba(79,142,247,0.5) !important; border-radius: 6px !important; }
```
2. **우측 끝 그라데이션 페이드 힌트**("우측에 더 있음" 시각 신호, 터치 비방해):
```css
div:has(> table) { position: relative; }
div:has(> table)::after {
  content: ""; position: absolute; top: 1px; right: 0; bottom: 7px; width: 26px;
  pointer-events: none; background: linear-gradient(to right, rgba(120,130,150,0), rgba(120,130,150,0.14));
  border-radius: 0 10px 10px 0;
}
```
기존 `table { display:block; overflow-x:auto; max-width:100% }` 및 `div:has(>table){overflow-x:auto}`(233·234차)는 유지 — 내부 스크롤 자체는 이미 동작.

## 잔여 가로 오버플로우 캡
- `App.jsx` `.app-content-area`: `minWidth:0; maxWidth:100%` 추가(flex item 축소 강제).
- `styles.css` `.app-content-area > div`(라우트 루트): `max-width:100%` 캡.

## 검증 (라이브 모바일 390px)
- 매트릭스 표: `overflow-x:auto · scrollbar-width:thin · scrollable(562>300)`, 래퍼 `position:relative · ::after gradient` 적용 확인.
- 도달 불가 클리핑(우측 비스크롤 요소) 측정: 표 제외 시 잔여 1건(390px div가 +10px, 무시 가능 수준), 문서 가로 스크롤 없음.
- 대시보드/연동허브: 오버플로우 0(기존 정상 유지).

## 사용자 요구 충족 매핑 (섹션3·섹션2)
- "긴 테이블은 내부 가로 스크롤 박스로 처리" → 내부 스크롤 + 어포던스로 충족.
- "페이지 전체가 가로로 밀리면 안 됨" → 문서 가로 스크롤 0 유지.
- 카드/필터/버튼 그룹 등 가로 flex는 기존 `flex-wrap:wrap`(:not(column)) 규칙으로 자동 세로 정렬(유지).
