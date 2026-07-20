# DSAR — RBAC Analytics & Governance Dashboard: 예측 엔진 (APPROVAL_ANALYTICS_FORECAST)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

SPEC §22 Forecast Engine은 authz/RBAC 거버넌스 지표의 **미래치를 예측**한다. 예측 대상 6종: **Role Growth · Permission Growth · Assignment Growth · Review Load · Approval Load · Runtime Capacity**. Trend Engine(§21)의 시계열을 입력으로 성장률·부하를 추정하며, 산출물은 §30 Cache(Forecast TTL)·§34 Simulation(정책변경 영향)·§38 Warning(Forecast Confidence Low)의 입력이 된다. Executive Dashboard(§4)의 용량계획·인증부하 예측에 소비된다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(파일:라인) |
|---|---|---|
| authz축 Forecast Engine(6종 예측) | **ABSENT(grep 0)** | `authz.*forecast\|role.*forecast\|permission.*dashboard` 전용 구조 전무 — GT② §1 · GT② §2 "Trend/Forecast/Recommendation(authz) ABSENT grep 0" |
| Permission/Assignment Growth 원천(카운트) | **PARTIAL** | `TeamPermissions.php:454-478`(permission COUNT)·`UserAdmin.php:150-188` `expiringSoon`(expired/within7/within30) — GT① §E. 성장 예측 아닌 스냅샷 카운트 |
| Review/Approval Load 원천 | **PARTIAL** | `AccessReview.php:141`·`:158`·`:169-172`(상태별 카운트·needs_review 집계) — GT① §B. 부하 시계열/예측 없음 |
| 시계열 기반선 | **PARTIAL** | `SecurityAudit.php:118-153`(일자별 집계·인증축) — 예측 아닌 과거 집계 |

★핵심: **authz 예측축은 완전 그린필드**다. 존재하는 것은 현시점 카운트(permission/assignment/review 상태별 집계)뿐이며 성장률 추정·부하 예측·용량계획 로직은 GT② §1/§2에서 grep 0. Growth 예측의 입력이 될 시계열 축적(§27 Snapshot·§21 Trend) 자체가 선행 부재.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **forecast_type**: `role_growth|permission_growth|assignment_growth|review_load|approval_load|runtime_capacity`(SPEC §22).
- **필드**: horizon(예측 구간)·predicted_value·confidence·기반 trend_ref(§21). Confidence 낮으면 SPEC §38 "Forecast Confidence Low" 경고·SPEC §37 `FORECAST_FAILED` 에러 계약.
- **데이터 소스**: authz 원천만 — `acl_permission`(`TeamPermissions.php:10`, Role/Permission Growth)·`access_review_item`(`AccessReview.php:62-81`, Review Load)·`api_key`/`auth_audit_log`(Approval/Runtime). 원천 통제 무변경 읽기전용 파생(ADR D-1).
- **캐시**: Forecast 결과는 SPEC §30 Cache 대상. `AttributionEngine.php:1754-1765` TTL 패턴 차용 + authz 전용 캐시 테이블 신설(ADR D-3, 범용 대시보드 캐시 레지스트리 ABSENT).
- **테넌트 격리 절대**: 테넌트별 예측 분리·cross-tenant 격리(`index.php:614-619` — ADR D-6). Immutable Snapshot·KPI Formula Version(§40) 상속.

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

★★**최대 오흡수 위험 엔티티**: "forecast" grep 히트는 거의 전부 마케팅 예측 엔진이다(GT② §4·ADR D-2). 아래는 `performance_metrics`/`channel_orders` 소스 마케팅 — authz Forecast로 **데이터셋·metric 계층 흡수 절대 금지**.

| 마케팅 예측 엔진 | 근거(파일:라인) | 분리 사유 |
|---|---|---|
| 믹스모델 forecast/frontier | `Mmm.php:24` (GT② §B-1) | 광고 지출 예측·이익 프론티어 — authz 아님 |
| SKU 수요 예측(Holt-Winters) | `DemandForecast.php:23` (GT② §B-3) | 수요 예측 — authz 아님 |
| 고객 구매확률/이탈/LTV | `CustomerAI.php:26` (GT② §B-3) | RFM/이탈 예측 — authz 아님 |
| influencer 그래프 스코어 | `GraphScore.php:32` (GT② §B-3) | 스코어링 — authz forecast 아님 |

★ADR D-2 명시: 재사용은 **엔진 substrate(평가·통지·export·cache)** 에 한정하며 마케팅 forecast 로직·metric 계층은 재사용 대상이 아니다.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: authz Forecast Engine = **ABSENT(순신규·grep 0)**. 재활용 substrate = §21 Trend(선행)·§27 Snapshot 시계열·`AttributionEngine.php:1754-1765`(TTL 캐시 패턴)·현 카운트 원천(`TeamPermissions.php:454-478`·`UserAdmin.php:150-188`·`AccessReview.php:141`).
- **선행 의존**: BLOCKED_PREREQUISITE. Forecast는 Trend(§21)·Snapshot 시계열이 선행이며, Approval/Review Load 예측은 JIT(Part 3-9)·Certification(Part 3-8) 엔진 산출을 소비(ADR D-7).
- **무후퇴**: 마케팅 예측 엔진(Mmm/DemandForecast/CustomerAI/GraphScore) 병행 유지·흡수 0(ADR D-2·D-8). Extend-only·읽기전용. 코드 변경 0 · NOT_CERTIFIED.
