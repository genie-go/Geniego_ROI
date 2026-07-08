# 271차 세션 인계서 — 전면 15개국 실시간 현지화 (새로고침 없는 언어전환)

> 브랜치: `feat/n236-admin-growth-automation` (master 미접촉). 데모(demo.genieroi.com) 반복 배포·검증 완료. 운영 미반영.
> 자동번역: Claude 병렬 서브에이전트로 ko(SSOT)→14개국. 브랜드/기술토큰/플레이스홀더 보존.

## 1. 목표
데모 곳곳 잔존 한글 → **모든 메뉴 전수분석 + 15개국 현지 자연어 + 언어 선택 시 새로고침 없이 실시간 전환**. 단, **고유명사(고객명·상품명)와 운영자 전용 admin 설정 페이지는 제외**(사용자 지시).

## 2. 근본원인 2가지 + 해결
### A. 로케일 파일에 한글값 박힘 (~8,400건) — 근절
- **로더 자가치유** `frontend/src/i18n/index.js`: `HANGUL_RE=/[가-힣]/`, `clean(v)` — 비한국어 언어에서 base/오버레이 값에 한글이 있으면 미번역 누출로 간주해 gap 처리 → 현지어 오버레이(AUTOFILL)→en 폴백. base·오버레이·pages-prefix 모두 적용. `inlineFallback`은 미적용(raw 키 노출 방지).
- **오버레이 백필** `frontend/src/i18n/autofill.json`: 누출키를 ko→14국 번역 채움.
- **`tools/i18n_autofill.mjs`**: 기본모드가 Hangul-base 값도 채움대상 포함(배포시 자가치유 지속).

### B. 원시 리터럴·데이터맵·데모데이터·백엔드데이터 (t() 미경유) — 브라우저 전수감사 1,619 → 285 (82%↓)
- **컴포넌트 내 리터럴** → `t('ns.key','한글')` 래핑 + 오버레이 번역(관리자페이지·패널·온보딩 등).
- **module-level 데이터맵/상수** → 아래 실시간 레지스트리로 처리.
- **백엔드 API 응답(플랜 기능·메뉴명)** → 프론트에서 `localizeDeep`로 현지화(DB 미변경).

## 3. ★핵심 신설 메커니즘 (정본·재사용)
- **`frontend/src/utils/reactiveLocalize.js`** — 실시간 언어전환 엔진.
  - `registerRelocalize(fn)`: 등록 즉시 1회 + `genie-lang-change` 이벤트마다 실행.
  - `snapshot(obj)`(한글 원본 보존) / `applyDeep(live, orig, resolve)`(원본 순회하며 표시값만 in-place 치환) / `currentLang()`.
  - `setLang`(index.js)은 **리로드 안 함** — setLangState(반응형 t()) + `genie-lang-change` dispatch → 레지스트리가 module-level 데이터를 새 언어로 재치환 → useI18n 소비자 재렌더 시 반영.
- **`frontend/src/utils/langSync.js`** — `detectLangSync()`(저장값→navigator→ko, i18n detectLang 동기판). 로드시점 데이터맵이 t()와 동일 언어 사용.
- **`frontend/src/utils/demoUiLocalize.js`** — `localizeDeep(obj)`(데모/표시 상수를 스냅샷+등록해 반응형 현지화), `localizeStr(ko)`(단일 문자열 반응형 반환). 맵=`demoUiI18n.json`(demoui::<한글> 키).
- **번역 데이터 파일**: `frontend/src/layout/menuLabelI18n.json`(menuLabel::key::title/desc·subtab::), `frontend/src/pages/chanI18n.json`(chan::), `frontend/src/utils/demoUiI18n.json`(demoui::).

### 적용처
- `layout/sidebarMenuLabels.js` — MENU_KEY_LABEL·SUB_TABS_BY_PATH 실시간 현지화(스냅샷+registerRelocalize).
- `pages/ApiKeys.jsx` — GROUP_LABELS·CHANNELS·WEBHOOK_CHANNELS 실시간 현지화.
- `data/demoSeedData.js` — 전 표시 export를 `localizeDeep` 등록(로직결합 문자열·인명은 맵 제외로 미변경). 날짜 `ko-KR`→언어별 로케일. 시드버전 v19(재방문 캐시 무효화).
- 채널 페이지(WhatsApp/Kakao/Instagram/SMS/LINE/KrChannel 등)·OperationsHub·CaseStudy·PixelTracking·FeedbackCenter·TeamWorkspace·CreativeStudioTab·PaymentMethods·SupplyChain·WmsManager·Audit — module-level 데모 상수 `_dloc()` 등록.
- `pages/public/PricingPublic.jsx`·`pages/PlanPricing.jsx` — 백엔드 플랜/메뉴 API 응답 `_dloc()` 현지화(app-pricing 37→1).
- `contexts/CurrencyContext.jsx` — KRW 압축표기 `억/만` 하드코딩 → 언어별(`万/億`·`M/K/B`).
- `App.jsx`(platform_growth 배너)·`Sidebar.jsx`(labelKey 우선 렌더)·`AvatarField.jsx`·`Settlements.jsx`·`DataTrustDashboard`·`OnsiteCro`(코드예시) 등 개별.

## 4. 검증(브라우저 실측)
- 롤업·오토마케팅·journey-builder·whatsapp·kakao·line-channel·live-commerce·operations·app-pricing 전부 현지어.
- **실시간 무리로드 확정**: 연동허브 ja→zh `国内オープンマーケット→国内开放市场` 즉시 변경 + `window.__noReloadMarker` 생존.
- 전수감사(ja, 84라우트): 1,619 → 285. 잔여 285 = 고유명사 126(고객·상품명, 유지) + admin plan-pricing 설정 76(운영자 전용, 제외) + 산재 소수.

## 5. 배포/도구
- 데모 빌드=`npx vite build --mode demo`, 배포=`node deploy_demo.cjs`(→/home/wwwroot/roidemo.geniego.com/frontend/dist). **운영·master 미반영.**
- 감사도구: playwright(`npm i playwright --no-save`)로 84라우트 렌더 후 한글 텍스트노드 수집. 세션토큰+`demo_genie_remember=1` localStorage 주입(restorableToken remember 게이트).

## 6. ★잔여(다음 세션, 필요시)
- **고유명사**(고객명·상품명 ~126): 사용자 지시로 미번역 유지(+CRM 조회키 정합).
- **admin 설정 페이지**(plan-pricing 메뉴트리·기간티어 ~76): 운영자 전용, 제외.
- 산재 소수: 유닛 프래그먼트(`건 (`·`/일`), 발급가이드 채널경로(쿠팡 Wing 경로), 1-off 데이터 라벨. 필요시 발급가이드는 270차 issuanceGuide 체계로.
- **반응성 한계**: GlobalDataContext가 localStorage(JSON) 영속 → 파싱본은 원본 ref 아님 → 라이브전환 시 직접 import 소비자만 즉시 반영(대다수). 완전 반응 필요 시 소비 시점 `localizeStr` 사용.
