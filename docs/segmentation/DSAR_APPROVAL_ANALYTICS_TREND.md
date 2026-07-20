# DSAR — RBAC Analytics & Governance Dashboard: 추세 엔진 (APPROVAL_ANALYTICS_TREND)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

SPEC §21 Trend Engine은 authz/RBAC 거버넌스 지표를 **시간축으로 집계**한다. 분석 주기는 다섯 granularity: **Daily · Weekly · Monthly · Quarterly · Annual**. 대상 metric은 §8~§19 authz analytics 지표(Total/Active/Unused Roles·Permission Growth·Assignment 추이·SoD Conflicts·Certification Completion·Audit Events 등)이며, §20 KPI(Least Privilege Score·ZSP Ratio·SoD Compliance%·MTTR)의 시계열 궤적을 산출한다. 산출물은 §27 Snapshot·§30 Cache(Trend TTL)·§31 Drift(KPI Drift 비교 기준선)의 입력이 된다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(파일:라인) |
|---|---|---|
| authz축 Trend Engine(Daily/…/Annual) | **ABSENT(grep 0)** | authz축 추세 전무. GT② §2 "Trend/Forecast/Recommendation Engine(authz·§21-23) ABSENT" · GT② §1 |
| 시계열 집계 근접 선례(인증축) | **PARTIAL** | `SecurityAudit.php:118-153` `acquisitionSummary`(signup/login·일자별 trend 집계) — GT① §C · GT② §2 "acquisition trend만 인증축 근접" |
| 추세 데이터 원천(authz metric) | **PARTIAL(카운트)** | `TeamPermissions.php:454-478`(member/permission COUNT)·`UserAdmin.php:528-576`(plan stats)·`SecurityAudit.php:71-83`(테넌트 스코프 조회) — 스냅샷 시계열 아님 |
| Trend 캐시 패턴 | **PARTIAL(차용)** | `AttributionEngine.php:1754`·`:1765`(ckey+computed_at+ttl 만료 패턴, 테이블은 attribution 전용) — GT① §G |

★핵심: **authz 추세축은 그린필드**다. `SecurityAudit.php:118-153`은 signup/login 획득(acquisition)의 일자별 집계로 **인증축 근접**일 뿐 role/permission/assignment/SoD 추세가 아니다. 시계열 스냅샷 축적 substrate(권한상태 일별 저장)는 GT② §2에서 grep 0로 ABSENT.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **granularity**: `daily|weekly|monthly|quarterly|annual`(SPEC §21). 각 주기별 bucket 시작 timestamp·metric_key·value·delta(전주기 대비).
- **metric_key**: §8~§20 authz 지표 식별자만(마케팅 metric 금지). 소스=`acl_permission`(`TeamPermissions.php:10`)·`access_review_item`(`AccessReview.php:62-81`)·`security_audit_log`(`SecurityAudit.php:14-33`)·`api_key`·`auth_audit_log`(`UserAuth.php:2039`).
- **시계열 축적**: 일별 authz 상태 스냅샷을 SPEC §27 Snapshot으로 저장 후 Trend가 읽어 집계(라이브+스냅샷 이중 — ADR D-1). 원천 통제(Part 1~3-10) 무변경 읽기전용 파생.
- **테넌트 격리 절대**: 테넌트 스코프 조회(`SecurityAudit.php:71-83` demo/subscriber/all 패턴) 준수 + cross-tenant 격리(`index.php:614-619` X-Tenant-Id 서버도출 — ADR D-6). 테넌트 간 추세 혼입 금지(SPEC §35 Cross-Tenant Query 차단).
- **불변성**: Trend는 Snapshot 파생이므로 Immutable Snapshot·KPI Formula Version(SPEC §40) 제약 상속.

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

★모든 forecast/trend/recommendation grep 대량 히트는 거의 전부 마케팅(GT② §4). 아래는 **데이터 소스·목적 완전 분리** — 절대 흡수·개명 금지.

| 마케팅 엔진 | 근거(파일:라인) | 분리 사유 |
|---|---|---|
| 믹스모델 adstock·forecast/frontier | `Mmm.php:24` (GT② §B-1) | `performance_metrics` 소스 마케팅 예측 추세 — authz 아님 |
| SKU 수요 시계열(Holt-Winters) | `DemandForecast.php:23` (GT② §B-3) | 수요 추세 — authz 아님 |
| 어트리뷰션 추이 | `AttributionEngine.php:13` (GT② §B-1) | `attribution_*` 소스 |
| growth funnel/channel 집계 | `AdminGrowth.php:434`·`:625`·`:675`·`:687` (GT② §B-4) | 마케팅 growth 추이 |

★`AttributionEngine.php:1754-1765`은 **TTL 캐시 패턴만 차용**(테이블 신설)이며 attribution 데이터 흡수 아님. `SecurityAudit.php:118-153` acquisition은 인증축 substrate 재활용은 가능하나 마케팅 metric 소스(`Alerting.php:343`·`:388`)는 절대 연결 금지.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: authz Trend Engine = **ABSENT(순신규·grep 0)**. 재활용 substrate = `SecurityAudit.php:118-153`(일자별 집계 패턴·인증축)·`AttributionEngine.php:1754-1765`(TTL 캐시 패턴 차용)·§27 Snapshot 시계열 원천.
- **선행 의존**: BLOCKED_PREREQUISITE. 추세의 데이터 소스인 일별 authz 스냅샷 축적(§27)이 선행이며, JIT/SoD/Certification 추세는 해당 엔진(Part 3-8/3-9/3-10) 실 구현 후 소비(ADR D-7).
- **무후퇴**: `SecurityAudit.php` acquisition·마케팅 추세 엔진 병행 유지. Extend-only·읽기전용(ADR D-8). 코드 변경 0 · NOT_CERTIFIED.
