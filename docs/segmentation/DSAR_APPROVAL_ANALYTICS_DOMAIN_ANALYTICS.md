# DSAR — RBAC Analytics & Governance Dashboard: 도메인 Analytics(APPROVAL_ANALYTICS §8-§18)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_ANALYTICS(Domain Analytics)는 SPEC §8~§18이 정의하는 11개 authz 거버넌스 도메인의 지표 집약 계층이다: Role(§8)·Permission(§9)·Assignment(§10)·Scope(§11)·Dynamic Role(§12)·Service Identity(§13)·JIT(§14)·SoD(§15)·Certification(§16)·Runtime(§17)·Policy(§18) Analytics. 각 도메인은 고유 지표군(예 §8 Total/Active/Unused/Critical/Composite/Dynamic/Deprecated Roles; §14 Requests/Approvals/Denials/Auto Revocations)을 Metric(APPROVAL_METRIC)으로 노출하고 Dashboard(§4~§7)·KPI Engine(§20)이 소비한다. 각 도메인 산출은 Part 1~3-10 통제 엔진을 **읽어 집약**하며 재구현하지 않는다(ADR D-7 무중복).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 도메인 Analytics(SPEC) | 판정 | 근거(파일:라인) |
|---|---|---|
| Role/Permission Analytics(§8·§9) | **ABSENT(집약)/PARTIAL(카운트)** | `TeamPermissions.php:454-478`(acl_permission member/permission COUNT·`:469`·`:470`)만. Unused/Critical/Orphan/Reuse/Growth 지표 부재(GT② §2·GT① §E) |
| Assignment Analytics(§10) | **ABSENT/PARTIAL** | `UserAdmin.php:150-188`(expiringSoon expired/within7/within30)·`:528-576`(plan stats)만. Temporary/Delegated/Emergency/JIT 집약 부재(GT① §E·GT② §2) |
| Scope Analytics(§11) | **ABSENT** | Scope Distribution/Expansion/Violation/Cross-Tenant 전용 지표 부재. `TeamPermissions.php:56`·`:738-750`(data_scope·scopeSqlNamed)는 소스일 뿐(GT① §F) |
| Dynamic Role Analytics(§12) | **ABSENT** | Rule Evaluations/Runtime Activations/Drift 지표 부재(GT② §2) |
| Service Identity Analytics(§13) | **ABSENT/PARTIAL(api_key만)** | `AccessReview.php:87-122` classify(EXPIRED>STALE_UNUSED>DORMANT>EXPIRING_SOON>OK)가 **api_key 축만** 커버·사람계정 미커버(GT① §B·GT② §2) |
| JIT Analytics(§14) | **ABSENT/PARTIAL** | api_key 검토(`AccessReview.php:87-122`)가 JIT 부분만. Requests/Approvals/Auto Revocations 전용 부재(GT② §2) |
| SoD Analytics(§15) | **ABSENT** | Conflicts/Overrides/Exceptions %-지표 부재. SoD 실집행 선례 `Mapping.php:268-271`는 있으나 %-KPI 아님(GT② §2) |
| Certification Analytics(§16) | **ABSENT** | Campaign Completion/Reviewer SLA/Evidence 전용 지표 부재(GT② §2) |
| Runtime/Policy Analytics(§17·§18) | **ABSENT(authz)/PARTIAL(운영)** | 인가 decision latency/success·policy violation 지표 부재. `SystemMetrics.php:96-102`=인프라 헬스(GT② §2·GT① §A) |
| Audit Analytics(§19 인접) | **PARTIAL** | `SecurityAudit.php:71-83`·`:93-110`(recent/recentByType)·`:118-153`(acquisition trend)·`AdminMenu.php:696-716`(menu_audit_log)·`AdminGrowth.php:1411-1431`(securityAudit 통합) 실존. Coverage/Missing Evidence 지표 부재(GT② §2) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드(계약)**: domain(§8-18)·metric_set(도메인별 지표군)·source(acl_permission/access_review_item/security_audit_log/api_key/auth_audit_log)·computed_at·tenant_id·evidence_ref. 각 도메인은 읽기전용 파생(§40 Immutable Snapshot).
- **상태**: LIVE ↔ SNAPSHOT(§27). Revalidation(§32)은 Policy/Assignment/Runtime/Analytics Rule 변경 시 재산출.
- **제약(SPEC §35·§40)**: Tenant Isolation·Cross-Tenant Query 차단(§35 Runtime Guard, `SystemMetrics.php:50-58` admin 게이트 + `index.php:614-619` 테넌트 격리 재활용·ADR D-6). 통제 엔진 재구현 금지(§43 Regression·ADR D-7 읽기 소비).

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

- ★도메인 Analytics는 authz 축(`acl_permission`/`security_audit_log`)만. 마케팅 analytics 13+ 엔진(`Insights.php:19`·`Mmm.php:24`·`AttributionEngine.php:13`·`AutoRecommend.php:40`·`Decisioning.php:11`·`CustomerAI.php:26`·`AnomalyDetection.php:22`·`GraphScore.php:32`·`AdPerformance.php:7`·`DemandForecast.php:23`·`Pnl.php`·`AdminGrowth.php:434`)은 `performance_metrics`/`channel_orders`/`attribution_*` 소스로 **흡수·개명 절대 금지**(GT② §4·ADR D-2).
- 제3 도메인 `PM/Kpi.php:17`(프로젝트 task KPI)도 도메인 Analytics 아님(GT② §B-5).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: 11개 도메인 Analytics의 지표 집약 계층 = **대부분 ABSENT(순신규)**. 실존은 카운트 수준 3점(`TeamPermissions.php:454-478` member/permission·`UserAdmin.php:528-576` plan stats·`AccessReview.php:87-122` api_key 분류)과 Audit 조회(`SecurityAudit.php:71-153`·`AdminMenu.php:696-716`)뿐. 재활용(흡수 아님·확장): classify 파생·카운트 원천·감사 체인·`Compliance.php:53-126` control readiness(Certification 앵커·ADR D-5).
- **선행 의존**: JIT(§14)/SoD(§15)/Certification(§16)/Dynamic Role(§12)/Service Identity(§13) Analytics는 각 엔진(Part 3-6~3-10)이 실 구현·인증된 후 그 이벤트를 소비(ADR D-7·BLOCKED_PREREQUISITE).
- **NOT_CERTIFIED**: 코드 변경 0. 실 집약 로직은 선행 인증 후 RP-track 승인세션. **마케팅 analytics 흡수 절대 금지.**
