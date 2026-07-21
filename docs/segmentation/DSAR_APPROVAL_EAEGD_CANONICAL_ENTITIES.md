# DSAR — EAEGD Canonical Entities Design & Judgment (Part 3-34 §2~§22)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★제품 대시보드 오흡수 금지.

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_EXECUTIVE_DASHBOARD | 제품 대시보드(오흡수 금지)·admin metrics | `SystemMetrics.php` | ABSENT-formal(거버넌스 Control Tower 신설) |
| 2 | APPROVAL_EXECUTIVE_WIDGET | 프론트 위젯(제품) | 116 프론트 | KEEP_SEPARATE(제품) |
| 3 | APPROVAL_EXECUTIVE_KPI | 제품 KPI(오흡수 금지) | `AdminGrowth.php` | ABSENT-formal(거버넌스 KPI 신설) |
| 4 | APPROVAL_EXECUTIVE_SCORECARD | 부재(Part3-28 Maturity 연계) | — | ABSENT |
| 5 | APPROVAL_EXECUTIVE_RISK | 비즈니스 Risk(KEEP_SEPARATE) | `Risk.php` | ABSENT-formal(Enterprise Risk 신설) |
| 6 | APPROVAL_EXECUTIVE_ALERT | alert·email/sms/push | `Alerting.php` | PARTIAL(재사용) |
| 7 | APPROVAL_EXECUTIVE_FORECAST | Mmm/수요예측(마케팅=KEEP_SEPARATE) | `Mmm.php`·`DemandForecast.php` | ABSENT-formal(거버넌스 Forecast 신설) |
| 8 | APPROVAL_EXECUTIVE_DECISION | pending_approval·maker-checker | `Catalog.php`·`Alerting.php` | PARTIAL |
| 9 | APPROVAL_EXECUTIVE_REGION | 부재(단일 호스트) | — | ABSENT |
| 10 | APPROVAL_EXECUTIVE_TENANT | admin 테넌트 관리 | `UserAdmin.php` | PARTIAL(헬스/SLA/Risk 신설) |
| 11 | APPROVAL_EXECUTIVE_SNAPSHOT | 부재 | — | ABSENT |
| 12 | APPROVAL_EXECUTIVE_EVIDENCE | append-only 정본 | `SecurityAudit.php` | PARTIAL(체인 재사용) |
| 13 | APPROVAL_EXECUTIVE_DIGEST | 부재 | — | ABSENT |
| 14 | APPROVAL_EXECUTIVE_ANALYTICS | 제품 analytics(KEEP_SEPARATE) | `CustomerAI.php` | ABSENT-formal(Governance Analytics 신설) |
| 15 | APPROVAL_EXECUTIVE_BASELINE | env/config baseline | `Db.php` | PARTIAL |
| 16 | APPROVAL_EXECUTIVE_TARGET | 부재 | — | ABSENT |
| 17 | APPROVAL_EXECUTIVE_THRESHOLD | alert_policy threshold | `Alerting.php` | PARTIAL(알림 임계 재사용) |
| 18 | APPROVAL_EXECUTIVE_REPORT | 제품 리포트(마케팅)·Reports | `Reports.php` | KEEP_SEPARATE / ABSENT-formal(Board Report 신설) |
| 19 | APPROVAL_EXECUTIVE_VERSION | 부재 | — | ABSENT |
| 20 | APPROVAL_EXECUTIVE_STATUS | NOT_CERTIFIED 라벨(문서) | `DSAR_APPROVAL_*` | ABSENT-formal |

## 도메인 설계 계약(§3~§22 요지)
- **§3 Executive Control Tower**: 순신설 admin 전용 통합 화면. ★제품 대시보드와 물리 분리(별도 관리자 뷰).
- **§7 Security·§8 Authorization·§9 Identity Dashboard**: ★authz 거버넌스 KPI 신설(Zero Trust Score/PDP Latency/SoD Violations/MFA Adoption 집계). 실 substrate=RBAC/writeGuard/MFA/세션해시는 있으나 **KPI 집계·시각화 부재**.
- **§10 Operational**: `SystemMetrics`/`Health`(availability) 승격·MTTR/MTBF/Error Budget는 Part3-30 EAPEF 신설 종속.
- **§11 Financial**: ★제품 P&L(`Pnl`)이 아닌 **플랫폼 비용**(cloud/license/operational cost) 신설(오흡수 금지).
- **§13~14 Digital Twin/Global Region**: 대상 시스템 부재라 설계까지만.

## 판정
**PARTIAL(§6·§8·§10·§12·§15·§17=SystemMetrics/Health/Compliance/Alerting/SecurityAudit/pending_approval 재사용) / ABSENT-formal(authz 거버넌스 KPI·Control Tower·Enterprise Health Index·Governance Forecast·Risk/Region/Digital Twin Dashboard).** ★제품 대시보드 오흡수 금지. 코드 0. BLOCKED_PREREQUISITE. 실행 시 운영/컴플/알림/증거 재사용 + 거버넌스 KPI 신설(제품 복제 금지).
