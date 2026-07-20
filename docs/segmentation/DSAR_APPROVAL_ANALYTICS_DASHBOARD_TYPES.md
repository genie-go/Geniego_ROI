# DSAR — RBAC Analytics & Governance Dashboard: 대시보드 유형 (Executive/Security/Compliance/Operations/Risk)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

SPEC §3은 10개 role-기반 Dashboard 유형(Executive·Security·Compliance·Operations·IAM·Auditor·Application Owner·Business Owner·Risk Manager·Super Administrator)을 규정한다. 본 DSAR은 §4~§7의 상세 지표를 갖는 4개 핵심 유형 + Risk Dashboard(§7의 Failed Authorization·§24 Security Alert 파생)의 계약을 다룬다.

- **Executive(§4)**: Overall Authorization Health·High Risk Users·Critical Roles·Standing Privilege·JIT Adoption·SoD Violations·Compliance Score·Audit Readiness·Open Incidents.
- **Security(§5)**: Active Sessions·High Risk Sessions·Privileged Access·Dynamic Role Usage·Runtime Policy Violations·Break Glass Usage·Service Accounts·Machine Identities.
- **Compliance(§6)**: Certification Status·Review Completion·Open Exceptions·Expired Reviews·Regulatory Coverage·Audit Findings.
- **Operations(§7)**: Approval Throughput·Authorization Latency·Resolution Time·Cache Hit Ratio·Runtime Evaluation·Failed Authorization.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 유형 | 판정 | 근거(GT ①②/ADR 등장분) |
|---|---|---|
| **10 Dashboard 유형(전용)** | **ABSENT** | "통합 role-기반 대시보드 부재"(GT② §2). 전용 유형 grep 0 |
| Executive 근접(active_sessions·plan stats) | PARTIAL | `UserAdmin.php:87`·`:127-135`·`:528-576`·`:550-552`(plan GROUP BY·30d 신규·활성세션)·`:150-188`(expiringSoon expired/within7/within30) |
| Security 근접(감사 KPI·high-risk) | PARTIAL | `Audit.jsx:522-536`(총/오늘/high-risk/admin KPI)·`:441-479`(posture 카드); `SecurityAudit.php:93-110`(recentByType) |
| Security 근접(서비스 계정·api_key) | PARTIAL | `AccessReview.php:87-122`(휴면/만료 api_key = Service Identity 부분·GT① §B) |
| **Compliance Dashboard** | PARTIAL(앵커) | `Compliance.php:53-126`·`:93`(RBAC를 SOC2 control 1행 readiness%) — Certification/Review/Regulatory Coverage 지표는 신설(ADR §D-5); `Audit.jsx:383-388`(posture 소비) |
| Operations 근접(운영 헬스) | PARTIAL | `SystemMetrics.php:60`·`:96-102`(ok_count/avg_latency/error_rate)·`:372-419`(cronHealth) — 인프라지 인가 latency 아님(GT② §2 "Runtime/Policy Analytics ABSENT(authz)/PARTIAL(운영)") |
| **Risk Dashboard(전용)** | **ABSENT** | authz Risk 전용 지표 grep 0. SoD 실집행 선례 `Mapping.php:268-271`는 %-KPI 아님(GT② §2) |
| Dashboard 접근 게이트 | PARTIAL | `SystemMetrics.php:50-58`·`:107-117`(isAdmin) — Runtime Guard 앵커 |
| 프론트 렌더 선례 | PARTIAL | `SystemMonitor.jsx:209-212`; `AccessReview.jsx:65`·`:75`·`:95`; `UserManagement.jsx:523`·`:533` |

**정직 분리**: 근접 화면은 유형별로 파편적이다 — Executive는 카운트, Security는 감사 KPI, Operations는 인프라 헬스, Compliance는 control 1행. role-기반 통합 유형은 없다(ADR §D-8).

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변버전/테넌트격리)

- **유형 계약**: dashboard_type·audience_role(§3 10 role)·widget_set·kpi_binding·refresh_policy. 각 유형은 Registry(`APPROVAL_ANALYTICS_REGISTRY`) 등록 위젯을 참조.
- **Compliance 유형**: `Compliance.php:53-126` posture를 앵커로 확장, Certification/Review/Regulatory Coverage 지표 추가(ADR §D-5).
- **Executive/Security/Operations**: 각각 admin 콘솔 카운트·감사 KPI·SystemMetrics 헬스를 소스로 하되, authz 전용 KPI(Least Privilege/ZSP/SoD%·`APPROVAL_KPI` DSAR)는 신설(전부 ABSENT).
- **접근·격리**: admin 게이트(`SystemMetrics.php:50-58`) + cross-tenant(`index.php:614-619`) 재활용(ADR §D-6). role-기반 유형 노출은 §35 Runtime Guard 대상.
- **불변**: 각 유형 스냅샷 불변(§40)·SecurityAudit 체인 증거(`SecurityAudit.php:14`·§D-4).

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

유형별 위젯은 authz 지표만 바인딩한다. 아래 마케팅 대시보드를 **흡수 금지**(GT② §4·§B-4·ADR §D-2):

- `AdPerformance.php:7`·`:40`(광고 KPI)·`Pnl.php`(손익)·`AdminGrowth.php:434`·`:625`·`:675`·`:687`(growth funnel/channel) — Executive/Operations 유형이 이 마케팅 지표를 흡수하지 않는다.
- `Insights.php:19`·`Mmm.php:24`·`AttributionEngine.php:13` — 마케팅 성과 대시보드, authz Risk/Security 아님.
- 데이터 소스 상이: authz 유형=`acl_permission`/`access_review_item`/`security_audit_log`, 마케팅=`performance_metrics`/`channel_orders`.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: **ABSENT(전용)/PARTIAL(근접)** — 10 유형·Risk Dashboard 전용은 grep 0(GT② §2). Compliance만 posture 앵커로 PARTIAL, 나머지는 파편 근접.
- **재활용(Extend)**: Compliance posture(§D-5)·admin 콘솔·감사 KPI·SystemMetrics 헬스·프론트 렌더 선례를 유형별로 재활용·확장. 대체 아님.
- **선행의존**: BLOCKED_PREREQUISITE — Executive의 JIT Adoption·SoD Violations, Security의 Dynamic Role/Break Glass, Compliance의 Certification은 Part 3-6/3-8/3-9/3-10 엔진 산출 소비(ADR §D-7).
- **NOT_CERTIFIED**: 코드 변경 0. 인용은 GT①②/ADR 등장분만.
