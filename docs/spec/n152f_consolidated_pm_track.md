# N-152-F 통합 PM 트랙 spec — 5 sub-track 우선순위 + 의존성 매트릭스

> **작성일**: 2026-05-26
> **세션**: 168차 (드래프트, 사용자 승인 전)
> **저장 위치 (canonical)**: `docs/spec/n152f_consolidated_pm_track.md`
> **상위 spec**: `n152f_pm_features_spec.md` (Task/Milestone/Gantt sub-track 단독 spec)
> **목적**: 168차 이전 누락 트랙 (F1/F2/F3=T3/PH3/PM2) 통합 + cc 인지 누락 정정 (절대원칙 §6)
> **선행 문서**: `PM_HANDOVER.md`, `FEATURE_PLAN_120.md`, `T3_BACKEND_API_REQUEST.md`, `BACKEND_REQUEST_COVER_SHEET.md`, `N-152-A_BANK_GRADE_SECURITY.md`

---

## 0. 본 문서의 위치

본 spec 은 cc 가 168차 진입 시 N-152-F (Task/Milestone/Gantt) **단독 spec** 만 작성하면서 **이전 세션의 사용자 지시 추가 기능 4 트랙을 통합 누락한 정정**.

| sub-track | 정식 명 | 단독 spec | 본 통합 spec 내 위치 |
|---|---|---|---|
| **PM-Core** | N-152-F (Task/Milestone/Gantt) | `n152f_pm_features_spec.md` | §2 |
| **F1** | 캠페인 카테고리 6종 추가 | (없음 — 본 spec §3) | §3 |
| **F2/F3 = T3** | Admin/User 메뉴 가시성 | `T3_BACKEND_API_REQUEST.md` (의뢰서) + `FEATURE_PLAN_120.md` §3-§4 | §4 |
| **PH3** | PM Phase 3 (실시간 알림/대시보드/성능) | `PM_HANDOVER.md` 4절 | §5 |
| **PM2** | PM 문서2 4축 (Connectors/WMS/AI Insights/AdPerf) | `PM_HANDOVER.md` 4절 (raw 미검증) | §6 |

본 spec 의 위 5 sub-track 모두 **N-152-A 은행급 보안 baseline** 충족 의무 (§7).

---

## 1. raw 재조사 결과 (168차 시점, 절대원칙 §2 + PM N-15 패턴 회피)

### 1.1 F1 — 캠페인 카테고리

| 항목 | raw |
|---|---|
| 위치 | `frontend/src/pages/campaignConstants.js` (82 라인) |
| 형태 | (B) 키 참조 배열 — `id`, `catKey`, `label` (영문 인라인), `route`, `color`, `icon`, `context`, `suggestions[]` |
| 현재 카테고리 (10) | beauty, fashion, general, food, electronics, forwarding, purchasing, travel, digital, sports |
| 사용자 요청 6종 (금융/보험/의료서비스/세무회계/법률/기타서비스) | **없음** |
| 동시 정의 | `CAT_TO_PRODUCT` (카테고리 → 상품군 매핑), `PRODUCT_CATALOG` (빈 배열) |
| 사용처 | `CampaignManager.jsx`, `AIRecommendTab.jsx` (코멘트 명시) — i18n 키 `cat_explain_*` (AutoMarketing.jsx) |
| 백엔드 의존 | 매뉴얼 검토 결과 **불요** (FEATURE_PLAN_120 §1 매트릭스) |

**F1 진입 게이트**: 없음 — 프론트 단독 가능 즉시 진입 가능.

### 1.2 F2/F3 = T3 — 메뉴 가시성

| 항목 | raw |
|---|---|
| Sidebar 메뉴 정의 | `frontend/src/layout/Sidebar.jsx` (705 라인, **하드코딩**) |
| 메뉴 라벨 i18n | `frontend/src/layout/sidebarI18n.js` (15 locale × ~60 항목) |
| 메뉴 식별자 | 모든 항목에 `menuKey: "home\|\|dashboard"` 등 string id 부착 (T3 spec §2.1 menu_tree.id 와 호환) |
| 모바일 메뉴 | `frontend/src/components/MobileBottomNav.jsx` (288 라인) |
| Command Palette | `frontend/src/components/CommandPalette.jsx` (166 라인) — 메뉴 검색 |
| MenuVisibilityContext | **미존재** (T3 의뢰서 §5 명세 대기) |
| backend `menu_tree` handler | **미존재** (grep 0 match) |
| backend `menu_tree` migration | **미존재** (grep 0 match) |
| T3 백엔드 답변 | **0건** (152~167차 git log 누락) |
| 사용자 요청 ② (admin 전역 토글) | 미구현 |
| 사용자 요청 ③ (사용자별 개인 토글) | 미구현 |

**F2/F3 진입 게이트**: T3 백엔드 명세 답변 대기 (4세션+). 본 cc 직접 처리 분기 (§4.3) — backend `menu_tree` API + migration 을 본 트랙 내 자체 구현 가능 (백엔드 팀 의뢰 우회).

### 1.3 PH3 — Phase 3

| 항목 | raw |
|---|---|
| 실시간 알림 (WebSocket) | **미구현** — `EventSource` 사용 0, `new WebSocket(...)` 사용 0 |
| 폴링 (대안) | `Approvals.jsx:439` BroadcastChannel + 30s polling, `DashSystem.jsx:441` security alerts polling — 부분 |
| 대시보드 차트 | `frontend/src/components/dashboards/` 다수 존재 (DashOverview / DashSystem / etc.) — 추가 raw 필요 |
| 성능 최적화 | 미규명 (PM 추정) |

**PH3 진입 게이트**: 본 spec §5 의 SSE 채널 = N-152-F (Task/Milestone/Gantt) §8 SSE 채널 **공유 가능** → PM-Core 우선 진행 시 인프라 재사용. PH3 단독 트랙 비효율.

### 1.4 PM2 — PM 문서2 4축 (PM N-15 회피 — PM 추정치 미신뢰)

| 페이지 | raw 라인 수 | PM 추정 | 정합 |
|---|---:|:-:|---|
| `Connectors.jsx` | 540 | 70% | 부분 구현 (라인 ≠ 완성도) |
| `WmsManager.jsx` | 2445 | — | 대형, 추가 raw 필요 |
| `AIInsights.jsx` | 476 | — | 추가 raw 필요 |
| `AdvertisingPerformance.jsx` | **75** | 60% | **stub 수준** (PM N-15 — 추정치 신뢰 X, 실 75 라인) |
| `CampaignManager.jsx` | 504 | — | F1 영향 (`campaignConstants.js` import) |

**PM2 진입 게이트**: 본 cc 가 raw 검증 안 한 상태 — sub-track 진입 시 각 페이지별 raw 우선. 우선순위 결정 사용자 승인 필요.

---

## 2. PM-Core sub-track (N-152-F Task/Milestone/Gantt)

본 통합 spec 의 **메인 트랙**. 상세 spec = `n152f_pm_features_spec.md` (837 라인).

### 2.1 본 spec 과 통합 spec 의 관계

| 항목 | 단독 spec | 본 통합 spec |
|---|---|---|
| 데이터 모델 | 단독 §2 (8 테이블) | 본 §2 그대로 인용 |
| Backend API | 단독 §4 (25 endpoint) | 본 §2 그대로 인용 |
| Frontend | 단독 §7 (9 페이지) | 본 §2 그대로 인용 |
| **SSE 채널** | 단독 §8 (`/v425/pm/events/stream`) | **본 §5 PH3 와 인프라 공유** ★ |
| **i18n** | 단독 §9 (`pm.*` namespace, U-164-A 동결 해제) | **본 §3 F1 i18n 동결 해제와 일괄 처리** ★ |
| **사이드바 추가** | 단독 §13.4 | **본 §4 F2/F3 메뉴 토글 완료 후 진입** ★ (재작업 회피) |

### 2.2 PM-Core 의존성 (다른 sub-track 과의 cross-cut)

1. **F2/F3 의존**: PM-Core 의 `/pm`, `/pm/projects/:id/*` 9 라우트가 Sidebar 에 추가될 때, F2/F3 메뉴 가시성 정책이 적용되어야 함. F2/F3 미정 상태에서 PM 메뉴 추가 → 재작업 발생.
2. **F1 의존 없음** (다른 메뉴 — AI 마케팅 캠페인)
3. **PH3 인프라 공유**: PM-Core SSE 채널을 PH3 실시간 알림이 재사용
4. **PM2 의존 없음** (별도 페이지)
5. **N-152-A 보안 baseline 충족 의무** (§7)

---

## 3. F1 sub-track — 캠페인 카테고리 6종 추가

### 3.1 추가 대상

| id | 한국어 라벨 | 영문 라벨 | icon | catKey | 비고 |
|---|---|---|:-:|---|---|
| `finance` | 금융 | Finance | 💰 | finance | 금융 상품 (예: 대출/카드/투자) |
| `insurance` | 보험 | Insurance | 🛡 | insurance | 보험 상품 |
| `medical` | 의료서비스 | Medical Services | 🏥 | medical | 병원/의료 서비스 |
| `tax` | 세무회계 | Tax & Accounting | 📊 | tax | 세무/회계 서비스 |
| `legal` | 법률 | Legal Services | ⚖️ | legal | 법률 자문/서비스 |
| `etc_service` | 기타서비스 | Other Services | 🧩 | etc_service | 기타 서비스업 |

### 3.2 변경 범위

- `frontend/src/pages/campaignConstants.js` — `CAT_OPTIONS` 6 원소 추가 (라벨 영문 인라인 유지, 현 패턴 정합) + `CAT_TO_PRODUCT` 6 키 (각 `[]` 빈 배열 또는 적절한 상품군 매핑 — 사용자 확인 필요)
- `frontend/src/pages/AutoMarketing.jsx` — `insightKey: "cat_explain_*"` 6 키 추가
- i18n keys (`cat_explain_finance` 등) — 15 locale 동시 추가 (**U-164-A 동결 해제 트리거 — 사용자 승인 필요**)

### 3.3 i18n 영향

- 현 패턴: `cat_explain_<id>` 라벨 i18n 키 (AutoMarketing.jsx L78~)
- 신규 6 키 × 15 locale = **90 leaf** 추가
- 영문 라벨 (`label: "💰 Finance"`) 은 인라인 — i18n 화 분기 결정 필요 (현 10 카테고리도 인라인)
- **권장**: 현 패턴 유지 — 영문 라벨 인라인, `cat_explain_*` 만 i18n 화 (혼란 회피)

### 3.4 진입 게이트

- 백엔드 명세: 불요
- 사용자 승인: 카테고리 명/icon/순서 확정 + i18n 동결 해제 (90 leaf)
- 위험: 매우 낮음 (단일 파일 + 1 helper 파일 + i18n 추가)

---

## 4. F2/F3 sub-track — Admin/User 메뉴 가시성 (T3 트랙)

### 4.1 사용자 요청 (FEATURE_PLAN_120 §3-§4)

- **F2 (Admin 전역)**: admin 이 전체 서비스 메뉴를 메뉴 단위 숨김/표시 → 숨김 메뉴는 일반 로그인 사용자에게 비노출
- **F3 (사용자 개인)**: 로그인 사용자가 본인에게 보이는 메뉴 중 개인적으로 숨김/펼침
- **우선순위 정책**: 전역 숨김 > 개인 표시 (관리자 결정 우선, 사용자 확인 필요)

### 4.2 T3 의뢰서 (`T3_BACKEND_API_REQUEST.md`) 미답 항목

| 항목 | T3 의뢰서 §2-§4 |
|---|---|
| `menu_tree` 테이블 (id/parent_id/visibility/required_plan/required_role) | 백엔드 답변 0 |
| `menu_audit_log` (append-only, hash_chain) | 백엔드 답변 0 |
| `menu_defaults` (snapshot 백업) | 백엔드 답변 0 |
| API 6종 (GET tree / GET admin tree / PATCH / POST reorder / POST reset / GET audit log) | 백엔드 답변 0 |

### 4.3 본 트랙 자체 구현 분기 (U-166-D — GitHub Actions 미사용 = cc 직접 deploy = backend 자체 구현 가능)

T3 의뢰서를 백엔드 팀에 보냈으나 **4 세션+ 답변 없음**. 본 통합 spec 의 분기:

#### 분기 X — 백엔드 답변 대기 (현 상태 유지)

- F2/F3 는 UI 골격 + localStorage mock 까지만 구현
- 백엔드 답변 도착 시 영속 부 통합
- 위험: 영구 대기 가능

#### 분기 Y — cc 가 자체 구현 (권장) ★

T3 의뢰서 §2 스키마 + §4 API 6종을 본 cc 가 직접 구현:

- `backend/migrations/20260526_168_101~103_create_menu_*.sql` (3 sql 파일)
- `backend/src/Handlers/AdminMenu.php` 신규 (API 6종)
- `backend/src/routes.php` 등록 (`/v425/admin/menu-tree` + `/api/admin/menu-tree`)
- 운영 적용은 사용자 승인 후 `cc plink + pscp` (U-166-D)

**근거**:
- U-166-D = GitHub Actions 미사용 + cc 직접 deploy 패턴 확립
- T3 의뢰서가 자세히 작성되어 (289 라인) cc 가 그대로 구현 가능
- 백엔드 팀 답변 4 세션+ 지연 → 사용자 작업 속도 차단
- N-152-A 은행급 보안 baseline 충족 가능 (현 cc 가 자체 구현 시 audit_log + RBAC + rate limit 모두 충족 가능)

### 4.4 변경 범위 (분기 Y 채택 시)

#### Backend (자체 구현)

- 3 migration sql (`menu_tree`, `menu_audit_log`, `menu_defaults`)
- 6 endpoint Handler (`AdminMenu.php`) — 약 +600 라인
- routes.php 12 라인 (6 × 2 alias)
- audit_routes 검증

#### Frontend

- `frontend/src/context/MenuVisibilityContext.jsx` 신규
- `frontend/src/layout/Sidebar.jsx` 패치 — `useMenuVisibility()` hook 으로 필터링 (705 라인 → 약 +20 라인)
- `frontend/src/components/MobileBottomNav.jsx` 동일 패치
- `frontend/src/pages/AdminMenuManager.jsx` 신규 — admin 토글 UI (드래그 정렬 포함)
- `frontend/src/pages/UserMenuPreferences.jsx` 신규 — 사용자별 토글 UI

#### i18n

- `admin.menu.*` namespace (약 30 leaf × 15 locale = 450 leaf) — **동결 해제 트리거**

### 4.5 의존성

- **F1 / PM-Core 와 독립**
- **PM-Core 사이드바 추가 이전에 완료 권장** (재작업 회피 — §2.2 1번)
- **N-152-A baseline 충족** (audit_log, RBAC, hash_chain, rate limit — §7)

### 4.6 진입 게이트

- 사용자 결정: 분기 X (대기) vs 분기 Y (cc 자체 구현)
- 분기 Y 채택 시: 우선순위 정책 (전역 > 개인 vs 개인 > 전역) 사용자 확인 필요
- 동결 해제: i18n 450 leaf 사용자 승인

---

## 5. PH3 sub-track — Phase 3 (실시간/대시보드/성능)

### 5.1 PM-Core 와 인프라 공유 (★ 핵심)

PH3 의 실시간 알림 = N-152-F SSE 채널 (`/v425/pm/events/stream`) **확장**:

- PM-Core 채널: project_id 별 필터, task 이벤트
- PH3 확장: **글로벌 알림 채널** `/v425/notifications/stream` — assignment / mention / approval / system alert
- 동일 PHP SSE 인프라 재사용 (N-152-F §8 — heartbeat, nginx `X-Accel-Buffering: no`, 5분 hard cap)

### 5.2 PH3 변경 범위

#### Backend

- `Notifications.php` Handler 신규 (글로벌 채널) — 약 +200 라인
- `notifications` 테이블 (현 미존재 — 추가 필요)
- migration 1 sql (`20260526_168_201_create_notifications.sql`)

#### Frontend

- `frontend/src/services/notificationStream.js` (EventSource client)
- `frontend/src/components/NotificationDropdown.jsx` (Topbar bell icon)
- `GlobalDataContext.jsx` 패치 — `notifications` slice + SSE 구독

### 5.3 의존성

- **PM-Core 와 SSE 인프라 공유** → PM-Core 먼저 진행 권장
- **F1 / F2/F3 와 독립**
- **N-152-A baseline 충족** (audit log + 권한 검증)

### 5.4 진입 게이트

- PM-Core SSE 인프라 완료 후 진입
- 알림 분류 카테고리 사용자 확인 (assignment / mention / approval / system / billing / security 등)

---

## 6. PM2 sub-track — PM 문서2 4축 (raw 미검증)

### 6.1 PM N-15 패턴 회피 의무

PM_HANDOVER.md 4절의 4축 (Connectors 70%, WmsManager, AIInsights, AdvertisingPerformance 60%) 은 **PM 추정치**. cc 가 코드 라인 수 raw 만 본 결과:

- `AdvertisingPerformance.jsx` = **75 라인** (PM 추정 60% 와 불일치 — stub 수준)
- `Connectors.jsx` = 540 라인 (PM 추정 70%)
- `WmsManager.jsx` = 2445 라인 (대형)
- `AIInsights.jsx` = 476 라인

라인 수 ≠ 완성도. **각 페이지별 raw 분석 sub-task 우선** (PM_HANDOVER.md P-1 "PM 표기 신뢰 금지, raw 재판정 필수").

### 6.2 PM2 sub-track 진입 절차 (PM N-15 강제)

1. **각 페이지 raw 분석** — TODO / 미구현 함수 / mock data 식별
2. **누락 기능 사용자 보고** (절대원칙 §6)
3. **승인 후 페이지별 sub-spec 작성**
4. **개별 진입**

### 6.3 PM2 4축 우선순위 (cc 권장)

| 순위 | 페이지 | 이유 |
|:-:|---|---|
| 1 | `AdvertisingPerformance.jsx` (75L) | stub 수준, PM 추정 60% 와 불일치 — **가장 큰 작업** |
| 2 | `Connectors.jsx` (540L) | PM 추정 70% — 4축 중 사용자 빈도 高 |
| 3 | `WmsManager.jsx` (2445L) | 대형, 부분 완성 추정 |
| 4 | `AIInsights.jsx` (476L) | AI hook 의존, N-152-F2 (AI 예측) 와 통합 가능 |

### 6.4 진입 게이트

- 사용자 우선순위 확정
- 각 페이지 raw 분석 1차 — 사용자 결정 전 cc 가 1 페이지씩 raw 보고 → 승인 → sub-spec → 구현

---

## 7. N-152-A 보안 baseline (5 sub-track 공통)

`N-152-A_BANK_GRADE_SECURITY.md` 152차 확정 원칙 = 9개 절대원칙 §5 와 일치. 본 5 sub-track 모두 다음 baseline 충족 의무:

| 영역 | 적용 |
|---|---|
| 입력 검증 | 모든 API endpoint type/range/sanitize (F2/F3 menu_id, F1 카테고리 id 등) |
| 출력 인코딩 | XSS 자동 escape (React 기본) — dangerouslySetInnerHTML 금지 |
| 무결성 검증 | plans.js _verifyIntegrity 패턴 — F2/F3 의 권한 비교는 `adminRoleAtLeast` 헬퍼 사용 |
| audit_log | F2/F3 (menu_audit_log) + PM-Core (pm_audit_log) + PH3 알림 — 모두 append-only |
| RBAC | viewer / connector / analyst / admin / super_admin 5단계 |
| 토큰/세션 | 기존 v421 RBAC middleware 재사용 |
| Rate limit | F2/F3 의 mutation 30 req/min/IP (T3 의뢰서 §5.4 그대로) |
| 의존성 | npm audit, dependency scanning — 외부 패키지 추가 (`frappe-gantt`) 시 검증 |
| TLS / HSTS | 운영 환경 nginx 설정 — cc 진입 외 |
| hash_chain (tamper-evident) | F2/F3 menu_audit_log, PM-Core pm_audit_log — 본 spec 적용 |

### 7.1 N-152-A 검증 게이트 (각 sub-track 진입 시)

- 코드 변경마다 N-152-A §2 표 cross-check
- 위반 발견 즉시 사용자 보고 (절대원칙 §6)
- 보안 commit 은 `security:` prefix (N-152-A §4)
- W0 (credentials rotation) 트랙 별도 — 사용자 책임

---

## 8. 통합 우선순위 매트릭스 + 의존성 그래프

### 8.1 의존성 그래프

```
[F1 캠페인 카테고리 6종]  ← 독립
       │
       ↓ (i18n 동결 해제 트리거 #1)
[i18n 동결 해제 합의]  ← 사용자 승인 1회
       │
       ↓
[F2/F3 메뉴 가시성 (T3 자체 구현)]  ← 독립 backend + frontend
       │
       ↓ (PM-Core 사이드바 항목 추가 시 가시성 정책 적용)
[PM-Core (Task/Milestone/Gantt) — N-152-F 본 spec]  ← SSE 인프라 구축
       │
       ↓ (SSE 채널 공유)
[PH3 실시간 알림]  ← 글로벌 알림 채널
       │
[PM2 4축]  ← 4 sub-sub-track 우선순위 결정 후 개별 진입 (PM2 1순위 AdvertisingPerformance 권장)
```

### 8.2 우선순위 매트릭스 (cc 권장)

| 순위 | sub-track | 본 168차 진입 가능 | 사유 |
|:-:|---|:-:|---|
| **A1** | F1 (캠페인 카테고리 6종) | ✅ | 가장 작은 단위, 백엔드 의존 없음, 1 commit |
| **A2** | F2/F3 backend (T3 자체 구현) | ✅ (분기 Y 채택 시) | 사이드바 메뉴 변경 전 완료 필수 (PM-Core 재작업 회피) |
| **A3** | F2/F3 frontend (Context + UI) | ⚠️ | A2 후 진입 |
| **A4** | PM-Core backend (단계 1~4 — spec commit + migration + handler skeleton + routes) | ✅ | 위험도 낮음, 5 commit 묶음 |
| **A5** | PM-Core SSE 인프라 (PH3 사전 작업) | ⚠️ | A4 후 |
| **A6** | PM-Core handler 본체 (단계 5) | ⚠️ | 169차 |
| **A7** | PM-Core frontend (단계 6-9) | ⚠️ | 169-170차 |
| **A8** | PH3 notifications | ⚠️ | A5 후 |
| **A9** | PM2 (4축, 1순위 AdvertisingPerformance 부터) | ⚠️ | raw 재분석 후 별도 sub-spec |

### 8.3 본 168차 내 권장 최대 범위

**Option α (보수적, 권장)**: A1 + A4 (5 commit) — F1 적용 + PM-Core backend 골격
- 위험도: 최저
- 변경: 프론트 1 파일 (campaignConstants.js) + i18n 6×15=90 leaf + spec 1 + migration 8 + handler skeleton 12 + routes 50 라인
- 운영 deploy: 없음

**Option β (균형)**: A1 + A2 + A4 (8 commit) — F1 + F2/F3 backend + PM-Core backend 골격
- 위험도: 중 (F2/F3 backend 자체 구현 분기 Y 확정 필요)
- 변경: Option α + backend AdminMenu.php (~600 라인) + 3 migration

**Option γ (공격적)**: A1 + A2 + A3 + A4 (12+ commit) — F1 + F2/F3 fullstack + PM-Core backend 골격
- 위험도: 고 (단일 세션 부담)
- 변경: Option β + frontend MenuVisibilityContext + AdminMenuManager.jsx + UserMenuPreferences.jsx + Sidebar 패치

---

## 9. 본 통합 spec 적용 범위 (12 sub-task)

| sub-task | 산출 | 사용자 승인 | 본 168차 |
|---|---|:-:|:-:|
| 1. **본 통합 spec lint + commit** | 본 파일 | 필요 | ✅ |
| 2. PM-Core 단독 spec commit | `n152f_pm_features_spec.md` | (1과 묶음) | ✅ |
| 3. F1 카테고리 명/icon 확정 | 사용자 확인 (§3.1 표) | 필요 | ⚠️ |
| 4. i18n 동결 해제 합의 | U-164-A 트리거 | **필요** | ⚠️ |
| 5. F1 적용 (campaignConstants.js + AutoMarketing.jsx + 15 locale) | 1 commit | (3+4 후) | ✅ (α) |
| 6. F2/F3 분기 결정 (X 대기 vs Y 자체 구현) | 사용자 결정 | **필요** | ⚠️ |
| 7. F2/F3 backend (분기 Y 채택 시) | 3 migration + AdminMenu.php + routes | 필요 | ✅ (β) |
| 8. F2/F3 frontend (분기 Y 채택 시) | MenuVisibilityContext + Sidebar 패치 + AdminMenuManager + UserMenuPreferences | 필요 | ⚠️ (γ) |
| 9. PM-Core 단계 1~4 (단독 spec §12) | spec commit + migration + handler skeleton + routes | (이전 보고) | ✅ |
| 10. PM-Core 단계 5+ | handler 본체 + frontend + SSE | 필요 | ⚠️ |
| 11. PH3 통합 | Notifications.php + frontend stream | 필요 | ⚠️ (169차+) |
| 12. PM2 4축 raw + sub-spec | 페이지별 raw 보고 + sub-spec | 필요 | ⚠️ (169차+) |

---

## 10. 사용자 결정 필요 항목 (본 통합 spec 승인 전)

1. **본 통합 spec 자체 승인 여부** (절대원칙 §6 — 누락 보고 + 영향도 설명 후 승인 절차)
2. **본 168차 진입 Option**: α (A1+A4) / β (A1+A2+A4) / γ (A1+A2+A3+A4)
3. **F1 카테고리 6종**: §3.1 명/icon/순서 확정
4. **i18n 동결 해제**: 본 트랙 진입 시 U-164-A 임시 해제 합의 (F1 90 leaf + F2/F3 450 leaf + PM-Core 180×15=2700 leaf 등 누적)
5. **F2/F3 분기**: X (백엔드 대기) vs Y (cc 자체 구현)
6. **F2/F3 우선순위 정책**: 전역 > 개인 vs 개인 > 전역
7. **PM2 4축 진입 우선순위 확정**: cc 권장 (AdPerf → Connectors → WMS → AIInsights) 채택 여부

---

## 11. 본 통합 spec 의 한계 (절대원칙 §6)

1. **PM2 4축 raw 미검증**: 라인 수만 확인, 각 페이지 내부 미구현 함수 / TODO / mock 식별 미수행 → §6.2 절차 적용
2. **PH3 대시보드 차트 / 성능 영역 raw 미수행**: `dashboards/` 하위 컴포넌트 추가 raw 필요
3. **PM_PAGE_ANALYSIS.md / PM_ANALYSIS_REPORT.md 미열람**: PM N-15 패턴 회피 — 본 spec 은 추정치 무시, raw 만 인용
4. **W0 credentials rotation** (BACKEND_REQUEST_COVER_SHEET P0): 사용자 책임 트랙, 본 spec 범위 외 (memory `feedback_credentials_handling.md`)
5. **PM Phase 2 (`/api/orders`, `/api/claims`, `/api/settlements`)**: 165차 OrderHub Aggregator (`/v424/orderhub/orders|claims|settlements`) 로 **종결** — PM_HANDOVER.md Phase 2 와 다른 endpoint 명세지만 기능 충족 (사용자 확인 권장)
6. **PM 추가 기능 인지 누락 본질**: cc 가 NEXT_SESSION.md §5 미해결 트랙에 F1/F2/F3/T3/PH3/PM2 를 등재하지 않은 것 — 본 통합 spec 통과 후 memory + NEXT_SESSION.md 등재 필수 (sub-task 11)

---

## 12. 변경 이력

| 버전 | 일자 | 변경 |
|---|---|---|
| v1 (draft) | 2026-05-26 | 본 파일 신규 (168차 작성, cc 인지 누락 정정) |

본 spec 은 사용자 승인 + commit 후 canonical. 승인 전까지 드래프트.
