# DSAR — Authorization Federation & Cross-Domain Governance: 실존 구현 substrate 전수조사 (Ground-Truth ①)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> 본 문서는 Part 3-18 설계의 반날조 인용 **정본 허용목록**이다. 하위 per-entity DSAR은 본 문서 + Ground-Truth ② + ADR 등장 `파일:라인`만 인용.

---

## 0. 조사 범위·방법

- 대상: `backend/src/`·`backend/public/index.php`·`backend/src/routes.php`. 읽기 전용. 배제: `_be_*/`·`clean_src/`·`backup/`.
- 방법: EnterpriseAuth/Crypto/AgencyPortal/PartnerPortal/TeamPermissions/SecurityAudit 정독 + federation/trust/cross_domain/remote_pdp/policy_federation grep. 2 Explore 스레드(49 tool-use) 상호검증. 라인 실측.

## 1. 핵심 판정 요약

**INBOUND 아이덴티티 federation(SSO OIDC/SAML + SCIM 2.0)은 실재·성숙**(`EnterpriseAuth.php` 전용 핸들러 668라인). 그러나 **CROSS-DOMAIN 인가 federation**(remote PDP·trust broker·policy federation·federation contract/metadata·조직간 신뢰)은 **부재(grep 0)**. `federation|cross_domain|remote_pdp|trust_broker|policy_federation` authz 매치 0.

- **★§5 Identity Federation EXTEND 정본 = `EnterpriseAuth.php`**(OIDC Authorization Code RS256/JWKS·SAML HTTP-POST ACS 서명검증 XSW방어·SCIM 2.0 Users/Groups·sso_config/sso_state/saml_consumed_assertion/sso_group_role_map). "중복0" 명시(`:10-25`)·기존 user_session/app_user/tenant 격리 재사용. 신설 금지.
- **★유일 KEK 회전 = `Crypto.php`**(AES-256-GCM·버전형 KEK 비파괴 회전·HMAC). §13 Key Manager의 PARTIAL substrate(HSM/KMS/mTLS/X.509 발급 없음).
- **★멀티조직 최근접 = `AgencyPortal.php`**(대행사↔클라이언트 N:N 위임·owner 승인·per-request fail-closed 재검증). 단일 authz 도메인 내 위임이지 도메인간 federation 아님.
- **★Evidence 실체 = SecurityAudit 해시체인**(`SecurityAudit.php:14-67`·verify). Federation Evidence(§21) substrate.
- **★KEEP_SEPARATE**: OAuth.php(광고/커머스 커넥터)·ChannelSync/ChannelCreds(커머스 자격증명)·Connectors(connector_token)·Paddle/Payment(PG)·DataExport(클라우드 자격증명)·DataTrust(GT② §B). authz federation 아님.

## 2. 실존 substrate 카탈로그

### A. Inbound Identity Federation — SSO/SCIM (PRESENT — §5 EXTEND 정본)

| 파일:라인 | 심볼 | 설명 | Part3-18 매핑 |
|---|---|---|---|
| `EnterpriseAuth.php:10-25` · `:19-24` · `:26` | SSO(OIDC/SAML)+SCIM 핸들러·"중복0" 명시 | 기존 auth infra 재사용 | Identity Federation(§5·EXTEND) |
| `EnterpriseAuth.php:43-54` · `:55` · `:57` · `:59` · `:70-72` | sso_config/sso_state/saml_consumed_assertion(replay)/sso_group_role_map DDL(self-healing) | 실 테이블 | Metadata(§11)·group→role |
| `EnterpriseAuth.php:94` · `:123` · `:129` · `:133` · `:161` | getConfig/saveConfig(secret Crypto 암호화)·rotateScimToken | 설정·토큰 | Metadata/Key |
| `EnterpriseAuth.php:175` · `:194-195` · `:206` · `:522` · `:536` · `:538-541` · `:546` | OIDC login(state/nonce)·oidcCallback·verifyIdToken(RS256/JWKS·aud/iss/exp/nonce)·jwkToPem | 외부 IdP JWT 검증(유일 federation token 검증) | Cross-Domain Identity(§5)·Trust(§8) |
| `EnterpriseAuth.php:250` · `:275` · `:279-286` · `:307` · `:575` · `:575-626` · `:596-623` · `:597-598` | samlAcs·assertion expiry·replay consume·samlMetadata·verifySamlSignature(exclusive C14N·RSA-SHA256·XSW방어·IdP cert PEM) | SAML 서명검증 | Certificate(§12·IdP cert 소비만) |
| `EnterpriseAuth.php:322-441` · `:323` · `:348` · `:359` · `:367` · `:388` · `:412` · `:424` · `:433` · `:443-465` | SCIM 2.0(scimAuth Bearer·List/Get/Create/Update/Delete Users·Groups·group→role) | 프로비저닝 | Identity Federation(§5) |
| `EnterpriseAuth.php:483` · `:483-511` · `:513` | provisionUser(app_user.parent_user_id/team_role·tenant owner)·issueSession(user_session) | 테넌트 모델 편입 | Context(§19)·무중복 |
| `routes.php:925-942` · `:931` | `/v430/sso/*`·`/auth/sso/*`·`/scim/v2/*`·kek-rotate 라우트 | 라우트 | API(§32) |
| `index.php:268-273` · `:266-267` | SSO config 세션게이트·`/auth/sso/*` public bypass·`/scim/*` Bearer scim_token | 미들웨어 배선 | PEP |
| `Compliance.php:71-73` · `:95-98` | sso_config enabled/scim_token 카운트→control 증거 | compliance 소비 | Compliance Federation(§9) |

### B. Crypto / KEK (PARTIAL — §13 Key Manager·PKI/mTLS 없음)

| 파일:라인 | 심볼 | 설명 | Part3-18 매핑 |
|---|---|---|---|
| `Crypto.php:19` · `:108` · `:121` · `:125` · `:113-114` · `:122-123` · `:162` · `:177` | AES-256-GCM encrypt/decrypt(envelope enc:vN:·fail-closed·평문폴백 없음) | at-rest 암호화 | Key Manager(§13) |
| `Crypto.php:35` · `:45-74` · `:96` · `:133` · `:148` | keyForVersion·key(CRED_ENC_KEY→app_setting)·hmacTag·rotateKek(cred_kek_vN·active 포인터) | 버전형 KEK 비파괴 회전 | Key Rotation/Versioning(§13) |
| `EnterpriseAuth.php:466-473` · `:467` | rotateKek 호출부(admin) | KEK 회전 | Key Rotation(§13) |
| `Compliance.php:87` | APP_KEY=at-rest 구성 boolean 신호 | 암호화 구성 | — |
| `NaverSms.php:94` · `:119` | HMAC-SHA256 서명·secret Crypto 소비 | 소비처 | — |

★X.509는 IdP SAML cert·JWKS RSA 소비만(`EnterpriseAuth.php:597-598`). mTLS·cert 발급/회전·CA/keystore 부재=§12 Certificate Manager ABSENT.

### C. Multi-org 위임 (PARTIAL — AgencyPortal·플랫폼 내부·도메인간 아님)

| 파일:라인 | 심볼 | 설명 | Part3-18 매핑 |
|---|---|---|---|
| `AgencyPortal.php:32` · `:50` · `:56-81` | agency_account/agency_client_link(N:N·status pending→approved→revoked·scope_json)/agency_session(agt_) DDL | 3계층 격리 | Federation Domain(§3·근접) |
| `AgencyPortal.php:317` · `:367` · `:390` · `:404` | switchClient(act-as)·approveAgency(client owner 승인)·revokeAgency(즉시 fail-closed) | 조직간 위임 승인 | Trust(§4·owner 승인 링크만) |
| `AgencyPortal.php:416` · `:429` · `:430` · `:432` · `:497-501` | resolveAccessContext(status=approved·session↔link tenant·write-scope 재검증)·audit→SecurityAudit | per-request fail-closed(cross-org PEP 근접) | Cross-Domain PEP(§18·단일도메인) |
| `index.php:103-123` · `:110-115` · `:111-115` · `:117-121` | agt_ 브랜치(context 해석·서버도출 client tenant 주입·read-only 시 write 차단) | 미들웨어 집행 | PEP |
| `PartnerPortal.php:17-62` · `:27` · `:47` · `:52-66` · `:226` | partner_account/partner_session(bcrypt·본사 세션 분리)·scoped data | 테넌트 내 서브계정 | Domain(§3·intra-tenant·federation 아님) |
| `routes.php:301-304` | partner 라우트 | 라우트 | — |

### D. Machine Identity / PDP / PEP / Tenant 격리 (PRESENT — 로컬·단일도메인)

| 파일:라인 | 심볼 | 설명 | Part3-18 매핑 |
|---|---|---|---|
| `Db.php:942-955` · `:942-958` · `:956` · `:961-973` | api_key(tenant_id/key_hash/role/scopes_json/expires) DDL·connector_token | 단일테넌트 머신 identity | Federation Key(§13·내부만) |
| `index.php:502-508` · `:518` · `:527-570` · `:573-597` · `:604-606` · `:619` · `:439` · `:461` | Bearer/api_key sha256·expiry·rate-limit·RBAC 랭크/scope·X-Tenant-Id 서버강제(위조차단) | PEP·tenant 격리 | Cross-Domain PEP(§18) 대상·Tenant Isolation(§33) |
| `TeamPermissions.php:16` · `:33` · `:695` · `:704` · `:715-731` · `:737-749` | effectivePermissions(PDP)·assignablePermissions(위임상한)·teamAudit·ORG_PRESET | 로컬 권한 결정 | Cross-Domain PDP(§17) 대상 |
| `index.php:78-89` | guardTeamWrite 전역 write 가드 | PEP | 집행점 |
| `CreativeStore.php:207-217` · `index.php:205` · `:218-220` | opaque user_session(구 무서명 JWT 폐기·서명/외부발급 없음) | 세션 토큰=JWT 아님 | Context(§19·내부) |

### E. Immutable Evidence (PRESENT — SecurityAudit·단일노드)

| 파일:라인 | 심볼 | 설명 | Part3-18 매핑 |
|---|---|---|---|
| `SecurityAudit.php:12` · `:14` · `:14-67` · `:27` · `:28-31` · `:35` · `:40` · `:43-52` · `:56` · `:62-67` · `:71` · `:93` · `:118` | 해시체인 log(sha256 prev\|tenant\|actor\|action\|details\|now)·lastHash(GENESIS)·verify(broken_at)·recent | tamper-evident(단일노드·도메인간 교환 없음) | Federation Evidence(§21·PRESENT substrate) |
| `Db.php:27` · `:35` · `:65-86` · `:315-317` | PDO 싱글톤·prod/demo·self-healing ensureTables·app_setting(KEK 저장) | DB 인프라 | 신규 테이블 대상 |

## 3. 종합 판정

**Authorization Federation = EXTEND-EnterpriseAuth(SSO OIDC/SAML+SCIM 실재·§5) + PARTIAL(Crypto KEK·AgencyPortal 멀티조직 위임·api_key 머신 identity·외부 IdP JWT 검증·로컬 PDP/PEP) + PRESENT(SecurityAudit evidence·tenant 격리) / ABSENT-cross-domain(Federation Registry/Directory·Trust Manager/Engine·Cross-Domain Authorization Federation·Policy Federation Engine·Federation Contract/Metadata/Certificate Manager·Key Manager 확장(HSM/KMS/mTLS)·Federation Sync/Routing/Decision Broker·Cross-Domain PDP/PEP·Context Exchange·Snapshot/Evidence(federation)/Digest/Analytics/Drift/Simulation/Revalidation/Reconciliation·Runtime Guard/Static Lint 순신규).** 재활용(흡수 아님·확장): EnterpriseAuth→Identity Federation·Crypto KEK→Key Manager·AgencyPortal 위임→Multi-org/Cross-Domain PEP 근접·SecurityAudit→Federation Evidence·TeamPermissions/index.php→Cross-Domain PDP/PEP 대상. ★커머스/광고 OAuth·PG·DataExport·DataTrust(GT②)는 **흡수·오판 금지**.
