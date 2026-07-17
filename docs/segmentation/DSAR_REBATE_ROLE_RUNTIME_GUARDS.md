# DSAR — Runtime Guard (§50·22종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 최소 Runtime Guard (22)
1. Role Assignment Not Active · 2. Role Version Not Active · 3. **Role Assignment Expired** · 4. **Tenant Scope Mismatch** · 5. Workspace Scope Mismatch · 6. Organization Scope Mismatch · 7. **Legal Entity Scope Mismatch** · 8. Program Scope Mismatch · 9. Country·Region Scope Mismatch · 10. **Environment Scope Mismatch** · 11. Provider Account Scope Mismatch · 12. **Explicit Scope Exclusion** · 13. External Role Restriction · 14. **Service Account Role Restriction** · 15. Deprecated Role · 16. Suspended Role · 17. **Scope Conflict Unresolved** · 18. **Financial Threshold Exceeded** · 19. Field Profile Insufficient · 20. **Subject Membership Stale** · 21. Critical Role Drift · 22. **Kill Switch 활성**

## 🔴 재사용 대상 — VALIDATED_LEGACY (신설 금지)
| Guard | 현행 REAL |
|---|---|
| **Tenant Scope Mismatch** | `auth_tenant` 주입 · `authedTenant`(64 핸들러) · `tenant_id=?` RLS · **IDOR 차단**(208차) · agency 토큰 **서버바인딩 위조불가**(`index.php:97-100`) |
| **Role Assignment Expired** | `api_key.expires_at` · `is_active`(`Db.php:942-955`) |
| **Subject Membership Stale** | `EnterpriseAuth.php:400` 즉시 세션 회수 · **AgencyPortal 매 요청 approved 재검증 fail-closed**(272차) |
| **Kill Switch** | `auto_campaign` kill-switch 패턴(`AutoCampaign.php:602-609`) |

## 🔴 192차 영구 규칙 (반드시 준수)
**신규 게이트도 `/api` 변형을 동시 매칭해야 한다**(`index.php:562-575`).
**누락 시 `/api` 별칭으로 권한상승**(192차 P0 실사례).

## 🔴 22번 Kill Switch — 자동화 안전장치
헌법 V5 Safety Rule 계승: **신뢰도/권한/동기화 부족 시 자동집행 금지 → 경고**.

## 상태
**계약 명세만 · 구현 0**(`CONTRACT_ONLY`). → **전 블록 누계 Runtime Guard 44 → 66**.
