# MEA Part 049 — Enterprise Data Security, Privacy & Compliance Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **Data Platform(001~012·006 DQM·010~012 Security)+SOC(048)+IAM(047)+데이터 헌법(V1~6)**을 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). ★**암호화/Privacy(GDPR·DSAR)/Compliance/데이터 거버넌스는 강하게 실재**(GT①·`Crypto`·`GdprConsent`·`Dsar`·`Compliance`·데이터 헌법)·본 Part는 형식 Data Classification Engine/중앙 KMS(HSM)/Masking Engine 계층만 추가(암호화/Privacy 재구현 없이). ★데이터 헌법(V1~6) 정본 준수. file:line 인용은 GT①②/ADR 등장분만(반날조). ★과대주장 금지.

## §1 작업 목적
전 데이터 CIA(기밀성/무결성/가용성)·개인정보 보호/데이터 보호/규제 준수/데이터 거버넌스/생명주기 보안 표준화. Data/Commerce/Logistics/AI/IAM/SOC/Observability Platform + 전 업무 시스템 연계 Enterprise Data Security Framework.

## §2 구현 범위
Data Security · Privacy · Data Classification · Encryption/Key Management · Data Masking · Compliance · Data Governance · Data Audit · AI Data Security Intelligence.

## §3 구현 목표 (10)
Enterprise Data Security Platform · Privacy Management Platform · Data Classification Engine · Encryption & Key Management Service · Data Masking Engine · Compliance Management Service · Data Security Dashboard · Data Governance Manager · Data Audit Service · AI Data Security Advisor.

## §4 아키텍처 원칙 (10)
Security by Design · Privacy by Design · Zero Trust Data Access · Least Privilege · Compliance First · Metadata Driven · Event Driven · AI Assisted · Enterprise Standard · Audit by Default.

## §5 Canonical Entity (15)
DATASET · DATA_CLASSIFICATION · PERSONAL_DATA · SENSITIVE_DATA · ENCRYPTION_KEY · MASKING_POLICY · PRIVACY_POLICY · CONSENT · DATA_ACCESS · DATA_RETENTION · COMPLIANCE_RULE · DATA_AUDIT · SECURITY_EVENT · DATA_RISK · DATA_PROTECTION_POLICY. → 상세 = `MEA_PART049_CANONICAL_ENTITIES.md`.

## §6 Data Security Domain (10)
Data Classification/Encryption/Masking/Tokenization/Key Management/Privacy Protection/Data Compliance/Retention/Secure Data Sharing/Enterprise Data Security. Data Classification Registry 기준. → ★현행=Encryption=`Crypto`(AES-256-GCM)·Privacy=`GdprConsent`/`Dsar`·Compliance=`Compliance`·데이터 분류=`DataPlatform`(data_source registry·source/trust/quality)·Masking=No-PII(v418.1). ★형식 Data Classification Registry/Tokenization/HSM=부분.

## §7 Data Lifecycle Security (10)
Creation→Classification→Protection Policy→Secure Storage→Controlled Access→Secure Sharing→Monitoring→Retention→Secure Deletion→Archive. 생성 시점 보안 등급. → ★현행=Secure Storage=`Crypto`(암호화 at rest)·Controlled Access=`index.php`(RBAC)+`AccessReview`·Retention=media_gc_cron·Secure Deletion=`Dsar`(erasure·CRM cascade 283차)·수집≠사용(데이터 헌법 Trust First). ★생성 시점 분류(형식)=부분.

## §8 Data Classification (8)
Public/Internal/Confidential/Restricted/Personal Data Classification/Sensitive Data Identification/Automated/Validation. 정책 자동 적용. → ★현행=Source/Trust 분류=`DataPlatform`(data_source registry·Trust Score·272차)·Personal Data=No-PII 정책(v418.1·집계 cohort≠구매자 레코드). ★형식 Public/Internal/Confidential/Restricted 등급·Automated PII Detection=부재(데이터 헌법 원칙 존재).

## §9 Data Protection (8)
Data/Field/Transparent Encryption/Tokenization/Static·Dynamic Masking/Secure Backup/Restore. 저장+전송 암호화. → ★★현행=Field Encryption=`Crypto`(AES-256-GCM·CRED_ENC_KEY·fail-closed·202/204차·자격증명/API 키)·전송=nginx TLS·Masking=mask()(read·`ChannelCreds`/`WmsCctv`)·Tokenization=`Paddle` MoR(Part 028)·Backup seed=SQLite fallback/dist.bak. ★형식 Transparent Encryption/Static·Dynamic Masking Engine=부분.

## §10 Privacy Management (8)
Consent/DSAR/Right to Access·Rectification·Erasure/Portability/Privacy Impact Assessment/Reporting. 법규+정책 준수. → ★★현행=Consent=`GdprConsent`·DSAR=`Dsar`(283차·erasure/anonymize/data_subject·CRM cascade 삭제)·Right to Erasure=`Dsar`·No-PII 설계(v418.1). ★Portability/Privacy Impact Assessment(형식)=부분.

## §11 Compliance Management (8)
Regulatory/GDPR/CCPA/PIPA/ISO 27001/SOC 2 Mapping/Compliance Dashboard/Reporting. 규제 변경 정책 반영. → ★현행=`Compliance`(SOC2/ISO27001 준비도·감사로그/암호화/RBAC/SSO/GDPR introspection·프레임워크 매핑·Part 048)·GDPR=`GdprConsent`/`Dsar`. ★CCPA/PIPA 형식 매핑=부분.

## §12 Data Governance (8)
Data Security/Privacy/Encryption/Key Rotation/Retention/Access Policy/Compliance/Audit. → ★★현행=데이터 헌법(V1~6·`DATA_INTELLIGENCE_CONSTITUTION`·`DATA_SOURCE_ARCHITECTURE`·`DATA_TRUST_QUALITY`·`DATA_ARCHITECTURE`)·DataTrust=`DataPlatform`·Access=`AccessReview`·Retention seed=media_gc_cron·Audit=`SecurityAudit`. 형식 통합 Governance Manager=부분(헌법 강함).

## §13 Data Security (인프라)
Tenant Isolation · RBAC · End-to-End Encryption · HSM Integration · Key Rotation · Audit. 중앙 KMS. → ★현행=Tenant=`Db.php`·RBAC=`index.php`·Encryption=`Crypto`(AES-256-GCM)·Key Rotation seed=root pw 회전(279차·양 .env GENIE_DB_PASS 동시갱신)·Audit=`SecurityAudit`. ★HSM/중앙 KMS(형식·현재 CRED_ENC_KEY env)=부재.

## §14 Runtime 규칙
Data Classification · 접근 권한 검증 · 암호화 적용 · 마스킹 적용 · Compliance 검사 · Security Event · Audit. → ★현행=접근 검증=`index.php`(RBAC)·암호화=`Crypto`·마스킹=mask()·Audit=`SecurityAudit`. ★Data Classification/Compliance 검사(형식 런타임)=부분.

## §15 API 표준 (8)
Classify Data/Encrypt/Mask/Validate Compliance/Query Classification/Consent/Rotate Key/Query Audit. → ★현행=Encrypt=`Crypto`·Consent=`GdprConsent` API·Compliance=`Compliance` API·DSAR=`Dsar` API·Audit=`SecurityAudit`. ★Classify Data/Rotate Key(형식)=부분. Part 001 API 표준 상속.

## §16 Event 표준 (8)
DataClassified/DataEncrypted/DataMasked/ConsentUpdated/ComplianceValidated/DataAccessGranted/KeyRotated/DataAudited. → ★현행=ConsentUpdated=`GdprConsent`·DataAudited=`SecurityAudit` seed(동기·event-driven 부재). ★DataClassified/KeyRotated(형식)=부분. Data Platform §15 정합.

## §17 AI Integration
개인정보 자동 탐지 · 민감정보 분류 · 데이터 유출 위험 · 이상 접근 탐지 · 규제 준수 위험 예측 · 암호화 정책 추천 · 데이터 보호 수준 평가 · Explainable. **AI는 데이터 자동 삭제/접근 권한 자동 변경 불가.** → ★현행=이상 접근=`AnomalyDetection`·유출 위험=`SupplyChain`(risk)·데이터 품질/Trust=`DataPlatform`(DataTrust)·Explainability=헌법 V4·데이터 자동 삭제/권한 자동 변경 불가=헌법 V3+V5+`CHANGE_GATE`. ★PII 자동 탐지/민감정보 분류 AI=순신설. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §18 성능 요구사항
분류 ≤1초 · 암호화 ≤500ms · 마스킹 ≤500ms · 접근 검증 ≤100ms · Dashboard ≤2초 · Availability ≥99.99%. (현행 `Crypto`/`index.php` seed.)

## §19 Completion Criteria
Data Security Platform·Privacy·Data Classification·Encryption/Key Management·Masking·Compliance·Governance·Runtime·API/Event·AI 구현. → **부분 충족·강함**(암호화/Privacy/Compliance/거버넌스 실재·형식 Data Classification Engine/HSM-KMS/Masking Engine=미완). 코드 0.

## 판정
**PARTIAL-strong / ABSENT-formal(Data Classification Engine·중앙 KMS/HSM·형식 Masking Engine).** ★실재 강함=Encryption(`Crypto`·AES-256-GCM·CRED_ENC_KEY·fail-closed·202/204차·field/credential at rest·nginx TLS in transit·mask() read)·Privacy(`GdprConsent` consent·`Dsar` DSAR/erasure/anonymize 283차·CRM cascade·No-PII v418.1)·Compliance(`Compliance`·SOC2/ISO27001/GDPR 준비도·프레임워크 매핑)·Data Governance(★데이터 헌법 V1~6·`DataPlatform` DataTrust/data_source registry·source/trust/quality tracking·272차·수집≠사용 Trust First)·Data Classification seed(data_source registry·Trust Score)·Key Rotation seed(root pw 회전 279차)·Retention(media_gc_cron/`Dsar`)·Access(`index.php` RBAC·`AccessReview`)·Audit(`SecurityAudit`). ★**부재(부재증명 완료)=형식 Data Classification Engine(Public/Internal/Confidential/Restricted 등급·Automated PII Detection)·중앙 Key Management(HSM/KMS·형식 Key Rotation·현재 CRED_ENC_KEY env)·형식 Masking Engine(Static/Dynamic)·형식 Tokenization(Paddle MoR 제외)·Privacy Impact Assessment.** ★핵심=**암호화·Privacy(GDPR/DSAR)·Compliance·데이터 거버넌스는 강하게 실재(Crypto AES-256-GCM·Dsar 283차·데이터 헌법 V1~6=핵심 경쟁력)이나 형식 Data Classification Engine·중앙 KMS/HSM·Masking Engine은 부재**(데이터 헌법 원칙 존재·구현 정본 준수·과대주장 금지·[[feedback_competitive_gap_verify]]). Data Platform/SOC/IAM/데이터 헌법 상속(재정의 금지·데이터 헌법 우선)·★중복 암호화/Privacy/Compliance/거버넌스 절대 금지(`Crypto`/`GdprConsent`/`Dsar`/`Compliance`/데이터 헌법 정본 재구현 금지)·No-PII·마케팅 AI KEEP_SEPARATE·★AI 데이터 자동 삭제/접근 권한 자동 변경 불가(V3+V5). 코드 변경 0.

## 다음
MEA Part 050 — Enterprise Business Continuity, Disaster Recovery & Resilience Architecture(본 Data Security 상속·★SQLite fallback/dist.bak/데모-운영 seed 실재·형식 DR 부재).
