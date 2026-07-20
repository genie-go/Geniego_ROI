# DSAR — RBAC Analytics & Governance Dashboard: 경고 계약 (Part 3-11 §38)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §38은 오류(차단)가 아닌 **비차단 경고(warning)** 5종을 규정한다: KPI Drift · Dataset Delay · Forecast Confidence Low · Dashboard Cache Expired · Analytics Degraded. 결과는 반환하되 신뢰도 저하를 표면화하여 사용자가 데이터 품질을 판단하게 한다(에러 계약 §37과 임계 구분). 데이터 헌법 Trust First 원칙과 정합.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 경고 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| KPI Drift | **ABSENT(신규)** | authz KPI/Drift substrate grep 0(GT② §2 Drift ABSENT). SPEC §31 KPI Drift 탐지의 경고 표면 |
| Dataset Delay | **ABSENT(신규)** | authz 데이터셋 지연 판정 부재. cron stale 판정 선례=`SystemMetrics.php:372-419`(cronHealth·인프라축) |
| Forecast Confidence Low | **ABSENT(신규)** | authz Forecast Engine grep 0(GT② §2). §37 `FORECAST_FAILED`(차단)와 임계 구분 |
| Dashboard Cache Expired | **PARTIAL(패턴 차용)** | TTL 만료 패턴 `AttributionEngine.php:1754`·`:1765`(ckey+computed_at+ttl)·`WebPush.php:305`(api_rate_limit) — 전용 authz 캐시는 신규(ADR D-3) |
| Analytics Degraded | **ABSENT(신규)** | 인가 analytics 품질저하 경고 부재. 운영헬스 error_rate 선례=`SystemMetrics.php:96-102`(인프라·RBAC 아님) |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

- **W-1 비차단 원칙**: 5경고 모두 결과 반환 + 경고 플래그 부착. 위젯은 결과와 함께 신뢰도 배지 노출(Trust First·XAI 근거 표시).
- **W-2 KPI Drift**: 스냅샷 대비 KPI 편차 임계 초과 시 경고(SPEC §31 KPI Drift·§33 Reconciliation Live vs Snapshot 비교 결과).
- **W-3 Dataset Delay**: 소스 데이터 최신성 지연 시 경고. `SystemMetrics.php:372-419` cron stale 판정 패턴을 authz 데이터셋 최신성에 차용(재활용·대체 아님).
- **W-4 Forecast Confidence Low**: Forecast Engine(SPEC §22) 신뢰구간 미달 시 경고. 완전 실패는 §37 `FORECAST_FAILED`로 승격.
- **W-5 Cache Expired / Analytics Degraded**: TTL 초과(`AttributionEngine.php:1754-1765` 패턴 차용)는 stale 표시 후 재계산 트리거. 부분 소스 불가용은 Degraded 경고.
- **W-6 경고 전파**: 경고는 Alert Engine(SPEC §24 Drift Alert·§35 §24 pushEvent `Alerting.php:987`)로 선택 통지 가능(구독 정책 존중).

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

마케팅 이상탐지·드리프트(`AnomalyDetection.php:22` SPC ROAS/CPA/CTR/CVR·`Mmm.php:24` forecast)는 `performance_metrics` 소스이며 본 경고 계약의 authz KPI Drift/Confidence와 분리(GT② §4·§B-2·ADR D-2). authz 경고를 마케팅 이상탐지 엔진에 흡수·개명하지 않는다.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**PARTIAL(Cache Expired=TTL 패턴 차용·Dataset Delay=cron stale 패턴 참조) / ABSENT-신규(KPI Drift·Forecast Confidence Low·Analytics Degraded grep 0).** 경고 대부분 순신규이며 재활용은 TTL·stale 판정 패턴 차용에 한정(전용 authz 캐시/드리프트 테이블 신설). 코드 변경 0·NOT_CERTIFIED·BLOCKED_PREREQUISITE.
