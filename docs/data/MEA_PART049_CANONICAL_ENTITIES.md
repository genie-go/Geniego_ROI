# MEA Part 049 — Canonical Entities Design & Judgment (§5~§17)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★Crypto/GdprConsent/Dsar/Compliance/데이터 헌법 재사용·Data Classification Engine/중앙 KMS/Masking Engine 순신설·Part 048/데이터 헌법 상속·과대주장 금지·헌법 우선.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | DATASET | 데이터 자산 | `DataPlatform`(DataAssets·272차) | PARTIAL |
| 2 | DATA_CLASSIFICATION | source/trust(형식 등급 부재) | `DataPlatform`(data_source registry) | PARTIAL-weak |
| 3 | PERSONAL_DATA | No-PII 정책 | v418.1·`GdprConsent` | PARTIAL |
| 4 | SENSITIVE_DATA | 자격증명/API 키 | `Crypto`·`ChannelCreds` | PARTIAL |
| 5 | ENCRYPTION_KEY | CRED_ENC_KEY | `Crypto`(env·형식 KMS 부재) | PARTIAL-weak |
| 6 | MASKING_POLICY | mask()(형식 정책 부재) | `ChannelCreds`·No-PII | PARTIAL-weak |
| 7 | PRIVACY_POLICY | 데이터 헌법·GDPR | `GdprConsent`·데이터 헌법 | PARTIAL-strong |
| 8 | CONSENT | GDPR 동의 | `GdprConsent.php` | PARTIAL-strong |
| 9 | DATA_ACCESS | RBAC·access review | `index.php`·`AccessReview` | PARTIAL-strong |
| 10 | DATA_RETENTION | GC·삭제 | media_gc_cron·`Dsar` | PARTIAL |
| 11 | COMPLIANCE_RULE | SOC2/ISO27001 | `Compliance` | PARTIAL-strong |
| 12 | DATA_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| 13 | SECURITY_EVENT | 감사/이상 | `SecurityAudit`·`AnomalyDetection` | PARTIAL |
| 14 | DATA_RISK | DataTrust/risk | `DataPlatform`·`SupplyChain` | PARTIAL |
| 15 | DATA_PROTECTION_POLICY | 데이터 헌법·암호화 정책 | 데이터 헌법·`Crypto` | PARTIAL-strong |

## §6~§17 표준 판정
- **§6 Domain(10)**: Encryption=Crypto·Privacy=GdprConsent/Dsar·Compliance=Compliance·분류=DataPlatform·Masking=No-PII. ★Tokenization/HSM/형식 Classification=부분.
- **§7 Lifecycle(10)**: Secure Storage=Crypto·Access=index.php/AccessReview·Retention=media_gc_cron·Deletion=Dsar(283차). ★생성 시점 분류(형식)=부분.
- **§8 Classification(8)**: source/Trust=DataPlatform·Personal=No-PII. ★Public/Internal/Confidential/Restricted·Automated PII Detection=ABSENT.
- **§9 Protection(8)**: Field Encryption=Crypto(AES-256-GCM)·전송=nginx TLS·Masking=mask()·Tokenization=Paddle MoR. ★Transparent Encryption/Static·Dynamic Masking Engine=부분.
- **§10 Privacy(8)**: Consent=GdprConsent·DSAR/Erasure=Dsar(283차)·No-PII. ★Portability/PIA=부분.
- **§11 Compliance(8)**: Compliance(SOC2/ISO27001/GDPR)·GdprConsent/Dsar. ★CCPA/PIPA 형식=부분.
- **§12 Governance**: ★데이터 헌법 V1~6·DataTrust=DataPlatform·Access=AccessReview·Audit=SecurityAudit.
- **§13 Security**: Tenant/RBAC/Encryption(Crypto)/Key Rotation seed(root pw 279차)/Audit. ★HSM/중앙 KMS=ABSENT.
- **§17 AI**: 이상 접근=AnomalyDetection·유출 위험=SupplyChain·품질=DataPlatform·Explainability=헌법 V4·데이터 자동 삭제/권한 자동 변경 불가=헌법 V3+V5+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§7·§8 privacy·§9·§11·§12·§15=privacy/access/compliance/audit/protection·§7·§8 CONSENT/PRIVACY_POLICY) / PARTIAL(§1·§3·§4·§10·§13·§14) / ABSENT-formal(§2·§5·§6 형식 DATA_CLASSIFICATION 등급·ENCRYPTION_KEY 중앙 KMS·MASKING_POLICY 형식·Data Classification Engine/HSM/Masking Engine).** 코드 0. ★암호화(`Crypto`)·Privacy(`GdprConsent`/`Dsar`)·Compliance(`Compliance`)·데이터 거버넌스(데이터 헌법 V1~6) 재사용(★중복 암호화/Privacy/Compliance/거버넌스 절대 금지·정본 재구현 금지·헌법 우선)·Data Classification Engine/중앙 KMS/Masking Engine 순신설(부재·과대주장 금지)·Part 048/데이터 헌법 상속·★AI 데이터 자동 삭제/접근 권한 자동 변경 불가(V3+V5+CHANGE_GATE).
