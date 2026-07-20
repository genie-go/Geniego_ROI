# DSAR — RBAC Analytics & Governance Dashboard: 분석 드리프트 (APPROVAL_ANALYTICS_DRIFT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_ANALYTICS_DRIFT`는 authz 거버넌스 지표·데이터·정책·런타임·대시보드가 **기준선(baseline)에서 이탈**했는지를 탐지하는 엔티티다. SPEC §31 Drift Detection이 다음 5종을 규정한다.

| 드리프트 유형 | SPEC 근거 | 의미(authz 축) |
|---|---|---|
| KPI Drift | §31(SPEC:479) | Least Privilege/ZSP/SoD%/MTTR(§20) KPI 값의 기준 이탈 |
| Dataset Drift | §31(SPEC:480) | acl_permission/access_review_item/audit 소스 집계 분포 이탈 |
| Policy Drift | §31(SPEC:481) | 정책 규칙 셋 변경으로 인한 파생 지표 이탈 |
| Runtime Drift | §31(SPEC:482) | 런타임 인가 decision/latency/success 지표 이탈 |
| Dashboard Drift | §31(SPEC:483) | 대시보드 위젯 렌더 결과·구성 이탈 |

경보(§38 Warning Contract: `KPI Drift`)·§24 Drift Alert로 연결되며, 탐지 후 §32 Revalidation trigger의 원인 신호가 된다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(파일:라인) |
|---|---|---|
| authz KPI/Dataset/Policy/Runtime/Dashboard Drift 전용 구조 | **ABSENT(grep 0)** | GT② §2(authz Snapshot/Digest/Cache/**Drift**/Simulation/Reconciliation substrate grep 0) |
| 조건평가 프레임(임계 비교 substrate) | PARTIAL(도메인중립·마케팅 metric) | `Alerting.php:213`·`:407`·`:442`(AND/OR 조건트리·compareOp) — metric 소스만 authz로 교체 대상(GT① §G) |
| 기준선 스냅샷(비교 기준) | PARTIAL(재활용) | `SecurityAudit.php:14-33`·`:56-68`(append-only·verify)·`AccessReview.php:62-81`(추가전용 이력) — baseline 저장 substrate |
| 소스 데이터(집계 대상) | PRESENT | `TeamPermissions.php:10`(acl_permission)·`SecurityAudit.php:118-153`(acquisition trend) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드(신규)**: `drift_id`·`tenant_id`·`drift_type`(KPI/Dataset/Policy/Runtime/Dashboard)·`baseline_ref`(스냅샷 참조)·`observed_value`·`baseline_value`·`deviation`·`detected_at`·`status`.
- **상태**: `DETECTED → ALERTED(§24 Drift Alert) → REVALIDATION_TRIGGERED(§32)`.
- **제약**: 테넌트 격리 필수(§40 Tenant Isolation·`index.php:614-619` X-Tenant-Id 서버도출·ADR D-6). baseline은 불변 스냅샷(§40 Immutable Snapshot)에서만 도출. KPI Formula Version(§40)이 다르면 드리프트 비교 무효(버전 고정 후 비교).
- **substrate 재사용**: 조건평가는 `Alerting.php:213` 프레임 확장(metric만 교체), 기준선 무결성은 `SecurityAudit.php:56-68` verify 재활용(ADR D-4).

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

★**Drift ≠ AnomalyDetection**: `AnomalyDetection.php:22`는 **광고 SPC 이상감지**(ROAS/CPA/CTR/CVR)로 `performance_metrics` 소스의 마케팅 엔진이다(GT② §B-2). 본 엔티티는 `acl_permission`/`security_audit_log` 소스의 **authz 지표 이탈** 탐지로 데이터 소스·목적이 완전 분리된다. AnomalyDetection의 SPC 로직·통계 임계를 흡수·개명 절대 금지. 마케팅 forecast/drift(`Mmm.php:24` forecast/frontier)와도 무관.

## 5. 판정 (NOT_CERTIFIED · ABSENT-순신규 · 선행의존)

- **판정 = ABSENT-순신규**. authz 5종 Drift 전용 substrate grep 0(GT② §2). 그린필드.
- **재활용(흡수 아님·확장)**: `Alerting.php:213` 조건평가 프레임(metric만 authz 교체)·`SecurityAudit.php:14-33`/`:56-68` 기준선 무결성(ADR D-4).
- **선행 의존**: baseline 스냅샷(APPROVAL_ANALYTICS_SNAPSHOT)·KPI Engine(§20) 실 구현 후 산출 가능(BLOCKED_PREREQUISITE). Runtime Drift는 런타임 인가 지표(Part 1~3-10) 산출을 소스로 함(ADR D-7).
- **코드 변경 0 · NOT_CERTIFIED**. 실 엔진은 선행 Decision Core 인증 후 RP-track 승인세션.
