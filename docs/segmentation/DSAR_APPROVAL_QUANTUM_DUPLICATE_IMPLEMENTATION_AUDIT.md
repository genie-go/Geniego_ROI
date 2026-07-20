# DSAR — Authorization Quantum-Ready Architecture: 거버넌스 부재 + 중복/근접물 감사 (Ground-Truth ②)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`. Ground-Truth ①: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`.
> (A) quantum-ready 거버넌스 계층 ABSENT/PARTIAL 실측 + (B) ★KEEP_SEPARATE 동음이의(api_key RBAC·비즈니스 key·마케팅 algorithm·bcrypt 흐름·ML drift·정산).

---

## 1. 핵심 판정 — **PQC/quantum-ready/agility/migration 전면 그린필드**

`ML-KEM|Kyber|Dilithium|SPHINCS|SLH-DSA|ML-DSA|PQC|post.?quantum|quantum|liboqs|crypto_inventory|algorithm_agility|crypto_agility|quantum_readiness|crypto_asset` **전 스코프 매치 0건**. composer.json PQC 라이브러리 부재(`composer.json:5-13`·내장 openssl/hash만). HSM/KMS/Vault 실 클라이언트 부재(`AdminGrowth.php:21` 은유적 주석만). 고전 crypto 자산은 풍부하나(GT①) **관리 엔진(inventory/agility/migration/readiness)은 전무**.

## 2. 거버넌스 계층 실측표

| SPEC 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| Quantum Readiness Registry / Crypto Inventory Manager(엔진) | **ABSENT(grep 0)** | 관리 인벤토리 엔진 없음·자산은 산재(GT①) |
| Algorithm Agility Engine | **ABSENT / proto** | envelope 버전(`Crypto.php:84-88`)=agility proto·무중단 교체 엔진 없음 |
| PQC Manager(ML-KEM/ML-DSA/SLH-DSA) | **ABSENT(grep 0)** | PQC 라이브러리 부재(`composer.json:5-13`) |
| Hybrid Cryptography | **ABSENT(grep 0)** | classical+PQC hybrid 없음 |
| Key Lifecycle Manager(관리) | **PARTIAL** | Crypto KEK 회전(`Crypto.php:133-148`·classical)·api_key rotate만·revocation/archival/destruction 거버넌스 없음 |
| Certificate Lifecycle Manager | **ABSENT** | SAML cert 소비만(`EnterpriseAuth.php:597`)·만료감시/갱신/openssl_x509_parse 없음 |
| Quantum Risk Assessment / Migration Planner / Crypto Dependency Analyzer / Crypto Compliance / Readiness Score / Crypto Policy / Threat Intel / Asset Discovery | **ABSENT(grep 0)** | 전무 |
| Crypto Snapshot/Evidence(native)/Digest/Analytics/Drift/Revalidation/Reconciliation | **ABSENT** | SecurityAudit(`SecurityAudit.php:27`)=generic 감사(crypto snapshot 없음) |
| Runtime Guard / Static Lint(crypto) | **ABSENT(grep 0)** | 약한알고리즘/weak key 가드·lint 없음(약한해시는 산재 GT① §C) |
| 고전 crypto 자산(SOURCE) | **PRESENT** | AES/RSA/SHA-256/HMAC/bcrypt(GT① §A~D) |
| Immutable Evidence | **PRESENT** | SecurityAudit SHA-256 체인(`SecurityAudit.php:56-68`) |

## 3. 재활용 substrate 요약 (순수 그린필드 아님 — 흡수 아닌 확장)

1. **Crypto AES/KEK** — `Crypto.php:108-126`·`:133-148`. Crypto Asset·Key Lifecycle(§7·§3).
2. **EnterpriseAuth RSA** — `EnterpriseAuth.php:536`·`:600`. Algorithm·Cert(§4·§8).
3. **SecurityAudit SHA-256** — `SecurityAudit.php:56-68`. Crypto Evidence(§18).
4. **envelope 버전** — `Crypto.php:84-88`. Algorithm Agility(§4) proto.
5. **약한해시 식별** — `CRM.php:589`·`OrderHub.php:992`. Static Lint(§25) 대상.
6. **api_key/scim_token 해시** — `Keys.php:40`·`EnterpriseAuth.php:328-329`. Crypto Asset 인벤토리 대상.

## 4. ★KEEP_SEPARATE — crypto-asset 관리 아님 (api_key RBAC·비즈니스 key·마케팅 algorithm·bcrypt 흐름·ML/정산)

### B-1. api_key RBAC 아이덴티티 (crypto 자산이나 RBAC 로직은 별개)
- `Keys.php:88-96`·`:99-113`(role/scopes whitelist). api_key는 SHA-256 해시자산(인벤토리 대상)이나 RBAC/식별 로직 자체는 crypto-asset 관리 아님.

### B-2. 비즈니스/도메인 "key" (key 동음이의)
- `app_setting.skey`/`svalue`(KV store)·`channel_credential.key_name`(비즈니스 필드)·menu_key/cache key/array key(40파일 산재). crypto 자산 아님.

### B-3. 마케팅 "algorithm" (algorithm 동음이의)
- `AutoRecommend.php:22`·`:668`(UCB Bandit exploration). 추천/밴딧 알고리즘·암호 알고리즘 아님.
- 벤더 API-서명 HMAC `algorithm=` 문자열(`Connectors.php:1290`·`ChannelSync.php:643`·`PriceOpt.php:1178`·`DigitalShelf.php:249`·`ChannelCreds.php:765`·`OpenPlatform.php:309`·TOTP `UserAuth.php:3886`)=벤더별 서명/OTP(고전 crypto 산재 사용·인벤토리 대상이나 agility 엔진 아님).

### B-4. Certificate 동음이의
- `EnterpriseAuth.php:49`(saml_idp_cert 소비·관리/회전 아님)·`PriceOpt.php:63`·`:345`(kc_cert_no=한국 제품안전 인증번호·비즈니스 필드·암호 cert 아님). TLS cert(nginx/infra·앱 스코프 밖).

### B-5. drift / reconciliation / bcrypt / HSM (동음이의)
- `ModelMonitor.php:18-19`·`:42-43`(ML drift_score)=ML 모델 drift·crypto drift 아님.
- `PgSettlement.php`(reconciliation·`routes.php:655`)·`Connectors.php:896-902`·`Wms.php:2160`·`KrChannel.php:415`. 정산/재고 대사·crypto reconciliation 아님.
- bcrypt password(`UserAuth.php:498`·`:847`)=로그인 흐름(crypto 자산이나 인증 흐름 별개).
- `AdminGrowth.php:21`(Vault→channel_credential 은유적 주석). 실 HSM/KMS/Vault 아님.

## 5. 종합

**Quantum-Ready Architecture = SOURCE-PRESENT(고전 crypto 자산 풍부·AES/RSA/SHA-256/HMAC/bcrypt·인벤토리 SOURCE) / QUANTUM-ABSENT-greenfield(Quantum Readiness Registry·Crypto Inventory Manager 엔진·Algorithm Agility·PQC Manager·Hybrid Crypto·Certificate Lifecycle Manager·Quantum Risk Assessment·Migration Planner·Crypto Dependency Analyzer·Crypto Compliance·Quantum Readiness Score·Crypto Policy·Threat Intel·Crypto Asset Discovery·Snapshot/Evidence/Digest/Analytics/Drift/Revalidation/Reconciliation·Guard/Lint 순신규) / PARTIAL(Crypto KEK 회전·SecurityAudit evidence·envelope 버전 agility proto·Key Lifecycle) / ABSENT(Cert lifecycle 관리·PQC 라이브러리·HSM/KMS/Vault).** 재활용(흡수 아님·확장): Crypto AES/KEK→Crypto Asset/Key Lifecycle·EnterpriseAuth RSA→Algorithm/Cert·SecurityAudit→Crypto Evidence·envelope 버전→Algorithm Agility proto·약한해시 식별→Static Lint. **★KEEP_SEPARATE=api_key RBAC 로직·비즈니스 key(app_setting/channel_credential/menu)·마케팅 algorithm(bandit)·벤더 서명 HMAC(agility 엔진 아님)·kc_cert_no·SAML IdP cert(소비)·ML drift·정산 reconciliation·bcrypt 로그인 흐름·은유적 Vault.** quantum-ready 관리 엔진≠고전 crypto 산재 사용/api_key RBAC/비즈니스 key/마케팅 algorithm/ML/정산.
