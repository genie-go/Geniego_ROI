# 169차 세션 인계서 (NEXT_SESSION.md) — **168차 N-152-F 트랙 + 결제 정책 + 운영 deploy + frontend rollback**

> **작성일**: 2026-05-26 (deploy 결과 반영 후 재작성)
> **이전 세션**: 168차 (N-152-F 통합 트랙 + USD 결제 정책 + 운영 deploy 진행 + frontend 화이트스크린 rollback)
> **다음 세션**: 169차
> **저장 위치**: repo root `NEXT_SESSION.md`
> **종결 방식**: **10 commit master 누적 + origin push 완료 + Backend 운영 적용 완료 + Frontend rollback (화이트스크린)**

---

## ⚠️ 169차 검수자 최우선 인지 사항

### 1. 최상위 상태

**168차 = N-152-F 통합 PM 트랙 본격 진입 + cc 인지 누락 정정(F1/F2/F3/PH3/PM2) + 결제 USD/Paddle 단일 정책 + 10 commit + 운영 backend 적용 + frontend rollback.**

**Backend 운영 적용 결과** ✅:
- DB 11 신규 테이블 생성 (pm_* 8 + menu_* 3) — production geniego_roi
- backend 코드 적용 (PM/ 12 handler + AdminMenu.php + routes.php)
- nginx vhost 패치 (`v424|v425` routing 추가)
- php8.1-fpm restart 완료
- /v424/health 200, /v425/pm/projects 401 (auth middleware 작동 확인)

**Frontend 운영 상태** ❌:
- 신규 dist 업로드 후 **화이트스크린 발생 → 즉시 rollback**
- 운영 dist = pre-168 backup 복원 상태
- 신규 dist 보존 위치: `/home/wwwroot/roi.geniego.com/frontend/dist.broken_168/`
- 원인 추정: MenuVisibilityProvider / SmartPricing 변경 / lazy import — **169차 진단 의무**

**169차 우선순위**:
1. (P0) Frontend 화이트스크린 원인 진단 + fix + 재배포
2. (P0) `/admin` Admin.jsx stub redirect → 실제 AdminEnvironment.jsx 구현 (사용자 발견 issue)
3. (P0) 채널 KPI 페이지 경로 오류 진단 (사용자 발견 issue, 정확한 에러 메시지 수령 필요)
4. (P1) Migrate.php @rollback 블록 forward apply 제외 fix (168차 발견 버그)
5. (P1) F2/F3 Sidebar 본격 통합 + menu_tree seed
6. (P2) PM-Core handler 본체 + Gantt CPM

### 2. 사용자 운영원칙 누적 (U-prefix)

기존 U-161-A ~ U-166-H 유지. **168차 신규**:

- **U-168-A**: 사용자 명시 추가 기능 누락 시 절대원칙 §6 절차 (보고→영향도→승인→작업) 강제. 168차에 cc 가 N-152-F (Task/Milestone/Gantt) 단독 spec 만 작성하면서 F1/F2/F3/T3/PH3/PM2 누락 → 정직 보고 후 통합 spec 작성으로 정정
- **U-168-B**: i18n 15 locale 동기화 = **추가 언어 발생 종결 후 일괄 시점**에 진행 (cc 판단). ko/en 마스터는 phase 별 즉시. 13 locale 은 별도 트랙
- **U-168-C**: **GeniegoROI 구독요금 USD 단일 + 카드 결제 전용** (Paddle Billing v2). Toss/KakaoPay/NaverPay/계좌이체/PayPal/Apple Pay/Google Pay 등 차단

기존 N-prefix 모두 유지. **168차 신규**:
- **N-152-F-core**: PM Task/Milestone/Gantt — 168차 backend skeleton + frontend skeleton 3 page (단계 1-4)
- **N-152-F-f1**: 캠페인 카테고리 6종 (금융/보험/의료/세무/법률/기타) — 168차 완료
- **N-152-F-f2f3**: Admin/User 메뉴 가시성 토글 (T3) — 168차 backend 자체 구현 + frontend skeleton
- **N-152-F-billing**: USD 단일 + Paddle 카드 전용 — 168차 완료
- **N-152-G**: 13 locale 자연어 번역 + 메뉴 namespace 정합 + Pricing 인프라 cleanup (대기 트랙, 추가 언어 발생 종결 시점)
- **N-159**: en.js mirror 오염 + locale placeholder cleanup (별도 i18n cleanup)
- **N-PH3**: PM Phase 3 실시간 알림 + 대시보드 차트 + 성능 (PM-Core SSE 인프라 후)
- **N-PM2**: PM 문서2 4축 (Connectors/WMS/AIInsights/AdvertisingPerformance) — 페이지별 raw 재분석 후

### 3. i18n 트랙 (U-164-A 동결 부분 해제)

- 168차 F1 으로 36 keys × 2 (ko/en) = 72 leaves 추가 (commit `0398d1e`)
- ko.js 30,656 → 30,692 (Δ36, leaves)
- 13 locale 미진행 (BLOCKED — marketing namespace 라인 mismatch + agent 자동번역 금지 + U-168-B "추가 언어 종결 후 일괄")
- sacred SHA (ja.js/zh.js) match (pre-commit G2 PASS 8회 누적)

### 4. 169차 검수자 첫 응답 의무

- ⚠️ 섹션 인지 명시
- U-168-A/B/C 인지 명시
- 168차 commit 7종 인지 (`ab39b34`~`dc2bfe1`, §3 표)
- 본 인계서의 §4 미해결 트랙 우선순위 결정 요청
- 운영 deploy + push 사용자 결정 요청 (5 commit master 누적)

---

## 1. 168차 결과 요약

### 1.1 167차 종결 시점 (이전) commit

| Commit | 내용 |
|---|---|
| `eb8a4fb` | Revert 168차 인계서 (`6ad0eef` 사용자 미승인 → 자동 revert) |
| `6ad0eef` | (revert 됨) |
| `ec139ed` | routes.php $register 78건 일괄 정합 + audit_routes.php 도구 (167차 9순위) |
| `5cf30ee` | bin/migrate.php --rollback 옵션 (167차 6순위) |
| `af601e3` | /v424/health 엔터프라이즈 health endpoint (167차 5순위) |
| `5bcc719` | RoiService stub 제거 (167차 4순위) |
| `603e9fe` | CI deploy.yml cleanup (167차 1순위) |

### 1.2 168차 master commit 10개 (origin/master push 완료)

| Commit | 영역 | 변경 | 상태 |
|---|---|---|---|
| `ab39b34` | spec 2종 (`n152f_pm_features_spec.md` 837L + `n152f_consolidated_pm_track.md` 423L) | +1260 | ✅ pushed |
| `0398d1e` | F1 캠페인 카테고리 6종 (campaignConstants + AutoMarketing + ko/en i18n 36 keys × 2) | +132 | ✅ pushed |
| `1d67bd6` | F2/F3 backend (T3 자체 구현 — 3 migration + AdminMenu 601L + 12 route) | +698 | ✅ pushed |
| `58b3964` | PM-Core backend skeleton (8 migration + 12 handler 1100L + 50 route) | +1401 | ✅ pushed |
| `c6d3c70` | F2/F3 frontend skeleton (MenuVisibilityContext + Admin/User 2 page + App.jsx) | +486 | ✅ pushed |
| `1c8d25d` | PM-Core frontend skeleton 3 page (PMOverview + Detail + TaskBoard) | +525 | ✅ pushed |
| `dc2bfe1` | 결제 USD/Paddle 단일 정책 (spec + routes 차단 + App.jsx + PricingPublic + .env.example) | +206/-27 | ✅ pushed |
| `7ab317a` | docs(handoff): 169차 인계서 v1 (사용자 명시 승인 후) | rewrite | ✅ pushed |
| `79311a9` | **fix(backend)**: routes.php `/v410/action_requests/{id|action_id}/decide` wildcard 충돌 (deploy 차단 해소 #1) | +4/-2 | ✅ pushed |
| `974bba4` | **fix(backend)**: routes.php `/auth/license` POST 중복 (`$app->post` ↔ `$register`) (deploy 차단 해소 #2) | +3/-1 | ✅ pushed |

**합계**: 10 commit, +4715 / -30 (純 +4685L). origin/master 동기화 완료.

### 1.2-bis 운영 deploy 결과 (cc plink + pscp 직접)

**Backend deploy 시퀀스** (Step A-L):
- Step A: local tar `/tmp/backend_168.tgz` (1.27 MB)
- Step B: pscp 전송 → `/tmp/backend_168.tgz` (md5: 8bbdaad0...)
- Step C: mysqldump 백업 → `/tmp/backup_geniego_roi_pre_168_20260526_171404.sql.gz` (7.9 KB)
- Step D-E: tar 해제 + chown www:www
- Step F: composer install --no-dev --optimize-autoloader (autoload 재생성)
- Step G: dry-run 11 Pending 확인 (PM 8 + menu 3)
- Step I: 실 migrate — **CREATE 후 즉시 DROP** (Migrate.php @rollback 블록 미제외 버그) → 우회 처리:
  - awk 로 @rollback...@end-rollback 블록 strip 후 직접 mysql 적용 (`apply168.sh`)
  - 11 신규 테이블 모두 생성 확인
  - schema_migrations 13 row (2 + 11)
- Step J: nginx vhost 패치 (`v424|v425` 추가, backup `/tmp/roi.genie-go.com.conf.bak_pre168_20260526_172302`)
- Step J': php8.1-fpm restart (OPcache reset)
- Step K: deploy 중 발견된 routes.php 중복 2건 fix (79311a9 + 974bba4) → 재배포
- Step L: health check 통과

**Frontend deploy** (실패):
- vite build 8.45s (dist 11.5 MB)
- pscp → 운영 dist 교체 (backup `/tmp/frontend_dist_pre168_20260526_172737.tgz` 18 MB)
- **화이트스크린 발생 → 즉시 rollback** (backup 복원)
- 신규 dist 는 `frontend/dist.broken_168/` 로 보존 (진단용)

### 1.2-ter Migrate.php 발견 버그 (169차 fix 의무)

`backend/src/Migrate.php` L111-113:
```php
$sql = preg_replace('!/\*.*?\*/!s', '', $sql) ?? $sql;
$sql = preg_replace('!^\s*--.*$!m', '', $sql) ?? $sql;
$parts = preg_split('/;\s*(\r?\n|$)/', $sql) ?: [];
```

`--` 단일 라인 comment 만 제거하고 `-- @rollback ... DROP TABLE ... -- @end-rollback` 사이의 DROP statement 는 그대로 forward apply 시 실행 → CREATE 후 DROP → 테이블 미생성.

168차 deploy 에서 본 cc 가 awk 로 우회 처리. 169차 fix 필요:

```php
// L111 다음에 추가
$sql = preg_replace('/^\s*--\s*@rollback\s*$.*?^\s*--\s*@end-rollback\s*$/ms', '', $sql) ?? $sql;
```

### 1.3 cc 작업 진행 phase 표 (최종)

| Phase | 작업 | 상태 |
|:-:|---|:-:|
| 0 | spec 2종 commit (`ab39b34`) | ✅ |
| 1 | F1 캠페인 카테고리 6종 (`0398d1e`) | ✅ |
| 2 | F2/F3 backend 자체 구현 (`1d67bd6`) | ✅ |
| 3 | PM-Core backend skeleton (`58b3964`) | ✅ |
| 4 | F2/F3 frontend skeleton (`c6d3c70`) | ✅ |
| 5 | i18n 13 locale 일괄 동기화 | ⚠️ BLOCKED → N-152-G 별도 트랙 |
| 6 | PM-Core frontend skeleton 3 page (`1c8d25d`) | ✅ |
| 7 | USD 단일 + 카드 전용 결제 정책 (`dc2bfe1`) | ✅ |
| 8 | 168차 인계서 v1 (`7ab317a`) | ✅ |
| 9 | origin push (8 → 10 commit) | ✅ |
| 10 | Backend 운영 deploy | ✅ (단 Migrate.php 버그 우회 + 2 fix commit 발생) |
| 11 | Frontend 운영 deploy | ❌ **화이트스크린 → rollback** |
| 12 | 168차 인계서 v2 (본 파일 갱신, deploy 결과 반영) | 진행 중 |

---

## 2. 결제 정책 (168차 사용자 신규 지시, dc2bfe1)

### 2.1 결정 사항

- **통화**: **USD 단일**
- **결제 수단**: **카드 (credit/debit) 전용**
- **Provider**: **Paddle Billing v2 단일**
- **Merchant of Record**: Paddle (세금/VAT/환불 위임)

### 2.2 적용 코드 변경

| 영역 | 변경 |
|---|---|
| `docs/spec/n152f_billing_usd_card_only.md` | 신규 정책 spec (수용 기준 + 코드 매핑 + 운영 절차) |
| `backend/src/routes.php` | Toss/PG 8 endpoint $custom + $register 주석 처리 (Handler 코드 보존, routing 만 차단) |
| `frontend/src/App.jsx` | SmartPricing → 인증/비인증 모두 PricingPublic. /pricing → PricingPublic, /app-pricing → Navigate to /pricing |
| `frontend/src/pages/public/PricingPublic.jsx` | Paddle.Checkout.open 에 allowedPaymentMethods: ['card'] 강제 + 푸터 "Card payments only" 명시 |
| `backend/.env.example` | GENIE_BILLING_CURRENCY=USD + PROVIDER=paddle + METHOD=card_only 3 env 추가 |

### 2.3 N-152-G-billing-cleanup 트랙 (별도, 169차+)

- Payment.php 코드 완전 삭제 (현재 보존, routing 만 차단)
- menu_tier_pricing.price_krw → price_usd 환산 마이그레이션
- Pricing.jsx (679L) 코드 삭제
- 운영 .env 의 TOSS_* 키 정리
- Paddle dashboard 의 Card-only 설정 명시 검증 (운영자 작업)

---

## 3. N-152-F 통합 PM 트랙 sub-track 매트릭스

본 통합 spec: `docs/spec/n152f_consolidated_pm_track.md`

### 3.1 PM-Core (Task/Milestone/Gantt)

| 단계 | 진행 |
|:-:|---|
| spec | ✅ `n152f_pm_features_spec.md` (837L) |
| backend migration 8 | ✅ `backend/migrations/20260526_168_001~008_*.sql` |
| backend handler 12 skeleton | ✅ `backend/src/Handlers/PM/{Shared,Projects,Tasks,Milestones,Dependencies,Assignees,Comments,Attachments,Events,Audit,Gantt,Kpi}.php` (~1100L) |
| backend routes 26×2 alias | ✅ `backend/src/routes.php` |
| frontend skeleton 3 page | ✅ PMOverview / PMProjectDetail / PMTaskBoard |
| **본체 (169차 이후)** | handler 본체 로직, Gantt CPM forward/backward pass, SSE long-poll, frontend 6 추가 page (Gantt/Milestones/Activity/TaskTable/Settings/TaskDetail) |
| sidebar PM 메뉴 추가 | 미진행 (F2/F3 menuKey 표준화 후) |
| i18n pm.* namespace | 미진행 (180+ leaves, U-164-A 동결 해제 후) |

### 3.2 F1 캠페인 카테고리 (완료)

| 단계 | 진행 |
|:-:|---|
| 6 카테고리 추가 (campaignConstants + AutoMarketing) | ✅ |
| ko/en i18n 36 keys (cat_<id> 6 + cat_explain_<id> 6 + tag_* 24) | ✅ |
| 13 locale 동기화 | ⚠️ N-152-G 별도 트랙 (U-168-B) |

### 3.3 F2/F3 = T3 (Admin/User 메뉴 토글)

| 단계 | 진행 |
|:-:|---|
| backend migration 3 (`menu_tree` / `menu_audit_log` / `menu_defaults`) | ✅ |
| backend `AdminMenu.php` 6 endpoint (601L) | ✅ |
| routes.php 6×2 alias = 12 route | ✅ |
| frontend `MenuVisibilityContext.jsx` | ✅ |
| frontend `AdminMenuManager.jsx` + `UserMenuPreferences.jsx` | ✅ |
| App.jsx /admin/menu-tree + /me/menu route | ✅ |
| **Sidebar.jsx 본격 통합** (useMenuVisibility filter + menuKey 형식 표준화 + menu_tree seed) | 미진행 (169차) |
| MobileBottomNav.jsx 동일 패치 | 미진행 (169차) |
| menu_tree seed 운영 적용 (initial snapshot) | 미진행 (169차 + 운영 deploy) |

### 3.4 PH3 (Phase 3 — 실시간 알림 / 대시보드 차트 / 성능)

미진행 — PM-Core SSE 인프라 후 통합 진입 (인프라 공유).

### 3.5 PM2 (PM 문서2 4축)

미진행 — 각 페이지 raw 재분석 후 sub-spec (PM N-15 회피).

라인 수 raw (168차 측정):
- AdvertisingPerformance.jsx: 75L (stub, PM 추정 60% 와 불일치)
- Connectors.jsx: 540L
- WmsManager.jsx: 2445L
- AIInsights.jsx: 476L

---

## 4. 미해결 트랙 (cumulative)

### 4.1 단기 (1주 내, 169차 진입 후보)

- [P0] **운영 deploy 결정** — 168차 7 commit 운영 적용 (cc plink + pscp + mysqldump + migrate + reload). 사용자 명시 승인 필요
- [P0] **origin push 결정** — master 7 commit 누적. U-166-D (GitHub Actions 미사용) 정합 — push 자체는 자동 deploy 미발동
- [P0] **운영자 credentials 회전** (167차 이월 — W0 + SSH + MySQL root)
- [P1] **F2/F3 Sidebar 본격 통합** + menu_tree seed (169차 진입 권장 1순위)
- [P1] **PM-Core handler 본체 로직 + Gantt CPM** (169차 진입)
- [P1] **PM-Core frontend 6 추가 page** (Gantt / Milestones / Activity / TaskTable / Settings / TaskDetail)

### 4.2 중기 (1개월 내)

- [P1] **PM-Core SSE long-poll 본체** + frontend EventSource 통합
- [P2] **PM2 4축 raw 재분석 + 페이지별 sub-spec** (1순위 AdvertisingPerformance 75L stub)
- [P2] **N-152-G-billing-cleanup**: Payment.php 코드 삭제 + price_krw → price_usd 마이그레이션
- [P2] **방어선 4** (demo DB 물리 분리)
- [P2] **방어선 6** (demo 키 권한 강등 admin → analyst)
- [P3] **U-165-B 41 handler 점진 migration**

### 4.3 장기 (전략)

- [P2] **N-152-G 자연어 번역** — 추가 언어 발생 종결 후 일괄 (U-168-B). DeepL / Claude API / 전문 번역가 결정
- [P2] **N-159 mirror 오염 cleanup** (en.js 일본어 블록 L2080-2094 + locale `Cat_beauty` placeholder 잔재)
- [P3] **PHPUnit 도입**
- [P3] **i18n 동결 완전 해제** (U-164-A)

---

## 4-bis 운영 백업 위치 (169차 참조)

운영 호스트 `1.201.177.46:/tmp/`:

| 파일 | 크기 | 내용 |
|---|---|---|
| `backup_geniego_roi_pre_168_20260526_171404.sql.gz` | 7.9 KB | DB 168차 적용 전 |
| `frontend_dist_pre168_20260526_172737.tgz` | 18 MB | frontend dist pre-168 |
| `roi.genie-go.com.conf.bak_pre168_20260526_172302` | (text) | nginx vhost pre-168 |

운영 호스트 `1.201.177.46:/home/wwwroot/roi.geniego.com/frontend/`:
- `dist/` = pre-168 backup 복원 (사용자 노출)
- `dist.broken_168/` = 168차 vite build 결과 (화이트스크린 발생 → 진단용 보존)

## 4-ter 168차 deploy 중 cc 가 만든 보안 인지 사항

- 운영 SSH/MySQL root credentials = 사용자가 chat 에 1회 제공, cc 가 PowerShell `$sshPass` 변수로 받아 plink/pscp 호출, 호출마다 `Remove-Variable` 폐기
- 응답·commit·memory 어디에도 password 인용 X (memory `feedback_credentials_handling.md` 정합)
- 운영 호스트 `/root/.bash_history` 에 plink 명령 잔존 가능 — **회전 후 history -c 권고**
- 본 chat session 자체에 credentials plaintext 노출 — chat 보존 정책 검토 의무

**169차 진입 시 첫 작업: 사용자 credentials 회전 확인** (SSH root + MySQL root 둘 다).

## 5. 169차 검수자 1순위 작업 (cc 권장)

### 5.1 권장 1순위: **Frontend 화이트스크린 진단 + fix + 재배포**

- 의심 영역 (우선순위 순):
  1. `frontend/src/context/MenuVisibilityContext.jsx` (신규) — useAuth().token destructuring + useEffect 무한 루프 가능성
  2. `frontend/src/App.jsx` SmartPricing 변경 — user 분기 제거가 다른 곳 의존성 깨뜨림
  3. `frontend/src/pages/public/PricingPublic.jsx` `allowedPaymentMethods: ['card']` — Paddle SDK 옵션 미지원 시 throw
  4. lazy import 누락 또는 chunk 빌드 실패
- 진단 절차:
  1. 운영 host `frontend/dist.broken_168/` 의 index.html + assets/*.js 검토
  2. 브라우저 console (사용자 협조) — `localStorage.LATEST_CRASH_ERR` 확인
  3. local 에서 `npm run dev` 로 dev server 실행 + 직접 진입 + console 확인
- fix 후 재배포 (vite build → pscp → chown → cleanup)

### 5.2 권장 2순위: **사용자 발견 issue (168차 후반)**

- **/admin Admin.jsx stub redirect 제거 + AdminEnvironment.jsx 실제 구현**
  - 현재: `<Navigate to="/dashboard" replace />` 만 (10L stub)
  - 사이드바 "관리자 시스템 > 관리자 환경" 클릭 → /admin → /dashboard 무한 redirect (사용자 혼란)
  - 169차 작업: AdminEnvironment.jsx 신규 (글로벌 설정 UI)

- **채널 KPI 페이지 경로 오류 진단**
  - 사용자 보고: 관리자 환경 → /dashboard 후 "채널 KPI 페이지 경로 오류"
  - 본 168차 cc 작업 무관 (frontend rollback = pre-168) — 이전부터 존재한 issue
  - 169차 진입 시 사용자에게 정확한 에러 메시지 / 콘솔 출력 / 스크린샷 요청 → fix

### 5.3 권장 3순위: Migrate.php @rollback 블록 forward apply 제외 fix (168차 발견)

§1.2-ter 의 패치 적용. 169차 commit.

### 5.4 권장 4순위: 운영 deploy 결정 (frontend fix + Migrate fix 후)

7 commit 누적. 운영 적용 절차:

```powershell
# cc plink + pscp (NEXT_SESSION.md 167차 §1.4 표준)
# 1) backend tar
tar -czf /tmp/backend.tgz --exclude=backend/.env --exclude=backend/vendor `
  --exclude=backend/data --exclude=backend/logs --exclude=backend/.my.cnf* backend/
# 2) pscp + plink
# 3) 운영 호스트:
#    mysqldump 백업 (.my.cnf.bak) → tar 해제 → composer install → migrate.php both --dry-run → both → reload
```

migration 8 (PM-Core pm_*) + 3 (F2/F3 menu_*) = **총 11 신규 테이블** 운영 DB 생성. **사용자 명시 승인 필수**.

### 5.2 권장 2순위: F2/F3 Sidebar 본격 통합

- `Sidebar.jsx` (705L) + `MobileBottomNav.jsx` (288L) 에 `useMenuVisibility().isVisible(menuKey)` 필터 적용
- `menu_tree` seed 작성 (현 Sidebar 의 menuKey 그대로) + 운영 적용
- AdminMenuManager 의 라벨 표시 (label_key → i18n) 통합

### 5.3 권장 3순위: PM-Core handler 본체

- Gantt CPM (forward/backward pass + critical path)
- Tasks listByProject 의 hierarchy assembly (parent_task_id 기반 tree)
- SSE long-poll 본체 (PHP-FPM heartbeat + 5분 cap)
- Dependencies cycle 검출 추가 검증

### 5.5 권장 5순위: F2/F3 Sidebar 본격 통합 + menu_tree seed

### 5.6 권장 6순위: PM-Core handler 본체 + Gantt CPM

### 5.7 권장 7순위: PM2 4축 raw + AdvertisingPerformance.jsx sub-spec

PM N-15 회피 — 페이지별 raw 보고 → 사용자 승인 → sub-spec → 구현

---

## 6. 환경 / 인프라 현황 (167차 §4 + 168차 갱신)

### 6.1 운영 호스트 (참조)

- 도메인: http://roi.genie-go.com
- IP: 1.201.177.46
- Hostname: genieroi26
- PHP 8.1.34, MySQL 8.0.37, nginx
- Path: `/home/wwwroot/roi.geniego.com/{backend,frontend}`
- File owner: www:www
- `.my.cnf.bak`: `/home/wwwroot/roi.geniego.com/backend/.my.cnf.bak` (chmod 600 root:root, 62 bytes)

### 6.2 본 환경 (cc Windows)

- `plink.exe` / `pscp.exe`: `C:\Program Files\PuTTY\`
- `php.exe`: `E:\php\php.exe` — **xampp ini 파일 미존재로 local 실행 불가** (168차 발견. migration dry-run 운영 host SSH 로만 가능)
- `composer.phar`: `backend/composer.phar` (2.9.5)
- mysql client / gh CLI: 미설치

### 6.3 운영 DB (168차 신규 테이블 11개 예정)

- 운영 적용 후 추가될 테이블:
  - `pm_projects`, `pm_tasks`, `pm_milestones`, `pm_task_dependencies`, `pm_task_assignees`, `pm_task_comments`, `pm_attachments`, `pm_audit_log` (PM-Core 8)
  - `menu_tree`, `menu_audit_log`, `menu_defaults` (F2/F3 3)
- 165차 신규: `orderhub_claims`, `orderhub_settlements`, `schema_migrations` (prod 적용 완료)

---

## 7. 본 세션 발견 사항 / spec

### 7.1 i18n 13 locale namespace 구조 mismatch (Phase 5 BLOCKED)

- es/fr: L11525 cat_digital 다음에 tag_skincare 미존재 (anchor pair 깨짐)
- de/zh-TW/id/th/vi/ar/hi/pt/ru (9 locale): L11525 위치에 cat_digital 자체 없음 — 각자 marketing namespace 라인 상이
- **결론**: 단순 anchor 삽입 불가. 별도 namespace 부모 경로 식별 트랙 (N-152-G)

### 7.2 en.js mirror 오염 (i18n agent 부수 발견)

- L2080-2094: 일본어 블록 (cat_digital: "デジタル・アプリ" 등) — en.js 영문 로케일 내부에 일본어
- 다수 locale 의 `cat_beauty: "Cat_beauty"` placeholder 잔재
- **별도 트랙 N-159 i18n cleanup**

### 7.3 결제 환경 raw (168차 USD 정책 적용 전)

- `PricingPublic.jsx` (317L): USD + Paddle (이미 적합)
- `Pricing.jsx` (679L): KRW + Toss + menu_tier_pricing DB → /pricing 으로 redirect 처리
- `SubscriptionPricing.jsx` (58L): mock UI
- `Payment.php` (1694L): Toss + KRW + KakaoPay + … → routing 차단 (Handler 코드 보존)
- `Paddle.php` (740L): USD 기본 + webhook (USD 정책 정합)

### 7.4 PHP local 실행 불가 (168차 신규)

- `E:\php\php.exe` (xampp) → `C:\xampp\php\ext\php_openssl.dll` 등 미존재
- migration dry-run 본 cc 환경에서 불가
- 운영 host SSH 후 `php bin/migrate.php both --dry-run` 으로 검증 의무

---

## 8. cc 도구 라이브러리 (167차 §7 그대로)

§7.1 plink / §7.2 pscp / §7.3 PowerShell quote escape / §7.4 dry-run 검증 명령 — 167차 인계서 §7 그대로 유효.

---

## 9. memory 파일 (`~/.claude/projects/E--project-GeniegoROI/memory/`)

| 파일 | 168차 갱신 |
|---|---|
| `MEMORY.md` (index) | +1 entry (`project_n152f_consolidated.md`) |
| `feedback_absolute_principles.md` (9개 절대 원칙) | 변경 없음 |
| `feedback_handoff_approval.md` | 변경 없음 (본 인계서가 그 정합 — 사용자 승인 전까지 commit 보류) |
| `feedback_pm_operational_rules.md` (U-prefix) | 169차 갱신 권장 (U-168-A/B/C 추가) |
| `feedback_credentials_handling.md` | 변경 없음 |
| `project_n152f_pm_features.md` (단독 PM-Core 트랙) | 169차 갱신 권장 (위치 = 통합의 sub-track 으로 재정의) |
| **`project_n152f_consolidated.md`** | **168차 신규** — 5 sub-track 카탈로그 + cc 인지 누락 정정 |
| `project_orderhub_deploy_automation.md` | 변경 없음 |
| `reference_ops_host.md` | 변경 없음 |

---

## 10. 169차 검수자 첫 응답 강제 의무 사항

1. ⚠️ 본 인계서 §1-§5 인지 명시 (특히 §1 최상위 상태 backend ✅ / frontend rollback ❌)
2. U-168-A/B/C 인지 명시
3. 168차 10 commit (`ab39b34`~`974bba4`) 인지 명시 + push 완료 인지
4. 운영 적용 상태 인지 (backend 168차 / frontend pre-168 / DB 11 신규 테이블)
5. 169차 1순위 결정 (cc 권장: frontend 화이트스크린 진단 + fix → AdminEnvironment 구현 → Migrate.php fix)
6. **사용자 credentials 회전 확인 의무** (운영 SSH + MySQL root)
7. 사용자 발견 issue 2건 (관리자 환경 stub + 채널 KPI 경로 오류) 인지

## 11. 168차 운영 deploy 종합 상태 표 (169차 즉시 참조)

| 영역 | 운영 적용 | 위치 / 비고 |
|---|:-:|---|
| Backend 코드 (PM/, AdminMenu.php, routes.php) | ✅ | `/home/wwwroot/roi.geniego.com/backend/` |
| DB 신규 11 테이블 | ✅ | production `geniego_roi` (모두 empty) |
| nginx vhost (`v424\|v425`) | ✅ | `/usr/local/nginx/conf/vhost/roi.genie-go.com.conf` |
| PHP-FPM restart | ✅ | OPcache reset 완료 |
| backend `.env.example` (GENIE_BILLING_*) | ✅ | local only (운영 .env 별도 갱신 필요) |
| Frontend dist | ❌ | **rollback** — `dist/` = pre-168, `dist.broken_168/` 보존 |
| Frontend 신규 UI (F1 카테고리 6종 / AdminMenuManager / PM 페이지) | ❌ | 사용자 노출 X |
| Demo 환경 | N/A | 별도 환경 없음 (production DB 공유) |
| Local repo (master, origin) | ✅ | 10 commit pushed |

## 12. 169차 진입 시 본 cc 가 즉시 수행할 진단 명령

```powershell
# 1) 운영 frontend 신규 dist 의 index.html + chunk 검토
$sshPass = '<password>'
& "C:\Program Files\PuTTY\plink.exe" -ssh -batch -pw $sshPass root@1.201.177.46 \
  'ls -la /home/wwwroot/roi.geniego.com/frontend/dist.broken_168/; \
   cat /home/wwwroot/roi.geniego.com/frontend/dist.broken_168/index.html | head -30; \
   ls /home/wwwroot/roi.geniego.com/frontend/dist.broken_168/assets/ | head -20'
Remove-Variable sshPass

# 2) 사용자에게 브라우저 콘솔 출력 요청
#    → F12 → Console:
#    console.log(localStorage.getItem('LATEST_CRASH_ERR'))
#    console.log(localStorage.getItem('LATEST_CRASH_UNHANDLED'))
#    console.log(localStorage.getItem('LATEST_CRASH_CONSOLE'))

# 3) local 에서 dev server 진입 (직접 진단)
#    cd frontend && npx vite
#    → 브라우저 http://localhost:5173 + 콘솔 에러 확인
```

---

**본 인계서 v2 = 사용자 명시 승인 후 commit + push** (memory `feedback_handoff_approval.md` 정합).
