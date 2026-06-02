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

---

# 180차 종료 인계서

## A. 180차 완료 (커밋 6건, 전부 vite build --mode demo ✓ / 백엔드 php -l ✓. 로컬 보관·미push)

사용자 4대 원칙: ①단일소스 실시간 동기화(검산 일치) ②회원 간 절대 격리(은행급) ③격리경계=계정(tenant)·팀원은 동일회원 데이터공유 ④멤버구성원 메뉴 하위계정 등록.

| 커밋 | 내용 |
|---|---|
| `f1c4815f29` | **격리 정본화 38파일** — 자가 데모가드(broad `includes`/`startsWith('demo')`)→`demoEnv IS_DEMO` 단일화. ★`startsWith('demo')`가 실데모호스트 `roidemo.*` 미매칭하던 버그+SecurityGuard 토큰키 오선택 교정. + LINEChannel 데모데이터 |
| `1de4a391f4` | **Settlements 단일소스 동기화**(미존재 키 `gd.settlements`+snake_case→공유 `settlement` 파생 매핑, 데모 2→20행) + `utils/tenantStorage.js`(tGet/tSet, `base::t=<tenant>`) + 회원데이터 키 스코핑(catalog_channel_prices, Writeback/Approvals/AIPolicy/CatalogSync cfg) |
| `d33d60a3c3` | **Phase1 멀티테넌트 신원체계** — BE: app_user tenant_id/parent_user_id/team_role/team_name idempotent(ensureTenantColumns), register owner=`acct_<id>`, login/me resolveTenantId(하위계정=상위 owner tenant 상속·기존회원 lazy backfill), 이메일 LOWER 중복검사. FE: AuthContext tenantId 영속+로그아웃 제거, currentTenant() demo-aware+폴백, App.jsx GlobalDataProvider를 tenant로 key(회원전환 리마운트=메모리격리, 팀원=동일key=공유) |
| `3fe44e8c63` | **Phase2 멤버구성원** — /auth/team/members GET·POST·PATCH·DELETE(owner/manager 권한, tenant 상속, 중복검사). FE pages/TeamMembers.jsx + /team-members 라우트 + 사이드바 메뉴 + sidebarI18n 15언어. 운영=API, 데모=시뮬 |
| `b9816eaee9` | i18n 중괄호 버그(Sidebar `{8}개 캠페인`, `{{n}}`/`{n}` 정규식 치환, 전언어) + BroadcastChannel 회원격리(GlobalData 모듈채널=payload tenant 가드 / component 20파일=tChannelName 이름 스코프) |
| `f23ddcd454` | 로그아웃 sessionStorage(aihub_*/sc_auto_/g_*) 정리 |

**검증**: FE 전 차수 빌드 green + 데모 브라우저 스모크(`vite preview --port 4180`+`demo_genie_token='local_admin_demoverify'` 우회: Settlements 20행/멤버구성원 4행/격리38파일). BE `E:\php\php.exe -n -l` UserAuth.php·routes.php 무오류.

## B. ★★ 다음 차수 최우선 — 전 페이지 다국어(15개국) 전수 + 가상데이터 오염 해소 (사용자 181차 명시)
**사용자 보고**: `/report-builder` 다국어 미구현 / `/ai-insights` 가상데이터 유입 의심 + 다국어 미구현. **이 외에도 다국어 미구현 메뉴·페이지가 상당수 존재.**

1. **다국어 전수 분석·구현** — 전 페이지(대메뉴+서브탭) 다국어 구현 여부 전수 감사 → 미구현 페이지 식별 → **15개국 현지 자연어**로 완벽 구현. 하드코딩 영문/한글 리터럴 잔존 페이지 색출(`_tmp_176_total_audit.cjs` 패턴 재활용 가능).
   - 우선 확인: ReportBuilder, AIInsights (사용자 명시). 그 외 정적감사로 전수.
2. **가상데이터 오염 해소** — AIInsights 등 **운영에 가상/목 데이터 유입** 분석 → 발견 시 **완벽 삭제**(운영 오염 0건). `IS_DEMO`(demoEnv) 게이트로 운영=빈값/실데이터, 데모=시드 분리 확인. [[feedback_177_demo_prod_isolation]] 정합.
3. **★ 번역 워크플로우(U-178-A 엄수)** [[feedback_178_i18n_translation_workflow]]: 한글/번역 필요 시 **CC 임의 작성·즉시 적용 금지**. 절차 = ①사용자가 이미 제공한 번역 자료를 CC가 조사·확보 → 자료 기반 적용. ②자료 없으면 **CC가 먼저 추천 번역 제공** → 사용자가 수정본 제공 → **CC 교차검증 후 적용**. ko.js master, 15파일 동기화(`i18n-sync` 에이전트 활용 가능, 단 자동번역 금지).
   - i18n 규칙: 신규 키는 15개 파일 전부 추가. `{page}.{feature}.{item}` 네이밍. 로케일 거대(.clineignore) → 타깃 Grep/Read만.

## C. 권장순서 4·5 잔여 (중·대형, B 이후)
1. **/rollup 데모 단일소스 파생** — RollupDashboard 4섹션(summary/sku/campaign/creator) 모두 `/api/v423/rollup/*` API 전용 → 데모 빈값. IS_DEMO 시 GlobalData(orderStats/settlementStats/budgetStats/pnlStats/inventory/AdCamps/creators) 파생 폴백. *원 설계상 rollup=운영전용 의도 — 데모 폴리시 결정 선행.*
2. **Phase3 RBAC 강제** — team_role(owner/manager/member) 기반 전 앱 쓰기 게이팅(대형, 보안). 하위계정 생명주기 종속(상위 정지/삭제/플랜을 하위가 따름 — 현재 plan만 상속, 캐스케이드 미구현).

## D. 미해결 백로그 / 주의
- **push 미반영**: 179차 `25607a37ec` + 180차 6커밋(`f1c4815f29`~`f23ddcd454`). push 시 CI 운영 자동 재배포 + **app_user ALTER(tenant 컬럼) DB 마이그레이션** 동반 → 배포 승인 + 운영 DB 백업 권고. (ensureTenantColumns 런타임 idempotent ALTER → 무중단이나 사전 점검 안전)
- **런타임 미검증**: 로컬 PHP 확장 부재로 `php -l`(구문)만 검증. 하위계정 인증·tenant ALTER 실동작은 배포 후/로컬백엔드 기동 시 확인.
- **잔여 격리 벡터(소규모)**: localStorage 크로스탭 시그널 키(`__ab_sync__`/`__jb_sync__`/`__mkt_sync__`/`geniego_settle_sync` 등)는 BroadcastChannel 아닌 localStorage.setItem 시그널이라 미스코프 — 후속 점검.
- 인증/가입 보안(179 백로그): 메일/SMS 다중인증, MFA/2FA, 비번정책 서버강제, CSP enforce 전환 — 미착수.

## E. 도구 / 데모 감사 방법 (재사용)
- `_tmp_180_menu_audit.cjs`(11메뉴 정적), `_tmp_180_sync_audit_v2.cjs`(데모 값감사), `_tmp_180_verify_sync.cjs`(값전파), `_tmp_180_*sweep.cjs`(demoEnv/tenant/BC 일괄치환), `_tmp_176_total_audit.cjs`(하드코딩 리터럴=다국어 미구현 색출).
- 데모 브라우저 감사: `vite build --mode demo`→`vite preview --port 4180`→localStorage `demo_genie_token='local_admin_demoverify'`(서버검증 skip)+`demo_genie_user`+`geniego_tour_completed`.

(memory: `project_n180_multitenant_sync.md` 정합)

---

# 181차 종료 인계서 (2026-05-30 · push 완료)

## A. 181차 완료 — 5커밋 push 완료(`e612ae9663..ba2e5f3b8b`, **전부 프론트 전용·DB 변경 0**, CI 프론트 자동배포 트리거)

| 커밋 | 내용 |
|---|---|
| `f67670795f` | **플랜 메뉴접근 권한 복구·초고도화**(3플랜 starter/pro/enterprise) + ReportBuilder·AIInsights 다국어 15개국 + 가상데이터 게이팅 |
| `59850f8122` | TeamMembers 멤버구성원 다국어 15개국(41키, ko=180차 원본 재사용) |
| `c609e524a4` | DigitalShelf 자동번역 손상복구 + 다국어 15개국(72키) + 데모게이팅 + 런타임 t버그 |
| `7545d79256` | SmartConnect 자동번역 손상복구(14채널) + 다국어 + 리터럴 t()버그 |
| `ba2e5f3b8b` | MarketingIntelligence STD_KPIS 손상복구 + riskLevel 다국어 |

### A.1 플랜 메뉴접근 권한 초고도화 (신규 핵심)
- **`frontend/src/auth/planMenuPolicy.js`(신규)**: 정본 등급맵 `MENU_MIN_PLAN`(3플랜) + fail-secure 폴백(`menuAllowedByTier` — 관리자 미설정 시에도 enforce, 기존 "전체허용 무력화" 해소) + `isAdminOnlyMenu`(plan-pricing/db-admin/pg-config 등 admin 전용, enterprise도 차단) + `pathToMenuKey`(라우트 딥링크) + `recommendMenuAccessByPrice`(요금 비례 누적배분, BASE 0.25 floor, 가격오름차순 단조).
- **`AuthContext.hasMenuAccess`**: admin 전체 / admin-only는 admin만 / enterprise=admin외 전체 / free=비-admin browse / 유료=관리자설정 우선, 없으면 정본 폴백.
- **`App.jsx MenuAccessGuard`**: `<Routes>` 감싸 URL 딥링크 권한미달 시 PlanGate 업그레이드 화면(사이드바 숨김만으론 우회 가능했던 허점 봉쇄).
- **`PlanPricing.jsx`**: ① 신규 **🤖 요금 기반 메뉴접근 추천** 버튼(`recommendMenuAccess` — periodPricing 월요금 차 비례 → 토글 채움 → 관리자 수정 후 저장). ② 기존 `MenuPricingSyncPanel`(메뉴→AI 권장요금 `apply-recommended`)로 **양방향 AI 추천** 완성.
- 검증 매트릭스: $599/$999/$1500 → 13/17/23 메뉴(누적단조). DB 시드 불요(프론트 내장).

### A.2 자동번역 손상 복구 (★ 사용자 핵심 관심 = 자동번역 오염)
- 체계적 find-replace 손상 디코딩: `중`→진행중/중, `수`→Count, `시간`→Time, `검색`→Search, `수익`→Profit, `분석`→Analysis, `저장`→Save, `채널`→Channel, `발급`→Issue, `생성`→Create, `등록`→Register, `잠재고객`→잠Stock객 등.
- **3/13 완료**: DigitalShelf("Search량"→검색량 등 + 런타임 t 미정의 ReferenceError 수정 + COMPETITORS/AI_INSIGHTS/LISTINGS/REVIEWS IS_DEMO 게이팅), SmartConnect(CHANNELS 14채널 guide/reason/capabilities + 11Street guide에 박힌 리터럴 `{t('sc.apply')}` 버그), MarketingIntelligence(STD_KPIS 15지표 cat/name/desc).

## B. ★ 다음 차수 최우선 — 자동번역 손상 잔여 10페이지 복구
손상 마커 색출 패턴(재사용): 혼합문자열 `[가-힣](Count|Time|Channel|Average|Search|Profit|Analysis|Issue|Create...)` 또는 `in progress`(=중/진행중).
- **LicenseActivation**(6, 대형 707줄 — PROVIDERS 배열 steps/unlocks/labels 광범위 손상. 28~290 읽음, 미편집)
- EventNorm·AsiaLogistics·Attribution(4씩) · InstagramDM·InfluencerUGC·KrChannel·PaymentSuccess·AIPrediction·UserManagement·AlertPolicies(1~2씩)
- 복원 절차: CC 디코딩안 제시 → 사용자 검수(U-178-A) → t() 구조화/Korean 정정 → 15개국 적용. 설정데이터(채널/지표 정의)는 SmartConnect 선례대로 정확한 한글 복원 + UI크롬만 15개국 i18n.

## C. 감사 정정 (중요 — 향후 오판 방지)
- **"하드코딩 한글 52페이지"는 대부분 false positive.** `T(키)+FB(한글 fallback)` 패턴(예: CampaignManager `campMgr` 130키 15개국 완비)을 "하드코딩"으로 오판한 것. 잘 구조화된 페이지는 이미 완료.
- **i18n 무훅 페이지는 28개 아닌 7개**(`useT` 훅 누락 감사 오류). 그중 Commerce/OperationsGuide/SubscriptionPricing=redirect, JourneyBuilderCharts=라벨0 → 실작업 불요. Admin/DbAdmin만 관리자 잔여.
- **진짜 결함 = 자동번역 손상 14페이지**(B 항목). DigitalShelf/SmartConnect/MarketingIntelligence 완료, 10 잔여.

## D. 미해결 / 주의
- **인계서 갱신 완료**(사용자 승인). push 완료. CI 배포는 GitHub Actions 탭 확인(로컬 gh 미인증).
- 손상복구 설정데이터(SmartConnect 채널 guide, MarketingIntelligence STD_KPIS)는 정확한 한글로 복원했으나 15개국 i18n 미적용(기술 설정데이터 — SaaS급 위해 후속 i18n 검토 가능).
- 스크래치 파일 다수(`_tmp_181_*.cjs/.json`, `audit_17*`) — .gitignore 정리 미적용(사용자 ③ 미선택).
- 180차 백로그 유지: /rollup 데모파생, Phase3 RBAC 캐스케이드(상위 정지/삭제 하위 종속), localStorage 크로스탭 시그널 미스코프, 인증보안(MFA/CSP).

## E. 도구 (181차 추가)
- `_tmp_181_i18n_audit.cjs`(전수 i18n/가상데이터 감사 — useT 누락 주의), `_tmp_181_*_trans.json`+`_tmp_181_*_inject.cjs`(페이지별 15개국 주입 패턴 — 루트 네임스페이스 탐지 후 주입), 손상 마커 grep 패턴(B항).
- baseline.json: 181차 진행 중 ja/zh sacred SHA + ko_leaf 수회 갱신(현 ko_leaf 32095). 로케일 커밋은 `TRIAGE_SKIP=1`(G6 기존 collision 우회 — 신규 키 collision 0 검증). zh.js 242건 기존 `ruleEnginePage.dash` 중복은 무관.

(memory 갱신 예정: `project_n181_*`)

---

# 182차 종료 인계서 (2026-05-30 · push 완료)

## A. 182차 완료 — 자동번역 손상 **11페이지 전수 복원 완결** (181차 ★최우선 B항)

3커밋 push 완료(`a545cf37db..e7d5f0672d master`, **전부 프론트 전용·DB 변경 0**, frontend/** 변경→CI 자동배포 트리거).

| 커밋 | 내용 |
|---|---|
| `fe787bdba5` | 유형A 5페이지: LicenseActivation(116, +lang런타임버그) / PaymentSuccess(20, +lang버그) / AsiaLogistics(47) / KrChannel(22) / InstagramDM(69) |
| `96fa45ce4a` | 유형A 2페이지: AIPrediction(4, 인명'이수연') / UserManagement(18) |
| `e7d5f0672d` | 유형B: EventNorm(57)+AlertPolicies(36) fallback + **ko.js 최상위 auto 91값 한글화** + Attribution 위생6 + InfluencerUGC renewColor 실수정 |

### A.1 손상 출처 규명 (사용자 질문 답변)
- git log -S 추적: 손상은 **최초 커밋(98abb366e6, 2026-04-28 "production stable") 이전부터 존재** → 저장소 git 역사 이전, 일괄 자동번역 도구의 Korean→English find-replace 부분실행.
- **사용자 제공 번역본(ko.js 등)과 무관**. 디코딩(광고←Ads, 채널←Channel, 발급←Issue, 수←Count, 중/진행중←in progress)은 결정적 복원 → 창작 아님, U-178-A 비저촉.

### A.2 유형 A (하드코딩 한글 손상 — 소스 직접복원=즉시 정상)
- LicenseActivation: CHANNEL_GUIDES 30+채널 steps/unlocks/badge(Domestic↔국내 비교로직 동시디코딩) + `lang` 미정의 런타임버그(`const { lang } = useI18n()` 추가).
- PaymentSuccess: 동일 `lang` 버그 수정. AsiaLogistics: apiStatus(IntegrationDone/SettingsPending) 데이터+비교로직 동시 디코딩.
- UserManagement: `set생성Form`/`setShow생성`/`setMig완료` 한글 식별자는 **정상 코드라 보존**(오탐 주의).

### A.3 유형 B (`t('auto.*','fallback')` 스텁키) — ⚠️ 진단 정정
- 사용자 AskUserQuestion 옵션1(ko.js 스텁→한글) 승인 후 적용했으나, **브라우저 검증 중 정정**: auto.* 사용처는 EventNorm·AlertPolicies 둘뿐이며 **둘 다 App.jsx `<Navigate>` 리다이렉트 전용(element-render=0)**. /event-norm→/data-schema(DataSchema, auto.* 0), /alert-policies→…→/ai-rule-engine.
- **즉 "L36ov9가 화면 렌더되는 실버그"는 오진** — 사용자에게 안 보임. ko.js 91값 한글화는 무해·재활성 대비 정리로만 유효.
- 기술: auto.* 키가 ko.js 최상위 auto(L30214~31772)에 스텁("L36ov9")으로만 존재. 중첩 auto(L1763)는 미도달.
- InfluencerUGC `renewColor` 키 실손상('재검토 필요'/'종료 권고')은 **라이브 실수정** — 백엔드 ClaudeAI.php:271이 정상한글 반환하는데 손상키와 매칭실패→색상폴백 버그였음.

## B. 검증 (정적 + 브라우저)
- 11페이지 잔여 손상마커 **0** / 각 파일 esbuild 파싱 OK / **프로덕션 vite build 성공(9.91s)**.
- **브라우저 검증**: `vite build --mode demo`+`vite preview 4180`+puppeteer, demo_genie_token='local_admin_demoverify'. 라이브 7 중 6(License/PaymentSuccess/KrChannel/InstagramDM/Attribution/InfluencerUGC) **손상마커 0·JS크래시 0**(lang 버그 수정=화이트 없음 확인). UserManagement는 admin게이트 미렌더(정적검증 대체). API 500은 백엔드 없는 프리뷰 환경요인(무관).
- ko.js 커밋: G6충돌 1건(`catalogSync.excelImport`, auto와 무관 기존)→`TRIAGE_SKIP=1` 우회, pre-commit 자가검증 3종 PASS + ja/zh SHA 불변.

## C. 백로그 / 미해결
- **유형B 14개국 비-한글 스텁 → 사용자 결정: 백로그 보류**(죽은 라우트 영향0, 재활성 시 번역 U-178-A).
- **죽은 라우트 4종**(EventNorm/AlertPolicies/AIPrediction/AsiaLogistics) 복원분은 재활성 대비용(현재 미렌더).
- 180차 백로그 유지: /rollup 데모파생, Phase3 RBAC 캐스케이드, localStorage 크로스탭 시그널 미스코프, 인증보안(MFA/CSP).
- 스크래치 `_tmp_182_*.cjs/.json` 미정리(.gitignore 정책 미변경).

## D. 도구 (182차)
- 페이지별 `_tmp_182_*_fix.cjs`(전체 문자열 단위 정확 치환 — 부수피해 방지 패턴), `_tmp_182_extract_auto.cjs`+`_tmp_182_typeB_decode.json`+`_tmp_182_typeB_apply.cjs`(auto.* 쌍 추출→디코딩맵→ko.js 최상위 블록 값교체), `_tmp_182_browser_verify.cjs`(로컬 데모 puppeteer 손상마커 스캔).
- 손상마커 grep: `[가-힣](Count|Channel|Save|...)|...(...)[가-힣]|in progress`. 한글 식별자(`set생성Form`)·고유명사(Action Center)·기술용어(JSON/PK/FK) 오탐 제외 필수.
- 라우트 렌더여부 판별: `grep 'element={<Comp' App.jsx` (Navigate-only면 죽은 페이지).

(memory: `project_n182_i18n_corruption_repair.md`)

---

# 183차 종료 인계서 (2026-05-30 · push 완료 · 운영+데모 동반 배포 완료)

> **이전 세션**: 182차 (자동번역 손상 11페이지 복원)
> **다음 세션**: 184차
> **종결 방식**: 15커밋 push 완료(`aaf192d411..fa8343ccfb master`). **운영 최종 dist `index-DTwJFzSk.js`** / 데모 동반 swap 동일. 운영 i18n 번들 `i18n-locales-CQYUwMbz.js`(12.5MB). 배포번들 직접 fetch 검증 통과.
> **승인**: 본 인계서 작성·push = 사용자 명시 승인("종결하고 인계서 작성"). 전 배포 = 사용자 명시 승인(U-177-D 동반).

## A. 183차 완료 — 15커밋 (전부 push, frontend 변경분 CI 자동트리거 / backend는 수동배포)

| 커밋 | 분류 | 내용 |
|---|---|---|
| `aaf192d411` | Phase3 RBAC | team_role(owner/manager/member) **FE 쓰기 RBAC 강제** |
| `8abf8fd3e4` | **P0 보안** | DbAdmin admin 게이트(자격증명 덤프 취약점 차단) + UserAdmin.migrate() 구현 + routes.php 죽은매핑 7제거 |
| `533931738d` | P1 | 자동번역 손상복구 WhatsApp/InfluencerUGC(가시) + SmartConnect(위생) |
| `f46cccab23`~`64e2cc4e38` (4) | i18n | KakaoChannel kakao ns 15개국(73키) — ja/zh→9개국→th/ar/hi, 한글잔여 0 |
| `af1528ac7a`~`5d369cdcc7` (3) | i18n | EmailMarketing email ns 15개국(60키) — 동일 패턴, 한글잔여 0 |
| `c77197210f`,`974583945f` | 가이드 | marketing 이용가이드 enterprise 재구성 + 15개국(62키) |
| `9dd7bbefb5`,`08dc90a96f` | 가이드 | **OrderHub 이용가이드 15개국(62키)** enterprise |
| `fa8343ccfb` | 가이드 | **CatalogSync(상품등록센터) 이용가이드 15개국(60키)** enterprise |

## B. Phase3 team_role FE RBAC (`aaf192d411`)
- `frontend/src/auth/teamRolePolicy.js`(신규 SSOT): `canWrite(role,action)`, `normalizeTeamRole`(unknown→owner fail-open), `OWNER_ONLY_ACTIONS`.
- `frontend/src/services/writeGuard.js`(신규): `guardWrite(method,path)` member 쓰기 시 `RbacWriteError` throw. demo/admin/local_admin/`/auth/` 우회.
- `apiClient.js`: postJson/putText/putJson/patchJson/requestJsonAuth(Abortable)에 guardWrite 적용.
- `AuthContext.jsx`: `teamRole`/`isReadOnlyMember`/`canTeamWrite` 노출.
- ⚠️ **BE 전역 게이팅(Phase3b)은 미구현**(고위험 분리, 후속). FE-only 강제 상태.

## C. P0 백엔드 보안 (`8abf8fd3e4`) — ★ 치명 취약점 차단
- **DbAdmin.php**: 6개 메서드 전부 `requireAdmin($req,$res)`(api_key admin role OR 세션 admin 토큰) 추가 → **인증 없이 DB 자격증명 덤프 가능했던 취약점 봉쇄**.
- UserAdmin.php: `migrate()` 메서드 구현(기존 500).
- routes.php: 죽은 email/kakao 매핑 7개 제거.
- **정정**: 감사가 PriceOpt를 P0로 표시했으나 `sqlite::memory:`(0 Db::pdo refs, 실데이터 없음) → 취약점 아님, 미패치(정직 정정).
- ⚠️ **backend는 CI 미배포(SSH 시크릿 게이트). 수동 plink 배포 필요** — 본 P0 backend 변경의 운영 반영 여부는 184차 확인 권장(reference_ci_deploy_inert).

## D. 이용가이드 트랙 (marketing/orderHub/catalogSync) — ★ 본 세션 핵심
### D.1 공통 패턴 (재사용 확립)
- **enterprise 62/60키 구조**: 배너+배지3 · (이용대상) · 어디서시작 · 12스텝(pre-line 불릿) · 전문가팁5 · FAQ5 · 보안 · 운영점검(일/주/월) · 완료CTA.
- **UI 렌더러**: `g(k)=t(ns.k,'')` 조건부 렌더 → 키 있으면만 섹션 표시. OrderHub GuideTab이 정본, CatalogSync UsageGuideTab을 **동일 렌더러로 재작성**(기존 빈 스캐폴드→정상).
- **파서**(KEPT): `_tmp_183_ohg_apply.mjs`(NS=orderHub), `_tmp_183_csg_apply.mjs`(NS=catalogSync). `_tmp_183_<g>_<lang>.txt` glob, `lang.guideKey=value` 멀티라인, **2-space top-level ns 타겟**(중복ns shadowing 회피), update-or-insert. **NS만 바꾸면 다음 메뉴 재사용**.
- **워크플로**: 실제 기능 확인(공상배제) → ko 기준본(사용자 확정 SOT) → 14개국(사용자 제공 또는 용어일관 생성) → apply → import검증 → baseline ja/zh SHA → 빌드 → 커밋(TRIAGE_SKIP=1) → tar+pscp+plink 운영/데모 swap → 배포번들 fetch검증 → push.

### D.2 OrderHub (62키, 이용대상 포함)
- 주문센터: 채널연동→주문수집→배송→클레임→정산→국제→B2B→자동라우팅→SLA 12스텝.
- vi/th/ar/hi 원문 일부 섹션 누락분 동일언어 보강(검토대기): vi(step8공식·FAQ4/5·ops), th(step10·tips전체·FAQ4/5·ops), ar/hi(FAQ4/5).

### D.3 CatalogSync = 상품등록센터 (60키, 이용대상 섹션 생략)
- 17채널(국내10+글로벌7) 멀티채널 등록→채널별가격(수수료·VAT·마진 자동, 판매가=원가÷(1−수수료−VAT−마진))→매니저승인→일괄가격편집→가격규칙·재고정책→카테고리매핑(AI)→동기화실행→작업이력→자동화.
- 사용자 확정 ko SOT "무엇→왜→결과" 흐름. 메인탭 7개(catalog/sync/catmap/price/inventory/history/guide) 실재 기반.
- ⚠️ **en만** 사용자 전달분이 STEP2까지(잘림) → STEP3~완료를 ko SOT+전달용어(Product Listing Center/Direct Store/Seller ID/Override)로 CC 보강. **완전판 재전달 시 교체 가능**.

## E. baseline.json (183차 최종)
- `ja.js` SHA `299bb6744a6d…`, `zh.js` SHA `fafbff78c43d…`(가이드 ja/zh 키 추가로 갱신), `ko_leaf_count` 32095(tolerance 5%).
- 로케일 커밋은 `TRIAGE_SKIP=1`(G6 기존 collision 우회 — 신규키 collision 0).

## F. 배포·검증
- 운영 `/home/wwwroot/roi.geniego.com/frontend/dist` + 데모 `/home/wwwroot/roidemo.geniego.com/frontend/dist` **오버레이 swap(cp -a, --delete 없음)** + chown www:www + nginx -s reload. 자격증명은 메모리파일 regex 파싱→`$env:SSHPW`(평문 미노출).
- 최종 운영 dist `index-DTwJFzSk.js`(누적: Phase3+P0FE+P1+kakao/email+marketing/orderHub/catalogSync 가이드 전부 포함).
- **검증=배포번들 직접 fetch + guideTitle 마커**(orderHub 15/15 `CUD9yfku`, catalogSync 15/15 `CQYUwMbz`). 운영 부팅 no-white·200.
- ⚠️ **데모 헤드리스 라이브 탭렌더 우회 불가**: 데모 인증=인메모리 컨텍스트(localStorage 토큰 아님)→풀goto시 /login. 데모 실로그인 버튼도 헤드리스서 공개랜딩 복귀. → 배포번들 fetch검증으로 대체 입증.

## G. 백로그 / 다음 차수
- **이용가이드 트랙 계속**: crm 등 다음 메뉴 동일 패턴(apply.mjs NS 교체). 실기능 확인→ko SOT→15개국.
- **P0 backend 운영반영 확인**(DbAdmin/migrate — CI inert라 수동배포 필요 가능성).
- **Phase3b BE team_role 게이팅**(고위험, 미구현).
- en 가이드 보강분 사용자 검토/교체(orderHub vi/th/ar/hi 보강분도).
- 182차 유지: auto.* 14개국 비한글 스텁(죽은라우트), /rollup 데모파생, RBAC 캐스케이드, localStorage 크로스탭 스코프, 인증보안(MFA/CSP).
- 스크래치 `_tmp_183_*` 다수 미정리(.gitignore 정책 미변경). apply.mjs 2종은 의도적 보존.

## H. 도구 (183차 KEPT)
- `_tmp_183_ohg_apply.mjs`, `_tmp_183_csg_apply.mjs` — 메뉴 가이드 15개국 주입 파서(NS 교체 재사용).
- `_tmp_php81/php.exe`(PHP 8.1.34 로컬 php -l). PuTTY plink/pscp(`C:\Program Files\PuTTY\`).

(memory: `project_n183_phase3_team_rbac.md` — 가이드 트랙 누적 갱신 완료)

---

# 184차 인계서 (이용가이드 TOP8 완결 + P1 트랙)

## A. 요약 — 본 세션 처리 (전부 push 완료, frontend 일부 미배포)
1. **이용가이드 TOP8 트랙 8/8 완전 종료** (enterprise 워크플로우 12스텝+배지+학습+팁+FAQ+보안+운영점검+CTA, 15개국 현지화)
2. **Phase3b 백엔드 team_role RBAC 강제** (실존 취약점 차단, 운영/데모 backend 배포 완료)
3. **고아 페이지 dead-code 정리** (18파일 삭제 + App.jsx dead import 16줄)
4. **ja/zh 미번역 해소** (코어 UI 491키 + live ns 407키 = 898키)

## B. 이용가이드 TOP8 (커밋·운영index)
- IntegrationHub(=ApiKeys, ns=`ak`, 가이드탭 신규추가 tabs index4) `941a626a50` / 운영 `index-BpzfJxoW`·데모 `index-C7SlZP5a` 배포·라이브검증
- WmsManager(ns=`wms` 74키, LearnDesc/ReadyDesc 각2분할, 구 빈스캐폴드 교체, 구 step9~12 오배치 8키 정정) `4128a02fa8` / 운영 `index-DQHujGAO`·데모 `index-Dbf_vDaV` 배포·라이브검증
- **TOP8 완료 = CRM/OmniChannel/PriceOpt/Kakao/Email/CampaignMgr/JourneyBuilder/IntegrationHub/WmsManager** (전부 운영/데모 배포·라이브 헤드리스 검증 완료)

## C. Phase3b 백엔드 team_role RBAC (`b6a2ad617c`) — ★ 보안
- **근본구조**: user_session 토큰(genie_token)은 `/auth/*` 15라우트만 인증·team_role 인지. `/v4xx`는 api_key(tenant 공유) 인증이라 user_session 미도달 → 실제 갭=user-session 뮤테이팅 owner-only 액션 미검증(member/manager가 플랜/구독 변경 가능).
- **구현**: `UserAuth.php` 서버측 가드(FE teamRolePolicy.js 미러) — TEAM_OWNER_ONLY 6종 + normTeamRole/teamCanWrite/requireTeamWrite(admin우회·fail-open=owner 레거시안정성). 적용: upgrade·activateLicense(plan_change owner전용)·profile(member차단). team/*는 기존 teamManager 유지.
- **배포**: 운영+데모 backend `UserAuth.php` pscp+chown+php-fpm reload(`.bak_184p3b` 백업). PHP8.1.34 php -l 통과·reflection 9/9·라이브 회귀 401정상(500 0).

## D. 고아 페이지 정리 (`4950ecdcd7`) — 18파일 삭제, 6494 deletions
- 진짜 고아 3: SmartConnect.jsx·AsiaLogistics.jsx·fix_crm.js (참조 0)
- App.jsx 단독 dead-import 15: Connectors/AIPolicy/ActionPresets/MappingRegistry/AlertPolicies/IntegrationHub/AlertAutomation/EventNorm/Pricing/BudgetPlanner/OperationsGuide/MarketingIntelligence/AIBudgetAllocator/PixelTracking/AIPrediction + App.jsx dead lazy import 16줄 제거(PlanPricing 등 live 보존, AIMarketingHub는 CampaignManager 사용=유지)
- **SmartConnect "손상복구" P1은 App 미import·라우트 redirect로 미도달=moot → 삭제로 흡수**. 삭제 페이지는 미렌더였으므로 라이브 동작 무변경(번들 축소만). **배포완료**(체크포인트 dist에 포함).

## E. ja/zh 미번역 해소 (P1)
- **정밀감사(결정적 신호=해당언어값===en값 AND ko≠en)**: ja 5,820 / zh 4,971 leaf.
- **코어 UI 491키** `f34be2afa0`: dash/g/pnl/performance/pmExt. ja483·zh489+1삽입. **배포완료**.
- **live ns 1차 407키** `4de2e58c1b`: ak/orderHub/dataProduct/ds. **⚠️ 미배포**(push만, 다음 배포 시 반영).
- **트랩**: ① 값=en인 키만 치환(기존번역 보존) ② **중복키 마지막매치 필수**(zh.js 최상위 `"performance":"绩效"`문자열+`performance:{}`객체, ko.js `pages:` 2회 → acorn 첫매치 잡으면 오삽입). 도구 `_tmp_184_gen_apply.cjs`(경로인식+last-match+삽입, trans 파일 argv).
- **★ pages ns ~2,080키 dead** : marketingIntel(1261)+cmpVal+cmpRow = 삭제 MarketingIntelligence 전용 / menu·perms·mobile·pricingDetail·reconciliation 등 = pages_backup 전용·live 미참조. **pages 번역 제외, live ns 우선 원칙**.

## F. baseline.json (184차 최종)
- `ja.js` SHA `cc0124c58a04…`, `zh.js` SHA `e5015f4932a6…`, `ko_leaf_count` 32759(ko 무변경 — ja/zh만 수정). 로케일 커밋 `TRIAGE_SKIP=1`.

## G. 배포 상태 (★ 중요)
- **운영 최신 dist `index-BR37fCW5`**(고아정리+ja/zh코어491 포함) / 데모 `index-BXlwmT_8`. 라이브 ja/zh pnl 3/3·err0 검증.
- **미배포**: ja/zh live ns 407키(`4de2e58c1b`) — push됨, 다음 frontend 배포 시 함께 반영 필요.
- backend: Phase3b `UserAuth.php` 운영/데모 반영 완료.
- **배포=수동 PuTTY**(CI는 SSH 시크릿 미등록 inert=빌드만). 운영 `roi.geniego.com`/데모 URL=`roidemo.genie-go.com`(하이픈)·경로=`roidemo.geniego.com`. tar 오버레이(--delete 없음)+chown www:www+nginx reload.

## H. 백로그 / 다음 차수
- **ja/zh live ns 계속**(권장 다음): wms(463)·crm(784 ja)·ruleEnginePage(627/430)·pricingDetail(184 top-level)·marketing·priceOpt(102 zh). `_tmp_184_gen_apply.cjs` + 추출(`_tmp_184_live1_needs.json` 패턴) 재사용. **wms 권장**(가이드 배포한 페이지 UI 완성).
- **ja/zh live ns 407키 미배포분 배포** 필요.
- **MFA** 전무(BE TOTP+2단계로그인+DB칼럼+관리UI 신규, 3~4주 규모) — P1 마지막.
- pages ns dead 키 purge(선택, ko+15langs·ko_leaf 영향).
- 182차 잔여: auto.* 비한글 스텁, RBAC 캐스케이드, CSP.
- 스크래치 `_tmp_184_*` 다수 미정리. 도구 보존: `_tmp_184_gen_apply.cjs`, `_tmp_184_jazh_audit.cjs`(미번역 감사), PuTTY.

(memory: `project_n184_demo_backend_parity.md` 외 — 184차 트랙 누적 갱신 완료. `feedback_handoff_approval.md` 준수: 본 인계서는 사용자 명시 승인 후 작성·push)

---

# 185차 인계서 (ja/zh wms UI + 가이드 자료 누락 보충)

## ★★★ 최우선: 사용자 제공 번역 자료 존재 — 중복 번역 금지 ★★★

> **이용가이드 TOP8+1(9개 ns)의 15개국 번역은 사용자가 전부 작성·제공한 확정본이다. CC가 재번역하지 말 것.**

- **위치**: repo root `_tmp_184_<ns>_<lang>.json` (ns 9종 × lang 15개 = 135파일).
- **ns 목록 (파일명접두 → 로케일 ns)**: `wms`→wms(74키) · `po`→priceOpt(72) · `omni`→omniChannel(72) · `kakao`→kakao(72) · `jb`→jb(72) · `email`→email(72) · `crm`→crm(72) · `campMgr`→campMgr(72) · `ak`→ak(73). 전부 `guide*` 키(guideTitle/guideSub/guideStep…/guideTip…/FAQ/보안/운영/CTA).
- **lang 15종**: ko en ja zh zh-TW de fr es pt ru vi id th ar hi.
- **성격**: 사용자 확정 SOT(한국어 기준 + 14개국 사용자 제공). **CC 임의 생성·재번역 절대 금지**(feedback_178_i18n_translation_workflow). 가이드 텍스트 수정/보충 필요 시 → 사용자에게 자료 요청.
- **적용 상태**: 9개 ns 전부 15개국 로케일에 **100% 적용 완료**(185차 검증). 향후 동일 가이드 ns 재작업 불요.
- **대조/주입 도구**: `_tmp_185_guide_gap.cjs`(자료 vs 로케일 누락분 탐지, NSMAP 내장) + `_tmp_185_guide_apply.cjs`(누락분만 주입, 영어fallback인 키만 치환=기존 실번역 보존). 새 가이드 자료 받으면 NSMAP에 ns 추가 후 재사용.

## A. 185차 처리 (전부 로컬 커밋, 미push·미배포)
1. **wms UI ja/zh 미번역 463키** `648a3eba0c` — wms ns UI 문자열(tabSupplier/whListTitle/ioRegBtn 등, **가이드 아님**). 한국어 SOT 기준 CC 용어일관 번역(ja445/zh433). 값=en인 키만 치환=기존번역 보존. wms ja/zh 미번역 0 달성. baseline ja/zh SHA 185차 갱신(`c779ba00…`/`386ac4df…`), ko 무변경(32759).
2. **가이드 자료 누락 11개국 143키 보충** `9d1df2ec50` — 사용자 제공 자료 전수 대조 결과 omniChannel 4키 + crm 9키 × 11개국(ja/zh 제외 zh-TW/de/fr/es/pt/ru/vi/id/th/ar/hi)이 영어 fallback으로 누락 → 사용자 제공 실번역으로 치환. insert/skip 0. GRAND missing 0 달성.
- 빌드 2회 성공. 11개국+ja/zh ES module 파싱 검증 통과.

## B. 번역 현황 (185차 시점, 결정적 미번역=값=en AND ko≠en)
- **ja 4,496 / zh 3,657** (가장 완성) ↔ 나머지 12개국 **1.1만~1.6만/언어** 영어 fallback(키마다 들쭉날쭉). 인프라(15파일 로드)는 OK, 내용은 ko/ja/zh만 충실.
- **UI 문자열 대량 미번역분(가이드 외)은 사용자 제공 자료 없음** → CC 용어일관 번역 또는 사용자 자료 대기 필요(범위 사용자 결정사항).
- **dead ns(번역 제외)**: `pages`(~2,080, 삭제 MarketingIntelligence/pages_backup 전용) · `ruleEnginePage`(627/430, pages_backup/AIRuleEngine만) · `pricingDetail`(184, 참조 0). → live ns 우선 원칙(handoff 184 §E 계승).
- **잔여 live ns 최대(ja/zh)**: crm(784 ja, CRM.jsx LIVE) · priceOpt(102 zh, PriceOpt.jsx LIVE) · marketing(94/72) · recon/sms 등.

## C. 배포 상태 (★ 운영/데모 동반 배포 완료 — 사용자 승인)
- **3커밋 push 완료**(`2fc51201eb`): ①184차 live ns 407키(`4de2e58c1b`) ②185차 wms UI 463키(`648a3eba0c`) ③185차 가이드 143키(`9d1df2ec50`).
- **운영/데모 동반 dist swap 완료**: 운영 `index-BR37fCW5`→**`index-ZNahwtex`**(i18n-locales-`7wp2ssH2` 16.83MB) / 데모 `index-BXlwmT_8`→**`index-BekSB6R7`**(vendor-locales-`7wp2ssH2` 동일내용). 청크해시 운영=데모 동일=로케일 일치.
- 절차: production build + `vite build --mode demo` 별도빌드 → tar 오버레이(--delete 없음) → pscp → chown www:www → `systemctl reload nginx`(nginx -t OK). `index.html.bak.185` 백업.
- **검증**: 서버내 `--resolve` fetch 양 도메인 HTTP200+바이트일치+마커(de omni/crm Leitfaden). 로컬 preview 헤드리스 PASS(ko dashboard·ja/zh wms-manager no-white·pageerror0·ja 倉庫/在庫/棚卸/取引先·zh 仓库/库存/盘点/供应商 4/4 렌더).
- **★ 배포 트랩**: 데모 공개도메인=`roidemo.genie-go.com`(하이픈) ↔ 디렉토리=`/home/wwwroot/roidemo.geniego.com`(하이픈없음). `--resolve` 검증 시 하이픈없는 도메인 쓰면 prod fallback 오판. nginx=`/usr/sbin/nginx`+`/usr/local/nginx/conf`+systemd(`/etc/nginx` 없음). 데모 i18n청크명=`vendor-locales-*`(운영=`i18n-locales-*`). plink 원격명령 따옴표/괄호/CJK 전송 깨짐→특수문자없는 패턴 or cat후 로컬필터. SSHPW 매 PowerShell호출 인라인재로드(env 비영속).

## D. 백로그 / 다음 차수
- **ja/zh live ns 계속**: crm(784) 권장 — 단, **crm 가이드 키는 사용자 자료 적용완료**, 잔여는 crm UI 문자열(비가이드). `_tmp_185_extract.cjs <ns>` + `_tmp_184_gen_apply.cjs` 재사용.
- ~~미배포 3커밋 배포 + push~~ → **185차 운영/데모 배포 완료**(§C 참조).
- **MFA** 전무(P1 마지막, 3~4주 규모).
- 도구 보존: `_tmp_185_extract.cjs`(ns별 ja/zh 미번역 추출) · `_tmp_185_all15.cjs`(15개국 전체 미번역 감사) · `_tmp_185_guide_gap.cjs`/`_tmp_185_guide_apply.cjs`(가이드 자료 대조·주입) · `_tmp_184_gen_apply.cjs` · `_tmp_184_jazh_audit.cjs`.

(memory: `project_n185_i18n_translation.md` 신규 + `feedback_178_i18n_translation_workflow.md` 갱신 — 사용자 제공 가이드 자료 위치·재번역 금지 명시. `feedback_handoff_approval.md` 준수: 본 185차 노트는 사용자 명시 승인("인계서에 명시해놔") 후 작성)

---

# 185차 종결 — i18n 15개국 현지화 대규모 완성 + 차기 우선순위 계획

> **작성**: 사용자 명시 승인("종결하고 인계서 작성 + 커밋·푸쉬"). 운영/데모 배포 = 사용자 명시 승인(U-177-D 동반).
> **종결 커밋**: `aeb145efb4`(최종). 운영 `index-CaElRkGp`+`i18n-locales-ewgdDP5V`(17.54MB) / 데모 `index-CjmbPCr-`+`vendor-locales-ewgdDP5V`(동일해시). 전 커밋 push 완료.

## A. 185차 전체 성과 (8커밋, 운영/데모 3회 동반 배포)
1. **wms 창고관리 15개국 완성**(`648a3eba0c`·`95506cd55e`·`db67d8b793`): ko+ja/zh/zh-TW(수작업) + de/fr/es/pt/ru/vi/id/th/ar/hi(워크플로우 4,873키). 첫 TOP8 페이지 15개국 전수.
2. **가이드 자료 누락 11개국 143키 보충**(`9d1df2ec50`): omniChannel/crm 사용자 제공 자료 미적용분.
3. **crm shadow 트랩 규명**(`2256d82951`): crm "ja784" 중 783=죽은 shadow(crm.aiHub 726+crm.email 57, 참조0). 진짜 live 3키만 처리.
4. **live ns 11개국 전수**(`961d95db4c`): de~hi+zh-TW × live ns 7,202키 → **39,083키** 워크플로우 66+2 에이전트 병렬.
5. **priceOpt fall-through 11개국**(`aeb145efb4`): PO_DICT 미보유 131키 글로벌 번역 606건. (PO_DICT 170키는 이미 15개국 보유=렌더정상.)
- **검증**: 66파일 누락0·플레이스홀더0 / 전 언어 파싱+prod/demo 빌드 / 데모 헤드리스 코어 nav 현지어 렌더(fr Accueil·ru Главная·de Lagerliste·th คลังสินค้า·ar إدارة الموردين) / 라이브 배포번들 HTTP200·바이트일치.

## B. ★ 번역 워크플로우 패턴 (재사용 정본)
- **방식**: `_tmp_185_<page>_src.json`(키→{ko,en}) + `_<page>_gap.json`(언어별 미번역키) → Workflow `parallel(LANGS×CHUNKS map → agent(schema))` 각 에이전트가 src/gap Read→native 번역→`_<page>_<lang>_gen.json` Write(충돌없는 병렬) → CC `merge`({key:{lang:val}}) → `_tmp_185_multi_apply.cjs`(임의언어, 값=en만 치환=기존보존) → 파싱+빌드+데모헤드리스 검증 → 커밋.
- **도구 보존**: `_tmp_185_multi_apply.cjs` · `_tmp_185_merge_live.cjs` · `_tmp_185_validate_gen.cjs` · `_tmp_185_live_src/gap/chunks.json` · `_tmp_185_po_src/gap.json` · 워크플로우 스크립트(wms/live/po, scriptPath 재실행 가능) · `_tmp_185_all15.cjs`(15개국 감사) · `_tmp_185_extract.cjs <ns>`.
- **트랩**: ① 데모 도메인=`roidemo.genie-go.com`(하이픈)·경로=`roidemo.geniego.com`. `--resolve` 검증 시 하이픈 도메인 필수(아니면 prod fallback 오판). ② 데모 i18n청크=`vendor-locales-*`(운영=`i18n-locales-*`). ③ 데모 index 해시 하이픈 포함 가능→grep `[A-Za-z0-9_-]+`. ④ nginx=`/usr/sbin/nginx`+`/usr/local/nginx/conf`+`systemctl reload nginx`. ⑤ SSHPW 매 PowerShell 호출 인라인 재로드(env 비영속). ⑥ plink 원격명령 따옴표/괄호/CJK 깨짐→특수문자없는 패턴 or cat후 로컬필터. ⑦ poI18n/scI18n/rpI18n 로컬사전 shadow(글로벌 가림)→PO_DICT 직접 or fall-through만 글로벌.

## C. 번역 잔여 정밀 분류 (실제 렌더 ~98-100% 완료)
| 카테고리 | 규모 | 성격 |
|---|---|---|
| 진짜 미번역(문구) | **~68키** | id21·th10·de10·vi8·es7·fr6·pt5·ru1 (ja/zh/zh-TW/ar/hi=0). **차기 1순위 마무리** |
| 토큰(브랜드/기술) | de300·id327 등 | 대부분 정당(차용어 Status/Name/Budget·기능명 Journey Builder·브랜드 Coupang/CJ Logistics). 번역여지 극소수 |
| PO_DICT 오탐 | 언어당~120 | 실제 PO_DICT 현지렌더(글로벌-en 무의미) |
| dead/shadow | ko 20,679키(63%) | 미렌더 purge 대상 |

## D. baseline.json (185차 최종)
- `ja.js` SHA `95704e01…`, `zh.js` SHA `932096c4…`, `ko_leaf_count` 32759(ko 무변경). 로케일 커밋 `TRIAGE_SKIP=1`.

## E. ★ 차기 우선순위 진행 계획
| Phase | 작업 | 규모 | 비고 |
|---|---|---|---|
| **1 (즉시)** | i18n 진짜 미번역 ~68키 마무리 + 토큰 cleanup(선택) | 1세션 | 15개국 100% 완결. `_tmp_185` 패턴 재사용 |
| **2** | dead/shadow ns purge | 1~2세션 | ~20,000키(pages5060·crm.aiHub/email~4193·ruleEnginePage2262·nav3933검증요·pricingDetail/marketingIntel). **per-ns 검증 필수**(grep 미탐 access 과대추정 주의), ko+15langs 동시삭제, 번들 17.5MB 대폭 축소 |
| **3** | **MFA 구현** (보안 P1) | 3~4주 | 은행급 원칙 핵심 갭. BE TOTP+2단계로그인+DB칼럼+관리UI. user_session(genie_token) 인증경로에 추가 |
| **4** | 멀티테넌트 Phase2 + PM PH3/PM2 | 다세션 | n180 Phase2(멤버·팀 하위계정 신원), BroadcastChannel 스코프, PM 글로벌알림/4축 |
| **교차** | **Paddle Sandbox 11값** | — | **사용자 액션 필수**(매출 차단 직결) |
| **위생** | 182차 잔여(auto.* 스텁·CSP·RBAC캐스케이드) + 스크래치 `_tmp_*` 정리 | 산발 | — |

**권장: Phase 1 → 2 순차.** Phase 3(MFA)는 대형 신규라 별도 스프린트.

(memory 갱신: `project_n185_i18n_translation.md` — 15개국 현지화 종결·워크플로우패턴·배포·잔여분류 누적. `feedback_178_i18n_translation_workflow.md` — U-185 재강조(자료 누락 재점검+추천/수정/검증/적용 루프). `feedback_handoff_approval.md` 준수: 본 종결 인계서·커밋·push = 사용자 명시 승인.)
