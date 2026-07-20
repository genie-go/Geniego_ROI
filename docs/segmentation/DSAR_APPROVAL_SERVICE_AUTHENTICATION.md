# DSAR — Approval Service Authentication (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Service Authentication)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: 서비스 계정도 사람 이상으로 통제 · 외부 벤더 자격증명 ≠ 내부 identity · UNKNOWN은 Permit하지 않음(fail-closed) · Golden Rule · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Service Authentication은 비인간 주체가 시스템에 자신을 증명하는 방식과 그 런타임 상태를 정형화한다(스펙 §5 Authentication 수단·§19 Runtime Authentication 상태·Canonical Entity `APPROVAL_SERVICE_AUTHENTICATION`, §2). "이 서비스 identity는 무엇으로 인증하며, 지금 그 인증은 Valid/Expired/Revoked/Unknown 중 무엇인가"를 다룬다.

## 2. Canonical 필드

스펙 §2·§5·§19 근거 설계 필드(코드 0·미확정):

- `authentication_id`(PK) · `identity_ref`(→ Service Identity Registry) · `auth_method`(§3-6-6 Credential Type과 결합) · `auth_mechanism`(§5 7유형 중 1) · `runtime_status`(§19 4상태 중 1) · `last_verified_at` · `tenant_id`

## 3. 열거형 / 타입

- `auth_mechanism`(스펙 §5, 7유형): OAuth2 Client · JWT Client · mTLS · API Key · Certificate · Vault Authentication · Service Mesh Identity.
- `runtime_status`(스펙 §19, 4상태): Valid · Expired · Revoked · Unknown.

## 4. 실 substrate 매핑 (PARTIAL·ground-truth만 인용)

- **★PARTIAL — `API Key` 메커니즘 근접 실재**: `api_key` 인증 게이트(`index.php:477-622`)가 추출(`:478-486`)·sha256 조회+`is_active` 확인(`:502-508`)·만료 체크(`:518-520`)·사용량(`:522-525`)·레이트리밋(`:527-570`)·RBAC rank+scope(`:572-598`)·테넌트 바인딩(`:609-619`)을 수행한다. 이는 §5 `API Key` 메커니즘의 상당 부분을 커버한다.
- **`OAuth2 Client`/`JWT Client` 근접 substrate 존재(부분)**: SSO OIDC(`EnterpriseAuth.php:218` client_secret 암호화)·OIDC JWKS 소비(`EnterpriseAuth.php:522-531` kid 매칭)·SCIM 토큰(`EnterpriseAuth.php:132-134,169-170,329`)이 OAuth2/JWT Client 인증의 일부를 구성하나, 이는 **사람 SSO 로그인 경로**이며 비인간 identity 전용 OAuth2/JWT Client 인증 경로로 별도 존재하지 않는다.
- **session 인증도 근접**: `user_session.token` sha256 해시(`UserAuth.php:30-38,609-610`)가 세션 기반 인증에 해당하나 이 역시 인간 로그인 세션이며 서비스 identity 전용은 아니다.
- **`mTLS`/`Vault Authentication`/`Service Mesh Identity` = ABSENT**: mTLS grep 0·Vault/KMS grep 0(전수조사 §5, §D-3)·Service Mesh Identity grep 0. 발급/검증만 존재(SAML sig 검증 `EnterpriseAuth.php:268`·Google/Snowflake JWT bearer `Connectors.php:3781-3815`·`DataExport.php:550-584`)하고 governance(만료 추적/갱신 알림/trust chain)는 부재(전수조사 §5).
- **`Certificate` 메커니즘 = 검증만, 관리 ABSENT**: SAML 서명 검증(C14N+RSA-SHA256, `EnterpriseAuth.php:268`)은 실재하나 인증서 만료/갱신/trust chain 추적(`cert_expires` grep 0)은 부재.
- **`runtime_status`(Valid/Expired/Revoked/Unknown) 통합 열거형 = ABSENT**: api_key는 `is_active`(bool)+`expires_at`(string) 두 필드뿐(전수조사 §9) — 4상태 통합 표현이 없고, 특히 **`Unknown` 상태 자체가 존재하지 않아 fail-closed 처리 대상 식별이 불가능**.

## 5. 설계 원칙

- **`API Key` 메커니즘 = api_key 게이트를 Runtime Authentication substrate로 확장**: `index.php:477-622`의 검증 체인(추출→조회→만료→사용량→레이트리밋→RBAC→테넌트)을 Service Authentication의 `API Key` 메커니즘 정본으로 삼는다(발명 아님, ADR §3 "api_key 게이트를 Runtime Guard substrate로").
- **인간 SSO(OAuth2/JWT/SAML)와 서비스 인증을 값공간은 공유하되 identity는 분리**: `EnterpriseAuth.php`의 OIDC/SAML/SCIM 메커니즘 자체(암호화·서명 검증 로직)는 재사용하되, 인증 주체(actor)가 인간인지 서비스인지는 별도 identity_ref로 구분해야 한다(ADR §3 "AI Agent Identity(agent_mode≠identity)"와 동일 원리).
- **runtime_status에 `Unknown`을 반드시 포함하고 fail-closed 강제(ADR D-2)**: 신설 시 `is_active`/`expires_at` 2필드를 4상태(Valid/Expired/Revoked/Unknown)로 승격하되, Unknown은 Permit 경로에서 배제.
- **mTLS/Vault/Service Mesh는 순신규 — 기존 인프라 없이 조립 불가**: 이 3항목은 대체할 근접 substrate가 전무하므로 순수 신규 구축 항목으로 별도 계획.

## 6. Gap / BLOCKED_PREREQUISITE

- `mTLS`·`Vault Authentication`·`Service Mesh Identity` 3메커니즘은 substrate 0 — 순신규 인프라(사내 CA, Vault 연동, 서비스 메시) 도입이 전제되어야 함(이번 차수 범위 밖, Gap 등재만).
- **BLOCKED_PREREQUISITE(RP-002)**: `runtime_status`가 Runtime Authorization(Allow/Deny)에 반영되려면 Decision Core·Runtime Policy(§11)가 선행되어야 하나 둘 다 설계 단계.
- Certificate 메커니즘의 governance(만료 추적/trust chain)는 Certificate Governance(§3-6 자매편, §13)가 먼저 확정되어야 `auth_mechanism='Certificate'` row가 완전해진다.
