# DSAR — RBAC Analytics & Governance Dashboard: API 표면 (Part 3-11 §39)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §39는 최소 8개 엔드포인트를 규정한다: Dashboard 조회 · KPI 조회 · Analytics 조회 · Forecast 조회 · Recommendation 조회 · Alert 조회 · Export 실행 · Simulation 실행. 모두 authz 데이터소스 위 읽기전용 파생(ADR D-1)이며, §35 Runtime Guard·§37 에러 계약·§38 경고 계약을 관통한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| API | 판정 | 근거(파일:라인) |
|---|---|---|
| Dashboard 조회 | **ABSENT(신규)/PARTIAL(라우트 선례)** | 통합 authz dashboard 라우트 부재. 근접 선례=`routes.php:1049-1050`·`:3465-3466`(`GET /v424/system/metrics`+/api)·`AdminGrowth.php:1411-1431`(securityAudit 통합 반환) |
| KPI 조회 | **ABSENT(신규)** | authz KPI Engine grep 0. 집계 반환 선례=`AccessReview.php:141`·`:158`·`:169-172`(상태별 카운트)·`SystemMetrics.php:96-102` |
| Analytics 조회 | **PARTIAL(분산)** | 감사(`SecurityAudit.php:71-83`·`:93-110` recent/recentByType)·접근검토(`AccessReview.php:245` history)·teamAudit(`TeamPermissions.php:715-731`) 분산 조회만 |
| Forecast 조회 | **ABSENT(신규)** | authz forecast 라우트 grep 0(GT② §2). acquisition trend(`SecurityAudit.php:118-153`)만 인증축 근접 |
| Recommendation 조회 | **ABSENT(신규)** | authz 추천(§23 Remove Unused Roles 등) 라우트 전무. SoD 실집행 선례=`Mapping.php:268-271`(GT② §2·%-추천 아님) |
| Alert 조회 | **PARTIAL(재활용)** | 평가·통지 프레임 `Alerting.php:213`·`:407`·`:471`·pushEvent `:987`·채널 CRUD `:1023-1042`(metric 소스만 authz 교체·ADR D-3) |
| Export 실행 | **PARTIAL(재활용)** | 엔진 `DataExport.php:24`·`:266`·`:607`(HTTP/BI·SSRF·frequency) — ★CSV/Excel/PDF 신규(ADR D-3·현 엔진 NDJSON/JSON/BI만) |
| Simulation 실행 | **ABSENT(신규)** | authz 시뮬레이션(§34 Policy Change/Role Reduction/JIT) substrate grep 0(GT② §2) |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

- **A-1 버전·접두 규약**: 신규 라우트는 최신 버전 접두(`/v424+`) + `/api` alias 병기(`routes.php:1049-1050`·`:3465-3466` 패턴). Runtime Guard(§35) admin 게이트 뒤 배치.
- **A-2 읽기전용 조회**: Dashboard/KPI/Analytics/Forecast/Recommendation/Alert 6종은 읽기전용 파생(ADR D-1). 원천 통제(Part 1~3-10) 무변경.
- **A-3 실행형 2종**: Export 실행=`DataExport.php` 엔진 재사용 + CSV/Excel/PDF 포맷 신설. Simulation 실행=순신규(§34 영향분석: Risk 감소·Approval 증가·Compliance Score 변화).
- **A-4 Alert 조회**: `Alerting.php:213` 조건평가 + `:987` pushEvent 라우터 재활용, metric 소스만 authz(acl_permission/security_audit_log)로 교체(ADR D-3).
- **A-5 통합 반환 패턴**: `AdminGrowth.php:1411-1431`(recentByType+acquisition+integrity 통합) 반환 패턴을 authz Dashboard 조회 API 선례로 참조.
- **A-6 에러/경고 관통**: 모든 API는 §37 6에러 코드·§38 5경고를 반환 계약으로 준수(fail-closed·Trust First 배지).

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

마케팅 analytics API·데이터셋(`Reports.php:27`·`:141`·`:336` DATASETS orders/ad_metrics/attribution·`AdPerformance.php:40`·`AutoRecommend.php:40`·`Mmm.php:24`)은 `performance_metrics`/`channel_orders` 소스이며 본 API 표면의 authz 엔티티와 분리(GT② §4·§B-5·ADR D-2). Export 엔진(`DataExport.php:24`)의 **엔진 계층만 재사용**하고 데이터셋 계층(`Reports.php` DATASETS)은 흡수·개명 금지.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**PARTIAL(Alert/Export=중립 인프라 재활용·Analytics=분산조회·라우트 선례 `routes.php`·`AdminGrowth.php:1411-1431`) / ABSENT-신규(Dashboard 통합/KPI/Forecast/Recommendation/Simulation grep 0).** 8엔드포인트 중 Alert·Export만 substrate 재활용, 나머지 6종은 순신규(CSV/Excel/PDF export 포함). 코드 변경 0·NOT_CERTIFIED·BLOCKED_PREREQUISITE(Part 1~3-10 인증 후 실 구현).
