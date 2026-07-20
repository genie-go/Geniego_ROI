# DSAR — Authorization Observability & Forensics: 로그 통합집계 (APPROVAL_LOG_AGGREGATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

SPEC §21 Log Aggregation이 정의하는 **다소스 로그 통합집계** 엔티티. 수집 대상 6종:

| 로그 소스 | SPEC §21 근거 |
|---|---|
| Authorization Log | §21 "Authorization Log" |
| Policy Log | §21 "Policy Log" |
| Runtime Log | §21 "Runtime Log" |
| Audit Log | §21 "Audit Log" |
| Session Log | §21 "Session Log" |
| Security Log | §21 "Security Log" |

★본 엔티티는 5편 중 **유일하게 PRESENT 재활용** 축이다. 기존 `Compliance::collectAuditEvents`의 3소스 통합·`forwardEvent` 외부전송을 확장한다(대체 아님).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 집계 요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| 다소스 통합집계(3소스) | **PRESENT** | `collectAuditEvents`(`Compliance.php:143-190`·`:148-187`) — auth_audit_log+security_audit_log+audit_log 통합·테넌트 fail-closed(`:176`)(GT① §E·GT② §2 SIEM 행) |
| Audit Log(ops) 통합 | **PRESENT** | `Compliance.php:176-187`·`:177` audit_log 통합(단 테넌트 스코프서 명시 배제 — ops 감사·KEEP_SEPARATE §4) |
| 외부 전송(forward) | **PRESENT** | `forwardEvent`(`Compliance.php:430-461`·`:440-442`·`:444`) realtime opt-in·high severity·SSRF/TOCTOU 재검사(GT① §E) |
| 직렬화·SIEM 설정·푸시 | **PRESENT** | `isSafeSiemUrl`(`Compliance.php:411-428`)·CEF/LEEF/syslog(`:211-262`)·siemConfig(`:325`)·`siemPush`(`:463-510`·반출 logAudit `:508`)(GT① §E) |
| Authorization/Policy/Runtime/Session Log 전용 소스 | **PARTIAL** | 현 3소스는 감사 3종 기반. authz decision 전용 구조화 로그(Policy/Runtime/Session 분리)는 §19 Telemetry 신설 후 편입(GT② §2 — decision-context 컬럼 확장 필요) |

**종합: Log Aggregation = PRESENT 골격(3소스+forward+SIEM).** 인가 전용 로그 소스 세분화만 확장 필요.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **집계 계약**: `collectAuditEvents`(`Compliance.php:143-190`)의 3소스 통합에 §3 Authorization Event Model(Trace/Correlation ID·Decision·Policy Version) 축을 확장 편입. 소스 라벨(authorization/policy/runtime/audit/session/security).
- **전송 계약**: `forwardEvent`(`Compliance.php:430-461`) high severity opt-in·SSRF 재검사 유지. Telemetry forward 재사용(ADR D-5).
- **테넌트 격리**: `Compliance.php:176` fail-closed 재사용(ADR D-7). ops audit_log는 테넌트 스코프서 명시 배제(GT② §5 B-4·`:141` posture 배제) 유지.
- **무결성**: 반출 시 `siemPush`가 logAudit(`Compliance.php:508`)로 자기 기록 — Chain of Custody(§10) 일반화 근거(ADR D-4).

## 4. KEEP_SEPARATE (인프라 SystemMetrics·마케팅 관측 흡수금지)

| 근접물 | 파일:라인 | 왜 authz Log 아님 |
|---|---|---|
| ops 운영 감사 | `Compliance.php:176-187`·`:177`(audit_log) | 성장/알림/매핑 운영 액션 감사이지 authz observability 아님 — 통합하되 테넌트 스코프서 배제(GT② §5 B-4) |
| 인프라·ML·데이터 관측 | `SystemMetrics.php:1-60`·`ModelMonitor.php`·`DataPlatform.php` | 인프라 헬스/ML/데이터 lineage(GT② §5 B-3) |
| 마케팅 감사 | `Attribution.php`·`Decisioning.php:12`·`:36` | attribution touch·"decision"≠authz(GT② §5 B-2) |
| Walmart 헤더 | `ChannelSync.php:2874`·`:2878`·`:3467`·`:3471` | 외부 correlation_id(GT② §5 B-1) |

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = PRESENT 재활용(★유일).** `collectAuditEvents`(`Compliance.php:143-190`)·`forwardEvent`(`:430-461`)가 Log Aggregation(§21) 골격을 이미 제공.
- **재활용(Extend)**: 3소스 통합·SIEM 직렬화·forward 재사용. 인가 전용 로그 소스 세분화·decision-context 축만 확장(ADR D-5).
- **선행 의존**: authz 전용 Policy/Runtime/Session Log는 §19 Telemetry 계측 신설 후 편입(BLOCKED_PREREQUISITE).
- **코드 변경 0 · NOT_CERTIFIED.**
