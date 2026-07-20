# DSAR — EAGOM Canonical Entities Design & Judgment (Part 3-31 §2~§25)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★상위 Part 3-25/3-30 엔진 참조(재정의 금지).

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_GLOBAL_OPERATION | 부재 | — | ABSENT |
| 2 | APPROVAL_OPERATION_POLICY | 부재 | — | ABSENT |
| 3 | APPROVAL_OPERATION_RUNBOOK | 비형식 runbook | `NEXT_SESSION.md`·`docs/` | PARTIAL-informal |
| 4 | APPROVAL_OPERATION_PLAYBOOK | 부재 | — | ABSENT |
| 5 | APPROVAL_OPERATION_SOP | 비형식(docs) | `docs/` | PARTIAL-informal |
| 6 | APPROVAL_OPERATION_INCIDENT | alert_policy·action_request(3-30 엔진) | `Alerting.php` | PARTIAL(3-30 참조·PIR 부재) |
| 7 | APPROVAL_OPERATION_PROBLEM | 부재(Known Error DB 없음) | — | ABSENT |
| 8 | APPROVAL_OPERATION_CHANGE | deploy 파이프라인 | `deploy.yml` | PARTIAL(3-30 참조·CAB 부재) |
| 9 | APPROVAL_OPERATION_RELEASE | deploy·수동 pscp | `deploy.ps1`·`deploy.sh` | PARTIAL(Canary/Calendar 부재) |
| 10 | APPROVAL_OPERATION_CONFIGURATION | env/config baseline(CMDB 없음) | `Db.php`·`AdminPlans.php` | PARTIAL(CMDB/Drift 신설) |
| 11 | APPROVAL_OPERATION_BACKUP | schema migration(db_restore 제거) | `migrate.php` | PARTIAL(형식 Backup Ops 신설) |
| 12 | APPROVAL_OPERATION_RECOVERY | schema rollback | `Db.php`·`migrate.php` | PARTIAL(RPO/RTO/DR Activation 신설) |
| 13 | APPROVAL_OPERATION_COMPLIANCE | control inventory | `Compliance.php` | PARTIAL |
| 14 | APPROVAL_OPERATION_SNAPSHOT | 부재 | — | ABSENT |
| 15 | APPROVAL_OPERATION_EVIDENCE | append-only 정본 | `SecurityAudit.php` | PARTIAL(체인 재사용) |
| 16 | APPROVAL_OPERATION_DIGEST | 부재 | — | ABSENT |
| 17 | APPROVAL_OPERATION_ANALYTICS | 부재(MTTR/MTBF/SLA 미집계) | — | ABSENT |
| 18 | APPROVAL_OPERATION_BASELINE | env/config baseline | `Db.php` | PARTIAL |
| 19 | APPROVAL_OPERATION_CERTIFICATION | 부재 | — | ABSENT |
| 20 | APPROVAL_OPERATION_VERSION | deployMarker·migration 락 | `Db.php` | PARTIAL |

## 도메인 설계 계약(§3~§25 요지)
- **§4 Global NOC·§5 Global SOC**: 모니터링 substrate(Health/SystemMetrics·SecurityAudit·CI 스캔) 실재이나 **조직(Tier 1~3·Follow-the-Sun·NOC/SOC 팀)은 부재** → 조직/프로세스 신설이 본질(코드 아님).
- **§6~10 Service/Incident/Change/Release/Configuration Ops**: 3-30 엔진 참조 + CMDB/Service Catalog 신설.
- **§14~16 Backup/DR/BCP**: 3-25 Rollback Readiness/DR/Cutover 참조. 실 배포=단일 호스트라 Multi-Region/Alternate Site 부재(인프라 신설 종속).
- **§20 Automation Ops**: cron 러너(`backend/bin/*_cron.php`·`install_crontab.sh`·`check_cron_ssot.sh`) 형식화(Health Check/Backup/Compliance Validation 자동화).

## 판정
**PARTIAL(§3·§5~13·§15·§18·§20=Health/Alerting/deploy/cron/Compliance/SecurityAudit/migration substrate·3-25/3-30 공유) / ABSENT-formal(NOC/SOC 조직·CMDB·Multi-Region·BCP·Analytics·Certification).** 코드 0. BLOCKED_PREREQUISITE. 실행 시 상위 Part 엔진 참조 + 조직/인프라 신설(엔진 재정의·db_restore 재부활 금지).
