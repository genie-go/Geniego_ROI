# ADR — MEA Part 049 Enterprise Data Security, Privacy & Compliance Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part049 EXISTING/DUPLICATE) 등장 file:line만(반날조). ★과대주장 금지·부재증명 완료·데이터 헌법 우선.

## 맥락
MEA Part 049는 Data Security/Privacy/Compliance. ★**암호화/Privacy(GDPR·DSAR)/Compliance/데이터 거버넌스는 강하게 실재**: `Crypto`(AES-256-GCM·CRED_ENC_KEY·fail-closed·202/204차·GT①)·`GdprConsent`(consent·GT①)·`Dsar`(283차 DSAR/erasure/anonymize·부재증명 후 신설·GT①)·`Compliance`(SOC2/ISO27001/GDPR 준비도·GT①)·No-PII(v418.1)·★데이터 헌법(V1~6·`DATA_INTELLIGENCE_CONSTITUTION`/`DATA_SOURCE_ARCHITECTURE`/`DATA_TRUST_QUALITY`)·`DataPlatform`(DataTrust/data_source registry·272차). ★데이터 거버넌스=핵심 경쟁력(헌법). 부재=형식 Data Classification Engine/중앙 KMS(HSM)/Masking Engine. 본 Part는 Data Platform(001~012)/SOC(048)/IAM(047)/데이터 헌법 상속(재정의 금지).

## 결정
- **D-1 (Data Platform/SOC/IAM/데이터 헌법 재정의 금지·헌법 우선):** DQM(Part 006)·Security(Part 010~012)·SOC(Part 048)·IAM(Part 047)·★데이터 헌법(V1~6·구현 정본 `DATA_ARCHITECTURE.md`)을 준수·인용. ★데이터 영역 변경 시 데이터 헌법 우선. 중복 정의 금지.
- **D-2 (Encryption = Crypto 승격·★중복 암호화 절대 금지):** Encryption = `Crypto`(AES-256-GCM·CRED_ENC_KEY·fail-closed)·전송=nginx TLS·mask() read. ★204차 평문→AES-256-GCM 전환 이력(claude_api_key/imggen_api_key)·재구현 금지. ★중복 암호화 신설 절대 금지(값 분산=회귀). 형식 Encryption Service=`Crypto` 승격.
- **D-3 (Privacy = GdprConsent/Dsar 승격·★중복 Privacy 절대 금지):** Privacy = `GdprConsent`(consent)·`Dsar`(283차 DSAR/erasure/anonymize·CRM cascade 삭제)·No-PII(v418.1·집계 cohort≠구매자 레코드). ★Dsar 283차 부재증명 후 신설(dsar/erasure/data_subject grep 0)·정본·재구현 금지. 형식 Privacy Management Platform=`GdprConsent`/`Dsar` 승격.
- **D-4 (Data Governance = 데이터 헌법/DataPlatform 승격):** Data Governance = ★데이터 헌법(V1~6·Trust First·수집≠사용·source/trust/quality 기록·테넌트 격리)·`DataPlatform`(DataTrust/data_source registry·272차)·Data Classification seed=data_source registry(Trust Score). ★헌법=핵심 경쟁력·재정의 금지. 형식 Data Classification Engine(Public/Confidential/Restricted 등급·PII Detection)·Data Governance Manager=순신설(헌법 승격).
- **D-5 (KMS/Masking/Compliance/AI = 부재/헌법 정합):** ★형식 중앙 Key Management(HSM/KMS·현재 CRED_ENC_KEY env·root pw 회전 279차 seed)·Masking Engine(Static/Dynamic·현재 mask() ad-hoc)·Tokenization(Paddle MoR 제외)=순신설. Compliance=`Compliance`(SOC2/ISO27001/GDPR·Part 048)·CCPA/PIPA 매핑=순신설. AI(이상 접근/유출 위험)=`AnomalyDetection`/`SupplyChain`·Explainability=헌법 V4·★AI 데이터 자동 삭제/접근 권한 자동 변경 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Data Platform/SOC/IAM/데이터 헌법/헌법 상속·재정의 금지·헌법 우선·Encryption(`Crypto`)·Privacy(`GdprConsent`/`Dsar`/No-PII)·Compliance(`Compliance`)·Data Governance(데이터 헌법 V1~6/`DataPlatform`)·Key Rotation(root pw 279차)·Audit(`SecurityAudit`) 재사용(★중복 암호화/Privacy/Compliance/거버넌스 절대 금지·정본 재구현 금지·No-PII)·형식 Data Classification Engine/중앙 KMS(HSM)/Masking Engine/Tokenization만 신설(부재·헌법 승격·과대주장 금지). 실행은 Classification/KMS 도입 결정 종속.
