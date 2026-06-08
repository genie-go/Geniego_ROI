# GeniegoROI 모바일 앱 빌드 가이드 (Capacitor · Phase M1)

단일 코드베이스(React SPA)를 **Capacitor**로 감싸 iOS/Android 네이티브 앱으로 빌드한다.
웹(roi.genie-go.com)과 동일한 `frontend/` 소스를 그대로 사용하며, 네이티브 셸·플러그인만 추가된다.

## 구성 요약 (M1에서 추가/변경된 것)

| 파일 | 역할 |
|------|------|
| `frontend/capacitor.config.json` | appId `com.geniego.roi`, appName `GeniegoROI`, webDir `dist`, 스플래시/상태바/키보드 |
| `frontend/.env.capacitor` | 네이티브 전용 env — `VITE_API_BASE=https://roi.genie-go.com` (상대경로 API 깨짐 방지) |
| `frontend/src/native/capacitorInit.js` | 네이티브 초기화(상태바·스플래시·백버튼·키보드). 웹에서는 no-op |
| `frontend/src/native/native.css` | `.cap-native` 스코프 safe-area·앱 느낌 폴리시(웹 무영향) |
| `index.html` | 네이티브에서 Service Worker 등록 스킵(로컬 자산 직접 서빙) |
| `backend/public/index.php` | CORS 화이트리스트에 `capacitor://localhost`, `https://localhost` 추가 |
| `frontend/android/`, `frontend/ios/` | 네이티브 프로젝트(Gradle / Xcode) |

## 사전 요구사항

- **Android**: Android Studio + Android SDK(API 34+) + JDK 17
- **iOS**: macOS + Xcode 15+ + CocoaPods (`sudo gem install cocoapods`)
- Node 18+ (현재 리포 Node 24 OK)

## 빌드 & 실행

모든 명령은 `frontend/` 에서 실행.

```bash
cd frontend

# 1) 네이티브용 웹 빌드(절대 API URL) + 네이티브 프로젝트 동기화
npm run build:cap      # vite build --mode capacitor → frontend/dist
npx cap sync           # dist + 플러그인을 android/ios 로 복사

# 2-A) Android — Android Studio 열기 → Run(▶) 으로 에뮬레이터/기기 실행
npm run cap:android    # build:cap + sync + Android Studio 오픈

# 2-B) iOS (macOS 전용) — 최초 1회 pod 설치 후 Xcode 실행
cd ios/App && pod install && cd ../..
npm run cap:ios        # build:cap + sync + Xcode 오픈
```

> ⚠️ 코드 변경 후에는 항상 `npm run build:cap && npx cap sync` 로 네이티브에 반영해야 한다(웹 자산은 빌드 산출물).

## 동작 원리

- 앱은 디바이스 내부의 `dist` 정적 자산을 로컬 WebView(`https://localhost` / `capacitor://localhost`)로 로드 → API는 `https://roi.genie-go.com` 절대 URL로 호출(CORS 허용됨).
- `Capacitor.isNativePlatform()` 분기로 웹/앱 단일 코드베이스 유지. 웹 빌드(`npm run build`)는 네이티브 코드 미실행.
- 상태바 비-overlay + iOS contentInset + `env(safe-area-inset-*)` 로 노치/홈인디케이터 대응.

## 다음 단계
- **M2** 네이티브 통합: 푸시(FCM/APNs)·생체로그인·햅틱·공유/다운로드
- **M3** UX 하드닝: 모바일 탭바·제스처·번들 경량화·60fps
- **M4** 스토어 배포: 서명(keystore/인증서)·권한 컴플라이언스·TestFlight/내부테스트 → 심사

## 트랩/주의
- 빌드 산출 웹 자산(`android/app/src/main/assets/public`, `ios/App/App/public`)은 `cap sync` 가 매번 덮어쓰므로 git 추적 제외.
- `VITE_API_BASE` 미설정 빌드(일반 `npm run build`)를 네이티브에 넣으면 상대경로 API 가 `localhost` 로 가 깨진다 → 반드시 `build:cap` 사용.
