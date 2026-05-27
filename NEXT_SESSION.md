# 171차 세션 인계서 (NEXT_SESSION.md) — **170차 P0 #1 5회 화이트 + cc puppeteer root cause 확정 + 5회 rollback + 본 phase 종결**

> **작성일**: 2026-05-27 (사용자 명시 승인 후)
> **이전 세션**: 170차 (P0 #1 진단 + backend 적용 + frontend 5회 deploy 실패)
> **다음 세션**: 171차
> **저장 위치**: repo root `NEXT_SESSION.md`
> **종결 방식**: **backend 170p1 admin gate 운영 적용 commit 준비 + frontend 169 P5 정합 유지 + sw.js unregister-only deploy + cc puppeteer 직접 검증으로 root cause 확정**

---

## ⚠️ 171차 검수자 최우선 인지 사항

### 1. 최상위 상태 — 170차 결과

**170차 = P0 #1 (PlanPricing/AdminMenuManager 진입 불가) 진단 완료 + backend admin gate 운영 적용 + DB 3 plan seed + sw.js unregister-only 적용 + frontend 5회 화이트 후 5회 rollback → 본 phase 안전 우선 종결.**

**최종 운영 상태** (171차 진입 시점):

| 영역 | 상태 | 비고 |
|---|:-:|---|
| 운영 frontend dist | ✅ 169 P5 정합 `index-Bx_jPaID.js` | 5회 rollback 후 |
| 데모 frontend dist | ✅ 169 P5 정합 `index-Bx_jPaID.js` | 동일 |
| 운영 backend `index.php` | ✅ 170p1 admin gate bypass (v424/v425/admin) | commit 대기 |
| 운영 backend `AdminPlans.php` | ✅ 170p1 (7 method admin gate) | commit 대기 |
| 운영 backend `AdminMenu.php` | ✅ 170p1 (gate() admin minRole 분기) | commit 대기 |
| 운영 sw.js (typo path `roi.genie-go.com`) | ✅ NEW unregister-only 1377 bytes | commit 대기 |
| 데모 sw.js (typo path `roidemo.genie-go.com`) | ✅ NEW unregister-only 1377 bytes | 동일 |
| 운영 DB `plan_config` seed | ✅ 3 row (starter/pro/enterprise) | 보존 |
| 운영 DB `plan_menu_access` | ⚠️ 0 row (PlanPricing 진입 못 해서 채우지 못함) | 171차 |
| php8.1-fpm | ✅ active | |
| `/v424/health` | ✅ 200 | |
| `/v424/admin/plans` (no auth) | ✅ 401 (admin gate 작동) | |
| `/v425/admin/menu-tree` (no auth) | ✅ 401 (gate() admin 분기 작동) | |
| 운영 root | ✅ 200 (화이트 없음, cc puppeteer 검증) | |

**P0 #1 미해결** ❌:
- AdminMenuManager (`/admin/menu-tree`) — "접근 불가" 표시 (frontend `user.role` 체크, DB `role` 컬럼 없음)
- PlanPricing (`/admin/plan-pricing`) — 페이지 진입 가능하나 apiClient base=`localhost:8000` fallback fail → 빈 화면

### 2. cc puppeteer 직접 검증으로 root cause 결정적 확정

170차 4회 deploy 후 사용자 화이트 호소 → cc가 puppeteer headless 설치 + 운영 직접 접속 검증:

**170p5 dist (B_HhJz2K) — fresh headless (SW/cache 없음)**:
```
PAGEERR: Cannot read properties of null (reading 'useCallback')
TypeError: Cannot read properties of null (reading 'useCallback')
    at vendor-react-DuxosCKn.js:1:6273
    at pages-ai-CoKrPWkS.js:47:65790
```

**169 P5 dist (Bx_jPaID) — fresh headless**: ✅ login 페이지 정상 render

⇒ **170차 화이트 root cause = vite.config.js `manualChunks` 의 vendor-react 분리가 PlanPricing.jsx 변경 후 chunk graph 재분배 시 init order race condition 야기** (SW/cache 무관, build 자체 issue).

**부가 발견** (cc 진단 중):
- nginx vhost typo: `location = /sw.js { root /home/wwwroot/roi.genie-go.com/...; }` (하이픈) — main root는 `roi.geniego.com` (하이픈 없음). sw.js만 별도 typo 디렉토리에서 serve됨. dist swap 시 sw.js 미반영 → 옛 SW가 chunk 강제 캐싱 → 화이트 보조 트리거.
- `apiClient.js` L1 `const base = import.meta.env.VITE_API_BASE || "http://localhost:8000";` — `.env` 파일 부재로 fallback 적용 → 운영 브라우저가 localhost 호출 → CORS fail (28 페이지 영향, cc puppeteer로 OrderHub 등 `ERR_CONNECTION_REFUSED` 직접 확인).

### 3. 사용자 운영원칙 누적 (U-prefix)

기존 U-161-A ~ U-169-D 유지. **170차 신규**:

- **U-170-A**: frontend dist swap 후 cc puppeteer headless 직접 검증 필수. 사용자 브라우저 화이트 호소 시 SW/cache 영향 배제 위해 fresh browser 시뮬레이션 (puppeteer `headless: 'new'` + `--no-sandbox`). cc 진단 script = `_cc_verify_ops_170.cjs` 패턴 (콘솔 로그 + pageerror + failedRequests + screenshot).
- **U-170-B**: nginx vhost `location = /sw.js` root 정합성 점검 의무. 새 dist swap 시 sw.js 위치가 main root 와 동일한지 확인. 운영 환경의 typo (`genie-go` vs `geniego`) 가 1회 deploy 화이트 트리거.
- **U-170-C**: vite manualChunks 변경 (vendor-react 분리 등) 은 init order race risk. PlanPricing.jsx 같은 단일 페이지 변경도 chunk graph 재분배 야기 → 전체 build 영향. 변경 후 cc puppeteer 검증 의무.
- **U-170-D**: PWA Service Worker 가 chunk 강제 캐싱 — dist swap 후 옛 SW 잔존으로 새 chunk 못 받음 → 화이트. unregister-only sw.js 가 정합 fix (본 phase 적용). 향후 PWA 기능 필요 시 SW를 cache-first → network-first 전환.

기존 N-prefix 유지. **170차 신규**:
- **N-170-vite-fix**: vite.config.js `manualChunks` 의 vendor-react/vendor-router 분리 제거 (entry 흡수) → init order 안정. 171차 P0 #1 통합 fix 의 일부.
- **N-170-apiclient-base**: apiClient.js L1 base fallback `localhost:8000` → `""` (relative path, 동일 origin). 28 페이지 영향 — 171차 P0 #1 통합 fix.
- **N-170-nginx-typo**: nginx vhost (`/usr/local/nginx/conf/vhost/{roi,roidemo}.genie-go.com.conf`) `location = /sw.js` root → main root 정합 (`roi.geniego.com`, 하이픈 없음).
- **N-170-pwa-strategy**: PWA SW를 unregister-only 로 영구 유지하거나, 향후 PWA 기능 필요 시 cache-first → network-first 전환. 본 170차에 unregister-only sw.js 적용.

### 4. 171차 검수자 첫 응답 의무

- ⚠️ 본 인계서 §1-§5 인지 명시 (특히 §1 최상위 상태 + §2 cc puppeteer root cause)
- U-170-A/B/C/D 인지 명시
- **P0 #1 미해결 인지 + 171차 1순위 통합 fix 진행 결정** (cc 권장: vite.config.js + apiClient + nginx + PlanPricing 통합 fix)
- 5회 화이트 trauma 인지 → 향후 frontend dist 변경 시 cc puppeteer 검증 의무
- 사용자 credentials 회전 확인 의무 (운영 SSH + MySQL root 169차에 9회 + 170차에 12회 추가 사용)

---

## 1. 170차 작업 시퀀스 (5회 화이트 → 5회 rollback)

| Phase | 변경 영역 | 결과 | rollback |
|:-:|---|:-:|:-:|
| 170p1 | backend 3 file (admin gate) + frontend dist (PlanPricing + AdminMenuManager fix) | ❌ 화이트 | ✅ 1차 rollback (169 P5) |
| 170p2 | frontend dist (PlanPricing useAuth 제거 + AdminMenuManager 유지) | ❌ 화이트 | ✅ 2차 rollback |
| 170p3 | frontend dist (apiClient base fallback `localhost:8000` → `""` fix) | ❌ 화이트 | ✅ 3차 rollback |
| 170p4 | frontend dist (apiClient fix + index.html v6.1.0 cache-bust bump) | ❌ 화이트 | ✅ 4차 rollback (긴급 — 잘못된 timestamp tgz 로 dist 사라짐 → `dist.prev170p4` mv 로 즉시 복구) |
| 170p5 | backend only redeploy + frontend dist (PlanPricing inline fetch + index.html v6.1.0) | ❌ 화이트 (cc puppeteer 확정) | ✅ 5차 rollback |

**4차 rollback 시 긴급 issue**: backup tgz timestamp 가정 실패 (`pre170p4_20260527_092951` vs 실제 `pre170p4_20260527_092619`) → tar extract fail → dist 사라짐 → ops/demo root 404 → `dist.prev170p4` 폴더 mv 로 즉시 복구. **U-170-A 정합 (검증 + backup timestamp 정확성)**.

### 1.1 cc puppeteer 검증 절차 (U-170-A 정합)

**Script** (`_cc_verify_ops_170.cjs`, 본 phase 작성 + 171차 보존 권장):
```js
const puppeteer = require('puppeteer');
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'] });
const page = await browser.newPage();
page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', err => pageErrors.push(`PAGEERR: ${err.message}\n${err.stack}`));
page.on('requestfailed', req => failedRequests.push(`FAIL: ${req.url()} (${req.failure().errorText})`));
await page.goto('https://roi.genie-go.com/login', { waitUntil: 'networkidle2', timeout: 30000 });
// 콘솔 로그 + pageerror + failedRequests + screenshot 출력
```

**170p5 vs 169 P5 비교 결과**:
```
[170p5 dist B_HhJz2K]
ROOT_INNER_HTML: '' (빈 — React render 실패)
PAGEERR: Cannot read properties of null (reading 'useCallback')
       at vendor-react-DuxosCKn.js:1:6273
       at pages-ai-CoKrPWkS.js:47:65790

[169 P5 dist Bx_jPaID]
ROOT_INNER_HTML: <div style="min-height: 100vh; ..."> (login UI 정상 render)
PAGEERR: (없음)
FAIL: http://localhost:8000/api/v424/orderhub/orders (apiClient base fallback issue, 별도)
```

⇒ **170p5의 PlanPricing.jsx + index.html 변경이 vite chunk graph 재분배 → vendor-react init order race → useCallback null**.

### 1.2 nginx /sw.js typo (U-170-B)

```nginx
# /usr/local/nginx/conf/vhost/roi.genie-go.com.conf
server {
    root /home/wwwroot/roi.geniego.com/frontend/dist;  # 정확 (geniego, 하이픈 없음)
    ...
    location = /sw.js {
        ...
        root /home/wwwroot/roi.genie-go.com/frontend/dist;  # typo (genie-go, 하이픈 있음!)
    }
}
```

⇒ dist swap 시 sw.js 만 `/home/wwwroot/roi.genie-go.com/frontend/dist/sw.js` 에서 serve. 본 phase 직접 복사로 우회 적용. 171차에 nginx config fix 필요.

---

## 2. 운영 적용 사항 (171차 진입 시점 보존됨)

### 2.1 Backend (운영만, 데모 미동기화)

| 파일 | 변경 | 운영 적용 |
|---|---|:-:|
| `backend/public/index.php` | v424/v425 admin bypass 4 path 추가 (L86-89, v423/admin 정합) | ✅ |
| `backend/src/Handlers/AdminPlans.php` | `use UserAuth` + 7 method (list/upsert/delete/dbStats/paddleStats/menuAccessAll/menuAccessUpsert) 에 `UserAuth::requirePlan(.., 'admin')` gate 추가. publicPlans 제외 (public bypass 정합). | ✅ |
| `backend/src/Handlers/AdminMenu.php` | `use UserAuth` + `gate()` 함수에 admin minRole 분기 (token-based) + viewer/connector/analyst 기존 attribute 방식 유지 | ✅ |

**Backup** (운영 `/tmp/`):
- `index.php.pre170p1_20260527_090215`
- `AdminPlans.php.pre170p1_20260527_090215`
- `AdminMenu.php.pre170p1_20260527_090215`

### 2.2 Frontend (운영 + 데모)

| 파일 | 변경 | 운영 적용 |
|---|---|:-:|
| dist (전체) | 169 P5 정합 유지 (5회 rollback 후) | ✅ active `index-Bx_jPaID.js` |
| `sw.js` (typo path `roi.genie-go.com/frontend/dist`) | unregister-only 1377 bytes (caches.delete + self.unregister + clients.navigate) | ✅ |
| `sw.js` (typo path `roidemo.genie-go.com/frontend/dist`) | 동일 unregister-only | ✅ |

**Backup** (운영 `/tmp/`):
- `frontend_ops_dist_pre170p1_20260527_090215.tgz`
- `frontend_demo_dist_pre170p1_20260527_090215.tgz`
- ... pre170p2 / pre170p3 / pre170p4 / pre170p5 각 운영/데모 = 총 10 tgz (디스크 정리 필요 — `/tmp/` 약 120 MB)

### 2.3 DB (운영만)

```sql
-- plan_config seed (170차에 추가)
INSERT INTO plan_config (plan_id, name, description, price_usd, price_annual_usd, ...)
VALUES
  ('starter','Starter','소규모 팀 · 단일 채널 운영', 49.00, 39.00, ...),
  ('pro','Pro','성장 브랜드 · 멀티채널 운영', 149.00, 119.00, ...),
  ('enterprise','Enterprise','대규모 운영 · 맞춤 통합', NULL, NULL, ...)
ON DUPLICATE KEY UPDATE ...;
```

`plan_menu_access` = 0 row (PlanPricing 진입 못 해서 admin 이 매트릭스 작성 불가).

### 2.4 운영 dist 디렉토리 잔존 (정리 필요)

```
/home/wwwroot/roi.geniego.com/frontend/
├── dist (현재 활성 = 169 P5)
├── dist.170p1_bad_*  (170p1 화이트 dist)
├── dist.170p2_bad_*  (170p2 화이트 dist)
├── dist.170p3_bad_*  (170p3 화이트 dist)
├── dist.170p4_bad_*  (170p4 화이트 dist)
├── dist.170p5_bad_*  (170p5 화이트 dist)
├── dist.broken_168, dist.old, dist.pre169_*, dist.pre169p1_*, dist.pre169p5_*
├── dist.prev170p3, dist.prev170p4, dist.prev170p5, dist.rollback170p1
```

171차에 운영/데모 백업 디렉토리 정리 권장 (현재 ~12 폴더 × 80MB ≈ 1GB 점유).

### 2.5 운영 user_session 검증 (170차 진단)

```
admin user = ceo@ociell.com (id=5, plan='admin', is_active=1)
user_session row 1개 (active, expires_at=2026-06-25)
plan_distribution: admin=1, demo=2, pro=2
app_user 스키마: role 컬럼 부재! (plan='admin'이 사실상 admin role 대체)
```

170차 발견 정합 — AdminMenuManager의 `user.role === 'admin'` 체크는 항상 false → "접근 불가" 표시. 171차에 `user.plan === 'admin'` 으로 fix (또는 useAuth `isAdmin` 사용) 필요.

---

## 3. local repo 변경 사항 (commit 대기)

```
M  backend/public/index.php             (v424/v425 admin bypass 4 path 추가)
M  backend/src/Handlers/AdminMenu.php   (gate() admin minRole 분기)
M  backend/src/Handlers/AdminPlans.php  (7 method admin gate)
M  frontend/public/sw.js                (unregister-only)
M  tools/resolver_consumer_manifest_v2.json  (170차 무관, 별도)
?? _cc_verify_ops_170.cjs               (cc puppeteer 진단 script — 보존 권장)
?? _cc_verify_screenshot_login.png      (cc 진단 screenshot)
?? data/genie_geniego_roi.sqlite        (170차 무관)
?? docs/spec/docs/                      (170차 무관)
?? session157_collisions/, session157_wronglang/  (170차 무관)
?? triage_*.json, triage_out_ko/        (170차 무관)
```

**170차 commit 권장**: backend 3 file + sw.js + 본 인계서. **사용자 명시 승인 후 commit** (memory `feedback_handoff_approval.md` 정합).

`_cc_verify_*` 산물 — 171차에 cc 가 재사용할 수 있도록 `_cc_verify_ops_170.cjs` 보존 권장 (gitignore 추가 또는 별도 docs/cc-tools/ 이동).

---

## 4. 171차 1순위 작업 (cc 권장)

### 4.1 권장 1순위 (P0 #1 통합 fix)

**fix 4 영역 동시 진행 + cc puppeteer 즉시 검증**:

1. **`vite.config.js` manualChunks 수정** (N-170-vite-fix):
   ```js
   // 현재 (170차 4회 화이트 root cause)
   if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
     return 'vendor-react';
   }
   // 제안 (entry 흡수 — init order 보장)
   // ↑ 위 블록 제거. React를 entry chunk에 통합 → 모든 lazy chunk가 entry init 후 React 안정 사용.
   // 또는: vendor-react 유지하되 entry에서 명시적 `import 'react'` 강제 (main.jsx 첫 줄).
   ```

2. **`apiClient.js` base fallback fix** (N-170-apiclient-base):
   ```js
   // 현재
   const base = import.meta.env.VITE_API_BASE || "http://localhost:8000";
   // 제안
   const base = import.meta.env.VITE_API_BASE || "";  // relative path = 동일 origin
   ```

3. **nginx vhost typo fix** (N-170-nginx-typo):
   ```nginx
   # 운영 + 데모 vhost 둘 다
   location = /sw.js {
       root /home/wwwroot/roi.geniego.com/frontend/dist;  # 하이픈 제거
   }
   ```

4. **`AdminMenuManager.jsx` + `PlanPricing.jsx` fix**:
   - AdminMenuManager L17-22, L122: `user.role === 'admin'` → `useAuth().plan === 'admin'` 또는 `useAuth().isAdmin`
   - PlanPricing: useAuth import 또는 localStorage 직접 admin check
   - 단, **단순 변경도 chunk graph 영향 → vite.config.js fix 후에 진행**

5. **clean build + cc puppeteer 검증 의무**:
   ```powershell
   cd "E:/project/GeniegoROI"
   rm -rf frontend/node_modules/.vite frontend/.vite
   npm run build
   node _cc_verify_ops_170.cjs  # 운영 deploy 전 local dev server 또는 운영 staging 검증
   ```

6. **운영 + 데모 통합 deploy** (이번엔 vite.config.js fix 적용 후 한 번에):
   - backend (이미 적용, 추가 변경 없음 — 단, AdminMenu/AdminPlans에 P0 #1 commit + push 후 git 정합)
   - frontend dist 전체 교체
   - sw.js typo path 정합 (nginx config fix 후 일반 root 사용)
   - cc puppeteer 즉시 검증 (login 페이지 + admin login + /admin/plan-pricing 진입 + 3 plan card)

### 4.2 권장 2순위: 운영 dist 백업 디렉토리 정리

§2.4 의 12 디렉토리 ~ 1GB 정리. 다음 명령 (171차 deploy 정합 검증 완료 후):
```bash
# 운영 호스트
rm -rf /home/wwwroot/roi.geniego.com/frontend/dist.{170p1,170p2,170p3,170p4,170p5}_bad_*
rm -rf /home/wwwroot/roi.geniego.com/frontend/dist.prev170{p3,p4,p5}
rm -rf /home/wwwroot/roi.geniego.com/frontend/dist.rollback170p1
# 데모도 동일
# /tmp/frontend_*_pre170*.tgz 도 정리 (10 tgz × 12MB ≈ 120MB)
```

### 4.3 권장 3순위: 데모 backend 동기화 (169차 §4.1 잔여)

데모 backend = 옛 Apr 12 코드 (AdminPlans/AdminMenu 부재, v424/v425 routing 없음). 운영 정합 동기화 필요. PlanPricing fix 완료 후 데모도 동일 작동 보장.

### 4.4 권장 4순위: PM-Core handler 본체 잔여 (169차 §4.1)

Milestones / Dependencies / Assignees / Comments / Attachments / Events / Audit / Kpi 본체 + frontend Gantt / Milestones / Activity / TaskTable / Settings / TaskDetail page.

---

## 5. 미해결 트랙 (cumulative, 169차 §4 그대로 + 170차 발견)

### 5.1 단기 (171차 P0/P1)

- **[P0 #1] PlanPricing + AdminMenuManager 통합 fix + cc puppeteer 검증 + 운영/데모 deploy** (§4.1)
- [P1] 운영 dist 백업 디렉토리 정리 (§4.2)
- [P1] nginx vhost typo fix (운영 + 데모, root reload)
- [P1] 22 추가 mock 페이지 fix (N-169-mock-purge, 169차 §4.3)
- [P1] 데모 backend 동기화 (§4.3)
- [P1] PM-Core handler 본체 잔여 (§4.4)

### 5.2 중기 / 장기

169차 §4.2 / §4.4 그대로 유효.

---

## 6. 본 170차 발견 사항

### 6.1 vite manualChunks init order race (N-170-vite-fix)

§1.1 cc puppeteer 검증 결과. PlanPricing.jsx 단일 변경이 vite chunk graph 재분배 → vendor-react가 lazy chunk (pages-ai) 보다 늦게 init → `useCallback` null → 화이트.

확인된 chunk:
- 170p5: `pages-ai-CoKrPWkS.js:47:65790` → vendor-react-DuxosCKn.js의 useCallback 호출 시 null
- 169 P5: 동일 chunk hash 인데 정상 작동 (entry chunk 269KB vs 170p5 209KB — entry에서 무엇이 빠짐)

근본 fix = vendor-react 분리 제거 또는 main.jsx 첫 줄에 `import 'react'` 명시.

### 6.2 nginx /sw.js typo (N-170-nginx-typo)

§1.2 참조. 운영 + 데모 vhost 둘 다 동일 typo. `/sw.js` 만 별도 디렉토리에서 serve → dist swap 시 미반영 → 옛 SW 잔존.

본 phase 우회 적용: typo 디렉토리에 직접 sw.js 복사. 171차에 nginx config fix + reload 필요.

### 6.3 apiClient base fallback fail (N-170-apiclient-base)

§1.1 cc puppeteer 결과: `FAIL: http://localhost:8000/api/v424/orderhub/orders (net::ERR_CONNECTION_REFUSED)` 등 — 169 P5 dist 에서도 OrderHub mount 시 fetch fail. 28 페이지 영향. base fallback `localhost:8000` → `""` (relative) 로 fix 필요.

### 6.4 PWA SW chunk 강제 캐싱 (N-170-pwa-strategy)

옛 SW (Apr 30, 6312 bytes) 가 cache-first 전략 + chunk URL 캐싱 → dist swap 시 새 chunk hash 받아도 SW cache hit 으로 옛 chunk serve → entry hash mismatch → ChunkLoadError → 화이트 보조 트리거.

본 phase 적용한 unregister-only sw.js 가 영구 fix (사용자 다음 접속 시 SW 자동 unregister + cache 정리). 171차에 PWA 전략 재정의 (cache-first 영구 폐기 또는 network-first 전환).

### 6.5 `app_user` 테이블 `role` 컬럼 부재 재확인

169차에 이미 발견 (`user.role` 항상 undefined). 170차 AdminMenuManager 진입 불가 root cause. 171차 frontend fix 시 `user.plan === 'admin'` 또는 `useAuth().isAdmin` 사용 정합.

---

## 7. cc 도구 라이브러리 (169차 §7 + 170차 §1.1 추가)

§7.1 plink / §7.2 pscp / §7.3 PowerShell quote escape / §7.4 dry-run 검증 / §7.5 `bin/migrate.php both` / §7.6 PowerShell `/` parsing 우회 — 169차 인계서 §7 그대로 유효.

**170차 신규 §7.7**: cc puppeteer headless 직접 검증 (U-170-A 정합):
```js
const puppeteer = require('puppeteer');
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
// page.on('console') + page.on('pageerror') + page.on('requestfailed') 캡처
// page.goto(url, { waitUntil: 'networkidle2' })
// document.getElementById('root').innerHTML 검사 (빈 ⇒ React render fail)
// page.screenshot() 보조
```

설치: `cd "E:/project/GeniegoROI" && npm install --no-save puppeteer` (시간 ~1분, chromium 자동 download).

**170차 신규 §7.8**: backup tgz timestamp 정확성. PowerShell `Get-Date -Format` 으로 ts 변수 사용 시 rollback 시점에 정확히 받아야. 가정값 사용 금지 → tar extract fail → dist 손실 risk. 본 phase 1회 발생 후 즉시 복구 (`dist.prev170p4` mv 사용).

---

## 8. memory 파일 (`~/.claude/projects/E--project-GeniegoROI/memory/`)

| 파일 | 170차 갱신 권고 |
|---|---|
| `MEMORY.md` (index) | +0 (본 cc 가 별도 entry 추가 안 함 — 171차 cc 결정) |
| `feedback_absolute_principles.md` (9개 절대 원칙) | 변경 없음 |
| `feedback_handoff_approval.md` | 본 인계서가 그 정합 — 사용자 승인 후 commit/push |
| `feedback_pm_operational_rules.md` (U-prefix) | 171차 갱신 권장 (U-170-A/B/C/D 추가) |
| `feedback_credentials_handling.md` | 170차에 12회 추가 사용 정합 처리 — 171차 회전 확인 의무 |
| `project_n152f_pm_features.md` | 변경 없음 |
| `project_n152f_consolidated.md` | 171차 갱신 권장 (N-170-vite-fix / N-170-apiclient-base / N-170-nginx-typo / N-170-pwa-strategy 추가) |
| `project_orderhub_deploy_automation.md` | 변경 없음 |
| `reference_ops_host.md` | 170차 신규 nginx /sw.js typo + apiClient base + 170 backup tgz 위치 추가 권장 |

---

## 9. 171차 검수자 첫 응답 강제 의무 사항

1. ⚠️ 본 인계서 §1-§5 인지 명시 (특히 §1 최상위 상태 + §2 cc puppeteer root cause + §4.1 1순위)
2. U-170-A/B/C/D 인지 명시
3. P0 #1 미해결 인지 + 171차 1순위 통합 fix 진행 결정 의무
4. **사용자 credentials 회전 확인 의무** (운영 SSH + MySQL root 169차에 9회 + 170차에 12회 = 누적 21회 사용)
5. 운영 dist 백업 디렉토리 정리 (§4.2) 진행 결정
6. cc puppeteer 검증 의무 (U-170-A) 인지

---

## 10. 170차 종합 상태 표 (171차 즉시 참조)

| 영역 | 170차 진입 | 170차 종료 | 비고 |
|---|:-:|:-:|---|
| 운영 frontend dist | ✅ 169 P5 | ✅ 169 P5 (5회 rollback 후) | 변경 0 |
| 데모 frontend dist | ✅ 169 P5 | ✅ 169 P5 | 변경 0 |
| 운영 backend `index.php` | 169 P5 | ✅ 170p1 admin bypass | local commit 대기 |
| 운영 backend `AdminPlans.php` | 169 P5 | ✅ 170p1 admin gate | local commit 대기 |
| 운영 backend `AdminMenu.php` | 169 P5 | ✅ 170p1 admin gate | local commit 대기 |
| 운영 + 데모 sw.js (typo path) | 옛 6312 bytes Apr 30 | ✅ unregister-only 1377 bytes | local commit 대기 |
| 운영 DB `plan_config` | 0 row | ✅ 3 row seed (starter/pro/enterprise) | |
| 운영 DB `plan_menu_access` | 0 row | ⚠️ 0 row (PlanPricing 진입 못 함) | 171차 admin 작업 |
| PlanPricing (`/admin/plan-pricing`) | 빈 화면 | ⚠️ 빈 화면 (apiClient base fail) | 171차 fix |
| AdminMenuManager (`/admin/menu-tree`) | "접근 불가" | ⚠️ "접근 불가" (user.role 체크) | 171차 fix |
| local repo (master, origin) | 169차 6 commit pushed | 본 인계서 + 4 file commit 대기 | 사용자 명시 승인 후 |

---

## 11. 171차 진입 시 cc 가 즉시 수행할 검증 명령

```powershell
# 1) 현재 운영 dist + backend 상태 확인
$sshPass = '<rotated_password>'
$cmd = @'
echo === ops_active_index ===
grep -oE 'index-[A-Za-z0-9_-]+\.js' /home/wwwroot/roi.geniego.com/frontend/dist/index.html | head -1
echo === backend_files ===
ls -la /home/wwwroot/roi.geniego.com/backend/src/Handlers/AdminPlans.php /home/wwwroot/roi.geniego.com/backend/src/Handlers/AdminMenu.php /home/wwwroot/roi.geniego.com/backend/public/index.php
echo === sw_js_typo_path ===
curl -sIS https://roi.genie-go.com/sw.js | head -8
curl -sS https://roi.genie-go.com/sw.js | head -c 100
echo === admin_gates ===
curl -sS -o /dev/null -w 'admin_plans=%{http_code}\n' https://roi.genie-go.com/v424/admin/plans
curl -sS -o /dev/null -w 'admin_menu_tree=%{http_code}\n' https://roi.genie-go.com/v425/admin/menu-tree
'@
& 'C:\Program Files\PuTTY\plink.exe' -ssh -batch -pw $sshPass root@1.201.177.46 $cmd
Remove-Variable sshPass

# 2) cc puppeteer fresh headless 검증 (운영 dist 상태)
cd "E:/project/GeniegoROI"
node _cc_verify_ops_170.cjs
# 예상: 화이트 없음 (169 P5 정합)

# 3) 171차 1순위 통합 fix 진행 (vite.config.js + apiClient + PlanPricing + AdminMenuManager)
# 단계별 fix + clean build + cc puppeteer 검증 + 사용자 승인 후 deploy
```

---

**본 인계서 v1 = 사용자 명시 승인 후 commit + push** (memory `feedback_handoff_approval.md` 정합).
