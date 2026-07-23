# GeniegoROI Claude Code Implementation Specification

# CCIS Part030 — Identity Management, IAM, SSO & Enterprise Access Control Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Identity Management(IAM)·SSO·Enterprise Access Control·Identity Federation 표준을 수립한다.

> ★**성격(강한 스택 — Enterprise IAM 실재)**: 인증·접근제어는 이 저장소가 **은행급 보안**(헌법 9대 원칙)을
> 지향하는 **강한 영역**이다. 명세가 요구하는 **SSO(OIDC/SAML 2.0)·SCIM 2.0·MFA(TOTP)·RBAC+Scope·JIT
> 프로비저닝·세션 관리·Identity Audit·Access Review**는 **실재**한다. `EnterpriseAuth`(245차)가 **OIDC**
> (Authorization Code·id_token RS256/JWKS·state/nonce CSRF·replay 방어)·**SAML 2.0**(HTTP-POST ACS·
> ds:Signature 검증=exclusive C14N+RSA-SHA256+digest·`saml_consumed_assertion` 리플레이 방어 261차)·
> **SCIM 2.0**(/scim/v2/Users·Groups·Bearer 해시룩업)를 **외부 라이브러리 없이 실구현**했다. `UserAuth`는
> **RFC 6238 TOTP MFA**(AES-256-GCM 봉투·정책 off/admin/all)·세션토큰 **hash-only 게이트**(289차후속)를,
> `AccessReview`(v424·EPIC06-A)는 **휴면/만료 접근권한 검토+회수+`SecurityAudit` 증거**를 제공한다. 명세의
> **LDAP/Active Directory·WebAuthn/FIDO2/Passkey(Passwordless)·형식 PAM 솔루션**은 **부재**(grep 0). Part001
> §4 에 따라 실측 → 부재 항목 증명 → 실 IAM 스택 성문화했다. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 IAM 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| IAM Architecture(AuthN/AuthZ 분리) | 인증·인가 분리 | ★**준수** — `index.php` 미들웨어(AuthN=api_key/세션)→RBAC(AuthZ). 관심사 분리 |
| Identity Provider(IdP) | Entra/Okta/Auth0/Keycloak | ★**IdP-agnostic** — `sso_config`(oidc_issuer/authorize/token/jwks·saml_idp_*) 설정형. 특정 IdP 하드코딩 안 함 |
| Identity Federation(OIDC/SAML) | 외부 Enterprise 연동 | ★**실재** — `EnterpriseAuth` OIDC+SAML Federation. 테넌트별 `sso_config` |
| OAuth 2.1(PKCE/ClientCred) | first-party 인증 Flow | **부분(외부채널)** — `OAuth`(v425)=채널/광고 연동 토큰(Meta/Google 등)·`state` CSRF. first-party PKCE는 세션/api_key 사용 |
| OIDC | ID Token/JWKS/Discovery | ★**실재** — Authorization Code·**id_token RS256/JWKS 검증**+userinfo 폴백·state/nonce replay 방어 |
| SAML 2.0 | ACS/Assertion 검증/암호화 | ★**실재** — HTTP-POST ACS·**ds:Signature 검증**(C14N+RSA-SHA256+digest)·**assertion 리플레이 방어**(261차) |
| SCIM 2.0 | User/Group 프로비저닝 | ★**실재** — /scim/v2/Users·Groups CRUD·Bearer `scim_token`(sha256 해시룩업→테넌트) |
| LDAP/Active Directory | Directory 연동 | **부재**(grep 0). SSO(OIDC/SAML)로 Enterprise 연동 대체 |
| JIT Provisioning | 최초 로그인 자동생성 | ★**실재** — `auto_provision`·`app_user`(tenant owner 하위 SSO/SCIM 유저 생성) |
| Identity Lifecycle | Create→Suspend→Disable | **부분** — app_user 생성/활성·`is_active`·SCIM deactivate. 형식 상태머신 부분 |
| MFA | TOTP/Push/WebAuthn/OTP | ★**TOTP 실재**(RFC 6238·AES-256-GCM 봉투·정책 off/admin/all·enrolled 항상검증). Push/WebAuthn 부재 |
| Passwordless(Passkey/FIDO2) | WebAuthn | **부재**(grep 0). 비밀번호+TOTP MFA가 정본 |
| Session Federation(SLO/Revoke) | Global Logout | **부분** — 세션 만료·revoke·hash-only 게이트. 형식 SLO(Single Logout) 부분 |
| Access Governance(User/Role/Policy) | PBAC | ★**대응물** — RBAC+Scope·`TeamPermissions`·`AdminMenu`·`RuleEngine`·`AccessReview`. 형식 PBAC 엔진 부분 |
| PAM(특권 계정) | Vault/세션기록/승격 | **부재(대응물)** — 형식 PAM 없음. admin role+MFA+`AccessReview`+`SecurityAudit`가 특권 통제 |
| Authorization(RBAC/ABAC/Policy) | 권한 엔진 | ★**RBAC+Scope 실재**(viewer<connector<analyst<admin·write:*/write:ingest/admin:keys). ABAC 부분(`TeamPermissions`·테넌트/팀 속성) |
| Identity Audit | Login/Role/Session 감사 | ★**실재** — `SecurityAudit` 해시체인(유일 tamper-evident)·인증 이벤트 기록 |
| Identity Monitoring | Failed Login/이상감지 | ★**부분 준수** — 로그인 rate-limit(189차)·`AnomalyDetection`·`Alerting`. 실시간 대시보드 부분 |
| Security(Token/Secret/CSRF/Replay) | KMS/Secret Manager | ★**준수(부분)** — `Crypto` AES-256-GCM·state/nonce·SAML replay 방어·CSRF. 형식 KMS/Vault 아님(Part006) |
| Compliance(ISO/SOC2/GDPR/NIST) | 규정 | **부분** — GDPR(`GdprConsent`/`Dsar`)·PII 미저장. ISO/SOC2/NIST 형식 인증 아님 |
| Disaster Recovery | Identity/Key Backup | **부분** — DB 백업(app_user/sso_config·Part015). Federation Recovery 절차 부분 |
| Logging(Trace/마스킹) | 인증 로그 | **부분** — `SecurityAudit`·error_log. Trace ID 부재·민감정보 미기록(Part023) |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Identity First/Zero Trust/Federation/Least Privilege/Continuous Auth/Auditable/Tenant Aware) | **★대체로 준수** | ★Least Privilege(RBAC+Scope)·Auditable(SecurityAudit)·Tenant Aware(authedTenant 격리)·Federation(OIDC/SAML). Passwordless Ready=부분 |
| §4 IAM Architecture | **★준수** | AuthN(미들웨어)→AuthZ(RBAC) 분리 |
| §5 Identity Provider | **★IdP-agnostic** | `sso_config` 설정형·특정 IdP 하드코딩 안 함 |
| §6 Identity Federation | **★준수** | OIDC+SAML Federation(테넌트별) |
| §7 OAuth 2.1 | **부분(외부채널)** | `OAuth`(v425)=채널 연동 토큰·state CSRF. first-party PKCE는 세션/api_key |
| §8 OIDC | **★준수** | Authorization Code·id_token RS256/JWKS·userinfo·state/nonce replay |
| §9 SAML 2.0 | **★준수** | HTTP-POST ACS·ds:Signature 검증·assertion 리플레이 방어(261차) |
| §10 SCIM 2.0 | **★준수** | /scim/v2/Users·Groups·Bearer 해시룩업·deactivate |
| §11 LDAP/AD | **부재** | Directory 연동 없음. SSO(OIDC/SAML)로 대체 |
| §12 JIT Provisioning | **★준수** | auto_provision·app_user(tenant owner 하위) |
| §13 Identity Lifecycle | **부분** | 생성/활성/`is_active`/SCIM deactivate. 형식 상태머신 부분 |
| §14 MFA | **★TOTP 준수** | RFC 6238·AES-256-GCM·정책 off/admin/all·enrolled 항상검증. Push/WebAuthn 부재 |
| §15 Passwordless | **부재** | WebAuthn/FIDO2/Passkey 없음. 비밀번호+TOTP MFA |
| §16 Session Federation | **부분** | 세션 만료·revoke·hash-only 게이트. 형식 SLO 부분 |
| §17 Access Governance | **★대응물** | RBAC+Scope·`TeamPermissions`·`AdminMenu`·`AccessReview`·`RuleEngine` |
| §18 PAM | **부재(대응물)** | 형식 PAM 없음. admin role+MFA+AccessReview+SecurityAudit |
| §19 Authorization | **★RBAC 준수·ABAC 부분** | RBAC+Scope(viewer<connector<analyst<admin). ABAC=`TeamPermissions`(테넌트/팀 속성) |
| §20 Identity Audit | **★준수** | `SecurityAudit` 해시체인(유일 tamper-evident) |
| §21 Identity Monitoring | **부분 준수** | 로그인 rate-limit·`AnomalyDetection`·`Alerting`. 대시보드 부분 |
| §22 Security | **★준수(부분)** | `Crypto` AES-256-GCM·state/nonce·SAML replay·CSRF. KMS/Vault 아님 |
| §23 Compliance | **부분** | GDPR(`GdprConsent`/`Dsar`)·PII 미저장. ISO/SOC2/NIST 형식 인증 아님 |
| §24 Disaster Recovery | **부분** | DB 백업(app_user/sso_config). Federation Recovery 절차 부분 |
| §25 Logging | **부분** | `SecurityAudit`·error_log. Trace ID 부재·민감정보 미기록 |
| §26~§27 PHP/Claude(OIDC/SAML/SCIM/JWT/MW) | **★대체로 준수** | ★OIDC/SAML/SCIM/TOTP 실구현·JWT/JWKS 검증·PSR-15 유사 미들웨어. LDAP/WebAuthn Client 부재 |
| §28~§29 검증(oidc:health/saml:metadata 등) | **대상 없음** | artisan 없음. `/v430/sso/*`·`/scim/v2/*`·`/auth/sso/*`·`AccessReview` API 로 대체 |

---

## 4. 확립된 표준 (신규 IAM 코드가 따를 정본)

- ★**Enterprise SSO 정본 = `EnterpriseAuth`**(OIDC/SAML/SCIM). 신규 IdP 연동은 이 핸들러 확장(중복 인증 인프라 신설 금지). ★**기존 인증 재사용**(`user_session`·`app_user`·`authedTenant`·`Crypto`) — 245차 "중복0" 원칙.
- ★**세션 = hash-only 게이트**(289차후속): `user_session` 조회는 **반드시 `hashToken(입력)`**. raw 비교 시 전면 401+저장해시 replay(289차후속 수정). raw/sha256 둘 다 64-hex라 실측 필수.
- ★**MFA = RFC 6238 TOTP**(`UserAuth`·AES-256-GCM 봉투·정책 off/admin/all·enrolled 항상검증). 신규 고위험 작업은 이 MFA 게이트 재사용. **mfa_secret 평문 저장 금지**(봉투 암호화).
- ★**RBAC+Scope 정본**: `viewer<connector<analyst<admin`+scopes(`write:*`/`write:ingest`/`admin:keys`). 쓰기=analyst+·ingest=connector+·키관리=admin:keys(index.php 미들웨어). ABAC 속성은 `TeamPermissions`.
- ★**Identity Audit = `SecurityAudit`**(유일 tamper-evident 해시체인·`verify()`). 인증/권한변경 이벤트 기록. **재오염 금지**(참조·흡수 아님).
- ★**Access Governance = `AccessReview`**(v424): 휴면/만료 검토+회수(api_key `is_active=0` 재사용)+증거 필수(justification·fail-secure admin 전용). ★**정직 범위**: 현재 api_key 축만(app_user tenant_id 부재 Db.php:1099 → tenant 확정 후 확장).
- ★**테넌트 격리 절대**: 모든 identity 조회는 위조 불가 권위 tenant(`authedTenant`). SSO state→tenant·SCIM 토큰→tenant 격리·SAML assertion 테넌트 귀속.
- ★**SAML/OIDC 보안**: ds:Signature·id_token 서명 검증 생략 금지·state/nonce CSRF·assertion 리플레이 방어(`saml_consumed_assertion`) 유지.

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **LDAP/Active Directory/Entra Domain Services 직접 연동** — 안 함. Enterprise 연동은 SSO(OIDC/SAML)로 커버(대다수 IdP가 OIDC/SAML 제공). LDAP 바인드 요구 고객 발생 시 도입.
2. **Passwordless(WebAuthn/FIDO2/Passkey)** — 안 함. 비밀번호+TOTP MFA가 정본. Passkey 도입=브라우저 credential API+attestation 검증 선행.
3. **형식 PAM 솔루션(Vault/세션 레코딩/JIT 승격)** — 안 함. admin role+MFA+`AccessReview`+`SecurityAudit`가 특권 통제. 전용 PAM=인프라 도입.
4. **OAuth 2.1 PKCE first-party 인증** — 부분. `OAuth`(v425)는 **외부 채널 연동 토큰**(Meta/Google). first-party 인증은 세션/api_key. first-party OAuth 서버화 미도입.
5. **형식 SLO(Single Logout)·Identity Lifecycle 상태머신·형식 KMS/Vault** — 부분. 세션 revoke·hash-only 게이트·`Crypto` AES 봉투가 대응물.
6. **ISO 27001/SOC 2/NIST 800-63 형식 인증** — 안 함. 기술 통제(MFA/RBAC/감사/암호화)는 준수하되 형식 인증서는 별도 프로세스.
7. **artisan `oidc:*`/`saml:*`/`scim:*`/`ldap:*` 명령** — 없음(Slim). `/v430/sso/*`·`/scim/v2/*`·`/auth/sso/*`·`AccessReview` API 로 대체.

★**준수하는 실 원칙(강함)**: **OIDC/SAML/SCIM 실구현·MFA(TOTP)·RBAC+Scope(Least Privilege)·세션 hash-only 게이트·SecurityAudit(tamper-evident)·AccessReview·테넌트 격리 절대·서명/리플레이 방어·Crypto AES 봉투·writeGuard 서버전역**.

---

## 6. Claude Code 구현 규칙

1. Enterprise SSO/프로비저닝=`EnterpriseAuth`(OIDC/SAML/SCIM) 확장(중복 인증 인프라 금지). 기존 `user_session`/`app_user`/`authedTenant`/`Crypto` 재사용.
2. ★세션 검증=`hashToken(입력)` 게이트(raw 비교 금지·289차후속). MFA=`UserAuth` TOTP 게이트 재사용·`mfa_secret` 봉투 암호화.
3. ★인가=RBAC+Scope(index.php 미들웨어). 쓰기 analyst+·ingest connector+·키관리 admin:keys. ABAC 속성=`TeamPermissions`.
4. ★Identity Audit=`SecurityAudit` 해시체인 기록(재오염 금지·verify()가 정본). Access Governance=`AccessReview` 확장(회수=api_key is_active=0·증거 필수).
5. ★테넌트 격리 절대(`authedTenant`)·SAML/OIDC 서명 검증 생략 금지·state/nonce·assertion 리플레이 방어 유지.
6. LDAP/WebAuthn/FIDO2/형식 PAM/KMS 를 "명세에 있다"는 이유로 이식하지 않는다(현 SSO/MFA/RBAC/AccessReview 로 커버). Passwordless/PAM 은 고객 요구·인프라 확보 후 재검토.

---

## 7. Completion Criteria

- [x] IAM 스택 **실측**(OIDC/SAML/SCIM/TOTP MFA/RBAC+Scope/세션 hash-only/AccessReview/SecurityAudit 실재·LDAP/WebAuthn/PAM 부재)
- [x] 명세 §3~§29 **섹션별 매핑·판정**(LDAP/AD·Passwordless·형식 PAM·OAuth2.1 first-party 부재/부분 증명)
- [x] 실 IAM(EnterpriseAuth SSO/SCIM+TOTP MFA+RBAC+SecurityAudit+AccessReview) 성문화(§4)
- [x] ★Least Privilege·세션 hash-only 게이트·서명/리플레이 방어·테넌트 격리·tamper-evident 감사 명시
- [x] 의도적 미적용 + 사유(§5) — LDAP/Passwordless/PAM/OAuth2.1 first-party/SLO/형식 인증
- [x] Claude Code 규칙(§6) · `/v430/sso/*`·`/scim/v2/*`·`AccessReview` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 이 시리즈에서 **가장 강한 스택**의 성문화다 — OIDC/SAML 2.0/SCIM
> 2.0/MFA(TOTP)/RBAC+Scope/세션 hash-only/AccessReview/SecurityAudit 가 **외부 라이브러리 없이 실구현**돼
> 있다. 부재(LDAP·Passwordless·형식 PAM)는 SSO/MFA/RBAC/AccessReview 로 커버되며, 이식이 아니라 **기존 인증
> 인프라 확장**(245차 "중복0")이 정본이다.

---

## 다음 Part

**CCIS Part031 — Financial System, Accounting, Tax & Revenue Management** — ★사전 실측 예고: 형식 복식부기 GL/전자세금계산서/ERP 연계는 **부재/부분**하나, 재무 실체는 **`Pnl`(실순이익=광고비·원가·물류비·반품비·수수료·다통화)·`Rollup`(정산 집계)·`PgSettlement`(PG 정산)·VAT/부가세(288차)·`CurrencyProvider`(다통화 FX)·Paddle/Stripe 빌링·`CouponRedeem`(TOCTOU 수정)**로 실재. Part031 도 실측→복식부기/전자세금계산서 부재증명→Pnl/Rollup/PgSettlement/VAT/FX 성문화(ERP 이식 금지). ★주의: 손익 계산은 강한 역량(핵심 경쟁력)이나 회계 원장(GL)은 별개.
