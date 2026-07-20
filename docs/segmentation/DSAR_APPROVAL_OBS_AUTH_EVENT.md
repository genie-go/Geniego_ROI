# DSAR — Authorization Observability & Forensics: 인가 이벤트 (APPROVAL_AUTH_EVENT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AUTH_EVENT`는 SPEC §3(Authorization Event Model)이 규정하는 **모든 인가 이벤트의 정규 스키마**다. 최소 필드: Event ID·Correlation ID·Trace ID·Span ID·Parent Span ID·Timestamp(UTC)·Tenant·Subject·Resource·Action·Decision·Policy Version·Effective Role Version·Effective Permission Version·Runtime Context Version·Risk Score·Trust Score (SPEC §3 열거 전체).

- SPEC §1(구현 목표 4번 "Authorization Event Bus")·§2(`APPROVAL_AUTH_EVENT`)의 원자 단위.
- 로그인·세션·승인·정책평가·JIT·SoD·동적역할·API·DB접근(SPEC §5)이 발생시키는 이벤트를 이 스키마로 정규화.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §3 필드군 | 판정 | 근거(파일:라인) |
|---|---|---|
| 감사 이벤트 기록 substrate(at/user_id/actor/role/tenant/action/detail/ip/ua/risk) | **PARTIAL** | `UserAuth.php:4159-4168`·`:4165`(ensureAuditSchema·detail TEXT 평문)·`:4174-4197`(audit single INSERT) — GT① §2.B |
| Event ID / Correlation ID / Trace ID / Span ID / Parent Span ID | **ABSENT** | GT② §2 "auth_audit_log(`UserAuth.php:4165`)에 trace/correlation/request_id 컬럼 없음" · `UserAuth.php:4190`(flat append) |
| Decision / Policy·Role·Permission·Context Version | **ABSENT** | GT② §2 "login→session→approval→decision 연결키 부재" · detail 평문(구조화 아님) |
| Tenant·Subject·Action·Risk | **PARTIAL** | `UserAuth.php:4165`(tenant_id/actor/action/risk 컬럼 존재)·평문 detail로 나머지 미구조화 |
| tamper-evident 앵커 | **PRESENT(별도 substrate)** | `SecurityAudit.php:14-33`·`:25-27`(prev→sha256) — auth_audit_log 자체는 해시체인 없음(`UserAuth.php:4193-4195`) |

★핵심 격차: auth_audit_log의 `detail`은 **평문 문자열**(`UserAuth.php:4165`)이라 구조화 trace 아님이며, **해시체인이 없어 tamper-evident 아님**(`UserAuth.php:4193-4195` — high-risk시 forwardEvent 훅만 존재).

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **스키마 확장**(ADR D-2): 현 감사 스키마(`UserAuth.php:4165` detail 평문)에 SPEC §3의 Event/Correlation/Trace/Span ID·Policy/Role/Permission/Context Version·Risk/Trust Score **컬럼 신설**. OpenTelemetry 호환(SPEC §4).
- **무결성**: auth_audit_log의 해시체인 부재를 `SecurityAudit.php:56-68`(verify broken_at) 패턴으로 확산(ADR D-2). Immutable Event(SPEC §33).
- **불변**: Append Only·Immutable·Cryptographic Integrity(SPEC §18) — SecurityAudit append-only(UPDATE/DELETE 부재) 위에 신설.
- **테넌트 격리**: `Compliance.php:176`(fail-closed) 재사용. Subject/Tenant 필드는 테넌트 경계 강제.
- **Error/Warning**: `EVENT_CORRUPTED`·`EVENT_FORGERY`(SPEC §30·§36 Security)·`Event Delay`(§31)를 이벤트 계약에 포함.

## 4. KEEP_SEPARATE (흡수 금지)

- **Walmart correlation_id**: `ChannelSync.php:1705`·`:1709`·`:2874`·`:2878`·`:3467`·`:3471`(`WM_QOS.CORRELATION_ID`) — SPEC §3 "Correlation ID"와 동명이인·외부 API 헤더. Auth Event Correlation ID로 흡수 금지(GT② §5 B-1·최다 오인).
- **마케팅 "decision"**: `Decisioning.php:12`·`:36`(ingestAdInsights) — authz Decision 필드 아님(GT② §5 B-2).
- **ops audit_log**: `Compliance.php:176-187`(운영 액션·`:177`) — collectAuditEvents가 통합하나 테넌트 스코프 명시 배제(`:176`). Auth Event 소스 아님(GT② §5 B-4).

## 5. 판정

- **NOT_CERTIFIED · BLOCKED_PREREQUISITE**: Auth Event Model = **PARTIAL**(감사 substrate 존재하나 평문·비구조화·해시체인 없음). SPEC §3 트레이스 필드(Event/Correlation/Trace/Span ID·Version 축·Trust Score)는 **ABSENT(순신규)**.
- **재활용/ABSENT**: 확장 대상=`UserAuth.php:4159-4197`(auth_audit_log)·무결성 확산=`SecurityAudit.php:56-68`. Trace/Correlation/Span·Version·Decision 구조화는 순신규.
- **선행 의존**: Policy/Role/Permission Version은 Part 1~3-13(Role/Permission/PDP) 인증 후 값 존재. 그전엔 컬럼 계약만 확정.
