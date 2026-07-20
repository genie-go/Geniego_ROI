# DSAR — Authorization Observability & Forensics: 분산 인가 트레이스 (APPROVAL_AUTH_TRACE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AUTH_TRACE`는 SPEC §4(Distributed Authorization Trace)가 규정하는 **분산 추적 엔티티**다. API Gateway·Backend Service·Workflow Engine·Batch·Scheduler·Event Bus·Message Queue·gRPC·GraphQL·REST·Microservice(SPEC §4 열거) 전 계층에 걸친 인가 결정 흐름을 **OpenTelemetry 호환 구조**(trace/span/parent-span)로 연결한다.

- SPEC §1(구현 목표 2번 "Distributed Authorization Trace").
- SPEC §5(Correlation Engine)와 결합해 동일 Correlation ID로 login→session→approval→decision 연결.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §4 요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| Distributed Trace(OTel·trace/span/parent_span) | **ABSENT(grep 0)** | GT② §2 "`composer.json` otel/jaeger/zipkin 의존성 0. trace_id/span_id/parent_span 코드 0" · ADR §2.2 "composer 의존성 0" |
| trace/correlation/request_id 컬럼 | **ABSENT** | GT② §2 "`auth_audit_log`(`UserAuth.php:4165`)에 trace/correlation/request_id 컬럼 없음" |
| Correlation Engine(login→session→approval→decision) | **ABSENT** | GT② §2 "연결키 부재. `auth_audit_log`는 flat append(`UserAuth.php:4190`)" |
| flat 감사(트레이스 이전 상태) | **PARTIAL** | `UserAuth.php:4174-4197`(단일 INSERT·상관관계 없는 평면 기록) — GT① §2.B |
| 조회 substrate(트레이스 미포함) | **PARTIAL** | `SecurityAudit.php:71-83`·`:93-110`(recent/recentByType — GT① §2.A "Query Trace/Timeline(부분)") |

★핵심 격차: **Distributed Trace는 완전 그린필드**다. OpenTelemetry 계열 의존성이 `composer.json`에 0건이고, trace_id/span_id/parent_span 코드도 0건(GT② §2·ADR §2.2). 현행은 상관키 없는 flat append(`UserAuth.php:4190`)뿐.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **OTel 호환 구조**(SPEC §4): Trace ID·Span ID·Parent Span ID(SPEC §3 필드)로 계층 span 트리 구성. Auth Event(`APPROVAL_AUTH_EVENT`)의 trace 컬럼을 신설·연동(ADR D-2).
- **상관**(SPEC §5): 동일 Correlation ID로 login/session/approval/policy-eval/JIT/SoD/dynamic-role/API/DB access 연결. Decision Timeline(SPEC §6)은 Immutable(SPEC §6 "Timeline은 Immutable").
- **불변/무결성**: Trace tampering 차단(SPEC §28)은 `SecurityAudit.php:14-33` append-only(UPDATE/DELETE 부재)+`:56-68` verify 위에 신설(ADR D-7). Missing Trace/Missing Correlation ID lint(SPEC §29)는 순신규.
- **테넌트 격리**: `Compliance.php:176`(fail-closed) 재사용.
- **Error**: `TRACE_NOT_FOUND`(SPEC §30)·`Trace Fragmented`(SPEC §31).
- **성능**: Trace Query ≤ 200ms·색인 Trace ID/Correlation ID(SPEC §34·§35) — 실 구현 세션(RP-track) 조건.

## 4. KEEP_SEPARATE (흡수 금지)

- **★Walmart correlation_id(최다 오인)**: `ChannelSync.php:1705`·`:1709`·`:2874`·`:2878`·`:3467`·`:3471`(`WM_QOS.CORRELATION_ID`) — Walmart Marketplace 요청 헤더이지 authz Distributed Trace correlation 아님(GT② §5 B-1). 개명·흡수 절대 금지.
- **마케팅 attribution touch trace**: `AttributionEngine.php:1522`·`:1546`·`:1553`(percentile p5/p95)·`Attribution.php`(멀티터치 `attribution_touch`) — authz trace 아님(GT② §5 B-2).
- **인프라·ML·데이터 관측**: `SystemMetrics.php:1-60`(모듈 latency/uptime/error_rate 인프라 헬스)·`ModelMonitor.php`(ML)·`DataPlatform.php`(데이터 lineage) — authz trace 아님(GT② §5 B-3). ADR D-8 오흡수 회피.

## 5. 판정

- **NOT_CERTIFIED · BLOCKED_PREREQUISITE**: Distributed Authorization Trace = **ABSENT(순수 그린필드·grep 0·OTel 의존성 0)**. Correlation Engine·OTel span 트리 전부 순신규(ADR D-3 계열).
- **재활용/ABSENT**: 재활용 없음에 가까움 — flat 감사(`UserAuth.php:4174-4197`)에 trace 컬럼 확장(ADR D-2)·조회는 `SecurityAudit.php:71-110` 부분. trace/span/correlation 골격은 전부 순신규.
- **선행 의존**: Part 1~3-13(특히 3-12 PDP·3-13 Zero Trust)의 결정·이벤트가 트레이스 대상(ADR D-6). 관측 대상 엔진 인증 후 계측.
