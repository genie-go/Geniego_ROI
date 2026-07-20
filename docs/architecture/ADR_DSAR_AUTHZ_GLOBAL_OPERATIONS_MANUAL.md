# ADR — Enterprise Authorization Global Operations Manual (Part 3-31)

> **거버넌스 상태**: 설계 결정 기록(ADR) · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_31_GLOBAL_OPERATIONS_MANUAL_SPEC.md`.
> Ground-Truth: `DSAR_APPROVAL_EAGOM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_EAGOM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②).

## 컨텍스트
Part 3-31은 글로벌 24x365 운영 조직·절차·표준을 규정한다. **3-25(Operational Readiness)·3-30(Production Excellence)와 상당 부분 겹친다** — 본 ADR의 핵심 결정은 "중복 재정의 금지·상위 Part 참조". **코드 0**.

## 결정 (Decision)
- **D-1 (운영절차 계층=3-30 엔진 참조·엔진 재정의 금지)**: Incident/Problem/Change/Release/Capacity/Backup/DR/Compliance Operations는 Part 3-30(EAPEF) 엔진의 **SOP/Runbook/절차 계층**이다. 신규 엔진을 만들지 않고 3-30을 운영 관점으로 확장한다.
- **D-2 (형식 Global Operations 순신설)**: NOC/SOC Framework·Follow-the-Sun Tier·CMDB·Multi-Region Failover·Business Continuity는 신설(grep 0·조직/인프라 종속).
- **D-3 (PARTIAL substrate 재사용·3-25/3-30 공유)**: Health/SystemMetrics·Alerting·deploy·cron 러너(`backend/bin/*_cron.php`·`install_crontab.sh`)·Compliance·SecurityAudit·schema migration·비형식 runbook. Automation Ops=cron 러너 형식화.
- **D-4 (실 배포 현실 명시)**: 단일 호스트(운영/데모·[[reference_ops_host]])·pscp 수동 배포·fpm 2 pool. Multi-Region/NOC/SOC는 설계까지만(실행=인프라 신설 종속).
- **D-5 (Immutable/Isolation)**: Operations/Incident/Change 이력=`SecurityAudit::verify` append-only·`Db.php` 격리 재사용. Runtime Guard=`deploy.yml`·`index.php` RBAC 위 배치.

## KEEP_SEPARATE (오흡수 금지)
- 본 Part Ops 절차 ≠ 3-30 엔진(엔진 재정의 금지·상위 참조). WMS CCTV·물류 운영(`WmsCctv`·`Logistics`) ≠ 플랫폼 Operations.
- 마케팅 automation(AutoCampaign/cron) ≠ Automation Operations 엔진. 279차 제거된 db_restore ≠ Backup 엔드포인트(재부활 금지).
- ModelMonitor ≠ Service Stability · 비즈니스 KPI ≠ Operations Analytics.

## 결과 (Consequences)
- 판정 = PARTIAL(Health/Alerting/deploy/cron/Compliance/SecurityAudit·3-25/3-30 공유 substrate) / ABSENT-formal(NOC/SOC·CMDB·Multi-Region·BCP·Global Operations Certification 순신설).
- 실행 순서: 선행 Part(특히 3-30) 인증 → Global Operations Registry+Governance 신설 → 3-30 엔진 운영절차 계층 배선 → NOC/SOC·Automation Ops(cron 승격) → Dashboard/Analytics. 코드 0.
