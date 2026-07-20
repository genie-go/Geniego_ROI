# ADR — Authorization Federation & Cross-Domain Governance Foundation

- **Status**: PROPOSED · NOT_CERTIFIED · BLOCKED_PREREQUISITE (설계 명세 · 코드 변경 0)
- **EPIC**: 06-A-03-02-03-04 Part 3-18
- **Date**: 2026-07-20
- **상위 SPEC**: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md` (canonical 원문 verbatim · Version 1.0)
- **Ground-Truth**: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
- **선행 계보**: Part 1~3-17 전체 — federation이 도메인간 연합할 통제(RBAC/PDP/PEP/Zero Trust/Compliance/Fabric)

---

## 1. Context

Part 3-18은 GeniegoROI Authorization Platform을 조직·기업·리전·클라우드·SaaS·B2B 파트너·정부기관을 아우르는 **Cross-Domain Authorization Federation**으로 확장한다(SAML/OAuth/OIDC/SCIM identity federation·trust manager·certificate/key manager·cross-domain PDP/PEP·policy federation·federation contract/metadata). Federation 환경에서도 Zero Trust·Least Privilege·Continuous Authorization 유지.

**★현 실측(2 스레드 상호검증·GT①②)**: **INBOUND 아이덴티티 federation(SSO OIDC/SAML + SCIM 2.0)은 실재·성숙**(`EnterpriseAuth.php` 668라인·OIDC RS256/JWKS `:522-543`·SAML XSW방어 서명검증 `:575-626`·SCIM 2.0 `:322-441`·sso_config/sso_state/saml_consumed_assertion/sso_group_role_map). 그러나 **CROSS-DOMAIN 인가 federation**(Federation Registry·Trust Manager/Engine·Cross-Domain Authorization Federation·Policy Federation·Contract/Certificate Manager·Sync/Routing/Decision Broker·Cross-Domain PDP/PEP·Context Exchange·Snapshot/Digest/Analytics/Drift/Simulation/Reconciliation·Guard/Lint)은 **부재(grep 0)**. `Crypto.php` KEK 회전=§13 PARTIAL(PKI/mTLS 없음)·`AgencyPortal.php` 멀티조직 위임=단일도메인 내부.

## 2. Ground-Truth 판정 (2 스레드 상호검증)

### 2.1 실존 substrate (GT①)
- **★§5 EXTEND 정본 = `EnterpriseAuth.php`**(SSO OIDC/SAML+SCIM·"중복0"·`:10-25`·기존 user_session/app_user/tenant 재사용).
- **Key(PARTIAL)**: Crypto AES-256-GCM+KEK 버전 회전(`Crypto.php:108-148`·PKI/mTLS/X.509 발급 없음).
- **Multi-org 위임(PARTIAL)**: AgencyPortal N:N·owner 승인·per-request fail-closed 재검증(`AgencyPortal.php:317`·`:416`·단일도메인).
- **Machine identity(PRESENT)**: api_key 단일테넌트(`Db.php:942-955`·`index.php:502-619`).
- **외부 IdP JWT 검증(PARTIAL)**: `EnterpriseAuth.php:522-543`(발급은 없음·opaque user_session).
- **로컬 PDP/PEP(PRESENT)**: `TeamPermissions.php:695`·`index.php:78-89`·`:573-619`.
- **Evidence(PRESENT)**: SecurityAudit 해시체인(`SecurityAudit.php:14-67`).

### 2.2 거버넌스 계층 (GT②)
Federation Registry/Directory·Trust Manager/Engine·Cross-Domain Authorization Federation·Policy Federation·Federation Contract/Metadata/Certificate Manager·Key Manager 확장·Sync/Routing/Decision Broker·Cross-Domain PDP/PEP·Context Exchange·Snapshot/Digest/Analytics/Drift/Simulation/Revalidation/Reconciliation·Guard/Lint = **grep 0**. ★KEEP_SEPARATE: OAuth/ChannelSync/ChannelCreds/Connectors/AdAdapters(커머스·광고 OAuth)·Paddle/Payment(PG)·DataExport(클라우드 자격증명)·OpenPlatform/Webhooks(로컬 ingest)·DataTrust/GraphScore(데이터·ML)·MediaHost(CDN).

### 2.3 종합
**판정 = EXTEND-EnterpriseAuth(§5) / PARTIAL(Crypto KEK·AgencyPortal 위임·api_key·IdP JWT 검증·로컬 PDP/PEP) / PRESENT-evidence·tenant 격리 / ABSENT-cross-domain / 커머스·광고·PG·데이터 KEEP_SEPARATE.**

## 3. Decision

### D-1. §5 Identity Federation은 `EnterpriseAuth.php` 확장 (Golden Rule EXTEND·병렬 identity stack 금지)
현 SSO OIDC/SAML+SCIM(`EnterpriseAuth.php:175-543`·`:322-441`)를 Cross-Domain Identity Federation(§5·SAML/OAuth/OIDC/SCIM/JWT/X.509/mTLS)로 확장. ★"중복0" 원칙(`:10-25`) 계승·기존 user_session/app_user/tenant 격리 재사용·**병렬 아이덴티티 stack 신설 금지**. mTLS·X.509 클라이언트 인증은 신규(현 IdP cert 소비만).

### D-2. §13 Key Manager는 Crypto KEK 확장 (HSM/KMS/cert 발급 신설)
`Crypto.php`(AES-256-GCM·버전형 KEK 비파괴 회전 `:133`)를 Federation Key Manager(§13·Key Rotation/Versioning/Revocation)의 baseline로 확장. ★HSM/KMS 통합·§12 Certificate Manager(Root/Intermediate/Client cert·rotation/revocation·CA/keystore)는 순신규(현 cert=IdP SAML cert 소비만).

### D-3. Multi-org 위임을 Cross-Domain PEP/Trust의 근접 baseline로
`AgencyPortal.php`(owner 승인 링크 `:367`·per-request fail-closed 재검증 `:416`·즉시 revoke `:404`)를 §4 Trust Model(owner 승인)·§18 Cross-Domain PEP(위임 집행)의 **개념 근접물**로 참조. ★단일 authz 도메인 내 위임이므로 도메인간 remote enforcement·trust broker는 순신규(흡수·개명 금지).

### D-4. Cross-Domain PDP/PEP는 로컬 PDP/PEP를 원격 확장 (재구현 금지)
§17 Cross-Domain PDP는 로컬 PDP(`TeamPermissions.php:695` effectivePermissions)를, §18 Cross-Domain PEP는 로컬 PEP(`index.php:573-619`·tenant 강제 `:619`)를 **원격/공유/게이트웨이/mesh 집행으로 확장**. Decision Broker(§16·local/remote/hybrid/consensus)·Remote PDP는 순신규. 로컬 통제 재구현 금지.

### D-5. Federation Evidence/Snapshot은 SecurityAudit 확장
Federation Evidence(§21 Trust Validation/Decision/Certificate Validation/Policy Exchange/Contract Reference)·Snapshot(§20)·Immutable Trust History(§33)는 SecurityAudit 해시체인(`SecurityAudit.php:14-67`) 확장. ★현 단일노드 감사를 도메인간 evidence 교환으로 확장은 순신규.

### D-6. 외부 IdP JWT 검증을 Trust/Context 검증 seed로
`EnterpriseAuth.php:522-543`(외부 IdP id_token RS256/JWKS 검증)를 §8 Trust Federation Engine(Certificate Status)·§19 Context Exchange(least-disclosure) 검증의 seed로. ★현 검증은 로그인용이므로 cross-domain trust score·reputation은 순신규.

### D-7. Part 1~3-17과의 관계 (연합 대상·무중복)
Federation은 RBAC/PDP(3-12)/PEP/Zero Trust(3-13)/Compliance(3-17)/Fabric(3-16) 통제를 **도메인간 연합·라우팅·중개**한다. 각 통제 엔진 재구현 금지(중복 금지). Federation은 도메인간 신뢰·정책 교환·원격 결정만·로컬 집행은 기존 통제.

### D-8. ★커머스/광고/PG/데이터 흡수 절대 금지 (KEEP_SEPARATE)
OAuth.php(광고/커머스 OAuth)·ChannelSync/ChannelCreds/Connectors/AdAdapters(커머스·광고 자격증명)·Paddle/Payment(PG webhook)·DataExport(클라우드 export 자격증명)·OpenPlatform/Webhooks(로컬 ingest)·DataTrust/GraphScore(데이터·ML)·MediaHost(CDN)는 authz federation으로 **흡수·개명 금지**. ★"OAuth/token/trust/cross-region/cross-cloud" 동음이의는 커머스/광고/데이터 데이터플레인이지 authz federation 아님.

### D-9. 정직 분리
- **실재 과신 회피**: EnterpriseAuth=inbound 로그인/프로비저닝(cross-domain authz 결정 아님)·AgencyPortal=단일도메인 위임·Crypto=at-rest KEK(PKI 아님)·외부 JWT=검증만(발급 없음).
- **부재 과장 회피**: SSO/SCIM·KEK·위임·evidence·PDP/PEP는 실재(재활용). cross-domain federation 골격만 grep 0.
- **오흡수 회피**: 커머스/광고 OAuth·PG·export·데이터trust·CDN은 authz federation 아님.

## 4. Consequences

- **긍정**: 조직·리전·클라우드·B2B·정부 연합 인가·Zero Trust 유지·도메인간 정책 교환·원격 결정·고가용성.
- **비용**: 대규모 신규(Federation Registry·Trust Manager/Engine·Cross-Domain Authorization Federation·Policy Federation·Contract/Certificate Manager·Key Manager 확장·Sync/Routing/Decision Broker·Cross-Domain PDP/PEP·Context Exchange·Snapshot/Digest/Analytics/Drift/Simulation/Reconciliation·Guard/Lint). EnterpriseAuth/Crypto/AgencyPortal 확장.
- **선행 의존**: Part 1~3-17 인증 후 실 구현(BLOCKED_PREREQUISITE). Fabric(3-16)·Compliance(3-17) 통합층 선행.
- **무후퇴**: EnterpriseAuth·Crypto·AgencyPortal·PartnerPortal·SecurityAudit·로컬 PDP/PEP·커머스/광고/PG/데이터 유지·병행. Extend-only.

## 5. Compliance / Certification

- **NOT_CERTIFIED**: 코드 변경 0. SPEC은 사용자 제공 canonical 원문 verbatim(Version 1.0).
- 하위 per-entity DSAR은 본 ADR + GT①② 등장 `파일:라인`만 인용(반날조·허용목록 밖 0).
- Completion Gate·Performance(Cross-Domain Decision≤50ms·Trust Validation≤20ms·Metadata Sync≤30초·Cert Validation≤10ms·Availability≥99.999%)·Federation Validation(SAML/OAuth/OIDC/SCIM/ISO27001/NIST 800-63)·Regression은 실 구현 세션(RP-track) 조건.

---
**요약**: Authorization Federation & Cross-Domain Governance = EXTEND-`EnterpriseAuth.php`(SSO OIDC/SAML+SCIM inbound·§5) / PARTIAL(Crypto KEK·AgencyPortal 멀티조직 위임·api_key 머신 identity·외부 IdP JWT 검증·로컬 PDP/PEP) / PRESENT(SecurityAudit evidence·tenant 격리) / ABSENT-cross-domain(Federation Registry·Trust Manager/Engine·Cross-Domain Authorization Federation·Policy Federation·Contract/Certificate Manager·Key Manager 확장·Sync/Routing/Decision Broker·Cross-Domain PDP/PEP·Context Exchange·Snapshot/Digest/Analytics/Drift/Simulation/Reconciliation·Guard/Lint 순신규). Extend: EnterpriseAuth→Identity Federation·Crypto KEK→Key Manager·AgencyPortal 위임→Multi-org/Cross-Domain PEP 근접·SecurityAudit→Federation Evidence·PDP/PEP→Cross-Domain 대상·Part1~3-17 연합(무중복). 코드0·NOT_CERTIFIED·선행의존. **★커머스/광고 OAuth·PG·데이터 export·데이터trust·CDN 흡수 금지.**
