# DSAR — Identity Function Regression Gate (06-A-03-02-03-03 · §72)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · per-entity DSAR(ⓒ).
> ★ 인용은 [`DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§72 **Testing — Regression** (SPEC 원문 발췌):

`Regression(Decision Processing/Actions/Ledger/Hash Chain/Assignment/Authority/Delegation/Sequential/Rebate/Claim/Settlement/Payment/ERP/Workflow/Login/SSO/Mobile/API/Audit/Reporting)`.

또한 Property/Concurrency/Security/Migration 스위트에 걸쳐 다음 불변식이 회귀 대상 — `One Principal→Valid Subject`·`Tenant Isolation`·`Original/Effective 보존`·`Immutable Snapshot`·`Nonce Single Use`·`Commit Revalidation`·`Raw Credential Non-persistence`.

연계: §81 검증게이트("무회귀") · §83 완료조건("기존 Decision 기능 무회귀") · §5.12 고객설정 비활성 불가 항목 보존.

의미: Actor Identity Assurance를 도입하더라도 **기존 인증·세션·권한·승인 기능이 하나도 후퇴하지 않아야** 완료로 인정한다. 특히 login/SSO/MFA/session/api_key/Mapping approve/SecurityAudit는 회귀 게이트의 핵심 보호대상이다.

## 2. 기존 구현 대조 (무회귀 보호대상 목록)

회귀 게이트가 반드시 **PASS를 유지**시켜야 할 실재 기능 — GROUND_TRUTH 기준:

- **Login**: bcrypt `password_verify`(`UserAuth.php:730`) · break-glass 마스터(`UserAuth.php:777-798`·`:925 !isMasterAuth`, 별도 처리 대상이나 경로 보존).
- **Session**: 발급 `bin2hex(random_bytes(32))` 64-hex(`UserAuth.php:964-970`)·검증(`:229-318` `expires_at>now`·`is_active=1`)·30일/유휴폐기(`:965`·`:282-286`)·revocation(logout `:1765`·revoke-others `:4173`·deprovision `EnterpriseAuth.php:400,413`·DELETE `:1381,1617,1631`)·genie_token(`index.php:210,288`).
- **api_key**: 인증 `hash('sha256')`(`index.php:483-493`)·발급/스키마(`UserAuth.php:4240-4246`·`Db.php:942-955`)·RBAC scopes(`index.php:553-587` `:554,564-567,568-578,590-600,585`)·tenant 주입(`index.php:417,437`).
- **MFA**: TOTP(`UserAuth.php:3459-3484`)·SMS/이메일 OTP(`:3970-3976`·`:3924-3934`)·정책 off/admin/all(`:3638-3660`)·복구코드(`:3491-3527`).
- **SSO**: OIDC(`EnterpriseAuth.php:206-244` `:194,534`)·SAML(`:247-298,568-619` `:271-283`)·SCIM(`:315-434`).
- **Mapping approve**: canonical actorId(`Mapping.php:36-53`)·자기승인 차단(`Mapping.php:268`)·재승인 dedup(`:279`)·정족수 2(`:287`)·`mapping_change_request`(`Db.php:623-634`).
- **SecurityAudit**: append-only sha256 해시체인(`SecurityAudit.php:14-33` `:27`)·verify(`:56-68`).
- **impersonation / act-as**: Member impersonation `imp_` 2h(`UserAdmin.php:472-534`)·`X-Act-As-Tenant`(`UserAuth.php:398`) — 동작 보존(단 Original Principal 보존은 개선 대상).

## 3. 판정

- Verdict: **PRESENT (보호대상 확정) · 회귀 스위트 자체는 ABSENT**.
- cover: **CLAUDE.md 명시대로 이 레포에는 구성된 lint/test 스크립트가 없음**(no PHPUnit·no npm test) → 자동 회귀 스위트 부재. 그러나 무회귀 보호대상(login/SSO/MFA/session/api_key/Mapping approve/SecurityAudit)은 전부 실재하며 GROUND_TRUTH로 식별됨. 회귀 게이트는 **정의(어떤 기능이 후퇴 금지인지)는 확정, 자동 실행 계층은 신설 대상**.
- 무회귀 원칙(MEMORY `feedback_no_regression_value_unification`)이 최상위 — Identity Assurance 도입은 기존 경로에 **차단조건만 추가**하고 정상 유효 흐름은 불변이어야 한다.

## 4. 확장/구현 방향 (설계)

- 순신규 회귀 게이트 명세 `approval_identity_regression_gate` — §2 보호대상별로 "변경 전=변경 후" 동등성 검사 항목을 열거: ① login bcrypt 성공 ② 세션 발급/검증/만료/revocation ③ api_key 인증+RBAC scopes ④ MFA(TOTP/SMS/email/복구) ⑤ SSO OIDC/SAML/SCIM ⑥ Mapping approve(자기승인 차단·정족수2) ⑦ SecurityAudit verify() PASS ⑧ impersonation/act-as 동작.
- 실행 수단: 레포에 자동 테스트 인프라가 없으므로(§CLAUDE.md) MEMORY `reference_local_php_pdo_drivers` 패턴(로컬 PHP8.1.34+SQLite+Reflection)으로 핸들러 정책로직을 실DB 없이 행동검증, 배포 전후 `render.mjs`/E2E smoke(MEMORY `reference_e2e_smoke`)로 라우트 무음사망 탐지. 실 구현·배포는 후속 승인세션.
- **BLOCKED_SECURITY 수정과의 관계**: `Alerting::executeAction`/`actor()` 하드닝(§55 DSAR)·평문 저장 2종(`UserAuth.php:969`·`:3421,3771`) 해소 시에도 본 회귀 게이트로 login/session/MFA/Mapping approve 무회귀를 재증명한 뒤 배포. (289차 Mapping 하드닝이 Cross-Tenant 위조·무게이트 발송을 이미 닫은 것과 동일한 무회귀 원칙.)
- 무회귀 강행: Identity Assurance의 어떤 신설 게이트도 §5.12 상시활성 항목(Canonical Subject Resolution·Tenant Binding·Commit Revalidation·Raw Credential 비저장·Impersonation Disclosure·Identity Audit)을 고객설정으로 비활성화하지 못하게 하며, 기존 정상 경로의 통과율을 낮추지 않음을 완료 조건으로 한다.

관련: [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_COMMIT_TIME_IDENTITY_REVALIDATION]] · [[DSAR_APPROVAL_IDENTITY_MIGRATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]] · [[reference_e2e_smoke]] · [[reference_local_php_pdo_drivers]]
