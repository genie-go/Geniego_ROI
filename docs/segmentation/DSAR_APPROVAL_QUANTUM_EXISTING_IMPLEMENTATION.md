# DSAR — Authorization Quantum-Ready Architecture: 실존 구현 substrate 전수조사 (Ground-Truth ①)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> 본 문서는 Part 3-23 설계의 반날조 인용 **정본 허용목록**이다. 하위 per-entity DSAR은 본 문서 + Ground-Truth ② + ADR 등장 `파일:라인`만 인용.

---

## 0. 조사 범위·방법

- 대상: `backend/src/`·`backend/public/index.php`·`backend/composer.json`·`.github/workflows/`. 읽기 전용. 배제: `_be_*/`·`clean_src/`·`backup/`.
- 방법: Crypto/EnterpriseAuth/SecurityAudit/UserAuth/NaverSms/Paddle/Keys 정독 + openssl/hash/hmac/bcrypt/PQC/Kyber/Dilithium grep. 2 Explore 스레드(39 tool-use) 상호검증. 라인 실측.

## 1. 핵심 판정 요약

**고전 암호 자산(AES-256-GCM·KEK 회전·RSA/SHA-256 SAML/OIDC·HMAC-SHA256·bcrypt·SHA-256 토큰)은 실재·풍부**하다 — Crypto Inventory의 **SOURCE 자산**이며 Crypto Inventory Manager는 이를 EXTEND. 그러나 **PQC(ML-KEM/ML-DSA/SLH-DSA)·algorithm agility·quantum risk·migration·quantum readiness score·crypto discovery 엔진은 전면 부재(그린필드·grep 0)**. composer.json에 **PQC 라이브러리 부재**(`composer.json:5-13`·openssl/hash 내장만). HSM/KMS/Vault 실 클라이언트 부재(SPEC 열망).

- **★AES 핵심자산 = Crypto.php**(`Crypto.php:108-126` AES-256-GCM encrypt·`:162-182` decrypt·envelope enc:vN: `:125`·KEK 버전회전 `:133-148`).
- **★RSA/서명 = EnterpriseAuth**(`EnterpriseAuth.php:536` OIDC RS256 openssl_verify SHA256·`:600` SAML RSA-SHA256).
- **★SHA-256 = SecurityAudit/api_key/token**(`SecurityAudit.php:27` 해시체인·`UserAuth.php:38` hashToken·api_key SHA-256).
- **★HMAC = NaverSms/Paddle/OpenPlatform/Connectors**(`NaverSms.php:94`·`Paddle.php:1073`·`OpenPlatform.php:394`).
- **★bcrypt = UserAuth/Partner/Agency**(`UserAuth.php:498`·`:847`).
- **★Key rotation PARTIAL = Crypto KEK**(`Crypto.php:133-148`·classical만). **★Cert lifecycle ABSENT**(SAML cert 소비만 `EnterpriseAuth.php:597`·만료감시 없음).

## 2. 실존 substrate 카탈로그

### A. Symmetric AES-256-GCM (PRESENT — 핵심자산·SOURCE)

| 파일:라인 | 심볼 | 설명 | Part3-23 매핑 |
|---|---|---|---|
| `Crypto.php:19` · `:21` · `:23-24` · `:27-32` · `:35-43` · `:45-74` · `:48` · `:54` · `:58` · `:77-82` · `:84-88` | class Crypto·PREFIX enc:v1:·KEK 버전캐시·activeVersion·keyForVersion·key(CRED_ENC_KEY→app_setting→random_bytes(32))·normalizeKey·isEncrypted | 대칭키 자산·envelope 버전(agility proto) | Crypto Asset(§3)·Algorithm(§4) |
| `Crypto.php:108-126` · `:114` · `:118` · `:121` · `:123` · `:125` · `:162-182` · `:172-174` · `:177` | encrypt(openssl_encrypt aes-256-gcm·fail-closed·enc:vN:base64(iv\|tag\|ct))·decrypt | AES-256-GCM 암복호 | Crypto Asset·Key(§3) |
| `Crypto.php:133-148` · `:141` · `:150-159` · `:96-102` · `:98-99` | rotateKek(cred_kek_vN/active·random_bytes(32) 비파괴)·putSetting·hmacTag(purpose-derived HMAC subkey) | KEK 회전(Key Lifecycle proto)·HMAC | Key Lifecycle(§7·PARTIAL)·HMAC |
| `UserAuth.php:3062` · `:3124` · `:3224` · `:3260` · `:3295` · `:3529` · `:3878` · `Connectors.php:132` · `:152` · `EnterpriseAuth.php:133` · `:169` · `:170` · `Line.php:112` · `Wms.php:24` · `PriceOpt.php:1348` | AES-256-GCM 소비(SMTP/SENS/API키/MFA/토큰 at-rest) | 암호화 자산 소비처 | Crypto Asset 인벤토리 대상 |

### B. Asymmetric RSA / 서명 (PRESENT)

| 파일:라인 | 심볼 | 설명 | Part3-23 매핑 |
|---|---|---|---|
| `EnterpriseAuth.php:20-22` · `:521-544` · `:528` · `:531` · `:536` · `:545-568` · `:588-591` · `:596` · `:600` · `:622` | OIDC RS256/JWKS(openssl_verify SHA256)·jwkToPem·SAML XML-DSig(C14N·RSA-SHA256·digest sha256) | RSA 서명검증 자산 | Crypto Algorithm(§4)·Certificate(§8) |
| `EnterpriseAuth.php:49` · `:268` · `:597` · `:598` | saml_idp_cert 컬럼·verifySamlSignature·IdP X.509 PEM·openssl_pkey_get_public | IdP cert 소비(관리/회전 없음) | Cert Lifecycle(§8·소비만) |
| `Connectors.php:3790` · `:3799` | RS256 JWT(Google SA)·openssl_sign SHA256 | RSA 서명 자산 | Crypto Algorithm 인벤토리 대상 |

### C. Hashing SHA-256 / 약한해시 (PRESENT — 인벤토리 대상·약한해시 식별)

| 파일:라인 | 심볼 | 설명 | Part3-23 매핑 |
|---|---|---|---|
| `SecurityAudit.php:27` · `:35-41` · `:43-53` · `:51` · `:56-68` · `:63` · `:64` | SHA-256 해시체인 log·lastHash·verify(hash_equals) | 불변 evidence(SHA-256) | Crypto Evidence(§18)·Algorithm |
| `UserAuth.php:38` · `:4353` · `:4391` · `index.php:430` · `:506` · `Db.php:945` · `:998` · `:1004` · `:1006` · `EnterpriseAuth.php:328-329` · `:517` | hashToken(sha256)·api_key SHA-256·scim_token 조회해시·세션토큰 해시 | 토큰/API키 해시자산 | Crypto Asset·Key(§3) |
| `CRM.php:589` · `:638` · `:857` · `:858` · `:930` · `UserAuth.php:3571` · `:3886` · `OrderHub.php:992` · `Connectors.php:3574` · `:3786` · `:2399` · `AdAdapters.php:1561` · `SmtpClient.php:174` | SHA-1(identity·TOTP RFC6238)·MD5(Content-MD5·md5_file)·CRAM-MD5(RFC2195) | 약한해시(비보안 primitive·인벤토리 식별대상) | Static Lint(§25 weak algorithm)·Runtime Guard(§24) |

### D. HMAC / bcrypt / secrets (PRESENT)

| 파일:라인 | 심볼 | 설명 | Part3-23 매핑 |
|---|---|---|---|
| `NaverSms.php:9` · `:15` · `:94` · `Paddle.php:19` · `:309-311` · `:1038` · `:1038-1073` · `:1073` · `OpenPlatform.php:41` · `:394` · `Connectors.php:1205` · `:1289` · `:1290` · `:2271` · `:2401` · `:3094` · `:3289` · `:3657` | HMAC-SHA256(SENS/Paddle webhook/X-Genie-Signature/벤더서명)·HMAC-SHA1(OAuth1) | HMAC 서명자산 | Crypto Asset 인벤토리 대상 |
| `UserAuth.php:498` · `:804` · `:847` · `:846` · `:2873` · `:2968` · `PartnerPortal.php:114` · `:130` · `:172` · `AgencyPortal.php:119` · `:137` · `:189` · `Db.php:1219-1220` | bcrypt password_hash(PASSWORD_DEFAULT)/verify·admin_access_key_hash | 비밀번호 해시자산 | Crypto Asset(login·KEEP_SEPARATE 흐름) |
| `Keys.php:40` · `:88-96` · `:99-113` · `:119` · `routes.php:931` | api_key SHA-256 hash·role/scopes·kek-rotate 라우트 | API키 발급/회전 | Key Lifecycle(§7)·api_key RBAC(KEEP_SEPARATE) |

### E. Store / PQC 부재

| 파일:라인 | 심볼 | 설명 | Part3-23 매핑 |
|---|---|---|---|
| `composer.json:5-13` | slim/php-di/phpdotenv/illuminate/monolog(crypto 라이브러리 없음·PQC 없음) | 내장 openssl/hash만 | PQC Manager(§5·ABSENT)·Dependency(§11) |
| `AdminMenu.php:182` · `:197` · `:214` | menu_audit_log SHA-256 2차체인 | 불변 evidence | Crypto Evidence(§18) |

## 3. 종합 판정

**Quantum-Ready Architecture = SOURCE-PRESENT(AES-256-GCM·RSA/SHA-256·HMAC·bcrypt·api_key 해시·KEK 회전·SHA-256 evidence 체인 등 고전 crypto 자산 풍부·인벤토리 SOURCE) / QUANTUM-ABSENT-greenfield(Quantum Readiness Registry·Crypto Inventory Manager(엔진)·Algorithm Agility·PQC Manager(ML-KEM/ML-DSA/SLH-DSA)·Hybrid Crypto·Key Lifecycle Manager(관리)·Certificate Lifecycle Manager·Quantum Risk Assessment·Migration Planner·Crypto Dependency Analyzer·Crypto Compliance·Quantum Readiness Score·Crypto Policy Engine·Quantum Threat Intelligence·Crypto Asset Discovery·Crypto Snapshot/Evidence(native)/Digest/Analytics/Drift/Revalidation/Reconciliation·Runtime Guard/Static Lint 순신규) / PARTIAL(Crypto KEK 회전·SecurityAudit evidence·envelope 버전 agility proto) / ABSENT(Cert lifecycle 관리·PQC 라이브러리·HSM/KMS/Vault).** 재활용(흡수 아님·확장): Crypto.php AES/KEK→Crypto Asset/Key Lifecycle·EnterpriseAuth RSA→Algorithm/Cert·SecurityAudit→Crypto Evidence·envelope 버전→Algorithm Agility proto·약한해시(SHA-1/MD5) 식별→Static Lint 대상. ★api_key RBAC 흐름·비즈니스 "key"·마케팅 algorithm·bcrypt 로그인 흐름·ML drift·정산 reconciliation(GT②)은 **crypto-asset 관리와 구분**.
