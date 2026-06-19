# CAPACITOR_MOBILE_CHECKLIST

> Capacitor Android/iOS 네이티브 래핑 환경 점검 체크리스트
> appId: `com.geniego.roi` · webDir: `dist`

## 1. 설정 현황 (변경 없음 — 기존 정상)

`frontend/capacitor.config.json`

| 항목 | 값 | 평가 |
|---|---|---|
| `ios.contentInset` | `always` | ✅ iOS 스크롤뷰 인셋 |
| `StatusBar.overlaysWebView` | `false` | ✅ 웹뷰가 상태바를 침범하지 않음 |
| `StatusBar.style` | `DARK` | ✅ 다크 배경(#070f1a)에 밝은 아이콘 |
| `Keyboard.resize` | `native` / `resizeOnFullScreen:true` | ✅ 키보드 표시 시 뷰 리사이즈 |
| `SplashScreen` | immersive/fullscreen | ✅ |
| `index.html` viewport | `viewport-fit=cover` | ✅ safe-area 활성 전제 |

## 2. 이번 작업이 Capacitor에 주는 영향

| 변경 | Android | iOS | 비고 |
|---|---|---|---|
| 모바일 대메뉴 펼침전용 | ✅ | ✅ | `matchMedia` 기반, 네이티브 웹뷰 동일 동작 |
| 터치 44px | ✅ | ✅ | 네이티브 HIG/Material 권장치 충족 |
| `env(safe-area-inset-*)` 사이드바 패딩 | ✅ | ✅ | `overlaysWebView:false` + `contentInset:always`와 정합 |
| `100dvh` 컨테이너 | ✅ | ✅ | WKWebView/Android WebView dvh 지원 |
| ESC 키 닫기 | (외장 키보드) | (외장 키보드) | 무해 |
| **하드웨어 백버튼 닫기** | ✅ 핵심 | n/a | `window.Capacitor.Plugins.App` 존재 시에만 바인딩 |

## 3. 하드웨어 백버튼 처리 — 안전 구현

```js
const CapApp = window.Capacitor?.Plugins?.App;   // 플러그인 없으면 undefined → no-op
if (CapApp?.addListener) {
  const p = CapApp.addListener('backButton', () => mobileClose());
  Promise.resolve(p).then(h => { backHandle = h; });
}
// cleanup 시 backHandle.remove()
```

- **옵셔널 체이닝 가드**: `@capacitor/app` 미설치/웹 환경에서는 바인딩하지 않으므로 빌드·런타임 안전.
- drawer가 열렸을 때만 리스너 등록, 닫히면 해제 → 기본 백버튼 동작(뒤로/종료) 보존.

> 참고: 프로젝트에 `@capacitor/app`이 아직 의존성으로 없으면, 백버튼 닫기를 100% 활성화하려면
> `npm i @capacitor/app && npx cap sync` 후 네이티브에서 플러그인이 `window.Capacitor.Plugins.App`에
> 노출됩니다. 미설치 시에도 본 코드는 무해하게 비활성(no-op)됩니다.

## 4. 빌드 & 동기화 절차 (배포 시)

```bash
# 1) 웹 자산 빌드
npm run build                 # dist/ 생성 (✓ 검증 완료)

# 2) Capacitor 동기화
cd frontend
npx cap sync android
npx cap sync ios

# 3) 네이티브 실행/빌드
npx cap open android          # Android Studio
npx cap open ios              # Xcode (macOS)
```

## 5. 실기기 검증 체크리스트 (배포 전 권장)

- [ ] Android 실기기/에뮬레이터: 햄버거 → drawer 열림 → **하드웨어 백버튼으로 닫힘**
- [ ] Android: 상태바 영역 콘텐츠 침범 없음(`overlaysWebView:false`)
- [ ] iOS 실기기/시뮬레이터: 노치/홈바 safe-area로 사이드바·콘텐츠 가림 없음
- [ ] iOS: 키보드 표시 시 입력폼 리사이즈(`Keyboard.resize:native`)
- [ ] 양 OS: 대메뉴 클릭 = 펼침만(즉시 페이지 이동 안 함), 하위 클릭 = 이동+닫힘
- [ ] 양 OS: 바텀 탭 네비 + safe-area-inset-bottom 여백
- [ ] 양 OS: 터치 타깃이 손가락으로 정확히 눌리는지(44px)

## 6. 결론

본 변경은 Capacitor 설정을 수정하지 않으며, 기존 `viewport-fit=cover` + `overlaysWebView:false` +
`contentInset:always` 전제와 정합. 백버튼 처리는 플러그인 존재 시에만 활성화되는 안전 패턴으로 추가됨.
