# DSAR — Runtime SoD Enforcement: 충돌 애널리틱스 (APPROVAL_SOD_ANALYTICS)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_SOD_ANALYTICS`는 SoD 통제 상태를 집계·조회하는 지표 뷰다(SPEC §26). 지표 7종:

| 지표 | SPEC §26 항목 | 의미 |
|---|---|---|
| Total Conflicts | 총 충돌 수 | 탐지 규모 |
| Blocked Requests | 차단 요청 수 | Runtime Guard 효과 |
| Exception Usage | 예외 사용량(§18~19) | 예외 남용 감시 |
| Override Usage | Override 사용량(§20) | Break-glass 남용 감시 |
| High Risk Conflicts | 고위험 충돌 | Risk Engine(§17) 연동 |
| Top Violated Rules | 최다 위반 규칙 | 규칙 리스크 랭킹 |
| Average Resolution Time | 평균 해소시간 | 통제 성능 |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Analytics 지표 | 실존 근거 | 판정 |
|---|---|---|
| Total Conflicts / High Risk / Top Violated | SoD 충돌 이벤트 전용 스키마·집계 grep 0(GT② §2·ADR 2.2) | **ABSENT(grep 0)** |
| Blocked Requests | RBAC 게이트 403 `index.php:572-611`·guardTeamWrite `UserAuth.php:1167-1186`·guardWarehouse `Wms.php:557-590` — 인가 차단이지 "충돌 차단" 계수 아님 | PARTIAL(비-SoD 차단만) |
| Exception / Override Usage | break-glass `UserAuth.php:790-801`·MFA `UserAuth.php:929-961` 존재하나 SoD 예외 이벤트 계수 부재 | **ABSENT(계수 없음)** |
| Average Resolution Time | dual-control 승인(`Mapping.php:287` 정족수) 존재하나 SoD 해소시간 지표 아님 | **ABSENT(grep 0)** |
| 집계 원천(재활용) | SecurityAudit 불변체인 `SecurityAudit.php:14-33`·`:56-69`·access_review `AccessReview.php:66-80` = Evidence/Digest 소스 | PRESENT(재활용 원천) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **파생 전용(집계≠소스)**: Analytics는 Evidence(§24)·Digest(§25)를 원천으로 하는 read-only 집계 뷰다. 원천은 SecurityAudit 불변체인(`SecurityAudit.php:14-33`)·access_review(`AccessReview.php:66-80`) 재활용, 지표 집계 로직은 순신규.
- **테넌트 격리**: 지표는 auth_tenant(`index.php:614-619`) 경계 내 집계 — Cross-Tenant 합산 금지(SPEC §36 Tenant Isolation).
- **Explainable**: Top Violated Rules·High Risk는 Conflict Rule/Matrix(§2·§14) 참조로 근거 표시(SPEC §35 Explain Conflict).
- **성능**: Analytics 조회 API는 캐시(SPEC §38 Cache Hit≥97%) 위에서 지표 서빙.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **마케팅 Analytics ≠ SoD Analytics**: `ModelMonitor.php`(model drift)·`AnomalyDetection.php`(마케팅 이상탐지)는 마케팅 도메인(GT② B-6) — SoD 충돌 지표로 흡수·개명 금지(ADR B-6 KEEP_SEPARATE).
- **RBAC 403 차단 ≠ Conflict Blocked**: `index.php:572-611`·`Wms.php:557-590` 인가 차단은 SoD 충돌 차단이 아님(GT② §2·인가 게이트는 스코프이지 충돌평가 아님).
- **menu_audit_log 집계 ≠ SoD 지표**: `AdminMenu.php:123-140`은 메뉴 거버넌스(GT② B-7)이지 SoD Analytics 소스 아님.
- **정산 recon 지표 ≠ SoD**: `PgSettlement.php`(정산 recon)는 비-SoD(GT② B-6).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **NOT_CERTIFIED · 코드 0**: 7종 SoD 지표 집계·조회 API = 순신규(grep 0).
- **재활용(Extend)**: 집계 원천은 SecurityAudit 불변체인(`SecurityAudit.php:14-33`·`:56-69`)·access_review(`AccessReview.php:66-80`)·테넌트 격리(`index.php:614-619`) 재활용 — 지표층은 신설.
- **선행 의존**: Evidence(§24)·Digest(§25) 실 구현이 지표 원천 → 그 전엔 집계 무효(BLOCKED_PREREQUISITE). Conflict Rule/Matrix 신설(ADR D-2)이 Top Violated/High Risk 지표 전제.
