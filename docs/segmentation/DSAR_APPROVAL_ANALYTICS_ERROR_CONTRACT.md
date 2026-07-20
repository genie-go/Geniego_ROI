# DSAR — RBAC Analytics & Governance Dashboard: 에러 계약 (Part 3-11 §37)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §37은 Governance Dashboard의 6종 에러 코드를 규정한다: `DASHBOARD_NOT_FOUND` · `KPI_CALCULATION_FAILED` · `DATASET_UNAVAILABLE` · `FORECAST_FAILED` · `ANALYTICS_TIMEOUT` · `DASHBOARD_ACCESS_DENIED`. 각 코드는 조회/산출/예측 실패를 명시적·안전(fail-closed)하게 반환하며, 부분 결과·조용한 실패(가짜녹색)를 금지한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 에러 코드 | 판정 | 근거(파일:라인) |
|---|---|---|
| `DASHBOARD_NOT_FOUND` | **ABSENT(신규)** | authz dashboard 레지스트리 부재(GT② §2). 조회 대상 정의 자체가 신규 |
| `KPI_CALCULATION_FAILED` | **ABSENT(신규)** | authz KPI Engine grep 0(GT② §2). 산출 실패 코드 전무. 파생 선례=`AccessReview.php:87-122`·`SecurityAudit.php:118-153` |
| `DATASET_UNAVAILABLE` | **ABSENT(신규)** | authz 데이터셋 계층 신규(§35 Invalid Dataset과 상보). 소스 정본=`TeamPermissions.php:10`·`AccessReview.php:62-81` |
| `FORECAST_FAILED` | **ABSENT(신규)** | authz Forecast Engine grep 0(GT② §2). acquisition trend(`SecurityAudit.php:118-153`)만 인증축 근접 |
| `ANALYTICS_TIMEOUT` | **ABSENT(신규)** | 인가 analytics 타임아웃 규정 부재. 운영헬스 latency 선례=`SystemMetrics.php:96-102`(인프라·RBAC 아님) |
| `DASHBOARD_ACCESS_DENIED` | **PARTIAL(재활용)** | admin 게이트 거부 경로 `SystemMetrics.php:50-58`·`:107-117` 재활용(§35 Runtime Guard G-1과 연결) |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

- **E-1 fail-closed 원칙**: 6코드 모두 부분 결과/기본값 반환 금지. KPI 산출 예외 시 `KPI_CALCULATION_FAILED`를 던지고 위젯은 오류 상태 표시(가짜녹색 금지).
- **E-2 접근 거부 통일**: 미인가 접근은 `DASHBOARD_ACCESS_DENIED`로 통일. `SystemMetrics.php:50-58` 게이트가 거부 판정 원천이며 에러 코드 매핑만 신설.
- **E-3 데이터셋/스냅샷 분리**: 화이트리스트 밖 dataset=`DATASET_UNAVAILABLE`, 조회 대상 대시보드 미존재=`DASHBOARD_NOT_FOUND`로 구분(§35 Invalid Dataset은 차단·§37은 코드 반환).
- **E-4 예측 실패 명시**: Forecast Engine(SPEC §22 Role/Permission/Assignment Growth) 신뢰도 미달·데이터 부족은 `FORECAST_FAILED`(§38 Forecast Confidence Low 경고와 임계 구분).
- **E-5 타임아웃**: Dashboard Load ≤2초·KPI Refresh ≤30초(SPEC §42) 초과 시 `ANALYTICS_TIMEOUT` 반환.

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

마케팅 forecast/KPI 엔진(`Mmm.php:24` forecast/frontier·`DemandForecast.php:23`·`AutoRecommend.php:40`)의 실패·예외 경로는 `performance_metrics` 소스이며 본 에러 계약의 authz 코드 네임스페이스와 분리(GT② §4·§B-2·§B-3·ADR D-2). authz 에러 코드를 마케팅 엔진에 재사용·개명하지 않는다.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**PARTIAL(`DASHBOARD_ACCESS_DENIED`=admin 게이트 재활용) / ABSENT-신규(나머지 5코드 grep 0).** 에러 계약 대부분이 순신규이며 재활용은 접근거부 게이트(`SystemMetrics.php:50-58`)에 한정. 코드 변경 0·NOT_CERTIFIED·BLOCKED_PREREQUISITE.
