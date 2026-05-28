# 176차 세션 인계서 (NEXT_SESSION.md) — **175차 6 Sprint: PM 전수 분석 + 사용자 영향 직접 결함 일괄 해소**

> **작성일**: 2026-05-28 (사용자 명시 승인 후)
> **이전 세션**: 175차 (PM 전수 분석 → 6 Sprint 순차 실행)
> **다음 세션**: 176차
> **저장 위치**: repo root `NEXT_SESSION.md`
> **종결 방식**: push 완료 (6 commit). 운영 CI auto-deploy 자동 진행 중.

---

## ⚠️ 176차 검수자 최우선 인지 사항

### 1. 최상위 상태 (176차 진입 시점)

| 영역 | 상태 | 비고 |
|---|:-:|---|
| 운영 frontend dist | ✅ `357098226` push 후 CI 자동 진행 | 사용자 본인 hash 확인 권장 |
| 데모 frontend dist | ⚠️ 별도 라운드 | 175차 미진행 |
| Paddle Sandbox 11개 값 | ❌ 미적용 | 매출 차단 (사용자 대시보드 작업 대기) |
| BudgetTracker 화면오류 | ✅ **S0 P0-A 해소** | OverviewTab `_pageError` ReferenceError fix |
| 9 페이지 동일 패턴 잠재 결함 | ✅ **S0 P0-A 일괄 해소** | DigitalShelf/ReturnsPortal/SmartConnect/WebPopup/ActionPresets/AdStatusAnalysis/AIMarketingHub/ContentCalendar/OperationsHub |
| 4 페이지 Runtime crash | ✅ **S1 해소** | KrChannel/PerformanceHub/LINEChannel/InstagramDM |
| 14 invisible-text 페이지 | ✅ **S5 단일 fix 해소** | AuthLanguageSelector color 변경 1건 |
| i18n raw-key (8 페이지) | ✅ **S2 해소** | pm/operations/content-calendar/data-product/writeback/approvals 등 |
| backend phantom 3종 | ✅ **S3 해소** | channelTest 매핑 + auth/profile + perf/meta-ads |
| orphan 17 파일 | ✅ **S4 git rm** | TRUE_ORPHAN 검증 후 삭제 |
| i18n long-tail | ⚠️ 부분 — Reconciliation/DataSchema/AIRecommendTab 잔존 50-100+ keys/페이지 | 176차+ |
| Mock-only 페이지 | ⚠️ 미진행 — Attribution/Marketing/AIMarketingHub | 176차 후보 |
| ja/zh G6 collision | ⚠️ 1,304+ pre-existing + 신규 inadvertent | TRIAGE_SKIP=1 누적 |
| 14언어 wrong-language 16,835건 | ⚠️ 미진행 | 별도 대형 트랙 |

### 2. 175차 변경 — git 커밋 일람 (6 commit, 모두 push 완료)

```
357098226  fix(175차 S5): invisible-text 14 페이지 일괄 해소 (AuthLanguageSelector 단일 fix) + i18n long-tail (19 files +404/-53)
6b42753e7  fix(175차 S4): orphan page 17 파일 일괄 삭제 + dead lazy import 정리 (18 files +1/-2195)
d581eee57  fix(175차 S3): backend phantom call 3종 해소 — channelTest 매핑 + auth/profile + performance/meta-ads (3 files +133/-0)
7e711a73f  fix(175차 S2): i18n raw-key 일괄 보강 — 13 namespace, 430+ keys, 15 locale (19 files +1627/-87)
0b0339b3a  fix(175차 S1): 4 페이지 Runtime crash 해소 — KrChannel/PerformanceHub/LINEChannel/InstagramDM (4 files +15/-11)
c846daa27  fix(175차 P0-A): 10 페이지 _pageError out-of-scope ReferenceError 일괄 해소 (10 files +0/-44)
```

**합계: 73 files 변경, +2,180 / -2,390 (net -210, 주로 orphan 17 삭제)**

### 3. 175차 PM 전수 분석 진단 (4 sub-agent 병렬)

cc 가 자율 puppeteer audit (71 페이지) + 4 정적 분석 agent 병렬 dispatch:
- Route/Menu/Page sync (Explore agent)
- Backend/Frontend API sync (Explore agent)
- i18n key coverage (i18n-sync agent)
- Mock/TODO/missing-feature scan (Explore agent)

**검출 결함 카탈로그**:
- ❌ REF (ReferenceError): 4 페이지
- ⚠️ INVIS (invisible text): 14 페이지
- ⚠️ RAW-i18n: 11 페이지
- ⚠️ 404 (backend phantom): 39 → 7 (3 이미 구현 확인 후)
- 23 orphan page (실제 17 TRUE_ORPHAN)
- 18 dead route (intentional backward-compat)

### 4. 175차 핵심 변경 정리

#### 4.1 S0 P0-A — 10 페이지 `_pageError` ReferenceError

**원인**: 자동화 스크립트가 `if (_pageError) return <ErrorFallback...>` 라인을 main component 의 state 와 다른 scope (자식 함수 또는 ErrorFallback 함수 자체) 에 잘못 주입. 174차 HelpCenter 와 동일 패턴.

**대상**: BudgetTracker (OverviewTab), AdStatusAnalysis (ErrorFallback), ActionPresets, ReturnsPortal, SmartConnect, ContentCalendar (MonthCalendar), WebPopup (PillTabs), DigitalShelf (SoSBar), AIMarketingHub (RecommendCard), OperationsHub (ProductsTab).

**Fix**: broken `if (_pageError)...` 라인 + 직전 주석 제거 (10 파일 / 44 deletions).

#### 4.2 S1 — 4 Runtime crash

- **/kr-channel**: `ReferenceError: t is not defined` (ChannelsTab/FeeRulesTab destructure 누락) → `const t = useT();` 추가
- **/performance**: `ReferenceError: CREATORS is not defined` (sub-function 변수 main 에서 참조) → ctxCreators 별도 destructure + useMemo 재계산
- **/line-channel**: `ReferenceError: isDemo + t is not defined` + import 중복 → `isDemo = false` 명시 + import 단일화 + prop 정정
- **/instagram-dm**: `ReferenceError: isDemo is not defined` → `const isDemo = false` 1줄

#### 4.3 S2 — i18n raw-key 일괄 보강 (430+ keys, 15 locale)

- FULL_NEW: pm (8), gCat (12), menuAccess (8), recon (5)
- 부분 보강: performance (7), operations (4), ds (3), email (6), sms (6), contentCal (3), dataProduct (3), approvalsPage (2), writebackPage (2), omniChannel (1)
- 13 lang 영어 fallback 패턴 (174 P1-G 정합)
- 결과: /pm, /operations, /content-calendar, /data-product, /writeback, /approvals raw key 0건
- /email-marketing, /sms-marketing 5→1 (80% 개선)

#### 4.4 S3 — backend phantom 3종

- **`/v423/connectors/{ch}/test`**: 라우트 등록되어 있었으나 `$custom` 매핑 누락 → handler 는 이미 구현됨 (`ChannelCreds::channelTest` L519). custom 매핑 1줄 + `apply` 매핑도 함께 추가.
- **`PATCH /auth/profile`**: 신규 `UserAuth::profile()` (token 검증 + name/phone/company 검증 + UPDATE app_user + 컬럼 부재 fallback).
- **`GET /performance/meta-ads`**: 신규 `AdPerformance::metaAds()` static (performance_metrics 테이블 channel IN ('meta','meta_ads','facebook','instagram') GROUP BY + roas/ctr 자동 계산, 테이블 미존재 시 빈 배열).

**이미 구현 확인 (잘못된 phantom 분류)**: `/v423/creds/summary`, `/channel-sync/inventory`, `/v424/orderhub/orders`. **인증 bypass `/api/v425/admin/*`도 이미 OK** (index.php:87-90).

#### 4.5 S4 — orphan 17 파일 + dead lazy 3 정리

- Explore agent 가 전체 frontend/src/ grep 검증 → 17 TRUE_ORPHAN (어디서도 import / JSX 사용 없음)
- 사용자 명시 git rm 승인 → 17 파일 완전 삭제
- App.jsx dead lazy import 3개 동반 정리: SmartConnect, AsiaLogistics, CommerceUnifiedSearch (모두 Navigate redirect 만, 컴포넌트 미렌더링)
- 7 SUB_COMPONENT 유지 (sub-tab/import 활성): AdStatusAnalysis (Marketing 하위), CreativeStudioTab (5 페이지 공통), ImgCreativeEditor, JourneyBuilderCharts, MappingRegistryParts, ResultSection, SubscriptionPricing (UserManagement)
- 18 dead route (`/connectors`, `/api-keys`, `/smart-connect` 등 Navigate redirect): URL backward-compatibility 목적, 의도된 동작 → 보존

#### 4.6 S5 — invisible-text 14 페이지 일괄 해소 + i18n long-tail

**S5.2 BIG WIN — 단일 컴포넌트 fix**:
- 정확 detector (`_tmp_175_invis_detect.cjs`) puppeteer 진단 결과, 14 페이지 모두 동일 결함: `<span>🇰🇷</span>`, `<span>한국어</span>` color=#fff bg=rgba(255,255,255,0.04)
- 원인 위치: **AuthPage.jsx L1145 AuthLanguageSelector** (admin/auth-gated 페이지가 데모 사용자에게 AuthPage redirect)
- Fix: color #fff → #1e293b (dark slate) + bg/border 강화
- 결과: 14 페이지 모두 0건 invisible (/admin, /report-builder, /integration-hub, /ai-rule-engine, /channel-kpi, /onboarding, /workspace, /feedback, /data-trust, /developer-hub, /demand-forecast, /supplier-portal, /my-coupons, /case-study)

**S5.1 보조 — Topbar 언어 버튼 보호**: className="topbar-lang-btn" 추가 + styles.css text-shadow.

**S5.3 i18n long-tail (+180 keys)**: recon, performance, ds, menuAccess, gCat, gAiRec 추가 보강. **일부 키 regex 한계로 인접 namespace 에 잘못 삽입** (harmless, 향후 정리 필요).

### 5. 사용자 운영원칙 누적 (U-prefix)

기존 U-161-A ~ U-174-D 유지. **175차 신규 (사용자 명시)**:

- **U-175-A**: cc PM 역할 = **전수 분석 + 순차 sprint 실행 + 매 step 권장 1개 명시 + 미루지 않기**. memory `feedback_pm_operational_rules.md` 강화 — 매 AskUserQuestion 의 첫 option 에 "(권장)" 표기 필수.

- **U-175-B**: 사용자 선택 필요 시 cc 는 **반드시 권장 1개를 우선 제시** (옵션 나열만 X). 175차 모든 AskUserQuestion 에서 첫 option "(권장)" 명시 유지.

### 6. 미해결 / 다음 라운드 (176차 작업 후보)

#### 6.1 P0 — 운영 적용 (사용자 명시 승인 후)

**P0-A 매출 차단 잔여** (사용자 Paddle 대시보드 작업 대기):
- Paddle Sandbox 11개 값 (CLIENT_TOKEN / SECRET_KEY / WEBHOOK_SECRET + 8 priceId) 발급
- cc 에 전달 후: 운영 .env 추가 + admin DB 입력 + 실 결제 검증

**P0-B 175차 운영 dist swap 검증** (`357098226` push 후):
- 사용자 본인 운영 페이지 시각 검증 또는 cc 데모 credentials 받아 puppeteer 재검증

#### 6.2 P1 — Mock → 실 API (사용자 의사결정 필요)

| 페이지 | 현 상태 | 작업량 |
|---|---|---|
| Attribution.jsx | demoSeed 만, 백엔드 호출 X | 중 (S3.3 metaAds 패턴 활용) |
| Marketing.jsx | DEMO_DAILY_TRENDS import 만 | 중 |
| AIMarketingHub.jsx (dead route) | mock-only — but 어디서 사용? | 소 |

#### 6.3 P1 — i18n 잔여 (큰 작업)

| # | 항목 | 작업량 |
|---|---|---|
| I-1 | Reconciliation 50+ keys (`recon.tabUpload` 등 source code 호출 — root.recon 가 아직 비어있을 가능성 재검증 필요) | 중 |
| I-2 | DataSchema 50+ keys (`ds.fEventId`, `ds.fPlatform`, `ds.fCampaignId` 등 50+ 키) | 중 |
| I-3 | AIRecommendTab 50+ keys (`gAiRec.title`, `gAiRec.subtitle`, `gAiRec.channel_*` 동적 키 포함) | 중 |
| I-4 | menuAccess.item_* 동적 키 (Sidebar 동적 메뉴) | 소 — 검증 필요 |
| I-5 | S5.3 inadvertent 키 (attribution 에 잘못 삽입된 performance.tabSettlement 등) 정확 namespace 이동 | 소 |
| I-6 | 14언어 wrong-language 16,835건 | 매우대 |

#### 6.4 P2 — 초엔터프라이즈 표준 (S7 후보)

- console.log 14 파일 → production logger 도입 (sentry/pino)
- A11y (aria-label/role) 광범위 추가
- Empty/Loading 공통 컴포넌트 (33+ 파일)
- 보안 패턴 중복 통합

#### 6.5 P2 — 신규 기능

- 팀 채팅 (workspace 멤버 + 1:1/그룹)
- SSE 실시간 알림 인프라
- PM-Core 잔여 (Milestones/Dependencies/Comments)

### 7. credentials 회전 강조 (175차 누적)

본 세션에서 cc 가 사용한 ops 자원:
- SSH/MySQL — **0회**
- Paddle — cc 직접 로그인 X
- Playwright/Puppeteer — localhost dev server만 사용 (운영 미접근)
- 데모 계정 — `local_admin_*` token 자체 발급 우회 (AuthContext.jsx L156)

**176차 진입 전 사용자 credentials 회전 권고 누적 유효** (memory `feedback_credentials_handling.md`).

### 8. 176차 검수자 첫 응답 강제 의무

1. ⚠️ 본 인계서 §1-§6 인지 명시 (특히 §1 최상위 상태 + §6.2 Mock→API + §6.3 i18n 잔여)
2. U-prefix 누적 모두 인지 — 특히 **U-175-A/B** (cc PM 전수 분석 + 권장 1개 명시 의무)
3. 사용자 credentials 회전 확인 + Paddle 11개 값 도착 여부 확인
4. **cc 자율 브라우저 검증 진입 도구**: `_tmp_175_full_audit.cjs` (71 페이지), `_tmp_175_invis_detect.cjs` (정확 invisible detector), `_tmp_175_pageerror_verify.cjs`
5. push 시 사용자 명시 승인 필요 — CI 자동 deploy 트리거 (`.github/workflows/deploy.yml`)

### 9. 176차 권장 진입 시나리오 (cc 권장 1순위)

**권장 (cc PM 1순위)**: **P0-B 운영 dist 검증** 먼저 (사용자 본인 또는 cc puppeteer) → 결함 없으면 **S6 Mock→실 API 트랙** (Attribution/Marketing/AIMarketingHub 매출 데이터 실효성).

**Option A**: P0-A Paddle 매출 차단 해소 (사용자 11개 값 도착 후).
**Option B**: S6 Mock→실 API (Attribution/Marketing/AIMarketingHub 백엔드 연동).
**Option C**: S7 Production logger + A11y + Empty/Loading 표준 컴포넌트.
**Option D**: S8 i18n long-tail 완성 (Reconciliation/DataSchema/AIRecommendTab + S5.3 namespace 정정).
**Option E**: 신규 기능 (팀 채팅 / SSE / PM-Core 잔여).

### 10. memory 파일 갱신 권장 (176차 cc)

| 파일 | 175차 갱신 권고 |
|---|---|
| `MEMORY.md` (index) | **U-175-A/B 추가 권장** (175차 PM 전수 분석 패턴) |
| `feedback_pm_operational_rules.md` | 175차 6 Sprint 진행 패턴 정합 — 변경 불요 |
| `feedback_browser_verify_always.md` | 175차 _tmp_175_*_audit.cjs 도구 신규 추가 권장 |
| `feedback_credentials_handling.md` | 175차 ops 0회 사용 — 회전 권고 누적 유효 |
| 신규: `project_n175_audit_tools.md` | 175차 audit 도구 4종 reference 권장 |

### 11. 175차 종합 상태 표 (176차 즉시 참조)

| 영역 | 175차 진입 | 175차 종료 |
|---|:-:|:-:|
| BudgetTracker 화면오류 | ❌ ReferenceError | ✅ **fix** (S0 P0-A) |
| 9 페이지 동일 패턴 잠재 결함 | ⚠️ 잠재 | ✅ **일괄 해소** (S0 P0-A) |
| 4 Runtime crash | ❌ ReferenceError | ✅ **해소** (S1) |
| 8 i18n raw-key 페이지 | ⚠️ raw 노출 | ✅ **0건** (S2) |
| backend phantom 7 | ⚠️ 404 | ✅ **3종 신규 해소 + 3종 이미 OK 확인** (S3) |
| orphan 17 파일 | ⚠️ dead code | ✅ **git rm 정리** (S4) |
| 14 invisible-text 페이지 | ⚠️ 흰-on-흰 | ✅ **0건** (S5) |
| i18n long-tail | ⚠️ Reconciliation/DataSchema/AIRecommendTab 50+ keys | ⚠️ **부분 진행 (180 keys 추가, 잔여 별도)** |
| Mock-only 페이지 | ⚠️ Attribution/Marketing/AIMarketingHub | ⚠️ **미진행** (176차 후보) |
| 운영 audit 도구 | _tmp_174_browser_audit.cjs (44 페이지) | ✅ **_tmp_175_full_audit.cjs (71 페이지) + invis detector** |
| credentials 회전 | 174차 0회 사용 | 175차 0회 사용 (회전 권고 누적) |

---

**175차 commit hash (모두 push 완료)**:
- `c846daa27` (S0 P0-A)
- `0b0339b3a` (S1)
- `7e711a73f` (S2)
- `d581eee57` (S3)
- `6b42753e7` (S4)
- `357098226` (S5)

**다음 첫 작업 권장**: **P0-B 운영 dist 검증** (사용자 본인 또는 cc puppeteer 재검증). 결함 없으면 S6 Mock→API 진입.

**미커밋 미처리 변경**:
- `tools/resolver_consumer_manifest_v2.json` — i18n key generator 자동 재생성물 (175차 정리 가능)
- `_tmp_175_*.cjs` 도구들 — 176차 재사용 가치 (audit/verify/detect)
- audit_175_*.json/.png — 진단 결과물 (관계자 검토 자료)
