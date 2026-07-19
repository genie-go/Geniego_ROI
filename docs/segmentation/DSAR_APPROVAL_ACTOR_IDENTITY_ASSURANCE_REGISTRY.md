# DSAR — Actor Identity Assurance Registry (06-A-03-02-03-03 · §7)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §7.

## 1. 원문 전사 (Canonical Contract)

§7 REGISTRY 필수 필드 (원문 전사):
- `registry id` · `tenant` · `code` · `name`
- `type` · `authoritative identity source`
- `supported actor types` · `supported auth methods` · `supported assurance levels`
- `session binding support` · `device binding support` · `client binding support`
- `delegation support` · `impersonation support` · `service account support` · `system actor support`
- `verification support` · `reconciliation support`
- `owner` · `version` · `valid` · `status` · `evidence`

TYPE enum(9종): `PLATFORM` / `TENANT` / `WORKFORCE` / `CUSTOMER` / `PARTNER` / `EXTERNAL` / `SERVICE` / `SYSTEM` / `CUSTOM`.

의미: Actor Identity Assurance Registry는 테넌트·도메인 단위로 **어떤 신원권위원천(authoritative identity source)이 존재하며 그것이 어떤 actor type·auth method·assurance level·binding(session/device/client)·delegation/impersonation/service-account/system-actor·verification/reconciliation을 지원하는지를 데이터로 선언**하는 최상위 등록소다. Policy(§9)·Definition(§10)·Version(§11)의 상위 루트이자 Principal Registry(§13)·Canonical Subject Binding(§14)·Identity Profile(§15)의 소속 컨테이너다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **신원 assurance 등록소(정본 데이터 선언)는 부재** — `registry id`/`code`/`authoritative identity source`/`supported actor types·auth methods·assurance levels`/`binding support`를 데이터로 열거·조회하는 구조체 전무.
- 실존하는 **재사용 substrate**(등록소 아님·코드 기반 판정):
  - **api_key 등록소** — `Db.php:942-955` 스키마(`role`·`scopes_json`·`expires_at`·`idx_api_key_tenant`)·발급 `UserAuth.php:4240-4246`·인증 조회 `index.php:483-493`. **테넌트 스코프 인증주체 등록의 실 재료**이나, "지원 actor type/method/assurance"를 선언하는 registry는 아님.
  - **RBAC rank** — `index.php:554`(viewer0/connector1/analyst2/admin3). 역할 서열은 있으나 registry가 선언하는 supported assurance level 축과 무관.
  - **인증방식 substrate**(supported auth methods가 실재하는 대상) — TOTP `UserAuth.php:3459-3484`·SMS OTP `:3970-3976`·이메일 OTP `:3924-3934`·복구코드 `:3491-3527`·MFA 정책 `:3638-3660`·SSO OIDC `EnterpriseAuth.php:206-244`·SAML `:247-298`·SCIM `:315-434`. **method는 실재하나 registry에 열거·지원선언되지 않는다.**
  - **불변 감사체인** — `SecurityAudit.php:14-33`(append-only sha256·`:27` prev_hash). evidence/verification의 CANONICAL 패턴이나 registry 대체 아님.
- `type`(9종)·`authoritative identity source`·`session/device/client binding support`·`delegation/impersonation/service account/system actor support`·`verification/reconciliation support`·`active version`/`valid_from·to`를 데이터로 선언하는 등록소 → **no hits**.

## 3. 판정 (Verdict)

- Verdict: **ABSENT(거버넌스 등록소 자체) · PRESENT-substrate(지원 대상 자산 대량 실재)**
- 선행 의존: Registry는 §7~§15 신원 assurance 6군의 상위 루트. 선행 §3.1 Canonical Identity Foundation·§3.2 Authentication Foundation은 substrate로 부분 실재(세션·api_key·MFA·SSO)하나, **§3.3 Decision Foundation·§3.4 Assignment/Authority/Delegation은 실코드 부재** → registry가 신원을 **결합할 불변 Decision Record/Snapshot 대상 없음** → 승인 결합부는 **BLOCKED_PREREQUISITE**.
- cover: **0**(신원 assurance 등록소의 데이터 선언 전무). 단 registry가 declare할 supported auth methods·actor 재료·binding 대상은 **실재**하므로 실 엔진은 "발명 아닌 조립"(선행 Decision Core 신설 후 조립).

## 4. 확장/구현 방향 (설계)

- 순신규 `actor_identity_assurance_registry` — 테넌트·도메인 단위로 `type`(9종)·`authoritative identity source`·supported actor types(§8 참조)·auth methods(§19)·assurance levels(§12)·binding/delegation/impersonation/service/system/verification/reconciliation support를 **데이터로 선언**.
- **Golden Rule=Extend**: 새 인증/신원 소스 발명 금지. `authoritative identity source`는 기존 자산(app_user via `UserAuth.php:229-264`·api_key via `Db.php:942-955`·SSO IdP via `EnterpriseAuth.php`)을 **Canonical Adapter로 통합 선언**. `supported auth methods`는 이미 실재하는 TOTP/SMS/email/OIDC/SAML(위 §2 citation)을 열거만 — 재구현 금지.
- **Mandatory Control**: registry가 `service account support`/`system actor support`/`impersonation support`를 선언하되, 지원=승인허용이 아님(§5.9). Service Account(api_key)·System Actor를 Human 승인권으로 등록 금지.
- **실위험**: 현재 registry 부재로 인증방식·binding 지원여부가 **암묵·산재**(apikey/user 접두 문자열, `Mapping.php:41,47,49`) → 어떤 actor type이 어떤 assurance로 승인 가능한지 **데이터로 조회·감사 불가**. Registry 신설이 이후 Policy/Definition/Version의 조회 루트를 제공. **장식 오인 금지**: `Decisioning.php:12,36`은 ad-insights ingest이지 decision registry 아님.

관련: [[DSAR_APPROVAL_ACTOR_IDENTITY_ASSURANCE_POLICY]] · [[DSAR_APPROVAL_ACTOR_TYPE_REGISTRY]] · [[DSAR_APPROVAL_PRINCIPAL_REGISTRY]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
