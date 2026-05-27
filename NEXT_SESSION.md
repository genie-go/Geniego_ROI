# 173차 세션 인계서 (NEXT_SESSION.md) — **172차 15 commit + PHASE 1-A/B/C + PHASE 2-D 5계층 + Task #22 + Enterprise 견적가**

> **작성일**: 2026-05-27 (사용자 명시 승인 후)
> **이전 세션**: 172차 (PHASE 1 매출 lifecycle + PHASE 2-D 메뉴 가시성 + 다수 보강 작업)
> **다음 세션**: 173차
> **저장 위치**: repo root `NEXT_SESSION.md`
> **종결 방식**: 매출 차단 절반 해소 (priceId 대기) + 메뉴 5계층 완성 + 쿠폰 시스템 활성 + Enterprise 활성

---

## ⚠️ 173차 검수자 최우선 인지 사항

### 1. 최상위 상태 (173차 진입 시점)

| 영역 | 상태 | 비고 |
|---|:-:|---|
| 운영 frontend dist | ✅ `index-GaIE36f4.js` (172p19) + `PlanPricing-C3SRQkfK.js` | 5계층 + 가중치 편집 |
| 데모 frontend dist | ⚠️ 172차 sync 안 함 | 별도 라운드 |
| 운영 backend MenuPricingSync.php | ✅ Task #22 메뉴↔가격 sync 운영 적용 | |
| 운영 backend CouponAdmin.php | ✅ 자율 발급 + 룰 토글 운영 적용 | |
| 운영 backend CouponRedeem.php | ✅ + admin/enterprise downgrade 가드 | |
| 운영 backend AdminPlans.php | ✅ periods 동봉 + Enterprise 활성 | |
| 운영 backend AdminMenu.php | ✅ validId 확장 + slash 키 지원 | |
| 운영 backend routes.php | ✅ {menu_id:.+} 와일드카드 + coupon + sync | |
| DB `plan_period_pricing` | ✅ Starter $89/$84.55/$80.10/$71.20 (메뉴 권장가 적용) | |
| DB `menu_value_score` (신규) | ✅ 28 row seed | 가중치 합 $378.85/월 |
| DB `coupon_rules` | ✅ signup=active/starter/7일 default | |
| DB `free_coupons` + `coupon_redemptions` (신규) | ✅ 마이그레이션 완료 | |
| DB `menu_tree` | ✅ **26 → 138 row** (대 11 + 하위 53 + 서브탭 48 + 기존 26) | |
| Sandbox 5개 priceId | ❌ 미적용 (사용자 대기) | 매출 차단 |
| PADDLE_CLIENT_TOKEN | ❌ .env 미설정 | 매출 차단 |

### 2. 172차 변경 — git 커밋 일람 (15 commit)

```
5b2f1aaaa  feat(P1-I): menu_value_score 가중치 admin 편집 UI
a1bfd2c25  feat(PHASE 2-D v2): Sidebar 5계층 즉시 반영 + Broadcast sync
218f618ec  feat(PHASE 2-D 보강): 5계층 menu_tree 138 row + 개별 토글
01bdf8200  feat(PHASE 2-D): AdminMenuManager 4계층 + 한글화 + 일괄
d88eeab4f  fix: admin downgrade 가드 + Enterprise 견적가 등록
ec77fd280  feat(P0-C.3): 사용자 쿠폰 코드 사용 — redeem + AuthPage
74bae085a  feat(P0-C): 쿠폰 시스템 활성화 + admin 자율 발행 UI
9983eb201  feat(P0-B): 회원가입 plan + cycle 선택 흐름
0298a44a2  feat(P0-A): PricingPublic hardcoded → API 기반
aab96039d  feat(Task #22 초고도화): 메뉴 권한 ↔ 플랜 요금 sync
62294a31e  fix(p5-p8): theme-aware 컬러 + 레이아웃 컴팩트화
c3b1117e2  fix(p4): 전역 텍스트 가시성 + 선명 컬러
619e0696c  feat(p3): 메뉴 권한 4계층 한글화 + 서비스 설명
bf4d0647f  fix(p2): GDPR placeholder + 기간별 기본 결제액
b1c29ed14  feat: 플랜·요금·기간 통합 + 메뉴 권한 트리
```

### 3. 172차 핵심 변경 정리

#### 3.1 PHASE 1-A — Paddle 통합 (PricingPublic refactor, 매출 차단 절반 해소)

- `PricingPublic.jsx` hardcoded PLANS → `/auth/pricing/public-plans` API 기반 동적 fetch
- backend `publicPlans` 응답에 `periods` 배열 동봉 (회원가입 cycle 선택용)
- admin이 priceId 입력 시 즉시 반영 (재빌드 불필요)
- **잔여**: PADDLE_CLIENT_TOKEN + 4 priceId 미설정 → 매출 차단. 사용자 sandbox 값 받으면:
  1. 운영 `.env` 에 `PADDLE_CLIENT_TOKEN=test_xxxxxxxx` + `PADDLE_ENV=sandbox`
  2. php-fpm reload
  3. admin `/admin/plan-pricing` 에서 4 priceId DB 입력
  4. cc playwright Paddle Checkout overlay 검증

#### 3.2 PHASE 1-B — 회원가입 cycle 선택

- `AuthPage.jsx` PaidRegisterForm Step 3 에 `CycleSelectorSection` 추가
- 1/3/6/12개월 카드: 총 결제액 + 월 환산 + 할인율
- backend `app_user.subscription_cycle` 컬럼 활용 (extraData)
- 가입 후 `/pricing` redirect + `autoCheckout` state 전달

#### 3.3 PHASE 1-C — 쿠폰 시스템 활성화

**Migration (운영 적용)**:
- `free_coupons` + `coupon_redemptions` 2 신규 테이블
- `coupon_rules` seed (signup=active/starter/7일 default)

**Backend**:
- `CouponAdmin.php` 신규: overview / updateRule / issue / listCoupons / revoke
- `CouponRedeem.php` 신규: redeem + preview + admin/enterprise downgrade 가드
- `CouponEngine.php` 기존 (227L) — UserAuth::register 가 `signup` trigger 자동 호출 (이전 silent fail → 이제 작동)

**Frontend**:
- `PlanPricing.jsx` 신규 outer tab "🎟️ 쿠폰 관리" — 통계 4 카드 + 룰 3종 + 수동 발급 폼 + 발급 목록
- `AuthPage.jsx` `CouponCodeInput` — 가입 Step 3 에 코드 입력 (선택)
- register 완료 후 자동 redeem (`/^GENIE-[A-Z0-9]{8,16}$/` 정규식 검증)

#### 3.4 PHASE 2-D — 5계층 메뉴 가시성 (대→중→하→서브탭 + 일괄)

**Migration (운영 적용)**:
- `menu_tree` 26 → **138 row** 확장
  · `__section:<key>` × 11 대메뉴
  · `__leaf:<route>` × 53 하위 페이지
  · `__subtab:<route>::<id>` × 48 서브탭
- `docs/cc-tools/gen_menu_tree_extended_172.cjs` 재사용 가능 스크립트

**Backend**:
- `AdminMenu.php` `validId` regex 확장: `[a-zA-Z0-9._:|/-]+` (`:`, `|`, `/` 추가)
- `routes.php` PATCH menu-tree `{menu_id:.+}` 와일드카드 (slash 매치)

**Frontend**:
- `AdminMenuManager.jsx` 전면 재작성 (218L → 360L+):
  · 4계층 트리 + 한글 라벨 (MENU_KEY_LABEL)
  · 통계 카드 4종 (전체 / ✓ / ⊘ / ✗)
  · 검색 + 섹션 collapse + 일괄 토글
  · **5계층 모든 레벨 개별 토글** (140개)
- `VisibilityToggle` 컴포넌트 (DRY, xs/sm/md 사이즈)
- `sidebarMenuLabels.js` 신규 — MENU_KEY_LABEL + SUB_TABS_BY_PATH SSOT
- `MenuVisibilityContext.jsx` `getVisibility(...keys)` 메소드 + BroadcastChannel listener
- `Sidebar.jsx`:
  · `__section:<key>` hidden → 섹션 통째 비노출
  · `__leaf:<route>` hidden → leaf 만 비노출
  · disabled 시각: opacity 0.4 + line-through + "비활성" 배지

#### 3.5 Task #22 — 메뉴 권한 ↔ 요금 자동 산출 (초고도화)

**Migration**:
- `menu_value_score` 테이블 + 28 row seed (총 $378.85)
- category (core/standard/premium/enterprise) + ai_premium_pct + bundle_count

**Backend**:
- `MenuPricingSync.php`: GET sync (rules + stats + plans 권장가) / PUT upsertScores / PUT applyRecommended
- Tier 분류 알고리즘 + 라운딩 정책 4종

**Frontend**:
- `PlanPricing.jsx` MenuPricingSyncPanel — 플랜별 현재가 vs 권장가 + 카테고리 막대 + ⚡ 적용
- BroadcastChannel listener (메뉴 권한 토글 → 권장가 실시간 재계산)
- **P1-I** 가중치 편집 모드 추가 (172차 마지막 작업): 28 menuKey 인라인 편집 + PUT bulk

#### 3.6 Enterprise 견적가 등록 활성 (사용자 명시)

- `PlanPricing.jsx` `disabled={isCustom}` 일괄 제거
- Enterprise 도 admin 견적가 + 기간 + 할인 자유 입력
- 기간 추가 폼 isCustom 분기: "견적가 등록" 라벨 + 보라 컬러
- savePlan: `is_custom_quote` NULL 강제 제거 + period 저장 skip 제거

#### 3.7 긴급 fix — admin plan 다운그레이드 사고

- cc playwright 가 admin token 으로 쿠폰 redeem 테스트 → `ceo@ociell.com` plan='admin' → 'pro' 강등
- 사용자 403 보고 → SQL UPDATE 즉시 복원
- `CouponRedeem.php` 가드 추가: 현재 plan='admin' 또는 'enterprise' 시 redeem 403 거부

### 4. 사용자 운영원칙 누적 (U-prefix)

기존 U-161-A ~ U-171-F 유지. **172차 신규**:

- **U-172-A**: cc 브라우저 실시간 확인 의무 — UI/가시성/컬러/레이아웃/인터랙션 작업 시 MCP Playwright 로 직접 브라우저 열고 검증하면서 진행. 코드만 수정 후 사용자 검증 떠넘기기 금지. memory: `feedback_browser_verify_always.md`

- **U-172-B**: PM 권장 1개 추천 원칙 강화 — 사용자가 다음 단계 결정 어려울 때 cc가 항상 권장 1개 명시. 짧게 핵심.

- **U-172-C**: admin token 으로 쿠폰 redeem 실험 금지 — 사용자 plan 강등 위험. 별도 test 계정 또는 SQL 사전 확인.

- **U-172-D**: menu_tree 5계층 확장 — `__section:/__leaf:/__subtab:` 접두사로 namespace 분리. backend validId regex 와 frontend Sidebar 가 모두 인식해야 함.

### 5. 미해결 / 다음 라운드 (173차 작업 후보)

#### 5.1 P0 — 매출 차단 잔여 (사용자 sandbox 값 받으면 즉시)

**P0-A 완결 (10분)**:
- 사용자 5개 값 받기 (PADDLE_CLIENT_TOKEN + 4 priceId)
- 운영 `.env` 추가 + php-fpm reload
- admin `/admin/plan-pricing` 4 priceId DB 입력
- cc playwright Paddle Checkout 실제 작동 검증

#### 5.2 P1 — 기능 완성도

| # | 항목 | 작업량 | 비고 |
|---|---|---|---|
| F-1 | Attribution.jsx Mock → 실 API | 중 | v419 endpoint API key 인증 필요 (별도 endpoint 작성) |
| F-2 | Marketing.jsx Mock | 중 | 캠페인 성과 실 API |
| F-3 | CRM.jsx Mock | 중 | B2B SaaS 핵심 데이터 |
| F-4 | AIMarketingHub.jsx Mock | 중상 | AI 추천 실 API |
| G | 만료 알림 + D-day 배너 | 중 | UserAuth::resolveActivePlan 후속 |
| H | 데모 backend 동기화 | 소 | 운영 ↔ 데모 file sync |
| **I** | ✅ menu_value_score 가중치 admin UI | (완료) | 5b2f1aaaa |

#### 5.3 P2 — 협업 & 인프라

| # | 항목 | 비고 |
|---|---|---|
| **J** | 🆕 **팀/팀원 채팅 기능** | 사용자 명시 신규 — workspace 멤버 + 1:1/그룹 + 파일 첨부 |
| K | N-152-F PM-Core 잔여 (Milestones/Dependencies/Comments/etc) | |
| L | SSE 실시간 알림 인프라 | 채팅과 공유 |

#### 5.4 P2 — 정리

| # | 항목 |
|---|---|
| M | 22 mock 페이지 + 25 skeleton 페이지 일괄 fix |
| N | ko.js 중복 namespace (gNav x2, sidebar x3) 정리 |
| O | 운영/데모 dist 백업 폴더 정리 (2.5GB) |

#### 5.5 P3 — 최종 글로벌 SaaS (사용자 명시)

| # | 항목 | 작업량 |
|---|---|---|
| **P** | 🌍 **15개국 현지 자연어 i18n 완벽 구현** | 대 |

- ko 마스터 → 14개 언어 누락 키 추출 (i18n-sync agent)
- 자동 번역 + 도메인 용어 사전
- 통화/숫자/날짜 현지화 (`Intl.NumberFormat`, `Intl.DateTimeFormat`)
- RTL (Arabic) 레이아웃 검증
- 15 locales × 5,000+ key

### 6. credentials 회전 강조 (172차 누적)

본 세션에서 cc 가 사용한 ops 자원:
- SSH (vot@Wlroi6!) — **~25회** (pscp + plink)
- MySQL root (qlqjs@Elql3!) — **~12회**
- Paddle Sandbox 5개 값 — 미제공
- ceo@ociell.com 로그인 (admin) — 1회 명시

**173차 진입 시 작업 시작 전 credentials 회전 권고**. memory `feedback_credentials_handling.md` 정합.

### 7. 173차 검수자 첫 응답 강제 의무

1. ⚠️ 본 인계서 §1-§5 인지 명시 (특히 §1 최상위 상태 + §5.1 P0-A 잔여)
2. U-170-A/B/C/D + U-171-A/B/C/D/E/F + **U-172-A/B/C/D** 모두 인지
3. 사용자 credentials 회전 확인
4. MCP Playwright (`mcp__playwright__*`) 활성 — UI 작업 시 무조건 브라우저 직접 검증 (U-172-A)
5. NEXT_SESSION.md commit 후 push 시 사용자 명시 승인 필요

### 8. 173차 권장 진입 시나리오

**Option A (매출 차단 즉시 해소)**: 사용자가 Paddle Sandbox 5개 값 제공 → P0-A 완결 → 실 결제 작동 검증 (1라운드)

**Option B (P1-F Mock 페이지 fix)**: Attribution / Marketing / CRM / AIMarketingHub 중 1개부터 → backend endpoint 인증 패턴 조정 + 실 데이터 노출 (2-3 라운드)

**Option C (PHASE 3 팀 채팅)**: SSE 인프라 + workspace 멤버 + 1:1 채팅 부터 (4-6 라운드)

**Option D (PHASE 5 15개국 i18n)**: i18n-sync agent 활용 → 누락 키 자동 번역 + 사람 검수 (3-5 라운드)

권장 1순위: **Option A** (사용자 값 받으면 즉시 + 매출 lifecycle 완결)

### 9. memory 파일 갱신 권장 (173차 cc)

| 파일 | 172차 갱신 권고 |
|---|---|
| `MEMORY.md` (index) | **U-172-A 추가됨** ✅ (172차 cc 가 갱신) |
| `feedback_browser_verify_always.md` | **신규 추가** ✅ (172차 cc) |
| `feedback_pm_operational_rules.md` | **U-172-A/B/C/D 추가 권장** |
| `feedback_credentials_handling.md` | 172차 누적 사용 ~37회 → 회전 강조 |
| `project_n152f_consolidated.md` | **172차 신규** (5계층 menu_tree, 가중치 시스템, 쿠폰 통합) |
| `reference_ops_host.md` | **신규 path** (`/tmp/CouponAdmin.php`, `/tmp/MenuPricingSync.php`, `/tmp/menu_tree_extended_172.sql`) |

### 10. 172차 종합 상태 표 (173차 즉시 참조)

| 영역 | 172차 진입 | 172차 종료 |
|---|:-:|:-:|
| 운영 dist | 171p4 (`index-DNsOoom8.js`) | ✅ **172p19 (`index-GaIE36f4.js`)** |
| `/admin/plan-pricing` 탭 | 3 탭 (요금·상세/메뉴권한/기간별) | ✅ **3 탭** (💰 플랜&요금 / 🔐 메뉴권한 / 🎟️ 쿠폰관리) |
| Enterprise 견적가 | 입력 불가 | ✅ admin 자유 입력 |
| 메뉴 권한 트리 | 평탄 26 row | ✅ **4계층 한글 + 일괄** |
| 메뉴 가시성 (menu_tree) | 26 row | ✅ **138 row 5계층 + 140 토글** |
| Sidebar 가시성 반영 | menuKey 만 | ✅ **5계층 즉시 반영 + Broadcast** |
| 쿠폰 시스템 | CouponEngine 코드만 (silent fail) | ✅ **자동 + 수동 + redeem + 가드** |
| 회원가입 cycle 선택 | 없음 | ✅ 1/3/6/12개월 카드 + 총액·할인 |
| Task #22 메뉴↔요금 sync | 없음 | ✅ 28 menuKey + 권장가 + 가중치 편집 |
| 매출 차단 | 100% (priceId + clientToken 둘 다 없음) | ⚠️ **50% (코드/UI 완비, 값만 대기)** |
| GDPR 배너 placeholder | "배너 제목/설명" raw | ✅ 실 한국어 ("쿠키 및 개인정보 동의") |
| 전역 텍스트 가시성 | linear-gradient white-text-force 버그 | ✅ solid bg + theme-aware |
| 1m 가격 → 기간별 실시간 산출 | 미작동 | ✅ 월간 SSOT → months × monthly 즉시 |
