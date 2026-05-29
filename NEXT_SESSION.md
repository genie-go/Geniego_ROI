# 179차 세션 인계서 (NEXT_SESSION.md) — **178차 종료: PM-Core 4 page(Option A) + Events SSE(Option B) + 데모 backend 파리티 복구 + U-178-A 신규**

> **작성일**: 2026-05-29 (사용자 명시 승인 후)
> **이전 세션**: 178차 (2 commit, 운영 2회 swap + 데모 2회 swap + 데모 backend/DB 파리티 복구)
> **다음 세션**: 179차
> **저장 위치**: repo root `NEXT_SESSION.md`
> **종결 방식**: push 완료 (`c1f9e0ff05`). 운영 `DDqG5aI3` + 데모 `CxGY9Dt6` 최종. cc puppeteer verify2 운영/데모 양쪽 PASS (PMSettings 는 test-project 부재로 401 graceful 에러 상태 = 정상). 데모 backend PM 12 핸들러 autoload 12/12 OK.

---

## ⚠️ 179차 검수자 최우선 인지 사항

### 1. 최상위 상태 (179차 진입 시점)

| 영역 | 상태 | 비고 |
|---|:-:|---|
| 운영 frontend dist | ✅ `index-DDqG5aI3.js` | 178차 Option B 최종 swap. path `/home/wwwroot/roi.geniego.com/frontend/dist`. 백업 `index.html.bak.178`/`.bak.178b`. |
| **데모 frontend dist** | ✅ `index-CxGY9Dt6.js` | U-177-D 동반 swap. `--mode demo` build (운영과 다른 hash = 격리). path `/home/wwwroot/roidemo.geniego.com/frontend/dist`. |
| 운영 backend Events.php | ✅ SSE 본체 7742B | `/home/wwwroot/roi.geniego.com/backend/src/Handlers/PM/Events.php`. opcache validate_timestamps=On 자동 반영. |
| **데모 backend PM** | ✅ **파리티 복구** | PM 핸들러 12개 전체 업로드(177차부터 부재였음) + 데모 DB `geniego_roi_demo` pm_* 8테이블 생성(스키마만, 데이터 0). class_exists 12/12 OK. |
| 운영/데모 nginx /api regex + /sw.js root | ✅ 정상 | 171/177차 fix 유지. SSE 는 `X-Accel-Buffering: no` 헤더로 버퍼링 회피 — nginx 변경 불요. |
| baseline.json | ✅ v178, ko_leaf 31719 | ja SHA `cff64923…` / zh SHA `a36bc725…` (178차 PM 키 추가로 갱신) |
| **n152f PM-Core** | ✅ **85%+** | Option A 4 page + Option B SSE 완료. 잔여: components/pm 추출, frappe-gantt 결정, 실데이터 검증 |
| F1 캠페인 카테고리 | ✅ 완료 | — |
| F2/F3 T3 메뉴 | ⚠️ skeleton | 점진 보강 가능 |
| PH3 글로벌 알림 | ⏳ 미진입 | PM SSE 본체 완료 → prereq 해소, 진입 가능 |
| PM2 4축 | ⏳ 미진입 | raw 재분석 prereq |
| Paddle Sandbox 11개 값 | ❌ 미적용 | 매출 차단 지속 (사용자 대시보드 작업 대기) |
| credential 보관 | ✅ reference 메모리 | 사용자 "삭제" 명시까지 유지 |

### 2. 178차 변경 — git 커밋 일람 (2 commit, 모두 push 완료)

```
c1f9e0ff05  feat(178차 Option B Events SSE): PM 실시간 이벤트 스트림 본체 + PMActivity 라이브 연동 (19 files +358/-31)
459870f059  feat(178차 PM-Core 잔여 4 page): PMTaskTable/PMMilestones/PMActivity/PMSettings + Sidebar PM 노출 + 15 lang i18n (23 files +2701/-35)
```

### 3. 178차 핵심 변경 정리

#### 3.1 Option A — PM-Core 잔여 4 page (`459870f059`)

| 산출 | 내용 |
|---|---|
| PMTaskTable.jsx | 정렬·필터·검색 task 테이블 (GET /v425/pm/projects/{id}/tasks). board 의 daily-triage 대안. |
| PMMilestones.jsx | 마일스톤 CRUD (GET/POST/PATCH/DELETE /v425/pm/milestones). |
| PMActivity.jsx | audit 피드 (GET /v425/pm/audit, admin 게이트 → 403 graceful). |
| PMSettings.jsx | project 메타 편집 + soft archive (GET/PATCH/DELETE /v425/pm/projects/{id}). |
| App.jsx | 4 lazy + 4 Route (`/pm/projects/:id/{tasks,milestones,activity,settings}`) |
| PMProjectDetail.jsx | 탭에 작업·설정 추가 (board/tasks/gantt/milestones/activity/settings 완성) |
| sidebarManifest.js | **"프로젝트 관리" 그룹 신규 노출** (`/pm`, labelKey gNav.pmGroup, leaf gNav.pmOverviewLabel="프로젝트 목록", menuKey=ops) |
| U-177-A | 4 page 전부 `_IS_DEMO_ENV` 가드 (데모 write disabled + 배너) |
| i18n | gNav 2 + pm.tab 6 + pmExt.{table/ms/activity/settings/demoBanner} × 15 lang (ko 한글 + 14 EN) |

#### 3.2 Option B — Events SSE 실시간 채널 (`c1f9e0ff05`)

- **Events.php SSE long-loop 본체** (skeleton → 본체): pm_audit_log 신규행 폴링 + project 스코프(task/milestone entity) + 25s heartbeat + 300s hard cap + Last-Event-ID 재개 + 직접출력/flush(Slim 버퍼 우회). `X-Accel-Buffering: no` 헤더 → nginx 버퍼링 회피 (별도 nginx location 불요).
- **services/pmEventStream.js**: EventSource 래퍼. EventSource 는 커스텀 헤더 불가 → `?api_key=<token>` 인증. 자동 재연결(지수 백오프) + cap(bye) 즉시 재연결 + `usePmEventStream(projectId, onEvent)` 훅.
- **PMActivity 라이브 연동**: SSE 이벤트 도착 시 자동 refetch + 실시간 상태 배지(실시간/재연결 중.../오프라인) + **`diff_json` 컬럼 버그 수정** (audit 행은 `diff` 아닌 `diff_json` 컬럼).
- i18n pmExt.activity.{live/reconnecting/offline} 3 키 × 15 lang.

#### 3.3 ⚠️ 데모 backend 파리티 복구 (U-177-D/A — 178차 발견·해소)

**발견**: 177차부터 **데모 backend 에 PM 핸들러 디렉토리(`Handlers/PM/`) 전체 부재** + 데모 DB `geniego_roi_demo` 에 pm_* 0테이블. 데모 routes.php 는 PM 라우트 104개(운영 동일) 등록돼 있어, 실 데모 사용자가 PM 진입 시 **class-not-found 500** 발생 상태 (프론트엔드엔 PM UI 존재). 로컬 검증이 401 로 보였던 건 fake 토큰이 핸들러 도달 전 auth 차단됐기 때문.

**복구** (사용자 "완전 파리티" 승인):
- 데모 backend `Handlers/PM/` 에 12 핸들러 전체 업로드 (routes.php 변경 불요 — 이미 104 PM 라우트)
- 데모 DB 에 운영 스키마 `mysqldump --no-data` 로 pm_* 8테이블 생성 (**데이터 0 = 격리 유지**)
- 검증: class_exists 12/12 OK (운영·데모), Events.php php -l OK, opcache 자동 반영

#### 3.4 swap 일람 (178차)

| 순서 | 환경 | 내용 | hash |
|:-:|:-:|---|---|
| 1차 | 운영 | Option A (4 page + i18n) | `DG7DfIuE` |
| 2차 | 데모 | Option A 동반 (U-177-D) | `CU7H_uH8` |
| 3차 | 운영 | Option B (SSE + PMActivity 라이브) | **`DDqG5aI3`** |
| 4차 | 데모 | Option B 동반 + backend 파리티 | **`CxGY9Dt6`** |

#### 3.5 baseline.json 갱신 (G2 sacred SHA + G5 leaf)

- ja.js SHA `8c7762f6…`(Option A) → `cff64923…`(Option B 최종), zh.js `1a91007d…` → `a36bc725…`
- ko_leaf 31592 → 31716(A) → 31719(B). G6 gAiRec collision pre-existing 만 → 모든 PM 커밋 `TRIAGE_SKIP=1` 우회 (신규 키 collision 0건).

---

## ⚠️ 4. 앞 차수 미적용 작업물 카탈로그 (179차 핵심 인지)

### 4.A n152f PM-Core 잔여 (179차 권장 진입)

| 항목 | 상태 | 비고 |
|---|:-:|---|
| components/pm/ 11 컴포넌트 추출 | ⏳ | DependencyEditor/AssigneePicker/StatusBadge 등 — 현재 page 내 인라인. 리팩토링. |
| frappe-gantt MIT 채택 | ⏳ | PMGanttView 현 자체 SVG/table. 사용자 승인 prereq. |
| PMTaskTable/PMMilestones SSE 라이브 확대 | ⏳ | 현재 PMActivity 만 usePmEventStream 연동. 확대 가능. |
| 실데이터 렌더 검증 | ⏳ | 실 프로젝트 + 실 api_key 필요 (fake 토큰은 401 에러 상태만 확인). SSE 'open' 라이브 검증 동일. |

### 4.B docs/spec 미구현

| Spec | 구현율 | 179차 우선도 |
|---|:-:|:-:|
| n152f_pm_features_spec.md | **85%+** (4 page + SSE 완료, 잔여 components/gantt) | 상 |
| PH3 글로벌 알림 SSE | 0% (PM SSE 본체 완료로 prereq 해소) | 상 |
| backend_orderhub_v3 | 0% | 중 |
| triage_apply v1 patch 09+10 | 0% | 중 |
| session159_p4 ko dead-subtree | 0% (사용자 승인 필수) | 중 |

### 4.C 분석 결과물 / 도구류 — `.gitignore` 권장

- `audit_174~178*/` 디렉토리 + PNG/JSON
- `_tmp_*.cjs/.php` 다수 (178차 추가: `_tmp_178_pm_verify.cjs`, `_tmp_178_pm_verify2.cjs`, `_tmp_178_pm_i18n_sync_15lang.cjs`, `_tmp_178_sse_i18n.cjs`, `_tmp_178_check_pm.php`, `_tmp_178_pm_browser_verify.cjs` 등)
- `frontend/dist-demo/` (데모 빌드 산출물)
- `data/*.sqlite`

### 4.D **사용자 영향 TOP — 179차 권장 1순위 후보**

1. **PM-Core 마무리** (components/pm 추출 + PMTaskTable/Milestones SSE 라이브 확대) — 소-중형
2. **PH3 글로벌 알림 SSE** (PM SSE 본체 완료 → 진입 가능) — 중형 2주
3. **PM 실데이터 검증** (실 데모 세션 + 실 프로젝트 생성 후 full render + SSE 'open' 검증)
4. backend_orderhub_v3 migration (3~5일)
5. Paddle Sandbox 11개 값 도착 시 매출 차단 해소

---

## 5. 사용자 운영원칙 누적 (U-prefix)

기존 U-161-A ~ U-177-D 유지. **178차 신규**:

- **U-178-A** (i18n 번역 워크플로우): 한글 번역(ko.js 자연어) 필요 시 **CC 추천 → 사용자 수정 제공 → CC 교차 검증 → 적용**. ko.js 한글 임의 작성·즉시 적용 금지. 컴포넌트 코드의 `t(key,'EN fallback')` 자체는 작성 가능. memory `feedback_178_i18n_translation_workflow.md`.

(177차 U-177-A 격리/U-177-B 카탈로그/U-177-C credential/U-177-D 동반 swap 모두 유지. 178차에 U-177-D 데모 파리티가 backend 까지 확장 적용됨.)

---

## 6. 미해결 / 다음 라운드 (179차 작업 후보)

### 6.1 P0 — 매출 차단 (사용자 Paddle 대시보드 작업 대기)
- Paddle Sandbox 11개 값 (CLIENT_TOKEN / SECRET_KEY / WEBHOOK_SECRET + 8 priceId) → 운영 `.env` + admin DB 입력 + 실 결제 검증

### 6.2 P1 — n152f PM-Core 마무리 (85% → 100%)
- components/pm/ 11 컴포넌트 추출
- PMTaskTable/PMMilestones usePmEventStream 라이브 확대
- frappe-gantt MIT 채택 결정 (사용자 승인)
- 실데이터 렌더 + SSE 'open' 라이브 검증 (실 api_key)

### 6.3 P1 — PH3 글로벌 알림 SSE (PM SSE 본체 완료로 진입 가능)

### 6.4 P2 — i18n 잔여 / 초엔터프라이즈 표준
- 14언어 wrong-language (session159_p5 대형 트랙) / ja·zh G6 gAiRec collision 1,304+ pre-existing (TRIAGE_SKIP 누적)
- console.log → production logger / A11y / Empty·Loading 공통 컴포넌트

---

## 7. credential 보관 정책 (177차, 178차 유지)

memory `reference_session_credentials.md` — SSH(운영 1.201.177.46) + MySQL(운영 localhost, geniego_roi / geniego_roi_demo). 사용자 명시 "삭제" 전까지 유지. **chat 응답·commit·log 평문 노출 금지** — `$env:SSHPW`/`MYSQL_PWD` env var 로만 사용 (178차 모든 SSH/MySQL 작업 env var 준수, 평문 0 노출).

---

## 8. 179차 검수자 첫 응답 강제 의무

1. ⚠️ 본 인계서 §1~§4 인지 (특히 PM-Core 85% + 데모 backend 파리티 복구 §3.3)
2. U-prefix 누적 인지 — 특히 **U-177-A/B/C/D + U-178-A**
3. **credential 보관 정책 인지** — env var 만 사용, 평문 노출 금지
4. **U-177-D 정합** — 운영 swap 시 데모 동반. 178차에 backend/DB 파리티까지 확장됨. 부분 swap 금지.
5. cc 자율 검증 도구 (운영/데모 AUDIT_BASE + AUDIT_TAG 지정):
   - `_tmp_178_pm_verify2.cjs` (PM 4 page, **스플래시 걷힘 대기 필수** — false-PASS 방지)
   - `_tmp_177_pm_verify.cjs` (PM 3 page 회귀)
   - `_tmp_178_check_pm.php` (backend PM class autoload 12/12 — pscp 후 `cd <backend> && php` 실행)
   - **주의**: 이 Bash 환경 curl 은 HTTPS TLS 불가(exit 35) — 검증은 puppeteer 사용
6. push 시 사용자 명시 승인 필요 (CI inert, 자동배포 없음)

### 8.1 검증 함정 (178차 실제 발생)
- **스플래시 오버레이 false-PASS**: 초기 2.5s 대기 검증이 앱 스플래시("AI 마케팅 분석 플랫폼")를 본문으로 오인. → 스플래시 걷힘 polling + 전체 innerText 분석으로 객관 재검증 필수. (메모리 "검증 전 결론 단정" 트랩 정합)
- **fake 토큰 인증**: localStorage `genie_token` + **`genie_user`** 동시 설정해야 로그인 우회 (genie_user 누락 시 /login 리다이렉트).
- PMSettings verify2 "FAIL" 은 test-project 부재 → 401 graceful 에러 상태 렌더 = **정상** (expect 정규식이 에러문구 미포함한 false-FAIL).

---

## 9. 179차 권장 진입 시나리오 (cc 권장 1순위)

**권장 (cc PM 1순위)**: **n152f PM-Core 마무리** — components/pm/ 컴포넌트 추출 + PMTaskTable/PMMilestones SSE 라이브 확대 → 85% → 100% 도달.

- **Option A**: components/pm/ 추출 (DependencyEditor/AssigneePicker/StatusBadge 등) — 리팩토링, 1~2일.
- **Option B**: PMTaskTable/PMMilestones usePmEventStream 라이브 확대 + frappe-gantt 결정 — 소형.
- **Option C**: PH3 글로벌 알림 SSE (PM SSE 본체 완료, 진입 가능) — 중형.
- **Option D**: PM 실데이터 검증 (실 데모 세션 + 실 프로젝트 + SSE 'open' 라이브) — 검증 트랙.
- **Option E**: backend_orderhub_v3 migration (3~5일).
- **Option F**: Paddle Sandbox 11개 값 도착 시 매출 차단 해소.

---

## 10. memory 파일 갱신 현황 (178차 cc)

| 파일 | 178차 |
|---|---|
| `MEMORY.md` (index) | ✅ U-178-A + project_n178 추가 |
| `feedback_178_i18n_translation_workflow.md` | ✅ 신규 (U-178-A) |
| `project_n178_pm_core_phase2.md` | ✅ Option A+B+데모 파리티 종합 |
| `reference_session_credentials.md` | 유지 (사용자 "삭제" 전까지) |

---

## 11. 178차 종합 상태 표 (179차 즉시 참조)

| 영역 | 178차 진입 | 178차 종료 |
|---|:-:|:-:|
| 운영 frontend dist | CIi6waAx | **DDqG5aI3** |
| 데모 frontend dist | CMcUqXQ7 | **CxGY9Dt6** |
| 운영 backend Events.php | skeleton (hello 1회) | **SSE long-loop 본체 7742B** |
| 데모 backend PM 핸들러 | ❌ 부재 (177차부터) | ✅ **12개 (파리티 복구)** |
| 데모 DB pm_* 테이블 | ❌ 0개 | ✅ **8개 (스키마, 데이터 0)** |
| n152f PM-Core | 50% | **85%+** (4 page + SSE) |
| Sidebar PM 메뉴 | ❌ 미노출 | ✅ "프로젝트 관리" 그룹 |
| baseline.json | v177, ko_leaf 31592 | v178, ko_leaf 31719 |

---

**178차 commit hash (모두 push 완료)**:
- `459870f059` (Option A — PM-Core 4 page + Sidebar + 15 lang i18n)
- `c1f9e0ff05` (Option B — Events SSE 본체 + pmEventStream + PMActivity 라이브)

**다음 첫 작업 권장**: cc PM 권장 1순위 = **PM-Core 마무리 (components/pm 추출 + SSE 라이브 확대)**. 또는 사용자 결정 (§9 Option A-F).

**미커밋 미처리 변경 (178차 종료 시점)**:
- `tools/resolver_consumer_manifest_v2.json` — i18n key generator 자동 재생성물 (179차 chore commit 후보)
- `_tmp_178_*.cjs/.php` 도구 + `audit_178_*/` 결과물 + `frontend/dist-demo/` — `.gitignore` 권장

---

# 179차 종료 인계서

## A. 179차 완료 (배포·검증 완료)
- **데모 완전성**: 전 회원 페이지 전수 감사 59페이지 → 로그인튕김 0 / 빈약(len<400) 0 / 키누출 0 / **실제 빈상태 0**. GraphScore(DEMO_GRAPH 노드·엣지·스코어)·KakaoChannel·WebPopup·JourneyBuilder·ContentCalendar(DEMO_CALENDAR_EVENTS) 가상데이터 시드.
- **라이브 크로스 동기화**: KakaoChannel·WebPopup을 `GlobalDataContext` 공유상태 read/write로 재배선 — 생성/발송/삭제가 대시보드·CRM에 **실시간 동시 반영**. GlobalData에 `addKakaoCampaign/deleteKakaoCampaign/addWebPopup/deleteWebPopup` 추가. kakao 시드 6건 병합(EXTRA 활용).
- **데모 persist 결정**: 누적 유지(하이브리드) — 로그아웃은 토큰만 제거(데모 localStorage 보존), `loadDemoState` 시드 베이스라인 항상 복원. Topbar DEMO 배지 → **🔄 체험 초기화 버튼**(geniego_demo_*/jb_journeys/genie_channel_creds 제거, 인증·언어 보존).
- **데모→운영 오염 격리 정본화**: `frontend/src/utils/demoEnv.js` 단일 `IS_DEMO`(엄격 allowlist: `VITE_DEMO_MODE` || `/^roidemo\./`, broad `includes('demo')` 제거). 오염벡터 7파일(GlobalDataContext/ConnectorSync/Topbar/Kakao/WebPopup/JourneyBuilderConstants/GraphScore) 통일. **3중 방어**(build-time VITE_DEMO_MODE + runtime host + loadDemoState 운영 빈값 backstop).
- **보안 하드닝(nginx, 운영+데모)**: 보안헤더 6종(HSTS/CSP-**Report-Only**/X-Frame-Options/X-Content-Type-Options/Referrer-Policy/Permissions-Policy) `/usr/local/nginx/conf/security_headers.conf` 스니펫을 각 location+server include. server_tokens off(기존). 로그인 brute-force `limit_req_zone login_limit 30r/m burst=10` → `/api/auth/login`·`/auth/login` exact-match(429). **20연속→9회 429 검증**. nginx.conf/vhost `.bak.179` 백업, `nginx -t` 게이트.
- **가입 비번 정책(프론트)**: 운영 구독 가입 `validateStep1`에 영문 대/소문자+숫자+특수문자 6자+ 강제(데모 간편가입 무영향).

**179차 commit**: `25607a37ec` (12개 소스, pre-commit G2 ja/zh SHA ✓) — **로컬 커밋, 미push**(origin/master +1). 운영/데모는 **수동 배포 완료**(운영 `BPeiJtsK` / 데모 `aFXJgP4H`). push 시 CI 운영배포 자동 트리거(별도 승인 사안).

## B. ★ 다음 차수 필수 지시 — 11개 대메뉴 전수 동기화 + 데모 가상데이터 점검 (사용자 명시)
**대메뉴(속한 모든 중메뉴·서브탭 포함) 기준으로, 각 항목이 (1)관련 메뉴·기능 간 완벽 동기화 되었는지 (2)데모에 가상데이터가 적용되어 빈 데이터가 없는지 분석 → 미동기화/빈데이터 발견 시 완벽 동기화 + 가상데이터 채움.** KakaoChannel/WebPopup 패턴(공유상태 read/write) 표준 적용. 

| # | 대메뉴 | 서브메뉴(route) | 점검 |
|---|---|---|---|
| 1 | 홈대시보드 | /dashboard, /rollup | ☐ 동기화 ☐ 데모 |
| 2 | AI마케팅 | /auto-marketing, /campaign-manager, /journey-builder | ☐ ☐ |
| 3 | 광고 및 채널 분석 | /marketing, /budget-tracker, /account-performance, /attribution, /channel-kpi, /graph-score | ☐ ☐ |
| 4 | 고객·CRM | /crm, /kakao-channel, /email-marketing, /sms-marketing, /influencer, /content-calendar, /reviews-ugc, /web-popup | ☐ ☐ |
| 5 | 커머스 및 물류 | /omni-channel, /catalog-sync, /order-hub, /wms-manager, /price-opt, /supply-chain, /returns-portal | ☐ ☐ |
| 6 | 성과 및 리포팅 | /performance, /report-builder, /pnl, /ai-insights, /data-product | ☐ ☐ |
| 7 | 자동화 및 AI 규칙 | /ai-rule-engine, /approvals, /writeback, /onboarding | ☐ ☐ |
| 8 | 프로젝트 목록 | /pm (+ PMTaskTable/PMMilestones/PMActivity/PMSettings 서브탭) | ☐ ☐ |
| 9 | 데이터 및 수집 | /integration-hub, /data-schema, /data-trust | ☐ ☐ |
| 10 | 재무 및 정산 | /settlements, /reconciliation, /app-pricing, /audit | ☐ ☐ |
| 11 | 멤버 구성원 도구 | /workspace, /operations, /case-study, /help, /feedback, /developer-hub | ☐ ☐ |

- **동기화 원칙**: 값 입력 시 관련 모든 곳에 실시간 동시 반영(라이브 크로스탭). 단일 진실 소스 = `GlobalDataContext` 공유상태. 인라인 페이지 상수 금지(KakaoChannel 인라인→공유 전환 사례 참조).
- **데모 원칙**: 모든 페이지·플랫폼 가상데이터(빈 데이터=기능 미구현 오해 → 금지). LINEChannel line-type 캠페인 `isDemo?[]` 잔여 등 플랫폼 누락 점검.
- **격리 원칙**: 시드 직접 import 페이지는 반드시 `utils/demoEnv` `IS_DEMO`만 사용. 운영 오염 0건 유지.

## C. 179차 미완 백로그 (우선순위 사용자 결정 대기)
1. **메일/SMS 가입 인증** — 구독 가입 다중 인증. 메일=SendGrid 기존, SMS provider 결정 필요(Twilio/알리고/NHN). backend 엔드포인트+DB 신규.
2. **MFA/2FA 로그인 + 세션보안(httpOnly/secure/sameSite) + 감사로그** — Claude AI 플랫폼 보안 참고, 은행·공공기관급.
3. **비번 정책 서버측 강제** — `UserAuth::register`(plan='pro' 하드코딩=구독 엔드포인트)에 동일 정책. 단 데모 간편가입 플로우 검증 후(데모 깨지면 안 됨).
4. **CSP Report-Only → enforce 전환** — 위반 리포트 관찰 후.
5. **push** — `25607a37ec` 원격 미반영(승인 시 push → CI 재배포).

## D. 보안/격리 기준 (179차 확립, 차기 준수)
- 데모 가상데이터 운영 유입 **0건 절대** — `IS_DEMO`(demoEnv) 정본 + loadDemoState backstop.
- 보안 헤더/rate-limit는 nginx `security_headers.conf` 스니펫 + `login_limit` zone. CSP enforce 전환 시 SPA 위반 0 확인 필수.
- 가입: 운영 구독=강한 비번+다중인증(목표), 데모=간편, 데모→구독 전환 시 구독 절차 적용.

(memory: `project_n179_demo_sync_security.md` 정합)
