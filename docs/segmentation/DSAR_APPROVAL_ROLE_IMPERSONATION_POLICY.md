# DSAR — Approval Role Impersonation Policy (per-entity 설계 명세)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 실 엔진은 선행 Permission Engine 실구현 + 별도 승인세션)
- **상위 ADR**: [`../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **ⓑ GROUND_TRUTH**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **★범위 경계**: **Impersonation Policy(대리 세션 정책 계약)만**. 실 대리 세션·집행은 별도. 여기서는 impersonation의 **허용·세션 결합·민감/승인 액션 제한·증거 정책**만 설계한다.

> **반날조 규율**: `파일:라인`은 위 2문서에서 확인된 것만 인용. 확인 불가 substrate는 **ABSENT**. Role ≠ Permission ≠ Authority. Delegation(권한 위임)과 Impersonation(대리 세션)은 별개. 289차 확정분(impersonated_by 보존 P4) 재플래그 금지.

---

## ① 목적

Approval Role 맥락에서의 **Impersonation(대리 세션)** 정책 계약을 정의한다. 관리자/지원 인력이 다른 사용자를 대리(impersonate)할 때 **세션 결합·민감 액션 제한·승인 액션 제한·증거**를 강제하는 정책 스키마를 세운다. **High-risk Approval Role의 무제한 Impersonation은 금지**한다. 현행 회원세션 impersonation 실체(`user_session.impersonated_by`, 289차 P4 보존)는 존재하나 **본 Part의 2개 GROUND_TRUTH 문서에는 file:line이 없다**(Role Registry 전수조사 범위 밖). 본 정책은 대리 세션의 강화 통제만 규정하고, **실 세션 로직은 변경하지 않는다**(Foundation only).

## ② Canonical 필드

| 필드 | 의미 |
|---|---|
| `impersonation_allowed` | 대리 세션 허용 여부 |
| `session_binding_required` | 세션 결합 필수(원 actor 신원 보존·`impersonated_by` 유지) |
| `sensitive_action_restriction` | 대리 중 민감 액션 제한 |
| `approval_action_restriction` | 대리 중 승인/의결 액션 제한(대리자가 승인권 대행 금지) |
| `evidence_required` | 대리 시작·종료·수행 액션 증거 캡처 필수 |

## ③ 열거형

- **SessionBinding**: `REQUIRED`(원 actor `impersonated_by` 보존 필수) — 미결합 impersonation 금지
- **SensitiveActionPolicy**: `BLOCK` · `REQUIRE_STEP_UP` · `LOG_ONLY`(민감도 낮음만)
- **ApprovalActionPolicy**: `BLOCK`(기본 — 대리 중 승인 대행 금지) · `RESTRICT`
- **ImpersonationRiskGate**: `LOW` · `MEDIUM` · `HIGH`(무제한 impersonation 금지) · `CRITICAL`(impersonation 금지)

## ④ substrate 매핑 (§5.2)

| Canonical 정책 요소 | 현행 substrate | §5.2 분류 | file:line |
|---|---|---|---|
| impersonation 대상 Role 판정 | `team_role` / `admin_level` | CANONICAL_ROLE_REGISTRY_CANDIDATE / SUB_ROLE_CANDIDATE | `UserAuth.php:188` · `UserAdmin.php:43-46` |
| **회원세션 impersonation(`user_session.impersonated_by`)** | 289차 P4 보존 — **본 2문서 내 file:line 없음** | 참조·보존 | ABSENT (Role Registry 전수조사 범위 밖) |
| session binding / 원 actor 신원 보존 | (impersonated_by 개념=참조) | 참조 | ABSENT |
| sensitive_action_restriction | — | ABSENT | ABSENT |
| approval_action_restriction | — | ABSENT | ABSENT |
| impersonation evidence | auth_audit_log(변경 로그만) | PARTIAL | ⓑ §3 |

**정직한 부재**: 회원세션 impersonation은 289차 P4에서 `impersonated_by` 보존으로 확정된 실체이나, **본 Part의 2개 GROUND_TRUTH 문서(ADR·Role Registry 전수조사)에는 해당 file:line이 포함되지 않았다**. 반날조 규율에 따라 substrate 매핑을 **ABSENT**로 표기하고 개념만 참조한다. 실 file:line 검증은 별도 세션(RP-002) 소관.

## ⑤ 설계원칙

1. **High-risk Approval Role 무제한 Impersonation 금지** — `ImpersonationRiskGate` HIGH/CRITICAL은 impersonation 불가 또는 강화 통제(step-up). 무제한 대리 금지.
2. **세션 결합·원 actor 신원 보존 필수** — `session_binding_required`. 대리 세션은 반드시 원 actor를 `impersonated_by`로 보존(289차 P4)하여 감사 추적 가능. 신원 소실 impersonation 금지.
3. **대리 중 승인 액션 제한** — `approval_action_restriction` 기본 BLOCK. 대리자가 impersonation을 통해 승인/의결 권한을 대행하면 Maker-Checker·SoD 우회이므로 차단.
4. **민감 액션 제한** — `sensitive_action_restriction`으로 대리 중 고위험 액션은 차단 또는 step-up.
5. **Delegation과 구분** — Impersonation(대리 세션·타인 신분 수행)은 Delegation(권한 위임·자기 신분 유지)과 별개 개념이다. 각기 별도 정책 문서로 통제.
6. **★실 세션 로직 변경 안 함·Golden Rule·무후퇴** — 본 Part는 impersonation **정책 스키마만**. 289차 `impersonated_by` 보존(P4)을 참조·보존하며 무력화하지 않고, 실 세션 집행 변경은 별도 승인세션.

## ⑥ Gap

| 능력 | 상태 | 근거 |
|---|---|---|
| impersonation session binding(정책화) | ABSENT | 2문서 내 file:line 부재(참조만) |
| sensitive action restriction | ABSENT | ⓑ §3 |
| approval action restriction | ABSENT | ⓑ §3 |
| impersonation evidence(강화) | PARTIAL | auth_audit_log(변경 로그만) |
| **선행 전제** | BLOCKED_PREREQUISITE | 실 세션 집행/검증=별도 세션(RP-002) · Permission Version=Part 2 |
