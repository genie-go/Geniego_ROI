# DSAR — RBAC Analytics & Governance Dashboard: authz KPI 엔진 (APPROVAL_KPI)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_KPI`는 SPEC §20(KPI Engine)이 규정하는 **인가 거버넌스 전용 지표 산출 엔진**이다. 기본 KPI 8종:

1. Least Privilege Score
2. Zero Standing Privilege Ratio(ZSP)
3. SoD Compliance %
4. Certification Completion %
5. Runtime Authorization Success %
6. Average Decision Time
7. Mean Time to Revoke(MTTR)
8. Privileged Identity Ratio

각 KPI는 SPEC §40(KPI Formula Version)에 따라 공식이 버전 고정되고, §28(Evidence)의 KPI Formula·Analytics Version 증거를 수반한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| KPI | 판정 | 근거(GT ①②/ADR 등장분) |
|---|---|---|
| Least Privilege Score | **ABSENT** | "authz 전용 KPI Engine … grep 0"(GT② §2). 정의·산출 로직 없음 |
| Zero Standing Privilege Ratio | **ABSENT** | 동일(GT② §2·ADR §2.2 "grep 0") |
| SoD Compliance % | **ABSENT** | SoD 실집행 선례 `Mapping.php:268-271` 있으나 "%-KPI 아님"(GT② §2) |
| Certification Completion % | **ABSENT** | Part 3-8 certification 엔진 산출 소비 필요, 지표 부재 |
| Runtime Authorization Success % | **ABSENT** | "인가 decision latency/success 지표 부재"(GT② §2 Runtime/Policy) |
| Average Decision Time | **ABSENT** | 동일. `SystemMetrics.php:96-102` avg_latency는 인프라 헬스지 인가 decision 아님 |
| Mean Time to Revoke | **ABSENT** | grep 0(GT② §1 검색식 명시). 회수 이력 소스만 `AccessReview.php:177-242`·`:218-233` |
| Privileged Identity Ratio | **ABSENT** | admin/plan 카운트 소스만 `UserAdmin.php:528-576`·`TeamPermissions.php:454-478` |

**카운트/파생 선례(KPI 아님·PARTIAL 소스)**:
- `AccessReview.php:87-122`(classify 파생)·`:141`·`:158`·`:169-172`(상태별 카운트) — MTTR/ZSP 원천 데이터 후보.
- `TeamPermissions.php:454-478`·`:469`·`:470`(acl_permission member/permission COUNT) — Least Privilege/Privileged Ratio 소스.
- `SecurityAudit.php:118-153`(acquisitionSummary 일자별 trend) — 인증축 근접이나 authz KPI 아님(GT② §2).

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변버전/테넌트격리)

- **KPI 정의**: kpi_key·formula·formula_version·source_dataset·unit·target_threshold·tenant_id.
- **공식 버전 고정**: SPEC §40 KPI Formula Version — 산출 공식 변경은 새 버전 append, 과거 스냅샷 재현 가능. 앵커 = `SecurityAudit.php:14`·`:56-68`(append-only, ADR §D-4).
- **데이터 소스(ADR §D-1)**: `acl_permission`(`TeamPermissions.php:10`·`:738-750`)·`access_review_item`(`AccessReview.php:62-81`)·`security_audit_log`(`SecurityAudit.php:14`)·`api_key`·`auth_audit_log`(`UserAuth.php:2039`). 마케팅 `performance_metrics` **불가**.
- **테넌트 격리**: 산출은 tenant 스코프(`SecurityAudit.php:71-83` demo/subscriber/all 선례·`index.php:614-619`).
- **캐시**: KPI 결과는 §30 TTL 캐시 — `AttributionEngine.php:1754-1765`·`WebPush.php:305` 패턴 차용, 전용 authz KPI 캐시 테이블 신설(ADR §D-3, 범용 캐시 레지스트리 ABSENT).
- **증거**: Dashboard Evidence(§28)에 KPI Formula·Analytics Version 기록.
- **Static Lint(§36)**: Hardcoded KPI·Missing Evidence 금지.

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

`APPROVAL_KPI`는 authz 지표만 산출한다. 아래 마케팅/제3도메인 KPI를 **흡수·개명 금지**(GT② §4·§B-4·§B-5·ADR §D-2):

- `Mmm.php:24`(믹스모델 forecast/frontier)·`AutoRecommend.php:40`(예산배분 bandit)·`CustomerAI.php:26`(RFM/LTV/이탈)·`DemandForecast.php:23`(SKU 수요)·`AnomalyDetection.php:22`(ROAS/CPA/CTR/CVR SPC) — 마케팅 예측/지표, authz KPI 아님.
- `AdPerformance.php:7`·`:40`(광고 KPI)·`Pnl.php`(손익)·`PM/Kpi.php:17`(프로젝트 KPI task total/done/overdue) — 소스·목적 상이.
- `Reports.php:116`·`:35`(generateKpiSummary·VIZ_TYPES) — payload는 마케팅 KPI(GT② §B-5·§B-6).
- 데이터 소스 상이: authz KPI=`acl_permission`/`security_audit_log`, 마케팅 KPI=`performance_metrics`/`channel_orders`/`attribution_*`.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: **전부 ABSENT** — 8종 authz KPI(Least Privilege/ZSP/SoD%/Cert%/Runtime Success%/Avg Decision/MTTR/Privileged Ratio) 정의·산출 로직 grep 0(GT② §1·§2·ADR §2.2). 순신규.
- **재활용(Extend)**: 원천 데이터(acl_permission COUNT·AccessReview classify/회수 이력·SecurityAudit trend)는 실존 소스로 재활용; 산출 계층·공식 버전·캐시는 신설. SoD %-KPI는 `Mapping.php:268-271` 실집행 선례를 지표화(신규).
- **선행의존**: BLOCKED_PREREQUISITE — SoD%(Part 3-10)·Certification%(Part 3-8)·JIT/Runtime Success(Part 3-9)는 해당 엔진 인증·이벤트 소비가 선결(ADR §D-7·Consequences). 통제 완료 전 산출 불가.
- **NOT_CERTIFIED**: 코드 변경 0. 인용은 GT①②/ADR 등장분만.
