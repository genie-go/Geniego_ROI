# DUPLICATE_AUDIT_REPORT.md

GeniegoROI 중복 감사 보고서 — 단일 통합 구조 전환을 위한 사실 수집

- 감사일: 2026-06-18
- 작업 기준 디렉터리: `E:\project\GeniegoROI` (E 드라이브, HEAD `e9a3b544eb6` / 230차)
- 감사 방법: 4개 병렬 탐색 에이전트(프론트 메뉴·라우트·페이지 / 백엔드 라우트·핸들러 / DB 스키마·테이블 / 20개 핵심 기능 인벤토리) + 메인 세션 교차검증
- 규모: 백엔드 핸들러 73개(+PM 서브 12) · 프론트 페이지 116개 · `routes.php` 2,706줄 · DB 테이블 정의 140+ (Db.php 46 + 핸들러 런타임 100+)

> ⚠️ **에이전트 주장 정정 원칙**: 하위 에이전트가 "삭제하라"고 단정한 항목 중, 메인 세션이 직접 grep으로 교차검증해 **틀린 것은 본문에서 정정**했다. 삭제·통합은 반드시 "삭제 전 증명 5단계"를 통과한 항목만 대상으로 한다.

---

## 0. 핵심 결론 (TL;DR)

1. **"유사해 보이는" 대시보드/마케팅/채널 페이지 대부분은 실제로는 역할 분리** 상태로, **통합하면 안 된다**. 이미 다수 라우트가 리다이렉트로 단일 허브에 흡수돼 있다(예: `/connectors`·`/api-keys`·`/ad-channels`·`/mapping-registry`·`/smart-connect` → `/integration-hub`).
2. **20개 핵심 기능 중 16개는 프로덕션 수준으로 이미 존재** → 전부 "신규 생성 금지, 초고도화" 대상.
3. **진짜 중복·정리 대상은 한정적**이며 대부분 **백엔드 인프라 레벨**(DB 테이블 자가생성 분산, 알림/채널 핸들러 파편화, 응답 포맷 불일치)에 있다.
4. **신규 메뉴/페이지/대시보드/핸들러는 만들 필요가 없다.** 부족분(Commerce ROI의 COGS, Logistics ROI의 배송비, 전역 Audit 미들웨어)은 **기존 핸들러 확장**으로 해결 가능.

---

## 1. 발견된 중복 — 메뉴 (프론트엔드)

**판정: 신규 중복 메뉴 없음. 사이드바는 이미 단일 SSOT(`sidebarManifest.js`)로 관리됨.**

유사해 보이지만 역할이 분리되어 통합 불필요한 그룹:

| 그룹 | 멤버 | 판정 |
|------|------|------|
| 대시보드 7종 | `Dashboard`(/dashboard, 8탭 통합현황) · `PnLDashboard`(/pnl, 순이익 워터폴) · `RollupDashboard`(/rollup, 집계 레이어) · `DataTrustDashboard`(/data-trust, 데이터 품질) · `PerformanceHub`(/performance, 성과) · `OperationsHub`(/operations, 운영현황) · `SystemMonitor`(/system-monitor, admin 헬스) | **역할 분리 — 통합 금지** (KPI·시간단위·권한 모두 상이) |
| 마케팅 5종 | `Marketing`(현황) · `MarketingMix`(MMM 모델) · `AutoMarketing`(자동화 파이프라인) · `CampaignManager`(캠페인 CRUD) · `ContentCalendar`(콘텐츠 캘린더) | **역할 분리 — 통합 금지** |
| 정산/결제 5종 | `Settlements`(현황) · `Reconciliation`(대사) · `PaymentMethods`(결제수단) · `PgConfig`(admin PG) · `PlanPricing`(admin 플랜) | **역할 분리** (CrossLinkBar로 이미 비파괴 연결) |

**유일하게 명확화가 필요한 메뉴 레벨 항목:**
- `AdminMenuManager`(UI 가시성 토글) vs `MenuAccessManager`(플랜별 접근 권한 저장): **다른 계층이라 중복 아님**. 단 `MenuAccessManager`는 App.jsx에 명시 라우트가 없어 직접 도달 불가 → 라우트 노출만 정리.

---

## 2. 발견된 중복 — 페이지 (프론트엔드)

**진짜 정리 대상(고아/중복) — 검증 완료:**

| 파일 | 상태(검증) | 조치 |
|------|-----------|------|
| `pages/AIMarketingHub.jsx` (747줄) | App.jsx **미import·라우트 없음**. `GlobalDataContext`/`ApiKeys`에 문자열 참조 흔적 존재 | **고아 — 삭제 전 참조 확인** (CampaignManager가 기능 대체) |
| `pages/AdChannelConnect.jsx` (289줄) | App.jsx **미import·라우트 없음** | **고아 — 삭제 후보** (기능은 `ApiKeys`=IntegrationHub에 흡수) |
| `pages/Commerce.jsx` (2줄) | ❌ **삭제 금지** — `<Navigate to="/omni-channel" replace />` **정상 리다이렉트 컴포넌트** | **유지** (하위 에이전트 "stub 삭제" 주장은 오판) |
| 메뉴 미노출 라우트 7종 | `/my-coupons`·`/rules-editor-v2`·`/ai-recommend`·`/amazon-risk`·`/digital-shelf`·`/supplier-portal`·`/demand-forecast` | 라우트는 살아있음 → **(a) 메뉴 노출 / (b) 의도적 deeplink 주석화** 중 택일. 즉시 삭제 금지 |

> ⚠️ 하위 에이전트가 "AIMarketingHub/AdChannelConnect는 App.jsx L89/L18의 dead import"라고 보고했으나, **메인 세션 grep 결과 App.jsx에 해당 import 자체가 존재하지 않음**(184차에 이미 정리됨). 따라서 "App.jsx 라인 제거"는 불필요하고, **남은 것은 pages/ 고아 파일뿐**이다.

**역할 분리로 통합 불필요(중복 아님)**: 채널/커넥터 페이지군(`ApiKeys`=중앙 허브 / `OmniChannel`=읽기 대시 / `CatalogSync`=쓰기 동기화 / `ChannelKPI`=성과 / `KrChannel`=국내정산), SNS 채널군(Kakao/LINE/WhatsApp/Email/SMS/InstagramDM = 플랫폼별), PM 9개 라우트(허브+서브뷰).

---

## 3. 발견된 중복 — API 라우트 / 핸들러 (백엔드)

### 3-A. 진짜 정리 대상 (검증 완료)

| 항목 | 사실(검증) | 조치 |
|------|-----------|------|
| `Controllers/PerformanceController.php` | ❌ **"즉시 삭제" 금지** — `routes.php`에 **4개 라우트 실제 연결**: `/api/v1/ad-performance/summary`(1097), `GET /api/performance`(2389), `POST /api/performance`(2399), `/api/performance/recommendations`(2400). `AdPerformance` 핸들러와 기능 중복 | **라우트를 `AdPerformance`로 이관 후** 컨트롤러 제거 (선 이관·후 삭제) |
| Phantom 버전 라우트 | v382, v386 등 핸들러 클래스 부재로 404 매핑 추정 | **존재 확인 후** 주석 정리 (Fantasy-call 검증 패턴 적용) |
| Risk v378/v379/v380 | 동일 Risk 모델 3중 등록(테스트용 추정) | 단일 버전으로 정리 검토 |

### 3-B. 역할 분리지만 오케스트레이션/SSOT 부재 (통합 ≠ 삭제, 파사드 권장)

| 그룹 | 핸들러 | 판정 | 권장 |
|------|--------|------|------|
| **알림/메시징 (최고 파편화)** | `Alerting` · `EventPopup` · `EmailMarketing` · `SmsMarketing` · `KakaoChannel` · `Line` · `WhatsApp` · `InstagramDM` (8종) | 각자 settings/templates/campaigns CRUD 독립 → **통합 디스패치 레이어 부재** | 기존 핸들러 **유지**하되 `NotifyEngine`을 **단일 디스패처 파사드**로 승격(`dispatch(channel, ...)`). **핸들러 삭제 아님** |
| **채널 인프라 (SSOT 2중화)** | `Connectors` · `ChannelCreds` · `ChannelRegistry` · `ChannelSync` · `OAuth` | `ChannelRegistry`(v426 신규)가 SSOT여야 하나 나머지 동시 활성 | `ChannelRegistry`를 메타데이터 SSOT로 확정, 나머지가 **이를 참조**하도록 리팩토링. `Connectors`의 미사용 메서드만 정리 |
| **마케팅 최적화 (3중 옵티마이저)** | `AutoCampaign`(상태/배분) · `AutoRecommend`(베이즈+밴딧) · `Mmm`(반응곡선) · `ClaudeAI`(생성·직교) | 채널 예산 배분 SSOT 불명확 → drift 위험 | 우선순위 파사드(Mmm > AutoRecommend) + 계약 문서화. **삭제 아님** |
| 어트리뷰션 | `Attribution`(v419 단일터치) · `AttributionEngine`(v424 MTA 6모델) · `AttributionMetrics`(v424 BI) | **역할 분리** | v419 레거시 유지, UI는 v424 우선 |
| 결제/빌링 | `Payment`(Toss 일회성) · `Paddle`(구독) · `PgSettlement`(정산리포트) · `BillingMethod`(수단) · `MenuPricingSync`(가격 SSOT) | **역할 분리** | 가격 SSOT를 `MenuPricingSync`로 일원화 |
| 쿠폰 | `CouponAdmin`(admin) · `CouponRedeem`(사용자) · `CouponEngine`(자동발급) | **역할 분리 — 정상** | 조치 불필요(단 DB 테이블 정리는 §4 참조) |
| CRM/AI | `CRM` · `CustomerAI` · `Insights` · `DemandForecast` · `AnomalyDetection` · `ModelMonitor` · `Decisioning` · `GraphScore` | **전문화 레이어 — 정상** | 역할 문서화만 |

### 3-C. 횡단 이슈 — 응답 포맷 불일치
- `TemplateResponder::respond()`(다수) vs 수동 `json_encode`+`withHeader`(소수, AutoCampaign/Mmm/OrderHub 등) 혼재. 에러 봉투 불일치.
- 조치: 공통 응답 포맷을 `TemplateResponder`로 표준화(소수 핸들러 마이그레이션).

---

## 4. 발견된 중복 — DB 구조

**핵심 문제: 핵심 46개 테이블은 `Db.php` 중앙 마이그레이션으로 관리되나, 100+ 부가 테이블이 핸들러 첫 호출 시 자가 생성되어 정의가 분산됨.**

### 4-A. 동일 스키마 다중 정의 (진짜 중복 — 중앙화 대상)

| 테이블 | 중복 정의 위치(검증) | 조치 |
|--------|---------------------|------|
| `app_setting` (전역 KV) | **6개 핸들러**: OAuth · Connectors · UserAuth · WhatsApp · GdprConsent · PgSettlement — **Db.php에는 없음** | `Db.php` 중앙 정의로 이동, 핸들러는 의존만 |
| `free_coupons` / `coupon_redemptions` / `coupon_rules` | `CouponEngine` + `UserAdmin` + `backend/migrations/*` (2~3중) | 마이그레이션 단일화, 런타임 생성 제거 |
| `channel_credential` | `Db.php:768` + `ChannelSync.php:173` | 핸들러 자가생성 제거, Db.php 의존 |
| `ai_settings` | `ClaudeAI` + `AiGenerate` | 단일 정의 |
| `wms_supply_orders` | `Wms` + `DemandForecast` | 소유 핸들러 1개로 |
| `channel_orders` | `ChannelSync` + `LiveCommerce` | 스키마 정합 후 단일화 |

### 4-B. 역할 분리(중복 아님)
- 정산 계층: `settlement`(범용) → `kr_settlement_line`(국가별) → `pg_settlement`(PG) → `orderhub_settlements`(채널집계) — 데이터 흐름만 문서화.
- 자격증명 3종: `channel_credential`(채널 키) / `connector_token`(OAuth 토큰) / `api_key`(사용자 API 키) — 용도 상이.

### 4-C. 멀티테넌트 격리 결함 (P0 보안)
- **`app_user`·`user_session`·`password_reset` 테이블에 `tenant_id` 컬럼 없음** → 다중 테넌트 사용자 격리 불가.
- 비즈니스 데이터 40+ 테이블은 `tenant_id` 보유(양호). 사용자 테이블만 글로벌.

---

## 5. 삭제하지 않고 보존해야 할 핵심 파일

- 대시보드 7종, 마케팅 5종, 정산/결제 5종, SNS 채널군, PM 9 라우트 — **전부 역할 분리, 보존**.
- `pages/Commerce.jsx` — 정상 리다이렉트, **보존**.
- `Db.php`(46 테이블 중앙 마이그레이션), `PlanPolicy.php`/`PlanLimits.php`, `teamRolePolicy.js`/`planMenuPolicy.js`/`tabPlanPolicy` — RBAC/플랜 SSOT, **보존**.
- 배포 운영 스크립트(`deploy.ps1`/`deploy.sh`/`deploy_gitbash.sh`/`deploy_demo.cjs`/`deploy_node.cjs`/`deploy_ssh2.cjs`/`.github/workflows/deploy.yml`) — **보존**(CLAUDE.md 보존 매트릭스).
- v419 어트리뷰션 등 레거시 버전 라우트 — 하위 호환, **보존**.

---

## 6. 통합 대상 (요약)

| 우선순위 | 대상 | 방식 | 리스크 |
|---------|------|------|--------|
| P0 | `app_user` 테넌트 격리 | `tenant_id` 컬럼 추가 + 마이그레이션 | 보안 |
| P0 | `app_setting` 6중 정의 | `Db.php` 중앙화 | 데이터 이중화 |
| P1 | 쿠폰 테이블 3중 정의 | 마이그레이션 단일화 | 일관성 |
| P1 | `PerformanceController` 4 라우트 | `AdPerformance`로 이관 후 컨트롤러 제거 | 라우트 단절(선이관 필수) |
| P1 | 알림 8핸들러 | `NotifyEngine` 디스패처 파사드(핸들러 유지) | 비파괴 |
| P2 | 채널 인프라 SSOT | `ChannelRegistry` 중심 참조화 | 동기화 회귀 |
| P2 | 응답 포맷 | `TemplateResponder` 표준화 | 낮음 |
| P2 | 고아 페이지 2개·미노출 라우트 7개 | 참조확인 후 정리/노출 | 낮음 |

---

## 7. 초고도화 대상 파일 (신규 금지, 기존 확장)

- **Commerce ROI**: `OrderHub.php` + `commerce_sku_day` 테이블에 COGS(매입가) 컬럼 추가 → SKU별 순이익 완성 (신규 페이지 불필요, `PnLDashboard`/`RollupDashboard` 재사용).
- **Logistics ROI**: `Wms.php`/`Logistics.php` 배송비 → `OrderHub`/`Rollup` 집계에 실연동(현재 주석 수준).
- **Audit Log**: `audit_log` 테이블·`Audit.jsx` 뷰 존재. `Payment`·`UserAdmin`·`ChannelSync` 등 쓰기 동작에 `audit()` 호출 추가 + **전역 mutation 미들웨어** 1개 추가(`index.php` 미들웨어 확장).
- **Enterprise Dashboard**: 신규 페이지 대신 `Admin.jsx`에 enterprise 전용 탭 분리.

---

## 8. 새로 구현이 꼭 필요한 파일 (최소)

> 원칙: 신규 파일은 "기존 구조로 불가능"한 경우만. 아래는 **확장이 아닌 신설이 정당한 최소 항목**이며, 모두 승인 후 진행.

1. **전역 Audit 미들웨어** — 기존 핸들러 어디에도 "모든 POST/PUT/DELETE 자동 기록" 지점이 없음. `index.php` 미들웨어 체인에 1개 추가(기존 `audit_log` 테이블 재사용). *신규 테이블/핸들러 없음.*
2. **DB 중앙 마이그레이션 항목** — `app_setting`·쿠폰 테이블을 `Db.php`/`migrations`에 흡수(신규 테이블 아님, 정의 이동).

그 외 §3·§4의 모든 통합은 **파사드/리팩토링**이며 신규 메뉴·페이지·핸들러·테이블 생성을 **수반하지 않는다**.

---

## 부록 A. 루트 디렉터리 임시 산출물 적체 (정리 권고)

`git status` 미추적 산출물 147개:
- 배포 tarball(`dist_*.tgz`/`.zip`/`.tar.gz`) 41개
- `audit_*` 디렉터리 21개
- `_tmp_*` 38개
- 스크린샷 `*.png` 39개

→ 원칙 6("임시/백업 파일 남기기 금지") 위반. `.gitignore` 확인 후 일괄 정리 권고(별도 승인).

## 부록 B. 검증 메모 (삭제 전 증명)

- 직접 grep 교차검증한 항목: App.jsx import 부재(AIMarketingHub/AdChannelConnect), Commerce.jsx 실내용, app_setting 6중 정의, PerformanceController 4 라우트 연결.
- **미검증·추정 항목**(추가 검증 후 조치): Phantom 버전 v382/v386, Connectors 미사용 메서드 범위, `event_popup` 라우트 사망 여부, `data/*.sqlite` 실제 테이블 목록(sqlite3 미설치로 미확인).
