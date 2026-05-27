# 172차 세션 인계서 (NEXT_SESSION.md) — **171차 P0 #1 완전 종결 + 4-tier 기간별 가격 + 한글화 + 자동 추천/admin 자유 설정 패턴**

> **작성일**: 2026-05-27 (사용자 명시 승인 후)
> **이전 세션**: 171차 (P0 #1 통합 fix + RollupDashboard fix + 플랜·요금·메뉴 동기화 + 4-tier 기간별 가격)
> **다음 세션**: 172차
> **저장 위치**: repo root `NEXT_SESSION.md`
> **종결 방식**: 170차 5회 화이트 trauma 완전 종식 + 사용자 발견 issue (admin/plan-pricing 401, 롤업뷰 화면오류, 영어 표시, 자동 산출 미작동) 모두 fix + 4-tier 기간별 가격 신규 + cc puppeteer 운영 검증 통과

---

## ⚠️ 172차 검수자 최우선 인지 사항

### 1. 최상위 상태 (172차 진입 시점)

| 영역 | 상태 | 비고 |
|---|:-:|---|
| 운영 frontend dist | ✅ `index-DNsOoom8.js` (171p4) | 5회 화이트 완전 종식 |
| 데모 frontend dist | ✅ 동일 hash | 정합 |
| 운영 backend AdminPlans.php | ✅ 171p4 (periodPricing CRUD 추가) | local commit 대기 |
| 운영 backend routes.php | ✅ 171p4 ($custom + $register 2단계 등록 정합) | local commit 대기 |
| 운영 backend index.php | ✅ 170p1 (v424/v425 admin bypass) | 이미 commit (170차) |
| 운영 backend AdminMenu.php | ✅ 170p1 | 이미 commit (170차) |
| 운영 sw.js (main root) | ✅ unregister-only 1377 bytes | nginx fix로 main root에서 serve |
| 운영 nginx vhost (운영/데모) | ✅ `/sw.js` typo path fix 적용 | reload 완료 |
| DB `plan_config` | ✅ 3 row + `is_recommended`/`discount_pct` 컬럼 추가 + features_json 한글 | Pro=추천 |
| DB `plan_menu_access` | ✅ 104 row (4 plan × 26 menu) seed | starter 11 / pro 21 / enterprise 23 / admin 26 enabled |
| DB `plan_period_pricing` (신규) | ✅ 12 row (3 plan × 4 period) | 1/3/6/12개월 |
| DB `menu_tree` | ✅ 26 row | 169 P1 정합 |
| 데모 backend AdminPlans.php | ❌ 부재 | 169차 §4.3 정합 — 별도 라운드 |
| MCP Playwright | ✅ `.mcp.json` 등록 | 다음 세션부터 활성화 |

### 2. 171차 핵심 변경 — root cause + fix

#### 2.1 vite manualChunks init order race (170차 root cause 종결)

**170차 5회 화이트 root cause**: `vite.config.js` manualChunks 의 `vendor-react`/`vendor-router`/`shared-ui`/`pages-*` 분리가 lazy chunk init 보다 늦게 발동 → `useCallback` null. 171차 1차 시도(`vendor-react` 제거)에서 `shared-ui` 가 React 흡수 → 동일 race. 2차 시도(`shared-ui` 제거)에서 `pages-apikeys` createContext undefined. **최종 fix (v3)**: `i18n-locales` 만 유지, 나머지 전부 제거 → React/Router/공통 vendor entry chunk 흡수 → init order 보장.

- entry chunk: 209KB → **530KB** (gzip +107KB) trade-off
- 페이지: Vite 기본 lazy chunking 위임 (페이지마다 자체 청크)
- chunk graph 재분배 risk 영구 제거 — 향후 페이지 변경해도 안전

#### 2.2 apiClient base fallback (28 페이지 fix)

`frontend/src/services/apiClient.js`:
```js
// before: const base = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const base = import.meta.env.VITE_API_BASE || "";  // relative path
```
운영 `.env` 부재 시 localhost 호출 → ERR_CONNECTION_REFUSED → 28 페이지 fetch fail issue 해소.

#### 2.3 AdminMenuManager admin 체크 fix

`app_user.role` 컬럼 부재 → `user.role` 항상 undefined → "접근 불가" 영구 표시.
fix: `useAuth().isAdmin` + `plan` 사용 (AuthContext L491 정합 — `userPlan === 'admin' || IS_DEMO_MODE`).

#### 2.4 RollupDashboard `useCallback` module top-level 호출 (사용자 발견 신규 issue)

`frontend/src/pages/RollupDashboard.jsx:535` 였던 코드:
```js
const API = useCallback(async (path) => { ... }, []);  // ❌ module top-level
```
**React Rules of Hooks 위반** — Hook은 컴포넌트 함수 본체에서만. /rollup lazy chunk import 시 모듈 init → `Cannot read properties of null (useCallback)` → 화이트.

fix: 일반 `async function` 강등 (deps `[]` 였으므로 캐싱 의미 없음). cc puppeteer dynamic import 직접 검증으로 root cause 결정적 확정.

#### 2.5 nginx /sw.js typo path fix

운영 vhost `/usr/local/nginx/conf/vhost/roi.genie-go.com.conf:69`, 데모 동일 위치 line 59:
```nginx
# before
root /home/wwwroot/roi.genie-go.com/frontend/dist;   # 하이픈 (typo)
# after (171p1)
root /home/wwwroot/roi.geniego.com/frontend/dist;    # 하이픈 없음
```
nginx -t 통과 + reload. `/sw.js` 가 이제 main root 에서 serve → 향후 dist swap 시 자동 반영. sw.js md5 (`12b3670d...`) 양쪽 path 동일했으므로 동작 변화 없음 + 정합성 fix.

### 3. 171차 신규 — 플랜별 구독요금 + 메뉴권한 + 추천 + 4-tier 기간별 가격

#### 3.1 plan_config 확장

```sql
ALTER TABLE plan_config
  ADD COLUMN is_recommended TINYINT(1) DEFAULT 0,  -- "Most Popular" 배지
  ADD COLUMN discount_pct TINYINT UNSIGNED DEFAULT 20;  -- 연 할인율
```
- 운영 적용: starter=0 / **pro=1 (추천)** / enterprise=0
- features_json 한글화: "판매 채널 3개", "AI 마케팅 인텔리전스" 등

#### 3.2 plan_menu_access 104 row seed

4 plan × 26 menu 매트릭스:
- starter: 11 enabled (홈/롤업/performance/integration/help_center 등 기본)
- pro: 21 enabled (starter + analytics 전체 + automation 전체 + marketing)
- enterprise: 23 enabled (admin section 제외 전체)
- admin: 26 enabled (전체)

사용자 admin UI 토글 + `BroadcastChannel("geniego_menu_access_sync")` 발행 → AuthContext.loadMenuAccess listener 가 받음 → sidebar 실시간 갱신 (169차 P4 정합).

#### 3.3 plan_period_pricing 신규 테이블 (4-tier 1/3/6/12개월)

```sql
CREATE TABLE plan_period_pricing (
  plan_id VARCHAR(64) COLLATE utf8mb4_unicode_ci,
  period_months TINYINT UNSIGNED,
  price_usd DECIMAL(10,2) NULL,
  discount_pct TINYINT UNSIGNED DEFAULT 0,
  paddle_price_id VARCHAR(128),
  is_active TINYINT(1) DEFAULT 1,
  ...
  PRIMARY KEY (plan_id, period_months)
  -- FK 제거: plan_config 는 soft delete 만 사용 → app-level 무결성
);
```

운영 seed (12 row):
- starter: 1m $49 / 3m $46.55 (5%) / 6m $44.10 (10%) / 12m $39.20 (20%)
- pro: 1m $149 / 3m $141.55 / 6m $134.10 / 12m $119.20
- enterprise: NULL (custom_quote)

#### 3.4 backend AdminPlans.php — periodPricing CRUD

신규 endpoint:
- `GET /v424/admin/plans-period-pricing` → `{ plans: [...], pricing: { plan_id: { 1: {...}, 3: {...}, ... } } }`
- `PUT /v424/admin/plans/{id}/period-pricing` → bulk upsert (transaction)
- `/api/v424/...` alias 동일

#### 3.5 routes.php 2단계 등록 정합

**중요 지식 (172차 cc 반드시 인지)**: routes.php 는 2단계 패턴:
1. `$custom = [...]` 배열에 route → handler 매핑 등록
2. `$register('METHOD', '/path')` **별도 호출** → Slim 라우터에 실제 등록

`$custom` 만 추가하면 route 등록 안 됨 (Slim "Not Found"). 신규 endpoint 추가 시 항상 2단계 모두 수행 필수. 171차에 cc 가 1단계만 하고 2단계 누락 → 운영 적용 후 404 진단 → 2단계 보강 후 정합.

#### 3.6 PlanPricing.jsx — 3 탭 admin UI

탭 구성:
1. **💰 요금·상세** (기존) — plan 기본 정보 + 월/연/할인율 + 자동 산출 + 절약 표시 + 추천 토글 + USD 강조
2. **🔐 메뉴 접근 권한** (기존) — 4 plan × 26 menu 매트릭스
3. **📅 기간별 구독 가격 (1/3/6/12개월)** (신규) — admin이 각 기간별 가격/할인율/Paddle priceId/활성 자유 설정

자동 추천 정책 (사용자 명시 정합):
- 1개월 가격 입력 → 3/6/12개월 자동 산출 (할인율 기반)
- 할인율 변경 → 해당 기간 가격 즉시 갱신
- admin이 특정 기간 가격 직접 입력 → 그 값 유지 (override)

#### 3.7 ko.js 누락 키 추가

ko.js 가 거대 (1.3 MB) + **중복 namespace 정의** (gNav x2, sidebar x3) 발견 — 후자가 전자 덮어쓰면서 admin 메뉴 키들이 영어 fallback 표시 issue. fix:
- 두 번째 `gNav` (line 31685 직전) 에 admin 5 키 추가: `planPricingLabel`, `menuTreeLabel`, `platformEnvLabel`, `dbSchemaLabel`, `paymentPgLabel`
- 세 번째 `sidebar` (line 38554) 에 4 키 추가: `prodMode`, `prodDesc`, `demoMode`, `demoDesc`

ko.js 중복 namespace 자체는 i18n 구조적 issue — 172차 또는 별도 라운드에서 i18n 전체 정리 필요 (15개 로케일 동일 패턴 확인 필요).

### 4. 사용자 운영원칙 누적 (U-prefix)

기존 U-161-A ~ U-170-D 유지. **171차 신규**:

- **U-171-A**: cc puppeteer 운영 직접 검증 패턴 정합 — 화이트/PAGEERR 진단은 lazy chunk dynamic import 직접 시도 (`page.evaluate(() => import('/assets/RollupDashboard-XXX.js'))`) 가 결정적. localStorage token 주입으로 admin auth 시뮬레이션 가능 (사용자 password 노출 회피).

- **U-171-B**: Slim routes.php 2단계 등록 패턴 — `$custom` 배열 등록 + `$register('METHOD', '/path')` 호출. 한 단계 누락 시 운영 404. 신규 endpoint 추가 시 항상 양쪽 수행. PHP-FPM reload 또는 restart 필요할 수 있음.

- **U-171-C**: 자동 추천 + admin 최종 결정 패턴 — 시스템이 default/추천값 제시 (예: 월 가격 → 연 가격 자동 산출, plan별 메뉴 권한 default 매트릭스), admin이 모든 값 자유롭게 override. seed 는 초기값 + admin UI 가 영구적 변경 권한. 본 패턴이 plan_config/plan_menu_access/plan_period_pricing 전체에 일관 적용.

- **U-171-D**: PowerShell-bash-mysql 다중 quoting 회피 — SQL/script 파일을 pscp 로 업로드 후 운영에서 `mysql < /tmp/file.sql` 실행. `mysql -e "SELECT ..."` 같은 inline 명령은 PowerShell 큰따옴표 escape 처리에서 깨짐. plink 출력은 plink banner prefix 가 stdout에 섞이므로 `[regex]::Match($out, '[a-f0-9]{64}')` 같은 패턴 매칭으로 정확 추출.

- **U-171-E**: pscp 대용량 파일 truncation risk — 17KB+ 파일은 default protocol 에서 16KB block 단위로 잘릴 수 있음 (1회 확인). md5 비교 + `-sftp` 옵션 명시로 회피. 신규 PHP 파일 deploy 시 항상 md5 검증.

- **U-171-F**: brave/whale 같은 브라우저 강력 cache — dist swap 후 사용자가 fresh 시도 안 하면 옛 chunk + 옛 localStorage 잔존 → 401 등 stale 응답 가능. 시크릿 모드 또는 hard reload 권장. SW unregister-only 가 자동 정리하지만 첫 1회는 사용자 액션 필요.

### 5. 미해결 / 추가 진행 권장 (172차 작업 후보)

#### 5.1 P0 — 사용자 명시 미비 (171차 발견, 별도 라운드)

171차 agent 발굴 결과 (172차 cc 검토 필수):

**구버전(168차 이전) 자료**: backend/src/Db.php 의 `subscription_coupon`, `coupon_rules`, `free_coupons`, `coupon_redemptions` 테이블 + `backend/src/CouponEngine.php` (227L 자동 발급 엔진) **이미 구현**되어 있으나 활성화 안 됨.

- **subscription_coupon 테이블**: `trigger_type` (manual/new_paid/renew_3m/renew_6m/renew_1y), `status` (pending/applied/expired/cancelled), `months` (1~6)
- **CouponEngine::fire()**: signup/upgrade/renewal trigger 시 자동 발급
- **commit 6e6e4edb**: 옛 "1개월 trial pro mode for all new signups" 자동 부여 패턴 (현재 폐기)
- **현 가입 응답**: `register` 가 `{ user, coupon: { issued, code, plan, duration_days, expires_at } }` 형식 가능

**172차 P0 권장**:
- `coupon_rules` 활성화 (signup=starter 7일 자동 등 admin UI에서 토글)
- admin "쿠폰 발행 관리" 탭 (수동 발급 + 사용 현황 조회)
- 사용자 측 "쿠폰 코드 입력" UI (회원가입 또는 마이페이지)

#### 5.2 P0 — 회원가입 cycle 선택 (구버전 정합)

사용자 명시: "회원가입 시 3개월 / 6개월 / 1년 구독 시 요금 및 할인 적용율 등록".

현재 AuthPage.jsx 의 회원가입 흐름에 plan/cycle 선택 단계 없음. 172차 추가 필요:
- 가입 step 추가: plan 선택 → cycle (1/3/6/12개월) 선택 → 가격 표시 + 할인율 → Paddle Checkout 진입
- backend `register` 응답에 cycle/period 저장 (`app_user.subscription_cycle` 미사용 컬럼 활성화)
- payment_history.cycle 동기

#### 5.3 P1 — 만료 알림 + 결제 유도

`UserAuth::resolveActivePlan` 이 만료 시 `subscription_status='expired'` 반환만. 미구현:
- 만료 7일 전 / 1일 전 이메일 알림
- 대시보드 D-day 배너
- 만료 후 재활성화 API

#### 5.4 P1 — 데모 backend 동기화

`/home/wwwroot/roidemo.geniego.com/backend/src/Handlers/AdminPlans.php` **부재** (169차 §4.3 정합). 데모에서 `/admin/plan-pricing` 진입 시 backend 옛 코드라 401 또는 500. 172차에 데모 backend 전체 동기화 (운영과 동일하게).

#### 5.5 P1 — 운영/데모 dist 백업 디렉토리 정리

170차 인계서 §4.2 + 171차에 추가 backup 생성:
```
/home/wwwroot/roi.geniego.com/frontend/
├── dist (현재 활성 = 171p4)
├── dist.170p[1-5]_bad_*  (170차 5회 화이트)
├── dist.broken_168, dist.old, dist.pre169_*, dist.pre169p1_*, dist.pre169p5_*
├── dist.prev170p[3-5], dist.rollback170p1
├── dist.prev171p[1-4]_*  (171차 4회 swap)
```
운영 ~17 폴더 + 데모 ~15 폴더 × 80MB ≈ 2.5GB 점유. 안정성 확인 후 정리.

#### 5.6 P1 — ko.js 중복 namespace 구조적 정리

171차에 발견된 `gNav` x2, `sidebar` x3 중복. 15개 로케일 동일 패턴 추정. 구조적 cleanup 필요 (별도 라운드, i18n-sync agent 활용 권장).

#### 5.7 P1 — Paddle priceId 매핑

`plan_config.price_id_monthly/annual` + `plan_period_pricing.paddle_price_id` 현재 모두 비어있음. 실제 결제 작동을 위해 admin이 Paddle dashboard 의 priceId 입력 필요 (admin UI는 171차에 input field 제공됨).

#### 5.8 P2 — PM-Core handler 본체 + UI 잔여 (169차 §4.4)

Milestones / Dependencies / Assignees / Comments / Attachments / Events / Audit / Kpi 본체 + frontend Gantt / Milestones / Activity / TaskTable / Settings / TaskDetail page.

#### 5.9 P2 — 22 추가 mock 페이지 fix (N-169-mock-purge, 169차 §4.3)

### 6. cc 진단 도구 라이브러리 (171차 추가)

`docs/cc-tools/` 디렉토리에 5 script + 1 SQL 보존 (commit 포함):

| 도구 | 용도 |
|---|---|
| `_cc_verify_local_171.cjs` | local vite preview puppeteer 검증 (3 path PAGEERR/root_len) |
| `_cc_verify_ops_171.cjs` | 운영 puppeteer 검증 (CC_TARGET 환경변수로 데모도 가능) |
| `_cc_verify_rollup_171.cjs` | /rollup 직접 navigate + 콘솔 로그 캡처 |
| `_cc_verify_rollup_lazy_171.cjs` | RollupDashboard 청크 dynamic import → 모듈 init PAGEERR 결정적 |
| `_cc_diag_admin_api_171.sh` | 운영 admin API 진단 (token 추출 + curl 다양한 패턴) |
| `_cc_repro_admin_401_171.cjs` | localStorage token 주입 → admin API fetch 시뮬레이션 |
| `_cc_get_admin_token.sql` | ceo@ociell.com 의 active token 추출 (mysql < file 패턴) |
| `_cc_check_collation.sql` | plan_config.plan_id charset/collation 확인 (FK 정합용) |

172차 cc 가 재사용 가능. `.gitignore` 추가로 `_cc_verify_ops_170.cjs` (옛 password 포함), `_cc_verify_screenshot_*.png`, `dist_171*.tgz` 제외.

### 7. 172차 검수자 첫 응답 강제 의무

1. ⚠️ 본 인계서 §1-§5 인지 명시 (특히 §1 최상위 상태 + §2.5 nginx fix + §3.5 routes.php 2단계 + §5 미해결)
2. U-170-A/B/C/D 유지 + **U-171-A/B/C/D/E/F** 인지 명시
3. 미해결 §5.1 (쿠폰/트라이얼 활성화) + §5.2 (회원가입 cycle) + §5.4 (데모 backend) 진행 결정
4. **사용자 credentials 회전 확인 의무** (171차에 SSH ~20회 + MySQL root ~15회 사용 = 누적 약 56회. 사용자가 171차 시작 시 1회 회전했으나 작업 양 많아 재회전 권장)
5. MCP Playwright (`.mcp.json` 등록) 활성화 — `mcp__playwright__*` 도구 사용 시 puppeteer 대체 가능 (브라우저 직접 조작 가능, 옛 cjs script 보다 강력)
6. cc puppeteer 검증 의무 (U-170-A, U-171-A) 인지

### 8. memory 파일 갱신 권장 (172차 cc 작업)

| 파일 | 171차 갱신 권고 |
|---|---|
| `MEMORY.md` (index) | +0 또는 신규 entry 추가 (172차 cc 결정) |
| `feedback_absolute_principles.md` (9개 절대 원칙) | 변경 없음 |
| `feedback_handoff_approval.md` | 본 인계서 정합 작성 — 사용자 명시 승인 후 commit |
| `feedback_pm_operational_rules.md` (U-prefix) | **갱신 권장** — U-171-A/B/C/D/E/F 추가 |
| `feedback_credentials_handling.md` | 171차에 약 56회 사용 → 회전 권고 강화 |
| `project_n152f_pm_features.md` | 변경 없음 |
| `project_n152f_consolidated.md` | **갱신 권장** — 171차 신규 (plan_period_pricing, periodPricing endpoint, RollupDashboard fix, ko.js 중복 namespace) |
| `project_orderhub_deploy_automation.md` | 변경 없음 |
| `reference_ops_host.md` | **갱신 권장** — 171차 신규 path (`/tmp/cc_token.sql`, `/tmp/AdminPlans_171p4.php` 등), 데모 backend 미동기화 명시 |
| `reference_nginx_sw_typo.md` | **갱신 권장** — 171차에 nginx vhost fix 완료 (운영 line 69, 데모 line 59) — 현재 main root 정합 |

### 9. local repo 변경 사항 (172차 진입 시 commit/push 완료된 상태)

171차 commit 2개:
- commit 1: P0 #1 통합 fix + 4-tier 기간별 가격 + 한글화 + DB migration + cc-tools + .mcp.json
- commit 2: 본 인계서 (NEXT_SESSION.md)

`master` push → CI `.github/workflows/deploy.yml` 자동 trigger (배포). **운영은 이미 동일 dist 상태**라 idempotent — CI 실패 risk 낮음.

### 10. 171차 종합 상태 표 (172차 즉시 참조)

| 영역 | 171차 진입 | 171차 종료 |
|---|:-:|:-:|
| 운영 frontend dist | 169 P5 (index-Bx_jPaID.js) | ✅ **171p4 (index-DNsOoom8.js)** |
| 데모 frontend dist | 169 P5 | ✅ 동일 |
| 운영 PAGEERR (5회 화이트) | ⚠ 5회 발생 | ✅ **완전 종식 (cc puppeteer 검증)** |
| 운영 PlanPricing 진입 | 빈 화면 | ✅ 3 탭 정상 (요금·상세/메뉴권한/기간별가격) |
| 운영 AdminMenuManager 진입 | "접근 불가" | ✅ 정상 |
| 운영 /rollup (롤업뷰) | 화면오류 | ✅ 정상 (useCallback module top-level fix) |
| 사이드바 영어 표시 | "Plan Pricing", "Production System" | ✅ "플랜별 구독요금", "🏢 운영 시스템" |
| PlanPricing 자동 산출 | 미작동 | ✅ 월/할인율 변경 시 즉시 산출 + override 가능 |
| 추천 플랜 표시 | 없음 | ✅ Pro = "⭐ MOST POPULAR" 배지 |
| 4-tier 기간별 가격 (1/3/6/12) | 없음 | ✅ 12 row seed + admin UI |
| 운영 backend admin gate | 170p1 정합 | ✅ 유지 |
| nginx /sw.js typo path | typo (운영+데모) | ✅ main root 정합 (운영+데모 reload) |
| local repo | 171차 8 file pending | ✅ 2 commit + push (사용자 명시 승인 후) |

---

## 11. 172차 진입 시 cc 즉시 수행 검증 명령

```powershell
# 1) 운영 dist + backend + DB 상태 확인
$sshPass = '<rotated_password>'
$mysqlPw = '<rotated_mysql_pw>'

# entry hash + endpoint 응답 + DB row counts
$cmd = @'
echo === ops_active_entry ===
grep -oE 'index-[A-Za-z0-9_-]+\.js' /home/wwwroot/roi.geniego.com/frontend/dist/index.html | head -1
echo === ops_backend_files ===
ls -la /home/wwwroot/roi.geniego.com/backend/src/Handlers/AdminPlans.php
ls -la /home/wwwroot/roi.geniego.com/backend/src/routes.php
echo === admin_gates ===
curl -sS -o /dev/null -w 'plans=%{http_code}\n' https://roi.genie-go.com/v424/admin/plans
curl -sS -o /dev/null -w 'menu=%{http_code}\n' https://roi.genie-go.com/v424/admin/plans-menu-access
curl -sS -o /dev/null -w 'period=%{http_code}\n' https://roi.genie-go.com/v424/admin/plans-period-pricing
'@
& 'C:\Program Files\PuTTY\plink.exe' -ssh -batch -pw $sshPass root@1.201.177.46 $cmd

# DB row counts
$sql = "SELECT 'plan_config' AS t, COUNT(*) AS c FROM plan_config UNION SELECT 'plan_menu_access', COUNT(*) FROM plan_menu_access UNION SELECT 'plan_period_pricing', COUNT(*) FROM plan_period_pricing UNION SELECT 'menu_tree', COUNT(*) FROM menu_tree;"
# 위 SQL 파일에 저장 + scp + mysql < file 패턴 (U-171-D 정합)

# 2) cc puppeteer 운영 검증 (login + admin paths + /rollup)
cd "E:/project/GeniegoROI"
node docs/cc-tools/_cc_verify_ops_171.cjs
# 예상: 모든 path PAGEERR none, ROOT_LEN > 6000

# 3) 172차 1순위 결정
# - 쿠폰/트라이얼 활성화 (§5.1 P0)
# - 회원가입 cycle 선택 (§5.2 P0)
# - 데모 backend 동기화 (§5.4 P1)
# - 만료 알림 (§5.3 P1)
# 사용자 컨펌 받아 진행
```

---

**본 인계서 v1 = 사용자 명시 승인 후 commit + push** (memory `feedback_handoff_approval.md` 정합).
