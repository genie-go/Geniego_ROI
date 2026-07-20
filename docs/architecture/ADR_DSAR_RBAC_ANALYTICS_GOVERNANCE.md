# ADR — RBAC Analytics & Governance Dashboard Foundation

- **Status**: PROPOSED · NOT_CERTIFIED · BLOCKED_PREREQUISITE (설계 명세 · 코드 변경 0)
- **EPIC**: 06-A-03-02-03-04 Part 3-11
- **Date**: 2026-07-20
- **상위 SPEC**: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md` (canonical 원문 verbatim · Version 1.0)
- **Ground-Truth**: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
- **선행 계보**: Part 1~3-9 · **3-10(Runtime SoD Enforcement)**

---

## 1. Context

GeniegoROI는 인가/RBAC 구성요소를 다수 보유하나(acl_permission `TeamPermissions.php:10`·access_review_item `AccessReview.php:62-81`·security_audit_log `SecurityAudit.php:14`·api_key·auth_audit_log), 이를 **통합 분석·운영하는 Control Tower(Governance Dashboard)** 는 부재하다. 존재하는 authz 화면은 분산·이벤트 기록 수준이다: 운영헬스(`SystemMetrics.php:60`)·접근검토(api_key 축 `AccessReview.php:87-122`)·감사(`SecurityAudit.php:71-153`)·컴플라이언스 posture(RBAC를 SOC2 control 1행 `Compliance.php:53-126`)·admin 콘솔 카운트(`UserAdmin.php:528-576`·`TeamPermissions.php:454-478`).

동시에 저장소는 마케팅 분석 플랫폼이라 analytics/KPI/dashboard/forecast/recommendation/trend 자산이 **대량** 존재하나, 이는 전부 `performance_metrics`/`channel_orders`/`attribution_*` 기반 **마케팅 도메인**(GT② §4)이며 RBAC 거버넌스 analytics와 **데이터 소스·목적이 완전히 분리**된다.

본 ADR은 **RBAC Analytics & Governance Dashboard** — role/permission/assignment/scope/dynamic-role/service-identity/JIT/SoD/certification/runtime/policy/audit 거버넌스를 하나의 통합 대시보드에서 분석·운영하고 authz 전용 KPI(Least Privilege·ZSP·SoD Compliance·MTTR)를 산출하는 Control Tower — 의 거버넌스 기반을 정의한다. Part 1~3-10이 각 통제를 구축한다면, 3-11은 그 산출을 **읽어 집약·가시화·경보·추천**하는 상보 계층이다.

## 2. Ground-Truth 판정 (2 스레드 상호검증)

### 2.1 실존 substrate (GT①)
- **분산 authz 화면(PARTIAL)**: 운영헬스(`SystemMetrics.php:60`·`:96-102`)·접근검토(`AccessReview.php:87-122`·api_key 축만)·감사(`SecurityAudit.php:71-153`·verify `:56-68`)·컴플라이언스 posture(`Compliance.php:53-126`)·admin 콘솔(`UserAdmin.php:528-576`·`TeamPermissions.php:454-478`).
- **도메인중립 재사용 인프라(PRESENT)**: pushEvent 이벤트라우터(`Alerting.php:987`·`:978`·`:1023-1042` notification_channel SSOT)·Alert 평가프레임(`:213`·`:407`·`:442`)·통지 dispatch(Slack/Email/Webhook `:471`·`:806`·`:1007`·SSRF `:786`)·Export 엔진(`DataExport.php:24`·`:266`·`:607`)·예약발송(`Reports.php:66`·`:183`·`:537`)·감사 해시체인(`SecurityAudit.php:14`)·TTL 캐시패턴(`AttributionEngine.php:1754-1765`·`WebPush.php:305`).
- **RBAC 데이터소스**: `TeamPermissions.php:10`(acl_permission·`scopeSqlNamed` `:738-750`)·`EnterpriseAuth.php:11`(SSO/SCIM)·`UserAuth.php:2039`(auth_audit_log SSOT).

### 2.2 거버넌스 계층 (GT②)
통합 Governance Dashboard·10 Dashboard 유형·authz KPI Engine(Least Privilege/ZSP/SoD%/Cert%/MTTR)·Role/Permission/Assignment/Scope/Dynamic/Service/JIT/SoD/Certification/Runtime/Policy Analytics·Trend/Forecast/Recommendation(authz)·Widget 레지스트리·authz Snapshot/Digest/Cache/Drift/Simulation/Revalidation/Reconciliation·Runtime Guard/Static Lint = **grep 0**.

### 2.3 종합
**판정 = ABSENT-governance(Control Tower) / PARTIAL-substrate(분산화면·중립인프라) / 대량-KEEP_SEPARATE(마케팅 analytics).**

## 3. Decision

### D-1. authz 데이터소스 위에 읽기전용 집약 계층을 신설한다 (Extend, 대체 아님)
`acl_permission`·`access_review_item`·`security_audit_log`·`api_key`·`auth_audit_log` 를 소스로 하는 authz KPI/Metric 집약 계층을 신설. 원천 통제(Part 1~3-10)는 무변경, 대시보드는 **읽기전용 파생**(SPEC §40 Immutable Snapshot·KPI Formula Version). 실시간 라이브 + 스냅샷 이중.

### D-2. 마케팅 analytics는 흡수·개명 금지 (KEEP_SEPARATE 절대)
Insights/Mmm/AttributionEngine/AutoRecommend/Decisioning/CustomerAI/AnomalyDetection/GraphScore/AdPerformance/DemandForecast/Pnl(GT② §4)은 `performance_metrics`/`channel_orders` 소스의 마케팅 엔진이다. RBAC Analytics로 **데이터셋·metric 계층 흡수 절대 금지**. 재사용은 **엔진 substrate(평가·통지·export·cache)** 에 한정.

### D-3. 도메인중립 인프라 재사용 (§24 Alert·§25 Subscription·§26 Export·§30 Cache)
- Alert(§24) = `Alerting.php:213` 조건평가 프레임 + `:987` pushEvent 라우터 재사용, metric 소스만 authz로 교체.
- Subscription(§25) = `Reports.php:66` report_schedule + `Alerting.php:1023-1042` 채널 CRUD(Slack/Email/Webhook) 재사용.
- Export(§26) = `DataExport.php:24` 엔진 재사용, 데이터셋만 authz 엔티티로 교체(★CSV/Excel/PDF는 신규 — 현 엔진은 NDJSON/JSON/BI만).
- Cache(§30) = `AttributionEngine.php:1754-1765` TTL 패턴 차용 + 전용 authz KPI 캐시 테이블 신설(범용 대시보드 캐시 레지스트리는 ABSENT).

### D-4. Evidence/Snapshot/Digest는 SecurityAudit 체인 재활용
authz KPI/스냅샷 증거는 `SecurityAudit.php:14`·`:56-68`(tamper-evident) + `access_review_item`(`AccessReview.php:62-81`) 패턴 재활용. Immutable Snapshot·Digest Validation(§40)은 해시체인 확장.

### D-5. Compliance Dashboard는 Compliance::posture 확장
`Compliance.php:53-126`(RBAC를 control 1행 readiness%)를 Compliance Dashboard(§6)의 앵커로 확장 — Certification/Review/Regulatory Coverage 지표 추가.

### D-6. Runtime Guard·테넌트 격리
Dashboard 접근은 admin 게이트(`SystemMetrics.php:50-58`) + cross-tenant 격리(`index.php:614-619` X-Tenant-Id 서버도출) 재활용. Cross-Tenant Query·Data Leakage 차단(§35)은 이 위에 신설.

### D-7. Part 1~3-10과의 관계 (읽기 소비·무중복)
3-11은 각 파트(Role/Permission/JIT(3-9)/SoD(3-10)/Certification(3-8)/Service Identity(3-6))의 산출을 **읽어 집약**한다. 통제 엔진을 재구현하지 않는다(중복 금지). JIT/SoD Analytics(§14·§15)는 해당 엔진이 실 구현된 후 그 이벤트를 소비.

### D-8. 정직 분리
- **실재 과신 회피**: SystemMetrics=인프라 헬스(RBAC 지표 아님)·AccessReview=api_key 축만·Compliance posture=RBAC 1행만·admin 콘솔=카운트 수준. 통합 대시보드·authz KPI 아님.
- **부재 과장 회피**: authz KPI(Least Privilege/ZSP/SoD%/MTTR)·Widget 레지스트리·authz forecast grep 0은 실측 부재(그린필드).
- **오흡수 회피**: 마케팅 analytics 대량 존재를 "RBAC analytics 있음"으로 오판 금지(데이터 소스 상이).

## 4. Consequences

- **긍정**: 인가 거버넌스 가시화·규제준수(SOX/SOC2)·최소권한/ZSP 측정·경보·추천. 운영 Control Tower.
- **비용**: 신규(통합 Dashboard·10 유형·KPI/Trend/Forecast/Recommendation Engine(authz)·Widget·Snapshot/Evidence/Digest/Cache/Drift/Simulation/Reconciliation·Guard/Lint). CSV/Excel/PDF export 신규.
- **선행 의존**: Part 1~3-10 인증 후 실 구현(BLOCKED_PREREQUISITE). JIT/SoD/Certification 엔진 산출이 데이터 소스.
- **무후퇴**: 마케팅 analytics·SystemMetrics·AccessReview·SecurityAudit·중립인프라 유지·병행. Extend-only·읽기전용 소비.

## 5. Compliance / Certification

- **NOT_CERTIFIED**: 코드 변경 0. SPEC은 사용자 제공 canonical 원문 verbatim(Version 1.0).
- 하위 per-entity DSAR은 본 ADR + GT①② 등장 `파일:라인`만 인용(반날조).
- Completion Gate·Performance(Dashboard≤2s)·Analytics Validation·Regression은 실 구현 세션(RP-track) 조건.

---
**요약**: RBAC Analytics Dashboard = ABSENT-governance(통합 Control Tower·authz KPI·Forecast/Recommendation/Trend·Widget·Snapshot/Digest/Cache/Drift/Simulation·Guard/Lint 순신규) / PARTIAL-substrate(운영헬스·접근검토·감사·컴플라이언스 posture·admin 콘솔·중립인프라) / 대량-KEEP_SEPARATE(마케팅 analytics 13+ 엔진·`performance_metrics` 소스≠authz). Extend: authz 데이터소스 위 읽기전용 집약·pushEvent/Alert/Export/Cache 재사용·SecurityAudit 증거·Compliance posture 확장·cross-tenant 격리·Part 1~3-10 읽기 소비(무중복). 코드0·NOT_CERTIFIED·선행의존. **마케팅 metric/dataset 흡수 절대 금지.**
