# DSAR — Authorization Observability & Forensics: 세션 추적 (APPROVAL_SESSION_TRACE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_SESSION_TRACE`(SPEC §2·§14, "Session Trace")는 인증 세션의 **생애주기 이벤트를 6단계로 기록**한다. SPEC §14 규정:

| SPEC §14 이벤트 | 의미 |
|---|---|
| Session 생성 | 세션 개시(로그인 성공) |
| MFA | 다요소 인증 이벤트 |
| Token Refresh | 토큰 재발급 |
| Context Change | 세션 컨텍스트 변경(IP/디바이스/네트워크) |
| Step-up Authentication | 승급 인증(고위험 액션 재인증) |
| Session 종료 | 로그아웃/만료 |

목적은 SPEC §0의 "어떤 Runtime Context가 영향을 주었는가"에 세션 흐름 단위로 답하는 것이다(Correlation Engine §5의 Login/Session 연결 대상).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §14 이벤트 | 판정 | 근거(GT 인용) |
|---|---|---|
| Context(ip/ua/last_seen) 기록 | **PARTIAL** | `recordSessionMeta`(`UserAuth.php:4243-4251` ip/ua/last_seen)=세션 컨텍스트만·**결정 컨텍스트 스냅샷 없음**(GT① §E·GT② §2) |
| Session 생성/종료·MFA 감사행 | **PARTIAL(평문·비구조화)** | `audit`(`UserAuth.php:4174-4197`)·detail 평문 TEXT(`:4165`)·해시체인 없음(tamper-evident 아님, GT① §B). 인증·보안 액션 로깅 호출부 `UserAuth.php:870`·`:994`·`:998`·`:2019`·`:2137`·`:2386` |
| Token Refresh/Context Change/Step-up **구조화 이벤트** | **ABSENT** | 구조화 session trace grep 0(GT② §2 "Session Trace = ABSENT"). MFA/step-up/refresh를 세션 상관 이벤트로 구조화한 substrate 전무 |
| 무결성 앵커(재활용) | **PRESENT** | `SecurityAudit.php:14-68`(append-only+verify)=유일 tamper-evident. 세션 증거를 이 위에 참조(`AccessReview.php:225` 선례) |

★핵심 격차: 세션 메타는 **현재 ip/ua 스냅샷**(`UserAuth.php:4243-4251`)만 있고, MFA·step-up·token refresh·context change를 **하나의 Correlation ID로 묶는 세션 타임라인이 없다**.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**(SPEC §3 + §14 + §11 Runtime Context): Event/Correlation/Trace/Span ID·Subject·`session_event`(create/mfa/token_refresh/context_change/step_up/terminate)·Device·Network·Browser·IP·Region·**MFA Status**·Trust Score·Runtime Context Version.
- **상관(Correlation)**: 동일 Correlation ID로 Login→Session→Approval 연결(SPEC §5). `recordSessionMeta`를 결정 컨텍스트 스냅샷으로 확장(ADR D-2).
- **불변성·무결성**: Immutable Event Store(SPEC §18)에 append·`SecurityAudit` 해시체인(`SecurityAudit.php:25-27`)에 참조·auth_audit_log 무결성 격차를 `verify`(`:56-68`) 패턴으로 보완(ADR D-2).
- **테넌트 격리**: fail-closed(`Compliance.php:176`) 재사용.
- **오류/경고 계약**(SPEC §30·§31): `TRACE_NOT_FOUND`·`Trace Fragmented`.

## 4. KEEP_SEPARATE (마케팅 trace 흡수금지)

- **인프라 세션/헬스 지표** — `SystemMetrics.php:1-60`(모듈 latency/uptime/error_rate)은 인프라 헬스(GT② §5 B-3), authz 세션 이벤트 아님. 흡수 금지.
- **마케팅 touch/decision** — `AttributionEngine.php:1522`·`Decisioning.php:12`의 세션·터치 개념은 마케팅 도메인(GT② §5 B-2). KEEP_SEPARATE.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = PARTIAL(세션 컨텍스트 ip/ua·평문 감사행) / ABSENT(MFA/step-up/refresh 구조화 세션 trace·Correlation ID 상관)**. 세션 타임라인 순신규.
- **재활용(흡수 아님·참조/확장)**: `recordSessionMeta`(`UserAuth.php:4243-4251`→결정 컨텍스트 확장, ADR D-2)·`audit`(`UserAuth.php:4174-4197`·감사 호출부 6개소)·`SecurityAudit.php:14-68`(앵커·verify 확산)·`Compliance.php:176`(격리).
- **선행 의존**: BLOCKED_PREREQUISITE — Zero Trust(3-13) 신뢰신호·MFA/step-up 결정이 관측 대상(ADR D-6, 재구현 금지). 실 엔진은 Part 1~3-13 인증 후 RP-track. 코드 변경 0 · NOT_CERTIFIED.

---
### file:line 인용 목록 (전체)
`UserAuth.php:4243-4251` · `UserAuth.php:4174-4197` · `UserAuth.php:4165` · `UserAuth.php:870` · `UserAuth.php:994` · `UserAuth.php:998` · `UserAuth.php:2019` · `UserAuth.php:2137` · `UserAuth.php:2386` · `SecurityAudit.php:14-68` · `SecurityAudit.php:25-27` · `SecurityAudit.php:56-68` · `AccessReview.php:225` · `Compliance.php:176` · `SystemMetrics.php:1-60` · `AttributionEngine.php:1522` · `Decisioning.php:12`
