# DSAR — Approval Service Credential (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Service Credential Type)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: 서비스 계정도 사람 이상으로 통제 · 외부 벤더 자격증명 ≠ 내부 identity · UNKNOWN은 Permit하지 않음(fail-closed) · Golden Rule · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Service Credential은 비인간 주체가 보유하는 비밀 자료의 종류를 분류한다(스펙 §4 Credential Type·Canonical Entity `APPROVAL_SERVICE_CREDENTIAL`/`APPROVAL_SERVICE_SECRET`, §2). "이 서비스 identity는 무엇을 비밀로 갖고 있으며, 그것이 어떻게 저장되는가"를 다루며, Secret Governance(§3-6-7 자매편)의 회전/만료 대상이 되는 원자료다.

## 2. Canonical 필드

스펙 §2·§4 근거 설계 필드(코드 0·미확정):

- `credential_id`(PK) · `identity_ref`(→ Service Identity Registry) · `credential_type`(§3 11유형 중 1) · `storage_ref`(at-rest 저장 방식 참조) · `encrypted`(bool) · `version_ref`(Immutable, §35) · `created_at` · `tenant_id`

## 3. 열거형 / 타입

- `credential_type`(스펙 §4, 11유형): Password · Secret · API Key · OAuth Client Secret · JWT Key · Private Key · Public Key · Certificate · mTLS · Hardware Key · Vault Reference.

## 4. 실 substrate 매핑 (PARTIAL·ground-truth만 인용)

- **★PARTIAL — Crypto AES-256-GCM = Secret at-rest 정본 substrate**: `Crypto.php` AES-256-GCM 봉투(`:19-21,108-126,133-148,161-182`)가 평문 폴백을 거부(fail-closed)하며 KEK 버전 관리를 갖춘다. KEK는 env `CRED_ENC_KEY` 우선·자동생성(`Crypto.php:45-74`).
- **`Secret`/`OAuth Client Secret` 유형 실재 매핑**: 채널 API 키/토큰(`channel_credential.key_value`, `Db.php:976-990`)은 `enc:vN:` 형식 AES-256-GCM(`ChannelCreds.php:252`·복호 `:191,518,721`), 커넥터 OAuth 토큰(`connector_token`, `Db.php:961-973`)도 AES-256-GCM(`Connectors.php:154-177`), SSO OIDC `client_secret`(`sso_config.oidc_client_secret`)도 AES-256-GCM(`EnterpriseAuth.php:218`).
- **`API Key` 유형 = 평문 미저장·해시만**: `api_key.key_hash`는 sha256 단방향(`Keys.php:40,116`) — 원문은 생성 시 1회 응답 후 DB에 저장되지 않는다.
- **`Private Key` 유형 근접**: VAPID 개인키(`app_setting.webpush_vapid_private`)가 AES-256-GCM(`WebPush.php:71,349`)으로 저장된다.
- **`Certificate`/`Public Key` 유형 = 평문(정당)**: SAML IdP 인증서(`sso_config.saml_idp_cert`)는 평문 TEXT(`EnterpriseAuth.php:49,143,268`) — 공개키 성격이라 암호화 불필요(정당한 설계, 중복 감사 §2에서 "정당" 판정).
- **★`mTLS`/`Hardware Key`/`Vault Reference` 유형 = ABSENT**: mTLS grep 0·Hardware Key grep 0·Vault/KMS 연동 grep 0(중복 감사 D-3, HashiCorp Vault/AWS Secrets Manager grep 0). KEK 자체가 env/DB 자가키이며 외부 Vault 참조 개념이 없다.
- **★Gap — 일부 토큰형 credential은 Crypto를 우회해 평문 저장**: `agency_session.token`(`AgencyPortal.php:81,203-205`, `agt_`+hex, hashToken 미경유)·`partner_session.token`(`PartnerPortal.php:60-66,177`)·`channel_webhook_token.token`(`ChannelSync.php:5771-5795,5863-5866`, hex64)·`journeys.webhook_token`(`JourneyBuilder.php:88,131,159`, hex32)·`webhook_endpoint.secret`(`OpenPlatform.php:84,117-121`, VARCHAR(80), 읽기 시만 마스킹)이 평문 저장이다(중복 감사 D-2). 이는 §3-6-7 Secret Governance의 정합 대상으로 별도 등재(수정 아님, 이번 차수).
- **MFA 시크릿·SCIM 토큰도 PARTIAL/PRESENT**: `app_user.mfa_secret` AES-256-GCM(`UserAuth.php:3880,3903`)·`sso_config.scim_token`+`scim_token_hash` 암호문+sha256 이중(`EnterpriseAuth.php:132-134,169-170,329`).

## 5. 설계 원칙

- **Crypto.php를 통합 Secret at-rest substrate로 확장(발명 아님)**: 신규 Vault Reference 타입을 추가하되, 기존 8종 이상 credential(channel_credential/connector_token/mfa_secret/oidc_client_secret/scim_token/vapid)이 이미 공유하는 `Crypto.php` 봉투를 정본으로 삼는다(ADR D-1 `SECRET_AT_REST_SUBSTRATE`).
- **평문 저장 5곳은 통합 대상으로 명시하되 이번 차수 수정 안 함**: agency_session/partner_session/channel_webhook_token/journeys.webhook_token/webhook_endpoint.secret은 P5(세션 토큰 해시 완결)의 명시적 범위 밖이었던 잔존 항목이며(중복 감사 D-2 각주), Secret Governance 통합 계획(§3-6-7)에 포함하되 코드 변경은 별도 승인 세션.
- **Vault Reference 신규 = Crypto 대체가 아니라 상위 확장**: Vault/KMS 연동은 기존 env/DB 자가키(Crypto KEK)를 완전히 대체하는 것이 아니라, `credential_type='Vault Reference'`일 때 참조를 저장하는 새 경로로 병행 설계.

## 6. Gap / BLOCKED_PREREQUISITE

- `mTLS`·`Hardware Key`·`Vault Reference` 3유형은 substrate 0 — 순신규(외부 Vault/HSM 연동 전제, 이번 차수 범위 밖).
- ★부수 발견 재확인(수정 아님): 평문 토큰 5곳(agency_session/partner_session/channel_webhook_token/journeys.webhook_token/webhook_endpoint.secret)은 DB 덤프 시 replay/서명위조 가능한 상태 — Secret Governance(§3-6-7) fix 세션 후보로 등재만.
- **BLOCKED_PREREQUISITE(RP-002)**: Credential Type이 Service Role/Trust Level과 결합해 Runtime Guard(만료 secret 차단)로 작동하려면 Permission Engine·Decision Core 선행 필요.
