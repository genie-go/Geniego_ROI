# DSAR — Authorization Decision (§29)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Entity `AUTHORIZATION_DECISION`
authorization_decision_id · authorization_request · subject · resource · action · **applicable_roles · applicable_permissions · applicable_policies · policy_versions · matched_conditions · unmatched_conditions · explicit_deny_result · scope_result · field_access_result · authentication_result · risk_result · final_effect · denial_reason · obligations · evaluated_at · decision_latency · cache_reference** · evidence

## ★§4.10 Decision 은 추론 가능해야 한다
모든 Decision 이 다음을 설명 가능해야 한다 — **누가 · 어떤 Resource 에 · 어떤 Action 을 · 어떤 Context 에서 · 어떤 Policy 와 Role 로 · 왜 허용/거부**되었는가(헌법 Vol4 Explainable · 근거 없는 결론 금지).

## 실측
**부재(신설)** — 현행은 판정 근거·Policy Version·Reason 을 남기는 구조가 **없다**. 통과/차단만 존재.

## 규칙
- **Policy Version 없는 Decision 금지**(§44 Lint).
- **cache_reference** — **Policy Cache 가 만료된 권한을 허용 = Critical Gap**(§43) · Revoked/Expired 시 **캐시 무효화**.
- **Authorization Decision Audit 누락 = Critical Gap**(§43) → ACCESS_ALLOWED/DENIED Audit Event(§49).
