# 174차 세션 인계서 (NEXT_SESSION.md) — **173차 4 commit: Paddle 운영 lifecycle + i18n + 대시보드 시각 정합**

> **작성일**: 2026-05-27 (사용자 명시 승인 후)
> **이전 세션**: 173차 (Paddle 7원칙 운영 수준 + /dashboard /marketing 시각 검증 + PnL i18n 보강 + RollupDashboard active sub-tab fix)
> **다음 세션**: 174차
> **저장 위치**: repo root `NEXT_SESSION.md`
> **종결 방식**: 운영 dist swap 전 단계 (4 commit local). push 별도 명시 승인 대기.

---

## ⚠️ 174차 검수자 최우선 인지 사항

### 1. 최상위 상태 (174차 진입 시점)

| 영역 | 상태 | 비고 |
|---|:-:|---|
| 운영 frontend dist | ⚠️ 172p19 (`index-GaIE36f4.js`) | 173차 4 commit 미반영 |
| 데모 frontend dist | ⚠️ 172차 동일 | 별도 라운드 |
| 운영 backend Paddle.php | ⚠️ 172차 동일 | 173차 보강 미배포 |
| 운영 backend AdminPlans.php | ✅ 172차 적용 | |
| local 174차 진입 시 commit 4건 | ✅ master local | push 대기 |
| Paddle Sandbox 11개 값 | ❌ 미적용 | 매출 차단 (사용자 대시보드 작업 대기) |
| PnLDashboard pnl.* i18n | ✅ 13언어 root.pnl 보강 | 운영 미반영 |
| RollupDashboard active sub-tab | ✅ dyn-sub-tab-btn fix | 운영 미반영 |
| /attribution sub-tab wrap | ⚠️ 잠재 결함 (174차 후보) | |
| AutoMarketing/JourneyBuilder/CampaignManager sub-tab | ⚠️ 동일 결함 가능성 | |

### 2. 173차 변경 — git 커밋 일람 (4 commit)

```
19cabf3f8  fix(보강): RollupDashboard active sub-tab + dyn-color CSS (2 files, +25/-1)
e21dad85b  fix(i18n): PnLDashboard pnl.* raw key 노출 → 13언어 root.pnl 보강 (13 files, +1308/-16)
e25105c67  fix(보강): /dashboard 8탭 + /marketing 6탭 시각 검증 후 추가 overlap fix (4 files, +37/-5)
d8dc5374f  feat: Paddle 운영 결제 lifecycle 완비 + 대시보드 텍스트 중첩 fix (10 files, +693/-75)
```

**합계: 29 files, +2063/-97**

### 3. 173차 핵심 변경 정리

#### 3.1 PHASE 1 — Paddle Billing 운영 가능 수준 (사용자 7원칙 정합)

**Frontend (PricingPublic.jsx)**:
- cycle 토글 (1/3/6/12개월) — 기존 binary monthly/annual → 4-cycle pill
- `location.state.autoCheckout` 수신 → SDK 준비 후 자동 Paddle.Checkout.open (가입 후 자동 진입)
- `plan.periods` 매트릭스 우선 매칭 (price_id_monthly/annual legacy fallback)
- customData `{plan_id, cycle_months}` 동봉 (webhook 식별)
- FAQ 재작성: card-only + 4 cycle + retry + refund 정합

**Backend (Paddle.php)**:
- `processEvent` occurred_at stale skip: subscription/transaction/adjustment 전체
- `onRefunded` 전면 재작성: full/chargeback → user plan='demo' + sub status='refunded' (사기 위험 차단)
- `resolveAppPlan` 5-tier lookup: plan_period_pricing → plan_config → .env → heuristic → fallback
- adjustment.created / adjustment.updated 신규 webhook 처리

**Docs (신규)**:
- `docs/P0_PADDLE_OPS_PLAYBOOK.md` — Paddle 대시보드 작업 + 운영 적용 + webhook 검증 + 트러블슈팅 완전 가이드

#### 3.2 PHASE 2 — 5개 public 페이지 영어 운영 수준 정합

- `Terms.jsx` §3 billing cycle 4종 + Card-only + §3.4 retry 정책
- `Privacy.jsx` §5.1 data retention 5종 (active/paused/billing/log/erasure)
- `Refund.jsx` §3 card-only refund flow + §3.1 chargeback 정책
- `PricingPublic.jsx` FAQ — PayPal/Apple Pay 등 카드 외 제거

#### 3.3 PHASE 3 — 대시보드 텍스트/그래프 중첩 fix (사용자 명시 결함)

cc playwright 운영 페이지 직접 시각 검증 (U-173-A) 진행:

**/dashboard 8탭 일주** (overview/marketing/channel/commerce/sales/influencer/system/guide):
- DashOverview KPI 6/9 column → `repeat(auto-fit, minmax(...))`
- KpiCard 내부 layout: minWidth:0 + flex:1 + 텍스트 ellipsis + Spark 폭 78→64 + flex-wrap
- DashMarketing KPI 7 column → auto-fit (150px)
- DashChannelKPI 6 column → auto-fit (170px)
- DashCommerce 5 platform card → auto-fit (135px)

**/marketing 6탭 일주** (overview/ad_status/creative/compare/ai_design/guide):
- Marketing legend wrapper 결함 fix (wrapper width:10/height:10/bg=color → marker + label 분리)
- Marketing sub-tab active **white-on-white** 결함 fix (data-active + 신규 className + 가장 specific CSS rule)

**BudgetTracker.jsx** 3 legend 동일 wrapper 결함 fix.

#### 3.4 PHASE 4 — i18n raw key 100+ 노출 fix (PnLDashboard)

발견:
- /pnl 운영 페이지에서 `pnl.pageDesc`, `pnl.tabUnitPnl`, `pnl.wfRevenue` 등 100+ key raw 노출
- ko.js root.pnl 네임스페이스에 spec key 미존재 (title/subtitle/grossRevenue 등 별도 set 만)
- ko.js nested pnl (L20690) 에 한국어 spec key 가 이미 있었으나 다른 outer namespace 안

수정:
- ko.js root.pnl 에 91 spec key 한국어 보강 (기존 5 key colChannel/Revenue/Margin/AdSpend/NetProfit 중복 제외)
- i18n-sync agent 호출 → 12 언어 동기화:
  · en.js — 자연스러운 영어 번역
  · de/th/vi/id/ar/es/fr/hi/pt/ru/zh-TW — 영어 fallback
- **ja.js / zh.js 는 sacred SHA + pre-existing collision (dashGuide / dashTabs) 로 별도 라운드 보류**
- triage_apply self-test 3 PASS (collision / wronglang / dead_subtree)

#### 3.5 PHASE 5 — 도메인 페이지 시각 점검 (6개)

| 페이지 | 결과 |
|---|---|
| /pnl | 🚨 i18n raw key → ✅ fix |
| /rollup | 🚨 active sub-tab white-on-white → ✅ fix (dyn-sub-tab-btn) |
| /attribution | ⚠️ 12 sub-tab 일부 wrap (174차 후보) |
| /crm | ✅ 결함 없음 |
| /account-performance | ✅ 결함 없음 |
| /order-hub | ✅ 결함 없음 |

### 4. 사용자 운영원칙 누적 (U-prefix)

기존 U-161-A ~ U-172-D 유지. **173차 신규**:

- **U-173-A**: cc playwright 운영 페이지 시각 점검 의무 (`mcp__playwright__browser_navigate` + `take_screenshot`). 사용자 명시 결함 (예: /marketing 중첩) 외에도 cc 가 운영 직접 시각 검증 → 발견된 결함 즉시 fix. UI 작업 떠넘기기 금지.

- **U-173-B**: i18n raw key 노출 발견 시 ko.js master 보강 + 영어 fallback 14언어 sync (i18n-sync agent). 사용자 명시 영역. ja/zh sacred SHA 별도 라운드 (baseline.json 갱신 필요).

- **U-173-C**: sub-tab-nav active 결함 (white-on-white) 패턴 발견 시 page 별 dynamic color vs 고정 color 구분. mkt-sub-tab-btn (Marketing 고정 색) / dyn-sub-tab-btn (Rollup 등 dynamic 색) 분리.

- **U-173-D**: pre-commit gates (G2 sacred / G5 leaves / G6 collision) 차단 시 `--no-verify` 강제 금지. 변경 reasoning 후 단일 commit 분할 또는 sacred 파일 (ja/zh) 별도 라운드.

### 5. 미해결 / 다음 라운드 (174차 작업 후보)

#### 5.1 P0 — 운영 적용 (사용자 명시 승인 후)

**P0-A 매출 차단 잔여** (사용자 Paddle 대시보드 작업 대기):
- 사용자가 docs/P0_PADDLE_OPS_PLAYBOOK.md §1 따라 Sandbox 11개 값 발급:
  · PADDLE_CLIENT_TOKEN / PADDLE_SECRET_KEY / PADDLE_WEBHOOK_SECRET / PADDLE_ENV=sandbox
  · 8 priceId (Starter × 1/3/6/12m + Pro × 1/3/6/12m)
- cc 에 전달 후:
  · 운영 .env 추가 + php-fpm reload
  · admin `/admin/plan-pricing` 8 priceId DB 입력
  · cc playwright Paddle Checkout overlay 실 결제 검증
  · webhook subscription.created/activated/transaction.completed 정합 SQL 확인

**P0-B 173차 dist 운영 swap** (push → CI 자동 deploy 또는 manual swap):
- 4 commit 누적 변경 → 운영 반영
- cc playwright 재검증: /pnl raw key 해소 / /rollup active 탭 정상 / /marketing cycle 토글 / KpiCard layout

#### 5.2 P1 — UI 정합

| # | 항목 | 작업량 | 비고 |
|---|---|---|---|
| F-1 | /attribution 12 sub-tab wrap fix | 소 | flex-wrap + min-width 또는 horizontal scroll |
| F-2 | AutoMarketing/JourneyBuilder/CampaignManager sub-tab-nav 동일 패턴 점검 | 중 | dyn-sub-tab-btn 적용 또는 확인만 |
| F-3 | ja.js / zh.js sacred SHA + collision 정리 | 중 | baseline.json 갱신 + dashGuide / dashTabs collision 해소 후 root.pnl sync |
| F-4 | Mock 페이지 4종 fix (Attribution.jsx 등) | 중상 | 172차 인계서 P1-F 잔여 |

#### 5.3 P2 — 협업 & 인프라

| # | 항목 | 비고 |
|---|---|---|
| J | 🆕 팀/팀원 채팅 기능 (172차 명시) | workspace 멤버 + 1:1/그룹 + 파일 첨부 |
| K | N-152-F PM-Core 잔여 | Milestones/Dependencies/Comments 등 |
| L | SSE 실시간 알림 인프라 | 채팅과 공유 |

#### 5.4 P3 — 최종 글로벌 SaaS (사용자 명시)

| # | 항목 | 작업량 |
|---|---|---|
| **P** | 🌍 **15개국 현지 자연어 i18n 완벽 구현** | 대 |

- ko 마스터 → 14언어 누락 키 추출 (i18n-sync agent)
- 자동 번역 + 도메인 용어 사전
- 통화/숫자/날짜 현지화 (`Intl.NumberFormat`, `Intl.DateTimeFormat`)
- RTL (Arabic) 레이아웃 검증

### 6. credentials 회전 강조 (173차 누적)

본 세션에서 cc 가 사용한 ops 자원:
- SSH/MySQL — **0회** (사용자 명시 ops 접속 자제 모드, credentials 회전 알림 후 재개)
- Paddle 계정 (`ceo@ociell.com`) — cc 직접 로그인 X. 사용자 본인 대시보드 작업 후 11개 값 전달 흐름
- Playwright 운영 페이지 접근 — read-only, credentials 사용 X

**174차 진입 전 사용자 credentials 회전 권고 유효** (172차 누적 + 본 세션 미사용). memory `feedback_credentials_handling.md` 정합.

### 7. 174차 검수자 첫 응답 강제 의무

1. ⚠️ 본 인계서 §1-§5 인지 명시 (특히 §1 최상위 상태 + §5.1 P0 운영 적용)
2. U-170-A/B/C/D + U-171-A/B/C/D/E/F + U-172-A/B/C/D + **U-173-A/B/C/D** 모두 인지
3. 사용자 credentials 회전 확인 + Paddle 11개 값 도착 여부 확인
4. MCP Playwright (`mcp__playwright__*`) 활성 — 운영 페이지 직접 시각 검증 (U-172-A + U-173-A)
5. push 시 사용자 명시 승인 필요 — CI 자동 deploy 트리거 (`.github/workflows/deploy.yml`)

### 8. 174차 권장 진입 시나리오

**Option A (운영 dist swap + 173차 fix 검증)**: 사용자 push 승인 → CI 자동 deploy → cc playwright 재검증 (/pnl /rollup /marketing /KpiCard layout 모두 fix 효과 확인). 1 라운드.

**Option B (Paddle 매출 차단 해소)**: 사용자가 Paddle Sandbox 11개 값 제공 → P0-A 완결 → 실 결제 작동 검증. 1-2 라운드. **사용자 Paddle 대시보드 작업 선행**.

**Option C (P1-F UI 정합 추가 fix)**: /attribution sub-tab + AutoMarketing/JourneyBuilder/CampaignManager 4 페이지 시각 점검 + fix. cc 자율. 2-3 라운드.

**Option D (ja/zh i18n sacred SHA 정리)**: baseline.json 갱신 + ja/zh root.pnl sync. 별도 sacred 영역 처리. 1 라운드.

**Option E (PHASE 3-J 팀 채팅 / PHASE 5-P 15국 i18n)**: 신규 대형 기능. 4-6 라운드.

**권장 1순위**: **Option A** (dist swap + 검증). 173차 4 commit 효과를 운영에서 확인 후 다음 결정.

### 9. memory 파일 갱신 권장 (174차 cc)

| 파일 | 173차 갱신 권고 |
|---|---|
| `MEMORY.md` (index) | **U-173-A/B/C/D 추가 권장** |
| `feedback_browser_verify_always.md` | 173차 누적 (운영 페이지 직접 시각 검증 패턴 확립) |
| `feedback_pm_operational_rules.md` | U-173-A/B/C/D 추가 권장 |
| `feedback_credentials_handling.md` | 173차 ops 0회 사용 — 회전 권고 누적 유효 |
| `project_n152f_consolidated.md` | 173차 신규 (Paddle 7원칙 보강 + i18n raw key 패턴 + sub-tab white-on-white 패턴) |
| `reference_ops_host.md` | docs/P0_PADDLE_OPS_PLAYBOOK.md 신규 reference 추가 권장 |

### 10. 173차 종합 상태 표 (174차 즉시 참조)

| 영역 | 173차 진입 | 173차 종료 |
|---|:-:|:-:|
| 운영 dist | 172p19 (`index-GaIE36f4.js`) | ⚠️ **172p19 유지** (173차 dist swap 안 함) |
| 매출 차단 | 50% (priceId/clientToken 둘 다 없음) | 50% (Paddle 7원칙 보강 완료, 값 적용 대기) |
| PricingPublic cycle | binary monthly/annual | ✅ **4-cycle (1/3/6/12개월) + autoCheckout 수신** |
| Paddle webhook 환불 처리 | audit log 만 (사기 위험) | ✅ **full/chargeback → user plan 'demo' downgrade** |
| Paddle priceId 매핑 | .env 4종만 | ✅ **plan_period_pricing 5-tier lookup** |
| 5 public 페이지 영어 정합 | 부분 | ✅ **Card-only + 4 cycle + retry + chargeback** |
| docs Paddle playbook | 없음 | ✅ **docs/P0_PADDLE_OPS_PLAYBOOK.md 신규** |
| /dashboard KPI grid | 6/9 column 강제 wrap | ✅ **auto-fit minmax** |
| /marketing legend wrapper | width:10/height:10 결함 | ✅ **marker + label 분리** |
| /marketing active sub-tab | white-on-white | ✅ **mkt-sub-tab-btn + data-active CSS** |
| /pnl i18n raw key | 100+ 노출 | ✅ **13언어 root.pnl 보강** |
| /rollup active sub-tab | red outline (white-on-white) | ✅ **dyn-sub-tab-btn + dynamic color CSS** |
| credentials 회전 | 172차 누적 ~37회 | 173차 0회 사용 (회전 권고 유효) |

---

**173차 commit hash (push 대기)**:
- `d8dc5374f` `e25105c67` `e21dad85b` `19cabf3f8`

**다음 첫 작업 권장**: Option A (push 사용자 명시 승인 → CI 자동 deploy → cc playwright 재검증).
