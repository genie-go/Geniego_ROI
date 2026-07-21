# MEA Part 049 — Governance Mechanisms (§7~§17 통합)

> **거버넌스 상태**: 거버넌스 메커니즘 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★암호화(`Crypto`)·Privacy(`GdprConsent`/`Dsar`)·Compliance(`Compliance`)·데이터 거버넌스(데이터 헌법 V1~6)·SecurityAudit 재사용(★중복 암호화/Privacy/Compliance/거버넌스 절대 금지·정본 재구현 금지·헌법 우선)·Data Classification Engine/중앙 KMS/Masking Engine 순신설·과대주장 금지·Part 048/데이터 헌법 상속.

## §7 Lifecycle 거버넌스
Creation→Classification→Protection Policy→Secure Storage→Controlled Access→Secure Sharing→Monitoring→Retention→Secure Deletion→Archive·생성 시점 보안 등급. 현행=Secure Storage=`Crypto`(암호화)·Access=`index.php`(RBAC)+`AccessReview`·Retention=media_gc_cron·Deletion=`Dsar`(erasure·CRM cascade 283차)·수집≠사용(데이터 헌법 Trust First). ★생성 시점 분류(형식)=순신설.

## §8 Data Classification 거버넌스
Public/Internal/Confidential/Restricted/Personal/Sensitive/Automated/Validation·정책 자동 적용. 현행=Source/Trust=`DataPlatform`(data_source registry·Trust Score 272차)·Personal=No-PII(v418.1·집계 cohort≠구매자 레코드). ★형식 Public/Confidential/Restricted 등급·Automated PII Detection=순신설(★data_source Trust Score≠형식 분류 등급 오흡수 금지).

## §9 Data Protection 거버넌스
Data/Field/Transparent Encryption/Tokenization/Static·Dynamic Masking/Secure Backup/Restore·저장+전송. 현행=Field Encryption=`Crypto`(AES-256-GCM·CRED_ENC_KEY·fail-closed·202/204차)·전송=nginx TLS·Masking=mask()(`ChannelCreds`/`WmsCctv`)·Tokenization=`Paddle` MoR(Part 028)·Backup seed=SQLite fallback/dist.bak. ★Transparent Encryption/형식 Masking Engine(Static/Dynamic)=순신설.

## §10 Privacy Management 거버넌스
Consent/DSAR/Right to Access·Rectification·Erasure/Portability/PIA/Reporting·법규+정책. 현행=Consent=`GdprConsent`·DSAR/Erasure=`Dsar`(283차·anonymize·CRM cascade)·No-PII(v418.1). ★Portability/Privacy Impact Assessment=순신설.

## §11 Compliance 거버넌스
Regulatory/GDPR/CCPA/PIPA/ISO27001/SOC2 Mapping/Dashboard/Reporting·규제 변경 정책 반영. 현행=`Compliance`(SOC2/ISO27001 준비도·프레임워크 매핑·감사로그/암호화/RBAC/SSO/GDPR introspection·Part 048)·GDPR=`GdprConsent`/`Dsar`. ★CCPA/PIPA 형식 매핑=순신설.

## §12 Data Governance 거버넌스
Data Security/Privacy/Encryption/Key Rotation/Retention/Access Policy/Compliance/Audit. 현행=★데이터 헌법(V1~6·`DATA_INTELLIGENCE_CONSTITUTION`/`DATA_SOURCE_ARCHITECTURE`/`DATA_TRUST_QUALITY`·Trust First·수집≠사용·source/trust/quality·테넌트 격리)·DataTrust=`DataPlatform`·Access=`AccessReview`·Retention seed=media_gc_cron·Audit=`SecurityAudit`. ★데이터 헌법=핵심 경쟁력·재정의 금지·형식 통합 Governance Manager=순신설(헌법 승격).

## §13 Security 거버넌스 (인프라·★중앙 KMS)
Tenant=`Db.php`([[reference_platform_growth_actas_tenant_hijack]])·RBAC=`index.php`·End-to-End Encryption=`Crypto`(AES-256-GCM)+nginx TLS·Key Rotation seed=root pw 회전(279차·양 .env GENIE_DB_PASS 동시갱신)·Audit=`SecurityAudit::verify`(★유일 tamper-evident·[[reference_menu_audit_log_not_tamper_evident]]). ★HSM/중앙 KMS(현재 CRED_ENC_KEY env)=순신설(★CRED_ENC_KEY env≠중앙 KMS 오흡수 금지).

## §14 Runtime 거버넌스
Data Classification·접근 권한 검증·암호화·마스킹·Compliance 검사·Security Event·Audit. 접근=`index.php`(RBAC)·암호화=`Crypto`·마스킹=mask()·Audit=`SecurityAudit`. ★Data Classification/Compliance 검사(형식 런타임)=순신설.

## §15 API 거버넌스 (8)
Classify Data/Encrypt/Mask/Validate Compliance/Query Classification/Consent/Rotate Key/Query Audit. 현행=Encrypt=`Crypto`·Consent=`GdprConsent` API·Compliance=`Compliance` API·DSAR=`Dsar` API·Audit=`SecurityAudit`. ★Classify Data/Rotate Key=순신설. Part 001 API 표준 상속.

## §16 Event 거버넌스 (8)
DataClassified/DataEncrypted/DataMasked/ConsentUpdated/ComplianceValidated/DataAccessGranted/KeyRotated/DataAudited. 현행=ConsentUpdated=`GdprConsent`·DataAudited=`SecurityAudit` seed(동기·event-driven 부재). ★DataClassified/KeyRotated=순신설. Data Platform §15 정합.

## §17 AI 거버넌스
개인정보 자동 탐지/민감정보 분류/데이터 유출 위험/이상 접근/규제 준수 위험/암호화 정책/데이터 보호 수준/Explainable. 현행=이상 접근=`AnomalyDetection`·유출 위험=`SupplyChain`·품질/Trust=`DataPlatform`(DataTrust)·Explainability=헌법 V4. ★AI는 데이터 자동 삭제/접근 권한 자동 변경 불가=헌법 V3+V5(안전 자동화)+`CHANGE_GATE`. PII 자동 탐지/민감정보 분류 AI=순신설. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 판정
전 메커니즘 **설계-only·코드 0·NOT_CERTIFIED.** ★암호화(`Crypto` AES-256-GCM)·Privacy(`GdprConsent`/`Dsar`/No-PII)·Compliance(`Compliance` SOC2/ISO27001)·데이터 거버넌스(★데이터 헌법 V1~6=핵심 경쟁력)·Key Rotation(root pw 279차)·Audit(`SecurityAudit`) 재사용·승격(★중복 암호화/Privacy/Compliance/거버넌스 절대 금지=값 분산=회귀·정본 재구현 금지·No-PII·헌법 우선)·형식 Data Classification Engine/중앙 KMS(HSM)/Masking Engine/Tokenization만 신설(부재·헌법 승격·CRED_ENC_KEY env≠KMS 오흡수 금지·과대주장 금지). Data Platform/SOC/IAM/데이터 헌법/헌법 상속·재정의 금지·★AI 데이터 자동 삭제/접근 권한 자동 변경 불가(V3+V5+CHANGE_GATE).
