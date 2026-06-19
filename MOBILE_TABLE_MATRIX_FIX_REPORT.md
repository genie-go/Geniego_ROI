# MOBILE_TABLE_MATRIX_FIX_REPORT

> 테이블 / 권한 매트릭스 모바일 대응 — 페이지 전체를 깨지 않고 자체 스크롤.

## 1. 일반 테이블 (기존 규칙으로 충족)

`@media(max-width:768px)` (styles.css):

```css
table {
  display: block !important;
  overflow-x: auto !important;
  -webkit-overflow-scrolling: touch !important;
  max-width: 100% !important;
  width: max-content;
  min-width: 100%;
  font-size: 11px !important;
}
div:has(> table), section:has(> table) {
  overflow-x: auto !important;
  max-width: 100% !important;
  scrollbar-width: thin;
}
th, td {
  padding: 6px 8px !important;
  white-space: nowrap !important;
  max-width: 150px; overflow: hidden; text-overflow: ellipsis;
}
th:first-child, td:first-child { white-space: normal !important; min-width: 80px; max-width: 120px; }
```

→ 와이드 테이블은 **자신만 가로 스크롤**, 페이지 폭은 유지. 헤더/셀은 ellipsis로 겹침 방지.

## 2. 권한 매트릭스 (핵심 대상)

### 2.1 구조

- **MenuAccessManager.jsx** (라인 166~208): `<table>` + 메뉴열 `minWidth:220`·플랜열 `minWidth:120`, 첫 열 `position:sticky; left:0`.
- **PlanPricing.jsx** (라인 2236~2250): `<table>` + 메뉴열 `minWidth:240`·플랜열 `minWidth:100`, 첫 열 sticky.

### 2.2 모바일 동작

1. `table{min-width:100%!important}` + `[style*="width:"]→max-width:100%`(substring이 인라인 `minWidth`도 매칭) → 인라인 고정폭이 viewport로 캡.
2. 부모 래퍼 `overflow-x:auto` (이미 컴포넌트에 존재) + `div:has(>table){overflow-x:auto; max-width:100%}` → **매트릭스만 가로 스크롤**.
3. 결과: 권한 매트릭스는 모바일에서 좌우로 스와이프해 모든 플랜×메뉴 셀 열람, **페이지 레이아웃은 깨지지 않음**.

### 2.3 v3 보강 (div 기반 매트릭스 대비)

table 태그가 아닌 div 그리드형 매트릭스/데이터그리드도 자체 스크롤되도록:

```css
@media (max-width: 768px) {
  [class*="matrix"], [class*="Matrix"],
  [class*="grid-table"], [class*="datagrid"], [class*="DataGrid"],
  [class*="perm-table"], [class*="access-table"] {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
    max-width: 100% !important;
    scrollbar-width: thin;
  }
}
```

## 3. 터치 영역

- 매트릭스 셀 내 체크박스/토글은 전역 `button{min-height:44px}` + `input[type=checkbox]{width:auto}` 로 터치 확보.
- 가로 스크롤은 `-webkit-overflow-scrolling: touch` 관성 스크롤.

## 4. 카드형 변환 정책

- 일반 데이터 테이블은 **가로 스크롤 유지**(데이터 정합·정렬 보존)가 기본. 권한 매트릭스는 본질적으로 2D(플랜×메뉴)라 카드 분해보다 가로 스크롤이 정보 손실이 없어 적합.
- 강제 카드 변환은 116페이지 회귀 위험이 커 도입하지 않음(요구사항 "가능한 경우" → 매트릭스는 스크롤이 최적).

## 5. 검증

- `npm run build` ✓ (에러 0).
- 변경: styles.css v3 (div 매트릭스 래퍼 규칙). table/매트릭스 인라인 minWidth는 기존 규칙으로 캡 — JSX 무수정.
