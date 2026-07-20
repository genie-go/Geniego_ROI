# DSAR — RBAC Analytics & Governance Dashboard: 감사 분석 (APPROVAL_ANALYTICS_AUDIT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_ANALYTICS_AUDIT`(SPEC §2 Canonical Entity·§19 Audit Analytics)는 authz 감사 이벤트의 **집약·커버리지·무결성 검증** 지표를 산출하는 엔티티다. SPEC §19 "지표"는 아래 5요소를 명시한다.

| 지표 | SPEC §19 | 의미 |
|---|---|---|
| Audit Events | 지표 | authz 감사 이벤트 총량·유형별 집계 |
| Audit Coverage | 지표 | 통제/엔티티별 감사 커버리지율 |
| Missing Evidence | 지표 | 근거 누락 이벤트 탐지 |
| Snapshot Completeness | 지표 | 스냅샷 완결성 |
| Immutable Record Validation | 지표 | 불변 기록 변조 검증 |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

★본 엔티티는 4편 중 **유일하게 PARTIAL 실존**이다(Audit Analytics·GT② §2 Audit 행 "PARTIAL").

| 지표 | 판정 | 근거(GT 인용) |
|---|---|---|
| Audit Events(집계·조회) | **PARTIAL(실존)** | `SecurityAudit.php:71-83`·`:93-110`(`recent`·`recentByType` 테넌트스코프)·`:118-153`(`acquisitionSummary` 일자별 trend) (GT① §C·GT② §2) |
| 메뉴 감사 이벤트 | **PARTIAL(실존)** | `AdminMenu.php:696-716`·`:123`·`:200`·`:216` `menu_audit_log` 해시체인+페이지네이션 (GT① §C·GT② §2) |
| 감사 대시보드 렌더 | **PARTIAL(실존)** | `Audit.jsx:522-536`(총/오늘/high-risk/admin KPI)·`:441-479`(posture 카드)·`:371` (GT① §C·GT② §2) |
| 통합 감사 API | **PARTIAL(선례)** | `AdminGrowth.php:1411-1431` `securityAudit()`(recentByType+acquisition+integrity 통합반환) (GT① §C) |
| Immutable Record Validation | **PARTIAL(실존·정본)** | `SecurityAudit.php:56-68`(`verify`·broken_at)·`:35-41`(`lastHash`)·`:14-33`(append-only hash_chain) (GT① §C·ADR D-4) |
| Audit Coverage | **ABSENT** | 통제/엔티티별 커버리지율 지표 grep 0 (GT② §2 "Coverage/Missing Evidence 지표 부재") |
| Missing Evidence | **ABSENT** | 근거 누락 탐지 지표 grep 0 (GT② §2)·SPEC §36 Static Lint 대상(신규) |
| Snapshot Completeness | **ABSENT** | authz 스냅샷 완결성 지표 grep 0 (스냅샷 엔티티 자체가 순신규·별편 DSAR) |

★**함정 회피**: Audit **Events/조회/무결성검증은 PARTIAL 실존**이나, **Coverage·Missing Evidence·Snapshot Completeness 지표는 ABSENT**(GT② §2 명시). 실존을 "커버리지까지 있음"으로 과신 금지.

## 3. 설계 계약 (필드·상태·제약)

- **Immutable Record Validation 정본**: `SecurityAudit.php:56-68` `verify`가 유일 tamper-evident 검증 정본(broken_at 반환). SPEC §19 Immutable Record Validation·§40 Digest Validation은 이 위 확장.
- **Audit Events 집약**: `SecurityAudit.php:93-110`(`recentByType`)·`AdminMenu.php:696-716`(menu_audit_log)를 소스로 유형·기간별 집약(§21 Trend `SecurityAudit.php:118-153` acquisition 추세 재활용).
- **Coverage/Missing Evidence 신설**: SPEC §19·§36 — 통제×엔티티 매트릭스 대비 감사 이벤트 존재율(Coverage)·Evidence 미봉인 이벤트(Missing Evidence) 지표를 authz 소스 위 **신설**(ABSENT).
- **테넌트 격리**: SPEC §40 Tenant Isolation. `SecurityAudit.php:71-83`·`:93-110` 테넌트 스코프(demo/subscriber/all) 재활용, cross-tenant 격리 `index.php:614-619`(ADR D-6).
- **읽기전용 소비**: ADR D-7 — Part 1~3-10 감사 산출을 읽어 집약, 통제 엔진 재구현 금지(무중복).

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

마케팅 감사·KPI(GT② §4)는 authz Audit Analytics와 분리된다. `AdminGrowth.php:434`·`:625`·`:675`·`:687`(growth funnel/channel)·`Reports.php:27`~`:336`(마케팅 DATASETS)·`AttributionEngine.php:13`은 `performance_metrics`/`channel_orders`/`attribution_*` 소스로 authz 감사가 **아니다**. authz Audit의 소스는 `security_audit_log`(`SecurityAudit.php`)·`menu_audit_log`(`AdminMenu.php`)·`auth_audit_log`(`UserAuth.php:2039`·`TeamPermissions.php:715-731` teamAudit)에 한정. 마케팅 지표 흡수·개명 **절대 금지**(ADR D-2).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: Audit **Events/조회/Immutable Validation = PARTIAL 실존**(`SecurityAudit.php:71-153`·`:56-68`·`AdminMenu.php:696-716`·`Audit.jsx:522-536`). **Coverage/Missing Evidence/Snapshot Completeness = ABSENT(순신규)**.
- **재활용**: `SecurityAudit::verify`(`:56-68`) 무결성 정본 + `recent`/`recentByType`/`acquisitionSummary`(`:71-153`) 집약 + `menu_audit_log`(`AdminMenu.php:696-716`) + `AdminGrowth.php:1411-1431` 통합 API 선례.
- **선행 의존**: Coverage 산출은 Part 1~3-10 통제×엔티티 매트릭스 확정 후(BLOCKED_PREREQUISITE·ADR D-7).
- **코드 변경 0 · NOT_CERTIFIED**. Extend-only·읽기전용·마케팅 감사/dataset 흡수 금지.
