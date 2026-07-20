# DSAR — Authorization Observability & Forensics: 인가 지표 엔진 (APPROVAL_AUTH_METRIC)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

SPEC §20 Metrics Engine이 정의하는 **인가 결정 지표(authz decision metrics)** 산출 엔티티. 지표 6종:

| 지표 | SPEC §20 근거 |
|---|---|
| P95 Decision Latency | §20 "P95 Decision" |
| P99 Decision Latency | §20 "P99 Decision" |
| Policy Evaluation Count | §20 "Policy Evaluation Count" |
| Runtime Authorization | §20 "Runtime Authorization" |
| Replay Count | §20 "Replay Count" |
| Forensic Case Count | §20 "Forensic Case Count" |

입력 원천은 §19 Authorization Telemetry(APPROVAL_TELEMETRY)이며, 산출된 지표는 §25 Observability Dashboard·§22 Trace Analytics의 집계 재료가 된다. Canonical Entity=`APPROVAL_AUTH_METRIC`(SPEC §2).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 지표 요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| P95/P99 Decision Latency | **ABSENT** | `TeamPermissions.php` latency/microtime/percentile 0 — authz 결정 지표 미수집(GT② §2 Telemetry/Metrics 행) |
| Policy Evaluation Count | **ABSENT** | 정책 평가 계측 substrate 없음. `effectiveScope`(`TeamPermissions.php:236`)는 현재상태 산출만, 카운터/타이머 부재(GT② §2) |
| Runtime Authorization / Replay Count / Forensic Case Count | **ABSENT** | Decision Replay·Forensic Case 골격 자체 ABSENT(GT② §2 Policy/…/Forensic Case 행·grep 0) |
| 지표 노출 API surface | **ABSENT** | Metrics 질의 엔드포인트 없음. `routes.php:1605` effective route는 현재 권한만 |

**종합: authz Metric = 전 요소 ABSENT(순신규).** 지표를 계산할 latency/percentile/count 수집 계층이 코드에 없다(GT② §2).

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**: metric_key(p95/p99/policy_eval_count/runtime_authz/replay_count/forensic_case_count)·window(시간창)·value·sample_count·tenant·computed_at. Authorization Event Model(SPEC §3)의 Timestamp(UTC)/Tenant 축을 승계.
- **산출 규율**: P95/P99는 §19 Telemetry의 Latency 표본에서 파생(SPEC §19 "Latency"→§20 "P95/P99 Decision"). Replay Count는 §8 Replay Engine, Forensic Case Count는 §17 Case Management 이벤트에서 집계.
- **테넌트 격리**: 지표는 테넌트 스코프 집계. `Compliance.php:176` fail-closed 격리 패턴 재사용(ADR D-7).
- **성능**: SPEC §35 Trace Query ≤ 200ms 범위 내 지표 질의.

## 4. KEEP_SEPARATE (인프라 SystemMetrics·마케팅 관측 흡수금지)

★본 엔티티의 **최대 오흡수 위험**:

| 근접물 | 파일:라인 | 왜 authz Metric 아님 |
|---|---|---|
| 인프라 헬스 지표 | `SystemMetrics.php:1-60` | 모듈 latency_ms/uptime/error_rate = 인프라 헬스이지 인가 결정 latency 아님(GT② §5 B-3) |
| 마케팅 percentile | `AttributionEngine.php:1522`·`:1546`·`:1553` | p5/p95 부트스트랩 신뢰구간 = 귀속 통계이지 authz P95 아님(GT② §5 B-2) |

authz observability ≠ 인프라/마케팅 observability. SystemMetrics의 latency/percentile을 authz decision latency로 재해석·병합 금지(ADR D-8 오흡수 회피).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT(순신규).** P95/P99·Policy Eval Count·Runtime Authz·Replay/Forensic Case Count 전부 미수집(GT② §2).
- **재활용**: 없음(계측 substrate 부재). 격리 패턴만 `Compliance.php:176` 재사용.
- **선행 의존**: §19 Telemetry(APPROVAL_TELEMETRY) 계측 신설이 선행. 그 위에 지표 파생. Part 1~3-13 인증 후 실 구현(BLOCKED_PREREQUISITE·ADR §4).
- **코드 변경 0 · NOT_CERTIFIED.** 실 엔진은 별도 RP-track 승인세션.
