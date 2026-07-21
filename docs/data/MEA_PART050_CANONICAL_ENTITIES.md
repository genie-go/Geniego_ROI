# MEA Part 050 — Canonical Entities Design & Judgment (§5~§17)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★단일호스트 현실·`Db` 폴백/`Health` 재사용·BC/DR/HA 순신설·오흡수 금지·과대주장 금지.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | BUSINESS_SERVICE | 플랜/서비스 | `AdminPlans`·플랜 registry | PARTIAL-weak |
| 2 | RECOVERY_PLAN | 형식 부재 | (Runbook 부재) | ABSENT |
| 3 | DISASTER_EVENT | 이상탐지 seed | `AnomalyDetection` | PARTIAL-weak |
| 4 | FAILOVER_POLICY | SQLite 폴백(자동) | `Db`(형식 정책 부재) | ABSENT-formal |
| 5 | BACKUP_JOB | dist.bak·SQLite 파일 | (형식 Job 부재) | ABSENT-formal |
| 6 | RESTORE_JOB | SQL 가드·db_restore 제거 | `DbAdmin`(:204·279차) | ABSENT-formal |
| 7 | RECOVERY_SITE | 데모-운영 2환경 | roi/roidemo(리전 아님) | ABSENT-formal |
| 8 | RECOVERY_POINT | 형식 부재 | (RPO 부재) | ABSENT |
| 9 | RECOVERY_OBJECTIVE | 형식 부재 | (RTO/RPO 부재) | ABSENT |
| 10 | AVAILABILITY_ZONE | 단일호스트 | (AZ 부재) | ABSENT |
| 11 | REPLICATION_POLICY | 형식 부재 | (복제 부재) | ABSENT |
| 12 | CONTINUITY_POLICY | 형식 부재 | (BC Plan 부재) | ABSENT |
| 13 | RESILIENCE_AUDIT | 해시체인 | `SecurityAudit` | PARTIAL |
| 14 | INCIDENT_RECOVERY | degraded-mode seed | `Db` 폴백·`Health` | PARTIAL-weak |
| 15 | DR_TEST | 형식 부재 | (DR Drill 부재) | ABSENT |

## §6~§17 표준 판정
- **§6 Domain(10)**: HA=`Db` 폴백(degraded-mode)·Health=`Health`. ★BC Planning/DR/Replication/Multi Region/Recovery Automation/Disaster Simulation=ABSENT(단일호스트).
- **§7 Lifecycle(10)**: Incident Detection=`Health`/`AnomalyDetection`·Protection=`Crypto`(Part 049). ★Backup/Replication/Failover/Failback/Validation/Runbook(형식)=ABSENT.
- **§8 BC(8)**: 서비스 우선순위 seed=`AdminPlans`. ★BIA/Continuity Plan/Dependency Mapping/Emergency Comm=ABSENT.
- **§9 DR(8)**: 데모-운영 2환경(리전 아님). ★Recovery Site/Automated Failover·Failback/Cross Region/DR Drill=ABSENT.
- **§10 Backup(8)**: dist.bak·SQLite 파일·Backup 암호화 seed=`Crypto`. ★Full/Incremental/Differential/Snapshot/PITR/Backup Validation/Retention(형식)=ABSENT.
- **§11 HA(8)**: SQLite 폴백(degraded)·nginx reload. ★Active-Active/Standby Cluster/Auto Failover/Load Balancing/Multi AZ/Capacity Scaling=ABSENT(단일호스트·SPOF 미제거).
- **§12 Governance**: Audit=`SecurityAudit`·배포 승인([[feedback_deploy_approval_mandatory]]). ★Recovery/Backup/Replication/Testing Policy(형식)=ABSENT.
- **§13 Security**: Tenant=`Db`·RBAC=`index.php`·Backup Encryption=`Crypto`(Part 049)·Audit=`SecurityAudit`. ★Replication Integrity Validation=ABSENT.
- **§17 AI**: 이상=`AnomalyDetection`·drift=`ModelMonitor`·Explainability=헌법 V4. ★AI 재해복구 자동 실행/환경 자동 전환 불가=헌법 V5+`CHANGE_GATE`+배포 승인. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 판정
**PARTIAL(§13·§14 INCIDENT_RECOVERY·§13 RESILIENCE_AUDIT) / PARTIAL-weak(§1·§3·§4·§5·§6·§7 seed·§10 seed·§11 SQLite 폴백) / ABSENT(§2·§8·§9·§12·§15 RECOVERY_PLAN/RECOVERY_POINT/RECOVERY_OBJECTIVE/AZ/REPLICATION/CONTINUITY/DR_TEST·형식 BC/DR Platform·Multi-Region·Failover Engine·HA Cluster·형식 Backup/Restore Job).** 코드 0. ★배포 현실=단일호스트라 형식 BC/DR/HA/Multi-Region 대부분 부재(부재증명 완료·과대주장 금지). `Db` 폴백/`Health`/`Crypto`(Backup 암호화)/`SecurityAudit`(Audit)/`AnomalyDetection`(AI) 재사용(★중복 금지·SQLite 폴백을 HA로 오흡수 금지)·BC/DR/HA/Multi-Region/Failover Engine/형식 Backup Job 순신설(★인프라 멀티노드/리전 선행 종속)·Part 044/045/046/048/049 상속·★AI 재해복구 자동 실행/환경 자동 전환 불가(V5+CHANGE_GATE).
