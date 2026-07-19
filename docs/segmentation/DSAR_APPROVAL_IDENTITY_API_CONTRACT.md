# DSAR — Actor Identity Assurance: API Contract (§68)

> EPIC **06-A-03-02-03-03** · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> GROUND_TRUTH=[[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]]. 인용은 GROUND_TRUTH 등재 file:line만.
> 규율: **Raw Credential/Token/Password/OTP/API Key 원문 반환 API 금지.** Client 전달 Actor ID 인증 없이 신뢰 금지 · 신규 실배선은 /api 접두 필수.

## 1. 원문 전사 (Canonical Contract)

§68 API Contract 원문 전사: Registry/Policy/Version·Actor Type·Assurance Level·Auth Method 조회 / Principal·Subject Binding·Identity Profile·Resolution / Auth Context·Session·Assurance·Revocation·Token/Nonce/Client/Device Binding / Decision Auth Binding 생성·검증·Commit Binding·Step-up·MFA / Delegation·On-behalf-of·Impersonation·Support·Administrative Acting / Snapshot·Evidence·Digest / Commit-time Revalidation·Drift·Reconciliation·Manual Review / Simulation. 공통: Tenant·AuthN/Z·Principal/Subject Validation·Session/Client/Device Binding·Idempotency·Sensitive Output Redaction·Snapshot·Audit·Evidence·Rate Limit. **Raw Credential/Token/Password/OTP/API Key 반환 API 금지.**

의미: API는 신원/인증 자산을 **조회·생성·검증·사고관리**만 노출한다. 어떤 endpoint도 raw session token·password·TOTP secret·OTP 원문·private key·session cookie를 반환하지 않으며, Reference·Masked·Digest·Verification Result만 노출한다. Client가 전달한 Actor ID(Header/Body/Query)는 인증 Context 없이 신뢰하지 않는다(§5.11).

## 2. 기존 구현 대조 (GROUND_TRUTH)

| API 군 | 현행 대응 | 근거(GROUND_TRUTH) |
|---|---|---|
| Registry/Policy/Version·Actor Type·Assurance Level 조회 | **부재** | 해당 데이터 구조 부재 |
| Auth Method 조회 | **부분(내부)** | MFA 정책 off/admin/all(`UserAuth.php:3638-3660`)·TOTP/SMS/email 실재하나 Method Registry API 아님 |
| Principal·Subject Binding·Identity Profile·Resolution | **부재** | Principal Registry/Binding 부재(app_user 단일·`UserAuth.php:229-264`) |
| Session·Revocation 조회/관리 | **부분(양호 substrate)** | logout(`UserAuth.php:1765`)·revoke-others(`:4173`)·deprovision(`EnterpriseAuth.php:400,413`)·DELETE(`:1381,1617,1631`) — 세션관리 API 실재하나 승인 Auth Binding용 아님 |
| Token/Nonce/Client/Device Binding | **부분/부재** | nonce는 SSO/OAuth/phone/DSAR 국한(`EnterpriseAuth.php:194`·`OAuth.php:219`·`index.php:147`)·Device Binding 부재 |
| Decision Auth Binding 생성·검증·Commit Binding | **부재(위험)** | `Alerting::decideAction/executeAction`(`:572-599,601-665`)은 세션·커맨드 결합 없는 단일 approved |
| Step-up·MFA 결합 | **부분(미결합)** | MFA는 로그인만(`UserAuth.php:3459-3484`)·승인 커맨드 결합 없음 |
| Delegation·On-behalf-of·Impersonation·Support | **부분(위험)** | member impersonation 발급 API(`UserAdmin.php:472-534`)·Original Principal 미보존·승인 구별 없음 |
| Snapshot·Evidence·Digest·Revalidation·Drift·Reconciliation·Simulation | **부재** | 전부 부재 |
| 공통: Tenant Context | **PRESENT(양호)** | tenant 강제 주입·X-Tenant-Id 덮어쓰기(`index.php:590-600`) |
| 공통: AuthN/AuthZ | **PRESENT(substrate)** | api_key sha256+RBAC scopes(`index.php:483-493,553-587`) 재사용 |
| 공통: Client 전달 Actor 신뢰 금지 | **★위반 존재** | `Alerting::actor()`(`Alerting.php:33-36`) X-User-Email 헤더/`?actor=` 신뢰 |
| **Raw Credential 반환 금지** | **대체로 준수(1건 양호)** | api_key raw는 **발급 시점 1회만**(`UserAuth.php:4240-4246`) — 조회 API 반환 아님(양호). 세션토큰/mfa_secret은 반환 API 없음 |

## 3. 판정

- **Verdict: 대부분 신규 · 금지조항은 대체로 현행 준수(1건 양호·1건 위반).** 세션관리·MFA·api_key·SSO API는 substrate로 실재(`UserAuth.php:1765,4173`·`EnterpriseAuth.php`)하나 **승인 Decision Auth Binding·Commit Revalidation·Snapshot/Evidence API는 전무**. Registry/Principal/Resolution/Simulation API도 0.
- **★금지조항 판정(정직 기술)**: "Raw Credential/Token/API Key 반환 금지"는 **api_key raw 1회 발급(`UserAuth.php:4240-4246`)이 유일 노출이며 이는 발급 시점 표준 패턴**(조회 반환 아님) → §68 금지조항 준수(양호). 세션토큰·mfa_secret은 반환 endpoint 자체 없음. 이를 위반으로 계상하면 오탐 — 발급 시 1회 노출은 산업표준.
- **★현행 위반 1건**: "Client 전달 Actor ID 인증 없이 신뢰 금지"는 `Alerting::actor()`(`:33-36`) 헤더/쿼리 actor 신뢰로 **위반** → API 계약에서 차단.
- cover: **부분** — Tenant Context·AuthN/AuthZ substrate·세션관리 API·api_key 발급 안전패턴이 실재. 승인용 Identity/Auth Binding API는 0.
- 선행: Registry/Principal/Binding/Snapshot 대상 부재 → 대부분 endpoint 결합 대상 없음(BLOCKED_PREREQUISITE).

## 4. 확장·구현 방향 (설계)

- **Read API(신규)**: Registry/Policy/Active Version·Actor Type·Assurance Level·Auth Method Registry·Principal·Canonical Subject Binding·Identity Profile·Actor Resolution. 전부 GET·Tenant-scoped(X-Tenant-Id 강제·`index.php:590-600` 패턴)·Pagination·Sensitive Redaction.
- **Auth Binding API(신규)**: Decision Auth Binding 생성·검증·Commit Binding·Step-up·MFA 결합. 세션↔커맨드 결합(§22)·nonce 소비(§24)를 승인 커맨드에 확장(SSO nonce 패턴 `EnterpriseAuth.php:194` 준용). 응답은 session id·method·AAL·digest만(**raw token/secret 미포함**).
- **Governance API(신규)**: Delegation·On-behalf-of·Impersonation·Support·Administrative Acting 상태 조회. Impersonation 발급(`UserAdmin.php:472-534`) 확장 시 Original Principal + Effective Actor 이중보존 필드 반환(§5.8)·승인 기본금지(§39).
- **★금지조항 명문 유지**: raw session token·password·mfa_secret·OTP·private key 반환 endpoint **미제공**(현행 안전 속성 보존). api_key 발급 1회 노출 패턴(`UserAuth.php:4240-4246`)만 유지·이후 조회는 masked/prefix만. Snapshot/Evidence/Verification Result는 immutable·조회 전용.
- **Client Actor 신뢰 차단**: 모든 승인 API가 canonical actor 정본 `Mapping::actorId`(`Mapping.php:36-53`)로 actor 도출·`Alerting::actor()`(`:33-36`) 헤더 actor 경로 폐기.
- **공통 계약**: Tenant Context·AuthN/AuthZ(api_key+RBAC `index.php:553-587` 재사용)·Idempotency·Rate Limit·Audit·Evidence·Error Contract(§64) 연계. 신규 실배선은 `/api` 접두 필수(레포 라우팅 관례).
- **실 구현은 선행 Decision Core 신설 후 별도 승인세션.**

관련: [[DSAR_APPROVAL_IDENTITY_ERROR_WARNING_CONTRACT]] · [[DSAR_APPROVAL_IDENTITY_INDEX_PERFORMANCE]] · [[DSAR_APPROVAL_IDENTITY_CACHE_POLICY]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
