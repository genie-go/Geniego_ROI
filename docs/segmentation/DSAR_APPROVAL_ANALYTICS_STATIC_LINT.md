# DSAR — RBAC Analytics & Governance Dashboard: 정적 린트 (Part 3-11 §36)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §36은 빌드/CI 정적 분석으로 다음 5종을 **탐지(detect)** 하도록 규정한다: Hardcoded KPI · Missing Evidence · Missing Snapshot · Direct SQL Dashboard · Tenant Isolation Bypass. 대시보드가 읽기전용 파생·불변 스냅샷·테넌트 격리(ADR D-1·D-6)를 강제받으므로, 이 원칙 위반을 소스 레벨에서 정적으로 차단한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 린트 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| Hardcoded KPI | **ABSENT(신규·grep 0)** | authz KPI Engine 부재(GT② §2 "grep 0"). 하드코딩 KPI 탐지 린트 전무. KPI 파생 선례=`AccessReview.php:87-122`(classify)·`SecurityAudit.php:118-153`(집계) |
| Missing Evidence | **ABSENT(신규)** | 증거 필수화 린트 부재. 증거 저장 substrate=`AccessReview.php:62-81`·`:218-233`(access_review_item + `SecurityAudit :225`) |
| Missing Snapshot | **ABSENT(신규)** | authz 스냅샷 부재(GT② §2). 무결성 앵커=`SecurityAudit.php:56-68`(verify) |
| Direct SQL Dashboard | **ABSENT(신규)** | 대시보드 직접 SQL 금지 린트 전무. 스코프 술어 우회 방지 대상=`TeamPermissions.php:738-750`(`scopeSqlNamed`) |
| Tenant Isolation Bypass | **ABSENT(신규)** | 정적 격리우회 탐지 grep 0(GT② §2 "data leakage lint 부재"). 런타임 격리만 존재(`index.php:614-619`·ADR D-6) |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

- **L-1 Hardcoded KPI 금지**: authz KPI(Least Privilege/ZSP/SoD%/Cert%/MTTR·SPEC §20)는 반드시 KPI Formula Version(SPEC §40) 경유 산출. 소스 내 상수 KPI 리터럴 탐지.
- **L-2 Missing Evidence**: 모든 KPI/스냅샷 산출은 Evidence(Source Dataset·KPI Formula·Analytics Version·SPEC §28) 첨부 필수. `access_review_item`(`:62-81`)·`SecurityAudit`(`:14`) 증거 패턴 미첨부 시 린트 실패.
- **L-3 Missing Snapshot**: 불변 스냅샷 없이 대시보드 상태 확정 금지(SPEC §40 Immutable Snapshot).
- **L-4 Direct SQL Dashboard**: 대시보드 핸들러의 raw SQL 직접 사용 금지 → authz 집약 계층(ADR D-1) 경유 강제. `scopeSqlNamed`(`:738-750`) 스코프 술어 미적용 쿼리 탐지.
- **L-5 Tenant Isolation Bypass**: X-Tenant-Id 서버도출(`index.php:614-619`) 미경유·클라이언트 tenant 파라미터 신뢰 코드 정적 탐지(§35 런타임 가드와 상보).

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

마케팅 KPI/대시보드(`AdPerformance.php:7`·`:40`·`Pnl.php`·`AdminGrowth.php:434`·`Reports.php:35` VIZ_TYPES)와 PM `Kpi.php:17`은 `performance_metrics`/`channel_orders` 소스로 본 린트의 authz KPI 범위 밖(GT② §4·§B-4·§B-5). 린트 룰셋은 authz 데이터소스 파일만 스캔 대상으로 하며 마케팅 analytics 파일에 오적용하지 않는다.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**ABSENT-전면(5종 정적 린트 모두 grep 0·GT② §2).** Static Lint 전체가 순신규 계층이며 재활용 substrate는 증거 저장(`access_review_item`)·감사 체인(`SecurityAudit`)·스코프 술어(`scopeSqlNamed`)·런타임 격리(`index.php:614-619`)의 **참조 앵커**에 한정. 코드 변경 0·NOT_CERTIFIED·BLOCKED_PREREQUISITE.
