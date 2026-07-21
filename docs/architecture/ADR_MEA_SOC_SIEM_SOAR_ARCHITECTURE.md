# ADR — MEA Part 048 Enterprise Security Operations Center (SOC), SIEM & SOAR Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part048 EXISTING/DUPLICATE) 등장 file:line만(반날조). ★과대주장 금지·부재증명 완료.

## 맥락
MEA Part 048은 SOC/SIEM/SOAR. ★**보안 이벤트/감사(tamper-evident)/이상탐지/취약점 스캔/컴플라이언스 준비도는 실재이나 형식 SIEM/SOAR/Threat Intelligence/Forensics는 부재**: 실재=`SecurityAudit`(security_audit_log·verify·★유일 tamper-evident hash chain·289차·GT①)·`AnomalyDetection`(threat/anomaly·GT①)·`Alerting`(alert_policies·GT①)·`security-scan.yml`(SAST/SCA·283차·GT①)·`Compliance`(SOC2/ISO27001 준비도·GT①)·`GdprConsent`/`Dsar`(GDPR). ★부재(부재증명 완료·siem/soar/threat-feed/playbook/ioc/mitre grep 0)=형식 SIEM/SOAR/Threat Intelligence/Forensics. 본 Part는 IAM(Part 047)/Observability(046)/DevSecOps(043) 상속(재정의 금지).

## 결정
- **D-1 (Part 047/046/043/010~012 재정의 금지):** IAM(Part 047)·Observability(Part 046·`AnomalyDetection`/`Alerting`)·DevSecOps(Part 043·`security-scan.yml`)·Metadata(Part 004)를 준수·인용. 중복 정의 금지.
- **D-2 (Security Audit = SecurityAudit 승격·★유일 tamper-evident·중복 절대 금지):** Security Event/Audit = `SecurityAudit`(security_audit_log·verify·hash chain). ★★`SecurityAudit::verify`=유일 실 tamper-evident append-only 해시체인(289차·[[reference_menu_audit_log_not_tamper_evident]]·menu_audit_log hash_chain은 장식·verify() 정본)·재구현 금지. ★중복 감사로그 신설 절대 금지. 형식 SIEM Log Collection=`SecurityAudit` 승격.
- **D-3 (Threat Detection/Vulnerability = AnomalyDetection/security-scan.yml 승격):** Threat/Anomaly=`AnomalyDetection`·`Alerting`(alert_policies)·Vulnerability=`security-scan.yml`(SAST CodeQL/SCA npm·composer audit·283차). ★중복 이상탐지/취약점 스캔 금지(Part 046/043 정합). 형식 SIEM Detection Engine/Threat Intelligence=순신설.
- **D-4 (SIEM/SOAR/Threat Intel/Forensics = 부재·순신설):** ★형식 SIEM Engine(Event Correlation/IOC Matching/Risk Scoring)·SOAR(Playbook/Workflow Automation/Auto Containment/Orchestration)·Threat Intelligence(Threat Feed/IOC/MITRE ATT&CK/Threat Hunting)·Digital Forensics(Evidence Chain)·형식 Incident/Case Management=**부재·순신설**(부재증명 완료). ★SOAR 자동 대응=헌법 V5 승인정책 필수(자동 격리/삭제 금지). Incident Response seed=289차 감사 세션(실 결함 수정·Root Cause·Lessons Learned·형식 SOC 아님).
- **D-5 (Compliance/Security/AI = 헌법 정합):** Compliance=`Compliance`(SOC2/ISO27001 준비도·감사로그/암호화/RBAC/SSO/GDPR introspection)·Regulatory=`GdprConsent`/`Dsar`·Tenant=`Db.php`·RBAC=`index.php`·No-PII(로그)·Encryption=`Crypto`. AI(이상 행위/공격 패턴/Root Cause)=`AnomalyDetection`/289차 감사 세션·Explainability=헌법 V4·★AI 운영 시스템 자동 격리/사용자 계정 자동 삭제 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. IAM/Observability/DevSecOps/Data Platform/헌법 상속·재정의 금지·Security Audit(`SecurityAudit` 유일 tamper-evident)·Threat/Anomaly(`AnomalyDetection`/`Alerting`)·Vulnerability(`security-scan.yml`)·Compliance(`Compliance`)·Regulatory(`GdprConsent`/`Dsar`) 재사용(★중복 감사로그/이상탐지/취약점/컴플라이언스 절대 금지·정본 재구현 금지·SecurityAudit verify() 정본)·형식 SIEM Engine/SOAR/Threat Intelligence/Digital Forensics/Incident Management만 신설(부재·전용 SOC 플랫폼 아님·SOAR 자동 대응 승인정책 필수·과대주장 금지). 실행은 SOC/SIEM/SOAR 플랫폼 도입 결정 종속.
