# DSAR — RBAC Analytics & Governance Dashboard: 분석 증거 (APPROVAL_ANALYTICS_EVIDENCE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_ANALYTICS_EVIDENCE`(SPEC §2 Canonical Entity·§28 Evidence)는 KPI/지표 산출의 **재현 가능한 근거**를 저장하는 엔티티다. SPEC §28 "저장" 항목은 아래 4요소를 명시한다.

| 필드 | SPEC §28 | 의미 |
|---|---|---|
| Source Dataset | 저장 | KPI가 집계된 원천 데이터셋(authz 소스) 식별·범위 |
| KPI Formula | 저장 | §20 KPI 산출 공식(Least Privilege/ZSP/SoD%/MTTR 등) |
| Analytics Version | 저장 | 집계 엔진/규칙 버전 |
| Report Version | 저장 | 리포트 스키마/출력 버전 |

SPEC §36 Static Lint는 `Missing Evidence`를 탐지 대상으로 명시(근거 없는 KPI 금지).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 요소 | 판정 | 근거(GT 인용) |
|---|---|---|
| authz 전용 Evidence 엔티티 | **ABSENT** | authz KPI 근거 저장 substrate grep 0 (GT② §2 Snapshot/Digest 행) |
| 추가전용 증거 이력 | **PARTIAL(재활용)** | `AccessReview.php:62-81`·`:218-233` `access_review_item` 이력+`SecurityAudit` 기록(`:225`) (GT① §B·ADR D-4) |
| tamper-evident 근거 봉인 | **PARTIAL(재활용)** | `SecurityAudit.php:14-33` append-only 해시체인 (GT① §C) |
| Source Dataset(authz 원천) | **PRESENT(소스)** | `TeamPermissions.php:10`(acl_permission)·`:738-750`(scopeSqlNamed)·`UserAuth.php:2039`(auth_audit_log SSOT)·`EnterpriseAuth.php:11`(SSO/SCIM) (GT① §F) |
| KPI Formula 정의·산출 | **ABSENT** | authz KPI(Least Privilege/ZSP/SoD%/MTTR) 정의·산출 로직 grep 0 (GT② §2·SoD 실집행 `Mapping.php:268-271`은 %-KPI 아님) |
| Report Version(리포트 스키마) | **PARTIAL(재활용)** | `Reports.php:66`·`:183`·`:537`(report_schedule 예약발송·payload는 마케팅 KPI) (GT① §G·ADR D-3) |

★**함정 회피**: Source Dataset은 반드시 authz 소스(`acl_permission`/`access_review_item`/`security_audit_log`/`api_key`/`auth_audit_log`)여야 한다. `Reports.php:27`·`:141`·`:336`(DataExport DATASETS=orders/ad_metrics/attribution/kpi_summary·GT② §B-5)는 마케팅 데이터셋으로 authz Evidence의 Source Dataset이 **아니다**.

## 3. 설계 계약 (필드·상태·제약)

- **근거 필수(Evidence-or-block)**: SPEC §36 Static Lint `Missing Evidence` — 모든 KPI 값은 Source Dataset+Formula+Version 근거 없이는 대시보드 노출 금지.
- **불변·봉인**: Evidence는 `access_review_item`(`AccessReview.php:62-81`) 추가전용 패턴 확장, 확정 시 `SecurityAudit.php:14-33` 해시체인에 봉인(변조검증 `:56-68`).
- **KPI Formula Version 고정**: SPEC §40 `KPI Formula Version` — Evidence는 산출 당시 공식·Analytics Version을 함께 고정, 공식 변경 시 과거 Evidence 불변(재현성).
- **테넌트 격리**: SPEC §40 Tenant Isolation. `SecurityAudit.php:71-83`·`:93-110` 테넌트 스코프 조회 패턴 재활용, cross-tenant 격리 `index.php:614-619`(ADR D-6) 위 신설.
- **Snapshot/Digest 연계**: Evidence는 Snapshot(§27)의 산출근거이며 Digest(§29)의 입력 4요소 중 하나(SPEC §29).

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

마케팅 analytics의 Source Dataset·KPI Formula(GT② §4·§B)는 authz Evidence와 완전 분리된다. `Insights.php:19`·`Mmm.php:24`·`AttributionEngine.php:13`·`AutoRecommend.php:40`·`CustomerAI.php:26`·`AdPerformance.php:7`·`:40` 등은 `performance_metrics`/`channel_orders`/`attribution_*` 소스의 마케팅 공식이다. `Reports.php:35`(VIZ_TYPES)·`Reports.php:27`~`:336`(마케팅 DATASETS)의 dataset/formula 계층을 APPROVAL_ANALYTICS_EVIDENCE로 **흡수·개명 절대 금지**(ADR D-2). 재사용은 `Reports.php` 예약발송 **엔진 substrate**에 한정(§25 Subscription).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: authz KPI Formula 정의·Evidence 엔티티 = **ABSENT(순신규)**. 재활용 = `access_review_item` 증거이력(`AccessReview.php:62-81`·`:218-233`)·`SecurityAudit` 봉인(`SecurityAudit.php:14-33`)·RBAC 데이터소스(`TeamPermissions.php:10`·`UserAuth.php:2039`).
- **선행 의존**: KPI Formula 산출은 Part 1~3-10 산출 소비(BLOCKED_PREREQUISITE·ADR D-7). CSV/Excel/PDF 리포트 출력은 신규(현 엔진 NDJSON/JSON/BI만·ADR D-3).
- **코드 변경 0 · NOT_CERTIFIED**. Extend-only·읽기전용·마케팅 dataset/formula 흡수 금지.
