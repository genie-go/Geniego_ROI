# MOBILE_RESPONSIVE_LAYOUT_REPORT

> 옆으로 긴 레이아웃 → 모바일 세로 자동 정렬. 기존 반응형 규칙 점검 + 보강.

## 1. 레이아웃 골격 (App.jsx — 변경 없음)

```
.container (display:grid 200px 1fr / 모바일 block, height:100dvh)
 └ 메인 컬럼 (flex column, 100dvh, overflow:hidden)
    ├ Topbar (sticky, 햄버거+페이지명+알림+프로필)
    └ 스크롤 래퍼 (flex:1, overflow-y:auto, touch)
       └ .app-content-area (paddingBottom: safe-area)
          └ <Routes/>
 (밖) MobileBottomNav (fixed bottom, safe-area)
```

## 2. 기존 충족 항목 (전역 `@media(max-width:768px)`)

| 요구 | 규칙 |
|---|---|
| 2/3/4열 그리드 → 1열 | `.grid4/.grid3/.grid2→1fr`(≤900px), 인라인 `div[style*=grid-template-columns]→1fr`(mobile.css) |
| flex-row 줄바꿈 | `[style*="display: flex"][style*="gap"]{flex-wrap:wrap}`, 단 nav/topbar/sidebar는 nowrap 보호 |
| input/select/button 100% | `input,select,textarea{width:100%;font-size:16px;min-height:44px}` |
| 카드 100%/패딩 축소 | `.card,.kpi-card{width:100%;padding:12px}` |
| 페이지 padding 모바일 | 스크롤 래퍼 `padding:10px 10px; padding-bottom: 80px+safe-area` |
| 긴 텍스트 | 제목 `word-break:keep-all`, 본문 `overflow-wrap:break-word`, clamp 폰트 |
| 차트 width 100% | `svg,canvas,[class*=chart]{max-width:100%}` |

## 3. 이번 보강 (v3 안전 레이어)

- **버튼/필터/툴바 그룹 wrap**: `.btn-group/.filter-bar/.toolbar/.actions{flex-wrap:wrap; max-width:100%}` — 가로로 긴 액션 영역이 자동 줄바꿈.
- **`.responsive-grid` 유틸**: `repeat(auto-fit, minmax(min(100%,280px),1fr))` — 신규/리팩터 페이지가 옵트인으로 자동 반응형.
- **className 다열 그리드 1열화**: 인라인이 아닌 `.grid-2/.cols-3` 류 보강.
- **긴 토큰 줄바꿈**: 텍스트 요소 `overflow-wrap:anywhere` — URL/해시/계좌번호가 박스 밀어냄 방지.
- **우측 고정 드로어 → 전체폭 시트**: CRM/CatalogSync/Settlements 상세 패널이 모바일 전체폭으로 자연 정렬.
- **사이드바**(앞 작업): 단일-open 아코디언, 모바일 펼침전용, 터치 44px, safe-area, ESC/백버튼.

## 4. 대표 페이지별 모바일 정렬 결과

| 페이지 | 옆으로 긴 요소 | 모바일 처리 |
|---|---|---|
| Dashboard | KPI 4열, 차트 그리드 | 1열, 차트 100% (기존) |
| OrderHub | KPI 4열/처리현황 5열 | 1열 (mobile.css 인라인 grid) |
| OmniChannel | KPI 4열, 와이드 테이블 | 1열 + 테이블 가로 스크롤 |
| CRM | 고객 상세 우측 드로어, 3/5열 | 전체폭 시트(v3) + 1열 |
| Settlements/CatalogSync | 우측 드로어 500px | 전체폭 시트(v3) |
| TeamMembers/UserManagement | 멤버 카드 그리드 | 1열 |
| MenuAccessManager/PlanPricing | 권한 매트릭스 | 매트릭스만 가로 스크롤(상세: TABLE_MATRIX 리포트) |
| WmsManager/PriceOpt/LINEChannel | 다수 다열 그리드 | 1열 (인라인 grid) |
| PartnerPortal/SupplierPortal | 카드/표 | 1열 + 테이블 스크롤 |

## 5. 데스크톱 보존

모든 규칙은 `@media(max-width:768px)` 한정. ≥769px는 기존 grid 200px+1fr 레이아웃·다열 그리드 그대로.

## 6. 검증

`npm run build` ✓ (46.19s, 에러 0).
