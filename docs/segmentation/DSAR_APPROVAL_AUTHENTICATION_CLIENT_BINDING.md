# DSAR — Approval Authentication Client Binding (06-A-03-02-03-03 · §27)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 인용원 = [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]](GROUND_TRUTH allowlist).

## 1. 원문 전사 (Canonical Contract)

**§27 Client Binding** — 인증에 사용된 등록 클라이언트를 승인에 결합:
`registered client` · `status` · `allowed grant type/actor type/tenant/channel/action/resource` · `cert binding ref` · `secret rotation state ref` · `client AAL` · `token audience/issuer` · `scope`.

## 2. 기존 구현 대조

- **★api_key 가 부분적 Registered Client substrate 로 실재.** 발급/스키마(`UserAuth.php:4240-4246`·`Db.php:942-955`)는 `genie_key_`+random_bytes(16)·sha256 저장·`scopes_json`·`role`·`expires_at`·`idx_api_key_tenant` 를 보유하고, 인증(`index.php:483-493`)은 sha256 조회·`is_active=1` 확인. 즉 **client 의 status(is_active)·tenant 바인딩(idx_api_key_tenant·`index.php:417,437` auth_tenant)·scope(scopes_json·`index.php:568-578`)·role(`:554`)** 은 실재한다 — §27 의 `status`·`tenant`·`scope`·`allowed action(write:*/write:ingest)` 축을 부분 충족.
- **OAuth Client substrate(연합/커넥터)**: SSO OIDC(`EnterpriseAuth.php:206-244`)는 client_secret 을 Crypto AES-256-GCM 로 보관하고, 커넥터 OAuth(`OAuth.php:41-61,190-244`)는 아웃바운드 client credential+state CSRF(`:219`)를 관리. 그러나 이는 **사용자 승인용 client 결합이 아니라** IdP/커넥터 인증용이다.
- **★부재 축**: `cert binding ref`·`secret rotation state ref`·`client AAL`·`token audience/issuer`·`allowed grant type/actor type/channel/resource` 를 클라이언트에 결합하는 구조는 없다. mTLS/Client Cert = **ABSENT**(GROUND_TRUTH grep 무) → cert binding 부재. Device 연계(§26)도 부재.
- **승인 결합 전무**: 승인 레코드(`mapping_change_request` `Db.php:623-634`·`action_request`)에 어떤 client 로 인증했는지(client id/audience/scope)를 결합하는 컬럼이 없다. `Alerting::executeAction`(`Alerting.php:601-665`)은 client 검증 없이 dispatch.

## 3. 판정

- **Verdict: PARTIAL-PRESENT(api_key tenant/scope/status 바인딩 실재 · cert/device/AAL 부재)**.
  - PRESENT: api_key 의 status(is_active)·tenant(`index.php:417,437`·idx_api_key_tenant)·scope(`scopes_json`·`index.php:568-578`)·role(`:554`)·expiry — §27 부분 충족(`Db.php:942-955`·`index.php:483-493,553-587`).
  - ABSENT: cert binding·secret rotation state·client AAL·token audience/issuer·grant/actor/channel/resource 허용목록·client↔decision 결합.
- **선행 의존**: cert binding 은 mTLS/Cert(§34) 부재로 BLOCKED_PREREQUISITE. 승인 결합부는 §3.3 Decision Foundation 부재.
- **cover: 부분** — api_key status/tenant/scope 는 커버(API 인증 밖). client↔decision 결합·cert·AAL 0.

## 4. 확장/구현 방향 (설계)

- **api_key 를 Registered Client 정본 substrate 로 승격**(Golden Rule=Extend): 기존 `api_key` 테이블(status·tenant·scope·role·expiry)에 `allowed grant type/actor type/channel/action/resource`·`client AAL`·`token audience/issuer` 를 확장. 새 client registry 발명 금지 — 기존 확장(중복 금지).
- **Client Binding 을 승인 레코드에 결합**: 승인 커맨드에 인증 client id·client AAL·audience 를 결속하고, Commit 직전(§30) client status(disabled)·scope 허용 여부를 재검증. Client 전달 actor claim 은 인증 context 없이 신뢰 금지(§5.11).
- **cert binding/mTLS(§34) 는 순신규**: Service-to-Service·고신뢰 승인에 client certificate 를 요구할 경우 cert registry(serial digest·validity·revocation·client binding·cert AAL) 신설 — Private Key 저장 금지. mTLS 부재로 현재 BLOCKED_PREREQUISITE.
- **secret rotation state ref**: client_secret(OIDC `EnterpriseAuth.php:206-244`)은 이미 Crypto AES-256-GCM 보관 — 이 패턴을 재사용해 rotation state 를 참조로 결합(원문 노출 금지).
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_AUTHENTICATION_TENANT_BINDING]] · [[DSAR_APPROVAL_AUTHENTICATION_DEVICE_BINDING]] · [[DSAR_APPROVAL_AUTHENTICATION_TOKEN_BINDING]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
