# DSAR — RBAC Analytics & Governance Dashboard: 인덱스 전략 계약 (Part 3-11 §41)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §41은 대시보드 조회 성능(§42 Dashboard Load ≤ 2초)을 뒷받침할 7개 인덱스 축을 요구한다 — **Dashboard·KPI·Metric·Widget·Alert·Snapshot·Version**. 이는 authz 집약 계층의 읽기전용 파생 조회(ADR D-1)를 지탱하는 전용 인덱스이며, 마케팅 analytics 인덱스와 분리된다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 인덱스 축(§41) | 판정 | 근거 |
|---|---|---|
| Dashboard | **ABSENT** | authz dashboard/widget/KPI 레지스트리 grep 0(GT② §2). "dashboard"=메뉴 권한키(`TeamPermissions.php:56`·`:738-750`)로 analytics 인덱스 아님 |
| KPI | **ABSENT** | authz KPI Engine grep 0(GT② §2·Least Privilege/ZSP/SoD%/MTTR). 인덱싱 대상 자체 부재 |
| Metric | **PARTIAL(소스)** | 원천만 인덱스 실존 — SecurityAudit 조회(`SecurityAudit.php:71-83`·`:93-110` 테넌트/타입 스코프)·access_review 상태 집계(`AccessReview.php:141`·`:169-172`). 파생 metric 인덱스 ABSENT |
| Widget | **ABSENT** | Widget 레지스트리 grep 0(ADR §2.2). 렌더 선례만(`SystemMonitor.jsx:9-21`·`:209-212`)·인덱스 무관 |
| Alert | **PARTIAL(재활용)** | 통지 채널 SSOT `Alerting.php:978`(ensureNotifyTable)·`:1023-1042`(notification_channel CRUD)·평가 `:213`. authz alert 전용 인덱스 ABSENT |
| Snapshot | **ABSENT / PARTIAL(패턴)** | authz snapshot 테이블 ABSENT(GT② §2). 추가전용 이력 인덱스 패턴만 — `AccessReview.php:62-81`·menu_audit_log 페이지네이션 `AdminMenu.php:696-716` |
| Version | **ABSENT** | KPI Formula Version·analytics_version 인덱스 부재(§40 C-2와 연동·코드0) |

## 3. 설계 계약 (항목·기준 — SPEC 근거)

| # | 인덱스 | 권장 키(설계) |
|---|---|---|
| I-1 | Dashboard | (tenant_id, dashboard_type) — 10 Dashboard 유형(Executive/Security/…/Super Admin) 조회 |
| I-2 | KPI | (tenant_id, kpi_key, formula_version) — §20 8종 KPI 최신버전 조회 |
| I-3 | Metric | (tenant_id, metric_key, computed_at) — 파생 metric 시계열. 소스 조회 패턴 `SecurityAudit.php:93-110` 확장 |
| I-4 | Widget | (dashboard_id, widget_order) — 위젯 렌더 순서 |
| I-5 | Alert | (tenant_id, severity, created_at) — `Alerting.php:1023-1042` min_severity 라우팅 정렬 재활용 |
| I-6 | Snapshot | (tenant_id, snapshot_ts) — 추가전용·`AccessReview.php:62-81` 이력 인덱스 패턴 확장 |
| I-7 | Version | (kpi_key, formula_version) — Evidence(§28) analytics_version 조인 |

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE**: 마케팅 analytics 인덱스(`AttributionEngine.php:1754-1765` ckey/computed_at 캐시·`Reports.php` 마케팅 데이터셋)는 authz 인덱스와 별개(ADR D-2·GT② §4). 차용 대상은 TTL 캐시 패턴(`AttributionEngine.php:1748`·`:1765`)뿐이며 테이블은 신설.
- **선행의존**: 7개 인덱스는 대응 테이블(§40 C-1~C-5)이 신설된 후에만 정의 가능(BLOCKED_PREREQUISITE).

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

- **판정**: Index 7축 = ABSENT(authz dashboard/KPI/widget/snapshot/version 전용 인덱스 전무) / PARTIAL(SecurityAudit·access_review·Alerting 소스 인덱스 재활용 가능).
- **RP-track 실구현 조건**: I-1~I-7 인덱스 정의 + §42 Dashboard Load ≤ 2초 벤치마크로 커버리지 검증. 선행 테이블 DDL(§40) 완료 후.
- 현 단계 코드 변경 0 · NOT_CERTIFIED. 마케팅 인덱스 흡수 금지.
