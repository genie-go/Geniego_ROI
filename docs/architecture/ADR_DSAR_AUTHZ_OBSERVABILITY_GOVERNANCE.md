# ADR — Authorization Observability & Forensics Governance Foundation

- **Status**: PROPOSED · NOT_CERTIFIED · BLOCKED_PREREQUISITE (설계 명세 · 코드 변경 0)
- **EPIC**: 06-A-03-02-03-04 Part 3-14
- **Date**: 2026-07-20
- **상위 SPEC**: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md` (canonical 원문 verbatim · Version 1.0)
- **Ground-Truth**: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
- **선행 계보**: Part 1~3-12 · **3-13(Zero Trust)** · ★3-2-03-02-03-02 Hash Chain 계보

---

## 1. Context

GeniegoROI는 인가·보안 액션을 감사하나(SecurityAudit 해시체인·auth_audit_log·menu_audit_log·access_review_item), 이는 **단순 append 감사 로그**이지 **관측성(Observability)·포렌식(Forensics) 플랫폼**이 아니다. 분산추적(OpenTelemetry·trace/correlation/span)·결정 재현(Decision Replay)·시점 복원(Digital Twin·time-travel)·상관 엔진·결정 타임라인·인가 텔레메트리(P95/P99)·트레이스 분석·포렌식 케이스 관리·**보관연속성(Chain of Custody)/보존/legal-hold**는 부재하다. "왜 이 요청이 허용/거부되었는가"를 사후 재현·설명할 구조가 없다.

본 ADR은 **Authorization Observability & Forensics** — 인가 결정을 분산추적·상관·재현하고 Authorization Digital Twin으로 시점 복원하며 증거체인·보관연속성으로 법정 수준 포렌식을 제공하는 플랫폼 — 의 거버넌스 기반을 정의한다. ISO 27037/NIST SP 800-61·800-92 참조. Part 3-12 PDP/3-13 Zero Trust의 결정·신뢰신호가 관측 대상이다.

## 2. Ground-Truth 판정 (2 스레드 상호검증)

### 2.1 실존 substrate (GT①)
- **SecurityAudit 해시체인(PRESENT·유일 tamper-evident)**: `SecurityAudit.php:14-33`(append-only)·`:56-68`(verify broken_at)·`:25-27`(prev→sha256). Immutable Event Store + Evidence Chain 앵커.
- **감사 3종(PARTIAL)**: auth_audit_log(`UserAuth.php:4174-4197`·해시체인 없음·평문 detail)·menu_audit_log(`AdminMenu.php:169-212`·verify 부재)·access_review_item(`AccessReview.php:62-81`·증거참조 선례).
- **SIEM/집계(PRESENT)**: `Compliance.php:143-190`(collectAuditEvents 3소스)·`:430-461`(forwardEvent).
- **Runtime Context(PARTIAL)**: `recordSessionMeta`(`UserAuth.php:4243-4251`·결정 컨텍스트 스냅샷 없음).

### 2.2 거버넌스 계층 (GT②)
Distributed Trace(OTel·composer 의존성 0)·Correlation·Timeline·Replay·Digital Twin·Policy/Permission/Session/Resource Trace·Authz Telemetry·Trace Analytics·Forensic Case·**Chain of Custody/Retention/Legal-hold**·Runtime Guard/Static Lint(trace) = **grep 0(authz)**.

### 2.3 종합
**판정 = ABSENT-forensics / PARTIAL-audit / PRESENT-hashchain.** ★부수발견=custody 단절(auditExport 미기록·`Compliance.php:265-300`).

## 3. Decision

### D-1. SecurityAudit를 Immutable Event Store로 승격 (Extend, 대체 아님)
`SecurityAudit`(`SecurityAudit.php:14-68`)의 append-only 해시체인·verify를 Authorization Event Store(§18 append-only/immutable/versioned/cryptographic integrity)의 기반으로 승격. 신규 forensics 증거는 흡수 아닌 **참조**로 연결(AccessReview `:225` 선례). Evidence Chain(§9)은 이 해시체인 위에 assignment/approval/policy/decision을 연결.

### D-2. 감사행에 trace/correlation/decision-context 확장
현 감사 스키마(`UserAuth.php:4165` detail 평문)에 Authorization Event Model(§3: Event/Correlation/Trace/Span ID·Policy/Role/Permission/Context Version·Risk/Trust Score) 컬럼을 신설. auth_audit_log/menu_audit_log의 무결성 격차를 SecurityAudit verify(`:56-68`) 패턴으로 확산. OpenTelemetry 호환(§4).

### D-3. Decision Replay/Digital Twin은 순신규 (read-only·time-travel)
과거 시점 effective permission(현행 `TeamPermissions.php:236` effectiveScope는 현재상태만)을 이벤트 스토어로부터 재구성하는 Replay Engine(§8·read-only simulation)·Digital Twin(§7·time-travel) 신설. 실 리소스 접근 없이 재현.

### D-4. Chain of Custody/보존/Legal-hold 신설 (custody 단절 해소)
증거 생성/접근/복사/export/보존/폐기를 불변 기록하는 Chain of Custody(§10) 신설. ★현행 custody 단절(`auditExport` 자기 미기록·`Compliance.php:265-300`)을 설계로 해소(siemPush `:508`가 이미 반출 logAudit — 그 패턴 일반화). Retention/Legal-hold 정책 신설.

### D-5. Log Aggregation·SIEM은 재사용
Log Aggregation(§21)·Telemetry forward는 `Compliance::collectAuditEvents`(`:143-190`·3소스 통합)·`forwardEvent`(`:430-461`) 재사용·확장(대체 금지). Authz Telemetry(§19 P95/P99)는 순신규(현행 authz decision latency 미수집).

### D-6. Part 1~3-13과의 관계 (관측 대상·무중복)
Observability는 PDP(3-12)·SoD(3-10)·JIT(3-9)·Zero Trust(3-13)의 결정·이벤트를 **관측·기록**한다. 각 엔진 재구현 금지. Forensic 질문("왜 허용/거부")은 3-12 Decision Evidence·3-13 Trust Evidence를 상관·재현.

### D-7. Runtime Guard·테넌트 격리
Trace tampering/Event deletion/Evidence modification/Chain break 차단(§28)은 SecurityAudit append-only(UPDATE/DELETE 부재)+verify 위에 신설. 테넌트 격리(`Compliance.php:176` fail-closed) 재사용.

### D-8. 정직 분리
- **실재 과신 회피**: SecurityAudit만 tamper-evident(auth/menu는 격차). 감사=단순 로그이지 trace/replay/twin 아님. recordSessionMeta는 세션 컨텍스트만(결정 컨텍스트 아님).
- **부재 과장 회피**: Distributed Trace/Replay/Digital Twin/Correlation/Forensic Case/Chain of Custody grep 0은 실측 부재(그린필드).
- **오흡수 회피**: Walmart correlation_id(`ChannelSync.php:1705`)·마케팅 attribution/percentile·인프라 SystemMetrics·ML/데이터 lineage·ops audit_log는 authz observability 아님(GT② §5).
- **갭≠결함**: custody 단절(auditExport)은 신설 갭 근거·설계만·수정 아님·재플래그 금지.

## 4. Consequences

- **긍정**: 인가 결정 완전 추적·재현·설명·법정 수준 포렌식·증거 무결성·규제준수(ISO 27037/NIST 800-61·92). "왜 허용/거부" 즉답.
- **비용**: 신규(Distributed Trace·Correlation·Timeline·Replay·Digital Twin·Trace 6종·Forensic Case·Chain of Custody·Immutable Event Store 승격·Telemetry·Trace Analytics·Guard/Lint). 감사 스키마 확장·OTel 계측.
- **선행 의존**: Part 1~3-13 인증 후 실 구현(BLOCKED_PREREQUISITE). PDP(3-12)/Zero Trust(3-13) 이벤트가 관측 대상.
- **무후퇴**: SecurityAudit·감사 3종·SIEM/집계·recordSessionMeta·마케팅/인프라 관측 유지·병행. Extend-only·참조.

## 5. Compliance / Certification

- **NOT_CERTIFIED**: 코드 변경 0. SPEC은 사용자 제공 canonical 원문 verbatim(Version 1.0).
- 하위 per-entity DSAR은 본 ADR + GT①② 등장 `파일:라인`만 인용(반날조).
- Completion Gate·Performance(Event Ingestion≥1M/s·Trace≤200ms)·Digital Twin/Replay Validation·Regression은 실 구현 세션(RP-track) 조건.

---
**요약**: Observability/Forensics = ABSENT-forensics(Distributed Trace·Correlation·Timeline·Replay·Digital Twin·Trace 6종·Telemetry·Trace Analytics·Forensic Case·Chain of Custody·Retention/Legal-hold·Guard/Lint 순신규) / PARTIAL(auth/menu audit·recordSessionMeta) / PRESENT(SecurityAudit 해시체인=유일 tamper-evident 앵커·SIEM/집계·access_review 증거). Extend: SecurityAudit→Immutable Event Store 승격·감사행 trace/correlation/decision-context 확장·verify 확산·Replay/Twin 신설·Chain of Custody 신설(custody 단절 해소)·SIEM/집계 재사용·Part1~3-13 관측(무중복). 코드0·NOT_CERTIFIED·선행의존. **Walmart correlation_id·마케팅 attribution·인프라 SystemMetrics 흡수 금지·custody 단절=갭≠결함.**
