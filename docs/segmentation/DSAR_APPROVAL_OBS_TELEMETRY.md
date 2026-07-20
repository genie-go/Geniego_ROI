# DSAR — Authorization Observability & Forensics: 인가 텔레메트리 (APPROVAL_TELEMETRY)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

SPEC §19 Authorization Telemetry가 정의하는 **인가 결정 계측(raw telemetry) 수집** 엔티티. §20 Metrics Engine(APPROVAL_AUTH_METRIC)의 원천 표본을 공급한다. 수집 6종:

| 텔레메트리 | SPEC §19 근거 |
|---|---|
| Decision Count | §19 "Decision Count" |
| Latency | §19 "Latency" |
| Cache Hit | §19 "Cache Hit" |
| Runtime Errors | §19 "Runtime Errors" |
| Policy Evaluation Time | §19 "Policy Evaluation Time" |
| Session Activity | §19 "Session Activity" |

Canonical Entity 계열=관측성 텔레메트리(SPEC §1 항목 21 Authorization Telemetry). Authorization Event Model(SPEC §3)의 Timestamp/Tenant/Decision 축을 계측 단위로 승계.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 텔레메트리 요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| Decision Count / Latency / Policy Eval Time / Cache Hit / Runtime Errors | **ABSENT** | `TeamPermissions.php` latency/microtime/percentile 0 — authz 결정 지표 수집 없음(GT② §2 Telemetry/Metrics 행) |
| Session Activity | **PARTIAL** | `recordSessionMeta`(`UserAuth.php:4243-4251` ip/ua/last_seen)가 세션 컨텍스트 기록 — 단 **인가 결정(scope 평가 입력·allow/deny) 컨텍스트 스냅샷 없음**(GT① §E·GT② §2 Runtime Context Recorder 행) |
| 결정 이벤트 흐름 | **PARTIAL** | `audit`(`UserAuth.php:4174-4197`)가 인증/보안 액션 flat append — 계측(count/timer) 아닌 감사 로그(GT② §2 "flat append `UserAuth.php:4190`") |

**종합: Telemetry = ABSENT-계측 / PARTIAL-session.** 세션 메타(`recordSessionMeta`)만 부분 실존, decision latency/count/cache-hit 계측은 순신규.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**: telemetry_key(decision_count/latency_ms/cache_hit/runtime_error/policy_eval_ms/session_activity)·value·tenant·subject·decision·trace_id·recorded_at. Authorization Event Model(SPEC §3: Trace ID·Decision·Tenant·Timestamp) 승계.
- **계측 지점**: PDP(3-12)·SoD(3-10)·JIT(3-9)·Zero Trust(3-13) 결정 경로에 계측 훅. OpenTelemetry 호환 구조(SPEC §4·ADR D-2).
- **확장 대상**: `recordSessionMeta`(`UserAuth.php:4243-4251`)를 **결정 컨텍스트 스냅샷으로 확장**(ADR §3 D 재활용 목록·2.1). 대체 아닌 Extend.
- **테넌트 격리**: 계측은 테넌트 스코프. `Compliance.php:176` fail-closed 재사용.

## 4. KEEP_SEPARATE (인프라 SystemMetrics·마케팅 관측 흡수금지)

| 근접물 | 파일:라인 | 왜 authz Telemetry 아님 |
|---|---|---|
| 인프라 헬스 계측 | `SystemMetrics.php:1-60` | latency_ms/uptime/error_rate = 인프라 헬스이지 인가 결정 계측 아님(GT② §5 B-3) |
| 마케팅 통계 | `AttributionEngine.php:1522`·`:1546`·`:1553` | percentile = 귀속 신뢰구간(GT② §5 B-2) |
| Walmart 외부헤더 | `ChannelSync.php:1705`·`:1709` | `WM_QOS.CORRELATION_ID` = 외부 API 헤더이지 authz 상관 아님(GT② §5 B-1) |

authz Telemetry ≠ 인프라 SystemMetrics latency ≠ 마케팅 percentile.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT-계측 / PARTIAL-session(`recordSessionMeta`).**
- **재활용(Extend)**: `recordSessionMeta`(`UserAuth.php:4243-4251`) → 결정 컨텍스트 스냅샷 확장(ADR 2.1·D-5 인접). `Compliance.php:176` 격리.
- **선행 의존**: 계측할 PDP/SoD/JIT/Zero Trust 결정 경로(Part 3-9~3-13) 인증 후 실 계측(BLOCKED_PREREQUISITE). 본 Telemetry가 §20 Metrics의 원천.
- **코드 변경 0 · NOT_CERTIFIED.**
