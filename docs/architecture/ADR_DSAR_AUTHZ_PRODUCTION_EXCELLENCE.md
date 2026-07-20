# ADR — Enterprise Authorization Production Excellence Framework (Part 3-30)

> **거버넌스 상태**: 설계 결정 기록(ADR) · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_30_PRODUCTION_EXCELLENCE_FRAMEWORK_SPEC.md`.
> Ground-Truth: `DSAR_APPROVAL_EAPEF_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_EAPEF_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②).

## 컨텍스트
Part 3-30은 Production 운영 우수성(SRE·Reliability·Continuous Improvement)을 규정한다. 본 ADR은 설계 결정과 현행 운영 substrate 대비 판정을 기록한다. **코드 0**.

## 결정 (Decision)
- **D-1 (형식 SRE/Production Excellence 순신설)**: Error Budget·SLI/SLO/SLA·Reliability Score·Capacity Forecast·Incident Excellence(P0~P4)·Production Health Index(Bronze~Elite)는 신설(grep 0).
- **D-2 (PARTIAL substrate 재사용·엔진 난립 금지)**:
  - Availability/Health → Health/SystemMetrics probe(`Health.php`·`SystemMetrics.php`·ok/degraded/down) 승격.
  - Incident/Alert → `Alerting.php`(alert_policy·action_request·maker-checker) 승격.
  - Capacity/Reliability 실지식 → php-fpm pool 튜닝·502 방어(CONNECTTIMEOUT `ChannelSync`·[[reference_phpfpm_pool_tuning_502]]) 형식화.
  - Release/Change → deploy 파이프라인(`deploy.ps1`·`deploy.sh`·`deploy.yml`) 승격.
  - Operational Knowledge → `NEXT_SESSION.md`·`docs/` 비형식 runbook 형식화.
  - Evidence Integrity → `SecurityAudit::verify` 재사용. Isolation → `Db.php`.
- **D-3 (Incident History Immutable)**: 인시던트/신뢰성 스코어 이력=append-only+무결성. SecurityAudit 확장.
- **D-4 (Runtime Guard 배치)**: Unsafe/SLO-violation Deployment·Error Budget Exhaustion 차단은 기존 배포 파이프라인(`deploy.yml`)·`index.php` RBAC 위에 배치(신규 게이트 신설 금지).
- **D-5 (무후퇴)**: 기존 health probe/Alerting/deploy/fpm 튜닝은 EAPEF 신설 시 흡수·보존. 285차 502 오진 교훈([[reference_phpfpm_pool_tuning_502]]) 반영—Capacity Manager는 max_children 상향 전 upstream timeout 대상 엔드포인트부터 진단.

## KEEP_SEPARATE (오흡수 금지)
- 비즈니스 KPI(ROI/P&L 대시보드) ≠ Operational KPI/Production Health Index(목적 상이).
- ModelMonitor drift ≠ Reliability Score · CustomerAI churn ≠ Customer Impact Score · 마케팅 A/B·AutoCampaign ≠ Change/Release Excellence · PM risk ≠ Operational Risk.

## 결과 (Consequences)
- 판정 = PARTIAL(Health/metrics·Alerting·fpm튜닝·deploy·runbook·SecurityAudit substrate 실재) / ABSENT-formal(SLO/Error Budget/Reliability Score·Capacity Forecast·Health Index·Executive Ops Dashboard 순신설).
- 실행 순서: 선행 Part 인증 → Production Excellence Registry 신설 → Health/Alerting/deploy/fpm 승격 배선 → SLO/Reliability/Capacity → Analytics/Health Index. 코드 0.
