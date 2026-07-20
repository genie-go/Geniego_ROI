# DSAR — RBAC Analytics & Governance Dashboard: 인가 지표(APPROVAL_METRIC)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_METRIC(SPEC §2 Canonical Entity)은 인가/RBAC 거버넌스의 **단일 측정 단위(measurable unit)** 로, 각 Analytics 도메인이 노출하는 개별 지표(Runtime Analytics §17: Authorization Requests/sec·Decision Latency·Cache Efficiency·Runtime Errors·Policy Decisions; Policy Analytics §18: Active Policies·Policy Violations·Rule Changes·Policy Drift·Evaluation Success Rate)의 계약이다. Metric은 KPI(APPROVAL_KPI §20)의 원재료이며, Widget(§41 Index)·Dashboard(§3~§7)가 소비하고 Snapshot(§27)·Evidence(§28)에 봉인된다. Metric 값은 **읽기전용 파생**(SPEC §40 Immutable Snapshot·KPI Formula Version)이어야 하며 authz 데이터소스에서만 산출된다(마케팅 metric 흡수 금지).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Metric 축(SPEC) | 판정 | 근거(파일:라인) |
|---|---|---|
| **authz Metric 레지스트리(정의·버전·공식)** | **ABSENT** | authz용 metric/widget/KPI 정의 레지스트리 grep 0(GT② §2 표 1행) |
| Runtime 지표(§17: Decision Latency/Requests/Cache/Errors) | **ABSENT(authz)/PARTIAL(인프라)** | 인가 decision latency/success 지표 부재. `SystemMetrics.php:96-102`=인프라 헬스(ok_count/total/avg_latency/error_rate)로 RBAC 지표 아님(GT② §2·GT① §A) |
| Policy 지표(§18: Active Policies/Violations/Drift) | **ABSENT** | authz policy 지표 전용 산출 없음(GT② §2) |
| Access-Review 파생 metric(선례) | **PARTIAL** | `AccessReview.php:87-122` classify(EXPIRED>STALE_UNUSED>DORMANT>EXPIRING_SOON>OK)·`:141`·`:158`·`:169-172` 상태별 카운트 = Metric 파생·집계 선례(단 api_key 축 한정) |
| 인증축 trend metric(근접) | **PARTIAL** | `SecurityAudit.php:118-153` acquisitionSummary(signup/login 일자별) = 인증축 trend 선례(§21 근접·authz 아님) |
| 카운트 수준 지표(원천) | **PARTIAL** | `TeamPermissions.php:454-478`(member/permission COUNT)·`UserAdmin.php:528-576`(plan stats) = 지표 원천이나 거버넌스 metric 집약 아님(GT② §2) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드(계약)**: metric_key(canonical)·domain(role/permission/…/policy §8-18)·formula_version(§40 KPI Formula Version)·source_dataset(§28 Evidence)·value·unit·computed_at·tenant_id·snapshot_ref. 값은 **불변 스냅샷**(§40 Immutable Snapshot)으로 봉인.
- **상태**: LIVE(실시간 파생) ↔ SNAPSHOT(봉인). Reconciliation(§33)은 Live↔Snapshot↔Cache↔Analytics Result 비교.
- **제약(SPEC §40)**: Tenant Isolation(테넌트별 격리 산출)·Dataset Integrity·Digest Validation. Metric 산출은 `index.php:614-619` X-Tenant-Id 서버도출 격리 위에서만(ADR D-6). 하드코딩 KPI·Direct SQL Dashboard 금지(§36 Static Lint).
- **소스 한정**: `acl_permission`(`TeamPermissions.php:10`)·`access_review_item`(`AccessReview.php:62-81`)·`security_audit_log`(`SecurityAudit.php:14`)·`api_key`·`auth_audit_log`(`UserAuth.php:2039`)만(ADR D-1).

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

- ★마케팅 metric/KPI(`performance_metrics` 소스)는 APPROVAL_METRIC이 **아니다**. `AdPerformance.php:7`·`:40`(광고 KPI)·`Insights.php:19`·`Mmm.php:24`·`AttributionEngine.php:13`·`AutoRecommend.php:40`·`CustomerAI.php:26`·`DemandForecast.php:23` = 전부 마케팅 지표(GT② §4·B-1~B-4·ADR D-2). 데이터 소스 `performance_metrics`/`channel_orders`/`attribution_*` ≠ authz `acl_permission`/`security_audit_log`.
- 제3 도메인 `PM/Kpi.php:17`(프로젝트 task KPI)도 흡수 금지(GT② §B-5).
- 오탐: "dashboard"=메뉴 권한 리소스명(`TeamPermissions.php:56`)이지 metric 프레임 아님(GT② §B-6).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: authz Metric 레지스트리·Runtime/Policy 전용 지표 = **ABSENT(순신규)**. 재활용(흡수 아님·확장): `AccessReview.php:87-122` classify 파생 패턴·`SecurityAudit.php:118-153` trend 집계 선례·카운트 원천(`TeamPermissions.php:454-478`·`UserAdmin.php:528-576`).
- **선행 의존**: Runtime/Policy Analytics(§17·§18) 실 지표는 Part 3-9(JIT)/3-10(SoD Runtime)·Policy 엔진 산출이 소스(ADR D-7·BLOCKED_PREREQUISITE).
- **NOT_CERTIFIED**: 코드 변경 0. 실 산출 로직은 선행 인증 후 RP-track 승인세션.
