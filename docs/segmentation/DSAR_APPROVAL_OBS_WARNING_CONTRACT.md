# DSAR — Authorization Observability & Forensics: 경고 계약 (Part 3-14 §31)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §31은 실패(에러)에는 이르지 않으나 관측 품질 저하를 알리는 **5종 경고**를 규정한다: Missing Telemetry · Event Delay · Trace Fragmented · Replay Drift · Chain Integrity Warning. 에러 계약(§30)이 fail-secure 차단이라면, 경고 계약은 관측성 degradation을 운영자에게 조기 노출(non-blocking)하여 Drift Analytics(§23)·Trace Analytics(§22)로 연계한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 경고(§31) | 판정 | substrate / 근거(GT) |
|---|---|---|
| Chain Integrity Warning(체인 무결성 경고) | **PARTIAL 재활용** | `SecurityAudit.php:56-68` verify가 broken_at 산출→경고 표면화 가능. menu_audit_log는 verify 부재(`AdminMenu.php:169-212`)→경고 산출 불가 격차 |
| Missing Telemetry(텔레메트리 누락 경고) | **PARTIAL 근거** | SIEM 집계 실재(`Compliance.php:143-190` collectAuditEvents 3소스)·forward high-severity만(`:430-461`). 그러나 authz decision latency/P95 미수집(GT②§2)→누락 경고 대상 |
| Event Delay(이벤트 지연 경고) | **PARTIAL 근거** | 세션 last_seen 기록(`recordSessionMeta` `UserAuth.php:4243-4251`). 이벤트 수집 지연 지표 자체는 부재 |
| Trace Fragmented(트레이스 파편화 경고) | **ABSENT** | trace/span substrate 없음(GT②§2)→파편화 판정 순신규 |
| Replay Drift(재현 편차 경고) | **ABSENT** | Decision Replay·비교 경로 없음(§24 Replay Simulation 미구현·GT②§2) |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

- **W-1 Chain Integrity Warning**: verify(`SecurityAudit.php:56-68`) 결과 경계선(예: 부분 검증 실패·미검증 체인 존재) 시 경고. menu_audit_log verify 부재를 ADR D-2 확산 대상으로 등록하여 경고 산출 범위 확대.
- **W-2 Missing Telemetry**: Authorization Telemetry(§19 Decision Count/Latency)·Metrics(§20 P95/P99) 미수집 시 경고. Log Aggregation(`Compliance.php:143-190`) 재사용하되 authz decision 지표는 순신규(ADR D-5).
- **W-3 Event Delay**: 이벤트 ingestion 지연(§35 ≥1M events/sec 대비) 감지 시 경고. non-blocking.
- **W-4 Trace Fragmented**: 동일 Correlation ID(§5) span 연결 불완전 시 경고. Correlation Engine(§5)·Decision Timeline(§6) 순신규 전제.
- **W-5 Replay Drift**: Replay 결과와 실제 결과 불일치(§24) 시 경고. Drift Analytics(§23 Replay Drift)로 연계.
- **W-6 Non-blocking 원칙**: 경고는 요청 차단 없이 Observability Dashboard(§25)·Digest(§27)에 집계.

## 4. KEEP_SEPARATE (마케팅/인프라 관측 흡수금지)

- **인프라 텔레메트리**(`SystemMetrics.php:1-60` latency_ms/uptime/error_rate)는 Missing Telemetry/Event Delay 경고 대상 아님 — 인프라 헬스이지 authz decision 지표 아님(GT②§5 B-3).
- **마케팅 percentile/drift**(`AttributionEngine.php:1522`·`:1546`·`:1553` p5/p95 신뢰구간)는 Replay Drift와 무관(GT②§5 B-2). ML 모니터링(`ModelMonitor.php`)·데이터 lineage(`DataPlatform.php`)도 흡수 금지.
- Walmart correlation_id(`ChannelSync.php:1705` 등)는 Trace Fragmented 대상 아님(GT②§5 B-1).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **재활용**: Chain Integrity Warning은 `SecurityAudit.php:56-68` verify 재활용. Missing Telemetry는 SIEM/집계(`Compliance.php:143-190`·`:430-461`) 기반 확장.
- **ABSENT(순신규)**: Trace Fragmented·Replay Drift substrate 전무(그린필드).
- **격차**: authz decision latency/P95 미수집(Missing Telemetry 근거)·menu verify 부재(Chain Integrity Warning 산출 불가)는 기존 격차(ADR D-2/D-5 확산 대상·수정 아님).
- **선행의존**: Part 1~3-13 인증 후 실 구현(BLOCKED_PREREQUISITE). 코드 변경 0 · NOT_CERTIFIED.
