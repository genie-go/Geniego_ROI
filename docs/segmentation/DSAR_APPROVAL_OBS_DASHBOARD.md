# DSAR — Authorization Observability & Forensics: 관측성 대시보드 (APPROVAL_OBSERVABILITY_DASHBOARD)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

SPEC §1 구현목표 항목 25 Observability Dashboard가 정의하는 **인가 관측성 통합 대시보드** 엔티티. Canonical Entity=`APPROVAL_OBSERVABILITY_DASHBOARD`(SPEC §2). 하위 관측 엔티티를 집약·시각화하는 상위 표면:

| 집약 소스 | SPEC 근거 |
|---|---|
| Metrics (P95/P99·Count) | §20 Metrics Engine → APPROVAL_AUTH_METRIC |
| Telemetry (Decision/Latency/Session) | §19 Authorization Telemetry |
| Trace Analytics (Distribution/Hotspots/Denials) | §22 Trace Analytics |
| Log Aggregation | §21 Log Aggregation |
| Digest | §27 Digest(Trace/Timeline/Replay/Evidence/Snapshot) |

대시보드는 §32 API의 Query Metrics·Query Timeline·Query Trace를 통합 조회 표면으로 노출.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 대시보드 소스 | 판정 | 근거(파일:라인) |
|---|---|---|
| Metrics 패널 | **ABSENT** | authz P95/P99·count 미수집(`TeamPermissions.php` percentile 0·GT② §2) |
| Telemetry 패널 | **ABSENT/PARTIAL** | decision 계측 ABSENT·세션 메타만 부분(`recordSessionMeta` `UserAuth.php:4243-4251`·GT② §2) |
| Trace Analytics 패널 | **ABSENT** | decision.distribution/hotspot 무매치(GT② §2) |
| Log Aggregation 패널 | **PRESENT(원천)** | `collectAuditEvents`(`Compliance.php:143-190`) 3소스 통합·`forwardEvent`(`:430-461`) — 유일 실존 집계 원천(GT① §E) |
| authz 관측 대시보드 표면 | **ABSENT** | 인가 관측성 통합 뷰 없음. 무결성 verify 노출만 admin 전용(`AdminGrowth.php:1429`·`SecurityAudit.php:56-68`) |

**종합: Observability Dashboard = ABSENT.** 5개 집약 소스 중 4개(Metrics/Telemetry/Trace Analytics/authz뷰) ABSENT, Log Aggregation(`Compliance.php:143-190`)만 실존.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **패널 구성**: Metrics(§20)·Telemetry(§19)·Trace Analytics(§22)·Log Aggregation(§21)·Digest(§27) 집약. 각 패널은 하위 엔티티 read-only 조회.
- **API 표면**: SPEC §32 Query Metrics/Query Timeline/Query Trace/Verify Integrity를 대시보드 데이터소스로. Verify는 `SecurityAudit::verify`(`SecurityAudit.php:56-68`) 재사용(무결성 상태 표시).
- **읽기 전용**: 대시보드는 원 이벤트 불변(§18). 변경 없음.
- **테넌트 격리**: 테넌트 스코프 뷰·`Compliance.php:176` fail-closed 재사용(ADR D-7). admin 전용 노출(`AdminGrowth.php:1429` 선례).

## 4. KEEP_SEPARATE (인프라 SystemMetrics·마케팅 관측 흡수금지)

★대시보드는 여러 관측 소스를 집약하므로 **오흡수 위험 최고**:

| 근접물 | 파일:라인 | 왜 authz 대시보드 아님 |
|---|---|---|
| 인프라 헬스 대시보드 소스 | `SystemMetrics.php:1-60` | latency_ms/uptime/error_rate = 인프라 관측이지 인가 관측 아님(GT② §5 B-3) |
| ML·데이터 관측 | `ModelMonitor.php`·`DataPlatform.php` | ML 모니터링·데이터 lineage(GT② §5 B-3) |
| 마케팅 통계/귀속 | `AttributionEngine.php:1522`·`Attribution.php`·`Decisioning.php:12` | percentile·touch trace·"decision"≠authz(GT② §5 B-2) |
| ops 운영 감사 | `Compliance.php:176-187`·`:177`(audit_log) | 성장/알림 운영 감사(GT② §5 B-4) |

authz Observability Dashboard는 SystemMetrics 인프라 대시보드·마케팅 리포트를 흡수·병합하지 않는다(ADR D-8 오흡수 회피).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT(순신규).** 4/5 집약 소스 ABSENT. Log Aggregation(`Compliance.php:143-190`)만 실존 원천.
- **재활용(Extend)**: Log Aggregation 패널은 `collectAuditEvents`/`forwardEvent`(`Compliance.php:143-190`·`:430-461`) 재사용. 무결성 표시는 `SecurityAudit::verify`(`SecurityAudit.php:56-68`)·admin 노출 `AdminGrowth.php:1429`.
- **선행 의존**: 집약 대상인 §19 Telemetry·§20 Metrics·§22 Trace Analytics 신설이 선행. 최상위 표면이므로 전 하위 엔티티 인증 후 최후 구현(BLOCKED_PREREQUISITE·ADR §4).
- **코드 변경 0 · NOT_CERTIFIED.**
