# DSAR — RBAC Analytics & Governance Dashboard: 캐시 (APPROVAL_ANALYTICS_CACHE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_ANALYTICS_CACHE`(SPEC §2 Canonical Entity)는 RBAC 거버넌스 대시보드의 파생 산출물을 **TTL 기반으로 캐싱**하는 계약이다. SPEC §30(Cache)은 캐시 대상을 **KPI·Trend·Forecast·Dashboard Widget** 4종으로 규정하고 "TTL 정책 적용"을 명시한다. §7 Operations Dashboard는 "Cache Hit Ratio", §17 Runtime Analytics는 "Cache Efficiency"를 지표로, §42 성능은 "Cache Hit ≥ 98%"를, §33 Reconciliation은 Live Data↔Cache 비교를, §38 Warning은 "Dashboard Cache Expired"를 요구한다. 본 캐시는 **authz KPI 전용** 이며 마케팅 캐시와 데이터 소스가 분리된다(§4).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 기능 | 판정 | 근거(파일:라인) |
|---|---|---|
| TTL 캐시 패턴(만료·키·산출시각) | **PARTIAL(패턴 차용)** | `AttributionEngine.php:1754`(ensureCacheTable)·`:1765`(cacheGet)·`:1748`(ckey) — ckey+computed_at+ttl 만료(GT① §G·GT② §3) |
| 범용 카운터/rate 캐시 | **PARTIAL(패턴 차용)** | `WebPush.php:305`(`api_rate_limit`)·`:307`·`:299`(GC) — key_id/window_min/cnt 범용 카운터(GT① §G) |
| 범용 대시보드 캐시 레지스트리 | **ABSENT** | 도메인 무관 dashboard 캐시 레지스트리 grep 0(GT① §G "패턴 차용·테이블 신설"·태스크 지시) |
| authz KPI/Trend/Forecast/Widget 캐시 테이블 | **ABSENT** | authz 전용 캐시 substrate grep 0(GT② §2 Snapshot/Digest/Cache/Drift 행·§3) — 순신규 |
| Cache Hit Ratio / Efficiency 지표 | **ABSENT** | §7/§17 authz 캐시 효율 지표 부재(GT② §2 Runtime/Operations 행) — 순신규 |
| Reconciliation(Live↔Cache) | **ABSENT** | authz Reconciliation substrate grep 0(GT② §2 Snapshot/Cache/Reconciliation 행) — 순신규 |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **캐시 레코드**: cache_key(ckey) · tenant_id(격리 필수·키 구성요소) · cache_type(kpi/trend/forecast/widget §30) · payload · computed_at · ttl_sec · dashboard_ref.
- **TTL 코어**: `AttributionEngine.php:1754`/`:1765`/`:1748`의 ckey+computed_at+ttl **패턴을 차용**하되, attribution 전용 테이블이 아닌 **authz KPI 캐시 테이블을 신설**(ADR D-3 "범용 대시보드 캐시 레지스트리는 ABSENT"·GT① §G).
- **범용 카운터**: Cache Hit Ratio/Efficiency 집계는 `WebPush.php:305`/`:299`(api_rate_limit·GC) window 카운터 패턴 차용 가능(GT① §G).
- **무효화 트리거**: §32 Revalidation(Policy/Assignment/Runtime/Analytics Rule 변경) 시 캐시 무효화. §33 Reconciliation은 Live Data↔Cache↔Snapshot 비교로 드리프트 검출.
- **테넌트 격리**: 캐시 키는 tenant_id 필수 포함 — Cross-Tenant Query 금지(SPEC §35·ADR D-6). 캐시 payload는 요청자 테넌트 스코프 밖 authz 지표 미보관.
- **성능**: §42 Cache Hit ≥ 98%, §38 Warning "Dashboard Cache Expired" 발생 시 라이브 재산출 폴백.

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

- `AttributionEngine.php:1754-1765` 캐시 테이블은 **attribution(마케팅 어트리뷰션) 전용** — 테이블·데이터셋 흡수 금지, **TTL 패턴만 차용**(GT① §G "테이블은 attribution 전용"·ADR D-3·D-2).
- 마케팅 analytics 캐시(Mmm/AttributionEngine/AutoRecommend 등 `performance_metrics`/`attribution_*` 소스·GT② §4)와 authz KPI 캐시(`acl_permission`/`security_audit_log` 소스)는 데이터 소스·목적 완전 분리 — 공용 캐시 레지스트리로 통합 금지.
- `WebPush.php` api_rate_limit는 카운터 패턴만 참조하고 웹푸시 도메인 로직 미흡수(GT① §G).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: PARTIAL-substrate(AttributionEngine TTL 패턴·WebPush 카운터 패턴 차용) / ABSENT-governance(범용 대시보드 캐시 레지스트리·authz KPI/Trend/Forecast/Widget 캐시 테이블·Hit Ratio 지표·Reconciliation 순신규).
- **재활용(패턴 차용, 테이블 신설)**: `AttributionEngine.php:1754`/`:1765`/`:1748`(ckey/ttl 패턴) · `WebPush.php:305`/`:307`/`:299`(범용 카운터·GC). 두 테이블 모두 도메인 전용이므로 **패턴만 차용하고 authz 전용 테이블 신설**(ADR D-3).
- **선행의존**: BLOCKED_PREREQUISITE — 캐시 대상인 §20 KPI·§21 Trend·§22 Forecast·§30 Widget 산출 엔진이 실 구현(Part 1~3-10 인증)된 후 캐싱 가능(ADR D-7). 코드 변경 0·NOT_CERTIFIED.
