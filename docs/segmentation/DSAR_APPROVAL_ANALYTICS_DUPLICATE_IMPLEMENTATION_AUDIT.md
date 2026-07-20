# DSAR — RBAC Analytics & Governance Dashboard: 거버넌스 부재 + 중복/근접물 감사 (Ground-Truth ②)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`. Ground-Truth ①: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`.
> (A) 거버넌스 계층 ABSENT/PARTIAL 실측 + (B) ★KEEP_SEPARATE 마케팅 analytics(오흡수 최대 위험).

---

## 1. 핵심 판정 — **통합 RBAC 거버넌스 Dashboard·authz KPI 골격 부재, 마케팅 analytics는 대량 실존(별개 도메인)**

`Least Privilege|Zero Standing|SoD Compliance|Certification Completion|Mean Time to Revoke|authz.*forecast|role.*forecast|permission.*dashboard` 전용 구조 **전무**. RBAC Analytics 골격은 그린필드. 단 도메인중립 인프라(GT① §G)·분산 authz 화면(GT① §A~E)은 재활용 가능. ★"analytics/kpi/dashboard/forecast/recommendation/trend" grep 대량 히트는 **거의 전부 마케팅**(§B).

## 2. 거버넌스 계층 실측표

| SPEC 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| 통합 Governance Dashboard / Analytics Registry | **ABSENT** | authz용 dashboard/widget/KPI 정의 레지스트리 grep 0. "dashboard"=메뉴 권한키(`TeamPermissions.php:56`·`:738-750`) |
| 10 Dashboard 유형(Executive/Security/…/Super Admin) | **ABSENT(전용)/PARTIAL(근접)** | 통합 role-기반 대시보드 부재. 근접=Audit.jsx(감사 KPI·`:522-536`)·Compliance posture(`Compliance.php:53-126`)·SystemMonitor(운영) |
| authz 전용 KPI Engine(Least Privilege/ZSP/SoD%/Cert%/MTTR·§20) | **ABSENT(grep 0)** | 코드 내 정의·산출 로직 없음. SoD 실집행 선례(`Mapping.php:268-271`)는 있으나 %-KPI 아님 |
| Role/Permission/Assignment/Scope Analytics(§8-11) | **ABSENT(집약)/PARTIAL(카운트)** | acl_permission member/permission COUNT(`TeamPermissions.php:454-478`)·plan stats(`UserAdmin.php:528-576`)만. 거버넌스 지표 집약 부재 |
| Dynamic Role/Service Identity/JIT/SoD/Certification Analytics(§12-16) | **ABSENT** | 각 축 전용 지표 부재. api_key 검토(`AccessReview.php:87-122`)가 Service Identity/JIT 부분만 |
| Runtime/Policy Analytics(§17-18) | **ABSENT(authz)/PARTIAL(운영)** | 인가 decision latency/success 지표 부재. SystemMetrics(`:96-102`)는 인프라 헬스 |
| Audit Analytics(§19) | **PARTIAL** | SecurityAudit recent/verify/acquisition(`:71-153`)·menu_audit_log(`AdminMenu.php:696-716`) 실존. Coverage/Missing Evidence 지표 부재 |
| Trend/Forecast/Recommendation Engine(authz·§21-23) | **ABSENT(grep 0)** | authz축 추세/예측/추천 전무. acquisition trend(`SecurityAudit.php:118-153`)만 인증축 근접 |
| Snapshot/Digest/Cache/Drift/Simulation/Revalidation/Reconciliation(authz·§27-34) | **ABSENT** | authz 권한상태 스냅샷·다이제스트·전용 캐시·드리프트 substrate grep 0 |
| Runtime Guard/Static Lint(dashboard·§35-36) | **ABSENT(전용)/PARTIAL** | dashboard 접근 admin 게이트(`SystemMetrics.php:50-58`)·cross-tenant(`index.php:614-619` — GT① 무등장, ADR 참조)만. data leakage lint 부재 |

## 3. 재활용 substrate 요약 (순수 그린필드 아님 — 흡수 아닌 재활용)

1. **도메인중립 이벤트 라우터** — `Alerting.php:987`(`pushEvent`)·`:978`·`:1023-1042`(notification_channel SSOT). Alert(§24)·Subscription(§25) 핵심.
2. **Alert 평가 프레임** — `Alerting.php:213`·`:407`·`:442`(AND/OR 조건트리·op). 메트릭 소스만 authz로 교체.
3. **Export 엔진** — `DataExport.php:24`·`:266`·`:607`(HTTP/BI·SSRF·frequency). 데이터셋만 authz로 교체(§26).
4. **예약 발송** — `Reports.php:66`·`:183`·`:537`(report_schedule cron). Subscription(§25).
5. **감사 해시체인** — `SecurityAudit.php:14`·`:56-68`. Snapshot/Evidence/Digest 무결성.
6. **TTL 캐시 패턴** — `AttributionEngine.php:1754-1765`·`WebPush.php:305`. Cache(§30) 패턴 차용.
7. **RBAC 데이터소스** — `TeamPermissions.php:10`(acl_permission)·`AccessReview.php`(access_review_item)·`security_audit_log`·`api_key`·`auth_audit_log`. 모든 authz 지표의 소스.
8. **컴플라이언스 프레임** — `Compliance.php:53-126`(control readiness%). Compliance Dashboard 확장 앵커.

## 4. ★KEEP_SEPARATE — 마케팅 analytics (RBAC 거버넌스 아님·오흡수 최대 위험·개명 금지)

★이 저장소는 마케팅 분석 플랫폼이라 analytics/KPI/dashboard/forecast/recommendation/trend가 대량 존재하나 **거의 전부 마케팅·커머스 도메인**이다. `performance_metrics`/`channel_orders`/`attribution_*`/`crm_*` 소스이며 RBAC(`acl_permission`/`security_audit_log`)와 **데이터 소스·목적 완전 분리**. Part 3-11 실 엔진은 이들을 **절대 흡수·개명 금지**.

### B-1. 마케팅 성과·믹스·어트리뷰션 엔진
- `Insights.php:19`(광고 인구통계 breakdown)·`Mmm.php:24`(믹스모델·adstock·forecast/frontier)·`AttributionEngine.php:13`(멀티터치 6모델·Shapley/Markov)·`Attribution.php`·`AttributionMetrics.php`(last-touch). 전부 마케팅.

### B-2. 자동화 추천·의사결정·이상탐지
- `AutoRecommend.php:40`(예산배분·베이즈·UCB bandit)·`Decisioning.php:11`·`:37`(광고 인사이트 ingest)·`AnomalyDetection.php:22`(광고 SPC 이상감지 ROAS/CPA/CTR/CVR). SoD/Analytics recommendation과 무관.

### B-3. 예측·고객·수요
- `CustomerAI.php:26`(RFM/이탈/LTV/구매확률)·`DemandForecast.php:23`(SKU 수요 Holt-Winters)·`GraphScore.php:32`(influencer 그래프 스코어). authz forecast/recommendation 아님.

### B-4. 마케팅 KPI/대시보드/손익
- `AdPerformance.php:7`·`:40`(광고 KPI·ABAC channel scope로 격리되나 지표는 마케팅)·`Pnl.php`(손익 대시보드)·`AdminGrowth.php:434`·`:625`·`:675`·`:687`(growth 마케팅 funnel/channel 집계).

### B-5. 제3 도메인 (마케팅도 authz도 아님)
- `PM/Kpi.php:17`(프로젝트관리 KPI task total/done/overdue)·`Reports.php:27`·`:141`·`:336`(DataExport DATASETS=orders/ad_metrics/attribution/kpi_summary)·`Reports.php:35`(VIZ_TYPES 차트). Dashboard/KPI 프레임 문자열이나 마케팅 payload.

### B-6. 오탐 토큰 주의
- "dashboard"=메뉴 권한 리소스명(`TeamPermissions.php:56`)·`Reports.php`의 `/dashboard`=프론트 리다이렉트. analytics 프레임워크 아님.
- 단일 `Analytics.php` 파일 **부재**(ABSENT) — 마케팅 analytics는 위 엔진들로 분산.

## 5. 종합

**RBAC Analytics Dashboard 거버넌스 = ABSENT 골격 / PARTIAL 분산화면 / 대량 마케팅 KEEP_SEPARATE.** 통합 Control Tower·10 Dashboard 유형·authz KPI(Least Privilege/ZSP/SoD%/Cert%/MTTR)·Forecast/Recommendation/Trend(authz)·Widget 레지스트리·authz Snapshot/Digest/Cache/Drift/Simulation/Reconciliation·Guard/Lint 전부 순신규. 재활용(흡수 아님·확장): pushEvent 이벤트라우터·Alert 평가프레임·Export 엔진·Reports 예약·SecurityAudit 체인·TTL 캐시패턴·Compliance posture·RBAC 데이터소스. **★KEEP_SEPARATE = 마케팅 analytics 13+ 엔진 전부(Insights/Mmm/AttributionEngine/AutoRecommend/Decisioning/CustomerAI/AnomalyDetection/GraphScore/AdPerformance/DemandForecast/Pnl/Attribution·PM Kpi·Reports 마케팅 데이터셋). 데이터 소스=`performance_metrics`/`channel_orders`/`attribution_*` ≠ authz `acl_permission`/`security_audit_log`.** analytics metric/dataset 계층 절대 흡수 금지.
