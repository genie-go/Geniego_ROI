# DSAR — 중복 구현 감사 (§51)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)

## 전수 탐지 결과 (실측)

| 감사 항목 | 결과 | 조치 |
|---|---|---|
| **여러 Role Registry** | **3계통** — team_role(owner/manager/member) · api_key role(viewer/connector/analyst/admin) · admin master/sub | **CONSOLIDATION_REQUIRED**(★4번째 금지·실효 동작 보존=5-8 Legacy Equivalence) |
| **여러 Permission Registry** | **2** — `acl_permission`(인간·메뉴×8동작) · `scopes_json`(API_CLIENT) | **KEEP_SEPARATE**(용도 상이) + **Canonical 상위 통합** |
| 여러 Policy Store | **1** — PlanPolicy | **재사용**(중복 Policy Store 신설 금지) |
| 여러 Scope Model | **2** — DATA_SCOPES(9) · tenant/plan | **통합**(기존 9종 의미 변경 금지) |
| **여러 Tenant Authorization Middleware** | **2 경로** — api_key 미들웨어(index.php) · 핸들러 self-auth(`authedTenant` **64**) | **CONSOLIDATION_REQUIRED → 5-6** |
| **여러 API Permission Middleware** | **분산** — 미들웨어 1 + **bypass 목록 방대**(세션 토큰 핸들러가 자체 인증) | **5-6 통합** |
| 여러 UI Permission Engine | **1** — 프론트 `planMenuPolicy.js`(PLAN_TIER_RANK / MENU_MIN_PLAN) | **★수동 동기화 위험**(PlanPolicy.php:14) → **5-6 Reconciliation** |
| 여러 Database RLS 정책 생성기 | **0**(선언적 `tenant_id=?` 관례) | — |
| **여러 Field Masking Engine** | **3+** — AttributionEngine · ChannelCreds · UserAuth | **CONSOLIDATION_REQUIRED**(단일 Field Access Profile) |
| 여러 Provider Permission Mapper | **0** | — |
| 여러 OAuth Scope Mapper | **1** — scopes_json 게이트 | 재사용 |
| 여러 Authorization Cache | **0**(캐시 부재) | — |
| **여러 Policy Decision Point** | **중앙 PDP 부재 · 판정 100+ 지점 분산** — authedTenant **64** + requirePro/requirePlan **56**(호출부 **351**) + requireMasterAdmin2 **5** + 미들웨어 1 | **★5-6 에서 통합**(최대 과제) |
| **여러 Policy Enforcement Point** | **동상**(PDP·PEP 혼재) | **5-6** |
| **Rebate 전용 중복 IAM** | **0**(미착수) | **★신설 금지** |
| ERP·CRM·Admin UI별 독립 권한 모델 | **0** | — |

## ★결론 — 중복 위험의 실체
1. **"Rebate 전용 IAM 을 새로 만드는 것"** — Rebate Resource·Action·Policy 는 **기존 `acl_permission` 매트릭스에 등록**해야 하며, 별도 IAM 신설은 금지.
2. **"이미 3계통인 Role 을 4번째로 늘리는 것"** — Canonical Role 로 **통합**하되 3계통의 실효 동작 보존.
3. **"PEP 를 101번째로 추가하는 것"** — 새 핸들러마다 self-auth 를 또 만들지 말고 **5-6 의 통합 Decision Contract 사용**.

근거: 헌법 Golden Rule(Replace 가 아니라 Extend) · CHANGE_GATE Duplicate Prevention 15카테고리 · 메모리 `feedback_no_duplicate_features`(착수 전 grep 전수 · 있으면 신설금지·기존 심화).
