# DSAR — RBAC Analytics & Governance Dashboard: 분석 다이제스트 (APPROVAL_ANALYTICS_DIGEST)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_ANALYTICS_DIGEST`(SPEC §2 Canonical Entity·§29 Digest)는 대시보드 산출물의 **무결성 지문(정합 봉인)** 을 계산·저장하는 엔티티다. SPEC §29 "입력" 항목은 아래 4요소를 명시한다.

| 입력 | SPEC §29 | 의미 |
|---|---|---|
| Metrics | 입력 | §8~§19 집약 지표값 |
| Snapshot | 입력 | §27 Dashboard State/KPI/Trend/Timestamp 스냅샷 |
| Evidence | 입력 | §28 Source Dataset/KPI Formula/Version 근거 |
| Dashboard Version | 입력 | 대시보드 스키마/구성 버전 |

SPEC §40 Database Constraint는 `Digest Validation`·`Immutable Snapshot`을 강제한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 요소 | 판정 | 근거(GT 인용) |
|---|---|---|
| authz 전용 Digest 엔티티 | **ABSENT** | authz 다이제스트 substrate grep 0 (GT② §2 Snapshot/Digest 행) |
| 해시체인 무결성(재계산) | **PARTIAL(재활용)** | `SecurityAudit.php:14-33`(prev_hash→hash_chain)·`:35-41`(`lastHash`)·`:56-68`(`verify`·broken_at) (GT① §C·ADR D-4) |
| 다중 입력 봉인 이력 | **PARTIAL(재활용)** | `AccessReview.php:62-81`·`:218-233` `access_review_item` 추가전용+증거 (GT① §B) |
| 메뉴 거버넌스 해시체인 | **PARTIAL(선례)** | `AdminMenu.php:696-716`·`:123`·`:200`·`:216` `menu_audit_log` 해시체인+페이지네이션 (GT① §C) |
| Metrics/Snapshot/Evidence 입력원 | **ABSENT(엔티티)** | 세 입력 엔티티 자체가 순신규(본 파트 별편 DSAR) |
| Dashboard Version | **ABSENT** | authz dashboard 스키마 버저닝 grep 0 (GT② §2) |

★**함정 회피**: authz 전용 Digest는 **ABSENT**다. 유일 재활용 자산은 **SecurityAudit 해시체인**(`SecurityAudit.php:14-33`·`:56-68` 무결성)이며, 이는 마케팅 KPI/rollup(GT② §4)과 무관한 tamper-evident 봉인 substrate다.

## 3. 설계 계약 (필드·상태·제약)

- **정합 봉인**: Digest = hash(Metrics ‖ Snapshot ‖ Evidence ‖ Dashboard Version). `SecurityAudit.php:14-33` 해시체인 산출 로직 확장, 검증은 `:56-68` `verify` 재계산으로 broken_at 탐지.
- **불변성**: SPEC §40 `Digest Validation`·`Immutable Snapshot` — Digest 확정 후 입력 변경 시 검증 실패(재봉인은 신규 row·`access_review_item` `AccessReview.php:62-81` 추가전용 패턴).
- **버전 고정**: Dashboard Version + KPI Formula Version(SPEC §40)을 Digest 입력에 포함해 스키마·공식 변경을 지문에 반영(재현성).
- **테넌트 격리**: SPEC §40 Tenant Isolation. `SecurityAudit.php:71-83`·`:93-110` 테넌트 스코프 조회 재활용, cross-tenant 격리 `index.php:614-619`(ADR D-6) 위 신설.
- **Snapshot/Evidence 의존**: Digest는 Snapshot(§27)·Evidence(§28) 확정 이후에만 산출(입력 4요소 완비 조건).

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

마케팅 KPI/rollup snapshot·리포트 digest(GT② §4·§B)는 authz Digest와 무관하다. `Mmm.php:24`(forecast/frontier)·`AttributionEngine.php:1754-1765`(TTL 캐시·attribution 전용)·`AdminGrowth.php:434`~`:687`(growth 집계)·`Reports.php:35`(VIZ_TYPES)의 지표/스냅샷/버전 계층을 APPROVAL_ANALYTICS_DIGEST로 **흡수·개명 절대 금지**(ADR D-2). `AttributionEngine.php:1754-1765`는 **TTL 캐시 패턴 차용**(§30)에 한정하며 attribution 테이블은 흡수하지 않는다(신설).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: authz Digest 엔티티·Dashboard Version = **ABSENT(순신규)**. 유일 재활용 = `SecurityAudit` 해시체인(`SecurityAudit.php:14-33`·`:35-41`·`:56-68`) 무결성 + `access_review_item`(`AccessReview.php:62-81`) 추가전용 패턴 + `menu_audit_log`(`AdminMenu.php:696-716`) 선례.
- **선행 의존**: Digest 입력(Metrics/Snapshot/Evidence)은 본 파트 별편 엔티티이며 그 원천은 Part 1~3-10 산출(BLOCKED_PREREQUISITE·ADR D-7).
- **코드 변경 0 · NOT_CERTIFIED**. Extend-only·읽기전용·마케팅 metric/dataset 흡수 금지.
