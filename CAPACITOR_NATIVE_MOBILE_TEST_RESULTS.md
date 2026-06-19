# CAPACITOR_NATIVE_MOBILE_TEST_RESULTS

> Capacitor Android/iOS 네이티브 빌드 검증 + 네이티브 로그인 실패 근본 수정

## 0. 핵심 수정 — 네이티브 로그인 실패 (사용자·admin 공통)

### 증상
모바일(네이티브 앱)에서 일반 사용자와 admin 관리자 **모두 로그인 실패**.

### 근본 원인
- `.env.capacitor`는 `VITE_API_BASE=https://roi.genie-go.com`를 설정(주석: "네이티브 앱은 localhost/capacitor:// 스킴에서 서빙 → 상대경로 API 깨짐 → 절대 URL 강제").
- 그러나 **`auth/AuthContext.jsx`가 이를 무시하고 `const API = "/api"` 상대경로 하드코딩**.
- 네이티브 웹뷰 origin = `https://localhost`(Android)/`capacitor://localhost`(iOS) → `/api/auth/login`이 백엔드 없는 곳으로 호출 → **로그인/회원가입/admin 인증/계정찾기 전부 실패**.
- `apiClient.js`는 base를 사용했으나 인증 경로만 누락(불일치).

### 수정 (2파일, 웹 빌드 무영향)
| 파일 | 변경 |
|---|---|
| `auth/AuthContext.jsx` | `const API = (import.meta.env.VITE_API_BASE \|\| "") + "/api"` |
| `pages/AuthPage.jsx` | `const API_BASE = import.meta.env.VITE_API_BASE \|\| ""` + raw fetch 4곳 접두 (계정찾기/비번재설정 `/api/auth`, admin 접속키 `verify-access-key`, 가입 `pricing/public-plans`, 쿠폰 `coupon/redeem`) |

웹/PWA 빌드는 `VITE_API_BASE` 미설정(빈 문자열) → 기존 상대경로 `/api` 그대로(회귀 0).

### 검증
```
npx vite build --mode capacitor → ✓ built in 47.14s
번들 내 절대 base 'https://roi.genie-go.com/api' 주입: 25곳
빈 base 잔존('""+"/api"'): 0건
```
→ 네이티브 빌드에서 모든 인증 호출이 운영 백엔드 절대 URL로 향함.

### ⚠️ 배포 전 필수 확인
1. **백엔드 CORS**: 네이티브 origin(`https://localhost`, `capacitor://localhost`)을 `Access-Control-Allow-Origin`에 허용해야 함(미허용 시 수정 후에도 CORS로 실패).
2. **적용 경로**: 이 수정은 `npm run build:cap`(= `vite build --mode capacitor`) → `cap sync` → 네이티브 재빌드로만 단말 반영.
3. 문제 환경이 **모바일 브라우저/PWA**였다면 원인이 다름(상대경로 정상) — 별도 진단 필요.

## 0.5 전 페이지 네이티브 네트워크 정상화 — 전역 fetch base shim

### 문제 (로그인 수정 이후 잔여)
로그인 인증부(AuthContext/AuthPage)를 절대 URL로 고쳤지만, **로그인 후 각 페이지가 raw 상대경로 `fetch("/api/...")`·`fetch("/v423/...")`·`fetch("/auth/...")`** 를 쓰면 네이티브에서 동일하게 실패. 전수 스캔 결과 **17개 파일·58곳**의 raw 상대 fetch 존재(`apiClient.js` 경유는 이미 base 적용).

### 해결 — 단일 진입점 shim (58곳 개별 수정 대신)
`src/native/capacitorInit.js`(기존 네이티브 초기화 모듈, 신규 파일 0)에 `installFetchBase()` 추가:
- 앱 부팅 시 `window.fetch`를 **1회 래핑**(멱등), API 경로(`/api`·`/auth`·`/v{숫자}`·`/health[z]`)에만 `VITE_API_BASE` 자동 접두.
- **정적 자산**(`/logo`·`/manifest`·`/sw.js`·`/icon-*`)은 정규식 미매칭 → 번들 로컬 서빙 유지.
- 이미 절대 URL(`https://`·`//`)·base 적용 호출은 미매칭 → **이중 접두 없음**(AuthContext 명시 수정과 충돌 없음).
- `initNative()` 내 `isNative()` 가드 뒤에서만 설치 → **웹 빌드 no-op(회귀 0)**.
- 향후 추가되는 상대 fetch 도 자동 적용(미래 회귀 방지).

```js
const API_RE = /^\/(api|auth|v\d|health|healthz)(\/|\?|$)/;
window.fetch = (input, init) =>
  (typeof input === 'string' && input[0] === '/' && API_RE.test(input))
    ? origFetch(base + input, init) : origFetch(input, init);
```

### 백버튼 이중 발화 정리
Sidebar가 추가했던 별도 `backButton` 리스너를 제거하고, `capacitorInit.js`의 **중앙 backButton 핸들러**가 `window.__geniegoCloseDrawer`를 먼저 확인하도록 조정:
- drawer 열림 → 닫기만(네비/종료 차단), 닫힘 → 기존 history.back/exitApp.
- 중복 리스너 발화·"닫힘+뒤로" 이중 동작 제거.

### 검증
```
vite build --mode capacitor → ✓ 47.55s, 번들에 fetch shim·백버튼 조정 포함 확인
npm run build (웹)          → ✓ 46.62s, 절대 auth base 미포함(상대경로 유지) = 웹 회귀 0
```

## 1. 빌드 설정 (변경 없음)

| 스크립트 | 명령 |
|---|---|
| 웹 빌드 | `npm run build` (= `vite build`) |
| 네이티브 빌드 | `npm run build:cap` (= `vite build --mode capacitor`) |
| 동기화 | `npm run cap:sync` / `cap:android` / `cap:ios` |

의존성: `@capacitor/core/android/ios/app/keyboard/splash-screen/status-bar` v6.x (설치 확인됨).

## 2. UI/레이아웃 변경의 네이티브 영향

| 변경 | Android | iOS |
|---|---|---|
| 사이드바 단일-open 아코디언·모바일 펼침전용 | ✅ matchMedia 기반, 웹뷰 동일 |
| 터치 44px | ✅ Material/HIG 권장 충족 |
| safe-area 패딩(사이드바/드로어/하단바) | ✅ `overlaysWebView:false`+`contentInset:always` 정합 |
| `100dvh` 컨테이너 | ✅ WKWebView/Android WebView dvh 지원 |
| 우측 드로어→전체폭 시트 | ✅ 인라인 style attribute 매칭, 웹뷰 동일 |
| 하드웨어 백버튼 → 사이드바 닫기 | ✅ `@capacitor/app` 설치됨 | n/a |
| 인라인 그리드/테이블 1열·스크롤 | ✅ CSS 미디어쿼리, 웹뷰 동일 |

## 3. 빌드 검증 결과

| 빌드 | 결과 |
|---|---|
| `vite build` (웹) | ✅ built in 46.19s, 에러 0 |
| `vite build --mode capacitor` (네이티브) | ✅ built in 47.14s, 에러 0 + 절대 API base 주입 확인 |

## 4. 실기기 검증 체크리스트 (배포 전 권장)

- [ ] **로그인**: 네이티브 앱에서 일반 사용자·admin 로그인 성공(CORS 허용 후)
- [ ] 환경선택(STEP1: 데모/운영) → 로그인 폼 → 제출 정상
- [ ] admin 로고 탭 → 접속키 → admin 로그인 정상
- [ ] 회원가입/비번재설정/계정찾기 네트워크 호출 정상
- [ ] 사이드바 아코디언/백버튼/safe-area (MOBILE_SAFE_AREA_CHECKLIST 참조)
- [ ] 겹침/잘림 (MOBILE_OVERLAP_FIX_REPORT 참조)
- [ ] iOS·Android 양쪽 동일 동작

## 5. 변경 파일 종합 (5파일, 신규 0)

- `frontend/src/auth/AuthContext.jsx` (로그인 인증 base)
- `frontend/src/pages/AuthPage.jsx` (인증 raw fetch base 4곳)
- `frontend/src/native/capacitorInit.js` (★전역 fetch base shim + 백버튼 drawer 조정)
- `frontend/src/layout/Sidebar.jsx` (모바일 아코디언/접근성/ESC + 백버튼 중앙조정)
- `frontend/src/styles.css` (모바일 터치/safe-area/겹침 안전 레이어 v3)
