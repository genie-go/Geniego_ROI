# DSAR — Authorization Observability & Forensics: 트레이스 분석 (APPROVAL_TRACE_ANALYTICS)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

SPEC §22 Trace Analytics가 정의하는 **인가 트레이스 사후 분석** 엔티티. Distributed Trace(§4)·Telemetry(§19) 수집분을 분석해 인가 패턴/위험을 도출한다. 분석 5종:

| 분석 | SPEC §22 근거 |
|---|---|
| Decision Distribution | §22 "Decision Distribution" |
| Policy Hotspots | §22 "Policy Hotspots" |
| Runtime Bottleneck | §22 "Runtime Bottleneck" |
| High Risk Sessions | §22 "High Risk Sessions" |
| Frequent Denials | §22 "Frequent Denials" |

Canonical Entity=`APPROVAL_TRACE_ANALYTICS`(SPEC §2). Authorization Event Model(SPEC §3)의 Decision·Risk Score·Trace ID를 분석 축으로 사용.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 분석 요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| Decision Distribution | **ABSENT** | decision.distribution 무매치 — append-only 증거 로그뿐(GT② §2 Trace Analytics 행·grep 0) |
| Policy Hotspots | **ABSENT** | hotspot 무매치(GT② §2) |
| High Risk Sessions / Frequent Denials | **ABSENT** | forensic/case.manage 무매치. 위험세션·반복거부 집계 substrate 없음(GT② §2) |
| Runtime Bottleneck | **ABSENT** | authz decision latency 미수집(GT② §2 Telemetry 행) — 병목 분석 원천 부재 |
| 분석 입력(Distributed Trace) | **ABSENT** | trace_id/span_id/parent_span 코드 0·OTel 의존성 0(GT② §2 Distributed Trace 행) |

**종합: Trace Analytics = 전 요소 ABSENT(순신규·그린필드).** 분석 대상인 Distributed Trace 자체가 부재하므로 파생 분석도 전무.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**: analytic_key(decision_distribution/policy_hotspot/runtime_bottleneck/high_risk_session/frequent_denial)·dimension(subject/resource/policy/session)·aggregate·window·tenant. Authorization Event Model(SPEC §3: Decision·Risk Score·Resource·Subject) 축.
- **입력 의존**: §4 Distributed Trace·§19 Telemetry·§21 Log Aggregation 수집분에서 파생. Decision Distribution은 Decision 분포, Frequent Denials는 deny 집계, High Risk Sessions는 Risk Score(§3) 임계.
- **읽기 전용**: 분석은 read-only 집계(원 이벤트 불변·SPEC §18 Immutable Event Store). SecurityAudit append-only(`SecurityAudit.php:14-68`) 위에서 조회.
- **테넌트 격리**: 테넌트 스코프 집계·`Compliance.php:176` fail-closed 재사용.

## 4. KEEP_SEPARATE (인프라 SystemMetrics·마케팅 관측 흡수금지)

★"trace/distribution/percentile/decision" 동음이의 오흡수 위험:

| 근접물 | 파일:라인 | 왜 authz Trace Analytics 아님 |
|---|---|---|
| 마케팅 멀티터치 trace | `Attribution.php`(attribution_touch)·`AttributionEngine.php:1522`·`:1546`·`:1553` | 귀속 touch trace·percentile 신뢰구간이지 authz 결정 트레이스 아님(GT② §5 B-2) |
| 마케팅 decision | `Decisioning.php:12`·`:36` | ingestAdInsights "decision"≠authz 결정(GT② §5 B-2) |
| 인프라 병목/헬스 | `SystemMetrics.php:1-60` | latency_ms/error_rate = 인프라 bottleneck이지 authz Runtime Bottleneck 아님(GT② §5 B-3) |
| Walmart 헤더 | `ChannelSync.php:1705`·`:3467` | 외부 correlation_id(GT② §5 B-1) |

authz Trace Analytics ≠ 마케팅 attribution trace ≠ 인프라 병목 분석.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT(순신규·그린필드).** Decision Distribution·Policy Hotspots·High Risk Sessions·Frequent Denials·Runtime Bottleneck 전부 grep 0(GT② §2).
- **재활용**: 없음(분석 substrate 부재). 조회 기반은 SecurityAudit append-only(`SecurityAudit.php:14-68`)·격리 `Compliance.php:176`.
- **선행 의존**: §4 Distributed Trace·§19 Telemetry 수집 신설이 선행(입력 부재 시 분석 불가). Part 1~3-13 인증 후 실 구현(BLOCKED_PREREQUISITE).
- **코드 변경 0 · NOT_CERTIFIED.**
