# DSAR — Authorization Observability & Forensics: 관측성 드리프트 (APPROVAL_OBSERVABILITY_DRIFT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_OBSERVABILITY_DRIFT`(SPEC §2·§23 Drift Analytics)는 인가 상태·정책·권한·런타임·재현 결과의 **시간축 이탈(drift)**을 탐지하는 관측성 드리프트 엔티티다. SPEC §23은 다음 5종 드리프트를 탐지하도록 규정한다.

| 드리프트 | SPEC 근거 | 의미 |
|---|---|---|
| Policy Drift | §23·§12(Evaluated/Applied Rule 변화) | 정책 버전 이탈 |
| Permission Drift | §23·§13(Effective Permission/Scope 변화) | 유효권한 이탈 |
| Assignment Drift | §23·§7(Assignment 상태 변화) | 역할부여 이탈 |
| Runtime Drift | §23·§11(Device/Network/Trust 변화) | 런타임 컨텍스트 이탈 |
| Replay Drift | §23·§24·§31(Replay 결과 vs 실제 결과 비교) | 재현-실제 불일치 |

SPEC §24(Replay Simulation)는 Policy/Runtime/Assignment/Threat 변경을 시뮬레이션해 Replay 결과와 실제 결과를 비교하고, §31은 Replay Drift를 Warning Contract로 규정한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 드리프트 종 | 판정 | 근거(파일:라인) |
|---|---|---|
| Policy Drift | **ABSENT** | Policy Trace(§12)·정책 버전 이력 부재. 현재 상태만(`routes.php:1605`)(GT② §2) |
| Permission Drift | **ABSENT** | 과거 시점 effective permission 복원 없음·`TeamPermissions.php:236`(effectiveScope)는 현재만(GT② §2·ADR §D-3) |
| Assignment Drift | **ABSENT** | 부여 시점 스냅샷·시계열 비교 substrate 없음(GT② §2) |
| Runtime Drift | **PARTIAL** | `recordSessionMeta`(`UserAuth.php:4243-4251`) ip/ua 기록·결정 컨텍스트 스냅샷 없음→시계열 비교 불가(GT① §2E·GT② §2) |
| Replay Drift | **ABSENT** | Decision Replay/Digital Twin 부재로 재현-실제 비교 불가(GT② §2·ADR §D-3) |
| 이력 substrate | **PARTIAL** | 감사 3종(auth `UserAuth.php:4174-4197`·menu `AdminMenu.php:169-212`·access_review `AccessReview.php:62-81`) 시점 로그만·drift 분석 계층 없음(GT① §2B·C·D) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변/Digest 무결성/테넌트격리)

- **필드(§23)**: `drift_id` · `tenant`(§33 격리) · `drift_type`(policy/permission/assignment/runtime/replay) · `baseline_snapshot_ref`(§25) · `observed_snapshot_ref`(§25) · `delta_json`(이탈 상세) · `severity`(§31 Warning) · `detected_at`(UTC·§3).
- **탐지 방식**: baseline 스냅샷(APPROVAL_OBSERVABILITY_SNAPSHOT) 대비 observed 상태 비교. Replay Drift는 §24 시뮬레이션 결과 vs 실제 결과 대조(§31 Warning Contract "Replay Drift").
- **무결성**: drift 레코드는 Immutable Event Store(§18) append-only·`SecurityAudit.php:14-33` 패턴 승계(ADR §D-1). 근거 스냅샷은 흡수 아닌 **참조**.
- **테넌트 격리**: `Compliance.php:176`(fail-closed) 재사용(ADR §D-7).
- **선행 데이터**: drift는 baseline/observed 스냅샷이 필요하므로 Snapshot(§25)·Replay(§8)·Policy/Permission Trace(§12·§13) 신설이 전제.

## 4. KEEP_SEPARATE (마케팅 drift 흡수금지 ★핵심)

- ★**마케팅 ModelMonitor drift**(ML 모델 모니터링)는 authz drift와 **엄격 분리**(SPEC §0 규율·GT② §5 B-3). authz Observability Drift(policy/permission/assignment/runtime/replay)는 **ABSENT·순신규**이며 ModelMonitor drift로 흡수 금지.
- **인프라 SystemMetrics**(`SystemMetrics.php:1-60`) = 모듈 error_rate/latency 인프라 이탈, authz drift 아님(GT② §5 B-3).
- **마케팅 attribution/percentile**(`AttributionEngine.php:1522`·`:1546`·`:1553`) = 신뢰구간 변동, authz permission drift 아님(GT② §5 B-2).
- **Walmart correlation_id**(`ChannelSync.php:1705`) = 외부 API 헤더, 무관(GT② §5 B-1).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT(Policy/Permission/Assignment/Replay Drift) · PARTIAL(Runtime Drift substrate=recordSessionMeta).** authz drift 엔티티 전체가 순신규(마케팅 ModelMonitor drift KEEP_SEPARATE).
- **재활용(흡수 아님·확장/참조)**: `recordSessionMeta`(`UserAuth.php:4243-4251`)→런타임 baseline 확장 · `SecurityAudit.php:14-33`→drift 레코드 불변 저장 · 감사 3종 시점 로그→drift 근거 참조.
- **선행 의존**: drift는 baseline/observed 스냅샷·Replay·Policy/Permission Trace 전제 → 이들 부재로 현재 탐지 불가. Part 1~3-13 인증 + Snapshot/Replay/Trace 신설 후 실 구현(BLOCKED_PREREQUISITE).
- **코드 변경 0 · NOT_CERTIFIED.** ★마케팅 drift·인프라 metrics와 엄격 분리·무후퇴.
