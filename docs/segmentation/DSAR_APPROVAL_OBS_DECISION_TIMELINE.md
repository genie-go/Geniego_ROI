# DSAR — Authorization Observability & Forensics: 결정 타임라인 (APPROVAL_DECISION_TIMELINE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_DECISION_TIMELINE`은 하나의 인가 결정이 거쳐간 단계를 **시간 순서로 재구성**하는 불변 타임라인이다(SPEC §6). 재구성 단계는 Request → Context → PDP → PEP → Decision → Enforcement → Audit → Response(SPEC §6)이며, **Timeline은 Immutable하다**(SPEC §6 명시). 결정 타임라인은 상관(§5) 결과를 시간축으로 정렬하여 "결정이 어떤 순서로 이루어졌는가"를 답한다(SPEC §0).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Part3-14 요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| Decision Timeline 재구성 | **ABSENT** | Correlation Engine/Decision Timeline authz 부재. `auth_audit_log`는 flat append(`UserAuth.php:4190`)로 단계 순서 없음(GT② §2) |
| 불변(Immutable) substrate | **PRESENT(SecurityAudit)** | `SecurityAudit.php:14-33` append-only(UPDATE/DELETE 코드경로 전무)·`:56-68` verify broken_at(GT① §A) |
| 타임라인 조회 원천 | **PARTIAL** | `SecurityAudit.php:71-83`·`:93-110`(recent/recentByType 테넌트 스코프 조회)=부분 Query Timeline(GT① §A) |
| 단계별 컨텍스트 스냅샷 | **PARTIAL** | `recordSessionMeta`(`UserAuth.php:4243-4251`) ip/ua만·**결정 컨텍스트 스냅샷 없음**(GT② §2 §11) |
| PDP/PEP 단계 결정 이벤트 | **ABSENT** | Policy/Permission/Session/Resource Trace 전부 grep 0(GT② §2) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변/테넌트격리)

| 항목 | 계약 |
|---|---|
| 타임라인 단계 | Request·Context·PDP·PEP·Decision·Enforcement·Audit·Response 8단계 순차 기록(SPEC §6) |
| 불변성 | Timeline은 Immutable(SPEC §6). Immutable Event Store(SPEC §18) 위에서 append-only·Time-order Validation(SPEC §33) |
| 무결성 | Hash Chain Integrity·Snapshot Integrity DB 제약(SPEC §33). SecurityAudit verify(`:56-68`) 패턴으로 검증 |
| 저장 | Snapshot에 Timeline 저장(SPEC §25). 재구성 ≤ 5초(SPEC §35) |
| 테넌트 격리 | Tenant Isolation DB 제약(SPEC §33)·`Compliance.php:176` fail-closed 재사용 |
| API | Query Timeline(SPEC §32)·Index: Timeline(SPEC §34) |

## 4. KEEP_SEPARATE (Walmart correlation_id·마케팅 흡수금지)

| 동음이의 | 실체 | 근거(파일:라인) |
|---|---|---|
| ★correlation_id | Walmart 외부 API 헤더 — 타임라인 상관키 아님 | `ChannelSync.php:1705`·`:2874`·`:3467`(GT② §5 B-1) |
| 마케팅 trace/decision | touch trace·ingestAdInsights("decision"≠authz) | `Attribution.php`·`Decisioning.php:12`·`:36`(GT② §5 B-2) |
| 인프라 헬스 타임라인 | 모듈 latency/uptime/error_rate | `SystemMetrics.php:1-60`(GT② §5 B-3) |
| ops 운영 감사 | audit_log(ops/growth 액션·테넌트 스코프 배제) | `Compliance.php:176-187`(GT② §5 B-4) |

authz Decision Timeline은 위 마케팅/인프라/ops 타임라인과 **분리 유지**(ADR D-8).

## 5. 판정 (NOT_CERTIFIED · ABSENT-순신규 · 선행의존)

- **판정**: **ABSENT(순신규)**. 8단계 결정 타임라인 재구성은 부재. 유일 재활용 앵커는 SecurityAudit append-only 해시체인(`SecurityAudit.php:14-68`)이며 여기에 단계·컨텍스트 스냅샷을 확장(ADR D-1·D-2).
- **재활용(참조/확장)**: SecurityAudit→Immutable Event Store 승격(ADR D-1)·recordSessionMeta(`UserAuth.php:4243-4251`)→결정 컨텍스트 스냅샷 확장(ADR §3.5)·recent/recentBytype 조회(`:71-83`·`:93-110`) 재사용.
- **선행 의존**: PDP(3-12)·PEP·Zero Trust(3-13) 결정 이벤트가 타임라인 입력(ADR D-6). Part 1~3-13 인증 후 실 구현(BLOCKED_PREREQUISITE).
- **코드 변경 0 · NOT_CERTIFIED**. Immutable은 SecurityAudit 실측(UPDATE/DELETE 전무)으로만 담보되며 auth/menu 감사는 격차(정직 분리·ADR D-8).
