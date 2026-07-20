# DSAR — RBAC Analytics & Governance Dashboard: 런타임 가드 (Part 3-11 §35)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §35는 Governance Dashboard 런타임에서 다음 5종을 **차단(block)** 하도록 규정한다: Unauthorized Dashboard Access · Cross-Tenant Query · Invalid Dataset · Missing Snapshot · Data Leakage. 대시보드는 authz 데이터소스 위 읽기전용 파생(ADR D-1)이므로, 가드는 요청 진입점에서 **접근 주체·테넌트 스코프·데이터셋 유효성·증거(스냅샷) 존재·응답 누출**을 순차 검증한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 가드 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| Unauthorized Dashboard Access | **PARTIAL(재활용)** | admin 세션 게이트 `SystemMetrics.php:50-58`·`:107-117`(민감 인프라 admin만) — dashboard 접근 게이트 선례 |
| Cross-Tenant Query | **PARTIAL(재활용)** | X-Tenant-Id 서버도출 격리 `index.php:614-619`(ADR D-6 인용·GT① 무등장) |
| Invalid Dataset | **ABSENT(신규)** | authz 데이터셋 유효성 검증 로직 grep 0. 소스 정본만 존재(`TeamPermissions.php:10` acl_permission·`AccessReview.php:62-81`) |
| Missing Snapshot | **ABSENT(신규)** | authz 스냅샷 substrate 부재(GT② §2). 증거 무결성 재활용 앵커=`SecurityAudit.php:14`·`:56-68` |
| Data Leakage | **ABSENT(신규)** | 응답 누출 차단 계층 전무. 스코프 파생 SQL 선례 `TeamPermissions.php:738-750`(`scopeSqlNamed`) |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

- **G-1 접근 게이트**: 대시보드/KPI/analytics 조회 진입 시 admin 세션 확인. `SystemMetrics.php:50-58` 게이트 패턴 재활용(대체 아님) → 미인가는 §37 `DASHBOARD_ACCESS_DENIED`.
- **G-2 테넌트 강제**: 모든 쿼리에 `index.php:614-619` 서버도출 X-Tenant-Id 주입(클라이언트 파라미터 신뢰 금지). 교차테넌트 조회 시도 즉시 차단(§35 Cross-Tenant Query).
- **G-3 데이터셋 화이트리스트**: authz 엔티티(`acl_permission`/`access_review_item`/`security_audit_log`/`api_key`/`auth_audit_log`·GT① §F)만 조회 허용. 목록 밖 dataset=Invalid Dataset 차단.
- **G-4 스냅샷 존재 검증**: 스냅샷 기반 위젯은 증거 부재 시 라이브 폴백 또는 차단(SPEC §40 Immutable Snapshot·ADR D-4 `SecurityAudit` 체인 재활용).
- **G-5 누출 차단(신규)**: 응답 직전 tenant_id 필드 재검증·타 테넌트 row 필터. `scopeSqlNamed`(`:738-750`) 스코프 술어를 authz 소스에 적용하는 신규 계층.

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

마케팅 analytics 엔진(`Insights.php:19`·`Mmm.php:24`·`AttributionEngine.php:13`·`AdPerformance.php:7`)의 채널 스코프 격리(ABAC)는 `performance_metrics`/`channel_orders` 소스이며 본 가드의 authz 데이터소스와 **완전 분리**(GT② §4·ADR D-2). 런타임 가드는 이들의 스코프 로직을 흡수·개명하지 않는다.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**PARTIAL-substrate(접근 게이트 `SystemMetrics.php:50-58`·cross-tenant `index.php:614-619` 재활용) / ABSENT-신규(Invalid Dataset·Missing Snapshot·Data Leakage 차단 grep 0).** Data Leakage 차단이 본 가드의 핵심 순신규 계층. 코드 변경 0·NOT_CERTIFIED·BLOCKED_PREREQUISITE(Part 1~3-10 인증 후 실 구현).
