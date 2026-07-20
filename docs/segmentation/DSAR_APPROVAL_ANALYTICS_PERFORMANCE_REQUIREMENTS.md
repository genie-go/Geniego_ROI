# DSAR — RBAC Analytics & Governance Dashboard: 성능 요구사항 계약 (Part 3-11 §42)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §42는 5개 성능 SLO를 요구한다 — **Dashboard Load ≤ 2초**, **KPI Refresh ≤ 30초**, **Alert Latency ≤ 10초**, **Export 1M Rows ≤ 60초**, **Cache Hit ≥ 98%**. 이는 RP-track 실 구현의 통과 조건이며(ADR §5·현 단계 코드0), 재활용 substrate(Cache/Export/Alert)의 성능 특성을 authz 파생에 이식할 때 검증된다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SLO(§42) | 판정 | 근거·측정 앵커 |
|---|---|---|
| Dashboard Load ≤ 2초 | **ABSENT(측정불가)** | 통합 authz 대시보드 부재(GT② §2). 렌더 선례 `SystemMonitor.jsx:209-212`만·SLO 계측 없음 |
| KPI Refresh ≤ 30초 | **ABSENT** | authz KPI Engine grep 0. 집계 선례 `AccessReview.php:141`·`:169-172`·`UserAdmin.php:528-576`는 카운트 수준·SLO 없음 |
| Alert Latency ≤ 10초 | **PARTIAL(재활용)** | 조건평가 `Alerting.php:213`·`:407`·`:442`·통지 dispatch `Alerting.php:471`·`:806`·`:1007`·pushEvent `:987`. 레이턴시 SLO 계측은 ABSENT |
| Export 1M Rows ≤ 60초 | **PARTIAL(재활용·형식갭)** | Export 엔진 `DataExport.php:24`·`:266`(runDestination)·`:607`(httpSend)·커서페이징 `:646`. ★CSV/Excel/PDF 미지원(NDJSON/JSON/BI만·ADR D-3) — 신규 필요 |
| Cache Hit ≥ 98% | **PARTIAL(패턴)** | TTL 캐시 패턴 `AttributionEngine.php:1754`(ensureCacheTable)·`:1765`(cacheGet)·`:1748`(ckey)·범용 카운터 `WebPush.php:305`·`:307`. hit-ratio 계측·authz 전용 캐시 ABSENT |

## 3. 설계 계약 (항목·기준 — SPEC 근거)

| # | SLO | 검증 기준(설계) |
|---|---|---|
| P-1 | Dashboard Load ≤ 2초 | 스냅샷 우선 로드(§27) + Widget 인덱스(§41 I-4). p95 기준 |
| P-2 | KPI Refresh ≤ 30초 | KPI Engine 증분 재계산 + Cache(§30). formula_version 고정 산출 |
| P-3 | Alert Latency ≤ 10초 | `Alerting.php:213` 평가프레임 재사용·metric 소스만 authz 교체(ADR D-3). 임계~통지 end-to-end |
| P-4 | Export 1M Rows ≤ 60초 | `DataExport.php:646` 커서페이징 재사용 + CSV/Excel/PDF 신규 스트리밍(ADR D-3) |
| P-5 | Cache Hit ≥ 98% | `AttributionEngine.php:1754-1765` TTL 패턴 차용·authz KPI 캐시 테이블 신설. hit/miss 카운터 계측 |

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE**: 마케팅 Export 데이터셋(`Reports.php:66`·`:183`·`:537` report_schedule·`DataExport.php` 마케팅 dataset)·attribution 캐시 테이블은 authz와 분리(ADR D-2·GT② §4). 재사용은 **엔진 substrate**(페이징·httpSend·TTL 패턴)에 한정, 데이터셋 계층 흡수 금지.
- **선행의존**: 전 SLO는 대응 엔진(KPI/Cache/Export/Alert)이 authz용으로 신설된 후 계측 가능(BLOCKED_PREREQUISITE).

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

- **판정**: Performance SLO 5종 = ABSENT(Dashboard/KPI 계측 불가·엔진 부재) / PARTIAL(Alert 평가·Export 페이징·TTL 캐시 substrate 재활용·단 CSV/Excel/PDF·hit-ratio 계측 신규).
- **RP-track 실구현 조건**: P-1~P-5 벤치마크(§43 Performance·10M Metrics/1000 Concurrent Dashboards/100K Widget Refreshes) 통과가 Completion Gate(§44) 필수. Cache Hit ≥ 98% 계측 배선 포함.
- 현 단계 코드 변경 0 · NOT_CERTIFIED. 마케팅 Export/캐시 흡수 금지.
