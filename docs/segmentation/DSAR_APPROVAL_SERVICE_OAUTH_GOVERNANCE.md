# DSAR — Approval Service OAuth Governance (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: OAuth Governance)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: 외부 벤더 자격증명 ≠ 내부 identity(오흡수 금지) · Require Rotation(운영 시 강제) · Golden Rule(근접 substrate 조립·중복 엔진 신설 금지) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

OAuth Governance는 스펙 §14가 정의하는 OAuth Client 통제(Client ID·Secret·Scope·Audience·Expiration·Rotation)이다. ADR D-1·ground-truth §3·§5는 현행 시스템의 유일한 OAuth Client 성격 substrate가 **`sso_config.oidc_client_secret`(SSO/OIDC 로그인 연동 클라이언트 시크릿)**이며, 이는 AES-256-GCM으로 암호화 저장되나 **만료(Expiration)·회전(Rotation) 정책은 갖추지 않는다**고 확정한다. 본 엔티티는 "OIDC client_secret이 암호화 저장된다"는 것과 "OAuth Client가 거버넌스된다(Scope/Audience 형식화·강제 만료·회전 정책)"는 것이 다른 계층임을 정직 구분한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `service_oauth_client_id` | OAuth Client Governance 레코드 식별자(PK) |
| `client_id` | OAuth Client ID(현행 미형식화 — Gap) |
| `client_secret_ref` | 암호화된 시크릿 참조(현행 `sso_config.oidc_client_secret` 재사용) |
| `governance_action` | §14 열거(Client ID/Secret/Scope/Audience/Expiration/Rotation) |
| `scope_set` | 허용 스코프 집합(현행 OAuth Client 전용 스코프 모델 없음 — Gap) |
| `expires_at` | 시크릿 만료 시각(현행 컬럼 없음 — Gap) |

## 3. 열거형 / 타입

- **`governance_action`**(스펙 §14 verbatim, 6종): `Client ID` · `Secret` · `Scope` · `Audience` · `Expiration` · `Rotation`.
- **`client_secret_state`**(정직 구분용 내부 태그, 비스펙): `ENCRYPTED_AT_REST_ONLY`(현행 `oidc_client_secret`이 이에 해당) · `LIFECYCLE_GOVERNED`(순신규, 현행 0건).

## 4. 실 substrate 매핑 (PARTIAL/ABSENT·ground-truth만 인용)

| 스펙 §14 항목 | 판정 | 실 substrate (file:line) |
|---|---|---|
| Client Secret(저장) | **PARTIAL/PRESENT(암호화만)** | `sso_config.oidc_client_secret` AES-256-GCM(`EnterpriseAuth.php:218`) |
| Client ID(형식화) | **ABSENT(미형식화)** | ground-truth에 `client_id` 전용 필드/검증 로직 미인용 |
| Scope(OAuth Client 전용) | **ABSENT** | api_key `scopes_json`(`Db.php:942-958`)은 API Client 스코프이지 OAuth Client 스코프 아님(엔티티 혼동 금지) |
| Audience(JWKS 소비 시 kid 매칭) | **PRESENT(근접·소비만)** | `EnterpriseAuth.php:522-531`(OIDC JWKS kid 매칭) |
| Expiration(client_secret 만료) | **ABSENT** | ground-truth §5 "client_secret 만료 관리 ... 부재" |
| Rotation(client_secret 회전) | **ABSENT** | rotate 대상 목록(api_key/KEK/SCIM, ground-truth §4)에 `oidc_client_secret` 미포함 — 회전 함수 자체가 없음 |
| SCIM 토큰(근접 Integration 인증) | **PRESENT(이중 저장)** | `sso_config.scim_token`+`scim_token_hash`(암호문+sha256, `EnterpriseAuth.php:132-134,169-170,329`)·회전(`EnterpriseAuth.php:917`, 수동) |

★ground-truth §5 원문: "client_secret 만료 관리 전 항목 부재". §4 원문: "SCIM 토큰 회전(`EnterpriseAuth.php:917`) ... 전부 수동 HTTP·자동/주기 스케줄 부재(bin 35 cron grep 0)". §3 원문: "SSO OIDC client_secret | `sso_config.oidc_client_secret` | AES-256-GCM(`EnterpriseAuth.php:218`)".

## 5. 설계 원칙

1. **`sso_config.oidc_client_secret`을 OAuth Client Secret substrate로 재사용(확장)** — 신규 시크릿 저장 테이블 재구현 금지. Crypto AES-256-GCM 봉투는 유지.
2. **api_key `scopes_json`을 OAuth Client Scope로 오흡수 금지** — API Client Identity(api_key)와 OAuth Client(sso_config)는 별개 엔티티. Scope 모델은 OAuth Client 전용으로 순신규 설계.
3. **SCIM 토큰 회전(`EnterpriseAuth.php:917`)을 OAuth Governance의 Rotation Adapter 참고 사례로 재사용** — 단 이는 SCIM 프로비저닝 토큰이지 OIDC client_secret 회전이 아니므로, client_secret 전용 회전 함수는 신규 구현이 필요함을 명시.
4. **Expiration/Rotation Policy는 순신규** — 근접 substrate가 client_secret에 대해 grep 0이므로 조립이 아니라 신설.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: OAuth Client Governance가 Service Identity Registry·Permission Engine과 결합되는 지점은 선행 실 구현 이후. 본 차수 코드 0.
- **Gap-1(client_secret 만료/회전 부재)**: `oidc_client_secret`은 암호화 저장만 되고 만료 컬럼·회전 함수가 ground-truth에 인용되지 않음 — 신규.
- **Gap-2(Scope/Audience 미형식화)**: OAuth Client 전용 Scope/Audience 모델 부재. api_key scope와 혼동 금지(별도 엔티티).
- **Gap-3(Client ID 미형식화)**: `client_id` 필드/검증 로직 ground-truth 미인용.
- **정직 부재**: `oidc_client_secret`이 암호화되어 있다고 해서 "OAuth Governance가 갖춰졌다"고 과신 금지 — at-rest 암호화(Crypto)와 생애주기 거버넌스(Expiration/Rotation)는 다른 계층. 289차 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic·Decision Core 실 구현 + 별도 승인세션(RP-002).
