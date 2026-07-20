# DSAR — Authorization Federation & Cross-Domain Governance: 거버넌스 부재 + 중복/근접물 감사 (Ground-Truth ②)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`. Ground-Truth ①: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`.
> (A) cross-domain 거버넌스 계층 ABSENT/PARTIAL 실측 + (B) ★KEEP_SEPARATE 동음이의(커머스/광고 OAuth·PG·데이터 export·데이터 trust·CDN).

---

## 1. 핵심 판정 — **cross-domain authz federation 골격 전면 부재, 실재는 inbound SSO/SCIM + 내부 위임**

`federation|Federat|cross_domain|CrossDomain|remote_pdp|trust_broker|policy_federation|federated` **authz 매치 0건**(false positive=`PriceOpt.php:1496`·`:1583` updProd의 "PDP" 부분일치). cross-domain 골격은 그린필드. 실재=inbound Identity Federation(EnterpriseAuth·GT① §A)·내부 멀티조직 위임(AgencyPortal·GT① §C). "trust/partner/OAuth/cross-region" 히트는 전부 커머스/광고/데이터 동음이의(§B).

## 2. 거버넌스 계층 실측표

| SPEC 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| Federation Registry / Directory / Domain Model(Enterprise/Subsidiary/Partner/Gov/SaaS/Cloud) | **ABSENT(grep 0)** | federation 도메인 모델 전무·최근접=AgencyPortal 3계층(`AgencyPortal.php:56-81`·플랫폼 내부) |
| Federation Trust Manager / Trust Federation Engine(Level/Direction/Scope/Score/reputation) | **ABSENT(grep 0)** | authz trust 전무·최근접=agency owner 승인 링크(`AgencyPortal.php:367`)·"trust" 히트=데이터/ML 동음이의(§B) |
| Cross-Domain Identity Federation(authz feature) | **PARTIAL(inbound만)** | EnterpriseAuth OIDC/SAML/SCIM(`EnterpriseAuth.php:175-543`)=inbound 로그인·프로비저닝·cross-domain authz 결정 아님 |
| Cross-Domain Authorization Federation(Remote/Delegated/Shared/Proxy/Federated Decision) | **ABSENT(grep 0)** | remote/delegated authz 전무·AgencyPortal 위임(`:317`·`:416`)=단일도메인 |
| Policy Federation Engine(Exchange/Translation/Version Sync/Conflict) | **ABSENT(grep 0)** | 정책 교환/번역 전무 |
| Federation Contract / Metadata / Certificate / Key Manager | **PARTIAL/ABSENT** | Metadata=sso_config(`EnterpriseAuth.php:43-54`·단일 IdP)·Key=Crypto KEK(`Crypto.php:133`)·Cert=IdP cert 소비만(`:597-598`)·partner agreement/HSM/KMS/mTLS/cert 발급 순신규 |
| Federation Sync / Routing / Decision Broker(local/remote/hybrid/consensus) | **ABSENT(grep 0)** | 노드간 sync·hub routing·remote/consensus 결정 전무 |
| Cross-Domain PDP / PEP(remote/gateway/mesh) | **ABSENT(로컬만)** | 로컬 PDP(`TeamPermissions.php:695`)·PEP(`index.php:573-619`)만·remote enforcement 없음 |
| Federation Context Exchange(least-disclosure) | **ABSENT** | 도메인간 context 교환 없음·내부 주입만(`index.php:117-121`) |
| Federation Snapshot/Evidence(federation)/Digest/Analytics/Drift/Simulation/Revalidation/Reconciliation | **ABSENT / PARTIAL** | SecurityAudit(`SecurityAudit.php:14-67`) 단일노드·federation-native 전무 |
| Runtime Guard / Static Lint | **ABSENT(grep 0)** | federation 가드·lint 전무 |
| Tenant Isolation | **PRESENT** | `index.php:619` 서버강제 |
| Immutable Evidence | **PRESENT** | SecurityAudit 해시체인(`SecurityAudit.php:14-67`) |

## 3. 재활용 substrate 요약 (순수 그린필드 아님 — 흡수 아닌 확장)

1. **EnterpriseAuth SSO/SCIM(정본 EXTEND)** — `EnterpriseAuth.php:175-543`·`:322-441`. Identity Federation(§5).
2. **Crypto KEK 회전** — `Crypto.php:108-148`. Key Manager(§13).
3. **AgencyPortal 위임** — `AgencyPortal.php:317`·`:416`. Multi-org/Cross-Domain PEP 근접.
4. **SecurityAudit 해시체인** — `SecurityAudit.php:14-67`. Federation Evidence(§21).
5. **TeamPermissions PDP·index.php PEP** — `TeamPermissions.php:695`·`index.php:573-619`. Cross-Domain PDP/PEP 대상.
6. **외부 IdP JWT 검증** — `EnterpriseAuth.php:522-543`. Trust/Context 검증 seed.

## 4. ★KEEP_SEPARATE — authz federation 아님 (커머스/광고 OAuth·PG·export·데이터 trust·CDN)

### B-1. 커머스 채널 커넥터 인증 (OAuth/token 동음이의 — 데이터플레인)
- `OAuth.php:24`·`:42-46`·`:369`(Google Ads/Meta/TikTok OAuth2·callback→channel_credential). 광고계정 링크·캠페인 실행 인증이지 authz federation 아님.
- `ChannelSync.php:378-479`(Shopify X-Shopify-Access-Token·Amazon SP-API LWA refresh→access). 커머스 API 인증.
- `ChannelCreds.php:25`·`:177`·`:311`·`:336`·`:586-620`·`:588-589`(channel_credential·access_token/oauth_token·OAuth+HMAC). 테넌트별 머천트 키.
- `Connectors.php:25-26`·`:28`·`:133-181`(connector_token access/refresh AES-256-GCM). 광고/커머스 ingest 토큰 볼트.
- `AdAdapters.php:28`·`:59-65`·`:80`(Meta/Google/TikTok access_token). 광고 데이터플레인 실행.
- `ChannelContract.php`·`ChannelRegistry.php`(채널 정의/계약). "contract"/"registry" 동음이의·커머스.

### B-2. 결제/PG (webhook 서명 — authz 아님)
- `Paddle.php:19`·`:26`·`:30`·`:49`(Paddle webhook HMAC-SHA256·PADDLE_WEBHOOK_SECRET)·`Payment.php`·`PgSettlement.php`. 빌링 webhook 진위이지 federation 아님.

### B-3. SIEM/데이터 export 클라우드 자격증명 (cross-cloud 동음이의)
- `DataExport.php:24-26`·`:131-156`·`:399-537`(BigQuery SA JWT·S3 SigV4·Snowflake·Sheets outbound). 데이터웨어하우스 export 자격증명("external endpoint"/"cross-cloud" 표현)·federated authz 아님.

### B-4. 로컬 ingest/webhook 인증 (federation trust 아님)
- `OpenPlatform.php:39`·`:41`·`:394`·`:508`(Bearer api_key RBAC·X-Genie-Signature HMAC·outbound webhook). 자체 open API RBAC·cross-domain trust 아님.
- `Webhooks.php`·`Keys.php`(inbound webhook/키 관리). 로컬 ingest.

### B-5. "trust/reputation" 데이터/ML 동음이의
- `DataPlatform.php:281`(DataTrust 데이터품질 점수)·`GraphScore.php:31`·`:242`(attribution 그래프 score)·`Reviews.php:20`(trustpilot 채널)·`Mmm.php`/`AttributionEngine.php`(model confidence). federation trust 아님.

### B-6. CDN / cross-region 자산 (cross-region 동음이의)
- `MediaHost.php:22`·`:30`(이미지 store·채널 CDN 복사). 미디어/CDN이지 cross-domain authz 아님.
- `GeniegoKnowledge.php:203-282`·`:574`(partner_id/partner_key=커머스 API 자격증명·dataTrust 메뉴). 동음이의.

## 5. 종합

**cross-domain authz federation = EXTEND(EnterpriseAuth SSO/SCIM inbound·§5) / PARTIAL(Crypto KEK·AgencyPortal 멀티조직 위임·api_key·외부 IdP JWT 검증·로컬 PDP/PEP) / PRESENT(SecurityAudit evidence·tenant 격리) / ABSENT-cross-domain(Federation Registry/Trust Manager·Cross-Domain Authorization Federation·Policy Federation·Contract/Certificate Manager·Key Manager 확장·Sync/Routing/Decision Broker·Cross-Domain PDP/PEP·Context Exchange·Snapshot/Digest/Analytics/Drift/Simulation/Revalidation/Reconciliation·Guard/Lint 순신규).** 재활용(흡수 아님·확장): EnterpriseAuth→Identity Federation·Crypto KEK→Key Manager·AgencyPortal 위임→Multi-org 근접·SecurityAudit→Evidence·PDP/PEP→Cross-Domain 대상. **★KEEP_SEPARATE=OAuth/ChannelSync/ChannelCreds/Connectors/AdAdapters(커머스·광고)·Paddle/Payment(PG)·DataExport(클라우드 자격증명)·OpenPlatform/Webhooks(로컬 ingest)·DataTrust/GraphScore(데이터·ML)·MediaHost(CDN).** authz federation≠커머스/광고 OAuth/PG/export/데이터trust/CDN.
