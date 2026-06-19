# MOBILE_SAFE_AREA_CHECKLIST

> iOS/Android safe-area(노치·다이내믹아일랜드·홈바) 반영 점검표

## 1. 전제 설정 (기존)

| 항목 | 위치 | 값 |
|---|---|---|
| viewport | `index.html:53` | `viewport-fit=cover` (safe-area 활성 필수) |
| safe-area 토큰 | `public/mobile.css:9-14` | `--safe-t/b/l/r = env(safe-area-inset-*)` |
| StatusBar | `capacitor.config.json` | `overlaysWebView:false` (웹뷰가 상태바 침범 안 함) |
| iOS contentInset | `capacitor.config.json` | `always` |

## 2. safe-area 적용 지점

| 영역 | 규칙 | 상태 |
|---|---|---|
| 본문 스크롤 하단 | `padding-bottom: calc(80px + env(safe-area-inset-bottom))` | ✅ 기존 |
| app-content-area | `paddingBottom: env(safe-area-inset-bottom)` | ✅ 기존(App.jsx) |
| 바텀 탭 네비 | `height: calc(60px + env(safe-area-inset-bottom)); paddingBottom: env(...)` | ✅ 기존(MobileBottomNav) |
| Topbar 상단 | standalone 시 `padding-top: calc(8px + env(safe-area-inset-top))` | ✅ 기존 |
| **사이드바 드로어** | 상/하/좌 `env(safe-area-inset-*)` 패딩 + 내부 관성 스크롤 | ✅ **보강(앞 작업)** |
| **우측 고정 드로어→시트** | 전체폭 전환 + 상/하 safe-area 패딩 | ✅ **보강(v3 #9)** |
| **하단 고정 액션바** | `padding-bottom: calc(8px + env(safe-area-inset-bottom))` | ✅ **보강(v3 #8)** |
| PWA 설치 배너/iOS 가이드 | `bottom: calc(... + env(safe-area-inset-bottom))` | ✅ 기존(mobile.css) |

## 3. 뷰포트 높이 단위

| 요소 | 단위 | 비고 |
|---|---|---|
| `.container` (모바일) | `100dvh` | ✅ 보강(앞 작업) — iOS 100vh 과대값 교정 |
| 메인 컬럼/스크롤 래퍼 | `100dvh` | ✅ 기존 |
| 사이드바 드로어 | `100dvh` | ✅ 기존 |
| 모달 | `max-height: 92dvh` | ✅ 기존 |

## 4. 실기기 검증 체크리스트 (배포 전)

### iOS
- [ ] 노치/다이내믹아일랜드: Topbar·사이드바 로고가 상태바에 가리지 않음
- [ ] 홈 인디케이터: 바텀 탭 네비·하단 액션바가 홈바에 겹치지 않음
- [ ] 우측 상세 드로어(CRM/Settlements)가 전체폭 시트로 열리고 상/하 안전영역 확보
- [ ] 키보드 표시 시 입력폼 가림 없음 (`Keyboard.resize: native`)
- [ ] 가로/세로 회전 시 safe-area 재계산

### Android
- [ ] 상태바 영역 콘텐츠 침범 없음 (`overlaysWebView:false`)
- [ ] 제스처 내비게이션 바와 바텀 탭 네비 겹침 없음
- [ ] 하드웨어 백버튼으로 사이드바 drawer 닫힘 (`@capacitor/app` 설치 확인됨)

## 5. 검증

`npm run build` ✓ (에러 0). safe-area 토큰·env() 규칙 모두 빌드 통과.
