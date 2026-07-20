# DSAR — EAPEF Canonical Entities Design & Judgment (Part 3-30 §2~§22)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조).

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_PRODUCTION_EXCELLENCE | 부재 | — | ABSENT |
| 2 | APPROVAL_OPERATIONAL_KPI | health/metrics(비즈니스 KPI=KEEP_SEPARATE) | `SystemMetrics.php` | PARTIAL(운영 KPI 형식화) |
| 3 | APPROVAL_SERVICE_LEVEL | 부재(service catalog 없음) | — | ABSENT |
| 4 | APPROVAL_SLI | health probe(ok/degraded/down) | `Health.php` | PARTIAL(형식 SLI 정의 신설) |
| 5 | APPROVAL_SLO | 부재 | — | ABSENT |
| 6 | APPROVAL_SLA | 부재 | — | ABSENT |
| 7 | APPROVAL_RELIABILITY_SCORE | 부재(ModelMonitor=KEEP_SEPARATE) | — | ABSENT |
| 8 | APPROVAL_CAPACITY_PLAN | fpm pool 튜닝·502 방어(비형식) | `[[reference_phpfpm_pool_tuning_502]]` | PARTIAL(Forecast 신설) |
| 9 | APPROVAL_PERFORMANCE_PROFILE | CONNECTTIMEOUT·metrics | `ChannelSync.php`·`SystemMetrics.php` | PARTIAL |
| 10 | APPROVAL_INCIDENT_REVIEW | alert_policy·action_request | `Alerting.php` | PARTIAL(RCA/Postmortem 신설) |
| 11 | APPROVAL_CHANGE_RECORD | deploy 파이프라인 | `deploy.yml` | PARTIAL(형식 Change 신설) |
| 12 | APPROVAL_OPERATIONAL_RISK | 부재(PM risk=KEEP_SEPARATE) | — | ABSENT-formal |
| 13 | APPROVAL_PRODUCTION_HEALTH | health probe | `Health.php` | PARTIAL(Health Index Bronze~Elite 신설) |
| 14 | APPROVAL_PRODUCTION_SNAPSHOT | 부재 | — | ABSENT |
| 15 | APPROVAL_PRODUCTION_EVIDENCE | append-only 정본 | `SecurityAudit.php` | PARTIAL(체인 재사용) |
| 16 | APPROVAL_PRODUCTION_DIGEST | 부재 | — | ABSENT |
| 17 | APPROVAL_PRODUCTION_ANALYTICS | 부재(MTTR/MTBF 미집계) | — | ABSENT |
| 18 | APPROVAL_IMPROVEMENT_ACTION | 비형식(NEXT_SESSION) | `NEXT_SESSION.md` | PARTIAL-informal |
| 19 | APPROVAL_OPERATIONAL_BASELINE | env/config baseline | `Db.php`·`AdminPlans.php` | PARTIAL |
| 20 | APPROVAL_PRODUCTION_VERSION | deployMarker·migration 락 | `Db.php` | PARTIAL |

## 도메인 설계 계약(§3~§22 요지)
- **§4 SRE(Error Budget/Toil)**: 순신설. 현 운영은 반응형(Alerting)·비형식 개선(NEXT_SESSION)·SLO 부재라 Error Budget 계산 기준 없음.
- **§7 Availability(99.999%)·§8 Capacity**: health probe·fpm 튜닝 실재. ★285차 교훈=Capacity Manager는 max_children 상향 전 upstream timeout 대상 엔드포인트 진단(오진 방지).
- **§11 Incident Excellence(P0~P4)**: `Alerting` maker-checker·action_request 실재·형식 분류/RCA/Postmortem 신설.
- **§14 Release Excellence**: deploy 파이프라인 실재·Canary/Blue-Green/Feature Flag 부재(★죽은 terraform=PRESENT 오판 금지).
- **§18 Production Health Index(Bronze~Elite)**: health probe 6구성(Availability/Performance/Security/Compliance/Reliability/Customer Impact) 통합 스코어 신설.

## 판정
**PARTIAL(§2·§4·§8~11·§13·§15·§18~20=Health/Alerting/fpm/deploy/SecurityAudit/env substrate) / ABSENT-formal(SLO/SLA·Reliability Score·Operational Intelligence·Analytics·Health Index 등급).** 코드 0. BLOCKED_PREREQUISITE. 실행 시 기존 운영자산 확장(엔진/해시체인 신설 금지·285차 오진 교훈 반영).
