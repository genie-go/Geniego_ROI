# DSAR — RBAC Analytics & Governance Dashboard: 분석 스냅샷 (APPROVAL_ANALYTICS_SNAPSHOT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_ANALYTICS_SNAPSHOT`(SPEC §2 Canonical Entity·§27 Snapshot)은 특정 시점의 RBAC 거버넌스 대시보드 상태를 **불변(Immutable)** 저장하는 엔티티다. SPEC §27 "저장" 항목은 아래 5요소를 명시한다.

| 필드 | SPEC §27 | 의미 |
|---|---|---|
| Dashboard State | 저장 | 대시보드 위젯 구성·필터·기준시점의 전체 렌더 상태 |
| Metrics | 저장 | Role/Permission/Assignment/Scope 등 §8~§19 집약 지표값 |
| KPI | 저장 | §20 authz KPI(Least Privilege/ZSP/SoD%/Cert%/MTTR) 산출값 |
| Trend | 저장 | §21 Trend Engine 일/주/월/분기/연 추세 계열 |
| Timestamp | 저장 | 스냅샷 확정 시각(불변 기준점) |

SPEC §40 Database Constraint는 `Immutable Snapshot`·`Digest Validation`·`Tenant Isolation`을 강제한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 요소 | 판정 | 근거(GT 인용) |
|---|---|---|
| authz 전용 대시보드 스냅샷 엔티티 | **ABSENT** | authz 권한상태 스냅샷 substrate grep 0 (GT② §2 Snapshot/Digest 행) |
| 불변 이력 저장 패턴 | **PARTIAL(재활용)** | `AccessReview.php:62-81`·`:218-233` `access_review_item` 추가전용 이력+증거 (GT① §B) |
| 무결성 보증(tamper-evident) | **PARTIAL(재활용)** | `SecurityAudit.php:14-33`(append-only prev_hash→hash_chain)·`:56-68`(`verify` 재계산) (GT① §C·ADR D-4) |
| Timestamp/기준시점 집계 | **PARTIAL(근접)** | `SecurityAudit.php:118-153` `acquisitionSummary` 일자별 trend (GT① §C·인증축) |
| Metrics/KPI/Trend 원천 | **PARTIAL(카운트만)** | `TeamPermissions.php:454-478` member/permission COUNT·`UserAdmin.php:528-576` plan stats (GT② §2) |

★**함정 회피**: authz 전용 Snapshot/Digest는 **ABSENT**다. 마케팅 KPI/rollup snapshot(GT② §4·§B-4 `AdminGrowth.php:434`·`:625` 등)은 `performance_metrics`/`channel_orders` 소스로 **authz snapshot이 아니다** — 흡수·개명 금지.

## 3. 설계 계약 (필드·상태·제약)

- **불변성**: 확정된 Snapshot은 수정 불가(SPEC §40 Immutable Snapshot). `access_review_item`(`AccessReview.php:62-81`) 추가전용 패턴을 확장, 갱신은 신규 row.
- **무결성 봉인**: Snapshot 확정 시 `SecurityAudit.php:14-33` 해시체인에 기록, `:56-68` `verify`로 변조검증 — Digest 엔티티(별편 DSAR)가 이 봉인을 소비.
- **KPI Formula Version 고정**: SPEC §40 `KPI Formula Version` — 스냅샷은 산출 당시 공식 버전을 함께 고정해 재현성 보장(공식 변경 시 과거 스냅샷 불변).
- **테넌트 격리**: SPEC §40 Tenant Isolation·§35 Cross-Tenant Query 차단. `SecurityAudit.php:71-83`·`:93-110` 테넌트 스코프 조회(demo/subscriber/all) 패턴 재활용, cross-tenant 격리는 `index.php:614-619`(ADR D-6) X-Tenant-Id 서버도출 위 신설.
- **읽기전용 파생**: ADR D-1 — 원천 통제(Part 1~3-10) 무변경, Snapshot은 `acl_permission`·`access_review_item`·`security_audit_log`·`api_key`·`auth_audit_log` 읽기 파생.

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

마케팅 KPI/rollup snapshot(GT② §4·§B-4)은 authz Snapshot과 **데이터 소스·목적이 완전 분리**된다. `AdminGrowth.php:434`·`:625`·`:675`·`:687`(growth funnel/channel 집계)·`Mmm.php:24`(forecast/frontier)·`Pnl.php`(손익 대시보드) 등은 `performance_metrics`/`channel_orders`/`attribution_*` 소스 — authz 권한상태 스냅샷이 **아니다**. 이들의 snapshot/dataset 계층을 APPROVAL_ANALYTICS_SNAPSHOT으로 **흡수·개명 절대 금지**(ADR D-2).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: authz 전용 Snapshot 엔티티 = **ABSENT(순신규)**. 재활용 substrate = `access_review_item` 추가전용 이력(`AccessReview.php:62-81`)·`SecurityAudit` 해시체인(`SecurityAudit.php:14-33`·`:56-68`) 무결성.
- **선행 의존**: Metrics/KPI/Trend 원천은 Part 1~3-10 산출(BLOCKED_PREREQUISITE·ADR D-7). 실 스냅샷 엔진은 인증 후 RP-track 승인세션에서 신설.
- **코드 변경 0 · NOT_CERTIFIED**. Extend-only·읽기전용·마케팅 metric/dataset 흡수 금지.
