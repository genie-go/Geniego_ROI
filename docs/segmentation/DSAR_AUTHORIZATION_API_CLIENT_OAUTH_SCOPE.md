# DSAR — API Client·OAuth Scope (§38)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## 관리 항목
Client ID Reference · Tenant · Application Owner · **Environment** · OAuth Scopes · **Rebate Resource Scopes** · Allowed Grant Type · Redirect Reference · **Token Audience** · **Token Lifetime** · Secret·Certificate Reference · **IP·Network Restriction** · Rate Limit Reference · **Export Limit** · Financial Action 지원 여부 · Status · Evidence

## ★핵심 규칙
**OAuth Scope 만으로 최종 Authorization 결정 금지 — Resource · Tenant · Role · Attribute · Policy 를 추가 평가**(§38 명시).

## 실측 — 재사용
`api_key`: tenant_id · key_prefix · **key_hash SHA-256** · role · **scopes_json**(`admin:keys`/`write:*`/`write:ingest`) · is_active · **expires_at** · use_count(Db.php:942-955) · rank fallback(index.php:554-575) · **전역 레이트리밋**(282차).
**★192차 보안 P0 교훈(영구 규칙)**: `/v421/keys` 게이트가 **`/api` 별칭으로 우회**되어 일반 `write:*` 키가 **admin 키를 발급**할 수 있었다 → **신규 게이트 작성 시 `/api` 변형을 반드시 동시 매칭**(index.php:562-567).

## 부재
Owner · Grant Type · Redirect · Token Audience · **IP/Network Restriction** · **Export Limit** · Financial Action 플래그 → 신설.
