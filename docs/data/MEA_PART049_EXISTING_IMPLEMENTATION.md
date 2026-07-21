# MEA Part 049 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 049 SPEC/ADR. ★부재증명 완료·과대주장 금지·데이터 헌법 우선.

## 전수조사 방법
Crypto/AES-256-GCM·GdprConsent·Dsar·Compliance·data classification/masking/key rotation/hsm/kms·데이터 헌법 전수 grep + 판독.

## 실존 substrate (★암호화·Privacy·Compliance·데이터 거버넌스 강하게 실재)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| Field/Credential Encryption | AES-256-GCM·fail-closed | `Crypto`(CRED_ENC_KEY)·`WmsCctv`(:32)·`UserAuth`(204차:3238/3274) | PARTIAL-strong |
| Transit Encryption | TLS | nginx | PARTIAL |
| Masking(read) | mask() | `ChannelCreds`/`WmsCctv`·No-PII(v418.1) | PARTIAL |
| Consent | GDPR 동의 | `GdprConsent.php` | PARTIAL-strong |
| DSAR/Right to Erasure | DSAR 워크플로우 | `Dsar.php`(283차·erasure/anonymize·CRM cascade) | PARTIAL-strong |
| Compliance | SOC2/ISO27001/GDPR 준비도 | `Compliance.php`(프레임워크 매핑) | PARTIAL-strong |
| ★Data Governance | 데이터 헌법 V1~6 | `DATA_INTELLIGENCE/SOURCE/TRUST_QUALITY_CONSTITUTION`·`DATA_ARCHITECTURE` | PARTIAL-strong(핵심 경쟁력) |
| Data Classification seed | source/trust/quality | `DataPlatform`(data_source registry·272차) | PARTIAL |
| Key Rotation seed | root pw 회전 | (279차·양 .env 동시갱신) | PARTIAL-weak |
| Retention | GC·삭제 | media_gc_cron·`Dsar` | PARTIAL |
| Access | RBAC·access review | `index.php`·`AccessReview.php` | PARTIAL-strong |
| Audit | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |

## 부재(ABSENT-formal — 부재증명 완료)
★**형식 Data Classification Engine**(Public/Internal/Confidential/Restricted 등급·Automated PII Detection)·**중앙 Key Management**(HSM/KMS·형식 Key Rotation·현재 CRED_ENC_KEY env)·**형식 Masking Engine**(Static/Dynamic Data Masking)·**Tokenization**(Paddle MoR 제외)·**Privacy Impact Assessment**·**Data Portability**·CCPA/PIPA 형식 매핑·Event 표준(DataClassified 등).

## 판정
**PARTIAL-strong / ABSENT-formal(Data Classification Engine·중앙 KMS/HSM·Masking Engine).** ★암호화·Privacy·Compliance·데이터 거버넌스는 **강하게 실재**: `Crypto`(AES-256-GCM·fail-closed·202/204차)·`GdprConsent`/`Dsar`(283차 DSAR/erasure)·`Compliance`(SOC2/ISO27001/GDPR 준비도)·★데이터 헌법 V1~6(핵심 경쟁력·Trust First·수집≠사용·source/trust/quality)·`DataPlatform`(DataTrust/data_source registry)·No-PII(v418.1)이나, **형식 Data Classification Engine·중앙 KMS/HSM·Masking Engine·Tokenization은 부재**(부재증명 완료). ★★핵심=**암호화·Privacy(GDPR/DSAR)·Compliance·데이터 거버넌스는 강하게 실재(Crypto AES-256-GCM·Dsar 283차·데이터 헌법 V1~6)이나 형식 Data Classification Engine·중앙 KMS/HSM·Masking Engine은 부재**(데이터 헌법 원칙 존재·구현 정본 준수·과대주장 금지). 실행은 Classification/KMS 도입 후 신설 종속.
