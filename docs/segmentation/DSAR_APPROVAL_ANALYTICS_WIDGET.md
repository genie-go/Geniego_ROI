# DSAR — RBAC Analytics & Governance Dashboard: 대시보드 위젯(APPROVAL_WIDGET)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_WIDGET(SPEC §2 Canonical Entity·§41 Index)은 Governance Dashboard(§3~§7)의 **최소 시각화 단위**로, 하나 이상의 Metric(APPROVAL_METRIC)/KPI(§20)를 특정 Dashboard 유형(Executive/Security/Compliance/Operations/§4~§7)에 카드·차트·표로 렌더한다. Widget은 SPEC §41 Index 구축 대상(Dashboard·KPI·Metric·Widget·Alert·Snapshot·Version)에 등재되며, Cache(§30 Dashboard Widget)로 TTL 캐싱되고 Runtime Guard(§35)·Static Lint(§36 Widget Injection·§43 Security)의 통제를 받는다. Widget은 authz 소스 파생만 표현하며 마케팅 위젯과 분리된다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Widget 축(SPEC) | 판정 | 근거(파일:라인) |
|---|---|---|
| **authz Widget 레지스트리(정의·바인딩·버전)** | **ABSENT** | authz용 widget/KPI 정의 레지스트리 grep 0(GT② §2 표 1행·GT① §3·ADR §2.2) |
| 카드/KPI 렌더 선례(감사) | **PARTIAL** | `Audit.jsx:522-536`(총/오늘/high-risk/admin KPI 카드)·`:441-479`(컴플라이언스 posture 카드)·`:371` 감사로그 = Security/Compliance Dashboard 위젯 렌더 선례(GT① §C) |
| 카드 매핑 렌더 패턴(운영) | **PARTIAL** | `SystemMonitor.jsx:209-212`·`:9-21`(로드·카드 매핑) = Dashboard 위젯 선례(GT① §A) |
| 접근검토 화면 소비 선례 | **PARTIAL** | `AccessReview.jsx:65`·`:75`·`:95`(keys/history/decision 소비) = Dashboard 화면 선례(GT① §B) |
| admin 콘솔 위젯 재사용 | **PARTIAL** | `UserManagement.jsx:523`·`:533`(security-audit 재사용) = 콘솔 위젯 선례(GT① §E) |
| Widget Cache(§30) | **ABSENT(전용)** | authz 대시보드 위젯 전용 캐시 레지스트리 부재. `AttributionEngine.php:1754-1765` TTL 패턴 차용만(ADR D-3) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드(계약)**: widget_key·dashboard_type(§3 10유형)·bound_metric/kpi(APPROVAL_METRIC/§20)·viz_type(카드/trend/표)·refresh_ttl(§30·§42 KPI Refresh ≤30초)·tenant_id·version(§41 Index). 렌더는 봉인 Snapshot 또는 Live 파생.
- **상태**: ACTIVE ↔ CACHED(§30 TTL) ↔ STALE(§38 Dashboard Cache Expired 경고). Drift(§31 Dashboard Drift)·Revalidation(§32)이 무효화.
- **제약(SPEC §35·§36·§43)**: Runtime Guard = Unauthorized Dashboard Access·Cross-Tenant Query 차단(admin 게이트 `SystemMetrics.php:50-58`·`:107-117` + `index.php:614-619` 테넌트 격리 재활용·ADR D-6). Static Lint = Missing Evidence·Missing Snapshot·Widget Injection 탐지(§36). Widget은 Direct SQL 금지·Evidence 참조 필수.

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

- ★마케팅 대시보드 위젯/차트는 APPROVAL_WIDGET이 **아니다**. `Reports.php:35`(VIZ_TYPES 차트)·`Pnl.php`(손익 대시보드)·`AdPerformance.php:40`(광고 KPI 위젯)·`AdminGrowth.php:434`·`:625`·`:675`·`:687`(growth funnel/channel 집계) = 마케팅 payload(GT② §B-4·B-5·ADR D-2). 흡수·개명 금지.
- 오탐: `Reports.php`의 `/dashboard`=프론트 리다이렉트·"dashboard"=메뉴 권한 리소스명(`TeamPermissions.php:56`)이지 위젯 프레임 아님(GT② §B-6).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: authz Widget 레지스트리·Widget Cache 전용 = **ABSENT(순신규)**. 재활용(흡수 아님·확장): 프론트 렌더 선례(`Audit.jsx:522-536`·`SystemMonitor.jsx:209-212`·`AccessReview.jsx:65`·`UserManagement.jsx:523`)·TTL 캐시 패턴(`AttributionEngine.php:1754-1765`).
- **선행 의존**: Widget은 APPROVAL_METRIC/KPI(§20)에 바인딩되므로 Metric 계층·Part 1~3-10 산출 인증 선행(ADR D-7·BLOCKED_PREREQUISITE).
- **NOT_CERTIFIED**: 코드 변경 0. 실 렌더/레지스트리는 선행 인증 후 RP-track 승인세션.
