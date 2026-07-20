# DSAR — RBAC Analytics & Governance Dashboard: 분석 데이터셋(APPROVAL_ANALYTICS_DATASET)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_ANALYTICS_DATASET(SPEC §2 Canonical Entity)은 Metric/KPI/Widget이 집약하는 **정규화된 소스 데이터셋 계약**으로, SPEC §40 Database Constraint의 **Dataset Integrity·Immutable Snapshot·Digest Validation**을 강제받는다. Evidence(§28)는 Source Dataset·KPI Formula·Analytics Version·Report Version을 봉인하며, Drift(§31 Dataset Drift)·Warning Contract(§38 Dataset Delay)·Error Contract(§37 DATASET_UNAVAILABLE)가 데이터셋 신선도/가용성을 통제한다. authz 데이터셋은 **acl_permission/access_review_item/security_audit_log/api_key/auth_audit_log** 를 정규화한 것이며 마케팅 데이터셋과 물리·의미적으로 분리된다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Dataset 축(SPEC) | 판정 | 근거(파일:라인) |
|---|---|---|
| **authz Analytics Dataset 레지스트리·Dataset Integrity 계층** | **ABSENT** | authz용 데이터셋 정의/무결성 레지스트리 grep 0(GT② §2·GT① §3) |
| RBAC 소스 데이터 정본(집계 대상) | **PRESENT(소스)** | `TeamPermissions.php:10`(acl_permission 매트릭스)·`:738-750`(scopeSqlNamed data_scope)·`EnterpriseAuth.php:11`(SSO/SCIM)·`UserAuth.php:2039`(auth_audit_log SSOT) = 모든 authz 지표의 소스(GT① §F·ADR §2.1) |
| 접근검토 이력 데이터셋(부분) | **PARTIAL** | `AccessReview.php:62-81`·`:218-233`(access_review_item 추가전용 이력) = api_key 축 데이터셋(GT① §B) |
| 감사 데이터셋(무결성 substrate) | **PRESENT** | `SecurityAudit.php:14`(hash_chain append-only)·`:56-68`(verify broken_at) = Dataset/Evidence 무결성 substrate(ADR D-4·§19 Immutable Record Validation) |
| Export 엔진(데이터셋 계층 분리) | **PARTIAL(엔진)/KEEP_SEPARATE(데이터셋)** | `DataExport.php:24`·`:266`·`:607`(runDestination/pushDataset/httpSend·SSRF) = 엔진 재사용 substrate. ★단 CSV/Excel/PDF 없음(NDJSON/JSON/BI만·ADR D-3), 데이터셋 계층은 authz 신규(GT① §G) |
| Dataset Drift/Cache(§31·§30) | **ABSENT(전용)** | authz 데이터셋 드리프트·전용 캐시 grep 0. TTL 패턴 `AttributionEngine.php:1754-1765`·`WebPush.php:305` 차용만(GT② §2·ADR D-3) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드(계약)**: dataset_key·source_tables(acl_permission/access_review_item/security_audit_log/api_key/auth_audit_log)·analytics_version(§28)·digest·computed_at·tenant_id·integrity_hash. Evidence(§28)에 Source Dataset+KPI Formula+Analytics/Report Version 봉인.
- **상태**: FRESH ↔ DELAYED(§38 Dataset Delay 경고) ↔ UNAVAILABLE(§37 DATASET_UNAVAILABLE 오류) ↔ DRIFTED(§31). Reconciliation(§33)은 Live↔Snapshot↔Cache↔Analytics Result 대조.
- **제약(SPEC §40)**: Dataset Integrity·Immutable Snapshot·Digest Validation·Tenant Isolation. 데이터셋 산출은 `index.php:614-619` X-Tenant-Id 서버도출 격리 위에서만(ADR D-6). Digest/Snapshot 무결성은 `SecurityAudit.php:14`·`:56-68` 해시체인 확장(ADR D-4).

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

- ★**DataExport DATASETS = 마케팅 데이터셋이지 authz dataset이 아니다**. `Reports.php:27`·`:141`·`:336`(DATASETS=orders/ad_metrics/attribution/kpi_summary) = 마케팅 payload(GT② §B-5·ADR D-2). 절대 흡수·개명 금지.
- 마케팅 소스 `performance_metrics`/`channel_orders`/`attribution_*`/`crm_*`(`Insights.php:19`·`Mmm.php:24`·`AttributionEngine.php:13`·`AttributionMetrics.php`·`Decisioning.php:11`·`AnomalyDetection.php:22`·`GraphScore.php:32`) = RBAC 데이터셋과 데이터 소스·목적 완전 분리(GT② §4).
- 단일 `Analytics.php` 파일은 부재(ABSENT) — 마케팅 analytics는 위 엔진으로 분산(GT② §B-6).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: authz Analytics Dataset 레지스트리·Dataset Integrity 계층·Dataset Drift = **ABSENT(순신규)**. 재활용(흡수 아님·확장): RBAC 소스 정본(`TeamPermissions.php:10`·`AccessReview.php:62-81`·`SecurityAudit.php:14`·`UserAuth.php:2039`)·Export 엔진 substrate(`DataExport.php:24`·`:266`, CSV/Excel/PDF 신규)·해시체인 무결성(`SecurityAudit.php:56-68`).
- **선행 의존**: JIT/SoD/Certification 축 데이터셋은 Part 3-8~3-10 엔진 산출이 소스(ADR D-7·BLOCKED_PREREQUISITE).
- **NOT_CERTIFIED**: 코드 변경 0. 실 데이터셋 정규화/무결성은 선행 인증 후 RP-track 승인세션. **마케팅 데이터셋 흡수 절대 금지.**
