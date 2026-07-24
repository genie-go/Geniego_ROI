# CWIS Part004-04 ST07-01 — Favorites Frontend 기존 구조 분석

| 항목 | 값 |
|---|---|
| 명세 | `CWIS-P004-U04-WS01-SP02-TK002-ST07-01` |
| **판정** | **READY_WITH_LIMITATIONS** |
| 성격 | 분석 전용 — Production 코드 무변경 |
| 기준 리비전 | `c827b6f2afa` |
| 생성 산출물 | 본 보고서 + analysis.json + reuse-plan.json + command-map.json |

---

## 0. 요약

ST07-01은 순수 분석 단계라 Option A/B와 무관하게 안전하게 수행했다. 실측 결과, ST07 전체가 **세 갈래로 명확히 갈린다**:

- **UI 축은 이미 구현·배포됨** (토글·사이드바·리스트·빈상태·네비게이션·i18n) → 6 REUSE + 1 EXTEND
- **서버 연동 축은 BLOCKED** (API 호출·쿼리캐시·뮤테이션) → favorites API 부재(ST05 BLOCKED)
- **순수 신규 후보는 Reorder 하나** → 단 DnD 라이브러리 없음 + BACKLOG-3 요구 미확인

즉 ST07-02(API Client) 이후는 서버 API 를 전제하므로 **Option B 재결정 없이는 실질 진행 대상이 device-local Reorder 뿐**이다. 이 결론을 분석이 근거로 드러낸다.

---

## 1. 기존 Frontend 스택 (실측)

| 축 | 실측 |
|---|---|
| Framework | **React 18.3.1 + Vite 5.4.2** |
| Router | react-router-dom 6.26.2 |
| Language | **JavaScript** (TypeScript 미사용 — .tsx 0건) |
| 구조 | 기능폴더 아님 — 유형별 디렉터리(`pages/components/layout/context/contexts/auth/services/i18n`) |
| State | **React Context API** (Redux/Zustand 미사용) — 10개 Provider |
| Query 라이브러리 | **없음** (TanStack/SWR/Apollo 0) |
| API Client | `services/apiClient.js` (fetch 래퍼, axios 아님) |
| 인증 | `auth/AuthContext.jsx` (useAuth) + `authGate.js` |
| Tenant | apiClient 가 `X-Tenant-ID` 헤더 자동 주입(localStorage.tenantId) |
| **Workspace** | **없음** (엔티티·컨텍스트 부재) |
| 권한 | `auth/useTeamRole.js` (canWrite/isOwner/isAdmin) + MenuVisibilityContext |
| Design System | 없음 — 인라인 스타일 + `styles.css` + CSS 토큰 |
| Icon | **이모지 문자열**(item.icon) — 아이콘 라이브러리 0 |
| Toast | `components/ToastProvider.jsx` (useToast) |
| Skeleton | **없음** |
| Empty State | `components/EmptyState.jsx` (단 전용 props — 범용 아님) |
| DnD | **없음** (react-dnd/@dnd-kit/sortablejs 0) |
| i18n | `i18n/t.js` (useT) — **15개 로케일** |
| Unit Test | 표준 러너 **없음** — 커스텀 `tools/favorites_selftest.mjs` (`npm run fav:test`) |
| Component Test | **없음** (RTL/Vitest 0) |
| E2E | 커스텀 node (`tools/e2e/*.mjs`) — Playwright/Cypress 러너 미설치 |
| Lint / Typecheck | `eslint src --ext .js,.jsx` / **없음**(TS 미사용) |

---

## 2. 현행 즐겨찾기 = device-local (핵심)

```
frontend/src/layout/Sidebar.jsx  (전용 폴더 없이 인라인)
  ├─ FavStar           : 토글 별표(aria-pressed·44x44)
  ├─ useFavorites()    : useState(Set) + localStorage 'g_sidebar_favs'
  └─ QuickAccessPanel  : 사이드바 섹션(리스트·빈상태·스크롤)

API 호출: 0 (device-local · 서버 미연동)
```

spec 이 전제하는 서버 연동 favorites 와 **근본적으로 다르다**. 이번 세션(커밋 `1234a6f0957`)에 BACKLOG-1/2 + 패널 소멸을 수정·배포하여 UI 완성도는 이미 높다.

---

## 3. 재사용 판정 (15축 · reuse-plan.json 정본)

| 기능축 | 판정 | 근거(요약) |
|---|---|---|
| Favorite API 호출 | **BLOCKED** | apiClient REUSE 준비됐으나 favorites 엔드포인트 부재(ST05) |
| Favorite Query Cache | **BLOCKED** | 쿼리 라이브러리 0 + 서버 대상 0 |
| Favorite Mutation | **BLOCKED** | 현행=로컬 토글. 서버 뮤테이션 API 부재 |
| Toggle Button | **REUSE** | `FavStar` 이미 구현·배포(aria-pressed·44x44) |
| Sidebar Section | **REUSE** | `QuickAccessPanel` 이미 구현 |
| Favorite List Item | **REUSE** | 이미 구현(이모지·i18n·navigate·✕) |
| Loading State | **NOT_REQUIRED** | device-local 동기 로드 |
| Empty State | **REUSE** | 빈 즐겨찾기 시 패널 숨김(기존 UX) |
| Error State | **NOT_REQUIRED** | localStorage try/catch 이미 처리 |
| Resource Navigation | **REUSE** | `navigate(item.to)` (react-router) |
| Permission Control | **NOT_REQUIRED** | favorites.* 서버 권한 미등록·UI 프리퍼런스 |
| Drag Reorder | **IMPLEMENT_NEW** | DnD 라이브러리 없음·BACKLOG-3 보류 |
| Keyboard Reorder | **IMPLEMENT_NEW** | 키보드/버튼 방식만 가능·보류 |
| Localization | **REUSE** | useT + 15개국 키 존재 |
| Frontend Test | **EXTEND** | `fav:test` 18항 확장 중 |

**집계:** REUSE 6 · EXTEND 1 · IMPLEMENT_NEW 2 · NOT_REQUIRED 3 · BLOCKED 3 · UNKNOWN 0

---

## 4. 실행 명령 (command-map.json 정본)

| 용도 | 명령 | 안전 |
|---|---|---|
| Lint | `cd frontend && npm run lint` | ✓ |
| Typecheck | **없음** (TS 미사용) | — |
| Unit Test | `npm run fav:test` (정적 18항) | ✓ |
| Nav 회귀 | `npm run nav:test` (36항) | ✓ |
| E2E | `npm run e2e:render` (커스텀) | 조건부 |
| Build | `cd frontend && npm run build` | ✓ (배포는 승인 후) |

★ Package 설치 금지(§29) → 새 러너·라이브러리 도입 불가. typecheck·component test 는 인프라 부재로 NOT_EXECUTED.

---

## 5. 검증 (§Git Diff)

```bash
git status --short   # 산출물 4건만(허용경로)
git diff --name-only # 빈 결과(tracked 변경 없음)
git diff --check     # 빈 결과
```

- Production/Backend/Frontend 코드 변경 **없음** (분석 전용)
- Lock/env 변경 **없음**
- 허용경로 외 변경 **없음** — 4건 전부 `tools/cwis/**`·`docs/cwis/**`

---

## 6. 판정과 다음 단계

**READY_WITH_LIMITATIONS.** 프레임워크·API 클라이언트·상태/쿼리 구조·네비게이션·권한·디자인·테스트 체계를 전수 확인하고 15축 재사용 판정을 완료했다.

제한사항:
- 서버 favorites API 부재(ST05 BLOCKED) → API 관련 3축 BLOCKED
- 쿼리 라이브러리·DnD·Skeleton·컴포넌트 테스트 프레임워크 부재(§29 설치 금지)
- Workspace 컨텍스트 부재 → §18 N/A
- 필수 입력 `favorites-test-implementation-summary.json` 부재(ST06 미처리)

### ST07-02(API Client/Types) 준비도 — CONDITIONAL

ST07-02 는 favorites 서버 API 를 전제한다. 그러나 그 API 가 BLOCKED 이므로:
- **서버 연동 축**: BLOCKED — 존재하지 않는 엔드포인트를 호출하는 코드가 됨
- **device-local 축**: API Client 자체가 NOT_REQUIRED(localStorage 로 충분)

즉 재사용 판정이 드러내듯 **ST07-02 이후 실질 진행 대상은 device-local Reorder(BACKLOG-3) 하나**이며, 그마저 요구 미확인 보류 상태다. Option B 재결정이 없으면 ST07-02~05·07 은 대부분 "이미 구현됨(REUSE)" 또는 "BLOCKED(서버)"로 수렴한다.

**권장:** ST07-02 진입 전, (a) device-local Reorder 를 진행할지 명시 확인하거나 (b) Option B 재결정 여부를 확정하는 것이 왕복을 줄인다.
