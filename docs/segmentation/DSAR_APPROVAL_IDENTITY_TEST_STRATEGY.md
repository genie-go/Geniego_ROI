# DSAR — Actor Identity Assurance: Test Strategy (§72)

> EPIC **06-A-03-02-03-03** · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> GROUND_TRUTH=[[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]]. 인용은 GROUND_TRUTH 등재 file:line만.
> 규율: 레포에 구성된 test suite 없음(CLAUDE.md: no npm test·no PHPUnit) — 테스트 전략은 신규 설계. Regression은 별도 문서. Security 테스트는 라이브 실결함을 능동 재현.

## 1. 원문 전사 (Canonical Contract)

§72 Testing(원문 전사): Unit(Registry~Simulation) · Integration(IdP/OIDC/SAML/OAuth/Session Store/Device/Assignment/Authority/Delegation/Command/Commit/Snapshot/Evidence/Ledger Digest/ERP/Workflow) · Property(One Principal→Valid Subject·Tenant Isolation·Original/Effective 보존·Immutable Snapshot·Session Generation Monotonicity·Nonce Single Use·Token Binding/Resolution Determinism·Commit Revalidation·Raw Credential Non-persistence) · Concurrency(Disable/Termination/Revoke/End/Revoke Session/Token Replay/Nonce/Device Trust/Delegation/Impersonation/Step-up/Client Disable ↔ Commit 동시) · Security(Actor/Email Spoofing·Cross-Tenant Session·Cross-Client/Device Token·Session/Token Replay·Nonce Reuse·Revoked Token·Expired Session·Disabled/Terminated·Low Assurance·Step-up/Device/Client Bypass·Impersonation Hidden·Support/Service Account/System Actor Human Approval·Raw Token Logging·OTP/API Key Storage·Snapshot Mutation) · Migration(Legacy User/Email-only/Missing Subject/Duplicate Provider Subject/Ambiguous Mapping/Legacy Session/Missing Method·Session ID/Legacy Service·System User/Historical Backfill/Incomplete Evidence/Reconciliation) · Regression(Decision Processing/Actions/Ledger/Hash Chain/Assignment/Authority/Delegation/Sequential/Rebate/Claim/Settlement/Payment/ERP/Workflow/Login/SSO/Mobile/API/Audit/Reporting).

의미: Actor Identity Assurance는 신원 결정성·Original/Effective 보존·불변 Snapshot·Commit 재검증·Raw Credential 비영속이 핵심이므로 Property/Security/Concurrency 테스트가 필수다. Security 테스트는 Actor Spoofing·Cross-Tenant Session·Session Replay·미승인 집행을 능동 공격 재현한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

| §72 테스트군 | 현행 커버 | 근거(GROUND_TRUTH) / 비고 |
|---|---|---|
| Unit(Registry~Simulation) | **0** | Registry/Policy/Resolution/Snapshot/Simulation 구조 부재 → 검증 대상 없음 |
| Integration(IdP/OIDC/SAML/OAuth/Session Store) | **0** | SSO/세션 실코드는 존재(`EnterpriseAuth.php:206-298`·`UserAuth.php:229-318`)나 테스트 없음(CLAUDE.md no PHPUnit) |
| Integration(Assignment/Authority/Delegation/Command/Commit/Snapshot/Evidence) | **0** | 대상 도메인·Snapshot/Evidence 부재 |
| Property(One Principal→Subject·Tenant Isolation·Original/Effective 보존·Immutable Snapshot·Nonce Single Use·Resolution Determinism·Raw Credential Non-persistence) | **0** | canonical actor(`Mapping.php:36-53`)·tenant 강제(`index.php:590-600`)는 속성 만족하나 미검증. Original/Effective·Snapshot은 대상 부재 |
| Concurrency(Disable/Revoke/Nonce/Impersonation ↔ Commit 동시) | **0** | Commit revalidation 부재(`Alerting.php:601-665`)·동시성 테스트 부재 |
| Security(Actor Spoofing·Cross-Tenant Session·Session Replay·Impersonation Hidden·Raw Token/OTP Storage) | **0** | ★라이브 실결함(Alerting actor `:33-36`·평문 token `:969`·mfa_secret `:3421,3771`·impersonation `UserAdmin.php:472`)이 재현 대상이나 회귀 테스트 전무 |
| Migration(Legacy User/Email-only/Missing Subject/Legacy Session) | **0** | app_user email 기반 canonical(`Mapping.php:36-53`) → Canonical Subject 마이그레이션 대상이나 테스트 없음 |
| Regression(Login/SSO/Decision/Audit/...) | **별도** | →[[DSAR_APPROVAL_IDENTITY_FUNCTION_REGRESSION_GATE]] |

## 3. 판정

- **Verdict: 테스트 전략 전량 신규.** 레포에 구성된 test suite가 없다(CLAUDE.md). canonical actor 서버도출(`Mapping.php:36-53`)·tenant 강제(`index.php:590-600`)·nonce 1회소비(`EnterpriseAuth.php:194`·`OAuth.php:219`)는 Property를 만족하지만 **테스트로 고정되지 않아** 회귀 방어 없음.
- **★정직 대조**: Security 테스트의 "Actor Spoofing·Cross-Tenant Session·Impersonation Hidden·Raw Token Storage"는 **현행 라이브 실결함(Alerting `:33-36`·`user_session.token` `:969`·`mfa_secret` `:3421,3771`·member impersonation `UserAdmin.php:472`)을 재현하는 실 결함 테스트**다 — 예방 아님. 반면 Cross-Tenant Session은 tenant 강제(`index.php:590-600`)로 이미 차단되므로 **회귀 방지 테스트**(현행 안전 고정). 오탐 금지 — 두 성격을 구분.
- cover: **0** — 신원/인증 assurance 전용 테스트 전무. 실 로직(canonical actor·세션·SSO·tenant)은 존재하나 unverified(§66 UNVERIFIED 준함).
- 선행: 대상 Registry/Principal/Auth Context/Snapshot 부재 → Integration/Concurrency는 결합 대상 없음(BLOCKED_PREREQUISITE). ★단 Actor Spoofing·Raw Credential·Cross-Tenant Security 테스트는 라이브 코드 대상으로 선행 무관 즉시 착수 가능.

## 4. 확장·구현 방향 (설계)

- **Unit(신규)**: Registry/Policy/Definition/Version·Actor Type·Assurance Level(IPL/AAL/CAL/SAL/DAL)·Principal Registry·Canonical Subject Binding·Actor Resolution Pipeline(§17 24단계)·Auth Context/Binding·Snapshot/Digest/Evidence·Drift/Reconciliation/Simulation 각 규칙별 골든 케이스.
- **Integration(신규)**: 실 SSO(OIDC `EnterpriseAuth.php:206-244`·SAML `:247-298`)·Session Store(`UserAuth.php:229-318`)·api_key(`index.php:483-493`)를 Principal Registry Adapter에 결합 검증. Command/Commit/Snapshot/Evidence는 선행 Decision Core 후.
- **★Property(핵심)**: One Principal→Valid Canonical Subject·**Tenant Isolation**(tenant 강제 `index.php:590-600` 고정)·**Original/Effective Actor 보존**(impersonation `UserAdmin.php:472` 확장)·Immutable Snapshot(생성 후 변경 불가)·Session Generation Monotonicity·**Nonce Single Use**(`EnterpriseAuth.php:194`·`OAuth.php:219` 승인경로 확장)·Resolution Determinism(`Mapping.php:36-53` 동일입력→동일 actor)·Commit Revalidation·**Raw Credential Non-persistence**(session token/mfa_secret digest화 후 평문 미저장).
- **★Security(공격 재현·라이브 결함)**: **Actor/Email Spoofing**(`Alerting::actor()` X-User-Email/`?actor=` 위조 `:33-36`)·**Session Replay**(승인 커맨드 nonce 부재)·**Impersonation Hidden**(`UserAdmin.php:472` Original Principal 미보존)·**Raw Token Logging/Storage**(`user_session.token` `:969`·`mfa_secret` `:3421,3771`)·미승인 집행(`Alerting::executeAction` `:601-665`)·Snapshot Mutation. + 회귀방지: Cross-Tenant Session(현행 tenant 강제 차단 고정)·OTP/API Key Storage(bcrypt/sha256 유지 `:3970,4240`).
- **Concurrency**: Disable/Termination/Revoke Session(`UserAuth.php:1765,4173`)/Token Replay/Nonce/Impersonation/Step-up/Client Disable ↔ Commit 동시 — Commit-time revalidation(§55)이 진행 중 revocation을 포착하는지.
- **Migration**: Legacy Email-only actor(`Mapping.php:36-53`)→Canonical Subject 매핑(Confidence·Candidate·Manual Review·임의 확정 금지·§84)·Duplicate Provider Subject·Legacy Session·Historical Backfill·Incomplete Evidence.
- **CI 편입**: 레포 test runner 부재 → 신원/인증 테스트 도입 시 CI(`deploy.yml` 관례)에 게이트 추가 설계(별도 인프라 결정).
- **실 구현·테스트 작성은 선행 Decision Core 신설 후 별도 승인세션**(라이브 결함 Security 테스트는 자립 착수 가능).

관련: [[DSAR_APPROVAL_IDENTITY_FUNCTION_REGRESSION_GATE]] · [[DSAR_APPROVAL_IDENTITY_RUNTIME_GUARDS]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
