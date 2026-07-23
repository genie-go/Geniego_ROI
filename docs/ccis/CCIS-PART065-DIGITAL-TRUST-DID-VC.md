# GeniegoROI Claude Code Implementation Specification

# CCIS Part065 — Enterprise Digital Trust, Trust Architecture, Verifiable Credentials (VC), Decentralized Identity (DID) & Trust Framework Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise Digital Trust·Trust Architecture·VC·DID·Trust Framework 표준을 수립한다.

> ★**성격(★Part030/044/058 중복 — 중앙 신뢰 실재·형식 DID/VC/분산 신뢰 부재)**: 본 Part 는 **CCIS Part030(IAM/
> SSO)·044(블록체인)·058(프라이버시)와 중복**되며 그 판정을 승계한다. 명세가 다루는 **형식 Decentralized
> Identity(DID)·Verifiable Credentials(VC)·Verifiable Presentations(VP)·Trust Registry·Credential Lifecycle/
> Revocation·DID Resolution·Selective Disclosure/ZK·W3C DID/VC 표준**은 **부재**한다(grep 0). ★**구조적 부재**:
> DID/VC/VP/Trust Registry 는 **블록체인/DLT 기반**인데 **블록체인이 없다(Part044·팔지도 않고 없다)** → 분산
> 신뢰 인프라 자체가 없다. ★**실재 축(중앙 신뢰)**: **중앙 신원**(`api_key` SHA-256·세션 hash-only·**SSO
> OIDC/SAML**·Part030)·**Identity Federation**(★**SSO OIDC/SAML 실재**·중앙 연합·Part030)·**`Crypto` 서명**
> (HMAC/RSA·Part064)·**`SecurityAudit`**(tamper-evident 증적·Part040)·**V3 Data Trust**(데이터 신뢰도·Part034)·
> **`GdprConsent`**(동의·Part058)·**Privacy**(PII 미저장·집계 코호트=selective disclosure 유사·Part058) 는
> 실재한다. ★★**핵심 오흡수 차단(Part044 승계·최우선)**: **① V3 Data Trust = 데이터 신뢰도 점수(Fake/Bot/Spam/
> Fraud 검증)이지 Digital Trust(신원/자격증명 신뢰)가 아니다**(이름만 "Trust"·개념 완전히 다름) · **② 중앙
> 신원(`api_key`/SSO) ≠ DID**(중앙·자기주권 아님) · **③ `SecurityAudit` ≠ VC/blockchain**(tamper-evident
> 로그이지 verifiable credential 아님) · **④ SSO Federation(OIDC/SAML) = 중앙 연합이지 DID Federation 아님**.
> Part001 §4 에 따라 실측 → DID/VC/Trust Registry 부재증명 → 중앙 신원+V3 Trust+SecurityAudit 성문화했다.
> ★정본=**Part030/044/058** 승계·블록체인 없음·재판정 금지. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 신뢰 스택 (중앙 vs 분산)

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Digital Trust Architecture | IdP→DID Registry→Issuer→Verify→Services | **부분(중앙)** — IdP(SSO)→세션/api_key→중앙 검증→서비스. DID Registry/Issuer 계층 아님 |
| Digital Trust | Identity/Organization/Service/Device Trust | **부분(중앙)** — 신원(api_key/SSO)·조직(테넌트)·디바이스(`WmsCctv` 카메라·Part037). 형식 trust 관계 부분 |
| Decentralized Identity(DID) | Creation/Resolution/Document/Auth | **부재(구조적)** — DID 없음. **중앙 신원**(`api_key`/세션/SSO·자기주권 아님) |
| Verifiable Credentials(VC) | Issuance/Verification/Storage/Exchange | **부재(구조적)** — VC 없음(블록체인 없음·Part044). `api_key`/세션 토큰=중앙 발행 |
| Verifiable Presentations(VP) | Selective Disclosure/Holder Auth | **부재** — VP 없음 |
| Trust Registry | Trusted Issuer/Verifier/Metadata | **부재** — 신뢰 레지스트리 없음. `ChannelRegistry`/`DataPlatform`(데이터 소스·Part034)≠trust registry |
| Identity Federation | Enterprise/External/Cross-Domain | ★**실재(중앙 연합)** — **SSO OIDC/SAML**(`EnterpriseAuth`·SCIM·Part030). ★**중앙 연합이지 DID Federation 아님** |
| Credential Lifecycle | Issuance/Renewal/Suspension/Revocation | **부분(중앙 토큰)** — `Keys`(api_key 발급/rotate/revoke)·세션 만료·`AccessReview`. VC lifecycle 아님 |
| Credential Revocation | Revocation Registry/Status/Notification | **부분(중앙)** — api_key `is_active=0`·세션 revoke. VC revocation registry 아님 |
| Trust Scoring | Identity/Org/Credential/Dynamic Score | **부분(대응물)** — V3 Data Trust(**데이터** 신뢰도)·`Risk`. ★**데이터 신뢰도이지 신원 신뢰 점수 아님** |
| DID Resolution | Resolver/Cache/Multi-Network | **부재** — DID Resolver 없음 |
| Privacy Preservation | Selective Disclosure/ZK/Minimization/Consent | ★**부분 준수(대응물)** — PII 미저장(최소공개 유사)·`GdprConsent`(동의)·집계 코호트. ZK/formal selective disclosure 부재 |
| Digital Trust Governance | Trust/Credential Policy/Workflow | ★**대응물** — 보안 헌법·`CHANGE_GATE`·`action_request`·`SecurityAudit` |
| Trust Analytics | Credential Usage/Trust Trend/Identity | **부분** — `AccessReview`·`ai_call_log`·V3 Trust 상태. VC/DID 분석 대상 없음 |
| Interoperability(W3C DID/VC/OIDC/OAuth) | 국제 표준 | **부분** — ★**OIDC/OAuth 실재**(Part030). W3C DID/VC 부재 |
| Monitoring | DID/Credential/Trust/Federation/Revocation | **부분** — SSO 상태·`SecurityAudit`·`AccessReview`. DID/VC 대상 없음 |
| Logging | DID/Credential/Trust ID | **부분** — `SecurityAudit`(불변)·SSO 로그. DID/Credential ID 대상 없음 |
| Security(RBAC/Crypto Signature/Secure Storage/격리) | 자격증명 서명 | ★**준수** — RBAC·`Crypto` 서명(HMAC/RSA)·세션 hash-only·`SecurityAudit` 불변·테넌트 격리 |
| Compliance(W3C DID/VC/ISO 18013) | 신뢰 표준 | **부재(구조적)** — W3C DID/VC/mDL(ISO 18013) 대상 아님. OIDC/SAML(Part030) 준수 |
| Disaster Recovery | DID/Credential/Trust Registry 복구 | **부분** — DB 백업(api_key/sso_config)·`Crypto` 키. DID/VC 대상 없음 |
| Performance(DID/Credential Cache/Parallel Verify) | 대규모 검증 | **부분** — 세션/api_key 인덱스·JWKS 캐시. DID/VC 대상 없음 |

---

## 3. 명세 vs 현실 — 섹션별 판정 (중앙 신뢰 실재 + 분산 신뢰 부재 + 오흡수 경계)

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Trust by Design/Identity First/Privacy by Default/Cryptographic Verification/Zero Trust/Tenant Isolation/Explainable) | **★대체로 준수(중앙)** | ★Identity First(api_key/SSO)·Privacy by Default(PII 미저장)·Cryptographic Verification(`Crypto` 서명)·Zero Trust(hash-only)·Tenant Isolation. Decentralized 부재 |
| §4 Digital Trust Architecture | **부분(중앙)** | IdP(SSO)→세션→중앙 검증. DID Registry 아님 |
| §5 Digital Trust | **부분(중앙)** | 신원/조직/디바이스(중앙) |
| §6 DID | **부재(구조적)** | DID 없음. 중앙 신원(블록체인 없음) |
| §7 VC | **부재(구조적)** | VC 없음(블록체인 없음·Part044) |
| §8 VP | **부재** | VP 없음 |
| §9 Trust Registry | **부재** | 신뢰 레지스트리 없음(`DataPlatform`≠trust registry) |
| §10 Identity Federation | **★실재(중앙)** | SSO OIDC/SAML(Part030). ★DID Federation 아님 |
| §11 Credential Lifecycle | **부분(중앙 토큰)** | `Keys`(api_key)·세션·`AccessReview`. VC lifecycle 아님 |
| §12 Credential Revocation | **부분(중앙)** | api_key `is_active=0`·세션 revoke |
| §13 Trust Scoring | **부분(대응물)** | V3 Data Trust(데이터)·`Risk`. ★신원 신뢰 점수 아님 |
| §14 DID Resolution | **부재** | Resolver 없음 |
| §15 Privacy Preservation | **부분 준수** | PII 미저장·`GdprConsent`·집계 코호트. ZK 부재 |
| §16 Digital Trust Governance | **★대응물** | 헌법·`CHANGE_GATE`·`SecurityAudit` |
| §17 Trust Analytics | **부분** | `AccessReview`·`ai_call_log`·V3 Trust |
| §18 Interoperability | **부분** | OIDC/OAuth 실재. W3C DID/VC 부재 |
| §19 Monitoring | **부분** | SSO·`SecurityAudit`·`AccessReview` |
| §20 Logging | **부분** | `SecurityAudit`(불변)·SSO |
| §21 Security | **★준수** | RBAC·`Crypto` 서명·hash-only·불변 감사·테넌트 격리 |
| §22 Compliance | **부재(구조적)** | W3C DID/VC/ISO 18013 대상 아님. OIDC/SAML 준수 |
| §23 Disaster Recovery | **부분** | DB 백업·`Crypto` 키 |
| §24 Performance | **부분** | 세션/api_key 인덱스·JWKS 캐시 |
| §25~§26 PHP/Claude(DID/Credential/Trust Verification/Registry/Federation Service) | **부분** | ★중앙 신원(SSO/api_key)·`Crypto` 서명·`SecurityAudit`·`AccessReview`. DID/VC/VP/Trust Registry/Resolver 부재 |
| §27~§28 검증(trust:health/credential:validate/did:resolve) | **대상 없음** | artisan 없음·DID/VC 없음. SSO·`AccessReview`·`SecurityAudit::verify` 로 대체 |

---

## 4. 확립된 표준 (신규 신뢰 코드가 따를 정본)

- ★★**오흡수 절대 금지(Part044 승계·최우선)**: **① V3 Data Trust ≠ Digital Trust** — V3 Trust 는 **데이터 신뢰도 점수**(Fake/Bot/Spam/Fraud/Duplicate 검증·READY/WARNING/BLOCKED)이지 **신원/자격증명 신뢰(Digital Trust)가 아니다**(이름만 겹침). **② 중앙 신원(`api_key`/SSO) ≠ DID**(중앙·자기주권 아님). **③ `SecurityAudit` ≠ VC/blockchain**(tamper-evident 로그·verifiable credential 아님). **④ SSO Federation ≠ DID Federation**(중앙 연합). 이름·개념 겹쳐도 분산 신뢰 실체 아님.
- ★**신원/자격 정본 = 중앙**(`api_key` SHA-256·세션 hash-only 게이트·SSO OIDC/SAML·SCIM·Part030). ★**Identity Federation = SSO(OIDC/SAML) 실재**(중앙 엔터프라이즈 연합). 신규 신원 연동은 `EnterpriseAuth` 확장.
- ★**자격증명 lifecycle = `Keys`(api_key 발급/rotate/revoke)+세션+`AccessReview`**(Part052). Revocation=`is_active=0`·세션 revoke. VC revocation registry 신설 금지(블록체인 없음).
- ★**암호 서명 = `Crypto`(HMAC/RSA)**·서명검증(SSO id_token RS256·SAML ds:Signature·Part030/064). ★**대칭 안전·비대칭 외부 종속**(Part064).
- ★**Privacy(대응물) = PII 미저장(최소공개·집계 코호트)+`GdprConsent`(동의)**(Part058). ZK/formal selective disclosure 신설 전 PII 미저장이 실효.
- ★**거버넌스·증적 = 보안 헌법·`CHANGE_GATE`·`SecurityAudit`(불변)**·테넌트 격리·RBAC.
- ★★**사업범위·구조적 부재**: **DID/VC/VP/Trust Registry 는 블록체인/DLT 기반인데 블록체인이 없다(Part044)** → 분산 신뢰 인프라 자체가 없다. ★온체인 도입은 롤백 불가라 사전 승인이 유일 방어선(Part044)·PII 온체인 금지(GDPR 상충). 선제 이식 금지.
- ★★**Part030/044/058 중복·재판정 금지**: IAM/SSO=Part030·블록체인=Part044·프라이버시=Part058 정본. 본 Part 는 Digital Trust/DID/VC 관점 보강.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — 구조적 부재 + Part030/044/058 중복)

1. **DID/VC/VP/Trust Registry/DID Resolution·W3C DID/VC 표준** — 안 함. ★**블록체인/DLT 기반인데 블록체인이 없다(Part044·팔지도 않고 없다)** → 분산 신뢰 인프라 자체 부재(구조적). 중앙 신원(api_key/SSO)이 대응물.
2. **Selective Disclosure/Zero Knowledge** — 안 함. PII 미저장(집계 코호트)·`GdprConsent`가 최소공개 실효. ZK=암호 프리미티브 도입 선행.
3. **형식 Trust Scoring(신원 신뢰 점수)** — 부분. ★**V3 Data Trust 는 데이터 신뢰도이지 신원 신뢰가 아니다**(오흡수 금지). `Risk`·`AccessReview`가 신원 리스크 대응물.
4. **Credential Lifecycle/Revocation(VC)** — 중앙 토큰으로 대응. `Keys`(api_key)·세션·`AccessReview`. VC revocation registry 부재(블록체인 없음).
5. **`V3 Trust`/`SecurityAudit`/중앙 신원/SSO 를 Digital Trust/DID/VC/DID Federation 으로 오흡수 금지** — 데이터 신뢰도/tamper-evident 로그/중앙 신원/중앙 연합이지 분산 신뢰 실체 아님.
6. **artisan `trust:*`/`credential:validate`/`did:resolve` 명령** — 없음(Slim·DID/VC 없음). SSO·`AccessReview`·`SecurityAudit::verify` 로 대체.

★**준수하는 실 원칙**: **중앙 신원(api_key/세션 hash-only/SSO OIDC·SAML)·Identity Federation(SSO 실재)·Crypto 서명(HMAC/RSA)·SecurityAudit(불변 증적)·Privacy(PII 미저장·GdprConsent)·거버넌스(헌법/CHANGE_GATE)·테넌트 격리**. ★★**오흡수 차단**: V3 Trust≠Digital Trust·중앙신원≠DID·SecurityAudit≠VC·SSO≠DID Federation. ★**Part030/044/058 정본 재사용**.

---

## 6. Claude Code 구현 규칙

1. ★★**오흡수 절대 금지**: **V3 Data Trust(데이터 신뢰도)를 Digital Trust(신원 신뢰)로**·**중앙 신원(api_key/SSO)을 DID 로**·**`SecurityAudit`를 VC/blockchain 으로**·**SSO Federation 을 DID Federation 으로** 표기하지 않는다.
2. 신원/연합=중앙(`api_key`/세션 hash-only/SSO OIDC·SAML·`EnterpriseAuth`·Part030) 확장. 자격 lifecycle=`Keys`/세션/`AccessReview`.
3. 서명=`Crypto`(HMAC/RSA·서명검증). Privacy=PII 미저장·`GdprConsent`(최소공개 실효). 거버넌스=헌법/`CHANGE_GATE`/`SecurityAudit`.
4. ★★DID/VC/VP/Trust Registry 를 선이식하지 않는다 — **블록체인 없음(Part044)** → 분산 신뢰 인프라 부재(구조적). 온체인 도입=사전 승인·PII 온체인 금지.
5. 테넌트 격리·불변 감사·정직 미산출.
6. ★★IAM/SSO=Part030·블록체인=Part044·프라이버시=Part058 정본(재판정 금지). W3C DID/VC 이식 금지(중앙 신원+SSO+SecurityAudit 로 커버).

---

## 7. Completion Criteria

- [x] 신뢰 스택 **실측**(DID/VC/VP/Trust Registry/DID Resolution/W3C 표준 부재·중앙 신원(api_key/SSO)·Identity Federation(SSO)·`Crypto` 서명·`SecurityAudit`·V3 Data Trust 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(DID/VC **구조적 부재**(블록체인 없음·Part044)·중앙 신뢰 실재·Part030/044/058 중복)
- [x] 실 신뢰(중앙 신원+SSO Federation+Crypto 서명+SecurityAudit+V3 Trust+GdprConsent) 성문화(§4)
- [x] ★★오흡수 절대 차단(V3 Trust≠Digital Trust·중앙신원≠DID·SecurityAudit≠VC·SSO≠DID Federation)·구조적 부재(블록체인 없음)·Privacy(PII 미저장) 명시
- [x] 의도적 미적용 + 사유(§5) — DID/VC/VP/Trust Registry/Selective Disclosure ZK/형식 Trust Scoring(+Part030/044/058 중복)
- [x] Claude Code 규칙(§6) · 중앙 신원(api_key/SSO)·`Crypto` 서명·`SecurityAudit`·V3 Trust·`AccessReview` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **Part030/044/058 중복 + 중앙 신뢰**(중앙 신원 api_key/SSO + Identity
> Federation(SSO OIDC/SAML) + `Crypto` 서명 + `SecurityAudit` 불변 증적 + PII 미저장 Privacy)의 성문화이지 형식
> DID/VC/VP/Trust Registry 이식이 아니다. ★★**핵심 오흡수 차단**: **V3 Data Trust 는 데이터 신뢰도 점수이지
> Digital Trust(신원 신뢰)가 아니고, 중앙 신원(api_key/SSO)은 DID 가 아니며, `SecurityAudit`는 VC/blockchain 이
> 아니다**. ★**구조적 부재**: DID/VC 는 블록체인 기반인데 **블록체인이 없다(Part044)**. IAM/SSO/블록체인/프라이버시=
> Part030/044/058 정본(재판정 금지).

---

## 다음 Part

**CCIS Part066 — Enterprise Autonomous Observability, AIOps 2.0, Predictive Reliability & Self-Healing Platform** — ★사전 실측 예고: ★**Part023(Observability)·040(SecOps)·053(복원력)와 중복** — 형식 AIOps 도구(Datadog/Dynatrace)·Predictive Reliability·Self-Healing 자동화는 **부재**이나, 관측/복원 실체는 **`SystemMetrics`(정직 null 미산출)·`Alerting`(경보)·`AnomalyDetection`(이상탐지)·`/health`·`ModelMonitor`·MySQL→SQLite 폴백·ensureTables self-healing·omni_outbox retry/DLQ**로 부분 실재. Part066 도 실측→AIOps/Predictive/Self-Healing 자동화 부재증명→SystemMetrics+Alerting+폴백 성문화. ★MEA 057 AI Observability weak·Part023/040/053 중복·"정직 미산출(SystemMetrics null)"·"폴백≠HA·ensureTables≠Self-Healing 인프라" 승계.
