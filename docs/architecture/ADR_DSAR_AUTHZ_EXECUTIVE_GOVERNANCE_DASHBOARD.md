# ADR — Enterprise Authorization Executive Governance Dashboard (Part 3-34)

> **거버넌스 상태**: 설계 결정 기록(ADR) · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_34_EXECUTIVE_GOVERNANCE_DASHBOARD_SPEC.md`.
> Ground-Truth: `DSAR_APPROVAL_EAEGD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_EAEGD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②).

## 컨텍스트
Part 3-34는 플랫폼 전체를 Executive Control Tower로 통합한다. ★특이점: GeniegoROI 자체가 다중테넌트 ROI 대시보드 제품이라 **비즈니스 대시보드 substrate가 강함**. 본 ADR의 핵심은 "제품 대시보드 ≠ authz 거버넌스 대시보드" 경계. **코드 0**.

## 결정 (Decision)
- **D-1 (★제품 대시보드 오흡수 절대 금지)**: 테넌트 대상 ROI/P&L/마케팅 대시보드(`Pnl`·`AdminGrowth`·`Mmm`·프론트 116페이지)는 **제품**이다. Executive Governance Dashboard는 **플랫폼 authz 거버넌스 KPI**(Zero Trust Score·PDP Latency·SoD Violations·Governance Score)를 위한 **별도** 관리자 전용 Control Tower다. 제품 대시보드를 거버넌스 대시보드로 재라벨/흡수 금지.
- **D-2 (형식 Governance Dashboard 순신설)**: Authorization/Security/Identity/Compliance 거버넌스 KPI·Enterprise Health Index·통합 Control Tower·Forecast(거버넌스)는 신설(grep 0).
- **D-3 (PARTIAL substrate 재사용)**: Operational Dashboard=`SystemMetrics`/`Health` 승격·Financial 참조는 제품 `Pnl`이 아닌 플랫폼 비용(신설)·Notification=`Alerting`(email/sms/push 실배선) 재사용·Compliance=`Compliance.php` 승격·Evidence=`SecurityAudit::verify`·Isolation=`Db.php`.
- **D-4 (Executive=admin 게이트)**: Executive Dashboard/Report=최고관리자 전용(`requirePlan('admin')`·`requireMasterAdmin2`). Cross-Tenant Executive View 차단=`Db.php` 격리(플랫폼 admin은 정당 크로스테넌트·[[reference_platform_growth_actas_tenant_hijack]] 교훈 반영).
- **D-5 (Digital Twin/Multi-Region 설계까지만)**: 대상 시스템(Digital Twin·Multi-Region) 자체 부재라 해당 대시보드는 설계 트랙(실 데이터 없음).

## KEEP_SEPARATE (오흡수 최대 위험)
- 테넌트 ROI/P&L/마케팅 대시보드(제품) ≠ 플랫폼 Executive Governance Dashboard.
- `Mmm`/`DemandForecast`(마케팅 예측) ≠ Executive Forecast(거버넌스). `CustomerAI`(비즈니스) ≠ Governance Analytics. `Pnl` ROI ≠ Governance Financial(플랫폼 비용).

## 결과 (Consequences)
- 판정 = PARTIAL(SystemMetrics/Health·Compliance·Alerting notification·SecurityAudit substrate) / ABSENT-formal(authz 거버넌스 KPI·Enterprise Health Index·Control Tower·Governance Forecast 순신설·제품 대시보드와 분리).
- 실행 순서: 선행 Part 인증 → Executive Dashboard Registry(admin 전용) 신설 → SystemMetrics/Alerting/Compliance 승격 + authz 거버넌스 KPI 신설 → Analytics/Forecast. 코드 0.
