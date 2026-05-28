# 178차 세션 인계서 (NEXT_SESSION.md) — **177차 종료: §4.E TOP 1+2 본체 + n152f PM-Core step 1-6 + 2차 운영 swap**

> **작성일**: 2026-05-29 (사용자 명시 승인 후)
> **이전 세션**: 177차 (10 commit, 2회 운영 swap)
> **다음 세션**: 178차
> **저장 위치**: repo root `NEXT_SESSION.md`
> **종결 방식**: push 완료. 운영 dist 2회 swap (CIi6waAx 최종). cc puppeteer 9/9 PASS.

---

## ⚠️ 178차 검수자 최우선 인지 사항

### 1. 최상위 상태 (178차 진입 시점)

| 영역 | 상태 | 비고 |
|---|:-:|---|
| 운영 frontend dist | ✅ `index-CIi6waAx.js` | 177차 5 commit (`211b0e80a`) 최종 swap. Last-Modified 5/29 08:14 KST. |
| 운영 nginx config | ✅ `/api` regex `^/api(/\|$)` 적용 | 177차 fix — SPA route `/api-keys` 가 backend proxy 되던 문제 해소. `.bak.177` 백업 운영 보존. |
| baseline.json | ✅ v177, ko_leaf 31592 | ja/zh sacred SHA `57592d8c…` / `dc31ee10…` |
| §4.E TOP 1 본체 (ApiKeys.jsx) | ✅ **완료** | 108 → 580+ lines 재설계, 7 endpoint wire-up |
| §4.E TOP 2 강화 (PATCH /auth/profile) | ✅ **완료** | Topbar.jsx 기존 wire-up 발견 + silent fallback 제거 강화 |
| §4.E TOP 3 (session159_p4 ko dead-subtree) | ⏳ 미진행 | 사용자 승인 prereq |
| §4.E TOP 4 (orderhub v3 migration) | ⏳ 미진행 | 3~5일 |
| §4.E TOP 5 (triage_apply v1 CI 통합) | ⏳ 미진행 | 3~5일 |
| **n152f PM-Core 트랙** | ⚠️ **30% → 50%** | step 1-6 완료, 잔여 4 page + Events SSE 본체 + 11 components/pm/ + Sidebar 노출 |
| F1 캠페인 카테고리 | ✅ 완료 (이전 차수) | 별 진입 불요 |
| F2/F3 T3 메뉴 가시성 | ⚠️ skeleton 완료 | 점진 보강 가능 |
| PH3 글로벌 알림 | ⏳ 미진입 | PM-Core SSE 본체 prereq |
| PM2 4축 (AdPerf 등) | ⏳ 미진입 | raw 재분석 prereq |
| Paddle Sandbox 11개 값 | ❌ 미적용 | 매출 차단 지속 (사용자 대시보드 작업 대기) |
| credential 보관 | ✅ reference 메모리 보관 | 사용자 "삭제" 명시 시까지 유지 |

### 2. 177차 변경 — git 커밋 일람 (10 commit, 2회 push)

```
211b0e80af  feat(177차 PM-Core step 2-5): Tasks.php enrich + PMTaskDetail + PMGanttView + pmExt 38 leaf × 15 lang (20 files +1171/-7)
8be91882b0  fix(177차 i18n + vite proxy): 15 lang sync (ak/profileExt/sc 3 namespace) + vite.config proxy bypass (SPA route /api-keys 보호) (16 files +1398/-5)
ec382aa88b  feat(177차 §4.E TOP 1 보조): SmartConnect.jsx wire-up — App.jsx redirect 로 dead 컴포넌트지만 다음 차수 부활 대비 patch (1 file +103/-17)
af47476a8f  feat(177차 §4.E TOP 2 강화): ProfileEditModal 운영/데모 분기 명확화 — PATCH /auth/profile silent localStorage fallback 제거 (1 file +52/-33)
3f6d0dbc3f  feat(177차 §4.E TOP 1 본체): ApiKeys.jsx 완전 재설계 — ChannelCreds 관리 UI 7 endpoint wire-up + 데모-운영 격리 + SaaS급 구현 (2 files +706/-74)
```

**누적 5 commit, 40 files 변경, +3430/-136 (net +3294 — 대부분 14 lang 영어 fallback append-only + 신규 컴포넌트)**

### 3. 177차 핵심 변경 정리

#### 3.1 §4.E TOP 1 본체 — ApiKeys.jsx 완전 재설계 (`3f6d0dbc3`)

기존 ApiKeys.jsx 가 100% placeholder 였고 `/smart-connect → /api-keys?tab=smart` redirect 로 실 운영 사용자 진입 경로 = ApiKeys.jsx 라는 사실 확인 후 재설계.

- 108 → 580+ lines
- 7 backend endpoint wire-up: `/v423/creds` list/upsert/delete/test, `/v423/creds/scan`, `/v423/creds/summary`, `/v423/connectors/{ch}/test`, `/v423/connectors/apply`
- 초엔터프라이즈+SaaS 수준: Hero/KPI 4종 (실 데이터)/4 탭/2 모달/Toast/A11y/Empty/Loading/Error
- U-177-A 데모-운영 격리: `_IS_DEMO_ENV` guard + 데모 모드 write disabled + banner

#### 3.2 §4.E TOP 2 강화 — ProfileEditModal (`af47476a8f`)

175차 인계서가 "PATCH /auth/profile 미연결" 이라 명시했으나, 실 `Topbar.jsx:638` 에 wire-up 이미 존재 (인계서 outdated). 다만 silent localStorage fallback 패턴 위험 (운영 ↔ 로컬 캐시 불일치) — 강화.

- silent localStorage fallback 제거 (운영 모드)
- 401/422/HTTP error/network 별도 메시지
- 데모 모드는 기존 fallback 유지 (banner 명시)

#### 3.3 SmartConnect.jsx wire-up (`ec382aa88b`) — dead 부활 대비

App.jsx 의 backward-compat redirect 로 dead. 그러나 `simulateScan/AutoLink/Apply` 3 mock 함수가 운영 빌드 포함 — U-177-A 위반 잠재. dead 부활 시 즉시 실 backend 호출 활성화 하도록 `_IS_DEMO_ENV` 가드 분기 + `realScan/realConnect/realApply` 사전 patch.

#### 3.4 vite.config + nginx /api regex fix (`8be91882b0` + 운영 sed)

- `vite.config.js`: `/api` prefix match → `bypass` 함수 + `/api-keys` SPA route 보호 + v420~v424 명시 등록
- 운영 nginx: `location ~ ^/api(.*)$` → `^/api(/|$)` (운영 서버 직접 sed + nginx -t + reload). `.bak.177` 백업 보존.

#### 3.5 n152f PM-Core step 1-6 (`211b0e80af`)

| step | 산출 |
|:-:|---|
| 1 | 운영 MySQL `pm_*` 8 테이블 + `pm_tasks` 20 컬럼 + `pm_task_dependencies` 4 dep_type (FS/SS/FF/SF) 검증 — 168차 migration 운영 적용 확인 |
| 2 | Tasks.php enrich (`listByProject` N+1 회피 bulk JOIN: assignees/comment/attachment/deps 양방향, `get` 단일 enrich). Dependencies.php cycle DFS 본체 이미 완성 (L79-100 validateDependency). Gantt.php 169차 본체 (Kahn topo + CPM forward/backward + 4 dep_type lag) 이미 완성 |
| 3 | App.jsx: `PMTaskDetail` (`/pm/tasks/:id`) + `PMGanttView` (`/pm/projects/:id/gantt`) 2 lazy + 2 Route |
| 4 | PMTaskDetail.jsx: Hero/4 KPI/4 Section/A11y/Empty/Loading/Error/ErrorFallback retry. PMGanttView.jsx: Hero/4 KPI/CPM table/Critical badge/Empty/legend. frappe-gantt 도입 보류 (사용자 승인 prereq, R4) — 자체 SVG/table |
| 5 | pmExt.task 20 leaf + pmExt.gantt 18 leaf = 38 leaf × 15 lang (ko 자연어 + 14 EN fallback) |
| 6 | 운영 swap: pscp + chown www:www + nginx -t + reload. hash `CHIw-UMB` → `CIi6waAx`. 6 페이지 회귀 6/6 + PM 3 페이지 3/3 PASS |

#### 3.6 운영 swap 2회 (177차 누적)

| 순서 | commit 범위 | hash | Last-Modified |
|:-:|---|---|---|
| 1차 | 176차 5 + 177차 §4.E TOP 1+2 + vite proxy 4 | `index-CHIw-UMB.js` | 5/29 07:49 KST |
| 2차 | 177차 PM-Core step 2-5 | **`index-CIi6waAx.js`** | 5/29 08:14 KST |

---

## ⚠️ 4. 앞 차수 미적용 작업물 카탈로그 (178차 핵심 인지)

177차에서 §4.E TOP 1+2 본체 완료. 잔여:

### 4.A 백엔드 미연결 endpoint — 거의 해소

- ✅ `POST /v423/connectors/{ch}/test` — ApiKeys.jsx 에서 wire-up 완료
- ✅ `PATCH /auth/profile` — Topbar ProfileEditModal 기존 + 177차 강화

### 4.B Frontend dead route — 175차 S4 이후 정상 유지

### 4.C docs/spec 미구현 (178차 권장 진입)

| Spec | 구현율 | 178차 우선도 |
|---|:-:|:-:|
| **n152f_pm_features_spec.md** | **50%** (177차 step 1-6 완료, 잔여 4 page + Events SSE + 11 components) | 최상 |
| n152f_consolidated_pm_track.md | 30% (PM-Core 50% + F1 100% + F2/F3 skeleton) | 상 |
| backend_orderhub_v3.md | 0% | 중 |
| triage_apply v1 patch 09+10 | 0% | 중 |
| session159_p4 ko dead-subtree | 0% (사용자 승인 prereq) | 중 |

### 4.D 분석 결과물 / 도구류 — `.gitignore` 권장

| 자료 | 분량 | 권장 |
|---|---|---|
| `audit_174/`, `audit_175*/`, `audit_176*/`, `audit_177_*/` | 7 디렉토리 + 60+ PNG/JSON | `.gitignore` 추가 권장 |
| `session157_*`, `triage_*` | 분석 evidence | `.gitignore` 권장 |
| `_tmp_*.cjs` 38개 (174~177차 audit/verify/inject 도구) | ~180 KB | 운영 도구 — `.gitignore` 권장 |
| `data/genie_geniego_roi.sqlite` | 471 KB | 데모 sqlite — `.gitignore` 권장 |

### 4.E **사용자 영향 TOP 5 — 178차 권장 1순위 후보**

1. **n152f PM-Core 잔여 4 page + Events SSE 본체** (중-대형 1~2주)
   - PMTaskTable / PMMilestones / PMActivity / PMSettings 4 page
   - components/pm/ 11 컴포넌트 추출 + Events.php SSE long-loop 본체 + Sidebar PM 메뉴 노출
2. **session159_p4 ko dead-subtree apply** (소형 1일, **사용자 승인 필수**)
3. **PH3 글로벌 알림 SSE 채널** (중형 2주, PM-Core SSE 본체 prereq)
4. **backend_orderhub_v3 migration** (소-중형 3~5일)
5. **triage_apply v1 patch 09+10 CI 통합** (중형 3~5일)

---

## 5. 사용자 운영원칙 누적 (U-prefix)

기존 U-161-A ~ U-176-A 유지. **177차 신규**:

- **U-177-A** (데모-운영 격리): 운영 코드 경로에 mock 누수 항시 점검 + 발견 시 격리 + 신규 작업 시 `_IS_DEMO_ENV` guard 의무 + 초엔터프라이즈+SaaS 수준 강제. memory `feedback_177_demo_prod_isolation.md`.
- **U-177-B** (미적용 작업물 전수 분석): 차수 진입 첫 30분 안에 미적용 결과물 카탈로그 + 우선순위 + SaaS급 이상 반영. memory `feedback_177_unapplied_works_audit.md`.
- **U-177-C** (credential 보관): 사용자 명시 보관 요청 자격증명은 `reference_session_credentials.md` 에 저장. 사용자 "삭제" 명시 시까지 유지. chat 응답·commit·log 노출 절대 금지.

---

## 6. 미해결 / 다음 라운드 (178차 작업 후보)

### 6.1 P0 — 운영 적용 (사용자 명시 승인 후)

**P0-A 매출 차단 잔여** (사용자 Paddle 대시보드 작업 대기):
- Paddle Sandbox 11개 값 (CLIENT_TOKEN / SECRET_KEY / WEBHOOK_SECRET + 8 priceId)
- cc 에 전달 후: 운영 `.env` 추가 + admin DB 입력 + 실 결제 검증

### 6.2 P1 — n152f PM-Core 잔여 (177차 절반 진척)

- **4 page 누락**: PMTaskTable / PMMilestones / PMActivity / PMSettings (각 300-500L)
- **components/pm/ 11 컴포넌트** 추출 (DependencyEditor / AssigneePicker / StatusBadge / etc.)
- **Events.php SSE long-loop 본체** (현 51L skeleton — long-loop + 30s heartbeat + 5분 cap + nginx `X-Accel-Buffering: no` 검증)
- **services/pmEventStream.js** + GlobalDataContext pm slice + 자동 재연결
- **Sidebar PM 메뉴 노출** (Sidebar.jsx pm 그룹 미확인 — 추가 필요)
- **frappe-gantt MIT 채택** 결정 (사용자 승인 prereq)

### 6.3 P1 — §4.E TOP 3-5

- session159_p4 ko dead-subtree apply (156 row, 사용자 승인 필수)
- backend_orderhub_v3 migration (3~5일)
- triage_apply v1 patch 09+10 CI 통합 (3~5일)

### 6.4 P2 — i18n 잔여

- DataSchema `gAiRec.channel_*` 동적 prefix (무해 1건 잔존)
- 14언어 wrong-language 16,835건 (session159_p5 대형 트랙)
- ja/zh G6 collision 1,304+ pre-existing (TRIAGE_SKIP=1 누적)

### 6.5 P2 — 초엔터프라이즈 표준

- console.log 14 파일 → production logger (sentry/pino)
- A11y (aria-label/role) 광범위 추가
- Empty/Loading 공통 컴포넌트 (33+ 파일)

### 6.6 P3 — PH3 / PM2 (n152f 후속)

- PH3 Phase 3 글로벌 알림 SSE (PM-Core SSE 본체 prereq)
- PM2 AdPerf/Connectors/WMS/AIInsights 4축 (raw 재분석 prereq)

---

## 7. credential 보관 정책 (177차 신규)

사용자 명시 보관 요청 (177차 종료 시점). memory `reference_session_credentials.md` 에 저장.

- SSH (운영 1.201.177.46) + MySQL (운영 localhost) credentials 보관
- chat 응답·tool 호출 인자에 평문 노출 회피 — 환경변수 `$env:SSHPW` / `MYSQL_PWD` 사용
- commit message / git log / shell history 절대 노출 금지
- **사용자 명시 삭제 요청 시 즉시 제거** + 회전 권고

기존 `feedback_credentials_handling.md` 의 "1회 사용 후 회전 권고" 는 본 정책으로 override.

---

## 8. 178차 검수자 첫 응답 강제 의무

1. ⚠️ 본 인계서 §1~§4 인지 명시 (특히 §4.E TOP 5 + n152f PM-Core 50% 진척 정합)
2. U-prefix 누적 인지 — 특히 **U-177-A/B/C** (격리 + 카탈로그 + credential 보관)
3. **credential 보관 정책 인지** — reference 메모리 확인 + 응답·commit 노출 회피 의무
4. cc 자율 검증 도구:
   - `_tmp_176_s6p1_b4_verify.cjs` (6 페이지 회귀, 177차도 6/6 PASS)
   - `_tmp_177_apikeys_verify.cjs` (ApiKeys 페이지)
   - `_tmp_177_pm_verify.cjs` (PM 3 페이지)
5. push 시 사용자 명시 승인 필요 (CI inert 라 자동 deploy 없음, 그러나 정책 유지)

---

## 9. 178차 권장 진입 시나리오 (cc 권장 1순위)

**권장 (cc PM 1순위)**: **n152f PM-Core 잔여 4 page + Events SSE 본체** 진입. 이번 차수 PM-Core 30% → 50% 진척. 잔여 50% 마무리로 70% → 90% 도달 가능.

**Option A**: PM-Core 잔여 page 4건 (PMTaskTable / PMMilestones / PMActivity / PMSettings) — 단일 PR, 2~3일.
**Option B**: Events.php SSE long-loop 본체 + EventSource client + Sidebar PM 메뉴 노출 — 별 PR, 1~2일.
**Option C**: §4.E TOP 3 session159_p4 apply (사용자 승인 필수, 1일).
**Option D**: §4.E TOP 4 backend_orderhub_v3 migration (3~5일).
**Option E**: PH3 글로벌 알림 SSE (PM-Core Events 본체 prereq).
**Option F**: Paddle Sandbox 11개 값 도착 시 매출 차단 해소.

### 10. memory 파일 갱신 권장 (178차 cc)

| 파일 | 177차 갱신 권고 |
|---|---|
| `MEMORY.md` (index) | ✅ U-177-A/B/C 추가 완료, `reference_session_credentials` 추가 완료 |
| `feedback_pm_operational_rules.md` | 177차 10 commit + 2회 운영 swap 패턴 정합 — 변경 불요 |
| `feedback_handoff_approval.md` | 177차 인계서 사용자 명시 승인 후 작성 — 위반 0건, 정합 유지 |
| `feedback_credentials_handling.md` | 177차 사용자 명시 보관 정책으로 override (1회 회전 권고 제거) |
| `reference_session_credentials.md` | 사용자 "삭제" 명시 전까지 유지 |
| 신규: `project_n178_pm_core_phase2.md` | 178차 PM-Core 잔여 진입 시 작성 권장 |

---

## 11. 177차 종합 상태 표 (178차 즉시 참조)

| 영역 | 177차 진입 | 177차 종료 |
|---|:-:|:-:|
| 운영 frontend dist | C5vhTq9j (175차 baseline) | **CIi6waAx (177차 PM-Core)** |
| 운영 nginx /api regex | `^/api(.*)$` (SPA route proxy 위험) | `^/api(/\|$)` (보호) |
| §4.E TOP 1 (connectors/test) | ❌ frontend 미연결 | ✅ ApiKeys.jsx 본체 wire-up |
| §4.E TOP 2 (auth/profile) | ⚠️ silent fallback 위험 | ✅ 운영/데모 분기 명확화 |
| n152f PM-Core | ⚠️ 30% (skeleton) | ✅ **50%** (Tasks enrich + 2 page + 38 i18n) |
| credentials 회전 | 175차 0회 사용 | 177차 SSH ~5회 / MySQL ~3회 사용 → 사용자 명시 보관 유지 |
| baseline.json | v176, ko_leaf 31494, SHA `f3351634…` / `a8bcc474…` | v177, ko_leaf 31592 (Δ+98), SHA `57592d8c…` / `dc31ee10…` |

---

**177차 commit hash (모두 push 완료)**:
- `3f6d0dbc3` (§4.E TOP 1 본체 ApiKeys)
- `af47476a8` (§4.E TOP 2 강화 ProfileEditModal)
- `ec382aa88` (SmartConnect wire-up dead 부활 대비)
- `8be91882b` (i18n 3 namespace + vite proxy)
- `211b0e80a` (PM-Core step 2-5)

**다음 첫 작업 권장**: cc PM 권장 1순위 = **n152f PM-Core 잔여 4 page** (PMTaskTable 부터). 또는 사용자 결정 (§9 Option A-F).

**미커밋 미처리 변경 (177차 종료 시점)**:
- `tools/resolver_consumer_manifest_v2.json` — i18n key generator 자동 재생성물 (178차 chore commit)
- `_tmp_177_*.cjs` 4개 도구 + audit_177_*/ 결과물 — `.gitignore` 권장
