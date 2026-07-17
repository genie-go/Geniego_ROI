# DSAR — 기능 회귀 게이트 (§58)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)

## 보존 대상 (회귀 0 검증 대상)
TeamPermissions(ACTIONS 8 · DATA_SCOPES 9 · acl_permission · team_role) · api_key RBAC(roleRank · scopes_json · key_hash · expires_at · **192차 `/api` 별칭 권한상승 차단**) · PlanPolicy(RANK · 기능키→최소플랜) · requirePro/requirePlan(**호출부 351**) · index.php 미들웨어 + **bypass 목록** · `authedTenant`(64) · `tenant_id=?` RLS · action_request IDOR 차단(208차) · requireMasterAdmin2/requireSubAdminMenu(286차) · EnterpriseAuth(SAML/OIDC/SCIM) · UserAuth 세션 · MFA(mfa_policy) · OAuth.php · channel_credential AES-256-GCM(267차) · `no_credentials` 게이트 · `tools/guard_headerless_getjson.mjs`(275차) · audit_log 12 · Impersonation(UserAdmin)

## 본 블록의 회귀 위험 = 0 (실측 근거)
**코드 변경 0** — `git diff backend/ frontend/ tools/` 결과 없음. 산출물은 **문서 전용**.
→ 기존 로그인 · Admin UI · API · Provider Connector · ERP · Report · Export · Database RLS · Monitoring **회귀 0**(변경 자체가 없으므로).

## ★정직 표기 — 본 블록의 구현 수준
스펙 §1·§52 Step16·§60 은 "Static Lint·Runtime Guard **구현**"·"...가 **구축**되었다"를 요구하나, 본 블록 산출은 **계약 명세(문서)까지**이며 **실 코드·테이블·Lint 규칙·Guard 는 0건**이다. 이는 선행 Part 4-5-3-1-1~1-4 의 선례(전부 설계 명세·코드변경 0)와 비파괴 원칙을 따른 것이며, **"구축 완료"가 아니라 "계약 명세 확정"으로 읽어야 한다**. 실 구현 = **후속 승인 세션**.

## ★실 구현 착수 시 게이트 (인가 도메인 특유·후속 세션)
1. **CHANGE_GATE 5중 게이트** + **보안 도메인이므로 `/security-review` 필수**.
2. **Legacy Equivalence 최우선** — **기존 정상 사용자 접근을 유지**하면서 과도한 권한·누락 Scope·우회 가능 API 만 제거(§61). **전 Certification = 5-8**.
3. **★회귀 고위험 지점**(실측): ①`requirePro` **호출부 351개** — 의미 변경 시 **대량 회귀**(286차 rank 맵 붕괴 실사례) ②`authedTenant` **64 핸들러** ③**index.php bypass 목록** — 항목 누락 시 **401 회귀**(275차 헤더리스 getJson 2차 재발) ④**`/api` 별칭** 미매칭 시 **권한상승**(192차 P0).
4. **`npm run e2e` smoke 배포 전후** + **`tools/guard_headerless_getjson.mjs`** + route check + php -l.
5. **인가 변경은 운영/데모 동반 배포 + 사용자 명시 승인 후**(메모리 `feedback_deploy_approval_mandatory`).
6. **헤드리스 실검증**(admin/일반/데모 role별 전 메뉴) — 286차 platform_growth act-as 하이재킹처럼 **role별 전 메뉴 공백**은 요청시점 tenant 해석 의심(메모리 `reference_platform_growth_actas_tenant_hijack`).
