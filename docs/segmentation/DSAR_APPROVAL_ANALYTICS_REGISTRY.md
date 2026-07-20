# DSAR — RBAC Analytics & Governance Dashboard: 분석 레지스트리 (APPROVAL_ANALYTICS_REGISTRY)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_ANALYTICS_REGISTRY`는 SPEC §1(1. Analytics Registry)·§2(Canonical Entity 최상위 항목)이 규정하는 **RBAC 거버넌스 analytics 자산의 단일 등록소(SSOT)** 다. Dashboard·KPI·Metric·Widget·Dataset 정의를 선언적으로 등록하고 버전을 관리하며, §41(Index)이 요구하는 인덱스 축(Dashboard/KPI/Metric/Widget/Alert/Snapshot/Version)의 기준 카탈로그가 된다.

- **역할**: authz analytics의 "정의 계층" — 어떤 대시보드·지표·위젯이 존재하고, 각 KPI가 어떤 데이터소스·공식·버전을 갖는지를 등록. 실 산출값(런타임)은 별도 엔티티(Snapshot/Cache)가 담고 Registry는 스키마·계약만 보유.
- **관장 엔티티군**: `APPROVAL_GOVERNANCE_DASHBOARD`·`APPROVAL_KPI`·`APPROVAL_METRIC`·`APPROVAL_WIDGET`·`APPROVAL_ANALYTICS_DATASET`(SPEC §2)의 등록 메타데이터.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 요구 | 판정 | 근거(GT ①②/ADR 등장분) |
|---|---|---|
| authz Dashboard/Widget/KPI **정의 레지스트리** | **ABSENT** | "authz용 dashboard/widget/KPI 정의 레지스트리 grep 0"(GT② §2). "dashboard"=메뉴 권한키(`TeamPermissions.php:56`·`:738-750`) |
| Metric 파생 선례(등록형은 아님) | PARTIAL | `AccessReview.php:87-122`(classify EXPIRED>STALE>DORMANT>EXPIRING>OK 파생)·`:141`·`:158`·`:169-172`(상태별 카운트 집계) |
| RBAC 데이터소스(Registry가 참조할 소스 정본) | PRESENT | acl_permission `TeamPermissions.php:10`·`:56`·`scopeSqlNamed :738-750`; `access_review_item` `AccessReview.php:62-81`; `security_audit_log` `SecurityAudit.php:14`; `api_key`; `auth_audit_log` `UserAuth.php:2039` (GT① §F·ADR §2.1) |
| Widget 렌더 선례(정의 레지스트리 아님) | PARTIAL | `SystemMonitor.jsx:209-212`·`:9-21`(카드 매핑)·`Audit.jsx:522-536`(KPI 카드) — 하드코딩 렌더, 등록 메타 없음 |
| Index(§41) 인덱스 축 | ABSENT | 전용 인덱스 정의 grep 0(GT② §2 "Widget 레지스트리 … grep 0") |

**정직 분리**: 단일 `Analytics.php` 파일은 **부재**(GT② §B-6) — 마케팅 analytics조차 분산 엔진으로만 실존하고 등록 레지스트리는 없다. RBAC Registry는 순신규.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변버전/테넌트격리)

- **필드(등록 메타)**: `registry_id`·`entity_type`(dashboard/kpi/metric/widget/dataset)·`entity_key`·`source_dataset`·`kpi_formula`·`analytics_version`·`report_version`(SPEC §28 Evidence 필드 근거)·`tenant_id`.
- **불변 버전**: SPEC §40(KPI Formula Version·Immutable Snapshot) — 등록된 KPI 공식은 버전 고정, 변경은 새 버전 append. 재활용 앵커 = `SecurityAudit.php:14`·`:56-68`(append-only hash_chain, ADR §D-4).
- **테넌트 격리**: SPEC §40 Tenant Isolation. 재활용 앵커 = `index.php:614-619`(X-Tenant-Id 서버도출, ADR §D-6).
- **제약**: Dataset Integrity·Digest Validation(§40). 등록 항목은 §36 Static Lint 대상(Hardcoded KPI·Missing Evidence 금지).

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

Registry는 authz 자산만 등록한다. 아래 마케팅 analytics 정의·데이터셋을 **절대 등록·개명·흡수 금지**(GT② §4·ADR §D-2):

- `Reports.php:27`·`:141`·`:336`(DataExport DATASETS=orders/ad_metrics/attribution/kpi_summary)·`Reports.php:35`(VIZ_TYPES 차트) — 마케팅 데이터셋/차트 레지스트리, authz 아님.
- `Insights.php:19`·`Mmm.php:24`·`AttributionEngine.php:13`·`AdPerformance.php:7`·`:40` — `performance_metrics`/`channel_orders` 소스. Registry 소스는 `acl_permission`/`security_audit_log`뿐.
- `PM/Kpi.php:17`(프로젝트관리 KPI) — 제3 도메인.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: **ABSENT** — authz analytics 정의 레지스트리·Widget 레지스트리·Index 축 전부 grep 0(GT② §2). 순신규.
- **재활용(Extend, 대체 아님)**: RBAC 데이터소스(§F)를 Registry가 참조; 파생/카운트 선례(`AccessReview.php:87-122`)와 렌더 선례(`Audit.jsx:522-536`)는 위젯 계약 참고용. 무결성은 SecurityAudit 체인(ADR §D-4), 격리는 `index.php:614-619`(§D-6).
- **선행의존**: BLOCKED_PREREQUISITE — Part 1~3-10 인증 후 실 구현(ADR §D-7, Consequences 선행 의존). Registry가 등록할 KPI/Metric은 하위 DSAR(`APPROVAL_KPI`)이 전부 ABSENT로 판정하므로 소스 통제 완료가 선결.
- **NOT_CERTIFIED**: 코드 변경 0. 본 문서 인용은 GT①②/ADR 등장분만.
