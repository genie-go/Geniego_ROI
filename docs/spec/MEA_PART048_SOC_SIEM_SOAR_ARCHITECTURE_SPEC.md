# MEA Part 048 — Enterprise Security Operations Center (SOC), SIEM & SOAR Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **IAM(Part 047)+Observability(046)+DevSecOps(043)+Data Platform(010~012 Security)**를 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). ★**보안 이벤트/감사(tamper-evident)/이상탐지/취약점 스캔/컴플라이언스 준비도는 실재이나 형식 SIEM/SOAR/Threat Intelligence/Forensics는 부재**(GT①·부재증명 완료). file:line 인용은 GT①②/ADR 등장분만(반날조). ★과대주장 금지.

## §1 작업 목적
전 플랫폼/앱/API/데이터/네트워크/클라우드/인프라 보안 이벤트 실시간 수집·분석·위협 탐지·사고 대응·자동화 대응·디지털 포렌식·지속 보안 운영. IAM/Observability/API/K8s/Data/AI/Security Platform 연계 Enterprise SOC Framework.

## §2 구현 범위
Security Operations Center · SIEM · SOAR · Threat Intelligence · Incident Response · Security Monitoring · Digital Forensics · Governance · Compliance Monitoring · AI Security Intelligence.

## §3 구현 목표 (10)
Enterprise SOC Platform · SIEM Engine · SOAR Platform · Threat Intelligence Service · Incident Response Engine · Security Analytics Engine · SOC Dashboard · Governance Manager · Security Audit Service · AI Security Advisor.

## §4 아키텍처 원칙 (10)
Security by Default · Zero Trust Integration · Continuous Monitoring · Automation First · Threat Intelligence Driven · Event Driven · Metadata Driven · AI Assisted · Enterprise Standard · Audit by Default.

## §5 Canonical Entity (15)
SECURITY_EVENT · SECURITY_ALERT · INCIDENT · THREAT · IOC · PLAYBOOK · CASE · ANALYST · FORENSIC_EVIDENCE · RESPONSE_ACTION · SECURITY_POLICY · SECURITY_AUDIT · THREAT_FEED · MITIGATION · COMPLIANCE_EVENT. → 상세 = `MEA_PART048_CANONICAL_ENTITIES.md`.

## §6 SOC Domain (10)
Security Monitoring/Threat Detection/Threat Hunting/Incident Management/SOAR Automation/Digital Forensics/Threat Intelligence/Compliance Monitoring/Security Analytics/Enterprise SOC. Security Event Registry 기준. → ★현행=Security Monitoring=`SecurityAudit`(security_audit_log·verify tamper-evident)·Threat Detection=`AnomalyDetection`·Compliance Monitoring=`Compliance`(SOC2/ISO27001 준비도)·Security Analytics=`security-scan.yml`(283차). ★Threat Hunting/SOAR Automation/Digital Forensics=부재.

## §7 Security Incident Lifecycle (10)
Event Collection→Correlation→Threat Detection→Alert Generation→Incident Creation→Investigation→Response→Recovery→Post Analysis→Archive. 전체 대응 이력. → ★현행=Event Collection=`SecurityAudit`(감사로그)·Threat Detection=`AnomalyDetection`·Alert=`Alerting`·Investigation/Response=289차 감사 세션(Claude Code)·Post Analysis=NEXT_SESSION.md. ★형식 Correlation/Incident Creation/Playbook Response=부분.

## §8 SIEM (8)
Security Log Collection/Event Correlation/Rule-Based Detection/Behavior Analytics/IOC Matching/Risk Scoring/Compliance Monitoring/Security Dashboard. 중앙 SIEM. → ★현행=Security Log=`SecurityAudit`(security_audit_log)·Rule-Based Detection seed=`Alerting`(alert_policies)·Behavior Analytics=`AnomalyDetection`·Compliance=`Compliance`(SOC2/ISO27001). ★형식 중앙 SIEM(Event Correlation Engine/IOC Matching/Risk Scoring)=부재.

## §9 SOAR (8)
Incident Playbook/Workflow Automation/Automated Investigation/Automated Containment/Ticket Integration/Approval Workflow/Response Orchestration/Evidence Collection. 정책 기반 승인. → ★현행=Approval Workflow seed=배포 승인 필수/EPIC 06-A·Alerting actionPresets(response seed). ★형식 SOAR(Playbook/Workflow Automation/Auto Containment/Response Orchestration)=부재(★자동 대응 위험·헌법 V5 승인정책).

## §10 Threat Intelligence (8)
Threat Feed/IOC Management/Threat Scoring/Classification/MITRE ATT&CK/Vulnerability Correlation/Threat Hunting/Sharing. → ★현행=Vulnerability Correlation seed=`security-scan.yml`(SCA·Packagist CVE·npm audit·283차)·CodeQL(SAST). ★형식 Threat Feed/IOC Management/MITRE ATT&CK Mapping/Threat Hunting=부재.

## §11 Incident Response (8)
Classification/Prioritization/Containment/Eradication/Recovery/Root Cause/Post Incident Review/Lessons Learned. Playbook 기반. → ★현행=Root Cause/Eradication=289차 감사 세션(실 결함 수정·SQLi/IDOR/SSRF/XSS/TOCTOU·blob cap·writeGuard)·Post Incident=PM 이력·Lessons Learned=NEXT_SESSION.md/FP 레지스트리. ★형식 Incident Classification/Playbook Response=부분.

## §12 Security Governance (8)
Detection/Response/Threat Intelligence/Retention/Compliance/Investigation Policy/Audit Trail/Regulatory Compliance. → ★현행=Compliance=`Compliance`(SOC2/ISO27001 준비도)·Audit=`SecurityAudit`·Regulatory=`GdprConsent`/`Dsar`(GDPR)·Retention seed=media_gc_cron. 형식 통합 Governance Manager=부분.

## §13 Data Security
Tenant Isolation · RBAC · Security Log Encryption · Evidence Integrity · Secure Evidence Storage · Audit. 디지털 증거 무결성. → ★현행=Tenant=`Db.php`·RBAC=`index.php`·★Audit Integrity=`SecurityAudit`(★유일 tamper-evident hash chain·verify)·No-PII(로그)·Encryption=`Crypto`. ★Digital Evidence/Secure Evidence Storage(형식)=부재.

## §14 Runtime 규칙
Security Event 수집 · Event Correlation · Threat Detection · Incident 생성 · Playbook 실행 · Alert 전송 · Audit. → ★현행=Event 수집=`SecurityAudit`·Threat Detection=`AnomalyDetection`·Alert=`Alerting`·Audit=`SecurityAudit`. ★Event Correlation/Playbook 실행(형식)=부재.

## §15 API 표준 (8)
Register Security Event/Query Threat Intelligence/Create Incident/Execute Playbook/Query Security Alert/Investigation/Dashboard/Query Audit. → ★현행=Security Alert=`Alerting` API·Audit=`SecurityAudit`·Compliance=`Compliance` API. ★Threat Intelligence/Create Incident/Execute Playbook(형식)=부재. Part 001 API 표준 상속.

## §16 Event 표준 (8)
SecurityEventCollected/ThreatDetected/AlertGenerated/IncidentOpened/PlaybookExecuted/ThreatContained/IncidentClosed/SecurityAudited. → ★현행=AlertGenerated=`Alerting`·ThreatDetected=`AnomalyDetection`·SecurityAudited=`SecurityAudit` seed(동기·event-driven 부재). ★PlaybookExecuted/IncidentOpened(형식)=부재. Data Platform §15 정합.

## §17 AI Integration
이상 행위 탐지 · 공격 패턴 분석 · 위협 우선순위 · Incident 자동 분류 · Root Cause · 대응 Playbook 추천 · Threat Intelligence 예측 · Explainable. **AI는 운영 시스템 자동 격리/사용자 계정 자동 삭제 불가.** → ★현행=이상 행위=`AnomalyDetection`·Root Cause=289차 감사 세션(Claude Code)·취약점=`security-scan.yml`·Explainability=헌법 V4·자동 격리/삭제 불가=헌법 V3+V5+`CHANGE_GATE`. ★공격 패턴/위협 우선순위/Playbook 추천 AI=순신설. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §18 성능 요구사항
Security Event ≤3초 · Threat Detection ≤5초 · Correlation ≤10초 · Incident ≤5초 · Dashboard ≤2초 · Availability ≥99.99%. (현행 `SecurityAudit`/`AnomalyDetection` seed.)

## §19 Completion Criteria
Enterprise SOC·SIEM·SOAR·Threat Intelligence·Incident Response·Governance·Security·Runtime·API/Event·AI 구현. → **부분 충족**(보안 이벤트/감사/이상탐지/취약점/컴플라이언스 준비도 실재·형식 SIEM/SOAR/Threat Intel/Forensics=미완). 코드 0.

## 판정
**PARTIAL / ABSENT-formal(SIEM Engine·SOAR·Threat Intelligence·Digital Forensics).** ★실재=Security Event/Audit(`SecurityAudit`·security_audit_log·verify·★유일 tamper-evident hash chain·289차 정본)·Threat/Anomaly Detection(`AnomalyDetection`·`Alerting` alert_policies)·Vulnerability(`security-scan.yml`·SAST CodeQL/SCA npm·composer audit·283차)·Compliance Monitoring(`Compliance`·SOC2/ISO27001 준비도·감사로그/암호화/RBAC/SSO/GDPR introspection)·Regulatory(`GdprConsent`/`Dsar`)·Incident Response seed(289차 감사 세션·SQLi/IDOR/SSRF/XSS/TOCTOU/blob cap/writeGuard 실 결함 수정·Root Cause·Lessons Learned)·Approval(EPIC 06-A·헌법 V5). ★**부재(부재증명 완료·siem/soar/threat-feed/playbook/ioc/mitre grep 0)=형식 SIEM Engine(Event Correlation/IOC Matching/Risk Scoring)·SOAR(Playbook/Workflow Automation/Auto Containment/Orchestration)·Threat Intelligence(Threat Feed/IOC Management/MITRE ATT&CK/Threat Hunting)·형식 Incident/Case Management·Digital Forensics(Evidence Chain).** ★핵심=**보안 이벤트·감사(tamper-evident)·이상탐지·취약점 스캔·컴플라이언스 준비도는 실재이나 형식 SIEM·SOAR·Threat Intelligence·Forensics는 부재**(단일 앱·전용 SOC 플랫폼 아님·과대주장 금지·[[feedback_competitive_gap_verify]]). IAM/Observability/DevSecOps Platform 상속(재정의 금지)·★중복 감사로그/이상탐지/취약점 스캔/컴플라이언스 절대 금지(`SecurityAudit`/`AnomalyDetection`/`security-scan.yml`/`Compliance` 정본 재구현 금지·★SecurityAudit=유일 tamper-evident·hash_chain 장식 아닌 verify() 정본)·마케팅 AI KEEP_SEPARATE·★AI 운영 시스템 자동 격리/사용자 계정 자동 삭제 불가(V3+V5·SOAR 자동 대응 승인정책 필수). 코드 변경 0.

## 다음
MEA Part 049 — Enterprise Data Security, Privacy & Compliance Architecture(본 SOC 상속·★Crypto/GdprConsent/Compliance 실재·Part 006/012 상속).
