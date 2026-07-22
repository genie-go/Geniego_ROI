# frontend/ — React SPA + Capacitor 모바일

GeniegoROI 웹 클라이언트. 패키지명 `genie-roi-v407-ui`.

---

## 1. 스택 (2026-07-22 실측)

| 항목 | 값 |
|------|-----|
| React | 18.3 |
| Vite | **5.4.21** (`frontend/node_modules/vite`) |
| Capacitor | 6 (Android / iOS) |
| 페이지 | `src/pages/*.jsx` 108개 · `App.jsx` 의 `lazy()` 109개 · `<Route>` 135개 |
| 다국어 | `src/i18n/locales/*.js` **15개 언어** |

---

## 2. 명령

```bash
npm install

npm run dev          # 개발 서버 (5173)
npm run build        # 프로덕션 빌드 → frontend/dist/
npm run preview      # 빌드 산출물 미리보기
npm run lint         # ESLint (.eslintrc.json)

npm run build:cap    # Capacitor 모드 빌드
npm run cap:sync     # 빌드 + cap sync
npm run cap:android  # Android Studio 열기
npm run cap:ios      # Xcode 열기
```

### ★ 빌드는 반드시 이 디렉터리에서

저장소 루트에도 `vite.config.js` 와 `vite` 7.3.1 이 있지만 **어느 빌드 경로에서도 사용되지 않는다.**
운영 빌드(`deploy.ps1:30`)와 CI(`.github/workflows/deploy.yml:61,97`) 모두 `cd frontend` 후 빌드한다.
루트에서 `npm run build` 를 돌리면 **다른 vite major + 다른 청크 전략** 산출물이 나와 운영과 불일치한다.

### 개발 서버 프록시

`vite.config.js` 가 `/api`·`/auth`·`/creatives`·`/health[z]`·`/v{2~4자리}` 를 `VITE_PROXY_TARGET` 으로 프록시한다.
**기본값은 운영(`https://www.genieroi.com`)** 이므로, 로컬 백엔드를 붙이려면 명시해야 한다.

```bash
VITE_PROXY_TARGET=http://localhost:8080 npx vite
```

---

## 3. 구조

```text
frontend/src/
├── pages/        페이지 컴포넌트 (App.jsx 에서 lazy 로드)
├── components/   공용 UI 컴포넌트
├── layout/       레이아웃 · 사이드바
├── context/      React Context  ← contexts/ 와 둘 다 실재하므로 신규 생성 전 양쪽 확인
├── contexts/     React Context
├── hooks/        커스텀 훅
├── services/     apiClient.js 등 API 계층
├── i18n/         locales/ 15개 언어 + 초기화
├── security/     SecurityGuard 등
├── auth/         인증
├── theme/        테마 토큰
├── native/       Capacitor 연동
├── constants/ · data/ · lib/ · utils/
```

### 청크 전략

`manualChunks` 는 **정적 객체**다 — `vendor-react` / `vendor-charts` / `vendor-locales` / `shared-context`.

페이지는 **의도적으로 그룹화하지 않는다.** 도메인별 page-group(`pages-analytics` 등)은 171차에 제거됐다.
그룹화가 청크 간 동일 React 모듈 참조를 만들어 init-order race → 화이트스크린을 6회 유발했기 때문이다.
**새 페이지를 청크에 등록할 필요는 없다.**

### API 호출

`src/services/apiClient.js` 경유. 베이스 URL 은 `VITE_API_BASE`,
토큰은 `localStorage.genie_token`(데모 모드에서는 `demo_genie_token`),
`X-Tenant-ID` 는 `localStorage.tenantId`(기본 `demo`)에서 주입된다.

---

## 4. 주의

- `src/i18n/locales/*.js` 는 매우 크다(`ko.js` ≈ 1MB). **전체 로드 금지** — 타깃 Grep/부분 Read 로 편집한다.
- 신규 키는 **15개 파일 전부**에 추가해야 런타임 폴백 경고가 나지 않는다. `ko.js` 가 원본이다.
- `dist/`, `node_modules/`, `android/app/src/main/assets/public/` 은 생성물이며 gitignored 다.

---

*상세 아키텍처는 저장소 루트 [CLAUDE.md](../CLAUDE.md) 참조*
