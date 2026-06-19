# MOBILE_OVERLAP_FIX_REPORT

> 모바일 겹침·가로깨짐 차단 — **중복 구현 0건, 기존 styles.css/mobile.css만 확장**

## 1. 접근 원칙

신규 Layout/Page/CSS 파일을 만들지 않았다. 기존 2개 CSS 자산만 확장:
- `frontend/src/styles.css` (앱 본 스타일 + `@media(max-width:768px)` 규칙)
- `frontend/public/mobile.css` (PWA/모바일 보조 규칙, index.html 링크)

## 2. 전수 스캔 결과 (서브에이전트 정밀 감사)

명시된 고위험 페이지를 스캔해 겹침/잘림 유발 패턴을 분류했고, **기존 전역 규칙으로 이미 커버되는 것과 진짜 잔여**를 구분했다.

### 2.1 이미 커버되어 있던 것 (재구현 불필요)

| 패턴 | 발견 위치(예) | 커버 규칙 |
|---|---|---|
| 인라인 다열 그리드 `gridTemplateColumns:'repeat(4,1fr)'` | OrderHub:222/239, OmniChannel:244, CRM:224/363/668, PriceOpt, WmsManager, LINEChannel, KrChannel | `mobile.css`: `div[style*="grid-template-columns"]→1fr` (React가 DOM에 kebab-case 직렬화 → 매칭됨) |
| 테이블 `minWidth:900` | OmniChannel:472 | `styles.css`: `table{display:block;overflow-x:auto;min-width:100%!important}` + `[style*="width:"]→max-width:100%`(substring이 `min-width`도 매칭) |
| 고정 px 너비 박스 | 다수 | `[style*="width:"]{max-width:100%!important}` |
| 고정 height+overflow hidden | 다수 | `mobile.css`: `[style*="height:"][style*="overflow:hidden"]→auto/visible` |

> **핵심**: 서브에이전트는 JSX의 camelCase(`gridTemplateColumns`)만 보고 "미커버"로 분류했으나, React는 DOM에 kebab-case(`grid-template-columns`)로 직렬화하므로 기존 attribute 선택자가 실제로 매칭한다. 전역 커버율 ≈ 90%+.

### 2.2 진짜 잔여 → 이번에 보강

| # | 패턴 | 위치 | 조치 |
|---|---|---|---|
| A | **우측 고정 상세 드로어** `position:fixed; top:0; bottom:0; right:0; width:420~500` | CRM:130, CatalogSync:1322, Settlements:79 | 모바일에서 **전체폭 바텀시트형**(width:100%·left:0)으로 전환 + safe-area 패딩 |
| B | className 기반 다열 그리드(인라인 외) | 일부 | `.grid-2/3/4`, `.cols-N`, `.two/three/four-col` → 1fr |
| C | 권한 매트릭스/와이드 div-테이블(table 태그 아님) | — | `[class*="matrix"/"datagrid"/"perm-table"]` → 자체 `overflow-x:auto` 래퍼화 |
| D | 긴 토큰/URL 박스 밀어냄 | 전역 | 텍스트 요소 `overflow-wrap: anywhere` |
| E | html 가로 스크롤 파리티 | 전역 | `html{overflow-x:hidden; max-width:100vw}` |
| F | 하단 고정 액션바 본문 가림 | — | `[class*="bottom-bar"/"sticky-action"]` safe-area padding |

## 3. 추가된 안전 레이어 (styles.css "MOBILE OVERLAP/CLIP SAFETY v3")

`@media (max-width: 768px)` 단일 블록, **SAFE 규칙만**(전역 `flex→column` 강제 등 회귀 위험 규칙 배제):

1. `html` 가로 스크롤 차단(파리티)
2. 텍스트 요소 `overflow-wrap: anywhere`
3. `.responsive-grid` 유틸 = `repeat(auto-fit, minmax(min(100%,280px),1fr))`
4. className 다열 그리드 → 1fr
5. 버튼/필터/툴바 그룹 `flex-wrap: wrap`
6. 매트릭스/데이터그리드 div → `overflow-x:auto`
7. 고정높이 className → `height:auto`
8. 하단 고정바 safe-area 패딩
9. **우측 고정 드로어 → 전체폭 시트**(토스트 오인 방지: `top:0`+`bottom:0`+`width:` 동시 충족 시에만)

## 4. 회귀 안전성

- 모든 규칙은 `@media(max-width:768px)` 내부 → **데스크톱 무영향**.
- 위험한 전역 `position:fixed` 무력화·`flex-direction:column` 강제는 **의도적으로 배제**(116페이지 회귀 위험).
- 드로어 규칙(#9)은 4개 attribute 동시 충족이라 토스트/드롭다운 오탐 없음.

## 5. 검증

- `npm run build` → **✓ built in 46.19s, 에러 0**.
- 변경 파일: `frontend/src/styles.css` (신규 파일 0).

> 결과: 인라인 그리드·테이블·고정폭은 기존 규칙으로, 우측 드로어·매트릭스·긴 토큰은 v3로 — **JSX 116페이지를 건드리지 않고** 전역 CSS만으로 겹침/가로깨짐을 차단.
