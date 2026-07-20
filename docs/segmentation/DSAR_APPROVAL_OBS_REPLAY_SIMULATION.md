# DSAR — Authorization Observability & Forensics: 재현 시뮬레이션 (APPROVAL_OBS_REPLAY_SIMULATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_OBS_REPLAY_SIMULATION`은 Policy·Runtime·Assignment·Threat 변경을 가정하여 **재현하고, Replay 결과와 실제 결과를 비교**하는 시뮬레이션 엔티티다(SPEC §24). 즉 "정책/런타임/배정/위협이 달랐다면 결정이 어떻게 바뀌었을 것인가"를 What-if로 산출하고 실제와의 차이(Drift)를 검출한다. Drift Analytics의 Replay Drift(SPEC §23)와 연결되며, Replay Engine(§8·read-only)이 실행 기반이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Part3-14 요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| Replay Simulation(결과 비교) | **ABSENT** | Decision Replay authz 매치 0(GT② §1). What-if/replay drift 비교 경로 없음(GT② §2) |
| 비교 기준(실제 결정) | **PARTIAL·현재상태만** | `effectiveScope`(`TeamPermissions.php:236`)·effective route(`routes.php:1605`)는 현재 상태만·과거 실제 결정 이력 아님(GT② §2) |
| 시뮬레이션 원천 이벤트 | **PRESENT(SecurityAudit)** | `SecurityAudit.php:14-68` append-only 해시체인=실제 이벤트의 tamper-evident 기준선(GT① §A) |
| Drift 지표 수집 | **ABSENT** | Trace Analytics·Drift Analytics 전부 grep 0(GT② §2). authz telemetry 미수집 |
| Replay Count/비교 지표 | **ABSENT** | Metrics Engine Replay Count(SPEC §20) 미수집(GT② §2) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변/테넌트격리)

| 항목 | 계약 |
|---|---|
| 변경 축 | Policy 변경·Runtime 변경·Assignment 변경·Threat 변경(SPEC §24) |
| ★비교 | Replay 결과 vs 실제 결과 비교(SPEC §24). 차이=Replay Drift(SPEC §23·§31 경고) |
| 실행 기반 | Decision Replay(SPEC §8 Read-only Simulation)—실 리소스 접근 없음. Runtime Guard Replay Abuse 차단(SPEC §28) |
| 입력/기준선 | Immutable Event Store(SPEC §18)의 실제 이벤트 + Snapshot Replay Result(SPEC §25) |
| 무결성/격리 | 기준선 이벤트 Hash Chain Integrity(SPEC §33)·Tenant Isolation(`Compliance.php:176` fail-closed) |
| 오류/경고 | REPLAY_FAILED(SPEC §30)·Replay Drift(SPEC §31) |

## 4. KEEP_SEPARATE (Walmart correlation_id·마케팅 흡수금지)

| 동음이의 | 실체 | 근거(파일:라인) |
|---|---|---|
| ★correlation_id | Walmart 외부 API 헤더 — 시뮬레이션 상관키 아님 | `ChannelSync.php:1705`·`:2878`·`:3471`(GT② §5 B-1) |
| 마케팅 decision | ingestAdInsights("decision"≠authz 시뮬레이션) | `Decisioning.php:12`·`:36`(GT② §5 B-2) |
| 마케팅 percentile | 부트스트랩 신뢰구간 p5/p95(≠replay drift 지표) | `AttributionEngine.php:1522`·`:1546`·`:1553`(GT② §5 B-2) |
| ML 모니터링/데이터 lineage | 모델·데이터 드리프트(≠authz replay drift) | `ModelMonitor.php`·`DataPlatform.php`(GT② §5 B-3) |

authz Replay Simulation의 drift 비교는 마케팅 A/B·ML drift·데이터 lineage와 **분리 유지**(ADR D-8).

## 5. 판정 (NOT_CERTIFIED · ABSENT-순신규 · 선행의존)

- **판정**: **ABSENT(순신규)**. Replay Simulation(What-if·결과 비교)은 그린필드. 실제 결정 기준선조차 과거 이력이 아닌 현재상태 계산(`TeamPermissions.php:236`)뿐이다(GT② §2).
- **재활용(참조/확장)**: SecurityAudit Immutable Event Store(`SecurityAudit.php:14-68`)를 실제 기준선으로(ADR D-1). Replay Engine(§8·본 배치 AUTH_REPLAY DSAR)·Digital Twin(§7)이 실행 선행.
- **선행 의존**: Correlation(§5)·Timeline(§6)·Replay(§8)·Digital Twin(§7)이 선행되어야 시뮬레이션 성립. Part 1~3-13 인증 후 실 구현(BLOCKED_PREREQUISITE·ADR §4).
- **코드 변경 0 · NOT_CERTIFIED**. Replay Validation·Regression 100%는 실 구현(RP-track) 세션 조건(ADR §5).
