# DSAR — Authorization Observability & Forensics: 이벤트 상관 엔진 (APPROVAL_EVENT_CORRELATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_EVENT_CORRELATION`은 인가 플랫폼 전역에서 발생하는 이벤트를 **동일 Correlation ID 기반으로 연결**하는 상관 엔진이다(SPEC §5). 상관 대상은 Login·Session·Approval·Policy Evaluation·JIT Elevation·SoD Evaluation·Dynamic Role Evaluation·API Request·Database Access(SPEC §5)이며, Authorization Event Model(SPEC §3)의 Correlation ID·Trace ID·Span ID·Parent Span ID를 연결키로 사용한다. 목적은 "왜 이 요청이 허용/거부되었는가"를 단일 상관 흐름으로 재구성하는 것이다(SPEC §0).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Part3-14 요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| Correlation Engine 자체 | **ABSENT(grep 0)** | login→session→approval→decision 연결키 부재(GT② §2). trace_id/correlation_id/span_id authz 매치 0(GT② §1) |
| 상관 연결키(Correlation/Trace/Span ID) | **ABSENT** | `auth_audit_log`(`UserAuth.php:4165`)에 trace/correlation/request_id 컬럼 없음(GT② §2) |
| 이벤트 substrate(flat append) | **PARTIAL** | `auth_audit_log`는 flat append(`UserAuth.php:4190`)·single INSERT(`UserAuth.php:4174-4197`). 이벤트 간 상관 없음 |
| 상관 앵커 재활용 후보 | **PRESENT** | `SecurityAudit.php:14-68` 해시체인(유일 tamper-evident 앵커). 상관은 이 위에 신설·참조(GT① §A) |
| 중앙 이벤트 집계 | **PRESENT** | `Compliance.php:143-190`(collectAuditEvents 3소스 통합)=상관 입력원 재사용 가능 |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변/테넌트격리)

| 항목 | 계약 |
|---|---|
| 연결키 | Correlation ID(필수)·Trace ID·Span ID·Parent Span ID(SPEC §3). 단일 요청 흐름 전역 전파(SPEC §4 OTel 호환) |
| 상관 범위 | Login·Session·Approval·Policy Evaluation·JIT·SoD·Dynamic Role·API Request·Database Access(SPEC §5) |
| 불변성 | 상관 이벤트는 Immutable Event Store(SPEC §18 Append Only·Cryptographic Integrity) 위에서만 append. 삭제/변경 불가 |
| 테넌트 격리 | 상관 조회는 테넌트 스코프 강제(`Compliance.php:176` fail-closed 패턴 재사용·ADR D-7) |
| 확장 방식 | 감사행에 trace/correlation/decision-context 컬럼 신설(ADR D-2). SecurityAudit verify(`SecurityAudit.php:56-68`) 패턴 확산 |
| Lint | Missing Correlation ID 정적 탐지(SPEC §29) |

## 4. KEEP_SEPARATE (Walmart correlation_id·마케팅 흡수금지)

| 동음이의 | 실체 | 근거(파일:라인) |
|---|---|---|
| ★`correlation_id`(오인 최다) | Walmart Marketplace 외부 API 헤더(`WM_QOS.CORRELATION_ID`) — authz 상관 아님 | `ChannelSync.php:1705`·`:1709`·`:2874`·`:2878`·`:3467`·`:3471`(GT② §5 B-1) |
| 마케팅 decision | `ingestAdInsights`("decision"≠authz 결정) | `Decisioning.php:12`·`:36`(GT② §5 B-2) |
| 마케팅 trace | 멀티터치 touch trace(`attribution_touch`) | `Attribution.php`(GT② §5 B-2) |
| 인프라 관측성 | 모듈 latency/uptime=인프라 헬스 | `SystemMetrics.php:1-60`(GT② §5 B-3) |

authz observability의 correlation은 위 벤더/마케팅/인프라 식별자를 **개명·흡수하지 않는다**(ADR D-8).

## 5. 판정 (NOT_CERTIFIED · ABSENT-순신규 · 선행의존)

- **판정**: **ABSENT(순신규·grep 0)**. Correlation Engine은 그린필드이며, 상관 연결키·상관 범위 연결 전부 신설 대상이다(GT② §2, ADR §2.2).
- **재활용(흡수 아님·참조/확장)**: SecurityAudit 해시체인(`SecurityAudit.php:14-68`)을 상관 앵커로, 감사 3종에 correlation/trace 컬럼 확장(ADR D-2), Compliance 집계(`:143-190`) 입력 재사용.
- **선행 의존**: Part 1~3-13 인증 완료 후 실 구현(BLOCKED_PREREQUISITE). PDP(3-12)·JIT(3-9)·SoD(3-10)·Zero Trust(3-13)의 이벤트가 상관 대상(ADR D-6).
- **코드 변경 0 · NOT_CERTIFIED**. custody 단절(`Compliance.php:265-300`)은 갭 근거이지 수정 대상 아님.
