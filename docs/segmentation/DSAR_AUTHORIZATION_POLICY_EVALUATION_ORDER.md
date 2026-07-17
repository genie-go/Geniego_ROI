# DSAR — Policy Evaluation 순서 (§32·18단계)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## 평가 순서 (18)
①Subject 활성 상태 → ②**Authentication Assurance** → ③**Tenant Isolation** → ④**Environment Isolation** → ⑤Resource 상태 → ⑥**Explicit Deny** → ⑦Subject-Role Binding → ⑧Role-Permission Binding → ⑨Subject Scope → ⑩Resource Scope → ⑪ABAC Conditions → ⑫PBAC Composite Policy → ⑬**Field-level Access** → ⑭**Financial Threshold** → ⑮Risk·Incident Context → ⑯Approval·Step-up Requirement → ⑰Obligation 생성 → ⑱Final Decision

## ★핵심
- **Tenant(③)·Environment(④) Isolation 을 Role 평가(⑦⑧)보다 먼저** — Role 이 맞아도 Tenant 가 다르면 즉시 차단(§4.5·§4.6).
- **Explicit Deny(⑥) 를 Role/Permission 평가 이전에** — Deny 는 어떤 Allow 보다 우선(§4.2).
- ⑤Resource 상태 = **Program/Version 이 ACTIVE 인가**(4-5-3-1-4 연동 · 승인된 Version 만 운영 권한 대상).
- 실 PDP 구현(평가 엔진·캐시·성능)은 **5-6**.
