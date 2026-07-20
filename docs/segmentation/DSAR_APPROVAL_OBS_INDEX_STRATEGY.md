# DSAR — Authorization Observability & Forensics: 인덱스 전략 (Part 3-14 §34)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §34는 관측성·포렌식 조회 성능을 위해 8종 인덱스를 요구한다: **Trace ID · Correlation ID · Session · Subject · Resource · Decision · Timeline · Case**. §35의 Trace Query ≤200ms·Timeline Reconstruction ≤5초를 뒷받침하는 조회 경로 인덱스다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §34 인덱스 | 판정 | 근거(파일:라인) |
|---|---|---|
| Trace ID | **ABSENT** | trace_id/span_id/parent_span 코드 0. `auth_audit_log`(`UserAuth.php:4165`)에 trace 컬럼 없음. composer otel/jaeger/zipkin 의존성 0(`composer.json`) |
| Correlation ID | **ABSENT(authz)** | login→session→approval 연결키 부재. authz correlation_id 매치 0. Walmart 헤더(`ChannelSync.php:1705`)는 KEEP_SEPARATE |
| Session | **PARTIAL** | `recordSessionMeta`(`UserAuth.php:4243-4251` ip/ua/last_seen) 세션 메타 기록. 전용 세션 trace 인덱스는 순신규 |
| Subject | **PARTIAL** | 감사행 actor/user_id(`UserAuth.php:4159-4168`)·tenant/actor(`SecurityAudit.php:43-53`) 컬럼 존재. subject 조회 인덱스 명시 부재 |
| Resource | **ABSENT** | Resource Trace substrate 부재. resource/dataset/document 축 인덱스 없음 |
| Decision | **ABSENT(authz)** | authz decision 축 인덱스 0. `Decisioning.php:12`·`:36`의 "decision"은 마케팅(KEEP_SEPARATE) |
| Timeline | **PARTIAL** | `SecurityAudit.php:71-83`·`:93-110`(recent·recentByType 테넌트 스코프 조회). Decision Timeline 재구성 인덱스는 순신규 |
| Case | **ABSENT** | Forensic Case Management 부재→case 인덱스 대상 자체 없음 |

## 3. 설계 계약 (항목·기준 — SPEC 근거)

| 인덱스 | 조회 경로 (SPEC) |
|---|---|
| Trace ID(§34·§4) | Distributed Trace 조회. OpenTelemetry 호환 span 트리 탐색 |
| Correlation ID(§5) | Login/Session/Approval/Policy Eval/JIT/SoD/Dynamic Role/API/DB Access 연결 |
| Session/Subject/Resource(§13·§15) | Effective Permission Trace·Identity/Resource Trace 조회 |
| Decision(§12·§22) | Policy Trace·Decision Distribution·Frequent Denials 분석 |
| Timeline(§6) | Request→Context→PDP→PEP→Decision→Enforcement→Audit→Response 재구성 |
| Case(§16·§17) | Forensic Workspace·Case(Open/Investigating/…/Archived) 조회 |

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE**: Walmart correlation_id(`ChannelSync.php:1705`·`:1709`·`:2874`)·마케팅 percentile(`AttributionEngine.php:1522`)·인프라 지표(`SystemMetrics.php:1-60`)의 조회 인덱스는 authz 관측 인덱스와 무관.
- **선행의존**: 인덱스 8종은 대응 substrate(Trace/Correlation/Timeline/Case) 신설 후 성립. 현행은 감사 조회(`SecurityAudit.php:71-83`·`AdminMenu.php:660-702`·`UserAuth.php:4209-4226`)만 존재. Trace/Correlation/Case 전용 인덱스는 ABSENT.

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

**판정 = ABSENT(Trace/Correlation/Resource/Decision/Case 전용 인덱스) / PARTIAL(Session/Subject/Timeline — 감사행·recordSessionMeta 재활용 가능).** 코드 변경 0·NOT_CERTIFIED. Index 전략은 substrate 신설(ADR D-2 trace/correlation 컬럼 확장·D-3 Replay/Twin·Forensic Case)에 종속하며, RP-track 실 구현(선행 Part 1~3-13 인증) 조건이다. 조회 성능 검증(§35 Trace≤200ms)은 실 구현 세션에서 벤치마크한다.
