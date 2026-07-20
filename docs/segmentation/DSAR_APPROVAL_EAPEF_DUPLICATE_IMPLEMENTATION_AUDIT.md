# DSAR — EAPEF Ground-Truth ② Duplicate Implementation Audit (Part 3-30)

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = EAPEF 신설이 기존 운영/모니터링 자산과 중복(엔진 난립)하지 않도록 KEEP_SEPARATE 경계 확정.

## 동음이의(같은 이름·다른 목적) — 오흡수 금지
| EAPEF 개념 | 코드베이스 동명 자산 | 인용 | 판정 |
|---|---|---|---|
| KPI / Dashboard | 비즈니스 ROI/P&L KPI·대시보드 | `Handlers/Pnl.php`·프론트 대시보드 | KEEP_SEPARATE(비즈니스 ≠ Operational KPI/Health Index) |
| Health/Metrics | 시스템 health probe | `Health.php`·`SystemMetrics.php` | 재사용(승격) |
| Incident/Alert | alert_policy·action_request | `Alerting.php` | 재사용(승격)·단 P0~P4/RCA/Postmortem 신설 |
| Reliability Score | (부재)·ModelMonitor drift | `ModelMonitor` | KEEP_SEPARATE(ML drift ≠ Reliability Score) |
| Customer Impact | CustomerAI churn/LTV | `CustomerAI.php` | KEEP_SEPARATE(비즈니스 이탈 ≠ 운영 Customer Impact) |
| Change/Release | 마케팅 A/B·AutoCampaign·배포 | `AbTesting`·`AutoCampaign`·`deploy.yml` | KEEP_SEPARATE(마케팅) / 재사용(deploy 승격) |
| Risk | PM risk·비즈니스 risk | `PM/Enterprise.php`·`Risk.php` | KEEP_SEPARATE(≠ Operational Risk) |
| Evidence/Snapshot | 메뉴/저니 snapshot | `AdminMenu`·journey_decision_log | KEEP_SEPARATE(★tamper-evident 아님·정본 `SecurityAudit::verify`) |
| Release Governance(죽은) | terraform blue-green/canary | `infra/aws/terraform/*` | KEEP_SEPARATE(★default off·PRESENT 오판 금지·Part3-25 정합) |

## 확장 대상(중복 신설 금지·기존 승격)
- Availability/Health = `Health`/`SystemMetrics` 승격. Incident = `Alerting` 승격.
- Release/Change = deploy 파이프라인 승격(중복 배포 러너 금지). Capacity = fpm 튜닝 형식화(285차 502 오진 교훈).
- Evidence = `SecurityAudit::verify` 재사용. Isolation = `Db.php`. Runtime Guard = `deploy.yml`·`index.php` RBAC 위 배치.

## 판정
**중복 위험 중간(운영/모니터링 동명 자산 다수).** 형식 EAPEF 엔티티는 grep 0으로 겹치지 않으나, KPI/Dashboard·Health·Incident·Reliability·Customer Impact·Change/Release·Risk·Snapshot·죽은 terraform 9종은 **오흡수 금지 또는 승격 구분**(특히 죽은 terraform blue-green을 Release Excellence PRESENT로 오판 금지). 실행 시 Health/Alerting/deploy/fpm/SecurityAudit/Db를 확장하고 새 모니터링/스코어/해시체인 엔진을 신설하지 않는다.
