# DSAR — 기능 회귀 게이트 (§57 Step 18·§63)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 보존 대상 (회귀 0 검증 대상)
TeamPermissions(**ACTIONS 8**·**DATA_SCOPES 9**·`acl_permission`·`team`·team_role) · api_key RBAC(**roleRank**·scopes_json·key_hash·**expires_at**·last_used_at·use_count·**192차 `/api` 별칭 권한상승 차단**) · **`sso_group_role_map`+`roleForGroups()`** · **`sso_config`**(SCIM·auto_provision·default_role) · **`EnterpriseAuth.php:400` 즉시 deprovision** · `catalog_brand`(285차) · PlanPolicy(RANK·기능키→최소플랜) · **requirePro/requirePlan** · index.php 미들웨어 + **bypass 목록** · `authedTenant`(64) · `tenant_id=?` RLS · **action_request IDOR 차단**(208차) · requireMasterAdmin2/requireSubAdminMenu(286차) · AgencyPortal(**매 요청 approved fail-closed**) · PartnerPortal · SupplyChain · UserAuth 세션 · MFA(mfa_policy) · channel_credential AES-256-GCM(267차) · **menu_audit_log hash_chain** · SIEM LEEF/RFC5424 · **`Db::envLabel()`** · Impersonation(UserAdmin)

## 🔴 1-8 교훈 적용 — 팬텀 보존 대상을 넣지 않았다
1-8 GOLDEN-GAP-01: 5-1 회귀게이트가 **`tools/guard_headerless_getjson.mjs`(호출처 0)** 를
보존 대상에 넣어 **회귀 0 검증이 공허하게 참**이 됐다.
→ **본 목록에는 미배선 항목을 넣지 않는다.** 위 전 항목은 **실행 경로가 확인된 것**이다.

## 🔴 1-8 교훈 적용 — stale 수치를 옮겨 적지 않았다
1-8 GOLDEN-GAP-02: 5-1 회귀게이트의 **"실측 requirePro 호출부 351"** 은 실측이 아니라
**`UserAuth.php:329` 286차 코드 주석**이었고, 실측은 **458~498**(방법에 따라 상이)이었다.
→ **본 문서는 requirePro 호출부에 수치를 적지 않는다.** 필요 시 **측정 명령으로 재산출**한다:
```
grep -rnE "requirePro\s*\(|requirePlan\s*\(" backend/src/ | grep -vE ":\s*//|function requirePro|function requirePlan" | wc -l
```
**1-8 D-7 `CorrectionPropagation`: 수치를 문서에 복사하지 말고 `MeasurementMethod` 참조.**

## 본 블록의 회귀 위험 = 0 (실측 근거)
**코드 변경 0** — `git diff backend/ frontend/ tools/` 결과 없음. 산출물은 **문서 전용**.
→ 기존 로그인·Admin UI·API·SSO/SCIM·Provisioning·팀 권한·플랜 게이팅 **회귀 0**(변경 자체가 없으므로).

## ★정직 표기 — 본 블록의 구현 수준
스펙 §65는 41항목 전부 **"구축되었다"**를 요구하나, 본 블록 산출은 **계약 명세(문서)까지**이며
**실 코드·테이블·Lint·Guard 는 0건**이다. 선행 Part 1-1~1-4·5-1 선례와 비파괴 원칙을 따른 것이며
**"구축 완료"가 아니라 "계약 명세 확정"으로 읽어야 한다**.
**1-6 4축 기준: Design 충족 · Implementation/Data/Verification = 0%.**

## 실 구현 착수 시 게이트 (후속 승인 세션)
1. **CHANGE_GATE 5중 게이트** + **인가 도메인이므로 `/security-review` 필수**.
2. 🔴 **`EquivalenceProof` 선행**(1-9) — Role 3계통 통합은 **Golden 확보 → 동일 입력·동일 출력 증명 → 그 후 교체**. **증명 없는 통합 = 286차 rank 맵 붕괴 재현(실측 이력)**.
3. **`npm run e2e` smoke 배포 전후**(266차) · `e2e:render` · route check · `php -l`.
4. **VALIDATED_LEGACY 재사용 확인**([DUPLICATE_IMPLEMENTATION_AUDIT](DSAR_REBATE_ROLE_DUPLICATE_IMPLEMENTATION_AUDIT.md)) — **4번째 Role Registry 신설 금지**.
5. **헤드리스 role별 전 메뉴 실검증** — 286차 platform_growth act-as 하이재킹처럼 **role별 전 메뉴 공백은 요청시점 tenant 해석 의심**(메모리 `reference_platform_growth_actas_tenant_hijack`).
6. **배포는 사용자 명시 승인 후**(운영·데모 동반 · 메모리 `feedback_deploy_approval_mandatory`).
