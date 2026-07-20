# DSAR — Authorization Observability & Forensics: 정적 린트 (Part 3-14 §29)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §29는 코드/스키마 정적 분석으로 관측성 결함을 CI 단계에서 탐지하는 **6종 린트 규칙**을 규정한다: Missing Trace · Missing Correlation ID · Missing Replay Metadata · Mutable Event Store · Missing Hash Chain · Missing Timestamp. 런타임 가드(§28)가 실행 시점 방어라면, Static Lint는 인가 경로에 관측 계측(instrumentation)이 누락된 채 병합되는 것을 사전 차단한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 린트 규칙(§29) | 판정 | 근거(GT) |
|---|---|---|
| Missing Hash Chain(해시체인 누락 탐지) | **PARTIAL 기준존재** | 기준선 = `SecurityAudit.php:25-27`(prev→sha256)·verify `:56-68`. 위반 실측: auth_audit_log 해시체인 없음(`UserAuth.php:4174-4197`)·menu_audit_log verify 부재(`AdminMenu.php:169-212`) |
| Missing Timestamp(타임스탬프 누락 탐지) | **PARTIAL 기준존재** | 감사 스키마에 at/timestamp 존재(`UserAuth.php:4159-4168`·`SecurityAudit.php:43-53`). Event Model §3 UTC 요구 대비 검증기 자체는 부재 |
| Mutable Event Store(가변 스토어 탐지) | **PARTIAL 기준존재** | 기준 = append-only(`SecurityAudit.php:14-33` UPDATE/DELETE 부재). 위반 탐지 린트 자체 순신규 |
| Missing Trace(트레이스 누락 탐지) | **ABSENT** | trace_id/span_id 컬럼 0(`auth_audit_log` `UserAuth.php:4165`에 trace 컬럼 없음·GT②§2). 린트 순신규 |
| Missing Correlation ID(상관 ID 누락 탐지) | **ABSENT** | authz correlation_id grep 0(GT②§2). 히트는 Walmart 외부헤더뿐(KEEP_SEPARATE §4) |
| Missing Replay Metadata(재현 메타 누락 탐지) | **ABSENT** | Decision Replay 경로 없음(GT②§2)→replay 메타 계측 자체 순신규 |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

- **L-1 Missing Hash Chain**: append-only 감사 테이블에 prev_hash/hash_chain 컬럼 부재를 위반으로 판정. 기준 = `SecurityAudit.php:25-27`. 실측 위반 대상 = auth_audit_log(`UserAuth.php:4174-4197`)·menu_audit_log verify 부재(`AdminMenu.php:169-212`)를 ADR D-2 확산 대상으로 등록.
- **L-2 Mutable Event Store**: 이벤트 스토어 코드에 UPDATE/DELETE 경로 발견 시 위반. 기준 = `SecurityAudit.php:14-33`.
- **L-3 Missing Trace / Correlation ID**: 인가 결정 경로(PDP/PEP)가 Event Model(§3) Trace/Span/Correlation ID 없이 기록 시 위반. 현행 flat append(`UserAuth.php:4190`)가 대상.
- **L-4 Missing Replay Metadata**: 이벤트가 read-only 재현(§8)에 필요한 policy/context version(§3) 미포함 시 위반.
- **L-5 Missing Timestamp**: UTC timestamp(§3) 누락 시 위반. time-order validation(§33) 전제.
- **L-6 CI 게이트**: 위 규칙은 Completion Gate(§37) 조건이며 Static Lint 통과가 병합 전제.

## 4. KEEP_SEPARATE (마케팅/인프라 관측 흡수금지)

- **Walmart correlation_id**(`ChannelSync.php:1705`·`:1709`·`:2874`·`:2878`·`:3467`·`:3471`)는 외부 API 헤더 — Missing Correlation ID 린트 대상 아님(GT②§5 B-1·오인 최다).
- **마케팅 trace**(`Attribution.php` attribution_touch·`AttributionEngine.php:1522`·`:1546`·`:1553`)·**인프라**(`SystemMetrics.php:1-60`)·ML(`ModelMonitor.php`)·데이터 lineage(`DataPlatform.php`)는 Missing Trace 린트 범위 밖(GT②§5 B-2/B-3). 흡수·개명 금지.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **재활용(기준선)**: Missing Hash Chain·Mutable Event Store·Missing Timestamp 린트는 SecurityAudit(`:14-33`·`:25-27`·`:43-53`·`:56-68`)를 정합 기준으로 삼는다.
- **ABSENT(순신규)**: Missing Trace·Missing Correlation ID·Missing Replay Metadata 린트 substrate 전무(그린필드).
- **위반 실측**: auth_audit_log 해시체인 없음·menu_audit_log verify 부재는 린트가 등록할 기존 격차(수정 아님·ADR D-2 확산 후보).
- **선행의존**: Part 1~3-13 인증 후 실 구현(BLOCKED_PREREQUISITE). 코드 변경 0 · NOT_CERTIFIED.
