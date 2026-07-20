# ADR — Authorization Quantum-Ready Architecture Foundation

- **Status**: PROPOSED · NOT_CERTIFIED · BLOCKED_PREREQUISITE (설계 명세 · 코드 변경 0)
- **EPIC**: 06-A-03-02-03-04 Part 3-23
- **Date**: 2026-07-20
- **상위 SPEC**: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md` (canonical 원문 verbatim · Version 1.0)
- **Ground-Truth**: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
- **선행 계보**: Part 1~3-22 전체 — Federation(3-18) cert/key·Compliance(3-17)·Digital Twin(3-22). 모든 crypto 자산이 인벤토리 대상

---

## 1. Context

Part 3-23은 Authorization Platform을 미래 양자컴퓨팅 위협(Harvest Now Decrypt Later)에 대비해 **Post-Quantum Cryptography(PQC)** 기반 **Quantum-Ready Authorization Architecture(QRAA)** 로 설계한다(Crypto Inventory·Algorithm/Cryptographic Agility·PQC Manager·Hybrid Crypto·Key/Cert Lifecycle·Quantum Risk·Migration Planner·Quantum Readiness Score·Crypto Policy·Threat Intel·Asset Discovery). 원칙: Cryptographic Agility·Hybrid·무중단 교체·Forward Security.

**★현 실측(2 스레드 상호검증·GT①②)**: **고전 암호 자산(AES-256-GCM·KEK 회전·RSA/SHA-256 SAML/OIDC·HMAC-SHA256·bcrypt)이 실재·풍부**(Crypto.php `:108-126`·`:133-148`·EnterpriseAuth `:536`·`:600`·SecurityAudit `:27`·api_key SHA-256·bcrypt `UserAuth.php:498`) — Crypto Inventory의 **SOURCE 자산**. 그러나 **PQC·algorithm agility·quantum risk·migration·readiness score·crypto discovery 엔진은 전면 부재(grep 0)**. composer.json **PQC 라이브러리 부재**(`composer.json:5-13`). HSM/KMS/Vault 실 클라이언트 부재.

## 2. Ground-Truth 판정 (2 스레드 상호검증)

### 2.1 실존 substrate (GT①)
- **AES PRESENT**: Crypto.php AES-256-GCM(`:108-126`)·KEK 회전(`:133-148`)·envelope 버전(`:84-88`).
- **RSA PRESENT**: EnterpriseAuth OIDC RS256(`:536`)·SAML RSA-SHA256(`:600`)·Connectors RS256(`:3799`).
- **SHA-256 PRESENT**: SecurityAudit 체인(`:27`)·hashToken(`UserAuth.php:38`)·api_key.
- **HMAC/bcrypt PRESENT**: NaverSms/Paddle/OpenPlatform HMAC·bcrypt(`UserAuth.php:498`).
- **Key rotation PARTIAL**: Crypto KEK(`:133-148`·classical).
- **약한해시 식별**: SHA-1/MD5 산재(`CRM.php:589`·`OrderHub.php:992`).

### 2.2 거버넌스 계층 (GT②)
Quantum Registry·Crypto Inventory Manager(엔진)·Algorithm Agility·PQC Manager·Hybrid Crypto·Cert Lifecycle Manager·Quantum Risk·Migration Planner·Dependency Analyzer·Crypto Compliance·Readiness Score·Crypto Policy·Threat Intel·Asset Discovery·Snapshot/Evidence(native)/Digest/Analytics/Drift/Reconciliation·Guard/Lint = **grep 0**. PQC 라이브러리 부재·HSM/KMS/Vault 부재. ★KEEP_SEPARATE: api_key RBAC·비즈니스 key·마케팅 algorithm·ML drift·정산 reconciliation·bcrypt 로그인 흐름.

### 2.3 종합
**판정 = SOURCE-PRESENT / QUANTUM-ABSENT-greenfield / PARTIAL(KEK 회전·evidence·envelope agility proto·Key Lifecycle) / ABSENT(Cert lifecycle·PQC 라이브러리·HSM/KMS/Vault).**

## 3. Decision

### D-1. Crypto Inventory Manager는 실 crypto 자산을 discover/EXTEND (재구현 금지)
§2 Crypto Inventory Manager·§16 Asset Discovery는 실재 crypto 자산(Crypto.php AES `:108-126`·EnterpriseAuth RSA `:536`·`:600`·SecurityAudit SHA-256 `:27`·HMAC·bcrypt·api_key·약한해시 SHA-1/MD5)을 **소스코드/config 스캔으로 인벤토리화**. ★자산은 SSOT 유지·인벤토리는 파생 카탈로그·crypto 사용 재구현 금지(중복 금지).

### D-2. Algorithm Agility는 envelope 버전을 proto로 확장
§4 Algorithm Agility Engine은 Crypto envelope 버전(`Crypto.php:84-88` enc:vN:·`:35-43` keyForVersion)의 버전 태깅을 **알고리즘 pluggable 교체(무중단)** 로 확장. ★현행은 KEK 버전만(알고리즘 고정 AES-256-GCM)·RSA→PQC 교체 agility는 순신설.

### D-3. Key Lifecycle는 Crypto KEK 회전 확장 (관리 거버넌스 신설)
§7 Key Lifecycle Manager(Generation/Rotation/Revocation/Archival/Destruction)는 Crypto KEK 회전(`Crypto.php:133-148`·비파괴)·api_key rotate 확장. ★현행은 회전만·revocation/archival/destruction/inventory 거버넌스는 순신설.

### D-4. Cert Lifecycle·PQC Manager·Hybrid Crypto는 순신설
§8 Certificate Lifecycle Manager(발급/갱신/회전/폐기/만료감시)는 현행 SAML cert 소비(`EnterpriseAuth.php:597`)를 넘어 순신설(openssl_x509_parse·만료 스캔 신설). §5 PQC Manager(ML-KEM/ML-DSA/SLH-DSA)·§6 Hybrid Crypto는 **PQC 라이브러리 도입 후 순신설**(현 composer 부재 `composer.json:5-13`). ★HSM/KMS/Vault 통합도 순신설.

### D-5. Crypto Evidence·Snapshot은 SecurityAudit 확장
§18 Evidence(Migration/Compliance/Risk Assessment/Validation/Certificate Chain)·§17 Snapshot·§29 Immutable Crypto Inventory History는 SecurityAudit SHA-256 체인(`SecurityAudit.php:56-68`) 확장. ★현 감사를 crypto 인벤토리/마이그레이션 불변기록으로 확장은 순신설.

### D-6. Static Lint·Runtime Guard는 약한해시 식별 확장
§25 Static Lint(Weak Algorithm/Weak Key/Hardcoded Secret)·§24 Runtime Guard(Deprecated Algorithm/Weak Key/PQC Downgrade)는 약한해시 산재(SHA-1 `CRM.php:589`·MD5 `OrderHub.php:992`) 식별을 자동 lint/guard로 확장. ★현행은 산재 사용·자동 탐지 엔진은 순신설.

### D-7. Part 1~3-22와의 관계 (crypto 자산 대상·무중복)
QRAA는 Federation(3-18) cert/key·Compliance(3-17)·전 통제의 crypto 자산을 인벤토리·평가·마이그레이션한다. 각 crypto 사용 재구현 금지(중복 금지). QRAA는 인벤토리·agility·migration·거버넌스만·실 암복호는 기존 Crypto/EnterpriseAuth.

### D-8. ★api_key RBAC/비즈니스 key/마케팅 algorithm/ML/정산 흡수 금지 (KEEP_SEPARATE)
api_key RBAC 로직(`Keys.php:88-96`)·비즈니스 key(app_setting/channel_credential/menu)·마케팅 algorithm(`AutoRecommend.php:22` bandit)·kc_cert_no(`PriceOpt.php:63`)·ML drift(`ModelMonitor.php:18-19`)·정산 reconciliation(`PgSettlement.php`)·bcrypt 로그인 흐름·은유적 Vault(`AdminGrowth.php:21`)는 crypto-asset 관리로 **흡수·개명 금지**. ★api_key/bcrypt/HMAC은 crypto 자산으로 **인벤토리 대상**이나 그 RBAC/로그인/서명 로직은 별개.

### D-9. 정직 분리
- **실재 과신 회피**: 고전 crypto 자산은 풍부하나 관리 엔진(inventory/agility/migration/readiness)은 없음·KEK 회전=classical만·Cert lifecycle 없음·PQC 라이브러리 없음·HSM/KMS/Vault 없음.
- **부재 과장 회피**: AES/RSA/SHA-256/HMAC/bcrypt·KEK 회전·SecurityAudit·envelope 버전은 실재(재활용·인벤토리 SOURCE). PQC/quantum 골격만 grep 0.
- **오흡수 회피**: api_key RBAC·비즈니스 key·마케팅 algorithm·ML/정산은 crypto-asset 관리 아님.

## 4. Consequences

- **긍정**: Harvest-Now-Decrypt-Later 대비·crypto 인벤토리 가시성·algorithm agility·PQC 마이그레이션·quantum readiness score·crypto 거버넌스. 양자 위협 대비.
- **비용**: 대규모 신규(Quantum Registry·Crypto Inventory Manager·Algorithm Agility·PQC Manager·Hybrid Crypto·Cert Lifecycle·Quantum Risk·Migration Planner·Dependency Analyzer·Crypto Compliance·Readiness Score·Crypto Policy·Threat Intel·Asset Discovery·Snapshot/Evidence/Digest/Analytics/Drift/Reconciliation·Guard/Lint). PQC 라이브러리·HSM/KMS 도입.
- **선행 의존**: Part 1~3-22 인증 후 실 구현(BLOCKED_PREREQUISITE). Federation(3-18) cert/key 선행.
- **무후퇴**: Crypto.php·EnterpriseAuth·SecurityAudit·bcrypt·api_key·envelope 버전 유지·병행. Extend-only(고전 crypto→하이브리드 무중단).

## 5. Compliance / Certification

- **NOT_CERTIFIED**: 코드 변경 0. SPEC은 사용자 제공 canonical 원문 verbatim(Version 1.0).
- 하위 per-entity DSAR은 본 ADR + GT①② 등장 `파일:라인`만 인용(반날조·허용목록 밖 0).
- Completion Gate·Performance(Inventory Scan≤10분·Risk Assessment≤60초·Key Rotation≤30초·Cert Validation≤5초·Analytics≤30초)·Quantum Readiness Validation(NIST PQC/FIPS 140-3/ISO27001/ISO19790/PCI DSS)·Regression은 실 구현 세션(RP-track) 조건.

---
**요약**: Quantum-Ready Architecture = SOURCE-PRESENT(고전 crypto 자산 풍부·AES-256-GCM/RSA/SHA-256/HMAC/bcrypt/api_key/KEK 회전·인벤토리 SOURCE) / QUANTUM-ABSENT-greenfield(Quantum Registry·Crypto Inventory Manager 엔진·Algorithm Agility·PQC Manager(ML-KEM/ML-DSA/SLH-DSA)·Hybrid Crypto·Cert Lifecycle Manager·Quantum Risk·Migration Planner·Dependency Analyzer·Crypto Compliance·Readiness Score·Crypto Policy·Threat Intel·Asset Discovery·Snapshot/Evidence/Digest/Analytics/Drift/Reconciliation·Guard/Lint 순신규) / PARTIAL(Crypto KEK 회전·SecurityAudit evidence·envelope 버전 agility proto·Key Lifecycle) / ABSENT(Cert lifecycle·PQC 라이브러리·HSM/KMS/Vault). Extend: Crypto AES/KEK→Crypto Asset/Key Lifecycle·EnterpriseAuth RSA→Algorithm/Cert·SecurityAudit→Crypto Evidence·envelope 버전→Algorithm Agility proto·약한해시 식별→Static Lint·Part1~3-22 crypto 인벤토리(무중복). 코드0·NOT_CERTIFIED·선행의존. **★api_key RBAC/비즈니스 key/마케팅 algorithm/kc_cert_no/ML drift/정산 reconciliation/bcrypt 로그인 흐름 흡수 금지·PQC 라이브러리 도입 후 PQC/Hybrid 순신설.**
