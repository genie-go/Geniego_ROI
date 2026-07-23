# GeniegoROI Claude Code Implementation Specification

# CCIS Part064 — Enterprise Quantum-Ready Architecture, Post-Quantum Cryptography (PQC) & Cryptographic Agility Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise Quantum-Ready Architecture·PQC·Cryptographic Agility 표준을 수립한다.

> ★**성격(★MEA 064 승계 — 양자 사업 범위 밖·정직한 부재·선제 교체 대상 없음)**: 본 Part 는 ★**MEA Part064
> (Quantum/HPC = ABSENT-total이나 "사업 범위 밖")판정을 그대로 승계**한다. 명세가 다루는 **Quantum-Ready
> Architecture·PQC(kyber/dilithium)·QKD·Cryptographic Agility(추상화 계층)·Crypto Inventory·HSM/KMS·PQC
> 라이브러리(liboqs)**는 **부재**한다(grep 0·양자 컴퓨팅은 이 제품 사업 범위 밖). ★결함이 아니라 **정직한
> 부재**(MEA 064 판정어휘 제5항 "out of scope"). ★**실측 암호 스택**: **`Crypto`**(**AES-256-GCM 대칭**·envelope
> "enc:vN:..." 버전·`hash_hmac` SHA-256)·**비대칭**(OIDC id_token **RS256/JWKS**·SAML **ds:Signature**
> openssl RSA-SHA256·WebPush **ECDH/HKDF**(RFC8291)·AWS **SigV4**·TLS)·**해시**(SHA-256) 는 실재한다.
> ★★**핵심 실측(MEA 064·정직 판정)**: **① 대칭(AES-256)은 양자 안전**(Grover 는 유효 키 강도를 절반으로만
> 낮춤·AES-256→128비트 유효·여전히 안전) · **② 비대칭 노출면 5개소(RS256/SAML/ECDH/SigV4/TLS)는 양자 취약
> (Shor)이나 전부 외부 표준 종속**(IdP 발행·브라우저·AWS·nginx) → **자체 비대칭 키 관리가 아니라 외부 프로토콜을
> 따를 뿐** → ★**선제 교체 대상 없음**(외부 표준이 PQC 로 가면 따라감). ★★**"양자내성 도입"=거짓 · "양자
> 취약"=과장**. Part001 §4 에 따라 실측 → PQC/QKD 부재증명(out of scope) → Crypto AES(대칭 안전)+비대칭 외부
> 종속 성문화했다. ★정본=**MEA 064·Part012/030/058** 승계·**"RSA 무경계 검색 금지→openssl_sign 심볼"·"양자내성
> 거짓/양자취약 과장 금지"**·재판정 금지. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 암호 스택 + 양자 노출면

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Quantum-Ready Architecture | Crypto Abstraction Layer/Algorithm Provider | **부분(대응물)** — `Crypto`(AES envelope "enc:vN" 버전)=부분 agility. 형식 추상화 계층 아님 |
| Post-Quantum Cryptography(PQC) | kyber/dilithium/PQC Signature/KEM | **부재(out of scope)** — PQC 라이브러리 없음(liboqs). 양자 컴퓨팅 사업 범위 밖 |
| Cryptographic Agility | Algorithm Switching/Version/Policy | **부분** — `Crypto` envelope 버전 프리픽스("enc:vN")·키 회전. 정책 기반 알고리즘 선택 부분 |
| Hybrid Cryptography | Classical+PQC/Hybrid Signature | **부재(out of scope)** — Hybrid 없음(PQC 없음) |
| Crypto Inventory | Algorithm/Key/Certificate/Usage | **부분** — 암호 사용처(`Crypto`/`EnterpriseAuth`/`WebPush` 등). 형식 인벤토리 도구 아님 |
| Crypto Lifecycle Management | Generation/Rotation/Expiration/Destruction | **부분** — `Crypto` 키(`CRED_ENC_KEY`)·`Keys` rotation(api_key)·`AccessReview`. 형식 lifecycle 부분 |
| Key Management | HSM/KMS/Envelope/Versioning | **부분(대응물)** — `Crypto` **envelope encryption**(AES·버전)·앱레벨 키. ★**HSM/형식 KMS 부재** |
| Certificate Management | Issuance/Rotation/Validation/Revocation | **부분(외부)** — TLS 인증서=인프라(nginx/Let's Encrypt)·SAML idp_cert 검증(`EnterpriseAuth`). 자체 인증서 관리 아님 |
| Quantum Risk Assessment | Asset Class/Crypto Risk/Migration Priority | ★**실측 완료(MEA 064)** — ★**대칭 안전·비대칭 5개소 외부 종속·선제 교체 없음** |
| Algorithm Migration | Discovery/Compatibility/Planning | **대상 없음** — PQC 전환 대상 없음(비대칭=외부 표준 종속·자체 교체 불가) |
| Cryptographic Governance | Policy/Approval/Review | ★**대응물** — DATA/보안 헌법·`CHANGE_GATE`·`SecurityAudit`. 형식 crypto governance 부분 |
| Crypto Compliance(NIST/FIPS 140-3) | 검증 표준 | **부분** — AES-256-GCM(FIPS 승인 알고리즘 사용)·SHA-256. ★FIPS 140-3 **모듈 인증** 아님(외부) |
| Quantum Readiness Analytics | Migration Progress/PQC Adoption | **대상 없음** — 마이그레이션 대상 없음 |
| Secure Key Rotation | Auto/Emergency/Scheduled/Audit | ★**부분 준수** — `Keys` rotation(api_key)·`Crypto` 버전·root 비번 회전(279차·양 .env 동시). 자동 스케줄 부분 |
| Crypto Monitoring | Algorithm/Key/Cert/Error | **부분** — error_log·`SecurityAudit`. 형식 crypto 모니터 부분 |
| Logging | Key/Cert/Algorithm Version | **부분** — `SecurityAudit`(불변)·`Crypto` 버전. Key/Cert ID 부분 |
| Security(RBAC/HSM/Secure Key Storage/격리) | 키 분리 저장 | ★**부분 준수** — RBAC·`Crypto` AES(fail-closed)·**키 코드 하드코딩 금지**(env `CRED_ENC_KEY`)·테넌트 격리. HSM 부재 |
| Compliance(NIST PQC/FIPS 140-3/ISO 19790) | 암호 모듈 인증 | **부재(out of scope)** — 형식 암호 모듈 인증 아님. 알고리즘은 표준(AES/SHA/RSA) |
| Disaster Recovery | Key/Cert/KMS 복구 | **부분** — `Crypto` 키 백업(env)·DB 백업. KMS 복구 대상 없음 |
| Performance(Crypto Cache/HW Accel) | PQC 성능 | **대상 없음** — PQC 없음. AES-GCM(OpenSSL 하드웨어 가속) |
| Architecture Integration(TLS/API/DB/Storage Encrypt) | 계층별 암호화 | ★**부분 준수** — TLS(인프라)·API(HMAC/api_key)·자격증명 `Crypto` AES. DB 전체 암호화 부분(필드별) |

---

## 3. 명세 vs 현실 — 섹션별 판정 (out of scope + 양자 노출면 정직 실측)

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Crypto Agility/Algorithm Independence/Zero Trust/Secure by Default/Tenant Isolation/Standards Compliance) | **부분(대칭축)** | ★Secure by Default(AES-256-GCM)·Tenant Isolation·Standards(AES/SHA/RSA)·Auditability. Crypto Agility/Algorithm Independence 부분 |
| §4 Quantum-Ready Architecture | **부분(대응물)** | `Crypto` envelope 버전. 형식 추상화 계층 아님 |
| §5 PQC | **부재(out of scope)** | PQC 라이브러리 없음(양자 범위 밖) |
| §6 Cryptographic Agility | **부분** | `Crypto` 버전 프리픽스·키 회전. 정책 기반 선택 부분 |
| §7 Hybrid Cryptography | **부재(out of scope)** | PQC 없음→Hybrid 없음 |
| §8 Crypto Inventory | **부분** | 암호 사용처. 형식 인벤토리 아님 |
| §9 Crypto Lifecycle | **부분** | `Crypto` 키·`Keys` rotation·`AccessReview` |
| §10 Key Management | **부분(대응물)** | `Crypto` envelope·앱레벨. HSM/KMS 부재 |
| §11 Certificate Management | **부분(외부)** | TLS=인프라·SAML cert 검증. 자체 관리 아님 |
| §12 Quantum Risk Assessment | **★실측 완료** | ★대칭 안전·비대칭 5개소 외부 종속·선제 교체 없음(MEA 064) |
| §13 Algorithm Migration | **대상 없음** | PQC 전환 대상 없음(외부 표준 종속) |
| §14 Cryptographic Governance | **★대응물** | 헌법·`CHANGE_GATE`·`SecurityAudit` |
| §15 Crypto Compliance | **부분** | AES-256-GCM/SHA-256(표준 알고리즘). FIPS 모듈 인증 아님 |
| §16 Quantum Readiness Analytics | **대상 없음** | 마이그레이션 대상 없음 |
| §17 Secure Key Rotation | **부분 준수** | `Keys` rotation·`Crypto` 버전·root 회전(279차) |
| §18 Crypto Monitoring | **부분** | error_log·`SecurityAudit` |
| §19 Logging | **부분** | `SecurityAudit`·`Crypto` 버전 |
| §20 Security | **부분 준수** | RBAC·AES fail-closed·키 하드코딩 금지·격리. HSM 부재 |
| §21 Compliance | **부재(out of scope)** | 형식 암호 모듈 인증 아님 |
| §22 Disaster Recovery | **부분** | `Crypto` 키(env)·DB 백업 |
| §23 Performance | **대상 없음** | PQC 없음·AES-GCM 가속 |
| §24 Architecture Integration | **부분 준수** | TLS·API HMAC·자격증명 AES |
| §25~§26 PHP/Claude(Crypto/Key Management/Certificate/PQC Adapter Service) | **부분** | ★`Crypto`(AES envelope·키 하드코딩 금지)·`Keys` rotation. PQC Adapter/HSM/KMS/추상화 계층 부재 |
| §27~§28 검증(crypto:health/quantum-readiness) | **대상 없음** | artisan 없음·PQC 없음. `Crypto`·`Keys` rotation·`SecurityAudit` 로 대체 |

---

## 4. 확립된 표준 (신규 암호 코드가 따를 정본)

- ★★**양자 노출면 정직 판정(MEA 064·최우선)**: **① 대칭(AES-256-GCM)은 양자 안전**(Grover 는 유효 강도 절반만·AES-256=128비트 유효·안전). **② 비대칭 5개소(OIDC RS256·SAML RSA-SHA256·WebPush ECDH·AWS SigV4·TLS)는 양자 취약(Shor)이나 전부 외부 표준 종속**(IdP/브라우저/AWS/nginx 발행) → ★**선제 교체 대상 없음**(외부 표준이 PQC 로 가면 따라감). ★★**"양자내성 도입"=거짓·"양자 취약"=과장** 금지.
- ★**암호 정본 = `Crypto`(AES-256-GCM)**. 자격증명/민감데이터는 이 envelope("enc:vN:...")·**키 코드 하드코딩 금지**(env `CRED_ENC_KEY`·fail-closed). 부분 agility=버전 프리픽스.
- ★**해시/서명 = SHA-256**(`hash_hmac`·content addressing·HMAC 프록시). ★**RSA 무경계 검색 금지**(부분문자열 오탐)→**`openssl_sign` 심볼**로 노출면 실측(MEA 064 규율).
- ★**키 회전 = `Keys` rotation**(api_key)·`Crypto` 버전·**root 비번 회전=양 .env 동시 갱신**(279차)·`AccessReview`. 자동 스케줄 부분.
- ★**거버넌스 = 보안 헌법·`CHANGE_GATE`·`SecurityAudit`**(불변 감사). 암호 변경은 승인·감사.
- ★★**오흡수 차단**: **대칭≠비대칭**(양자 위협 다름·AES 안전·RSA/ECDH 취약) · **`Crypto` envelope≠형식 crypto abstraction layer** · **AES-256 사용≠FIPS 140-3 모듈 인증**(알고리즘 표준이지 인증 모듈 아님) · **자체 비대칭 없음**(외부 표준 종속).
- ★**사업범위 원칙**: **PQC/QKD/Cryptographic Agility 추상화/HSM/KMS 는 양자 컴퓨팅 사업 범위 밖** — 외부 표준(NIST PQC)이 성숙하고 종속 프로토콜(TLS/OIDC 등)이 PQC 채택 시 **따라가는 것**이 정본. 선제 자체 PQC 이식 금지(외부 종속이라 무의미).

---

## 5. 의도적 미적용 + 사유 (정직 보고 — out of scope + 선제 교체 없음)

1. **PQC(kyber/dilithium·liboqs)·QKD·Hybrid Cryptography** — 안 함. **양자 컴퓨팅 사업 범위 밖**(MEA 064·정직한 부재). ★**비대칭 노출면 전부 외부 표준 종속** → 자체 PQC 이식은 무의미(외부 프로토콜이 PQC 로 가면 따라감).
2. **형식 Cryptographic Agility(추상화 계층·정책 기반 선택)·Crypto Inventory 도구** — 부분. `Crypto` envelope 버전("enc:vN")·키 회전이 부분 agility. 형식 추상화 계층/인벤토리 도구 미도입.
3. **HSM/형식 KMS** — 안 함. `Crypto` AES(앱레벨·env 키·fail-closed)가 대응물. HSM/전용 KMS=인프라 도입.
4. **FIPS 140-3/ISO 19790 암호 모듈 인증** — 안 함. ★**AES-256-GCM/SHA-256 표준 알고리즘 사용**(FIPS 승인 알고리즘)이지 **모듈 인증 아님**(오흡수 금지).
5. **Algorithm Migration/Quantum Readiness Analytics** — 대상 없음. ★**선제 교체 대상 없음**(대칭 안전·비대칭 외부 종속). 마이그레이션 대상 자체 없음.
6. **artisan `crypto:*`/`quantum-readiness` 명령** — 없음(Slim·PQC 없음). `Crypto`·`Keys` rotation·`SecurityAudit` 로 대체.

★**준수하는 실 원칙**: **대칭 AES-256-GCM(양자 안전·envelope·키 하드코딩 금지·fail-closed)·SHA-256·비대칭 외부 표준 종속(RS256/SAML/ECDH/SigV4)·키 회전(Keys/root .env)·보안 헌법 거버넌스·SecurityAudit·테넌트 격리**. ★★**양자 판정 정직**: 대칭 안전·비대칭 외부 종속·선제 교체 없음·"양자내성 도입"=거짓·"양자 취약"=과장. ★**out of scope 정직 선언**: PQC/QKD 는 양자 사업 범위 밖이며 부재는 결함이 아니다.

---

## 6. Claude Code 구현 규칙

1. 암호=`Crypto`(AES-256-GCM envelope·**키 env 하드코딩 금지**·fail-closed). 해시/서명=SHA-256(`hash_hmac`). ★RSA 무경계 검색 금지→`openssl_sign` 심볼로 노출면 확인.
2. ★★양자 판정: **대칭(AES-256)은 안전·비대칭은 외부 표준 종속(선제 교체 없음)**. "양자내성 도입" 표기 금지(거짓)·"양자 취약" 과장 금지.
3. 키 회전=`Keys` rotation·`Crypto` 버전·root 회전(양 .env 동시·279차)·`AccessReview`. 거버넌스=헌법/`CHANGE_GATE`·`SecurityAudit`.
4. ★★오흡수 금지: 대칭≠비대칭·`Crypto` envelope≠추상화 계층·AES-256 사용≠FIPS 140-3 모듈 인증·자체 비대칭 없음(외부 종속).
5. 테넌트 격리·`SecurityAudit`(불변)·정직 미산출.
6. ★★PQC/QKD/liboqs/HSM/형식 KMS 를 선이식하지 않는다 — 양자 범위 밖·비대칭 외부 종속이라 무의미(외부 표준 PQC 채택 시 따라감). 보안/키 판정=Part012/030/058 정본(재판정 금지).

---

## 7. Completion Criteria

- [x] 암호 스택 **실측**(PQC/QKD/kyber/dilithium/liboqs/HSM/형식 KMS 부재·`Crypto` AES-256-GCM 대칭·비대칭 5개소 외부 종속·SHA-256 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(PQC/QKD **out of scope**(양자 범위 밖)·양자 노출면 정직 실측(대칭 안전·비대칭 외부 종속·선제 교체 없음))
- [x] 실 암호(Crypto AES envelope+비대칭 외부 종속+SHA-256+키 회전) 성문화(§4)
- [x] ★★양자 판정(대칭 안전·비대칭 외부 종속·선제 교체 없음·"양자내성 도입"=거짓·"양자 취약"=과장)·★★오흡수 차단(대칭≠비대칭·envelope≠추상화·AES≠FIPS 모듈 인증) 명시
- [x] 의도적 미적용 + 사유(§5) — PQC/QKD/Hybrid/HSM/KMS/FIPS 모듈 인증/Algorithm Migration(out of scope·선제 교체 없음)
- [x] Claude Code 규칙(§6) · `Crypto`·`Keys` rotation·`openssl_sign` 심볼·`SecurityAudit` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **MEA 064 승계** — PQC/QKD 는 **양자 컴퓨팅 사업 범위 밖**(정직한
> 부재)이며, 암호 실측은 **대칭(AES-256-GCM)=양자 안전·비대칭 5개소=외부 표준 종속** 이라 ★**선제 교체 대상이
> 없다**. ★★**"양자내성 도입"=거짓·"양자 취약"=과장**. ★★**오흡수 차단**: **대칭은 비대칭과 양자 위협이 다르고,
> `Crypto` envelope 은 추상화 계층이 아니며, AES-256 사용은 FIPS 140-3 모듈 인증이 아니다**. 보안/키=Part012/
> 030/058 정본(재판정 금지).

---

## 다음 Part

**CCIS Part065 — Enterprise Digital Trust, Trust Architecture, Verifiable Credentials (VC), Decentralized Identity (DID) & Trust Framework** — ★사전 실측 예고: ★**Part030(IAM)·044(블록체인)·058(프라이버시)와 중복** — 형식 DID/VC/Trust Registry/Decentralized Identity 는 **부재**(블록체인 없음·Part044·팔지도 않고 없다)이나, 신뢰 실체는 **`SecurityAudit`(tamper-evident)·V3 Data Trust(데이터 신뢰도)·`api_key`/세션/SSO(중앙 신원)·`Crypto` 서명·`GdprConsent`(동의)**로 부분 실재. Part065 도 실측→DID/VC/Trust Registry 부재증명→중앙 신원+V3 Trust+SecurityAudit 성문화. ★★핵심 오흡수(Part044 승계): **V3 Trust=데이터 신뢰도 점수이지 Digital Trust(신원/자격증명 신뢰) 아님**·**중앙 신원(api_key/SSO)≠DID**·**SecurityAudit≠VC/blockchain**. ★Part030/044/058 중복 명시·블록체인 없음.
