# DSAR — Authorization Observability & Forensics: 성능 요구사항 (Part 3-14 §35)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §35는 6종 성능 목표를 규정한다: **Event Ingestion ≥ 1,000,000 Events/sec · Trace Query ≤ 200ms · Replay ≤ 3초 · Timeline Reconstruction ≤ 5초 · Event Compression Ratio ≥ 80% · Event Store Availability ≥ 99.999%**. 전부 실 엔진(RP-track)에서만 달성 가능한 목표이며 현 설계 단계는 코드 0이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §35 목표 | 판정 | 근거(파일:라인) |
|---|---|---|
| Event Ingestion ≥ 1M/s | **ABSENT** | 현행 감사는 요청당 single INSERT(`SecurityAudit.php:14-33`·`UserAuth.php:4174-4197`). 고처리 파이프라인·배치 수집 substrate 부재 |
| Trace Query ≤ 200ms | **ABSENT(대상 없음)** | Distributed Trace 부재→쿼리 대상 자체 없음. 감사 조회(`SecurityAudit.php:71-83` recent)만 존재 |
| Replay ≤ 3초 | **ABSENT** | Decision Replay Engine 부재. 과거 effective permission 복원 경로 없음(`TeamPermissions.php:236` effectiveScope는 현재 상태만) |
| Timeline Reconstruction ≤ 5초 | **ABSENT** | Decision Timeline 재구성 substrate 부재. `SecurityAudit.php:93-110`(recentByType)은 단순 조회 |
| Event Compression ≥ 80% | **ABSENT** | Immutable Event Store 압축(§18 Compression) 미구현 |
| Availability ≥ 99.999% | **ABSENT(미측정)** | authz 이벤트 스토어 가용성 SLO 미수집(SystemMetrics 인프라 헬스는 KEEP_SEPARATE·`SystemMetrics.php:1-60`) |

관련 지표 부재 실측: authz decision latency/microtime/percentile 미수집(`TeamPermissions.php`), P95/P99(§20) 순신규.

## 3. 설계 계약 (항목·기준 — SPEC 근거)

| 지표 | 목표 (SPEC §35) | 뒷받침 (SPEC) |
|---|---|---|
| Event Ingestion | ≥ 1,000,000 Events/sec | Immutable Event Store(§18)·Event Bus(§1) |
| Trace Query | ≤ 200ms | Index(§34) Trace/Correlation ID |
| Replay | ≤ 3초 | Decision Replay(§8·read-only simulation) |
| Timeline Reconstruction | ≤ 5초 | Decision Timeline(§6)·Index Timeline |
| Event Compression Ratio | ≥ 80% | Event Store(§18 Compression) |
| Availability | ≥ 99.999% | Long-term Retention(§18)·Runtime Guard(§28) |

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE**: 인프라 latency_ms/uptime/error_rate(`SystemMetrics.php:1-60`)·마케팅 percentile(`AttributionEngine.php:1522`·`:1546`·`:1553`)는 authz 성능 목표 아님. 혼입 금지.
- **선행의존**: 6종 목표 전부 substrate 신설(Event Store 승격·Trace·Replay·Timeline·Compression·Availability SLO) 완료 후 벤치마크 가능. 현행 single-INSERT 감사와는 처리 등급이 다르다.

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

**판정 = ABSENT(6종 성능 목표 전부).** 코드 변경 0·NOT_CERTIFIED. Performance(Event Ingestion≥1M/s·Trace≤200ms·Replay≤3s·Timeline≤5s·Compression≥80%·Availability≥99.999%)는 **실 구현(RP-track) 조건**이며 현 단계 측정 불가·미달이 아니라 대상 부재다. 선행 Part 1~3-13 인증 및 Event Store 승격·Trace/Replay/Timeline 신설 후 실 구현 세션에서 벤치마크·검증한다.
