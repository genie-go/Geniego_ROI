# DSAR — Authorization Observability & Forensics: 거버넌스 부재 + 중복/근접물 감사 (Ground-Truth ②)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`. Ground-Truth ①: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`.
> (A) 거버넌스 계층 ABSENT/PARTIAL 실측 + (B) ★KEEP_SEPARATE 동음이의(correlation_id/trace/telemetry/decision).

---

## 1. 핵심 판정 — **관측성·포렌식 골격 부재, 감사 로그만 실존**

`trace_id|correlation_id|span_id|opentelemetry|replay|digital_twin|forensic|chain_of_custody|legal_hold` **authz 매치 0건**(히트는 Walmart 외부헤더 correlation_id·마케팅 attribution·인프라 SystemMetrics). Observability/Forensics 골격은 그린필드. 단 SecurityAudit 해시체인·감사 3종·SIEM 집계(GT①)는 재활용.

## 2. 거버넌스 계층 실측표

| SPEC 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| Distributed Authorization Trace(OTel·trace/correlation/span) | **ABSENT(grep 0)** | `composer.json` otel/jaeger/zipkin 의존성 0. trace_id/span_id/parent_span 코드 0. `auth_audit_log`(`UserAuth.php:4165`)에 trace/correlation/request_id 컬럼 없음 |
| Correlation Engine / Decision Timeline | **ABSENT** | login→session→approval→decision 연결키 부재. `auth_audit_log`는 flat append(`UserAuth.php:4190`) |
| Decision Replay / Authorization Digital Twin(time-travel) | **ABSENT** | 과거 시점 effective permission 복원 경로 없음. `effectiveScope`(`TeamPermissions.php:236`)·effective route(`routes.php:1605`)는 현재 상태만 |
| Immutable Event Store | **PRESENT(SecurityAudit) / PARTIAL(auth·menu)** | `SecurityAudit.php:14-68`(append-only+verify)=완비. auth_audit_log 해시체인 없음·menu_audit_log verify 부재 |
| Evidence Chain(Hash Chain) | **PRESENT(SecurityAudit) / 부분** | `SecurityAudit.php:25-27`(prev→sha256). access_review 참조(`AccessReview.php:225`). 통합 Evidence Chain(assignment/approval/policy/decision 연결)은 순신규 |
| Chain of Custody / Evidence Export lifecycle / Retention / Legal-hold | **ABSENT** | 증거 생성/접근/복사/export/보존/폐기 불변기록 substrate 전무. retention/purge/legal-hold grep 0(`Compliance.php`). ★custody 단절 실측(§4) |
| Runtime Context Recorder | **PARTIAL** | `recordSessionMeta`(`UserAuth.php:4243-4251`)·`audit`(`:4174-4191`) ip/ua 기록. **인가 결정(scope 평가 입력·allow/deny) 컨텍스트 스냅샷 없음** |
| Authz Telemetry/Metrics(P95/P99 decision latency) | **ABSENT** | `TeamPermissions.php` latency/microtime/percentile 0. authz 결정 지표 수집 없음(SystemMetrics=인프라 KEEP_SEPARATE) |
| Policy/Permission/Session/Resource Trace + Trace Analytics + Forensic Case | **ABSENT(grep 0)** | forensic/hotspot/case.manage/decision.distribution 무매치. append-only 증거 로그뿐 |
| SIEM forward / Log Aggregation | **PRESENT** | `Compliance.php:143-190`(collectAuditEvents 3소스)·`:430-461`(forwardEvent) |
| Runtime Guard(trace tampering)/Static Lint(missing trace) | **ABSENT/PARTIAL** | SecurityAudit append-only가 이벤트삭제 방어 부분. trace tampering/replay abuse 차단·missing-trace lint 순신규 |

## 3. 재활용 substrate 요약 (순수 그린필드 아님 — 흡수 아닌 참조/확장)

1. **SecurityAudit 해시체인** — `SecurityAudit.php:14-68`. Immutable Event Store + Evidence Chain 앵커(유일 tamper-evident). 신규 증거는 흡수 아닌 **참조**로(AccessReview `:225` 선례).
2. **감사 3종** — auth_audit_log(`UserAuth.php:4174-4197`)·menu_audit_log(`AdminMenu.php:169-212`)·access_review_item(`AccessReview.php:62-81`). trace/correlation/decision-context 컬럼 확장 대상.
3. **SIEM/집계** — `Compliance.php:143-190`·`:430-461`. Log Aggregation·외부전송 재사용.
4. **Runtime Context Recorder** — `recordSessionMeta`(`UserAuth.php:4243-4251`). 결정 컨텍스트 스냅샷으로 확장.
5. **verify 패턴** — `SecurityAudit.php:56-68`. menu_audit_log 등 verify 부재 체인에 확산.

## 4. ★부수 발견 — Chain of Custody 단절 (설계 갭 근거·수정 아님·라이브 결함 판단 보류)

- `Compliance.php:265-300`(`auditExport` 감사증적 반출)이 **자기 export 액션을 감사 기록하지 않음**(auditExport 내 logAudit 호출 없음) → 증거 접근/반출의 chain of custody 단절. 대조: `siemPush`는 반출을 logAudit(`Compliance.php:508`).
- 보존/폐기 정책 전무(retention/purge/legal-hold 무매치). 로그는 DELETE 경로 없음(append-only 부수효과일 뿐 정책 아님).
- ★이는 Part 3-14가 신설할 **Chain of Custody(§10)의 갭 근거**이며, 설계 코드0 규율상 수정 대상 아님(후속 fix 후보·라이브 결함 여부 별도 판단). 재플래그 금지.

## 5. ★KEEP_SEPARATE — 동음이의 (authz observability 아님·개명 금지)

### B-1. correlation_id = Walmart 외부 API 헤더 (★오인 최다)
- `ChannelSync.php:1705`·`:1709`·`:2874`·`:2878`·`:3467`·`:3471`(`WM_QOS.CORRELATION_ID`). Walmart Marketplace 요청 헤더이지 authz correlation 아님.

### B-2. 마케팅 trace/percentile/decision
- `AttributionEngine.php:1522`·`:1546`·`:1553`(percentile p5/p95 부트스트랩 신뢰구간)·`Attribution.php`(멀티터치 touch trace `attribution_touch`)·`Decisioning.php:12`·`:36`(ingestAdInsights — "decision"≠authz 결정). 마케팅.

### B-3. 인프라·ML·데이터 관측성
- `SystemMetrics.php:1-60`(모듈 latency_ms/uptime/error_rate=인프라 헬스·비authz)·`ModelMonitor.php`(ML 모니터링)·`DataPlatform.php`(데이터 lineage). authz observability 아님.

### B-4. 운영 감사 (authz 아님)
- `audit_log`(ops/growth 운영 액션·`Compliance.php:176-187`·`:177`). collectAuditEvents가 통합하나 테넌트 스코프에서 명시 배제(`:176` fail-closed·`:141` posture 배제). 성장/알림/매핑 운영 감사이지 authz observability 아님.
- 마케팅 감사/로그(OrderHub/PgSettlement/attribution touch)는 별개 핸들러·authz forensics 범위 밖.

## 6. 종합

**Observability/Forensics 거버넌스 = ABSENT 골격(Distributed Trace·Correlation·Timeline·Replay·Digital Twin·Policy/Permission/Session/Resource Trace·Telemetry·Trace Analytics·Forensic Case·Chain of Custody·Retention/Legal-hold·Guard/Lint 순신규) / PARTIAL(auth/menu audit·recordSessionMeta) / PRESENT(SecurityAudit 해시체인·SIEM/집계·access_review 증거).** 재활용(흡수 아님·참조/확장): SecurityAudit→Immutable Event Store 승격·감사행 trace/correlation/decision-context 확장·verify 패턴 확산·SIEM/집계 재사용·recordSessionMeta→결정 컨텍스트 스냅샷. **★custody 단절(auditExport 미기록)=신설 갭 근거·수정 아님. ★KEEP_SEPARATE=Walmart correlation_id·마케팅 attribution/percentile/decision·인프라 SystemMetrics·ML/데이터 lineage·ops audit_log.** authz observability≠마케팅/인프라 observability.
