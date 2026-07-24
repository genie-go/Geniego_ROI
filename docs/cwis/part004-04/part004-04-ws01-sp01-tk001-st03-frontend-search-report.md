# CWIS-P004-U04-WS01-SP01-TK001-ST03 — Frontend Search Report

| 항목 | 값 |
|---|---|
| **Specification ID** | `CWIS-P004-U04-WS01-SP01-TK001-ST03` |
| 작업명 | Favorites Existing System Analysis — Frontend Favorites Keyword Search |
| 선행 Step (ST01 / ST02) | **READY_WITH_LIMITATIONS** / **READY** → 진행 가능 |
| Git Branch | `feat/n236-admin-growth-automation` |
| Git Revision (직전) | `817c2968120` |
| 검색 엔진 | Node 표준 모듈 (정규식 — TS/Babel/Vue 파서 미설치) |
| 실행 시간 | 약 0.8초 (332 파일) |
| **완료 상태** | **READY_WITH_LIMITATIONS** |

---

## 1. ★핵심 발견 — 즐겨찾기 구현이 **2개** 존재하며 저장 정책이 서로 다르다

ST02 가 백엔드 0건을 확정한 반면, 프런트엔드에는 **서로 독립적인 즐겨찾기 구현 2개**가 있다.
그중 하나(`CaseStudy.jsx`)는 **Part004-01 이 인벤토리에 올리지 못한 신규 발견**이다.

| | **① 사이드바 즐겨찾기** | **② 사례 북마크 (신규 발견)** |
|---|---|---|
| 위치 | `frontend/src/layout/Sidebar.jsx` | `frontend/src/pages/CaseStudy.jsx` |
| 심볼 | `useFavorites` · `useRecentVisits` · `QuickAccessPanel` | `toggleBookmark` |
| 저장 | `localStorage.getItem('g_sidebar_favs')` **직접 호출** | `tGetJSON('case_bookmarks')` |
| **테넌트 격리** | **✗ 디바이스 전역** | **✓ 테넌트 스코프**(`case_bookmarks::t=<tenant>`) |
| 서버 동기화 | ✗ | ✗ |
| 대상 리소스 | 메뉴 경로(`item.to`) | 사례 ID |
| UI | 탭 패널(즐겨찾기/최근) | ⭐/☆ 토글 + 필터 탭 + 빈 상태 문구 |
| i18n | ✓ (`t('g.quickRecents')`) | ✓ (`tr('tabBookmark')`) |

**같은 제품 안에서 동일 개념이 두 가지 다른 저장 정책으로 구현되어 있다.**
Part004-04 본 구현은 이 둘을 통합하거나, 최소한 저장 정책을 일원화해야 한다(ST08/ST10 입력).

> ★부수 확인: `sidebarMenuLabels.js:430` 의 `{ id: 'bookmark', label: '북마크' }` 는
> `/case-study` 페이지의 **서브탭 정의**로, ②와 동일 기능의 메뉴 레지스트리 측 흔적이다.

---

## 2. 필요성 판정 (상시 원칙 적용)

| 명세 요구 | 판정 | 사유 |
|---|---|---|
| 프런트 검색 실행 | **IMPLEMENT** | 실제 구현이 존재하는 **유일한 지점**. 최우선 가치 |
| Component / State / API 인벤토리 3종 | **IMPLEMENT** | 실제 내용이 있음. **API 인벤토리는 0건이지만 그 자체가 결론**(서버 동기화 부재 증명) |
| §7 `resources/js` `resources/ts` `client` `web` `templates` `modules` `packages` `plugins` | **SKIP** | **전부 부재**(실측). 실제 프런트는 `frontend/src` + `frontend/public` 뿐 |
| Vue / Svelte / Twig / Blade 파서 | **SKIP** | 해당 확장자 파일 **0개**. 파서를 만들 대상이 없음 |
| TanStack Query / Apollo / SWR / Pinia / Vuex / Redux / Zustand 패턴 | **탐지만** | **전부 미설치**(실측). 부재 증명 목적으로 패턴 검색은 수행(비용 0), 전용 파서는 미구현 |
| §28 Storybook | **SKIP** | `@storybook/react` 미설치, `*.stories.*` 파일 0개 |
| §47 스크립트 언어 (PHP vs MJS) | **MJS 채택** | 저장소 프런트 툴링 표준이 `tools/*.mjs`. JS/JSX 처리에 Node 표준 모듈로 충분 |
| `frontend/public/api_manuals` 981개 스캔 | **SKIP + 근거 기록** | `tools/gen_api_manuals.mjs` **생성물**이며 즐겨찾기 키워드 **0건** 실측. 스캔 시 통계만 왜곡(1307 → 332) |

---

## 3. 탐지된 기술 스택 (실측 — 설치된 것만)

| 구분 | 결과 |
|---|---|
| Framework | **React 18.3.1** + react-router-dom 6.26 |
| Vue / Svelte / Inertia / TypeScript | **전부 미설치** |
| State Management | **React Context API** (Pinia/Vuex/Redux/Zustand **전부 미설치**) |
| Query Library | **없음** (TanStack/React Query/Apollo/SWR 미설치) |
| HTTP Client | **fetch 래퍼** `frontend/src/services/apiClient.js` (Axios 미설치) |
| Test Framework | **없음** (Vitest/Jest/Cypress/Playwright 미설치) |
| Storybook | 미설치 |
| Build | Vite 5.4 |

---

## 4. 검색 범위

| 항목 | 값 |
|---|---|
| 검색 루트 | `frontend/src`, `frontend/public` |
| 부재로 제외된 후보 | `resources/js` `resources/ts` `resources/views` `client` `web` `src` `templates` `modules` `packages` `plugins` (10개) |
| 확장자 | `js jsx ts tsx vue svelte html twig` + `.blade.php` (실제 존재는 **js/jsx/html** 뿐) |
| **생성물 분리** | `frontend/public/api_manuals` **975 파일** (생성기·키워드 0건 근거 기록) |
| **noisy 분리** | `frontend/src/i18n/locales` **15 파일** (UI 라벨 사전) |
| **실제 스캔** | **332 파일** |
| 읽기 실패 | **0** (0.0%) · 외부 symlink 0 · 5MB 초과 0 |

---

## 5. 검색 통계

| 항목 | 값 |
|---|---|
| 총 Match (중복 제거 전) | 81 |
| **중복 제거 후** | **73** |
| 고유 파일 (히트 보유) | **30** |
| **Component 후보** | **2** |
| **Hook / Store 후보** | **2** |
| **API 호출 후보** | **0** |
| **Endpoint 후보** | **0** |
| 민감정보 마스킹 | 0 (대상 없음) |

### 5.1 Classification

| Classification | 건수 |
|---|---|
| OBVIOUS_FALSE_POSITIVE | 44 |
| **POTENTIAL_FRONTEND_IMPLEMENTATION** | **19** |
| **POTENTIAL_FRONTEND_INFRASTRUCTURE** | **10** |
| POTENTIAL_TEMPLATE_IMPLEMENTATION | 0 |

### 5.2 Priority (파일 단위)

| Priority | 파일 수 |
|---|---|
| **HIGH** | **3** |
| MEDIUM | 2 |
| LOW | 0 |
| IGNORE_CANDIDATE | 25 |

### 5.3 품질 신호 (히트 주변 ±14줄 기준)

| 신호 | 건수 |
|---|---|
| **Optimistic Update** | **0** |
| **Rollback 처리** | 11 (대부분 `catch()` — 즐겨찾기 전용 롤백 아님) |
| 중복 클릭 차단 | 25 |
| Loading / Error / Empty State | 30 / 42 / 21 |
| **Accessibility** | 25 (단, `QuickAccessPanel` 자체는 **미탐지**) |
| **aria-pressed** (토글 상태 전달) | **0** |
| Keyboard 지원 | 15 |
| Mobile 지원 | 32 |
| Translation | 42 |
| Frontend Permission Check | 26 |
| Route 연계 | 33 |
| **Sidebar 연계** | 35 |
| **Navigation(menu_key) 연계** | 13 |
| **User Preference 연계** | 34 |
| Context Menu | 0 |
| Storybook | 0 |
| Test | 4 |

★**주목**: `aria-pressed` **0건**. 즐겨찾기 토글 버튼이 **스크린리더에 on/off 상태를 전달하지 않는다**
(WCAG 4.1.2). `QuickAccessPanel` 은 접근성 신호 자체가 미탐지 — Part004-04 구현 시 필수 보완 대상.

★**Optimistic Update 0건 · API 0건**은 정합적이다 — 서버 왕복이 없으니 낙관적 갱신이 필요 없다.

---

## 6. 오탐 분석 (44건 전수 육안 확인)

| ignore_reason | 건수 | 실체 |
|---|---|---|
| **KO_FIXED_VALUE** | **31** | 한국어 `고정` = **"fixed"**. 고정 거터 / 고정 52px / 통화 USD 고정 / tier 고정 / 시드 고정 등 |
| COMMENT_ONLY | 7 | 위 `고정` + `별표`가 **법령 「별표」**(`productNoticeTemplates.js` 공정위 고시 별표) |
| **JS_BOOKMARKLET** | 4 | `OnsiteCro.jsx` 의 편집기 북마클릿 — ST02 의 `Onsite.php` 백엔드 짝 |
| CSS_FIXED_POSITION | 1 | `position: sticky` 상단 고정 |
| CWIS_SELF_REFERENCE | 1 | 본 CWIS 작업이 만든 코드 |

ST02 에서 도입한 **한글 낱말 경계 규칙**(`(?<![가-힣])`)을 그대로 승계해
`월별표`류 오탐이 재발하지 않았다.

---

## 7. 주요 후보 파일 (전체는 JSON)

| Priority | 파일 | 히트 | 내용 |
|---|---|---|---|
| **HIGH** | `frontend/src/layout/Sidebar.jsx` | 15 | `useFavorites` · `useRecentVisits` · `QuickAccessPanel` — **구현 ①** |
| **HIGH** | `frontend/src/pages/CaseStudy.jsx` | 9 | `toggleBookmark` + `case_bookmarks` — **구현 ② (신규 발견)** |
| **HIGH** | `frontend/src/context/MenuVisibilityContext.jsx` | 1 | `g_user_menu_visibility` — 개인 메뉴 설정(인접 인프라) |
| MEDIUM | `frontend/src/layout/sidebarMenuLabels.js` | 1 | `/case-study` 북마크 서브탭 정의 |
| MEDIUM | `frontend/src/pages/OnsiteCro.jsx` | 4 | 북마클릿(오탐이나 파일 자체는 MEDIUM 잔류) |

---

## 8. 생성 파일

| 파일 | 내용 |
|---|---|
| `tools/cwis/navigation/scripts/search-favorites-frontend.mjs` | 재실행 가능한 정적 검색기(빌드·런타임·네트워크 없음) |
| `tools/cwis/navigation/output/favorites-frontend-raw-results.json` | 원본 73건 + 메타/통계 |
| `…/favorites-frontend-file-inventory.json` | 파일 단위 30건 |
| `…/favorites-frontend-component-inventory.json` | Component 2건 |
| `…/favorites-frontend-state-inventory.json` | Hook/Store 2건(저장키·디바이스로컬 여부 포함) |
| `…/favorites-frontend-api-inventory.json` | **0건** — 서버 동기화 부재 증명 |
| `docs/cwis/part004-04/…-st03-frontend-search-report.md` | 본 보고서 |

---

## 9. 검증 결과

**23 passed, 0 failed**

| 검증 | 결과 |
|---|---|
| JSON 5개 구문 (§52) | PASS |
| `result_id` / `call_id` 형식 + **고유성** (§54) | PASS |
| **file_path 상대·내부·traversal 없음·실재** (§53) | PASS (30/30) |
| **raw 고유 파일 수 = inventory 수** (§55) | PASS |
| **inventory match_count = raw 집계** (§55) | PASS |
| component/state/api file_path ⊂ raw (§55) | PASS |
| 메타 카운트 = 실제 배열 길이 | PASS |
| **endpoint 가 상대 path/DYNAMIC/UNKNOWN 만** (§56) | PASS (외부 URL·쿼리 자격증명 0) |
| `matched_text` 300자 이하 · 개행 escape (§41) | PASS |
| **민감정보 원문 없음** (§57) | PASS |
| 절대경로·개인 디렉터리 없음 (§42) | PASS |
| classification / priority / type enum 정합 | PASS |
| 읽기 실패율 · 성능 기준 (§45·§59) | PASS |
| **운영 코드 무변경** (§58) | PASS |
| **★known_repo_symbols 실제 히트** | PASS (`useFavorites` 등 5종) |
| **★생성물/노이즈 분리 근거 기록** | PASS |

> 마지막 두 항목이 중요하다 — 검색 범위 결함(놓침)과 통계 왜곡(생성물 혼입)을 기계적으로 차단한다.

---

## 10. 제한 사항 → **READY_WITH_LIMITATIONS** 판정 근거

1. **AST Parser 부재** — TypeScript Compiler API / Babel / Vue Parser 미설치(신규 설치 금지).
   심볼 추출은 정규식 기반이며 `symbol_confidence` 를 `MEDIUM`(심볼 발견) / `LOW`(미발견)로 기록했다.
   실제로 `Sidebar.jsx:564` 의 히트가 `handleLogout` 으로 귀속되는 등 **enclosing symbol 이 부정확한 사례**가 있다
   (선언 줄 기준 최근접 방식의 한계). 파일·라인은 정확하므로 후속 분석에 지장은 없다.
2. **Props/Events 추출 부분적** — `QuickAccessPanel` 은 8개 props 를 정상 추출했으나
   구조분해가 아닌 형태는 미추출. `events` 는 React 라 개념적으로 부재.
3. **`frontend/public/api_manuals` 975 파일 미스캔** — 생성물 근거를 기록하고 제외했다.
   생성기가 향후 즐겨찾기 문구를 포함하게 되면 재평가가 필요하다.
4. **로케일 15 파일 분리** — `noisy_summary` 로 별도 집계만 했다(UI 라벨 사전이라 구현 근거 아님).

---

## 11. 다음 Step 진행 가능 여부

**READY_WITH_LIMITATIONS**

필수 JSON 5개 + 보고서 생성, 검증 23/23 통과, 운영 코드 변경 0건.

### 11.1 ST04(Database) 를 위한 인계

- ST02(백엔드 0건) + ST03(**API 0건**) 으로 **서버측 즐겨찾기가 존재하지 않음이 양방향 확정**되었다.
- 따라서 ST04 의 결론(테이블 0건)은 사실상 확정이며, 남은 실질 작업은
  `backend/src/**` 의 `CREATE TABLE` 문자열 전수 확인 **1회**뿐이다(마이그레이션은 172 동결).

### 11.2 ★Part004-04 본 구현을 위한 확정 사실 (ST08/ST10 입력)

1. **저장 정책이 분열되어 있다** — 사이드바는 디바이스 전역 raw localStorage, 사례 북마크는 테넌트 스코프
   `tGetJSON`. **통합 시 어느 쪽을 정본으로 삼을지 결정 필요**.
   → 권장: **테넌트 스코프(`tGetJSON`) 쪽이 옳다**. 단, Part004-01 이 확인한
   `tenantStorage.js` 의 *"UI 프리퍼런스는 디바이스 단위"* 설계 주석과 충돌하므로 **정책 결정이 선행**되어야 한다.
2. **서버 영속이 전무하다** — 기기 변경 시 100% 소실. 서버화는 신규 구축이며 재사용할 백엔드 자산이 없다.
3. **접근성 결함** — `aria-pressed` 0건. 토글 상태가 스크린리더에 전달되지 않는다.
4. **리소스 타입이 2종뿐** — 메뉴 경로, 사례 ID. 채널·문서·회의 등은 Part001 에서 PLANNED 이므로
   **존재하지 않는 리소스의 즐겨찾기를 설계하지 말 것**.
5. **Key 전략** — Part004-02 가 만든 정본 `menu_key` + Alias 105건이 있으므로,
   메뉴 즐겨찾기는 경로가 아니라 `menu_key` 로 저장하면 무손실 이관이 가능하다.

### 11.3 압축 권고 (유효)

ST02+ST03 으로 **전체 그림이 이미 확정**되었다.
**ST04·ST05·ST06 을 1개 Step(서버측 부재 최종 확인)** 으로, **ST07~ST11 을 1개 Step(정규화·분류·갭분석)** 으로
통합하면 남은 8개 Step 을 **2개**로 줄이면서 품질은 동일하다. 명세대로 개별 진행도 가능하다.
