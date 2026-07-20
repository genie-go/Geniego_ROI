# DSAR — Crypto Asset Discovery (Part 3-23 §16)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

Crypto Asset Discovery는 시스템 전역에 산재한 암호 자산(알고리즘·키·인증서·시크릿)을 자동 탐색하여 CBOM(Cryptographic Bill of Materials)을 생성하는 관측평면이다. 탐색대상 표면 = Source Code · Configuration · K8s Secret · HSM · KMS · Vault · Certificate Store. PQC 전환은 "무엇이 어디서 어떤 알고리즘을 쓰는가"의 완전한 인벤토리 없이는 불가능하므로, Discovery는 전환 로드맵의 0단계다. 본 Part는 **탐색·분류·CBOM 산출**을 정의한다(교체 실행 아님).

## 2. Substrate 매핑(탐색 대상 = 현행 산재 crypto)

| 자산 유형 | 현행 사용처 | 인용 | 탐색상태 |
|---|---|---|---|
| AES(대칭 암·복호) | credential 암호화 | `Crypto.php:108-126` | 미탐색 |
| KEK 관리 | envelope 키 파생/랩 | `Crypto.php:150-159` | 미탐색 |
| RSA(비대칭) | SAML 서명검증 소비 | `EnterpriseAuth.php:536` | 미탐색 |
| HMAC(무결성) | 커넥터 서명 | `Connectors.php:132` | 미탐색 |
| bcrypt(패스워드 해시) | 사용자 자격 | `UserAuth.php:498` | 미탐색 |
| api_key(해시 대조) | 키 인증 | `Keys.php:40` | 미탐색 |

## 3. 설계 계약(신설 대상)

- **Scanner 집합**: Source Code(정적 crypto call 탐지)·Configuration(.env·composer)·K8s Secret·Certificate Store에 대한 탐색기. 현행은 자동 탐색 grep 0 → 전면 신설.
- **CBOM 산출**: 각 자산을 (algorithm, primitive, key-size, crypto_type=classical|pqc|hybrid, location, quantum_risk) 레코드로 정규화. §7 Key Registry·§8 Cert Inventory와 단일 인벤토리로 연결(중복 인벤토리 금지).
- **Quantum Risk 분류**: 위 substrate 전부 classical(양자취약: RSA·AES-128 등급/양자내성 부분: AES-256 등급) 등급화. bcrypt(`UserAuth.php:498`)·HMAC(`Connectors.php:132`)의 대칭/해시 특성 반영.
- **HSM/KMS/Vault 표면**: ★현행 HSM/KMS/Vault **부재**(`AdminGrowth.php:21`은 은유적 주석일 뿐 실 저장소 아님). Discovery의 secret custody 탐색 대상은 현재 파일/DB/.env 평면에 국한 — 신설 시 이 사실을 CBOM에 명시.

## 4. KEEP_SEPARATE

- `AdminGrowth.php:21` — HSM/KMS/Vault 은유 주석. 실 crypto 자산이 아니므로 CBOM 레코드로 등재 금지(탐색 결과 오염 방지·별개 유지).

## 5. 판정

**ABSENT**. 자동 crypto discovery grep 0. 탐색되어야 할 산재 crypto(AES `Crypto.php:108-126`·KEK `:150-159`·RSA `EnterpriseAuth.php:536`·HMAC `Connectors.php:132`·bcrypt `UserAuth.php:498`·api_key `Keys.php:40`)는 실재하나 인벤토리·CBOM·양자위험 등급화가 전무. HSM/KMS/Vault 부재(`AdminGrowth.php:21` 은유). Scanner·CBOM 전면 순신설. 코드 변경 0 · BLOCKED_PREREQUISITE.
