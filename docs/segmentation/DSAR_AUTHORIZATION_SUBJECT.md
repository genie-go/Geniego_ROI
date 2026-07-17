# DSAR — Authorization Subject (§7)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## 실측 — 현행 Subject 4계통 (CONSOLIDATION_REQUIRED)
| 현행 | Canonical Subject Type | 근거 |
|---|---|---|
| `app_user`(tenant_id·parent_user_id·**team_role**·team_name) | USER / TENANT_ADMIN | TeamPermissions.php:13 |
| **`api_key`**(tenant_id·key_prefix·**key_hash SHA-256**·role·**scopes_json**·is_active·last_used_at·use_count·**expires_at**) | **API_CLIENT** | Db.php:942-955 |
| `partner_session`(파트너 토큰 자가인증·본사 api_key/세션과 분리) | PARTNER_USER | index.php:196 |
| agency `agt_` 토큰(**서버바인딩 tenant 주입·위조불가** + 최소권한 role) | (대행사)ORGANIZATION_MEMBER | index.php:97-100 |

## Entity `AUTHORIZATION_SUBJECT`
authorization_subject_id · canonical_identity_id · **subject_type** · tenant_id · organization_id · workspace_ids · legal_entity_ids · home_country · employment_status_reference · **authentication_assurance_level · MFA_status_reference · risk_profile_reference · data_clearance_level · financial_clearance_level · contract_access_level** · active · valid_from/to · status · evidence

## 규칙
- **§4.7 Authentication ≠ Authorization** — 현행 인증(UserAuth 세션·MFA·EnterpriseAuth SAML/OIDC/SCIM·OAuth)은 **KEEP_SEPARATE**. 로그인 성공/유효 토큰만으로 접근 허용 금지.
- **4계통을 Canonical Subject 로 통합**(중복 Identity Store 신설 금지).
- 부재 필드(clearance/risk_profile/authentication_assurance)는 **신설** — 있다고 가정한 배선 금지.
