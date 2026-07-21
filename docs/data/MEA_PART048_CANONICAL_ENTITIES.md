# MEA Part 048 — Canonical Entities Design & Judgment (§5~§18)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★SecurityAudit/AnomalyDetection/Alerting/security-scan.yml/Compliance 재사용·SIEM/SOAR/Threat Intel/Forensics 순신설·Part 046/043 상속·과대주장 금지.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | SECURITY_EVENT | 감사 이벤트 | `SecurityAudit`(security_audit_log) | PARTIAL-strong |
| 2 | SECURITY_ALERT | 알림 정책 | `Alerting`(alert_policies) | PARTIAL-strong |
| 3 | INCIDENT | 감사 세션(형식 Incident 부재) | (289차 결함 수정) | PARTIAL-weak |
| 4 | THREAT | 이상 탐지 | `AnomalyDetection` | PARTIAL |
| 5 | IOC | 부재(IOC) | — | ABSENT |
| 6 | PLAYBOOK | 부재(SOAR Playbook) | — | ABSENT |
| 7 | CASE | 부재(형식 Case) | — | ABSENT |
| 8 | ANALYST | 감사자(Claude Code)·admin | (감사 세션)·admin | PARTIAL-weak |
| 9 | FORENSIC_EVIDENCE | 부재(Digital Forensics) | — | ABSENT |
| 10 | RESPONSE_ACTION | 결함 수정·actionPresets | (289차)·`Alerting`(actionPresets) | PARTIAL-weak |
| 11 | SECURITY_POLICY | RBAC/writeGuard·Change Gate | `index.php`·`CHANGE_GATE` | PARTIAL |
| 12 | SECURITY_AUDIT | ★유일 tamper-evident | `SecurityAudit.php`(verify) | PARTIAL-strong |
| 13 | THREAT_FEED | 부재(Threat Feed) | — | ABSENT |
| 14 | MITIGATION | 결함 수정·하드닝 | (289차 SQLi/IDOR/XSS/TOCTOU) | PARTIAL |
| 15 | COMPLIANCE_EVENT | SOC2/ISO 준비도·GDPR | `Compliance`·`GdprConsent`/`Dsar` | PARTIAL-strong |

## §6~§18 표준 판정
- **§6 Domain(10)**: Security Monitoring=SecurityAudit·Threat Detection=AnomalyDetection·Compliance=Compliance·Analytics=security-scan.yml. ★Threat Hunting/SOAR/Digital Forensics=ABSENT.
- **§7 Lifecycle(10)**: Event Collection=SecurityAudit·Threat Detection=AnomalyDetection·Alert=Alerting·Investigation/Response=289차 감사 세션·Post Analysis=NEXT_SESSION.md. ★Correlation/Incident Creation/Playbook Response(형식)=부분.
- **§8 SIEM(8)**: Log=SecurityAudit·Rule=Alerting·Behavior=AnomalyDetection·Compliance=Compliance. ★중앙 SIEM(Correlation/IOC/Risk Scoring)=ABSENT.
- **§9 SOAR(8)**: Approval seed=배포 승인/EPIC 06-A·Response seed=actionPresets. ★Playbook/Workflow/Auto Containment/Orchestration=ABSENT(★자동 대응 위험·헌법 V5).
- **§10 Threat Intelligence(8)**: Vulnerability=security-scan.yml(SCA). ★Threat Feed/IOC/MITRE ATT&CK/Threat Hunting=ABSENT.
- **§11 Incident Response(8)**: Root Cause/Eradication=289차 감사 세션·Lessons Learned=NEXT_SESSION.md/FP 레지스트리. ★형식 Classification/Playbook=부분.
- **§12 Governance**: Compliance=Compliance(SOC2/ISO)·Audit=SecurityAudit·Regulatory=GdprConsent/Dsar·Retention seed=media_gc_cron.
- **§13 Security**: Tenant/RBAC/★Audit Integrity(SecurityAudit 유일 tamper-evident)/No-PII/Encryption. ★Digital Evidence(형식)=ABSENT.
- **§18 AI**: 이상 행위=AnomalyDetection·Root Cause=289차 감사 세션·취약점=security-scan.yml·Explainability=헌법 V4·운영 시스템 자동 격리/사용자 계정 자동 삭제 불가=헌법 V3+V5+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§1·§2·§12·§15=이벤트/알림/감사/컴플라이언스) / PARTIAL(§3·§4·§8·§10·§11·§14) / ABSENT(§5·§6·§7·§9·§13 IOC/PLAYBOOK/CASE/FORENSIC/THREAT_FEED·SIEM/SOAR/Threat Intel/Forensics).** 코드 0. ★감사(`SecurityAudit` 유일 tamper-evident)·이상탐지(`AnomalyDetection`/`Alerting`)·취약점(`security-scan.yml`)·컴플라이언스(`Compliance`) 재사용(★중복 감사로그/이상탐지/취약점/컴플라이언스 절대 금지·정본 재구현 금지)·SIEM/SOAR/Threat Intel/Forensics 순신설(부재·과대주장 금지)·Part 046/043 상속·★AI 운영 시스템 자동 격리/사용자 계정 자동 삭제 불가(V3+V5+CHANGE_GATE).
