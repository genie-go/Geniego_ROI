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
3. **★회귀 고위험 지점** — 🔴 **수치는 여기서 읽지 말고 반드시 재측정하라**: `node tools/measure_authz_surface.mjs`
   (방법·정의·인용 규칙 = [AUTHZ_SURFACE_MEASUREMENT_SSOT.md](./AUTHZ_SURFACE_MEASUREMENT_SSOT.md))
   ①`requirePro`/`requirePlan` 호출부 — 의미 변경 시 **대량 회귀**(286차 rank 맵 붕괴 실사례)
   ②`authedTenant` 핸들러 ③**index.php bypass 목록** — 항목 누락 시 **401 회귀**(275차 헤더리스 getJson 2차 재발)
   ④**`/api` 별칭** 미매칭 시 **권한상승**(192차 P0).
   > 🔴 **289차 정정 — 이 줄은 "실측"이라고 적혀 있었지만 실측이 아니었다.**
   > ~~`requirePro` 호출부 **351개**~~ ~~`authedTenant` **64 핸들러**~~ — **351은 286차 코드 주석에서 복제된 값**이고
   > **실측하면 ~100 많다**(≈22% 누락 · 5-6이 455로 정정했으나 이 문서엔 전파 안 됨. **그 455조차 지금은 어긋난다**).
   > **회귀 게이트가 stale 값으로 범위를 잡으면 게이트를 통과해도 회귀가 남는다** — 이 항목이 351의 최대 피해처였다.
   > **그래서 값을 지우고 명령으로 대체한다**(값을 새로 박으면 내일 다시 stale).
4. **`npm run e2e` smoke 배포 전후** + **`tools/guard_headerless_getjson.mjs`**(**289차 `.githooks/pre-commit` **G15** 배선 완료 — 종전엔 호출처 0이라 이 줄이 공허했다**) + route check + php -l.
5. **인가 변경은 운영/데모 동반 배포 + 사용자 명시 승인 후**(메모리 `feedback_deploy_approval_mandatory`).
6. **헤드리스 실검증**(admin/일반/데모 role별 전 메뉴) — 286차 platform_growth act-as 하이재킹처럼 **role별 전 메뉴 공백**은 요청시점 tenant 해석 의심(메모리 `reference_platform_growth_actas_tenant_hijack`).
